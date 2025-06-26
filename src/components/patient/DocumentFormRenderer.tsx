
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { DocumentAssignment, saveClientHistoryForm, submitInformedConsentForm, updateDocumentStatus } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { FileText, Save, Check } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { supabase } from '@/integrations/supabase/client';

interface DocumentFormRendererProps {
  assignment: DocumentAssignment;
  clientId: string;
  onSave: () => void;
  onCancel: () => void;
  onComplete: () => void;
}

const DocumentFormRenderer: React.FC<DocumentFormRendererProps> = ({
  assignment,
  clientId,
  onSave,
  onCancel,
  onComplete
}) => {
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  
  // Use react-hook-form for form management
  const form = useForm({
    defaultValues: {
      // Default values will depend on the form type
      // For Client History Form
      personalStrengths: '',
      hobbies: '',
      educationLevel: '',
      occupationDetails: '',
      sleepHours: '',
      currentIssues: '',
      progressionOfIssues: '',
      relationshipProblems: '',
      counselingGoals: '',
      isMarried: false,
      hasPastSpouses: false,
      hasReceivedMentalHealthTreatment: false,
      hospitalizedPsychiatric: false,
      attemptedSuicide: false,
      psychHold: false,
      takesMedications: false,
      selectedSymptoms: [] as string[],
      selectedMedicalConditions: [] as string[],
      selectedChildhoodExperiences: [] as string[],
      emergencyName: '',
      emergencyPhone: '',
      emergencyRelationship: '',
      alcoholUse: '',
      tobaccoUse: '',
      drugUse: '',
      additionalInfo: '',
      signature: '',
      
      // For Informed Consent
      consentName: '',
      consentSignature: '',
      consentDate: new Date().toISOString().split('T')[0],
      consentAcknowledge: false,
      
      // Common fields
      clientId: clientId
    }
  });
  
  // Handle saving draft (mark as in_progress)
  const handleSaveDraft = async () => {
    setIsSaving(true);
    try {
      // Update the document status to in_progress
      const result = await updateDocumentStatus(assignment.id, 'in_progress');
      
      if (result.success) {
        // Get form data
        const formData = form.getValues();
        
        // Here we would typically save the form data to a table
        // For this example, we'll just log it
        console.log("Form data saved as draft:", formData);
        
        toast({
          title: "Progress saved",
          description: "Your information has been saved as a draft.",
        });
        
        onSave();
      } else {
        throw new Error("Failed to update document status");
      }
    } catch (error) {
      console.error('Error saving draft:', error);
      toast({
        title: "Error",
        description: "Failed to save your progress",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  // Handle form submission (mark as completed)
  const handleSubmitForm = async () => {
    setIsSubmitting(true);
    try {
      // Validate form data
      await form.trigger();
      if (!form.formState.isValid) {
        toast({
          title: "Validation Error",
          description: "Please fill out all required fields",
          variant: "destructive"
        });
        setIsSubmitting(false);
        return;
      }
      
      const formData = form.getValues();
      let result;
      
      // Process form based on document type
      if (assignment.document_name === "Client History Form") {
        result = await saveClientHistoryForm(formData);
      } else if (assignment.document_name === "Informed Consent") {
        result = await submitInformedConsentForm(clientId, formData);
      } else {
        throw new Error(`Unsupported document type: ${assignment.document_name}`);
      }
      
      if (result.success) {
        // Mark the document assignment as completed
        await updateDocumentStatus(assignment.id, 'completed');
        
        toast({
          title: "Form Submitted",
          description: `Your ${assignment.document_name} has been submitted successfully.`,
        });
        
        onComplete();
      } else {
        throw new Error("Failed to submit form");
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      toast({
        title: "Error",
        description: "Failed to submit your form",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Render different forms based on document_name
  const renderFormFields = () => {
    switch (assignment.document_name) {
      case "Client History Form":
        return renderClientHistoryForm();
      case "Informed Consent":
        return renderInformedConsentForm();
      default:
        return (
          <div className="py-4">
            <p>Unsupported document type: {assignment.document_name}</p>
          </div>
        );
    }
  };
  
  // Client History Form template
  const renderClientHistoryForm = () => {
    return (
      <>
        <div className="space-y-4">
          <div className="space-y-2">
            <h3 className="text-lg font-medium">Personal Information</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="personalStrengths">Personal Strengths</Label>
                <Textarea 
                  id="personalStrengths"
                  placeholder="Your personal strengths..."
                  {...form.register("personalStrengths")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="hobbies">Hobbies & Interests</Label>
                <Textarea 
                  id="hobbies"
                  placeholder="Your hobbies and interests..."
                  {...form.register("hobbies")}
                />
              </div>
            </div>
            
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="educationLevel">Education Level</Label>
                <Select onValueChange={(value) => form.setValue("educationLevel", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select education level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high-school">High School</SelectItem>
                    <SelectItem value="some-college">Some College</SelectItem>
                    <SelectItem value="associates">Associate's Degree</SelectItem>
                    <SelectItem value="bachelors">Bachelor's Degree</SelectItem>
                    <SelectItem value="masters">Master's Degree</SelectItem>
                    <SelectItem value="doctorate">Doctorate</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="occupationDetails">Occupation</Label>
                <Input 
                  id="occupationDetails"
                  placeholder="Your current occupation..."
                  {...form.register("occupationDetails")}
                />
              </div>
            </div>
          </div>
          
          <Separator />
          
          <div className="space-y-2">
            <h3 className="text-lg font-medium">Health Information</h3>
            <div className="space-y-2">
              <Label htmlFor="sleepHours">Average Hours of Sleep per Night</Label>
              <Input 
                id="sleepHours"
                type="number"
                placeholder="Hours of sleep..."
                {...form.register("sleepHours")}
              />
            </div>
            
            <div className="space-y-2 mt-4">
              <Label>Health Conditions (Select all that apply)</Label>
              <div className="grid gap-2 md:grid-cols-2">
                {['Anxiety', 'Depression', 'ADHD', 'Insomnia', 'Chronic Pain', 'High Blood Pressure', 'Diabetes', 'Thyroid Issues'].map((condition) => (
                  <div className="flex items-center space-x-2" key={condition}>
                    <Checkbox 
                      id={`condition-${condition}`} 
                      onCheckedChange={(checked) => {
                        const currentConditions = form.getValues().selectedMedicalConditions || [];
                        if (checked) {
                          form.setValue("selectedMedicalConditions", [...currentConditions, condition]);
                        } else {
                          form.setValue("selectedMedicalConditions", 
                            currentConditions.filter(c => c !== condition)
                          );
                        }
                      }} 
                    />
                    <label
                      htmlFor={`condition-${condition}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {condition}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          <Separator />
          
          <div className="space-y-2">
            <h3 className="text-lg font-medium">Mental Health History</h3>
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Switch 
                      id="hasReceivedMentalHealthTreatment"
                      onCheckedChange={(checked) => form.setValue("hasReceivedMentalHealthTreatment", checked)} 
                    />
                    <Label htmlFor="hasReceivedMentalHealthTreatment">Previous mental health treatment</Label>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Switch 
                      id="hospitalizedPsychiatric"
                      onCheckedChange={(checked) => form.setValue("hospitalizedPsychiatric", checked)} 
                    />
                    <Label htmlFor="hospitalizedPsychiatric">Previous psychiatric hospitalization</Label>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="currentIssues">Current Issues/Concerns</Label>
                <Textarea 
                  id="currentIssues"
                  placeholder="Describe your current concerns..."
                  rows={4}
                  {...form.register("currentIssues")}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="progressionOfIssues">How and when did these issues begin?</Label>
                <Textarea 
                  id="progressionOfIssues"
                  placeholder="Describe the progression of your issues..."
                  rows={4}
                  {...form.register("progressionOfIssues")}
                />
              </div>
            </div>
          </div>
          
          <Separator />
          
          <div className="space-y-2">
            <h3 className="text-lg font-medium">Treatment Goals</h3>
            <div className="space-y-2">
              <Label htmlFor="counselingGoals">What do you hope to achieve in counseling?</Label>
              <Textarea 
                id="counselingGoals"
                placeholder="Your goals for therapy..."
                rows={4}
                {...form.register("counselingGoals")}
              />
            </div>
          </div>
          
          <Separator />
          
          <div className="space-y-2">
            <h3 className="text-lg font-medium">Emergency Contact</h3>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="emergencyName">Name</Label>
                <Input 
                  id="emergencyName"
                  placeholder="Emergency contact name..."
                  {...form.register("emergencyName")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="emergencyPhone">Phone</Label>
                <Input 
                  id="emergencyPhone"
                  placeholder="Emergency contact phone..."
                  {...form.register("emergencyPhone")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="emergencyRelationship">Relationship</Label>
                <Input 
                  id="emergencyRelationship"
                  placeholder="Relationship to you..."
                  {...form.register("emergencyRelationship")}
                />
              </div>
            </div>
          </div>
          
          <Separator />
          
          <div className="space-y-2">
            <h3 className="text-lg font-medium">Signature</h3>
            <div className="space-y-2">
              <Label htmlFor="signature">Signature</Label>
              <Input 
                id="signature"
                placeholder="Type your full name to sign..."
                {...form.register("signature")}
              />
            </div>
          </div>
        </div>
      </>
    );
  };
  
  // Informed Consent Form template
  const renderInformedConsentForm = () => {
    return (
      <div className="space-y-6">
        <div className="prose max-w-none">
          <h3>Informed Consent for Therapy Services</h3>
          
          <p className="text-sm">
            This document contains important information about our professional services and business policies. 
            Please read it carefully and note any questions you may have so we can discuss them at our next meeting.
          </p>
          
          <h4>Therapy Services</h4>
          <p className="text-sm">
            Therapy is a relationship between people that works in part because of clearly defined rights and responsibilities 
            held by each person. As a client, you have certain rights and responsibilities that are important for you to understand. 
            There are also legal limitations to those rights that you should be aware of. Your therapist has corresponding 
            responsibilities to you. These rights and responsibilities are described in the following sections.
          </p>
          
          <h4>Confidentiality</h4>
          <p className="text-sm">
            The session content and all relevant materials to your treatment will be held confidential unless you request 
            in writing to have all or portions of such content released to a specifically named person/persons. Limitations 
            of such client held privilege of confidentiality exist and are itemized below:
          </p>
          <ul className="text-sm">
            <li>If a client threatens or attempts to commit suicide or otherwise conducts themselves in a manner that 
                threatens their health or safety, the therapist may take necessary steps to ensure safety.</li>
            <li>If a client threatens grave bodily harm to another person, the therapist may be required to notify 
                law enforcement or the potential victim.</li>
            <li>If a therapist has reason to suspect that a child, elderly, or disabled person is being abused, 
                the therapist is required to report this to the appropriate authorities.</li>
            <li>If a legal action is brought against the therapist by the client, the therapist may disclose relevant 
                information regarding the client in order to defend themselves.</li>
            <li>If a client's insurance company or other payer requires information in order to process claims or 
                authorize services, the therapist may disclose this information.</li>
          </ul>
          
          <h4>Fees and Insurance</h4>
          <p className="text-sm">
            You will be expected to pay for each session at the time it is held, unless we agree otherwise or unless 
            you have insurance coverage that requires another arrangement. If your account has not been paid for more 
            than 60 days and arrangements for payment have not been agreed upon, we may use legal means to secure the payment.
          </p>
          
          <h4>Cancellation Policy</h4>
          <p className="text-sm">
            If you need to cancel an appointment, we require that you provide at least 24 hours notice. If you miss a 
            session without canceling, or cancel with less than 24 hours notice, you may be required to pay for the session.
          </p>
          
          <h4>Professional Records</h4>
          <p className="text-sm">
            The laws and standards of our profession require that we keep treatment records. You are entitled to receive 
            a copy of your records, or we can prepare a summary for you instead. Because these are professional records, 
            they can be misinterpreted or upsetting to untrained readers. If you wish to see your records, we recommend 
            that you review them in the presence of your therapist so that they can discuss the contents.
          </p>
        </div>
        
        <div className="space-y-4">
          <div className="flex flex-col space-y-1.5">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="consentAcknowledge"
                onCheckedChange={(checked) => form.setValue("consentAcknowledge", checked === true)} 
              />
              <Label htmlFor="consentAcknowledge">
                I acknowledge that I have read, understood, and agree to the terms presented above.
              </Label>
            </div>
          </div>
          
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="consentName">Full Name</Label>
              <Input 
                id="consentName"
                placeholder="Your full name..."
                {...form.register("consentName")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="consentDate">Date</Label>
              <Input 
                id="consentDate"
                type="date"
                defaultValue={new Date().toISOString().split('T')[0]}
                {...form.register("consentDate")}
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="consentSignature">Signature (Type your full name)</Label>
            <Input 
              id="consentSignature"
              placeholder="Type your full name to sign..."
              {...form.register("consentSignature")}
            />
          </div>
        </div>
      </div>
    );
  };
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          {assignment.document_name}
        </CardTitle>
        <CardDescription>
          Please complete this form and submit when ready
        </CardDescription>
      </CardHeader>
      <CardContent>
        {renderFormFields()}
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={onCancel} disabled={isSaving || isSubmitting}>
          Cancel
        </Button>
        <div className="space-x-2">
          <Button 
            variant="outline" 
            onClick={handleSaveDraft} 
            disabled={isSaving || isSubmitting}
          >
            {isSaving ? "Saving..." : (
              <>
                <Save className="h-4 w-4 mr-1" />
                Save Draft
              </>
            )}
          </Button>
          <Button 
            onClick={handleSubmitForm} 
            disabled={isSaving || isSubmitting}
          >
            {isSubmitting ? "Submitting..." : (
              <>
                <Check className="h-4 w-4 mr-1" />
                Submit
              </>
            )}
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
};

export default DocumentFormRenderer;
