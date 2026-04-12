import { Settlement, Trip } from '@/types/trip';

export function calculateBalances(trip: Trip): Record<string, number> {
  const balances: Record<string, number> = {};
  trip.members.forEach(m => { balances[m.id] = 0; });

  trip.expenses.forEach(exp => {
    const splitMembers = exp.splitAmong;
    if (exp.splitType === 'equal') {
      const share = exp.amount / splitMembers.length;
      splitMembers.forEach(id => {
        balances[id] = (balances[id] || 0) - share;
      });
      balances[exp.paidBy] = (balances[exp.paidBy] || 0) + exp.amount;
    } else if (exp.customSplits) {
      Object.entries(exp.customSplits).forEach(([id, amt]) => {
        balances[id] = (balances[id] || 0) - amt;
      });
      balances[exp.paidBy] = (balances[exp.paidBy] || 0) + exp.amount;
    }
  });

  return balances;
}

export function calculateSettlements(trip: Trip): Settlement[] {
  const balances = calculateBalances(trip);
  const settlements: Settlement[] = [];

  const debtors = Object.entries(balances)
    .filter(([, b]) => b < -0.01)
    .map(([id, b]) => ({ id, amount: -b }))
    .sort((a, b) => b.amount - a.amount);

  const creditors = Object.entries(balances)
    .filter(([, b]) => b > 0.01)
    .map(([id, b]) => ({ id, amount: b }))
    .sort((a, b) => b.amount - a.amount);

  let i = 0, j = 0;
  while (i < debtors.length && j < creditors.length) {
    const amount = Math.min(debtors[i].amount, creditors[j].amount);
    if (amount > 0.01) {
      settlements.push({
        from: debtors[i].id,
        to: creditors[j].id,
        amount: Math.round(amount * 100) / 100,
      });
    }
    debtors[i].amount -= amount;
    creditors[j].amount -= amount;
    if (debtors[i].amount < 0.01) i++;
    if (creditors[j].amount < 0.01) j++;
  }

  return settlements;
}

export function getTotalExpenses(trip: Trip): number {
  return trip.expenses.reduce((sum, e) => sum + e.amount, 0);
}

export function getMemberName(trip: Trip, memberId: string): string {
  return trip.members.find(m => m.id === memberId)?.name || 'Unknown';
}

export function getMemberColor(trip: Trip, memberId: string): string {
  return trip.members.find(m => m.id === memberId)?.color || '#999';
}

export function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}
