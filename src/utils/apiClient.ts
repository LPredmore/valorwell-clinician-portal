import { supabase } from '@/integrations/supabase/client';
import { CalendarDebugUtils } from './calendarDebugUtils';
import { validateAppointmentData, validateAvailabilityBlockData, validateAvailabilityExceptionData } from './validationUtils';
import { SchemaValidationError, handleValidationError } from './validationUtils';
import * as ApiTypes from '@/types/api';
import { Appointment } from '@/types/appointment';
import { AvailabilityBlock, AvailabilityException } from '@/types/availability';

// Component name for logging
const COMPONENT_NAME = 'ApiClient';

/**
 * Calendar API Client
 * Provides typed methods for interacting with the calendar API
 */
export class CalendarApiClient {
  /**
   * Formats an API endpoint with path parameters
   * @param endpoint The endpoint template
   * @param params The path parameters
   * @returns The formatted endpoint
   */
  private static formatEndpoint(endpoint: string, params: Record<string, string> = {}): string {
    let formattedEndpoint = endpoint;
    
    for (const [key, value] of Object.entries(params)) {
      formattedEndpoint = formattedEndpoint.replace(`{${key}}`, value);
    }
    
    return formattedEndpoint;
  }
  
  /**
   * Handles API errors
   * @param error The error to handle
   * @param operation The operation that failed
   * @returns A standardized API error
   */
  private static handleApiError(error: any, operation: string): ApiTypes.ApiError {
    CalendarDebugUtils.error(COMPONENT_NAME, `API error in ${operation}`, error);
    
    return {
      code: error.code || 'UNKNOWN_ERROR',
      message: error.message || `An error occurred during ${operation}`,
      details: error.details || error
    };
  }
  
  /**
   * Creates a standardized API response
   * @param data The response data
   * @param error The response error
   * @param status The response status
   * @returns A standardized API response
   */
  private static createApiResponse<T>(
    data: T | null, 
    error: ApiTypes.ApiError | null, 
    status: number
  ): ApiTypes.ApiResponse<T> {
    return {
      data,
      error,
      status,
      success: !error && status >= 200 && status < 300
    };
  }
  
  /**
   * Fetches appointments for a clinician
   * @param request The request parameters
   * @returns A promise that resolves to the appointments response
   */
  public static async getAppointments(
    request: ApiTypes.GetAppointmentsRequest
  ): Promise<ApiTypes.GetAppointmentsResponse> {
    try {
      CalendarDebugUtils.log(COMPONENT_NAME, 'Fetching appointments', request);
      
      const { 
        clinicianId, 
        clientId, 
        startDate, 
        endDate, 
        status, 
        type,
        page = 1,
        pageSize = 100,
        orderBy = 'start_at',
        orderDirection = 'asc'
      } = request;
      
      // Build query
      let query = supabase
        .from('appointments')
        .select('*')
        .order(orderBy, { ascending: orderDirection === 'asc' });
      
      // Add filters
      if (clinicianId) {
        query = query.eq('clinician_id', clinicianId);
      }
      
      if (clientId) {
        query = query.eq('client_id', clientId);
      }
      
      if (startDate) {
        query = query.gte('start_at', startDate);
      }
      
      if (endDate) {
        query = query.lt('end_at', endDate);
      }
      
      if (status) {
        query = query.eq('status', status);
      }
      
      if (type) {
        query = query.eq('type', type);
      }
      
      // Add pagination
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);
      
      // Execute query
      const { data, error, count } = await query;
      
      if (error) {
        throw error;
      }
      
      // Validate response data
      const validatedData = validateAppointmentData(data, true) as Appointment[] | null;
      
      return {
        data: validatedData,
        error: null,
        status: 200,
        success: true,
        pagination: {
          total: count || 0,
          page,
          pageSize,
          totalPages: Math.ceil((count || 0) / pageSize)
        }
      };
    } catch (error) {
      if (error instanceof SchemaValidationError) {
        return handleValidationError(error, {
          data: null,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid appointment data received from API',
            details: error.message
          },
          status: 422,
          success: false
        });
      }
      
      return {
        data: null,
        error: this.handleApiError(error, 'getAppointments'),
        status: 500,
        success: false
      };
    }
  }
  
  /**
   * Fetches a single appointment by ID
   * @param request The request parameters
   * @returns A promise that resolves to the appointment response
   */
  public static async getAppointment(
    request: ApiTypes.GetAppointmentRequest
  ): Promise<ApiTypes.GetAppointmentResponse> {
    try {
      CalendarDebugUtils.log(COMPONENT_NAME, 'Fetching appointment', request);
      
      const { id } = request;
      
      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) {
        throw error;
      }
      
      // Validate response data
      const validatedData = validateAppointmentData(data) as Appointment | null;
      
      return {
        data: validatedData,
        error: null,
        status: 200,
        success: true
      };
    } catch (error) {
      if (error instanceof SchemaValidationError) {
        return handleValidationError(error, {
          data: null,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid appointment data received from API',
            details: error.message
          },
          status: 422,
          success: false
        });
      }
      
      return {
        data: null,
        error: this.handleApiError(error, 'getAppointment'),
        status: 500,
        success: false
      };
    }
  }
  
  /**
   * Creates a new appointment
   * @param request The request parameters
   * @returns A promise that resolves to the created appointment response
   */
  public static async createAppointment(
    request: ApiTypes.CreateAppointmentRequest
  ): Promise<ApiTypes.CreateAppointmentResponse> {
    try {
      CalendarDebugUtils.log(COMPONENT_NAME, 'Creating appointment', request);
      
      const { data, error } = await supabase
        .from('appointments')
        .insert(request)
        .select()
        .single();
      
      if (error) {
        throw error;
      }
      
      // Validate response data
      const validatedData = validateAppointmentData(data) as Appointment | null;
      
      return {
        data: validatedData,
        error: null,
        status: 201,
        success: true
      };
    } catch (error) {
      if (error instanceof SchemaValidationError) {
        return handleValidationError(error, {
          data: null,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid appointment data received from API',
            details: error.message
          },
          status: 422,
          success: false
        });
      }
      
      return {
        data: null,
        error: this.handleApiError(error, 'createAppointment'),
        status: 500,
        success: false
      };
    }
  }
  
  /**
   * Updates an existing appointment
   * @param request The request parameters
   * @returns A promise that resolves to the updated appointment response
   */
  public static async updateAppointment(
    request: ApiTypes.UpdateAppointmentRequest
  ): Promise<ApiTypes.UpdateAppointmentResponse> {
    try {
      CalendarDebugUtils.log(COMPONENT_NAME, 'Updating appointment', request);
      
      const { id, ...updateData } = request;
      
      const { data, error } = await supabase
        .from('appointments')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      
      if (error) {
        throw error;
      }
      
      // Validate response data
      const validatedData = validateAppointmentData(data) as Appointment | null;
      
      return {
        data: validatedData,
        error: null,
        status: 200,
        success: true
      };
    } catch (error) {
      if (error instanceof SchemaValidationError) {
        return handleValidationError(error, {
          data: null,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid appointment data received from API',
            details: error.message
          },
          status: 422,
          success: false
        });
      }
      
      return {
        data: null,
        error: this.handleApiError(error, 'updateAppointment'),
        status: 500,
        success: false
      };
    }
  }
  
  /**
   * Deletes an appointment
   * @param request The request parameters
   * @returns A promise that resolves to the delete response
   */
  public static async deleteAppointment(
    request: ApiTypes.DeleteAppointmentRequest
  ): Promise<ApiTypes.DeleteAppointmentResponse> {
    try {
      CalendarDebugUtils.log(COMPONENT_NAME, 'Deleting appointment', request);
      
      const { id } = request;
      
      const { error } = await supabase
        .from('appointments')
        .delete()
        .eq('id', id);
      
      if (error) {
        throw error;
      }
      
      return {
        data: { id },
        error: null,
        status: 200,
        success: true
      };
    } catch (error) {
      return {
        data: null,
        error: this.handleApiError(error, 'deleteAppointment'),
        status: 500,
        success: false
      };
    }
  }
  
  /**
   * Fetches availability blocks for a clinician
   * @param request The request parameters
   * @returns A promise that resolves to the availability blocks response
   */
  /**
   * Fetches clinician availability data directly from the clinicians table
   * @param request The request parameters
   * @returns A promise that resolves to the availability response
   */
  public static async getClinicianAvailability(
    request: ApiTypes.GetClinicianAvailabilityRequest
  ): Promise<ApiTypes.GetClinicianAvailabilityResponse> {
    try {
      CalendarDebugUtils.log(COMPONENT_NAME, 'Fetching clinician availability', request);
      
      const {
        clinicianId,
        page = 1,
        pageSize = 100
      } = request;
      
      if (!clinicianId) {
        throw new Error('Clinician ID is required');
      }
      
      // Build query to get clinician data with availability columns
      const query = supabase
        .from('clinicians')
        .select(`
          id,
          clinician_first_name,
          clinician_last_name,
          clinician_professional_name,
          clinician_email,
          clinician_time_zone,
          clinician_availability_start_monday_1,
          clinician_availability_end_monday_1,
          clinician_availability_timezone_monday_1,
          clinician_availability_start_monday_2,
          clinician_availability_end_monday_2,
          clinician_availability_timezone_monday_2,
          clinician_availability_start_monday_3,
          clinician_availability_end_monday_3,
          clinician_availability_timezone_monday_3,
          clinician_availability_start_tuesday_1,
          clinician_availability_end_tuesday_1,
          clinician_availability_timezone_tuesday_1,
          clinician_availability_start_tuesday_2,
          clinician_availability_end_tuesday_2,
          clinician_availability_timezone_tuesday_2,
          clinician_availability_start_tuesday_3,
          clinician_availability_end_tuesday_3,
          clinician_availability_timezone_tuesday_3,
          clinician_availability_start_wednesday_1,
          clinician_availability_end_wednesday_1,
          clinician_availability_timezone_wednesday_1,
          clinician_availability_start_wednesday_2,
          clinician_availability_end_wednesday_2,
          clinician_availability_timezone_wednesday_2,
          clinician_availability_start_wednesday_3,
          clinician_availability_end_wednesday_3,
          clinician_availability_timezone_wednesday_3,
          clinician_availability_start_thursday_1,
          clinician_availability_end_thursday_1,
          clinician_availability_timezone_thursday_1,
          clinician_availability_start_thursday_2,
          clinician_availability_end_thursday_2,
          clinician_availability_timezone_thursday_2,
          clinician_availability_start_thursday_3,
          clinician_availability_end_thursday_3,
          clinician_availability_timezone_thursday_3,
          clinician_availability_start_friday_1,
          clinician_availability_end_friday_1,
          clinician_availability_timezone_friday_1,
          clinician_availability_start_friday_2,
          clinician_availability_end_friday_2,
          clinician_availability_timezone_friday_2,
          clinician_availability_start_friday_3,
          clinician_availability_end_friday_3,
          clinician_availability_timezone_friday_3,
          clinician_availability_start_saturday_1,
          clinician_availability_end_saturday_1,
          clinician_availability_timezone_saturday_1,
          clinician_availability_start_saturday_2,
          clinician_availability_end_saturday_2,
          clinician_availability_timezone_saturday_2,
          clinician_availability_start_saturday_3,
          clinician_availability_end_saturday_3,
          clinician_availability_timezone_saturday_3,
          clinician_availability_start_sunday_1,
          clinician_availability_end_sunday_1,
          clinician_availability_timezone_sunday_1,
          clinician_availability_start_sunday_2,
          clinician_availability_end_sunday_2,
          clinician_availability_timezone_sunday_2,
          clinician_availability_start_sunday_3,
          clinician_availability_end_sunday_3,
          clinician_availability_timezone_sunday_3
        `)
        .eq('id', clinicianId)
        .single();
      
      // Execute query
      const { data, error } = await query;
      
      if (error) {
        throw error;
      }
      
      // Convert clinician data to availability blocks
      const availabilityBlocks = this.convertClinicianDataToAvailabilityBlocks(data);
      
      return {
        data: availabilityBlocks,
        error: null,
        status: 200,
        success: true,
        pagination: {
          total: availabilityBlocks.length,
          page,
          pageSize,
          totalPages: 1
        }
      };
    } catch (error) {
      return {
        data: null,
        error: this.handleApiError(error, 'getClinicianAvailability'),
        status: 500,
        success: false
      };
    }
  }
  
  /**
   * Converts clinician data to availability blocks
   * @param clinicianData The clinician data from the database
   * @returns An array of availability blocks
   */
  private static convertClinicianDataToAvailabilityBlocks(clinicianData: any): AvailabilityBlock[] {
    if (!clinicianData) return [];
    
    const availabilityBlocks: AvailabilityBlock[] = [];
    const daysOfWeek = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    
    // Process each day and slot
    daysOfWeek.forEach(day => {
      for (let slotNum = 1; slotNum <= 3; slotNum++) {
        const startTimeKey = `clinician_availability_start_${day}_${slotNum}`;
        const endTimeKey = `clinician_availability_end_${day}_${slotNum}`;
        const timezoneKey = `clinician_availability_timezone_${day}_${slotNum}`;
        
        // Only add slots that have both start and end times
        if (clinicianData[startTimeKey] && clinicianData[endTimeKey]) {
          // Generate a deterministic ID for the availability block
          const id = `clinician-${clinicianData.id}-${day}-${slotNum}`;
          
          // Create the availability block
          availabilityBlocks.push({
            id,
            clinician_id: clinicianData.id,
            start_at: '', // This would be calculated based on the specific date
            end_at: '',   // This would be calculated based on the specific date
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        }
      }
    });
    
    return availabilityBlocks;
  }
  
  /**
   * @deprecated Use getClinicianAvailability instead
   * This method is kept for backward compatibility
   */
  public static async getAvailabilityBlocks(
    request: ApiTypes.GetAvailabilityBlocksRequest
  ): Promise<ApiTypes.GetAvailabilityBlocksResponse> {
    return this.getClinicianAvailability(request);
  }
  
  /**
   * @deprecated Use getClinicianAvailability instead
   * This method is kept for backward compatibility
   */
  public static async getAvailabilityExceptions(
    request: ApiTypes.GetAvailabilityExceptionsRequest
  ): Promise<ApiTypes.GetAvailabilityExceptionsResponse> {
    try {
      CalendarDebugUtils.log(COMPONENT_NAME, 'Fetching availability exceptions', request);
      
      const { 
        clinicianId, 
        startDate, 
        endDate, 
        isActive,
        page = 1,
        pageSize = 100,
        orderBy = 'specific_date',
        orderDirection = 'asc'
      } = request;
      
      // Build query
      let query = supabase
        .from('availability_exceptions')
        .select('*')
        .order(orderBy, { ascending: orderDirection === 'asc' });
      
      // Add filters
      if (clinicianId) {
        query = query.eq('clinician_id', clinicianId);
      }
      
      if (startDate) {
        query = query.gte('specific_date', startDate);
      }
      
      if (endDate) {
        query = query.lte('specific_date', endDate);
      }
      
      if (isActive !== undefined) {
        query = query.eq('is_active', isActive);
      }
      
      // Add pagination
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);
      
      // Execute query
      const { data, error, count } = await query;
      
      if (error) {
        throw error;
      }
      
      // Validate response data
      const validatedData = validateAvailabilityExceptionData(data, true) as AvailabilityException[] | null;
      
      return {
        data: validatedData,
        error: null,
        status: 200,
        success: true,
        pagination: {
          total: count || 0,
          page,
          pageSize,
          totalPages: Math.ceil((count || 0) / pageSize)
        }
      };
    } catch (error) {
      if (error instanceof SchemaValidationError) {
        return handleValidationError(error, {
          data: null,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid availability exception data received from API',
            details: error.message
          },
          status: 422,
          success: false
        });
      }
      
      return {
        data: null,
        error: this.handleApiError(error, 'getAvailabilityExceptions'),
        status: 500,
        success: false
      };
    }
  }
}

/**
 * Fetch availability blocks for a clinician
 */
export const createAvailabilityBlock = async (data: {
  clinician_id: string;
  day_of_week: string;
  start_at: string;
  end_at: string;
}): Promise<AvailabilityBlock> => {
  const availabilityBlock: AvailabilityBlock = {
    id: `temp-${Date.now()}`,
    clinician_id: data.clinician_id,
    day_of_week: data.day_of_week,
    start_at: data.start_at,
    end_at: data.end_at,
    is_active: true,
    is_deleted: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  
  return availabilityBlock;
};

/**
 * Fetch availability blocks for a clinician
 */
export const getAvailabilityBlocks = async (
  request: GetAvailabilityBlocksRequest
): Promise<AvailabilityBlock[]> => {
  // Mock implementation - replace with actual API call
  return [];
};

/**
 * Fetch clinician availability from column-based data
 */
export const getClinicianAvailability = async (
  request: GetClinicianAvailabilityRequest
): Promise<AvailabilityBlock[]> => {
  // Mock implementation - replace with actual API call
  return [];
};

/**
 * Fetch availability exceptions for a clinician
 */
export const getAvailabilityExceptions = async (
  request: GetAvailabilityBlocksRequest
): Promise<AvailabilityException[]> => {
  try {
    let query = supabase
      .from('availability_exceptions')
      .select('*')
      .eq('is_deleted', false);

    if (request.clinicianId) {
      query = query.eq('clinician_id', request.clinicianId);
    }

    if (request.startDate) {
      query = query.gte('specific_date', request.startDate);
    }

    if (request.endDate) {
      query = query.lte('specific_date', request.endDate);
    }

    const { data, error } = await query.order('specific_date', { ascending: true });

    if (error) {
      console.error('Error fetching availability exceptions:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Error in getAvailabilityExceptions:', error);
    throw error;
  }
};

export default CalendarApiClient;
