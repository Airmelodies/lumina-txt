# Lumina TXT v0.2 — Feature Plan
## AI-Powered Workspace Harness

---

## 📋 Executive Summary

Lumina TXT evolves from a **local-first text editor** into a **smart AI workspace harness** that combines:
- Text file management (existing)
- AI-powered skills (via .md skill files)
- Project management (with instructions + reference files)
- Persona / Master Prompt system
- Multi-provider AI configuration
- Full file system integration

---

## 🏗️ Architecture: 6 Layers (Dependency Order)

```
Layer 1: Foundation     ← File formats, export, spellcheck, context menus
Layer 2: File Mgmt      ← Delete/duplicate/close, file tree, folder loading
Layer 3: AI Chat        ← Append-to-file, copy, chat persistence
Layer 4: Skills         ← Skill.md loading, skill registry, skill execution
Layer 5: Projects       ← Project creation, instructions, reference files
Layer 6: Persona        ← Master Prompt, persona config, provider expansion
```

---

## Layer 1: Foundation (Quick Wins)

### 1.1 Multi-Format File Support
**What**: Accept `.txt`, `.md`, `.json`, `.html`, `.css` files
**Where**: `sidebar.tsx` — change `accept=".txt"` to `accept=".txt,.md,.json,.html,.css"`
**Schema**: Add `fileType` field to `TextFile` interface
**Effort**: 🟢 5 minutes

### 1.2 Spellcheck Enable
**What**: Set `spellcheck={true}` on editor textarea
**Where**: `editor.tsx` — add `spellCheck={true}` to textarea
**Effort**: 🟢 1 minute

### 1.3 Export / Download to Disk
**What**: "Save to disk" button in editor topbar
**Options**:
- `showSaveFilePicker()` (modern, Chromium-only, preserves filename)
- `<a download>` fallback (universal)
**Where**: New button in editor topbar, next to Save/Revert
**Behavior**:
  - Creates Blob from active file content
  - Triggers browser download with correct filename
**Effort**: 🟡 20 minutes

### 1.4 Right-Click Context Menu (Full)
**What**: Rich context menu on file items with multiple actions
**Where**: Replace current right-click → delete modal with full ContextMenu
**Actions**:
| Action | Behavior |
|---|---|
| Delete | Opens delete confirmation modal |
| Duplicate | Copies file with "(copy)" suffix, saves to IndexedDB |
| Rename | Inline rename (or modal) |
| Close | Removes from active files but keeps in DB |
| Export | Downloads file to disk |
| Copy Name | Copies filename to clipboard |
**Effort**: 🟡 45 minutes

---

## Layer 2: File Management

### 2.1 Visible Delete Button on Hover
**What**: Trash icon appears on file item hover (right side)
**Where**: `file-item.tsx` — add conditional Trash2 icon button
**Behavior**: Same as right-click → Delete
**Effort**: 🟢 10 minutes

### 2.2 Load Entire Folder
**What**: "Choose folder" button loads all supported files from a directory
**Where**: `sidebar.tsx`
**Current**: Uses `<input type="file" multiple>` (flat file picker)
**New**: Use `showDirectoryPicker()` with recursive folder scan
**Fallback**: Keep existing `<input webkitdirectory>` as fallback
**Behavior**:
  - Scan directory recursively
  - Filter for `.txt, .md, .json, .html, .css`
  - Import all matching files at once
  - Show toast "N files loaded from {folderName}"
**Effort**: 🟡 30 minutes

### 2.3 Workspace File Tree View
**What**: Left panel gets two tabs: "Workspace" and "File Tree"
**Where**: New `workspace-panel.tsx` component wrapping sidebar
**Tabs**:
| Tab | Content |
|---|---|
| **Workspace** | Current sidebar (import, new file, recent files) |
| **File Tree** | Hierarchical folder/file view from loaded folder |
**File Tree Features**:
- Collapsible folders
- File type icons (different color per extension)
- Click to open, double-click to focus editor
- Drag to reorder? (stretch goal)
**Effort**: 🔴 90 minutes

---

## Layer 3: AI Chat Integration

### 3.1 Append AI Output to Document
**What**: Button in AI panel to append current AI output to active file
**Where**: `ai-panel.tsx` — add "Append →" button next to "Run →"
**Behavior**:
  - Gets `aiOutput` from store
  - Appends `\n\n--- AI Output ---\n{output}\n` to active file content
  - Updates store + IndexedDB
  - Shows toast "Appended to {filename}"
**Effort**: 🟢 15 minutes

### 3.2 Copy AI Output
**What**: Copy button to clipboard
**Where**: `ai-panel.tsx` — add "📋" copy icon button in output header
**Behavior**:
  - Copies `aiOutput` to clipboard via `navigator.clipboard.writeText()`
  - Shows toast "Copied to clipboard"
**Effort**: 🟢 5 minutes

### 3.3 Chat History Persistence
**What**: AI conversation saved per file in IndexedDB
**Where**: `indexeddb.ts` — add `conversations` object store
**Schema**: `{ fileId: string, messages: {role, content}[], updatedAt: string }`
**Behavior**:
  - Switching files loads/saves that file's conversation
  - Clear button resets conversation for current file
**Effort**: 🟡 30 minutes

---

## Layer 4: Skills System

### 4.1 Skill.md Format
**What**: Support `.md` files as AI skill definitions
**Skill.md Structure**:
```markdown
---
name: Code Reviewer
description: Reviews code for bugs and best practices
version: 1.0
---

# System Prompt
You are an expert code reviewer...

# Instructions
1. Analyze the code structure
2. Check for bugs
3. Suggest improvements

# Input Format
The user will provide code snippets...

# Output Format
Return findings as a markdown list...
```

### 4.2 Skill Registry
**What**: IndexedDB store for discovered/loaded skills
**Schema**:
```typescript
interface Skill {
  id: string;
  name: string;
  description: string;
  version: string;
  systemPrompt: string;
  instructions: string;
  sourceFile: string;  // filename or 'custom'
  createdAt: string;
}
```

### 4.3 Skill Panel in AI
**What**: New "Skills" tab or mode in AI panel
**Where**: `ai-panel.tsx` — add 7th mode button "Use skill"
**Behavior**:
  - Clicking "Use skill" shows skill selector dropdown
  - Selecting a skill loads its system prompt
  - AI output follows the skill's output format
  - Skills listed from registry + any loaded .md skill files
**Effort**: 🔴 120 minutes

### 4.4 Skill Execution
**What**: When a skill is active, AI requests include the skill's full prompt
**Where**: `ai-panel.tsx` prompt builder
**Flow**:
```
User selects "Code Reviewer" skill
  → System prompt = skill.systemPrompt
  → User prompt = active file content + user's additional question
  → AI response follows skill's output format
```
**Effort**: 🟡 45 minutes

---

## Layer 5: Project Management

### 5.1 Project Data Model
```typescript
interface Project {
  id: string;
  name: string;
  description: string;        // max 1000 chars
  instructions: string;       // detailed instructions
  files: ProjectFile[];       // up to 5 reference files
  createdAt: string;
  updatedAt: string;
}

interface ProjectFile {
  id: string;
  name: string;
  content: string;
  fileType: string;  // .txt, .md, .json, .html, .css
}
```

### 5.2 Project Creation Modal
**What**: "+" button opens project creation modal
**Fields**:
| Field | Type | Constraint |
|---|---|---|
| Project Name | text input | Required, max 100 chars |
| Instructions | textarea | Required, max 1000 chars |
| Reference Files | file upload | Up to 5 files (.txt, .md, .json, .html, .css) |
**Where**: New button in sidebar "Workspace" section + Settings modal
**Effort**: 🔴 90 minutes

### 5.3 Project Selector
**What**: Dropdown or panel to switch between projects
**Where**: Sidebar top section or Topbar
**Behavior**:
  - Lists all projects from IndexedDB
  - Clicking a project loads its context (instructions + files)
  - AI panel uses project instructions as system prompt when active
**Effort**: 🟡 45 minutes

### 5.4 Project Context in AI
**What**: When a project is active, AI requests include project context
**Flow**:
```
Active Project: "Code Review Helper"
  → System prompt = project.instructions + skill prompt (if any)
  → Available context = project reference files
  → User can reference: "See reference file X"
```
**Effort**: 🟡 30 minutes

---

## Layer 6: Persona & AI Configuration

### 6.1 Master Prompt / Persona
**What**: Global AI instructions that apply to all interactions
**Schema**:
```typescript
interface Persona {
  name: string;            // e.g., "Senior Developer"
  systemPrompt: string;    // e.g., "You are a senior developer who..."
  tone: string;            // e.g., "professional", "casual"
  isActive: boolean;
}
```

### 6.2 Tabbed Settings Modal
**What**: Replace single-panel settings with tabbed interface
**Tabs**:

| Tab | Contents |
|---|---|
| **General** | Theme, spellcheck, auto-save toggle, word wrap default |
| **AI Providers** | Z.ai (NEW), Ollama, Gemini with model selection |
| **Persona** | Create/edit persona, master prompt editor |
| **Projects** | Project list, create/edit/delete projects |
| **Skills** | Skill registry, import skill.md, manage skills |
| **About** | App version, data stats, clear data button |

**Where**: Complete rewrite of `settings-modal.tsx`
**Effort**: 🔴 150 minutes

### 6.3 Z.ai as AI Provider
**What**: Add Z.ai as selectable provider in settings
**Current**: z-ai-web-dev-sdk is used directly (no selector)
**New**: Add as explicit option alongside Ollama/Gemini
**Settings UI**:
```
[ ] Local (Ollama)     → localhost:11434
[ ] Cloud (Gemini)     → API key required
[*] Z.ai (Built-in)    → No config needed ← DEFAULT
```
**Effort**: 🟢 15 minutes

### 6.4 Expanded Model Selection
**What**: Dropdown with multiple model options per provider
**Ollama models**: qwen2.5:7b, llama3:8b, mistral:7b, codellama:13b (custom)
**Gemini models**: gemini-2.0-flash, gemini-1.5-pro, gemini-1.5-flash
**Z.ai models**: default (no selection needed)
**Where**: Settings → AI Providers tab
**Effort**: 🟡 30 minutes

### 6.5 Persona-Aware AI
**What**: Active persona injected into all AI requests
**Flow**:
```
AI Request Priority (highest to lowest):
1. Skill system prompt (if skill active)
2. Project instructions (if project active)
3. Persona / Master Prompt (if set)
4. Default system prompt (fallback)
```
**Effort**: 🟡 30 minutes

---

## 📊 Effort Summary

| Layer | Features | Effort | Dependencies |
|---|---|---|---|
| **1. Foundation** | 1.1–1.4 | ~80 min | None |
| **2. File Mgmt** | 2.1–2.3 | ~130 min | Layer 1 |
| **3. AI Chat** | 3.1–3.3 | ~50 min | Layer 1 |
| **4. Skills** | 4.1–4.4 | ~165 min | Layer 3 |
| **5. Projects** | 5.1–5.4 | ~165 min | Layer 3 + 4 |
| **6. Persona** | 6.1–6.5 | ~225 min | Layer 4 + 5 |
| **TOTAL** | **24 tasks** | **~815 min** | — |

---

## 🗓️ Recommended Build Order

### Session 1: Foundation + File Mgmt (Layer 1 + 2)
```
[  ] 1.1 Multi-format file support
[  ] 1.2 Spellcheck enable
[  ] 1.3 Export/Download to disk
[  ] 1.4 Right-click context menu (full)
[  ] 2.1 Visible delete button on hover
[  ] 2.2 Load entire folder
[  ] 2.3 Workspace file tree view (stretch)
```

### Session 2: AI Chat + Skills (Layer 3 + 4)
```
[  ] 3.1 Append AI output to document
[  ] 3.2 Copy AI output
[  ] 3.3 Chat history persistence
[  ] 4.1 Skill.md format definition
[  ] 4.2 Skill registry (IndexedDB)
[  ] 4.3 Skill panel in AI
[  ] 4.4 Skill execution pipeline
```

### Session 3: Projects + Persona (Layer 5 + 6)
```
[  ] 5.1 Project data model
[  ] 5.2 Project creation modal
[  ] 5.3 Project selector
[  ] 5.4 Project context in AI
[  ] 6.1 Master Prompt / Persona
[  ] 6.2 Tabbed Settings Modal
[  ] 6.3 Z.ai as provider option
[  ] 6.4 Expanded model selection
[  ] 6.5 Persona-aware AI pipeline
```

---

## 📐 New Data Schemas (Required)

```typescript
// Add to IndexedDB + Zustand store

interface Project {
  id: string;
  name: string;
  description: string;
  instructions: string;
  files: ProjectFile[];
  createdAt: string;
  updatedAt: string;
}

interface ProjectFile {
  id: string;
  name: string;
  content: string;
  fileType: string;
}

interface Skill {
  id: string;
  name: string;
  description: string;
  version: string;
  systemPrompt: string;
  instructions: string;
  outputFormat?: string;
  sourceFile: string;
  createdAt: string;
}

interface Persona {
  id: string;
  name: string;
  systemPrompt: string;
  tone: string;
  isActive: boolean;
}

// Updated TextFile
interface TextFile {
  id: string;
  name: string;
  content: string;
  tags: string[];
  summary: string | null;
  fileType: string;        // NEW: 'txt' | 'md' | 'json' | 'html' | 'css'
  parentId: string | null;  // NEW: folder ID for file tree
  projectId: string | null; // NEW: associated project
  createdAt: string;
  updatedAt: string;
  size: number;
  lines: number;
}

// Updated AI Settings
interface AISettings {
  provider: 'zai' | 'local' | 'cloud';  // NEW: 'zai' option
  ollamaUrl: string;
  ollamaModel: string;
  geminiApiKey: string;
  geminiModel: string;
}
```

---

## ⚠️ Open Questions (Need Your Input)

1. **File Tree Persistence** — Should loaded folder structures persist across sessions, or rescan on each app open?

2. **Project AI Context** — When a project is active, should the AI automatically see all 5 reference files, or should the user explicitly select which ones to include per request?

3. **Skill Discovery** — Should skills auto-discover from loaded .md files, or only from explicit import in settings?

4. **Persona Limits** — Should the user be able to create multiple personas and switch between them, or just one master persona?

5. **Project Scope** — Can a file belong to multiple projects, or is it strictly one-to-many (file → one project)?

---

*Plan follows B.L.A.S.T. Protocol — Data-First, Partial Override, Deterministic Merge.*
*No code will be written until you approve the plan and answer the open questions.*
