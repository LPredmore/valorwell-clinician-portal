
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

// Function to create a new user
export async function createUser(email: string, userData: any) {
  console.log('[client] ▶️ Invoking create-user with payload:', { email, userData });
  const res = await supabase.functions.invoke('create-user', {
    body: { email, userData }
  });
  console.log('[client] ⬇️ create-user response object:', res);
  if (res.error) {
    console.error('[client] ❗ create-user returned error:', res.error);
  }
  return res;
}

// Import the new video room service
import { videoRoomService } from '@/utils/videoRoomService';

// Updated function to get or create a video room for an appointment - now uses the new service
export const getOrCreateVideoRoom = async (appointmentId: string, forceNew: boolean = false) => {
  console.log('[getOrCreateVideoRoom] Using new video room service for appointment:', appointmentId);
  
  try {
    const result = await videoRoomService.createVideoRoomSync(appointmentId, forceNew);
    
    if (result.success) {
      return { url: result.url, success: true };
    } else {
      return { success: false, error: result.error };
    }
  } catch (error) {
    console.error('[getOrCreateVideoRoom] Error:', error);
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
  console.log('📋 [fetchClinicalDocuments] Direct query for client:', clientId);
  
  try {
    const { data, error } = await supabase
      .from('clinical_documents')
      .select('*')
      .eq('client_id', clientId)
      .order('document_date', { ascending: false });

    console.log('📋 [fetchClinicalDocuments] Query result:', {
      error: error,
      dataCount: data?.length || 0,
      data: data
    });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('❌ [fetchClinicalDocuments] Error:', error);
    return [];
  }
};

// Enhanced function to fetch filtered clinical documents with proper treatment plan deduplication
export const fetchFilteredClinicalDocuments = async (clientId: string) => {
  // Removed debug log to stop spam
  
  try {
    // Check auth status
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    console.log('👤 [fetchFilteredClinicalDocuments] Auth status:', {
      hasUser: !!user,
      userId: user?.id,
      userEmail: user?.email,
      authError: authError
    });

    // Try RPC function first
    console.log('📞 [fetchFilteredClinicalDocuments] Trying RPC function...');
    const { data: rpcData, error: rpcError } = await supabase
      .rpc('get_filtered_clinical_documents', { 
        p_client_id: clientId 
      });
      
    if (rpcError) {
      console.error('❌ [fetchFilteredClinicalDocuments] RPC error:', rpcError);
      throw rpcError;
    }
    
    console.log('✅ [fetchFilteredClinicalDocuments] RPC success:', {
      dataCount: rpcData?.length || 0,
      data: rpcData
    });
    
    return rpcData || [];
  } catch (error) {
    console.error('❌ [fetchFilteredClinicalDocuments] RPC failed, trying fallback:', error);
    
    // Fallback to direct table query
    console.log('🔄 [fetchFilteredClinicalDocuments] Using fallback query...');
    const fallbackResult = await fetchClinicalDocuments(clientId);
    console.log('✅ [fetchFilteredClinicalDocuments] Fallback result:', {
      count: fallbackResult.length,
      documents: fallbackResult
    });
    
    return fallbackResult;
  }
};

// New function to get document download URL
export const getDocumentDownloadURL = async (filePath: string) => {
  try {
    console.log('🔗 [DOC-DOWNLOAD] Starting download URL generation for:', filePath);
    
    // Validate file path
    if (!filePath || typeof filePath !== 'string') {
      console.error('❌ [DOC-DOWNLOAD] Invalid file path provided:', filePath);
      return null;
    }
    
    // Check if file path starts with "temp/" - these are invalid paths
    if (filePath.startsWith('temp/')) {
      console.error('❌ [DOC-DOWNLOAD] Cannot retrieve temporary file path:', filePath);
      return null;
    }
    
    // Validate file path format - support both 2-part and 3-part paths
    const pathParts = filePath.split('/');
    if (pathParts.length < 2) {
      console.error('❌ [DOC-DOWNLOAD] Invalid file path format. Expected: clientId/filename.pdf or clientId/docType/filename.pdf, got:', filePath);
      return null;
    }
    
    // Handle both 2-part and 3-part file paths
    const is3PartPath = pathParts.length >= 3;
    const pathInfo = is3PartPath 
      ? {
          clientId: pathParts[0],
          docType: pathParts[1],
          filename: pathParts[2]
        }
      : {
          clientId: pathParts[0],
          docType: null,
          filename: pathParts[1]
        };
    
    console.log('📂 [DOC-DOWNLOAD] File path analysis:', {
      fullPath: filePath,
      pathParts,
      is3PartPath,
      ...pathInfo
    });
    
    // Check if file exists before creating signed URL
    console.log('🔍 [DOC-DOWNLOAD] Checking if file exists...');
    const directoryPath = pathParts.slice(0, -1).join('/');
    const fileName = pathParts[pathParts.length - 1];
    
    try {
      const { data: fileList, error: listError } = await supabase.storage
        .from('clinical_documents')
        .list(directoryPath);
      
      if (listError) {
        console.error('❌ [DOC-DOWNLOAD] Error listing directory:', {
          error: listError,
          directoryPath
        });
        return null;
      }
      
      const fileExists = fileList?.some(file => file.name === fileName);
      console.log('📁 [DOC-DOWNLOAD] Directory listing:', {
        directoryPath,
        fileName,
        fileExists,
        filesFound: fileList?.map(f => f.name)
      });
      
      if (!fileExists) {
        console.error('❌ [DOC-DOWNLOAD] File not found in storage:', {
          filePath,
          directoryPath,
          fileName,
          availableFiles: fileList?.map(f => f.name)
        });
        return null;
      }
      
    } catch (listingError) {
      console.warn('⚠️ [DOC-DOWNLOAD] Could not verify file existence:', listingError);
      // Continue anyway - file might exist even if listing fails
    }
    
    console.log('🔐 [DOC-DOWNLOAD] Creating signed URL...');
    const { data, error } = await supabase.storage
      .from('clinical_documents')
      .createSignedUrl(filePath, 3600); // 1 hour expiration
      
    if (error) {
      console.error('❌ [DOC-DOWNLOAD] Storage error creating signed URL:', {
        error,
        errorMessage: error.message,
        errorCode: (error as any).statusCode || 'unknown',
        filePath
      });
      throw error;
    }
    
    if (!data?.signedUrl) {
      console.error('❌ [DOC-DOWNLOAD] No signed URL returned from storage');
      return null;
    }
    
    console.log('✅ [DOC-DOWNLOAD] Generated download URL successfully:', {
      filePath,
      urlGenerated: true,
      urlLength: data.signedUrl.length
    });
    
    return data.signedUrl;
  } catch (error) {
    console.error('❌ [DOC-DOWNLOAD] Critical error getting document download URL:', {
      error,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      filePath
    });
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

// User management functions (duplicate removed - using the one above)

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
