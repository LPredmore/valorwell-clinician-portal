
import { Bell, Search, LogOut, User } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from "@/integrations/supabase/client";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useEffect, useState } from "react";
import { useUser } from '@/context/UserContext';

interface HeaderProps {
  userName?: string;
  userAvatar?: string;
}

const Header: React.FC<HeaderProps> = ({
  userName,
  userAvatar
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const path = location.pathname.substring(1);
  const title = path.charAt(0).toUpperCase() + path.slice(1) || 'Dashboard';
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [initials, setInitials] = useState('');
  const { userRole, userId } = useUser();

  // Get user profile data
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        if (!userId) return;
        
        // Get user data from the appropriate table based on role
        if (userRole === 'admin') {
          const { data, error } = await supabase
            .from('admins')
            .select('admin_first_name, admin_last_name')
            .eq('id', userId)
            .single();
            
          if (error) throw error;
          
          if (data) {
            setFirstName(data.admin_first_name || '');
            setLastName(data.admin_last_name || '');
            updateInitials(data.admin_first_name, data.admin_last_name);
          }
        } else if (userRole === 'clinician') {
          const { data, error } = await supabase
            .from('clinicians')
            .select('clinician_first_name, clinician_last_name')
            .eq('id', userId)
            .single();
            
          if (error) throw error;
          
          if (data) {
            setFirstName(data.clinician_first_name || '');
            setLastName(data.clinician_last_name || '');
            updateInitials(data.clinician_first_name, data.clinician_last_name);
          }
        } else if (userRole === 'client') {
          const { data, error } = await supabase
            .from('clients')
            .select('client_first_name, client_last_name')
            .eq('id', userId)
            .single();
            
          if (error) throw error;
          
          if (data) {
            setFirstName(data.client_first_name || '');
            setLastName(data.client_last_name || '');
            updateInitials(data.client_first_name, data.client_last_name);
          }
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
      }
    };
    
    fetchUserProfile();
  }, [userId, userRole]);

  const updateInitials = (first: string | null, last: string | null) => {
    const firstInitial = first ? first.charAt(0).toUpperCase() : '';
    const lastInitial = last ? last.charAt(0).toUpperCase() : '';
    setInitials(firstInitial + lastInitial);
  };

  // Get current time to display greeting
  const hours = new Date().getHours();
  let greeting = 'Good morning';
  if (hours >= 12 && hours < 17) {
    greeting = 'Good afternoon';
  } else if (hours >= 17) {
    greeting = 'Good evening';
  }
  
  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      toast({
        title: "Logged out successfully",
        description: "You have been logged out of your account"
      });
      navigate('/login');
    } catch (error) {
      console.error('Error logging out:', error);
      toast({
        title: "Logout failed",
        description: "There was a problem logging you out",
        variant: "destructive"
      });
    }
  };

  // Create display name from first and last name, fallback to the provided userName prop
  const displayName = firstName && lastName ? `${firstName} ${lastName}` : userName || 'User';
  
  return <header className="h-16 border-b bg-white flex items-center justify-between px-6">
      <div className="relative flex-1 max-w-lg mx-8">
        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400">
          <Search size={16} />
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        <button className="relative p-2 text-gray-600 rounded-full hover:bg-gray-100">
          <Bell size={20} />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
        </button>
        
        <div className="flex items-center gap-2">
          <div className="text-right">
            <p className="text-sm text-gray-500">{greeting},</p>
            <p className="text-sm font-medium text-valorwell-700">{displayName}</p>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger className="focus:outline-none">
              <Avatar className="w-10 h-10 bg-valorwell-500 text-white hover:bg-valorwell-600 transition-colors cursor-pointer">
                {userAvatar ? <AvatarImage src={userAvatar} alt={displayName} /> : <AvatarFallback className="bg-valorwell-500 text-white">{initials || 'U'}</AvatarFallback>}
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 mt-1">
              <DropdownMenuSeparator />
              <DropdownMenuItem className="cursor-pointer flex items-center text-red-500 focus:text-red-500" onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>;
};

export default Header;
