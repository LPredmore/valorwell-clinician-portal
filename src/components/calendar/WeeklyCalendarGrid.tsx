
import React, { useState, useMemo } from 'react';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, parseISO } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, User, Calendar as CalendarIcon } from 'lucide-react';
import { useAppointments } from '@/hooks/useAppointments';
import { TimeZoneService } from '@/utils/timeZoneService';
import { Appointment } from '@/types/appointment';

interface WeeklyCalendarGridProps {
  currentDate: Date;
  clinicianId: string | null;
  userTimeZone: string;
  onAvailabilityClick?: (date: Date, startTime: string, endTime: string) => void;
}

const WeeklyCalendarGrid: React.FC<WeeklyCalendarGridProps> = ({
  currentDate,
  clinicianId,
  userTimeZone,
  onAvailabilityClick,
}) => {
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);

  // Calculate week dates
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 0 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  // Fetch appointments using the hook
  const {
    appointments,
    isLoading,
    error,
    startVideoSession,
    openSessionTemplate,
  } = useAppointments(clinicianId, weekStart, weekEnd, userTimeZone);

  // DEBUG: Log what we're receiving
  console.log('[WeeklyCalendarGrid] Component State:', {
    clinicianId,
    userTimeZone,
    weekStart: weekStart.toISOString(),
    weekEnd: weekEnd.toISOString(),
    appointmentsReceived: appointments?.length || 0,
    appointments: appointments,
    isLoading,
    error: error?.message || null
  });

  // Group appointments by date
  const appointmentsByDate = useMemo(() => {
    const grouped: { [key: string]: Appointment[] } = {};
    
    if (!appointments || appointments.length === 0) {
      console.log('[WeeklyCalendarGrid] No appointments to group');
      return grouped;
    }

    appointments.forEach((appointment) => {
      if (!appointment.start_at) {
        console.warn('[WeeklyCalendarGrid] Appointment missing start_at:', appointment);
        return;
      }

      try {
        // Parse the UTC timestamp and convert to local date
        const appointmentDate = parseISO(appointment.start_at);
        const dateKey = format(appointmentDate, 'yyyy-MM-dd');
        
        if (!grouped[dateKey]) {
          grouped[dateKey] = [];
        }
        
        grouped[dateKey].push(appointment);
        
        console.log('[WeeklyCalendarGrid] Grouped appointment:', {
          appointmentId: appointment.id,
          start_at: appointment.start_at,
          dateKey,
          clientName: appointment.clientName
        });
      } catch (error) {
        console.error('[WeeklyCalendarGrid] Error parsing appointment date:', error, appointment);
      }
    });

    console.log('[WeeklyCalendarGrid] Final grouped appointments:', grouped);
    return grouped;
  }, [appointments]);

  const formatTime = (dateTimeString: string) => {
    try {
      const date = parseISO(dateTimeString);
      return format(date, 'h:mm a');
    } catch (error) {
      console.error('Error formatting time:', error);
      return 'Invalid time';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'scheduled':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'confirmed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'completed':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'blocked':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const handleAppointmentClick = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
              <p>Loading appointments...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-64">
            <div className="text-center text-red-600">
              <p>Error loading appointments: {error.message}</p>
              <p className="text-sm mt-2">Check console for detailed debugging information</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            Weekly Calendar
          </CardTitle>
          <div className="text-sm text-gray-600">
            {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
            {appointments && appointments.length > 0 && (
              <span className="ml-2 bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                {appointments.length} appointment{appointments.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-2 mb-4">
            {/* Day headers */}
            {weekDays.map((day) => (
              <div key={day.toISOString()} className="text-center p-2 font-medium border-b">
                <div className="text-sm text-gray-600">{format(day, 'EEE')}</div>
                <div className="text-lg">{format(day, 'd')}</div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-2 min-h-[400px]">
            {/* Day columns */}
            {weekDays.map((day) => {
              const dateKey = format(day, 'yyyy-MM-dd');
              const dayAppointments = appointmentsByDate[dateKey] || [];
              const isToday = isSameDay(day, new Date());

              return (
                <div
                  key={day.toISOString()}
                  className={`border rounded-lg p-2 min-h-[380px] ${
                    isToday ? 'bg-blue-50 border-blue-200' : 'bg-white'
                  }`}
                >
                  <div className="space-y-2">
                    {dayAppointments.length === 0 ? (
                      <div className="text-xs text-gray-400 text-center pt-4">
                        No appointments
                      </div>
                    ) : (
                      dayAppointments.map((appointment) => (
                        <div
                          key={appointment.id}
                          className={`p-2 rounded border cursor-pointer hover:shadow-sm transition-all ${getStatusColor(
                            appointment.status
                          )}`}
                          onClick={() => handleAppointmentClick(appointment)}
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-1 text-xs">
                              <Clock className="h-3 w-3" />
                              <span>{formatTime(appointment.start_at)}</span>
                            </div>
                            
                            <div className="flex items-center gap-1 text-xs">
                              <User className="h-3 w-3" />
                              <span className="truncate">
                                {appointment.clientName || 'Unknown Client'}
                              </span>
                            </div>
                            
                            <div className="text-xs font-medium">
                              {appointment.type}
                            </div>
                            
                            <Badge variant="outline" className="text-xs">
                              {appointment.status}
                            </Badge>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Debug Information */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-4 p-4 bg-gray-100 rounded text-xs">
              <strong>Debug Info:</strong>
              <div>Clinician ID: {clinicianId}</div>
              <div>Week Start: {weekStart.toISOString()}</div>
              <div>Week End: {weekEnd.toISOString()}</div>
              <div>Appointments Found: {appointments?.length || 0}</div>
              <div>Time Zone: {userTimeZone}</div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Appointment Detail Modal/Panel */}
      {selectedAppointment && (
        <Card>
          <CardHeader>
            <CardTitle>Appointment Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <strong>Client:</strong> {selectedAppointment.clientName || 'Unknown'}
              </div>
              <div>
                <strong>Time:</strong> {formatTime(selectedAppointment.start_at)} - {formatTime(selectedAppointment.end_at)}
              </div>
              <div>
                <strong>Type:</strong> {selectedAppointment.type}
              </div>
              <div>
                <strong>Status:</strong> {selectedAppointment.status}
              </div>
              {selectedAppointment.notes && (
                <div>
                  <strong>Notes:</strong> {selectedAppointment.notes}
                </div>
              )}
              <div className="flex gap-2">
                <Button onClick={() => startVideoSession(selectedAppointment)}>
                  Start Session
                </Button>
                <Button variant="outline" onClick={() => openSessionTemplate(selectedAppointment)}>
                  Document Session
                </Button>
                <Button variant="outline" onClick={() => setSelectedAppointment(null)}>
                  Close
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default WeeklyCalendarGrid;
