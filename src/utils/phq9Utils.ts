
// Updated utility functions for PHQ-9 assessments with proper database integration
import { supabase } from '@/integrations/supabase/client';

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

export const savePHQ9Assessment = async (assessment: Omit<PHQ9Assessment, 'id' | 'created_at' | 'updated_at'>): Promise<PHQ9Assessment> => {
  const { data, error } = await supabase
    .from('phq9_assessments')
    .insert([{
      ...assessment,
      clinician_id: (await supabase.auth.getUser()).data.user?.id || ''
    }])
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to save PHQ-9 assessment: ${error.message}`);
  }

  return data;
};

export const getPHQ9Assessments = async (clientId: string): Promise<PHQ9Assessment[]> => {
  const { data, error } = await supabase
    .from('phq9_assessments')
    .select('*')
    .eq('client_id', clientId)
    .order('assessment_date', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch PHQ-9 assessments: ${error.message}`);
  }

  return data || [];
};

export const getLatestPHQ9Assessment = async (clientId: string): Promise<PHQ9Assessment | null> => {
  const { data, error } = await supabase
    .from('phq9_assessments')
    .select('*')
    .eq('client_id', clientId)
    .order('assessment_date', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch latest PHQ-9 assessment: ${error.message}`);
  }

  return data;
};

export const calculatePHQ9Score = (responses: Record<string, number>): number => {
  return Object.values(responses).reduce((total, score) => total + score, 0);
};

export const interpretPHQ9Score = (score: number): string => {
  if (score >= 0 && score <= 4) {
    return "Minimal depression";
  } else if (score >= 5 && score <= 9) {
    return "Mild depression";
  } else if (score >= 10 && score <= 14) {
    return "Moderate depression";
  } else if (score >= 15 && score <= 19) {
    return "Moderately severe depression";
  } else {
    return "Severe depression";
  }
};
