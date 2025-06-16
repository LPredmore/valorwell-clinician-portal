
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { Calendar as CalendarIcon, Settings, Database } from 'lucide-react';
import NylasHybridCalendar from '@/components/calendar/NylasHybridCalendar';
import ClinicianAvailabilityPanel from '@/components/calendar/ClinicianAvailabilityPanel';
import CalendarConnectionsPanel from '@/components/calendar/CalendarConnectionsPanel';
import InfrastructureStatusPanel from '@/components/calendar/InfrastructureStatusPanel';
import DatabaseDiagnosticTool from '@/components/calendar/DatabaseDiagnosticTool';
import { supabase } from '@/integrations/supabase/client';

const Calendar = () => {
  const { toast } = useToast();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userTimeZone, setUserTimeZone] = useState<string>('America/New_York');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Get clinician info
        const { data: clinician, error } = await supabase
          .from('clinicians')
          .select('*')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('Error fetching clinician:', error);
          return;
        }

        setCurrentUser(clinician);
        setUserTimeZone(clinician.clinician_time_zone || 'America/New_York');
      } catch (error) {
        console.error('Error in fetchCurrentUser:', error);
      }
    };

    fetchCurrentUser();
  }, []);

  const handleAvailabilityUpdated = () => {
    setRefreshTrigger(prev => prev + 1);
    toast({
      title: "Availability Updated",
      description: "Your availability has been updated successfully.",
    });
  };

  if (!currentUser) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p>Loading calendar...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <CalendarIcon className="h-8 w-8" />
            Calendar
          </h1>
          <p className="text-gray-600 mt-1">
            Manage your appointments and availability
          </p>
        </div>
      </div>

      <Tabs defaultValue="calendar" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
          <TabsTrigger value="availability">Availability</TabsTrigger>
          <TabsTrigger value="connections">Connections</TabsTrigger>
          <TabsTrigger value="infrastructure">Infrastructure</TabsTrigger>
          <TabsTrigger value="diagnostics">Diagnostics</TabsTrigger>
        </TabsList>

        <TabsContent value="calendar" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Your Calendar</CardTitle>
              <CardDescription>
                View and manage your appointments
              </CardDescription>
            </CardHeader>
            <CardContent>
              <NylasHybridCalendar 
                key={refreshTrigger}
                clinicianId={currentUser.id}
                userTimeZone={userTimeZone}
                currentDate={currentDate}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="availability" className="space-y-6">
          <ClinicianAvailabilityPanel />
        </TabsContent>

        <TabsContent value="connections" className="space-y-6">
          <CalendarConnectionsPanel />
        </TabsContent>

        <TabsContent value="infrastructure" className="space-y-6">
          <InfrastructureStatusPanel />
        </TabsContent>

        <TabsContent value="diagnostics" className="space-y-6">
          <DatabaseDiagnosticTool />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Calendar;
