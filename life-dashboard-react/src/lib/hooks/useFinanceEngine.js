import { useState, useCallback } from 'react'
import FinanceEngine from '../engines/FinanceEngine'

export function useFinanceEngine() {
  const [engine] = useState(() => new FinanceEngine())
  const [rev, setRev] = useState(0)

  const refresh = useCallback(() => setRev(r => r + 1), [])

  const addIncome = useCallback((name, amount) => {
    engine.addIncome(name, amount)
    refresh()
  }, [engine, refresh])

  const addExpense = useCallback((name, amount) => {
    engine.addExpense(name, amount)
    refresh()
  }, [engine, refresh])

  const removeIncome = useCallback((id) => {
    engine.removeIncome(id)
    refresh()
  }, [engine, refresh])

  const removeExpense = useCallback((id) => {
    engine.removeExpense(id)
    refresh()
  }, [engine, refresh])

  return {
    income:   engine.getIncome(),
    expenses: engine.getExpenses(),
    addIncome,
    addExpense,
    removeIncome,
    removeExpense,
    getTotalIncome:   () => engine.getTotalIncome(),
    getTotalExpenses: () => engine.getTotalExpenses(),
    getNetWorth:      () => engine.getNetWorth(),
  }
}
