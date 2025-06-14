
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

export interface AuthResult {
  supabaseClient: SupabaseClient;
  userId: string | null;
  errorResponse?: Response;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

export async function authorizeRequest(req: Request): Promise<AuthResult> {
  const internalCallSecret = req.headers.get('x-internal-call-secret');
  const INTERNAL_FUNCTIONS_SECRET = Deno.env.get('INTERNAL_FUNCTIONS_SECRET');
  const isInternalCall = internalCallSecret && INTERNAL_FUNCTIONS_SECRET && internalCallSecret === INTERNAL_FUNCTIONS_SECRET;

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  let supabaseClient: SupabaseClient;
  let userId: string | null = null;

  if (isInternalCall) {
    console.log('[auth] Internal call authorized. Using admin client.');
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    if (!supabaseServiceRoleKey) {
      return { 
        supabaseClient: null as any, 
        userId: null,
        errorResponse: new Response(
          JSON.stringify({ error: 'SUPABASE_SERVICE_ROLE_KEY is not set for internal call.' }), 
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      };
    }
    supabaseClient = createClient(supabaseUrl, supabaseServiceRoleKey);
  } else {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return {
        supabaseClient: null as any,
        userId: null,
        errorResponse: new Response(
          JSON.stringify({ error: 'Authentication failed', code: 'AUTH_HEADER_MISSING' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      };
    }

    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    supabaseClient = createClient(
      supabaseUrl,
      supabaseAnonKey,
      { global: { headers: { Authorization: authHeader } } }
    );
    
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return {
        supabaseClient: null as any,
        userId: null,
        errorResponse: new Response(
          JSON.stringify({ error: 'Authentication failed', code: 'INVALID_JWT', details: authError?.message }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      };
    }
    userId = user.id;
    console.log('[auth] Authenticated user:', userId);
  }

  return { supabaseClient, userId, errorResponse: undefined };
}
