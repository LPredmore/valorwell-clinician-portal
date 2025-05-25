import React, { useEffect, useState } from 'react';
import Layout from '../components/layout/Layout';
import { debugCalendar, testWeekViewDataDependencies } from '../debug/calendarDebug';
import { Button } from '@/components/ui/button';
import { useWeekViewData } from '@/components/calendar/week-view/useWeekViewData';
import { TimeZoneService } from '@/utils/timeZoneService';
import { testTimezoneConversion } from '@/utils/timezoneTestUtils';
import { supabase } from '@/integrations/supabase/client';
import { Appointment } from '@/types/appointment';

const CalendarDebugPage = () => {
  const [debugResults, setDebugResults] = useState<any>({});
  const [hookTestResults, setHookTestResults] = useState<any>({});
  const [weekViewDataResults, setWeekViewDataResults] = useState<any>({});
  const [timezoneTestResults, setTimezoneTestResults] = useState<any>({});
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

  // Test timezone conversion with real appointment data
  const runTimezoneConversionTest = async () => {
    try {
      // Get the user's timezone
      const userTimeZone = TimeZoneService.DEFAULT_TIMEZONE;
      
      // Fetch some real appointment data
      const { data: appointments, error: fetchError } = await supabase
        .from('appointments')
        .select('*')
        .limit(10) as { data: Appointment[] | null, error: any };
      
      if (fetchError) {
        throw new Error(`Error fetching appointments: ${fetchError.message}`);
      }
      
      if (!appointments || appointments.length === 0) {
        setTimezoneTestResults({
          success: false,
          error: 'No appointments found to test with'
        });
        return;
      }
      
      // Test timezone conversion
      const results = testTimezoneConversion(appointments, userTimeZone);
      
      // Store the results
      setTimezoneTestResults({
        success: results.success,
        appointmentCount: appointments.length,
        successCount: results.results.filter(r => r.isValid).length,
        errorCount: results.errors.length,
        errors: results.errors,
        sampleResults: results.results.slice(0, 3), // Show first 3 results
        userTimeZone
      });
    } catch (err) {
      console.error('Error testing timezone conversion:', err);
      setTimezoneTestResults({
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
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
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
        
        <div className="border rounded p-4">
          <h2 className="text-xl font-semibold mb-4">Timezone Conversion Test</h2>
          <p className="mb-4">
            This test verifies that timezone conversion works correctly with real appointment data.
            It tests the TimeZoneUtils.fromUTC() method with actual appointment data from the database.
          </p>
          <Button onClick={runTimezoneConversionTest} className="mb-4">Test Timezone Conversion</Button>
          
          {Object.keys(timezoneTestResults).length > 0 && (
            <div className="mt-4">
              <h3 className="text-lg font-medium mb-2">Test Results:</h3>
              <div className="mb-2">
                <span className={`inline-block px-2 py-1 rounded text-white ${timezoneTestResults.success ? 'bg-green-500' : 'bg-red-500'}`}>
                  {timezoneTestResults.success ? 'SUCCESS' : 'FAILED'}
                </span>
                {timezoneTestResults.appointmentCount && (
                  <span className="ml-2">
                    Tested {timezoneTestResults.appointmentCount} appointments,
                    {timezoneTestResults.successCount} successful,
                    {timezoneTestResults.errorCount} errors
                  </span>
                )}
              </div>
              
              {timezoneTestResults.error && (
                <div className="p-3 bg-red-100 rounded mb-4">
                  <p className="text-red-700">{timezoneTestResults.error}</p>
                </div>
              )}
              
              <pre className="bg-gray-100 p-3 rounded text-sm overflow-auto max-h-60">
                {JSON.stringify(timezoneTestResults, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default CalendarDebugPage;