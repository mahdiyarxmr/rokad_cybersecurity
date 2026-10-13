import React from 'react';
import { Outlet } from 'react-router-dom';
import { useAuthStore } from '../../lib/auth/auth-store';
import { SuperAdminLayout } from './SuperAdminLayout';
import { SchoolAdminLayout } from './SchoolAdminLayout';
import { TeacherLayout } from './TeacherLayout';
import { StudentParentLayout } from './StudentParentLayout';

export const SharedAppLayout: React.FC = () => {
  const role = useAuthStore((s) => s.user?.role);

  switch (role) {
    case 'SUPER_ADMIN':
      return <SuperAdminLayout />;
    case 'SCHOOL_ADMIN':
    case 'STAFF':
      return <SchoolAdminLayout />;
    case 'TEACHER':
      return <TeacherLayout />;
    case 'STUDENT':
    case 'PARENT':
    default:
      return <StudentParentLayout />;
  }
};
