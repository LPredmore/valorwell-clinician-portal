import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Appointment } from "@/types/appointment";
import { SchedulingOptimizationSuggestion } from "@/types/analytics";
import * as OptimizationUtils from "@/utils/optimizationUtils";
import { useToast } from "@/hooks/use-toast";

interface OptimizationSuggestionsProps {
  appointments: Appointment[];
  timezone: string;
}

/**
 * Optimization Suggestions Component
 * Displays scheduling optimization suggestions
 */
export const OptimizationSuggestions: React.FC<OptimizationSuggestionsProps> = ({
  appointments,
  timezone
}) => {
  const { toast } = useToast();
  const [optimizationGoal, setOptimizationGoal] = useState<'utilization' | 'gaps' | 'balance'>('utilization');
  const [suggestions, setSuggestions] = useState<SchedulingOptimizationSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedSuggestion, setExpandedSuggestion] = useState<string | null>(null);

  // Generate optimization suggestions
  useEffect(() => {
    setIsLoading(true);
    
    try {
      const generatedSuggestions = OptimizationUtils.generateOptimizationSuggestions(
        appointments,
        timezone,
        optimizationGoal
      );
      
      setSuggestions(generatedSuggestions);
    } catch (error) {
      console.error("Error generating optimization suggestions:", error);
      toast({
        title: "Optimization Error",
        description: "Failed to generate optimization suggestions",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [appointments, timezone, optimizationGoal, toast]);

  // Handle optimization goal change
  const handleOptimizationGoalChange = (value: string) => {
    setOptimizationGoal(value as 'utilization' | 'gaps' | 'balance');
  };

  // Handle suggestion application
  const handleApplySuggestion = (suggestion: SchedulingOptimizationSuggestion) => {
    try {
      // In a real application, this would update the appointments in the database
      // For now, we'll just show a success message
      toast({
        title: "Suggestion Applied",
        description: "The optimization suggestion has been applied successfully",
        variant: "default",
      });
    } catch (error) {
      console.error("Error applying suggestion:", error);
      toast({
        title: "Application Error",
        description: "Failed to apply optimization suggestion",
        variant: "destructive",
      });
    }
  };

  // Get badge color based on priority
  const getPriorityBadgeColor = (priority: string): string => {
    switch (priority) {
      case 'HIGH':
        return "bg-red-500 hover:bg-red-600";
      case 'MEDIUM':
        return "bg-yellow-500 hover:bg-yellow-600";
      case 'LOW':
        return "bg-blue-500 hover:bg-blue-600";
      default:
        return "bg-gray-500 hover:bg-gray-600";
    }
  };

  // Get icon based on suggestion type
  const getSuggestionTypeIcon = (type: string): React.ReactNode => {
    switch (type) {
      case 'MOVE_APPOINTMENT':
        return (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-5 w-5"
          >
            <path d="M5 9l4-4 4 4" />
            <path d="M19 15l-4 4-4-4" />
            <path d="M9 5h6v14H9z" />
          </svg>
        );
      case 'ADD_AVAILABILITY':
        return (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-5 w-5"
          >
            <path d="M12 5v14" />
            <path d="M5 12h14" />
          </svg>
        );
      case 'REMOVE_AVAILABILITY':
        return (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-5 w-5"
          >
            <path d="M5 12h14" />
          </svg>
        );
      case 'RESCHEDULE_CLIENT':
        return (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-5 w-5"
          >
            <path d="M21 12a9 9 0 0 1-9 9" />
            <path d="M3 12a9 9 0 0 1 9-9" />
            <path d="M21 12a9 9 0 0 0-9 9" />
            <path d="M3 12a9 9 0 0 0 9-9" />
          </svg>
        );
      default:
        return (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-5 w-5"
          >
            <path d="M12 2v4" />
            <path d="M12 18v4" />
            <path d="M4.93 4.93l2.83 2.83" />
            <path d="M16.24 16.24l2.83 2.83" />
            <path d="M2 12h4" />
            <path d="M18 12h4" />
            <path d="M4.93 19.07l2.83-2.83" />
            <path d="M16.24 7.76l2.83-2.83" />
          </svg>
        );
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
          <div>
            <CardTitle>Scheduling Optimization</CardTitle>
            <CardDescription>
              Suggestions to improve scheduling efficiency
            </CardDescription>
          </div>
          <Select value={optimizationGoal} onValueChange={handleOptimizationGoalChange}>
            <SelectTrigger className="w-full md:w-[200px]">
              <SelectValue placeholder="Optimization Goal" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="utilization">Maximize Utilization</SelectItem>
              <SelectItem value="gaps">Minimize Gaps</SelectItem>
              <SelectItem value="balance">Balance Schedule</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : suggestions.length > 0 ? (
          <Accordion
            type="single"
            collapsible
            value={expandedSuggestion || undefined}
            onValueChange={(value) => setExpandedSuggestion(value)}
          >
            {suggestions.slice(0, 5).map((suggestion) => (
              <AccordionItem key={suggestion.id} value={suggestion.id}>
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center space-x-4 text-left">
                    <div className="flex-shrink-0">
                      {getSuggestionTypeIcon(suggestion.type)}
                    </div>
                    <div className="flex-grow">
                      <div className="font-medium">{suggestion.description}</div>
                      <div className="text-sm text-muted-foreground">
                        Impact: +{suggestion.impact.utilizationIncrease.toFixed(1)}% utilization
                      </div>
                    </div>
                    <Badge className={getPriorityBadgeColor(suggestion.priority)}>
                      {suggestion.priority}
                    </Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4 pt-2">
                    <div className="text-sm">
                      {OptimizationUtils.generateSuggestionExplanation(suggestion)}
                    </div>
                    
                    {suggestion.suggestedChanges && (
                      <div className="bg-muted p-3 rounded-md text-sm">
                        <div className="font-medium mb-1">Suggested Changes:</div>
                        <ul className="list-disc list-inside space-y-1">
                          {suggestion.suggestedChanges.fromDate && suggestion.suggestedChanges.toDate && (
                            <li>
                              Date: {new Date(suggestion.suggestedChanges.fromDate).toLocaleDateString()} to{" "}
                              {new Date(suggestion.suggestedChanges.toDate).toLocaleDateString()}
                            </li>
                          )}
                          {suggestion.suggestedChanges.fromTime && suggestion.suggestedChanges.toTime && (
                            <li>
                              Time: {suggestion.suggestedChanges.fromTime} to{" "}
                              {suggestion.suggestedChanges.toTime}
                            </li>
                          )}
                        </ul>
                      </div>
                    )}
                    
                    <div className="flex justify-end space-x-2">
                      <Button
                        variant="outline"
                        onClick={() => setExpandedSuggestion(null)}
                      >
                        Dismiss
                      </Button>
                      <Button
                        onClick={() => handleApplySuggestion(suggestion)}
                        disabled={!OptimizationUtils.canAutoApplySuggestion(suggestion)}
                      >
                        {OptimizationUtils.canAutoApplySuggestion(suggestion)
                          ? "Apply Suggestion"
                          : "Requires Manual Action"}
                      </Button>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        ) : (
          <div className="flex justify-center items-center h-64">
            <p className="text-muted-foreground">No optimization suggestions available</p>
          </div>
        )}
      </CardContent>
      {suggestions.length > 5 && (
        <CardFooter className="flex justify-center border-t pt-4">
          <Button variant="outline">
            View All {suggestions.length} Suggestions
          </Button>
        </CardFooter>
      )}
    </Card>
  );
};