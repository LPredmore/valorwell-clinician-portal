
import React, { useEffect, useState } from 'react';
import WeekView from './week-view/WeekView';
import MonthView from './MonthView';
import ClinicianAvailabilityPanel from './ClinicianAvailabilityPanel';
import { TimeZoneService } from '@/utils/timeZoneService';
import { Appointment } from '@/types/appointment';
import { DateTime } from 'luxon';
import { AvailabilityBlock } from '@/types/availability';
import AppointmentDetailsDialog from './AppointmentDetailsDialog';
import { convertAppointmentBlockToAppointment } from '@/utils/appointmentUtils';
import CalendarErrorBoundary from './CalendarErrorBoundary';
import { CalendarDebugUtils } from '@/utils/calendarDebugUtils';
import { useCalendarErrorHandler } from '@/hooks/useCalendarErrorHandler';
import CalendarErrorMessage from './week-view/CalendarErrorMessage';

interface CalendarProps {
  view: 'week' | 'month';
  showAvailability: boolean;
  clinicianId: string | null;
  currentDate: Date;
  userTimeZone: string;
  refreshTrigger: number;
  appointments: Appointment[];
  isLoading: boolean;
  error: any;
}

// Component name for logging
const COMPONENT_NAME = 'CalendarView';

const CalendarView = ({
  view,
  showAvailability,
  clinicianId,
  currentDate,
  userTimeZone,
  refreshTrigger = 0,
  appointments = [],
  isLoading = false,
  error = null
}: CalendarProps) => {
  // Use our custom error handler hook
  const {
    error: calendarViewError,
    handleError,
    attemptRecovery,
    resetErrorState,
    withErrorHandling
  } = useCalendarErrorHandler({
    componentName: COMPONENT_NAME,
    onError: (error) => {
      CalendarDebugUtils.error(COMPONENT_NAME, 'Error in CalendarView component', {
        error,
        view,
        clinicianId,
        userTimeZone,
        appointmentsCount: appointments?.length || 0
      });
    }
  });
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [isAppointmentDialogOpen, setIsAppointmentDialogOpen] = useState(false);
  
  // Ensure we have a valid IANA timezone
  const validTimeZone = TimeZoneService.ensureIANATimeZone(userTimeZone);
  
  // Use a local refresh trigger that combines the external one plus local changes
  const [localRefreshTrigger, setLocalRefreshTrigger] = useState(0);
  
  // Combine both refresh triggers
  const combinedRefreshTrigger = refreshTrigger + localRefreshTrigger;
  
  // Calculate the week days for the WeekView component
  const startOfWeek = new Date(currentDate);
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());

  const days = Array.from({ length: 7 }, (_, i) => {
    const day = new Date(startOfWeek);
    day.setDate(startOfWeek.getDate() + i);
    return day;
  });
  
  // Log appointments data for debugging - CRITICAL FIX: Guard the map call
  useEffect(() => {
    if (Array.isArray(appointments)) {
      CalendarDebugUtils.log(COMPONENT_NAME, 'Raw appointments received', {
        count: appointments.length,
        samples: appointments.slice(0, 3).map(appt => ({
          id: appt.id,
          startAt: appt.start_at,
          clientName: appt.clientName,
          hasClient: !!appt.client,
          clientDetails: appt.client ? 'Has client data' : 'No client data'
        }))
      });
    } else {
      CalendarDebugUtils.error(COMPONENT_NAME, 'Raw appointments received is not an array', {
        appointments
      });
      handleError(new Error('Appointments is not an array'), {
        operation: 'processAppointments',
        data: { appointments }
      });
    }
    
    if (!clinicianId) {
      CalendarDebugUtils.error(COMPONENT_NAME, 'No clinician ID provided to Calendar component');
      handleError(new Error('No clinician ID provided'), {
        operation: 'validateProps'
      });
    }
  }, [appointments, clinicianId, handleError]);
  
  // Enhanced logging for appointments with comprehensive client name information
  useEffect(() => {
    CalendarDebugUtils.log(COMPONENT_NAME, 'Rendering calendar view', {
      view,
      appointmentsCount: Array.isArray(appointments) ? appointments.length : 0,
      clinicianId,
      timezone: validTimeZone,
      refreshTrigger: combinedRefreshTrigger
    });
    
    if (Array.isArray(appointments) && appointments.length > 0) {
      // Sample appointments for inspection
      const sampleSize = Math.min(3, appointments.length);
      CalendarDebugUtils.log(COMPONENT_NAME, `Sample of ${sampleSize} appointments`, {
        samples: appointments.slice(0, sampleSize).map((app, idx) => ({
          id: app.id,
          startAt: app.start_at,
          endAt: app.end_at,
          clientId: app.client_id,
          clinicianId: app.clinician_id,
          clientName: app.clientName,
          hasClientData: !!app.client
        }))
      });
    }
    
    if (error) {
      CalendarDebugUtils.error(COMPONENT_NAME, 'Error detected in props', error);
      handleError(error instanceof Error ? error : new Error(String(error)), {
        operation: 'propsError',
        data: { error }
      });
    }
  }, [appointments, clinicianId, error, view, validTimeZone, combinedRefreshTrigger, handleError]);

  // Handle click on an appointment clicked in calendar
  const handleAppointmentClick = withErrorHandling((appointment: Appointment) => {
    // Enhanced logging to debug appointment data
    CalendarDebugUtils.log(COMPONENT_NAME, 'Appointment clicked', {
      id: appointment.id,
      clientName: appointment.clientName,
      clientId: appointment.client_id,
      hasClient: !!appointment.client,
      startAt: appointment.start_at,
      endAt: appointment.end_at
    });
    
    // Verify we have a complete appointment object before storing it
    if (!appointment.client && appointment.client_id) {
      CalendarDebugUtils.warn(COMPONENT_NAME, 'Appointment is missing client data', {
        appointmentId: appointment.id,
        clientId: appointment.client_id
      });
      
      // Try to find the complete appointment in the appointments array
      const completeAppointment = appointments.find(a => a.id === appointment.id);
      
      if (completeAppointment && completeAppointment.client) {
        CalendarDebugUtils.log(COMPONENT_NAME, 'Found complete appointment with client data', {
          appointmentId: completeAppointment.id
        });
        setSelectedAppointment(completeAppointment);
      } else {
        CalendarDebugUtils.warn(COMPONENT_NAME, 'Could not find complete appointment', {
          appointmentId: appointment.id
        });
        // Convert to a full appointment object
        const fullAppointment = convertAppointmentBlockToAppointment(appointment, appointments);
        CalendarDebugUtils.log(COMPONENT_NAME, 'Using converted appointment', {
          id: fullAppointment.id,
          clientName: fullAppointment.clientName,
          clientId: fullAppointment.client_id,
          hasClient: !!fullAppointment.client,
          start_at: fullAppointment.start_at,
          end_at: fullAppointment.end_at
        });
        setSelectedAppointment(fullAppointment);
      }
    } else {
      // Store the full appointment object
      setSelectedAppointment(appointment);
    }
    
    // Open the dialog
    setIsAppointmentDialogOpen(true);
  }, { operation: 'handleAppointmentClick' });

  // Handle availability block clicked in calendar
  const handleAvailabilityClick = withErrorHandling((date: DateTime | Date, availabilityBlock: AvailabilityBlock) => {
    // Convert Date to DateTime if needed for consistent handling
    const dateTime = date instanceof Date ?
      TimeZoneService.fromJSDate(date, validTimeZone) : date;
      
    CalendarDebugUtils.log(COMPONENT_NAME, `Availability clicked for ${dateTime.toFormat('yyyy-MM-dd')}`, {
      blockId: availabilityBlock.id,
      clinicianId: availabilityBlock.clinician_id,
      startAt: availabilityBlock.start_at,
      endAt: availabilityBlock.end_at,
      isActive: availabilityBlock.is_active
    });
  }, { operation: 'handleAvailabilityClick' });

  // Handler for when availability is updated - triggers refresh of data
  const handleAvailabilityUpdated = withErrorHandling(() => {
    CalendarDebugUtils.log(COMPONENT_NAME, 'Availability updated, triggering calendar refresh');
    setLocalRefreshTrigger(prev => prev + 1);
  }, { operation: 'handleAvailabilityUpdated' });
  
  // Handler for when appointment is updated in the dialog
  const handleAppointmentUpdated = withErrorHandling(() => {
    CalendarDebugUtils.log(COMPONENT_NAME, 'Appointment updated, triggering calendar refresh');
    setLocalRefreshTrigger(prev => prev + 1);
    setIsAppointmentDialogOpen(false);
    setSelectedAppointment(null); // Clear the selected appointment
  }, { operation: 'handleAppointmentUpdated' });
  
  // Handler for when an appointment is updated via drag-and-drop
  const handleAppointmentDragUpdate = withErrorHandling((appointmentId: string, newStartAt: string, newEndAt: string) => {
    CalendarDebugUtils.log(COMPONENT_NAME, 'Appointment updated via drag-and-drop', {
      appointmentId,
      hasStartAt: !!newStartAt,
      hasEndAt: !!newEndAt
    });
    
    // If it's just a refresh trigger with no actual update (used for signaling)
    if (appointmentId === "refresh-trigger" && !newStartAt && !newEndAt) {
      setLocalRefreshTrigger(prev => prev + 1);
      return;
    }
    
    // Otherwise attempt to update the appointment in the database
    if (appointmentId && newStartAt && newEndAt) {
      CalendarDebugUtils.log(COMPONENT_NAME, 'Updating appointment', {
        appointmentId,
        newStartAt,
        newEndAt
      });
      
      // Update the appointment in the database via Supabase
      (async () => {
        try {
          const { supabase } = await import('@/integrations/supabase/client');
          const { error } = await supabase
            .from('appointments')
            .update({
              start_at: newStartAt,
              end_at: newEndAt
            })
            .eq('id', appointmentId);
            
          if (error) {
            throw error;
          }
          
          CalendarDebugUtils.log(COMPONENT_NAME, 'Successfully updated appointment in database');
          setLocalRefreshTrigger(prev => prev + 1);
        } catch (error) {
          const err = error instanceof Error ? error : new Error(String(error));
          CalendarDebugUtils.error(COMPONENT_NAME, 'Error updating appointment', err);
          handleError(err, {
            operation: 'updateAppointment',
            data: { appointmentId, newStartAt, newEndAt }
          });
        }
      })();
    }
  }, { operation: 'handleAppointmentDragUpdate' });

  // If there's an error from the component, show the error message
  if (calendarViewError) {
    return (
      <CalendarErrorMessage
        componentName={COMPONENT_NAME}
        error={calendarViewError}
        message="Calendar View Error"
        details="There was a problem with the calendar view."
        onRetry={() => attemptRecovery()}
        onReset={() => resetErrorState()}
        onShowDetails={() => {
          console.error('CalendarView Error Details:', {
            error: calendarViewError,
            message: calendarViewError.message,
            stack: calendarViewError.stack,
            componentProps: {
              view,
              clinicianId,
              userTimeZone,
              appointmentsCount: appointments?.length || 0
            }
          });
          alert('Error details logged to console');
        }}
        severity="error"
        contextData={{
          view,
          clinicianId,
          userTimeZone,
          appointmentsCount: appointments?.length || 0
        }}
      />
    );
  }

  // If there's an error from the props, show the error message
  if (error) {
    return (
      <CalendarErrorMessage
        componentName={COMPONENT_NAME}
        error={error instanceof Error ? error : new Error(String(error))}
        message="Calendar Data Error"
        details="There was a problem loading the calendar data."
        onRetry={() => {
          // Trigger a refresh
          setLocalRefreshTrigger(prev => prev + 1);
        }}
        severity="error"
        contextData={{
          view,
          clinicianId,
          userTimeZone,
          appointmentsCount: appointments?.length || 0
        }}
      />
    );
  }

  return (
    <CalendarErrorBoundary>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="md:col-span-3">
          {view === 'week' ? (
            <WeekView 
              days={days}
              currentDate={currentDate}
              selectedClinicianId={clinicianId}
              refreshTrigger={combinedRefreshTrigger}
              appointments={appointments}
              onAppointmentClick={handleAppointmentClick}
              onAvailabilityClick={handleAvailabilityClick}
              onAppointmentUpdate={handleAppointmentDragUpdate}
              userTimeZone={validTimeZone}
              isLoading={isLoading}
              error={error}
            />
          ) : (
            <MonthView 
              currentDate={currentDate}
              clinicianId={clinicianId}
              refreshTrigger={combinedRefreshTrigger} // Use combined refresh trigger
              appointments={appointments}
              getClientName={(clientId: string): string => {
                const appointment = appointments.find(app => app.client_id === clientId);
                return appointment?.clientName || 'Unknown Client';
              }}
              onAppointmentClick={handleAppointmentClick}
              onAvailabilityClick={handleAvailabilityClick}
              userTimeZone={validTimeZone}
            />
          )}
        </div>
        
        {showAvailability && (
          <div className="md:col-span-1">
            <ClinicianAvailabilityPanel 
              clinicianId={clinicianId} 
              onAvailabilityUpdated={handleAvailabilityUpdated} // Pass the refresh handler
              userTimeZone={validTimeZone}
            />
          </div>
        )}
        
        {/* Central AppointmentDetailsDialog - the ONLY instance in the application */}
        <AppointmentDetailsDialog
          isOpen={isAppointmentDialogOpen}
          onClose={withErrorHandling(() => {
            CalendarDebugUtils.log(COMPONENT_NAME, 'Closing appointment dialog');
            setIsAppointmentDialogOpen(false);
            setSelectedAppointment(null); // Clear selection when dialog is closed
          }, { operation: 'handleDialogClose' })}
          appointment={selectedAppointment}
          onAppointmentUpdated={handleAppointmentUpdated}
          userTimeZone={validTimeZone}
        />
      </div>
    </CalendarErrorBoundary>
  );
};

export default CalendarView;
