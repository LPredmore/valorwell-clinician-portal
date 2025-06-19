
// PCL-5 utility functions using clinical_documents for storage
import { supabase } from '@/integrations/supabase/client';

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
}

export const savePCL5Assessment = async (
  responses: Record<string, number>, 
  clientId: string, 
  eventDescription?: string,
  additionalNotes?: string
): Promise<PCL5Assessment> => {
  const totalScore = calculatePCL5Score(responses);
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    const assessmentData = {
      assessment_type: 'PCL-5',
      responses,
      total_score: totalScore,
      interpretation: interpretPCL5Score(totalScore),
      event_description: eventDescription,
      additional_notes: additionalNotes,
      assessment_date: new Date().toISOString().split('T')[0],
      clinician_id: user?.id
    };

    const { data, error } = await supabase
      .from('clinical_documents')
      .insert([{
        client_id: clientId,
        document_type: 'assessment',
        document_title: `PCL-5 Assessment - ${new Date().toLocaleDateString()}`,
        document_date: new Date().toISOString().split('T')[0],
        file_path: JSON.stringify(assessmentData),
        created_by: user?.id
      }])
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to save PCL-5 assessment: ${error.message}`);
    }

    if (!data) {
      throw new Error('No data returned from PCL-5 assessment save');
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
      event_description: eventDescription,
      additional_notes: additionalNotes,
      created_at: data.created_at
    } as PCL5Assessment;
  } catch (error) {
    console.error('Error saving PCL-5 assessment:', error);
    throw error;
  }
};

export const calculatePCL5Score = (responses: Record<string, number>): number => {
  return Object.values(responses).reduce((total, score) => total + (score || 0), 0);
};

export const interpretPCL5Score = (score: number): string => {
  if (score >= 33) {
    return "Score suggests PTSD diagnosis may be appropriate";
  } else {
    return "Score below provisional PTSD diagnosis threshold";
  }
};
