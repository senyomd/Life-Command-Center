import { useRef, useMemo } from 'react'
import AnalyticsEngine from '../engines/AnalyticsEngine'

/**
 * Manages an AnalyticsEngine instance.
 * Analytics is read-only (no mutations), so no refresh needed.
 * Returns { engine, dashboard, comparison, trends }
 */
export function useAnalyticsEngine() {
  const engineRef = useRef(null)

  if (!engineRef.current) {
    engineRef.current = new AnalyticsEngine()
  }

  const engine = engineRef.current

  const dashboard  = useMemo(() => engine.getThisWeekDashboard(),  [engine])
  const comparison = useMemo(() => engine.getStatsComparison(),    [engine])
  const trends     = useMemo(() => engine.getMonthlyTrends(),      [engine])

  return { engine, dashboard, comparison, trends }
}
