#!/usr/bin/env node
'use strict';

// ─────────────────────────────────────────────────────────────────────────────
// ENVIRONMENT SETUP
// ─────────────────────────────────────────────────────────────────────────────

const _store = {};
global.localStorage = {
  getItem:    (key)    => Object.prototype.hasOwnProperty.call(_store, key) ? _store[key] : null,
  setItem:    (key, v) => { _store[key] = String(v); },
  removeItem: (key)    => { delete _store[key]; },
  clear:      ()       => { Object.keys(_store).forEach(k => delete _store[k]); },
};

const FinanceEngine = require('../FinanceEngine.js');

// ─────────────────────────────────────────────────────────────────────────────
// TEST RUNNER
// ─────────────────────────────────────────────────────────────────────────────

let passed = 0, failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (e) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${e.message}`);
    failed++;
  }
}

function assert(condition, msg) {
  if (!condition) throw new Error(msg || 'Assertion failed');
}

function eq(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label || 'eq'}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function fresh() {
  localStorage.clear();
  return new FinanceEngine();
}

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 1 — STATIC HELPERS
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[1] Static helpers');

test('getTodayDate returns YYYY-MM-DD format', () => {
  const today = FinanceEngine.getTodayDate();
  assert(/^\d{4}-\d{2}-\d{2}$/.test(today), `Bad format: ${today}`);
});

test('getMonthStart returns first day of month', () => {
  eq(FinanceEngine.getMonthStart('2026-05-09'), '2026-05-01', 'May 9');
  eq(FinanceEngine.getMonthStart('2026-01-31'), '2026-01-01', 'Jan 31');
  eq(FinanceEngine.getMonthStart('2026-12-15'), '2026-12-01', 'Dec 15');
});

test('getMonthStart with no arg uses today', () => {
  const result = FinanceEngine.getMonthStart();
  assert(/^\d{4}-\d{2}-01$/.test(result), `Expected YYYY-MM-01, got ${result}`);
});

test('getWeekStart returns the Sunday of that week', () => {
  // 2026-05-09 is a Saturday; Sunday of that week is 2026-05-03
  eq(FinanceEngine.getWeekStart('2026-05-09'), '2026-05-03', 'Saturday → Sunday');
  // 2026-05-03 is Sunday → stays 2026-05-03
  eq(FinanceEngine.getWeekStart('2026-05-03'), '2026-05-03', 'Sunday stays');
  // 2026-05-06 is Wednesday → Sunday 2026-05-03
  eq(FinanceEngine.getWeekStart('2026-05-06'), '2026-05-03', 'Wednesday → Sunday');
});

test('getWeekStart with no arg returns a valid date', () => {
  const result = FinanceEngine.getWeekStart();
  assert(/^\d{4}-\d{2}-\d{2}$/.test(result), `Bad format: ${result}`);
});

test('generateId returns uuid-like string', () => {
  const id = FinanceEngine.generateId();
  assert(typeof id === 'string' && id.length === 36, `Bad id: ${id}`);
  assert(id[14] === '4', 'Version 4 uuid');
});

test('generateId is unique each call', () => {
  const ids = new Set(Array.from({ length: 20 }, () => FinanceEngine.generateId()));
  eq(ids.size, 20, 'all unique');
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 2 — CONSTRUCTOR & PERSISTENCE
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[2] Constructor & persistence');

test('initialises empty when localStorage is empty', () => {
  const e = fresh();
  eq(e.transactions.length, 0, 'transactions');
  eq(e.budgets.length, 0, 'budgets');
});

test('addTransaction persists to localStorage', () => {
  const e = fresh();
  e.addTransaction('income', 1000, 'salary', '2026-05-01', 'May pay');
  const raw = JSON.parse(localStorage.getItem('finance_transactions'));
  eq(raw.length, 1, 'one stored');
  eq(raw[0].amount, 1000, 'amount');
});

test('second instance loads persisted transactions', () => {
  const e1 = fresh();
  e1.addTransaction('expense', 50, 'food', '2026-05-05', 'Groceries');
  const e2 = new FinanceEngine();
  eq(e2.transactions.length, 1, 'loaded');
  eq(e2.transactions[0].category, 'food', 'category');
});

test('corrupt localStorage falls back to empty array', () => {
  localStorage.setItem('finance_transactions', 'NOT_JSON{{');
  const e = new FinanceEngine();
  eq(e.transactions.length, 0, 'fallback');
});

test('saveState() persists both transactions and budgets', () => {
  const e = fresh();
  e.transactions.push({ id: 'x', type: 'income', amount: 1, category: 'other', date: '2026-05-01', createdAt: '2026-05-01' });
  e.budgets.push({ id: 'b', category: 'food', limit: 300, period: 'monthly', createdAt: '2026-05-01' });
  e.saveState();
  const t = JSON.parse(localStorage.getItem('finance_transactions'));
  const b = JSON.parse(localStorage.getItem('finance_budgets'));
  eq(t.length, 1, 'txn saved');
  eq(b.length, 1, 'budget saved');
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 3 — addTransaction
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[3] addTransaction');

test('returns a string id', () => {
  const e  = fresh();
  const id = e.addTransaction('income', 500, 'salary', '2026-05-01');
  assert(typeof id === 'string' && id.length > 0, 'id is string');
});

test('income entry has correct fields', () => {
  const e  = fresh();
  const id = e.addTransaction('income', 2500, 'freelance', '2026-05-02', 'Client A', 'freelance');
  const t  = e.transactions.find(x => x.id === id);
  assert(t, 'found');
  eq(t.type,        'income',    'type');
  eq(t.amount,       2500,       'amount');
  eq(t.category,    'freelance', 'category');
  eq(t.date,        '2026-05-02','date');
  eq(t.description, 'Client A',  'description');
  eq(t.source,      'freelance', 'source');
});

test('expense entry has correct fields', () => {
  const e  = fresh();
  const id = e.addTransaction('expense', 45.99, 'food', '2026-05-05', 'Whole Foods');
  const t  = e.transactions.find(x => x.id === id);
  assert(t, 'found');
  eq(t.type,    'expense', 'type');
  eq(t.amount,   45.99,   'amount');
  eq(t.category, 'food',  'category');
  assert(!t.source, 'no source on expense');
});

test('category is lowercased and trimmed', () => {
  const e  = fresh();
  const id = e.addTransaction('expense', 20, '  FOOD  ', '2026-05-05');
  eq(e.transactions.find(x => x.id === id).category, 'food', 'lowercased');
});

test('amount is rounded to 2 decimal places', () => {
  const e  = fresh();
  const id = e.addTransaction('expense', 10.999, 'food', '2026-05-05');
  eq(e.transactions.find(x => x.id === id).amount, 11, 'rounded');
});

test('defaults date to today when omitted', () => {
  const e    = fresh();
  const id   = e.addTransaction('income', 100, 'other');
  const today = FinanceEngine.getTodayDate();
  eq(e.transactions.find(x => x.id === id).date, today, 'date defaults to today');
});

test('throws on invalid type', () => {
  const e = fresh();
  let threw = false;
  try { e.addTransaction('transfer', 100, 'other', '2026-05-01'); } catch { threw = true; }
  assert(threw, 'should throw');
});

test('throws on non-positive amount', () => {
  const e = fresh();
  let threw = false;
  try { e.addTransaction('expense', -50, 'food', '2026-05-01'); } catch { threw = true; }
  assert(threw, 'negative throws');
  threw = false;
  try { e.addTransaction('expense', 0, 'food', '2026-05-01'); } catch { threw = true; }
  assert(threw, 'zero throws');
});

test('throws on missing category', () => {
  const e = fresh();
  let threw = false;
  try { e.addTransaction('expense', 50, '', '2026-05-01'); } catch { threw = true; }
  assert(threw, 'empty category throws');
});

test('throws on non-numeric amount', () => {
  const e = fresh();
  let threw = false;
  try { e.addTransaction('income', 'abc', 'salary', '2026-05-01'); } catch { threw = true; }
  assert(threw, 'NaN throws');
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 4 — deleteTransaction
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[4] deleteTransaction');

test('returns true and removes transaction', () => {
  const e  = fresh();
  const id = e.addTransaction('expense', 30, 'food', '2026-05-01');
  const ok = e.deleteTransaction(id);
  assert(ok, 'returns true');
  eq(e.transactions.length, 0, 'removed');
});

test('persists deletion to localStorage', () => {
  const e  = fresh();
  const id = e.addTransaction('expense', 30, 'food', '2026-05-01');
  e.deleteTransaction(id);
  const raw = JSON.parse(localStorage.getItem('finance_transactions'));
  eq(raw.length, 0, 'storage empty');
});

test('returns false for nonexistent id', () => {
  const e  = fresh();
  const ok = e.deleteTransaction('no-such-id');
  assert(!ok, 'returns false');
});

test('only deletes the targeted transaction', () => {
  const e   = fresh();
  const id1 = e.addTransaction('expense', 10, 'food',      '2026-05-01');
  const id2 = e.addTransaction('expense', 20, 'transport', '2026-05-02');
  e.deleteTransaction(id1);
  eq(e.transactions.length, 1, 'one remains');
  eq(e.transactions[0].id, id2, 'correct one');
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 5 — getTransactions
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[5] getTransactions');

test('returns all transactions when no filter', () => {
  const e = fresh();
  e.addTransaction('income',  1000, 'salary', '2026-05-01');
  e.addTransaction('expense',   50, 'food',   '2026-05-02');
  eq(e.getTransactions().length, 2, 'all 2');
});

test('filters by type', () => {
  const e = fresh();
  e.addTransaction('income',  1000, 'salary', '2026-05-01');
  e.addTransaction('expense',   50, 'food',   '2026-05-02');
  e.addTransaction('expense',   30, 'transport','2026-05-03');
  eq(e.getTransactions({ type: 'expense' }).length, 2, 'expenses');
  eq(e.getTransactions({ type: 'income'  }).length, 1, 'income');
});

test('filters by category (case-insensitive)', () => {
  const e = fresh();
  e.addTransaction('expense', 20, 'Food',   '2026-05-01');
  e.addTransaction('expense', 30, 'food',   '2026-05-02');
  e.addTransaction('expense', 40, 'health', '2026-05-03');
  eq(e.getTransactions({ category: 'food' }).length, 2, 'food only');
});

test('filters by sinceDate inclusive', () => {
  const e = fresh();
  e.addTransaction('expense', 10, 'food', '2026-05-01');
  e.addTransaction('expense', 20, 'food', '2026-05-05');
  e.addTransaction('expense', 30, 'food', '2026-05-10');
  const res = e.getTransactions({ sinceDate: '2026-05-05' });
  eq(res.length, 2, 'from May 5 onward');
});

test('filters by untilDate inclusive', () => {
  const e = fresh();
  e.addTransaction('expense', 10, 'food', '2026-05-01');
  e.addTransaction('expense', 20, 'food', '2026-05-05');
  e.addTransaction('expense', 30, 'food', '2026-05-10');
  const res = e.getTransactions({ untilDate: '2026-05-05' });
  eq(res.length, 2, 'up to May 5');
});

test('combined type + date range filter', () => {
  const e = fresh();
  e.addTransaction('income',  500, 'salary', '2026-05-01');
  e.addTransaction('expense',  20, 'food',   '2026-05-03');
  e.addTransaction('expense',  40, 'food',   '2026-05-07');
  e.addTransaction('expense',  60, 'food',   '2026-05-15');
  const res = e.getTransactions({ type: 'expense', sinceDate: '2026-05-03', untilDate: '2026-05-10' });
  eq(res.length, 2, '2 expenses in range');
});

test('sorted newest-first by date', () => {
  const e = fresh();
  e.addTransaction('expense', 10, 'food', '2026-05-01');
  e.addTransaction('expense', 20, 'food', '2026-05-10');
  e.addTransaction('expense', 30, 'food', '2026-05-05');
  const res = e.getTransactions();
  assert(res[0].date >= res[1].date && res[1].date >= res[2].date, 'desc order');
});

test('returns empty array when no match', () => {
  const e   = fresh();
  const res = e.getTransactions({ category: 'nonexistent' });
  assert(Array.isArray(res) && res.length === 0, 'empty');
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 6 — getTotals
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[6] getTotals');

test('returns zero totals with no transactions', () => {
  const e = fresh();
  const t = e.getTotals();
  eq(t.income,   0,    'income 0');
  eq(t.expenses, 0,    'expenses 0');
  eq(t.net,      0,    'net 0');
  assert(t.savingsRate === null, 'savingsRate null when no income');
});

test('calculates income, expenses, net correctly', () => {
  const e = fresh();
  e.addTransaction('income',  3000, 'salary', '2026-05-01');
  e.addTransaction('income',   500, 'other',  '2026-05-05');
  e.addTransaction('expense',  800, 'housing','2026-05-01');
  e.addTransaction('expense',  200, 'food',   '2026-05-10');
  const t = e.getTotals();
  eq(t.income,   3500, 'income');
  eq(t.expenses, 1000, 'expenses');
  eq(t.net,      2500, 'net');
});

test('savingsRate is (income-expenses)/income*100', () => {
  const e = fresh();
  e.addTransaction('income',  1000, 'salary', '2026-05-01');
  e.addTransaction('expense',  400, 'food',   '2026-05-01');
  const t = e.getTotals();
  eq(t.savingsRate, 60, 'savings rate 60%');
});

test('savingsRate is null when income is 0', () => {
  const e = fresh();
  e.addTransaction('expense', 200, 'food', '2026-05-01');
  assert(e.getTotals().savingsRate === null, 'null rate');
});

test('negative net when expenses > income', () => {
  const e = fresh();
  e.addTransaction('income',  200, 'other', '2026-05-01');
  e.addTransaction('expense', 500, 'food',  '2026-05-01');
  eq(e.getTotals().net, -300, 'negative net');
});

test('getTotals respects date range filter', () => {
  const e = fresh();
  e.addTransaction('income',  2000, 'salary', '2026-04-01');  // April
  e.addTransaction('income',  3000, 'salary', '2026-05-01');  // May
  e.addTransaction('expense',  500, 'food',   '2026-05-10');  // May
  const may = e.getTotals({ sinceDate: '2026-05-01', untilDate: '2026-05-31' });
  eq(may.income,   3000, 'may income');
  eq(may.expenses,  500, 'may expenses');
  eq(may.net,      2500, 'may net');
});

test('floating point amounts rounded to 2 decimals', () => {
  const e = fresh();
  e.addTransaction('income',  100.1, 'other', '2026-05-01');
  e.addTransaction('income',  100.2, 'other', '2026-05-02');
  e.addTransaction('expense',  50.3, 'food',  '2026-05-01');
  const t = e.getTotals();
  eq(t.income,   200.30, 'income rounded');
  eq(t.expenses,  50.30, 'expense rounded');
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 7 — getByCategory
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[7] getByCategory');

test('groups expenses by category', () => {
  const e = fresh();
  e.addTransaction('expense', 100, 'food',      '2026-05-01');
  e.addTransaction('expense',  50, 'food',      '2026-05-05');
  e.addTransaction('expense', 200, 'housing',   '2026-05-01');
  e.addTransaction('income',  500, 'salary',    '2026-05-01');
  const map = e.getByCategory({ type: 'expense' });
  eq(map['food'],    150, 'food total');
  eq(map['housing'], 200, 'housing total');
  assert(!map['salary'], 'income not included');
});

test('groups income by category', () => {
  const e = fresh();
  e.addTransaction('income', 3000, 'salary',    '2026-05-01');
  e.addTransaction('income',  500, 'freelance', '2026-05-10');
  e.addTransaction('income',  200, 'salary',    '2026-05-15');
  const map = e.getByCategory({ type: 'income' });
  eq(map['salary'],    3200, 'salary total');
  eq(map['freelance'],  500, 'freelance total');
});

test('returns all types when no type filter', () => {
  const e = fresh();
  e.addTransaction('income',  1000, 'salary', '2026-05-01');
  e.addTransaction('expense',  200, 'food',   '2026-05-01');
  const map = e.getByCategory();
  assert('salary' in map, 'salary present');
  assert('food'   in map, 'food present');
});

test('respects date range', () => {
  const e = fresh();
  e.addTransaction('expense', 100, 'food', '2026-04-15');  // April
  e.addTransaction('expense', 200, 'food', '2026-05-05');  // May
  const map = e.getByCategory({ type: 'expense', sinceDate: '2026-05-01' });
  eq(map['food'], 200, 'only May food');
});

test('returns empty object when no transactions', () => {
  const e = fresh();
  const map = e.getByCategory({ type: 'expense' });
  eq(Object.keys(map).length, 0, 'empty');
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 8 — setBudget & getBudgets
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[8] setBudget & getBudgets');

test('creates a new budget and returns id', () => {
  const e  = fresh();
  const id = e.setBudget('food', 500, 'monthly');
  assert(typeof id === 'string' && id.length > 0, 'returns id');
  eq(e.budgets.length, 1, 'one budget');
});

test('budget has correct fields', () => {
  const e  = fresh();
  const id = e.setBudget('food', 500, 'monthly');
  const b  = e.budgets[0];
  eq(b.id,       id,        'id matches');
  eq(b.category, 'food',    'category');
  eq(b.limit,    500,       'limit');
  eq(b.period,   'monthly', 'period');
  assert(typeof b.createdAt === 'string', 'createdAt set');
});

test('category is lowercased and trimmed', () => {
  const e = fresh();
  e.setBudget('  FOOD  ', 300, 'monthly');
  eq(e.budgets[0].category, 'food', 'lowercased');
});

test('replaces existing budget for same category + period', () => {
  const e   = fresh();
  const id1 = e.setBudget('food', 300, 'monthly');
  const id2 = e.setBudget('food', 500, 'monthly');
  eq(e.budgets.length, 1, 'still one budget');
  eq(id1, id2, 'same id kept');
  eq(e.budgets[0].limit, 500, 'limit updated');
});

test('same category, different period creates separate budgets', () => {
  const e = fresh();
  e.setBudget('food', 500, 'monthly');
  e.setBudget('food', 150, 'weekly');
  eq(e.budgets.length, 2, 'two budgets');
});

test('persists to localStorage', () => {
  const e = fresh();
  e.setBudget('housing', 1200, 'monthly');
  const raw = JSON.parse(localStorage.getItem('finance_budgets'));
  eq(raw.length, 1, 'stored');
  eq(raw[0].category, 'housing', 'category stored');
});

test('getBudgets returns a copy of all budgets', () => {
  const e = fresh();
  e.setBudget('food',    500, 'monthly');
  e.setBudget('health',  200, 'monthly');
  const list = e.getBudgets();
  eq(list.length, 2, 'two budgets');
  // mutation guard
  list.push({ fake: true });
  eq(e.budgets.length, 2, 'original unchanged');
});

test('throws on invalid period', () => {
  const e = fresh();
  let threw = false;
  try { e.setBudget('food', 500, 'yearly'); } catch { threw = true; }
  assert(threw, 'yearly throws');
});

test('throws on non-positive limit', () => {
  const e = fresh();
  let threw = false;
  try { e.setBudget('food', 0, 'monthly'); } catch { threw = true; }
  assert(threw, 'zero throws');
  threw = false;
  try { e.setBudget('food', -100, 'monthly'); } catch { threw = true; }
  assert(threw, 'negative throws');
});

test('throws on missing category', () => {
  const e = fresh();
  let threw = false;
  try { e.setBudget('', 500, 'monthly'); } catch { threw = true; }
  assert(threw, 'empty throws');
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 9 — getBudgetStatus
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[9] getBudgetStatus');

test('returns null when no budget exists for category', () => {
  const e = fresh();
  assert(e.getBudgetStatus('food') === null, 'null');
});

test('status ok when < 80% spent', () => {
  const e = fresh();
  e.setBudget('food', 500, 'monthly');
  e.addTransaction('expense', 100, 'food', '2026-05-05');  // 20%
  const s = e.getBudgetStatus('food', '2026-05-09');
  eq(s.spent,       100,  'spent');
  eq(s.limit,       500,  'limit');
  eq(s.remaining,   400,  'remaining');
  eq(s.percentUsed, 20,   'percentUsed');
  eq(s.status,      'ok', 'status ok');
});

test('status warning when 80–99% spent', () => {
  const e = fresh();
  e.setBudget('food', 500, 'monthly');
  e.addTransaction('expense', 420, 'food', '2026-05-05');  // 84%
  const s = e.getBudgetStatus('food', '2026-05-09');
  eq(s.status, 'warning', 'warning at 84%');
});

test('status over when >= 100% spent', () => {
  const e = fresh();
  e.setBudget('food', 300, 'monthly');
  e.addTransaction('expense', 350, 'food', '2026-05-05');
  const s = e.getBudgetStatus('food', '2026-05-09');
  eq(s.status, 'over', 'over');
  assert(s.remaining < 0, 'negative remaining');
});

test('monthly budget scopes to current month only', () => {
  const e = fresh();
  e.setBudget('food', 500, 'monthly');
  e.addTransaction('expense', 200, 'food', '2026-04-15');  // April — excluded
  e.addTransaction('expense', 100, 'food', '2026-05-05');  // May — included
  const s = e.getBudgetStatus('food', '2026-05-09');
  eq(s.spent, 100, 'only May expenses');
});

test('weekly budget scopes to current week only', () => {
  const e = fresh();
  e.setBudget('food', 200, 'weekly');
  // week of 2026-05-09 (Saturday) starts on 2026-05-03 (Sunday)
  e.addTransaction('expense', 80, 'food', '2026-05-01');  // prev week — excluded
  e.addTransaction('expense', 50, 'food', '2026-05-04');  // this week — included
  e.addTransaction('expense', 30, 'food', '2026-05-07');  // this week — included
  const s = e.getBudgetStatus('food', '2026-05-09');
  eq(s.spent, 80, 'only this week');
});

test('expenses from other categories not counted', () => {
  const e = fresh();
  e.setBudget('food', 500, 'monthly');
  e.addTransaction('expense', 200, 'food',      '2026-05-05');
  e.addTransaction('expense', 300, 'transport', '2026-05-05');  // different cat
  const s = e.getBudgetStatus('food', '2026-05-09');
  eq(s.spent, 200, 'only food');
});

test('income not counted against budget', () => {
  const e = fresh();
  e.setBudget('salary', 500, 'monthly');
  e.addTransaction('income', 3000, 'salary', '2026-05-01');
  const s = e.getBudgetStatus('salary', '2026-05-09');
  eq(s.spent, 0, 'income not counted');
});

test('percentUsed at exactly 80 is warning not ok', () => {
  const e = fresh();
  e.setBudget('food', 500, 'monthly');
  e.addTransaction('expense', 400, 'food', '2026-05-01');  // 80%
  const s = e.getBudgetStatus('food', '2026-05-09');
  eq(s.status, 'warning', 'boundary 80%');
});

test('percentUsed at exactly 100 is over', () => {
  const e = fresh();
  e.setBudget('food', 500, 'monthly');
  e.addTransaction('expense', 500, 'food', '2026-05-01');  // 100%
  const s = e.getBudgetStatus('food', '2026-05-09');
  eq(s.status, 'over', 'boundary 100%');
});

test('untilDate in getBudgetStatus excludes future transactions', () => {
  const e = fresh();
  e.setBudget('food', 500, 'monthly');
  e.addTransaction('expense', 100, 'food', '2026-05-05');
  e.addTransaction('expense', 200, 'food', '2026-05-20');  // future relative to ref
  const s = e.getBudgetStatus('food', '2026-05-09');
  eq(s.spent, 100, 'future excluded');
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 10 — INTEGRATION / CHECKLIST
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[10] Integration');

test('full month scenario: income → expenses → totals → category → budget', () => {
  const e = fresh();

  // Salary + side income
  e.addTransaction('income', 5000, 'salary',    '2026-05-01', 'Day job', 'salary');
  e.addTransaction('income',  800, 'freelance', '2026-05-15', 'Side project');

  // Expenses
  e.addTransaction('expense', 1200, 'housing',   '2026-05-01', 'Rent');
  e.addTransaction('expense',  350, 'food',       '2026-05-08', 'Groceries');
  e.addTransaction('expense',   80, 'food',       '2026-05-20', 'Dining out');
  e.addTransaction('expense',  120, 'transport',  '2026-05-05', 'Gas');
  e.addTransaction('expense',   60, 'utilities',  '2026-05-10', 'Electric');

  const totals = e.getTotals();
  eq(totals.income,   5800, 'total income');
  eq(totals.expenses, 1810, 'total expenses');
  eq(totals.net,      3990, 'net');
  eq(totals.savingsRate, 68.8, 'savings rate');

  const catMap = e.getByCategory({ type: 'expense' });
  eq(catMap['food'],    430, 'food total');
  eq(catMap['housing'], 1200, 'housing total');

  // Budget
  e.setBudget('food', 500, 'monthly');
  const s = e.getBudgetStatus('food', '2026-05-31');
  eq(s.spent, 430, 'budget spent');
  eq(s.status, 'warning', 'at 86% — warning');
});

test('delete removes from totals', () => {
  const e   = fresh();
  const id  = e.addTransaction('expense', 100, 'food', '2026-05-01');
  e.addTransaction('income', 500, 'salary', '2026-05-01');
  e.deleteTransaction(id);
  const t = e.getTotals();
  eq(t.expenses, 0, 'expenses 0 after delete');
  eq(t.income, 500, 'income unchanged');
});

test('reload after mixed operations preserves state', () => {
  const e1 = fresh();
  e1.addTransaction('income',  2000, 'salary', '2026-05-01');
  const badId = e1.addTransaction('expense', 999, 'food', '2026-05-01');
  e1.addTransaction('expense',  300, 'housing','2026-05-01');
  e1.deleteTransaction(badId);
  e1.setBudget('housing', 400, 'monthly');

  const e2 = new FinanceEngine();
  eq(e2.transactions.length, 2, 'two txns persisted');
  eq(e2.budgets.length,      1, 'budget persisted');

  const t = e2.getTotals();
  eq(t.income,   2000, 'income');
  eq(t.expenses,  300, 'expenses');
});

// ─────────────────────────────────────────────────────────────────────────────
// RESULTS
// ─────────────────────────────────────────────────────────────────────────────

console.log(`\n${'─'.repeat(50)}`);
console.log(`  ${passed + failed} tests   ✓ ${passed} passed   ✗ ${failed} failed`);
console.log(`${'─'.repeat(50)}\n`);

if (failed > 0) process.exit(1);
