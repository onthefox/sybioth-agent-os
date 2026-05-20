/**
 * @module @sybioth/spawner
 * Smart Agent Auto-Spawner — task complexity analysis, file type detection, dynamic scaling.
 * Source: smart-agent-spawner
 */

// ============================================================================
// Complexity Analysis
// ============================================================================

export type ComplexityLevel = 'simple' | 'moderate' | 'complex' | 'enterprise';

export interface TaskAnalysis {
  level: ComplexityLevel;
  score: number;
  factors: string[];
  recommendedAgents: number;
  topology: 'centralized' | 'mesh' | 'hierarchical';
}

const COMPLEXITY_KEYWORDS: Record<ComplexityLevel, string[]> = {
  simple: ['fix', 'typo', 'rename', 'update', 'change', 'add comment'],
  moderate: ['implement', 'create', 'refactor', 'add feature', 'write test'],
  complex: ['build', 'design', 'architecture', 'migrate', 'optimize', 'integrate'],
  enterprise: ['distributed', 'microservices', 'scalable', 'multi-tenant', 'real-time'],
};

const COMPLEXITY_SCORES: Record<ComplexityLevel, number> = {
  simple: 1,
  moderate: 3,
  complex: 6,
  enterprise: 10,
};

export function analyzeComplexity(description: string): TaskAnalysis {
  const lower = description.toLowerCase();
  const factors: string[] = [];
  let maxLevel: ComplexityLevel = 'simple';

  for (const [level, keywords] of Object.entries(COMPLEXITY_KEYWORDS)) {
    for (const keyword of keywords) {
      if (lower.includes(keyword)) {
        factors.push(keyword);
        if (COMPLEXITY_SCORES[level as ComplexityLevel] > COMPLEXITY_SCORES[maxLevel]) {
          maxLevel = level as ComplexityLevel;
        }
      }
    }
  }

  // Factor multipliers
  const multipliers: string[] = [];
  if (lower.includes('test')) multipliers.push('testing');
  if (lower.includes('security') || lower.includes('auth')) multipliers.push('security');
  if (lower.includes('performance') || lower.includes('optimize')) multipliers.push('performance');

  const baseScore = COMPLEXITY_SCORES[maxLevel];
  const score = baseScore * (1 + multipliers.length * 0.2);

  const agentCounts: Record<ComplexityLevel, number> = {
    simple: 1,
    moderate: 2,
    complex: 4,
    enterprise: 6,
  };

  const topologies: Record<ComplexityLevel, 'centralized' | 'mesh' | 'hierarchical'> = {
    simple: 'centralized',
    moderate: 'centralized',
    complex: 'mesh',
    enterprise: 'hierarchical',
  };

  return {
    level: maxLevel,
    score,
    factors: [...factors, ...multipliers],
    recommendedAgents: agentCounts[maxLevel],
    topology: topologies[maxLevel],
  };
}

// ============================================================================
// File Type Detection
// ============================================================================

export interface FileTypeInfo {
  language: string;
  category: 'frontend' | 'backend' | 'database' | 'devops' | 'test' | 'config' | 'docs';
  agentRole: string;
}

const FILE_EXTENSIONS: Record<string, FileTypeInfo> = {
  '.ts': { language: 'TypeScript', category: 'backend', agentRole: 'backend' },
  '.tsx': { language: 'TypeScript', category: 'frontend', agentRole: 'frontend' },
  '.js': { language: 'JavaScript', category: 'backend', agentRole: 'backend' },
  '.jsx': { language: 'JavaScript', category: 'frontend', agentRole: 'frontend' },
  '.py': { language: 'Python', category: 'backend', agentRole: 'backend' },
  '.go': { language: 'Go', category: 'backend', agentRole: 'backend' },
  '.rs': { language: 'Rust', category: 'backend', agentRole: 'backend' },
  '.lua': { language: 'Lua', category: 'backend', agentRole: 'backend' },
  '.sql': { language: 'SQL', category: 'database', agentRole: 'data' },
  '.yml': { language: 'YAML', category: 'devops', agentRole: 'worker' },
  '.yaml': { language: 'YAML', category: 'devops', agentRole: 'worker' },
  '.json': { language: 'JSON', category: 'config', agentRole: 'worker' },
  '.md': { language: 'Markdown', category: 'docs', agentRole: 'worker' },
  '.css': { language: 'CSS', category: 'frontend', agentRole: 'frontend' },
  '.html': { language: 'HTML', category: 'frontend', agentRole: 'frontend' },
  '.vue': { language: 'Vue', category: 'frontend', agentRole: 'frontend' },
  '.svelte': { language: 'Svelte', category: 'frontend', agentRole: 'frontend' },
};

export function detectFileType(filePath: string): FileTypeInfo {
  const ext = filePath.substring(filePath.lastIndexOf('.')).toLowerCase();
  return FILE_EXTENSIONS[ext] ?? { language: 'Unknown', category: 'backend', agentRole: 'worker' };
}

export function detectMultipleFiles(filePaths: string[]): { types: FileTypeInfo[]; needsCoordinator: boolean } {
  const types = filePaths.map(detectFileType);
  const categories = new Set(types.map((t) => t.category));
  return {
    types,
    needsCoordinator: categories.size > 1,
  };
}

// ============================================================================
// Scaling Decision
// ============================================================================

export interface SwarmMetrics {
  queueLength: number;
  utilization: number;     // 0-1
  avgTaskTime: number;     // ms
  errorRate: number;       // 0-1
  activeAgents: number;
}

export type ScalingDecision = 'scale-up' | 'scale-down' | 'maintain';

export function getScalingDecision(metrics: SwarmMetrics): ScalingDecision {
  // Scale up if: high utilization, long queue, or high task time
  if (metrics.utilization > 0.8 || metrics.queueLength > 5 || metrics.avgTaskTime > 30000) {
    return 'scale-up';
  }
  // Scale down if: low utilization, empty queue, and many active agents
  if (metrics.utilization < 0.3 && metrics.queueLength === 0 && metrics.activeAgents > 2) {
    return 'scale-down';
  }
  return 'maintain';
}

// ============================================================================
// SmartAutoSpawner
// ============================================================================

export interface SpawnResult {
  taskAnalysis: TaskAnalysis;
  agentsSpawned: string[];
  topology: string;
}

export class SmartAutoSpawner {
  /** Analyze a task and recommend spawning strategy */
  analyzeTask(description: string, filePaths?: string[]): TaskAnalysis {
    const analysis = analyzeComplexity(description);

    if (filePaths && filePaths.length > 0) {
      const { needsCoordinator } = detectMultipleFiles(filePaths);
      if (needsCoordinator) {
        analysis.recommendedAgents += 1;
        analysis.factors.push('multi-file-type');
      }
    }

    return analysis;
  }

  /** Auto-spawn agents for a task */
  async autoSpawn(description: string, filePaths?: string[]): Promise<SpawnResult> {
    const taskAnalysis = this.analyzeTask(description, filePaths);
    return {
      taskAnalysis,
      agentsSpawned: [], // Actual spawning delegated to AgentRegistry
      topology: taskAnalysis.topology,
    };
  }
}

/** Factory */
export function createSmartAutoSpawner(): SmartAutoSpawner {
  return new SmartAutoSpawner();
}
