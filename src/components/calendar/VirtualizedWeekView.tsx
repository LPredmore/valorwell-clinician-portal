
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import { useWeekViewData } from './week-view/useWeekViewData';
import { TimeBlock, AppointmentBlock } from './week-view/types';
import { TimeZoneService } from '@/utils/timeZoneService';
import { DateTime } from 'luxon';
import TimeSlot from './week-view/TimeSlot';
import { Button } from '@/components/ui/button';
import { AvailabilityBlock } from '@/types/availability';
import { convertAppointmentBlockToAppointment } from '@/utils/appointmentUtils';
import AppointmentDetailsDialog from './AppointmentDetailsDialog';
import { Appointment } from '@/types/appointment';
import { CalendarDebugUtils } from '@/utils/calendarDebugUtils';
import ErrorBoundary from './ErrorBoundary';
import { useVirtualizer } from '@tanstack/react-virtual';

interface VirtualizedWeekViewProps {
  days: Date[];
  selectedClinicianId: string | null;
  userTimeZone: string;
  showAvailability?: boolean;
  refreshTrigger?: number;
  appointments?: any[];
  onAppointmentClick?: (appointment: any) => void;
  onAvailabilityClick?: (date: DateTime | Date, availabilityBlock: AvailabilityBlock) => void;
  onAppointmentUpdate?: (appointmentId: string, newStartAt: string, newEndAt: string) => void;
  currentDate?: Date;
  isLoading?: boolean;
  error?: any;
  onAppointmentDelete?: (appointmentId: string) => void;
}

// Generate time slots for the day (30-minute intervals)
// These will remain constant across renders
const START_HOUR = 7; // 7 AM
const END_HOUR = 19; // 7 PM
const INTERVAL_MINUTES = 30;

// Component name for logging
const COMPONENT_NAME = 'VirtualizedWeekView';

/**
 * VirtualizedWeekView component - optimized calendar view with virtualization
 * Only renders time slots that are visible in the viewport for better performance
 */
const VirtualizedWeekView: React.FC<VirtualizedWeekViewProps> = ({
  days,
  selectedClinicianId,
  userTimeZone,
  showAvailability = true,
  refreshTrigger = 0,
  appointments = [],
  onAppointmentClick,
  onAvailabilityClick,
  currentDate,
  onAppointmentUpdate,
  onAppointmentDelete,
  isLoading,
  error,
}) => {
  // Performance tracking
  const renderStartTime = performance.now();
  
  // Refs for virtualization
  const parentRef = useRef<HTMLDivElement>(null);
  const timeColumnRef = useRef<HTMLDivElement>(null);
  
  // State for UI interactions
  const [selectedBlock, setSelectedBlock] = useState<TimeBlock | null>(null);
  const [draggedAppointmentId, setDraggedAppointmentId] = useState<string | null>(null);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [isAppointmentDetailsOpen, setIsAppointmentDetailsOpen] = useState(false);
  const [scrollPosition, setScrollPosition] = useState(0);
  
  // Get calendar data from the hook - fix parameter count
  const {
    loading,
    weekDays,
    appointmentBlocks,
    timeBlocks,
    isTimeSlotAvailable,
    getBlockForTimeSlot,
    getAppointmentForTimeSlot,
  } = useWeekViewData(
    days,
    selectedClinicianId,
    refreshTrigger,
    appointments,
    userTimeZone
  );

  // Generate time slots array - memoized to prevent recreation
  const TIME_SLOTS = useMemo(() => {
    const slots: Date[] = [];
    const baseDate = new Date();
    baseDate.setHours(0, 0, 0, 0); // Reset to midnight
    
    for (let hour = START_HOUR; hour < END_HOUR; hour++) {
      for (let minute = 0; minute < 60; minute += INTERVAL_MINUTES) {
        const timeSlot = new Date(baseDate);
        timeSlot.setHours(hour, minute, 0, 0);
        slots.push(timeSlot);
      }
    }
    return slots;
  }, []);

  // Calculate the total number of time slots
  const totalTimeSlots = TIME_SLOTS.length;
  
  // Set up virtualization for time slots
  const rowVirtualizer = useVirtualizer({
    count: totalTimeSlots,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 40, // Estimated height of each time slot row
    overscan: 5, // Number of items to render before/after the visible area
  });

  // Sync scroll position between time column and main grid
  useEffect(() => {
    const handleScroll = () => {
      if (parentRef.current && timeColumnRef.current) {
        timeColumnRef.current.scrollTop = parentRef.current.scrollTop;
        setScrollPosition(parentRef.current.scrollTop);
      }
    };

    const element = parentRef.current;
    if (element) {
      element.addEventListener('scroll', handleScroll);
      return () => element.removeEventListener('scroll', handleScroll);
    }
  }, []);

  // Handle click on an availability block
  const handleAvailabilityBlockClick = (day: Date, block: TimeBlock) => {
    CalendarDebugUtils.log(COMPONENT_NAME, 'Availability block clicked', {
      day: format(day, 'yyyy-MM-dd'),
      start: block.start.toFormat('HH:mm'),
      end: block.end.toFormat('HH:mm'),
    });
    
    setSelectedBlock(block);
    
    // Call the parent's onAvailabilityClick if provided
    if (onAvailabilityClick) {
      // Convert the TimeBlock to AvailabilityBlock format before passing to the parent handler
      const availabilityBlock: AvailabilityBlock = {
        id: block.availabilityIds[0] || 'unknown',
        clinician_id: selectedClinicianId || '',
        day_of_week: format(day, 'EEEE').toLowerCase(),
        start_at: block.start.toUTC().toISO(),
        end_at: block.end.toUTC().toISO(),
        is_active: true,
        is_deleted: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      onAvailabilityClick(day, availabilityBlock);
    }
  };

  // Handle click on an appointment block
  const handleAppointmentClick = (appointment: any) => {
    CalendarDebugUtils.log(COMPONENT_NAME, 'Appointment clicked', {
      id: appointment.id,
      clientName: appointment.clientName,
      clientId: appointment.client_id,
      hasClient: !!appointment.client,
      start_at: appointment.start_at,
      end_at: appointment.end_at
    });
    
    // Ensure we're passing the complete original appointment
    const originalAppointment = appointments?.find(a => a.id === appointment.id);
    
    if (originalAppointment) {
      CalendarDebugUtils.log(COMPONENT_NAME, 'Found original appointment with complete data');
      setSelectedAppointment(originalAppointment);
    } else {
      CalendarDebugUtils.warn(COMPONENT_NAME, 'Original appointment not found, converting to full appointment');
      // Convert to a full appointment object if it's not already
      const fullAppointment = convertAppointmentBlockToAppointment(appointment, appointments || []);
      setSelectedAppointment(fullAppointment);
    }
    
    setIsAppointmentDetailsOpen(true);
    
    // Also call the parent's onAppointmentClick if provided
    if (onAppointmentClick) {
      onAppointmentClick(originalAppointment || appointment);
    }
  };

  // Handle appointment updated
  const handleAppointmentUpdated = () => {
    // This will trigger a refresh of the calendar data
    if (onAppointmentUpdate) {
      // We don't have the new values here, but we can signal to the parent
      // that an update occurred so it can refresh the data
      CalendarDebugUtils.log(COMPONENT_NAME, "Appointment updated, triggering refresh");
      onAppointmentUpdate("refresh-trigger", "", "");
    }
    
    // Close the appointment details dialog and clear selection
    setIsAppointmentDetailsOpen(false);
    setSelectedAppointment(null);
  };
  
  // Handle appointment drag start
  const handleAppointmentDragStart = (appointment: any, event: React.DragEvent) => {
    CalendarDebugUtils.log(COMPONENT_NAME, 'Appointment drag started', appointment);
    setDraggedAppointmentId(appointment.id);
  };
  
  // Handle drag over a time slot
  const handleAppointmentDragOver = (day: Date, timeSlot: Date, event: React.DragEvent) => {
    event.preventDefault(); // Allow drop
  };
  
  // Handle drop on a time slot
  const handleAppointmentDrop = (day: Date, timeSlot: Date, event: React.DragEvent) => {
    if (!draggedAppointmentId || !onAppointmentUpdate) return;
    
    try {
      // Get the dragged appointment data
      const dragDataJson = event.dataTransfer.getData('application/json');
      CalendarDebugUtils.log(COMPONENT_NAME, 'Drop data received', { dragDataJson });
      
      const dragData = JSON.parse(dragDataJson);
      
      const appointmentId = dragData.appointmentId;
      
      // Find the original appointment with more flexible matching
      const appointment = appointments?.find(a => 
        a.id === appointmentId || a.appointmentId === appointmentId
      );
      
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
        
        CalendarDebugUtils.log(COMPONENT_NAME, 'Updating appointment', {
          appointmentId,
          newStartAt,
          newEndAt
        });
        
        // Call the update handler
        onAppointmentUpdate(appointmentId, newStartAt, newEndAt);
      } else {
        // FALLBACK: Even if we couldn't find the appointment, try to update using the dragData
        CalendarDebugUtils.warn(COMPONENT_NAME, 'Using fallback values from dragData to update appointment');
        
        // Create new start and end times based on the drop target
        const newStartDateTime = TimeZoneService.fromJSDate(timeSlot, userTimeZone);
        // Assume a default duration of 60 minutes if we can't determine it from the appointment
        const newEndDateTime = newStartDateTime.plus({ minutes: 60 });
        
        // Convert to UTC ISO strings for the database
        const newStartAt = newStartDateTime.toUTC().toISO();
        const newEndAt = newEndDateTime.toUTC().toISO();
        
        onAppointmentUpdate(appointmentId, newStartAt, newEndAt);
      }
    } catch (error) {
      CalendarDebugUtils.error(COMPONENT_NAME, 'Error handling appointment drop', error);
    }
    
    // Reset the dragged appointment ID
    setDraggedAppointmentId(null);
  };

  // Get a formatted time string for display
  const formatTime = (date: Date) => {
    return format(date, 'h:mm a');
  };

  // Log render performance
  useEffect(() => {
    const renderDuration = performance.now() - renderStartTime;
    CalendarDebugUtils.logPerformance(COMPONENT_NAME, 'render', renderDuration, {
      timeSlots: totalTimeSlots,
      days: weekDays.length,
      appointments: appointmentBlocks.length,
      availabilityBlocks: timeBlocks.length
    });
  }, [renderStartTime, totalTimeSlots, weekDays.length, appointmentBlocks.length, timeBlocks.length]);

  if (loading) {
    return <div className="flex justify-center items-center h-32">Loading calendar...</div>;
  }

  return (
    <ErrorBoundary
      componentName={COMPONENT_NAME}
      contextData={{
        daysCount: days.length,
        appointmentsCount: appointments.length,
        timeZone: userTimeZone
      }}
    >
      <div className="flex flex-col">
        {/* AppointmentDetailsDialog */}
        <AppointmentDetailsDialog 
          isOpen={isAppointmentDetailsOpen}
          onClose={() => {
            setIsAppointmentDetailsOpen(false);
            setSelectedAppointment(null);
          }}
          appointment={selectedAppointment}
          onAppointmentUpdated={handleAppointmentUpdated}
          userTimeZone={userTimeZone}
        />

        {/* Time column headers */}
        <div className="flex">
          {/* Time label column header - add matching width to align with time labels */}
          <div className="w-16 flex-shrink-0"></div>
          {/* Day headers - use exact same width as the day columns below */}
          {weekDays.map(day => (
            <div 
              key={day.toISOString()} 
              className="w-24 flex-1 px-2 py-1 font-semibold text-center border-r last:border-r-0"
            >
              <div className="text-sm">{format(day, 'EEE')}</div>
              <div className="text-xs">{format(day, 'MMM d')}</div>
            </div>
          ))}
        </div>

        {/* Time slots grid with virtualization */}
        <div className="flex">
          {/* Time labels column - virtualized */}
          <div 
            ref={timeColumnRef}
            className="w-16 flex-shrink-0 overflow-hidden"
            style={{ height: `${totalTimeSlots * 40}px` }}
          >
            <div 
              style={{ 
                height: `${rowVirtualizer.getTotalSize()}px`,
                width: '100%',
                position: 'relative',
                transform: `translateY(-${scrollPosition}px)`
              }}
            >
              {rowVirtualizer.getVirtualItems().map(virtualRow => {
                const timeSlot = TIME_SLOTS[virtualRow.index];
                return (
                  <div 
                    key={virtualRow.index}
                    className="h-10 flex items-center justify-end pr-2 text-xs text-gray-500"
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: `${virtualRow.size}px`,
                      transform: `translateY(${virtualRow.start}px)`
                    }}
                  >
                    {formatTime(timeSlot)}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Days columns - virtualized */}
          <div 
            ref={parentRef}
            className="flex-1 overflow-auto"
            style={{ height: '600px' }}
          >
            <div 
              style={{ 
                height: `${rowVirtualizer.getTotalSize()}px`,
                width: '100%',
                position: 'relative'
              }}
            >
              <div className="flex" style={{ position: 'absolute', top: 0, left: 0, width: '100%' }}>
                {weekDays.map(day => (
                  <div key={format(day, 'yyyy-MM-dd')} className="flex-1 border-r last:border-r-0">
                    {rowVirtualizer.getVirtualItems().map(virtualRow => {
                      const timeSlot = TIME_SLOTS[virtualRow.index];
                      
                      // Convert JS Date to DateTime objects for consistent checking
                      const dayDt = TimeZoneService.fromJSDate(day, userTimeZone);
                      const timeSlotDt = TimeZoneService.fromJSDate(timeSlot, userTimeZone);
                      
                      // Perform availability checks and get relevant blocks
                      const isAvailable = showAvailability && isTimeSlotAvailable(
                        day, 
                        timeSlot
                      );
                      
                      // Get the corresponding block if available
                      const currentBlock = isAvailable ? getBlockForTimeSlot(
                        day, 
                        timeSlot
                      ) : undefined;
                      
                      // Get any appointment for this time slot
                      const appointment = getAppointmentForTimeSlot(
                        day, 
                        timeSlot
                      );
                      
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
                          key={virtualRow.index}
                          className={`h-10 border-b border-l first:border-l-0 group 
                                      ${virtualRow.index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}`}
                          style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: `${virtualRow.size}px`,
                            transform: `translateY(${virtualRow.start}px)`
                          }}
                        >
                          <TimeSlot
                            day={day}
                            timeSlot={timeSlot}
                            isAvailable={isAvailable}
                            currentBlock={currentBlock}
                            appointment={appointment}
                            isStartOfBlock={isStartOfBlock}
                            isEndOfBlock={isEndOfBlock}
                            isStartOfAppointment={isStartOfAppointment}
                            isEndOfAppointment={isEndOfAppointment}
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
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Debug section */}
        {import.meta.env.MODE === 'development' && (
          <div className="mt-4 p-4 bg-gray-100 rounded">
            <h3 className="text-lg font-semibold">Debug Info</h3>
            <p>Clinician ID: {selectedClinicianId || 'None'}</p>
            <p>Time Blocks: {timeBlocks.length}</p>
            <p>Appointments: {appointmentBlocks.length}</p>
            <p>User Timezone: {userTimeZone}</p>
            <p>Virtualized Rows: {rowVirtualizer.getVirtualItems().length} of {totalTimeSlots}</p>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
};

export default VirtualizedWeekView;
