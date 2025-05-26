
import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useWeekViewData } from '@/components/calendar/week-view/useWeekViewData';
import { DateTime } from 'luxon';

interface AvailabilityDebuggerProps {
  clinicianEmail?: string;
}

const AvailabilityDebugger: React.FC<AvailabilityDebuggerProps> = ({
  clinicianEmail = 'info@valorwellfoundation.org'
}) => {
  const [debugData, setDebugData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [weekDays, setWeekDays] = useState<Date[]>([]);

  // Initialize week days
  useEffect(() => {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    
    const days = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      days.push(day);
    }
    setWeekDays(days);
  }, []);

  // Get hook data for comparison
  const hookData = useWeekViewData(
    weekDays.length > 0 ? weekDays : [new Date()],
    debugData?.clinician?.id || null,
    0,
    [],
    'America/Chicago'
  );

  const fetchDebugData = async () => {
    setLoading(true);
    console.log('[AvailabilityDebugger] Starting comprehensive debug analysis...');

    try {
      // 1. Find clinician by email
      console.log('[AvailabilityDebugger] Step 1: Finding clinician by email:', clinicianEmail);
      const { data: clinician, error: clinicianError } = await supabase
        .from('clinicians')
        .select('*')
        .eq('clinician_email', clinicianEmail)
        .single();

      if (clinicianError) {
        console.error('[AvailabilityDebugger] Clinician query error:', clinicianError);
        throw clinicianError;
      }

      console.log('[AvailabilityDebugger] Found clinician:', {
        id: clinician.id,
        email: clinician.clinician_email,
        timezone: clinician.clinician_time_zone
      });

      // 2. Extract all availability data from clinician columns
      const availabilityData: any = {};
      const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
      
      days.forEach(day => {
        availabilityData[day] = [];
        for (let slot = 1; slot <= 3; slot++) {
          const startKey = `clinician_availability_start_${day}_${slot}`;
          const endKey = `clinician_availability_end_${day}_${slot}`;
          const timezoneKey = `clinician_availability_timezone_${day}_${slot}`;
          
          const startTime = clinician[startKey];
          const endTime = clinician[endKey];
          const timezone = clinician[timezoneKey];
          
          if (startTime && endTime) {
            availabilityData[day].push({
              slot,
              startTime,
              endTime,
              timezone: timezone || 'America/Chicago',
              startKey,
              endKey,
              timezoneKey
            });
          }
        }
      });

      console.log('[AvailabilityDebugger] Extracted availability data:', availabilityData);

      // 3. Analyze day mapping
      const dayMappingAnalysis = weekDays.map((day, index) => {
        const jsDay = day.getDay(); // 0=Sunday, 1=Monday, etc.
        const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const dayName = dayNames[jsDay];
        const dayKey = day.toISOString().split('T')[0]; // yyyy-mm-dd format
        
        return {
          weekIndex: index,
          jsDay,
          dayName,
          dayKey,
          date: day.toLocaleDateString(),
          availabilitySlots: availabilityData[dayName]?.length || 0,
          hasAvailability: (availabilityData[dayName]?.length || 0) > 0
        };
      });

      console.log('[AvailabilityDebugger] Day mapping analysis:', dayMappingAnalysis);

      // 4. Check what the hook is processing
      const hookAvailability = Array.from(hookData.availabilityByDay.entries()).map(([dayKey, blocks]) => ({
        dayKey,
        blocksCount: blocks.length,
        blocks: blocks.map(block => ({
          start: block.start.toISO(),
          end: block.end.toISO()
        }))
      }));

      console.log('[AvailabilityDebugger] Hook processed availability:', hookAvailability);

      setDebugData({
        clinician,
        availabilityData,
        dayMappingAnalysis,
        hookAvailability,
        weekDays,
        hookData: {
          loading: hookData.loading,
          error: hookData.error?.message,
          availabilityByDaySize: hookData.availabilityByDay.size,
          timeBlocksCount: hookData.timeBlocks.length
        }
      });

    } catch (error) {
      console.error('[AvailabilityDebugger] Debug analysis failed:', error);
      setDebugData({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Availability Debugging Tool</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="text-sm">Clinician Email:</span>
          <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">{clinicianEmail}</span>
          <Button onClick={fetchDebugData} disabled={loading}>
            {loading ? 'Analyzing...' : 'Run Debug Analysis'}
          </Button>
        </div>

        {debugData && (
          <div className="space-y-4">
            {debugData.error ? (
              <div className="p-4 bg-red-100 border border-red-300 rounded">
                <h3 className="font-medium text-red-800">Error</h3>
                <p className="text-red-600">{debugData.error}</p>
              </div>
            ) : (
              <>
                <div className="p-4 bg-blue-50 border border-blue-200 rounded">
                  <h3 className="font-medium mb-2">Clinician Info</h3>
                  <div className="text-sm space-y-1">
                    <p><strong>ID:</strong> {debugData.clinician?.id}</p>
                    <p><strong>Email:</strong> {debugData.clinician?.clinician_email}</p>
                    <p><strong>Timezone:</strong> {debugData.clinician?.clinician_time_zone}</p>
                  </div>
                </div>

                <div className="p-4 bg-green-50 border border-green-200 rounded">
                  <h3 className="font-medium mb-2">Saved Availability Summary</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {Object.entries(debugData.availabilityData || {}).map(([day, slots]: [string, any]) => (
                      <div key={day} className="flex justify-between">
                        <span className="capitalize">{day}:</span>
                        <span className={slots.length > 0 ? 'text-green-600 font-medium' : 'text-gray-400'}>
                          {slots.length} slots
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded">
                  <h3 className="font-medium mb-2">Day Mapping Analysis</h3>
                  <div className="space-y-2 text-sm">
                    {debugData.dayMappingAnalysis?.map((analysis: any, index: number) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-white rounded border">
                        <div>
                          <span className="font-medium">{analysis.date}</span>
                          <span className="ml-2 text-gray-600">({analysis.dayName})</span>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-gray-500">
                            Week Index: {analysis.weekIndex}, JS Day: {analysis.jsDay}
                          </div>
                          <div className={analysis.hasAvailability ? 'text-green-600' : 'text-red-600'}>
                            {analysis.availabilitySlots} slots saved
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-4 bg-purple-50 border border-purple-200 rounded">
                  <h3 className="font-medium mb-2">Hook Processing Results</h3>
                  <div className="text-sm space-y-2">
                    <div className="flex justify-between">
                      <span>Loading:</span>
                      <span>{debugData.hookData?.loading ? 'Yes' : 'No'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Error:</span>
                      <span>{debugData.hookData?.error || 'None'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Days with availability:</span>
                      <span>{debugData.hookData?.availabilityByDaySize || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total time blocks:</span>
                      <span>{debugData.hookData?.timeBlocksCount || 0}</span>
                    </div>
                  </div>

                  {debugData.hookAvailability && debugData.hookAvailability.length > 0 && (
                    <div className="mt-3">
                      <h4 className="font-medium mb-1">Processed Days:</h4>
                      <div className="space-y-1">
                        {debugData.hookAvailability.map((day: any, index: number) => (
                          <div key={index} className="text-xs">
                            <strong>{day.dayKey}:</strong> {day.blocksCount} blocks
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AvailabilityDebugger;
