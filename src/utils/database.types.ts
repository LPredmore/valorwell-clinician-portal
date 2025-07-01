
// Database schema validation utilities
// This file helps catch field name mismatches at development time

export interface DatabaseClient {
  id: string;
  client_first_name: string | null;
  client_last_name: string | null;
  client_preferred_name: string | null;
  client_email: string | null;
  client_phone: string | null;
  client_status: string | null;
  client_date_of_birth: string | null;
  client_gender: string | null;
  client_address: string | null;
  client_city: string | null;
  client_state: string | null;
  client_zip_code: string | null; // CORRECT: This is the actual database column name
  // Add other client fields as needed
}

export interface DatabaseAppointment {
  id: string;
  client_id: string;
  clinician_id: string;
  start_at: string;
  end_at: string;
  type: string;
  status: string;
  appointment_recurring: string | null;
  recurring_group_id: string | null;
  video_room_url: string | null;
  notes: string | null;
  appointment_timezone: string | null;
  clients?: DatabaseClient | null;
}

// Schema validation functions
export const validateClientFields = (selectString: string): boolean => {
  const requiredFields = [
    'client_first_name',
    'client_last_name', 
    'client_preferred_name',
    'client_email',
    'client_phone',
    'client_status',
    'client_date_of_birth',
    'client_gender',
    'client_address',
    'client_city',
    'client_state',
    'client_zip_code' // CORRECT field name
  ];

  const invalidFields = [
    'client_zipcode' // INVALID - this will trigger validation error
  ];

  // Check for invalid field names
  for (const invalidField of invalidFields) {
    if (selectString.includes(invalidField)) {
      console.error(`❌ Schema Validation Error: Invalid field name "${invalidField}" detected in query`);
      console.error(`✅ Suggestion: Use "client_zip_code" instead of "client_zipcode"`);
      return false;
    }
  }

  return true;
};

// Runtime schema validator for development
export const validateQuerySchema = (tableName: string, selectString: string): void => {
  if (process.env.NODE_ENV === 'development') {
    if (tableName === 'clients' || selectString.includes('clients(')) {
      if (!validateClientFields(selectString)) {
        throw new Error(`Schema validation failed for ${tableName} query`);
      }
    }
  }
};
