
import { supabase } from '@/integrations/supabase/client';
import { BLOCKED_TIME_CLIENT_ID } from '@/utils/blockedTimeUtils';

// Secret type that prevents blocked time from appearing in user-facing queries
const SECRET_TYPE = 'INTERNAL_BLOCKED_TIME';

export class BlockedTimeService {
  private static instance: BlockedTimeService;
  
  public static getInstance(): BlockedTimeService {
    if (!BlockedTimeService.instance) {
      BlockedTimeService.instance = new BlockedTimeService();
    }
    return BlockedTimeService.instance;
  }

  // Create a blocked time slot using the secret type
  async createBlock(clinicianId: string, start: Date, end: Date, notes?: string) {
    try {
      const { data, error } = await supabase
        .from('appointments')
        .insert({
          clinician_id: clinicianId,
          client_id: BLOCKED_TIME_CLIENT_ID, // Temporary bridge during migration
          start_at: start.toISOString(),
          end_at: end.toISOString(),
          type: SECRET_TYPE,
          status: 'hidden',
          notes: notes || 'Blocked time slot'
        })
        .select();

      if (error) throw error;
      
      console.log('✅ Blocked time created with secret type:', SECRET_TYPE);
      return { success: true, data };
    } catch (error) {
      console.error('❌ Failed to create blocked time:', error);
      return { success: false, error };
    }
  }

  // Get blocked time slots for a clinician (internal use only)
  async getBlocks(clinicianId: string, startDate?: Date, endDate?: Date) {
    try {
      let query = supabase
        .from('appointments')
        .select('*')
        .eq('clinician_id', clinicianId)
        .eq('type', SECRET_TYPE);

      if (startDate) {
        query = query.gte('start_at', startDate.toISOString());
      }
      if (endDate) {
        query = query.lte('end_at', endDate.toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;

      return { success: true, data: data || [] };
    } catch (error) {
      console.error('❌ Failed to fetch blocked time:', error);
      return { success: false, error, data: [] };
    }
  }

  // Check if a time slot is blocked
  async isSlotBlocked(clinicianId: string, start: Date, end: Date): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('appointments')
        .select('id')
        .eq('clinician_id', clinicianId)
        .eq('type', SECRET_TYPE)
        .lte('start_at', start.toISOString())
        .gte('end_at', end.toISOString());

      if (error) throw error;
      return (data?.length || 0) > 0;
    } catch (error) {
      console.error('❌ Failed to check if slot is blocked:', error);
      return false;
    }
  }

  // Delete a blocked time slot
  async deleteBlock(blockId: string) {
    try {
      const { error } = await supabase
        .from('appointments')
        .delete()
        .eq('id', blockId)
        .eq('type', SECRET_TYPE); // Extra safety check

      if (error) throw error;
      
      console.log('✅ Blocked time deleted:', blockId);
      return { success: true };
    } catch (error) {
      console.error('❌ Failed to delete blocked time:', error);
      return { success: false, error };
    }
  }

  // Update appointment queries to exclude secret type
  static excludeSecretTypeFromQuery(query: any) {
    return query.neq('type', SECRET_TYPE);
  }

  // Get the secret type (for internal use)
  static getSecretType(): string {
    return SECRET_TYPE;
  }
}

// Export singleton instance
export const blockedTimeService = BlockedTimeService.getInstance();

// Utility functions for external use
export const isSlotAvailable = async (clinicianId: string, start: Date, end: Date): Promise<boolean> => {
  try {
    // Check for regular appointments
    const { data: appointments, error: apptError } = await supabase
      .from('appointments')
      .select('id')
      .eq('clinician_id', clinicianId)
      .neq('type', SECRET_TYPE) // Exclude secret blocked time
      .lte('start_at', start.toISOString())
      .gte('end_at', end.toISOString());

    if (apptError) throw apptError;

    // Check for blocked time
    const isBlocked = await blockedTimeService.isSlotBlocked(clinicianId, start, end);

    return (appointments?.length || 0) === 0 && !isBlocked;
  } catch (error) {
    console.error('❌ Failed to check slot availability:', error);
    return false;
  }
};
