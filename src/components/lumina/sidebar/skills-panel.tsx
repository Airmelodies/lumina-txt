'use client';

import { useRef, useCallback } from 'react';
import { Plus, Trash2, FileText, Info, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { useLuminaStore } from '@/store/use-lumina-store';
import { parseSkillMd, validateSkillMd, createSkillTemplate } from '@/lib/skill-parser';
import type { Skill } from '@/lib/skill-parser';
import { saveSkill, deleteSkill as deleteSkillFromDB } from '@/lib/indexeddb';

// ─── Skills Panel Component ──────────────────────────────────

export function SkillsPanel() {
  const skills = useLuminaStore((s) => s.skills);
  const addSkill = useLuminaStore((s) => s.addSkill);
  const removeSkill = useLuminaStore((s) => s.removeSkill);
  const setActiveSkill = useLuminaStore((s) => s.setActiveSkill);
  const setAIMode = useLuminaStore((s) => s.setAIMode);
  const toggleAIPanel = useLuminaStore((s) => s.toggleAIPanel);
  const aiPanelOpen = useLuminaStore((s) => s.aiPanelOpen);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Import Skill File Handler ──
  const handleImportSkill = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selected = e.target.files;
      if (!selected || selected.length === 0) return;

      const promises = Array.from(selected).map(
        (file) =>
          new Promise<void>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => {
              const content = reader.result as string;

              // Validate first
              const validation = validateSkillMd(content);
              if (!validation.valid) {
                toast.error(`Invalid skill file: ${file.name}`, {
                  description: validation.reason,
                });
                resolve();
                return;
              }

              // Parse the skill
              const skill = parseSkillMd(content, file.name);
              if (!skill) {
                toast.error(`Failed to parse: ${file.name}`);
                resolve();
                return;
              }

              // Save to IndexedDB + store
              saveSkill(skill)
                .then(() => {
                  addSkill(skill);
                  toast.success(`Skill loaded: ${skill.name}`, {
                    description: skill.description,
                  });
                })
                .catch(() => {
                  toast.error('Failed to save skill to storage');
                });

              resolve();
            };
            reader.onerror = () => resolve();
            reader.readAsText(file);
          })
      );

      Promise.all(promises).then(() => {
        // Reset input so the same file can be re-selected
        e.target.value = '';
      });
    },
    [addSkill]
  );

  // ── Delete Skill Handler ──
  const handleDeleteSkill = useCallback(
    async (skill: Skill) => {
      try {
        await deleteSkillFromDB(skill.id);
        removeSkill(skill.id);
        toast.success(`Removed skill: ${skill.name}`);
      } catch {
        toast.error('Failed to remove skill');
      }
    },
    [removeSkill]
  );

  // ── Use Skill Handler — switch to AI panel in skill mode ──
  const handleUseSkill = useCallback(
    (skill: Skill) => {
      setActiveSkill(skill.id);
      setAIMode('skill');
      if (!aiPanelOpen) {
        toggleAIPanel();
      }
      toast.success(`Skill active: ${skill.name}`);
    },
    [setActiveSkill, setAIMode, toggleAIPanel, aiPanelOpen]
  );

  // ── Create Blank Skill Template ──
  const handleCreateTemplate = useCallback(() => {
    const name = `Custom Skill ${skills.length + 1}`;
    const template = createSkillTemplate(name);
    const blob = new Blob([template], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${name.replace(/\s+/g, '-').toLowerCase()}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Template downloaded', {
      description: 'Fill it out and import it back',
    });
  }, [skills.length]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* ── Skills Header ── */}
      <div className="px-3 pt-3 pb-2">
        <span className="terminal-label">AI Skills</span>
        <div className="mt-2 space-y-1.5">
          {/* Import skill button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className={[
              'w-full text-left px-3 py-1.5 rounded-[2px]',
              'font-mono text-[10px] tracking-[0.04em]',
              'border border-solid border-border-base',
              'text-text-dim hover:text-text-mid hover:border-border-lit',
              'transition-colors duration-100 cursor-pointer',
              'flex items-center gap-2',
            ].join(' ')}
          >
            <Plus size={10} className="shrink-0 text-text-dim" />
            Import skill (.md)
          </button>

          {/* Create template button */}
          <button
            onClick={handleCreateTemplate}
            className={[
              'w-full text-left px-3 py-1.5 rounded-[2px]',
              'font-mono text-[10px] tracking-[0.04em]',
              'border border-dashed border-border-base',
              'text-text-dim hover:text-text-mid hover:border-border-lit',
              'transition-colors duration-100 cursor-pointer',
              'flex items-center gap-2',
            ].join(' ')}
          >
            <FileText size={10} className="shrink-0 text-text-dim" />
            Download template
          </button>
        </div>
      </div>

      {/* ── Skill Info ── */}
      <div className="px-3 pb-2">
        <div className="flex items-start gap-1.5 px-2 py-1.5 bg-surface-surface border border-border-dim rounded-[2px]">
          <Info size={9} className="text-text-mute shrink-0 mt-0.5" />
          <span className="font-mono text-[9px] text-text-mute leading-[1.5]">
            Skills are .md files with YAML frontmatter. Import them or create from the template above.
          </span>
        </div>
      </div>

      {/* ── Skills List ── */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="px-3 pt-1 pb-1">
          <span className="terminal-label">
            Loaded ({skills.length})
          </span>
        </div>
        <div className="px-1">
          {skills.length === 0 && (
            <div className="px-2 py-6 text-center">
              <div className="flex flex-col items-center gap-2">
                <Zap size={16} className="text-text-mute" />
                <span className="font-mono text-[9px] text-text-mute">
                  No skills loaded yet
                </span>
              </div>
            </div>
          )}
          {skills.map((skill) => (
            <div
              key={skill.id}
              className="group flex items-start gap-1.5 px-2 py-2 rounded-[2px] hover:bg-surface-hover transition-colors duration-100"
            >
              {/* Skill info */}
              <div className="flex-1 min-w-0">
                <div className="font-mono text-[10px] text-text-mid font-medium leading-tight truncate">
                  {skill.name}
                </div>
                <div className="font-mono text-[9px] text-text-mute leading-tight truncate mt-0.5">
                  {skill.description}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="font-mono text-[8px] text-text-mute">
                    v{skill.version}
                  </span>
                  {skill.sourceFile && (
                    <span className="font-mono text-[8px] text-text-mute truncate max-w-[100px]">
                      {skill.sourceFile}
                    </span>
                  )}
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => handleUseSkill(skill)}
                  title="Use this skill"
                  className="p-1 text-text-mute hover:text-accent-primary transition-colors cursor-pointer"
                >
                  <Zap size={11} />
                </button>
                <button
                  onClick={() => handleDeleteSkill(skill)}
                  title="Remove skill"
                  className="p-1 text-text-mute hover:text-status-error transition-colors cursor-pointer"
                >
                  <Trash2 size={11} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Hidden file input for .md import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".md"
        multiple
        className="hidden"
        onChange={handleImportSkill}
      />
    </div>
  );
}
