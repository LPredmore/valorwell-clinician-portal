
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase, parseDateString, formatDateForDB } from "@/integrations/supabase/client";
import { 
  Card, 
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Form,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Pencil, Save, X } from "lucide-react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Layout from '@/components/layout/Layout';
import PersonalInfoTab from "@/components/client/PersonalInfoTab";
import InsuranceTab from "@/components/client/InsuranceTab";
import TreatmentTab from "@/components/client/TreatmentTab";
import DocumentationTab from "@/components/client/DocumentationTab";
import { ClientDetails as ClientDetailsType, Clinician } from "@/types/client";
import { useUser } from "@/context/UserContext";

const ClientDetails = () => {
  const { id: clientId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [clientData, setClientData] = useState<ClientDetailsType | null>(null);
  const [clinicians, setClinicians] = useState<Clinician[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [activeTab, setActiveTab] = useState("personal");
  const { userRole } = useUser();

  useEffect(() => {
    const fetchClient = async () => {
      console.log('🔧 [ClientDetails] Fetching client with ID:', clientId);
      
      try {
        const { data, error } = await supabase
          .from("clients")
          .select("*")
          .eq("id", clientId)
          .single();

        if (error) {
          throw error;
        }

        console.log('✅ [ClientDetails] Client data fetched:', {
          id: data.id,
          name: `${data.client_first_name} ${data.client_last_name}`,
          hasAllData: !!data
        });

        setClientData(data);
        setIsLoading(false);
      } catch (err) {
        console.error('❌ [ClientDetails] Error fetching client:', err);
        setError(err as Error);
        setIsLoading(false);
        
        // Get fresh toast instance inside effect
        const { toast: toastInstance } = useToast();
        toastInstance({
          title: "Error",
          description: "Failed to fetch client details.",
          variant: "destructive",
        });
      }
    };

    const fetchClinicians = async () => {
      try {
        const { data, error } = await supabase
          .from("clinicians")
          .select("*");

        if (error) {
          throw error;
        }

        setClinicians(data);
      } catch (err) {
        console.error('Error fetching clinicians:', err);
        setError(err as Error);
        
        // Get fresh toast instance inside effect
        const { toast: toastInstance } = useToast();
        toastInstance({
          title: "Error",
          description: "Failed to fetch clinicians.",
          variant: "destructive",
        });
      }
    };

    if (clientId) {
      fetchClient();
      fetchClinicians();
    }
  }, [clientId]);

  const formSchema = z.object({
    client_first_name: z.string().min(2).max(50),
    client_last_name: z.string().min(2).max(50),
    client_preferred_name: z.string().optional().nullable(),
    client_email: z.string().email().optional().nullable(),
    client_phone: z.string().optional().nullable(),
    client_date_of_birth: z.date().optional().nullable(),
    client_age: z.string().optional().nullable(),
    client_gender: z.string().optional().nullable(),
    client_gender_identity: z.string().optional().nullable(),
    client_state: z.string().optional().nullable(),
    client_time_zone: z.string().optional().nullable(),
    client_minor: z.string().optional().nullable(),
    client_status: z.string().optional().nullable(),
    client_assigned_therapist: z.string().optional().nullable(),
    client_referral_source: z.string().optional().nullable(),
    client_self_goal: z.string().optional().nullable(),
    client_diagnosis: z.array(z.string()).optional().nullable(),
    client_insurance_company_primary: z.string().optional().nullable(),
    client_policy_number_primary: z.string().optional().nullable(),
    client_group_number_primary: z.string().optional().nullable(),
    client_subscriber_name_primary: z.string().optional().nullable(),
    client_insurance_type_primary: z.string().optional().nullable(),
    client_subscriber_dob_primary: z.date().optional().nullable(),
    client_subscriber_relationship_primary: z.string().optional().nullable(),
    client_insurance_company_secondary: z.string().optional().nullable(),
    client_policy_number_secondary: z.string().optional().nullable(),
    client_group_number_secondary: z.string().optional().nullable(),
    client_subscriber_name_secondary: z.string().optional().nullable(),
    client_insurance_type_secondary: z.string().optional().nullable(),
    client_subscriber_dob_secondary: z.date().optional().nullable(),
    client_subscriber_relationship_secondary: z.string().optional().nullable(),
    client_insurance_company_tertiary: z.string().optional().nullable(),
    client_policy_number_tertiary: z.string().optional().nullable(),
    client_group_number_tertiary: z.string().optional().nullable(),
    client_subscriber_name_tertiary: z.string().optional().nullable(),
    client_insurance_type_tertiary: z.string().optional().nullable(),
    client_subscriber_dob_tertiary: z.date().optional().nullable(),
    client_subscriber_relationship_tertiary: z.string().optional().nullable(),
    client_vacoverage: z.string().optional().nullable(),
    client_champva: z.string().optional().nullable(), 
    client_tricare_beneficiary_category: z.string().optional().nullable(),
    client_tricare_sponsor_name: z.string().optional().nullable(),
    client_tricare_sponsor_branch: z.string().optional().nullable(),
    client_tricare_sponsor_id: z.string().optional().nullable(),
    client_tricare_plan: z.string().optional().nullable(),
    client_tricare_region: z.string().optional().nullable(),
    client_tricare_policy_id: z.string().optional().nullable(),
    client_tricare_has_referral: z.string().optional().nullable(),
    client_tricare_referral_number: z.string().optional().nullable(),
    client_city: z.string().optional().nullable(),
    client_zip_code: z.string().optional().nullable(),
    client_address: z.string().optional().nullable(),
    client_treatmentplan_startdate: z.date().optional().nullable(),
    client_is_profile_complete: z.string().optional().nullable(),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      client_first_name: clientData?.client_first_name || "",
      client_last_name: clientData?.client_last_name || "",
      client_preferred_name: clientData?.client_preferred_name || "",
      client_email: clientData?.client_email || "",
      client_phone: clientData?.client_phone || "",
      client_date_of_birth: clientData?.client_date_of_birth ? parseDateString(clientData.client_date_of_birth) : null,
      client_age: clientData?.client_age ? String(clientData.client_age) : null,
      client_gender: clientData?.client_gender || "",
      client_gender_identity: clientData?.client_gender_identity || "",
      client_state: clientData?.client_state || "",
      client_time_zone: clientData?.client_time_zone || "",
      client_minor: clientData?.client_minor || "",
      client_status: clientData?.client_status || "",
      client_assigned_therapist: clientData?.client_assigned_therapist || "",
      client_referral_source: clientData?.client_referral_source || "",
      client_self_goal: clientData?.client_self_goal || "",
      client_diagnosis: clientData?.client_diagnosis || [],
      client_insurance_company_primary: clientData?.client_insurance_company_primary || "",
      client_policy_number_primary: clientData?.client_policy_number_primary || "",
      client_group_number_primary: clientData?.client_group_number_primary || "",
      client_subscriber_name_primary: clientData?.client_subscriber_name_primary || "",
      client_insurance_type_primary: clientData?.client_insurance_type_primary || "",
      client_subscriber_dob_primary: clientData?.client_subscriber_dob_primary ? parseDateString(clientData.client_subscriber_dob_primary) : null,
      client_subscriber_relationship_primary: clientData?.client_subscriber_relationship_primary || "",
      client_insurance_company_secondary: clientData?.client_insurance_company_secondary || "",
      client_policy_number_secondary: clientData?.client_policy_number_secondary || "",
      client_group_number_secondary: clientData?.client_group_number_secondary || "",
      client_subscriber_name_secondary: clientData?.client_subscriber_name_secondary || "",
      client_insurance_type_secondary: clientData?.client_insurance_type_secondary || "",
      client_subscriber_dob_secondary: clientData?.client_subscriber_dob_secondary ? parseDateString(clientData.client_subscriber_dob_secondary) : null,
      client_subscriber_relationship_secondary: clientData?.client_subscriber_relationship_secondary || "",
      client_insurance_company_tertiary: clientData?.client_insurance_company_tertiary || "",
      client_policy_number_tertiary: clientData?.client_policy_number_tertiary || "",
      client_group_number_tertiary: clientData?.client_group_number_tertiary || "",
      client_subscriber_name_tertiary: clientData?.client_subscriber_name_tertiary || "",
      client_insurance_type_tertiary: clientData?.client_insurance_type_tertiary || "",
      client_subscriber_dob_tertiary: clientData?.client_subscriber_dob_tertiary ? parseDateString(clientData.client_subscriber_dob_tertiary) : null,
      client_subscriber_relationship_tertiary: clientData?.client_subscriber_relationship_tertiary || "",
      client_vacoverage: clientData?.client_vacoverage || "",
      client_champva: clientData?.client_champva || "",
      client_tricare_beneficiary_category: clientData?.client_tricare_beneficiary_category || "",
      client_tricare_sponsor_name: clientData?.client_tricare_sponsor_name || "",
      client_tricare_sponsor_branch: clientData?.client_tricare_sponsor_branch || "",
      client_tricare_sponsor_id: clientData?.client_tricare_sponsor_id || "",
      client_tricare_plan: clientData?.client_tricare_plan || "",
      client_tricare_region: clientData?.client_tricare_region || "",
      client_tricare_policy_id: clientData?.client_tricare_policy_id || "",
      client_tricare_has_referral: clientData?.client_tricare_has_referral || "",
      client_tricare_referral_number: clientData?.client_tricare_referral_number || "",
      client_city: clientData?.client_city || "",
      client_zip_code: clientData?.client_zip_code || "",
      client_address: clientData?.client_address || "",
      client_treatmentplan_startdate: clientData?.client_treatmentplan_startdate ? parseDateString(clientData.client_treatmentplan_startdate) : null,
      client_is_profile_complete: clientData?.client_is_profile_complete || "",
    },
  });

  useEffect(() => {
    if (clientData) {
      form.reset({
        client_first_name: clientData.client_first_name || "",
        client_last_name: clientData.client_last_name || "",
        client_preferred_name: clientData.client_preferred_name || "",
        client_email: clientData.client_email || "",
        client_phone: clientData.client_phone || "",
        client_date_of_birth: clientData.client_date_of_birth ? parseDateString(clientData.client_date_of_birth) : null,
        client_age: clientData.client_age ? String(clientData.client_age) : null,
        client_gender: clientData.client_gender || "",
        client_gender_identity: clientData.client_gender_identity || "",
        client_state: clientData.client_state || "",
        client_time_zone: clientData.client_time_zone || "",
        client_minor: clientData.client_minor || "",
        client_status: clientData.client_status || "",
        client_assigned_therapist: clientData.client_assigned_therapist || "",
        client_referral_source: clientData.client_referral_source || "",
        client_self_goal: clientData.client_self_goal || "",
        client_diagnosis: clientData.client_diagnosis || [],
        client_insurance_company_primary: clientData.client_insurance_company_primary || "",
        client_policy_number_primary: clientData.client_policy_number_primary || "",
        client_group_number_primary: clientData.client_group_number_primary || "",
        client_subscriber_name_primary: clientData.client_subscriber_name_primary || "",
        client_insurance_type_primary: clientData.client_insurance_type_primary || "",
        client_subscriber_dob_primary: clientData.client_subscriber_dob_primary ? parseDateString(clientData.client_subscriber_dob_primary) : null,
        client_subscriber_relationship_primary: clientData.client_subscriber_relationship_primary || "",
        client_insurance_company_secondary: clientData.client_insurance_company_secondary || "",
        client_policy_number_secondary: clientData.client_policy_number_secondary || "",
        client_group_number_secondary: clientData.client_group_number_secondary || "",
        client_subscriber_name_secondary: clientData.client_subscriber_name_secondary || "",
        client_insurance_type_secondary: clientData.client_insurance_type_secondary || "",
        client_subscriber_dob_secondary: clientData.client_subscriber_dob_secondary ? parseDateString(clientData.client_subscriber_dob_secondary) : null,
        client_subscriber_relationship_secondary: clientData.client_subscriber_relationship_secondary || "",
        client_insurance_company_tertiary: clientData.client_insurance_company_tertiary || "",
        client_policy_number_tertiary: clientData.client_policy_number_tertiary || "",
        client_group_number_tertiary: clientData.client_group_number_tertiary || "",
        client_subscriber_name_tertiary: clientData.client_subscriber_name_tertiary || "",
        client_insurance_type_tertiary: clientData.client_insurance_type_tertiary || "",
        client_subscriber_dob_tertiary: clientData.client_subscriber_dob_tertiary ? parseDateString(clientData.client_subscriber_dob_tertiary) : null,
        client_subscriber_relationship_tertiary: clientData.client_subscriber_relationship_tertiary || "",
        client_vacoverage: clientData.client_vacoverage || "",
        client_champva: clientData.client_champva || "",
        client_tricare_beneficiary_category: clientData.client_tricare_beneficiary_category || "",
        client_tricare_sponsor_name: clientData.client_tricare_sponsor_name || "",
        client_tricare_sponsor_branch: clientData.client_tricare_sponsor_branch || "",
        client_tricare_sponsor_id: clientData.client_tricare_sponsor_id || "",
        client_tricare_plan: clientData.client_tricare_plan || "",
        client_tricare_region: clientData.client_tricare_region || "",
        client_tricare_policy_id: clientData.client_tricare_policy_id || "",
        client_tricare_has_referral: clientData.client_tricare_has_referral || "",
        client_tricare_referral_number: clientData.client_tricare_referral_number || "",
        client_city: clientData.client_city || "",
        client_zip_code: clientData.client_zip_code || "",
        client_address: clientData.client_address || "",
        client_treatmentplan_startdate: clientData.client_treatmentplan_startdate ? parseDateString(clientData.client_treatmentplan_startdate) : null,
        client_is_profile_complete: clientData.client_is_profile_complete || "",
      });
    }
  }, [clientData]);

  const handleSaveChanges = async (values: z.infer<typeof formSchema>) => {
    try {
      const formattedValues = {
        ...values,
        client_date_of_birth: values.client_date_of_birth ? formatDateForDB(values.client_date_of_birth) : null,
        client_subscriber_dob_primary: values.client_subscriber_dob_primary ? formatDateForDB(values.client_subscriber_dob_primary) : null,
        client_subscriber_dob_secondary: values.client_subscriber_dob_secondary ? formatDateForDB(values.client_subscriber_dob_secondary) : null,
        client_subscriber_dob_tertiary: values.client_subscriber_dob_tertiary ? formatDateForDB(values.client_subscriber_dob_tertiary) : null,
        client_age: values.client_age ? parseInt(values.client_age) : null,
        client_treatmentplan_startdate: values.client_treatmentplan_startdate ? formatDateForDB(values.client_treatmentplan_startdate) : null,
      };

      const { error } = await supabase
        .from('clients')
        .update(formattedValues)
        .eq('id', clientId);

      if (error) {
        throw error;
      }

      const { toast: toastInstance } = useToast();
      toastInstance({
        title: "Success",
        description: "Client details updated successfully."
      });

      setIsEditing(false);

      const { data } = await supabase
        .from('clients')
        .select('*')
        .eq('id', clientId)
        .single();

      if (data) {
        setClientData(data);
      }
    } catch (err) {
      console.error('Error updating client:', err);
      const { toast: toastInstance } = useToast();
      toastInstance({
        title: "Error",
        description: "Failed to update client details.",
        variant: "destructive",
      });
    }
  };

  const handleCancel = () => {
    form.reset();
    setIsEditing(false);
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-full">
          <p>Loading client details...</p>
        </div>
      </Layout>
    );
  }

  if (!clientData) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-full">
          <p>Client not found.</p>
        </div>
      </Layout>
    );
  }

  const isRestrictedRole = userRole === "clinician" || userRole === "client";

  return (
    <Layout>
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">
            {clientData.client_first_name} {clientData.client_last_name}
          </h1>
          <p className="text-gray-500">{clientData.client_email}</p>
        </div>
        <div className="flex gap-2">
          {isEditing ? (
            <>
              <Button variant="outline" onClick={handleCancel} className="flex items-center gap-1">
                <X size={16} /> Cancel
              </Button>
              <Button onClick={form.handleSubmit(handleSaveChanges)} className="flex items-center gap-1 bg-valorwell-700 hover:bg-valorwell-800">
                <Save size={16} /> Save Changes
              </Button>
            </>
          ) : (
            <Button onClick={() => setIsEditing(true)} className="flex items-center gap-1">
              <Pencil size={16} /> Edit
            </Button>
          )}
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSaveChanges)}>
          <Tabs defaultValue="personal" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className={`grid ${isRestrictedRole ? 'grid-cols-3' : 'grid-cols-4'} mb-4`}>
              <TabsTrigger value="personal">Personal Info</TabsTrigger>
              <TabsTrigger value="insurance">Insurance</TabsTrigger>
              {!isRestrictedRole && (
                <TabsTrigger value="treatment">Treatment</TabsTrigger>
              )}
              <TabsTrigger value="documentation">Documentation</TabsTrigger>
            </TabsList>

            <TabsContent value="personal">
              <PersonalInfoTab 
                isEditing={isEditing} 
                form={form} 
                clientData={clientData}
              />
            </TabsContent>

            <TabsContent value="insurance">
              <InsuranceTab 
                isEditing={isEditing} 
                form={form} 
                clientData={clientData}
              />
            </TabsContent>

            {!isRestrictedRole && (
              <TabsContent value="treatment">
                <TreatmentTab 
                  isEditing={isEditing} 
                  form={form} 
                  clientData={clientData}
                  clinicians={clinicians}
                />
              </TabsContent>
            )}

            <TabsContent value="documentation">
              <DocumentationTab clientData={clientData} />
            </TabsContent>
          </Tabs>
        </form>
      </Form>
    </Layout>
  );
};

export default ClientDetails;
