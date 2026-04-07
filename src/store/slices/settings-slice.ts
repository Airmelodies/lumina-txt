import { StateCreator } from 'zustand';
import { LuminaStore, AISettings } from '../types';

export interface SettingsSlice {
  settings: AISettings;
  vaultStatus: 'uninitialized' | 'locked' | 'unlocked';
  vaultPasscode: string | null;
  saveDirectoryHandle: FileSystemDirectoryHandle | null;
  saveDirectoryName: string | null;

  updateSettings: (updates: Partial<AISettings>) => void;
  setVaultPasscode: (passcode: string | null) => void;
  setVaultStatus: (status: SettingsSlice['vaultStatus']) => void;
  lockVault: () => void;
  setSaveDirectory: (handle: FileSystemDirectoryHandle | null, name: string | null) => void;
}

const defaultSettings: AISettings = {
  provider: 'zai',
  ollamaUrl: 'http://localhost:11434',
  ollamaModel: 'qwen2.5:7b',
  geminiApiKey: '',
  geminiModel: 'gemini-2.0-flash',
  isVaultEnabled: false,
};

export const createSettingsSlice: StateCreator<LuminaStore, [], [], SettingsSlice> = (set) => ({
  settings: defaultSettings,
  vaultStatus: 'uninitialized',
  vaultPasscode: null,
  saveDirectoryHandle: null,
  saveDirectoryName: null,

  updateSettings: (updates) =>
    set((state) => ({
      settings: { ...state.settings, ...updates },
    })),
  setVaultPasscode: (passcode) => set({ vaultPasscode: passcode }),
  setVaultStatus: (status) => set({ vaultStatus: status }),
  lockVault: () => set({ vaultStatus: 'locked', vaultPasscode: null }),
  setSaveDirectory: (handle, name) => set({ saveDirectoryHandle: handle, saveDirectoryName: name }),
});
