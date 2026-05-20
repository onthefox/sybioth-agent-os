/**
 * @module @sybioth/runtime
 * SybiothRuntime — DI container + event loop that wires all services.
 * The "kernel" that adapters attach to.
 */

import { EventEmitter } from 'node:events';
import { loadConfig, type SybiothConfig } from '@sybioth/config';
import { createLogger } from '@sybioth/logger';
import { EventBus, createEventBus } from '@sybioth/event-bus';
import { MemoryService, createMemoryService } from '@sybioth/memory';
import { ShannonEntropyEngine, EntropyRouter } from '@sybioth/entropy';
import { HookManager, createHookManager } from '@sybioth/hooks';
import { SelfHealing, createSelfHealing } from '@sybioth/healing';
import { SkillsEngine, createSkillsEngine } from '@sybioth/skills';
import { AgentRegistry, AgentRunner, createAgentRegistry } from '@sybioth/agents';
import { SmartAutoSpawner, createSmartAutoSpawner } from '@sybioth/spawner';
import { PerformanceProfiler, BottleneckDetector, createProfiler, createBottleneckDetector } from '@sybioth/monitoring';
import { TokenTracker, LatencyMonitor, createTokenTracker, createLatencyMonitor } from '@sybioth/efficiency';
import { AlignmentGuard, createAlignmentGuard } from '@sybioth/alignment';
import { NexusLedger, createNexusLedger } from '@sybioth/ledger';
import type { SybiothEvent } from '@sybioth/types';

// ============================================================================
// Runtime State
// ============================================================================

export type RuntimeState = 'idle' | 'initializing' | 'running' | 'shutting-down' | 'error';

// ============================================================================
// SybiothRuntime
// ============================================================================

export class SybiothRuntime extends EventEmitter {
  readonly config: SybiothConfig;

  // Services
  readonly eventBus: EventBus;
  readonly memory: MemoryService;
  readonly entropy: ShannonEntropyEngine;
  readonly entropyRouter: EntropyRouter;
  readonly hooks: HookManager;
  readonly healing: SelfHealing;
  readonly skills: SkillsEngine;
  readonly agents: AgentRegistry;
  readonly agentRunner: AgentRunner;
  readonly spawner: SmartAutoSpawner;
  readonly profiler: PerformanceProfiler;
  readonly bottlenecks: BottleneckDetector;
  readonly tokenTracker: TokenTracker;
  readonly latencyMonitor: LatencyMonitor;
  readonly alignment: AlignmentGuard;
  readonly ledger: NexusLedger;

  private _state: RuntimeState = 'idle';
  private logger: ReturnType<typeof createLogger>;

  constructor(config?: Partial<SybiothConfig>) {
    super();
    this.config = loadConfig({ overrides: config });
    this.logger = createLogger({ level: this.config.runtime.logLevel as 'info' });

    // Initialize all services
    this.eventBus = createEventBus({ nodeId: 'sybioth-main', system: 'sybioth', enableCRDT: true });
    this.memory = createMemoryService({ namespace: this.config.memory.namespace });
    this.entropy = new ShannonEntropyEngine();
    this.entropyRouter = new EntropyRouter({
      brainModel: this.config.models.brain,
      handsModel: this.config.models.hands,
      analysisModel: this.config.models.analysis,
      lowThreshold: this.config.entropy.lowThreshold,
      highThreshold: this.config.entropy.highThreshold,
    });
    this.hooks = createHookManager();
    this.healing = createSelfHealing();
    this.skills = createSkillsEngine();
    this.agents = createAgentRegistry(true);
    this.agentRunner = new AgentRunner(this.agents);
    this.spawner = createSmartAutoSpawner();
    this.profiler = createProfiler();
    this.bottlenecks = createBottleneckDetector(this.profiler);
    this.tokenTracker = createTokenTracker();
    this.latencyMonitor = createLatencyMonitor();
    this.alignment = createAlignmentGuard({
      constraints: undefined, // use defaults
      circuitBreaker: this.config.alignment.circuitBreaker,
    });
    this.ledger = createNexusLedger();
  }

  /** Current runtime state */
  get state(): RuntimeState {
    return this._state;
  }

  /** Initialize the runtime */
  async initialize(): Promise<void> {
    if (this._state !== 'idle') {
      throw new Error(`Cannot initialize from state: ${this._state}`);
    }

    this._state = 'initializing';
    this.logger.info('Initializing Sybioth Runtime...');

    // Load skills from configured directories
    const skillsLoaded = this.skills.loadFromDirectories(this.config.skills.directories);
    this.logger.info(`Loaded ${skillsLoaded} skills`);

    // Load agents from configured directories
    // (Built-in agents are already registered)

    // Wire up event bus to hooks
    this.eventBus.subscribeAll(async (event: SybiothEvent) => {
      await this.hooks.execute('post-task', event);
    });

    this._state = 'running';
    this.logger.info('Sybioth Runtime initialized');

    this.emit('initialized');
  }

  /** Route a task using entropy */
  routeTask(task: string): { model: string; entropy: number; complexity: string } {
    const stop = this.profiler.start('entropy-routing');
    const decision = this.entropyRouter.route(task);
    stop();
    return decision;
  }

  /** Execute a task with alignment check */
  async executeTask(task: string, agentName?: string): Promise<{ allowed: boolean; result?: unknown }> {
    // Alignment check
    const alignmentResult = this.alignment.check(task);
    if (!alignmentResult.passed) {
      this.logger.warn(`Alignment violation: ${alignmentResult.violations.map((v) => v.constraintType).join(', ')}`);
      return { allowed: false };
    }

    // Route by entropy
    const routing = this.routeTask(task);
    this.logger.debug(`Routed to ${routing.model} (entropy: ${routing.entropy.toFixed(2)}, complexity: ${routing.complexity})`);

    return { allowed: true, result: { routing } };
  }

  /** Get unified status */
  getStatus(): Record<string, unknown> {
    return {
      state: this._state,
      config: { enhancementLevel: this.config.enhancementLevel, adapter: this.config.adapter.system },
      eventBus: this.eventBus.stats(),
      memory: this.memory.stats(),
      agents: this.agents.size(),
      skills: { loaded: this.skills.registry.size() },
      alignment: this.alignment.getStatus(),
      healing: this.healing.stats(),
      monitoring: this.bottlenecks.getHealth(),
      ledger: this.ledger.stats(),
    };
  }

  /** Shutdown the runtime */
  async shutdown(): Promise<void> {
    this._state = 'shutting-down';
    this.logger.info('Shutting down Sybioth Runtime...');

    this.eventBus.destroy();
    this.hooks.clear();
    this.agents.clear();
    this.memory.clear();

    this._state = 'idle';
    this.logger.info('Sybioth Runtime shut down');
    this.emit('shutdown');
  }
}

/** Factory */
export function createRuntime(config?: Partial<SybiothConfig>): SybiothRuntime {
  return new SybiothRuntime(config);
}
