
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Form, FormField, FormItem, FormControl } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ClinicianTemplateProps, ClientTemplateProps } from './types';

interface PCL5Assessment {
  id: string;
  templateType: 'pcl5';
  responses: Record<string, number>;
  totalScore: number;
  interpretation: string;
  createdAt: string;
  clientId?: string;
  clinicianId?: string;
  eventDescription?: string;
  additionalNotes?: string;
}

interface PCL5TemplateProps extends ClinicianTemplateProps, ClientTemplateProps {
  onSave?: (data: PCL5Assessment) => void | Promise<void>;
}

// PCL-5 questions based on the official assessment
const pcl5Questions = [
  "Repeated, disturbing, and unwanted memories of the stressful experience?",
  "Repeated, disturbing dreams of the stressful experience?",
  "Suddenly feeling or acting as if the stressful experience were actually happening again (as if you were actually back there reliving it)?",
  "Feeling very upset when something reminded you of the stressful experience?",
  "Having strong physical reactions when something reminded you of the stressful experience (for example, heart pounding, trouble breathing, sweating)?",
  "Avoiding memories, thoughts, or feelings related to the stressful experience?",
  "Avoiding external reminders of the stressful experience (for example, people, places, conversations, activities, objects, or situations)?",
  "Trouble remembering important parts of the stressful experience?",
  "Having strong negative beliefs about yourself, other people, or the world (for example, having thoughts such as: I am bad, there is something seriously wrong with me, no one can be trusted, the world is completely dangerous)?",
  "Blaming yourself or someone else for the stressful experience or what happened after it?",
  "Having strong negative feelings such as fear, horror, anger, guilt, or shame?",
  "Loss of interest in activities that you used to enjoy?",
  "Feeling distant or cut off from other people?",
  "Trouble experiencing positive feelings (for example, being unable to feel happiness or have loving feelings for people close to you)?",
  "Irritable behavior, angry outbursts, or acting aggressively?",
  "Taking too many risks or doing things that could cause you harm?",
  "Being \"superalert\" or watchful or on guard?",
  "Feeling jumpy or easily startled?",
  "Having difficulty concentrating?",
  "Trouble falling or staying asleep?"
];

// Answer options
const answerOptions = [
  { value: 0, label: "Not at all" },
  { value: 1, label: "A little bit" },
  { value: 2, label: "Moderately" },
  { value: 3, label: "Quite a bit" },
  { value: 4, label: "Extremely" }
];

const PCL5Template: React.FC<PCL5TemplateProps> = ({ 
  onClose, 
  clinicianName, 
  clientData,
  clientId,
  onSave
}) => {
  const { toast } = useToast();
  const [scores, setScores] = useState<number[]>(new Array(20).fill(0));
  const [additionalNotes, setAdditionalNotes] = useState("");
  
  const form = useForm({
    defaultValues: {
      date: format(new Date(), "yyyy-MM-dd"),
      clinicianName: clinicianName,
      patientName: clientData ? `${clientData.client_first_name} ${clientData.client_last_name}` : "",
      eventDescription: ""
    }
  });

  // Calculate total score
  const totalScore = scores.reduce((sum, score) => sum + score, 0);
  
  // Get interpretation based on total score
  const getInterpretation = (score: number) => {
    if (score >= 33) {
      return "Score suggests PTSD diagnosis may be appropriate";
    } else {
      return "Score below provisional PTSD diagnosis threshold";
    }
  };

  const handleScoreChange = (index: number, value: number) => {
    const newScores = [...scores];
    newScores[index] = value;
    setScores(newScores);
  };

  const handleSubmit = async () => {
    try {
      const assessment: PCL5Assessment = {
        id: crypto.randomUUID(),
        templateType: 'pcl5',
        responses: scores.reduce((acc, score, index) => ({
          ...acc,
          [`question_${index + 1}`]: score
        }), {}),
        totalScore,
        interpretation: getInterpretation(totalScore),
        createdAt: new Date().toISOString(),
        clientId,
        eventDescription: form.getValues('eventDescription'),
        additionalNotes
      };

      if (onSave) {
        await onSave(assessment);
      } else {
        // Default save behavior
        toast({
          title: "Assessment Saved",
          description: "PCL-5 assessment has been saved successfully.",
        });
      }
      
      onClose();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save PCL-5 assessment.",
        variant: "destructive",
      });
    }
  };

  const calculateClusterScores = () => {
    // Clusters according to DSM-5 PTSD symptom clusters
    const intrusion = scores.slice(0, 5).reduce((sum, score) => sum + score, 0);
    const avoidance = scores.slice(5, 7).reduce((sum, score) => sum + score, 0);
    const negativeAlterations = scores.slice(7, 14).reduce((sum, score) => sum + score, 0);
    const arousal = scores.slice(14, 20).reduce((sum, score) => sum + score, 0);
    
    return { intrusion, avoidance, negativeAlterations, arousal };
  };

  const clusterScores = calculateClusterScores();

  return (
    <Card className="w-full mb-6">
      <CardHeader className="bg-valorwell-600 text-white">
        <CardTitle className="flex justify-between items-center">
          <span>PCL-5 PTSD Checklist for DSM-5</span>
          <Button 
            variant="outline" 
            onClick={onClose}
            className="text-white border-white hover:bg-valorwell-700"
          >
            Close
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
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

            <FormField
              control={form.control}
              name="eventDescription"
              render={({ field }) => (
                <FormItem>
                  <Label>Stressful Experience / Traumatic Event</Label>
                  <FormControl>
                    <Input 
                      {...field} 
                      placeholder="Brief description of event" 
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>

          <div className="mb-6">
            <h3 className="font-medium text-lg mb-4">
              Below is a list of problems that people sometimes have in response to a very stressful experience. Please read each problem carefully and then select how much you have been bothered by that problem IN THE PAST MONTH.
            </h3>
            
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-1/2">Problem</TableHead>
                  {answerOptions.map((option) => (
                    <TableHead key={option.value} className="text-center">
                      {option.label}<br />
                      <span className="text-sm font-normal">({option.value})</span>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {pcl5Questions.map((question, index) => (
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p><strong>Total Score:</strong> {totalScore}</p>
                  <p><strong>Interpretation:</strong> {getInterpretation(totalScore)}</p>
                  <p className="text-sm mt-2">A provisional PTSD diagnosis can be made if:</p>
                  <ul className="text-sm list-disc pl-5">
                    <li>DSM-5 symptom criteria are met (at least 1 B, 1 C, 2 D, and 2 E symptoms scored ≥2)</li>
                    <li>Total severity score ≥ 33</li>
                  </ul>
                </div>
                <div>
                  <p><strong>Symptom Cluster Scores:</strong></p>
                  <ul className="text-sm">
                    <li><strong>B. Intrusion:</strong> {clusterScores.intrusion} (Items 1-5)</li>
                    <li><strong>C. Avoidance:</strong> {clusterScores.avoidance} (Items 6-7)</li>
                    <li><strong>D. Negative Alterations in Cognition and Mood:</strong> {clusterScores.negativeAlterations} (Items 8-14)</li>
                    <li><strong>E. Alterations in Arousal and Reactivity:</strong> {clusterScores.arousal} (Items 15-20)</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <div className="mb-6">
            <Label htmlFor="additionalNotes">Clinical Notes</Label>
            <Textarea 
              id="additionalNotes" 
              value={additionalNotes} 
              onChange={(e) => setAdditionalNotes(e.target.value)}
              className="mt-1"
              rows={4}
              placeholder="Add any clinical observations or additional notes here"
            />
          </div>

          <div className="flex justify-end gap-4">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>
              Save Assessment
            </Button>
          </div>
        </Form>
      </CardContent>
    </Card>
  );
};

export default PCL5Template;
