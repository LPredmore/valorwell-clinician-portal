/**
 * Calendar API Endpoints
 * Provides API endpoints for third-party integrations with the calendar system
 */

import { supabase } from '@/integrations/supabase/client';
import { Appointment } from '@/types/appointment';
import { DateTime } from 'luxon';

// API version
const API_VERSION = 'v1';

// Base URL for API endpoints
const API_BASE_URL = `/api/calendar/${API_VERSION}`;

/**
 * API Response interface
 */
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  meta?: {
    page?: number;
    pageSize?: number;
    totalCount?: number;
    totalPages?: number;
  };
}

/**
 * API Error interface
 */
interface ApiError {
  code: string;
  message: string;
  details?: any;
}

/**
 * API Authentication interface
 */
interface ApiAuth {
  apiKey: string;
  userId: string;
}

/**
 * Appointment query parameters
 */
interface AppointmentQueryParams {
  startDate?: string;
  endDate?: string;
  status?: string;
  type?: string;
  clientId?: string;
  clinicianId?: string;
  page?: number;
  pageSize?: number;
}

/**
 * Availability query parameters
 */
interface AvailabilityQueryParams {
  startDate?: string;
  endDate?: string;
  clinicianId?: string;
  duration?: number;
}

/**
 * Validate API key and get user ID
 * @param apiKey API key
 */
export const validateApiKey = async (apiKey: string): Promise<ApiAuth | null> => {
  try {
    // In a real implementation, this would validate against a database of API keys
    // For now, we'll use a simple check against environment variables or Supabase
    
    const { data, error } = await supabase
      .from('api_keys')
      .select('user_id, permissions')
      .eq('key', apiKey)
      .eq('active', true)
      .single();
    
    if (error || !data) {
      return null;
    }
    
    return {
      apiKey,
      userId: data.user_id
    };
  } catch (error) {
    console.error('API key validation error:', error);
    return null;
  }
};

/**
 * Get appointments
 * @param auth API authentication
 * @param params Query parameters
 */
export const getAppointments = async (
  auth: ApiAuth,
  params: AppointmentQueryParams
): Promise<ApiResponse<Appointment[]>> => {
  try {
    // Build query
    let query = supabase
      .from('appointments')
      .select(`
        id, client_id, clinician_id, start_at, end_at, type, status, 
        notes, appointment_recurring, recurring_group_id,
        clients (client_first_name, client_last_name, client_preferred_name, client_email, client_phone)
      `);
    
    // Apply filters
    if (params.startDate) {
      query = query.gte('start_at', params.startDate);
    }
    
    if (params.endDate) {
      query = query.lte('end_at', params.endDate);
    }
    
    if (params.status) {
      query = query.eq('status', params.status);
    }
    
    if (params.type) {
      query = query.eq('type', params.type);
    }
    
    if (params.clientId) {
      query = query.eq('client_id', params.clientId);
    }
    
    if (params.clinicianId) {
      query = query.eq('clinician_id', params.clinicianId);
    } else {
      // If no clinician ID specified, limit to appointments for the authenticated user
      // This assumes the API key is associated with a clinician
      query = query.eq('clinician_id', auth.userId);
    }
    
    // Get count for pagination
    const countResult = await supabase
      .from('appointments')
      .select('id', { count: 'exact', head: true })
      .eq('clinician_id', params.clinicianId || auth.userId);
    
    const count = countResult.count || 0;
    
    if (countResult.error) {
      throw countResult.error;
    }
    
    // Apply pagination
    const page = params.page || 1;
    const pageSize = params.pageSize || 50;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    
    query = query
      .order('start_at', { ascending: true })
      .range(from, to);
    
    // Execute query
    const { data, error } = await query;
    
    if (error) {
      throw error;
    }
    
    // Process appointments
    const appointments = data.map(appointment => {
      // Format client name
      let clientName = '';
      if (appointment.clients) {
        // Handle clients as an object or array
        const clientData = Array.isArray(appointment.clients) ? appointment.clients[0] : appointment.clients;
        
        if (clientData) {
          const preferredName = clientData.client_preferred_name;
          const firstName = clientData.client_first_name;
          const lastName = clientData.client_last_name;
          
          if (preferredName && lastName) {
            clientName = `${preferredName} ${lastName}`;
          } else if (firstName && lastName) {
            clientName = `${firstName} ${lastName}`;
          }
        }
      }
      
      // Convert clients data to AppointmentClientInfo format
      const clientInfo = appointment.clients ?
        (Array.isArray(appointment.clients) ? appointment.clients[0] : appointment.clients) :
        null;
      
      return {
        id: appointment.id,
        client_id: appointment.client_id,
        clinician_id: appointment.clinician_id,
        start_at: appointment.start_at,
        end_at: appointment.end_at,
        type: appointment.type,
        status: appointment.status,
        notes: appointment.notes,
        appointment_recurring: appointment.appointment_recurring,
        recurring_group_id: appointment.recurring_group_id,
        client: clientInfo ? {
          client_first_name: clientInfo.client_first_name || '',
          client_last_name: clientInfo.client_last_name || '',
          client_preferred_name: clientInfo.client_preferred_name || '',
          client_email: clientInfo.client_email || '',
          client_phone: clientInfo.client_phone || '',
          client_status: null,
          client_date_of_birth: null,
          client_gender: null,
          client_address: null,
          client_city: null,
          client_state: null,
          client_zipcode: null
        } : undefined,
        clientName
      };
    });
    
    return {
      success: true,
      data: appointments,
      meta: {
        page,
        pageSize,
        totalCount: count,
        totalPages: Math.ceil(count / pageSize)
      }
    };
  } catch (error) {
    console.error('Get appointments error:', error);
    return {
      success: false,
      error: error.message || 'Failed to get appointments'
    };
  }
};

/**
 * Get appointment by ID
 * @param auth API authentication
 * @param appointmentId Appointment ID
 */
export const getAppointmentById = async (
  auth: ApiAuth,
  appointmentId: string
): Promise<ApiResponse<Appointment>> => {
  try {
    // Get appointment
    const { data, error } = await supabase
      .from('appointments')
      .select(`
        id, client_id, clinician_id, start_at, end_at, type, status, 
        notes, appointment_recurring, recurring_group_id,
        clients (client_first_name, client_last_name, client_preferred_name, client_email, client_phone)
      `)
      .eq('id', appointmentId)
      .single();
    
    if (error) {
      throw error;
    }
    
    // Check if appointment belongs to authenticated user
    if (data.clinician_id !== auth.userId) {
      // Check if user has permission to access this appointment
      // This would be a more complex check in a real implementation
      const hasPermission = await checkUserPermission(auth.userId, 'read_all_appointments');
      
      if (!hasPermission) {
        return {
          success: false,
          error: 'Unauthorized access to appointment'
        };
      }
    }
    
    // Format client name
    let clientName = '';
    if (data.clients) {
      // Handle clients as an object or array
      const clientData = Array.isArray(data.clients) ? data.clients[0] : data.clients;
      
      if (clientData) {
        const preferredName = clientData.client_preferred_name;
        const firstName = clientData.client_first_name;
        const lastName = clientData.client_last_name;
        
        if (preferredName && lastName) {
          clientName = `${preferredName} ${lastName}`;
        } else if (firstName && lastName) {
          clientName = `${firstName} ${lastName}`;
        }
      }
    }
    
    // Convert clients data to AppointmentClientInfo format
    const clientInfo = data.clients ?
      (Array.isArray(data.clients) ? data.clients[0] : data.clients) :
      null;
    
    const appointment: Appointment = {
      id: data.id,
      client_id: data.client_id,
      clinician_id: data.clinician_id,
      start_at: data.start_at,
      end_at: data.end_at,
      type: data.type,
      status: data.status,
      notes: data.notes,
      appointment_recurring: data.appointment_recurring,
      recurring_group_id: data.recurring_group_id,
      client: clientInfo ? {
        client_first_name: clientInfo.client_first_name || '',
        client_last_name: clientInfo.client_last_name || '',
        client_preferred_name: clientInfo.client_preferred_name || '',
        client_email: clientInfo.client_email || '',
        client_phone: clientInfo.client_phone || '',
        client_status: null,
        client_date_of_birth: null,
        client_gender: null,
        client_address: null,
        client_city: null,
        client_state: null,
        client_zipcode: null
      } : undefined,
      clientName
    };
    
    return {
      success: true,
      data: appointment
    };
  } catch (error) {
    console.error('Get appointment by ID error:', error);
    return {
      success: false,
      error: error.message || 'Failed to get appointment'
    };
  }
};

/**
 * Create appointment
 * @param auth API authentication
 * @param appointment Appointment data
 */
export const createAppointment = async (
  auth: ApiAuth,
  appointment: Partial<Appointment>
): Promise<ApiResponse<Appointment>> => {
  try {
    // Validate required fields
    if (!appointment.client_id || !appointment.start_at || !appointment.end_at || !appointment.type) {
      return {
        success: false,
        error: 'Missing required fields: client_id, start_at, end_at, type'
      };
    }
    
    // Set clinician ID to authenticated user if not provided
    const clinicianId = appointment.clinician_id || auth.userId;
    
    // Check for scheduling conflicts
    const conflicts = await checkSchedulingConflicts(
      clinicianId,
      appointment.start_at,
      appointment.end_at,
      null
    );
    
    if (conflicts.length > 0) {
      return {
        success: false,
        error: 'Scheduling conflict detected',
        data: conflicts[0] // Return the conflicting appointment
      };
    }
    
    // Create appointment
    const { data, error } = await supabase
      .from('appointments')
      .insert({
        client_id: appointment.client_id,
        clinician_id: clinicianId,
        start_at: appointment.start_at,
        end_at: appointment.end_at,
        type: appointment.type,
        status: appointment.status || 'scheduled',
        notes: appointment.notes,
        appointment_recurring: appointment.appointment_recurring,
        recurring_group_id: appointment.recurring_group_id
      })
      .select()
      .single();
    
    if (error) {
      throw error;
    }
    
    // Get client information
    const { data: clientData, error: clientError } = await supabase
      .from('clients')
      .select('client_first_name, client_last_name, client_preferred_name, client_email, client_phone')
      .eq('id', data.client_id)
      .single();
    
    if (clientError) {
      console.warn('Failed to get client information:', clientError);
    }
    
    // Format client name
    let clientName = '';
    if (clientData) {
      const preferredName = clientData.client_preferred_name;
      const firstName = clientData.client_first_name;
      const lastName = clientData.client_last_name;
      
      if (preferredName && lastName) {
        clientName = `${preferredName} ${lastName}`;
      } else if (firstName && lastName) {
        clientName = `${firstName} ${lastName}`;
      }
    }
    
    const createdAppointment: Appointment = {
      ...data,
      client: clientData,
      clientName
    };
    
    return {
      success: true,
      data: createdAppointment
    };
  } catch (error) {
    console.error('Create appointment error:', error);
    return {
      success: false,
      error: error.message || 'Failed to create appointment'
    };
  }
};

/**
 * Update appointment
 * @param auth API authentication
 * @param appointmentId Appointment ID
 * @param appointment Appointment data
 */
export const updateAppointment = async (
  auth: ApiAuth,
  appointmentId: string,
  appointment: Partial<Appointment>
): Promise<ApiResponse<Appointment>> => {
  try {
    // Get existing appointment
    const { data: existingAppointment, error: getError } = await supabase
      .from('appointments')
      .select('clinician_id')
      .eq('id', appointmentId)
      .single();
    
    if (getError) {
      throw getError;
    }
    
    // Check if appointment belongs to authenticated user
    if (existingAppointment.clinician_id !== auth.userId) {
      // Check if user has permission to update this appointment
      const hasPermission = await checkUserPermission(auth.userId, 'update_all_appointments');
      
      if (!hasPermission) {
        return {
          success: false,
          error: 'Unauthorized access to appointment'
        };
      }
    }
    
    // Check for scheduling conflicts if changing time
    if (appointment.start_at || appointment.end_at) {
      const conflicts = await checkSchedulingConflicts(
        appointment.clinician_id || existingAppointment.clinician_id,
        appointment.start_at,
        appointment.end_at,
        appointmentId
      );
      
      if (conflicts.length > 0) {
        return {
          success: false,
          error: 'Scheduling conflict detected',
          data: conflicts[0] // Return the conflicting appointment
        };
      }
    }
    
    // Update appointment
    const { data, error } = await supabase
      .from('appointments')
      .update({
        client_id: appointment.client_id,
        clinician_id: appointment.clinician_id,
        start_at: appointment.start_at,
        end_at: appointment.end_at,
        type: appointment.type,
        status: appointment.status,
        notes: appointment.notes,
        appointment_recurring: appointment.appointment_recurring,
        recurring_group_id: appointment.recurring_group_id
      })
      .eq('id', appointmentId)
      .select()
      .single();
    
    if (error) {
      throw error;
    }
    
    // Get client information
    const { data: clientData, error: clientError } = await supabase
      .from('clients')
      .select('client_first_name, client_last_name, client_preferred_name, client_email, client_phone')
      .eq('id', data.client_id)
      .single();
    
    if (clientError) {
      console.warn('Failed to get client information:', clientError);
    }
    
    // Format client name
    let clientName = '';
    if (clientData) {
      const preferredName = clientData.client_preferred_name;
      const firstName = clientData.client_first_name;
      const lastName = clientData.client_last_name;
      
      if (preferredName && lastName) {
        clientName = `${preferredName} ${lastName}`;
      } else if (firstName && lastName) {
        clientName = `${firstName} ${lastName}`;
      }
    }
    
    const updatedAppointment: Appointment = {
      ...data,
      client: clientData,
      clientName
    };
    
    return {
      success: true,
      data: updatedAppointment
    };
  } catch (error) {
    console.error('Update appointment error:', error);
    return {
      success: false,
      error: error.message || 'Failed to update appointment'
    };
  }
};

/**
 * Delete appointment
 * @param auth API authentication
 * @param appointmentId Appointment ID
 */
export const deleteAppointment = async (
  auth: ApiAuth,
  appointmentId: string
): Promise<ApiResponse<{ id: string }>> => {
  try {
    // Get existing appointment
    const { data: existingAppointment, error: getError } = await supabase
      .from('appointments')
      .select('clinician_id')
      .eq('id', appointmentId)
      .single();
    
    if (getError) {
      throw getError;
    }
    
    // Check if appointment belongs to authenticated user
    if (existingAppointment.clinician_id !== auth.userId) {
      // Check if user has permission to delete this appointment
      const hasPermission = await checkUserPermission(auth.userId, 'delete_all_appointments');
      
      if (!hasPermission) {
        return {
          success: false,
          error: 'Unauthorized access to appointment'
        };
      }
    }
    
    // Delete appointment
    const { error } = await supabase
      .from('appointments')
      .delete()
      .eq('id', appointmentId);
    
    if (error) {
      throw error;
    }
    
    return {
      success: true,
      data: { id: appointmentId }
    };
  } catch (error) {
    console.error('Delete appointment error:', error);
    return {
      success: false,
      error: error.message || 'Failed to delete appointment'
    };
  }
};

/**
 * Get availability
 * @param auth API authentication
 * @param params Query parameters
 */
export const getAvailability = async (
  auth: ApiAuth,
  params: AvailabilityQueryParams
): Promise<ApiResponse<any[]>> => {
  try {
    // Validate required parameters
    if (!params.startDate || !params.endDate) {
      return {
        success: false,
        error: 'Missing required parameters: startDate, endDate'
      };
    }
    
    // Set clinician ID to authenticated user if not provided
    const clinicianId = params.clinicianId || auth.userId;
    
    // Get appointments in the date range
    const { data: appointments, error: appointmentsError } = await supabase
      .from('appointments')
      .select('start_at, end_at')
      .eq('clinician_id', clinicianId)
      .gte('start_at', params.startDate)
      .lte('end_at', params.endDate)
      .not('status', 'eq', 'cancelled');
    
    if (appointmentsError) {
      throw appointmentsError;
    }
    
    // Get availability settings
    const { data: availabilitySettings, error: availabilityError } = await supabase
      .from('availability_settings')
      .select('*')
      .eq('clinician_id', clinicianId)
      .single();
    
    if (availabilityError && availabilityError.code !== 'PGRST116') { // PGRST116 is "no rows returned"
      throw availabilityError;
    }
    
    // Calculate available time slots
    const startDate = DateTime.fromISO(params.startDate);
    const endDate = DateTime.fromISO(params.endDate);
    const duration = params.duration || 60; // Default to 60 minutes
    
    // In a real implementation, this would use the availability settings and appointments
    // to calculate available time slots. For now, we'll return a simplified response.
    
    const availableSlots = [];
    let currentDate = startDate;
    
    while (currentDate < endDate) {
      // Skip weekends
      if (currentDate.weekday <= 5) { // Monday to Friday
        // Add slots for 9 AM to 5 PM
        for (let hour = 9; hour < 17; hour++) {
          const slotStart = currentDate.set({ hour, minute: 0 });
          const slotEnd = slotStart.plus({ minutes: duration });
          
          // Check if slot conflicts with any appointment
          const hasConflict = appointments.some(appointment => {
            const appointmentStart = DateTime.fromISO(appointment.start_at);
            const appointmentEnd = DateTime.fromISO(appointment.end_at);
            
            return (
              (slotStart >= appointmentStart && slotStart < appointmentEnd) ||
              (slotEnd > appointmentStart && slotEnd <= appointmentEnd) ||
              (slotStart <= appointmentStart && slotEnd >= appointmentEnd)
            );
          });
          
          if (!hasConflict) {
            availableSlots.push({
              start: slotStart.toISO(),
              end: slotEnd.toISO(),
              duration
            });
          }
        }
      }
      
      // Move to next day
      currentDate = currentDate.plus({ days: 1 }).startOf('day');
    }
    
    return {
      success: true,
      data: availableSlots
    };
  } catch (error) {
    console.error('Get availability error:', error);
    return {
      success: false,
      error: error.message || 'Failed to get availability'
    };
  }
};

/**
 * Check for scheduling conflicts
 * @param clinicianId Clinician ID
 * @param startAt Start time
 * @param endAt End time
 * @param excludeAppointmentId Appointment ID to exclude from conflict check
 */
const checkSchedulingConflicts = async (
  clinicianId: string,
  startAt: string,
  endAt: string,
  excludeAppointmentId: string | null
): Promise<Appointment[]> => {
  try {
    // Build query
    let query = supabase
      .from('appointments')
      .select(`
        id, client_id, clinician_id, start_at, end_at, type, status, 
        notes, appointment_recurring, recurring_group_id,
        clients (client_first_name, client_last_name, client_preferred_name, client_email, client_phone)
      `)
      .eq('clinician_id', clinicianId)
      .not('status', 'in', '("cancelled", "no_show")')
      .or(`start_at.gte.${startAt},end_at.lte.${endAt}`);
    
    // Exclude the appointment being updated
    if (excludeAppointmentId) {
      query = query.neq('id', excludeAppointmentId);
    }
    
    // Execute query
    const { data, error } = await query;
    
    if (error) {
      throw error;
    }
    
    return data as Appointment[];
  } catch (error) {
    console.error('Check scheduling conflicts error:', error);
    return [];
  }
};

/**
 * Check if user has permission
 * @param userId User ID
 * @param permission Permission to check
 */
const checkUserPermission = async (userId: string, permission: string): Promise<boolean> => {
  try {
    // In a real implementation, this would check against a database of user permissions
    // For now, we'll return a simple check
    
    const { data, error } = await supabase
      .from('user_permissions')
      .select('permissions')
      .eq('user_id', userId)
      .single();
    
    if (error || !data) {
      return false;
    }
    
    return data.permissions.includes(permission);
  } catch (error) {
    console.error('Check user permission error:', error);
    return false;
  }
};

/**
 * API endpoints
 */
export const apiEndpoints = {
  // Appointments
  getAppointments: `${API_BASE_URL}/appointments`,
  getAppointmentById: (id: string) => `${API_BASE_URL}/appointments/${id}`,
  createAppointment: `${API_BASE_URL}/appointments`,
  updateAppointment: (id: string) => `${API_BASE_URL}/appointments/${id}`,
  deleteAppointment: (id: string) => `${API_BASE_URL}/appointments/${id}`,
  
  // Availability
  getAvailability: `${API_BASE_URL}/availability`,
  
  // Documentation
  getApiDocs: `${API_BASE_URL}/docs`
};