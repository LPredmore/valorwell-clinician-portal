
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
  if (Array.isArray(appointments)) {
    console.log('[CalendarView] Raw appointments received:', appointments.map(appt => ({
      id: appt.id,
      startAt: appt.start_at,
      clientName: appt.clientName,
      hasClient: !!appt.client,
      clientDetails: appt.client || 'No client data'
    })));
  } else {
    console.log('[CalendarView] Raw appointments received: (appointments is not an array or is undefined)', appointments);
  }
  
  if (!clinicianId) {
    console.error('No clinician ID provided to Calendar component');
  }
  
  // Enhanced logging for appointments with comprehensive client name information
  useEffect(() => {
    console.log(`[CalendarView] Rendering with ${Array.isArray(appointments) ? appointments.length : 0} appointments for clinician ${clinicianId}`);
    console.log(`[CalendarView] Calendar view: ${view}, timezone: ${validTimeZone}, refreshTrigger: ${combinedRefreshTrigger}`);
    
    if (Array.isArray(appointments) && appointments.length > 0) {
      // Sample appointments for inspection
      const sampleSize = Math.min(3, appointments.length);
      console.log(`[CalendarView] Sample of ${sampleSize} appointments:`);
      appointments.slice(0, sampleSize).forEach((app, idx) => {
        console.log(`[CalendarView] Sample appointment ${idx+1}/${sampleSize}:`, {
          id: app.id,
          startAt: app.start_at,
          endAt: app.end_at,
          clientId: app.client_id,
          clinicianId: app.clinician_id,
          clientName: app.clientName,
          clientInfo: app.client ? {
            preferredName: app.client.client_preferred_name,
            firstName: app.client.client_first_name,
            lastName: app.client.client_last_name
          } : 'No client data'
        });
      });
    }
    
    if (error) {
      console.error('[CalendarView] Error detected:', error);
    }
  }, [appointments, clinicianId, error, view, validTimeZone, combinedRefreshTrigger]);

  // Handle click on an appointment clicked in calendar
  const handleAppointmentClick = (appointment: Appointment) => {
    // Enhanced logging to debug appointment data
    console.log(`[CalendarView] Appointment clicked:`, {
      id: appointment.id,
      clientName: appointment.clientName,
      clientId: appointment.client_id,
      hasClient: !!appointment.client,
      clientDetails: appointment.client ? {
        firstName: appointment.client.client_first_name,
        lastName: appointment.client.client_last_name,
        preferredName: appointment.client.client_preferred_name
      } : 'No client data',
      startAt: appointment.start_at,
      endAt: appointment.end_at
    });
    
    // Verify we have a complete appointment object before storing it
    if (!appointment.client && appointment.client_id) {
      console.warn(`[CalendarView] Appointment is missing client data. Attempting to find complete appointment.`);
      
      // Try to find the complete appointment in the appointments array
      const completeAppointment = appointments.find(a => a.id === appointment.id);
      
      if (completeAppointment && completeAppointment.client) {
        console.log(`[CalendarView] Found complete appointment with client data.`);
        setSelectedAppointment(completeAppointment);
      } else {
        console.warn(`[CalendarView] Could not find complete appointment. Converting to full appointment.`);
        // Convert to a full appointment object
        const fullAppointment = convertAppointmentBlockToAppointment(appointment, appointments);
        console.log(`[CalendarView] Using converted appointment:`, {
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
  };

  // Handle availability block clicked in calendar
  const handleAvailabilityClick = (date: DateTime | Date, availabilityBlock: AvailabilityBlock) => {
    // Convert Date to DateTime if needed for consistent handling
    const dateTime = date instanceof Date ? 
      TimeZoneService.fromJSDate(date, validTimeZone) : date;
      
    console.log(`[CalendarView] Availability clicked for ${dateTime.toFormat('yyyy-MM-dd')} - Block:`, availabilityBlock);
  };

  // Handler for when availability is updated - triggers refresh of data
  const handleAvailabilityUpdated = () => {
    console.log('[CalendarView] Availability updated, triggering calendar refresh...');
    setLocalRefreshTrigger(prev => prev + 1);
  };
  
  // Handler for when appointment is updated in the dialog
  const handleAppointmentUpdated = () => {
    console.log('[CalendarView] Appointment updated, triggering calendar refresh...');
    setLocalRefreshTrigger(prev => prev + 1);
    setIsAppointmentDialogOpen(false);
  };
  
  // Handler for when an appointment is updated via drag-and-drop
  const handleAppointmentDragUpdate = () => {
    console.log('[CalendarView] Appointment updated via drag-and-drop, triggering calendar refresh...');
    setLocalRefreshTrigger(prev => prev + 1);
  };

  return (
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
      
      {/* Appointment Details Dialog - using only userTimeZone now */}
      <AppointmentDetailsDialog
        isOpen={isAppointmentDialogOpen}
        onClose={() => setIsAppointmentDialogOpen(false)}
        appointment={selectedAppointment}
        onAppointmentUpdated={handleAppointmentUpdated}
        userTimeZone={validTimeZone}
      />
    </div>
  );
};

export default CalendarView;
