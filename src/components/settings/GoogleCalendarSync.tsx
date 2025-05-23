import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, Calendar, Check, AlertCircle } from 'lucide-react';
import { useGoogleCalendar } from '@/hooks/useGoogleCalendar';
import { useAppointments } from '@/hooks/useAppointments';
import { useToast } from '@/hooks/use-toast';

interface GoogleCalendarSyncProps {
  clinicianId: string;
}

export function GoogleCalendarSync({ clinicianId }: GoogleCalendarSyncProps) {
  const { toast } = useToast();
  const { 
    isConnected, 
    isConnecting, 
    isSyncing, 
    connect, 
    disconnect, 
    bidirectionalSync,
    lastSyncTime
  } = useGoogleCalendar();
  
  const { appointments, refetch } = useAppointments(clinicianId);
  
  const [lastSyncResult, setLastSyncResult] = useState<{
    success: boolean;
    message: string;
    syncedCount: number;
    timestamp: Date;
  } | null>(null);

  // Initialize last sync result from lastSyncTime if available
  useEffect(() => {
    if (lastSyncTime && !lastSyncResult) {
      setLastSyncResult({
        success: true,
        message: "Last sync completed successfully",
        syncedCount: 0,
        timestamp: lastSyncTime
      });
    }
  }, [lastSyncTime, lastSyncResult]);

  const handleConnect = async () => {
    await connect();
  };

  const handleDisconnect = () => {
    disconnect();
    setLastSyncResult(null);
  };

  const handleSync = async () => {
    if (!isConnected) {
      toast({
        title: "Google Calendar Sync Error",
        description: "You need to connect your Google Calendar first",
        variant: "destructive"
      });
      return;
    }

    try {
      // Calculate date range for sync (now to 3 months in the future)
      const now = new Date();
      const threeMonthsFromNow = new Date();
      threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3);

      // Sync events from Google Calendar
      const result = await bidirectionalSync(
        clinicianId,
        appointments,
        now,
        threeMonthsFromNow
      );

      // Calculate total synced count
      const syncedCount = result.fromGoogle.created + result.fromGoogle.updated;
      const success = result.fromGoogle.errors === 0;
      
      // Store the result
      setLastSyncResult({
        success,
        message: success ? "Sync completed successfully" : "Some errors occurred during sync",
        syncedCount,
        timestamp: new Date()
      });

      // Show toast notification
      if (success) {
        toast({
          title: "Google Calendar Sync Complete",
          description: `Successfully synced ${syncedCount} events`,
          variant: "default"
        });
      } else {
        toast({
          title: "Google Calendar Sync Error",
          description: `Failed to sync some events (${result.fromGoogle.errors} errors)`,
          variant: "destructive"
        });
      }
      
      // Refresh appointments to show the newly synced events
      refetch();
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
        {!isConnected ? (
          <Button 
            onClick={handleConnect} 
            disabled={isConnecting}
            className="w-full"
          >
            {isConnecting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <Calendar className="mr-2 h-4 w-4" />
                Connect Google Calendar
              </>
            )}
          </Button>
        ) : (
          <div className="flex flex-col gap-2">
            <Button 
              onClick={handleSync} 
              disabled={isSyncing}
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
            <Button 
              onClick={handleDisconnect} 
              variant="outline"
              className="w-full"
            >
              Disconnect Google Calendar
            </Button>
          </div>
        )}
      </CardFooter>
    </Card>
  );
}