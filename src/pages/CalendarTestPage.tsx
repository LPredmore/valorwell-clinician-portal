import React, { useState, useEffect } from 'react';
import Layout from '../components/layout/Layout';
import CalendarTest from '../debug/calendarTest';
import WeekViewDataTest from '../debug/WeekViewDataTest';
import { testWeekViewDataFunctionality } from '../debug/testWeekViewData';
import { testImports } from '../debug/importTest';
import TimeSlotTester from '../debug/TimeSlotTester';
import WeekViewTester from '../debug/WeekViewTester';
import CalendarDataFlow from '../debug/CalendarDataFlow';
import { CalendarDebugUtils } from '@/utils/calendarDebugUtils';
import { testTimezones } from '@/debug/mockCalendarData';
import runAllTimezoneFixTests from '../debug/timezoneFixTest';

const CalendarTestPage: React.FC = () => {
  const [testResults, setTestResults] = useState<any>(null);
  const [importResults, setImportResults] = useState<any>(null);
  const [timezoneFixResults, setTimezoneFixResults] = useState<any>(null);
  const [selectedTimezone, setSelectedTimezone] = useState('America/Chicago');
  const [debugLevel, setDebugLevel] = useState(CalendarDebugUtils.LOG_LEVELS.DEBUG);
  const [activeTab, setActiveTab] = useState<'components' | 'dataflow' | 'basic'>('components');
  const [enabledComponents, setEnabledComponents] = useState<Record<string, boolean>>({
    'Calendar': true,
    'WeekView': true,
    'useWeekViewData': true,
    'useAppointments': true,
    'TimeSlot': true,
    'CalendarView': true
  });

  // Run the basic tests when the component mounts
  useEffect(() => {
    // Run the test functions when the component mounts
    const results = testWeekViewDataFunctionality();
    setTestResults(results);
    
    const imports = testImports();
    setImportResults(imports);
  }, []);

  // Update debug settings
  useEffect(() => {
    CalendarDebugUtils.setLogLevel(debugLevel);
    
    // Update enabled components
    Object.entries(enabledComponents).forEach(([component, enabled]) => {
      CalendarDebugUtils.enableComponent(component, enabled);
    });
  }, [debugLevel, enabledComponents]);

  // Toggle component debug logging
  const toggleComponentDebug = (component: string) => {
    setEnabledComponents(prev => ({
      ...prev,
      [component]: !prev[component]
    }));
  };
  
  // Run timezone fix tests
  const runTimezoneFixTests = () => {
    try {
      const results = runAllTimezoneFixTests();
      setTimezoneFixResults(results);
    } catch (error) {
      setTimezoneFixResults({
        success: false,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  };

  return (
    <Layout>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Calendar Test Page</h1>
          
          <div className="flex items-center space-x-4">
            <div>
              <label htmlFor="timezone-select" className="block text-sm font-medium text-gray-700 mb-1">
                Test Timezone
              </label>
              <select
                id="timezone-select"
                value={selectedTimezone}
                onChange={(e) => setSelectedTimezone(e.target.value)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              >
                {testTimezones.map(tz => (
                  <option key={tz} value={tz}>{tz}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label htmlFor="debug-level" className="block text-sm font-medium text-gray-700 mb-1">
                Debug Level
              </label>
              <select
                id="debug-level"
                value={debugLevel}
                onChange={(e) => setDebugLevel(Number(e.target.value))}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              >
                <option value={CalendarDebugUtils.LOG_LEVELS.NONE}>None</option>
                <option value={CalendarDebugUtils.LOG_LEVELS.ERROR}>Error</option>
                <option value={CalendarDebugUtils.LOG_LEVELS.WARN}>Warning</option>
                <option value={CalendarDebugUtils.LOG_LEVELS.INFO}>Info</option>
                <option value={CalendarDebugUtils.LOG_LEVELS.DEBUG}>Debug</option>
                <option value={CalendarDebugUtils.LOG_LEVELS.TRACE}>Trace</option>
              </select>
            </div>
          </div>
        </div>
        
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-2">Component Debug Logging</h2>
          <div className="flex flex-wrap gap-2">
            {Object.entries(enabledComponents).map(([component, enabled]) => (
              <button
                key={component}
                onClick={() => toggleComponentDebug(component)}
                className={`px-3 py-1 text-sm rounded-full ${
                  enabled 
                    ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                    : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                }`}
              >
                {component}: {enabled ? 'On' : 'Off'}
              </button>
            ))}
          </div>
        </div>
        
        <div className="mb-6">
          <p className="mb-4">
            This enhanced test page provides a comprehensive environment for testing calendar components with controlled data.
            Use the tabs below to access different testing tools and visualizations.
          </p>
        </div>
        
        {/* Custom Tab Navigation */}
        <div className="mb-6">
          <div className="flex space-x-1 rounded-xl bg-blue-900/20 p-1">
            <button
              onClick={() => setActiveTab('components')}
              className={`flex-1 rounded-lg py-2.5 text-sm font-medium leading-5 ${
                activeTab === 'components'
                  ? 'bg-white text-blue-700 shadow'
                  : 'text-blue-100 hover:bg-white/[0.12] hover:text-white'
              }`}
            >
              Component Testers
            </button>
            <button
              onClick={() => setActiveTab('dataflow')}
              className={`flex-1 rounded-lg py-2.5 text-sm font-medium leading-5 ${
                activeTab === 'dataflow'
                  ? 'bg-white text-blue-700 shadow'
                  : 'text-blue-100 hover:bg-white/[0.12] hover:text-white'
              }`}
            >
              Data Flow Visualization
            </button>
            <button
              onClick={() => setActiveTab('basic')}
              className={`flex-1 rounded-lg py-2.5 text-sm font-medium leading-5 ${
                activeTab === 'basic'
                  ? 'bg-white text-blue-700 shadow'
                  : 'text-blue-100 hover:bg-white/[0.12] hover:text-white'
              }`}
            >
              Basic Tests
            </button>
          </div>
        </div>
        
        {/* Tab Content */}
        <div className="mt-6">
          {activeTab === 'components' && (
            <div className="space-y-8">
              <div>
                <h2 className="text-xl font-semibold mb-4">TimeSlot Component Tester</h2>
                <p className="mb-4">Test the TimeSlot component in isolation with different states and configurations.</p>
                <TimeSlotTester userTimeZone={selectedTimezone} />
              </div>
              
              <div>
                <h2 className="text-xl font-semibold mb-4">WeekView Component Tester</h2>
                <p className="mb-4">Test the WeekView component with different data scenarios and configurations.</p>
                <WeekViewTester initialTimeZone={selectedTimezone} />
              </div>
            </div>
          )}
          
          {activeTab === 'dataflow' && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Calendar Data Flow</h2>
              <p className="mb-4">Visualize how data flows through the calendar system, from raw data to rendered components.</p>
              <CalendarDataFlow userTimeZone={selectedTimezone} />
            </div>
          )}
          
          {activeTab === 'basic' && (
            <div className="space-y-8">
              {testResults && (
                <div className="mb-6 p-4 border rounded bg-gray-50">
                  <h2 className="text-xl font-semibold mb-2">WeekViewData Functionality Test</h2>
                  <div className={`p-3 rounded ${testResults.success ? 'bg-green-100' : 'bg-red-100'}`}>
                    <p className={testResults.success ? 'text-green-800' : 'text-red-800'}>
                      {testResults.success ? 'Tests passed!' : 'Tests failed!'}
                    </p>
                    {testResults.error && (
                      <pre className="mt-2 text-xs bg-red-50 p-2 rounded overflow-auto">
                        {testResults.error}
                      </pre>
                    )}
                  </div>
                </div>
              )}
              
              {importResults && (
                <div className="mb-6 p-4 border rounded bg-gray-50">
                  <h2 className="text-xl font-semibold mb-2">Import Tests</h2>
                  <div className={`p-3 rounded ${importResults.success ? 'bg-green-100' : 'bg-red-100'}`}>
                    <p className={importResults.success ? 'text-green-800' : 'text-red-800'}>
                      {importResults.success ? 'All imports successful!' : 'Import tests failed!'}
                    </p>
                    {importResults.error && (
                      <pre className="mt-2 text-xs bg-red-50 p-2 rounded overflow-auto">
                        {importResults.error}
                      </pre>
                    )}
                  </div>
                </div>
              )}
              
              <div className="mb-6 p-4 border rounded bg-gray-50">
                <h2 className="text-xl font-semibold mb-2">Timezone Fix Tests</h2>
                <p className="mb-4">
                  Test the timezone conversion bug fixes to ensure they're working correctly.
                  These tests verify that array timezone values are properly handled.
                </p>
                
                <button
                  onClick={runTimezoneFixTests}
                  className="mb-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                >
                  Run Timezone Fix Tests
                </button>
                
                {timezoneFixResults && (
                  <div className={`p-3 rounded ${timezoneFixResults.success ? 'bg-green-100' : 'bg-red-100'}`}>
                    <p className={timezoneFixResults.success ? 'text-green-800' : 'text-red-800'}>
                      {timezoneFixResults.success ? 'Timezone fix tests passed!' : 'Timezone fix tests failed!'}
                    </p>
                    {timezoneFixResults.message && (
                      <p className="mt-2 text-sm">
                        {timezoneFixResults.message}
                      </p>
                    )}
                    {timezoneFixResults.error && (
                      <pre className="mt-2 text-xs bg-red-50 p-2 rounded overflow-auto">
                        {timezoneFixResults.error}
                      </pre>
                    )}
                  </div>
                )}
              </div>
              
              <div className="grid grid-cols-1 gap-6 mb-6">
                <CalendarTest />
                
                <div className="mt-8">
                  <h2 className="text-xl font-semibold mb-4">Direct Hook Test</h2>
                  <p className="mb-4">This test directly uses the useWeekViewData hook to identify any issues:</p>
                  <WeekViewDataTest />
                </div>
              </div>
            </div>
          )}
        </div>
        
        <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded">
          <h2 className="text-lg font-semibold mb-2">How to Use This Test Page</h2>
          <ul className="list-disc ml-6 space-y-2">
            <li>
              <strong>Component Testers:</strong> Use these to test individual components in isolation with controlled data.
              You can toggle different states and configurations to see how the components behave.
            </li>
            <li>
              <strong>Data Flow Visualization:</strong> Understand how data flows through the calendar system, from raw data
              to rendered components. This helps identify where issues might be occurring.
            </li>
            <li>
              <strong>Basic Tests:</strong> Run basic functionality tests to verify that the core calendar functionality
              is working correctly.
            </li>
            <li>
              <strong>Debug Settings:</strong> Adjust the debug level and enable/disable component logging to focus on
              specific areas of the calendar system.
            </li>
            <li>
              <strong>Timezone Testing:</strong> Change the test timezone to verify that the calendar handles different
              timezones correctly.
            </li>
          </ul>
        </div>
      </div>
    </Layout>
  );
};

export default CalendarTestPage;