import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { TimeZoneService } from '@/utils/timeZoneService';
// Removed getClinicianTimeZone import - using browser timezone only
import { formInputToUTC, utcToFormInput } from '@/utils/timezoneHelpers';
import { Clock, Save, Trash2 } from 'lucide-react';

interface AvailabilityManagementSidebarProps {
  clinicianId: string | null;
  refreshTrigger: number;
  onRefresh: () => void;
}

interface AvailabilitySlot {
  day: string;
  slot: number;
  startTime: string;
  endTime: string;
}

const AvailabilityManagementSidebar: React.FC<AvailabilityManagementSidebarProps> = ({
  clinicianId,
  refreshTrigger,
  onRefresh
}) => {
  const [selectedDay, setSelectedDay] = useState<string>('monday');
  const [selectedSlot, setSelectedSlot] = useState<number>(1);
  const [startHour, setStartHour] = useState<string>('09');
  const [startMinute, setStartMinute] = useState<string>('00');
  const [startAMPM, setStartAMPM] = useState<string>('AM');
  const [endHour, setEndHour] = useState<string>('05');
  const [endMinute, setEndMinute] = useState<string>('00');
  const [endAMPM, setEndAMPM] = useState<string>('PM');
  const [currentAvailability, setCurrentAvailability] = useState<AvailabilitySlot[]>([]);
  
  // Calendar display settings state (stored in 24-hour format)
  const [calendarStartTime, setCalendarStartTime] = useState<string>('08:00');
  const [calendarEndTime, setCalendarEndTime] = useState<string>('21:00');
  
  // Calendar display time selectors in AM/PM format
  const [calendarStartHour, setCalendarStartHour] = useState<string>('08');
  const [calendarStartAMPM, setCalendarStartAMPM] = useState<string>('AM');
  const [calendarEndHour, setCalendarEndHour] = useState<string>('09');
  const [calendarEndAMPM, setCalendarEndAMPM] = useState<string>('PM');
  
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingDisplay, setIsSavingDisplay] = useState(false);
  const browserTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const { toast } = useToast();

  const daysOfWeek = [
    { value: 'monday', label: 'Monday' },
    { value: 'tuesday', label: 'Tuesday' },
    { value: 'wednesday', label: 'Wednesday' },
    { value: 'thursday', label: 'Thursday' },
    { value: 'friday', label: 'Friday' },
    { value: 'saturday', label: 'Saturday' },
    { value: 'sunday', label: 'Sunday' }
  ];

  // Generate hour options (1-12 for AM/PM format)
  const hourOptions = Array.from({ length: 12 }, (_, i) => ({
    value: (i + 1).toString().padStart(2, '0'),
    label: (i + 1).toString().padStart(2, '0')
  }));

  // Generate minute options (only 00, 15, 30, 45)
  const minuteOptions = [
    { value: '00', label: '00' },
    { value: '15', label: '15' },
    { value: '30', label: '30' },
    { value: '45', label: '45' }
  ];

  // AM/PM options
  const ampmOptions = [
    { value: 'AM', label: 'AM' },
    { value: 'PM', label: 'PM' }
  ];

  // Load current availability when component mounts or clinician changes
  useEffect(() => {
    if (clinicianId) {
      loadCurrentAvailability();
    }
  }, [clinicianId]);

  // Load selected slot when day or slot changes
  useEffect(() => {
    loadSelectedSlot();
  }, [selectedDay, selectedSlot, currentAvailability]);

  const loadCurrentAvailability = async () => {
    if (!clinicianId) return;

    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('clinicians')
        .select(`
          clinician_availability_start_monday_1, clinician_availability_end_monday_1,
          clinician_availability_start_monday_2, clinician_availability_end_monday_2,
          clinician_availability_start_monday_3, clinician_availability_end_monday_3,
          clinician_availability_start_tuesday_1, clinician_availability_end_tuesday_1,
          clinician_availability_start_tuesday_2, clinician_availability_end_tuesday_2,
          clinician_availability_start_tuesday_3, clinician_availability_end_tuesday_3,
          clinician_availability_start_wednesday_1, clinician_availability_end_wednesday_1,
          clinician_availability_start_wednesday_2, clinician_availability_end_wednesday_2,
          clinician_availability_start_wednesday_3, clinician_availability_end_wednesday_3,
          clinician_availability_start_thursday_1, clinician_availability_end_thursday_1,
          clinician_availability_start_thursday_2, clinician_availability_end_thursday_2,
          clinician_availability_start_thursday_3, clinician_availability_end_thursday_3,
          clinician_availability_start_friday_1, clinician_availability_end_friday_1,
          clinician_availability_start_friday_2, clinician_availability_end_friday_2,
          clinician_availability_start_friday_3, clinician_availability_end_friday_3,
          clinician_availability_start_saturday_1, clinician_availability_end_saturday_1,
          clinician_availability_start_saturday_2, clinician_availability_end_saturday_2,
          clinician_availability_start_saturday_3, clinician_availability_end_saturday_3,
          clinician_availability_start_sunday_1, clinician_availability_end_sunday_1,
          clinician_availability_start_sunday_2, clinician_availability_end_sunday_2,
          clinician_availability_start_sunday_3, clinician_availability_end_sunday_3,
          clinician_calendar_start_time, clinician_calendar_end_time
        `)
        .eq('id', clinicianId)
        .single();

      if (error) throw error;

      // Parse availability data from TIME columns
      const availability: AvailabilitySlot[] = [];
      daysOfWeek.forEach(day => {
        for (let slot = 1; slot <= 3; slot++) {
          const startKey = `clinician_availability_start_${day.value}_${slot}`;
          const endKey = `clinician_availability_end_${day.value}_${slot}`;
          const startTime = data[startKey];
          const endTime = data[endKey];

          if (startTime && endTime) {
            // startTime and endTime are already in TIME format (HH:mm:ss), just convert to HH:mm
            const formattedStartTime = startTime.substring(0, 5); // "09:00:00" -> "09:00"
            const formattedEndTime = endTime.substring(0, 5);     // "17:00:00" -> "17:00"
            
            availability.push({
              day: day.value,
              slot,
              startTime: formattedStartTime,
              endTime: formattedEndTime
            });
          }
        }
      });

      setCurrentAvailability(availability);
      
      // Load calendar display settings
      if (data.clinician_calendar_start_time) {
        const startTime = data.clinician_calendar_start_time.substring(0, 5); // "08:00:00" -> "08:00"
        setCalendarStartTime(startTime);
        
        // Convert to AM/PM for display
        const startAMPM = convertTimeToAMPM(startTime);
        setCalendarStartHour(startAMPM.hour);
        setCalendarStartAMPM(startAMPM.ampm);
      }
      if (data.clinician_calendar_end_time) {
        const endTime = data.clinician_calendar_end_time.substring(0, 5); // "21:00:00" -> "21:00"
        setCalendarEndTime(endTime);
        
        // Convert to AM/PM for display
        const endAMPM = convertTimeToAMPM(endTime);
        setCalendarEndHour(endAMPM.hour);
        setCalendarEndAMPM(endAMPM.ampm);
      }
    } catch (error) {
      console.error('Error loading availability:', error);
      toast({
        title: 'Error',
        description: 'Failed to load current availability',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const convertTimeToAMPM = (time24: string) => {
    const [hour, minute] = time24.split(':');
    const hour24 = parseInt(hour);
    const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
    const ampm = hour24 >= 12 ? 'PM' : 'AM';
    return {
      hour: hour12.toString().padStart(2, '0'),
      minute,
      ampm
    };
  };

  const convertTimeFrom12To24 = (hour12: string, minute: string, ampm: string) => {
    let hour24 = parseInt(hour12);
    if (ampm === 'PM' && hour24 !== 12) {
      hour24 += 12;
    } else if (ampm === 'AM' && hour24 === 12) {
      hour24 = 0;
    }
    return `${hour24.toString().padStart(2, '0')}:${minute}`;
  };

  const loadSelectedSlot = () => {
    const slot = currentAvailability.find(
      a => a.day === selectedDay && a.slot === selectedSlot
    );
    
    if (slot) {
      const startTime = convertTimeToAMPM(slot.startTime);
      const endTime = convertTimeToAMPM(slot.endTime);
      
      setStartHour(startTime.hour);
      setStartMinute(startTime.minute);
      setStartAMPM(startTime.ampm);
      setEndHour(endTime.hour);
      setEndMinute(endTime.minute);
      setEndAMPM(endTime.ampm);
    } else {
      setStartHour('09');
      setStartMinute('00');
      setStartAMPM('AM');
      setEndHour('05');
      setEndMinute('00');
      setEndAMPM('PM');
    }
  };

  const saveAvailability = async () => {
    if (!clinicianId) {
      toast({
        title: 'Error',
        description: 'Missing clinician ID for saving availability',
        variant: 'destructive'
      });
      return;
    }

    const startTime = convertTimeFrom12To24(startHour, startMinute, startAMPM);
    const endTime = convertTimeFrom12To24(endHour, endMinute, endAMPM);

    if (!startTime || !endTime) {
      toast({
        title: 'Validation Error',
        description: 'Please provide both start and end times',
        variant: 'destructive'
      });
      return;
    }

    if (startTime >= endTime) {
      toast({
        title: 'Validation Error',
        description: 'End time must be after start time',
        variant: 'destructive'
      });
      return;
    }

    try {
      setIsSaving(true);

      // Store times directly as TIME values (no timezone conversion needed)
      const updateData = {
        [`clinician_availability_start_${selectedDay}_${selectedSlot}`]: startTime,
        [`clinician_availability_end_${selectedDay}_${selectedSlot}`]: endTime
      };

      console.log('[AvailabilityManagementSidebar] Saving availability as TIME values:', {
        browserTimeZone,
        localTimes: { startTime, endTime },
        updateData
      });

      const { error } = await supabase
        .from('clinicians')
        .update(updateData)
        .eq('id', clinicianId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Availability saved successfully'
      });

      // Reload availability to reflect changes and trigger parent refresh
      await loadCurrentAvailability();
      onRefresh();
    } catch (error) {
      console.error('Error saving availability:', error);
      toast({
        title: 'Error',
        description: 'Failed to save availability',
        variant: 'destructive'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const deleteAvailability = async () => {
    if (!clinicianId) return;

    try {
      setIsSaving(true);

      // Clear the selected slot from TIME columns
      const updateData = {
        [`clinician_availability_start_${selectedDay}_${selectedSlot}`]: null,
        [`clinician_availability_end_${selectedDay}_${selectedSlot}`]: null
      };

      console.log('[AvailabilityManagementSidebar] Clearing availability slot:', {
        updateData
      });

      const { error } = await supabase
        .from('clinicians')
        .update(updateData)
        .eq('id', clinicianId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Availability slot deleted successfully'
      });

      // Clear form and reload
      setStartHour('09');
      setStartMinute('00');
      setStartAMPM('AM');
      setEndHour('05');
      setEndMinute('00');
      setEndAMPM('PM');
      await loadCurrentAvailability();
      onRefresh();
    } catch (error) {
      console.error('Error deleting availability:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete availability',
        variant: 'destructive'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const saveCalendarDisplaySettings = async () => {
    if (!clinicianId) {
      toast({
        title: 'Error',
        description: 'Missing clinician ID for saving display settings',
        variant: 'destructive'
      });
      return;
    }

    // Convert AM/PM display times to 24-hour format for storage
    const startTime24 = convertTimeFrom12To24(calendarStartHour, '00', calendarStartAMPM);
    const endTime24 = convertTimeFrom12To24(calendarEndHour, '00', calendarEndAMPM);

    if (startTime24 >= endTime24) {
      toast({
        title: 'Validation Error',
        description: 'Calendar end time must be after start time',
        variant: 'destructive'
      });
      return;
    }

    try {
      setIsSavingDisplay(true);

      const { error } = await supabase
        .from('clinicians')
        .update({
          clinician_calendar_start_time: startTime24,
          clinician_calendar_end_time: endTime24
        })
        .eq('id', clinicianId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Calendar display settings saved successfully'
      });

      // Trigger parent refresh to update calendar display
      onRefresh();
    } catch (error) {
      console.error('Error saving calendar display settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to save calendar display settings',
        variant: 'destructive'
      });
    } finally {
      setIsSavingDisplay(false);
    }
  };

  const formatTimeForDisplay = (time: string) => {
    const { hour, minute, ampm } = convertTimeToAMPM(time);
    return `${hour}:${minute} ${ampm}`;
  };

  return (
    <div className="space-y-4">
      {/* Calendar Display Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Calendar Display</CardTitle>
          <CardDescription>
            Set the time range displayed in your calendar view
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Start Time</Label>
              <div className="flex gap-1">
                <Select value={calendarStartHour} onValueChange={setCalendarStartHour}>
                  <SelectTrigger className="h-8 flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {hourOptions.map((hour) => (
                      <SelectItem key={hour.value} value={hour.value}>
                        {hour.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={calendarStartAMPM} onValueChange={setCalendarStartAMPM}>
                  <SelectTrigger className="h-8 w-16">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ampmOptions.map((ampm) => (
                      <SelectItem key={ampm.value} value={ampm.value}>
                        {ampm.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs">End Time</Label>
              <div className="flex gap-1">
                <Select value={calendarEndHour} onValueChange={setCalendarEndHour}>
                  <SelectTrigger className="h-8 flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {hourOptions.map((hour) => (
                      <SelectItem key={hour.value} value={hour.value}>
                        {hour.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={calendarEndAMPM} onValueChange={setCalendarEndAMPM}>
                  <SelectTrigger className="h-8 w-16">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ampmOptions.map((ampm) => (
                      <SelectItem key={ampm.value} value={ampm.value}>
                        {ampm.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full"
            onClick={saveCalendarDisplaySettings}
            disabled={isSavingDisplay || isLoading}
          >
            <Save className="h-3 w-3 mr-1" />
            {isSavingDisplay ? 'Saving...' : 'Save Display Settings'}
          </Button>
        </CardContent>
      </Card>

      {/* Manage Availability */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Manage Availability
          </CardTitle>
          <CardDescription>
            Set your available time slots for appointments
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Day Selection */}
          <div>
            <Label htmlFor="day">Day of Week</Label>
            <Select value={selectedDay} onValueChange={setSelectedDay}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {daysOfWeek.map(day => (
                  <SelectItem key={day.value} value={day.value}>
                    {day.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Slot Selection */}
          <div>
            <Label htmlFor="slot">Time Slot</Label>
            <Select value={selectedSlot.toString()} onValueChange={(value) => setSelectedSlot(parseInt(value))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Slot 1</SelectItem>
                <SelectItem value="2">Slot 2</SelectItem>
                <SelectItem value="3">Slot 3</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Time Inputs */}
          <div className="space-y-4">
            <div>
              <Label>Start Time</Label>
              <div className="flex gap-2 mt-1">
                <Select value={startHour} onValueChange={setStartHour}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Hour" />
                  </SelectTrigger>
                  <SelectContent>
                    {hourOptions.map((hour) => (
                      <SelectItem key={hour.value} value={hour.value}>
                        {hour.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="self-center">:</span>
                <Select value={startMinute} onValueChange={setStartMinute}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Min" />
                  </SelectTrigger>
                  <SelectContent>
                    {minuteOptions.map((minute) => (
                      <SelectItem key={minute.value} value={minute.value}>
                        {minute.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={startAMPM} onValueChange={setStartAMPM}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="AM/PM" />
                  </SelectTrigger>
                  <SelectContent>
                    {ampmOptions.map((ampm) => (
                      <SelectItem key={ampm.value} value={ampm.value}>
                        {ampm.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div>
              <Label>End Time</Label>
              <div className="flex gap-2 mt-1">
                <Select value={endHour} onValueChange={setEndHour}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Hour" />
                  </SelectTrigger>
                  <SelectContent>
                    {hourOptions.map((hour) => (
                      <SelectItem key={hour.value} value={hour.value}>
                        {hour.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="self-center">:</span>
                <Select value={endMinute} onValueChange={setEndMinute}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Min" />
                  </SelectTrigger>
                  <SelectContent>
                    {minuteOptions.map((minute) => (
                      <SelectItem key={minute.value} value={minute.value}>
                        {minute.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={endAMPM} onValueChange={setEndAMPM}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="AM/PM" />
                  </SelectTrigger>
                  <SelectContent>
                    {ampmOptions.map((ampm) => (
                      <SelectItem key={ampm.value} value={ampm.value}>
                        {ampm.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Timezone Info */}
          <div className="text-sm text-gray-500">
            Times in: {TimeZoneService.getTimeZoneDisplayName(browserTimeZone)}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              onClick={saveAvailability}
              disabled={isSaving || isLoading}
              className="flex-1"
            >
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
            
            <Button
              onClick={deleteAvailability}
              disabled={isSaving || isLoading}
              variant="outline"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>

          {/* Current Availability Summary */}
          <div className="mt-6">
            <h4 className="font-medium mb-2">Current Availability</h4>
            {isLoading ? (
              <div className="text-sm text-gray-500">Loading...</div>
            ) : currentAvailability.length === 0 ? (
              <div className="text-sm text-gray-500">No availability set</div>
            ) : (
              <div className="space-y-2">
                {daysOfWeek.map(day => {
                  const daySlots = currentAvailability.filter(a => a.day === day.value);
                  if (daySlots.length === 0) return null;
                  
                  return (
                    <div key={day.value} className="text-sm">
                      <div className="font-medium">{day.label}</div>
                      {daySlots.map(slot => (
                        <div key={slot.slot} className="ml-2 text-gray-600">
                          Slot {slot.slot}: {formatTimeForDisplay(slot.startTime)} - {formatTimeForDisplay(slot.endTime)}
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AvailabilityManagementSidebar;