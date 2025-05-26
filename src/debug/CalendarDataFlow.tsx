
import React from 'react';
import { mockAppointments, mockAvailabilityBlocks, createTestDataset } from './mockCalendarData';
import { Card } from '@/components/ui/card';

const CalendarDataFlow: React.FC = () => {
  // Get test data
  const testData = createTestDataset();
  
  return (
    <div className="p-6 space-y-6">
      <Card className="p-4">
        <h2 className="text-xl font-semibold mb-4">Calendar Data Flow Analysis</h2>
        
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-medium">Mock Appointments</h3>
            <p>Count: {mockAppointments.length}</p>
            <div className="text-sm text-gray-600">
              {mockAppointments.map(appt => (
                <div key={appt.id}>
                  {appt.id}: {appt.type} - {appt.start_at}
                </div>
              ))}
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-medium">Mock Availability Blocks</h3>
            <p>Count: {mockAvailabilityBlocks.length}</p>
            <div className="text-sm text-gray-600">
              {mockAvailabilityBlocks.map(block => (
                <div key={block.id}>
                  {block.id}: {block.day_of_week} - {block.start_at}
                </div>
              ))}
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-medium">Test Dataset</h3>
            <p>Appointments: {testData.appointments.length}</p>
            <p>Availability Blocks: {testData.availabilityBlocks.length}</p>
            <p>Week Dates: {testData.weekDates.length}</p>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default CalendarDataFlow;
