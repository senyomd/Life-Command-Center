import React, { useState, useRef } from 'react'
import { useEntertainmentEngine } from '../../lib/hooks/useEntertainmentEngine'
import EntertainmentEngine from '../../lib/engines/EntertainmentEngine'
import './Entertainment.css'

// ── Constants ──────────────────────────────────────────────────────────────

const TYPE_EMOJI = {
  show:    '📺',
  movie:   '🎬',
  anime:   '⚡',
  book:    '📖',
  youtube: '▶',
  other:   '🎭',
}

const STATUS_META = {
  watching:  { label: 'Watching',  color: '#22c55e', bg: 'rgba(34,197,94,.12)'  },
  completed: { label: 'Completed', color: '#4f8ef7', bg: 'rgba(79,142,247,.12)' },
  dropped:   { label: 'Dropped',   color: '#6b7280', bg: 'rgba(107,114,128,.12)'},
  paused:    { label: 'Paused',    color: '#f97316', bg: 'rgba(249,115,22,.12)' },
  planned:   { label: 'Planned',   color: '#a855f7', bg: 'rgba(168,85,247,.12)' },
}

const FILTER_TABS = [
  { key: 'all',       label: 'All'       },
  { key: 'watching',  label: 'Watching'  },
  { key: 'completed', label: 'Completed' },
  { key: 'dropped',   label: 'Dropped'   },
  { key: 'paused',    label: 'Paused'    },
  { key: 'planned',   label: 'Planned'   },
]

// ── Sub-components ─────────────────────────────────────────────────────────

function ProgressBar({ item, mini = false }) {
  const pct = EntertainmentEngine.getPercent(item)
  const isActive = item.status === 'watching' || item.status === 'paused'

  if (item.total == null && !mini) {
    // Unknown total — show indeterminate dot trail
    return (
      <div className="ent-progress-wrap">
        <div className="ent-progress-unknown">
          <span className="ent-ep-label">Ep {item.progress}</span>
          <span className="ent-ep-unknown">∞</span>
        </div>
      </div>
    )
  }

  if (item.total == null) return null

  return (
    <div className={`ent-progress-wrap${mini ? ' mini' : ''}`}>
      <div className="ent-progress-track">
        <div
          className={`ent-progress-fill${item.status === 'completed' ? ' done' : isActive ? ' active' : ' faded'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {!mini && (
        <div className="ent-progress-labels">
          <span className="ent-ep-label">Ep {item.progress} / {item.total}</span>
          <span className="ent-pct-label">{pct}%</span>
        </div>
      )}
    </div>
  )
}

function StatusPill({ status }) {
  const meta = STATUS_META[status] || STATUS_META.watching
  return (
    <span
      className="ent-status-pill"
      style={{ color: meta.color, background: meta.bg }}
    >
      {meta.label}
    </span>
  )
}

function ItemCard({ item, onIncrement, onStatus, onDelete, isNew = false }) {
  const [bumped, setBumped] = useState(false)
  const [expanded, setExpanded] = useState(false)

  function handleIncrement() {
    setBumped(true)
    onIncrement(item.id)
    setTimeout(() => setBumped(false), 600)
  }

  const isActive   = item.status === 'watching' || item.status === 'paused'
  const isDone     = item.status === 'completed'
  const isDropped  = item.status === 'dropped'

  return (
    <div className={`ent-card${isDone ? ' done' : ''}${isDropped ? ' dropped' : ''}${isNew ? ' new' : ''}`}>
      <div className="ent-card-top">
        {/* Type icon + title */}
        <div className="ent-card-identity">
          <span className="ent-type-icon">{TYPE_EMOJI[item.type] || '🎭'}</span>
          <div>
            <div className="ent-title">{item.title}</div>
            <div className="ent-meta-row">
              <StatusPill status={item.status} />
              <span className="ent-type-label">{item.type}</span>
            </div>
          </div>
        </div>

        {/* Quick actions */}
        <div className="ent-actions">
          {isActive && (
            <button
              className={`ent-btn-episode${bumped ? ' bumped' : ''}`}
              onClick={handleIncrement}
              title="+1 Episode"
            >
              +1
            </button>
          )}
          {isActive && (
            <button
              className="ent-btn-icon"
              onClick={() => onStatus(item.id, 'completed')}
              title="Mark Complete"
            >
              ✓
            </button>
          )}
          {(isActive || item.status === 'planned') && (
            <button
              className="ent-btn-icon drop"
              onClick={() => onStatus(item.id, 'dropped')}
              title="Drop"
            >
              ✕
            </button>
          )}
          {(isDone || isDropped) && (
            <button
              className="ent-btn-icon rewatch"
              onClick={() => onStatus(item.id, 'watching')}
              title="Rewatch / Resume"
            >
              ↩
            </button>
          )}
          <button
            className="ent-btn-icon more"
            onClick={() => setExpanded((v) => !v)}
            title="More options"
          >
            ···
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <ProgressBar item={item} />

      {/* Expanded options */}
      {expanded && (
        <div className="ent-expanded">
          <div className="ent-expanded-row">
            {item.status !== 'paused' && isActive && (
              <button className="ent-btn-text" onClick={() => { onStatus(item.id, 'paused'); setExpanded(false) }}>
                ⏸ Pause
              </button>
            )}
            {item.status === 'paused' && (
              <button className="ent-btn-text" onClick={() => { onStatus(item.id, 'watching'); setExpanded(false) }}>
                ▶ Resume
              </button>
            )}
            {item.status === 'planned' && (
              <button className="ent-btn-text" onClick={() => { onStatus(item.id, 'watching'); setExpanded(false) }}>
                ▶ Start Watching
              </button>
            )}
            <button
              className="ent-btn-text danger"
              onClick={() => { onDelete(item.id); setExpanded(false) }}
            >
              🗑 Delete
            </button>
          </div>
          <div className="ent-updated">Last updated {item.lastUpdated}</div>
        </div>
      )}
    </div>
  )
}

function ContinueWatching({ items, onIncrement, onStatus, onDelete }) {
  if (items.length === 0) return null

  return (
    <section className="ent-section continue-watching">
      <div className="ent-section-header">
        <span className="ent-section-label">Continue Watching</span>
        <span className="ent-section-dot active" />
      </div>
      <div className="ent-continue-grid">
        {items.map((item) => (
          <div key={item.id} className="ent-continue-card">
            <div className="ent-continue-top">
              <span className="ent-type-icon sm">{TYPE_EMOJI[item.type] || '🎭'}</span>
              <div className="ent-continue-info">
                <div className="ent-continue-title">{item.title}</div>
                <div className="ent-continue-sub">
                  {item.total
                    ? `Ep ${item.progress} / ${item.total} · ${EntertainmentEngine.getPercent(item)}%`
                    : `Ep ${item.progress}`
                  }
                </div>
              </div>
              <button
                className="ent-btn-episode sm"
                onClick={() => onIncrement(item.id)}
                title="+1 Episode"
              >
                +1
              </button>
            </div>
            <ProgressBar item={item} mini />
          </div>
        ))}
      </div>
    </section>
  )
}

function AddForm({ onAdd, onCancel }) {
  const [form, setForm] = useState({
    title: '', type: 'show', total: '', progress: '',
  })
  const titleRef = useRef(null)

  React.useEffect(() => {
    titleRef.current?.focus()
  }, [])

  function handleSubmit(e) {
    e.preventDefault()
    if (!form.title.trim()) return
    onAdd({
      title:    form.title.trim(),
      type:     form.type,
      total:    form.total ? Number(form.total) : null,
      progress: form.progress ? Number(form.progress) : 0,
    })
  }

  const inp = {
    background: 'var(--s2)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    color: 'var(--text)',
    fontSize: 13,
    padding: '8px 10px',
    width: '100%',
    display: 'block',
    marginTop: 4,
  }

  return (
    <div className="ent-add-form card">
      <form onSubmit={handleSubmit}>
        <div className="ent-form-grid">
          <label className="ent-form-label" style={{ gridColumn: '1/-1' }}>
            Title *
            <input
              ref={titleRef}
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Breaking Bad, Dune, etc."
              style={inp}
              required
            />
          </label>
          <label className="ent-form-label">
            Type
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} style={inp}>
              <option value="show">📺 Show</option>
              <option value="movie">🎬 Movie</option>
              <option value="anime">⚡ Anime</option>
              <option value="book">📖 Book</option>
              <option value="youtube">▶ YouTube</option>
              <option value="other">🎭 Other</option>
            </select>
          </label>
          <label className="ent-form-label">
            Total Episodes / Pages
            <input
              type="number"
              min="1"
              value={form.total}
              onChange={(e) => setForm({ ...form, total: e.target.value })}
              placeholder="Leave blank if unknown"
              style={inp}
            />
          </label>
          <label className="ent-form-label">
            Current Progress
            <input
              type="number"
              min="0"
              value={form.progress}
              onChange={(e) => setForm({ ...form, progress: e.target.value })}
              placeholder="0"
              style={inp}
            />
          </label>
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          <button type="submit" className="btn btn-primary">Add to Board</button>
          <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancel</button>
        </div>
      </form>
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────

function Entertainment() {
  const { engine, refresh } = useEntertainmentEngine()
  const [filter, setFilter]   = useState('all')
  const [query,  setQuery]    = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [newId,   setNewId]   = useState(null)

  const counts = engine.getCounts()

  const continueWatching = engine.getContinueWatching(3)

  const displayItems = query.trim()
    ? engine.search(query)
    : filter === 'all'
      ? engine.getAll()
      : engine.getByStatus(filter)

  function handleAdd(opts) {
    const id = engine.addItem(opts)
    setNewId(id)
    setShowAdd(false)
    setFilter('watching')
    refresh()
    setTimeout(() => setNewId(null), 1200)
  }

  function handleIncrement(id) {
    engine.incrementProgress(id)
    refresh()
  }

  function handleStatus(id, status) {
    engine.setStatus(id, status)
    refresh()
  }

  function handleDelete(id) {
    engine.deleteItem(id)
    refresh()
  }

  return (
    <div className="page-enter ent-page">
      {/* Page header */}
      <div className="ent-header-row">
        <div className="page-header" style={{ marginBottom: 0 }}>
          <div className="page-eyebrow">Entertainment</div>
          <h1 className="page-title">Now Watching</h1>
          <p className="page-sub">
            {counts.watching > 0
              ? `${counts.watching} active · ${counts.completed} completed · ${counts.total} total`
              : 'Your personal watchboard'}
          </p>
        </div>
        <button
          className="btn btn-primary ent-add-btn"
          onClick={() => setShowAdd((v) => !v)}
        >
          {showAdd ? '✕ Cancel' : '+ Add'}
        </button>
      </div>

      {/* Add form */}
      {showAdd && (
        <div style={{ marginBottom: 24 }}>
          <AddForm onAdd={handleAdd} onCancel={() => setShowAdd(false)} />
        </div>
      )}

      {/* Continue Watching strip */}
      {!query && (filter === 'all' || filter === 'watching') && (
        <ContinueWatching
          items={continueWatching}
          onIncrement={handleIncrement}
          onStatus={handleStatus}
          onDelete={handleDelete}
        />
      )}

      {/* Filter tabs + search */}
      <div className="ent-controls">
        <div className="ent-tabs">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.key}
              className={`ent-tab${filter === tab.key ? ' active' : ''}`}
              onClick={() => { setFilter(tab.key); setQuery('') }}
            >
              {tab.label}
              {tab.key !== 'all' && counts[tab.key] > 0 && (
                <span className="ent-tab-count">{counts[tab.key]}</span>
              )}
              {tab.key === 'all' && counts.total > 0 && (
                <span className="ent-tab-count">{counts.total}</span>
              )}
            </button>
          ))}
        </div>
        <div className="ent-search-wrap">
          <input
            className="ent-search"
            type="text"
            placeholder="Search..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <button className="ent-search-clear" onClick={() => setQuery('')}>✕</button>
          )}
        </div>
      </div>

      {/* Item grid */}
      {displayItems.length === 0 ? (
        <div className="ent-empty">
          {query
            ? `No results for "${query}"`
            : filter === 'all'
              ? 'Nothing added yet. Hit + Add to start your watchboard.'
              : `Nothing ${filter} right now.`
          }
        </div>
      ) : (
        <div className="ent-grid">
          {displayItems.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              onIncrement={handleIncrement}
              onStatus={handleStatus}
              onDelete={handleDelete}
              isNew={item.id === newId}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default Entertainment
