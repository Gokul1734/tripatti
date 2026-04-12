import { useState } from 'react';
import { useApp } from '@/store/AppContext';
import { CATEGORIES, MEMBER_COLORS, TripMember } from '@/types/trip';
import { calculateBalances, calculateSettlements, getTotalExpenses, formatCurrency, getMemberName, getMemberColor } from '@/lib/calculations';
import { sounds } from '@/lib/sounds';
import { Users, Plus, ArrowLeft, Wallet, TrendingUp, TrendingDown } from 'lucide-react';

export default function TripDetailPage() {
  const { state, dispatch, currentTrip } = useApp();
  const [showAddMember, setShowAddMember] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');

  if (!currentTrip) return null;

  const total = getTotalExpenses(currentTrip);
  const balances = calculateBalances(currentTrip);
  const perPerson = currentTrip.members.length > 0 ? total / currentTrip.members.length : 0;

  const addMember = () => {
    if (!newMemberName.trim()) return;
    sounds.add();
    const member: TripMember = {
      id: crypto.randomUUID(),
      name: newMemberName.trim(),
      color: MEMBER_COLORS[currentTrip.members.length % MEMBER_COLORS.length],
    };
    dispatch({ type: 'ADD_MEMBER', tripId: currentTrip.id, member });
    setNewMemberName('');
    setShowAddMember(false);
  };

  return (
    <div className="flex flex-1 flex-col px-5 pb-24 pt-4 safe-top">
      {/* Header */}
      <div className="mb-5 flex items-center gap-3 animate-slide-down">
        <button
          onClick={() => {
            sounds.navigate();
            dispatch({ type: 'SET_TAB', tab: 'trips' });
          }}
          className="press-effect flex h-9 w-9 items-center justify-center rounded-xl bg-secondary"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <h1 className="font-display text-xl font-bold text-foreground">
            {currentTrip.emoji} {currentTrip.name}
          </h1>
          <p className="text-xs text-muted-foreground">{currentTrip.members.length} travelers</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="mb-5 grid grid-cols-2 gap-3 animate-fade-in">
        <div className="rounded-2xl bg-primary p-4 text-primary-foreground shadow-card">
          <Wallet size={18} className="mb-1 opacity-70" />
          <p className="text-[10px] uppercase tracking-wider opacity-70">Total Spent</p>
          <p className="font-display text-xl font-bold animate-count-up">
            {formatCurrency(total, currentTrip.currency)}
          </p>
        </div>
        <div className="rounded-2xl bg-card p-4 shadow-card">
          <Users size={18} className="mb-1 text-accent" />
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Per Person</p>
          <p className="font-display text-xl font-bold text-foreground animate-count-up">
            {formatCurrency(perPerson, currentTrip.currency)}
          </p>
        </div>
      </div>

      {/* Members */}
      <div className="mb-5 animate-fade-in stagger-2">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-sm font-semibold text-foreground">Members</h2>
          <button
            onClick={() => { sounds.tap(); setShowAddMember(true); }}
            className="press-effect flex items-center gap-1 rounded-lg bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground"
          >
            <Plus size={14} /> Add
          </button>
        </div>

        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {currentTrip.members.map(member => {
            const balance = balances[member.id] || 0;
            return (
              <div
                key={member.id}
                className="flex min-w-[100px] flex-col items-center gap-1 rounded-2xl bg-card p-3 shadow-card"
              >
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-primary-foreground"
                  style={{ backgroundColor: member.color }}
                >
                  {member.name.charAt(0).toUpperCase()}
                </div>
                <p className="text-xs font-medium text-foreground truncate max-w-[80px]">{member.name}</p>
                <div className={`flex items-center gap-0.5 text-[11px] font-semibold ${balance >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                  {balance >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                  {formatCurrency(Math.abs(balance), currentTrip.currency)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Expenses */}
      <div className="animate-fade-in stagger-3">
        <h2 className="mb-3 font-display text-sm font-semibold text-foreground">Recent Expenses</h2>
        {currentTrip.expenses.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <Receipt size={40} strokeWidth={1.2} className="mb-2 text-accent animate-float" />
            <p className="text-sm">No expenses yet</p>
            <button
              onClick={() => {
                sounds.tap();
                dispatch({ type: 'SET_TAB', tab: 'add' });
              }}
              className="press-effect mt-3 rounded-xl bg-primary px-5 py-2 text-sm font-medium text-primary-foreground"
            >
              Add First Expense
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {[...currentTrip.expenses].reverse().map((exp, i) => {
              const cat = CATEGORIES.find(c => c.id === exp.category);
              return (
                <div
                  key={exp.id}
                  className={`flex items-center gap-3 rounded-2xl bg-card p-3 shadow-card animate-fade-in stagger-${Math.min(i + 1, 5)}`}
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-lg">
                    {cat?.emoji || '📦'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{exp.description}</p>
                    <p className="text-[11px] text-muted-foreground">
                      Paid by {getMemberName(currentTrip, exp.paidBy)} · {exp.splitAmong.length} split
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-foreground">
                      {formatCurrency(exp.amount, currentTrip.currency)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Member Modal */}
      {showAddMember && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/30" onClick={() => setShowAddMember(false)}>
          <div className="w-full max-w-[430px] rounded-t-3xl bg-card px-6 pb-8 pt-4 animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-border" />
            <h2 className="font-display text-lg font-bold mb-4">Add Member</h2>
            <input
              value={newMemberName}
              onChange={e => setNewMemberName(e.target.value)}
              placeholder="Member name"
              autoFocus
              className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all mb-4"
            />
            <button
              onClick={addMember}
              disabled={!newMemberName.trim()}
              className="press-effect w-full rounded-xl bg-primary py-3.5 font-semibold text-primary-foreground disabled:opacity-40"
            >
              Add Member
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Receipt(props: any) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={props.size || 24} height={props.size || 24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={props.strokeWidth || 2} strokeLinecap="round" strokeLinejoin="round" className={props.className}><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><path d="M12 17.5v-11"/></svg>
  );
}
