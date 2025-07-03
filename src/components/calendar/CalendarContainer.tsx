import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../layout/Layout";
import { useUser } from "@/context/UserContext";
import { useToast } from "@/hooks/use-toast";
import ReactBigCalendar from "./ReactBigCalendar";
import AvailabilityManagementSidebar from "./AvailabilityManagementSidebar";
import AppointmentDialog from "./AppointmentDialog";
import EditBlockedTimeDialog from "./EditBlockedTimeDialog";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Plus, Clock, Calendar as CalendarIcon, Link2, Settings } from "lucide-react";
import { DateTime } from "luxon";
import { useAppointments } from "@/hooks/useAppointments";
import { useNylasEvents } from "@/hooks/useNylasEvents";
import { useClinicianAvailability } from "@/hooks/useClinicianAvailability";
import { useBlockedTime } from "@/hooks/useBlockedTime";
import { getWeekRange } from "@/utils/dateRangeUtils";
import { getClinicianTimeZone } from "@/hooks/useClinicianData";
import { TimeZoneService } from "@/utils/timeZoneService";
import { CalendarEvent } from "./types";
import { useNylasSync } from "@/hooks/useNylasSync";
import { useNylasIntegration } from "@/hooks/useNylasIntegration";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { SyncStatusIndicator } from './SyncStatusIndicator';
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, AlertTriangle, Trash2 } from "lucide-react";

const CalendarContainer: React.FC = () => {
  const { userId, authInitialized, userRole } = useUser();
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [userTimeZone, setUserTimeZone] = useState<string>(TimeZoneService.DEFAULT_TIMEZONE);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isAvailabilityOpen, setIsAvailabilityOpen] = useState(false);
  const [isAppointmentDialogOpen, setIsAppointmentDialogOpen] = useState(false);
  const [isBlockedTimeDialogOpen, setIsBlockedTimeDialogOpen] = useState(false);
  const [isCalendarConnectionsOpen, setIsCalendarConnectionsOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<any>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<any>(null);
  const [editingBlockedTime, setEditingBlockedTime] = useState<any>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Initialize Nylas sync hook
  const { getSyncStatusForAppointment, loadSyncMappings } = useNylasSync();

  // Initialize Nylas integration hook
  const {
    connections,
    isLoading: isLoadingConnections,
    isConnecting,
    infrastructureError,
    connectGoogleCalendar,
    disconnectCalendar
  } = useNylasIntegration();

  // Calculate week boundaries using RBC-native approach
  const { start: weekStart, end: weekEnd } = useMemo(() => {
    const tz = userTimeZone || TimeZoneService.DEFAULT_TIMEZONE;
    return getWeekRange(currentDate, tz);
  }, [currentDate, userTimeZone]);

  // Fetch data with simplified parameters
  const { appointments } = useAppointments(
    userId,
    weekStart,
    weekEnd,
    userTimeZone,
    refreshTrigger
  );

  const { events: nylasEvents } = useNylasEvents(weekStart, weekEnd);

  const { blockedTimes } = useBlockedTime(
    userId || '',
    weekStart,
    weekEnd,
    refreshTrigger
  );

  const availabilitySlots = useClinicianAvailability(
    userId,
    weekStart,
    weekEnd,
    refreshTrigger
  );

  // Load sync mappings when appointments change
  useEffect(() => {
    if (appointments && appointments.length > 0) {
      const appointmentIds = appointments.map(apt => apt.id);
      loadSyncMappings(appointmentIds);
    }
  }, [appointments, loadSyncMappings]);

  // Separate real events from background availability
  const realEvents = useMemo((): CalendarEvent[] => {
    const events: CalendarEvent[] = [];
    
    // Transform appointments to RBC format
    if (appointments) {
      events.push(...appointments.map(apt => {
        const startDT = DateTime.fromISO(apt.start_at, { zone: 'utc' }).setZone(userTimeZone);
        const endDT = DateTime.fromISO(apt.end_at, { zone: 'utc' }).setZone(userTimeZone);

        // Get sync status for this appointment
        const syncStatus = getSyncStatusForAppointment(apt.id);

        return {
          id: apt.id,
          title: apt.clientName || 'Internal Appointment',
          start: startDT.toJSDate(),
          end: endDT.toJSDate(),
          source: 'internal' as const,
          resource: { 
            ...apt,
            syncStatus // Add sync status to resource
          }
        };
      }));
    }
    
    // Transform Nylas events to RBC format
    if (nylasEvents) {
      events.push(...nylasEvents.map(evt => ({
        id: evt.id,
        title: evt.title,
        start: new Date(evt.when?.start_time || ''),
        end: new Date(evt.when?.end_time || ''),
        source: 'nylas' as const,
        resource: evt
      })));
    }

    // Transform blocked time to RBC format
    events.push(...blockedTimes.map(blockedTime => {
      const startDT = DateTime.fromISO(blockedTime.start_at, { zone: 'utc' }).setZone(userTimeZone);
      const endDT = DateTime.fromISO(blockedTime.end_at, { zone: 'utc' }).setZone(userTimeZone);

      return {
        id: blockedTime.id,
        title: blockedTime.label,
        start: startDT.toJSDate(),
        end: endDT.toJSDate(),
        source: 'blocked_time' as const,
        resource: blockedTime
      };
    }));

    return events;
  }, [appointments, nylasEvents, blockedTimes, userTimeZone, getSyncStatusForAppointment]);

  // Transform availability slots to background events
  const backgroundEvents = useMemo(() => {
    const tz = userTimeZone;
    const startDT = DateTime.fromJSDate(weekStart).setZone(tz).startOf('day');
    const endDT = DateTime.fromJSDate(weekEnd).setZone(tz).startOf('day');
    
    const dates = [];
    let cursor = startDT;
    
    while (cursor <= endDT) {
      dates.push(cursor);
      cursor = cursor.plus({ days: 1 });
    }

    const weekdayMap = { 
      monday: 1, tuesday: 2, wednesday: 3, thursday: 4, 
      friday: 5, saturday: 6, sunday: 7 
    };

    return availabilitySlots.flatMap(slot => {
      const matchedDates = dates.filter(d => d.weekday === weekdayMap[slot.day]);
      
      return matchedDates.map(d => {
        const startISO = `${d.toISODate()}T${slot.startTime}`;
        const endISO = `${d.toISODate()}T${slot.endTime}`;
        
        const startDT = DateTime.fromISO(startISO, { zone: tz });
        const endDT = DateTime.fromISO(endISO, { zone: tz });
        
        return {
          start: startDT.toJSDate(),
          end: endDT.toJSDate(),
          resource: slot
        };
      });
    });
  }, [availabilitySlots, weekStart, weekEnd, userTimeZone]);

  // Load user timezone
  const loadUserTimeZone = useCallback(async (clinicianId: string) => {
    try {
      const timeZone = await getClinicianTimeZone(clinicianId);
      setUserTimeZone(TimeZoneService.ensureIANATimeZone(timeZone));
    } catch (error) {
      const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      setUserTimeZone(TimeZoneService.ensureIANATimeZone(browserTimezone));
    }
  }, []);

  // Pure RBC event handlers - native only
  const handleCalendarNavigate = useCallback((newDate: Date) => {
    setCurrentDate(newDate);
    setRefreshTrigger(prev => prev + 1);
  }, []);

  const handleSelectSlot = useCallback((slotInfo: { start: Date; end: Date }) => {
    setSelectedSlot(slotInfo);
    setIsEditMode(false);
    setEditingAppointment(null);
    setIsAppointmentDialogOpen(true);
  }, []);

  const handleSelectEvent = useCallback((event: CalendarEvent) => {
    if (event.source === 'internal') {
      // Open edit dialog for internal appointments
      setEditingAppointment(event.resource);
      setSelectedSlot(null);
      setIsEditMode(true);
      setIsAppointmentDialogOpen(true);
    } else if (event.source === 'nylas') {
      toast({
        title: "External Event",
        description: `${event.title} - Synced from external calendar`,
        duration: 3000,
      });
    } else if (event.source === 'blocked_time') {
      // Open edit dialog for blocked time
      setEditingBlockedTime(event.resource);
      setIsBlockedTimeDialogOpen(true);
    }
  }, [toast]);

  const handleAvailabilityRefresh = useCallback(() => {
    setRefreshTrigger(prev => prev + 1);
  }, []);

  const handleAppointmentCreated = useCallback(() => {
    setRefreshTrigger(prev => prev + 1);
    setIsAppointmentDialogOpen(false);
  }, []);

  const handleAppointmentUpdated = useCallback(() => {
    setRefreshTrigger(prev => prev + 1);
    setIsAppointmentDialogOpen(false);
  }, []);

  const handleCloseAppointmentDialog = useCallback(() => {
    setIsAppointmentDialogOpen(false);
    setSelectedSlot(null);
    setEditingAppointment(null);
    setIsEditMode(false);
  }, []);

  const handleBlockedTimeUpdated = useCallback(() => {
    setRefreshTrigger(prev => prev + 1);
    setIsBlockedTimeDialogOpen(false);
    setEditingBlockedTime(null);
  }, []);

  const handleCloseBlockedTimeDialog = useCallback(() => {
    setIsBlockedTimeDialogOpen(false);
    setEditingBlockedTime(null);
  }, []);

  // Auth effect
  useEffect(() => {
    if (!authInitialized) return;
    
    if (!userId) {
      navigate('/login');
      return;
    }
    
    if (userRole === 'client') {
      navigate('/portal');
      return;
    }
  }, [authInitialized, userId, userRole, navigate]);

  // Timezone loading effect
  useEffect(() => {
    if (!userId) return;
    loadUserTimeZone(userId);
  }, [userId, loadUserTimeZone]);

  const getProviderIcon = (provider: string) => {
    switch (provider.toLowerCase()) {
      case 'google':
        return '🔵';
      case 'outlook':
      case 'microsoft':
        return '🔷';
      case 'icloud':
        return '☁️';
      default:
        return '📅';
    }
  };

  const getProviderName = (provider: string) => {
    switch (provider.toLowerCase()) {
      case 'google':
        return 'Google Calendar';
      case 'outlook':
      case 'microsoft':
        return 'Outlook';
      case 'icloud':
        return 'iCloud';
      default:
        return provider;
    }
  };

  const getConnectionStatus = (connection: any) => {
    if (connection.grant_status === 'valid') {
      return { label: 'Connected', variant: 'secondary' as const };
    } else if (connection.grant_status === 'invalid') {
      return { label: 'Needs Reauth', variant: 'destructive' as const };
    } else {
      return { label: 'Connected', variant: 'secondary' as const };
    }
  };

  if (!authInitialized || !userId) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6 animate-fade-in">
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p>Loading calendar...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Layout>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <Button onClick={() => {
              setSelectedSlot({ start: new Date(), end: new Date() });
              setIsEditMode(false);
              setEditingAppointment(null);
              setIsAppointmentDialogOpen(true);
            }}>
              <Plus className="h-4 w-4 mr-2" />
              New Appointment
            </Button>

            <Button variant="outline" onClick={() => navigate('/blocked-time/new')}>
              <Clock className="h-4 w-4 mr-2" />
              Block Time
            </Button>

            <Button variant="outline" onClick={() => setIsAvailabilityOpen(true)}>
              <CalendarIcon className="h-4 w-4 mr-2" />
              Availability
            </Button>

            <Button variant="outline" onClick={() => setIsCalendarConnectionsOpen(true)}>
              <Link2 className="h-4 w-4 mr-2" />
              Calendar Sync
              {connections.length > 0 && (
                <Badge variant="secondary" className="ml-2 text-xs">
                  {connections.length}
                </Badge>
              )}
            </Button>
          </div>
          
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate('/settings', { state: { activeTab: 'calendar' } })}>
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
            <div className="text-sm text-gray-600 text-right">
              <p>Timezone: {userTimeZone}</p>
            </div>
          </div>
        </div>

        <ReactBigCalendar
          events={realEvents}
          backgroundEvents={backgroundEvents}
          availabilitySlots={availabilitySlots}
          onSelectSlot={handleSelectSlot}
          onSelectEvent={handleSelectEvent}
          date={currentDate}
          onNavigate={handleCalendarNavigate}
          userTimeZone={userTimeZone}
        />

        <Sheet open={isAvailabilityOpen} onOpenChange={setIsAvailabilityOpen}>
          <SheetContent side="right" className="w-[400px] sm:w-[540px]">
            <SheetHeader>
              <SheetTitle>Manage Availability</SheetTitle>
              <SheetDescription>
                Set your available time slots for appointments
              </SheetDescription>
            </SheetHeader>
            <div className="mt-6">
              <AvailabilityManagementSidebar
                clinicianId={userId}
                userTimeZone={userTimeZone}
                refreshTrigger={refreshTrigger}
                onRefresh={handleAvailabilityRefresh}
              />
            </div>
          </SheetContent>
        </Sheet>

        <Sheet open={isCalendarConnectionsOpen} onOpenChange={setIsCalendarConnectionsOpen}>
          <SheetContent side="right" className="w-[400px] sm:w-[540px]">
            <SheetHeader>
              <SheetTitle>Calendar Integration</SheetTitle>
              <SheetDescription>
                Connect your external calendars for two-way synchronization
              </SheetDescription>
            </SheetHeader>
            <div className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CalendarIcon className="h-5 w-5" />
                    Google Calendar Integration
                  </CardTitle>
                  <CardDescription>
                    Connect your Google Calendar for two-way sync via Nylas
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {infrastructureError && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-red-800 font-medium text-sm">Setup Required</p>
                          <p className="text-red-700 text-xs mt-1">{infrastructureError}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {isLoadingConnections ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  ) : (
                    <>
                      {connections.length > 0 ? (
                        <div className="space-y-3">
                          {connections.map((connection) => {
                            const status = getConnectionStatus(connection);
                            return (
                              <div
                                key={connection.id}
                                className="flex items-center justify-between p-3 border rounded-lg"
                              >
                                <div className="flex items-center gap-3">
                                  <span className="text-lg">
                                    {getProviderIcon(connection.provider)}
                                  </span>
                                  <div>
                                    <div className="font-medium">
                                      {getProviderName(connection.provider)}
                                    </div>
                                    <div className="text-sm text-gray-500">
                                      {connection.email}
                                    </div>
                                    {connection.last_sync_at && (
                                      <div className="text-xs text-gray-400">
                                        Last sync: {new Date(connection.last_sync_at).toLocaleDateString()}
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge variant={status.variant}>{status.label}</Badge>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => disconnectCalendar(connection.id)}
                                    disabled={!!infrastructureError}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-center py-6 text-gray-500">
                          <CalendarIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
                          <p>No Google Calendar connected</p>
                          <p className="text-sm">Connect your Google Calendar to enable two-way sync</p>
                        </div>
                      )}

                      <Button
                        onClick={connectGoogleCalendar}
                        disabled={isConnecting || !!infrastructureError}
                        className="w-full"
                      >
                        {isConnecting ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Connecting...
                          </>
                        ) : (
                          <>
                            <Plus className="mr-2 h-4 w-4" />
                            Connect Google Calendar
                          </>
                        )}
                      </Button>

                      {infrastructureError && (
                        <p className="text-xs text-gray-500 text-center">
                          Connection disabled until infrastructure is configured
                        </p>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>

              <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h3 className="font-semibold text-blue-900 mb-2">How Calendar Sync Works</h3>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• When you create an appointment, it's automatically added to your connected calendar</li>
                  <li>• When you update an appointment, the changes sync to your external calendar</li>
                  <li>• When you delete an appointment, it's removed from your external calendar</li>
                  <li>• External calendar events appear as read-only events in your schedule</li>
                </ul>
              </div>
            </div>
          </SheetContent>
        </Sheet>

        <AppointmentDialog
          isOpen={isAppointmentDialogOpen}
          onClose={handleCloseAppointmentDialog}
          clinicianId={userId}
          userTimeZone={userTimeZone}
          onAppointmentCreated={handleAppointmentCreated}
          onAppointmentUpdated={handleAppointmentUpdated}
          selectedSlot={selectedSlot}
          isEditMode={isEditMode}
          editingAppointment={editingAppointment}
        />

        {editingBlockedTime && (
          <EditBlockedTimeDialog
            isOpen={isBlockedTimeDialogOpen}
            onClose={handleCloseBlockedTimeDialog}
            blockedTime={editingBlockedTime}
            userTimeZone={userTimeZone}
            onBlockedTimeUpdated={handleBlockedTimeUpdated}
          />
        )}
      </div>
    </Layout>
  );
};

export default CalendarContainer;
