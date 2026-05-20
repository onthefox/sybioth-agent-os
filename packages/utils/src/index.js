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
export function generateId() {
    return randomUUID();
}
/** Generate a short ID (8 chars) */
export function shortId() {
    return randomUUID().replace(/-/g, '').slice(0, 8);
}
/** Generate a trace ID for distributed tracing */
export function traceId() {
    return randomUUID().replace(/-/g, '');
}
// ============================================================================
// Hashing
// ============================================================================
/** SHA-256 hash of content */
export function contentHash(content) {
    return createHash('sha256').update(content).digest('hex');
}
/** Short hash (first 12 chars of SHA-256) */
export function shortHash(content) {
    return contentHash(content).slice(0, 12);
}
// ============================================================================
// Vector Math
// ============================================================================
/** Cosine similarity between two vectors */
export function cosineSimilarity(a, b) {
    if (a.length !== b.length || a.length === 0)
        return 0;
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
export function euclideanDistance(a, b) {
    if (a.length !== b.length)
        return Infinity;
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
export function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
/** Retry with exponential backoff */
export async function retry(fn, options = {}) {
    const { maxRetries = 3, baseDelay = 1000, maxDelay = 30000 } = options;
    let lastError;
    for (let i = 0; i <= maxRetries; i++) {
        try {
            return await fn();
        }
        catch (error) {
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
export async function withTimeout(promise, ms, label = 'Operation') {
    let timer;
    const timeout = new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
    });
    try {
        return await Promise.race([promise, timeout]);
    }
    finally {
        if (timer)
            clearTimeout(timer);
    }
}
// ============================================================================
// Function Helpers
// ============================================================================
/** Debounce: wait for pause in calls */
export function debounce(fn, ms) {
    let timer;
    return ((...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), ms);
    });
}
/** Throttle: limit calls to once per interval */
export function throttle(fn, ms) {
    let lastCall = 0;
    return ((...args) => {
        const now = Date.now();
        if (now - lastCall >= ms) {
            lastCall = now;
            return fn(...args);
        }
    });
}
/** Deep clone via structuredClone */
export function deepClone(obj) {
    return structuredClone(obj);
}
// ============================================================================
// Object Helpers
// ============================================================================
/** Merge objects deeply */
export function deepMerge(target, source) {
    const result = { ...target };
    for (const key of Object.keys(source)) {
        const sourceVal = source[key];
        const targetVal = result[key];
        if (sourceVal && typeof sourceVal === 'object' && !Array.isArray(sourceVal) &&
            targetVal && typeof targetVal === 'object' && !Array.isArray(targetVal)) {
            result[key] = deepMerge(targetVal, sourceVal);
        }
        else if (sourceVal !== undefined) {
            result[key] = sourceVal;
        }
    }
    return result;
}
/** Pick specific keys from an object */
export function pick(obj, keys) {
    const result = {};
    for (const key of keys) {
        if (key in obj)
            result[key] = obj[key];
    }
    return result;
}
/** Omit specific keys from an object */
export function omit(obj, keys) {
    const result = { ...obj };
    for (const key of keys)
        delete result[key];
    return result;
}
//# sourceMappingURL=index.js.map