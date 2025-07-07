import { supabase } from '@/integrations/supabase/client';

interface VideoRoomResult {
  success: boolean;
  url?: string;
  error?: any;
  appointmentId?: string;
}

interface VideoRoomRequest {
  appointmentId: string;
  priority?: 'high' | 'normal' | 'low';
  retryCount?: number;
}

class VideoRoomService {
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY_MS = 1000;
  private readonly RATE_LIMIT_DELAY_MS = 500;
  private requestQueue: VideoRoomRequest[] = [];
  private isProcessing = false;

  /**
   * Create video room immediately after appointment creation (non-blocking)
   */
  async createVideoRoomAsync(appointmentId: string, priority: 'high' | 'normal' | 'low' = 'normal'): Promise<void> {
    console.log('[VideoRoomService] Queuing video room creation for appointment:', appointmentId);
    
    this.requestQueue.push({
      appointmentId,
      priority,
      retryCount: 0
    });

    // Sort queue by priority (high -> normal -> low)
    this.requestQueue.sort((a, b) => {
      const priorityOrder = { high: 0, normal: 1, low: 2 };
      return priorityOrder[a.priority!] - priorityOrder[b.priority!];
    });

    // Process queue if not already processing
    if (!this.isProcessing) {
      this.processQueue();
    }
  }

  /**
   * Create video room synchronously (blocking) - for immediate use cases
   */
  async createVideoRoomSync(appointmentId: string, forceNew: boolean = false): Promise<VideoRoomResult> {
    console.log('[VideoRoomService] Creating video room synchronously for appointment:', appointmentId);
    
    try {
      return await this.createVideoRoomInternal(appointmentId, forceNew);
    } catch (error) {
      console.error('[VideoRoomService] Sync video room creation failed:', error);
      return { success: false, error, appointmentId };
    }
  }

  /**
   * Process the video room creation queue
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.requestQueue.length === 0) {
      return;
    }

    this.isProcessing = true;
    console.log('[VideoRoomService] Processing video room queue, items:', this.requestQueue.length);

    while (this.requestQueue.length > 0) {
      const request = this.requestQueue.shift()!;
      
      try {
        const result = await this.createVideoRoomInternal(request.appointmentId);
        
        if (result.success) {
          console.log('[VideoRoomService] Successfully created video room for appointment:', request.appointmentId);
        } else {
          console.warn('[VideoRoomService] Failed to create video room for appointment:', request.appointmentId, result.error);
          
          // Retry logic
          if (request.retryCount! < this.MAX_RETRIES) {
            request.retryCount!++;
            request.priority = 'high'; // Boost priority for retries
            this.requestQueue.unshift(request); // Put at front of queue
            console.log('[VideoRoomService] Retrying video room creation, attempt:', request.retryCount);
            
            // Wait before retry
            await this.delay(this.RETRY_DELAY_MS * request.retryCount!);
          } else {
            console.error('[VideoRoomService] Max retries exceeded for appointment:', request.appointmentId);
            // Could emit an event here for monitoring/alerting
          }
        }
      } catch (error) {
        console.error('[VideoRoomService] Unexpected error processing video room request:', error);
      }

      // Rate limiting between requests
      await this.delay(this.RATE_LIMIT_DELAY_MS);
    }

    this.isProcessing = false;
    console.log('[VideoRoomService] Queue processing completed');
  }

  /**
   * Internal video room creation logic
   */
  private async createVideoRoomInternal(appointmentId: string, forceNew: boolean = false): Promise<VideoRoomResult> {
    try {
      // Check if appointment already has a video room URL (unless forcing new)
      if (!forceNew) {
        const { data: appointment, error: fetchError } = await supabase
          .from('appointments')
          .select('video_room_url')
          .eq('id', appointmentId)
          .single();

        if (fetchError) {
          console.error('[VideoRoomService] Error fetching appointment:', fetchError);
          throw fetchError;
        }

        if (appointment?.video_room_url) {
          console.log('[VideoRoomService] Appointment already has video room URL:', appointment.video_room_url);
          return { 
            success: true, 
            url: appointment.video_room_url, 
            appointmentId 
          };
        }
      }

      console.log('[VideoRoomService] Creating new video room via Edge Function');
      
      // Create video room via Edge Function
      const { data, error } = await supabase.functions.invoke('create-daily-room', {
        body: { appointmentId, forceNew }
      });

      if (error) {
        console.error('[VideoRoomService] Edge function error:', error);
        throw error;
      }

      if (!data?.url) {
        console.error('[VideoRoomService] No URL returned from edge function:', data);
        throw new Error('Failed to get video room URL from Daily.co');
      }

      console.log('[VideoRoomService] Video room created successfully:', data.url);

      // Update appointment with video room URL
      const { error: updateError } = await supabase
        .from('appointments')
        .update({ video_room_url: data.url })
        .eq('id', appointmentId);

      if (updateError) {
        console.error('[VideoRoomService] Error updating appointment with video URL:', updateError);
        throw updateError;
      }

      return { 
        success: true, 
        url: data.url, 
        appointmentId 
      };

    } catch (error) {
      console.error('[VideoRoomService] Error creating video room:', error);
      return { 
        success: false, 
        error, 
        appointmentId 
      };
    }
  }

  /**
   * Batch create video rooms for multiple appointments
   */
  async batchCreateVideoRooms(appointmentIds: string[]): Promise<VideoRoomResult[]> {
    console.log('[VideoRoomService] Batch creating video rooms for appointments:', appointmentIds.length);
    
    const results: VideoRoomResult[] = [];
    const batchSize = 5; // Process in batches to avoid overwhelming the API
    
    for (let i = 0; i < appointmentIds.length; i += batchSize) {
      const batch = appointmentIds.slice(i, i + batchSize);
      const batchPromises = batch.map(appointmentId => 
        this.createVideoRoomInternal(appointmentId)
      );
      
      const batchResults = await Promise.allSettled(batchPromises);
      
      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          console.error('[VideoRoomService] Batch creation failed:', result.reason);
          results.push({ 
            success: false, 
            error: result.reason 
          });
        }
      }
      
      // Small delay between batches
      if (i + batchSize < appointmentIds.length) {
        await this.delay(this.RATE_LIMIT_DELAY_MS);
      }
    }
    
    console.log('[VideoRoomService] Batch creation completed:', {
      total: appointmentIds.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length
    });
    
    return results;
  }

  /**
   * Validate and recreate video room if needed
   */
  async validateAndRecreateVideoRoom(appointmentId: string): Promise<VideoRoomResult> {
    console.log('[VideoRoomService] Validating video room for appointment:', appointmentId);
    
    try {
      const { data: appointment, error: fetchError } = await supabase
        .from('appointments')
        .select('video_room_url')
        .eq('id', appointmentId)
        .single();

      if (fetchError || !appointment?.video_room_url) {
        console.log('[VideoRoomService] No video room found, creating new one');
        return await this.createVideoRoomInternal(appointmentId);
      }

      // For now, assume the room is valid if URL exists
      // In the future, we could ping Daily.co API to validate the room
      console.log('[VideoRoomService] Video room exists and appears valid');
      
      return { 
        success: true, 
        url: appointment.video_room_url, 
        appointmentId 
      };

    } catch (error) {
      console.error('[VideoRoomService] Error validating video room:', error);
      // Try to recreate on validation error
      return await this.createVideoRoomInternal(appointmentId, true);
    }
  }

  /**
   * Get video room status for an appointment
   */
  async getVideoRoomStatus(appointmentId: string): Promise<{
    hasVideoRoom: boolean;
    url?: string;
    isValid?: boolean;
  }> {
    try {
      const { data: appointment, error } = await supabase
        .from('appointments')
        .select('video_room_url')
        .eq('id', appointmentId)
        .single();

      if (error || !appointment) {
        return { hasVideoRoom: false };
      }

      return {
        hasVideoRoom: !!appointment.video_room_url,
        url: appointment.video_room_url || undefined,
        isValid: !!appointment.video_room_url // For now, assume valid if exists
      };

    } catch (error) {
      console.error('[VideoRoomService] Error getting video room status:', error);
      return { hasVideoRoom: false };
    }
  }

  /**
   * Utility method for delays
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get queue status for monitoring
   */
  getQueueStatus(): {
    pending: number;
    isProcessing: boolean;
  } {
    return {
      pending: this.requestQueue.length,
      isProcessing: this.isProcessing
    };
  }
}

// Export singleton instance
export const videoRoomService = new VideoRoomService();
export type { VideoRoomResult };