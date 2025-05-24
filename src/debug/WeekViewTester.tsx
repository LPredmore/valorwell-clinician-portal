import React, { useState, useEffect } from 'react';
import { DateTime } from 'luxon';
import WeekView from '@/components/calendar/week-view/WeekView';
import { Appointment } from '@/types/appointment';
import { AvailabilityBlock } from '@/types/availability';
import { CalendarDebugUtils } from '@/utils/calendarDebugUtils';
import { createTestDataset, testTimezones } from './mockCalendarData';

interface WeekViewTesterProps {
  initialTimeZone?: string;
}

const WeekViewTester: React.FC<WeekViewTesterProps> = ({ 
  initialTimeZone = 'America/Chicago'
}) => {
  // State for controlling test parameters
  const [userTimeZone, setUserTimeZone] = useState(initialTimeZone);
  const [dataScenario, setDataScenario] = useState<string>('normal');
  const [showAvailability, setShowAvailability] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [lastAction, setLastAction] = useState<string>('');
  const [showDebugInfo, setShowDebugInfo] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [simulateError, setSimulateError] = useState(false);
  
  // Generate test data
  const [testData, setTestData] = useState(() => createTestDataset(userTimeZone, selectedDate));
  
  // Update test data when parameters change
  useEffect(() => {
    setTestData(createTestDataset(userTimeZone, selectedDate));
  }, [userTimeZone, selectedDate]);
  
  // Get the appropriate appointments based on the selected scenario
  const getAppointments = (): Appointment[] => {
    return testData.appointments[dataScenario] || [];
  };
  
  // Event handlers for WeekView
  const handleAppointmentClick = (appointment: Appointment) => {
    setLastAction(`Appointment clicked: ${appointment.clientName} - ${appointment.id}`);
    CalendarDebugUtils.log('WeekViewTester', 'Appointment clicked', {
      id: appointment.id,
      clientName: appointment.clientName,
      start_at: appointment.start_at,
      end_at: appointment.end_at
    });
  };
  
  const handleAvailabilityClick = (date: DateTime | Date, availabilityBlock: AvailabilityBlock) => {
    const dateTime = date instanceof Date ? DateTime.fromJSDate(date) : date;
    setLastAction(`Availability clicked: ${dateTime.toFormat('yyyy-MM-dd')} - ${availabilityBlock.id}`);
    CalendarDebugUtils.log('WeekViewTester', 'Availability clicked', {
      date: dateTime.toFormat('yyyy-MM-dd'),
      blockId: availabilityBlock.id,
      start_at: availabilityBlock.start_at,
      end_at: availabilityBlock.end_at
    });
  };
  
  const handleAppointmentUpdate = (appointmentId: string, newStartAt: string, newEndAt: string) => {
    setLastAction(`Appointment updated: ${appointmentId} - New start: ${DateTime.fromISO(newStartAt).toFormat('yyyy-MM-dd HH:mm')}`);
    CalendarDebugUtils.log('WeekViewTester', 'Appointment updated', {
      appointmentId,
      newStartAt,
      newEndAt
    });
  };
  
  const handleAppointmentDelete = (appointmentId: string) => {
    setLastAction(`Appointment deleted: ${appointmentId}`);
    CalendarDebugUtils.log('WeekViewTester', 'Appointment deleted', {
      appointmentId
    });
  };
  
  // Helper to format date for display
  const formatDate = (date: Date): string => {
    return DateTime.fromJSDate(date).toFormat('yyyy-MM-dd');
  };
  
  // Refresh the test data
  const refreshData = () => {
    setRefreshTrigger(prev => prev + 1);
    setLastAction('Data refreshed');
  };
  
  // Toggle loading state for testing
  const toggleLoading = () => {
    setIsLoading(prev => !prev);
    setLastAction(`Loading state ${!isLoading ? 'enabled' : 'disabled'}`);
  };
  
  // Toggle error state for testing
  const toggleError = () => {
    setSimulateError(prev => !prev);
    setLastAction(`Error state ${!simulateError ? 'enabled' : 'disabled'}`);
  };
  
  // Set date to today
  const setToToday = () => {
    setSelectedDate(new Date());
    setLastAction('Date set to today');
  };
  
  return (
    <div className="p-6 bg-white rounded-lg shadow">
      <h2 className="text-xl font-semibold mb-4">WeekView Component Tester</h2>
      
      <div className="mb-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-medium mb-2">Data Scenario</h3>
            <select
              value={dataScenario}
              onChange={(e) => setDataScenario(e.target.value)}
              className="w-full p-2 border rounded"
            >
              <option value="normal">Normal Appointments</option>
              <option value="empty">Empty Data</option>
              <option value="malformed">Malformed Data</option>
              <option value="timezoneCrossover">Timezone Edge Cases</option>
              <option value="overlapping">Overlapping Appointments</option>
              <option value="combined">Combined Scenarios</option>
            </select>
          </div>
          
          <div>
            <h3 className="text-lg font-medium mb-2">Timezone</h3>
            <select
              value={userTimeZone}
              onChange={(e) => setUserTimeZone(e.target.value)}
              className="w-full p-2 border rounded"
            >
              {testTimezones.map(tz => (
                <option key={tz} value={tz}>{tz}</option>
              ))}
            </select>
          </div>
          
          <div>
            <h3 className="text-lg font-medium mb-2">Week Start Date</h3>
            <div className="flex items-center space-x-2">
              <input
                type="date"
                value={formatDate(selectedDate)}
                onChange={(e) => setSelectedDate(new Date(e.target.value))}
                className="p-2 border rounded flex-grow"
              />
              <button
                onClick={setToToday}
                className="px-3 py-2 bg-blue-100 text-blue-800 rounded hover:bg-blue-200"
              >
                Today
              </button>
            </div>
          </div>
        </div>
        
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-medium mb-2">Display Options</h3>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={showAvailability}
                  onChange={(e) => setShowAvailability(e.target.checked)}
                  className="mr-2"
                />
                Show Availability
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={isLoading}
                  onChange={toggleLoading}
                  className="mr-2"
                />
                Simulate Loading State
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={simulateError}
                  onChange={toggleError}
                  className="mr-2"
                />
                Simulate Error State
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={showDebugInfo}
                  onChange={(e) => setShowDebugInfo(e.target.checked)}
                  className="mr-2"
                />
                Show Debug Info
              </label>
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-medium mb-2">Actions</h3>
            <div className="space-y-2">
              <button
                onClick={refreshData}
                className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Refresh Data
              </button>
              <button
                onClick={() => {
                  CalendarDebugUtils.enableComponent('WeekView', true);
                  CalendarDebugUtils.enableComponent('TimeSlot', true);
                  setLastAction('Debug logging enabled for WeekView and TimeSlot');
                }}
                className="w-full px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
              >
                Enable Debug Logging
              </button>
              <button
                onClick={() => {
                  CalendarDebugUtils.enableComponent('WeekView', false);
                  CalendarDebugUtils.enableComponent('TimeSlot', false);
                  setLastAction('Debug logging disabled for WeekView and TimeSlot');
                }}
                className="w-full px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
              >
                Disable Debug Logging
              </button>
            </div>
          </div>
        </div>
        
        <div>
          <h3 className="text-lg font-medium mb-2">Test Information</h3>
          <div className="space-y-2">
            <div className="p-3 bg-gray-100 rounded text-sm">
              <strong>Current Scenario:</strong> {dataScenario}
            </div>
            <div className="p-3 bg-gray-100 rounded text-sm">
              <strong>Timezone:</strong> {userTimeZone}
            </div>
            <div className="p-3 bg-gray-100 rounded text-sm">
              <strong>Week Start:</strong> {formatDate(selectedDate)}
            </div>
            <div className="p-3 bg-gray-100 rounded text-sm">
              <strong>Appointments:</strong> {getAppointments().length}
            </div>
            {lastAction && (
              <div className="p-3 bg-blue-100 rounded text-sm">
                <strong>Last Action:</strong> {lastAction}
              </div>
            )}
          </div>
        </div>
      </div>
      
      <div className="mt-6 border rounded-lg overflow-hidden">
        <WeekView
          days={testData.weekDates}
          selectedClinicianId="test-clinician-id"
          userTimeZone={userTimeZone}
          showAvailability={showAvailability}
          refreshTrigger={refreshTrigger}
          appointments={getAppointments()}
          onAppointmentClick={handleAppointmentClick}
          onAvailabilityClick={handleAvailabilityClick}
          onAppointmentUpdate={handleAppointmentUpdate}
          onAppointmentDelete={handleAppointmentDelete}
          currentDate={selectedDate}
          isLoading={isLoading}
          error={simulateError ? new Error('Simulated error for testing') : undefined}
        />
      </div>
      
      {showDebugInfo && (
        <div className="mt-6">
          <h3 className="text-lg font-medium mb-2">Debug Information</h3>
          <div className="bg-gray-100 p-4 rounded overflow-auto max-h-60">
            <pre className="text-xs">
              {JSON.stringify({
                scenario: dataScenario,
                timezone: userTimeZone,
                weekStart: formatDate(selectedDate),
                appointments: getAppointments().length,
                weekDates: testData.weekDates.map(d => formatDate(d)),
                sampleAppointment: getAppointments()[0] || 'No appointments',
                showAvailability,
                refreshTrigger,
                isLoading,
                hasError: simulateError
              }, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};

export default WeekViewTester;