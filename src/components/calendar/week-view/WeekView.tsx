import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useWeekViewData } from './useWeekViewData';
import { useTimeZone } from '@/context/TimeZoneContext';
import { DateTime } from 'luxon';
import { AvailabilityBlock } from '@/types/availability';
import { Appointment } from '@/types/appointment';
import { CalendarDebugUtils } from '@/utils/calendarDebugUtils';
import CalendarComponentErrorBoundary from './CalendarComponentErrorBoundary';
import CalendarErrorMessage from './CalendarErrorMessage';
import { useCalendarErrorHandler } from '@/hooks/useCalendarErrorHandler';
import WeekViewSectionErrorBoundary from './WeekViewSectionErrorBoundary';
import WeekViewHeader from './WeekViewHeader';
import TimeColumn from './TimeColumn';
import DayColumn from './DayColumn';

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

// Define time slots constants
const START_HOUR = 7;
const END_HOUR = 19;
const INTERVAL_MINUTES = 30;

// Generate time slots
const generateTimeSlots = (): Date[] => {
  const slots: Date[] = [];
  const baseDate = new Date();
  baseDate.setHours(0, 0, 0, 0);
  
  for (let hour = START_HOUR; hour < END_HOUR; hour++) {
    for (let minute = 0; minute < 60; minute += INTERVAL_MINUTES) {
      const slot = new Date(baseDate);
      slot.setHours(hour, minute, 0, 0);
      slots.push(slot);
    }
  }
  
  return slots;
};

// Memoize time slots to prevent unnecessary recreations
const TIME_SLOTS = generateTimeSlots();

/**
 * WeekView component - Displays a week view of the calendar
 * Refactored for better separation of concerns and performance
 */
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
  
  // Use TimeZoneContext
  const { fromJSDate, toUTC } = useTimeZone();

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
  const handleAvailabilityBlockClick = withErrorHandling((day: Date, block: TimeBlock) => {
    // ... keep existing code (logging) the same ...
    
    // Call the parent's onAvailabilityClick if provided
    if (onAvailabilityClick) {
      // Convert the TimeBlock to AvailabilityBlock format before passing to the parent handler
      const availabilityBlock: AvailabilityBlock = {
        id: block.availabilityIds[0] || 'unknown',
        clinician_id: selectedClinicianId || '',
        day_of_week: format(day, 'EEEE').toLowerCase(),
        start_at: block.start.toUTC().toISO() || '',
        end_at: block.end.toUTC().toISO() || '',
        is_active: true,
        is_deleted: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
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
    
    // Call the parent's onAppointmentClick with the appointment data
    if (onAppointmentClick) {
      onAppointmentClick(appointment);
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
      const newStartDateTime = fromJSDate(timeSlot);
      const newEndDateTime = newStartDateTime.plus({ minutes: durationMinutes });
      
      // Convert to UTC ISO strings for the database
      const newStartAt = toUTC(newStartDateTime);
      const newEndAt = toUTC(newEndDateTime);
      
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
      const newStartDateTime = fromJSDate(timeSlot);
      // Assume a default duration of 60 minutes if we can't determine it from the appointment
      const newEndDateTime = newStartDateTime.plus({ minutes: 60 });
      
      // Convert to UTC ISO strings for the database
      const newStartAt = toUTC(newStartDateTime);
      const newEndAt = toUTC(newEndDateTime);
      
      onAppointmentUpdate(appointmentId, newStartAt, newEndAt);
    }
    
    // Reset the dragged appointment ID
    setDraggedAppointmentId(null);
  }, { operation: 'handleAppointmentDrop' });

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
      onError={(error) => handleError(error, { operation: 'renderWeekView' })}
    >
      <div className="flex flex-col">
        {/* Week header with days */}
        <WeekViewSectionErrorBoundary
          sectionName="Header"
          componentName="WeekViewHeader"
          contextData={{
            componentName: "WeekViewHeader",
            daysCount: weekDays?.length || 0
          }}
          onError={(error) => handleError(error, { operation: 'renderWeekViewHeader' })}
        >
          <WeekViewHeader 
            weekDays={weekDays} 
            currentDate={currentDate || new Date()} 
          />
        </WeekViewSectionErrorBoundary>

        {/* Calendar grid with time slots */}
        <div className="flex">
          {/* Time column */}
          <WeekViewSectionErrorBoundary
            sectionName="TimeColumn"
            componentName="TimeColumn"
            contextData={{
              componentName: "TimeColumn",
              timeSlotsCount: TIME_SLOTS?.length || 0
            }}
            onError={(error) => handleError(error, { operation: 'renderTimeColumn' })}
          >
            <TimeColumn timeSlots={TIME_SLOTS} />
          </WeekViewSectionErrorBoundary>

          {/* Day columns */}
          {weekDays.map(day => (
            <WeekViewSectionErrorBoundary
              key={day.toFormat('yyyy-MM-dd')}
              sectionName={`DayColumn-${day.toFormat('yyyy-MM-dd')}`}
              componentName={`DayColumn-${day.toFormat('yyyy-MM-dd')}`}
              contextData={{
                componentName: `DayColumn-${day.toFormat('yyyy-MM-dd')}`,
                day: day.toFormat('yyyy-MM-dd'),
                timeSlotsCount: TIME_SLOTS?.length || 0
              }}
              onError={(error) => handleError(error, {
                operation: 'renderDayColumn',
                additionalData: { day: day.toFormat('yyyy-MM-dd') }
              })}
            >
              <DayColumn
                day={day}
                timeSlots={TIME_SLOTS}
                isTimeSlotAvailable={isTimeSlotAvailable}
                getBlockForTimeSlot={getBlockForTimeSlot}
                getAppointmentForTimeSlot={getAppointmentForTimeSlot}
                handleAvailabilityBlockClick={handleAvailabilityBlockClick}
                onAppointmentClick={handleAppointmentClick}
                onAppointmentDragStart={handleAppointmentDragStart}
                onAppointmentDragOver={handleAppointmentDragOver}
                onAppointmentDrop={handleAppointmentDrop}
                originalAppointments={appointments}
              />
            </WeekViewSectionErrorBoundary>
          ))}
        </div>

        {/* Debug panel for development mode */}
        {import.meta.env.MODE === 'development' && (
          <WeekViewSectionErrorBoundary
            sectionName="DebugPanel"
            componentName="DebugPanel"
            contextData={{ componentName: "DebugPanel" }}
            onError={(error) => handleError(error, { operation: 'renderDebugPanel' })}
          >
            <div className="mt-4 p-4 bg-gray-100 rounded text-xs">
              <h3 className="font-bold mb-2">Debug Info</h3>
              <div>Selected Clinician: {selectedClinicianId || 'None'}</div>
              <div>Time Blocks: {timeBlocks?.length || 0}</div>
              <div>Appointment Blocks: {appointmentBlocks?.length || 0}</div>
              <div>Refresh Trigger: {refreshTrigger}</div>
            </div>
          </WeekViewSectionErrorBoundary>
        )}
      </div>
    </CalendarComponentErrorBoundary>
  );
};

export default WeekView;
