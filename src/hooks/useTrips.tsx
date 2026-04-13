import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import type { Tables } from '@/integrations/supabase/types';

export type DbTrip = Tables<'trips'>;
export type DbMember = Tables<'trip_members'>;
export type DbExpense = Tables<'expenses'>;
export type DbExpenseSplit = Tables<'expense_splits'>;
export type DbPayment = Tables<'payments'>;

export interface FullTrip extends DbTrip {
  members: DbMember[];
  expenses: (DbExpense & { splits: DbExpenseSplit[] })[];
  payments: DbPayment[];
}

export function useTrips() {
  const { user } = useAuth();
  const [trips, setTrips] = useState<FullTrip[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTripId, setCurrentTripId] = useState<string | null>(null);

  const currentTrip = trips.find(t => t.id === currentTripId) || null;

  const fetchTrips = useCallback(async () => {
    if (!user) return;
    
    const { data: memberRows } = await supabase
      .from('trip_members')
      .select('trip_id')
      .eq('user_id', user.id);

    if (!memberRows || memberRows.length === 0) {
      setTrips([]);
      setLoading(false);
      return;
    }

    const tripIds = memberRows.map(m => m.trip_id);

    const [tripsRes, membersRes, expensesRes, splitsRes, paymentsRes] = await Promise.all([
      supabase.from('trips').select('*').in('id', tripIds),
      supabase.from('trip_members').select('*').in('trip_id', tripIds),
      supabase.from('expenses').select('*').in('trip_id', tripIds),
      supabase.from('expense_splits').select('*'),
      supabase.from('payments').select('*').in('trip_id', tripIds),
    ]);

    const tripsData = tripsRes.data || [];
    const allMembers = membersRes.data || [];
    const allExpenses = expensesRes.data || [];
    const allSplits = splitsRes.data || [];
    const allPayments = paymentsRes.data || [];

    const expenseIds = allExpenses.map(e => e.id);
    const relevantSplits = allSplits.filter(s => expenseIds.includes(s.expense_id));

    const fullTrips: FullTrip[] = tripsData.map(trip => ({
      ...trip,
      members: allMembers.filter(m => m.trip_id === trip.id),
      expenses: allExpenses
        .filter(e => e.trip_id === trip.id)
        .map(e => ({
          ...e,
          splits: relevantSplits.filter(s => s.expense_id === e.id),
        })),
      payments: allPayments.filter(p => p.trip_id === trip.id),
    }));

    setTrips(fullTrips);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchTrips();
  }, [fetchTrips]);

  // Realtime subscriptions
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('trip-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trips' }, () => fetchTrips())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trip_members' }, () => fetchTrips())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses' }, () => fetchTrips())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'expense_splits' }, () => fetchTrips())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, () => fetchTrips())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchTrips]);

  return { trips, loading, currentTrip, currentTripId, setCurrentTripId, refetch: fetchTrips };
}
