import React, { useState, useEffect } from 'react';
import { useWeekViewData } from '@/components/calendar/week-view/useWeekViewData';
import { TimeZoneService } from '@/utils/timeZoneService';

const WeekViewDataTest: React.FC = () => {
  const [error, setError] = useState<Error | null>(null);
  const [days, setDays] = useState<Date[]>([]);
  const [clinicianId, setClinicianId] = useState<string>('test-clinician-id');
  const [userTimeZone, setUserTimeZone] = useState<string>(TimeZoneService.DEFAULT_TIMEZONE);
  
  // Initialize days array
  useEffect(() => {
    try {
      const today = new Date();
      const weekDays = [];
      for (let i = 0; i < 7; i++) {
        const day = new Date(today);
        day.setDate(today.getDate() - today.getDay() + i);
        weekDays.push(day);
      }
      setDays(weekDays);
    } catch (err) {
      console.error('Error initializing days:', err);
      setError(err instanceof Error ? err : new Error(String(err)));
    }
  }, []);
  
  // Wrap the hook in a try-catch to catch any errors
  let hookData;
  try {
    // Only use the hook if days array is populated
    if (days.length > 0) {
      hookData = useWeekViewData(
        days,
        clinicianId,
        0,
        [],
        (id) => `Test Client ${id}`,
        userTimeZone
      );
    }
  } catch (err) {
    console.error('Error using useWeekViewData hook:', err);
    if (!error) {
      setError(err instanceof Error ? err : new Error(String(err)));
    }
  }
  
  return (
    <div className="p-6 bg-white rounded-lg shadow">
      <h1 className="text-2xl font-bold mb-6">useWeekViewData Hook Test</h1>
      
      {error ? (
        <div className="p-4 bg-red-100 border border-red-300 rounded">
          <h3 className="text-lg font-medium text-red-800 mb-2">Error</h3>
          <p className="text-red-600">{error.message}</p>
          <pre className="mt-2 text-xs bg-red-50 p-2 rounded overflow-auto">
            {error.stack}
          </pre>
        </div>
      ) : !hookData ? (
        <div className="p-4 bg-yellow-100 border border-yellow-300 rounded">
          <p className="text-yellow-800">Initializing...</p>
        </div>
      ) : (
        <div>
          <h2 className="text-xl font-semibold mb-4">Hook Data</h2>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 border rounded">
              <h3 className="font-medium mb-2">Week Days</h3>
              <div className="text-sm">
                {hookData.weekDays.map((day, index) => (
                  <div key={index} className="mb-1">
                    {day.toFormat('EEE, MMM d, yyyy')}
                  </div>
                ))}
              </div>
            </div>
            
            <div className="p-3 border rounded">
              <h3 className="font-medium mb-2">Time Blocks</h3>
              <div className="text-sm">
                Count: {hookData.timeBlocks.length}
              </div>
            </div>
            
            <div className="p-3 border rounded">
              <h3 className="font-medium mb-2">Appointment Blocks</h3>
              <div className="text-sm">
                Count: {hookData.appointmentBlocks.length}
              </div>
            </div>
            
            <div className="p-3 border rounded">
              <h3 className="font-medium mb-2">Status</h3>
              <div className="text-sm">
                <p>Loading: {hookData.loading ? 'Yes' : 'No'}</p>
                <p>Error: {hookData.error ? hookData.error.message : 'None'}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WeekViewDataTest;