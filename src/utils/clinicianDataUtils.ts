
import { supabase } from '@/integrations/supabase/client';
import { Appointment } from '@/types/appointment';
import { BLOCKED_TIME_CLIENT_ID, isBlockedTimeAppointment, validateBlockedTimeConfig } from '@/utils/blockedTimeUtils';

export const fetchClinicianAppointments = async (clinicianId: string): Promise<Appointment[]> => {
  try {
    // Validate blocked time configuration before proceeding
    const configValidation = validateBlockedTimeConfig();
    if (!configValidation.isValid) {
      console.error('[fetchClinicianAppointments] Blocked time configuration error:', configValidation.error);
      // Continue with fallback filtering, but log the issue
    }
    
    console.log('[fetchClinicianAppointments] Fetching appointments for clinician:', clinicianId);
    
    const { data, error } = await supabase
      .from('appointments')
      .select(`
        *,
        client:clients!appointments_client_id_fkey (
          client_first_name,
          client_last_name,
          client_preferred_name,
          client_email,
          client_phone,
          client_status,
          client_date_of_birth,
          client_gender,
          client_address,
          client_city,
          client_state,
          client_zipcode
        )
      `)
      .eq('clinician_id', clinicianId)
      .neq('client_id', BLOCKED_TIME_CLIENT_ID) // Database-level filtering
      .order('start_at', { ascending: true });

    if (error) {
      console.error('[fetchClinicianAppointments] Error:', error);
      throw error;
    }

    console.log(`[fetchClinicianAppointments] Found ${data?.length || 0} appointments (excluding blocked time at DB level)`);

    // Process appointments with defense-in-depth filtering
    const processedAppointments: Appointment[] = (data || [])
      .filter(appointment => {
        // Double-check for blocked time (defense in depth)
        const isBlocked = isBlockedTimeAppointment(appointment);
        if (isBlocked) {
          console.warn('[fetchClinicianAppointments] Found blocked time appointment that passed DB filter:', appointment.id);
        }
        return !isBlocked;
      })
      .map(appointment => ({
        ...appointment,
        client: appointment.client ? {
          client_first_name: appointment.client.client_first_name || '',
          client_last_name: appointment.client.client_last_name || '',
          client_preferred_name: appointment.client.client_preferred_name || appointment.client.client_first_name || '',
          client_email: appointment.client.client_email || '',
          client_phone: appointment.client.client_phone || '',
          client_status: appointment.client.client_status,
          client_date_of_birth: appointment.client.client_date_of_birth,
          client_gender: appointment.client.client_gender,
          client_address: appointment.client.client_address,
          client_city: appointment.client.client_city,
          client_state: appointment.client.client_state,
          client_zipcode: appointment.client.client_zipcode
        } : undefined,
        clientName: appointment.client 
          ? `${appointment.client.client_preferred_name || appointment.client.client_first_name || ''} ${appointment.client.client_last_name || ''}`.trim()
          : 'Unknown Client'
      }));

    console.log(`[fetchClinicianAppointments] Returning ${processedAppointments.length} real appointments`);
    return processedAppointments;
  } catch (error) {
    console.error('[fetchClinicianAppointments] Error fetching appointments:', error);
    throw error;
  }
};

export const fetchClinicianProfile = async (clinicianId: string) => {
  try {
    console.log('[fetchClinicianProfile] Fetching profile for clinician:', clinicianId);
    
    const { data, error } = await supabase
      .from('clinicians')
      .select('*')
      .eq('id', clinicianId)
      .single();

    if (error) {
      console.error('[fetchClinicianProfile] Error:', error);
      throw error;
    }

    console.log('[fetchClinicianProfile] Profile fetched successfully');
    return data;
  } catch (error) {
    console.error('[fetchClinicianProfile] Error fetching profile:', error);
    throw error;
  }
};
