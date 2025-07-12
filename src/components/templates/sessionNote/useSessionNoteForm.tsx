import { useState, useEffect, RefObject } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ClientDetails } from '@/types/client';
import { generateAndSavePDF } from '@/utils/pdfUtils';
import { createCMS1500ClaimsForCompletedAppointment } from '@/utils/cms1500ClaimsUtils';

interface UseSessionNoteFormProps {
  clientData: ClientDetails | null;
  clinicianName: string;
  appointment?: any;
  onClose: () => void;
  contentRef?: RefObject<HTMLDivElement>;
}

export const useSessionNoteForm = ({
  clientData,
  clinicianName,
  appointment,
  onClose,
  contentRef
}: UseSessionNoteFormProps) => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [phq9Data, setPhq9Data] = useState<any>(null);

  const [formState, setFormState] = useState({
    sessionDate: '',
    patientName: '',
    patientDOB: '',
    clinicianName: '',
    diagnosis: '',
    planType: '',
    treatmentFrequency: '',
    medications: '',
    sessionType: '',
    personsInAttendance: '',

    appearance: '',
    attitude: '',
    behavior: '',
    speech: '',
    affect: '',
    thoughtProcess: '',
    perception: '',
    orientation: '',
    memoryConcentration: '',
    insightJudgement: '',
    mood: '',
    substanceAbuseRisk: '',
    suicidalIdeation: '',
    homicidalIdeation: '',

    primaryObjective: '',
    intervention1: '',
    intervention2: '',
    secondaryObjective: '',
    intervention3: '',
    intervention4: '',
    tertiaryObjective: '',
    intervention5: '',
    intervention6: '',

    currentSymptoms: '',
    functioning: '',
    prognosis: '',
    progress: '',
    problemNarrative: '',
    treatmentGoalNarrative: '',
    sessionNarrative: '',
    nextTreatmentPlanUpdate: '',
    signature: '',
    privateNote: ''
  });

  const [editModes, setEditModes] = useState({
    appearance: false,
    attitude: false,
    behavior: false,
    speech: false,
    affect: false,
    thoughtProcess: false,
    perception: false,
    orientation: false,
    memoryConcentration: false,
    insightJudgement: false
  });

  // AI Assist state
  const [isAiAssistMode, setIsAiAssistMode] = useState(false);
  const [selectedInterventions, setSelectedInterventions] = useState<string[]>([]);
  const [isGeneratingNote, setIsGeneratingNote] = useState(false);

  useEffect(() => {
    const fetchClinicianInsuranceName = async () => {
      if (!clientData) return;
      
      try {
        const clinicianId = clientData.client_assigned_therapist;
        
        if (clinicianId) {
          const { data, error } = await supabase
            .from('clinicians')
            .select('clinician_nameinsurance')
            .eq('id', clinicianId)
            .single();
            
          if (error) {
            console.error('Error fetching clinician insurance name:', error);
            return;
          }
          
          if (data && data.clinician_nameinsurance) {
            setFormState(prevState => ({
              ...prevState,
              clinicianName: data.clinician_nameinsurance
            }));
          }
        }
      } catch (error) {
        console.error('Error in fetchClinicianInsuranceName:', error);
      }
    };
    
    fetchClinicianInsuranceName();
  }, [clientData]);

  useEffect(() => {
    console.log('[useSessionNoteForm] STEP 8 - clientData received:', {
      hasClientData: !!clientData,
      clientDataType: typeof clientData,
      clientId: clientData?.id,
      clientName: clientData ? `${clientData.client_first_name} ${clientData.client_last_name}` : 'No client data',
      clientDOB: clientData?.client_date_of_birth,
      primaryObjective: clientData?.client_primaryobjective,
      intervention1: clientData?.client_intervention1,
      totalFields: clientData ? Object.keys(clientData).length : 0
    });

    if (clientData) {
      const newFormState = {
        patientName: `${clientData.client_first_name || ''} ${clientData.client_last_name || ''}`,
        patientDOB: clientData.client_date_of_birth || '',
        diagnosis: (clientData.client_diagnosis || []).join(', '),
        planType: clientData.client_planlength || '',
        treatmentFrequency: clientData.client_treatmentfrequency || '',
        medications: clientData.client_medications || '',
        personsInAttendance: clientData.client_personsinattendance || '',

        appearance: clientData.client_appearance || '',
        attitude: clientData.client_attitude || '',
        behavior: clientData.client_behavior || '',
        speech: clientData.client_speech || '',
        affect: clientData.client_affect || '',
        thoughtProcess: clientData.client_thoughtprocess || '',
        perception: clientData.client_perception || '',
        orientation: clientData.client_orientation || '',
        memoryConcentration: clientData.client_memoryconcentration || '',
        insightJudgement: clientData.client_insightjudgement || '',
        mood: clientData.client_mood || '',
        substanceAbuseRisk: clientData.client_substanceabuserisk || '',
        suicidalIdeation: clientData.client_suicidalideation || '',
        homicidalIdeation: clientData.client_homicidalideation || '',

        primaryObjective: clientData.client_primaryobjective || '',
        secondaryObjective: clientData.client_secondaryobjective || '',
        tertiaryObjective: clientData.client_tertiaryobjective || '',
        intervention1: clientData.client_intervention1 || '',
        intervention2: clientData.client_intervention2 || '',
        intervention3: clientData.client_intervention3 || '',
        intervention4: clientData.client_intervention4 || '',
        intervention5: clientData.client_intervention5 || '',
        intervention6: clientData.client_intervention6 || '',

        functioning: clientData.client_functioning || '',
        prognosis: clientData.client_prognosis || '',
        progress: clientData.client_progress || '',
        problemNarrative: clientData.client_problem || '',
        treatmentGoalNarrative: clientData.client_treatmentgoal || '',
        sessionNarrative: clientData.client_sessionnarrative || '',
        nextTreatmentPlanUpdate: clientData.client_nexttreatmentplanupdate || '',
        privateNote: clientData.client_privatenote || ''
      };

      console.log('[useSessionNoteForm] STEP 9 - Setting form state with data:', {
        patientName: newFormState.patientName,
        patientDOB: newFormState.patientDOB,
        primaryObjective: newFormState.primaryObjective,
        intervention1: newFormState.intervention1,
        diagnosis: newFormState.diagnosis,
        hasObjectives: !!(newFormState.primaryObjective || newFormState.secondaryObjective || newFormState.tertiaryObjective),
        hasInterventions: !!(newFormState.intervention1 || newFormState.intervention2 || newFormState.intervention3)
      });

      setFormState(prevState => ({
        ...prevState,
        ...newFormState
      }));

      setEditModes({
        appearance: clientData.client_appearance && !['Normal Appearance & Grooming'].includes(clientData.client_appearance),
        attitude: clientData.client_attitude && !['Calm & Cooperative'].includes(clientData.client_attitude),
        behavior: clientData.client_behavior && !['No unusual behavior or psychomotor changes'].includes(clientData.client_behavior),
        speech: clientData.client_speech && !['Normal rate/tone/volume w/out pressure'].includes(clientData.client_speech),
        affect: clientData.client_affect && !['Normal range/congruent'].includes(clientData.client_affect),
        thoughtProcess: clientData.client_thoughtprocess && !['Goal Oriented/Directed'].includes(clientData.client_thoughtprocess),
        perception: clientData.client_perception && !['No Hallucinations or Delusions'].includes(clientData.client_perception),
        orientation: clientData.client_orientation && !['Oriented x3'].includes(clientData.client_orientation),
        memoryConcentration: clientData.client_memoryconcentration && !['Short & Long Term Intact'].includes(clientData.client_memoryconcentration),
        insightJudgement: clientData.client_insightjudgement && !['Good'].includes(clientData.client_insightjudgement)
      });

      console.log('[useSessionNoteForm] STEP 10 - Form state updated successfully');
    } else {
      console.log('[useSessionNoteForm] STEP 8b - No client data provided, skipping form population');
    }
  }, [clientData, clinicianName]);

  useEffect(() => {
    if (appointment && appointment.client) {
      const appointmentDate = appointment.start_at ? new Date(appointment.start_at).toISOString().split('T')[0] : '';
      
      setFormState(prevState => ({
        ...prevState,
        sessionDate: appointmentDate,
        sessionType: appointment.type || '',
        patientName: appointment.client.client_first_name && appointment.client.client_last_name 
          ? `${appointment.client.client_first_name} ${appointment.client.client_last_name}`
          : prevState.patientName
      }));

      if (appointment.id) {
        fetchPHQ9Assessment(appointment.id);
      }
    }
  }, [appointment, clientData]);

  const fetchPHQ9Assessment = async (appointmentId: string) => {
    try {
      const { data, error } = await supabase
        .from('phq9_assessments')
        .select('*')
        .eq('appointment_id', appointmentId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching PHQ-9 assessment:', error);
        return;
      }

      setPhq9Data(data);
    } catch (error) {
      console.error('Error in fetchPHQ9Assessment:', error);
    }
  };

  const handleChange = (field: string, value: string | string[]) => {
    if (field === 'diagnosis' && Array.isArray(value)) {
      setFormState({
        ...formState,
        [field]: value.join(', ')
      });
    } else {
      setFormState({
        ...formState,
        [field]: value
      });
    }
  };

  const toggleEditMode = (field: string, value: string) => {
    if (value === 'Other') {
      setEditModes({ ...editModes, [field]: true });
      handleChange(field, '');
    } else {
      setEditModes({ ...editModes, [field]: false });
      handleChange(field, value);
    }
  };

  const toggleAiAssistMode = () => {
    setIsAiAssistMode(!isAiAssistMode);
    setSelectedInterventions([]);
  };

  const toggleInterventionSelection = (intervention: string) => {
    setSelectedInterventions(prev => 
      prev.includes(intervention) 
        ? prev.filter(i => i !== intervention)
        : [...prev, intervention]
    );
  };

  const handleAiAssist = async () => {
    if (!formState.sessionNarrative?.trim()) {
      toast({
        title: "Error",
        description: "Please enter a session narrative before using AI assist.",
        variant: "destructive",
      });
      return;
    }

    setIsGeneratingNote(true);

    try {
      const { data, error } = await supabase.functions.invoke('generate-clinical-note', {
        body: {
          sessionNarrative: formState.sessionNarrative,
          currentSymptoms: formState.currentSymptoms,
          selectedInterventions: selectedInterventions
        }
      });

      if (error) throw error;

      if (data.success) {
        handleChange('sessionNarrative', data.clinicalNote);
        setIsAiAssistMode(false);
        setSelectedInterventions([]);
        toast({
          title: "Success",
          description: "Clinical note generated successfully.",
        });
      } else {
        throw new Error(data.error || 'Failed to generate clinical note');
      }
    } catch (error) {
      console.error('Error generating clinical note:', error);
      toast({
        title: "Error",
        description: "Failed to generate clinical note. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingNote(false);
    }
  };

  const handleSave = async () => {
    if (!clientData?.id) {
      toast({
        title: "Error",
        description: "No client ID found. Cannot save session note.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      let client_diagnosis: string[] = [];
      if (typeof formState.diagnosis === 'string' && formState.diagnosis.trim()) {
        client_diagnosis = formState.diagnosis.split(',').map(d => d.trim()).filter(Boolean);
      }

      const updates = {
        client_appearance: formState.appearance,
        client_attitude: formState.attitude,
        client_behavior: formState.behavior,
        client_speech: formState.speech,
        client_affect: formState.affect,
        client_thoughtprocess: formState.thoughtProcess,
        client_perception: formState.perception,
        client_orientation: formState.orientation,
        client_memoryconcentration: formState.memoryConcentration,
        client_insightjudgement: formState.insightJudgement,
        client_mood: formState.mood,
        client_substanceabuserisk: formState.substanceAbuseRisk,
        client_suicidalideation: formState.suicidalIdeation,
        client_homicidalideation: formState.homicidalIdeation,

        client_primaryobjective: formState.primaryObjective,
        client_secondaryobjective: formState.secondaryObjective,
        client_tertiaryobjective: formState.tertiaryObjective,
        client_intervention1: formState.intervention1,
        client_intervention2: formState.intervention2,
        client_intervention3: formState.intervention3,
        client_intervention4: formState.intervention4,
        client_intervention5: formState.intervention5,
        client_intervention6: formState.intervention6,

        client_functioning: formState.functioning,
        client_prognosis: formState.prognosis,
        client_progress: formState.progress,
        client_problem: formState.problemNarrative,
        client_treatmentgoal: formState.treatmentGoalNarrative,
        client_sessionnarrative: formState.sessionNarrative,
        client_medications: formState.medications,
        client_personsinattendance: formState.personsInAttendance,
        client_diagnosis: client_diagnosis,
        client_privatenote: formState.privateNote,

        client_nexttreatmentplanupdate: formState.nextTreatmentPlanUpdate,
      };

      const { error } = await supabase
        .from('clients')
        .update(updates)
        .eq('id', clientData.id);

      if (error) {
        throw error;
      }

      if (appointment?.id) {
        const { error: appointmentError } = await supabase
          .from('appointments')
          .update({ status: 'completed' })
          .eq('id', appointment.id);

        if (appointmentError) {
          console.error('Error updating appointment status:', appointmentError);
          toast({
            title: "Warning",
            description: "Session note saved, but couldn't update appointment status.",
            variant: "default",
          });
        } else {
          console.log(`Appointment ${appointment.id} marked as completed`);
          
          // Create CMS1500 claims after successfully marking appointment as completed
          try {
            const claimsResult = await createCMS1500ClaimsForCompletedAppointment(appointment.id);
            
            if (claimsResult.success) {
              console.log(`Successfully created ${claimsResult.claimsCreated} CMS1500 claims`);
            } else {
              console.error('Failed to create CMS1500 claims:', claimsResult.error);
              toast({
                title: "Warning",
                description: "Session note saved but claims creation failed.",
                variant: "default",
              });
            }
          } catch (claimsError) {
            console.error('Error in CMS1500 claims creation:', claimsError);
            toast({
              title: "Warning",
              description: "Session note saved but claims creation failed.",
              variant: "default",
            });
          }
        }
      }

      // Always save document metadata first, regardless of PDF generation
      const sessionDate = appointment?.date ? new Date(appointment.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
      const clientName = formState.patientName || 'Unknown Client';
      
      const documentInfo = {
        clientId: clientData.id,
        documentType: 'Session Note', // Use consistent naming with treatment plans
        documentDate: sessionDate,
        documentTitle: `Session Note - ${clientName} - ${sessionDate}`,
        createdBy: clinicianName
      };

      console.log('💾 Saving session note metadata to database:', documentInfo);

      // Step 1: Always save document metadata to database first
      const tempTimestamp = Date.now();
      
      try {
        const { error: dbError } = await supabase
          .from('clinical_documents')
          .insert({
            client_id: documentInfo.clientId,
            document_type: documentInfo.documentType,
            document_date: documentInfo.documentDate,
            document_title: documentInfo.documentTitle,
            file_path: `pending-pdf-generation-${tempTimestamp}`, // Placeholder that will be updated
            created_by: documentInfo.createdBy
          });

        if (dbError) {
          console.error('❌ Error saving document metadata:', dbError);
          throw new Error(`Failed to save document metadata: ${dbError.message}`);
        }

        console.log('✅ Document metadata saved successfully');

        // Step 2: Try to generate PDF (critical for document completeness)
        if (contentRef?.current) {
          console.log('📄 [SAVE-NOTE] Attempting PDF generation...');
          
          try {
            const pdfPath = await generateAndSavePDF('session-note-content', documentInfo);
            if (pdfPath) {
              console.log('✅ [SAVE-NOTE] PDF generated and saved successfully:', pdfPath);
              
              // Update the document with the real PDF path (find by placeholder)
              const { error: updateError } = await supabase
                .from('clinical_documents')
                .update({ file_path: pdfPath })
                .eq('client_id', documentInfo.clientId)
                .eq('document_type', documentInfo.documentType)
                .eq('document_date', documentInfo.documentDate)
                .like('file_path', `pending-pdf-generation-${tempTimestamp}`);

              if (updateError) {
                console.error('⚠️ [SAVE-NOTE] Error updating PDF path:', updateError);
                
                // Try alternative update method
                const { error: altUpdateError } = await supabase
                  .from('clinical_documents')
                  .update({ file_path: pdfPath })
                  .eq('client_id', documentInfo.clientId)
                  .eq('document_type', documentInfo.documentType)
                  .eq('document_date', documentInfo.documentDate)
                  .order('created_at', { ascending: false })
                  .limit(1);
                  
                if (altUpdateError) {
                  console.error('❌ [SAVE-NOTE] Alternative update also failed:', altUpdateError);
                }
              } else {
                console.log('✅ [SAVE-NOTE] PDF path updated in database successfully');
              }

              toast({
                title: "Success",
                description: "Session note saved and PDF generated successfully.",
              });
            } else {
              console.error('❌ [SAVE-NOTE] PDF generation failed but metadata was saved');
              
              // Mark the document as having failed PDF generation
              const { error: failedUpdateError } = await supabase
                .from('clinical_documents')
                .update({ file_path: `pdf-generation-failed-${Date.now()}` })
                .eq('client_id', documentInfo.clientId)
                .eq('document_type', documentInfo.documentType)
                .eq('document_date', documentInfo.documentDate)
                .like('file_path', `pending-pdf-generation-${tempTimestamp}`);
                
              if (failedUpdateError) {
                console.error('⚠️ [SAVE-NOTE] Error marking PDF generation as failed:', failedUpdateError);
              }
              
              toast({
                title: "Partial Success",
                description: "Session note saved to database, but PDF generation failed. You can retry later.",
                variant: "default",
              });
            }
          } catch (pdfError) {
            console.error('❌ [SAVE-NOTE] Critical error during PDF generation:', pdfError);
            
            // Mark the document as having failed PDF generation
            const { error: errorUpdateError } = await supabase
              .from('clinical_documents')
              .update({ file_path: `pdf-generation-error-${Date.now()}` })
              .eq('client_id', documentInfo.clientId)
              .eq('document_type', documentInfo.documentType)
              .eq('document_date', documentInfo.documentDate)
              .like('file_path', `pending-pdf-generation-${tempTimestamp}`);
              
            if (errorUpdateError) {
              console.error('⚠️ [SAVE-NOTE] Error marking PDF generation error:', errorUpdateError);
            }
            
            toast({
              title: "Partial Success",
              description: "Session note saved to database, but PDF generation encountered an error. You can retry later.",
              variant: "default",
            });
          }
        } else {
          console.log('⚠️ [SAVE-NOTE] No content reference available for PDF generation');
          
          // Mark the document as having no content for PDF
          const { error: noContentUpdateError } = await supabase
            .from('clinical_documents')
            .update({ file_path: `no-content-for-pdf-${Date.now()}` })
            .eq('client_id', documentInfo.clientId)
            .eq('document_type', documentInfo.documentType)
            .eq('document_date', documentInfo.documentDate)
            .like('file_path', `pending-pdf-generation-${tempTimestamp}`);
            
          if (noContentUpdateError) {
            console.error('⚠️ [SAVE-NOTE] Error marking no content available:', noContentUpdateError);
          }
          
          toast({
            title: "Success",
            description: "Session note saved successfully, but no content was available for PDF generation.",
          });
        }

      } catch (metadataError) {
        console.error('❌ Error saving document metadata:', metadataError);
        toast({
          title: "Warning", 
          description: "Session note data saved but document record creation failed.",
          variant: "default",
        });
      }

      onClose();
    } catch (error) {
      console.error('Error saving session note:', error);
      toast({
        title: "Error",
        description: "Failed to save session note.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    formState,
    editModes,
    isSubmitting,
    phq9Data,
    handleChange,
    toggleEditMode,
    handleSave,
    // AI Assist functionality
    isAiAssistMode,
    selectedInterventions,
    isGeneratingNote,
    toggleAiAssistMode,
    toggleInterventionSelection,
    handleAiAssist
  };
};
