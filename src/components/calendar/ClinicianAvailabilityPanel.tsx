
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Plus, Trash2, Edit } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import AddAvailabilityBlockDialog from './availability-blocks/AddAvailabilityBlockDialog';

interface AvailabilityBlock {
  id: string;
  start_at: string;
  end_at: string;
  is_active: boolean;
  recurring_pattern?: any;
}

interface ClinicianInfo {
  id: string;
  clinician_first_name: string;
  clinician_last_name: string;
  clinician_email: string;
}

const ClinicianAvailabilityPanel = () => {
  const [currentUser, setCurrentUser] = useState<ClinicianInfo | null>(null);
  const [availabilityBlocks, setAvailabilityBlocks] = useState<AvailabilityBlock[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [timeGranularity, setTimeGranularity] = useState<'hour' | 'half-hour'>('hour');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const { toast } = useToast();

  const fetchCurrentUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get clinician info from clinicians table instead of profiles
      const { data: clinician, error } = await supabase
        .from('clinicians')
        .select('id, clinician_first_name, clinician_last_name, clinician_email')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error fetching clinician:', error);
        return;
      }

      setCurrentUser(clinician);
    } catch (error) {
      console.error('Error in fetchCurrentUser:', error);
    }
  };

  const fetchAvailabilityBlocks = async () => {
    if (!currentUser) return;

    try {
      const { data, error } = await supabase
        .from('availability_blocks')
        .select('*')
        .eq('clinician_id', currentUser.id)
        .eq('is_active', true)
        .order('start_at');

      if (error) {
        console.error('Error fetching availability blocks:', error);
        return;
      }

      setAvailabilityBlocks(data || []);
    } catch (error) {
      console.error('Error in fetchAvailabilityBlocks:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTimeGranularityChange = (value: string) => {
    if (value === 'hour' || value === 'half-hour') {
      setTimeGranularity(value);
    }
  };

  const handleAvailabilityAdded = () => {
    setRefreshTrigger(prev => prev + 1);
    fetchAvailabilityBlocks();
  };

  const handleDeleteBlock = async (blockId: string) => {
    try {
      const { error } = await supabase
        .from('availability_blocks')
        .update({ is_active: false })
        .eq('id', blockId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Availability block deleted successfully.",
      });

      fetchAvailabilityBlocks();
    } catch (error) {
      console.error('Error deleting availability block:', error);
      toast({
        title: "Error",
        description: "Failed to delete availability block.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  useEffect(() => {
    if (currentUser) {
      fetchAvailabilityBlocks();
    }
  }, [currentUser, refreshTrigger]);

  const saveUserProfile = async () => {
    if (!currentUser) return;

    try {
      // Update clinician time granularity in clinicians table
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
            Configure your time slot preferences and availability blocks
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="timeGranularity">Time Slot Duration</Label>
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

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Availability Blocks
            <Button onClick={() => setIsAddDialogOpen(true)} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Block
            </Button>
          </CardTitle>
          <CardDescription>
            Manage your recurring availability schedule
          </CardDescription>
        </CardHeader>
        <CardContent>
          {availabilityBlocks.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-4">No availability blocks configured.</p>
              <Button onClick={() => setIsAddDialogOpen(true)} variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Availability Block
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {availabilityBlocks.map((block) => (
                <div key={block.id} className="flex items-center justify-between p-3 border rounded">
                  <div>
                    <p className="font-medium">
                      {format(parseISO(block.start_at), 'PPP p')} - {format(parseISO(block.end_at), 'p')}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" disabled>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleDeleteBlock(block.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AddAvailabilityBlockDialog
        isOpen={isAddDialogOpen}
        onClose={() => setIsAddDialogOpen(false)}
        clinicianId={currentUser.id}
        onAvailabilityAdded={handleAvailabilityAdded}
      />
    </div>
  );
};

export default ClinicianAvailabilityPanel;
