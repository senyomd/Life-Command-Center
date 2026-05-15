import { useRef, useState, useCallback } from 'react'
import EntertainmentEngine from '../engines/EntertainmentEngine'

/**
 * Manages an EntertainmentEngine instance.
 * Returns { engine, refresh, rev }
 */
export function useEntertainmentEngine() {
  const engineRef = useRef(null)

  if (!engineRef.current) {
    engineRef.current = new EntertainmentEngine()
  }

  const [rev, setRev] = useState(0)
  const refresh = useCallback(() => setRev((r) => r + 1), [])

  return { engine: engineRef.current, refresh, rev }
}
