
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { Loader2 } from 'lucide-react';
import RecurringAvailabilityPanel from './RecurringAvailabilityPanel';

interface ClinicianInfo {
  id: string;
  clinician_first_name: string;
  clinician_last_name: string;
  clinician_email: string;
  clinician_time_granularity: string;
}

const ClinicianAvailabilityPanel = () => {
  const [currentUser, setCurrentUser] = useState<ClinicianInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [timeGranularity, setTimeGranularity] = useState<'hour' | 'half-hour'>('hour');
  const { toast } = useToast();

  const fetchCurrentUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: clinician, error } = await supabase
        .from('clinicians')
        .select('id, clinician_first_name, clinician_last_name, clinician_email, clinician_time_granularity')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error fetching clinician:', error);
        return;
      }

      setCurrentUser(clinician);
      setTimeGranularity(clinician.clinician_time_granularity || 'hour');
    } catch (error) {
      console.error('Error in fetchCurrentUser:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTimeGranularityChange = (value: string) => {
    if (value === 'hour' || value === 'half-hour') {
      setTimeGranularity(value);
    }
  };

  const saveUserProfile = async () => {
    if (!currentUser) return;

    try {
      const { error } = await supabase
        .from('clinicians')
        .update({ 
          clinician_time_granularity: timeGranularity 
        })
        .eq('id', currentUser.id);

      if (error) {
        console.error('Error updating clinician:', error);
        toast({
          title: "Error",
          description: "Failed to save preferences.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success",
        description: "Preferences saved successfully.",
      });
    } catch (error) {
      console.error('Error in saveUserProfile:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  if (!currentUser) {
    return (
      <Card>
        <CardContent>
          <p>Please log in to view availability settings.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Availability Preferences</CardTitle>
          <CardDescription>
            Configure your time slot preferences
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label htmlFor="timeGranularity" className="block text-sm font-medium mb-2">
              Time Slot Duration
            </label>
            <Select value={timeGranularity} onValueChange={handleTimeGranularityChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hour">1 Hour</SelectItem>
                <SelectItem value="half-hour">30 Minutes</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <Button onClick={saveUserProfile}>
            Save Preferences
          </Button>
        </CardContent>
      </Card>

      <RecurringAvailabilityPanel clinicianId={currentUser.id} />
    </div>
  );
};

export default ClinicianAvailabilityPanel;
