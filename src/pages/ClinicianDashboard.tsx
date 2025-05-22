import React, { useState, useEffect, useMemo } from 'react';
import { Calendar, Clock, AlertCircle, Check } from 'lucide-react';
import { useUser } from '@/context/UserContext';
import { supabase } from '@/integrations/supabase/client';
import Layout from '@/components/layout/Layout';
import VideoChat from '@/components/video/VideoChat';
import { TimeZoneService } from '@/utils/timeZoneService';
import { AppointmentsList } from '@/components/dashboard/AppointmentsList';
import SessionNoteTemplate from '@/components/templates/SessionNoteTemplate';
import { useAppointments } from '@/hooks/useAppointments';
import { getClinicianTimeZone } from '@/hooks/useClinicianData';
import { SessionDidNotOccurDialog } from '@/components/dashboard/SessionDidNotOccurDialog';
import { Appointment } from '@/types/appointment';
import { ClientDetails } from '@/types/client';
import { useGoogleCalendar } from '@/hooks/useGoogleCalendar';
import { Button } from '@/components/ui/button';
import { CalendarPlus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { DateTime } from 'luxon';
import { formatClientName } from '@/utils/appointmentUtils';

const ClinicianDashboard = () => {
  const { userRole, userId } = useUser();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [clinicianId, setClinicianId] = useState<string | null>(null); // Add explicit clinicianId state
  const [clinicianTimeZone, setClinicianTimeZone] = useState<string>(TimeZoneService.DEFAULT_TIMEZONE);
  const [isLoadingTimeZone, setIsLoadingTimeZone] = useState(true);
  const timeZoneDisplay = TimeZoneService.getTimeZoneDisplayName(clinicianTimeZone);
  const [showSessionDidNotOccurDialog, setShowSessionDidNotOccurDialog] = useState(false);
  const [selectedAppointmentForNoShow, setSelectedAppointmentForNoShow] = useState<Appointment | null>(null);
  const [showGoogleSyncDialog, setShowGoogleSyncDialog] = useState(false);
  const { toast } = useToast();

  // First fetch the auth user ID
  useEffect(() => {
    const fetchUserId = async () => {
      const { data } = await supabase.auth.getUser();
      if (data?.user) {
        console.log("[ClinicianDashboard] Auth user ID:", data.user.id);
        setCurrentUserId(data.user.id);
      }
    };
    
    fetchUserId();
  }, []);

  // Then resolve the clinician ID from the user ID
  useEffect(() => {
    const resolveClinicianId = async () => {
      if (!currentUserId) return;
      
      try {
        // First try to get profile to find email
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('email, user_role')
          .eq('id', currentUserId)
          .single();
          
        if (profileError) {
          console.error("[ClinicianDashboard] Error fetching profile:", profileError);
          return;
        }
        
        console.log("[ClinicianDashboard] Profile data:", profileData);
        
        if (profileData && profileData.email) {
          // Look up clinician by email
          const { data: clinicianData, error: clinicianError } = await supabase
            .from('clinicians')
            .select('id, clinician_email, clinician_time_zone, clinician_timezone')
            .eq('clinician_email', profileData.email)
            .single();
            
          if (clinicianError) {
            console.error("[ClinicianDashboard] Error looking up clinician by email:", clinicianError);
          }
          
          if (clinicianData) {
            console.log("[ClinicianDashboard] Found clinician by email:", {
              id: clinicianData.id, 
              email: clinicianData.clinician_email,
              timeZone: clinicianData.clinician_time_zone,
              timeZoneArray: clinicianData.clinician_timezone
            });
            setClinicianId(clinicianData.id);
            
            // Check and update timezone arrays if missing
            if (!clinicianData.clinician_timezone && clinicianData.clinician_time_zone) {
              console.log("[ClinicianDashboard] Fixing missing timezone array with:", clinicianData.clinician_time_zone);
              
              const { error: updateError } = await supabase
                .from('clinicians')
                .update({ clinician_timezone: [clinicianData.clinician_time_zone] })
                .eq('id', clinicianData.id);
                
              if (updateError) {
                console.error("[ClinicianDashboard] Error fixing timezone array:", updateError);
              }
            }
            
            return;
          }
          
          // If not found by email, try by profile_id
          const { data: altClinicianData, error: altError } = await supabase
            .from('clinicians')
            .select('id, clinician_email, clinician_time_zone, clinician_timezone')
            .eq('profile_id', currentUserId)
            .single();
            
          if (altError) {
            console.error("[ClinicianDashboard] Error looking up clinician by profile_id:", altError);
          }
          
          if (altClinicianData) {
            console.log("[ClinicianDashboard] Found clinician by profile_id:", {
              id: altClinicianData.id, 
              email: altClinicianData.clinician_email,
              timeZone: altClinicianData.clinician_time_zone,
              timeZoneArray: altClinicianData.clinician_timezone
            });
            setClinicianId(altClinicianData.id);
            
            // Check and update timezone arrays if missing
            if (!altClinicianData.clinician_timezone && altClinicianData.clinician_time_zone) {
              console.log("[ClinicianDashboard] Fixing missing timezone array with:", altClinicianData.clinician_time_zone);
              
              const { error: updateError } = await supabase
                .from('clinicians')
                .update({ clinician_timezone: [altClinicianData.clinician_time_zone] })
                .eq('id', altClinicianData.id);
                
              if (updateError) {
                console.error("[ClinicianDashboard] Error fixing timezone array:", updateError);
              }
            }
          }
        }
      } catch (error) {
        console.error("[ClinicianDashboard] Error resolving clinician ID:", error);
      }
    };
    
    resolveClinicianId();
  }, [currentUserId]);

  // Fetch clinician's timezone
  useEffect(() => {
    const fetchClinicianTimeZone = async () => {
      if (clinicianId) {
        setIsLoadingTimeZone(true);
        try {
          const timeZone = await getClinicianTimeZone(clinicianId);
          console.log("[ClinicianDashboard] Fetched clinician timezone:", timeZone);
          setClinicianTimeZone(timeZone);
        } catch (error) {
          console.error("[ClinicianDashboard] Error fetching clinician timezone:", error);
          // Fallback to system timezone
          setClinicianTimeZone(TimeZoneService.DEFAULT_TIMEZONE);
        } finally {
          setIsLoadingTimeZone(false);
        }
      }
    };
    
    fetchClinicianTimeZone();
  }, [clinicianId]);

  // Integrate Google Calendar hook
  const { 
    isConnected: isGoogleConnected, 
    isLoading: isGoogleLoading, 
    isSyncing,
    connectGoogleCalendar, 
    syncMultipleAppointments 
  } = useGoogleCalendar();

  // Use the explicit clinicianId instead of the raw userId
  const {
    appointments,
    todayAppointments,
    upcomingAppointments,
    pastAppointments,
    isLoading,
    error,
    refetch,
    currentAppointment,
    isVideoOpen,
    currentVideoUrl,
    showSessionTemplate,
    clientData,
    isLoadingClientData,
    startVideoSession,
    openSessionTemplate,
    closeSessionTemplate,
    closeVideoSession,
    debug
  } = useAppointments(clinicianId);
  
  // Log debug info from hook
  useEffect(() => {
    console.log("[ClinicianDashboard] useAppointments debug info:", debug);
  }, [debug]);

  const handleSessionDidNotOccur = (appointment: Appointment) => {
    setSelectedAppointmentForNoShow(appointment);
    setShowSessionDidNotOccurDialog(true);
  };

  const closeSessionDidNotOccurDialog = () => {
    setShowSessionDidNotOccurDialog(false);
    setSelectedAppointmentForNoShow(null);
  };

  // Function to sync all upcoming appointments with Google Calendar
  const syncAppointmentsWithGoogle = async () => {
    try {
      console.log("[ClinicianDashboard] Starting Google Calendar sync...");
      
      // Use today's date + 1 month for future appointments
      const today = DateTime.now();
      const futureDate = today.plus({ months: 1 });
      
      // Fetch all scheduled appointments for this clinician directly
      const { data: allScheduledAppointments, error: fetchError } = await supabase
        .from("appointments")
        .select(
          `id, client_id, clinician_id, start_at, end_at, type, status, appointment_recurring, recurring_group_id, video_room_url, notes, clients (client_first_name, client_last_name, client_preferred_name, client_email, client_phone, client_status, client_date_of_birth, client_gender, client_address, client_city, client_state, client_zipcode)`
        )
        .eq("clinician_id", clinicianId)
        .eq("status", "scheduled")
        .gte("start_at", today.toISO())
        .lte("start_at", futureDate.toISO());
        
      if (fetchError) {
        console.error("[ClinicianDashboard] Error fetching appointments for sync:", fetchError);
        toast({
          title: "Error syncing appointments",
          description: "Failed to fetch your appointments for synchronization.",
          variant: "destructive",
        });
        return;
      }
      
      if (!allScheduledAppointments || allScheduledAppointments.length === 0) {
        console.log("[ClinicianDashboard] No appointments found for sync");
        toast({
          title: "No appointments to sync",
          description: "You don't have any upcoming appointments to synchronize.",
          variant: "default",
        });
        return;
      }
      
      // Process appointments into the right format
      const appointmentsToSync = allScheduledAppointments.map((rawAppt: any): Appointment => {
        // Process client data from the join
        const rawClientData = rawAppt.clients;
        let clientData: Appointment["client"] | undefined;

        if (rawClientData) {
          // Handle both object and array structures
          const clientInfo = Array.isArray(rawClientData)
            ? rawClientData[0]
            : rawClientData;

          if (clientInfo && typeof clientInfo === "object") {
            clientData = {
              client_first_name: clientInfo.client_first_name || "",
              client_last_name: clientInfo.client_last_name || "",
              client_preferred_name: clientInfo.client_preferred_name || "",
              client_email: clientInfo.client_email || "",
              client_phone: clientInfo.client_phone || "",
              client_status: clientInfo.client_status || null,
              client_date_of_birth: clientInfo.client_date_of_birth || null,
              client_gender: clientInfo.client_gender || null,
              client_address: clientInfo.client_address || null,
              client_city: clientInfo.client_city || null,
              client_state: clientInfo.client_state || null,
              client_zipcode: clientInfo.client_zipcode || null
            };
          }
        }

        // Format client name using the shared utility
        const clientName = formatClientName(clientData);

        return {
          id: rawAppt.id,
          client_id: rawAppt.client_id,
          clinician_id: rawAppt.clinician_id,
          start_at: rawAppt.start_at,
          end_at: rawAppt.end_at,
          type: rawAppt.type,
          status: rawAppt.status,
          appointment_recurring: rawAppt.appointment_recurring,
          recurring_group_id: rawAppt.recurring_group_id,
          video_room_url: rawAppt.video_room_url,
          notes: rawAppt.notes,
          client: clientData,
          clientName: clientName,
        };
      });
      
      console.log(`[ClinicianDashboard] Found ${appointmentsToSync.length} appointments to sync with date range:`, {
        from: today.toISO(),
        to: futureDate.toISO()
      });

      // Log the first few appointments for debugging
      if (appointmentsToSync.length > 0) {
        console.log("[ClinicianDashboard] Sample appointments to sync:", 
          appointmentsToSync.slice(0, 3).map(a => ({
            id: a.id,
            client: a.clientName,
            start: a.start_at,
            end: a.end_at
          }))
        );
      }
      
      const results = await syncMultipleAppointments(appointmentsToSync);
      console.log("[ClinicianDashboard] Google Calendar sync complete, results:", results);
      
    } catch (error) {
      console.error("[ClinicianDashboard] Failed to sync with Google Calendar:", error);
      toast({
        title: "Sync failed",
        description: "Failed to synchronize appointments with Google Calendar.",
        variant: "destructive",
      });
    }
  };

  // Create a type adapter function to ensure clientData is handled properly by SessionNoteTemplate
  const prepareClientDataForTemplate = (): ClientDetails | null => {
    if (!clientData) return null;
    
    // Create a ClientDetails object with the available data
    // Only include fields that we can safely access from clientData
    // Add null defaults for all properties required by ClientDetails
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
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Clinician Dashboard</h1>
          
          <Button
            variant={isGoogleConnected ? "outline" : "default"}
            size="sm"
            disabled={isGoogleLoading || isSyncing}
            onClick={isGoogleConnected ? syncAppointmentsWithGoogle : connectGoogleCalendar}
            className="flex items-center gap-2"
          >
            {isGoogleLoading || isSyncing ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900 mr-2"></div>
                {isSyncing ? "Syncing..." : "Connecting..."}
              </div>
            ) : isGoogleConnected ? (
              <>
                <Check className="w-4 h-4 text-green-500" />
                <span>Sync with Google Calendar</span>
              </>
            ) : (
              <>
                <CalendarPlus className="w-4 h-4" />
                <span>Connect Google Calendar</span>
              </>
            )}
          </Button>
        </div>
        
        {/* Debug info in dev mode */}
        {process.env.NODE_ENV !== 'production' && (
          <div className="mb-4 p-2 border rounded-md bg-gray-50">
            <h4 className="text-xs font-semibold">Debug Info</h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <p>Auth User ID: {currentUserId || 'Not set'}</p>
              <p>Clinician ID: {clinicianId || 'Not resolved'}</p>
              <p>Timezone: {clinicianTimeZone}</p>
              <p>Appointments: {appointments?.length || 0}</p>
            </div>
          </div>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Today's Appointments */}
          <div>
            <AppointmentsList
              title="Today's Appointments"
              icon={<Calendar className="h-5 w-5 mr-2" />}
              appointments={todayAppointments}
              isLoading={isLoading || isLoadingTimeZone}
              error={error}
              emptyMessage="No appointments scheduled for today."
              timeZoneDisplay={timeZoneDisplay}
              userTimeZone={clinicianTimeZone}
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
              isLoading={isLoading || isLoadingTimeZone || isLoadingClientData}
              error={error}
              emptyMessage="No outstanding documentation."
              timeZoneDisplay={timeZoneDisplay}
              userTimeZone={clinicianTimeZone}
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
              isLoading={isLoading || isLoadingTimeZone}
              error={error}
              emptyMessage="No upcoming appointments scheduled."
              timeZoneDisplay={timeZoneDisplay}
              userTimeZone={clinicianTimeZone}
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
          onStatusUpdate={refetch}
        />
      )}
    </Layout>
  );
};

export default ClinicianDashboard;
