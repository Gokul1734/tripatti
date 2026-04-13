import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { FullTrip } from '@/hooks/useTrips';
import { supabase } from '@/integrations/supabase/client';
import { MEMBER_COLORS } from '@/types/trip';
import { sounds } from '@/lib/sounds';
import { toast } from 'sonner';
import { Users, ArrowLeft, Wallet, TrendingUp, TrendingDown, ArrowRight, Send, HandCoins, Copy, Check, Share2 } from 'lucide-react';

interface TripDetailPageProps {
  trip: FullTrip;
  onBack: () => void;
  onAddExpense: () => void;
  onSettle: () => void;
  onRefetch: () => void;
}

export default function TripDetailPage({ trip, onBack, onAddExpense, onSettle, onRefetch }: TripDetailPageProps) {
  const { user } = useAuth();
  const [showAddMember, setShowAddMember] = useState(false);
  const [selectedMember, setSelectedMember] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const total = trip.expenses.reduce((s, e) => s + Number(e.amount), 0);
  const perPerson = trip.members.length > 0 ? total / trip.members.length : 0;

  // Calculate balances from DB data
  const balances: Record<string, number> = {};
  trip.members.forEach(m => { balances[m.id] = 0; });

  trip.expenses.forEach(exp => {
    const splitMemberIds = exp.splits.map(s => s.member_id);
    if (splitMemberIds.length > 0) {
      const share = Number(exp.amount) / splitMemberIds.length;
      splitMemberIds.forEach(id => { balances[id] = (balances[id] || 0) - share; });
      balances[exp.paid_by_member_id] = (balances[exp.paid_by_member_id] || 0) + Number(exp.amount);
    }
  });

  // Calculate settlements
  const debtors = Object.entries(balances)
    .filter(([, b]) => b < -0.01)
    .map(([id, b]) => ({ id, amount: -b }))
    .sort((a, b) => b.amount - a.amount);

  const creditors = Object.entries(balances)
    .filter(([, b]) => b > 0.01)
    .map(([id, b]) => ({ id, amount: b }))
    .sort((a, b) => b.amount - a.amount);

  const settlements: { from: string; to: string; amount: number }[] = [];
  let di = 0, ci = 0;
  const ds = [...debtors], cs = [...creditors];
  while (di < ds.length && ci < cs.length) {
    const amt = Math.min(ds[di].amount, cs[ci].amount);
    if (amt > 0.01) settlements.push({ from: ds[di].id, to: cs[ci].id, amount: Math.round(amt * 100) / 100 });
    ds[di].amount -= amt;
    cs[ci].amount -= amt;
    if (ds[di].amount < 0.01) di++;
    if (cs[ci].amount < 0.01) ci++;
  }

  const getMemberName = (id: string) => trip.members.find(m => m.id === id)?.name || 'Unknown';
  const getMemberColor = (id: string) => trip.members.find(m => m.id === id)?.color || '#999';

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: trip.currency, minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(amount);

  const copyCode = () => {
    navigator.clipboard.writeText(trip.invite_code);
    setCopied(true);
    sounds.tap();
    toast.success('Trip code copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  const selectedMemberData = selectedMember ? trip.members.find(m => m.id === selectedMember) : null;
  const memberSettlements = selectedMember ? settlements.filter(s => s.from === selectedMember || s.to === selectedMember) : [];
  const memberBalance = selectedMember ? (balances[selectedMember] || 0) : 0;
  const memberExpenses = selectedMember
    ? trip.expenses.filter(e => e.paid_by_member_id === selectedMember || e.splits.some(s => s.member_id === selectedMember))
    : [];

  const CATEGORIES: Record<string, { emoji: string; label: string }> = {
    food: { emoji: '🍽️', label: 'Food' },
    transport: { emoji: '🚗', label: 'Transport' },
    stay: { emoji: '🏨', label: 'Stay' },
    activity: { emoji: '🎯', label: 'Activity' },
    shopping: { emoji: '🛍️', label: 'Shopping' },
    other: { emoji: '📦', label: 'Other' },
  };

  return (
    <div className="flex flex-1 flex-col safe-top">
      <div className="flex-shrink-0 px-5 pt-4 mb-5">
        <div className="flex items-center gap-3 animate-slide-down">
          <button onClick={() => { sounds.navigate(); onBack(); }} className="press-effect flex h-9 w-9 items-center justify-center rounded-xl bg-secondary">
            <ArrowLeft size={18} />
          </button>
          <div className="flex-1">
            <h1 className="font-display text-xl font-bold text-foreground">
              {trip.emoji} {trip.name}
            </h1>
            <p className="text-xs text-muted-foreground">{trip.members.length} travelers</p>
          </div>
          <button onClick={copyCode} className="press-effect flex items-center gap-1.5 rounded-xl bg-secondary px-3 py-2 text-xs font-medium">
            <Share2 size={14} />
            {trip.invite_code}
            {copied ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-24">
        {/* Summary Cards */}
        <div className="mb-5 grid grid-cols-2 gap-3 animate-fade-in">
          <div className="rounded-2xl bg-primary p-4 text-primary-foreground shadow-card">
            <Wallet size={18} className="mb-1 opacity-70" />
            <p className="text-[10px] uppercase tracking-wider opacity-70">Total Spent</p>
            <p className="font-display text-xl font-bold animate-count-up">{formatCurrency(total)}</p>
          </div>
          <div className="rounded-2xl bg-card p-4 shadow-card">
            <Users size={18} className="mb-1 text-accent" />
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Per Person</p>
            <p className="font-display text-xl font-bold text-foreground animate-count-up">{formatCurrency(perPerson)}</p>
          </div>
        </div>

        {/* Members */}
        <div className="mb-5 animate-fade-in stagger-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-sm font-semibold text-foreground">Members</h2>
          </div>
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            {trip.members.map(member => {
              const balance = balances[member.id] || 0;
              const isSelected = selectedMember === member.id;
              return (
                <button
                  key={member.id}
                  onClick={() => { sounds.tap(); setSelectedMember(isSelected ? null : member.id); }}
                  className={`press-effect flex min-w-[100px] flex-col items-center gap-1 rounded-2xl bg-card p-3 shadow-card transition-all
                    ${isSelected ? 'ring-2 ring-primary scale-105' : ''}`}
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-primary-foreground" style={{ backgroundColor: member.color }}>
                    {member.name.charAt(0).toUpperCase()}
                  </div>
                  <p className="text-xs font-medium text-foreground truncate max-w-[80px]">{member.name}</p>
                  <div className={`flex items-center gap-0.5 text-[11px] font-semibold ${balance >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                    {balance >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                    {formatCurrency(Math.abs(balance))}
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
                <div className="flex h-12 w-12 items-center justify-center rounded-full text-base font-bold text-primary-foreground" style={{ backgroundColor: selectedMemberData.color }}>
                  {selectedMemberData.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <p className="font-display text-base font-bold text-foreground">{selectedMemberData.name}</p>
                  <p className={`text-sm font-semibold ${memberBalance >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                    {memberBalance >= 0 ? 'Gets back' : 'Owes'} {formatCurrency(Math.abs(memberBalance))}
                  </p>
                </div>
              </div>
            </div>
            {memberSettlements.length > 0 ? (
              <div className="p-4">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-3 font-semibold">Pay / Request</p>
                <div className="flex flex-col gap-2">
                  {memberSettlements.map((s, i) => {
                    const isOwing = s.from === selectedMember;
                    const otherName = isOwing ? getMemberName(s.to) : getMemberName(s.from);
                    const otherColor = isOwing ? getMemberColor(s.to) : getMemberColor(s.from);
                    return (
                      <div key={i} className="flex items-center gap-3 rounded-xl bg-secondary/50 p-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-primary-foreground" style={{ backgroundColor: otherColor }}>
                          {otherName.charAt(0)}
                        </div>
                        <div className="flex-1">
                          <p className="text-xs font-medium text-foreground">{otherName}</p>
                          <p className="text-[10px] text-muted-foreground">{isOwing ? 'You need to pay' : 'Needs to pay you'}</p>
                        </div>
                            <div className="flex items-center gap-2">
                              <p className={`text-sm font-bold ${isOwing ? 'text-red-500' : 'text-emerald-600'}`}>{formatCurrency(s.amount)}</p>
                              {isOwing ? (
                                <button onClick={() => { sounds.tap(); onSettle(); }} className="press-effect flex items-center gap-1 rounded-lg bg-primary px-2.5 py-1.5 text-[10px] font-semibold text-primary-foreground">
                                  <Send size={10} />
                                  Pay
                                </button>
                              ) : (
                                <button
                                  onClick={async () => {
                                    // Request payment: notify the debtor (s.from)
                                    sounds.tap();
                                    try {
                                      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
                                      await fetch(`https://${projectId}.supabase.co/functions/v1/push-notifications`, {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({
                                          action: 'send-notification-to-user',
                                          tripId: trip.id,
                                          toUserId: s.from,
                                          title: `🔔 Payment request in ${trip.name}`,
                                          message: `${getMemberName(selectedMember || '')} requested ${formatCurrency(s.amount)} from ${getMemberName(s.from)}`,
                                          excludeUserId: user?.id,
                                        }),
                                      });
                                    } catch (err) {
                                      // ignore failures for now
                                    }

                                    // keep existing behavior (open settle flow)
                                    onSettle();
                                  }}
                                  className="press-effect flex items-center gap-1 rounded-lg bg-primary px-2.5 py-1.5 text-[10px] font-semibold text-primary-foreground"
                                >
                                  <HandCoins size={10} />
                                  Request
                                </button>
                              )}
                            </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="p-4 text-center text-xs text-muted-foreground">No pending settlements</div>
            )}
          </div>
        )}

        {/* Expenses */}
        <div className="animate-fade-in stagger-3">
          <h2 className="mb-3 font-display text-sm font-semibold text-foreground">
            {selectedMember ? `${selectedMemberData?.name}'s Expenses` : 'Recent Expenses'}
          </h2>
          {(selectedMember ? memberExpenses : trip.expenses).length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Wallet size={40} strokeWidth={1.2} className="mb-2 text-accent animate-float" />
              <p className="text-sm">No expenses yet</p>
              <button onClick={() => { sounds.tap(); onAddExpense(); }} className="press-effect mt-3 rounded-xl bg-primary px-5 py-2 text-sm font-medium text-primary-foreground">
                Add First Expense
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {[...(selectedMember ? memberExpenses : trip.expenses)].reverse().map((exp, i) => {
                const cat = CATEGORIES[exp.category] || CATEGORIES.other;
                return (
                  <div key={exp.id} className={`flex items-center gap-3 rounded-2xl bg-card p-3 shadow-card animate-fade-in stagger-${Math.min(i + 1, 5)}`}>
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-lg">{cat.emoji}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{exp.description}</p>
                      <p className="text-[11px] text-muted-foreground">
                        Paid by {getMemberName(exp.paid_by_member_id)} · {exp.splits.length} split
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-foreground">{formatCurrency(Number(exp.amount))}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
