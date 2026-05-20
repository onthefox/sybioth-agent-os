/**
 * @module @sybioth/memory
 * 3-tier hierarchical memory with consolidation.
 * Source: black-bridges/packages/memory
 *
 * Tiers: working (hot) → episodic (warm) → semantic (cold)
 * Auto-consolidation: working→episodic after 5 accesses, episodic→semantic after 20.
 */

import { generateId, cosineSimilarity } from '@sybioth/utils';
import type { MemoryEntry, MemoryTier, MemoryQuery, EmbeddingVector } from '@sybioth/types';

// ============================================================================
// Types
// ============================================================================

export interface MemoryConfig {
  namespace: string;
  maxEntries?: number;
  consolidation?: {
    auto: boolean;
    minAgeHours: number;
    maxEntries: number;
  };
}

export interface StoreOptions {
  tier?: MemoryTier;
  tags?: string[];
  ttl?: number; // seconds
  embedding?: EmbeddingVector;
}

export interface SearchOptions {
  tier?: MemoryTier;
  tags?: string[];
  limit?: number;
  minScore?: number;
  embedding?: EmbeddingVector;
}

export interface MemoryStats {
  total: number;
  byTier: Record<MemoryTier, number>;
  byNamespace: Record<string, number>;
}

// ============================================================================
// MemoryService
// ============================================================================

export class MemoryService {
  private entries: Map<string, MemoryEntry> = new Map();
  private config: MemoryConfig;

  constructor(config: Partial<MemoryConfig> = {}) {
    this.config = {
      namespace: config.namespace ?? 'sybioth',
      maxEntries: config.maxEntries ?? 10000,
      consolidation: config.consolidation ?? { auto: true, minAgeHours: 24, maxEntries: 10000 },
    };
  }

  /** Store a value in memory */
  store<T>(key: string, value: T, options: StoreOptions = {}): MemoryEntry<T> {
    const fullKey = `${this.config.namespace}:${key}`;
    const now = Date.now();

    const existing = this.entries.get(fullKey);
    const entry: MemoryEntry<T> = {
      key: fullKey,
      value,
      tier: options.tier ?? 'working',
      namespace: this.config.namespace,
      tags: options.tags ?? [],
      accessCount: existing ? existing.accessCount + 1 : 0,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      expiresAt: options.ttl ? now + options.ttl * 1000 : undefined,
      embedding: options.embedding,
    };

    this.entries.set(fullKey, entry as MemoryEntry);

    // Auto-consolidate if enabled
    if (this.config.consolidation?.auto) {
      this.checkConsolidation(entry);
    }

    return entry;
  }

  /** Retrieve a value from memory */
  retrieve<T>(key: string): MemoryEntry<T> | null {
    const fullKey = `${this.config.namespace}:${key}`;
    const entry = this.entries.get(fullKey);
    if (!entry) return null;

    // Check expiry
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.entries.delete(fullKey);
      return null;
    }

    entry.accessCount++;
    return entry as MemoryEntry<T>;
  }

  /** Search memory by query */
  search<T>(query: MemoryQuery): MemoryEntry<T>[] {
    let results = Array.from(this.entries.values()) as MemoryEntry<T>[];

    // Filter by namespace
    if (query.namespace) {
      results = results.filter((e) => e.namespace === query.namespace);
    }

    // Filter by tier
    if (query.tier) {
      results = results.filter((e) => e.tier === query.tier);
    }

    // Filter by tags
    if (query.tags && query.tags.length > 0) {
      results = results.filter((e) => query.tags!.some((tag) => e.tags.includes(tag)));
    }

    // Filter expired
    results = results.filter((e) => !e.expiresAt || Date.now() <= e.expiresAt);

    // Text search (simple substring match)
    if (query.text) {
      const lowerQuery = query.text.toLowerCase();
      results = results.filter((e) => {
        const str = typeof e.value === 'string' ? e.value : JSON.stringify(e.value);
        return str.toLowerCase().includes(lowerQuery);
      });
    }

    // Vector similarity search
    if (query.embedding) {
      results = results
        .filter((e) => e.embedding)
        .map((e) => ({
          ...e,
          _score: cosineSimilarity(query.embedding!, e.embedding!),
        }))
        .filter((e) => !query.minScore || e._score >= query.minScore)
        .sort((a, b) => b._score - a._score) as MemoryEntry<T>[];
    }

    // Limit
    const limit = query.limit ?? 20;
    return results.slice(0, limit);
  }

  /** Search by vector similarity */
  searchVector(embedding: EmbeddingVector, options: SearchOptions = {}): MemoryEntry[] {
    let results = Array.from(this.entries.values()).filter((e) => e.embedding);

    if (options.tier) results = results.filter((e) => e.tier === options.tier);
    if (options.tags) results = results.filter((e) => options.tags!.some((t) => e.tags.includes(t)));

    return results
      .map((e) => ({ entry: e, score: cosineSimilarity(embedding, e.embedding!) }))
      .filter((e) => !options.minScore || e.score >= options.minScore)
      .sort((a, b) => b.score - a.score)
      .slice(0, options.limit ?? 20)
      .map((e) => e.entry);
  }

  /** Delete a memory entry */
  delete(key: string): boolean {
    const fullKey = `${this.config.namespace}:${key}`;
    return this.entries.delete(fullKey);
  }

  /** Consolidate: promote entries between tiers */
  consolidate(): { promoted: number; compressed: number } {
    let promoted = 0;
    let compressed = 0;

    for (const entry of this.entries.values()) {
      // working → episodic after 5 accesses
      if (entry.tier === 'working' && entry.accessCount >= 5) {
        entry.tier = 'episodic';
        promoted++;
      }
      // episodic → semantic after 20 accesses
      if (entry.tier === 'episodic' && entry.accessCount >= 20) {
        entry.tier = 'semantic';
        promoted++;
      }
    }

    // Compress old entries if over limit
    if (this.entries.size > (this.config.consolidation?.maxEntries ?? 10000)) {
      const sorted = Array.from(this.entries.entries()).sort(
        (a, b) => a[1].updatedAt - b[1].updatedAt,
      );
      const toRemove = sorted.slice(0, sorted.length - (this.config.consolidation?.maxEntries ?? 10000));
      for (const [key] of toRemove) {
        this.entries.delete(key);
        compressed++;
      }
    }

    return { promoted, compressed };
  }

  /** Get statistics */
  stats(): MemoryStats {
    const byTier: Record<MemoryTier, number> = { working: 0, episodic: 0, semantic: 0 };
    const byNamespace: Record<string, number> = {};

    for (const entry of this.entries.values()) {
      byTier[entry.tier]++;
      byNamespace[entry.namespace] = (byNamespace[entry.namespace] || 0) + 1;
    }

    return { total: this.entries.size, byTier, byNamespace };
  }

  /** Clear all memory */
  clear(): void {
    this.entries.clear();
  }

  // --- Private ---

  private checkConsolidation(entry: MemoryEntry): void {
    if (entry.tier === 'working' && entry.accessCount >= 5) {
      entry.tier = 'episodic';
    }
    if (entry.tier === 'episodic' && entry.accessCount >= 20) {
      entry.tier = 'semantic';
    }
  }
}

/** Factory */
export function createMemoryService(config?: Partial<MemoryConfig>): MemoryService {
  return new MemoryService(config);
}
