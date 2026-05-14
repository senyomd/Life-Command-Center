# Architecture Overview

## System Design

Life Command Center uses a **layered architecture**:

```
UI Layer        (React Components)
      ↓
State Mgmt      (Zustand Store)
      ↓
Custom Hooks    (useEngine patterns)
      ↓
Pure Engines    (No UI dependencies)
      ↓
Persistence     (localStorage)
```

## Core Principle

**Separation of Concerns:**
- Engines = pure calculation logic
- Hooks = engine integration with React
- Components = UI only
- Store = global UI state

This allows engines to be:
- Testable (no DOM, no React)
- Reusable (vanilla JS, used in both vanilla and React app)
- Deterministic (same inputs → same outputs)

---

## Engines

### 1. PomodoroEngine

**Purpose:** Manage Pomodoro sessions with full timer lifecycle.

**State:**
```
currentSessionId  (UUID)
duration          (seconds)
remaining         (seconds)
isRunning         (boolean)
interrupted       (boolean)
startedAt         (ISO string)
pausedAt          (ISO string | null)
```

**Key Methods:**
- `start(minutes)` — Begin session
- `pause()` / `resume()` — Pause/resume timer
- `stop()` — End early with `interrupted=true`
- `getSessions(limit)` — Retrieve session history
- `rateLastSession(energyLevel, focusQuality)` — Add post-session ratings

**Persistence:**
- `pomodoro_state_{mode}` — Current session state
- `pomodoro_sessions_{mode}` — Session history array

**Tests:** 105+ (lifecycle, persistence, ratings)

---

### 2. HabitEngine

**Purpose:** Track daily habits with streak calculation.

**State:**
- 5 habits (3 manual + 2 auto-derived)
- `completions` map: `{ [YYYY-MM-DD]: true }`
- Streak: current + best

**Key Methods:**
- `toggleHabit(id, date)` — Manual toggle
- `checkAutoHabits()` — Derive from Pomodoro session data
- `getWeekDates(start)` — 7-day date array
- `getStreak(id)` — Current streak for a habit

**Auto Habits:**
- "No Phone During Pomodoro" — 0 interrupted sessions today
- "Deep Work Completed" — 3+ Pomodoro sessions today

**Persistence:** `lcc_habits`

**Tests:** 34 (toggling, streaks, auto-derivation)

---

### 3. TaskEngine

**Purpose:** Manage tasks with status transitions and Pomodoro session linking.

**Task Schema:**
```json
{
  "id": "uuid",
  "title": "string",
  "description": "string",
  "mode": "work | learning | class | personal",
  "priority": "low | medium | high",
  "status": "todo | in_progress | done",
  "deadline": "YYYY-MM-DD | null",
  "estimatedPomodoros": 2,
  "linkedSessions": ["sessionId", ...],
  "tags": [],
  "createdAt": "YYYY-MM-DD",
  "completedAt": "YYYY-MM-DD | null"
}
```

**Key Methods:**
- `createTask(opts)` / `deleteTask(id)` — CRUD
- `setStatus(id, status)` — State machine transitions
- `linkSession(taskId, sessionId)` — Link Pomodoro session
- `getTasksByStatus(status)` — Filter by column
- `getTodayTasks()` — Priority bucket: inProgress > overdue > dueToday > createdToday

**Rules:**
- `todo → done` is blocked (must pass through `in_progress`)
- Pomodoro completion auto-increments linked session count

**Persistence:** `lcc_tasks`

**Tests:** 81 (CRUD, transitions, Pomodoro linking)

---

### 4. FinanceEngine

**Purpose:** Track income, expenses, and category budgets.

**Transaction Schema:**
```json
{
  "id": "uuid",
  "type": "income | expense",
  "amount": 42.50,
  "category": "food",
  "description": "string",
  "date": "YYYY-MM-DD",
  "createdAt": "YYYY-MM-DD"
}
```

**Key Methods:**
- `addTransaction(type, amount, category, date, desc)` — Immutable create
- `deleteTransaction(id)` — Hard delete (edit = delete + recreate)
- `getTotals(dateRange)` → `{ income, expenses, net, savingsRate }`
- `getByCategory(opts)` → `{ category: amount }`
- `setBudget(category, limit, period)` — Upsert budget
- `getBudgetStatus(category)` → `{ spent, limit, percentUsed, status }`

**Budget Status:**
- `ok` — < 80% used (green)
- `warning` — 80–99% used (orange)
- `over` — ≥ 100% used (red)

**Persistence:** `finance_transactions`, `finance_budgets`

**Tests:** 70 (transactions, budgets, calculations, edge cases)

---

### 5. AnalyticsEngine

**Purpose:** Calculate derived productivity metrics and focus score.

**Key Methods:**
- `getThisWeekDashboard()` → `{ focusScore, taskExecution, habitConsistency, totalFocusTime, deepWorkRatio, cognitiveQuality, modeBreakdown, dailyScores }`
- `getStatsComparison()` → `{ thisWeek, lastWeek, deltas }`
- `getMonthlyTrends()` → Last 4 weeks array

**Focus Score Formula (0–100):**
```
focusScore =
  30% × taskExecution
  30% × deepWorkQuality
  25% × habitConsistency
  15% × cognitiveQuality (avg energy + focus ratings)
```

**Persistence:** Read-only — reads from all other engine localStorage keys

**Tests:** 71 (all calculations, weekly/monthly aggregation, edge cases)

---

## Data Model

All data stored in localStorage as JSON:

```json
{
  "lcc_tasks":                    [...],
  "lcc_habits":                   [...],
  "pomodoro_sessions_learning":   [...],
  "pomodoro_sessions_work":       [...],
  "pomodoro_sessions_class":      [...],
  "pomodoro_state_learning":      {...},
  "pomodoro_state_work":          {...},
  "pomodoro_state_class":         {...},
  "finance_transactions":         [...],
  "finance_budgets":              [...]
}
```

**Date format:** `YYYY-MM-DD` (local device time — never UTC)

**Amounts:** Stored as floats rounded to 2 decimal places (cents-safe)

---

## React Integration

### Custom Hooks Pattern

All engines are wrapped in stable custom hooks:

```javascript
// Pattern: useRef for stable instance, useState(0) as re-render trigger
export function useTaskEngine() {
  const engineRef = useRef(null)
  if (!engineRef.current) {
    engineRef.current = new TaskEngine()
  }

  const [rev, setRev] = useState(0)
  const refresh = useCallback(() => setRev((r) => r + 1), [])

  return { engine: engineRef.current, refresh, rev }
}
```

**Key:** `useRef` creates the engine synchronously on first render — no null check needed in components.

### Zustand Store

```javascript
// src/store/appStore.js
const useAppStore = create((set) => ({
  currentMode: 'home',
  setCurrentMode: (mode) => set({ currentMode: mode }),
  ratingModalOpen: false,
  pendingRatingCallback: null,
  openRatingModal: (onSave) => set({ ratingModalOpen: true, pendingRatingCallback: onSave }),
  closeRatingModal: () => set({ ratingModalOpen: false, pendingRatingCallback: null }),
  activeModal: null,
  openModal: (name, payload) => set({ activeModal: name, modalPayload: payload }),
  closeModal: () => set({ activeModal: null, modalPayload: null }),
}))
```

Manages: modal state, current mode, drawer state. Avoids prop drilling.

**Important:** Zustand v5 uses `useSyncExternalStore`. Zustand actions must **never** be listed in `useEffect` dependency arrays — they are stable references created once at store initialization.

---

## Page Structure

Each page follows this pattern:

1. **Get engine via hook** — `const { engine, refresh } = useTaskEngine()`
2. **Derive display data** — `const todo = engine.getTasksByStatus('todo')`
3. **Render components** — displays data
4. **Wire interactions** — `onClick → engine.method() → refresh()`

Example (Tasks.jsx):
```javascript
const { engine, refresh } = useTaskEngine()

function handleStatus(id, status) {
  engine.setStatus(id, status)  // mutate engine
  refresh()                     // increment rev → re-render
}
```

---

## Mode Theming

Each navigation mode sets `document.body.className = 'mode-{name}'`. CSS body-class selectors control all ambient theming:

```css
body.mode-learning .header  { border-bottom-color: rgba(34,197,94,.28); }
body.mode-finance .nav-btn.active { color: #7b9cff; }
```

Mode colors:
| Mode | Color |
|------|-------|
| home / work | `#4f8ef7` blue |
| learning | `#22c55e` green |
| class | `#a855f7` purple |
| entertainment | `#f97316` orange |
| finance | `#7b9cff` indigo |

---

## Testing Strategy

All engines are fully tested with a Node.js test harness (no test framework dependency):

```bash
node tests/PomodoroEngine.test.js   # 105+ tests
node tests/HabitEngine.test.js      # 34 tests
node tests/TaskEngine.test.js       # 81 tests
node tests/FinanceEngine.test.js    # 70 tests
node tests/AnalyticsEngine.test.js  # 71 tests
```

Tests cover:
- CRUD operations and edge cases
- State machine transitions
- localStorage persistence (shim)
- Cross-engine data reading (Analytics)
- Date boundary conditions

---

## Non-Negotiable Rules

1. **Engines are pure** — No DOM, no React, no side effects except `saveState()`
2. **UI is stateless** — Derives display values from engine data each render
3. **No UTC dates** — Always `YYYY-MM-DD` local time
4. **Immutable transactions** — Edit = delete + recreate
5. **localStorage is the source of truth** — Not a cache, it IS the store
6. **Zustand actions out of deps** — Never put Zustand setters in `useEffect` deps

---

## Future Architecture

When expanding:
- **Phase 2:** Add `SubscriptionEngine`, `DebtEngine` (follow same pattern)
- **Phase 3:** Add Framer Motion at the component level — engines unchanged
- **Bank sync:** Add API layer between engine and localStorage calls
- **Real backend:** Swap `localStorage.setItem` calls in engines with `await api.save()` — hooks and components stay the same
