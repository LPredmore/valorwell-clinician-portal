import React, { useState, useEffect, useRef, useMemo } from 'react';
import { format } from 'date-fns';
import { useWeekViewData } from './useWeekViewData';
import { TimeZoneService } from '@/utils/timeZoneService';
import { DateTime } from 'luxon';
import TimeSlot from './TimeSlot';
import { AvailabilityBlock } from '@/types/availability';
import { Appointment } from '@/types/appointment';
import { convertAppointmentBlockToAppointment } from '@/utils/appointmentUtils';
import { CalendarDebugUtils } from '@/utils/calendarDebugUtils';
import CalendarComponentErrorBoundary from './CalendarComponentErrorBoundary';
import CalendarErrorMessage from './CalendarErrorMessage';
import { useCalendarErrorHandler } from '@/hooks/useCalendarErrorHandler';
import WeekViewSectionErrorBoundary from './WeekViewSectionErrorBoundary';

// Component name for logging
const COMPONENT_NAME = 'WeekView';

interface WeekViewProps {
  days: Date[];
  selectedClinicianId: string | null;
  userTimeZone: string;
  showAvailability?: boolean;
  refreshTrigger?: number;
  appointments?: Appointment[];
  onAppointmentClick?: (appointment: Appointment) => void;
  onAvailabilityClick?: (date: DateTime | Date, availabilityBlock: AvailabilityBlock) => void;
  onAppointmentUpdate?: (appointmentId: string, newStartAt: string, newEndAt: string) => void;
  onAppointmentDelete?: (appointmentId: string) => void;
  currentDate?: Date;
  isLoading?: boolean;
  error?: any;
}

const START_HOUR = 7;
const END_HOUR = 19;
const INTERVAL_MINUTES = 30;
const TIME_SLOTS: Date[] = [];
const baseDate = new Date();
baseDate.setHours(0, 0, 0, 0);
for (let hour = START_HOUR; hour < END_HOUR; hour++) {
  for (let minute = 0; minute < 60; minute += INTERVAL_MINUTES) {
    const slot = new Date(baseDate);
    slot.setHours(hour, minute, 0, 0);
    TIME_SLOTS.push(slot);
  }
}

const WeekView: React.FC<WeekViewProps> = ({
  days,
  selectedClinicianId,
  userTimeZone,
  showAvailability = true,
  refreshTrigger = 0,
  appointments = [],
  onAppointmentClick,
  onAvailabilityClick,
  onAppointmentUpdate,
  onAppointmentDelete,
  currentDate,
  isLoading,
  error,
}) => {
  // Performance tracking
  const renderStartTime = useRef(performance.now());
  const hookStartTime = useRef(performance.now());
  const renderCount = useRef(0);
  
  const [selectedBlock, setSelectedBlock] = useState<any | null>(null);
  const [draggedAppointmentId, setDraggedAppointmentId] = useState<string | null>(null);

  // Use our custom error handler hook
  const {
    error: weekViewError,
    handleError,
    attemptRecovery,
    resetErrorState,
    withErrorHandling
  } = useCalendarErrorHandler({
    componentName: COMPONENT_NAME,
    onError: (error) => {
      CalendarDebugUtils.error(COMPONENT_NAME, 'Error in WeekView component', {
        error,
        daysCount: days?.length || 0,
        selectedClinicianId,
        userTimeZone,
        appointmentsCount: appointments?.length || 0
      });
    }
  });

  // Log component mount
  useEffect(() => {
    CalendarDebugUtils.logLifecycle(COMPONENT_NAME, 'mount', {
      daysCount: days?.length || 0,
      selectedClinicianId,
      userTimeZone
    });
    
    return () => {
      CalendarDebugUtils.logLifecycle(COMPONENT_NAME, 'unmount');
    };
  }, [days, selectedClinicianId, userTimeZone]);

  // Log props changes
  useEffect(() => {
    renderCount.current++;
    
    CalendarDebugUtils.logLifecycle(COMPONENT_NAME, `render #${renderCount.current}`, {
      daysCount: days?.length || 0,
      selectedClinicianId,
      userTimeZone,
      showAvailability,
      refreshTrigger,
      appointmentsCount: appointments?.length || 0,
      hasCallbacks: {
        onAppointmentClick: !!onAppointmentClick,
        onAvailabilityClick: !!onAvailabilityClick,
        onAppointmentUpdate: !!onAppointmentUpdate,
        onAppointmentDelete: !!onAppointmentDelete
      },
      isLoading,
      hasError: !!error
    });
    
    // Track render time
    const renderTime = performance.now() - renderStartTime.current;
    CalendarDebugUtils.logPerformance(COMPONENT_NAME, `render-${renderCount.current}`, renderTime);
    
    // Reset timer for next render
    renderStartTime.current = performance.now();
  }, [days, selectedClinicianId, userTimeZone, showAvailability, refreshTrigger, appointments,
      onAppointmentClick, onAvailabilityClick, onAppointmentUpdate, onAppointmentDelete, isLoading, error]);

  // Start tracking hook execution time
  hookStartTime.current = performance.now();
  CalendarDebugUtils.logDataLoading(COMPONENT_NAME, 'useWeekViewData-start', {
    daysCount: days?.length || 0,
    selectedClinicianId,
    refreshTrigger,
    appointmentsCount: appointments?.length || 0,
    userTimeZone
  });
  
  // Wrap the hook call in a try-catch for more granular error handling
  const weekViewDataResult = useMemo(() => {
    try {
      return useWeekViewData(
        days,
        selectedClinicianId,
        refreshTrigger,
        appointments,
        (id: string) => `Client ${id}`,
        userTimeZone
      );
    } catch (error) {
      handleError(error instanceof Error ? error : new Error(String(error)), {
        operation: 'useWeekViewData',
        additionalData: {
          daysCount: days?.length || 0,
          selectedClinicianId,
          refreshTrigger,
          appointmentsCount: appointments?.length || 0,
          userTimeZone
        }
      });
      
      // Return a fallback empty state
      return {
        loading: false,
        weekDays: [],
        appointmentBlocks: [],
        timeBlocks: [],
        isTimeSlotAvailable: () => false,
        getBlockForTimeSlot: () => undefined,
        getAppointmentForTimeSlot: () => undefined,
        error: error instanceof Error ? error : new Error(String(error))
      };
    }
  }, [days, selectedClinicianId, refreshTrigger, appointments, userTimeZone, handleError]);
  
  const {
    loading,
    weekDays,
    appointmentBlocks,
    timeBlocks,
    isTimeSlotAvailable,
    getBlockForTimeSlot,
    getAppointmentForTimeSlot,
    error: weekViewDataError
  } = weekViewDataResult;
  
  // Log hook execution time and results
  useEffect(() => {
    const hookExecutionTime = performance.now() - hookStartTime.current;
    CalendarDebugUtils.logPerformance(COMPONENT_NAME, 'useWeekViewData-execution', hookExecutionTime, {
      success: !weekViewDataError,
      weekDaysCount: weekDays?.length || 0,
      appointmentBlocksCount: appointmentBlocks?.length || 0,
      timeBlocksCount: timeBlocks?.length || 0
    });
    
    // Log any hook errors
    if (weekViewDataError) {
      CalendarDebugUtils.error(COMPONENT_NAME, 'useWeekViewData hook error', weekViewDataError);
      handleError(weekViewDataError, { operation: 'useWeekViewData' });
    }
  }, [weekDays, appointmentBlocks, timeBlocks, weekViewDataError, handleError]);

  // Wrap event handlers with error handling
  const handleAvailabilityBlockClick = withErrorHandling((day: Date, block: any) => {
    CalendarDebugUtils.log(COMPONENT_NAME, 'Availability block clicked', {
      day: format(day, 'yyyy-MM-dd'),
      start: block.start.toFormat('HH:mm'),
      end: block.end.toFormat('HH:mm'),
      blockId: block.availabilityIds?.[0] || 'unknown'
    });
    
    setSelectedBlock(block);
    
    // Call the parent's onAvailabilityClick if provided
    if (onAvailabilityClick) {
      // Convert the TimeBlock to AvailabilityBlock format before passing to the parent handler
      const availabilityBlock: AvailabilityBlock = {
        id: block.availabilityIds?.[0] || 'unknown',
        clinician_id: selectedClinicianId || '',
        start_at: block.start.toUTC().toISO(),
        end_at: block.end.toUTC().toISO(),
        is_active: true
      };
      
      CalendarDebugUtils.log(COMPONENT_NAME, 'Calling parent onAvailabilityClick', {
        blockId: availabilityBlock.id,
        start_at: availabilityBlock.start_at,
        end_at: availabilityBlock.end_at
      });
      
      onAvailabilityClick(day, availabilityBlock);
    }
  }, { operation: 'handleAvailabilityBlockClick' });

  const handleAppointmentClick = withErrorHandling((appointment: any) => {
    // Enhanced logging to debug appointment data
    CalendarDebugUtils.log(COMPONENT_NAME, 'Appointment clicked', {
      id: appointment.id,
      clientName: appointment.clientName,
      clientId: appointment.client_id,
      hasClient: !!appointment.client,
      start_at: appointment.start_at,
      end_at: appointment.end_at
    });
    
    // Find the complete original appointment with all data
    const originalAppointment = appointments?.find(a => a.id === appointment.id);
    
    if (originalAppointment) {
      CalendarDebugUtils.log(COMPONENT_NAME, 'Found original appointment with complete data', {
        id: originalAppointment.id
      });
      
      // Call the parent's onAppointmentClick with the complete appointment data
      if (onAppointmentClick) {
        onAppointmentClick(originalAppointment);
      }
    } else {
      CalendarDebugUtils.warn(COMPONENT_NAME, 'Original appointment not found, converting to full appointment', {
        id: appointment.id,
        availableAppointmentsCount: appointments?.length || 0
      });
      
      // Convert to a full appointment object if the original can't be found
      const fullAppointment = convertAppointmentBlockToAppointment(appointment, appointments || []);
      CalendarDebugUtils.log(COMPONENT_NAME, 'Using converted appointment', {
        id: fullAppointment.id,
        clientName: fullAppointment.clientName,
        clientId: fullAppointment.client_id,
        hasClient: !!fullAppointment.client,
        start_at: fullAppointment.start_at,
        end_at: fullAppointment.end_at
      });
      
      // Call the parent's onAppointmentClick with the converted appointment
      if (onAppointmentClick) {
        onAppointmentClick(fullAppointment);
      }
    }
  }, { operation: 'handleAppointmentClick' });
  
  const handleAppointmentDragStart = withErrorHandling((appointment: any, event: React.DragEvent) => {
    CalendarDebugUtils.log(COMPONENT_NAME, 'Appointment drag started', {
      id: appointment.id,
      clientName: appointment.clientName,
      start: appointment.start?.toFormat('yyyy-MM-dd HH:mm'),
      end: appointment.end?.toFormat('yyyy-MM-dd HH:mm')
    });
    
    setDraggedAppointmentId(appointment.id);
    
    // Set consistent drag data with both id and appointmentId for compatibility
    const dragData = {
      id: appointment.id,
      appointmentId: appointment.id,
      clientName: appointment.clientName
    };
    event.dataTransfer.setData('application/json', JSON.stringify(dragData));
  }, { operation: 'handleAppointmentDragStart' });
  
  // Handle drag over a time slot
  const handleAppointmentDragOver = (day: Date, timeSlot: Date, event: React.DragEvent) => {
    event.preventDefault(); // Allow drop
  };
  
  const handleAppointmentDrop = withErrorHandling((day: Date, timeSlot: Date, event: React.DragEvent) => {
    if (!draggedAppointmentId || !onAppointmentUpdate) {
      CalendarDebugUtils.warn(COMPONENT_NAME, 'Drop aborted - missing draggedAppointmentId or update handler', {
        hasDraggedId: !!draggedAppointmentId,
        hasUpdateHandler: !!onAppointmentUpdate
      });
      return;
    }
    
    // Get the dragged appointment data
    const dragDataJson = event.dataTransfer.getData('application/json');
    CalendarDebugUtils.log(COMPONENT_NAME, 'Drop event data received', {
      dragDataJson
    });
    
    const dragData = JSON.parse(dragDataJson);
    CalendarDebugUtils.log(COMPONENT_NAME, 'Parsed drag data', dragData);
    
    // Use either id or appointmentId, whichever is available
    const appointmentId = dragData.id || dragData.appointmentId;
    
    if (!appointmentId) {
      throw new Error('No valid appointmentId found in drag data');
    }
    
    // Find the original appointment with more flexible matching
    const appointment = appointments?.find(a => a.id === appointmentId);
    
    if (!appointment) {
      CalendarDebugUtils.warn(COMPONENT_NAME, 'No appointment found for ID in drop handler', {
        appointmentId,
        availableAppointmentsCount: appointments?.length || 0
      });
    }
    
    if (appointment) {
      // Calculate the duration of the appointment
      const startDateTime = DateTime.fromISO(appointment.start_at);
      const endDateTime = DateTime.fromISO(appointment.end_at);
      const durationMinutes = endDateTime.diff(startDateTime).as('minutes');
      
      // Create new start and end times based on the drop target
      const newStartDateTime = TimeZoneService.fromJSDate(timeSlot, userTimeZone);
      const newEndDateTime = newStartDateTime.plus({ minutes: durationMinutes });
      
      // Convert to UTC ISO strings for the database
      const newStartAt = newStartDateTime.toUTC().toISO();
      const newEndAt = newEndDateTime.toUTC().toISO();
      
      CalendarDebugUtils.log(COMPONENT_NAME, 'About to update appointment in database', {
        appointmentId,
        originalStart: appointment.start_at,
        originalEnd: appointment.end_at,
        newStartAt,
        newEndAt,
        durationMinutes
      });
      
      // Call the update handler
      const updateStartTime = performance.now();
      onAppointmentUpdate(appointmentId, newStartAt, newEndAt);
      CalendarDebugUtils.logPerformance(COMPONENT_NAME, 'appointment-update-handler-call',
        performance.now() - updateStartTime);
    } else {
      // FALLBACK: Even if we couldn't find the appointment, try to update using the dragData
      CalendarDebugUtils.warn(COMPONENT_NAME, 'Using fallback values from dragData to update appointment', {
        appointmentId
      });
      
      // Create new start and end times based on the drop target
      const newStartDateTime = TimeZoneService.fromJSDate(timeSlot, userTimeZone);
      // Assume a default duration of 60 minutes if we can't determine it from the appointment
      const newEndDateTime = newStartDateTime.plus({ minutes: 60 });
      
      // Convert to UTC ISO strings for the database
      const newStartAt = newStartDateTime.toUTC().toISO();
      const newEndAt = newEndDateTime.toUTC().toISO();
      
      onAppointmentUpdate(appointmentId, newStartAt, newEndAt);
    }
    
    // Reset the dragged appointment ID
    setDraggedAppointmentId(null);
  }, { operation: 'handleAppointmentDrop' });

  // Debug function to log all blocks for a specific day
  const debugBlocksForDay = (day: DateTime) => {
    const dayBlocks = timeBlocks.filter(block =>
      block.day && block.day.hasSame(day, 'day')
    );
    
    CalendarDebugUtils.log(COMPONENT_NAME, `Blocks for ${day.toFormat('yyyy-MM-dd')}`, {
      count: dayBlocks.length,
      blocks: dayBlocks.map(block => ({
        start: block.start.toFormat('HH:mm'),
        end: block.end.toFormat('HH:mm'),
        isException: block.isException,
        isStandalone: block.isStandalone,
        availabilityIds: block.availabilityIds
      }))
    });
    
    return dayBlocks;
  };
  
  // Get a formatted time string for display
  const formatTime = (date: Date) => {
    return format(date, 'h:mm a');
  };

  // If there's an error from the hook or component, show the error message
  if (weekViewError) {
    return (
      <CalendarErrorMessage
        componentName={COMPONENT_NAME}
        error={weekViewError}
        message="Calendar Error"
        details="There was a problem loading the calendar data."
        onRetry={() => attemptRecovery()}
        onReset={() => resetErrorState()}
        onShowDetails={() => {
          console.error('WeekView Error Details:', {
            error: weekViewError,
            message: weekViewError.message,
            stack: weekViewError.stack,
            componentProps: {
              daysCount: days?.length || 0,
              selectedClinicianId,
              userTimeZone,
              appointmentsCount: appointments?.length || 0
            }
          });
          alert('Error details logged to console');
        }}
        severity="error"
        contextData={{
          componentName: COMPONENT_NAME,
          daysCount: days?.length || 0,
          selectedClinicianId,
          userTimeZone,
          appointmentsCount: appointments?.length || 0
        }}
      />
    );
  }

  // If there's an error from the hook, show the error message
  if (weekViewDataError) {
    return (
      <CalendarErrorMessage
        componentName={COMPONENT_NAME}
        error={weekViewDataError}
        message="Data Loading Error"
        details="There was a problem loading the calendar data."
        onRetry={() => {
          // Trigger a refresh by incrementing the refresh trigger
          if (onAppointmentUpdate) {
            onAppointmentUpdate("refresh-trigger", "", "");
          }
        }}
        severity="error"
        contextData={{
          componentName: COMPONENT_NAME,
          daysCount: days?.length || 0,
          selectedClinicianId,
          userTimeZone,
          appointmentsCount: appointments?.length || 0
        }}
      />
    );
  }

  // Show loading state
  if (loading) {
    CalendarDebugUtils.log(COMPONENT_NAME, 'Rendering loading state');
    return <div className="flex justify-center items-center h-32">Loading calendar...</div>;
  }

  // Check if we have the day we're looking for (Thursday, May 15, 2025)
  const debugDay = weekDays.find(day => day.toFormat('yyyy-MM-dd') === '2025-05-15');
  if (debugDay) {
    CalendarDebugUtils.log(COMPONENT_NAME, 'Found debug day 2025-05-15, analyzing blocks');
    debugBlocksForDay(debugDay);
  }

  // Log detailed data from the hook
  CalendarDebugUtils.logDataLoading(COMPONENT_NAME, 'hook-data-processed', {
    weekDaysCount: weekDays?.length || 0,
    appointmentBlocksCount: appointmentBlocks?.length || 0,
    timeBlocksCount: timeBlocks?.length || 0,
    sampleTimeBlock: timeBlocks?.length > 0 ? {
      start: timeBlocks[0].start.toFormat('yyyy-MM-dd HH:mm'),
      end: timeBlocks[0].end.toFormat('yyyy-MM-dd HH:mm'),
      isException: timeBlocks[0].isException,
      isStandalone: timeBlocks[0].isStandalone,
      availabilityIds: timeBlocks[0].availabilityIds
    } : 'No time blocks',
    sampleAppointmentBlock: appointmentBlocks?.length > 0 ? {
      id: appointmentBlocks[0].id,
      clientName: appointmentBlocks[0].clientName,
      start: appointmentBlocks[0].start.toFormat('yyyy-MM-dd HH:mm'),
      end: appointmentBlocks[0].end.toFormat('yyyy-MM-dd HH:mm')
    } : 'No appointment blocks',
    weekDays: weekDays.map(day => day.toFormat('yyyy-MM-dd'))
  });
  
  // Start tracking render time for the grid
  const gridRenderStart = performance.now();

  return (
    <CalendarComponentErrorBoundary
      componentName={COMPONENT_NAME}
      contextData={{
        componentName: COMPONENT_NAME,
        daysCount: days?.length || 0,
        selectedClinicianId,
        userTimeZone,
        appointmentsCount: appointments?.length || 0
      }}
      onError={(error) => handleError(error, { operation: 'render' })}
    >
      <div className="flex flex-col">
        {/* Time column headers */}
        <WeekViewSectionErrorBoundary
          sectionName="header"
          componentName={COMPONENT_NAME}
          contextData={{
            componentName: COMPONENT_NAME,
            daysCount: weekDays?.length || 0,
            selectedClinicianId,
            userTimeZone
          }}
        >
          <div className="flex">
            {/* Time label column header - add matching width to align with time labels */}
            <div className="w-16 flex-shrink-0"></div>
            {/* Day headers - use exact same width as the day columns below */}
            {weekDays.map(day => (
              <div 
                key={day.toISO()} 
                className="w-24 flex-1 px-2 py-1 font-semibold text-center border-r last:border-r-0"
              >
                <div className="text-sm">{day.toFormat('EEE')}</div>
                <div className="text-xs">{day.toFormat('MMM d')}</div>
              </div>
            ))}
          </div>
        </WeekViewSectionErrorBoundary>

        {/* Time slots grid */}
        <div className="flex">
          {/* Time labels column */}
          <WeekViewSectionErrorBoundary
            sectionName="time-labels"
            componentName={COMPONENT_NAME}
            contextData={{
              componentName: COMPONENT_NAME,
              timeSlotsCount: TIME_SLOTS.length,
              userTimeZone
            }}
          >
            <div className="w-16 flex-shrink-0">
              {TIME_SLOTS.map((timeSlot, i) => (
                <div key={i} className="h-10 flex items-center justify-end pr-2 text-xs text-gray-500">
                  {formatTime(timeSlot)}
                </div>
              ))}
            </div>
          </WeekViewSectionErrorBoundary>

          {/* Days columns */}
          {weekDays.map(day => (
            <WeekViewSectionErrorBoundary
              key={day.toISO() || ''}
              sectionName={`day-column-${day.toFormat('yyyy-MM-dd')}`}
              componentName={COMPONENT_NAME}
              contextData={{
                componentName: COMPONENT_NAME,
                day: day.toFormat('yyyy-MM-dd'),
                selectedClinicianId,
                userTimeZone,
                timeSlotsCount: TIME_SLOTS.length
              }}
            >
              <div className="flex-1 border-r last:border-r-0">
                {TIME_SLOTS.map((timeSlot, i) => {
                  // Convert JS Date to DateTime objects for consistent checking
                  const dayDt = TimeZoneService.fromJSDate(day.toJSDate(), userTimeZone);
                  const timeSlotDt = TimeZoneService.fromJSDate(timeSlot, userTimeZone);
                  
                  // Get formatted day and hour for debugging logs
                  const formattedDay = dayDt.toFormat('yyyy-MM-dd');
                  const formattedTime = timeSlotDt.toFormat('HH:mm');
                  const debugMode = formattedDay === '2025-05-15' && (timeSlotDt.hour >= 8 && timeSlotDt.hour <= 18);
                  
                  // Perform availability checks and get relevant blocks
                  const isAvailable = showAvailability && isTimeSlotAvailable(
                    dayDt.toJSDate(), 
                    timeSlotDt.toJSDate()
                  );
                  
                  // Get the corresponding block if available - this may be undefined
                  const currentBlock = isAvailable ? getBlockForTimeSlot(
                    dayDt.toJSDate(), 
                    timeSlotDt.toJSDate()
                  ) : undefined;
                  
                  // Get any appointment for this time slot
                  const appointment = getAppointmentForTimeSlot(
                    dayDt.toJSDate(), 
                    timeSlotDt.toJSDate()
                  );
                  
                  // Debug comparison logging
                  if (debugMode) {
                    // Direct comparison between isTimeSlotAvailable and getBlockForTimeSlot results
                    CalendarDebugUtils.log(COMPONENT_NAME, `Time slot comparison for ${formattedDay} ${formattedTime}`, {
                      isTimeSlotAvailable: isAvailable,
                      hasBlock: !!currentBlock,
                      blockDetails: currentBlock ? {
                        start: currentBlock.start.toFormat('HH:mm'),
                        end: currentBlock.end.toFormat('HH:mm'),
                        day: currentBlock.day?.toFormat('yyyy-MM-dd'),
                        isException: currentBlock.isException,
                        isStandalone: currentBlock.isStandalone,
                        availabilityIds: currentBlock.availabilityIds
                      } : null
                    });
                  }
                  
                  // Determine if this is the start or end of a block
                  const isStartOfBlock = currentBlock && 
                    TimeZoneService.fromJSDate(timeSlot, userTimeZone).toFormat('HH:mm') === 
                    currentBlock.start.toFormat('HH:mm');
                  
                  const isEndOfBlock = currentBlock && 
                    TimeZoneService.fromJSDate(timeSlot, userTimeZone).plus({ minutes: 30 }).toFormat('HH:mm') === 
                    currentBlock.end.toFormat('HH:mm');
                  
                  const isStartOfAppointment = appointment && 
                    TimeZoneService.fromJSDate(timeSlot, userTimeZone).toFormat('HH:mm') === 
                    appointment.start.toFormat('HH:mm');
                  
                  const isEndOfAppointment = appointment && 
                    TimeZoneService.fromJSDate(timeSlot, userTimeZone).plus({ minutes: 30 }).toFormat('HH:mm') === 
                    appointment.end.toFormat('HH:mm');

                  return (
                    <div
                      key={i}
                      className={`h-10 border-b border-l first:border-l-0 group 
                                  ${i % 2 === 0 ? 'bg-gray-50' : 'bg-white'}`}
                    >
                      <TimeSlot
                        day={dayDt.toJSDate()}
                        timeSlot={timeSlot}
                        isAvailable={isAvailable}
                        currentBlock={currentBlock}
                        appointment={appointment}
                        isStartOfBlock={!!isStartOfBlock}
                        isEndOfBlock={!!isEndOfBlock}
                        isStartOfAppointment={!!isStartOfAppointment}
                        isEndOfAppointment={!!isEndOfAppointment}
                        handleAvailabilityBlockClick={handleAvailabilityBlockClick}
                        onAppointmentClick={handleAppointmentClick}
                        onAppointmentDragStart={handleAppointmentDragStart}
                        onAppointmentDragOver={handleAppointmentDragOver}
                        onAppointmentDrop={handleAppointmentDrop}
                        originalAppointments={appointments}
                      />
                    </div>
                  );
                })}
              </div>
            </WeekViewSectionErrorBoundary>
          ))}
        </div>

        {/* Debug section */}
        {import.meta.env.MODE === 'development' && (
          <WeekViewSectionErrorBoundary
            sectionName="debug-info"
            componentName={COMPONENT_NAME}
            contextData={{
              componentName: COMPONENT_NAME
            }}
          >
            <div className="mt-4 p-4 bg-gray-100 rounded">
              <h3 className="text-lg font-semibold">Debug Info</h3>
              <p>Clinician ID: {selectedClinicianId || 'None'}</p>
              <p>Time Blocks: {timeBlocks.length}</p>
              <p>Appointments: {appointmentBlocks.length}</p>
              <p>User Timezone: {userTimeZone}</p>
              <p>Refresh Trigger: {refreshTrigger}</p>
              <p>External Error: {error ? error.message : 'None'}</p>
            </div>
          </WeekViewSectionErrorBoundary>
        )}
      </div>
    </CalendarComponentErrorBoundary>
  );
};

export default WeekView;
