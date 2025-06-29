
import { createClient } from '@supabase/supabase-js';
import { parseDateString, formatDateForDB } from '@/utils/dateUtils';

// Check for required environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  console.error('VITE_SUPABASE_URL environment variable is missing. Please make sure it is set in your .env file.');
}

if (!supabaseKey) {
  console.error('VITE_SUPABASE_ANON_KEY environment variable is missing. Please make sure it is set in your .env file.');
}

// Create a Supabase client with fallback defaults (for development only)
export const supabase = createClient(
  supabaseUrl || 'http://localhost:54321', 
  supabaseKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'
);

// Use our centralized date parsing utility
export { parseDateString, formatDateForDB };

// Updated function to get or create a video room for an appointment, with option to force new room creation
export const getOrCreateVideoRoom = async (appointmentId: string, forceNew: boolean = false) => {
  try {
    console.log('Getting or creating video room for appointment:', appointmentId, forceNew ? '(forcing new room)' : '');
    
    if (!forceNew) {
      // First check if the appointment already has a video room URL
      const { data: appointment, error: fetchError } = await supabase
        .from('appointments')
        .select('video_room_url')
        .eq('id', appointmentId)
        .single();
        
      if (fetchError) {
        console.error('Error fetching appointment:', fetchError);
        throw fetchError;
      }
      
      // If a video room URL already exists, return it
      if (appointment && appointment.video_room_url) {
        console.log('Appointment already has video room URL:', appointment.video_room_url);
        return { url: appointment.video_room_url, success: true };
      }
    }
    
    console.log('Creating new video room via Edge Function');
    // Create a new room via the Edge Function
    const { data, error } = await supabase.functions.invoke('create-daily-room', {
      body: { appointmentId, forceNew }
    });
    
    if (error) {
      console.error('Edge function error:', error);
      throw error;
    }
    
    if (!data?.url) {
      console.error('No URL returned from edge function:', data);
      throw new Error('Failed to get video room URL');
    }
    
    console.log('Video room created, URL:', data.url);
    
    // Store the room URL in the appointment record
    const { error: updateError } = await supabase
      .from('appointments')
      .update({ video_room_url: data.url })
      .eq('id', appointmentId);
      
    if (updateError) {
      console.error('Error updating appointment with video URL:', updateError);
      throw updateError;
    }
    
    return { url: data.url, success: true };
  } catch (error) {
    console.error('Error getting/creating video room:', error);
    return { success: false, error };
  }
};

// Document assignment functions
export interface DocumentAssignment {
  id: string;
  document_name: string;
  client_id: string;
  status: string;
  assigned_by: string;
  created_at: string;
  updated_at: string;
}

// Function to fetch document assignments for the current client
export const fetchDocumentAssignments = async (clientId: string) => {
  try {
    const { data, error } = await supabase
      .from('document_assignments')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false });
      
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching document assignments:', error);
    return [];
  }
};

// Function to update document assignment status
export const updateDocumentStatus = async (assignmentId: string, status: 'not_started' | 'in_progress' | 'completed') => {
  try {
    const { data, error } = await supabase
      .from('document_assignments')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', assignmentId)
      .select();
      
    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Error updating document status:', error);
    return { success: false, error };
  }
};

// Function to save client history form data
export const saveClientHistoryForm = async (formData: any) => {
  try {
    // First save the main client history record
    const { data: historyData, error: historyError } = await supabase
      .from('client_history')
      .insert([{
        client_id: formData.clientId,
        submission_date: new Date(),
        // Map all the main form fields from formData
        personal_strengths: formData.personalStrengths,
        hobbies: formData.hobbies,
        education_level: formData.educationLevel,
        occupation_details: formData.occupationDetails,
        sleep_hours: formData.sleepHours,
        current_issues: formData.currentIssues,
        progression_of_issues: formData.progressionOfIssues,
        relationship_problems: formData.relationshipProblems,
        counseling_goals: formData.counselingGoals,
        // Boolean fields
        is_married: formData.isMarried,
        has_past_spouses: formData.hasPastSpouses,
        has_received_mental_health_treatment: formData.hasReceivedMentalHealthTreatment,
        hospitalized_psychiatric: formData.hospitalizedPsychiatric,
        attempted_suicide: formData.attemptedSuicide,
        psych_hold: formData.psychHold,
        takes_medications: formData.takesMedications,
        // Multi-select items stored as JSON
        selected_symptoms: formData.selectedSymptoms || [],
        selected_medical_conditions: formData.selectedMedicalConditions || [],
        selected_childhood_experiences: formData.selectedChildhoodExperiences || [],
        // Emergency contact
        emergency_name: formData.emergencyName,
        emergency_phone: formData.emergencyPhone,
        emergency_relationship: formData.emergencyRelationship,
        // Substance use
        alcohol_use: formData.alcoholUse,
        tobacco_use: formData.tobaccoUse,
        drug_use: formData.drugUse,
        // Additional info
        additional_info: formData.additionalInfo,
        signature: formData.signature
      }])
      .select()
      .single();
    
    if (historyError) throw historyError;
    
    const historyId = historyData.id;
    
    // Handle related data if present
    if (formData.medications && formData.medications.length > 0) {
      const medicationsData = formData.medications.map((med: any) => ({
        history_id: historyId,
        name: med.name,
        purpose: med.purpose,
        duration: med.duration
      }));
      
      const { error: medsError } = await supabase
        .from('client_history_medications')
        .insert(medicationsData);
        
      if (medsError) throw medsError;
    }
    
    // Handle household members if present
    if (formData.householdMembers && formData.householdMembers.length > 0) {
      const householdData = formData.householdMembers.map((member: any) => ({
        history_id: historyId,
        name: member.name,
        relationship_type: member.relationship,
        personality: member.personality,
        relationship_now: member.relationshipNow
      }));
      
      const { error: householdError } = await supabase
        .from('client_history_household')
        .insert(householdData);
        
      if (householdError) throw householdError;
    }
    
    // Handle family members if present and not same as household
    if (!formData.isFamilySameAsHousehold && formData.familyMembers && formData.familyMembers.length > 0) {
      const familyData = formData.familyMembers.map((member: any) => ({
        history_id: historyId,
        name: member.name,
        relationship_type: member.relationship,
        personality: member.personality,
        relationship_growing: member.relationshipGrowing,
        relationship_now: member.relationshipNow
      }));
      
      const { error: familyError } = await supabase
        .from('client_history_family')
        .insert(familyData);
        
      if (familyError) throw familyError;
    }
    
    // Handle previous mental health treatments if applicable
    if (formData.previousTreatments && formData.previousTreatments.length > 0) {
      const treatmentsData = formData.previousTreatments.map((treatment: any) => ({
        history_id: historyId,
        year: treatment.year,
        provider: treatment.provider,
        reason: treatment.reason,
        length: treatment.length
      }));
      
      const { error: treatmentsError } = await supabase
        .from('client_history_treatments')
        .insert(treatmentsData);
        
      if (treatmentsError) throw treatmentsError;
    }
    
    return { success: true, historyId };
  } catch (error) {
    console.error('Error saving client history form:', error);
    return { success: false, error };
  }
};

// Function to submit an informed consent form
export const submitInformedConsentForm = async (clientId: string, formData: any) => {
  try {
    // Store the signed consent document in the clinical_documents table
    const { error } = await supabase
      .from('clinical_documents')
      .insert([{
        client_id: clientId,
        document_title: 'Informed Consent',
        document_type: 'consent',
        document_date: new Date().toISOString().split('T')[0],
        file_path: formData.signaturePath || null // This would typically be a path to a stored PDF
      }]);
      
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error submitting informed consent:', error);
    return { success: false, error };
  }
};

// New function to fetch clinical documents for a client
export const fetchClinicalDocuments = async (clientId: string) => {
  try {
    const { data, error } = await supabase
      .from('clinical_documents')
      .select('*')
      .eq('client_id', clientId)
      .order('document_date', { ascending: false });
      
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching clinical documents:', error);
    return [];
  }
};

// New function to get document download URL
export const getDocumentDownloadURL = async (filePath: string) => {
  try {
    const { data, error } = await supabase.storage
      .from('clinical_documents')
      .createSignedUrl(filePath, 60); // 60 seconds expiration
      
    if (error) throw error;
    return data.signedUrl;
  } catch (error) {
    console.error('Error getting document download URL:', error);
    return null;
  }
};

// New interface for PHQ9 assessment data
export interface PHQ9Assessment {
  client_id: string;
  assessment_date: string;
  question_1: number;
  question_2: number;
  question_3: number;
  question_4: number;
  question_5: number;
  question_6: number;
  question_7: number;
  question_8: number;
  question_9: number;
  total_score: number;
  additional_notes?: string;
}

// New function to save PHQ-9 assessment
export const savePHQ9Assessment = async (assessment: PHQ9Assessment) => {
  try {
    const { data, error } = await supabase
      .from('phq9_assessments')
      .insert([assessment])
      .select();
      
    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Error saving PHQ9 assessment:', error);
    return { success: false, error };
  }
};

// Function to fetch PHQ-9 assessments for a client
export const fetchPHQ9Assessments = async (clientId: string) => {
  try {
    const { data, error } = await supabase
      .from('phq9_assessments')
      .select('*')
      .eq('client_id', clientId)
      .order('assessment_date', { ascending: false });
      
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching PHQ9 assessments:', error);
    return [];
  }
};

// Interface for CPT Code
export interface CPTCode {
  code: string;
  name: string;
  fee: number;
  description: string;
  clinical_type: string;
}

// Interface for Practice Info
export interface PracticeInfo {
  id: string;
  practice_name: string;
  practice_npi: string;
  practice_taxid: string;
  practice_taxonomy: string;
  practice_address1: string;
  practice_address2: string;
  practice_city: string;
  practice_state: string;
  practice_zip: string;
}

// User management functions
export const createUser = async (email: string, userData: any) => {
  try {
    // Use the functions API instead of direct admin calls
    console.log("Creating user via Edge Function:", email);
    
    // Call Supabase Edge Function to create user
    const { data, error } = await supabase.functions.invoke('create-user', {
      body: {
        email,
        userData
      }
    });
    
    if (error) {
      console.error('Error calling create-user function:', error);
      return { data: null, error };
    }
    
    return { data, error: null };
  } catch (error) {
    console.error('Error creating user:', error);
    return { data: null, error };
  }
};

// User data functions
export const getCurrentUser = async () => {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    return user;
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
};

// Client data functions
export const getClientByUserId = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('id', userId)
      .single();
      
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error getting client by user ID:', error);
    return null;
  }
};

export const updateClientProfile = async (clientId: string, updates: any) => {
  try {
    const { error } = await supabase
      .from('clients')
      .update(updates)
      .eq('id', clientId);
      
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error updating client profile:', error);
    return { success: false, error };
  }
};

// Clinician data functions
export const getClinicianNameById = async (clinicianId: string) => {
  try {
    const { data, error } = await supabase
      .from('clinicians')
      .select('clinician_professional_name')
      .eq('id', clinicianId)
      .single();
      
    if (error) throw error;
    return data?.clinician_professional_name || null;
  } catch (error) {
    console.error('Error getting clinician name by ID:', error);
    return null;
  }
};

export const getClinicianIdByName = async (clinicianName: string) => {
  try {
    const { data, error } = await supabase
      .from('clinicians')
      .select('id')
      .eq('clinician_professional_name', clinicianName)
      .single();
      
    if (error) throw error;
    return data?.id || null;
  } catch (error) {
    console.error('Error getting clinician ID by name:', error);
    return null;
  }
};

// CPT code functions
export const fetchCPTCodes = async (): Promise<CPTCode[]> => {
  try {
    const { data, error } = await supabase
      .from('cpt_codes')
      .select('*')
      .order('code');
      
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching CPT codes:', error);
    return [];
  }
};

export const addCPTCode = async (cptCode: CPTCode) => {
  try {
    const { error } = await supabase
      .from('cpt_codes')
      .insert([cptCode]);
      
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error adding CPT code:', error);
    return { success: false, error };
  }
};

export const updateCPTCode = async (codeId: string, updates: Partial<CPTCode>) => {
  try {
    const { error } = await supabase
      .from('cpt_codes')
      .update(updates)
      .eq('code', codeId);
      
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error updating CPT code:', error);
    return { success: false, error };
  }
};

export const deleteCPTCode = async (codeId: string) => {
  try {
    const { error } = await supabase
      .from('cpt_codes')
      .delete()
      .eq('code', codeId);
      
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error deleting CPT code:', error);
    return { success: false, error };
  }
};

// Practice info functions
export const fetchPracticeInfo = async (): Promise<PracticeInfo | null> => {
  try {
    const { data, error } = await supabase
      .from('practiceinfo')
      .select('*')
      .limit(1)
      .single();
      
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching practice info:', error);
    return null;
  }
};

export const updatePracticeInfo = async (updates: Partial<PracticeInfo>) => {
  try {
    const { error } = await supabase
      .from('practiceinfo')
      .update(updates)
      .eq('id', updates.id);
      
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error updating practice info:', error);
    return { success: false, error };
  }
};

// Function to test if Resend is working
export const testResendEmailService = async (email: string) => {
  // This function is kept for reference but is no longer exposed in the UI
  // It can be used for debugging email issues via the console if needed
  try {
    console.log('[testResendEmailService] Testing Resend with email:', email);
    
    // First check if our function is deployed and accessible
    const statusCheck = await supabase.functions.invoke('test-resend', {
      method: 'GET'
    });
    
    console.log('[testResendEmailService] Status check response:', statusCheck);
    
    if (statusCheck.error) {
      console.error('[testResendEmailService] Error checking function status:', statusCheck.error);
      return { 
        success: false, 
        error: statusCheck.error,
        message: 'Error accessing the test function. It might not be deployed yet.' 
      };
    }
    
    // Now try to send a test email
    const { data, error } = await supabase.functions.invoke('test-resend', {
      body: { email }
    });
    
    if (error) {
      console.error('[testResendEmailService] Function invocation error:', error);
      return { success: false, error, message: 'Error calling the test function' };
    }
    
    console.log('[testResendEmailService] Function response:', data);
    
    return { 
      success: true, 
      data,
      message: 'Test email sent successfully. Please check your inbox.' 
    };
  } catch (error: any) {
    console.error('[testResendEmailService] Unexpected error:', error);
    return { 
      success: false, 
      error,
      message: `Unexpected error: ${error.message}` 
    };
  }
};
