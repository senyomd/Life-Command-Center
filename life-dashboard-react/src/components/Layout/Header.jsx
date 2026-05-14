import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import useAppStore from '../../store/appStore'

function Header() {
  const [time, setTime] = useState('')
  const [date, setDate] = useState('')
  const navigate = useNavigate()
  const currentMode = useAppStore((s) => s.currentMode)

  useEffect(() => {
    function tick() {
      const now = new Date()
      setTime(now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }))
      setDate(now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }))
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <header className="header">
      <div className="header-left">
        <div className="logo-mark" onClick={() => navigate('/')} title="Home">⚡</div>
        <div>
          <div className="logo-title">Life Command Center</div>
          <div className="logo-sub">Personal OS</div>
        </div>
      </div>

      <div className="mode-badge">
        <span className="badge-dot"></span>
        <span>{currentMode.charAt(0).toUpperCase() + currentMode.slice(1)}</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div className="streak-chip">
          <span className="streak-fire">🔥</span>
          <span className="streak-count">0</span>
          <span className="streak-label">day streak</span>
        </div>
        <div>
          <div className="clock-time">{time}</div>
          <div className="clock-date">{date}</div>
        </div>
      </div>
    </header>
  )
}

export default Header
