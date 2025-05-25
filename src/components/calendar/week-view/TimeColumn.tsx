import React, { memo } from 'react';
import { format } from 'date-fns';
import { CalendarDebugUtils } from '@/utils/calendarDebugUtils';

interface TimeColumnProps {
  timeSlots: Date[];
}

/**
 * TimeColumn component - Displays the time labels in the left column of the week view
 * Extracted from WeekView for better separation of concerns
 */
const TimeColumn: React.FC<TimeColumnProps> = memo(({ timeSlots }) => {
  // Component name for logging
  const COMPONENT_NAME = 'TimeColumn';
  
  // Log render for debugging
  CalendarDebugUtils.logLifecycle(COMPONENT_NAME, 'render', {
    timeSlotsCount: timeSlots?.length || 0
  });

  // Format time for display
  const formatTime = (date: Date) => {
    return format(date, 'h:mm a');
  };

  return (
    <div className="flex flex-col">
      {timeSlots.map((timeSlot, i) => (
        <div 
          key={`time-${i}`}
          className="h-12 flex items-center justify-end pr-2 text-xs text-gray-500 font-medium"
          data-testid={`time-label-${format(timeSlot, 'HH-mm')}`}
        >
          {formatTime(timeSlot)}
        </div>
      ))}
    </div>
  );
});

export default TimeColumn;