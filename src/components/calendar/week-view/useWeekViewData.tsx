import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DateTime } from 'luxon';
import { Appointment } from '@/types/appointment';
import { AvailabilityBlock } from '@/types/availability';
import { ClientDetails } from '@/types/client';
import { TimeZoneService } from '@/utils/timeZoneService';
import { DebugUtils } from '@/utils/debugUtils';
import { TimeBlock, AppointmentBlock, AvailabilityException } from './types';
import { formatClientName } from '@/utils/appointmentUtils';

// Debug context name for this component
const DEBUG_CONTEXT = 'useWeekViewData';

// Types for recurring weekly availability pattern
interface TimeSlot {
  startTime: string;  // Format: "HH:MM"
  endTime: string;    // Format: "HH:MM"
  timezone: string;   // IANA timezone string
}

interface DayAvailability {
  dayOfWeek: string;  // e.g., "Monday", "Tuesday", etc.
  isAvailable: boolean;
  timeSlots: TimeSlot[];
}

interface ClinicianWeeklyAvailability {
  monday: DayAvailability;
  tuesday: DayAvailability;
  wednesday: DayAvailability;
  thursday: DayAvailability;
  friday: DayAvailability;
  saturday: DayAvailability;
  sunday: DayAvailability;
}

// Use ClientDetails as Client for backward compatibility
type Client = ClientDetails;

// Helper function to safely clone objects without losing string types
function safeClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  
  // Handle Date objects
  if (obj instanceof Date) {
    return new Date(obj.getTime()) as unknown as T;
  }
  
  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map(safeClone) as unknown as T;
  }
  
  // Handle objects
  const cloned: Record<string, any> = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const value = (obj as Record<string, any>)[key];
      // Special handling for timezone strings to prevent object conversion
      if (key === 'timezone' && typeof value === 'string') {
        cloned[key] = String(value); // Ensure it's a primitive string
      } else {
        cloned[key] = safeClone(value);
      }
    }
  }
  
  return cloned as T;
}

// Helper function to extract weekly pattern from clinician data
const extractWeeklyPatternFromClinicianData = (clinicianData: any): ClinicianWeeklyAvailability => {
  // Create a default structure with all days set to unavailable
  const defaultAvailability: ClinicianWeeklyAvailability = {
    monday: { dayOfWeek: 'Monday', isAvailable: false, timeSlots: [] },
    tuesday: { dayOfWeek: 'Tuesday', isAvailable: false, timeSlots: [] },
    wednesday: { dayOfWeek: 'Wednesday', isAvailable: false, timeSlots: [] },
    thursday: { dayOfWeek: 'Thursday', isAvailable: false, timeSlots: [] },
    friday: { dayOfWeek: 'Friday', isAvailable: false, timeSlots: [] },
    saturday: { dayOfWeek: 'Saturday', isAvailable: false, timeSlots: [] },
    sunday: { dayOfWeek: 'Sunday', isAvailable: false, timeSlots: [] },
  };
  
  if (!clinicianData) return defaultAvailability;
  
  // Days of week for iteration
  const daysOfWeek = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  
  // Default timezone
  const defaultTimezone = 'America/Chicago';
  
  // Get clinician's default timezone (ensuring it's a string)
  const clinicianDefaultTimezone = 
    typeof clinicianData.clinician_time_zone === 'string' 
      ? TimeZoneService.ensureIANATimeZone(clinicianData.clinician_time_zone) 
      : defaultTimezone;
  
  // Process each day
  daysOfWeek.forEach(day => {
    // For each potential slot (1, 2, 3)
    for (let slotNum = 1; slotNum <= 3; slotNum++) {
      const startTimeKey = `clinician_availability_start_${day}_${slotNum}`;
      const endTimeKey = `clinician_availability_end_${day}_${slotNum}`;
      const timezoneKey = `clinician_availability_timezone_${day}_${slotNum}`;
      
      if (clinicianData[startTimeKey] && clinicianData[endTimeKey]) {
        // We found a valid slot - ensure the day is marked as available
        defaultAvailability[day as keyof ClinicianWeeklyAvailability].isAvailable = true;
        
        // Extract timezone value with improved validation
        const rawTimezoneFromDbSlot = clinicianData[timezoneKey];
        let determinedTimezoneString = defaultTimezone; // Start with fallback
        
        // Try to use the slot-specific timezone if it's a valid string
        if (typeof rawTimezoneFromDbSlot === 'string' && rawTimezoneFromDbSlot.trim()) {
          determinedTimezoneString = TimeZoneService.ensureIANATimeZone(rawTimezoneFromDbSlot.trim());
        } 
        // Otherwise fall back to clinician's default timezone
        else if (typeof clinicianDefaultTimezone === 'string' && clinicianDefaultTimezone.trim()) {
          determinedTimezoneString = TimeZoneService.ensureIANATimeZone(clinicianDefaultTimezone.trim());
        }
        
        // Log the timezone being used for this slot
        console.log(`[extractWeeklyPatternFromClinicianData] Timezone for ${day}_${slotNum}:`, {
          rawTimezone: rawTimezoneFromDbSlot,
          timezoneType: typeof rawTimezoneFromDbSlot,
          defaultTz: clinicianDefaultTimezone,
          determinedTz: determinedTimezoneString,
          finalType: typeof determinedTimezoneString
        });
        
        // Add this time slot with explicit string timezone
        defaultAvailability[day as keyof ClinicianWeeklyAvailability].timeSlots.push({
          startTime: clinicianData[startTimeKey].substring(0, 5),  // Ensure "HH:MM" format
          endTime: clinicianData[endTimeKey].substring(0, 5),      // Ensure "HH:MM" format
          timezone: String(determinedTimezoneString)  // Explicitly convert to string to prevent object references
        });
      }
    }
  });
  
  return defaultAvailability;
};

// Main hook for week view data processing
export const useWeekViewData = (
  days: Date[],
  clinicianId: string | null,
  refreshTrigger = 0,
  externalAppointments: Appointment[] = [],
  getClientName = (id: string) => `Client ${id}`,
  userTimeZone: string
) => {
  const [loading, setLoading] = useState(true);
  const [availability, setAvailability] = useState<AvailabilityBlock[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [clients, setClients] = useState<Map<string, Client>>(new Map());
  const [exceptions, setExceptions] = useState<AvailabilityException[]>([]);
  const [timeBlocks, setTimeBlocks] = useState<TimeBlock[]>([]);
  const [appointmentBlocks, setAppointmentBlocks] = useState<AppointmentBlock[]>([]);
  
  // New state for clinician data and weekly pattern
  const [clinicianData, setClinicianData] = useState<any>(null);
  const [weeklyPattern, setWeeklyPattern] = useState<ClinicianWeeklyAvailability | null>(null);

  // Convert JS Date array to DateTime array in user timezone
  const weekDays = useMemo(() => 
    days.map(day => TimeZoneService.fromJSDate(day, userTimeZone)),
    [days, userTimeZone]
  );

  // Format day strings ('yyyy-MM-dd') for mapping
  const dayKeys = useMemo(() => 
    weekDays.map(day => day.toFormat('yyyy-MM-dd')),
    [weekDays]
  );

  // Generate time blocks from weekly recurring pattern
  const generateTimeBlocksFromWeeklyPattern = (
    pattern: ClinicianWeeklyAvailability, 
    days: DateTime[]
  ): TimeBlock[] => {
    if (!pattern) return [];
    
    // DEBUG: Log the pattern we received to check timezone values
    console.log('[generateTimeBlocksFromWeeklyPattern DEBUG] Received pattern structure:', JSON.stringify({
      monday: { 
        isAvailable: pattern.monday.isAvailable,
        slotsCount: pattern.monday.timeSlots.length,
        sampleSlot: pattern.monday.timeSlots.length > 0 ? {
          startTime: pattern.monday.timeSlots[0]?.startTime,
          endTime: pattern.monday.timeSlots[0]?.endTime,
          timezone: pattern.monday.timeSlots[0]?.timezone,
          timezoneType: typeof pattern.monday.timeSlots[0]?.timezone
        } : null
      }
    }, null, 2));
    
    const generatedBlocks: TimeBlock[] = [];
    const defaultTimezone = 'America/Chicago';
    
    // For each day in our view
    days.forEach(day => {
      // Get day of week (0 = Sunday, 1 = Monday, etc.)
      const dayOfWeek = day.weekday % 7; // Convert Luxon's 1-7 (Mon-Sun) to 0-6 (Sun-Sat)
      
      // Map day index to day name
      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const dayName = dayNames[dayOfWeek];
      
      // Get availability for this day of week
      const dayAvailability = pattern[dayName as keyof ClinicianWeeklyAvailability];
      
      if (dayAvailability && dayAvailability.isAvailable) {
        // Process each time slot for this day
        dayAvailability.timeSlots.forEach((slot, index) => {
          try {
            // Enhanced timezone validation - always ensure we have a valid string
            let slotTimezone = defaultTimezone; // Default fallback
            
            // First, ensure the value exists and is a string
            if (slot.timezone) {
              // Check if it's a string (it should be)
              if (typeof slot.timezone === 'string') {
                slotTimezone = TimeZoneService.ensureIANATimeZone(slot.timezone);
              } 
              // If somehow it's an object (which should never happen after our fixes), convert to string
              else if (typeof slot.timezone === 'object') {
                console.error(`[generateTimeBlocksFromWeeklyPattern] Found object timezone for ${dayName} slot ${index}:`, 
                  slot.timezone);
                // Try to extract a useful string, or use default
                slotTimezone = defaultTimezone;
              } 
              // Handle any other unexpected type
              else {
                console.error(`[generateTimeBlocksFromWeeklyPattern] Unexpected timezone type for ${dayName} slot ${index}:`,
                  typeof slot.timezone);
                slotTimezone = defaultTimezone;
              }
            }
            
            // Log timezone details
            console.log('[generateTimeBlocksFromWeeklyPattern] Processing slot timezone:', {
              rawTimezone: slot.timezone,
              timezoneType: typeof slot.timezone,
              normalizedTimezone: slotTimezone,
              day: dayName,
              slot: index
            });
            
            // Create DateTime objects for start and end times in the slot's timezone
            const [startHour, startMinute] = slot.startTime.split(':').map(Number);
            const [endHour, endMinute] = slot.endTime.split(':').map(Number);
            
            // Create start and end DateTimes in slot timezone
            const slotStart = day.setZone(slotTimezone).set({
              hour: startHour,
              minute: startMinute,
              second: 0,
              millisecond: 0
            });
            
            const slotEnd = day.setZone(slotTimezone).set({
              hour: endHour,
              minute: endMinute,
              second: 0,
              millisecond: 0
            });
            
            // Convert to user's timezone for display
            const displayStart = slotStart.setZone(userTimeZone);
            const displayEnd = slotEnd.setZone(userTimeZone);
            
            // Create the time block object
            const timeBlock: TimeBlock = {
              start: displayStart,
              end: displayEnd,
              day: day.startOf('day').setZone(userTimeZone),
              availabilityIds: [`recurring-${dayName}-${index}`],
              isException: false,
              isStandalone: false
            };
            
            generatedBlocks.push(timeBlock);
            
            console.log('[useWeekViewData] Generated recurring time block:', {
              day: day.toFormat('yyyy-MM-dd'),
              dayOfWeek: dayName,
              start: displayStart.toFormat('HH:mm'),
              end: displayEnd.toFormat('HH:mm'),
              timezone: {
                slot: slotTimezone,
                display: userTimeZone
              }
            });
          } catch (error) {
            console.error('[useWeekViewData] Error creating recurring time block:', error, {
              day: day.toISO(),
              slot
            });
          }
        });
      }
    });
    
    return generatedBlocks;
  };

  // Fetch clinician data to get recurring availability pattern
  const fetchClinicianData = async (clinicianId: string) => {
    try {
      // Explicitly list all required columns instead of using wildcard
      const { data, error } = await supabase
        .from('clinicians')
        .select(`
          id,
          clinician_first_name,
          clinician_last_name,
          clinician_professional_name,
          clinician_email,
          clinician_time_zone,
          clinician_bio,
          clinician_image_url,
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
        
      if (error) {
        console.error('[useWeekViewData] Error fetching clinician data:', error);
        return null;
      }
      
      console.log('[useWeekViewData] Fetched clinician data for recurring availability', {
        clinicianId,
        hasData: !!data,
      });
      
      return data;
    } catch (error) {
      console.error('[useWeekViewData] Unexpected error fetching clinician data:', error);
      return null;
    }
  };

  // Fetch clinician appointments and availability
  useEffect(() => {
    const initializeData = async () => {
      setLoading(true);
      
      if (!clinicianId) {
        setAppointments([]);
        setAvailability([]);
        setClients(new Map());
        setExceptions([]);
        setTimeBlocks([]);
        setAppointmentBlocks([]);
        setClinicianData(null);
        setWeeklyPattern(null);
        setLoading(false);
        return;
      }

      try {
        // Use the first day to determine the week
        const firstDay = weekDays[0] || TimeZoneService.now(userTimeZone);
        
        // Get expanded date range for better data capture - add padding
        // Start a week before the displayed week, end a week after
        const padStartDay = firstDay.minus({ days: 7 });
        const padEndDay = firstDay.plus({ days: 21 }); // current week (7) + padding (14)
        
        // UTC date bounds with expanded range
        const utcStart = padStartDay.toUTC().toISO();
        const utcEnd = padEndDay.toUTC().toISO();

        console.log('[useWeekViewData] Fetching for week:', {
          localStart: firstDay.toISO(),
          paddedStart: padStartDay.toISO(),
          paddedEnd: padEndDay.toISO(),
          utcStart,
          utcEnd,
          tz: userTimeZone
        });

        // *** NEW: Fetch clinician data for recurring pattern ***
        const fetchedClinicianData = await fetchClinicianData(clinicianId);
        
        // Fetch all required data in parallel
        const [appointmentData, availabilityData, clientData, exceptionData] = await Promise.all([
          // Fetch appointments if no external appointments provided
          externalAppointments.length === 0 && clinicianId ? supabase
            .from('appointments')
            .select('*')
            .eq('clinician_id', clinicianId)
            .gte('start_at', utcStart)
            .lt('end_at', utcEnd)  // Fix: use end_at for the upper boundary
            .order('start_at', { ascending: true }) : Promise.resolve({ data: [], error: null }),
          
          // Fetch availability blocks - FIXED: Corrected the query logic
          clinicianId ? supabase
            .from('availability_blocks')
            .select('*')
            .eq('clinician_id', clinicianId)
            .gte('start_at', utcStart)
            .lt('end_at', utcEnd)   // This is correct logic: blocks starting in our range
            .order('start_at', { ascending: true }) : Promise.resolve({ data: [], error: null }),
          
          // Fetch client data once
          clinicianId ? supabase
            .from('clients')
            .select('id, client_first_name, client_last_name, client_preferred_name')
            // FIXED: Use client_assigned_therapist instead of clinician_id
            .eq('client_assigned_therapist', clinicianId.toString()) : Promise.resolve({ data: [], error: null }),
            
          // Fetch availability exceptions
          clinicianId ? supabase
            .from('availability_exceptions')
            .select('*')
            .eq('clinician_id', clinicianId) : Promise.resolve({ data: [], error: null })
        ]);

        // Process appointments - use external if provided, otherwise use fetched
        const fetchedAppts = externalAppointments.length > 0 
          ? externalAppointments 
          : (appointmentData.error ? [] : appointmentData.data);
          
        console.log('[useWeekViewData] Using Appointments:', {
          count: fetchedAppts.length,
          source: externalAppointments.length > 0 ? 'external' : 'database',
          sample: fetchedAppts.length ? fetchedAppts[0] : null,
          tz: userTimeZone
        });

        // Process availability
        const fetchedBlocks = availabilityData.error ? [] : availabilityData.data;
        console.log('[useWeekViewData] Fetched blocks:', {
          tz: userTimeZone,
          blocksCount: fetchedBlocks.length
        });

        // Process exceptions
        const fetchedExceptions = exceptionData.error ? [] : exceptionData.data;
        console.log('[useWeekViewData] Fetched exceptions:', {
          count: fetchedExceptions.length
        });

        // Build client map
        const clientMap = new Map<string, Client>();
        (clientData.data || []).forEach(client => {
          clientMap.set(client.id, client);
          console.log('[useWeekViewData] Client loaded:', {
            id: client.id,
            name: client.client_first_name
          });
        });

        // *** Extract weekly pattern from clinician data ***
        let extractedPattern = null;
        if (fetchedClinicianData) {
          setClinicianData(fetchedClinicianData);
          extractedPattern = extractWeeklyPatternFromClinicianData(fetchedClinicianData);
          
          // DEBUG: Log the extracted pattern to check timezone values
          console.log('[useWeekViewData DEBUG] Initial extracted weeklyPattern:', 
            JSON.stringify({
              monday: { 
                isAvailable: extractedPattern.monday.isAvailable,
                slotsCount: extractedPattern.monday.timeSlots.length,
                sampleSlot: extractedPattern.monday.timeSlots.length > 0 ? {
                  startTime: extractedPattern.monday.timeSlots[0]?.startTime,
                  endTime: extractedPattern.monday.timeSlots[0]?.endTime,
                  timezone: extractedPattern.monday.timeSlots[0]?.timezone,
                  timezoneType: typeof extractedPattern.monday.timeSlots[0]?.timezone
                } : null
              },
              thursday: { 
                isAvailable: extractedPattern.thursday.isAvailable,
                slotsCount: extractedPattern.thursday.timeSlots.length,
                sampleSlot: extractedPattern.thursday.timeSlots.length > 0 ? {
                  startTime: extractedPattern.thursday.timeSlots[0]?.startTime,
                  endTime: extractedPattern.thursday.timeSlots[0]?.endTime,
                  timezone: extractedPattern.thursday.timeSlots[0]?.timezone,
                  timezoneType: typeof extractedPattern.thursday.timeSlots[0]?.timezone
                } : null
              }
            }, null, 2));
          
          // Create a deep clone of the pattern using our safe cloning function
          // This replaces the problematic JSON.parse(JSON.stringify()) approach
          const safePattern = safeClone(extractedPattern);
          
          // Log pattern before and after cloning to verify timezone types are preserved
          if (extractedPattern.monday.timeSlots.length > 0) {
            console.log('[useWeekViewData] Pattern timezone BEFORE cloning:', {
              value: extractedPattern.monday.timeSlots[0].timezone,
              type: typeof extractedPattern.monday.timeSlots[0].timezone
            });
            console.log('[useWeekViewData] Pattern timezone AFTER cloning:', {
              value: safePattern.monday.timeSlots[0].timezone,
              type: typeof safePattern.monday.timeSlots[0].timezone
            });
          }
          
          // Set the weekly pattern state with the safely cloned pattern
          setWeeklyPattern(safePattern);
          
          console.log('[useWeekViewData] Extracted weekly pattern:', {
            monday: safePattern.monday.timeSlots.length > 0,
            tuesday: safePattern.tuesday.timeSlots.length > 0,
            wednesday: safePattern.wednesday.timeSlots.length > 0,
            thursday: safePattern.thursday.timeSlots.length > 0,
            friday: safePattern.friday.timeSlots.length > 0,
            saturday: safePattern.saturday.timeSlots.length > 0,
            sunday: safePattern.sunday.timeSlots.length > 0,
          });
        }

        setAppointments(fetchedAppts);
        setAvailability(fetchedBlocks);
        setClients(clientMap);
        setExceptions(fetchedExceptions);
        
        // Process time blocks and appointment blocks using the extracted pattern directly
        // This avoids any potential issues with the state not being updated yet
        processTimeBlocks(fetchedBlocks, fetchedExceptions, extractedPattern, weekDays);
        processAppointmentBlocks(fetchedAppts, clientMap);
        
      } catch (error) {
        console.error('[useWeekViewData] Unexpected Error:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clinicianId, refreshTrigger, userTimeZone, externalAppointments]);

  // Process availability blocks into time blocks
  const processTimeBlocks = (
    blocks: AvailabilityBlock[], 
    exceptions: AvailabilityException[],
    weeklyPattern: ClinicianWeeklyAvailability | null,
    days: DateTime[]
  ) => {
    console.log('[useWeekViewData] Processing time blocks', {
      blocksCount: blocks.length,
      exceptionsCount: exceptions.length,
      hasWeeklyPattern: !!weeklyPattern
    });
    
    const timeBlocks: TimeBlock[] = [];
    
    // Process regular availability blocks
    blocks.forEach(block => {
      if (!block.start_at || !block.end_at) {
        console.warn('[useWeekViewData] Invalid availability block', {
          blockId: block.id,
          startAt: block.start_at,
          endAt: block.end_at
        });
        return;
      }
      
      try {
        const start = DateTime.fromISO(block.start_at, { zone: 'UTC' }).setZone(userTimeZone);
        const end = DateTime.fromISO(block.end_at, { zone: 'UTC' }).setZone(userTimeZone);
        const day = start.startOf('day');
        
        timeBlocks.push({
          start,
          end,
          day,
          availabilityIds: [block.id],
          isException: false,
          isStandalone: false
        });
        
        console.log('[useWeekViewData] Created time block', {
          blockId: block.id,
          start: start.toFormat('yyyy-MM-dd HH:mm'),
          end: end.toFormat('yyyy-MM-dd HH:mm'),
          day: day.toFormat('yyyy-MM-dd')
        });
      } catch (error) {
        console.error('[useWeekViewData] Error creating time block', {
          blockId: block.id,
          error
        });
      }
    });
    
    // Process exceptions (simplified for now)
    exceptions.forEach(exception => {
      if (exception.is_deleted || !exception.start_time || !exception.end_time) {
        return;
      }
      
      try {
        // Create a DateTime from the specific date and time
        const specificDate = DateTime.fromISO(exception.specific_date, { zone: userTimeZone });
        const startTime = exception.start_time.split(':').map(Number);
        const endTime = exception.end_time.split(':').map(Number);
        
        const start = specificDate.set({
          hour: startTime[0] || 0,
          minute: startTime[1] || 0,
          second: 0,
          millisecond: 0
        });
        
        const end = specificDate.set({
          hour: endTime[0] || 0,
          minute: endTime[1] || 0,
          second: 0,
          millisecond: 0
        });
        
        timeBlocks.push({
          start,
          end,
          day: start.startOf('day'),
          availabilityIds: [exception.id],
          isException: true,
          isStandalone: true
        });
      } catch (error) {
        console.error('[useWeekViewData] Error processing exception', {
          exceptionId: exception.id,
          error
        });
      }
    });
    
    // *** NEW: Generate and add recurring time blocks from weekly pattern ***
    if (weeklyPattern) {
      const recurringBlocks = generateTimeBlocksFromWeeklyPattern(weeklyPattern, days);
      if (recurringBlocks.length > 0) {
        console.log('[useWeekViewData] Adding recurring time blocks:', recurringBlocks.length);
        timeBlocks.push(...recurringBlocks);
      }
    }
    
    setTimeBlocks(timeBlocks);
    console.log('[useWeekViewData] Finished processing time blocks', {
      totalBlocks: timeBlocks.length
    });
  };
  
  // Process appointments into appointment blocks - UPDATED to use formatClientName utility
  const processAppointmentBlocks = (appts: Appointment[], clientMap: Map<string, Client>) => {
    console.log('[useWeekViewData] Processing appointment blocks', {
      appointmentsCount: appts.length,
      clientsCount: clientMap.size,
      dayKeys
    });
    
    const appointmentBlocks: AppointmentBlock[] = [];
    
    appts.forEach(appointment => {
      if (!appointment.start_at || !appointment.end_at) {
        console.warn('[useWeekViewData] Invalid appointment', {
          appointmentId: appointment.id,
          startAt: appointment.start_at,
          endAt: appointment.end_at
        });
        return;
      }
      
      try {
        // Convert start/end times to the user's timezone
        const start = DateTime.fromISO(appointment.start_at, { zone: 'UTC' }).setZone(userTimeZone);
        const end = DateTime.fromISO(appointment.end_at, { zone: 'UTC' }).setZone(userTimeZone);
        const day = start.startOf('day');
        
        // Get client name using formatClientName utility for consistent formatting
        let clientName = appointment.clientName;
        if (!clientName) {
          const client = clientMap.get(appointment.client_id);
          if (client) {
            // Use formatClientName to ensure preferred/first name AND last name are included
            clientName = formatClientName(client);
          } else {
            clientName = getClientName(appointment.client_id);
          }
        }
        
        // Get formatted date for logging
        const dayStr = day.toFormat('yyyy-MM-dd');
        
        // Check if this appointment's day is in our view
        // NEW: We no longer filter by day - we'll show all appointments in the data range
        // Visibility will be controlled by the TimeSlot component
        
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
        
        console.log('[useWeekViewData] Created appointment block', {
          appointmentId: appointment.id,
          clientName,
          start: start.toFormat('yyyy-MM-dd HH:mm'),
          end: end.toFormat('yyyy-MM-dd HH:mm'),
          day: dayStr,
          inView: dayKeys.includes(dayStr),
          appointment_timezone: appointment.appointment_timezone
        });
      } catch (error) {
        console.error('[useWeekViewData] Error creating appointment block', {
          appointmentId: appointment.id,
          error
        });
      }
    });
    
    setAppointmentBlocks(appointmentBlocks);
    console.log('[useWeekViewData] Finished processing appointment blocks', {
      totalBlocks: appointmentBlocks.length
    });
  };

  // Map appointments by day for the week
  const dayAppointmentsMap = useMemo(() => {
    const resultMap = new Map<string, Appointment[]>();
    
    dayKeys.forEach(key => resultMap.set(key, []));
    
    // Map appointments to days
    appointments.forEach(appointment => {
      try {
        // UTC to local conversion
        const slotTime = DateTime.fromISO(appointment.start_at).setZone(userTimeZone);
        const dayStr = slotTime.toFormat('yyyy-MM-dd');
        
        if (resultMap.has(dayStr)) {
          const existing: Appointment[] = resultMap.get(dayStr) || [];
          resultMap.set(dayStr, [...existing, appointment]);
        }
      } catch (error) {
        console.error('[useWeekViewData] Error mapping appointment to day', {
          appointmentId: appointment.id,
          error
        });
      }
    });
    
    return resultMap;
  }, [appointments, dayKeys, userTimeZone]);

  // Map availability by day with clinician time zone
  const dayAvailabilityMap = useMemo(() => {
    const resultMap = new Map<string, AvailabilityBlock[]>();
    console.log('[useWeekViewData] Processing Blocks:', {
      blockCount: availability.length,
      sampleBlock: availability[0],
      userTime: userTimeZone
    });
    
    dayKeys.forEach(key => resultMap.set(key, []));
    
    availability.forEach(block => {
      // UTC->local conversion with time zone
      const blockTime = block.start_at ? DateTime.fromISO(block.start_at).setZone(userTimeZone) : null;
      const dayStr = blockTime ? blockTime.toFormat('yyyy-MM-dd') : '';
      
      if (dayStr && resultMap.has(dayStr)) {
        const existing = resultMap.get(dayStr) || [];
        resultMap.set(dayStr, [...existing, block]);
      }
    });

    return resultMap;
  }, [availability, dayKeys, userTimeZone]);

  // Utility function to check if a time slot is available
  const isTimeSlotAvailable = (day: Date, timeSlot: Date): boolean => {
    // Convert JS Date to DateTime
    const dayDt = DateTime.fromJSDate(day, { zone: userTimeZone });
    const timeSlotDt = DateTime.fromJSDate(timeSlot, { zone: userTimeZone });
    
    // Create the specific moment for this slot
    const slotTime = dayDt.set({
      hour: timeSlotDt.hour,
      minute: timeSlotDt.minute,
      second: 0,
      millisecond: 0
    });
    
    const dayStrForLog = dayDt.toFormat('yyyy-MM-dd');
    const slotTimeStrForLog = slotTime.toFormat('HH:mm:ss ZZZZ'); // Log with timezone
    
    // Log all timeBlocks being checked for this specific slotTime
    // This will show us if the timeBlocks array is what we expect at this point
    if (dayStrForLog === '2025-05-15' && slotTime.hour >= 8 && slotTime.hour <= 18) {
      console.log(`[isTimeSlotAvailable DEBUG] For Slot: ${slotTimeStrForLog} on ${dayStrForLog}. Checking against ${timeBlocks.length} blocks:`, 
        JSON.stringify(timeBlocks.map(b => ({
          start: b.start.toISO(), 
          end: b.end.toISO(), 
          day: b.day?.toISO()
        }))));
    }
    
    // Check if the time slot falls within any time block
    const isAvailable = timeBlocks.some(block => {
      const isSameDay = block.day?.hasSame(dayDt, 'day') || false;
      
      // More detailed logging for the actual comparison
      if (dayStrForLog === '2025-05-15' && slotTime.hour >= 8 && slotTime.hour <= 18) {
        console.log(`[isTimeSlotAvailable DEBUG] Comparing Slot: ${slotTime.toISO()} WITH Block Start: ${block.start.toISO()}, Block End: ${block.end.toISO()}, Block Day: ${block.day?.toISO()}, isSameDay: ${isSameDay}, ConditionMet: ${isSameDay && slotTime >= block.start && slotTime < block.end}`);
      }
      
      if (!isSameDay) return false;
      
      return slotTime >= block.start && slotTime < block.end;
    });
    
    if (dayStrForLog === '2025-05-15' && slotTime.hour >= 8 && slotTime.hour <= 18) {
      console.log(`[isTimeSlotAvailable] Final Check for ${dayStrForLog} ${slotTime.toFormat('HH:mm')}, found: ${isAvailable}`);
    }
    
    return isAvailable;
  };

  // Utility function to get the block for a time slot
  const getBlockForTimeSlot = (day: Date, timeSlot: Date): TimeBlock | undefined => {
    // Convert JS Date to DateTime
    const dayDt = DateTime.fromJSDate(day, { zone: userTimeZone });
    const timeSlotDt = DateTime.fromJSDate(timeSlot, { zone: userTimeZone });
    
    // Create the specific moment for this slot
    const slotTime = dayDt.set({
      hour: timeSlotDt.hour,
      minute: timeSlotDt.minute,
      second: 0,
      millisecond: 0
    });
    
    const dayStrForLog = dayDt.toFormat('yyyy-MM-dd');
    const slotTimeStrForLog = slotTime.toFormat('HH:mm:ss ZZZZ');
    
    // Only log for our target date
    const shouldLog = dayStrForLog === '2025-05-15' && slotTime.hour >= 8 && slotTime.hour <= 18;
    
    if (shouldLog) {
      console.log(`[getBlockForTimeSlot DEBUG] Searching for block at ${slotTimeStrForLog} on ${dayStrForLog}`);
      console.log(`[getBlockForTimeSlot DEBUG] Total blocks to search: ${timeBlocks.length}`);
    }
    
    // Find the block that contains this time slot
    let foundBlock: TimeBlock | undefined = undefined;
    
    for (const block of timeBlocks) {
      const isSameDay = block.day?.hasSame(dayDt, 'day') || false;
      
      if (shouldLog) {
        console.log(`[getBlockForTimeSlot DEBUG] Checking block: ${JSON.stringify({
          start: block.start.toFormat('HH:mm'),
          end: block.end.toFormat('HH:mm'),
          isSameDay,
          slotTime: slotTime.toFormat('HH:mm'),
          isWithinTimeRange: slotTime >= block.start && slotTime < block.end
        })}`);
      }
      
      if (!isSameDay) continue;
      
      if (slotTime >= block.start && slotTime < block.end) {
        foundBlock = block;
        if (shouldLog) {
          console.log(`[getBlockForTimeSlot DEBUG] FOUND BLOCK: ${JSON.stringify({
            start: block.start.toFormat('HH:mm'),
            end: block.end.toFormat('HH:mm'),
            isException: block.isException
          })}`);
        }
        break;
      }
    }
    
    if (shouldLog && !foundBlock) {
      console.log(`[getBlockForTimeSlot DEBUG] NO BLOCK FOUND for ${slotTimeStrForLog}`);
    }
    
    return foundBlock;
  };

  // Utility function to get the appointment for a time slot
  const getAppointmentForTimeSlot = (day: Date, timeSlot: Date): AppointmentBlock | undefined => {
    // Convert JS Date to DateTime
    const dayDt = DateTime.fromJSDate(day, { zone: userTimeZone });
    const timeSlotDt = DateTime.fromJSDate(timeSlot, { zone: userTimeZone });
    
    // Find the appointment that contains this time slot
    return appointmentBlocks.find(appt => {
      const isSameDay = appt.day?.hasSame(dayDt, 'day') || false;
      if (!isSameDay) return false;
      
      const slotTime = dayDt.set({
        hour: timeSlotDt.hour,
        minute: timeSlotDt.minute,
        second: 0,
        millisecond: 0
      });
      
      return slotTime >= appt.start && slotTime < appt.end;
    });
  };

  // Utility function to get availability for a block
  const getAvailabilityForBlock = (blockId: string): AvailabilityBlock | undefined => {
    return availability.find(block => block.id === blockId);
  };

  return {
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
    weeklyPattern,
    getAvailabilityForBlock,
    isTimeSlotAvailable,
    getBlockForTimeSlot,
    getAppointmentForTimeSlot,
  };
};
