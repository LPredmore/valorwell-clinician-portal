
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { savePHQ9Assessment, type PHQ9Assessment } from '@/utils/phq9Utils';

interface PHQ9TemplateProps {
  clientId?: string;
  onSave?: (assessment: PHQ9Assessment) => void;
}

const PHQ9Template: React.FC<PHQ9TemplateProps> = ({ clientId, onSave }) => {
  const [responses, setResponses] = useState<Record<string, number>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

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
      const assessment = await savePHQ9Assessment({
        client_id: clientId,
        responses,
        total_score: Object.values(responses).reduce((sum, val) => sum + val, 0),
      });
      
      toast({
        title: "Success",
        description: "PHQ-9 assessment saved successfully.",
      });
      
      onSave?.(assessment);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save PHQ-9 assessment.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>PHQ-9 Depression Assessment</CardTitle>
        <CardDescription>
          Patient Health Questionnaire-9
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-600 mb-4">
          PHQ-9 assessment form will be implemented in a future update.
        </p>
        <Button onClick={handleSubmit} disabled={isSubmitting || !clientId}>
          {isSubmitting ? "Saving..." : "Save Assessment"}
        </Button>
      </CardContent>
    </Card>
  );
};

export default PHQ9Template;
