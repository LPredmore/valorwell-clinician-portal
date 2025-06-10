
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface NylasAuthRequest {
  action: 'initialize' | 'callback' | 'disconnect'
  code?: string
  state?: string
  connectionId?: string
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

    const { data: { user } } = await supabaseClient.auth.getUser()
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { action, code, state, connectionId }: NylasAuthRequest = await req.json()

    const NYLAS_CLIENT_ID = Deno.env.get('NYLAS_CLIENT_ID')
    const NYLAS_CLIENT_SECRET = Deno.env.get('NYLAS_CLIENT_SECRET')
    const NYLAS_REDIRECT_URI = Deno.env.get('NYLAS_REDIRECT_URI')

    if (!NYLAS_CLIENT_ID || !NYLAS_CLIENT_SECRET || !NYLAS_REDIRECT_URI) {
      throw new Error('Missing Nylas configuration')
    }

    switch (action) {
      case 'initialize': {
        // Generate OAuth URL for calendar connection
        const nylasAuthUrl = new URL('https://api.nylas.com/v3/connect/auth')
        nylasAuthUrl.searchParams.set('client_id', NYLAS_CLIENT_ID)
        nylasAuthUrl.searchParams.set('redirect_uri', NYLAS_REDIRECT_URI)
        nylasAuthUrl.searchParams.set('response_type', 'code')
        nylasAuthUrl.searchParams.set('state', user.id)
        nylasAuthUrl.searchParams.set('scope', 'calendar')
        nylasAuthUrl.searchParams.set('prompt', 'select_provider')

        return new Response(
          JSON.stringify({ authUrl: nylasAuthUrl.toString() }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'callback': {
        if (!code || !state || state !== user.id) {
          throw new Error('Invalid callback parameters')
        }

        // Exchange code for access token
        const tokenResponse = await fetch('https://api.nylas.com/v3/connect/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${NYLAS_CLIENT_SECRET}`,
          },
          body: JSON.stringify({
            client_id: NYLAS_CLIENT_ID,
            client_secret: NYLAS_CLIENT_SECRET,
            redirect_uri: NYLAS_REDIRECT_URI,
            code,
            grant_type: 'authorization_code'
          })
        })

        if (!tokenResponse.ok) {
          const error = await tokenResponse.text()
          throw new Error(`Token exchange failed: ${error}`)
        }

        const tokenData = await tokenResponse.json()
        
        // Get user's email and provider info
        const userInfoResponse = await fetch('https://api.nylas.com/v3/grants/me', {
          headers: {
            'Authorization': `Bearer ${tokenData.access_token}`,
          }
        })

        if (!userInfoResponse.ok) {
          throw new Error('Failed to get user info from Nylas')
        }

        const userInfo = await userInfoResponse.json()

        // Fetch user's calendars to store calendar IDs
        const calendarsResponse = await fetch(`https://api.nylas.com/v3/grants/${tokenData.grant_id}/calendars`, {
          headers: {
            'Authorization': `Bearer ${tokenData.access_token}`,
          }
        })

        let calendarIds = []
        if (calendarsResponse.ok) {
          const calendarsData = await calendarsResponse.json()
          calendarIds = (calendarsData.data || []).map((cal: any) => cal.id)
        }

        // Store connection in database with calendar IDs
        const { data: connection, error: dbError } = await supabaseClient
          .from('nylas_connections')
          .upsert({
            user_id: user.id,
            grant_id: tokenData.grant_id,
            email: userInfo.email,
            provider: userInfo.provider,
            access_token: tokenData.access_token,
            refresh_token: tokenData.refresh_token,
            expires_at: tokenData.expires_in ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString() : null,
            calendar_ids: calendarIds,
            is_active: true
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
              calendar_ids: calendarIds
            }
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'disconnect': {
        if (!connectionId) {
          throw new Error('Connection ID required for disconnect')
        }

        // Mark connection as inactive
        const { error: dbError } = await supabaseClient
          .from('nylas_connections')
          .update({ is_active: false })
          .eq('id', connectionId)
          .eq('user_id', user.id)

        if (dbError) {
          throw new Error('Failed to disconnect calendar')
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
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
