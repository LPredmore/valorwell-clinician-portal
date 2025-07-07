import React, { useState, useEffect } from 'react';
import { Video, VideoOff, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { videoRoomService } from '@/utils/videoRoomService';
import { useToast } from '@/hooks/use-toast';

interface VideoRoomStatusIndicatorProps {
  appointmentId: string;
  className?: string;
  showRecreateButton?: boolean;
  size?: 'small' | 'normal';
}

const VideoRoomStatusIndicator: React.FC<VideoRoomStatusIndicatorProps> = ({
  appointmentId,
  className = '',
  showRecreateButton = false,
  size = 'normal'
}) => {
  const [status, setStatus] = useState<{
    hasVideoRoom: boolean;
    url?: string;
    isValid?: boolean;
    isLoading: boolean;
  }>({
    hasVideoRoom: false,
    isLoading: true
  });
  const [isRecreating, setIsRecreating] = useState(false);
  const { toast } = useToast();

  const iconSize = size === 'small' ? 'h-3 w-3' : 'h-4 w-4';
  const badgeSize = size === 'small' ? 'text-xs' : 'text-sm';

  useEffect(() => {
    checkVideoRoomStatus();
  }, [appointmentId]);

  const checkVideoRoomStatus = async () => {
    try {
      setStatus(prev => ({ ...prev, isLoading: true }));
      const roomStatus = await videoRoomService.getVideoRoomStatus(appointmentId);
      setStatus({
        ...roomStatus,
        isLoading: false
      });
    } catch (error) {
      console.error('[VideoRoomStatusIndicator] Error checking status:', error);
      setStatus({
        hasVideoRoom: false,
        isLoading: false
      });
    }
  };

  const handleRecreateVideoRoom = async () => {
    try {
      setIsRecreating(true);
      
      const result = await videoRoomService.createVideoRoomSync(appointmentId, true);
      
      if (result.success) {
        setStatus({
          hasVideoRoom: true,
          url: result.url,
          isValid: true,
          isLoading: false
        });
        
        toast({
          title: 'Success',
          description: 'Video room recreated successfully'
        });
      } else {
        console.error('[VideoRoomStatusIndicator] Failed to recreate video room:', result.error);
        toast({
          title: 'Error',
          description: 'Failed to recreate video room',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('[VideoRoomStatusIndicator] Error recreating video room:', error);
      toast({
        title: 'Error',
        description: 'Failed to recreate video room',
        variant: 'destructive'
      });
    } finally {
      setIsRecreating(false);
    }
  };

  const renderStatusBadge = () => {
    if (status.isLoading) {
      return (
        <Badge variant="secondary" className={`${badgeSize} ${className}`}>
          <RefreshCw className={`${iconSize} mr-1 animate-spin`} />
          Checking...
        </Badge>
      );
    }

    if (status.hasVideoRoom && status.isValid !== false) {
      return (
        <Badge variant="default" className={`${badgeSize} bg-green-600 hover:bg-green-700 ${className}`}>
          <Video className={`${iconSize} mr-1`} />
          Ready
        </Badge>
      );
    }

    if (status.hasVideoRoom && status.isValid === false) {
      return (
        <Badge variant="destructive" className={`${badgeSize} ${className}`}>
          <AlertCircle className={`${iconSize} mr-1`} />
          Invalid
        </Badge>
      );
    }

    return (
      <Badge variant="outline" className={`${badgeSize} text-orange-600 border-orange-600 ${className}`}>
        <VideoOff className={`${iconSize} mr-1`} />
        Pending
      </Badge>
    );
  };

  const getTooltipContent = () => {
    if (status.isLoading) {
      return 'Checking video room status...';
    }

    if (status.hasVideoRoom && status.isValid !== false) {
      return 'Video room is ready for this appointment';
    }

    if (status.hasVideoRoom && status.isValid === false) {
      return 'Video room exists but may have issues. Click to recreate.';
    }

    return 'Video room is being created in the background';
  };

  return (
    <div className="flex items-center gap-2">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="cursor-help">
              {renderStatusBadge()}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>{getTooltipContent()}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {showRecreateButton && (!status.hasVideoRoom || status.isValid === false) && (
        <Button
          size="sm"
          variant="outline"
          onClick={handleRecreateVideoRoom}
          disabled={isRecreating || status.isLoading}
          className="h-6 px-2 text-xs"
        >
          {isRecreating ? (
            <>
              <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
              Creating...
            </>
          ) : (
            <>
              <Video className="h-3 w-3 mr-1" />
              Create Room
            </>
          )}
        </Button>
      )}
    </div>
  );
};

export default VideoRoomStatusIndicator;