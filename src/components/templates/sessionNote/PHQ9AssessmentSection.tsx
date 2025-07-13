
import React from 'react';
import { Textarea } from "@/components/ui/textarea";

interface PHQ9AssessmentSectionProps {
  phq9Data: any;
  handleChange?: (field: string, value: string) => void;
}

export const PHQ9AssessmentSection: React.FC<PHQ9AssessmentSectionProps> = ({
  phq9Data,
  handleChange
}) => {
  if (!phq9Data) {
    return null; // Don't render anything if no PHQ-9 data is available
  }
  
  return (
    <div className="mb-6 mt-6 pdf-section">
      <h4 className="text-md font-medium text-gray-800 mb-4">PHQ-9 Assessment</h4>
      
      {phq9Data.phq9_narrative && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">PHQ-9 Narrative</label>
          <Textarea 
            className="min-h-[100px] resize-y" 
            value={phq9Data.phq9_narrative || ''} 
            onChange={(e) => handleChange?.('phq9_narrative', e.target.value)}
            data-field-name="PHQ-9 Narrative"
            placeholder="Enter PHQ-9 narrative details..."
          />
        </div>
      )}

      {phq9Data.phq9_score !== undefined && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">PHQ-9 Score</label>
          <div className="bg-gray-100 border border-gray-300 rounded px-3 py-2 text-sm"
               data-pdf-value={`${phq9Data.phq9_score} - ${getScoreInterpretation(phq9Data.phq9_score)}`}>
            {phq9Data.phq9_score} - {getScoreInterpretation(phq9Data.phq9_score)}
          </div>
          {/* Hidden div for PDF output */}
          <div className="hidden pdf-only">
            {phq9Data.phq9_score} - {getScoreInterpretation(phq9Data.phq9_score)}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          {/* Additional PHQ-9 data can be added here if needed */}
        </div>
        <div>
          {/* Additional PHQ-9 data can be added here if needed */}
        </div>
      </div>
    </div>
  );
};

// Helper function to interpret PHQ-9 scores
function getScoreInterpretation(score: number): string {
  if (score >= 0 && score <= 4) return "None-minimal depression";
  if (score >= 5 && score <= 9) return "Mild depression";
  if (score >= 10 && score <= 14) return "Moderate depression";
  if (score >= 15 && score <= 19) return "Moderately severe depression";
  if (score >= 20) return "Severe depression";
  return "Score interpretation unavailable";
}
