import React, { useState, useEffect, useCallback } from 'react';
import Layout from '@/components/layout/Layout';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { updateClientProfile } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import MyProfile from '@/components/patient/MyProfile';
import { useAuth } from '@/context/AuthProvider';
import { timezoneOptions } from '@/utils/timezoneOptions';

const PatientProfile: React.FC = () => {
  const { clientProfile, isLoading: authLoading, refreshUserData, userId } = useAuth();
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const genderOptions = ['Male', 'Female', 'Non-Binary', 'Other', 'Prefer not to say'];
  const genderIdentityOptions = ['Male', 'Female', 'Trans Man', 'Trans Woman', 'Non-Binary', 'Other', 'Prefer not to say'];
  const stateOptions = [
    'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut',
    'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 'Kansas',
    'Kentucky', 'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota',
    'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey',
    'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon',
    'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota', 'Tennessee', 'Texas',
    'Utah', 'Vermont', 'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming'
  ];
  
  // Use the proper timezone options with IANA identifiers
  const timeZoneOptionsForProfile = timezoneOptions.map(tz => tz.value);

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
      timeZone: ''
    }
  });

  const resetFormWithProfileData = useCallback(() => {
    if (clientProfile) {
      let age = '';
      if (clientProfile.client_date_of_birth) {
        const dob = new Date(clientProfile.client_date_of_birth);
        const today = new Date();
        age = String(today.getFullYear() - dob.getFullYear());
      }

      let formattedDob = '';
      if (clientProfile.client_date_of_birth) {
        const dob = new Date(clientProfile.client_date_of_birth);
        formattedDob = dob.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
      }

      form.reset({
        firstName: clientProfile.client_first_name || '',
        lastName: clientProfile.client_last_name || '',
        preferredName: clientProfile.client_preferred_name || '',
        email: clientProfile.client_email || '',
        phone: clientProfile.client_phone || '',
        dateOfBirth: formattedDob,
        age: age,
        gender: clientProfile.client_gender || '',
        genderIdentity: clientProfile.client_gender_identity || '',
        state: clientProfile.client_state || '',
        timeZone: clientProfile.client_time_zone || 'America/New_York'
      });
    }
  }, [clientProfile, form]);

  useEffect(() => {
    if (!authLoading && !userId) {
      toast({
        title: "Authentication required",
        description: "Please sign in to view your profile",
        variant: "destructive"
      });
      navigate('/login');
      return;
    }

    if (!authLoading && !clientProfile) {
      toast({
        title: "Profile not found",
        description: "We couldn't find your client profile",
        variant: "destructive"
      });
    }
    
    resetFormWithProfileData();
  }, [clientProfile, authLoading, userId, navigate, toast, resetFormWithProfileData]);

  const handleSaveProfile = async () => {
    if (!clientProfile) {
      console.error("Cannot save: No client data available");
      toast({
        title: "Error",
        description: "Unable to save profile: No client data available",
        variant: "destructive"
      });
      return;
    }

    console.log("Starting save process for client ID:", clientProfile.id);
    setIsSaving(true);

    try {
      const formValues = form.getValues();
      console.log("Form values to save:", formValues);

      const updates = {
        client_preferred_name: formValues.preferredName,
        client_phone: formValues.phone,
        client_gender: formValues.gender,
        client_gender_identity: formValues.genderIdentity,
        client_state: formValues.state,
        client_time_zone: formValues.timeZone
      };

      console.log("Sending updates to database:", updates);
      const { success, error } = await updateClientProfile(clientProfile.id, updates);

      if (success) {
        console.log("Profile update successful");
        toast({
          title: "Success",
          description: "Your profile has been updated successfully",
        });
        setIsEditing(false);
        await refreshUserData();
      } else {
        console.error("Profile update failed:", error);
        throw new Error("Failed to update profile: " + JSON.stringify(error));
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
    resetFormWithProfileData();
  };

  return (
    <Layout>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">My Profile</h1>
        </div>

        <MyProfile 
          clientData={clientProfile}
          loading={authLoading}
          isEditing={isEditing}
          setIsEditing={setIsEditing}
          form={form}
          isSaving={isSaving}
          handleSaveProfile={handleSaveProfile}
          handleCancelEdit={handleCancelEdit}
          genderOptions={genderOptions}
          genderIdentityOptions={genderIdentityOptions}
          stateOptions={stateOptions}
          timeZoneOptions={timeZoneOptionsForProfile}
        />
      </div>
    </Layout>
  );
};

export default PatientProfile;
