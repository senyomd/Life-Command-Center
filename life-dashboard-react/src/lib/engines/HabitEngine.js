class HabitEngine {
  constructor() {
    this.habits = [];
    this._load();
  }

  // ── DATE HELPERS ──────────────────────────────────────────

  getToday() {
    return this._dateToStr(new Date());
  }

  getWeekStart(dateStr) {
    const d = this._parseDate(dateStr);
    d.setDate(d.getDate() - d.getDay()); // back to Sunday
    return d;
  }

  getWeekDates(startDate) {
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      dates.push(this._dateToStr(d));
    }
    return dates;
  }

  // ── PUBLIC API ────────────────────────────────────────────

  // Toggles a manual habit on any date ≤ today
  toggleHabit(habitId, date) {
    const today = this.getToday();
    if (date > today) return;

    const habit = this.habits.find(h => h.id === habitId);
    if (!habit || habit.type !== 'manual') return;

    const idx = habit.completions.indexOf(date);
    if (idx === -1) {
      habit.completions.push(date);
    } else {
      habit.completions.splice(idx, 1);
    }

    this._recalcStreak(habit);
    this.saveState();
  }

  // Derive auto habits from Pomodoro session data — always run on load
  checkAutoHabits() {
    const today = this.getToday();
    const modes = ['learning', 'work', 'class'];

    // Collect all completed (non-null completedAt) sessions for today
    const todaySessions = [];
    for (const mode of modes) {
      try {
        const raw = localStorage.getItem(`pomodoro_sessions_${mode}`);
        const sessions = raw ? JSON.parse(raw) : [];
        for (const s of sessions) {
          if (s.completedAt && s.completedAt.slice(0, 10) === today) {
            todaySessions.push(s);
          }
        }
      } catch { /* corrupt data — skip */ }
    }

    // Rule A: no_interrupted_sessions
    // ✓ if sessions exist today AND none are interrupted
    const noPhone = this.habits.find(h => h.rule === 'no_interrupted_sessions');
    if (noPhone) {
      noPhone.completions = noPhone.completions.filter(d => d !== today);
      const anyInterrupted = todaySessions.some(s => s.interrupted === true);
      if (todaySessions.length > 0 && !anyInterrupted) {
        noPhone.completions.push(today);
      }
      this._recalcStreak(noPhone);
    }

    // Rule B: min_3_pomodoro_sessions
    // ✓ if total sessions today across all modes >= 3
    const deepWork = this.habits.find(h => h.rule === 'min_3_pomodoro_sessions');
    if (deepWork) {
      deepWork.completions = deepWork.completions.filter(d => d !== today);
      if (todaySessions.length >= 3) {
        deepWork.completions.push(today);
      }
      this._recalcStreak(deepWork);
    }

    this.saveState();
  }

  // Returns { habit, week: [{date, completed, canToggle}] } for current week
  getHabitForWeek(habitId) {
    const habit = this.habits.find(h => h.id === habitId);
    if (!habit) return null;

    const today     = this.getToday();
    const weekStart = this.getWeekStart(today);
    const weekDates = this.getWeekDates(weekStart);
    const done      = new Set(habit.completions);

    const week = weekDates.map(date => ({
      date,
      completed:  done.has(date),
      canToggle:  habit.type === 'manual' && date <= today,
    }));

    return { habit, week };
  }

  getStreaks() {
    return this.habits.map(h => ({
      habitName: h.name,
      current:   h.streak.current,
      best:      h.streak.best,
    }));
  }

  saveState() {
    localStorage.setItem('habits', JSON.stringify(this.habits));
  }

  // ── PRIVATE ───────────────────────────────────────────────

  _load() {
    try {
      const raw = localStorage.getItem('habits');
      if (raw) {
        this.habits = JSON.parse(raw);
        return;
      }
    } catch { /* corrupt — fall through to defaults */ }
    this._initDefaults();
  }

  _initDefaults() {
    this.habits = [
      {
        id: this._uuid(), name: 'Daily LeetCode',
        type: 'manual', completions: [], streak: { current: 0, best: 0 },
      },
      {
        id: this._uuid(), name: 'Applications Sent',
        type: 'manual', completions: [], streak: { current: 0, best: 0 },
      },
      {
        id: this._uuid(), name: 'Morning Routine',
        type: 'manual', completions: [], streak: { current: 0, best: 0 },
      },
      {
        id: this._uuid(), name: 'No Phone During Pomodoro',
        type: 'auto', rule: 'no_interrupted_sessions',
        completions: [], streak: { current: 0, best: 0 },
      },
      {
        id: this._uuid(), name: 'Deep Work Completed',
        type: 'auto', rule: 'min_3_pomodoro_sessions',
        completions: [], streak: { current: 0, best: 0 },
      },
    ];
    this.saveState();
  }

  _recalcStreak(habit) {
    const today         = this.getToday();
    const completionSet = new Set(habit.completions);
    const todayDate     = this._parseDate(today);

    // Current streak: consecutive days ending at today (backwards)
    let current = 0;
    for (let i = 0; ; i++) {
      const d = new Date(todayDate);
      d.setDate(d.getDate() - i);
      if (completionSet.has(this._dateToStr(d))) {
        current++;
      } else {
        break;
      }
    }
    habit.streak.current = current;

    // Best streak: scan all sorted completions for longest consecutive run
    const sorted = [...habit.completions].sort();
    let best = current;
    if (sorted.length > 1) {
      let run = 1;
      for (let i = 1; i < sorted.length; i++) {
        const prev     = this._parseDate(sorted[i - 1]);
        const curr     = this._parseDate(sorted[i]);
        const diffDays = Math.round((curr - prev) / 86400000);
        run = diffDays === 1 ? run + 1 : 1;
        if (run > best) best = run;
      }
    }
    habit.streak.best = Math.max(habit.streak.best, best);
  }

  _parseDate(str) {
    const [y, m, d] = str.split('-').map(Number);
    return new Date(y, m - 1, d, 12, 0, 0); // noon avoids DST edge cases
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
}

if (typeof module !== 'undefined') module.exports = HabitEngine;

export default HabitEngine;
