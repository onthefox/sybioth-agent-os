# @sybioth/event-bus

CRDT-based event bus with mitt, vector clocks, priority ordering, and remote merge.

## Install

```bash
npm install @sybioth/event-bus
```

## Usage

```typescript
import { createEventBus } from '@sybioth/event-bus';

const bus = createEventBus({
  nodeId: 'node-1',
  system: 'sybioth',
  enableCRDT: true,
});

// Subscribe
bus.subscribe('task-complete', (event) => {
  console.log(event.payload);
});

// Publish
await bus.emit('task-complete', { taskId: '123' });

// Wildcard
bus.subscribe('*', (event) => console.log(event.type));

// Cross-system merge
bus.mergeRemoteEvents(remoteEvents);
```

## Features

- **CRDT vector clocks** — causal ordering across distributed nodes
- **Priority ordering** — critical > high > normal > low
- **Wildcard subscriptions** — `*` matches all events
- **System filtering** — subscribe to events from specific systems
- **Event history** — capped at 10,000 entries
- **Remote merge** — merge events from other EventBus instances
