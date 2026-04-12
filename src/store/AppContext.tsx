import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { Trip, Expense, TripMember, MEMBER_COLORS } from '@/types/trip';
import { cacheTrip, getCachedTrip } from '@/lib/offline-sync';

interface AppState {
  trips: Trip[];
  currentTripId: string | null;
  activeTab: 'trips' | 'detail' | 'add' | 'settle';
}

type Action =
  | { type: 'SET_TRIPS'; trips: Trip[] }
  | { type: 'ADD_TRIP'; trip: Trip }
  | { type: 'DELETE_TRIP'; tripId: string }
  | { type: 'SET_CURRENT_TRIP'; tripId: string | null }
  | { type: 'SET_TAB'; tab: AppState['activeTab'] }
  | { type: 'ADD_MEMBER'; tripId: string; member: TripMember }
  | { type: 'ADD_EXPENSE'; tripId: string; expense: Expense }
  | { type: 'DELETE_EXPENSE'; tripId: string; expenseId: string };

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_TRIPS':
      return { ...state, trips: action.trips };
    case 'ADD_TRIP':
      return { ...state, trips: [...state.trips, action.trip] };
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
    default:
      return state;
  }
}

const initialState: AppState = {
  trips: [],
  currentTripId: null,
  activeTab: 'trips',
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
        return { ...initialState, trips: parsed.trips || [] };
      }
    } catch {}
    return initialState;
  });

  useEffect(() => {
    localStorage.setItem('tripwise_state', JSON.stringify({ trips: state.trips }));
    // Cache each trip individually
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
    createdAt: Date.now(),
  };
}
