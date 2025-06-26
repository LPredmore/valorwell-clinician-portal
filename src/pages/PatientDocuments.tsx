
import React, { useState, useEffect } from 'react';
import Layout from '@/components/layout/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { FileText, ClipboardCheck } from 'lucide-react';
import { getCurrentUser, fetchDocumentAssignments, DocumentAssignment } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import DocumentAssignmentsList from '@/components/patient/DocumentAssignmentsList';
import DocumentFormRenderer from '@/components/patient/DocumentFormRenderer';
import MyDocuments from '@/components/patient/MyDocuments';

const PatientDocuments: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [clientId, setClientId] = useState<string | null>(null);
  const [assignments, setAssignments] = useState<DocumentAssignment[]>([]);
  const [selectedAssignment, setSelectedAssignment] = useState<DocumentAssignment | null>(null);
  const [isFormMode, setIsFormMode] = useState(false);
  const [activeTab, setActiveTab] = useState('assignments');
  const { toast } = useToast();

  useEffect(() => {
    const loadUserAndAssignments = async () => {
      setLoading(true);
      try {
        const user = await getCurrentUser();
        if (!user) {
          toast({
            title: "Authentication required",
            description: "Please log in to view your documents",
            variant: "destructive"
          });
          return;
        }
        
        setClientId(user.id);
        
        // Fetch the document assignments for this user
        const docAssignments = await fetchDocumentAssignments(user.id);
        setAssignments(docAssignments);
      } catch (error) {
        console.error('Error loading user or assignments:', error);
        toast({
          title: "Error",
          description: "Failed to load document assignments",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    loadUserAndAssignments();
  }, [toast]);

  const handleStartForm = (assignment: DocumentAssignment) => {
    setSelectedAssignment(assignment);
    setIsFormMode(true);
  };

  const handleContinueForm = (assignment: DocumentAssignment) => {
    setSelectedAssignment(assignment);
    setIsFormMode(true);
  };

  const handleViewCompleted = (assignment: DocumentAssignment) => {
    // In a real application, this would open the completed form
    toast({
      title: "View Completed Form",
      description: `Viewing ${assignment.document_name}`,
    });
  };

  const handleCancelForm = () => {
    setIsFormMode(false);
    setSelectedAssignment(null);
  };

  const handleSaveForm = () => {
    // Refresh the assignments list after saving
    if (clientId) {
      fetchDocumentAssignments(clientId).then(docAssignments => {
        setAssignments(docAssignments);
      });
    }
    
    setIsFormMode(false);
    setSelectedAssignment(null);
  };

  const handleCompleteForm = () => {
    // Refresh the assignments list after completing
    if (clientId) {
      fetchDocumentAssignments(clientId).then(docAssignments => {
        setAssignments(docAssignments);
      });
    }
    
    toast({
      title: "Form Completed",
      description: "Thank you for submitting your form.",
    });
    
    setIsFormMode(false);
    setSelectedAssignment(null);
  };

  const handleRefreshAssignments = () => {
    if (clientId) {
      fetchDocumentAssignments(clientId).then(docAssignments => {
        setAssignments(docAssignments);
      });
    }
  };

  return (
    <Layout>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Patient Documents</h1>
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-valorwell-600" />
            <span className="text-sm text-gray-500">Manage your forms and documents</span>
          </div>
        </div>
        
        {isFormMode && selectedAssignment && clientId ? (
          <DocumentFormRenderer
            assignment={selectedAssignment}
            clientId={clientId}
            onSave={handleSaveForm}
            onCancel={handleCancelForm}
            onComplete={handleCompleteForm}
          />
        ) : (
          <Tabs defaultValue={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-6">
              <TabsTrigger value="assignments" className="flex items-center gap-1">
                <ClipboardCheck className="h-4 w-4" />
                Form Assignments
              </TabsTrigger>
              <TabsTrigger value="documents" className="flex items-center gap-1">
                <FileText className="h-4 w-4" />
                Medical Records
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="assignments" className="mt-0">
              <DocumentAssignmentsList
                assignments={assignments}
                isLoading={loading}
                onStartForm={handleStartForm}
                onContinueForm={handleContinueForm}
                onViewCompleted={handleViewCompleted}
                onLoadComplete={handleRefreshAssignments}
              />
            </TabsContent>
            
            <TabsContent value="documents" className="mt-0">
              <MyDocuments clientId={clientId || undefined} />
            </TabsContent>
          </Tabs>
        )}
      </div>
    </Layout>
  );
};

export default PatientDocuments;
