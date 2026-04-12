export interface TripMember {
  id: string;
  name: string;
  avatar?: string;
  color: string;
}

export interface Expense {
  id: string;
  tripId: string;
  description: string;
  amount: number;
  currency: string;
  paidBy: string; // member id
  splitAmong: string[]; // member ids
  splitType: 'equal' | 'custom';
  customSplits?: Record<string, number>;
  category: string;
  date: string;
  createdAt: number;
}

export interface PaymentConfirmation {
  id: string;
  from: string; // member id (payer)
  to: string; // member id (receiver)
  amount: number;
  confirmedByPayer: boolean;
  confirmedByReceiver: boolean;
  createdAt: number;
}

export interface Trip {
  id: string;
  name: string;
  description?: string;
  emoji: string;
  members: TripMember[];
  expenses: Expense[];
  payments: PaymentConfirmation[];
  createdAt: number;
  currency: string;
}

export interface Settlement {
  from: string;
  to: string;
  amount: number;
}

export const CATEGORIES = [
  { id: 'food', label: 'Food & Drinks', emoji: '🍽️' },
  { id: 'transport', label: 'Transport', emoji: '🚗' },
  { id: 'stay', label: 'Accommodation', emoji: '🏨' },
  { id: 'activity', label: 'Activities', emoji: '🎯' },
  { id: 'shopping', label: 'Shopping', emoji: '🛍️' },
  { id: 'other', label: 'Other', emoji: '📦' },
];

export const MEMBER_COLORS = [
  'hsl(20, 45%, 28%)',   // chocolate
  'hsl(195, 60%, 50%)',  // ocean
  'hsl(15, 80%, 60%)',   // sunset
  'hsl(25, 40%, 55%)',   // mocha
  'hsl(145, 50%, 45%)',  // green
  'hsl(280, 50%, 55%)',  // purple
  'hsl(45, 70%, 50%)',   // golden
  'hsl(340, 60%, 55%)',  // rose
];

export const TRIP_EMOJIS = ['🏖️', '⛰️', '🏕️', '✈️', '🚢', '🎿', '🏝️', '🌍', '🗺️', '🎪'];
