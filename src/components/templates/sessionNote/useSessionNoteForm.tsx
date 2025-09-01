import { useState, useEffect, RefObject, useMemo, useCallback } from 'react';
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
      if (!clientData?.client_assigned_therapist) return;
      
      try {
        const { data, error } = await supabase
          .from('clinicians')
          .select('clinician_nameinsurance')
          .eq('id', clientData.client_assigned_therapist)
          .single();
          
        if (error) return;
        
        if (data?.clinician_nameinsurance) {
          setFormState(prevState => ({
            ...prevState,
            clinicianName: data.clinician_nameinsurance
          }));
        }
      } catch (error) {
        // Silent fail - not critical
      }
    };
    
    fetchClinicianInsuranceName();
  }, [clientData?.client_assigned_therapist]);

  useEffect(() => {
    if (!clientData) return;

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
  }, [clientData?.id]);

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

  const handleChange = useCallback((field: string, value: string | string[]) => {
    setFormState(prevState => {
      if (field === 'diagnosis' && Array.isArray(value)) {
        return {
          ...prevState,
          [field]: value.join(', ')
        };
      }
      return {
        ...prevState,
        [field]: value
      };
    });
  }, []);

  const toggleEditMode = useCallback((field: string, value: string) => {
    if (value === 'Other') {
      setEditModes(prev => ({ ...prev, [field]: true }));
      handleChange(field, '');
    } else {
      setEditModes(prev => ({ ...prev, [field]: false }));
      handleChange(field, value);
    }
  }, [handleChange]);

  const clearField = useCallback((field: string) => {
    setEditModes(prev => ({ ...prev, [field]: false }));
    handleChange(field, '');
  }, [handleChange]);

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

  // Memoized form validation
  const requiredFields = useMemo(() => {
    const fields = [
      'patientName', 'patientDOB', 'clinicianName', 'sessionDate', 'diagnosis',
      'medications', 'sessionType', 'personsInAttendance', 'appearance', 'attitude',
      'behavior', 'speech', 'affect', 'thoughtProcess', 'perception', 'orientation',
      'memoryConcentration', 'insightJudgement', 'mood', 'substanceAbuseRisk',
      'suicidalIdeation', 'homicidalIdeation',
      'currentSymptoms', 'functioning', 'prognosis', 'progress', 'sessionNarrative',
      'signature'
    ];
    
    // Add conditionally required fields only if they are displayed (have values)
    if (formState.planType) fields.push('planType');
    if (formState.treatmentFrequency) fields.push('treatmentFrequency');
    if (formState.nextTreatmentPlanUpdate) fields.push('nextTreatmentPlanUpdate');
    
    return fields;
  }, [formState.planType, formState.treatmentFrequency, formState.nextTreatmentPlanUpdate]);

  const isFormValid = useMemo(() => {
    return requiredFields.every(field => {
      const value = formState[field as keyof typeof formState];
      return value && value.toString().trim() !== '';
    });
  }, [formState, requiredFields]);

  const handleSave = async () => {
    if (!clientData?.id) {
      toast({
        title: "Error",
        description: "No client ID found. Cannot save session note.",
        variant: "destructive",
      });
      return;
    }

    if (!isFormValid) {
      toast({
        title: "Validation Error",
        description: "Please fill out all required fields before saving.",
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

      // Convert empty date strings to null for database compatibility
      const nextTreatmentPlanUpdate = formState.nextTreatmentPlanUpdate?.trim() 
        ? formState.nextTreatmentPlanUpdate 
        : null;

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

        client_nexttreatmentplanupdate: nextTreatmentPlanUpdate,
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
          .update({ status: 'documented' })
          .eq('id', appointment.id);

        if (appointmentError) {
          console.error('Error updating appointment status:', appointmentError);
          toast({
            title: "Warning",
            description: "Session note saved, but couldn't update appointment status.",
            variant: "default",
          });
        } else {
          // Create CMS1500 claims after successfully marking appointment as completed
          try {
            const claimsResult = await createCMS1500ClaimsForCompletedAppointment(appointment.id);
            
            if (!claimsResult.success) {
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

      // Improved save workflow: Only save metadata AFTER successful PDF generation
      const sessionDate = appointment?.date ? new Date(appointment.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
      const clientName = formState.patientName || 'Unknown Client';
      
      const documentInfo = {
        clientId: clientData.id,
        documentType: 'Session Note',
        documentDate: sessionDate,
        documentTitle: `Session Note - ${clientName} - ${sessionDate}`,
        createdBy: clinicianName
      };

      console.log('📄 [SAVE-NOTE] Starting PDF generation for:', documentInfo);

      // Step 1: Generate PDF first (without saving metadata)
      if (!contentRef?.current) {
        console.error('❌ [SAVE-NOTE] No content element found for PDF generation');
        throw new Error('No content available for PDF generation');
      }

      try {
        console.log('📄 [SAVE-NOTE] Attempting PDF generation...');
        
        const pdfFilePath = await generateAndSavePDF(
          'session-note-content',
          documentInfo
        );

        if (!pdfFilePath) {
          console.error('❌ [SAVE-NOTE] PDF generation failed');
          throw new Error('PDF generation failed: No file path returned');
        }

        console.log('✅ [SAVE-NOTE] PDF generated successfully:', pdfFilePath);

        // Step 2: Only save metadata AFTER successful PDF generation
        console.log('💾 Saving session note metadata to database:', documentInfo);
        
        const { error: dbError } = await supabase
          .from('clinical_documents')
          .insert({
            client_id: documentInfo.clientId,
            document_type: documentInfo.documentType,
            document_date: documentInfo.documentDate,
            document_title: documentInfo.documentTitle,
            file_path: pdfFilePath, // Use actual file path, not placeholder
            created_by: documentInfo.createdBy
          });

        if (dbError) {
          console.error('❌ Error saving document metadata:', dbError);
          throw new Error(`Failed to save document metadata: ${dbError.message}`);
        }

        console.log('✅ Document metadata saved successfully');
        
        toast({
          title: "Success",
          description: "Session note saved and PDF generated successfully.",
        });
        
      } catch (error) {
        console.error('❌ [SAVE-NOTE] Error in save process:', error);
        throw error;
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
    clearField,
    handleSave,
    isFormValid,
    isAiAssistMode,
    selectedInterventions,
    isGeneratingNote,
    toggleAiAssistMode,
    toggleInterventionSelection,
    handleAiAssist
  };
};
