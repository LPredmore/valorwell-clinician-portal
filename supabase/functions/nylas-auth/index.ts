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
    console.log('[nylas-auth] Request received:', req.method, req.url)

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Check for required environment variables
    const nylasClientId = Deno.env.get('NYLAS_CLIENT_ID')
    const nylasClientSecret = Deno.env.get('NYLAS_CLIENT_SECRET')
    const nylasApiKey = Deno.env.get('NYLAS_API_KEY')
    const nylasConnectorId = Deno.env.get('NYLAS_CONNECTOR_ID')
    const nylasRedirectUri = Deno.env.get('NYLAS_REDIRECT_URI') || 'https://ehr.valorwell.org/nylas-oauth-callback'

    const { action, code, state, connectionId } = await req.json()
    console.log('[nylas-auth] Action:', action)

    switch (action) {
      case 'ping': {
        // Simple health check endpoint
        console.log('[nylas-auth] Ping request received')
        return new Response(
          JSON.stringify({ 
            status: 'ok', 
            timestamp: new Date().toISOString(),
            environment: {
              hasClientId: !!nylasClientId,
              hasClientSecret: !!nylasClientSecret,
              hasApiKey: !!nylasApiKey,
              hasConnectorId: !!nylasConnectorId,
              redirectUri: nylasRedirectUri
            }
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'check-config': {
        // Configuration validation endpoint
        console.log('[nylas-auth] Configuration check requested')
        
        const missingConfig = []
        if (!nylasClientId) missingConfig.push('NYLAS_CLIENT_ID')
        if (!nylasClientSecret) missingConfig.push('NYLAS_CLIENT_SECRET')
        if (!nylasApiKey) missingConfig.push('NYLAS_API_KEY')

        if (missingConfig.length > 0) {
          return new Response(
            JSON.stringify({ 
              error: 'Nylas configuration missing',
              missing: missingConfig,
              details: `Missing environment variables: ${missingConfig.join(', ')}`
            }),
            { 
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          )
        }

        // Test Nylas API connectivity
        try {
          const testResponse = await fetch('https://api.us.nylas.com/v3/grants', {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${nylasApiKey}`,
              'Content-Type': 'application/json',
            },
          })

          if (!testResponse.ok) {
            throw new Error(`Nylas API test failed: ${testResponse.status}`)
          }

          return new Response(
            JSON.stringify({ 
              status: 'ok',
              message: 'Nylas configuration is valid',
              api_connectivity: 'success'
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        } catch (error) {
          return new Response(
            JSON.stringify({ 
              error: 'Nylas API connectivity failed',
              details: error.message
            }),
            { 
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          )
        }
      }

      case 'initialize': {
        // Verify JWT and get user for OAuth actions
        const authHeader = req.headers.get('Authorization')
        if (!authHeader) {
          console.error('[nylas-auth] No authorization header')
          return new Response(
            JSON.stringify({ 
              error: 'Authentication failed',
              code: 'AUTH_HEADER_MISSING',
              details: 'No authorization header provided'
            }),
            { 
              status: 401,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          )
        }

        const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
        if (authError || !user) {
          console.error('[nylas-auth] Authentication failed:', authError)
          return new Response(
            JSON.stringify({ 
              error: 'Authentication failed',
              code: 'INVALID_JWT',
              details: authError?.message || 'Invalid or expired JWT token'
            }),
            { 
              status: 401,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          )
        }

        console.log('[nylas-auth] Initializing Google Calendar OAuth flow for user:', user.id)

        if (!nylasClientId || !nylasClientSecret || !nylasApiKey) {
          return new Response(
            JSON.stringify({ 
              error: 'Nylas configuration missing',
              code: 'CONFIG_MISSING',
              details: 'Check NYLAS_CLIENT_ID, NYLAS_CLIENT_SECRET, and NYLAS_API_KEY'
            }),
            { 
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          )
        }
        
        // Generate OAuth URL for Google Calendar connection via Nylas
        const stateParam = btoa(JSON.stringify({ 
          userId: user.id, 
          timestamp: Date.now() 
        }))
        
        const authUrl = new URL('https://api.us.nylas.com/v3/connect/auth')
        authUrl.searchParams.set('client_id', nylasClientId)
        authUrl.searchParams.set('redirect_uri', nylasRedirectUri)
        authUrl.searchParams.set('response_type', 'code')
        authUrl.searchParams.set('state', stateParam)
        authUrl.searchParams.set('provider', 'google')
        
        // Only use connector ID if available (optional for now)
        if (nylasConnectorId) {
          authUrl.searchParams.set('connector_id', nylasConnectorId)
        }
        
        // Set the required Google scopes
        const scopes = [
          'openid',
          'https://www.googleapis.com/auth/userinfo.email',
          'https://www.googleapis.com/auth/userinfo.profile',
          'https://www.googleapis.com/auth/calendar'
        ]
        authUrl.searchParams.set('scope', scopes.join(' '))

        console.log('[nylas-auth] Generated auth URL:', authUrl.toString())

        return new Response(
          JSON.stringify({ authUrl: authUrl.toString() }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'callback': {
        // Verify JWT and get user
        const authHeader = req.headers.get('Authorization')
        if (!authHeader) {
          console.error('[nylas-auth] No authorization header')
          return new Response(
            JSON.stringify({ 
              error: 'Authentication failed',
              code: 'AUTH_HEADER_MISSING',
              details: 'No authorization header provided'
            }),
            { 
              status: 401,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          )
        }

        const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
        if (authError || !user) {
          console.error('[nylas-auth] Authentication failed:', authError)
          return new Response(
            JSON.stringify({ 
              error: 'Authentication failed',
              code: 'INVALID_JWT',
              details: authError?.message || 'Invalid or expired JWT token'
            }),
            { 
              status: 401,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          )
        }

        console.log('[nylas-auth] Processing OAuth callback for user:', user.id)
        
        if (!code || !state) {
          console.error('[nylas-auth] Missing code or state:', { hasCode: !!code, hasState: !!state })
          return new Response(
            JSON.stringify({ 
              error: 'Missing authorization code or state',
              code: 'OAUTH_PARAMS_MISSING',
              details: 'The authorization code or state parameter is missing'
            }),
            { 
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          )
        }

        if (!nylasClientId || !nylasClientSecret || !nylasApiKey) {
          return new Response(
            JSON.stringify({ 
              error: 'Nylas configuration missing',
              code: 'CONFIG_MISSING',
              details: 'Check NYLAS_CLIENT_ID, NYLAS_CLIENT_SECRET, and NYLAS_API_KEY'
            }),
            { 
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          )
        }

        // Verify state parameter
        let stateData
        try {
          stateData = JSON.parse(atob(state))
          console.log('[nylas-auth] Decoded state:', stateData)
        } catch (error) {
          console.error('[nylas-auth] Invalid state parameter:', error)
          return new Response(
            JSON.stringify({ 
              error: 'Invalid state parameter',
              code: 'INVALID_STATE',
              details: 'The state parameter could not be decoded'
            }),
            { 
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          )
        }

        // Exchange code for access token using Nylas token endpoint
        const tokenRequestBody = {
          client_id: nylasClientId,
          client_secret: nylasClientSecret,
          code,
          grant_type: 'authorization_code',
          redirect_uri: nylasRedirectUri,
        }
        
        console.log('[nylas-auth] Exchanging code for token...')
        
        const tokenResponse = await fetch('https://api.us.nylas.com/v3/connect/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${nylasApiKey}`,
          },
          body: JSON.stringify(tokenRequestBody),
        })

        if (!tokenResponse.ok) {
          const error = await tokenResponse.text()
          console.error('[nylas-auth] Token exchange failed:', tokenResponse.status, error)
          return new Response(
            JSON.stringify({ 
              error: 'Token exchange failed',
              code: 'TOKEN_EXCHANGE_FAILED',
              details: error
            }),
            { 
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          )
        }

        const tokenData = await tokenResponse.json()
        console.log('[nylas-auth] Token exchange successful, grant_id:', tokenData.grant_id)

        // Get grant details from Nylas
        const grantResponse = await fetch(`https://api.us.nylas.com/v3/grants/${tokenData.grant_id}`, {
          headers: {
            'Authorization': `Bearer ${tokenData.access_token}`,
          },
        })

        if (!grantResponse.ok) {
          const error = await grantResponse.text()
          console.error('[nylas-auth] Failed to fetch grant details:', grantResponse.status, error)
          return new Response(
            JSON.stringify({ 
              error: 'Failed to fetch grant details',
              code: 'GRANT_FETCH_FAILED',
              details: error
            }),
            { 
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          )
        }

        const grantData = await grantResponse.json()
        console.log('[nylas-auth] Grant data received:', {
          email: grantData.email,
          provider: grantData.provider,
          grant_status: grantData.grant_status
        })

        // Store connection in database
        const connectionData = {
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
        }

        console.log('[nylas-auth] Storing connection in database...')

        const { data: connection, error: dbError } = await supabaseClient
          .from('nylas_connections')
          .insert(connectionData)
          .select()
          .single()

        if (dbError) {
          console.error('[nylas-auth] Database error:', dbError)
          return new Response(
            JSON.stringify({ 
              error: 'Failed to store connection',
              code: 'DB_ERROR',
              details: dbError.message
            }),
            { 
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          )
        }

        console.log('[nylas-auth] Connection stored successfully')

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
        // Verify JWT and get user
        const authHeader = req.headers.get('Authorization')
        if (!authHeader) {
          console.error('[nylas-auth] No authorization header')
          return new Response(
            JSON.stringify({ 
              error: 'Authentication failed',
              code: 'AUTH_HEADER_MISSING',
              details: 'No authorization header provided'
            }),
            { 
              status: 401,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          )
        }

        const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
        if (authError || !user) {
          console.error('[nylas-auth] Authentication failed:', authError)
          return new Response(
            JSON.stringify({ 
              error: 'Authentication failed',
              code: 'INVALID_JWT',
              details: authError?.message || 'Invalid or expired JWT token'
            }),
            { 
              status: 401,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          )
        }

        console.log('[nylas-auth] Disconnecting connection:', connectionId)
        
        if (!connectionId) {
          return new Response(
            JSON.stringify({ 
              error: 'Connection ID required',
              code: 'MISSING_CONNECTION_ID',
              details: 'A connection ID must be provided'
            }),
            { 
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          )
        }

        // Mark connection as inactive
        const { error: dbError } = await supabaseClient
          .from('nylas_connections')
          .update({ is_active: false })
          .eq('id', connectionId)
          .eq('user_id', user.id)

        if (dbError) {
          console.error('[nylas-auth] Disconnect error:', dbError)
          return new Response(
            JSON.stringify({ 
              error: 'Failed to disconnect',
              code: 'DB_ERROR',
              details: dbError.message
            }),
            { 
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          )
        }

        console.log('[nylas-auth] Connection disconnected successfully')

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      default:
        return new Response(
          JSON.stringify({ 
            error: 'Invalid action',
            code: 'INVALID_ACTION',
            details: `Action '${action}' is not supported`
          }),
          { 
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
    }

  } catch (error) {
    console.error('[nylas-auth] Error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Server error',
        code: 'SERVER_ERROR',
        details: error.message
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
