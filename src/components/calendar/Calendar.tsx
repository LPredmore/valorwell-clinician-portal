
import React from 'react';

interface CalendarProps {
  days: Date[];
  selectedClinicianId: string;
  userTimeZone: string;
  refreshTrigger: number;
}

export const Calendar: React.FC<CalendarProps> = ({
  days,
  selectedClinicianId,
  userTimeZone,
  refreshTrigger
}) => {
  return (
    <div className="p-4 border rounded-lg">
      <h3 className="text-lg font-semibold mb-4">Calendar Component</h3>
      <div className="space-y-2">
        <p><strong>Clinician ID:</strong> {selectedClinicianId}</p>
        <p><strong>Time Zone:</strong> {userTimeZone}</p>
        <p><strong>Refresh Trigger:</strong> {refreshTrigger}</p>
        <p><strong>Days:</strong> {days.length} days</p>
        <div className="text-sm text-gray-600">
          {days.map((day, index) => (
            <div key={index}>
              {day.toLocaleDateString()}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Calendar;
