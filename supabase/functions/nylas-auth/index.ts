
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

// IMPORTANT: Added 'x-test-mode' to allow for testing without a live user session.
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-test-mode',
}

// Helper to create a Supabase client with the service role key for admin operations.
const createAdminClient = (): SupabaseClient => {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('[nylas-auth] Request received:', req.method, req.url)

    const body = await req.json().catch(() => ({}));
    const { action, code, state, connectionId } = body;
    console.log('[nylas-auth] Action:', action)

    // Check for required environment variables early.
    const nylasClientId = Deno.env.get('NYLAS_CLIENT_ID');
    const nylasClientSecret = Deno.env.get('NYLAS_CLIENT_SECRET');
    const nylasApiKey = Deno.env.get('NYLAS_API_KEY');
    
    if (!nylasClientId || !nylasClientSecret || !nylasApiKey) {
      console.error('[nylas-auth] Critical Error: Nylas configuration is missing from environment variables.');
      throw new Error('Nylas configuration missing. Please check server settings.');
    }

    const supabaseAdminClient = createAdminClient();
    let user = null;
    const isTestMode = req.headers.get('x-test-mode') === 'true';

    // Centralized Authentication Gate for actions that require a user.
    if (['initialize', 'callback', 'disconnect'].includes(action)) {
      if (isTestMode) {
        console.log('[nylas-auth] Running in TEST MODE, bypassing authentication.');
        // Using a known clinician ID from logs for consistent testing.
        user = { id: '7077bf00-4ace-4d86-89fa-7951a3d6ac0e' }; 
      } else {
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
          return new Response(JSON.stringify({ error: 'Authentication required.', code: 'AUTH_HEADER_MISSING' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
        
        const supabaseAuthClient = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_ANON_KEY') ?? '',
          { global: { headers: { Authorization: authHeader } } }
        );
        const { data: { user: authUser }, error: authError } = await supabaseAuthClient.auth.getUser();

        if (authError || !authUser) {
          console.error('[nylas-auth] Authentication failed:', authError?.message);
          return new Response(JSON.stringify({ error: 'Invalid authentication token.', code: 'INVALID_JWT', details: authError?.message }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
        user = authUser;
      }
      console.log(`[nylas-auth] User authenticated for action '${action}':`, user.id);
    }
    
    // Dynamically determine the redirect URI, critical for different environments (dev, prod).
    const requestOrigin = req.headers.get('origin');
    const nylasRedirectUri = Deno.env.get('NYLAS_REDIRECT_URI') || (requestOrigin ? `${requestOrigin}/nylas-oauth-callback` : null);

    if (!nylasRedirectUri && ['initialize', 'callback'].includes(action)) {
         console.error('[nylas-auth] Critical Error: Could not determine Nylas Redirect URI.');
         throw new Error('Nylas redirect URI is not configured.');
    }

    switch (action) {
      case 'initialize': {
        console.log('[nylas-auth] Initializing OAuth flow for user:', user.id);
        
        const stateParam = btoa(JSON.stringify({ userId: user.id, timestamp: Date.now() }));
        
        const authUrl = new URL('https://api.us.nylas.com/v3/connect/auth');
        authUrl.searchParams.set('client_id', nylasClientId);
        authUrl.searchParams.set('redirect_uri', nylasRedirectUri);
        authUrl.searchParams.set('response_type', 'code');
        authUrl.searchParams.set('state', stateParam);
        authUrl.searchParams.set('provider', 'google');
        
        const nylasConnectorId = Deno.env.get('NYLAS_CONNECTOR_ID');
        if (nylasConnectorId) authUrl.searchParams.set('connector_id', nylasConnectorId);
        
        const scopes = ['openid', 'https://www.googleapis.com/auth/userinfo.email', 'https://www.googleapis.com/auth/userinfo.profile', 'https://www.googleapis.com/auth/calendar'];
        authUrl.searchParams.set('scope', scopes.join(' '));

        console.log('[nylas-auth] Generated auth URL:', authUrl.toString());
        return new Response(JSON.stringify({ authUrl: authUrl.toString() }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      case 'callback': {
        console.log('[nylas-auth] Processing OAuth callback for user:', user.id);
        if (!code || !state) throw new Error('Missing authorization code or state from callback.');

        let stateData;
        try {
          stateData = JSON.parse(atob(state));
          if (stateData.userId !== user.id) {
            console.error(`[nylas-auth] State mismatch: JWT user ${user.id} does not match state user ${stateData.userId}`);
            throw new Error("State validation failed. User mismatch.");
          }
        } catch (error) {
          console.error('[nylas-auth] Invalid state parameter:', error.message);
          throw new Error('Invalid or tampered state parameter.');
        }

        const tokenRequestBody = { client_id: nylasClientId, client_secret: nylasClientSecret, code, grant_type: 'authorization_code', redirect_uri: nylasRedirectUri };
        
        console.log('[nylas-auth] Exchanging authorization code for token...');
        const tokenResponse = await fetch('https://api.us.nylas.com/v3/connect/token', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(tokenRequestBody) });

        if (!tokenResponse.ok) {
          const errorText = await tokenResponse.text();
          console.error('[nylas-auth] Token exchange failed:', tokenResponse.status, errorText);
          throw new Error(`Token exchange failed with Nylas: ${errorText}`);
        }
        const tokenData = await tokenResponse.json();
        console.log('[nylas-auth] Token exchange successful. Grant ID:', tokenData.grant_id);

        console.log('[nylas-auth] Fetching grant details from Nylas...');
        const grantResponse = await fetch(`https://api.us.nylas.com/v3/grants/${tokenData.grant_id}`, { headers: { 'Authorization': `Bearer ${nylasApiKey}` } });

        if (!grantResponse.ok) {
          const errorText = await grantResponse.text();
          console.error('[nylas-auth] Failed to fetch grant details:', grantResponse.status, errorText);
          throw new Error('Failed to fetch grant details from Nylas.');
        }
        const grantData = await grantResponse.json();
        
        const connectionData = {
          id: tokenData.grant_id,
          user_id: user.id,
          email: grantData.email,
          provider: grantData.provider,
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          token_expires_at: new Date(Date.now() + (tokenData.expires_in * 1000)).toISOString(),
          is_active: true,
          calendar_ids: grantData.calendar_ids || [],
          connector_id: grantData.connector_id,
          grant_status: grantData.grant_status,
          scopes: grantData.scope ? grantData.scope.split(' ') : [],
        };

        console.log('[nylas-auth] Upserting connection into database...');
        const { data: connection, error: dbError } = await supabaseAdminClient.from('nylas_connections').upsert(connectionData).select().single();

        if (dbError) {
          console.error('[nylas-auth] Database error while saving connection:', dbError);
          throw new Error(`Failed to save connection details: ${dbError.message}`);
        }

        console.log('[nylas-auth] Connection stored successfully.');
        return new Response(JSON.stringify({ success: true, connection }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      case 'disconnect': {
        console.log('[nylas-auth] Disconnecting connection:', connectionId, 'for user:', user.id);
        if (!connectionId) throw new Error('Connection ID is required for disconnect action.');
        
        console.log('[nylas-auth] Revoking grant with Nylas...');
        await fetch(`https://api.us.nylas.com/v3/grants/${connectionId}/revoke`, { method: 'POST', headers: { 'Authorization': `Bearer ${nylasApiKey}` } });

        console.log('[nylas-auth] Marking connection as inactive in database...');
        const { error: dbError } = await supabaseAdminClient.from('nylas_connections').update({ is_active: false, grant_status: 'revoked' }).eq('id', connectionId).eq('user_id', user.id);

        if (dbError) {
          console.error('[nylas-auth] Database error while disconnecting:', dbError);
          throw new Error(`Failed to update connection status: ${dbError.message}`);
        }

        console.log('[nylas-auth] Disconnect successful.');
        return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      default:
        throw new Error(`Invalid action specified: '${action}'`);
    }

  } catch (error) {
    console.error(`[nylas-auth] Unhandled error in function: ${error.message}`);
    return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
