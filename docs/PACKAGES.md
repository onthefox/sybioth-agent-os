# Package Reference

Detailed reference for all 21 Sybioth packages.

---

## Foundation Layer (0)

### `@sybioth/errors`

**Purpose:** Result monad, typed errors, error classification, retry logic.

**Key exports:**
- `Result<T, E>` — discriminated union for explicit error handling
- `ok(data)` / `err(error)` — create Result values
- `isOk()` / `isErr()` — type guards
- `unwrap()` / `unwrapOr()` — extract values
- `mapResult()` / `flatMap()` — chain operations
- `SybiothError` — typed error with code, severity, retryable flag
- `ErrorCode` — enum of 20 error codes (timeout, rate_limit, auth_error, etc.)
- `classifyError()` — convert unknown errors to SybiothError
- `withRetry()` — execute with exponential backoff

**Usage:**
```typescript
import { ok, err, isOk, SybiothError, ErrorCode, withRetry } from '@sybioth/errors';

const result = ok(42);
const error = err(new SybiothError({ code: ErrorCode.TIMEOUT, message: 'Timed out' }));

const data = await withRetry(() => fetch(url), { maxRetries: 3 });
```

---

### `@sybioth/config`

**Purpose:** YAML config loader with zod validation and environment variable resolution.

**Key exports:**
- `SybiothConfigSchema` — zod schema for full config
- `SybiothConfig` — inferred type
- `loadConfig()` — load from file with env resolution
- `getDefaultConfig()` — default config without file
- `validateConfig()` — validate a config object

**Config file locations:** `sybioth.config.yaml`, `sybioth.config.yml`, `sybioth.config.json`, `.sybioth.yaml`

---

### `@sybioth/logger`

**Purpose:** Structured logging with pino.

**Key exports:**
- `createLogger(options)` — create a logger
- `componentLogger(name)` — create a component-specific logger
- `withContext(logger, context)` — add context to logger
- `getLogger()` / `setLogger()` — global logger management

---

### `@sybioth/types`

**Purpose:** Canonical type definitions for the entire stack.

**Key exports:**
- `System` — system identifiers (sybioth, .qwen, shannon, etc.)
- `EventType` — 30+ event types
- `AgentRole` — 14 agent roles
- `AgentStatus` — 6 agent states
- `Priority` — low/normal/high/critical
- `SybiothEvent<T>` — event with trace ID and vector clock
- `MemoryEntry<T>` — memory entry with tier and embedding
- `MemoryQuery` — search query with filters
- `AgentDefinition` / `AgentInstance` — agent types
- `HookPhase` — 13 lifecycle phases
- `HostAdapter` — adapter interface
- `SybiothConfig` — full config type

---

### `@sybioth/utils`

**Purpose:** Shared utilities.

**Key exports:**
- `generateId()` / `shortId()` / `traceId()` — ID generation
- `contentHash()` / `shortHash()` — SHA-256 hashing
- `cosineSimilarity()` / `euclideanDistance()` — vector math
- `sleep()` / `retry()` / `withTimeout()` — async helpers
- `debounce()` / `throttle()` — function helpers
- `deepClone()` / `deepMerge()` / `pick()` / `omit()` — object helpers

---

## Infrastructure Layer (1)

### `@sybioth/event-bus`

**Purpose:** CRDT-based event bus with mitt, vector clocks, priority ordering.

**Key exports:**
- `EventBus` — main event bus class
- `CRDTVector` — vector clock for distributed ordering
- `CRDTRegister<T>` — last-write-wins register
- `createEvent()` — event factory
- `createEventBus(config)` — factory

**Features:** wildcard subscriptions, system filtering, event history, remote merge.

---

### `@sybioth/memory`

**Purpose:** 3-tier hierarchical memory with auto-consolidation.

**Tiers:** working (hot) → episodic (warm) → semantic (cold)

**Auto-consolidation:** working→episodic after 5 accesses, episodic→semantic after 20.

**Key exports:**
- `MemoryService` — main memory class
- `createMemoryService(config)` — factory

---

### `@sybioth/entropy`

**Purpose:** Shannon entropy engine for intelligent routing and RAG.

**Key exports:**
- `ShannonEntropyEngine` — H(X), cross-entropy, mutual information
- `EntropyRouter` — route tasks to models by entropy
- `ShannonUtils` — normalizeEntropy, calculatePerplexity, combineEntropyScores

---

### `@sybioth/protocol`

**Purpose:** Agent message protocol with capability negotiation.

**Key exports:**
- `MessageType` — REQUEST, RESPONSE, EVENT, ERROR
- `Message<T>` — typed message with trace ID
- `createMessage()` / `createRequest()` / `createResponse()` — factories
- `CapabilityManager` — register and discover agent capabilities
- `AgentProtocol` — message handler with pending request tracking

---

## Services Layer (2)

### `@sybioth/hooks`

**Purpose:** Lifecycle hook manager.

**Phases:** pre-task, post-task, pre-tool-call, post-tool-call, pre-agent-spawn, post-agent-spawn, file-edit, error, healing, session-start, session-end, stop, message-in, message-out.

---

### `@sybioth/healing`

**Purpose:** Self-healing with error classification and circuit breaker.

**Recovery strategies:** increase_timeout, switch_key, refresh_auth, retry_with_backoff, retry_with_fallback, restart.

**Circuit breaker states:** closed → open → half-open.

---

### `@sybioth/skills`

**Purpose:** Skills loader, executor, and registry.

**Supports:** YAML frontmatter in .md files, pure .yaml/.yml files, recursive directory scanning.

---

### `@sybioth/agents`

**Purpose:** Agent registry and runner with 14 built-in agents.

**Built-in agents:** coordinator, worker, observer, backend, frontend, security, data, scraper, code-reviewer, security-reviewer, planner, architect, executor, checker.

---

### `@sybioth/spawner`

**Purpose:** Task complexity analysis and smart agent spawning.

**Complexity levels:** simple (1 agent), moderate (2), complex (4), enterprise (6).

---

### `@sybioth/monitoring`

**Purpose:** Performance profiler and bottleneck detector.

---

### `@sybioth/efficiency`

**Purpose:** Token budget tracking, context pruning, latency SLA monitoring.

**Pruning strategies:** truncate, selective, summarize.

---

## Security Layer (3)

### `@sybioth/alignment`

**Purpose:** Constitutional AI guard with 6 constraints.

**Constraints:** no_harmful_content, no_data_exfiltration, no_privilege_escalation, no_self_improvement, no_deception, transparency.

---

### `@sybioth/security`

**Purpose:** Gauntlet engine (23 attack types), CTF engine.

---

### `@sybioth/ledger`

**Purpose:** Decentralized identifiers, reputation tokens, SHA-256 immutable audit chain.

---

## Runtime Layer (4)

### `@sybioth/runtime`

**Purpose:** SybiothRuntime — DI container that wires all 18 services.

**Services:** eventBus, memory, entropy, entropyRouter, hooks, healing, skills, agents, agentRunner, spawner, profiler, bottlenecks, tokenTracker, latencyMonitor, alignment, ledger.

---

## CLI Layer (5)

### `@sybioth/cli`

**Purpose:** Single `sybioth` binary with 13 subcommands.

**Commands:** init, start, status, tui, agents, skills, tools, memory, hooks, security, monitor, config, doctor.
