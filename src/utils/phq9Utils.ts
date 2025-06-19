
// Updated utility functions for PHQ-9 assessments with proper database integration
import { supabase } from '@/integrations/supabase/client';

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

export const savePHQ9Assessment = async (responses: Record<string, number>, clientId: string, additionalNotes?: string): Promise<PHQ9Assessment> => {
  const totalScore = calculatePHQ9Score(responses);
  
  try {
    const { data, error } = await supabase
      .from('phq9_assessments')
      .insert([{
        client_id: clientId,
        appointment_id: null,
        assessment_date: new Date().toISOString().split('T')[0],
        question_1: responses.question_1 || 0,
        question_2: responses.question_2 || 0,
        question_3: responses.question_3 || 0,
        question_4: responses.question_4 || 0,
        question_5: responses.question_5 || 0,
        question_6: responses.question_6 || 0,
        question_7: responses.question_7 || 0,
        question_8: responses.question_8 || 0,
        question_9: responses.question_9 || 0,
        total_score: totalScore,
        phq9_narrative: interpretPHQ9Score(totalScore),
        additional_notes: additionalNotes
      }])
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to save PHQ-9 assessment: ${error.message}`);
    }

    if (!data) {
      throw new Error('No data returned from PHQ-9 assessment save');
    }

    return data as PHQ9Assessment;
  } catch (error) {
    console.error('Error saving PHQ-9 assessment:', error);
    throw error;
  }
};

export const getPHQ9Assessments = async (clientId: string): Promise<PHQ9Assessment[]> => {
  try {
    const { data, error } = await supabase
      .from('phq9_assessments')
      .select('*')
      .eq('client_id', clientId)
      .order('assessment_date', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch PHQ-9 assessments: ${error.message}`);
    }

    return (data || []) as PHQ9Assessment[];
  } catch (error) {
    console.error('Error fetching PHQ-9 assessments:', error);
    return [];
  }
};

export const getLatestPHQ9Assessment = async (clientId: string): Promise<PHQ9Assessment | null> => {
  try {
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

    return data as PHQ9Assessment | null;
  } catch (error) {
    console.error('Error fetching latest PHQ-9 assessment:', error);
    return null;
  }
};

export const calculatePHQ9Score = (responses: Record<string, number>): number => {
  return Object.values(responses).reduce((total, score) => total + (score || 0), 0);
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
