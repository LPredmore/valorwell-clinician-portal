
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Use US regional endpoint
const NYLAS_API_BASE = 'https://api.us.nylas.com'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Verify JWT and get user - this is critical for RLS policies
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    if (authError || !user) {
      console.error('[nylas-auth] Authentication failed:', authError)
      throw new Error('Authentication failed')
    }

    console.log('[nylas-auth] Authenticated user:', user.id)

    // Read the request body only once to prevent "Body already consumed" error
    let body;
    try {
      const requestText = await req.text();
      body = requestText ? JSON.parse(requestText) : {};
    } catch (error) {
      console.error('[nylas-auth] Error parsing request body:', error);
      body = {};
    }

    const { action, connectionId, code, state } = body;

    // Required environment variables
    const nylasClientId = Deno.env.get('NYLAS_CLIENT_ID')
    const nylasClientSecret = Deno.env.get('NYLAS_CLIENT_SECRET')
    const nylasApiKey = Deno.env.get('NYLAS_API_KEY')
    
    // Use dynamic redirect URI based on the request origin
    const origin = req.headers.get('origin') || req.headers.get('referer')?.replace(/\/$/, '') || 'http://localhost:3000'
    const redirectUri = `${origin}/api/nylas/callback`

    if (action === 'test_connectivity') {
      // Simple connectivity test
      return new Response(
        JSON.stringify({ success: true, message: 'Edge function is responding' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!nylasClientId || !nylasClientSecret || !nylasApiKey) {
      throw new Error('Nylas configuration missing')
    }

    switch (action) {
      case 'initialize': {
        console.log('[nylas-auth] Initializing with redirect URI:', redirectUri)
        
        // Create OAuth authorization URL using US regional endpoint
        const authUrl = `${NYLAS_API_BASE}/v3/connect/auth?client_id=${nylasClientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&provider=google`

        return new Response(
          JSON.stringify({ authUrl, redirectUri }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'callback': {
        if (!code) {
          throw new Error('No authorization code received')
        }

        console.log('[nylas-auth] Processing callback with redirect URI:', redirectUri)

        // Exchange code for access token using US regional endpoint
        const tokenResponse = await fetch(`${NYLAS_API_BASE}/v3/connect/token`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            client_id: nylasClientId,
            client_secret: nylasClientSecret,
            redirect_uri: redirectUri,
            code: code,
            grant_type: 'authorization_code',
          }),
        })

        if (!tokenResponse.ok) {
          const error = await tokenResponse.text()
          console.error('[nylas-auth] Token exchange failed:', error)
          throw new Error(`Token exchange failed: ${error}`)
        }

        const tokenData = await tokenResponse.json()
        console.log('[nylas-auth] Token exchange successful:', {
          email: tokenData.email,
          grant_id: tokenData.grant_id,
          provider: tokenData.provider
        })

        // CRITICAL FIX: Store grant_id from Nylas response
        const { error: dbError } = await supabaseClient
          .from('nylas_connections')
          .insert({
            user_id: user.id, // Use authenticated user ID from JWT
            grant_id: tokenData.grant_id, // CRITICAL: Store Nylas grant ID
            email: tokenData.email,
            provider: tokenData.provider || 'google',
            access_token: tokenData.access_token,
            refresh_token: tokenData.refresh_token,
            token_expires_at: tokenData.expires_at ? new Date(tokenData.expires_at * 1000).toISOString() : null,
            is_active: true,
          })

        if (dbError) {
          console.error('[nylas-auth] Database error:', dbError)
          throw new Error(`Database error: ${dbError.message}`)
        }

        console.log('[nylas-auth] Connection stored successfully for user:', user.id, 'with grant_id:', tokenData.grant_id)

        return new Response(
          JSON.stringify({ 
            success: true, 
            email: tokenData.email,
            grant_id: tokenData.grant_id,
            connection: tokenData 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'disconnect': {
        if (!connectionId) {
          throw new Error('No connection ID provided for disconnect')
        }

        console.log('[nylas-auth] Disconnecting connection:', connectionId)

        // Get the connection to get grant_id
        const { data: connection, error: fetchError } = await supabaseClient
          .from('nylas_connections')
          .select('grant_id, email')
          .eq('user_id', user.id)
          .eq('id', connectionId)
          .single()

        if (fetchError || !connection) {
          console.error('[nylas-auth] Connection not found:', fetchError)
          throw new Error('Connection not found')
        }

        // STEP 1: Revoke the grant via Nylas API first
        if (connection.grant_id) {
          try {
            const revokeResponse = await fetch(`${NYLAS_API_BASE}/v3/grants/${connection.grant_id}`, {
              method: 'DELETE',
              headers: {
                'Authorization': `Bearer ${nylasApiKey}`,
                'Content-Type': 'application/json'
              }
            })

            if (revokeResponse.ok) {
              console.log('[nylas-auth] Grant revoked successfully:', connection.grant_id)
            } else {
              const revokeError = await revokeResponse.text()
              console.warn('[nylas-auth] Grant revocation failed (continuing with local cleanup):', revokeError)
            }
          } catch (revokeError) {
            console.warn('[nylas-auth] Grant revocation error (continuing with local cleanup):', revokeError)
          }
        }

        // STEP 2: Delete the local database record
        const { error: deleteError } = await supabaseClient
          .from('nylas_connections')
          .delete()
          .eq('user_id', user.id)
          .eq('id', connectionId)

        if (deleteError) {
          console.error('[nylas-auth] Error deleting connection:', deleteError)
          throw new Error(`Failed to delete connection: ${deleteError.message}`)
        }

        console.log('[nylas-auth] Connection disconnected successfully:', connectionId)

        return new Response(
          JSON.stringify({ 
            success: true, 
            message: `Calendar ${connection.email} disconnected successfully`
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      default:
        throw new Error('Invalid action')
    }

  } catch (error) {
    console.error('[nylas-auth] Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
