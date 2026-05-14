import { useRef, useState, useCallback } from 'react'
import FinanceEngine from '../engines/FinanceEngine'

/**
 * Manages a FinanceEngine instance.
 * Exposes the engine directly plus a `refresh` trigger for re-renders.
 */
export function useFinanceEngine() {
  const engineRef = useRef(null)

  if (!engineRef.current) {
    engineRef.current = new FinanceEngine()
  }

  const [rev, setRev] = useState(0)

  const refresh = useCallback(() => setRev((r) => r + 1), [])

  return { engine: engineRef.current, refresh, rev }
}
