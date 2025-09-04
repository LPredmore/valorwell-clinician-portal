import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Loader2, Mic, MicOff, Video, VideoOff, X, Maximize } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import DailyIframe from '@daily-co/daily-js';

interface VideoSessionDialogProps {
  roomUrl: string;
  isOpen: boolean;
  onClose: () => void;
}

const VideoSessionDialog: React.FC<VideoSessionDialogProps> = ({ roomUrl, isOpen, onClose }) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [participantCount, setParticipantCount] = useState(0);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const callObjectRef = useRef<any>(null);

  // 🔥 FIXED: Initialize Daily.js call object - USE createCallObject() NOT createFrame()
  useEffect(() => {
    if (!roomUrl || !isOpen || !containerRef.current) return;

    const initializeCall = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // ✅ CRITICAL FIX: Use createCallObject() method
        const callObject = DailyIframe.createCallObject({
          iframeStyle: {
            position: 'absolute',
            top: '0',
            left: '0', 
            width: '100%',
            height: '100%',
            border: 'none',
          },
        });

        callObjectRef.current = callObject;

        // ✅ CRITICAL FIX: Manually append iframe to container
        if (containerRef.current) {
          containerRef.current.appendChild(callObject.iframe());
        }

        // Event handlers
        callObject.on('joined-meeting', () => {
          setIsConnected(true);
          setIsLoading(false);
          toast({
            title: "Connected",
            description: "Successfully joined the video session",
          });
        });

        callObject.on('left-meeting', () => {
          setIsConnected(false);
          onClose();
        });

        callObject.on('participant-joined', (event: any) => {
          setParticipantCount(prev => prev + 1);
          if (event.participant.user_name) {
            toast({
              title: "Participant Joined", 
              description: `${event.participant.user_name} joined the session`,
            });
          }
        });

        callObject.on('participant-left', (event: any) => {
          setParticipantCount(prev => Math.max(0, prev - 1));
          if (event.participant.user_name) {
            toast({
              title: "Participant Left",
              description: `${event.participant.user_name} left the session`, 
            });
          }
        });

        callObject.on('error', (event: any) => {
          console.error('Daily.js error:', event);
          setError('Connection error occurred');
          setIsLoading(false);
          
          toast({
            title: "Video Session Error",
            description: event.errorMsg || "An error occurred during the video session",
            variant: "destructive",
          });
        });

        // Join the call
        await callObject.join({ url: roomUrl });

      } catch (error) {
        console.error('Failed to initialize call:', error);
        setError('Unable to connect to video session. Please try again.');
        setIsLoading(false);
        toast({
          title: "Connection Failed",
          description: "Unable to connect to video session. Please try again.",
          variant: "destructive",
        });
      }
    };

    initializeCall();

    return () => {
      if (callObjectRef.current) {
        callObjectRef.current.destroy();
        callObjectRef.current = null;
      }
    };
  }, [roomUrl, isOpen, onClose]);

  // Cleanup on dialog close
  useEffect(() => {
    if (!isOpen && callObjectRef.current) {
      callObjectRef.current.destroy();
      callObjectRef.current = null;
    }
  }, [isOpen]);

  const handleClose = () => {
    if (callObjectRef.current) {
      callObjectRef.current.destroy();
      callObjectRef.current = null;
    }
    onClose();
  };

  const toggleAudio = useCallback(() => {
    if (callObjectRef.current) {
      callObjectRef.current.setLocalAudio(!isAudioEnabled);
      setIsAudioEnabled(!isAudioEnabled);
    }
  }, [isAudioEnabled]);

  const toggleVideo = useCallback(() => {
    if (callObjectRef.current) {
      callObjectRef.current.setLocalVideo(!isVideoEnabled);
      setIsVideoEnabled(!isVideoEnabled);
    }
  }, [isVideoEnabled]);

  const leaveCall = useCallback(() => {
    if (callObjectRef.current) {
      callObjectRef.current.leave();
    }
    onClose();
  }, [onClose]);

  if (!roomUrl) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-6xl h-[80vh]">
        <DialogHeader>
          <DialogTitle>Video Session</DialogTitle>
          {isConnected && (
            <DialogDescription>
              ({participantCount + 1} participant{participantCount !== 0 ? 's' : ''})
            </DialogDescription>
          )}
        </DialogHeader>
        
        <div className="flex-1 relative bg-gray-900 rounded-lg overflow-hidden">
          <div ref={containerRef} className="w-full h-full relative">
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                <div className="text-center text-white">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                  <p>Connecting to video session...</p>
                </div>
              </div>
            )}
            
            {error && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                <div className="text-center text-white">
                  <p className="text-lg font-medium mb-2">Unable to connect to video session</p>
                  <Button 
                    onClick={() => window.location.reload()} 
                    variant="outline" 
                    className="text-white border-white hover:bg-white hover:text-gray-900"
                  >
                    Try Again
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Video Controls */}
        <div className="flex justify-center gap-4 p-4">
          <Button onClick={toggleAudio} variant="outline">
            {isAudioEnabled ? <Mic /> : <MicOff />}
          </Button>
          <Button onClick={toggleVideo} variant="outline">
            {isVideoEnabled ? <Video /> : <VideoOff />}
          </Button>
          <Button onClick={leaveCall} variant="destructive">
            <X />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default VideoSessionDialog;
