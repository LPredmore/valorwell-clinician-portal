import { useState, useEffect, RefObject } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ClientDetails } from '@/types/client';
import { generateAndSavePDF } from '@/utils/pdfUtils';

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
    if (clientData) {
      setFormState(prevState => ({
        ...prevState,
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
    }
  }, [clientData, clinicianName]);

  useEffect(() => {
    if (appointment && appointment.client) {
      const appointmentDate = appointment.date ? new Date(appointment.date).toISOString().split('T')[0] : '';
      
      setFormState(prevState => ({
        ...prevState,
        sessionDate: appointmentDate,
        sessionType: appointment.type || '',
        patientName: appointment.client.client_first_name && appointment.client.client_last_name 
          ? `${appointment.client.client_first_name} ${appointment.client.client_last_name}`
          : prevState.patientName
      }));

      if (clientData?.id && appointmentDate) {
        fetchPHQ9Assessment(clientData.id, appointmentDate);
      }
    }
  }, [appointment, clientData]);

  const fetchPHQ9Assessment = async (clientId: string, assessmentDate: string) => {
    try {
      const { data, error } = await supabase
        .from('phq9_assessments')
        .select('*')
        .eq('client_id', clientId)
        .eq('assessment_date', assessmentDate)
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
        }
      }

      if (contentRef?.current && appointment?.date) {
        const sessionDate = new Date(appointment.date).toISOString().split('T')[0];
        const clientName = formState.patientName || 'Unknown Client';
        const documentInfo = {
          clientId: clientData.id,
          documentType: 'session_note',
          documentDate: sessionDate,
          documentTitle: `Session Note - ${clientName} - ${sessionDate}`,
          createdBy: clinicianName
        };

        try {
          const pdfPath = await generateAndSavePDF('session-note-content', documentInfo);
          if (pdfPath) {
            console.log('PDF saved successfully:', pdfPath);
            toast({
              title: "Success",
              description: "Session note saved and PDF generated successfully.",
            });
          } else {
            console.error('Failed to generate PDF');
            toast({
              title: "Warning",
              description: "Session note saved, but PDF generation failed.",
              variant: "default",
            });
          }
        } catch (pdfError) {
          console.error('Error generating PDF:', pdfError);
          toast({
            title: "Warning",
            description: "Session note saved, but PDF generation failed.",
            variant: "default",
          });
        }
      } else {
        toast({
          title: "Success",
          description: "Session note saved successfully.",
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
    handleSave
  };
};
