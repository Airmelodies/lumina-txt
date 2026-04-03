// ─── About Terminal — Pre-loaded Documents ──────────────────
// Static content for the `read` command in the About Terminal.
// Each doc is rendered in the immersive CRT reader.

export interface AboutDoc {
  title: string;
  content: string;
}

export const ABOUT_DOCS: AboutDoc[] = [
  {
    title: 'Keyboard Shortcuts',
    content: `LUMINA TXT — Keyboard Shortcuts
═══════════════════════════════════════════════

 FILE OPERATIONS
──────────────────────────────────────────────
  Ctrl+S / ⌘S        Save file
  Ctrl+Shift+S        Export (save a copy to disk)

  EDITING
──────────────────────────────────────────────
  Ctrl+B / ⌘B        Bold markdown (**text**)
  Ctrl+I / ⌘I        Italic markdown (*text*)
  Tab                 Insert 2 spaces
  Ctrl+Z              Undo
  Ctrl+Y / Ctrl+Shift+Z  Redo

  NAVIGATION
──────────────────────────────────────────────
  Ctrl+F / ⌘F        Browser find in file
  ↑ ↓ ← →            Move cursor
  Home / End          Jump to line start / end
  Ctrl+Home           Jump to document start
  Ctrl+End            Jump to document end
  Page Up / Page Down   Scroll by page

  PANELS
──────────────────────────────────────────────
  Ctrl+S              Save (also writes to default directory if set)
  Click Find icon     Browser find in editor
  Settings gear       Open Settings modal
  Panel toggles       Toggle sidebar / AI panel

  TERMINAL (this screen)
──────────────────────────────────────────────
  help                Show available commands
  status              Show workspace diagnostics
  ls                  List workspace files
  read                Open document reader
  read <filename>     Read a workspace file
  clear               Clear terminal output
  date                Show current date
  reboot              Replay boot sequence
  exit                Close terminal`,
  },
  {
    title: 'Quick Start Guide',
    content: `LUMINA TXT — Quick Start Guide
═══════════════════════════════════════════════

 GETTING STARTED
──────────────────────────────────────────────
  1. CREATE A FILE
     Click "+ New File" in the sidebar,
     or right-click the sidebar for options.
     Supported formats: .txt .md .json .html .css

  2. WRITE & EDIT
     The editor supports markdown formatting
     via the toolbar (H1, H2, Bold, Italic, List,
     Code Block). Use Ctrl+B / Ctrl+I for inline
     formatting shortcuts.

  3. SAVE YOUR WORK
     Ctrl+S saves to browser storage instantly.
     Set a "Default Save Directory" in Settings
     to also auto-save files to disk.

  4. EXPORT TO DISK
     Click "Export" in the editor topbar to save
     a copy anywhere on your computer.

  5. USE AI ASSIST
     Click "AI Assist" to open the AI panel.
     Choose a mode: Summarize, Tag, Rewrite,
     Extract Tasks, Search, Chat, or Skill.
     AI runs entirely in your browser — no data
     leaves your machine.

  6. MANAGE PROJECTS
     Create projects in Settings > Projects.
     Add reference files and custom instructions
     to give AI full context about your work.

 SIDE PANELS
──────────────────────────────────────────────
  LEFT SIDEBAR
    Workspace  — Quick access to all open files
    File Tree  — Folder-based file browser
    Skills     — Import .md skill definitions

  RIGHT PANEL
    AI Assist  — Intelligent text tools

  All data stays on your machine. Zero cloud.
  Install as a PWA for offline access.`,
  },
  {
    title: 'AI Providers',
    content: `LUMINA TXT — AI Providers
═══════════════════════════════════════════════

 OVERVIEW
──────────────────────────────────────────────
  Lumina TXT supports three AI providers.
  Configure in Settings > AI Providers.

  Z.AI (Built-in) — DEFAULT
    No configuration required.
    Works immediately, fully offline capable.
    Best for: quick tasks, summaries, tagging.

  LOCAL (Ollama)
    Run your own AI model on your machine.
    Requires: Ollama installed (ollama.com)
    Set URL: http://localhost:11434 (default)
    Models: qwen2.5:7b, llama3:8b, mistral:7b
    Best for: full privacy, no internet needed.

  CLOUD (Gemini)
    Use Google's Gemini API for powerful AI.
    Requires: Gemini API key (free tier available)
    Models: gemini-2.0-flash, gemini-1.5-pro
    Best for: complex tasks, long documents.

 PERSONA SYSTEM
──────────────────────────────────────────────
  Set a master persona in Settings > Persona.
  Define a custom name, tone, and system prompt.
  Projects can override the persona for
  specialized contexts.

 SKILLS
──────────────────────────────────────────────
  Import .md files as AI skill definitions.
  Skills provide structured prompts for
  specific tasks (code review, writing, etc.)
  The Skill Router can auto-select the best
  skill based on user input.`,
  },
  {
    title: 'Projects & Skills',
    content: `LUMINA TXT — Projects & Skills
═══════════════════════════════════════════════

 PROJECTS
──────────────────────────────────────────────
  Projects organize your files and give AI
  full context about your work.

  CREATE A PROJECT
    Settings > Projects > "+ New Project"
    Fill in: name, description, instructions

  REFERENCE FILES (up to 5)
    Attach files that AI should know about.
    Set context mode for each:
      always-on  — Always included in AI prompts
      optional   — Available but not auto-included
      never      — Ignored by AI

  PERSONA OVERRIDE
    Each project can have its own persona,
    overriding the master persona for that
    project's AI interactions.

  PROJECT INSTRUCTIONS
    Up to 1000 characters of detailed
    instructions for the AI. This is the
    project's "bible" — be specific.

 SKILLS
──────────────────────────────────────────────
  Skills are .md files with YAML frontmatter
  that define specialized AI behaviors.

  IMPORT A SKILL
    Sidebar > Skills tab > "Import Skill"
    Select a .md file from your computer.

  SKILL FILE FORMAT
    ---
    name: Code Reviewer
    description: Reviews code for bugs
    priority: 80
    ---
    # Instructions
    Review the following code...

  SKILL ROUTER
    When AI mode is set to "Skill", the router
    automatically selects the best skill
    based on user input and skill priority.`,
  },
  {
    title: 'Changelog',
    content: `LUMINA TXT — Changelog
═══════════════════════════════════════════════

 v0.1.0 — Foundation
  - Core editor with syntax-aware display
  - IndexedDB persistence (zero cloud)
  - File management (create, rename, duplicate)
  - Markdown formatting toolbar
  - AI Assist panel (summarize, tag, rewrite)
  - Dark terminal aesthetic

 v0.2.0 — Intelligence
  - Multi-turn AI conversation with persistence
  - Skill system (.md import + registry)
  - Projects with reference files
  - Master persona system
  - 6-tab Settings modal
  - Z.ai, Ollama, Gemini providers
  - File tree sidebar
  - PWA installable

 v0.3.0 — Polish
  - Close/Unload files from workspace
  - Save to disk (File System Access API)
  - Formatting toolbar (H1, H2, B, I, List, Code)
  - Brightness & contrast controls
  - Skill Router (auto-select best skill)
  - Ctrl+S dual-write (IndexedDB + disk)
  - Default save directory in Settings
  - Spellcheck toggle
  - AI Assist context styling

 v0.4.0 — Terminal
  - CRT About Terminal (easter egg)
  - Immersive document reader
  - Boot sequence splash screen
  - Real-time workspace stats`,
  },
  {
    title: 'Credits',
    content: `LUMINA TXT — Credits
═══════════════════════════════════════════════

 BUILT WITH
──────────────────────────────────────────────
  Framework      Next.js 16 (App Router)
  Language       TypeScript 5
  Styling        Tailwind CSS 4
  Components     shadcn/ui (New York)
  State          Zustand
  Database       IndexedDB via Prisma ORM
  Icons          Lucide React
  Notifications  Sonner
  AI Backend     z-ai-web-dev-sdk

 DESIGN PHILOSOPHY
──────────────────────────────────────────────
  Local-first. Zero cloud. Your data stays
  on your machine. No accounts, no tracking,
  no subscriptions.

  Terminal aesthetic inspired by CRT displays,
  vintage computing, and hacker culture.

  Built for writers, developers, and thinkers
  who want a focused, distraction-free text
  environment with AI superpowers.

 SPECIAL THANKS
──────────────────────────────────────────────
  IBM Plex Mono font family
  The Tailwind CSS team
  The shadcn/ui community
  The Vercel team (Next.js)

  LUMINA TXT
  AI-Powered Text Manager
  v0.4.0`,
  },
];
