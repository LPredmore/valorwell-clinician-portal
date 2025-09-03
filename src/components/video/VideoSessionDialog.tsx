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
  // 🔥 INSANE LOGGING: Timestamp helper
  const timestamp = () => `[${new Date().toISOString()}]`;
  const logId = `VideoSessionDialog-${Math.random().toString(36).substr(2, 9)}`;
  
  console.log(`🔥 ${timestamp()} [${logId}] Component initialized with props:`, {
    roomUrl,
    isOpen,
    onClose: typeof onClose,
    roomUrlValid: !!roomUrl,
    roomUrlLength: roomUrl?.length || 0,
    roomUrlType: typeof roomUrl,
    roomUrlStartsWith: roomUrl?.substring(0, 30),
    timestamp: new Date().toISOString()
  });

  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [callObj, setCallObj] = useState<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // 🔥 INSANE LOGGING: State change tracker
  useEffect(() => {
    console.log(`🔥 ${timestamp()} [${logId}] State change - isLoading:`, {
      isLoading,
      timestamp: new Date().toISOString()
    });
  }, [isLoading]);

  useEffect(() => {
    console.log(`🔥 ${timestamp()} [${logId}] State change - error:`, {
      error,
      timestamp: new Date().toISOString()
    });
  }, [error]);

  useEffect(() => {
    console.log(`🔥 ${timestamp()} [${logId}] State change - callObj:`, {
      hasCallObj: !!callObj,
      callObjType: typeof callObj,
      timestamp: new Date().toISOString()
    });
  }, [callObj]);
  
  // 🔥 INSANE LOGGING: Effect 1 - Create Daily frame when container is ready
  useEffect(() => {
    console.log(`🔥 ${timestamp()} [${logId}] Effect 1 triggered:`, {
      isOpen,
      hasContainer: !!containerRef.current,
      hasCallObj: !!callObj,
      containerElement: containerRef.current ? 'HTMLElement' : null,
      shouldCreateFrame: isOpen && containerRef.current && !callObj,
      timestamp: new Date().toISOString()
    });

    if (isOpen && containerRef.current && !callObj) {
      console.log(`🔥 ${timestamp()} [${logId}] CREATING DAILY FRAME - All conditions met`);
      console.log(`🔥 ${timestamp()} [${logId}] Container ref details:`, {
        container: containerRef.current,
        containerTagName: containerRef.current?.tagName,
        containerClientWidth: containerRef.current?.clientWidth,
        containerClientHeight: containerRef.current?.clientHeight,
        timestamp: new Date().toISOString()
      });
      
      try {
        console.log(`🔥 ${timestamp()} [${logId}] Calling DailyIframe.createFrame...`);
        const frameStartTime = performance.now();
        
        const newCall = DailyIframe.createFrame(containerRef.current, {
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

        const frameEndTime = performance.now();
        console.log(`🔥 ${timestamp()} [${logId}] Daily frame created successfully:`, {
          creationTime: `${frameEndTime - frameStartTime}ms`,
          callObject: !!newCall,
          callObjectType: typeof newCall,
          timestamp: new Date().toISOString()
        });

        // 🔥 INSANE LOGGING: Event listeners with detailed logging
        console.log(`🔥 ${timestamp()} [${logId}] Setting up event listeners...`);
        
        newCall
          .on('loaded', (event: any) => {
            console.log(`🔥 ${timestamp()} [${logId}] 🎉 DAILY EVENT: loaded`, {
              event,
              timestamp: new Date().toISOString()
            });
            setIsLoading(false);
          })
          .on('joined-meeting', (event: any) => {
            console.log(`🔥 ${timestamp()} [${logId}] 🎉 DAILY EVENT: joined-meeting`, {
              event,
              timestamp: new Date().toISOString()
            });
            setIsLoading(false);
          })
          .on('left-meeting', (event: any) => {
            console.log(`🔥 ${timestamp()} [${logId}] 🎉 DAILY EVENT: left-meeting`, {
              event,
              timestamp: new Date().toISOString()
            });
            onClose();
          })
          .on('error', (event: any) => {
            console.log(`🔥 ${timestamp()} [${logId}] 🚨 DAILY EVENT: error`, {
              event,
              errorMsg: event.errorMsg,
              timestamp: new Date().toISOString()
            });
            setError(`Connection error: ${event.errorMsg || 'Unknown error'}`);
            setIsLoading(false);
          })
          .on('meeting-session-updated', (event: any) => {
            console.log(`🔥 ${timestamp()} [${logId}] 🎉 DAILY EVENT: meeting-session-updated`, {
              event,
              timestamp: new Date().toISOString()
            });
          })
          .on('participant-joined', (event: any) => {
            console.log(`🔥 ${timestamp()} [${logId}] 🎉 DAILY EVENT: participant-joined`, {
              event,
              timestamp: new Date().toISOString()
            });
          });

        console.log(`🔥 ${timestamp()} [${logId}] Event listeners set up, storing callObj...`);
        setCallObj(newCall);
        console.log(`🔥 ${timestamp()} [${logId}] CallObj stored in state`);

      } catch (err) {
        console.log(`🔥 ${timestamp()} [${logId}] 🚨 ERROR creating Daily frame:`, {
          error: err,
          errorMessage: err instanceof Error ? err.message : 'Unknown error',
          errorStack: err instanceof Error ? err.stack : null,
          timestamp: new Date().toISOString()
        });
        setError(`Failed to initialize: ${err instanceof Error ? err.message : 'Unknown error'}`);
        setIsLoading(false);
      }
    } else if (!isOpen) {
      console.log(`🔥 ${timestamp()} [${logId}] Dialog closed - clearing callObj`);
      setCallObj(null);
    } else {
      console.log(`🔥 ${timestamp()} [${logId}] Effect 1 - conditions not met:`, {
        isOpen,
        hasContainer: !!containerRef.current,
        hasCallObj: !!callObj,
        timestamp: new Date().toISOString()
      });
    }
  }, [isOpen, containerRef.current, callObj]);

  // 🔥 INSANE LOGGING: Effect 2 - Join call after callObj is created
  useEffect(() => {
    console.log(`🔥 ${timestamp()} [${logId}] Effect 2 triggered - Join meeting:`, {
      hasCallObj: !!callObj,
      roomUrl,
      roomUrlValid: !!roomUrl,
      roomUrlLength: roomUrl?.length || 0,
      roomUrlType: typeof roomUrl,
      roomUrlStartsWith: roomUrl?.substring(0, 30),
      shouldJoin: !!(callObj && roomUrl),
      timestamp: new Date().toISOString()
    });

    if (callObj && roomUrl) {
      console.log(`🔥 ${timestamp()} [${logId}] 🚀 JOINING MEETING - All conditions met`);
      console.log(`🔥 ${timestamp()} [${logId}] Join parameters:`, {
        url: roomUrl,
        startVideoOff: false,
        startAudioOff: false,
        timestamp: new Date().toISOString()
      });
      
      const joinStartTime = performance.now();
      
      callObj.join({ 
        url: roomUrl, 
        startVideoOff: false, 
        startAudioOff: false 
      }).then((result: any) => {
        const joinEndTime = performance.now();
        console.log(`🔥 ${timestamp()} [${logId}] 🎉 JOIN SUCCESSFUL:`, {
          result,
          joinTime: `${joinEndTime - joinStartTime}ms`,
          timestamp: new Date().toISOString()
        });
      }).catch((err: any) => {
        const joinEndTime = performance.now();
        console.log(`🔥 ${timestamp()} [${logId}] 🚨 JOIN FAILED:`, {
          error: err,
          errorMessage: err.message || 'Unknown error',
          errorStack: err.stack,
          joinTime: `${joinEndTime - joinStartTime}ms`,
          roomUrl,
          timestamp: new Date().toISOString()
        });
        setError(`Failed to connect: ${err.message || 'Unknown error'}`);
        setIsLoading(false);
      });
    } else {
      console.log(`🔥 ${timestamp()} [${logId}] Effect 2 - conditions not met for joining:`, {
        hasCallObj: !!callObj,
        hasRoomUrl: !!roomUrl,
        roomUrl,
        timestamp: new Date().toISOString()
      });
    }
  }, [callObj, roomUrl]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (callObj) {
        callObj.destroy();
      }
    };
  }, [callObj]);

  const handleClose = () => {
    if (callObj) {
      callObj.destroy();
    }
    onClose();
  };

  const toggleAudio = async () => {
    if (!callObj) return;
    
    try {
      const newAudioState = !isAudioEnabled;
      await callObj.setLocalAudio(newAudioState);
      setIsAudioEnabled(newAudioState);
      
      toast({
        title: newAudioState ? 'Microphone enabled' : 'Microphone disabled',
        description: newAudioState ? 'Your microphone is now on' : 'Your microphone is now off',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to toggle microphone',
        variant: 'destructive',
      });
    }
  };

  const toggleVideo = async () => {
    if (!callObj) return;
    
    try {
      const newVideoState = !isVideoEnabled;
      await callObj.setLocalVideo(newVideoState);
      setIsVideoEnabled(newVideoState);
      
      toast({
        title: newVideoState ? 'Camera enabled' : 'Camera disabled',
        description: newVideoState ? 'Your camera is now on' : 'Your camera is now off',
      });
    } catch (error) {
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
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const renderVideoContent = () => {
    return (
      <div ref={containerRef} className="relative w-full h-full">
        {/* Loading overlay */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 z-10">
            <div className="text-center text-white">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
              <p>Loading video session...</p>
            </div>
          </div>
        )}
        
        {/* Error overlay */}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-90 z-20">
            <div className="text-center text-white">
              <p className="text-red-400 mb-4">{error}</p>
              <Button variant="outline" onClick={handleClose}>Close</Button>
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