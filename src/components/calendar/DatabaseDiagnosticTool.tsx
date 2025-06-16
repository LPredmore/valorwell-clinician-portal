
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

const DatabaseDiagnosticTool = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const executeQuery = async () => {
    if (!query.trim()) {
      toast({
        title: "Error",
        description: "Please enter a query.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      // Parse the table name from the query (simple implementation)
      const tableMatch = query.match(/from\s+(\w+)/i);
      if (!tableMatch) {
        throw new Error('Could not parse table name from query');
      }

      const tableName = tableMatch[1];
      
      // List of valid table names from our schema
      const validTables = [
        'appointments', 'clients', 'clinicians', 'admins', 
        'availability_blocks', 'nylas_connections', 'nylas_calendars',
        'external_calendar_mappings', 'calendar_sync_logs'
      ];
      
      if (!validTables.includes(tableName)) {
        throw new Error(`Table '${tableName}' is not available for querying`);
      }
      
      // Execute a simple select query
      const { data, error } = await supabase
        .from(tableName as any)
        .select('*')
        .limit(10);

      if (error) {
        throw error;
      }

      setResults(data);
      toast({
        title: "Success",
        description: "Query executed successfully.",
      });
    } catch (error: any) {
      console.error('Query error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to execute query.",
        variant: "destructive",
      });
      setResults(null);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Database Diagnostic Tool</CardTitle>
        <CardDescription>
          Execute simple database queries for debugging
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label htmlFor="query" className="text-sm font-medium">
            Query (e.g., "select * from appointments")
          </label>
          <Textarea
            id="query"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Enter your query here..."
            rows={4}
          />
        </div>
        
        <Button onClick={executeQuery} disabled={isLoading}>
          {isLoading ? "Executing..." : "Execute Query"}
        </Button>

        {results && (
          <div>
            <h3 className="text-sm font-medium mb-2">Results:</h3>
            <pre className="bg-gray-100 p-4 rounded text-xs overflow-auto max-h-64">
              {JSON.stringify(results, null, 2)}
            </pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DatabaseDiagnosticTool;
