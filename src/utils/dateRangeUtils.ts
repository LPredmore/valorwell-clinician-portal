
import { DateTime } from 'luxon';
import { PostgrestFilterBuilder } from '@supabase/postgrest-js';

export const getWeekRange = (date: Date, timeZone: string) => {
  // Ensure valid timezone before using with Luxon
  const safeTimeZone = timeZone === 'loading' ? 'UTC' : timeZone;
  
  // Validate input date
  if (!date || isNaN(date.getTime())) {
    console.error('[getWeekRange] ERROR: Invalid date provided', { date, timeZone });
    const now = new Date();
    return {
      start: now,
      end: now
    };
  }
  
  const dt = DateTime.fromJSDate(date).setZone(safeTimeZone);
  return {
    start: dt.startOf('week').toJSDate(),
    end: dt.endOf('week').toJSDate()
  };
};

export const temporalOverlapQuery = (
  query: PostgrestFilterBuilder<any, any, any>,
  startDate: Date,
  endDate: Date
) => {
  // Validate dates before ISO conversion
  if (!startDate || !endDate || isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    console.error('[temporalOverlapQuery] ERROR: Invalid dates provided', { startDate, endDate });
    return query; // Return unfiltered query instead of crashing
  }
  
  return query
    .lte('start_at', endDate.toISOString())
    .gte('end_at', startDate.toISOString());
};

export const logWeekNavigation = (weekStart: Date, weekEnd: Date, userTimeZone: string) => {
  console.group('📅 Calendar Week Navigation');
  console.log('Week Start:', DateTime.fromJSDate(weekStart).setZone(userTimeZone).toFormat('yyyy-MM-dd HH:mm'));
  console.log('Week End:', DateTime.fromJSDate(weekEnd).setZone(userTimeZone).toFormat('yyyy-MM-dd HH:mm'));
  console.log('User Timezone:', userTimeZone);
  // REMOVED: Browser timezone dependency eliminated
  console.groupEnd();
};
