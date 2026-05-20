/**
 * @module @sybioth/utils
 * Shared utilities for the Sybioth stack.
 * Source: black-bridges/core/utils
 */
/** Generate a UUID v4 */
export declare function generateId(): string;
/** Generate a short ID (8 chars) */
export declare function shortId(): string;
/** Generate a trace ID for distributed tracing */
export declare function traceId(): string;
/** SHA-256 hash of content */
export declare function contentHash(content: string): string;
/** Short hash (first 12 chars of SHA-256) */
export declare function shortHash(content: string): string;
/** Cosine similarity between two vectors */
export declare function cosineSimilarity(a: number[], b: number[]): number;
/** Euclidean distance between two vectors */
export declare function euclideanDistance(a: number[], b: number[]): number;
/** Sleep for ms milliseconds */
export declare function sleep(ms: number): Promise<void>;
/** Retry with exponential backoff */
export declare function retry<T>(fn: () => Promise<T>, options?: {
    maxRetries?: number;
    baseDelay?: number;
    maxDelay?: number;
}): Promise<T>;
/** Timeout wrapper */
export declare function withTimeout<T>(promise: Promise<T>, ms: number, label?: string): Promise<T>;
/** Debounce: wait for pause in calls */
export declare function debounce<T extends (...args: unknown[]) => unknown>(fn: T, ms: number): T;
/** Throttle: limit calls to once per interval */
export declare function throttle<T extends (...args: unknown[]) => unknown>(fn: T, ms: number): T;
/** Deep clone via structuredClone */
export declare function deepClone<T>(obj: T): T;
/** Merge objects deeply */
export declare function deepMerge<T extends Record<string, unknown>>(target: T, source: Partial<T>): T;
/** Pick specific keys from an object */
export declare function pick<T extends Record<string, unknown>, K extends keyof T>(obj: T, keys: K[]): Pick<T, K>;
/** Omit specific keys from an object */
export declare function omit<T extends Record<string, unknown>, K extends keyof T>(obj: T, keys: K[]): Omit<T, K>;
//# sourceMappingURL=index.d.ts.map