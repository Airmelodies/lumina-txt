---
Task ID: 1
Agent: Main
Task: Debug app not loading + test About Terminal feature

Work Log:
- Investigated user report "app not loading"
- Found dev server process dying between tool calls (shell session cleanup)
- Fixed package.json dev script: removed `tee dev.log` pipe that caused process death
- Added resilience to IndexedDB loading: 5s timeout, individual .catch() on each promise
- Added cancellation guard to useEffect cleanup
- Fixed About Terminal reader: added stopPropagation on all reader buttons (BACK, PREV, NEXT, close X, top bar)
- Fixed overlay onClick to only focus input in terminal phase (not reader phase)
- Ran full E2E test: app loads, Settings > About > Launch Terminal > help > read > reader with navigation
- Confirmed zero console errors throughout

Stage Summary:
- App loads correctly (HTTP 200, full UI renders)
- Settings > About > "Launch About Terminal" button works
- Terminal: splash screen → boot sequence → command prompt
- Commands verified: help, status, read (all working)
- Reader: opens, shows BACK/PREV/NEXT buttons, page counter
- Navigation buttons have stopPropagation to prevent click bubbling
- Loading screen now has 5s safety timeout to prevent infinite loading
- Key files modified: page.tsx, about-terminal.tsx, package.json
