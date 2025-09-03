import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Video, VideoOff, Maximize, Phone } from "lucide-react";
import { useCallFrame, useDaily } from '@daily-co/daily-react';
import { toast } from "sonner";

interface VideoSessionDialogProps {
  roomUrl: string;
  isOpen: boolean;
  onClose: () => void;
}

const VideoSessionDialog: React.FC<VideoSessionDialogProps> = ({ 
  roomUrl, 
  isOpen, 
  onClose 
}) => {
  const timestamp = () => `[${new Date().toISOString()}]`;
  
  console.log(`🔥 ${timestamp()} [VideoSessionDialog] Rendering with Daily React`, {
    roomUrl,
    isOpen,
    roomUrlValid: !!roomUrl
  });

  // Use Daily React hooks
  const callFrame = useCallFrame({
    options: {
      iframeStyle: {
        position: 'relative',
        width: '100%',
        height: '400px',
        border: 'none',
        borderRadius: '8px'
      },
      showLeaveButton: false,
      showFullscreenButton: false,
      showLocalVideo: true,
      showParticipantsBar: true
    }
  });
  const daily = useDaily();

  const [isAudioMuted, setIsAudioMuted] = React.useState(false);
  const [isVideoMuted, setIsVideoMuted] = React.useState(false);
  const [isJoining, setIsJoining] = React.useState(false);
  const [hasJoined, setHasJoined] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Daily iframe container ref
  const iframeContainerRef = React.useRef<HTMLDivElement>(null);

  // Join call when dialog opens
  React.useEffect(() => {
    if (isOpen && roomUrl && callFrame && !hasJoined && !isJoining) {
      console.log(`🔥 ${timestamp()} [VideoSessionDialog] Starting to join call`, { roomUrl });
      setIsJoining(true);
      setError(null);
      
      callFrame.join({ url: roomUrl })
        .then(() => {
          console.log(`🔥 ${timestamp()} [VideoSessionDialog] Successfully joined call`);
          setHasJoined(true);
          setIsJoining(false);
        })
        .catch((err) => {
          console.error(`🔥 ${timestamp()} [VideoSessionDialog] Failed to join call:`, err);
          setError(`Failed to join video session: ${err.message}`);
          setIsJoining(false);
          toast.error("Failed to join video session");
        });
    }
  }, [isOpen, roomUrl, callFrame, hasJoined, isJoining]);

  // Listen for Daily events
  React.useEffect(() => {
    if (!callFrame) return;

    const handleJoinedMeeting = () => {
      console.log(`🔥 ${timestamp()} [VideoSessionDialog] Joined meeting event`);
      setHasJoined(true);
      setIsJoining(false);
      setError(null);
    };

    const handleLeftMeeting = () => {
      console.log(`🔥 ${timestamp()} [VideoSessionDialog] Left meeting event`);
      setHasJoined(false);
      setIsJoining(false);
    };

    const handleCallError = (event: any) => {
      console.error(`🔥 ${timestamp()} [VideoSessionDialog] Call error:`, event);
      setError(event.errorMsg || 'Video session error occurred');
      setIsJoining(false);
      toast.error("Video session error occurred");
    };

    callFrame.on('joined-meeting', handleJoinedMeeting);
    callFrame.on('left-meeting', handleLeftMeeting);
    callFrame.on('error', handleCallError);

    return () => {
      callFrame.off('joined-meeting', handleJoinedMeeting);
      callFrame.off('left-meeting', handleLeftMeeting);
      callFrame.off('error', handleCallError);
    };
  }, [callFrame]);

  // Create iframe when we have a room URL
  React.useEffect(() => {
    if (roomUrl && iframeContainerRef.current && callFrame && !iframeContainerRef.current.querySelector('iframe')) {
      console.log(`🔥 ${timestamp()} [VideoSessionDialog] Creating Daily iframe`);
      
      const iframe = callFrame.iframe();
      if (iframe) {
        iframe.style.width = '100%';
        iframe.style.height = '400px';
        iframe.style.border = 'none';
        iframe.style.borderRadius = '8px';
        iframeContainerRef.current.appendChild(iframe);
      }
    }
  }, [roomUrl, callFrame]);

  const handleClose = async () => {
    console.log(`🔥 ${timestamp()} [VideoSessionDialog] Closing dialog`);
    
    if (callFrame && hasJoined) {
      try {
        await callFrame.leave();
        console.log(`🔥 ${timestamp()} [VideoSessionDialog] Left call successfully`);
      } catch (err) {
        console.error(`🔥 ${timestamp()} [VideoSessionDialog] Error leaving call:`, err);
      }
    }
    
    // Clean up iframe
    if (iframeContainerRef.current) {
      iframeContainerRef.current.innerHTML = '';
    }
    
    setHasJoined(false);
    setIsJoining(false);
    setError(null);
    onClose();
  };

  const toggleAudio = async () => {
    if (!callFrame) return;
    
    try {
      const newMutedState = !isAudioMuted;
      await callFrame.setLocalAudio(!newMutedState);
      setIsAudioMuted(newMutedState);
      console.log(`🔥 ${timestamp()} [VideoSessionDialog] Audio ${newMutedState ? 'muted' : 'unmuted'}`);
    } catch (err) {
      console.error(`🔥 ${timestamp()} [VideoSessionDialog] Error toggling audio:`, err);
      toast.error("Failed to toggle audio");
    }
  };

  const toggleVideo = async () => {
    if (!callFrame) return;
    
    try {
      const newMutedState = !isVideoMuted;
      await callFrame.setLocalVideo(!newMutedState);
      setIsVideoMuted(newMutedState);
      console.log(`🔥 ${timestamp()} [VideoSessionDialog] Video ${newMutedState ? 'muted' : 'unmuted'}`);
    } catch (err) {
      console.error(`🔥 ${timestamp()} [VideoSessionDialog] Error toggling video:`, err);
      toast.error("Failed to toggle video");
    }
  };

  const renderVideoContent = () => {
    if (error) {
      return (
        <div className="flex flex-col items-center justify-center h-[400px] text-center">
          <div className="text-destructive mb-4">
            <Phone className="h-12 w-12 mx-auto mb-2" />
            <p className="text-lg font-medium">Video Session Error</p>
            <p className="text-sm text-muted-foreground mt-2">{error}</p>
          </div>
          <Button onClick={() => setError(null)} variant="outline">
            Try Again
          </Button>
        </div>
      );
    }

    if (isJoining) {
      return (
        <div className="flex flex-col items-center justify-center h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
          <p className="text-lg font-medium">Joining video session...</p>
          <p className="text-sm text-muted-foreground mt-2">
            Please wait while we connect you
          </p>
        </div>
      );
    }

    if (!roomUrl) {
      return (
        <div className="flex flex-col items-center justify-center h-[400px]">
          <Phone className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-lg font-medium">No video room available</p>
          <p className="text-sm text-muted-foreground mt-2">
            Please contact support if this issue persists
          </p>
        </div>
      );
    }

    // Container for Daily iframe
    return (
      <div className="h-[400px] w-full bg-background rounded-lg overflow-hidden">
        <div 
          ref={iframeContainerRef}
          className="w-full h-full"
        />
        {!hasJoined && !isJoining && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80">
            <div className="text-center">
              <Phone className="h-12 w-12 mx-auto mb-4 text-primary" />
              <p className="text-lg font-medium">Ready to join</p>
              <p className="text-sm text-muted-foreground">Video session is ready</p>
            </div>
          </div>
        )}
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0">
        <Card className="border-none shadow-none">
          <CardHeader className="pb-4">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Phone className="h-5 w-5" />
                Video Session
              </DialogTitle>
            </DialogHeader>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="relative">
              {renderVideoContent()}
            
              {/* Control buttons */}
              <div className="flex justify-center gap-2 mt-4 p-4 bg-muted/50 rounded-lg">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleAudio}
                  disabled={!hasJoined}
                  className="flex items-center gap-2"
                >
                  {isAudioMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                  {isAudioMuted ? 'Unmute' : 'Mute'}
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleVideo}
                  disabled={!hasJoined}
                  className="flex items-center gap-2"
                >
                  {isVideoMuted ? <VideoOff className="h-4 w-4" /> : <Video className="h-4 w-4" />}
                  {isVideoMuted ? 'Turn On' : 'Turn Off'}
                </Button>
                
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleClose}
                  className="flex items-center gap-2"
                >
                  <Phone className="h-4 w-4" />
                  End Call
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  );
};

export default VideoSessionDialog;