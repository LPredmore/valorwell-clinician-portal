import { supabase } from "@/integrations/supabase/client";
import { CMS1500Claim } from "@/types/cms1500";

// State code mapping for converting full state names to 2-character codes
const STATE_CODES: Record<string, string> = {
  'Alabama': 'AL', 'Alaska': 'AK', 'Arizona': 'AZ', 'Arkansas': 'AR', 'California': 'CA',
  'Colorado': 'CO', 'Connecticut': 'CT', 'Delaware': 'DE', 'Florida': 'FL', 'Georgia': 'GA',
  'Hawaii': 'HI', 'Idaho': 'ID', 'Illinois': 'IL', 'Indiana': 'IN', 'Iowa': 'IA',
  'Kansas': 'KS', 'Kentucky': 'KY', 'Louisiana': 'LA', 'Maine': 'ME', 'Maryland': 'MD',
  'Massachusetts': 'MA', 'Michigan': 'MI', 'Minnesota': 'MN', 'Mississippi': 'MS', 'Missouri': 'MO',
  'Montana': 'MT', 'Nebraska': 'NE', 'Nevada': 'NV', 'New Hampshire': 'NH', 'New Jersey': 'NJ',
  'New Mexico': 'NM', 'New York': 'NY', 'North Carolina': 'NC', 'North Dakota': 'ND', 'Ohio': 'OH',
  'Oklahoma': 'OK', 'Oregon': 'OR', 'Pennsylvania': 'PA', 'Rhode Island': 'RI', 'South Carolina': 'SC',
  'South Dakota': 'SD', 'Tennessee': 'TN', 'Texas': 'TX', 'Utah': 'UT', 'Vermont': 'VT',
  'Virginia': 'VA', 'Washington': 'WA', 'West Virginia': 'WV', 'Wisconsin': 'WI', 'Wyoming': 'WY'
};

// Relationship code mapping
const RELATIONSHIP_CODES: Record<string, string> = {
  'self': '18',
  'spouse': '01',
  'child': '19',
  'parent': '04',
  'other': '99'
};

// Place of service codes
const PLACE_OF_SERVICE_CODES: Record<string, string> = {
  'telehealth': '02',
  'office': '11', 
  'home': '12',
  'other': '99'
};

/**
 * Validates and normalizes a value to fit character constraints
 */
const validateAndTruncate = (value: string | null | undefined, maxLength: number, fieldName: string): string => {
  if (!value) return '';
  
  const trimmed = value.toString().trim();
  if (trimmed.length > maxLength) {
    console.warn(`[CMS1500] Field '${fieldName}' truncated from ${trimmed.length} to ${maxLength} characters:`, {
      original: trimmed,
      truncated: trimmed.substring(0, maxLength)
    });
    return trimmed.substring(0, maxLength);
  }
  return trimmed;
};

/**
 * Normalizes state value to 2-character code
 */
const normalizeState = (state: string | null | undefined): string => {
  if (!state) return '';
  
  const trimmed = state.trim();
  
  // If already 2 characters, return as-is
  if (trimmed.length === 2) {
    return trimmed.toUpperCase();
  }
  
  // Look up in state codes mapping
  const stateCode = STATE_CODES[trimmed] || STATE_CODES[trimmed.toLowerCase()] || 
                   Object.keys(STATE_CODES).find(key => 
                     key.toLowerCase() === trimmed.toLowerCase()
                   );
  
  if (stateCode) {
    return STATE_CODES[stateCode] || stateCode;
  }
  
  // Fallback: truncate to 2 characters
  console.warn(`[CMS1500] Unknown state '${trimmed}', truncating to 2 characters`);
  return trimmed.substring(0, 2).toUpperCase();
};

/**
 * Normalizes gender to single character
 */
const normalizeGender = (gender: string | null | undefined): string => {
  if (!gender) return 'U';
  
  const g = gender.toLowerCase().charAt(0);
  switch (g) {
    case 'm': return 'M';
    case 'f': return 'F';
    default: return 'U'; // Unknown
  }
};

/**
 * Normalizes relationship to 2-digit code
 */
const normalizeRelationship = (relationship: string | null | undefined): string => {
  if (!relationship) return '18'; // Default to 'self'
  
  const rel = relationship.toLowerCase().trim();
  return RELATIONSHIP_CODES[rel] || '18'; // Default to 'self'
};

export const createCMS1500ClaimsForCompletedAppointment = async (appointmentId: string) => {
  try {
    console.log(`[CMS1500] Creating claims for appointment: ${appointmentId}`);

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

    console.log(`[CMS1500] Processing claims for client: ${client.client_first_name} ${client.client_last_name}`);

    // Extract date from appointment start_at
    const serviceDate = new Date(appointment.start_at).toISOString().split('T')[0];

    // Get first diagnosis or null
    const firstDiagnosis = client.client_diagnosis && client.client_diagnosis.length > 0 
      ? client.client_diagnosis[0] 
      : null;

    // Validate and normalize all character-limited fields
    console.log(`[CMS1500] Validating and normalizing field data...`);
    
    const normalizedData = {
      // Patient information
      pat_name_f: validateAndTruncate(client.client_first_name, 35, 'pat_name_f'),
      pat_name_l: validateAndTruncate(client.client_last_name, 35, 'pat_name_l'),
      pat_sex: normalizeGender(client.client_gender),
      pat_addr_1: validateAndTruncate(client.client_address, 35, 'pat_addr_1'),
      pat_city: validateAndTruncate(client.client_city, 35, 'pat_city'),
      pat_state: normalizeState(client.client_state),
      pat_zip: validateAndTruncate(client.client_zip_code, 15, 'pat_zip'),
      
      // Insurance information
      ins_name_f: validateAndTruncate(client.client_first_name, 35, 'ins_name_f'),
      ins_name_l: validateAndTruncate(client.client_last_name, 35, 'ins_name_l'),
      pat_rel: normalizeRelationship('self'), // 2 characters max
      ins_number: validateAndTruncate(client.client_champva, 35, 'ins_number'),
      ins_addr_1: validateAndTruncate(client.client_address, 35, 'ins_addr_1'),
      ins_city: validateAndTruncate(client.client_city, 35, 'ins_city'),
      ins_state: normalizeState(client.client_state),
      ins_zip: validateAndTruncate(client.client_zip_code, 15, 'ins_zip'),
      
      // Provider information
      prov_name_f: validateAndTruncate(clinician.clinician_first_name, 35, 'prov_name_f'),
      prov_name_l: validateAndTruncate(clinician.clinician_last_name, 35, 'prov_name_l'),
      
      // Service information
      accept_assign: 'Y', // Single character
      place_of_service: '02', // 2 characters - telehealth
      bill_taxid_type: 'E', // Single character
      bill_state: 'MO', // 2 characters
    };

    console.log(`[CMS1500] Normalized data:`, {
      pat_state: normalizedData.pat_state,
      ins_state: normalizedData.ins_state,
      bill_state: normalizedData.bill_state,
      pat_sex: normalizedData.pat_sex,
      pat_rel: normalizedData.pat_rel,
      place_of_service: normalizedData.place_of_service,
      accept_assign: normalizedData.accept_assign,
      bill_taxid_type: normalizedData.bill_taxid_type
    });

    // Base claim data shared between both claims
    const baseClaimData: Omit<CMS1500Claim, 'proc_code' | 'total_charge' | 'charge'> = {
      appointment_id: appointmentId,
      status: 'pending',
      remote_claimid: appointmentId,
      pcn: appointmentId,
      
      // Patient information (normalized)
      pat_name_f: normalizedData.pat_name_f,
      pat_name_l: normalizedData.pat_name_l,
      pat_dob: client.client_date_of_birth || '',
      pat_sex: normalizedData.pat_sex,
      pat_addr_1: normalizedData.pat_addr_1,
      pat_city: normalizedData.pat_city,
      pat_state: normalizedData.pat_state,
      pat_zip: normalizedData.pat_zip,

      // Insurance subscriber information (normalized)
      ins_name_f: normalizedData.ins_name_f,
      ins_name_l: normalizedData.ins_name_l,
      ins_dob: client.client_date_of_birth || '',
      pat_rel: normalizedData.pat_rel,
      ins_number: normalizedData.ins_number,
      ins_group: null,
      ins_addr_1: normalizedData.ins_addr_1,
      ins_city: normalizedData.ins_city,
      ins_state: normalizedData.ins_state,
      ins_zip: normalizedData.ins_zip,
      payerid: '84146',

      // Billing provider information (ValorWell LLC)
      bill_taxid: '933129745',
      bill_taxid_type: normalizedData.bill_taxid_type,
      bill_npi: '1710758883',
      bill_name: 'ValorWell LLC',
      bill_taxonomy: '193200000X',
      bill_addr_1: '934 SW 163rd St',
      bill_addr_2: null,
      bill_city: 'Lees Summit',
      bill_state: normalizedData.bill_state,
      bill_zip: '64082',

      // Rendering provider information (normalized)
      prov_npi: clinician.clinician_npi_number || '',
      prov_name_f: normalizedData.prov_name_f,
      prov_name_l: normalizedData.prov_name_l,
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

      // Service information (normalized)
      accept_assign: normalizedData.accept_assign,
      from_date: serviceDate,
      thru_date: serviceDate,
      mod_1: null, // Remove modifier to avoid validation issues
      place_of_service: normalizedData.place_of_service,
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

    console.log(`[CMS1500] Attempting to insert claims...`);

    // Insert both claims into the database
    const { data: insertedClaims, error: insertError } = await supabase
      .from('CMS1500_claims')
      .insert([sessionClaim, phq9Claim])
      .select();

    if (insertError) {
      console.error(`[CMS1500] Insert error details:`, {
        message: insertError.message,
        details: insertError.details,
        hint: insertError.hint,
        code: insertError.code
      });
      throw new Error(`Failed to insert claims: ${insertError.message}`);
    }

    console.log(`[CMS1500] Successfully created ${insertedClaims?.length || 0} claims for appointment ${appointmentId}`);
    
    return {
      success: true,
      claimsCreated: insertedClaims?.length || 0,
      claims: insertedClaims
    };

  } catch (error) {
    console.error('[CMS1500] Error creating claims:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      claimsCreated: 0
    };
  }
};