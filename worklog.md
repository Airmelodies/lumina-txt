# Lumina TXT — Worklog

## Restore Points (Git Commits)
| Commit | Description |
|--------|-------------|
| `7910481` | Initial commit |
| `b75f344` | Pre-terminal working state |
| `fdec0bf` | **Rollback checkpoint** — CRT About Terminal removed, clean v0.3.0 |
| `18e269e` | Fix: service worker cache fix (stale HTML blocking hydration) |
| `2f41746` | Fix: removed body::after scanline overlay (screen flicker) |

**To rollback to last known good state:**
```bash
git checkout fdec0bf -- src/
```

---
## Known Issues & Solutions

### Issue: Preview Panel Blank / "Loading workspace…" Forever
**Root Cause:** Service worker (`sw.js`) cached the app shell HTML (`/`). When the dev server restarts, Turbopack generates new JavaScript chunk filenames with different hashes. The cached HTML still points to OLD chunk URLs → JS fails to load → app stuck at loading spinner.

**Fix (commit 18e269e):**
- Removed `/` from service worker STATIC_ASSETS cache
- Skip `/_next/` and HMR URLs from caching
- Bumped cache version v1 → v2 to invalidate old caches
- Never serve cached HTML for navigation requests

### Issue: Screen Flickering in Preview Panel
**Root Cause:** `body::after` pseudo-element with `z-index: 9999` created a fixed scanline overlay across the entire viewport. This was a CRT terminal aesthetic leftover (from the About Terminal feature) that was NOT removed during rollback.

**Fix (commit 2f41746):** Removed the `body::after` scanline texture entirely from globals.css.

### Issue: Dev Server Dies Between Tool Calls
**Root Cause:** The sandbox environment terminates all child processes when a bash tool call ends. Background processes started with `&`, `nohup`, `setsid`, etc. do NOT survive.

**Workaround:** Start the server and keep the tool call alive with `sleep N` at the end. The Preview Panel works as long as the tool call is running. User may need to wait for the agent's tool call to complete before refreshing.

### Issue: Stale Turbopack Build Cache
**Root Cause:** After deleting files (like about-terminal.tsx), the `.next/` directory retained compiled chunks referencing the deleted files. Turbopack tried to load these non-existent modules.

**Fix:** Delete `.next/` directory: `rm -rf .next`

---
## Task History

### Task 1: Rollback CRT About Terminal Feature
- Agent: Main Agent
- Deleted: about-terminal.tsx, about-docs.ts (-892 lines)
- Reverted: use-lumina-store.ts, settings-modal.tsx, page.tsx, globals.css
- Result: Clean v0.3.0 state, lint passes, HTTP 200

### Task 2: Fix Preview Panel Not Showing App
- Agent: Main Agent
- Diagnosed with browser agent (agent-browser): page stuck on "Loading workspace…"
- Root cause: stale service worker cache
- Fixed sw.js: network-first for app shell, skip /_next/ caching

### Task 3: Fix Screen Flickering
- Agent: Main Agent
- Root cause: body::after scanline overlay leftover from CRT feature
- Removed scanline pseudo-element from globals.css
