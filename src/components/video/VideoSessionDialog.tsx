"use client";

console.log("[VideoSessionDialog] file loaded");

import React from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogHeader } from '@/components/ui/dialog';
import { Mic, MicOff, Video, VideoOff, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useCallFrame } from '@daily-co/daily-react';

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

  // Use canonical Daily React pattern with useCallFrame
  const callFrame = useCallFrame({
    parentElRef: containerRef,
    options: {
      iframeStyle: {
        width: "100%",
        height: "100%", 
        border: "0",
        borderRadius: "12px"
      },
      showParticipantsBar: true,
      showLeaveButton: false,
      showFullscreenButton: false,
      activeSpeakerMode: true,
    },
    shouldCreateInstance: () => isOpen
  });

  // Wire event listeners
  React.useEffect(() => {
    if (!callFrame) return;

    const onLoading = () => {
      console.log("[Daily] loading");
    };

    const onLoaded = () => {
      console.log("[Daily] loaded");
    };

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

    // Wire up event listeners
    callFrame.on("loading", onLoading);
    callFrame.on("loaded", onLoaded);
    callFrame.on("joined-meeting", onJoined);
    callFrame.on("left-meeting", onLeft);
    callFrame.on("error", onError);
    callFrame.on("participant-joined", onParticipantJoined);
    callFrame.on("participant-left", onParticipantLeft);

    // Cleanup listeners
    return () => {
      callFrame.off("loading", onLoading);
      callFrame.off("loaded", onLoaded);
      callFrame.off("joined-meeting", onJoined);
      callFrame.off("left-meeting", onLeft);
      callFrame.off("error", onError);
      callFrame.off("participant-joined", onParticipantJoined);
      callFrame.off("participant-left", onParticipantLeft);
    };
  }, [callFrame, toast]);

  // Join the call when dialog opens and we have a room URL
  React.useEffect(() => {
    let cancelled = false;

    async function joinCall() {
      if (!isOpen || !roomUrl || !callFrame) return;

      console.log("[Daily] about to join", {
        meetingState: callFrame.meetingState?.(),
        roomUrl,
      });

      try {
        await callFrame.join({ 
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
  }, [isOpen, roomUrl, callFrame, isVideoEnabled, isAudioEnabled, toast]);

  // Leave on close
  const handleClose = React.useCallback(async () => {
    try {
      if (callFrame) {
        console.log("[Daily] leaving call");
        await callFrame.leave();
      }
    } catch (e) {
      console.error("[Daily] error leaving call", e);
    } finally {
      onClose();
    }
  }, [callFrame, onClose]);

  const toggleAudio = React.useCallback(() => {
    if (callFrame) {
      const newState = !isAudioEnabled;
      callFrame.setLocalAudio(newState);
      setIsAudioEnabled(newState);
      console.log("[Daily] audio toggled:", newState);
    }
  }, [callFrame, isAudioEnabled]);

  const toggleVideo = React.useCallback(() => {
    if (callFrame) {
      const newState = !isVideoEnabled;
      callFrame.setLocalVideo(newState);
      setIsVideoEnabled(newState);
      console.log("[Daily] video toggled:", newState);
    }
  }, [callFrame, isVideoEnabled]);

  const leaveCall = React.useCallback(async () => {
    await handleClose();
  }, [handleClose]);

  // Don't render if not open
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