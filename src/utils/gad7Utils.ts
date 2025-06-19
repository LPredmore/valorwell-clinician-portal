
// GAD-7 utility functions using clinical_documents for storage
import { supabase } from '@/integrations/supabase/client';

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
}

export const saveGAD7Assessment = async (responses: Record<string, number>, clientId: string, additionalNotes?: string): Promise<GAD7Assessment> => {
  const totalScore = calculateGAD7Score(responses);
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    const assessmentData = {
      assessment_type: 'GAD-7',
      responses,
      total_score: totalScore,
      interpretation: interpretGAD7Score(totalScore),
      additional_notes: additionalNotes,
      assessment_date: new Date().toISOString().split('T')[0],
      clinician_id: user?.id
    };

    const { data, error } = await supabase
      .from('clinical_documents')
      .insert([{
        client_id: clientId,
        document_type: 'assessment',
        document_title: `GAD-7 Assessment - ${new Date().toLocaleDateString()}`,
        document_date: new Date().toISOString().split('T')[0],
        file_path: JSON.stringify(assessmentData),
        created_by: user?.id
      }])
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to save GAD-7 assessment: ${error.message}`);
    }

    if (!data) {
      throw new Error('No data returned from GAD-7 assessment save');
    }

    // Return in expected format
    return {
      id: data.id,
      client_id: clientId,
      clinician_id: user?.id,
      assessment_date: assessmentData.assessment_date,
      ...responses,
      total_score: totalScore,
      interpretation: assessmentData.interpretation,
      additional_notes: additionalNotes,
      created_at: data.created_at
    } as GAD7Assessment;
  } catch (error) {
    console.error('Error saving GAD-7 assessment:', error);
    throw error;
  }
};

export const calculateGAD7Score = (responses: Record<string, number>): number => {
  return Object.values(responses).reduce((total, score) => total + (score || 0), 0);
};

export const interpretGAD7Score = (score: number): string => {
  if (score >= 0 && score <= 4) {
    return "Minimal anxiety";
  } else if (score >= 5 && score <= 9) {
    return "Mild anxiety";
  } else if (score >= 10 && score <= 14) {
    return "Moderate anxiety";
  } else {
    return "Severe anxiety";
  }
};
