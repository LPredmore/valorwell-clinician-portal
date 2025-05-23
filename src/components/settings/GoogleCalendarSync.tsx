import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, Calendar, Check, AlertCircle } from 'lucide-react';
import { syncGoogleCalendarEvents } from '@/utils/googleCalendarSync';
import { useToast } from '@/hooks/use-toast';

interface GoogleCalendarSyncProps {
  clinicianId: string;
  googleAccessToken?: string;
}

export function GoogleCalendarSync({ clinicianId, googleAccessToken }: GoogleCalendarSyncProps) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncResult, setLastSyncResult] = useState<{
    success: boolean;
    message: string;
    syncedCount: number;
    timestamp: Date;
  } | null>(null);
  const { toast } = useToast();

  const handleSync = async () => {
    if (!googleAccessToken) {
      toast({
        title: "Google Calendar Sync Error",
        description: "You need to connect your Google Calendar first",
        variant: "destructive"
      });
      return;
    }

    setIsSyncing(true);
    try {
      // Calculate date range for sync (now to 3 months in the future)
      const now = new Date();
      const threeMonthsFromNow = new Date();
      threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3);

      // Sync events from Google Calendar
      const result = await syncGoogleCalendarEvents(
        clinicianId,
        googleAccessToken,
        'primary', // Use primary calendar
        now,
        threeMonthsFromNow
      );

      // Store the result
      setLastSyncResult({
        ...result,
        timestamp: new Date()
      });

      // Show toast notification
      if (result.success) {
        toast({
          title: "Google Calendar Sync Complete",
          description: `Successfully synced ${result.syncedCount} events`,
          variant: "default"
        });
      } else {
        toast({
          title: "Google Calendar Sync Error",
          description: result.message,
          variant: "destructive"
        });
      }
    } catch (error: any) {
      console.error('Error syncing Google Calendar:', error);
      setLastSyncResult({
        success: false,
        message: error.message || 'An unknown error occurred',
        syncedCount: 0,
        timestamp: new Date()
      });
      toast({
        title: "Google Calendar Sync Error",
        description: error.message || 'An unknown error occurred',
        variant: "destructive"
      });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Google Calendar Sync
        </CardTitle>
        <CardDescription>
          Sync your Google Calendar events to show as "Personal Block" on your calendar
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-500 mb-4">
          This will sync all events marked as "Busy" from your Google Calendar and display them as "Personal Block" on your calendar.
          Your personal event details will remain private.
        </p>
        
        {lastSyncResult && (
          <Alert variant={lastSyncResult.success ? "default" : "destructive"} className="mb-4">
            <div className="flex items-center gap-2">
              {lastSyncResult.success ? (
                <Check className="h-4 w-4" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              <AlertTitle>
                {lastSyncResult.success ? "Sync Successful" : "Sync Failed"}
              </AlertTitle>
            </div>
            <AlertDescription className="mt-2">
              <p>{lastSyncResult.message}</p>
              <p className="text-xs mt-1">
                {lastSyncResult.success && `${lastSyncResult.syncedCount} events synced`}
              </p>
              <p className="text-xs mt-1">
                Last sync: {lastSyncResult.timestamp.toLocaleString()}
              </p>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
      <CardFooter>
        <Button 
          onClick={handleSync} 
          disabled={isSyncing || !googleAccessToken}
          className="w-full"
        >
          {isSyncing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Syncing...
            </>
          ) : (
            <>
              <Calendar className="mr-2 h-4 w-4" />
              Sync Google Calendar
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}