import React, { useState } from 'react';
import Layout from '../components/layout/Layout';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import CalendarDataFlow from '@/debug/CalendarDataFlow';
import WeekViewDataTest from '@/debug/WeekViewDataTest';

const CalendarTestPage: React.FC = () => {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <Layout>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-semibold">Calendar Debugging and Testing</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Calendar Data Flow Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <CalendarDataFlow />
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Week View Data Test</CardTitle>
            </CardHeader>
            <CardContent>
              <WeekViewDataTest />
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default CalendarTestPage;
