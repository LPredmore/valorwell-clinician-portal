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
  public static async getAvailabilityBlocks(
    request: ApiTypes.GetAvailabilityBlocksRequest
  ): Promise<ApiTypes.GetAvailabilityBlocksResponse> {
    try {
      CalendarDebugUtils.log(COMPONENT_NAME, 'Fetching availability blocks', request);
      
      const { 
        clinicianId, 
        startDate, 
        endDate, 
        isActive,
        page = 1,
        pageSize = 100,
        orderBy = 'start_at',
        orderDirection = 'asc'
      } = request;
      
      // Build query
      let query = supabase
        .from('availability_blocks')
        .select('*')
        .order(orderBy, { ascending: orderDirection === 'asc' });
      
      // Add filters
      if (clinicianId) {
        query = query.eq('clinician_id', clinicianId);
      }
      
      if (startDate) {
        query = query.gte('start_at', startDate);
      }
      
      if (endDate) {
        query = query.lt('end_at', endDate);
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
      const validatedData = validateAvailabilityBlockData(data, true) as AvailabilityBlock[] | null;
      
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
            message: 'Invalid availability block data received from API',
            details: error.message
          },
          status: 422,
          success: false
        });
      }
      
      return {
        data: null,
        error: this.handleApiError(error, 'getAvailabilityBlocks'),
        status: 500,
        success: false
      };
    }
  }
  
  /**
   * Fetches availability exceptions for a clinician
   * @param request The request parameters
   * @returns A promise that resolves to the availability exceptions response
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

export default CalendarApiClient;