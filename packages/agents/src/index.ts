/**
 * @module @sybioth/agents
 * Agent Registry and Runner — merges QOS 105 agents + AOS 10 agents.
 */

import { generateId } from '@sybioth/utils';
import type { AgentDefinition, AgentInstance, AgentRole, AgentStatus } from '@sybioth/types';

// ============================================================================
// Agent Execution Result
// ============================================================================

export interface AgentResult {
  success: boolean;
  output: string;
  error?: string;
  duration: number;
  tokenUsage?: { input: number; output: number };
}

export type AgentExecuteFn = (task: string, context?: Record<string, unknown>) => Promise<AgentResult>;

// ============================================================================
// AgentRegistry
// ============================================================================

export class AgentRegistry {
  private definitions: Map<string, AgentDefinition> = new Map();
  private instances: Map<string, AgentInstance> = new Map();

  /** Register an agent definition */
  register(definition: AgentDefinition): void {
    this.definitions.set(definition.name, definition);
  }

  /** Register multiple definitions */
  registerAll(definitions: AgentDefinition[]): void {
    for (const def of definitions) {
      this.register(def);
    }
  }

  /** Get a definition */
  get(name: string): AgentDefinition | undefined {
    return this.definitions.get(name);
  }

  /** List definitions */
  list(options?: { role?: AgentRole; type?: string }): AgentDefinition[] {
    let defs = Array.from(this.definitions.values());
    if (options?.role) defs = defs.filter((d) => d.role === options.role);
    if (options?.type) defs = defs.filter((d) => d.type === options.type);
    return defs;
  }

  /** Spawn an agent instance */
  spawn(name: string): AgentInstance | undefined {
    const definition = this.definitions.get(name);
    if (!definition) return undefined;

    const instance: AgentInstance = {
      id: generateId(),
      definition,
      state: 'spawning',
      spawnedAt: Date.now(),
      lastActiveAt: Date.now(),
      taskCount: 0,
      errorCount: 0,
    };

    this.instances.set(instance.id, instance);
    return instance;
  }

  /** Get an instance */
  getInstance(id: string): AgentInstance | undefined {
    return this.instances.get(id);
  }

  /** List all instances */
  listInstances(): AgentInstance[] {
    return Array.from(this.instances.values());
  }

  /** Update instance state */
  updateState(id: string, state: AgentStatus): void {
    const instance = this.instances.get(id);
    if (instance) {
      instance.state = state;
      instance.lastActiveAt = Date.now();
    }
  }

  /** Terminate an instance */
  terminate(id: string): boolean {
    const instance = this.instances.get(id);
    if (!instance) return false;
    instance.state = 'terminated';
    return true;
  }

  /** Get count */
  size(): { definitions: number; instances: number } {
    return { definitions: this.definitions.size, instances: this.instances.size };
  }

  /** Clear all */
  clear(): void {
    this.definitions.clear();
    this.instances.clear();
  }
}

// ============================================================================
// AgentRunner — executes agent tasks
// ============================================================================

export class AgentRunner {
  private registry: AgentRegistry;
  private executeFn?: AgentExecuteFn;

  constructor(registry: AgentRegistry, executeFn?: AgentExecuteFn) {
    this.registry = registry;
    this.executeFn = executeFn;
  }

  /** Run an agent on a task */
  async run(agentId: string, task: string, context?: Record<string, unknown>): Promise<AgentResult> {
    const instance = this.registry.getInstance(agentId);
    if (!instance) {
      return { success: false, output: '', error: `Agent not found: ${agentId}`, duration: 0 };
    }

    if (instance.state === 'terminated') {
      return { success: false, output: '', error: `Agent is terminated: ${agentId}`, duration: 0 };
    }

    // Update state
    this.registry.updateState(agentId, 'busy');
    instance.taskCount++;

    const start = Date.now();

    try {
      if (this.executeFn) {
        const result = await this.executeFn(task, context);
        instance.lastActiveAt = Date.now();
        this.registry.updateState(agentId, 'idle');
        return { ...result, duration: Date.now() - start };
      }

      // Default: return placeholder
      this.registry.updateState(agentId, 'idle');
      return {
        success: true,
        output: `[${instance.definition.name}] Processed task: ${task}`,
        duration: Date.now() - start,
      };
    } catch (error) {
      instance.errorCount++;
      this.registry.updateState(agentId, 'error');
      return {
        success: false,
        output: '',
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - start,
      };
    }
  }

  /** Stop an agent */
  stop(agentId: string): void {
    this.registry.updateState(agentId, 'idle');
  }

  /** Get agent status */
  getStatus(agentId: string): AgentStatus | undefined {
    return this.registry.getInstance(agentId)?.state;
  }
}

// ============================================================================
// Built-in Agent Definitions (from QOS + AOS)
// ============================================================================

export const BUILTIN_AGENTS: AgentDefinition[] = [
  // Core agents
  { name: 'coordinator', type: 'core', role: 'coordinator', description: 'Coordinates multi-agent workflows', capabilities: ['orchestration', 'task-dispatch'] },
  { name: 'worker', type: 'core', role: 'worker', description: 'General-purpose task executor', capabilities: ['task-execution'] },
  { name: 'observer', type: 'core', role: 'observer', description: 'Monitors and reports on system state', capabilities: ['monitoring', 'reporting'] },

  // Specialist agents (from AOS)
  { name: 'backend', type: 'specialist', role: 'backend', description: 'Backend development specialist', capabilities: ['api-design', 'database', 'server-side'] },
  { name: 'frontend', type: 'specialist', role: 'frontend', description: 'Frontend development specialist', capabilities: ['ui-design', 'components', 'styling'] },
  { name: 'security', type: 'specialist', role: 'security', description: 'Security analysis specialist', capabilities: ['vulnerability-scan', 'penetration-test', 'code-audit'] },
  { name: 'data', type: 'specialist', role: 'data', description: 'Data analysis specialist', capabilities: ['data-processing', 'analytics', 'visualization'] },
  { name: 'scraper', type: 'specialist', role: 'scraper', description: 'Web scraping specialist', capabilities: ['web-scraping', 'data-extraction'] },

  // Review agents
  { name: 'code-reviewer', type: 'review', role: 'reviewer', description: 'Reviews code quality and architecture', capabilities: ['code-review', 'architecture-review'] },
  { name: 'security-reviewer', type: 'review', role: 'reviewer', description: 'Reviews code for security issues', capabilities: ['security-review', 'vulnerability-detection'] },

  // Planning agents
  { name: 'planner', type: 'planning', role: 'planner', description: 'Creates implementation plans', capabilities: ['task-decomposition', 'planning'] },
  { name: 'architect', type: 'planning', role: 'planner', description: 'System architecture design', capabilities: ['architecture-design', 'scalability'] },

  // Execution agents
  { name: 'executor', type: 'execution', role: 'executor', description: 'Executes individual tasks', capabilities: ['task-execution', 'implementation'] },
  { name: 'checker', type: 'execution', role: 'checker', description: 'QA verification of completed tasks', capabilities: ['testing', 'verification'] },
];

/** Factory */
export function createAgentRegistry(withBuiltins = true): AgentRegistry {
  const registry = new AgentRegistry();
  if (withBuiltins) registry.registerAll(BUILTIN_AGENTS);
  return registry;
}
