/**
 * EntertainmentEngine — single source of truth for entertainment tracking.
 * Pure CRUD + queries over localStorage. No UI, no side effects beyond storage.
 * Storage key: 'entertainment_items'. Dates: local device time, YYYY-MM-DD.
 */
class EntertainmentEngine {

  static VALID_TYPES   = ['show', 'movie', 'anime', 'book', 'youtube', 'other']
  static VALID_STATUSES = ['watching', 'completed', 'dropped', 'paused', 'planned']

  constructor() {
    this.items = []
    this._load()
  }

  // ── STATIC HELPERS ────────────────────────────────────────────────────────

  static generateId() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16)
    })
  }

  static todayDate() {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
  }

  // ── CRUD ─────────────────────────────────────────────────────────────────

  /**
   * Add a new item.
   * @param {object} opts
   * @param {string} opts.title      — required
   * @param {string} [opts.type]     — default 'show'
   * @param {number} [opts.total]    — total episodes/pages; null = unknown
   * @param {number} [opts.progress] — starting progress; default 0
   * @returns {string} new item id
   */
  addItem({ title, type = 'show', total = null, progress = 0 } = {}) {
    if (!title || !String(title).trim()) throw new Error('title is required')
    if (!EntertainmentEngine.VALID_TYPES.includes(type)) {
      throw new Error(`Invalid type "${type}"`)
    }
    const prog = Math.max(0, Number(progress) || 0)
    const tot  = total != null ? Math.max(1, Number(total)) : null
    const today = EntertainmentEngine.todayDate()

    const item = {
      id:          EntertainmentEngine.generateId(),
      title:       String(title).trim(),
      type,
      status:      'watching',
      progress:    prog,
      total:       tot,
      rating:      null,
      lastUpdated: today,
      dateAdded:   today,
    }

    this.items.push(item)
    this._save()
    return item.id
  }

  /**
   * Delete an item permanently.
   * @returns {boolean}
   */
  deleteItem(id) {
    const idx = this.items.findIndex(i => i.id === id)
    if (idx === -1) return false
    this.items.splice(idx, 1)
    this._save()
    return true
  }

  /**
   * Update any allowed fields on an item.
   * Allowed: title, type, total, rating
   * Use setStatus / incrementProgress for those transitions.
   */
  updateItem(id, changes = {}) {
    const item = this.items.find(i => i.id === id)
    if (!item) return null

    if ('title' in changes && changes.title?.trim()) {
      item.title = String(changes.title).trim()
    }
    if ('type' in changes && EntertainmentEngine.VALID_TYPES.includes(changes.type)) {
      item.type = changes.type
    }
    if ('total' in changes) {
      item.total = changes.total != null ? Math.max(1, Number(changes.total)) : null
    }
    if ('rating' in changes) {
      item.rating = changes.rating != null ? Math.min(10, Math.max(1, Number(changes.rating))) : null
    }

    item.lastUpdated = EntertainmentEngine.todayDate()
    this._save()
    return item
  }

  // ── STATUS & PROGRESS ─────────────────────────────────────────────────────

  /**
   * Change an item's status.
   * Completing an item auto-sets progress = total (if total known).
   */
  setStatus(id, status) {
    if (!EntertainmentEngine.VALID_STATUSES.includes(status)) {
      throw new Error(`Invalid status "${status}"`)
    }
    const item = this.items.find(i => i.id === id)
    if (!item) return null

    item.status = status

    if (status === 'completed' && item.total != null) {
      item.progress = item.total
    }

    item.lastUpdated = EntertainmentEngine.todayDate()
    this._save()
    return item
  }

  /**
   * Increment progress by 1 (e.g. +1 episode).
   * Auto-completes if progress reaches total.
   * @returns {object} updated item
   */
  incrementProgress(id) {
    const item = this.items.find(i => i.id === id)
    if (!item) return null
    if (item.status === 'completed') return item

    item.progress = item.progress + 1

    if (item.total != null && item.progress >= item.total) {
      item.progress = item.total
      item.status   = 'completed'
    }

    item.lastUpdated = EntertainmentEngine.todayDate()
    this._save()
    return item
  }

  /**
   * Set progress to an explicit value.
   * Auto-completes if progress reaches total.
   */
  setProgress(id, progress) {
    const item = this.items.find(i => i.id === id)
    if (!item) return null

    const prog = Math.max(0, Number(progress) || 0)
    item.progress = item.total != null ? Math.min(prog, item.total) : prog

    if (item.total != null && item.progress >= item.total) {
      item.status = 'completed'
    }

    item.lastUpdated = EntertainmentEngine.todayDate()
    this._save()
    return item
  }

  // ── QUERIES ───────────────────────────────────────────────────────────────

  /** All items, newest first. */
  getAll() {
    return [...this.items].sort((a, b) => b.dateAdded.localeCompare(a.dateAdded))
  }

  /** Filter by status. */
  getByStatus(status) {
    return [...this.items]
      .filter(i => i.status === status)
      .sort((a, b) => b.lastUpdated.localeCompare(a.lastUpdated))
  }

  /**
   * "Continue Watching" — up to N most recently updated actively-watching items.
   */
  getContinueWatching(limit = 3) {
    return [...this.items]
      .filter(i => i.status === 'watching' || i.status === 'paused')
      .sort((a, b) => b.lastUpdated.localeCompare(a.lastUpdated))
      .slice(0, limit)
  }

  /** Search by title substring (case-insensitive). */
  search(query) {
    const q = String(query).toLowerCase().trim()
    if (!q) return this.getAll()
    return this.getAll().filter(i => i.title.toLowerCase().includes(q))
  }

  /** Summary counts by status. */
  getCounts() {
    const counts = { watching: 0, completed: 0, dropped: 0, paused: 0, planned: 0, total: 0 }
    for (const item of this.items) {
      counts[item.status] = (counts[item.status] || 0) + 1
      counts.total++
    }
    return counts
  }

  /** Percentage complete for an item (0–100). Returns null if total unknown. */
  static getPercent(item) {
    if (!item.total) return null
    return Math.round((item.progress / item.total) * 100)
  }

  // ── PERSISTENCE ───────────────────────────────────────────────────────────

  _save() {
    localStorage.setItem('entertainment_items', JSON.stringify(this.items))
  }

  _load() {
    try {
      this.items = JSON.parse(localStorage.getItem('entertainment_items') || '[]')
    } catch {
      this.items = []
    }
  }
}

if (typeof module !== 'undefined') module.exports = EntertainmentEngine
export default EntertainmentEngine
