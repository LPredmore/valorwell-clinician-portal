import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react';
import { DateTime } from 'luxon';
import * as TimeZoneUtils from '@/utils/timeZoneUtils';
import { CalendarDebugUtils } from '@/utils/calendarDebugUtils';

// Component name for logging
const COMPONENT_NAME = 'TimeZoneContext';

// Define the context interface
interface TimeZoneContextType {
  // Current timezone
  userTimeZone: string;
  setUserTimeZone: (timezone: string) => void;
  
  // Timezone conversion functions
  fromUTC: (utcString: string) => DateTime;
  toUTC: (dateTime: DateTime) => string;
  fromJSDate: (date: Date) => DateTime;
  
  // Formatting functions
  formatDate: (dateTime: DateTime, format?: string) => string;
  formatTime: (dateTime: DateTime, format?: string) => string;
  formatDateTime: (dateTime: DateTime, format: string) => string;
  formatWithTimeZone: (date: Date, format?: string) => string;
  
  // Utility functions
  getTimeZoneDisplayName: (timezone?: string) => string;
  isValidTimeZone: (timezone: string | null | undefined) => boolean;
  ensureIANATimeZone: (timezone: string | null | undefined) => string;
  
  // Current time
  now: () => DateTime;
  today: () => DateTime;
  
  // Safe clone function
  safeClone: <T>(obj: T) => T;
}

// Create the context with a default value
const TimeZoneContext = createContext<TimeZoneContextType | undefined>(undefined);

// Provider component
interface TimeZoneProviderProps {
  children: ReactNode;
  initialTimeZone?: string;
}

export const TimeZoneProvider: React.FC<TimeZoneProviderProps> = ({ 
  children, 
  initialTimeZone 
}) => {
  // Initialize with browser timezone or provided initialTimeZone
  const [userTimeZone, setUserTimeZone] = useState<string>(
    TimeZoneUtils.ensureIANATimeZone(initialTimeZone || TimeZoneUtils.getUserTimeZone())
  );

  // Update timezone if initialTimeZone changes
  useEffect(() => {
    if (initialTimeZone) {
      const validTimeZone = TimeZoneUtils.ensureIANATimeZone(initialTimeZone);
      
      if (validTimeZone !== userTimeZone) {
        CalendarDebugUtils.log(COMPONENT_NAME, 'Updating timezone from props', {
          previous: userTimeZone,
          new: validTimeZone
        });
        
        setUserTimeZone(validTimeZone);
      }
    }
  }, [initialTimeZone, userTimeZone]);

  // Memoize conversion functions to prevent unnecessary recreations
  const fromUTC = useMemo(() => 
    (utcString: string): DateTime => TimeZoneUtils.fromUTC(utcString, userTimeZone),
    [userTimeZone]
  );

  const toUTC = useMemo(() => 
    (dateTime: DateTime): string => TimeZoneUtils.toUTC(dateTime),
    []
  );

  const fromJSDate = useMemo(() => 
    (date: Date): DateTime => TimeZoneUtils.fromJSDate(date, userTimeZone),
    [userTimeZone]
  );

  // Memoize formatting functions
  const formatDate = useMemo(() => 
    (dateTime: DateTime, format?: string): string => 
      format ? dateTime.toFormat(format) : TimeZoneUtils.formatDate(dateTime),
    []
  );

  const formatTime = useMemo(() => 
    (dateTime: DateTime, format?: string): string => 
      format ? dateTime.toFormat(format) : TimeZoneUtils.formatTime(dateTime),
    []
  );

  const formatDateTime = useMemo(() => 
    (dateTime: DateTime, format: string): string => 
      TimeZoneUtils.formatDateTime(dateTime, format),
    []
  );

  const formatWithTimeZone = useMemo(() => 
    (date: Date, format?: string): string => 
      TimeZoneUtils.formatWithTimeZone(date, userTimeZone, format),
    [userTimeZone]
  );

  // Memoize utility functions
  const getTimeZoneDisplayName = useMemo(() => 
    (timezone?: string): string => 
      TimeZoneUtils.getTimeZoneDisplayName(timezone || userTimeZone),
    [userTimeZone]
  );

  const isValidTimeZone = useMemo(() => 
    (timezone: string | null | undefined): boolean => 
      TimeZoneUtils.isValidTimeZone(timezone),
    []
  );

  const ensureIANATimeZone = useMemo(() => 
    (timezone: string | null | undefined): string => 
      TimeZoneUtils.ensureIANATimeZone(timezone),
    []
  );

  // Memoize current time functions
  const now = useMemo(() => 
    (): DateTime => TimeZoneUtils.now(userTimeZone),
    [userTimeZone]
  );

  const today = useMemo(() => 
    (): DateTime => now().startOf('day'),
    [now]
  );

  // Memoize safe clone function
  const safeClone = useMemo(() => 
    <T,>(obj: T): T => TimeZoneUtils.safeClone(obj),
    []
  );

  // Memoize the context value to prevent unnecessary recreations
  const value = useMemo<TimeZoneContextType>(() => ({
    userTimeZone,
    setUserTimeZone,
    fromUTC,
    toUTC,
    fromJSDate,
    formatDate,
    formatTime,
    formatDateTime,
    formatWithTimeZone,
    getTimeZoneDisplayName,
    isValidTimeZone,
    ensureIANATimeZone,
    now,
    today,
    safeClone
  }), [
    userTimeZone,
    fromUTC,
    toUTC,
    fromJSDate,
    formatDate,
    formatTime,
    formatDateTime,
    formatWithTimeZone,
    getTimeZoneDisplayName,
    isValidTimeZone,
    ensureIANATimeZone,
    now,
    today,
    safeClone
  ]);

  return (
    <TimeZoneContext.Provider value={value}>
      {children}
    </TimeZoneContext.Provider>
  );
};

// Custom hook to use the timezone context
export const useTimeZone = (): TimeZoneContextType => {
  const context = useContext(TimeZoneContext);
  if (context === undefined) {
    throw new Error('useTimeZone must be used within a TimeZoneProvider');
  }
  return context;
};

// Export the context for direct usage if needed
export default TimeZoneContext;