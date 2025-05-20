
import React, { useEffect, useState } from 'react';
import WeekView from './WeekView';
import MonthView from './MonthView';
import ClinicianAvailabilityPanel from './ClinicianAvailabilityPanel';
import { TimeZoneService } from '@/utils/timeZoneService';
import { Appointment } from '@/types/appointment';
import { DateTime } from 'luxon';
import { AvailabilityBlock } from '@/types/availability';
import AppointmentDetailsDialog from './AppointmentDetailsDialog';

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
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null);
  const [isAppointmentDialogOpen, setIsAppointmentDialogOpen] = useState(false);
  
  // Ensure we have a valid IANA timezone
  const validTimeZone = TimeZoneService.ensureIANATimeZone(userTimeZone);
  
  // Use a local refresh trigger that combines the external one plus local changes
  const [localRefreshTrigger, setLocalRefreshTrigger] = useState(0);
  
  // Combine both refresh triggers
  const combinedRefreshTrigger = refreshTrigger + localRefreshTrigger;
  
  // Find the selected appointment from the ID
  const selectedAppointment = selectedAppointmentId 
    ? appointments.find(a => a.id === selectedAppointmentId) 
    : null;
  
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

  // Handler for appointment clicked in calendar
  const handleAppointmentClick = (appointment: Appointment) => {
    console.log(`[CalendarView] Appointment clicked:`, {
      id: appointment.id,
      clientName: appointment.clientName,
      clientId: appointment.client_id,
      startAt: appointment.start_at
    });
    
    // Store the appointment ID and open the dialog
    setSelectedAppointmentId(appointment.id);
    setIsAppointmentDialogOpen(true);
  };

  // Handler for availability block clicked in calendar
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
            currentDate={currentDate}
            selectedClinicianId={clinicianId}
            refreshTrigger={combinedRefreshTrigger} // Use combined refresh trigger
            appointments={appointments}
            onAppointmentClick={handleAppointmentClick}
            onAvailabilityClick={handleAvailabilityClick}
            onAppointmentUpdated={handleAppointmentDragUpdate}
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
