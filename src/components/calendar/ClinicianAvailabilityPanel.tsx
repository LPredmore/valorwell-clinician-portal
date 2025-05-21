import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Clock, Plus, X, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from '@/integrations/supabase/client';
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { TimeZoneService } from '@/utils/timeZoneService';

// Define the day of week mapping
const DAY_OF_WEEK = {
  'Sunday': 0,
  'Monday': 1,
  'Tuesday': 2,
  'Wednesday': 3,
  'Thursday': 4,
  'Friday': 5,
  'Saturday': 6
};

// Define the reverse mapping
const DAYS_BY_INDEX = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday'
];

interface TimeSlot {
  id: string; // Used for UI tracking
  startTime: string;
  endTime: string;
  timezone: string;
}

interface DaySchedule {
  day: string;
  isOpen: boolean;
  timeSlots: TimeSlot[];
}

interface ClinicianAvailabilityPanelProps {
  clinicianId?: string | null;
  onAvailabilityUpdated?: () => void;
  userTimeZone?: string;
}

const ClinicianAvailabilityPanel: React.FC<ClinicianAvailabilityPanelProps> = ({ 
  clinicianId, 
  onAvailabilityUpdated,
  userTimeZone = 'America/Chicago' 
}) => {
  const [activeTab, setActiveTab] = useState<string>('set');
  const [availabilityEnabled, setAvailabilityEnabled] = useState(true);
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [timeGranularity, setTimeGranularity] = useState<'hour' | 'half-hour'>('hour');
  const [minDaysAhead, setMinDaysAhead] = useState<number>(1);
  const [maxDaysAhead, setMaxDaysAhead] = useState<number>(30);
  const [clinicianData, setClinicianData] = useState<any>(null);
  const [resolvedClinicianId, setResolvedClinicianId] = useState<string | null>(null); // Added for debugging
  const { toast } = useToast();

  const defaultTimeZone = userTimeZone || 'America/Chicago';

  const [weekSchedule, setWeekSchedule] = useState<DaySchedule[]>([
    { day: 'Monday', isOpen: true, timeSlots: [] },
    { day: 'Tuesday', isOpen: true, timeSlots: [] },
    { day: 'Wednesday', isOpen: true, timeSlots: [] },
    { day: 'Thursday', isOpen: true, timeSlots: [] },
    { day: 'Friday', isOpen: true, timeSlots: [] },
    { day: 'Saturday', isOpen: false, timeSlots: [] },
    { day: 'Sunday', isOpen: false, timeSlots: [] },
  ]);

  // Fetch clinician data and initialize availability
  useEffect(() => {
    const fetchClinicianData = async () => {
      setLoading(true);

      try {
        // If clinicianId is not provided, try to get it from the current user
        let clinicianIdToUse = clinicianId;
        
        console.log('[ClinicianAvailabilityPanel] Initial clinicianId prop:', clinicianId);
        
        if (!clinicianIdToUse) {
          const { data: sessionData } = await supabase.auth.getSession();

          if (!sessionData?.session?.user) {
            console.log('[ClinicianAvailabilityPanel] User not logged in');
            setLoading(false);
            return;
          }
          
          console.log('[ClinicianAvailabilityPanel] Auth user ID:', sessionData.session.user.id);

          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('email, user_role')
            .eq('id', sessionData.session.user.id)
            .single();
            
          if (profileError) {
            console.error('[ClinicianAvailabilityPanel] Error fetching profile:', profileError);
          }

          if (profileData) {
            console.log('[ClinicianAvailabilityPanel] Profile data:', {
              email: profileData.email,
              role: profileData.user_role
            });
            
            // Check if user role is clinician
            if (profileData.user_role !== 'clinician') {
              console.log('[ClinicianAvailabilityPanel] User is not a clinician, role:', profileData.user_role);
            }

            const { data: clinicianData, error: clinicianError } = await supabase
              .from('clinicians')
              .select('id, clinician_email')
              .eq('clinician_email', profileData.email)
              .single();
              
            if (clinicianError) {
              console.error('[ClinicianAvailabilityPanel] Error fetching clinician by email:', clinicianError);
            }

            if (clinicianData) {
              console.log('[ClinicianAvailabilityPanel] Found clinician:', {
                id: clinicianData.id,
                email: clinicianData.clinician_email
              });
              clinicianIdToUse = clinicianData.id;
            } else {
              // Try alternative lookup if the email approach didn't work
              const { data: altClinicianData, error: altError } = await supabase
                .from('clinicians')
                .select('id')
                .eq('profile_id', sessionData.session.user.id)
                .single();
                
              if (altError) {
                console.error('[ClinicianAvailabilityPanel] Error fetching clinician by profile_id:', altError);
              }
              
              if (altClinicianData) {
                console.log('[ClinicianAvailabilityPanel] Found clinician via profile_id:', altClinicianData.id);
                clinicianIdToUse = altClinicianData.id;
              } else {
                console.error('[ClinicianAvailabilityPanel] Could not resolve clinician ID');
              }
            }
          }
        }
        
        // Store the resolved clinician ID for debugging
        setResolvedClinicianId(clinicianIdToUse);
        console.log('[ClinicianAvailabilityPanel] Final resolved clinicianId:', clinicianIdToUse);

        if (clinicianIdToUse) {
          const { data, error } = await supabase
            .from('clinicians')
            .select('*')
            .eq('id', clinicianIdToUse)
            .single();

          if (error) {
            console.error('[ClinicianAvailabilityPanel] Error fetching clinician data:', error);
            return;
          }

          if (data) {
            console.log('[ClinicianAvailabilityPanel] Fetched clinician data:', {
              id: data.id,
              email: data.clinician_email,
              timeZone: data.clinician_time_zone,
              timeZoneArray: data.clinician_timezone
            });
            setClinicianData(data);
            
            // Set the availability settings from clinician data
            setTimeGranularity(data.clinician_time_granularity || 'hour');
            setMinDaysAhead(Number(data.clinician_min_notice_days) || 1);
            setMaxDaysAhead(Number(data.clinician_max_advance_days) || 30);
            
            // Transform the database columns into our internal data structure
            const newSchedule = [...weekSchedule];
            
            // For each day of the week
            DAYS_BY_INDEX.forEach((day, dayIndex) => {
              const scheduleDay = newSchedule.find(d => d.day === day);
              if (!scheduleDay) return;
              
              // Clear existing time slots
              scheduleDay.timeSlots = [];
              
              // For each slot (1, 2, 3)
              for (let slotNum = 1; slotNum <= 3; slotNum++) {
                const startTimeKey = `clinician_availability_start_${day.toLowerCase()}_${slotNum}`;
                const endTimeKey = `clinician_availability_end_${day.toLowerCase()}_${slotNum}`;
                const timezoneKey = `clinician_availability_timezone_${day.toLowerCase()}_${slotNum}`;
                
                if (data[startTimeKey] && data[endTimeKey]) {
                  scheduleDay.timeSlots.push({
                    id: `${day.toLowerCase()}-${slotNum}`,
                    startTime: data[startTimeKey].substring(0, 5),
                    endTime: data[endTimeKey].substring(0, 5),
                    timezone: data[timezoneKey] || defaultTimeZone
                  });
                  
                  // Mark the day as open if it has slots
                  scheduleDay.isOpen = true;
                }
              }
            });
            
            setWeekSchedule(newSchedule);
          }
        }
      } catch (error) {
        console.error('[ClinicianAvailabilityPanel] Error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchClinicianData();
  }, [clinicianId]);

  const toggleDayOpen = (dayIndex: number) => {
    setWeekSchedule(prev => {
      const updated = [...prev];
      updated[dayIndex] = {
        ...updated[dayIndex],
        isOpen: !updated[dayIndex].isOpen
      };
      return updated;
    });
  };

  const addTimeSlot = (dayIndex: number) => {
    setWeekSchedule(prev => {
      const updated = [...prev];
      const day = updated[dayIndex];
      
      // Only add if we have less than 3 slots
      if (day.timeSlots.length < 3) {
        const slotNum = day.timeSlots.length + 1;
        const newId = `${day.day.toLowerCase()}-${slotNum}`;
        
        updated[dayIndex] = {
          ...day,
          timeSlots: [
            ...day.timeSlots,
            {
              id: newId,
              startTime: '09:00',
              endTime: '17:00',
              timezone: defaultTimeZone
            }
          ]
        };
      } else {
        toast({
          title: "Maximum slots reached",
          description: "You can only have 3 time slots per day",
          variant: "destructive"
        });
      }

      return updated;
    });
  };

  const deleteTimeSlot = (dayIndex: number, slotId: string) => {
    setWeekSchedule(prev => {
      const updated = [...prev];
      const day = updated[dayIndex];

      // Find the index of the slot in the array
      const slots = day.timeSlots;
      const filteredSlots = slots.filter(slot => slot.id !== slotId);
      
      // Update the IDs to keep them sequential (1, 2, 3)
      const renamedSlots = filteredSlots.map((slot, idx) => ({
        ...slot,
        id: `${day.day.toLowerCase()}-${idx + 1}`
      }));

      updated[dayIndex] = {
        ...day,
        timeSlots: renamedSlots
      };

      return updated;
    });
  };

  const updateTimeSlot = (dayIndex: number, slotId: string, field: 'startTime' | 'endTime' | 'timezone', value: string) => {
    setWeekSchedule(prev => {
      const updated = [...prev];
      const day = updated[dayIndex];

      updated[dayIndex] = {
        ...day,
        timeSlots: day.timeSlots.map(slot =>
          slot.id === slotId ? { ...slot, [field]: value } : slot
        )
      };

      return updated;
    });
  };

  const saveAvailability = async () => {
    setIsSaving(true);
    console.log('[ClinicianAvailabilityPanel] Saving availability to clinician record...');

    try {
      // Use the resolved clinician ID if available
      let clinicianIdToUse = resolvedClinicianId || clinicianId;
      
      if (!clinicianIdToUse && clinicianData) {
        clinicianIdToUse = clinicianData.id;
      }
      
      console.log('[ClinicianAvailabilityPanel] Using clinician ID for save:', clinicianIdToUse);
      
      if (!clinicianIdToUse) {
        const { data: sessionData } = await supabase.auth.getSession();

        if (!sessionData?.session?.user) {
          toast({
            title: "Authentication Error",
            description: "You must be logged in to save availability",
            variant: "destructive"
          });
          setIsSaving(false);
          return;
        }
        
        console.log('[ClinicianAvailabilityPanel] Auth user ID for save:', sessionData.session.user.id);

        const { data: profileData } = await supabase
          .from('profiles')
          .select('email, user_role')
          .eq('id', sessionData.session.user.id)
          .single();

        if (!profileData) {
          toast({
            title: "Profile Error",
            description: "Could not find your profile",
            variant: "destructive"
          });
          setIsSaving(false);
          return;
        }
        
        console.log('[ClinicianAvailabilityPanel] Profile for save:', {
          email: profileData.email,
          role: profileData.user_role
        });

        const { data: clinicianData, error: clinicianError } = await supabase
          .from('clinicians')
          .select('id')
          .eq('clinician_email', profileData.email)
          .single();
          
        if (clinicianError) {
          console.error('[ClinicianAvailabilityPanel] Error finding clinician for save:', clinicianError);
        }

        if (!clinicianData) {
          // Try alternative lookup
          const { data: altClinicianData } = await supabase
            .from('clinicians')
            .select('id')
            .eq('profile_id', sessionData.session.user.id)
            .single();
            
          if (altClinicianData) {
            console.log('[ClinicianAvailabilityPanel] Found clinician via profile_id for save:', altClinicianData.id);
            clinicianIdToUse = altClinicianData.id;
          } else {
            toast({
              title: "Clinician Error",
              description: "Could not find your clinician record",
              variant: "destructive"
            });
            setIsSaving(false);
            return;
          }
        } else {
          clinicianIdToUse = clinicianData.id;
          console.log('[ClinicianAvailabilityPanel] Found clinician for save:', clinicianIdToUse);
        }
      }

      if (!clinicianIdToUse) {
        toast({
          title: "Error",
          description: "No clinician ID found to save availability",
          variant: "destructive"
        });
        setIsSaving(false);
        return;
      }

      // Transform the weekSchedule into database columns format
      const updateData: Record<string, any> = {
        // Add the settings directly to the clinicians table
        clinician_time_granularity: timeGranularity,
        clinician_min_notice_days: minDaysAhead,
        clinician_max_advance_days: maxDaysAhead,
        // Set the timezone fields to ensure both are populated
        clinician_time_zone: defaultTimeZone,
        clinician_timezone: [defaultTimeZone] // Ensure this array field is populated too
      };
      
      // For each day of the week, set all possible slots
      DAYS_BY_INDEX.forEach(day => {
        const daySchedule = weekSchedule.find(d => d.day === day);
        
        // For each possible slot (1, 2, 3)
        for (let slotNum = 1; slotNum <= 3; slotNum++) {
          const startTimeKey = `clinician_availability_start_${day.toLowerCase()}_${slotNum}`;
          const endTimeKey = `clinician_availability_end_${day.toLowerCase()}_${slotNum}`;
          const timezoneKey = `clinician_availability_timezone_${day.toLowerCase()}_${slotNum}`;
          
          // Default to null for all slots (clear previous values)
          updateData[startTimeKey] = null;
          updateData[endTimeKey] = null;
          updateData[timezoneKey] = 'America/Chicago'; // Default timezone
          
          // If the day is open and this slot exists, set the values
          if (daySchedule?.isOpen && daySchedule.timeSlots[slotNum - 1]) {
            const slot = daySchedule.timeSlots[slotNum - 1];
            updateData[startTimeKey] = slot.startTime;
            updateData[endTimeKey] = slot.endTime;
            updateData[timezoneKey] = slot.timezone || 'America/Chicago';
          }
        }
      });
      
      console.log('[ClinicianAvailabilityPanel] Updating clinician record with data:', updateData);
      
      const { data: updateResult, error } = await supabase
        .from('clinicians')
        .update(updateData)
        .eq('id', clinicianIdToUse)
        .select();
        
      if (error) {
        console.error('[ClinicianAvailabilityPanel] Error updating availability:', error);
        toast({
          title: "Error Saving Availability",
          description: error.message,
          variant: "destructive"
        });
        setIsSaving(false);
        return;
      }
      
      console.log('[ClinicianAvailabilityPanel] Update result:', updateResult);
      
      toast({
        title: "Availability Saved",
        description: "Your availability has been updated successfully",
      });
      
      // Explicitly call onAvailabilityUpdated to refresh the calendar view
      if (onAvailabilityUpdated) {
        console.log('[ClinicianAvailabilityPanel] Calling onAvailabilityUpdated to refresh calendar');
        onAvailabilityUpdated();
      }
    } catch (error) {
      console.error('[ClinicianAvailabilityPanel] Error saving availability:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred while saving your availability",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const timeOptions = React.useMemo(() => {
    const options = [];

    for (let hour = 0; hour < 24; hour++) {
      const hourFormatted = hour.toString().padStart(2, '0');
      options.push(`${hourFormatted}:00`);

      if (timeGranularity === 'half-hour') {
        options.push(`${hourFormatted}:30`);
      }
    }

    return options;
  }, [timeGranularity]);

  // List of IANA timezones for select dropdown
  const timezoneOptions = [
    'America/Chicago',
    'America/New_York',
    'America/Los_Angeles',
    'America/Denver',
    'America/Phoenix',
    'America/Anchorage',
    'America/Honolulu',
    'America/Puerto_Rico',
    'Europe/London',
    'Europe/Paris',
    'Asia/Tokyo',
    'Australia/Sydney',
    'Pacific/Auckland'
  ];

  if (loading) {
    return (
      <Card className="h-full">
        <CardContent className="flex items-center justify-center py-10">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading availability...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Clinician Availability
          </CardTitle>
          <div className="flex items-center gap-2">
            <span className="text-sm">Enabled</span>
            <Switch
              checked={availabilityEnabled}
              onCheckedChange={setAvailabilityEnabled}
            />
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-4">
          <div className="p-3 border rounded-md">
            <h3 className="font-medium mb-2">Scheduling Settings</h3>
            <Separator className="my-2" />
            <div className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground mb-2">
                  Allow clients to schedule appointments on:
                </p>
                <Select
                  value={timeGranularity}
                  onValueChange={(value) => setTimeGranularity(value as 'hour' | 'half-hour')}
                >
                  <SelectTrigger className="w-full max-w-xs">
                    <SelectValue placeholder="Select time granularity" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hour">Hour marks only (e.g., 1:00, 2:00)</SelectItem>
                    <SelectItem value="half-hour">Hour and half-hour marks (e.g., 1:00, 1:30)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-2">
                  How soon can clients schedule with you?
                </p>
                <Select 
                  value={minDaysAhead.toString()} 
                  onValueChange={(value) => setMinDaysAhead(Number(value))}
                >
                  <SelectTrigger className="w-full max-w-xs">
                    <SelectValue placeholder="Select days in advance" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 15 }, (_, i) => i + 1).map((day) => (
                      <SelectItem key={`days-ahead-${day}`} value={day.toString()}>
                        {day} {day === 1 ? 'day' : 'days'} in advance
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-2">
                  How far in advance can clients schedule?
                </p>
                <Select 
                  value={maxDaysAhead.toString()} 
                  onValueChange={(value) => setMaxDaysAhead(Number(value))}
                >
                  <SelectTrigger className="w-full max-w-xs">
                    <SelectValue placeholder="Select maximum days in advance" />
                  </SelectTrigger>
                  <SelectContent>
                    {[14, 30, 45, 60, 90, 120, 180].map((day) => (
                      <SelectItem key={`max-days-${day}`} value={day.toString()}>
                        {day} days ({Math.floor(day/30)} {Math.floor(day/30) === 1 ? 'month' : 'months'})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            {weekSchedule.map((day, index) => (
              <Collapsible
                key={`day-${day.day}`}
                open={day.isOpen}
                onOpenChange={() => toggleDayOpen(index)}
                className="border rounded-md overflow-hidden"
              >
                <div className="flex items-center justify-between p-3 bg-gray-50">
                  <div className="flex items-center gap-2">
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        {day.isOpen ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                    </CollapsibleTrigger>
                    <Badge variant="outline" className="font-medium">
                      {day.day}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => addTimeSlot(index)}
                      className="h-8 w-8 p-0"
                      disabled={day.timeSlots.length >= 3}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <CollapsibleContent>
                  <div className="p-3 space-y-2">
                    {day.timeSlots.length === 0 ? (
                      <div className="text-sm text-gray-500 text-center py-2">
                        No time slots added. Click the + button to add one.
                      </div>
                    ) : (
                      day.timeSlots.map((slot, slotIndex) => (
                        <div key={`slot-${slot.id}`} className="flex flex-col gap-2 p-2 bg-gray-50 rounded-md">
                          <div className="flex items-center justify-between">
                            <Badge variant="outline" className="font-medium">
                              Slot {slotIndex + 1}
                            </Badge>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteTimeSlot(index, slot.id)}
                              className="h-8 w-8 p-0"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                          
                          <div className="grid grid-cols-1 gap-2">
                            <div className="grid grid-cols-2 gap-2">
                              <div className="space-y-1">
                                <Label htmlFor={`start-${slot.id}`} className="text-xs">Start Time</Label>
                                <Select
                                  value={slot.startTime}
                                  onValueChange={(value) => updateTimeSlot(index, slot.id, 'startTime', value)}
                                >
                                  <SelectTrigger id={`start-${slot.id}`} className="h-8">
                                    <SelectValue placeholder="Start time" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {timeOptions.map((time) => (
                                      <SelectItem key={`start-${day.day}-${slot.id}-${time}`} value={time}>
                                        {time}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>

                              <div className="space-y-1">
                                <Label htmlFor={`end-${slot.id}`} className="text-xs">End Time</Label>
                                <Select
                                  value={slot.endTime}
                                  onValueChange={(value) => updateTimeSlot(index, slot.id, 'endTime', value)}
                                >
                                  <SelectTrigger id={`end-${slot.id}`} className="h-8">
                                    <SelectValue placeholder="End time" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {timeOptions.map((time) => (
                                      <SelectItem key={`end-${day.day}-${slot.id}-${time}`} value={time}>
                                        {time}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            
                            <div className="space-y-1">
                              <Label htmlFor={`timezone-${slot.id}`} className="text-xs">Time Zone</Label>
                              <Select
                                value={slot.timezone || defaultTimeZone}
                                onValueChange={(value) => updateTimeSlot(index, slot.id, 'timezone', value)}
                              >
                                <SelectTrigger id={`timezone-${slot.id}`} className="h-8">
                                  <SelectValue placeholder="Time zone" />
                                </SelectTrigger>
                                <SelectContent>
                                  {timezoneOptions.map((tz) => (
                                    <SelectItem key={`timezone-${day.day}-${slot.id}-${tz}`} value={tz}>
                                      {tz}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            ))}
          </div>

          <Button
            className="w-full"
            onClick={saveAvailability}
            disabled={isSaving}
          >
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSaving ? 'Saving...' : 'Save Availability'}
          </Button>
          
          {process.env.NODE_ENV !== 'production' && (
            <div className="mt-4 p-2 border rounded-md bg-gray-50">
              <h4 className="text-xs font-semibold">Debug Info</h4>
              <p className="text-xs">Clinician ID: {resolvedClinicianId || 'Not resolved'}</p>
              <p className="text-xs">Prop Clinician ID: {clinicianId || 'None'}</p>
              {clinicianData && (
                <>
                  <p className="text-xs">Email: {clinicianData.clinician_email || 'N/A'}</p>
                  <p className="text-xs">Time Zone: {clinicianData.clinician_time_zone || 'Not set'}</p>
                  <p className="text-xs">Timezone Array: {clinicianData.clinician_timezone ? 
                    JSON.stringify(clinicianData.clinician_timezone) : 'Not set'}</p>
                </>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ClinicianAvailabilityPanel;
