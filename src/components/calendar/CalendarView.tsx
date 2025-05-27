import React, { useEffect, useState } from 'react';
import WeekView from './WeekView';
import MonthView from './MonthView';
import ClinicianAvailabilityPanel from './ClinicianAvailabilityPanel';
import { TimeZoneService } from '@/utils/timeZoneService';
import { Appointment } from '@/types/appointment';
import { DateTime } from 'luxon';
import { AvailabilityBlock } from '@/types/availability';
import AppointmentDetailsDialog from './AppointmentDetailsDialog';
import { convertAppointmentBlockToAppointment } from '@/utils/appointmentUtils';
import CalendarErrorBoundary from './CalendarErrorBoundary';

interface CalendarProps {
  view: 'week' | 'month';
  showAvailability: boolean;
  clinicianId: string | null;
  currentDate: Date;
  userTimeZone: string;
  clinicianTimeZone: string;
  refreshTrigger: number;
  appointments: Appointment[];
  isLoading: boolean;
  error: any;
}

const CalendarView = ({ 
  view, 
  showAvailability, 
  clinicianId, 
  currentDate, 
  userTimeZone,
  clinicianTimeZone,
  refreshTrigger = 0,
  appointments = [],
  isLoading = false,
  error = null
}: CalendarProps) => {
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [isAppointmentDialogOpen, setIsAppointmentDialogOpen] = useState(false);
  
  console.log('[CalendarView] STEP 1 FIX - Rendering with proper timezone parameters:', {
    view,
    clinicianId,
    appointmentsCount: appointments?.length || 0,
    userTimeZone,
    clinicianTimeZone,
    isLoading,
    hasError: !!error
  });
  
  // Ensure we have valid IANA timezones
  const validUserTimeZone = TimeZoneService.ensureIANATimeZone(userTimeZone);
  const validClinicianTimeZone = TimeZoneService.ensureIANATimeZone(clinicianTimeZone);
  
  // STEP 4: Add comprehensive logging for raw data
  console.log('[CalendarView] STEP 4 - Raw data logging:', {
    rawAppointments: appointments,
    appointmentsCount: appointments?.length || 0,
    appointmentsEmpty: !appointments || appointments.length === 0,
    sampleRawAppointment: appointments?.[0] ? {
      id: appointments[0].id,
      start_at: appointments[0].start_at,
      end_at: appointments[0].end_at,
      appointment_timezone: appointments[0].appointment_timezone,
      clientName: appointments[0].clientName
    } : null
  });
  
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
  
  // STEP 4: Log timezone parameters for validation
  console.log('[CalendarView] STEP 4 - Timezone parameters validation:', {
    userTimeZone,
    clinicianTimeZone,
    validUserTimeZone,
    validClinicianTimeZone,
    userTzValid: TimeZoneService.isValidTimeZone(userTimeZone),
    clinicianTzValid: TimeZoneService.isValidTimeZone(clinicianTimeZone)
  });
  
  if (!clinicianId) {
    console.error('No clinician ID provided to Calendar component');
  }

  // Handle click on an appointment clicked in calendar
  const handleAppointmentClick = (appointment: Appointment) => {
    console.log(`[CalendarView] Appointment clicked:`, {
      id: appointment.id,
      clientName: appointment.clientName,
      clientId: appointment.client_id,
      hasClient: !!appointment.client,
      startAt: appointment.start_at,
      endAt: appointment.end_at
    });
    
    if (!appointment.client && appointment.client_id) {
      const completeAppointment = appointments.find(a => a.id === appointment.id);
      
      if (completeAppointment && completeAppointment.client) {
        setSelectedAppointment(completeAppointment);
      } else {
        const fullAppointment = convertAppointmentBlockToAppointment(appointment, appointments);
        setSelectedAppointment(fullAppointment);
      }
    } else {
      setSelectedAppointment(appointment);
    }
    
    setIsAppointmentDialogOpen(true);
  };

  // Handle availability block clicked in calendar
  const handleAvailabilityClick = (date: DateTime | Date, availabilityBlock: AvailabilityBlock) => {
    const dateTime = date instanceof Date ? 
      TimeZoneService.fromJSDate(date, validUserTimeZone) : date;
      
    console.log(`[CalendarView] Availability clicked for ${dateTime.toFormat('yyyy-MM-dd')} - Block:`, availabilityBlock);
  };

  // Handler for when availability is updated
  const handleAvailabilityUpdated = () => {
    console.log('[CalendarView] Availability updated, triggering calendar refresh...');
    setLocalRefreshTrigger(prev => prev + 1);
  };
  
  // Handler for when appointment is updated in the dialog
  const handleAppointmentUpdated = () => {
    console.log('[CalendarView] Appointment updated, triggering calendar refresh...');
    setLocalRefreshTrigger(prev => prev + 1);
    setIsAppointmentDialogOpen(false);
    setSelectedAppointment(null);
  };
  
  // Handler for when an appointment is updated via drag-and-drop
  const handleAppointmentDragUpdate = (appointmentId: string, newStartAt: string, newEndAt: string) => {
    console.log('[CalendarView] Appointment updated via drag-and-drop, triggering calendar refresh...');
    
    if (appointmentId === "refresh-trigger" && !newStartAt && !newEndAt) {
      setLocalRefreshTrigger(prev => prev + 1);
      return;
    }
    
    if (appointmentId && newStartAt && newEndAt) {
      console.log('[CalendarView] Updating appointment:', {
        appointmentId,
        newStartAt,
        newEndAt
      });
      
      (async () => {
        try {
          const { supabase } = await import('@/integrations/supabase/client');
          
          // STEP 5: Implement timezone conversion flow for appointment updates
          // When updating appointment, ensure appointment_timezone is preserved
          const { error } = await supabase
            .from('appointments')
            .update({
              start_at: newStartAt,
              end_at: newEndAt
              // appointment_timezone should remain unchanged during drag-and-drop
            })
            .eq('id', appointmentId);
            
          if (error) {
            throw error;
          }
          
          console.log('[CalendarView] Successfully updated appointment in database');
          setLocalRefreshTrigger(prev => prev + 1);
        } catch (error) {
          console.error('[CalendarView] Error updating appointment:', error);
        }
      })();
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p>Loading calendar...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center text-red-600">
          <p>Error loading calendar: {error?.message || 'Unknown error'}</p>
        </div>
      </div>
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
              onAppointmentClick={setSelectedAppointment}
              onAvailabilityClick={handleAvailabilityClick}
              onAppointmentUpdate={handleAppointmentDragUpdate}
              userTimeZone={validUserTimeZone}
              clinicianTimeZone={validClinicianTimeZone}
              isLoading={isLoading}
              error={error}
            />
          ) : (
            <MonthView 
              currentDate={currentDate}
              clinicianId={clinicianId}
              refreshTrigger={combinedRefreshTrigger}
              appointments={appointments}
              getClientName={(clientId: string): string => {
                const appointment = appointments.find(app => app.client_id === clientId);
                return appointment?.clientName || 'Unknown Client';
              }}
              onAppointmentClick={setSelectedAppointment}
              onAvailabilityClick={handleAvailabilityClick}
              userTimeZone={validUserTimeZone}
            />
          )}
        </div>
        
        {showAvailability && (
          <div className="md:col-span-1">
            <ClinicianAvailabilityPanel 
              clinicianId={clinicianId} 
              onAvailabilityUpdated={handleAvailabilityUpdated}
              userTimeZone={validUserTimeZone}
            />
          </div>
        )}
        
        <AppointmentDetailsDialog
          isOpen={isAppointmentDialogOpen}
          onClose={() => {
            console.log('[CalendarView] Closing appointment dialog');
            setIsAppointmentDialogOpen(false);
            setSelectedAppointment(null);
          }}
          appointment={selectedAppointment}
          onAppointmentUpdated={handleAppointmentUpdated}
          userTimeZone={validUserTimeZone}
        />
      </div>
    </CalendarErrorBoundary>
  );
};

export default CalendarView;
