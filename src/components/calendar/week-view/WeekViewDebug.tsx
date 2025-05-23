
import React, { useMemo, useEffect } from "react";
import {
  format,
  addMinutes,
  startOfDay,
  setHours,
  setMinutes,
} from "date-fns";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { useWeekViewDataDebug } from "./useWeekViewDataDebug";
import TimeSlot from "./TimeSlot";
import { isStartOfBlock, isEndOfBlock, isStartOfAppointment } from "./utils";
import { Appointment } from "@/types/appointment";
import { TimeZoneService } from "@/utils/timeZoneService";
import { DebugUtils } from "@/utils/debugUtils";
import { CalendarDebugUtils } from "@/utils/calendarDebugUtils";
import { AppointmentBlock } from "./types";

// Debug context name for this component
const DEBUG_CONTEXT = 'WeekViewDebug';

export interface WeekViewDebugProps {
  currentDate: Date;
  clinicianId: string | null;
  refreshTrigger?: number;
  appointments?: Appointment[];
  getClientName?: (clientId: string) => string;
  onAppointmentClick?: (appointment: Appointment) => void;
  onAvailabilityClick?: (date: Date, availabilityBlock: any) => void;
  userTimeZone?: string;
}

const WeekViewDebug: React.FC<WeekViewDebugProps> = ({
  currentDate,
  clinicianId,
  refreshTrigger = 0,
  appointments = [],
  getClientName = () => "Unknown Client",
  onAppointmentClick,
  onAvailabilityClick,
  userTimeZone = "America/Chicago",
}) => {
  // Log component initialization
  DebugUtils.log(DEBUG_CONTEXT, 'Component initialized with props', {
    currentDate: currentDate?.toISOString(),
    clinicianId,
    refreshTrigger,
    appointmentsCount: appointments.length,
    userTimeZone
  });

  // Validate props
  CalendarDebugUtils.validateHookParameters(DEBUG_CONTEXT, {
    currentDate,
    clinicianId,
    userTimeZone
  });

  // Create array of days for the week and time slots for each day
  const { days, timeSlots } = useMemo(() => {
    // Log the input currentDate in multiple formats for debugging
    DebugUtils.log(DEBUG_CONTEXT, "Generating days with currentDate", {
      jsDate: currentDate.toISOString(),
      luxonDate: TimeZoneService.fromJSDate(currentDate, userTimeZone).toISO(),
    });

    // Use the TimeZoneService to generate days in the user's timezone
    const today = TimeZoneService.fromJSDate(currentDate, userTimeZone);
    const weekStart = TimeZoneService.startOfWeek(today);
    const weekEnd = TimeZoneService.endOfWeek(today);
    const daysInWeek = TimeZoneService.eachDayOfInterval(
      weekStart,
      weekEnd
    ).map((dt) => dt.toJSDate());

    DebugUtils.log(
      DEBUG_CONTEXT,
      "Generated days for week",
      daysInWeek.map((d) => format(d, "yyyy-MM-dd"))
    );

    // Generate time slots from 8 AM to 6 PM in 30-minute increments
    const slots = Array.from({ length: 21 }, (_, i) => {
      const minutes = i * 30;
      // Create a base date in user's timezone at 8:00 AM using dummy date
      const dummyDate = new Date(1970, 0, 1);
      const baseDate = TimeZoneService.fromJSDate(dummyDate, userTimeZone);
      const baseTime = baseDate.set({
        hour: 8,
        minute: 0,
        second: 0,
        millisecond: 0
      }).toJSDate();
      return addMinutes(baseTime, minutes);
    });

    DebugUtils.log(DEBUG_CONTEXT, "Generated time slots", {
      count: slots.length,
      first: format(slots[0], "HH:mm"),
      last: format(slots[slots.length - 1], "HH:mm")
    });

    return { days: daysInWeek, timeSlots: slots };
  }, [currentDate, userTimeZone]);

  // Use the custom hook to get all the data and utility functions
  const hookProps = {
    currentDate,
    clinicianId,
    userTimeZone,
    refreshTrigger,
    appointments,
    getClientName
  };
  
  // Log the hook props to debug parameter mismatch
  DebugUtils.log(DEBUG_CONTEXT, 'Calling useWeekViewDataDebug with props', hookProps);
  
  const {
    loading,
    timeBlocks,
    exceptions,
    availabilityBlocks,
    appointmentBlocks,
    getAvailabilityForBlock,
    isTimeSlotAvailable,
    getBlockForTimeSlot,
    getAppointmentForTimeSlot,
  } = useWeekViewDataDebug(hookProps);

  // Detailed logging for week view appointments
  useEffect(() => {
    DebugUtils.log(
      DEBUG_CONTEXT,
      `Rendered with appointments and blocks`,
      {
        appointmentsCount: appointments.length,
        appointmentBlocksCount: appointmentBlocks.length,
        timeBlocksCount: timeBlocks?.length || 0
      }
    );

    // Log sample client names for verification
    if (appointments.length > 0) {
      DebugUtils.log(
        DEBUG_CONTEXT,
        "All appointments",
        appointments.map((app) => ({
          id: app.id,
          start_at: app.start_at,
          dateFormatted: app.start_at
            ? TimeZoneService.fromUTC(app.start_at, userTimeZone).toFormat(
                "yyyy-MM-dd"
              )
            : "Invalid",
          clientName: app.clientName || getClientName(app.client_id),
        }))
      );

      // Log the first few appointments for debugging
      const samplesToLog = Math.min(appointments.length, 5);
      for (let i = 0; i < samplesToLog; i++) {
        const app = appointments[i];
        const startLocalDateTime = app.start_at
          ? TimeZoneService.fromUTC(app.start_at, userTimeZone)
          : null;

        DebugUtils.log(
          DEBUG_CONTEXT,
          `Sample appointment ${i + 1}/${samplesToLog}`,
          {
            clientName: app.clientName || getClientName(app.client_id),
            clientId: app.client_id,
            date: startLocalDateTime
              ? startLocalDateTime.toFormat("yyyy-MM-dd")
              : "Invalid date",
            time: startLocalDateTime
              ? startLocalDateTime.toFormat("HH:mm")
              : "Invalid time",
            startAt: app.start_at,
          }
        );
      }
    }

    if (appointmentBlocks?.length > 0) {
      DebugUtils.log(
        DEBUG_CONTEXT,
        "Appointment blocks",
        appointmentBlocks.map((block) => ({
          clientName: block.clientName,
          clientId: block.clientId,
          day: block.day?.toFormat("yyyy-MM-dd"),
          time: block.start && block.end ? 
            `${block.start.toFormat("HH:mm")}-${block.end.toFormat("HH:mm")}` : 
            "Invalid time range",
        }))
      );
    } else if (appointments.length > 0) {
      DebugUtils.error(
        DEBUG_CONTEXT,
        "WARNING: There are appointments but no appointment blocks were created"
      );
    }

    // Log all days in the view for debugging
    DebugUtils.log(
      DEBUG_CONTEXT,
      "Days in view",
      days.map((d) => format(d, "yyyy-MM-dd"))
    );
  }, [appointments, appointmentBlocks, getClientName, days, userTimeZone, timeBlocks]);

  // Adapter function to convert AppointmentBlock to Appointment
  const handleAppointmentBlockClick = (appointmentBlock: AppointmentBlock) => {
    if (onAppointmentClick) {
      DebugUtils.log(DEBUG_CONTEXT, 'Appointment block clicked', {
        id: appointmentBlock.id,
        clientName: appointmentBlock.clientName
      });
      
      let appointmentToSend: Appointment | undefined = appointments?.find(a => a.id === appointmentBlock.id);

      if (!appointmentToSend) {
        // Fallback: Construct a valid Appointment from the AppointmentBlock
        console.warn(`Original Appointment not found for ID: ${appointmentBlock.id}. Constructing from AppointmentBlock.`);
        appointmentToSend = {
          id: appointmentBlock.id,
          client_id: appointmentBlock.clientId,
          clinician_id: clinicianId || '',
          start_at: appointmentBlock.start.toISO(),
          end_at: appointmentBlock.end.toISO(),
          status: 'unknown',
          type: appointmentBlock.type || 'unknown',
          clientName: appointmentBlock.clientName
        };
      }
      
      DebugUtils.log(DEBUG_CONTEXT, 'Calling onAppointmentClick with appointment', {
        id: appointmentToSend.id,
        clientName: appointmentToSend.clientName || appointmentToSend.client_id
      });
      
      onAppointmentClick(appointmentToSend);
    }
  };

  // Handle click on availability block
  const handleAvailabilityBlockClick = (day: Date, block: any) => {
    DebugUtils.log(DEBUG_CONTEXT, 'Availability block clicked', {
      day: format(day, 'yyyy-MM-dd'),
      block
    });
    
    if (!onAvailabilityClick || !block.availabilityIds?.length) {
      DebugUtils.warn(DEBUG_CONTEXT, 'Cannot handle availability click', {
        hasClickHandler: !!onAvailabilityClick,
        hasAvailabilityIds: !!block.availabilityIds?.length
      });
      return;
    }

    const availabilityId = block.availabilityIds[0];
    DebugUtils.log(DEBUG_CONTEXT, 'Processing availability click', {
      availabilityId,
      isStandalone: block.isStandalone
    });

    if (block.isStandalone) {
      const exception = exceptions?.find((exc) => exc.id === availabilityId);
      if (exception) {
        DebugUtils.log(DEBUG_CONTEXT, 'Found exception for availability', {
          exceptionId: exception.id
        });
        
        const availabilityBlock = {
          id: exception.id,
          day_of_week: format(day, "EEEE"),
          start_time: exception.start_time || "",
          end_time: exception.end_time || "",
          clinician_id: exception.clinician_id,
          is_active: true,
          isException: true,
          isStandalone: true,
        };
        onAvailabilityClick(day, availabilityBlock);
      } else {
        DebugUtils.warn(DEBUG_CONTEXT, 'Exception not found for availability', {
          availabilityId
        });
      }
      return;
    }

    const availabilityBlock = getAvailabilityForBlock(availabilityId);
    DebugUtils.log(DEBUG_CONTEXT, 'Found availability block', {
      availabilityBlock
    });

    if (availabilityBlock) {
      onAvailabilityClick(day, availabilityBlock);
    } else {
      DebugUtils.warn(DEBUG_CONTEXT, 'Availability block not found', {
        availabilityId
      });
    }
  };

  if (loading) {
    DebugUtils.log(DEBUG_CONTEXT, 'Rendering loading state');
    return (
      <Card className="p-4 flex justify-center items-center h-[300px]">
        <Loader2 className="h-6 w-6 animate-spin text-valorwell-500" />
      </Card>
    );
  }

  DebugUtils.log(DEBUG_CONTEXT, 'Rendering calendar grid', {
    daysCount: days.length,
    timeSlotsCount: timeSlots.length
  });

  return (
    <Card className="p-4">
      {/* Grid container with reduced gap to minimize visual breaks */}
      <div className="grid grid-cols-8 gap-0">
        {/* Header row */}
        <div className="col-span-1"></div>
        {days.map((day) => (
          <div
            key={day.toString()}
            className="col-span-1 p-2 text-center font-medium border-b-2 border-gray-200"
          >
            <div className="text-sm text-gray-400">{format(day, "EEE")}</div>
            <div
              className={`text-lg ${
                format(day, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd")
                  ? "bg-valorwell-500 text-white rounded-full w-8 h-8 flex items-center justify-center mx-auto"
                  : ""
              }`}
            >
              {format(day, "d")}
            </div>
          </div>
        ))}

        {/* Time slots and day cells */}
        {timeSlots.map((timeSlot) => {
          const timeLabel = format(timeSlot, "h:mm a");

          return (
            <React.Fragment key={timeSlot.toString()}>
              {/* Time label column */}
              <div className="col-span-1 p-2 text-xs text-gray-500 text-right pr-4 border-t border-gray-100">
                {timeLabel}
              </div>

              {/* Day columns for this time slot */}
              {days.map((day) => {
                const isAvailable = isTimeSlotAvailable(day, timeSlot);
                const currentBlock = getBlockForTimeSlot(day, timeSlot);
                const appointment = getAppointmentForTimeSlot(day, timeSlot);

                const slotStartTime = setMinutes(
                  setHours(startOfDay(day), timeSlot.getHours()),
                  timeSlot.getMinutes()
                );

                const slotEndTime = addMinutes(slotStartTime, 30);

                const blockStartCheck = isStartOfBlock(
                  slotStartTime,
                  currentBlock
                );
                const blockEndCheck = isEndOfBlock(slotStartTime, currentBlock);
                const appointmentStartCheck = isStartOfAppointment(
                  slotStartTime,
                  appointment
                );

                const cellKey = `${day.toString()}-${timeSlot.toString()}`;

                return (
                  <div
                    key={cellKey}
                    className="col-span-1 min-h-[40px] border-t border-gray-50 p-0 group hover:bg-gray-50"
                  >
                    <TimeSlot
                      day={day}
                      timeSlot={timeSlot}
                      isAvailable={isAvailable}
                      currentBlock={currentBlock}
                      appointment={appointment}
                      isStartOfBlock={blockStartCheck}
                      isEndOfBlock={blockEndCheck}
                      isStartOfAppointment={appointmentStartCheck}
                      isEndOfAppointment={false}
                      handleAvailabilityBlockClick={
                        handleAvailabilityBlockClick
                      }
                      onAppointmentClick={handleAppointmentBlockClick}
                      originalAppointments={appointments}
                    />
                  </div>
                );
              })}
            </React.Fragment>
          );
        })}
      </div>
    </Card>
  );
};

export default WeekViewDebug;
