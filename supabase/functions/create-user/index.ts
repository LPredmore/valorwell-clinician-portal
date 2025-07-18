
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

    console.log(`=== CREATE USER DEBUG START ===`);
    console.log(`Request method: ${req.method}`);
    console.log(`Request URL: ${req.url}`);

    // Parse the request body
    let requestBody;
    try {
      requestBody = await req.json();
      console.log(`Request body parsed successfully:`, requestBody);
    } catch (parseError) {
      console.error(`Failed to parse request body:`, parseError);
      return new Response(
        JSON.stringify({ 
          error: "Invalid JSON in request body",
          details: parseError.message 
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { email, userData } = requestBody;
    
    console.log(`Extracted email: ${email}`);
    console.log(`Extracted userData:`, userData);
    
    if (!email) {
      console.error("Email is missing from request");
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

    console.log(`=== STEP 1: CHECKING DATABASE SCHEMA ===`);
    
    // Check if clinician_status_enum exists
    try {
      const { data: enumCheck, error: enumError } = await supabaseAdmin
        .rpc('check_table_exists', { check_table_name: 'clinicians' });
      
      console.log(`Clinicians table exists check:`, { data: enumCheck, error: enumError });
      
      // Try to get enum values
      const { data: enumData, error: enumQueryError } = await supabaseAdmin
        .from('information_schema.columns')
        .select('*')
        .eq('table_name', 'clinicians')
        .eq('column_name', 'clinician_status');
        
      console.log(`Clinician status column info:`, { data: enumData, error: enumQueryError });
      
    } catch (schemaError) {
      console.error("Schema check failed:", schemaError);
    }

    console.log(`=== STEP 2: CREATING AUTH USER ===`);
    console.log(`Attempting to create user with email: ${email}`);
    
    // Ensure userData contains temp_password
    if (!userData.temp_password) {
      userData.temp_password = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);
      console.log(`Generated temporary password for ${email}: ${userData.temp_password}`);
    }
    
    console.log(`User metadata for auth creation:`, {
      ...userData,
      is_admin: userData.is_admin || false
    });
    
    // Create user with admin privileges
    const { data: user, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: userData.temp_password,
      email_confirm: true,
      user_metadata: {
        ...userData,
        is_admin: userData.is_admin || false
      }
    });

    if (createError) {
      console.error("=== AUTH USER CREATION FAILED ===");
      console.error("Error details:", createError);
      console.error("Error message:", createError.message);
      console.error("Error status:", createError.status);
      return new Response(
        JSON.stringify({ 
          error: createError.message,
          debug_step: "auth_user_creation",
          details: createError
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("=== AUTH USER CREATION SUCCESS ===");
    console.log("Created user:", user);
    console.log("User ID:", user.user.id);

    // Create clinician record if role is clinician
    if (userData.role === 'clinician') {
      console.log(`=== STEP 3: CREATING CLINICIAN RECORD ===`);
      
      const clinicianData = {
        id: user.user.id,
        clinician_email: email,
        clinician_first_name: userData.first_name,
        clinician_last_name: userData.last_name,
        clinician_phone: userData.phone || null,
        is_admin: userData.is_admin || false
      };
      
      console.log("Clinician data to insert:", clinicianData);
      
      // Try without clinician_status first to see if enum is the issue
      console.log("=== TESTING: Inserting without clinician_status ===");
      const { data: testData, error: testError } = await supabaseAdmin
        .from('clinicians')
        .insert(clinicianData)
        .select();

      if (testError) {
        console.error("=== CLINICIAN CREATION FAILED (without status) ===");
        console.error("Error details:", testError);
        console.error("Error message:", testError.message);
        console.error("Error code:", testError.code);
        console.error("Error hint:", testError.hint);
        console.error("Error details:", testError.details);
        
        // Try to get more details about the clinicians table
        try {
          const { data: tableInfo, error: tableError } = await supabaseAdmin
            .from('information_schema.tables')
            .select('*')
            .eq('table_name', 'clinicians');
          console.log("Clinicians table info:", { data: tableInfo, error: tableError });
        } catch (infoError) {
          console.error("Failed to get table info:", infoError);
        }
        
        return new Response(
          JSON.stringify({ 
            error: testError.message,
            debug_step: "clinician_record_creation",
            error_code: testError.code,
            error_details: testError.details,
            error_hint: testError.hint,
            inserted_data: clinicianData
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      } else {
        console.log("=== CLINICIAN CREATION SUCCESS (without status) ===");
        console.log("Created clinician:", testData);
        
        // Now try to update with status
        console.log("=== TESTING: Updating with clinician_status ===");
        const { data: updateData, error: updateError } = await supabaseAdmin
          .from('clinicians')
          .update({ clinician_status: 'New' })
          .eq('id', user.user.id)
          .select();
          
        if (updateError) {
          console.error("=== STATUS UPDATE FAILED ===");
          console.error("Update error:", updateError);
        } else {
          console.log("=== STATUS UPDATE SUCCESS ===");
          console.log("Updated clinician:", updateData);
        }
      }
    }

    console.log(`=== CREATE USER DEBUG END ===`);

    // Return success response
    return new Response(
      JSON.stringify({ 
        message: "User created successfully", 
        user,
        clinician_created: userData.role === 'clinician',
        debug_info: {
          user_id: user.user.id,
          role: userData.role,
          email: email
        }
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("=== UNEXPECTED ERROR ===");
    console.error("Error:", error);
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);
    return new Response(
      JSON.stringify({ 
        error: "Internal server error",
        details: error.message,
        stack: error.stack
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});
