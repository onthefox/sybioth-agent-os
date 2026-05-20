/**
 * @module @sybioth/types
 * Canonical type definitions for the entire Sybioth stack.
 * Source: black-bridges/core/types extended with hook/adapter/runtime types.
 */
import { z } from 'zod';
// ============================================================================
// System Identifiers
// ============================================================================
export const SystemSchema = z.enum([
    'sybioth', '.qwen', 'shannon', 'black-bridges', 'aos', 'opencode', 'claude-code', 'cursor', 'generic'
]);
// ============================================================================
// Event Types
// ============================================================================
export const EventTypeSchema = z.enum([
    // Agent lifecycle
    'agent-spawned', 'agent-terminated', 'agent-error', 'agent-idle', 'agent-busy',
    // Memory
    'memory-stored', 'memory-recalled', 'memory-consolidated',
    // Tasks
    'task-queued', 'task-started', 'task-complete', 'task-failed',
    // Tools
    'tool-registered', 'tool-called', 'tool-error',
    // Swarm
    'swarm-init', 'swarm-scale', 'swarm-coordination',
    // Security
    'alignment-check', 'alignment-violation', 'security-scan',
    // System
    'error-occurred', 'healing-attempted', 'healing-success', 'healing-failed',
    'config-changed', 'hook-executed',
    // Skills
    'skill-loaded', 'skill-executed', 'skill-failed',
    // MCP
    'mcp-server-registered', 'mcp-tool-called', 'mcp-health-check',
]);
// ============================================================================
// Agent Types
// ============================================================================
export const AgentRoleSchema = z.enum([
    'worker', 'specialist', 'scout', 'coordinator', 'observer',
    'backend', 'frontend', 'security', 'data', 'scraper',
    'reviewer', 'planner', 'executor', 'checker',
]);
export const AgentStatusSchema = z.enum([
    'idle', 'busy', 'waiting', 'error', 'terminated', 'spawning',
]);
export const PrioritySchema = z.enum(['low', 'normal', 'high', 'critical']);
//# sourceMappingURL=index.js.map