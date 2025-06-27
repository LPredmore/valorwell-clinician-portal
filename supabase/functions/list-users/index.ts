
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
    
    // Check if calling user is admin by querying admins table
    const { data: adminCheck, error: adminError } = await supabase
      .from('admins')
      .select('id')
      .eq('id', callingUser.id)
      .single();
    
    if (adminError || !adminCheck) {
      return new Response(
        JSON.stringify({ error: 'Only administrators can list users' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Get all users from Auth
    const { data: { users: authUsers }, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      throw authError;
    }
    
    // Map the auth users with data from role-specific tables
    const usersWithDetails = await Promise.all(
      authUsers.map(async (user) => {
        const role = user.user_metadata?.role || "unknown";
        let userData = {
          id: user.id,
          email: user.email || '',
          role: role,
          first_name: user.user_metadata?.first_name || '',
          last_name: user.user_metadata?.last_name || '',
          phone: user.user_metadata?.phone || null
        };
        
        // Get additional data from the respective tables based on role
        if (role === 'admin') {
          const { data: adminData } = await supabase
            .from('admins')
            .select('admin_first_name, admin_last_name, admin_phone')
            .eq('id', user.id)
            .single();
            
          if (adminData) {
            userData.first_name = adminData.admin_first_name || userData.first_name;
            userData.last_name = adminData.admin_last_name || userData.last_name;
            userData.phone = adminData.admin_phone || userData.phone;
          }
        } else if (role === 'clinician') {
          const { data: clinicianData } = await supabase
            .from('clinicians')
            .select('clinician_first_name, clinician_last_name, clinician_phone')
            .eq('id', user.id)
            .single();
            
          if (clinicianData) {
            userData.first_name = clinicianData.clinician_first_name || userData.first_name;
            userData.last_name = clinicianData.clinician_last_name || userData.last_name;
            userData.phone = clinicianData.clinician_phone || userData.phone;
          }
        } else if (role === 'client') {
          const { data: clientData } = await supabase
            .from('clients')
            .select('client_first_name, client_last_name, client_phone')
            .eq('id', user.id)
            .single();
            
          if (clientData) {
            userData.first_name = clientData.client_first_name || userData.first_name;
            userData.last_name = clientData.client_last_name || userData.last_name;
            userData.phone = clientData.client_phone || userData.phone;
          }
        }
        
        return userData;
      })
    );
    
    return new Response(
      JSON.stringify({ users: usersWithDetails }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('Error in list-users function:', error);
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
})
