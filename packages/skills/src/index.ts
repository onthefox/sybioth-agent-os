/**
 * @module @sybioth/skills
 * Skills Engine — loader, executor, and registry for YAML/MD skills.
 * Source: sybioth/skills-engine + multi-directory scanning.
 */

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, extname } from 'node:path';
import YAML from 'yaml';

// ============================================================================
// Skill Definition
// ============================================================================

export interface Skill {
  name: string;
  description: string;
  version?: string;
  category?: string;
  content: string;
  metadata: Record<string, unknown>;
  filePath?: string;
}

export interface SkillResult {
  success: boolean;
  output: string;
  error?: string;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// SkillsLoader — loads skills from directories
// ============================================================================

export class SkillsLoader {
  /** Load skills from a directory */
  loadDirectory(dirPath: string): Skill[] {
    if (!existsSync(dirPath)) return [];

    const skills: Skill[] = [];
    const entries = readdirSync(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(dirPath, entry.name);

      if (entry.isDirectory()) {
        // Check for SKILL.md in subdirectory
        const skillMdPath = join(fullPath, 'SKILL.md');
        if (existsSync(skillMdPath)) {
          const skill = this.loadFile(skillMdPath);
          if (skill) skills.push(skill);
        }
        // Recurse into subdirectories
        skills.push(...this.loadDirectory(fullPath));
      } else if (entry.isFile()) {
        const ext = extname(entry.name).toLowerCase();
        if (ext === '.md' || ext === '.yaml' || ext === '.yml') {
          const skill = this.loadFile(fullPath);
          if (skill) skills.push(skill);
        }
      }
    }

    return skills;
  }

  /** Load skills from multiple directories */
  loadFromDirectories(directories: string[]): Skill[] {
    const allSkills: Skill[] = [];
    for (const dir of directories) {
      allSkills.push(...this.loadDirectory(dir));
    }
    return allSkills;
  }

  /** Load a single skill file */
  loadFile(filePath: string): Skill | null {
    try {
      const content = readFileSync(filePath, 'utf-8');
      const ext = extname(filePath).toLowerCase();

      if (ext === '.yaml' || ext === '.yml') {
        return this.parseYaml(content, filePath);
      }

      return this.parseMarkdown(content, filePath);
    } catch {
      return null;
    }
  }

  /** Parse YAML frontmatter in Markdown */
  private parseMarkdown(content: string, filePath: string): Skill {
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);

    if (frontmatterMatch) {
      const metadata = YAML.parse(frontmatterMatch[1]) ?? {};
      const body = frontmatterMatch[2].trim();

      return {
        name: metadata.name ?? filePath.split(/[/\\]/).pop()?.replace(/\.\w+$/, '') ?? 'unknown',
        description: metadata.description ?? '',
        version: metadata.version,
        category: metadata.category,
        content: body,
        metadata,
        filePath,
      };
    }

    // No frontmatter — use first line as name
    const lines = content.split('\n');
    const name = lines[0]?.replace(/^#+\s*/, '').trim() || 'unknown';

    return {
      name,
      description: '',
      content: content.trim(),
      metadata: {},
      filePath,
    };
  }

  /** Parse pure YAML skill */
  private parseYaml(content: string, filePath: string): Skill {
    const data = YAML.parse(content) ?? {};

    return {
      name: data.name ?? filePath.split(/[/\\]/).pop()?.replace(/\.\w+$/, '') ?? 'unknown',
      description: data.description ?? '',
      version: data.version,
      category: data.category,
      content: data.content ?? data.instructions ?? '',
      metadata: data,
      filePath,
    };
  }
}

// ============================================================================
// SkillsExecutor — processes skill templates
// ============================================================================

export class SkillsExecutor {
  /** Execute a skill with variable substitution */
  execute(skill: Skill, variables: Record<string, string> = {}): SkillResult {
    try {
      let output = skill.content;

      // Replace {{variable}} placeholders
      for (const [key, value] of Object.entries(variables)) {
        output = output.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
      }

      // Replace {userInput} and {skillName}
      output = output.replace(/\{userInput\}/g, variables.userInput ?? '');
      output = output.replace(/\{skillName\}/g, skill.name);

      return { success: true, output, metadata: { skill: skill.name } };
    } catch (error) {
      return {
        success: false,
        output: '',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}

// ============================================================================
// SkillsRegistry — in-memory skill storage
// ============================================================================

export class SkillsRegistry {
  private skills: Map<string, Skill> = new Map();

  /** Register a skill */
  register(skill: Skill): void {
    this.skills.set(skill.name, skill);
  }

  /** Register multiple skills */
  registerAll(skills: Skill[]): void {
    for (const skill of skills) {
      this.register(skill);
    }
  }

  /** Get a skill by name */
  get(name: string): Skill | undefined {
    return this.skills.get(name);
  }

  /** Check if a skill exists */
  has(name: string): boolean {
    return this.skills.has(name);
  }

  /** List all skills */
  list(): Skill[] {
    return Array.from(this.skills.values());
  }

  /** List skills by category */
  listByCategory(category: string): Skill[] {
    return this.list().filter((s) => s.category === category);
  }

  /** Search skills by keyword */
  search(query: string): Skill[] {
    const lowerQuery = query.toLowerCase();
    return this.list().filter((s) =>
      s.name.toLowerCase().includes(lowerQuery) ||
      s.description.toLowerCase().includes(lowerQuery) ||
      s.content.toLowerCase().includes(lowerQuery)
    );
  }

  /** Get count */
  size(): number {
    return this.skills.size;
  }

  /** Clear all skills */
  clear(): void {
    this.skills.clear();
  }
}

// ============================================================================
// SkillsEngine — combines loader, executor, registry
// ============================================================================

export class SkillsEngine {
  readonly loader: SkillsLoader;
  readonly executor: SkillsExecutor;
  readonly registry: SkillsRegistry;

  constructor() {
    this.loader = new SkillsLoader();
    this.executor = new SkillsExecutor();
    this.registry = new SkillsRegistry();
  }

  /** Load and register skills from directories */
  loadFromDirectories(directories: string[]): number {
    const skills = this.loader.loadFromDirectories(directories);
    this.registry.registerAll(skills);
    return skills.length;
  }

  /** Execute a skill by name */
  execute(name: string, variables: Record<string, string> = {}): SkillResult {
    const skill = this.registry.get(name);
    if (!skill) {
      return { success: false, output: '', error: `Skill not found: ${name}` };
    }
    return this.executor.execute(skill, variables);
  }
}

/** Factory */
export function createSkillsEngine(): SkillsEngine {
  return new SkillsEngine();
}
