const MODES = {
  home:          { label: 'Home' },
  work:          { label: 'Work' },
  learning:      { label: 'Personal Learning' },
  class:         { label: 'Class' },
  entertainment: { label: 'Entertainment' },
  finance:       { label: 'Finance' },
};

let currentMode = 'home';

function navigateTo(mode) {
  if (!MODES[mode]) mode = 'home';

  // hide all pages
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page-' + mode).classList.add('active');

  // update body class for ambient theming
  document.body.className = 'mode-' + mode;

  // update mode badge
  document.getElementById('mode-label').textContent = MODES[mode].label;

  // update nav active state
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mode === mode);
  });

  // persist to URL
  history.replaceState(null, '', '#' + mode);
  currentMode = mode;
}

// ── CLOCK ──
function updateClock() {
  const now = new Date();
  document.getElementById('clock-time').textContent =
    now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  document.getElementById('clock-date').textContent =
    now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

// ── STREAK (stub — reads from localStorage) ──
function loadStreak() {
  const data = JSON.parse(localStorage.getItem('lcc_user') || '{}');
  const streak = data.streak?.current ?? 0;
  document.getElementById('streak-count').textContent = streak;
}

// ── POMODORO UI CONTROLLER ──
const pomodoroUI = (() => {
  let engine = null;
  let pendingSessionId = null;
  let ratingEnergy = null;
  let ratingFocus  = null;

  function init() {
    engine = new PomodoroEngine('learning');

    engine.onTick = (remaining) => {
      updateDisplay(remaining);
      updateProgress(remaining, engine.duration);
    };

    engine.onStart = () => {
      setStatus('running', 'Running');
      showButtons('running');
      setInputDisabled(true);
    };

    engine.onPause = () => {
      setStatus('paused', 'Paused');
      showButtons('paused');
    };

    engine.onResume = () => {
      setStatus('running', 'Running');
      showButtons('running');
    };

    engine.onStop = () => {
      setStatus('ready', 'Ready');
      showButtons('idle');
      setInputDisabled(false);
      resetDisplay();
      renderHistory();
    };

    engine.onComplete = (sid) => {
      pendingSessionId = sid;
      setStatus('complete', 'Complete!');
      showButtons('idle');
      setInputDisabled(false);
      resetDisplay();
      renderHistory();
      openRatingModal();
    };

    // restore visual state if session was in progress (but not running — no auto-resume)
    if (engine.remaining > 0 && engine.currentSessionId) {
      updateDisplay(engine.remaining);
      updateProgress(engine.remaining, engine.duration);
      if (engine.pausedAt) {
        setStatus('paused', 'Paused');
        showButtons('paused');
      } else {
        // was running when page closed — show as paused
        setStatus('paused', 'Paused (reload)');
        showButtons('paused');
      }
      setInputDisabled(true);
    }

    renderHistory();
  }

  function start() {
    const mins = parseFloat(document.getElementById('pomo-duration').value);
    if (!mins || mins < 1) return;
    engine.start(mins);
  }

  function pause()  { engine.pause(); }
  function resume() { engine.resume(); }
  function stop()   { engine.stop(); }

  // rating modal
  function openRatingModal() {
    ratingEnergy = null;
    ratingFocus  = null;
    document.querySelectorAll('.star-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('rating-modal').style.display = 'flex';
  }

  function skipRating() {
    document.getElementById('rating-modal').style.display = 'none';
  }

  function saveRating() {
    if (ratingEnergy !== null || ratingFocus !== null) {
      engine.rateLastSession(ratingEnergy, ratingFocus);
      renderHistory();
    }
    document.getElementById('rating-modal').style.display = 'none';
  }

  // ── helpers ──

  function updateDisplay(seconds) {
    document.getElementById('timer-display').textContent = PomodoroEngine.formatTime(seconds);
  }

  function updateProgress(remaining, duration) {
    if (!duration) return;
    const pct = ((duration - remaining) / duration) * 100;
    document.getElementById('pomo-progress').style.width = pct + '%';
  }

  function resetDisplay() {
    const mins = parseFloat(document.getElementById('pomo-duration').value) || 25;
    document.getElementById('timer-display').textContent = PomodoroEngine.formatTime(mins * 60);
    document.getElementById('pomo-progress').style.width = '0%';
  }

  function setStatus(cls, label) {
    const el = document.getElementById('pomo-status');
    el.className = 'pomo-status-badge ' + cls;
    el.textContent = label;
  }

  function showButtons(state) {
    const map = {
      idle:    { start: true,  pause: false, resume: false, stop: false },
      running: { start: false, pause: true,  resume: false, stop: true  },
      paused:  { start: false, pause: false, resume: true,  stop: true  },
    };
    const s = map[state] || map.idle;
    document.getElementById('btn-start').style.display  = s.start  ? '' : 'none';
    document.getElementById('btn-pause').style.display  = s.pause  ? '' : 'none';
    document.getElementById('btn-resume').style.display = s.resume ? '' : 'none';
    document.getElementById('btn-stop').style.display   = s.stop   ? '' : 'none';
  }

  function setInputDisabled(disabled) {
    document.getElementById('pomo-duration').disabled = disabled;
  }

  function renderHistory() {
    const sessions = engine.getSessions(5);
    const container = document.getElementById('pomo-history-list');
    if (!sessions.length) {
      container.innerHTML = '<p class="placeholder-text">No sessions yet — start your first one.</p>';
      return;
    }

    container.innerHTML = sessions.map(s => {
      const mins      = Math.round(s.duration / 60);
      const dateStr   = new Date(s.completedAt).toLocaleString('en-US', {
        month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: true
      });
      const tag       = s.interrupted ? 'stopped' : 'done';
      const tagLabel  = s.interrupted ? 'Stopped' : 'Done';
      const ratings   = (s.energyLevel || s.focusQuality)
        ? `<div class="pomo-session-ratings">
            ${s.energyLevel  != null ? `<span class="pomo-rating-chip">⚡ ${s.energyLevel}/5</span>` : ''}
            ${s.focusQuality != null ? `<span class="pomo-rating-chip">🎯 ${s.focusQuality}/5</span>` : ''}
           </div>`
        : '';

      return `
        <div class="pomo-session-item">
          <div class="pomo-session-left">
            <span class="pomo-session-dur">${mins} min</span>
            <span class="pomo-session-time">${dateStr}</span>
          </div>
          <div class="pomo-session-right">
            ${ratings}
            <span class="pomo-session-tag ${tag}">${tagLabel}</span>
          </div>
        </div>`;
    }).join('');
  }

  // wire star buttons
  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.star-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const group = btn.dataset.group;
        const val   = parseInt(btn.dataset.val);

        document.querySelectorAll(`.star-btn[data-group="${group}"]`).forEach(b => {
          b.classList.toggle('active', parseInt(b.dataset.val) <= val);
        });

        if (group === 'energy') ratingEnergy = val;
        else ratingFocus = val;
      });
    });
  });

  return { init, start, pause, resume, stop, skipRating, saveRating };
})();

// ── INIT ──
document.addEventListener('DOMContentLoaded', () => {
  const hash = window.location.hash.slice(1);
  navigateTo(MODES[hash] ? hash : 'home');
  updateClock();
  setInterval(updateClock, 1000);
  loadStreak();
  pomodoroUI.init();
});

window.addEventListener('hashchange', () => {
  const hash = window.location.hash.slice(1);
  if (hash !== currentMode) navigateTo(hash);
});
