import React from 'react'
import { useAnalyticsEngine } from '../../lib/hooks/useAnalyticsEngine'

function StatRow({ label, thisWeek, lastWeek, delta, unit = '', higherIsBetter = true }) {
  const improved = higherIsBetter ? delta >= 0 : delta <= 0
  const deltaColor = delta === 0 ? 'var(--muted)' : improved ? '#22c55e' : '#ef4444'
  const deltaSign = delta > 0 ? '+' : ''

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
      <div style={{ flex: 1, fontSize: 12, color: 'var(--muted)' }}>{label}</div>
      <div style={{ minWidth: 70, textAlign: 'right', fontSize: 13, fontWeight: 700 }}>
        {typeof thisWeek === 'number' ? thisWeek.toFixed(1) : thisWeek}{unit}
      </div>
      <div style={{ minWidth: 70, textAlign: 'right', fontSize: 13, color: 'var(--muted)' }}>
        {typeof lastWeek === 'number' ? lastWeek.toFixed(1) : lastWeek}{unit}
      </div>
      <div style={{ minWidth: 50, textAlign: 'right', fontSize: 12, fontWeight: 700, color: deltaColor }}>
        {delta !== 0 ? `${deltaSign}${typeof delta === 'number' ? delta.toFixed(1) : delta}${unit}` : '—'}
      </div>
    </div>
  )
}

function Stats() {
  const { dashboard, comparison, trends } = useAnalyticsEngine()

  const thisWeek = comparison?.thisWeek  ?? {}
  const lastWeek = comparison?.lastWeek  ?? {}
  const deltas   = comparison?.deltas    ?? {}

  const focusHrsDisplay = ((dashboard?.totalFocusTime ?? 0)).toFixed(1) + 'h'

  return (
    <div className="page-enter">
      <div className="page-header">
        <div className="page-eyebrow">Analytics</div>
        <h1 className="page-title">Stats</h1>
        <p className="page-sub">This week vs last week, trends and breakdowns</p>
      </div>

      {/* This week summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 14, marginBottom: 24 }}>
        {[
          { label: 'Focus Score',       value: `${(dashboard?.focusScore ?? 0).toFixed(0)}%` },
          { label: 'Task Execution',    value: `${(dashboard?.taskExecution ?? 0).toFixed(0)}%` },
          { label: 'Habit Consistency', value: `${(dashboard?.habitConsistency ?? 0).toFixed(0)}%` },
          { label: 'Focus Time',        value: focusHrsDisplay },
          { label: 'Deep Work Ratio',   value: `${((dashboard?.deepWorkRatio ?? 0) * 100).toFixed(0)}%` },
          { label: 'Cognitive Quality', value: (dashboard?.cognitiveQuality ?? 0).toFixed(1) },
        ].map(({ label, value }) => (
          <div key={label} className="card" style={{ textAlign: 'center', padding: 14 }}>
            <div className="card-label">{label}</div>
            <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: -0.8 }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Week comparison */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-label-row">
          <span className="card-label">Week Comparison</span>
          <div style={{ display: 'flex', gap: 16, fontSize: 11, color: 'var(--muted)' }}>
            <span style={{ fontWeight: 700, color: 'var(--text)' }}>This Week</span>
            <span>Last Week</span>
            <span>Delta</span>
          </div>
        </div>

        <StatRow
          label="Focus Score"
          thisWeek={thisWeek.focusScore ?? 0}
          lastWeek={lastWeek.focusScore ?? 0}
          delta={deltas.focusScore ?? 0}
          unit="%"
        />
        <StatRow
          label="Task Execution"
          thisWeek={thisWeek.taskExecution ?? 0}
          lastWeek={lastWeek.taskExecution ?? 0}
          delta={deltas.taskExecution ?? 0}
          unit="%"
        />
        <StatRow
          label="Habit Consistency"
          thisWeek={thisWeek.habitConsistency ?? 0}
          lastWeek={lastWeek.habitConsistency ?? 0}
          delta={deltas.habitConsistency ?? 0}
          unit="%"
        />
        <StatRow
          label="Focus Time (h)"
          thisWeek={thisWeek.totalFocusTime ?? 0}
          lastWeek={lastWeek.totalFocusTime ?? 0}
          delta={deltas.totalFocusTime ?? 0}
          unit="h"
        />
        <div style={{ borderBottom: 'none' }}>
          <StatRow
            label="Sessions"
            thisWeek={thisWeek.sessionCount ?? 0}
            lastWeek={lastWeek.sessionCount ?? 0}
            delta={deltas.sessionCount ?? 0}
          />
        </div>
      </div>

      {/* Monthly trends */}
      {trends && trends.length > 0 && (
        <div className="card">
          <div className="card-label">Monthly Trends</div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr>
                  {['Month', 'Focus Score', 'Task Exec', 'Habits', 'Focus Time'].map((h) => (
                    <th key={h} style={{ textAlign: h === 'Month' ? 'left' : 'right', color: 'var(--muted)', fontWeight: 600, padding: '4px 8px 10px', borderBottom: '1px solid var(--border)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {trends.map((row, i) => (
                  <tr key={i}>
                    <td style={{ padding: '8px 8px', color: 'var(--muted)' }}>{row.label}</td>
                    <td style={{ padding: '8px 8px', textAlign: 'right', fontWeight: 600 }}>{(row.focusScore ?? 0).toFixed(0)}%</td>
                    <td style={{ padding: '8px 8px', textAlign: 'right', fontWeight: 600 }}>{(row.taskExecution ?? 0).toFixed(0)}%</td>
                    <td style={{ padding: '8px 8px', textAlign: 'right', fontWeight: 600 }}>{(row.habitConsistency ?? 0).toFixed(0)}%</td>
                    <td style={{ padding: '8px 8px', textAlign: 'right', fontWeight: 600 }}>{(row.totalFocusTime ?? 0).toFixed(1)}h</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

export default Stats
