import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Check, ArrowLeft, ArrowRight } from 'lucide-react';
import Layout from '@/components/layout/Layout';
import { supabase } from '@/integrations/supabase/client';
import FormFieldWrapper from '@/components/ui/FormFieldWrapper';
import { useToast } from '@/hooks/use-toast';
import { timezoneOptions } from '@/utils/timezoneOptions';
import { DateField } from '@/components/ui/DateField';
import SignupChampva from '@/components/signup/SignupChampva';
import SignupTricare from '@/components/signup/SignupTricare';
import SignupVaCcn from '@/components/signup/SignupVaCcn';
import SignupVeteran from '@/components/signup/SignupVeteran';
import SignupNotAVeteran from '@/components/signup/SignupNotAVeteran';
import AdditionalInsurance from '@/components/signup/AdditionalInsurance';
import MoreAdditionalInsurance from '@/components/signup/MoreAdditionalInsurance';
import SignupLast from '@/components/signup/SignupLast';
import { useAuth } from '@/context/AuthProvider'; // FIX: Replaced useUser with useAuth
import { parseDateString, calculateAge, formatDateForDB } from '@/utils/dateUtils';

type ClientFormData = {
  client_first_name?: string;
  client_last_name?: string;
  client_preferred_name?: string;
  client_email?: string;
  client_phone?: string;
  client_relationship?: string;
  client_date_of_birth?: Date | null;
  client_age?: number | null;
  client_gender?: string;
  client_gender_identity?: string;
  client_state?: string;
  client_time_zone?: string;
  client_vacoverage?: string;
  client_champva?: string;
  client_other_insurance?: string;
  client_champva_agreement?: boolean;
  client_mental_health_referral?: string;
  client_branchOS?: string;
  client_recentdischarge?: Date | null; // Type is Date | null for form usage
  client_disabilityrating?: string;
  client_tricare_beneficiary_category?: string;
  client_tricare_sponsor_name?: string;
  client_tricare_sponsor_branch?: string;
  client_tricare_sponsor_id?: string;
  client_tricare_plan?: string;
  client_tricare_region?: string;
  client_tricare_policy_id?: string;
  client_tricare_has_referral?: string;
  client_tricare_referral_number?: string;
  client_tricare_insurance_agreement?: boolean;
  client_veteran_relationship?: string;
  client_situation_explanation?: string;
  client_insurance_company_primary?: string;
  client_insurance_type_primary?: string;
  client_subscriber_name_primary?: string;
  client_subscriber_relationship_primary?: string;
  client_subscriber_dob_primary?: Date | null;
  client_group_number_primary?: string;
  client_policy_number_primary?: string;
  client_insurance_company_secondary?: string;
  client_insurance_type_secondary?: string;
  client_subscriber_name_secondary?: string;
  client_subscriber_relationship_secondary?: string;
  client_subscriber_dob_secondary?: Date | null;
  client_group_number_secondary?: string;
  client_policy_number_secondary?: string;
  hasMoreInsurance?: string;
  client_has_even_more_insurance?: string;
  client_self_goal?: string;
  client_referral_source?: string;
};

const profileStep1Schema = z.object({
  client_first_name: z.string().min(1, "First name is required"),
  client_last_name: z.string().min(1, "Last name is required"),
  client_preferred_name: z.string().optional().nullable(),
  client_email: z.string().email("Valid email is required"),
  client_phone: z.string().min(10, "Valid phone number is required"),
  client_relationship: z.string().min(1, "Relationship is required"),
});

const profileStep2Schema = z.object({
  client_date_of_birth: z.date({
    required_error: "Date of birth is required",
  }).nullable(),
  client_gender: z.string().min(1, "Birth gender is required"),
  client_gender_identity: z.string().min(1, "Gender identity is required"),
  client_state: z.string().min(1, "State is required"),
  client_time_zone: z.string().min(1, "Time zone is required"),
  client_vacoverage: z.string().min(1, "VA coverage information is required"),
});

type ProfileFormValues = z.infer<typeof profileStep1Schema> &
  Partial<z.infer<typeof profileStep2Schema>> & {
    client_age?: number | null;
    client_champva?: string;
    client_other_insurance?: string;
    client_champva_agreement?: boolean;
    client_mental_health_referral?: string;
    client_branchOS?: string;
    client_recentdischarge?: Date | null;
    client_disabilityrating?: string;
    client_tricare_beneficiary_category?: string;
    client_tricare_sponsor_name?: string;
    client_tricare_sponsor_branch?: string;
    client_tricare_sponsor_id?: string;
    client_tricare_plan?: string;
    client_tricare_region?: string;
    client_tricare_policy_id?: string;
    client_tricare_has_referral?: string;
    client_tricare_referral_number?: string;
    client_tricare_insurance_agreement?: boolean;
    client_veteran_relationship?: string;
    client_situation_explanation?: string;
    client_insurance_company_primary?: string;
    client_insurance_type_primary?: string;
    client_subscriber_name_primary?: string;
    client_subscriber_relationship_primary?: string;
    client_subscriber_dob_primary?: Date | null;
    client_group_number_primary?: string;
    client_policy_number_primary?: string;
    client_insurance_company_secondary?: string;
    client_insurance_type_secondary?: string;
    client_subscriber_name_secondary?: string;
    client_subscriber_relationship_secondary?: string;
    client_subscriber_dob_secondary?: Date | null;
    client_group_number_secondary?: string;
    client_policy_number_secondary?: string;
    hasMoreInsurance?: string;
    client_has_even_more_insurance?: string;
    client_self_goal?: string;
    client_referral_source?: string;
  };

const ProfileSetup = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, isLoading: isUserContextLoading, authInitialized, userId, refreshUserData, clientProfile } = useAuth(); // FIX: useAuth hook instead of useUser

  const [clientId, setClientId] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [navigationHistory, setNavigationHistory] = useState<number[]>([1]);
  const [otherInsurance, setOtherInsurance] = useState<string>('');
  const [isFormLoading, setIsFormLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [loadingTimeout, setLoadingTimeout] = useState(false);
  const initialDataLoadedForUser = useRef<string | null>(null);
  
  // Add timeout mechanism to prevent indefinite loading
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    if ((isUserContextLoading || !authInitialized) && !authError) {
      console.log("[ProfileSetup] Starting loading timeout check");
      timeoutId = setTimeout(() => {
        console.log("[ProfileSetup] Loading timeout reached after 10 seconds");
        setLoadingTimeout(true);
        toast({
          title: "Loading Delay",
          description: "User data is taking longer than expected to load.",
          variant: "default"
        });
      }, 10000); // 10 seconds timeout
      
      // Add a second timeout for critical failure
      const criticalTimeoutId = setTimeout(() => {
        console.log("[ProfileSetup] Critical loading timeout reached after 30 seconds");
        setAuthError("Authentication process is taking too long. Please refresh the page.");
        toast({
          title: "Authentication Error",
          description: "Failed to load user data. Please refresh the page.",
          variant: "destructive"
        });
      }, 30000); // 30 seconds for critical timeout
      
      return () => {
        clearTimeout(timeoutId);
        clearTimeout(criticalTimeoutId);
      };
    }
    
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [isUserContextLoading, authInitialized, authError, toast]);

  useEffect(() => {
    console.log('[ProfileSetup] Component Mounted');
    return () => {
      console.log('[ProfileSetup] Component Will Unmount');
    };
  }, []);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(
      currentStep === 1
        ? profileStep1Schema
        : currentStep === 2
        ? profileStep2Schema
        : z.object({}) 
    ),
    mode: "onChange",
    defaultValues: { 
        client_first_name: '', client_preferred_name: '', client_last_name: '',
        client_email: '', client_phone: '', client_relationship: '',
        client_date_of_birth: null, client_age: null, client_gender: '', client_gender_identity: '',
        client_state: '', client_time_zone: '', client_vacoverage: '', client_champva: '',
        client_other_insurance: '', client_champva_agreement: false, client_mental_health_referral: '',
        client_branchOS: '', client_recentdischarge: null, client_disabilityrating: '',
        client_tricare_beneficiary_category: '', client_tricare_sponsor_name: '',
        client_tricare_sponsor_branch: '', client_tricare_sponsor_id: '', client_tricare_plan: '',
        client_tricare_region: '', client_tricare_policy_id: '', client_tricare_has_referral: '',
        client_tricare_referral_number: '', client_tricare_insurance_agreement: false,
        client_veteran_relationship: '', client_situation_explanation: '',
        client_insurance_company_primary: '', client_insurance_type_primary: '',
        client_subscriber_name_primary: '', client_subscriber_relationship_primary: '',
        client_subscriber_dob_primary: null, client_group_number_primary: '',
        client_policy_number_primary: '', client_insurance_company_secondary: '',
        client_insurance_type_secondary: '', client_subscriber_name_secondary: '',
        client_subscriber_relationship_secondary: '', client_subscriber_dob_secondary: null,
        client_group_number_secondary: '', client_policy_number_secondary: '',
        hasMoreInsurance: '', client_has_even_more_insurance: '',
        client_self_goal: '', client_referral_source: '',
    }
  });

  const handleImmediateSave = useCallback(async (fieldName: keyof ProfileFormValues, value: any) => {
    if (!clientId) {
      console.warn("[ProfileSetup] Cannot save immediately - no client ID available yet for field:", fieldName);
      return;
    }
    
    let valueToSave = value;
    
    // Handle Date objects specifically for consistent DB formatting
    if (fieldName.includes('date') || fieldName.includes('dob') || fieldName === 'client_recentdischarge') {
      console.log(`[ProfileSetup] Field ${String(fieldName)} identified as date field with value:`, value);
      valueToSave = formatDateForDB(value);
      console.log(`[ProfileSetup] Formatted date value for DB:`, valueToSave);
    } else if (value === null || value === undefined) {
      valueToSave = null;
    }
    
    console.log(`[ProfileSetup] Immediately saving field "${String(fieldName)}" with value:`, valueToSave);
    
    try {
      const { error } = await supabase
        .from('clients')
        .update({ [fieldName]: valueToSave })
        .eq('id', clientId);

      if (error) {
        console.error(`[ProfileSetup] Error saving ${String(fieldName)} immediately:`, error);
        toast({
          title: "Save Error",
          description: `Could not save your change for ${String(fieldName)}. Please try again.`,
          variant: "destructive"
        });
      } else {
        console.log(`[ProfileSetup] Successfully saved ${String(fieldName)} immediately.`);
        if (refreshUserData) {
            console.log(`[ProfileSetup] Refreshing UserContext after immediate save of ${String(fieldName)}`);
            await refreshUserData();
        }
      }
    } catch (error) {
      console.error(`[ProfileSetup] Exception in handleImmediateSave for ${String(fieldName)}:`, error);
    }
  }, [clientId, toast, refreshUserData]);

  useEffect(() => {
    if (isUserContextLoading || !authInitialized) {
      console.log('[ProfileSetup] Auth context is loading. Waiting to hydrate form.');
      setIsFormLoading(true);
      return;
    }

    if (!userId) {
      console.log('[ProfileSetup] No user ID found after auth initialization. Redirecting to login.');
      setIsFormLoading(false);
      setAuthError("User ID not available. Please log in again.");
      toast({
        title: "Authentication Error",
        description: "User ID not available. Please log in again.",
        variant: "destructive"
      });
      navigate('/login');
      return;
    }

    if (initialDataLoadedForUser.current === userId) {
      console.log(`[ProfileSetup] Form already hydrated for user ${userId}. Skipping.`);
      setIsFormLoading(false);
      return;
    }

    console.log('[ProfileSetup] Auth context loaded. Hydrating form from clientProfile.');
    if (clientProfile) {
      console.log('[ProfileSetup] clientProfile found, resetting form.', clientProfile);
      setClientId(clientProfile.id);

      const dob = parseDateString(clientProfile.client_date_of_birth);
      const calculatedClientAge = calculateAge(dob);
      const recentDischarge = parseDateString(clientProfile.client_recentdischarge);
      const subscriberDobPrimary = parseDateString(clientProfile.client_subscriber_dob_primary);
      const subscriberDobSecondary = parseDateString(clientProfile.client_subscriber_dob_secondary);

      const formValues: ProfileFormValues = {
        client_first_name: clientProfile.client_first_name || '',
        client_preferred_name: clientProfile.client_preferred_name || '',
        client_last_name: clientProfile.client_last_name || '',
        client_email: clientProfile.client_email || user?.email || '',
        client_phone: clientProfile.client_phone || '',
        client_relationship: clientProfile.client_relationship || '',
        client_date_of_birth: dob,
        client_age: clientProfile.client_age ?? calculatedClientAge,
        client_gender: clientProfile.client_gender || '',
        client_gender_identity: clientProfile.client_gender_identity || '',
        client_state: clientProfile.client_state || '',
        client_time_zone: clientProfile.client_time_zone || '',
        client_vacoverage: clientProfile.client_vacoverage || '',
        client_champva: clientProfile.client_champva || '',
        client_other_insurance: clientProfile.client_other_insurance || '',
        client_champva_agreement: clientProfile.client_champva_agreement || false,
        client_mental_health_referral: clientProfile.client_mental_health_referral || '',
        client_branchOS: clientProfile.client_branchOS || '',
        client_recentdischarge: recentDischarge,
        client_disabilityrating: clientProfile.client_disabilityrating || '',
        client_tricare_beneficiary_category: clientProfile.client_tricare_beneficiary_category || '',
        client_tricare_sponsor_name: clientProfile.client_tricare_sponsor_name || '',
        client_tricare_sponsor_branch: clientProfile.client_tricare_sponsor_branch || '',
        client_tricare_sponsor_id: clientProfile.client_tricare_sponsor_id || '',
        client_tricare_plan: clientProfile.client_tricare_plan || '',
        client_tricare_region: clientProfile.client_tricare_region || '',
        client_tricare_policy_id: clientProfile.client_tricare_policy_id || '',
        client_tricare_has_referral: clientProfile.client_tricare_has_referral || '',
        client_tricare_referral_number: clientProfile.client_tricare_referral_number || '',
        client_tricare_insurance_agreement: clientProfile.client_tricare_insurance_agreement || false,
        client_veteran_relationship: clientProfile.client_veteran_relationship || '',
        client_situation_explanation: clientProfile.client_situation_explanation || '',
        client_insurance_company_primary: clientProfile.client_insurance_company_primary || '',
        client_insurance_type_primary: clientProfile.client_insurance_type_primary || '',
        client_subscriber_name_primary: clientProfile.client_subscriber_name_primary || '',
        client_subscriber_relationship_primary: clientProfile.client_subscriber_relationship_primary || '',
        client_subscriber_dob_primary: subscriberDobPrimary,
        client_group_number_primary: clientProfile.client_group_number_primary || '',
        client_policy_number_primary: clientProfile.client_policy_number_primary || '',
        client_insurance_company_secondary: clientProfile.client_insurance_company_secondary || '',
        client_insurance_type_secondary: clientProfile.client_insurance_type_secondary || '',
        client_subscriber_name_secondary: clientProfile.client_subscriber_name_secondary || '',
        client_subscriber_relationship_secondary: clientProfile.client_subscriber_relationship_secondary || '',
        client_subscriber_dob_secondary: subscriberDobSecondary,
        client_group_number_secondary: clientProfile.client_group_number_secondary || '',
        client_policy_number_secondary: clientProfile.client_policy_number_secondary || '',
        hasMoreInsurance: clientProfile.hasMoreInsurance || '',
        client_has_even_more_insurance: clientProfile.client_has_even_more_insurance || '',
        client_self_goal: clientProfile.client_self_goal || '',
        client_referral_source: clientProfile.client_referral_source || '',
      };
      form.reset(formValues);
      initialDataLoadedForUser.current = userId;
    } else {
      console.warn("[ProfileSetup] No client data found in context. Using defaults.");
      form.reset({ client_email: user?.email || '', ...form.formState.defaultValues } as ProfileFormValues);
      initialDataLoadedForUser.current = userId; // Mark as loaded to prevent re-runs
    }
    setIsFormLoading(false);

  }, [userId, isUserContextLoading, authInitialized, clientProfile, form, toast, navigate, user?.email]);

  const navigateToStep = (nextStep: number) => { 
    setNavigationHistory(prev => [...prev, nextStep]);
    setCurrentStep(nextStep);
  };

  const handleConfirmIdentity = async () => { 
    const isValid = await form.trigger(["client_first_name", "client_last_name", "client_preferred_name", "client_email", "client_phone", "client_relationship"]);
    if (!isValid) { toast({ title: "Validation Error", description: "Please ensure all required fields in Step 1 are filled correctly.", variant: "destructive" }); return; }
    if (!clientId) { toast({ title: "Error", description: "No client record found. Please contact support.", variant: "destructive" }); return; }
    const values = form.getValues();
    try {
      const { error } = await supabase.from('clients').update({
        client_first_name: values.client_first_name, client_last_name: values.client_last_name,
        client_preferred_name: values.client_preferred_name, client_email: values.client_email,
        client_phone: values.client_phone, client_relationship: values.client_relationship
      }).eq('id', clientId);
      if (error) throw error;
      toast({ title: "Personal information saved", description: "Your identity details have been updated." });
      if (refreshUserData) await refreshUserData(); 
      navigateToStep(2);
    } catch (error: any) { console.error("[ProfileSetup] Error saving identity data:", error); toast({ title: "Error saving data", description: error.message, variant: "destructive" }); }
  };

  const handleGoBack = () => { 
     if (navigationHistory.length > 1) {
      const newHistory = [...navigationHistory];
      newHistory.pop();
      const previousStep = newHistory[newHistory.length - 1];
      setNavigationHistory(newHistory);
      setCurrentStep(previousStep);
    }
  };

  const handleOtherInsuranceChange = (value: string) => { 
    setOtherInsurance(value);
    form.setValue('hasMoreInsurance', value); 
  };

  const handleNext = async () => { 
    const values = form.getValues();
    const vaCoverage = values.client_vacoverage;
    
    let saveError = false;
    let dataSaved = false;

    if (currentStep === 2) {
      const isStep2Valid = await form.trigger(["client_date_of_birth", "client_gender", "client_gender_identity", "client_state", "client_time_zone", "client_vacoverage"]);
      if (!isStep2Valid) { toast({ title: "Validation Error", description: "Please complete all fields in Step 2.", variant: "destructive" }); return; }
      if (clientId) {
        const dob = values.client_date_of_birth;
        const age = calculateAge(dob); 
        console.log(`[ProfileSetup] Step 2 Save - Calculated age: ${age} for DOB: ${dob}`);
        
        // Use our utility for consistent date formatting
        const formattedDateOfBirth = formatDateForDB(dob);
        console.log(`[ProfileSetup] Step 2 Save - Formatted DOB for DB: ${formattedDateOfBirth}`);
        
        try {
          const { error } = await supabase.from('clients').update({
              client_date_of_birth: formattedDateOfBirth, 
              client_age: age, 
              client_gender: values.client_gender, 
              client_gender_identity: values.client_gender_identity, 
              client_state: values.client_state, 
              client_time_zone: values.client_time_zone, 
              client_vacoverage: values.client_vacoverage
            }).eq('id', clientId);
          if (error) throw error;
          toast({ title: "Information saved", description: "Your demographic information has been updated." });
          dataSaved = true;
        } catch (e: any) { saveError = true; console.error("[ProfileSetup] Error saving step 2 data:", e); toast({ title: "Error saving data", description: e.message, variant: "destructive" }); }
      } else { console.warn("[ProfileSetup] Step 2: ClientId not available, data not saved."); }
      if (!saveError) { if (dataSaved && refreshUserData) await refreshUserData(); navigateToStep(3); }
    } else if (currentStep === 3) {
        if (clientId) { 
            let step3Data: Record<string, any> = {};
            
            if (vaCoverage === "CHAMPVA") {
              step3Data.client_champva = values.client_champva;
            }
            
            if (vaCoverage === "TRICARE") {  
              step3Data = { 
                ...step3Data, 
                client_tricare_beneficiary_category: values.client_tricare_beneficiary_category, 
                client_tricare_sponsor_name: values.client_tricare_sponsor_name, 
                client_tricare_sponsor_branch: values.client_tricare_sponsor_branch, 
                client_tricare_sponsor_id: values.client_tricare_sponsor_id, 
                client_tricare_plan: values.client_tricare_plan, 
                client_tricare_region: values.client_tricare_region, 
                client_tricare_policy_id: values.client_tricare_policy_id, 
                client_tricare_has_referral: values.client_tricare_has_referral, 
                client_tricare_referral_number: values.client_tricare_referral_number 
              }; 
            }
            
            if (vaCoverage === "None - I am a veteran") { 
              // Format the discharge date properly
              const recentDischargeDate = values.client_recentdischarge;
              const formattedDischargeDate = formatDateForDB(recentDischargeDate);
              
              console.log(`[ProfileSetup] Step 3 Save - Veteran discharge date:`, {
                original: recentDischargeDate,
                formatted: formattedDischargeDate
              });
              
              step3Data = { 
                ...step3Data, 
                client_branchOS: values.client_branchOS,
                client_recentdischarge: formattedDischargeDate, // Use the formatted string here
                client_disabilityrating: values.client_disabilityrating 
              }; 
            }
            
            if (vaCoverage === "None - I am not a veteran") { 
              step3Data = { 
                ...step3Data, 
                client_veteran_relationship: values.client_veteran_relationship, 
                client_situation_explanation: values.client_situation_explanation 
              }; 
            }

            if (Object.keys(step3Data).length > 0) {
                try { 
                  console.log("[ProfileSetup] Saving step 3 data:", step3Data);
                  const { error } = await supabase.from('clients').update(step3Data).eq('id', clientId); 
                  if (error) throw error; 
                  toast({ title: "Information Saved", description: "Insurance details updated."}); 
                  dataSaved = true;
                }
                catch(e: any) { saveError = true; console.error("[ProfileSetup] Error saving step 3 data:", e); toast({ title: "Save Error", description: `Could not save insurance details. ${e.message}`, variant: "destructive"});}
            } else { dataSaved = true; }
        }
        if (!saveError) { 
            if (dataSaved && refreshUserData) await refreshUserData();
            if (vaCoverage === "TRICARE" && otherInsurance === "No") navigateToStep(6);
            else if (otherInsurance === "Yes" && (vaCoverage === "TRICARE" || vaCoverage === "CHAMPVA")) navigateToStep(4);
            else navigateToStep(6);
        }
    } else if (currentStep === 4) {
        if (clientId) {
            try {
              // Format the subscriber DOB properly
              const formattedSubscriberDob = formatDateForDB(values.client_subscriber_dob_primary);
              console.log("[ProfileSetup] Formatted primary subscriber DOB:", formattedSubscriberDob);
              
              const { error } = await supabase.from('clients').update({
                client_insurance_company_primary: values.client_insurance_company_primary,
                client_insurance_type_primary: values.client_insurance_type_primary,
                client_subscriber_name_primary: values.client_subscriber_name_primary,
                client_subscriber_relationship_primary: values.client_subscriber_relationship_primary,
                client_subscriber_dob_primary: formattedSubscriberDob,
                client_group_number_primary: values.client_group_number_primary,
                client_policy_number_primary: values.client_policy_number_primary
              }).eq('id', clientId);
              
              if (error) throw error;
              toast({ title: "Information Saved", description: "Primary insurance details updated."});
              dataSaved = true;
            } catch(e: any) {
              saveError = true;
              console.error("[ProfileSetup] Error saving step 4 data:", e);
              toast({ title: "Save Error", description: `Could not save primary insurance details. ${e.message}`, variant: "destructive"});
            }
        }
        if (!saveError) {
          if (dataSaved && refreshUserData) await refreshUserData();
          if (form.getValues('hasMoreInsurance') === "Yes") navigateToStep(5);
          else navigateToStep(6);
        }
    } else if (currentStep === 5) {
        if (clientId) {
            try {
              // Format the secondary subscriber DOB properly  
              const formattedSubscriberDobSecondary = formatDateForDB(values.client_subscriber_dob_secondary);
              console.log("[ProfileSetup] Formatted secondary subscriber DOB:", formattedSubscriberDobSecondary);
              
              const { error } = await supabase.from('clients').update({
                client_insurance_company_secondary: values.client_insurance_company_secondary,
                client_insurance_type_secondary: values.client_insurance_type_secondary,
                client_subscriber_name_secondary: values.client_subscriber_name_secondary,
                client_subscriber_relationship_secondary: values.client_subscriber_relationship_secondary,
                client_subscriber_dob_secondary: formattedSubscriberDobSecondary,
                client_group_number_secondary: values.client_group_number_secondary,
                client_policy_number_secondary: values.client_policy_number_secondary
              }).eq('id', clientId);
              
              if (error) throw error;
              toast({ title: "Information Saved", description: "Secondary insurance details updated."});
              dataSaved = true;
            } catch(e: any) {
              saveError = true;
              console.error("[ProfileSetup] Error saving step 5 data:", e);
              toast({ title: "Save Error", description: `Could not save secondary insurance details. ${e.message}`, variant: "destructive"});
            }
        }
        if (!saveError) {
          if (dataSaved && refreshUserData) await refreshUserData();
          navigateToStep(6);
        }
    } else if (currentStep === 6) {
      handleSubmit();
    }
  };

  const handleSubmit = async () => { 
    const values = form.getValues(); 
    if (!clientId) { toast({ title: "Error", description: "No client record found. Please contact support.", variant: "destructive" }); return; }
    try {
      const { error } = await supabase.from('clients').update({
          client_self_goal: values.client_self_goal || null, client_referral_source: values.client_referral_source || null,
          client_status: 'Profile Complete', client_is_profile_complete: true 
        }).eq('id', clientId);
      if (error) throw error; 
      console.log("[ProfileSetup] Profile completed successfully in DB. Refreshing UserContext...");
      await refreshUserData(); 
      toast({ title: "Profile complete!", description: "Your information has been saved. Redirecting...", });
      console.log("[ProfileSetup] Navigating to /therapist-selection");
      navigate('/therapist-selection');
    } catch (error: any) { console.error("[ProfileSetup] Error updating profile (final step) or refreshing context:", error); toast({ title: "Error updating profile", description: error.message || "An unexpected error occurred.", variant: "destructive" }); }
  };

  const renderStepOne = () => { 
    const { formState } = form; const isStep1Valid = formState.isValid; 
    return ( <Form {...form}><div className="space-y-6"><div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormFieldWrapper control={form.control} name="client_first_name" label="First Name" required={true} />
            <FormFieldWrapper control={form.control} name="client_last_name" label="Last Name" required={true} />
            <FormFieldWrapper control={form.control} name="client_preferred_name" label="Preferred Name (optional)" />
            <FormFieldWrapper control={form.control} name="client_email" label="Email" type="email" readOnly={true} required={true} />
            <FormFieldWrapper control={form.control} name="client_phone" label="Phone" type="tel" required={true} />
            <FormFieldWrapper
              control={form.control} name="client_relationship"
              label="What is your relationship with the patient?" type="select"
              options={["Self", "Parent/Guardian", "Spouse", "Child", "Other"]} required={true}
              onValueCommit={(value) => handleImmediateSave('client_relationship' as keyof ProfileFormValues, value)}
            />
        </div><div className="flex justify-center mt-8">
            {isFormLoading ? ( <Button type="button" size="lg" disabled className="bg-valorwell-600 hover:bg-valorwell-700 text-white font-medium py-2 px-8 rounded-md flex items-center gap-2">Loading profile...</Button>
            ) : ( <Button type="button" size="lg" onClick={handleConfirmIdentity} disabled={!isStep1Valid} className="bg-valorwell-600 hover:bg-valorwell-700 text-white font-medium py-2 px-8 rounded-md flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"> <Check className="h-5 w-5" /> I confirm that this is me </Button> )}
        </div></div></Form>
    );
  };
  const renderStepTwo = () => { 
    const { formState } = form; const isStep2Valid = formState.isValid; 
    return ( <Form {...form}><div className="space-y-6"><div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <DateField control={form.control} name="client_date_of_birth" label="Date of Birth" required={true}/>
            <FormFieldWrapper control={form.control} name="client_gender" label="Birth Gender" type="select" options={["Male", "Female", "Prefer not to say"]} required={true}/>
            <FormFieldWrapper control={form.control} name="client_gender_identity" label="Gender Identity" type="select" options={["Male", "Female", "Non-binary", "Transgender", "Prefer not to say", "Other"]} required={true}/>
            <FormFieldWrapper control={form.control} name="client_state" label="State of Primary Residence" type="select" options={["Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut", "Delaware", "Florida", "Georgia", "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky", "Louisiana", "Maine", "Maryland", "Massachusetts", "Michigan", "Minnesota", "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire", "New Jersey", "New Mexico", "New York", "North Carolina", "North Dakota", "Ohio", "Oklahoma", "Oregon", "Pennsylvania", "Rhode Island", "South Carolina", "South Dakota", "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington", "West Virginia", "Wisconsin", "Wyoming"]} required={true}/>
            <FormFieldWrapper control={form.control} name="client_time_zone" label="Time Zone" type="select" options={timezoneOptions.map(tz => tz.label)} valueMapper={(label) => { const o = timezoneOptions.find(tz_1 => tz_1.label === label); return o ? o.value : ''; }} labelMapper={(value) => { const o = timezoneOptions.find(tz_1 => tz_1.value === value); return o ? o.label : ''; }} required={true}/>
            <FormFieldWrapper control={form.control} name="client_vacoverage" label="What type of VA Coverage do you have?" type="select" options={["CHAMPVA", "TRICARE", "VA Community Care", "None - I am a veteran", "None - I am not a veteran"]} required={true}/>
        </div><div className="flex justify-between mt-8"> <Button type="button" variant="outline" onClick={handleGoBack} className="flex items-center gap-2"> <ArrowLeft className="h-4 w-4" /> Back </Button> <Button type="button" onClick={handleNext} disabled={!isStep2Valid} className="bg-valorwell-600 hover:bg-valorwell-700 text-white font-medium py-2 px-8 rounded-md flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"> Next <ArrowRight className="h-4 w-4" /> </Button> </div></div></Form> );
  };
  const renderStepThree = () => { 
    const vaCoverage = form.watch('client_vacoverage');
    return ( <Form {...form}><div className="space-y-6">
            {vaCoverage === 'CHAMPVA' && ( <SignupChampva form={form} onOtherInsuranceChange={handleOtherInsuranceChange}/> )}
            {vaCoverage === 'TRICARE' && ( <SignupTricare form={form} onOtherInsuranceChange={handleOtherInsuranceChange}/> )}
            {vaCoverage === 'VA Community Care' && ( <SignupVaCcn form={form} /> )}
            {vaCoverage === 'None - I am a veteran' && ( <SignupVeteran form={form} /> )}
            {vaCoverage === 'None - I am not a veteran' && ( <SignupNotAVeteran form={form} /> )}
        <div className="flex justify-between mt-8"> <Button type="button" variant="outline" onClick={handleGoBack} className="flex items-center gap-2"> <ArrowLeft className="h-4 w-4" /> Back </Button> <Button type="button" onClick={handleNext} className="bg-valorwell-600 hover:bg-valorwell-700 text-white font-medium py-2 px-8 rounded-md flex items-center gap-2"> Next <ArrowRight className="h-4 w-4" /> </Button> </div></div></Form> );
  };
  const renderStepFour = () => { 
    return ( <Form {...form}><div className="space-y-6"> <AdditionalInsurance form={form} /> <div className="flex justify-between mt-8"> <Button type="button" variant="outline" onClick={handleGoBack} className="flex items-center gap-2"> <ArrowLeft className="h-4 w-4" /> Back </Button> <Button type="button" onClick={handleNext} className="bg-valorwell-600 hover:bg-valorwell-700 text-white font-medium py-2 px-8 rounded-md flex items-center gap-2"> Next <ArrowRight className="h-4 w-4" /> </Button> </div></div></Form> );
  };
  const renderStepFive = () => { 
    return ( <Form {...form}><div className="space-y-6"> <MoreAdditionalInsurance form={form} /> <div className="flex justify-between mt-8"> <Button type="button" variant="outline" onClick={handleGoBack} className="flex items-center gap-2"> <ArrowLeft className="h-4 w-4" /> Back </Button> <Button type="button" onClick={handleNext} className="bg-valorwell-600 hover:bg-valorwell-700 text-white font-medium py-2 px-8 rounded-md flex items-center gap-2"> Next <ArrowRight className="h-4 w-4" /> </Button> </div></div></Form> );
  };
  const renderStepSix = () => { 
    return ( <Form {...form}><div className="space-y-6"> <SignupLast form={form} /> <div className="flex justify-between mt-8"> <Button type="button" variant="outline" onClick={handleGoBack} className="flex items-center gap-2"> <ArrowLeft className="h-4 w-4" /> Back </Button> <Button type="button" onClick={handleSubmit} className="bg-valorwell-600 hover:bg-valorwell-700 text-white font-medium py-2 px-8 rounded-md flex items-center gap-2"> Complete Profile </Button> </div></div></Form> );
  };

  return (
    <Layout>
      <div className="max-w-5xl mx-auto">
        <Card className="border-valorwell-200 shadow-xl">
          <CardHeader className="bg-gradient-to-r from-valorwell-500 to-valorwell-600 text-white rounded-t-lg p-6">
            <CardTitle className="text-xl sm:text-2xl font-semibold">Profile Setup</CardTitle>
            <CardDescription className="text-valorwell-50">Tell us about yourself to get started</CardDescription>
          </CardHeader>
          <CardContent className="p-6 sm:p-8">
            <div className="mb-6">
              <div className="flex justify-between mb-2">
                <span className="text-sm text-valorwell-700">Step {currentStep} of 6</span>
                <span className="text-sm text-valorwell-700">{Math.round((currentStep / 6) * 100)}% Complete</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div 
                  className="bg-valorwell-600 h-2.5 rounded-full" 
                  style={{ width: `${(currentStep / 6) * 100}%` }}
                ></div>
              </div>
            </div>
            
            {authError ? (
              <div className="flex justify-center items-center py-12">
                <div className="text-center bg-red-50 p-6 rounded-lg border border-red-200 max-w-md">
                  <div className="text-red-500 mb-4 flex justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"></circle>
                      <line x1="12" y1="8" x2="12" y2="12"></line>
                      <line x1="12" y1="16" x2="12.01" y2="16"></line>
                    </svg>
                  </div>
                  <h3 className="text-xl font-medium text-red-800 mb-2">Authentication Error</h3>
                  <p className="text-red-600 mb-6">{authError}</p>
                  <button
                    onClick={() => window.location.reload()}
                    className="px-4 py-2 bg-valorwell-600 text-white rounded-md hover:bg-valorwell-700 transition-colors"
                  >
                    Refresh Page
                  </button>
                </div>
              </div>
            ) : isFormLoading ? (
              <div className="flex justify-center items-center py-12">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-valorwell-600 mx-auto mb-4"></div>
                  <p className="text-valorwell-700 mb-2">
                    {!authInitialized
                      ? "Initializing authentication..."
                      : isUserContextLoading
                        ? "Loading user data..."
                        : "Loading your profile information..."}
                  </p>
                  {loadingTimeout && (
                    <p className="text-sm text-amber-600">
                      This is taking longer than expected. Please wait...
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <>
                {currentStep === 1 && renderStepOne()}
                {currentStep === 2 && renderStepTwo()}
                {currentStep === 3 && renderStepThree()}
                {currentStep === 4 && renderStepFour()}
                {currentStep === 5 && renderStepFive()}
                {currentStep === 6 && renderStepSix()}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default ProfileSetup;
