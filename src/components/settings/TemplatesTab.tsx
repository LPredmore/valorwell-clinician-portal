
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { Plus, FileText, ClipboardList, Brain } from 'lucide-react';
import SessionNoteTemplate from '@/components/templates/SessionNoteTemplate';
import TreatmentPlanTemplate from '@/components/templates/TreatmentPlanTemplate';
import PHQ9Template from '@/components/templates/PHQ9Template';
import GAD7Template from '@/components/templates/GAD7Template';
import PCL5Template from '@/components/templates/PCL5Template';

const TemplatesTab = () => {
  const { toast } = useToast();
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  const templates = [
    {
      id: 'session-note',
      name: 'Session Note',
      description: 'Document therapy sessions and progress',
      icon: FileText,
      component: SessionNoteTemplate,
    },
    {
      id: 'treatment-plan',
      name: 'Treatment Plan',
      description: 'Create comprehensive treatment plans',
      icon: ClipboardList,
      component: TreatmentPlanTemplate,
    },
    {
      id: 'phq9',
      name: 'PHQ-9 Assessment',
      description: 'Depression screening questionnaire',
      icon: Brain,
      component: PHQ9Template,
    },
    {
      id: 'gad7',
      name: 'GAD-7 Assessment',
      description: 'Anxiety screening questionnaire',
      icon: Brain,
      component: GAD7Template,
    },
    {
      id: 'pcl5',
      name: 'PCL-5 Assessment',
      description: 'PTSD screening questionnaire',
      icon: Brain,
      component: PCL5Template,
    },
  ];

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId);
  };

  const renderTemplateComponent = () => {
    const template = templates.find(t => t.id === selectedTemplate);
    if (!template) return null;

    const Component = template.component;
    return <Component />;
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
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button 
                        variant="outline" 
                        className="w-full"
                        onClick={() => handleTemplateSelect(template.id)}
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Use Template
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>{template.name}</DialogTitle>
                        <DialogDescription>
                          {template.description}
                        </DialogDescription>
                      </DialogHeader>
                      {renderTemplateComponent()}
                    </DialogContent>
                  </Dialog>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TemplatesTab;
