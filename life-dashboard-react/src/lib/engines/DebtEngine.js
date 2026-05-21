class DebtEngine {
  constructor() {
    this._load();
  }

  _load() {
    try {
      const raw = localStorage.getItem('finance_debts');
      this.debts = raw ? JSON.parse(raw) : [];
    } catch {
      this.debts = [];
    }
  }

  addDebt(name, totalAmount, monthlyPayment = 0, interestRate = 0, dueDate = null) {
    if (!name || !String(name).trim()) throw new Error('Name is required.');
    const amt = Number(totalAmount);
    if (!isFinite(amt) || amt <= 0) throw new Error('Total amount must be a positive number.');

    const debt = {
      id: Math.random().toString(36).substr(2, 9),
      name: String(name).trim(),
      totalAmount: Math.round(amt * 100) / 100,
      monthlyPayment: Math.round((Number(monthlyPayment) || 0) * 100) / 100,
      interestRate: Number(interestRate) || 0,
      dueDate: dueDate || null,
      createdAt: new Date().toISOString().split('T')[0],
      paid: 0,
    };

    this.debts.push(debt);
    this._saveState();
    return debt.id;
  }

  updateDebt(id, updates) {
    const debt = this.debts.find(d => d.id === id);
    if (!debt) throw new Error('Debt not found.');
    Object.assign(debt, updates);
    this._saveState();
  }

  removeDebt(id) {
    this.debts = this.debts.filter(d => d.id !== id);
    this._saveState();
  }

  getDebts() {
    return this.debts;
  }

  getTotalDebt() {
    return Math.round(this.debts.reduce((sum, d) => sum + (d.totalAmount - d.paid), 0) * 100) / 100;
  }

  getTotalMonthlyPayments() {
    return Math.round(this.debts.reduce((sum, d) => sum + (d.monthlyPayment || 0), 0) * 100) / 100;
  }

  getDebtToIncomeRatio(monthlyIncome) {
    if (!monthlyIncome || monthlyIncome === 0) return 0;
    return (this.getTotalMonthlyPayments() / monthlyIncome) * 100;
  }

  _saveState() {
    localStorage.setItem('finance_debts', JSON.stringify(this.debts));
  }
}

if (typeof module !== 'undefined') module.exports = DebtEngine;

export default DebtEngine;
