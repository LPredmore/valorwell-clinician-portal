
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Plus, Trash2, Loader2, AlertTriangle } from 'lucide-react';
import { useNylasIntegration } from '@/hooks/useNylasIntegration';

const CalendarConnectionsPanel: React.FC = () => {
  const {
    connections,
    isLoading,
    isConnecting,
    infrastructureError,
    connectCalendar,
    disconnectCalendar
  } = useNylasIntegration();

  const getProviderIcon = (provider: string) => {
    switch (provider.toLowerCase()) {
      case 'google':
        return '🔵';
      case 'outlook':
      case 'microsoft':
        return '🔷';
      case 'icloud':
        return '☁️';
      default:
        return '📅';
    }
  };

  const getProviderName = (provider: string) => {
    switch (provider.toLowerCase()) {
      case 'google':
        return 'Google Calendar';
      case 'outlook':
      case 'microsoft':
        return 'Outlook';
      case 'icloud':
        return 'iCloud';
      default:
        return provider;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Calendar Connections
        </CardTitle>
        <CardDescription>
          Connect your external calendars for automatic syncing
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {infrastructureError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-red-800 font-medium text-sm">Setup Required</p>
                <p className="text-red-700 text-xs mt-1">{infrastructureError}</p>
              </div>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <>
            {connections.length > 0 ? (
              <div className="space-y-3">
                {connections.map((connection) => (
                  <div
                    key={connection.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg">
                        {getProviderIcon(connection.provider)}
                      </span>
                      <div>
                        <div className="font-medium">
                          {getProviderName(connection.provider)}
                        </div>
                        <div className="text-sm text-gray-500">
                          {connection.email}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">Connected</Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => disconnectCalendar(connection.id)}
                        disabled={!!infrastructureError}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-gray-500">
                <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No calendars connected</p>
                <p className="text-sm">Connect your external calendars to enable syncing</p>
              </div>
            )}

            <Button
              onClick={connectCalendar}
              disabled={isConnecting || !!infrastructureError}
              className="w-full"
            >
              {isConnecting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Connect Calendar
                </>
              )}
            </Button>

            {infrastructureError && (
              <p className="text-xs text-gray-500 text-center">
                Connection disabled until infrastructure is configured
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default CalendarConnectionsPanel;
