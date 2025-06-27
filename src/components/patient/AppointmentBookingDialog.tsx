
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { format, addDays, isSameDay, parseISO } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { getUserTimeZone } from '@/utils/timeZoneUtils';
import { TimeZoneService } from '@/utils/timeZoneService';
import { DateTime } from 'luxon';
import { useNavigate } from 'react-router-dom';
import { useUser } from '@/context/UserContext';
import { BLOCKED_TIME_CLIENT_ID } from '@/utils/blockedTimeUtils';

import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { filterRealClients } from '@/utils/clientFilterUtils';

// Types for appointment slots
interface AppointmentSlot {
  time: string;
  formattedTime: string;
  available: boolean;
  timezone: string;
}

interface AvailabilitySettings {
  time_granularity: 'hour' | 'half_hour';
  min_days_ahead: number;
  max_days_ahead: number;
}

interface ClinicianAvailabilityData {
  [key: string]: string | null;
  clinician_time_granularity?: 'hour' | 'half_hour';
}

interface AvailabilityBlock {
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
}

const formatDateTime = (timestamp: string, timezone: string): string => {
  return DateTime.fromISO(timestamp, { zone: 'UTC' })
    .setZone(timezone)
    .toFormat('yyyy-MM-dd HH:mm:ss ZZZZ');
};

const isPastDate = (date: Date): boolean => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date < today;
};

// Helper function to get and validate clinician timezone
const getClinicianTimezone = async (clinicianId: string): Promise<string> => {
  console.log('[AppointmentBookingDialog] Fetching clinician timezone for ID:', clinicianId);
  
  const { data, error } = await supabase
    .from('clinicians')
    .select('clinician_time_zone')
    .eq('id', clinicianId)
    .single();
    
  if (error) {
    console.error('[AppointmentBookingDialog] Error fetching clinician timezone:', error);
    throw new Error(`Failed to fetch clinician timezone: ${error.message}`);
  }
  
  console.log('[AppointmentBookingDialog] Raw clinician timezone data:', data);
  
  let timezone = data?.clinician_time_zone;
  
  if (!timezone) {
    console.error('[AppointmentBookingDialog] No timezone found for clinician');
    throw new Error('Clinician timezone is not configured. Please contact an administrator.');
  }
  
  // If timezone is an array, use the first value
  if (Array.isArray(timezone)) {
    console.log('[AppointmentBookingDialog] Timezone is array, using first value:', timezone[0]);
    timezone = timezone[0];
  }
  
  // Ensure it's a string
  timezone = String(timezone);
  
  if (!timezone || timezone.trim() === '') {
    console.error('[AppointmentBookingDialog] Empty timezone string');
    throw new Error('Clinician timezone is empty. Please contact an administrator.');
  }
  
  console.log('[AppointmentBookingDialog] Final processed timezone:', timezone);
  return timezone;
};

export interface AppointmentBookingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clinicianId: string | null;
  clinicianName?: string | null;
  clientId?: string | null; 
  onAppointmentBooked?: () => void;
  userTimeZone?: string;
}

export const AppointmentBookingDialog: React.FC<AppointmentBookingDialogProps> = ({
  open, 
  onOpenChange,
  clinicianId,
  clinicianName,
  clientId,
  onAppointmentBooked,
  userTimeZone
}) => {
  // Tomorrow as default
  const tomorrow = useMemo(() => addDays(new Date(), 1), []);
  
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(tomorrow);
  const [timeSlots, setTimeSlots] = useState<AppointmentSlot[]>([]);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isBooking, setIsBooking] = useState(false);
  const [availabilityBlocks, setAvailabilityBlocks] = useState<AvailabilityBlock[]>([]);
  const [existingAppointments, setExistingAppointments] = useState<any[]>([]);
  const [availabilitySettings, setAvailabilitySettings] = useState<AvailabilitySettings>({
    time_granularity: 'hour',
    min_days_ahead: 1,
    max_days_ahead: 30
  });
  const [apiErrors, setApiErrors] = useState<{
    availabilitySettings?: string;
    availabilityBlocks?: string;
    appointments?: string;
    auth?: string;
  }>({});
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const { userId, isLoading: userIsLoading, authInitialized } = useUser();
  const [authError, setAuthError] = useState<string | null>(null);
  const [loadingTimeout, setLoadingTimeout] = useState(false);
  
  const clientTimeZone = useMemo(() => {
    return TimeZoneService.ensureIANATimeZone(
      userTimeZone || getUserTimeZone() || TimeZoneService.DEFAULT_TIMEZONE
    );
  }, [userTimeZone]);

  const daysDiff = useMemo(() => {
    if (!selectedDate || !clientTimeZone) {
      console.log('[BookingDialog] daysDiff calculation: selectedDate or userTimeZone not available, returning 0.');
      return 0;
    }

    const todayAtStartOfDay = DateTime.now().setZone(clientTimeZone).startOf('day');
    const selectedDateAtStartOfDay = DateTime.fromJSDate(selectedDate).setZone(clientTimeZone).startOf('day');
    
    const diff = selectedDateAtStartOfDay.diff(todayAtStartOfDay, 'days').days;
    console.log(`[BookingDialog] Calculated daysDiff: ${diff} (Selected: ${selectedDateAtStartOfDay.toISODate()}, Today: ${todayAtStartOfDay.toISODate()})`);
    return diff;
  }, [selectedDate, clientTimeZone]);

  // Fetch availability settings from Supabase Edge Function, memoized to prevent recreation
  const fetchAvailabilitySettings = useCallback(async () => {
    if (!clinicianId) return;
    
    try {
      console.log('Fetching availability settings for clinician:', clinicianId);
      const { data, error } = await supabase.functions.invoke('getavailabilitysettings', {
        body: { clinicianId }
      });
      
      if (error) {
        console.error('Error fetching availability settings:', error);
        setApiErrors(prev => ({ ...prev, availabilitySettings: error.message }));
        return;
      }
      
      console.log('Received availability settings:', data);
      setAvailabilitySettings({
        time_granularity: data.time_granularity || 'hour',
        min_days_ahead: data.min_days_ahead || 1,
        max_days_ahead: data.max_days_ahead || 30
      });
      
    } catch (error) {
      console.error('Error in fetchAvailabilitySettings:', error);
      setApiErrors(prev => ({ ...prev, availabilitySettings: 'Failed to fetch availability settings' }));
    }
  }, [clinicianId]);
  
  const fetchAvailabilityBlocks = useCallback(async () => {
    if (!clinicianId || !selectedDate) return;
    
    try {
      setIsLoading(true);
      
      const dayOfWeek = selectedDate.getDay();
      const dayName = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][dayOfWeek];
      
      console.log(`[BookingDialog] Fetching availability for clinician ${clinicianId} on ${dayName} (day ${dayOfWeek})`);
      
      const { data, error } = await supabase
        .from('clinicians')
        .select('*')
        .eq('id', clinicianId)
        .single();
      
      if (error) {
        console.error(`[BookingDialog] Error fetching clinician availability:`, error);
        setApiErrors(prev => ({ ...prev, availabilityBlocks: error.message }));
        setAvailabilityBlocks([]);
        return;
      }
      
      const clinicianData = data as ClinicianAvailabilityData;
      
      console.log(`[BookingDialog] Retrieved clinician availability data:`, clinicianData);
      
      const blocks: AvailabilityBlock[] = [];
      
      for (let i = 1; i <= 3; i++) {
        const startTimeKey = `clinician_availability_start_${dayName}_${i}`;
        const endTimeKey = `clinician_availability_end_${dayName}_${i}`;
        
        const startTime = clinicianData[startTimeKey];
        const endTime = clinicianData[endTimeKey];
        
        if (startTime && endTime) {
          blocks.push({
            day_of_week: dayOfWeek,
            start_time: startTime,
            end_time: endTime,
            is_active: true
          });
        }
      }
      
      console.log(`[BookingDialog] Transformed availability blocks:`, blocks);
      
      if (clinicianData.clinician_time_granularity) {
        setAvailabilitySettings(prev => ({
          ...prev,
          time_granularity: clinicianData.clinician_time_granularity as 'hour' | 'half_hour'
        }));
      }
      
      setAvailabilityBlocks(blocks);
      
    } catch (error) {
      console.error('[BookingDialog] Error in fetchAvailabilityBlocks:', error);
      setApiErrors(prev => ({ ...prev, availabilityBlocks: 'Failed to fetch availability blocks' }));
      setAvailabilityBlocks([]);
    } finally {
      setIsLoading(false);
    }
  }, [clinicianId, selectedDate]);

  const fetchExistingAppointments = useCallback(async () => {
    if (!clinicianId || !selectedDate || !(clientId || userId)) return;
    
    const effectiveUserId = clientId || userId;
    
    try {
      console.log('Fetching appointments for client:', effectiveUserId);
      console.log('Using time zone:', clientTimeZone);
      
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const nextDateStr = format(addDays(selectedDate, 1), 'yyyy-MM-dd');
      
      const startUtc = DateTime.fromISO(`${dateStr}T00:00:00`, { zone: clientTimeZone }).toUTC().toISO();
      const endUtc = DateTime.fromISO(`${nextDateStr}T00:00:00`, { zone: clientTimeZone }).toUTC().toISO();
      
      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('clinician_id', clinicianId)
        .gte('start_at', startUtc)
        .lt('start_at', endUtc);
      
      if (error) {
        setApiErrors(prev => ({ ...prev, appointments: error.message }));
        return;
      }
      
      console.log('Appointments data from Supabase:', data);
      
      // Filter out blocked time appointments using centralized utility
      const realAppointments = (data || []).filter(appointment => 
        appointment.client_id !== BLOCKED_TIME_CLIENT_ID
      );
      
      const formattedAppointments = realAppointments.map(appointment => ({
        ...appointment,
        localStart: formatDateTime(appointment.start_at, clientTimeZone),
        localEnd: formatDateTime(appointment.end_at, clientTimeZone)
      }));
      
      console.log('Filtered real appointments:', formattedAppointments.length, 'of', data?.length || 0);
      setExistingAppointments(formattedAppointments);
      
    } catch (error) {
      console.error('Error fetching appointments:', error);
      setApiErrors(prev => ({ ...prev, appointments: 'Failed to fetch appointments' }));
    }
  }, [clinicianId, selectedDate, userId, clientId, clientTimeZone]);

  const generateTimeSlots = useCallback(() => {
    if (!selectedDate || !availabilityBlocks) return;
    
    console.log('[BookingDialog] Generating slots for date:', format(selectedDate, 'yyyy-MM-dd'));
    console.log('[BookingDialog] Days from today:', daysDiff, 'minDaysAhead:', availabilitySettings.min_days_ahead);
    
    if (daysDiff < availabilitySettings.min_days_ahead) {
      console.log('[BookingDialog] Selected date is too soon, should be blocked');
      setTimeSlots([]);
      return;
    }
    
    const dayOfWeek = selectedDate.getDay();
    const availableBlocks = availabilityBlocks.filter(block => 
      block.day_of_week === dayOfWeek
    );
    
    if (availableBlocks.length === 0) {
      setTimeSlots([]);
      return;
    }
    
    const slots: AppointmentSlot[] = [];
    const interval = availabilitySettings.time_granularity === 'hour' ? 60 : 30;
    
    availableBlocks.forEach(block => {
      try {
        const startParts = block.start_time.split(':').map(Number);
        const endParts = block.end_time.split(':').map(Number);
        
        const startMinutes = startParts[0] * 60 + startParts[1];
        const endMinutes = endParts[0] * 60 + endParts[1];
        
        for (let time = startMinutes; time < endMinutes; time += interval) {
          const hour = Math.floor(time / 60);
          const minute = time % 60;
          const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
          
          const isSlotBooked = existingAppointments.some(appointment => {
            const appointmentStart = DateTime.fromISO(appointment.start_at).setZone(clientTimeZone);
            const appointmentHour = appointmentStart.hour;
            const appointmentMinute = appointmentStart.minute;
            
            return (
              isSameDay(selectedDate, parseISO(appointment.start_at)) &&
              hour === appointmentHour &&
              minute === appointmentMinute
            );
          });
          
          if (!isSlotBooked) {
            slots.push({
              time: timeStr,
              formattedTime: DateTime.fromObject({ 
                hour, 
                minute 
              }, { 
                zone: clientTimeZone 
              }).toFormat('h:mm a'),
              available: true,
              timezone: clientTimeZone
            });
          }
        }
      } catch (error) {
        console.error('Error processing availability block:', error, block);
      }
    });
    
    setTimeSlots(slots);
  }, [selectedDate, availabilityBlocks, existingAppointments, availabilitySettings, clientTimeZone, daysDiff]);

  // Fetch settings once when dialog opens
  useEffect(() => {
    if (open && clinicianId && !userIsLoading) {
      fetchAvailabilitySettings();
    }
  }, [open, clinicianId, fetchAvailabilitySettings, userIsLoading]);

  useEffect(() => {
    if (open && selectedDate && clinicianId && !userIsLoading && authInitialized) {
      console.log("[BookingDialog] Auth initialized and not loading, fetching availability blocks");
      fetchAvailabilityBlocks();
    }
  }, [open, selectedDate, clinicianId, fetchAvailabilityBlocks, userIsLoading, authInitialized]);

  useEffect(() => {
    if (open && selectedDate && clinicianId && (clientId || userId) && !userIsLoading && authInitialized) {
      console.log("[BookingDialog] Auth initialized and not loading, fetching existing appointments");
      fetchExistingAppointments();
    }
  }, [open, selectedDate, clinicianId, userId, clientId, fetchExistingAppointments, userIsLoading, authInitialized]);

  useEffect(() => {
    if (open && selectedDate && !userIsLoading && authInitialized) {
      console.log("[BookingDialog] Auth initialized and not loading, generating time slots");
      generateTimeSlots();
    }
  }, [open, selectedDate, availabilityBlocks, existingAppointments, generateTimeSlots, userIsLoading, authInitialized]);

  useEffect(() => {
    if (!open) {
      setSelectedTimeSlot(null);
      setApiErrors({});
    }
  }, [open]);

  // CRITICAL UPDATE: Handle booking appointment with proper timezone conversion
  const handleBookAppointment = async () => {
    if (!selectedDate || !selectedTimeSlot || !clinicianId || !(clientId || userId)) {
      toast({
        title: "Missing Information",
        description: "Please select a date and time for your appointment.",
        variant: "destructive"
      });
      return;
    }
    
    const effectiveUserId = clientId || userId;
    
    setIsBooking(true);
    
    try {
      // CRITICAL: Get the clinician's timezone first and validate it
      const clinicianTimezone = await getClinicianTimezone(clinicianId);
      
      console.log('[AppointmentBookingDialog] Using clinician timezone for appointment creation:', clinicianTimezone);
      
      // Format selected date and time for database
      const [hour, minute] = selectedTimeSlot.split(':').map(Number);
      
      // Create DateTime object in clinician's timezone (not user's timezone)
      const appointmentDateTime = DateTime.fromObject(
        {
          year: selectedDate.getFullYear(),
          month: selectedDate.getMonth() + 1,
          day: selectedDate.getDate(),
          hour,
          minute
        },
        { zone: clinicianTimezone } // Use clinician's timezone
      );
      
      // Convert to UTC for database storage
      const utcStart = appointmentDateTime.toUTC().toISO();
      const utcEnd = appointmentDateTime.plus({ minutes: 30 }).toUTC().toISO();
      
      if (!utcStart || !utcEnd) {
        throw new Error('Invalid date or time selected');
      }
      
      console.log('[AppointmentBookingDialog] Appointment timezone conversion:', {
        selectedWallTime: `${format(selectedDate, 'yyyy-MM-dd')} ${selectedTimeSlot}`,
        clinicianTimezone,
        utcStart,
        utcEnd
      });
      
      // Insert appointment into database
      const { data, error } = await supabase
        .from('appointments')
        .insert([
          {
            client_id: effectiveUserId,
            clinician_id: clinicianId,
            start_at: utcStart,
            end_at: utcEnd,
            status: 'scheduled',
            type: 'Therapy Session',
            appointment_timezone: clinicianTimezone // Save clinician's timezone
          }
        ])
        .select();
      
      if (error) throw error;
      
      toast({
        title: "Appointment Scheduled",
        description: "Your appointment has been successfully scheduled.",
      });
      
      if (onAppointmentBooked) {
        onAppointmentBooked();
      }
      
      onOpenChange(false);
      
    } catch (error) {
      console.error('Error booking appointment:', error);
      toast({
        title: "Booking Failed",
        description: error instanceof Error ? error.message : "There was an error booking your appointment. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsBooking(false);
    }
  };
  
  // Convenience function to handle dialog close
  const handleClose = () => {
    onOpenChange(false);
  };
  
  const disabledDays = useCallback((date: Date) => {
    if (isPastDate(date)) {
      return true;
    }
    
    const today = new Date();
    const daysDiff = Math.floor((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (daysDiff < availabilitySettings.min_days_ahead) {
      return true;
    }
    
    if (daysDiff > availabilitySettings.max_days_ahead) {
      return true;
    }
    
    return false;
  }, [availabilitySettings]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Book an Appointment</DialogTitle>
          <DialogDescription>
            Select a date and time for your appointment.
          </DialogDescription>
        </DialogHeader>
        
        <Alert className="mb-4">
          <AlertTitle>Booking Notice Required</AlertTitle>
          <AlertDescription>
            Please note that appointments must be booked at least {availabilitySettings.min_days_ahead} day{availabilitySettings.min_days_ahead > 1 ? 's' : ''} in advance.
          </AlertDescription>
        </Alert>
        
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <h3 className="text-lg font-medium mb-2">Select a Date</h3>
            <div className="border rounded-md p-2">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => {
                  setSelectedDate(date);
                  setSelectedTimeSlot(null);
                }}
                disabled={disabledDays}
                className="p-3 pointer-events-auto"
              />
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-medium mb-2">Select a Time</h3>
            
            {authError && (
              <div className="flex flex-col justify-center items-center h-40 p-4 bg-red-50 border border-red-200 rounded-md">
                <div className="text-red-500 mb-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                  </svg>
                </div>
                <p className="text-red-600 text-center">{authError}</p>
                <button
                  onClick={handleClose}
                  className="mt-4 px-3 py-1 bg-red-600 text-white text-sm rounded-md"
                >
                  Close
                </button>
              </div>
            )}
            
            {isLoading && !authError && (
              <div className="flex flex-col justify-center items-center h-40">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mb-2"></div>
                <p className="text-sm text-gray-600">
                  {userIsLoading || !authInitialized
                    ? "Initializing authentication..."
                    : "Loading available times..."}
                </p>
                {loadingTimeout && (
                  <p className="text-xs text-amber-600 mt-2">
                    This is taking longer than expected...
                  </p>
                )}
              </div>
            )}
            
            {!isLoading && timeSlots.length === 0 && (
              <div className="border rounded-md p-4 h-40 flex flex-col justify-center items-center text-center">
                {selectedDate && daysDiff < availabilitySettings.min_days_ahead ? (
                  <p>
                    Please select a date at least {availabilitySettings.min_days_ahead} day{availabilitySettings.min_days_ahead > 1 ? 's' : ''} in advance.
                  </p>
                ) : (
                  <p>
                    No available time slots for the selected date.
                    <br />
                    Please select another date.
                  </p>
                )}
              </div>
            )}
            
            {!isLoading && timeSlots.length > 0 && (
              <div className="grid grid-cols-2 gap-2 max-h-[300px] overflow-y-auto p-2 border rounded-md">
                {timeSlots.map((slot) => (
                  <Button
                    key={slot.time}
                    variant={selectedTimeSlot === slot.time ? "default" : "outline"}
                    onClick={() => setSelectedTimeSlot(slot.time)}
                    className="justify-center"
                  >
                    {slot.formattedTime}
                  </Button>
                ))}
              </div>
            )}
          </div>
        </div>
        
        {selectedDate && selectedTimeSlot && (
          <div className="mt-4 p-4 border rounded-md bg-muted/50">
            <h3 className="font-medium mb-2">Appointment Summary</h3>
            <p>
              <strong>Date:</strong> {format(selectedDate, 'EEEE, MMMM d, yyyy')}
            </p>
            <p>
              <strong>Time:</strong> {
                DateTime.fromObject(
                  { 
                    hour: parseInt(selectedTimeSlot.split(':')[0]), 
                    minute: parseInt(selectedTimeSlot.split(':')[1]) 
                  }, 
                  { zone: clientTimeZone }
                ).toFormat('h:mm a')
              }
            </p>
            <p>
              <strong>Duration:</strong> 30 minutes
            </p>
          </div>
        )}
        
        {Object.values(apiErrors).some(error => !!error) && (
          <Alert variant="destructive" className="mt-4">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              <ul className="list-disc pl-4">
                {Object.entries(apiErrors).map(([key, error]) => 
                  error ? <li key={key}>{error}</li> : null
                )}
              </ul>
            </AlertDescription>
          </Alert>
        )}
        
        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={handleClose} disabled={isBooking}>
            Cancel
          </Button>
          <Button 
            onClick={handleBookAppointment} 
            disabled={!selectedDate || !selectedTimeSlot || isBooking}
          >
            {isBooking ? 'Booking...' : 'Book Appointment'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AppointmentBookingDialog;
