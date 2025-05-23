
import React from 'react';
import { Button } from '@/components/ui/button';
import { Clock, Plus, CalendarPlus, Check } from 'lucide-react';
import { CalendarViewControlsProps } from './types';

const CalendarViewControls: React.FC<CalendarViewControlsProps> = ({
  showAvailability,
  onToggleAvailability,
  onNewAppointment,
  selectedClinicianId,
  onToggleGoogleCalendar,
  isGoogleCalendarConnected,
  isConnectingGoogleCalendar
}) => {
  return (
    <div className="flex items-center gap-4">
      {onToggleGoogleCalendar && (
        <Button
          variant={isGoogleCalendarConnected ? "outline" : "default"}
          onClick={onToggleGoogleCalendar}
          disabled={isConnectingGoogleCalendar}
          className="flex items-center gap-2"
        >
          {isGoogleCalendarConnected ? (
            <>
              <Check className="w-4 h-4 text-green-500" />
              <span>Sync with Google Calendar</span>
            </>
          ) : (
            <>
              <CalendarPlus className="w-4 h-4" />
              <span>Connect Google Calendar</span>
            </>
          )}
        </Button>
      )}

      <Button
        variant={showAvailability ? "default" : "outline"}
        onClick={onToggleAvailability}
      >
        <Clock className="mr-2 h-4 w-4" />
        Availability
      </Button>

      <Button onClick={onNewAppointment}>
        <Plus className="h-4 w-4 mr-2" />
        New Appointment
      </Button>
    </div>
  );
};

export default CalendarViewControls;
