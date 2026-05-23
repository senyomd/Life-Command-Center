class FinanceEngine {
  constructor() {
    this._load();
  }

  _load() {
    try {
      const raw = localStorage.getItem('finance_simple');
      const data = raw ? JSON.parse(raw) : { income: [], expenses: [] };
      this.income   = data.income   || [];
      this.expenses = data.expenses || [];
    } catch {
      this.income   = [];
      this.expenses = [];
    }
  }

  addIncome(name, amount) {
    if (!name || !String(name).trim()) throw new Error('Name is required.');
    const amt = parseFloat(amount);
    if (!isFinite(amt) || amt <= 0) throw new Error('Amount must be a positive number.');
    this.income.push({ id: this._id(), name: String(name).trim(), amount: Math.round(amt * 100) / 100 });
    this._save();
  }

  addExpense(name, amount) {
    if (!name || !String(name).trim()) throw new Error('Name is required.');
    const amt = parseFloat(amount);
    if (!isFinite(amt) || amt <= 0) throw new Error('Amount must be a positive number.');
    this.expenses.push({ id: this._id(), name: String(name).trim(), amount: Math.round(amt * 100) / 100 });
    this._save();
  }

  removeIncome(id) {
    this.income = this.income.filter(i => i.id !== id);
    this._save();
  }

  removeExpense(id) {
    this.expenses = this.expenses.filter(e => e.id !== id);
    this._save();
  }

  getIncome()   { return this.income; }
  getExpenses() { return this.expenses; }

  getTotalIncome()   { return Math.round(this.income.reduce((s, i) => s + i.amount, 0) * 100) / 100; }
  getTotalExpenses() { return Math.round(this.expenses.reduce((s, e) => s + e.amount, 0) * 100) / 100; }
  getNetWorth()      { return Math.round((this.getTotalIncome() - this.getTotalExpenses()) * 100) / 100; }

  _save() {
    localStorage.setItem('finance_simple', JSON.stringify({ income: this.income, expenses: this.expenses }));
  }

  _id() {
    return Math.random().toString(36).substr(2, 9);
  }
}

if (typeof module !== 'undefined') module.exports = FinanceEngine;

export default FinanceEngine;
