import { useState } from 'react';
import { useApp } from '@/store/AppContext';
import { PaymentConfirmation } from '@/types/trip';
import { calculateSettlements, formatCurrency, getMemberName, getMemberColor } from '@/lib/calculations';
import { sounds } from '@/lib/sounds';
import { ArrowLeft, ArrowRight, CheckCircle2, Check, Clock, Send } from 'lucide-react';

export default function SettlePage() {
  const { currentTrip, dispatch } = useApp();
  const [payingSettlement, setPayingSettlement] = useState<number | null>(null);

  if (!currentTrip) return null;

  const settlements = calculateSettlements(currentTrip);

  const getPaymentForSettlement = (from: string, to: string) => {
    return currentTrip.payments.find(
      p => p.from === from && p.to === to && !(p.confirmedByPayer && p.confirmedByReceiver)
    );
  };

  const getCompletedPayment = (from: string, to: string) => {
    return currentTrip.payments.find(
      p => p.from === from && p.to === to && p.confirmedByPayer && p.confirmedByReceiver
    );
  };

  const handleMarkPaid = (s: { from: string; to: string; amount: number }) => {
    sounds.success();
    const existing = getPaymentForSettlement(s.from, s.to);
    if (existing) {
      dispatch({ type: 'CONFIRM_PAYMENT', tripId: currentTrip.id, paymentId: existing.id, role: 'payer' });
    } else {
      const payment: PaymentConfirmation = {
        id: crypto.randomUUID(),
        from: s.from,
        to: s.to,
        amount: s.amount,
        confirmedByPayer: true,
        confirmedByReceiver: false,
        createdAt: Date.now(),
      };
      dispatch({ type: 'ADD_PAYMENT', tripId: currentTrip.id, payment });
    }
    setPayingSettlement(null);
  };

  const handleConfirmReceived = (s: { from: string; to: string }) => {
    sounds.success();
    const existing = getPaymentForSettlement(s.from, s.to);
    if (existing) {
      dispatch({ type: 'CONFIRM_PAYMENT', tripId: currentTrip.id, paymentId: existing.id, role: 'receiver' });
    }
  };

  return (
    <div className="flex flex-1 flex-col safe-top">
      <div className="flex-shrink-0 px-5 pt-4 mb-5">
        <div className="flex items-center gap-3 animate-slide-down">
          <button
            onClick={() => {
              sounds.navigate();
              dispatch({ type: 'SET_TAB', tab: 'detail' });
            }}
            className="press-effect flex h-9 w-9 items-center justify-center rounded-xl bg-secondary"
          >
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
            <p className="text-xs text-muted-foreground mb-1">
              Minimum transfers to settle all debts:
            </p>
            {settlements.map((s, i) => {
              const fromName = getMemberName(currentTrip, s.from);
              const toName = getMemberName(currentTrip, s.to);
              const fromColor = getMemberColor(currentTrip, s.from);
              const toColor = getMemberColor(currentTrip, s.to);
              const payment = getPaymentForSettlement(s.from, s.to);
              const completed = getCompletedPayment(s.from, s.to);
              const isFullyPaid = !!completed;
              const isPaying = payingSettlement === i;

              return (
                <div
                  key={i}
                  className={`rounded-2xl bg-card shadow-card animate-fade-in stagger-${Math.min(i + 1, 5)} ${isFullyPaid ? 'opacity-60' : ''}`}
                >
                  <div className="flex items-center gap-3 p-4">
                    {/* From */}
                    <div className="flex flex-col items-center gap-1">
                      <div
                        className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-primary-foreground"
                        style={{ backgroundColor: fromColor }}
                      >
                        {fromName.charAt(0)}
                      </div>
                      <p className="text-[11px] font-medium text-foreground max-w-[60px] truncate">{fromName}</p>
                    </div>

                    {/* Arrow + Amount */}
                    <div className="flex flex-1 flex-col items-center gap-0.5">
                      <div className="flex items-center gap-1 text-accent">
                        <div className="h-[1px] flex-1 bg-border" />
                        <ArrowRight size={16} />
                      </div>
                      <p className={`text-sm font-bold ${isFullyPaid ? 'text-emerald-600 line-through' : 'text-primary'}`}>
                        {formatCurrency(s.amount, currentTrip.currency)}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {isFullyPaid ? 'settled ✓' : 'owes'}
                      </p>
                    </div>

                    {/* To */}
                    <div className="flex flex-col items-center gap-1">
                      <div
                        className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-primary-foreground"
                        style={{ backgroundColor: toColor }}
                      >
                        {toName.charAt(0)}
                      </div>
                      <p className="text-[11px] font-medium text-foreground max-w-[60px] truncate">{toName}</p>
                    </div>
                  </div>

                  {/* Payment status & actions */}
                  {!isFullyPaid && (
                    <div className="border-t border-border px-4 py-3">
                      {payment ? (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {payment.confirmedByPayer && (
                              <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-semibold text-amber-700">
                                <Clock size={10} /> Payer confirmed
                              </span>
                            )}
                            {payment.confirmedByReceiver && (
                              <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-semibold text-emerald-700">
                                <Check size={10} /> Receiver confirmed
                              </span>
                            )}
                          </div>
                          {payment.confirmedByPayer && !payment.confirmedByReceiver && (
                            <button
                              onClick={() => handleConfirmReceived(s)}
                              className="press-effect flex items-center gap-1 rounded-xl bg-emerald-600 px-3 py-1.5 text-[11px] font-semibold text-primary-foreground"
                            >
                              <Check size={12} /> Confirm Received
                            </button>
                          )}
                          {!payment.confirmedByPayer && payment.confirmedByReceiver && (
                            <button
                              onClick={() => handleMarkPaid(s)}
                              className="press-effect flex items-center gap-1 rounded-xl bg-primary px-3 py-1.5 text-[11px] font-semibold text-primary-foreground"
                            >
                              <Check size={12} /> Confirm Paid
                            </button>
                          )}
                        </div>
                      ) : isPaying ? (
                        <div className="flex items-center gap-2 animate-fade-in">
                          <button
                            onClick={() => handleMarkPaid(s)}
                            className="press-effect flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-primary py-2 text-xs font-semibold text-primary-foreground"
                          >
                            <Send size={12} /> I've Paid This
                          </button>
                          <button
                            onClick={() => handleConfirmReceived(s)}
                            className="press-effect flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 py-2 text-xs font-semibold text-primary-foreground"
                          >
                            <Check size={12} /> I've Received This
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => { sounds.tap(); setPayingSettlement(i); }}
                          className="press-effect w-full flex items-center justify-center gap-1.5 rounded-xl bg-secondary py-2 text-xs font-semibold text-secondary-foreground"
                        >
                          <Check size={14} /> Mark as Paid
                        </button>
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
