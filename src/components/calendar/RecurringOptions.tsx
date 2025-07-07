import React from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight } from 'lucide-react';

export type RecurrenceFrequency = 'weekly' | 'every_2_weeks' | 'every_3_weeks' | 'every_4_weeks';

interface RecurringOptionsProps {
  isRecurring: boolean;
  onRecurringChange: (value: boolean) => void;
  recurrenceFrequency: RecurrenceFrequency;
  onFrequencyChange: (frequency: RecurrenceFrequency) => void;
  recurrenceCount: number;
  onCountChange: (count: number) => void;
  disabled?: boolean;
}

const RecurringOptions: React.FC<RecurringOptionsProps> = ({
  isRecurring,
  onRecurringChange,
  recurrenceFrequency,
  onFrequencyChange,
  recurrenceCount,
  onCountChange,
  disabled = false
}) => {
  const frequencyOptions = [
    { value: 'weekly', label: 'Weekly' },
    { value: 'every_2_weeks', label: 'Every 2 Weeks' },
    { value: 'every_3_weeks', label: 'Every 3 Weeks' },
    { value: 'every_4_weeks', label: 'Every 4 Weeks' }
  ];

  // Generate count options from 4 to 50
  const countOptions = Array.from({ length: 47 }, (_, i) => ({
    value: i + 4,
    label: (i + 4).toString()
  }));

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2">
        <Checkbox
          id="recurring"
          checked={isRecurring}
          onCheckedChange={onRecurringChange}
          disabled={disabled}
        />
        <Label htmlFor="recurring">Recurring</Label>
      </div>

      <Collapsible open={isRecurring}>
        <CollapsibleContent className="space-y-4">
          <div className="ml-6 space-y-4 p-4 border rounded-lg bg-muted/50">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="frequency" className="text-right">How Often *</Label>
              <Select
                value={recurrenceFrequency}
                onValueChange={(value) => onFrequencyChange(value as RecurrenceFrequency)}
                disabled={disabled}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select frequency..." />
                </SelectTrigger>
                <SelectContent>
                  {frequencyOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="count" className="text-right">How Many Times *</Label>
              <Select
                value={recurrenceCount.toString()}
                onValueChange={(value) => onCountChange(parseInt(value))}
                disabled={disabled}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select count..." />
                </SelectTrigger>
                <SelectContent>
                  {countOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value.toString()}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="text-sm text-muted-foreground">
              This will create {recurrenceCount} appointments {frequencyOptions.find(f => f.value === recurrenceFrequency)?.label.toLowerCase()}
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};

export default RecurringOptions;