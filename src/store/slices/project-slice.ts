import { StateCreator } from 'zustand';
import { LuminaStore, Project, Persona } from '../types';

export interface ProjectSlice {
  projects: Project[];
  activeProjectId: string | null;
  projectModalOpen: boolean;
  persona: Persona;

  setProjects: (projects: Project[]) => void;
  addProject: (project: Project) => void;
  updateProject: (id: string, updates: Partial<Project>) => void;
  removeProject: (id: string) => void;
  setActiveProject: (id: string | null) => void;
  setProjectModalOpen: (open: boolean) => void;
  setPersona: (persona: Persona) => void;
}

const defaultPersona: Persona = {
  name: '',
  systemPrompt: '',
  tone: 'professional',
  customTone: '',
};

export const createProjectSlice: StateCreator<LuminaStore, [], [], ProjectSlice> = (set) => ({
  projects: [],
  activeProjectId: null,
  projectModalOpen: false,
  persona: defaultPersona,

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
  setPersona: (persona) => set({ persona }),
});
