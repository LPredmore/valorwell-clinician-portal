
import { supabase } from '@/integrations/supabase/client';
import { DateTime } from 'luxon';

export interface AvailabilitySlot {
  id: string;
  day_of_week: string;
  start_time: string;
  end_time: string;
  timezone: string;
  slot_number: number;
  specific_date: string;
  utc_start_time: string;
  utc_end_time: string;
}

export interface RecurringAvailability {
  day_of_week: string;
  slots: {
    slot_number: number;
    start_time: string;
    end_time: string;
    timezone: string;
  }[];
}

export class AvailabilityService {
  /**
   * Get availability instances for a clinician within a date range
   */
  static async getAvailabilityInstances(
    clinicianId: string,
    startDate: Date,
    endDate: Date,
    userTimezone: string = 'America/New_York'
  ): Promise<AvailabilitySlot[]> {
    try {
      const { data, error } = await supabase.rpc('get_clinician_availability_instances', {
        p_clinician_id: clinicianId,
        p_start_date: startDate.toISOString().split('T')[0],
        p_end_date: endDate.toISOString().split('T')[0],
        p_user_timezone: userTimezone
      });

      if (error) throw error;

      return data.map((slot: any) => ({
        id: `${clinicianId}-${slot.specific_date}-${slot.slot_number}`,
        day_of_week: slot.day_of_week,
        start_time: slot.start_time,
        end_time: slot.end_time,
        timezone: slot.timezone,
        slot_number: slot.slot_number,
        specific_date: slot.specific_date,
        utc_start_time: slot.utc_start_time,
        utc_end_time: slot.utc_end_time
      }));
    } catch (error) {
      console.error('Error fetching availability instances:', error);
      throw error;
    }
  }

  /**
   * Get recurring availability pattern for a clinician
   */
  static async getRecurringAvailability(clinicianId: string): Promise<RecurringAvailability[]> {
    try {
      const { data: clinician, error } = await supabase
        .from('clinicians')
        .select('*')
        .eq('id', clinicianId)
        .single();

      if (error) throw error;

      const daysOfWeek = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
      const availability: RecurringAvailability[] = [];

      daysOfWeek.forEach(day => {
        const slots = [];
        
        for (let slotNum = 1; slotNum <= 3; slotNum++) {
          const startKey = `clinician_availability_start_${day}_${slotNum}`;
          const endKey = `clinician_availability_end_${day}_${slotNum}`;
          const timezoneKey = `clinician_availability_timezone_${day}_${slotNum}`;

          if (clinician[startKey] && clinician[endKey]) {
            slots.push({
              slot_number: slotNum,
              start_time: clinician[startKey],
              end_time: clinician[endKey],
              timezone: clinician[timezoneKey] || 'America/Chicago'
            });
          }
        }

        if (slots.length > 0) {
          availability.push({
            day_of_week: day,
            slots
          });
        }
      });

      return availability;
    } catch (error) {
      console.error('Error fetching recurring availability:', error);
      throw error;
    }
  }

  /**
   * Update recurring availability for a specific day and slot
   */
  static async updateRecurringAvailability(
    clinicianId: string,
    dayOfWeek: string,
    slotNumber: number,
    startTime: string,
    endTime: string,
    timezone: string
  ): Promise<void> {
    try {
      const startKey = `clinician_availability_start_${dayOfWeek}_${slotNumber}`;
      const endKey = `clinician_availability_end_${dayOfWeek}_${slotNumber}`;
      const timezoneKey = `clinician_availability_timezone_${dayOfWeek}_${slotNumber}`;

      const updateData = {
        [startKey]: startTime,
        [endKey]: endTime,
        [timezoneKey]: timezone
      };

      const { error } = await supabase
        .from('clinicians')
        .update(updateData)
        .eq('id', clinicianId);

      if (error) throw error;

      // Mark for sync with Nylas
      await this.markForNylasSync(clinicianId, dayOfWeek, slotNumber);
    } catch (error) {
      console.error('Error updating recurring availability:', error);
      throw error;
    }
  }

  /**
   * Remove recurring availability for a specific day and slot
   */
  static async removeRecurringAvailability(
    clinicianId: string,
    dayOfWeek: string,
    slotNumber: number
  ): Promise<void> {
    try {
      const startKey = `clinician_availability_start_${dayOfWeek}_${slotNumber}`;
      const endKey = `clinician_availability_end_${dayOfWeek}_${slotNumber}`;
      const timezoneKey = `clinician_availability_timezone_${dayOfWeek}_${slotNumber}`;

      const updateData = {
        [startKey]: null,
        [endKey]: null,
        [timezoneKey]: null
      };

      const { error } = await supabase
        .from('clinicians')
        .update(updateData)
        .eq('id', clinicianId);

      if (error) throw error;

      // Mark for sync with Nylas (to remove from external calendar)
      await this.markForNylasSync(clinicianId, dayOfWeek, slotNumber, 'pending_removal');
    } catch (error) {
      console.error('Error removing recurring availability:', error);
      throw error;
    }
  }

  /**
   * Convert availability slot to user's timezone using Luxon
   */
  static convertToUserTimezone(
    slot: AvailabilitySlot,
    userTimezone: string
  ): {
    start: DateTime;
    end: DateTime;
    displayStart: string;
    displayEnd: string;
  } {
    const start = DateTime.fromISO(slot.utc_start_time).setZone(userTimezone);
    const end = DateTime.fromISO(slot.utc_end_time).setZone(userTimezone);

    return {
      start,
      end,
      displayStart: start.toFormat('h:mm a'),
      displayEnd: end.toFormat('h:mm a')
    };
  }

  /**
   * Mark availability slot for Nylas synchronization
   */
  private static async markForNylasSync(
    clinicianId: string,
    dayOfWeek: string,
    slotNumber: number,
    status: string = 'pending'
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('availability_sync_status')
        .upsert({
          clinician_id: clinicianId,
          day_of_week: dayOfWeek,
          slot_number: slotNumber,
          sync_status: status,
          last_synced_at: new Date().toISOString()
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error marking for Nylas sync:', error);
      // Don't throw here - sync marking shouldn't block the main operation
    }
  }

  /**
   * Get sync status for availability slots
   */
  static async getSyncStatus(clinicianId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('availability_sync_status')
        .select('*')
        .eq('clinician_id', clinicianId);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching sync status:', error);
      return [];
    }
  }
}
