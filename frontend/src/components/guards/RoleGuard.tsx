import React, { useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../lib/auth/auth-store';
import { UserRole } from '../../types/auth';

interface RoleGuardProps {
  allowedRoles: UserRole | UserRole[];
}

export const RoleGuard: React.FC<RoleGuardProps> = ({ allowedRoles }) => {
  const { isAuthenticated, user, hasRole } = useAuthStore();
  const location = useLocation();

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!hasRole(allowedRoles)) {
    return <Navigate to="/403" replace />;
  }

  return <Outlet />;
};

export const GuestGuard: React.FC = () => {
  const { isAuthenticated, user, accessToken, refreshToken } = useAuthStore();

  const sessionUsable =
    isAuthenticated &&
    !!user &&
    !!accessToken &&
    !accessToken.startsWith('mock-') &&
    !!refreshToken &&
    !refreshToken.startsWith('mock-');

  const hasStale = isAuthenticated || !!user || !!accessToken;

  useEffect(() => {
    if (!sessionUsable && hasStale) {
      useAuthStore.getState().logout();
    }
  }, [sessionUsable, hasStale]);

  if (sessionUsable) {
    return <Navigate to="/app" replace />;
  }

  return <Outlet />;
};
