
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.21.0";

// Create a Supabase client with the service role key (has admin privileges)
const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

serve(async (req) => {
  try {
    // CORS headers
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    };

    // Handle OPTIONS request for CORS preflight
    if (req.method === "OPTIONS") {
      return new Response(null, {
        headers: corsHeaders,
        status: 204,
      });
    }

    // Parse the request body
    const { email, userData } = await req.json();
    
    if (!email) {
      return new Response(
        JSON.stringify({ 
          error: "Email is required" 
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`Attempting to create user with email: ${email}`);
    
    // Ensure userData contains temp_password
    if (!userData.temp_password) {
      // Generate a random temporary password
      userData.temp_password = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);
      console.log(`Generated temporary password for ${email}: ${userData.temp_password}`);
    }
    
    // Create user with admin privileges
    const { data: user, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: userData.temp_password,
      email_confirm: true,
      user_metadata: {
        ...userData,
        // Include is_admin flag for clinician-admin dual roles
        is_admin: userData.is_admin || false
      }
    });

    if (createError) {
      console.error("Error creating user:", createError);
      return new Response(
        JSON.stringify({ 
          error: createError.message 
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("User created in auth.users, now creating clinician record");

    // Create clinician record if role is clinician
    if (userData.role === 'clinician') {
      const { error: clinicianError } = await supabaseAdmin
        .from('clinicians')
        .insert({
          id: user.user.id,
          clinician_email: email,
          clinician_first_name: userData.first_name,
          clinician_last_name: userData.last_name,
          clinician_phone: userData.phone || null,
          clinician_status: 'New',
          is_admin: userData.is_admin || false
        });

      if (clinicianError) {
        console.error("Error creating clinician record:", clinicianError);
        // Don't fail the entire request, just log the error
        console.log("User created in auth but clinician record failed");
      } else {
        console.log("Clinician record created successfully");
      }
    }

    // Return success response
    return new Response(
      JSON.stringify({ 
        message: "User created successfully", 
        user,
        clinician_created: userData.role === 'clinician'
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ 
        error: "Internal server error",
        details: error.message 
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});
