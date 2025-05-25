import { useState, useCallback, useMemo } from 'react';
import { DateTime } from 'luxon';
import { AvailabilityBlock, ClinicianAvailabilitySlot } from '@/types/availability';
import { TimeBlock } from '@/components/calendar/week-view/types';
import { CalendarDebugUtils } from '@/utils/calendarDebugUtils';
import * as TimeZoneUtils from '@/utils/timeZoneUtils';

// Component name for logging
const COMPONENT_NAME = 'useAvailabilityProcessor';

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

/**
 * Extract weekly availability pattern from clinician data
 */
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
  const defaultTimezone = 'America/Chicago';
  
  // Get clinician's default timezone (ensuring it's a string)
  const clinicianDefaultTimezone =
    typeof clinicianData.clinician_time_zone === 'string'
      ? TimeZoneUtils.ensureIANATimeZone(clinicianData.clinician_time_zone)
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
          determinedTimezoneString = TimeZoneUtils.ensureIANATimeZone(rawTimezoneFromDbSlot.trim());
        }
        // Otherwise fall back to clinician's default timezone
        else if (typeof clinicianDefaultTimezone === 'string' && clinicianDefaultTimezone.trim()) {
          determinedTimezoneString = TimeZoneUtils.ensureIANATimeZone(clinicianDefaultTimezone.trim());
        }
        
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

/**
 * Extract clinician availability slots from clinician data
 * This function extracts the availability slots directly from the clinician table columns
 */
const extractAvailabilitySlotsFromClinicianData = (clinicianData: any): ClinicianAvailabilitySlot[] => {
  if (!clinicianData) return [];
  
  const availabilitySlots: ClinicianAvailabilitySlot[] = [];
  const daysOfWeek = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const defaultTimezone = 'America/Chicago';
  
  // Get clinician's default timezone
  const clinicianDefaultTimezone =
    typeof clinicianData.clinician_time_zone === 'string'
      ? TimeZoneUtils.ensureIANATimeZone(clinicianData.clinician_time_zone)
      : defaultTimezone;
  
  // Process each day and slot
  daysOfWeek.forEach(day => {
    for (let slotNum = 1; slotNum <= 3; slotNum++) {
      const startTimeKey = `clinician_availability_start_${day}_${slotNum}`;
      const endTimeKey = `clinician_availability_end_${day}_${slotNum}`;
      const timezoneKey = `clinician_availability_timezone_${day}_${slotNum}`;
      
      // Only add slots that have both start and end times
      if (clinicianData[startTimeKey] && clinicianData[endTimeKey]) {
        // Determine timezone with fallbacks
        let timezone = defaultTimezone;
        if (typeof clinicianData[timezoneKey] === 'string' && clinicianData[timezoneKey].trim()) {
          timezone = TimeZoneUtils.ensureIANATimeZone(clinicianData[timezoneKey].trim());
        } else if (typeof clinicianDefaultTimezone === 'string' && clinicianDefaultTimezone.trim()) {
          timezone = clinicianDefaultTimezone;
        }
        
        // Create and add the availability slot
        availabilitySlots.push({
          day,
          slot: slotNum,
          start_time: clinicianData[startTimeKey],
          end_time: clinicianData[endTimeKey],
          timezone: String(timezone)
        });
      }
    }
  });
  
  return availabilitySlots;
};

/**
 * Convert clinician availability slots to availability blocks
 * This function creates compatibility availability blocks from the clinician availability slots
 */
const convertSlotsToAvailabilityBlocks = (
  slots: ClinicianAvailabilitySlot[],
  clinicianId: string
): AvailabilityBlock[] => {
  if (!slots.length || !clinicianId) return [];
  
  return slots.map((slot, index) => {
    // Generate a deterministic ID for the availability block
    const id = `clinician-${clinicianId}-${slot.day}-${slot.slot}`;
    
    // Create the availability block
    return {
      id,
      clinician_id: clinicianId,
      start_at: '', // Will be set in processTimeBlocks
      end_at: '',   // Will be set in processTimeBlocks
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  });
};

/**
 * Hook for processing availability data into time blocks
 * Refactored to use clinician table columns directly for availability data
 */
export const useAvailabilityProcessor = (
  clinicianData: any,
  availabilityBlocks: AvailabilityBlock[], // Kept for backward compatibility
  exceptions: any[], // Kept for backward compatibility
  weekDays: DateTime[],
  userTimeZone: string
) => {
  // Performance tracking
  const processingStartTime = { current: 0 };
  
  // Extract weekly pattern from clinician data
  const weeklyPattern = useMemo(() =>
    extractWeeklyPatternFromClinicianData(clinicianData),
    [clinicianData]
  );

  /**
   * Generate time blocks from weekly recurring pattern
   */
  const generateTimeBlocksFromWeeklyPattern = useCallback((
    pattern: ClinicianWeeklyAvailability,
    days: DateTime[]
  ): TimeBlock[] => {
    if (!pattern) return [];
    
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
            const slotTimezone = TimeZoneUtils.serializeTimeZone(slot.timezone) || defaultTimezone;
            
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
          } catch (error) {
            CalendarDebugUtils.error(COMPONENT_NAME, 'Error creating recurring time block:', error);
          }
        });
      }
    });
    
    return generatedBlocks;
  }, [userTimeZone]);

  // Process time blocks directly from clinician data
  const timeBlocks = useMemo(() => {
    processingStartTime.current = performance.now();
    
    CalendarDebugUtils.logDataLoading(COMPONENT_NAME, 'processing-time-blocks-start', {
      hasClinicianData: !!clinicianData,
      weekDaysCount: weekDays?.length || 0
    });
    
    // Generate recurring blocks from weekly pattern
    const recurringBlocks = generateTimeBlocksFromWeeklyPattern(weeklyPattern, weekDays);
    
    // Log processing performance
    const processingDuration = performance.now() - processingStartTime.current;
    CalendarDebugUtils.logPerformance(COMPONENT_NAME, 'time-blocks-processing', processingDuration, {
      recurringBlocksCount: recurringBlocks.length,
      totalBlocksCount: recurringBlocks.length
    });
    
    return recurringBlocks;
  }, [weeklyPattern, weekDays, clinicianData, generateTimeBlocksFromWeeklyPattern]);

  return {
    timeBlocks,
    weeklyPattern
  };
};

export default useAvailabilityProcessor;