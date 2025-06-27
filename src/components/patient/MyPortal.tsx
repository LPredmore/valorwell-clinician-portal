import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, CalendarIcon, PlusCircle } from 'lucide-react';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import WeekView from '@/components/calendar/WeekView';
import AppointmentBookingDialog from './AppointmentBookingDialog';
import { supabase, getOrCreateVideoRoom } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { isToday } from 'date-fns';
import { getUserTimeZone } from '@/utils/timeZoneUtils';
import VideoChat from '@/components/video/VideoChat';
import { TimeZoneService } from '@/utils/timeZoneService';
import PHQ9Template from '@/components/templates/PHQ9Template';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface Appointment {
  id: number;
  date?: string; // Legacy field
  time?: string; // Legacy field
  formattedDate?: string; // Generated field from UTC timestamp
  formattedTime?: string; // Generated field from UTC timestamp
  type: string;
  therapist: string;
  start_at: string; // UTC timestamp
  end_at: string; // UTC timestamp
}

interface MyPortalProps {
  upcomingAppointments: Appointment[];
  clientData: any | null;
  clinicianName: string | null;
  loading: boolean;
}

const MyPortal: React.FC<MyPortalProps> = ({
  upcomingAppointments: initialAppointments,
  clientData,
  clinicianName,
  loading
}) => {
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [upcomingAppointments, setUpcomingAppointments] = useState<Appointment[]>(initialAppointments);
  const [refreshAppointments, setRefreshAppointments] = useState(0);
  const [isVideoSessionOpen, setIsVideoSessionOpen] = useState(false);
  const [videoRoomUrl, setVideoRoomUrl] = useState<string | null>(null);
  const [isLoadingVideoSession, setIsLoadingVideoSession] = useState(false);
  const [showPHQ9, setShowPHQ9] = useState(false);
  const [pendingAppointmentId, setPendingAppointmentId] = useState<string | number | null>(null);
  const [clinicianData, setClinicianData] = useState<any>(null);
  const [isLoadingAppointments, setIsLoadingAppointments] = useState(false);
  const [appointmentsLoaded, setAppointmentsLoaded] = useState(false);
  const { toast } = useToast();

  // Memoize client timezone to prevent recalculation on every render
  const clientTimeZone = useMemo(() => {
    return TimeZoneService.ensureIANATimeZone(
      clientData?.client_time_zone || getUserTimeZone()
    );
  }, [clientData?.client_time_zone]);

  useEffect(() => {
    const fetchClinicianData = async () => {
      if (!clientData?.client_assigned_therapist) return;
      try {
        const { data, error } = await supabase
          .from('clinicians')
          .select('*')
          .eq('id', clientData.client_assigned_therapist)
          .single();
          
        if (error) {
          console.error('Error fetching clinician data:', error);
          return;
        }
        
        if (data) {
          console.log('Fetched clinician data:', data);
          setClinicianData(data);
        }
      } catch (error) {
        console.error('Error:', error);
      }
    };
    
    fetchClinicianData();
  }, [clientData]);

  useEffect(() => {
    const fetchAppointments = async () => {
      // Skip if no client data or if appointments are already loading
      if (!clientData?.id || isLoadingAppointments) return;
      
      // Skip if appointments are already loaded and no refresh is requested
      if (appointmentsLoaded && refreshAppointments === 0) return;
      
      setIsLoadingAppointments(true);
      
      try {
        console.log("Fetching appointments for client:", clientData.id);
        console.log("Using time zone:", clientTimeZone);
        
        // Get today's date in UTC
        const todayUTC = TimeZoneService.now().toUTC().startOf('day');
        
        const { data, error } = await supabase
          .from('appointments')
          .select('*')
          .eq('client_id', clientData.id)
          .eq('status', 'scheduled')
          .gte('start_at', todayUTC.toISO())
          .order('start_at', { ascending: true });
          
        if (error) {
          console.error('Error fetching appointments:', error);
          return;
        }
        
        console.log("Appointments data from Supabase:", data);
        
        if (data && data.length > 0) {
          // Process appointments with TimeZoneService
          const formattedAppointments = data.map(appointment => {
            try {
              // Convert UTC timestamps to client timezone and format for display
              const startDateTime = TimeZoneService.fromUTC(appointment.start_at, clientTimeZone);
              
              return {
                id: appointment.id,
                formattedDate: startDateTime.toFormat('MMMM d, yyyy'),
                formattedTime: startDateTime.toFormat('h:mm a'),
                type: appointment.type,
                therapist: clinicianName || 'Your Therapist',
                start_at: appointment.start_at,
                end_at: appointment.end_at
              };
            } catch (error) {
              console.error('Error processing appointment:', error, appointment);
              
              // Fallback with basic info
              return {
                id: appointment.id,
                formattedDate: 'Date unavailable',
                formattedTime: 'Time unavailable',
                type: appointment.type || 'Unknown',
                therapist: clinicianName || 'Your Therapist',
                start_at: appointment.start_at || '',
                end_at: appointment.end_at || ''
              };
            }
          });
          
          console.log("Formatted appointments:", formattedAppointments);
          setUpcomingAppointments(formattedAppointments);
        } else {
          console.log("No appointments found or empty data array");
          setUpcomingAppointments([]);
        }
        
        // Mark appointments as loaded
        setAppointmentsLoaded(true);
      } catch (error) {
        console.error('Error in fetchAppointments:', error);
        toast({
          title: "Error",
          description: "Failed to load your appointments. Please try again later.",
          variant: "destructive"
        });
      } finally {
        setIsLoadingAppointments(false);
      }
    };
    
    fetchAppointments();
  }, [clientData, clinicianName, refreshAppointments, clientTimeZone, toast, isLoadingAppointments, appointmentsLoaded]);

  const isAppointmentToday = (appointment: Appointment): boolean => {
    if (!appointment.start_at) return false;
    
    try {
      const apptDate = TimeZoneService.fromUTC(appointment.start_at, clientTimeZone);
      const today = TimeZoneService.today(clientTimeZone);
      return TimeZoneService.isSameDay(apptDate, today);
    } catch (error) {
      console.error('Error in isAppointmentToday:', error);
      return false;
    }
  };

  const handleBookingComplete = () => {
    // Increment refreshAppointments to trigger a fetch
    setRefreshAppointments(prev => prev + 1);
    // Reset appointmentsLoaded to ensure we fetch fresh data
    setAppointmentsLoaded(false);
    toast({
      title: "Appointment Booked",
      description: "Your appointment has been scheduled successfully!"
    });
  };

  const handleStartSession = async (appointmentId: string | number) => {
    setPendingAppointmentId(appointmentId);
    setShowPHQ9(true);
  };

  const handlePHQ9Complete = async () => {
    setShowPHQ9(false);
    if (pendingAppointmentId) {
      setIsLoadingVideoSession(true);
      try {
        console.log('Starting session for appointment:', pendingAppointmentId);
        const result = await getOrCreateVideoRoom(pendingAppointmentId.toString());
        if (!result.success || !result.url) {
          console.error('Error result from getOrCreateVideoRoom:', result);
          throw new Error(result.error?.message || result.error || 'Failed to create video room');
        }
        console.log('Video room URL obtained:', result.url);
        setVideoRoomUrl(result.url);
        setIsVideoSessionOpen(true);
        toast({
          title: "Video Session Ready",
          description: "You are entering the video session now."
        });
      } catch (error) {
        console.error('Error starting video session:', error);
        toast({
          title: "Error",
          description: error?.message || "Failed to start the video session. Please try again.",
          variant: "destructive"
        });
      } finally {
        setIsLoadingVideoSession(false);
        setPendingAppointmentId(null);
      }
    }
  };

  const handleCloseVideoSession = () => {
    setIsVideoSessionOpen(false);
  };

  const timeZoneDisplay = TimeZoneService.getTimeZoneDisplayName(clientTimeZone);
  const todayAppointments = upcomingAppointments.filter(appointment => isAppointmentToday(appointment));
  const futureAppointments = upcomingAppointments.filter(appointment => !isAppointmentToday(appointment));

  return (
    <div className="grid grid-cols-1 gap-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle>Today's Appointments</CardTitle>
            <CardDescription>Sessions scheduled for today</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {todayAppointments.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Time <span className="text-xs text-gray-500">({timeZoneDisplay})</span></TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Therapist</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {todayAppointments.map(appointment => (
                  <TableRow key={appointment.id}>
                    <TableCell>{appointment.formattedDate}</TableCell>
                    <TableCell>{appointment.formattedTime}</TableCell>
                    <TableCell>{appointment.type}</TableCell>
                    <TableCell>{appointment.therapist}</TableCell>
                    <TableCell className="text-right">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleStartSession(appointment.id)} 
                        disabled={isLoadingVideoSession}
                      >
                        {isLoadingVideoSession ? "Loading..." : "Start Session"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <Calendar className="h-12 w-12 text-gray-300 mb-3" />
              <h3 className="text-lg font-medium">No appointments today</h3>
              <p className="text-sm text-gray-500 mt-1">Check your upcoming appointments below</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Your Therapist</CardTitle>
          <Button variant="outline" size="sm" onClick={() => setIsBookingOpen(true)}>
            <CalendarIcon className="mr-2 h-4 w-4" />
            Book New Appointment
          </Button>
        </CardHeader>
        <CardContent>
          {clientData && clientData.client_assigned_therapist && clinicianData ? (
            <div className="bg-gray-50 p-4 rounded-md mb-4">
              <div className="flex flex-row gap-6 items-start">
                <Avatar className="h-48 w-48 border-2 border-white shadow-md rounded-md flex-shrink-0">
                  {clinicianData.clinician_image_url ? (
                    <AvatarImage 
                      src={clinicianData.clinician_image_url} 
                      alt={clinicianName || 'Therapist'} 
                      className="object-cover h-full w-full" 
                    />
                  ) : (
                    <AvatarFallback className="text-4xl font-medium bg-valorwell-100 text-valorwell-700 h-full w-full">
                      {clinicianData.clinician_first_name?.[0] || ''}
                      {clinicianData.clinician_last_name?.[0] || ''}
                    </AvatarFallback>
                  )}
                </Avatar>
                
                <div className="flex-1">
                  {clinicianData.clinician_bio && (
                    <>
                      <h4 className="font-medium text-lg mb-2">About {clinicianName}</h4>
                      <p className="text-gray-700 text-sm whitespace-pre-line">{clinicianData.clinician_bio}</p>
                    </>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Calendar className="h-12 w-12 text-gray-300 mb-3" />
              <h3 className="text-lg font-medium">No Assigned Therapist</h3>
              <p className="text-sm text-gray-500 mt-1">
                You don't have an assigned therapist yet. Please contact the clinic for assistance.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle>Upcoming Appointments</CardTitle>
            <CardDescription>Your scheduled sessions</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {futureAppointments.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Time <span className="text-xs text-gray-500">({timeZoneDisplay})</span></TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Therapist</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {futureAppointments.map(appointment => (
                  <TableRow key={appointment.id}>
                    <TableCell>{appointment.formattedDate}</TableCell>
                    <TableCell>{appointment.formattedTime}</TableCell>
                    <TableCell>{appointment.type}</TableCell>
                    <TableCell>{appointment.therapist}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <Calendar className="h-12 w-12 text-gray-300 mb-3" />
              <h3 className="text-lg font-medium">No upcoming appointments</h3>
              <p className="text-sm text-gray-500 mt-1">Schedule a session with your therapist</p>
              <Button className="mt-4" onClick={() => setIsBookingOpen(true)}>
                Book Appointment
              </Button>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-between">
          
        </CardFooter>
      </Card>

      <AppointmentBookingDialog 
        open={isBookingOpen} 
        onOpenChange={setIsBookingOpen} 
        clinicianId={clientData?.client_assigned_therapist || null} 
        clinicianName={clinicianName} 
        clientId={clientData?.id || null} 
        onAppointmentBooked={handleBookingComplete}
        userTimeZone={clientTimeZone}
      />

      {showPHQ9 && (
        <PHQ9Template 
          onClose={() => setShowPHQ9(false)} 
          clinicianName={clinicianName || "Your Therapist"} 
          clientData={clientData} 
          onComplete={handlePHQ9Complete} 
        />
      )}

      {videoRoomUrl && (
        <VideoChat 
          roomUrl={videoRoomUrl} 
          isOpen={isVideoSessionOpen} 
          onClose={handleCloseVideoSession} 
        />
      )}
    </div>
  );
};

export default MyPortal;
