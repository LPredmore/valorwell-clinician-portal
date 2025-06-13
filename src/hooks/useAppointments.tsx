import { useState, useEffect, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase, getOrCreateVideoRoom } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { TimeZoneService } from "@/utils/timeZoneService";
import { DateTime } from "luxon";
import { Appointment } from "@/types/appointment";
import { formatClientName } from "@/utils/appointmentUtils";

// Interface for the raw Supabase response
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
  clients: {
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
    client_zipcode: string | null;
  } | null;
}

// Extended appointment type for the display formatting
interface FormattedAppointment extends Appointment {
  formattedDate?: string;
  formattedStartTime?: string;
  formattedEndTime?: string;
}

/**
 * useAppointments hook - Optimized for performance
 * Simplified timezone calculations and reduced expensive operations
 */
export const useAppointments = (
  clinicianId: string | null,
  fromDate?: Date,
  toDate?: Date,
  timeZone?: string,
  refreshTrigger: number = 0
) => {
  const { toast } = useToast();
  const [currentAppointment, setCurrentAppointment] = useState<Appointment | null>(null);
  const [isVideoOpen, setIsVideoOpen] = useState(false);
  const [currentVideoUrl, setCurrentVideoUrl] = useState("");
  const [showSessionTemplate, setShowSessionTemplate] = useState(false);
  const [sessionClientData, setSessionClientData] = useState<Appointment["client"] | null>(null);
  const [isLoadingSessionClientData, setIsLoadingSessionClientData] = useState(false);

  // Ensure we have a valid clinician ID
  const formattedClinicianId = clinicianId || null;
  
  // Ensure we have a valid timezone
  const safeUserTimeZone = useMemo(() => {
    return TimeZoneService.ensureIANATimeZone(timeZone || TimeZoneService.DEFAULT_TIMEZONE);
  }, [timeZone]);

  /**
   * Calculate date range for appointments query - optimized to reduce calculations
   */
  const { fromUTCISO, toUTCISO } = useMemo(() => {
    try {
      // Use current week if no dates provided
      if (!fromDate && !toDate) {
        const now = DateTime.now().setZone(safeUserTimeZone);
        return {
          fromUTCISO: now.startOf('week').toUTC().toISO(),
          toUTCISO: now.endOf('week').toUTC().toISO()
        };
      }
      
      // Calculate from date if provided
      const fromISO = fromDate 
        ? DateTime.fromJSDate(fromDate)
            .setZone(safeUserTimeZone)
            .startOf('day')
            .toUTC()
            .toISO()
        : undefined;
      
      // Calculate to date if provided
      const toISO = toDate
        ? DateTime.fromJSDate(toDate)
            .setZone(safeUserTimeZone)
            .endOf('day')
            .toUTC()
            .toISO()
        : undefined;
      
      return { fromUTCISO: fromISO, toUTCISO: toISO };
    } catch (e) {
      console.error("Error converting date range:", e);
      return {};
    }
  }, [fromDate, toDate, safeUserTimeZone]);

  // Enable query if we have a clinician ID
  const queryEnabled = Boolean(formattedClinicianId);

  // Optimized query function
  const fetchAppointments = useCallback(async (): Promise<Appointment[]> => {
    // Early return if no clinician ID
    if (!formattedClinicianId) {
      return [];
    }
    
    // Build the query with proper date filters
    let query = supabase
      .from("appointments")
      .select(
        `id, client_id, clinician_id, start_at, end_at, type, status, 
         appointment_recurring, recurring_group_id, video_room_url, notes, 
         appointment_timezone, clients (client_first_name, client_last_name, 
         client_preferred_name, client_email, client_phone, client_status, 
         client_date_of_birth, client_gender, client_address, client_city, 
         client_state, client_zipcode)`
      )
      .eq("clinician_id", formattedClinicianId)
      .in("status", ["scheduled", "blocked"]);
    
    // Apply date range filters if provided
    if (fromUTCISO) query = query.gte("start_at", fromUTCISO);
    if (toUTCISO) query = query.lte("end_at", toUTCISO);
    
    // Order by start time
    query = query.order("start_at", { ascending: true });
    
    // Execute the query
    const { data: rawDataAny, error: queryError } = await query;
    
    // Handle errors
    if (queryError) {
      console.error("Error fetching appointments:", queryError.message);
      throw new Error(queryError.message);
    }
    
    // Handle empty results
    if (!rawDataAny || rawDataAny.length === 0) {
      return [];
    }

    // Process the data with optimized client name formatting
    return rawDataAny.map((rawAppt: any): Appointment => {
      // Process client data efficiently
      const rawClientData = rawAppt.clients;
      let clientData: Appointment["client"] | undefined;

      if (rawClientData) {
        // Handle both object and array structures
        const clientInfo = Array.isArray(rawClientData) ? rawClientData[0] : rawClientData;

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

      // Use standardized client name formatting function
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
        appointment_timezone: rawAppt.appointment_timezone,
        client: clientData,
        clientName: clientName,
      };
    });
  }, [formattedClinicianId, fromUTCISO, toUTCISO]);

  // Use the query with optimized dependencies
  const {
    data: fetchedAppointments = [],
    isLoading,
    error,
    refetch: refetchAppointments,
  } = useQuery<Appointment[], Error>({
    queryKey: ["appointments", formattedClinicianId, fromUTCISO, toUTCISO, refreshTrigger],
    queryFn: fetchAppointments,
    enabled: queryEnabled,
  });

  // Optimized helper function to add display formatting
  const addDisplayFormattingToAppointment = useCallback((
    appointment: Appointment,
    displayTimeZone: string
  ): FormattedAppointment => {
    const safeDisplayZone = TimeZoneService.ensureIANATimeZone(displayTimeZone);
    const result: FormattedAppointment = { ...appointment };

    if (appointment.start_at) {
      try {
        const startDateTime = TimeZoneService.fromUTC(appointment.start_at, safeDisplayZone);
        result.formattedStartTime = TimeZoneService.formatTime(startDateTime);
        result.formattedDate = TimeZoneService.formatDate(startDateTime, "yyyy-MM-dd");
      } catch (e) {
        console.error("Error formatting start_at", e);
      }
    }

    if (appointment.end_at) {
      try {
        const endDateTime = TimeZoneService.fromUTC(appointment.end_at, safeDisplayZone);
        result.formattedEndTime = TimeZoneService.formatTime(endDateTime);
      } catch (e) {
        console.error("Error formatting end_at", e);
      }
    }

    return result;
  }, []);

  // Memoized formatted appointments with optimized timezone handling
  const appointmentsWithDisplayFormatting = useMemo(() => {
    return fetchedAppointments.map((appt) => {
      const appointmentTimeZone = appt.appointment_timezone || safeUserTimeZone;
      return addDisplayFormattingToAppointment(appt, appointmentTimeZone);
    });
  }, [fetchedAppointments, safeUserTimeZone, addDisplayFormattingToAppointment]);
  
  // Efficiently categorize appointments in a single pass
  const { todayAppointments, upcomingAppointments, pastAppointments } = useMemo(() => {
    const now = DateTime.now().setZone(safeUserTimeZone);
    const today: FormattedAppointment[] = [];
    const upcoming: FormattedAppointment[] = [];
    const past: FormattedAppointment[] = [];
    
    appointmentsWithDisplayFormatting.forEach(appt => {
      if (!appt.start_at) return;
      
      try {
        const apptDateTime = DateTime.fromISO(appt.start_at)
          .setZone(appt.appointment_timezone || safeUserTimeZone);
        
        if (now.hasSame(apptDateTime, "day")) {
          today.push(appt);
        } else if (apptDateTime > now) {
          upcoming.push(appt);
        } else {
          past.push(appt);
        }
      } catch (e) {
        console.error("Error categorizing appointment:", e);
      }
    });
    
    return { todayAppointments: today, upcomingAppointments: upcoming, pastAppointments: past };
  }, [appointmentsWithDisplayFormatting, safeUserTimeZone]);

  // Session handling functions
  const startSession = useCallback(async (appointment: Appointment) => {
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
  }, [toast]);

  const documentSession = useCallback((appointment: Appointment) => {
    setCurrentAppointment(appointment);
    setSessionClientData(appointment.client || null);
    setShowSessionTemplate(true);
  }, []);

  const closeVideoSession = useCallback(() => setIsVideoOpen(false), []);
  const closeSessionTemplate = useCallback(() => setShowSessionTemplate(false), []);

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
