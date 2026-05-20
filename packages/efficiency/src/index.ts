/**
 * @module @sybioth/efficiency
 * Token Optimization, Context Pruning, Latency SLA.
 * Source: nexus-7 EfficiencyMiddleware (ported from Python).
 */

// ============================================================================
// Token Budget
// ============================================================================

export interface TokenBudget {
  maxTokens: number;
  usedTokens: number;
  remaining: number;
}

export class TokenTracker {
  private budgets: Map<string, TokenBudget> = new Map();

  /** Set budget for an agent */
  setBudget(agentId: string, maxTokens: number): void {
    this.budgets.set(agentId, { maxTokens, usedTokens: 0, remaining: maxTokens });
  }

  /** Record token usage */
  recordUsage(agentId: string, tokens: number): boolean {
    const budget = this.budgets.get(agentId);
    if (!budget) return false;
    budget.usedTokens += tokens;
    budget.remaining = Math.max(0, budget.maxTokens - budget.usedTokens);
    return budget.remaining > 0;
  }

  /** Check if agent has budget remaining */
  hasBudget(agentId: string): boolean {
    return (this.budgets.get(agentId)?.remaining ?? 0) > 0;
  }

  /** Get budget status */
  getBudget(agentId: string): TokenBudget | undefined {
    return this.budgets.get(agentId);
  }
}

// ============================================================================
// Context Pruning (from nexus-7)
// ============================================================================

export interface Message {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tokens?: number;
}

export type PruningStrategy = 'truncate' | 'selective' | 'summarize';

export interface PruningConfig {
  maxTokens: number;
  strategy: PruningStrategy;
  preserveSystemMessages: boolean;
}

export function pruneContext(messages: Message[], config: PruningConfig): Message[] {
  const estimateTokens = (text: string) => Math.ceil(text.length / 4);

  if (config.strategy === 'truncate') {
    // Keep most recent messages that fit within budget
    let totalTokens = 0;
    const result: Message[] = [];
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i];
      const tokens = msg.tokens ?? estimateTokens(msg.content);
      if (totalTokens + tokens > config.maxTokens) break;
      totalTokens += tokens;
      result.unshift(msg);
    }
    return result;
  }

  if (config.strategy === 'selective') {
    // Keep system messages + recent, drop middle
    const systemMessages = config.preserveSystemMessages
      ? messages.filter((m) => m.role === 'system')
      : [];
    const nonSystem = messages.filter((m) => m.role !== 'system');

    let totalTokens = systemMessages.reduce((sum, m) => sum + (m.tokens ?? estimateTokens(m.content)), 0);
    const result: Message[] = [...systemMessages];

    // Add most recent non-system messages
    for (let i = nonSystem.length - 1; i >= 0; i--) {
      const msg = nonSystem[i];
      const tokens = msg.tokens ?? estimateTokens(msg.content);
      if (totalTokens + tokens > config.maxTokens) break;
      totalTokens += tokens;
      result.push(msg);
    }

    return result.sort((a, b) => messages.indexOf(a) - messages.indexOf(b));
  }

  // summarize: placeholder — in production, call LLM to summarize
  return messages;
}

// ============================================================================
// Latency SLA
// ============================================================================

export interface LatencySLA {
  maxLatency: number;  // ms
  windowSize: number;  // number of samples
}

export interface LatencyMeasurement {
  latency: number;
  timestamp: number;
}

export class LatencyMonitor {
  private measurements: Map<string, LatencyMeasurement[]> = new Map();
  private slas: Map<string, LatencySLA> = new Map();

  /** Set SLA for an agent */
  setSLA(agentId: string, sla: LatencySLA): void {
    this.slas.set(agentId, sla);
  }

  /** Record latency */
  record(agentId: string, latency: number): void {
    if (!this.measurements.has(agentId)) {
      this.measurements.set(agentId, []);
    }
    const measurements = this.measurements.get(agentId)!;
    measurements.push({ latency, timestamp: Date.now() });

    const sla = this.slas.get(agentId);
    if (sla && measurements.length > sla.windowSize) {
      measurements.splice(0, measurements.length - sla.windowSize);
    }
  }

  /** Check if agent is within SLA */
  isWithinSLA(agentId: string): boolean {
    const sla = this.slas.get(agentId);
    const measurements = this.measurements.get(agentId);
    if (!sla || !measurements || measurements.length === 0) return true;

    const avgLatency = measurements.reduce((sum, m) => sum + m.latency, 0) / measurements.length;
    return avgLatency <= sla.maxLatency;
  }

  /** Get average latency */
  getAvgLatency(agentId: string): number {
    const measurements = this.measurements.get(agentId);
    if (!measurements || measurements.length === 0) return 0;
    return measurements.reduce((sum, m) => sum + m.latency, 0) / measurements.length;
  }
}

/** Factory */
export function createTokenTracker(): TokenTracker { return new TokenTracker(); }
export function createLatencyMonitor(): LatencyMonitor { return new LatencyMonitor(); }
