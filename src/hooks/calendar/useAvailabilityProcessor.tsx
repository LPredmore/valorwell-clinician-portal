import { useState, useEffect } from 'react';
import {
  ClinicianColumnData,
  ColumnBasedAvailability,
  ClinicianAvailabilitySlot,
  ColumnBasedTimeSlot,
  AvailabilityBlock
} from '@/types/availability';

interface AvailabilityProcessorResult {
  columnBasedAvailability: ColumnBasedAvailability | null;
  availabilityBlocks: AvailabilityBlock[];
  error: Error | null;
  isLoading: boolean;
}

export const useAvailabilityProcessor = (
  clinicianData: ClinicianColumnData | null,
  userTimeZone: string = 'America/Chicago'
): AvailabilityProcessorResult => {
  const [error, setError] = useState<Error | null>(null);

  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

  // Process availability data from column-based format
  const processAvailabilityData = (): ColumnBasedAvailability | null => {
    if (!clinicianData) return null;

    const slots: ClinicianAvailabilitySlot[] = [];
    
    try {
      days.forEach(day => {
        const daySlots: ColumnBasedTimeSlot[] = [];
        
        for (let slotNumber = 1; slotNumber <= 3; slotNumber++) {
          const startKey = `clinician_availability_start_${day}_${slotNumber}`;
          const endKey = `clinician_availability_end_${day}_${slotNumber}`;
          
          const startTime = clinicianData[startKey];
          const endTime = clinicianData[endKey];
          
          if (startTime && endTime) {
            daySlots.push({
              startTime,
              endTime,
              timezone: userTimeZone,
              slotNumber
            });
          }
        }
        
        if (daySlots.length > 0) {
          slots.push({
            day,
            slots: daySlots
          });
        }
      });

      return {
        clinicianId: clinicianData.id,
        timezone: userTimeZone,
        slots
      };
    } catch (error) {
      console.error('Error processing availability data:', error);
      return null;
    }
  };

  // Create AvailabilityBlock objects from column-based data
  const createAvailabilityBlocks = (): AvailabilityBlock[] => {
    const columnData = processAvailabilityData();
    if (!columnData) return [];

    const blocks: AvailabilityBlock[] = [];

    try {
      columnData.slots.forEach(daySlot => {
        daySlot.slots.forEach(slot => {
          const blockId = `${columnData.clinicianId}-${daySlot.day}-${slot.slotNumber}`;
          
          // Ensure start and end times are valid ISO strings
          const startAt = slot.startTime;
          const endAt = slot.endTime;
          
          if (startAt && endAt) {
            blocks.push({
              id: blockId,
              clinician_id: columnData.clinicianId,
              day_of_week: daySlot.day,
              start_at: startAt,
              end_at: endAt,
              is_active: true,
              is_deleted: false,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });
          } else {
            console.warn(`Skipping invalid availability slot: ${blockId}`);
          }
        });
      });
    } catch (error) {
      console.error('Error creating availability blocks:', error);
      setError(error as Error);
    }

    return blocks;
  };

  return {
    columnBasedAvailability: processAvailabilityData(),
    availabilityBlocks: createAvailabilityBlocks(),
    error,
    isLoading: false
  };
};
