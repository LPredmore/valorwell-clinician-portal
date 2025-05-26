
import React from 'react';
import { Calendar, Clock, UserCircle, Video, FileText, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Appointment } from '@/types/appointment';
import { formatAppointmentDate, formatAppointmentTime } from '@/utils/appointmentUtils';
import { TimeZoneService } from '@/utils/timeZoneService';

export interface AppointmentCardProps {
  appointment: Appointment;
  timeZoneDisplay: string;
  userTimeZone: string;
  showStartButton?: boolean;
  onStartSession?: (appointment: Appointment) => void;
  onDocumentSession?: (appointment: Appointment) => void;
  onSessionDidNotOccur?: (appointment: Appointment) => void;
}

export const AppointmentCard: React.FC<AppointmentCardProps> = ({
  appointment,
  timeZoneDisplay,
  userTimeZone,
  showStartButton = false,
  onStartSession,
  onDocumentSession,
  onSessionDidNotOccur
}) => {
  // CRITICAL: Always use appointment's saved timezone for display
  const getDisplayTimezone = () => {
    if (appointment.appointment_timezone) {
      return appointment.appointment_timezone;
    }
    
    // Fallback to user timezone with warning
    console.warn(`[AppointmentCard] Missing appointment_timezone for appointment ${appointment.id}, falling back to user timezone`);
    return userTimeZone;
  };

  const displayTimeZone = getDisplayTimezone();
  const displayTimeZoneLabel = TimeZoneService.getTimeZoneDisplayName(displayTimeZone);

  if (onDocumentSession) {
    return (
      <Card key={appointment.id} className="mb-3">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold flex items-center">
            <UserCircle className="h-4 w-4 mr-2" />
            {appointment.clientName || 'Unknown Client'}
          </CardTitle>
          <CardDescription className="flex items-center">
            <Calendar className="h-4 w-4 mr-2" />
            {formatAppointmentDate(appointment.start_at, displayTimeZone)}
          </CardDescription>
        </CardHeader>
        <CardContent className="pb-2">
          <div className="flex items-center">
            <Clock className="h-4 w-4 mr-2" />
            <span className="text-sm">
              {formatAppointmentTime(appointment.start_at, displayTimeZone)} - {formatAppointmentTime(appointment.end_at, displayTimeZone)}
            </span>
          </div>
          <div className="text-sm mt-1">{appointment.type}</div>
        </CardContent>
        <CardFooter className="flex flex-col gap-2">
          <Button
            variant="default"
            size="sm"
            className="w-full"
            onClick={() => onDocumentSession(appointment)}
          >
            <FileText className="h-4 w-4 mr-2" />
            Document Session
          </Button>
          
          {onSessionDidNotOccur && (
            <Button
              variant="outline"
              size="sm"
              className="w-full text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
              onClick={() => onSessionDidNotOccur(appointment)}
            >
              <XCircle className="h-4 w-4 mr-2" />
              Session Did Not Occur
            </Button>
          )}
        </CardFooter>
      </Card>
    );
  }
  
  return (
    <Card key={appointment.id} className="mb-3">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold flex items-center">
          <Clock className="h-4 w-4 mr-2" />
          {formatAppointmentTime(appointment.start_at, displayTimeZone)} - {formatAppointmentTime(appointment.end_at, displayTimeZone)} 
          <span className="text-xs text-gray-500 ml-1">({displayTimeZoneLabel})</span>
        </CardTitle>
        <CardDescription className="flex items-center">
          <Calendar className="h-4 w-4 mr-2" />
          {formatAppointmentDate(appointment.start_at, displayTimeZone)}
        </CardDescription>
      </CardHeader>
      <CardContent className="pb-2">
        <div className="flex items-center">
          <UserCircle className="h-4 w-4 mr-2" />
          <span className="text-sm">
            {appointment.clientName || 'Unknown Client'}
          </span>
        </div>
        <div className="text-sm mt-1">{appointment.type}</div>
      </CardContent>
      {showStartButton && onStartSession && (
        <CardFooter>
          <Button
            variant="default"
            size="sm"
            className="w-full"
            onClick={() => onStartSession(appointment)}
          >
            <Video className="h-4 w-4 mr-2" />
            Start Session
          </Button>
        </CardFooter>
      )}
    </Card>
  );
};
