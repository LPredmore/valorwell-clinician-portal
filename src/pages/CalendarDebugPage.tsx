import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/calendar/Calendar';
import { CalendarDataFlow } from '@/debug/CalendarDataFlow';
import { WeekViewDataTest } from '@/debug/WeekViewDataTest';
import { useWeekViewData } from '@/components/calendar/week-view/useWeekViewData';
import { TimeZoneService } from '@/utils/timeZoneService';

const CalendarDebugPage: React.FC = () => {
  const [selectedClinicianId, setSelectedClinicianId] = useState<string>('test-clinician-id');
  const [userTimeZone, setUserTimeZone] = useState<string>(TimeZoneService.DEFAULT_TIMEZONE);
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);
  const [weekDays, setWeekDays] = useState<Date[]>([]);
  
  useEffect(() => {
    const today = new Date();
    const weekDays = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(today);
      day.setDate(today.getDate() - today.getDay() + i);
      weekDays.push(day);
    }
    setWeekDays(weekDays);
  }, []);
  
  const hookData = useWeekViewData(
    weekDays,
    selectedClinicianId,
    refreshTrigger,
    [],
    userTimeZone
  );
  
  const handleRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };
  
  return (
    <div className="p-6 space-y-6">
      <Card className="p-4">
        <CardHeader>
          <CardTitle>Calendar Debug Page</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="clinicianId">Clinician ID</Label>
            <Input
              type="text"
              id="clinicianId"
              value={selectedClinicianId}
              onChange={(e) => setSelectedClinicianId(e.target.value)}
            />
          </div>
          
          <div>
            <Label htmlFor="timeZone">Time Zone</Label>
            <Input
              type="text"
              id="timeZone"
              value={userTimeZone}
              onChange={(e) => setUserTimeZone(e.target.value)}
            />
          </div>
          
          <Button onClick={handleRefresh}>Refresh</Button>
        </CardContent>
      </Card>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Calendar Component</CardTitle>
          </CardHeader>
          <CardContent>
            <Calendar
              days={weekDays}
              selectedClinicianId={selectedClinicianId}
              userTimeZone={userTimeZone}
              refreshTrigger={refreshTrigger}
            />
          </CardContent>
        </Card>
        
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
  );
};

export default CalendarDebugPage;
