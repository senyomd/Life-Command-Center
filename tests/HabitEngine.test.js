#!/usr/bin/env node
'use strict';

// ─────────────────────────────────────────────────────────────────────────────
// ENVIRONMENT SETUP
// ─────────────────────────────────────────────────────────────────────────────

// localStorage shim — isolated per-test via clear()
const _store = {};
global.localStorage = {
  getItem:    (key)    => Object.prototype.hasOwnProperty.call(_store, key) ? _store[key] : null,
  setItem:    (key, v) => { _store[key] = String(v); },
  removeItem: (key)    => { delete _store[key]; },
  clear:      ()       => { Object.keys(_store).forEach(k => delete _store[k]); },
};

// Load HabitEngine (browser class, conditional export added for Node)
const HabitEngine = require('../HabitEngine.js');

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const _Real = Date;

// Returns today as YYYY-MM-DD (local time, no mocking)
function todayStr() {
  const d = new _Real();
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
}

// Returns a date N days from today (or from `from`) as YYYY-MM-DD
function dateOffset(n, from = todayStr()) {
  const [y, m, d] = from.split('-').map(Number);
  const dt = new _Real(y, m - 1, d, 12, 0, 0);
  dt.setDate(dt.getDate() + n);
  return `${dt.getFullYear()}-${pad(dt.getMonth()+1)}-${pad(dt.getDate())}`;
}

function pad(n) { return String(n).padStart(2, '0'); }

// Create a fresh engine with empty localStorage
function fresh() {
  localStorage.clear();
  return new HabitEngine();
}

// Getters by name / rule
function manual(engine, name) {
  return engine.habits.find(h => h.name === name && h.type === 'manual');
}
function auto(engine, rule) {
  return engine.habits.find(h => h.rule === rule);
}
function byId(engine, id) {
  return engine.habits.find(h => h.id === id);
}

// Write mock Pomodoro sessions into localStorage
function seedSessions(mode, sessions) {
  localStorage.setItem(`pomodoro_sessions_${mode}`, JSON.stringify(sessions));
}

// Build a minimal session object. Uses T12:00:00.000Z (noon UTC) so
// slice(0,10) matches local date for UTC-12 through UTC+11 time zones.
function session(date, interrupted = false) {
  return { completedAt: `${date}T12:00:00.000Z`, interrupted, duration: 1500 };
}

// ─────────────────────────────────────────────────────────────────────────────
// TEST RUNNER
// ─────────────────────────────────────────────────────────────────────────────

let passed = 0, failed = 0;
const failures = [];

function suite(label) {
  console.log(`\n  ${label}`);
}

function test(name, fn) {
  try {
    fn();
    console.log(`    ✓  ${name}`);
    passed++;
  } catch (err) {
    console.log(`    ✗  ${name}`);
    console.log(`       → ${err.message}`);
    failed++;
    failures.push(name);
  }
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg || 'Assertion failed');
}

function eq(a, b, msg) {
  if (JSON.stringify(a) !== JSON.stringify(b)) {
    throw new Error(msg || `Expected ${JSON.stringify(a)} === ${JSON.stringify(b)}`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 1 — toggleHabit()
// ─────────────────────────────────────────────────────────────────────────────
console.log('\nHabitEngine — Test Suite');
console.log('════════════════════════');

suite('1. toggleHabit()');

test('marks manual habit complete for today', () => {
  const e = fresh();
  const h = manual(e, 'Daily LeetCode');
  e.toggleHabit(h.id, todayStr());
  assert(byId(e, h.id).completions.includes(todayStr()));
});

test('second toggle removes completion (idempotent toggle)', () => {
  const e = fresh();
  const h = manual(e, 'Daily LeetCode');
  e.toggleHabit(h.id, todayStr());
  e.toggleHabit(h.id, todayStr());
  assert(!byId(e, h.id).completions.includes(todayStr()));
});

test('marks manual habit complete for a past date', () => {
  const e = fresh();
  const h = manual(e, 'Applications Sent');
  const past = dateOffset(-3);
  e.toggleHabit(h.id, past);
  assert(byId(e, h.id).completions.includes(past));
});

test('future dates cannot be toggled', () => {
  const e = fresh();
  const h = manual(e, 'Daily LeetCode');
  const future = dateOffset(1);
  e.toggleHabit(h.id, future);
  assert(!byId(e, h.id).completions.includes(future), 'future date should be rejected');
});

test('auto habits are not toggled by toggleHabit()', () => {
  const e = fresh();
  const h = auto(e, 'no_interrupted_sessions');
  e.toggleHabit(h.id, todayStr());
  assert(!h.completions.includes(todayStr()), 'auto habit must stay read-only');
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 2 — checkAutoHabits()
// ─────────────────────────────────────────────────────────────────────────────
suite('2. checkAutoHabits()');

test('no sessions → both auto habits incomplete', () => {
  const e = fresh();
  const today = todayStr();
  e.checkAutoHabits();
  assert(!auto(e, 'no_interrupted_sessions').completions.includes(today), 'No Phone should be ✗');
  assert(!auto(e, 'min_3_pomodoro_sessions').completions.includes(today), 'Deep Work should be ✗');
});

test('1 uninterrupted session → No Phone ✓, Deep Work ✗', () => {
  const e = fresh();
  const today = todayStr();
  seedSessions('learning', [session(today, false)]);
  e.checkAutoHabits();
  assert( auto(e, 'no_interrupted_sessions').completions.includes(today), 'No Phone should be ✓');
  assert(!auto(e, 'min_3_pomodoro_sessions').completions.includes(today), 'Deep Work needs 3');
});

test('3 uninterrupted sessions → No Phone ✓, Deep Work ✓', () => {
  const e = fresh();
  const today = todayStr();
  seedSessions('learning', [session(today), session(today), session(today)]);
  e.checkAutoHabits();
  assert(auto(e, 'no_interrupted_sessions').completions.includes(today), 'No Phone ✓');
  assert(auto(e, 'min_3_pomodoro_sessions').completions.includes(today), 'Deep Work ✓');
});

test('3 sessions with 1 interrupted → No Phone ✗, Deep Work ✓', () => {
  const e = fresh();
  const today = todayStr();
  seedSessions('learning', [
    session(today, false),
    session(today, true),  // ← interrupted
    session(today, false),
  ]);
  e.checkAutoHabits();
  assert(!auto(e, 'no_interrupted_sessions').completions.includes(today), 'No Phone ✗ (interrupted session)');
  assert( auto(e, 'min_3_pomodoro_sessions').completions.includes(today), 'Deep Work ✓ (still 3 sessions)');
});

test('sessions from multiple modes combine for Deep Work count', () => {
  const e = fresh();
  const today = todayStr();
  seedSessions('learning', [session(today)]);
  seedSessions('work',     [session(today)]);
  seedSessions('class',    [session(today)]);
  e.checkAutoHabits();
  assert(auto(e, 'min_3_pomodoro_sessions').completions.includes(today), '1+1+1 across modes = 3');
});

test('sessions from yesterday do not count toward today', () => {
  const e = fresh();
  const yesterday = dateOffset(-1);
  seedSessions('learning', [session(yesterday), session(yesterday), session(yesterday)]);
  e.checkAutoHabits();
  assert(!auto(e, 'min_3_pomodoro_sessions').completions.includes(todayStr()), 'Yesterday sessions must not affect today');
});

test('checkAutoHabits fully overwrites — no stale data merges', () => {
  const e = fresh();
  const today = todayStr();
  // First run: 3 sessions → Deep Work ✓
  seedSessions('learning', [session(today), session(today), session(today)]);
  e.checkAutoHabits();
  assert(auto(e, 'min_3_pomodoro_sessions').completions.includes(today), 'Should be ✓ after 3 sessions');

  // Remove sessions and re-derive — should overwrite to ✗
  localStorage.removeItem('pomodoro_sessions_learning');
  e.checkAutoHabits();
  assert(!auto(e, 'min_3_pomodoro_sessions').completions.includes(today), 'Should be ✗ after sessions removed (full overwrite)');
});

test('interrupted flag on session from different mode still breaks No Phone', () => {
  const e = fresh();
  const today = todayStr();
  seedSessions('learning', [session(today, false)]);
  seedSessions('work',     [session(today, true)]);  // interrupted on work
  e.checkAutoHabits();
  assert(!auto(e, 'no_interrupted_sessions').completions.includes(today), 'Interrupted on any mode should break No Phone');
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 3 — Streak calculations
// ─────────────────────────────────────────────────────────────────────────────
suite('3. Streak calculations');

test('no completions → current 0, best 0', () => {
  const e = fresh();
  const h = manual(e, 'Daily LeetCode');
  eq(h.streak.current, 0);
  eq(h.streak.best,    0);
});

test('only today complete → streak 1', () => {
  const e = fresh();
  const h = manual(e, 'Morning Routine');
  e.toggleHabit(h.id, todayStr());
  eq(byId(e, h.id).streak.current, 1);
});

test('3 consecutive days ending today → streak 3', () => {
  const e = fresh();
  const h = manual(e, 'Daily LeetCode');
  e.toggleHabit(h.id, dateOffset(-2));
  e.toggleHabit(h.id, dateOffset(-1));
  e.toggleHabit(h.id, todayStr());
  eq(byId(e, h.id).streak.current, 3);
});

test('gap yesterday resets current streak (today still counts as 1)', () => {
  const e = fresh();
  const h = manual(e, 'Daily LeetCode');
  e.toggleHabit(h.id, dateOffset(-3));
  e.toggleHabit(h.id, dateOffset(-2));
  // -1 (yesterday) is intentionally skipped
  e.toggleHabit(h.id, todayStr());
  eq(byId(e, h.id).streak.current, 1, 'streak should reset to 1 — yesterday breaks the chain');
});

test('today not complete → current streak 0 even with prior consecutive days', () => {
  const e = fresh();
  const h = manual(e, 'Applications Sent');
  e.toggleHabit(h.id, dateOffset(-3));
  e.toggleHabit(h.id, dateOffset(-2));
  e.toggleHabit(h.id, dateOffset(-1));
  // today NOT toggled
  eq(byId(e, h.id).streak.current, 0, 'streak must end at today');
});

test('best streak tracks historical maximum', () => {
  const e = fresh();
  const h = manual(e, 'Applications Sent');
  // 4-day run in the past
  [dateOffset(-10), dateOffset(-9), dateOffset(-8), dateOffset(-7)].forEach(d => e.toggleHabit(h.id, d));
  // just today (streak 1)
  e.toggleHabit(h.id, todayStr());
  const updated = byId(e, h.id);
  eq(updated.streak.current, 1, 'current streak is 1 (only today)');
  assert(updated.streak.best >= 4, `best should be ≥4, got ${updated.streak.best}`);
});

test('best streak never decreases after untoggling', () => {
  const e = fresh();
  const h = manual(e, 'Morning Routine');
  const id = h.id;
  [dateOffset(-2), dateOffset(-1), todayStr()].forEach(d => e.toggleHabit(id, d));
  const best = byId(e, id).streak.best;
  e.toggleHabit(id, todayStr()); // remove today → current drops
  assert(byId(e, id).streak.best >= best, 'best streak must not decrease');
});

test('auto habit streak computed same as manual after checkAutoHabits()', () => {
  const e = fresh();
  const today = todayStr();
  seedSessions('learning', [session(today), session(today), session(today)]);
  e.checkAutoHabits();
  const dw = auto(e, 'min_3_pomodoro_sessions');
  eq(dw.streak.current, 1, 'auto habit streak should be 1 after one day complete');
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 4 — Persistence (localStorage round-trip)
// ─────────────────────────────────────────────────────────────────────────────
suite('4. Persistence');

test('"habits" key written to localStorage on init', () => {
  fresh();
  assert(localStorage.getItem('habits') !== null, '"habits" key must exist after init');
});

test('5 default habits created on first load', () => {
  const e = fresh();
  eq(e.habits.length, 5);
  const names = e.habits.map(h => h.name);
  ['Daily LeetCode','Applications Sent','Morning Routine',
   'No Phone During Pomodoro','Deep Work Completed'].forEach(n => {
    assert(names.includes(n), `Missing habit: ${n}`);
  });
});

test('toggle immediately persists to localStorage', () => {
  const e = fresh();
  const h = manual(e, 'Morning Routine');
  e.toggleHabit(h.id, todayStr());
  const raw = JSON.parse(localStorage.getItem('habits'));
  const stored = raw.find(x => x.id === h.id);
  assert(stored.completions.includes(todayStr()), 'toggle must persist immediately');
});

test('new engine instance reads existing localStorage (simulated reload)', () => {
  const e1 = fresh();
  const h  = manual(e1, 'Daily LeetCode');
  e1.toggleHabit(h.id, todayStr());

  const e2 = new HabitEngine(); // same localStorage, different instance
  assert(manual(e2, 'Daily LeetCode').completions.includes(todayStr()), 'data must survive across instances');
});

test('corrupted localStorage falls back to 5 default habits', () => {
  localStorage.clear();
  localStorage.setItem('habits', '[[invalid json{{');
  const e = new HabitEngine();
  eq(e.habits.length, 5, 'should recover to defaults on corrupt data');
});

test('auto habit state persists after checkAutoHabits()', () => {
  const e = fresh();
  const today = todayStr();
  seedSessions('learning', [session(today), session(today), session(today)]);
  e.checkAutoHabits();
  const raw = JSON.parse(localStorage.getItem('habits'));
  const stored = raw.find(h => h.rule === 'min_3_pomodoro_sessions');
  assert(stored.completions.includes(today), 'auto habit completion must persist');
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 5 — getHabitForWeek()
// ─────────────────────────────────────────────────────────────────────────────
suite('5. getHabitForWeek()');

test('returns exactly 7 day entries', () => {
  const e = fresh();
  const { week } = e.getHabitForWeek(e.habits[0].id);
  eq(week.length, 7);
});

test('first day of week is Sunday', () => {
  const e = fresh();
  const { week } = e.getHabitForWeek(e.habits[0].id);
  const day = new _Real(week[0].date + 'T12:00:00').getDay();
  eq(day, 0, `Expected Sunday (0), got ${day}`);
});

test('last day of week is Saturday', () => {
  const e = fresh();
  const { week } = e.getHabitForWeek(e.habits[0].id);
  const day = new _Real(week[6].date + 'T12:00:00').getDay();
  eq(day, 6, `Expected Saturday (6), got ${day}`);
});

test('future dates: canToggle=false', () => {
  const e = fresh();
  const h = manual(e, 'Daily LeetCode');
  const { week } = e.getHabitForWeek(h.id);
  week.filter(c => c.date > todayStr()).forEach(c => {
    assert(!c.canToggle, `future date ${c.date} should have canToggle=false`);
  });
});

test('manual habit past/today dates: canToggle=true', () => {
  const e = fresh();
  const h = manual(e, 'Daily LeetCode');
  const { week } = e.getHabitForWeek(h.id);
  week.filter(c => c.date <= todayStr()).forEach(c => {
    assert(c.canToggle, `past/today date ${c.date} should have canToggle=true for manual habit`);
  });
});

test('auto habit: all dates have canToggle=false', () => {
  const e = fresh();
  const h = auto(e, 'no_interrupted_sessions');
  const { week } = e.getHabitForWeek(h.id);
  week.forEach(c => assert(!c.canToggle, `auto habit date ${c.date} must have canToggle=false`));
});

test('completed flag reflects current completion state', () => {
  const e = fresh();
  const h = manual(e, 'Morning Routine');
  const past = dateOffset(-1);
  e.toggleHabit(h.id, past);
  const { week } = e.getHabitForWeek(h.id);
  const cell = week.find(c => c.date === past);
  assert(cell, `cell for ${past} not found in week`);
  assert(cell.completed, `cell for ${past} should be completed`);
});

// ─────────────────────────────────────────────────────────────────────────────
// RESULTS
// ─────────────────────────────────────────────────────────────────────────────

const total = passed + failed;
console.log(`\n════════════════════════`);
console.log(`  ${passed}/${total} tests passed${failed > 0 ? `, ${failed} failed` : ''}`);

if (failures.length) {
  console.log('\n  Failed:');
  failures.forEach(name => console.log(`    ✗  ${name}`));
  process.exit(1);
} else {
  console.log('\n  All tests passed ✓');
  process.exit(0);
}
