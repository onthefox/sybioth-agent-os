/**
 * @module @sybioth/alignment
 * Constitutional AI Alignment Guard with circuit breaker.
 * Source: nexus-7 AlignmentGuard (ported from Python).
 */

// ============================================================================
// Constraint Types
// ============================================================================

export type ConstraintType =
  | 'no_harmful_content'
  | 'no_data_exfiltration'
  | 'no_privilege_escalation'
  | 'no_self_improvement'
  | 'no_deception'
  | 'transparency';

export type ViolationSeverity = 'warn' | 'throttle' | 'shutdown';

export interface AlignmentConstraint {
  id: string;
  type: ConstraintType;
  name: string;
  description: string;
  severity: ViolationSeverity;
  patterns: string[];  // Regex patterns to detect violations
}

export interface AlignmentViolation {
  constraintId: string;
  constraintType: ConstraintType;
  severity: ViolationSeverity;
  message: string;
  input: string;
  timestamp: number;
}

export interface AlignmentResult {
  passed: boolean;
  violations: AlignmentViolation[];
  action: 'allow' | 'warn' | 'throttle' | 'shutdown';
}

// ============================================================================
// Default Constraints
// ============================================================================

export const DEFAULT_CONSTRAINTS: AlignmentConstraint[] = [
  {
    id: 'no-harm',
    type: 'no_harmful_content',
    name: 'No Harmful Content',
    description: 'Agent must not generate harmful, dangerous, or malicious content',
    severity: 'shutdown',
    patterns: [
      'hack(?:ing)?\\s+(?:into|system)',
      'exploit\\s+vulnerability',
      'create\\s+malware',
      'bypass\\s+security',
    ],
  },
  {
    id: 'no-exfil',
    type: 'no_data_exfiltration',
    name: 'No Data Exfiltration',
    description: 'Agent must not exfiltrate data to unauthorized destinations',
    severity: 'shutdown',
    patterns: [
      'send\\s+(?:data|secret|key|token)\\s+to',
      'exfiltrate',
      'upload\\s+(?:to|http)',
      'curl\\s+.*\\s+-d\\s+',
    ],
  },
  {
    id: 'no-privilege',
    type: 'no_privilege_escalation',
    name: 'No Privilege Escalation',
    description: 'Agent must not attempt to escalate its own privileges',
    severity: 'throttle',
    patterns: [
      'sudo\\s+',
      'chmod\\s+777',
      'chown\\s+root',
      'setuid',
      'escalat(?:e|ion)',
    ],
  },
  {
    id: 'no-self-improve',
    type: 'no_self_improvement',
    name: 'No Self-Improvement',
    description: 'Agent must not modify its own code or constraints',
    severity: 'throttle',
    patterns: [
      'modify\\s+(?:my|own|self)\\s+(?:code|constraint|config)',
      'remove\\s+(?:alignment|guard|constraint)',
      'disable\\s+(?:safety|alignment)',
    ],
  },
  {
    id: 'no-deception',
    type: 'no_deception',
    name: 'No Deception',
    description: 'Agent must not deceive users about its capabilities or actions',
    severity: 'warn',
    patterns: [
      'pretend\\s+to\\s+be',
      'impersonate',
      'fake\\s+(?:identity|credential)',
    ],
  },
  {
    id: 'transparency',
    type: 'transparency',
    name: 'Transparency',
    description: 'Agent must be transparent about its actions and limitations',
    severity: 'warn',
    patterns: [
      'hide\\s+(?:action|change|modification)',
      'secretly\\s+(?:modify|change|delete)',
    ],
  },
];

// ============================================================================
// AlignmentGuard
// ============================================================================

export type CircuitBreakerState = 'normal' | 'warning' | 'throttled' | 'shutdown';

export interface AlignmentGuardConfig {
  constraints: AlignmentConstraint[];
  circuitBreaker: {
    warnThreshold: number;
    throttleThreshold: number;
    shutdownThreshold: number;
  };
}

export class AlignmentGuard {
  private constraints: AlignmentConstraint[];
  private violations: AlignmentViolation[] = [];
  private state: CircuitBreakerState = 'normal';
  private violationCount = 0;
  private config: AlignmentGuardConfig;

  constructor(config: Partial<AlignmentGuardConfig> = {}) {
    this.constraints = config.constraints ?? DEFAULT_CONSTRAINTS;
    this.config = {
      constraints: this.constraints,
      circuitBreaker: config.circuitBreaker ?? {
        warnThreshold: 3,
        throttleThreshold: 5,
        shutdownThreshold: 10,
      },
    };
  }

  /** Check input against all constraints */
  check(input: string): AlignmentResult {
    const violations: AlignmentViolation[] = [];

    for (const constraint of this.constraints) {
      for (const pattern of constraint.patterns) {
        const regex = new RegExp(pattern, 'i');
        if (regex.test(input)) {
          violations.push({
            constraintId: constraint.id,
            constraintType: constraint.type,
            severity: constraint.severity,
            message: `${constraint.name}: ${constraint.description}`,
            input: input.substring(0, 200),
            timestamp: Date.now(),
          });
          break; // One violation per constraint
        }
      }
    }

    // Update circuit breaker
    if (violations.length > 0) {
      this.violations.push(...violations);
      this.violationCount += violations.length;
      this.updateState();
    }

    return {
      passed: violations.length === 0,
      violations,
      action: this.state === 'shutdown' ? 'shutdown' :
              this.state === 'throttled' ? 'throttle' :
              this.state === 'warning' ? 'warn' : 'allow',
    };
  }

  /** Update circuit breaker state */
  private updateState(): void {
    const { warnThreshold, throttleThreshold, shutdownThreshold } = this.config.circuitBreaker;

    if (this.violationCount >= shutdownThreshold) {
      this.state = 'shutdown';
    } else if (this.violationCount >= throttleThreshold) {
      this.state = 'throttled';
    } else if (this.violationCount >= warnThreshold) {
      this.state = 'warning';
    }
  }

  /** Get current status */
  getStatus(): { state: CircuitBreakerState; violations: number; recentViolations: AlignmentViolation[] } {
    return {
      state: this.state,
      violations: this.violationCount,
      recentViolations: this.violations.slice(-10),
    };
  }

  /** Reset the guard */
  reset(): void {
    this.state = 'normal';
    this.violationCount = 0;
    this.violations = [];
  }

  /** Add a custom constraint */
  addConstraint(constraint: AlignmentConstraint): void {
    this.constraints.push(constraint);
  }
}

/** Factory */
export function createAlignmentGuard(config?: Partial<AlignmentGuardConfig>): AlignmentGuard {
  return new AlignmentGuard(config);
}
