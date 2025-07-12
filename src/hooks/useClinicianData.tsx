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

// REMOVED: getClinicianTimeZone function - forcing browser timezone usage only
// This function has been removed to ensure all calendar operations use the browser timezone
// instead of fetching clinician-specific timezones from the database.
