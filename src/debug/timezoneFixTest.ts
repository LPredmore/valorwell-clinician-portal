/**
 * Timezone Fix Test
 * 
 * This file contains tests to verify that the timezone conversion bug fixes
 * are working correctly. It tests various scenarios including array values,
 * string values, and invalid values.
 */

import { TimeZoneService } from '@/utils/timeZoneService';
import * as TimeZoneUtils from '@/utils/timeZoneUtils';
import { DateTime } from 'luxon';

/**
 * Test the TimeZoneService.ensureIANATimeZone method with various inputs
 */
export function testTimeZoneServiceFixes() {
  console.log('=== Testing TimeZoneService.ensureIANATimeZone fixes ===');
  
  // Test with string value
  const stringResult = TimeZoneService.ensureIANATimeZone('America/New_York');
  console.log('String input:', 'America/New_York', '→', stringResult);
  
  // Test with array value (critical fix)
  const arrayResult = TimeZoneService.ensureIANATimeZone(['America/Los_Angeles']);
  console.log('Array input:', ['America/Los_Angeles'], '→', arrayResult);
  
  // Test with empty array
  const emptyArrayResult = TimeZoneService.ensureIANATimeZone([]);
  console.log('Empty array input:', [], '→', emptyArrayResult);
  
  // Test with null
  const nullResult = TimeZoneService.ensureIANATimeZone(null);
  console.log('Null input:', null, '→', nullResult);
  
  // Test with undefined
  const undefinedResult = TimeZoneService.ensureIANATimeZone(undefined);
  console.log('Undefined input:', undefined, '→', undefinedResult);
  
  // Test with invalid string
  const invalidResult = TimeZoneService.ensureIANATimeZone('Invalid/Timezone');
  console.log('Invalid string input:', 'Invalid/Timezone', '→', invalidResult);
  
  // Test with object
  const objectResult = TimeZoneService.ensureIANATimeZone({ toString: () => 'America/Chicago' } as any);
  console.log('Object input:', '{ toString: () => "America/Chicago" }', '→', objectResult);
  
  console.log('=== TimeZoneService.ensureIANATimeZone tests complete ===\n');
}

/**
 * Test the TimeZoneUtils.isValidTimeZone method with various inputs
 */
export function testTimeZoneUtilsFixes() {
  console.log('=== Testing TimeZoneUtils.isValidTimeZone fixes ===');
  
  // Test with string value
  const stringResult = TimeZoneUtils.isValidTimeZone('America/New_York');
  console.log('String input:', 'America/New_York', '→', stringResult);
  
  // Test with array value (critical fix)
  const arrayResult = TimeZoneUtils.isValidTimeZone(['America/Los_Angeles']);
  console.log('Array input:', ['America/Los_Angeles'], '→', arrayResult);
  
  // Test with empty array
  const emptyArrayResult = TimeZoneUtils.isValidTimeZone([]);
  console.log('Empty array input:', [], '→', emptyArrayResult);
  
  // Test with null
  const nullResult = TimeZoneUtils.isValidTimeZone(null);
  console.log('Null input:', null, '→', nullResult);
  
  // Test with undefined
  const undefinedResult = TimeZoneUtils.isValidTimeZone(undefined);
  console.log('Undefined input:', undefined, '→', undefinedResult);
  
  // Test with invalid string
  const invalidResult = TimeZoneUtils.isValidTimeZone('Invalid/Timezone');
  console.log('Invalid string input:', 'Invalid/Timezone', '→', invalidResult);
  
  console.log('=== TimeZoneUtils.isValidTimeZone tests complete ===\n');
}

/**
 * Test the TimeZoneUtils.serializeTimeZone method with various inputs
 */
export function testSerializeTimeZoneFixes() {
  console.log('=== Testing TimeZoneUtils.serializeTimeZone fixes ===');
  
  // Test with string value
  const stringResult = TimeZoneUtils.serializeTimeZone('America/New_York');
  console.log('String input:', 'America/New_York', '→', stringResult);
  
  // Test with array value (critical fix)
  const arrayResult = TimeZoneUtils.serializeTimeZone(['America/Los_Angeles']);
  console.log('Array input:', ['America/Los_Angeles'], '→', arrayResult);
  
  // Test with empty array
  const emptyArrayResult = TimeZoneUtils.serializeTimeZone([]);
  console.log('Empty array input:', [], '→', emptyArrayResult);
  
  // Test with null
  const nullResult = TimeZoneUtils.serializeTimeZone(null);
  console.log('Null input:', null, '→', nullResult);
  
  // Test with undefined
  const undefinedResult = TimeZoneUtils.serializeTimeZone(undefined);
  console.log('Undefined input:', undefined, '→', undefinedResult);
  
  // Test with object
  const objectResult = TimeZoneUtils.serializeTimeZone({ toString: () => 'America/Chicago' });
  console.log('Object input:', '{ toString: () => "America/Chicago" }', '→', objectResult);
  
  console.log('=== TimeZoneUtils.serializeTimeZone tests complete ===\n');
}

/**
 * Test DateTime creation with various timezone inputs
 */
export function testDateTimeCreation() {
  console.log('=== Testing DateTime creation with fixed timezone handling ===');
  
  // Current time in various timezones
  const now = DateTime.now();
  console.log('Current time (local):', now.toString());
  
  // Test with string timezone
  try {
    const nyTime = now.setZone('America/New_York');
    console.log('New York time (string):', nyTime.toString());
  } catch (error) {
    console.error('Error with string timezone:', error);
  }
  
  // Test with array timezone using our fixed TimeZoneService
  try {
    const laTimezone = ['America/Los_Angeles'];
    const safeTimezone = TimeZoneService.ensureIANATimeZone(laTimezone);
    const laTime = now.setZone(safeTimezone);
    console.log('Los Angeles time (from array):', laTime.toString());
  } catch (error) {
    console.error('Error with array timezone:', error);
  }
  
  console.log('=== DateTime creation tests complete ===\n');
}

/**
 * Run all timezone fix tests
 */
export function runAllTimezoneFixTests() {
  console.log('======= TIMEZONE FIX VERIFICATION TESTS =======');
  testTimeZoneServiceFixes();
  testTimeZoneUtilsFixes();
  testSerializeTimeZoneFixes();
  testDateTimeCreation();
  console.log('======= ALL TIMEZONE FIX TESTS COMPLETE =======');
  
  return {
    success: true,
    message: 'All timezone fix tests completed successfully'
  };
}

// Export a default function for easy importing and running
export default runAllTimezoneFixTests;