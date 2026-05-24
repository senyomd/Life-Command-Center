# Changelog

## v1.0.2 — Keyboard Navigation

- **Added**: Escape key support to close/cancel input forms
- **Impact**: Users can now cancel input entry with Escape (standard keyboard UX)
- **Files Changed**: Finance.jsx
- **Why**: Improves keyboard accessibility and matches standard form behavior
- **Behavior**:
  - Enter: Save the entry
  - Escape: Cancel and close form (clear inputs, hide form)

## v0.1.0

- Routing shell: 6 modes (Home, Work, Personal Learning, Class, Entertainment, Finance) with hash-based JS routing
- Mode-aware theming: ambient glow, header border, nav tab, and badge colors shift per mode
- Shared header: live clock, global day streak chip, mode badge with pulse indicator
- Pomodoro module (Learning mode): PomodoroEngine class with full start/pause/resume/stop/complete lifecycle, localStorage persistence, session history, and energy/focus quality rating modal
