import React from 'react';
import { Outlet } from 'react-router-dom';
import { ScrollToTop } from '../../components/common/ScrollToTop';

export const AuthLayout: React.FC = () => {
  return (
    <div className="min-h-screen min-h-dvh w-full bg-[#F8FAFC] dark:bg-[#0B0F17] text-ink-normal dark:text-gray-100 font-sans transition-colors">
      <ScrollToTop />
      <Outlet />
    </div>
  );
};

