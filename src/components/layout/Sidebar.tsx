
import { Link, useLocation } from 'react-router-dom';
import { 
  Calendar, 
  Users, 
  BarChart2, 
  Activity, 
  Settings, 
  Bell, 
  MessageSquare,
  ChevronLeft,
  UserCheck,
  LayoutDashboard,
  User
} from 'lucide-react';
import { useUser } from '@/context/UserContext';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const Sidebar = () => {
  const location = useLocation();
  const currentPath = location.pathname;
  const { userRole, isLoading, userId, authInitialized } = useUser();
  const { toast } = useToast();
  const isClinician = userRole === 'clinician';
  const isAdmin = userRole === 'admin';
  const [clinicianId, setClinicianId] = useState<string | null>(null);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [loadingTimeout, setLoadingTimeout] = useState(false);
  
  // Add timeout mechanism to prevent indefinite loading
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    if (isLoading || !authInitialized) {
      console.log("[Sidebar] Starting loading timeout check");
      timeoutId = setTimeout(() => {
        console.log("[Sidebar] Loading timeout reached after 10 seconds");
        setLoadingTimeout(true);
      }, 10000); // 10 seconds timeout
    }
    
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [isLoading, authInitialized]);
  
  useEffect(() => {
    const fetchUserId = async () => {
      try {
        console.log("[Sidebar] Fetching user ID for clinician/admin");
        const { data, error } = await supabase.auth.getUser();
        
        if (error) {
          console.error("[Sidebar] Error fetching user:", error);
          setLoadingError("Failed to load user data");
          toast({
            title: "Error",
            description: "Failed to load user data. Please refresh the page.",
            variant: "destructive"
          });
          return;
        }
        
        if (data?.user) {
          console.log("[Sidebar] Successfully fetched user ID:", data.user.id);
          setClinicianId(data.user.id);
        } else {
          console.warn("[Sidebar] No user data returned");
          setLoadingError("User data not available");
        }
      } catch (error) {
        console.error("[Sidebar] Exception in fetchUserId:", error);
        setLoadingError("An unexpected error occurred");
      }
    };
    
    if ((isClinician || isAdmin) && authInitialized) {
      fetchUserId();
    }
  }, [isClinician, isAdmin, authInitialized, toast]);
  
  const isActive = (path: string) => {
    return currentPath === path;
  };

  if (isLoading || !authInitialized) {
    return (
      <div className="w-[220px] min-h-screen border-r bg-white flex flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-valorwell-600 mb-4"></div>
        <p className="text-sm text-valorwell-600">
          {loadingTimeout ? "Taking longer than expected..." : "Loading..."}
        </p>
      </div>
    );
  }
  
  if (loadingError) {
    return (
      <div className="w-[220px] min-h-screen border-r bg-white flex flex-col items-center justify-center p-4">
        <div className="text-red-500 mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
        </div>
        <p className="text-sm text-center text-red-600">{loadingError}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-valorwell-600 text-white rounded-md text-sm"
        >
          Refresh Page
        </button>
      </div>
    );
  }

  // If user is not a clinician or admin, they shouldn't see this sidebar
  if (userRole !== 'clinician' && userRole !== 'admin') {
    return null;
  }

  return (
    <div className="w-[220px] min-h-screen border-r bg-white flex flex-col">
      <div className="p-4 flex items-center gap-2 border-b">
        <Link to="/" className="flex items-center gap-2">
          <img 
            src="/lovable-uploads/47fe3428-4c8d-48fd-9f59-8040e817c9a8.png" 
            alt="ValorWell" 
            className="h-8 w-8" 
          />
          <span className="text-xl font-semibold text-valorwell-700">ValorWell</span>
        </Link>
        <button className="ml-auto text-gray-500">
          <ChevronLeft size={18} />
        </button>
      </div>
      
      <nav className="flex-1 py-4 space-y-1 px-2">
        {/* Clinician and Admin links */}
        <Link 
          to="/clinician-dashboard" 
          className={`sidebar-link ${isActive('/clinician-dashboard') ? 'active' : ''}`}
        >
          <LayoutDashboard size={18} />
          <span>Dashboard</span>
        </Link>
        
        {clinicianId && (
          <Link 
            to={`/clinicians/${clinicianId}`} 
            className={`sidebar-link ${isActive(`/clinicians/${clinicianId}`) ? 'active' : ''}`}
          >
            <User size={18} />
            <span>Profile</span>
          </Link>
        )}
        
        <Link 
          to="/my-clients" 
          className={`sidebar-link ${isActive('/my-clients') ? 'active' : ''}`}
        >
          <UserCheck size={18} />
          <span>My Clients</span>
        </Link>
        
        <Link 
          to="/calendar" 
          className={`sidebar-link ${isActive('/calendar') ? 'active' : ''}`}
        >
          <Calendar size={18} />
          <span>Calendar</span>
        </Link>
        
        {/* Admin/Staff only links */}
        {isAdmin && (
          <>
            <Link 
              to="/clients" 
              className={`sidebar-link ${isActive('/clients') ? 'active' : ''}`}
            >
              <Users size={18} />
              <span>Clients</span>
            </Link>
            
            <Link 
              to="/analytics" 
              className={`sidebar-link ${isActive('/analytics') ? 'active' : ''}`}
            >
              <BarChart2 size={18} />
              <span>Analytics</span>
            </Link>
            
            <Link 
              to="/activity" 
              className={`sidebar-link ${isActive('/activity') ? 'active' : ''}`}
            >
              <Activity size={18} />
              <span>Activity</span>
            </Link>
            
            <Link 
              to="/settings" 
              className={`sidebar-link ${isActive('/settings') ? 'active' : ''}`}
            >
              <Settings size={18} />
              <span>Settings</span>
            </Link>
          </>
        )}
      </nav>
      
      <div className="border-t py-4 space-y-1 px-2">
        {/* Only show these links for admin roles */}
        {isAdmin && (
          <>
            <Link 
              to="/reminders" 
              className={`sidebar-link ${isActive('/reminders') ? 'active' : ''}`}
            >
              <Bell size={18} />
              <span>Reminders</span>
            </Link>
            
            <Link 
              to="/messages" 
              className={`sidebar-link ${isActive('/messages') ? 'active' : ''}`}
            >
              <MessageSquare size={18} />
              <span>Messages</span>
            </Link>
          </>
        )}
      </div>
    </div>
  );
};

export default Sidebar;
