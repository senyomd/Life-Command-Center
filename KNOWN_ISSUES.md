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
- **Status**: Fixed
- **Severity**: Low
- **Description**: Kanban task cards and Today's Tasks rows showed Pomodoro session count but not total time spent
- **Root Cause**: `buildTaskCard()` only used `t.linkedSessions.length` — never called `getPerTaskStats()` to get duration
- **Fix**: Added `formatTimeSpent()` helper; `buildTaskCard()` calls `getPerTaskStats()` when sessions exist and renders `⏱ Xh Ym`; Today's Tasks in-progress rows also show time spent
- **Date Discovered**: 2026-05-05
