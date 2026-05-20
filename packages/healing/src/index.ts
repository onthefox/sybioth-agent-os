/**
 * @module @sybioth/healing
 * Self-healing system with error classification and recovery strategies.
 * Ported from AOS self_healing.lua + error_classifier.lua to TypeScript.
 */

import { ErrorCode, SybiothError, classifyError, isRetryableCode, getRetryDelay } from '@sybioth/errors';

// ============================================================================
// Recovery Strategies (from AOS self_healing.lua RECOVERY_STRATEGIES)
// ============================================================================

export type RecoveryAction =
  | 'increase_timeout'
  | 'switch_key'
  | 'refresh_auth'
  | 'retry_with_backoff'
  | 'retry_with_fallback'
  | 'restart'
  | 'throttle'
  | 'shutdown'
  | 'none';

export interface RecoveryStrategy {
  action: RecoveryAction;
  retry?: boolean;
  wait?: number;        // seconds to wait before retry
  maxRetries?: number;
  log: boolean;
}

const RECOVERY_STRATEGIES: Record<string, RecoveryStrategy> = {
  [ErrorCode.TIMEOUT]: { action: 'increase_timeout', retry: true, log: true },
  [ErrorCode.RATE_LIMIT]: { action: 'switch_key', wait: 60, retry: true, log: true },
  [ErrorCode.AUTH_ERROR]: { action: 'refresh_auth', retry: true, log: true },
  [ErrorCode.PARSE_ERROR]: { action: 'retry_with_fallback', log: true },
  [ErrorCode.NETWORK_ERROR]: { action: 'retry_with_backoff', maxRetries: 3, log: true },
  [ErrorCode.TRANSIENT_ERROR]: { action: 'retry_with_backoff', maxRetries: 3, log: true },
  [ErrorCode.SERVICE_UNAVAILABLE]: { action: 'retry_with_backoff', maxRetries: 5, wait: 30, log: true },
  [ErrorCode.CIRCUIT_BREAKER_OPEN]: { action: 'throttle', wait: 30, log: true },
  [ErrorCode.AGENT_CRASHED]: { action: 'restart', retry: true, log: true },
  [ErrorCode.AGENT_TIMEOUT]: { action: 'increase_timeout', retry: true, log: true },
  [ErrorCode.RESOURCE_EXHAUSTED]: { action: 'throttle', wait: 10, log: true },
};

// ============================================================================
// Error History Entry
// ============================================================================

export interface ErrorHistoryEntry {
  timestamp: number;
  errorCode: ErrorCode;
  message: string;
  agentId?: string;
  recovered: boolean;
  action: RecoveryAction;
}

// ============================================================================
// Circuit Breaker (from swe-unified CircuitBreaker)
// ============================================================================

export type CircuitState = 'closed' | 'open' | 'half-open';

export interface CircuitBreakerConfig {
  failureThreshold: number;
  resetTimeout: number;
  halfOpenMaxAttempts: number;
}

export class CircuitBreaker {
  private state: CircuitState = 'closed';
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime = 0;
  private config: CircuitBreakerConfig;

  constructor(config: Partial<CircuitBreakerConfig> = {}) {
    this.config = {
      failureThreshold: config.failureThreshold ?? 5,
      resetTimeout: config.resetTimeout ?? 30000,
      halfOpenMaxAttempts: config.halfOpenMaxAttempts ?? 3,
    };
  }

  /** Check if the circuit allows a request */
  canExecute(): boolean {
    if (this.state === 'closed') return true;

    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime >= this.config.resetTimeout) {
        this.state = 'half-open';
        this.successCount = 0;
        return true;
      }
      return false;
    }

    // half-open: allow limited attempts
    return this.successCount < this.config.halfOpenMaxAttempts;
  }

  /** Record a successful execution */
  recordSuccess(): void {
    if (this.state === 'half-open') {
      this.successCount++;
      if (this.successCount >= this.config.halfOpenMaxAttempts) {
        this.state = 'closed';
        this.failureCount = 0;
      }
    }
    if (this.state === 'closed') {
      this.failureCount = Math.max(0, this.failureCount - 1);
    }
  }

  /** Record a failed execution */
  recordFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.state === 'half-open') {
      this.state = 'open';
      return;
    }

    if (this.failureCount >= this.config.failureThreshold) {
      this.state = 'open';
    }
  }

  /** Reset the circuit breaker */
  reset(): void {
    this.state = 'closed';
    this.failureCount = 0;
    this.successCount = 0;
  }

  /** Get current state */
  getState(): CircuitState {
    // Auto-transition from open to half-open
    if (this.state === 'open' && Date.now() - this.lastFailureTime >= this.config.resetTimeout) {
      this.state = 'half-open';
      this.successCount = 0;
    }
    return this.state;
  }

  /** Get stats */
  stats(): { state: CircuitState; failures: number; successes: number } {
    return { state: this.getState(), failures: this.failureCount, successes: this.successCount };
  }
}

// ============================================================================
// SelfHealing
// ============================================================================

export interface HealingConfig {
  autoHeal: boolean;
  maxHistory: number;
  maxRetries: number;
}

export class SelfHealing {
  private errorHistory: ErrorHistoryEntry[] = [];
  private config: HealingConfig;
  private circuitBreakers: Map<string, CircuitBreaker> = new Map();

  constructor(config: Partial<HealingConfig> = {}) {
    this.config = {
      autoHeal: config.autoHeal ?? true,
      maxHistory: config.maxHistory ?? 100,
      maxRetries: config.maxRetries ?? 3,
    };
  }

  /** Get or create a circuit breaker for a key */
  getCircuitBreaker(key: string, config?: Partial<CircuitBreakerConfig>): CircuitBreaker {
    if (!this.circuitBreakers.has(key)) {
      this.circuitBreakers.set(key, new CircuitBreaker(config));
    }
    return this.circuitBreakers.get(key)!;
  }

  /** Detect error type and get recovery strategy */
  getRecoveryStrategy(error: Error | SybiothError): RecoveryStrategy {
    const sybiothError = error instanceof SybiothError ? error : classifyError(error);
    return RECOVERY_STRATEGIES[sybiothError.code] ?? { action: 'none', log: true };
  }

  /** Attempt to recover from an error */
  async recover(error: Error | SybiothError, agentId?: string): Promise<RecoveryResult> {
    const sybiothError = error instanceof SybiothError ? error : classifyError(error);
    const strategy = this.getRecoveryStrategy(error);

    const entry: ErrorHistoryEntry = {
      timestamp: Date.now(),
      errorCode: sybiothError.code,
      message: sybiothError.message,
      agentId,
      recovered: false,
      action: strategy.action,
    };

    // Add to history
    this.errorHistory.push(entry);
    if (this.errorHistory.length > this.config.maxHistory) {
      this.errorHistory = this.errorHistory.slice(-this.config.maxHistory);
    }

    if (!this.config.autoHeal) {
      return { recovered: false, action: strategy.action, wait: 0, error: sybiothError };
    }

    // Apply recovery strategy
    const wait = strategy.wait ?? 0;
    const recovered = strategy.retry ?? false;
    entry.recovered = recovered;

    return {
      recovered,
      action: strategy.action,
      wait,
      error: sybiothError,
    };
  }

  /** Get error history */
  getHistory(limit?: number): ErrorHistoryEntry[] {
    const entries = [...this.errorHistory].sort((a, b) => b.timestamp - a.timestamp);
    return limit ? entries.slice(0, limit) : entries;
  }

  /** Get error patterns (most frequent error codes) */
  getPatterns(): { code: ErrorCode; count: number; lastSeen: number }[] {
    const byCode = new Map<ErrorCode, { count: number; lastSeen: number }>();
    for (const entry of this.errorHistory) {
      const existing = byCode.get(entry.errorCode);
      if (existing) {
        existing.count++;
        existing.lastSeen = Math.max(existing.lastSeen, entry.timestamp);
      } else {
        byCode.set(entry.errorCode, { count: 1, lastSeen: entry.timestamp });
      }
    }
    return Array.from(byCode.entries())
      .map(([code, data]) => ({ code, ...data }))
      .sort((a, b) => b.count - a.count);
  }

  /** Get healing stats */
  stats(): { totalErrors: number; recovered: number; unrecovered: number; byAction: Record<string, number> } {
    const byAction: Record<string, number> = {};
    let recovered = 0;
    for (const entry of this.errorHistory) {
      if (entry.recovered) recovered++;
      byAction[entry.action] = (byAction[entry.action] || 0) + 1;
    }
    return {
      totalErrors: this.errorHistory.length,
      recovered,
      unrecovered: this.errorHistory.length - recovered,
      byAction,
    };
  }

  /** Clear history */
  clearHistory(): void {
    this.errorHistory = [];
  }
}

export interface RecoveryResult {
  recovered: boolean;
  action: RecoveryAction;
  wait: number;
  error: SybiothError;
}

/** Factory */
export function createSelfHealing(config?: Partial<HealingConfig>): SelfHealing {
  return new SelfHealing(config);
}
