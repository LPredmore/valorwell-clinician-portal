import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/layout/Layout";
import { useUser } from "@/context/UserContext";
import { useToast } from "@/hooks/use-toast";
import CalendarErrorBoundary from "../components/calendar/CalendarErrorBoundary";
import WeeklyCalendarGrid from "../components/calendar/WeeklyCalendarGrid";
import AvailabilityManagementSidebar from "../components/calendar/AvailabilityManagementSidebar";
import AppointmentDialog from "../components/calendar/AppointmentDialog";
import NylasHybridCalendar from "../components/calendar/NylasHybridCalendar";
import CalendarConnectionsPanel from "../components/calendar/CalendarConnectionsPanel";
import NylasConnectionTest from "../components/calendar/NylasConnectionTest";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Plus, Calendar, Settings } from "lucide-react";
import { addWeeks, subWeeks, startOfWeek, endOfWeek } from "date-fns";
import { TimeZoneService } from "@/utils/timeZoneService";
import { getClinicianTimeZone } from "@/hooks/useClinicianData";
import { DateTime } from "luxon";
import { useAppointments } from "@/hooks/useAppointments";
import { useNylasEvents } from "@/hooks/useNylasEvents";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

const CalendarSimple = React.memo(() => {
  const { userId, authInitialized, userRole } = useUser();
  const [isReady, setIsReady] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [userTimeZone, setUserTimeZone] = useState<string>(TimeZoneService.DEFAULT_TIMEZONE);
  const [isMounted, setIsMounted] = useState(true);
  const [showAppointmentDialog, setShowAppointmentDialog] = useState(false);
  const [selectedDateTime, setSelectedDateTime] = useState<{
    date?: DateTime;
    startTime?: DateTime;
    endTime?: DateTime;
  }>({});
  const [calendarView, setCalendarView] = useState<'internal' | 'hybrid' | 'debug'>('internal');
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Circuit breakers
  const authCheckCountRef = useRef(0);
  const timezoneLoadCountRef = useRef(0);
  const accessDeniedRef = useRef(false);

  // Calculate week range using UTC for consistency
  const { weekStart, weekEnd } = useMemo(() => {
    const current = DateTime.fromJSDate(currentDate, { zone: 'utc' });
    const weekStartUTC = current.startOf('week');
    const weekEndUTC = current.endOf('week');
    
    console.log('[CalendarSimple] Week boundaries calculated in UTC:', {
      currentDate: currentDate.toISOString(),
      weekStart: weekStartUTC.toJSDate().toISOString(),
      weekEnd: weekEndUTC.toJSDate().toISOString(),
      calculatedInUTC: true
    });
    
    return {
      weekStart: weekStartUTC.toJSDate(),
      weekEnd: weekEndUTC.toJSDate()
    };
  }, [currentDate]);

  // Fetch internal appointments
  const { appointments, isLoading: appointmentsLoading } = useAppointments(
    userId,
    weekStart,
    weekEnd,
    userTimeZone,
    0
  );

  // Fetch external calendar events (Nylas)
  const { events: nylasEvents, isLoading: nylasLoading } = useNylasEvents(weekStart, weekEnd);

  // Combine internal and external events for hybrid view
  const allEvents = useMemo(() => {
    const internalEvents = appointments?.map(apt => ({
      ...apt,
      eventType: 'internal',
      id: apt.id,
      title: apt.clientName || 'Internal Appointment',
      start_time: apt.start_at,
      end_time: apt.end_at
    })) || [];

    const externalEvents = nylasEvents?.map(event => ({
      ...event,
      eventType: 'external',
      id: event.id,
      start_time: event.when?.start_time,
      end_time: event.when?.end_time
    })) || [];

    console.log('[CalendarSimple] Merging events:', {
      internalEventsCount: internalEvents.length,
      externalEventsCount: externalEvents.length,
      totalEventsCount: internalEvents.length + externalEvents.length,
      internalEvents: internalEvents.map(e => ({ id: e.id, title: e.title, start: e.start_time })),
      externalEvents: externalEvents.map(e => ({ id: e.id, title: e.title, start: e.start_time }))
    });

    return [...internalEvents, ...externalEvents];
  }, [appointments, nylasEvents]);

  // Debug logging for calendar state
  useEffect(() => {
    console.log('[CalendarSimple] Component state:', {
      userId,
      appointmentsCount: appointments?.length || 0,
      nylasEventsCount: nylasEvents?.length || 0,
      allEventsCount: allEvents?.length || 0,
      appointmentsLoading,
      nylasLoading,
      userTimeZone,
      currentDate: currentDate.toISOString(),
      weekStart: weekStart.toISOString(),
      weekEnd: weekEnd.toISOString(),
      isReady,
      authInitialized,
      calendarView,
      appointments: appointments?.map(apt => ({
        id: apt.id,
        clientName: apt.clientName,
        start_at: apt.start_at,
        end_at: apt.end_at,
        type: apt.type
      })),
      nylasEvents: nylasEvents?.map(event => ({
        id: event.id,
        title: event.title,
        start_time: event.when?.start_time,
        connection_provider: event.connection_provider
      }))
    });
  }, [userId, appointments, nylasEvents, allEvents, appointmentsLoading, nylasLoading, userTimeZone, currentDate, weekStart, weekEnd, isReady, authInitialized, calendarView]);

  // Navigation functions
  const navigatePrevious = useCallback(() => {
    setCurrentDate(prev => subWeeks(prev, 1));
  }, []);

  const navigateNext = useCallback(() => {
    setCurrentDate(prev => addWeeks(prev, 1));
  }, []);

  const navigateToday = useCallback(() => {
    setCurrentDate(new Date());
  }, []);

  // Stabilized access control handler with circuit breaker
  const handleAccessDenied = useCallback((message: string) => {
    if (!isMounted || accessDeniedRef.current) return;
    
    accessDeniedRef.current = true;
    toast({
      title: "Access Denied",
      description: message,
      variant: "destructive"
    });
  }, [toast, isMounted]);

  // Stabilized timezone loading function with circuit breaker
  const loadUserTimeZone = useCallback(async (clinicianId: string) => {
    if (!isMounted || timezoneLoadCountRef.current >= 3) return;
    
    timezoneLoadCountRef.current++;
    
    try {
      console.log('[CalendarSimple] Loading timezone for:', clinicianId);
      const timeZone = await getClinicianTimeZone(clinicianId);
      
      if (!isMounted) return; // Check again after async operation
      
      setUserTimeZone(TimeZoneService.ensureIANATimeZone(timeZone));
    } catch (error) {
      console.error('[CalendarSimple] Error loading user timezone:', error);
      if (isMounted) {
        // Fallback to browser timezone
        const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        setUserTimeZone(TimeZoneService.ensureIANATimeZone(browserTimezone));
      }
    }
  }, [isMounted]);

  // Handle availability click (opens appointment dialog)
  const handleAvailabilityClick = useCallback((date: DateTime, startTime: DateTime, endTime: DateTime) => {
    console.log('[CalendarSimple] Availability clicked:', { date, startTime, endTime });
    setSelectedDateTime({
      date,
      startTime,
      endTime
    });
    setShowAppointmentDialog(true);
  }, []);

  // Handle appointment/event click
  const handleAppointmentClick = useCallback((appointment: any) => {
    console.log('[CalendarSimple] Appointment clicked:', appointment);
    if (appointment.eventType === 'external') {
      toast({
        title: "External Event",
        description: `${appointment.title} - Synced from ${appointment.connection_provider}`,
      });
    } else {
      toast({
        title: "Appointment Details",
        description: `${appointment.clientName} - ${appointment.type}`,
      });
    }
  }, [toast]);

  // Handle new appointment button
  const handleNewAppointment = useCallback(() => {
    setSelectedDateTime({});
    setShowAppointmentDialog(true);
  }, []);

  // Handle appointment created
  const handleAppointmentCreated = useCallback(() => {
    // Force refresh of appointments by updating a trigger
    console.log('[CalendarSimple] Appointment created successfully');
    // The useAppointments hook will automatically refresh due to its query invalidation
  }, []);

  // Component mounting effect
  useEffect(() => {
    setIsMounted(true);
    return () => {
      setIsMounted(false);
    };
  }, []);

  // Primary auth effect - SEPARATED with circuit breaker
  useEffect(() => {
    if (!authInitialized || authCheckCountRef.current >= 3) return;
    
    authCheckCountRef.current++;
    console.log('[CalendarSimple] Auth check #', authCheckCountRef.current, { authInitialized, userId, userRole });
    
    if (!userId) {
      console.log('[CalendarSimple] No user found, redirecting to login');
      handleAccessDenied("Please log in to access the calendar");
      setTimeout(() => navigate('/login'), 100);
      return;
    }
    
    if (userRole === 'client') {
      console.log('[CalendarSimple] Client user detected, redirecting to portal');
      handleAccessDenied("This calendar is for clinicians only. Redirecting to client portal.");
      setTimeout(() => navigate('/portal'), 100);
      return;
    }
    
    if (userRole === 'clinician' || userRole === 'admin') {
      console.log('[CalendarSimple] Authorized user, setting ready');
      setIsReady(true);
    }
  }, [authInitialized, userId, userRole, navigate, handleAccessDenied]);

  // Timezone loading effect - SEPARATED with circuit breaker
  useEffect(() => {
    if (!isReady || !userId || !isMounted || timezoneLoadCountRef.current >= 3) return;
    
    console.log('[CalendarSimple] Loading timezone for ready user:', userId);
    loadUserTimeZone(userId);
  }, [isReady, userId, isMounted, loadUserTimeZone]);

  // Memoized display values
  const currentMonthDisplay = useMemo(() => {
    return currentDate.toLocaleDateString('en-US', { 
      month: 'long', 
      year: 'numeric' 
    });
  }, [currentDate]);

  // Early returns for loading states
  if (!authInitialized) {
    return (
      <Layout>
        <div className="bg-white rounded-lg shadow-sm p-6 animate-fade-in">
          <div className="flex justify-center items-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
              <p>Initializing authentication...</p>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (!userId) {
    return (
      <Layout>
        <div className="bg-white rounded-lg shadow-sm p-6 animate-fade-in">
          <div className="flex justify-center items-center h-64">
            <div className="text-center">
              <div className="text-red-600 mb-4">
                <p className="text-lg font-medium">Authentication Required</p>
                <p className="text-sm">Please log in to access the calendar</p>
              </div>
              <button 
                onClick={() => navigate('/login')}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Go to Login
              </button>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (!isReady) {
    return (
      <Layout>
        <div className="bg-white rounded-lg shadow-sm p-6 animate-fade-in">
          <div className="flex justify-center items-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
              <p>Loading calendar...</p>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <CalendarErrorBoundary>
        <div className="space-y-6">
          {/* Header with navigation and view toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button variant="outline" onClick={navigatePrevious}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" onClick={navigateToday}>
                Today
              </Button>
              <Button variant="outline" onClick={navigateNext}>
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button onClick={handleNewAppointment}>
                <Plus className="h-4 w-4 mr-2" />
                New Appointment
              </Button>
            </div>
            <h1 className="text-2xl font-bold text-gray-800">
              {currentMonthDisplay}
            </h1>
            <div className="flex items-center space-x-4">
              <Tabs value={calendarView} onValueChange={(value) => {
                console.log('[CalendarSimple] Calendar view changed to:', value);
                setCalendarView(value as 'internal' | 'hybrid' | 'debug');
              }}>
                <TabsList>
                  <TabsTrigger value="internal">Internal</TabsTrigger>
                  <TabsTrigger value="hybrid">Hybrid</TabsTrigger>
                  <TabsTrigger value="debug">Debug</TabsTrigger>
                </TabsList>
              </Tabs>
              <div className="text-sm text-gray-500">
                Events: {calendarView === 'internal' ? appointments?.length || 0 : allEvents?.length || 0} | 
                Timezone: {userTimeZone}
              </div>
            </div>
          </div>

          {/* Main content with tab-based calendar views */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Calendar display */}
            <div className="lg:col-span-3">
              <Tabs value={calendarView} onValueChange={(value) => setCalendarView(value as 'internal' | 'hybrid' | 'debug')}>
                <TabsContent value="internal">
                  <WeeklyCalendarGrid
                    currentDate={currentDate}
                    clinicianId={userId}
                    userTimeZone={userTimeZone}
                    onAvailabilityClick={handleAvailabilityClick}
                    onAppointmentClick={handleAppointmentClick}
                  />
                </TabsContent>
                <TabsContent value="hybrid">
                  <NylasHybridCalendar
                    clinicianId={userId}
                    userTimeZone={userTimeZone}
                    currentDate={currentDate}
                    onEventClick={handleAppointmentClick}
                  />
                </TabsContent>
                <TabsContent value="debug">
                  <div className="space-y-4">
                    <NylasConnectionTest />
                    <Card>
                      <CardHeader>
                        <CardTitle>Debug Information</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2 text-sm">
                          <div><strong>User ID:</strong> {userId}</div>
                          <div><strong>Time Zone:</strong> {userTimeZone}</div>
                          <div><strong>Current Date:</strong> {currentDate.toISOString()}</div>
                          <div><strong>Week Start:</strong> {weekStart.toISOString()}</div>
                          <div><strong>Week End:</strong> {weekEnd.toISOString()}</div>
                          <div><strong>Internal Appointments:</strong> {appointments?.length || 0}</div>
                          <div><strong>Nylas Events:</strong> {nylasEvents?.length || 0}</div>
                          <div><strong>All Events:</strong> {allEvents?.length || 0}</div>
                          <div><strong>Appointments Loading:</strong> {appointmentsLoading ? 'Yes' : 'No'}</div>
                          <div><strong>Nylas Loading:</strong> {nylasLoading ? 'Yes' : 'No'}</div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>
              </Tabs>
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-1 space-y-4">
              <AvailabilityManagementSidebar
                clinicianId={userId}
                userTimeZone={userTimeZone}
              />
              <CalendarConnectionsPanel />
            </div>
          </div>
        </div>

        {/* Appointment Dialog */}
        <AppointmentDialog
          isOpen={showAppointmentDialog}
          onClose={() => setShowAppointmentDialog(false)}
          clinicianId={userId}
          clinicianTimeZone={userTimeZone}
          selectedDate={selectedDateTime.date}
          selectedStartTime={selectedDateTime.startTime}
          selectedEndTime={selectedDateTime.endTime}
          onAppointmentCreated={handleAppointmentCreated}
        />
      </CalendarErrorBoundary>
    </Layout>
  );
});

CalendarSimple.displayName = 'CalendarSimple';

export default CalendarSimple;
