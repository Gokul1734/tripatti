import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { FullTrip } from '@/hooks/useTrips';
import { supabase } from '@/integrations/supabase/client';
import { sounds } from '@/lib/sounds';
import { toast } from 'sonner';
import { ArrowLeft, ArrowRight, CheckCircle2, Check, Clock, Send } from 'lucide-react';

interface SettlePageProps {
  trip: FullTrip;
  onBack: () => void;
  onRefetch: () => void;
}

export default function SettlePage({ trip, onBack, onRefetch }: SettlePageProps) {
  const { user } = useAuth();
  const [payingSettlement, setPayingSettlement] = useState<number | null>(null);
  const currentMemberId = trip.members.find(m => m.user_id === user?.id)?.id || null;

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

  const debtors = Object.entries(balances).filter(([, b]) => b < -0.01).map(([id, b]) => ({ id, amount: -b })).sort((a, b) => b.amount - a.amount);
  const creditors = Object.entries(balances).filter(([, b]) => b > 0.01).map(([id, b]) => ({ id, amount: b })).sort((a, b) => b.amount - a.amount);
  const settlements: { from: string; to: string; amount: number }[] = [];
  let di = 0, ci = 0;
  const ds = [...debtors], cs = [...creditors];
  while (di < ds.length && ci < cs.length) {
    const amt = Math.min(ds[di].amount, cs[ci].amount);
    if (amt > 0.01) settlements.push({ from: ds[di].id, to: cs[ci].id, amount: Math.round(amt * 100) / 100 });
    ds[di].amount -= amt; cs[ci].amount -= amt;
    if (ds[di].amount < 0.01) di++;
    if (cs[ci].amount < 0.01) ci++;
  }

  const getMemberName = (id: string) => trip.members.find(m => m.id === id)?.name || 'Unknown';
  const getMemberColor = (id: string) => trip.members.find(m => m.id === id)?.color || '#999';
  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: trip.currency, minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(amount);

  const getPaymentForSettlement = (from: string, to: string) => {
    return trip.payments.find(p => p.from_member_id === from && p.to_member_id === to && !(p.confirmed_by_payer && p.confirmed_by_receiver));
  };

  const getCompletedPayment = (from: string, to: string) => {
    return trip.payments.find(p => p.from_member_id === from && p.to_member_id === to && p.confirmed_by_payer && p.confirmed_by_receiver);
  };

  const handleMarkPaid = async (s: { from: string; to: string; amount: number }) => {
    sounds.success();
    const existing = getPaymentForSettlement(s.from, s.to);
    if (existing) {
      await supabase.from('payments').update({ confirmed_by_payer: true }).eq('id', existing.id);
    } else {
      await supabase.from('payments').insert({
        trip_id: trip.id,
        from_member_id: s.from,
        to_member_id: s.to,
        amount: s.amount,
        confirmed_by_payer: true,
        confirmed_by_receiver: false,
      });
    }

    // Send notification
    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      await fetch(`https://${projectId}.supabase.co/functions/v1/push-notifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send-notification',
          tripId: trip.id,
          title: `✅ Payment in ${trip.name}`,
          message: `${getMemberName(s.from)} marked ${formatCurrency(s.amount)} as paid to ${getMemberName(s.to)}`,
          excludeUserId: user?.id,
        }),
      });
    } catch {}

    toast.success('Marked as paid!');
    setPayingSettlement(null);
    await onRefetch();
  };

  const handleConfirmReceived = async (s: { from: string; to: string }) => {
    sounds.success();
    const existing = getPaymentForSettlement(s.from, s.to);
    if (existing) {
      await supabase.from('payments').update({ confirmed_by_receiver: true }).eq('id', existing.id);
    }
    toast.success('Payment confirmed!');
    await onRefetch();
  };

  return (
    <div className="flex flex-1 flex-col safe-top">
      <div className="flex-shrink-0 px-5 pt-4 mb-5">
        <div className="flex items-center gap-3 animate-slide-down">
          <button onClick={() => { sounds.navigate(); onBack(); }} className="press-effect flex h-9 w-9 items-center justify-center rounded-xl bg-secondary">
            <ArrowLeft size={18} />
          </button>
          <h1 className="font-display text-xl font-bold text-foreground">Settlements</h1>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-24">
        {settlements.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-muted-foreground animate-scale-bounce pt-16">
            <CheckCircle2 size={56} strokeWidth={1.2} className="text-emerald-500" />
            <p className="font-display text-lg font-semibold text-foreground">All Settled Up! 🎉</p>
            <p className="text-sm text-center">No pending payments between group members.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3 animate-fade-in">
            <p className="text-xs text-muted-foreground mb-1">Minimum transfers to settle all debts:</p>
            {settlements.map((s, i) => {
              const fromName = getMemberName(s.from);
              const toName = getMemberName(s.to);
              const fromColor = getMemberColor(s.from);
              const toColor = getMemberColor(s.to);
              const payment = getPaymentForSettlement(s.from, s.to);
              const completed = getCompletedPayment(s.from, s.to);
              const isFullyPaid = !!completed;
              const isPaying = payingSettlement === i;

              return (
                <div key={i} className={`rounded-2xl bg-card shadow-card animate-fade-in stagger-${Math.min(i + 1, 5)} ${isFullyPaid ? 'opacity-60' : ''}`}>
                  <div className="flex items-center gap-3 p-4">
                    <div className="flex flex-col items-center gap-1">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-primary-foreground" style={{ backgroundColor: fromColor }}>
                        {fromName.charAt(0)}
                      </div>
                      <p className="text-[11px] font-medium text-foreground max-w-[60px] truncate">{fromName}</p>
                    </div>
                    <div className="flex flex-1 flex-col items-center gap-0.5">
                      <div className="flex items-center gap-1 text-accent">
                        <div className="h-[1px] flex-1 bg-border" />
                        <ArrowRight size={16} />
                      </div>
                      <p className={`text-sm font-bold ${isFullyPaid ? 'text-emerald-600 line-through' : 'text-primary'}`}>{formatCurrency(s.amount)}</p>
                      <p className="text-[10px] text-muted-foreground">{isFullyPaid ? 'settled ✓' : 'owes'}</p>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-primary-foreground" style={{ backgroundColor: toColor }}>
                        {toName.charAt(0)}
                      </div>
                      <p className="text-[11px] font-medium text-foreground max-w-[60px] truncate">{toName}</p>
                    </div>
                  </div>

                  {!isFullyPaid && (
                    <div className="border-t border-border px-4 py-3">
                          {payment ? (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {payment.confirmed_by_payer && (
                              <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-semibold text-amber-700">
                                <Clock size={10} /> Payer confirmed
                              </span>
                            )}
                            {payment.confirmed_by_receiver && (
                              <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-semibold text-emerald-700">
                                <Check size={10} /> Receiver confirmed
                              </span>
                            )}
                          </div>
                          {/* Restrict CTAs: only the receiver (to) can confirm received, only the payer (from) can confirm paid if that odd state occurs */}
                          {payment.confirmed_by_payer && !payment.confirmed_by_receiver && currentMemberId === s.to && (
                            <button onClick={() => handleConfirmReceived(s)} className="press-effect flex items-center gap-1 rounded-xl bg-emerald-600 px-3 py-1.5 text-[11px] font-semibold text-primary-foreground">
                              <Check size={12} /> Confirm Received
                            </button>
                          )}
                          {!payment.confirmed_by_payer && payment.confirmed_by_receiver && currentMemberId === s.from && (
                            <button onClick={() => handleMarkPaid(s)} className="press-effect flex items-center gap-1 rounded-xl bg-primary px-3 py-1.5 text-[11px] font-semibold text-primary-foreground">
                              <Check size={12} /> Confirm Paid
                            </button>
                          )}
                        </div>
                      ) : isPaying ? (
                        <div className="flex items-center gap-2 animate-fade-in">
                          <button onClick={() => handleMarkPaid(s)} className="press-effect flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-primary py-2 text-xs font-semibold text-primary-foreground">
                            <Send size={12} /> I've Paid This
                          </button>
                          <button onClick={() => handleConfirmReceived(s)} className="press-effect flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 py-2 text-xs font-semibold text-primary-foreground">
                            <Check size={12} /> I've Received This
                          </button>
                        </div>
                          ) : (
                        // Show Mark as Paid only to the owing member (from)
                        currentMemberId === s.from ? (
                          <button onClick={() => { sounds.tap(); setPayingSettlement(i); }} className="press-effect w-full flex items-center justify-center gap-1.5 rounded-xl bg-secondary py-2 text-xs font-semibold text-secondary-foreground">
                            <Check size={14} /> Mark as Paid
                          </button>
                        ) : (
                          <div className="text-xs text-muted-foreground text-center">Waiting for payer</div>
                        )
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
