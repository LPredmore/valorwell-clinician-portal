import React, { useState, useEffect } from 'react';
import { DateTime } from 'luxon';
import { 
  AppointmentConflict, 
  ConflictType, 
  ConflictResolutionStrategy,
  resolveConflict,
  suggestAlternativeTimes
} from '@/utils/conflictDetectionUtils';
import { Appointment } from '@/types/appointment';
import { TimeZoneService } from '@/utils/timeZoneService';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { CalendarIcon, AlertTriangle, Clock, ArrowRight } from 'lucide-react';

export interface ConflictResolutionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conflicts: AppointmentConflict[];
  onResolve: (resolvedAppointments: Appointment[]) => void;
  onCancel: () => void;
  existingAppointments: Appointment[];
  timezone: string;
}

export const ConflictResolutionDialog: React.FC<ConflictResolutionDialogProps> = ({
  open,
  onOpenChange,
  conflicts,
  onResolve,
  onCancel,
  existingAppointments,
  timezone
}) => {
  const [selectedConflictIndex, setSelectedConflictIndex] = useState(0);
  const [selectedStrategy, setSelectedStrategy] = useState<ConflictResolutionStrategy | null>(null);
  const [alternativeTimes, setAlternativeTimes] = useState<Appointment[]>([]);
  const [selectedAlternativeIndex, setSelectedAlternativeIndex] = useState<number | null>(null);
  const [customStartDate, setCustomStartDate] = useState<Date | undefined>(undefined);
  const [customStartTime, setCustomStartTime] = useState('');
  const [customEndTime, setCustomEndTime] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  
  // Get the current conflict
  const currentConflict = conflicts[selectedConflictIndex];
  
  // Reset state when conflicts change
  useEffect(() => {
    if (conflicts.length > 0) {
      setSelectedConflictIndex(0);
      setSelectedStrategy(null);
      setAlternativeTimes([]);
      setSelectedAlternativeIndex(null);
      setCustomStartDate(undefined);
      setCustomStartTime('');
      setCustomEndTime('');
      setCancelReason('');
      
      // Generate alternative times for the first conflict
      const alternatives = suggestAlternativeTimes(
        conflicts[0].appointment1,
        existingAppointments,
        timezone
      );
      setAlternativeTimes(alternatives);
    }
  }, [conflicts, existingAppointments, timezone]);
  
  // Update alternative times when selected conflict changes
  useEffect(() => {
    if (currentConflict) {
      const alternatives = suggestAlternativeTimes(
        currentConflict.appointment1,
        existingAppointments,
        timezone
      );
      setAlternativeTimes(alternatives);
      setSelectedAlternativeIndex(null);
    }
  }, [selectedConflictIndex, currentConflict, existingAppointments, timezone]);
  
  // Format date for display
  const formatDate = (dateStr: string): string => {
    return DateTime.fromISO(dateStr, { zone: 'UTC' })
      .setZone(timezone)
      .toFormat('MMMM d, yyyy');
  };
  
  // Format time for display
  const formatTime = (dateStr: string): string => {
    return DateTime.fromISO(dateStr, { zone: 'UTC' })
      .setZone(timezone)
      .toFormat('h:mm a');
  };
  
  // Get conflict type description
  const getConflictTypeDescription = (type: ConflictType): string => {
    switch (type) {
      case ConflictType.OVERLAP:
        return 'Appointments overlap';
      case ConflictType.CONTAINED:
        return 'Appointment is contained within another';
      case ConflictType.CONTAINS:
        return 'Appointment contains another';
      case ConflictType.ADJACENT:
        return 'Appointments are adjacent';
      case ConflictType.BACK_TO_BACK:
        return 'Appointments are back-to-back';
      default:
        return 'Conflict detected';
    }
  };
  
  // Handle strategy selection
  const handleStrategySelect = (strategy: ConflictResolutionStrategy) => {
    setSelectedStrategy(strategy);
    
    // Reset fields based on strategy
    if (strategy === ConflictResolutionStrategy.RESCHEDULE) {
      // Initialize with current appointment date/time
      const startDt = DateTime.fromISO(currentConflict.appointment1.start_at, { zone: 'UTC' }).setZone(timezone);
      const endDt = DateTime.fromISO(currentConflict.appointment1.end_at, { zone: 'UTC' }).setZone(timezone);
      
      setCustomStartDate(startDt.toJSDate());
      setCustomStartTime(startDt.toFormat('HH:mm'));
      setCustomEndTime(endDt.toFormat('HH:mm'));
    } else if (strategy === ConflictResolutionStrategy.CANCEL) {
      setCancelReason('');
    }
  };
  
  // Handle alternative time selection
  const handleAlternativeSelect = (index: number) => {
    setSelectedAlternativeIndex(index);
    setSelectedStrategy(ConflictResolutionStrategy.RESCHEDULE);
  };
  
  // Handle custom time change
  const handleCustomTimeChange = (field: 'start' | 'end', value: string) => {
    if (field === 'start') {
      setCustomStartTime(value);
      
      // Update end time to maintain duration if start time changes
      if (customStartTime && customEndTime) {
        const startParts = customStartTime.split(':').map(Number);
        const endParts = customEndTime.split(':').map(Number);
        const startMinutes = startParts[0] * 60 + startParts[1];
        const endMinutes = endParts[0] * 60 + endParts[1];
        const duration = endMinutes - startMinutes;
        
        const newStartParts = value.split(':').map(Number);
        const newStartMinutes = newStartParts[0] * 60 + newStartParts[1];
        const newEndMinutes = newStartMinutes + duration;
        
        const newEndHours = Math.floor(newEndMinutes / 60);
        const newEndMinutesRemainder = newEndMinutes % 60;
        
        setCustomEndTime(`${newEndHours.toString().padStart(2, '0')}:${newEndMinutesRemainder.toString().padStart(2, '0')}`);
      }
    } else {
      setCustomEndTime(value);
    }
  };
  
  // Handle resolution
  const handleResolve = () => {
    if (!currentConflict || !selectedStrategy) return;
    
    let resolvedAppointment: Appointment | Appointment[] | null = null;
    
    // Apply the selected resolution strategy
    if (selectedStrategy === ConflictResolutionStrategy.RESCHEDULE) {
      if (selectedAlternativeIndex !== null) {
        // Use selected alternative time
        resolvedAppointment = alternativeTimes[selectedAlternativeIndex];
      } else if (customStartDate && customStartTime && customEndTime) {
        // Use custom time
        const startDt = DateTime.fromFormat(`${DateTime.fromJSDate(customStartDate).toFormat('yyyy-MM-dd')} ${customStartTime}`, 'yyyy-MM-dd HH:mm', { zone: timezone });
        const endDt = DateTime.fromFormat(`${DateTime.fromJSDate(customStartDate).toFormat('yyyy-MM-dd')} ${customEndTime}`, 'yyyy-MM-dd HH:mm', { zone: timezone });
        
        resolvedAppointment = resolveConflict(
          currentConflict,
          ConflictResolutionStrategy.RESCHEDULE,
          {
            newStartTime: startDt.toUTC().toISO(),
            newEndTime: endDt.toUTC().toISO()
          }
        );
      }
    } else if (selectedStrategy === ConflictResolutionStrategy.SHORTEN) {
      // Shorten to end before the conflicting appointment starts
      const conflictStartDt = DateTime.fromISO(currentConflict.appointment2.start_at, { zone: 'UTC' });
      
      resolvedAppointment = resolveConflict(
        currentConflict,
        ConflictResolutionStrategy.SHORTEN,
        {
          newEndTime: conflictStartDt.toISO()
        }
      );
    } else if (selectedStrategy === ConflictResolutionStrategy.SPLIT) {
      // Split around the conflicting appointment
      const conflictStartDt = DateTime.fromISO(currentConflict.appointment2.start_at, { zone: 'UTC' });
      const conflictEndDt = DateTime.fromISO(currentConflict.appointment2.end_at, { zone: 'UTC' });
      
      resolvedAppointment = resolveConflict(
        currentConflict,
        ConflictResolutionStrategy.SPLIT,
        {
          newEndTime: conflictStartDt.toISO(),
          newStartTime: conflictEndDt.toISO()
        }
      );
    } else if (selectedStrategy === ConflictResolutionStrategy.CANCEL) {
      // Cancel the appointment
      resolvedAppointment = resolveConflict(
        currentConflict,
        ConflictResolutionStrategy.CANCEL,
        {
          cancelReason: cancelReason
        }
      );
    } else {
      // Override or ignore
      resolvedAppointment = resolveConflict(
        currentConflict,
        selectedStrategy
      );
    }
    
    // Convert to array if not already
    const resolvedAppointments = Array.isArray(resolvedAppointment)
      ? resolvedAppointment
      : [resolvedAppointment];
    
    // Call the onResolve callback
    onResolve(resolvedAppointments as Appointment[]);
    
    // Move to the next conflict or close the dialog
    if (selectedConflictIndex < conflicts.length - 1) {
      setSelectedConflictIndex(selectedConflictIndex + 1);
      setSelectedStrategy(null);
      setSelectedAlternativeIndex(null);
    } else {
      onOpenChange(false);
    }
  };
  
  // Generate time options for the time picker
  const generateTimeOptions = () => {
    const options = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
        const formattedHour = hour.toString().padStart(2, '0');
        const formattedMinute = minute.toString().padStart(2, '0');
        options.push(`${formattedHour}:${formattedMinute}`);
      }
    }
    return options;
  };
  
  // Time options for select
  const timeOptions = generateTimeOptions();
  
  if (!currentConflict) {
    return null;
  }
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <AlertTriangle className="h-5 w-5 text-yellow-500 mr-2" />
            Appointment Conflict Detected
          </DialogTitle>
          <DialogDescription>
            {conflicts.length > 1 ? (
              <span>
                {selectedConflictIndex + 1} of {conflicts.length} conflicts to resolve
              </span>
            ) : (
              <span>Please resolve the scheduling conflict</span>
            )}
          </DialogDescription>
        </DialogHeader>
        
        {/* Conflict details */}
        <div className="space-y-4 py-4">
          <Alert variant="destructive">
            <AlertTitle>{getConflictTypeDescription(currentConflict.type)}</AlertTitle>
            <AlertDescription>
              {currentConflict.overlapDurationMinutes && (
                <span>Appointments overlap by {currentConflict.overlapDurationMinutes} minutes</span>
              )}
            </AlertDescription>
          </Alert>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* New appointment */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">New Appointment</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center">
                    <CalendarIcon className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span>{formatDate(currentConflict.appointment1.start_at)}</span>
                  </div>
                  <div className="flex items-center">
                    <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span>
                      {formatTime(currentConflict.appointment1.start_at)} - {formatTime(currentConflict.appointment1.end_at)}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <span className="font-medium mr-2">Client:</span>
                    <span>{currentConflict.appointment1.clientName || 'Unknown Client'}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Existing appointment */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Existing Appointment</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center">
                    <CalendarIcon className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span>{formatDate(currentConflict.appointment2.start_at)}</span>
                  </div>
                  <div className="flex items-center">
                    <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span>
                      {formatTime(currentConflict.appointment2.start_at)} - {formatTime(currentConflict.appointment2.end_at)}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <span className="font-medium mr-2">Client:</span>
                    <span>{currentConflict.appointment2.clientName || 'Unknown Client'}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Resolution options */}
          <div className="mt-6">
            <h3 className="text-lg font-medium mb-4">Resolution Options</h3>
            
            <Tabs defaultValue="suggested" className="w-full">
              <TabsList className="grid grid-cols-2">
                <TabsTrigger value="suggested">Suggested Times</TabsTrigger>
                <TabsTrigger value="options">Resolution Options</TabsTrigger>
              </TabsList>
              
              {/* Suggested alternative times */}
              <TabsContent value="suggested">
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Select one of these alternative times to reschedule the appointment
                  </p>
                  
                  <ScrollArea className="h-[200px] rounded-md border">
                    <div className="p-4 space-y-2">
                      {alternativeTimes.length > 0 ? (
                        alternativeTimes.map((alt, index) => (
                          <div
                            key={index}
                            className={`p-3 border rounded-md cursor-pointer transition-colors ${
                              selectedAlternativeIndex === index
                                ? 'border-primary bg-primary/10'
                                : 'hover:bg-muted'
                            }`}
                            onClick={() => handleAlternativeSelect(index)}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="font-medium">{formatDate(alt.start_at)}</div>
                                <div className="text-sm">
                                  {formatTime(alt.start_at)} - {formatTime(alt.end_at)}
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleAlternativeSelect(index)}
                              >
                                Select
                              </Button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          <p>No alternative times available</p>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </div>
              </TabsContent>
              
              {/* Resolution strategies */}
              <TabsContent value="options">
                <RadioGroup
                  value={selectedStrategy || ''}
                  onValueChange={(value) => handleStrategySelect(value as ConflictResolutionStrategy)}
                  className="space-y-3"
                >
                  {currentConflict.possibleResolutions.map((strategy) => (
                    <div key={strategy} className="flex items-start space-x-2">
                      <RadioGroupItem value={strategy} id={`strategy-${strategy}`} />
                      <div className="grid gap-1.5">
                        <Label htmlFor={`strategy-${strategy}`} className="font-medium">
                          {strategy === ConflictResolutionStrategy.RESCHEDULE && 'Reschedule'}
                          {strategy === ConflictResolutionStrategy.SHORTEN && 'Shorten'}
                          {strategy === ConflictResolutionStrategy.SPLIT && 'Split'}
                          {strategy === ConflictResolutionStrategy.CANCEL && 'Cancel'}
                          {strategy === ConflictResolutionStrategy.OVERRIDE && 'Override'}
                          {strategy === ConflictResolutionStrategy.IGNORE && 'Ignore'}
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          {strategy === ConflictResolutionStrategy.RESCHEDULE && 'Move the appointment to a different time'}
                          {strategy === ConflictResolutionStrategy.SHORTEN && 'Shorten the appointment to end before the conflict'}
                          {strategy === ConflictResolutionStrategy.SPLIT && 'Split into two appointments around the conflict'}
                          {strategy === ConflictResolutionStrategy.CANCEL && 'Cancel this appointment'}
                          {strategy === ConflictResolutionStrategy.OVERRIDE && 'Keep this appointment despite the conflict'}
                          {strategy === ConflictResolutionStrategy.IGNORE && 'Ignore the conflict warning'}
                        </p>
                      </div>
                    </div>
                  ))}
                </RadioGroup>
                
                {/* Strategy-specific options */}
                {selectedStrategy === ConflictResolutionStrategy.RESCHEDULE && (
                  <div className="mt-4 space-y-4 border-t pt-4">
                    <h4 className="font-medium">Custom Reschedule</h4>
                    
                    <div className="space-y-2">
                      <Label htmlFor="custom-date">Date</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className="w-full justify-start text-left font-normal"
                            id="custom-date"
                          >
                            {customStartDate ? (
                              <span>{DateTime.fromJSDate(customStartDate).toFormat('MMMM d, yyyy')}</span>
                            ) : (
                              <span className="text-muted-foreground">Select a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={customStartDate}
                            onSelect={setCustomStartDate}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="custom-start-time">Start Time</Label>
                        <select
                          id="custom-start-time"
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          value={customStartTime}
                          onChange={(e) => handleCustomTimeChange('start', e.target.value)}
                        >
                          <option value="">Select time</option>
                          {timeOptions.map((time) => (
                            <option key={`start-${time}`} value={time}>
                              {DateTime.fromFormat(time, 'HH:mm').toFormat('h:mm a')}
                            </option>
                          ))}
                        </select>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="custom-end-time">End Time</Label>
                        <select
                          id="custom-end-time"
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          value={customEndTime}
                          onChange={(e) => handleCustomTimeChange('end', e.target.value)}
                        >
                          <option value="">Select time</option>
                          {timeOptions.map((time) => (
                            <option key={`end-${time}`} value={time}>
                              {DateTime.fromFormat(time, 'HH:mm').toFormat('h:mm a')}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    
                    {customStartDate && customStartTime && customEndTime && (
                      <div className="mt-2 p-2 bg-muted rounded-md">
                        <div className="flex items-center">
                          <span className="text-sm">New appointment time:</span>
                          <span className="ml-2 font-medium">
                            {DateTime.fromJSDate(customStartDate).toFormat('MMMM d, yyyy')}
                            {' '}
                            {DateTime.fromFormat(customStartTime, 'HH:mm').toFormat('h:mm a')}
                            {' - '}
                            {DateTime.fromFormat(customEndTime, 'HH:mm').toFormat('h:mm a')}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                
                {selectedStrategy === ConflictResolutionStrategy.CANCEL && (
                  <div className="mt-4 space-y-4 border-t pt-4">
                    <div className="space-y-2">
                      <Label htmlFor="cancel-reason">Cancellation Reason (Optional)</Label>
                      <Textarea
                        id="cancel-reason"
                        placeholder="Enter reason for cancellation"
                        value={cancelReason}
                        onChange={(e) => setCancelReason(e.target.value)}
                      />
                    </div>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            onClick={handleResolve}
            disabled={
              !selectedStrategy ||
              (selectedStrategy === ConflictResolutionStrategy.RESCHEDULE &&
                selectedAlternativeIndex === null &&
                (!customStartDate || !customStartTime || !customEndTime))
            }
          >
            Resolve Conflict
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ConflictResolutionDialog;