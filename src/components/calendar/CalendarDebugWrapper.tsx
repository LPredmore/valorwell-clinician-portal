
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import WeekViewDebug from './week-view/WeekViewDebug';
import { Appointment } from '@/types/appointment';
import { DebugUtils } from '@/utils/debugUtils';
import { AppointmentDebugUtils } from '@/utils/appointmentDebugUtils';
import { TimeZoneService } from '@/utils/timeZoneService';
import { DateTime } from 'luxon';

// Debug context name for this component
const DEBUG_CONTEXT = 'CalendarDebugWrapper';

interface CalendarDebugWrapperProps {
  clinicianId: string | null;
  initialAppointments?: Appointment[];
  clinicianTimeZone: string;
}

/**
 * Debug wrapper component for calendar components
 * Provides controls for testing different scenarios and visualizing debug information
 */
export const CalendarDebugWrapper: React.FC<CalendarDebugWrapperProps> = ({
  clinicianId,
  initialAppointments = [],
  clinicianTimeZone
}) => {
  // State for controlling the calendar view
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [appointments, setAppointments] = useState<Appointment[]>(initialAppointments);
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);
  const [selectedTimezone, setSelectedTimezone] = useState<string>(clinicianTimeZone);
  const [debugMode, setDebugMode] = useState<boolean>(true);
  const [consoleCleared, setConsoleCleared] = useState<boolean>(false);
  
  // State for test appointment creation
  const [testDate, setTestDate] = useState<string>(DateTime.now().toFormat('yyyy-MM-dd'));
  const [testTime, setTestTime] = useState<string>(DateTime.now().toFormat('HH:mm'));
  const [testDuration, setTestDuration] = useState<number>(60);
  
  // Log component initialization
  useEffect(() => {
    DebugUtils.log(DEBUG_CONTEXT, 'Component initialized', {
      clinicianId,
      initialAppointmentsCount: initialAppointments.length,
      clinicianTimeZone
    });
    
    // Clear console on first render if debug mode is enabled
    if (debugMode && !consoleCleared) {
      console.clear();
      console.log('🔍 CALENDAR DEBUG MODE ACTIVATED');
      console.log('═════════════════════════════════════════════════════');
      setConsoleCleared(true);
    }
  }, [clinicianId, initialAppointments, clinicianTimeZone, debugMode, consoleCleared]);
  
  // Handle date change
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = new Date(e.target.value);
    if (!isNaN(newDate.getTime())) {
      DebugUtils.log(DEBUG_CONTEXT, 'Date changed', {
        newDate: newDate.toISOString()
      });
      setCurrentDate(newDate);
    }
  };
  
  // Handle timezone change
  const handleTimezoneChange = (value: string) => {
    DebugUtils.log(DEBUG_CONTEXT, 'Timezone changed', {
      oldTimezone: selectedTimezone,
      newTimezone: value
    });
    setSelectedTimezone(value);
  };
  
  // Handle refresh
  const handleRefresh = () => {
    DebugUtils.log(DEBUG_CONTEXT, 'Manual refresh triggered');
    setRefreshTrigger(prev => prev + 1);
  };
  
  // Handle appointment click
  const handleAppointmentClick = (appointment: Appointment) => {
    DebugUtils.log(DEBUG_CONTEXT, 'Appointment clicked', {
      appointmentId: appointment.id,
      clientName: appointment.clientName || appointment.client_id
    });
    
    // Analyze the appointment
    AppointmentDebugUtils.analyzeAppointment(appointment, selectedTimezone);
  };
  
  // Handle availability click
  const handleAvailabilityClick = (date: DateTime, availabilityBlock: any) => {
    DebugUtils.log(DEBUG_CONTEXT, 'Availability clicked', {
      date: date.toISO(),
      blockId: availabilityBlock.id
    });
  };
  
  // Generate a test appointment
  const handleGenerateTestAppointment = () => {
    DebugUtils.log(DEBUG_CONTEXT, 'Generating test appointment', {
      date: testDate,
      time: testTime,
      duration: testDuration,
      timezone: selectedTimezone
    });
    
    const testAppointment = AppointmentDebugUtils.generateTestAppointment(
      testDate,
      testTime,
      testDuration,
      selectedTimezone
    );
    
    setAppointments(prev => [...prev, testAppointment]);
  };
  
  // Clear all test appointments
  const handleClearTestAppointments = () => {
    DebugUtils.log(DEBUG_CONTEXT, 'Clearing test appointments');
    setAppointments(initialAppointments);
  };
  
  // Test timezone conversion
  const handleTestTimezoneConversion = () => {
    DebugUtils.log(DEBUG_CONTEXT, 'Testing timezone conversion', {
      date: testDate,
      time: testTime,
      fromTimezone: selectedTimezone,
      toTimezone: 'UTC'
    });
    
    AppointmentDebugUtils.testTimezoneConversion(
      testDate,
      testTime,
      selectedTimezone,
      'UTC'
    );
  };
  
  // Toggle debug mode
  const handleToggleDebugMode = () => {
    const newMode = !debugMode;
    DebugUtils.log(DEBUG_CONTEXT, `Debug mode ${newMode ? 'enabled' : 'disabled'}`);
    setDebugMode(newMode);
    DebugUtils.VERBOSE = newMode;
  };
  
  // Get client name (simple implementation for demo)
  const getClientName = (clientId: string): string => {
    return `Client ${clientId.substring(0, 8)}`;
  };
  
  // Available timezones for testing
  const timezones = [
    'America/Chicago',
    'America/New_York',
    'America/Los_Angeles',
    'America/Denver',
    'Europe/London',
    'Europe/Paris',
    'Asia/Tokyo',
    'Australia/Sydney',
    'Pacific/Auckland'
  ];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex justify-between items-center">
            <span>Calendar Debug Tools</span>
            <Button 
              variant={debugMode ? "default" : "outline"} 
              onClick={() => {
                const newMode = !debugMode;
                DebugUtils.log(DEBUG_CONTEXT, `Debug mode ${newMode ? 'enabled' : 'disabled'}`);
                setDebugMode(newMode);
                DebugUtils.VERBOSE = newMode;
              }}
            >
              {debugMode ? "Debug Mode ON" : "Debug Mode OFF"}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="controls">
            <TabsList className="mb-4">
              <TabsTrigger value="controls">Controls</TabsTrigger>
              <TabsTrigger value="test-data">Test Data</TabsTrigger>
              <TabsTrigger value="timezone">Timezone Tools</TabsTrigger>
            </TabsList>
            
            <TabsContent value="controls" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date-input">Current Date</Label>
                  <Input
                    id="date-input"
                    type="date"
                    value={DateTime.fromJSDate(currentDate).toFormat('yyyy-MM-dd')}
                    onChange={handleDateChange}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="timezone-select">Timezone</Label>
                  <Select value={selectedTimezone} onValueChange={handleTimezoneChange}>
                    <SelectTrigger id="timezone-select">
                      <SelectValue placeholder="Select timezone" />
                    </SelectTrigger>
                    <SelectContent>
                      {timezones.map(tz => (
                        <SelectItem key={tz} value={tz}>
                          {tz} ({DateTime.now().setZone(tz).toFormat('Z')})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="flex justify-between items-center">
                <div>
                  <span className="text-sm text-gray-500">
                    Appointments: {appointments.length} | 
                    Clinician: {clinicianId || 'None'} | 
                    Refresh Count: {refreshTrigger}
                  </span>
                </div>
                <Button onClick={() => {
                  DebugUtils.log(DEBUG_CONTEXT, 'Manual refresh triggered');
                  setRefreshTrigger(prev => prev + 1);
                }}>Refresh Calendar</Button>
              </div>
            </TabsContent>
            
            <TabsContent value="test-data" className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="test-date">Test Date</Label>
                  <Input
                    id="test-date"
                    type="date"
                    value={testDate}
                    onChange={(e) => setTestDate(e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="test-time">Test Time</Label>
                  <Input
                    id="test-time"
                    type="time"
                    value={testTime}
                    onChange={(e) => setTestTime(e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="test-duration">Duration (minutes)</Label>
                  <Input
                    id="test-duration"
                    type="number"
                    min="15"
                    step="15"
                    value={testDuration}
                    onChange={(e) => setTestDuration(parseInt(e.target.value))}
                  />
                </div>
              </div>
              
              <div className="flex justify-between">
                <Button onClick={handleGenerateTestAppointment}>
                  Generate Test Appointment
                </Button>
                <Button variant="outline" onClick={handleClearTestAppointments}>
                  Clear Test Appointments
                </Button>
              </div>
            </TabsContent>
            
            <TabsContent value="timezone" className="space-y-4">
              <div className="p-4 bg-gray-100 rounded-md">
                <h3 className="font-medium mb-2">Current Timezone Info</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>Timezone:</div>
                  <div>{selectedTimezone}</div>
                  
                  <div>Current Time:</div>
                  <div>{DateTime.now().setZone(selectedTimezone).toFormat('yyyy-MM-dd HH:mm:ss')}</div>
                  
                  <div>UTC Offset:</div>
                  <div>{DateTime.now().setZone(selectedTimezone).toFormat('Z')}</div>
                  
                  <div>DST Active:</div>
                  <div>{DateTime.now().setZone(selectedTimezone).isInDST ? 'Yes' : 'No'}</div>
                </div>
              </div>
              
              <Button onClick={handleTestTimezoneConversion}>
                Test Timezone Conversion
              </Button>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Calendar View</CardTitle>
        </CardHeader>
        <CardContent>
          <WeekViewDebug
            currentDate={currentDate}
            clinicianId={clinicianId}
            refreshTrigger={refreshTrigger}
            appointments={appointments}
            getClientName={getClientName}
            onAppointmentClick={handleAppointmentClick}
            onAvailabilityClick={handleAvailabilityClick}
            clinicianTimeZone={selectedTimezone}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default CalendarDebugWrapper;
