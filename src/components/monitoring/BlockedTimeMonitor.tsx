
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle, Info, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface IntegrityCheck {
  check_type: string;
  status: string;
  count: number;
  message: string;
}

const BlockedTimeMonitor: React.FC = () => {
  const [checks, setChecks] = useState<IntegrityCheck[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const { toast } = useToast();

  const runIntegrityCheck = async () => {
    setIsLoading(true);
    try {
      console.log('🔍 Running blocked time integrity check...');
      
      const { data, error } = await supabase
        .rpc('check_blocked_time_integrity');

      if (error) {
        console.error('❌ Integrity check failed:', error);
        throw error;
      }

      console.log('✅ Integrity check completed:', data);
      setChecks(data || []);
      setLastChecked(new Date());

      // Check for any failures
      const failures = data?.filter(check => check.status === 'FAIL') || [];
      if (failures.length > 0) {
        toast({
          title: "Security Alert",
          description: `${failures.length} integrity check(s) failed. Please review.`,
          variant: "destructive"
        });
      } else {
        toast({
          title: "Security Check Passed",
          description: "All blocked time integrity checks passed.",
        });
      }
    } catch (error: any) {
      console.error('❌ Error running integrity check:', error);
      toast({
        title: "Check Failed",
        description: error.message || "Failed to run integrity check",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-run check on mount
  useEffect(() => {
    runIntegrityCheck();
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PASS':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'FAIL':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'WARN':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default:
        return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variant = status === 'PASS' ? 'default' : 
                   status === 'FAIL' ? 'destructive' : 
                   status === 'WARN' ? 'secondary' : 'outline';

    return (
      <Badge variant={variant} className="ml-2">
        {status}
      </Badge>
    );
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center">
            🛡️ Blocked Time Security Monitor
          </span>
          <Button
            onClick={runIntegrityCheck}
            disabled={isLoading}
            size="sm"
            variant="outline"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            {isLoading ? 'Checking...' : 'Run Check'}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {lastChecked && (
          <div className="text-sm text-gray-500">
            Last checked: {lastChecked.toLocaleString()}
          </div>
        )}

        {checks.length === 0 && !isLoading && (
          <div className="text-center py-8 text-gray-500">
            No integrity checks have been run yet.
          </div>
        )}

        {checks.map((check, index) => (
          <div
            key={index}
            className="flex items-start justify-between p-4 border rounded-lg"
          >
            <div className="flex items-start space-x-3">
              {getStatusIcon(check.status)}
              <div className="flex-1">
                <div className="flex items-center">
                  <h4 className="font-medium capitalize">
                    {check.check_type.replace(/_/g, ' ')}
                  </h4>
                  {getStatusBadge(check.status)}
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  {check.message}
                </p>
                {check.count !== undefined && (
                  <div className="text-xs text-gray-500 mt-1">
                    Count: {check.count}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}

        <div className="border-t pt-4 mt-6">
          <h5 className="font-medium mb-2">Security Status Summary</h5>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-green-600">
                {checks.filter(c => c.status === 'PASS').length}
              </div>
              <div className="text-sm text-gray-500">Passed</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-yellow-600">
                {checks.filter(c => c.status === 'WARN').length}
              </div>
              <div className="text-sm text-gray-500">Warnings</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-red-600">
                {checks.filter(c => c.status === 'FAIL').length}
              </div>
              <div className="text-sm text-gray-500">Failed</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default BlockedTimeMonitor;
