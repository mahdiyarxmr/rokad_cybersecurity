import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../lib/auth/auth-store';
import { apiClient } from '../../lib/api/client';
import { toPersianDigits } from '../../lib/utils';
import { Bell, User } from 'lucide-react';
import rokadLogoWhite from '../../assets/logo-rokad-white.png';
import { useNotificationStore } from '../../lib/notifications/notification-store';

export const Header: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { unreadCount, fetchUnreadCount } = useNotificationStore();

  useEffect(() => {
    if (user) {
      fetchUnreadCount();
      const timer = setInterval(fetchUnreadCount, 20000);

      // Sync fresh profile from server (including avatarUrl)
      apiClient
        .get('/auth/me')
        .then((res: any) => {
          const freshUser = res?.data?.user || res?.user;
          if (freshUser && freshUser.avatarUrl !== user.avatarUrl) {
            const isGeneric =
              (freshUser.firstName === 'کاربر' && (freshUser.lastName === 'سیستم' || !freshUser.lastName)) ||
              (!freshUser.firstName && !freshUser.lastName);
            const hasExistingRealName =
              user?.firstName &&
              user.firstName !== 'کاربر' &&
              user.firstName !== 'کاربر سیستم';

            useAuthStore.getState().setUser({
              ...user,
              ...freshUser,
              ...(isGeneric && hasExistingRealName
                ? {
                    firstName: user.firstName,
                    lastName: user.lastName,
                  }
                : {}),
            });
          }
        })
        .catch(() => {});

      return () => clearInterval(timer);
    }
  }, [user?.id]);

  return (
    <>
      {/* Pinned Fixed Header - Stays permanently fixed during scroll and respects safe-area-inset-top (notch/status bar) */}
      <header className="fixed top-0 inset-x-0 z-50 pt-[env(safe-area-inset-top,0px)] bg-primary dark:bg-[#121824] border-b-2 border-primary-dark dark:border-[#1E293B] text-white transition-colors shadow-xs select-none">
        <div className="relative h-16 sm:h-18 px-3.5 sm:px-6 flex items-center justify-between">
          {/* Right side (RTL start) - User Profile Icon Button */}
          <div className="flex items-center gap-1 z-10">
            <button
              type="button"
              onClick={() => navigate('/app/profile')}
              title="پروفایل کاربری"
              aria-label="پروفایل کاربری"
              className="relative p-2 rounded-full text-white hover:bg-white/10 active:scale-90 transition-all flex items-center justify-center min-w-[44px] min-h-[44px] cursor-pointer"
            >
              {user?.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.firstName}
                  className="w-8 h-8 rounded-full object-cover ring-2 ring-white/30"
                />
              ) : (
                <User className="w-6 h-6 sm:w-6.5 sm:h-6.5 text-white transition-transform" strokeWidth={2.2} />
              )}
            </button>
          </div>

          {/* Center - Absolute Centered Pure Solid White Logo */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-auto">
            <button
              type="button"
              onClick={() => navigate('/app')}
              title="صفحه اصلی رکاد"
              aria-label="صفحه اصلی رکاد"
              className="flex items-center justify-center min-h-[44px] min-w-[44px] p-1 cursor-pointer transition-transform duration-150 hover:scale-105 active:scale-95"
            >
              <img
                src={rokadLogoWhite}
                alt="لوگوی رکاد"
                className="h-10 sm:h-11 max-h-[44px] w-auto object-contain shrink-0"
              />
            </button>
          </div>

          {/* Left side (RTL end) - Notifications Button (No box, pure icon) */}
          <div className="flex items-center z-10">
            <button
              type="button"
              onClick={() => navigate('/app/notifications')}
              title="اعلان‌ها"
              aria-label="اعلان‌ها"
              className="relative p-2 rounded-full text-white hover:bg-white/10 active:scale-90 transition-all flex items-center justify-center min-w-[44px] min-h-[44px] cursor-pointer"
            >
              <Bell className="w-6 h-6 sm:w-6.5 sm:h-6.5 text-white transition-transform" strokeWidth={2.2} />
              {unreadCount > 0 && (
                <span className="absolute top-1 left-1 h-4.5 min-w-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center border border-white/80 shadow-xs">
                  {toPersianDigits(unreadCount)}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Structural Document Flow Spacer - Guarantees zero jump or overlap under fixed header including device notch */}
      <div className="h-[calc(4rem+env(safe-area-inset-top,0px))] sm:h-[calc(4.5rem+env(safe-area-inset-top,0px))] shrink-0 pointer-events-none" aria-hidden="true" />
    </>
  );
};
