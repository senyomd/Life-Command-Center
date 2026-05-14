/**
 * AnalyticsEngine — single source of truth for all dashboard metrics.
 * Pure computation over localStorage. No UI, no side effects.
 * All dates: local device time, YYYY-MM-DD. Week starts Sunday.
 */
class AnalyticsEngine {

  // ── DATE HELPERS ─────────────────────────────────────────────────────────

  getToday() {
    return this._dateToStr(new Date());
  }

  /** Returns the Date object for the Sunday that starts the week containing dateStr */
  getWeekStart(dateStr) {
    const d = this._parseDate(dateStr);
    d.setDate(d.getDate() - d.getDay());
    return d;
  }

  /** Returns [Sun, Mon, Tue, Wed, Thu, Fri, Sat] as YYYY-MM-DD strings */
  getWeekDates(startDate) {
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      dates.push(this._dateToStr(d));
    }
    return dates;
  }

  getThisWeekDates() {
    return this.getWeekDates(this.getWeekStart(this.getToday()));
  }

  getLastWeekDates() {
    const start = this.getWeekStart(this.getToday());
    start.setDate(start.getDate() - 7);
    return this.getWeekDates(start);
  }

  // ── DATA LOADING ─────────────────────────────────────────────────────────

  _loadSessions(mode) {
    try {
      return JSON.parse(localStorage.getItem(`pomodoro_sessions_${mode}`) || '[]');
    } catch { return []; }
  }

  _loadAllSessions() {
    return [
      ...this._loadSessions('learning'),
      ...this._loadSessions('work'),
      ...this._loadSessions('class'),
    ];
  }

  _loadHabits() {
    try {
      return JSON.parse(localStorage.getItem('habits') || '[]');
    } catch { return []; }
  }

  _loadTasks() {
    try {
      return JSON.parse(localStorage.getItem('lcc_tasks') || '[]');
    } catch { return []; }
  }

  // ── FILTERING ────────────────────────────────────────────────────────────

  _sessionsForDates(sessions, dates) {
    const set = new Set(dates);
    return sessions.filter(s => s.completedAt && set.has(s.completedAt.slice(0, 10)));
  }

  // ── CORE METRIC CALCULATORS ──────────────────────────────────────────────

  /**
   * Task execution rate for the week.
   * Returns null if no tasks exist (no tasks ≠ 0% — it means untracked).
   */
  _calcTaskExecution(weekDates, tasks) {
    const set = new Set(weekDates);
    const weekTasks = tasks.filter(t => t.createdAt && set.has(t.createdAt.slice(0, 10)));
    if (weekTasks.length === 0) return null;
    const done = weekTasks.filter(t => t.status === 'done').length;
    return (done / weekTasks.length) * 100;
  }

  /**
   * Deep work quality score (0–100).
   * Composite of: session volume (40%), uninterrupted ratio (40%), focus quality (20%).
   */
  _calcDeepWorkQuality(weekDates, sessions) {
    const week = this._sessionsForDates(sessions, weekDates);
    const total = week.length;
    if (total === 0) return 0;

    // Volume: 10 sessions/week = full marks
    const volumeScore = Math.min(total / 10, 1) * 100;

    // Uninterrupted ratio
    const uninterrupted = week.filter(s => !s.interrupted).length;
    const uninterruptedScore = (uninterrupted / total) * 100;

    // Focus quality (rated sessions only; fallback to uninterrupted score)
    const rated = week.filter(s => s.focusQuality != null);
    const focusQualityScore = rated.length > 0
      ? (rated.reduce((sum, s) => sum + s.focusQuality, 0) / rated.length / 5) * 100
      : uninterruptedScore;

    return (volumeScore * 0.4) + (uninterruptedScore * 0.4) + (focusQualityScore * 0.2);
  }

  /**
   * Habit consistency (0–100).
   * possible = habits × days elapsed this week (up to today).
   */
  _calcHabitConsistency(weekDates, habits) {
    if (habits.length === 0) return 0;
    const today = this.getToday();
    const elapsed = weekDates.filter(d => d <= today);
    if (elapsed.length === 0) return 0;

    const possible = habits.length * elapsed.length;
    let completed = 0;
    habits.forEach(h => {
      const set = new Set(h.completions);
      elapsed.forEach(d => { if (set.has(d)) completed++; });
    });
    return (completed / possible) * 100;
  }

  /**
   * Cognitive quality (0–100).
   * Average of normalized energy + focus quality ratings.
   * Returns 0 if no sessions have been rated.
   */
  _calcCognitiveQuality(weekDates, sessions) {
    const week = this._sessionsForDates(sessions, weekDates);
    const energyRated = week.filter(s => s.energyLevel  != null);
    const focusRated  = week.filter(s => s.focusQuality != null);
    if (energyRated.length === 0 && focusRated.length === 0) return 0;

    const avg = (arr, key) => arr.reduce((sum, s) => sum + s[key], 0) / arr.length;

    const eScore = energyRated.length > 0 ? avg(energyRated, 'energyLevel')  / 5 * 100 : null;
    const fScore = focusRated.length  > 0 ? avg(focusRated,  'focusQuality') / 5 * 100 : null;

    if (eScore !== null && fScore !== null) return (eScore + fScore) / 2;
    return eScore ?? fScore;
  }

  // ── FOCUS SCORE FORMULA ──────────────────────────────────────────────────

  /**
   * Weighted focus score (0–100).
   * If no tasks tracked, redistributes 30% task weight to deep work (15%) and habits (15%).
   */
  _buildFocusScore(taskEx, deepWork, habitCon, cogQual) {
    let score;
    if (taskEx === null) {
      score = (deepWork * 0.45) + (habitCon * 0.40) + (cogQual * 0.15);
    } else {
      score = (taskEx * 0.30) + (deepWork * 0.30) + (habitCon * 0.25) + (cogQual * 0.15);
    }
    return Math.min(Math.round(score), 100);
  }

  // ── DERIVED METRICS ──────────────────────────────────────────────────────

  _calcTotalFocusTime(weekDates, sessions) {
    const secs = this._sessionsForDates(sessions, weekDates)
      .reduce((sum, s) => sum + (s.duration || 0), 0);
    return Math.round((secs / 3600) * 10) / 10; // hours, 1 decimal
  }

  /**
   * Deep work ratio: sessions that are uninterrupted AND (unrated OR focusQuality >= 3).
   */
  _calcDeepWorkRatio(weekDates, sessions) {
    const week = this._sessionsForDates(sessions, weekDates);
    if (week.length === 0) return 0;
    const deep = week.filter(s => !s.interrupted && (s.focusQuality == null || s.focusQuality >= 3)).length;
    return Math.round((deep / week.length) * 100);
  }

  /** Mode breakdown by total session duration (seconds). Returns percentages 0–100. */
  _calcModeBreakdown(weekDates) {
    const modes = ['work', 'learning', 'class'];
    const raw = {};
    let total = 0;
    modes.forEach(mode => {
      const secs = this._sessionsForDates(this._loadSessions(mode), weekDates)
        .reduce((sum, s) => sum + (s.duration || 0), 0);
      raw[mode] = secs;
      total += secs;
    });
    if (total === 0) return { work: 0, learning: 0, class: 0 };
    return {
      work:     Math.round((raw.work     / total) * 100),
      learning: Math.round((raw.learning / total) * 100),
      class:    Math.round((raw.class    / total) * 100),
    };
  }

  _calcEnergyAvg(weekDates, sessions) {
    const rated = this._sessionsForDates(sessions, weekDates).filter(s => s.energyLevel != null);
    if (rated.length === 0) return null;
    return Math.round(rated.reduce((sum, s) => sum + s.energyLevel, 0) / rated.length * 10) / 10;
  }

  _calcFocusQualityAvg(weekDates, sessions) {
    const rated = this._sessionsForDates(sessions, weekDates).filter(s => s.focusQuality != null);
    if (rated.length === 0) return null;
    return Math.round(rated.reduce((sum, s) => sum + s.focusQuality, 0) / rated.length * 10) / 10;
  }

  // ── DAILY SCORES (for sparkline) ─────────────────────────────────────────

  /**
   * Returns [{date, score}] for each day of the week.
   * Future dates → score: null.
   * Score = session contribution (0–60) + habit contribution (0–40).
   */
  getDailyScores(weekDates) {
    const allSessions = this._loadAllSessions();
    const habits = this._loadHabits();
    const today = this.getToday();

    return weekDates.map(date => {
      if (date > today) return { date, score: null };
      const daySessions = allSessions.filter(s => s.completedAt?.slice(0, 10) === date);
      const sessionScore = Math.min(daySessions.length / 3, 1) * 60;
      const habitsDone   = habits.filter(h => h.completions.includes(date)).length;
      const habitScore   = habits.length > 0 ? (habitsDone / habits.length) * 40 : 0;
      return { date, score: Math.round(sessionScore + habitScore) };
    });
  }

  // ── PRIVATE COMPOSITE BUILDER ────────────────────────────────────────────

  _getWeekMetrics(weekDates) {
    const sessions  = this._loadAllSessions();
    const habits    = this._loadHabits();
    const tasks     = this._loadTasks();

    const taskEx    = this._calcTaskExecution(weekDates, tasks);
    const deepWork  = this._calcDeepWorkQuality(weekDates, sessions);
    const habitCon  = this._calcHabitConsistency(weekDates, habits);
    const cogQual   = this._calcCognitiveQuality(weekDates, sessions);

    return {
      focusScore:       this._buildFocusScore(taskEx, deepWork, habitCon, cogQual),
      taskExecution:    taskEx !== null ? Math.round(taskEx)   : null,
      deepWorkQuality:  Math.round(deepWork),
      habitConsistency: Math.round(habitCon),
      cognitiveQuality: Math.round(cogQual),
      totalFocusTime:   this._calcTotalFocusTime(weekDates, sessions),
      deepWorkRatio:    this._calcDeepWorkRatio(weekDates, sessions),
      modeBreakdown:    this._calcModeBreakdown(weekDates),
      energyAvg:        this._calcEnergyAvg(weekDates, sessions),
      focusQualityAvg:  this._calcFocusQualityAvg(weekDates, sessions),
      sessionCount:     this._sessionsForDates(sessions, weekDates).length,
    };
  }

  // ── PUBLIC API ───────────────────────────────────────────────────────────

  /** Full home-page dashboard payload for the current week */
  getThisWeekDashboard() {
    const weekDates = this.getThisWeekDates();
    return {
      weekDates,
      dailyScores: this.getDailyScores(weekDates),
      ...this._getWeekMetrics(weekDates),
    };
  }

  /** This week vs last week, with per-metric deltas */
  getStatsComparison() {
    const thisWeek = this._getWeekMetrics(this.getThisWeekDates());
    const lastWeek = this._getWeekMetrics(this.getLastWeekDates());

    const delta = (a, b) => (a === null || b === null) ? null : Math.round(a - b);
    const deltaF = (a, b) => (a === null || b === null) ? null : Math.round((a - b) * 10) / 10;

    return {
      thisWeek,
      lastWeek,
      deltas: {
        focusScore:       delta(thisWeek.focusScore,       lastWeek.focusScore),
        taskExecution:    delta(thisWeek.taskExecution,    lastWeek.taskExecution),
        habitConsistency: delta(thisWeek.habitConsistency, lastWeek.habitConsistency),
        deepWorkRatio:    delta(thisWeek.deepWorkRatio,    lastWeek.deepWorkRatio),
        totalFocusTime:   deltaF(thisWeek.totalFocusTime,  lastWeek.totalFocusTime),
        cognitiveQuality: delta(thisWeek.cognitiveQuality, lastWeek.cognitiveQuality),
      },
    };
  }

  /** Last 4 weeks for monthly trend display */
  getMonthlyTrends() {
    const weeks = [];
    let start = this.getWeekStart(this.getToday());
    for (let i = 0; i < 4; i++) {
      const weekDates = this.getWeekDates(start);
      const label = i === 0 ? 'This Week' : i === 1 ? 'Last Week' : `${i} Wks Ago`;
      weeks.unshift({ label, weekDates, ...this._getWeekMetrics(weekDates) });
      start = new Date(start);
      start.setDate(start.getDate() - 7);
    }
    return weeks;
  }

  // ── PRIVATE UTILS ────────────────────────────────────────────────────────

  _parseDate(str) {
    const [y, m, d] = str.split('-').map(Number);
    return new Date(y, m - 1, d, 12, 0, 0);
  }

  _dateToStr(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }
}

if (typeof module !== 'undefined') module.exports = AnalyticsEngine;
