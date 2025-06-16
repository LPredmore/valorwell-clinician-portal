
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
      client_id: assessment.client_id,
      clinician_id: assessment.clinician_id,
      assessment_date: assessment.assessment_date,
      responses: assessment.responses,
      total_score: assessment.total_score,
      interpretation: assessment.interpretation,
      additional_notes: assessment.additional_notes
    }])
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to save PHQ-9 assessment: ${error.message}`);
  }

  return {
    id: data.id,
    client_id: data.client_id,
    clinician_id: data.clinician_id,
    assessment_date: data.assessment_date,
    responses: data.responses as Record<string, number>,
    total_score: data.total_score,
    interpretation: data.interpretation,
    additional_notes: data.additional_notes,
    created_at: data.created_at,
    updated_at: data.updated_at
  };
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

  return (data || []).map(item => ({
    id: item.id,
    client_id: item.client_id,
    clinician_id: item.clinician_id,
    assessment_date: item.assessment_date,
    responses: item.responses as Record<string, number>,
    total_score: item.total_score,
    interpretation: item.interpretation,
    additional_notes: item.additional_notes,
    created_at: item.created_at,
    updated_at: item.updated_at
  }));
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

  if (!data) return null;

  return {
    id: data.id,
    client_id: data.client_id,
    clinician_id: data.clinician_id,
    assessment_date: data.assessment_date,
    responses: data.responses as Record<string, number>,
    total_score: data.total_score,
    interpretation: data.interpretation,
    additional_notes: data.additional_notes,
    created_at: data.created_at,
    updated_at: data.updated_at
  };
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
