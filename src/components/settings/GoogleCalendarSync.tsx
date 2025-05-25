import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Loader2, AlertCircle, CheckCircle2, Calendar } from 'lucide-react';
import { googleCalendarConnector } from '@/utils/googleCalendarSync';
import { useToast } from '@/hooks/use-toast';
import { useCalendar } from '@/context/CalendarContext';
import { supabase } from '@/integrations/supabase/client';
import { 
  SyncStatus, 
  SyncDirection, 
  SyncFrequency, 
  ConflictResolutionStrategy,
  CalendarConnection
} from '@/types/calendarSync';

interface GoogleCalendarSyncProps {
  userId: string;
}

export const GoogleCalendarSync: React.FC<GoogleCalendarSyncProps> = ({ userId }) => {
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [connection, setConnection] = useState<CalendarConnection | null>(null);
  const [syncLogs, setSyncLogs] = useState<any[]>([]);
  const [showLogs, setShowLogs] = useState(false);
  const { toast } = useToast();
  const { refreshAppointments } = useCalendar();

  // Fetch connection on mount
  useEffect(() => {
    fetchConnection();
  }, [userId]);

  // Fetch connection details
  const fetchConnection = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('calendar_connections')
        .select()
        .eq('user_id', userId)
        .eq('calendar_type', 'google')
        .single();
      
      if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
        throw error;
      }
      
      if (data) {
        setConnection({
          id: data.id,
          userId: data.user_id,
          calendarType: data.calendar_type,
          calendarId: data.calendar_id,
          calendarName: data.calendar_name,
          status: data.status,
          lastSyncedAt: data.last_synced_at,
          conflictStrategy: data.conflict_strategy,
          syncDirection: data.sync_direction,
          syncFrequency: data.sync_frequency,
          syncRange: data.sync_range,
          filterTags: data.filter_tags,
          filterAppointmentTypes: data.filter_appointment_types,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
          authDetails: data.auth_details
        });
        
        // Fetch sync logs
        fetchSyncLogs(data.id);
      }
    } catch (error) {
      console.error('Error fetching connection:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch Google Calendar connection',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch sync logs
  const fetchSyncLogs = async (connectionId: string) => {
    try {
      const { data, error } = await supabase
        .from('sync_logs')
        .select()
        .eq('connection_id', connectionId)
        .order('timestamp', { ascending: false })
        .limit(10);
      
      if (error) {
        throw error;
      }
      
      setSyncLogs(data || []);
    } catch (error) {
      console.error('Error fetching sync logs:', error);
    }
  };

  // Connect to Google Calendar
  const connectGoogleCalendar = async () => {
    try {
      // Generate auth URL
      const authUrl = googleCalendarConnector.getAuthUrl();
      
      // Open popup for authentication
      const popup = window.open(
        authUrl,
        'Google Calendar Authentication',
        'width=600,height=700'
      );
      
      // Listen for auth code from popup
      window.addEventListener('message', async (event) => {
        if (event.data && event.data.type === 'GOOGLE_AUTH_CODE') {
          const authCode = event.data.code;
          
          try {
            setConnecting(true);
            
            // Connect using auth code
            const newConnection = await googleCalendarConnector.connect(userId, authCode);
            setConnection(newConnection);
            
            toast({
              title: 'Connected',
              description: 'Successfully connected to Google Calendar',
              variant: 'default'
            });
            
            // Refresh appointments to show synced events
            refreshAppointments();
          } catch (error) {
            console.error('Error connecting to Google Calendar:', error);
            toast({
              title: 'Connection Failed',
              description: error.message || 'Failed to connect to Google Calendar',
              variant: 'destructive'
            });
          } finally {
            setConnecting(false);
          }
        }
      });
    } catch (error) {
      console.error('Error initiating Google Calendar connection:', error);
      toast({
        title: 'Error',
        description: 'Failed to initiate Google Calendar connection',
        variant: 'destructive'
      });
    }
  };

  // Disconnect from Google Calendar
  const disconnectGoogleCalendar = async () => {
    if (!connection) return;
    
    try {
      setConnecting(true);
      
      // Disconnect
      await googleCalendarConnector.disconnect(connection.id);
      
      // Update state
      setConnection(null);
      setSyncLogs([]);
      
      toast({
        title: 'Disconnected',
        description: 'Successfully disconnected from Google Calendar',
        variant: 'default'
      });
      
      // Refresh appointments to remove synced events
      refreshAppointments();
    } catch (error) {
      console.error('Error disconnecting from Google Calendar:', error);
      toast({
        title: 'Error',
        description: 'Failed to disconnect from Google Calendar',
        variant: 'destructive'
      });
    } finally {
      setConnecting(false);
    }
  };

  // Update connection settings
  const updateConnectionSettings = async (field: string, value: any) => {
    if (!connection) return;
    
    try {
      // Update in database
      const { error } = await supabase
        .from('calendar_connections')
        .update({ [field]: value })
        .eq('id', connection.id);
      
      if (error) {
        throw error;
      }
      
      // Update local state
      setConnection({
        ...connection,
        [field]: value
      });
      
      toast({
        title: 'Settings Updated',
        description: 'Calendar sync settings updated successfully',
        variant: 'default'
      });
      
      // If sync frequency changed, restart sync
      if (field === 'sync_frequency') {
        await googleCalendarConnector.stopSync(connection.id);
        await googleCalendarConnector.startSync(connection.id);
      }
    } catch (error) {
      console.error('Error updating connection settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to update calendar sync settings',
        variant: 'destructive'
      });
    }
  };

  // Manual sync
  const manualSync = async () => {
    if (!connection) return;
    
    try {
      setLoading(true);
      
      // Start sync
      await googleCalendarConnector.startSync(connection.id);
      
      // Refresh connection
      await fetchConnection();
      
      // Refresh appointments
      refreshAppointments();
      
      toast({
        title: 'Sync Complete',
        description: 'Calendar synchronization completed successfully',
        variant: 'default'
      });
    } catch (error) {
      console.error('Error syncing calendar:', error);
      toast({
        title: 'Sync Failed',
        description: 'Failed to synchronize calendar',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  // Render connection status
  const renderConnectionStatus = () => {
    if (!connection) return null;
    
    switch (connection.status) {
      case SyncStatus.CONNECTED:
        return (
          <div className="flex items-center text-green-600">
            <CheckCircle2 className="w-4 h-4 mr-2" />
            <span>Connected</span>
          </div>
        );
      case SyncStatus.SYNCING:
        return (
          <div className="flex items-center text-blue-600">
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            <span>Syncing</span>
          </div>
        );
      case SyncStatus.ERROR:
        return (
          <div className="flex items-center text-red-600">
            <AlertCircle className="w-4 h-4 mr-2" />
            <span>Error</span>
          </div>
        );
      case SyncStatus.PAUSED:
        return (
          <div className="flex items-center text-yellow-600">
            <AlertCircle className="w-4 h-4 mr-2" />
            <span>Paused</span>
          </div>
        );
      default:
        return (
          <div className="flex items-center text-gray-600">
            <AlertCircle className="w-4 h-4 mr-2" />
            <span>Disconnected</span>
          </div>
        );
    }
  };

  // Render last synced time
  const renderLastSynced = () => {
    if (!connection || !connection.lastSyncedAt) return 'Never';
    
    const lastSynced = new Date(connection.lastSyncedAt);
    return lastSynced.toLocaleString();
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Calendar className="w-5 h-5 mr-2" />
          Google Calendar Integration
        </CardTitle>
        <CardDescription>
          Synchronize your appointments with Google Calendar
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!connection ? (
          <div className="space-y-4">
            <p>Connect your Google Calendar to automatically sync appointments.</p>
            <Button 
              onClick={connectGoogleCalendar} 
              disabled={connecting}
              className="flex items-center"
            >
              {connecting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Connect Google Calendar
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h4 className="text-sm font-medium">Status</h4>
                {renderConnectionStatus()}
              </div>
              <div>
                <h4 className="text-sm font-medium">Last Synced</h4>
                <p className="text-sm text-gray-500">{renderLastSynced()}</p>
              </div>
              <div>
                <h4 className="text-sm font-medium">Calendar</h4>
                <p className="text-sm text-gray-500">{connection.calendarName}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sync-direction">Sync Direction</Label>
                  <Select
                    value={connection.syncDirection}
                    onValueChange={(value) => updateConnectionSettings('sync_direction', value)}
                  >
                    <SelectTrigger id="sync-direction">
                      <SelectValue placeholder="Select direction" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={SyncDirection.BIDIRECTIONAL}>Two-way sync</SelectItem>
                      <SelectItem value={SyncDirection.TO_EXTERNAL}>To Google only</SelectItem>
                      <SelectItem value={SyncDirection.FROM_EXTERNAL}>From Google only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sync-frequency">Sync Frequency</Label>
                  <Select
                    value={connection.syncFrequency}
                    onValueChange={(value) => updateConnectionSettings('sync_frequency', value)}
                  >
                    <SelectTrigger id="sync-frequency">
                      <SelectValue placeholder="Select frequency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={SyncFrequency.REALTIME}>Real-time (5 min)</SelectItem>
                      <SelectItem value={SyncFrequency.HOURLY}>Hourly</SelectItem>
                      <SelectItem value={SyncFrequency.DAILY}>Daily</SelectItem>
                      <SelectItem value={SyncFrequency.MANUAL}>Manual only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="conflict-strategy">Conflict Resolution</Label>
                  <Select
                    value={connection.conflictStrategy}
                    onValueChange={(value) => updateConnectionSettings('conflict_strategy', value)}
                  >
                    <SelectTrigger id="conflict-strategy">
                      <SelectValue placeholder="Select strategy" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ConflictResolutionStrategy.LOCAL_WINS}>Local wins</SelectItem>
                      <SelectItem value={ConflictResolutionStrategy.EXTERNAL_WINS}>Google wins</SelectItem>
                      <SelectItem value={ConflictResolutionStrategy.MANUAL}>Manual resolution</SelectItem>
                      <SelectItem value={ConflictResolutionStrategy.NEWEST_WINS}>Newest wins</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sync-range">Sync Range (days)</Label>
                  <div className="flex space-x-4">
                    <div className="flex-1">
                      <Label htmlFor="past-days" className="text-xs">Past</Label>
                      <Select
                        value={connection.syncRange?.pastDays?.toString() || "30"}
                        onValueChange={(value) => updateConnectionSettings('sync_range', {
                          ...connection.syncRange,
                          pastDays: parseInt(value)
                        })}
                      >
                        <SelectTrigger id="past-days">
                          <SelectValue placeholder="Past days" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="7">7 days</SelectItem>
                          <SelectItem value="14">14 days</SelectItem>
                          <SelectItem value="30">30 days</SelectItem>
                          <SelectItem value="60">60 days</SelectItem>
                          <SelectItem value="90">90 days</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex-1">
                      <Label htmlFor="future-days" className="text-xs">Future</Label>
                      <Select
                        value={connection.syncRange?.futureDays?.toString() || "90"}
                        onValueChange={(value) => updateConnectionSettings('sync_range', {
                          ...connection.syncRange,
                          futureDays: parseInt(value)
                        })}
                      >
                        <SelectTrigger id="future-days">
                          <SelectValue placeholder="Future days" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="30">30 days</SelectItem>
                          <SelectItem value="60">60 days</SelectItem>
                          <SelectItem value="90">90 days</SelectItem>
                          <SelectItem value="180">180 days</SelectItem>
                          <SelectItem value="365">365 days</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>

              {connection.status === SyncStatus.ERROR && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Sync Error</AlertTitle>
                  <AlertDescription>
                    There was an error syncing with Google Calendar. Please try reconnecting or check your settings.
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex items-center space-x-2">
                <Button 
                  variant="outline" 
                  onClick={() => setShowLogs(!showLogs)}
                >
                  {showLogs ? 'Hide Logs' : 'Show Logs'}
                </Button>
                <Button 
                  onClick={manualSync} 
                  disabled={loading || connection.status === SyncStatus.SYNCING}
                >
                  {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Sync Now
                </Button>
              </div>

              {showLogs && syncLogs.length > 0 && (
                <div className="mt-4 border rounded-md p-4 max-h-60 overflow-y-auto">
                  <h4 className="text-sm font-medium mb-2">Sync Logs</h4>
                  <div className="space-y-2">
                    {syncLogs.map((log) => (
                      <div key={log.id} className="text-xs border-b pb-2">
                        <div className="flex justify-between">
                          <span className="font-medium">{log.event_type.replace(/_/g, ' ')}</span>
                          <span className="text-gray-500">
                            {new Date(log.timestamp).toLocaleString()}
                          </span>
                        </div>
                        {log.details && (
                          <p className="text-gray-600 mt-1">
                            {log.details.message || JSON.stringify(log.details)}
                          </p>
                        )}
                        {log.error && (
                          <p className="text-red-500 mt-1">{log.error}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
      {connection && (
        <CardFooter className="flex justify-between">
          <Button 
            variant="outline" 
            onClick={disconnectGoogleCalendar}
            disabled={connecting}
          >
            {connecting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Disconnect
          </Button>
        </CardFooter>
      )}
    </Card>
  );
};