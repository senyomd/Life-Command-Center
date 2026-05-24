import React, { useState } from 'react'
import { useAnalyticsEngine } from '../../lib/hooks/useAnalyticsEngine'
import { useHabitEngine } from '../../lib/hooks/useHabitEngine'

function deltaArrow(d) {
  if (d === null || d === undefined) return null
  if (d > 0) return { arrow: '↑', color: '#22c55e', sign: '+' }
  if (d < 0) return { arrow: '↓', color: '#ef4444', sign: '' }
  return { arrow: '→', color: 'var(--muted)', sign: '' }
}

function MetricCard({ label, value, sub, color, delta, deltaUnit }) {
  const di = deltaArrow(delta)
  return (
    <div className="card" style={{ textAlign: 'center' }}>
      <div className="card-label">{label}</div>
      <div style={{ fontSize: 36, fontWeight: 800, color: color || 'var(--text)', letterSpacing: -1.5 }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>{sub}</div>}
      {di && (
        <div style={{ fontSize: 12, fontWeight: 600, color: di.color, marginTop: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3 }}>
          <span style={{ fontSize: 14, fontWeight: 800 }}>{di.arrow}</span>
          {di.sign}{delta}{deltaUnit ?? '%'}
        </div>
      )}
    </div>
  )
}

function Home() {
  const { dashboard, comparison } = useAnalyticsEngine()
  const { engine: habitEngine, habits, weekDates, today, toggle, addHabit, removeHabit } = useHabitEngine()

  const [showAddModal, setShowAddModal]       = useState(false)
  const [newHabitName, setNewHabitName]       = useState('')
  const [nameError, setNameError]             = useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)

  const focusScore      = dashboard?.focusScore      ?? 0
  const taskExecution   = dashboard?.taskExecution   ?? 0
  const habitConsist    = dashboard?.habitConsistency ?? 0
  const totalFocusTime  = dashboard?.totalFocusTime  ?? 0
  const deepWorkRatio   = dashboard?.deepWorkRatio   ?? 0

  const focusHrsDisplay = totalFocusTime.toFixed(1) + 'h'
  const deltas = comparison?.deltas ?? {}

  function scoreColor(score) {
    if (score >= 80) return '#22c55e'
    if (score >= 55) return '#f97316'
    return '#ef4444'
  }

  function handleAddSubmit() {
    const trimmed = newHabitName.trim()
    if (!trimmed) { setNameError('Name is required.'); return }
    if (trimmed.length > 30) { setNameError('Max 30 characters.'); return }
    addHabit(trimmed)
    setNewHabitName('')
    setNameError('')
    setShowAddModal(false)
  }

  function handleDeleteConfirm() {
    if (confirmDeleteId) removeHabit(confirmDeleteId)
    setConfirmDeleteId(null)
  }

  const overlayStyle = {
    position: 'fixed', inset: 0,
    background: 'rgba(0,0,0,0.55)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 1000,
  }

  const modalStyle = {
    background: 'var(--card)',
    border: '1px solid var(--border)',
    borderRadius: 14,
    padding: '28px 32px',
    minWidth: 320,
    maxWidth: 400,
    width: '90vw',
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
          delta={deltas.focusScore}
        />
        <MetricCard
          label="Task Execution"
          value={`${taskExecution.toFixed(0)}%`}
          sub="Completion rate"
          color={scoreColor(taskExecution)}
          delta={deltas.taskExecution}
        />
        <MetricCard
          label="Habit Consistency"
          value={`${habitConsist.toFixed(0)}%`}
          sub="This week"
          color={scoreColor(habitConsist)}
          delta={deltas.habitConsistency}
        />
        <MetricCard
          label="Focus Time"
          value={focusHrsDisplay}
          sub="This week"
          color="var(--text)"
          delta={deltas.totalFocusTime}
          deltaUnit="h"
        />
        <MetricCard
          label="Deep Work"
          value={`${(deepWorkRatio * 100).toFixed(0)}%`}
          sub="Of focus sessions"
          color={scoreColor(deepWorkRatio * 100)}
          delta={deltas.deepWorkRatio}
        />
      </div>

      {/* Habit tracker */}
      <div className="card">
        <div className="card-label-row">
          <span className="card-label">Habit Tracker</span>
          <span style={{ fontSize: 11, color: 'var(--muted)' }}>{habits.length} habits</span>
        </div>

        {habits.length === 0 ? (
          <p className="placeholder-text">No habits yet.</p>
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
                  <th style={{ minWidth: 28 }} />
                </tr>
              </thead>
              <tbody>
                {habits.map((habit) => {
                  const completionSet = new Set(habit.completions || [])
                  const isDefault = !!habit.isDefault
                  return (
                    <tr key={habit.id}>
                      <td style={{ paddingBottom: 8, paddingRight: 16 }}>
                        <div style={{ color: 'var(--text)', fontSize: 12, fontWeight: 500 }}>{habit.name}</div>
                        <div style={{ fontSize: 11, marginTop: 2 }}>
                          {habit.streak?.current > 0
                            ? <span style={{ color: '#f97316', fontWeight: 600 }}>🔥 {habit.streak.current}-day streak</span>
                            : <span style={{ color: 'var(--muted)' }}>No streak yet</span>
                          }
                          {habit.streak?.best > 0 && (
                            <span style={{ color: 'var(--muted)', marginLeft: 8 }}>· Best: {habit.streak.best}</span>
                          )}
                        </div>
                      </td>
                      {weekDates.map((d) => {
                        const done    = completionSet.has(d)
                        const isToday = d === today
                        const canToggle = habit.type === 'manual' && d <= today
                        return (
                          <td key={d} style={{ textAlign: 'center', paddingBottom: 8 }}>
                            <button
                              onClick={() => canToggle && toggle(habit.id, d)}
                              disabled={!canToggle}
                              style={{
                                width: 28, height: 28, borderRadius: 8,
                                border: `1px solid ${done ? 'transparent' : 'var(--border)'}`,
                                background: done ? '#22c55e' : (isToday ? 'rgba(79,142,247,.08)' : 'transparent'),
                                cursor: canToggle ? 'pointer' : 'default',
                                fontSize: 12,
                                color: done ? '#fff' : 'var(--muted)',
                                fontWeight: 700,
                                transition: 'all 0.15s',
                                opacity: !canToggle && !done ? 0.35 : 1,
                              }}
                              title={`${habit.name} — ${d}`}
                            >
                              {done ? '✓' : '·'}
                            </button>
                          </td>
                        )
                      })}
                      <td style={{ textAlign: 'center', paddingBottom: 8 }}>
                        {!isDefault && (
                          <button
                            onClick={() => setConfirmDeleteId(habit.id)}
                            title="Delete habit"
                            style={{
                              width: 22, height: 22, borderRadius: 6,
                              border: '1px solid var(--border)',
                              background: 'transparent',
                              cursor: 'pointer',
                              color: 'var(--muted)',
                              fontSize: 11, fontWeight: 700,
                              lineHeight: 1,
                              transition: 'all 0.15s',
                            }}
                            onMouseEnter={e => { e.currentTarget.style.borderColor = '#ef4444'; e.currentTarget.style.color = '#ef4444' }}
                            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--muted)' }}
                          >
                            ×
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Add habit button */}
        <div style={{ marginTop: 14 }}>
          <button
            onClick={() => { setShowAddModal(true); setNewHabitName(''); setNameError('') }}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'transparent',
              border: '1px dashed var(--border)',
              borderRadius: 8,
              color: 'var(--muted)',
              fontSize: 12, fontWeight: 600,
              padding: '6px 14px',
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#4f8ef7'; e.currentTarget.style.color = '#4f8ef7' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--muted)' }}
          >
            + Add Habit
          </button>
        </div>
      </div>

      {/* Add Habit Modal */}
      {showAddModal && (
        <div style={overlayStyle} onClick={() => setShowAddModal(false)}>
          <div style={modalStyle} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 16 }}>New Habit</div>
            <div style={{ marginBottom: 4, fontSize: 11, color: 'var(--muted)', fontWeight: 600 }}>Habit Name</div>
            <input
              autoFocus
              type="text"
              value={newHabitName}
              onChange={e => { setNewHabitName(e.target.value); setNameError('') }}
              onKeyDown={e => { if (e.key === 'Enter') handleAddSubmit(); if (e.key === 'Escape') setShowAddModal(false) }}
              maxLength={30}
              placeholder="e.g. Read 30 mins"
              style={{
                width: '100%', boxSizing: 'border-box',
                background: 'var(--bg)',
                border: `1px solid ${nameError ? '#ef4444' : 'var(--border)'}`,
                borderRadius: 8,
                color: 'var(--text)',
                fontSize: 13,
                padding: '8px 12px',
                outline: 'none',
                marginBottom: nameError ? 4 : 20,
              }}
            />
            {nameError && (
              <div style={{ fontSize: 11, color: '#ef4444', marginBottom: 14 }}>{nameError}</div>
            )}
            <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 20 }}>
              Type: Manual &nbsp;·&nbsp; {newHabitName.trim().length}/30
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowAddModal(false)}
                style={{
                  padding: '7px 18px', borderRadius: 8,
                  border: '1px solid var(--border)',
                  background: 'transparent',
                  color: 'var(--muted)', fontSize: 13, fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleAddSubmit}
                style={{
                  padding: '7px 18px', borderRadius: 8,
                  border: 'none',
                  background: '#4f8ef7',
                  color: '#fff', fontSize: 13, fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {confirmDeleteId && (
        <div style={overlayStyle} onClick={() => setConfirmDeleteId(null)}>
          <div style={modalStyle} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 10 }}>Delete Habit?</div>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 24 }}>
              This cannot be undone. All tracking data for this habit will be lost.
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setConfirmDeleteId(null)}
                style={{
                  padding: '7px 18px', borderRadius: 8,
                  border: '1px solid var(--border)',
                  background: 'transparent',
                  color: 'var(--muted)', fontSize: 13, fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                No
              </button>
              <button
                onClick={handleDeleteConfirm}
                style={{
                  padding: '7px 18px', borderRadius: 8,
                  border: 'none',
                  background: '#ef4444',
                  color: '#fff', fontSize: 13, fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Home
