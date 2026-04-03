'use client';

import { useState, useCallback, useRef, useEffect, type FormEvent } from 'react';
import { Upload, X, FolderKanban } from 'lucide-react';
import { toast } from 'sonner';
import { useLuminaStore, type Project, type ProjectReferenceFile, type ContextMode } from '@/store/use-lumina-store';
import { saveProject } from '@/lib/indexeddb';
import { getFileType } from '@/store/use-lumina-store';
import { isSupportedFile } from '@/lib/indexeddb';

// ─── Styles ──────────────────────────────────────────────────

const inputClasses =
  'w-full px-2 py-1.5 border border-border-base bg-surface-surface text-text-bright font-mono text-[11px] placeholder:text-text-mute focus:border-border-lit outline-none rounded-[2px] transition-colors';

const labelClasses =
  'font-mono text-[9px] tracking-[0.12em] uppercase text-text-mute mb-1 block';

// ─── Inner Form ─────────────────────────────────────────────

function ProjectForm({
  initialProject,
  onClose,
}: {
  initialProject: Project | null;
  onClose: () => void;
}) {
  const addProject = useLuminaStore((s) => s.addProject);
  const updateProject = useLuminaStore((s) => s.updateProject);
  const projects = useLuminaStore((s) => s.projects);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [editingId, setEditingId] = useState<string | null>(initialProject?.id ?? null);
  const [name, setName] = useState(initialProject?.name ?? '');
  const [description, setDescription] = useState(initialProject?.description ?? '');
  const [instructions, setInstructions] = useState(initialProject?.instructions ?? '');
  const [personaOverride, setPersonaOverride] = useState(initialProject?.personaOverride ?? '');
  const [referenceFiles, setReferenceFiles] = useState<ProjectReferenceFile[]>(
    initialProject?.referenceFiles ?? []
  );

  // ── Keyboard handler ──
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose]
  );

  // Note: we intentionally don't use useEffect here to avoid the lint warning.

  // ── Reference file import ──
  const handleFileImport = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const selected = e.target.files;
      if (!selected || selected.length === 0) return;

      const remaining = 5 - referenceFiles.length;
      if (remaining <= 0) {
        toast.error('Maximum 5 reference files allowed');
        e.target.value = '';
        return;
      }

      const filesToRead = Array.from(selected).slice(0, remaining);

      const newRefs: ProjectReferenceFile[] = [];
      for (const file of filesToRead) {
        if (!isSupportedFile(file.name)) {
          toast.warning(`Skipped: ${file.name} (unsupported format)`);
          continue;
        }
        try {
          const content = await file.text();
          newRefs.push({
            id: crypto.randomUUID(),
            name: file.name,
            content,
            fileType: getFileType(file.name),
            contextMode: 'optional',
          });
        } catch {
          toast.error(`Failed to read: ${file.name}`);
        }
      }

      if (newRefs.length > 0) {
        setReferenceFiles((prev) => [...prev, ...newRefs]);
        toast.success(`${newRefs.length} file(s) added`);
      }

      e.target.value = '';
    },
    [referenceFiles.length]
  );

  // ── Remove reference file ──
  const handleRemoveRef = useCallback((id: string) => {
    setReferenceFiles((prev) => prev.filter((f) => f.id !== id));
  }, []);

  // ── Update reference file context mode ──
  const handleUpdateRefMode = useCallback((id: string, mode: ContextMode) => {
    setReferenceFiles((prev) =>
      prev.map((f) => (f.id === id ? { ...f, contextMode: mode } : f))
    );
  }, []);

  // ── Submit handler ──
  const handleSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault();

      if (!name.trim()) {
        toast.error('Project name is required');
        return;
      }

      if (instructions.length > 1000) {
        toast.error('Instructions must be under 1000 characters');
        return;
      }

      const now = new Date().toISOString();

      if (editingId) {
        // Update existing project
        updateProject(editingId, {
          name: name.trim(),
          description: description.trim(),
          instructions: instructions.trim(),
          personaOverride: personaOverride.trim() || null,
          referenceFiles,
        });

        // Persist to IndexedDB
        const existing = projects.find((p) => p.id === editingId);
        if (existing) {
          saveProject({
            ...existing,
            name: name.trim(),
            description: description.trim(),
            instructions: instructions.trim(),
            personaOverride: personaOverride.trim() || null,
            referenceFiles,
            updatedAt: now,
          }).catch(() => toast.error('Failed to save project'));
        }

        toast.success('Project updated');
      } else {
        // Create new project
        const project: Project = {
          id: crypto.randomUUID(),
          name: name.trim(),
          description: description.trim(),
          instructions: instructions.trim(),
          referenceFiles,
          personaOverride: personaOverride.trim() || null,
          createdAt: now,
          updatedAt: now,
        };

        addProject(project);
        saveProject(project).catch(() => toast.error('Failed to save project'));
        toast.success('Project created');
      }

      onClose();
    },
    [name, description, instructions, personaOverride, referenceFiles, editingId, projects, addProject, updateProject, onClose]
  );

  return (
    <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
      <div className="flex-1 overflow-y-auto px-3.5 py-4 flex flex-col gap-4">
        {/* Project name */}
        <div>
          <label className={labelClasses}>Project Name *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Blog Redesign"
            className={inputClasses}
            maxLength={100}
            autoFocus
          />
        </div>

        {/* Description */}
        <div>
          <label className={labelClasses}>Description</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief project description"
            className={inputClasses}
            maxLength={200}
          />
        </div>

        {/* Instructions */}
        <div>
          <label className={labelClasses}>Instructions</label>
          <textarea
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            placeholder="Detailed project instructions for AI context. E.g., 'When working on this project, always use formal language, follow APA style, and include citations…'"
            rows={4}
            className={`${inputClasses} resize-none`}
            maxLength={1000}
          />
          <span className="font-mono text-[8px] text-text-mute">
            {instructions.length} / 1000 chars
          </span>
        </div>

        {/* Persona override */}
        <div>
          <label className={labelClasses}>Persona Override (Optional)</label>
          <textarea
            value={personaOverride}
            onChange={(e) => setPersonaOverride(e.target.value)}
            placeholder="Override the master persona for this project. Leave empty to use master persona."
            rows={3}
            className={`${inputClasses} resize-none`}
            maxLength={2000}
          />
          <p className="font-mono text-[8px] text-text-mute mt-1">
            Overrides master persona when this project is active
          </p>
        </div>

        {/* Reference files */}
        <div>
          <label className={labelClasses}>
            Reference Files ({referenceFiles.length}/5)
          </label>

          {/* Upload button */}
          {referenceFiles.length < 5 && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full text-left px-3 py-1.5 border border-dashed border-border-base text-text-dim hover:text-text-mid hover:border-border-lit font-mono text-[10px] rounded-[2px] transition-colors cursor-pointer flex items-center gap-2 mt-1"
            >
              <Upload size={10} className="shrink-0" />
              Add reference file
            </button>
          )}

          {/* File list */}
          {referenceFiles.length > 0 && (
            <div className="mt-2 flex flex-col gap-1">
              {referenceFiles.map((ref) => (
                <div
                  key={ref.id}
                  className="flex items-center gap-2 px-2.5 py-1.5 border border-border-base bg-surface-surface rounded-[2px]"
                >
                  <span className="font-mono text-[10px] text-text-base flex-1 min-w-0 truncate">
                    {ref.name}
                  </span>
                  <span className="font-mono text-[8px] text-text-mute uppercase">
                    .{ref.fileType}
                  </span>
                  {/* Context mode selector */}
                  <select
                    value={ref.contextMode}
                    onChange={(e) => handleUpdateRefMode(ref.id, e.target.value as ContextMode)}
                    className="px-1.5 py-0.5 border border-border-base bg-surface-panel text-text-dim font-mono text-[8px] rounded-[2px] outline-none"
                  >
                    <option value="always-on">Always</option>
                    <option value="optional">Optional</option>
                    <option value="never">Never</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => handleRemoveRef(ref.id)}
                    className="p-0.5 text-text-mute hover:text-status-error transition-colors cursor-pointer"
                  >
                    <X size={11} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <p className="font-mono text-[8px] text-text-mute mt-1">
            Always-on files are automatically included in AI context
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="flex justify-end gap-1.5 px-3.5 py-2.5 border-t border-border-base bg-surface-panel shrink-0">
        <button
          type="button"
          onClick={onClose}
          className="px-3 py-1 border border-border-base bg-transparent text-text-dim font-mono text-[10px] tracking-[0.06em] uppercase hover:border-border-lit hover:text-text-base rounded-[2px] transition-colors cursor-pointer"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-3 py-1 border border-accent-dim text-accent-primary bg-accent-glow font-mono text-[10px] tracking-[0.06em] uppercase hover:bg-accent-glow-strong hover:border-accent-primary rounded-[2px] transition-colors cursor-pointer"
        >
          {editingId ? 'Update Project' : 'Create Project'}
        </button>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".txt,.md,.json,.html,.css"
        multiple
        className="hidden"
        onChange={handleFileImport}
      />
    </form>
  );
}

// ─── Outer Modal ────────────────────────────────────────────

export function ProjectModal() {
  const projectModalOpen = useLuminaStore((s) => s.projectModalOpen);
  const setProjectModalOpen = useLuminaStore((s) => s.setProjectModalOpen);
  const projects = useLuminaStore((s) => s.projects);
  const activeProjectId = useLuminaStore((s) => s.activeProjectId);

  const close = useCallback(() => {
    setProjectModalOpen(false);
  }, [setProjectModalOpen]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    },
    [close]
  );

  // Escape key handler
  useEffect(() => {
    if (!projectModalOpen) return;
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [projectModalOpen, handleKeyDown]);

  if (!projectModalOpen) return null;

  const initialProject = activeProjectId
    ? projects.find((p) => p.id === activeProjectId) ?? null
    : null;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center bg-black/72 backdrop-blur-[2px] z-[999]"
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div
        className="w-[500px] max-h-[85vh] bg-surface-raised border border-border-lit overflow-hidden rounded-[3px] animate-fade-in flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Titlebar */}
        <div className="bg-surface-panel border-b border-border-base px-3.5 py-2.5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <FolderKanban size={12} className="text-accent-primary" />
            <span className="font-mono text-[10px] tracking-[0.10em] uppercase text-text-base">
              {initialProject ? 'Edit Project' : 'New Project'}
            </span>
          </div>
          <button
            onClick={close}
            className="bg-none border-none text-text-dim font-mono text-xs cursor-pointer hover:text-text-bright transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Form — mounts fresh each time */}
        <ProjectForm
          key={initialProject?.id ?? 'new'}
          initialProject={initialProject}
          onClose={close}
        />
      </div>
    </div>
  );
}
