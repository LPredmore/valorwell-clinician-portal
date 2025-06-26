# Verifying Nylas API Credentials

To verify that your Nylas API credentials are correctly configured in Supabase, follow these steps:

## 1. Check Existing Secrets in Supabase

1. Go to the Supabase dashboard
2. Navigate to Project Settings > API
3. Scroll down to the "Project API keys" section
4. Verify that you have the correct `anon` and `service_role` keys

## 2. Check Edge Function Secrets

1. Go to the Supabase dashboard
2. Navigate to Edge Functions > Settings
3. Check if the following secrets are configured:
   - `NYLAS_CLIENT_ID`
   - `NYLAS_CLIENT_SECRET`
   - `NYLAS_API_KEY`
   - `NYLAS_REDIRECT_URI` (should be: https://ehr.valorwell.org/nylas-oauth-callback)
   - `NYLAS_CONNECTOR_ID` (value: 785af6d9-4607-475d-9fcb-8e08311656b2)

## 3. Verify Nylas API Key in Nylas Dashboard

1. Log in to your Nylas dashboard
2. Navigate to your application settings
3. Verify that the API key matches the one configured in Supabase
4. Check that the application is active and has the necessary permissions

## 4. Update Secrets if Needed

If any of the secrets are missing or incorrect, update them:

1. Go to the Supabase dashboard
2. Navigate to Edge Functions > Settings
3. Click "Add Secret"
4. Enter the name and value of the secret
5. Click "Save"

## 5. Test with a Simple API Call

To test if your Nylas API key is working correctly, you can create a simple test function:

```typescript
// test-nylas-api.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const nylasApiKey = Deno.env.get('NYLAS_API_KEY')
    
    if (!nylasApiKey) {
      throw new Error('NYLAS_API_KEY is not configured')
    }
    
    // Test the API key with a simple request to the Nylas API
    const response = await fetch('https://api.us.nylas.com/v3/grants', {
      headers: {
        'Authorization': `Bearer ${nylasApiKey}`,
      },
    })
    
    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Nylas API error: ${response.status} ${error}`)
    }
    
    const data = await response.json()
    
    return new Response(
      JSON.stringify({ success: true, message: 'Nylas API key is valid', data }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
```

Deploy this function and test it to verify that your Nylas API key is working correctly.

## Common Issues and Solutions

1. **Invalid API Key**: If you see "Invalid authentication token" errors, your API key might be incorrect or expired. Generate a new API key in the Nylas dashboard.

2. **Missing Permissions**: Ensure your Nylas application has the necessary permissions for the operations you're trying to perform.

3. **Rate Limiting**: If you're seeing rate limiting errors, you might be making too many requests to the Nylas API. Implement rate limiting in your application.

4. **Incorrect Redirect URI**: Make sure the redirect URI configured in Supabase matches the one in your Nylas dashboard.