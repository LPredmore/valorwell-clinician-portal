import { Appointment, AppointmentStatus, AppointmentType } from './appointment';
import { AvailabilityBlock } from './availability';

/**
 * API Response Interface
 * Generic interface for all API responses
 */
export interface ApiResponse<T> {
  data: T | null;
  error: ApiError | null;
  status: number;
  success: boolean;
}

/**
 * API Error Interface
 * Represents an error returned from the API
 */
export interface ApiError {
  code: string;
  message: string;
  details?: any;
}

/**
 * Pagination Parameters Interface
 * Common parameters for paginated requests
 */
export interface PaginationParams {
  page?: number;
  pageSize?: number;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
}

/**
 * Date Range Parameters Interface
 * Common parameters for date-ranged requests
 */
export interface DateRangeParams {
  startDate: string;
  endDate: string;
  timeZone?: string;
}

/**
 * API Endpoints
 * Enum of all available API endpoints
 */
export enum ApiEndpoint {
  // Appointment endpoints
  GET_APPOINTMENTS = 'appointments',
  GET_APPOINTMENT = 'appointments/{id}',
  CREATE_APPOINTMENT = 'appointments',
  UPDATE_APPOINTMENT = 'appointments/{id}',
  DELETE_APPOINTMENT = 'appointments/{id}',
  
  // Availability endpoints
  GET_CLINICIAN_AVAILABILITY = 'clinicians/{id}/availability',
  
  // Deprecated availability endpoints - kept for backward compatibility
  GET_AVAILABILITY_BLOCKS = 'availability_blocks',
  GET_AVAILABILITY_BLOCK = 'availability_blocks/{id}',
  CREATE_AVAILABILITY_BLOCK = 'availability_blocks',
  UPDATE_AVAILABILITY_BLOCK = 'availability_blocks/{id}',
  DELETE_AVAILABILITY_BLOCK = 'availability_blocks/{id}',

  // Deprecated availability exceptions endpoints - kept for backward compatibility
  GET_AVAILABILITY_EXCEPTIONS = 'availability_exceptions',
  GET_AVAILABILITY_EXCEPTION = 'availability_exceptions/{id}',
  CREATE_AVAILABILITY_EXCEPTION = 'availability_exceptions',
  UPDATE_AVAILABILITY_EXCEPTION = 'availability_exceptions/{id}',
  DELETE_AVAILABILITY_EXCEPTION = 'availability_exceptions/{id}',
  
  // Clinician endpoints
  GET_CLINICIANS = 'clinicians',
  GET_CLINICIAN = 'clinicians/{id}',
  
  // Client endpoints
  GET_CLIENTS = 'clients',
  GET_CLIENT = 'clients/{id}'
}

/**
 * Appointment Request Types
 */

export interface GetAppointmentsRequest extends PaginationParams, DateRangeParams {
  clinicianId?: string;
  clientId?: string;
  status?: AppointmentStatus;
  type?: AppointmentType;
}

export interface GetAppointmentRequest {
  id: string;
}

export interface CreateAppointmentRequest {
  client_id: string;
  clinician_id: string;
  start_at: string;
  end_at: string;
  type: AppointmentType | string;
  status: AppointmentStatus | string;
  video_room_url?: string;
  notes?: string;
  appointment_recurring?: any;
  recurring_group_id?: string;
}

export interface UpdateAppointmentRequest {
  id: string;
  client_id?: string;
  clinician_id?: string;
  start_at?: string;
  end_at?: string;
  type?: AppointmentType | string;
  status?: AppointmentStatus | string;
  video_room_url?: string;
  notes?: string;
  appointment_recurring?: any;
  recurring_group_id?: string;
}

export interface DeleteAppointmentRequest {
  id: string;
}

/**
 * Appointment Response Types
 */

export interface GetAppointmentsResponse extends ApiResponse<Appointment[]> {
  pagination?: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

export interface GetAppointmentResponse extends ApiResponse<Appointment> {}

export interface CreateAppointmentResponse extends ApiResponse<Appointment> {}

export interface UpdateAppointmentResponse extends ApiResponse<Appointment> {}

export interface DeleteAppointmentResponse extends ApiResponse<{ id: string }> {}

/**
 * Availability Request Types
 */

export interface GetAvailabilityBlocksRequest extends PaginationParams, DateRangeParams {
  clinicianId?: string;
  isActive?: boolean;
}

export interface GetAvailabilityBlockRequest {
  id: string;
}

export interface CreateAvailabilityBlockRequest {
  clinician_id: string;
  start_at: string;
  end_at: string;
  is_active: boolean;
  recurring_pattern?: any;
}

export interface UpdateAvailabilityBlockRequest {
  id: string;
  clinician_id?: string;
  start_at?: string;
  end_at?: string;
  is_active?: boolean;
  recurring_pattern?: any;
}

export interface DeleteAvailabilityBlockRequest {
  id: string;
}

/**
 * Availability Response Types
 */

export interface GetAvailabilityBlocksResponse extends ApiResponse<AvailabilityBlock[]> {
  pagination?: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

export interface GetAvailabilityBlockResponse extends ApiResponse<AvailabilityBlock> {}

export interface CreateAvailabilityBlockResponse extends ApiResponse<AvailabilityBlock> {}

export interface UpdateAvailabilityBlockResponse extends ApiResponse<AvailabilityBlock> {}

export interface DeleteAvailabilityBlockResponse extends ApiResponse<{ id: string }> {}

/**
 * Availability Exception Request Types
 */

export interface GetAvailabilityExceptionsRequest extends PaginationParams {
  clinicianId?: string;
  startDate?: string;
  endDate?: string;
  isActive?: boolean;
}

export interface GetAvailabilityExceptionRequest {
  id: string;
}

export interface CreateAvailabilityExceptionRequest {
  clinician_id: string;
  specific_date: string;
  start_time: string;
  end_time: string;
  day_of_week?: string;
  is_active: boolean;
  is_deleted: boolean;
}

export interface UpdateAvailabilityExceptionRequest {
  id: string;
  clinician_id?: string;
  specific_date?: string;
  start_time?: string;
  end_time?: string;
  day_of_week?: string;
  is_active?: boolean;
  is_deleted?: boolean;
}

export interface DeleteAvailabilityExceptionRequest {
  id: string;
}

/**
 * Availability Exception Response Types
 */

export interface GetAvailabilityExceptionsResponse extends ApiResponse<AvailabilityBlock[]> {
  pagination?: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

export interface GetAvailabilityExceptionResponse extends ApiResponse<AvailabilityBlock> {}

export interface CreateAvailabilityExceptionResponse extends ApiResponse<AvailabilityBlock> {}

export interface UpdateAvailabilityExceptionResponse extends ApiResponse<AvailabilityBlock> {}

export interface DeleteAvailabilityExceptionResponse extends ApiResponse<{ id: string }> {}

/**
 * Clinician Availability Request Types
 */
export interface GetClinicianAvailabilityRequest {
  clinicianId: string;
  page?: number;
  pageSize?: number;
}

export interface GetClinicianAvailabilityResponse extends ApiResponse<AvailabilityBlock[]> {
  pagination?: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

/**
 * Clinician Request Types
 */

export interface GetCliniciansRequest extends PaginationParams {
  search?: string;
}

export interface GetClinicianRequest {
  id: string;
}

/**
 * Clinician Response Types
 */

export interface Clinician {
  id: string;
  clinician_first_name: string;
  clinician_last_name: string;
  clinician_professional_name: string;
  clinician_email: string;
  clinician_time_zone: string;
  clinician_bio?: string;
  clinician_image_url?: string;
  [key: string]: any; // For availability fields
}

export interface GetCliniciansResponse extends ApiResponse<Clinician[]> {
  pagination?: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

export interface GetClinicianResponse extends ApiResponse<Clinician> {}

/**
 * Client Request Types
 */

export interface GetClientsRequest extends PaginationParams {
  clinicianId?: string;
  search?: string;
}

export interface GetClientRequest {
  id: string;
}

/**
 * Client Response Types
 */

export interface Client {
  id: string;
  client_first_name: string;
  client_last_name: string;
  client_preferred_name: string;
  client_email: string;
  client_phone: string;
  client_status: string | null;
  client_date_of_birth: string | null;
  client_gender: string | null;
  client_address: string | null;
  client_city: string | null;
  client_state: string | null;
  client_zipcode: string | null;
  client_assigned_therapist: string | null;
  [key: string]: any;
}

export interface GetClientsResponse extends ApiResponse<Client[]> {
  pagination?: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

export interface GetClientResponse extends ApiResponse<Client> {}