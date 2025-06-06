
import { supabase } from "@/integrations/supabase/client";
import { CMS1500Claim } from "@/types/cms1500";

export const createCMS1500ClaimsForCompletedAppointment = async (appointmentId: string) => {
  try {
    console.log(`Creating CMS1500 claims for appointment: ${appointmentId}`);

    // Fetch appointment with client and clinician data
    const { data: appointment, error: appointmentError } = await supabase
      .from('appointments')
      .select(`
        *,
        client:clients(*),
        clinician:clinicians(*)
      `)
      .eq('id', appointmentId)
      .single();

    if (appointmentError) {
      throw new Error(`Failed to fetch appointment: ${appointmentError.message}`);
    }

    if (!appointment) {
      throw new Error('Appointment not found');
    }

    if (!appointment.client) {
      throw new Error('Client data not found for appointment');
    }

    if (!appointment.clinician) {
      throw new Error('Clinician data not found for appointment');
    }

    const client = appointment.client;
    const clinician = appointment.clinician;

    // Extract date from appointment start_at
    const serviceDate = new Date(appointment.start_at).toISOString().split('T')[0];

    // Get first diagnosis or null
    const firstDiagnosis = client.client_diagnosis && client.client_diagnosis.length > 0 
      ? client.client_diagnosis[0] 
      : null;

    // Base claim data shared between both claims
    const baseClaimData: Omit<CMS1500Claim, 'proc_code' | 'total_charge' | 'charge'> = {
      appointment_id: appointmentId,
      status: 'pending',
      remote_claimid: appointmentId,
      pcn: appointmentId,
      
      // Patient information
      pat_name_f: client.client_first_name || '',
      pat_name_l: client.client_last_name || '',
      pat_dob: client.client_date_of_birth || '',
      pat_sex: client.client_gender?.charAt(0)?.toUpperCase() || 'U',
      pat_addr_1: client.client_address || '',
      pat_city: client.client_city || '',
      pat_state: client.client_state || '',
      pat_zip: client.client_zipcode || '',

      // Insurance subscriber information (same as patient)
      ins_name_f: client.client_first_name || '',
      ins_name_l: client.client_last_name || '',
      ins_dob: client.client_date_of_birth || '',
      pat_rel: '18', // Self
      ins_number: client.client_champva || '',
      ins_group: null,
      ins_addr_1: client.client_address || '',
      ins_city: client.client_city || '',
      ins_state: client.client_state || '',
      ins_zip: client.client_zipcode || '',
      payerid: '84146',

      // Billing provider information (ValorWell LLC)
      bill_taxid: '933129745',
      bill_taxid_type: 'E',
      bill_npi: '1710758883',
      bill_name: 'ValorWell LLC',
      bill_taxonomy: '193200000X',
      bill_addr_1: '934 SW 163rd St',
      bill_addr_2: null,
      bill_city: 'Lees Summit',
      bill_state: 'MO',
      bill_zip: '64082',

      // Rendering provider information
      prov_npi: clinician.clinician_npi_number || '',
      prov_name_f: clinician.clinician_first_name || '',
      prov_name_l: clinician.clinician_last_name || '',
      prov_taxonomy: clinician.clinician_taxonomy_code || null,

      // Diagnosis information
      diag_1: firstDiagnosis,
      diag_2: null,
      diag_3: null,
      diag_4: null,
      diag_5: null,
      diag_6: null,
      diag_7: null,
      diag_8: null,
      diag_9: null,
      diag_10: null,
      diag_11: null,
      diag_12: null,

      // Service information
      accept_assign: 'Y',
      from_date: serviceDate,
      thru_date: serviceDate,
      mod_1: '95',
      place_of_service: '10',
      diag_ref: '1',
      units: 1
    };

    // Create session claim (CPT 90837)
    const sessionClaim: CMS1500Claim = {
      ...baseClaimData,
      proc_code: '90837',
      total_charge: 150,
      charge: 150
    };

    // Create PHQ-9 claim (CPT 96127)
    const phq9Claim: CMS1500Claim = {
      ...baseClaimData,
      proc_code: '96127',
      total_charge: 25,
      charge: 25
    };

    // Insert both claims into the database
    const { data: insertedClaims, error: insertError } = await supabase
      .from('CMS1500_claims')
      .insert([sessionClaim, phq9Claim])
      .select();

    if (insertError) {
      throw new Error(`Failed to insert claims: ${insertError.message}`);
    }

    console.log(`Successfully created ${insertedClaims?.length || 0} CMS1500 claims for appointment ${appointmentId}`);
    
    return {
      success: true,
      claimsCreated: insertedClaims?.length || 0,
      claims: insertedClaims
    };

  } catch (error) {
    console.error('Error creating CMS1500 claims:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      claimsCreated: 0
    };
  }
};
