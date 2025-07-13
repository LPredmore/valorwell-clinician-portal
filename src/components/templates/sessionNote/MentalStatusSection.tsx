
import React from 'react';
import { Input } from "@/components/ui/input";
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
  phq9Data?: any;
}

export const MentalStatusSection: React.FC<MentalStatusSectionProps> = ({
  formState,
  editModes,
  handleChange,
  toggleEditMode,
  phq9Data
}) => {
  const isHighRisk = phq9Data?.question_9 > 0;
  return (
    <>
      <h4 className="text-md font-medium text-gray-800 mb-4">Mental Status Examination</h4>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Appearance</label>
          {editModes.appearance ? (
            <Input
              value={formState.appearance}
              onChange={(e) => handleChange('appearance', e.target.value)}
              placeholder="Describe appearance"
              className="w-full"
            />
          ) : (
            <Select
              value={formState.appearance}
              onValueChange={(value) => toggleEditMode('appearance', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select appearance" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Normal Appearance & Grooming">Normal Appearance & Grooming</SelectItem>
                <SelectItem value="Other">Other (Free Text)</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Attitude</label>
          {editModes.attitude ? (
            <Input
              value={formState.attitude}
              onChange={(e) => handleChange('attitude', e.target.value)}
              placeholder="Describe attitude"
              className="w-full"
            />
          ) : (
            <Select
              value={formState.attitude}
              onValueChange={(value) => toggleEditMode('attitude', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select attitude" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Calm & Cooperative">Calm & Cooperative</SelectItem>
                <SelectItem value="Other">Other (Free Text)</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Behavior</label>
          {editModes.behavior ? (
            <Input
              value={formState.behavior}
              onChange={(e) => handleChange('behavior', e.target.value)}
              placeholder="Describe behavior"
              className="w-full"
            />
          ) : (
            <Select
              value={formState.behavior}
              onValueChange={(value) => toggleEditMode('behavior', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select behavior" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="No unusual behavior or psychomotor changes">No unusual behavior or psychomotor changes</SelectItem>
                <SelectItem value="Other">Other (Free Text)</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Speech</label>
          {editModes.speech ? (
            <Input
              value={formState.speech}
              onChange={(e) => handleChange('speech', e.target.value)}
              placeholder="Describe speech"
              className="w-full"
            />
          ) : (
            <Select
              value={formState.speech}
              onValueChange={(value) => toggleEditMode('speech', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select speech" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Normal rate/tone/volume w/out pressure">Normal rate/tone/volume w/out pressure</SelectItem>
                <SelectItem value="Other">Other (Free Text)</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Affect</label>
          {editModes.affect ? (
            <Input
              value={formState.affect}
              onChange={(e) => handleChange('affect', e.target.value)}
              placeholder="Describe affect"
              className="w-full"
            />
          ) : (
            <Select
              value={formState.affect}
              onValueChange={(value) => toggleEditMode('affect', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select affect" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Normal range/congruent">Normal range/congruent</SelectItem>
                <SelectItem value="Other">Other (Free Text)</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Thought Process</label>
          {editModes.thoughtProcess ? (
            <Input
              value={formState.thoughtProcess}
              onChange={(e) => handleChange('thoughtProcess', e.target.value)}
              placeholder="Describe thought process"
              className="w-full"
            />
          ) : (
            <Select
              value={formState.thoughtProcess}
              onValueChange={(value) => toggleEditMode('thoughtProcess', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select thought process" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Goal Oriented/Directed">Goal Oriented/Directed</SelectItem>
                <SelectItem value="Other">Other (Free Text)</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Perception</label>
          {editModes.perception ? (
            <Input
              value={formState.perception}
              onChange={(e) => handleChange('perception', e.target.value)}
              placeholder="Describe perception"
              className="w-full"
            />
          ) : (
            <Select
              value={formState.perception}
              onValueChange={(value) => toggleEditMode('perception', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select perception" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="No Hallucinations or Delusions">No Hallucinations or Delusions</SelectItem>
                <SelectItem value="Other">Other (Free Text)</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Orientation</label>
          {editModes.orientation ? (
            <Input
              value={formState.orientation}
              onChange={(e) => handleChange('orientation', e.target.value)}
              placeholder="Describe orientation"
              className="w-full"
            />
          ) : (
            <Select
              value={formState.orientation}
              onValueChange={(value) => toggleEditMode('orientation', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select orientation" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Oriented x3">Oriented x3</SelectItem>
                <SelectItem value="Other">Other (Free Text)</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Memory/Concentration</label>
          {editModes.memoryConcentration ? (
            <Input
              value={formState.memoryConcentration}
              onChange={(e) => handleChange('memoryConcentration', e.target.value)}
              placeholder="Describe memory/concentration"
              className="w-full"
            />
          ) : (
            <Select
              value={formState.memoryConcentration}
              onValueChange={(value) => toggleEditMode('memoryConcentration', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select memory/concentration" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Short & Long Term Intact">Short & Long Term Intact</SelectItem>
                <SelectItem value="Other">Other (Free Text)</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Insight/Judgement</label>
          {editModes.insightJudgement ? (
            <Input
              value={formState.insightJudgement}
              onChange={(e) => handleChange('insightJudgement', e.target.value)}
              placeholder="Describe insight/judgement"
              className="w-full"
            />
          ) : (
            <Select
              value={formState.insightJudgement}
              onValueChange={(value) => toggleEditMode('insightJudgement', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select insight/judgement" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Good">Good</SelectItem>
                <SelectItem value="Other">Other (Free Text)</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Mood</label>
          <Input
            placeholder="Describe mood"
            value={formState.mood}
            onChange={(e) => handleChange('mood', e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Substance Abuse Risk</label>
          <Select
            value={formState.substanceAbuseRisk}
            onValueChange={(value) => handleChange('substanceAbuseRisk', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select risk level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="None">None</SelectItem>
              <SelectItem value="Low">Low</SelectItem>
              <SelectItem value="Medium">Medium</SelectItem>
              <SelectItem value="High">High</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className={isHighRisk ? "p-3 rounded-md bg-red-50 border border-red-200" : ""}>
          <label className="block text-sm font-medium text-gray-700 mb-1">Suicidal Ideation</label>
          <Select
            value={formState.suicidalIdeation}
            onValueChange={(value) => handleChange('suicidalIdeation', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select ideation level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="None">None</SelectItem>
              <SelectItem value="Passive">Passive</SelectItem>
              <SelectItem value="Active">Active</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Homicidal Ideation</label>
          <Select
            value={formState.homicidalIdeation}
            onValueChange={(value) => handleChange('homicidalIdeation', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select ideation level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="None">None</SelectItem>
              <SelectItem value="Passive">Passive</SelectItem>
              <SelectItem value="Active">Active</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </>
  );
};
