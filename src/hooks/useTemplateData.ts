
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

export interface PHQ9Assessment {
  id: string;
  client_id: string;
  clinician_id?: string;
  appointment_id?: string;
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
  phq9_narrative?: string;
  additional_notes?: string;
  created_at: string;
}

// Temporary interfaces for GAD-7 and PCL-5 (will work with generic table for now)
export interface GAD7Assessment {
  id: string;
  client_id: string;
  clinician_id?: string;
  assessment_date: string;
  question_1: number;
  question_2: number;
  question_3: number;
  question_4: number;
  question_5: number;
  question_6: number;
  question_7: number;
  total_score: number;
  interpretation?: string;
  additional_notes?: string;
  created_at: string;
  updated_at: string;
}

export interface PCL5Assessment {
  id: string;
  client_id: string;
  clinician_id?: string;
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
  question_10: number;
  question_11: number;
  question_12: number;
  question_13: number;
  question_14: number;
  question_15: number;
  question_16: number;
  question_17: number;
  question_18: number;
  question_19: number;
  question_20: number;
  total_score: number;
  interpretation: string;
  event_description?: string;
  additional_notes?: string;
  created_at: string;
  updated_at: string;
}

export interface SessionNote {
  id: string;
  client_id: string;
  clinician_id: string;
  appointment_id?: string;
  session_date: string;
  session_data: Record<string, any>;
  client_name: string;
  clinician_signature: string;
  session_notes: string;
  created_at: string;
  updated_at: string;
}

export interface TreatmentPlan {
  id: string;
  client_id: string;
  clinician_id: string;
  plan_date: string;
  goals: string;
  objectives: string;
  interventions: string;
  timeline: string;
  frequency: string;
  additional_notes?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const useTemplateData = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const savePHQ9Assessment = async (data: { 
    client_id: string; 
    responses: Record<string, number>; 
    total_score: number; 
    additional_notes?: string;
  }) => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const insertData = {
        client_id: data.client_id,
        clinician_id: user.id,
        appointment_id: null,
        assessment_date: new Date().toISOString().split('T')[0],
        question_1: data.responses.question_1 || 0,
        question_2: data.responses.question_2 || 0,
        question_3: data.responses.question_3 || 0,
        question_4: data.responses.question_4 || 0,
        question_5: data.responses.question_5 || 0,
        question_6: data.responses.question_6 || 0,
        question_7: data.responses.question_7 || 0,
        question_8: data.responses.question_8 || 0,
        question_9: data.responses.question_9 || 0,
        total_score: data.total_score,
        phq9_narrative: getScoreInterpretation('phq9', data.total_score),
        additional_notes: data.additional_notes
      };

      const { data: result, error } = await supabase
        .from('phq9_assessments')
        .insert([insertData])
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Success",
        description: "PHQ-9 assessment saved successfully.",
      });

      return result;
    } catch (error) {
      console.error('Error saving PHQ-9 assessment:', error);
      toast({
        title: "Error",
        description: "Failed to save PHQ-9 assessment.",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Placeholder for GAD-7 - will store in clinical_documents for now
  const saveGAD7Assessment = async (data: { 
    client_id: string; 
    responses: Record<string, number>; 
    total_score: number; 
    additional_notes?: string;
  }) => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Store GAD-7 data in clinical_documents as JSON for now
      const assessmentData = {
        assessment_type: 'GAD-7',
        responses: data.responses,
        total_score: data.total_score,
        interpretation: getScoreInterpretation('gad7', data.total_score),
        additional_notes: data.additional_notes,
        assessment_date: new Date().toISOString().split('T')[0]
      };

      const { data: result, error } = await supabase
        .from('clinical_documents')
        .insert([{
          client_id: data.client_id,
          document_type: 'assessment',
          document_title: `GAD-7 Assessment - ${new Date().toLocaleDateString()}`,
          document_date: new Date().toISOString().split('T')[0],
          file_path: JSON.stringify(assessmentData),
          created_by: user.id
        }])
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Success",
        description: "GAD-7 assessment saved successfully.",
      });

      return result;
    } catch (error) {
      console.error('Error saving GAD-7 assessment:', error);
      toast({
        title: "Error",
        description: "Failed to save GAD-7 assessment.",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Placeholder for PCL-5 - will store in clinical_documents for now
  const savePCL5Assessment = async (data: { 
    client_id: string; 
    responses: Record<string, number>; 
    total_score: number; 
    interpretation: string;
    event_description?: string;
    additional_notes?: string;
  }) => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Store PCL-5 data in clinical_documents as JSON for now
      const assessmentData = {
        assessment_type: 'PCL-5',
        responses: data.responses,
        total_score: data.total_score,
        interpretation: data.interpretation,
        event_description: data.event_description,
        additional_notes: data.additional_notes,
        assessment_date: new Date().toISOString().split('T')[0]
      };

      const { data: result, error } = await supabase
        .from('clinical_documents')
        .insert([{
          client_id: data.client_id,
          document_type: 'assessment',
          document_title: `PCL-5 Assessment - ${new Date().toLocaleDateString()}`,
          document_date: new Date().toISOString().split('T')[0],
          file_path: JSON.stringify(assessmentData),
          created_by: user.id
        }])
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Success",
        description: "PCL-5 assessment saved successfully.",
      });

      return result;
    } catch (error) {
      console.error('Error saving PCL-5 assessment:', error);
      toast({
        title: "Error",
        description: "Failed to save PCL-5 assessment.",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const saveSessionNote = async (data: Omit<SessionNote, 'id' | 'created_at' | 'updated_at'>) => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const insertData = {
        client_id: data.client_id,
        clinician_id: user.id,
        appointment_id: data.appointment_id,
        session_date: data.session_date,
        session_data: data.session_data,
        client_name: data.client_name,
        clinician_signature: data.clinician_signature,
        session_notes: data.session_notes
      };

      const { data: result, error } = await supabase
        .from('session_notes')
        .insert([insertData])
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Success",
        description: "Session note saved successfully.",
      });

      return result;
    } catch (error) {
      console.error('Error saving session note:', error);
      toast({
        title: "Error",
        description: "Failed to save session note.",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const saveTreatmentPlan = async (data: Omit<TreatmentPlan, 'id' | 'created_at' | 'updated_at'>) => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Map our interface to the actual treatment_plans table structure
      const insertData = {
        client_id: data.client_id,
        clinician_id: user.id,
        start_date: data.plan_date,
        primary_objective: data.objectives,
        intervention1: data.interventions,
        intervention2: '',
        next_update: data.plan_date,
        plan_length: data.timeline,
        treatment_frequency: data.frequency,
        goals: data.goals,
        is_active: data.is_active,
        additional_notes: data.additional_notes
      };

      const { data: result, error } = await supabase
        .from('treatment_plans')
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Success",
        description: "Treatment plan saved successfully.",
      });

      return result;
    } catch (error) {
      console.error('Error saving treatment plan:', error);
      toast({
        title: "Error",
        description: "Failed to save treatment plan.",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const getClientAssessments = async (clientId: string) => {
    setIsLoading(true);
    try {
      // Get PHQ-9 assessments from dedicated table
      const phq9Response = await supabase
        .from('phq9_assessments')
        .select('*')
        .eq('client_id', clientId)
        .order('assessment_date', { ascending: false });

      // Get GAD-7 and PCL-5 from clinical_documents
      const documentsResponse = await supabase
        .from('clinical_documents')
        .select('*')
        .eq('client_id', clientId)
        .eq('document_type', 'assessment')
        .order('document_date', { ascending: false });

      const gad7Assessments = documentsResponse.data?.filter(doc => 
        doc.document_title.includes('GAD-7')
      ).map(doc => {
        try {
          const data = JSON.parse(doc.file_path);
          return {
            id: doc.id,
            client_id: clientId,
            assessment_date: data.assessment_date,
            total_score: data.total_score,
            interpretation: data.interpretation,
            additional_notes: data.additional_notes,
            created_at: doc.created_at,
            ...data.responses
          };
        } catch {
          return null;
        }
      }).filter(Boolean) || [];

      const pcl5Assessments = documentsResponse.data?.filter(doc => 
        doc.document_title.includes('PCL-5')
      ).map(doc => {
        try {
          const data = JSON.parse(doc.file_path);
          return {
            id: doc.id,
            client_id: clientId,
            assessment_date: data.assessment_date,
            total_score: data.total_score,
            interpretation: data.interpretation,
            event_description: data.event_description,
            additional_notes: data.additional_notes,
            created_at: doc.created_at,
            ...data.responses
          };
        } catch {
          return null;
        }
      }).filter(Boolean) || [];

      return {
        phq9: phq9Response.data || [],
        gad7: gad7Assessments,
        pcl5: pcl5Assessments
      };
    } catch (error) {
      console.error('Error fetching client assessments:', error);
      toast({
        title: "Error",
        description: "Failed to fetch client assessments.",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const getScoreInterpretation = (assessmentType: string, score: number): string => {
    switch (assessmentType) {
      case 'phq9':
        if (score >= 0 && score <= 4) return "Minimal depression";
        if (score >= 5 && score <= 9) return "Mild depression";
        if (score >= 10 && score <= 14) return "Moderate depression";
        if (score >= 15 && score <= 19) return "Moderately severe depression";
        return "Severe depression";
      case 'gad7':
        if (score >= 0 && score <= 4) return "Minimal anxiety";
        if (score >= 5 && score <= 9) return "Mild anxiety";
        if (score >= 10 && score <= 14) return "Moderate anxiety";
        return "Severe anxiety";
      default:
        return "";
    }
  };

  return {
    isLoading,
    savePHQ9Assessment,
    saveGAD7Assessment,
    savePCL5Assessment,
    saveSessionNote,
    saveTreatmentPlan,
    getClientAssessments,
  };
};
