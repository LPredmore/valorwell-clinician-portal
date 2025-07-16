import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface UpdateEmailRequest {
  clinician_id: string;
  new_email: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create admin client using service role key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get request data
    const { clinician_id, new_email }: UpdateEmailRequest = await req.json();

    console.log('Updating email for clinician:', clinician_id, 'to:', new_email);

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(new_email)) {
      return new Response(
        JSON.stringify({ error: 'Invalid email format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if email is already in use by another user
    const { data: existingAuthUser } = await supabaseAdmin.auth.admin.listUsers();
    const emailExists = existingAuthUser?.users?.some(user => 
      user.email === new_email && user.id !== clinician_id
    );

    if (emailExists) {
      return new Response(
        JSON.stringify({ error: 'Email is already in use by another user' }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if email is already in use by another clinician
    const { data: existingClinician, error: clinicianCheckError } = await supabaseAdmin
      .from('clinicians')
      .select('id')
      .eq('clinician_email', new_email)
      .neq('id', clinician_id)
      .single();

    if (clinicianCheckError && clinicianCheckError.code !== 'PGRST116') {
      console.error('Error checking clinician email:', clinicianCheckError);
      return new Response(
        JSON.stringify({ error: 'Database error checking email availability' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (existingClinician) {
      return new Response(
        JSON.stringify({ error: 'Email is already in use by another clinician' }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update auth.users email first
    const { data: authUpdateData, error: authUpdateError } = await supabaseAdmin.auth.admin.updateUserById(
      clinician_id,
      { email: new_email }
    );

    if (authUpdateError) {
      console.error('Error updating auth.users email:', authUpdateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update authentication email: ' + authUpdateError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Auth email updated successfully');

    // Update clinicians table email
    const { data: clinicianUpdateData, error: clinicianUpdateError } = await supabaseAdmin
      .from('clinicians')
      .update({ 
        clinician_email: new_email,
        updated_at: new Date().toISOString()
      })
      .eq('id', clinician_id)
      .select()
      .single();

    if (clinicianUpdateError) {
      console.error('Error updating clinician email:', clinicianUpdateError);
      
      // Rollback auth.users email change
      try {
        await supabaseAdmin.auth.admin.updateUserById(
          clinician_id,
          { email: authUpdateData?.user?.email || '' }
        );
        console.log('Rolled back auth email change');
      } catch (rollbackError) {
        console.error('Failed to rollback auth email change:', rollbackError);
      }

      return new Response(
        JSON.stringify({ error: 'Failed to update clinician email: ' + clinicianUpdateError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Clinician email updated successfully');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Email updated successfully',
        data: clinicianUpdateData
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error: any) {
    console.error('Error in update-clinician-email function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error: ' + error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
};

serve(handler);