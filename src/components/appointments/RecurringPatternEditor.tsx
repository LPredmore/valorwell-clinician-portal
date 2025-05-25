import React, { useState, useEffect } from 'react';
import { RecurringPattern } from '@/types/appointment';
import { formatRecurringPattern } from '@/utils/recurringAppointmentUtils';
import { TimeZoneService } from '@/utils/timeZoneService';
import { DateTime } from 'luxon';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useForm } from 'react-hook-form';

export interface RecurringPatternEditorProps {
  initialPattern?: RecurringPattern;
  onChange: (pattern: RecurringPattern) => void;
  onCancel?: () => void;
  timezone?: string;
}

export const RecurringPatternEditor: React.FC<RecurringPatternEditorProps> = ({
  initialPattern,
  onChange,
  onCancel,
  timezone = 'America/Chicago'
}) => {
  // Default pattern
  const defaultPattern: RecurringPattern = {
    frequency: 'weekly',
    interval: 1,
    daysOfWeek: [DateTime.now().weekday % 7], // Current day of week (0-based)
    timezone: TimeZoneService.ensureIANATimeZone(timezone)
  };

  // Initialize with provided pattern or default
  const [pattern, setPattern] = useState<RecurringPattern>(initialPattern || defaultPattern);
  
  // End type radio options
  const [endType, setEndType] = useState<'never' | 'after' | 'on'>(
    initialPattern?.endDate ? 'on' : 
    initialPattern?.endAfterOccurrences ? 'after' : 
    'never'
  );
  
  // Form setup
  const form = useForm({
    defaultValues: {
      frequency: pattern.frequency,
      interval: pattern.interval,
      daysOfWeek: pattern.daysOfWeek || [],
      dayOfMonth: pattern.dayOfMonth || 1,
      weekOfMonth: pattern.weekOfMonth || 1,
      dayOfWeekMonth: pattern.dayOfWeekMonth || 1,
      monthOfYear: pattern.monthOfYear || 1,
      endAfterOccurrences: pattern.endAfterOccurrences || 10,
      endDate: pattern.endDate ? DateTime.fromISO(pattern.endDate).toJSDate() : undefined
    }
  });
  
  // Update pattern when form values change
  const updatePattern = (values: any) => {
    const updatedPattern: RecurringPattern = {
      ...pattern,
      frequency: values.frequency,
      interval: Number(values.interval),
      timezone: TimeZoneService.ensureIANATimeZone(timezone)
    };
    
    // Add frequency-specific fields
    if (values.frequency === 'weekly' && values.daysOfWeek?.length > 0) {
      updatedPattern.daysOfWeek = values.daysOfWeek;
    }
    
    if (values.frequency === 'monthly') {
      if (values.dayOfMonth) {
        updatedPattern.dayOfMonth = Number(values.dayOfMonth);
      }
      
      if (values.weekOfMonth && values.dayOfWeekMonth !== undefined) {
        updatedPattern.weekOfMonth = Number(values.weekOfMonth);
        updatedPattern.dayOfWeekMonth = Number(values.dayOfWeekMonth);
      }
    }
    
    if (values.frequency === 'yearly' && values.monthOfYear) {
      updatedPattern.monthOfYear = Number(values.monthOfYear);
    }
    
    // Add end condition
    if (endType === 'after' && values.endAfterOccurrences) {
      updatedPattern.endAfterOccurrences = Number(values.endAfterOccurrences);
      delete updatedPattern.endDate;
    } else if (endType === 'on' && values.endDate) {
      updatedPattern.endDate = DateTime.fromJSDate(values.endDate).toISODate();
      delete updatedPattern.endAfterOccurrences;
    } else {
      // No end date or occurrences limit
      delete updatedPattern.endDate;
      delete updatedPattern.endAfterOccurrences;
    }
    
    setPattern(updatedPattern);
    onChange(updatedPattern);
  };
  
  // Handle form submission
  const onSubmit = (values: any) => {
    updatePattern(values);
  };
  
  // Update form when frequency changes
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === 'frequency') {
        // Reset fields when frequency changes
        if (value.frequency === 'daily') {
          form.setValue('daysOfWeek', []);
          form.setValue('dayOfMonth', undefined);
          form.setValue('weekOfMonth', undefined);
          form.setValue('dayOfWeekMonth', undefined);
          form.setValue('monthOfYear', undefined);
        } else if (value.frequency === 'weekly') {
          // Set current day of week if empty
          if (!form.getValues('daysOfWeek') || form.getValues('daysOfWeek').length === 0) {
            form.setValue('daysOfWeek', [DateTime.now().weekday % 7]);
          }
          form.setValue('dayOfMonth', undefined);
          form.setValue('weekOfMonth', undefined);
          form.setValue('dayOfWeekMonth', undefined);
          form.setValue('monthOfYear', undefined);
        } else if (value.frequency === 'monthly') {
          form.setValue('daysOfWeek', []);
          // Set current day of month if empty
          if (!form.getValues('dayOfMonth')) {
            form.setValue('dayOfMonth', DateTime.now().day);
          }
          form.setValue('monthOfYear', undefined);
        } else if (value.frequency === 'yearly') {
          form.setValue('daysOfWeek', []);
          form.setValue('dayOfMonth', undefined);
          form.setValue('weekOfMonth', undefined);
          form.setValue('dayOfWeekMonth', undefined);
          // Set current month if empty
          if (!form.getValues('monthOfYear')) {
            form.setValue('monthOfYear', DateTime.now().month);
          }
        }
      }
      
      // Update pattern as user types
      updatePattern(form.getValues());
    });
    
    return () => subscription.unsubscribe();
  }, [form, form.watch]);
  
  // Days of week options
  const daysOfWeek = [
    { value: 0, label: 'Sunday' },
    { value: 1, label: 'Monday' },
    { value: 2, label: 'Tuesday' },
    { value: 3, label: 'Wednesday' },
    { value: 4, label: 'Thursday' },
    { value: 5, label: 'Friday' },
    { value: 6, label: 'Saturday' }
  ];
  
  // Week of month options
  const weeksOfMonth = [
    { value: 1, label: 'First' },
    { value: 2, label: 'Second' },
    { value: 3, label: 'Third' },
    { value: 4, label: 'Fourth' },
    { value: 5, label: 'Last' }
  ];
  
  // Month options
  const months = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' }
  ];
  
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Recurring Pattern</h3>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {/* Frequency */}
          <FormField
            control={form.control}
            name="frequency"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Frequency</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select frequency" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          
          {/* Interval */}
          <FormField
            control={form.control}
            name="interval"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Repeat every</FormLabel>
                <div className="flex items-center space-x-2">
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      max={99}
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                      className="w-20"
                    />
                  </FormControl>
                  <span>
                    {form.watch('frequency') === 'daily' && (form.watch('interval') === 1 ? 'day' : 'days')}
                    {form.watch('frequency') === 'weekly' && (form.watch('interval') === 1 ? 'week' : 'weeks')}
                    {form.watch('frequency') === 'monthly' && (form.watch('interval') === 1 ? 'month' : 'months')}
                    {form.watch('frequency') === 'yearly' && (form.watch('interval') === 1 ? 'year' : 'years')}
                  </span>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
          
          {/* Weekly options */}
          {form.watch('frequency') === 'weekly' && (
            <FormField
              control={form.control}
              name="daysOfWeek"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>On these days</FormLabel>
                  <div className="grid grid-cols-4 gap-2">
                    {daysOfWeek.map((day) => (
                      <div key={day.value} className="flex items-center space-x-2">
                        <Checkbox
                          checked={field.value?.includes(day.value)}
                          onCheckedChange={(checked) => {
                            const updatedDays = checked
                              ? [...(field.value || []), day.value]
                              : (field.value || []).filter((d: number) => d !== day.value);
                            field.onChange(updatedDays);
                          }}
                          id={`day-${day.value}`}
                        />
                        <label htmlFor={`day-${day.value}`} className="text-sm">
                          {day.label}
                        </label>
                      </div>
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
          
          {/* Monthly options */}
          {form.watch('frequency') === 'monthly' && (
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="dayOfMonth"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Day of month</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        max={31}
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                        className="w-20"
                      />
                    </FormControl>
                    <FormDescription>
                      The appointment will occur on this day of each month
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="flex items-center space-x-2">
                <span>Or on the</span>
                <FormField
                  control={form.control}
                  name="weekOfMonth"
                  render={({ field }) => (
                    <Select
                      onValueChange={(value) => field.onChange(parseInt(value))}
                      defaultValue={field.value?.toString()}
                    >
                      <SelectTrigger className="w-24">
                        <SelectValue placeholder="Week" />
                      </SelectTrigger>
                      <SelectContent>
                        {weeksOfMonth.map((week) => (
                          <SelectItem key={week.value} value={week.value.toString()}>
                            {week.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="dayOfWeekMonth"
                  render={({ field }) => (
                    <Select
                      onValueChange={(value) => field.onChange(parseInt(value))}
                      defaultValue={field.value?.toString()}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue placeholder="Day" />
                      </SelectTrigger>
                      <SelectContent>
                        {daysOfWeek.map((day) => (
                          <SelectItem key={day.value} value={day.value.toString()}>
                            {day.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                
                <span>of the month</span>
              </div>
            </div>
          )}
          
          {/* Yearly options */}
          {form.watch('frequency') === 'yearly' && (
            <FormField
              control={form.control}
              name="monthOfYear"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Month</FormLabel>
                  <Select
                    onValueChange={(value) => field.onChange(parseInt(value))}
                    defaultValue={field.value?.toString()}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select month" />
                    </SelectTrigger>
                    <SelectContent>
                      {months.map((month) => (
                        <SelectItem key={month.value} value={month.value.toString()}>
                          {month.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
          
          {/* End options */}
          <div className="space-y-2">
            <FormLabel>End</FormLabel>
            <RadioGroup
              value={endType}
              onValueChange={(value) => setEndType(value as 'never' | 'after' | 'on')}
              className="space-y-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="never" id="end-never" />
                <label htmlFor="end-never">Never</label>
              </div>
              
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="after" id="end-after" />
                <label htmlFor="end-after">After</label>
                <FormField
                  control={form.control}
                  name="endAfterOccurrences"
                  render={({ field }) => (
                    <Input
                      type="number"
                      min={1}
                      max={999}
                      disabled={endType !== 'after'}
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value) || 10)}
                      className="w-20"
                    />
                  )}
                />
                <span>occurrences</span>
              </div>
              
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="on" id="end-on" />
                <label htmlFor="end-on">On</label>
                <FormField
                  control={form.control}
                  name="endDate"
                  render={({ field }) => (
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-[240px] pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground",
                              endType !== 'on' && "opacity-50"
                            )}
                            disabled={endType !== 'on'}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => date < new Date()}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  )}
                />
              </div>
            </RadioGroup>
          </div>
          
          {/* Summary */}
          <div className="p-4 bg-muted rounded-md">
            <h4 className="font-medium mb-1">Summary</h4>
            <p>{formatRecurringPattern(pattern)}</p>
          </div>
          
          {/* Actions */}
          <div className="flex justify-end space-x-2">
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            )}
            <Button type="submit">
              Apply
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};

export default RecurringPatternEditor;