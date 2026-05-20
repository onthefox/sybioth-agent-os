/**
 * @module @sybioth/errors
 * Foundation error types and Result monad for the entire Sybioth stack.
 * Sources: black-bridges Result type + AOS error_classifier.lua patterns
 */

// ============================================================================
// Result Monad
// ============================================================================

export type Result<T, E = SybiothError> =
  | { success: true; data: T }
  | { success: false; error: E };

export function ok<T>(data: T): Result<T, never> {
  return { success: true, data };
}

export function err<E extends SybiothError>(error: E): Result<never, E> {
  return { success: false, error };
}

export function isOk<T, E>(result: Result<T, E>): result is { success: true; data: T } {
  return result.success;
}

export function isErr<T, E>(result: Result<T, E>): result is { success: false; error: E } {
  return !result.success;
}

/** Unwrap Result or throw */
export function unwrap<T, E>(result: Result<T, E>): T {
  if (isOk(result)) return result.data;
  throw result.error;
}

/** Unwrap Result or return default */
export function unwrapOr<T, E>(result: Result<T, E>, defaultValue: T): T {
  return isOk(result) ? result.data : defaultValue;
}

/** Map over success value */
export function mapResult<T, U, E>(result: Result<T, E>, fn: (data: T) => U): Result<U, E> {
  return isOk(result) ? ok(fn(result.data)) : result;
}

/** FlatMap / chain */
export function flatMap<T, U, E>(result: Result<T, E>, fn: (data: T) => Result<U, E>): Result<U, E> {
  return isOk(result) ? fn(result.data) : result;
}

// ============================================================================
// Error Codes (from AOS error_classifier.lua + nexus-7 error types)
// ============================================================================

export enum ErrorCode {
  // Transient (retryable)
  TIMEOUT = 'timeout',
  RATE_LIMIT = 'rate_limit',
  NETWORK_ERROR = 'network_error',
  TRANSIENT_ERROR = 'transient',

  // Permanent (non-retryable)
  AUTH_ERROR = 'auth_error',
  PERMISSION_ERROR = 'permission_error',
  INVALID_REQUEST = 'invalid_request',
  CONFIGURATION_ERROR = 'configuration_error',
  NOT_FOUND = 'not_found',
  PARSE_ERROR = 'parse_error',

  // Agent-specific
  AGENT_EXECUTION_FAILED = 'agent_execution_failed',
  TOOL_EXECUTION_FAILED = 'tool_execution_failed',
  CIRCUIT_BREAKER_OPEN = 'circuit_breaker_open',
  AGENT_TIMEOUT = 'agent_timeout',
  AGENT_CRASHED = 'agent_crashed',

  // Security
  ALIGNMENT_VIOLATION = 'alignment_violation',
  SECURITY_VIOLATION = 'security_violation',
  CONSTRAINT_VIOLATION = 'constraint_violation',

  // System
  INITIALIZATION_FAILED = 'initialization_failed',
  SERVICE_UNAVAILABLE = 'service_unavailable',
  RESOURCE_EXHAUSTED = 'resource_exhausted',
  UNKNOWN = 'unknown',
}

// ============================================================================
// Error Severity
// ============================================================================

export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

// ============================================================================
// SybiothError
// ============================================================================

export interface SybiothErrorOptions {
  code: ErrorCode;
  message: string;
  retryable?: boolean;
  severity?: ErrorSeverity;
  context?: Record<string, unknown>;
  cause?: Error;
}

export class SybiothError extends Error {
  readonly code: ErrorCode;
  readonly retryable: boolean;
  readonly severity: ErrorSeverity;
  readonly context: Record<string, unknown>;
  readonly timestamp: number;

  constructor(options: SybiothErrorOptions) {
    super(options.message);
    this.name = 'SybiothError';
    this.code = options.code;
    this.retryable = options.retryable ?? isRetryableCode(options.code);
    this.severity = options.severity ?? severityForCode(options.code);
    this.context = options.context ?? {};
    this.timestamp = Date.now();
    if (options.cause) {
      this.cause = options.cause;
    }
  }

  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      retryable: this.retryable,
      severity: this.severity,
      context: this.context,
      timestamp: this.timestamp,
      stack: this.stack,
    };
  }
}

// ============================================================================
// Error Classification (from AOS error_classifier.lua)
// ============================================================================

/** Determine if an error code is retryable */
export function isRetryableCode(code: ErrorCode): boolean {
  switch (code) {
    case ErrorCode.TIMEOUT:
    case ErrorCode.RATE_LIMIT:
    case ErrorCode.NETWORK_ERROR:
    case ErrorCode.TRANSIENT_ERROR:
    case ErrorCode.AGENT_TIMEOUT:
    case ErrorCode.SERVICE_UNAVAILABLE:
      return true;
    default:
      return false;
  }
}

/** Get default severity for an error code */
export function severityForCode(code: ErrorCode): ErrorSeverity {
  switch (code) {
    case ErrorCode.ALIGNMENT_VIOLATION:
    case ErrorCode.SECURITY_VIOLATION:
    case ErrorCode.CONSTRAINT_VIOLATION:
      return 'critical';
    case ErrorCode.AUTH_ERROR:
    case ErrorCode.PERMISSION_ERROR:
    case ErrorCode.AGENT_CRASHED:
    case ErrorCode.CIRCUIT_BREAKER_OPEN:
      return 'high';
    case ErrorCode.TIMEOUT:
    case ErrorCode.RATE_LIMIT:
    case ErrorCode.NETWORK_ERROR:
    case ErrorCode.AGENT_EXECUTION_FAILED:
    case ErrorCode.TOOL_EXECUTION_FAILED:
      return 'medium';
    default:
      return 'low';
  }
}

/** Classify an unknown error into a SybiothError */
export function classifyError(error: unknown): SybiothError {
  if (error instanceof SybiothError) return error;

  if (error instanceof Error) {
    const msg = error.message.toLowerCase();

    if (msg.includes('timeout') || msg.includes('timed out')) {
      return new SybiothError({ code: ErrorCode.TIMEOUT, message: error.message, cause: error });
    }
    if (msg.includes('rate limit') || msg.includes('429')) {
      return new SybiothError({ code: ErrorCode.RATE_LIMIT, message: error.message, cause: error });
    }
    if (msg.includes('network') || msg.includes('econnrefused') || msg.includes('econnreset')) {
      return new SybiothError({ code: ErrorCode.NETWORK_ERROR, message: error.message, cause: error });
    }
    if (msg.includes('auth') || msg.includes('401') || msg.includes('403')) {
      return new SybiothError({ code: ErrorCode.AUTH_ERROR, message: error.message, cause: error });
    }
    if (msg.includes('parse') || msg.includes('json') || msg.includes('syntax')) {
      return new SybiothError({ code: ErrorCode.PARSE_ERROR, message: error.message, cause: error });
    }
    if (msg.includes('not found') || msg.includes('404')) {
      return new SybiothError({ code: ErrorCode.NOT_FOUND, message: error.message, cause: error });
    }

    return new SybiothError({
      code: ErrorCode.UNKNOWN,
      message: error.message,
      cause: error,
    });
  }

  return new SybiothError({
    code: ErrorCode.UNKNOWN,
    message: String(error),
    context: { raw: error },
  });
}

// ============================================================================
// Retry Helpers
// ============================================================================

export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 30000,
  backoffMultiplier: 2,
};

/** Calculate retry delay with exponential backoff + jitter */
export function getRetryDelay(attempt: number, config: Partial<RetryConfig> = {}): number {
  const { baseDelay, maxDelay, backoffMultiplier } = { ...DEFAULT_RETRY_CONFIG, ...config };
  const delay = Math.min(baseDelay * Math.pow(backoffMultiplier, attempt), maxDelay);
  // Add jitter (±25%)
  const jitter = delay * 0.25 * (Math.random() * 2 - 1);
  return Math.max(0, delay + jitter);
}

/** Execute a function with retry logic */
export async function withRetry<T>(
  fn: () => Promise<T>,
  config: Partial<RetryConfig> = {},
): Promise<T> {
  const fullConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  let lastError: SybiothError | undefined;

  for (let attempt = 0; attempt <= fullConfig.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = classifyError(error);
      if (!lastError.retryable || attempt === fullConfig.maxRetries) {
        throw lastError;
      }
      const delay = getRetryDelay(attempt, fullConfig);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}
