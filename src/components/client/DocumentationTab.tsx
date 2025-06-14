
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart2, ClipboardCheck, FileText, ClipboardList, Download, Calendar, Eye } from "lucide-react";
import TreatmentPlanTemplate from "@/components/templates/TreatmentPlanTemplate";
import SessionNoteTemplate from "@/components/templates/SessionNoteTemplate";
import PHQ9Template from "@/components/templates/PHQ9Template";
import PCL5Template from "@/components/templates/PCL5Template";
import { useClinicianData } from "@/hooks/useClinicianData";
import { Client } from "@/types/client";
import { fetchClinicalDocuments, getDocumentDownloadURL } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";

interface DocumentationTabProps {
  clientData?: Client | null;
}

interface ClinicalDocument {
  id: string;
  document_title: string;
  document_type: string;
  document_date: string;
  file_path: string;
  created_at: string;
  created_by?: string;
}

const DocumentationTab: React.FC<DocumentationTabProps> = ({
  clientData
}) => {
  const [showTreatmentPlanTemplate, setShowTreatmentPlanTemplate] = useState(false);
  const [showSessionNoteTemplate, setShowSessionNoteTemplate] = useState(false);
  const [showPHQ9Template, setShowPHQ9Template] = useState(false);
  const [showPCL5Template, setShowPCL5Template] = useState(false);
  const [documents, setDocuments] = useState<ClinicalDocument[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const {
    clinicianData
  } = useClinicianData();
  const {
    toast
  } = useToast();

  useEffect(() => {
    if (clientData?.id) {
      setIsLoading(true);
      fetchClinicalDocuments(clientData.id).then(docs => {
        setDocuments(docs);
        setIsLoading(false);
      }).catch(err => {
        console.error('Error fetching documents:', err);
        setIsLoading(false);
        toast({
          title: "Error",
          description: "Failed to load client documents",
          variant: "destructive"
        });
      });
    }
  }, [clientData?.id, toast]);

  const handleCloseTreatmentPlan = () => {
    setShowTreatmentPlanTemplate(false);
    if (clientData?.id) {
      fetchClinicalDocuments(clientData.id).then(docs => setDocuments(docs)).catch(err => console.error('Error refreshing documents:', err));
    }
  };

  const handleCloseSessionNote = () => {
    setShowSessionNoteTemplate(false);
    if (clientData?.id) {
      fetchClinicalDocuments(clientData.id).then(docs => setDocuments(docs)).catch(err => console.error('Error refreshing documents:', err));
    }
  };

  const handleClosePHQ9 = () => {
    setShowPHQ9Template(false);
    if (clientData?.id) {
      fetchClinicalDocuments(clientData.id).then(docs => setDocuments(docs)).catch(err => console.error('Error refreshing documents:', err));
    }
  };

  const handleClosePCL5 = () => {
    setShowPCL5Template(false);
    if (clientData?.id) {
      fetchClinicalDocuments(clientData.id).then(docs => setDocuments(docs)).catch(err => console.error('Error refreshing documents:', err));
    }
  };

  const handleViewDocument = async (filePath: string) => {
    try {
      const url = await getDocumentDownloadURL(filePath);
      if (url) {
        window.open(url, '_blank');
      } else {
        toast({
          title: "Error",
          description: "Could not retrieve document URL",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error viewing document:', error);
      toast({
        title: "Error",
        description: "Failed to open document",
        variant: "destructive"
      });
    }
  };

  return <div className="grid grid-cols-1 gap-6">
      <Card>
        
        
      </Card>

      {showTreatmentPlanTemplate && <div className="animate-fade-in">
          <TreatmentPlanTemplate onClose={handleCloseTreatmentPlan} clinicianName={clinicianData?.clinician_professional_name || ''} clientData={clientData} />
        </div>}

      {showSessionNoteTemplate && <div className="animate-fade-in">
          <SessionNoteTemplate onClose={handleCloseSessionNote} clinicianName={clinicianData?.clinician_professional_name || ''} clientData={clientData} />
        </div>}

      {showPHQ9Template && <div className="animate-fade-in">
          <PHQ9Template onClose={handleClosePHQ9} clinicianName={clinicianData?.clinician_professional_name || ''} clientData={clientData} />
        </div>}
      
      {showPCL5Template && <div className="animate-fade-in">
          <PCL5Template onClose={handleClosePCL5} clinicianName={clinicianData?.clinician_professional_name || ''} clientData={clientData} />
        </div>}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-valorwell-600" />
            Assigned Forms
          </CardTitle>
          <CardDescription>View and complete patient assessments</CardDescription>
        </CardHeader>
        <CardContent className="py-6">
          {/* Assessment content */}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-valorwell-600" />
            Completed Notes
          </CardTitle>
          <CardDescription>View completed session notes and documentation</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? <div className="flex justify-center py-8">
              <p>Loading documents...</p>
            </div> : documents.length === 0 ? <div className="flex flex-col items-center justify-center py-8 text-center">
              <FileText className="h-12 w-12 text-gray-300 mb-3" />
              <h3 className="text-lg font-medium">No documents found</h3>
              <p className="text-sm text-gray-500 mt-1">
                Create a treatment plan or session note to view it here
              </p>
            </div> : <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {documents.map(doc => <TableRow key={doc.id}>
                      <TableCell className="font-medium">{doc.document_title}</TableCell>
                      <TableCell>{doc.document_type}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4 text-gray-500" />
                          {format(new Date(doc.document_date), 'MMM d, yyyy')}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" className="ml-2" onClick={() => handleViewDocument(doc.file_path)}>
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                      </TableCell>
                    </TableRow>)}
                </TableBody>
              </Table>
            </div>}
        </CardContent>
      </Card>
    </div>;
};

export default DocumentationTab;
