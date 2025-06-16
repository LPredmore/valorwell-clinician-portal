
import { z } from 'zod';

// Base template validation schema
export const baseTemplateSchema = z.object({
  id: z.string().min(1, 'Template ID is required'),
  templateType: z.string().min(1, 'Template type is required'),
  createdAt: z.string().datetime(),
  clientId: z.string().uuid().optional(),
  clinicianId: z.string().uuid().optional(),
});

// PHQ-9 Assessment validation
export const phq9AssessmentSchema = baseTemplateSchema.extend({
  templateType: z.literal('phq9'),
  responses: z.record(z.string(), z.number().min(0).max(3)),
  totalScore: z.number().min(0).max(27),
  interpretation: z.string(),
});

// GAD-7 Assessment validation
export const gad7AssessmentSchema = baseTemplateSchema.extend({
  templateType: z.literal('gad7'),
  responses: z.record(z.string(), z.number().min(0).max(3)),
  totalScore: z.number().min(0).max(21),
  interpretation: z.string(),
});

// PCL-5 Assessment validation
export const pcl5AssessmentSchema = baseTemplateSchema.extend({
  templateType: z.literal('pcl5'),
  responses: z.record(z.string(), z.number().min(0).max(4)),
  totalScore: z.number().min(0).max(80),
  interpretation: z.string(),
  eventDescription: z.string().optional(),
  additionalNotes: z.string().optional(),
});

// Treatment Plan validation
export const treatmentPlanSchema = baseTemplateSchema.extend({
  templateType: z.literal('treatment-plan'),
  goals: z.string().min(1, 'Goals are required'),
  objectives: z.string().min(1, 'Objectives are required'),
  interventions: z.string().min(1, 'Interventions are required'),
  timeline: z.string().min(1, 'Timeline is required'),
  frequency: z.string().min(1, 'Frequency is required'),
});

// Session Note validation
export const sessionNoteSchema = baseTemplateSchema.extend({
  templateType: z.literal('session-note'),
  clientName: z.string().min(1, 'Client name is required'),
  sessionDate: z.string().datetime(),
  sessionNotes: z.string().min(1, 'Session notes are required'),
  clinicianSignature: z.string().min(1, 'Clinician signature is required'),
});

// Validation functions
export const validateAssessment = <T>(data: T, schema: z.ZodSchema<T>): { isValid: boolean; errors?: string[] } => {
  try {
    schema.parse(data);
    return { isValid: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        isValid: false,
        errors: error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
      };
    }
    return {
      isValid: false,
      errors: ['Unknown validation error']
    };
  }
};

// Template-specific validation helpers
export const validatePHQ9 = (data: any) => validateAssessment(data, phq9AssessmentSchema);
export const validateGAD7 = (data: any) => validateAssessment(data, gad7AssessmentSchema);
export const validatePCL5 = (data: any) => validateAssessment(data, pcl5AssessmentSchema);
export const validateTreatmentPlan = (data: any) => validateAssessment(data, treatmentPlanSchema);
export const validateSessionNote = (data: any) => validateAssessment(data, sessionNoteSchema);

// Generic validation dispatcher
export const validateTemplate = (templateType: string, data: any) => {
  switch (templateType) {
    case 'phq9':
      return validatePHQ9(data);
    case 'gad7':
      return validateGAD7(data);
    case 'pcl5':
      return validatePCL5(data);
    case 'treatment-plan':
      return validateTreatmentPlan(data);
    case 'session-note':
      return validateSessionNote(data);
    default:
      return {
        isValid: false,
        errors: [`Unknown template type: ${templateType}`]
      };
  }
};
