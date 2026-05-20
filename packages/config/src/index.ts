/**
 * @module @sybioth/config
 * Configuration loader with YAML + zod validation + env resolution.
 */

import { z } from 'zod';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import YAML from 'yaml';

// ============================================================================
// Config Schema
// ============================================================================

const ModelConfigSchema = z.object({
  brain: z.string().default('claude-opus-4-6'),
  hands: z.string().default('gpt-5.4'),
  analysis: z.string().default('kimi-2.5'),
});

const EntropyConfigSchema = z.object({
  lowThreshold: z.number().default(2.0),
  highThreshold: z.number().default(4.0),
});

const SwarmConfigSchema = z.object({
  topology: z.enum(['mesh', 'hierarchical', 'centralized', 'hybrid', 'star', 'ring']).default('mesh'),
  consensus: z.enum(['raft', 'byzantine', 'gossip', 'crdt']).default('crdt'),
  maxAgents: z.number().default(15),
  healthCheckInterval: z.number().default(5000),
});

const MemoryConfigSchema = z.object({
  namespace: z.string().default('sybioth'),
  hnsw: z.object({
    enabled: z.boolean().default(true),
    efConstruction: z.number().default(200),
    M: z.number().default(16),
  }).default({}),
  consolidation: z.object({
    auto: z.boolean().default(true),
    minAgeHours: z.number().default(24),
    maxEntries: z.number().default(10000),
  }).default({}),
});

const AlignmentConfigSchema = z.object({
  enabled: z.boolean().default(true),
  constraints: z.array(z.string()).default(['no-harmful-content', 'no-data-exfiltration', 'no-privilege-escalation']),
  circuitBreaker: z.object({
    warnThreshold: z.number().default(3),
    throttleThreshold: z.number().default(5),
    shutdownThreshold: z.number().default(10),
  }).default({}),
});

export const SybiothConfigSchema = z.object({
  version: z.string().default('1.0'),
  enhancementLevel: z.enum(['minimal', 'standard', 'full']).default('standard'),
  runtime: z.object({
    port: z.number().default(3456),
    daemon: z.boolean().default(false),
    logLevel: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),
  }).default({}),
  models: ModelConfigSchema.default({}),
  entropy: EntropyConfigSchema.default({}),
  swarm: SwarmConfigSchema.default({}),
  memory: MemoryConfigSchema.default({}),
  alignment: AlignmentConfigSchema.default({}),
  skills: z.object({ directories: z.array(z.string()).default(['./skills/']) }).default({}),
  agents: z.object({ directories: z.array(z.string()).default(['./agents/']) }).default({}),
  hooks: z.object({ directories: z.array(z.string()).default(['./hooks/']) }).default({}),
  adapter: z.object({
    system: z.enum(['opencode', 'claude-code', 'cursor', 'windsurf', 'generic']).default('generic'),
  }).default({}),
});

export type SybiothConfig = z.infer<typeof SybiothConfigSchema>;

// ============================================================================
// Env Resolution
// ============================================================================

/** Replace ${VAR_NAME} references with environment variable values */
function resolveEnvVars(text: string): string {
  return text.replace(/\$\{(\w+)\}/g, (_, name: string) => process.env[name] ?? '');
}

// ============================================================================
// Config Loading
// ============================================================================

export interface LoadConfigOptions {
  path?: string;
  overrides?: Partial<SybiothConfig>;
}

const DEFAULT_CONFIG_PATHS = [
  'sybioth.config.yaml',
  'sybioth.config.yml',
  'sybioth.config.json',
  '.sybioth.yaml',
  '.sybioth.yml',
];

/** Load config from file, with env resolution and validation */
export function loadConfig(options: LoadConfigOptions = {}): SybiothConfig {
  let raw: Record<string, unknown> = {};

  // Find config file
  const configPath = options.path
    ?? DEFAULT_CONFIG_PATHS.map((p) => resolve(process.cwd(), p)).find((p) => existsSync(p));

  if (configPath && existsSync(configPath)) {
    const content = resolveEnvVars(readFileSync(configPath, 'utf-8'));
    if (configPath.endsWith('.json')) {
      raw = JSON.parse(content);
    } else {
      raw = YAML.parse(content) ?? {};
    }
  }

  // Apply overrides
  if (options.overrides) {
    raw = { ...raw, ...options.overrides };
  }

  // Validate and return with defaults
  return SybiothConfigSchema.parse(raw);
}

/** Get default config without file */
export function getDefaultConfig(): SybiothConfig {
  return SybiothConfigSchema.parse({});
}

/** Validate a config object */
export function validateConfig(data: unknown): { success: true; config: SybiothConfig } | { success: false; errors: string[] } {
  const result = SybiothConfigSchema.safeParse(data);
  if (result.success) {
    return { success: true, config: result.data };
  }
  return {
    success: false,
    errors: result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`),
  };
}
