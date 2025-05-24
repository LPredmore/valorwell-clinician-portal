import { useState, useEffect, useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase, getOrCreateVideoRoom } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import * as TimeZoneUtils from "@/utils/timeZoneUtils";
import { DateTime } from "luxon";
import { Appointment } from "@/types/appointment";
import { formatClientName } from "@/utils/appointmentUtils";
import { CalendarDebugUtils } from "@/utils/calendarDebugUtils";

// Component name for logging
const COMPONENT_NAME = 'useAppointments';

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

// Type guard to check if an object is a valid client data object from Supabase
function isValidClientData(obj: any): obj is {
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
} {
  return (
    obj &&
    typeof obj === "object" &&
    ("client_first_name" in obj ||
      "client_last_name" in obj ||
      "client_preferred_name" in obj ||
      "client_email" in obj ||
      "client_phone" in obj ||
      "client_status" in obj ||
      "client_date_of_birth" in obj ||
      "client_gender" in obj ||
      "client_address" in obj ||
      "client_city" in obj ||
      "client_state" in obj ||
      "client_zipcode" in obj)
  );
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
  refreshTrigger: number = 0 // Add the refreshTrigger parameter with default value
) => {
  // Performance tracking
  const hookStartTime = useRef(performance.now());
  const queryStartTime = useRef(0);
  const processingStartTime = useRef(0);
  
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
  const safeUserTimeZone = TimeZoneUtils.ensureIANATimeZone(
    timeZone || "America/Chicago"
  );
  
  // Log hook initialization
  useEffect(() => {
    CalendarDebugUtils.logLifecycle(COMPONENT_NAME, 'hook-initialized', {
      clinicianId,
      formattedClinicianId,
      fromDate: fromDate?.toISOString(),
      toDate: toDate?.toISOString(),
      timeZone: safeUserTimeZone,
      refreshTrigger
    });
    
    // Log UUID format validation
    const isUUIDFormat = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(clinicianId || "");
    if (clinicianId && !isUUIDFormat) {
      CalendarDebugUtils.warn(COMPONENT_NAME, 'Clinician ID is not in UUID format', {
        clinicianId,
        format: 'non-UUID'
      });
    }
  }, [clinicianId, formattedClinicianId, fromDate, toDate, safeUserTimeZone, refreshTrigger]);

  const { fromUTCISO, toUTCISO } = useMemo(() => {
    let fromISO: string | undefined;
    let toISO: string | undefined;
    
    // Start tracking date calculation time
    const dateCalcStart = performance.now();
    
    try {
      if (fromDate) {
        const fromDateTime = TimeZoneUtils.fromJSDate(fromDate, safeUserTimeZone)
          .startOf('day');
        fromISO = fromDateTime.toUTC().toISO();
        
        // Add 6 days to create a proper week window (since our view has 7 days)
        const weekEnd = fromDateTime
          .plus({ days: 6 })
          .endOf('day')
          .toUTC()
          .toISO();
          
        toISO = weekEnd;
        
        CalendarDebugUtils.log(COMPONENT_NAME, 'Date range calculated from fromDate', {
          fromDate: fromDate.toISOString(),
          fromISO,
          toISO,
          timezone: safeUserTimeZone
        });
      } else if (toDate) {
        // If only toDate exists, calculate a week window ending on toDate
        const toDateTime = TimeZoneUtils.fromJSDate(toDate, safeUserTimeZone)
          .endOf('day');
        toISO = toDateTime.toUTC().toISO();
            
        const weekStart = toDateTime
          .minus({ days: 6 })
          .startOf('day')
          .toUTC()
          .toISO();
          
        fromISO = weekStart;
        
        CalendarDebugUtils.log(COMPONENT_NAME, 'Date range calculated from toDate', {
          toDate: toDate.toISOString(),
          fromISO,
          toISO,
          timezone: safeUserTimeZone
        });
      } else {
        // If neither from/to dates exist, fetch current UTC week
        const now = DateTime.utc();
        fromISO = now.startOf('week').toISO();
        toISO = now.endOf('week').toISO();
        
        CalendarDebugUtils.log(COMPONENT_NAME, 'Date range calculated from current week', {
          now: now.toISO(),
          fromISO,
          toISO
        });
      }
      
      // Log date calculation performance
      const dateCalcTime = performance.now() - dateCalcStart;
      CalendarDebugUtils.logPerformance(COMPONENT_NAME, 'date-range-calculation', dateCalcTime);
      
      return { fromUTCISO: fromISO, toUTCISO: toISO };
    } catch (e) {
      CalendarDebugUtils.error(COMPONENT_NAME, 'Error converting date range', e);
      return {};
    }
  }, [fromDate, toDate, safeUserTimeZone]);

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
        CalendarDebugUtils.log(COMPONENT_NAME, 'Query aborted - no clinician ID', {
          formattedClinicianId
        });
        return [];
      }
      
      // Start tracking query execution time
      queryStartTime.current = performance.now();
      
      CalendarDebugUtils.logApiRequest(COMPONENT_NAME, 'appointments-fetch', {
        clinicianId: formattedClinicianId,
        from: fromUTCISO,
        to: toUTCISO,
        refreshTrigger,
        timezone: safeUserTimeZone
      });

      let query = supabase
        .from("appointments")
        .select(
          `id, client_id, clinician_id, start_at, end_at, type, status, appointment_recurring, recurring_group_id, video_room_url, notes, clients (client_first_name, client_last_name, client_preferred_name, client_email, client_phone, client_status, client_date_of_birth, client_gender, client_address, client_city, client_state, client_zipcode)`
        )
        .eq("clinician_id", formattedClinicianId)
        .eq("status", "scheduled");

      // Use more robust timezone-aware filtering
      CalendarDebugUtils.log(COMPONENT_NAME, 'Applying UTC date filters', {
        fromUTCISO,
        toUTCISO,
        clinicianTZ: safeUserTimeZone
      });
      
      if (fromUTCISO) query = query.gte("start_at", fromUTCISO);
      if (toUTCISO) query = query.lte("end_at", toUTCISO);
      
      // Add explicit time zone debugging
      query = query
        .order("start_at", { ascending: true });
        
      // Log query details
      CalendarDebugUtils.logApiRequest(COMPONENT_NAME, 'appointments-query-details', {
        clinician_id: formattedClinicianId,
        start_at: fromUTCISO ? `>= ${fromUTCISO}` : 'any',
        end_at: toUTCISO ? `<= ${toUTCISO}` : 'any',
        status: 'scheduled'
      });
      
      const { data: rawDataAny, error: queryError } = await query;

      // Log query execution time
      const queryExecutionTime = performance.now() - queryStartTime.current;
      CalendarDebugUtils.logPerformance(COMPONENT_NAME, 'query-execution', queryExecutionTime, {
        success: !queryError,
        recordCount: rawDataAny?.length || 0
      });

      // Start tracking data processing time
      processingStartTime.current = performance.now();

      // Log raw Supabase response structure with more context
      CalendarDebugUtils.logApiResponse(COMPONENT_NAME, 'appointments-fetch', !queryError, {
        hasData: !!rawDataAny,
        recordCount: rawDataAny?.length || 0,
        sampleRecord: rawDataAny?.[0] ? {
          id: rawDataAny[0].id,
          start_at: rawDataAny[0].start_at,
          end_at: rawDataAny[0].end_at
        } : null,
        hasClientsField: rawDataAny?.[0] ? 'clients' in rawDataAny[0] : false,
        clientsFieldType: rawDataAny?.[0]?.clients ? typeof rawDataAny[0].clients : "undefined",
        clientFieldKeys: rawDataAny?.[0]?.clients ? Object.keys(rawDataAny[0].clients) : [],
        rawStartAtFormat: rawDataAny?.[0]?.start_at || "N/A",
        clinicianIdUsed: formattedClinicianId,
        error: queryError ? queryError.message : null
      });

      if (queryError) {
        CalendarDebugUtils.error(COMPONENT_NAME, 'Error fetching appointments', queryError);
        throw new Error(queryError.message);
      }

      // Cast the raw data while ensuring proper validation
      if (!rawDataAny) {
        CalendarDebugUtils.warn(COMPONENT_NAME, 'No data returned from Supabase', {
          clinicianId: formattedClinicianId,
          fromUTCISO,
          toUTCISO
        });
        return [];
      }

      CalendarDebugUtils.logDataLoading(COMPONENT_NAME, 'appointments-fetched', {
        count: rawDataAny.length || 0,
        timeRange: {
          from: fromUTCISO,
          to: toUTCISO
        }
      });

      // Safely process the data with standardized client name formatting using our shared function
      return rawDataAny.map((rawAppt: any): Appointment => {
        // Process client data, ensure we handle nested objects correctly
        const rawClientData = rawAppt.clients;
        let clientData: Appointment["client"] | undefined;

        if (rawClientData) {
          // Handle both object and array structures (depending on Supabase's response format)
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

        // Use our standardized client name formatting function
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
      
      // Log data processing time
      const dataProcessingTime = performance.now() - processingStartTime.current;
      CalendarDebugUtils.logPerformance(COMPONENT_NAME, 'data-processing', dataProcessingTime, {
        appointmentsCount: rawDataAny.length || 0
      });
      
      // Log total hook execution time
      const totalHookTime = performance.now() - hookStartTime.current;
      CalendarDebugUtils.logPerformance(COMPONENT_NAME, 'hook-execution-complete', totalHookTime);
      
      return rawDataAny.map((rawAppt: any): Appointment => {
        // Process client data, ensure we handle nested objects correctly
        const rawClientData = rawAppt.clients;
        let clientData: Appointment["client"] | undefined;

        if (rawClientData) {
          // Handle both object and array structures (depending on Supabase's response format)
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

        // Use our standardized client name formatting function
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
    },
    enabled: !!formattedClinicianId,
  });

  // Helper function to add display formatting
  const addDisplayFormattingToAppointment = (
    appointment: Appointment,
    displayTimeZone: string
  ): FormattedAppointment => {
    const safeDisplayZone = TimeZoneUtils.ensureIANATimeZone(displayTimeZone);
    const result: FormattedAppointment = { ...appointment };

    if (appointment.start_at) {
      try {
        const startDateTime = TimeZoneUtils.fromUTC(
          appointment.start_at,
          safeDisplayZone
        );
        result.formattedStartTime = TimeZoneUtils.formatTime(startDateTime);
        result.formattedDate = TimeZoneUtils.formatDate(
          startDateTime,
          "yyyy-MM-dd"
        );
      } catch (e) {
        console.error("Error formatting start_at", e);
      }
    }

    if (appointment.end_at) {
      try {
        const endDateTime = TimeZoneUtils.fromUTC(
          appointment.end_at,
          safeDisplayZone
        );
        result.formattedEndTime = TimeZoneUtils.formatTime(endDateTime);
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
      const now = TimeZoneUtils.now(safeUserTimeZone);
      const apptDateTime = TimeZoneUtils.fromUTC(appointment.start_at, safeUserTimeZone);

      return now.hasSame(apptDateTime, "day");
    } catch (e) {
      console.error("[useAppointments] Error in isAppointmentToday:", e);
      return false;
    }
  };

  // Memoized formatted appointments
  const appointmentsWithDisplayFormatting = useMemo(() => {
    return fetchedAppointments.map((appt) =>
      addDisplayFormattingToAppointment(appt, safeUserTimeZone)
    );
  }, [fetchedAppointments, safeUserTimeZone]);
  

  // Memoized filtered appointments
  const todayAppointments = useMemo(() => {
    return appointmentsWithDisplayFormatting.filter(isAppointmentToday);
  }, [appointmentsWithDisplayFormatting]);

  const upcomingAppointments = useMemo(() => {
    const now = TimeZoneUtils.now(safeUserTimeZone);

    return appointmentsWithDisplayFormatting.filter((appt) => {
      if (!appt.start_at) return false;

      try {
        const apptDateTime = TimeZoneUtils.fromUTC(appt.start_at, safeUserTimeZone);
        // Upcoming means: not today and in the future
        return apptDateTime > now && !now.hasSame(apptDateTime, "day");
      } catch (e) {
        console.error("[useAppointments] Error filtering upcoming:", e);
        return false;
      }
    });
  }, [appointmentsWithDisplayFormatting, safeUserTimeZone]);

  const pastAppointments = useMemo(() => {
    const now = TimeZoneUtils.now(safeUserTimeZone);

    return appointmentsWithDisplayFormatting.filter((appt) => {
      if (!appt.start_at) return false;

      try {
        const apptDateTime = TimeZoneUtils.fromUTC(appt.start_at, safeUserTimeZone);
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
