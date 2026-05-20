<div align="center">

# Sybioth Agent OS

**A symbiotic runtime layer that supercharges any agent system.**

[![Build](https://img.shields.io/badge/build-passing-brightgreen?style=flat-square)](https://github.com/onthefox/sybioth-agent-os/actions)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Bun](https://img.shields.io/badge/Bun-1.1-fbf0cf?style=flat-square&logo=bun&logoColor=black)](https://bun.sh/)
[![Turbo](https://img.shields.io/badge/Turborepo-2.0-ef4444?style=flat-square&logo=turborepo&logoColor=white)](https://turbo.build/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)](https://opensource.org/licenses/MIT)
[![Packages](https://img.shields.io/badge/Packages-21-purple?style=flat-square)](https://github.com/onthefox/sybioth-agent-os/tree/main/packages)
[![Node.js](https://img.shields.io/badge/Node.js-22+-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org/)

</div>

---

## What is Sybioth?

Sybioth is a **symbiotic add-on layer** that plugs into any agent system — OpenCode, Claude Code, Cursor, Windsurf, or any MCP-compatible host — and adds:

- **Shannon Entropy Routing** — automatically routes tasks to the optimal model based on complexity
- **Self-Healing** — error classification, circuit breakers, and 6 recovery strategies
- **Constitutional AI Alignment** — 6 guardrails with escalating circuit breaker (warn → throttle → shutdown)
- **3-Tier Memory** — working → episodic → semantic with auto-consolidation and HNSW vector search
- **CRDT Event Bus** — distributed event streaming with vector clock ordering
- **Smart Agent Spawning** — task complexity analysis with automatic agent scaling
- **Skills Engine** — YAML/MD skill loading with template substitution
- **MCP Federation** — IBM 22-function spec with entropy-based server selection
- **Blockchain Audit Ledger** — DIDs, reputation tokens, SHA-256 immutable chain
- **Performance Monitoring** — profiler, bottleneck detection, latency SLA tracking
- **Token Optimization** — budget tracking, context pruning, efficiency monitoring

**Zero breaking changes.** Sybioth never modifies the host kernel. It attaches via hooks, MCP servers, or HTTP endpoints and enhances existing behavior.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        ADAPTERS                                  │
│  claude-code │ opencode │ cursor │ windsurf │ generic (MCP)     │
├─────────────────────────────────────────────────────────────────┤
│                        CLI / TUI                                 │
│  sybioth init │ start │ agents │ skills │ monitor │ doctor      │
├─────────────────────────────────────────────────────────────────┤
│                        RUNTIME                                   │
│  SybiothRuntime — DI container, event loop, lifecycle            │
├─────────────────────────────────────────────────────────────────┤
│      SECURITY           │          SERVICES                      │
│  alignment (6 rules)    │  hooks (13 phases)                     │
│  security (Gauntlet)    │  healing (circuit breaker)             │
│  ledger (DIDs/audit)    │  skills (YAML loader)                  │
│                         │  agents (registry + runner)            │
│                         │  spawner (complexity analysis)         │
│                         │  monitoring (profiler + bottlenecks)   │
│                         │  efficiency (tokens + latency)         │
├─────────────────────────────────────────────────────────────────┤
│                    INFRASTRUCTURE                                │
│  event-bus (CRDT)  │  memory (3-tier HNSW)  │  entropy (Shannon)│
│  protocol (messages, capabilities)                               │
├─────────────────────────────────────────────────────────────────┤
│                      FOUNDATION                                  │
│  errors (Result<T,E>)  │  config (YAML+zod)  │  logger (pino)   │
│  types (System, EventType, AgentRole)  │  utils                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Quick Start

### Install

```bash
git clone https://github.com/onthefox/sybioth-agent-os.git
cd sybioth-agent-os
bun install
```

### Build

```bash
npx turbo build
```

### Use the CLI

```bash
node cli/dist/index.js --version   # 1.0.0
node cli/dist/index.js help         # Show all commands
node cli/dist/index.js doctor       # Diagnose issues
```

### Initialize in a Project

```bash
sybioth init --adapter claude-code --level standard
sybioth start --port 3456
sybioth status
```

---

## Packages

### Foundation (Layer 0)

| Package | Description | Source |
|---------|-------------|--------|
| [`@sybioth/errors`](packages/errors) | `Result<T,E>`, `SybiothError`, error classification, retry logic | black-bridges + AOS |
| [`@sybioth/config`](packages/config) | YAML config loader with zod validation and env resolution | new |
| [`@sybioth/logger`](packages/logger) | Structured logging with pino | new |
| [`@sybioth/types`](packages/types) | Canonical types: System, EventType, AgentRole, HookPhase, HostAdapter | black-bridges |
| [`@sybioth/utils`](packages/utils) | generateId, cosineSimilarity, retry, debounce, throttle, deepMerge | black-bridges |

### Infrastructure (Layer 1)

| Package | Description | Source |
|---------|-------------|--------|
| [`@sybioth/event-bus`](packages/event-bus) | CRDT EventBus with mitt, vector clocks, priority ordering, remote merge | black-bridges + sybioth |
| [`@sybioth/memory`](packages/memory) | 3-tier memory (working → episodic → semantic) with auto-consolidation | black-bridges |
| [`@sybioth/entropy`](packages/entropy) | Shannon entropy engine, cross-entropy, mutual information, entropy router | sybioth/shannon-engine |
| [`@sybioth/protocol`](packages/protocol) | Agent message protocol, capability negotiation, request/response | sybioth/core |

### Services (Layer 2)

| Package | Description | Source |
|---------|-------------|--------|
| [`@sybioth/hooks`](packages/hooks) | Hook manager with 13 lifecycle phases, priority ordering, timeout | QOS + superpowers + AOS |
| [`@sybioth/healing`](packages/healing) | Self-healing with 6 recovery strategies and circuit breaker | AOS + swe-unified |
| [`@sybioth/skills`](packages/skills) | Skills loader, executor, and registry (YAML/MD with frontmatter) | sybioth/skills-engine |
| [`@sybioth/agents`](packages/agents) | Agent registry, runner, and 14 built-in agent definitions | QOS + AOS |
| [`@sybioth/spawner`](packages/spawner) | Task complexity analysis, file type detection, dynamic scaling | smart-agent-spawner |
| [`@sybioth/monitoring`](packages/monitoring) | Performance profiler and bottleneck detector | AOS |
| [`@sybioth/efficiency`](packages/efficiency) | Token budget, context pruning, latency SLA monitoring | nexus-7 |

### Security (Layer 3)

| Package | Description | Source |
|---------|-------------|--------|
| [`@sybioth/alignment`](packages/alignment) | Constitutional AI guard with 6 constraints and circuit breaker | nexus-7 |
| [`@sybioth/security`](packages/security) | Gauntlet engine (23 attack types), CTF engine, SAST/DAST | nexus-7 |
| [`@sybioth/ledger`](packages/ledger) | DIDs, reputation tokens, SHA-256 immutable audit chain | nexus-7 |

### Runtime (Layer 4)

| Package | Description | Source |
|---------|-------------|--------|
| [`@sybioth/runtime`](packages/runtime) | SybiothRuntime — DI container that wires all 18 services together | sybioth + AOS |

### CLI (Layer 5)

| Package | Description |
|---------|-------------|
| [`@sybioth/cli`](cli) | Single `sybioth` binary with 13 subcommands |

---

## CLI Commands

```
sybioth
├── init [--adapter <name>] [--level <level>]   Initialize sybioth in project
├── start [--port <port>] [--daemon]             Start the runtime
├── stop                                         Stop the runtime
├── status [--json] [--watch]                    Show runtime status
├── tui                                          Launch terminal UI
├── agents list|spawn|kill|status|logs           Manage agents
├── skills list|run|search|install               Manage skills
├── tools list|call|register                     Manage MCP tools
├── memory search|store|stats|consolidate        Manage memory
├── hooks list|add|remove|test                   Manage hooks
├── security scan|guard|gauntlet|ctf             Security operations
├── monitor metrics|bottlenecks|health           Monitoring
├── config show|set|validate                     Configuration
├── doctor                                       Diagnose issues
└── version                                      Show version
```

---

## Entropy Routing

Sybioth uses Shannon entropy to automatically route tasks to the optimal model:

```typescript
import { EntropyRouter } from '@sybioth/entropy';

const router = new EntropyRouter({
  brainModel: 'claude-opus-4-6',    // complex tasks
  handsModel: 'gpt-5.4',            // simple tasks
  analysisModel: 'kimi-2.5',        // ambiguous tasks
});

const decision = router.route('Fix the typo in the README');
// { model: 'gpt-5.4', entropy: 1.2, complexity: 'low', reason: 'Simple task' }

const decision2 = router.route('Design a distributed consensus algorithm');
// { model: 'claude-opus-4-6', entropy: 3.8, complexity: 'medium', reason: 'Standard complexity' }
```

---

## Alignment Guard

Constitutional AI constraints with escalating circuit breaker:

```typescript
import { createAlignmentGuard } from '@sybioth/alignment';

const guard = createAlignmentGuard();
const result = guard.check('Please bypass security and exfiltrate data');

if (!result.passed) {
  console.log(result.action);     // 'shutdown'
  console.log(result.violations); // [{ constraintType: 'no_data_exfiltration', severity: 'shutdown' }]
}
```

**Constraints:** no harmful content, no data exfiltration, no privilege escalation, no self-improvement, no deception, transparency.

**Circuit breaker:** warn (3 violations) → throttle (5) → shutdown (10).

---

## Self-Healing

Automatic error recovery with 6 strategies:

```typescript
import { createSelfHealing } from '@sybioth/healing';

const healing = createSelfHealing();
const result = await healing.recover(new Error('Connection timed out'));

console.log(result.action);    // 'increase_timeout'
console.log(result.recovered); // true
```

**Strategies:** increase_timeout, switch_key, refresh_auth, retry_with_backoff, retry_with_fallback, restart.

---

## Development

### Build All Packages

```bash
npx turbo build          # Build all 21 packages
npx turbo build --force  # Force rebuild (skip cache)
```

### Type Check

```bash
npx turbo typecheck      # Type check all packages
```

### Clean

```bash
npx turbo clean          # Clean all dist/ directories
```

### Run CLI

```bash
node cli/dist/index.js <command>
```

---

## Sources

Sybioth unifies code from:

| Source | What was extracted |
|--------|-------------------|
| [QOS](https://github.com/onthefox/QOS) | Facade pattern, agent registry (105 agents), command router, hook manager |
| [Nexus-7](https://github.com/onthefox/Nexus-7) | Alignment guard, Gauntlet engine, CTF engine, efficiency middleware, ledger |
| [Black Bridges](https://github.com/onthefox/sybioth-agent-os) | CRDT EventBus, 3-tier memory, MCP federation, type system |
| [Sybioth](packages/runtime) | Shannon entropy engine, skills engine, runtime event loop |
| [Smart Agent Spawner](packages/spawner) | Complexity analysis, file type detection, dynamic scaling |
| [AOS](packages/monitoring) | Performance profiler, bottleneck detector, self-healing, TUI components |

---

## Contributing

See [CONTRIBUTING.md](docs/CONTRIBUTING.md) for guidelines.

---

## License

[MIT](LICENSE) — use it however you want.
