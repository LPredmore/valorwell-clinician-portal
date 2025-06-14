import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts";
import { timingSafeEqual } from "https://deno.land/std@0.168.0/crypto/timing_safe_equal.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-nylas-signature',
}

// Function to verify Nylas webhook signature
async function verifyNylasSignature(secret: string, signatureHeader: string, body: string): Promise<boolean> {
  if (!signatureHeader) {
    return false;
  }
  
  // Extract timestamp and signature from header
  const parts = signatureHeader.split(',');
  const timestampStr = parts.find(part => part.startsWith('t='))?.split('=')[1];
  const signature = parts.find(part => part.startsWith('v1='))?.split('=')[1];

  if (!timestampStr || !signature) {
    console.error('[nylas-webhook-handler] Signature header has invalid format.');
    return false;
  }
  
  const timestamp = parseInt(timestampStr, 10);
  const now = Math.floor(Date.now() / 1000);

  // Prevent replay attacks by checking if the timestamp is recent (e.g., within 5 minutes)
  if (Math.abs(now - timestamp) > 300) {
    console.warn('[nylas-webhook-handler] Received webhook with old timestamp.');
    return false;
  }

  // Construct the message to sign
  const message = `${timestamp}.${body}`;
  
  const keyData = new TextEncoder().encode(secret);
  const key = await crypto.subtle.importKey("raw", keyData, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  
  const hmac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  
  // Convert hex signature from Nylas to Uint8Array for comparison
  // NOTE: Nylas docs say hex, but some implementations show Base64. Let's assume hex and be ready to change.
  // UPDATE: The v3 signature is a hex digest of the HMAC.
  const expectedSignature = Array.from(new Uint8Array(hmac)).map(b => b.toString(16).padStart(2, '0')).join('');
  
  // Use a constant-time comparison to prevent timing attacks
  return timingSafeEqual(new TextEncoder().encode(signature), new TextEncoder().encode(expectedSignature));
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const nylasClientSecret = Deno.env.get('NYLAS_CLIENT_SECRET');
    if (!nylasClientSecret) {
      console.error('[nylas-webhook-handler] NYLAS_CLIENT_SECRET is not set.');
      return new Response(JSON.stringify({ error: 'Configuration error' }), { status: 500 });
    }

    const signature = req.headers.get('x-nylas-signature');
    const requestBody = await req.text();

    if (!signature) {
      console.warn('[nylas-webhook-handler] Received request without signature.');
      return new Response(JSON.stringify({ error: 'Signature missing' }), { status: 401 });
    }

    // Verify signature
    const isValid = await verifyNylasSignature(nylasClientSecret, signature, requestBody);
    if (!isValid) {
      console.error('[nylas-webhook-handler] Invalid signature.');
      return new Response(JSON.stringify({ error: 'Invalid signature' }), { status: 401 });
    }

    const body = JSON.parse(requestBody);

    if (body.challenge) {
      console.log('[nylas-webhook-handler] Responding to Nylas challenge.');
      return new Response(body.challenge, { status: 200, headers: { ...corsHeaders } });
    }

    if (body.deltas && body.deltas.length > 0) {
      console.log(`[nylas-webhook-handler] Received ${body.deltas.length} deltas.`);

      const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      const grantIds = new Set(body.deltas.map((delta: any) => delta.object_data?.grant_id).filter(Boolean));

      for (const grantId of grantIds) {
        console.log(`[nylas-webhook-handler] Processing sync for grant_id: ${grantId}`);
        const { data: connection, error: connError } = await supabaseAdmin
          .from('nylas_connections')
          .select('user_id')
          .eq('id', grantId)
          .single();

        if (connError || !connection) {
          console.error(`[nylas-webhook-handler] Could not find user for grant_id ${grantId}:`, connError);
          continue;
        }

        const clinicianId = connection.user_id;
        const today = new Date();
        // Sync a wider range to be safe, e.g., this month and next month
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const endOfNextMonth = new Date(today.getFullYear(), today.getMonth() + 2, 0);

        console.log(`[nylas-webhook-handler] Invoking bidirectional sync for clinician ${clinicianId}`);
        
        // Invoke the new bidirectional sync action
        await supabaseAdmin.functions.invoke('nylas-sync-appointments', {
          headers: { 'x-internal-call-secret': Deno.env.get('INTERNAL_FUNCTIONS_SECRET')! },
          body: {
            action: 'sync_bidirectional', // Use the robust bidirectional sync
            clinicianId: clinicianId,
            startDate: startOfMonth.toISOString(),
            endDate: endOfNextMonth.toISOString(),
          },
        });
      }
    }
    
    return new Response(JSON.stringify({ success: true, message: 'Webhook received and processed' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[nylas-webhook-handler] Error:', error.message, error.stack)
    return new Response(JSON.stringify({ error: 'Server error', details: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
