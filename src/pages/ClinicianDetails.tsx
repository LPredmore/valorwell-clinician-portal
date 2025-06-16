
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { ArrowLeft, Save } from 'lucide-react';

interface Clinician {
  id: string;
  clinician_first_name: string;
  clinician_last_name: string;
  clinician_email: string;
  clinician_phone: string;
  clinician_bio: string;
  clinician_status: string;
  clinician_type: string;
  clinician_license_type: string;
  clinician_npi_number: string;
  clinician_taxonomy_code: string;
  clinician_time_zone: string;
  created_at: string;
}

const ClinicianDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [clinician, setClinician] = useState<Clinician | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    const fetchClinician = async () => {
      if (!id) return;

      try {
        const { data, error } = await supabase
          .from('clinicians')
          .select('*')
          .eq('id', id)
          .single();

        if (error) {
          throw error;
        }

        setClinician(data);
      } catch (error: any) {
        console.error('Error fetching clinician:', error);
        toast({
          title: "Error",
          description: "Failed to load clinician details.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchClinician();
  }, [id, toast]);

  const handleSave = async () => {
    if (!clinician) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('clinicians')
        .update({
          clinician_first_name: clinician.clinician_first_name,
          clinician_last_name: clinician.clinician_last_name,
          clinician_email: clinician.clinician_email,
          clinician_phone: clinician.clinician_phone,
          clinician_bio: clinician.clinician_bio,
          clinician_type: clinician.clinician_type,
          clinician_license_type: clinician.clinician_license_type,
          clinician_npi_number: clinician.clinician_npi_number,
          clinician_taxonomy_code: clinician.clinician_taxonomy_code,
          clinician_time_zone: clinician.clinician_time_zone,
        })
        .eq('id', clinician.id);

      if (error) {
        throw error;
      }

      toast({
        title: "Success",
        description: "Clinician details updated successfully.",
      });
      setIsEditing(false);
    } catch (error: any) {
      console.error('Error updating clinician:', error);
      toast({
        title: "Error",
        description: "Failed to update clinician details.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="space-y-4">
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!clinician) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Clinician Not Found</h1>
          <Button onClick={() => navigate('/settings')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Settings
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <Button 
          variant="outline" 
          onClick={() => navigate('/settings')}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Settings
        </Button>
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">
            {clinician.clinician_first_name} {clinician.clinician_last_name}
          </h1>
          <div className="space-x-2">
            {isEditing ? (
              <>
                <Button variant="outline" onClick={() => setIsEditing(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={isSaving}>
                  <Save className="mr-2 h-4 w-4" />
                  {isSaving ? "Saving..." : "Save"}
                </Button>
              </>
            ) : (
              <Button onClick={() => setIsEditing(true)}>
                Edit
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
            <CardDescription>Basic clinician details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName">First Name</Label>
                {isEditing ? (
                  <Input
                    id="firstName"
                    value={clinician.clinician_first_name || ''}
                    onChange={(e) => setClinician({...clinician, clinician_first_name: e.target.value})}
                  />
                ) : (
                  <p className="text-sm text-gray-600 py-2">{clinician.clinician_first_name || 'Not provided'}</p>
                )}
              </div>
              <div>
                <Label htmlFor="lastName">Last Name</Label>
                {isEditing ? (
                  <Input
                    id="lastName"
                    value={clinician.clinician_last_name || ''}
                    onChange={(e) => setClinician({...clinician, clinician_last_name: e.target.value})}
                  />
                ) : (
                  <p className="text-sm text-gray-600 py-2">{clinician.clinician_last_name || 'Not provided'}</p>
                )}
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                {isEditing ? (
                  <Input
                    id="email"
                    type="email"
                    value={clinician.clinician_email || ''}
                    onChange={(e) => setClinician({...clinician, clinician_email: e.target.value})}
                  />
                ) : (
                  <p className="text-sm text-gray-600 py-2">{clinician.clinician_email || 'Not provided'}</p>
                )}
              </div>
              <div>
                <Label htmlFor="phone">Phone</Label>
                {isEditing ? (
                  <Input
                    id="phone"
                    value={clinician.clinician_phone || ''}
                    onChange={(e) => setClinician({...clinician, clinician_phone: e.target.value})}
                  />
                ) : (
                  <p className="text-sm text-gray-600 py-2">{clinician.clinician_phone || 'Not provided'}</p>
                )}
              </div>
            </div>
            <div>
              <Label htmlFor="bio">Bio</Label>
              {isEditing ? (
                <Textarea
                  id="bio"
                  value={clinician.clinician_bio || ''}
                  onChange={(e) => setClinician({...clinician, clinician_bio: e.target.value})}
                  rows={4}
                />
              ) : (
                <p className="text-sm text-gray-600 py-2">{clinician.clinician_bio || 'Not provided'}</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Professional Information</CardTitle>
            <CardDescription>License and certification details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="type">Clinician Type</Label>
                {isEditing ? (
                  <Input
                    id="type"
                    value={clinician.clinician_type || ''}
                    onChange={(e) => setClinician({...clinician, clinician_type: e.target.value})}
                  />
                ) : (
                  <p className="text-sm text-gray-600 py-2">{clinician.clinician_type || 'Not provided'}</p>
                )}
              </div>
              <div>
                <Label htmlFor="licenseType">License Type</Label>
                {isEditing ? (
                  <Input
                    id="licenseType"
                    value={clinician.clinician_license_type || ''}
                    onChange={(e) => setClinician({...clinician, clinician_license_type: e.target.value})}
                  />
                ) : (
                  <p className="text-sm text-gray-600 py-2">{clinician.clinician_license_type || 'Not provided'}</p>
                )}
              </div>
              <div>
                <Label htmlFor="npi">NPI Number</Label>
                {isEditing ? (
                  <Input
                    id="npi"
                    value={clinician.clinician_npi_number || ''}
                    onChange={(e) => setClinician({...clinician, clinician_npi_number: e.target.value})}
                  />
                ) : (
                  <p className="text-sm text-gray-600 py-2">{clinician.clinician_npi_number || 'Not provided'}</p>
                )}
              </div>
              <div>
                <Label htmlFor="taxonomy">Taxonomy Code</Label>
                {isEditing ? (
                  <Input
                    id="taxonomy"
                    value={clinician.clinician_taxonomy_code || ''}
                    onChange={(e) => setClinician({...clinician, clinician_taxonomy_code: e.target.value})}
                  />
                ) : (
                  <p className="text-sm text-gray-600 py-2">{clinician.clinician_taxonomy_code || 'Not provided'}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ClinicianDetails;
