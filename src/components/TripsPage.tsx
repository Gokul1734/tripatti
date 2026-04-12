import { useState } from 'react';
import { useApp, createTrip } from '@/store/AppContext';
import { TRIP_EMOJIS } from '@/types/trip';
import { sounds } from '@/lib/sounds';
import { Plus, ChevronRight, Trash2, MapPin } from 'lucide-react';
import { getTotalExpenses, formatCurrency } from '@/lib/calculations';

export default function TripsPage() {
  const { state, dispatch } = useApp();
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('🏖️');
  const [currency, setCurrency] = useState('USD');
  const [creatorName, setCreatorName] = useState('');

  const handleCreate = () => {
    if (!name.trim() || !creatorName.trim()) return;
    sounds.success();
    const trip = createTrip(name.trim(), emoji, currency, creatorName.trim());
    dispatch({ type: 'ADD_TRIP', trip });
    dispatch({ type: 'SET_CURRENT_TRIP', tripId: trip.id });
    dispatch({ type: 'SET_TAB', tab: 'detail' });
    setShowCreate(false);
    setName('');
    setCreatorName('');
  };

  return (
    <div className="flex flex-1 flex-col px-5 pb-24 pt-4 safe-top">
      {/* Header */}
      <div className="mb-6 animate-slide-down">
        <div className="flex items-center gap-2">
          <span className="text-3xl">🌴</span>
          <h1 className="font-display text-2xl font-bold text-foreground">TripWise</h1>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">Split expenses, not friendships</p>
      </div>

      {/* Create Button */}
      <button
        onClick={() => {
          sounds.tap();
          setShowCreate(true);
        }}
        className="press-effect mb-5 flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-accent bg-cream py-4 text-primary transition-all hover:border-primary animate-fade-in"
      >
        <Plus size={20} strokeWidth={2.5} />
        <span className="font-semibold">New Trip</span>
      </button>

      {/* Trip List */}
      {state.trips.length === 0 && !showCreate && (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 text-muted-foreground animate-fade-in">
          <MapPin size={48} strokeWidth={1.2} className="animate-float text-accent" />
          <p className="text-center text-sm">No trips yet. Create one to start tracking expenses!</p>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {state.trips.map((trip, i) => {
          const total = getTotalExpenses(trip);
          return (
            <button
              key={trip.id}
              onClick={() => {
                sounds.tap();
                dispatch({ type: 'SET_CURRENT_TRIP', tripId: trip.id });
                dispatch({ type: 'SET_TAB', tab: 'detail' });
              }}
              className={`press-effect group flex items-center gap-4 rounded-2xl bg-card p-4 shadow-card transition-all hover:shadow-card-hover animate-fade-in stagger-${i + 1}`}
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-secondary text-2xl">
                {trip.emoji}
              </div>
              <div className="flex-1 text-left">
                <h3 className="font-display text-base font-semibold text-foreground">{trip.name}</h3>
                <p className="text-xs text-muted-foreground">
                  {trip.members.length} members · {trip.expenses.length} expenses
                </p>
                {total > 0 && (
                  <p className="mt-0.5 text-sm font-semibold text-primary">
                    {formatCurrency(total, trip.currency)}
                  </p>
                )}
              </div>
              <ChevronRight size={18} className="text-muted-foreground transition-transform group-hover:translate-x-1" />
            </button>
          );
        })}
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/30" onClick={() => setShowCreate(false)}>
          <div
            className="w-full max-w-[430px] rounded-t-3xl bg-card px-6 pb-8 pt-4 shadow-card-hover animate-slide-up"
            onClick={e => e.stopPropagation()}
          >
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-border" />
            <h2 className="font-display text-xl font-bold text-foreground mb-5">Create Trip</h2>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Trip Name</label>
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Beach Weekend 🌊"
                  className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Your Name</label>
                <input
                  value={creatorName}
                  onChange={e => setCreatorName(e.target.value)}
                  placeholder="Enter your name"
                  className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-medium text-muted-foreground">Icon</label>
                <div className="flex flex-wrap gap-2">
                  {TRIP_EMOJIS.map(e => (
                    <button
                      key={e}
                      onClick={() => { sounds.tap(); setEmoji(e); }}
                      className={`press-effect flex h-10 w-10 items-center justify-center rounded-xl text-lg transition-all
                        ${emoji === e ? 'bg-primary/10 ring-2 ring-primary scale-110' : 'bg-secondary'}`}
                    >
                      {e}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Currency</label>
                <select
                  value={currency}
                  onChange={e => setCurrency(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="INR">INR (₹)</option>
                  <option value="JPY">JPY (¥)</option>
                </select>
              </div>

              <button
                onClick={handleCreate}
                disabled={!name.trim() || !creatorName.trim()}
                className="press-effect w-full rounded-xl bg-primary py-3.5 font-semibold text-primary-foreground transition-all disabled:opacity-40"
              >
                Create Trip ✨
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
