
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/context/UserContext';
import Layout from '@/components/layout/Layout';
import { EditableField } from '@/components/ui/EditableField';

const ClinicianDetails = () => {
  const { clinicianId } = useParams<{ clinicianId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { userId, userRole, authInitialized } = useUser();
  
  const [clinicianData, setClinicianData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showAccessDeniedError, setShowAccessDeniedError] = useState(false);
  
  // Circuit breaker
  const fetchAttemptCount = useRef(0);

  // Stabilized handlers with empty dependency arrays
  const handleAccessDenied = useCallback(() => {
    setShowAccessDeniedError(true);
    setIsLoading(false);
  }, []);

  const performFetch = useCallback(async (params: { clinicianId: string; userId: string; userRole: string }) => {
    console.log(`[ClinicianDetails] Fetch attempt ${fetchAttemptCount.current + 1}/3 for ID: ${params.clinicianId}`);
    
    try {
      setIsLoading(true);
      
      // Access control check
      if (params.userRole === 'client') {
        handleAccessDenied();
        return;
      }

      if (params.userRole === 'clinician' && params.userId !== params.clinicianId) {
        handleAccessDenied();
        return;
      }

      const { data, error } = await supabase
        .from('clinicians')
        .select('*')
        .eq('id', params.clinicianId)
        .single();

      if (error) {
        throw error;
      }

      if (!data) {
        const toastInstance = useToast();
        toastInstance.toast({
          title: "Error",
          description: "Clinician not found.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      console.log('Fetched clinician data successfully');
      setClinicianData(data);
      fetchAttemptCount.current = 0; // Reset on success
    } catch (error) {
      console.error('Error fetching clinician data:', error);
      const toastInstance = useToast();
      toastInstance.toast({
        title: "Error loading profile",
        description: error instanceof Error ? error.message : "Failed to load clinician profile.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, []); // Empty dependency array - no unstable dependencies

  // Main effect with only stable dependencies
  useEffect(() => {
    console.log(`[ClinicianDetails] useEffect triggered`, {
      clinicianId,
      userId,
      userRole,
      authInitialized,
      fetchCount: fetchAttemptCount.current
    });

    if (!authInitialized || !clinicianId || !userId || !userRole) return;

    // Circuit breaker check inside effect
    if (fetchAttemptCount.current >= 3) {
      console.error("Max fetch attempts reached for ClinicianDetails");
      setIsLoading(false);
      return;
    }

    fetchAttemptCount.current++;
    performFetch({ clinicianId, userId, userRole });

  }, [clinicianId, userId, userRole, authInitialized, performFetch]); // Only stable primitive dependencies

  // Route validation effect
  useEffect(() => {
    const currentPath = window.location.pathname;
    const expectedPath = `/clinicians/${clinicianId}`;
    const routeMatch = currentPath === expectedPath;

    console.log(`[ClinicianDetails] Route state validation:`, {
      currentPath,
      clinicianId,
      expectedPath,
      routeMatch
    });

    if (!routeMatch && clinicianId) {
      const navInstance = useNavigate();
      navInstance(expectedPath, { replace: true });
    }
  }, [clinicianId]);

  // Update clinician field function
  const updateClinicianField = async (field: string, value: string | string[]) => {
    try {
      const { error } = await supabase
        .from('clinicians')
        .update({ [field]: value })
        .eq('id', clinicianId);

      if (error) throw error;

      // Update local state
      setClinicianData((prev: any) => ({
        ...prev,
        [field]: value
      }));

      const toastInstance = useToast();
      toastInstance.toast({
        title: "Success",
        description: "Profile updated successfully.",
      });
    } catch (error) {
      console.error('Error updating clinician field:', error);
      const toastInstance = useToast();
      toastInstance.toast({
        title: "Error",
        description: "Failed to update profile.",
        variant: "destructive",
      });
      throw error;
    }
  };

  if (showAccessDeniedError) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-full">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="text-center text-red-600">Access Denied</CardTitle>
              <CardDescription className="text-center">
                You don't have permission to view this clinician's profile.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button onClick={() => navigate('/dashboard')} variant="outline">
                Return to Dashboard
              </Button>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  if (isLoading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-full">
          <p>Loading clinician profile...</p>
        </div>
      </Layout>
    );
  }

  if (!clinicianData) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-full">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="text-center">Profile Not Found</CardTitle>
              <CardDescription className="text-center">
                The requested clinician profile could not be found.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button onClick={() => navigate('/dashboard')} variant="outline">
                Return to Dashboard
              </Button>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  const getInitials = (firstName?: string, lastName?: string) => {
    const first = firstName?.charAt(0)?.toUpperCase() || '';
    const last = lastName?.charAt(0)?.toUpperCase() || '';
    return first + last || 'CL';
  };

  const formatAvailability = (dayData: any, dayName: string) => {
    const slots = [];
    for (let i = 1; i <= 3; i++) {
      const start = dayData[`clinician_availability_start_${dayName.toLowerCase()}_${i}`];
      const end = dayData[`clinician_availability_end_${dayName.toLowerCase()}_${i}`];
      if (start && end) {
        slots.push(`${start} - ${end}`);
      }
    }
    return slots.length > 0 ? slots.join(', ') : 'Not available';
  };

  const statusOptions = ['New', 'Active', 'Inactive', 'Pending'];
  const licenseTypeOptions = ['LCSW', 'LPC', 'LMFT', 'LMHC', 'PhD', 'PsyD', 'MD'];
  const treatmentApproaches = [
    'Cognitive Behavioral Therapy (CBT)',
    'Dialectical Behavior Therapy (DBT)',
    'Eye Movement Desensitization and Reprocessing (EMDR)',
    'Acceptance and Commitment Therapy (ACT)',
    'Psychodynamic Therapy',
    'Humanistic Therapy',
    'Family Systems Therapy',
    'Trauma-Informed Care'
  ];

  return (
    <Layout>
      <div className="container mx-auto py-6 space-y-6">
        {/* Header Section */}
        <div className="flex items-start gap-6">
          <Avatar className="h-24 w-24">
            {clinicianData.clinician_image_url ? (
              <AvatarImage 
                src={clinicianData.clinician_image_url} 
                alt={`${clinicianData.clinician_first_name} ${clinicianData.clinician_last_name}`}
              />
            ) : null}
            <AvatarFallback className="text-2xl">
              {getInitials(clinicianData.clinician_first_name, clinicianData.clinician_last_name)}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1">
            <h1 className="text-3xl font-bold">
              {clinicianData.clinician_first_name} {clinicianData.clinician_last_name}
            </h1>
            {clinicianData.clinician_professional_name && (
              <p className="text-lg text-muted-foreground">
                {clinicianData.clinician_professional_name}
              </p>
            )}
            <div className="flex items-center gap-2 mt-2">
              <Badge variant={clinicianData.clinician_status === 'Active' ? 'default' : 'secondary'}>
                {clinicianData.clinician_status || 'New'}
              </Badge>
              {clinicianData.clinician_type && (
                <Badge variant="outline">{clinicianData.clinician_type}</Badge>
              )}
            </div>
          </div>
        </div>

        <Separator />

        {/* Details Tabs */}
        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="contact">Contact</TabsTrigger>
            <TabsTrigger value="professional">Professional</TabsTrigger>
            <TabsTrigger value="availability">Availability</TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <EditableField
                    label="First Name"
                    value={clinicianData.clinician_first_name}
                    onSave={(value) => updateClinicianField('clinician_first_name', value as string)}
                    placeholder="Enter first name"
                  />
                  <EditableField
                    label="Last Name"
                    value={clinicianData.clinician_last_name}
                    onSave={(value) => updateClinicianField('clinician_last_name', value as string)}
                    placeholder="Enter last name"
                  />
                  <EditableField
                    label="Professional Name"
                    value={clinicianData.clinician_professional_name}
                    onSave={(value) => updateClinicianField('clinician_professional_name', value as string)}
                    placeholder="Enter professional name"
                  />
                  <EditableField
                    label="Status"
                    value={clinicianData.clinician_status}
                    onSave={(value) => updateClinicianField('clinician_status', value as string)}
                    type="select"
                    options={statusOptions}
                  />
                </div>
                
                <EditableField
                  label="Bio"
                  value={clinicianData.clinician_bio}
                  onSave={(value) => updateClinicianField('clinician_bio', value as string)}
                  type="textarea"
                  placeholder="Enter professional bio"
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="contact" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  <EditableField
                    label="Email"
                    value={clinicianData.clinician_email}
                    onSave={(value) => updateClinicianField('clinician_email', value as string)}
                    placeholder="Enter email address"
                  />
                  <EditableField
                    label="Phone"
                    value={clinicianData.clinician_phone}
                    onSave={(value) => updateClinicianField('clinician_phone', value as string)}
                    placeholder="Enter phone number"
                  />
                  <EditableField
                    label="Time Zone"
                    value={clinicianData.clinician_time_zone}
                    onSave={(value) => updateClinicianField('clinician_time_zone', value as string)}
                    placeholder="Enter time zone"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="professional" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Professional Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <EditableField
                    label="NPI Number"
                    value={clinicianData.clinician_npi_number}
                    onSave={(value) => updateClinicianField('clinician_npi_number', value as string)}
                    placeholder="Enter NPI number"
                  />
                  <EditableField
                    label="Taxonomy Code"
                    value={clinicianData.clinician_taxonomy_code}
                    onSave={(value) => updateClinicianField('clinician_taxonomy_code', value as string)}
                    placeholder="Enter taxonomy code"
                  />
                  <EditableField
                    label="License Type"
                    value={clinicianData.clinician_license_type}
                    onSave={(value) => updateClinicianField('clinician_license_type', value as string)}
                    type="select"
                    options={licenseTypeOptions}
                  />
                  <EditableField
                    label="Accepting New Clients"
                    value={clinicianData.clinician_accepting_new_clients}
                    onSave={(value) => updateClinicianField('clinician_accepting_new_clients', value as string)}
                    type="select"
                    options={['Yes', 'No', 'Waitlist']}
                  />
                </div>

                {clinicianData.clinician_licensed_states && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Licensed States</label>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {clinicianData.clinician_licensed_states.map((state: string) => (
                        <Badge key={state} variant="outline" className="text-xs">
                          {state}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {clinicianData.clinician_treatment_approaches && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Treatment Approaches</label>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {clinicianData.clinician_treatment_approaches.map((approach: string) => (
                        <Badge key={approach} variant="outline" className="text-xs">
                          {approach}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="availability" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Weekly Availability</CardTitle>
                <CardDescription>Availability is managed through the calendar system</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => (
                    <div key={day} className="flex justify-between items-center py-2 border-b last:border-b-0">
                      <div className="font-medium text-sm">{day}</div>
                      <div className="text-sm text-muted-foreground">
                        {formatAvailability(clinicianData, day)}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default ClinicianDetails;
