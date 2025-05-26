import React, { useState, useEffect } from 'react';
import CalendarDebugWrapper from '@/components/calendar/CalendarDebugWrapper';
import { Appointment } from '@/types/appointment';
import { DebugUtils } from '@/utils/debugUtils';
import { AppointmentDebugUtils } from '@/utils/appointmentDebugUtils';
import { DateTime } from 'luxon';

// Debug context name for this component
const DEBUG_CONTEXT = 'CalendarDebugPage';

/**
 * Debug page for calendar components
 * This page demonstrates the calendar debugging tools
 */
const CalendarDebugPage: React.FC = () => {
  const [clinicianId, setClinicianId] = useState<string | null>('test-clinician-123');
  const [sampleAppointments, setSampleAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  
  // Generate sample appointments for testing
  useEffect(() => {
    DebugUtils.log(DEBUG_CONTEXT, 'Initializing debug page');
    setLoading(true);
    
    // Generate sample appointments
    const generateSampleAppointments = () => {
      DebugUtils.log(DEBUG_CONTEXT, 'Generating sample appointments');
      
      const now = DateTime.now();
      const userTimeZone = 'America/Chicago';
      const appointments: Appointment[] = [];
      
      // Create appointments for the current week
      for (let i = 0; i < 5; i++) {
        // Create appointment for each day of the week (Mon-Fri)
        const appointmentDate = now.startOf('week').plus({ days: i + 1 });
        
        // Morning appointment (9 AM)
        const morningAppointment = AppointmentDebugUtils.generateTestAppointment(
          appointmentDate.toFormat('yyyy-MM-dd'),
          '09:00',
          60,
          userTimeZone
        );
        morningAppointment.clientName = `Morning Client ${i + 1}`;
        appointments.push(morningAppointment);
        
        // Afternoon appointment (2 PM)
        const afternoonAppointment = AppointmentDebugUtils.generateTestAppointment(
          appointmentDate.toFormat('yyyy-MM-dd'),
          '14:00',
          60,
          userTimeZone
        );
        afternoonAppointment.clientName = `Afternoon Client ${i + 1}`;
        appointments.push(afternoonAppointment);
      }
      
      // Create a problematic appointment that crosses midnight
      const problematicDate = now.startOf('week').plus({ days: 3 });
      const problematicAppointment = AppointmentDebugUtils.generateTestAppointment(
        problematicDate.toFormat('yyyy-MM-dd'),
        '23:30',
        60,
        userTimeZone
      );
      problematicAppointment.clientName = 'Midnight Crossing Client';
      appointments.push(problematicAppointment);
      
      // Create an appointment with timezone issues (near DST transition)
      // March 10, 2024 was a DST transition date in the US
      const dstTransitionDate = DateTime.fromObject(
        { year: 2024, month: 3, day: 10 },
        { zone: userTimeZone }
      );
      
      const dstAppointment = AppointmentDebugUtils.generateTestAppointment(
        dstTransitionDate.toFormat('yyyy-MM-dd'),
        '01:30',
        60,
        userTimeZone
      );
      dstAppointment.clientName = 'DST Transition Client';
      appointments.push(dstAppointment);
      
      DebugUtils.log(DEBUG_CONTEXT, 'Sample appointments generated', {
        count: appointments.length
      });
      
      return appointments;
    };
    
    // Set sample appointments
    const appointments = generateSampleAppointments();
    setSampleAppointments(appointments);
    setLoading(false);
    
    DebugUtils.log(DEBUG_CONTEXT, 'Debug page initialized');
  }, []);
  
  if (loading) {
    return <div className="p-8 text-center">Loading debug tools...</div>;
  }
  
  return (
    <div className="container mx-auto p-4 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Calendar Debugging Tools</h1>
        <p className="text-gray-600">
          This page provides tools for debugging calendar appointment display issues.
          Open the browser console to view detailed logs.
        </p>
      </div>
      
      <CalendarDebugWrapper
        clinicianId={clinicianId}
        initialAppointments={sampleAppointments}
        userTimeZone="America/Chicago"
      />
      
      <div className="mt-8 p-4 bg-gray-100 rounded-md">
        <h2 className="text-lg font-semibold mb-2">Debugging Instructions</h2>
        <ol className="list-decimal pl-5 space-y-2">
          <li>Open the browser console to view detailed logs</li>
          <li>Use the controls to change dates, timezones, and generate test appointments</li>
          <li>Click on appointments to analyze their timezone conversions</li>
          <li>Use the timezone tools to test specific date/time conversions</li>
          <li>Toggle debug mode on/off to control the verbosity of logs</li>
        </ol>
      </div>
    </div>
  );
};

export default CalendarDebugPage;