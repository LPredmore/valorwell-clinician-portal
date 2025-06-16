import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { CheckCircle, X } from 'lucide-react';
import { useTemplateData } from '@/hooks/useTemplateData';
import { BaseTemplateProps, ClinicianTemplateProps, ClientTemplateProps } from './types';

interface TreatmentPlanTemplateProps extends BaseTemplateProps, ClinicianTemplateProps, ClientTemplateProps {}

const TreatmentPlanTemplate: React.FC<TreatmentPlanTemplateProps> = ({ 
  onClose, 
  clinicianName, 
  clientData,
  clientId
}) => {
  const { toast } = useToast();
  const { saveTreatmentPlan } = useTemplateData();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [planData, setPlanData] = useState({
    goals: '',
    objectives: '',
    interventions: '',
    timeline: '',
    frequency: '',
    additional_notes: ''
  });

  const handleSubmit = async () => {
    if (!clientId) {
      toast({
        title: "Error",
        description: "Client ID is required.",
        variant: "destructive",
      });
      return;
    }

    if (!planData.goals.trim() || !planData.objectives.trim() || !planData.interventions.trim()) {
      toast({
        title: "Error",
        description: "Goals, objectives, and interventions are required.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const treatmentPlanData = {
        client_id: clientId,
        clinician_id: '', // Will be set by the hook from auth.uid()
        plan_date: new Date().toISOString().split('T')[0],
        is_active: true, // Add the missing required field
        ...planData
      };

      await saveTreatmentPlan(treatmentPlanData);
      
      setIsSaved(true);
      setTimeout(() => {
        setIsSaved(false);
      }, 3000);
    } catch (error) {
      console.error('Error saving treatment plan:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>Treatment Plan Template</span>
          <Button variant="outline" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardTitle>
        <CardDescription>
          Create a comprehensive treatment plan for the client
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <Label className="text-sm font-medium text-gray-700">Patient Name</Label>
            <p className="p-2 border rounded-md bg-gray-50">
              {clientData ? `${clientData.client_first_name} ${clientData.client_last_name}` : "Not specified"}
            </p>
          </div>
          <div>
            <Label className="text-sm font-medium text-gray-700">Clinician</Label>
            <p className="p-2 border rounded-md bg-gray-50">{clinicianName || "Not specified"}</p>
          </div>
        </div>

        <div>
          <Label htmlFor="goals">Treatment Goals *</Label>
          <Textarea
            id="goals"
            value={planData.goals}
            onChange={(e) => setPlanData({...planData, goals: e.target.value})}
            placeholder="Enter treatment goals..."
            rows={3}
            required
          />
        </div>
        
        <div>
          <Label htmlFor="objectives">Objectives *</Label>
          <Textarea
            id="objectives"
            value={planData.objectives}
            onChange={(e) => setPlanData({...planData, objectives: e.target.value})}
            placeholder="Enter specific objectives..."
            rows={3}
            required
          />
        </div>
        
        <div>
          <Label htmlFor="interventions">Interventions *</Label>
          <Textarea
            id="interventions"
            value={planData.interventions}
            onChange={(e) => setPlanData({...planData, interventions: e.target.value})}
            placeholder="Enter planned interventions..."
            rows={3}
            required
          />
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="timeline">Timeline</Label>
            <Input
              id="timeline"
              value={planData.timeline}
              onChange={(e) => setPlanData({...planData, timeline: e.target.value})}
              placeholder="e.g., 12 weeks"
            />
          </div>
          <div>
            <Label htmlFor="frequency">Frequency</Label>
            <Input
              id="frequency"
              value={planData.frequency}
              onChange={(e) => setPlanData({...planData, frequency: e.target.value})}
              placeholder="e.g., Weekly"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="additional_notes">Additional Notes</Label>
          <Textarea
            id="additional_notes"
            value={planData.additional_notes}
            onChange={(e) => setPlanData({...planData, additional_notes: e.target.value})}
            placeholder="Any additional notes or considerations..."
            rows={2}
          />
        </div>
        
        <div className="flex gap-2 pt-4">
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !clientId}
            className="flex-1 flex items-center gap-2"
          >
            {isSubmitting ? (
              "Saving..."
            ) : isSaved ? (
              <>
                <CheckCircle className="h-4 w-4" /> Saved
              </>
            ) : (
              "Save Treatment Plan"
            )}
          </Button>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default TreatmentPlanTemplate;
