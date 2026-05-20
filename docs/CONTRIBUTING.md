# Contributing to Sybioth Agent OS

Thanks for your interest in contributing! This guide will help you get started.

---

## Prerequisites

- [Node.js](https://nodejs.org/) 22+
- [Bun](https://bun.sh/) 1.1+
- [Git](https://git-scm.com/)

## Setup

```bash
git clone https://github.com/onthefox/sybioth-agent-os.git
cd sybioth-agent-os
bun install
npx turbo build
```

## Project Structure

```
sybioth/
├── packages/           # 21 packages (see docs/PACKAGES.md)
│   ├── errors/         # Foundation: Result<T,E>, error types
│   ├── config/         # YAML + zod config loader
│   ├── logger/         # pino structured logger
│   ├── types/          # Canonical type definitions
│   ├── utils/          # Shared utilities
│   ├── event-bus/      # CRDT EventBus
│   ├── memory/         # 3-tier memory service
│   ├── entropy/        # Shannon entropy engine
│   ├── protocol/       # Agent message protocol
│   ├── hooks/          # Hook manager
│   ├── healing/        # Self-healing system
│   ├── skills/         # Skills engine
│   ├── agents/         # Agent registry
│   ├── spawner/        # Smart agent spawner
│   ├── monitoring/     # Performance profiler
│   ├── efficiency/     # Token/latency optimization
│   ├── alignment/      # Constitutional AI guard
│   ├── security/       # Gauntlet/CTF engine
│   ├── ledger/         # DIDs/audit chain
│   └── runtime/        # SybiothRuntime (wires everything)
├── cli/                # Single `sybioth` binary
├── skills/             # Built-in skill files
├── agents/             # Built-in agent definitions
└── docs/               # Documentation
```

## Development Workflow

### 1. Create a Branch

```bash
git checkout -b feature/my-feature
```

### 2. Make Changes

Edit the relevant package(s). Each package is independent:

```bash
# Work on a specific package
cd packages/event-bus
# Edit src/index.ts
```

### 3. Build and Test

```bash
# Build all packages
npx turbo build

# Build specific package
npx turbo build --filter=@sybioth/event-bus

# Type check all
npx turbo typecheck

# Clean and rebuild
npx turbo clean && npx turbo build --force
```

### 4. Commit

```bash
git add -A
git commit -m "feat: add my feature"
```

**Commit message format:**
- `feat:` — new feature
- `fix:` — bug fix
- `docs:` — documentation
- `refactor:` — code refactor
- `test:` — adding tests
- `chore:` — maintenance

### 5. Push and PR

```bash
git push origin feature/my-feature
gh pr create --title "feat: my feature" --body "Description"
```

---

## Adding a New Package

1. Create the directory:
   ```bash
   mkdir -p packages/my-package/src
   ```

2. Create `packages/my-package/package.json`:
   ```json
   {
     "name": "@sybioth/my-package",
     "version": "1.0.0",
     "type": "module",
     "main": "./dist/index.js",
     "types": "./dist/index.d.ts",
     "exports": { ".": { "import": "./dist/index.js", "types": "./dist/index.d.ts" } },
     "scripts": { "build": "tsc --build", "typecheck": "tsc --noEmit", "clean": "rm -rf dist" },
     "dependencies": {},
     "devDependencies": { "typescript": "^5.7.0", "@types/node": "^22.0.0" },
     "license": "MIT"
   }
   ```

3. Create `packages/my-package/tsconfig.json`:
   ```json
   {
     "extends": "../../tsconfig.json",
     "compilerOptions": { "outDir": "./dist", "rootDir": "./src" },
     "include": ["src/**/*.ts"]
   }
   ```

4. Write your code in `packages/my-package/src/index.ts`

5. Add to runtime dependencies if needed:
   ```bash
   # Edit packages/runtime/package.json to add:
   "@sybioth/my-package": "workspace:*"
   ```

6. Build:
   ```bash
   npx turbo build --filter=@sybioth/my-package
   ```

---

## Adding a New Skill

Skills are Markdown files with YAML frontmatter:

```yaml
---
name: my-skill
description: What this skill does
version: "1.0"
category: development
tags: [tag1, tag2]
---

# My Skill

Instructions go here.

## Steps

1. Do this
2. Do that
```

Place in `skills/` directory. The SkillsEngine will auto-load it.

---

## Adding a New Agent

Add to `packages/agents/src/index.ts` in the `BUILTIN_AGENTS` array:

```typescript
{
  name: 'my-agent',
  type: 'specialist',
  role: 'worker',
  description: 'What this agent does',
  capabilities: ['capability-1', 'capability-2'],
}
```

---

## Code Style

- **TypeScript** with strict mode
- **ESM** modules (`"type": "module"`)
- **No arrow functions** for top-level exports (use `function` keyword)
- **Explicit return types** on exported functions
- **Result<T,E>** for error propagation (no thrown exceptions in hot paths)
- **Factory functions** — `createXxx()` for all constructors
- **Workspace dependencies** — `"workspace:*"` for internal deps

---

## Testing

```bash
# Run all tests (when test suites are added)
npx turbo test

# Run specific package tests
npx turbo test --filter=@sybioth/errors
```

---

## Questions?

Open an issue at [github.com/onthefox/sybioth-agent-os/issues](https://github.com/onthefox/sybioth-agent-os/issues).
