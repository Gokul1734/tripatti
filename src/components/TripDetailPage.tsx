import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { FullTrip } from '@/hooks/useTrips';
import { supabase } from '@/integrations/supabase/client';
import { MEMBER_COLORS } from '@/types/trip';
import { sounds } from '@/lib/sounds';
import { toast } from 'sonner';
import { Users, ArrowLeft, Wallet, TrendingUp, TrendingDown, ArrowRight, Send, HandCoins, Copy, Check, Share2, Trash, Clock } from 'lucide-react';

interface TripDetailPageProps {
  trip: FullTrip;
  onBack: () => void;
  onAddExpense: () => void;
  onSettle: () => void;
  onRefetch: () => void;
  onEditExpense?: (expense: any) => void;
}

export default function TripDetailPage({ trip, onBack, onAddExpense, onSettle, onEditExpense, onRefetch }: TripDetailPageProps) {
  const { user } = useAuth();
  const [showAddMember, setShowAddMember] = useState(false);
  const [selectedMember, setSelectedMember] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // remove global summary to keep UI minimal

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

  // We'll compute per-member totals (toPay / toReceive) from expense splits
  const toPay: Record<string, number> = {};
  const toReceive: Record<string, number> = {};
  trip.members.forEach(m => { toPay[m.id] = 0; toReceive[m.id] = 0; });

  trip.expenses.forEach(exp => {
    const splitMemberIds = exp.splits.map((s: any) => s.member_id);
    if (splitMemberIds.length > 0) {
      const share = Number(exp.amount) / splitMemberIds.length;
      splitMemberIds.forEach((id: string) => {
        if (id !== exp.paid_by_member_id) {
          toPay[id] = (toPay[id] || 0) + share;
          toReceive[exp.paid_by_member_id] = (toReceive[exp.paid_by_member_id] || 0) + share;
        }
      });
    }
  });

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

  // expanded expense for showing split contributions inline
  const [expandedExpenseId, setExpandedExpenseId] = useState<string | null>(null);

  const currentMemberId = trip.members.find(m => m.user_id === user?.id)?.id || null;

  // Compute per-member totals including payments (pending / confirmed)
  const memberTotals = trip.members.reduce((acc: Record<string, any>, m) => {
    acc[m.id] = { oweTotal: 0, receiveTotal: 0, paidMarkedByMe: 0, receivedConfirmed: 0, pendingReceived: 0 };
    return acc;
  }, {} as Record<string, any>);

  // sum expenses
  trip.expenses.forEach(exp => {
    const splitCount = exp.splits?.length || 0;
    if (splitCount === 0) return;
    const share = Number(exp.amount) / splitCount;
    exp.splits.forEach((s: any) => {
      if (s.member_id === exp.paid_by_member_id) return; // payer doesn't owe themselves
      memberTotals[s.member_id].oweTotal += share;
      memberTotals[exp.paid_by_member_id].receiveTotal += share;
    });
  });

  // incorporate payments
  trip.payments.forEach(p => {
    // payer marked as paid
    if (p.confirmed_by_payer) {
      memberTotals[p.from_member_id].paidMarkedByMe = (memberTotals[p.from_member_id].paidMarkedByMe || 0) + Number(p.amount || 0);
      // if receiver hasn't confirmed, count as pending for receiver
      if (!p.confirmed_by_receiver) memberTotals[p.to_member_id].pendingReceived = (memberTotals[p.to_member_id].pendingReceived || 0) + Number(p.amount || 0);
    }
    // receiver confirmed
    if (p.confirmed_by_receiver) {
      memberTotals[p.to_member_id].receivedConfirmed = (memberTotals[p.to_member_id].receivedConfirmed || 0) + Number(p.amount || 0);
    }
  });

  const outstandingToPay = (memberId: string) => Math.max(0, (memberTotals[memberId]?.oweTotal || 0) - (memberTotals[memberId]?.paidMarkedByMe || 0));
  const outstandingToReceive = (memberId: string) => Math.max(0, (memberTotals[memberId]?.receiveTotal || 0) - (memberTotals[memberId]?.receivedConfirmed || 0));

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
        {/* Minimal members & settlements view: show first name and simple to-pay / to-receive totals */}

        {/* Members */}
        <div className="mb-5 animate-fade-in stagger-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-sm font-semibold text-foreground">Members</h2>
            <button onClick={() => { sounds.tap(); onAddExpense(); }} className="press-effect rounded-xl bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">Add Expense</button>
          </div>
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            {trip.members.map(member => {
              const shortName = (member.name || '').split(' ')[0];
              const pay = outstandingToPay(member.id);
              const recv = outstandingToReceive(member.id);
              const pendingPaid = memberTotals[member.id]?.paidMarkedByMe || 0;
              const pendingRecv = memberTotals[member.id]?.pendingReceived || 0;
              const isSelected = selectedMember === member.id;
              return (
                <button
                  key={member.id}
                  onClick={() => { sounds.tap(); /* plain selection disabled for simplicity */ }}
                  className={`press-effect flex min-w-[120px] flex-col items-center gap-2 rounded-2xl bg-card p-3 shadow-card transition-all text-left
                    ${isSelected ? 'ring-2 ring-primary scale-105' : ''}`}
                >
                  <div className="flex items-center w-full gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-primary-foreground" style={{ backgroundColor: member.color }}>
                      {shortName.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-foreground">{shortName}</div>
                      <div className="text-[11px] text-muted-foreground">&nbsp;</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 mt-1 w-full">
                    <div className="flex-1 text-[12px] text-red-500">Pay {formatCurrency(pay)}</div>
                    <div className="flex-1 text-[12px] text-emerald-600 text-right">Get {formatCurrency(recv)}</div>
                  </div>
                  <div className="mt-1 flex items-center gap-2 w-full">
                    {pendingPaid > 0 && (
                      <div className="text-[11px] rounded-full bg-amber-100 px-2 py-0.5 text-amber-700">Pending pay {formatCurrency(pendingPaid)}</div>
                    )}
                    {pendingRecv > 0 && (
                      <div className="ml-auto text-[11px] rounded-full bg-amber-100 px-2 py-0.5 text-amber-700">Pending recv {formatCurrency(pendingRecv)}</div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Member detail removed per latest request; only members and expenses shown */}
        {/* Expenses — show all expenses in a clean card list */}
        <div className="mt-4">
          <h2 className="mb-3 font-display text-sm font-semibold text-foreground">Expenses</h2>
          {trip.expenses.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Wallet size={40} strokeWidth={1.2} className="mb-2 text-accent animate-float" />
              <p className="text-sm">No expenses yet</p>
              <button onClick={() => { sounds.tap(); onAddExpense(); }} className="press-effect mt-3 rounded-xl bg-primary px-5 py-2 text-sm font-medium text-primary-foreground">
                Add Expense
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {[...trip.expenses].sort((a: any, b: any) => (b.created_at || 0) - (a.created_at || 0)).map((exp: any) => {
                const payer = trip.members.find(m => m.id === exp.paid_by_member_id);
                const splitCount = exp.splits?.length || 0;
                const shortPayer = payer ? (payer.name || '').split(' ')[0] : 'Someone';
                return (
                  <div key={exp.id} className="flex flex-col gap-2">
                    <div className="flex items-center gap-3 rounded-2xl bg-card p-3 shadow-card">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full text-lg font-bold text-primary-foreground" style={{ backgroundColor: payer?.color || '#ccc' }}>
                        {shortPayer.charAt(0).toUpperCase()}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{exp.description}</p>
                            <p className="text-[12px] text-muted-foreground mt-1">Paid by {shortPayer}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            {user && exp.created_by === user.id && onEditExpense && (
                              <button onClick={() => { sounds.tap(); onEditExpense!(exp); }} className="press-effect rounded-xl bg-secondary px-3 py-1 text-xs font-semibold text-foreground">Edit</button>
                            )}
                            <div className="ml-1 rounded-lg border border-border px-2 py-0.5 text-xs text-muted-foreground font-medium">{splitCount}/{trip.members.length}</div>
                            {/* Delete allowed only for creator */}
                            {user && exp.created_by === user.id && (
                              <button onClick={async () => {
                                if (!confirm('Delete this expense? This cannot be undone.')) return;
                                try {
                                  sounds.tap();
                                  await supabase.from('expense_splits').delete().eq('expense_id', exp.id);
                                  await supabase.from('expenses').delete().eq('id', exp.id);
                                  toast.success('Deleted expense');
                                  await onRefetch();
                                } catch (err) {
                                  toast.error('Failed to delete');
                                }
                              }} className="press-effect ml-2 rounded-xl bg-destructive px-3 py-1 text-xs font-semibold text-primary-foreground">
                                <Trash size={14} />
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="mt-2 text-sm font-semibold text-foreground">{formatCurrency(Number(exp.amount))}</div>
                      </div>
                      <div className="ml-2 flex flex-col items-end gap-2">
                        <button onClick={() => setExpandedExpenseId(expandedExpenseId === exp.id ? null : exp.id)} className="press-effect rounded-xl bg-secondary px-3 py-1 text-xs font-semibold text-foreground">
                          {expandedExpenseId === exp.id ? 'Close' : 'Details'}
                        </button>
                      </div>
                    </div>
                    {expandedExpenseId === exp.id && (
                      <div className="mt-2 mb-2 rounded-2xl bg-muted/40 p-3">
                        <p className="text-xs text-muted-foreground mb-2">Split contributions</p>
                        <div className="flex flex-col gap-2">
                          {exp.splits.map((s: any) => {
                            const member = trip.members.find(m => m.id === s.member_id);
                            const share = Number(exp.amount) / (exp.splits?.length || 1);
                            // find a payment record between this member and payer for this trip that is not fully completed
                            const payment = trip.payments.find((p: any) => p.from_member_id === s.member_id && p.to_member_id === exp.paid_by_member_id && !(p.confirmed_by_payer && p.confirmed_by_receiver));
                            const completed = trip.payments.find((p: any) => p.from_member_id === s.member_id && p.to_member_id === exp.paid_by_member_id && p.confirmed_by_payer && p.confirmed_by_receiver);

                            return (
                              <div key={s.id || s.member_id} className="flex items-center justify-between gap-3 rounded-lg bg-card p-2">
                                <div className="flex items-center gap-3">
                                  <div className="h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold text-primary-foreground" style={{ backgroundColor: member?.color }}>
                                    {member?.name?.charAt(0).toUpperCase()}
                                  </div>
                                  <div>
                                    <div className="text-sm font-medium text-foreground">{member?.name}</div>
                                    <div className="text-[11px] text-muted-foreground">{formatCurrency(share)}</div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  {s.member_id === exp.paid_by_member_id ? (
                                    <div className="text-xs text-muted-foreground">Payer</div>
                                  ) : completed ? (
                                    <div className="flex items-center gap-1 text-[12px] text-emerald-600"><Check size={12} /> Settled</div>
                                  ) : payment ? (
                                    <div className="flex items-center gap-2">
                                      {payment.confirmed_by_payer && !payment.confirmed_by_receiver && currentMemberId === exp.paid_by_member_id && (
                                        <button onClick={async () => {
                                          try {
                                            sounds.success();
                                            await supabase.from('payments').update({ confirmed_by_receiver: true }).eq('id', payment.id);
                                            toast.success('Confirmed received');
                                            await onRefetch();
                                          } catch (err) { toast.error('Failed'); }
                                        }} className="press-effect rounded-xl bg-emerald-600 px-3 py-1 text-xs font-semibold text-primary-foreground">Confirm</button>
                                      )}
                                      {!payment.confirmed_by_payer && payment.confirmed_by_receiver && currentMemberId === s.member_id && (
                                        <button onClick={async () => {
                                          try { sounds.success(); await supabase.from('payments').update({ confirmed_by_payer: true }).eq('id', payment.id); toast.success('Confirmed paid'); await onRefetch(); } catch (err) { toast.error('Failed'); }
                                        }} className="press-effect rounded-xl bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">Confirm Paid</button>
                                      )}
                                      <div className="text-xs text-muted-foreground">Pending</div>
                                    </div>
                                  ) : (
                                    // show Mark as Paid only to the owing member
                                    currentMemberId === s.member_id ? (
                                      <button onClick={async () => {
                                        try {
                                          sounds.success();
                                          // create or mark payment
                                          const existing = trip.payments.find((p: any) => p.from_member_id === s.member_id && p.to_member_id === exp.paid_by_member_id && !(p.confirmed_by_payer && p.confirmed_by_receiver));
                                          if (existing) {
                                            await supabase.from('payments').update({ confirmed_by_payer: true }).eq('id', existing.id);
                                          } else {
                                            await supabase.from('payments').insert({
                                              trip_id: trip.id,
                                              from_member_id: s.member_id,
                                              to_member_id: exp.paid_by_member_id,
                                              amount: share,
                                              confirmed_by_payer: true,
                                              confirmed_by_receiver: false,
                                            });
                                          }
                                          toast.success('Marked as paid');
                                          await onRefetch();
                                        } catch (err) { toast.error('Failed'); }
                                      }} className="press-effect rounded-xl bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">Mark Paid</button>
                                    ) : (
                                      <div className="text-xs text-muted-foreground">Waiting</div>
                                    )
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
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
