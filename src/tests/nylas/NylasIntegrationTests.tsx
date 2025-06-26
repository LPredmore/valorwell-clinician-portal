import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useNylasIntegration } from '@/hooks/useNylasIntegration';
import { supabase } from '@/integrations/supabase/client';
import { ToastProvider } from '@/components/ui/toast';

// Mock supabase client
jest.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    functions: {
      invoke: jest.fn()
    }
  }
}));

// Mock window.open
const mockWindowOpen = jest.fn();
Object.defineProperty(window, 'open', {
  writable: true,
  value: mockWindowOpen
});

// Mock window.addEventListener
const mockAddEventListener = jest.fn();
const originalAddEventListener = window.addEventListener;
window.addEventListener = mockAddEventListener;

// Test component that uses the Nylas integration hook
const TestComponent = () => {
  const {
    connections,
    isLoading,
    isConnecting,
    lastError,
    connectGoogleCalendar,
    disconnectCalendar,
    refreshConnections
  } = useNylasIntegration();

  return (
    <div>
      <div data-testid="loading-state">{isLoading.toString()}</div>
      <div data-testid="connecting-state">{isConnecting.toString()}</div>
      <div data-testid="error-state">{lastError ? lastError.message : 'no-error'}</div>
      <div data-testid="connections-count">{connections.length}</div>
      <button data-testid="connect-button" onClick={connectGoogleCalendar}>
        Connect Google Calendar
      </button>
      {connections.length > 0 && (
        <button
          data-testid="disconnect-button"
          onClick={() => disconnectCalendar(connections[0].id)}
        >
          Disconnect Calendar
        </button>
      )}
      <button data-testid="refresh-button" onClick={refreshConnections}>
        Refresh Connections
      </button>
    </div>
  );
};

describe('Nylas Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset window.addEventListener to the mock
    window.addEventListener = mockAddEventListener;
  });

  afterAll(() => {
    // Restore original window.addEventListener
    window.addEventListener = originalAddEventListener;
  });

  test('should fetch connections on mount', async () => {
    // Mock successful connections fetch
    (supabase.functions.invoke as jest.Mock).mockResolvedValueOnce({
      data: [
        {
          id: 'conn-123',
          email: 'test@example.com',
          provider: 'google',
          is_active: true,
          created_at: '2025-06-01T00:00:00Z'
        }
      ],
      error: null
    });

    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    // Should start with loading state
    expect(screen.getByTestId('loading-state').textContent).toBe('true');

    // Wait for connections to load
    await waitFor(() => {
      expect(screen.getByTestId('loading-state').textContent).toBe('false');
    });

    // Should have called supabase.functions.invoke
    expect(supabase.functions.invoke).toHaveBeenCalled();
  });

  test('should handle connection initiation', async () => {
    // Mock successful auth URL generation
    (supabase.functions.invoke as jest.Mock).mockResolvedValueOnce({
      data: { authUrl: 'https://accounts.google.com/oauth2/auth?client_id=123' },
      error: null
    });

    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    // Click connect button
    await act(async () => {
      await userEvent.click(screen.getByTestId('connect-button'));
    });

    // Should be in connecting state
    expect(screen.getByTestId('connecting-state').textContent).toBe('true');

    // Should have called supabase.functions.invoke with correct params
    expect(supabase.functions.invoke).toHaveBeenCalledWith('nylas-auth', {
      body: { action: 'initialize' }
    });

    // Should have opened popup window
    expect(mockWindowOpen).toHaveBeenCalledWith(
      'https://accounts.google.com/oauth2/auth?client_id=123',
      'google-calendar-auth',
      expect.any(String)
    );

    // Should have set up message event listener
    expect(mockAddEventListener).toHaveBeenCalledWith('message', expect.any(Function));
  });

  test('should handle OAuth callback success', async () => {
    // Mock initial connections fetch
    (supabase.functions.invoke as jest.Mock).mockResolvedValueOnce({
      data: [],
      error: null
    });

    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByTestId('loading-state').textContent).toBe('false');
    });

    // Mock successful connections fetch after callback
    (supabase.functions.invoke as jest.Mock).mockResolvedValueOnce({
      data: [
        {
          id: 'conn-123',
          email: 'test@example.com',
          provider: 'google',
          is_active: true,
          created_at: '2025-06-01T00:00:00Z'
        }
      ],
      error: null
    });

    // Simulate OAuth callback message
    const messageEventHandler = mockAddEventListener.mock.calls.find(
      call => call[0] === 'message'
    )[1];

    act(() => {
      messageEventHandler({
        data: {
          type: 'NYLAS_AUTH_SUCCESS',
          connection: {
            id: 'conn-123',
            email: 'test@example.com',
            provider: 'google'
          }
        }
      });
    });

    // Should have called refreshConnections
    expect(supabase.functions.invoke).toHaveBeenCalledTimes(2);
  });

  test('should handle connection errors', async () => {
    // Mock error in auth URL generation
    (supabase.functions.invoke as jest.Mock).mockResolvedValueOnce({
      data: null,
      error: { message: 'Failed to initialize OAuth' }
    });

    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    // Click connect button
    await act(async () => {
      await userEvent.click(screen.getByTestId('connect-button'));
    });

    // Should display error
    await waitFor(() => {
      expect(screen.getByTestId('error-state').textContent).not.toBe('no-error');
    });
  });

  test('should handle disconnection', async () => {
    // Mock initial connections fetch with one connection
    (supabase.functions.invoke as jest.Mock).mockResolvedValueOnce({
      data: [
        {
          id: 'conn-123',
          email: 'test@example.com',
          provider: 'google',
          is_active: true,
          created_at: '2025-06-01T00:00:00Z'
        }
      ],
      error: null
    });

    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    // Wait for connections to load
    await waitFor(() => {
      expect(screen.getByTestId('connections-count').textContent).toBe('1');
    });

    // Mock successful disconnection
    (supabase.functions.invoke as jest.Mock).mockResolvedValueOnce({
      data: { success: true },
      error: null
    });

    // Mock empty connections after disconnection
    (supabase.functions.invoke as jest.Mock).mockResolvedValueOnce({
      data: [],
      error: null
    });

    // Click disconnect button
    await act(async () => {
      await userEvent.click(screen.getByTestId('disconnect-button'));
    });

    // Should have called supabase.functions.invoke with correct params
    expect(supabase.functions.invoke).toHaveBeenCalledWith('nylas-auth', {
      body: {
        action: 'disconnect',
        connectionId: 'conn-123'
      }
    });

    // Should have refreshed connections
    await waitFor(() => {
      expect(supabase.functions.invoke).toHaveBeenCalledTimes(3);
    });
  });
});