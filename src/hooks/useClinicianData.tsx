
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
    console.log(`[getClinicianTimeZone] Fetching timezone for clinician ID: ${clinicianId}`);
    
    const { data, error } = await supabase
      .from('clinicians')
      .select('clinician_timezone, clinician_time_zone')
      .eq('id', clinicianId)
      .single();
      
    if (error) {
      console.error('[getClinicianTimeZone] Error fetching clinician timezone:', error);
      return 'America/Chicago'; // Default to Central Time
    }
    
    // Enhanced timezone resolution logic with detailed logging
    let resolvedTimeZone = 'America/Chicago'; // Default
    
    if (data) {
      console.log('[getClinicianTimeZone] Raw timezone data:', {
        clinician_timezone: data.clinician_timezone,
        clinician_time_zone: data.clinician_time_zone
      });
      
      // Array field takes precedence if it exists and has values
      if (Array.isArray(data.clinician_timezone) && data.clinician_timezone.length > 0) {
        resolvedTimeZone = data.clinician_timezone[0];
        console.log(`[getClinicianTimeZone] Using timezone from array: ${resolvedTimeZone}`);
      } 
      // Fall back to string field if array is empty or null
      else if (data.clinician_time_zone) {
        resolvedTimeZone = data.clinician_time_zone;
        console.log(`[getClinicianTimeZone] Using timezone from string field: ${resolvedTimeZone}`);
        
        // Fix database inconsistency - update the array field with the string value
        // This helps ensure future queries will work correctly with either field
        try {
          const { error: updateError } = await supabase
            .from('clinicians')
            .update({ clinician_timezone: [data.clinician_time_zone] })
            .eq('id', clinicianId);
            
          if (updateError) {
            console.error('[getClinicianTimeZone] Error updating timezone array:', updateError);
          } else {
            console.log(`[getClinicianTimeZone] Fixed timezone array for clinician ${clinicianId} with value [${data.clinician_time_zone}]`);
          }
        } catch (updateError) {
          console.error('[getClinicianTimeZone] Exception updating timezone array:', updateError);
        }
      } else {
        console.warn(`[getClinicianTimeZone] No timezone found for clinician ${clinicianId}, using default: ${resolvedTimeZone}`);
      }
    } else {
      console.warn(`[getClinicianTimeZone] No data returned for clinician ${clinicianId}, using default: ${resolvedTimeZone}`);
    }
    
    return resolvedTimeZone;
  } catch (error) {
    console.error('[getClinicianTimeZone] Exception in timezone resolution:', error);
    return 'America/Chicago'; // Default to Central Time on any error
  }
};
