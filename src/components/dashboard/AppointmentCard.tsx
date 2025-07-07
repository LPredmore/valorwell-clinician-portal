
import React from 'react';
import { Calendar, Clock, UserCircle, Video, FileText, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Appointment } from '@/types/appointment';
import { formatAppointmentDate, formatAppointmentTime } from '@/utils/appointmentUtils';
import { TimeZoneService } from '@/utils/timeZoneService';
import VideoRoomStatusIndicator from './VideoRoomStatusIndicator';

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
  // STEP 5: CRITICAL - Implement proper timezone conversion flow
  // Step 1: Convert UTC start_at to appointment_timezone (source of truth)
  // Step 2: Convert that value to clinician's current timezone for display
  const getDisplayTimezone = () => {
    if (appointment.appointment_timezone) {
      return appointment.appointment_timezone;
    }
    
    // Fallback to user timezone with warning
    console.warn(`[AppointmentCard] STEP 5 - Missing appointment_timezone for appointment ${appointment.id}, falling back to user timezone`);
    return userTimeZone;
  };

  const performTimezoneConversion = (utcTimestamp: string) => {
    console.log(`[AppointmentCard] STEP 5 - Starting timezone conversion for appointment ${appointment.id}:`, {
      utcTimestamp,
      appointmentTimezone: appointment.appointment_timezone,
      clinicianCurrentTimezone: userTimeZone,
      conversionFlow: `UTC → appointment_timezone(${appointment.appointment_timezone}) → clinician_timezone(${userTimeZone})`
    });

    try {
      // Step 1: Convert UTC to appointment's original timezone (source of truth)
      const appointmentTimezone = getDisplayTimezone();
      const inAppointmentTimezone = TimeZoneService.fromUTC(utcTimestamp, appointmentTimezone);
      
      console.log(`[AppointmentCard] STEP 5 - Step 1 complete - UTC to appointment timezone:`, {
        original: utcTimestamp,
        appointmentTimezone,
        converted: inAppointmentTimezone.toFormat('yyyy-MM-dd HH:mm'),
        iso: inAppointmentTimezone.toISO()
      });

      // Step 2: Convert from appointment timezone to clinician's current timezone
      const inClinicianTimezone = inAppointmentTimezone.setZone(userTimeZone);
      
      console.log(`[AppointmentCard] STEP 5 - Step 2 complete - Appointment timezone to clinician timezone:`, {
        fromTimezone: appointmentTimezone,
        toTimezone: userTimeZone,
        converted: inClinicianTimezone.toFormat('yyyy-MM-dd HH:mm'),
        iso: inClinicianTimezone.toISO(),
        fullConversionFlow: `${utcTimestamp} → ${inAppointmentTimezone.toFormat('yyyy-MM-dd HH:mm')} (${appointmentTimezone}) → ${inClinicianTimezone.toFormat('yyyy-MM-dd HH:mm')} (${userTimeZone})`
      });

      return inClinicianTimezone;
    } catch (error) {
      console.error(`[AppointmentCard] STEP 5 - Timezone conversion error for appointment ${appointment.id}:`, error);
      // Fallback: direct UTC to clinician timezone conversion
      return TimeZoneService.fromUTC(utcTimestamp, userTimeZone);
    }
  };

  // STEP 5: Apply the conversion flow to start and end times
  const displayStartTime = performTimezoneConversion(appointment.start_at);
  const displayEndTime = performTimezoneConversion(appointment.end_at);

  const displayTimeZoneLabel = TimeZoneService.getTimeZoneDisplayName(userTimeZone);

  console.log(`[AppointmentCard] STEP 5 - Final display times for appointment ${appointment.id}:`, {
    originalStartUTC: appointment.start_at,
    originalEndUTC: appointment.end_at,
    appointmentTimezone: appointment.appointment_timezone,
    clinicianTimezone: userTimeZone,
    displayStart: displayStartTime.toFormat('yyyy-MM-dd HH:mm'),
    displayEnd: displayEndTime.toFormat('yyyy-MM-dd HH:mm'),
    displayTimezoneLabel: displayTimeZoneLabel,
    timezoneConversionSuccess: !!(appointment.appointment_timezone && appointment.appointment_timezone !== userTimeZone)
  });

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
            {displayStartTime.toFormat('MMM d, yyyy')}
          </CardDescription>
        </CardHeader>
        <CardContent className="pb-2">
          <div className="flex items-center">
            <Clock className="h-4 w-4 mr-2" />
            <span className="text-sm">
              {displayStartTime.toFormat('h:mm a')} - {displayEndTime.toFormat('h:mm a')}
              <span className="text-xs text-gray-500 ml-1">({displayTimeZoneLabel})</span>
            </span>
          </div>
        <div className="text-sm mt-1">{appointment.type}</div>
        
        {/* Video Room Status */}
        <div className="flex items-center mt-2">
          <VideoRoomStatusIndicator 
            appointmentId={appointment.id} 
            size="small"
            showRecreateButton={!!onDocumentSession}
          />
        </div>
        
        {/* STEP 5: Show timezone conversion info for debugging */}
        {process.env.NODE_ENV !== 'production' && appointment.appointment_timezone && (
          <div className="text-xs text-gray-400 mt-1">
            Saved in: {appointment.appointment_timezone}
          </div>
        )}
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
          {displayStartTime.toFormat('h:mm a')} - {displayEndTime.toFormat('h:mm a')} 
          <span className="text-xs text-gray-500 ml-1">({displayTimeZoneLabel})</span>
        </CardTitle>
        <CardDescription className="flex items-center">
          <Calendar className="h-4 w-4 mr-2" />
          {displayStartTime.toFormat('MMM d, yyyy')}
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
        
        {/* Video Room Status */}
        <div className="flex items-center mt-2">
          <VideoRoomStatusIndicator 
            appointmentId={appointment.id} 
            size="small"
            showRecreateButton={showStartButton}
          />
        </div>
        
        {/* STEP 5: Show timezone conversion info for debugging */}
        {process.env.NODE_ENV !== 'production' && appointment.appointment_timezone && (
          <div className="text-xs text-gray-400 mt-1">
            Saved in: {appointment.appointment_timezone}
          </div>
        )}
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
