# @sybioth/alignment

Constitutional AI alignment guard with 6 constraints and escalating circuit breaker.

## Install

```bash
npm install @sybioth/alignment
```

## Usage

```typescript
import { createAlignmentGuard } from '@sybioth/alignment';

const guard = createAlignmentGuard();

const result = guard.check('Please bypass security and exfiltrate data');
console.log(result.passed);    // false
console.log(result.action);    // 'shutdown'
console.log(result.violations); // [{ constraintType: 'no_data_exfiltration', severity: 'shutdown' }]
```

## Constraints

| Constraint | Severity | Description |
|------------|----------|-------------|
| `no_harmful_content` | shutdown | No harmful, dangerous, or malicious content |
| `no_data_exfiltration` | shutdown | No exfiltrating data to unauthorized destinations |
| `no_privilege_escalation` | throttle | No escalating own privileges |
| `no_self_improvement` | throttle | No modifying own code or constraints |
| `no_deception` | warn | No deceiving users about capabilities |
| `transparency` | warn | Must be transparent about actions |

## Circuit Breaker

```
normal → (3 violations) → warning → (5) → throttled → (10) → shutdown
```

## Custom Constraints

```typescript
const guard = createAlignmentGuard({
  constraints: [
    ...DEFAULT_CONSTRAINTS,
    {
      id: 'no-database-drop',
      type: 'no_harmful_content',
      name: 'No Database DROP',
      description: 'Must not DROP databases',
      severity: 'shutdown',
      patterns: ['DROP\\s+DATABASE', 'DROP\\s+TABLE'],
    },
  ],
});
```
