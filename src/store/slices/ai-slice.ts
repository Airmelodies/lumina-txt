import { StateCreator } from 'zustand';
import { LuminaStore, AIMode } from '../types';
import type { Skill } from '@/lib/skill-parser';

export interface AISlice {
  aiMode: AIMode;
  aiOutput: string;
  aiLoading: boolean;
  aiPrompt: string;
  aiConversation: { role: 'user' | 'assistant'; content: string }[];
  skills: Skill[];
  activeSkillId: string | null;

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
}

export const createAISlice: StateCreator<LuminaStore, [], [], AISlice> = (set) => ({
  aiMode: 'summarize',
  aiOutput: '',
  aiLoading: false,
  aiPrompt: '',
  aiConversation: [],
  skills: [],
  activeSkillId: null,

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

  setSkills: (skills) => set({ skills }),
  addSkill: (skill) =>
    set((s) => ({ skills: [skill, ...s.skills] })),
  removeSkill: (id) =>
    set((s) => ({
      skills: s.skills.filter((sk) => sk.id !== id),
      activeSkillId: s.activeSkillId === id ? null : s.activeSkillId,
    })),
  setActiveSkill: (id) => set({ activeSkillId: id }),
});
