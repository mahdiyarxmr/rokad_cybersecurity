import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../../lib/auth/auth-store';

export const getDashboardPath = (role?: string) => {
  switch (role) {
    case 'SUPER_ADMIN':
      return '/app/super-admin/dashboard';
    case 'SCHOOL_ADMIN':
    case 'STAFF':
      return '/app/admin/dashboard';
    case 'TEACHER':
      return '/app/teacher/dashboard';
    case 'COACH':
      return '/app/coaching';
    case 'PARENT':
      return '/app/parent/dashboard';
    case 'STUDENT':
    default:
      return '/app/student/dashboard';
  }
};

export const DashboardRedirect: React.FC = () => {
  const user = useAuthStore((state) => state.user);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Navigate to={getDashboardPath(user.role)} replace />;
};
