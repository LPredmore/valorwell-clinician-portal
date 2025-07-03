
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

interface SessionDidNotOccurDialogProps {
  isOpen: boolean;
  onClose: () => void;
  appointmentId: string;
  onStatusUpdate: () => void;
}

export const SessionDidNotOccurDialog = ({
  isOpen,
  onClose,
  appointmentId,
  onStatusUpdate
}: SessionDidNotOccurDialogProps) => {
  const { toast } = useToast();
  const [reason, setReason] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isValid, setIsValid] = useState(false);

  // Validate form
  useEffect(() => {
    setIsValid(!!reason && !!notes?.trim());
  }, [reason, notes]);

  const handleSubmit = async () => {
    if (!isValid) return;
    
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ 
          status: reason,
          notes: notes 
        })
        .eq('id', appointmentId);

      if (error) throw error;
      
      toast({
        title: "Status updated",
        description: `Appointment marked as "${reason}"`,
      });
      
      // Refresh the appointments list
      if (onStatusUpdate) {
        onStatusUpdate();
      }
      
      onClose();
    } catch (error) {
      console.error('Error updating appointment status:', error);
      toast({
        title: "Error",
        description: "Could not update appointment status. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Session Did Not Occur</DialogTitle>
          <Button 
            variant="outline" 
            size="icon" 
            className="absolute right-4 top-4" 
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <label htmlFor="reason" className="text-sm font-medium">
              Why did session not occur?
            </label>
            <Select
              value={reason}
              onValueChange={setReason}
            >
              <SelectTrigger id="reason">
                <SelectValue placeholder="Select a reason" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="No Call/No Show">No Call/No Show</SelectItem>
                <SelectItem value="Cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="grid gap-2">
            <label htmlFor="notes" className="text-sm font-medium">
              Additional notes
            </label>
            <Textarea
              id="notes"
              placeholder="Enter additional information"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="min-h-[80px]"
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!isValid || isSubmitting}
            className="bg-valorwell-700 hover:bg-valorwell-800"
          >
            {isSubmitting ? 'Submitting...' : 'Submit'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
