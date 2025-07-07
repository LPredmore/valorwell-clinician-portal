
import { supabase } from '@/integrations/supabase/client';
import { Appointment } from '@/types/appointment';

export const fetchClinicianAppointments = async (clinicianId: string): Promise<Appointment[]> => {
  try {
    console.log('[fetchClinicianAppointments] Fetching clean appointments for clinician:', clinicianId);
    
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
          client_zip_code
        )
      `)
      .eq('clinician_id', clinicianId)
      .in('status', ['scheduled', 'completed', 'no-show']) // Get appointments that need to be shown
      .order('start_at', { ascending: true });

    if (error) {
      console.error('[fetchClinicianAppointments] Error:', error);
      throw error;
    }

    console.log(`[fetchClinicianAppointments] Found ${data?.length || 0} clean appointments`);

    const processedAppointments: Appointment[] = (data || [])
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
          client_zip_code: appointment.client.client_zip_code
        } : undefined,
        clientName: appointment.client 
          ? `${appointment.client.client_preferred_name || appointment.client.client_first_name || ''} ${appointment.client.client_last_name || ''}`.trim()
          : 'Unknown Client'
      }));

    console.log(`[fetchClinicianAppointments] Returning ${processedAppointments.length} clean appointments`);
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
