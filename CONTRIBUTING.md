# Contributing to Lumina-TXT

Thank you for your interest in contributing to Lumina-TXT! This document outlines the development workflow and standards for the project.

## 🛠️ Development Setup

Lumina-TXT uses **Bun** as its primary package manager and runtime.

1.  **Install Dependencies**:
    ```bash
    bun install
    ```

2.  **Start Dev Server**:
    ```bash
    bun run dev
    ```
    Alternatively, use the convenience scripts:
    ```bash
    ./.zscripts/dev.sh
    ```

3.  **Database Management (Prisma)**:
    Lumina-TXT uses Prisma for schema management (mainly for future-proofing or heavy local persistence).
    ```bash
    bun run db:push
    ```

## 📂 Project Structure

- `src/app`: Next.js App Router (Routing & Layouts).
- `src/components/lumina`: Core UI components (Editor, Sidebar, AI Panel).
- `src/store`: Zustand store for central state management.
- `src/lib`: Utilities for IndexedDB, Cryptography (Vault), and AI interactions.
- `.zscripts`: Shell scripts for build, deployment, and service management.

## 📜 Standards & Guidelines

### 1. Code Style
- Use **TypeScript** for all new features.
- Follow **React 19** best practices (e.g., using `use` hook, transition APIs where appropriate).
- Styling: Use **Tailwind CSS 4** utility classes. Prefer pre-defined design tokens in `globals.css`.

### 2. State Management
- Prefer adding new state to a slice in the Zentand store (`src/store/use-lumina-store.ts`) rather than local component state if it needs to persist across views.

### 3. Security (The Vault)
- **Never** log API keys or sensitive user data to the console.
- Any new sensitive fields should be added to the encryption/decryption logic in `src/lib/indexeddb.ts` and `src/lib/vault.ts`.

## 🚀 Committing Changes

- Provide clear, descriptive commit messages.
- Ensure the project builds successfully (`bun run build`) before pushing.
- If your change modifies the persistence layer, increment the `DB_VERSION` in `src/lib/indexeddb.ts` and handle migrations.

---
*Lumina-TXT: A Local-First AI IDE Experience.*
