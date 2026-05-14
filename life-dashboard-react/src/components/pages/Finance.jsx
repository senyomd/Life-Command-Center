import React, { useState } from 'react'
import { useFinanceEngine } from '../../lib/hooks/useFinanceEngine'

function getTodayDate() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}
function getMonthStart(date) {
  const [y, m] = date.split('-')
  return `${y}-${m}-01`
}

const EXPENSE_CATS = ['food', 'housing', 'transport', 'utilities', 'health', 'entertainment', 'clothing', 'education', 'savings', 'other']
const INCOME_CATS  = ['salary', 'freelance', 'investment', 'gift', 'other']
const PIE_COLORS   = ['#4f8ef7','#a855f7','#22c55e','#f97316','#ef4444','#eab308','#06b6d4','#ec4899','#84cc16','#f472b6']

function fmt(n) { return `$${Math.abs(n).toFixed(2)}` }

function DonutChart({ data }) {
  if (!data || data.length === 0) {
    return <div style={{ fontSize: 12, color: 'var(--muted)', textAlign: 'center', padding: 20 }}>No expense data</div>
  }

  const total = data.reduce((s, d) => s + d.value, 0)
  if (total === 0) return <div style={{ fontSize: 12, color: 'var(--muted)', textAlign: 'center', padding: 20 }}>No expenses this month</div>

  const CX = 80, CY = 80, R_OUT = 68, R_IN = 44
  let startAngle = 0

  function polar(deg, r) {
    const rad = (deg - 90) * Math.PI / 180
    return { x: +(CX + r * Math.cos(rad)).toFixed(3), y: +(CY + r * Math.sin(rad)).toFixed(3) }
  }

  const paths = data.map((item, i) => {
    const sweep = (item.value / total) * 360
    const endAngle = startAngle + sweep
    const lg = sweep > 180 ? 1 : 0

    let d
    if (sweep >= 359.99) {
      d = `M ${CX} ${CY - R_OUT} A ${R_OUT} ${R_OUT} 0 1 1 ${CX - 0.001} ${CY - R_OUT} Z`
    } else {
      const p1o = polar(startAngle, R_OUT)
      const p2o = polar(endAngle,   R_OUT)
      const p1i = polar(startAngle, R_IN)
      const p2i = polar(endAngle,   R_IN)
      d = `M ${p1o.x} ${p1o.y} A ${R_OUT} ${R_OUT} 0 ${lg} 1 ${p2o.x} ${p2o.y} L ${p2i.x} ${p2i.y} A ${R_IN} ${R_IN} 0 ${lg} 0 ${p1i.x} ${p1i.y} Z`
    }
    startAngle = endAngle
    return <path key={item.category} d={d} fill={PIE_COLORS[i % PIE_COLORS.length]} />
  })

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
      <svg width="160" height="160" viewBox="0 0 160 160">{paths}</svg>
      <div style={{ flex: 1, minWidth: 120 }}>
        {data.map((item, i) => (
          <div key={item.category} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 8, height: 8, borderRadius: 2, background: PIE_COLORS[i % PIE_COLORS.length], flexShrink: 0 }} />
              <span style={{ fontSize: 11, textTransform: 'capitalize' }}>{item.category}</span>
            </div>
            <span style={{ fontSize: 11, color: 'var(--muted)' }}>{fmt(item.value)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

const STATUS_COLOR = { ok: '#22c55e', warning: '#f97316', over: '#ef4444' }

function Finance() {
  const { engine, refresh } = useFinanceEngine()

  const [showForm, setShowForm] = useState(false)
  const [showBudgetForm, setShowBudgetForm] = useState(false)
  const [form, setForm] = useState({ type: 'expense', amount: '', category: 'food', description: '', date: '' })
  const [budgetForm, setBudgetForm] = useState({ category: 'food', limit: '', period: 'monthly' })

  const today      = getTodayDate()
  const monthStart = getMonthStart(today)
  const totals     = engine.getTotals({ sinceDate: monthStart, untilDate: today })
  const allTxns    = engine.getTransactions({ sinceDate: monthStart, untilDate: today })
  const expenseCats = engine.getByCategory({ type: 'expense', sinceDate: monthStart, untilDate: today })
  const pieData    = Object.entries(expenseCats)
    .map(([category, value]) => ({ category, value }))
    .sort((a, b) => b.value - a.value)
  const budgets    = engine.getBudgets()

  function handleAdd(e) {
    e.preventDefault()
    if (!form.amount || Number(form.amount) <= 0) return
    engine.addTransaction(form.type, Number(form.amount), form.category, form.date || today, form.description)
    setForm({ type: 'expense', amount: '', category: 'food', description: '', date: '' })
    setShowForm(false)
    refresh()
  }

  function handleSetBudget(e) {
    e.preventDefault()
    if (!budgetForm.limit || Number(budgetForm.limit) <= 0) return
    engine.setBudget(budgetForm.category, Number(budgetForm.limit), budgetForm.period)
    setBudgetForm({ category: 'food', limit: '', period: 'monthly' })
    setShowBudgetForm(false)
    refresh()
  }

  function handleDeleteTxn(id) {
    engine.deleteTransaction(id)
    refresh()
  }

  function handleRemoveBudget(idx) {
    engine.budgets.splice(idx, 1)
    engine.saveState()
    refresh()
  }

  const inputStyle = { display: 'block', width: '100%', padding: '8px 10px', background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 13, marginTop: 4 }

  return (
    <div className="page-enter">
      <div className="page-header">
        <div className="page-eyebrow">Finance</div>
        <h1 className="page-title">Finance Tracker</h1>
        <p className="page-sub">This month's income, expenses, and budget health</p>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
        {[
          { label: 'Income', value: fmt(totals.income),   color: '#22c55e' },
          { label: 'Expenses', value: fmt(totals.expenses), color: '#ef4444' },
          { label: 'Net',   value: `${totals.net >= 0 ? '+' : ''}${fmt(totals.net)}`, color: totals.net >= 0 ? '#22c55e' : '#ef4444' },
          { label: 'Savings Rate', value: totals.savingsRate !== null ? `${totals.savingsRate.toFixed(1)}%` : '—', color: totals.savingsRate !== null && totals.savingsRate >= 0 ? '#22c55e' : 'var(--text)' },
        ].map(({ label, value, color }) => (
          <div key={label} className="card" style={{ textAlign: 'center', padding: 16 }}>
            <div className="card-label">{label}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color, letterSpacing: -1 }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Action row */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>+ Add Transaction</button>
        <button className="btn btn-secondary" onClick={() => setShowBudgetForm(!showBudgetForm)}>⚙ Set Budget</button>
      </div>

      {/* Add transaction form */}
      {showForm && (
        <div className="card" style={{ marginBottom: 20 }}>
          <form onSubmit={handleAdd}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 12 }}>
              <label style={{ fontSize: 12, color: 'var(--muted)' }}>
                Type
                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value, category: e.target.value === 'income' ? 'salary' : 'food' })} style={inputStyle}>
                  <option value="expense">Expense</option>
                  <option value="income">Income</option>
                </select>
              </label>
              <label style={{ fontSize: 12, color: 'var(--muted)' }}>
                Amount *
                <input type="number" min="0.01" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} style={inputStyle} required />
              </label>
              <label style={{ fontSize: 12, color: 'var(--muted)' }}>
                Category
                <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} style={inputStyle}>
                  {(form.type === 'income' ? INCOME_CATS : EXPENSE_CATS).map(c => (
                    <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                  ))}
                </select>
              </label>
              <label style={{ fontSize: 12, color: 'var(--muted)' }}>
                Date
                <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} style={inputStyle} />
              </label>
              <label style={{ fontSize: 12, color: 'var(--muted)', gridColumn: '1/-1' }}>
                Description
                <input type="text" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Optional note" style={inputStyle} />
              </label>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="submit" className="btn btn-primary">Add</button>
              <button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Set budget form */}
      {showBudgetForm && (
        <div className="card" style={{ marginBottom: 20 }}>
          <form onSubmit={handleSetBudget}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 12 }}>
              <label style={{ fontSize: 12, color: 'var(--muted)' }}>
                Category
                <select value={budgetForm.category} onChange={(e) => setBudgetForm({ ...budgetForm, category: e.target.value })} style={inputStyle}>
                  {EXPENSE_CATS.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                </select>
              </label>
              <label style={{ fontSize: 12, color: 'var(--muted)' }}>
                Limit ($)
                <input type="number" min="0.01" step="0.01" value={budgetForm.limit} onChange={(e) => setBudgetForm({ ...budgetForm, limit: e.target.value })} style={inputStyle} required />
              </label>
              <label style={{ fontSize: 12, color: 'var(--muted)' }}>
                Period
                <select value={budgetForm.period} onChange={(e) => setBudgetForm({ ...budgetForm, period: e.target.value })} style={inputStyle}>
                  <option value="monthly">Monthly</option>
                  <option value="weekly">Weekly</option>
                </select>
              </label>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="submit" className="btn btn-primary">Set Budget</button>
              <button type="button" className="btn btn-ghost" onClick={() => setShowBudgetForm(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Transactions */}
        <div className="card">
          <div className="card-label">Transactions This Month</div>
          {allTxns.length === 0 ? (
            <p className="placeholder-text">No transactions yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0, maxHeight: 360, overflowY: 'auto' }}>
              {allTxns.map((t, i) => (
                <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: i < allTxns.length - 1 ? '1px solid var(--border)' : 'none' }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'capitalize' }}>{t.category}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>{t.description || t.date}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: t.type === 'income' ? '#22c55e' : '#ef4444' }}>
                      {t.type === 'income' ? '+' : '-'}{fmt(t.amount)}
                    </span>
                    <button onClick={() => handleDeleteTxn(t.id)} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 12, padding: '2px 4px' }}>✕</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Category breakdown */}
          <div className="card">
            <div className="card-label">Expense Breakdown</div>
            <DonutChart data={pieData} />
          </div>

          {/* Budgets */}
          <div className="card">
            <div className="card-label">Budgets</div>
            {budgets.length === 0 ? (
              <p className="placeholder-text">No budgets set.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {budgets.map((b, i) => {
                  const status = engine.getBudgetStatus(b.category)
                  const pct = status ? Math.min(status.percentUsed, 100) : 0
                  const color = status ? STATUS_COLOR[status.status] : '#4f8ef7'
                  return (
                    <div key={b.id}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, textTransform: 'capitalize' }}>{b.category}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 11, color: 'var(--muted)' }}>
                            {status ? fmt(status.spent) : '$0'} / {fmt(b.limit)}
                          </span>
                          <button onClick={() => handleRemoveBudget(i)} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 11, padding: '0 2px' }}>✕</button>
                        </div>
                      </div>
                      <div style={{ height: 6, background: 'var(--s3)', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 3, transition: 'width 0.4s ease' }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Finance
