
import React from 'react';
import { Calendar, Clock, User, MoreVertical, Edit, Trash } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import VideoLinkSection from './VideoLinkSection';
import { formatClientName, formatAppointmentDate, formatAppointmentTime } from '@/utils/appointmentUtils';
import { Appointment } from '@/types/appointment';

interface AppointmentDetailsProps {
  appointment: Appointment;
  onEditClick: () => void;
  onDeleteClick: () => void;
  onClose: () => void;
  onAppointmentUpdated: () => void;
  userTimeZone: string;
}

const AppointmentDetails: React.FC<AppointmentDetailsProps> = ({
  appointment,
  onEditClick,
  onDeleteClick,
  onClose,
  onAppointmentUpdated,
  userTimeZone
}) => {
  const isRecurring = !!appointment.recurring_group_id;

  // CRITICAL: Always use appointment's saved timezone for display
  const getDisplayTimezone = () => {
    if (appointment.appointment_timezone) {
      return appointment.appointment_timezone;
    }
    
    // Fallback to user timezone with warning
    console.warn(`[AppointmentDetails] Missing appointment_timezone for appointment ${appointment.id}, falling back to user timezone`);
    return userTimeZone;
  };

  const displayTimeZone = getDisplayTimezone();

  const getClientName = () => {
    // If we have a complete client object with the fields we need
    if (appointment.client) {
      // Use the formatClientName utility for consistent formatting
      return formatClientName(appointment.client);
    }
    
    // Otherwise use the clientName field if available
    if (appointment.clientName) {
      return appointment.clientName;
    }
    
    // Fallback
    return 'Unknown Client';
  };

  const getFormattedDate = () => {
    if (!appointment.start_at) return 'No date available';
    return formatAppointmentDate(appointment.start_at, displayTimeZone);
  };

  const getFormattedTime = (isoString: string | undefined) => {
    if (!isoString) return 'N/A';
    return formatAppointmentTime(isoString, displayTimeZone);
  };

  const getRecurrenceText = () => {
    if (!appointment.recurring_group_id) return '';
    
    switch (appointment.appointment_recurring) {
      case 'weekly':
        return 'Repeats weekly';
      case 'biweekly':
        return 'Repeats every 2 weeks';
      case 'monthly':
        return 'Repeats every 4 weeks';
      default:
        return '';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-gray-500" />
          <span className="font-medium">
            {getClientName()}
          </span>
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onEditClick}>
              <Edit className="h-4 w-4 mr-2" />
              Edit Appointment
            </DropdownMenuItem>
            <DropdownMenuItem 
              className="text-destructive focus:text-destructive" 
              onClick={onDeleteClick}
            >
              <Trash className="h-4 w-4 mr-2" />
              Delete Appointment
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      
      <Separator />
      
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-gray-500" />
          <span>{getFormattedDate()}</span>
        </div>
        
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-gray-500" />
          <span>
            {getFormattedTime(appointment.start_at)} - {getFormattedTime(appointment.end_at)}
          </span>
          <span className="text-xs text-muted-foreground">(1 hour)</span>
        </div>
        
        {isRecurring && (
          <div className="flex items-center gap-2">
            <div className="inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold text-blue-600 bg-blue-50">
              <Calendar className="h-3 w-3 mr-1" />
              {getRecurrenceText()}
            </div>
          </div>
        )}
        
        <div>
          <div className="inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold bg-green-100 text-green-800 hover:bg-green-100">
            {appointment.status || 'Scheduled'}
          </div>
        </div>

        {/* Video Call Link Section */}
        <VideoLinkSection 
          appointmentId={appointment.id}
          videoUrl={appointment.video_room_url || null}
          onVideoLinkUpdated={onAppointmentUpdated}
        />
      </div>
      
      <div className="flex justify-end">
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
      </div>
    </div>
  );
};

export default AppointmentDetails;
