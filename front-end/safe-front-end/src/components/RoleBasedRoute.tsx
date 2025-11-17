import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { authService } from '../services/authService';

interface RoleBasedRouteProps {
  children: ReactNode;
  allowedRoles?: string[];
  redirectTo?: string;
}

/**
 * RoleBasedRoute component that redirects users based on their role
 * - If no role specified, allows all authenticated users
 * - If role specified, only allows users with that role
 * - Automatically redirects to appropriate home page based on user role
 */
export const RoleBasedRoute = ({ 
  children, 
  allowedRoles,
  redirectTo 
}: RoleBasedRouteProps) => {
  const isAuthenticated = authService.isAuthenticated();

  if (!isAuthenticated) {
    return <Navigate to="/signin" replace />;
  }

  const currentUser = authService.getCurrentUser();
  
  if (!currentUser) {
    return <Navigate to="/signin" replace />;
  }

  // If allowedRoles is specified, check if user's role is in the list
  if (allowedRoles && allowedRoles.length > 0) {
    if (!allowedRoles.includes(currentUser.role)) {
      // Redirect to appropriate home page based on role
      if (currentUser.role === 'Admin') {
        return <Navigate to="/admin/home" replace />;
      } else {
        return <Navigate to="/user/home" replace />;
      }
    }
  }

  // If redirectTo is specified, use it; otherwise render children
  if (redirectTo) {
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
};

/**
 * HomeRouteRedirect component that automatically redirects to the appropriate home page
 * based on user role
 */
export const HomeRouteRedirect = () => {
  const isAuthenticated = authService.isAuthenticated();

  if (!isAuthenticated) {
    return <Navigate to="/signin" replace />;
  }

  const currentUser = authService.getCurrentUser();
  
  if (!currentUser) {
    return <Navigate to="/signin" replace />;
  }

  // Redirect based on role
  if (currentUser.role === 'Admin') {
    return <Navigate to="/admin/home" replace />;
  } else {
    return <Navigate to="/user/home" replace />;
  }
};

