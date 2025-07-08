import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Clinician } from "@/types/client";
import { useUser } from "@/context/UserContext";

export const useClinicianData = () => {
  const [clinicianData, setClinicianData] = useState<Clinician | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { userId, userRole } = useUser();

  useEffect(() => {
    const fetchClinicianData = async () => {
      try {
        setLoading(true);
        
        // Only fetch if user is a clinician and userId is available
        if (!userId || userRole !== 'clinician') {
          setClinicianData(null);
          setLoading(false);
          return;
        }
        
        const { data, error } = await supabase
          .from('clinicians')
          .select('*')
          .eq('id', userId)
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
  }, [userId, userRole]);

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
    console.log('[getClinicianTimeZone] CRITICAL: Fetching ONLY clinician timezone (no browser fallback):', clinicianId);
    
    const { data, error } = await supabase
      .from('clinicians')
      .select('clinician_time_zone')
      .eq('id', clinicianId)
      .single();
      
    if (error) {
      console.error('[getClinicianTimeZone] ERROR: Failed to fetch clinician timezone:', error);
      // CRITICAL: Still return default, but log the error clearly
      throw new Error(`Failed to fetch timezone for clinician ${clinicianId}: ${error.message}`);
    }
    
    if (!data?.clinician_time_zone) {
      console.error('[getClinicianTimeZone] ERROR: Clinician has no timezone set:', clinicianId);
      throw new Error(`Clinician ${clinicianId} has no timezone configured`);
    }
    
    const timeZone = String(data.clinician_time_zone);
    
    console.log('[getClinicianTimeZone] SUCCESS: Retrieved clinician timezone (browser-independent):', {
      clinicianId,
      timeZone,
      source: 'database_only'
    });
    
    return timeZone;
  } catch (error) {
    console.error('[getClinicianTimeZone] CRITICAL ERROR: Cannot retrieve clinician timezone:', error);
    // ELIMINATED: Browser timezone fallback - always fail if no clinician timezone
    throw error;
  }
};
