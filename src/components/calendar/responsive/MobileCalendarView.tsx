import React, { useState } from 'react';
import { format, addDays, subDays, isSameDay } from 'date-fns';
import { CalendarDebugUtils } from '@/utils/calendarDebugUtils';
import ActionLoadingIndicator from '../loading/ActionLoadingIndicator';

// Component name for logging
const COMPONENT_NAME = 'MobileCalendarView';

interface MobileCalendarViewProps {
  currentDate: Date;
  onDateChange: (date: Date) => void;
  appointments: any[];
  isLoading: boolean;
  onAppointmentClick: (appointment: any) => void;
  userTimeZone: string;
}

/**
 * MobileCalendarView component
 * Provides a mobile-friendly view of the calendar
 * Shows a single day at a time with a date picker
 */
const MobileCalendarView: React.FC<MobileCalendarViewProps> = ({
  currentDate,
  onDateChange,
  appointments,
  isLoading,
  onAppointmentClick,
  userTimeZone
}) => {
  // State for the selected date
  const [selectedDate, setSelectedDate] = useState<Date>(currentDate);
  
  // Handle date change
  const handleDateChange = (date: Date) => {
    setSelectedDate(date);
    onDateChange(date);
    
    CalendarDebugUtils.log(COMPONENT_NAME, 'Date changed', {
      from: currentDate,
      to: date
    });
  };
  
  // Navigate to the previous day
  const goToPreviousDay = () => {
    const newDate = subDays(selectedDate, 1);
    handleDateChange(newDate);
  };
  
  // Navigate to the next day
  const goToNextDay = () => {
    const newDate = addDays(selectedDate, 1);
    handleDateChange(newDate);
  };
  
  // Navigate to today
  const goToToday = () => {
    const today = new Date();
    handleDateChange(today);
  };
  
  // Filter appointments for the selected date
  const filteredAppointments = appointments.filter(appointment => {
    const appointmentDate = new Date(appointment.start_at);
    return isSameDay(appointmentDate, selectedDate);
  });
  
  // Sort appointments by start time
  const sortedAppointments = [...filteredAppointments].sort((a, b) => {
    return new Date(a.start_at).getTime() - new Date(b.start_at).getTime();
  });
  
  // Format time for display
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return format(date, 'h:mm a');
  };
  
  return (
    <div className="mobile-calendar-view">
      {/* Date navigation */}
      <div className="flex items-center justify-between mb-4 bg-white p-3 rounded-lg shadow-sm">
        <button
          onClick={goToPreviousDay}
          className="p-2 rounded-full hover:bg-gray-100"
          aria-label="Previous day"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </button>
        
        <div className="flex flex-col items-center">
          <div className="text-lg font-semibold">
            {format(selectedDate, 'EEEE')}
          </div>
          <div className="text-sm text-gray-500">
            {format(selectedDate, 'MMMM d, yyyy')}
          </div>
        </div>
        
        <button
          onClick={goToNextDay}
          className="p-2 rounded-full hover:bg-gray-100"
          aria-label="Next day"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
      
      {/* Today button */}
      <div className="flex justify-center mb-4">
        <button
          onClick={goToToday}
          className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
        >
          Today
        </button>
      </div>
      
      {/* Appointments list */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="p-3 bg-gray-50 border-b border-gray-200">
          <h2 className="text-lg font-semibold">Appointments</h2>
        </div>
        
        {isLoading ? (
          <div className="p-8 flex justify-center">
            <ActionLoadingIndicator 
              isLoading={true} 
              text="Loading appointments..." 
              type="spinner"
              size="md"
              inline
            />
          </div>
        ) : sortedAppointments.length > 0 ? (
          <ul className="divide-y divide-gray-200">
            {sortedAppointments.map(appointment => (
              <li 
                key={appointment.id}
                className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={() => onAppointmentClick(appointment)}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-medium">{appointment.clientName}</div>
                    <div className="text-sm text-gray-500">
                      {formatTime(appointment.start_at)} - {formatTime(appointment.end_at)}
                    </div>
                  </div>
                  <div className="ml-4">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      appointment.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                      appointment.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {appointment.status}
                    </span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="p-8 text-center text-gray-500">
            No appointments for this day
          </div>
        )}
      </div>
      
      {/* Time zone indicator */}
      <div className="mt-4 text-center text-sm text-gray-500">
        All times shown in {userTimeZone}
      </div>
    </div>
  );
};

export default MobileCalendarView;