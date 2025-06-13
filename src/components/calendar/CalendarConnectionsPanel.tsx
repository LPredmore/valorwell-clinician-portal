
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Plus, Trash2, ExternalLink, AlertTriangle, Settings } from 'lucide-react';
import { useNylasIntegration } from '@/hooks/useNylasIntegration';
import { useToast } from '@/hooks/use-toast';
import InfrastructureStatusPanel from './InfrastructureStatusPanel';
import DatabaseDiagnosticTool from './DatabaseDiagnosticTool';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

const CalendarConnectionsPanel: React.FC = () => {
  const {
    connections,
    isLoading,
    isConnecting,
    lastError,
    clearError,
    connectGoogleCalendar,
    disconnectCalendar,
    refreshConnections
  } = useNylasIntegration();
  const { toast } = useToast();

  const handleConnect = async () => {
    try {
      await connectGoogleCalendar();
    } catch (error) {
      console.error('Error connecting calendar:', error);
    }
  };

  const handleDisconnect = async (connectionId: string, email: string) => {
    try {
      await disconnectCalendar(connectionId);
      toast({
        title: "Calendar Disconnected",
        description: `${email} has been disconnected`
      });
    } catch (error) {
      console.error('Error disconnecting calendar:', error);
    }
  };

  return (
    <div className="space-y-4">
      {/* Infrastructure Status */}
      <InfrastructureStatusPanel />

      {/* Calendar Connections */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Calendar Connections
          </CardTitle>
          <CardDescription>
            Connect external calendars to sync with your appointments
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Error Display */}
          {lastError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-red-800">{lastError.message}</p>
                  {lastError.details && (
                    <p className="text-xs text-red-700 mt-1">{lastError.details}</p>
                  )}
                  {lastError.actionRequired && (
                    <p className="text-xs font-medium text-red-900 bg-red-100 p-2 rounded mt-2">
                      {lastError.actionRequired}
                    </p>
                  )}
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={clearError}
                  className="text-red-600 hover:text-red-700"
                >
                  ×
                </Button>
              </div>
            </div>
          )}

          {/* Loading State */}
          {isLoading && (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
              <p className="text-sm text-gray-500">Loading connections...</p>
            </div>
          )}

          {/* Connected Calendars */}
          {connections.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Connected Calendars:</h4>
              {connections.map((connection) => (
                <div
                  key={connection.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <Calendar className="h-4 w-4 text-blue-600" />
                    <div>
                      <div className="font-medium text-sm">{connection.email}</div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {connection.provider}
                        </Badge>
                        {connection.grant_status && (
                          <Badge 
                            variant={connection.grant_status === 'valid' ? 'secondary' : 'outline'}
                            className="text-xs"
                          >
                            {connection.grant_status}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDisconnect(connection.id, connection.email)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Connect New Calendar */}
          <div className="space-y-2">
            {connections.length === 0 && !isLoading && (
              <div className="text-center py-6 text-gray-500">
                <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No calendars connected</p>
                <p className="text-sm">Connect Google Calendar to sync events</p>
              </div>
            )}

            <Button
              onClick={handleConnect}
              disabled={isConnecting || isLoading}
              className="w-full"
            >
              {isConnecting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Connecting...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Connect Google Calendar
                </>
              )}
            </Button>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button variant="outline" onClick={refreshConnections} size="sm" className="flex-1">
              <ExternalLink className="h-3 w-3 mr-1" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Advanced Diagnostics */}
      <Collapsible>
        <CollapsibleTrigger asChild>
          <Button variant="outline" size="sm" className="w-full">
            <Settings className="h-4 w-4 mr-2" />
            Advanced Diagnostics
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-2">
          <DatabaseDiagnosticTool />
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};

export default CalendarConnectionsPanel;
