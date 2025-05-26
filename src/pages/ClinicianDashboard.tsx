import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from "@/hooks/use-toast";
import { Plus, UserPlus, Users, ClipboardList, Calendar, Settings, LogOut, Bug } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { ClientDetails } from '@/types/client';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { useUser } from '@/context/UserContext';
import Layout from '@/components/layout/Layout';

const formSchema = z.object({
  client_first_name: z.string().min(2, {
    message: "First name must be at least 2 characters.",
  }),
  client_last_name: z.string().min(2, {
    message: "Last name must be at least 2 characters.",
  }),
  client_email: z.string().email({
    message: "Invalid email address.",
  }),
  client_phone: z.string().min(10, {
    message: "Phone number must be at least 10 digits.",
  }),
});

const ClinicianDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [clients, setClients] = useState<ClientDetails[]>([]);
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { user, logout } = useUser();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      client_first_name: "",
      client_last_name: "",
      client_email: "",
      client_phone: "",
    },
  });

  function onSubmit(data: z.infer<typeof formSchema>) {
    console.log(data);
  }

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    const fetchClients = async () => {
      setIsLoading(true);
      try {
        const { data: clientsData, error } = await supabase
          .from('clients')
          .select('*');

        if (error) {
          console.error("Error fetching clients:", error);
          toast({
            title: "Error",
            description: "Failed to fetch clients.",
            variant: "destructive",
          });
        } else {
          setClients(clientsData || []);
        }
      } catch (error) {
        console.error("Unexpected error fetching clients:", error);
        toast({
          title: "Error",
          description: "An unexpected error occurred while fetching clients.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchClients();
  }, [user, navigate, toast]);

  const addClient = async (formData: z.infer<typeof formSchema>) => {
    try {
      const newClientData: ClientDetails = {
        id: crypto.randomUUID(),
        client_first_name: formData.client_first_name,
        client_last_name: formData.client_last_name,
        client_email: formData.client_email,
        client_phone: formData.client_phone,
        client_status: 'active',
        client_intake_date: new Date().toISOString(),
      };

      setClients(prevClients => [...prevClients, newClientData]);
      setOpen(false);

      toast({
        title: "Success",
        description: "Client added successfully.",
      });
    } catch (error) {
      console.error("Error adding client:", error);
      toast({
        title: "Error",
        description: "Failed to add client.",
        variant: "destructive",
      });
    }
  };

  const handleSignOut = async () => {
    try {
      await logout();
      navigate('/login');
      toast({
        title: "Success",
        description: "Signed out successfully.",
      });
    } catch (error) {
      console.error("Error signing out:", error);
      toast({
        title: "Error",
        description: "Failed to sign out.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-full">
          <p>Loading clients...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto py-10">
        <div className="mb-8 flex justify-between items-center">
          <h1 className="text-3xl font-bold">
            Welcome to Your Dashboard, {user?.email}
          </h1>
          <div className="flex gap-2">
            <Link to="/calendar-debug" className="inline-flex items-center">
              <Button variant="outline" className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
                <Bug className="mr-2" size={16} />
                Debug Calendar
              </Button>
            </Link>
            <Button onClick={handleSignOut} className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded">
              <LogOut className="mr-2" size={16} />
              Sign Out
            </Button>
          </div>
        </div>

        {/* Verification Status Panel */}
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h2 className="text-lg font-semibold mb-2 text-blue-800">📋 Availability Fix Verification Steps</h2>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs">1</span>
              <span>Click "Debug Calendar" above to access verification tools</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs">2</span>
              <span>Run "Comprehensive Analysis" to verify data sources</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs">3</span>
              <span>Check that NEW SYSTEM shows your availability data</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs">4</span>
              <span>Navigate to Calendar page to verify all days display correctly</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <Card className="bg-blue-50 hover:bg-blue-100 transition-colors duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
              <Users className="h-4 w-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{clients.length}</div>
              <p className="text-xs text-gray-500">+20% from last month</p>
            </CardContent>
          </Card>

          <Card className="bg-green-50 hover:bg-green-100 transition-colors duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Upcoming Appointments
              </CardTitle>
              <Calendar className="h-4 w-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">7</div>
              <p className="text-xs text-gray-500">+10% from last month</p>
            </CardContent>
          </Card>

          <Card className="bg-yellow-50 hover:bg-yellow-100 transition-colors duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tasks Due</CardTitle>
              <ClipboardList className="h-4 w-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">3</div>
              <p className="text-xs text-gray-500">-5% from last month</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Client List</CardTitle>
            <CardDescription>
              Here you can manage all of your clients.
            </CardDescription>
          </CardHeader>
          <CardContent className="overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Intake Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clients.map((client) => (
                  <TableRow key={client.id}>
                    <TableCell className="font-medium">
                      <Link to={`/client-details/${client.id}`}>
                        {client.client_first_name} {client.client_last_name}
                      </Link>
                    </TableCell>
                    <TableCell>{client.client_email}</TableCell>
                    <TableCell>{client.client_phone}</TableCell>
                    <TableCell>
                      {client.client_intake_date
                        ? format(new Date(client.client_intake_date), 'MM/dd/yyyy')
                        : 'N/A'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
          <CardFooter className="flex justify-between items-center">
            <p className="text-sm text-gray-500">
              {clients.length} total clients
            </p>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" className="ml-auto">
                  <UserPlus className="mr-2 h-4 w-4" />
                  Add Client
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Add Client</DialogTitle>
                  <DialogDescription>
                    Add a new client to your list.
                  </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                  <form
                    onSubmit={form.handleSubmit((values) => {
                      onSubmit(values);
                      addClient(values);
                    })}
                    className="space-y-4"
                  >
                    <FormField
                      control={form.control}
                      name="client_first_name"
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
                      name="client_last_name"
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
                    <FormField
                      control={form.control}
                      name="client_email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input placeholder="john.doe@example.com" type="email" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="client_phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone</FormLabel>
                          <FormControl>
                            <Input placeholder="555-123-4567" type="tel" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="submit">Add Client</Button>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </CardFooter>
        </Card>
      </div>
    </Layout>
  );
};

export default ClinicianDashboard;
