# Changelog

## v1.1.3 — Focus Score Visual Feedback

- **Added**: Color-coded focus score gradient
- **Impact**: Instantly communicates health status without reading numbers
- **Files Changed**: Home.jsx
- **Why**: Colors trigger immediate intuitive understanding (red=bad, green=good)
- **Scale**:
  - Red: <40 (Needs Work)
  - Yellow: 40–60 (Fair)
  - Blue: 60–80 (Healthy)
  - Green: 80+ (Excellent)

## v1.1.2 — Habit Streak Celebration

- **Added**: Fire emoji (🔥) to active habit streaks
- **Impact**: Gamifies habit tracking, celebrates consistency
- **Files Changed**: Home.jsx
- **Why**: Visual reward reinforces positive behavior and motivates continuation
- **Display**: "🔥 3-day streak" with best streak shown alongside

## v1.1.1 — Home Dashboard Polish

- **Added**: Delta arrows (↑↓→) on metric cards
- **Impact**: Instantly shows trend direction (up/down/stable) vs last week
- **Files Changed**: Home.jsx
- **Why**: Visual feedback helps users understand performance trends at a glance
- **Example**: "Task Completion: ↑ +5%" (green arrow = improving)
- **Data source**: `AnalyticsEngine.getStatsComparison()` — real this-week vs last-week deltas

## v1.0.3 — Input Validation

- **Added**: Inline validation errors for invalid input
- **Impact**: Users get immediate feedback on form errors
- **Files Changed**: Finance.jsx, Finance.css
- **Why**: Prevents silent failures and clarifies what went wrong
- **Validation Rules**:
  - Item name: Required, non-empty
  - Amount: Must be a number greater than $0
- **Error Display**: Red alert message below form with clear feedback

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
