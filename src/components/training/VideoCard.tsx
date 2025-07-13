import { useState } from 'react';
import { Play, Loader2 } from 'lucide-react';
import { TrainingVideo } from '@/data/trainingVideos';

interface VideoCardProps {
  video: TrainingVideo;
}

const VideoCard = ({ video }: VideoCardProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const handleIframeLoad = () => {
    setIsLoading(false);
  };

  const handleIframeError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  const IconComponent = video.icon;

  return (
    <div className="bg-card rounded-lg border border-border overflow-hidden hover:shadow-lg transition-shadow duration-300">
      {/* Video Container */}
      <div className="aspect-video relative bg-muted">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}
        
        {hasError ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted">
            <Play className="h-12 w-12 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground text-center px-4">
              Video unavailable. Please try again later.
            </p>
          </div>
        ) : (
          <iframe
            src={video.embedUrl}
            title={video.title}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            onLoad={handleIframeLoad}
            onError={handleIframeError}
          />
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <IconComponent className="h-4 w-4 text-primary" />
          <h3 className="font-semibold text-foreground">{video.title}</h3>
        </div>
        <p className="text-sm text-muted-foreground">{video.description}</p>
      </div>
    </div>
  );
};

export default VideoCard;