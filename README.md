# Life Command Center

A personal productivity operating system built with React + Vite.

## Overview

Life Command Center is a unified dashboard for managing:
- **Pomodoro Timer** — Focus tracking across 3 work modes (Learning, Work, Class)
- **Habit Tracker** — 5 habits with 7-day grid (3 manual + 2 auto-derived)
- **Task Management** — Kanban board with Pomodoro linking
- **Finance Tracking** — Income, expenses, budgets, category breakdown
- **Analytics Dashboard** — Weekly focus score, metrics, trends

## Quick Start

```bash
cd life-dashboard-react
npm install
npm run dev
```

Open http://localhost:3000

## Features

### Core Modules
- ✅ **Pomodoro Engine** — 3 independent timers with session rating
- ✅ **Habit Engine** — 5-habit tracker with streak calculation
- ✅ **Task Engine** — CRUD operations, Kanban, Pomodoro linking
- ✅ **Finance Engine** — Income/expense tracking, budgets, category breakdown
- ✅ **Analytics Engine** — Focus score (0-100), metrics, trends

### Pages
- **Home** — Dashboard with focus score, metrics, habit grid
- **Work/Learning/Class** — Pomodoro timers (mode-specific colors)
- **Tasks** — 3-column Kanban (TODO | IN_PROGRESS | DONE)
- **Finance** — Transactions, budgets, pie chart breakdown
- **Stats** — Weekly comparison, monthly trends, analytics

## Architecture

See [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed system design.

## Testing

All engines have comprehensive unit tests:
- PomodoroEngine: 105+ tests
- HabitEngine: 34 tests
- TaskEngine: 81 tests
- FinanceEngine: 70 tests
- AnalyticsEngine: 71 tests

Run tests:
```bash
node tests/[EngineFile].test.js
```

## Tech Stack

- **Frontend** — React 18 + Vite
- **State** — Zustand + Context API
- **Routing** — React Router v6
- **Persistence** — localStorage
- **Testing** — Node.js test harness
- **Styling** — CSS variables + custom CSS

## Known Issues

See [KNOWN_ISSUES.md](./KNOWN_ISSUES.md)

Current: Timer pauses on tab switch (scheduled for Phase C polish)

## Roadmap

### Phase 1 ✅ Complete
- Core engines with tests
- Finance tracker (MVP)
- React migration
- All 6 pages functional

### Phase 2 (Future)
- Subscriptions module
- Debt tracking
- Monthly trends
- Bank integration (optional)

### Phase 3 (Polish)
- Framer Motion animations
- Mobile responsiveness
- Dark mode toggle
- Advanced analytics

## Development

### File Structure

```
life-dashboard-react/
├── src/
│   ├── components/
│   │   ├── Layout/
│   │   ├── pages/
│   │   ├── modals/
│   │   └── common/
│   ├── lib/
│   │   ├── engines/          (PomodoroEngine, HabitEngine, etc.)
│   │   └── hooks/            (usePomodoroEngine, etc.)
│   ├── store/                (Zustand)
│   ├── styles/
│   └── App.jsx
tests/
KNOWN_ISSUES.md
ARCHITECTURE.md
CONTRIBUTING.md
DEPLOYMENT.md
```

### Adding a Feature

1. Update the relevant engine (`src/lib/engines/`)
2. Add tests (`tests/`)
3. Wire into React component via custom hook
4. Update Zustand store if needed
5. Test in browser
6. Commit with clear message

See [CONTRIBUTING.md](./CONTRIBUTING.md) for detailed guide.

## Performance

- **Bundle size** — ~290KB (Vite optimized)
- **Time to interactive** — <1s
- **localStorage** — All data persists across sessions
- **Engines** — Pure JS, reusable, testable

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+

## License

MIT

## Author

Built by Mark

## Support

For bugs or feature requests, open an issue on GitHub or check [KNOWN_ISSUES.md](./KNOWN_ISSUES.md)
