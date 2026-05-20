/**
 * @module @sybioth/monitoring
 * Performance Profiler and Bottleneck Detector.
 * Ported from AOS performance_profiler.lua + bottleneck_detector.lua.
 */

// ============================================================================
// Performance Profiler
// ============================================================================

export interface ProfileEntry {
  operation: string;
  duration: number;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

export interface ProfileStats {
  operation: string;
  count: number;
  avgDuration: number;
  minDuration: number;
  maxDuration: number;
  p95Duration: number;
  p99Duration: number;
}

export class PerformanceProfiler {
  private entries: ProfileEntry[] = [];
  private maxEntries: number;

  constructor(maxEntries = 1000) {
    this.maxEntries = maxEntries;
  }

  /** Record a profile entry */
  record(operation: string, duration: number, metadata?: Record<string, unknown>): void {
    this.entries.push({ operation, duration, timestamp: Date.now(), metadata });
    if (this.entries.length > this.maxEntries) {
      this.entries = this.entries.slice(-this.maxEntries);
    }
  }

  /** Start a timer, return stop function */
  start(operation: string): () => number {
    const start = Date.now();
    return () => {
      const duration = Date.now() - start;
      this.record(operation, duration);
      return duration;
    };
  }

  /** Get stats for an operation */
  getStats(operation: string): ProfileStats | null {
    const opEntries = this.entries.filter((e) => e.operation === operation);
    if (opEntries.length === 0) return null;

    const durations = opEntries.map((e) => e.duration).sort((a, b) => a - b);
    const sum = durations.reduce((a, b) => a + b, 0);

    return {
      operation,
      count: durations.length,
      avgDuration: sum / durations.length,
      minDuration: durations[0],
      maxDuration: durations[durations.length - 1],
      p95Duration: durations[Math.floor(durations.length * 0.95)],
      p99Duration: durations[Math.floor(durations.length * 0.99)],
    };
  }

  /** Get all stats */
  getAllStats(): ProfileStats[] {
    const operations = new Set(this.entries.map((e) => e.operation));
    return Array.from(operations)
      .map((op) => this.getStats(op)!)
      .filter(Boolean)
      .sort((a, b) => b.avgDuration - a.avgDuration);
  }

  /** Clear entries */
  clear(): void {
    this.entries = [];
  }
}

// ============================================================================
// Bottleneck Detector
// ============================================================================

export type BottleneckSeverity = 'warning' | 'critical';

export interface Bottleneck {
  operation: string;
  severity: BottleneckSeverity;
  avgDuration: number;
  threshold: number;
  message: string;
  detectedAt: number;
}

export interface BottleneckConfig {
  warningThreshold: number;  // ms
  criticalThreshold: number; // ms
}

const DEFAULT_BOTTLENECK_CONFIG: BottleneckConfig = {
  warningThreshold: 1000,
  criticalThreshold: 5000,
};

export class BottleneckDetector {
  private profiler: PerformanceProfiler;
  private config: BottleneckConfig;

  constructor(profiler: PerformanceProfiler, config: Partial<BottleneckConfig> = {}) {
    this.profiler = profiler;
    this.config = { ...DEFAULT_BOTTLENECK_CONFIG, ...config };
  }

  /** Detect bottlenecks from profiler data */
  detect(): Bottleneck[] {
    const stats = this.profiler.getAllStats();
    const bottlenecks: Bottleneck[] = [];

    for (const stat of stats) {
      if (stat.avgDuration >= this.config.criticalThreshold) {
        bottlenecks.push({
          operation: stat.operation,
          severity: 'critical',
          avgDuration: stat.avgDuration,
          threshold: this.config.criticalThreshold,
          message: `CRITICAL: ${stat.operation} avg ${stat.avgDuration.toFixed(0)}ms (threshold: ${this.config.criticalThreshold}ms)`,
          detectedAt: Date.now(),
        });
      } else if (stat.avgDuration >= this.config.warningThreshold) {
        bottlenecks.push({
          operation: stat.operation,
          severity: 'warning',
          avgDuration: stat.avgDuration,
          threshold: this.config.warningThreshold,
          message: `WARNING: ${stat.operation} avg ${stat.avgDuration.toFixed(0)}ms (threshold: ${this.config.warningThreshold}ms)`,
          detectedAt: Date.now(),
        });
      }
    }

    return bottlenecks.sort((a, b) => b.avgDuration - a.avgDuration);
  }

  /** Get health status */
  getHealth(): { status: 'healthy' | 'degraded' | 'unhealthy'; bottlenecks: number; message: string } {
    const bottlenecks = this.detect();
    const critical = bottlenecks.filter((b) => b.severity === 'critical').length;
    const warnings = bottlenecks.filter((b) => b.severity === 'warning').length;

    if (critical > 0) {
      return { status: 'unhealthy', bottlenecks: bottlenecks.length, message: `${critical} critical bottlenecks detected` };
    }
    if (warnings > 0) {
      return { status: 'degraded', bottlenecks: bottlenecks.length, message: `${warnings} performance warnings` };
    }
    return { status: 'healthy', bottlenecks: 0, message: 'All operations within thresholds' };
  }
}

/** Factory */
export function createProfiler(maxEntries?: number): PerformanceProfiler {
  return new PerformanceProfiler(maxEntries);
}

export function createBottleneckDetector(profiler: PerformanceProfiler, config?: Partial<BottleneckConfig>): BottleneckDetector {
  return new BottleneckDetector(profiler, config);
}
