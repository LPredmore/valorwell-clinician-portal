import React, { useState, useEffect } from 'react';
import Layout from '@/components/layout/Layout';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { LayoutDashboard, User, Clock3, Shield, FileText } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser, getClientByUserId, updateClientProfile, getClinicianNameById, formatDateForDB, fetchDocumentAssignments } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

// Import the tab components
import MyPortal from '@/components/patient/MyPortal';
import MyProfile from '@/components/patient/MyProfile';
import MyAppointments from '@/components/patient/MyAppointments';
import MyInsurance from '@/components/patient/MyInsurance';
import MyDocuments from '@/components/patient/MyDocuments';
// Import timezoneOptions and TimeZoneService
import { timezoneOptions, formatTimezoneForDisplay } from '@/utils/timezoneOptions';
import { TimeZoneService } from '@/utils/timeZoneService';

const PatientDashboard: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [clientData, setClientData] = useState<any>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [clinicianName, setClinicianName] = useState<string | null>(null);
  const [pendingDocuments, setPendingDocuments] = useState<number>(0);
  
  const {
    toast
  } = useToast();
  const navigate = useNavigate();
  const genderOptions = ['Male', 'Female', 'Non-Binary', 'Other', 'Prefer not to say'];
  const genderIdentityOptions = ['Male', 'Female', 'Trans Man', 'Trans Woman', 'Non-Binary', 'Other', 'Prefer not to say'];
  const stateOptions = ['Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey', 'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming'];
  
  // Create timeZoneOptions with the correct type annotation for MyProfile component
  // This creates an array of strings from the imported timezoneOptions objects
  const timeZoneOptions: string[] = timezoneOptions.map(tz => `${tz.label} (${tz.value})`);
  
  const insuranceTypes = ['PPO', 'HMO', 'EPO', 'POS', 'HDHP', 'Medicare', 'Medicaid', 'Other'];
  const relationshipTypes = ['Self', 'Spouse', 'Child', 'Other'];

  const form = useForm({
    defaultValues: {
      firstName: '',
      lastName: '',
      preferredName: '',
      email: '',
      phone: '',
      dateOfBirth: '',
      age: '',
      gender: '',
      genderIdentity: '',
      state: '',
      timeZone: '',
      client_insurance_company_primary: '',
      client_insurance_type_primary: '',
      client_policy_number_primary: '',
      client_group_number_primary: '',
      client_subscriber_name_primary: '',
      client_subscriber_relationship_primary: '',
      client_subscriber_dob_primary: '',
      client_insurance_company_secondary: '',
      client_insurance_type_secondary: '',
      client_policy_number_secondary: '',
      client_group_number_secondary: '',
      client_subscriber_name_secondary: '',
      client_subscriber_relationship_secondary: '',
      client_subscriber_dob_secondary: '',
      client_insurance_company_tertiary: '',
      client_insurance_type_tertiary: '',
      client_policy_number_tertiary: '',
      client_group_number_tertiary: '',
      client_subscriber_name_tertiary: '',
      client_subscriber_relationship_tertiary: '',
      client_subscriber_dob_tertiary: '',
      client_champva: '',
      client_tricare_beneficiary_category: '',
      client_tricare_sponsor_name: '',
      client_tricare_sponsor_branch: '',
      client_tricare_sponsor_id: '',
      client_tricare_plan: '',
      client_tricare_region: '',
      client_tricare_policy_id: '',
      client_tricare_has_referral: '',
      client_tricare_referral_number: ''
    }
  });

  const fetchClinicianName = async (clinicianId: string) => {
    if (!clinicianId) return;
    try {
      const name = await getClinicianNameById(clinicianId);
      if (name) {
        console.log("Retrieved clinician name:", name);
        setClinicianName(name);
      } else {
        console.log("No clinician name found for ID:", clinicianId);
      }
    } catch (error) {
      console.error("Error fetching clinician name:", error);
    }
  };

  const fetchClientData = async () => {
    setLoading(true);
    try {
      const user = await getCurrentUser();
      if (!user) {
        toast({
          title: "Authentication required",
          description: "Please sign in to view your profile",
          variant: "destructive"
        });
        navigate('/login');
        return;
      }
      console.log("Current user:", user);
      const client = await getClientByUserId(user.id);
      console.log("Retrieved client data:", client);
      if (client) {
        setClientData(client);
        if (client.client_assigned_therapist) {
          fetchClinicianName(client.client_assigned_therapist);
        }
        
        // Check for pending document assignments
        const docAssignments = await fetchDocumentAssignments(user.id);
        const pending = docAssignments.filter(doc => 
          doc.status === 'not_started' || doc.status === 'in_progress'
        ).length;
        setPendingDocuments(pending);
        
        let age = '';
        if (client.client_date_of_birth) {
          const dob = new Date(client.client_date_of_birth);
          const today = new Date();
          age = String(today.getFullYear() - dob.getFullYear());
        }
        let formattedDob = '';
        if (client.client_date_of_birth) {
          const dob = new Date(client.client_date_of_birth);
          formattedDob = dob.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          });
        }
        
        // Make sure we have a proper IANA timezone format stored
        let clientTimeZone = client.client_time_zone || '';
        if (clientTimeZone) {
          clientTimeZone = TimeZoneService.ensureIANATimeZone(clientTimeZone);
        }
        
        form.reset({
          firstName: client.client_first_name || '',
          lastName: client.client_last_name || '',
          preferredName: client.client_preferred_name || '',
          email: client.client_email || '',
          phone: client.client_phone || '',
          dateOfBirth: formattedDob,
          age: age,
          gender: client.client_gender || '',
          genderIdentity: client.client_gender_identity || '',
          state: client.client_state || '',
          timeZone: clientTimeZone ? formatTimezoneForDisplay(clientTimeZone) : '',
          client_insurance_company_primary: client.client_insurance_company_primary || '',
          client_insurance_type_primary: client.client_insurance_type_primary || '',
          client_policy_number_primary: client.client_policy_number_primary || '',
          client_group_number_primary: client.client_group_number_primary || '',
          client_subscriber_name_primary: client.client_subscriber_name_primary || '',
          client_subscriber_relationship_primary: client.client_subscriber_relationship_primary || '',
          client_subscriber_dob_primary: client.client_subscriber_dob_primary || '',
          client_insurance_company_secondary: client.client_insurance_company_secondary || '',
          client_insurance_type_secondary: client.client_insurance_type_secondary || '',
          client_policy_number_secondary: client.client_policy_number_secondary || '',
          client_group_number_secondary: client.client_group_number_secondary || '',
          client_subscriber_name_secondary: client.client_subscriber_name_secondary || '',
          client_subscriber_relationship_secondary: client.client_subscriber_relationship_secondary || '',
          client_subscriber_dob_secondary: client.client_subscriber_dob_secondary || '',
          client_insurance_company_tertiary: client.client_insurance_company_tertiary || '',
          client_insurance_type_tertiary: client.client_insurance_type_tertiary || '',
          client_policy_number_tertiary: client.client_policy_number_tertiary || '',
          client_group_number_tertiary: client.client_group_number_tertiary || '',
          client_subscriber_name_tertiary: client.client_subscriber_name_tertiary || '',
          client_subscriber_relationship_tertiary: client.client_subscriber_relationship_tertiary || '',
          client_subscriber_dob_tertiary: client.client_subscriber_dob_tertiary || '',
          client_champva: client.client_champva || '',
          client_tricare_beneficiary_category: client.client_tricare_beneficiary_category || '',
          client_tricare_sponsor_name: client.client_tricare_sponsor_name || '',
          client_tricare_sponsor_branch: client.client_tricare_sponsor_branch || '',
          client_tricare_sponsor_id: client.client_tricare_sponsor_id || '',
          client_tricare_plan: client.client_tricare_plan || '',
          client_tricare_region: client.client_tricare_region || '',
          client_tricare_policy_id: client.client_tricare_policy_id || '',
          client_tricare_has_referral: client.client_tricare_has_referral || '',
          client_tricare_referral_number: client.client_tricare_referral_number || ''
        });
      } else {
        toast({
          title: "Profile not found",
          description: "We couldn't find your client profile",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error fetching client data:", error);
      toast({
        title: "Error",
        description: "Failed to load your profile data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!clientData) {
      console.error("Cannot save: No client data available");
      toast({
        title: "Error",
        description: "Unable to save profile: No client data available",
        variant: "destructive"
      });
      return;
    }
    console.log("Starting save profile process for client ID:", clientData.id);
    setIsSaving(true);
    try {
      const formValues = form.getValues();
      console.log("Form values to save:", formValues);
      
      // Extract the IANA timezone from the combined format
      let timeZoneValue = formValues.timeZone;
      if (timeZoneValue) {
        // Extract the IANA timezone from the format "Label (IANA)"
        const match = timeZoneValue.match(/\(([^)]+)\)$/);
        if (match && match[1]) {
          timeZoneValue = match[1];
        }
        
        // Ensure it's a valid IANA timezone
        timeZoneValue = TimeZoneService.ensureIANATimeZone(timeZoneValue);
      }
      
      const updates = {
        client_preferred_name: formValues.preferredName,
        client_phone: formValues.phone,
        client_gender: formValues.gender,
        client_gender_identity: formValues.genderIdentity,
        client_state: formValues.state,
        client_time_zone: timeZoneValue,
        client_insurance_company_primary: formValues.client_insurance_company_primary,
        client_insurance_type_primary: formValues.client_insurance_type_primary,
        client_policy_number_primary: formValues.client_policy_number_primary,
        client_group_number_primary: formValues.client_group_number_primary,
        client_subscriber_name_primary: formValues.client_subscriber_name_primary,
        client_subscriber_relationship_primary: formValues.client_subscriber_relationship_primary,
        client_subscriber_dob_primary: formValues.client_subscriber_dob_primary ? 
          formatDateForDB(new Date(formValues.client_subscriber_dob_primary)) : null,
        
        client_insurance_company_secondary: formValues.client_insurance_company_secondary,
        client_insurance_type_secondary: formValues.client_insurance_type_secondary,
        client_policy_number_secondary: formValues.client_policy_number_secondary,
        client_group_number_secondary: formValues.client_group_number_secondary,
        client_subscriber_name_secondary: formValues.client_subscriber_name_secondary,
        client_subscriber_relationship_secondary: formValues.client_subscriber_relationship_secondary,
        client_subscriber_dob_secondary: formValues.client_subscriber_dob_secondary ? 
          formatDateForDB(new Date(formValues.client_subscriber_dob_secondary)) : null,
        
        client_insurance_company_tertiary: formValues.client_insurance_company_tertiary,
        client_insurance_type_tertiary: formValues.client_insurance_type_tertiary,
        client_policy_number_tertiary: formValues.client_policy_number_tertiary,
        client_group_number_tertiary: formValues.client_group_number_tertiary,
        client_subscriber_name_tertiary: formValues.client_subscriber_name_tertiary,
        client_subscriber_relationship_tertiary: formValues.client_subscriber_relationship_tertiary,
        client_subscriber_dob_tertiary: formValues.client_subscriber_dob_tertiary ? 
          formatDateForDB(new Date(formValues.client_subscriber_dob_tertiary)) : null,
        
        client_champva: formValues.client_champva,
        client_tricare_beneficiary_category: formValues.client_tricare_beneficiary_category,
        client_tricare_sponsor_name: formValues.client_tricare_sponsor_name,
        client_tricare_sponsor_branch: formValues.client_tricare_sponsor_branch,
        client_tricare_sponsor_id: formValues.client_tricare_sponsor_id,
        client_tricare_plan: formValues.client_tricare_plan,
        client_tricare_region: formValues.client_tricare_region,
        client_tricare_policy_id: formValues.client_tricare_policy_id,
        client_tricare_has_referral: formValues.client_tricare_has_referral,
        client_tricare_referral_number: formValues.client_tricare_referral_number
      };
      
      console.log("Sending updates to database:", updates);
      const result = await updateClientProfile(clientData.id, updates);
      if (result.success) {
        console.log("Profile update successful");
        toast({
          title: "Success",
          description: "Your profile has been updated successfully"
        });
        setIsEditing(false);
        fetchClientData();
      } else {
        console.error("Profile update failed:", result.error);
        throw new Error("Failed to update profile: " + JSON.stringify(result.error));
      }
    } catch (error) {
      console.error("Error saving profile:", error);
      toast({
        title: "Error",
        description: "Failed to save your profile",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    console.log("Edit cancelled");
    setIsEditing(false);
    fetchClientData();
  };

  const handleNavigateToDocuments = () => {
    navigate('/patient-documents');
  };

  useEffect(() => {
    console.log("PatientDashboard component mounted");
    fetchClientData();
  }, []);

  const upcomingAppointments = [];

  return <Layout>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Patient Portal</h1>
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-valorwell-600" />
            
          </div>
        </div>

        <Tabs defaultValue="dashboard" className="w-full">
          <TabsList className="mb-6 w-full justify-start border-b pb-0 pt-0">
            <TabsTrigger value="dashboard" className="gap-2 rounded-b-none rounded-t-lg data-[state=active]:border-b-2 data-[state=active]:border-valorwell-600">
              <LayoutDashboard className="h-4 w-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="profile" className="gap-2 rounded-b-none rounded-t-lg data-[state=active]:border-b-2 data-[state=active]:border-valorwell-600">
              <User className="h-4 w-4" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="pastAppointments" className="gap-2 rounded-b-none rounded-t-lg data-[state=active]:border-b-2 data-[state=active]:border-valorwell-600">
              <Clock3 className="h-4 w-4" />
              Past Appointments
            </TabsTrigger>
            <TabsTrigger value="documents" className="gap-2 rounded-b-none rounded-t-lg data-[state=active]:border-b-2 data-[state=active]:border-valorwell-600">
              <FileText className="h-4 w-4" />
              Documents
              {pendingDocuments > 0 && (
                <span className="ml-1 rounded-full bg-valorwell-600 px-2 py-0.5 text-xs text-white">
                  {pendingDocuments}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="insurance" className="gap-2 rounded-b-none rounded-t-lg data-[state=active]:border-b-2 data-[state=active]:border-valorwell-600">
              <Shield className="h-4 w-4" />
              Insurance
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="mt-0">
            <MyPortal upcomingAppointments={upcomingAppointments} clientData={clientData} clinicianName={clinicianName} loading={loading} />
          </TabsContent>

          <TabsContent value="profile" className="mt-0">
            <MyProfile clientData={clientData} loading={loading} isEditing={isEditing} setIsEditing={setIsEditing} form={form} isSaving={isSaving} handleSaveProfile={handleSaveProfile} handleCancelEdit={handleCancelEdit} genderOptions={genderOptions} genderIdentityOptions={genderIdentityOptions} stateOptions={stateOptions} timeZoneOptions={timeZoneOptions} />
          </TabsContent>

          <TabsContent value="pastAppointments" className="mt-0">
            <MyAppointments />
          </TabsContent>
          
          <TabsContent value="documents" className="mt-0">
            <div className="flex flex-col space-y-4">
              <MyDocuments clientId={clientData?.id} />
              <div className="flex justify-end mt-4">
                <button
                  onClick={handleNavigateToDocuments}
                  className="px-4 py-2 bg-valorwell-600 text-white rounded-md hover:bg-valorwell-700 transition-colors"
                >
                  View All Documents & Forms
                </button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="insurance" className="mt-0">
            <MyInsurance clientData={clientData} loading={loading} isEditing={isEditing} setIsEditing={setIsEditing} form={form} isSaving={isSaving} handleSaveProfile={handleSaveProfile} handleCancelEdit={handleCancelEdit} insuranceTypes={insuranceTypes} relationshipTypes={relationshipTypes} />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>;
};

export default PatientDashboard;
