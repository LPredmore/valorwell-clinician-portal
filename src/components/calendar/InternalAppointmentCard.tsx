
import React from 'react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Clock, User } from 'lucide-react';
import { Appointment } from '@/types/appointment';

interface InternalAppointmentCardProps {
  appointment: Appointment;
  onClick?: () => void;
}

const InternalAppointmentCard: React.FC<InternalAppointmentCardProps> = ({
  appointment,
  onClick,
}) => {
  const startTime = new Date(appointment.start_at);
  const endTime = new Date(appointment.end_at);
  
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'confirmed':
        return 'bg-green-100 border-green-500 text-green-800';
      case 'pending':
        return 'bg-yellow-100 border-yellow-500 text-yellow-800';
      case 'cancelled':
        return 'bg-red-100 border-red-500 text-red-800';
      case 'completed':
        return 'bg-blue-100 border-blue-500 text-blue-800';
      default:
        return 'bg-gray-100 border-gray-500 text-gray-800';
    }
  };

  return (
    <div
      className={`p-2 border-l-4 rounded text-xs cursor-pointer hover:shadow-sm transition-all ${getStatusColor(appointment.status)} mb-1`}
      onClick={onClick}
    >
      <div className="font-medium truncate mb-1">
        {appointment.clientName || 'No Client Name'}
      </div>
      
      <div className="flex items-center gap-1 text-xs opacity-75 mb-1">
        <Clock className="h-3 w-3" />
        <span>
          {format(startTime, 'h:mm a')} - {format(endTime, 'h:mm a')}
        </span>
      </div>
      
      <div className="flex items-center justify-between">
        <Badge variant="outline" className="text-xs">
          {appointment.type || 'Appointment'}
        </Badge>
        
        {appointment.video_room_url && (
          <div className="text-xs text-blue-600">📹</div>
        )}
      </div>
    </div>
  );
};

export default InternalAppointmentCard;
