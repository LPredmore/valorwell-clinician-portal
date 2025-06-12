
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

    const { action, code, state, connectionId } = await req.json()

    const nylasClientId = Deno.env.get('NYLAS_CLIENT_ID')
    const nylasClientSecret = Deno.env.get('NYLAS_CLIENT_SECRET')
    const nylasRedirectUri = 'https://ehr.valorwell.org/nylas-oauth-callback'

    if (!nylasClientId || !nylasClientSecret) {
      throw new Error('Nylas configuration missing')
    }

    switch (action) {
      case 'initialize': {
        // Generate OAuth URL for Google Calendar connection via Nylas
        const state = btoa(JSON.stringify({ 
          userId: user.id, 
          timestamp: Date.now() 
        }))
        
        const authUrl = new URL('https://api.us.nylas.com/v3/connect/auth')
        authUrl.searchParams.set('client_id', nylasClientId)
        authUrl.searchParams.set('redirect_uri', nylasRedirectUri)
        authUrl.searchParams.set('response_type', 'code')
        authUrl.searchParams.set('state', state)
        authUrl.searchParams.set('provider', 'google')
        
        // Set the required Google scopes
        const scopes = [
          'openid',
          'https://www.googleapis.com/auth/userinfo.email',
          'https://www.googleapis.com/auth/userinfo.profile',
          'https://www.googleapis.com/auth/calendar'
        ]
        authUrl.searchParams.set('scope', scopes.join(' '))

        return new Response(
          JSON.stringify({ authUrl: authUrl.toString() }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'callback': {
        if (!code || !state) {
          throw new Error('Missing authorization code or state')
        }

        // Verify state parameter
        let stateData
        try {
          stateData = JSON.parse(atob(state))
        } catch {
          throw new Error('Invalid state parameter')
        }

        // Exchange code for access token using Nylas token endpoint
        const tokenResponse = await fetch('https://api.us.nylas.com/v3/connect/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${nylasClientSecret}`,
          },
          body: JSON.stringify({
            client_id: nylasClientId,
            client_secret: nylasClientSecret,
            code,
            grant_type: 'authorization_code',
            redirect_uri: nylasRedirectUri,
          }),
        })

        if (!tokenResponse.ok) {
          const error = await tokenResponse.text()
          throw new Error(`Token exchange failed: ${error}`)
        }

        const tokenData = await tokenResponse.json()

        // Get grant details from Nylas
        const grantResponse = await fetch(`https://api.us.nylas.com/v3/grants/${tokenData.grant_id}`, {
          headers: {
            'Authorization': `Bearer ${tokenData.access_token}`,
          },
        })

        if (!grantResponse.ok) {
          throw new Error('Failed to fetch grant details')
        }

        const grantData = await grantResponse.json()

        // Store connection in database with Google-specific metadata
        const { data: connection, error: dbError } = await supabaseClient
          .from('nylas_connections')
          .insert({
            id: tokenData.grant_id,
            user_id: stateData.userId,
            email: grantData.email,
            provider: 'google',
            access_token: tokenData.access_token,
            refresh_token: tokenData.refresh_token,
            token_expires_at: new Date(Date.now() + (tokenData.expires_in * 1000)).toISOString(),
            is_active: true,
            calendar_ids: grantData.calendar_ids || [],
            connector_id: grantData.connector_id,
            grant_status: grantData.grant_status,
            scopes: [
              'openid',
              'https://www.googleapis.com/auth/userinfo.email',
              'https://www.googleapis.com/auth/userinfo.profile',
              'https://www.googleapis.com/auth/calendar'
            ]
          })
          .select()
          .single()

        if (dbError) {
          console.error('Database error:', dbError)
          throw new Error('Failed to store connection')
        }

        return new Response(
          JSON.stringify({ 
            success: true, 
            connection: {
              id: connection.id,
              email: connection.email,
              provider: connection.provider,
              grant_status: grantData.grant_status
            }
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'disconnect': {
        if (!connectionId) {
          throw new Error('Connection ID required')
        }

        // Mark connection as inactive
        const { error: dbError } = await supabaseClient
          .from('nylas_connections')
          .update({ is_active: false })
          .eq('id', connectionId)
          .eq('user_id', user.id)

        if (dbError) {
          throw new Error('Failed to disconnect')
        }

        return new Response(
          JSON.stringify({ success: true }),
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
