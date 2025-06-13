import React from 'react';
import AuthWrapper from './AuthWrapper';

/**
 * COMPATIBILITY LAYER
 * 
 * This component provides backward compatibility with existing code that uses ProtectedRoute.
 * It simply wraps the new AuthWrapper component with the same interface.
 * New code should use AuthWrapper directly.
 */

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: string[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles
}) => {
  return (
    <AuthWrapper allowedRoles={allowedRoles}>
      {children}
    </AuthWrapper>
  );
};

export default ProtectedRoute;
