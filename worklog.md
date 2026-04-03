# Lumina TXT — Worklog & Known Issues

## Restore Points (Git Commits)
| Commit | Description |
|--------|-------------|
| `7910481` | Initial commit |
| `b75f344` | Pre-terminal working state |
| `fdec0bf` | **Rollback checkpoint** — CRT About Terminal removed, clean v0.3.0 |
| `18e269e` | Fix: service worker cache fix (stale HTML blocking hydration) |
| `2f41746` | Fix: removed body::after scanline overlay (screen flicker) |
| `996883d` | Fix: disable service worker in dev, auto-unregister existing SWs |

**To rollback to last known good state:**
```bash
git checkout 996883d -- src/
# or for the cleanest pre-terminal state:
git checkout fdec0bf -- src/
```

---
## Known Issues & Solutions

### Issue: Preview Panel Blank / "Loading workspace…" Forever
**Root Cause:** Service worker (`sw.js`) cached the app shell HTML (`/`). When the dev server restarts, Turbopack generates new JavaScript chunk filenames with different hashes. The cached HTML still points to OLD chunk URLs → JS fails to load → app stuck at loading spinner.

**Fix (commits 18e269e, 996883d):**
- SW registration now disabled in development (`NODE_ENV !== 'production'`)
- In dev mode, actively unregisters any existing service workers
- sw.js also updated: skip `/_next/` from caching, don't cache app shell
- Bumped cache version v1 → v2 to invalidate old caches

### Issue: Screen Flickering in Preview Panel
**Root Cause:** `body::after` pseudo-element with `z-index: 9999` created a fixed scanline overlay across the entire viewport. This was a CRT terminal aesthetic leftover from the About Terminal feature that was NOT removed during rollback.

**Fix (commit 2f41746):** Removed the `body::after` scanline texture entirely from globals.css.

### Issue: Dev Server Dies Between Agent Tool Calls
**Root Cause:** The sandbox environment terminates all child processes when a bash tool call ends. Background processes started with `&`, `nohup`, `setsid`, etc. do NOT survive between tool calls.

**Workaround:** This is a sandbox limitation, not a code bug. The dev server only runs while a tool call with `sleep N` is active. No systemd, screen, or tmux available.

### Issue: Stale Turbopack Build Cache After File Deletion
**Root Cause:** After deleting files (like about-terminal.tsx), the `.next/` directory retained compiled chunks referencing the deleted files.

**Fix:** Delete `.next/` directory: `rm -rf .next`

---
## Task History

### Task 1: Rollback CRT About Terminal Feature
- Deleted: about-terminal.tsx, about-docs.ts (-892 lines)
- Reverted: use-lumina-store.ts, settings-modal.tsx, page.tsx, globals.css
- Result: Clean v0.3.0 state, lint passes, HTTP 200

### Task 2: Fix Preview Panel Not Showing App
- Diagnosed with browser agent: page stuck on "Loading workspace…"
- Root cause: stale service worker cache
- Fixed sw.js + disabled SW in dev mode

### Task 3: Fix Screen Flickering
- Root cause: body::after scanline overlay leftover from CRT feature
- Removed scanline pseudo-element from globals.css
