
import React, { useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { useMonthViewData, DayAvailabilityData } from '@/hooks/useMonthViewData';
import CalendarGrid from './CalendarGrid';
import { Appointment } from '@/types/appointment';
import { AvailabilityBlock } from '@/types/availability';
import { DateTime } from 'luxon';
import { TimeZoneService } from '@/utils/timeZoneService';

interface MonthViewProps {
  currentDate: Date;
  clinicianId: string | null;
  refreshTrigger?: number;
  appointments?: Appointment[];
  getClientName?: (clientId: string) => string;
  onAppointmentClick?: (appointment: Appointment) => void;
  onAvailabilityClick?: (date: DateTime, availabilityBlock: AvailabilityBlock) => void;
  userTimeZone?: string;
}

const MonthView: React.FC<MonthViewProps> = ({ 
  currentDate, 
  clinicianId, 
  refreshTrigger = 0,
  appointments = [],
  getClientName = () => 'Unknown Client',
  onAppointmentClick,
  onAvailabilityClick,
  userTimeZone = 'America/Chicago'
}) => {
  // Helper function for logging appointments with timezone info
  const formatAppointmentForLogging = (app: Appointment) => {
    const startLocalDateTime = app.start_at ? 
      TimeZoneService.fromUTC(app.start_at, userTimeZone) : null;
    const endLocalDateTime = app.end_at ? 
      TimeZoneService.fromUTC(app.end_at, userTimeZone) : null;
      
    return {
      id: app.id,
      startAt: app.start_at,
      endAt: app.end_at,
      formattedDate: startLocalDateTime ? 
        TimeZoneService.formatDate(startLocalDateTime) : 'Invalid date',
      formattedStartTime: startLocalDateTime ? 
        TimeZoneService.formatTime(startLocalDateTime) : 'Invalid time',
      formattedEndTime: endLocalDateTime ? 
        TimeZoneService.formatTime(endLocalDateTime) : 'Invalid time',
      clientName: app.clientName,
      clientInfo: app.client ? {
        preferredName: app.client.client_preferred_name,
        firstName: app.client.client_first_name,
        lastName: app.client.client_last_name
      } : null,
      timeZone: userTimeZone
    };
  };

  // Enhanced debugging for appointments
  useEffect(() => {
    console.log(`[MonthView] Rendering with ${appointments.length} appointments for clinician ${clinicianId}`, {
      timeZone: userTimeZone,
      currentDate: currentDate.toISOString(),
      currentDateLuxon: TimeZoneService.fromJSDate(currentDate, userTimeZone).toISO()
    });
    
    if (appointments && appointments.length > 0) {
      console.log('[MonthView] All appointments:', appointments.map(app => ({
        id: app.id,
        start_at: app.start_at,
        dateFormatted: app.start_at ? 
          TimeZoneService.fromUTC(app.start_at, userTimeZone).toFormat('yyyy-MM-dd') : 'Invalid',
        clientName: app.clientName
      })));
      
      // Log the first few appointments for debugging
      const samplesToLog = Math.min(appointments.length, 5);
      for (let i = 0; i < samplesToLog; i++) {
        const app = appointments[i];
        console.log(`[MonthView] Sample appointment ${i+1}/${samplesToLog}:`, formatAppointmentForLogging(app));
      }
    }
  }, [appointments, clinicianId, userTimeZone, currentDate]);

  const {
    loading,
    monthStart,
    days,
    dayAvailabilityMap,
    dayAppointmentsMap,
    availabilityByDay
  } = useMonthViewData(currentDate, clinicianId, refreshTrigger, appointments, userTimeZone);

  // Additional debug - check if appointments are being processed correctly
  useEffect(() => {
    const appointmentCount = Array.from(dayAppointmentsMap.values())
      .reduce((sum, dayApps) => sum + dayApps.length, 0);
    
    console.log(`[MonthView] Total appointments mapped in month view: ${appointmentCount}`, {
      totalInputAppointments: appointments.length,
      mappedAppointments: appointmentCount,
      timeZone: userTimeZone
    });
    
    // If there are appointments but none are being displayed, this is an issue
    if (appointments.length > 0 && appointmentCount === 0) {
      console.error('[MonthView] CRITICAL: Appointments exist but none are mapped to calendar days');
      console.log('[MonthView] This could be due to date format mismatches. Check:');
      console.log('1. Format of dates vs. the keys in dayAppointmentsMap');
      console.log('2. Timezone conversions affecting date comparisons');
      
      // Print sample of dayAppointmentsMap keys
      const mapKeys = Array.from(dayAppointmentsMap.keys()).slice(0, 5);
      console.log('[MonthView] Sample days in calendar:', mapKeys);
      
      // Print sample of appointment dates
      const appDates = appointments.slice(0, 5).map(a => {
        const localDate = a.start_at ? 
          TimeZoneService.fromUTC(a.start_at, userTimeZone) : null;
        return {
          startAt: a.start_at,
          localStartInTimeZone: localDate ? 
            localDate.toFormat('yyyy-MM-dd') : 'N/A',
          id: a.id,
          clientName: a.clientName
        };
      });
      console.log('[MonthView] Sample appointment dates:', appDates);
      
      // Additional debug - check all appointment dates against all calendar days
      console.log('[MonthView] Checking all appointments against all calendar days:');
      appointments.slice(0, 3).forEach((app, i) => {
        if (!app.start_at) return;
        
        const appDate = TimeZoneService.fromUTC(app.start_at, userTimeZone);
        const appDateStr = appDate.toFormat('yyyy-MM-dd');
        
        console.log(`[MonthView] Appointment ${i+1} (${app.id}): ${appDateStr}`);
        
        // Check this appointment against every day in the calendar
        const matches = Array.from(dayAppointmentsMap.keys())
          .filter(dayKey => {
            // Try both direct comparison and Luxon's hasSame
            const dayDateTime = DateTime.fromFormat(dayKey, 'yyyy-MM-dd', {zone: userTimeZone});
            const directMatch = dayKey === appDateStr;
            const luxonMatch = appDate.hasSame(dayDateTime, 'day');
            
            if (directMatch !== luxonMatch) {
              console.log(`[MonthView] Inconsistency for ${appDateStr} vs ${dayKey}: string=${directMatch}, luxon=${luxonMatch}`);
            }
            
            return directMatch || luxonMatch;
          });
        
        if (matches.length > 0) {
          console.log(`[MonthView] ✓ Found matches for appointment ${app.id}: ${matches.join(', ')}`);
        } else {
          console.log(`[MonthView] ✗ No matches found for appointment ${app.id} with date ${appDateStr}`);
          console.log('Calendar days:', Array.from(dayAppointmentsMap.keys()).slice(0, 10));
        }
      });
    }
    
    // Log matched appointments by day
    Array.from(dayAppointmentsMap.entries())
      .filter(([_, appts]) => appts.length > 0)
      .slice(0, 3) // Limit to first 3 days with appointments
      .forEach(([day, appts]) => {
        console.log(`[MonthView] Day ${day} has ${appts.length} appointments:`, 
          appts.map(a => ({ id: a.id, client: a.clientName }))
        );
      });
    
  }, [dayAppointmentsMap, appointments, userTimeZone]);

  if (loading) {
    return (
      <Card className="p-4 flex justify-center items-center h-[300px]">
        <Loader2 className="h-6 w-6 animate-spin text-valorwell-500 mr-2" />
        <span>Loading calendar...</span>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <CalendarGrid
        days={days}
        monthStart={monthStart}
        dayAvailabilityMap={dayAvailabilityMap}
        dayAppointmentsMap={dayAppointmentsMap}
        availabilityByDay={availabilityByDay}
        getClientName={getClientName}
        onAppointmentClick={onAppointmentClick}
        onAvailabilityClick={onAvailabilityClick}
        userTimeZone={userTimeZone}
      />
    </Card>
  );
};

export default MonthView;
