
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";

// Define form schema with validation
const signupSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  preferredName: z.string().optional(),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(10, "Phone number must be at least 10 digits"),
  state: z.string().min(1, "State is required"),
});

type SignupFormValues = z.infer<typeof signupSchema>;

const MAX_RETRIES = 2;
const RETRY_DELAY = 1000; // 1 second

const Signup = () => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize form
  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      preferredName: "",
      email: "",
      phone: "",
      state: "",
    },
  });

  /**
   * Handle form submission for signup
   * Includes retry logic for better reliability
   */
  const onSubmit = async (values: SignupFormValues) => {
    setIsSubmitting(true);
    setError(null);
    
    try {
      // Generate a secure random temporary password
      const tempPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);
      
      // Setup retry mechanism
      let attempt = 0;
      let success = false;
      let lastError = null;
      
      // Retry logic for authentication
      while (!success && attempt < MAX_RETRIES) {
        try {
          // Add delay between retry attempts
          if (attempt > 0) {
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
          }
          
          // Create auth user with client role in metadata
          const { data: authData, error: authError } = await supabase.auth.signUp({
            email: values.email,
            password: tempPassword,
            options: {
              data: {
                first_name: values.firstName,
                last_name: values.lastName,
                phone: values.phone,
                role: "client",
                state: values.state,
                temp_password: tempPassword
              }
            }
          });
          
          // Handle authentication errors
          if (authError) {
            lastError = authError;
            attempt++;
            continue;
          }
          
          // Verify user was created
          if (!authData.user) {
            lastError = new Error("Failed to create user account - no user returned");
            attempt++;
            continue;
          }
          
          console.log("[Signup] User created successfully:", authData.user.id);
          success = true;
          
          toast({
            title: "Account created successfully",
            description: "You can now log in to access your patient portal.",
          });
          
          // Redirect to login page
          navigate("/login");
          
        } catch (attemptError: any) {
          console.error(`[Signup] Error during registration attempt ${attempt + 1}:`, attemptError);
          lastError = attemptError;
          attempt++;
        }
      }
      
      // If we get here and success is false, we've exhausted our retries
      if (!success) {
        let errorMessage = "There was a problem creating your account. Please try again later.";
        
        if (lastError && typeof lastError === 'object') {
          if ('code' in lastError && lastError.code === '23505') {
            errorMessage = "This email address is already in use. Please log in or use a different email.";
          } else if ('message' in lastError) {
            // Check for specific error messages and provide user-friendly alternatives
            const errMsg = lastError.message.toString().toLowerCase();
            if (errMsg.includes('email')) {
              errorMessage = "There was a problem with your email address. Please verify it and try again.";
            } else if (errMsg.includes('database')) {
              errorMessage = "We're experiencing temporary database issues. Please try again in a few moments.";
            }
          }
        }
        
        setError(errorMessage);
        console.error("[Signup] Registration failed after all retries. Last error:", lastError);
      }
      
    } catch (error: any) {
      console.error("[Signup] Error during registration:", error);
      
      let errorMessage = "There was a problem creating your account. Please try again later.";
      if (error.message) {
        if (error.message.includes("duplicate key")) {
          errorMessage = "This email address is already in use. Please log in or use a different email.";
        } else if (error.message.includes("database") || error.message.includes("saving")) {
          errorMessage = "We're experiencing temporary database issues. Please try again in a few moments.";
        }
      }
      
      setError(errorMessage);
      
      toast({
        title: "Error creating account",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // US states for dropdown
  const states = [
    "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut", "Delaware", 
    "Florida", "Georgia", "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky", 
    "Louisiana", "Maine", "Maryland", "Massachusetts", "Michigan", "Minnesota", "Mississippi", 
    "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire", "New Jersey", "New Mexico", 
    "New York", "North Carolina", "North Dakota", "Ohio", "Oklahoma", "Oregon", "Pennsylvania", 
    "Rhode Island", "South Carolina", "South Dakota", "Tennessee", "Texas", "Utah", "Vermont", 
    "Virginia", "Washington", "West Virginia", "Wisconsin", "Wyoming"
  ];

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold">Client Registration</CardTitle>
          <CardDescription>
            Enter your information to create a new account
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name</FormLabel>
                      <FormControl>
                        <Input placeholder="John" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Doe" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="preferredName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Preferred Name (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="How you'd like to be addressed" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="john.doe@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number</FormLabel>
                    <FormControl>
                      <Input type="tel" placeholder="(555) 123-4567" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="state"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>State of Primary Residence</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select state" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {states.map(state => (
                          <SelectItem key={state} value={state}>
                            {state}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating Account...
                  </>
                ) : "Create Account"}
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex justify-center">
          <Button variant="link" onClick={() => navigate("/login")}>
            Already have an account? Log in
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default Signup;
