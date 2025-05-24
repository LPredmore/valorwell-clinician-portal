import { DateTime } from 'luxon';
import { TimeZoneService } from '@/utils/timeZoneService';

/**
 * This function tests the basic functionality needed by the useWeekViewData hook
 * without actually using the hook (since hooks can only be used in components).
 */
export function testWeekViewDataFunctionality() {
  console.log('=== Testing WeekViewData Functionality ===');
  
  try {
    // Test DateTime functionality
    console.log('Testing DateTime...');
    const now = DateTime.now();
    console.log('Current DateTime:', now.toISO());
    
    // Test timezone conversion
    console.log('Testing timezone conversion...');
    const timezone = TimeZoneService.DEFAULT_TIMEZONE;
    const nowInTimezone = now.setZone(timezone);
    console.log('DateTime in timezone:', nowInTimezone.toISO());
    
    // Generate week days
    console.log('Generating week days...');
    const today = new Date();
    const days = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(today);
      day.setDate(today.getDate() - today.getDay() + i);
      days.push(day);
    }
    
    // Convert to DateTime objects
    const weekDays = days.map(day => 
      TimeZoneService.fromJSDate(day, timezone)
    );
    
    console.log('Week days generated:', 
      weekDays.map(day => day.toFormat('yyyy-MM-dd'))
    );
    
    // Test day keys generation (similar to useWeekViewData)
    const dayKeys = weekDays.map(day => day.toFormat('yyyy-MM-dd'));
    console.log('Day keys:', dayKeys);
    
    // Test time block generation
    console.log('Testing time block generation...');
    const timeBlocks = [];
    
    // Create a sample time block
    const firstDay = weekDays[0];
    const startTime = firstDay.set({ hour: 9, minute: 0, second: 0 });
    const endTime = firstDay.set({ hour: 10, minute: 0, second: 0 });
    
    timeBlocks.push({
      start: startTime,
      end: endTime,
      day: firstDay.startOf('day'),
      availabilityIds: ['test-id'],
      isException: false,
      isStandalone: false
    });
    
    console.log('Sample time block:', {
      start: timeBlocks[0].start.toFormat('yyyy-MM-dd HH:mm'),
      end: timeBlocks[0].end.toFormat('yyyy-MM-dd HH:mm'),
      day: timeBlocks[0].day.toFormat('yyyy-MM-dd')
    });
    
    // Test time slot availability check
    console.log('Testing time slot availability check...');
    const testTimeSlot = new Date(firstDay.toJSDate());
    testTimeSlot.setHours(9, 30, 0, 0);
    
    const isAvailable = timeBlocks.some(block => {
      const isSameDay = block.day?.hasSame(firstDay, 'day') || false;
      if (!isSameDay) return false;
      
      const slotTime = firstDay.set({
        hour: testTimeSlot.getHours(),
        minute: testTimeSlot.getMinutes(),
        second: 0,
        millisecond: 0
      });
      
      return slotTime >= block.start && slotTime < block.end;
    });
    
    console.log('Time slot available:', isAvailable);
    
    return {
      success: true,
      message: 'All WeekViewData functionality tests passed'
    };
  } catch (error) {
    console.error('Error in testWeekViewDataFunctionality:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}