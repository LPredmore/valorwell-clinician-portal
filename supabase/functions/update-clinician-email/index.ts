import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface UpdateEmailRequest {
  clinician_id: string;
  new_email: string;
  correlation_id?: string;
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
    const { clinician_id, new_email, correlation_id }: UpdateEmailRequest = await req.json();
    const logPrefix = correlation_id ? `[${correlation_id}]` : '[EMAIL-UPDATE]';

    console.log(`${logPrefix} Starting email update process:`, {
      clinician_id,
      new_email,
      timestamp: new Date().toISOString(),
      correlation_id
    });

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
    console.log(`${logPrefix} Updating auth.users email...`);
    const authStartTime = Date.now();
    
    const { data: authUpdateData, error: authUpdateError } = await supabaseAdmin.auth.admin.updateUserById(
      clinician_id,
      { email: new_email }
    );

    const authDuration = Date.now() - authStartTime;

    if (authUpdateError) {
      console.error(`${logPrefix} Error updating auth.users email:`, {
        error: authUpdateError,
        duration: authDuration,
        timestamp: new Date().toISOString()
      });
      return new Response(
        JSON.stringify({ error: 'Failed to update authentication email: ' + authUpdateError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`${logPrefix} Auth email updated successfully:`, {
      duration: authDuration,
      old_email: authUpdateData?.user?.email,
      new_email,
      timestamp: new Date().toISOString()
    });

    // Update clinicians table email
    console.log(`${logPrefix} Updating clinicians table email...`);
    const clinicianStartTime = Date.now();
    
    const { data: clinicianUpdateData, error: clinicianUpdateError } = await supabaseAdmin
      .from('clinicians')
      .update({ 
        clinician_email: new_email,
        updated_at: new Date().toISOString()
      })
      .eq('id', clinician_id)
      .select()
      .single();

    const clinicianDuration = Date.now() - clinicianStartTime;

    if (clinicianUpdateError) {
      console.error(`${logPrefix} Error updating clinician email:`, {
        error: clinicianUpdateError,
        duration: clinicianDuration,
        timestamp: new Date().toISOString()
      });
      
      // Rollback auth.users email change
      console.log(`${logPrefix} Rolling back auth.users email change...`);
      try {
        const rollbackStartTime = Date.now();
        await supabaseAdmin.auth.admin.updateUserById(
          clinician_id,
          { email: authUpdateData?.user?.email || '' }
        );
        const rollbackDuration = Date.now() - rollbackStartTime;
        console.log(`${logPrefix} Rolled back auth email change successfully:`, {
          duration: rollbackDuration,
          timestamp: new Date().toISOString()
        });
      } catch (rollbackError) {
        console.error(`${logPrefix} Failed to rollback auth email change:`, rollbackError);
      }

      return new Response(
        JSON.stringify({ error: 'Failed to update clinician email: ' + clinicianUpdateError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`${logPrefix} Clinician email updated successfully:`, {
      duration: clinicianDuration,
      old_email: clinicianUpdateData?.clinician_email,
      new_email,
      timestamp: new Date().toISOString()
    });

    // Final verification step
    console.log(`${logPrefix} Verifying email sync after update...`);
    const verifyStartTime = Date.now();
    
    try {
      const { data: verifyData, error: verifyError } = await supabaseAdmin.rpc('validate_clinician_email_consistency');
      const verifyDuration = Date.now() - verifyStartTime;
      
      if (verifyError) {
        console.warn(`${logPrefix} Email sync verification failed:`, {
          error: verifyError,
          duration: verifyDuration
        });
      } else {
        const mismatch = verifyData?.find((row: any) => row.clinician_id === clinician_id);
        if (mismatch) {
          console.warn(`${logPrefix} EMAIL SYNC MISMATCH DETECTED AFTER UPDATE:`, {
            clinician_id: mismatch.clinician_id,
            auth_email: mismatch.auth_email,
            clinician_email: mismatch.clinician_email,
            status: mismatch.status,
            duration: verifyDuration
          });
        } else {
          console.log(`${logPrefix} Email sync verification passed:`, {
            duration: verifyDuration,
            timestamp: new Date().toISOString()
          });
        }
      }
    } catch (verifyError) {
      console.error(`${logPrefix} Email sync verification error:`, verifyError);
    }

    console.log(`${logPrefix} Email update process completed successfully:`, {
      total_duration: Date.now() - authStartTime,
      auth_duration: authDuration,
      clinician_duration: clinicianDuration,
      timestamp: new Date().toISOString()
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Email updated successfully',
        data: clinicianUpdateData,
        correlation_id
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