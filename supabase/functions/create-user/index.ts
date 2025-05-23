
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

// Function to verify that a user record exists in the appropriate table
async function verifyUserRecordExists(userId: string, role: string): Promise<{exists: boolean, error?: any}> {
  try {
    console.log(`Verifying ${role} record exists for user ${userId}`);
    let table = '';
    
    switch(role) {
      case 'admin':
        table = 'admins';
        break;
      case 'clinician':
        table = 'clinicians';
        break;
      case 'client':
        table = 'clients';
        break;
      default:
        throw new Error(`Invalid role: ${role}`);
    }
    
    const { data, error } = await supabaseAdmin
      .from(table)
      .select('id')
      .eq('id', userId)
      .single();
      
    if (error) {
      if (error.code === 'PGRST116') {
        // Not found error
        console.log(`No record found for ${role} with ID ${userId}`);
        return { exists: false };
      }
      
      console.error(`Error checking ${role} record:`, error);
      return { exists: false, error };
    }
    
    return { exists: true };
  } catch (error) {
    console.error('Error in verifyUserRecordExists:', error);
    return { exists: false, error };
  }
}

// Function to repair missing user records
async function repairMissingUserRecord(userId: string, role: string): Promise<{success: boolean, message: string, details?: any}> {
  try {
    console.log(`Attempting to repair missing ${role} record for user ${userId}`);
    
    // Call the repair function in the database
    const { data, error } = await supabaseAdmin.rpc(
      'repair_missing_user_record',
      { p_user_id: userId, p_role: role }
    );
    
    if (error) {
      console.error('Error repairing user record:', error);
      return {
        success: false,
        message: `Failed to repair ${role} record: ${error.message}`,
        details: error
      };
    }
    
    console.log('Repair function result:', data);
    return {
      success: true,
      message: `Successfully repaired ${role} record`,
      details: data
    };
  } catch (error) {
    console.error('Exception in repairMissingUserRecord:', error);
    return {
      success: false,
      message: `Exception repairing ${role} record: ${error.message}`,
      details: error
    };
  }
}

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
    
    // Special handling for organization emails
    if (email.startsWith('info@') || email.startsWith('contact@') || email.startsWith('support@')) {
      console.log(`Detected organizational email: ${email}`);
      
      // Generate a professional name from domain if one wasn't provided
      if (!userData.professional_name || userData.professional_name.trim() === '') {
        const domain = email.split('@')[1].split('.')[0];
        userData.professional_name = domain.charAt(0).toUpperCase() + domain.slice(1) + ' Provider';
        console.log(`Generated professional name for organizational email: ${userData.professional_name}`);
      }
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
    
    // If user was created, verify that the corresponding record exists in the appropriate table
    if (user?.user?.id) {
      console.log(`User created with ID ${user.user.id}, verifying corresponding record exists`);
      
      // Wait a moment for the trigger to process
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Verify if the record exists
      const verifyResult = await verifyUserRecordExists(user.user.id, userData.role);
      
      if (!verifyResult.exists) {
        console.warn(`Record for ${userData.role} with ID ${user.user.id} does not exist, attempting repair`);
        
        // Attempt to repair the missing record
        const repairResult = await repairMissingUserRecord(user.user.id, userData.role);
        
        if (!repairResult.success) {
          console.error(`Failed to repair ${userData.role} record:`, repairResult);
          
          // Check migration logs for any errors related to this user
          const { data: logs, error: logsError } = await supabaseAdmin
            .from('user_creation_logs')
            .select('*')
            .eq('user_id', user.user.id)
            .order('created_at', { ascending: false })
            .limit(5);
            
          if (logsError) {
            console.error("Error checking user creation logs:", logsError);
          }
          
          // Return success but with warnings about database issues
          return new Response(
            JSON.stringify({ 
              message: `User created with auth system, but ${userData.role} record may have issues`, 
              user,
              warnings: [`Failed to ensure ${userData.role} record exists in database`],
              repairAttempt: repairResult,
              creationLogs: logs || []
            }),
            {
              status: 201, // Created, but with warnings
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        } else {
          console.log(`Successfully repaired ${userData.role} record:`, repairResult);
          
          // Return success with note about repair
          return new Response(
            JSON.stringify({ 
              message: `User created successfully and ${userData.role} record repaired`, 
              user,
              repairInfo: repairResult
            }),
            {
              status: 200,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }
      } else {
        console.log(`${userData.role} record exists for user ${user.user.id}`);
      }
      
      // Check migration logs for any errors related to this user
      try {
        const { data: logs, error: logsError } = await supabaseAdmin
          .from('user_creation_logs')
          .select('*')
          .eq('user_id', user.user.id)
          .order('created_at', { ascending: false })
          .limit(5);
          
        if (logsError) {
          console.error("Error checking user creation logs:", logsError);
        } else if (logs && logs.length > 0) {
          const errorLogs = logs.filter(log => log.status === 'error');
          if (errorLogs.length > 0) {
            console.warn(`Found error logs for user ${user.user.id}:`, errorLogs);
            
            // Return success but include the warning about database issues
            return new Response(
              JSON.stringify({ 
                message: "User created with auth system, but there may be database issues", 
                user,
                warnings: errorLogs.map(log => `Error in ${log.action}: ${JSON.stringify(log.details)}`),
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
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      }
    );
  }
});
