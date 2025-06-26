import React, { useMemo, useState } from 'react';
import { useAppointments } from '@/hooks/useAppointments';
import { useAvailability, ProcessedAvailability } from '@/hooks/useAvailability';
import { format, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns';
import { Plus, Calendar, Cloud } from 'lucide-react';
import { Button } from '@/components/ui/button';
import InternalAppointmentCard from './InternalAppointmentCard';
import CalendarLoadingState from './CalendarLoadingState';
import CalendarErrorState from './CalendarErrorState';
import { cn } from '@/lib/utils';
import AvailabilityEditDialog from './AvailabilityEditDialog';
import { AvailabilityBlock } from './availability-edit/types';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface VirtualCalendarProps {
  clinicianId: string | null;
  currentDate: Date;
  userTimeZone: string;
  onNewAppointment?: (date: Date, time?: string) => void;
  onAppointmentClick?: (appointment: any) => void;
  refreshTrigger: number;
  onAvailabilityUpdated: () => void;
}

const VirtualCalendar: React.FC<VirtualCalendarProps> = ({
  clinicianId,
  currentDate,
  userTimeZone,
  onNewAppointment,
  onAppointmentClick,
  refreshTrigger,
  onAvailabilityUpdated,
}) => {
  // Calculate date range for fetching appointments (current week)
  const startDate = useMemo(() => startOfWeek(currentDate), [currentDate]);
  const endDate = useMemo(() => endOfWeek(currentDate), [currentDate]);
  
  const { 
    appointments, 
    isLoading: isLoadingAppointments, 
    error: appointmentsError,
    refetch 
  } = useAppointments(clinicianId || '', startDate, endDate, userTimeZone, refreshTrigger);

  const {
    data: availability,
    isLoading: isLoadingAvailability,
    error: availabilityError,
  } = useAvailability(clinicianId, startDate, endDate, refreshTrigger);

  // --- Start: Fetch external calendar mappings for visual indicators ---
  const appointmentIds = useMemo(() => appointments.map(a => a.id), [appointments]);

  const { data: mappings } = useQuery({
    queryKey: ['calendarMappings', appointmentIds, refreshTrigger],
    queryFn: async () => {
      if (!appointmentIds || appointmentIds.length === 0) return [];
      const { data, error } = await supabase
        .from('external_calendar_mappings')
        .select('appointment_id')
        .in('appointment_id', appointmentIds);
      if (error) throw new Error(error.message);
      return data;
    },
    enabled: !!clinicianId && appointmentIds.length > 0,
  });

  const syncedAppointmentIds = useMemo(() => {
    return new Set(mappings?.map(m => m.appointment_id));
  }, [mappings]);
  // --- End: Fetch external calendar mappings ---

  const [isEditAvailabilityOpen, setIsEditAvailabilityOpen] = useState(false);
  const [selectedAvailability, setSelectedAvailability] = useState<{ block: AvailabilityBlock, date: Date } | null>(null);

  // Generate week days for the calendar grid
  const weekDays = useMemo(() => {
    return eachDayOfInterval({ start: startDate, end: endDate });
  }, [startDate, endDate]);

  // Filter appointments for the current week and group by date
  const appointmentsByDate = useMemo(() => {
    const grouped: { [key: string]: any[] } = {};
    
    appointments
      .filter(appointment => {
        const appointmentDate = new Date(appointment.start_at);
        return appointmentDate >= startDate && appointmentDate <= endDate;
      })
      .forEach(appointment => {
        const appointmentDate = new Date(appointment.start_at);
        const dateKey = format(appointmentDate, 'yyyy-MM-dd');
        
        if (!grouped[dateKey]) {
          grouped[dateKey] = [];
        }
        
        grouped[dateKey].push(appointment);
      });
    
    // Sort appointments by start time for each date
    Object.keys(grouped).forEach(dateKey => {
      grouped[dateKey].sort((a, b) => 
        new Date(a.start_at).getTime() - new Date(b.start_at).getTime()
      );
    });
    
    return grouped;
  }, [appointments, startDate, endDate]);

  const availabilityByDate = useMemo(() => {
    const grouped: { [key: string]: ProcessedAvailability[] } = {};
    if (!availability) return grouped;

    availability.forEach(block => {
      const dateKey = format(block.date, 'yyyy-MM-dd');
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(block);
    });
    return grouped;
  }, [availability]);

  const handleAvailabilityClick = (block: ProcessedAvailability, day: Date) => {
    const availabilityBlockForDialog: AvailabilityBlock = {
      id: block.id,
      day_of_week: block.day_of_week,
      start_time: block.start_time,
      end_time: block.end_time,
      isException: block.isException,
    };
    setSelectedAvailability({ block: availabilityBlockForDialog, date: day });
    setIsEditAvailabilityOpen(true);
  };

  const handleTimeSlotClick = (day: Date, hour: number) => {
    const appointmentTime = new Date(day);
    appointmentTime.setHours(hour, 0, 0, 0);
    onNewAppointment?.(appointmentTime, `${hour.toString().padStart(2, '0')}:00`);
  };

  const error = appointmentsError || availabilityError;
  const isLoading = isLoadingAppointments || isLoadingAvailability;

  // Show error state
  if (error) {
    return (
      <CalendarErrorState
        message={`Error loading calendar data: ${error.message}`}
        onRetry={refetch}
      />
    );
  }

  // Show loading state
  if (isLoading) {
    return <CalendarLoadingState message="Loading schedule..." />;
  }

  // Time slots for the day (8 AM to 6 PM)
  const timeSlots = Array.from({ length: 10 }, (_, i) => i + 8);

  return (
    <div className="space-y-4">
      {/* Calendar Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          <h3 className="text-lg font-semibold">Your Schedule</h3>
        </div>
        <Button 
          onClick={() => onNewAppointment?.(new Date())} 
          size="sm"
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          New Appointment
        </Button>
      </div>

      {/* Week view calendar grid */}
      <TooltipProvider>
        <div className="border rounded-lg overflow-hidden bg-white">
          {/* Day headers */}
          <div className="grid grid-cols-8 bg-gray-50 border-b">
            <div className="p-3 text-center border-r font-medium text-sm">Time</div>
            {weekDays.map((day) => (
              <div key={day.toISOString()} className="p-3 text-center border-r last:border-r-0">
                <div className="font-medium text-sm">{format(day, 'EEE')}</div>
                <div className="text-lg">{format(day, 'd')}</div>
                <div className="text-xs text-gray-500">{format(day, 'MMM')}</div>
              </div>
            ))}
          </div>

          {/* Time slots grid */}
          {timeSlots.map((hour) => (
            <div key={hour} className="grid grid-cols-8 border-b last:border-b-0">
              {/* Time label */}
              <div className="p-3 border-r bg-gray-50 text-sm font-medium text-center">
                {format(new Date().setHours(hour, 0, 0, 0), 'h a')}
              </div>
              
              {/* Day cells */}
              {weekDays.map((day) => {
                const dateKey = format(day, 'yyyy-MM-dd');
                const dayAppointments = appointmentsByDate[dateKey] || [];
                const dayAvailability = availabilityByDate[dateKey] || [];
                
                const hourAppointments = dayAppointments.filter(appointment => {
                  const appointmentHour = new Date(appointment.start_at).getHours();
                  return appointmentHour === hour;
                });

                const currentSlotTime = new Date(day);
                currentSlotTime.setHours(hour, 0, 0, 0);

                let availabilityBlockForSlot: ProcessedAvailability | null = null;
                for (const block of dayAvailability) {
                    const start = new Date(day);
                    const [startH, startM] = block.start_time.split(':');
                    start.setHours(parseInt(startH), parseInt(startM), 0, 0);

                    const end = new Date(day);
                    const [endH, endM] = block.end_time.split(':');
                    end.setHours(parseInt(endH), parseInt(endM), 0, 0);
                    
                    if (currentSlotTime >= start && currentSlotTime < end) {
                        availabilityBlockForSlot = block;
                        break;
                    }
                }

                return (
                  <div 
                    key={`${day.toISOString()}-${hour}`} 
                    className={cn(
                      "min-h-[60px] border-r last:border-r-0 p-1 relative hover:bg-gray-50",
                      availabilityBlockForSlot && !hourAppointments.length && "bg-green-50 cursor-pointer"
                    )}
                    onClick={() => {
                      if (!hourAppointments.length) {
                         if (availabilityBlockForSlot) {
                           handleAvailabilityClick(availabilityBlockForSlot, day);
                         } else {
                           handleTimeSlotClick(day, hour)
                         }
                      }
                    }}
                  >
                    {hourAppointments.map((appointment) => (
                      <div key={appointment.id} className="relative mb-1">
                        <InternalAppointmentCard
                          appointment={appointment}
                          onClick={() => onAppointmentClick?.(appointment)}
                        />
                        {syncedAppointmentIds.has(appointment.id) && (
                          <Tooltip>
                            <TooltipTrigger className="absolute top-1 right-1">
                              <Cloud
                                className="h-3 w-3 text-gray-400"
                              />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Synced with external calendar</p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </TooltipProvider>

      {/* Appointments summary */}
      <div className="text-sm text-gray-600">
        Showing {appointments.length} appointments and {availability?.length || 0} availability blocks for this week.
      </div>

      {selectedAvailability && (
        <AvailabilityEditDialog
          isOpen={isEditAvailabilityOpen}
          onClose={() => setIsEditAvailabilityOpen(false)}
          availabilityBlock={selectedAvailability.block}
          specificDate={selectedAvailability.date}
          clinicianId={clinicianId}
          onAvailabilityUpdated={() => {
            setIsEditAvailabilityOpen(false);
            onAvailabilityUpdated();
          }}
        />
      )}
    </div>
  );
};

export default VirtualCalendar;
