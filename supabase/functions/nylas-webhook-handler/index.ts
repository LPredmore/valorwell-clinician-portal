
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-nylas-signature',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const nylasClientSecret = Deno.env.get('NYLAS_CLIENT_SECRET')
    if (!nylasClientSecret) {
      console.error('[nylas-webhook-handler] NYLAS_CLIENT_SECRET is not set.');
      return new Response(JSON.stringify({ error: 'Configuration error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const signature = req.headers.get('x-nylas-signature');
    const requestBody = await req.text(); // Read body as text for verification

    if (!signature) {
      console.warn('[nylas-webhook-handler] Received request without signature.');
      return new Response(JSON.stringify({ error: 'Signature missing' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Verify signature
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(nylasClientSecret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign", "verify"]
    );
    const hmac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(requestBody));
    const hexHmac = Array.from(new Uint8Array(hmac)).map(b => b.toString(16).padStart(2, '0')).join('');

    if (hexHmac !== signature) {
      console.error('[nylas-webhook-handler] Invalid signature.');
      return new Response(JSON.stringify({ error: 'Invalid signature' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const body = JSON.parse(requestBody);

    // Nylas webhook challenge
    if (body.challenge) {
      console.log('[nylas-webhook-handler] Responding to Nylas challenge.');
      return new Response(body.challenge, { status: 200, headers: { ...corsHeaders } });
    }
    
    console.log('[nylas-webhook-handler] Received valid webhook:', JSON.stringify(body, null, 2));

    // TODO: Process the webhook event (e.g., call sync function)
    // For now, we will just log it and acknowledge receipt.

    // Acknowledge receipt
    return new Response(JSON.stringify({ success: true, message: 'Webhook received' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[nylas-webhook-handler] Error:', error)
    return new Response(JSON.stringify({ error: 'Server error', details: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

