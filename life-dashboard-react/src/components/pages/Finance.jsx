import React, { useState } from 'react'
import { useFinanceEngine } from '../../lib/hooks/useFinanceEngine'
import './Finance.css'

export default function Finance() {
  const { income, expenses, addIncome, addExpense, removeIncome, removeExpense, getTotalIncome, getTotalExpenses, getNetWorth } = useFinanceEngine()

  const [showIncomeInput, setShowIncomeInput]   = useState(false)
  const [showExpenseInput, setShowExpenseInput] = useState(false)
  const [incomeName, setIncomeName]   = useState('')
  const [incomeAmount, setIncomeAmount] = useState('')
  const [expenseName, setExpenseName]   = useState('')
  const [expenseAmount, setExpenseAmount] = useState('')

  function handleAddIncome() {
    if (!incomeName.trim() || !incomeAmount) return
    addIncome(incomeName.trim(), parseFloat(incomeAmount))
    setIncomeName('')
    setIncomeAmount('')
    setShowIncomeInput(false)
  }

  function handleAddExpense() {
    if (!expenseName.trim() || !expenseAmount) return
    addExpense(expenseName.trim(), parseFloat(expenseAmount))
    setExpenseName('')
    setExpenseAmount('')
    setShowExpenseInput(false)
  }

  const netWorth = getNetWorth()

  return (
    <div className="finance-page">
      {/* NET WORTH HEADER */}
      <div className="net-worth-header">
        <div className="net-worth-label">NET WORTH</div>
        <div className={`net-worth-amount ${netWorth >= 0 ? 'positive' : 'negative'}`}>
          {netWorth < 0 ? '-' : ''}${Math.abs(netWorth).toFixed(2)}
        </div>
      </div>

      {/* SPLIT VIEW */}
      <div className="split-view">

        {/* INCOME COLUMN */}
        <div className="column">
          <div className="column-header">
            <h2>Income</h2>
            <button className="add-btn" onClick={() => setShowIncomeInput(v => !v)}>+</button>
          </div>

          {showIncomeInput && (
            <div className="inline-input">
              <input
                autoFocus
                type="text"
                placeholder="Name"
                value={incomeName}
                onChange={e => setIncomeName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddIncome()}
              />
              <input
                type="number"
                placeholder="Amount"
                min="0.01"
                step="0.01"
                value={incomeAmount}
                onChange={e => setIncomeAmount(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddIncome()}
              />
              <button onClick={handleAddIncome}>Save</button>
            </div>
          )}

          <div className="items-list">
            {income.length === 0 && (
              <div className="empty-hint">No income added yet.</div>
            )}
            {income.map(item => (
              <div key={item.id} className="item">
                <span className="item-name">{item.name}</span>
                <span className="item-amount income-amount">${item.amount.toFixed(2)}</span>
                <button className="delete-btn" onClick={() => removeIncome(item.id)}>✕</button>
              </div>
            ))}
          </div>

          <div className="column-total">
            Total: <span className="income-total">${getTotalIncome().toFixed(2)}</span>
          </div>
        </div>

        {/* EXPENSES COLUMN */}
        <div className="column">
          <div className="column-header">
            <h2>Expenses</h2>
            <button className="add-btn" onClick={() => setShowExpenseInput(v => !v)}>+</button>
          </div>

          {showExpenseInput && (
            <div className="inline-input">
              <input
                autoFocus
                type="text"
                placeholder="Name"
                value={expenseName}
                onChange={e => setExpenseName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddExpense()}
              />
              <input
                type="number"
                placeholder="Amount"
                min="0.01"
                step="0.01"
                value={expenseAmount}
                onChange={e => setExpenseAmount(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddExpense()}
              />
              <button onClick={handleAddExpense}>Save</button>
            </div>
          )}

          <div className="items-list">
            {expenses.length === 0 && (
              <div className="empty-hint">No expenses added yet.</div>
            )}
            {expenses.map(item => (
              <div key={item.id} className="item">
                <span className="item-name">{item.name}</span>
                <span className="item-amount expense-amount">${item.amount.toFixed(2)}</span>
                <button className="delete-btn" onClick={() => removeExpense(item.id)}>✕</button>
              </div>
            ))}
          </div>

          <div className="column-total">
            Total: <span className="expense-total">${getTotalExpenses().toFixed(2)}</span>
          </div>
        </div>

      </div>
    </div>
  )
}
