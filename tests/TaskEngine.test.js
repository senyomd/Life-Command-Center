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

const TaskEngine = require('../TaskEngine.js');

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

function fresh() {
  localStorage.clear();
  return new TaskEngine();
}

function seedSessions(mode, sessions) {
  localStorage.setItem(`pomodoro_sessions_${mode}`, JSON.stringify(sessions));
}

/** Properly transitions a task to done via in_progress (mirrors the engine state rule) */
function setDone(e, id) {
  e.setStatus(id, 'in_progress');
  e.setStatus(id, 'done');
}

function makeSession(date, overrides = {}) {
  return {
    id: overrides.id || Math.random().toString(36).slice(2),
    mode: overrides.mode || 'learning',
    duration: overrides.duration !== undefined ? overrides.duration : 1500,
    startedAt: `${date}T12:00:00.000Z`,
    completedAt: `${date}T12:25:00.000Z`,
    interrupted: overrides.interrupted || false,
    energyLevel: overrides.energyLevel !== undefined ? overrides.energyLevel : null,
    focusQuality: overrides.focusQuality !== undefined ? overrides.focusQuality : null,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 1: createTask()
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n── createTask() ──────────────────────────────────────────────────');

test('creates task with required defaults', () => {
  const e = fresh();
  const t = e.createTask({ title: 'Test Task' });
  eq(t.status, 'todo');
  eq(t.priority, 'medium');
  eq(t.mode, 'learning');
  eq(t.completedAt, null);
  eq(t.deadline, null);
  eq(t.estimatedPomodoros, 2);
  assert(Array.isArray(t.linkedSessions) && t.linkedSessions.length === 0);
  assert(Array.isArray(t.tags) && t.tags.length === 0);
  eq(t.description, '');
  eq(t.createdAt, todayStr());
});

test('assigns a non-empty UUID id', () => {
  const e = fresh();
  const t = e.createTask({ title: 'Test' });
  assert(typeof t.id === 'string' && t.id.length > 0, 'id should be a string');
  assert(/^[0-9a-f-]{36}$/.test(t.id), 'id should be uuid format');
});

test('two tasks get different IDs', () => {
  const e = fresh();
  const t1 = e.createTask({ title: 'A' });
  const t2 = e.createTask({ title: 'B' });
  assert(t1.id !== t2.id, 'IDs should be unique');
});

test('persists to lcc_tasks immediately', () => {
  const e = fresh();
  e.createTask({ title: 'Persisted' });
  const raw = localStorage.getItem('lcc_tasks');
  assert(raw !== null, 'lcc_tasks should be set');
  const parsed = JSON.parse(raw);
  eq(parsed.length, 1);
  eq(parsed[0].title, 'Persisted');
});

test('throws on empty title', () => {
  const e = fresh();
  let threw = false;
  try { e.createTask({ title: '' }); } catch { threw = true; }
  assert(threw, 'should throw on empty title');
});

test('throws on whitespace-only title', () => {
  const e = fresh();
  let threw = false;
  try { e.createTask({ title: '   ' }); } catch { threw = true; }
  assert(threw, 'should throw on whitespace title');
});

test('throws on invalid mode', () => {
  const e = fresh();
  let threw = false;
  try { e.createTask({ title: 'T', mode: 'invalid' }); } catch { threw = true; }
  assert(threw, 'should throw on invalid mode');
});

test('throws on invalid priority', () => {
  const e = fresh();
  let threw = false;
  try { e.createTask({ title: 'T', priority: 'critical' }); } catch { threw = true; }
  assert(threw, 'should throw on invalid priority');
});

test('accepts all valid modes', () => {
  const e = fresh();
  for (const mode of ['work', 'learning', 'class', 'personal']) {
    const t = e.createTask({ title: `Mode ${mode}`, mode });
    eq(t.mode, mode);
  }
});

test('accepts all valid priorities', () => {
  const e = fresh();
  for (const priority of ['low', 'medium', 'high']) {
    const t = e.createTask({ title: `Prio ${priority}`, priority });
    eq(t.priority, priority);
  }
});

test('trims title whitespace', () => {
  const e = fresh();
  const t = e.createTask({ title: '  Clean Title  ' });
  eq(t.title, 'Clean Title');
});

test('stores deadline as provided date string', () => {
  const e = fresh();
  const deadline = dateOffset(7);
  const t = e.createTask({ title: 'T', deadline });
  eq(t.deadline, deadline);
});

test('tags array is a copy (not shared reference)', () => {
  const e = fresh();
  const tags = ['a', 'b'];
  const t = e.createTask({ title: 'T', tags });
  tags.push('c');
  eq(t.tags.length, 2, 'mutating original array should not affect stored tags');
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 2: getTask() / updateTask() / deleteTask()
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n── getTask / updateTask / deleteTask ─────────────────────────────');

test('getTask returns null for unknown id', () => {
  const e = fresh();
  eq(e.getTask('nonexistent'), null);
});

test('getTask returns correct task after create', () => {
  const e = fresh();
  const t = e.createTask({ title: 'Find Me' });
  const found = e.getTask(t.id);
  assert(found !== null);
  eq(found.title, 'Find Me');
});

test('updateTask changes specified fields', () => {
  const e = fresh();
  const t = e.createTask({ title: 'Original' });
  e.updateTask(t.id, { title: 'Updated', priority: 'high' });
  const updated = e.getTask(t.id);
  eq(updated.title, 'Updated');
  eq(updated.priority, 'high');
});

test('updateTask does not overwrite id', () => {
  const e = fresh();
  const t = e.createTask({ title: 'T' });
  const originalId = t.id;
  e.updateTask(t.id, { id: 'hacked' });
  eq(e.getTask(originalId).id, originalId, 'id should not be overwritten');
});

test('updateTask does not overwrite createdAt', () => {
  const e = fresh();
  const t = e.createTask({ title: 'T' });
  const originalCreatedAt = t.createdAt;
  e.updateTask(t.id, { createdAt: '1990-01-01' });
  eq(e.getTask(t.id).createdAt, originalCreatedAt);
});

test('updateTask returns null for unknown id', () => {
  const e = fresh();
  eq(e.updateTask('bad-id', { title: 'X' }), null);
});

test('updateTask ignores invalid mode', () => {
  const e = fresh();
  const t = e.createTask({ title: 'T', mode: 'work' });
  e.updateTask(t.id, { mode: 'invalid' });
  eq(e.getTask(t.id).mode, 'work', 'invalid mode should be ignored');
});

test('updateTask ignores invalid priority', () => {
  const e = fresh();
  const t = e.createTask({ title: 'T', priority: 'low' });
  e.updateTask(t.id, { priority: 'critical' });
  eq(e.getTask(t.id).priority, 'low');
});

test('updateTask persists to localStorage', () => {
  const e = fresh();
  const t = e.createTask({ title: 'Before' });
  e.updateTask(t.id, { title: 'After' });
  const reloaded = new TaskEngine();
  eq(reloaded.getTask(t.id).title, 'After');
});

test('deleteTask removes task', () => {
  const e = fresh();
  const t = e.createTask({ title: 'Delete Me' });
  const result = e.deleteTask(t.id);
  assert(result === true);
  eq(e.getTask(t.id), null);
});

test('deleteTask returns false for unknown id', () => {
  const e = fresh();
  eq(e.deleteTask('bad-id'), false);
});

test('deleteTask persists removal to localStorage', () => {
  const e = fresh();
  const t = e.createTask({ title: 'T' });
  e.deleteTask(t.id);
  const reloaded = new TaskEngine();
  eq(reloaded.getAllTasks().length, 0);
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 3: setStatus() transitions
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n── setStatus() ───────────────────────────────────────────────────');

test('todo → in_progress succeeds', () => {
  const e = fresh();
  const t = e.createTask({ title: 'T' });
  e.setStatus(t.id, 'in_progress');
  eq(e.getTask(t.id).status, 'in_progress');
});

test('in_progress → todo succeeds and completedAt stays null', () => {
  const e = fresh();
  const t = e.createTask({ title: 'T' });
  e.setStatus(t.id, 'in_progress');
  e.setStatus(t.id, 'todo');
  const task = e.getTask(t.id);
  eq(task.status, 'todo');
  eq(task.completedAt, null);
});

test('in_progress → done sets completedAt to today', () => {
  const e = fresh();
  const t = e.createTask({ title: 'T' });
  e.setStatus(t.id, 'in_progress');
  e.setStatus(t.id, 'done');
  eq(e.getTask(t.id).completedAt, todayStr());
});

test('done → todo clears completedAt to null', () => {
  const e = fresh();
  const t = e.createTask({ title: 'T' });
  e.setStatus(t.id, 'in_progress');
  e.setStatus(t.id, 'done');
  e.setStatus(t.id, 'todo');
  eq(e.getTask(t.id).completedAt, null);
});

test('todo → done is blocked (returns null)', () => {
  const e = fresh();
  const t = e.createTask({ title: 'T' });
  const result = e.setStatus(t.id, 'done');
  eq(result, null, 'todo → done should be blocked');
  eq(e.getTask(t.id).status, 'todo', 'status should remain todo');
  eq(e.getTask(t.id).completedAt, null);
});

test('done → in_progress is allowed (reopen to active)', () => {
  const e = fresh();
  const t = e.createTask({ title: 'T' });
  e.setStatus(t.id, 'in_progress');
  e.setStatus(t.id, 'done');
  e.setStatus(t.id, 'in_progress');
  eq(e.getTask(t.id).status, 'in_progress');
  eq(e.getTask(t.id).completedAt, null);
});

test('setStatus returns null for unknown id', () => {
  const e = fresh();
  eq(e.setStatus('bad-id', 'done'), null);
});

test('setStatus returns null for invalid status', () => {
  const e = fresh();
  const t = e.createTask({ title: 'T' });
  eq(e.setStatus(t.id, 'archived'), null);
});

test('completedAt not set when transitioning to non-done status', () => {
  const e = fresh();
  const t = e.createTask({ title: 'T' });
  e.setStatus(t.id, 'in_progress');
  eq(e.getTask(t.id).completedAt, null);
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 4: linkSession()
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n── linkSession() ─────────────────────────────────────────────────');

test('links session id to task', () => {
  const e = fresh();
  const t = e.createTask({ title: 'T' });
  e.linkSession(t.id, 'session-abc');
  eq(e.getTask(t.id).linkedSessions.length, 1);
  eq(e.getTask(t.id).linkedSessions[0], 'session-abc');
});

test('does not duplicate the same session id', () => {
  const e = fresh();
  const t = e.createTask({ title: 'T' });
  e.linkSession(t.id, 'session-abc');
  e.linkSession(t.id, 'session-abc');
  eq(e.getTask(t.id).linkedSessions.length, 1);
});

test('no error and returns null when taskId is null', () => {
  const e = fresh();
  const result = e.linkSession(null, 'session-abc');
  eq(result, null);
});

test('no error when taskId is unknown', () => {
  const e = fresh();
  const result = e.linkSession('nonexistent', 'session-abc');
  eq(result, null);
});

test('getLinkedSessions returns [] for task with no sessions', () => {
  const e = fresh();
  const t = e.createTask({ title: 'T' });
  const sessions = e.getLinkedSessions(t.id);
  assert(Array.isArray(sessions) && sessions.length === 0);
});

test('getLinkedSessions returns array after linking', () => {
  const e = fresh();
  const t = e.createTask({ title: 'T' });
  e.linkSession(t.id, 's1');
  e.linkSession(t.id, 's2');
  const sessions = e.getLinkedSessions(t.id);
  eq(sessions.length, 2);
});

test('getLinkedSessions returns a copy (not shared reference)', () => {
  const e = fresh();
  const t = e.createTask({ title: 'T' });
  e.linkSession(t.id, 's1');
  const sessions = e.getLinkedSessions(t.id);
  sessions.push('hacked');
  eq(e.getTask(t.id).linkedSessions.length, 1, 'should not mutate stored array');
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 5: getTodayTasks()
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n── getTodayTasks() ───────────────────────────────────────────────');

test('in_progress task from yesterday appears in inProgress bucket', () => {
  const e = fresh();
  const t = e.createTask({ title: 'WIP' });
  // Manually backdate createdAt to simulate it was from yesterday
  e.tasks[0].createdAt = dateOffset(-1);
  e.setStatus(t.id, 'in_progress');
  const { inProgress } = e.getTodayTasks();
  assert(inProgress.some(x => x.id === t.id));
});

test('todo task with deadline today appears in dueToday bucket', () => {
  const e = fresh();
  const t = e.createTask({ title: 'Due Today', deadline: todayStr() });
  // Manually set createdAt to yesterday so it's not in createdToday
  e.tasks[0].createdAt = dateOffset(-1);
  e.saveState();
  const { dueToday } = e.getTodayTasks();
  assert(dueToday.some(x => x.id === t.id));
});

test('todo task with past deadline appears in overdue bucket', () => {
  const e = fresh();
  const t = e.createTask({ title: 'Overdue', deadline: dateOffset(-3) });
  e.tasks[0].createdAt = dateOffset(-5);
  e.saveState();
  const { overdue } = e.getTodayTasks();
  assert(overdue.some(x => x.id === t.id));
});

test('todo task created today with no deadline appears in createdToday bucket', () => {
  const e = fresh();
  const t = e.createTask({ title: 'New Today' });
  const { createdToday } = e.getTodayTasks();
  assert(createdToday.some(x => x.id === t.id));
});

test('done task does not appear in any bucket', () => {
  const e = fresh();
  const t = e.createTask({ title: 'Done Task', deadline: todayStr() });
  setDone(e, t.id);
  const { inProgress, overdue, dueToday, createdToday } = e.getTodayTasks();
  const all = [...inProgress, ...overdue, ...dueToday, ...createdToday];
  assert(!all.some(x => x.id === t.id), 'done task should not appear in any bucket');
});

test('in_progress task appears only in inProgress (not also in createdToday)', () => {
  const e = fresh();
  const t = e.createTask({ title: 'Active today' }); // created today
  e.setStatus(t.id, 'in_progress');
  const { inProgress, createdToday } = e.getTodayTasks();
  assert(inProgress.some(x => x.id === t.id), 'should be in inProgress');
  assert(!createdToday.some(x => x.id === t.id), 'should NOT be in createdToday');
});

test('overdue task is not also in createdToday', () => {
  const e = fresh();
  const t = e.createTask({ title: 'Old overdue', deadline: dateOffset(-2) });
  e.tasks[0].createdAt = dateOffset(-5);
  e.saveState();
  const { overdue, createdToday } = e.getTodayTasks();
  assert(overdue.some(x => x.id === t.id), 'should be in overdue');
  assert(!createdToday.some(x => x.id === t.id), 'should NOT be in createdToday');
});

test('overdue sorted by deadline ascending (oldest first)', () => {
  const e = fresh();
  const t1 = e.createTask({ title: 'Oldest', deadline: dateOffset(-5) });
  const t2 = e.createTask({ title: 'Newer', deadline: dateOffset(-1) });
  e.tasks.forEach(t => { t.createdAt = dateOffset(-10); });
  e.saveState();
  const { overdue } = e.getTodayTasks();
  eq(overdue[0].id, t1.id, 'oldest overdue should come first');
  eq(overdue[1].id, t2.id);
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 6: getKanbanColumns()
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n── getKanbanColumns() ────────────────────────────────────────────');

test('empty storage returns three empty arrays', () => {
  const e = fresh();
  const { todo, in_progress, done } = e.getKanbanColumns();
  eq(todo.length, 0);
  eq(in_progress.length, 0);
  eq(done.length, 0);
});

test('tasks appear in correct columns by status', () => {
  const e = fresh();
  const t1 = e.createTask({ title: 'Todo' });
  const t2 = e.createTask({ title: 'WIP' });
  const t3 = e.createTask({ title: 'Done' });
  e.setStatus(t2.id, 'in_progress');
  setDone(e, t3.id);
  const cols = e.getKanbanColumns();
  eq(cols.todo.length, 1);
  eq(cols.in_progress.length, 1);
  eq(cols.done.length, 1);
});

test('done column capped at DONE_LIMIT entries', () => {
  const e = fresh();
  const limit = TaskEngine.DONE_LIMIT;
  for (let i = 0; i < limit + 5; i++) {
    const t = e.createTask({ title: `Task ${i}` });
    setDone(e, t.id);
  }
  const { done, doneTotal } = e.getKanbanColumns();
  eq(done.length, limit, `done should be capped at ${limit}`);
  eq(doneTotal, limit + 5, 'doneTotal should reflect actual count');
});

test('done column sorted completedAt descending (newest first)', () => {
  const e = fresh();
  const t1 = e.createTask({ title: 'First Done' });
  setDone(e, t1.id);
  e.tasks[0].completedAt = dateOffset(-3);

  const t2 = e.createTask({ title: 'Last Done' });
  setDone(e, t2.id);
  e.tasks[1].completedAt = todayStr();
  e.saveState();

  const { done } = e.getKanbanColumns();
  eq(done[0].id, t2.id, 'most recent done should be first');
});

test('kanban filters by mode', () => {
  const e = fresh();
  e.createTask({ title: 'Work Task', mode: 'work' });
  e.createTask({ title: 'Learn Task', mode: 'learning' });
  const { todo } = e.getKanbanColumns({ mode: 'work' });
  eq(todo.length, 1);
  eq(todo[0].mode, 'work');
});

test('kanban filters by priority', () => {
  const e = fresh();
  e.createTask({ title: 'High', priority: 'high' });
  e.createTask({ title: 'Low', priority: 'low' });
  const { todo } = e.getKanbanColumns({ priority: 'high' });
  eq(todo.length, 1);
  eq(todo[0].priority, 'high');
});

test('kanban filters by query (title match)', () => {
  const e = fresh();
  e.createTask({ title: 'LeetCode problem' });
  e.createTask({ title: 'Job application' });
  const { todo } = e.getKanbanColumns({ query: 'leetcode' });
  eq(todo.length, 1);
  eq(todo[0].title, 'LeetCode problem');
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 7: Analytics
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n── Analytics ─────────────────────────────────────────────────────');

test('getCompletionRate() returns null with no tasks', () => {
  const e = fresh();
  eq(e.getCompletionRate(), null);
});

test('getCompletionRate() returns 100 when all done', () => {
  const e = fresh();
  const t = e.createTask({ title: 'T' });
  setDone(e, t.id);
  eq(e.getCompletionRate(), 100);
});

test('getCompletionRate() returns 0 when none done', () => {
  const e = fresh();
  e.createTask({ title: 'T1' });
  e.createTask({ title: 'T2' });
  eq(e.getCompletionRate(), 0);
});

test('getCompletionRate() with mode filter only counts matching tasks', () => {
  const e = fresh();
  const t1 = e.createTask({ title: 'Work', mode: 'work' });
  const t2 = e.createTask({ title: 'Learn', mode: 'learning' });
  setDone(e, t1.id);
  // work: 1/1 = 100%; learning: 0/1 = 0%
  eq(e.getCompletionRate({ mode: 'work' }), 100);
  eq(e.getCompletionRate({ mode: 'learning' }), 0);
});

test('getCompletionRate() with sinceDate filters by createdAt', () => {
  const e = fresh();
  const t1 = e.createTask({ title: 'Old' });
  e.tasks[0].createdAt = dateOffset(-10);
  setDone(e, t1.id);
  const t2 = e.createTask({ title: 'New' }); // created today, not done
  e.saveState();

  // Since yesterday: only today's task counts (not done) → 0%
  const rate = e.getCompletionRate({ sinceDate: dateOffset(-1) });
  eq(rate, 0);
});

test('getModeBreakdown() returns zeroes with no tasks', () => {
  const e = fresh();
  const bd = e.getModeBreakdown();
  eq(bd.work, 0); eq(bd.learning, 0); eq(bd.class, 0); eq(bd.personal, 0);
});

test('getModeBreakdown() only counts done tasks', () => {
  const e = fresh();
  const t1 = e.createTask({ title: 'Work done', mode: 'work' });
  e.createTask({ title: 'Work todo', mode: 'work' });
  setDone(e, t1.id);
  const bd = e.getModeBreakdown();
  eq(bd.work, 1);
});

test('getPriorityExecution() returns null for buckets with no tasks', () => {
  const e = fresh();
  e.createTask({ title: 'Medium task', priority: 'medium' });
  const pe = e.getPriorityExecution();
  eq(pe.high, null, 'no high tasks → null');
  eq(pe.low, null, 'no low tasks → null');
  assert(pe.medium !== null, 'medium has a task → not null');
});

test('getPriorityExecution() calculates per-priority completion rate', () => {
  const e = fresh();
  const h1 = e.createTask({ title: 'H1', priority: 'high' });
  const h2 = e.createTask({ title: 'H2', priority: 'high' });
  setDone(e, h1.id);
  const pe = e.getPriorityExecution();
  eq(pe.high, 50);
});

test('getDeadlinePerformance() counts on-time vs late', () => {
  const e = fresh();
  const t1 = e.createTask({ title: 'On Time', deadline: dateOffset(1) });
  setDone(e, t1.id);
  e.tasks[0].completedAt = todayStr(); // completedAt < deadline → on time
  e.saveState();

  const t2 = e.createTask({ title: 'Late', deadline: dateOffset(-1) });
  setDone(e, t2.id);
  e.tasks[1].completedAt = todayStr(); // completedAt > deadline → late
  e.saveState();

  const dp = e.getDeadlinePerformance();
  eq(dp.onTime, 1);
  eq(dp.late, 1);
  eq(dp.onTimeRate, 50);
});

test('getDeadlinePerformance() treats no-deadline tasks in noDeadline', () => {
  const e = fresh();
  const t = e.createTask({ title: 'No DL' });
  setDone(e, t.id);
  const dp = e.getDeadlinePerformance();
  eq(dp.noDeadline, 1);
  eq(dp.onTimeRate, null, 'onTimeRate null when no deadlined completions');
});

test('getPerTaskStats() returns null for unknown id', () => {
  const e = fresh();
  eq(e.getPerTaskStats('bad-id'), null);
});

test('getPerTaskStats() returns zero stats for task with no sessions', () => {
  const e = fresh();
  const t = e.createTask({ title: 'T' });
  const stats = e.getPerTaskStats(t.id);
  eq(stats.sessionCount, 0);
  eq(stats.totalMinutes, 0);
  eq(stats.focusQualityAvg, null);
});

test('getPerTaskStats() reads linked sessions and calculates correctly', () => {
  const e = fresh();
  const today = todayStr();
  const sid = 'test-session-id';
  seedSessions('learning', [
    makeSession(today, { id: sid, duration: 1500, interrupted: false, focusQuality: 4 }),
  ]);
  const t = e.createTask({ title: 'T' });
  e.linkSession(t.id, sid);

  const stats = e.getPerTaskStats(t.id);
  eq(stats.sessionCount, 1);
  eq(stats.totalMinutes, 25); // 1500s = 25min
  eq(stats.focusQualityAvg, 4.0);
  eq(stats.deepWorkPct, 100); // uninterrupted + focusQuality >= 3
});

test('getPerTaskStats() calculates deep work pct correctly', () => {
  const e = fresh();
  const today = todayStr();
  const s1 = 'sid-deep';
  const s2 = 'sid-interrupted';
  seedSessions('learning', [
    makeSession(today, { id: s1, interrupted: false, focusQuality: 5 }),
    makeSession(today, { id: s2, interrupted: true }),
  ]);
  const t = e.createTask({ title: 'T' });
  e.linkSession(t.id, s1);
  e.linkSession(t.id, s2);

  const stats = e.getPerTaskStats(t.id);
  eq(stats.deepWorkPct, 50);
});

test('getWeeklyStats() returns 0 created when no tasks this week', () => {
  const e = fresh();
  const weekDates = e._getThisWeekDates();
  const stats = e.getWeeklyStats(weekDates);
  eq(stats.created, 0);
  eq(stats.completionRate, null);
});

test('getWeeklyStats() with provided weekDates uses those dates', () => {
  const e = fresh();
  // Manually plant a task in last week
  const t = e.createTask({ title: 'Last week task' });
  e.tasks[0].createdAt = dateOffset(-7);
  setDone(e, t.id);
  e.saveState();

  const lastWeekStart = dateOffset(-7);
  const [y, m, d] = lastWeekStart.split('-').map(Number);
  const sun = new Date(y, m - 1, d, 12, 0, 0);
  sun.setDate(sun.getDate() - sun.getDay());
  const weekDates = [];
  for (let i = 0; i < 7; i++) {
    const dt = new Date(sun);
    dt.setDate(dt.getDate() + i);
    const yy = dt.getFullYear();
    const mm = String(dt.getMonth()+1).padStart(2, '0');
    const dd = String(dt.getDate()).padStart(2, '0');
    weekDates.push(`${yy}-${mm}-${dd}`);
  }

  const stats = e.getWeeklyStats(weekDates);
  assert(stats.created >= 1, 'should find task from last week');
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 8: Persistence & Queries
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n── Persistence & Queries ─────────────────────────────────────────');

test("'lcc_tasks' key written on first save", () => {
  localStorage.clear();
  const e = new TaskEngine();
  e.createTask({ title: 'T' });
  assert(localStorage.getItem('lcc_tasks') !== null);
});

test('new engine instance reads existing lcc_tasks (simulated reload)', () => {
  const e = fresh();
  e.createTask({ title: 'Survives Reload' });
  const e2 = new TaskEngine();
  eq(e2.getAllTasks().length, 1);
  eq(e2.getAllTasks()[0].title, 'Survives Reload');
});

test('corrupted lcc_tasks falls back to empty array', () => {
  localStorage.clear();
  localStorage.setItem('lcc_tasks', '{bad json[');
  const e = new TaskEngine();
  eq(e.getAllTasks().length, 0);
});

test('getAllTasks() returns tasks sorted by createdAt descending', () => {
  const e = fresh();
  const t1 = e.createTask({ title: 'Old' });
  e.tasks[0].createdAt = dateOffset(-5);
  const t2 = e.createTask({ title: 'New' });
  e.saveState();

  const all = e.getAllTasks();
  eq(all[0].id, t2.id, 'newest should be first');
  eq(all[1].id, t1.id);
});

test('getTasksByStatus() returns only matching tasks', () => {
  const e = fresh();
  const t1 = e.createTask({ title: 'Todo' });
  const t2 = e.createTask({ title: 'Done' });
  setDone(e, t2.id);
  const todos = e.getTasksByStatus('todo');
  eq(todos.length, 1);
  eq(todos[0].id, t1.id);
});

test('getTasksByMode() returns only matching mode', () => {
  const e = fresh();
  e.createTask({ title: 'Work', mode: 'work' });
  e.createTask({ title: 'Learn', mode: 'learning' });
  const workTasks = e.getTasksByMode('work');
  eq(workTasks.length, 1);
  eq(workTasks[0].mode, 'work');
});

test('searchTasks() is case-insensitive', () => {
  const e = fresh();
  e.createTask({ title: 'LeetCode Practice' });
  e.createTask({ title: 'Job Application' });
  const results = e.searchTasks('leetcode');
  eq(results.length, 1);
  eq(results[0].title, 'LeetCode Practice');
});

test('searchTasks() matches description and tags', () => {
  const e = fresh();
  e.createTask({ title: 'Study', description: 'Review algorithms', tags: ['dsa'] });
  const byDesc = e.searchTasks('algorithms');
  eq(byDesc.length, 1);
  const byTag = e.searchTasks('dsa');
  eq(byTag.length, 1);
});

test('saveState() + reload preserves linkedSessions', () => {
  const e = fresh();
  const t = e.createTask({ title: 'T' });
  e.linkSession(t.id, 'sess-1');
  e.linkSession(t.id, 'sess-2');
  const e2 = new TaskEngine();
  const t2 = e2.getTask(t.id);
  eq(t2.linkedSessions.length, 2);
});

// ─────────────────────────────────────────────────────────────────────────────
// RESULTS
// ─────────────────────────────────────────────────────────────────────────────

console.log(`\n${'─'.repeat(60)}`);
console.log(`  ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
