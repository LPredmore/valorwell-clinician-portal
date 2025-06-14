
import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Client } from "@/types/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Form, FormField, FormItem, FormControl } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { X } from "lucide-react";
import { savePHQ9Assessment } from "@/integrations/supabase/client";

interface PHQ9TemplateProps {
  onClose: () => void;
  clinicianName: string;
  clientData?: Client | null;
  onComplete?: () => void; // Callback for when assessment is completed
}

// PHQ-9 questions
const phq9Questions = [
  "Little interest or pleasure in doing things",
  "Feeling down, depressed, or hopeless",
  "Trouble falling or staying asleep, or sleeping too much",
  "Feeling tired or having little energy",
  "Poor appetite or overeating",
  "Feeling bad about yourself - or that you are a failure or have let yourself or your family down",
  "Trouble concentrating on things, such as reading the newspaper or watching television",
  "Moving or speaking so slowly that other people could have noticed. Or the opposite - being so fidgety or restless that you have been moving around a lot more than usual",
  "Thoughts that you would be better off dead, or of hurting yourself in some way"
];

// Answer options
const answerOptions = [
  { value: 0, label: "Not at all" },
  { value: 1, label: "Several days" },
  { value: 2, label: "More than half the days" },
  { value: 3, label: "Nearly every day" }
];

const PHQ9Template: React.FC<PHQ9TemplateProps> = ({ onClose, clinicianName, clientData, onComplete }) => {
  const { toast } = useToast();
  const [scores, setScores] = useState<number[]>(new Array(9).fill(0));
  const [additionalNotes, setAdditionalNotes] = useState("");
  const [isOpen, setIsOpen] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  const form = useForm({
    defaultValues: {
      date: format(new Date(), "yyyy-MM-dd"),
      clinicianName: clinicianName,
      patientName: clientData ? `${clientData.client_first_name} ${clientData.client_last_name}` : "",
    }
  });

  // Calculate total score
  const totalScore = scores.reduce((sum, score) => sum + score, 0);
  
  // Get severity based on total score
  const getSeverity = (score: number) => {
    if (score >= 0 && score <= 4) return "None-minimal";
    if (score >= 5 && score <= 9) return "Mild";
    if (score >= 10 && score <= 14) return "Moderate";
    if (score >= 15 && score <= 19) return "Moderately severe";
    return "Severe";
  };

  const handleScoreChange = (index: number, value: number) => {
    const newScores = [...scores];
    newScores[index] = value;
    setScores(newScores);
  };

  const handleSubmit = async () => {
    try {
      setIsSaving(true);
      
      // Only proceed with saving if we have clientData with an ID
      if (clientData && clientData.id) {
        // Prepare the assessment data
        const assessmentData = {
          client_id: clientData.id,
          assessment_date: form.getValues().date,
          question_1: scores[0],
          question_2: scores[1],
          question_3: scores[2],
          question_4: scores[3],
          question_5: scores[4],
          question_6: scores[5],
          question_7: scores[6],
          question_8: scores[7],
          question_9: scores[8],
          total_score: totalScore,
          additional_notes: additionalNotes
        };
        
        // Save the assessment to the database
        const result = await savePHQ9Assessment(assessmentData);
        
        if (!result.success) {
          console.error('Failed to save PHQ-9 assessment:', result.error);
          toast({
            title: "Warning",
            description: "The assessment was completed but there was an issue saving the data.",
            variant: "destructive"
          });
          // Still continue with the flow even if saving fails
        } else {
          console.log('PHQ-9 assessment saved successfully:', result.data);
        }
      } else {
        console.warn('Cannot save PHQ-9 assessment: Missing client data or ID');
      }
      
      // Keep existing notification code
      toast({
        title: "Assessment Saved",
        description: "PHQ-9 assessment has been saved successfully.",
      });
      
    } catch (error) {
      console.error('Error in PHQ-9 submission:', error);
      toast({
        title: "Error",
        description: "There was an issue saving your assessment. The session will continue.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
      handleClose();
      
      // Call onComplete if provided, otherwise just close
      if (onComplete) {
        onComplete();
      }
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    onClose();
  };

  const renderFormContent = () => (
    <Form {...form}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <FormField
          control={form.control}
          name="date"
          render={({ field }) => (
            <FormItem>
              <Label>Date</Label>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="clinicianName"
          render={({ field }) => (
            <FormItem>
              <Label>Clinician</Label>
              <FormControl>
                <Input {...field} readOnly />
              </FormControl>
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="patientName"
          render={({ field }) => (
            <FormItem>
              <Label>Patient</Label>
              <FormControl>
                <Input {...field} readOnly />
              </FormControl>
            </FormItem>
          )}
        />
      </div>

      <div className="mb-6">
        <h3 className="font-medium text-lg mb-4">
          Over the last 2 weeks, how often have you been bothered by any of the following problems?
        </h3>
        
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-1/2">Question</TableHead>
              {answerOptions.map((option) => (
                <TableHead key={option.value} className="text-center">
                  {option.label}<br />
                  <span className="text-sm font-normal">({option.value})</span>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {phq9Questions.map((question, index) => (
              <TableRow key={index}>
                <TableCell>{question}</TableCell>
                {answerOptions.map((option) => (
                  <TableCell key={`${index}-${option.value}`} className="text-center">
                    <input
                      type="radio"
                      name={`question-${index}`}
                      value={option.value}
                      checked={scores[index] === option.value}
                      onChange={() => handleScoreChange(index, option.value)}
                      className="h-4 w-4"
                    />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="mb-6">
        <div className="bg-gray-100 p-4 rounded-md">
          <h3 className="font-medium mb-2">Score Interpretation</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p><strong>Total Score:</strong> {totalScore}</p>
              <p><strong>Severity:</strong> {getSeverity(totalScore)}</p>
            </div>
            <div>
              <p><strong>PHQ-9 Score Ranges:</strong></p>
              <ul className="text-sm">
                <li>0-4: None-minimal</li>
                <li>5-9: Mild</li>
                <li>10-14: Moderate</li>
                <li>15-19: Moderately severe</li>
                <li>20-27: Severe</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-6">
        <Label htmlFor="additionalNotes">Additional Notes</Label>
        <Textarea 
          id="additionalNotes" 
          value={additionalNotes} 
          onChange={(e) => setAdditionalNotes(e.target.value)}
          className="mt-1"
          rows={4}
        />
      </div>

      <div className="flex justify-end gap-4 mt-6">
        <Button variant="outline" onClick={handleClose} disabled={isSaving}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={isSaving}>
          {isSaving ? "Saving..." : "Save Assessment"}
        </Button>
      </div>
    </Form>
  );

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex justify-between items-center">
            <span>PHQ-9 Depression Screener</span>
            <Button variant="ghost" size="icon" onClick={handleClose} className="h-6 w-6 rounded-full">
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>
        {renderFormContent()}
      </DialogContent>
    </Dialog>
  );
};

export default PHQ9Template;
