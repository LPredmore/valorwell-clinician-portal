
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

export const debugTimeCalculations = (
  appointmentBlocks: AppointmentBlock[],
  timeBlocks: TimeBlock[],
  weekDays: DateTime[]
) => {
  console.log('[debugUtils] Time calculations debug:', {
    appointmentBlocksCount: appointmentBlocks.length,
    timeBlocksCount: timeBlocks.length,
    weekDaysCount: weekDays.length,
    appointmentSample: appointmentBlocks.slice(0, 3),
    timeBlockSample: timeBlocks.slice(0, 3)
  });
};
