const MODES = {
  home:          { label: "Home" },
  work:          { label: "Work" },
  learning:      { label: "Personal Learning" },
  class:         { label: "Class" },
  entertainment: { label: "Entertainment" },
  finance:       { label: "Finance" },
  stats:         { label: "Stats" },
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

  if (mode === "stats") renderStatsPage();
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

// ── ANALYTICS ENGINE ──
let analyticsEngine = null;

// SVG ring circumference for r=52: 2π×52 ≈ 326.73
const RING_C = 326.73;

function renderHomeDashboard() {
  if (!analyticsEngine) return;
  const data = analyticsEngine.getThisWeekDashboard();
  const comp = analyticsEngine.getStatsComparison();
  const deltas = comp.deltas;

  // ── Focus score ring ──
  const score = data.focusScore;
  const ringFill = document.getElementById("focus-ring-fill");
  const scoreNum = document.getElementById("focus-score-num");
  const scoreDelta = document.getElementById("focus-score-delta");

  scoreNum.textContent = score;
  const offset = RING_C * (1 - score / 100);
  ringFill.style.strokeDashoffset = offset;

  const d = deltas.focusScore;
  if (d !== null) {
    scoreDelta.textContent = (d > 0 ? "+" : "") + d;
    scoreDelta.className = "fs-delta " + (d > 0 ? "pos" : d < 0 ? "neg" : "neu");
  } else {
    scoreDelta.textContent = "—";
    scoreDelta.className = "fs-delta neu";
  }

  // ── Metric cards ──
  function setMetric(id, val, unit, delta) {
    const card = document.getElementById(id);
    if (!card) return;
    const valEl = card.querySelector(".mc-val");
    const deltaEl = card.querySelector(".mc-delta");

    if (val === null) {
      valEl.innerHTML = '<span style="color:var(--muted)">—</span>';
    } else {
      valEl.innerHTML = val + (unit ? `<span class="mc-unit">${unit}</span>` : "");
    }

    if (!deltaEl) return;
    if (delta === null || delta === undefined) {
      deltaEl.textContent = "";
      deltaEl.className = "mc-delta";
    } else {
      deltaEl.textContent = (delta > 0 ? "+" : "") + delta + (unit || "");
      deltaEl.className = "mc-delta " + (delta > 0 ? "pos" : delta < 0 ? "neg" : "neu");
    }
  }

  // Re-render metric cards with delta rows
  const mcRow = document.getElementById("metric-cards-row");
  if (mcRow) {
    mcRow.innerHTML = `
      <div class="metric-card" id="mc-tasks">
        <div class="mc-val">—</div>
        <div class="mc-key">Task Execution</div>
        <div class="mc-delta"></div>
      </div>
      <div class="metric-card" id="mc-habits">
        <div class="mc-val">—</div>
        <div class="mc-key">Habit Consistency</div>
        <div class="mc-delta"></div>
      </div>
      <div class="metric-card" id="mc-focus-time">
        <div class="mc-val">—</div>
        <div class="mc-key">Focus Hours</div>
        <div class="mc-delta"></div>
      </div>
      <div class="metric-card" id="mc-deep-work">
        <div class="mc-val">—</div>
        <div class="mc-key">Deep Work Ratio</div>
        <div class="mc-delta"></div>
      </div>`;
  }

  const te = data.taskExecution;
  setMetric("mc-tasks",
    te !== null ? te + "%" : null, null,
    deltas.taskExecution !== null ? deltas.taskExecution : null);

  setMetric("mc-habits",
    data.habitConsistency + "%", null,
    deltas.habitConsistency);

  setMetric("mc-focus-time",
    data.totalFocusTime, "h",
    deltas.totalFocusTime);

  setMetric("mc-deep-work",
    data.deepWorkRatio + "%", null,
    deltas.deepWorkRatio);

  // ── Sparkline ──
  const svg = document.getElementById("focus-sparkline");
  const daysEl = document.getElementById("focus-sparkline-days");
  if (svg && data.dailyScores) {
    renderSparkline(svg, daysEl, data.dailyScores, analyticsEngine.getToday());
  }
}

const DAY_ABBR = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function renderSparkline(svg, daysEl, dailyScores, today) {
  const W = 280, H = 60, PAD = 6;
  const n = dailyScores.length;
  const xStep = (W - PAD * 2) / (n - 1);

  // Only use non-null scores for scale
  const scores = dailyScores.map(d => d.score !== null ? d.score : 0);
  const maxVal = Math.max(...scores, 1);

  const pts = dailyScores.map((d, i) => {
    const x = PAD + i * xStep;
    const y = d.score !== null
      ? H - PAD - ((d.score / maxVal) * (H - PAD * 2))
      : H - PAD;
    return { x, y, score: d.score, date: d.date };
  });

  // Build polyline path — skip future (null) segments
  let pathD = "";
  pts.forEach((p, i) => {
    if (p.score === null) return;
    if (pathD === "" || (i > 0 && pts[i - 1].score === null)) {
      pathD += `M ${p.x} ${p.y}`;
    } else {
      pathD += ` L ${p.x} ${p.y}`;
    }
  });

  // Area fill path
  let areaD = pathD;
  const lastNonNull = [...pts].reverse().find(p => p.score !== null);
  const firstNonNull = pts.find(p => p.score !== null);
  if (firstNonNull && lastNonNull) {
    areaD += ` L ${lastNonNull.x} ${H} L ${firstNonNull.x} ${H} Z`;
  }

  svg.innerHTML = `
    <defs>
      <linearGradient id="spark-grad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%"   stop-color="#4f8ef7" stop-opacity="0.22"/>
        <stop offset="100%" stop-color="#4f8ef7" stop-opacity="0"/>
      </linearGradient>
    </defs>
    ${areaD ? `<path d="${areaD}" fill="url(#spark-grad)" stroke="none"/>` : ""}
    ${pathD  ? `<path d="${pathD}" fill="none" stroke="#4f8ef7" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>` : ""}
    ${pts.map(p => p.score !== null
      ? `<circle cx="${p.x}" cy="${p.y}" r="${p.date === today ? 4 : 3}"
           fill="${p.date === today ? "#4f8ef7" : "#0d1018"}"
           stroke="#4f8ef7" stroke-width="2"/>`
      : ""
    ).join("")}
  `;

  // Day labels
  if (daysEl) {
    daysEl.innerHTML = dailyScores.map((d, i) => {
      const dayIdx = new Date(d.date + "T12:00:00").getDay();
      const isToday = d.date === today;
      return `<span class="${isToday ? "is-today" : ""}">${DAY_ABBR[dayIdx]}</span>`;
    }).join("");
  }
}

function renderStatsPage() {
  if (!analyticsEngine) return;
  const comp = analyticsEngine.getStatsComparison();
  const trends = analyticsEngine.getMonthlyTrends();

  // ── Week comparison ──
  const compEl = document.getElementById("stats-comparison");
  if (compEl) {
    const tw = comp.thisWeek;
    const lw = comp.lastWeek;
    const dl = comp.deltas;

    function fmtVal(v, unit) {
      if (v === null) return '<span style="color:var(--muted)">—</span>';
      return v + (unit || "");
    }
    function fmtDelta(d, unit) {
      if (d === null) return '<span class="sc-delta-cell neu">—</span>';
      const cls = d > 0 ? "pos" : d < 0 ? "neg" : "neu";
      const prefix = d > 0 ? "+" : "";
      return `<span class="sc-delta-cell ${cls}">${prefix}${d}${unit || ""}</span>`;
    }

    const rows = [
      { label: "Focus Score",        tw: fmtVal(tw.focusScore, ""),    lw: fmtVal(lw.focusScore, ""),    delta: fmtDelta(dl.focusScore, "") },
      { label: "Task Execution",     tw: fmtVal(tw.taskExecution !== null ? tw.taskExecution + "%" : null, ""), lw: fmtVal(lw.taskExecution !== null ? lw.taskExecution + "%" : null, ""), delta: fmtDelta(dl.taskExecution, "%") },
      { label: "Habit Consistency",  tw: fmtVal(tw.habitConsistency + "%", ""), lw: fmtVal(lw.habitConsistency + "%", ""), delta: fmtDelta(dl.habitConsistency, "%") },
      { label: "Deep Work Ratio",    tw: fmtVal(tw.deepWorkRatio + "%", ""), lw: fmtVal(lw.deepWorkRatio + "%", ""), delta: fmtDelta(dl.deepWorkRatio, "%") },
      { label: "Focus Time",         tw: fmtVal(tw.totalFocusTime + "h", ""), lw: fmtVal(lw.totalFocusTime + "h", ""), delta: fmtDelta(dl.totalFocusTime, "h") },
      { label: "Cognitive Quality",  tw: fmtVal(tw.cognitiveQuality + "%", ""), lw: fmtVal(lw.cognitiveQuality + "%", ""), delta: fmtDelta(dl.cognitiveQuality, "%") },
    ];

    compEl.innerHTML = `
      <div class="stats-compare-grid">
        <div class="sc-head">Metric</div>
        <div class="sc-head">This Week</div>
        <div class="sc-head">Last Week</div>
        <div class="sc-head">Delta</div>
        ${rows.map(r => `
          <div class="stats-compare-row">
            <div class="sc-metric">${r.label}</div>
            <div class="sc-val">${r.tw}</div>
            <div class="sc-val muted">${r.lw}</div>
            <div>${r.delta}</div>
          </div>`).join("")}
      </div>`;
  }

  // ── Mode breakdown ──
  const modeEl = document.getElementById("stats-mode-breakdown");
  if (modeEl) {
    const mb = analyticsEngine.getThisWeekDashboard().modeBreakdown;
    const modeRows = [
      { mode: "work",     label: "💼 Work",     pct: mb.work },
      { mode: "learning", label: "🧠 Learning", pct: mb.learning },
      { mode: "class",    label: "📚 Class",    pct: mb.class },
    ];
    modeEl.innerHTML = modeRows.map(r => `
      <div class="mode-bar-row">
        <div class="mode-bar-label">${r.label}</div>
        <div class="mode-bar-track">
          <div class="mode-bar-fill ${r.mode}" style="width:${r.pct}%"></div>
        </div>
        <div class="mode-bar-pct">${r.pct}%</div>
      </div>`).join("");
  }

  // ── Monthly trends ──
  const trendEl = document.getElementById("stats-monthly-trends");
  if (trendEl) {
    trendEl.innerHTML = `
      <table class="trends-table">
        <thead>
          <tr>
            <th>Week</th>
            <th>Focus</th>
            <th>Tasks</th>
            <th>Habits</th>
            <th>Hours</th>
          </tr>
        </thead>
        <tbody>
          ${trends.map(w => `
            <tr class="${w.label === "This Week" ? "trend-this-week" : ""}">
              <td>${w.label}</td>
              <td>${w.focusScore}</td>
              <td>${w.taskExecution !== null ? w.taskExecution + "%" : "—"}</td>
              <td>${w.habitConsistency}%</td>
              <td>${w.totalFocusTime}h</td>
            </tr>`).join("")}
        </tbody>
      </table>`;
  }
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

  analyticsEngine = new AnalyticsEngine();
  renderHomeDashboard();
});

window.addEventListener("hashchange", () => {
  const hash = window.location.hash.slice(1);
  if (hash !== currentMode) navigateTo(hash);
});
