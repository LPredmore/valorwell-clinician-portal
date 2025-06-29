
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

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

    const { action } = await req.json()

    // Required environment variables
    const nylasClientId = Deno.env.get('NYLAS_CLIENT_ID')
    const nylasClientSecret = Deno.env.get('NYLAS_CLIENT_SECRET')
    const nylasConnectorId = Deno.env.get('NYLAS_CONNECTOR_ID')
    const redirectUri = Deno.env.get('NYLAS_REDIRECT_URI')

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
        // Create OAuth authorization URL
        const authUrl = `https://api.nylas.com/v3/connect/auth?client_id=${nylasClientId}&redirect_uri=${encodeURIComponent(redirectUri || 'https://api.us.nylas.com/v3/connect/callback')}&response_type=code&provider=google`

        return new Response(
          JSON.stringify({ authUrl }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'callback': {
        const { code } = await req.json()
        
        if (!code) {
          throw new Error('No authorization code received')
        }

        // Exchange code for access token
        const tokenResponse = await fetch('https://api.nylas.com/v3/connect/token', {
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
          throw new Error(`Token exchange failed: ${error}`)
        }

        const tokenData = await tokenResponse.json()

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
          throw new Error(`Database error: ${dbError.message}`)
        }

        return new Response(
          JSON.stringify({ success: true, email: tokenData.email }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      default:
        throw new Error('Invalid action')
    }

  } catch (error) {
    console.error('Nylas auth error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
