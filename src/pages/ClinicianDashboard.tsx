import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Calendar, Clock, AlertCircle } from 'lucide-react';
import { useUser } from '@/context/UserContext';
import Layout from '@/components/layout/Layout';
import VideoChat from '@/components/video/VideoChat';
import { TimeZoneService } from '@/utils/timeZoneService';
import { AppointmentsList } from '@/components/dashboard/AppointmentsList';
import SessionNoteTemplate from '@/components/templates/SessionNoteTemplate';
import { getClinicianTimeZone } from '@/hooks/useClinicianData';
import { SessionDidNotOccurDialog } from '@/components/dashboard/SessionDidNotOccurDialog';
import { Appointment } from '@/types/appointment';
import { ClientDetails } from '@/types/client';
import { fetchClinicianAppointments, fetchClinicianProfile } from '@/utils/clinicianDataUtils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const ClinicianDashboard = () => {
  const { userRole, userId } = useUser();
  const { toast } = useToast();
  const [clinicianProfile, setClinicianProfile] = useState<any>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [clinicianTimeZone, setClinicianTimeZone] = useState<string>(TimeZoneService.DEFAULT_TIMEZONE);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isLoadingAppointments, setIsLoadingAppointments] = useState(true);
  const [isLoadingTimeZone, setIsLoadingTimeZone] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  // Video and session states
  const [isVideoOpen, setIsVideoOpen] = useState(false);
  const [currentVideoUrl, setCurrentVideoUrl] = useState<string>('');
  const [showSessionTemplate, setShowSessionTemplate] = useState(false);
  const [currentAppointment, setCurrentAppointment] = useState<Appointment | null>(null);
  const [clientData, setClientData] = useState<any>(null);
  const [isLoadingClientData, setIsLoadingClientData] = useState(false);
  
  // Session did not occur dialog states
  const [showSessionDidNotOccurDialog, setShowSessionDidNotOccurDialog] = useState(false);
  const [selectedAppointmentForNoShow, setSelectedAppointmentForNoShow] = useState<Appointment | null>(null);
  
  // Circuit breaker to prevent infinite loops
  const dataFetchCountRef = useRef(0);

  // Ensure timezone is always a string
  const safeClinicianTimeZone = Array.isArray(clinicianTimeZone) ? clinicianTimeZone[0] : clinicianTimeZone;
  const timeZoneDisplay = TimeZoneService.getTimeZoneDisplayName(safeClinicianTimeZone);

  // Fetch clinician profile
  useEffect(() => {
    if (!userId) return;
    
    const fetchProfile = async () => {
      setIsLoadingProfile(true);
      try {
        const profile = await fetchClinicianProfile(userId);
        setClinicianProfile(profile);
      } catch (error) {
        console.error("Error fetching clinician profile:", error);
        setError(error as Error);
      } finally {
        setIsLoadingProfile(false);
      }
    };
    
    fetchProfile();
  }, [userId]);

  // Fetch clinician's timezone
  useEffect(() => {
    if (!userId) return;
    
    const fetchTimeZone = async () => {
      setIsLoadingTimeZone(true);
      try {
        const timeZone = await getClinicianTimeZone(userId);
        console.log("[ClinicianDashboard] Fetched clinician timezone:", { timeZone, type: typeof timeZone, isArray: Array.isArray(timeZone) });
        
        // Ensure timezone is a string
        const safeTimeZone = Array.isArray(timeZone) ? timeZone[0] : timeZone;
        console.log("[ClinicianDashboard] Safe timezone after conversion:", { safeTimeZone, type: typeof safeTimeZone });
        
        setClinicianTimeZone(safeTimeZone);
      } catch (error) {
        console.error("Error fetching clinician timezone:", error);
        // Fallback to system timezone
        setClinicianTimeZone(TimeZoneService.DEFAULT_TIMEZONE);
      } finally {
        setIsLoadingTimeZone(false);
      }
    };
    
    fetchTimeZone();
  }, [userId]);

  // Fetch clinician's appointments with circuit breaker
  useEffect(() => {
    if (!userId) return;
    
    // Circuit breaker check INSIDE effect, not on render
    const currentAttempts = dataFetchCountRef.current++;
    if (currentAttempts >= 3) {
      console.error("Max fetch attempts reached");
      setIsLoadingAppointments(false);
      return;
    }
    
    const fetchAppointments = async () => {
      setIsLoadingAppointments(true);
      try {
        const appointmentsData = await fetchClinicianAppointments(userId);
        setAppointments(appointmentsData);
        setError(null);
        dataFetchCountRef.current = 0; // Reset on success
      } catch (error) {
        console.error("Error fetching clinician appointments:", error);
        setError(error as Error);
      } finally {
        setIsLoadingAppointments(false);
      }
    };
    
    fetchAppointments();
  }, [userId]); // Remove refreshTrigger from dependencies

  // Memoize expensive appointment calculations using clinician timezone
  const appointmentCategories = useMemo(() => {
    if (!appointments.length) {
      return { today: [], upcoming: [], outstanding: [] };
    }

    // Use clinician timezone for all date calculations
    const now = TimeZoneService.now(safeClinicianTimeZone);
    const todayStart = now.startOf('day');
    const todayEnd = now.endOf('day');

    console.log('[ClinicianDashboard] Categorizing appointments using clinician timezone:', {
      clinicianTimeZone: safeClinicianTimeZone,
      todayStart: todayStart.toISO(),
      todayEnd: todayEnd.toISO(),
      totalAppointments: appointments.length
    });

    // Filter out cancelled appointments
    const activeAppointments = appointments.filter(apt => apt.status !== 'cancelled');

    const categorized = {
      today: activeAppointments.filter(apt => {
        const aptDateTime = TimeZoneService.fromUTC(apt.start_at, safeClinicianTimeZone);
        const isToday = aptDateTime >= todayStart && aptDateTime <= todayEnd;
        return isToday;
      }).sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime()),
      
      outstanding: activeAppointments.filter(apt => {
        const aptDateTime = TimeZoneService.fromUTC(apt.start_at, safeClinicianTimeZone);
        const isTodayOrEarlier = aptDateTime <= todayEnd;
        return isTodayOrEarlier;
      }).sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime()),
      
      upcoming: activeAppointments.filter(apt => {
        const aptDateTime = TimeZoneService.fromUTC(apt.start_at, safeClinicianTimeZone);
        const isFuture = aptDateTime > todayEnd;
        return isFuture;
      }).sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime())
    };

    console.log('[ClinicianDashboard] Appointment categorization results:', {
      todayCount: categorized.today.length,
      outstandingCount: categorized.outstanding.length,
      upcomingCount: categorized.upcoming.length
    });

    return categorized;
  }, [appointments, safeClinicianTimeZone]);

  // Video session handlers
  const startVideoSession = (appointment: Appointment) => {
    setCurrentAppointment(appointment);
    setCurrentVideoUrl(appointment.video_room_url || '');
    setIsVideoOpen(true);
  };

  const closeVideoSession = () => {
    setIsVideoOpen(false);
    setCurrentVideoUrl('');
    setCurrentAppointment(null);
  };

  // Session template handlers
  const openSessionTemplate = async (appointment: Appointment) => {
    console.log('[openSessionTemplate] STEP 1 - Starting session template with appointment:', {
      appointmentId: appointment.id,
      clientId: appointment.client_id,
      appointmentDate: appointment.start_at,
      clientName: appointment.client ? `${appointment.client.client_first_name} ${appointment.client.client_last_name}` : 'No client data in appointment'
    });

    setCurrentAppointment(appointment);
    setShowSessionTemplate(true);
    setIsLoadingClientData(true);
    
    try {
      console.log('[openSessionTemplate] STEP 2 - About to fetch client data with ID:', appointment.client_id);
      
      // Fetch complete client data from database
      const { data: fullClientData, error } = await supabase
        .from('clients')
        .select('*')
        .eq('id', appointment.client_id)
        .maybeSingle();

      console.log('[openSessionTemplate] STEP 3 - Database query result:', {
        error: error,
        hasData: !!fullClientData,
        clientDataKeys: fullClientData ? Object.keys(fullClientData) : null,
        clientName: fullClientData ? `${fullClientData.client_first_name} ${fullClientData.client_last_name}` : null,
        clientDOB: fullClientData?.client_date_of_birth,
        primaryObjective: fullClientData?.client_primaryobjective,
        intervention1: fullClientData?.client_intervention1,
        diagnosis: fullClientData?.client_diagnosis
      });

      if (error) {
        console.error('[openSessionTemplate] STEP 4 - Error fetching client data:', error);
        toast({
          title: "Warning",
          description: "Could not load complete client data.",
          variant: "default",
        });
        
        // Fallback to basic data from appointment
        if (appointment.client) {
          const fallbackData = {
            id: appointment.client_id,
            client_first_name: appointment.client.client_first_name,
            client_last_name: appointment.client.client_last_name,
            client_preferred_name: appointment.client.client_preferred_name
          } as any;
          
          console.log('[openSessionTemplate] STEP 4b - Setting fallback client data:', fallbackData);
          setClientData(fallbackData);
        } else {
          console.log('[openSessionTemplate] STEP 4c - No fallback data available, setting null');
          setClientData(null);
        }
      } else if (!fullClientData) {
        console.warn('[openSessionTemplate] STEP 5 - No client data found for ID:', appointment.client_id);
        setClientData(null);
      } else {
        console.log('[openSessionTemplate] STEP 5 - Setting full client data:', {
          clientId: fullClientData.id,
          clientName: `${fullClientData.client_first_name} ${fullClientData.client_last_name}`,
          hasDOB: !!fullClientData.client_date_of_birth,
          hasPrimaryObjective: !!fullClientData.client_primaryobjective,
          hasIntervention1: !!fullClientData.client_intervention1,
          totalFields: Object.keys(fullClientData).length
        });
        setClientData(fullClientData);
      }
    } catch (error) {
      console.error('[openSessionTemplate] STEP 6 - Catch block error:', error);
      toast({
        title: "Error",
        description: "Failed to load client data.",
        variant: "destructive",
      });
      setClientData(null);
    } finally {
      console.log('[openSessionTemplate] STEP 7 - Cleanup - setting loading to false');
      setIsLoadingClientData(false);
    }
  };

  const closeSessionTemplate = () => {
    setShowSessionTemplate(false);
    setCurrentAppointment(null);
    setClientData(null);
  };

  const handleSessionDidNotOccur = (appointment: Appointment) => {
    setSelectedAppointmentForNoShow(appointment);
    setShowSessionDidNotOccurDialog(true);
  };

  const closeSessionDidNotOccurDialog = () => {
    setShowSessionDidNotOccurDialog(false);
    setSelectedAppointmentForNoShow(null);
    // Refetch appointments after status update
    if (userId) {
      fetchClinicianAppointments(userId).then(setAppointments);
    }
  };

  // Create a type adapter function for SessionNoteTemplate
  const prepareClientDataForTemplate = (): ClientDetails | null => {
    if (!clientData) return null;
    
    // Now clientData should have all the fields from the database
    return clientData as ClientDetails;
  };

  console.log("[ClinicianDashboard] Rendering with stabilized data management:", {
    clinicianTimeZone,
    safeClinicianTimeZone,
    timeZoneDisplay,
    type: typeof safeClinicianTimeZone,
    isArray: Array.isArray(clinicianTimeZone),
    totalAppointments: appointments.length,
    todayCount: appointmentCategories.today.length,
    upcomingCount: appointmentCategories.upcoming.length,
    outstandingCount: appointmentCategories.outstanding.length
  });

  if (showSessionTemplate && currentAppointment) {
    return (
      <Layout>
        <SessionNoteTemplate 
          onClose={closeSessionTemplate}
          appointment={currentAppointment}
          clinicianName={userId}
          clientData={prepareClientDataForTemplate()}
        />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto">
        <h1 className="text-2xl font-bold mb-6">Clinician Dashboard</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Today's Appointments */}
          <div>
            <AppointmentsList
              title="Today's Appointments"
              icon={<Calendar className="h-5 w-5 mr-2" />}
              appointments={appointmentCategories.today}
              isLoading={isLoadingAppointments || isLoadingTimeZone}
              error={error}
              emptyMessage="No appointments scheduled for today."
              timeZoneDisplay={timeZoneDisplay}
              userTimeZone={safeClinicianTimeZone}
              showStartButton={true}
              onStartSession={startVideoSession}
            />
          </div>
          
          {/* Outstanding Documentation */}
          <div>
            <AppointmentsList
              title="Outstanding Documentation"
              icon={<AlertCircle className="h-5 w-5 mr-2" />}
              appointments={appointmentCategories.outstanding}
              isLoading={isLoadingAppointments || isLoadingTimeZone || isLoadingClientData}
              error={error}
              emptyMessage="No outstanding documentation."
              timeZoneDisplay={timeZoneDisplay}
              userTimeZone={safeClinicianTimeZone}
              onDocumentSession={openSessionTemplate}
              onSessionDidNotOccur={handleSessionDidNotOccur}
            />
          </div>
          
          {/* Upcoming Appointments */}
          <div>
            <AppointmentsList
              title="Upcoming Appointments"
              icon={<Calendar className="h-5 w-5 mr-2" />}
              appointments={appointmentCategories.upcoming}
              isLoading={isLoadingAppointments || isLoadingTimeZone}
              error={error}
              emptyMessage="No upcoming appointments scheduled."
              timeZoneDisplay={timeZoneDisplay}
              userTimeZone={safeClinicianTimeZone}
              showViewAllButton={true}
            />
          </div>
        </div>
      </div>
      
      {/* Video Chat Component */}
      {isVideoOpen && (
        <VideoChat
          roomUrl={currentVideoUrl}
          isOpen={isVideoOpen}
          onClose={closeVideoSession}
        />
      )}

      {/* Session Did Not Occur Dialog */}
      {showSessionDidNotOccurDialog && selectedAppointmentForNoShow && (
        <SessionDidNotOccurDialog
          isOpen={showSessionDidNotOccurDialog}
          onClose={closeSessionDidNotOccurDialog}
          appointmentId={selectedAppointmentForNoShow.id}
          onStatusUpdate={() => {
            // Refetch appointments after status update
            if (userId) {
              fetchClinicianAppointments(userId).then(setAppointments);
            }
          }}
        />
      )}
    </Layout>
  );
};

export default ClinicianDashboard;
