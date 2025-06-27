
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { TimeZoneService } from '@/utils/timeZoneService';

interface AvailabilityBlock {
  id: number;
  startTime: string;
  endTime: string;
}

interface AvailabilityManagementSidebarProps {
  clinicianId: string | null;
  userTimeZone: string;
}

const DAYS_OF_WEEK = [
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'
];

const DAY_LABELS = [
  'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'
];

const AvailabilityManagementSidebar: React.FC<AvailabilityManagementSidebarProps> = ({
  clinicianId,
  userTimeZone
}) => {
  const [selectedDay, setSelectedDay] = useState('monday');
  const [availabilityBlocks, setAvailabilityBlocks] = useState<AvailabilityBlock[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Load availability for selected day
  useEffect(() => {
    if (clinicianId) {
      loadAvailabilityForDay(selectedDay);
    }
  }, [clinicianId, selectedDay]);

  const loadAvailabilityForDay = async (day: string) => {
    if (!clinicianId) return;

    try {
      const { data, error } = await supabase
        .from('clinicians')
        .select(`
          clinician_availability_start_${day}_1,
          clinician_availability_end_${day}_1,
          clinician_availability_start_${day}_2,
          clinician_availability_end_${day}_2,
          clinician_availability_start_${day}_3,
          clinician_availability_end_${day}_3
        `)
        .eq('id', clinicianId)
        .single();

      if (error) throw error;

      const blocks: AvailabilityBlock[] = [];
      for (let i = 1; i <= 3; i++) {
        const startTime = data?.[`clinician_availability_start_${day}_${i}`];
        const endTime = data?.[`clinician_availability_end_${day}_${i}`];
        
        if (startTime && endTime) {
          blocks.push({
            id: i,
            startTime,
            endTime
          });
        }
      }

      setAvailabilityBlocks(blocks);
    } catch (error) {
      console.error('Error loading availability:', error);
      toast({
        title: "Error",
        description: "Failed to load availability",
        variant: "destructive"
      });
    }
  };

  const saveAvailabilityForDay = async () => {
    if (!clinicianId) return;

    setLoading(true);
    try {
      const updates: any = {};
      
      // Clear all slots first
      for (let i = 1; i <= 3; i++) {
        updates[`clinician_availability_start_${selectedDay}_${i}`] = null;
        updates[`clinician_availability_end_${selectedDay}_${i}`] = null;
      }

      // Set active blocks
      availabilityBlocks.forEach((block, index) => {
        const slotNum = index + 1;
        if (slotNum <= 3) {
          updates[`clinician_availability_start_${selectedDay}_${slotNum}`] = block.startTime;
          updates[`clinician_availability_end_${selectedDay}_${slotNum}`] = block.endTime;
        }
      });

      const { error } = await supabase
        .from('clinicians')
        .update(updates)
        .eq('id', clinicianId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Availability saved successfully"
      });
    } catch (error) {
      console.error('Error saving availability:', error);
      toast({
        title: "Error",
        description: "Failed to save availability",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const addAvailabilityBlock = () => {
    if (availabilityBlocks.length < 3) {
      const newBlock: AvailabilityBlock = {
        id: availabilityBlocks.length + 1,
        startTime: '09:00',
        endTime: '17:00'
      };
      setAvailabilityBlocks([...availabilityBlocks, newBlock]);
    }
  };

  const removeAvailabilityBlock = (blockId: number) => {
    setAvailabilityBlocks(availabilityBlocks.filter(block => block.id !== blockId));
  };

  const updateAvailabilityBlock = (blockId: number, field: 'startTime' | 'endTime', value: string) => {
    setAvailabilityBlocks(availabilityBlocks.map(block => 
      block.id === blockId ? { ...block, [field]: value } : block
    ));
  };

  return (
    <Card className="w-80">
      <CardHeader>
        <CardTitle className="text-lg">Availability Management</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Day selector */}
        <div>
          <Label htmlFor="day-select">Day of Week</Label>
          <Select value={selectedDay} onValueChange={setSelectedDay}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DAY_LABELS.map((label, index) => (
                <SelectItem key={DAYS_OF_WEEK[index]} value={DAYS_OF_WEEK[index]}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Availability blocks */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Time Blocks</Label>
            {availabilityBlocks.length < 3 && (
              <Button
                onClick={addAvailabilityBlock}
                size="sm"
                variant="outline"
                className="h-8"
              >
                <Plus className="h-4 w-4" />
              </Button>
            )}
          </div>

          {availabilityBlocks.map((block) => (
            <div key={block.id} className="flex items-center space-x-2 p-3 border rounded-lg">
              <div className="flex-1">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Start</Label>
                    <Input
                      type="time"
                      value={block.startTime}
                      onChange={(e) => updateAvailabilityBlock(block.id, 'startTime', e.target.value)}
                      className="h-8"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">End</Label>
                    <Input
                      type="time"
                      value={block.endTime}
                      onChange={(e) => updateAvailabilityBlock(block.id, 'endTime', e.target.value)}
                      className="h-8"
                    />
                  </div>
                </div>
              </div>
              <Button
                onClick={() => removeAvailabilityBlock(block.id)}
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}

          {availabilityBlocks.length === 0 && (
            <div className="text-sm text-gray-500 text-center py-4">
              No availability blocks set for {DAY_LABELS[DAYS_OF_WEEK.indexOf(selectedDay)]}
            </div>
          )}
        </div>

        {/* Save button */}
        <Button 
          onClick={saveAvailabilityForDay} 
          disabled={loading}
          className="w-full"
        >
          {loading ? 'Saving...' : 'Save Availability'}
        </Button>

        {/* Timezone display */}
        <div className="text-xs text-gray-500 text-center">
          Times are in: {userTimeZone}
        </div>
      </CardContent>
    </Card>
  );
};

export default AvailabilityManagementSidebar;
