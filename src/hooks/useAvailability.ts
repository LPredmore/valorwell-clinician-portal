
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { eachDayOfInterval, format } from 'date-fns';

const DAYS_BY_INDEX = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export interface ProcessedAvailability {
    id: string;
    date: Date;
    start_time: string;
    end_time: string;
    isException: boolean;
    day_of_week: string;
}

async function getAvailability(clinicianId: string, startDate: Date, endDate: Date): Promise<ProcessedAvailability[]> {
    if (!clinicianId) return [];

    const { data: clinicianData, error: clinicianError } = await supabase
        .from('clinicians')
        .select('*')
        .eq('id', clinicianId)
        .single();

    if (clinicianError) {
        console.error('Error fetching clinician availability:', clinicianError);
        throw clinicianError;
    }

    const { data: exceptions, error: exceptionsError } = await supabase
        .from('availability_exceptions')
        .select('*')
        .eq('clinician_id', clinicianId)
        .gte('specific_date', format(startDate, 'yyyy-MM-dd'))
        .lte('specific_date', format(endDate, 'yyyy-MM-dd'));

    if (exceptionsError) {
        console.error('Error fetching availability exceptions:', exceptionsError);
        throw exceptionsError;
    }

    const availabilityMap = new Map<string, ProcessedAvailability[]>();
    const days = eachDayOfInterval({ start: startDate, end: endDate });

    // 1. Populate with recurring availability
    days.forEach(day => {
        const dayOfWeekIndex = day.getDay();
        const dayOfWeekName = DAYS_BY_INDEX[dayOfWeekIndex];
        const dateKey = format(day, 'yyyy-MM-dd');
        const daySlots: ProcessedAvailability[] = [];

        for (let slotNum = 1; slotNum <= 3; slotNum++) {
            const startTimeKey = `clinician_availability_start_${dayOfWeekName.toLowerCase()}_${slotNum}`;
            const endTimeKey = `clinician_availability_end_${dayOfWeekName.toLowerCase()}_${slotNum}`;

            if (clinicianData[startTimeKey] && clinicianData[endTimeKey]) {
                daySlots.push({
                    id: `${dateKey}-${slotNum}`,
                    date: day,
                    start_time: clinicianData[startTimeKey],
                    end_time: clinicianData[endTimeKey],
                    isException: false,
                    day_of_week: dayOfWeekName
                });
            }
        }
        availabilityMap.set(dateKey, daySlots);
    });

    // 2. Override with exceptions
    const exceptionGroups = (exceptions || []).reduce((acc, ex) => {
        (acc[ex.specific_date] = acc[ex.specific_date] || []).push(ex);
        return acc;
    }, {} as Record<string, any[]>);

    for (const dateKey in exceptionGroups) {
        const dayExceptions = exceptionGroups[dateKey];
        const daySlots: ProcessedAvailability[] = [];
        
        dayExceptions.forEach(e => {
            if (!e.is_deleted) {
                daySlots.push({
                    id: e.id,
                    date: new Date(e.specific_date.replace(/-/g, '/')),
                    start_time: e.start_time,
                    end_time: e.end_time,
                    isException: true,
                    day_of_week: DAYS_BY_INDEX[new Date(e.specific_date.replace(/-/g, '/')).getDay()]
                });
            }
        });
        availabilityMap.set(dateKey, daySlots);
    }
    
    const finalAvailability: ProcessedAvailability[] = [];
    availabilityMap.forEach(slots => finalAvailability.push(...slots));

    return finalAvailability;
}

export const useAvailability = (clinicianId: string | null, startDate: Date, endDate: Date, refreshTrigger: number) => {
    return useQuery({
        queryKey: ['availability', clinicianId, format(startDate, 'yyyy-MM-dd'), refreshTrigger],
        queryFn: () => getAvailability(clinicianId!, startDate, endDate),
        enabled: !!clinicianId,
    });
};
