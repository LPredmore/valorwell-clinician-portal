import React from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogHeader } from '@/components/ui/dialog';
import { Mic, MicOff, Video, VideoOff, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import DailyIframe from '@daily-co/daily-js';

interface VideoSessionDialogProps {
  roomUrl?: string;
  isOpen: boolean;
  onClose: () => void;
}

const VideoSessionDialog: React.FC<VideoSessionDialogProps> = ({ roomUrl, isOpen, onClose }) => {
  const { toast } = useToast();
  const [isAudioEnabled, setIsAudioEnabled] = React.useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = React.useState(false);
  const [participantCount, setParticipantCount] = React.useState(0);
  
  const containerRef = React.useRef<HTMLDivElement>(null);
  const callObjectRef = React.useRef<any>(null);

  // 1) Create & mount call object when dialog opens
  React.useEffect(() => {
    if (!isOpen) {
      // Clean up on close
      if (callObjectRef.current) {
        console.log("[Daily] cleaning up call object");
        callObjectRef.current.destroy();
        callObjectRef.current = null;
      }
      return;
    }

    // Only initialize once when dialog opens and container is ready
    if (isOpen && containerRef.current && !callObjectRef.current) {
      console.log("[Daily] initializing call object");
      try {
        // Create a call object with proper options
        const callObject = DailyIframe.createCallObject({
          iframeStyle: {
            position: 'absolute',
            top: '0',
            left: '0',
            width: '100%',
            height: '100%',
            border: 'none',
            borderRadius: '12px',
          },
          showLeaveButton: false,
          showFullscreenButton: false,
          activeSpeakerMode: true,
        });

        // Manually append the iframe to our container div
        if (containerRef.current) {
          containerRef.current.appendChild(callObject.iframe());
        }

        callObjectRef.current = callObject;
        console.log("[Daily] call object created and iframe appended");
      } catch (err) {
        console.error("[Daily] failed to initialize:", err);
        toast({
          title: "Initialization Failed",
          description: "Unable to initialize video session",
          variant: "destructive",
        });
      }
    }
  }, [isOpen, toast]);

  // 2) Wire events ONCE when call object is ready
  React.useEffect(() => {
    if (!callObjectRef.current) return;

    const callObject = callObjectRef.current;

    const onLoading = () => console.log("[Daily] loading");
    const onLoaded = () => console.log("[Daily] loaded");
    const onJoined = (ev: any) => {
      console.log("[Daily] joined-meeting", ev);
      const participants = Object.keys(ev.participants || {});
      setParticipantCount(participants.length);
      toast({
        title: "Connected",
        description: "Successfully joined the video session",
      });
    };
    const onLeft = (ev: any) => {
      console.log("[Daily] left-meeting", ev);
      onClose();
    };
    const onError = (ev: any) => {
      console.error("[Daily] error", ev);
      toast({
        title: "Video Session Error",
        description: ev.errorMsg || "An error occurred during the video session",
        variant: "destructive",
      });
    };
    const onParticipantJoined = (ev: any) => {
      console.log("[Daily] participant-joined", ev);
      setParticipantCount(prev => prev + 1);
      if (ev.participant.user_name) {
        toast({
          title: "Participant Joined", 
          description: `${ev.participant.user_name} joined the session`,
        });
      }
    };
    const onParticipantLeft = (ev: any) => {
      console.log("[Daily] participant-left", ev);
      setParticipantCount(prev => Math.max(0, prev - 1));
      if (ev.participant.user_name) {
        toast({
          title: "Participant Left",
          description: `${ev.participant.user_name} left the session`, 
        });
      }
    };

    callObject.on("loading", onLoading);
    callObject.on("loaded", onLoaded);
    callObject.on("joined-meeting", onJoined);
    callObject.on("left-meeting", onLeft);
    callObject.on("error", onError);
    callObject.on("participant-joined", onParticipantJoined);
    callObject.on("participant-left", onParticipantLeft);

    return () => {
      callObject.off("loading", onLoading);
      callObject.off("loaded", onLoaded);
      callObject.off("joined-meeting", onJoined);
      callObject.off("left-meeting", onLeft);
      callObject.off("error", onError);
      callObject.off("participant-joined", onParticipantJoined);
      callObject.off("participant-left", onParticipantLeft);
    };
  }, [callObjectRef.current, toast, onClose]);

  // 3) Join when dialog opens & we have a URL
  React.useEffect(() => {
    let cancelled = false;

    async function joinCall() {
      if (!isOpen || !roomUrl || !callObjectRef.current) return;

      console.log("[Daily] about to join", {
        meetingState: callObjectRef.current.meetingState?.(),
        roomUrl,
      });

      try {
        // IMPORTANT: pass the URL explicitly to join()
        await callObjectRef.current.join({ 
          url: roomUrl, 
          startVideoOff: !isVideoEnabled, 
          startAudioOff: !isAudioEnabled 
        });
        if (!cancelled) console.log("[Daily] join() resolved");
      } catch (e) {
        if (!cancelled) {
          console.error("[Daily] join() failed", e);
          toast({
            title: "Connection Failed",
            description: "Unable to connect to video session. Please try again.",
            variant: "destructive",
          });
        }
      }
    }

    void joinCall();

    return () => {
      cancelled = true;
    };
  }, [isOpen, roomUrl, isVideoEnabled, isAudioEnabled, toast]);

  // 4) Leave on close
  const handleClose = React.useCallback(async () => {
    try {
      if (callObjectRef.current) {
        console.log("[Daily] leaving call");
        await callObjectRef.current.leave();
      }
    } catch (e) {
      console.error("[Daily] error leaving call", e);
    } finally {
      onClose();
    }
  }, [onClose]);

  const toggleAudio = React.useCallback(() => {
    if (callObjectRef.current) {
      const newState = !isAudioEnabled;
      callObjectRef.current.setLocalAudio(newState);
      setIsAudioEnabled(newState);
      console.log("[Daily] audio toggled:", newState);
    }
  }, [isAudioEnabled]);

  const toggleVideo = React.useCallback(() => {
    if (callObjectRef.current) {
      const newState = !isVideoEnabled;
      callObjectRef.current.setLocalVideo(newState);
      setIsVideoEnabled(newState);
      console.log("[Daily] video toggled:", newState);
    }
  }, [isVideoEnabled]);

  const leaveCall = React.useCallback(async () => {
    await handleClose();
  }, [handleClose]);

  // Render nothing if closed (prevents accidental multiple frames)
  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-6xl h-[80vh]">
        <DialogHeader>
          <DialogTitle>Video Session</DialogTitle>
          <DialogDescription>
            {participantCount > 0 && `(${participantCount + 1} participants)`}
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 relative bg-gray-900 rounded-lg overflow-hidden">
          <div ref={containerRef} className="w-full h-full" />
        </div>
        
        {/* Video Controls */}
        <div className="flex justify-center gap-4 p-4">
          <Button onClick={toggleAudio} variant="outline">
            {isAudioEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
          </Button>
          <Button onClick={toggleVideo} variant="outline">
            {isVideoEnabled ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
          </Button>
          <Button onClick={leaveCall} variant="destructive">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default VideoSessionDialog;