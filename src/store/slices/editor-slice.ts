import { StateCreator } from 'zustand';
import { LuminaStore } from '../types';

export interface EditorSlice {
  cursorLine: number;
  cursorCol: number;
  wordWrap: boolean;
  hasUnsavedChanges: boolean;
  textBrightness: number;
  bgContrast: number;
  spellCheck: boolean;

  setCursor: (line: number, col: number) => void;
  toggleWordWrap: () => void;
  setHasUnsavedChanges: (unsaved: boolean) => void;
  setTextBrightness: (v: number) => void;
  setBgContrast: (v: number) => void;
  setSpellCheck: (v: boolean) => void;
}

export const createEditorSlice: StateCreator<LuminaStore, [], [], EditorSlice> = (set) => ({
  cursorLine: 1,
  cursorCol: 1,
  wordWrap: true,
  hasUnsavedChanges: false,
  textBrightness: 0,
  bgContrast: 0,
  spellCheck: true,

  setCursor: (line, col) => set({ cursorLine: line, cursorCol: col }),
  toggleWordWrap: () => set((s) => ({ wordWrap: !s.wordWrap })),
  setHasUnsavedChanges: (unsaved) => set({ hasUnsavedChanges: unsaved }),
  setTextBrightness: (v) => set({ textBrightness: Math.max(-5, Math.min(5, v)) }),
  setBgContrast: (v) => set({ bgContrast: Math.max(-5, Math.min(5, v)) }),
  setSpellCheck: (v) => set({ spellCheck: v }),
});
