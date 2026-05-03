#!/usr/bin/env node
'use strict';

// ─────────────────────────────────────────────────────────────────────────────
// ENVIRONMENT SETUP
// ─────────────────────────────────────────────────────────────────────────────

const _store = {};
global.localStorage = {
  getItem:    (key)    => Object.prototype.hasOwnProperty.call(_store, key) ? _store[key] : null,
  setItem:    (key, v) => { _store[key] = String(v); },
  removeItem: (key)    => { delete _store[key]; },
  clear:      ()       => { Object.keys(_store).forEach(k => delete _store[k]); },
};

const AnalyticsEngine = require('../AnalyticsEngine.js');

// ─────────────────────────────────────────────────────────────────────────────
// TEST RUNNER
// ─────────────────────────────────────────────────────────────────────────────

let passed = 0, failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (e) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${e.message}`);
    failed++;
  }
}

function assert(condition, msg) {
  if (!condition) throw new Error(msg || 'Assertion failed');
}

function eq(actual, expected, msg) {
  if (actual !== expected) {
    throw new Error(
      (msg ? msg + ': ' : '') +
      `expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`
    );
  }
}

function near(actual, expected, tolerance = 1, msg) {
  if (Math.abs(actual - expected) > tolerance) {
    throw new Error(
      (msg ? msg + ': ' : '') +
      `expected ~${expected} (±${tolerance}), got ${actual}`
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const _Real = Date;

function pad(n) { return String(n).padStart(2, '0'); }

function todayStr() {
  const d = new _Real();
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
}

function dateOffset(n, from) {
  const base = from || todayStr();
  const [y, m, d] = base.split('-').map(Number);
  const dt = new _Real(y, m - 1, d, 12, 0, 0);
  dt.setDate(dt.getDate() + n);
  return `${dt.getFullYear()}-${pad(dt.getMonth()+1)}-${pad(dt.getDate())}`;
}

function freshEngine() {
  localStorage.clear();
  return new AnalyticsEngine();
}

/**
 * Build a session object.
 * @param {string} date       YYYY-MM-DD
 * @param {object} overrides  { mode, duration, interrupted, energyLevel, focusQuality }
 */
function makeSession(date, overrides = {}) {
  return {
    id: Math.random().toString(36).slice(2),
    mode: overrides.mode || 'learning',
    duration: overrides.duration !== undefined ? overrides.duration : 1500,
    startedAt: `${date}T12:00:00.000Z`,
    completedAt: `${date}T12:25:00.000Z`,
    interrupted: overrides.interrupted || false,
    energyLevel: overrides.energyLevel !== undefined ? overrides.energyLevel : null,
    focusQuality: overrides.focusQuality !== undefined ? overrides.focusQuality : null,
  };
}

/** Write sessions to localStorage for the given mode */
function seedSessions(mode, sessions) {
  localStorage.setItem(`pomodoro_sessions_${mode}`, JSON.stringify(sessions));
}

/** Write habits to localStorage */
function seedHabits(habits) {
  localStorage.setItem('habits', JSON.stringify(habits));
}

/** Write tasks to localStorage */
function seedTasks(tasks) {
  localStorage.setItem('lcc_tasks', JSON.stringify(tasks));
}

function makeHabit(completions = []) {
  return {
    id: Math.random().toString(36).slice(2),
    name: 'Test Habit',
    type: 'manual',
    completions,
    streak: { current: 0, best: 0 },
  };
}

function makeTask(date, status = 'done') {
  return {
    id: Math.random().toString(36).slice(2),
    title: 'Test Task',
    status,
    createdAt: `${date}T10:00:00.000Z`,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 1: DATE HELPERS
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n── Date Helpers ──────────────────────────────────────────────────');

test('getToday() returns YYYY-MM-DD matching real local date', () => {
  const e = freshEngine();
  const today = e.getToday();
  assert(/^\d{4}-\d{2}-\d{2}$/.test(today), 'format wrong');
  eq(today, todayStr());
});

test('getWeekStart() returns the Sunday of the given week', () => {
  const e = freshEngine();
  // 2026-05-01 is a Friday; Sunday of that week is 2026-04-26
  const start = e.getWeekStart('2026-05-01');
  eq(e._dateToStr(start), '2026-04-26');
});

test('getWeekStart() returns same date when input is already a Sunday', () => {
  const e = freshEngine();
  const start = e.getWeekStart('2026-04-26'); // Sunday
  eq(e._dateToStr(start), '2026-04-26');
});

test('getWeekDates() returns 7 consecutive dates starting from given Sunday', () => {
  const e = freshEngine();
  const dates = e.getWeekDates(e._parseDate('2026-04-26'));
  eq(dates.length, 7);
  eq(dates[0], '2026-04-26');
  eq(dates[6], '2026-05-02');
});

test('getThisWeekDates() always includes today', () => {
  const e = freshEngine();
  const dates = e.getThisWeekDates();
  assert(dates.includes(e.getToday()), 'today not in this week dates');
  eq(dates.length, 7);
});

test('getLastWeekDates() does not include today', () => {
  const e = freshEngine();
  const lastWeek = e.getLastWeekDates();
  assert(!lastWeek.includes(e.getToday()), 'today should not be in last week');
  eq(lastWeek.length, 7);
});

test('getLastWeekDates() ends the day before getThisWeekDates()[0]', () => {
  const e = freshEngine();
  const thisStart = e.getThisWeekDates()[0];
  const lastEnd   = e.getLastWeekDates()[6];
  const expected  = dateOffset(-1, thisStart);
  eq(lastEnd, expected);
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 2: DATA LOADING
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n── Data Loading ──────────────────────────────────────────────────');

test('_loadSessions() returns empty array when key missing', () => {
  const e = freshEngine();
  const sessions = e._loadSessions('learning');
  assert(Array.isArray(sessions));
  eq(sessions.length, 0);
});

test('_loadSessions() returns parsed array from localStorage', () => {
  const e = freshEngine();
  seedSessions('work', [makeSession(todayStr(), { mode: 'work' })]);
  const sessions = e._loadSessions('work');
  eq(sessions.length, 1);
  eq(sessions[0].mode, 'work');
});

test('_loadSessions() returns empty array on corrupt JSON', () => {
  const e = freshEngine();
  localStorage.setItem('pomodoro_sessions_learning', '{bad json');
  const sessions = e._loadSessions('learning');
  eq(sessions.length, 0);
});

test('_loadAllSessions() merges learning + work + class', () => {
  const e = freshEngine();
  seedSessions('learning', [makeSession(todayStr(), { mode: 'learning' })]);
  seedSessions('work',     [makeSession(todayStr(), { mode: 'work' })]);
  seedSessions('class',    [makeSession(todayStr(), { mode: 'class' })]);
  const all = e._loadAllSessions();
  eq(all.length, 3);
});

test('_loadHabits() returns empty array when key missing', () => {
  const e = freshEngine();
  const habits = e._loadHabits();
  eq(habits.length, 0);
});

test('_loadTasks() returns empty array when key missing', () => {
  const e = freshEngine();
  const tasks = e._loadTasks();
  eq(tasks.length, 0);
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 3: SESSION FILTERING
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n── Session Filtering ─────────────────────────────────────────────');

test('_sessionsForDates() returns only sessions on matching dates', () => {
  const e = freshEngine();
  const today = todayStr();
  const yesterday = dateOffset(-1);
  const sessions = [
    makeSession(today),
    makeSession(yesterday),
    makeSession(dateOffset(-10)),
  ];
  const result = e._sessionsForDates(sessions, [today, yesterday]);
  eq(result.length, 2);
});

test('_sessionsForDates() excludes sessions without completedAt', () => {
  const e = freshEngine();
  const today = todayStr();
  const s = makeSession(today);
  s.completedAt = null;
  const result = e._sessionsForDates([s], [today]);
  eq(result.length, 0);
});

test('_sessionsForDates() returns empty array when no date matches', () => {
  const e = freshEngine();
  const sessions = [makeSession(todayStr())];
  const result = e._sessionsForDates(sessions, [dateOffset(-100)]);
  eq(result.length, 0);
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 4: TASK EXECUTION
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n── Task Execution ────────────────────────────────────────────────');

test('_calcTaskExecution() returns null when no tasks exist', () => {
  const e = freshEngine();
  const weekDates = e.getThisWeekDates();
  const result = e._calcTaskExecution(weekDates, []);
  eq(result, null);
});

test('_calcTaskExecution() returns null when no tasks created this week', () => {
  const e = freshEngine();
  const weekDates = e.getThisWeekDates();
  const oldTask = makeTask(dateOffset(-30), 'done');
  const result = e._calcTaskExecution(weekDates, [oldTask]);
  eq(result, null);
});

test('_calcTaskExecution() returns 100 when all week tasks are done', () => {
  const e = freshEngine();
  const weekDates = e.getThisWeekDates();
  const today = todayStr();
  const tasks = [
    makeTask(today, 'done'),
    makeTask(today, 'done'),
  ];
  const result = e._calcTaskExecution(weekDates, tasks);
  eq(result, 100);
});

test('_calcTaskExecution() returns 0 when all week tasks are pending', () => {
  const e = freshEngine();
  const weekDates = e.getThisWeekDates();
  const today = todayStr();
  const tasks = [makeTask(today, 'pending'), makeTask(today, 'pending')];
  const result = e._calcTaskExecution(weekDates, tasks);
  eq(result, 0);
});

test('_calcTaskExecution() returns 50 when half done', () => {
  const e = freshEngine();
  const weekDates = e.getThisWeekDates();
  const today = todayStr();
  const tasks = [makeTask(today, 'done'), makeTask(today, 'pending')];
  const result = e._calcTaskExecution(weekDates, tasks);
  eq(result, 50);
});

test('_calcTaskExecution() ignores tasks from other weeks', () => {
  const e = freshEngine();
  const weekDates = e.getThisWeekDates();
  const today = todayStr();
  const tasks = [
    makeTask(today, 'done'),
    makeTask(dateOffset(-8), 'done'),  // last week
    makeTask(dateOffset(-8), 'pending'),
  ];
  const result = e._calcTaskExecution(weekDates, tasks);
  eq(result, 100); // only this week's task counts
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 5: DEEP WORK QUALITY
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n── Deep Work Quality ─────────────────────────────────────────────');

test('_calcDeepWorkQuality() returns 0 with no sessions', () => {
  const e = freshEngine();
  const result = e._calcDeepWorkQuality(e.getThisWeekDates(), []);
  eq(result, 0);
});

test('_calcDeepWorkQuality() returns > 0 with uninterrupted sessions', () => {
  const e = freshEngine();
  const weekDates = e.getThisWeekDates();
  const today = todayStr();
  const sessions = [makeSession(today, { interrupted: false })];
  const result = e._calcDeepWorkQuality(weekDates, sessions);
  assert(result > 0);
});

test('_calcDeepWorkQuality() maxes at 100 with 10 perfect sessions', () => {
  const e = freshEngine();
  const weekDates = e.getThisWeekDates();
  const today = todayStr();
  const sessions = Array.from({ length: 10 }, () =>
    makeSession(today, { interrupted: false, focusQuality: 5 })
  );
  const result = e._calcDeepWorkQuality(weekDates, sessions);
  eq(result, 100);
});

test('_calcDeepWorkQuality() is lower when sessions are interrupted', () => {
  const e = freshEngine();
  const weekDates = e.getThisWeekDates();
  const today = todayStr();
  const allGood = Array.from({ length: 5 }, () =>
    makeSession(today, { interrupted: false, focusQuality: 5 })
  );
  const allBad = Array.from({ length: 5 }, () =>
    makeSession(today, { interrupted: true, focusQuality: 5 })
  );
  const goodScore = e._calcDeepWorkQuality(weekDates, allGood);
  const badScore  = e._calcDeepWorkQuality(weekDates, allBad);
  assert(goodScore > badScore, `goodScore(${goodScore}) should > badScore(${badScore})`);
});

test('_calcDeepWorkQuality() caps volume at 10 sessions', () => {
  const e = freshEngine();
  const weekDates = e.getThisWeekDates();
  const today = todayStr();
  // 10 sessions and 20 sessions should produce the same volume contribution
  const ten    = Array.from({ length: 10 }, () => makeSession(today, { interrupted: false }));
  const twenty = Array.from({ length: 20 }, () => makeSession(today, { interrupted: false }));
  eq(
    e._calcDeepWorkQuality(weekDates, ten),
    e._calcDeepWorkQuality(weekDates, twenty)
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 6: HABIT CONSISTENCY
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n── Habit Consistency ─────────────────────────────────────────────');

test('_calcHabitConsistency() returns 0 with no habits', () => {
  const e = freshEngine();
  const result = e._calcHabitConsistency(e.getThisWeekDates(), []);
  eq(result, 0);
});

test('_calcHabitConsistency() returns 100 when every habit done every elapsed day', () => {
  const e = freshEngine();
  const weekDates = e.getThisWeekDates();
  const today = e.getToday();
  const elapsed = weekDates.filter(d => d <= today);
  const habit = makeHabit(elapsed); // completed every elapsed day
  const result = e._calcHabitConsistency(weekDates, [habit]);
  eq(result, 100);
});

test('_calcHabitConsistency() returns 0 when no completions at all', () => {
  const e = freshEngine();
  const weekDates = e.getThisWeekDates();
  const habit = makeHabit([]); // no completions
  const result = e._calcHabitConsistency(weekDates, [habit]);
  eq(result, 0);
});

test('_calcHabitConsistency() ignores future dates in denominator', () => {
  const e = freshEngine();
  const weekDates = e.getThisWeekDates();
  const today = e.getToday();
  const elapsed = weekDates.filter(d => d <= today);
  // Complete only today; score = 1 / elapsed.length
  const habit = makeHabit([today]);
  const result = e._calcHabitConsistency(weekDates, [habit]);
  const expected = (1 / elapsed.length) * 100;
  near(result, expected, 1);
});

test('_calcHabitConsistency() averages multiple habits', () => {
  const e = freshEngine();
  const weekDates = e.getThisWeekDates();
  const today = e.getToday();
  const elapsed = weekDates.filter(d => d <= today);
  const fullHabit = makeHabit(elapsed);   // 100%
  const emptyHabit = makeHabit([]);       // 0%
  const result = e._calcHabitConsistency(weekDates, [fullHabit, emptyHabit]);
  eq(result, 50);
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 7: COGNITIVE QUALITY
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n── Cognitive Quality ─────────────────────────────────────────────');

test('_calcCognitiveQuality() returns 0 with no rated sessions', () => {
  const e = freshEngine();
  const today = todayStr();
  const sessions = [makeSession(today)]; // no ratings
  const result = e._calcCognitiveQuality(e.getThisWeekDates(), sessions);
  eq(result, 0);
});

test('_calcCognitiveQuality() returns 100 with all-5 ratings', () => {
  const e = freshEngine();
  const today = todayStr();
  const sessions = [makeSession(today, { energyLevel: 5, focusQuality: 5 })];
  const result = e._calcCognitiveQuality(e.getThisWeekDates(), sessions);
  eq(result, 100);
});

test('_calcCognitiveQuality() returns 20 with all-1 ratings', () => {
  const e = freshEngine();
  const today = todayStr();
  const sessions = [makeSession(today, { energyLevel: 1, focusQuality: 1 })];
  const result = e._calcCognitiveQuality(e.getThisWeekDates(), sessions);
  eq(result, 20);
});

test('_calcCognitiveQuality() uses only energy when focus not rated', () => {
  const e = freshEngine();
  const today = todayStr();
  const sessions = [makeSession(today, { energyLevel: 5, focusQuality: null })];
  const result = e._calcCognitiveQuality(e.getThisWeekDates(), sessions);
  eq(result, 100);
});

test('_calcCognitiveQuality() uses only focus when energy not rated', () => {
  const e = freshEngine();
  const today = todayStr();
  const sessions = [makeSession(today, { energyLevel: null, focusQuality: 5 })];
  const result = e._calcCognitiveQuality(e.getThisWeekDates(), sessions);
  eq(result, 100);
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 8: FOCUS SCORE FORMULA
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n── Focus Score Formula ───────────────────────────────────────────');

test('_buildFocusScore() returns 100 when all components are perfect', () => {
  const e = freshEngine();
  const result = e._buildFocusScore(100, 100, 100, 100);
  eq(result, 100);
});

test('_buildFocusScore() returns 0 when all components are 0', () => {
  const e = freshEngine();
  const result = e._buildFocusScore(0, 0, 0, 0);
  eq(result, 0);
});

test('_buildFocusScore() uses redistribution weights when taskEx is null', () => {
  const e = freshEngine();
  // null tasks: deepWork×0.45 + habits×0.40 + cognitive×0.15
  const result = e._buildFocusScore(null, 100, 0, 0);
  eq(result, 45);
});

test('_buildFocusScore() uses standard weights when taskEx is provided', () => {
  const e = freshEngine();
  // taskEx×0.30 + deepWork×0.30 + habits×0.25 + cognitive×0.15
  const result = e._buildFocusScore(100, 0, 0, 0);
  eq(result, 30);
});

test('_buildFocusScore() caps at 100', () => {
  const e = freshEngine();
  // can't exceed 100
  const result = e._buildFocusScore(200, 200, 200, 200);
  eq(result, 100);
});

test('_buildFocusScore() returns integer', () => {
  const e = freshEngine();
  const result = e._buildFocusScore(33, 66, 50, 75);
  eq(result, Math.round(result));
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 9: DERIVED METRICS
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n── Derived Metrics ───────────────────────────────────────────────');

test('_calcTotalFocusTime() returns 0 with no sessions', () => {
  const e = freshEngine();
  const result = e._calcTotalFocusTime(e.getThisWeekDates(), []);
  eq(result, 0);
});

test('_calcTotalFocusTime() converts seconds to hours with 1 decimal', () => {
  const e = freshEngine();
  const weekDates = e.getThisWeekDates();
  const today = todayStr();
  // 3600 sec = 1.0 hr
  const sessions = [makeSession(today, { duration: 3600 })];
  const result = e._calcTotalFocusTime(weekDates, sessions);
  eq(result, 1.0);
});

test('_calcTotalFocusTime() sums across multiple sessions', () => {
  const e = freshEngine();
  const weekDates = e.getThisWeekDates();
  const today = todayStr();
  const sessions = [
    makeSession(today, { duration: 1800 }),
    makeSession(today, { duration: 1800 }),
  ];
  const result = e._calcTotalFocusTime(weekDates, sessions);
  eq(result, 1.0);
});

test('_calcDeepWorkRatio() returns 0 with no sessions', () => {
  const e = freshEngine();
  const result = e._calcDeepWorkRatio(e.getThisWeekDates(), []);
  eq(result, 0);
});

test('_calcDeepWorkRatio() counts uninterrupted sessions with null focusQuality as deep', () => {
  const e = freshEngine();
  const weekDates = e.getThisWeekDates();
  const today = todayStr();
  // uninterrupted + no rating = counts as deep
  const sessions = [makeSession(today, { interrupted: false, focusQuality: null })];
  const result = e._calcDeepWorkRatio(weekDates, sessions);
  eq(result, 100);
});

test('_calcDeepWorkRatio() excludes interrupted sessions', () => {
  const e = freshEngine();
  const weekDates = e.getThisWeekDates();
  const today = todayStr();
  const sessions = [makeSession(today, { interrupted: true })];
  const result = e._calcDeepWorkRatio(weekDates, sessions);
  eq(result, 0);
});

test('_calcDeepWorkRatio() excludes focusQuality < 3 even if uninterrupted', () => {
  const e = freshEngine();
  const weekDates = e.getThisWeekDates();
  const today = todayStr();
  const sessions = [makeSession(today, { interrupted: false, focusQuality: 2 })];
  const result = e._calcDeepWorkRatio(weekDates, sessions);
  eq(result, 0);
});

test('_calcModeBreakdown() returns 0s with no sessions', () => {
  const e = freshEngine();
  const result = e._calcModeBreakdown(e.getThisWeekDates());
  eq(result.work, 0);
  eq(result.learning, 0);
  eq(result.class, 0);
});

test('_calcModeBreakdown() returns 100% for single mode with all sessions', () => {
  const e = freshEngine();
  const weekDates = e.getThisWeekDates();
  const today = todayStr();
  seedSessions('work', [makeSession(today, { mode: 'work', duration: 1500 })]);
  const result = e._calcModeBreakdown(weekDates);
  eq(result.work, 100);
  eq(result.learning, 0);
  eq(result.class, 0);
});

test('_calcEnergyAvg() returns null with no rated sessions', () => {
  const e = freshEngine();
  const today = todayStr();
  const sessions = [makeSession(today)]; // no energyLevel
  const result = e._calcEnergyAvg(e.getThisWeekDates(), sessions);
  eq(result, null);
});

test('_calcEnergyAvg() returns correct average', () => {
  const e = freshEngine();
  const weekDates = e.getThisWeekDates();
  const today = todayStr();
  const sessions = [
    makeSession(today, { energyLevel: 4 }),
    makeSession(today, { energyLevel: 2 }),
  ];
  const result = e._calcEnergyAvg(weekDates, sessions);
  eq(result, 3.0);
});

test('_calcFocusQualityAvg() returns null with no rated sessions', () => {
  const e = freshEngine();
  const today = todayStr();
  const sessions = [makeSession(today)];
  const result = e._calcFocusQualityAvg(e.getThisWeekDates(), sessions);
  eq(result, null);
});

test('_calcFocusQualityAvg() returns correct average', () => {
  const e = freshEngine();
  const weekDates = e.getThisWeekDates();
  const today = todayStr();
  const sessions = [
    makeSession(today, { focusQuality: 5 }),
    makeSession(today, { focusQuality: 3 }),
  ];
  const result = e._calcFocusQualityAvg(weekDates, sessions);
  eq(result, 4.0);
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 10: DAILY SCORES (SPARKLINE)
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n── Daily Scores ──────────────────────────────────────────────────');

test('getDailyScores() returns null for future dates', () => {
  const e = freshEngine();
  const weekDates = e.getThisWeekDates();
  const today = e.getToday();
  const scores = e.getDailyScores(weekDates);
  const futureScores = scores.filter(s => s.date > today);
  futureScores.forEach(s => eq(s.score, null, `future date ${s.date} should be null`));
});

test('getDailyScores() returns numeric score for today', () => {
  const e = freshEngine();
  const weekDates = e.getThisWeekDates();
  const today = e.getToday();
  const scores = e.getDailyScores(weekDates);
  const todayScore = scores.find(s => s.date === today);
  assert(todayScore !== undefined);
  assert(todayScore.score !== null);
  assert(typeof todayScore.score === 'number');
});

test('getDailyScores() returns 0 for past days with no activity', () => {
  const e = freshEngine();
  // Use last week — guaranteed past
  const weekDates = e.getLastWeekDates();
  const scores = e.getDailyScores(weekDates);
  scores.forEach(s => eq(s.score, 0, `${s.date} should be 0`));
});

test('getDailyScores() session score caps at 60 (3 sessions)', () => {
  const e = freshEngine();
  const weekDates = e.getLastWeekDates();
  const targetDate = weekDates[0]; // past date
  // 10 sessions — should still cap session contribution at 60
  const sessions = Array.from({ length: 10 }, () => makeSession(targetDate));
  seedSessions('learning', sessions);
  const scores = e.getDailyScores(weekDates);
  const dayScore = scores.find(s => s.date === targetDate);
  assert(dayScore.score <= 60, `should be capped at 60 with no habits, got ${dayScore.score}`);
});

test('getDailyScores() habit score adds up to 40 when all habits done', () => {
  const e = freshEngine();
  const weekDates = e.getLastWeekDates();
  const targetDate = weekDates[0];
  // 3 sessions (max session score = 60) + 1 habit done (habit score = 40)
  seedSessions('learning', Array.from({ length: 3 }, () => makeSession(targetDate)));
  seedHabits([makeHabit([targetDate])]);
  const scores = e.getDailyScores(weekDates);
  const dayScore = scores.find(s => s.date === targetDate);
  eq(dayScore.score, 100);
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 11: PUBLIC API
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n── Public API ────────────────────────────────────────────────────');

test('getThisWeekDashboard() returns all expected keys', () => {
  const e = freshEngine();
  const data = e.getThisWeekDashboard();
  const keys = ['weekDates','dailyScores','focusScore','taskExecution','deepWorkQuality',
                 'habitConsistency','cognitiveQuality','totalFocusTime','deepWorkRatio',
                 'modeBreakdown','energyAvg','focusQualityAvg','sessionCount'];
  keys.forEach(k => assert(k in data, `missing key: ${k}`));
});

test('getThisWeekDashboard() weekDates has 7 entries including today', () => {
  const e = freshEngine();
  const { weekDates } = e.getThisWeekDashboard();
  eq(weekDates.length, 7);
  assert(weekDates.includes(e.getToday()));
});

test('getThisWeekDashboard() focusScore is 0–100 integer', () => {
  const e = freshEngine();
  const { focusScore } = e.getThisWeekDashboard();
  assert(focusScore >= 0 && focusScore <= 100, `focusScore out of range: ${focusScore}`);
  eq(focusScore, Math.round(focusScore));
});

test('getThisWeekDashboard() modeBreakdown sums to 0 when no sessions', () => {
  const e = freshEngine();
  const { modeBreakdown } = e.getThisWeekDashboard();
  eq(modeBreakdown.work + modeBreakdown.learning + modeBreakdown.class, 0);
});

test('getStatsComparison() returns thisWeek, lastWeek, deltas', () => {
  const e = freshEngine();
  const data = e.getStatsComparison();
  assert('thisWeek' in data);
  assert('lastWeek' in data);
  assert('deltas' in data);
});

test('getStatsComparison() deltas has expected keys', () => {
  const e = freshEngine();
  const { deltas } = e.getStatsComparison();
  const keys = ['focusScore','taskExecution','habitConsistency','deepWorkRatio',
                 'totalFocusTime','cognitiveQuality'];
  keys.forEach(k => assert(k in deltas, `missing delta key: ${k}`));
});

test('getStatsComparison() delta is null when both weeks have no tasks', () => {
  const e = freshEngine();
  const { deltas } = e.getStatsComparison();
  eq(deltas.taskExecution, null);
});

test('getMonthlyTrends() returns 4 weeks in ascending order', () => {
  const e = freshEngine();
  const trends = e.getMonthlyTrends();
  eq(trends.length, 4);
  // First entry is oldest, last is current week
  eq(trends[3].label, 'This Week');
  eq(trends[2].label, 'Last Week');
});

test('getMonthlyTrends() each week has focusScore in 0–100', () => {
  const e = freshEngine();
  const trends = e.getMonthlyTrends();
  trends.forEach(w => {
    assert(w.focusScore >= 0 && w.focusScore <= 100,
      `week ${w.label} focusScore out of range: ${w.focusScore}`);
  });
});

test('getMonthlyTrends() weeks do not overlap (distinct Sunday starts)', () => {
  const e = freshEngine();
  const trends = e.getMonthlyTrends();
  const starts = trends.map(w => w.weekDates[0]);
  const unique = new Set(starts);
  eq(unique.size, 4);
});

// ─────────────────────────────────────────────────────────────────────────────
// RESULTS
// ─────────────────────────────────────────────────────────────────────────────

console.log(`\n${'─'.repeat(60)}`);
console.log(`  ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
