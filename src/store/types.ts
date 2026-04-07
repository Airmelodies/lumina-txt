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
  isVaultEnabled: boolean;
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

// ─── State Interface ───────────────────────────────────────

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
  settingsTab: 'general' | 'ai-providers' | 'persona' | 'projects' | 'skills' | 'security' | 'about';
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
  vaultStatus: 'uninitialized' | 'locked' | 'unlocked';
  vaultPasscode: string | null;
  spellCheck: boolean;
  saveDirectoryHandle: FileSystemDirectoryHandle | null;
  saveDirectoryName: string | null;

  // ── Editor State ──
  cursorLine: number;
  cursorCol: number;
  wordWrap: boolean;
  hasUnsavedChanges: boolean;
  textBrightness: number;
  bgContrast: number;
}

// ─── Actions Interface ─────────────────────────────────────

export interface LuminaActions {
  addFile: (file: TextFile) => void;
  addFiles: (files: TextFile[]) => void;
  setFiles: (files: TextFile[]) => void;
  updateFile: (id: string, updates: Partial<TextFile>) => void;
  removeFile: (id: string) => void;
  closeFile: (id: string) => void;
  duplicateFile: (id: string) => void;
  setActiveFile: (id: string | null) => void;
  setSearchQuery: (query: string) => void;

  setFolders: (folders: FolderNode[]) => void;
  addFolder: (folder: FolderNode) => void;
  toggleFolder: (id: string) => void;
  setRootFolder: (handle: FileSystemDirectoryHandle, name: string) => void;

  setProjects: (projects: Project[]) => void;
  addProject: (project: Project) => void;
  updateProject: (id: string, updates: Partial<Project>) => void;
  removeProject: (id: string) => void;
  setActiveProject: (id: string | null) => void;
  setProjectModalOpen: (open: boolean) => void;

  setPersona: (persona: Persona) => void;

  toggleSidebar: () => void;
  setSidebarTab: (tab: SidebarTab) => void;
  toggleAIPanel: () => void;
  setSettingsOpen: (open: boolean) => void;
  setSettingsTab: (tab: LuminaState['settingsTab']) => void;
  setNewFileModalOpen: (open: boolean) => void;
  setDeleteModalOpen: (open: boolean, fileId?: string) => void;
  setRenameModalOpen: (open: boolean, fileId?: string) => void;
  showContextMenu: (fileId: string, x: number, y: number) => void;
  hideContextMenu: () => void;

  setAIMode: (mode: AIMode) => void;
  setAIOutput: (output: string) => void;
  setAILoading: (loading: boolean) => void;
  setAIPrompt: (prompt: string) => void;
  addAIMessage: (role: 'user' | 'assistant', content: string) => void;
  setAIConversation: (messages: { role: 'user' | 'assistant'; content: string }[]) => void;
  clearAIConversation: () => void;

  setSkills: (skills: Skill[]) => void;
  addSkill: (skill: Skill) => void;
  removeSkill: (id: string) => void;
  setActiveSkill: (id: string | null) => void;

  updateSettings: (updates: Partial<AISettings>) => void;
  setVaultPasscode: (passcode: string | null) => void;
  setVaultStatus: (status: LuminaState['vaultStatus']) => void;
  lockVault: () => void;

  setCursor: (line: number, col: number) => void;
  toggleWordWrap: () => void;
  setHasUnsavedChanges: (unsaved: boolean) => void;
  setTextBrightness: (v: number) => void;
  setBgContrast: (v: number) => void;
  setSpellCheck: (v: boolean) => void;
  setSaveDirectory: (handle: FileSystemDirectoryHandle | null, name: string | null) => void;
}

export type LuminaStore = LuminaState & LuminaActions;
