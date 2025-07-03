
export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  source?: 'internal' | 'nylas' | 'availability' | 'blocked_time';
  resource?: any;
}

export interface ReactBigCalendarProps {
  events: CalendarEvent[];
  onSelectSlot: (slotInfo: { start: Date; end: Date }) => void;
  onSelectEvent: (event: CalendarEvent) => void;
  date: Date;
  onNavigate: (date: Date) => void;
  userTimeZone?: string;
}
