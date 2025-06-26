
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, CheckCircle, Loader2, RefreshCw, ExternalLink, Database, Cloud, Key, Zap } from 'lucide-react';
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

  const getComponentIcon = (component: string) => {
    switch (component) {
      case 'database':
        return <Database className="h-4 w-4" />;
      case 'edgeFunction':
        return <Zap className="h-4 w-4" />;
      case 'secrets':
        return <Key className="h-4 w-4" />;
      case 'nylasApi':
        return <Cloud className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const getComponentLabel = (component: string) => {
    switch (component) {
      case 'database':
        return 'Database Tables';
      case 'edgeFunction':
        return 'Edge Functions';
      case 'secrets':
        return 'API Configuration';
      case 'nylasApi':
        return 'Nylas API';
      default:
        return component;
    }
  };

  const hasErrors = status.overall === 'error';
  const isChecking = status.overall === 'checking';

  if (!hasErrors && !isChecking) {
    return (
      <Card className="border-green-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-700">
            <CheckCircle className="h-5 w-5" />
            Infrastructure Ready
          </CardTitle>
          <CardDescription>
            All Nylas integration components are working correctly
          </CardDescription>
        </CardHeader>
      </Card>
    );
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
        {/* Component Status Grid */}
        {Object.entries(status).map(([key, component]) => {
          if (key === 'overall') return null;
          
          return (
            <div key={key} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {getComponentIcon(key)}
                  {getStatusIcon(component.status)}
                  <span className="font-medium">{getComponentLabel(key)}</span>
                </div>
                {getStatusBadge(component.status)}
              </div>
              
              {component.status === 'error' && (
                <div className="ml-6 space-y-1">
                  <p className="text-sm text-red-700">{component.message}</p>
                  {component.details && (
                    <p className="text-xs text-red-600">{component.details}</p>
                  )}
                  {component.actionRequired && (
                    <p className="text-xs font-medium text-red-800 bg-red-50 p-2 rounded">
                      Action Required: {component.actionRequired}
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {hasErrors && (
          <Collapsible>
            <CollapsibleTrigger asChild>
              <Button variant="outline" size="sm" className="w-full">
                <ExternalLink className="h-4 w-4 mr-2" />
                Complete Setup Guide
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-3">
              <div className="space-y-3 text-sm bg-gray-50 p-3 rounded">
                <p className="font-medium">Complete Infrastructure Setup:</p>
                
                <div className="space-y-2">
                  <h4 className="font-medium text-gray-800">1. Database Setup</h4>
                  <p className="text-gray-700">Run the complete Nylas database migration:</p>
                  <code className="block bg-gray-100 p-2 rounded text-xs">
                    supabase/migrations/20241213000002_complete_nylas_infrastructure.sql
                  </code>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium text-gray-800">2. Edge Function Deployment</h4>
                  <p className="text-gray-700">Deploy the updated nylas-auth function:</p>
                  <code className="block bg-gray-100 p-2 rounded text-xs">
                    supabase functions deploy nylas-auth
                  </code>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium text-gray-800">3. Nylas Platform Setup</h4>
                  <ul className="list-disc list-inside text-gray-700 space-y-1">
                    <li>Create Nylas application in dashboard</li>
                    <li>Set up Google OAuth application</li>
                    <li>Configure redirect URI: https://ehr.valorwell.org/nylas-oauth-callback</li>
                    <li>Generate connector ID and add to Supabase secrets</li>
                  </ul>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium text-gray-800">4. Required Secrets</h4>
                  <ul className="list-disc list-inside text-gray-700 space-y-1">
                    <li>NYLAS_CLIENT_ID</li>
                    <li>NYLAS_CLIENT_SECRET</li>
                    <li>NYLAS_API_KEY</li>
                    <li>NYLAS_CONNECTOR_ID (optional initially)</li>
                    <li>NYLAS_REDIRECT_URI</li>
                  </ul>
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
