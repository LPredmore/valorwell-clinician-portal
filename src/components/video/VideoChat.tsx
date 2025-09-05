
console.log("[VideoChat] file loaded");

import React, { useEffect } from 'react';
import VideoSessionDialog from './VideoSessionDialog';

interface VideoChatProps {
  roomUrl: string;
  isOpen: boolean;
  onClose: () => void;
}

const VideoChat: React.FC<VideoChatProps> = ({ roomUrl, isOpen, onClose }) => {
  // 🔥 INSANE LOGGING: VideoChat Component Lifecycle
  const timestamp = () => `[${new Date().toISOString()}]`;
  
  useEffect(() => {
    console.log(`🔥 ${timestamp()} [VideoChat] Component mounted with props:`, {
      roomUrl,
      isOpen,
      onClose: typeof onClose,
      roomUrlValid: !!roomUrl,
      roomUrlLength: roomUrl?.length || 0,
      roomUrlType: typeof roomUrl,
      timestamp: new Date().toISOString()
    });
  }, []);

  useEffect(() => {
    console.log(`🔥 ${timestamp()} [VideoChat] Props changed:`, {
      roomUrl,
      isOpen,
      onClose: typeof onClose,
      roomUrlValid: !!roomUrl,
      roomUrlLength: roomUrl?.length || 0,
      roomUrlStartsWith: roomUrl?.substring(0, 20),
      timestamp: new Date().toISOString()
    });
  }, [roomUrl, isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      console.log(`🔥 ${timestamp()} [VideoChat] Dialog opening with room URL:`, {
        roomUrl,
        isValidDailyUrl: roomUrl?.includes('daily.co'),
        timestamp: new Date().toISOString()
      });
    } else {
      console.log(`🔥 ${timestamp()} [VideoChat] Dialog closing`, {
        timestamp: new Date().toISOString()
      });
    }
  }, [isOpen, roomUrl]);

  const handleClose = () => {
    console.log(`🔥 ${timestamp()} [VideoChat] Close handler called`, {
      timestamp: new Date().toISOString()
    });
    onClose();
  };

  console.log(`🔥 ${timestamp()} [VideoChat] Rendering with props:`, {
    roomUrl,
    isOpen,
    roomUrlValid: !!roomUrl,
    timestamp: new Date().toISOString()
  });

  // Use the new VideoSessionDialog component for enhanced Daily.js integration
  return (
    <VideoSessionDialog
      roomUrl={roomUrl}
      isOpen={isOpen}
      onClose={handleClose}
    />
  );
};

export default VideoChat;
