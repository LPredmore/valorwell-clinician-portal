import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from "@/hooks/use-toast";
import { useUser } from '@/context/UserContext';
import { Pencil, Save, X, Upload, Camera, User } from 'lucide-react';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { getTimeZoneEnumOptions, getTimeZoneEnumLabel } from '@/utils/timezoneEnumOptions';

interface Clinician {
  id: string;
  clinician_first_name: string | null;
  clinician_last_name: string | null;
  clinician_email: string | null;
  clinician_phone: string | null;
  clinician_bio: string | null;
  clinician_professional_name: string | null;
  clinician_nameinsurance: string | null;
  clinician_npi_number: string | null;
  clinician_taxonomy_code: string | null;
  clinician_license_type: string | null;
  clinician_status: string | null;
  clinician_type: string | null;
  clinician_licensed_states: string[] | null;
  clinician_image_url: string | null;
  clinician_time_zone: string | null;
}

const ClinicianDetails = () => {
  const { clinicianId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { userId, userRole } = useUser();

  const [clinician, setClinician] = useState<Clinician | null>(null);
  const [editedClinician, setEditedClinician] = useState<Clinician | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedStates, setSelectedStates] = useState<string[]>([]);
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const licenseTypes = [
    "LPC", 
    "LCSW", 
    "LMHT", 
    "LMFT", 
    "Psychologist", 
    "SLP"
  ];

  const clinicianTypeOptions = [
    "Mental Health",
    "Speech Therapy"
  ];

  const states = [
    { code: "Alabama", name: "Alabama" },
    { code: "Alaska", name: "Alaska" },
    { code: "Arizona", name: "Arizona" },
    { code: "Arkansas", name: "Arkansas" },
    { code: "California", name: "California" },
    { code: "Colorado", name: "Colorado" },
    { code: "Connecticut", name: "Connecticut" },
    { code: "Delaware", name: "Delaware" },
    { code: "Florida", name: "Florida" },
    { code: "Georgia", name: "Georgia" },
    { code: "Hawaii", name: "Hawaii" },
    { code: "Idaho", name: "Idaho" },
    { code: "Illinois", name: "Illinois" },
    { code: "Indiana", name: "Indiana" },
    { code: "Iowa", name: "Iowa" },
    { code: "Kansas", name: "Kansas" },
    { code: "Kentucky", name: "Kentucky" },
    { code: "Louisiana", name: "Louisiana" },
    { code: "Maine", name: "Maine" },
    { code: "Maryland", name: "Maryland" },
    { code: "Massachusetts", name: "Massachusetts" },
    { code: "Michigan", name: "Michigan" },
    { code: "Minnesota", name: "Minnesota" },
    { code: "Mississippi", name: "Mississippi" },
    { code: "Missouri", name: "Missouri" },
    { code: "Montana", name: "Montana" },
    { code: "Nebraska", name: "Nebraska" },
    { code: "Nevada", name: "Nevada" },
    { code: "New Hampshire", name: "New Hampshire" },
    { code: "New Jersey", name: "New Jersey" },
    { code: "New Mexico", name: "New Mexico" },
    { code: "New York", name: "New York" },
    { code: "North Carolina", name: "North Carolina" },
    { code: "North Dakota", name: "North Dakota" },
    { code: "Ohio", name: "Ohio" },
    { code: "Oklahoma", name: "Oklahoma" },
    { code: "Oregon", name: "Oregon" },
    { code: "Pennsylvania", name: "Pennsylvania" },
    { code: "Rhode Island", name: "Rhode Island" },
    { code: "South Carolina", name: "South Carolina" },
    { code: "South Dakota", name: "South Dakota" },
    { code: "Tennessee", name: "Tennessee" },
    { code: "Texas", name: "Texas" },
    { code: "Utah", name: "Utah" },
    { code: "Vermont", name: "Vermont" },
    { code: "Virginia", name: "Virginia" },
    { code: "Washington", name: "Washington" },
    { code: "West Virginia", name: "West Virginia" },
    { code: "Wisconsin", name: "Wisconsin" },
    { code: "Wyoming", name: "Wyoming" }
  ];

  useEffect(() => {
    if (clinicianId) {
      // Check if user has permission to view this profile
      if (userRole === 'admin') {
        // Admins can view any clinician profile
        fetchClinicianData();
      } else if (userRole === 'clinician' && userId === clinicianId) {
        // Clinicians can only view their own profile
        fetchClinicianData();
      } else {
        // Unauthorized access
        toast({
          title: "Access Denied",
          description: "You don't have permission to view this profile.",
          variant: "destructive",
        });
        navigate('/calendar');
      }
    }
  }, [clinicianId, userId, userRole, navigate, toast]);

  useEffect(() => {
    if (clinician?.clinician_licensed_states) {
      const fullStateNames = clinician.clinician_licensed_states.map(state => {
        if (states.some(s => s.name === state)) {
          return state;
        }
        const stateObj = states.find(s => s.code === state);
        return stateObj ? stateObj.name : state;
      });
      setSelectedStates(fullStateNames);
    }
  }, [clinician]);

  useEffect(() => {
    if (clinician?.clinician_image_url) {
      setImagePreview(clinician.clinician_image_url);
    }
  }, [clinician]);

  useEffect(() => {
    if (profileImage) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(profileImage);
    }
  }, [profileImage]);

  const fetchClinicianData = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('clinicians')
        .select('*')
        .eq('id', clinicianId)
        .single();
      
      if (error) {
        throw error;
      }
      
      console.log("Fetched clinician data:", data);
      setClinician(data);
      setEditedClinician(data);
      if (data.clinician_licensed_states) {
        const fullStateNames = data.clinician_licensed_states.map(state => {
          if (states.some(s => s.name === state)) {
            return state;
          }
          const stateObj = states.find(s => s.code === state);
          return stateObj ? stateObj.name : state;
        });
        setSelectedStates(fullStateNames);
      }
      
      if (data.clinician_image_url) {
        setImagePreview(data.clinician_image_url);
      }
    } catch (error) {
      console.error('Error fetching clinician:', error);
      toast({
        title: "Error",
        description: "Failed to fetch clinician details.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof Clinician, value: string) => {
    if (editedClinician) {
      console.log(`Updating ${field} to ${value}`);
      setEditedClinician({
        ...editedClinician,
        [field]: value
      });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files && e.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid file type",
          description: "Please select an image file.",
          variant: "destructive",
        });
        return;
      }
      
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Image size should be less than 5MB.",
          variant: "destructive",
        });
        return;
      }
      
      setProfileImage(file);
    }
  };

  const uploadProfileImage = async (): Promise<string | null> => {
    if (!profileImage || !clinicianId) return null;
    
    setIsUploading(true);
    
    try {
      const fileExt = profileImage.name.split('.').pop();
      const fileName = `${clinicianId}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;
      
      console.log("Attempting to upload file to storage bucket:", filePath);
      
      const { error: uploadError, data } = await supabase.storage
        .from('clinician-images')
        .upload(filePath, profileImage, {
          cacheControl: '3600',
          upsert: true
        });
      
      if (uploadError) {
        console.error("Error uploading file:", uploadError);
        throw uploadError;
      }
      
      console.log("Upload successful, data:", data);
      
      const { data: publicUrlData } = supabase.storage
        .from('clinician-images')
        .getPublicUrl(filePath);
      
      console.log("Image uploaded successfully:", publicUrlData.publicUrl);
      
      return publicUrlData.publicUrl;
    } catch (error) {
      console.error('Error uploading profile image:', error);
      toast({
        title: "Error",
        description: `Failed to upload profile image: ${error.message || "Unknown error"}`,
        variant: "destructive",
      });
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async () => {
    try {
      if (!editedClinician) return;
      
      let imageUrl = editedClinician.clinician_image_url;
      
      if (profileImage) {
        console.log("Uploading profile image...");
        const uploadedUrl = await uploadProfileImage();
        if (uploadedUrl) {
          console.log("Profile image uploaded, URL:", uploadedUrl);
          imageUrl = uploadedUrl;
        } else {
          console.error("Failed to upload profile image");
        }
      }
      
      const updatedClinicianData = {
        ...editedClinician,
        clinician_licensed_states: selectedStates,
        clinician_type: editedClinician.clinician_type,
        clinician_license_type: editedClinician.clinician_license_type,
        clinician_image_url: imageUrl
      };
      
      console.log("Saving clinician data:", updatedClinicianData);
      
      const { error } = await supabase
        .from('clinicians')
        .update(updatedClinicianData)
        .eq('id', clinicianId);
      
      if (error) {
        console.error("Error updating clinician:", error);
        throw error;
      }
      
      setClinician({
        ...editedClinician,
        clinician_licensed_states: selectedStates,
        clinician_image_url: imageUrl
      });
      setIsEditing(false);
      setProfileImage(null);
      
      toast({
        title: "Success",
        description: "Clinician details updated successfully.",
      });
      
      fetchClinicianData();
      
    } catch (error) {
      console.error('Error updating clinician:', error);
      toast({
        title: "Error",
        description: `Failed to update clinician details: ${error.message || "Unknown error"}`,
        variant: "destructive",
      });
    }
  };

  const handleCancel = () => {
    setEditedClinician(clinician);
    if (clinician?.clinician_licensed_states) {
      setSelectedStates(clinician.clinician_licensed_states);
    } else {
      setSelectedStates([]);
    }
    setIsEditing(false);
    setProfileImage(null);
    setImagePreview(clinician?.clinician_image_url || null);
  };

  const toggleState = (stateName: string) => {
    setSelectedStates(current => 
      current.includes(stateName)
        ? current.filter(s => s !== stateName)
        : [...current, stateName]
    );
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-full">
          <p>Loading clinician details...</p>
        </div>
      </Layout>
    );
  }

  if (!clinician) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-full">
          <p>Clinician not found.</p>
        </div>
      </Layout>
    );
  }

  // Determine if current user can edit this profile
  const canEdit = userRole === 'admin' || (userRole === 'clinician' && userId === clinicianId);

  return (
    <Layout>
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">
            {clinician.clinician_first_name} {clinician.clinician_last_name}
            {userId === clinicianId && <span className="text-sm text-gray-500 ml-2">(Your Profile)</span>}
          </h1>
          <p className="text-gray-500">{clinician.clinician_email}</p>
        </div>
        <div className="flex gap-2">
          {canEdit && (
            <>
              {isEditing ? (
                <>
                  <Button variant="outline" onClick={handleCancel} className="flex items-center gap-1">
                    <X size={16} /> Cancel
                  </Button>
                  <Button 
                    onClick={handleSave} 
                    className="flex items-center gap-1 bg-valorwell-700 hover:bg-valorwell-800"
                    disabled={isUploading}
                  >
                    <Save size={16} /> Save Changes
                  </Button>
                </>
              ) : (
                <Button onClick={() => setIsEditing(true)} className="flex items-center gap-1">
                  <Pencil size={16} /> Edit
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-6">
              <div className="md:w-1/3">
                <Label className="block text-sm font-medium text-gray-700 mb-2">
                  Profile Picture
                </Label>
                <div className="flex flex-col items-center">
                  <div className="relative w-48 h-48 mb-4 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center">
                    {imagePreview ? (
                      <img 
                        src={imagePreview} 
                        alt="Profile" 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User size={64} className="text-gray-400" />
                    )}
                    
                    {isEditing && (
                      <label 
                        htmlFor="profile-image" 
                        className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 text-white cursor-pointer opacity-0 hover:opacity-100 transition-opacity rounded-full"
                      >
                        <div className="flex flex-col items-center">
                          <Camera size={32} />
                          <span className="text-sm mt-2">Upload Photo</span>
                        </div>
                        <input 
                          id="profile-image" 
                          type="file" 
                          accept="image/*" 
                          className="hidden" 
                          onChange={handleFileChange}
                        />
                      </label>
                    )}
                  </div>
                  
                  {isEditing && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      type="button" 
                      className="text-sm font-medium text-gray-700 mb-2"
                      onClick={() => document.getElementById('profile-image')?.click()}
                    >
                      <Upload size={16} className="mr-1" />
                      Upload Image
                    </Button>
                  )}
                  
                  {isEditing && profileImage && (
                    <p className="text-sm text-gray-500 text-center">
                      {profileImage.name} ({Math.round(profileImage.size / 1024)} KB)
                    </p>
                  )}
                </div>
              </div>
              
              <div className="md:w-2/3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      First Name
                    </label>
                    {isEditing ? (
                      <Input 
                        type="text" 
                        value={editedClinician?.clinician_first_name || ''} 
                        onChange={(e) => handleInputChange('clinician_first_name', e.target.value)}
                      />
                    ) : (
                      <p className="p-2 border rounded-md bg-gray-50">
                        {clinician.clinician_first_name || '—'}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Last Name
                    </label>
                    {isEditing ? (
                      <Input 
                        type="text" 
                        value={editedClinician?.clinician_last_name || ''} 
                        onChange={(e) => handleInputChange('clinician_last_name', e.target.value)}
                      />
                    ) : (
                      <p className="p-2 border rounded-md bg-gray-50">
                        {clinician.clinician_last_name || '—'}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Name for Insurance
                    </label>
                    {isEditing ? (
                      <Input 
                        type="text" 
                        value={editedClinician?.clinician_nameinsurance || ''} 
                        onChange={(e) => handleInputChange('clinician_nameinsurance', e.target.value)}
                      />
                    ) : (
                      <p className="p-2 border rounded-md bg-gray-50">
                        {clinician.clinician_nameinsurance || 
                          (clinician.clinician_first_name && clinician.clinician_last_name 
                            ? `${clinician.clinician_first_name} ${clinician.clinician_last_name}` 
                            : '—')}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Professional Name
                    </label>
                    {isEditing ? (
                      <Input 
                        type="text" 
                        value={editedClinician?.clinician_professional_name || ''} 
                        onChange={(e) => handleInputChange('clinician_professional_name', e.target.value)}
                      />
                    ) : (
                      <p className="p-2 border rounded-md bg-gray-50">
                        {clinician.clinician_professional_name || '—'}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    {isEditing ? (
                      <Input 
                        type="email" 
                        value={editedClinician?.clinician_email || ''} 
                        onChange={(e) => handleInputChange('clinician_email', e.target.value)}
                      />
                    ) : (
                      <p className="p-2 border rounded-md bg-gray-50">
                        {clinician.clinician_email || '—'}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Time Zone
                    </label>
                    {isEditing ? (
                      <Select 
                        value={editedClinician?.clinician_time_zone || 'America/Chicago'} 
                        onValueChange={(value) => handleInputChange('clinician_time_zone', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select time zone" />
                        </SelectTrigger>
                        <SelectContent>
                          {getTimeZoneEnumOptions().map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <p className="p-2 border rounded-md bg-gray-50">
                        {getTimeZoneEnumLabel(clinician.clinician_time_zone || 'America/Chicago')}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Biography</CardTitle>
          </CardHeader>
          <CardContent>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Biography
            </label>
            {isEditing ? (
              <Textarea 
                value={editedClinician?.clinician_bio || ''} 
                onChange={(e) => handleInputChange('clinician_bio', e.target.value)}
                className="min-h-[100px]"
              />
            ) : (
              <p className="p-2 border rounded-md bg-gray-50 min-h-[100px] whitespace-pre-wrap">
                {clinician.clinician_bio || '—'}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>License Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  NPI Number
                </label>
                {isEditing ? (
                  <Input 
                    type="text" 
                    value={editedClinician?.clinician_npi_number || ''} 
                    onChange={(e) => handleInputChange('clinician_npi_number', e.target.value)}
                    placeholder="NPI number"
                  />
                ) : (
                  <p className="p-2 border rounded-md bg-gray-50">
                    {clinician.clinician_npi_number || '—'}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Taxonomy Code
                </label>
                {isEditing ? (
                  <Input 
                    type="text" 
                    value={editedClinician?.clinician_taxonomy_code || ''} 
                    onChange={(e) => handleInputChange('clinician_taxonomy_code', e.target.value)}
                    placeholder="Taxonomy code"
                  />
                ) : (
                  <p className="p-2 border rounded-md bg-gray-50">
                    {clinician.clinician_taxonomy_code || '—'}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Clinician License Type
                </label>
                {isEditing ? (
                  <Select 
                    value={editedClinician?.clinician_license_type || ''}
                    onValueChange={(value) => handleInputChange('clinician_license_type', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select license type" />
                    </SelectTrigger>
                    <SelectContent>
                      {licenseTypes.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="p-2 border rounded-md bg-gray-50">
                    {clinician.clinician_license_type || '—'}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Licensed States
                </label>
                {isEditing ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="w-full justify-start">
                        {selectedStates.length > 0 ? 
                          `${selectedStates.length} state${selectedStates.length > 1 ? 's' : ''} selected` : 
                          'Select states'
                        }
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56 max-h-[300px] overflow-y-auto">
                      {states.map((state) => (
                        <DropdownMenuCheckboxItem
                          key={state.name}
                          checked={selectedStates.includes(state.name)}
                          onCheckedChange={() => toggleState(state.name)}
                        >
                          {state.name}
                        </DropdownMenuCheckboxItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <p className="p-2 border rounded-md bg-gray-50">
                    {clinician.clinician_licensed_states && clinician.clinician_licensed_states.length > 0 
                      ? clinician.clinician_licensed_states.join(', ')
                      : '—'
                    }
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Role</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Clinician Type
                </label>
                {isEditing ? (
                  <Select 
                    value={editedClinician?.clinician_type || ''}
                    onValueChange={(value) => handleInputChange('clinician_type', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select clinician type" />
                    </SelectTrigger>
                    <SelectContent>
                      {clinicianTypeOptions.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="p-2 border rounded-md bg-gray-50">
                    {clinician.clinician_type || '—'}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {canEdit && isEditing && (
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button 
              onClick={handleSave} 
              className="bg-valorwell-700 hover:bg-valorwell-800"
              disabled={isUploading}
            >
              Save Changes
            </Button>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default ClinicianDetails;
