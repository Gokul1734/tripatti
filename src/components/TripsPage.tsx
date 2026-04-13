import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useTrips, FullTrip } from '@/hooks/useTrips';
import { supabase } from '@/integrations/supabase/client';
import { TRIP_EMOJIS, MEMBER_COLORS } from '@/types/trip';
import { sounds } from '@/lib/sounds';
import { Plus, ChevronRight, MapPin, LogOut, Copy, Check, Users, Hash } from 'lucide-react';
import { toast } from 'sonner';

interface TripsPageProps {
  trips: FullTrip[];
  onSelectTrip: (tripId: string) => void;
  onRefetch: () => void;
}

export default function TripsPage({ trips, onSelectTrip, onRefetch }: TripsPageProps) {
  const { user, signOut } = useAuth();
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('🏖️');
  const [currency, setCurrency] = useState('INR');
  const [joinCode, setJoinCode] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const displayName = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0] || 'You';

  const handleCreate = async () => {
    if (!name.trim() || !user) return;
    setLoading(true);
    sounds.success();

    // Create trip
    const { data: trip, error } = await supabase
      .from('trips')
      .insert({ name: name.trim(), emoji, currency, created_by: user.id })
      .select()
      .single();

    if (error || !trip) {
      toast.error('Failed to create trip');
      setLoading(false);
      return;
    }

    // Add creator as member
    await supabase.from('trip_members').insert({
      trip_id: trip.id,
      user_id: user.id,
      name: displayName,
      color: MEMBER_COLORS[0],
    });

    await onRefetch();
    onSelectTrip(trip.id);
    setShowCreate(false);
    setName('');
    setLoading(false);
  };

  const handleJoin = async () => {
    if (!joinCode.trim() || !user) return;
    setLoading(true);
    sounds.tap();

    // Find trip by invite code
    const { data: trip } = await supabase
      .from('trips')
      .select('*')
      .eq('invite_code', joinCode.trim().toUpperCase())
      .single();

    if (!trip) {
      toast.error('Invalid trip code');
      setLoading(false);
      return;
    }

    // Check if already a member
    const { data: existing } = await supabase
      .from('trip_members')
      .select('id')
      .eq('trip_id', trip.id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (existing) {
      toast.info('You\'re already in this trip!');
      onSelectTrip(trip.id);
      setShowJoin(false);
      setLoading(false);
      return;
    }

    // Get current member count for color
    const { count } = await supabase
      .from('trip_members')
      .select('*', { count: 'exact', head: true })
      .eq('trip_id', trip.id);

    await supabase.from('trip_members').insert({
      trip_id: trip.id,
      user_id: user.id,
      name: displayName,
      color: MEMBER_COLORS[(count || 0) % MEMBER_COLORS.length],
    });

    sounds.success();
    toast.success(`Joined "${trip.name}"!`);
    await onRefetch();
    onSelectTrip(trip.id);
    setShowJoin(false);
    setJoinCode('');
    setLoading(false);
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(code);
    sounds.tap();
    toast.success('Trip code copied!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getTotalExpenses = (trip: FullTrip) => trip.expenses.reduce((s, e) => s + Number(e.amount), 0);

  const formatCurrency = (amount: number, currency: string) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(amount);

  return (
    <div className="flex flex-1 flex-col px-5 pb-24 pt-4 safe-top">
      {/* Header */}
      <div className="mb-6 animate-slide-down">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-3xl">🌴</span>
            <h1 className="font-display text-2xl font-bold text-foreground">Tripatti</h1>
          </div>
          <button
            onClick={() => { sounds.tap(); signOut(); }}
            className="press-effect flex h-9 w-9 items-center justify-center rounded-xl bg-secondary"
          >
            <LogOut size={16} />
          </button>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Hey {displayName} 👋 Split expenses, not friendships
        </p>
      </div>

      {/* Action Buttons */}
      <div className="mb-5 grid grid-cols-2 gap-3 animate-fade-in">
        <button
          onClick={() => { sounds.tap(); setShowCreate(true); }}
          className="press-effect flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-accent bg-cream py-4 text-primary transition-all hover:border-primary"
        >
          <Plus size={18} strokeWidth={2.5} />
          <span className="text-sm font-semibold">New Trip</span>
        </button>
        <button
          onClick={() => { sounds.tap(); setShowJoin(true); }}
          className="press-effect flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-ocean bg-ocean-light py-4 text-foreground transition-all"
        >
          <Hash size={18} strokeWidth={2.5} />
          <span className="text-sm font-semibold">Join Trip</span>
        </button>
      </div>

      {/* Trip List */}
      {trips.length === 0 && (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 text-muted-foreground animate-fade-in">
          <MapPin size={48} strokeWidth={1.2} className="animate-float text-accent" />
          <p className="text-center text-sm">No trips yet. Create or join one!</p>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {trips.map((trip, i) => {
          const total = getTotalExpenses(trip);
          return (
            <div key={trip.id} className={`animate-fade-in stagger-${Math.min(i + 1, 5)}`}>
              <button
                onClick={() => { sounds.tap(); onSelectTrip(trip.id); }}
                className="press-effect group flex w-full items-center gap-4 rounded-2xl bg-card p-4 shadow-card transition-all hover:shadow-card-hover"
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
              {/* Invite code badge */}
              <div className="mt-1 flex items-center justify-end gap-1 px-2">
                <span className="text-[10px] text-muted-foreground">Code:</span>
                <button
                  onClick={(e) => { e.stopPropagation(); copyCode(trip.invite_code); }}
                  className="press-effect flex items-center gap-1 rounded-lg bg-secondary px-2 py-0.5 text-[11px] font-mono font-bold text-foreground"
                >
                  {trip.invite_code}
                  {copiedId === trip.invite_code ? <Check size={10} className="text-emerald-600" /> : <Copy size={10} />}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Create Modal - Centered */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 px-5" onClick={() => setShowCreate(false)}>
          <div
            className="w-full max-w-[400px] max-h-[85vh] flex flex-col rounded-3xl bg-card shadow-card-hover animate-scale-bounce"
            onClick={e => e.stopPropagation()}
          >
            <div className="px-6 pt-5 pb-2 flex-shrink-0">
              <h2 className="font-display text-xl font-bold text-foreground">Create Trip</h2>
            </div>
            <div className="flex-1 overflow-y-auto px-6 pb-6">
              <div className="space-y-4 pt-3">
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
                    <option value="INR">INR (₹)</option>
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="JPY">JPY (¥)</option>
                  </select>
                </div>

                <button
                  onClick={handleCreate}
                  disabled={!name.trim() || loading}
                  className="press-effect w-full rounded-xl bg-primary py-3.5 font-semibold text-primary-foreground transition-all disabled:opacity-40"
                >
                  {loading ? 'Creating...' : 'Create Trip ✨'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Join Modal - Centered */}
      {showJoin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 px-5" onClick={() => setShowJoin(false)}>
          <div
            className="w-full max-w-[400px] rounded-3xl bg-card shadow-card-hover animate-scale-bounce"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-6">
              <h2 className="font-display text-xl font-bold text-foreground mb-4">Join a Trip</h2>
              <p className="text-xs text-muted-foreground mb-4">Enter the 6-character trip code shared by your friend</p>
              <input
                value={joinCode}
                onChange={e => setJoinCode(e.target.value.toUpperCase())}
                placeholder="ABC123"
                maxLength={6}
                autoFocus
                className="w-full rounded-xl border border-border bg-background px-4 py-4 text-center text-2xl font-mono font-bold tracking-[0.3em] text-foreground placeholder:text-muted-foreground/30 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all mb-4"
              />
              <button
                onClick={handleJoin}
                disabled={joinCode.length !== 6 || loading}
                className="press-effect w-full rounded-xl bg-primary py-3.5 font-semibold text-primary-foreground transition-all disabled:opacity-40"
              >
                {loading ? 'Joining...' : 'Join Trip 🤝'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
