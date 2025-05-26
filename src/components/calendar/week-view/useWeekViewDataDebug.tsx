
import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DateTime } from 'luxon';
import { Appointment } from '@/types/appointment';
import { AvailabilityBlock } from '@/types/availability';
import { ClientDetails } from '@/types/client';
import { TimeZoneService } from '@/utils/timeZoneService';
import { DebugUtils } from '@/utils/debugUtils';
import { CalendarDebugUtils } from '@/utils/calendarDebugUtils';
import { TimeBlock, AppointmentBlock, AvailabilityException } from './types';

// Debug context name for this component
const DEBUG_CONTEXT = 'useWeekViewDataDebug';

// Use ClientDetails as Client for backward compatibility
type Client = ClientDetails;

// PHASE 3: Updated input props interface for hook
export interface UseWeekViewDataProps {
  currentDate: Date;
  clinicianId: string | null;
  clinicianTimeZone: string;
  refreshTrigger?: number;
  appointments?: Appointment[];
  getClientName?: (clientId: string) => string;
}

/**
 * Enhanced debug version of useWeekViewData hook
 * This version includes comprehensive logging and validation
 */
export const useWeekViewDataDebug = (props: UseWeekViewDataProps) => {
  // Destructure props with defaults
  const {
    currentDate,
    clinicianId,
    clinicianTimeZone,
    refreshTrigger = 0,
    appointments: externalAppointments = [],
    getClientName = (id: string) => `Client ${id}`
  } = props;

  // PHASE 4: Validate clinician timezone with fallback
  const validClinicianTimeZone = useMemo(() => {
    if (!clinicianTimeZone) {
      console.warn('[useWeekViewDataDebug] Missing clinicianTimeZone, falling back to UTC');
      return 'UTC';
    }
    
    try {
      DateTime.now().setZone(clinicianTimeZone);
      console.log('[useWeekViewDataDebug] Using validated clinician timezone:', clinicianTimeZone);
      return clinicianTimeZone;
    } catch (error) {
      console.warn('[useWeekViewDataDebug] Invalid clinicianTimeZone, falling back to UTC:', error);
      return 'UTC';
    }
  }, [clinicianTimeZone]);

  // Log hook initialization with parameters
  DebugUtils.log(DEBUG_CONTEXT, 'Hook initialized with parameters', {
    currentDate: currentDate?.toISOString(),
    clinicianId,
    validClinicianTimeZone,
    refreshTrigger,
    externalAppointmentsCount: externalAppointments.length
  });

  // Validate parameters
  CalendarDebugUtils.validateHookParameters(DEBUG_CONTEXT, {
    currentDate,
    clinicianId,
    userTimeZone: validClinicianTimeZone
  });

  // State hooks
  const [loading, setLoading] = useState(true);
  const [availability, setAvailability] = useState<AvailabilityBlock[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [clients, setClients] = useState<Map<string, Client>>(new Map());
  const [exceptions, setExceptions] = useState<AvailabilityException[]>([]);
  const [timeBlocks, setTimeBlocks] = useState<TimeBlock[]>([]);
  const [appointmentBlocks, setAppointmentBlocks] = useState<AppointmentBlock[]>([]);

  // PHASE 2: Ensure current date is in clinician's time zone
  const localDate = useMemo(() => {
    DebugUtils.log(DEBUG_CONTEXT, 'Converting currentDate to localDate', {
      currentDate: currentDate?.toISOString(),
      validClinicianTimeZone
    });
    
    const result = TimeZoneService.fromJSDate(currentDate, validClinicianTimeZone);
    
    DebugUtils.log(DEBUG_CONTEXT, 'Converted localDate result', {
      localDate: result.toISO(),
      zone: result.zoneName,
      offset: result.offset
    });
    
    return result;
  }, [currentDate, validClinicianTimeZone]);

  // Generate days for the current week
  const weekDays = useMemo(() => {
    DebugUtils.log(DEBUG_CONTEXT, 'Generating weekDays', {
      localDate: localDate.toISO()
    });
    
    const days: DateTime[] = [];
    const weekStart = localDate.startOf('week');
    
    DebugUtils.log(DEBUG_CONTEXT, 'Week start date', {
      weekStart: weekStart.toISO(),
      weekDay: weekStart.weekday
    });
    
    for (let i = 0; i < 7; i++) {
      days.push(weekStart.plus({ days: i }));
    }
    
    DebugUtils.log(DEBUG_CONTEXT, 'Generated weekDays', {
      count: days.length,
      firstDay: days[0].toFormat('yyyy-MM-dd'),
      lastDay: days[6].toFormat('yyyy-MM-dd')
    });
    
    return days;
  }, [localDate]);

  // Format day strings ('yyyy-MM-dd') for mapping
  const dayKeys = useMemo(() => {
    const keys = weekDays.map(day => day.toFormat('yyyy-MM-dd'));
    
    DebugUtils.log(DEBUG_CONTEXT, 'Generated dayKeys', {
      keys
    });
    
    return keys;
  }, [weekDays]);

  // Fetch clinician appointments and availability
  useEffect(() => {
    const initializeData = async () => {
      DebugUtils.log(DEBUG_CONTEXT, 'Initializing data', {
        clinicianId,
        refreshTrigger,
        validClinicianTimeZone
      });
      
      setLoading(true);
      
      if (!clinicianId) {
        DebugUtils.warn(DEBUG_CONTEXT, 'No clinicianId provided, returning empty data');
        setAppointments([]);
        setAvailability([]);
        setClients(new Map());
        setExceptions([]);
        setTimeBlocks([]);
        setAppointmentBlocks([]);
        setLoading(false);
        return;
      }

      try {
        // PHASE 2: UTC date bounds for current week using clinician timezone
        const utcStart = DateTime.utc(
          localDate.year,
          localDate.month,
          localDate.day
        ).startOf('week').toISO();

        const utcEnd = DateTime.utc(
          localDate.year,
          localDate.month,
          localDate.day
        ).endOf('week').toISO();

        DebugUtils.log(DEBUG_CONTEXT, 'Fetching data for week', {
          localStart: localDate.startOf('week').toISO(),
          utcStart,
          utcEnd,
          timezone: validClinicianTimeZone
        });

        // Fetch all required data in parallel
        const [appointmentData, availabilityData, clientData, exceptionData] = await Promise.all([
          // Fetch appointments
          clinicianId ? supabase
            .from('appointments')
            .select('*')
            .eq('clinician_id', clinicianId)
            .gte('start_at', utcStart)
            .lt('end_at', utcEnd)
            .order('start_at', { ascending: true }) : Promise.resolve({ data: [], error: null }),
          
          // Fetch availability blocks
          clinicianId ? supabase
            .from('availability_blocks')
            .select('*')
            .eq('clinician_id', clinicianId)
            .gte('end_at', utcStart)
            .lt('start_at', utcEnd)
            .order('start_at', { ascending: true }) : Promise.resolve({ data: [], error: null }),
          
          // Fetch client data once
          clinicianId ? supabase
            .from('clients')
            .select('id, client_first_name, client_last_name, client_preferred_name')
            .eq('clinician_id', clinicianId) : Promise.resolve({ data: [], error: null }),
            
          // Fetch availability exceptions
          clinicianId ? supabase
            .from('availability_exceptions')
            .select('*')
            .eq('clinician_id', clinicianId) : Promise.resolve({ data: [], error: null })
        ]);

        // Process appointments
        const fetchedAppts = appointmentData.error ? [] : appointmentData.data;
        DebugUtils.log(DEBUG_CONTEXT, 'Fetched appointments', {
          count: fetchedAppts.length,
          sample: fetchedAppts.length ? fetchedAppts[0] : null,
          timezone: validClinicianTimeZone
        });

        // Log each appointment for debugging
        fetchedAppts.forEach((appt, index) => {
          if (index < 5) { // Log only first 5 to avoid overwhelming the console
            CalendarDebugUtils.logAppointmentTransformation(
              'database-fetch',
              appt,
              validClinicianTimeZone
            );
            
            // Log timezone conversion
            CalendarDebugUtils.logTimezoneConversion(
              `appointment-${appt.id}`,
              appt.start_at,
              validClinicianTimeZone
            );
          }
        });

        // Process availability
        const fetchedBlocks = availabilityData.error ? [] : availabilityData.data;
        DebugUtils.log(DEBUG_CONTEXT, 'Fetched availability blocks', {
          count: fetchedBlocks.length,
          sample: fetchedBlocks.length ? fetchedBlocks[0] : null,
          timezone: validClinicianTimeZone
        });

        // Log each availability block for debugging
        fetchedBlocks.forEach((block, index) => {
          if (index < 5) { // Log only first 5
            CalendarDebugUtils.logAvailabilityBlock(
              'database-fetch',
              block,
              validClinicianTimeZone
            );
          }
        });

        // Process exceptions
        const fetchedExceptions = exceptionData.error ? [] : exceptionData.data;
        DebugUtils.log(DEBUG_CONTEXT, 'Fetched availability exceptions', {
          count: fetchedExceptions.length,
          sample: fetchedExceptions.length ? fetchedExceptions[0] : null
        });

        // Build client map
        const clientMap = new Map<string, Client>();
        (clientData.data || []).forEach(client => {
          clientMap.set(client.id, client);
          DebugUtils.log(DEBUG_CONTEXT, 'Client loaded', {
            id: client.id,
            name: client.client_first_name
          });
        });

        // Set state with fetched data
        setAppointments(fetchedAppts);
        setAvailability(fetchedBlocks);
        setClients(clientMap);
        setExceptions(fetchedExceptions);
        
        // Process time blocks and appointment blocks
        processTimeBlocks(fetchedBlocks, fetchedExceptions);
        processAppointmentBlocks(fetchedAppts, clientMap);
        
      } catch (error) {
        DebugUtils.error(DEBUG_CONTEXT, 'Unexpected error during data fetching', error);
      } finally {
        setLoading(false);
      }
    };

    initializeData();
  }, [clinicianId, refreshTrigger, validClinicianTimeZone, localDate]);

  // PHASE 2: Process availability blocks into time blocks using clinician timezone
  const processTimeBlocks = (blocks: AvailabilityBlock[], exceptions: AvailabilityException[]) => {
    DebugUtils.log(DEBUG_CONTEXT, 'Processing time blocks', {
      blocksCount: blocks.length,
      exceptionsCount: exceptions.length
    });
    
    const timeBlocks: TimeBlock[] = [];
    
    // Process regular availability blocks
    blocks.forEach(block => {
      if (!block.start_at || !block.end_at) {
        DebugUtils.warn(DEBUG_CONTEXT, 'Invalid availability block', {
          blockId: block.id,
          startAt: block.start_at,
          endAt: block.end_at
        });
        return;
      }
      
      try {
        const start = DateTime.fromISO(block.start_at, { zone: 'UTC' }).setZone(validClinicianTimeZone);
        const end = DateTime.fromISO(block.end_at, { zone: 'UTC' }).setZone(validClinicianTimeZone);
        const day = start.startOf('day');
        
        timeBlocks.push({
          start,
          end,
          day,
          availabilityIds: [block.id],
          isException: false,
          isStandalone: false
        });
        
        DebugUtils.log(DEBUG_CONTEXT, 'Created time block', {
          blockId: block.id,
          start: start.toFormat('yyyy-MM-dd HH:mm'),
          end: end.toFormat('yyyy-MM-dd HH:mm'),
          day: day.toFormat('yyyy-MM-dd')
        });
      } catch (error) {
        DebugUtils.error(DEBUG_CONTEXT, 'Error creating time block', {
          blockId: block.id,
          error
        });
      }
    });
    
    // Process exceptions
    // (This would be implemented based on your application's logic)
    
    setTimeBlocks(timeBlocks);
    DebugUtils.log(DEBUG_CONTEXT, 'Finished processing time blocks', {
      totalBlocks: timeBlocks.length
    });
  };
  
  // PHASE 2: Process appointments into appointment blocks using clinician timezone
  const processAppointmentBlocks = (appts: Appointment[], clientMap: Map<string, Client>) => {
    DebugUtils.log(DEBUG_CONTEXT, 'Processing appointment blocks', {
      appointmentsCount: appts.length,
      clientsCount: clientMap.size
    });
    
    const appointmentBlocks: AppointmentBlock[] = [];
    
    appts.forEach(appointment => {
      if (!appointment.start_at || !appointment.end_at) {
        DebugUtils.warn(DEBUG_CONTEXT, 'Invalid appointment', {
          appointmentId: appointment.id,
          startAt: appointment.start_at,
          endAt: appointment.end_at
        });
        return;
      }
      
      try {
        const start = DateTime.fromISO(appointment.start_at, { zone: 'UTC' }).setZone(validClinicianTimeZone);
        const end = DateTime.fromISO(appointment.end_at, { zone: 'UTC' }).setZone(validClinicianTimeZone);
        const day = start.startOf('day');
        
        // Get client name
        let clientName = appointment.clientName;
        if (!clientName) {
          const client = clientMap.get(appointment.client_id);
          if (client) {
            clientName = client.client_preferred_name || 
                        `${client.client_first_name} ${client.client_last_name}`;
          } else {
            clientName = getClientName(appointment.client_id);
          }
        }
        
        appointmentBlocks.push({
          id: appointment.id,
          appointmentId: appointment.id,
          clientId: appointment.client_id,
          clientName,
          start,
          end,
          day,
          type: appointment.type,
          status: appointment.status,
          // Include all original appointment data for conversion
          start_at: appointment.start_at,
          end_at: appointment.end_at,
          appointment_recurring: appointment.appointment_recurring,
          recurring_group_id: appointment.recurring_group_id,
          video_room_url: appointment.video_room_url,
          notes: appointment.notes,
          client: appointment.client,
          appointment_timezone: appointment.appointment_timezone
        });
        
        DebugUtils.log(DEBUG_CONTEXT, 'Created appointment block', {
          appointmentId: appointment.id,
          clientName,
          start: start.toFormat('yyyy-MM-dd HH:mm'),
          end: end.toFormat('yyyy-MM-dd HH:mm'),
          day: day.toFormat('yyyy-MM-dd'),
          appointment_timezone: appointment.appointment_timezone
        });
      } catch (error) {
        DebugUtils.error(DEBUG_CONTEXT, 'Error creating appointment block', {
          appointmentId: appointment.id,
          error
        });
      }
    });
    
    setAppointmentBlocks(appointmentBlocks);
    DebugUtils.log(DEBUG_CONTEXT, 'Finished processing appointment blocks', {
      totalBlocks: appointmentBlocks.length
    });
  };

  // Map appointments by day for the week
  const dayAppointmentsMap = useMemo(() => {
    DebugUtils.log(DEBUG_CONTEXT, 'Building dayAppointmentsMap', {
      appointmentsCount: appointments.length,
      dayKeysCount: dayKeys.length
    });
    
    const resultMap = new Map<string, Appointment[]>();
    
    // Initialize map with empty arrays for each day
    dayKeys.forEach(key => resultMap.set(key, []));
    
    // Sample appointment timestamp for debugging
    const sample = appointments.length ? appointments[0]?.start_at : null;
    if (sample) {
      CalendarDebugUtils.logTimezoneConversion(
        'sample-appointment',
        sample,
        validClinicianTimeZone
      );
    }
    
    // PHASE 2: Map appointments to days using clinician timezone
    appointments.forEach(appointment => {
      try {
        // UTC to clinician timezone conversion
        const slotTime = DateTime.fromISO(appointment.start_at).setZone(validClinicianTimeZone);
        const dayStr = slotTime.toFormat('yyyy-MM-dd');
        
        DebugUtils.log(DEBUG_CONTEXT, 'Mapping appointment to day', {
          appointmentId: appointment.id,
          utcStart: appointment.start_at,
          localDay: dayStr,
          clientName: appointment.clientName || getClientName(appointment.client_id)
        });
        
        if (resultMap.has(dayStr)) {
          const existing: Appointment[] = resultMap.get(dayStr) || [];
          resultMap.set(dayStr, [...existing, appointment]);
        } else {
          DebugUtils.warn(DEBUG_CONTEXT, 'Day not found in dayKeys', {
            day: dayStr,
            availableDays: dayKeys
          });
        }
      } catch (error) {
        DebugUtils.error(DEBUG_CONTEXT, 'Error mapping appointment to day', {
          appointmentId: appointment.id,
          error
        });
      }
    });
    
    // Log the result
    dayKeys.forEach(day => {
      const dayAppointments = resultMap.get(day) || [];
      DebugUtils.log(DEBUG_CONTEXT, `Appointments for day ${day}`, {
        count: dayAppointments.length,
        appointments: dayAppointments.map(a => ({
          id: a.id,
          clientName: a.clientName || getClientName(a.client_id),
          start: a.start_at
        }))
      });
    });
    
    return resultMap;
  }, [appointments, dayKeys, validClinicianTimeZone, getClientName]);

  // PHASE 2: Map availability by day with clinician time zone
  const dayAvailabilityMap = useMemo(() => {
    DebugUtils.log(DEBUG_CONTEXT, 'Building dayAvailabilityMap', {
      availabilityCount: availability.length,
      dayKeysCount: dayKeys.length
    });
    
    const resultMap = new Map<string, AvailabilityBlock[]>();
    
    // Initialize map with empty arrays for each day
    dayKeys.forEach(key => resultMap.set(key, []));
    
    // Map availability blocks to days
    availability.forEach(block => {
      try {
        // UTC to clinician timezone conversion
        const blockTime = block.start_at 
          ? DateTime.fromISO(block.start_at).setZone(validClinicianTimeZone) 
          : null;
          
        if (!blockTime) {
          DebugUtils.warn(DEBUG_CONTEXT, 'Invalid block start time', {
            blockId: block.id,
            startAt: block.start_at
          });
          return;
        }
        
        const dayStr = blockTime.toFormat('yyyy-MM-dd');
        
        DebugUtils.log(DEBUG_CONTEXT, 'Mapping availability block to day', {
          blockId: block.id,
          utcStart: block.start_at,
          localDay: dayStr
        });
        
        if (resultMap.has(dayStr)) {
          const existing = resultMap.get(dayStr) || [];
          resultMap.set(dayStr, [...existing, block]);
        } else {
          DebugUtils.warn(DEBUG_CONTEXT, 'Day not found in dayKeys', {
            day: dayStr,
            availableDays: dayKeys
          });
        }
      } catch (error) {
        DebugUtils.error(DEBUG_CONTEXT, 'Error mapping availability to day', {
          blockId: block.id,
          error
        });
      }
    });
    
    // Log the result
    dayKeys.forEach(day => {
      const dayBlocks = resultMap.get(day) || [];
      DebugUtils.log(DEBUG_CONTEXT, `Availability for day ${day}`, {
        count: dayBlocks.length,
        blocks: dayBlocks.map(b => ({
          id: b.id,
          start: b.start_at,
          end: b.end_at
        }))
      });
    });
    
    return resultMap;
  }, [availability, dayKeys, validClinicianTimeZone]);

  // PHASE 3: Utility function to check if a time slot is available - accepts Luxon DateTime
  const isTimeSlotAvailable = (dayTimeSlot: DateTime): boolean => {
    DebugUtils.log(DEBUG_CONTEXT, 'Checking if time slot is available', {
      slot: dayTimeSlot.toFormat('yyyy-MM-dd HH:mm'),
      timezone: dayTimeSlot.zoneName,
      validTimezone: validClinicianTimeZone
    });
    
    // PHASE 4: Validate timezone consistency
    if (dayTimeSlot.zoneName !== validClinicianTimeZone) {
      console.warn('[isTimeSlotAvailable] Timezone mismatch detected:', {
        slotTimezone: dayTimeSlot.zoneName,
        expectedTimezone: validClinicianTimeZone
      });
    }

    // Check if the time slot falls within any time block
    const isAvailable = timeBlocks.some(block => {
      const isSameDay = block.day?.hasSame(dayTimeSlot, 'day') || false;
      if (!isSameDay) return false;
      
      return dayTimeSlot >= block.start && dayTimeSlot < block.end;
    });
    
    return isAvailable;
  };

  // PHASE 3: Utility function to get the block for a time slot - accepts Luxon DateTime
  const getBlockForTimeSlot = (dayTimeSlot: DateTime): TimeBlock | undefined => {
    DebugUtils.log(DEBUG_CONTEXT, 'Looking for block at slot', {
      slot: dayTimeSlot.toFormat('yyyy-MM-dd HH:mm'),
      timezone: dayTimeSlot.zoneName,
      validTimezone: validClinicianTimeZone
    });
    
    // PHASE 4: Validate timezone consistency
    if (dayTimeSlot.zoneName !== validClinicianTimeZone) {
      console.warn('[getBlockForTimeSlot] Timezone mismatch detected:', {
        slotTimezone: dayTimeSlot.zoneName,
        expectedTimezone: validClinicianTimeZone
      });
    }

    // Find the block that contains this time slot
    return timeBlocks.find(block => {
      const isSameDay = block.day?.hasSame(dayTimeSlot, 'day') || false;
      if (!isSameDay) return false;
      
      return dayTimeSlot >= block.start && dayTimeSlot < block.end;
    });
  };

  // PHASE 3: Utility function to get the appointment for a time slot - accepts Luxon DateTime
  const getAppointmentForTimeSlot = (dayTimeSlot: DateTime): AppointmentBlock | undefined => {
    DebugUtils.log(DEBUG_CONTEXT, 'Looking for appointment at slot', {
      slot: dayTimeSlot.toFormat('yyyy-MM-dd HH:mm'),
      timezone: dayTimeSlot.zoneName,
      validTimezone: validClinicianTimeZone
    });
    
    // PHASE 4: Validate timezone consistency
    if (dayTimeSlot.zoneName !== validClinicianTimeZone) {
      console.warn('[getAppointmentForTimeSlot] Timezone mismatch detected:', {
        slotTimezone: dayTimeSlot.zoneName,
        expectedTimezone: validClinicianTimeZone
      });
    }

    // Find the appointment that contains this time slot
    return appointmentBlocks.find(appt => {
      const isSameDay = appt.day?.hasSame(dayTimeSlot, 'day') || false;
      if (!isSameDay) return false;
      
      return dayTimeSlot >= appt.start && dayTimeSlot < appt.end;
    });
  };

  // Utility function to get availability for a block
  const getAvailabilityForBlock = (blockId: string): AvailabilityBlock | undefined => {
    return availability.find(block => block.id === blockId);
  };

  // Log the hook's return value
  const returnValue = {
    loading,
    weekDays,
    dayKeys,
    dayAppointmentsMap,
    dayAvailabilityMap,
    availabilityData: availability,
    appointmentsData: appointments,
    timeBlocks,
    exceptions,
    availabilityBlocks: availability,
    appointmentBlocks,
    getAvailabilityForBlock,
    isTimeSlotAvailable,
    getBlockForTimeSlot,
    getAppointmentForTimeSlot,
  };

  DebugUtils.log(DEBUG_CONTEXT, 'Hook return value', {
    loading,
    weekDaysCount: weekDays.length,
    dayKeysCount: dayKeys.length,
    appointmentsCount: appointments.length,
    availabilityCount: availability.length,
    timeBlocksCount: timeBlocks.length,
    appointmentBlocksCount: appointmentBlocks.length
  });

  return returnValue;
};
