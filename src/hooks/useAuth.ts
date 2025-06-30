
import { useUser } from '@/context/UserContext';

export const useAuth = () => {
  const { userId, authInitialized, userRole } = useUser();
  
  return {
    user: userId ? { id: userId } : null,
    isAuthenticated: !!userId,
    authInitialized,
    userRole,
  };
};
