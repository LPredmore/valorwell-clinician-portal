import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import { Search, Filter, RotateCcw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from "@/hooks/use-toast";
import { useUser } from '@/context/UserContext';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
// CLEANED: Removed BLOCKED_TIME_CLIENT_ID import

interface Client {
  id: string;
  client_first_name: string | null;
  client_last_name: string | null;
  client_preferred_name: string | null;
  client_email: string | null;
  client_phone: string | null;
  client_date_of_birth: string | null;
  client_status: string | null;
  client_assigned_therapist: string | null;
}

const Clients = () => {
  const { userId, userRole } = useUser();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [clinicianId, setClinicianId] = useState<string | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const totalPages = Math.ceil(clients.length / itemsPerPage);
  
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentClients = clients.slice(indexOfFirstItem, indexOfLastItem);

  // Authentication and clinician setup effect with stable dependencies only
  useEffect(() => {
    const getClinicianInfo = async () => {
      if (!userId) {
        console.error('No authenticated user found');
        // Get fresh instances inside the effect
        const navInstance = useNavigate();
        const { toast: toastInstance } = useToast();
        toastInstance({
          title: "Authentication Required",
          description: "Please log in to view clients.",
          variant: "destructive",
        });
        navInstance('/login');
        return;
      }

      try {
        const { data, error } = await supabase
          .from('clinicians')
          .select('id')
          .eq('id', userId) // Use userId directly instead of email lookup
          .single();

        if (error || !data) {
          console.error('No clinician found for current user');
          // Get fresh toast instance inside the effect
          const { toast: toastInstance } = useToast();
          toastInstance({
            title: "Access Denied",
            description: "You don't have permission to view clients.",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }

        console.log('Found clinician ID:', data.id);
        setClinicianId(data.id);
        fetchClients();
      } catch (error) {
        console.error('Error getting clinician info:', error);
        // Get fresh toast instance inside the effect
        const { toast: toastInstance } = useToast();
        toastInstance({
          title: "Error",
          description: "Failed to authenticate user.",
          variant: "destructive",
        });
        setLoading(false);
      }
    };
    
    getClinicianInfo();
  }, [userId]); // Only userId dependency - no navigate or toast

  const fetchClients = async () => {
    try {
      setLoading(true);
      
      console.log('Fetching all clients');
      
      const { data, error } = await supabase
        .from('clients')
        .select('id, client_first_name, client_last_name, client_preferred_name, client_email, client_phone, client_date_of_birth, client_status, client_assigned_therapist')
        .order('created_at', { ascending: false });
      
      if (error) {
        throw error;
      }
      
      console.log('Fetched clients:', data);
      setClients(data || []);
    } catch (error) {
      console.error('Error fetching clients:', error);
      const { toast: toastInstance } = useToast();
      toastInstance({
        title: "Error",
        description: "Failed to fetch clients.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    if (!searchQuery.trim()) {
      fetchClients();
      return;
    }

    const filtered = clients.filter(client => 
      (client.client_first_name && client.client_first_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (client.client_last_name && client.client_last_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (client.client_preferred_name && client.client_preferred_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (client.client_email && client.client_email.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (client.client_phone && client.client_phone.includes(searchQuery))
    );
    
    setClients(filtered);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    fetchClients();
  };

  const formatDateOfBirth = (dateString: string | null) => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
    } catch (e) {
      return dateString;
    }
  };

  const handleClientClick = (clientId: string) => {
    console.log(`Navigating to client details for ID: ${clientId}`);
    navigate(`/clients/${clientId}`);
  };

  return (
    <Layout>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-2xl font-semibold">All Clients</h2>
          <span className="bg-valorwell-700 text-white text-xs px-2 py-0.5 rounded-full">{clients.length}</span>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="border-b">
          <div className="flex">
            <button 
              className="px-6 py-3 font-medium text-sm border-b-2 border-valorwell-700 text-valorwell-700"
            >
              All Clients
            </button>
          </div>
        </div>
        
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400">
                <Search size={16} />
              </div>
              <input 
                type="search" 
                className="w-full p-2 pl-10 text-sm text-gray-900 bg-gray-50 rounded-md border border-gray-300 focus:ring-1 focus:outline-none focus:ring-valorwell-500"
                placeholder="Search Clients" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <div className="flex items-center gap-2 ml-4">
              <button 
                className="px-4 py-2 bg-valorwell-700 text-white rounded hover:bg-valorwell-800 transition-colors"
                onClick={handleSearch}
              >
                Search
              </button>
              <button 
                className="px-4 py-2 border rounded text-gray-700 hover:bg-gray-50 transition-colors"
                onClick={handleClearSearch}
              >
                Clear
              </button>
              <button className="px-4 py-2 border rounded text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2">
                <Filter size={16} />
                <span>Filters</span>
              </button>
              <button 
                className="p-2 border rounded text-gray-700 hover:bg-gray-50 transition-colors"
                onClick={() => fetchClients()}
              >
                <RotateCcw size={16} />
              </button>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-600">
              <thead className="text-xs uppercase bg-gray-50 border-b">
                <tr>
                  <th className="p-4">
                    <input type="checkbox" className="w-4 h-4 rounded" />
                  </th>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">Date Of Birth</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="text-center py-4">Loading clients...</td>
                  </tr>
                ) : currentClients.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-4">No clients found</td>
                  </tr>
                ) : (
                  currentClients.map((client) => (
                    <tr key={client.id} className="border-b hover:bg-gray-50">
                      <td className="p-4">
                        <input type="checkbox" className="w-4 h-4 rounded" />
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900">
                        <button 
                          onClick={() => handleClientClick(client.id)}
                          className="hover:text-valorwell-700 hover:underline focus:outline-none"
                          data-client-id={client.id}
                        >
                          {client.client_first_name || ''} {client.client_last_name || ''}
                        </button>
                      </td>
                      <td className="px-4 py-3">{client.client_email || '-'}</td>
                      <td className="px-4 py-3">{client.client_phone || '-'}</td>
                      <td className="px-4 py-3">{formatDateOfBirth(client.client_date_of_birth)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          {clients.length > itemsPerPage && (
            <Pagination className="mt-4">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious 
                    onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                    className={currentPage === 1 ? "pointer-events-none opacity-50" : ""}
                  />
                </PaginationItem>
                
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <PaginationItem key={page}>
                    <PaginationLink
                      isActive={currentPage === page}
                      onClick={() => setCurrentPage(page)}
                    >
                      {page}
                    </PaginationLink>
                  </PaginationItem>
                ))}
                
                <PaginationItem>
                  <PaginationNext 
                    onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                    className={currentPage === totalPages ? "pointer-events-none opacity-50" : ""}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Clients;
