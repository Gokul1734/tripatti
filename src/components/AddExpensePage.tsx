import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { FullTrip } from '@/hooks/useTrips';
import { supabase } from '@/integrations/supabase/client';
import { CATEGORIES } from '@/types/trip';
import { sounds } from '@/lib/sounds';
import { toast } from 'sonner';
import { ArrowLeft, Check } from 'lucide-react';

interface AddExpensePageProps {
  trip: FullTrip;
  onBack: () => void;
  onRefetch: () => void;
}

export default function AddExpensePage({ trip, onBack, onRefetch }: AddExpensePageProps) {
  const { user } = useAuth();
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('food');
  const [paidBy, setPaidBy] = useState(trip.members.find(m => m.user_id === user?.id)?.id || trip.members[0]?.id || '');
  const [splitAmong, setSplitAmong] = useState<string[]>(trip.members.map(m => m.id));
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const toggleSplit = (id: string) => {
    sounds.tap();
    setSplitAmong(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleSubmit = async () => {
    if (!description.trim() || !amount || !paidBy || splitAmong.length === 0 || !user) {
      sounds.error();
      return;
    }
    setLoading(true);

    const { data: expense, error } = await supabase
      .from('expenses')
      .insert({
        trip_id: trip.id,
        description: description.trim(),
        amount: parseFloat(amount),
        currency: trip.currency,
        paid_by_member_id: paidBy,
        category,
        created_by: user.id,
      })
      .select()
      .single();

    if (error || !expense) {
      toast.error('Failed to add expense');
      setLoading(false);
      return;
    }

    // Add splits
    await supabase.from('expense_splits').insert(
      splitAmong.map(memberId => ({
        expense_id: expense.id,
        member_id: memberId,
      }))
    );

    // Send push notification
    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const memberName = trip.members.find(m => m.id === paidBy)?.name || 'Someone';
      await fetch(`https://${projectId}.supabase.co/functions/v1/push-notifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send-notification',
          tripId: trip.id,
          title: `💸 ${trip.name}`,
          message: `${memberName} added "${description.trim()}" - ${trip.currency} ${parseFloat(amount).toFixed(2)}`,
          excludeUserId: user.id,
        }),
      });
    } catch {}

    sounds.success();
    setSuccess(true);
    await onRefetch();
    setTimeout(() => {
      setSuccess(false);
      onBack();
    }, 1200);
    setLoading(false);
  };

  if (success) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 animate-scale-bounce">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <Check size={40} strokeWidth={3} />
        </div>
        <p className="font-display text-xl font-bold text-foreground">Expense Added!</p>
      </div>
    );
  }

  const splitPerPerson = splitAmong.length > 0 && amount ? parseFloat(amount) / splitAmong.length : 0;

  return (
    <div className="flex flex-1 flex-col safe-top">
      <div className="flex-shrink-0 px-5 pt-4 mb-3">
        <div className="flex items-center gap-3 animate-slide-down">
          <button onClick={() => { sounds.navigate(); onBack(); }} className="press-effect flex h-9 w-9 items-center justify-center rounded-xl bg-secondary">
            <ArrowLeft size={18} />
          </button>
          <h1 className="font-display text-xl font-bold text-foreground">Add Expense</h1>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-24">
        <div className="flex flex-col gap-4 animate-fade-in">
          <div className="rounded-2xl bg-card p-5 shadow-card text-center">
            <label className="text-xs font-medium text-muted-foreground">Amount ({trip.currency})</label>
            <input
              type="number"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="0.00"
              className="mt-2 w-full bg-transparent text-center font-display text-4xl font-bold text-foreground placeholder:text-muted-foreground/30 focus:outline-none"
            />
            {splitPerPerson > 0 && (
              <p className="mt-2 text-xs text-muted-foreground animate-fade-in">
                {trip.currency} {splitPerPerson.toFixed(2)} per person
              </p>
            )}
          </div>

          <input
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="What was it for?"
            className="rounded-xl border border-border bg-card px-4 py-3 text-sm shadow-card focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
          />

          <div>
            <label className="mb-2 block text-xs font-medium text-muted-foreground">Category</label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => { sounds.tap(); setCategory(cat.id); }}
                  className={`press-effect flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium transition-all
                    ${category === cat.id ? 'bg-primary text-primary-foreground scale-105 shadow-card' : 'bg-secondary text-secondary-foreground'}`}
                >
                  <span>{cat.emoji}</span> {cat.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-2 block text-xs font-medium text-muted-foreground">Paid By</label>
            <div className="flex flex-wrap gap-2">
              {trip.members.map(m => (
                <button
                  key={m.id}
                  onClick={() => { sounds.tap(); setPaidBy(m.id); }}
                  className={`press-effect flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium transition-all
                    ${paidBy === m.id ? 'bg-primary text-primary-foreground scale-105' : 'bg-secondary text-secondary-foreground'}`}
                >
                  <div className="h-5 w-5 rounded-full text-[10px] flex items-center justify-center text-primary-foreground font-bold" style={{ backgroundColor: m.color }}>
                    {m.name.charAt(0)}
                  </div>
                  {m.name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-2 block text-xs font-medium text-muted-foreground">Split Among</label>
            <div className="flex flex-wrap gap-2">
              {trip.members.map(m => {
                const selected = splitAmong.includes(m.id);
                return (
                  <button
                    key={m.id}
                    onClick={() => toggleSplit(m.id)}
                    className={`press-effect flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium transition-all
                      ${selected ? 'bg-accent text-accent-foreground ring-2 ring-primary/30' : 'bg-secondary text-muted-foreground'}`}
                  >
                    <div className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${selected ? 'text-primary-foreground' : 'opacity-40 text-primary-foreground'}`} style={{ backgroundColor: m.color }}>
                      {selected ? '✓' : m.name.charAt(0)}
                    </div>
                    {m.name}
                  </button>
                );
              })}
            </div>
          </div>

          <button
            onClick={handleSubmit}
            disabled={!description.trim() || !amount || !paidBy || splitAmong.length === 0 || loading}
            className="press-effect rounded-xl bg-primary py-3.5 font-semibold text-primary-foreground transition-all disabled:opacity-40 mb-4"
          >
            {loading ? 'Adding...' : 'Add Expense 💰'}
          </button>
        </div>
      </div>
    </div>
  );
}
