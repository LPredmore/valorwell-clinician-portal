
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

  // JSON parse guard at the very top to catch malformed JSON
  let body: any;
  try {
    body = await req.json();
  } catch (err) {
    console.error('⚠️ JSON parse failed:', err);
    return new Response(
      JSON.stringify({ error: 'Bad JSON' }),
      { 
        status: 400, 
        headers: corsHeaders 
      }
    );
  }
  console.log('📥 create-user received body:', body);

  try {
    const { email, userData } = body;
    
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

    console.log(`=== STEP 1: CHECK FOR EXISTING USER ===`);
    
    // Check if user already exists
    try {
      const { data: existingUser, error: getUserError } = await supabaseAdmin.auth.admin.getUserById(email);
      if (existingUser && !getUserError) {
        console.log("=== USER ALREADY EXISTS ===");
        return new Response(
          JSON.stringify({ 
            error: "User already exists with this email",
            debug_step: "user_existence_check"
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    } catch (existenceError) {
      // User doesn't exist, which is what we want
      console.log("User doesn't exist, proceeding with creation");
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

    console.log(`=== STEP 3: WAITING FOR TRIGGER TO PROCESS ===`);
    
    // Small delay to allow trigger to complete
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Verify that the trigger created the appropriate record
    let verificationResult = null;
    if (userData.role === 'clinician') {
      console.log("=== VERIFYING CLINICIAN RECORD CREATION ===");
      const { data: clinicianRecord, error: verifyError } = await supabaseAdmin
        .from('clinicians')
        .select('id, clinician_email, clinician_status')
        .eq('id', user.user.id)
        .single();
        
      if (verifyError) {
        console.error("=== VERIFICATION FAILED: Clinician record not found ===");
        console.error("Verification error:", verifyError);
        verificationResult = { success: false, error: verifyError.message };
      } else {
        console.log("=== VERIFICATION SUCCESS: Clinician record found ===");
        console.log("Clinician record:", clinicianRecord);
        verificationResult = { success: true, record: clinicianRecord };
      }
    } else if (userData.role === 'client') {
      console.log("=== VERIFYING CLIENT RECORD CREATION ===");
      const { data: clientRecord, error: verifyError } = await supabaseAdmin
        .from('clients')
        .select('id, client_email, client_status')
        .eq('id', user.user.id)
        .single();
        
      if (verifyError) {
        console.error("=== VERIFICATION FAILED: Client record not found ===");
        console.error("Verification error:", verifyError);
        verificationResult = { success: false, error: verifyError.message };
      } else {
        console.log("=== VERIFICATION SUCCESS: Client record found ===");
        console.log("Client record:", clientRecord);
        verificationResult = { success: true, record: clientRecord };
      }
    } else if (userData.role === 'admin') {
      // For admin role, verify the record was created successfully in clinicians table with is_admin=true
      console.log("=== VERIFYING ADMIN RECORD CREATION ===");
      const { data: clinicianRecord, error: verifyError } = await supabaseAdmin
        .from('clinicians')
        .select('id, clinician_email, is_admin')
        .eq('id', user.user.id)
        .single();
        
      if (verifyError) {
        console.error("=== VERIFICATION FAILED: Admin record not found ===");
        console.error("Verification error:", verifyError);
        verificationResult = { success: false, error: verifyError.message };
      } else if (!clinicianRecord.is_admin) {
        console.error("=== VERIFICATION FAILED: Admin flag not set ===");
        verificationResult = { success: false, error: "Admin flag not set in clinician record" };
      } else {
        console.log("=== VERIFICATION SUCCESS: Admin record found ===");
        console.log("Admin record:", clinicianRecord);
        verificationResult = { success: true, record: clinicianRecord };
      }
    }

    console.log(`=== CREATE USER DEBUG END ===`);

    // Return success response
    return new Response(
      JSON.stringify({ 
        message: "User created successfully", 
        user,
        trigger_verification: verificationResult,
        debug_info: {
          user_id: user.user.id,
          role: userData.role,
          email: email,
          trigger_handled_creation: true
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
