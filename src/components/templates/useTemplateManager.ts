
import { useState } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { validateTemplate } from './utils/templateValidation';

export interface TemplateManagerConfig {
  templateId: string;
  clientId?: string;
  clinicianId?: string;
}

export const useTemplateManager = (config: TemplateManagerConfig) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const { toast } = useToast();

  const handleSave = async <T>(
    data: T,
    customSaveFunction?: (data: T) => Promise<void>,
    successMessage = 'Assessment saved successfully'
  ) => {
    if (!config.clientId) {
      toast({
        title: "Error",
        description: "Client ID is required.",
        variant: "destructive",
      });
      return false;
    }

    // Validate the data before saving
    const validation = validateTemplate(config.templateId, data);
    if (!validation.isValid) {
      toast({
        title: "Validation Error",
        description: `Please fix the following errors: ${validation.errors?.join(', ')}`,
        variant: "destructive",
      });
      return false;
    }

    setIsSubmitting(true);
    try {
      if (customSaveFunction) {
        await customSaveFunction(data);
      } else {
        // Default save behavior - simulate save
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      toast({
        title: "Success",
        description: successMessage,
      });
      
      setIsSaved(true);
      setTimeout(() => {
        setIsSaved(false);
      }, 3000);
      
      return true;
    } catch (error) {
      console.error('Error saving template:', error);
      toast({
        title: "Error",
        description: "Failed to save assessment.",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetSavedState = () => {
    setIsSaved(false);
  };

  return {
    isSubmitting,
    isSaved,
    handleSave,
    resetSavedState,
  };
};
