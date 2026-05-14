import React from 'react'
import { useAnalyticsEngine } from '../../lib/hooks/useAnalyticsEngine'
import { useHabitEngine } from '../../lib/hooks/useHabitEngine'

function MetricCard({ label, value, sub, color }) {
  return (
    <div className="card" style={{ textAlign: 'center' }}>
      <div className="card-label">{label}</div>
      <div style={{ fontSize: 36, fontWeight: 800, color: color || 'var(--text)', letterSpacing: -1.5 }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>{sub}</div>}
    </div>
  )
}

function Home() {
  const { dashboard } = useAnalyticsEngine()
  const { engine: habitEngine, habits, weekDates, today, toggle } = useHabitEngine()

  const focusScore      = dashboard?.focusScore      ?? 0
  const taskExecution   = dashboard?.taskExecution   ?? 0
  const habitConsist    = dashboard?.habitConsistency ?? 0
  const totalFocusTime  = dashboard?.totalFocusTime  ?? 0
  const deepWorkRatio   = dashboard?.deepWorkRatio   ?? 0

  const focusHrsDisplay = totalFocusTime.toFixed(1) + 'h'

  function scoreColor(score) {
    if (score >= 80) return '#22c55e'
    if (score >= 55) return '#f97316'
    return '#ef4444'
  }

  return (
    <div className="page-enter">
      <div className="page-header">
        <div className="page-eyebrow">Overview</div>
        <h1 className="page-title">Dashboard</h1>
        <p className="page-sub">Your life at a glance — aggregated across all modes</p>
      </div>

      {/* Top metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16, marginBottom: 28 }}>
        <MetricCard
          label="Focus Score"
          value={`${focusScore.toFixed(0)}%`}
          sub="This week"
          color={scoreColor(focusScore)}
        />
        <MetricCard
          label="Task Execution"
          value={`${taskExecution.toFixed(0)}%`}
          sub="Completion rate"
          color={scoreColor(taskExecution)}
        />
        <MetricCard
          label="Habit Consistency"
          value={`${habitConsist.toFixed(0)}%`}
          sub="This week"
          color={scoreColor(habitConsist)}
        />
        <MetricCard
          label="Focus Time"
          value={focusHrsDisplay}
          sub="This week"
          color="var(--text)"
        />
        <MetricCard
          label="Deep Work"
          value={`${(deepWorkRatio * 100).toFixed(0)}%`}
          sub="Of focus sessions"
          color={scoreColor(deepWorkRatio * 100)}
        />
      </div>

      {/* Habit tracker */}
      <div className="card">
        <div className="card-label-row">
          <span className="card-label">Habit Tracker</span>
          <span style={{ fontSize: 11, color: 'var(--muted)' }}>{habits.length} habits</span>
        </div>

        {habits.length === 0 ? (
          <p className="placeholder-text">No habits yet. Add them in the vanilla app.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', color: 'var(--muted)', fontWeight: 600, paddingBottom: 10, paddingRight: 16, minWidth: 140 }}>Habit</th>
                  {weekDates.map((d) => (
                    <th key={d} style={{ color: 'var(--muted)', fontWeight: 600, paddingBottom: 10, textAlign: 'center', minWidth: 36 }}>
                      {new Date(d + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 2)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {habits.map((habit) => {
                  const completions = habit.completions || {}
                  return (
                    <tr key={habit.id}>
                      <td style={{ paddingBottom: 8, paddingRight: 16, color: 'var(--text)' }}>{habit.name}</td>
                      {weekDates.map((d) => {
                        const done = !!completions[d]
                        const isToday = d === today
                        return (
                          <td key={d} style={{ textAlign: 'center', paddingBottom: 8 }}>
                            <button
                              onClick={() => toggle(habit.id, d)}
                              style={{
                                width: 28, height: 28, borderRadius: 8,
                                border: `1px solid ${done ? 'transparent' : 'var(--border)'}`,
                                background: done ? '#22c55e' : (isToday ? 'rgba(79,142,247,.08)' : 'transparent'),
                                cursor: 'pointer',
                                fontSize: 12,
                                color: done ? '#fff' : 'var(--muted)',
                                fontWeight: 700,
                                transition: 'all 0.15s',
                              }}
                              title={`${habit.name} — ${d}`}
                            >
                              {done ? '✓' : '·'}
                            </button>
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

export default Home
