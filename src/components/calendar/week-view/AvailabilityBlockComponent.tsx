import React, { memo, useCallback } from 'react';
import { TimeBlock } from './types';
import { CalendarDebugUtils } from '@/utils/calendarDebugUtils';

// Component name for logging
const COMPONENT_NAME = 'AvailabilityBlockComponent';

interface AvailabilityBlockProps {
  block: TimeBlock;
  isStartOfBlock: boolean;
  isEndOfBlock: boolean;
  day: Date;
  onAvailabilityClick: (day: Date, block: TimeBlock) => void;
}

/**
 * AvailabilityBlockComponent - Renders an availability block in the calendar
 * Extracted from TimeSlot for better separation of concerns
 */
const AvailabilityBlockComponent: React.FC<AvailabilityBlockProps> = memo(({
  block,
  isStartOfBlock,
  isEndOfBlock,
  day,
  onAvailabilityClick
}) => {
  // Determine base class based on whether this is an exception or regular availability
  const availabilityBaseClass = block.isException 
    ? 'bg-teal-100 border-teal-500' 
    : 'bg-green-100 border-green-500';
  
  // Build the class string with conditional borders based on position
  let className = `p-1 ${availabilityBaseClass} border-l-4 border-r border-l w-full h-full cursor-pointer hover:bg-opacity-80 transition-colors z-10 relative availability-block`;

  // Add border styling based on position
  if (isStartOfBlock) {
    className += ' border-t rounded-t';
  } else {
    className += ' border-t-0';
  }
  
  if (isEndOfBlock) {
    className += ' border-b rounded-b';
  } else {
    className += ' border-b-0';
  }

  // Handle availability click
  const handleClick = useCallback(() => {
    try {
      CalendarDebugUtils.log(COMPONENT_NAME, 'Availability block clicked', {
        day: day.toISOString().split('T')[0],
        blockIds: block.availabilityIds,
        isException: block.isException
      });
      
      onAvailabilityClick(day, block);
    } catch (error) {
      CalendarDebugUtils.error(COMPONENT_NAME, 'Error handling availability click', error);
    }
  }, [block, day, onAvailabilityClick]);

  // Only show content at the start of a block
  let content = null;
  if (isStartOfBlock) {
    content = (
      <div className="font-medium truncate flex items-center text-xs">
        Available
        {block.isException && (
          <span className="ml-1 text-[10px] px-1 py-0.5 bg-teal-200 text-teal-800 rounded-full">Modified</span>
        )}
      </div>
    );
  }

  return (
    <div
      className={className}
      onClick={handleClick}
      title={`Available: ${block.start.toFormat('h:mm a')} - ${block.end.toFormat('h:mm a')}`}
      data-availability-ids={block.availabilityIds.join(',')}
      data-is-exception={block.isException.toString()}
    >
      {content}
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function for React.memo
  // Only re-render if relevant props have changed
  if (
    prevProps.isStartOfBlock !== nextProps.isStartOfBlock ||
    prevProps.isEndOfBlock !== nextProps.isEndOfBlock ||
    prevProps.block.availabilityIds.join(',') !== nextProps.block.availabilityIds.join(',') ||
    prevProps.block.isException !== nextProps.block.isException ||
    prevProps.day.getTime() !== nextProps.day.getTime()
  ) {
    return false; // Props are not equal, should re-render
  }
  
  return true; // Props are equal, no need to re-render
});

export default AvailabilityBlockComponent;