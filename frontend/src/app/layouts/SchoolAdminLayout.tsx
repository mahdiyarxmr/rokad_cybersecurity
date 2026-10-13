import React, { useRef, useLayoutEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { MobileBottomNav } from './MobileBottomNav';
import { ScrollToTop } from '../../components/common/ScrollToTop';

export const SchoolAdminLayout: React.FC = () => {
  const mainRef = useRef<HTMLElement>(null);
  const { pathname } = useLocation();

  useLayoutEffect(() => {
    if (!pathname.includes('/events') && mainRef.current) {
      mainRef.current.scrollTop = 0;
    }
  }, [pathname]);

  return (
    <div className="h-screen h-[100dvh] bg-gray-50 dark:bg-[#0B0F17] text-ink-normal dark:text-gray-100 flex flex-col font-sans transition-colors overflow-hidden">
      <ScrollToTop />
      <Header />
      <div className="flex flex-1 relative overflow-hidden min-h-0 w-full">
        <Sidebar role="SCHOOL_ADMIN" />
        <main
          ref={mainRef}
          className="flex-1 p-3 sm:p-5 md:p-6 pb-28 md:pb-12 max-w-7xl mx-auto w-full min-w-0 min-h-0 overflow-y-auto overscroll-contain"
        >
          <Outlet />
        </main>
      </div>
      <MobileBottomNav role="SCHOOL_ADMIN" />
    </div>
  );
};
