import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import useAppStore from '../../store/appStore'

const NAV_ITEMS = [
  { path: '/',             mode: 'home',          label: '🏠 Home' },
  { path: '/work',         mode: 'work',          label: '💼 Work' },
  { path: '/learning',     mode: 'learning',      label: '🧠 Personal Learning' },
  { path: '/class',        mode: 'class',         label: '📚 Class' },
  { path: '/entertainment',mode: 'entertainment', label: '🎬 Entertainment' },
  { path: '/finance',      mode: 'finance',       label: '💸 Finance' },
  { path: '/tasks',        mode: 'tasks',         label: '✅ Tasks' },
  { path: '/stats',        mode: 'stats',         label: '📊 Stats' },
]

function Nav() {
  const navigate  = useNavigate()
  const location  = useLocation()
  const setMode   = useAppStore((s) => s.setCurrentMode)

  function handleNav(item) {
    setMode(item.mode)
    navigate(item.path)
  }

  return (
    <nav className="nav-tabs">
      {NAV_ITEMS.map((item) => (
        <button
          key={item.path}
          className={`nav-btn${location.pathname === item.path ? ' active' : ''}`}
          data-mode={item.mode}
          onClick={() => handleNav(item)}
        >
          {item.label}
        </button>
      ))}
    </nav>
  )
}

export default Nav
