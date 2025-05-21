
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

    console.log(`Attempting to create user with email: ${email}, role: ${userData.role}`);
    
    // Check if app_role enum type exists to avoid database errors
    let appRoleExists = false;
    try {
      const { data: enumExists, error: enumError } = await supabaseAdmin.rpc(
        'check_enum_exists',
        { enum_name: 'app_role' }
      );
      
      if (enumError) {
        console.error("Error checking if app_role enum exists:", enumError);
      } else {
        appRoleExists = enumExists;
        console.log(`app_role enum exists: ${appRoleExists}`);
      }
    } catch (enumCheckError) {
      console.error("Exception checking enum:", enumCheckError);
    }
    
    // Ensure userData contains temp_password
    if (!userData.temp_password) {
      // Generate a random temporary password
      userData.temp_password = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);
      console.log(`Generated temporary password for ${email}: ${userData.temp_password}`);
    }
    
    // For clinicians, ensure we have the professional name field
    if (userData.role === 'clinician' && (!userData.professional_name || userData.professional_name.trim() === '')) {
      userData.professional_name = `${userData.first_name} ${userData.last_name}`.trim();
      console.log(`Set professional_name to "${userData.professional_name}" for clinician`);
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
          error: createError.message,
          details: "Error occurred during auth.admin.createUser" 
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    
    // If user was created, but we need to check if database insert worked
    if (user?.user?.id) {
      try {
        // Wait a moment for the trigger to process
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Check migration logs for any errors related to this user
        const { data: logs, error: logsError } = await supabaseAdmin
          .from('migration_logs')
          .select('*')
          .or(`description.ilike.%Error inserting%,description.ilike.%user created%`)
          .filter(`details->>'user_id'.eq.${user.user.id}`)
          .order('created_at', { ascending: false })
          .limit(5);
          
        if (logsError) {
          console.error("Error checking migration logs:", logsError);
        } else if (logs && logs.length > 0) {
          const errorLogs = logs.filter(log => log.description.includes('Error inserting'));
          if (errorLogs.length > 0) {
            console.warn(`Found error logs for user ${user.user.id}:`, errorLogs);
            
            // Return success but include the warning about database issues
            return new Response(
              JSON.stringify({ 
                message: "User created with auth system, but there may be database issues", 
                user,
                warnings: errorLogs.map(log => log.description),
                logs: errorLogs
              }),
              {
                status: 201, // Created, but with warnings
                headers: { ...corsHeaders, "Content-Type": "application/json" },
              }
            );
          }
        }
      } catch (logCheckError) {
        console.error("Error during log check:", logCheckError);
      }
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
