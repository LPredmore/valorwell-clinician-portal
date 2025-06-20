
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { Plus, FileText, ClipboardList, Brain } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import TemplateRenderer from '@/components/templates/TemplateRenderer';

const TemplatesTab = () => {
  const { toast } = useToast();
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [clinicianName, setClinicianName] = useState<string>('');

  // Fetch clinician name on component mount
  useEffect(() => {
    const fetchClinicianName = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: clinician } = await supabase
          .from('clinicians')
          .select('clinician_first_name, clinician_last_name')
          .eq('id', user.id)
          .single();

        if (clinician) {
          const fullName = `${clinician.clinician_first_name || ''} ${clinician.clinician_last_name || ''}`.trim();
          setClinicianName(fullName || 'Clinician');
        }
      } catch (error) {
        console.error('Error fetching clinician name:', error);
        setClinicianName('Clinician');
      }
    };

    fetchClinicianName();
  }, []);

  const templates = [
    {
      id: 'session-note',
      name: 'Session Note',
      description: 'Document therapy sessions and progress',
      icon: FileText,
    },
    {
      id: 'treatment-plan',
      name: 'Treatment Plan',
      description: 'Create comprehensive treatment plans',
      icon: ClipboardList,
    },
    {
      id: 'phq9',
      name: 'PHQ-9 Assessment',
      description: 'Depression screening questionnaire',
      icon: Brain,
    },
    {
      id: 'gad7',
      name: 'GAD-7 Assessment',
      description: 'Anxiety screening questionnaire',
      icon: Brain,
    },
    {
      id: 'pcl5',
      name: 'PCL-5 Assessment',
      description: 'PTSD screening questionnaire',
      icon: Brain,
    },
  ];

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId);
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setSelectedTemplate(null);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Document Templates</CardTitle>
          <CardDescription>
            Create and manage templates for clinical documentation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((template) => (
              <Card key={template.id} className="cursor-pointer hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center space-x-3">
                    <template.icon className="h-6 w-6 text-blue-600" />
                    <div>
                      <CardTitle className="text-lg">{template.name}</CardTitle>
                      <CardDescription className="text-sm">
                        {template.description}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => handleTemplateSelect(template.id)}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Use Template
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedTemplate && templates.find(t => t.id === selectedTemplate)?.name}
            </DialogTitle>
            <DialogDescription>
              {selectedTemplate && templates.find(t => t.id === selectedTemplate)?.description}
            </DialogDescription>
          </DialogHeader>
          {selectedTemplate && (
            <TemplateRenderer
              templateId={selectedTemplate}
              onClose={handleCloseDialog}
              clinicianName={clinicianName}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TemplatesTab;
