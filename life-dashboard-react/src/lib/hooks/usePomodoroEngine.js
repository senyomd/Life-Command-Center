import { useEffect, useRef, useState } from 'react'
import PomodoroEngine from '../engines/PomodoroEngine'

/**
 * Manages a PomodoroEngine instance for a given mode.
 * The engine is created once and never recreated (stable reference).
 *
 * Returns: { engine, tick, sessions }
 *   engine   — the raw PomodoroEngine instance
 *   tick     — integer that increments every second while running (triggers re-renders)
 *   sessions — last 5 sessions from engine.getSessions(5)
 */
export function usePomodoroEngine(mode) {
  const engineRef  = useRef(null)
  const [tick,     setTick]     = useState(0)
  const [sessions, setSessions] = useState([])

  if (!engineRef.current) {
    engineRef.current = new PomodoroEngine(mode)
  }

  useEffect(() => {
    const engine = engineRef.current

    engine.onTick = () => setTick((t) => t + 1)

    engine.onStart = () => setTick((t) => t + 1)
    engine.onPause = () => setTick((t) => t + 1)
    engine.onResume = () => setTick((t) => t + 1)

    engine.onStop = () => {
      setTick((t) => t + 1)
      setSessions(engine.getSessions(5))
    }

    engine.onComplete = () => {
      setTick((t) => t + 1)
      setSessions(engine.getSessions(5))
    }

    setSessions(engine.getSessions(5))
  }, [])

  return { engine: engineRef.current, tick, sessions }
}
