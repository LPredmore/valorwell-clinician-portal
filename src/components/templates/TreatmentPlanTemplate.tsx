
import React, { useState, useEffect, useRef } from 'react';
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { CalendarIcon, Plus } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, addMonths } from "date-fns";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ClientDetails } from "@/types/client";
import { useToast } from "@/hooks/use-toast";
import { supabase, formatDateForDB, getCurrentUser } from "@/integrations/supabase/client";
import { DiagnosisSelector } from "@/components/DiagnosisSelector";
import { generateAndSavePDF } from "@/utils/pdfUtils";

interface TreatmentPlanTemplateProps {
  onClose: () => void;
  clinicianName?: string;
  clientName?: string;
  clientDob?: string;
  clientData?: ClientDetails | null;
}

const TreatmentPlanTemplate: React.FC<TreatmentPlanTemplateProps> = ({ 
  onClose, 
  clinicianName = '',
  clientName = '',
  clientDob = '',
  clientData = null
}) => {
  const { toast } = useToast();
  const treatmentPlanRef = useRef<HTMLDivElement>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showSecondaryObjective, setShowSecondaryObjective] = useState(false);
  const [showTertiaryObjective, setShowTertiaryObjective] = useState(false);
  const [isFormValid, setIsFormValid] = useState(false);
  
  // Initialize form state from client data
  const [formState, setFormState] = useState({
    clientName: clientName || `${clientData?.client_first_name || ''} ${clientData?.client_last_name || ''}`,
    clientDob: clientDob || clientData?.client_date_of_birth || '',
    clinicianName: clinicianName || '',
    startDate: new Date(),
    planLength: clientData?.client_planlength || '',
    treatmentFrequency: clientData?.client_treatmentfrequency || '',
    diagnosisCodes: clientData?.client_diagnosis || [],
    problemNarrative: clientData?.client_problem || '',
    treatmentGoalNarrative: clientData?.client_treatmentgoal || '',
    primaryObjective: clientData?.client_primaryobjective || '',
    intervention1: clientData?.client_intervention1 || '',
    intervention2: clientData?.client_intervention2 || '',
    secondaryObjective: clientData?.client_secondaryobjective || '',
    intervention3: clientData?.client_intervention3 || '',
    intervention4: clientData?.client_intervention4 || '',
    tertiaryObjective: clientData?.client_tertiaryobjective || '',
    intervention5: clientData?.client_intervention5 || '',
    intervention6: clientData?.client_intervention6 || '',
    nextUpdate: clientData?.client_nexttreatmentplanupdate || '',
    privateNote: clientData?.client_privatenote || ''
  });

  // Validate form fields
  const validateForm = () => {
    // Check required fields that are always visible
    const baseFieldsValid = [
      !!formState.planLength,
      !!formState.treatmentFrequency,
      formState.diagnosisCodes?.length > 0,
      !!formState.problemNarrative.trim(),
      !!formState.treatmentGoalNarrative.trim(),
      !!formState.primaryObjective.trim(),
      !!formState.intervention1.trim(),
      !!formState.intervention2.trim(),
      !!formState.nextUpdate.trim()
    ].every(Boolean);
    
    // Check secondary objective fields if visible
    const secondaryFieldsValid = !showSecondaryObjective || [
      !!formState.secondaryObjective.trim(),
      !!formState.intervention3.trim(),
      !!formState.intervention4.trim()
    ].every(Boolean);
    
    // Check tertiary objective fields if visible
    const tertiaryFieldsValid = !showTertiaryObjective || [
      !!formState.tertiaryObjective.trim(),
      !!formState.intervention5.trim(),
      !!formState.intervention6.trim()
    ].every(Boolean);
    
    return baseFieldsValid && secondaryFieldsValid && tertiaryFieldsValid;
  };

  // Update form state if clientData changes
  useEffect(() => {
    if (clientData) {
      setFormState({
        clientName: `${clientData.client_first_name || ''} ${clientData.client_last_name || ''}`,
        clientDob: clientData.client_date_of_birth || '',
        clinicianName: clinicianName || '',
        startDate: new Date(),
        planLength: clientData.client_planlength || '',
        treatmentFrequency: clientData.client_treatmentfrequency || '',
        diagnosisCodes: clientData.client_diagnosis || [],
        problemNarrative: clientData.client_problem || '',
        treatmentGoalNarrative: clientData.client_treatmentgoal || '',
        primaryObjective: clientData.client_primaryobjective || '',
        intervention1: clientData.client_intervention1 || '',
        intervention2: clientData.client_intervention2 || '',
        secondaryObjective: clientData.client_secondaryobjective || '',
        intervention3: clientData.client_intervention3 || '',
        intervention4: clientData.client_intervention4 || '',
        tertiaryObjective: clientData.client_tertiaryobjective || '',
        intervention5: clientData.client_intervention5 || '',
        intervention6: clientData.client_intervention6 || '',
        nextUpdate: clientData.client_nexttreatmentplanupdate || '',
        privateNote: clientData.client_privatenote || ''
      });
      
      // Show objectives if they exist in client data
      setShowSecondaryObjective(!!clientData.client_secondaryobjective);
      setShowTertiaryObjective(!!clientData.client_tertiaryobjective);
    }
  }, [clientData, clinicianName]);

  // Check form validity whenever form state changes
  useEffect(() => {
    setIsFormValid(validateForm());
  }, [formState, showSecondaryObjective, showTertiaryObjective]);

  // Auto-calculate next treatment plan update date
  useEffect(() => {
    if (formState.startDate && formState.planLength) {
      const calculateNextUpdateDate = (startDate: Date, planLength: string): string => {
        try {
          const monthsMap: Record<string, number> = {
            '1month': 1,
            '3month': 3,
            '6month': 6,
            '9month': 9,
            '12month': 12
          };
          
          const months = monthsMap[planLength];
          if (!months) return '';
          
          const nextDate = addMonths(startDate, months);
          return format(nextDate, 'MMMM d, yyyy');
        } catch (error) {
          console.error('Error calculating next update date:', error);
          return '';
        }
      };
      
      const nextUpdate = calculateNextUpdateDate(formState.startDate, formState.planLength);
      if (nextUpdate && nextUpdate !== formState.nextUpdate) {
        setFormState(prev => ({ ...prev, nextUpdate }));
      }
    }
  }, [formState.startDate, formState.planLength]);

  // Convert display date to database format
  const convertDateForDatabase = (displayDate: string): string => {
    try {
      if (!displayDate) return '';
      // Parse "January 7, 2026" format and convert to "2026-01-07"
      const date = new Date(displayDate);
      return format(date, 'yyyy-MM-dd');
    } catch (error) {
      console.error('Error converting date for database:', error);
      return displayDate; // Fallback to original
    }
  };

  const handleChange = (field: string, value: any) => {
    setFormState(prev => ({ ...prev, [field]: value }));
  };

  const handleAddObjective = () => {
    if (!showSecondaryObjective) {
      setShowSecondaryObjective(true);
    } else if (!showTertiaryObjective) {
      setShowTertiaryObjective(true);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    
    try {
      console.log('🔄 Starting treatment plan save process...');
      
      // Step 1: Validate prerequisites
      if (!clientData?.id) {
        console.error('❌ Save failed: Missing client data');
        toast({
          title: "Error",
          description: "Cannot save - client data is missing",
          variant: "destructive"
        });
        return;
      }

      // Step 2: Check authentication
      console.log('🔐 Checking user authentication...');
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        console.error('❌ Save failed: User not authenticated');
        toast({
          title: "Authentication Required",
          description: "Please log in to save the treatment plan",
          variant: "destructive"
        });
        // Redirect to login if not already there
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
        return;
      }
      console.log('✅ User authenticated:', currentUser.id);

      // Step 3: Validate form data
      console.log('📝 Validating form data...');
      if (!validateForm()) {
        console.error('❌ Save failed: Form validation failed');
        toast({
          title: "Validation Error",
          description: "Please fill in all required fields before saving",
          variant: "destructive"
        });
        return;
      }
      console.log('✅ Form validation passed');

      // Step 4: Validate date conversion
      const convertedNextUpdate = convertDateForDatabase(formState.nextUpdate);
      // Only fail if there's a nextUpdate value but conversion failed (not for empty strings)
      if (formState.nextUpdate && !convertedNextUpdate) {
        console.error('❌ Save failed: Date conversion failed for:', formState.nextUpdate);
        toast({
          title: "Date Error",
          description: "Invalid date format for next treatment plan update",
          variant: "destructive"
        });
        return;
      }

      // Step 5: Prepare database updates
      const updates = {
        client_planlength: formState.planLength,
        client_treatmentfrequency: formState.treatmentFrequency,
        client_diagnosis: formState.diagnosisCodes,
        client_problem: formState.problemNarrative,
        client_treatmentgoal: formState.treatmentGoalNarrative,
        client_primaryobjective: formState.primaryObjective,
        client_secondaryobjective: formState.secondaryObjective,
        client_tertiaryobjective: formState.tertiaryObjective,
        client_intervention1: formState.intervention1,
        client_intervention2: formState.intervention2,
        client_intervention3: formState.intervention3,
        client_intervention4: formState.intervention4,
        client_intervention5: formState.intervention5,
        client_intervention6: formState.intervention6,
        client_nexttreatmentplanupdate: convertedNextUpdate,
        client_privatenote: formState.privateNote
      };

      console.log('💾 Saving treatment plan to database...', {
        clientId: clientData.id,
        updateFields: Object.keys(updates)
      });

      // Step 6: Save to database first (critical operation)
      const { error: dbError, data } = await supabase
        .from('clients')
        .update(updates)
        .eq('id', clientData.id)
        .select();

      if (dbError) {
        console.error('❌ Database save failed:', dbError);
        toast({
          title: "Database Error",
          description: `Failed to save treatment plan: ${dbError.message}`,
          variant: "destructive"
        });
        return;
      }

      console.log('✅ Treatment plan saved to database successfully');

      // Step 7: Generate PDF (non-critical operation)
      let pdfSuccess = false;
      if (treatmentPlanRef.current) {
        try {
          console.log('📄 Generating PDF document...');
          const documentInfo = {
            clientId: clientData.id,
            documentType: 'Treatment Plan',
            documentDate: formState.startDate || new Date(),
            documentTitle: `Treatment Plan - ${format(formState.startDate || new Date(), 'yyyy-MM-dd')}`,
            createdBy: currentUser.id
          };

          const pdfPath = await generateAndSavePDF('treatment-plan-content', documentInfo);
          
          if (pdfPath) {
            console.log('✅ PDF generated and saved successfully:', pdfPath);

            // Step 8: Save clinical document metadata (critical for UI display)
            console.log('💾 Saving treatment plan metadata to clinical_documents table...');
            const { error: dbError } = await supabase
              .from('clinical_documents')
              .insert({
                client_id: documentInfo.clientId,
                document_type: documentInfo.documentType,
                document_date: documentInfo.documentDate,
                document_title: documentInfo.documentTitle,
                file_path: pdfPath,
                created_by: documentInfo.createdBy
              });

            if (dbError) {
              console.error('❌ Failed to save clinical document metadata:', dbError);
              toast({
                title: "Warning",
                description: "Treatment plan saved but may not appear in document list. Please refresh the page.",
                variant: "default"
              });
            } else {
              console.log('✅ Clinical document metadata saved successfully');
              pdfSuccess = true;
            }
          } else {
            console.warn('⚠️ PDF generation returned null - check PDF utils for details');
          }
        } catch (pdfError) {
          console.error('❌ PDF generation failed:', pdfError);
        }
      } else {
        console.warn('⚠️ Treatment plan content ref not available for PDF generation');
      }

      // Step 9: Show appropriate success message
      if (pdfSuccess) {
        toast({
          title: "Success",
          description: "Treatment plan saved and PDF generated successfully"
        });
      } else {
        toast({
          title: "Partially Saved",
          description: "Treatment plan saved to database, but PDF generation failed. You can regenerate the PDF later.",
          variant: "default"
        });
      }

      console.log('🎉 Treatment plan save process completed');
      onClose();

    } catch (err) {
      console.error('💥 Unexpected error during save:', err);
      toast({
        title: "Unexpected Error",
        description: `Failed to save treatment plan: ${err instanceof Error ? err.message : 'Unknown error'}`,
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
      console.log('🔄 Save operation completed, resetting saving state');
    }
  };

  return (
    <Card className="w-full border border-gray-200 rounded-md">
      <CardHeader className="pb-0">
        <CardTitle className="text-lg font-semibold text-valorwell-700">Treatment Plan Template</CardTitle>
        <p className="text-sm text-gray-500 mt-1">
          This is the template used for client treatment plans. This template will be used when creating a new treatment plan from a client's record section.
        </p>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="space-y-6">
          <div 
            id="treatment-plan-content"
            ref={treatmentPlanRef}
            className="border rounded-md p-4 bg-white"
          >
            <h2 className="text-xl font-semibold text-valorwell-800 mb-4">Therapy Treatment Plan</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="space-y-2">
                <Label htmlFor="client-name" className="text-sm text-valorwell-700 font-semibold">Client Name</Label>
                <Input 
                  id="client-name" 
                  placeholder="Enter client name" 
                  value={formState.clientName}
                  onChange={(e) => handleChange('clientName', e.target.value)}
                  disabled // Read-only as this is bound to client data
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="client-dob" className="text-sm text-valorwell-700 font-semibold">Client DOB</Label>
                <Input 
                  id="client-dob" 
                  placeholder="MM/DD/YYYY" 
                  value={formState.clientDob}
                  onChange={(e) => handleChange('clientDob', e.target.value)}
                  disabled // Read-only as this is bound to client data
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="clinician-name" className="text-sm text-valorwell-700 font-semibold">Clinician Name</Label>
                <Input 
                  id="clinician-name" 
                  placeholder="Enter clinician name" 
                  value={formState.clinicianName}
                  onChange={(e) => handleChange('clinicianName', e.target.value)}
                  disabled // Read-only as this is bound to clinician data
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="space-y-2">
                <Label htmlFor="start-date" className="text-sm text-valorwell-700 font-semibold">Treatment Plan Start Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full pl-3 text-left font-normal",
                        !formState.startDate && "text-muted-foreground"
                      )}
                    >
                      {formState.startDate ? format(formState.startDate, "PPP") : <span>Pick a date</span>}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={formState.startDate}
                      onSelect={(date) => handleChange('startDate', date)}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label htmlFor="plan-type" className="text-sm text-valorwell-700 font-semibold">Plan Length</Label>
                <Select 
                  value={formState.planLength}
                  onValueChange={(value) => handleChange('planLength', value)}
                >
                  <SelectTrigger id="plan-type" data-select-value={formState.planLength}>
                    <SelectValue placeholder="Select plan length" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1month">1 month</SelectItem>
                    <SelectItem value="3month">3 month</SelectItem>
                    <SelectItem value="6month">6 month</SelectItem>
                    <SelectItem value="9month">9 month</SelectItem>
                    <SelectItem value="12month">12 month</SelectItem>
                  </SelectContent>
                </Select>
                <span className="select-pdf-value hidden">
                  {formState.planLength === '1month' && '1 month'}
                  {formState.planLength === '3month' && '3 month'}
                  {formState.planLength === '6month' && '6 month'}
                  {formState.planLength === '9month' && '9 month'}
                  {formState.planLength === '12month' && '12 month'}
                </span>
              </div>
              <div className="space-y-2">
                <Label htmlFor="treatment-frequency" className="text-sm text-valorwell-700 font-semibold">Treatment Frequency</Label>
                <Select 
                  value={formState.treatmentFrequency}
                  onValueChange={(value) => handleChange('treatmentFrequency', value)}
                >
                  <SelectTrigger id="treatment-frequency" data-select-value={formState.treatmentFrequency}>
                    <SelectValue placeholder="Select frequency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="biweekly">Bi-Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="asneeded">As Needed</SelectItem>
                  </SelectContent>
                </Select>
                <span className="select-pdf-value hidden">
                  {formState.treatmentFrequency === 'weekly' && 'Weekly'}
                  {formState.treatmentFrequency === 'biweekly' && 'Bi-Weekly'}
                  {formState.treatmentFrequency === 'monthly' && 'Monthly'}
                  {formState.treatmentFrequency === 'asneeded' && 'As Needed'}
                </span>
              </div>
            </div>
            
            <div className="space-y-2 mb-6">
              <Label htmlFor="diagnosis" className="text-sm text-valorwell-700 font-semibold">Diagnosis</Label>
              <DiagnosisSelector 
                value={formState.diagnosisCodes}
                onChange={(codes) => handleChange('diagnosisCodes', codes)}
              />
            </div>
            
            <div className="space-y-2 mb-6">
              <Label htmlFor="problem-narrative" className="text-sm text-valorwell-700 font-semibold">Problem Narrative</Label>
              <Textarea 
                id="problem-narrative" 
                placeholder="Describe the presenting problem" 
                className="min-h-[100px]"
                value={formState.problemNarrative}
                onChange={(e) => handleChange('problemNarrative', e.target.value)}
              />
            </div>
            
            <div className="space-y-2 mb-6">
              <Label htmlFor="treatment-goal" className="text-sm text-valorwell-700 font-semibold">Treatment Goal Narrative</Label>
              <Textarea 
                id="treatment-goal" 
                placeholder="Describe the treatment goals" 
                className="min-h-[100px]"
                value={formState.treatmentGoalNarrative}
                onChange={(e) => handleChange('treatmentGoalNarrative', e.target.value)}
              />
            </div>
            
            <div className="space-y-2 mb-4">
              <Label htmlFor="primary-objective" className="text-sm text-valorwell-700 font-semibold">Primary Objective</Label>
              <Textarea 
                id="primary-objective" 
                placeholder="Describe the primary objective" 
                className="min-h-[100px]"
                value={formState.primaryObjective}
                onChange={(e) => handleChange('primaryObjective', e.target.value)}
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="space-y-2">
                <Label htmlFor="intervention-1" className="text-sm text-valorwell-700 font-semibold">Intervention 1</Label>
                <Input 
                  id="intervention-1" 
                  placeholder="Describe intervention"
                  value={formState.intervention1}
                  onChange={(e) => handleChange('intervention1', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="intervention-2" className="text-sm text-valorwell-700 font-semibold">Intervention 2</Label>
                <Input 
                  id="intervention-2" 
                  placeholder="Describe intervention"
                  value={formState.intervention2}
                  onChange={(e) => handleChange('intervention2', e.target.value)}
                />
              </div>
            </div>
            
            {!showSecondaryObjective && !showTertiaryObjective && (
              <div className="mb-6">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={handleAddObjective}
                  className="flex items-center gap-2"
                >
                  <Plus size={16} /> Add Another Objective
                </Button>
              </div>
            )}
            
            {showSecondaryObjective && (
              <>
                <div className="space-y-2 mt-6 mb-4">
                  <Label htmlFor="secondary-objective" className="text-sm text-valorwell-700 font-semibold">Secondary Objective</Label>
                  <Textarea 
                    id="secondary-objective" 
                    placeholder="Describe the secondary objective" 
                    className="min-h-[100px]"
                    value={formState.secondaryObjective}
                    onChange={(e) => handleChange('secondaryObjective', e.target.value)}
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div className="space-y-2">
                    <Label htmlFor="sec-intervention-1" className="text-sm text-valorwell-700 font-semibold">Intervention 3</Label>
                    <Input 
                      id="sec-intervention-1" 
                      placeholder="Describe intervention"
                      value={formState.intervention3}
                      onChange={(e) => handleChange('intervention3', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sec-intervention-2" className="text-sm text-valorwell-700 font-semibold">Intervention 4</Label>
                    <Input 
                      id="sec-intervention-2" 
                      placeholder="Describe intervention"
                      value={formState.intervention4}
                      onChange={(e) => handleChange('intervention4', e.target.value)}
                    />
                  </div>
                </div>
                
                {!showTertiaryObjective && (
                  <div className="mb-6">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={handleAddObjective}
                      className="flex items-center gap-2"
                    >
                      <Plus size={16} /> Add Another Objective
                    </Button>
                  </div>
                )}
              </>
            )}
            
            {showTertiaryObjective && (
              <>
                <div className="space-y-2 mt-6 mb-4">
                  <Label htmlFor="tertiary-objective" className="text-sm text-valorwell-700 font-semibold">Tertiary Objective</Label>
                  <Textarea 
                    id="tertiary-objective" 
                    placeholder="Describe the tertiary objective" 
                    className="min-h-[100px]"
                    value={formState.tertiaryObjective}
                    onChange={(e) => handleChange('tertiaryObjective', e.target.value)}
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div className="space-y-2">
                    <Label htmlFor="tert-intervention-1" className="text-sm text-valorwell-700 font-semibold">Intervention 5</Label>
                    <Input 
                      id="tert-intervention-1" 
                      placeholder="Describe intervention"
                      value={formState.intervention5}
                      onChange={(e) => handleChange('intervention5', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tert-intervention-2" className="text-sm text-valorwell-700 font-semibold">Intervention 6</Label>
                    <Input 
                      id="tert-intervention-2" 
                      placeholder="Describe intervention"
                      value={formState.intervention6}
                      onChange={(e) => handleChange('intervention6', e.target.value)}
                    />
                  </div>
                </div>
              </>
            )}
            
            <div className="space-y-2 mb-6">
              <Label htmlFor="next-update" className="text-sm text-valorwell-700 font-semibold">Next Treatment Plan Update</Label>
              <Input 
                id="next-update" 
                placeholder="When will this plan be reviewed next"
                value={formState.nextUpdate}
                onChange={(e) => handleChange('nextUpdate', e.target.value)}
              />
            </div>
          </div>
          
          {/* Private note section moved outside the element that will be turned into PDF */}
          <div className="space-y-2 mb-2 private-note-container">
            <Label htmlFor="private-note" className="text-sm text-valorwell-700 font-semibold">Private Note</Label>
            <Input 
              id="private-note" 
              placeholder="Notes visible only to providers"
              value={formState.privateNote}
              onChange={(e) => handleChange('privateNote', e.target.value)}
            />
          </div>
          
          <div className="flex justify-end">
            <Button variant="outline" onClick={onClose} className="mr-2" disabled={isSaving}>Close</Button>
            <Button 
              className="bg-valorwell-700 hover:bg-valorwell-800" 
              onClick={handleSave}
              disabled={isSaving || !isFormValid}
            >
              {isSaving ? "Saving..." : "Save Treatment Plan"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default TreatmentPlanTemplate;
