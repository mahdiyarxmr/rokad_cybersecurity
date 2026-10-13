import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../../lib/auth/auth-store';

interface PermissionGuardProps {
  permission: string;
  fallbackPath?: string;
  children?: React.ReactNode;
}

export const PermissionGuard: React.FC<PermissionGuardProps> = ({
  permission,
  fallbackPath = '/403',
  children,
}) => {
  const { hasPermission } = useAuthStore();

  if (!hasPermission(permission)) {
    if (children) {
      return null;
    }
    return <Navigate to={fallbackPath} replace />;
  }

  return children ? <>{children}</> : <Outlet />;
};
