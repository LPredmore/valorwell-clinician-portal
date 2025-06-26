import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { UserProvider, useUser } from '@/context/UserContext';
import Login from '@/pages/Login';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { supabase } from '@/integrations/supabase/client';

// Mock supabase client
jest.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
      signInWithPassword: jest.fn(),
      signOut: jest.fn(),
      onAuthStateChange: jest.fn(() => ({
        data: {
          subscription: {
            unsubscribe: jest.fn()
          }
        }
      }))
    }
  },
  testResendEmailService: jest.fn()
}));

// Mock react-router-dom
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => jest.fn()
}));

// Test component to verify user context
const TestComponent = () => {
  const { user, authInitialized, isLoading } = useUser();
  return (
    <div>
      <div data-testid="auth-initialized">{authInitialized.toString()}</div>
      <div data-testid="is-loading">{isLoading.toString()}</div>
      <div data-testid="user-id">{user?.id || 'no-user'}</div>
    </div>
  );
};

describe('Authentication Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('UserContext', () => {
    test('should initialize with loading state', () => {
      // Mock initial session check
      (supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: null },
        error: null
      });

      render(
        <BrowserRouter>
          <UserProvider>
            <TestComponent />
          </UserProvider>
        </BrowserRouter>
      );

      // Initial state should be loading
      expect(screen.getByTestId('is-loading').textContent).toBe('true');
    });

    test('should set authInitialized to true after initialization', async () => {
      // Mock initial session check
      (supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: null },
        error: null
      });

      render(
        <BrowserRouter>
          <UserProvider>
            <TestComponent />
          </UserProvider>
        </BrowserRouter>
      );

      // After initialization, authInitialized should be true
      await waitFor(() => {
        expect(screen.getByTestId('auth-initialized').textContent).toBe('true');
        expect(screen.getByTestId('is-loading').textContent).toBe('false');
      });
    });

    test('should handle successful authentication', async () => {
      // Mock successful session
      const mockUser = { id: 'test-user-id', user_metadata: { role: 'clinician' } };
      (supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: { 
          session: { 
            user: mockUser 
          } 
        },
        error: null
      });

      render(
        <BrowserRouter>
          <UserProvider>
            <TestComponent />
          </UserProvider>
        </BrowserRouter>
      );

      // After initialization, user should be set
      await waitFor(() => {
        expect(screen.getByTestId('user-id').textContent).toBe('test-user-id');
        expect(screen.getByTestId('auth-initialized').textContent).toBe('true');
        expect(screen.getByTestId('is-loading').textContent).toBe('false');
      });
    });

    test('should handle authentication errors gracefully', async () => {
      // Mock error in session check
      (supabase.auth.getSession as jest.Mock).mockRejectedValue(new Error('Auth error'));

      render(
        <BrowserRouter>
          <UserProvider>
            <TestComponent />
          </UserProvider>
        </BrowserRouter>
      );

      // Even with error, authInitialized should be true and loading should be false
      await waitFor(() => {
        expect(screen.getByTestId('auth-initialized').textContent).toBe('true');
        expect(screen.getByTestId('is-loading').textContent).toBe('false');
        expect(screen.getByTestId('user-id').textContent).toBe('no-user');
      });
    });
  });

  describe('Login Component', () => {
    test('should render login form', () => {
      // Mock no session
      (supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: null },
        error: null
      });

      render(
        <BrowserRouter>
          <UserProvider>
            <Login />
          </UserProvider>
        </BrowserRouter>
      );

      // Check for login form elements
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    });

    test('should handle successful login', async () => {
      // Mock successful login
      const mockUser = { id: 'test-user-id', user_metadata: { role: 'clinician' } };
      (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({
        data: { 
          user: mockUser,
          session: { user: mockUser }
        },
        error: null
      });

      // Mock no initial session
      (supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: null },
        error: null
      });

      render(
        <BrowserRouter>
          <UserProvider>
            <Login />
          </UserProvider>
        </BrowserRouter>
      );

      // Fill in login form
      await act(async () => {
        await userEvent.type(screen.getByLabelText(/email/i), 'test@example.com');
        await userEvent.type(screen.getByLabelText(/password/i), 'password123');
        await userEvent.click(screen.getByRole('button', { name: /sign in/i }));
      });

      // Check that login function was called with correct credentials
      expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123'
      });
    });

    test('should display error message on login failure', async () => {
      // Mock login failure
      (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Invalid login credentials' }
      });

      // Mock no initial session
      (supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: null },
        error: null
      });

      render(
        <BrowserRouter>
          <UserProvider>
            <Login />
          </UserProvider>
        </BrowserRouter>
      );

      // Fill in login form
      await act(async () => {
        await userEvent.type(screen.getByLabelText(/email/i), 'test@example.com');
        await userEvent.type(screen.getByLabelText(/password/i), 'wrongpassword');
        await userEvent.click(screen.getByRole('button', { name: /sign in/i }));
      });

      // Check for error message
      await waitFor(() => {
        expect(screen.getByText(/invalid login credentials/i)).toBeInTheDocument();
      });
    });
  });

  describe('ProtectedRoute Component', () => {
    test('should render children when user is authenticated with correct role', async () => {
      // Mock authenticated user with clinician role
      const mockUser = { id: 'test-user-id', user_metadata: { role: 'clinician' } };
      (supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: { 
          session: { 
            user: mockUser 
          } 
        },
        error: null
      });

      render(
        <BrowserRouter>
          <UserProvider>
            <ProtectedRoute allowedRoles={['clinician', 'admin']}>
              <div data-testid="protected-content">Protected Content</div>
            </ProtectedRoute>
          </UserProvider>
        </BrowserRouter>
      );

      // Wait for authentication to complete
      await waitFor(() => {
        expect(screen.getByTestId('protected-content')).toBeInTheDocument();
      });
    });

    test('should not render children when user is not authenticated', async () => {
      // Mock no session
      (supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: null },
        error: null
      });

      render(
        <BrowserRouter>
          <UserProvider>
            <ProtectedRoute allowedRoles={['clinician', 'admin']}>
              <div data-testid="protected-content">Protected Content</div>
            </ProtectedRoute>
          </UserProvider>
        </BrowserRouter>
      );

      // Wait for authentication to complete
      await waitFor(() => {
        expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
      });
    });

    test('should not render children when user has incorrect role', async () => {
      // Mock authenticated user with client role
      const mockUser = { id: 'test-user-id', user_metadata: { role: 'client' } };
      (supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: { 
          session: { 
            user: mockUser 
          } 
        },
        error: null
      });

      render(
        <BrowserRouter>
          <UserProvider>
            <ProtectedRoute allowedRoles={['clinician', 'admin']}>
              <div data-testid="protected-content">Protected Content</div>
            </ProtectedRoute>
          </UserProvider>
        </BrowserRouter>
      );

      // Wait for authentication to complete
      await waitFor(() => {
        expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
      });
    });
  });
});