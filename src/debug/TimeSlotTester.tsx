import React, { useState } from 'react';
import { DateTime } from 'luxon';
import TimeSlot from '@/components/calendar/week-view/TimeSlot';
import { TimeBlock, AppointmentBlock } from '@/components/calendar/week-view/types';
import { Appointment } from '@/types/appointment';
import { CalendarDebugUtils } from '@/utils/calendarDebugUtils';

interface TimeSlotTesterProps {
  userTimeZone: string;
}

const TimeSlotTester: React.FC<TimeSlotTesterProps> = ({ userTimeZone }) => {
  const [showDebugInfo, setShowDebugInfo] = useState(true);
  const [slotState, setSlotState] = useState<'empty' | 'available' | 'appointment'>('empty');
  const [isStartOfBlock, setIsStartOfBlock] = useState(true);
  const [isEndOfBlock, setIsEndOfBlock] = useState(false);
  const [isStartOfAppointment, setIsStartOfAppointment] = useState(true);
  const [isEndOfAppointment, setIsEndOfAppointment] = useState(false);
  const [lastAction, setLastAction] = useState<string>('');
  
  // Create test data
  const today = new Date();
  const now = DateTime.fromJSDate(today).setZone(userTimeZone);
  
  // Sample time block for availability
  const timeBlock: TimeBlock = {
    start: now.set({ hour: 9, minute: 0 }),
    end: now.set({ hour: 10, minute: 0 }),
    day: now.startOf('day'),
    availabilityIds: ['test-availability-id'],
    isException: false,
    isStandalone: false
  };
  
  // Sample appointment block
  const appointmentBlock: AppointmentBlock = {
    id: 'test-appointment-id',
    start: now.set({ hour: 14, minute: 0 }),
    end: now.set({ hour: 15, minute: 0 }),
    day: now.startOf('day'),
    clientId: 'test-client-id',
    clientName: 'Test Client',
    type: 'Initial Consultation'
  };
  
  // Sample original appointments array
  const originalAppointments: Appointment[] = [
    {
      id: 'test-appointment-id',
      client_id: 'test-client-id',
      clinician_id: 'test-clinician-id',
      start_at: now.set({ hour: 14, minute: 0 }).toUTC().toISO(),
      end_at: now.set({ hour: 15, minute: 0 }).toUTC().toISO(),
      type: 'Initial Consultation',
      status: 'scheduled',
      clientName: 'Test Client'
    }
  ];
  
  // Event handlers
  const handleAvailabilityBlockClick = (day: Date, block: TimeBlock) => {
    setLastAction(`Availability block clicked: ${DateTime.fromJSDate(day).toFormat('yyyy-MM-dd')} - ${block.start.toFormat('HH:mm')} to ${block.end.toFormat('HH:mm')}`);
    CalendarDebugUtils.log('TimeSlotTester', 'Availability block clicked', {
      day: DateTime.fromJSDate(day).toFormat('yyyy-MM-dd'),
      start: block.start.toFormat('HH:mm'),
      end: block.end.toFormat('HH:mm')
    });
  };
  
  const handleAppointmentClick = (appointment: any) => {
    setLastAction(`Appointment clicked: ${appointment.clientName} - ${appointment.id}`);
    CalendarDebugUtils.log('TimeSlotTester', 'Appointment clicked', {
      id: appointment.id,
      clientName: appointment.clientName,
      start: appointment.start?.toFormat?.('HH:mm') || appointment.start_at
    });
  };
  
  const handleAppointmentDragStart = (appointment: any, event: React.DragEvent) => {
    setLastAction(`Appointment drag started: ${appointment.clientName}`);
    CalendarDebugUtils.log('TimeSlotTester', 'Appointment drag started', {
      id: appointment.id,
      clientName: appointment.clientName
    });
  };
  
  const handleAppointmentDragOver = (day: Date, timeSlot: Date, event: React.DragEvent) => {
    event.preventDefault();
    // Not setting last action to avoid too many updates
  };
  
  const handleAppointmentDrop = (day: Date, timeSlot: Date, event: React.DragEvent) => {
    setLastAction(`Appointment dropped at: ${DateTime.fromJSDate(timeSlot).toFormat('HH:mm')}`);
    CalendarDebugUtils.log('TimeSlotTester', 'Appointment dropped', {
      day: DateTime.fromJSDate(day).toFormat('yyyy-MM-dd'),
      time: DateTime.fromJSDate(timeSlot).toFormat('HH:mm')
    });
  };
  
  // Determine which props to pass based on the current state
  const getTimeSlotProps = () => {
    const baseProps = {
      day: today,
      timeSlot: today,
      isAvailable: slotState === 'available',
      isStartOfBlock,
      isEndOfBlock,
      isStartOfAppointment,
      isEndOfAppointment,
      handleAvailabilityBlockClick,
      onAppointmentClick: handleAppointmentClick,
      onAppointmentDragStart: handleAppointmentDragStart,
      onAppointmentDragOver: handleAppointmentDragOver,
      onAppointmentDrop: handleAppointmentDrop,
      originalAppointments
    };
    
    if (slotState === 'available') {
      return {
        ...baseProps,
        currentBlock: timeBlock
      };
    } else if (slotState === 'appointment') {
      return {
        ...baseProps,
        appointment: appointmentBlock
      };
    }
    
    return baseProps;
  };
  
  return (
    <div className="p-6 bg-white rounded-lg shadow">
      <h2 className="text-xl font-semibold mb-4">TimeSlot Component Tester</h2>
      
      <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-medium mb-2">TimeSlot State</h3>
            <div className="flex space-x-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="slotState"
                  value="empty"
                  checked={slotState === 'empty'}
                  onChange={() => setSlotState('empty')}
                  className="mr-2"
                />
                Empty
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="slotState"
                  value="available"
                  checked={slotState === 'available'}
                  onChange={() => setSlotState('available')}
                  className="mr-2"
                />
                Available
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="slotState"
                  value="appointment"
                  checked={slotState === 'appointment'}
                  onChange={() => setSlotState('appointment')}
                  className="mr-2"
                />
                Appointment
              </label>
            </div>
          </div>
          
          {slotState === 'available' && (
            <div>
              <h3 className="text-lg font-medium mb-2">Availability Block Position</h3>
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={isStartOfBlock}
                    onChange={(e) => setIsStartOfBlock(e.target.checked)}
                    className="mr-2"
                  />
                  Start of Block
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={isEndOfBlock}
                    onChange={(e) => setIsEndOfBlock(e.target.checked)}
                    className="mr-2"
                  />
                  End of Block
                </label>
              </div>
            </div>
          )}
          
          {slotState === 'appointment' && (
            <div>
              <h3 className="text-lg font-medium mb-2">Appointment Position</h3>
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={isStartOfAppointment}
                    onChange={(e) => setIsStartOfAppointment(e.target.checked)}
                    className="mr-2"
                  />
                  Start of Appointment
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={isEndOfAppointment}
                    onChange={(e) => setIsEndOfAppointment(e.target.checked)}
                    className="mr-2"
                  />
                  End of Appointment
                </label>
              </div>
            </div>
          )}
          
          <div>
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
          <h3 className="text-lg font-medium mb-2">TimeSlot Preview</h3>
          <div className="border rounded p-4 h-40 flex items-center justify-center">
            <div className="w-24 h-24">
              <TimeSlot {...getTimeSlotProps()} />
            </div>
          </div>
          
          {lastAction && (
            <div className="mt-4 p-3 bg-gray-100 rounded text-sm">
              <strong>Last Action:</strong> {lastAction}
            </div>
          )}
        </div>
      </div>
      
      {showDebugInfo && (
        <div className="mt-6">
          <h3 className="text-lg font-medium mb-2">Debug Information</h3>
          <div className="bg-gray-100 p-4 rounded overflow-auto max-h-60">
            <pre className="text-xs">
              {JSON.stringify(getTimeSlotProps(), null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};

export default TimeSlotTester;