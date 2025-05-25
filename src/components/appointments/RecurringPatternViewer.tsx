import React, { useState } from 'react';
import { RecurringPattern, RecurringException } from '@/types/appointment';
import { formatRecurringPattern } from '@/utils/recurringAppointmentUtils';
import { DateTime } from 'luxon';
import { CalendarIcon, AlertCircle, Edit, Trash, Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';

export interface RecurringPatternViewerProps {
  pattern: RecurringPattern;
  exceptions?: RecurringException[];
  onEditPattern?: () => void;
  onAddException?: (date: string, reason: string) => void;
  onRemoveException?: (exceptionId: string) => void;
  onRescheduleException?: (exceptionId: string, newDate: string) => void;
  readOnly?: boolean;
}

export const RecurringPatternViewer: React.FC<RecurringPatternViewerProps> = ({
  pattern,
  exceptions = [],
  onEditPattern,
  onAddException,
  onRemoveException,
  onRescheduleException,
  readOnly = false
}) => {
  const [isAddExceptionOpen, setIsAddExceptionOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [exceptionReason, setExceptionReason] = useState('');
  const [isRescheduleOpen, setIsRescheduleOpen] = useState(false);
  const [rescheduleExceptionId, setRescheduleExceptionId] = useState<string | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState<Date | undefined>(undefined);
  
  // Format dates for display
  const formatDate = (dateStr: string): string => {
    return DateTime.fromISO(dateStr).toFormat('MMMM d, yyyy');
  };
  
  // Handle adding a new exception
  const handleAddException = () => {
    if (selectedDate && onAddException) {
      const dateStr = DateTime.fromJSDate(selectedDate).toISODate();
      onAddException(dateStr, exceptionReason);
      setSelectedDate(undefined);
      setExceptionReason('');
      setIsAddExceptionOpen(false);
    }
  };
  
  // Handle rescheduling an exception
  const handleReschedule = () => {
    if (rescheduleDate && rescheduleExceptionId && onRescheduleException) {
      const dateStr = DateTime.fromJSDate(rescheduleDate).toISODate();
      onRescheduleException(rescheduleExceptionId, dateStr);
      setRescheduleDate(undefined);
      setRescheduleExceptionId(null);
      setIsRescheduleOpen(false);
    }
  };
  
  // Open reschedule dialog
  const openRescheduleDialog = (exceptionId: string) => {
    setRescheduleExceptionId(exceptionId);
    setRescheduleDate(undefined);
    setIsRescheduleOpen(true);
  };
  
  // Get the exception dates to disable in the calendar
  const getDisabledDates = (): Date[] => {
    if (!pattern.exceptions) return [];
    
    return pattern.exceptions.map(ex => 
      DateTime.fromISO(ex).toJSDate()
    );
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Recurring Appointment</span>
          {!readOnly && onEditPattern && (
            <Button variant="ghost" size="sm" onClick={onEditPattern}>
              <Edit className="h-4 w-4 mr-1" />
              Edit Pattern
            </Button>
          )}
        </CardTitle>
        <CardDescription>
          <div className="flex items-center">
            <CalendarIcon className="h-4 w-4 mr-2" />
            <span>{formatRecurringPattern(pattern)}</span>
          </div>
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        {/* Pattern details */}
        <div className="space-y-2 mb-4">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="text-sm font-medium">Frequency:</span>
              <Badge variant="outline" className="ml-2 capitalize">
                {pattern.frequency}
              </Badge>
            </div>
            
            <div>
              <span className="text-sm font-medium">Interval:</span>
              <Badge variant="outline" className="ml-2">
                {pattern.interval}
              </Badge>
            </div>
            
            {pattern.endDate && (
              <div className="col-span-2">
                <span className="text-sm font-medium">Ends on:</span>
                <Badge variant="outline" className="ml-2">
                  {formatDate(pattern.endDate)}
                </Badge>
              </div>
            )}
            
            {pattern.endAfterOccurrences && (
              <div className="col-span-2">
                <span className="text-sm font-medium">Ends after:</span>
                <Badge variant="outline" className="ml-2">
                  {pattern.endAfterOccurrences} occurrences
                </Badge>
              </div>
            )}
            
            {pattern.daysOfWeek && pattern.daysOfWeek.length > 0 && (
              <div className="col-span-2">
                <span className="text-sm font-medium">Days of week:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {pattern.daysOfWeek.map(day => {
                    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                    return (
                      <Badge key={day} variant="secondary" className="text-xs">
                        {dayNames[day]}
                      </Badge>
                    );
                  })}
                </div>
              </div>
            )}
            
            {pattern.dayOfMonth && (
              <div className="col-span-2">
                <span className="text-sm font-medium">Day of month:</span>
                <Badge variant="outline" className="ml-2">
                  {pattern.dayOfMonth}
                </Badge>
              </div>
            )}
            
            {pattern.weekOfMonth && pattern.dayOfWeekMonth !== undefined && (
              <div className="col-span-2">
                <span className="text-sm font-medium">Monthly on:</span>
                <Badge variant="outline" className="ml-2">
                  {['First', 'Second', 'Third', 'Fourth', 'Last'][pattern.weekOfMonth - 1]} 
                  {' '}
                  {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][pattern.dayOfWeekMonth]}
                </Badge>
              </div>
            )}
            
            {pattern.monthOfYear && (
              <div className="col-span-2">
                <span className="text-sm font-medium">Month:</span>
                <Badge variant="outline" className="ml-2">
                  {['January', 'February', 'March', 'April', 'May', 'June', 
                    'July', 'August', 'September', 'October', 'November', 'December'][pattern.monthOfYear - 1]}
                </Badge>
              </div>
            )}
          </div>
        </div>
        
        {/* Exceptions section */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium">Exceptions</h4>
            {!readOnly && onAddException && (
              <Dialog open={isAddExceptionOpen} onOpenChange={setIsAddExceptionOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Plus className="h-4 w-4 mr-1" />
                    Add Exception
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Exception</DialogTitle>
                  </DialogHeader>
                  
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="exception-date">Select Date</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className="w-full justify-start text-left font-normal"
                            id="exception-date"
                          >
                            {selectedDate ? (
                              <span>{DateTime.fromJSDate(selectedDate).toFormat('MMMM d, yyyy')}</span>
                            ) : (
                              <span className="text-muted-foreground">Select a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={selectedDate}
                            onSelect={setSelectedDate}
                            disabled={getDisabledDates()}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="exception-reason">Reason (Optional)</Label>
                      <Textarea
                        id="exception-reason"
                        placeholder="Enter reason for exception"
                        value={exceptionReason}
                        onChange={(e) => setExceptionReason(e.target.value)}
                      />
                    </div>
                  </div>
                  
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsAddExceptionOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleAddException} disabled={!selectedDate}>
                      Add Exception
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>
          
          {/* Exception list */}
          {exceptions.length > 0 ? (
            <ScrollArea className="h-[200px] rounded-md border">
              <div className="p-4 space-y-2">
                {exceptions.map((exception) => (
                  <div key={exception.id} className="flex items-center justify-between p-2 border rounded-md">
                    <div>
                      <div className="font-medium">{formatDate(exception.exception_date)}</div>
                      {exception.reason && (
                        <div className="text-sm text-muted-foreground">{exception.reason}</div>
                      )}
                      {exception.is_rescheduled && exception.rescheduled_to && (
                        <div className="text-sm text-blue-600">
                          Rescheduled to {formatDate(exception.rescheduled_to)}
                        </div>
                      )}
                    </div>
                    
                    {!readOnly && (
                      <div className="flex space-x-1">
                        {onRescheduleException && !exception.is_rescheduled && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openRescheduleDialog(exception.id)}
                          >
                            <CalendarIcon className="h-4 w-4" />
                          </Button>
                        )}
                        
                        {onRemoveException && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onRemoveException(exception.id)}
                          >
                            <Trash className="h-4 w-4 text-red-500" />
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No exceptions have been added</p>
            </div>
          )}
        </div>
      </CardContent>
      
      {/* Reschedule dialog */}
      <Dialog open={isRescheduleOpen} onOpenChange={setIsRescheduleOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reschedule Exception</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reschedule-date">Select New Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                    id="reschedule-date"
                  >
                    {rescheduleDate ? (
                      <span>{DateTime.fromJSDate(rescheduleDate).toFormat('MMMM d, yyyy')}</span>
                    ) : (
                      <span className="text-muted-foreground">Select a date</span>
                    )}
                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={rescheduleDate}
                    onSelect={setRescheduleDate}
                    disabled={getDisabledDates()}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRescheduleOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleReschedule} disabled={!rescheduleDate}>
              Reschedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default RecurringPatternViewer;