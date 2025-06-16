
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

export interface PHQ9Assessment {
  id: string;
  client_id: string;
  clinician_id: string;
  assessment_date: string;
  responses: Record<string, number>;
  total_score: number;
  interpretation: string;
  additional_notes?: string;
  created_at: string;
  updated_at: string;
}

export interface GAD7Assessment {
  id: string;
  client_id: string;
  clinician_id: string;
  assessment_date: string;
  responses: Record<string, number>;
  total_score: number;
  interpretation: string;
  additional_notes?: string;
  created_at: string;
  updated_at: string;
}

export interface PCL5Assessment {
  id: string;
  client_id: string;
  clinician_id: string;
  assessment_date: string;
  responses: Record<string, number>;
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

  const savePHQ9Assessment = async (data: Omit<PHQ9Assessment, 'id' | 'created_at' | 'updated_at'>) => {
    setIsLoading(true);
    try {
      const { data: result, error } = await supabase
        .from('phq9_assessments')
        .insert([data])
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

  const saveGAD7Assessment = async (data: Omit<GAD7Assessment, 'id' | 'created_at' | 'updated_at'>) => {
    setIsLoading(true);
    try {
      const { data: result, error } = await supabase
        .from('gad7_assessments')
        .insert([data])
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

  const savePCL5Assessment = async (data: Omit<PCL5Assessment, 'id' | 'created_at' | 'updated_at'>) => {
    setIsLoading(true);
    try {
      const { data: result, error } = await supabase
        .from('pcl5_assessments')
        .insert([data])
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
      const { data: result, error } = await supabase
        .from('session_notes')
        .insert([data])
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
      const { data: result, error } = await supabase
        .from('treatment_plans')
        .insert([data])
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
      const [phq9Result, gad7Result, pcl5Result] = await Promise.all([
        supabase
          .from('phq9_assessments')
          .select('*')
          .eq('client_id', clientId)
          .order('assessment_date', { ascending: false }),
        supabase
          .from('gad7_assessments')
          .select('*')
          .eq('client_id', clientId)
          .order('assessment_date', { ascending: false }),
        supabase
          .from('pcl5_assessments')
          .select('*')
          .eq('client_id', clientId)
          .order('assessment_date', { ascending: false })
      ]);

      return {
        phq9: phq9Result.data || [],
        gad7: gad7Result.data || [],
        pcl5: pcl5Result.data || []
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
