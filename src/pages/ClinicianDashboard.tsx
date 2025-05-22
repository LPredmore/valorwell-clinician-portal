import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/context/UserContext';
import { AppointmentsList } from '@/components/dashboard/AppointmentsList';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { v4 as uuidv4 } from 'uuid';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Drawer, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DatePicker } from "@/components/ui/date-picker";
import { TimePicker } from "@/components/ui/time-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Separator } from "@/components/ui/separator";
import { PlusCircle, RefreshCw, Calendar as CalendarIcon } from 'lucide-react';
import { Switch } from "@/components/ui/switch";
import { useTheme } from "@/components/theme-provider";
import { useSearchParams } from 'react-router-dom';
import { useDebounce } from '@/hooks/useDebounce';
import { CustomDialogClose } from '@/components/ui/custom-dialog-close';
import { Appointment } from '@/types/appointment';

const ClientFormSchema = z.object({
  client_preferred_name: z.string().optional(),
  client_first_name: z.string().min(2, {
    message: "Client first name must be at least 2 characters.",
  }),
  client_last_name: z.string().min(2, {
    message: "Client last name must be at least 2 characters.",
  }),
  client_email: z.string().email({
    message: "Please enter a valid email.",
  }),
  client_phone: z.string().min(10, {
    message: "Please enter a valid phone number.",
  }),
  client_date_of_birth: z.date(),
  client_age: z.number().min(0, {
    message: "Please enter a valid age.",
  }),
  client_gender: z.string(),
  client_gender_identity: z.string().optional(),
  client_address: z.string().optional(),
  client_city: z.string().optional(),
  client_state: z.string().optional(),
  client_zip_code: z.string().optional(),
  client_insurance_provider: z.string().optional(),
  client_insurance_policy_number: z.string().optional(),
  client_emergency_contact_name: z.string().optional(),
  client_emergency_contact_phone: z.string().optional(),
  client_emergency_contact_relationship: z.string().optional(),
  client_notes: z.string().optional(),
})

interface ClinicianDashboardProps { }

const ClinicianDashboard: React.FC<ClinicianDashboardProps> = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, isLoading: isUserContextLoading } = useUser();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isClientDrawerOpen, setIsClientDrawerOpen] = useState(false);
  const [isAppointmentDialogOpen, setIsAppointmentDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedTime, setSelectedTime] = useState<Date | undefined>(new Date());
  const [selectedClient, setSelectedClient] = useState<any | null>(null);
  const [clients, setClients] = useState<any[]>([]);
  const [searchParams, setSearchParams] = useSearchParams();
  const [calendarView, setCalendarView] = useState<'week' | 'month'>('week');
  const [showAvailability, setShowAvailability] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [userTimeZone, setUserTimeZone] = useState('America/Chicago');
  const [timeZoneLoading, setTimeZoneLoading] = useState(true);
  const [timeZoneError, setTimeZoneError] = useState<Error | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  const clientForm = useForm<z.infer<typeof ClientFormSchema>>({
    resolver: zodResolver(ClientFormSchema),
    defaultValues: {
      client_preferred_name: "",
      client_first_name: "",
      client_last_name: "",
      client_email: "",
      client_phone: "",
      client_date_of_birth: new Date(),
      client_age: 0,
      client_gender: "",
      client_gender_identity: "",
      client_address: "",
      client_city: "",
      client_state: "",
      client_zip_code: "",
      client_insurance_provider: "",
      client_insurance_policy_number: "",
      client_emergency_contact_name: "",
      client_emergency_contact_phone: "",
      client_emergency_contact_relationship: "",
      client_notes: "",
    },
  })

  const { theme } = useTheme();

  const handleAvailabilityToggle = (checked: boolean) => {
    setShowAvailability(checked);
  };

  const handleCalendarViewChange = (view: 'week' | 'month') => {
    setCalendarView(view);
  };

  const handleDateChange = (date: Date | undefined) => {
    setSelectedDate(date);
  };

  const handleTimeChange = (time: Date | undefined) => {
    setSelectedTime(time);
  };

  const handleClientSelect = (client: any) => {
    setSelectedClient(client);
  };

  const refreshData = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  useEffect(() => {
    const fetchTimeZone = async () => {
      setTimeZoneLoading(true);
      try {
        if (!user?.id) {
          console.warn('User ID is missing, cannot fetch timezone.');
          return;
        }

        const { data, error } = await supabase
          .from('profiles')
          .select('timezone')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('Error fetching timezone:', error);
          setTimeZoneError(error);
          return;
        }

        if (data && data.timezone) {
          setUserTimeZone(data.timezone);
          console.log(`[ClinicianDashboard] User timezone loaded: ${data.timezone}`);
        } else {
          console.warn('No timezone found for user, defaulting to America/Chicago.');
        }
      } catch (err) {
        console.error('Unexpected error fetching timezone:', err);
        setTimeZoneError(new Error('Failed to fetch timezone.'));
      } finally {
        setTimeZoneLoading(false);
      }
    };

    fetchTimeZone();
  }, [user?.id]);

  useEffect(() => {
    const fetchAppointments = async () => {
      setIsLoading(true);
      try {
        if (!user?.id) {
          console.warn('User ID is missing, cannot fetch appointments.');
          return;
        }

        // Calculate date range for fetching appointments
        const startDate = new Date(selectedDate || new Date());
        startDate.setDate(startDate.getDate() - 30); // 1 month before

        const endDate = new Date(selectedDate || new Date());
        endDate.setDate(endDate.getDate() + 60); // 2 months ahead

        const { data, error } = await supabase
          .from('appointments')
          .select('*')
          .eq('clinician_id', user.id)
          .gte('start_at', startDate.toISOString())
          .lte('end_at', endDate.toISOString());

        if (error) {
          console.error('Error fetching appointments:', error);
          setError(error);
        } else {
          setAppointments(data || []);
          console.log(`[ClinicianDashboard] Fetched ${data?.length || 0} appointments`);
        }
      } catch (err) {
        console.error('Error fetching appointments:', err);
        setError(new Error('Failed to fetch appointments.'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchAppointments();
  }, [user?.id, selectedDate, refreshTrigger]);

  useEffect(() => {
    const fetchClients = async () => {
      try {
        if (!user?.id) {
          console.warn('User ID is missing, cannot fetch clients.');
          return;
        }

        let query = supabase
          .from('clients')
          .select('*')
          .eq('clinician_id', user.id);

        if (debouncedSearchTerm) {
          query = query.ilike('client_first_name', `%${debouncedSearchTerm}%`);
        }

        const { data, error } = await query;

        if (error) {
          console.error('Error fetching clients:', error);
          toast({
            title: "Error",
            description: "Failed to fetch clients. Please try again.",
            variant: "destructive",
          });
        } else {
          setClients(data || []);
          console.log(`[ClinicianDashboard] Fetched ${data?.length || 0} clients`);
        }
      } catch (err) {
        console.error('Error fetching clients:', err);
        toast({
          title: "Error",
          description: "Failed to fetch clients. Please try again.",
          variant: "destructive",
        });
      }
    };

    fetchClients();
  }, [user?.id, debouncedSearchTerm]);

  const createNewClient = async (formData: any) => {
    try {
      const payload = {
        id: uuidv4(),
        client_preferred_name: formData.client_preferred_name || formData.client_first_name,
        client_first_name: formData.client_first_name,
        client_last_name: formData.client_last_name,
        client_email: formData.client_email,
        client_phone: formData.client_phone,
        client_date_of_birth: formData.client_date_of_birth,
        client_age: formData.client_age,
        client_gender: formData.client_gender,
        client_gender_identity: formData.client_gender_identity,
        client_address: formData.client_address,
        client_city: formData.client_city,
        client_state: formData.client_state,
        client_zip_code: formData.client_zip_code,
        client_insurance_provider: formData.client_insurance_provider,
        client_insurance_policy_number: formData.client_insurance_policy_number,
        client_emergency_contact_name: formData.client_emergency_contact_name,
        client_emergency_contact_phone: formData.client_emergency_contact_phone,
        client_emergency_contact_relationship: formData.client_emergency_contact_relationship,
        client_notes: formData.client_notes,
        clinician_id: user?.id,
      };

      const { data, error } = await supabase
        .from('clients')
        .insert([payload])
        .select();

      if (error) {
        console.error('Error creating client:', error);
        toast({
          title: "Error",
          description: "Failed to create client. Please try again.",
          variant: "destructive",
        });
      } else {
        console.log('Client created successfully:', data);
        toast({
          title: "Success",
          description: "Client created successfully.",
        });
        clientForm.reset();
        refreshData();
      }
    } catch (error) {
      console.error('Error creating client:', error);
      toast({
        title: "Error",
        description: "Failed to create client. Please try again.",
        variant: "destructive",
      });
    }
  };

  const createNewAppointment = async () => {
    try {
      if (!selectedDate || !selectedTime || !selectedClient?.id) {
        console.warn('Missing appointment details, cannot create appointment.');
        toast({
          title: "Error",
          description: "Please select a date, time, and client.",
          variant: "destructive",
        });
        return;
      }

      const startDateTime = new Date(selectedDate);
      startDateTime.setHours(selectedTime.getHours(), selectedTime.getMinutes(), 0, 0);

      const endDateTime = new Date(startDateTime);
      endDateTime.setHours(startDateTime.getHours() + 1);

      const payload = {
        clinician_id: user?.id,
        client_id: selectedClient.id,
        start_at: startDateTime.toISOString(),
        end_at: endDateTime.toISOString(),
        type: 'therapy',
        status: 'scheduled',
      };

      const { data, error } = await supabase
        .from('appointments')
        .insert([payload])
        .select();

      if (error) {
        console.error('Error creating appointment:', error);
        toast({
          title: "Error",
          description: "Failed to create appointment. Please try again.",
          variant: "destructive",
        });
      } else {
        console.log('Appointment created successfully:', data);
        toast({
          title: "Success",
          description: "Appointment created successfully.",
        });
        setIsAppointmentDialogOpen(false);
        refreshData();
      }
    } catch (error) {
      console.error('Error creating appointment:', error);
      toast({
        title: "Error",
        description: "Failed to create appointment. Please try again.",
        variant: "destructive",
      });
    }
  };

  const updateAppointment = async (appointmentId: string, newStartAt: string, newEndAt: string) => {
    try {
      const { data, error } = await supabase
        .from('appointments')
        .update({ start_at: newStartAt, end_at: newEndAt })
        .eq('id', appointmentId)
        .select();

      if (error) {
        console.error('Error updating appointment:', error);
        toast({
          title: "Error",
          description: "Failed to update appointment. Please try again.",
          variant: "destructive",
        });
      } else {
        console.log('Appointment updated successfully:', data);
        toast({
          title: "Success",
          description: "Appointment updated successfully.",
        });
        refreshData();
      }
    } catch (error) {
      console.error('Error updating appointment:', error);
      toast({
        title: "Error",
        description: "Failed to update appointment. Please try again.",
        variant: "destructive",
      });
    }
  };

  const deleteAppointment = async (appointmentId: string) => {
    try {
      const { data, error } = await supabase
        .from('appointments')
        .delete()
        .eq('id', appointmentId);

      if (error) {
        console.error('Error deleting appointment:', error);
        toast({
          title: "Error",
          description: "Failed to delete appointment. Please try again.",
          variant: "destructive",
        });
      } else {
        console.log('Appointment deleted successfully:', data);
        toast({
          title: "Success",
          description: "Appointment deleted successfully.",
        });
        refreshData();
      }
    } catch (error) {
      console.error('Error deleting appointment:', error);
      toast({
        title: "Error",
        description: "Failed to delete appointment. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (isUserContextLoading || timeZoneLoading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <div>No user profile found.</div>;
  }

  return (
    <div className="container py-10">
      <Card>
        <CardHeader>
          <CardTitle>Clinician Dashboard</CardTitle>
        </CardHeader>
        <CardContent className="pl-6">
          <Tabs defaultValue="calendar" className="space-y-4">
            <TabsList>
              <TabsTrigger value="calendar">Calendar</TabsTrigger>
              <TabsTrigger value="appointments">Appointments</TabsTrigger>
              <TabsTrigger value="clients">Clients</TabsTrigger>
              <TabsTrigger value="billing">Billing</TabsTrigger>
            </TabsList>
            <TabsContent value="calendar" className="space-y-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-2">
                  <Button variant="outline" size="sm" onClick={refreshData}>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Refresh
                  </Button>
                  <Select value={calendarView} onValueChange={handleCalendarViewChange}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Select view" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="week">Week View</SelectItem>
                      <SelectItem value="month">Month View</SelectItem>
                    </SelectContent>
                  </Select>
                  <Label htmlFor="showAvailability" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed">
                    Show Availability
                  </Label>
                  <Switch
                    id="showAvailability"
                    checked={showAvailability}
                    onCheckedChange={handleAvailabilityToggle}
                  />
                </div>
                <Button size="sm" onClick={() => navigate('/calendar-settings')}>
                  Calendar Settings
                </Button>
              </div>
              <div className="bg-gray-100 p-4 rounded-md">
                <h3>Calendar would display here</h3>
                <p>Calendar view: {calendarView}</p>
                <p>Show availability: {showAvailability ? 'Yes' : 'No'}</p>
              </div>
            </TabsContent>
            <TabsContent value="appointments" className="space-y-4">
              <AppointmentsList 
                title="Upcoming Appointments"
                icon={<CalendarIcon className="mr-2 h-5 w-5" />}
                appointments={appointments}
                isLoading={isLoading}
                error={error}
                emptyMessage="No upcoming appointments"
                timeZoneDisplay="local"
                userTimeZone={userTimeZone}
              />
            </TabsContent>
            <TabsContent value="clients" className="space-y-4">
              <div className="flex justify-between items-center">
                <Input
                  type="search"
                  placeholder="Search clients..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <Drawer>
                  <DrawerTrigger asChild>
                    <Button variant="outline">
                      <PlusCircle className="mr-2 h-4 w-4" />
                      Add Client
                    </Button>
                  </DrawerTrigger>
                  <DrawerContent>
                    <DrawerHeader>
                      <DrawerTitle>Create New Client</DrawerTitle>
                      <DrawerDescription>
                        Create a new client to add to your list.
                      </DrawerDescription>
                    </DrawerHeader>
                    <div className="px-4">
                      <div className="grid gap-4 py-4">
                        <FormField
                          control={clientForm.control}
                          name="client_first_name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>First Name</FormLabel>
                              <FormControl>
                                <Input placeholder="John" {...field} />
                              </FormControl>
                              <FormDescription>
                                This is the client's first name.
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={clientForm.control}
                          name="client_last_name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Last Name</FormLabel>
                              <FormControl>
                                <Input placeholder="Doe" {...field} />
                              </FormControl>
                              <FormDescription>
                                This is the client's last name.
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={clientForm.control}
                          name="client_email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Email</FormLabel>
                              <FormControl>
                                <Input placeholder="johndoe@example.com" {...field} />
                              </FormControl>
                              <FormDescription>
                                This is the client's email address.
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={clientForm.control}
                          name="client_phone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Phone</FormLabel>
                              <FormControl>
                                <Input placeholder="555-555-5555" {...field} />
                              </FormControl>
                              <FormDescription>
                                This is the client's phone number.
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                    <DrawerFooter>
                      <Button type="submit" onClick={clientForm.handleSubmit(createNewClient)}>Create Client</Button>
                      <CustomDialogClose variant="outline">Cancel</CustomDialogClose>
                    </DrawerFooter>
                  </DrawerContent>
                </Drawer>
              </div>
              <ClientTable clients={clients} />
            </TabsContent>
            <TabsContent value="billing">
              Billing content goes here.
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      <Dialog open={isAppointmentDialogOpen} onOpenChange={setIsAppointmentDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="outline">Create Appointment</Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Create New Appointment</DialogTitle>
            <DialogDescription>
              Make a new appointment for a client.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="date" className="text-right">
                Date
              </Label>
              <DatePicker date={selectedDate} setDate={handleDateChange} />
              <FormDescription>
                Select a date for the appointment.
              </FormDescription>
              <FormMessage />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="time" className="text-right">
                Time
              </Label>
              <TimePicker selected={selectedTime} onSelect={handleTimeChange} initialFocus />
              <FormDescription>
                Select a time for the appointment.
              </FormDescription>
              <FormMessage />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="client" className="text-right">
                Client
              </Label>
              <Select onValueChange={(value) => {
                const client = clients.find((client) => client.id === value);
                handleClientSelect(client);
              }}>
                <SelectTrigger className="w-[240px]">
                  <SelectValue placeholder="Select a client" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.client_first_name} {client.client_last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>
                Select a client for the appointment.
              </FormDescription>
              <FormMessage />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" onClick={createNewAppointment}>Create Appointment</Button>
            <CustomDialogClose variant="outline">Cancel</CustomDialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

interface ClientTableProps {
  clients: any[];
}

const ClientTable: React.FC<ClientTableProps> = ({ clients }) => {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[100px]">ID</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Phone</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {clients.map((client) => (
            <TableRow key={client.id}>
              <TableCell className="font-medium">{client.id}</TableCell>
              <TableCell>{client.client_first_name} {client.client_last_name}</TableCell>
              <TableCell>{client.client_email}</TableCell>
              <TableCell>{client.client_phone}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default ClinicianDashboard;
