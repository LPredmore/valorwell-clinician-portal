
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Copy, RefreshCw, Video } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getOrCreateVideoRoom } from '@/integrations/supabase/client';

interface VideoLinkSectionProps {
  appointmentId: string;
  videoUrl: string | null;
  onVideoLinkUpdated: () => void;
}

const VideoLinkSection: React.FC<VideoLinkSectionProps> = ({
  appointmentId,
  videoUrl,
  onVideoLinkUpdated
}) => {
  const [isRegeneratingLink, setIsRegeneratingLink] = useState(false);
  const { toast } = useToast();

  const copyVideoUrlToClipboard = () => {
    if (!videoUrl) return;
    
    navigator.clipboard.writeText(videoUrl)
      .then(() => {
        toast({
          title: "Link Copied",
          description: "Video call link copied to clipboard",
        });
      })
      .catch((err) => {
        console.error('Could not copy text: ', err);
        toast({
          title: "Copy Failed",
          description: "Could not copy link to clipboard",
          variant: "destructive"
        });
      });
  };

  const regenerateVideoLink = async () => {
    if (!appointmentId) return;
    
    setIsRegeneratingLink(true);
    try {
      // Get a new video room URL, passing true to force regeneration
      const result = await getOrCreateVideoRoom(appointmentId, true);
      
      if (!result.success || result.error) {
        throw new Error(result.error?.message || 'Failed to regenerate video link');
      }
      
      toast({
        title: "Success",
        description: "Video call link has been regenerated",
      });
      
      onVideoLinkUpdated(); // Refresh appointment data
    } catch (error) {
      console.error('Error regenerating video link:', error);
      toast({
        title: "Error",
        description: "Failed to regenerate video link",
        variant: "destructive"
      });
    } finally {
      setIsRegeneratingLink(false);
    }
  };

  return (
    <div className="pt-2">
      <Label className="text-sm font-medium">Video Call Link</Label>
      <div className="mt-2 flex items-center space-x-2">
        {videoUrl ? (
          <>
            <div className="flex-1 bg-gray-50 border rounded p-2 text-xs overflow-hidden text-ellipsis">
              {videoUrl}
            </div>
            <Button
              size="icon"
              variant="outline"
              onClick={copyVideoUrlToClipboard}
              title="Copy link"
            >
              <Copy className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="outline"
              onClick={regenerateVideoLink}
              disabled={isRegeneratingLink}
              title="Regenerate link"
            >
              {isRegeneratingLink ? (
                <div className="animate-spin">
                  <RefreshCw className="h-4 w-4" />
                </div>
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          </>
        ) : (
          <>
            <div className="flex-1 bg-gray-50 border rounded p-2 text-xs italic text-gray-500">
              No video link available
            </div>
            <Button
              size="icon"
              variant="outline"
              onClick={regenerateVideoLink}
              disabled={isRegeneratingLink}
              title="Generate link"
            >
              {isRegeneratingLink ? (
                <div className="animate-spin">
                  <RefreshCw className="h-4 w-4" />
                </div>
              ) : (
                <Video className="h-4 w-4" />
              )}
            </Button>
          </>
        )}
      </div>
      <p className="text-xs text-muted-foreground mt-1">
        Share this link with your client. They can use it to join the video session.
      </p>
    </div>
  );
};

export default VideoLinkSection;
