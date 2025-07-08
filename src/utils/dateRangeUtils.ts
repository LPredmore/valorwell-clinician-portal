
import { DateTime } from 'luxon';
import { PostgrestFilterBuilder } from '@supabase/postgrest-js';

export const getWeekRange = (date: Date, timeZone: string) => {
  const dt = DateTime.fromJSDate(date).setZone(timeZone);
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
