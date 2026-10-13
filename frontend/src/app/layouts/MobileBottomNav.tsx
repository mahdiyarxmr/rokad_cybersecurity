import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import {
  Star,
  Home,
  PlayCircle,
  CalendarDays,
} from 'lucide-react';
import { CoinStackIcon } from '../../components/icons/CustomNavIcons';

interface MobileBottomNavProps {
  role?: string;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({ role }) => {
  const location = useLocation();

  const isManagerOrAdmin = role === 'SUPER_ADMIN' || role === 'SCHOOL_ADMIN' || role === 'STAFF';
  const clubHref = isManagerOrAdmin
    ? '/app/admin/club'
    : role === 'TEACHER'
      ? '/app/teacher/club-approvals'
      : '/app/club';

  const isHomeActive =
    location.pathname === '/app' ||
    location.pathname === '/app/' ||
    location.pathname.endsWith('/dashboard');

  return (
    <nav
      aria-label="سوپراپلیکیشن ناوبری پایین"
      dir="rtl"
      className="fixed bottom-0 inset-x-0 z-40 pb-[max(2px,calc(env(safe-area-inset-bottom,0px)*0.45))] md:hidden shadow-[0_-4px_20px_rgba(0,0,0,0.05)] bg-white/95 dark:bg-[#151C28]/95 backdrop-blur-md border-t border-gray-200/90 dark:border-gray-800 box-border select-none transition-colors"
    >
      <div className="w-full h-[54px] min-h-[54px] max-h-[54px] px-2 flex items-center justify-between">
      {/* 1. First on Right: پلتفرم کا (دسته‌سکه / چند سکه روی هم) */}
      <NavLink
        to="/app/ka-platform"
        className={({ isActive }) =>
          twMerge(
            clsx(
              'h-full flex flex-col items-center justify-center flex-1 py-0.5 px-0.5 transition-all text-[10px] select-none min-w-0 active:scale-95',
              isActive
                ? 'text-emerald-600 dark:text-teal-400 font-bold'
                : 'text-gray-400 dark:text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 font-medium',
            ),
          )
        }
      >
        {({ isActive }) => (
          <>
            <div className="h-6 w-6 flex items-center justify-center transition-all shrink-0 overflow-visible">
              <CoinStackIcon
                solid={isActive}
                className={clsx(
                  'h-5 w-5 shrink-0 transition-all',
                  isActive
                    ? 'text-emerald-600 dark:text-teal-400'
                    : 'text-gray-400 dark:text-gray-400',
                )}
              />
            </div>
            <span className="truncate max-w-[66px] text-center leading-tight shrink-0 mt-0.5">پلتفرم کا</span>
          </>
        )}
      </NavLink>

      {/* 2. Second on Right: باشگاه (ستاره) */}
      <NavLink
        to={clubHref}
        className={({ isActive }) =>
          twMerge(
            clsx(
              'h-full flex flex-col items-center justify-center flex-1 py-0.5 px-0.5 transition-all text-[10px] select-none min-w-0 active:scale-95',
              isActive
                ? 'text-emerald-600 dark:text-teal-400 font-bold'
                : 'text-gray-400 dark:text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 font-medium',
            ),
          )
        }
      >
        {({ isActive }) => (
          <>
            <div className="h-6 w-6 flex items-center justify-center transition-all shrink-0">
              {isActive ? (
                <Star className="h-5 w-5 shrink-0 fill-current text-emerald-600 dark:text-teal-400" />
              ) : (
                <Star className="h-5 w-5 shrink-0 text-gray-400 dark:text-gray-400" />
              )}
            </div>
            <span className="truncate max-w-[66px] text-center leading-tight shrink-0 mt-0.5">باشگاه</span>
          </>
        )}
      </NavLink>

      {/* 3. Center: هوم / صفحه اصلی (بزرگتر و برجسته) */}
      <NavLink
        to="/app"
        title="صفحه اصلی"
        aria-label="صفحه اصلی"
        className="h-full flex flex-col items-center justify-center flex-1 py-0.5 px-0.5 select-none min-w-0 group"
      >
        <div
          className={clsx(
            'w-11 h-11 rounded-2xl flex items-center justify-center transition-all duration-200 active:scale-95 shrink-0',
            isHomeActive
              ? 'text-emerald-600 dark:text-teal-400 bg-emerald-500/15 dark:bg-teal-500/20 border-2 border-emerald-500/35 dark:border-teal-400/40 shadow-[0_4px_16px_rgba(20,184,166,0.25)] -translate-y-1'
              : 'text-gray-500 dark:text-gray-300 bg-gray-100/90 dark:bg-[#1C2536] border border-gray-200/80 dark:border-gray-700/80 hover:text-gray-700 dark:hover:text-white dark:hover:bg-[#242F42] shadow-sm -translate-y-0.5',
          )}
        >
          {isHomeActive ? (
            <svg
              viewBox="0 0 24 24"
              className="h-6 w-6 shrink-0 fill-current transition-all"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H15v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8H5a2 2 0 0 1-2-2z"
              />
            </svg>
          ) : (
            <Home className="h-6 w-6 shrink-0" />
          )}
        </div>
      </NavLink>

      {/* 4. Left of Center: رسانه */}
      <NavLink
        to="/app/media"
        className={({ isActive }) =>
          twMerge(
            clsx(
              'h-full flex flex-col items-center justify-center flex-1 py-0.5 px-0.5 transition-all text-[10px] select-none min-w-0 active:scale-95',
              isActive
                ? 'text-emerald-600 dark:text-teal-400 font-bold'
                : 'text-gray-400 dark:text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 font-medium',
            ),
          )
        }
      >
        {({ isActive }) => (
          <>
            <div className="h-6 w-6 flex items-center justify-center transition-all shrink-0">
              {isActive ? (
                <svg
                  viewBox="0 0 24 24"
                  className="h-5 w-5 shrink-0 fill-current transition-all"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm-2.5 5.5a1 1 0 0 0-1.5.86v7.28a1 1 0 0 0 1.5.86l6.3-3.64a1 1 0 0 0 0-1.72l-6.3-3.64z"
                  />
                </svg>
              ) : (
                <PlayCircle className="h-5 w-5 shrink-0 text-gray-400 dark:text-gray-400" />
              )}
            </div>
            <span className="truncate max-w-[66px] text-center leading-tight shrink-0 mt-0.5">رسانه</span>
          </>
        )}
      </NavLink>

      {/* 5. Far Left: تقویم */}
      <NavLink
        to="/app/calendar"
        className={({ isActive }) =>
          twMerge(
            clsx(
              'h-full flex flex-col items-center justify-center flex-1 py-0.5 px-0.5 transition-all text-[10px] select-none min-w-0 active:scale-95',
              isActive
                ? 'text-emerald-600 dark:text-teal-400 font-bold'
                : 'text-gray-400 dark:text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 font-medium',
            ),
          )
        }
      >
        {({ isActive }) => (
          <>
            <div className="h-6 w-6 flex items-center justify-center transition-all shrink-0">
              {isActive ? (
                <svg
                  viewBox="0 0 24 24"
                  className="h-5 w-5 shrink-0 fill-current transition-all"
                  aria-hidden="true"
                >
                  {/* Top Binder Pins */}
                  <path d="M8 2v3M16 2v3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />

                  {/* Header Bar */}
                  <path d="M6 4h12a3 3 0 0 1 3 3v2H3V7a3 3 0 0 1 3-3z" />

                  {/* Days Body with 6 transparent day cutouts */}
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M3 11h18v8a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3v-8zm4 2.5a.7.7 0 0 1 .7-.7h1.6a.7.7 0 0 1 .7.7v1.6a.7.7 0 0 1-.7.7H7.7a.7.7 0 0 1-.7-.7v-1.6zm4 0a.7.7 0 0 1 .7-.7h1.6a.7.7 0 0 1 .7.7v1.6a.7.7 0 0 1-.7.7h-1.6a.7.7 0 0 1-.7-.7v-1.6zm4 0a.7.7 0 0 1 .7-.7h1.6a.7.7 0 0 1 .7.7v1.6a.7.7 0 0 1-.7.7h-1.6a.7.7 0 0 1-.7-.7v-1.6zm-8 4a.7.7 0 0 1 .7-.7h1.6a.7.7 0 0 1 .7.7v1.6a.7.7 0 0 1-.7.7H7.7a.7.7 0 0 1-.7-.7v-1.6zm4 0a.7.7 0 0 1 .7-.7h1.6a.7.7 0 0 1 .7.7v1.6a.7.7 0 0 1-.7.7h-1.6a.7.7 0 0 1-.7-.7v-1.6zm4 0a.7.7 0 0 1 .7-.7h1.6a.7.7 0 0 1 .7.7v1.6a.7.7 0 0 1-.7.7h-1.6a.7.7 0 0 1-.7-.7v-1.6z"
                  />
                </svg>
              ) : (
                <CalendarDays className="h-5 w-5 shrink-0 text-gray-400 dark:text-gray-400" />
              )}
            </div>
            <span className="truncate max-w-[66px] text-center leading-tight shrink-0 mt-0.5">تقویم</span>
          </>
        )}
      </NavLink>
      </div>
    </nav>
  );
};


