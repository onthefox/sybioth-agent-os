/**
 * @module @sybioth/ledger
 * Decentralized Identifiers, Reputation Tokens, SHA-256 Audit Chain.
 * Source: nexus-7 NexusLedger (ported from Python).
 */

import { createHash, randomBytes } from 'node:crypto';

// ============================================================================
// Decentralized Identifier (DID)
// ============================================================================

export interface DID {
  id: string;           // did:nexus7:{agentId[:8]}-{publicKey[:8]}
  agentId: string;
  publicKey: string;
  privateKey: string;
  createdAt: number;
}

export function createDID(agentId: string): DID {
  const privateKey = randomBytes(32).toString('hex');
  const publicKey = createHash('sha256').update(privateKey).digest('hex');
  const id = `did:nexus7:${agentId.slice(0, 8)}-${publicKey.slice(0, 8)}`;

  return { id, agentId, publicKey, privateKey, createdAt: Date.now() };
}

// ============================================================================
// Reputation Token
// ============================================================================

export interface ReputationToken {
  agentId: string;
  score: number;
  mintedAt: number;
  reason: string;
}

// ============================================================================
// Audit Log Entry
// ============================================================================

export interface AuditEntry {
  id: string;
  agentId: string;
  action: string;
  details: Record<string, unknown>;
  timestamp: number;
  hash: string;
  previousHash: string;
}

// ============================================================================
// NexusLedger
// ============================================================================

export class NexusLedger {
  private dids: Map<string, DID> = new Map();
  private reputationTokens: ReputationToken[] = [];
  private auditChain: AuditEntry[] = [];
  private chainHead: string = '0'.repeat(64); // Genesis block

  /** Create a DID for an agent */
  registerAgent(agentId: string): DID {
    const did = createDID(agentId);
    this.dids.set(agentId, did);
    this.addAuditEntry(agentId, 'agent-registered', { didId: did.id });
    return did;
  }

  /** Get DID for an agent */
  getDID(agentId: string): DID | undefined {
    return this.dids.get(agentId);
  }

  /** Mint a reputation token */
  mintReputation(agentId: string, score: number, reason: string): ReputationToken {
    const token: ReputationToken = {
      agentId,
      score,
      mintedAt: Date.now(),
      reason,
    };
    this.reputationTokens.push(token);
    this.addAuditEntry(agentId, 'reputation-minted', { score, reason });
    return token;
  }

  /** Get reputation for an agent */
  getReputation(agentId: string): { total: number; tokens: ReputationToken[] } {
    const tokens = this.reputationTokens.filter((t) => t.agentId === agentId);
    return {
      total: tokens.reduce((sum, t) => sum + t.score, 0),
      tokens,
    };
  }

  /** Add an audit entry to the chain */
  addAuditEntry(agentId: string, action: string, details: Record<string, unknown> = {}): AuditEntry {
    const id = randomBytes(16).toString('hex');
    const timestamp = Date.now();
    const payload = JSON.stringify({ id, agentId, action, details, timestamp, previousHash: this.chainHead });
    const hash = createHash('sha256').update(payload).digest('hex');

    const entry: AuditEntry = { id, agentId, action, details, timestamp, hash, previousHash: this.chainHead };
    this.auditChain.push(entry);
    this.chainHead = hash;

    return entry;
  }

  /** Verify chain integrity */
  verifyChain(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    let previousHash = '0'.repeat(64);

    for (const entry of this.auditChain) {
      if (entry.previousHash !== previousHash) {
        errors.push(`Chain break at entry ${entry.id}: expected previousHash ${previousHash}, got ${entry.previousHash}`);
      }
      const payload = JSON.stringify({
        id: entry.id,
        agentId: entry.agentId,
        action: entry.action,
        details: entry.details,
        timestamp: entry.timestamp,
        previousHash: entry.previousHash,
      });
      const expectedHash = createHash('sha256').update(payload).digest('hex');
      if (entry.hash !== expectedHash) {
        errors.push(`Hash mismatch at entry ${entry.id}`);
      }
      previousHash = entry.hash;
    }

    return { valid: errors.length === 0, errors };
  }

  /** Get audit log */
  getAuditLog(options?: { agentId?: string; action?: string; limit?: number }): AuditEntry[] {
    let entries = [...this.auditChain];
    if (options?.agentId) entries = entries.filter((e) => e.agentId === options.agentId);
    if (options?.action) entries = entries.filter((e) => e.action === options.action);
    return entries.slice(-(options?.limit ?? 100));
  }

  /** Get ledger stats */
  stats(): { agents: number; auditEntries: number; reputationTokens: number; chainValid: boolean } {
    return {
      agents: this.dids.size,
      auditEntries: this.auditChain.length,
      reputationTokens: this.reputationTokens.length,
      chainValid: this.verifyChain().valid,
    };
  }
}

/** Factory */
export function createNexusLedger(): NexusLedger {
  return new NexusLedger();
}
