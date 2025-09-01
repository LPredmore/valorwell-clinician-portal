
import React, { memo } from 'react';
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PHQ9AssessmentSection } from './PHQ9AssessmentSection';
import { StableSelectField } from './StableSelectField';
import { Sparkles, Check } from 'lucide-react';

interface SessionAssessmentSectionProps {
  formState: any;
  handleChange: (field: string, value: string) => void;
  phq9Data?: any;
  // AI Assist props
  isAiAssistMode?: boolean;
  selectedInterventions?: string[];
  isGeneratingNote?: boolean;
  toggleAiAssistMode?: () => void;
  toggleInterventionSelection?: (intervention: string) => void;
  handleAiAssist?: () => void;
}

export const SessionAssessmentSection: React.FC<SessionAssessmentSectionProps> = memo(({
  formState,
  handleChange,
  phq9Data,
  isAiAssistMode = false,
  selectedInterventions = [],
  isGeneratingNote = false,
  toggleAiAssistMode,
  toggleInterventionSelection,
  handleAiAssist
}) => {
  // Memoized options for the dropdown menus
  const functioningOptions = React.useMemo(() => [
    { value: "Excellent - Fully capable in all areas of life", label: "Excellent - Fully capable in all areas of life" },
    { value: "Good - Managing well with minimal impairment", label: "Good - Managing well with minimal impairment" },
    { value: "Satisfactory - Some challenges but maintaining essential functions", label: "Satisfactory - Some challenges but maintaining essential functions" },
    { value: "Fair - Moderate impairment in one or more areas", label: "Fair - Moderate impairment in one or more areas" },
    { value: "Limited - Significant impairment in multiple areas", label: "Limited - Significant impairment in multiple areas" },
    { value: "Poor - Severe impairment in daily functioning", label: "Poor - Severe impairment in daily functioning" },
    { value: "Very poor - Unable to function independently in most areas", label: "Very poor - Unable to function independently in most areas" },
    { value: "Crisis - Immediate intervention needed", label: "Crisis - Immediate intervention needed" }
  ], []);

  const prognosisOptions = React.useMemo(() => [
    { value: "Excellent - Highly likely to achieve all treatment goals", label: "Excellent - Highly likely to achieve all treatment goals" },
    { value: "Very Good - Strong likelihood of achieving most treatment goals", label: "Very Good - Strong likelihood of achieving most treatment goals" },
    { value: "Good - Likely to achieve primary treatment goals", label: "Good - Likely to achieve primary treatment goals" },
    { value: "Fair - May achieve some treatment goals with consistent effort", label: "Fair - May achieve some treatment goals with consistent effort" },
    { value: "Guarded - Limited expectation of achieving treatment goals", label: "Guarded - Limited expectation of achieving treatment goals" },
    { value: "Poor - Significant barriers to achieving treatment goals", label: "Poor - Significant barriers to achieving treatment goals" },
    { value: "Uncertain - Unable to determine likelihood at this time", label: "Uncertain - Unable to determine likelihood at this time" }
  ], []);

  const progressOptions = React.useMemo(() => [
    { value: "Exceptional - Exceeding expectations in all goal areas", label: "Exceptional - Exceeding expectations in all goal areas" },
    { value: "Substantial - Significant improvement toward most goals", label: "Substantial - Significant improvement toward most goals" },
    { value: "Steady - Consistent improvement at expected pace", label: "Steady - Consistent improvement at expected pace" },
    { value: "Moderate - Some improvement in key areas", label: "Moderate - Some improvement in key areas" },
    { value: "Minimal - Slight improvements noted", label: "Minimal - Slight improvements noted" },
    { value: "Fluctuating - Inconsistent progress with periods of improvement and regression", label: "Fluctuating - Inconsistent progress with periods of improvement and regression" },
    { value: "Stalled - No significant changes since last assessment", label: "Stalled - No significant changes since last assessment" },
    { value: "Early stage - Too early in treatment to evaluate progress", label: "Early stage - Too early in treatment to evaluate progress" },
    { value: "Regression - Decline in functioning or symptoms worsening", label: "Regression - Decline in functioning or symptoms worsening" }
  ], []);

  return (
    <>
      <h4 className="text-md font-medium text-gray-800 mb-4">Session Assessment</h4>

      <div className="mb-6 pdf-section">
        <label className="block text-sm font-medium text-gray-700 mb-1">Current Symptoms</label>
        <Textarea
          placeholder="Describe current symptoms"
          className="min-h-[100px] resize-y"
          value={formState.currentSymptoms}
          onChange={(e) => handleChange('currentSymptoms', e.target.value)}
          data-field-name="Current Symptoms"
        />
      </div>

      <StableSelectField
        value={formState.functioning}
        onValueChange={(value) => handleChange('functioning', value)}
        placeholder="Select client's level of functioning"
        options={functioningOptions}
        label="Functioning"
        className="mb-6 pdf-section"
      />

      <StableSelectField
        value={formState.prognosis}
        onValueChange={(value) => handleChange('prognosis', value)}
        placeholder="Select client's prognosis"
        options={prognosisOptions}
        label="Prognosis"
        className="mb-6 pdf-section"
      />

      <StableSelectField
        value={formState.progress}
        onValueChange={(value) => handleChange('progress', value)}
        placeholder="Select client's progress level"
        options={progressOptions}
        label="Progress"
        className="mb-6 pdf-section"
      />

      <div className="mb-6 pdf-section">
        <div className="flex items-center gap-2 mb-1">
          <label className="block text-sm font-medium text-gray-700">Session Narrative</label>
          {toggleAiAssistMode && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={toggleAiAssistMode}
              className="h-6 px-2 text-xs"
              disabled={isGeneratingNote}
            >
              <Sparkles className="h-3 w-3 mr-1" />
              AI Assist
            </Button>
          )}
          {isAiAssistMode && handleAiAssist && (
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={handleAiAssist}
              disabled={isGeneratingNote || selectedInterventions.length === 0}
              className="h-6 px-2 text-xs bg-primary hover:bg-primary/90"
            >
              <Check className="h-3 w-3 mr-1" />
              {isGeneratingNote ? 'Generating...' : 'Confirm AI Assist'}
            </Button>
          )}
        </div>
        <Textarea
          placeholder="Provide a detailed narrative of the session"
          className="min-h-[100px] resize-y"
          value={formState.sessionNarrative}
          onChange={(e) => handleChange('sessionNarrative', e.target.value)}
          data-field-name="Session Narrative"
          disabled={isGeneratingNote}
        />
      </div>
      
      {/* PHQ-9 Assessment Section - Now positioned right before the Plan & Signature */}
      {phq9Data && (
        <PHQ9AssessmentSection 
          phq9Data={phq9Data} 
          handleChange={handleChange}
        />
      )}

      <h4 className="text-md font-medium text-gray-800 mb-4">Plan & Signature</h4>

      {formState.nextTreatmentPlanUpdate && (
        <div className="mb-6 pdf-section">
          <label className="block text-sm font-medium text-gray-700 mb-1">Next Treatment Plan Update</label>
          <Input
            placeholder="When will this plan be reviewed next"
            value={formState.nextTreatmentPlanUpdate}
            onChange={(e) => handleChange('nextTreatmentPlanUpdate', e.target.value)}
            readOnly
            className="bg-gray-100"
            data-field-name="Next Treatment Plan Update"
            data-pdf-value={formState.nextTreatmentPlanUpdate}
          />
          {/* Hidden div for PDF output */}
          <div className="hidden pdf-only">{formState.nextTreatmentPlanUpdate}</div>
        </div>
      )}

      <div className="mb-6 pdf-section">
        <label className="block text-sm font-medium text-gray-700 mb-1">Signature</label>
        <Input
          placeholder="Digital signature"
          value={formState.signature}
          onChange={(e) => handleChange('signature', e.target.value)}
          data-field-name="Signature"
          data-pdf-value={formState.signature}
        />
        {/* Hidden div for PDF output */}
        <div className="hidden pdf-only">{formState.signature}</div>
      </div>

      {/* Private Note Field - Add private-note-container class for PDF exclusion */}
      <div className="mb-6 private-note-container">
        <label className="block text-sm font-medium text-gray-700 mb-1">Private Note</label>
        <Textarea
          placeholder="Add a private note that only clinicians can see"
          className="min-h-[100px] resize-y"
          value={formState.privateNote}
          onChange={(e) => handleChange('privateNote', e.target.value)}
          pdfVisible={false}
          data-field-name="Private Note"
        />
      </div>
    </>
  );
});

SessionAssessmentSection.displayName = 'SessionAssessmentSection';
