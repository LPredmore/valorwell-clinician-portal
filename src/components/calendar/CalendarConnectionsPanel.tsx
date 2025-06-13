
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Plus, Trash2, Loader2, AlertTriangle, X } from 'lucide-react';
import { useNylasIntegration } from '@/hooks/useNylasIntegration';
import InfrastructureStatusPanel from './InfrastructureStatusPanel';

const CalendarConnectionsPanel: React.FC = () => {
  const {
    connections,
    isLoading,
    isConnecting,
    lastError,
    clearError,
    connectGoogleCalendar,
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

  const getConnectionStatus = (connection: any) => {
    if (connection.grant_status === 'valid') {
      return { label: 'Connected', variant: 'secondary' as const };
    } else if (connection.grant_status === 'invalid') {
      return { label: 'Needs Reauth', variant: 'destructive' as const };
    } else {
      return { label: 'Connected', variant: 'secondary' as const };
    }
  };

  return (
    <div className="space-y-4">
      {/* Infrastructure Status Panel - only shows if there are issues */}
      <InfrastructureStatusPanel />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Google Calendar Integration
          </CardTitle>
          <CardDescription>
            Connect your Google Calendar for two-way sync via Nylas
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Enhanced Error Display */}
          {lastError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-red-800 font-medium text-sm">{lastError.message}</p>
                    {lastError.details && (
                      <p className="text-red-700 text-xs mt-1">{lastError.details}</p>
                    )}
                    {lastError.actionRequired && (
                      <p className="text-red-600 text-xs mt-2 font-medium">
                        Action Required: {lastError.actionRequired}
                      </p>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearError}
                  className="h-6 w-6 p-0"
                >
                  <X className="h-3 w-3" />
                </Button>
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
                  {connections.map((connection) => {
                    const status = getConnectionStatus(connection);
                    return (
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
                            {connection.last_sync_at && (
                              <div className="text-xs text-gray-400">
                                Last sync: {new Date(connection.last_sync_at).toLocaleDateString()}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={status.variant}>{status.label}</Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => disconnectCalendar(connection.id)}
                            disabled={!!lastError && lastError.type === 'database'}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-6 text-gray-500">
                  <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No Google Calendar connected</p>
                  <p className="text-sm">Connect your Google Calendar to enable two-way sync</p>
                </div>
              )}

              <Button
                onClick={connectGoogleCalendar}
                disabled={isConnecting || (!!lastError && lastError.type !== 'oauth')}
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
                    Connect Google Calendar
                  </>
                )}
              </Button>

              {lastError && lastError.type !== 'oauth' && (
                <p className="text-xs text-gray-500 text-center">
                  Connection disabled until infrastructure issues are resolved
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CalendarConnectionsPanel;
