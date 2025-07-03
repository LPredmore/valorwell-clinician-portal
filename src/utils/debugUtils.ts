
import { DateTime } from 'luxon';

export const logCalendarDebug = (
  message: string,
  data: {
    [key: string]: any;
  }
) => {
  console.log(`[Calendar Debug] ${message}:`, data);
};

export const validateTimeBlocks = (blocks: any[]): boolean => {
  return blocks.every(block => 
    block.start && 
    block.end && 
    block.start < block.end
  );
};
