import { create } from 'zustand';
import { LuminaStore, FileType } from './types';
import { createFileSlice } from './slices/file-slice';
import { createUISlice } from './slices/ui-slice';
import { createAISlice } from './slices/ai-slice';
import { createProjectSlice } from './slices/project-slice';
import { createEditorSlice } from './slices/editor-slice';
import { createSettingsSlice } from './slices/settings-slice';

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
export type { LuminaStore, TextFile, FolderNode, Project, Persona, AISettings } from './types';

// ─── Store ─────────────────────────────────────────────────

export const useLuminaStore = create<LuminaStore>((...a) => ({
  ...createFileSlice(...a),
  ...createUISlice(...a),
  ...createAISlice(...a),
  ...createProjectSlice(...a),
  ...createEditorSlice(...a),
  ...createSettingsSlice(...a),
}));
