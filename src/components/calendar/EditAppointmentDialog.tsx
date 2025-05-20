// EditAppointmentDialog.tsx
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { DateTime } from 'luxon';
import { Appointment } from '@/types/appointment';
import { TimeZoneService } from '@/utils/timeZoneService';
import { Input } from '@/components/ui/input';

interface Props {
  appointment: Appointment;
  onClose: () => void;
  onUpdate: (updated: Appointment) => void;
  onDelete: (id: string) => void;
}

const EditAppointmentDialog: React.FC<Props> = ({ appointment, onClose, onUpdate, onDelete }) => {
  const [startAt, setStartAt] = useState<string>(appointment.start_at);
  const [endAt, setEndAt] = useState<string>(appointment.end_at);
  const [saving, setSaving] = useState(false);

  const handleUpdate = () => {
    setSaving(true);
    try {
      const updated: Appointment = {
        ...appointment,
        start_at: startAt,
        end_at: endAt,
      };
      onUpdate(updated);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this appointment?')) {
      onDelete(appointment.id);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Appointment</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium">Client</label>
            <div className="mt-1 text-sm text-gray-700">
              {appointment.clientName || 'Unknown Client'}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium">Start Time</label>
            <Input
              type="datetime-local"
              value={DateTime.fromISO(startAt).toFormat('yyyy-LL-dd'T'HH:mm')}
              onChange={(e) => {
                const newStart = DateTime.fromFormat(e.target.value, 'yyyy-LL-dd'T'HH:mm');
                setStartAt(newStart.toUTC().toISO());
              }}
            />
          </div>

          <div>
            <label className="block text-sm font-medium">End Time</label>
            <Input
              type="datetime-local"
              value={DateTime.fromISO(endAt).toFormat('yyyy-LL-dd'T'HH:mm')}
              onChange={(e) => {
                const newEnd = DateTime.fromFormat(e.target.value, 'yyyy-LL-dd'T'HH:mm');
                setEndAt(newEnd.toUTC().toISO());
              }}
            />
          </div>

          <div className="flex justify-between mt-4">
            <Button variant="destructive" onClick={handleDelete} disabled={saving}>
              Delete
            </Button>
            <div className="space-x-2">
              <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
              <Button onClick={handleUpdate} disabled={saving}>Save</Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EditAppointmentDialog;
