import { useState } from 'react';
import { useApp } from '@/store/AppContext';
import { CATEGORIES, MEMBER_COLORS, TripMember } from '@/types/trip';
import { calculateBalances, calculateSettlements, getTotalExpenses, formatCurrency, getMemberName, getMemberColor } from '@/lib/calculations';
import { sounds } from '@/lib/sounds';
import { Users, Plus, ArrowLeft, Wallet, TrendingUp, TrendingDown, ArrowRight, Send, HandCoins } from 'lucide-react';

export default function TripDetailPage() {
  const { state, dispatch, currentTrip } = useApp();
  const [showAddMember, setShowAddMember] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');
  const [selectedMember, setSelectedMember] = useState<string | null>(null);

  if (!currentTrip) return null;

  const total = getTotalExpenses(currentTrip);
  const balances = calculateBalances(currentTrip);
  const settlements = calculateSettlements(currentTrip);
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

  // Get settlements involving the selected member
  const getMemberSettlements = (memberId: string) => {
    return settlements.filter(s => s.from === memberId || s.to === memberId);
  };

  const selectedMemberData = selectedMember ? currentTrip.members.find(m => m.id === selectedMember) : null;
  const memberSettlements = selectedMember ? getMemberSettlements(selectedMember) : [];
  const memberBalance = selectedMember ? (balances[selectedMember] || 0) : 0;

  // Member expenses
  const memberExpenses = selectedMember
    ? currentTrip.expenses.filter(e => e.paidBy === selectedMember || e.splitAmong.includes(selectedMember))
    : [];

  return (
    <div className="flex flex-1 flex-col safe-top">
      {/* Header */}
      <div className="flex-shrink-0 px-5 pt-4 mb-5">
        <div className="flex items-center gap-3 animate-slide-down">
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
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-24">
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

        {/* Members - Clickable */}
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
              const isSelected = selectedMember === member.id;
              return (
                <button
                  key={member.id}
                  onClick={() => {
                    sounds.tap();
                    setSelectedMember(isSelected ? null : member.id);
                  }}
                  className={`press-effect flex min-w-[100px] flex-col items-center gap-1 rounded-2xl bg-card p-3 shadow-card transition-all
                    ${isSelected ? 'ring-2 ring-primary scale-105' : ''}`}
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
                </button>
              );
            })}
          </div>
        </div>

        {/* Member Detail Panel */}
        {selectedMemberData && (
          <div className="mb-5 rounded-2xl bg-card shadow-card overflow-hidden animate-fade-in">
            <div className="p-4 border-b border-border">
              <div className="flex items-center gap-3">
                <div
                  className="flex h-12 w-12 items-center justify-center rounded-full text-base font-bold text-primary-foreground"
                  style={{ backgroundColor: selectedMemberData.color }}
                >
                  {selectedMemberData.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <p className="font-display text-base font-bold text-foreground">{selectedMemberData.name}</p>
                  <p className={`text-sm font-semibold ${memberBalance >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                    {memberBalance >= 0 ? 'Gets back' : 'Owes'} {formatCurrency(Math.abs(memberBalance), currentTrip.currency)}
                  </p>
                </div>
              </div>
            </div>

            {/* Settlements for this member */}
            {memberSettlements.length > 0 && (
              <div className="p-4">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-3 font-semibold">Pay / Request</p>
                <div className="flex flex-col gap-2">
                  {memberSettlements.map((s, i) => {
                    const isOwing = s.from === selectedMember;
                    const otherName = isOwing ? getMemberName(currentTrip, s.to) : getMemberName(currentTrip, s.from);
                    const otherColor = isOwing ? getMemberColor(currentTrip, s.to) : getMemberColor(currentTrip, s.from);

                    return (
                      <div
                        key={i}
                        className="flex items-center gap-3 rounded-xl bg-secondary/50 p-3"
                      >
                        <div
                          className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-primary-foreground"
                          style={{ backgroundColor: otherColor }}
                        >
                          {otherName.charAt(0)}
                        </div>
                        <div className="flex-1">
                          <p className="text-xs font-medium text-foreground">{otherName}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {isOwing ? 'You need to pay' : 'Needs to pay you'}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <p className={`text-sm font-bold ${isOwing ? 'text-red-500' : 'text-emerald-600'}`}>
                            {formatCurrency(s.amount, currentTrip.currency)}
                          </p>
                          <button
                            onClick={() => {
                              sounds.tap();
                              dispatch({ type: 'SET_TAB', tab: 'settle' });
                            }}
                            className="press-effect flex items-center gap-1 rounded-lg bg-primary px-2.5 py-1.5 text-[10px] font-semibold text-primary-foreground"
                          >
                            {isOwing ? <Send size={10} /> : <HandCoins size={10} />}
                            {isOwing ? 'Pay' : 'Request'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {memberSettlements.length === 0 && (
              <div className="p-4 text-center text-xs text-muted-foreground">
                No pending settlements
              </div>
            )}
          </div>
        )}

        {/* Recent Expenses */}
        <div className="animate-fade-in stagger-3">
          <h2 className="mb-3 font-display text-sm font-semibold text-foreground">
            {selectedMember ? `${selectedMemberData?.name}'s Expenses` : 'Recent Expenses'}
          </h2>
          {(selectedMember ? memberExpenses : currentTrip.expenses).length === 0 ? (
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
              {[...(selectedMember ? memberExpenses : currentTrip.expenses)].reverse().map((exp, i) => {
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
      </div>

      {/* Add Member Modal - Scrollable */}
      {showAddMember && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/30" onClick={() => setShowAddMember(false)}>
          <div
            className="w-full max-w-[430px] max-h-[85vh] flex flex-col rounded-t-3xl bg-card animate-slide-up"
            onClick={e => e.stopPropagation()}
          >
            <div className="px-6 pt-4 pb-2 flex-shrink-0">
              <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-border" />
              <h2 className="font-display text-lg font-bold">Add Member</h2>
            </div>
            <div className="flex-1 overflow-y-auto px-6 pb-8">
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
