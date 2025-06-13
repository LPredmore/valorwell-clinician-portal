
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Database, CheckCircle, XCircle, AlertTriangle, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface TableDiagnostic {
  name: string;
  exists: boolean;
  accessible: boolean;
  error?: string;
  recordCount?: number;
}

const DatabaseDiagnosticTool: React.FC = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [diagnostics, setDiagnostics] = useState<TableDiagnostic[]>([]);
  const { toast } = useToast();

  const requiredTables = [
    'nylas_connections',
    'nylas_scheduler_configs',
    'external_calendar_mappings',
    'calendar_sync_logs'
  ];

  const runDiagnostics = async () => {
    setIsRunning(true);
    const results: TableDiagnostic[] = [];

    for (const tableName of requiredTables) {
      console.log(`[DatabaseDiagnostic] Testing table: ${tableName}`);
      
      try {
        // Test if table exists and is accessible
        const { data, error, count } = await supabase
          .from(tableName)
          .select('*', { count: 'exact', head: true });

        if (error) {
          console.error(`[DatabaseDiagnostic] Error accessing ${tableName}:`, error);
          
          if (error.code === 'PGRST116' || error.message?.includes('does not exist')) {
            results.push({
              name: tableName,
              exists: false,
              accessible: false,
              error: 'Table does not exist'
            });
          } else if (error.code === 'PGRST301' || error.message?.includes('permission denied')) {
            results.push({
              name: tableName,
              exists: true,
              accessible: false,
              error: 'Permission denied (RLS policy issue)'
            });
          } else {
            results.push({
              name: tableName,
              exists: true,
              accessible: false,
              error: error.message
            });
          }
        } else {
          results.push({
            name: tableName,
            exists: true,
            accessible: true,
            recordCount: count || 0
          });
        }
      } catch (error: any) {
        console.error(`[DatabaseDiagnostic] Exception testing ${tableName}:`, error);
        results.push({
          name: tableName,
          exists: false,
          accessible: false,
          error: error.message
        });
      }
    }

    setDiagnostics(results);
    setIsRunning(false);

    const allGood = results.every(r => r.exists && r.accessible);
    if (allGood) {
      toast({
        title: "Database Diagnostics Complete",
        description: "All Nylas tables are properly configured",
        variant: "default"
      });
    } else {
      toast({
        title: "Database Issues Found",
        description: "Some Nylas tables need attention",
        variant: "destructive"
      });
    }
  };

  const getStatusIcon = (table: TableDiagnostic) => {
    if (!table.exists) {
      return <XCircle className="h-4 w-4 text-red-600" />;
    } else if (!table.accessible) {
      return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
    } else {
      return <CheckCircle className="h-4 w-4 text-green-600" />;
    }
  };

  const getStatusBadge = (table: TableDiagnostic) => {
    if (!table.exists) {
      return <Badge variant="destructive">Missing</Badge>;
    } else if (!table.accessible) {
      return <Badge variant="outline" className="text-yellow-700 border-yellow-300">Access Denied</Badge>;
    } else {
      return <Badge variant="secondary" className="text-green-700 bg-green-100">Ready</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Database Diagnostics
        </CardTitle>
        <CardDescription>
          Test Nylas database tables and permissions
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={runDiagnostics} 
          disabled={isRunning}
          className="w-full"
        >
          {isRunning ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Running Diagnostics...
            </>
          ) : (
            <>
              <Database className="mr-2 h-4 w-4" />
              Run Database Test
            </>
          )}
        </Button>

        {diagnostics.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium">Test Results:</h4>
            {diagnostics.map((table) => (
              <div key={table.name} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(table)}
                    <span className="font-medium">{table.name}</span>
                  </div>
                  {getStatusBadge(table)}
                </div>
                
                {table.exists && table.accessible && (
                  <div className="ml-6 text-sm text-gray-600">
                    Records: {table.recordCount}
                  </div>
                )}
                
                {table.error && (
                  <div className="ml-6 text-sm text-red-700 bg-red-50 p-2 rounded">
                    {table.error}
                  </div>
                )}
              </div>
            ))}
            
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
              <p className="text-sm text-blue-800">
                <strong>Next Steps:</strong> If tables are missing, run the database migration. 
                If access is denied, check RLS policies.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DatabaseDiagnosticTool;
