
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
    const { data, error } = await supabase
      .from('clinicians')
      .select('clinician_timezone, clinician_time_zone')
      .eq('id', clinicianId)
      .single();
      
    if (error) {
      console.error('Error fetching clinician timezone:', error);
      return 'America/Chicago'; // Default to Central Time
    }
    
    // Implement fallback logic for timezone resolution
    let resolvedTimeZone = 'America/Chicago'; // Default fallback
    
    if (data) {
      // Case 1: Check for array-based timezone first
      if (Array.isArray(data.clinician_timezone) && data.clinician_timezone.length > 0) {
        resolvedTimeZone = data.clinician_timezone[0];
        console.log(`Using array-based timezone for clinician ${clinicianId}: ${resolvedTimeZone}`);
      } 
      // Case 2: Fall back to string-based timezone if array is empty or null
      else if (data.clinician_time_zone) {
        resolvedTimeZone = data.clinician_time_zone;
        console.log(`Using string-based timezone for clinician ${clinicianId}: ${resolvedTimeZone}`);
        
        // Optionally perform a one-time fix to copy string timezone to array field
        // This ensures future timezone lookups will find the array value
        try {
          const { error: updateError } = await supabase
            .from('clinicians')
            .update({ 
              clinician_timezone: [data.clinician_time_zone] 
            })
            .eq('id', clinicianId);
          
          if (updateError) {
            console.warn('Failed to update clinician_timezone array:', updateError);
          } else {
            console.log(`Successfully copied timezone string to array for clinician ${clinicianId}`);
          }
        } catch (updateErr) {
          console.error('Error during timezone field synchronization:', updateErr);
        }
      } 
      // Case 3: Both fields are missing, log warning and use default
      else {
        console.warn(`No timezone data found for clinician ${clinicianId}, using default: America/Chicago`);
      }
    } else {
      console.warn(`No clinician data found for ID ${clinicianId}, using default timezone`);
    }
    
    console.log(`Final resolved timezone for clinician ${clinicianId}: ${resolvedTimeZone}`);
    return resolvedTimeZone;
  } catch (error) {
    // No silent failures - log error and return default
    console.error('Exception in getClinicianTimeZone:', error);
    return 'America/Chicago'; // Default to Central Time as last resort
  }
};
