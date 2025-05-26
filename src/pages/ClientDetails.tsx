import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Edit, Calendar, Phone, Mail, Clock } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ClientDetails, Clinician } from '@/types/client';
import PersonalInfoTab from '@/components/client/PersonalInfoTab';
import InsuranceTab from '@/components/client/InsuranceTab';
import EmergencyContactTab from '@/components/client/EmergencyContactTab';
import MedicalHistoryTab from '@/components/client/MedicalHistoryTab';
import TreatmentPlanTab from '@/components/client/TreatmentPlanTab';
import NotesTab from '@/components/client/NotesTab';
import { getClientById } from '@/services/clientService';
import { getClinicians } from '@/services/clinicianService';
import { getAppointmentsByClientId } from '@/services/appointmentService';
import { Appointment } from '@/types/appointment';
import AppointmentCard from '@/components/client/AppointmentCard';
import { formatPhoneNumber } from '@/utils/formatters';

const ClientDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [clientData, setClientData] = useState<ClientDetails | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [clinicians, setClinicians] = useState<Clinician[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState('personal');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form state for diagnosis management
  const form = {
    diagnosis: clientData?.client_diagnosis || [],
  };

  const handleAddDiagnosis = (diagnosis: string) => {
    if (clientData) {
      const updatedDiagnosis = [...(clientData.client_diagnosis || []), diagnosis];
      setClientData({
        ...clientData,
        client_diagnosis: updatedDiagnosis,
      });
    }
  };

  const handleRemoveDiagnosis = (index: number) => {
    if (clientData && clientData.client_diagnosis) {
      const updatedDiagnosis = [...clientData.client_diagnosis];
      updatedDiagnosis.splice(index, 1);
      setClientData({
        ...clientData,
        client_diagnosis: updatedDiagnosis,
      });
    }
  };

  const handleSave = (data: Partial<ClientDetails>) => {
    if (clientData) {
      setClientData({ ...clientData, ...data });
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  useEffect(() => {
    const fetchClientData = async () => {
      if (!id) return;
      
      setIsLoading(true);
      try {
        const client = await getClientById(id);
        setClientData(client);
        
        // Fetch appointments for this client
        const clientAppointments = await getAppointmentsByClientId(id);
        setAppointments(clientAppointments);
        
        // Fetch clinicians for dropdown selection
        const allClinicians = await getClinicians();
        setClinicians(allClinicians);
        
      } catch (err) {
        console.error('Error fetching client data:', err);
        setError('Failed to load client data. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchClientData();
  }, [id]);

  if (isLoading) {
    return <div className="flex justify-center items-center h-screen">Loading client data...</div>;
  }

  if (error) {
    return <div className="text-red-500 p-4">{error}</div>;
  }

  if (!clientData) {
    return <div className="p-4">Client not found</div>;
  }

  const getInitials = () => {
    const firstName = clientData.client_first_name || '';
    const lastName = clientData.client_last_name || '';
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const getFullName = () => {
    return `${clientData.client_first_name} ${clientData.client_last_name}`;
  };

  const getPreferredName = () => {
    return clientData.client_preferred_name ? `(${clientData.client_preferred_name})` : '';
  };

  const getUpcomingAppointments = () => {
    const now = new Date();
    return appointments
      .filter(appointment => new Date(appointment.start_at) > now)
      .sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime())
      .slice(0, 3);
  };

  const upcomingAppointments = getUpcomingAppointments();

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16">
            <AvatarFallback className="bg-valorwell-600 text-white text-xl">
              {getInitials()}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-2xl font-bold">
              {getFullName()} <span className="font-normal text-gray-500">{getPreferredName()}</span>
            </h1>
            <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
              <div className="flex items-center gap-1">
                <Mail className="h-4 w-4" />
                <span>{clientData.client_email}</span>
              </div>
              <div className="flex items-center gap-1">
                <Phone className="h-4 w-4" />
                <span>{formatPhoneNumber(clientData.client_phone)}</span>
              </div>
            </div>
          </div>
        </div>
        <Badge variant={clientData.client_status === 'active' ? 'default' : 'outline'}>
          {clientData.client_status || 'No Status'}
        </Badge>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Client Information</CardTitle>
                {!isEditing && (
                  <Button onClick={() => setIsEditing(true)} size="sm">
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-6">
                  <TabsTrigger value="personal">Personal</TabsTrigger>
                  <TabsTrigger value="insurance">Insurance</TabsTrigger>
                  <TabsTrigger value="emergency">Emergency</TabsTrigger>
                  <TabsTrigger value="medical">Medical</TabsTrigger>
                  <TabsTrigger value="treatment">Treatment</TabsTrigger>
                  <TabsTrigger value="notes">Notes</TabsTrigger>
                </TabsList>
                
                <TabsContent value="personal">
                  <PersonalInfoTab
                    isEditing={isEditing}
                    form={{
                      ...form,
                      handleAddDiagnosis,
                      handleRemoveDiagnosis,
                    }}
                    clientData={clientData}
                    onSave={handleSave}
                    onCancel={handleCancel}
                  />
                </TabsContent>
                
                <TabsContent value="insurance">
                  <InsuranceTab
                    isEditing={isEditing}
                    form={form}
                    clientData={clientData}
                    onSave={handleSave}
                    onCancel={handleCancel}
                  />
                </TabsContent>
                
                <TabsContent value="emergency">
                  <EmergencyContactTab
                    isEditing={isEditing}
                    form={form}
                    clientData={clientData}
                    clinicians={clinicians}
                    onSave={handleSave}
                    onCancel={handleCancel}
                  />
                </TabsContent>
                
                <TabsContent value="medical">
                  <MedicalHistoryTab
                    isEditing={isEditing}
                    form={form}
                    clientData={clientData}
                    onSave={handleSave}
                    onCancel={handleCancel}
                  />
                </TabsContent>
                
                <TabsContent value="treatment">
                  <TreatmentPlanTab
                    isEditing={isEditing}
                    form={form}
                    clientData={clientData}
                    onSave={handleSave}
                    onCancel={handleCancel}
                  />
                </TabsContent>
                
                <TabsContent value="notes">
                  <NotesTab
                    isEditing={isEditing}
                    form={form}
                    clientData={clientData}
                    onSave={handleSave}
                    onCancel={handleCancel}
                  />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
        
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Calendar className="h-5 w-5 mr-2" />
                Upcoming Appointments
              </CardTitle>
            </CardHeader>
            <CardContent>
              {upcomingAppointments.length > 0 ? (
                <div className="space-y-4">
                  {upcomingAppointments.map((appointment) => (
                    <AppointmentCard key={appointment.id} appointment={appointment} />
                  ))}
                  <Button variant="outline" className="w-full">
                    View All Appointments
                  </Button>
                </div>
              ) : (
                <div className="text-center py-4 text-gray-500">
                  No upcoming appointments
                </div>
              )}
              <Button className="w-full mt-4">Schedule Appointment</Button>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Clock className="h-5 w-5 mr-2" />
                Session History
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Last Session</span>
                  <span>{clientData.client_last_session_date || 'None'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Next Session</span>
                  <span>{clientData.client_next_session_date || 'None'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Frequency</span>
                  <span>{clientData.client_session_frequency || 'Not set'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Total Sessions</span>
                  <span>{appointments.length}</span>
                </div>
              </div>
              <Button variant="outline" className="w-full mt-4">
                View Session Notes
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ClientDetails;
