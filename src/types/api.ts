
/**
 * API Request and Response Types
 */

// Availability API types
export interface GetAvailabilityBlocksRequest {
  clinicianId?: string;
  startDate?: string;
  endDate?: string;
}

export interface GetClinicianAvailabilityRequest {
  clinicianId: string;
  startDate?: string;
  endDate?: string;
}

// Client API types
export interface GetClientsRequest {
  limit?: number;
  offset?: number;
  search?: string;
}

export interface CreateClientRequest {
  client_first_name: string;
  client_last_name: string;
  client_email: string;
  client_phone: string;
  [key: string]: any;
}

export interface UpdateClientRequest {
  id: string;
  [key: string]: any;
}

// Appointment API types
export interface GetAppointmentsRequest {
  clinicianId?: string;
  clientId?: string;
  startDate?: string;
  endDate?: string;
}

export interface CreateAppointmentRequest {
  client_id: string;
  clinician_id: string;
  start_at: string;
  end_at: string;
  type: string;
  notes?: string;
}

export interface UpdateAppointmentRequest {
  id: string;
  start_at?: string;
  end_at?: string;
  notes?: string;
  status?: string;
}

// Generic API response
export interface ApiResponse<T> {
  data: T;
  error?: string;
  message?: string;
}
