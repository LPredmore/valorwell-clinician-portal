/**
 * This file tests imports that might be causing issues in the useWeekViewData hook
 */

// Test importing from supabase client
import { supabase } from '@/integrations/supabase/client';

// Test importing DateTime from luxon
import { DateTime } from 'luxon';

// Test importing types
import { Appointment } from '@/types/appointment';
import { AvailabilityBlock } from '@/types/availability';
import { ClientDetails } from '@/types/client';

// Test importing TimeZoneService
import { TimeZoneService } from '@/utils/timeZoneService';

// Test importing utils
import { formatClientName } from '@/utils/appointmentUtils';

// Test importing from local types
import { TimeBlock, AppointmentBlock, AvailabilityException } from '@/components/calendar/week-view/types';

// Export a function to test all imports
export function testImports() {
  console.log('=== Testing Imports ===');
  
  try {
    // Test supabase
    console.log('Testing supabase import...');
    if (supabase) {
      console.log('✓ supabase imported successfully');
    }
    
    // Test DateTime
    console.log('Testing DateTime import...');
    const now = DateTime.now();
    console.log('✓ DateTime imported successfully:', now.toISO());
    
    // Test TimeZoneService
    console.log('Testing TimeZoneService import...');
    const timezone = TimeZoneService.DEFAULT_TIMEZONE;
    console.log('✓ TimeZoneService imported successfully:', timezone);
    
    // Test formatClientName
    console.log('Testing formatClientName import...');
    const clientName = formatClientName({
      client_first_name: 'John',
      client_last_name: 'Doe',
      client_preferred_name: 'Johnny'
    });
    console.log('✓ formatClientName imported successfully:', clientName);
    
    // Test creating objects of imported types
    console.log('Testing type imports...');
    
    // Create a TimeBlock object
    const timeBlock: TimeBlock = {
      start: DateTime.now(),
      end: DateTime.now().plus({ hours: 1 }),
      day: DateTime.now().startOf('day'),
      availabilityIds: ['test-id'],
      isException: false,
      isStandalone: false
    };
    
    // Create an AppointmentBlock object
    const appointmentBlock: AppointmentBlock = {
      id: 'test-appointment-id',
      start: DateTime.now(),
      end: DateTime.now().plus({ hours: 1 }),
      day: DateTime.now().startOf('day'),
      clientId: 'test-client-id',
      clientName: 'Test Client',
      type: 'Initial Consultation'
    };
    
    console.log('✓ Type imports successful');
    
    return {
      success: true,
      message: 'All imports tested successfully'
    };
  } catch (error) {
    console.error('Error testing imports:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}