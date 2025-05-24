import React, { useState, useEffect } from 'react';
import { DateTime } from 'luxon';
import { Appointment } from '@/types/appointment';
import { AvailabilityBlock } from '@/types/availability';
import { TimeBlock, AppointmentBlock } from '@/components/calendar/week-view/types';
import { CalendarDebugUtils } from '@/utils/calendarDebugUtils';
import { createTestDataset } from './mockCalendarData';

interface CalendarDataFlowProps {
  userTimeZone: string;
}

const CalendarDataFlow: React.FC<CalendarDataFlowProps> = ({ userTimeZone }) => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [testData, setTestData] = useState(() => createTestDataset(userTimeZone, selectedDate));
  const [transformedData, setTransformedData] = useState<{
    timeBlocks: TimeBlock[];
    appointmentBlocks: AppointmentBlock[];
  }>({ timeBlocks: [], appointmentBlocks: [] });
  const [selectedStep, setSelectedStep] = useState<number>(1);
  const [showRawData, setShowRawData] = useState(false);
  
  // Update test data when parameters change
  useEffect(() => {
    setTestData(createTestDataset(userTimeZone, selectedDate));
  }, [userTimeZone, selectedDate]);
  
  // Transform data to simulate the data flow in the calendar system
  useEffect(() => {
    // Step 1: Transform availability blocks to time blocks
    const timeBlocks: TimeBlock[] = testData.availabilityBlocks.normal.map(block => {
      const start = DateTime.fromISO(block.start_at).setZone(userTimeZone);
      const end = DateTime.fromISO(block.end_at).setZone(userTimeZone);
      const day = start.startOf('day');
      
      return {
        start,
        end,
        day,
        availabilityIds: [block.id],
        isException: false,
        isStandalone: false
      };
    });
    
    // Step 2: Transform appointments to appointment blocks
    const appointmentBlocks: AppointmentBlock[] = testData.appointments.normal.map(appt => {
      const start = DateTime.fromISO(appt.start_at).setZone(userTimeZone);
      const end = DateTime.fromISO(appt.end_at).setZone(userTimeZone);
      const day = start.startOf('day');
      
      return {
        id: appt.id,
        start,
        end,
        day,
        clientId: appt.client_id,
        clientName: appt.clientName || 'Unknown Client',
        type: appt.type
      };
    });
    
    setTransformedData({ timeBlocks, appointmentBlocks });
    
    // Log the transformation for debugging
    CalendarDebugUtils.log('CalendarDataFlow', 'Data transformed', {
      originalAvailability: testData.availabilityBlocks.normal.length,
      originalAppointments: testData.appointments.normal.length,
      timeBlocks: timeBlocks.length,
      appointmentBlocks: appointmentBlocks.length
    });
  }, [testData, userTimeZone]);
  
  // Format date for display
  const formatDate = (date: Date): string => {
    return DateTime.fromJSDate(date).toFormat('yyyy-MM-dd');
  };
  
  // Format ISO date for display
  const formatISODate = (isoString: string): string => {
    return DateTime.fromISO(isoString).setZone(userTimeZone).toFormat('yyyy-MM-dd HH:mm');
  };
  
  // Helper to display the data flow steps
  const renderDataFlowStep = (step: number) => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Step 1: Raw Data from Database</h3>
            <p className="text-sm text-gray-600">
              The calendar system starts with raw appointment and availability data from the database.
              All timestamps are stored in UTC format.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border rounded p-4">
                <h4 className="font-medium mb-2">Raw Appointments ({testData.appointments.normal.length})</h4>
                <div className="overflow-auto max-h-60">
                  <table className="min-w-full text-xs">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-2 py-1 text-left">ID</th>
                        <th className="px-2 py-1 text-left">Client</th>
                        <th className="px-2 py-1 text-left">Start (UTC)</th>
                        <th className="px-2 py-1 text-left">End (UTC)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {testData.appointments.normal.map((appt, index) => (
                        <tr key={appt.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="px-2 py-1">{appt.id.substring(0, 8)}...</td>
                          <td className="px-2 py-1">{appt.clientName}</td>
                          <td className="px-2 py-1">{appt.start_at}</td>
                          <td className="px-2 py-1">{appt.end_at}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              
              <div className="border rounded p-4">
                <h4 className="font-medium mb-2">Raw Availability Blocks ({testData.availabilityBlocks.normal.length})</h4>
                <div className="overflow-auto max-h-60">
                  <table className="min-w-full text-xs">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-2 py-1 text-left">ID</th>
                        <th className="px-2 py-1 text-left">Start (UTC)</th>
                        <th className="px-2 py-1 text-left">End (UTC)</th>
                        <th className="px-2 py-1 text-left">Active</th>
                      </tr>
                    </thead>
                    <tbody>
                      {testData.availabilityBlocks.normal.map((block, index) => (
                        <tr key={block.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="px-2 py-1">{block.id.substring(0, 8)}...</td>
                          <td className="px-2 py-1">{block.start_at}</td>
                          <td className="px-2 py-1">{block.end_at}</td>
                          <td className="px-2 py-1">{block.is_active ? 'Yes' : 'No'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            
            {showRawData && (
              <div className="mt-4 bg-gray-100 p-4 rounded overflow-auto max-h-60">
                <h4 className="font-medium mb-2">Raw JSON Data</h4>
                <pre className="text-xs">
                  {JSON.stringify({
                    appointments: testData.appointments.normal,
                    availabilityBlocks: testData.availabilityBlocks.normal
                  }, null, 2)}
                </pre>
              </div>
            )}
          </div>
        );
        
      case 2:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Step 2: Timezone Conversion</h3>
            <p className="text-sm text-gray-600">
              The UTC timestamps are converted to the user's timezone ({userTimeZone}).
              This ensures all dates and times are displayed correctly for the user.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border rounded p-4">
                <h4 className="font-medium mb-2">Appointments with Local Time</h4>
                <div className="overflow-auto max-h-60">
                  <table className="min-w-full text-xs">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-2 py-1 text-left">ID</th>
                        <th className="px-2 py-1 text-left">Client</th>
                        <th className="px-2 py-1 text-left">Start (UTC)</th>
                        <th className="px-2 py-1 text-left">Start (Local)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {testData.appointments.normal.map((appt, index) => (
                        <tr key={appt.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="px-2 py-1">{appt.id.substring(0, 8)}...</td>
                          <td className="px-2 py-1">{appt.clientName}</td>
                          <td className="px-2 py-1">{appt.start_at}</td>
                          <td className="px-2 py-1">{formatISODate(appt.start_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              
              <div className="border rounded p-4">
                <h4 className="font-medium mb-2">Availability with Local Time</h4>
                <div className="overflow-auto max-h-60">
                  <table className="min-w-full text-xs">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-2 py-1 text-left">ID</th>
                        <th className="px-2 py-1 text-left">Start (UTC)</th>
                        <th className="px-2 py-1 text-left">Start (Local)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {testData.availabilityBlocks.normal.map((block, index) => (
                        <tr key={block.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="px-2 py-1">{block.id.substring(0, 8)}...</td>
                          <td className="px-2 py-1">{block.start_at}</td>
                          <td className="px-2 py-1">{formatISODate(block.start_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        );
        
      case 3:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Step 3: Data Transformation</h3>
            <p className="text-sm text-gray-600">
              The raw data is transformed into specialized objects for the calendar components.
              Appointments become AppointmentBlocks, and availability becomes TimeBlocks.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border rounded p-4">
                <h4 className="font-medium mb-2">Transformed AppointmentBlocks ({transformedData.appointmentBlocks.length})</h4>
                <div className="overflow-auto max-h-60">
                  <table className="min-w-full text-xs">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-2 py-1 text-left">ID</th>
                        <th className="px-2 py-1 text-left">Client</th>
                        <th className="px-2 py-1 text-left">Start</th>
                        <th className="px-2 py-1 text-left">End</th>
                        <th className="px-2 py-1 text-left">Day</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transformedData.appointmentBlocks.map((block, index) => (
                        <tr key={block.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="px-2 py-1">{block.id.substring(0, 8)}...</td>
                          <td className="px-2 py-1">{block.clientName}</td>
                          <td className="px-2 py-1">{block.start.toFormat('HH:mm')}</td>
                          <td className="px-2 py-1">{block.end.toFormat('HH:mm')}</td>
                          <td className="px-2 py-1">{block.day.toFormat('yyyy-MM-dd')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              
              <div className="border rounded p-4">
                <h4 className="font-medium mb-2">Transformed TimeBlocks ({transformedData.timeBlocks.length})</h4>
                <div className="overflow-auto max-h-60">
                  <table className="min-w-full text-xs">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-2 py-1 text-left">Availability ID</th>
                        <th className="px-2 py-1 text-left">Start</th>
                        <th className="px-2 py-1 text-left">End</th>
                        <th className="px-2 py-1 text-left">Day</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transformedData.timeBlocks.map((block, index) => (
                        <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="px-2 py-1">{block.availabilityIds[0]?.substring(0, 8)}...</td>
                          <td className="px-2 py-1">{block.start.toFormat('HH:mm')}</td>
                          <td className="px-2 py-1">{block.end.toFormat('HH:mm')}</td>
                          <td className="px-2 py-1">{block.day?.toFormat('yyyy-MM-dd')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            
            {showRawData && (
              <div className="mt-4 bg-gray-100 p-4 rounded overflow-auto max-h-60">
                <h4 className="font-medium mb-2">Transformed Data</h4>
                <pre className="text-xs">
                  {JSON.stringify({
                    appointmentBlocks: transformedData.appointmentBlocks.map(block => ({
                      id: block.id,
                      clientName: block.clientName,
                      start: block.start.toFormat('yyyy-MM-dd HH:mm'),
                      end: block.end.toFormat('yyyy-MM-dd HH:mm'),
                      day: block.day.toFormat('yyyy-MM-dd')
                    })),
                    timeBlocks: transformedData.timeBlocks.map(block => ({
                      availabilityIds: block.availabilityIds,
                      start: block.start.toFormat('yyyy-MM-dd HH:mm'),
                      end: block.end.toFormat('yyyy-MM-dd HH:mm'),
                      day: block.day?.toFormat('yyyy-MM-dd'),
                      isException: block.isException,
                      isStandalone: block.isStandalone
                    }))
                  }, null, 2)}
                </pre>
              </div>
            )}
          </div>
        );
        
      case 4:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Step 4: Component Rendering</h3>
            <p className="text-sm text-gray-600">
              The transformed data is used to render the calendar components.
              Each time slot checks if it's part of an appointment or availability block.
            </p>
            
            <div className="border rounded p-4">
              <h4 className="font-medium mb-2">Component Hierarchy</h4>
              <div className="overflow-auto">
                <div className="p-4 bg-blue-50 border border-blue-200 rounded">
                  <div className="font-medium">WeekView Component</div>
                  <div className="ml-4 mt-2 p-3 bg-green-50 border border-green-200 rounded">
                    <div className="font-medium">Time Grid</div>
                    <div className="ml-4 mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
                      {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="p-2 bg-yellow-50 border border-yellow-200 rounded">
                          <div className="font-medium">TimeSlot Component</div>
                          <div className="text-xs mt-1">
                            <div>Checks for:</div>
                            <ul className="list-disc ml-4">
                              <li>Is part of appointment?</li>
                              <li>Is part of availability?</li>
                              <li>Position in block (start/middle/end)</li>
                            </ul>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="border rounded p-4">
              <h4 className="font-medium mb-2">Data Flow Visualization</h4>
              <div className="overflow-auto">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0 w-1/3">
                    <div className="p-3 bg-blue-100 rounded text-sm">
                      <div className="font-medium">Raw Data</div>
                      <ul className="list-disc ml-4 mt-1 text-xs">
                        <li>Appointments (UTC)</li>
                        <li>Availability (UTC)</li>
                      </ul>
                    </div>
                    <div className="h-8 w-8 mx-auto flex items-center justify-center">↓</div>
                  </div>
                  
                  <div className="flex-shrink-0 w-1/3">
                    <div className="p-3 bg-green-100 rounded text-sm">
                      <div className="font-medium">Transformed Data</div>
                      <ul className="list-disc ml-4 mt-1 text-xs">
                        <li>AppointmentBlocks (Local TZ)</li>
                        <li>TimeBlocks (Local TZ)</li>
                      </ul>
                    </div>
                    <div className="h-8 w-8 mx-auto flex items-center justify-center">↓</div>
                  </div>
                  
                  <div className="flex-shrink-0 w-1/3">
                    <div className="p-3 bg-yellow-100 rounded text-sm">
                      <div className="font-medium">Component Props</div>
                      <ul className="list-disc ml-4 mt-1 text-xs">
                        <li>isAvailable</li>
                        <li>appointment</li>
                        <li>currentBlock</li>
                        <li>Position flags</li>
                      </ul>
                    </div>
                    <div className="h-8 w-8 mx-auto flex items-center justify-center">↓</div>
                  </div>
                </div>
                
                <div className="p-3 bg-purple-100 rounded text-sm mt-2">
                  <div className="font-medium">Rendered Calendar View</div>
                  <div className="text-xs mt-1">
                    Visual representation of appointments and availability
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
        
      default:
        return null;
    }
  };
  
  return (
    <div className="p-6 bg-white rounded-lg shadow">
      <h2 className="text-xl font-semibold mb-4">Calendar Data Flow Visualization</h2>
      
      <div className="mb-6 flex flex-wrap items-center gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Test Date:</label>
          <input
            type="date"
            value={formatDate(selectedDate)}
            onChange={(e) => setSelectedDate(new Date(e.target.value))}
            className="p-2 border rounded"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Show Raw Data:</label>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={showRawData}
              onChange={(e) => setShowRawData(e.target.checked)}
              className="mr-2"
            />
            Show JSON
          </label>
        </div>
      </div>
      
      <div className="mb-6">
        <div className="flex border-b">
          {[1, 2, 3, 4].map(step => (
            <button
              key={step}
              className={`px-4 py-2 font-medium text-sm ${
                selectedStep === step
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setSelectedStep(step)}
            >
              Step {step}
            </button>
          ))}
        </div>
      </div>
      
      <div className="mt-4">
        {renderDataFlowStep(selectedStep)}
      </div>
    </div>
  );
};

export default CalendarDataFlow;