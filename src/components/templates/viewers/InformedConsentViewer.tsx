import React, { useState, useEffect } from 'react';
import DocumentViewerDialog from '@/components/ui/DocumentViewerDialog';
import { getDocumentDownloadURL } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface InformedConsentViewerProps {
  document: {
    id: string;
    document_title: string;
    document_type: string;
    document_date: string;
    file_path: string;
    created_at: string;
    client_id: string;
  };
  onClose: () => void;
}

const InformedConsentViewer: React.FC<InformedConsentViewerProps> = ({ document, onClose }) => {
  const [documentUrl, setDocumentUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const loadDocument = async () => {
      try {
        setLoading(true);
        const url = await getDocumentDownloadURL(document.file_path);
        
        if (url) {
          setDocumentUrl(url);
        } else {
          toast({
            title: "Error",
            description: "Failed to load document. The file may not exist.",
            variant: "destructive"
          });
        }
      } catch (error) {
        console.error('Error loading informed consent document:', error);
        toast({
          title: "Error",
          description: "Failed to load informed consent document",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    loadDocument();
  }, [document.file_path, toast]);

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <p>Loading informed consent document...</p>
      </div>
    );
  }

  if (!documentUrl) {
    return (
      <div className="flex justify-center items-center p-8">
        <p>Document not available</p>
      </div>
    );
  }

  return (
    <DocumentViewerDialog
      isOpen={true}
      onClose={onClose}
      documentUrl={documentUrl}
      documentTitle={document.document_title}
      documentType={document.document_type}
      documentDate={document.document_date}
    />
  );
};

export default InformedConsentViewer;