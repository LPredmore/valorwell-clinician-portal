
import React, { useState } from 'react';
import { createTestDataset } from './mockCalendarData';
import WeekView from '@/components/calendar/WeekView';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const WeekViewTester: React.FC = () => {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  // Get test data
  const testData = createTestDataset();
  
  const handleRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };
  
  return (
    <div className="p-6 space-y-6">
      <Card className="p-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Week View Tester</h2>
          <Button onClick={handleRefresh}>Refresh</Button>
        </div>
        
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-medium">Test Data</h3>
            <p>Appointments: {testData.appointments.length}</p>
            <p>Availability Blocks: {testData.availabilityBlocks.length}</p>
            <p>Week Dates: {testData.weekDates.length}</p>
          </div>
          
          <div>
            <h3 className="text-lg font-medium">Week View Component</h3>
            <WeekView
              days={testData.weekDates}
              selectedClinicianId="clinician-1"
              userTimeZone="America/Chicago"
              showAvailability={true}
              refreshTrigger={refreshTrigger}
              appointments={testData.appointments}
              onAppointmentClick={(appointment) => {
                console.log('Appointment clicked:', appointment);
              }}
              onAvailabilityClick={(date, block) => {
                console.log('Availability clicked:', date, block);
              }}
              currentDate={new Date()}
              isLoading={false}
              error={null}
            />
          </div>
        </div>
      </Card>
    </div>
  );
};

export default WeekViewTester;
