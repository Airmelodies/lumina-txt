import { create } from 'zustand';
import type { Skill } from '@/lib/skill-parser';

// ─── Data Types ────────────────────────────────────────────

export type FileType = 'txt' | 'md' | 'json' | 'html' | 'css';

export interface TextFile {
  id: string;
  name: string;
  content: string;
  tags: string[];
  summary: string | null;
  fileType: FileType;
  parentId: string | null;     // folder ID for file tree
  projectIds: string[];        // many-to-many: projects this file belongs to
  isClosed: boolean;           // true = hidden from workspace, survives DB
  createdAt: string;
  updatedAt: string;
  size: number;
  lines: number;
}

export interface FolderNode {
  id: string;
  name: string;
  parentId: string | null;
  children: string[];          // IDs of child folders and files
  isExpanded: boolean;
}

// ─── Project Types ─────────────────────────────────────────

export type ContextMode = 'always-on' | 'optional' | 'never';

export interface ProjectReferenceFile {
  id: string;
  name: string;
  content: string;
  fileType: string;
  contextMode: ContextMode;    // how this file is included in AI context
}

export interface Project {
  id: string;
  name: string;
  description: string;
  instructions: string;        // detailed instructions (max 1000 chars)
  referenceFiles: ProjectReferenceFile[];  // up to 5 reference files
  personaOverride: string | null;          // project-level persona prompt
  createdAt: string;
  updatedAt: string;
}

// ─── Persona Types ─────────────────────────────────────────

export type PersonaTone = 'professional' | 'casual' | 'creative' | 'technical' | 'custom';

export interface Persona {
  name: string;
  systemPrompt: string;        // the master prompt
  tone: PersonaTone;
  customTone: string;          // used when tone === 'custom'
}

// ─── AI Types ──────────────────────────────────────────────

export type AIMode = 'summarize' | 'tag' | 'rewrite' | 'extract-tasks' | 'search' | 'chat' | 'skill';

export interface AISettings {
  provider: 'zai' | 'local' | 'cloud';
  ollamaUrl: string;
  ollamaModel: string;
  geminiApiKey: string;
  geminiModel: string;
}

// ─── UI Types ──────────────────────────────────────────────

export type SidebarTab = 'workspace' | 'tree' | 'skills';

export type ContextMenuAction = 'delete' | 'duplicate' | 'rename' | 'close' | 'export' | 'copy-name';

export interface ContextMenuState {
  visible: boolean;
  fileId: string | null;
  x: number;
  y: number;
}

// ─── State ─────────────────────────────────────────────────

export interface LuminaState {
  // ── File State ──
  files: TextFile[];
  folders: FolderNode[];
  activeFileId: string | null;
  searchQuery: string;
  rootFolderHandle: FileSystemDirectoryHandle | null;
  rootFolderName: string | null;

  // ── Project State ──
  projects: Project[];
  activeProjectId: string | null;
  projectModalOpen: boolean;

  // ── Persona State ──
  persona: Persona;

  // ── UI State ──
  sidebarOpen: boolean;
  sidebarTab: SidebarTab;
  aiPanelOpen: boolean;
  settingsOpen: boolean;
  aboutTerminalOpen: boolean;
  settingsTab: 'general' | 'ai-providers' | 'persona' | 'projects' | 'skills' | 'about';
  newFileModalOpen: boolean;
  deleteModalOpen: boolean;
  renameModalOpen: boolean;
  fileToDelete: string | null;
  fileToRename: string | null;
  contextMenu: ContextMenuState;

  // ── AI State ──
  aiMode: AIMode;
  aiOutput: string;
  aiLoading: boolean;
  aiPrompt: string;
  aiConversation: { role: 'user' | 'assistant'; content: string }[];

  // ── Skills State ──
  skills: Skill[];
  activeSkillId: string | null;

  // ── Settings ──
  settings: AISettings;
  spellCheck: boolean;              // spellcheck underline on/off
  saveDirectoryHandle: FileSystemDirectoryHandle | null;
  saveDirectoryName: string | null;

  // ── Editor State ──
  cursorLine: number;
  cursorCol: number;
  wordWrap: boolean;
  hasUnsavedChanges: boolean;
  textBrightness: number;    // -5 to +5, default 0
  bgContrast: number;        // -5 to +5, default 0
}

// ─── Actions ───────────────────────────────────────────────

export interface LuminaActions {
  // ── File Actions ──
  addFile: (file: TextFile) => void;
  addFiles: (files: TextFile[]) => void;
  setFiles: (files: TextFile[]) => void;
  updateFile: (id: string, updates: Partial<TextFile>) => void;
  removeFile: (id: string) => void;
  closeFile: (id: string) => void;
  duplicateFile: (id: string) => void;
  setActiveFile: (id: string | null) => void;
  setSearchQuery: (query: string) => void;

  // ── Folder Actions ──
  setFolders: (folders: FolderNode[]) => void;
  addFolder: (folder: FolderNode) => void;
  toggleFolder: (id: string) => void;
  setRootFolder: (handle: FileSystemDirectoryHandle, name: string) => void;

  // ── Project Actions ──
  setProjects: (projects: Project[]) => void;
  addProject: (project: Project) => void;
  updateProject: (id: string, updates: Partial<Project>) => void;
  removeProject: (id: string) => void;
  setActiveProject: (id: string | null) => void;
  setProjectModalOpen: (open: boolean) => void;

  // ── Persona Actions ──
  setPersona: (persona: Persona) => void;

  // ── UI Actions ──
  toggleSidebar: () => void;
  setSidebarTab: (tab: SidebarTab) => void;
  toggleAIPanel: () => void;
  setSettingsOpen: (open: boolean) => void;
  setAboutTerminalOpen: (open: boolean) => void;
  setSettingsTab: (tab: LuminaState['settingsTab']) => void;
  setNewFileModalOpen: (open: boolean) => void;
  setDeleteModalOpen: (open: boolean, fileId?: string) => void;
  setRenameModalOpen: (open: boolean, fileId?: string) => void;
  showContextMenu: (fileId: string, x: number, y: number) => void;
  hideContextMenu: () => void;

  // ── AI Actions ──
  setAIMode: (mode: AIMode) => void;
  setAIOutput: (output: string) => void;
  setAILoading: (loading: boolean) => void;
  setAIPrompt: (prompt: string) => void;
  addAIMessage: (role: 'user' | 'assistant', content: string) => void;
  setAIConversation: (messages: { role: 'user' | 'assistant'; content: string }[]) => void;
  clearAIConversation: () => void;

  // ── Skills Actions ──
  setSkills: (skills: Skill[]) => void;
  addSkill: (skill: Skill) => void;
  removeSkill: (id: string) => void;
  setActiveSkill: (id: string | null) => void;

  // ── Settings Actions ──
  updateSettings: (updates: Partial<AISettings>) => void;

  // ── Editor Actions ──
  setCursor: (line: number, col: number) => void;
  toggleWordWrap: () => void;
  setHasUnsavedChanges: (unsaved: boolean) => void;
  setTextBrightness: (v: number) => void;
  setBgContrast: (v: number) => void;
  setSpellCheck: (v: boolean) => void;
  setSaveDirectory: (handle: FileSystemDirectoryHandle | null, name: string | null) => void;
}

export type LuminaStore = LuminaState & LuminaActions;

// ─── Helpers ───────────────────────────────────────────────

function getFileType(filename: string): FileType {
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  if (['txt', 'text'].includes(ext)) return 'txt';
  if (ext === 'md') return 'md';
  if (ext === 'json') return 'json';
  if (ext === 'html' || ext === 'htm') return 'html';
  if (ext === 'css') return 'css';
  return 'txt';
}

export { getFileType };

// ─── Defaults ─────────────────────────────────────────────

const defaultSettings: AISettings = {
  provider: 'zai',
  ollamaUrl: 'http://localhost:11434',
  ollamaModel: 'qwen2.5:7b',
  geminiApiKey: '',
  geminiModel: 'gemini-2.0-flash',
};

const defaultPersona: Persona = {
  name: '',
  systemPrompt: '',
  tone: 'professional',
  customTone: '',
};

// ─── Initial State ─────────────────────────────────────────

const initialState: LuminaState = {
  files: [],
  folders: [],
  activeFileId: null,
  searchQuery: '',
  rootFolderHandle: null,
  rootFolderName: null,

  // ── Projects ──
  projects: [],
  activeProjectId: null,
  projectModalOpen: false,

  // ── Persona ──
  persona: defaultPersona,

  // ── UI ──
  sidebarOpen: true,
  sidebarTab: 'workspace',
  aiPanelOpen: true,
  settingsOpen: false,
  aboutTerminalOpen: false,
  settingsTab: 'general',
  newFileModalOpen: false,
  deleteModalOpen: false,
  renameModalOpen: false,
  fileToDelete: null,
  fileToRename: null,
  contextMenu: { visible: false, fileId: null, x: 0, y: 0 },

  // ── AI ──
  aiMode: 'summarize',
  aiOutput: '',
  aiLoading: false,
  aiPrompt: '',
  aiConversation: [],

  // ── Skills ──
  skills: [],
  activeSkillId: null,

  settings: defaultSettings,

  // ── Editor ──
  cursorLine: 1,
  cursorCol: 1,
  wordWrap: true,
  hasUnsavedChanges: false,

  // ── Editor Display ──
  textBrightness: 0,
  bgContrast: 0,
  spellCheck: true,
  saveDirectoryHandle: null,
  saveDirectoryName: null,
};

// ─── Store ─────────────────────────────────────────────────

export const useLuminaStore = create<LuminaStore>((set) => ({
  ...initialState,

  // ── File Actions ──
  addFile: (file) =>
    set((state) => ({
      files: [file, ...state.files],
      activeFileId: file.id,
    })),

  addFiles: (files) =>
    set((state) => ({
      files: [...files, ...state.files],
    })),

  setFiles: (files) =>
    set({
      files,
      activeFileId: files.length > 0 ? files[0].id : null,
    }),

  updateFile: (id, updates) =>
    set((state) => ({
      files: state.files.map((f) =>
        f.id === id ? { ...f, ...updates, updatedAt: new Date().toISOString() } : f
      ),
      hasUnsavedChanges: false,
    })),

  removeFile: (id) =>
    set((state) => {
      const newFiles = state.files.filter((f) => f.id !== id);
      return {
        files: newFiles,
        activeFileId:
          state.activeFileId === id
            ? newFiles.length > 0
              ? newFiles[0].id
              : null
            : state.activeFileId,
      };
    }),

  // Close file: remove from workspace + mark isClosed in DB (survives across sessions)
  closeFile: (id) =>
    set((state) => {
      // Mark as closed in IndexedDB (async, don't block state update)
      import('@/lib/indexeddb').then(({ getFile, saveFile }) => {
        getFile(id).then((file) => {
          if (file) {
            saveFile({ ...file, isClosed: true, updatedAt: new Date().toISOString() });
          }
        });
      });

      // Remove from in-memory workspace
      const newFiles = state.files.filter((f) => f.id !== id);
      return {
        files: newFiles,
        activeFileId:
          state.activeFileId === id
            ? newFiles.length > 0
              ? newFiles[0].id
              : null
            : state.activeFileId,
      };
    }),

  duplicateFile: (id) =>
    set((state) => {
      const source = state.files.find((f) => f.id === id);
      if (!source) return state;
      const ext = source.name.includes('.') ? '.' + source.name.split('.').pop() : '';
      const baseName = ext ? source.name.slice(0, -ext.length) : source.name;
      const newFile: TextFile = {
        ...source,
        id: crypto.randomUUID(),
        name: `${baseName} (copy)${ext}`,
        tags: [...source.tags],
        summary: source.summary,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      return {
        files: [newFile, ...state.files],
        activeFileId: newFile.id,
      };
    }),

  setActiveFile: (id) =>
    set({
      activeFileId: id,
      hasUnsavedChanges: false,
    }),

  setSearchQuery: (query) => set({ searchQuery: query }),

  // ── Folder Actions ──
  setFolders: (folders) => set({ folders }),
  addFolder: (folder) =>
    set((state) => ({ folders: [...state.folders, folder] })),
  toggleFolder: (id) =>
    set((state) => ({
      folders: state.folders.map((f) =>
        f.id === id ? { ...f, isExpanded: !f.isExpanded } : f
      ),
    })),
  setRootFolder: (handle, name) =>
    set({ rootFolderHandle: handle, rootFolderName: name }),

  // ── Project Actions ──
  setProjects: (projects) => set({ projects }),
  addProject: (project) =>
    set((state) => ({
      projects: [project, ...state.projects],
      activeProjectId: project.id,
    })),
  updateProject: (id, updates) =>
    set((state) => ({
      projects: state.projects.map((p) =>
        p.id === id ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p
      ),
    })),
  removeProject: (id) =>
    set((state) => ({
      projects: state.projects.filter((p) => p.id !== id),
      activeProjectId: state.activeProjectId === id ? null : state.activeProjectId,
    })),
  setActiveProject: (id) => set({ activeProjectId: id }),
  setProjectModalOpen: (open) => set({ projectModalOpen: open }),

  // ── Persona Actions ──
  setPersona: (persona) => set({ persona }),

  // ── UI Actions ──
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarTab: (tab) => set({ sidebarTab: tab }),
  toggleAIPanel: () => set((s) => ({ aiPanelOpen: !s.aiPanelOpen })),
  setSettingsOpen: (open) => set({ settingsOpen: open, settingsTab: open ? 'general' : 'general' }),
  setAboutTerminalOpen: (open) => set({ aboutTerminalOpen: open }),
  setSettingsTab: (tab) => set({ settingsTab: tab }),
  setNewFileModalOpen: (open) => set({ newFileModalOpen: open }),
  setDeleteModalOpen: (open, fileId) =>
    set({ deleteModalOpen: open, fileToDelete: fileId ?? null }),
  setRenameModalOpen: (open, fileId) =>
    set({ renameModalOpen: open, fileToRename: fileId ?? null }),
  showContextMenu: (fileId, x, y) =>
    set({ contextMenu: { visible: true, fileId, x, y } }),
  hideContextMenu: () =>
    set({ contextMenu: { visible: false, fileId: null, x: 0, y: 0 } }),

  // ── AI Actions ──
  setAIMode: (mode) => set({ aiMode: mode, aiOutput: '' }),
  setAIOutput: (output) => set({ aiOutput: output }),
  setAILoading: (loading) => set({ aiLoading: loading }),
  setAIPrompt: (prompt) => set({ aiPrompt: prompt }),
  addAIMessage: (role, content) =>
    set((state) => ({
      aiConversation: [...state.aiConversation, { role, content }],
    })),
  setAIConversation: (messages) => set({ aiConversation: messages }),
  clearAIConversation: () => set({ aiConversation: [], aiOutput: '' }),

  // ── Skills Actions ──
  setSkills: (skills) => set({ skills }),
  addSkill: (skill) =>
    set((s) => ({ skills: [skill, ...s.skills] })),
  removeSkill: (id) =>
    set((s) => ({
      skills: s.skills.filter((sk) => sk.id !== id),
      activeSkillId: s.activeSkillId === id ? null : s.activeSkillId,
    })),
  setActiveSkill: (id) => set({ activeSkillId: id }),

  // ── Settings Actions ──
  updateSettings: (updates) =>
    set((state) => ({
      settings: { ...state.settings, ...updates },
    })),

  // ── Editor Actions ──
  setCursor: (line, col) => set({ cursorLine: line, cursorCol: col }),
  toggleWordWrap: () => set((s) => ({ wordWrap: !s.wordWrap })),
  setHasUnsavedChanges: (unsaved) => set({ hasUnsavedChanges: unsaved }),
  setTextBrightness: (v) => set({ textBrightness: Math.max(-5, Math.min(5, v)) }),
  setBgContrast: (v) => set({ bgContrast: Math.max(-5, Math.min(5, v)) }),
  setSpellCheck: (v) => set({ spellCheck: v }),
  setSaveDirectory: (handle, name) => set({ saveDirectoryHandle: handle, saveDirectoryName: name }),
}));
