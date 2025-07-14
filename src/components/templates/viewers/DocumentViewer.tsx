import React from 'react';
import SessionNoteViewer from './SessionNoteViewer';
import TreatmentPlanViewer from './TreatmentPlanViewer';
import InformedConsentViewer from './InformedConsentViewer';
import ClientHistoryViewer from './ClientHistoryViewer';

interface DocumentViewerProps {
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

const DocumentViewer: React.FC<DocumentViewerProps> = ({ document, onClose }) => {
  const getDocumentType = (type: string) => {
    return type.toLowerCase().replace(/\s+/g, '_');
  };

  const documentType = getDocumentType(document.document_type);

  switch (documentType) {
    case 'session_note':
    case 'session note':
      return <SessionNoteViewer document={document} onClose={onClose} />;
    
    case 'treatment_plan':
    case 'treatment plan':
      return <TreatmentPlanViewer document={document} onClose={onClose} />;
    
    case 'informed_consent':
    case 'informed consent':
      return <InformedConsentViewer document={document} onClose={onClose} />;
    
    case 'client_history':
    case 'client history':
      return <ClientHistoryViewer document={document} onClose={onClose} />;
    
    default:
      return (
        <div className="flex flex-col items-center justify-center p-8">
          <h3 className="text-lg font-medium mb-2">Unsupported Document Type</h3>
          <p className="text-sm text-gray-600 mb-4">
            Document type "{document.document_type}" is not supported for viewing.
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
          >
            Close
          </button>
        </div>
      );
  }
};

export default DocumentViewer;