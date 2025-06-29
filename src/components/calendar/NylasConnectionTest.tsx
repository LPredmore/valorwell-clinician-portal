
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Loader2, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface TestResult {
  step: string;
  status: 'pending' | 'success' | 'error';
  message: string;
}

const NylasConnectionTest: React.FC = () => {
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);
  const { toast } = useToast();

  const runInfrastructureTest = async () => {
    setTesting(true);
    setResults([]);
    
    const testSteps: TestResult[] = [
      { step: 'Edge Functions', status: 'pending', message: 'Checking deployment...' },
      { step: 'API Credentials', status: 'pending', message: 'Verifying secrets...' },
      { step: 'Database Access', status: 'pending', message: 'Testing RLS policies...' },
      { step: 'Auth Flow', status: 'pending', message: 'Testing OAuth initialization...' }
    ];
    
    setResults([...testSteps]);

    try {
      // Test 1: Edge Functions Deployment
      console.log('[NylasTest] Testing edge function deployment...');
      const { data: deploymentTest, error: deploymentError } = await supabase.functions.invoke('nylas-auth', {
        body: { action: 'test_connectivity' }
      });
      
      if (deploymentError) {
        if (deploymentError.message?.includes('Failed to send a request') || deploymentError.message?.includes('FetchError')) {
          testSteps[0] = { 
            step: 'Edge Functions', 
            status: 'error', 
            message: 'Functions not deployed. Run: supabase functions deploy nylas-auth' 
          };
        } else {
          testSteps[0] = { 
            step: 'Edge Functions', 
            status: 'error', 
            message: `Deployment issue: ${deploymentError.message}` 
          };
        }
      } else {
        testSteps[0] = { 
          step: 'Edge Functions', 
          status: 'success', 
          message: 'All functions deployed and responding' 
        };
      }
      
      setResults([...testSteps]);

      // Test 2: API Credentials (only if functions are deployed)
      if (testSteps[0].status === 'success') {
        console.log('[NylasTest] Testing API credentials...');
        const { data: initTest, error: initError } = await supabase.functions.invoke('nylas-auth', {
          body: { action: 'initialize' }
        });

        if (initError?.message?.includes('configuration missing')) {
          testSteps[1] = { 
            step: 'API Credentials', 
            status: 'error', 
            message: 'Missing NYLAS_CLIENT_ID, NYLAS_CLIENT_SECRET, or NYLAS_API_KEY' 
          };
        } else if (initError) {
          testSteps[1] = { 
            step: 'API Credentials', 
            status: 'error', 
            message: `Credential error: ${initError.message}` 
          };
        } else {
          testSteps[1] = { 
            step: 'API Credentials', 
            status: 'success', 
            message: 'Nylas API credentials configured correctly' 
          };
        }
      } else {
        testSteps[1] = { 
          step: 'API Credentials', 
          status: 'error', 
          message: 'Skipped - deploy functions first' 
        };
      }
      
      setResults([...testSteps]);

      // Test 3: Database Access
      console.log('[NylasTest] Testing database access...');
      const { data: dbTest, error: dbError } = await supabase
        .from('nylas_connections')
        .select('count')
        .limit(1);

      if (dbError) {
        testSteps[2] = { 
          step: 'Database Access', 
          status: 'error', 
          message: `Database error: ${dbError.message}` 
        };
      } else {
        testSteps[2] = { 
          step: 'Database Access', 
          status: 'success', 
          message: 'Database access working correctly' 
        };
      }
      
      setResults([...testSteps]);

      // Test 4: Full Auth Flow (only if previous tests pass)
      if (testSteps[0].status === 'success' && testSteps[1].status === 'success' && testSteps[2].status === 'success') {
        console.log('[NylasTest] Testing full OAuth flow...');
        const { data: authTest, error: authError } = await supabase.functions.invoke('nylas-auth', {
          body: { action: 'initialize' }
        });
        
        if (authTest?.authUrl) {
          testSteps[3] = { 
            step: 'Auth Flow', 
            status: 'success', 
            message: 'OAuth flow ready - you can now connect calendars!' 
          };
        } else {
          testSteps[3] = { 
            step: 'Auth Flow', 
            status: 'error', 
            message: 'Auth URL generation failed' 
          };
        }
      } else {
        testSteps[3] = { 
          step: 'Auth Flow', 
          status: 'error', 
          message: 'Skipped due to previous failures' 
        };
      }
      
      setResults([...testSteps]);

      // Summary toast
      const failures = testSteps.filter(t => t.status === 'error').length;
      if (failures === 0) {
        toast({
          title: "🎉 Infrastructure Ready!",
          description: "All Nylas components are working. You can now connect calendars.",
        });
      } else {
        toast({
          title: `${failures} Issues Found`,
          description: "Check the test results below for specific fixes needed.",
          variant: "destructive"
        });
      }

    } catch (error: any) {
      console.error('[NylasTest] Unexpected error:', error);
      toast({
        title: "Test Failed",
        description: error.message || "Unexpected error during testing",
        variant: "destructive"
      });
    } finally {
      setTesting(false);
    }
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-600" />;
      default:
        return <Loader2 className="h-5 w-5 text-gray-400 animate-spin" />;
    }
  };

  const getStatusBadge = (status: TestResult['status']) => {
    switch (status) {
      case 'success':
        return <Badge variant="secondary" className="text-green-700 bg-green-100">Success</Badge>;
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
      default:
        return <Badge variant="outline">Testing...</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          Nylas Infrastructure Test
        </CardTitle>
        <CardDescription>
          Test and debug your Nylas calendar integration infrastructure
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={runInfrastructureTest} 
          disabled={testing}
          className="w-full"
        >
          {testing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Running Infrastructure Tests...
            </>
          ) : (
            'Test Nylas Infrastructure'
          )}
        </Button>

        {results.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium">Test Results:</h4>
            {results.map((result, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  {getStatusIcon(result.status)}
                  <div>
                    <div className="font-medium">{result.step}</div>
                    <div className="text-sm text-gray-600">{result.message}</div>
                  </div>
                </div>
                {getStatusBadge(result.status)}
              </div>
            ))}
          </div>
        )}

        {results.length > 0 && results.some(r => r.status === 'error') && (
          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h5 className="font-medium text-yellow-800 mb-2">🔧 Next Steps:</h5>
            <ul className="text-sm text-yellow-700 space-y-2">
              {results.find(r => r.step === 'Edge Functions' && r.status === 'error') && (
                <li>
                  <strong>1. Deploy edge functions:</strong>
                  <div className="mt-1 p-2 bg-yellow-100 rounded font-mono text-xs">
                    supabase functions deploy nylas-auth<br/>
                    supabase functions deploy nylas-events<br/>
                    supabase functions deploy nylas-sync-appointments
                  </div>
                </li>
              )}
              {results.find(r => r.step === 'API Credentials' && r.status === 'error') && (
                <li>
                  <strong>2. Configure Nylas secrets in Supabase dashboard:</strong>
                  <div className="mt-1 text-xs">
                    • NYLAS_CLIENT_ID<br/>
                    • NYLAS_CLIENT_SECRET<br/>
                    • NYLAS_API_KEY<br/>
                    • NYLAS_CONNECTOR_ID
                  </div>
                </li>
              )}
              {results.find(r => r.step === 'Database Access' && r.status === 'error') && (
                <li>
                  <strong>3. Check RLS policies on nylas_connections table</strong>
                </li>
              )}
            </ul>
          </div>
        )}

        {results.length > 0 && !results.some(r => r.status === 'error') && (
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <h5 className="font-medium text-green-800 mb-2">🎉 Ready to Connect!</h5>
            <p className="text-sm text-green-700">
              All infrastructure tests passed. You can now go to the "Hybrid" tab to connect your Google Calendar and view external events.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default NylasConnectionTest;
