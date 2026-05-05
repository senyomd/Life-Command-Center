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
