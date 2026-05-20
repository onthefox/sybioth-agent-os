/**
 * @module @sybioth/protocol
 * Agent communication protocol with message types and capability negotiation.
 * Source: sybioth/core/protocol
 */

import { generateId } from '@sybioth/utils';
import type { Priority, AgentRole } from '@sybioth/types';

// ============================================================================
// Message Types
// ============================================================================

export enum MessageType {
  REQUEST = 'request',
  RESPONSE = 'response',
  EVENT = 'event',
  ERROR = 'error',
}

export enum MessagePriority {
  LOW = 1,
  NORMAL = 5,
  HIGH = 8,
  CRITICAL = 10,
}

export interface Message<T = unknown> {
  id: string;
  type: MessageType;
  source: string;
  target: string;
  payload: T;
  priority: MessagePriority;
  timestamp: number;
  traceId: string;
  expiresAt?: number;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Message Factory
// ============================================================================

export function createMessage<T>(
  type: MessageType,
  source: string,
  target: string,
  payload: T,
  options?: {
    priority?: MessagePriority;
    traceId?: string;
    expiresAt?: number;
    metadata?: Record<string, unknown>;
  },
): Message<T> {
  return {
    id: generateId(),
    type,
    source,
    target,
    payload,
    priority: options?.priority ?? MessagePriority.NORMAL,
    timestamp: Date.now(),
    traceId: options?.traceId ?? generateId(),
    expiresAt: options?.expiresAt,
    metadata: options?.metadata,
  };
}

export function createRequest<T>(source: string, target: string, payload: T, options?: { priority?: MessagePriority; traceId?: string; expiresAt?: number; metadata?: Record<string, unknown> }): Message<T> {
  return createMessage(MessageType.REQUEST, source, target, payload, options);
}

export function createResponse<T>(source: string, target: string, payload: T, traceId: string): Message<T> {
  return createMessage(MessageType.RESPONSE, source, target, payload, { traceId });
}

export function createEventMessage<T>(source: string, target: string, payload: T): Message<T> {
  return createMessage(MessageType.EVENT, source, target, payload);
}

export function createErrorMessage(source: string, target: string, error: string, traceId: string): Message<{ error: string }> {
  return createMessage(MessageType.ERROR, source, target, { error }, { traceId, priority: MessagePriority.HIGH });
}

/** Check if message is expired */
export function isMessageExpired(message: Message): boolean {
  return message.expiresAt !== undefined && Date.now() > message.expiresAt;
}

// ============================================================================
// Capability Types
// ============================================================================

export interface Capability {
  name: string;
  version: string;
  description: string;
  parameters?: Record<string, unknown>;
}

export interface CapabilityManifest {
  agentId: string;
  role: AgentRole;
  capabilities: Capability[];
  tools: string[];
  models: string[];
}

// ============================================================================
// Capability Manager
// ============================================================================

export class CapabilityManager {
  private manifests: Map<string, CapabilityManifest> = new Map();

  /** Register an agent's capabilities */
  register(manifest: CapabilityManifest): void {
    this.manifests.set(manifest.agentId, manifest);
  }

  /** Unregister an agent */
  unregister(agentId: string): void {
    this.manifests.delete(agentId);
  }

  /** Get an agent's manifest */
  get(agentId: string): CapabilityManifest | undefined {
    return this.manifests.get(agentId);
  }

  /** Find agents with a specific capability */
  findWithCapability(capabilityName: string): CapabilityManifest[] {
    return Array.from(this.manifests.values()).filter((m) =>
      m.capabilities.some((c) => c.name === capabilityName),
    );
  }

  /** Find agents with a specific tool */
  findWithTool(toolName: string): CapabilityManifest[] {
    return Array.from(this.manifests.values()).filter((m) => m.tools.includes(toolName));
  }

  /** Find agents by role */
  findByRole(role: AgentRole): CapabilityManifest[] {
    return Array.from(this.manifests.values()).filter((m) => m.role === role);
  }

  /** Check if agent has capability */
  hasCapability(agentId: string, capabilityName: string): boolean {
    const manifest = this.manifests.get(agentId);
    return manifest?.capabilities.some((c) => c.name === capabilityName) ?? false;
  }

  /** List all registered agents */
  list(): CapabilityManifest[] {
    return Array.from(this.manifests.values());
  }

  /** Get count */
  size(): number {
    return this.manifests.size;
  }
}

// ============================================================================
// Agent Protocol
// ============================================================================

export type MessageHandler = (message: Message) => Promise<Message | void>;

export class AgentProtocol {
  private handlers: Map<MessageType, MessageHandler[]> = new Map();
  private pendingRequests: Map<string, { resolve: (msg: Message) => void; timer: ReturnType<typeof setTimeout> }> = new Map();

  /** Register a handler for a message type */
  on(type: MessageType, handler: MessageHandler): void {
    if (!this.handlers.has(type)) this.handlers.set(type, []);
    this.handlers.get(type)!.push(handler);
  }

  /** Handle an incoming message */
  async handle(message: Message): Promise<Message | void> {
    if (isMessageExpired(message)) return;

    // If it's a response, resolve pending request
    if (message.type === MessageType.RESPONSE) {
      const pending = this.pendingRequests.get(message.traceId);
      if (pending) {
        clearTimeout(pending.timer);
        this.pendingRequests.delete(message.traceId);
        pending.resolve(message);
        return;
      }
    }

    const handlers = this.handlers.get(message.type) ?? [];
    for (const handler of handlers) {
      const response = await handler(message);
      if (response) return response;
    }
  }

  /** Send a request and wait for response */
  async request(message: Message, timeoutMs = 30000): Promise<Message> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pendingRequests.delete(message.traceId);
        reject(new Error(`Request timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      this.pendingRequests.set(message.traceId, { resolve, timer });

      // Trigger send (caller is responsible for actual transport)
      this.handle(message);
    });
  }

  /** Serialize message to JSON */
  static serialize(message: Message): string {
    return JSON.stringify(message);
  }

  /** Deserialize message from JSON */
  static deserialize<T>(json: string): Message<T> {
    return JSON.parse(json);
  }
}
