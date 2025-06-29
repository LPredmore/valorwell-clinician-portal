
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

    // Verify JWT and get user
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    if (authError || !user) {
      throw new Error('Authentication failed')
    }

    // Read the request body only once to prevent "Body already consumed" error
    let body;
    try {
      const requestText = await req.text();
      body = requestText ? JSON.parse(requestText) : {};
    } catch (error) {
      console.error('[nylas-auth] Error parsing request body:', error);
      body = {};
    }

    const { action } = body;

    // Required environment variables
    const nylasClientId = Deno.env.get('NYLAS_CLIENT_ID')
    const nylasClientSecret = Deno.env.get('NYLAS_CLIENT_SECRET')
    const nylasConnectorId = Deno.env.get('NYLAS_CONNECTOR_ID')
    
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

    if (!nylasClientId || !nylasClientSecret || !nylasConnectorId) {
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
        const { code } = body
        
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
        console.log('[nylas-auth] Token exchange successful for email:', tokenData.email)

        // Store connection in database
        const { error: dbError } = await supabaseClient
          .from('nylas_connections')
          .insert({
            user_id: user.id,
            email: tokenData.email,
            provider: 'google',
            access_token: tokenData.access_token,
            refresh_token: tokenData.refresh_token,
            token_expires_at: new Date(Date.now() + (tokenData.expires_in * 1000)).toISOString(),
            is_active: true,
          })

        if (dbError) {
          console.error('[nylas-auth] Database error:', dbError)
          throw new Error(`Database error: ${dbError.message}`)
        }

        return new Response(
          JSON.stringify({ success: true, email: tokenData.email, connection: tokenData }),
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
