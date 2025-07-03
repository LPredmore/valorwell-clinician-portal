
import { DateTime } from 'luxon';
import { PostgrestFilterBuilder } from '@supabase/postgrest-js';

export const getWeekRange = (date: Date, timeZone: string) => {
  const dt = DateTime.fromJSDate(date).setZone(timeZone);
  return {
    start: dt.startOf('week').toJSDate(),
    end: dt.endOf('week').toJSDate()
  };
};

// Add stable week range utility for better memoization
export const getStableWeekRange = (date: Date, timeZone: string) => {
  const dt = DateTime.fromJSDate(date).setZone(timeZone);
  const start = dt.startOf('week');
  const end = dt.endOf('week');
  
  return {
    start: start.toJSDate(),
    end: end.toJSDate(),
    // Add stable string representations for comparison
    startISO: start.toISO(),
    endISO: end.toISO(),
    weekKey: start.toFormat('yyyy-WW') // Week-based key for memoization
  };
};

// Utility for comparing date ranges without reference issues
export const areDateRangesEqual = (
  range1: { start: Date; end: Date },
  range2: { start: Date; end: Date }
): boolean => {
  return range1.start.getTime() === range2.start.getTime() &&
         range1.end.getTime() === range2.end.getTime();
};

export const temporalOverlapQuery = (
  query: PostgrestFilterBuilder<any, any, any>,
  startDate: Date,
  endDate: Date
) => {
  return query
    .lte('start_at', endDate.toISOString())
    .gte('end_at', startDate.toISOString());
};

export const logWeekNavigation = (weekStart: Date, weekEnd: Date, userTimeZone: string) => {
  console.group('📅 Calendar Week Navigation');
  console.log('Week Start:', DateTime.fromJSDate(weekStart).setZone(userTimeZone).toFormat('yyyy-MM-dd HH:mm'));
  console.log('Week End:', DateTime.fromJSDate(weekEnd).setZone(userTimeZone).toFormat('yyyy-MM-dd HH:mm'));
  console.log('User Timezone:', userTimeZone);
  console.log('System Timezone:', Intl.DateTimeFormat().resolvedOptions().timeZone);
  console.groupEnd();
};
