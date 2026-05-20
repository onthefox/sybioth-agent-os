# Changelog

All notable changes to Sybioth Agent OS will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-05-20

### Added

#### Foundation (Phase 1)
- `@sybioth/errors` — Result monad, SybiothError, error classification, retry logic
- `@sybioth/config` — YAML config loader with zod validation and env resolution
- `@sybioth/logger` — Structured logging with pino
- `@sybioth/types` — Canonical types: System, EventType, AgentRole, HookPhase, HostAdapter
- `@sybioth/utils` — generateId, cosineSimilarity, retry, debounce, throttle, deepMerge
- `@sybioth/cli` — Single `sybioth` binary with 13 subcommands

#### Infrastructure (Phase 2)
- `@sybioth/event-bus` — CRDT EventBus with mitt, vector clocks, priority ordering, remote merge
- `@sybioth/memory` — 3-tier memory (working → episodic → semantic) with auto-consolidation
- `@sybioth/entropy` — Shannon entropy engine, cross-entropy, mutual information, entropy router
- `@sybioth/protocol` — Agent message protocol, capability negotiation, request/response

#### Services (Phase 3)
- `@sybioth/hooks` — Hook manager with 13 lifecycle phases
- `@sybioth/healing` — Self-healing with 6 recovery strategies and circuit breaker
- `@sybioth/skills` — Skills loader, executor, and registry (YAML/MD with frontmatter)
- `@sybioth/agents` — Agent registry, runner, and 14 built-in agent definitions
- `@sybioth/spawner` — Task complexity analysis, file type detection, dynamic scaling
- `@sybioth/monitoring` — Performance profiler and bottleneck detector
- `@sybioth/efficiency` — Token budget, context pruning, latency SLA monitoring

#### Security (Phase 4)
- `@sybioth/alignment` — Constitutional AI guard with 6 constraints and circuit breaker
- `@sybioth/security` — Gauntlet engine (23 attack types), CTF engine (stubs)
- `@sybioth/ledger` — DIDs, reputation tokens, SHA-256 immutable audit chain

#### Runtime (Phase 5)
- `@sybioth/runtime` — SybiothRuntime DI container wiring all 18 services
