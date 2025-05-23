
import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Mail, Phone } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

interface Clinician {
  id: string;
  clinician_first_name: string | null;
  clinician_last_name: string | null;
  clinician_email: string | null;
  clinician_phone: string | null;
  clinician_status: string | null;
  created_at: string;
}

const CliniciansTab = () => {
  const [clinicians, setClinicians] = useState<Clinician[]>([]);
  const [isClinicianLoading, setIsClinicianLoading] = useState(true);
  const [currentClinicianPage, setCurrentClinicianPage] = useState(1);
  const itemsPerPage = 10;
  const navigate = useNavigate();
  
  const totalClinicianPages = useMemo(() => Math.max(1, Math.ceil(clinicians.length / itemsPerPage)), [clinicians.length]);
  
  const currentClinicians = useMemo(() => {
    const startIndex = (currentClinicianPage - 1) * itemsPerPage;
    return clinicians.slice(startIndex, startIndex + itemsPerPage);
  }, [clinicians, currentClinicianPage]);

  useEffect(() => {
    fetchClinicians();
  }, []);

  const fetchClinicians = async () => {
    setIsClinicianLoading(true);
    try {
      const { data, error } = await supabase
        .from('clinicians')
        .select('id, clinician_first_name, clinician_last_name, clinician_email, clinician_phone, clinician_status, created_at')
        .order('created_at', { ascending: false });
      
      if (error) {
        throw error;
      }
      
      setClinicians(data || []);
    } catch (error) {
      console.error('Error fetching clinicians:', error);
      toast({
        title: 'Error',
        description: 'Failed to load clinicians. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsClinicianLoading(false);
    }
  };

  const handleDeleteClinician = async (clinicianId: string) => {
    const confirmed = window.confirm('Are you sure you want to delete this clinician? This action cannot be undone.');
    
    if (!confirmed) return;
    
    try {
      const { error } = await supabase
        .from('clinicians')
        .delete()
        .eq('id', clinicianId);
      
      if (error) {
        throw error;
      }
      
      setClinicians(clinicians.filter(clinician => clinician.id !== clinicianId));
      
      toast({
        title: 'Success',
        description: 'Clinician deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting clinician:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete clinician. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleClinicianClick = (clinicianId: string) => {
    navigate(`/clinicians/${clinicianId}`);
  };

  const formatName = (firstName: string | null, lastName: string | null) => {
    if (!firstName && !lastName) return "—";
    return `${firstName || ''} ${lastName || ''}`.trim();
  };

  return (
    <div className="p-6 animate-fade-in">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Clinician Management</h2>
        <button 
          className="flex items-center gap-1 px-3 py-1.5 text-sm bg-valorwell-700 text-white rounded hover:bg-valorwell-800"
        >
          <Plus size={16} />
          <span>Add Clinician</span>
        </button>
      </div>
      
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isClinicianLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                  Loading clinicians...
                </TableCell>
              </TableRow>
            ) : clinicians.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                  No clinicians found. Click the button above to add your first clinician.
                </TableCell>
              </TableRow>
            ) : (
              currentClinicians.map((clinician) => (
                <TableRow key={clinician.id}>
                  <TableCell className="font-medium">
                    <button
                      onClick={() => handleClinicianClick(clinician.id)}
                      className="hover:text-valorwell-700 hover:underline focus:outline-none text-left"
                    >
                      {formatName(clinician.clinician_first_name, clinician.clinician_last_name)}
                    </button>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Mail size={14} className="text-gray-500" />
                      {clinician.clinician_email || "—"}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Phone size={14} className="text-gray-500" />
                      {clinician.clinician_phone || "—"}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      clinician.clinician_status === 'Active' 
                        ? 'bg-green-100 text-green-800' 
                        : clinician.clinician_status === 'Pending' 
                          ? 'bg-yellow-100 text-yellow-800' 
                          : 'bg-gray-100 text-gray-800'
                    }`}>
                      {clinician.clinician_status || "Not Set"}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <button 
                      className="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600"
                      onClick={() => handleDeleteClinician(clinician.id)}
                    >
                      Delete
                    </button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      
      {clinicians.length > itemsPerPage && (
        <Pagination className="mt-4">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious 
                onClick={() => setCurrentClinicianPage((prev) => Math.max(prev - 1, 1))}
                className={currentClinicianPage === 1 ? "pointer-events-none opacity-50" : ""}
              />
            </PaginationItem>
            
            {Array.from({ length: totalClinicianPages }, (_, i) => i + 1).map((page) => (
              <PaginationItem key={page}>
                <PaginationLink
                  isActive={currentClinicianPage === page}
                  onClick={() => setCurrentClinicianPage(page)}
                >
                  {page}
                </PaginationLink>
              </PaginationItem>
            ))}
            
            <PaginationItem>
              <PaginationNext 
                onClick={() => setCurrentClinicianPage((prev) => Math.min(prev + 1, totalClinicianPages))}
                className={currentClinicianPage === totalClinicianPages ? "pointer-events-none opacity-50" : ""}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
};

export default CliniciansTab;
