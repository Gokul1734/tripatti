const QUEUE_KEY = 'tripwise_sync_queue';

export interface SyncAction {
  id: string;
  type: 'add_expense' | 'update_expense' | 'delete_expense' | 'add_member' | 'settle_debt';
  payload: any;
  timestamp: number;
  tripId: string;
}

export function queueAction(action: Omit<SyncAction, 'id' | 'timestamp'>) {
  const queue = getQueue();
  queue.push({
    ...action,
    id: crypto.randomUUID(),
    timestamp: Date.now(),
  });
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export function getQueue(): SyncAction[] {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
  } catch {
    return [];
  }
}

export function clearQueue() {
  localStorage.setItem(QUEUE_KEY, JSON.stringify([]));
}

export function removeFromQueue(id: string) {
  const queue = getQueue().filter(a => a.id !== id);
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

// Cache trip data locally
export function cacheTrip(tripId: string, data: any) {
  try {
    localStorage.setItem(`tripwise_trip_${tripId}`, JSON.stringify({ data, cachedAt: Date.now() }));
  } catch {}
}

export function getCachedTrip(tripId: string) {
  try {
    const raw = localStorage.getItem(`tripwise_trip_${tripId}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function isOnline() {
  return navigator.onLine;
}
