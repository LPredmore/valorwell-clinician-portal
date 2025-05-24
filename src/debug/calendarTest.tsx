import React, { useEffect, useState } from 'react';
import { DateTime } from 'luxon';
import { TimeZoneService } from '@/utils/timeZoneService';

// This is a minimal component to test the calendar functionality
const CalendarTest: React.FC = () => {
  const [error, setError] = useState<Error | null>(null);
  const [weekDays, setWeekDays] = useState<DateTime[]>([]);
  
  useEffect(() => {
    try {
      // Test basic DateTime functionality
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
      const dateTimeDays = days.map(day => 
        TimeZoneService.fromJSDate(day, timezone)
      );
      
      console.log('Week days generated:', 
        dateTimeDays.map(day => day.toFormat('yyyy-MM-dd'))
      );
      
      setWeekDays(dateTimeDays);
    } catch (err) {
      console.error('Error in CalendarTest:', err);
      setError(err instanceof Error ? err : new Error(String(err)));
    }
  }, []);
  
  return (
    <div className="p-6 bg-white rounded-lg shadow">
      <h1 className="text-2xl font-bold mb-6">Calendar Test</h1>
      
      {error ? (
        <div className="p-4 bg-red-100 border border-red-300 rounded">
          <h3 className="text-lg font-medium text-red-800 mb-2">Error</h3>
          <p className="text-red-600">{error.message}</p>
          <pre className="mt-2 text-xs bg-red-50 p-2 rounded overflow-auto">
            {error.stack}
          </pre>
        </div>
      ) : (
        <div>
          <h2 className="text-xl font-semibold mb-4">Week Days</h2>
          <div className="grid grid-cols-7 gap-2">
            {weekDays.map((day, index) => (
              <div key={index} className="p-2 border rounded text-center">
                <div className="font-medium">{day.toFormat('EEE')}</div>
                <div className="text-sm">{day.toFormat('MMM d')}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarTest;