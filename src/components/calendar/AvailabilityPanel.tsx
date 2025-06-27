import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Clock, Plus, X, ChevronDown, ChevronUp, Loader2, Calendar, CalendarPlus } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from '@/integrations/supabase/client';
import { useToast } from "@/hooks/use-toast";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format, isSameDay } from 'date-fns';
import { cn } from "@/lib/utils";

interface TimeSlot {
  id: string;
  startTime: string;
  endTime: string;
}

interface DaySchedule {
  day: string;
  isOpen: boolean;
  timeSlots: TimeSlot[];
}

interface AvailabilitySettings {
  id: string;
  clinician_id: string;
  time_granularity: 'hour' | 'half-hour';
  min_days_ahead: number;
  created_at: string;
  updated_at: string;
}

interface AvailabilityPanelProps {
  clinicianId?: string | null;
  onAvailabilityUpdated?: () => void;
  userTimeZone?: string;
}

const AvailabilityPanel: React.FC<AvailabilityPanelProps> = ({ clinicianId, onAvailabilityUpdated, userTimeZone }) => {
  const [activeTab, setActiveTab] = useState<string>('set');
  const [availabilityEnabled, setAvailabilityEnabled] = useState(true);
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [timeGranularity, setTimeGranularity] = useState<'hour' | 'half-hour'>('hour');
  const [minDaysAhead, setMinDaysAhead] = useState<number>(1);
  const [maxDaysAhead, setMaxDaysAhead] = useState<number>(90);
  const { toast } = useToast();

  const [weekSchedule, setWeekSchedule] = useState<DaySchedule[]>([
    { day: 'Monday', isOpen: true, timeSlots: [] },
    { day: 'Tuesday', isOpen: true, timeSlots: [] },
    { day: 'Wednesday', isOpen: true, timeSlots: [] },
    { day: 'Thursday', isOpen: true, timeSlots: [] },
    { day: 'Friday', isOpen: true, timeSlots: [] },
    { day: 'Saturday', isOpen: false, timeSlots: [] },
    { day: 'Sunday', isOpen: false, timeSlots: [] },
  ]);

  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [singleDateTimeSlots, setSingleDateTimeSlots] = useState<TimeSlot[]>([]);
  const [existingSingleAvailability, setExistingSingleAvailability] = useState<{[date: string]: TimeSlot[]}>({});

  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [startDate, setStartDate] = useState<Date | undefined>(new Date());
  const [endDate, setEndDate] = useState<Date | undefined>(new Date());

  useEffect(() => {
    async function fetchAvailability() {
      setLoading(true);

      try {
        const { data: sessionData } = await supabase.auth.getSession();

        if (!sessionData?.session?.user) {
          console.log('User not logged in');
          setLoading(false);
          return;
        }

        const { data: profileData } = await supabase
          .from('profiles')
          .select('email')
          .eq('id', sessionData.session.user.id)
          .single();

        if (!profileData) {
          console.log('Profile not found');
          setLoading(false);
          return;
        }

        const clinicianIdToUse = clinicianId || null;
        let clinicianToQuery = clinicianIdToUse;

        if (!clinicianIdToUse) {
          const { data: clinicianData } = await supabase
            .from('clinicians')
            .select('id')
            .eq('clinician_email', profileData.email)
            .single();

          if (clinicianData) {
            clinicianToQuery = clinicianData.id;
          }
        }

        if (clinicianToQuery) {
          const { data: availabilityData, error } = await supabase
            .from('availability')
            .select('*')
            .eq('clinician_id', clinicianToQuery)
            .eq('is_active', true);

          if (error) {
            console.error('Error fetching availability:', error);
          } else if (availabilityData && availabilityData.length > 0) {
            const newSchedule = [...weekSchedule];

            try {
              const { data: settingsData } = await supabase.functions.invoke('get-availability-settings', {
                body: { clinicianId: clinicianToQuery }
              });

              if (settingsData) {
                console.log('Retrieved settings:', settingsData);
                setTimeGranularity(settingsData.time_granularity as 'hour' | 'half-hour');
                setMinDaysAhead(Number(settingsData.min_days_ahead) || 1);
                setMaxDaysAhead(Number(settingsData.max_days_ahead) || 90);
              }
            } catch (settingsError) {
              console.error('Error fetching availability settings:', settingsError);
            }

            newSchedule.forEach(day => {
              day.timeSlots = [];
            });

            const uniqueSlots = new Set();

            availabilityData.forEach(slot => {
              const dayIndex = newSchedule.findIndex(day => day.day === slot.day_of_week);
              if (dayIndex !== -1) {
                const startTime = slot.start_time.substring(0, 5);
                const endTime = slot.end_time.substring(0, 5);
                
                const slotKey = `${slot.day_of_week}-${startTime}-${endTime}`;
                
                if (!uniqueSlots.has(slotKey)) {
                  uniqueSlots.add(slotKey);
                  
                  newSchedule[dayIndex].timeSlots.push({
                    id: slot.id,
                    startTime: startTime,
                    endTime: endTime,
                  });

                  newSchedule[dayIndex].isOpen = true;
                } else {
                  console.log(`Skipping duplicate slot: ${slotKey}`);
                }
              }
            });

            setWeekSchedule(newSchedule);
          }

          const { data: singleAvailabilityData, error: singleAvailabilityError } = await supabase
            .from('availability_exceptions')
            .select('*')
            .eq('clinician_id', clinicianToQuery)
            .eq('is_deleted', false)
            .is('original_availability_id', null);

          if (singleAvailabilityError) {
            console.error('Error fetching single availability:', singleAvailabilityError);
          } else if (singleAvailabilityData && singleAvailabilityData.length > 0) {
            console.log('Fetched single availability data:', singleAvailabilityData);
            
            const byDate: {[date: string]: TimeSlot[]} = {};
            
            singleAvailabilityData.forEach(slot => {
              if (slot.specific_date && slot.start_time && slot.end_time) {
                const dateStr = slot.specific_date;
                if (!byDate[dateStr]) {
                  byDate[dateStr] = [];
                }
                
                byDate[dateStr].push({
                  id: slot.id,
                  startTime: slot.start_time.substring(0, 5),
                  endTime: slot.end_time.substring(0, 5)
                });
              }
            });
            
            setExistingSingleAvailability(byDate);
            
            if (selectedDate && byDate[format(selectedDate, 'yyyy-MM-dd')]) {
              setSingleDateTimeSlots(byDate[format(selectedDate, 'yyyy-MM-dd')]);
            } else {
              setSingleDateTimeSlots([]);
            }
          }
        }
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchAvailability();
  }, [clinicianId, refreshTrigger, startDate, endDate]);

  useEffect(() => {
    if (selectedDate) {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      if (existingSingleAvailability[dateStr]) {
        setSingleDateTimeSlots(existingSingleAvailability[dateStr]);
      } else {
        setSingleDateTimeSlots([]);
      }
    }
  }, [selectedDate, existingSingleAvailability]);

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
      const newId = `${day.day.toLowerCase().substring(0,3)}-${Date.now()}-${day.timeSlots.length + 1}`;

      updated[dayIndex] = {
        ...day,
        timeSlots: [
          ...day.timeSlots,
          {
            id: newId,
            startTime: '09:00',
            endTime: '17:00'
          }
        ]
      };

      return updated;
    });
  };

  const deleteTimeSlot = (dayIndex: number, slotId: string) => {
    setWeekSchedule(prev => {
      const updated = [...prev];
      const day = updated[dayIndex];

      updated[dayIndex] = {
        ...day,
        timeSlots: day.timeSlots.filter(slot => slot.id !== slotId)
      };

      return updated;
    });
  };

  const updateTimeSlot = (dayIndex: number, slotId: string, field: 'startTime' | 'endTime', value: string) => {
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

  const addSingleDateTimeSlot = () => {
    if (!selectedDate) return;
    
    setSingleDateTimeSlots(prev => [
      ...prev,
      {
        id: `single-${Date.now()}-${prev.length + 1}`,
        startTime: '09:00',
        endTime: '17:00'
      }
    ]);
  };

  const deleteSingleDateTimeSlot = (slotId: string) => {
    setSingleDateTimeSlots(prev => prev.filter(slot => slot.id !== slotId));
  };

  const updateSingleDateTimeSlot = (slotId: string, field: 'startTime' | 'endTime', value: string) => {
    setSingleDateTimeSlots(prev => 
      prev.map(slot => slot.id === slotId ? { ...slot, [field]: value } : slot)
    );
  };

  const saveSingleDateAvailability = async () => {
    if (!selectedDate || singleDateTimeSlots.length === 0) {
      toast({
        title: "No time slots added",
        description: "Please add at least one time slot before saving.",
        variant: "destructive"
      });
      return;
    }

    setIsSaving(true);
    console.log('Saving single date availability...');

    try {
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

      let clinicianIdToUse = clinicianId;

      if (!clinicianIdToUse) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('email')
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

        const { data: clinicianData } = await supabase
          .from('clinicians')
          .select('id')
          .eq('clinician_email', profileData.email)
          .single();

        if (!clinicianData) {
          toast({
            title: "Clinician Error",
            description: "Could not find your clinician record",
            variant: "destructive"
          });
          setIsSaving(false);
          return;
        }

        clinicianIdToUse = clinicianData.id;
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

      const formattedDate = format(selectedDate, 'yyyy-MM-dd');
      
      const { data: existingData, error: fetchError } = await supabase
        .from('availability_exceptions')
        .select('id')
        .eq('clinician_id', clinicianIdToUse)
        .eq('specific_date', formattedDate)
        .is('original_availability_id', null);
        
      if (fetchError) {
        console.error('Error fetching existing single availability:', fetchError);
        toast({
          title: "Error",
          description: "Could not check for existing availability",
          variant: "destructive"
        });
        setIsSaving(false);
        return;
      }
      
      if (existingData && existingData.length > 0) {
        const existingIds = existingData.map(item => item.id);
        const { error: deleteError } = await supabase
          .from('availability_exceptions')
          .delete()
          .in('id', existingIds);
          
        if (deleteError) {
          console.error('Error deleting existing single availability:', deleteError);
          toast({
            title: "Error",
            description: "Could not update existing availability",
            variant: "destructive"
          });
          setIsSaving(false);
          return;
        }
      }
      
      const recordsToInsert = singleDateTimeSlots.map(slot => ({
        clinician_id: clinicianIdToUse,
        specific_date: formattedDate,
        start_time: slot.startTime,
        end_time: slot.endTime,
        original_availability_id: null,
        is_deleted: false
      }));
      
      const { error: insertError } = await supabase
        .from('availability_exceptions')
        .insert(recordsToInsert);
        
      if (insertError) {
        console.error('Error saving single availability:', insertError);
        toast({
          title: "Error",
          description: "Could not save single date availability",
          variant: "destructive"
        });
        setIsSaving(false);
        return;
      }
      
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      setExistingSingleAvailability(prev => ({
        ...prev,
        [dateStr]: singleDateTimeSlots
      }));
      
      toast({
        title: "Availability Saved",
        description: `Single day availability for ${format(selectedDate, 'MMMM d, yyyy')} has been saved.`,
      });
      
      if (onAvailabilityUpdated) {
        onAvailabilityUpdated();
      }
    } catch (error) {
      console.error('Error saving single date availability:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const saveAvailability = async () => {
    setIsSaving(true);
    console.log('Saving availability...');

    try {
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

      let clinicianIdToUse = clinicianId;

      if (!clinicianIdToUse) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('email')
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

        const { data: clinicianData } = await supabase
          .from('clinicians')
          .select('id')
          .eq('clinician_email', profileData.email)
          .single();

        if (!clinicianData) {
          toast({
            title: "Clinician Error",
            description: "Could not find your clinician record",
            variant: "destructive"
          });
          setIsSaving(false);
          return;
        }

        clinicianIdToUse = clinicianData.id;
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

      console.log('Saving settings for clinician:', clinicianIdToUse);
      console.log('Time granularity:', timeGranularity);
      console.log('Min days ahead:', minDaysAhead);
      console.log('Max days ahead:', maxDaysAhead);

      const safeMaxDaysAhead = Math.max(minDaysAhead + 30, maxDaysAhead);
      
      // Fetch clinician directly to get the settings
      const { data: clinicianData, error: clinicianError } = await supabase
        .from('clinicians')
        .select('clinician_time_granularity, clinician_min_notice_days, clinician_max_advance_days')
        .eq('id', clinicianIdToUse)
        .single();

      if (clinicianData) {
        console.log('Retrieved settings from clinician:', clinicianData);
        setTimeGranularity(clinicianData.clinician_time_granularity as 'hour' | 'half-hour' || 'hour');
        setMinDaysAhead(Number(clinicianData.clinician_min_notice_days) || 1);
        setMaxDaysAhead(Number(clinicianData.clinician_max_advance_days) || 90);
      } else {
        console.log('No clinician settings found, using default values');
      }

      const { error: settingsError } = await supabase
        .from('clinicians')
        .update({
          clinician_time_granularity: timeGranularity,
          clinician_min_notice_days: minDaysAhead,
          clinician_max_advance_days: safeMaxDaysAhead
        })
        .eq('id', clinicianIdToUse);

      if (settingsError) {
        console.error('Error saving availability settings:', settingsError);
        toast({
          title: "Error Saving Settings",
          description: settingsError.message,
          variant: "destructive"
        });
        setIsSaving(false);
        return;
      }

      const { data: existingAvailability, error: fetchError } = await supabase
        .from('availability')
        .select('id, day_of_week, start_time, end_time')
        .eq('clinician_id', clinicianIdToUse)
        .eq('is_active', true);

      if (fetchError) {
        console.error('Error fetching existing availability:', fetchError);
        toast({
          title: "Error Fetching Existing Availability",
          description: fetchError.message,
          variant: "destructive"
        });
        setIsSaving(false);
        return;
      }

      const { data: exceptions, error: exceptionsError } = await supabase
        .from('availability_exceptions')
        .select('original_availability_id')
        .eq('clinician_id', clinicianIdToUse);

      if (exceptionsError) {
        console.error('Error fetching exceptions:', exceptionsError);
        toast({
          title: "Error Fetching Exceptions",
          description: exceptionsError.message,
          variant: "destructive"
        });
        setIsSaving(false);
        return;
      }

      const referencedIds = new Set(
        exceptions?.map(exception => exception.original_availability_id) || []
      );

      const existingAvailabilityMap = new Map();
      existingAvailability?.forEach(slot => {
        const key = `${slot.day_of_week}-${slot.start_time.substring(0, 5)}-${slot.end_time.substring(0, 5)}`;
        existingAvailabilityMap.set(key, slot);
      });

      const availabilityToKeep = new Set();
      const availabilityToUpdate = [];
      const availabilityIdsToDelete = [];
      const availabilityToInsert = [];

      weekSchedule.forEach(day => {
        if (!day.isOpen) return;

        day.timeSlots.forEach(slot => {
          const formattedStartTime = slot.startTime;
          const formattedEndTime = slot.endTime;
          const key = `${day.day}-${formattedStartTime}-${formattedEndTime}`;
          
          const existingSlot = existingAvailabilityMap.get(key);
          
          if (existingSlot) {
            availabilityToKeep.add(existingSlot.id);
          } else {
            availabilityToInsert.push({
              clinician_id: clinicianIdToUse,
              day_of_week: day.day,
              start_time: formattedStartTime,
              end_time: formattedEndTime,
              is_active: true
            });
          }
        });
      });

      existingAvailability?.forEach(slot => {
        if (!availabilityToKeep.has(slot.id) && !referencedIds.has(slot.id)) {
          availabilityIdsToDelete.push(slot.id);
        }
      });

      if (availabilityIdsToDelete.length > 0) {
        console.log('Deleting availability IDs:', availabilityIdsToDelete);
        const { error: deleteError } = await supabase
          .from('availability')
          .delete()
          .in('id', availabilityIdsToDelete);

        if (deleteError) {
          console.error('Error deleting availability:', deleteError);
          toast({
            title: "Error Deleting Availability",
            description: deleteError.message,
            variant: "destructive"
          });
          setIsSaving(false);
          return;
        }
      }

      if (availabilityToInsert.length > 0) {
        console.log('Inserting new availability:', availabilityToInsert);
        const { error: insertError } = await supabase
          .from('availability')
          .insert(availabilityToInsert);

        if (insertError) {
          console.error('Error saving availability:', insertError);
          toast({
            title: "Error Saving Availability",
            description: insertError.message,
            variant: "destructive"
          });
          setIsSaving(false);
          return;
        }
      }

      toast({
        title: "Availability Saved",
        description: "Your availability has been updated successfully",
      });
      
      if (onAvailabilityUpdated) {
        onAvailabilityUpdated();
      }
    } catch (error) {
      console.error('Error saving availability:', error);
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
            Availability
          </CardTitle>
          <div className="flex items-center gap-2">
            <span className="text-sm">Enabled</span>
            <Switch
              checked={availabilityEnabled}
              onCheckedChange={setAvailabilityEnabled}
            />
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="set">
              <Clock className="h-4 w-4 mr-2" />
              Weekly
            </TabsTrigger>
            <TabsTrigger value="single">
              <CalendarPlus className="h-4 w-4 mr-2" />
              Single Day
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>

      <CardContent>
        {activeTab === 'set' && (
          <div className="space-y-4">
            <div className="p-3 border rounded-md">
              <h3 className="font-medium mb-2">Scheduling Settings</h3>
              <Separator className="my-2" />
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground mb-2">
                    Allow clients to schedule appointments on:
                  </p>
                  <RadioGroup
                    value={timeGranularity}
                    onValueChange={(value) => setTimeGranularity(value as 'hour' | 'half-hour')}
                    className="flex flex-col space-y-1"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="hour" id="hour" />
                      <Label htmlFor="hour">Hour marks only (e.g., 1:00, 2:00)</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="half-hour" id="half-hour" />
                      <Label htmlFor="half-hour">Hour and half-hour marks (e.g., 1:00, 1:30)</Label>
                    </div>
                  </RadioGroup>
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
                        day.timeSlots.map((slot) => (
                          <div key={`slot-${slot.id}`} className="flex items-center gap-2 p-2 bg-gray-50 rounded-md">
                            <div className="grid grid-cols-2 gap-2 flex-1">
                              <Select
                                value={slot.startTime}
                                onValueChange={(value) => updateTimeSlot(index, slot.id, 'startTime', value)}
                              >
                                <SelectTrigger className="h-8">
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

                              <Select
                                value={slot.endTime}
                                onValueChange={(value) => updateTimeSlot(index, slot.id, 'endTime', value)}
                              >
                                <SelectTrigger className="h-8">
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

                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteTimeSlot(index, slot.id)}
                              className="h-8 w-8 p-0"
                            >
                              <X className="h-4 w-4" />
                            </Button>
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
          </div>
        )}

        {activeTab === 'single' && (
          <div className="space-y-4">
            <div className="p-3 border rounded-md">
              <h3 className="font-medium mb-2">Single Day Availability</h3>
              <Separator className="my-2" />
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground mb-2">
                    Select a specific date to set availability:
                  </p>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !selectedDate && "text-muted-foreground"
                        )}
                      >
                        <Calendar className="mr-2 h-4 w-4" />
                        {selectedDate ? format(selectedDate, 'MMMM d, yyyy') : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={selectedDate}
                        onSelect={setSelectedDate}
                        initialFocus
                        className="p-3 pointer-events-auto"
                        modifiers={{
                          hasAvailability: Object.keys(existingSingleAvailability).map(date => new Date(date)),
                        }}
                        modifiersClassNames={{
                          hasAvailability: "bg-green-100 text-green-800 font-medium",
                        }}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </div>

            {selectedDate && (
              <div className="space-y-2">
                <div className="flex items-center justify-between p-3 bg-gray-50 border rounded-md">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="font-medium">
                      {format(selectedDate, 'MMMM d, yyyy')}
                    </Badge>
                    {Object.keys(existingSingleAvailability).some(dateStr => 
                      isSameDay(new Date(dateStr), selectedDate)
                    ) && (
                      <Badge className="bg-green-100 text-green-800 hover:bg-green-200">
                        Has availability
                      </Badge>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={addSingleDateTimeSlot}
                    className="h-8 w-8 p-0"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                <div className="p-3 space-y-2 border rounded-md">
                  {singleDateTimeSlots.length === 0 ? (
                    <div className="text-sm text-gray-500 text-center py-4">
                      No time slots added for this date. Click the + button to add one.
                    </div>
                  ) : (
                    singleDateTimeSlots.map((slot) => (
                      <div key={`single-slot-${slot.id}`} className="flex items-center gap-2 p-2 bg-gray-50 rounded-md">
                        <div className="grid grid-cols-2 gap-2 flex-1">
                          <Select
                            value={slot.startTime}
                            onValueChange={(value) => updateSingleDateTimeSlot(slot.id, 'startTime', value)}
                          >
                            <SelectTrigger className="h-8">
                              <SelectValue placeholder="Start time" />
                            </SelectTrigger>
                            <SelectContent>
                              {timeOptions.map((time) => (
                                <SelectItem key={`single-start-${slot.id}-${time}`} value={time}>
                                  {time}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          <Select
                            value={slot.endTime}
                            onValueChange={(value) => updateSingleDateTimeSlot(slot.id, 'endTime', value)}
                          >
                            <SelectTrigger className="h-8">
                              <SelectValue placeholder="End time" />
                            </SelectTrigger>
                            <SelectContent>
                              {timeOptions.map((time) => (
                                <SelectItem key={`single-end-${slot.id}-${time}`} value={time}>
                                  {time}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteSingleDateTimeSlot(slot.id)}
                          className="h-8 w-8 p-0"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>

                <Button
                  className="w-full"
                  onClick={saveSingleDateAvailability}
                  disabled={isSaving || singleDateTimeSlots.length === 0}
                >
                  {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isSaving ? 'Saving...' : 'Save Single Day Availability'}
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AvailabilityPanel;
