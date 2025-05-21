
import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "@/hooks/use-toast";
import { createUser } from "@/integrations/supabase/client";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AlertCircle, Loader2 } from "lucide-react";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";

const userFormSchema = z.object({
  firstName: z.string().min(2, { message: "First name is required" }),
  lastName: z.string().min(2, { message: "Last name is required" }),
  email: z.string().email({ message: "Invalid email address" }),
  phone: z.string().optional(),
  professionalName: z.string().optional(),
  role: z.enum(["admin", "client", "clinician"], {
    required_error: "Please select a role",
  }),
});

type UserFormValues = z.infer<typeof userFormSchema>;

interface AddUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUserAdded: () => void;
}

export function AddUserDialog({ open, onOpenChange, onUserAdded }: AddUserDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [creationError, setCreationError] = useState<string | null>(null);
  const [createdUserId, setCreatedUserId] = useState<string | null>(null);
  const [showProfessionalName, setShowProfessionalName] = useState(false);

  const form = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      professionalName: "",
      role: "client",
    },
  });
  
  // Show/hide professional name field based on role selection
  const watchRole = form.watch("role");
  if (watchRole === "clinician" && !showProfessionalName) {
    setShowProfessionalName(true);
  } else if (watchRole !== "clinician" && showProfessionalName) {
    setShowProfessionalName(false);
  }

  const checkUserCreationLogs = async (userId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        console.error("No valid session for checking logs");
        return { success: false };
      }
      
      const { data, error } = await supabase.functions.invoke('check-user-creation-logs', {
        body: { userId },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });
      
      if (error) {
        console.error("Error checking logs:", error);
        return { success: false };
      }
      
      console.log("User creation logs:", data);
      
      // Check for creation errors in logs or app metadata
      let detailedErrorMessage = null;
      
      if (data.user?.creationError) {
        const errorDetails = data.user.creationError;
        detailedErrorMessage = `Database error: ${errorDetails.error || 'Unknown error'} (${errorDetails.role} creation)`;
      } else if (data.logs && data.logs.length > 0) {
        // Look for error logs
        const errorLog = data.logs.find(log => log.description.includes('Error inserting'));
        if (errorLog) {
          detailedErrorMessage = `Error in database: ${errorLog.details.error || 'Unknown error'} (${errorLog.description})`;
        }
      }
      
      if (data.appRoleStatus && !data.appRoleStatus.exists) {
        detailedErrorMessage = `Database schema issue: app_role enum type is missing. ${detailedErrorMessage || ''}`;
      }
      
      return { 
        success: !detailedErrorMessage, 
        error: detailedErrorMessage,
        details: data
      };
    } catch (err) {
      console.error("Error in checkUserCreationLogs:", err);
      return { success: false };
    }
  };

  async function onSubmit(data: UserFormValues) {
    setIsSubmitting(true);
    setCreationError(null);
    setCreatedUserId(null);
    console.log("Submitting user data:", data);

    try {
      // User metadata to be saved
      const userData = {
        first_name: data.firstName,
        last_name: data.lastName,
        phone: data.phone || "",
        role: data.role,
        temp_password: "temppass1234", // Default temp password
      };
      
      // Add professional name for clinicians
      if (data.role === "clinician") {
        userData.professional_name = data.professionalName || `${data.firstName} ${data.lastName}`;
      }
      
      console.log("User metadata to be saved:", userData);
      
      // Create user using our helper function that now uses the edge function
      const { data: createUserResponse, error: createUserError } = await createUser(data.email, userData);

      if (createUserError) {
        console.error("Error creating user:", createUserError);
        throw createUserError;
      }

      console.log("User created successfully:", createUserResponse);
      
      // Save the created user ID for potential diagnostics
      if (createUserResponse?.user?.id) {
        setCreatedUserId(createUserResponse.user.id);
        
        // Check for any issues in the database logs
        const logsCheck = await checkUserCreationLogs(createUserResponse.user.id);
        
        if (!logsCheck.success && logsCheck.error) {
          // We have an issue reported in logs
          setCreationError(logsCheck.error);
          toast({
            title: "Warning",
            description: `User was created but there might be an issue: ${logsCheck.error}`,
            variant: "destructive",
          });
          return;
        }
        
        // Check for warnings from the edge function
        if (createUserResponse.warnings && createUserResponse.warnings.length > 0) {
          toast({
            title: "User created with warnings",
            description: createUserResponse.warnings[0],
            variant: "warning",
          });
        }
      }
      
      toast({
        title: "Success",
        description: "User added successfully with default password: temppass1234. Please note they will need to confirm their email before logging in.",
      });

      form.reset();
      onUserAdded();
      onOpenChange(false);
    } catch (error) {
      console.error("Error adding user:", error);
      
      // More user-friendly error message
      let errorMessage = "Failed to add user";
      if (error.message) {
        errorMessage += `: ${error.message}`;
      } else if (error.error_description) {
        errorMessage += `: ${error.error_description}`;
      } else if (error.details) {
        errorMessage += `: ${error.details}`;
      } else {
        errorMessage += ". Please try again.";
      }
      
      setCreationError(errorMessage);
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  const retryDiagnostics = async () => {
    if (!createdUserId) return;
    
    setIsSubmitting(true);
    try {
      const result = await checkUserCreationLogs(createdUserId);
      if (result.details) {
        console.log("Diagnostics result:", result.details);
        
        let message = "Diagnostics complete. ";
        if (result.error) {
          message += `Found issue: ${result.error}`;
          setCreationError(result.error);
        } else {
          message += "No issues found in database logs.";
          setCreationError(null);
        }
        
        toast({
          title: "Diagnostics",
          description: message,
        });
      }
    } catch (e) {
      console.error("Error running diagnostics:", e);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New User</DialogTitle>
          <DialogDescription>
            Enter user details below. A default password of "temppass1234" will be assigned. The user will need to confirm their email before logging in.
          </DialogDescription>
        </DialogHeader>
        
        {creationError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{creationError}</AlertDescription>
            {createdUserId && (
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-2"
                onClick={retryDiagnostics}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Running diagnostics...
                  </>
                ) : (
                  "Run diagnostics"
                )}
              </Button>
            )}
          </Alert>
        )}
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="firstName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>First Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter first name" {...field} />
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
                    <Input placeholder="Enter last name" {...field} />
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
                    <Input type="email" placeholder="Enter email address" {...field} />
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
                  <FormLabel>Phone (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter phone number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>User Role</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="client">Client</SelectItem>
                      <SelectItem value="clinician">Clinician</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            {showProfessionalName && (
              <FormField
                control={form.control}
                name="professionalName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Professional Name (Optional)</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Dr. Jane Smith" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            <DialogFooter>
              <Button
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Adding...
                  </>
                ) : (
                  "Add User"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
