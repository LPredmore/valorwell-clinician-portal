
import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

const NylasOAuthCallback: React.FC = () => {
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState('Processing Google Calendar connection...');

  useEffect(() => {
    const handleCallback = async () => {
      try {
        console.log('[NylasOAuthCallback] Processing OAuth callback for Google Calendar');
        console.log('[NylasOAuthCallback] Current URL:', window.location.href);
        
        // Extract parameters from URL
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const state = urlParams.get('state');
        const error = urlParams.get('error');

        // Handle OAuth error (user cancelled or other error)
        if (error) {
          console.log('[NylasOAuthCallback] OAuth error:', error);
          setStatus('error');
          setMessage('Google Calendar connection was cancelled or failed');
          
          // Notify parent and close popup after showing error briefly
          if (window.opener) {
            window.opener.postMessage({ 
              type: 'NYLAS_AUTH_ERROR', 
              error: error 
            }, '*');
          }
          
          setTimeout(() => {
            window.close();
          }, 2000);
          return;
        }

        // Validate required parameters
        if (!code) {
          console.error('[NylasOAuthCallback] Missing authorization code');
          setStatus('error');
          setMessage('Invalid callback - missing authorization code');
          
          if (window.opener) {
            window.opener.postMessage({ 
              type: 'NYLAS_AUTH_ERROR', 
              error: 'Missing authorization code' 
            }, '*');
          }
          
          setTimeout(() => {
            window.close();
          }, 2000);
          return;
        }

        console.log('[NylasOAuthCallback] Calling nylas-auth callback with code');
        
        // Call the nylas-auth edge function to complete the OAuth flow
        const { data, error: functionError } = await supabase.functions.invoke('nylas-auth', {
          body: {
            action: 'callback',
            code,
            state
          }
        });

        if (functionError) {
          console.error('[NylasOAuthCallback] Function error:', functionError);
          setStatus('error');
          setMessage(`Connection failed: ${functionError.message}`);
          
          if (window.opener) {
            window.opener.postMessage({ 
              type: 'NYLAS_AUTH_ERROR', 
              error: functionError.message 
            }, '*');
          }
          
          setTimeout(() => {
            window.close();
          }, 3000);
          return;
        }

        if (data?.success) {
          console.log('[NylasOAuthCallback] Google Calendar connected successfully:', data.connection);
          setStatus('success');
          setMessage(`Successfully connected Google Calendar for ${data.email}!`);
          
          // Notify parent window (calendar page) to refresh connections
          if (window.opener) {
            window.opener.postMessage({ 
              type: 'NYLAS_AUTH_SUCCESS', 
              connection: data.connection,
              provider: 'google',
              email: data.email
            }, '*');
          }
          
          // Close popup after success
          setTimeout(() => {
            window.close();
          }, 1500);
        } else {
          console.error('[NylasOAuthCallback] Unexpected response:', data);
          setStatus('error');
          setMessage('Connection completed but response was unexpected');
          
          if (window.opener) {
            window.opener.postMessage({ 
              type: 'NYLAS_AUTH_ERROR', 
              error: 'Unexpected response from server' 
            }, '*');
          }
          
          setTimeout(() => {
            window.close();
          }, 3000);
        }

      } catch (error: any) {
        console.error('[NylasOAuthCallback] Callback processing error:', error);
        setStatus('error');
        setMessage(`Connection error: ${error.message || 'Unknown error'}`);
        
        if (window.opener) {
          window.opener.postMessage({ 
            type: 'NYLAS_AUTH_ERROR', 
            error: error.message || 'Unknown error' 
          }, '*');
        }
        
        setTimeout(() => {
          window.close();
        }, 3000);
      }
    };

    handleCallback();

    // Fallback: Close window after 10 seconds if something goes wrong
    const fallbackTimer = setTimeout(() => {
      console.log('[NylasOAuthCallback] Fallback timer - closing window');
      window.close();
    }, 10000);

    return () => clearTimeout(fallbackTimer);
  }, []);

  const getIcon = () => {
    switch (status) {
      case 'processing':
        return <Loader2 className="h-8 w-8 animate-spin text-blue-600" />;
      case 'success':
        return <CheckCircle className="h-8 w-8 text-green-600" />;
      case 'error':
        return <XCircle className="h-8 w-8 text-red-600" />;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'processing':
        return 'text-blue-600';
      case 'success':
        return 'text-green-600';
      case 'error':
        return 'text-red-600';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center">Google Calendar Connection</CardTitle>
          <CardDescription className="text-center">
            Processing your Google Calendar authorization via Nylas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center space-y-4">
            {getIcon()}
            <p className={`text-center font-medium ${getStatusColor()}`}>
              {message}
            </p>
            {status === 'processing' && (
              <p className="text-sm text-gray-500 text-center">
                Please wait while we connect your Google Calendar...
              </p>
            )}
            {status !== 'processing' && (
              <p className="text-sm text-gray-500 text-center">
                This window will close automatically.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default NylasOAuthCallback;
