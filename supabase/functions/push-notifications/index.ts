const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
import { createClient } from 'npm:@supabase/supabase-js@2';

const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY')!;
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Simple web push implementation using Web Crypto
async function sendPushNotification(subscription: any, payload: string) {
  // For simplicity, we'll use the fetch API to call the push endpoint
  // In production, you'd use a proper web-push library
  const endpoint = subscription.endpoint;
  
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'TTL': '86400',
      },
      body: payload,
    });
    return response.ok;
  } catch {
    return false;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { action } = body;

    if (action === 'get-vapid-key') {
      return new Response(
        JSON.stringify({ vapidPublicKey: VAPID_PUBLIC_KEY }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'send-notification') {
      const { tripId, title, message, excludeUserId } = body;
      
      const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      
      // Get all trip members
      const { data: members } = await supabaseAdmin
        .from('trip_members')
        .select('user_id')
        .eq('trip_id', tripId);

      if (!members) {
        return new Response(
          JSON.stringify({ error: 'No members found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const userIds = members
        .map(m => m.user_id)
        .filter(id => id !== excludeUserId);

      // Get push subscriptions for these users
      const { data: subscriptions } = await supabaseAdmin
        .from('push_subscriptions')
        .select('subscription_json')
        .in('user_id', userIds);

      if (!subscriptions || subscriptions.length === 0) {
        return new Response(
          JSON.stringify({ sent: 0 }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const payload = JSON.stringify({ title, body: message });
      let sent = 0;

      for (const sub of subscriptions) {
        const ok = await sendPushNotification(sub.subscription_json, payload);
        if (ok) sent++;
      }

      return new Response(
        JSON.stringify({ sent }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Unknown action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
