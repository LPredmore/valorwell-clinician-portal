
// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    const { userId } = await req.json();
    
    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'User ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Create a Supabase client with the service role key
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase URL or service role key not set');
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get the authorization header from the request
    const authHeader = req.headers.get('Authorization');
    
    // Verify the user is authenticated and has admin privileges
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Get auth user to verify admin status
    const token = authHeader.replace('Bearer ', '');
    const { data: { user: callingUser }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !callingUser) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized', details: userError?.message }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Check if calling user is admin by checking is_admin flag in clinicians table
    const { data: clinician, error: clinicianError } = await supabase
      .from('clinicians')
      .select('is_admin')
      .eq('id', callingUser.id)
      .maybeSingle();
    
    if (clinicianError || !clinician || !clinician.is_admin) {
      return new Response(
        JSON.stringify({ error: 'Only administrators can delete users' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Delete the user using the admin API
    const { error: deleteError } = await supabase.auth.admin.deleteUser(userId);
    
    if (deleteError) {
      throw deleteError;
    }
    
    return new Response(
      JSON.stringify({ success: true, message: 'User deleted successfully' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('Error in delete-user function:', error);
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
})
