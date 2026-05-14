import React from 'react'

function Pomodoro({ mode }) {
  return (
    <div>
      <div className="page-header">
        <div className="page-eyebrow">{mode.charAt(0).toUpperCase() + mode.slice(1)} Mode</div>
        <h1 className="page-title">{mode.charAt(0).toUpperCase() + mode.slice(1)}</h1>
      </div>
      <p className="placeholder-text">Pomodoro ({mode}) — coming in Phase B.</p>
    </div>
  )
}

export default Pomodoro
