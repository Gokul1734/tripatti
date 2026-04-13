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

  const selectedMemberData = selectedMember ? trip.members.find(m => m.id === selectedMember) : null;

  // Build pendings for selected member: what they owe and what others owe them
  const oweItems: Array<any> = [];
  const receiveItems: Array<any> = [];
  if (selectedMember) {
    trip.expenses.forEach(exp => {
      const splitCount = exp.splits?.length || 0;
      if (splitCount === 0) return;
      const perShare = Number(exp.amount) / splitCount;
      exp.splits.forEach((s: any) => {
        // selected member owes someone
        if (s.member_id === selectedMember && exp.paid_by_member_id !== selectedMember) {
          const payment = trip.payments.find((p: any) => p.from_member_id === s.member_id && p.to_member_id === exp.paid_by_member_id && Number(p.amount) === Number(perShare));
          oweItems.push({ expenseId: exp.id, to: exp.paid_by_member_id, amount: perShare, payment, description: exp.description });
        }
        // others owe selected member
        if (exp.paid_by_member_id === selectedMember && s.member_id !== selectedMember) {
          const payment = trip.payments.find((p: any) => p.from_member_id === s.member_id && p.to_member_id === exp.paid_by_member_id && Number(p.amount) === Number(perShare));
          receiveItems.push({ expenseId: exp.id, from: s.member_id, amount: perShare, payment, description: exp.description });
        }
      });
    });
  }

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
          </div>
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            {trip.members.map(member => {
              const shortName = (member.name || '').split(' ')[0];
              const pay = toPay[member.id] || 0;
              const recv = toReceive[member.id] || 0;
              const isSelected = selectedMember === member.id;
              return (
                <button
                  key={member.id}
                  onClick={() => { sounds.tap(); setSelectedMember(isSelected ? null : member.id); }}
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
                </button>
              );
            })}
          </div>
        </div>

        {/* Member Detail Panel (simplified pendings view) */}
        {selectedMemberData && (
          <div className="mb-5 rounded-2xl bg-card shadow-card overflow-hidden animate-fade-in">
            <div className="p-4 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full text-base font-bold text-primary-foreground" style={{ backgroundColor: selectedMemberData.color }}>
                  {selectedMemberData.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <p className="font-display text-base font-bold text-foreground">{(selectedMemberData.name || '').split(' ')[0]}</p>
                </div>
              </div>
            </div>

            <div className="p-4">
              <div className="mb-3">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 font-semibold">To Pay</p>
                {oweItems.length === 0 ? (
                  <div className="text-xs text-muted-foreground">Nothing to pay</div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {oweItems.map((it, idx) => {
                      const other = trip.members.find(m => m.id === it.to);
                      const short = other ? (other.name || '').split(' ')[0] : 'Unknown';
                      const isSelf = user && selectedMemberData.user_id === user.id; // selected user is me
                      const paid = it.payment && it.payment.confirmed_by_payer && it.payment.confirmed_by_receiver;
                      const waiting = it.payment && it.payment.confirmed_by_payer && !it.payment.confirmed_by_receiver;
                      return (
                        <div key={idx} className="flex items-center justify-between rounded-lg bg-secondary/40 p-3">
                          <div>
                            <div className="text-sm font-medium text-foreground">Pay {short}</div>
                            <div className="text-[11px] text-muted-foreground">{it.description}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-semibold text-red-500">{formatCurrency(it.amount)}</div>
                            <div className="mt-2">
                              {paid ? (
                                <span className="text-[12px] text-emerald-600 font-semibold">Paid ✓</span>
                              ) : waiting ? (
                                <span className="text-[12px] text-amber-600">Awaiting confirmation</span>
                              ) : isSelf ? (
                                <button className="press-effect rounded-xl bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground" onClick={async () => {
                                  try {
                                    await supabase.from('payments').insert({
                                      trip_id: trip.id,
                                      from_member_id: selectedMember,
                                      to_member_id: it.to,
                                      amount: it.amount,
                                      confirmed_by_payer: true,
                                      confirmed_by_receiver: false,
                                    });
                                    sounds.success();
                                    toast.success('Marked as paid');
                                    await onRefetch();
                                  } catch {
                                    toast.error('Failed to mark paid');
                                  }
                                }}>Mark Paid</button>
                              ) : (
                                <span className="text-[12px] text-muted-foreground">—</span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 font-semibold">To Receive</p>
                {receiveItems.length === 0 ? (
                  <div className="text-xs text-muted-foreground">Nothing to receive</div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {receiveItems.map((it, idx) => {
                      const other = trip.members.find(m => m.id === it.from);
                      const short = other ? (other.name || '').split(' ')[0] : 'Unknown';
                      const isPayerUser = user && selectedMemberData.user_id === user.id; // selected member is me (payer)
                      const paid = it.payment && it.payment.confirmed_by_payer && it.payment.confirmed_by_receiver;
                      const waiting = it.payment && it.payment.confirmed_by_payer && !it.payment.confirmed_by_receiver;
                      return (
                        <div key={idx} className="flex items-center justify-between rounded-lg bg-secondary/40 p-3">
                          <div>
                            <div className="text-sm font-medium text-foreground">From {short}</div>
                            <div className="text-[11px] text-muted-foreground">{it.description}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-semibold text-emerald-600">{formatCurrency(it.amount)}</div>
                            <div className="mt-2">
                              {paid ? (
                                <span className="text-[12px] text-emerald-600 font-semibold">Paid ✓</span>
                              ) : waiting ? (
                                isPayerUser ? (
                                  <button className="press-effect rounded-xl bg-emerald-600 px-3 py-1 text-xs font-semibold text-primary-foreground" onClick={async () => {
                                    try {
                                      await supabase.from('payments').update({ confirmed_by_receiver: true }).eq('id', it.payment.id);
                                      // clear split
                                      await supabase.from('expense_splits').delete().eq('expense_id', it.expenseId).eq('member_id', it.from);
                                      sounds.success();
                                      toast.success('Payment confirmed and split cleared');
                                      await onRefetch();
                                    } catch {
                                      toast.error('Failed to confirm');
                                    }
                                  }}>Confirm Received</button>
                                ) : (
                                  <span className="text-[12px] text-amber-600">Awaiting confirmation</span>
                                )
                              ) : (
                                <span className="text-[12px] text-muted-foreground">—</span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Expenses list removed to keep UI minimal - members & pendings only */}
      </div>
    </div>
  );
}
