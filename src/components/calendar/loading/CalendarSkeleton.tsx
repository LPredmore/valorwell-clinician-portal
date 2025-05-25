import React from 'react';

/**
 * CalendarSkeleton component
 * Displays a skeleton loading UI for the calendar
 */
const CalendarSkeleton: React.FC = () => {
  // Generate an array of 7 days for the week view
  const days = Array.from({ length: 7 });
  
  // Generate an array of 24 time slots (30-minute intervals from 7am to 7pm)
  const timeSlots = Array.from({ length: 24 });
  
  return (
    <div className="animate-pulse">
      {/* Calendar header skeleton */}
      <div className="grid grid-cols-8 gap-1 mb-2">
        {/* Empty cell for time column */}
        <div className="h-12 flex items-center justify-center"></div>
        
        {/* Day headers */}
        {days.map((_, index) => (
          <div 
            key={`day-header-${index}`}
            className="h-12 bg-gray-200 rounded-md"
          />
        ))}
      </div>
      
      {/* Calendar grid skeleton */}
      <div className="flex">
        {/* Time column */}
        <div className="flex flex-col">
          {timeSlots.map((_, index) => (
            <div 
              key={`time-${index}`}
              className="h-12 w-16 flex items-center justify-end pr-2"
            >
              <div className="h-4 w-12 bg-gray-200 rounded" />
            </div>
          ))}
        </div>
        
        {/* Day columns */}
        {days.map((_, dayIndex) => (
          <div key={`day-${dayIndex}`} className="flex-1 flex flex-col">
            {timeSlots.map((_, slotIndex) => {
              // Randomly add some "appointments" to make it look more realistic
              const hasAppointment = Math.random() > 0.85;
              const isAvailability = !hasAppointment && Math.random() > 0.7;
              
              return (
                <div 
                  key={`slot-${dayIndex}-${slotIndex}`}
                  className="h-12 border-b border-gray-100 px-1"
                >
                  {hasAppointment && (
                    <div className="h-full w-full bg-blue-100 rounded border-l-4 border-blue-300" />
                  )}
                  
                  {isAvailability && (
                    <div className="h-full w-full bg-green-100 rounded border-l-4 border-green-300" />
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};

export default CalendarSkeleton;