
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Plus, ExternalLink, Trash2, Copy, Loader2 } from 'lucide-react';
import { useNylasScheduler } from '@/hooks/useNylasScheduler';
import { useToast } from '@/hooks/use-toast';

interface SchedulerManagementPanelProps {
  clinicianId: string | null;
}

const SchedulerManagementPanel: React.FC<SchedulerManagementPanelProps> = ({
  clinicianId
}) => {
  const {
    schedulerConfig,
    isLoading,
    isCreating,
    createScheduler,
    deactivateScheduler,
    getBookingUrl
  } = useNylasScheduler(clinicianId);
  const { toast } = useToast();

  const handleCopyBookingUrl = () => {
    const url = getBookingUrl();
    if (url) {
      navigator.clipboard.writeText(url);
      toast({
        title: "URL Copied",
        description: "Booking URL has been copied to clipboard"
      });
    }
  };

  const handleOpenBookingUrl = () => {
    const url = getBookingUrl();
    if (url) {
      window.open(url, '_blank');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Client Booking Scheduler
        </CardTitle>
        <CardDescription>
          Allow clients to book appointments directly from your public scheduling page
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : schedulerConfig ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <div className="font-medium">Booking Scheduler</div>
                <div className="text-sm text-gray-500">
                  Public booking page is active
                </div>
              </div>
              <Badge variant="secondary">Active</Badge>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Booking URL:</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={getBookingUrl() || ''}
                  readOnly
                  className="flex-1 px-3 py-2 text-sm border rounded-md bg-gray-50"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyBookingUrl}
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleOpenBookingUrl}
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <Button
              variant="outline"
              onClick={deactivateScheduler}
              className="w-full"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Deactivate Scheduler
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-center py-6 text-gray-500">
              <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No booking scheduler configured</p>
              <p className="text-sm">Create a public booking page for clients</p>
            </div>

            <Button
              onClick={createScheduler}
              disabled={isCreating || !clinicianId}
              className="w-full"
            >
              {isCreating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Booking Scheduler
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SchedulerManagementPanel;
