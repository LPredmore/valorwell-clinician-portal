
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

export function handlePing(userId: string | null): Response {
  return new Response(
    JSON.stringify({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      user_id: userId
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

export function handleCheckConfig(): Response {
  const nylasClientId = Deno.env.get('NYLAS_CLIENT_ID')
  const nylasClientSecret = Deno.env.get('NYLAS_CLIENT_SECRET')
  const nylasApiKey = Deno.env.get('NYLAS_API_KEY')
  
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
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  return new Response(
    JSON.stringify({ 
      status: 'ok',
      message: 'Nylas configuration is valid',
      config: { hasClientId: true, hasClientSecret: true, hasApiKey: true }
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}
