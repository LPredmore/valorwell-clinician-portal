import { Appointment } from '@/types/appointment';
import { CalendarDebugUtils } from './calendarDebugUtils';
import * as TimeZoneUtils from './timeZoneUtils';

// Component name for logging
const COMPONENT_NAME = 'TimezoneTestUtils';

/**
 * Test timezone conversion with real appointment data
 * This function is used to validate that timezone conversion works correctly
 * with actual appointment data from the database
 * @param appointments Array of appointments to test
 * @param targetTimezone The timezone to convert to
 * @returns Object containing test results and any errors
 */
export function testTimezoneConversion(appointments: Appointment[], targetTimezone: string): {
  success: boolean;
  results: Array<{
    id: string;
    originalStart: string;
    originalEnd: string;
    convertedStart: string;
    convertedEnd: string;
    isValid: boolean;
    error?: string;
  }>;
  errors: string[];
} {
  const results: Array<{
    id: string;
    originalStart: string;
    originalEnd: string;
    convertedStart: string;
    convertedEnd: string;
    isValid: boolean;
    error?: string;
  }> = [];
  
  const errors: string[] = [];
  let success = true;
  
  CalendarDebugUtils.log(COMPONENT_NAME, 'Testing timezone conversion', {
    appointmentCount: appointments.length,
    targetTimezone
  });
  
  try {
    // Ensure we have a valid timezone
    const safeTimezone = TimeZoneUtils.ensureIANATimeZone(targetTimezone);
    
    // Test each appointment
    appointments.forEach(appointment => {
      try {
        // Get the original start and end times
        const originalStart = appointment.start_at;
        const originalEnd = appointment.end_at;
        
        // Convert to the target timezone
        const convertedStart = TimeZoneUtils.fromUTC(originalStart, safeTimezone);
        const convertedEnd = TimeZoneUtils.fromUTC(originalEnd, safeTimezone);
        
        // Check if the conversion was successful
        const isValid = convertedStart.isValid && convertedEnd.isValid;
        
        // Add to results
        results.push({
          id: appointment.id,
          originalStart,
          originalEnd,
          convertedStart: convertedStart.toISO() || 'invalid',
          convertedEnd: convertedEnd.toISO() || 'invalid',
          isValid
        });
        
        // If not valid, add to errors
        if (!isValid) {
          const error = `Conversion failed for appointment ${appointment.id}: ${convertedStart.invalidReason || convertedEnd.invalidReason}`;
          errors.push(error);
          success = false;
        }
      } catch (error) {
        // Handle any errors during conversion
        const errorMessage = error instanceof Error ? error.message : String(error);
        results.push({
          id: appointment.id,
          originalStart: appointment.start_at,
          originalEnd: appointment.end_at,
          convertedStart: 'error',
          convertedEnd: 'error',
          isValid: false,
          error: errorMessage
        });
        errors.push(`Error processing appointment ${appointment.id}: ${errorMessage}`);
        success = false;
      }
    });
    
    // Log the results
    CalendarDebugUtils.log(COMPONENT_NAME, 'Timezone conversion test results', {
      success,
      errorCount: errors.length,
      successCount: results.filter(r => r.isValid).length
    });
    
    return { success, results, errors };
  } catch (error) {
    // Handle any errors during the test
    const errorMessage = error instanceof Error ? error.message : String(error);
    CalendarDebugUtils.error(COMPONENT_NAME, 'Error testing timezone conversion', error);
    return {
      success: false,
      results,
      errors: [`General error testing timezone conversion: ${errorMessage}`]
    };
  }
}