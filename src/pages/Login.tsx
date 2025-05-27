
import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/context/UserContext';

const Login = () => {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const form = useForm({
    defaultValues: {
      email: '',
      password: '',
    },
  });
  const { toast } = useToast();
  const { userId, userRole } = useUser();

  // Redirect if already authenticated and has appropriate role
  if (userId && (userRole === 'clinician' || userRole === 'admin')) {
    if (userRole === 'clinician') {
      navigate('/clinician-dashboard');
    } else if (userRole === 'admin') {
      navigate('/settings');
    }
  }

  /**
   * Handle form submission for login
   * @param data Form data containing email and password
   */
  const handleSubmit = async (data: { email: string; password: string }) => {
    setLoading(true);
    setError(null);

    try {
      // Attempt to sign in with Supabase
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      // Handle authentication errors
      if (authError) {
        throw new Error(authError.message);
      }

      // Success - show toast notification
      toast({
        title: 'Success',
        description: 'Successfully signed in.',
      });

      // Navigate to home page - role-based routing will happen there
      navigate('/');
    } catch (err) {
      // Format error message
      const message = err instanceof Error ? err.message : 'Failed to sign in';
      
      // Set error state and show toast
      setError(message);
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex justify-center mb-4">
            <img
              src="/lovable-uploads/47fe3428-4c8d-48fd-9f59-8040e817c9a8.png"
              alt="ValorWell Logo"
              className="h-12 w-auto"
            />
          </div>
          <CardTitle className="text-2xl text-center font-bold">Clinician Portal</CardTitle>
          <CardDescription className="text-center">
            Sign in to the ValorWell Clinician Portal
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Alert for client users */}
          {userRole === 'client' && (
            <Alert className="mb-6 bg-amber-50 border-amber-200">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <AlertTitle className="text-amber-600">Client Portal Notice</AlertTitle>
              <AlertDescription className="text-amber-700">
                This is the clinician portal. As a client, you should use the client portal instead.
              </AlertDescription>
            </Alert>
          )}

          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                rules={{
                  required: 'Email is required',
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: 'Invalid email address',
                  },
                }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input {...field} type="email" placeholder="your@email.com" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                rules={{
                  required: 'Password is required',
                }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input {...field} type="password" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Signing in...' : 'Sign In'}
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter>
          <div className="text-sm text-center w-full text-gray-500">
            <Link to="/reset-password" className="text-valorwell-600 hover:underline">
              Forgot your password?
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
};

export default Login;
