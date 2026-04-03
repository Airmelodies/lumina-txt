/**
 * Skill definition type and parser for Lumina TXT.
 * Skills are AI capabilities loaded from .md files with YAML frontmatter.
 *
 * Skill.md format:
 * ---
 * name: Code Reviewer
 * description: Reviews code for bugs and best practices
 * version: 1.0
 * inputFormat: code snippets
 * outputFormat: markdown list
 * ---
 *
 * # System Prompt
 * You are an expert code reviewer...
 *
 * # Instructions
 * 1. Analyze the code structure
 * 2. Check for bugs
 * 3. Suggest improvements
 */

// ─── Skill Interface ─────────────────────────────────────────

export interface Skill {
  id: string;
  name: string;
  description: string;
  version: string;
  systemPrompt: string;
  instructions: string;
  inputFormat: string;
  outputFormat: string;
  sourceFile: string;
  updatedAt: string;
}

// ─── Frontmatter Type ────────────────────────────────────────

interface SkillFrontmatter {
  name?: string;
  description?: string;
  version?: string;
  inputFormat?: string;
  outputFormat?: string;
}

// ─── Parse YAML Frontmatter ──────────────────────────────────

/**
 * Simple YAML frontmatter parser (no external deps).
 * Handles: key: value, key: "value with spaces"
 */
function parseFrontmatter(raw: string): SkillFrontmatter {
  const result: SkillFrontmatter = {};

  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const colonIdx = trimmed.indexOf(':');
    if (colonIdx === -1) continue;

    const key = trimmed.slice(0, colonIdx).trim().toLowerCase();
    let value = trimmed.slice(colonIdx + 1).trim();

    // Strip quotes
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    if (key === 'name') result.name = value;
    else if (key === 'description') result.description = value;
    else if (key === 'version') result.version = value;
    else if (key === 'inputformat') result.inputFormat = value;
    else if (key === 'outputformat') result.outputFormat = value;
  }

  return result;
}

// ─── Parse Markdown Sections ─────────────────────────────────

/**
 * Extract named sections from markdown content.
 * Supports `# Section Name` and `## Section Name` headers.
 * Returns a map of lowercase section name → content.
 */
function parseSections(markdown: string): Record<string, string> {
  const sections: Record<string, string> = {};

  const lines = markdown.split('\n');
  let currentSection = '_preamble';
  const sectionLines: string[] = [];

  for (const line of lines) {
    const headingMatch = line.match(/^#{1,3}\s+(.+)/);
    if (headingMatch) {
      // Save previous section
      if (sectionLines.length > 0) {
        sections[currentSection] = sectionLines.join('\n').trim();
      }
      currentSection = headingMatch[1].trim().toLowerCase();
      sectionLines.length = 0;
    } else {
      sectionLines.push(line);
    }
  }

  // Save last section
  if (sectionLines.length > 0) {
    sections[currentSection] = sectionLines.join('\n').trim();
  }

  return sections;
}

// ─── Main Skill Parser ───────────────────────────────────────

/**
 * Parse a .md skill file into a Skill object.
 *
 * @param content - Raw markdown content of the .md file
 * @param sourceFile - Original filename (for provenance)
 * @returns Parsed Skill, or null if invalid
 */
export function parseSkillMd(content: string, sourceFile: string = 'custom'): Skill | null {
  if (!content || content.trim().length === 0) return null;

  // Extract frontmatter between --- delimiters
  let frontmatterRaw = '';
  let markdownBody = content;

  const fmMatch = content.match(/^---\s*\n([\s\S]*?)\n---\s*\n?([\s\S]*)$/);
  if (fmMatch) {
    frontmatterRaw = fmMatch[1];
    markdownBody = fmMatch[2];
  }

  const frontmatter = parseFrontmatter(frontmatterRaw);
  const sections = parseSections(markdownBody);

  // Name is required — fall back to filename or section header
  const name = frontmatter.name
    || sections['system prompt'] ? 'Untitled Skill' : null
    || sourceFile.replace(/\.md$/i, '');

  if (!name) return null;

  // Extract system prompt from "System Prompt" section or preamble
  const systemPrompt = sections['system prompt']
    || sections['system']
    || sections['_preamble']
    || '';

  // Extract instructions from "Instructions" section
  const instructions = sections['instructions']
    || sections['steps']
    || '';

  return {
    id: crypto.randomUUID(),
    name,
    description: frontmatter.description || 'No description provided',
    version: frontmatter.version || '1.0',
    systemPrompt,
    instructions,
    inputFormat: frontmatter.inputFormat || '',
    outputFormat: frontmatter.outputFormat || '',
    sourceFile,
    updatedAt: new Date().toISOString(),
  };
}

// ─── Build System Prompt ─────────────────────────────────────

/**
 * Build a system prompt from a skill definition.
 * Combines systemPrompt + instructions + input/output format hints.
 */
export function buildSkillSystemPrompt(skill: Skill): string {
  const parts: string[] = [];

  if (skill.systemPrompt.trim()) {
    parts.push(skill.systemPrompt.trim());
  }

  if (skill.instructions.trim()) {
    parts.push(`Instructions:\n${skill.instructions.trim()}`);
  }

  if (skill.inputFormat) {
    parts.push(`Expected input format: ${skill.inputFormat}`);
  }

  if (skill.outputFormat) {
    parts.push(`Expected output format: ${skill.outputFormat}`);
  }

  return parts.join('\n\n');
}

// ─── Validate Skill Markdown ─────────────────────────────────

/**
 * Quick validation of skill .md content.
 * Returns { valid: true } or { valid: false, reason: string }.
 */
export function validateSkillMd(content: string): { valid: boolean; reason?: string } {
  if (!content || content.trim().length < 20) {
    return { valid: false, reason: 'File is too short or empty' };
  }

  // Check for frontmatter
  if (!content.startsWith('---')) {
    return { valid: false, reason: 'Missing YAML frontmatter (must start with ---)' };
  }

  const fmEnd = content.indexOf('---', 3);
  if (fmEnd === -1) {
    return { valid: false, reason: 'Missing closing --- in frontmatter' };
  }

  const frontmatter = content.slice(3, fmEnd).trim();
  if (!frontmatter.includes('name:')) {
    return { valid: false, reason: 'Frontmatter must include "name:" field' };
  }

  // Check for at least one section
  const body = content.slice(fmEnd + 3).trim();
  if (!body.includes('#')) {
    return { valid: false, reason: 'No markdown sections found (need at least # System Prompt)' };
  }

  return { valid: true };
}

// ─── Create Default Skill Template ───────────────────────────

/**
 * Generate a blank skill .md template for the user.
 */
export function createSkillTemplate(name: string): string {
  return `---
name: ${name}
description: Describe what this skill does
version: 1.0
inputFormat: text content from the active file
outputFormat: markdown formatted response
---

# System Prompt
You are a helpful AI assistant specialized in ${name}.

# Instructions
1. Read and analyze the provided content carefully
2. Apply your expertise to the task
3. Provide clear, actionable results

`;
}
