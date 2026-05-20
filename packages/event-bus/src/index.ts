/**
 * @module @sybioth/event-bus
 * CRDT-based event bus merging black-bridges (mitt, priority, persistence)
 * with sybioth (vector clocks, remote merge).
 */

import mitt, { type Handler } from 'mitt';
import { generateId, traceId as makeTraceId } from '@sybioth/utils';
import type { SybiothEvent, EventType, System, Priority } from '@sybioth/types';

// ============================================================================
// Vector Clock CRDT (from sybioth event-bus)
// ============================================================================

export interface VectorClock {
  [nodeId: string]: number;
}

export class CRDTVector {
  private clock: VectorClock = {};
  private nodeId: string;

  constructor(nodeId: string) {
    this.nodeId = nodeId;
    this.clock[nodeId] = 0;
  }

  increment(): VectorClock {
    this.clock[this.nodeId] = (this.clock[this.nodeId] || 0) + 1;
    return { ...this.clock };
  }

  merge(remote: VectorClock): void {
    for (const [nodeId, timestamp] of Object.entries(remote)) {
      this.clock[nodeId] = Math.max(this.clock[nodeId] || 0, timestamp);
    }
    if (!(this.nodeId in this.clock)) {
      this.clock[this.nodeId] = 0;
    }
  }

  getClock(): VectorClock {
    return { ...this.clock };
  }

  static compare(a: VectorClock, b: VectorClock): number {
    let aGreater = false;
    let bGreater = false;
    const allNodes = new Set([...Object.keys(a), ...Object.keys(b)]);
    for (const nodeId of allNodes) {
      const aTime = a[nodeId] || 0;
      const bTime = b[nodeId] || 0;
      if (aTime > bTime) aGreater = true;
      if (bTime > aTime) bGreater = true;
    }
    if (aGreater && !bGreater) return 1;
    if (bGreater && !aGreater) return -1;
    return 0;
  }
}

// ============================================================================
// CRDT Register (Last-Write-Wins)
// ============================================================================

export class CRDTRegister<T> {
  private value: T | null = null;
  private timestamp = 0;
  private nodeId: string;

  constructor(nodeId: string, initialValue?: T) {
    this.nodeId = nodeId;
    this.value = initialValue ?? null;
  }

  set(value: T, timestamp?: number): void {
    const ts = timestamp ?? Date.now();
    if (ts > this.timestamp) {
      this.value = value;
      this.timestamp = ts;
    }
  }

  get(): T | null {
    return this.value;
  }

  merge(remoteValue: T | null, remoteTimestamp: number, remoteNodeId: string): void {
    if (remoteTimestamp > this.timestamp) {
      this.value = remoteValue;
      this.timestamp = remoteTimestamp;
    } else if (remoteTimestamp === this.timestamp && remoteNodeId > this.nodeId) {
      this.value = remoteValue;
    }
  }

  getState(): { value: T | null; timestamp: number; nodeId: string } {
    return { value: this.value, timestamp: this.timestamp, nodeId: this.nodeId };
  }
}

// ============================================================================
// Priority Comparison
// ============================================================================

const PRIORITY_ORDER: Record<string, number> = {
  critical: 4,
  high: 3,
  normal: 2,
  low: 1,
};

export function comparePriority(a: Priority, b: Priority): number {
  return (PRIORITY_ORDER[b] ?? 0) - (PRIORITY_ORDER[a] ?? 0);
}

// ============================================================================
// Event Factory
// ============================================================================

export function createEvent<T>(
  type: EventType,
  source: System,
  payload: T,
  options?: { target?: System; priority?: Priority; traceId?: string },
): SybiothEvent<T> {
  return {
    id: generateId(),
    type,
    source,
    target: options?.target,
    payload,
    timestamp: Date.now(),
    traceId: options?.traceId ?? makeTraceId(),
    priority: options?.priority ?? 'normal',
  };
}

// ============================================================================
// EventBus Config
// ============================================================================

export interface EventBusConfig {
  nodeId: string;
  system: System;
  enableCRDT?: boolean;
  maxEventHistory?: number;
}

// ============================================================================
// EventBus (merged: black-bridges mitt + sybioth CRDT)
// ============================================================================

export type EventCallback<T = unknown> = (event: SybiothEvent<T>) => void | Promise<void>;

export class EventBus {
  private emitter: ReturnType<typeof mitt<Record<string, SybiothEvent>>>;
  private vector: CRDTVector;
  private config: EventBusConfig;
  private eventHistory: SybiothEvent[] = [];
  private subscribers: Map<string, Set<EventCallback>> = new Map();

  constructor(config: EventBusConfig) {
    this.emitter = mitt();
    this.config = config;
    this.vector = new CRDTVector(config.nodeId);
  }

  /** Publish an event to all subscribers */
  async publish<T>(event: SybiothEvent<T>): Promise<void> {
    // Add to history
    this.eventHistory.push(event);
    const maxHistory = this.config.maxEventHistory ?? 10000;
    if (this.eventHistory.length > maxHistory) {
      this.eventHistory = this.eventHistory.slice(-maxHistory);
    }

    // Emit via mitt
    this.emitter.emit(event.type, event as SybiothEvent);
    this.emitter.emit('*', event as SybiothEvent);

    // Call direct subscribers
    const callbacks = this.subscribers.get(event.type);
    if (callbacks) {
      for (const callback of callbacks) {
        try {
          await callback(event);
        } catch (error) {
          console.error(`[EventBus] Subscriber error for ${event.type}:`, error);
        }
      }
    }
  }

  /** Create and publish an event */
  async emit<T>(
    type: EventType,
    payload: T,
    options?: { target?: System; priority?: Priority; traceId?: string },
  ): Promise<SybiothEvent<T>> {
    const vectorClock = this.config.enableCRDT ? this.vector.increment() : undefined;
    const event = createEvent(type, this.config.system as System, payload, options);
    if (vectorClock) {
      (event as unknown as Record<string, unknown>).vector = vectorClock;
    }
    await this.publish(event);
    return event;
  }

  /** Subscribe to events of a specific type */
  subscribe<T>(type: EventType | '*', callback: EventCallback<T>): () => void {
    this.emitter.on(type, callback as Handler<SybiothEvent>);
    if (!this.subscribers.has(type)) {
      this.subscribers.set(type, new Set());
    }
    this.subscribers.get(type)!.add(callback as EventCallback);
    return () => {
      this.emitter.off(type, callback as Handler<SybiothEvent>);
      this.subscribers.get(type)?.delete(callback as EventCallback);
    };
  }

  /** Subscribe to all events */
  subscribeAll(callback: EventCallback): () => void {
    return this.subscribe('*', callback);
  }

  /** Subscribe to events from a specific system */
  subscribeToSystem(system: System, callback: EventCallback): () => void {
    return this.subscribeAll((event) => {
      if (event.source === system) callback(event);
    });
  }

  /** Get event history */
  getHistory(options?: { type?: EventType; source?: System; limit?: number }): SybiothEvent[] {
    let events = [...this.eventHistory];
    if (options?.type) events = events.filter((e) => e.type === options.type);
    if (options?.source) events = events.filter((e) => e.source === options.source);
    const limit = options?.limit ?? 100;
    return events.slice(-limit).sort((a, b) => {
      const priorityDiff = comparePriority(a.priority, b.priority);
      if (priorityDiff !== 0) return priorityDiff;
      return b.timestamp - a.timestamp;
    });
  }

  /** Merge events from remote EventBus (CRDT) */
  mergeRemoteEvents(remoteEvents: SybiothEvent[]): void {
    for (const event of remoteEvents) {
      if (this.eventHistory.some((e) => e.id === event.id)) continue;
      const remoteVector = (event as unknown as Record<string, unknown>).vector as VectorClock | undefined;
      if (remoteVector) this.vector.merge(remoteVector);
      this.eventHistory.push(event);
      this.emitter.emit(event.type, event);
    }
    if (this.config.enableCRDT) {
      this.eventHistory.sort((a, b) => {
        const va = (a as unknown as Record<string, unknown>).vector as VectorClock | undefined;
        const vb = (b as unknown as Record<string, unknown>).vector as VectorClock | undefined;
        if (va && vb) return CRDTVector.compare(va, vb);
        return a.timestamp - b.timestamp;
      });
    }
  }

  /** Get current vector clock */
  getVectorClock(): VectorClock {
    return this.vector.getClock();
  }

  /** Get statistics */
  stats(): { totalEvents: number; byType: Record<string, number>; bySource: Record<string, number>; subscribers: number } {
    return {
      totalEvents: this.eventHistory.length,
      byType: this.eventHistory.reduce((acc, e) => { acc[e.type] = (acc[e.type] || 0) + 1; return acc; }, {} as Record<string, number>),
      bySource: this.eventHistory.reduce((acc, e) => { acc[e.source] = (acc[e.source] || 0) + 1; return acc; }, {} as Record<string, number>),
      subscribers: Array.from(this.subscribers.values()).reduce((sum, set) => sum + set.size, 0),
    };
  }

  /** Clear history */
  clearHistory(): void {
    this.eventHistory = [];
  }

  /** Destroy the event bus */
  destroy(): void {
    this.emitter.all.clear();
    this.subscribers.clear();
    this.eventHistory = [];
  }
}

/** Factory */
export function createEventBus(config: EventBusConfig): EventBus {
  return new EventBus(config);
}
