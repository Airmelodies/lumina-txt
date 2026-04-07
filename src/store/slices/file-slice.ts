import { StateCreator } from 'zustand';
import { LuminaStore, TextFile, FolderNode } from '../types';

export interface FileSlice {
  files: TextFile[];
  folders: FolderNode[];
  activeFileId: string | null;
  searchQuery: string;
  rootFolderHandle: FileSystemDirectoryHandle | null;
  rootFolderName: string | null;

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
}

export const createFileSlice: StateCreator<LuminaStore, [], [], FileSlice> = (set) => ({
  files: [],
  folders: [],
  activeFileId: null,
  searchQuery: '',
  rootFolderHandle: null,
  rootFolderName: null,

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

  closeFile: (id) =>
    set((state) => {
      import('@/lib/indexeddb').then(({ getFile, saveFile }) => {
        getFile(id).then((file) => {
          if (file) {
            saveFile({ ...file, isClosed: true, updatedAt: new Date().toISOString() });
          }
        });
      });

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
});
