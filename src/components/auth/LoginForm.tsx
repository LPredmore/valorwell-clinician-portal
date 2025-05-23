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
          {isLoading ? "Signing in..." : "Sign in"}
        </Button>
      </form>
    </Form>
  );
};

export default LoginForm;
