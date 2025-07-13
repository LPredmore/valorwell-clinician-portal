import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X, Download, ExternalLink, FileText, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface DocumentViewerDialogProps {
  isOpen: boolean;
  onClose: () => void;
  documentUrl: string;
  documentTitle: string;
  documentType: string;
  documentDate?: string;
}

const DocumentViewerDialog: React.FC<DocumentViewerDialogProps> = ({
  isOpen,
  onClose,
  documentUrl,
  documentTitle,
  documentType,
  documentDate
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const { toast } = useToast();

  const handleLoad = () => {
    setIsLoading(false);
    setHasError(false);
  };

  const handleError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  const handleOpenInNewTab = () => {
    window.open(documentUrl, '_blank');
  };

  const handleDownload = () => {
    try {
      const link = document.createElement('a');
      link.href = documentUrl;
      link.download = documentTitle;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: "Download Failed",
        description: "Unable to download the document. Please try opening in a new tab.",
        variant: "destructive"
      });
    }
  };

  const resetState = () => {
    setIsLoading(true);
    setHasError(false);
  };

  const handleDialogChange = (open: boolean) => {
    if (!open) {
      onClose();
      // Reset state when dialog closes
      setTimeout(resetState, 300);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogChange}>
      <DialogContent className="max-w-6xl w-full h-[90vh] p-0 gap-0">
        <DialogHeader className="p-6 pb-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-valorwell-600" />
              <div>
                <DialogTitle className="text-lg font-semibold">{documentTitle}</DialogTitle>
                <DialogDescription className="text-sm text-gray-500">
                  {documentType}
                  {documentDate && ` • ${documentDate}`}
                </DialogDescription>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownload}
                disabled={!documentUrl}
              >
                <Download className="h-4 w-4 mr-1" />
                Download
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleOpenInNewTab}
                disabled={!documentUrl}
              >
                <ExternalLink className="h-4 w-4 mr-1" />
                Open in New Tab
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>
        
        <div className="flex-1 relative overflow-hidden">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-valorwell-600" />
                <p className="text-sm text-gray-600">Loading document...</p>
              </div>
            </div>
          )}
          
          {hasError && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
              <div className="flex flex-col items-center gap-4 max-w-md text-center p-6">
                <FileText className="h-12 w-12 text-gray-400" />
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Unable to display document
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    This document type cannot be displayed in the preview. You can download it or open it in a new tab to view it.
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleDownload} size="sm">
                    <Download className="h-4 w-4 mr-1" />
                    Download
                  </Button>
                  <Button variant="outline" onClick={handleOpenInNewTab} size="sm">
                    <ExternalLink className="h-4 w-4 mr-1" />
                    Open in New Tab
                  </Button>
                </div>
              </div>
            </div>
          )}
          
          {documentUrl && (
            <iframe
              src={documentUrl}
              className="w-full h-full border-0"
              onLoad={handleLoad}
              onError={handleError}
              sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
              title={documentTitle}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DocumentViewerDialog;