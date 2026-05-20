/**
 * @module @sybioth/types
 * Canonical type definitions for the entire Sybioth stack.
 * Source: black-bridges/core/types extended with hook/adapter/runtime types.
 */
import { z } from 'zod';
export declare const SystemSchema: z.ZodEnum<["sybioth", ".qwen", "shannon", "black-bridges", "aos", "opencode", "claude-code", "cursor", "generic"]>;
export type System = z.infer<typeof SystemSchema>;
export declare const EventTypeSchema: z.ZodEnum<["agent-spawned", "agent-terminated", "agent-error", "agent-idle", "agent-busy", "memory-stored", "memory-recalled", "memory-consolidated", "task-queued", "task-started", "task-complete", "task-failed", "tool-registered", "tool-called", "tool-error", "swarm-init", "swarm-scale", "swarm-coordination", "alignment-check", "alignment-violation", "security-scan", "error-occurred", "healing-attempted", "healing-success", "healing-failed", "config-changed", "hook-executed", "skill-loaded", "skill-executed", "skill-failed", "mcp-server-registered", "mcp-tool-called", "mcp-health-check"]>;
export type EventType = z.infer<typeof EventTypeSchema>;
export declare const AgentRoleSchema: z.ZodEnum<["worker", "specialist", "scout", "coordinator", "observer", "backend", "frontend", "security", "data", "scraper", "reviewer", "planner", "executor", "checker"]>;
export type AgentRole = z.infer<typeof AgentRoleSchema>;
export declare const AgentStatusSchema: z.ZodEnum<["idle", "busy", "waiting", "error", "terminated", "spawning"]>;
export type AgentStatus = z.infer<typeof AgentStatusSchema>;
export declare const PrioritySchema: z.ZodEnum<["low", "normal", "high", "critical"]>;
export type Priority = z.infer<typeof PrioritySchema>;
export type EmbeddingVector = number[];
export interface SybiothEvent<T = unknown> {
    id: string;
    type: EventType;
    source: System;
    target?: System;
    payload: T;
    embedding?: EmbeddingVector;
    timestamp: number;
    traceId: string;
    spanId?: string;
    priority: Priority;
}
export type MemoryTier = 'working' | 'episodic' | 'semantic';
export interface MemoryEntry<T = unknown> {
    key: string;
    value: T;
    tier: MemoryTier;
    namespace: string;
    tags: string[];
    accessCount: number;
    createdAt: number;
    updatedAt: number;
    expiresAt?: number;
    embedding?: EmbeddingVector;
}
export interface MemoryQuery {
    text?: string;
    namespace?: string;
    tier?: MemoryTier;
    tags?: string[];
    type?: string;
    source?: System;
    limit?: number;
    minScore?: number;
}
export interface AgentDefinition {
    name: string;
    type: string;
    role: AgentRole;
    description: string;
    capabilities: string[];
    model?: string;
    tools?: string[];
    hooks?: string[];
    config?: Record<string, unknown>;
}
export interface AgentInstance {
    id: string;
    definition: AgentDefinition;
    state: AgentStatus;
    spawnedAt: number;
    lastActiveAt: number;
    taskCount: number;
    errorCount: number;
}
export interface Task {
    id: string;
    type: string;
    description: string;
    priority: Priority;
    assignedAgent?: string;
    status: 'pending' | 'running' | 'completed' | 'failed';
    createdAt: number;
    startedAt?: number;
    completedAt?: number;
    result?: unknown;
    error?: string;
}
export type SwarmTopology = 'mesh' | 'hierarchical' | 'centralized' | 'hybrid' | 'star' | 'ring';
export type ConsensusAlgorithm = 'raft' | 'byzantine' | 'gossip' | 'crdt';
export interface SwarmState {
    id: string;
    topology: SwarmTopology;
    consensus: ConsensusAlgorithm;
    agents: string[];
    maxAgents: number;
    healthCheckInterval: number;
    status: 'initializing' | 'running' | 'scaling' | 'shutting-down';
}
export interface MCPTool {
    id: string;
    name: string;
    description: string;
    server: string;
    system: System;
    inputSchema: Record<string, unknown>;
    enabled: boolean;
    registeredAt: number;
    callCount: number;
    rateLimit?: {
        requests: number;
        interval: number;
    };
    metadata?: {
        category?: string;
        tags?: string[];
        deprecated?: boolean;
        requiresAuth?: boolean;
    };
}
export interface MCPServer {
    id: string;
    name: string;
    system: System;
    command: string;
    args?: string[];
    enabled: boolean;
    autoStart: boolean;
    status: 'stopped' | 'starting' | 'running' | 'error';
    tools: string[];
}
export type HookPhase = 'pre-task' | 'post-task' | 'pre-tool-call' | 'post-tool-call' | 'pre-agent-spawn' | 'post-agent-spawn' | 'file-edit' | 'error' | 'healing' | 'session-start' | 'session-end' | 'stop' | 'message-in' | 'message-out';
export interface HookContext {
    phase: HookPhase;
    timestamp: number;
    traceId: string;
    payload: unknown;
    abort: () => void;
    augment: (data: unknown) => void;
}
export interface HookDefinition {
    phase: HookPhase;
    name: string;
    priority: number;
    handler: (ctx: HookContext) => Promise<void>;
    once?: boolean;
    timeout?: number;
}
export type AdapterSystem = 'opencode' | 'claude-code' | 'cursor' | 'windsurf' | 'generic';
export interface AdapterCapability {
    name: string;
    hooks: HookPhase[];
    mcpTools?: string[];
}
export interface HostAdapter {
    name: string;
    system: AdapterSystem;
    capabilities: AdapterCapability[];
    attach(): Promise<void>;
    detach(): Promise<void>;
}
export interface ModelConfig {
    brain: string;
    hands: string;
    analysis: string;
}
export interface EntropyConfig {
    lowThreshold: number;
    highThreshold: number;
}
export interface SwarmConfig {
    topology: SwarmTopology;
    consensus: ConsensusAlgorithm;
    maxAgents: number;
    healthCheckInterval: number;
}
export interface MemoryConfig {
    namespace: string;
    hnsw?: {
        enabled: boolean;
        efConstruction?: number;
        M?: number;
    };
    consolidation?: {
        auto: boolean;
        minAgeHours: number;
        maxEntries: number;
    };
}
export interface AlignmentConfig {
    enabled: boolean;
    constraints: string[];
    circuitBreaker: {
        warnThreshold: number;
        throttleThreshold: number;
        shutdownThreshold: number;
    };
}
export interface SybiothConfig {
    version: string;
    enhancementLevel: 'minimal' | 'standard' | 'full';
    runtime: {
        port: number;
        daemon: boolean;
        logLevel: string;
    };
    models: ModelConfig;
    entropy: EntropyConfig;
    swarm: SwarmConfig;
    memory: MemoryConfig;
    alignment: AlignmentConfig;
    skills: {
        directories: string[];
    };
    agents: {
        directories: string[];
    };
    hooks: {
        directories: string[];
    };
    adapter: {
        system: AdapterSystem;
    };
}
//# sourceMappingURL=index.d.ts.map