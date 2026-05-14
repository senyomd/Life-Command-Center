# Known Issues

## Issue #1: Pomodoro Timer Pauses on Tab Switch
- **Status**: Open (scheduled for later)
- **Severity**: Medium
- **Description**: When user switches tabs or minimizes browser, Pomodoro timer pauses due to browser visibility throttling
- **Root Cause**: setInterval() is throttled by browser when page loses focus
- **Impact**: Timer doesn't run in background, confuses user about elapsed time
- **Solution (Proposed)**: Implement Page Visibility API to detect tab visibility, pause/resume appropriately
- **Workaround**: Keep tab in focus while timer runs
- **Date Discovered**: 2026-05-05

---

## Issue #2: Task Cards Missing Time Spent Display
- **Status**: ✅ Fixed (commit `bd4dbc1`)
- **Severity**: Low
- **Description**: Kanban task cards and Today's Tasks rows showed Pomodoro session count but not total time spent
- **Root Cause**: `buildTaskCard()` only used `t.linkedSessions.length` — never called `getPerTaskStats()` to get duration
- **Fix**: Added `formatTimeSpent()` helper; `buildTaskCard()` calls `getPerTaskStats()` when sessions exist and renders `⏱ Xh Ym`; Today's Tasks in-progress rows also show time spent
- **Date Discovered**: 2026-05-05

---

## Issue #3: Infinite Page Reload on All Routes
- **Status**: ✅ Fixed (commit `e04d078`)
- **Severity**: Critical
- **Description**: All pages reloaded infinitely immediately after load — app was unusable
- **Root Cause**: `Nav.jsx` had a Zustand action (`setMode`) in the `useEffect` dependency array. Zustand v5 uses `useSyncExternalStore` under the hood. When `setMode(match.mode)` fired in the effect, the Zustand store updated → Zustand notified all subscribers → `useSyncExternalStore` snapshot re-evaluated → Nav re-rendered → `setMode` appeared as a changed dep → effect fired again → infinite loop
- **Fix**: Removed `setMode` from `useEffect` deps. Dep array changed from `[location.pathname, setMode]` to `[location.pathname]`
- **Lesson**: Zustand v5 actions are stable references created once at store initialization. They must **never** be listed in `useEffect` dependency arrays
- **Date Discovered**: 2026-05-14
