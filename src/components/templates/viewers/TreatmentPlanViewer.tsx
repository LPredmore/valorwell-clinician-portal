import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, FileText, Calendar, User, Target } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';

interface TreatmentPlanViewerProps {
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

const TreatmentPlanViewer: React.FC<TreatmentPlanViewerProps> = ({ document, onClose }) => {
  const [clientData, setClientData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchClientData = async () => {
      try {
        const { data, error } = await supabase
          .from('clients')
          .select('*')
          .eq('id', document.client_id)
          .single();

        if (error) {
          console.error('Error fetching client data:', error);
          return;
        }

        setClientData(data);
      } catch (error) {
        console.error('Error loading treatment plan:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchClientData();
  }, [document.client_id]);

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <p>Loading treatment plan...</p>
      </div>
    );
  }

  if (!clientData) {
    return (
      <div className="flex justify-center items-center p-8">
        <p>No data available</p>
      </div>
    );
  }

  const renderField = (label: string, value: any) => {
    if (!value || (typeof value === 'string' && !value.trim())) {
      return null;
    }
    
    return (
      <div className="mb-4">
        <label className="block text-sm font-semibold text-gray-700 mb-1">{label}</label>
        <div className="p-3 bg-gray-50 rounded-md border text-sm">
          {Array.isArray(value) ? value.join(', ') : value}
        </div>
      </div>
    );
  };

  const renderSection = (title: string, fields: Array<{ label: string; value: any }>) => {
    const visibleFields = fields.filter(field => {
      if (!field.value) return false;
      if (typeof field.value === 'string' && !field.value.trim()) return false;
      if (Array.isArray(field.value) && field.value.length === 0) return false;
      return true;
    });
    
    if (visibleFields.length === 0) {
      return null;
    }

    return (
      <div className="mb-6">
        <h4 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">{title}</h4>
        <div className="space-y-3">
          {visibleFields.map((field, index) => (
            <div key={index}>
              {renderField(field.label, field.value)}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderObjectiveSection = (title: string, objective: string, intervention1: string, intervention2: string) => {
    if (!objective || !objective.trim()) {
      return null;
    }

    return (
      <div className="mb-6">
        <h4 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">{title}</h4>
        <div className="space-y-3">
          {renderField("Objective", objective)}
          {renderField("Intervention 1", intervention1)}
          {renderField("Intervention 2", intervention2)}
        </div>
      </div>
    );
  };

  const formatPlanLength = (length: string) => {
    const lengthMap: Record<string, string> = {
      '1month': '1 Month',
      '3month': '3 Months',
      '6month': '6 Months',
      '9month': '9 Months',
      '12month': '12 Months'
    };
    return lengthMap[length] || length;
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-valorwell-600" />
            <CardTitle>{document.document_title}</CardTitle>
          </div>
          <Button variant="outline" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center gap-4 text-sm text-gray-600">
          <div className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            {format(new Date(document.document_date), 'MMM d, yyyy')}
          </div>
          <div className="flex items-center gap-1">
            <User className="h-4 w-4" />
            {clientData.client_first_name} {clientData.client_last_name}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Basic Information */}
        {renderSection("Plan Information", [
          { label: "Treatment Plan Start Date", value: clientData.client_treatmentplan_startdate ? format(new Date(clientData.client_treatmentplan_startdate), 'MMM d, yyyy') : null },
          { label: "Plan Length", value: formatPlanLength(clientData.client_planlength) },
          { label: "Treatment Frequency", value: clientData.client_treatmentfrequency },
          { label: "Next Treatment Plan Update", value: clientData.client_nexttreatmentplanupdate }
        ])}

        {/* Diagnosis */}
        {renderSection("Diagnosis", [
          { label: "Diagnosis Codes", value: clientData.client_diagnosis }
        ])}

        {/* Problem & Goals */}
        {renderSection("Problem & Treatment Goals", [
          { label: "Problem Narrative", value: clientData.client_problem },
          { label: "Treatment Goal Narrative", value: clientData.client_treatmentgoal }
        ])}

        {/* Treatment Objectives */}
        {renderObjectiveSection(
          "Primary Treatment Objective",
          clientData.client_primaryobjective,
          clientData.client_intervention1,
          clientData.client_intervention2
        )}

        {renderObjectiveSection(
          "Secondary Treatment Objective",
          clientData.client_secondaryobjective,
          clientData.client_intervention3,
          clientData.client_intervention4
        )}

        {renderObjectiveSection(
          "Tertiary Treatment Objective",
          clientData.client_tertiaryobjective,
          clientData.client_intervention5,
          clientData.client_intervention6
        )}

        {/* Private Notes */}
        {renderField("Private Notes", clientData.client_privatenote)}
      </CardContent>
    </Card>
  );
};

export default TreatmentPlanViewer;