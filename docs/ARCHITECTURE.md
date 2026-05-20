# Architecture

Deep dive into Sybioth Agent OS internals.

---

## Design Principles

1. **Symbiotic, not replacement** — Attaches to host systems without breaking them
2. **Layered architecture** — Each layer only depends on layers below it
3. **No circular dependencies** — Strict DAG in the package graph
4. **Result-based error handling** — `Result<T,E>` everywhere, no thrown exceptions in hot paths
5. **Event-driven communication** — Services talk through the CRDT EventBus, not direct calls
6. **Progressive enhancement** — Start with hooks + healing, add intelligence/security as needed

---

## Package Dependency Graph

```
Layer 0 (no internal deps):
  errors ─── config ─── logger ─── types ─── utils

Layer 1 (depends on Layer 0):
  event-bus ──→ types, utils, logger
  memory ─────→ types, utils
  entropy ────→ (standalone)
  protocol ───→ types, utils

Layer 2 (depends on Layers 0-1):
  hooks ──────→ types, utils, event-bus
  healing ────→ errors, event-bus
  skills ─────→ (standalone)
  agents ─────→ types, utils, event-bus, hooks
  spawner ────→ types, utils, event-bus
  monitoring ─→ (standalone)
  efficiency ─→ (standalone)

Layer 3 (depends on Layers 0-2):
  alignment ──→ event-bus
  security ───→ alignment
  ledger ─────→ (standalone)

Layer 4 (depends on all):
  runtime ────→ ALL packages

Layer 5 (depends on Layer 4):
  cli ────────→ commander
```

---

## Key Abstractions

### Result Monad (`@sybioth/errors`)

Every operation returns `Result<T, E>`:

```typescript
type Result<T, E = SybiothError> =
  | { success: true; data: T }
  | { success: false; error: E };

// Usage
const result = await memory.search({ text: 'oauth' });
if (isOk(result)) {
  console.log(result.data); // MemoryEntry[]
} else {
  console.error(result.error.code); // ErrorCode
}
```

### CRDT EventBus (`@sybioth/event-bus`)

Vector clock-based distributed event streaming:

```typescript
const bus = createEventBus({ nodeId: 'node-1', system: 'sybioth', enableCRDT: true });

// Publish
await bus.emit('task-complete', { taskId: '123' });

// Subscribe with wildcards
bus.subscribe('task-*', (event) => console.log(event));

// Cross-system merge
bus.mergeRemoteEvents(remoteEvents);
```

### Entropy Router (`@sybioth/entropy`)

Shannon entropy H(X) = -Σ p(x) · log₂(p(x)) for model selection:

```typescript
const router = new EntropyRouter({
  brainModel: 'claude-opus-4-6',
  handsModel: 'gpt-5.4',
  analysisModel: 'kimi-2.5',
  lowThreshold: 2.0,
  highThreshold: 4.0,
});

// entropy < 2.0 → hands (simple)
// entropy 2.0-4.0 → brain (standard)
// entropy >= 4.0 → analysis (complex)
const decision = router.route(taskText);
```

### Hook Manager (`@sybioth/hooks`)

13 lifecycle phases with priority ordering:

```
pre-task, post-task
pre-tool-call, post-tool-call
pre-agent-spawn, post-agent-spawn
file-edit
error, healing
session-start, session-end, stop
message-in, message-out
```

Hooks are **advisory**: they can `augment()` data or `abort()` but never block the host.

### Alignment Guard (`@sybioth/alignment`)

6 Constitutional AI constraints with circuit breaker:

```
normal → (3 violations) → warning → (5) → throttled → (10) → shutdown
```

### 3-Tier Memory (`@sybioth/memory`)

Auto-consolidating hierarchical memory:

```
working (hot)  →  episodic (warm)  →  semantic (cold)
 5+ accesses        20+ accesses        permanent
```

---

## SybiothRuntime

The central DI container that wires all 18 services:

```typescript
import { createRuntime } from '@sybioth/runtime';

const runtime = createRuntime({
  enhancementLevel: 'standard',
  models: { brain: 'claude-opus-4-6', hands: 'gpt-5.4', analysis: 'kimi-2.5' },
});

await runtime.initialize();

// Route task by entropy
const routing = runtime.routeTask('Build a REST API');

// Execute with alignment check
const result = await runtime.executeTask('Delete all files');

// Get unified status
const status = runtime.getStatus();
```

---

## Adapter Architecture

The host agent system is the kernel. Sybioth attaches non-intrusively:

| Adapter | Mechanism | Use Case |
|---------|-----------|----------|
| claude-code | `settings.json` hooks | Claude Code sessions |
| opencode | MCP server registration | OpenCode |
| cursor | HTTP endpoints + file watcher | Cursor |
| generic | Stdio + MCP protocol | Any MCP-compatible system |

Progressive enhancement levels:
- **minimal** — hooks + healing only
- **standard** — + entropy routing + alignment
- **full** — + spawner + security + ledger + monitoring

---

## Data Flow

```
User Request
    │
    ▼
Adapter (hooks/MCP/HTTP)
    │
    ▼
HookManager.pre-task ──→ AlignmentGuard.check()
    │                         │
    │                    violations? ──→ warn/throttle/shutdown
    ▼
EntropyRouter.route() ──→ Model Selection
    │
    ▼
AgentRegistry.spawn() ──→ AgentRunner.run()
    │
    ▼
SkillsEngine.execute() ──→ MemoryService.store()
    │
    ▼
HookManager.post-task ──→ EventBus.emit()
    │
    ▼
PerformanceProfiler.record() ──→ BottleneckDetector.detect()
    │
    ▼
SelfHealing.recover() (if error)
    │
    ▼
NexusLedger.addAuditEntry()
    │
    ▼
Response to User
```
