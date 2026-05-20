/**
 * @module @sybioth/hooks
 * Hook Manager — lifecycle hooks for the symbiotic layer.
 * Merges QOS HookManager + superpowers hooks + AOS hooks.
 *
 * Hooks are advisory: they can augment() data or abort() but never block the host.
 */

import { generateId } from '@sybioth/utils';
import type { HookPhase, HookDefinition, HookContext } from '@sybioth/types';

// ============================================================================
// Hook Execution Result
// ============================================================================

export interface HookExecutionResult {
  hookId: string;
  phase: HookPhase;
  duration: number;
  aborted: boolean;
  augmentations: unknown[];
  error?: Error;
}

export interface HookManagerConfig {
  maxConcurrent?: number;
  defaultTimeout?: number;
  enableLogging?: boolean;
}

// ============================================================================
// HookManager
// ============================================================================

export class HookManager {
  private hooks: Map<string, HookDefinition> = new Map();
  private hooksByPhase: Map<HookPhase, Set<string>> = new Map();
  private config: Required<HookManagerConfig>;

  constructor(config: HookManagerConfig = {}) {
    this.config = {
      maxConcurrent: config.maxConcurrent ?? 10,
      defaultTimeout: config.defaultTimeout ?? 5000,
      enableLogging: config.enableLogging ?? false,
    };
  }

  /** Register a hook */
  register(hook: Omit<HookDefinition, 'handler'> & { handler: HookDefinition['handler'] }): string {
    const id = generateId();
    const fullHook: HookDefinition = {
      ...hook,
      timeout: hook.timeout ?? this.config.defaultTimeout,
    };

    this.hooks.set(id, fullHook);

    if (!this.hooksByPhase.has(hook.phase)) {
      this.hooksByPhase.set(hook.phase, new Set());
    }
    this.hooksByPhase.get(hook.phase)!.add(id);

    return id;
  }

  /** Unregister a hook */
  unregister(hookId: string): boolean {
    const hook = this.hooks.get(hookId);
    if (!hook) return false;

    this.hooks.delete(hookId);
    this.hooksByPhase.get(hook.phase)?.delete(hookId);
    return true;
  }

  /** Execute all hooks for a phase */
  async execute(phase: HookPhase, payload: unknown): Promise<HookExecutionResult[]> {
    const hookIds = this.hooksByPhase.get(phase);
    if (!hookIds || hookIds.size === 0) return [];

    const results: HookExecutionResult[] = [];
    const augmentations: unknown[] = [];
    let aborted = false;

    // Sort by priority (lower = runs first)
    const sortedIds = Array.from(hookIds).sort((a, b) => {
      const ha = this.hooks.get(a)!;
      const hb = this.hooks.get(b)!;
      return (ha.priority ?? 0) - (hb.priority ?? 0);
    });

    for (const hookId of sortedIds) {
      const hook = this.hooks.get(hookId)!;

      const ctx: HookContext = {
        phase,
        timestamp: Date.now(),
        traceId: generateId(),
        payload,
        abort: () => { aborted = true; },
        augment: (data: unknown) => { augmentations.push(data); },
      };

      const start = Date.now();
      try {
        await Promise.race([
          hook.handler(ctx),
          new Promise<void>((_, reject) =>
            setTimeout(() => reject(new Error(`Hook ${hookId} timed out`)), hook.timeout)
          ),
        ]);

        results.push({
          hookId,
          phase,
          duration: Date.now() - start,
          aborted,
          augmentations: [...augmentations],
        });

        // Remove once-only hooks
        if (hook.once) {
          this.unregister(hookId);
        }

        if (aborted) break;
      } catch (error) {
        results.push({
          hookId,
          phase,
          duration: Date.now() - start,
          aborted,
          augmentations: [],
          error: error instanceof Error ? error : new Error(String(error)),
        });

        if (hook.once) this.unregister(hookId);
      }
    }

    return results;
  }

  /** List hooks for a phase */
  list(phase?: HookPhase): HookDefinition[] {
    if (phase) {
      const hookIds = this.hooksByPhase.get(phase);
      if (!hookIds) return [];
      return Array.from(hookIds).map((id) => this.hooks.get(id)!);
    }
    return Array.from(this.hooks.values());
  }

  /** Enable a hook */
  enable(hookId: string): void {
    const hook = this.hooks.get(hookId);
    if (hook) (hook as unknown as Record<string, unknown>).disabled = false;
  }

  /** Disable a hook */
  disable(hookId: string): void {
    const hook = this.hooks.get(hookId);
    if (hook) (hook as unknown as Record<string, unknown>).disabled = true;
  }

  /** Get hook count */
  size(): number {
    return this.hooks.size;
  }

  /** Clear all hooks */
  clear(): void {
    this.hooks.clear();
    this.hooksByPhase.clear();
  }
}

/** Factory */
export function createHookManager(config?: HookManagerConfig): HookManager {
  return new HookManager(config);
}
