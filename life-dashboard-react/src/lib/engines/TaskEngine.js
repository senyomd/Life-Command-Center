/**
 * TaskEngine — single source of truth for task data.
 * Pure CRUD + analytics over localStorage. No UI, no side effects beyond storage.
 * Storage key: 'lcc_tasks'. Dates: local device time, YYYY-MM-DD.
 */
class TaskEngine {

  static DONE_LIMIT = 20;

  static VALID_MODES    = ['work', 'learning', 'class', 'personal'];
  static VALID_PRIORITY = ['low', 'medium', 'high'];
  static VALID_STATUS   = ['todo', 'in_progress', 'done'];

  constructor() {
    this.tasks = [];
    this._load();
  }

  // ── DATE HELPERS ─────────────────────────────────────────────────────────

  getToday() {
    return this._dateToStr(new Date());
  }

  _parseDate(str) {
    const [y, m, d] = str.split('-').map(Number);
    return new Date(y, m - 1, d, 12, 0, 0);
  }

  _dateToStr(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  _uuid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
  }

  // ── CRUD ─────────────────────────────────────────────────────────────────

  /**
   * Create a task. Required: title. Optional: mode, priority, description,
   * deadline (YYYY-MM-DD), estimatedPomodoros, tags.
   */
  createTask({
    title,
    mode         = 'learning',
    priority     = 'medium',
    description  = '',
    deadline     = null,
    estimatedPomodoros = 2,
    tags         = [],
  } = {}) {
    if (!title || !title.trim()) throw new Error('Task title is required');
    if (!TaskEngine.VALID_MODES.includes(mode)) {
      throw new Error(`Invalid mode "${mode}". Must be one of: ${TaskEngine.VALID_MODES.join(', ')}`);
    }
    if (!TaskEngine.VALID_PRIORITY.includes(priority)) {
      throw new Error(`Invalid priority "${priority}". Must be one of: ${TaskEngine.VALID_PRIORITY.join(', ')}`);
    }

    const task = {
      id: this._uuid(),
      title: title.trim(),
      description: description || '',
      mode,
      priority,
      status: 'todo',
      deadline: deadline || null,
      estimatedPomodoros: estimatedPomodoros || 2,
      linkedSessions: [],
      tags: Array.isArray(tags) ? [...tags] : [],
      createdAt: this.getToday(),
      completedAt: null,
    };

    this.tasks.push(task);
    this.saveState();
    return task;
  }

  getTask(id) {
    return this.tasks.find(t => t.id === id) || null;
  }

  /**
   * Partial update. Allowed fields: title, description, mode, priority,
   * deadline, estimatedPomodoros, tags. Ignores id, createdAt, completedAt,
   * linkedSessions, status (use setStatus instead).
   */
  updateTask(id, changes) {
    const task = this.tasks.find(t => t.id === id);
    if (!task) return null;

    const allowed = ['title', 'description', 'mode', 'priority', 'deadline', 'estimatedPomodoros', 'tags'];
    for (const key of allowed) {
      if (!(key in changes)) continue;
      if (key === 'title') {
        if (!changes.title || !changes.title.trim()) continue;
        task.title = changes.title.trim();
      } else if (key === 'mode') {
        if (!TaskEngine.VALID_MODES.includes(changes.mode)) continue;
        task.mode = changes.mode;
      } else if (key === 'priority') {
        if (!TaskEngine.VALID_PRIORITY.includes(changes.priority)) continue;
        task.priority = changes.priority;
      } else {
        task[key] = changes[key];
      }
    }

    this.saveState();
    return task;
  }

  deleteTask(id) {
    const idx = this.tasks.findIndex(t => t.id === id);
    if (idx === -1) return false;
    this.tasks.splice(idx, 1);
    this.saveState();
    return true;
  }

  // ── STATUS TRANSITIONS ────────────────────────────────────────────────────

  /**
   * Status transitions with one restriction: todo → done is not allowed.
   * A task must be in_progress before it can be marked done.
   *
   * Valid: todo→in_progress, in_progress→done, in_progress→todo,
   *        done→todo, done→in_progress
   * Blocked: todo→done (returns null)
   *
   * Automatically manages completedAt:
   * - → done:     sets completedAt to today
   * - → non-done: clears completedAt to null
   */
  setStatus(id, status) {
    if (!TaskEngine.VALID_STATUS.includes(status)) return null;
    const task = this.tasks.find(t => t.id === id);
    if (!task) return null;

    // Block todo → done: work must be started before it can be completed
    if (task.status === 'todo' && status === 'done') return null;

    task.status = status;
    task.completedAt = status === 'done' ? this.getToday() : null;
    this.saveState();
    return task;
  }

  // ── SESSION LINKING ───────────────────────────────────────────────────────

  /** Link a Pomodoro session ID to a task. No-op if taskId is null/undefined. */
  linkSession(taskId, sessionId) {
    if (!taskId || !sessionId) return null;
    const task = this.tasks.find(t => t.id === taskId);
    if (!task) return null;
    if (!task.linkedSessions.includes(sessionId)) {
      task.linkedSessions.push(sessionId);
      this.saveState();
    }
    return task;
  }

  getLinkedSessions(taskId) {
    const task = this.tasks.find(t => t.id === taskId);
    return task ? [...task.linkedSessions] : [];
  }

  // ── QUERIES ───────────────────────────────────────────────────────────────

  /** All tasks, sorted by createdAt descending (newest first). */
  getAllTasks() {
    return [...this.tasks].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  getTasksByStatus(status) {
    return this.tasks.filter(t => t.status === status);
  }

  getTasksByMode(mode) {
    return this.tasks.filter(t => t.mode === mode);
  }

  /**
   * Returns tasks relevant right now, split into four deduped buckets.
   * Priority: inProgress > overdue > dueToday > createdToday.
   * A task appears in at most one bucket.
   */
  getTodayTasks() {
    const today = this.getToday();
    const seen = new Set();

    const priorityOrder = { high: 0, medium: 1, low: 2 };
    const byPriority = (a, b) => priorityOrder[a.priority] - priorityOrder[b.priority];

    const inProgress = this.tasks
      .filter(t => t.status === 'in_progress')
      .sort(byPriority);
    inProgress.forEach(t => seen.add(t.id));

    const overdue = this.tasks
      .filter(t => !seen.has(t.id) && t.status !== 'done' && t.deadline && t.deadline < today)
      .sort((a, b) => a.deadline.localeCompare(b.deadline)); // oldest overdue first
    overdue.forEach(t => seen.add(t.id));

    const dueToday = this.tasks
      .filter(t => !seen.has(t.id) && t.status !== 'done' && t.deadline === today)
      .sort(byPriority);
    dueToday.forEach(t => seen.add(t.id));

    const createdToday = this.tasks
      .filter(t => !seen.has(t.id) && t.status === 'todo' && t.createdAt === today)
      .sort(byPriority);

    return { inProgress, overdue, dueToday, createdToday };
  }

  /**
   * Returns tasks grouped by status for the Kanban board.
   * Done column is capped at DONE_LIMIT (newest first).
   */
  getKanbanColumns(filters = {}) {
    let tasks = this.tasks;

    if (filters.mode)     tasks = tasks.filter(t => t.mode === filters.mode);
    if (filters.priority) tasks = tasks.filter(t => t.priority === filters.priority);
    if (filters.query) {
      const q = filters.query.toLowerCase();
      tasks = tasks.filter(t =>
        t.title.toLowerCase().includes(q) ||
        (t.description && t.description.toLowerCase().includes(q))
      );
    }

    const todo       = tasks.filter(t => t.status === 'todo');
    const in_progress = tasks.filter(t => t.status === 'in_progress');
    const doneAll    = tasks.filter(t => t.status === 'done')
      .sort((a, b) => (b.completedAt || '').localeCompare(a.completedAt || ''));
    const done       = doneAll.slice(0, TaskEngine.DONE_LIMIT);
    const doneTotal  = doneAll.length;

    return { todo, in_progress, done, doneTotal };
  }

  searchTasks(query) {
    if (!query) return this.getAllTasks();
    const q = query.toLowerCase();
    return this.tasks.filter(t =>
      t.title.toLowerCase().includes(q) ||
      (t.description && t.description.toLowerCase().includes(q)) ||
      (t.tags && t.tags.some(tag => tag.toLowerCase().includes(q)))
    );
  }

  // ── ANALYTICS ─────────────────────────────────────────────────────────────

  /**
   * Overall task completion rate (0–100) or null if no tasks.
   * @param {object} [options] - { mode?, sinceDate?, untilDate? }
   */
  getCompletionRate(options = {}) {
    let pool = this.tasks;
    if (options.mode)      pool = pool.filter(t => t.mode === options.mode);
    if (options.sinceDate) pool = pool.filter(t => t.createdAt >= options.sinceDate);
    if (options.untilDate) pool = pool.filter(t => t.createdAt <= options.untilDate);
    if (pool.length === 0) return null;
    const done = pool.filter(t => t.status === 'done').length;
    return Math.round((done / pool.length) * 100);
  }

  /**
   * Count of completed tasks per mode.
   * @returns {{ work, learning, class, personal }}
   */
  getModeBreakdown() {
    const result = { work: 0, learning: 0, class: 0, personal: 0 };
    this.tasks
      .filter(t => t.status === 'done')
      .forEach(t => { if (t.mode in result) result[t.mode]++; });
    return result;
  }

  /**
   * Completion rate per priority tier (0–100 or null if no tasks in tier).
   * @returns {{ high: number|null, medium: number|null, low: number|null }}
   */
  getPriorityExecution() {
    const calc = (p) => {
      const bucket = this.tasks.filter(t => t.priority === p);
      if (bucket.length === 0) return null;
      const done = bucket.filter(t => t.status === 'done').length;
      return Math.round((done / bucket.length) * 100);
    };
    return { high: calc('high'), medium: calc('medium'), low: calc('low') };
  }

  /**
   * Deadline performance across all completed tasks that had a deadline.
   * @returns {{ onTime, late, noDeadline, total, onTimeRate }}
   */
  getDeadlinePerformance() {
    const done = this.tasks.filter(t => t.status === 'done');
    const withDeadline = done.filter(t => t.deadline && t.completedAt);
    const onTime = withDeadline.filter(t => t.completedAt <= t.deadline).length;
    const late   = withDeadline.length - onTime;
    return {
      onTime,
      late,
      noDeadline: done.length - withDeadline.length,
      total: done.length,
      onTimeRate: withDeadline.length > 0 ? Math.round((onTime / withDeadline.length) * 100) : null,
    };
  }

  /**
   * Per-task stats derived from linked Pomodoro sessions.
   * Cross-reads pomodoro_sessions_* from localStorage.
   */
  getPerTaskStats(taskId) {
    const task = this.tasks.find(t => t.id === taskId);
    if (!task) return null;

    if (task.linkedSessions.length === 0) {
      return {
        task,
        sessionCount: 0,
        totalMinutes: 0,
        deepWorkPct: 0,
        focusQualityAvg: null,
        completedSessions: [],
      };
    }

    const sessionIdSet = new Set(task.linkedSessions);
    const allSessions  = this._loadAllSessions().filter(s => sessionIdSet.has(s.id));

    const totalSecs = allSessions.reduce((sum, s) => sum + (s.duration || 0), 0);
    const deepCount = allSessions.filter(
      s => !s.interrupted && (s.focusQuality == null || s.focusQuality >= 3)
    ).length;
    const rated = allSessions.filter(s => s.focusQuality != null);
    const focusQualityAvg = rated.length > 0
      ? Math.round(rated.reduce((sum, s) => sum + s.focusQuality, 0) / rated.length * 10) / 10
      : null;

    return {
      task,
      sessionCount: allSessions.length,
      totalMinutes: Math.round(totalSecs / 60),
      deepWorkPct: allSessions.length > 0
        ? Math.round((deepCount / allSessions.length) * 100) : 0,
      focusQualityAvg,
      completedSessions: allSessions,
    };
  }

  /**
   * Completion stats for a given week (or this week if omitted).
   * weekDates: YYYY-MM-DD array of 7 dates (Sun–Sat).
   */
  getWeeklyStats(weekDates) {
    if (!weekDates) weekDates = this._getThisWeekDates();
    const dateSet = new Set(weekDates);
    const weekTasks = this.tasks.filter(t => t.createdAt && dateSet.has(t.createdAt));
    const completed = weekTasks.filter(t => t.status === 'done');
    const completionRate = weekTasks.length > 0
      ? Math.round((completed.length / weekTasks.length) * 100) : null;

    const byMode = { work: 0, learning: 0, class: 0, personal: 0 };
    const byPriority = { high: 0, medium: 0, low: 0 };
    completed.forEach(t => {
      if (t.mode in byMode) byMode[t.mode]++;
      if (t.priority in byPriority) byPriority[t.priority]++;
    });

    return {
      created: weekTasks.length,
      completed: completed.length,
      completionRate,
      byMode,
      byPriority,
    };
  }

  // ── PERSISTENCE ───────────────────────────────────────────────────────────

  saveState() {
    localStorage.setItem('lcc_tasks', JSON.stringify(this.tasks));
  }

  _load() {
    try {
      const raw = localStorage.getItem('lcc_tasks');
      if (raw) {
        this.tasks = JSON.parse(raw);
        return;
      }
    } catch { /* corrupt — fall through */ }
    this.tasks = [];
  }

  // ── PRIVATE UTILS ─────────────────────────────────────────────────────────

  _loadAllSessions() {
    const all = [];
    for (const mode of ['learning', 'work', 'class']) {
      try {
        const raw = localStorage.getItem(`pomodoro_sessions_${mode}`);
        if (raw) all.push(...JSON.parse(raw));
      } catch { /* corrupt — skip */ }
    }
    return all;
  }

  _getThisWeekDates() {
    const today = new Date();
    today.setHours(12, 0, 0, 0);
    const sun = new Date(today);
    sun.setDate(sun.getDate() - sun.getDay());
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(sun);
      d.setDate(d.getDate() + i);
      dates.push(this._dateToStr(d));
    }
    return dates;
  }
}

if (typeof module !== 'undefined') module.exports = TaskEngine;

export default TaskEngine;
