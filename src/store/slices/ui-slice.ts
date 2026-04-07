import { StateCreator } from 'zustand';
import { LuminaStore, SidebarTab, ContextMenuState } from '../types';

export interface UISlice {
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

  toggleSidebar: () => void;
  setSidebarTab: (tab: SidebarTab) => void;
  toggleAIPanel: () => void;
  setSettingsOpen: (open: boolean) => void;
  setSettingsTab: (tab: UISlice['settingsTab']) => void;
  setNewFileModalOpen: (open: boolean) => void;
  setDeleteModalOpen: (open: boolean, fileId?: string) => void;
  setRenameModalOpen: (open: boolean, fileId?: string) => void;
  showContextMenu: (fileId: string, x: number, y: number) => void;
  hideContextMenu: () => void;
}

export const createUISlice: StateCreator<LuminaStore, [], [], UISlice> = (set) => ({
  sidebarOpen: true,
  sidebarTab: 'workspace',
  aiPanelOpen: true,
  settingsOpen: false,
  settingsTab: 'general',
  newFileModalOpen: false,
  deleteModalOpen: false,
  renameModalOpen: false,
  fileToDelete: null,
  fileToRename: null,
  contextMenu: { visible: false, fileId: null, x: 0, y: 0 },

  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarTab: (tab) => set({ sidebarTab: tab }),
  toggleAIPanel: () => set((s) => ({ aiPanelOpen: !s.aiPanelOpen })),
  setSettingsOpen: (open) => set({ settingsOpen: open, settingsTab: open ? 'general' : 'general' }),
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
});
