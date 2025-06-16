
import React from 'react';
import { BaseTemplateProps } from './types';
import SessionNoteTemplate from './SessionNoteTemplate';
import TreatmentPlanTemplate from './TreatmentPlanTemplate';
import PHQ9Template from './PHQ9Template';
import GAD7Template from './GAD7Template';
import PCL5Template from './PCL5Template';

export interface TemplateConfig {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<any>;
  component: React.ComponentType<any>;
  requiresClinicianName?: boolean;
  requiresClientData?: boolean;
}

export interface TemplateRendererProps extends BaseTemplateProps {
  templateId: string;
  clinicianName?: string;
  clientData?: any;
  clientId?: string;
}

const TEMPLATE_COMPONENTS: Record<string, React.ComponentType<any>> = {
  'session-note': SessionNoteTemplate,
  'treatment-plan': TreatmentPlanTemplate,
  'phq9': PHQ9Template,
  'gad7': GAD7Template,
  'pcl5': PCL5Template,
};

const TemplateRenderer: React.FC<TemplateRendererProps> = ({
  templateId,
  onClose,
  clinicianName,
  clientData,
  clientId,
}) => {
  const Component = TEMPLATE_COMPONENTS[templateId];
  
  if (!Component) {
    return (
      <div className="p-4 text-center">
        <p className="text-red-500">Template not found: {templateId}</p>
        <button onClick={onClose} className="mt-2 px-4 py-2 bg-gray-200 rounded">
          Close
        </button>
      </div>
    );
  }

  // Base props for all templates
  const baseProps = { onClose };

  // Enhanced props for templates that need additional data
  const enhancedProps = {
    ...baseProps,
    clinicianName,
    clientData,
    clientId,
  };

  // Templates that only need basic props
  if (templateId === 'session-note' || templateId === 'treatment-plan') {
    return <Component {...baseProps} />;
  }

  // Assessment templates that need enhanced props
  return <Component {...enhancedProps} />;
};

export default TemplateRenderer;
