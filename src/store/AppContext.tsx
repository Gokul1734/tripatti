import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { Trip, Expense, TripMember, PaymentConfirmation, MEMBER_COLORS } from '@/types/trip';
import { cacheTrip, getCachedTrip } from '@/lib/offline-sync';

interface AppState {
  trips: Trip[];
  currentTripId: string | null;
  activeTab: 'trips' | 'detail' | 'add' | 'settle' | 'member';
  selectedMemberId: string | null;
}

type Action =
  | { type: 'SET_TRIPS'; trips: Trip[] }
  | { type: 'ADD_TRIP'; trip: Trip }
  | { type: 'DELETE_TRIP'; tripId: string }
  | { type: 'SET_CURRENT_TRIP'; tripId: string | null }
  | { type: 'SET_TAB'; tab: AppState['activeTab'] }
  | { type: 'ADD_MEMBER'; tripId: string; member: TripMember }
  | { type: 'ADD_EXPENSE'; tripId: string; expense: Expense }
  | { type: 'DELETE_EXPENSE'; tripId: string; expenseId: string }
  | { type: 'ADD_PAYMENT'; tripId: string; payment: PaymentConfirmation }
  | { type: 'CONFIRM_PAYMENT'; tripId: string; paymentId: string; role: 'payer' | 'receiver' }
  | { type: 'SELECT_MEMBER'; memberId: string | null };

function migrateTrip(t: any): Trip {
  return { ...t, payments: t.payments || [] };
}

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_TRIPS':
      return { ...state, trips: action.trips.map(migrateTrip) };
    case 'ADD_TRIP':
      return { ...state, trips: [...state.trips, migrateTrip(action.trip)] };
    case 'DELETE_TRIP':
      return {
        ...state,
        trips: state.trips.filter(t => t.id !== action.tripId),
        currentTripId: state.currentTripId === action.tripId ? null : state.currentTripId,
      };
    case 'SET_CURRENT_TRIP':
      return { ...state, currentTripId: action.tripId };
    case 'SET_TAB':
      return { ...state, activeTab: action.tab };
    case 'ADD_MEMBER': {
      const trips = state.trips.map(t =>
        t.id === action.tripId ? { ...t, members: [...t.members, action.member] } : t
      );
      return { ...state, trips };
    }
    case 'ADD_EXPENSE': {
      const trips = state.trips.map(t =>
        t.id === action.tripId ? { ...t, expenses: [...t.expenses, action.expense] } : t
      );
      return { ...state, trips };
    }
    case 'DELETE_EXPENSE': {
      const trips = state.trips.map(t =>
        t.id === action.tripId
          ? { ...t, expenses: t.expenses.filter(e => e.id !== action.expenseId) }
          : t
      );
      return { ...state, trips };
    }
    case 'ADD_PAYMENT': {
      const trips = state.trips.map(t =>
        t.id === action.tripId ? { ...t, payments: [...t.payments, action.payment] } : t
      );
      return { ...state, trips };
    }
    case 'CONFIRM_PAYMENT': {
      const trips = state.trips.map(t => {
        if (t.id !== action.tripId) return t;
        return {
          ...t,
          payments: t.payments.map(p =>
            p.id === action.paymentId
              ? {
                  ...p,
                  confirmedByPayer: action.role === 'payer' ? true : p.confirmedByPayer,
                  confirmedByReceiver: action.role === 'receiver' ? true : p.confirmedByReceiver,
                }
              : p
          ),
        };
      });
      return { ...state, trips };
    }
    case 'SELECT_MEMBER':
      return { ...state, selectedMemberId: action.memberId };
    default:
      return state;
  }
}

const initialState: AppState = {
  trips: [],
  currentTripId: null,
  activeTab: 'trips',
  selectedMemberId: null,
};

const AppContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<Action>;
  currentTrip: Trip | null;
}>({
  state: initialState,
  dispatch: () => {},
  currentTrip: null,
});

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState, () => {
    try {
      const saved = localStorage.getItem('tripwise_state');
      if (saved) {
        const parsed = JSON.parse(saved);
        return { ...initialState, trips: (parsed.trips || []).map(migrateTrip) };
      }
    } catch {}
    return initialState;
  });

  useEffect(() => {
    localStorage.setItem('tripwise_state', JSON.stringify({ trips: state.trips }));
    state.trips.forEach(t => cacheTrip(t.id, t));
  }, [state.trips]);

  const currentTrip = state.trips.find(t => t.id === state.currentTripId) || null;

  return (
    <AppContext.Provider value={{ state, dispatch, currentTrip }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}

export function createTrip(name: string, emoji: string, currency: string, creatorName: string): Trip {
  return {
    id: crypto.randomUUID(),
    name,
    emoji,
    currency,
    members: [{
      id: crypto.randomUUID(),
      name: creatorName,
      color: MEMBER_COLORS[0],
    }],
    expenses: [],
    payments: [],
    createdAt: Date.now(),
  };
}
