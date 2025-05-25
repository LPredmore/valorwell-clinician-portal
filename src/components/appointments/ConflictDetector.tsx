import React, { useState, useEffect } from 'react';
import { Appointment } from '@/types/appointment';
import { 
  AppointmentConflict, 
  detectConflicts, 
  detectRecurringConflicts 
} from '@/utils/conflictDetectionUtils';
import { AlertTriangle } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import ConflictResolutionDialog from './ConflictDetectionDialog';

export interface ConflictDetectorProps {
  appointment: Appointment;
  existingAppointments: Appointment[];
  timezone: string;
  onResolve: (resolvedAppointments: Appointment[]) => void;
  onCancel?: () => void;
  checkRecurring?: boolean;
  autoDetect?: boolean;
  children?: React.ReactNode;
}

/**
 * ConflictDetector component
 * 
 * This component checks for conflicts between a new/edited appointment and existing appointments.
 * It can be used in two ways:
 * 
 * 1. As a wrapper around appointment form components, automatically checking for conflicts
 * 2. As a standalone component with a manual check button
 * 
 * When conflicts are detected, it displays a warning and allows the user to resolve them.
 */
export const ConflictDetector: React.FC<ConflictDetectorProps> = ({
  appointment,
  existingAppointments,
  timezone,
  onResolve,
  onCancel,
  checkRecurring = false,
  autoDetect = true,
  children
}) => {
  const [conflicts, setConflicts] = useState<AppointmentConflict[]>([]);
  const [showWarning, setShowWarning] = useState(false);
  const [isResolutionDialogOpen, setIsResolutionDialogOpen] = useState(false);
  
  // Check for conflicts when appointment or existing appointments change
  useEffect(() => {
    if (autoDetect && appointment) {
      detectAppointmentConflicts();
    }
  }, [appointment, existingAppointments, autoDetect]);
  
  // Detect conflicts between the appointment and existing appointments
  const detectAppointmentConflicts = () => {
    if (!appointment) return;
    
    // Use the appropriate detection function based on whether we're checking recurring appointments
    const detectedConflicts = checkRecurring
      ? detectRecurringConflicts(appointment, existingAppointments, timezone)
      : detectConflicts(appointment, existingAppointments);
    
    setConflicts(detectedConflicts);
    setShowWarning(detectedConflicts.length > 0);
  };
  
  // Handle manual conflict check
  const handleCheckConflicts = () => {
    detectAppointmentConflicts();
  };
  
  // Handle opening the resolution dialog
  const handleResolveConflicts = () => {
    setIsResolutionDialogOpen(true);
  };
  
  // Handle conflict resolution
  const handleConflictsResolved = (resolvedAppointments: Appointment[]) => {
    setIsResolutionDialogOpen(false);
    setShowWarning(false);
    onResolve(resolvedAppointments);
  };
  
  // Handle cancellation
  const handleCancel = () => {
    setIsResolutionDialogOpen(false);
    if (onCancel) {
      onCancel();
    }
  };
  
  return (
    <div>
      {/* Conflict warning */}
      {showWarning && (
        <Alert variant="destructive" className="mb-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Scheduling Conflict Detected</AlertTitle>
          <AlertDescription>
            <p>
              {conflicts.length === 1
                ? 'There is a scheduling conflict with another appointment.'
                : `There are ${conflicts.length} scheduling conflicts with other appointments.`}
            </p>
            <div className="mt-2">
              <Button onClick={handleResolveConflicts} variant="secondary" size="sm">
                Resolve Conflicts
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}
      
      {/* Manual check button if autoDetect is false */}
      {!autoDetect && (
        <Button onClick={handleCheckConflicts} variant="outline" className="mb-4">
          <AlertTriangle className="h-4 w-4 mr-2" />
          Check for Conflicts
        </Button>
      )}
      
      {/* Children components (e.g., appointment form) */}
      {children}
      
      {/* Conflict resolution dialog */}
      <ConflictResolutionDialog
        open={isResolutionDialogOpen}
        onOpenChange={setIsResolutionDialogOpen}
        conflicts={conflicts}
        onResolve={handleConflictsResolved}
        onCancel={handleCancel}
        existingAppointments={existingAppointments}
        timezone={timezone}
      />
    </div>
  );
};

export default ConflictDetector;