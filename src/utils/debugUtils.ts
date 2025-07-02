
import { DateTime } from 'luxon';

interface TimeBlock {
  start: DateTime;
  end: DateTime;
  isException?: boolean;
}

interface AppointmentBlock {
  id: string;
  start: DateTime;
  end: DateTime;
  clientName?: string;
}

export const logCalendarDebug = (
  message: string,
  data: {
    appointmentBlocks?: AppointmentBlock[];
    timeBlocks?: TimeBlock[];
    weekDays?: DateTime[];
    [key: string]: any;
  }
) => {
  console.log(`[Calendar Debug] ${message}:`, data);
};

export const validateTimeBlocks = (blocks: TimeBlock[]): boolean => {
  return blocks.every(block => 
    block.start && 
    block.end && 
    block.start < block.end
  );
};
