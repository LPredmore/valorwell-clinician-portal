import { useState, useCallback, useMemo } from 'react';
import { DateTime } from 'luxon';
import { Appointment } from '@/types/appointment';
import { AppointmentBlock } from '@/components/calendar/week-view/types';
import { CalendarDebugUtils } from '@/utils/calendarDebugUtils';
import { formatClientName } from '@/utils/appointmentUtils';
import { ClientDetails } from '@/types/client';

// Component name for logging
const COMPONENT_NAME = 'useAppointmentProcessor';

// Use ClientDetails as Client for backward compatibility
type Client = ClientDetails;

/**
 * Hook for processing appointment data into appointment blocks
 * Extracted from useWeekViewData for better separation of concerns
 */
export const useAppointmentProcessor = (
  appointments: Appointment[],
  clients: Map<string, Client>,
  weekDays: DateTime[],
  userTimeZone: string,
  getClientName: (id: string) => string = (id) => `Client ${id}`
) => {
  // Performance tracking
  const processingStartTime = { current: 0 };

  /**
   * Process appointments into appointment blocks
   */
  const processAppointmentBlocks = useCallback((
    appts: Appointment[],
    clientMap: Map<string, Client>
  ): AppointmentBlock[] => {
    processingStartTime.current = performance.now();
    
    CalendarDebugUtils.logDataLoading(COMPONENT_NAME, 'processing-appointment-blocks-start', {
      appointmentsCount: appts?.length || 0,
      clientsCount: clientMap?.size || 0,
      userTimeZone
    });
    
    const appointmentBlocks: AppointmentBlock[] = [];
    
    // Format day strings for mapping
    const dayKeys = weekDays.map(day => day.toFormat('yyyy-MM-dd'));
    
    // Process each appointment
    appts.forEach(appointment => {
      try {
        // Convert UTC ISO strings to DateTime objects in user timezone
        const start = DateTime.fromISO(appointment.start_at).setZone(userTimeZone);
        const end = DateTime.fromISO(appointment.end_at).setZone(userTimeZone);
        
        // Get the day of the appointment
        const day = start.startOf('day');
        const dayKey = day.toFormat('yyyy-MM-dd');
        
        // Only include appointments that fall within the week we're displaying
        if (!dayKeys.includes(dayKey)) {
          return;
        }
        
        // Get client name
        let clientName = appointment.clientName;
        
        // If clientName is not already set, try to get it from the client object
        if (!clientName && appointment.client) {
          clientName = formatClientName(appointment.client);
        }
        
        // If still no client name, try to get it from the client map
        if (!clientName && appointment.client_id && clientMap.has(appointment.client_id)) {
          const client = clientMap.get(appointment.client_id);
          if (client) {
            clientName = formatClientName(client);
          }
        }
        
        // If still no client name, use the getClientName function
        if (!clientName && appointment.client_id) {
          clientName = getClientName(appointment.client_id);
        }
        
        // Create appointment block
        const appointmentBlock: AppointmentBlock = {
          id: appointment.id,
          start,
          end,
          day,
          clientId: appointment.client_id,
          clientName: clientName || 'Unknown Client',
          type: appointment.type
        };
        
        appointmentBlocks.push(appointmentBlock);
      } catch (error) {
        CalendarDebugUtils.error(COMPONENT_NAME, 'Error processing appointment', {
          appointmentId: appointment.id,
          error
        });
      }
    });
    
    // Log processing performance
    const processingDuration = performance.now() - processingStartTime.current;
    CalendarDebugUtils.logPerformance(COMPONENT_NAME, 'appointment-blocks-processing', processingDuration, {
      appointmentsCount: appts.length,
      processedBlocksCount: appointmentBlocks.length
    });
    
    return appointmentBlocks;
  }, [userTimeZone, weekDays, getClientName]);

  // Process appointment blocks
  const appointmentBlocks = useMemo(() => 
    processAppointmentBlocks(appointments, clients),
    [appointments, clients, processAppointmentBlocks]
  );

  /**
   * Create a map of appointments by day for quick lookup
   */
  const dayAppointmentsMap = useMemo(() => {
    const map = new Map<string, AppointmentBlock[]>();
    
    // Initialize map with empty arrays for each day
    weekDays.forEach(day => {
      map.set(day.toFormat('yyyy-MM-dd'), []);
    });
    
    // Add appointments to their respective days
    appointmentBlocks.forEach(appointment => {
      const dayKey = appointment.day.toFormat('yyyy-MM-dd');
      
      if (map.has(dayKey)) {
        map.get(dayKey)?.push(appointment);
      }
    });
    
    return map;
  }, [appointmentBlocks, weekDays]);

  /**
   * Utility function to get the appointment for a time slot
   */
  const getAppointmentForTimeSlot = useCallback((day: Date, timeSlot: Date): AppointmentBlock | undefined => {
    // Convert JS Date to DateTime
    const slotDateTime = DateTime.fromJSDate(timeSlot).setZone(userTimeZone);
    const dayKey = DateTime.fromJSDate(day).setZone(userTimeZone).toFormat('yyyy-MM-dd');
    
    // Get appointments for this day
    const dayAppointments = dayAppointmentsMap.get(dayKey) || [];
    
    // Find an appointment that overlaps with this time slot
    return dayAppointments.find(appt => {
      return slotDateTime >= appt.start && slotDateTime < appt.end;
    });
  }, [dayAppointmentsMap, userTimeZone]);

  return {
    appointmentBlocks,
    dayAppointmentsMap,
    getAppointmentForTimeSlot
  };
};

export default useAppointmentProcessor;