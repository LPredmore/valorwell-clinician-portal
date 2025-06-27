
declare global {
  interface Window {
    Nylas: {
      calendar: (config: {
        element: HTMLElement;
        calendar_ids: string[];
        theme: 'light' | 'dark';
        timezone: string;
        view: 'day' | 'week' | 'month';
        event_handlers: {
          onEventClick?: (event: any) => void;
          onEventCreate?: (event: any) => void;
          onEventUpdate?: (event: any) => void;
          onEventDelete?: (event: any) => void;
        };
      }) => any;
    };
  }
}

export {};
