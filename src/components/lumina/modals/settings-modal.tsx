'use client';

import { useState, useEffect, useCallback, type FormEvent } from 'react';
import { Trash2, Database, Cpu, User, FolderKanban, Zap, Info, FolderOpen, Shield, Lock, Unlock, Key } from 'lucide-react';
import { useLuminaStore, type AISettings, type Persona, type PersonaTone, type Project, type Skill } from '@/store/use-lumina-store';
import { saveSettings, savePersona, deleteProject as deleteProjectFromDB, clearAllSkills, clearAllFiles, clearAllFolders } from '@/lib/indexeddb';
import { requestDirectoryHandle } from '@/lib/file-actions';
import { toast } from 'sonner';

// ─── Tab Configuration ──────────────────────────────────────

const SETTINGS_TABS = [
  { id: 'general' as const, label: 'General', icon: Info },
  { id: 'ai-providers' as const, label: 'AI Providers', icon: Cpu },
  { id: 'persona' as const, label: 'Persona', icon: User },
  { id: 'projects' as const, label: 'Projects', icon: FolderKanban },
  { id: 'skills' as const, label: 'Skills', icon: Zap },
  { id: 'security' as const, label: 'Security', icon: Shield },
  { id: 'about' as const, label: 'About', icon: Info },
] as const;

// ─── Shared Styles ──────────────────────────────────────────

const inputClasses =
  'w-full px-2 py-1.5 border border-border-base bg-surface-surface text-text-bright font-mono text-[11px] placeholder:text-text-mute focus:border-border-lit outline-none rounded-[2px] transition-colors';

const labelClasses =
  'font-mono text-[9px] tracking-[0.12em] uppercase text-text-mute mb-1 block';

// ─── Tab Content: General ───────────────────────────────────

function GeneralTab() {
  const wordWrap = useLuminaStore((s) => s.wordWrap);
  const toggleWordWrap = useLuminaStore((s) => s.toggleWordWrap);
  const spellCheck = useLuminaStore((s) => s.spellCheck);
  const setSpellCheck = useLuminaStore((s) => s.setSpellCheck);
  const saveDirectoryName = useLuminaStore((s) => s.saveDirectoryName);
  const setSaveDirectory = useLuminaStore((s) => s.setSaveDirectory);
  const files = useLuminaStore((s) => s.files);
  const projects = useLuminaStore((s) => s.projects);
  const skills = useLuminaStore((s) => s.skills);

  const [dirLoading, setDirLoading] = useState(false);

  const handleChooseSaveDir = useCallback(async () => {
    setDirLoading(true);
    try {
      const result = await requestDirectoryHandle();
      if (result) {
        setSaveDirectory(result.handle, result.name);
        toast.success(`Save directory set`, {
          description: result.name,
        });
      }
    } catch {
      toast.error('Failed to set save directory');
    } finally {
      setDirLoading(false);
    }
  }, [setSaveDirectory]);

  return (
    <div className="px-3.5 py-4 flex flex-col gap-4">
      {/* ── Preferences ── */}
      <div>
        <span className={labelClasses}>Preferences</span>
        <div className="flex flex-col gap-2 mt-2">
          {/* Word wrap */}
          <div className="flex items-center justify-between px-3 py-2 border border-border-base bg-surface-surface rounded-[2px]">
            <span className="font-mono text-[10px] text-text-base">Word wrap</span>
            <button
              onClick={toggleWordWrap}
              className={`w-8 h-4 rounded-[2px] border transition-colors cursor-pointer ${
                wordWrap
                  ? 'bg-accent-primary/20 border-accent-primary'
                  : 'bg-transparent border-border-base'
              }`}
            >
              <div
                className={`w-3 h-2.5 rounded-[1px] transition-all ${
                  wordWrap
                    ? 'bg-accent-primary translate-x-[14px]'
                    : 'bg-text-mute translate-x-[2px]'
                }`}
              />
            </button>
          </div>

          {/* Spellcheck underline */}
          <div className="flex items-center justify-between px-3 py-2 border border-border-base bg-surface-surface rounded-[2px]">
            <div>
              <span className="font-mono text-[10px] text-text-base">Auto-correct underline</span>
              <div className="font-mono text-[8px] text-text-mute mt-0.5">Browser spellcheck squiggles in editor</div>
            </div>
            <button
              onClick={() => setSpellCheck(!spellCheck)}
              className={`w-8 h-4 rounded-[2px] border transition-colors cursor-pointer ${
                spellCheck
                  ? 'bg-accent-primary/20 border-accent-primary'
                  : 'bg-transparent border-border-base'
              }`}
            >
              <div
                className={`w-3 h-2.5 rounded-[1px] transition-all ${
                  spellCheck
                    ? 'bg-accent-primary translate-x-[14px]'
                    : 'bg-text-mute translate-x-[2px]'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* ── Default Save Directory ── */}
      <div>
        <span className={labelClasses}>Default Save Directory</span>
        <div className="mt-2">
          {saveDirectoryName ? (
            <div className="flex items-center gap-2 px-3 py-2 border border-border-base bg-surface-surface rounded-[2px]">
              <FolderOpen size={11} className="text-accent-dim shrink-0" />
              <span className="font-mono text-[10px] text-text-base flex-1 truncate">{saveDirectoryName}</span>
              <button
                onClick={() => setSaveDirectory(null, null)}
                className="font-mono text-[9px] text-text-mute hover:text-status-error transition-colors cursor-pointer"
              >
                Clear
              </button>
            </div>
          ) : (
            <div className="px-3 py-2 border border-dashed border-border-base bg-surface-surface rounded-[2px]">
              <span className="font-mono text-[9px] text-text-mute">
                No directory set — Ctrl+S saves to browser storage only
              </span>
            </div>
          )}
          <button
            onClick={handleChooseSaveDir}
            disabled={dirLoading}
            className="w-full mt-1.5 text-left px-3 py-1.5 border border-solid border-border-base text-text-dim hover:text-text-mid hover:border-border-lit font-mono text-[10px] rounded-[2px] transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FolderOpen size={10} className="inline-block mr-1.5 -mt-px" />
            {dirLoading ? 'Requesting…' : saveDirectoryName ? 'Change directory' : 'Choose folder'}
          </button>
          <p className="font-mono text-[8px] text-text-mute mt-1">
            When set, Ctrl+S also writes files to this folder (Chrome/Edge only)
          </p>
        </div>
      </div>

      {/* ── Workspace Stats ── */}
      <div>
        <span className={labelClasses}>Workspace Stats</span>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {[
            { label: 'Files', value: files.length },
            { label: 'Projects', value: projects.length },
            { label: 'Skills', value: skills.length },
          ].map((stat) => (
            <div key={stat.label} className="px-3 py-2 border border-border-base bg-surface-surface rounded-[2px]">
              <div className="font-mono text-[9px] text-text-mute uppercase">{stat.label}</div>
              <div className="font-mono text-sm text-text-bright mt-0.5">{stat.value}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Tab Content: AI Providers ──────────────────────────────

const OLLAMA_MODELS = [
  'qwen2.5:7b', 'llama3:8b', 'mistral:7b', 'codellama:13b', 'gemma2:9b',
];
const GEMINI_MODELS = [
  'gemini-2.0-flash', 'gemini-1.5-pro', 'gemini-1.5-flash',
];

function AIProvidersTab({ settings: initialSettings }: { settings: AISettings }) {
  const updateSettings = useLuminaStore((s) => s.updateSettings);

  const [localSettings, setLocalSettings] = useState<AISettings>(initialSettings);
  const [hasChanges, setHasChanges] = useState(false);

  const handleChange = useCallback((updates: Partial<AISettings>) => {
    setLocalSettings((prev) => ({ ...prev, ...updates }));
    setHasChanges(true);
  }, []);

  const handleSave = useCallback(() => {
    updateSettings(localSettings);
    saveSettings(localSettings).catch(() => {
      toast.error('Failed to save settings');
    });
    setHasChanges(false);
    toast.success('AI settings saved');
  }, [localSettings, updateSettings]);

  return (
    <div className="px-3.5 py-4 flex flex-col gap-4">
      {/* Provider selector */}
      <div>
        <span className={labelClasses}>AI Provider</span>
        <div className="flex gap-1.5 mt-2">
          {([
            { id: 'zai' as const, label: 'Z.ai (Built-in)', desc: 'No config needed' },
            { id: 'local' as const, label: 'Local (Ollama)', desc: 'localhost:11434' },
            { id: 'cloud' as const, label: 'Cloud (Gemini)', desc: 'API key required' },
          ]).map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => handleChange({ provider: opt.id })}
              className={`flex-1 text-left px-2.5 py-2 border cursor-pointer font-mono text-[9px] rounded-[2px] transition-colors ${
                localSettings.provider === opt.id
                  ? 'border-l-2 border-l-accent-primary border-t border-r border-b border-border-lit bg-surface-raised text-accent-primary'
                  : 'border-border-base text-text-dim hover:bg-surface-hover hover:text-text-mid'
              }`}
            >
              <div className="font-medium">{opt.label}</div>
              <div className="text-[8px] text-text-mute mt-0.5">{opt.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Ollama config */}
      {localSettings.provider === 'local' && (
        <div className="flex flex-col gap-3">
          <div>
            <label className={labelClasses}>Ollama URL</label>
            <input
              type="text"
              value={localSettings.ollamaUrl}
              onChange={(e) => handleChange({ ollamaUrl: e.target.value })}
              placeholder="http://localhost:11434"
              className={inputClasses}
            />
          </div>
          <div>
            <label className={labelClasses}>Model</label>
            <select
              value={localSettings.ollamaModel}
              onChange={(e) => handleChange({ ollamaModel: e.target.value })}
              className={inputClasses}
            >
              {OLLAMA_MODELS.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
            <input
              type="text"
              value={localSettings.ollamaModel}
              onChange={(e) => handleChange({ ollamaModel: e.target.value })}
              placeholder="Or type a custom model name…"
              className={`${inputClasses} mt-1.5`}
            />
          </div>
        </div>
      )}

      {/* Gemini config */}
      {localSettings.provider === 'cloud' && (
        <div className="flex flex-col gap-3">
          <div>
            <label className={labelClasses}>API Key</label>
            <div className="relative">
              <input
                type="password"
                value={localSettings.geminiApiKey}
                onChange={(e) => handleChange({ geminiApiKey: e.target.value })}
                placeholder="Enter your Gemini API key"
                className={`${inputClasses} ${useLuminaStore.getState().settings.isVaultEnabled && !useLuminaStore.getState().vaultPasscode ? 'opacity-20 pointer-events-none' : ''}`}
              />
              {useLuminaStore.getState().settings.isVaultEnabled && !useLuminaStore.getState().vaultPasscode && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="font-mono text-[9px] text-accent-dim bg-surface-surface px-2 py-0.5 border border-accent-dim uppercase tracking-wider">
                    Vault Locked
                  </span>
                </div>
              )}
            </div>
            <p className="font-mono text-[9px] text-text-mute mt-1">
              {useLuminaStore.getState().settings.isVaultEnabled 
                ? 'Key is encrypted in storage' 
                : 'Key stored locally in plaintext'}
            </p>
          </div>
          <div>
            <label className={labelClasses}>Model</label>
            <select
              value={localSettings.geminiModel}
              onChange={(e) => handleChange({ geminiModel: e.target.value })}
              className={inputClasses}
            >
              {GEMINI_MODELS.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Save button */}
      {hasChanges && (
        <button
          onClick={handleSave}
          className="self-end px-3 py-1 border border-accent-dim text-accent-primary bg-accent-glow font-mono text-[10px] tracking-[0.06em] uppercase hover:bg-accent-glow-strong hover:border-accent-primary rounded-[2px] transition-colors cursor-pointer"
        >
          Save Settings
        </button>
      )}
    </div>
  );
}

// ─── Tab Content: Persona ───────────────────────────────────

const TONE_OPTIONS: { id: PersonaTone; label: string }[] = [
  { id: 'professional', label: 'Professional' },
  { id: 'casual', label: 'Casual' },
  { id: 'creative', label: 'Creative' },
  { id: 'technical', label: 'Technical' },
  { id: 'custom', label: 'Custom…' },
];

function PersonaTab({ persona: initialPersona }: { persona: Persona }) {
  const setPersona = useLuminaStore((s) => s.setPersona);

  const [local, setLocal] = useState<Persona>(initialPersona);
  const [hasChanges, setHasChanges] = useState(false);

  const handleChange = useCallback((updates: Partial<Persona>) => {
    setLocal((prev) => ({ ...prev, ...updates }));
    setHasChanges(true);
  }, []);

  const handleSave = useCallback(() => {
    setPersona(local);
    savePersona(local).catch(() => {
      toast.error('Failed to save persona');
    });
    setHasChanges(false);
    toast.success('Persona saved');
  }, [local, setPersona]);

  const handleClear = useCallback(() => {
    const empty: Persona = { name: '', systemPrompt: '', tone: 'professional', customTone: '' };
    setPersona(empty);
    savePersona(empty).catch(() => {});
    setLocal(empty);
    setHasChanges(false);
    toast.success('Persona cleared');
  }, [setPersona]);

  return (
    <div className="px-3.5 py-4 flex flex-col gap-4">
      {/* Info */}
      <div className="flex items-start gap-1.5 px-2.5 py-2 bg-surface-surface border border-border-dim rounded-[2px]">
        <Info size={9} className="text-text-mute shrink-0 mt-0.5" />
        <span className="font-mono text-[9px] text-text-mute leading-[1.5]">
          The master persona applies to all AI interactions. Projects can override it with their own persona.
        </span>
      </div>

      {/* Name */}
      <div>
        <label className={labelClasses}>Persona Name</label>
        <input
          type="text"
          value={local.name}
          onChange={(e) => handleChange({ name: e.target.value })}
          placeholder="e.g., Senior Developer"
          className={inputClasses}
          maxLength={100}
        />
      </div>

      {/* Tone */}
      <div>
        <label className={labelClasses}>Tone</label>
        <div className="flex flex-wrap gap-1.5 mt-2">
          {TONE_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => handleChange({ tone: opt.id })}
              className={`px-2.5 py-1.5 border cursor-pointer font-mono text-[9px] rounded-[2px] transition-colors ${
                local.tone === opt.id
                  ? 'border-l-2 border-l-accent-primary border-t border-r border-b border-border-lit bg-surface-raised text-accent-primary'
                  : 'border-border-base text-text-dim hover:bg-surface-hover'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        {local.tone === 'custom' && (
          <input
            type="text"
            value={local.customTone}
            onChange={(e) => handleChange({ customTone: e.target.value })}
            placeholder="Describe the tone…"
            className={`${inputClasses} mt-1.5`}
          />
        )}
      </div>

      {/* System Prompt */}
      <div>
        <label className={labelClasses}>Master Prompt</label>
        <textarea
          value={local.systemPrompt}
          onChange={(e) => handleChange({ systemPrompt: e.target.value })}
          placeholder="You are a senior developer who writes clean, well-documented code. You prefer concise explanations and provide actionable feedback…"
          rows={5}
          className={`${inputClasses} resize-none`}
        />
        <div className="flex justify-between mt-1">
          <span className="font-mono text-[8px] text-text-mute">
            {local.systemPrompt.length} / 2000 chars
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-between">
        <button
          onClick={handleClear}
          className="px-3 py-1 border border-border-base text-text-dim font-mono text-[10px] tracking-[0.06em] uppercase hover:border-status-error hover:text-status-error rounded-[2px] transition-colors cursor-pointer"
        >
          Clear
        </button>
        {hasChanges && (
          <button
            onClick={handleSave}
            className="px-3 py-1 border border-accent-dim text-accent-primary bg-accent-glow font-mono text-[10px] tracking-[0.06em] uppercase hover:bg-accent-glow-strong hover:border-accent-primary rounded-[2px] transition-colors cursor-pointer"
          >
            Save Persona
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Tab Content: Projects ──────────────────────────────────

function ProjectsTab() {
  const projects = useLuminaStore((s) => s.projects);
  const activeProjectId = useLuminaStore((s) => s.activeProjectId);
  const removeProject = useLuminaStore((s) => s.removeProject);
  const setActiveProject = useLuminaStore((s) => s.setActiveProject);
  const setProjectModalOpen = useLuminaStore((s) => s.setProjectModalOpen);

  const handleDelete = useCallback(
    async (project: Project) => {
      try {
        await deleteProjectFromDB(project.id);
        removeProject(project.id);
        toast.success(`Deleted: ${project.name}`);
      } catch {
        toast.error('Failed to delete project');
      }
    },
    [removeProject]
  );

  return (
    <div className="px-3.5 py-4 flex flex-col gap-4">
      {/* Create button */}
      <button
        onClick={() => {
          setProjectModalOpen(true);
        }}
        className="w-full text-left px-3 py-1.5 border border-dashed border-border-base text-text-dim hover:text-text-mid hover:border-border-lit font-mono text-[10px] rounded-[2px] transition-colors cursor-pointer flex items-center gap-2"
      >
        <FolderKanban size={10} className="shrink-0" />
        + New Project
      </button>

      {/* Project list */}
      <div>
        <span className={labelClasses}>Projects ({projects.length})</span>
        <div className="mt-2 max-h-64 overflow-y-auto">
          {projects.length === 0 ? (
            <div className="px-3 py-4 text-center">
              <span className="font-mono text-[9px] text-text-mute">No projects yet</span>
            </div>
          ) : (
            projects.map((project) => (
              <div
                key={project.id}
                className={`group flex items-start gap-2 px-2.5 py-2 rounded-[2px] transition-colors cursor-pointer mb-1 ${
                  activeProjectId === project.id
                    ? 'bg-accent-glow border-l-2 border-l-accent-primary'
                    : 'hover:bg-surface-hover border-l-2 border-l-transparent'
                }`}
                onClick={() => setActiveProject(project.id)}
              >
                <div className="flex-1 min-w-0">
                  <div className="font-mono text-[10px] text-text-mid font-medium truncate">
                    {project.name}
                  </div>
                  <div className="font-mono text-[9px] text-text-mute truncate mt-0.5">
                    {project.description || 'No description'}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="font-mono text-[8px] text-text-mute">
                      {project.referenceFiles.length} ref file{project.referenceFiles.length !== 1 ? 's' : ''}
                    </span>
                    {project.personaOverride && (
                      <span className="font-mono text-[8px] text-accent-dim">has persona</span>
                    )}
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(project);
                  }}
                  className="p-1 text-text-mute hover:text-status-error transition-colors cursor-pointer opacity-0 group-hover:opacity-100"
                  title="Delete project"
                >
                  <Trash2 size={11} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Tab Content: Skills ────────────────────────────────────

function SkillsTab() {
  const skills = useLuminaStore((s) => s.skills);
  const removeSkill = useLuminaStore((s) => s.removeSkill);

  const handleClearAll = useCallback(async () => {
    try {
      await clearAllSkills();
      useLuminaStore.getState().setSkills([]);
      toast.success('All skills cleared');
    } catch {
      toast.error('Failed to clear skills');
    }
  }, []);

  return (
    <div className="px-3.5 py-4 flex flex-col gap-4">
      <div className="flex items-start gap-1.5 px-2.5 py-2 bg-surface-surface border border-border-dim rounded-[2px]">
        <Info size={9} className="text-text-mute shrink-0 mt-0.5" />
        <span className="font-mono text-[9px] text-text-mute leading-[1.5]">
          Import skills from the Skills tab in the sidebar. Use .md files with YAML frontmatter.
        </span>
      </div>

      <div>
        <span className={labelClasses}>Loaded Skills ({skills.length})</span>
        <div className="mt-2 max-h-48 overflow-y-auto">
          {skills.length === 0 ? (
            <div className="px-3 py-3 text-center">
              <span className="font-mono text-[9px] text-text-mute">No skills loaded</span>
            </div>
          ) : (
            skills.map((skill) => (
              <div key={skill.id} className="flex items-center gap-2 px-2.5 py-1.5 rounded-[2px] hover:bg-surface-hover transition-colors">
                <div className="flex-1 min-w-0">
                  <span className="font-mono text-[10px] text-text-base truncate block">{skill.name}</span>
                  <span className="font-mono text-[9px] text-text-mute truncate block mt-0.5">{skill.description}</span>
                </div>
                <button
                  onClick={() => removeSkill(skill.id)}
                  className="p-1 text-text-mute hover:text-status-error transition-colors cursor-pointer opacity-0 group-hover:opacity-100"
                  title="Remove skill"
                >
                  <Trash2 size={11} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {skills.length > 0 && (
        <button
          onClick={handleClearAll}
          className="self-start px-3 py-1 border border-border-base text-text-dim font-mono text-[10px] tracking-[0.06em] uppercase hover:border-status-error hover:text-status-error rounded-[2px] transition-colors cursor-pointer"
        >
          Clear All Skills
        </button>
      )}
    </div>
  );
}

// ─── Tab Content: About ─────────────────────────────────────

function SecurityTab() {
  const { settings, updateSettings, vaultStatus, vaultPasscode, setVaultPasscode, setVaultStatus, lockVault } = useLuminaStore();
  const [passcode, setPasscode] = useState('');
  const [confirmPasscode, setConfirmPasscode] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSetupVault = useCallback(async () => {
    if (passcode.length < 4) {
      toast.error('Passcode must be at least 4 characters');
      return;
    }
    if (passcode !== confirmPasscode) {
      toast.error('Passcodes do not match');
      return;
    }

    setIsLoading(true);
    try {
      // 1. Enable vault in settings
      const newSettings = { ...settings, isVaultEnabled: true };
      updateSettings(newSettings);
      
      // 2. Persist settings (this will trigger encryption of geminiApiKey if it exists)
      await saveSettings(newSettings, passcode);
      
      // 3. Update session state
      setVaultPasscode(passcode);
      setVaultStatus('unlocked');
      
      toast.success('Vault enabled', {
        description: 'Sensitive settings are now encrypted.',
      });
      setPasscode('');
      setConfirmPasscode('');
    } catch {
      toast.error('Failed to setup vault');
    } finally {
      setIsLoading(false);
    }
  }, [passcode, confirmPasscode, settings, updateSettings, setVaultPasscode, setVaultStatus]);

  const handleUnlock = useCallback(async () => {
    setIsLoading(true);
    try {
      const { getSettings } = await import('@/lib/indexeddb');
      const decryptedSettings = await getSettings(passcode);
      
      // Verify decryption worked (checking if geminiApiKey exists and is not base64 blobs)
      // If the vault is enabled, getSettings tries to decrypt. If it fails, it returns the blob.
      
      if (decryptedSettings) {
        updateSettings(decryptedSettings);
        setVaultPasscode(passcode);
        setVaultStatus('unlocked');
        toast.success('Vault unlocked');
        setPasscode('');
      }
    } catch {
      toast.error('Incorrect passcode');
    } finally {
      setIsLoading(false);
    }
  }, [passcode, updateSettings, setVaultPasscode, setVaultStatus]);

  const handleDisableVault = useCallback(async () => {
    if (!vaultPasscode) return;
    
    setIsLoading(true);
    try {
      const newSettings = { ...settings, isVaultEnabled: false };
      updateSettings(newSettings);
      
      // Save settings WITHOUT a passcode (this will save fields as plaintext)
      await saveSettings(newSettings, null);
      
      lockVault();
      setVaultStatus('uninitialized');
      
      toast.info('Vault disabled', {
        description: 'Settings are now stored in plaintext.',
      });
    } catch {
      toast.error('Failed to disable vault');
    } finally {
      setIsLoading(false);
    }
  }, [vaultPasscode, settings, updateSettings, lockVault, setVaultStatus]);

  return (
    <div className="px-3.5 py-4 flex flex-col gap-4">
      {/* ── Vault State ── */}
      <div className="flex items-center justify-between px-3.5 py-3 border border-border-base bg-surface-surface rounded-[2px]">
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 flex items-center justify-center rounded-full border ${
            vaultStatus === 'unlocked' ? 'bg-accent-glow border-accent-dim text-accent-primary' : 'bg-surface-raised border-border-base text-text-mute'
          }`}>
            {vaultStatus === 'unlocked' ? <Unlock size={14} /> : <Lock size={14} />}
          </div>
          <div>
            <div className="font-mono text-[10px] text-text-bright tracking-[0.04em] uppercase">
              Secure Vault
            </div>
            <div className="font-mono text-[9px] text-text-mute uppercase tracking-widest mt-0.5">
              Status: {vaultStatus}
            </div>
          </div>
        </div>
        
        {vaultStatus === 'unlocked' && (
          <button
            onClick={lockVault}
            className="px-2.5 py-1 border border-border-base text-text-dim hover:text-text-mid font-mono text-[9px] tracking-[0.06em] uppercase rounded-[2px] transition-colors cursor-pointer"
          >
            Lock Vault
          </button>
        )}
      </div>

      {/* ── Implementation Views ── */}
      
      {!settings.isVaultEnabled && (
        <div className="flex flex-col gap-3 mt-1">
          <div className="flex items-start gap-1.5 px-2.5 py-2 bg-surface-surface border border-border-dim rounded-[2px]">
            <Shield size={10} className="text-accent-dim shrink-0 mt-0.5" />
            <span className="font-mono text-[9px] text-text-mute leading-[1.5]">
              Enable the Secure Vault to encrypt your Gemini API keys using AES-GCM 256-bit. 
              <strong> Warning:</strong> There is no recovery if you lose your passcode.
            </span>
          </div>
          
          <div>
            <label className={labelClasses}>Set Vault Passcode</label>
            <input
              type="password"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              placeholder="Minimum 4 characters"
              className={inputClasses}
            />
          </div>
          <div>
            <label className={labelClasses}>Confirm Passcode</label>
            <input
              type="password"
              value={confirmPasscode}
              onChange={(e) => setConfirmPasscode(e.target.value)}
              placeholder="Confirm passcode"
              className={inputClasses}
            />
          </div>
          <button
            onClick={handleSetupVault}
            disabled={isLoading || !passcode}
            className="w-full py-2 border border-accent-dim text-accent-primary bg-accent-glow font-mono text-[10px] tracking-[0.06em] uppercase hover:bg-accent-glow-strong hover:border-accent-primary rounded-[2px] transition-colors cursor-pointer disabled:opacity-50"
          >
            {isLoading ? 'Processing…' : 'Enable Secure Vault'}
          </button>
        </div>
      )}

      {settings.isVaultEnabled && vaultStatus === 'locked' && (
        <div className="flex flex-col gap-3 mt-1">
          <div className="flex items-start gap-1.5 px-2.5 py-2 bg-surface-surface border border-border-dim rounded-[2px]">
            <Key size={10} className="text-text-dim shrink-0 mt-0.5" />
            <span className="font-mono text-[9px] text-text-dim leading-[1.5]">
              Vault is locked. Enter your passcode to access encrypted settings.
            </span>
          </div>
          
          <div>
            <label className={labelClasses}>Vault Passcode</label>
            <input
              type="password"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleUnlock()}
              placeholder="Enter passcode"
              className={inputClasses}
              autoFocus
            />
          </div>
          <button
            onClick={handleUnlock}
            disabled={isLoading || !passcode}
            className="w-full py-2 border border-accent-dim text-accent-primary bg-accent-glow font-mono text-[10px] tracking-[0.06em] uppercase hover:bg-accent-glow-strong hover:border-accent-primary rounded-[2px] transition-colors cursor-pointer disabled:opacity-50"
          >
            {isLoading ? 'Decrypting…' : 'Unlock Vault'}
          </button>
        </div>
      )}

      {settings.isVaultEnabled && vaultStatus === 'unlocked' && (
        <div className="flex flex-col gap-4 mt-1">
          <div className="px-3 py-3 border border-border-base bg-surface-surface rounded-[2px]">
             <div className="font-mono text-[10px] text-text-mid">Vault Active</div>
             <div className="font-mono text-[9px] text-text-mute mt-1">
               Your sensitive data is unlocked for this session. It will be re-encrypted upon locking or closing the app.
             </div>
          </div>
          
          <div className="h-px bg-border-dim" />
          
          <div>
            <span className="font-mono text-[9px] tracking-[0.12em] uppercase text-status-error mb-2 block">
              Danger Zone
            </span>
            <button
              onClick={handleDisableVault}
              disabled={isLoading}
              className="w-full text-left px-3 py-2 border border-status-error/30 text-status-error font-mono text-[10px] rounded-[2px] hover:bg-status-error/10 transition-colors cursor-pointer"
            >
              Disable Secure Vault
            </button>
            <p className="font-mono text-[8px] text-text-mute mt-1">
              Decrypts all fields and stores them in plaintext.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function AboutTab() {
  const files = useLuminaStore((s) => s.files);
  const projects = useLuminaStore((s) => s.projects);
  const skills = useLuminaStore((s) => s.skills);
  const setSettingsOpen = useLuminaStore((s) => s.setSettingsOpen);

  const handleClearAllData = useCallback(async () => {
    try {
      await Promise.all([clearAllFiles(), clearAllFolders(), clearAllSkills()]);
      useLuminaStore.getState().setFiles([]);
      useLuminaStore.getState().setFolders([]);
      useLuminaStore.getState().setSkills([]);
      toast.success('All data cleared');
    } catch {
      toast.error('Failed to clear data');
    }
  }, []);

  return (
    <div className="px-3.5 py-4 flex flex-col gap-4">
      {/* App info */}
      <div>
        <div className="font-mono text-sm text-text-bright font-semibold tracking-[0.06em]">
          LUMINA TXT
        </div>
        <div className="font-mono text-[9px] text-text-mute mt-0.5">
          v0.3.0 — AI-Powered Text Manager
        </div>
      </div>

      <div className="h-px bg-border-dim" />

      {/* Stats */}
      <div>
        <span className={labelClasses}>Data Statistics</span>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {[
            { label: 'Files', value: files.length, icon: '📄' },
            { label: 'Projects', value: projects.length, icon: '📁' },
            { label: 'Skills', value: skills.length, icon: '⚡' },
          ].map((stat) => (
            <div key={stat.label} className="px-2 py-2 border border-border-base bg-surface-surface rounded-[2px] text-center">
              <div className="text-sm">{stat.icon}</div>
              <div className="font-mono text-sm text-text-bright">{stat.value}</div>
              <div className="font-mono text-[8px] text-text-mute uppercase">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="h-px bg-border-dim" />

      {/* Storage info */}
      <div>
        <span className={labelClasses}>Storage</span>
        <div className="mt-2 flex items-center gap-2 px-3 py-2 border border-border-base bg-surface-surface rounded-[2px]">
          <Database size={12} className="text-text-dim shrink-0" />
          <span className="font-mono text-[10px] text-text-base">
            IndexedDB — All data local, zero cloud
          </span>
        </div>
      </div>

      <div className="h-px bg-border-dim" />

      {/* Danger zone */}
      <div>
        <span className="font-mono text-[9px] tracking-[0.12em] uppercase text-status-error mb-2 block">
          Danger Zone
        </span>
        <button
          onClick={handleClearAllData}
          className="w-full text-left px-3 py-2 border border-status-error/30 text-status-error font-mono text-[10px] rounded-[2px] hover:bg-status-error/10 transition-colors cursor-pointer"
        >
          Clear All Data
        </button>
        <p className="font-mono text-[8px] text-text-mute mt-1">
          Removes all files, folders, and skills from local storage. This cannot be undone.
        </p>
      </div>
    </div>
  );
}

// ─── Outer Modal ────────────────────────────────────────────

export function SettingsModal() {
  const { settingsOpen, setSettingsOpen, settingsTab, setSettingsTab, settings, persona } = useLuminaStore();

  const close = useCallback(() => {
    setSettingsOpen(false);
  }, [setSettingsOpen]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    },
    [close]
  );

  useEffect(() => {
    if (settingsOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [settingsOpen, handleKeyDown]);

  if (!settingsOpen) return null;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center bg-black/72 backdrop-blur-[2px] z-[999]"
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div
        className="w-[520px] max-h-[80vh] bg-surface-raised border border-border-lit overflow-hidden rounded-[3px] animate-fade-in flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Titlebar */}
        <div className="bg-surface-panel border-b border-border-base px-3.5 py-2.5 flex items-center justify-between shrink-0">
          <span className="font-mono text-[10px] tracking-[0.10em] uppercase text-text-base">
            Settings
          </span>
          <button
            onClick={close}
            className="bg-none border-none text-text-dim font-mono text-xs cursor-pointer hover:text-text-bright transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Tab bar */}
        <div className="flex border-b border-border-base bg-surface-panel shrink-0">
          {SETTINGS_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = settingsTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setSettingsTab(tab.id)}
                className={`flex-1 py-2 cursor-pointer text-center transition-colors border-b-2 ${
                  isActive
                    ? 'text-accent-primary border-accent-primary'
                    : 'text-text-dim border-transparent hover:bg-surface-hover'
                }`}
              >
                <Icon size={11} className="mx-auto mb-0.5" />
                <span className="font-mono text-[8px] tracking-[0.06em] uppercase block">
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Tab content — scrollable */}
        <div className="flex-1 overflow-y-auto">
          {settingsTab === 'general' && <GeneralTab />}
          {settingsTab === 'ai-providers' && <AIProvidersTab key={settings.provider} settings={settings} />}
          {settingsTab === 'persona' && <PersonaTab key={persona.name || '_empty'} persona={persona} />}
          {settingsTab === 'projects' && <ProjectsTab />}
          {settingsTab === 'skills' && <SkillsTab />}
          {settingsTab === 'security' && <SecurityTab />}
          {settingsTab === 'about' && <AboutTab />}
        </div>
      </div>
    </div>
  );
}
