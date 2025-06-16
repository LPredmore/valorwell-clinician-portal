
import { Client } from '@/types/client';

// Common interface for all template components
export interface BaseTemplateProps {
  onClose: () => void;
}

// Interface for templates that need clinician information
export interface ClinicianTemplateProps extends BaseTemplateProps {
  clinicianName: string;
}

// Interface for templates that work with client data
export interface ClientTemplateProps extends BaseTemplateProps {
  clientData?: Client;
  clientId?: string;
}

// Interface for templates that need both clinician and client info
export interface FullTemplateProps extends ClinicianTemplateProps, ClientTemplateProps {}

// Assessment result interface
export interface AssessmentResult {
  id: string;
  templateType: string;
  responses: Record<string, any>;
  totalScore?: number;
  interpretation?: string;
  createdAt: string;
  clientId?: string;
  clinicianId?: string;
}

// Template save callback
export type TemplateSaveCallback<T = any> = (data: T) => void | Promise<void>;
