import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

async function testConnection() {
  try {
    console.log("Loading environment variables...");
    dotenv.config();

    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error(
        "Missing Supabase URL or Anon Key in environment variables",
      );
    }

    console.log("Initializing Supabase client...");
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log("Testing basic query...");
    const { data, error } = await supabase
      .from("clinicians")
      .select("*")
      .limit(1);

    if (error) throw error;

    console.log("Connection successful! First clinician:", data?.[0]?.id);
  } catch (error) {
    console.error("Connection test failed:", error);
  }
}

testConnection();
