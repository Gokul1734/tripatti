import { supabase } from '@/integrations/supabase/client';

// VAPID public key - will be fetched from edge function
let vapidPublicKey: string | null = null;

async function getVapidPublicKey(): Promise<string | null> {
  if (vapidPublicKey) return vapidPublicKey;
  
  try {
    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
    const res = await fetch(
      `https://${projectId}.supabase.co/functions/v1/push-notifications`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get-vapid-key' }),
      }
    );
    const data = await res.json();
    vapidPublicKey = data.vapidPublicKey;
    return vapidPublicKey;
  } catch {
    return null;
  }
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false;
  if (!('serviceWorker' in navigator)) return false;
  
  const permission = await Notification.requestPermission();
  return permission === 'granted';
}

export async function subscribeToPush(userId: string): Promise<boolean> {
  try {
    const permission = await requestNotificationPermission();
    if (!permission) return false;

    const key = await getVapidPublicKey();
    if (!key) return false;

    const registration = await navigator.serviceWorker.ready;
    
    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(key),
      });
    }

    const subJson = subscription.toJSON();
    
    // Save to database
    await supabase.from('push_subscriptions').upsert(
      {
        user_id: userId,
        endpoint: subJson.endpoint!,
        subscription_json: subJson as any,
      },
      { onConflict: 'endpoint' }
    );

    return true;
  } catch (e) {
    console.error('Push subscription failed:', e);
    return false;
  }
}

export function isPushSupported(): boolean {
  return 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
}
