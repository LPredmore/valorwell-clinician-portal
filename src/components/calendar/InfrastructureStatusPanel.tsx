
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, CheckCircle, Loader2, RefreshCw, ExternalLink } from 'lucide-react';
import { useNylasInfrastructureStatus } from '@/hooks/useNylasInfrastructureStatus';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

const InfrastructureStatusPanel: React.FC = () => {
  const status = useNylasInfrastructureStatus();

  const getStatusIcon = (componentStatus: string) => {
    switch (componentStatus) {
      case 'ready':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case 'checking':
      default:
        return <Loader2 className="h-4 w-4 animate-spin text-blue-600" />;
    }
  };

  const getStatusBadge = (componentStatus: string) => {
    switch (componentStatus) {
      case 'ready':
        return <Badge variant="secondary" className="text-green-700 bg-green-100">Ready</Badge>;
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
      case 'checking':
      default:
        return <Badge variant="outline">Checking...</Badge>;
    }
  };

  const hasErrors = status.overall === 'error';
  const isChecking = status.overall === 'checking';

  if (!hasErrors && !isChecking) {
    return null; // Don't show panel if everything is working
  }

  return (
    <Card className={hasErrors ? "border-red-200" : "border-yellow-200"}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {hasErrors ? (
            <AlertTriangle className="h-5 w-5 text-red-600" />
          ) : (
            <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
          )}
          Infrastructure Status
        </CardTitle>
        <CardDescription>
          {hasErrors 
            ? "Some components need attention before Nylas integration will work"
            : "Checking Nylas integration components..."
          }
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Database Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getStatusIcon(status.database.status)}
            <span className="font-medium">Database</span>
          </div>
          {getStatusBadge(status.database.status)}
        </div>
        {status.database.status === 'error' && (
          <div className="ml-6 text-sm text-red-700">
            <p>{status.database.message}</p>
            {status.database.details && (
              <p className="text-xs text-red-600 mt-1">{status.database.details}</p>
            )}
          </div>
        )}

        {/* Edge Function Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getStatusIcon(status.edgeFunction.status)}
            <span className="font-medium">Edge Functions</span>
          </div>
          {getStatusBadge(status.edgeFunction.status)}
        </div>
        {status.edgeFunction.status === 'error' && (
          <div className="ml-6 text-sm text-red-700">
            <p>{status.edgeFunction.message}</p>
            {status.edgeFunction.details && (
              <p className="text-xs text-red-600 mt-1">{status.edgeFunction.details}</p>
            )}
          </div>
        )}

        {/* Secrets Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getStatusIcon(status.secrets.status)}
            <span className="font-medium">Configuration</span>
          </div>
          {getStatusBadge(status.secrets.status)}
        </div>
        {status.secrets.status === 'error' && (
          <div className="ml-6 text-sm text-red-700">
            <p>{status.secrets.message}</p>
            {status.secrets.details && (
              <p className="text-xs text-red-600 mt-1">{status.secrets.details}</p>
            )}
          </div>
        )}

        {hasErrors && (
          <Collapsible>
            <CollapsibleTrigger asChild>
              <Button variant="outline" size="sm" className="w-full">
                <ExternalLink className="h-4 w-4 mr-2" />
                Setup Instructions
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-3">
              <div className="space-y-2 text-sm bg-gray-50 p-3 rounded">
                <p className="font-medium">Required Setup Steps:</p>
                <ol className="list-decimal list-inside space-y-1 text-gray-700">
                  <li>Apply Nylas database migrations</li>
                  <li>Deploy nylas-auth edge function</li>
                  <li>Configure Nylas API credentials in Supabase secrets</li>
                  <li>Verify RLS policies are correctly applied</li>
                </ol>
                <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded">
                  <p className="text-blue-800 text-xs">
                    <strong>For Terminal Access:</strong> Use Cursor AI or terminal to run migrations and deploy functions
                  </p>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}
      </CardContent>
    </Card>
  );
};

export default InfrastructureStatusPanel;
