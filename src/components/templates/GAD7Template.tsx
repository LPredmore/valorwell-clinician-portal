
import React, { useState } from 'react';
import { X, CheckCircle } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { useTemplateData } from '@/hooks/useTemplateData';
import { ClinicianTemplateProps, ClientTemplateProps } from './types';

interface GAD7TemplateProps extends ClinicianTemplateProps, ClientTemplateProps {
  onClose: () => void;
}

const GAD7Template: React.FC<GAD7TemplateProps> = ({ 
  onClose, 
  clinicianName, 
  clientData,
  clientId
}) => {
  const [responses, setResponses] = useState<number[]>(Array(7).fill(0));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const { toast } = useToast();
  const { saveGAD7Assessment } = useTemplateData();
  
  const questions = [
    "Feeling nervous, anxious, or on edge",
    "Not being able to stop or control worrying",
    "Worrying too much about different things",
    "Trouble relaxing",
    "Being so restless that it's hard to sit still",
    "Becoming easily annoyed or irritable",
    "Feeling afraid, as if something awful might happen"
  ];
  
  const options = [
    "Not at all",
    "Several days",
    "More than half the days",
    "Nearly every day"
  ];
  
  const calculateScore = (): number => {
    return responses.reduce((total, value) => total + value, 0);
  };
  
  const getScoreInterpretation = (score: number): string => {
    if (score >= 0 && score <= 4) {
      return "Minimal anxiety";
    } else if (score >= 5 && score <= 9) {
      return "Mild anxiety";
    } else if (score >= 10 && score <= 14) {
      return "Moderate anxiety";
    } else {
      return "Severe anxiety";
    }
  };
  
  const handleResponseChange = (questionIndex: number, value: number) => {
    const newResponses = [...responses];
    newResponses[questionIndex] = value;
    setResponses(newResponses);
  };
  
  const handleSave = async () => {
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
      const totalScore = calculateScore();
      const assessmentData = {
        client_id: clientId,
        clinician_id: '', // Will be set by the hook from auth.uid()
        assessment_date: new Date().toISOString().split('T')[0],
        responses: responses.reduce((acc, response, index) => ({
          ...acc,
          [`question_${index + 1}`]: response
        }), {}),
        total_score: totalScore,
        interpretation: getScoreInterpretation(totalScore)
      };

      await saveGAD7Assessment(assessmentData);
      
      setIsSaved(true);
      setTimeout(() => {
        setIsSaved(false);
      }, 3000);
    } catch (error) {
      console.error('Error saving GAD-7 assessment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const totalScore = calculateScore();
  const interpretation = getScoreInterpretation(totalScore);
  const currentDate = new Date().toLocaleDateString();
  
  return (
    <div className="bg-white p-6 rounded-md">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Generalized Anxiety Disorder (GAD-7)</h2>
        <button
          onClick={onClose}
          className="p-2 rounded-full hover:bg-gray-100"
        >
          <X className="h-6 w-6" />
        </button>
      </div>
      
      <div className="mb-6">
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Patient Name</label>
            <p className="p-2 border rounded-md bg-gray-50">
              {clientData ? `${clientData.client_first_name} ${clientData.client_last_name}` : "Not specified"}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Date</label>
            <p className="p-2 border rounded-md bg-gray-50">{currentDate}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Clinician</label>
            <p className="p-2 border rounded-md bg-gray-50">{clinicianName || "Not specified"}</p>
          </div>
        </div>
        
        <div className="mb-4">
          <p className="text-gray-700 mb-2">
            Over the last 2 weeks, how often have you been bothered by the following problems?
          </p>
        </div>
      </div>
      
      <div className="mb-8">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead className="text-left">Questions</TableHead>
              {options.map((option, index) => (
                <TableHead key={index} className="text-center w-32">
                  {option}
                  <div className="text-xs text-gray-500">{index}</div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {questions.map((question, qIndex) => (
              <TableRow key={qIndex} className={qIndex % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                <TableCell className="border">{question}</TableCell>
                {[0, 1, 2, 3].map((value) => (
                  <TableCell key={value} className="border text-center">
                    <input
                      type="radio"
                      name={`question-${qIndex}`}
                      checked={responses[qIndex] === value}
                      onChange={() => handleResponseChange(qIndex, value)}
                      className="form-radio h-4 w-4 text-blue-600"
                    />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      
      <div className="mb-6 p-4 border rounded-md bg-gray-50">
        <div className="grid grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-medium mb-2">Scoring</h3>
            <p className="mb-2">
              <span className="font-medium">Total Score:</span> {totalScore} out of 21
            </p>
            <p className="mb-2">
              <span className="font-medium">Interpretation:</span> {interpretation}
            </p>
          </div>
          <div>
            <h3 className="text-lg font-medium mb-2">GAD-7 Score Interpretation</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>0-4: Minimal anxiety</li>
              <li>5-9: Mild anxiety</li>
              <li>10-14: Moderate anxiety</li>
              <li>15-21: Severe anxiety</li>
            </ul>
          </div>
        </div>
      </div>
      
      <div className="flex justify-end gap-4">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          disabled={isSubmitting || !clientId}
          className="flex items-center gap-2"
        >
          {isSubmitting ? (
            "Saving..."
          ) : isSaved ? (
            <>
              <CheckCircle className="h-4 w-4" /> Saved
            </>
          ) : (
            "Save Assessment"
          )}
        </Button>
      </div>
    </div>
  );
};

export default GAD7Template;
