# @sybioth/errors

Result monad and typed error handling for the Sybioth stack.

## Install

```bash
npm install @sybioth/errors
```

## Usage

```typescript
import { ok, err, isOk, unwrap, SybiothError, ErrorCode, withRetry } from '@sybioth/errors';

// Result monad
const result = ok(42);
if (isOk(result)) console.log(result.data); // 42

// Typed errors
throw new SybiothError({
  code: ErrorCode.TIMEOUT,
  message: 'Request timed out',
  context: { url: '/api/data' },
});

// Retry with backoff
const data = await withRetry(() => fetch(url), { maxRetries: 3 });
```

## API

| Export | Description |
|--------|-------------|
| `Result<T, E>` | Discriminated union for error handling |
| `ok(data)` / `err(error)` | Create Result values |
| `isOk()` / `isErr()` | Type guards |
| `unwrap()` / `unwrapOr()` | Extract values |
| `mapResult()` / `flatMap()` | Chain operations |
| `SybiothError` | Typed error class |
| `ErrorCode` | 20 error codes |
| `classifyError()` | Convert unknown to SybiothError |
| `withRetry()` | Execute with exponential backoff |

## Error Codes

| Code | Retryable | Severity |
|------|-----------|----------|
| `TIMEOUT` | yes | medium |
| `RATE_LIMIT` | yes | medium |
| `NETWORK_ERROR` | yes | medium |
| `AUTH_ERROR` | no | high |
| `ALIGNMENT_VIOLATION` | no | critical |
| `CIRCUIT_BREAKER_OPEN` | no | high |
