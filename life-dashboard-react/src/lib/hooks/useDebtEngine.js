import { useState, useCallback } from 'react'
import DebtEngine from '../engines/DebtEngine'

export function useDebtEngine() {
  const [engine] = useState(() => new DebtEngine())
  const [rev, setRev] = useState(0)

  const refresh = useCallback(() => setRev(r => r + 1), [])

  const addDebt = useCallback((name, amount, payment, rate, due) => {
    engine.addDebt(name, amount, payment, rate, due)
    refresh()
  }, [engine, refresh])

  const updateDebt = useCallback((id, updates) => {
    engine.updateDebt(id, updates)
    refresh()
  }, [engine, refresh])

  const removeDebt = useCallback((id) => {
    engine.removeDebt(id)
    refresh()
  }, [engine, refresh])

  return {
    engine,
    debts: engine.getDebts(),
    addDebt,
    updateDebt,
    removeDebt,
    getTotalDebt: () => engine.getTotalDebt(),
    getTotalMonthlyPayments: () => engine.getTotalMonthlyPayments(),
    getDebtToIncomeRatio: (income) => engine.getDebtToIncomeRatio(income),
    getDebtPayoffTimeline: (id) => engine.getDebtPayoffTimeline(id),
  }
}
