
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
  User,
  GraduationCap
} from 'lucide-react';
import { useUser } from '@/context/UserContext';
import { useState, useEffect } from 'react';

const Sidebar = () => {
  const location = useLocation();
  const currentPath = location.pathname;
  const { userRole, isLoading, userId, authInitialized } = useUser();
  const isClinician = userRole === 'clinician';
  const isAdmin = userRole === 'admin';
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
          to="/dashboard" 
          className={`sidebar-link ${isActive('/dashboard') ? 'active' : ''}`}
        >
          <LayoutDashboard size={18} />
          <span>Dashboard</span>
        </Link>
        
        {/* CRITICAL FIX: Use userId from context instead of making API call */}
        {userId && (
          <Link 
            to={`/clinicians/${userId}`} 
            className={`sidebar-link ${isActive(`/clinicians/${userId}`) ? 'active' : ''}`}
          >
            <User size={18} />
            <span>Profile</span>
          </Link>
        )}
        
        <Link 
          to="/clients" 
          className={`sidebar-link ${isActive('/clients') ? 'active' : ''}`}
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
        
        <Link 
          to="/training" 
          className={`sidebar-link ${isActive('/training') ? 'active' : ''}`}
        >
          <GraduationCap size={18} />
          <span>Training</span>
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
