import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, Edit, Trash2, Clock, RefreshCw } from 'lucide-react';
import { useRecurringAvailability } from '@/hooks/useRecurringAvailability';
import { RecurringAvailabilityDialog } from './RecurringAvailabilityDialog';
import { RecurringAvailability } from '@/utils/availabilityService';

interface RecurringAvailabilityPanelProps {
  clinicianId: string;
}

const RecurringAvailabilityPanel: React.FC<RecurringAvailabilityPanelProps> = ({
  clinicianId
}) => {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSlot, setEditingSlot] = useState<{
    dayOfWeek: string;
    slotNumber: number;
    startTime: string;
    endTime: string;
    timezone: string;
  } | null>(null);

  const {
    recurringAvailability,
    syncStatus,
    isLoading,
    isSyncStatusLoading,
    updateAvailability,
    removeAvailability,
    isUpdating,
    isRemoving,
    refetch
  } = useRecurringAvailability(clinicianId);

  const daysOfWeek = [
    'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'
  ];

  const getDayDisplayName = (day: string) => {
    return day.charAt(0).toUpperCase() + day.slice(1);
  };

  const getSyncStatusForSlot = (dayOfWeek: string, slotNumber: number) => {
    return syncStatus.find(
      status => status.day_of_week === dayOfWeek && status.slot_number === slotNumber
    );
  };

  const getSyncBadge = (dayOfWeek: string, slotNumber: number) => {
    const status = getSyncStatusForSlot(dayOfWeek, slotNumber);
    if (!status) return null;

    const variants = {
      'pending': 'secondary',
      'synced': 'default',
      'failed': 'destructive',
      'conflict': 'destructive'
    } as const;

    return (
      <Badge variant={variants[status.sync_status as keyof typeof variants] || 'secondary'} className="ml-2">
        <RefreshCw className="h-3 w-3 mr-1" />
        {status.sync_status}
      </Badge>
    );
  };

  const handleEdit = (dayOfWeek: string, slot: any) => {
    setEditingSlot({
      dayOfWeek,
      slotNumber: slot.slot_number,
      startTime: slot.start_time,
      endTime: slot.end_time,
      timezone: slot.timezone
    });
    setIsDialogOpen(true);
  };

  const handleAddNew = () => {
    setEditingSlot(null);
    setIsDialogOpen(true);
  };

  const handleSave = (data: {
    dayOfWeek: string;
    slotNumber: number;
    startTime: string;
    endTime: string;
    timezone: string;
  }) => {
    updateAvailability(data);
    setIsDialogOpen(false);
    setEditingSlot(null);
  };

  const handleRemove = (dayOfWeek: string, slotNumber: number) => {
    if (confirm('Are you sure you want to remove this availability slot?')) {
      removeAvailability({ dayOfWeek, slotNumber });
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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Recurring Availability
            <Button onClick={handleAddNew} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Availability
            </Button>
          </CardTitle>
          <CardDescription>
            Manage your weekly recurring availability schedule. Changes will sync with your external calendar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recurringAvailability.length === 0 ? (
            <div className="text-center py-8">
              <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">No recurring availability configured.</p>
              <Button onClick={handleAddNew} variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Availability Block
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {daysOfWeek.map(day => {
                const dayAvailability = recurringAvailability.find(
                  availability => availability.day_of_week === day
                );

                if (!dayAvailability || dayAvailability.slots.length === 0) {
                  return (
                    <div key={day} className="flex items-center justify-between p-3 border rounded-lg bg-gray-50">
                      <div>
                        <p className="font-medium text-gray-700">{getDayDisplayName(day)}</p>
                        <p className="text-sm text-gray-500">No availability</p>
                      </div>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => {
                          setEditingSlot({
                            dayOfWeek: day,
                            slotNumber: 1,
                            startTime: '09:00',
                            endTime: '17:00',
                            timezone: 'America/New_York'
                          });
                          setIsDialogOpen(true);
                        }}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                }

                return (
                  <div key={day} className="space-y-2">
                    <h4 className="font-medium text-gray-900">{getDayDisplayName(day)}</h4>
                    {dayAvailability.slots.map(slot => (
                      <div key={slot.slot_number} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">
                            {slot.start_time} - {slot.end_time}
                          </p>
                          <p className="text-sm text-gray-500">
                            {slot.timezone}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {getSyncBadge(day, slot.slot_number)}
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleEdit(day, slot)}
                            disabled={isUpdating}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleRemove(day, slot.slot_number)}
                            disabled={isRemoving}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <RecurringAvailabilityDialog
        isOpen={isDialogOpen}
        onClose={() => {
          setIsDialogOpen(false);
          setEditingSlot(null);
        }}
        onSave={handleSave}
        editingSlot={editingSlot}
        clinicianId={clinicianId}
      />
    </div>
  );
};

export default RecurringAvailabilityPanel;
