import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, FileText, Calendar, User, Pill } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SessionNoteViewerProps {
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

const SessionNoteViewer: React.FC<SessionNoteViewerProps> = ({ document, onClose }) => {
  const [clientData, setClientData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

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
          toast({
            title: "Error",
            description: "Failed to load session note data",
            variant: "destructive"
          });
          return;
        }

        setClientData(data);
      } catch (error) {
        console.error('Error loading session note:', error);
        toast({
          title: "Error",
          description: "Failed to load session note",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    fetchClientData();
  }, [document.client_id, toast]);

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <p>Loading session note...</p>
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
          {value}
        </div>
      </div>
    );
  };

  const renderSection = (title: string, fields: Array<{ label: string; value: any }>) => {
    const visibleFields = fields.filter(field => field.value && (typeof field.value !== 'string' || field.value.trim()));
    
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
        {renderSection("Session Information", [
          { label: "Date of Session", value: clientData.date_of_session },
          { label: "Session Type", value: clientData.client_sessiontype },
          { label: "Persons in Attendance", value: clientData.client_personsinattendance }
        ])}

        {/* Diagnosis & Treatment */}
        {renderSection("Diagnosis & Treatment", [
          { label: "Diagnosis", value: clientData.client_diagnosis?.join(', ') },
          { label: "Treatment Frequency", value: clientData.client_treatmentfrequency },
          { label: "Medications", value: clientData.client_medications }
        ])}

        {/* Mental Status Examination */}
        {renderSection("Mental Status Examination", [
          { label: "Appearance", value: clientData.client_appearance },
          { label: "Attitude", value: clientData.client_attitude },
          { label: "Behavior", value: clientData.client_behavior },
          { label: "Speech", value: clientData.client_speech },
          { label: "Affect", value: clientData.client_affect },
          { label: "Thought Process", value: clientData.client_thoughtprocess },
          { label: "Perception", value: clientData.client_perception },
          { label: "Orientation", value: clientData.client_orientation },
          { label: "Memory/Concentration", value: clientData.client_memoryconcentration },
          { label: "Insight/Judgement", value: clientData.client_insightjudgement },
          { label: "Mood", value: clientData.client_mood },
          { label: "Substance Abuse Risk", value: clientData.client_substanceabuserisk },
          { label: "Suicidal Ideation", value: clientData.client_suicidalideation },
          { label: "Homicidal Ideation", value: clientData.client_homicidalideation }
        ])}

        {/* Current Symptoms & Functioning */}
        {renderSection("Current Status", [
          { label: "Current Symptoms", value: clientData.client_currentsymptoms },
          { label: "Functioning", value: clientData.client_functioning }
        ])}

        {/* Treatment Objectives & Interventions */}
        {renderSection("Treatment Objectives & Interventions", [
          { label: "Primary Objective", value: clientData.client_primaryobjective },
          { label: "Intervention 1", value: clientData.client_intervention1 },
          { label: "Intervention 2", value: clientData.client_intervention2 },
          { label: "Secondary Objective", value: clientData.client_secondaryobjective },
          { label: "Intervention 3", value: clientData.client_intervention3 },
          { label: "Intervention 4", value: clientData.client_intervention4 },
          { label: "Tertiary Objective", value: clientData.client_tertiaryobjective },
          { label: "Intervention 5", value: clientData.client_intervention5 },
          { label: "Intervention 6", value: clientData.client_intervention6 }
        ])}

        {/* Session Progress */}
        {renderSection("Session Progress", [
          { label: "Session Narrative", value: clientData.client_sessionnarrative },
          { label: "Progress", value: clientData.client_progress },
          { label: "Prognosis", value: clientData.client_prognosis }
        ])}

        {/* Private Notes */}
        {renderField("Private Notes", clientData.client_privatenote)}
      </CardContent>
    </Card>
  );
};

export default SessionNoteViewer;