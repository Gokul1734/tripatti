import { useApp } from '@/store/AppContext';
import { calculateSettlements, formatCurrency, getMemberName, getMemberColor } from '@/lib/calculations';
import { sounds } from '@/lib/sounds';
import { ArrowLeft, ArrowRight, CheckCircle2 } from 'lucide-react';

export default function SettlePage() {
  const { currentTrip, dispatch } = useApp();

  if (!currentTrip) return null;

  const settlements = calculateSettlements(currentTrip);

  return (
    <div className="flex flex-1 flex-col px-5 pb-24 pt-4 safe-top">
      <div className="mb-5 flex items-center gap-3 animate-slide-down">
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

      {settlements.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 text-muted-foreground animate-scale-bounce">
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

            return (
              <div
                key={i}
                className={`flex items-center gap-3 rounded-2xl bg-card p-4 shadow-card animate-fade-in stagger-${Math.min(i + 1, 5)}`}
              >
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
                  <p className="text-sm font-bold text-primary">
                    {formatCurrency(s.amount, currentTrip.currency)}
                  </p>
                  <p className="text-[10px] text-muted-foreground">owes</p>
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
            );
          })}
        </div>
      )}
    </div>
  );
}
