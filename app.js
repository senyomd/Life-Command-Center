const MODES = {
  home: { label: "Home" },
  work: { label: "Work" },
  learning: { label: "Personal Learning" },
  class: { label: "Class" },
  entertainment: { label: "Entertainment" },
  finance: { label: "Finance" },
};

let currentMode = "home";

function navigateTo(mode) {
  if (!MODES[mode]) mode = "home";

  document
    .querySelectorAll(".page")
    .forEach((p) => p.classList.remove("active"));
  document.getElementById("page-" + mode).classList.add("active");
  document.body.className = "mode-" + mode;
  document.getElementById("mode-label").textContent = MODES[mode].label;
  document.querySelectorAll(".nav-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.mode === mode);
  });
  history.replaceState(null, "", "#" + mode);
  currentMode = mode;
}

// ── CLOCK ──
function updateClock() {
  const now = new Date();
  document.getElementById("clock-time").textContent = now.toLocaleTimeString(
    "en-US",
    { hour: "2-digit", minute: "2-digit", hour12: false },
  );
  document.getElementById("clock-date").textContent = now.toLocaleDateString(
    "en-US",
    { weekday: "short", month: "short", day: "numeric" },
  );
}

// ── STREAK ──
function loadStreak() {
  const data = JSON.parse(localStorage.getItem("lcc_user") || "{}");
  document.getElementById("streak-count").textContent =
    data.streak?.current ?? 0;
}

// ── SHARED RATING MODAL ──
let activePomodoro = null;
let ratingEnergy = null;
let ratingFocus = null;

function skipRating() {
  document.getElementById("rating-modal").style.display = "none";
  activePomodoro = null;
}

function saveRating() {
  if (activePomodoro && (ratingEnergy !== null || ratingFocus !== null)) {
    activePomodoro.rateAndRefresh(ratingEnergy, ratingFocus);
  }
  document.getElementById("rating-modal").style.display = "none";
  activePomodoro = null;
}

// ── POMODORO FACTORY ──
function makePomodoroUI(mode, prefix) {
  let engine = null;

  function el(id) {
    return document.getElementById(prefix + id);
  }

  function init() {
    engine = new PomodoroEngine(mode);

    engine.onTick = (remaining) => {
      updateDisplay(remaining);
      updateProgress(remaining, engine.duration);
    };

    engine.onStart = () => {
      setStatus("running", "Running");
      showButtons("running");
      setInputDisabled(true);
    };

    engine.onPause = () => {
      setStatus("paused", "Paused");
      showButtons("paused");
    };

    engine.onResume = () => {
      setStatus("running", "Running");
      showButtons("running");
    };

    engine.onStop = () => {
      setStatus("ready", "Ready");
      showButtons("idle");
      setInputDisabled(false);
      resetDisplay();
      renderHistory();
    };

    engine.onComplete = () => {
      setStatus("complete", "Complete!");
      showButtons("idle");
      setInputDisabled(false);
      resetDisplay();
      renderHistory();
      openModal();
    };

    // restore visual state on reload (no auto-resume)
    if (engine.remaining > 0 && engine.currentSessionId) {
      updateDisplay(engine.remaining);
      updateProgress(engine.remaining, engine.duration);
      setStatus("paused", engine.pausedAt ? "Paused" : "Paused (reload)");
      showButtons("paused");
      setInputDisabled(true);
    }

    renderHistory();
  }

  function start() {
    const mins = parseFloat(el("pomo-duration").value);
    if (!mins || mins < 1) return;
    engine.start(mins);
  }

  function pause() {
    engine.pause();
  }
  function resume() {
    engine.resume();
  }
  function stop() {
    engine.stop();
  }

  function rateAndRefresh(energy, focus) {
    engine.rateLastSession(energy, focus);
    renderHistory();
  }

  function openModal() {
    activePomodoro = { rateAndRefresh };
    ratingEnergy = null;
    ratingFocus = null;
    document
      .querySelectorAll(".star-btn")
      .forEach((b) => b.classList.remove("active"));
    document.getElementById("rating-modal").style.display = "flex";
  }

  // ── helpers ──

  function updateDisplay(seconds) {
    el("timer-display").textContent = PomodoroEngine.formatTime(seconds);
  }

  function updateProgress(remaining, duration) {
    if (!duration) return;
    el("pomo-progress").style.width =
      ((duration - remaining) / duration) * 100 + "%";
  }

  function resetDisplay() {
    const mins = parseFloat(el("pomo-duration").value) || 25;
    el("timer-display").textContent = PomodoroEngine.formatTime(mins * 60);
    el("pomo-progress").style.width = "0%";
  }

  function setStatus(cls, label) {
    const badge = el("pomo-status");
    badge.className = "pomo-status-badge " + cls;
    badge.textContent = label;
  }

  function showButtons(state) {
    const map = {
      idle: { start: true, pause: false, resume: false, stop: false },
      running: { start: false, pause: true, resume: false, stop: true },
      paused: { start: false, pause: false, resume: true, stop: true },
    };
    const s = map[state] || map.idle;
    el("btn-start").style.display = s.start ? "" : "none";
    el("btn-pause").style.display = s.pause ? "" : "none";
    el("btn-resume").style.display = s.resume ? "" : "none";
    el("btn-stop").style.display = s.stop ? "" : "none";
  }

  function setInputDisabled(disabled) {
    el("pomo-duration").disabled = disabled;
  }

  function renderHistory() {
    const sessions = engine.getSessions(5);
    const container = el("pomo-history-list");
    if (!sessions.length) {
      container.innerHTML =
        '<p class="placeholder-text">No sessions yet — start your first one.</p>';
      return;
    }
    container.innerHTML = sessions
      .map((s) => {
        const mins = Math.round(s.duration / 60);
        const dateStr = new Date(s.completedAt).toLocaleString("en-US", {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        });
        const tag = s.interrupted ? "stopped" : "done";
        const tagLabel = s.interrupted ? "Stopped" : "Done";
        const ratings =
          s.energyLevel != null || s.focusQuality != null
            ? `<div class="pomo-session-ratings">
            ${s.energyLevel != null ? `<span class="pomo-rating-chip">⚡ ${s.energyLevel}/5</span>` : ""}
            ${s.focusQuality != null ? `<span class="pomo-rating-chip">🎯 ${s.focusQuality}/5</span>` : ""}
           </div>`
            : "";
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
      })
      .join("");
  }

  return { init, start, pause, resume, stop };
}

// ── INSTANCES ──
const pomodoroUI       = makePomodoroUI("learning", "");
const pomodoroUI_work  = makePomodoroUI("work",     "work-");
const pomodoroUI_class = makePomodoroUI("class",    "class-");

// ── HABIT ENGINE ──
let habitEngine = null;

function handleHabitToggle(habitId, date) {
  habitEngine.toggleHabit(habitId, date);
  renderHabitGrid();
}

function renderHabitGrid() {
  const container = document.getElementById("habit-grid-container");
  if (!container || !habitEngine) return;

  const today     = habitEngine.getToday();
  const weekStart = habitEngine.getWeekStart(today);
  const weekDates = habitEngine.getWeekDates(weekStart);
  const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  let html = '<div class="habit-grid">';

  // ── Header row ──
  html += '<div class="habit-grid-corner"></div>';
  weekDates.forEach((date, i) => {
    const isToday = date === today;
    const [, m, d] = date.split("-");
    html += `<div class="habit-day-header${isToday ? " is-today" : ""}">
      <span class="habit-day-name">${DAY_NAMES[i]}</span>
      <span class="habit-day-date">${parseInt(m)}/${parseInt(d)}</span>
    </div>`;
  });

  // ── Habit rows ──
  habitEngine.habits.forEach((habit) => {
    const { week } = habitEngine.getHabitForWeek(habit.id);
    const isAuto   = habit.type === "auto";

    html += `<div class="habit-row-name">
      <span class="habit-row-label">${habit.name}</span>
      ${isAuto ? '<span class="habit-auto-tag">auto</span>' : ""}
    </div>`;

    week.forEach(({ date, completed, canToggle }) => {
      const isFuture = date > today;
      const classes  = ["habit-cell"];
      let content    = "";
      let clickAttr  = "";

      if (isFuture) {
        classes.push("future");
        content = "—";
      } else {
        classes.push(completed ? "completed" : "missed");
        content = completed ? "✓" : "✗";
        if (isAuto) {
          classes.push("auto");
        } else if (canToggle) {
          clickAttr = `onclick="handleHabitToggle('${habit.id}', '${date}')"`;
        }
      }

      html += `<div class="${classes.join(" ")}" ${clickAttr}>${content}</div>`;
    });
  });

  html += "</div>"; // /habit-grid

  // ── Streak row ──
  const streaks = habitEngine.getStreaks();
  html += '<div class="habit-streak-row">';
  streaks.forEach((s) => {
    const fire = s.current > 0 ? "🔥 " : "";
    html += `<div class="habit-streak-chip">
      <span class="hsc-name">${s.habitName}:</span>
      <span class="hsc-current">${fire}${s.current}d</span>
      <span class="hsc-best">best ${s.best}</span>
    </div>`;
  });
  html += "</div>";

  container.innerHTML = html;
}

// ── INIT ──
document.addEventListener("DOMContentLoaded", () => {
  const hash = window.location.hash.slice(1);
  navigateTo(MODES[hash] ? hash : "home");
  updateClock();
  setInterval(updateClock, 1000);
  loadStreak();

  // wire shared modal star buttons once
  document.querySelectorAll(".star-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const group = btn.dataset.group;
      const val = parseInt(btn.dataset.val);
      document
        .querySelectorAll(`.star-btn[data-group="${group}"]`)
        .forEach((b) => {
          b.classList.toggle("active", parseInt(b.dataset.val) <= val);
        });
      if (group === "energy") ratingEnergy = val;
      else ratingFocus = val;
    });
  });

  pomodoroUI.init();
  pomodoroUI_work.init();
  pomodoroUI_class.init();

  habitEngine = new HabitEngine();
  habitEngine.checkAutoHabits();
  renderHabitGrid();
});

window.addEventListener("hashchange", () => {
  const hash = window.location.hash.slice(1);
  if (hash !== currentMode) navigateTo(hash);
});
