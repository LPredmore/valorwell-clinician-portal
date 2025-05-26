import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useWeekViewData } from '@/components/calendar/week-view/useWeekViewData';
import { DateTime } from 'luxon';
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react';

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

      // 2. Extract all availability data from clinician columns (OLD SYSTEM)
      const clinicianColumnData: any = {};
      const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
      
      days.forEach(day => {
        clinicianColumnData[day] = [];
        for (let slot = 1; slot <= 3; slot++) {
          const startKey = `clinician_availability_start_${day}_${slot}`;
          const endKey = `clinician_availability_end_${day}_${slot}`;
          const timezoneKey = `clinician_availability_timezone_${day}_${slot}`;
          
          const startTime = clinician[startKey];
          const endTime = clinician[endKey];
          const timezone = clinician[timezoneKey];
          
          if (startTime && endTime) {
            clinicianColumnData[day].push({
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

      console.log('[AvailabilityDebugger] Extracted clinician column data:', clinicianColumnData);

      // 3. Fetch from availability table (NEW SYSTEM)
      console.log('[AvailabilityDebugger] Step 3: Fetching from availability table');
      const { data: availabilityBlocks, error: availabilityError } = await supabase
        .from('availability')
        .select('*')
        .eq('clinician_id', clinician.id)
        .eq('is_active', true)
        .eq('is_deleted', false);

      if (availabilityError) {
        console.error('[AvailabilityDebugger] Availability table error:', availabilityError);
        throw availabilityError;
      }

      console.log('[AvailabilityDebugger] Found availability blocks:', availabilityBlocks?.length || 0);

      // 4. Fetch from availability_exceptions table
      console.log('[AvailabilityDebugger] Step 4: Fetching from availability_exceptions table');
      const { data: availabilityExceptions, error: exceptionsError } = await supabase
        .from('availability_exceptions')
        .select('*')
        .eq('clinician_id', clinician.id)
        .eq('is_active', true)
        .eq('is_deleted', false);

      if (exceptionsError) {
        console.error('[AvailabilityDebugger] Availability exceptions error:', exceptionsError);
        throw exceptionsError;
      }

      console.log('[AvailabilityDebugger] Found availability exceptions:', availabilityExceptions?.length || 0);

      // 5. Analyze day mapping
      const dayMappingAnalysis = weekDays.map((day, index) => {
        const jsDay = day.getDay(); // 0=Sunday, 1=Monday, etc.
        const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const dayName = dayNames[jsDay];
        const dayKey = day.toISOString().split('T')[0]; // yyyy-mm-dd format
        
        // Count availability in old system (clinician columns)
        const oldSystemSlots = clinicianColumnData[dayName]?.length || 0;
        
        // Count availability in new system (availability table)
        const newSystemBlocks = availabilityBlocks?.filter(block => block.day_of_week === dayName).length || 0;
        
        // Count exceptions for this specific date
        const exceptionsForDate = availabilityExceptions?.filter(exc => exc.specific_date === dayKey).length || 0;
        
        return {
          weekIndex: index,
          jsDay,
          dayName,
          dayKey,
          date: day.toLocaleDateString(),
          oldSystemSlots,
          newSystemBlocks,
          exceptionsForDate,
          hasOldData: oldSystemSlots > 0,
          hasNewData: newSystemBlocks > 0,
          hasExceptions: exceptionsForDate > 0
        };
      });

      console.log('[AvailabilityDebugger] Day mapping analysis:', dayMappingAnalysis);

      // 6. Check what the hook is processing
      const hookAvailability = Array.from(hookData.availabilityByDay.entries()).map(([dayKey, blocks]) => ({
        dayKey,
        blocksCount: blocks.length,
        blocks: blocks.map(block => ({
          start: block.start.toISO(),
          end: block.end.toISO(),
          isException: block.isException
        }))
      }));

      console.log('[AvailabilityDebugger] Hook processed availability:', hookAvailability);

      setDebugData({
        clinician,
        clinicianColumnData,
        availabilityBlocks,
        availabilityExceptions,
        dayMappingAnalysis,
        hookAvailability,
        weekDays,
        hookData: {
          loading: hookData.loading,
          error: hookData.error?.message,
          availabilityByDaySize: hookData.availabilityByDay.size,
          timeBlocksCount: hookData.timeBlocks.length
        },
        dataSourceComparison: {
          oldSystemTotal: Object.values(clinicianColumnData).reduce((sum: number, slots: any) => sum + slots.length, 0),
          newSystemTotal: availabilityBlocks?.length || 0,
          exceptionsTotal: availabilityExceptions?.length || 0,
          hookProcessedTotal: hookData.timeBlocks.length
        },
        verificationResults: {
          dataSourceFixed: (availabilityBlocks?.length || 0) > 0 && hookData.timeBlocks.length > 0,
          dataFlowWorking: hookData.timeBlocks.length === (availabilityBlocks?.length || 0),
          allDaysProcessed: hookData.availabilityByDay.size > 0,
          calendarReadyForDisplay: hookData.timeBlocks.length > 0 && !hookData.loading && !hookData.error
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
        <CardTitle>Comprehensive Availability Debugging Tool</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="text-sm">Clinician Email:</span>
          <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">{clinicianEmail}</span>
          <Button onClick={fetchDebugData} disabled={loading}>
            {loading ? 'Analyzing...' : 'Run Comprehensive Analysis'}
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

                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded">
                  <h3 className="font-medium mb-2">🚨 DATA SOURCE COMPARISON 🚨</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <h4 className="font-medium text-red-600">OLD SYSTEM (Clinician Columns)</h4>
                      <p>Total slots: <span className="font-bold">{debugData.dataSourceComparison?.oldSystemTotal || 0}</span></p>
                      <div className="mt-2">
                        {Object.entries(debugData.clinicianColumnData || {}).map(([day, slots]: [string, any]) => (
                          <div key={day} className="flex justify-between">
                            <span className="capitalize">{day}:</span>
                            <span className={slots.length > 0 ? 'text-red-600 font-medium' : 'text-gray-400'}>
                              {slots.length} slots
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium text-green-600">NEW SYSTEM (Availability Tables)</h4>
                      <p>Recurring blocks: <span className="font-bold">{debugData.dataSourceComparison?.newSystemTotal || 0}</span></p>
                      <p>Exception blocks: <span className="font-bold">{debugData.dataSourceComparison?.exceptionsTotal || 0}</span></p>
                      <p>Hook processed: <span className="font-bold">{debugData.dataSourceComparison?.hookProcessedTotal || 0}</span></p>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-green-50 border border-green-200 rounded">
                  <h3 className="font-medium mb-2">New System Data (Availability Table)</h3>
                  <div className="space-y-2 text-sm">
                    {debugData.availabilityBlocks?.length > 0 ? (
                      debugData.availabilityBlocks.map((block: any, index: number) => (
                        <div key={index} className="p-2 bg-white rounded border">
                          <div className="font-medium">{block.day_of_week}</div>
                          <div className="text-xs text-gray-600">
                            {block.start_at} - {block.end_at} | Active: {block.is_active ? 'Yes' : 'No'}
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-500">No blocks found in availability table</p>
                    )}
                  </div>
                </div>

                <div className="p-4 bg-purple-50 border border-purple-200 rounded">
                  <h3 className="font-medium mb-2">Day-by-Day Analysis</h3>
                  <div className="space-y-2 text-sm">
                    {debugData.dayMappingAnalysis?.map((analysis: any, index: number) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-white rounded border">
                        <div>
                          <span className="font-medium">{analysis.date}</span>
                          <span className="ml-2 text-gray-600">({analysis.dayName})</span>
                        </div>
                        <div className="text-right text-xs">
                          <div className="text-red-600">Old: {analysis.oldSystemSlots} slots</div>
                          <div className="text-green-600">New: {analysis.newSystemBlocks} blocks</div>
                          <div className="text-blue-600">Exceptions: {analysis.exceptionsForDate}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-4 bg-indigo-50 border border-indigo-200 rounded">
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
                          <div key={index} className="text-xs p-1 bg-white rounded">
                            <strong>{day.dayKey}:</strong> {day.blocksCount} blocks
                            {day.blocks.map((block: any, blockIndex: number) => (
                              <div key={blockIndex} className="ml-2 text-gray-600">
                                {new Date(block.start).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - 
                                {new Date(block.end).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                {block.isException ? ' (exception)' : ' (recurring)'}
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* NEW: Verification Results Panel */}
                {debugData.verificationResults && (
                  <div className="p-4 bg-green-50 border border-green-200 rounded">
                    <h3 className="font-medium mb-2 flex items-center gap-2">
                      🔍 FIX VERIFICATION RESULTS
                    </h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        {debugData.verificationResults.dataSourceFixed ? 
                          <CheckCircle className="h-4 w-4 text-green-600" /> : 
                          <XCircle className="h-4 w-4 text-red-600" />
                        }
                        <span className={debugData.verificationResults.dataSourceFixed ? 'text-green-700' : 'text-red-700'}>
                          Data Source Fix: {debugData.verificationResults.dataSourceFixed ? 'SUCCESS' : 'FAILED'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {debugData.verificationResults.dataFlowWorking ? 
                          <CheckCircle className="h-4 w-4 text-green-600" /> : 
                          <AlertCircle className="h-4 w-4 text-yellow-600" />
                        }
                        <span className={debugData.verificationResults.dataFlowWorking ? 'text-green-700' : 'text-yellow-700'}>
                          Data Flow: {debugData.verificationResults.dataFlowWorking ? 'PERFECT' : 'PARTIAL'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {debugData.verificationResults.allDaysProcessed ? 
                          <CheckCircle className="h-4 w-4 text-green-600" /> : 
                          <XCircle className="h-4 w-4 text-red-600" />
                        }
                        <span className={debugData.verificationResults.allDaysProcessed ? 'text-green-700' : 'text-red-700'}>
                          Days Processing: {debugData.verificationResults.allDaysProcessed ? 'SUCCESS' : 'FAILED'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {debugData.verificationResults.calendarReadyForDisplay ? 
                          <CheckCircle className="h-4 w-4 text-green-600" /> : 
                          <XCircle className="h-4 w-4 text-red-600" />
                        }
                        <span className={debugData.verificationResults.calendarReadyForDisplay ? 'text-green-700' : 'text-red-700'}>
                          Calendar Display Ready: {debugData.verificationResults.calendarReadyForDisplay ? 'YES' : 'NO'}
                        </span>
                      </div>
                    </div>
                    
                    {debugData.verificationResults.calendarReadyForDisplay && (
                      <div className="mt-3 p-2 bg-green-100 rounded">
                        <p className="text-green-800 font-medium">✅ FIX VERIFIED: Calendar should now display all availability correctly!</p>
                        <p className="text-green-700 text-sm mt-1">Navigate to the Calendar page to see your availability.</p>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AvailabilityDebugger;
