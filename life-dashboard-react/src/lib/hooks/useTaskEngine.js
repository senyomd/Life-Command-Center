import { useRef, useState, useCallback } from 'react'
import TaskEngine from '../engines/TaskEngine'

/**
 * Manages a TaskEngine instance.
 * Exposes the engine directly plus a `refresh` trigger for re-renders.
 *
 * Pattern: call engine methods directly, then call refresh() to sync UI.
 */
export function useTaskEngine() {
  const engineRef = useRef(null)

  if (!engineRef.current) {
    engineRef.current = new TaskEngine()
  }

  const [rev, setRev] = useState(0)

  const refresh = useCallback(() => setRev((r) => r + 1), [])

  return { engine: engineRef.current, refresh, rev }
}
