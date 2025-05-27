
import { getTimezoneLabel } from './timezoneOptions';

// Database enum values for time_zones
export const TIME_ZONES_ENUM = [
  'America/New_York',
  'America/Chicago', 
  'America/Denver',
  'America/Los_Angeles',
  'America/Anchorage',
  'Pacific/Honolulu',
  'America/Phoenix'
] as const;

export type TimeZoneEnum = typeof TIME_ZONES_ENUM[number];

// Create display options for the enum timezone values
export const getTimeZoneEnumOptions = () => {
  return TIME_ZONES_ENUM.map(timezone => ({
    value: timezone,
    label: getTimezoneLabel(timezone)
  }));
};

// Get display label for a timezone enum value
export const getTimeZoneEnumLabel = (timezone: string): string => {
  if (TIME_ZONES_ENUM.includes(timezone as TimeZoneEnum)) {
    return getTimezoneLabel(timezone);
  }
  // Fallback for any existing data that might not match the enum
  return timezone;
};
