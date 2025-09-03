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
  const [callObj, setCallObj] = useState<any>(null);
  const [iframeMounted, setIframeMounted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  
  // Iframe mounting detection effect
  useEffect(() => {
    console.log('🔍 [VideoDebug] Iframe mounting check:', {
      isOpen,
      iframeRef: !!iframeRef.current,
      iframeMounted,
      containerRef: !!containerRef.current,
      timestamp: new Date().toISOString()
    });

    if (isOpen && iframeRef.current && !iframeMounted) {
      console.log('✅ [VideoDebug] Iframe detected in DOM, marking as mounted');
      setIframeMounted(true);
    } else if (!isOpen) {
      console.log('🔄 [VideoDebug] Dialog closed, resetting iframe mounted state');
      setIframeMounted(false);
    }
  }, [isOpen, iframeMounted]);

  // Periodic iframe existence check (every 100ms until mounted)
  useEffect(() => {
    if (!isOpen || iframeMounted) return;

    console.log('⏰ [VideoDebug] Starting periodic iframe check...');
    
    const checkInterval = setInterval(() => {
      console.log('🔍 [VideoDebug] Periodic iframe check:', {
        iframeExists: !!iframeRef.current,
        iframeMounted,
        containerExists: !!containerRef.current,
        renderingState: { isLoading, error: !!error },
        timestamp: new Date().toISOString()
      });

      if (iframeRef.current && !iframeMounted) {
        console.log('✅ [VideoDebug] Iframe found via periodic check!');
        setIframeMounted(true);
      }
    }, 100);

    // Safety timeout - stop checking after 10 seconds
    const timeoutId = setTimeout(() => {
      console.warn('⚠️ [VideoDebug] Iframe mounting timeout after 10 seconds');
      clearInterval(checkInterval);
      if (!iframeMounted) {
        setError('Video interface failed to initialize (iframe not found)');
      }
    }, 10000);

    return () => {
      console.log('🧹 [VideoDebug] Cleaning up periodic iframe check');
      clearInterval(checkInterval);
      clearTimeout(timeoutId);
    };
  }, [isOpen, iframeMounted, isLoading, error]);

  // Effect 1: Create Daily frame when iframe is confirmed mounted
  useEffect(() => {
    console.log('🔄 [VideoDebug] Frame creation effect triggered:', {
      isOpen,
      iframeMounted,
      iframeExists: !!iframeRef.current,
      callObjExists: !!callObj,
      timestamp: new Date().toISOString()
    });

    if (isOpen && iframeMounted && iframeRef.current && !callObj) {
      console.log('✅ [VideoDebug] Creating Daily frame - iframe is mounted');
      
      const frameStartTime = performance.now();
      
      try {
        console.log('🏗️ [VideoDebug] Pre-frame validation:', {
          roomUrl,
          isValidUrl: /^https:\/\/.*\.daily\.co\//.test(roomUrl),
          iframeRef: !!iframeRef.current,
          callObj: !!callObj,
          userAgent: navigator.userAgent,
          connection: navigator.onLine ? 'online' : 'offline'
        });

        const newCall = DailyIframe.createFrame(iframeRef.current, {
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
          meetingState: newCall.meetingState(),
          participantCounts: newCall.participantCounts()
        });

        // Set up comprehensive event listeners
        newCall
          .on('loading', (event: any) => {
            console.log('⏳ [VideoDebug] Daily.js loading event:', {
              event,
              meetingState: newCall?.meetingState(),
              timestamp: new Date().toISOString()
            });
            setIsLoading(true);
          })
          .on('loaded', (event: any) => {
            console.log('✅ [VideoDebug] Daily.js loaded event:', {
              event,
              meetingState: newCall?.meetingState(),
              loadTime: performance.now() - frameStartTime,
              timestamp: new Date().toISOString()
            });
            setIsLoading(false);
          })
          .on('joining-meeting', (event: any) => {
            console.log('🚪 [VideoDebug] Joining meeting event:', {
              event,
              meetingState: newCall?.meetingState(),
              timestamp: new Date().toISOString()
            });
          })
          .on('joined-meeting', (event: any) => {
            console.log('🎉 [VideoDebug] Joined meeting successfully:', {
              event,
              meetingState: newCall?.meetingState(),
              participants: newCall?.participantCounts(),
              timestamp: new Date().toISOString()
            });
            setIsLoading(false);
            setIsReconnecting(false);
          })
          .on('left-meeting', (event: any) => {
            console.log('👋 [VideoDebug] Left meeting:', {
              event,
              meetingState: newCall?.meetingState(),
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
              meetingState: newCall?.meetingState(),
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
              meetingState: newCall?.meetingState(),
              timestamp: new Date().toISOString()
            });
            if (event.quality === 'low' || event.quality === 'very-low') {
              console.warn('⚠️ [VideoDebug] Poor network quality detected:', event.quality);
            }
          })
          .on('track-stopped', (event: any) => {
            console.log('🛑 [VideoDebug] Track stopped:', {
              event,
              meetingState: newCall?.meetingState(),
              timestamp: new Date().toISOString()
            });
          })
          .on('participant-joined', (event: any) => {
            console.log('👤 [VideoDebug] Participant joined:', {
              participant: event.participant,
              participantCounts: newCall?.participantCounts(),
              timestamp: new Date().toISOString()
            });
          })
          .on('participant-left', (event: any) => {
            console.log('👤 [VideoDebug] Participant left:', {
              participant: event.participant,
              participantCounts: newCall?.participantCounts(),
              timestamp: new Date().toISOString()
            });
          })
          .on('camera-error', (event: any) => {
            console.error('📷 [VideoDebug] Camera error:', {
              event,
              meetingState: newCall?.meetingState(),
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
              meetingState: newCall?.meetingState(),
              timestamp: new Date().toISOString()
            });
          })
          .on('recording-started', (event: any) => {
            console.log('🔴 [VideoDebug] Recording started:', event);
          })
          .on('recording-stopped', (event: any) => {
            console.log('⏹️ [VideoDebug] Recording stopped:', event);
          });

        setCallObj(newCall);
        console.log('✅ [VideoDebug] Call object stored in state');

      } catch (err) {
        console.error('💥 [VideoDebug] Failed to create Daily frame:', {
          error: err,
          message: err instanceof Error ? err.message : 'Unknown error',
          stack: err instanceof Error ? err.stack : undefined,
          timestamp: new Date().toISOString()
        });
        setError(`Failed to initialize: ${err instanceof Error ? err.message : 'Unknown error'}`);
        setIsLoading(false);
      }
    } else if (!isOpen) {
      console.log('🔄 [VideoDebug] Dialog closed, clearing call object');
      setCallObj(null);
    }
  }, [isOpen, iframeMounted, callObj]);

  // Effect 2: Join call after callObj is created (like client portal)
  useEffect(() => {
    console.log('🎯 [VideoDebug] Join effect triggered:', {
      callObjExists: !!callObj,
      roomUrl,
      hasRoomUrl: !!roomUrl,
      timestamp: new Date().toISOString()
    });

    if (callObj && roomUrl) {
      console.log('✅ [VideoDebug] Call object ready, joining meeting');
      
      const joinStartTime = performance.now();
      
      // Join the call with detailed logging
      console.log('🚀 [VideoDebug] Initiating join call with config:', {
        url: roomUrl,
        startVideoOff: true,
        startAudioOff: false,
        meetingState: callObj.meetingState()
      });

      const joinCall = async () => {
        try {
          const joinPromise = callObj.join({
            url: roomUrl,
            startVideoOff: true,
            startAudioOff: false,
          });

          console.log('🔄 [VideoDebug] Join call initiated, meeting state:', callObj.meetingState());

          // Add timeout to log state progression
          setTimeout(() => {
            console.log('⏰ [VideoDebug] 5 seconds after join - meeting state:', {
              meetingState: callObj?.meetingState(),
              participantCounts: callObj?.participantCounts(),
              elapsedTime: performance.now() - joinStartTime
            });
          }, 5000);

          // Additional state checks at intervals
          setTimeout(() => {
            console.log('⏰ [VideoDebug] 10 seconds after join - meeting state:', {
              meetingState: callObj?.meetingState(),
              participantCounts: callObj?.participantCounts(),
              elapsedTime: performance.now() - joinStartTime
            });
          }, 10000);

          setTimeout(() => {
            console.log('⏰ [VideoDebug] 15 seconds after join - meeting state:', {
              meetingState: callObj?.meetingState(),
              participantCounts: callObj?.participantCounts(),
              elapsedTime: performance.now() - joinStartTime
            });
          }, 15000);

          // Wait for join to complete
          await joinPromise;
          
          console.log('✅ [VideoDebug] Join promise resolved:', {
            meetingState: callObj.meetingState(),
            joinTime: performance.now() - joinStartTime
          });

        } catch (err) {
          console.error('💥 [VideoDebug] Failed to join Daily.js call:', {
            error: err,
            message: err instanceof Error ? err.message : 'Unknown error',
            stack: err instanceof Error ? err.stack : undefined,
            meetingState: callObj?.meetingState(),
            timestamp: new Date().toISOString()
          });
          setError(`Failed to connect: ${err instanceof Error ? err.message : 'Unknown error'}`);
          setIsLoading(false);
        }
      };

      joinCall();
    }
  }, [callObj, roomUrl]);

  // Cleanup call on unmount or close
  const cleanupCall = useCallback(() => {
    if (callObj) {
      console.log('🧹 [VideoDebug] Cleaning up Daily.js call:', {
        meetingState: callObj.meetingState(),
        participantCounts: callObj.participantCounts(),
        timestamp: new Date().toISOString()
      });
      try {
        callObj.destroy();
        setCallObj(null);
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
  }, [callObj]);

  // Reconnection logic
  const handleReconnect = useCallback(async () => {
    if (isReconnecting) {
      console.log('⚠️ [VideoDebug] Reconnection already in progress, skipping');
      return;
    }
    
    console.log('🔄 [VideoDebug] Starting reconnection process:', {
      isReconnecting,
      currentMeetingState: callObj?.meetingState(),
      timestamp: new Date().toISOString()
    });
    setIsReconnecting(true);
    setError(null);
    
    // Clean up existing call
    cleanupCall();
    
    // Wait a moment before reconnecting - this will trigger the first effect again
    setTimeout(() => {
      console.log('⏰ [VideoDebug] Reconnection delay complete, will recreate frame');
      // The first effect will handle recreation since callObj is now null
    }, 2000);
  }, [isReconnecting, cleanupCall]);

  // Cleanup on dialog close or unmount
  useEffect(() => {
    return () => {
      console.log('🎯 [VideoDebug] Component unmounting, cleaning up');
      if (callObj) {
        callObj.destroy();
      }
    };
  }, [callObj]);

  const handleClose = () => {
    console.log('❌ [VideoDebug] handleClose triggered:', {
      meetingState: callObj?.meetingState(),
      timestamp: new Date().toISOString()
    });
    cleanupCall();
    onClose();
  };

  const toggleAudio = async () => {
    if (!callObj) {
      console.warn('⚠️ [VideoDebug] toggleAudio called but no active call');
      return;
    }
    
    console.log('🎤 [VideoDebug] toggleAudio called:', {
      currentState: isAudioEnabled,
      newState: !isAudioEnabled,
      meetingState: callObj.meetingState()
    });
    
    try {
      const newAudioState = !isAudioEnabled;
      await callObj.setLocalAudio(newAudioState);
      setIsAudioEnabled(newAudioState);
      
      console.log('✅ [VideoDebug] Audio toggle successful:', newAudioState);
      
      toast({
        title: newAudioState ? 'Microphone enabled' : 'Microphone disabled',
        description: newAudioState ? 'Your microphone is now on' : 'Your microphone is now off',
      });
    } catch (error) {
      console.error('❌ [VideoDebug] Error toggling audio:', {
        error,
        meetingState: callObj?.meetingState(),
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
    if (!callObj) {
      console.warn('⚠️ [VideoDebug] toggleVideo called but no active call');
      return;
    }
    
    console.log('📹 [VideoDebug] toggleVideo called:', {
      currentState: isVideoEnabled,
      newState: !isVideoEnabled,
      meetingState: callObj.meetingState()
    });
    
    try {
      const newVideoState = !isVideoEnabled;
      await callObj.setLocalVideo(newVideoState);
      setIsVideoEnabled(newVideoState);
      
      console.log('✅ [VideoDebug] Video toggle successful:', newVideoState);
      
      toast({
        title: newVideoState ? 'Camera enabled' : 'Camera disabled',
        description: newVideoState ? 'Your camera is now on' : 'Your camera is now off',
      });
    } catch (error) {
      console.error('❌ [VideoDebug] Error toggling video:', {
        error,
        meetingState: callObj?.meetingState(),
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

  const renderVideoContent = () => {
    console.log('🎨 [VideoDebug] Rendering video content:', {
      isLoading,
      error: !!error,
      errorMessage: error,
      iframeMounted,
      iframeExists: !!iframeRef.current,
      timestamp: new Date().toISOString()
    });

    return (
      <div ref={containerRef} className="relative w-full h-full">
        {/* Always render iframe but control visibility */}
        <div className="w-full h-full">
          <iframe
            ref={iframeRef}
            className="w-full h-full border-0 rounded-lg"
            allow="camera; microphone; fullscreen; display-capture"
            style={{ 
              visibility: error ? 'hidden' : 'visible',
              position: error ? 'absolute' : 'relative'
            }}
          />
        </div>
        
        {/* Loading overlay */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 z-10">
            <div className="text-center text-white">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
              <p>{isReconnecting ? 'Reconnecting...' : 'Loading video session...'}</p>
              <p className="text-xs mt-2 opacity-75">
                Iframe: {iframeMounted ? '✅ Mounted' : '⏳ Waiting'} | 
                Call: {callObj ? '✅ Ready' : '⏳ Waiting'}
              </p>
            </div>
          </div>
        )}
        
        {/* Error overlay */}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-90 z-20">
            <div className="text-center text-white">
              <p className="text-red-400 mb-4">{error}</p>
              <div className="space-x-2">
                <Button onClick={handleReconnect} disabled={isReconnecting}>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  {isReconnecting ? 'Reconnecting...' : 'Reconnect'}
                </Button>
                <Button variant="outline" onClick={handleClose}>Close</Button>
              </div>
              <p className="text-xs mt-4 opacity-75">
                Debug: Iframe {iframeMounted ? 'mounted' : 'not mounted'}, 
                Call {callObj ? 'created' : 'not created'}
              </p>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderControls = () => (
    <CardFooter className="flex justify-center items-center space-x-4 p-4">
      <Button
        variant={isAudioEnabled ? "default" : "outline"}
        size="icon"
        onClick={toggleAudio}
        disabled={!callObj}
      >
        {isAudioEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
      </Button>
      <Button
        variant={isVideoEnabled ? "default" : "outline"}
        size="icon"
        onClick={toggleVideo}
        disabled={!callObj}
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