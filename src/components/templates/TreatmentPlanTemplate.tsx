
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { BaseTemplateProps, TemplateSaveCallback } from './types';

interface TreatmentPlanData {
  client_id: string;
  goals: string;
  objectives: string;
  interventions: string;
  timeline: string;
  frequency: string;
  created_at: string;
}

interface TreatmentPlanTemplateProps extends BaseTemplateProps {
  clientId?: string;
  onSave?: TemplateSaveCallback<TreatmentPlanData>;
}

const TreatmentPlanTemplate: React.FC<TreatmentPlanTemplateProps> = ({ onClose, clientId, onSave }) => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [planData, setPlanData] = useState({
    goals: '',
    objectives: '',
    interventions: '',
    timeline: '',
    frequency: ''
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

    setIsSubmitting(true);
    try {
      // Here you would save the treatment plan
      const plan: TreatmentPlanData = {
        client_id: clientId,
        ...planData,
        created_at: new Date().toISOString()
      };
      
      toast({
        title: "Success",
        description: "Treatment plan saved successfully.",
      });
      
      onSave?.(plan);
      onClose();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save treatment plan.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Treatment Plan Template</CardTitle>
        <CardDescription>
          Create a comprehensive treatment plan for the client
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="goals">Treatment Goals</Label>
          <Textarea
            id="goals"
            value={planData.goals}
            onChange={(e) => setPlanData({...planData, goals: e.target.value})}
            placeholder="Enter treatment goals..."
            rows={3}
          />
        </div>
        
        <div>
          <Label htmlFor="objectives">Objectives</Label>
          <Textarea
            id="objectives"
            value={planData.objectives}
            onChange={(e) => setPlanData({...planData, objectives: e.target.value})}
            placeholder="Enter specific objectives..."
            rows={3}
          />
        </div>
        
        <div>
          <Label htmlFor="interventions">Interventions</Label>
          <Textarea
            id="interventions"
            value={planData.interventions}
            onChange={(e) => setPlanData({...planData, interventions: e.target.value})}
            placeholder="Enter planned interventions..."
            rows={3}
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
        
        <div className="flex gap-2">
          <Button onClick={handleSubmit} disabled={isSubmitting || !clientId} className="flex-1">
            {isSubmitting ? "Saving..." : "Save Treatment Plan"}
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
