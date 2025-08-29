
import VideoSessionDialog from './VideoSessionDialog';

interface VideoChatProps {
  roomUrl: string;
  isOpen: boolean;
  onClose: () => void;
}

const VideoChat: React.FC<VideoChatProps> = ({ roomUrl, isOpen, onClose }) => {
  // Use the new VideoSessionDialog component for enhanced Daily.js integration
  return (
    <VideoSessionDialog
      roomUrl={roomUrl}
      isOpen={isOpen}
      onClose={onClose}
    />
  );
};

export default VideoChat;
