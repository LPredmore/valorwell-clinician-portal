
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
    const { userId, email } = await req.json();
    let whereClause = {};
    
    if (userId) {
      whereClause = { 
        details: `details->>'user_id' = '${userId}'`
      };
      console.log(`Checking logs for user ID: ${userId}`);
    } else if (email) {
      whereClause = { 
        details: `details->>'email' = '${email}'`
      };
      console.log(`Checking logs for email: ${email}`);
    } else {
      return new Response(
        JSON.stringify({ 
          error: "Either userId or email is required" 
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Query migration_logs for entries related to this user
    const { data: logs, error: logsError } = await supabaseAdmin
      .from('migration_logs')
      .select('*')
      .or(`description.ilike.%Error inserting%,description.ilike.%created successfully%`)
      .filter(whereClause.details)
      .order('created_at', { ascending: false })
      .limit(20);

    if (logsError) {
      console.error("Error fetching logs:", logsError);
      return new Response(
        JSON.stringify({ 
          error: "Error fetching logs",
          details: logsError.message
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // If we have a userId, also get the user's metadata
    let userData = null;
    let userMetadataError = null;
    
    if (userId) {
      const { data: user, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId);
      if (!userError && user) {
        userData = {
          id: user.user.id,
          email: user.user.email,
          userMetadata: user.user.user_metadata,
          appMetadata: user.user.app_metadata,
          creationError: user.user.app_metadata?.creation_error || null,
        };
      } else {
        userMetadataError = userError?.message || "User not found";
      }
    }

    // Check for app_role enum
    const { data: enumData, error: enumError } = await supabaseAdmin.rpc(
      'check_enum_exists',
      { enum_name: 'app_role' }
    );

    const appRoleStatus = enumError ? 
      { exists: false, error: enumError.message } : 
      { exists: enumData, values: enumData ? ["admin", "clinician", "client"] : [] };

    // Return the logs and user metadata
    return new Response(
      JSON.stringify({ 
        logs,
        user: userData,
        userMetadataError,
        appRoleStatus,
        message: logs.length > 0 ? 
          "Found logs related to user creation" : 
          "No relevant logs found for this user"
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
