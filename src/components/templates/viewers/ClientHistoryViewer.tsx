import React, { useState, useEffect } from 'react';
import DocumentViewerDialog from '@/components/ui/DocumentViewerDialog';
import { getDocumentDownloadURL } from '@/integrations/supabase/client';

interface ClientHistoryViewerProps {
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

const ClientHistoryViewer: React.FC<ClientHistoryViewerProps> = ({ document, onClose }) => {
  const [documentUrl, setDocumentUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDocument = async () => {
      try {
        setLoading(true);
        const url = await getDocumentDownloadURL(document.file_path);
        
        if (url) {
          setDocumentUrl(url);
        }
      } catch (error) {
        console.error('Error loading client history document:', error);
      } finally {
        setLoading(false);
      }
    };

    loadDocument();
  }, [document.file_path]);

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <p>Loading client history document...</p>
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

export default ClientHistoryViewer;