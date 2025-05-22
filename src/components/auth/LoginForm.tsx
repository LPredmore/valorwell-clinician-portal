
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage 
} from "@/components/ui/form";
import { debugAuthOperation } from "@/debug/authDebugUtils";

const formSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
});

type LoginFormProps = {
  onForgotPassword: () => void;
};

const LoginForm = ({ onForgotPassword }: LoginFormProps) => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    console.log(`[LoginForm] Login attempt started for email: ${values.email}`);
    setLoginError(null);
    
    // Set a timeout to clear the loading state in case the operation hangs
    const timeoutId = setTimeout(() => {
      console.warn("[LoginForm] Login operation timed out after 15 seconds");
      setIsLoading(false);
      setLoginError("The login request timed out. Please try again.");
      toast({
        title: "Login timed out",
        description: "The request took too long to complete. Please try again.",
        variant: "destructive",
      });
    }, 15000);

    try {
      setIsLoading(true);
      console.log("[LoginForm] Calling supabase.auth.signInWithPassword");
      
      const { data, error } = await debugAuthOperation("signInWithPassword", () => 
        supabase.auth.signInWithPassword({
          email: values.email,
          password: values.password,
        })
      );

      // Clear the timeout since the operation completed
      clearTimeout(timeoutId);

      if (error) {
        console.error("[LoginForm] Authentication error:", error.message, error);
        
        // Provide more specific error messages based on the error
        let errorMessage = "There was a problem signing in";
        if (error.message?.includes("Invalid login")) {
          errorMessage = "Invalid email or password";
        } else if (error.message?.includes("Email not confirmed")) {
          errorMessage = "Please verify your email before logging in";
        }
        
        setLoginError(errorMessage);
        throw new Error(errorMessage);
      }

      console.log("[LoginForm] Authentication successful, user:", data.user?.id);
      toast({
        title: "Login successful",
        description: "Welcome back!",
      });
      
      console.log("[LoginForm] Navigating to home page");
      // Navigate immediately without delay
      navigate("/");
    } catch (error: any) {
      console.error("[LoginForm] Login error:", error);
      // Clear the timeout if there's an error
      clearTimeout(timeoutId);
      
      toast({
        title: "Login failed",
        description: error.message || "There was a problem signing in",
        variant: "destructive",
      });
    } finally {
      console.log("[LoginForm] Setting isLoading to false");
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    console.log("[LoginForm] Google sign-in attempt started");
    setLoginError(null);
    setIsLoading(true);
    
    try {
      console.log("[LoginForm] Calling supabase.auth.signInWithOAuth");
      const { data, error } = await debugAuthOperation("signInWithOAuth", () => 
        supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: window.location.origin,
            scopes: 'https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events',
            queryParams: {
              access_type: 'offline',
              prompt: 'consent'
            }
          }
        })
      );

      if (error) {
        console.error("[LoginForm] Google Authentication error:", error.message, error);
        setLoginError("Failed to sign in with Google");
        throw new Error(error.message);
      }

      console.log("[LoginForm] Google OAuth flow initiated");
      // No need to navigate or set success message here as the OAuth flow will redirect
    } catch (error: any) {
      console.error("[LoginForm] Google login error:", error);
      
      toast({
        title: "Google login failed",
        description: error.message || "There was a problem signing in with Google",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input placeholder="Enter your email" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <Input type="password" placeholder="Enter your password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        {/* Display login error if present */}
        {loginError && (
          <p className="text-sm text-red-500">{loginError}</p>
        )}
        
        <div className="text-right">
          <button 
            type="button"
            onClick={onForgotPassword}
            className="text-sm text-blue-500 hover:text-blue-700"
          >
            Forgot password?
          </button>
        </div>
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? "Signing in..." : "Sign in with Email"}
        </Button>

        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-white px-2 text-sm text-gray-500">or</span>
          </div>
        </div>

        <Button 
          type="button"
          variant="outline" 
          className="w-full flex items-center justify-center gap-2 bg-white hover:bg-gray-50 text-gray-800 border-gray-300"
          onClick={handleGoogleSignIn}
          disabled={isLoading}
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
            <path d="M1 1h22v22H1z" fill="none" />
          </svg>
          Sign in with Google
        </Button>
      </form>
    </Form>
  );
};

export default LoginForm;
