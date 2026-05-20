# @sybioth/healing

Self-healing system with error classification, 6 recovery strategies, and circuit breaker.

## Install

```bash
npm install @sybioth/healing
```

## Usage

```typescript
import { createSelfHealing, CircuitBreaker } from '@sybioth/healing';

// Self-healing
const healing = createSelfHealing();
const result = await healing.recover(new Error('Connection timed out'));
console.log(result.action);    // 'increase_timeout'
console.log(result.recovered); // true

// Circuit breaker
const breaker = new CircuitBreaker({ failureThreshold: 5 });
if (breaker.canExecute()) {
  try {
    await riskyOperation();
    breaker.recordSuccess();
  } catch (e) {
    breaker.recordFailure();
  }
}
```

## Recovery Strategies

| Error Code | Strategy | Action |
|------------|----------|--------|
| `TIMEOUT` | increase_timeout | Increase timeout, retry |
| `RATE_LIMIT` | switch_key | Switch API key, wait 60s |
| `AUTH_ERROR` | refresh_auth | Refresh auth token |
| `NETWORK_ERROR` | retry_with_backoff | Exponential backoff, max 3 retries |
| `PARSE_ERROR` | retry_with_fallback | Try fallback parser |
| `AGENT_CRASHED` | restart | Restart the agent |

## Circuit Breaker States

```
closed (normal) → open (blocked) → half-open (testing)
     ↑                                  │
     └────────── success ───────────────┘
```
