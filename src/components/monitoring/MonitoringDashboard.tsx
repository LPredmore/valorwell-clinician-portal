
import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import BlockedTimeMonitor from './BlockedTimeMonitor';
import LeakTestResults from './LeakTestResults';
import SystemStatusDashboard from './SystemStatusDashboard';

const MonitoringDashboard: React.FC = () => {
  return (
    <div className="w-full max-w-6xl mx-auto p-6 space-y-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">🛡️ Blocked Time Security Dashboard</h1>
        <p className="text-gray-600">
          Phase 2 Migration Complete - Pure INTERNAL_BLOCKED_TIME Architecture
        </p>
      </div>

      <Tabs defaultValue="system-status" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="system-status">System Status</TabsTrigger>
          <TabsTrigger value="monitoring">Real-time Monitoring</TabsTrigger>
          <TabsTrigger value="leak-tests">Leak Test Results</TabsTrigger>
        </TabsList>

        <TabsContent value="system-status" className="space-y-6">
          <SystemStatusDashboard />
        </TabsContent>

        <TabsContent value="monitoring" className="space-y-6">
          <BlockedTimeMonitor />
        </TabsContent>

        <TabsContent value="leak-tests" className="space-y-6">
          <LeakTestResults />
        </TabsContent>
      </Tabs>

      <div className="border-t pt-6 mt-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
          <div className="p-4 bg-green-50 rounded-lg">
            <h3 className="font-semibold text-green-800">Migration Status</h3>
            <p className="text-sm text-green-600 mt-1">Phase 2 Complete ✅</p>
          </div>
          <div className="p-4 bg-blue-50 rounded-lg">
            <h3 className="font-semibold text-blue-800">Architecture</h3>
            <p className="text-sm text-blue-600 mt-1">Pure INTERNAL_BLOCKED_TIME</p>
          </div>
          <div className="p-4 bg-purple-50 rounded-lg">
            <h3 className="font-semibold text-purple-800">Security</h3>
            <p className="text-sm text-purple-600 mt-1">Auto-Healing Active</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MonitoringDashboard;
