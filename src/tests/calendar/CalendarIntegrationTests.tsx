import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { useAppointments } from '@/hooks/useAppointments';
import { useNylasEvents } from '@/hooks/useNylasEvents';
import { supabase } from '@/integrations/supabase/client';
import { DateTime } from 'luxon';

// Mock supabase client
jest.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    functions: {
      invoke: jest.fn()
    },
    getOrCreateVideoRoom: jest.fn()
  }
}));

// Mock appointments data
const mockAppointments = [
  {
    id: 'appt-1',
    client_id: 'client-1',
    clinician_id: 'clinician-1',
    start_at: '2025-06-13T14:00:00.000Z',
    end_at: '2025-06-13T15:00:00.000Z',
    type: 'Initial Consultation',
    status: 'scheduled',
    appointment_recurring: null,
    recurring_group_id: null,
    video_room_url: null,
    notes: null,
    appointment_timezone: 'America/Chicago',
    client: {
      client_first_name: 'John',
      client_last_name: 'Doe',
      client_preferred_name: null,
      client_email: 'john.doe@example.com',
      client_phone: '555-123-4567',
      client_status: 'Active',
      client_date_of_birth: '1985-01-15',
      client_gender: 'Male',
      client_address: '123 Main St',
      client_city: 'Chicago',
      client_state: 'IL',
      client_zipcode: '60601'
    },
    clientName: 'John Doe'
  }
];

// Mock Nylas events data
const mockNylasEvents = [
  {
    id: 'event-1',
    title: 'External Meeting',
    description: 'Meeting with external stakeholders',
    when: {
      start_time: '2025-06-13T16:00:00.000Z',
      end_time: '2025-06-13T17:00:00.000Z',
      start_timezone: 'America/Chicago',
      end_timezone: 'America/Chicago'
    },
    connection_id: 'conn-1',
    connection_email: 'clinician@example.com',
    connection_provider: 'google',
    calendar_id: 'cal-1',
    calendar_name: 'Work Calendar',
    status: 'confirmed',
    location: 'Virtual'
  }
];

// Test component that uses both hooks
const TestCalendarComponent = ({ clinicianId, date }) => {
  const {
    appointments,
    isLoading: isLoadingAppointments,
    error: appointmentsError
  } = useAppointments(clinicianId, date, date, 'America/Chicago');

  const {
    events,
    isLoading: isLoadingEvents,
    error: eventsError
  } = useNylasEvents(date, date);

  if (isLoadingAppointments || isLoadingEvents) {
    return <div data-testid="loading">Loading...</div>;
  }

  if (appointmentsError || eventsError) {
    return <div data-testid="error">Error loading calendar data</div>;
  }

  return (
    <div>
      <h2>Appointments</h2>
      <ul data-testid="appointments-list">
        {appointments.map(appt => (
          <li key={appt.id} data-testid={`appointment-${appt.id}`}>
            {appt.clientName} - {appt.type} - {appt.formattedStartTime} to {appt.formattedEndTime}
          </li>
        ))}
      </ul>

      <h2>External Events</h2>
      <ul data-testid="events-list">
        {events.map(event => (
          <li key={event.id} data-testid={`event-${event.id}`}>
            {event.title} - {new Date(event.when.start_time).toLocaleTimeString()} to {new Date(event.when.end_time).toLocaleTimeString()}
          </li>
        ))}
      </ul>
    </div>
  );
};

describe('Calendar Integration Tests', () => {
  let queryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
    jest.clearAllMocks();
  });

  test('should load and display appointments', async () => {
    // Mock appointments query response
    (supabase.from().select().eq().in().order as jest.Mock).mockResolvedValueOnce({
      data: mockAppointments,
      error: null
    });

    // Mock Nylas events response
    (supabase.functions.invoke as jest.Mock).mockResolvedValueOnce({
      data: {
        events: [],
        connections: []
      },
      error: null
    });

    const testDate = new Date('2025-06-13T10:00:00.000-05:00');

    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <TestCalendarComponent clinicianId="clinician-1" date={testDate} />
        </BrowserRouter>
      </QueryClientProvider>
    );

    // Should initially show loading state
    expect(screen.getByTestId('loading')).toBeInTheDocument();

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByTestId('appointments-list')).toBeInTheDocument();
    });

    // Should display the appointment
    expect(screen.getByTestId('appointment-appt-1')).toBeInTheDocument();
    expect(screen.getByText(/John Doe/)).toBeInTheDocument();
    expect(screen.getByText(/Initial Consultation/)).toBeInTheDocument();
  });

  test('should load and display external calendar events', async () => {
    // Mock appointments query response
    (supabase.from().select().eq().in().order as jest.Mock).mockResolvedValueOnce({
      data: [],
      error: null
    });

    // Mock Nylas events response
    (supabase.functions.invoke as jest.Mock).mockResolvedValueOnce({
      data: {
        events: mockNylasEvents,
        connections: [{ id: 'conn-1', email: 'clinician@example.com', provider: 'google' }]
      },
      error: null
    });

    const testDate = new Date('2025-06-13T10:00:00.000-05:00');

    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <TestCalendarComponent clinicianId="clinician-1" date={testDate} />
        </BrowserRouter>
      </QueryClientProvider>
    );

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByTestId('events-list')).toBeInTheDocument();
    });

    // Should display the external event
    expect(screen.getByTestId('event-event-1')).toBeInTheDocument();
    expect(screen.getByText(/External Meeting/)).toBeInTheDocument();
  });

  test('should display both appointments and external events together', async () => {
    // Mock appointments query response
    (supabase.from().select().eq().in().order as jest.Mock).mockResolvedValueOnce({
      data: mockAppointments,
      error: null
    });

    // Mock Nylas events response
    (supabase.functions.invoke as jest.Mock).mockResolvedValueOnce({
      data: {
        events: mockNylasEvents,
        connections: [{ id: 'conn-1', email: 'clinician@example.com', provider: 'google' }]
      },
      error: null
    });

    const testDate = new Date('2025-06-13T10:00:00.000-05:00');

    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <TestCalendarComponent clinicianId="clinician-1" date={testDate} />
        </BrowserRouter>
      </QueryClientProvider>
    );

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByTestId('appointments-list')).toBeInTheDocument();
      expect(screen.getByTestId('events-list')).toBeInTheDocument();
    });

    // Should display both the appointment and external event
    expect(screen.getByTestId('appointment-appt-1')).toBeInTheDocument();
    expect(screen.getByTestId('event-event-1')).toBeInTheDocument();
  });

  test('should handle errors in appointments loading', async () => {
    // Mock appointments query error
    (supabase.from().select().eq().in().order as jest.Mock).mockResolvedValueOnce({
      data: null,
      error: { message: 'Failed to fetch appointments' }
    });

    // Mock Nylas events response
    (supabase.functions.invoke as jest.Mock).mockResolvedValueOnce({
      data: {
        events: [],
        connections: []
      },
      error: null
    });

    const testDate = new Date('2025-06-13T10:00:00.000-05:00');

    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <TestCalendarComponent clinicianId="clinician-1" date={testDate} />
        </BrowserRouter>
      </QueryClientProvider>
    );

    // Wait for error to be displayed
    await waitFor(() => {
      expect(screen.getByTestId('error')).toBeInTheDocument();
    });
  });

  test('should handle errors in external events loading', async () => {
    // Mock appointments query response
    (supabase.from().select().eq().in().order as jest.Mock).mockResolvedValueOnce({
      data: mockAppointments,
      error: null
    });

    // Mock Nylas events error
    (supabase.functions.invoke as jest.Mock).mockResolvedValueOnce({
      data: null,
      error: { message: 'Failed to fetch external events' }
    });

    const testDate = new Date('2025-06-13T10:00:00.000-05:00');

    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <TestCalendarComponent clinicianId="clinician-1" date={testDate} />
        </BrowserRouter>
      </QueryClientProvider>
    );

    // Wait for error to be displayed
    await waitFor(() => {
      expect(screen.getByTestId('error')).toBeInTheDocument();
    });
  });
});