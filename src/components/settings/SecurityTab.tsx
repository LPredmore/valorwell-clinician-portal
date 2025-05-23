import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import GoogleCalendarPlaceholder from './GoogleCalendarPlaceholder';

const SecurityTab = () => {
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setIsLoading(true);
        const { data } = await supabase.auth.getUser();
        if (data?.user) {
          setUserId(data.user.id);
          setUserEmail(data.user.email);
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserData();
  }, []);

  const handleChangePassword = async () => {
    try {
      if (!userEmail) {
        toast.error('Unable to reset password: email address not available');
        return;
      }

      const { error } = await supabase.auth.resetPasswordForEmail(userEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        throw error;
      }

      toast.success('Password reset email sent');
    } catch (error) {
      console.error('Error sending reset email:', error);
      toast.error('Failed to send password reset email');
    }
  };

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        throw error;
      }
      
      toast.success('Logged out successfully');
      window.location.href = '/login';
    } catch (error) {
      console.error('Error logging out:', error);
      toast.error('Failed to log out');
    }
  };

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Account Security</CardTitle>
            <CardDescription>Manage your account password and authentication</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <h3 className="text-sm font-semibold">Email Address</h3>
              <p className="text-sm text-gray-600">{userEmail || 'Loading...'}</p>
            </div>
            
            <div className="space-y-4 pt-2">
              <Button 
                variant="outline" 
                onClick={handleChangePassword}
                disabled={isLoading || !userEmail}
              >
                Change Password
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleLogout}
                className="ml-2"
              >
                Log Out
              </Button>
            </div>
          </CardContent>
        </Card>
        
        <GoogleCalendarPlaceholder />
      </div>
      
      {/* Additional security sections can be added here */}
    </div>
  );
};

export default SecurityTab;
