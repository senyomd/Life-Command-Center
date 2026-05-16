import React, { useState } from 'react'
import { usePomodoroEngine } from '../../lib/hooks/usePomodoroEngine'
import useAppStore from '../../store/appStore'

const MODE_META = {
  work:     { title: 'Work Focus',     eyebrow: 'Deep Work',    color: '#4f8ef7' },
  learning: { title: 'Learning Focus', eyebrow: 'Study Mode',   color: '#22c55e' },
  class:    { title: 'Class Focus',    eyebrow: 'Academic',     color: '#a855f7' },
}

function pad(n) { return String(n).padStart(2, '0') }

function Pomodoro({ mode = 'work' }) {
  const meta = MODE_META[mode] || MODE_META.work
  const { engine, tick, sessions } = usePomodoroEngine(mode)
  const openRatingModal = useAppStore((s) => s.openRatingModal)

  const [workMins, setWorkMins] = useState(25)
  const [taskLabel, setTaskLabel] = useState('')

  // Derive state from engine properties
  const isRunning = engine.isRunning
  const hasSession = !!engine.currentSessionId
  const isPaused = !isRunning && hasSession
  const isIdle = !isRunning && !hasSession

  const remaining = isIdle ? workMins * 60 : (engine.remaining ?? 0)
  const totalDuration = isIdle ? workMins * 60 : (engine.duration || workMins * 60)

  const mins = Math.floor(remaining / 60)
  const secs = remaining % 60

  const circumference = 2 * Math.PI * 90
  const progress = totalDuration > 0 ? 1 - remaining / totalDuration : 0
  const dashOffset = circumference * (1 - progress)

  function handleStart() {
    engine.start(workMins, taskLabel)
    setTaskLabel('')
  }

  function handleStop() {
    engine.stop()
    openRatingModal((rating) => {
      if (rating) engine.rateLastSession(rating.energy, rating.focus)
    })
  }

  return (
    <div className="page-enter">
      <div className="page-header">
        <div className="page-eyebrow">{meta.eyebrow}</div>
        <h1 className="page-title">{meta.title}</h1>
        <p className="page-sub">Deep work sessions with Pomodoro technique</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 24, alignItems: 'start' }}>
        {/* Timer */}
        <div className="card" style={{ textAlign: 'center', padding: 40 }}>
          <div style={{ position: 'relative', display: 'inline-block', marginBottom: 32 }}>
            <svg width="220" height="220" style={{ transform: 'rotate(-90deg)' }}>
              <circle cx="110" cy="110" r="90" fill="none" stroke="var(--border)" strokeWidth="8" />
              <circle
                cx="110" cy="110" r="90" fill="none"
                stroke={meta.color}
                strokeWidth="8"
                strokeDasharray={circumference}
                strokeDashoffset={dashOffset}
                strokeLinecap="round"
                style={{ transition: 'stroke-dashoffset 1s linear' }}
              />
            </svg>
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', textAlign: 'center' }}>
              <div style={{ fontSize: 48, fontWeight: 800, letterSpacing: -2, fontVariantNumeric: 'tabular-nums' }}>
                {pad(mins)}:{pad(secs)}
              </div>
              <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1.5, marginTop: 4 }}>
                {isIdle ? 'Ready' : isRunning ? 'Running' : 'Paused'}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            {isIdle && (
              <button className="btn btn-primary" onClick={handleStart}>▶ Start</button>
            )}
            {isRunning && (
              <>
                <button className="btn btn-secondary" onClick={() => engine.pause()}>⏸ Pause</button>
                <button className="btn btn-danger" onClick={handleStop}>■ Stop</button>
              </>
            )}
            {isPaused && (
              <>
                <button className="btn btn-primary" onClick={() => engine.resume()}>▶ Resume</button>
                <button className="btn btn-danger" onClick={handleStop}>■ Stop</button>
              </>
            )}
          </div>
        </div>

        {/* Side panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card">
            <div className="card-label">Settings</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <label style={{ fontSize: 12, color: 'var(--muted)' }}>
                Duration (minutes)
                <input
                  type="number" min={1} max={120}
                  value={workMins}
                  onChange={(e) => setWorkMins(Number(e.target.value))}
                  disabled={!isIdle}
                  style={{ display: 'block', width: '100%', marginTop: 6, padding: '8px 10px', background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 14, fontWeight: 700 }}
                />
              </label>
              <label style={{ fontSize: 12, color: 'var(--muted)' }}>
                Task label (optional)
                <input
                  type="text"
                  value={taskLabel}
                  onChange={(e) => setTaskLabel(e.target.value)}
                  placeholder="What are you working on?"
                  disabled={!isIdle}
                  style={{ display: 'block', width: '100%', marginTop: 6, padding: '8px 10px', background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 13 }}
                />
              </label>
            </div>
          </div>

          <div className="card">
            <div className="card-label">Recent Sessions</div>
            {sessions.length === 0 ? (
              <p className="placeholder-text">No sessions yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {sessions.map((s, i) => (
                  <div key={s.id || i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: i < sessions.length - 1 ? '1px solid var(--border)' : 'none' }}>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600 }}>{Math.floor(s.duration / 60)}m{s.label ? ` · ${s.label}` : ''}</div>
                      <div style={{ fontSize: 11, color: s.interrupted ? '#ef4444' : '#22c55e' }}>
                        {s.interrupted ? 'Stopped' : 'Completed'}
                      </div>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', textAlign: 'right' }}>
                      {s.energyLevel != null && <div>⚡ {s.energyLevel}/5</div>}
                      {s.focusQuality != null && <div>🎯 {s.focusQuality}/5</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Pomodoro
