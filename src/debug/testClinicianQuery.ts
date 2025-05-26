import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Initialize Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL || "";
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseKey);

async function testClinicianQuery() {
  const clinicianId = "fba185bb-53cb-4be9-88b6-3d379255f667";

  // 1. Verify clinicians table schema
  console.log("Verifying clinicians table schema...");
  const { data: schema, error: schemaError } = await supabase.rpc("query", {
    query: `SELECT column_name, is_nullable FROM information_schema.columns WHERE table_name = 'clinicians'`,
  });

  if (schemaError) throw schemaError;
  console.log("Clinicians table schema:", schema);

  // 2. Query specific clinician data
  console.log(`\nTesting clinician query for ID: ${clinicianId}`);
  try {
    const { data: clinician, error } = await supabase
      .from("clinicians")
      .select("id, clinician_email, clinician_status, clinician_time_zone")
      .eq("id", clinicianId)
      .single();

    if (error) throw error;

    console.log("Clinician data:", clinician);

    if (!clinician) {
      console.error("Clinician not found");
      return;
    }

    console.log("Clinician details:", {
      id: clinician.id,
      email: clinician.clinician_email,
      status: clinician.clinician_status,
      timezone: clinician.clinician_time_zone,
    });
  } catch (error) {
    console.error("Error fetching clinician:", error);
  }
}

testClinicianQuery().catch(console.error);
