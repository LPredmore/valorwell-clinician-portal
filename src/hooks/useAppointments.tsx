
import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase, getOrCreateVideoRoom } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { TimeZoneService } from "@/utils/timeZoneService";
import { DateTime } from "luxon";
import { Appointment } from "@/types/appointment";
import { formatClientName } from "@/utils/appointmentUtils";

// Interface for the raw Supabase response - simplified for debugging
interface RawSupabaseAppointment {
  id: string;
  client_id: string;
  clinician_id: string;
  start_at: string;
  end_at: string;
  type: string;
  status: string;
  appointment_recurring: string | null;
  recurring_group_id: string | null;
  video_room_url: string | null;
  notes: string | null;
  appointment_timezone: string | null;
  clients?: {
    client_first_name: string | null;
    client_last_name: string | null;
    client_preferred_name: string | null;
    client_email: string | null;
    client_phone: string | null;
    client_status: string | null;
    client_date_of_birth: string | null;
    client_gender: string | null;
    client_address: string | null;
    client_city: string | null;
    client_state: string | null;
    client_zip_code: string | null; // FIXED: Updated to match database schema
  } | null;
}

// Extended appointment type for the display formatting
interface FormattedAppointment extends Appointment {
  formattedDate?: string;
  formattedStartTime?: string;
  formattedEndTime?: string;
}

export const useAppointments = (
  clinicianId: string | null,
  fromDate?: Date,
  toDate?: Date,
  timeZone?: string,
  refreshTrigger: number = 0
) => {
  const { toast } = useToast();
  const [currentAppointment, setCurrentAppointment] =
    useState<Appointment | null>(null);
  const [isVideoOpen, setIsVideoOpen] = useState(false);
  const [currentVideoUrl, setCurrentVideoUrl] = useState("");
  const [showSessionTemplate, setShowSessionTemplate] = useState(false);
  const [sessionClientData, setSessionClientData] = useState<
    Appointment["client"] | null
  >(null);
  const [isLoadingSessionClientData, setIsLoadingSessionClientData] =
    useState(false);

  const formattedClinicianId = clinicianId ? clinicianId : null;
  const safeUserTimeZone = TimeZoneService.ensureIANATimeZone(
    timeZone || TimeZoneService.DEFAULT_TIMEZONE
  );

  // Debug logging for parameters
  useEffect(() => {
    console.log('[useAppointments] Hook called with parameters:', {
      clinicianId: formattedClinicianId,
      fromDate: fromDate?.toISOString(),
      toDate: toDate?.toISOString(),
      timeZone: safeUserTimeZone,
      refreshTrigger
    });
  }, [formattedClinicianId, fromDate, toDate, safeUserTimeZone, refreshTrigger]);

  /**
   * Calculate date range for appointments query using proper UTC boundaries
   * CRITICAL FIX: Extend range to include adjacent appointments
   */
  const { fromUTCISO, toUTCISO } = useMemo(() => {
    // Use current week if no dates provided, but extend range for better coverage
    if (!fromDate && !toDate) {
      const now = DateTime.utc(); // Use UTC for consistency
      // Start from beginning of current week (Monday)
      const startOfWeek = now.startOf('week');
      // End at end of next week to catch Monday appointments
      const endOfWeek = now.endOf('week').plus({ days: 7 });
      
      console.log('[useAppointments] Extended week range for better coverage:', {
        startOfWeek: startOfWeek.toISO(),
        endOfWeek: endOfWeek.toISO(),
        currentDate: now.toISO()
      });
      
      return {
        fromUTCISO: startOfWeek.toISO(),
        toUTCISO: endOfWeek.toISO()
      };
    }
    
    let fromISO: string | undefined;
    let toISO: string | undefined;
    try {
      if (fromDate) {
        // CRITICAL FIX: Use UTC for boundary calculations to avoid timezone misalignment
        fromISO = DateTime.fromJSDate(fromDate, { zone: 'utc' })
          .startOf('day')
          .toISO();
      }
      
      if (toDate) {
        // CRITICAL FIX: Extend end date by one day to catch adjacent appointments
        toISO = DateTime.fromJSDate(toDate, { zone: 'utc' })
          .endOf('day')
          .plus({ days: 1 }) // Extend to next day to catch Monday appointments
          .toISO();
      }
      
      console.log('[useAppointments] FIXED Date range calculated:', {
        fromDate: fromDate?.toISOString(),
        toDate: toDate?.toISOString(),
        fromUTCISO: fromISO,
        toUTCISO: toISO,
        extendedRange: true
      });
      
      return { fromUTCISO: fromISO, toUTCISO: toISO };
    } catch (e) {
      console.error("[useAppointments] Error converting date range:", e);
      return {};
    }
  }, [fromDate, toDate]);

  // Enable query if we have a clinician ID
  const queryEnabled = Boolean(formattedClinicianId);

  const {
    data: fetchedAppointments = [],
    isLoading,
    error,
    refetch: refetchAppointments,
  } = useQuery<Appointment[], Error>({
    // Include refreshTrigger in the queryKey to force refresh when it changes
    queryKey: ["appointments", formattedClinicianId, fromUTCISO, toUTCISO, refreshTrigger],
    queryFn: async (): Promise<Appointment[]> => {

      if (!formattedClinicianId) {
        console.log("[useAppointments] STEP 1 - Returning empty array due to missing clinician ID");
        return [];
      }
      
      console.log(
        "[useAppointments] STEP 1 - Building Supabase Query with CLIENT DATA for clinician:",
        formattedClinicianId,
        { from: fromUTCISO, to: toUTCISO, refreshTrigger }
      );

      // Build the query WITH client data - FIXED column name
      let query = supabase
        .from("appointments")
        .select(`
          id,
          client_id,
          clinician_id,
          start_at,
          end_at,
          type,
          status,
          appointment_recurring,
          recurring_group_id,
          video_room_url,
          notes,
          appointment_timezone,
          clients!inner(
            client_first_name,
            client_last_name,
            client_preferred_name,
            client_email,
            client_phone,
            client_status,
            client_date_of_birth,
            client_gender,
            client_address,
            client_city,
            client_state,
            client_zip_code
          )
        `)
        .eq("clinician_id", formattedClinicianId)
        .in("status", ["scheduled", "blocked"]);

      console.log("[useAppointments] STEP 1 - Query with CLIENT DATA:", {
        baseQuery: "appointments table WITH clients join",
        clinicianFilter: `clinician_id = ${formattedClinicianId}`,
        statusFilter: "status IN (scheduled, blocked)",
        clientDataIncluded: true,
        fixedColumnName: "client_zip_code"
      });
      
      // Use proper temporal overlap detection
      if (fromUTCISO && toUTCISO) {
        query = query
          .lte("start_at", toUTCISO)
          .gte("end_at", fromUTCISO);
      } else if (fromUTCISO) {
        query = query.gte("end_at", fromUTCISO);
      } else if (toUTCISO) {
        query = query.lte("start_at", toUTCISO);
      }
      
      query = query.order("start_at", { ascending: true });
        
      console.log("[useAppointments] STEP 1 - EXECUTING SUPABASE QUERY WITH CLIENT DATA...");
      
      const { data: rawDataAny, error: queryError } = await query;

      console.log('[useAppointments] STEP 1 - Supabase Query Response WITH CLIENT DATA:', {
        hasData: !!rawDataAny,
        recordCount: rawDataAny?.length || 0,
        hasError: !!queryError,
        errorMessage: queryError?.message || null,
        sampleClientData: rawDataAny?.[0]?.clients || null
      });

      if (queryError) {
        console.error("[useAppointments] STEP 1 - Detailed Supabase Query Error:", queryError);
        throw new Error(`Supabase Query Failed: ${queryError.message} (${queryError.code})`);
      }

      if (!rawDataAny) {
        console.warn("[useAppointments] STEP 1 - No data returned from Supabase");
        return [];
      }

      console.log(`[useAppointments] STEP 1 - Processing ${rawDataAny.length || 0} raw appointments WITH CLIENT DATA.`);

      // Process the data WITH client information
      const processedAppointments = rawDataAny.map((rawAppt: any): Appointment => {
        const clientData = rawAppt.clients;
        const clientName = clientData 
          ? `${clientData.client_preferred_name || clientData.client_first_name || ''} ${clientData.client_last_name || ''}`.trim() || 'Unknown Client'
          : 'Unknown Client';

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
          appointment_timezone: rawAppt.appointment_timezone,
          client: clientData,
          clientName: clientName,
        };
      });

      console.log('[useAppointments] STEP 3 - Final processed appointments WITH CLIENT DATA:', {
        count: processedAppointments.length,
        sampleClientNames: processedAppointments.slice(0, 3).map(apt => apt.clientName)
      });

      return processedAppointments;
    },
    enabled: queryEnabled,
    retry: false, // FIXED: Disable retry to prevent infinite loops
    onError: (error: Error) => { // FIXED: Move error handling to onError callback
      console.error('[useAppointments] Query Error Details:', {
        errorMessage: error.message,
        errorStack: error.stack,
        errorName: error.name,
        fullError: error
      });
      
      toast({
        title: "Database Query Error",
        description: `Failed to load appointments: ${error.message}`,
        variant: "destructive"
      });
    }
  });

  // Log query results
  useEffect(() => {
    if (fetchedAppointments) {
      console.log('[useAppointments] FIXED Query completed successfully:', {
        appointmentsCount: fetchedAppointments.length,
        isLoading,
        error: error?.message,
        queryType: 'TEMPORAL_OVERLAP_DETECTION',
        sampleData: fetchedAppointments.slice(0, 3).map(apt => ({
          id: apt.id,
          clientName: apt.clientName,
          start_at: apt.start_at,
          appointment_timezone: apt.appointment_timezone
        }))
      });
    }
  }, [fetchedAppointments, isLoading, error]);

  // Helper function to add display formatting
  const addDisplayFormattingToAppointment = (
    appointment: Appointment,
    displayTimeZone: string
  ): FormattedAppointment => {
    const safeDisplayZone = TimeZoneService.ensureIANATimeZone(displayTimeZone);
    const result: FormattedAppointment = { ...appointment };

    if (appointment.start_at) {
      try {
        const startDateTime = TimeZoneService.fromUTC(
          appointment.start_at,
          safeDisplayZone
        );
        result.formattedStartTime = TimeZoneService.formatTime(startDateTime);
        result.formattedDate = TimeZoneService.formatDate(
          startDateTime,
          "yyyy-MM-dd"
        );
      } catch (e) {
        console.error("Error formatting start_at", e);
      }
    }

    if (appointment.end_at) {
      try {
        const endDateTime = TimeZoneService.fromUTC(
          appointment.end_at,
          safeDisplayZone
        );
        result.formattedEndTime = TimeZoneService.formatTime(endDateTime);
      } catch (e) {
        console.error("Error formatting end_at", e);
      }
    }

    return result;
  };

  // isAppointmentToday logic
  const isAppointmentToday = (appointment: Appointment): boolean => {
    if (!appointment.start_at) return false;

    try {
      // Use the appointment's saved timezone if available, otherwise fall back to user timezone
      const appointmentTimeZone = appointment.appointment_timezone || safeUserTimeZone;
      const now = DateTime.now().setZone(appointmentTimeZone);
      const apptDateTime = DateTime.fromISO(appointment.start_at).setZone(appointmentTimeZone);

      return now.hasSame(apptDateTime, "day");
    } catch (e) {
      console.error("[useAppointments] Error in isAppointmentToday:", e);
      return false;
    }
  };

  // Memoized formatted appointments - now using each appointment's saved timezone
  const appointmentsWithDisplayFormatting = useMemo(() => {
    return fetchedAppointments.map((appt) => {
      // Use the appointment's saved timezone if available, otherwise fall back to user timezone
      const appointmentTimeZone = appt.appointment_timezone || safeUserTimeZone;
      return addDisplayFormattingToAppointment(appt, appointmentTimeZone);
    });
  }, [fetchedAppointments, safeUserTimeZone]);
  

  // Memoized filtered appointments
  const todayAppointments = useMemo(() => {
    return appointmentsWithDisplayFormatting.filter(isAppointmentToday);
  }, [appointmentsWithDisplayFormatting]);

  const upcomingAppointments = useMemo(() => {
    return appointmentsWithDisplayFormatting.filter((appt) => {
      if (!appt.start_at) return false;

      try {
        // Use the appointment's saved timezone if available, otherwise fall back to user timezone
        const appointmentTimeZone = appt.appointment_timezone || safeUserTimeZone;
        const now = DateTime.now().setZone(appointmentTimeZone);
        const apptDateTime = DateTime.fromISO(appt.start_at).setZone(appointmentTimeZone);
        
        // Upcoming means: not today and in the future
        return apptDateTime > now && !now.hasSame(apptDateTime, "day");
      } catch (e) {
        console.error("[useAppointments] Error filtering upcoming:", e);
        return false;
      }
    });
  }, [appointmentsWithDisplayFormatting, safeUserTimeZone]);

  const pastAppointments = useMemo(() => {
    return appointmentsWithDisplayFormatting.filter((appt) => {
      if (!appt.start_at) return false;

      try {
        // Use the appointment's saved timezone if available, otherwise fall back to user timezone
        const appointmentTimeZone = appt.appointment_timezone || safeUserTimeZone;
        const now = DateTime.now().setZone(appointmentTimeZone);
        const apptDateTime = DateTime.fromISO(appt.start_at).setZone(appointmentTimeZone);
        
        // Past means: before now
        return apptDateTime < now;
      } catch (e) {
        console.error("[useAppointments] Error filtering past:", e);
        return false;
      }
    });
  }, [appointmentsWithDisplayFormatting, safeUserTimeZone]);

  // Session handling functions
  const startSession = async (appointment: Appointment) => {
    setCurrentAppointment(appointment);
    setIsLoadingSessionClientData(true);

    try {
      // Check if appointment has a video room URL, create one if not
      let videoRoomUrl = appointment.video_room_url;

      if (!videoRoomUrl) {
        const { url, error } = await getOrCreateVideoRoom(appointment.id);

        if (error) {
          console.error("[useAppointments] Error creating video room:", error);
          toast({
            title: "Error creating video session",
            description: error.message || "Could not create video session",
            variant: "destructive",
          });
          setIsLoadingSessionClientData(false);
          return;
        }

        videoRoomUrl = url;
      }

      setCurrentVideoUrl(videoRoomUrl);
      setSessionClientData(appointment.client || null);
      setIsVideoOpen(true);
    } catch (error) {
      console.error("[useAppointments] Error starting session:", error);
      toast({
        title: "Error starting session",
        description: "Could not start the video session",
        variant: "destructive",
      });
    } finally {
      setIsLoadingSessionClientData(false);
    }
  };

  const documentSession = (appointment: Appointment) => {
    setCurrentAppointment(appointment);
    setSessionClientData(appointment.client || null);
    setShowSessionTemplate(true);
  };

  const closeVideoSession = () => setIsVideoOpen(false);
  const closeSessionTemplate = () => setShowSessionTemplate(false);

  return {
    appointments: appointmentsWithDisplayFormatting,
    todayAppointments,
    upcomingAppointments,
    pastAppointments,
    isLoading,
    error,
    refetch: refetchAppointments,
    startVideoSession: startSession,
    openSessionTemplate: documentSession,
    isVideoOpen,
    closeVideoSession,
    closeSessionTemplate,
    currentVideoUrl,
    currentAppointment,
    showSessionTemplate,
    setShowSessionTemplate,
    clientData: sessionClientData,
    isLoadingClientData: isLoadingSessionClientData,
    addDisplayFormattingToAppointment,
  };
};
