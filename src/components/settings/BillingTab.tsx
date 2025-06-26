
import { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { 
  fetchCPTCodes, 
  addCPTCode, 
  updateCPTCode, 
  deleteCPTCode, 
  CPTCode 
} from '@/integrations/supabase/client';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const BillingTab = () => {
  const [cptCodes, setCptCodes] = useState<CPTCode[]>([]);
  const [isCptLoading, setIsCptLoading] = useState(true);
  const [isCptDialogOpen, setIsCptDialogOpen] = useState(false);
  const [editingCptCode, setEditingCptCode] = useState<CPTCode | null>(null);
  const [newCptCode, setNewCptCode] = useState<CPTCode>({
    code: '',
    name: '',
    fee: 0,
    description: '',
    clinical_type: ''
  });
  const [isEditMode, setIsEditMode] = useState(false);

  useEffect(() => {
    loadCptCodes();
  }, []);

  const loadCptCodes = async () => {
    setIsCptLoading(true);
    try {
      const codes = await fetchCPTCodes();
      setCptCodes(codes);
    } catch (error) {
      console.error('Error loading CPT codes:', error);
      toast({
        title: 'Error',
        description: 'Failed to load CPT codes. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsCptLoading(false);
    }
  };

  const handleAddCptCode = () => {
    setIsEditMode(false);
    setNewCptCode({ code: '', name: '', fee: 0, description: '', clinical_type: '' });
    setIsCptDialogOpen(true);
  };

  const handleEditCptCode = (cptCode: CPTCode) => {
    setIsEditMode(true);
    setEditingCptCode(cptCode);
    setNewCptCode({ 
      ...cptCode,
      clinical_type: cptCode.clinical_type || '' 
    });
    setIsCptDialogOpen(true);
  };

  const handleDeleteCptCode = async (code: string) => {
    const confirmed = window.confirm('Are you sure you want to delete this CPT code? This action cannot be undone.');
    
    if (!confirmed) return;
    
    try {
      const result = await deleteCPTCode(code);
      
      if (!result.success) {
        throw result.error;
      }
      
      setCptCodes(cptCodes.filter(cpt => cpt.code !== code));
      
      toast({
        title: 'Success',
        description: 'CPT code deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting CPT code:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete CPT code. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleSaveCptCode = async () => {
    try {
      if (!newCptCode.code || !newCptCode.name || isNaN(newCptCode.fee) || newCptCode.fee <= 0) {
        toast({
          title: 'Validation Error',
          description: 'Please fill in all required fields correctly. Fee must be greater than 0.',
          variant: 'destructive',
        });
        return;
      }

      let result;
      
      if (isEditMode && editingCptCode) {
        result = await updateCPTCode(editingCptCode.code, newCptCode);
        
        if (result.success) {
          setCptCodes(prevCodes => 
            prevCodes.map(code => 
              code.code === editingCptCode.code ? newCptCode : code
            )
          );
          
          toast({
            title: 'Success',
            description: 'CPT code updated successfully',
          });
        }
      } else {
        result = await addCPTCode(newCptCode);
        
        if (result.success) {
          setCptCodes(prevCodes => [...prevCodes, newCptCode]);
          
          toast({
            title: 'Success',
            description: 'CPT code added successfully',
          });
        }
      }
      
      if (!result.success) {
        throw result.error;
      }
      
      setIsCptDialogOpen(false);
    } catch (error) {
      console.error('Error saving CPT code:', error);
      toast({
        title: 'Error',
        description: 'Failed to save CPT code. Please try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="p-6 animate-fade-in">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">CPT Codes</h2>
        <button 
          onClick={handleAddCptCode}
          className="flex items-center gap-1 px-3 py-1.5 text-sm bg-valorwell-700 text-white rounded hover:bg-valorwell-800"
        >
          <Plus size={16} />
          <span>Add CPT Code</span>
        </button>
      </div>
      
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Clinical Type</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-right">Fee</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isCptLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                  Loading CPT codes...
                </TableCell>
              </TableRow>
            ) : cptCodes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                  No CPT codes found. Click the button above to add your first CPT code.
                </TableCell>
              </TableRow>
            ) : (
              cptCodes.map((cptCode) => (
                <TableRow key={cptCode.code}>
                  <TableCell className="font-medium">{cptCode.code}</TableCell>
                  <TableCell>{cptCode.name}</TableCell>
                  <TableCell>{cptCode.clinical_type || "—"}</TableCell>
                  <TableCell className="max-w-xs truncate">{cptCode.description || "—"}</TableCell>
                  <TableCell className="text-right">${cptCode.fee.toFixed(2)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <button 
                        onClick={() => handleEditCptCode(cptCode)}
                        className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600"
                      >
                        Edit
                      </button>
                      <button 
                        onClick={() => handleDeleteCptCode(cptCode.code)}
                        className="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600"
                      >
                        Delete
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isCptDialogOpen} onOpenChange={setIsCptDialogOpen}>
        <DialogContent className="sm:max-w-[525px]">
          <DialogHeader>
            <DialogTitle>{isEditMode ? 'Edit CPT Code' : 'Add CPT Code'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="cpt-code" className="text-right">
                Code
              </Label>
              <Input
                id="cpt-code"
                value={newCptCode.code}
                onChange={(e) => setNewCptCode({ ...newCptCode, code: e.target.value })}
                className="col-span-3"
                disabled={isEditMode}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="cpt-name" className="text-right">
                Name
              </Label>
              <Input
                id="cpt-name"
                value={newCptCode.name}
                onChange={(e) => setNewCptCode({ ...newCptCode, name: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="cpt-clinical-type" className="text-right">
                Clinical Type
              </Label>
              <Input
                id="cpt-clinical-type"
                value={newCptCode.clinical_type || ''}
                onChange={(e) => setNewCptCode({ ...newCptCode, clinical_type: e.target.value })}
                className="col-span-3"
                placeholder="E.g., Evaluation & Management, Psychotherapy"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="cpt-description" className="text-right">
                Description
              </Label>
              <Textarea
                id="cpt-description"
                value={newCptCode.description || ''}
                onChange={(e) => setNewCptCode({ ...newCptCode, description: e.target.value })}
                className="col-span-3 min-h-[100px]"
                placeholder="Detailed description of the CPT code"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="cpt-fee" className="text-right">
                Fee ($)
              </Label>
              <Input
                id="cpt-fee"
                type="number"
                min="0"
                step="0.01"
                value={newCptCode.fee}
                onChange={(e) => setNewCptCode({ ...newCptCode, fee: parseFloat(e.target.value) || 0 })}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCptDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" onClick={handleSaveCptCode}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BillingTab;
