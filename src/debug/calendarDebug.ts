// Calendar Debug Utility
import { DateTime } from 'luxon';

export const debugCalendar = () => {
  console.log('=== Calendar Debug Utility ===');
  
  try {
    // Test DateTime functionality
    const now = DateTime.now();
    console.log('Current DateTime:', now.toISO());
    
    // Test timezone conversion
    const utcNow = DateTime.utc();
    console.log('UTC DateTime:', utcNow.toISO());
    console.log('UTC to Local:', utcNow.toLocal().toISO());
    
    // Test date manipulation
    const tomorrow = now.plus({ days: 1 });
    console.log('Tomorrow:', tomorrow.toISO());
    
    // Test week calculation
    const startOfWeek = now.startOf('week');
    console.log('Start of Week:', startOfWeek.toISO());
    
    // Generate week days
    const weekDays = [];
    for (let i = 0; i < 7; i++) {
      weekDays.push(startOfWeek.plus({ days: i }));
    }
    console.log('Week Days:', weekDays.map(day => day.toFormat('yyyy-MM-dd')));
    
    return {
      success: true,
      message: 'Calendar debug tests passed'
    };
  } catch (error) {
    console.error('Calendar Debug Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
};

// Export a function to test the useWeekViewData hook dependencies
export const testWeekViewDataDependencies = () => {
  console.log('=== Testing WeekViewData Dependencies ===');
  
  try {
    // Test DateTime functionality
    const now = DateTime.now();
    console.log('DateTime works:', now.toISO());
    
    // Test array operations that might be used in the hook
    const testArray = [1, 2, 3, 4, 5];
    const mapped = testArray.map(x => x * 2);
    const filtered = testArray.filter(x => x > 2);
    console.log('Array operations work:', { mapped, filtered });
    
    // Test object operations
    const testObj = { a: 1, b: 2 };
    const cloned = { ...testObj, c: 3 };
    console.log('Object operations work:', cloned);
    
    return {
      success: true,
      message: 'All WeekViewData dependencies seem to be working'
    };
  } catch (error) {
    console.error('WeekViewData Dependencies Test Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
};