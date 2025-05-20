import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DateTime } from "luxon";
import { Appointment } from "@/types/appointment";

interface EditAppointmentDialogProps {
  isOpen: boolean;
  appointment: Appointment | null;
  onClose: () => void;
  onSave: (updatedAppointment: {
    appointmentId: string;
    newStartAt: string;
    newEndAt: string;
  }) => void;
  onDelete: (appointmentId: string) => void;
  userTimeZone: string;
}

const EditAppointmentDialog: React.FC<EditAppointmentDialogProps> = ({
  isOpen,
  appointment,
  onClose,
  onSave,
  onDelete,
  userTimeZone,
}) => {
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");

  React.useEffect(() => {
    if (appointment) {
      const start = DateTime.fromISO(appointment.start_at).setZone(userTimeZone);
      const end = DateTime.fromISO(appointment.end_at).setZone(userTimeZone);
      setStartTime(start.toFormat("HH:mm"));
      setEndTime(end.toFormat("HH:mm"));
    }
  }, [appointment, userTimeZone]);

  const handleSave = () => {
    if (!appointment || !startTime || !endTime) return;

    const date = DateTime.fromISO(appointment.start_at).setZone(userTimeZone).startOf("day");
    const newStart = date.plus({
      hours: parseInt(startTime.split(":"[0]), 10),
      minutes: parseInt(startTime.split(":"[1]), 10),
    });
    const newEnd = date.plus({
      hours: parseInt(endTime.split(":"[0]), 10),
      minutes: parseInt(endTime.split(":"[1]), 10),
    });

    onSave({
      appointmentId: appointment.id,
      newStartAt: newStart.toUTC().toISO(),
      newEndAt: newEnd.toUTC().toISO(),
    });
  };

  const handleDelete = () => {
    if (appointment) {
      onDelete(appointment.id);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Appointment</DialogTitle>
        </DialogHeader>

        {appointment && (
          <div className="space-y-4">
            <div>
              <label className="block mb-1 text-sm font-medium">Start Time</label>
              <Input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
            <div>
              <label className="block mb-1 text-sm font-medium">End Time</label>
              <Input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
          </div>
        )}

        <DialogFooter className="mt-4">
          <Button variant="destructive" onClick={handleDelete}>
            Delete
          </Button>
          <Button onClick={handleSave}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditAppointmentDialog;
