import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/calendar/Calendar';
import CalendarDataFlow from '@/debug/CalendarDataFlow';
import WeekViewDataTest from '@/debug/WeekViewDataTest';
import AvailabilityDebugger from '@/debug/AvailabilityDebugger';
import { useWeekViewData } from '@/components/calendar/week-view/useWeekViewData';
import { TimeZoneService } from '@/utils/timeZoneService';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar as CalendarIcon } from 'lucide-react';

const CalendarDebugPage: React.FC = () => {
  const navigate = useNavigate();
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
          <div className="flex items-center justify-between">
            <CardTitle>Calendar Debug & Verification</CardTitle>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => navigate('/calendar')}
                className="flex items-center gap-2"
              >
                <CalendarIcon size={16} />
                View Calendar
              </Button>
              <Button 
                variant="ghost" 
                onClick={() => navigate('/clinician-dashboard')}
                className="flex items-center gap-2"
              >
                <ArrowLeft size={16} />
                Back to Dashboard
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-3 bg-blue-50 border border-blue-200 rounded">
            <h3 className="font-medium text-blue-800 mb-2">🔧 Final Verification Steps:</h3>
            <ol className="text-sm text-blue-700 space-y-1">
              <li>1. Run "Comprehensive Analysis" below to verify the fix</li>
              <li>2. Check that verification results show all green checkmarks</li>
              <li>3. Click "View Calendar" above to see your availability display</li>
              <li>4. Verify all saved availability days are now visible</li>
            </ol>
          </div>

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
      
      {/* Enhanced Availability Debugging Tool */}
      <Card>
        <CardHeader>
          <CardTitle>🚀 PRIMARY VERIFICATION TOOL</CardTitle>
        </CardHeader>
        <CardContent>
          <AvailabilityDebugger clinicianEmail="info@valorwellfoundation.org" />
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
