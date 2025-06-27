import React, { useState, useEffect, useRef } from 'react';
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

const ClinicianDashboard = () => {
  const { userRole, userId } = useUser();
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
  const refreshTrigger = 0;

  // Ensure timezone is always a string
  const safeClinicianTimeZone = Array.isArray(clinicianTimeZone) ? clinicianTimeZone[0] : clinicianTimeZone;
  const timeZoneDisplay = TimeZoneService.getTimeZoneDisplayName(safeClinicianTimeZone);

  // Fetch clinician profile
  useEffect(() => {
    if (!userId || dataFetchCountRef.current >= 3) return;
    
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
    if (!userId || dataFetchCountRef.current >= 3) return;
    
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

  // Fetch clinician's appointments
  useEffect(() => {
    if (!userId || dataFetchCountRef.current >= 3) return;
    
    dataFetchCountRef.current++;
    
    const fetchAppointments = async () => {
      setIsLoadingAppointments(true);
      try {
        const appointmentsData = await fetchClinicianAppointments(userId);
        setAppointments(appointmentsData);
        setError(null);
      } catch (error) {
        console.error("Error fetching clinician appointments:", error);
        setError(error as Error);
      } finally {
        setIsLoadingAppointments(false);
      }
    };
    
    fetchAppointments();
  }, [userId, refreshTrigger]);

  // Process appointments into categories
  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

  const todayAppointments = appointments.filter(apt => {
    const aptDate = new Date(apt.start_at);
    return aptDate >= todayStart && aptDate < todayEnd && apt.status !== 'cancelled';
  });

  const upcomingAppointments = appointments.filter(apt => {
    const aptDate = new Date(apt.start_at);
    return aptDate >= todayEnd && apt.status !== 'cancelled';
  });

  const pastAppointments = appointments.filter(apt => {
    const aptDate = new Date(apt.start_at);
    return aptDate < todayStart && apt.status === 'completed' && !apt.notes;
  });

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
  const openSessionTemplate = (appointment: Appointment) => {
    setCurrentAppointment(appointment);
    setShowSessionTemplate(true);
    
    // Set client data from appointment
    if (appointment.client) {
      setClientData({
        client_first_name: appointment.client.client_first_name,
        client_last_name: appointment.client.client_last_name,
        client_preferred_name: appointment.client.client_preferred_name
      });
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
    
    return {
      id: currentAppointment?.client_id || '',
      client_first_name: clientData.client_first_name || null,
      client_last_name: clientData.client_last_name || null,
      client_preferred_name: clientData.client_preferred_name || null,
      client_email: null,
      client_phone: null,
      client_date_of_birth: null,
      client_age: null,
      client_gender: null,
      client_gender_identity: null,
      client_state: null,
      client_time_zone: null,
      client_minor: null,
      client_status: null,
      client_assigned_therapist: null,
      client_referral_source: null,
      client_self_goal: null,
      client_diagnosis: null,
      client_insurance_company_primary: null,
      client_policy_number_primary: null,
      client_group_number_primary: null,
      client_subscriber_name_primary: null,
      client_insurance_type_primary: null,
      client_subscriber_dob_primary: null,
      client_subscriber_relationship_primary: null,
      client_insurance_company_secondary: null,
      client_policy_number_secondary: null,
      client_group_number_secondary: null,
      client_subscriber_name_secondary: null,
      client_insurance_type_secondary: null,
      client_subscriber_dob_secondary: null,
      client_subscriber_relationship_secondary: null,
      client_insurance_company_tertiary: null,
      client_policy_number_tertiary: null,
      client_group_number_tertiary: null,
      client_subscriber_name_tertiary: null,
      client_insurance_type_tertiary: null,
      client_subscriber_dob_tertiary: null,
      client_subscriber_relationship_tertiary: null,
      client_planlength: null,
      client_treatmentfrequency: null,
      client_problem: null,
      client_treatmentgoal: null,
      client_primaryobjective: null,
      client_secondaryobjective: null,
      client_tertiaryobjective: null,
      client_intervention1: null,
      client_intervention2: null,
      client_intervention3: null,
      client_intervention4: null,
      client_intervention5: null,
      client_intervention6: null,
      client_nexttreatmentplanupdate: null,
      client_privatenote: null,
      client_appearance: null,
      client_attitude: null,
      client_behavior: null,
      client_speech: null,
      client_affect: null,
      client_thoughtprocess: null,
      client_perception: null,
      client_orientation: null,
      client_memoryconcentration: null,
      client_insightjudgement: null,
      client_mood: null,
      client_substanceabuserisk: null,
      client_suicidalideation: null,
      client_homicidalideation: null,
      client_functioning: null,
      client_prognosis: null,
      client_progress: null,
      client_sessionnarrative: null,
      client_medications: null,
      client_personsinattendance: null,
      client_currentsymptoms: null,
      client_vacoverage: null,
      client_champva: null,
      client_tricare_beneficiary_category: null,
      client_tricare_sponsor_name: null,
      client_tricare_sponsor_branch: null,
      client_tricare_sponsor_id: null,
      client_tricare_plan: null,
      client_tricare_region: null,
      client_tricare_policy_id: null,
      client_tricare_has_referral: null,
      client_tricare_referral_number: null,
      client_recentdischarge: null,
      client_branchOS: null,
      client_disabilityrating: null,
      client_relationship: null,
      client_is_profile_complete: null,
      client_treatmentplan_startdate: null,
      client_temppassword: null,
      client_primary_payer_id: null,
      client_secondary_payer_id: null,
      client_tertiary_payer_id: null,
      eligibility_status_primary: null,
      eligibility_last_checked_primary: null,
      eligibility_claimmd_id_primary: null,
      eligibility_response_details_primary_json: null,
      eligibility_copay_primary: null,
      eligibility_deductible_primary: null,
      eligibility_coinsurance_primary_percent: null,
      stripe_customer_id: null,
      client_city: null,
      client_zipcode: null,
      client_address: null,
      client_zip_code: null
    };
  };

  console.log("[ClinicianDashboard] Rendering with corrected data management:", {
    clinicianTimeZone,
    safeClinicianTimeZone,
    timeZoneDisplay,
    refreshTrigger,
    type: typeof safeClinicianTimeZone,
    isArray: Array.isArray(clinicianTimeZone)
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
              appointments={todayAppointments}
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
              appointments={pastAppointments}
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
              appointments={upcomingAppointments}
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
