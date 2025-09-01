import React, { memo } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";

interface MentalStatusSectionProps {
  formState: any;
  editModes: any;
  handleChange: (field: string, value: string) => void;
  toggleEditMode: (field: string, value: string) => void;
  clearField: (field: string) => void;
  phq9Data?: any;
}

export const MentalStatusSection: React.FC<MentalStatusSectionProps> = memo(({
  formState,
  editModes,
  handleChange,
  toggleEditMode,
  clearField,
  phq9Data
}) => {
  const isHighRisk = phq9Data?.question_9 > 0;
  
  const MentalStatusField = memo(({ 
    field, 
    label, 
    defaultOption, 
    isEditMode, 
    value 
  }: {
    field: string;
    label: string;
    defaultOption: string;
    isEditMode: boolean;
    value: string;
  }) => (
    <div className="min-h-[80px]"> {/* Fixed height to prevent layout shifts */}
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {isEditMode ? (
        <div className="relative">
          <Input
            value={value}
            onChange={(e) => handleChange(field, e.target.value)}
            placeholder={`Describe ${label.toLowerCase()}`}
            className="w-full pr-8"
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
            onClick={() => clearField(field)}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      ) : (
        <Select
          value={value}
          onValueChange={(value) => toggleEditMode(field, value)}
        >
          <SelectTrigger className="bg-background border-input">
            <SelectValue placeholder={`Select ${label.toLowerCase()}`} />
          </SelectTrigger>
          <SelectContent className="bg-background border border-border shadow-lg z-50">
            <SelectItem value={defaultOption}>{defaultOption}</SelectItem>
            <SelectItem value="Other">Other (Free Text)</SelectItem>
          </SelectContent>
        </Select>
      )}
    </div>
  ));

  return (
    <>
      <h4 className="text-md font-medium text-gray-800 mb-4">Mental Status Examination</h4>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <MentalStatusField
          field="appearance"
          label="Appearance"
          defaultOption="Normal Appearance & Grooming"
          isEditMode={editModes.appearance}
          value={formState.appearance}
        />
        <MentalStatusField
          field="attitude"
          label="Attitude"
          defaultOption="Calm & Cooperative"
          isEditMode={editModes.attitude}
          value={formState.attitude}
        />
        <MentalStatusField
          field="behavior"
          label="Behavior"
          defaultOption="No unusual behavior or psychomotor changes"
          isEditMode={editModes.behavior}
          value={formState.behavior}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <MentalStatusField
          field="speech"
          label="Speech"
          defaultOption="Normal rate/tone/volume w/out pressure"
          isEditMode={editModes.speech}
          value={formState.speech}
        />
        <MentalStatusField
          field="affect"
          label="Affect"
          defaultOption="Normal range/congruent"
          isEditMode={editModes.affect}
          value={formState.affect}
        />
        <MentalStatusField
          field="thoughtProcess"
          label="Thought Process"
          defaultOption="Goal Oriented/Directed"
          isEditMode={editModes.thoughtProcess}
          value={formState.thoughtProcess}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <MentalStatusField
          field="perception"
          label="Perception"
          defaultOption="No Hallucinations or Delusions"
          isEditMode={editModes.perception}
          value={formState.perception}
        />
        <MentalStatusField
          field="orientation"
          label="Orientation"
          defaultOption="Oriented x3"
          isEditMode={editModes.orientation}
          value={formState.orientation}
        />
        <MentalStatusField
          field="memoryConcentration"
          label="Memory/Concentration"
          defaultOption="Short & Long Term Intact"
          isEditMode={editModes.memoryConcentration}
          value={formState.memoryConcentration}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <MentalStatusField
          field="insightJudgement"
          label="Insight/Judgement"
          defaultOption="Good"
          isEditMode={editModes.insightJudgement}
          value={formState.insightJudgement}
        />
        <div className="min-h-[80px]">
          <label className="block text-sm font-medium text-gray-700 mb-1">Mood</label>
          <Input
            placeholder="Describe mood"
            value={formState.mood}
            onChange={(e) => handleChange('mood', e.target.value)}
          />
        </div>
        <div className="min-h-[80px]">
          <label className="block text-sm font-medium text-gray-700 mb-1">Substance Abuse Risk</label>
          <Select
            value={formState.substanceAbuseRisk}
            onValueChange={(value) => handleChange('substanceAbuseRisk', value)}
          >
            <SelectTrigger className="bg-background border-input">
              <SelectValue placeholder="Select risk level" />
            </SelectTrigger>
            <SelectContent className="bg-background border border-border shadow-lg z-50">
              <SelectItem value="None">None</SelectItem>
              <SelectItem value="Low">Low</SelectItem>
              <SelectItem value="Medium">Medium</SelectItem>
              <SelectItem value="High">High</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className={`min-h-[80px] ${isHighRisk ? "p-3 rounded-md bg-red-50 border border-red-200" : ""}`}>
          <label className="block text-sm font-medium text-gray-700 mb-1">Suicidal Ideation</label>
          <Select
            value={formState.suicidalIdeation}
            onValueChange={(value) => handleChange('suicidalIdeation', value)}
          >
            <SelectTrigger className="bg-background border-input">
              <SelectValue placeholder="Select ideation level" />
            </SelectTrigger>
            <SelectContent className="bg-background border border-border shadow-lg z-50">
              <SelectItem value="None">None</SelectItem>
              <SelectItem value="Passive">Passive</SelectItem>
              <SelectItem value="Active">Active</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="min-h-[80px]">
          <label className="block text-sm font-medium text-gray-700 mb-1">Homicidal Ideation</label>
          <Select
            value={formState.homicidalIdeation}
            onValueChange={(value) => handleChange('homicidalIdeation', value)}
          >
            <SelectTrigger className="bg-background border-input">
              <SelectValue placeholder="Select ideation level" />
            </SelectTrigger>
            <SelectContent className="bg-background border border-border shadow-lg z-50">
              <SelectItem value="None">None</SelectItem>
              <SelectItem value="Passive">Passive</SelectItem>
              <SelectItem value="Active">Active</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </>
  );
});

MentalStatusSection.displayName = 'MentalStatusSection';