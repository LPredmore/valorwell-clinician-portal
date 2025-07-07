import { supabase } from '@/integrations/supabase/client';
import { videoRoomService } from './videoRoomService';

interface MigrationResult {
  totalAppointments: number;
  processedAppointments: number;
  successfulCreations: number;
  failedCreations: number;
  alreadyHadRooms: number;
  errors: Array<{ appointmentId: string; error: any }>;
}

interface MigrationProgress {
  total: number;
  processed: number;
  successful: number;
  failed: number;
  currentBatch: number;
  isComplete: boolean;
  errors: Array<{ appointmentId: string; error: any }>;
}

class VideoRoomMigration {
  private readonly BATCH_SIZE = 10;
  private isRunning = false;

  /**
   * Get appointments that need video rooms
   */
  async getAppointmentsNeedingVideoRooms(): Promise<{
    total: number;
    appointments: Array<{ id: string; client_id: string; start_at: string }>;
  }> {
    try {
      console.log('[VideoRoomMigration] Fetching appointments that need video rooms...');
      
      const { data: appointments, error } = await supabase
        .from('appointments')
        .select('id, client_id, start_at, video_room_url')
        .in('status', ['scheduled', 'completed'])
        .is('video_room_url', null)
        .order('start_at', { ascending: false });

      if (error) {
        console.error('[VideoRoomMigration] Error fetching appointments:', error);
        throw error;
      }

      const appointmentsNeedingRooms = (appointments || []).map(apt => ({
        id: apt.id,
        client_id: apt.client_id,
        start_at: apt.start_at
      }));

      console.log('[VideoRoomMigration] Found appointments needing video rooms:', appointmentsNeedingRooms.length);
      
      return {
        total: appointmentsNeedingRooms.length,
        appointments: appointmentsNeedingRooms
      };

    } catch (error) {
      console.error('[VideoRoomMigration] Error getting appointments needing video rooms:', error);
      throw error;
    }
  }

  /**
   * Run migration for all appointments without video rooms
   */
  async runMigration(
    onProgress?: (progress: MigrationProgress) => void
  ): Promise<MigrationResult> {
    if (this.isRunning) {
      throw new Error('Migration is already running');
    }

    this.isRunning = true;
    console.log('[VideoRoomMigration] Starting video room migration...');

    try {
      const { total, appointments } = await this.getAppointmentsNeedingVideoRooms();
      
      if (total === 0) {
        console.log('[VideoRoomMigration] No appointments need video rooms');
        this.isRunning = false;
        return {
          totalAppointments: 0,
          processedAppointments: 0,
          successfulCreations: 0,
          failedCreations: 0,
          alreadyHadRooms: 0,
          errors: []
        };
      }

      const result: MigrationResult = {
        totalAppointments: total,
        processedAppointments: 0,
        successfulCreations: 0,
        failedCreations: 0,
        alreadyHadRooms: 0,
        errors: []
      };

      // Process in batches
      const totalBatches = Math.ceil(appointments.length / this.BATCH_SIZE);
      
      for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
        const batchStart = batchIndex * this.BATCH_SIZE;
        const batchEnd = Math.min(batchStart + this.BATCH_SIZE, appointments.length);
        const batch = appointments.slice(batchStart, batchEnd);

        console.log(`[VideoRoomMigration] Processing batch ${batchIndex + 1}/${totalBatches} (${batch.length} appointments)`);

        // Process batch using the videoRoomService
        const batchResults = await videoRoomService.batchCreateVideoRooms(
          batch.map(apt => apt.id)
        );

        // Update results
        for (const batchResult of batchResults) {
          result.processedAppointments++;
          
          if (batchResult.success) {
            result.successfulCreations++;
          } else {
            result.failedCreations++;
            result.errors.push({
              appointmentId: batchResult.appointmentId || 'unknown',
              error: batchResult.error
            });
          }
        }

        // Report progress
        if (onProgress) {
          onProgress({
            total,
            processed: result.processedAppointments,
            successful: result.successfulCreations,
            failed: result.failedCreations,
            currentBatch: batchIndex + 1,
            isComplete: batchIndex === totalBatches - 1,
            errors: result.errors
          });
        }

        // Small delay between batches to avoid overwhelming the system
        if (batchIndex < totalBatches - 1) {
          await this.delay(1000);
        }
      }

      console.log('[VideoRoomMigration] Migration completed:', result);
      this.isRunning = false;
      return result;

    } catch (error) {
      console.error('[VideoRoomMigration] Migration failed:', error);
      this.isRunning = false;
      throw error;
    }
  }

  /**
   * Run migration for specific appointment IDs
   */
  async runMigrationForAppointments(
    appointmentIds: string[],
    onProgress?: (progress: MigrationProgress) => void
  ): Promise<MigrationResult> {
    if (this.isRunning) {
      throw new Error('Migration is already running');
    }

    this.isRunning = true;
    console.log('[VideoRoomMigration] Starting targeted video room migration for appointments:', appointmentIds);

    try {
      const result: MigrationResult = {
        totalAppointments: appointmentIds.length,
        processedAppointments: 0,
        successfulCreations: 0,
        failedCreations: 0,
        alreadyHadRooms: 0,
        errors: []
      };

      // Check which appointments already have video rooms
      const { data: existingAppointments, error } = await supabase
        .from('appointments')
        .select('id, video_room_url')
        .in('id', appointmentIds);

      if (error) {
        console.error('[VideoRoomMigration] Error checking existing appointments:', error);
        throw error;
      }

      const appointmentsNeedingRooms: string[] = [];
      
      for (const apt of existingAppointments || []) {
        if (apt.video_room_url) {
          result.alreadyHadRooms++;
          result.processedAppointments++;
        } else {
          appointmentsNeedingRooms.push(apt.id);
        }
      }

      if (appointmentsNeedingRooms.length === 0) {
        console.log('[VideoRoomMigration] All specified appointments already have video rooms');
        this.isRunning = false;
        return result;
      }

      // Process in batches
      const totalBatches = Math.ceil(appointmentsNeedingRooms.length / this.BATCH_SIZE);
      
      for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
        const batchStart = batchIndex * this.BATCH_SIZE;
        const batchEnd = Math.min(batchStart + this.BATCH_SIZE, appointmentsNeedingRooms.length);
        const batch = appointmentsNeedingRooms.slice(batchStart, batchEnd);

        console.log(`[VideoRoomMigration] Processing batch ${batchIndex + 1}/${totalBatches} (${batch.length} appointments)`);

        // Process batch
        const batchResults = await videoRoomService.batchCreateVideoRooms(batch);

        // Update results
        for (const batchResult of batchResults) {
          result.processedAppointments++;
          
          if (batchResult.success) {
            result.successfulCreations++;
          } else {
            result.failedCreations++;
            result.errors.push({
              appointmentId: batchResult.appointmentId || 'unknown',
              error: batchResult.error
            });
          }
        }

        // Report progress
        if (onProgress) {
          onProgress({
            total: appointmentIds.length,
            processed: result.processedAppointments,
            successful: result.successfulCreations,
            failed: result.failedCreations,
            currentBatch: batchIndex + 1,
            isComplete: batchIndex === totalBatches - 1,
            errors: result.errors
          });
        }

        // Small delay between batches
        if (batchIndex < totalBatches - 1) {
          await this.delay(1000);
        }
      }

      console.log('[VideoRoomMigration] Targeted migration completed:', result);
      this.isRunning = false;
      return result;

    } catch (error) {
      console.error('[VideoRoomMigration] Targeted migration failed:', error);
      this.isRunning = false;
      throw error;
    }
  }

  /**
   * Get migration status
   */
  getMigrationStatus(): {
    isRunning: boolean;
  } {
    return {
      isRunning: this.isRunning
    };
  }

  /**
   * Utility method for delays
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const videoRoomMigration = new VideoRoomMigration();
export type { MigrationResult, MigrationProgress };