class PomodoroEngine {
  constructor(mode) {
    this.mode = mode;
    this._tickInterval = null;

    // callbacks
    this.onStart    = null;
    this.onTick     = null;
    this.onPause    = null;
    this.onResume   = null;
    this.onStop     = null;
    this.onComplete = null;

    // restore persisted state or start fresh
    const saved = this._loadState();
    if (saved) {
      this.duration         = saved.duration;
      this.remaining        = saved.remaining;
      this.isRunning        = false; // never auto-resume on reload
      this.startedAt        = saved.startedAt;
      this.pausedAt         = saved.pausedAt;
      this.interrupted      = saved.interrupted;
      this.currentSessionId = saved.currentSessionId;
    } else {
      this._resetState();
    }
  }

  // ── PUBLIC ────────────────────────────────────────────────

  start(durationMinutes, label = '') {
    const secs = Math.floor(durationMinutes * 60);
    this.duration         = secs;
    this.remaining        = secs;
    this.isRunning        = true;
    this.interrupted      = false;
    this.startedAt        = new Date().toISOString();
    this.pausedAt         = null;
    this.currentSessionId = this._uuid();
    this.label            = String(label).trim();

    this._saveState();
    this._startTick();
    this.onStart?.(this.currentSessionId);
  }

  pause() {
    if (!this.isRunning) return;
    this.isRunning = false;
    this.pausedAt  = new Date().toISOString();
    this._stopTick();
    this._saveState();
    this.onPause?.();
  }

  resume() {
    if (this.isRunning || this.remaining <= 0) return;
    this.isRunning = true;
    this.pausedAt  = null;
    this._saveState();
    this._startTick();
    this.onResume?.();
  }

  stop() {
    const sid = this.currentSessionId;
    this.interrupted = true;
    this.isRunning   = false;
    this._stopTick();
    this._logSession();
    this._resetState();
    this._saveState();
    this.onStop?.(sid);
  }

  // ── PRIVATE ───────────────────────────────────────────────

  _tick() {
    this.remaining -= 1;
    this._saveState();
    this.onTick?.(this.remaining);
    if (this.remaining <= 0) {
      this._complete();
    }
  }

  _complete() {
    this.isRunning = false;
    this._stopTick();
    const sid = this.currentSessionId;
    this._logSession();
    this._resetState();
    this._saveState();
    this.onComplete?.(sid);
  }

  _startTick() {
    this._stopTick();
    this._tickInterval = setInterval(() => this._tick(), 1000);
  }

  _stopTick() {
    if (this._tickInterval) {
      clearInterval(this._tickInterval);
      this._tickInterval = null;
    }
  }

  _resetState() {
    this.duration         = 0;
    this.remaining        = 0;
    this.isRunning        = false;
    this.startedAt        = null;
    this.pausedAt         = null;
    this.interrupted      = false;
    this.currentSessionId = null;
    this.label            = '';
  }

  // ── PERSISTENCE ───────────────────────────────────────────

  _stateKey()    { return `pomodoro_state_${this.mode}`; }
  _sessionsKey() { return `pomodoro_sessions_${this.mode}`; }

  _saveState() {
    const state = {
      duration:         this.duration,
      remaining:        this.remaining,
      isRunning:        this.isRunning,
      startedAt:        this.startedAt,
      pausedAt:         this.pausedAt,
      interrupted:      this.interrupted,
      currentSessionId: this.currentSessionId,
    };
    localStorage.setItem(this._stateKey(), JSON.stringify(state));
  }

  _loadState() {
    try {
      const raw = localStorage.getItem(this._stateKey());
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  _logSession(overrides = {}) {
    const session = {
      id:           this.currentSessionId,
      mode:         this.mode,
      duration:     this.duration,
      startedAt:    this.startedAt,
      completedAt:  new Date().toISOString(),
      interrupted:  this.interrupted,
      energyLevel:  overrides.energyLevel  ?? null,
      focusQuality: overrides.focusQuality ?? null,
      label:        this.label || null,
    };

    let sessions = [];
    try {
      sessions = JSON.parse(localStorage.getItem(this._sessionsKey()) || '[]');
    } catch { /* ignore */ }

    sessions.unshift(session);
    localStorage.setItem(this._sessionsKey(), JSON.stringify(sessions));
    return session;
  }

  // Public method so UI can attach ratings after the fact
  rateLastSession(energyLevel, focusQuality) {
    try {
      const sessions = JSON.parse(localStorage.getItem(this._sessionsKey()) || '[]');
      if (sessions.length > 0) {
        sessions[0].energyLevel  = energyLevel;
        sessions[0].focusQuality = focusQuality;
        localStorage.setItem(this._sessionsKey(), JSON.stringify(sessions));
      }
    } catch { /* ignore */ }
  }

  getSessions(limit = 5) {
    try {
      const sessions = JSON.parse(localStorage.getItem(this._sessionsKey()) || '[]');
      return sessions.slice(0, limit);
    } catch {
      return [];
    }
  }

  // ── UTILITY ───────────────────────────────────────────────

  _uuid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
  }

  static formatTime(seconds) {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }
}

export default PomodoroEngine;
