
import { useState, useEffect } from 'react';
import { Pencil, Save, X } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { fetchPracticeInfo, updatePracticeInfo, PracticeInfo } from '@/integrations/supabase/client';
import { Button } from "@/components/ui/button";

const PracticeTab = () => {
  const [practiceInfo, setPracticeInfo] = useState<PracticeInfo>({
    id: '',
    practice_name: '',
    practice_npi: '',
    practice_taxid: '',
    practice_taxonomy: '',
    practice_address1: '',
    practice_address2: '',
    practice_city: '',
    practice_state: '',
    practice_zip: ''
  });
  
  const [isEditingPractice, setIsEditingPractice] = useState(false);
  const [isSavingPractice, setIsSavingPractice] = useState(false);

  useEffect(() => {
    fetchPracticeData();
  }, []);

  const fetchPracticeData = async () => {
    try {
      const data = await fetchPracticeInfo();
      if (data) {
        setPracticeInfo(data);
      }
    } catch (error) {
      console.error('Error fetching practice information:', error);
      toast({
        title: 'Error',
        description: 'Failed to load practice information. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handlePracticeInfoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPracticeInfo(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSavePracticeInfo = async () => {
    setIsSavingPractice(true);
    try {
      const result = await updatePracticeInfo(practiceInfo);
      
      if (result.success) {
        toast({
          title: 'Success',
          description: 'Practice information saved successfully',
        });
        setIsEditingPractice(false);
      } else {
        throw result.error;
      }
    } catch (error) {
      console.error('Error saving practice information:', error);
      toast({
        title: 'Error',
        description: 'Failed to save practice information. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSavingPractice(false);
    }
  };

  return (
    <div className="p-6 animate-fade-in">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Practice Information</h2>
        {isEditingPractice ? (
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => {
                setIsEditingPractice(false);
                fetchPracticeData(); // Reset to original data
              }}
              disabled={isSavingPractice}
            >
              <X size={14} className="mr-1" />
              Cancel
            </Button>
            <Button 
              size="sm"
              onClick={handleSavePracticeInfo}
              disabled={isSavingPractice}
            >
              <Save size={14} className="mr-1" />
              {isSavingPractice ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        ) : (
          <button 
            className="flex items-center gap-1 px-3 py-1.5 text-sm border rounded hover:bg-gray-50"
            onClick={() => setIsEditingPractice(true)}
          >
            <Pencil size={14} />
            <span>Edit</span>
          </button>
        )}
      </div>
      
      <div className="grid grid-cols-2 gap-6 mb-8">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Practice Name
          </label>
          <input 
            type="text" 
            name="practice_name"
            value={practiceInfo.practice_name}
            onChange={handlePracticeInfoChange}
            placeholder="Enter practice name"
            className="w-full p-2 border rounded-md text-gray-700 bg-gray-50" 
            readOnly={!isEditingPractice}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            NPI Number
          </label>
          <input 
            type="text" 
            name="practice_npi"
            value={practiceInfo.practice_npi}
            onChange={handlePracticeInfoChange}
            placeholder="Enter NPI number"
            className="w-full p-2 border rounded-md text-gray-700 bg-gray-50" 
            readOnly={!isEditingPractice}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Tax ID
          </label>
          <input 
            type="text" 
            name="practice_taxid"
            value={practiceInfo.practice_taxid}
            onChange={handlePracticeInfoChange}
            placeholder="Enter tax ID"
            className="w-full p-2 border rounded-md text-gray-700 bg-gray-50" 
            readOnly={!isEditingPractice}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Group Taxonomy Code
          </label>
          <input 
            type="text" 
            name="practice_taxonomy"
            value={practiceInfo.practice_taxonomy}
            onChange={handlePracticeInfoChange}
            placeholder="Enter group taxonomy code"
            className="w-full p-2 border rounded-md text-gray-700 bg-gray-50" 
            readOnly={!isEditingPractice}
          />
        </div>
      </div>
      
      <h3 className="text-lg font-medium mb-4">Practice Billing Address</h3>
      <div className="grid grid-cols-2 gap-6 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Address Line 1
          </label>
          <input 
            type="text" 
            name="practice_address1"
            value={practiceInfo.practice_address1}
            onChange={handlePracticeInfoChange}
            placeholder="Street address"
            className="w-full p-2 border rounded-md text-gray-700 bg-gray-50" 
            readOnly={!isEditingPractice}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Address Line 2
          </label>
          <input 
            type="text" 
            name="practice_address2"
            value={practiceInfo.practice_address2}
            onChange={handlePracticeInfoChange}
            placeholder="Apt, suite, etc."
            className="w-full p-2 border rounded-md text-gray-700 bg-gray-50" 
            readOnly={!isEditingPractice}
          />
        </div>
      </div>
      
      <div className="grid grid-cols-3 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            City
          </label>
          <input 
            type="text" 
            name="practice_city"
            value={practiceInfo.practice_city}
            onChange={handlePracticeInfoChange}
            placeholder="City"
            className="w-full p-2 border rounded-md text-gray-700 bg-gray-50" 
            readOnly={!isEditingPractice}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            State
          </label>
          <input 
            type="text" 
            name="practice_state"
            value={practiceInfo.practice_state}
            onChange={handlePracticeInfoChange}
            placeholder="State"
            className="w-full p-2 border rounded-md text-gray-700 bg-gray-50" 
            readOnly={!isEditingPractice}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            ZIP Code
          </label>
          <input 
            type="text" 
            name="practice_zip"
            value={practiceInfo.practice_zip}
            onChange={handlePracticeInfoChange}
            placeholder="ZIP Code"
            className="w-full p-2 border rounded-md text-gray-700 bg-gray-50" 
            readOnly={!isEditingPractice}
          />
        </div>
      </div>
    </div>
  );
};

export default PracticeTab;
