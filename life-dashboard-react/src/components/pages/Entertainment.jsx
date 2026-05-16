import React, { useState, useEffect, useRef } from 'react'
import { useEntertainmentEngine } from '../../lib/hooks/useEntertainmentEngine'
import EntertainmentEngine from '../../lib/engines/EntertainmentEngine'
import './Entertainment.css'

// ── Constants ──────────────────────────────────────────────────────────────

const TYPE_EMOJI = {
  show: '📺', movie: '🎬', anime: '⚡', book: '📖', youtube: '▶', other: '🎭',
}

const TYPE_GRADIENT = {
  show:    'linear-gradient(155deg, #0f1f3d 0%, #1e3460 60%, #0d1829 100%)',
  movie:   'linear-gradient(155deg, #2a0e0e 0%, #4d1818 60%, #1a0808 100%)',
  anime:   'linear-gradient(155deg, #18093a 0%, #321666 60%, #0f0820 100%)',
  book:    'linear-gradient(155deg, #0a2218 0%, #1a4530 60%, #071510 100%)',
  youtube: 'linear-gradient(155deg, #2a0a0a 0%, #4d1010 60%, #1a0404 100%)',
  other:   'linear-gradient(155deg, #181820 0%, #2c2c42 60%, #101018 100%)',
}

const STATUS_LABELS = {
  watching: 'Watching', completed: 'Completed', dropped: 'Dropped',
  paused: 'Paused', planned: 'Planned',
}

const MOOD_OPTS  = ['escape', 'learning', 'social', 'comfort']
const GENRE_OPTS = ['Comedy', 'Drama', 'Thriller', 'Documentary', 'Horror', 'Romance', 'Sci-Fi', 'Action', 'Fantasy', 'Mystery']

// ── Helpers ────────────────────────────────────────────────────────────────

function fmtDate(str) {
  if (!str) return '—'
  return new Date(str + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function epLabel(item) {
  return item.total ? `${item.progress}/${item.total}` : `EP ${item.progress}`
}

function pctOf(item) {
  if (!item.total || item.total === 0) return 0
  return Math.min(100, Math.round((item.progress / item.total) * 100))
}

// ── TypeCard (222 × 125 px) ───────────────────────────────────────────────

function TypeCard({ item, onDetails, onIncrement, isNew = false }) {
  const gradient = TYPE_GRADIENT[item.type] || TYPE_GRADIENT.other
  const isDone    = item.status === 'completed'
  const isDropped = item.status === 'dropped'
  const isActive  = item.status === 'watching' || item.status === 'paused'

  function handleIncrement(e) {
    e.stopPropagation()
    onIncrement(item.id)
  }

  return (
    <div
      className={`ent-card-wrap${isDone ? ' done' : ''}${isDropped ? ' dropped' : ''}${isNew ? ' new' : ''}`}
      onClick={() => onDetails(item)}
    >
      <div className="ent-card-inner">
        <div className="ent-card-bg" style={{ background: gradient }} />

        <div className="ent-card-badge">{epLabel(item)}</div>
        <div className="ent-card-type-icon">{TYPE_EMOJI[item.type] || '🎭'}</div>
        <div className="ent-card-title-static">{item.title}</div>

        <div className="ent-card-overlay">
          <div className="ent-card-overlay-title">{item.title}</div>
          <div className="ent-card-overlay-sub">{STATUS_LABELS[item.status]} · {epLabel(item)}</div>
          <div className="ent-card-overlay-actions">
            {isActive && (
              <button className="ent-card-btn-primary" onClick={handleIncrement}>+1</button>
            )}
            <button
              className="ent-card-btn-secondary"
              onClick={e => { e.stopPropagation(); onDetails(item) }}
            >
              Details
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Shelf ─────────────────────────────────────────────────────────────────

function Shelf({ title, items, onDetails, onIncrement, collapsible = false, newId = null }) {
  const [open, setOpen] = useState(!collapsible)

  if (!items || items.length === 0) return null

  return (
    <div className="ent-shelf">
      <div
        className={`ent-shelf-header${collapsible ? ' collapsible' : ''}`}
        onClick={collapsible ? () => setOpen(v => !v) : undefined}
      >
        <span className="ent-shelf-title">{title}</span>
        <span className="ent-shelf-count">{items.length}</span>
        {collapsible && (
          <button className="ent-shelf-toggle">{open ? '▲ Hide' : '▼ Show'}</button>
        )}
      </div>
      {open && (
        <div className="ent-shelf-track">
          {items.map(item => (
            <TypeCard
              key={item.id}
              item={item}
              onDetails={onDetails}
              onIncrement={onIncrement}
              isNew={item.id === newId}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ── HeroSection ───────────────────────────────────────────────────────────

function HeroSection({ heroItems, heroIdx, setHeroIdx, onDetails, onAdd }) {
  const item = heroItems[heroIdx] || null

  if (!item) {
    return (
      <div className="ent-hero">
        <div className="ent-hero-empty">
          <div className="ent-hero-empty-title">Your watchboard is empty</div>
          <button className="ent-nav-add" onClick={onAdd}>+ Add first show</button>
        </div>
      </div>
    )
  }

  const gradient = TYPE_GRADIENT[item.type] || TYPE_GRADIENT.other

  return (
    <div className="ent-hero">
      <div className="ent-hero-bg" style={{ background: gradient }} />
      <div className="ent-hero-content">
        <div className="ent-hero-eyebrow">Currently Watching</div>
        <div className="ent-hero-title">{item.title}</div>
        <div className="ent-hero-meta">
          {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
          {item.total
            ? ` · Episode ${item.progress} of ${item.total}`
            : item.progress > 0 ? ` · Episode ${item.progress}` : ''}
          {item.genre ? ` · ${item.genre.charAt(0).toUpperCase() + item.genre.slice(1)}` : ''}
        </div>
        {item.notes && <div className="ent-hero-desc">{item.notes}</div>}
        <div className="ent-hero-ctas">
          <button className="ent-hero-btn-play" onClick={() => onDetails(item)}>▶ DETAILS</button>
        </div>
      </div>
      {heroItems.length > 1 && (
        <div className="ent-hero-dots">
          {heroItems.map((_, i) => (
            <button
              key={i}
              className={`ent-hero-dot${i === heroIdx ? ' active' : ''}`}
              onClick={() => setHeroIdx(i)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ── StarRating ────────────────────────────────────────────────────────────

function StarRating({ value, onChange }) {
  const [hovered, setHovered] = useState(null)
  const display = hovered ?? value ?? 0

  return (
    <div className="ent-stars">
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          className={`ent-star${display >= n ? ' lit' : ''}`}
          onClick={() => onChange(n === value ? null : n)}
          onMouseEnter={() => setHovered(n)}
          onMouseLeave={() => setHovered(null)}
        >
          ★
        </button>
      ))}
    </div>
  )
}

// ── DetailModal ───────────────────────────────────────────────────────────

function DetailModal({ item: initial, engine, refresh, onClose }) {
  const [notes,    setNotes]    = useState(initial.notes    || '')
  const [mood,     setMood]     = useState(initial.mood     || [])
  const [rating,   setRating]   = useState(initial.rating   || null)
  const [progress, setProgress] = useState(String(initial.progress))
  const [total,    setTotal]    = useState(String(initial.total || ''))
  const [status,   setStatus]   = useState(initial.status)
  const [dirty,    setDirty]    = useState(false)

  // Live item reference (for +1 button updates)
  const liveItem = engine.items.find(i => i.id === initial.id) || initial

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  function save() {
    const prog = Math.max(0, parseInt(progress, 10) || 0)
    const tot  = total.trim() ? Math.max(1, parseInt(total, 10)) : null
    engine.updateItem(initial.id, { notes, mood, rating, progress: prog, total: tot })
    if (status !== initial.status) engine.setStatus(initial.id, status)
    refresh()
    setDirty(false)
  }

  function handleIncrement() {
    engine.incrementProgress(initial.id)
    const updated = engine.items.find(i => i.id === initial.id)
    if (updated) setProgress(String(updated.progress))
    refresh()
  }

  function handleDelete() {
    if (!confirm(`Delete "${initial.title}"?`)) return
    engine.deleteItem(initial.id)
    refresh()
    onClose()
  }

  function toggleMood(m) {
    setMood(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m])
    setDirty(true)
  }

  const gradient = TYPE_GRADIENT[initial.type] || TYPE_GRADIENT.other
  const progNum  = parseInt(progress, 10) || 0
  const totNum   = parseInt(total, 10) || null
  const pctVal   = totNum ? Math.min(100, Math.round((progNum / totNum) * 100)) : 0
  const isActive = status === 'watching' || status === 'paused'

  return (
    <div
      className="ent-modal-backdrop"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="ent-modal">
        <div className="ent-modal-hero">
          <div className="ent-modal-hero-bg" style={{ background: gradient }} />
          <div className="ent-modal-hero-title">{initial.title}</div>
        </div>

        <div className="ent-modal-body">
          {/* Status */}
          <div>
            <div className="ent-modal-field-label">Status</div>
            <select
              className="ent-modal-select"
              value={status}
              onChange={e => { setStatus(e.target.value); setDirty(true) }}
            >
              {Object.entries(STATUS_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>

          {/* Progress */}
          <div>
            <div className="ent-modal-field-label">Progress</div>
            {totNum > 0 && (
              <>
                <div className="ent-modal-progress-track">
                  <div className="ent-modal-progress-fill" style={{ width: `${pctVal}%` }} />
                </div>
                <div className="ent-modal-progress-text">{progNum} / {totNum} · {pctVal}%</div>
              </>
            )}
            <div className="ent-modal-ep-row">
              <input
                className="ent-modal-ep-input"
                type="number"
                min="0"
                value={progress}
                onChange={e => { setProgress(e.target.value); setDirty(true) }}
              />
              <span className="ent-modal-ep-sep">/</span>
              <input
                className="ent-modal-ep-input"
                type="number"
                min="1"
                placeholder="∞"
                value={total}
                onChange={e => { setTotal(e.target.value); setDirty(true) }}
              />
              <span className="ent-modal-ep-hint">episodes</span>
            </div>
          </div>

          {/* Rating */}
          <div>
            <div className="ent-modal-field-label">Rating</div>
            <StarRating value={rating} onChange={v => { setRating(v); setDirty(true) }} />
          </div>

          {/* Mood */}
          <div>
            <div className="ent-modal-field-label">Mood Tags</div>
            <div className="ent-mood-chips">
              {MOOD_OPTS.map(m => (
                <button
                  key={m}
                  className={`ent-mood-chip${mood.includes(m) ? ' active' : ''}`}
                  onClick={() => toggleMood(m)}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <div className="ent-modal-field-label">Notes</div>
            <textarea
              className="ent-modal-notes"
              value={notes}
              onChange={e => { setNotes(e.target.value); setDirty(true) }}
              placeholder="Add notes about this show..."
            />
          </div>

          {/* Metadata */}
          <div className="ent-modal-meta-row">
            <div className="ent-modal-meta-item">Updated <span>{fmtDate(liveItem.lastUpdated)}</span></div>
            <div className="ent-modal-meta-item">Added <span>{fmtDate(liveItem.dateAdded)}</span></div>
          </div>

          {/* Actions */}
          <div className="ent-modal-actions">
            {isActive && (
              <button className="ent-modal-btn-primary" onClick={handleIncrement}>+1 Episode</button>
            )}
            {dirty && (
              <button className="ent-modal-btn-primary" onClick={save}>Save</button>
            )}
            <button className="ent-modal-btn-secondary" onClick={onClose}>Close</button>
            <button className="ent-modal-btn-danger" onClick={handleDelete}>Delete</button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── AddModal ──────────────────────────────────────────────────────────────

function AddModal({ engine, refresh, onClose, onAdded }) {
  const [form, setForm] = useState({
    title: '', type: 'show', total: '', progress: '', genre: '', mood: [],
  })
  const titleRef = useRef(null)

  useEffect(() => {
    titleRef.current?.focus()
    function onKey(e) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  function handleSubmit(e) {
    e.preventDefault()
    if (!form.title.trim()) return
    const id = engine.addItem({
      title:    form.title.trim(),
      type:     form.type,
      total:    form.total    ? Number(form.total)    : null,
      progress: form.progress ? Number(form.progress) : 0,
      genre:    form.genre || null,
      mood:     form.mood,
    })
    refresh()
    onAdded(id)
    onClose()
  }

  function toggleMood(m) {
    setForm(f => ({
      ...f,
      mood: f.mood.includes(m) ? f.mood.filter(x => x !== m) : [...f.mood, m],
    }))
  }

  return (
    <div
      className="ent-modal-backdrop"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="ent-modal">
        <div className="ent-add-modal-title">Add to Watchboard</div>
        <div className="ent-modal-body">
          <form onSubmit={handleSubmit}>
            <div className="ent-add-grid">
              <div style={{ gridColumn: '1/-1' }}>
                <div className="ent-modal-field-label">Title *</div>
                <input
                  ref={titleRef}
                  className="ent-add-input"
                  type="text"
                  value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })}
                  placeholder="Breaking Bad, Dune, etc."
                  required
                />
              </div>
              <div>
                <div className="ent-modal-field-label">Type</div>
                <select
                  className="ent-add-input"
                  value={form.type}
                  onChange={e => setForm({ ...form, type: e.target.value })}
                >
                  <option value="show">📺 Show</option>
                  <option value="movie">🎬 Movie</option>
                  <option value="anime">⚡ Anime</option>
                  <option value="book">📖 Book</option>
                  <option value="youtube">▶ YouTube</option>
                  <option value="other">🎭 Other</option>
                </select>
              </div>
              <div>
                <div className="ent-modal-field-label">Genre</div>
                <select
                  className="ent-add-input"
                  value={form.genre}
                  onChange={e => setForm({ ...form, genre: e.target.value })}
                >
                  <option value="">— None —</option>
                  {GENRE_OPTS.map(g => (
                    <option key={g} value={g.toLowerCase()}>{g}</option>
                  ))}
                </select>
              </div>
              <div>
                <div className="ent-modal-field-label">Total Episodes</div>
                <input
                  className="ent-add-input"
                  type="number"
                  min="1"
                  value={form.total}
                  onChange={e => setForm({ ...form, total: e.target.value })}
                  placeholder="Leave blank if unknown"
                />
              </div>
              <div>
                <div className="ent-modal-field-label">Starting Progress</div>
                <input
                  className="ent-add-input"
                  type="number"
                  min="0"
                  value={form.progress}
                  onChange={e => setForm({ ...form, progress: e.target.value })}
                  placeholder="0"
                />
              </div>
              <div style={{ gridColumn: '1/-1' }}>
                <div className="ent-modal-field-label">Mood Tags</div>
                <div className="ent-mood-chips">
                  {MOOD_OPTS.map(m => (
                    <button
                      key={m}
                      type="button"
                      className={`ent-mood-chip${form.mood.includes(m) ? ' active' : ''}`}
                      onClick={() => toggleMood(m)}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
              <button type="submit" className="ent-modal-btn-primary">Add to Board</button>
              <button type="button" className="ent-modal-btn-secondary" onClick={onClose}>Cancel</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

// ── FilterView ────────────────────────────────────────────────────────────

const STATUS_TABS = [
  { key: 'all', label: 'All' },
  { key: 'watching',  label: 'Watching'  },
  { key: 'completed', label: 'Completed' },
  { key: 'paused',    label: 'Paused'    },
  { key: 'dropped',   label: 'Dropped'   },
  { key: 'planned',   label: 'Planned'   },
]

function FilterView({ engine, onDetails, onIncrement, newId }) {
  const [tab,         setTab]         = useState('all')
  const [genreFilter, setGenreFilter] = useState([])
  const [moodFilter,  setMoodFilter]  = useState([])
  const [sort,        setSort]        = useState('recent')
  const [query,       setQuery]       = useState('')

  const allItems = engine.getAll()
  const genres   = [...new Set(allItems.map(i => i.genre).filter(Boolean))]

  let items = tab === 'all' ? [...allItems] : allItems.filter(i => i.status === tab)
  if (genreFilter.length) items = items.filter(i => genreFilter.includes(i.genre))
  if (moodFilter.length)  items = items.filter(i => (i.mood || []).some(m => moodFilter.includes(m)))
  if (query.trim()) {
    const q = query.toLowerCase()
    items = items.filter(i => i.title.toLowerCase().includes(q))
  }
  if (sort === 'alpha')  items.sort((a, b) => a.title.localeCompare(b.title))
  else if (sort === 'rating') items.sort((a, b) => (b.rating || 0) - (a.rating || 0))
  else items.sort((a, b) => b.lastUpdated.localeCompare(a.lastUpdated))

  const hasFilters = genreFilter.length > 0 || moodFilter.length > 0

  function toggleGenre(g) {
    setGenreFilter(p => p.includes(g) ? p.filter(x => x !== g) : [...p, g])
  }
  function toggleMood(m) {
    setMoodFilter(p => p.includes(m) ? p.filter(x => x !== m) : [...p, m])
  }

  return (
    <div className="ent-filter-view">
      {/* Sidebar */}
      <div className="ent-filter-sidebar">
        {genres.length > 0 && (
          <div>
            <div className="ent-filter-section-title">Genre</div>
            <div className="ent-filter-chips">
              {genres.map(g => (
                <button
                  key={g}
                  className={`ent-filter-chip${genreFilter.includes(g) ? ' active' : ''}`}
                  onClick={() => toggleGenre(g)}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>
        )}
        <div>
          <div className="ent-filter-section-title">Mood</div>
          <div className="ent-filter-chips">
            {MOOD_OPTS.map(m => (
              <button
                key={m}
                className={`ent-filter-chip${moodFilter.includes(m) ? ' active' : ''}`}
                onClick={() => toggleMood(m)}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
        {hasFilters && (
          <button
            className="ent-filter-chip clear"
            onClick={() => { setGenreFilter([]); setMoodFilter([]) }}
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Main */}
      <div className="ent-filter-main">
        <div className="ent-filter-tabs">
          {STATUS_TABS.map(t => (
            <button
              key={t.key}
              className={`ent-filter-tab${tab === t.key ? ' active' : ''}`}
              onClick={() => setTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="ent-filter-toolbar">
          <input
            className="ent-filter-search"
            type="text"
            placeholder="Search..."
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
          <select
            className="ent-filter-sort"
            value={sort}
            onChange={e => setSort(e.target.value)}
          >
            <option value="recent">Recent</option>
            <option value="alpha">A → Z</option>
            <option value="rating">Rating</option>
          </select>
        </div>
        {items.length === 0 ? (
          <div className="ent-filter-empty">
            {query ? `No results for "${query}"` : 'Nothing here yet.'}
          </div>
        ) : (
          <div className="ent-filter-grid">
            {items.map(item => (
              <TypeCard
                key={item.id}
                item={item}
                onDetails={onDetails}
                onIncrement={onIncrement}
                isNew={item.id === newId}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── StatsView ─────────────────────────────────────────────────────────────

function StatsView({ engine }) {
  const stats = engine.getStats()
  const maxGenre = Math.max(1, ...Object.values(stats.byGenre))
  const maxMood  = Math.max(1, ...Object.values(stats.byMood).filter(v => v > 0), 1)

  const summaryCards = [
    { label: 'Total',     value: stats.total },
    { label: 'Watching',  value: stats.byStatus.watching  || 0 },
    { label: 'Completed', value: stats.byStatus.completed || 0 },
    { label: 'Episodes',  value: stats.totalProgress },
  ]

  return (
    <div className="ent-stats-view">
      <div className="ent-stats-title">Entertainment Stats</div>

      <div className="ent-stats-grid">
        {summaryCards.map(({ label, value }) => (
          <div key={label} className="ent-stat-card">
            <div className="ent-stat-value">{value}</div>
            <div className="ent-stat-label">{label}</div>
          </div>
        ))}
      </div>

      {Object.keys(stats.byGenre).length > 0 && (
        <div className="ent-stats-section">
          <div className="ent-stats-section-title">Top Genres</div>
          {Object.entries(stats.byGenre)
            .sort((a, b) => b[1] - a[1])
            .map(([genre, count]) => (
              <div key={genre} className="ent-stat-bar-row">
                <span className="ent-stat-bar-label">{genre}</span>
                <div className="ent-stat-bar-track">
                  <div className="ent-stat-bar-fill" style={{ width: `${(count / maxGenre) * 100}%` }} />
                </div>
                <span className="ent-stat-bar-count">{count}</span>
              </div>
            ))}
        </div>
      )}

      <div className="ent-stats-section">
        <div className="ent-stats-section-title">Mood Breakdown</div>
        {MOOD_OPTS.map(m => (
          <div key={m} className="ent-stat-bar-row">
            <span className="ent-stat-bar-label">{m}</span>
            <div className="ent-stat-bar-track">
              <div className="ent-stat-bar-fill" style={{ width: `${((stats.byMood[m] || 0) / maxMood) * 100}%` }} />
            </div>
            <span className="ent-stat-bar-count">{stats.byMood[m] || 0}</span>
          </div>
        ))}
      </div>

      {stats.total > 0 && (
        <div className="ent-stats-section">
          <div className="ent-stats-section-title">Status Breakdown</div>
          {Object.entries(stats.byStatus)
            .filter(([, count]) => count > 0)
            .sort((a, b) => b[1] - a[1])
            .map(([s, count]) => (
              <div key={s} className="ent-stat-bar-row">
                <span className="ent-stat-bar-label">{STATUS_LABELS[s] || s}</span>
                <div className="ent-stat-bar-track">
                  <div className="ent-stat-bar-fill" style={{ width: `${(count / stats.total) * 100}%` }} />
                </div>
                <span className="ent-stat-bar-count">{count}</span>
              </div>
            ))}
        </div>
      )}
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────

function Entertainment() {
  const { engine, refresh } = useEntertainmentEngine()
  const [view,         setView]         = useState('home')
  const [selectedItem, setSelectedItem] = useState(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [heroIdx,      setHeroIdx]      = useState(0)
  const [newId,        setNewId]        = useState(null)

  const watching  = engine.getByStatus('watching')
  const paused    = engine.getByStatus('paused')
  const completed = engine.getByStatus('completed')
  const dropped   = engine.getByStatus('dropped')
  const planned   = engine.getByStatus('planned')

  const continueItems = [...watching, ...paused]
    .sort((a, b) => b.lastUpdated.localeCompare(a.lastUpdated))
    .slice(0, 8)

  const heroItems = watching.slice(0, 5)

  function handleDetails(item) { setSelectedItem(item) }
  function handleCloseDetail() { setSelectedItem(null) }

  function handleIncrement(id) {
    engine.incrementProgress(id)
    refresh()
  }

  function handleAdded(id) {
    setNewId(id)
    setView('home')
    setTimeout(() => setNewId(null), 1500)
  }

  const isEmpty = watching.length === 0 && paused.length === 0 &&
                  completed.length === 0 && dropped.length === 0 && planned.length === 0

  return (
    <div className="ent-root page-enter">
      {/* Top nav */}
      <div className="ent-topnav">
        <div className="ent-topnav-title">Entertainment</div>
        <div className="ent-topnav-actions">
          {[
            { key: 'home',   label: 'Home'   },
            { key: 'filter', label: 'Browse' },
            { key: 'stats',  label: 'Stats'  },
          ].map(v => (
            <button
              key={v.key}
              className={`ent-nav-btn${view === v.key ? ' active' : ''}`}
              onClick={() => setView(v.key)}
            >
              {v.label}
            </button>
          ))}
          <button className="ent-nav-add" onClick={() => setShowAddModal(true)}>+ Add</button>
        </div>
      </div>

      {/* ── Home view ── */}
      {view === 'home' && (
        <>
          <HeroSection
            heroItems={heroItems}
            heroIdx={heroIdx}
            setHeroIdx={setHeroIdx}
            onDetails={handleDetails}
            onAdd={() => setShowAddModal(true)}
          />

          {continueItems.length > 0 && (
            <Shelf
              title="Continue Watching"
              items={continueItems}
              onDetails={handleDetails}
              onIncrement={handleIncrement}
              newId={newId}
            />
          )}

          {watching.length > 0 && (
            <Shelf
              title="Watching Now"
              items={watching}
              onDetails={handleDetails}
              onIncrement={handleIncrement}
              newId={newId}
            />
          )}

          {planned.length > 0 && (
            <Shelf
              title="Up Next"
              items={planned}
              onDetails={handleDetails}
              onIncrement={handleIncrement}
              collapsible
              newId={newId}
            />
          )}

          {completed.length > 0 && (
            <Shelf
              title="Completed"
              items={completed}
              onDetails={handleDetails}
              onIncrement={handleIncrement}
              collapsible
              newId={newId}
            />
          )}

          {dropped.length > 0 && (
            <Shelf
              title="Dropped"
              items={dropped}
              onDetails={handleDetails}
              onIncrement={handleIncrement}
              collapsible
              newId={newId}
            />
          )}

          {isEmpty && (
            <div style={{ padding: '32px 28px', color: 'rgba(255,255,255,0.28)', fontSize: 14 }}>
              Hit + Add to start your watchboard.
            </div>
          )}
        </>
      )}

      {/* ── Browse / Filter view ── */}
      {view === 'filter' && (
        <FilterView
          engine={engine}
          onDetails={handleDetails}
          onIncrement={handleIncrement}
          newId={newId}
        />
      )}

      {/* ── Stats view ── */}
      {view === 'stats' && <StatsView engine={engine} />}

      {/* Detail modal */}
      {selectedItem && (
        <DetailModal
          item={selectedItem}
          engine={engine}
          refresh={refresh}
          onClose={handleCloseDetail}
        />
      )}

      {/* Add modal */}
      {showAddModal && (
        <AddModal
          engine={engine}
          refresh={refresh}
          onClose={() => setShowAddModal(false)}
          onAdded={handleAdded}
        />
      )}
    </div>
  )
}

export default Entertainment
