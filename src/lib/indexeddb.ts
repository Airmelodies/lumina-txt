// ─── IndexedDB Persistence Layer for Lumina TXT ────────────
// Stores: files, folders, settings, conversations, skills, projects, persona
// All data stays on user's machine. Zero cloud.

import { TextFile, FolderNode, AISettings } from '@/store/use-lumina-store';
import type { Skill } from '@/lib/skill-parser';
import type { Project, Persona } from '@/store/use-lumina-store';

const DB_NAME = 'lumina-txt';
const DB_VERSION = 4; // Bumped for projects + persona stores

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Files store (v1)
      if (!db.objectStoreNames.contains('files')) {
        const fileStore = db.createObjectStore('files', { keyPath: 'id' });
        fileStore.createIndex('name', 'name', { unique: false });
        fileStore.createIndex('updatedAt', 'updatedAt', { unique: false });
        fileStore.createIndex('fileType', 'fileType', { unique: false });
        fileStore.createIndex('parentId', 'parentId', { unique: false });
      }

      // Settings store (v1)
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' });
      }

      // Folders store (v2)
      if (!db.objectStoreNames.contains('folders')) {
        const folderStore = db.createObjectStore('folders', { keyPath: 'id' });
        folderStore.createIndex('parentId', 'parentId', { unique: false });
      }

      // Conversations store (v2) — per-file AI chat history
      if (!db.objectStoreNames.contains('conversations')) {
        db.createObjectStore('conversations', { keyPath: 'fileId' });
      }

      // Skills store (v3) — AI skill definitions loaded from .md files
      if (!db.objectStoreNames.contains('skills')) {
        const skillStore = db.createObjectStore('skills', { keyPath: 'id' });
        skillStore.createIndex('name', 'name', { unique: false });
      }

      // Projects store (v4)
      if (!db.objectStoreNames.contains('projects')) {
        const projectStore = db.createObjectStore('projects', { keyPath: 'id' });
        projectStore.createIndex('name', 'name', { unique: false });
      }

      // Persona store (v4) — single master persona
      if (!db.objectStoreNames.contains('persona')) {
        db.createObjectStore('persona', { keyPath: 'key' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// ─── Supported File Extensions ─────────────────────────────

const SUPPORTED_EXTENSIONS = ['.txt', '.md', '.json', '.html', '.css', '.htm'];

export function isSupportedFile(filename: string): boolean {
  const lower = filename.toLowerCase();
  return SUPPORTED_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

// ─── File Operations ───────────────────────────────────────

export async function getAllFiles(): Promise<TextFile[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('files', 'readonly');
    const store = tx.objectStore('files');
    const request = store.getAll();
    request.onsuccess = () => {
      const files = request.result as TextFile[];
      files.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      resolve(files);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function saveFile(file: TextFile): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('files', 'readwrite');
    const store = tx.objectStore('files');
    store.put(file);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function saveFiles(files: TextFile[]): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('files', 'readwrite');
    const store = tx.objectStore('files');
    for (const file of files) {
      store.put(file);
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function deleteFile(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('files', 'readwrite');
    const store = tx.objectStore('files');
    store.delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getFile(id: string): Promise<TextFile | undefined> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('files', 'readonly');
    const store = tx.objectStore('files');
    const request = store.get(id);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function clearAllFiles(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('files', 'readwrite');
    const store = tx.objectStore('files');
    store.clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ─── Folder Operations ─────────────────────────────────────

export async function getAllFolders(): Promise<FolderNode[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('folders', 'readonly');
    const store = tx.objectStore('folders');
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result as FolderNode[]);
    request.onerror = () => reject(request.error);
  });
}

export async function saveFolders(folders: FolderNode[]): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('folders', 'readwrite');
    const store = tx.objectStore('folders');
    store.clear();
    for (const folder of folders) {
      store.put(folder);
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function clearAllFolders(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('folders', 'readwrite');
    const store = tx.objectStore('folders');
    store.clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ─── Conversation Operations ───────────────────────────────

export interface ConversationRecord {
  fileId: string;
  messages: { role: 'user' | 'assistant'; content: string }[];
  updatedAt: string;
}

export async function getConversation(fileId: string): Promise<ConversationRecord | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('conversations', 'readonly');
    const store = tx.objectStore('conversations');
    const request = store.get(fileId);
    request.onsuccess = () => resolve(request.result ?? null);
    request.onerror = () => reject(request.error);
  });
}

export async function saveConversation(record: ConversationRecord): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('conversations', 'readwrite');
    const store = tx.objectStore('conversations');
    store.put(record);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function deleteConversation(fileId: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('conversations', 'readwrite');
    const store = tx.objectStore('conversations');
    store.delete(fileId);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ─── Settings Operations ───────────────────────────────────

export async function getSettings(): Promise<AISettings | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('settings', 'readonly');
    const store = tx.objectStore('settings');
    const request = store.get('ai-settings');
    request.onsuccess = () => resolve(request.result?.value ?? null);
    request.onerror = () => reject(request.error);
  });
}

export async function saveSettings(settings: AISettings): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('settings', 'readwrite');
    const store = tx.objectStore('settings');
    store.put({ key: 'ai-settings', value: settings });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ─── Skill Operations ─────────────────────────────────────

export async function getAllSkills(): Promise<Skill[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('skills', 'readonly');
    const store = tx.objectStore('skills');
    const request = store.getAll();
    request.onsuccess = () => {
      const skills = request.result as Skill[];
      skills.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      resolve(skills);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function saveSkill(skill: Skill): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('skills', 'readwrite');
    const store = tx.objectStore('skills');
    store.put(skill);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function deleteSkill(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('skills', 'readwrite');
    const store = tx.objectStore('skills');
    store.delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getSkill(id: string): Promise<Skill | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('skills', 'readonly');
    const store = tx.objectStore('skills');
    const request = store.get(id);
    request.onsuccess = () => resolve(request.result ?? null);
    request.onerror = () => reject(request.error);
  });
}

export async function clearAllSkills(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('skills', 'readwrite');
    const store = tx.objectStore('skills');
    store.clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ─── Project Operations ────────────────────────────────────

export async function getAllProjects(): Promise<Project[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('projects', 'readonly');
    const store = tx.objectStore('projects');
    const request = store.getAll();
    request.onsuccess = () => {
      const projects = request.result as Project[];
      projects.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      resolve(projects);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function saveProject(project: Project): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('projects', 'readwrite');
    const store = tx.objectStore('projects');
    store.put(project);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function deleteProject(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('projects', 'readwrite');
    const store = tx.objectStore('projects');
    store.delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ─── Persona Operations ────────────────────────────────────

export async function getPersona(): Promise<Persona | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('persona', 'readonly');
    const store = tx.objectStore('persona');
    const request = store.get('master-persona');
    request.onsuccess = () => resolve(request.result?.value ?? null);
    request.onerror = () => reject(request.error);
  });
}

export async function savePersona(persona: Persona): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('persona', 'readwrite');
    const store = tx.objectStore('persona');
    store.put({ key: 'master-persona', value: persona });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
