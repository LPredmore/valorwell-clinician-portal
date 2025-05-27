import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Clinician } from "@/types/client";

export const useClinicianData = () => {
  const [clinicianData, setClinicianData] = useState<Clinician | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchClinicianData = async () => {
      try {
        setLoading(true);
        
        // Get the first clinician for now (in a real app, you would get the current user's clinician)
        const { data, error } = await supabase
          .from('clinicians')
          .select('*')
          .limit(1)
          .single();

        if (error) {
          throw error;
        }

        setClinicianData(data);
      } catch (err) {
        console.error('Error fetching clinician data:', err);
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchClinicianData();
  }, []);

  return { clinicianData, loading, error };
};

export const getClinicianById = async (clinicianId: string) => {
  try {
    const { data, error } = await supabase
      .from('clinicians')
      .select('*')
      .eq('id', clinicianId)
      .single();
      
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching clinician:', error);
    return null;
  }
};

export const getClinicianTimeZone = async (clinicianId: string): Promise<string> => {
  try {
    console.log('[getClinicianTimeZone] Fetching timezone for clinician:', clinicianId);
    
    const { data, error } = await supabase
      .from('clinicians')
      .select('clinician_time_zone')
      .eq('id', clinicianId)
      .single();
      
    if (error) {
      console.error('Error fetching clinician timezone:', error);
      return 'America/Chicago'; // Default to Central Time
    }
    
    console.log('[getClinicianTimeZone] Raw timezone data:', {
      data,
      timezone: data?.clinician_time_zone,
      type: typeof data?.clinician_time_zone
    });
    
    // Use the string field which is now the source of truth
    let timeZone = data?.clinician_time_zone || 'America/Chicago';
    
    // Ensure it's a string (should always be now)
    timeZone = String(timeZone);
    
    console.log('[getClinicianTimeZone] Final processed timezone:', {
      timeZone,
      type: typeof timeZone,
      isString: typeof timeZone === 'string'
    });
    
    return timeZone;
  } catch (error) {
    console.error('Error fetching clinician timezone:', error);
    return 'America/Chicago'; // Default to Central Time
  }
};
