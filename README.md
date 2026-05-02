# Life Command Center

A personal life operating system built as a single-page app with hash-based routing, localStorage persistence, and mode-aware theming.

## Overview

Life Command Center (LCC) is a unified dashboard for tracking productivity, learning, class work, entertainment consumption, and finances — all in one place. Each mode has its own color ambiance, dedicated UI, and data model.

## Features

- **6 modes** — Home, Work, Personal Learning, Class, Entertainment, Finance
- **Mode-aware theming** — ambient glow, header tint, and accent colors shift per mode
- **Pomodoro engine** — fully custom duration, pause/resume/stop, energy + focus quality ratings
- **Session persistence** — all timer state and session history survive page reloads via localStorage
- **Hash-based routing** — no server required, bookmarkable URLs (`#learning`, `#work`, etc.)
- **Global streak counter** — day streak displayed in the header across all modes

## Architecture

```
DashBoard/
├── index.html          # Markup and page structure
├── styles.css          # All styling, mode theming, component styles
├── app.js              # Routing, clock, streak, pomodoroUI controller
├── PomodoroEngine.js   # Standalone timer engine (no UI dependency)
├── README.md
└── CHANGELOG.md
```

**Data layer:** localStorage only — no backend, no build step.

**Key localStorage keys:**
- `lcc_user` — user profile and streak
- `pomodoro_state_{mode}` — current timer state per mode
- `pomodoro_sessions_{mode}` — session history array per mode
