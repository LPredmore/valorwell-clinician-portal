import React, { useEffect, useState } from 'react';
import Layout from '../components/layout/Layout';
import { debugCalendar, testWeekViewDataDependencies } from '../debug/calendarDebug';
import { Button } from '@/components/ui/button';
import { useWeekViewData } from '@/components/calendar/week-view/useWeekViewData';
import { TimeZoneService } from '@/utils/timeZoneService';

const CalendarDebugPage = () => {
  const [debugResults, setDebugResults] = useState<any>({});
  const [hookTestResults, setHookTestResults] = useState<any>({});
  const [weekViewDataResults, setWeekViewDataResults] = useState<any>({});
  const [error, setError] = useState<Error | null>(null);

  // Run basic debug tests
  const runBasicTests = () => {
    try {
      const results = debugCalendar();
      setDebugResults(results);
      
      const depResults = testWeekViewDataDependencies();
      setHookTestResults(depResults);
    } catch (err) {
      console.error('Error running debug tests:', err);
      setError(err instanceof Error ? err : new Error(String(err)));
    }
  };

  // Test the useWeekViewData hook directly
  const testWeekViewDataHook = () => {
    try {
      // Create test data
      const today = new Date();
      const days = [];
      for (let i = 0; i < 7; i++) {
        const day = new Date(today);
        day.setDate(today.getDate() - today.getDay() + i);
        days.push(day);
      }

      // Get current timezone
      const userTimeZone = TimeZoneService.DEFAULT_TIMEZONE;
      
      console.log('Testing useWeekViewData hook with:', {
        days: days.map(d => d.toISOString()),
        clinicianId: 'test-clinician-id',
        userTimeZone
      });
      
      // Initialize the hook
      const hookData = useWeekViewData(
        days,
        'test-clinician-id',
        0,
        [],
        (id) => `Test Client ${id}`,
        userTimeZone
      );
      
      // Store the results
      setWeekViewDataResults({
        success: true,
        loading: hookData.loading,
        weekDaysCount: hookData.weekDays?.length || 0,
        timeBlocksCount: hookData.timeBlocks?.length || 0,
        appointmentBlocksCount: hookData.appointmentBlocks?.length || 0,
        error: hookData.error ? hookData.error.message : null
      });
    } catch (err) {
      console.error('Error testing useWeekViewData hook:', err);
      setWeekViewDataResults({
        success: false,
        error: err instanceof Error ? err.message : String(err)
      });
    }
  };

  return (
    <Layout>
      <div className="p-6 bg-white rounded-lg shadow">
        <h1 className="text-2xl font-bold mb-6">Calendar Debug Page</h1>
        
        {error && (
          <div className="p-4 mb-6 bg-red-100 border border-red-300 rounded">
            <h3 className="text-lg font-medium text-red-800 mb-2">Error</h3>
            <p className="text-red-600">{error.message}</p>
            <pre className="mt-2 text-xs bg-red-50 p-2 rounded overflow-auto">
              {error.stack}
            </pre>
          </div>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="border rounded p-4">
            <h2 className="text-xl font-semibold mb-4">Basic Calendar Tests</h2>
            <Button onClick={runBasicTests} className="mb-4">Run Basic Tests</Button>
            
            {Object.keys(debugResults).length > 0 && (
              <div className="mt-4">
                <h3 className="text-lg font-medium mb-2">Results:</h3>
                <pre className="bg-gray-100 p-3 rounded text-sm overflow-auto max-h-60">
                  {JSON.stringify(debugResults, null, 2)}
                </pre>
              </div>
            )}
            
            {Object.keys(hookTestResults).length > 0 && (
              <div className="mt-4">
                <h3 className="text-lg font-medium mb-2">Hook Dependencies:</h3>
                <pre className="bg-gray-100 p-3 rounded text-sm overflow-auto max-h-60">
                  {JSON.stringify(hookTestResults, null, 2)}
                </pre>
              </div>
            )}
          </div>
          
          <div className="border rounded p-4">
            <h2 className="text-xl font-semibold mb-4">useWeekViewData Hook Test</h2>
            <Button onClick={testWeekViewDataHook} className="mb-4">Test Hook</Button>
            
            {Object.keys(weekViewDataResults).length > 0 && (
              <div className="mt-4">
                <h3 className="text-lg font-medium mb-2">Hook Results:</h3>
                <pre className="bg-gray-100 p-3 rounded text-sm overflow-auto max-h-60">
                  {JSON.stringify(weekViewDataResults, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default CalendarDebugPage;