import { useState } from 'react';
import { useApp } from '@/store/AppContext';
import { CATEGORIES, Expense } from '@/types/trip';
import { sounds } from '@/lib/sounds';
import { ArrowLeft, Check } from 'lucide-react';

export default function AddExpensePage() {
  const { currentTrip, dispatch } = useApp();
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('food');
  const [paidBy, setPaidBy] = useState(currentTrip?.members[0]?.id || '');
  const [splitAmong, setSplitAmong] = useState<string[]>(currentTrip?.members.map(m => m.id) || []);
  const [success, setSuccess] = useState(false);

  if (!currentTrip) return null;

  const toggleSplit = (id: string) => {
    sounds.tap();
    setSplitAmong(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleSubmit = () => {
    if (!description.trim() || !amount || !paidBy || splitAmong.length === 0) {
      sounds.error();
      return;
    }

    const expense: Expense = {
      id: crypto.randomUUID(),
      tripId: currentTrip.id,
      description: description.trim(),
      amount: parseFloat(amount),
      currency: currentTrip.currency,
      paidBy,
      splitAmong,
      splitType: 'equal',
      category,
      date: new Date().toISOString(),
      createdAt: Date.now(),
    };

    dispatch({ type: 'ADD_EXPENSE', tripId: currentTrip.id, expense });
    sounds.success();
    setSuccess(true);
    setTimeout(() => {
      setSuccess(false);
      setDescription('');
      setAmount('');
      setCategory('food');
      setPaidBy(currentTrip.members[0]?.id || '');
      setSplitAmong(currentTrip.members.map(m => m.id));
      dispatch({ type: 'SET_TAB', tab: 'detail' });
    }, 1200);
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

  const splitPerPerson = splitAmong.length > 0 && amount
    ? parseFloat(amount) / splitAmong.length
    : 0;

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
        <h1 className="font-display text-xl font-bold text-foreground">Add Expense</h1>
      </div>

      <div className="flex flex-1 flex-col gap-4 animate-fade-in">
        {/* Amount */}
        <div className="rounded-2xl bg-card p-5 shadow-card text-center">
          <label className="text-xs font-medium text-muted-foreground">Amount ({currentTrip.currency})</label>
          <input
            type="number"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            placeholder="0.00"
            className="mt-2 w-full bg-transparent text-center font-display text-4xl font-bold text-foreground placeholder:text-muted-foreground/30 focus:outline-none"
          />
          {splitPerPerson > 0 && (
            <p className="mt-2 text-xs text-muted-foreground animate-fade-in">
              {currentTrip.currency} {splitPerPerson.toFixed(2)} per person
            </p>
          )}
        </div>

        {/* Description */}
        <input
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="What was it for?"
          className="rounded-xl border border-border bg-card px-4 py-3 text-sm shadow-card focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
        />

        {/* Category */}
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

        {/* Paid By */}
        <div>
          <label className="mb-2 block text-xs font-medium text-muted-foreground">Paid By</label>
          <div className="flex flex-wrap gap-2">
            {currentTrip.members.map(m => (
              <button
                key={m.id}
                onClick={() => { sounds.tap(); setPaidBy(m.id); }}
                className={`press-effect flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium transition-all
                  ${paidBy === m.id ? 'bg-primary text-primary-foreground scale-105' : 'bg-secondary text-secondary-foreground'}`}
              >
                <div
                  className="h-5 w-5 rounded-full text-[10px] flex items-center justify-center text-primary-foreground font-bold"
                  style={{ backgroundColor: m.color }}
                >
                  {m.name.charAt(0)}
                </div>
                {m.name}
              </button>
            ))}
          </div>
        </div>

        {/* Split Among */}
        <div>
          <label className="mb-2 block text-xs font-medium text-muted-foreground">Split Among</label>
          <div className="flex flex-wrap gap-2">
            {currentTrip.members.map(m => {
              const selected = splitAmong.includes(m.id);
              return (
                <button
                  key={m.id}
                  onClick={() => toggleSplit(m.id)}
                  className={`press-effect flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium transition-all
                    ${selected ? 'bg-accent text-accent-foreground ring-2 ring-primary/30' : 'bg-secondary text-muted-foreground'}`}
                >
                  <div
                    className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold transition-all
                      ${selected ? 'text-primary-foreground' : 'opacity-40 text-primary-foreground'}`}
                    style={{ backgroundColor: m.color }}
                  >
                    {selected ? '✓' : m.name.charAt(0)}
                  </div>
                  {m.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={!description.trim() || !amount || !paidBy || splitAmong.length === 0}
          className="press-effect mt-auto rounded-xl bg-primary py-3.5 font-semibold text-primary-foreground transition-all disabled:opacity-40"
        >
          Add Expense 💰
        </button>
      </div>
    </div>
  );
}
