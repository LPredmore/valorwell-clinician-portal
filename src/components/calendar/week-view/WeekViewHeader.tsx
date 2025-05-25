import React, { memo } from 'react';
import { DateTime } from 'luxon';
import { CalendarDebugUtils } from '@/utils/calendarDebugUtils';

interface WeekViewHeaderProps {
  weekDays: DateTime[];
  currentDate: Date;
}

/**
 * WeekViewHeader component - Displays the days of the week in the calendar header
 * Extracted from WeekView for better separation of concerns
 */
const WeekViewHeader: React.FC<WeekViewHeaderProps> = memo(({ weekDays, currentDate }) => {
  // Component name for logging
  const COMPONENT_NAME = 'WeekViewHeader';
  
  // Log render for debugging
  CalendarDebugUtils.logLifecycle(COMPONENT_NAME, 'render', {
    weekDaysCount: weekDays?.length || 0
  });

  // Get current date as string for highlighting today
  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="grid grid-cols-8 gap-1 mb-2">
      {/* Empty cell for time column */}
      <div className="h-12 flex items-center justify-center font-medium text-gray-500"></div>
      
      {/* Day headers */}
      {weekDays.map(day => {
        const isToday = day.toFormat('yyyy-MM-dd') === today;
        const isCurrentMonth = day.month === new Date(currentDate).getMonth() + 1;
        
        return (
          <div 
            key={day.toFormat('yyyy-MM-dd')}
            className={`h-12 flex flex-col items-center justify-center rounded-md ${
              isToday 
                ? 'bg-blue-100 text-blue-800 font-bold' 
                : isCurrentMonth 
                  ? 'bg-gray-50 text-gray-800' 
                  : 'bg-gray-50 text-gray-400'
            }`}
            data-testid={`day-header-${day.toFormat('yyyy-MM-dd')}`}
          >
            <div className="text-sm font-medium">
              {day.toFormat('EEE')}
            </div>
            <div className={`text-lg ${isToday ? 'font-bold' : 'font-medium'}`}>
              {day.toFormat('d')}
            </div>
          </div>
        );
      })}
    </div>
  );
});

export default WeekViewHeader;