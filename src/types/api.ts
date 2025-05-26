
/**
 * API Request and Response Types
 */

// Generic API error
export interface ApiError {
  code: string;
  message: string;
  details?: any;
}

// Generic API response
export interface ApiResponse<T> {
  data: T | null;
  error?: ApiError | null;
  success: boolean;
  status: number;
}

// Pagination interface
export interface PaginationInfo {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// Availability API types
export interface GetAvailabilityBlocksRequest {
  clinicianId: string;
  startDate?: string;
  endDate?: string;
}

export interface GetAvailabilityBlocksResponse extends ApiResponse<any[]> {
  pagination?: PaginationInfo;
}

export interface GetClinicianAvailabilityRequest {
  clinicianId: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
}

export interface GetClinicianAvailabilityResponse extends ApiResponse<any[]> {
  pagination?: PaginationInfo;
}

export interface GetAvailabilityExceptionsRequest {
  clinicianId?: string;
  startDate?: string;
  endDate?: string;
  isActive?: boolean;
  page?: number;
  pageSize?: number;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
}

export interface GetAvailabilityExceptionsResponse extends ApiResponse<any[]> {
  pagination?: PaginationInfo;
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
  status?: string;
  type?: string;
  page?: number;
  pageSize?: number;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
}

export interface GetAppointmentsResponse extends ApiResponse<any[]> {
  pagination?: PaginationInfo;
}

export interface GetAppointmentRequest {
  id: string;
}

export interface GetAppointmentResponse extends ApiResponse<any> {}

export interface CreateAppointmentRequest {
  client_id: string;
  clinician_id: string;
  start_at: string;
  end_at: string;
  type: string;
  notes?: string;
}

export interface CreateAppointmentResponse extends ApiResponse<any> {}

export interface UpdateAppointmentRequest {
  id: string;
  start_at?: string;
  end_at?: string;
  notes?: string;
  status?: string;
}

export interface UpdateAppointmentResponse extends ApiResponse<any> {}

export interface DeleteAppointmentRequest {
  id: string;
}

export interface DeleteAppointmentResponse extends ApiResponse<{ id: string }> {}
