/**
 * FinanceEngine — single source of truth for financial data.
 * Pure CRUD + analytics over localStorage. No UI, no side effects beyond storage.
 * Storage keys: 'finance_transactions', 'finance_budgets'. Dates: local device time, YYYY-MM-DD.
 */
class FinanceEngine {

  static VALID_TYPES   = ['income', 'expense'];
  static VALID_PERIODS = ['monthly', 'weekly'];

  // Income sources / expense categories are open-ended strings, but common ones:
  static INCOME_CATEGORIES  = ['salary', 'freelance', 'investment', 'gift', 'other'];
  static EXPENSE_CATEGORIES = ['food', 'housing', 'transport', 'utilities', 'health',
                               'entertainment', 'clothing', 'education', 'savings', 'other'];

  constructor() {
    this.transactions = [];
    this.budgets      = [];
    this._loadTransactions();
    this._loadBudgets();
  }

  // ── STATIC HELPERS ────────────────────────────────────────────────────────

  static generateId() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
  }

  static getTodayDate() {
    const d = new Date();
    return FinanceEngine._fmtDate(d);
  }

  /** Returns the first day of the month containing 'date' (YYYY-MM-DD → YYYY-MM-01). */
  static getMonthStart(date) {
    const [y, m] = (date || FinanceEngine.getTodayDate()).split('-');
    return `${y}-${m}-01`;
  }

  /** Returns the Sunday of the week containing 'date' (YYYY-MM-DD). */
  static getWeekStart(date) {
    const str = date || FinanceEngine.getTodayDate();
    const [y, m, d] = str.split('-').map(Number);
    const dt = new Date(y, m - 1, d, 12, 0, 0);
    dt.setDate(dt.getDate() - dt.getDay()); // rewind to Sunday
    return FinanceEngine._fmtDate(dt);
  }

  static _fmtDate(d) {
    const y  = d.getFullYear();
    const m  = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dd}`;
  }

  // ── TRANSACTIONS: CRUD ────────────────────────────────────────────────────

  /**
   * Add a transaction.
   * @param {'income'|'expense'} type
   * @param {number}  amount      — positive number
   * @param {string}  category    — free-form string
   * @param {string}  [date]      — YYYY-MM-DD; defaults to today
   * @param {string}  [description]
   * @param {string}  [source]    — for income entries (e.g. 'salary')
   * @returns {string} new transaction id
   * @throws if type or amount invalid
   */
  addTransaction(type, amount, category, date, description = '', source = '') {
    if (!FinanceEngine.VALID_TYPES.includes(type)) {
      throw new Error(`Invalid type "${type}". Must be "income" or "expense".`);
    }
    const amt = Number(amount);
    if (!isFinite(amt) || amt <= 0) {
      throw new Error(`Amount must be a positive number, got: ${amount}`);
    }
    if (!category || !String(category).trim()) {
      throw new Error('Category is required.');
    }

    const today = FinanceEngine.getTodayDate();
    const entry = {
      id:          FinanceEngine.generateId(),
      type,
      amount:      Math.round(amt * 100) / 100, // store as cents-rounded float
      category:    String(category).trim().toLowerCase(),
      description: String(description).trim(),
      date:        date || today,
      createdAt:   today,
    };

    if (type === 'income' && source) {
      entry.source = String(source).trim().toLowerCase();
    }

    this.transactions.push(entry);
    this._saveTransactions();
    return entry.id;
  }

  /**
   * Delete a transaction by id.
   * @returns {boolean} true if found and deleted, false otherwise
   */
  deleteTransaction(transactionId) {
    const idx = this.transactions.findIndex(t => t.id === transactionId);
    if (idx === -1) return false;
    this.transactions.splice(idx, 1);
    this._saveTransactions();
    return true;
  }

  /**
   * Retrieve transactions, optionally filtered.
   * @param {object} [filter]
   * @param {string} [filter.type]      — 'income' | 'expense'
   * @param {string} [filter.category]  — exact match (lowercased)
   * @param {string} [filter.sinceDate] — YYYY-MM-DD inclusive
   * @param {string} [filter.untilDate] — YYYY-MM-DD inclusive
   * @returns {Array} sorted newest-first by date
   */
  getTransactions(filter = {}) {
    let result = [...this.transactions];

    if (filter.type)      result = result.filter(t => t.type === filter.type);
    if (filter.category)  result = result.filter(t => t.category === filter.category.toLowerCase());
    if (filter.sinceDate) result = result.filter(t => t.date >= filter.sinceDate);
    if (filter.untilDate) result = result.filter(t => t.date <= filter.untilDate);

    return result.sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
  }

  // ── ANALYTICS ─────────────────────────────────────────────────────────────

  /**
   * Calculate income / expenses / net for an optional date range.
   * @param {object} [dateRange]
   * @param {string} [dateRange.sinceDate] — YYYY-MM-DD inclusive
   * @param {string} [dateRange.untilDate] — YYYY-MM-DD inclusive
   * @returns {{ income, expenses, net, savingsRate }}
   *   savingsRate is null when income is 0 (avoid division by zero).
   */
  getTotals(dateRange = {}) {
    const txns = this.getTransactions(dateRange);

    const income   = txns.filter(t => t.type === 'income')
                         .reduce((s, t) => s + t.amount, 0);
    const expenses = txns.filter(t => t.type === 'expense')
                         .reduce((s, t) => s + t.amount, 0);
    const net         = Math.round((income - expenses) * 100) / 100;
    const savingsRate = income > 0
      ? Math.round(((income - expenses) / income) * 1000) / 10  // one decimal
      : null;

    return {
      income:      Math.round(income   * 100) / 100,
      expenses:    Math.round(expenses * 100) / 100,
      net,
      savingsRate,
    };
  }

  /**
   * Group expense (and optionally income) amounts by category.
   * @param {object} [options]
   * @param {'income'|'expense'|null} [options.type] — filter by type; null = all
   * @param {string} [options.sinceDate]
   * @param {string} [options.untilDate]
   * @returns {Object.<string, number>} { category: totalAmount }
   */
  getByCategory(options = {}) {
    const filter = {};
    if (options.type)      filter.type      = options.type;
    if (options.sinceDate) filter.sinceDate = options.sinceDate;
    if (options.untilDate) filter.untilDate = options.untilDate;

    const txns = this.getTransactions(filter);
    const map  = {};
    for (const t of txns) {
      map[t.category] = Math.round(((map[t.category] || 0) + t.amount) * 100) / 100;
    }
    return map;
  }

  // ── BUDGETS ───────────────────────────────────────────────────────────────

  /**
   * Set (or overwrite) a budget for a category.
   * If a budget already exists for this category + period, it is replaced.
   * @param {string}             category
   * @param {number}             limit    — positive number
   * @param {'monthly'|'weekly'} period
   * @returns {string} budget id
   */
  setBudget(category, limit, period = 'monthly') {
    if (!category || !String(category).trim()) throw new Error('Category is required.');
    const lmt = Number(limit);
    if (!isFinite(lmt) || lmt <= 0) throw new Error(`Budget limit must be a positive number, got: ${limit}`);
    if (!FinanceEngine.VALID_PERIODS.includes(period)) {
      throw new Error(`Invalid period "${period}". Must be "monthly" or "weekly".`);
    }

    const cat = String(category).trim().toLowerCase();

    // Replace existing budget for same category + period
    const existing = this.budgets.findIndex(b => b.category === cat && b.period === period);
    const entry = {
      id:        existing >= 0 ? this.budgets[existing].id : FinanceEngine.generateId(),
      category:  cat,
      limit:     Math.round(lmt * 100) / 100,
      period,
      createdAt: existing >= 0 ? this.budgets[existing].createdAt : FinanceEngine.getTodayDate(),
    };

    if (existing >= 0) this.budgets[existing] = entry;
    else               this.budgets.push(entry);

    this._saveBudgets();
    return entry.id;
  }

  /** Return all budgets. */
  getBudgets() {
    return [...this.budgets];
  }

  /**
   * Calculate how much has been spent against a budget for the current period.
   * @param {string} category
   * @param {string} [date] — YYYY-MM-DD reference date; defaults to today
   * @returns {{
   *   spent: number, limit: number, remaining: number,
   *   percentUsed: number, status: 'ok'|'warning'|'over'
   * } | null} null if no budget exists for this category
   */
  getBudgetStatus(category, date) {
    const cat    = String(category).trim().toLowerCase();
    const budget = this.budgets.find(b => b.category === cat);
    if (!budget) return null;

    const ref = date || FinanceEngine.getTodayDate();
    let sinceDate;
    if (budget.period === 'monthly') {
      sinceDate = FinanceEngine.getMonthStart(ref);
    } else {
      sinceDate = FinanceEngine.getWeekStart(ref);
    }

    const spent = this.getTransactions({ type: 'expense', category: cat, sinceDate, untilDate: ref })
                      .reduce((s, t) => s + t.amount, 0);
    const spentRounded = Math.round(spent * 100) / 100;
    const remaining    = Math.round((budget.limit - spentRounded) * 100) / 100;
    const percentUsed  = Math.round((spentRounded / budget.limit) * 1000) / 10; // one decimal

    let status;
    if (percentUsed >= 100) status = 'over';
    else if (percentUsed >= 80) status = 'warning';
    else status = 'ok';

    return {
      spent:       spentRounded,
      limit:       budget.limit,
      remaining,
      percentUsed,
      status,
    };
  }

  // ── PERSISTENCE ───────────────────────────────────────────────────────────

  /** Persist both transactions and budgets. */
  saveState() {
    this._saveTransactions();
    this._saveBudgets();
  }

  _saveTransactions() {
    localStorage.setItem('finance_transactions', JSON.stringify(this.transactions));
  }

  _saveBudgets() {
    localStorage.setItem('finance_budgets', JSON.stringify(this.budgets));
  }

  _loadTransactions() {
    try {
      const raw = localStorage.getItem('finance_transactions');
      if (raw) { this.transactions = JSON.parse(raw); return; }
    } catch { /* corrupt — fall through */ }
    this.transactions = [];
  }

  _loadBudgets() {
    try {
      const raw = localStorage.getItem('finance_budgets');
      if (raw) { this.budgets = JSON.parse(raw); return; }
    } catch { /* corrupt — fall through */ }
    this.budgets = [];
  }
}

if (typeof module !== 'undefined') module.exports = FinanceEngine;

export default FinanceEngine;
