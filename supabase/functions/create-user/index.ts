
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
      user_metadata: userData
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

    // Return success response
    return new Response(
      JSON.stringify({ 
        message: "User created successfully", 
        user 
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
