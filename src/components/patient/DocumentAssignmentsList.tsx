
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { FileCheck, FileText, ClipboardCheck } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { DocumentAssignment, updateDocumentStatus } from '@/integrations/supabase/client';

type DocumentAssignmentsListProps = {
  assignments: DocumentAssignment[];
  isLoading: boolean;
  onStartForm: (assignment: DocumentAssignment) => void;
  onContinueForm: (assignment: DocumentAssignment) => void;
  onViewCompleted: (assignment: DocumentAssignment) => void;
  onLoadComplete: () => void;
};

const DocumentAssignmentsList: React.FC<DocumentAssignmentsListProps> = ({
  assignments,
  isLoading,
  onStartForm,
  onContinueForm,
  onViewCompleted,
  onLoadComplete
}) => {
  const { toast } = useToast();
  
  React.useEffect(() => {
    onLoadComplete();
  }, [assignments, onLoadComplete]);

  // Group documents by status for better organization
  const pendingAssignments = assignments.filter(doc => doc.status === 'not_started');
  const inProgressAssignments = assignments.filter(doc => doc.status === 'in_progress');
  const completedAssignments = assignments.filter(doc => doc.status === 'completed');
  
  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <p>Loading document assignments...</p>
      </div>
    );
  }
  
  if (assignments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <ClipboardCheck className="h-12 w-12 text-gray-300 mb-3" />
        <h3 className="text-lg font-medium">No document assignments</h3>
        <p className="text-sm text-gray-500 mt-1">
          You have no pending document assignments at this time
        </p>
      </div>
    );
  }

  const renderAssignmentTable = (docs: DocumentAssignment[], type: 'pending' | 'in-progress' | 'completed') => {
    if (docs.length === 0) return null;
    
    return (
      <div className="mb-6">
        <h3 className="text-lg font-medium mb-2">
          {type === 'pending' && 'Pending Documents'}
          {type === 'in-progress' && 'In Progress'}
          {type === 'completed' && 'Completed Documents'}
        </h3>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Document</TableHead>
              <TableHead>Assigned</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {docs.map((doc) => (
              <TableRow key={doc.id}>
                <TableCell className="font-medium">{doc.document_name}</TableCell>
                <TableCell>{format(new Date(doc.created_at), 'MMM d, yyyy')}</TableCell>
                <TableCell className="text-right">
                  {doc.status === 'not_started' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onStartForm(doc)}
                    >
                      <FileText className="h-4 w-4 mr-1" />
                      Start
                    </Button>
                  )}
                  
                  {doc.status === 'in_progress' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onContinueForm(doc)}
                    >
                      <FileText className="h-4 w-4 mr-1" />
                      Continue
                    </Button>
                  )}
                  
                  {doc.status === 'completed' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onViewCompleted(doc)}
                    >
                      <FileCheck className="h-4 w-4 mr-1" />
                      View
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your Document Assignments</CardTitle>
        <CardDescription>
          Forms and documents assigned to you by your therapist
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Pending Documents Section */}
        {renderAssignmentTable(pendingAssignments, 'pending')}
        
        {/* In Progress Documents Section */}
        {renderAssignmentTable(inProgressAssignments, 'in-progress')}
        
        {/* Completed Documents Section */}
        {renderAssignmentTable(completedAssignments, 'completed')}
      </CardContent>
    </Card>
  );
};

export default DocumentAssignmentsList;
