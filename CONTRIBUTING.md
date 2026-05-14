# Contributing Guide

## How to Extend Life Command Center

### Adding a New Feature

#### 1. Identify the Layer

**Is this pure logic?** → Build or extend an Engine
- New calculation → Add method to `AnalyticsEngine`
- New data type → New engine (e.g., `SubscriptionEngine`)

**Is this UI only?** → Build a Component
- New page → `src/components/pages/`
- Reusable widget → `src/components/common/`
- Modal → `src/components/modals/`

**Is this global state?** → Update Zustand Store
- Cross-page modal → `src/store/appStore.js`

---

#### 2. If Building an Engine

**Template (`src/lib/engines/NewEngine.js`):**

```javascript
class NewEngine {
  constructor() {
    this.items = []
    this._load()
  }

  // ── CRUD ─────────────────────────────────────────────────────

  addItem({ title, ...rest }) {
    if (!title?.trim()) throw new Error('title is required')

    const item = {
      id:        this._uuid(),
      title:     title.trim(),
      createdAt: this._today(),
      ...rest,
    }

    this.items.push(item)
    this._save()
    return item.id
  }

  deleteItem(id) {
    const idx = this.items.findIndex(i => i.id === id)
    if (idx === -1) return false
    this.items.splice(idx, 1)
    this._save()
    return true
  }

  getAll() {
    return [...this.items]
  }

  // ── PERSISTENCE ───────────────────────────────────────────────

  _save() {
    localStorage.setItem('new_engine_items', JSON.stringify(this.items))
  }

  _load() {
    try {
      this.items = JSON.parse(localStorage.getItem('new_engine_items') || '[]')
    } catch {
      this.items = []
    }
  }

  // ── HELPERS ───────────────────────────────────────────────────

  _today() {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
  }

  _uuid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16)
    })
  }
}

if (typeof module !== 'undefined') module.exports = NewEngine
export default NewEngine
```

**Add tests (`tests/NewEngine.test.js`):**

```javascript
const NewEngine = require('../life-dashboard-react/src/lib/engines/NewEngine.js')

// localStorage shim
global.localStorage = (() => {
  let store = {}
  return {
    getItem: (k) => store[k] ?? null,
    setItem: (k, v) => { store[k] = String(v) },
    removeItem: (k) => { delete store[k] },
    clear: () => { store = {} },
  }
})()

const fresh = () => { localStorage.clear(); return new NewEngine() }
let passed = 0, failed = 0

function test(name, fn) {
  try { fn(); console.log(`  ✓ ${name}`); passed++ }
  catch (e) { console.error(`  ✗ ${name}: ${e.message}`); failed++ }
}
function assert(cond, msg) { if (!cond) throw new Error(msg || 'assertion failed') }

// Tests
test('adds item', () => {
  const e = fresh()
  const id = e.addItem({ title: 'Test' })
  assert(id, 'should return id')
  assert(e.getAll().length === 1, 'should have 1 item')
})

test('deletes item', () => {
  const e = fresh()
  const id = e.addItem({ title: 'Test' })
  assert(e.deleteItem(id) === true, 'should return true')
  assert(e.getAll().length === 0, 'should be empty')
})

test('persists across instances', () => {
  const e1 = fresh()
  e1.addItem({ title: 'Persist me' })
  const e2 = new NewEngine()
  assert(e2.getAll().length === 1, 'should reload from localStorage')
})

console.log(`\n${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
```

**Wire into React (`src/lib/hooks/useNewEngine.js`):**

```javascript
import { useRef, useState, useCallback } from 'react'
import NewEngine from '../engines/NewEngine'

export function useNewEngine() {
  const engineRef = useRef(null)
  if (!engineRef.current) {
    engineRef.current = new NewEngine()
  }

  const [rev, setRev] = useState(0)
  const refresh = useCallback(() => setRev((r) => r + 1), [])

  return { engine: engineRef.current, refresh, rev }
}
```

---

#### 3. If Building a Page Component

**Template (`src/components/pages/NewPage.jsx`):**

```javascript
import React, { useState } from 'react'
import { useNewEngine } from '../../lib/hooks/useNewEngine'

function NewPage() {
  const { engine, refresh } = useNewEngine()
  const [form, setForm] = useState({ title: '' })

  function handleAdd(e) {
    e.preventDefault()
    engine.addItem({ title: form.title })
    setForm({ title: '' })
    refresh()
  }

  const items = engine.getAll()

  return (
    <div className="page-enter">
      <div className="page-header">
        <div className="page-eyebrow">Section</div>
        <h1 className="page-title">New Feature</h1>
      </div>

      <form onSubmit={handleAdd}>
        <input
          value={form.title}
          onChange={(e) => setForm({ title: e.target.value })}
        />
        <button type="submit" className="btn btn-primary">Add</button>
      </form>

      <div className="card">
        {items.map((item) => (
          <div key={item.id}>{item.title}</div>
        ))}
      </div>
    </div>
  )
}

export default NewPage
```

**Add route (`src/App.jsx`):**

```javascript
import NewPage from './components/pages/NewPage'

// Inside <Routes>:
<Route path="/new" element={<NewPage />} />
```

**Add nav item (`src/components/Layout/Nav.jsx`):**

```javascript
const NAV_ITEMS = [
  // ...existing items
  { path: '/new', mode: 'home', label: '✨ New Feature' },
]
```

---

#### 4. Testing Your Change

```bash
# Test engine logic
node tests/NewEngine.test.js

# Test in browser
cd life-dashboard-react && npm run dev

# Verify production build
npm run build
```

---

#### 5. Commit

```bash
git add .
git commit -m "feat: Add [feature name]

- What changed
- Why it matters
- Any edge cases handled"
```

---

## Code Style

- **Naming:** `camelCase` for functions/variables, `UPPER_CASE` for constants, `PascalCase` for classes/components
- **Engines:** Pure logic only — no DOM, no React, no side effects except `localStorage`
- **Dates:** Always `YYYY-MM-DD` local time — never UTC, never `new Date().toISOString()`
- **Comments:** Explain *why*, not *what*

---

## Common Patterns

### Pattern 1: Engine → Hook → Component

```
src/lib/engines/X.js          pure logic, testable
        ↓
src/lib/hooks/useX.js         React integration, useRef + useState(0)
        ↓
src/components/pages/X.jsx    render + user interaction
```

### Pattern 2: localStorage Keys

```javascript
// One namespace per engine, consistent naming
localStorage.getItem('finance_transactions')
localStorage.getItem('finance_budgets')
localStorage.getItem('pomodoro_sessions_work')
```

### Pattern 3: Mutation Pattern

```javascript
// In a component:
function handleDelete(id) {
  engine.deleteItem(id)   // mutate engine
  refresh()               // increment rev → re-render
}
```

### Pattern 4: Zustand for Global State Only

```javascript
// Only cross-page state goes in Zustand
// Local form state → useState
// Engine data → engine directly + refresh()
// Modal open/close → Zustand (shared across pages)
```

---

## Where to Make Changes

| Type | Location | Example |
|------|----------|---------|
| New calculation | `src/lib/engines/` | Add method to `AnalyticsEngine.js` |
| New data type | `src/lib/engines/` | `SubscriptionEngine.js` |
| New page | `src/components/pages/` | `Subscriptions.jsx` |
| Shared modal | `src/components/modals/` | `ConfirmModal.jsx` |
| Global state | `src/store/appStore.js` | New modal flag |
| CSS tokens | `src/styles/variables.css` | New color variable |
| Tests | `tests/` | `SubscriptionEngine.test.js` |

---

## Important: Zustand v5 Rules

Zustand v5 uses `useSyncExternalStore`. This has one critical rule:

```javascript
// WRONG — causes infinite re-render loop
const setMode = useAppStore((s) => s.setCurrentMode)
useEffect(() => {
  setMode('home')
}, [setMode])  // ← never put Zustand actions here

// CORRECT
useEffect(() => {
  setMode('home')
// eslint-disable-next-line react-hooks/exhaustive-deps
}, [])  // or [someOtherDep] — never the action itself
```

Zustand actions are stable references (created once at store initialization). They must never appear in `useEffect` dependency arrays.

---

## Questions?

- Check existing engines for patterns
- See [ARCHITECTURE.md](./ARCHITECTURE.md) for design principles
- Check `git log --oneline` for commit message examples
