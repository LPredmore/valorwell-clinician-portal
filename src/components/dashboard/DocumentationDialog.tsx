
import React from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export interface DocumentationDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  selectedStatus: string | undefined;
  onStatusChange: (value: string) => void;
  onProvideDocumentation: () => Promise<void>;
}

export const DocumentationDialog: React.FC<DocumentationDialogProps> = ({
  isOpen,
  onOpenChange,
  selectedStatus,
  onStatusChange,
  onProvideDocumentation
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Document Session</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <Select onValueChange={onStatusChange} value={selectedStatus}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="occurred">Session Occurred</SelectItem>
              <SelectItem value="no-show">Late Cancel/No Show</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button 
            type="button" 
            onClick={onProvideDocumentation}
            disabled={!selectedStatus || selectedStatus === 'occurred'}
          >
            Provide Documentation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
