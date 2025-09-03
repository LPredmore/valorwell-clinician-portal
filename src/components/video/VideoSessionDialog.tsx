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
    
    const initStartTime = performance.now();
    console.log('🎬 [VideoDebug] INIT START:', {
      roomUrl,
      isOpen,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      connection: navigator.onLine ? 'online' : 'offline'
    });
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Pre-validation checks
      console.log('🔍 [VideoDebug] Pre-validation:', {
        roomUrl,
        isValidUrl: /^https:\/\/.*\.daily\.co\//.test(roomUrl),
        iframeRef: !!iframeRef.current,
        callRef: !!callRef.current
      });

      // Create call instance
      console.log('🏗️ [VideoDebug] Creating Daily frame...');
      const frameStartTime = performance.now();
      
      callRef.current = DailyIframe.createFrame(iframeRef.current, {
        iframeStyle: {
          width: '100%',
          height: '100%',
          border: '0',
          borderRadius: '8px',
        },
        showLeaveButton: false,
        showFullscreenButton: false,
        activeSpeakerMode: true,
      });
      
      console.log('🏗️ [VideoDebug] Frame created in:', performance.now() - frameStartTime, 'ms');
      console.log('📊 [VideoDebug] Initial call state:', {
        meetingState: callRef.current.meetingState(),
        accessState: callRef.current.accessState(),
        participantCounts: callRef.current.participantCounts()
      });

      // Set up comprehensive event listeners
      callRef.current
        .on('loading', (event: any) => {
          console.log('⏳ [VideoDebug] Daily.js loading event:', {
            event,
            meetingState: callRef.current?.meetingState(),
            timestamp: new Date().toISOString()
          });
          setIsLoading(true);
        })
        .on('loaded', (event: any) => {
          console.log('✅ [VideoDebug] Daily.js loaded event:', {
            event,
            meetingState: callRef.current?.meetingState(),
            loadTime: performance.now() - initStartTime,
            timestamp: new Date().toISOString()
          });
          setIsLoading(false);
        })
        .on('joining-meeting', (event: any) => {
          console.log('🚪 [VideoDebug] Joining meeting event:', {
            event,
            meetingState: callRef.current?.meetingState(),
            timestamp: new Date().toISOString()
          });
        })
        .on('joined-meeting', (event: any) => {
          console.log('🎉 [VideoDebug] Joined meeting successfully:', {
            event,
            meetingState: callRef.current?.meetingState(),
            accessState: callRef.current?.accessState(),
            participants: callRef.current?.participantCounts(),
            totalTime: performance.now() - initStartTime,
            timestamp: new Date().toISOString()
          });
          setIsLoading(false);
          setIsReconnecting(false);
        })
        .on('left-meeting', (event: any) => {
          console.log('👋 [VideoDebug] Left meeting:', {
            event,
            meetingState: callRef.current?.meetingState(),
            timestamp: new Date().toISOString()
          });
          onClose();
        })
        .on('error', (event: any) => {
          console.error('❌ [VideoDebug] Daily.js error:', {
            event,
            errorMsg: event.errorMsg,
            action: event.action,
            type: event.type,
            meetingState: callRef.current?.meetingState(),
            accessState: callRef.current?.accessState(),
            timestamp: new Date().toISOString()
          });
          setError(`Connection error: ${event.errorMsg || 'Unknown error'}`);
          setIsLoading(false);
          
          // Attempt reconnection for network errors
          if (event.action === 'camera-error' || event.action === 'connection-error') {
            handleReconnect();
          }
        })
        .on('network-quality-change', (event: any) => {
          console.log('📶 [VideoDebug] Network quality change:', {
            quality: event.quality,
            threshold: event.threshold,
            meetingState: callRef.current?.meetingState(),
            timestamp: new Date().toISOString()
          });
          if (event.quality === 'low' || event.quality === 'very-low') {
            console.warn('⚠️ [VideoDebug] Poor network quality detected:', event.quality);
          }
        })
        .on('track-stopped', (event: any) => {
          console.log('🛑 [VideoDebug] Track stopped:', {
            event,
            meetingState: callRef.current?.meetingState(),
            timestamp: new Date().toISOString()
          });
        })
        .on('participant-joined', (event: any) => {
          console.log('👤 [VideoDebug] Participant joined:', {
            participant: event.participant,
            participantCounts: callRef.current?.participantCounts(),
            timestamp: new Date().toISOString()
          });
        })
        .on('participant-left', (event: any) => {
          console.log('👤 [VideoDebug] Participant left:', {
            participant: event.participant,
            participantCounts: callRef.current?.participantCounts(),
            timestamp: new Date().toISOString()
          });
        })
        .on('camera-error', (event: any) => {
          console.error('📷 [VideoDebug] Camera error:', {
            event,
            meetingState: callRef.current?.meetingState(),
            timestamp: new Date().toISOString()
          });
        })
        .on('recording-error', (event: any) => {
          console.error('🎥 [VideoDebug] Recording error:', event);
        })
        .on('app-message', (event: any) => {
          console.log('💬 [VideoDebug] App message:', event);
        })
        .on('network-connection', (event: any) => {
          console.log('🌐 [VideoDebug] Network connection event:', {
            event,
            meetingState: callRef.current?.meetingState(),
            timestamp: new Date().toISOString()
          });
        })
        .on('recording-started', (event: any) => {
          console.log('🔴 [VideoDebug] Recording started:', event);
        })
        .on('recording-stopped', (event: any) => {
          console.log('⏹️ [VideoDebug] Recording stopped:', event);
        });

      // Join the call with detailed logging
      console.log('🚀 [VideoDebug] Initiating join call with config:', {
        url: roomUrl,
        startVideoOff: true,
        startAudioOff: false,
        meetingState: callRef.current.meetingState()
      });
      
      const joinStartTime = performance.now();
      const joinPromise = callRef.current.join({
        url: roomUrl,
        startVideoOff: true,
        startAudioOff: false,
      });

      console.log('🔄 [VideoDebug] Join call initiated, meeting state:', callRef.current.meetingState());

      // Add timeout to log state progression
      setTimeout(() => {
        console.log('⏰ [VideoDebug] 5 seconds after join - meeting state:', {
          meetingState: callRef.current?.meetingState(),
          accessState: callRef.current?.accessState(),
          participantCounts: callRef.current?.participantCounts(),
          elapsedTime: performance.now() - joinStartTime
        });
      }, 5000);

      // Additional state checks at intervals
      setTimeout(() => {
        console.log('⏰ [VideoDebug] 10 seconds after join - meeting state:', {
          meetingState: callRef.current?.meetingState(),
          accessState: callRef.current?.accessState(),
          participantCounts: callRef.current?.participantCounts(),
          elapsedTime: performance.now() - joinStartTime
        });
      }, 10000);

      setTimeout(() => {
        console.log('⏰ [VideoDebug] 15 seconds after join - meeting state:', {
          meetingState: callRef.current?.meetingState(),
          accessState: callRef.current?.accessState(),
          participantCounts: callRef.current?.participantCounts(),
          elapsedTime: performance.now() - joinStartTime
        });
      }, 15000);

      // Wait for join to complete
      await joinPromise;
      
      console.log('✅ [VideoDebug] Join promise resolved:', {
        meetingState: callRef.current.meetingState(),
        accessState: callRef.current.accessState(),
        joinTime: performance.now() - joinStartTime,
        totalInitTime: performance.now() - initStartTime
      });

    } catch (err) {
      console.error('💥 [VideoDebug] Failed to initialize Daily.js call:', {
        error: err,
        message: err instanceof Error ? err.message : 'Unknown error',
        stack: err instanceof Error ? err.stack : undefined,
        meetingState: callRef.current?.meetingState(),
        accessState: callRef.current?.accessState(),
        timestamp: new Date().toISOString()
      });
      setError(`Failed to connect: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setIsLoading(false);
    }
  }, [roomUrl, isOpen, onClose]);

  // Cleanup call on unmount or close
  const cleanupCall = useCallback(() => {
    if (callRef.current) {
      console.log('🧹 [VideoDebug] Cleaning up Daily.js call:', {
        meetingState: callRef.current.meetingState(),
        accessState: callRef.current.accessState(),
        participantCounts: callRef.current.participantCounts(),
        timestamp: new Date().toISOString()
      });
      try {
        callRef.current.destroy();
        callRef.current = null;
        console.log('✅ [VideoDebug] Call cleanup completed successfully');
      } catch (err) {
        console.error('❌ [VideoDebug] Error cleaning up call:', {
          error: err,
          message: err instanceof Error ? err.message : 'Unknown error',
          timestamp: new Date().toISOString()
        });
      }
    } else {
      console.log('ℹ️ [VideoDebug] No active call to cleanup');
    }
  }, []);

  // Reconnection logic
  const handleReconnect = useCallback(async () => {
    if (isReconnecting) {
      console.log('⚠️ [VideoDebug] Reconnection already in progress, skipping');
      return;
    }
    
    console.log('🔄 [VideoDebug] Starting reconnection process:', {
      isReconnecting,
      currentMeetingState: callRef.current?.meetingState(),
      timestamp: new Date().toISOString()
    });
    setIsReconnecting(true);
    setError(null);
    
    // Clean up existing call
    cleanupCall();
    
    // Wait a moment before reconnecting
    setTimeout(() => {
      console.log('⏰ [VideoDebug] Reconnection delay complete, reinitializing call');
      initializeCall();
    }, 2000);
  }, [isReconnecting, cleanupCall, initializeCall]);

  // Initialize call when component opens
  useEffect(() => {
    console.log('🔄 [VideoDebug] useEffect triggered for initialization:', {
      isOpen,
      roomUrl,
      hasRoomUrl: !!roomUrl,
      timestamp: new Date().toISOString()
    });
    
    if (isOpen && roomUrl) {
      console.log('✅ [VideoDebug] Conditions met, initializing call');
      initializeCall();
    } else {
      console.log('❌ [VideoDebug] Conditions not met for initialization:', {
        isOpen,
        hasRoomUrl: !!roomUrl
      });
    }
    
    return () => {
      console.log('🧹 [VideoDebug] useEffect cleanup triggered:', {
        isOpen,
        timestamp: new Date().toISOString()
      });
      if (!isOpen) {
        cleanupCall();
      }
    };
  }, [isOpen, roomUrl, initializeCall, cleanupCall]);

  // Cleanup on unmount
  useEffect(() => {
    console.log('🎯 [VideoDebug] Component mounted, setting up unmount cleanup');
    return () => {
      console.log('🎯 [VideoDebug] Component unmounting, cleaning up');
      cleanupCall();
    };
  }, [cleanupCall]);

  const handleClose = () => {
    console.log('❌ [VideoDebug] handleClose triggered:', {
      meetingState: callRef.current?.meetingState(),
      timestamp: new Date().toISOString()
    });
    cleanupCall();
    onClose();
  };

  const toggleAudio = async () => {
    if (!callRef.current) {
      console.warn('⚠️ [VideoDebug] toggleAudio called but no active call');
      return;
    }
    
    console.log('🎤 [VideoDebug] toggleAudio called:', {
      currentState: isAudioEnabled,
      newState: !isAudioEnabled,
      meetingState: callRef.current.meetingState()
    });
    
    try {
      const newAudioState = !isAudioEnabled;
      await callRef.current.setLocalAudio(newAudioState);
      setIsAudioEnabled(newAudioState);
      
      console.log('✅ [VideoDebug] Audio toggle successful:', newAudioState);
      
      toast({
        title: newAudioState ? 'Microphone enabled' : 'Microphone disabled',
        description: newAudioState ? 'Your microphone is now on' : 'Your microphone is now off',
      });
    } catch (error) {
      console.error('❌ [VideoDebug] Error toggling audio:', {
        error,
        meetingState: callRef.current?.meetingState(),
        timestamp: new Date().toISOString()
      });
      toast({
        title: 'Error',
        description: 'Failed to toggle microphone',
        variant: 'destructive',
      });
    }
  };

  const toggleVideo = async () => {
    if (!callRef.current) {
      console.warn('⚠️ [VideoDebug] toggleVideo called but no active call');
      return;
    }
    
    console.log('📹 [VideoDebug] toggleVideo called:', {
      currentState: isVideoEnabled,
      newState: !isVideoEnabled,
      meetingState: callRef.current.meetingState()
    });
    
    try {
      const newVideoState = !isVideoEnabled;
      await callRef.current.setLocalVideo(newVideoState);
      setIsVideoEnabled(newVideoState);
      
      console.log('✅ [VideoDebug] Video toggle successful:', newVideoState);
      
      toast({
        title: newVideoState ? 'Camera enabled' : 'Camera disabled',
        description: newVideoState ? 'Your camera is now on' : 'Your camera is now off',
      });
    } catch (error) {
      console.error('❌ [VideoDebug] Error toggling video:', {
        error,
        meetingState: callRef.current?.meetingState(),
        timestamp: new Date().toISOString()
      });
      toast({
        title: 'Error',
        description: 'Failed to toggle camera',
        variant: 'destructive',
      });
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) {
      console.warn('⚠️ [VideoDebug] toggleFullscreen called but no container ref');
      return;
    }
    
    console.log('🔳 [VideoDebug] toggleFullscreen called:', {
      currentState: isFullscreen,
      newState: !isFullscreen,
      containerElement: !!containerRef.current
    });
    
    try {
      if (!isFullscreen) {
        if (containerRef.current.requestFullscreen) {
          containerRef.current.requestFullscreen();
          console.log('✅ [VideoDebug] Fullscreen request initiated');
        } else {
          console.warn('⚠️ [VideoDebug] Fullscreen not supported');
        }
      } else {
        if (document.exitFullscreen) {
          document.exitFullscreen();
          console.log('✅ [VideoDebug] Fullscreen exit initiated');
        } else {
          console.warn('⚠️ [VideoDebug] Exit fullscreen not supported');
        }
      }
    } catch (error) {
      console.error('❌ [VideoDebug] Error toggling fullscreen:', {
        error,
        timestamp: new Date().toISOString()
      });
      toast({
        title: 'Error',
        description: 'Failed to toggle fullscreen',
        variant: 'destructive',
      });
    }
  };

  // Listen for fullscreen changes
  useEffect(() => {
    console.log('👂 [VideoDebug] Setting up fullscreen event listeners');
    
    const handleFullscreenChange = () => {
      const newFullscreenState = !!document.fullscreenElement;
      console.log('🔳 [VideoDebug] Fullscreen state changed:', {
        previousState: isFullscreen,
        newState: newFullscreenState,
        fullscreenElement: document.fullscreenElement?.tagName || 'none'
      });
      setIsFullscreen(newFullscreenState);
    };
    
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      console.log('🧹 [VideoDebug] Cleaning up fullscreen event listeners');
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
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