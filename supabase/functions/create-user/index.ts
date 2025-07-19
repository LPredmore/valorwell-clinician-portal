import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.21.0";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

serve(async (req) => {
  try {
    console.log('📥 Received request:', req.method, req.url);

    // 1) Preflight
    if (req.method === 'OPTIONS') {
      console.log('🔄 Handling preflight');
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    // 2) Parse JSON
    let body: any;
    try {
      body = await req.json();
      console.log('✅ Parsed body:', body);
    } catch (err) {
      console.error('⚠️ JSON parse error:', err);
      return new Response(
        JSON.stringify({ step: 'parsing', error: err.message }),
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const { email, userData } = body;
    console.log('🧩 Extracted email & userData:', email, userData);

    if (!email) {
      console.error("❌ Email is missing from request");
      return new Response(
        JSON.stringify({ step: 'validation', error: "Email is required" }),
        { status: 400, headers: CORS_HEADERS }
      );
    }

    if (!userData) {
      console.error("❌ User data is missing from request");
      return new Response(
        JSON.stringify({ step: 'validation', error: "User data is required" }),
        { status: 400, headers: CORS_HEADERS }
      );
    }

    console.log(`🔍 Checking if user exists: ${email}`);

    // Check for existing user using the correct method
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers.users.find(user => user.email === email);
    
    if (existingUser) {
      console.log("⚠️ User already exists, returning error");
      return new Response(
        JSON.stringify({ step: 'duplicate_check', error: "User already exists with this email" }),
        { status: 409, headers: CORS_HEADERS }
      );
    }
    
    console.log("✅ User doesn't exist, proceeding with creation");

    // 3) Create auth user
    const userMetadata = {
      first_name: userData.first_name,
      last_name: userData.last_name,
      phone: userData.phone,
      role: userData.role,
      temp_password: userData.temp_password,
      is_admin: userData.is_admin || false
    };
    
    console.log('🛠️ Creating auth user with metadata:', userMetadata);
    
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: userData.temp_password || "temppass1234",
      user_metadata: userMetadata,
      email_confirm: true
    });

    if (createError) {
      console.error('❌ auth.admin.createUser failed:', createError);
      return new Response(
        JSON.stringify({ step: 'auth_user_creation', error: createError.message }),
        { status: 400, headers: CORS_HEADERS }
      );
    }
    console.log('✅ auth user created:', newUser.user?.id);

    // 4) Wait for trigger to execute and verify record creation
    console.log('⏳ Waiting for database trigger to create role-specific record...');
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 5) Verify role-specific record was created by trigger
    if (userData.role === 'clinician' || userData.role === 'admin') {
      console.log('🩺 Verifying clinician record creation');
      const { data: clinicianRecord, error: clinicianCheckError } = await supabaseAdmin
        .from('clinicians')
        .select('*')
        .eq('id', newUser.user!.id)
        .single();

      if (clinicianCheckError || !clinicianRecord) {
        console.error('❌ clinician record verification failed:', clinicianCheckError);
        return new Response(
          JSON.stringify({ 
            step: 'clinician_record_verification', 
            error: 'Clinician record not created by trigger',
            details: clinicianCheckError?.message
          }),
          { status: 500, headers: CORS_HEADERS }
        );
      }
      console.log('✅ clinician record verified:', clinicianRecord.id);
    } else if (userData.role === 'client') {
      console.log('👤 Verifying client record creation');
      const { data: clientRecord, error: clientCheckError } = await supabaseAdmin
        .from('clients')
        .select('*')
        .eq('id', newUser.user!.id)
        .single();

      if (clientCheckError || !clientRecord) {
        console.error('❌ client record verification failed:', clientCheckError);
        return new Response(
          JSON.stringify({ 
            step: 'client_record_verification', 
            error: 'Client record not created by trigger',
            details: clientCheckError?.message
          }),
          { status: 500, headers: CORS_HEADERS }
        );
      }
      console.log('✅ client record verified:', clientRecord.id);
    }

    // 6) Success
    console.log('🎉 create-user succeeded for:', newUser.user?.id);
    return new Response(
      JSON.stringify({ 
        success: true, 
        user: newUser.user,
        message: "User created successfully"
      }),
      { status: 200, headers: CORS_HEADERS }
    );
  } catch (err) {
    console.error('🔥 Unexpected error:', err);
    return new Response(
      JSON.stringify({ step: 'unexpected', error: err.message }),
      { status: 500, headers: CORS_HEADERS }
    );
  }
});