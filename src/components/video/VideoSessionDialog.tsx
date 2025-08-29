import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Loader2, Mic, MicOff, Video, VideoOff, X, Maximize, RotateCcw } from 'lucide-react';
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
  const [isReconnecting, setIsReconnecting] = useState(false);
  const callRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  
  // Initialize Daily.js call
  const initializeCall = useCallback(async () => {
    if (!roomUrl || !isOpen) return;
    
    console.log('Initializing Daily.js call for room:', roomUrl);
    setIsLoading(true);
    setError(null);
    
    try {
      // Create call instance
      callRef.current = DailyIframe.createFrame(iframeRef.current, {
        iframeStyle: {
          width: '100%',
          height: '100%',
          border: '0',
          borderRadius: '8px',
        },
        showLeaveButton: false,
        showFullscreenButton: false,
        // Do not disable microphone - let Chrome 140 handle gracefully
        activeSpeakerMode: true,
      });

      // Set up event listeners
      callRef.current
        .on('loading', () => {
          console.log('Daily.js loading');
          setIsLoading(true);
        })
        .on('loaded', () => {
          console.log('Daily.js loaded');
          setIsLoading(false);
        })
        .on('joined-meeting', () => {
          console.log('Joined meeting successfully');
          setIsLoading(false);
          setIsReconnecting(false);
        })
        .on('left-meeting', () => {
          console.log('Left meeting');
          onClose();
        })
        .on('error', (event: any) => {
          console.error('Daily.js error:', event);
          setError(`Connection error: ${event.errorMsg || 'Unknown error'}`);
          setIsLoading(false);
          
          // Attempt reconnection for network errors
          if (event.action === 'camera-error' || event.action === 'connection-error') {
            handleReconnect();
          }
        })
        .on('network-quality-change', (event: any) => {
          if (event.quality === 'low' || event.quality === 'very-low') {
            console.warn('Poor network quality detected:', event.quality);
          }
        })
        .on('track-stopped', (event: any) => {
          console.log('Track stopped:', event);
          // Handle track stopping gracefully
        });

      // Join the call
      await callRef.current.join({
        url: roomUrl,
        startVideoOff: true,
        startAudioOff: false, // Start with audio on, let browser handle mic permissions
      });

    } catch (err) {
      console.error('Failed to initialize Daily.js call:', err);
      setError(`Failed to connect: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setIsLoading(false);
    }
  }, [roomUrl, isOpen, onClose]);

  // Cleanup call on unmount or close
  const cleanupCall = useCallback(() => {
    if (callRef.current) {
      console.log('Cleaning up Daily.js call');
      try {
        callRef.current.destroy();
        callRef.current = null;
      } catch (err) {
        console.error('Error cleaning up call:', err);
      }
    }
  }, []);

  // Reconnection logic
  const handleReconnect = useCallback(async () => {
    if (isReconnecting) return;
    
    console.log('Attempting to reconnect...');
    setIsReconnecting(true);
    setError(null);
    
    // Clean up existing call
    cleanupCall();
    
    // Wait a moment before reconnecting
    setTimeout(() => {
      initializeCall();
    }, 2000);
  }, [isReconnecting, cleanupCall, initializeCall]);

  // Initialize call when component opens
  useEffect(() => {
    if (isOpen && roomUrl) {
      initializeCall();
    }
    
    return () => {
      if (!isOpen) {
        cleanupCall();
      }
    };
  }, [isOpen, roomUrl, initializeCall, cleanupCall]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupCall();
    };
  }, [cleanupCall]);

  const handleClose = () => {
    cleanupCall();
    onClose();
  };

  const toggleAudio = async () => {
    if (!callRef.current) return;
    
    try {
      const newAudioState = !isAudioEnabled;
      await callRef.current.setLocalAudio(newAudioState);
      setIsAudioEnabled(newAudioState);
      
      toast({
        title: newAudioState ? 'Microphone enabled' : 'Microphone disabled',
        description: newAudioState ? 'Your microphone is now on' : 'Your microphone is now off',
      });
    } catch (error) {
      console.error('Error toggling audio:', error);
      toast({
        title: 'Error',
        description: 'Failed to toggle microphone',
        variant: 'destructive',
      });
    }
  };

  const toggleVideo = async () => {
    if (!callRef.current) return;
    
    try {
      const newVideoState = !isVideoEnabled;
      await callRef.current.setLocalVideo(newVideoState);
      setIsVideoEnabled(newVideoState);
      
      toast({
        title: newVideoState ? 'Camera enabled' : 'Camera disabled',
        description: newVideoState ? 'Your camera is now on' : 'Your camera is now off',
      });
    } catch (error) {
      console.error('Error toggling video:', error);
      toast({
        title: 'Error',
        description: 'Failed to toggle camera',
        variant: 'destructive',
      });
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    
    try {
      if (!isFullscreen) {
        if (containerRef.current.requestFullscreen) {
          containerRef.current.requestFullscreen();
        }
      } else {
        if (document.exitFullscreen) {
          document.exitFullscreen();
        }
      }
    } catch (error) {
      console.error('Error toggling fullscreen:', error);
      toast({
        title: 'Error',
        description: 'Failed to toggle fullscreen',
        variant: 'destructive',
      });
    }
  };

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const renderVideoContent = () => (
    <div ref={containerRef} className="relative w-full h-full">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 z-10">
          <div className="text-center text-white">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
            <p>{isReconnecting ? 'Reconnecting...' : 'Loading video session...'}</p>
          </div>
        </div>
      )}
      {error ? (
        <div className="h-full flex items-center justify-center">
          <div className="text-center">
            <p className="text-red-500 mb-4">{error}</p>
            <div className="space-x-2">
              <Button onClick={handleReconnect} disabled={isReconnecting}>
                <RotateCcw className="h-4 w-4 mr-2" />
                {isReconnecting ? 'Reconnecting...' : 'Reconnect'}
              </Button>
              <Button variant="outline" onClick={handleClose}>Close</Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="w-full h-full">
          <iframe
            ref={iframeRef}
            className="w-full h-full border-0 rounded-lg"
            allow="camera; microphone; fullscreen; display-capture"
          />
        </div>
      )}
    </div>
  );

  const renderControls = () => (
    <CardFooter className="flex justify-center items-center space-x-4 p-4">
      <Button
        variant={isAudioEnabled ? "default" : "outline"}
        size="icon"
        onClick={toggleAudio}
        disabled={!callRef.current}
      >
        {isAudioEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
      </Button>
      <Button
        variant={isVideoEnabled ? "default" : "outline"}
        size="icon"
        onClick={toggleVideo}
        disabled={!callRef.current}
      >
        {isVideoEnabled ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
      </Button>
      <Button
        variant="outline"
        size="icon"
        onClick={toggleFullscreen}
        title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
      >
        <Maximize className="h-4 w-4" />
      </Button>
      {error && (
        <Button
          variant="outline"
          onClick={handleReconnect}
          disabled={isReconnecting}
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          {isReconnecting ? 'Reconnecting...' : 'Reconnect'}
        </Button>
      )}
      <Button variant="destructive" onClick={handleClose}>
        End Call
      </Button>
    </CardFooter>
  );

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-4xl p-0 overflow-hidden">
        <DialogTitle className="sr-only">Video Session</DialogTitle>
        <DialogDescription className="sr-only">Video call session interface</DialogDescription>
        <Card className="w-full h-[600px] border-0">
          <CardHeader className="flex flex-row items-center justify-between p-4">
            <h3 className="font-semibold">Video Session</h3>
            <Button variant="ghost" size="icon" onClick={handleClose}>
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="p-0 h-[450px]">
            {renderVideoContent()}
          </CardContent>
          {renderControls()}
        </Card>
      </DialogContent>
    </Dialog>
  );
};

export default VideoSessionDialog;