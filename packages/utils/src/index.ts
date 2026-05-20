/**
 * @module @sybioth/utils
 * Shared utilities for the Sybioth stack.
 * Source: black-bridges/core/utils
 */

import { createHash, randomUUID } from 'node:crypto';

// ============================================================================
// ID Generation
// ============================================================================

/** Generate a UUID v4 */
export function generateId(): string {
  return randomUUID();
}

/** Generate a short ID (8 chars) */
export function shortId(): string {
  return randomUUID().replace(/-/g, '').slice(0, 8);
}

/** Generate a trace ID for distributed tracing */
export function traceId(): string {
  return randomUUID().replace(/-/g, '');
}

// ============================================================================
// Hashing
// ============================================================================

/** SHA-256 hash of content */
export function contentHash(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}

/** Short hash (first 12 chars of SHA-256) */
export function shortHash(content: string): string {
  return contentHash(content).slice(0, 12);
}

// ============================================================================
// Vector Math
// ============================================================================

/** Cosine similarity between two vectors */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

/** Euclidean distance between two vectors */
export function euclideanDistance(a: number[], b: number[]): number {
  if (a.length !== b.length) return Infinity;
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const diff = a[i] - b[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}

// ============================================================================
// Async Helpers
// ============================================================================

/** Sleep for ms milliseconds */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Retry with exponential backoff */
export async function retry<T>(
  fn: () => Promise<T>,
  options: { maxRetries?: number; baseDelay?: number; maxDelay?: number } = {},
): Promise<T> {
  const { maxRetries = 3, baseDelay = 1000, maxDelay = 30000 } = options;
  let lastError: Error | undefined;
  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (i < maxRetries) {
        const delay = Math.min(baseDelay * Math.pow(2, i), maxDelay);
        const jitter = delay * 0.25 * (Math.random() * 2 - 1);
        await sleep(Math.max(0, delay + jitter));
      }
    }
  }
  throw lastError;
}

/** Timeout wrapper */
export async function withTimeout<T>(promise: Promise<T>, ms: number, label = 'Operation'): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

// ============================================================================
// Function Helpers
// ============================================================================

/** Debounce: wait for pause in calls */
export function debounce<T extends (...args: unknown[]) => unknown>(fn: T, ms: number): T {
  let timer: ReturnType<typeof setTimeout>;
  return ((...args: unknown[]) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  }) as T;
}

/** Throttle: limit calls to once per interval */
export function throttle<T extends (...args: unknown[]) => unknown>(fn: T, ms: number): T {
  let lastCall = 0;
  return ((...args: unknown[]) => {
    const now = Date.now();
    if (now - lastCall >= ms) {
      lastCall = now;
      return fn(...args);
    }
  }) as T;
}

/** Deep clone via structuredClone */
export function deepClone<T>(obj: T): T {
  return structuredClone(obj);
}

// ============================================================================
// Object Helpers
// ============================================================================

/** Merge objects deeply */
export function deepMerge<T extends Record<string, unknown>>(target: T, source: Partial<T>): T {
  const result = { ...target };
  for (const key of Object.keys(source)) {
    const sourceVal = source[key as keyof T];
    const targetVal = result[key as keyof T];
    if (
      sourceVal && typeof sourceVal === 'object' && !Array.isArray(sourceVal) &&
      targetVal && typeof targetVal === 'object' && !Array.isArray(targetVal)
    ) {
      (result as Record<string, unknown>)[key] = deepMerge(
        targetVal as Record<string, unknown>,
        sourceVal as Record<string, unknown>,
      );
    } else if (sourceVal !== undefined) {
      (result as Record<string, unknown>)[key] = sourceVal;
    }
  }
  return result;
}

/** Pick specific keys from an object */
export function pick<T extends Record<string, unknown>, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> {
  const result = {} as Pick<T, K>;
  for (const key of keys) {
    if (key in obj) result[key] = obj[key];
  }
  return result;
}

/** Omit specific keys from an object */
export function omit<T extends Record<string, unknown>, K extends keyof T>(obj: T, keys: K[]): Omit<T, K> {
  const result = { ...obj };
  for (const key of keys) delete result[key];
  return result as Omit<T, K>;
}
