/**
 * @module @sybioth/entropy
 * Shannon Entropy Engine for intelligent routing and RAG.
 * Source: sybioth/shannon-engine (complete, tested).
 *
 * H(X) = -Σ p(x) · log₂(p(x))
 */

// ============================================================================
// Types
// ============================================================================

export interface EntropyResult {
  entropy: number;
  normalizedEntropy: number;
  complexity: 'low' | 'medium' | 'high';
  recommendation: string;
}

export interface CrossEntropyResult {
  crossEntropy: number;
  klDivergence: number;
  similarity: number;
}

export interface RoutingDecision {
  model: string;
  entropy: number;
  complexity: 'low' | 'medium' | 'high';
  reason: string;
}

export interface RoutingConfig {
  brainModel: string;
  handsModel: string;
  analysisModel: string;
  lowThreshold: number;
  highThreshold: number;
}

export interface RoutingStats {
  total: number;
  byComplexity: Record<string, number>;
  avgEntropy: number;
}

// ============================================================================
// Shannon Entropy Engine
// ============================================================================

export class ShannonEntropyEngine {
  private cache: Map<string, EntropyResult> = new Map();
  private cacheTTL = 5 * 60 * 1000; // 5 minutes
  private cacheTimestamps: Map<string, number> = new Map();

  /**
   * Calculate Shannon entropy of text
   * H(X) = -Σ p(x) · log₂(p(x))
   */
  calculateEntropy(text: string): EntropyResult {
    const cached = this.cache.get(text);
    const cachedAt = this.cacheTimestamps.get(text) ?? 0;
    if (cached && Date.now() - cachedAt < this.cacheTTL) return cached;

    if (!text || text.length === 0) {
      return { entropy: 0, normalizedEntropy: 0, complexity: 'low', recommendation: 'Empty input' };
    }

    // Character frequency distribution
    const freq = new Map<string, number>();
    for (const char of text) {
      freq.set(char, (freq.get(char) || 0) + 1);
    }

    // H(X) = -Σ p(x) · log₂(p(x))
    const length = text.length;
    let entropy = 0;
    for (const count of freq.values()) {
      const p = count / length;
      entropy -= p * Math.log2(p);
    }

    // Normalize (max entropy for observed alphabet)
    const maxEntropy = Math.log2(Math.min(freq.size, 65536));
    const normalizedEntropy = maxEntropy > 0 ? entropy / maxEntropy : 0;

    const complexity = this.classifyComplexity(entropy);
    const recommendation = this.generateRecommendation(entropy, complexity);

    const result: EntropyResult = { entropy, normalizedEntropy, complexity, recommendation };

    this.cache.set(text, result);
    this.cacheTimestamps.set(text, Date.now());

    return result;
  }

  /**
   * Calculate cross-entropy H(P,Q) between query and document
   */
  calculateCrossEntropy(query: string, document: string): CrossEntropyResult {
    const queryFreq = this.getFrequencyDistribution(query);
    const docFreq = this.getFrequencyDistribution(document);

    // Merge all characters
    const allChars = new Set([...queryFreq.keys(), ...docFreq.keys()]);

    let crossEntropy = 0;
    let klDivergence = 0;

    for (const char of allChars) {
      const p = queryFreq.get(char) || 0;
      const q = docFreq.get(char) || 1e-10; // smoothing

      if (p > 0) {
        crossEntropy -= p * Math.log2(q);
        klDivergence += p * Math.log2(p / q);
      }
    }

    // Similarity: inverse of normalized cross-entropy
    const maxCrossEntropy = Math.log2(allChars.size || 1);
    const similarity = maxCrossEntropy > 0 ? Math.max(0, 1 - crossEntropy / maxCrossEntropy) : 0;

    return { crossEntropy, klDivergence, similarity };
  }

  /**
   * Calculate mutual information I(Q;D)
   */
  calculateMutualInformation(query: string, document: string): number {
    const queryEntropy = this.calculateEntropy(query).entropy;
    const docEntropy = this.calculateEntropy(document).entropy;
    const jointEntropy = this.calculateEntropy(query + document).entropy;
    return Math.max(0, queryEntropy + docEntropy - jointEntropy);
  }

  /**
   * Classify complexity based on entropy threshold
   */
  classifyComplexity(entropy: number): 'low' | 'medium' | 'high' {
    if (entropy < 2.0) return 'low';
    if (entropy < 4.0) return 'medium';
    return 'high';
  }

  /**
   * Rank documents by cross-entropy against a query
   */
  rankByCrossEntropy(query: string, documents: string[]): { index: number; score: number }[] {
    return documents
      .map((doc, index) => ({
        index,
        score: this.calculateCrossEntropy(query, doc).similarity,
      }))
      .sort((a, b) => b.score - a.score);
  }

  /**
   * Filter by mutual information threshold
   */
  filterByMutualInfo(query: string, documents: string[], threshold: number): { index: number; mi: number }[] {
    return documents
      .map((doc, index) => ({ index, mi: this.calculateMutualInformation(query, doc) }))
      .filter((item) => item.mi >= threshold)
      .sort((a, b) => b.mi - a.mi);
  }

  /**
   * Calculate information density (bits per character)
   */
  calculateInformationDensity(text: string): number {
    if (!text || text.length === 0) return 0;
    return this.calculateEntropy(text).entropy;
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
    this.cacheTimestamps.clear();
  }

  // --- Private helpers ---

  private getFrequencyDistribution(text: string): Map<string, number> {
    const freq = new Map<string, number>();
    for (const char of text) {
      freq.set(char, (freq.get(char) || 0) + 1);
    }
    const total = text.length;
    for (const [char, count] of freq) {
      freq.set(char, count / total);
    }
    return freq;
  }

  private generateRecommendation(entropy: number, complexity: string): string {
    if (complexity === 'low') return 'Simple, specific input — use fast model';
    if (complexity === 'medium') return 'Standard complexity — use balanced model';
    return 'High complexity, ambiguous input — use analysis model';
  }
}

// ============================================================================
// Entropy Router
// ============================================================================

export class EntropyRouter {
  private engine: ShannonEntropyEngine;
  private config: RoutingConfig;

  constructor(config?: Partial<RoutingConfig>) {
    this.engine = new ShannonEntropyEngine();
    this.config = {
      brainModel: config?.brainModel ?? 'claude-opus-4-6',
      handsModel: config?.handsModel ?? 'gpt-5.4',
      analysisModel: config?.analysisModel ?? 'kimi-2.5',
      lowThreshold: config?.lowThreshold ?? 2.0,
      highThreshold: config?.highThreshold ?? 4.0,
    };
  }

  /**
   * Route a task to the optimal model based on entropy
   */
  route(task: string): RoutingDecision {
    const result = this.engine.calculateEntropy(task);

    if (result.entropy < this.config.lowThreshold) {
      return {
        model: this.config.handsModel,
        entropy: result.entropy,
        complexity: 'low',
        reason: 'Simple, specific task — routed to fast model',
      };
    }

    if (result.entropy < this.config.highThreshold) {
      return {
        model: this.config.brainModel,
        entropy: result.entropy,
        complexity: 'medium',
        reason: 'Standard complexity — routed to brain model',
      };
    }

    return {
      model: this.config.analysisModel,
      entropy: result.entropy,
      complexity: 'high',
      reason: 'Complex, ambiguous task — routed to analysis model',
    };
  }

  /**
   * Batch route multiple tasks
   */
  batchRoute(tasks: string[]): RoutingDecision[] {
    return tasks.map((task) => this.route(task));
  }

  /**
   * Get routing statistics
   */
  getStatistics(tasks: string[]): RoutingStats {
    const decisions = this.batchRoute(tasks);
    const byComplexity: Record<string, number> = { low: 0, medium: 0, high: 0 };
    let totalEntropy = 0;

    for (const decision of decisions) {
      byComplexity[decision.complexity]++;
      totalEntropy += decision.entropy;
    }

    return {
      total: decisions.length,
      byComplexity,
      avgEntropy: decisions.length > 0 ? totalEntropy / decisions.length : 0,
    };
  }
}

// ============================================================================
// Shannon Utilities
// ============================================================================

export const ShannonUtils = {
  /** Normalize entropy to 0-1 range */
  normalizeEntropy(entropy: number, maxAlphabetSize: number): number {
    const maxEntropy = Math.log2(maxAlphabetSize);
    return maxEntropy > 0 ? entropy / maxEntropy : 0;
  },

  /** Calculate perplexity 2^H(X) */
  calculatePerplexity(entropy: number): number {
    return Math.pow(2, entropy);
  },

  /** Combine multiple entropy scores (weighted average) */
  combineEntropyScores(scores: { entropy: number; weight: number }[]): number {
    const totalWeight = scores.reduce((sum, s) => sum + s.weight, 0);
    if (totalWeight === 0) return 0;
    return scores.reduce((sum, s) => sum + s.entropy * s.weight, 0) / totalWeight;
  },
};
