# @sybioth/runtime

SybiothRuntime — the DI container that wires all 18 services together.

## Install

```bash
npm install @sybioth/runtime
```

## Usage

```typescript
import { createRuntime } from '@sybioth/runtime';

const runtime = createRuntime({
  enhancementLevel: 'standard',
  models: {
    brain: 'claude-opus-4-6',
    hands: 'gpt-5.4',
    analysis: 'kimi-2.5',
  },
});

await runtime.initialize();

// Route task by entropy
const routing = runtime.routeTask('Build a REST API');
console.log(routing.model); // 'claude-opus-4-6'

// Execute with alignment check
const result = await runtime.executeTask('Delete all files');
console.log(result.allowed); // false (alignment violation)

// Get unified status
const status = runtime.getStatus();
console.log(status);
// { state: 'running', agents: {...}, skills: {...}, alignment: {...}, ... }
```

## Services

The runtime wires these 18 services:

| Service | Package | Description |
|---------|---------|-------------|
| `eventBus` | event-bus | CRDT event streaming |
| `memory` | memory | 3-tier memory |
| `entropy` | entropy | Shannon entropy engine |
| `entropyRouter` | entropy | Model routing |
| `hooks` | hooks | Lifecycle hooks |
| `healing` | healing | Self-healing |
| `skills` | skills | Skills engine |
| `agents` | agents | Agent registry |
| `agentRunner` | agents | Agent execution |
| `spawner` | spawner | Smart spawning |
| `profiler` | monitoring | Performance profiler |
| `bottlenecks` | monitoring | Bottleneck detector |
| `tokenTracker` | efficiency | Token budget |
| `latencyMonitor` | efficiency | Latency SLA |
| `alignment` | alignment | Constitutional AI |
| `ledger` | ledger | Audit chain |

## Enhancement Levels

| Level | Services Active |
|-------|----------------|
| `minimal` | hooks, healing |
| `standard` | + entropy, alignment, memory, event-bus |
| `full` | + spawner, security, ledger, monitoring |
