import { useRef, useState, useCallback } from 'react'
import HabitEngine from '../engines/HabitEngine'

/**
 * Manages a HabitEngine instance.
 * Returns { engine, habits, weekDates, toggle, refresh }
 */
export function useHabitEngine() {
  const engineRef = useRef(null)

  if (!engineRef.current) {
    const e = new HabitEngine()
    e.checkAutoHabits()
    engineRef.current = e
  }

  const [rev, setRev] = useState(0)

  const refresh = useCallback(() => setRev((r) => r + 1), [])

  const toggle = useCallback((habitId, date) => {
    engineRef.current.toggleHabit(habitId, date)
    refresh()
  }, [refresh])

  const engine    = engineRef.current
  const today     = engine.getToday()
  const weekStart = engine.getWeekStart(today)
  const weekDates = engine.getWeekDates(weekStart)

  return { engine, habits: engine.habits, weekDates, today, toggle, refresh }
}
