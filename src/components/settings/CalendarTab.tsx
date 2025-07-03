
import React from 'react';
import CalendarConnectionsPanel from '@/components/calendar/CalendarConnectionsPanel';

const CalendarTab: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-4">Calendar Integration</h2>
        <p className="text-gray-600 mb-6">
          Connect your external calendars to enable two-way synchronization with your appointments.
        </p>
      </div>
      
      <CalendarConnectionsPanel />
      
      <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <h3 className="font-semibold text-blue-900 mb-2">How Calendar Sync Works</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• When you create an appointment, it's automatically added to your connected calendar</li>
          <li>• When you update an appointment, the changes sync to your external calendar</li>
          <li>• When you delete an appointment, it's removed from your external calendar</li>
          <li>• External calendar events appear as read-only events in your schedule</li>
        </ul>
      </div>
    </div>
  );
};

export default CalendarTab;
