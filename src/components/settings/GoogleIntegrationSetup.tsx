
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useGoogleCalendar } from '@/hooks/useGoogleCalendar';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { AlertCircle, Calendar, CheckCircle2, Link as LinkIcon } from 'lucide-react';

interface GoogleIntegrationSetupProps {
  userId?: string;
  userEmail?: string;
}

const GoogleIntegrationSetup = ({ userId, userEmail }: GoogleIntegrationSetupProps) => {
  const { isConnected, isLoading, connectGoogleCalendar, disconnectGoogleCalendar } = useGoogleCalendar();
  const [hasEmailAccount, setHasEmailAccount] = useState(false);
  const [hasGoogleAccount, setHasGoogleAccount] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const checkAuthMethods = async () => {
      if (!userId || !userEmail) {
        setIsCheckingAuth(false);
        return;
      }

      setIsCheckingAuth(true);
      try {
        // This is a simplified check - in production you'd use Supabase Admin API
        // to properly check auth methods, but we'll make an educated guess
        const { data: session } = await supabase.auth.getSession();
        const hasGoogleToken = !!session?.session?.provider_token;
        const isCurrentlyGoogle = !!session?.session?.user?.app_metadata?.provider === 'google';
        
        setHasGoogleAccount(hasGoogleToken || isCurrentlyGoogle);
        setHasEmailAccount(!!session?.session?.user && !isCurrentlyGoogle);
        
        console.log("[GoogleIntegrationSetup] Auth methods check:", {
          hasGoogleToken,
          isCurrentlyGoogle,
          user: session?.session?.user?.email
        });
      } catch (error) {
        console.error("[GoogleIntegrationSetup] Error checking auth methods:", error);
      } finally {
        setIsCheckingAuth(false);
      }
    };

    checkAuthMethods();
  }, [userId, userEmail]);

  const handleConnectGoogle = async () => {
    try {
      await connectGoogleCalendar();
      toast({
        title: "Success",
        description: "Google account connected successfully",
      });
    } catch (error) {
      console.error("[GoogleIntegrationSetup] Error connecting Google:", error);
      toast({
        title: "Connection failed",
        description: "Could not connect to Google. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Google Integration Setup</CardTitle>
        <CardDescription>
          Configure your Google Calendar integration
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {isCheckingAuth ? (
          <div className="flex items-center justify-center p-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2">Checking account status...</span>
          </div>
        ) : (
          <>
            <div className="flex items-center p-2 border rounded-md">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${hasEmailAccount ? 'bg-green-100' : 'bg-gray-100'} mr-3`}>
                {hasEmailAccount ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-gray-400" />
                )}
              </div>
              <div>
                <div className="font-medium">Email Login</div>
                <div className="text-sm text-gray-500">
                  {hasEmailAccount 
                    ? `Account set up with email: ${userEmail}`
                    : "No email account set up"}
                </div>
              </div>
            </div>
            
            <div className="flex items-center p-2 border rounded-md">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${hasGoogleAccount ? 'bg-green-100' : 'bg-gray-100'} mr-3`}>
                {hasGoogleAccount ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                ) : (
                  <Calendar className="h-5 w-5 text-gray-400" />
                )}
              </div>
              <div>
                <div className="font-medium">Google Integration</div>
                <div className="text-sm text-gray-500">
                  {hasGoogleAccount 
                    ? "Google account connected"
                    : "Not connected to Google"}
                </div>
              </div>
            </div>
            
            {(!hasGoogleAccount && hasEmailAccount) && (
              <Alert className="bg-blue-50 border-blue-100">
                <LinkIcon className="h-4 w-4 text-blue-600" />
                <AlertTitle className="text-blue-700">Link your Google account</AlertTitle>
                <AlertDescription className="text-blue-600">
                  Connect Google to use Calendar integration and enable single sign-on
                </AlertDescription>
              </Alert>
            )}
          </>
        )}
      </CardContent>
      
      <CardFooter>
        {hasEmailAccount && !hasGoogleAccount && (
          <Button 
            onClick={handleConnectGoogle}
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? "Connecting..." : "Connect Google Account"}
          </Button>
        )}
        
        {hasGoogleAccount && (
          <Button 
            variant="outline"
            onClick={disconnectGoogleCalendar}
            disabled={isLoading}
            className="w-full"
          >
            Disconnect Google Account
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};

export default GoogleIntegrationSetup;
