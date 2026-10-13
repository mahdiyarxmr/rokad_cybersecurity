import React, { useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import {
  LayoutDashboard,
  Building2,
  CreditCard,
  Sliders,
  ShieldCheck,
  Activity,
  GraduationCap,
  Users,
  CalendarDays,
  FileCheck,
  BookOpen,
  HelpCircle,
  BarChart3,
  Receipt,
  Wallet,
  MessageSquare,
  Sparkles,
  X,
  Vote,
  School,
  ShieldAlert,
  UserCheck,
  Award,
  Star,
  FileQuestion,
  ChevronLeft,
  Compass,
  CalendarRange,
  Scale,
  Briefcase,
  KeyRound,
} from 'lucide-react';
import { CoinStackIcon } from '../../components/icons/CustomNavIcons';
import { UserRole } from '../../types/auth';
import { useSidebarStore } from '../../lib/ui/sidebar-store';
import { useScrollLock } from '../../lib/hooks/useScrollLock';
import { useCuriosityStore } from '../../lib/ui/curiosity-store';
import { toPersianDigits } from '../../lib/utils';

export interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string; solid?: boolean }>;
  badge?: string;
}

export interface SidebarProps {
  role?: UserRole;
}

export const Sidebar: React.FC<SidebarProps> = ({ role }) => {
  const { isOpen, close } = useSidebarStore();
  const location = useLocation();
  const navigate = useNavigate();

  useScrollLock(isOpen);

  // Auto-close mobile drawer when location/route changes
  useEffect(() => {
    close();
  }, [location.pathname, close]);

  const getNavItems = (): { section: string; items: NavItem[] }[] => {
    const isManagerOrAdmin = role === 'SUPER_ADMIN' || role === 'SCHOOL_ADMIN' || role === 'STAFF';

    const clubLink = (() => {
      if (isManagerOrAdmin) {
        return { title: 'باشگاه کسب‌وکار', href: '/app/admin/club', icon: Award };
      }
      if (role === 'TEACHER') {
        return null;
      }
      return { title: 'باشگاه کارآفرینی رُکاد', href: '/app/club', icon: Award };
    })();

    const commsSection = {
      section: 'ارتباطات و اکوسیستم',
      items: [
        ...(isManagerOrAdmin ? [{ title: 'سامانه پیامک هوشمند', href: '/app/sms', icon: MessageSquare }] : []),
        { title: 'رسانه هنرستان', href: '/app/media', icon: Sparkles },
        { title: 'پیام‌ها', href: '/app/messages', icon: MessageSquare },
        { title: 'تقویم آموزشی', href: '/app/calendar', icon: CalendarDays },
        { title: 'رویدادها', href: '/app/events', icon: CalendarRange },
        { title: 'کوچینگ', href: '/app/coaching', icon: Compass },
        { title: 'نظرسنجی', href: '/app/polls', icon: Vote },
        { title: 'پلتفرم کا', href: '/app/ka-platform', icon: CoinStackIcon },
        ...(clubLink ? [clubLink] : []),
      ],
    };

    switch (role) {
      case 'SUPER_ADMIN':
        return [
          {
            section: 'مرکز فرماندهی SaaS',
            items: [
              { title: 'داشبورد', href: '/app/super-admin/dashboard', icon: LayoutDashboard },
              { title: 'مدیریت شعب و تننت‌ها', href: '/app/super-admin/tenants', icon: Building2 },
              { title: 'اشتراک‌ها و سهمیه‌ها', href: '/app/super-admin/subscriptions', icon: CreditCard },
              { title: 'قالب‌های نقش پویا', href: '/app/super-admin/role-templates', icon: Sliders },
              { title: 'عملیات و وضعیت سامانه', href: '/app/super-admin/ops', icon: Activity },
              { title: 'باشگاه کسب‌وکار', href: '/app/admin/club', icon: Award },
            ],
          },
          commsSection,
        ];

      case 'SCHOOL_ADMIN':
      case 'STAFF':
        return [
          {
            section: 'راهبری هنرستان',
            items: [
              { title: 'داشبورد', href: '/app/admin/dashboard', icon: LayoutDashboard },
              { title: 'ساختار سال و کلاس‌ها', href: '/app/admin/academic', icon: BookOpen },
              { title: 'برنامه هفتگی', href: '/app/admin/schedule', icon: CalendarDays },
              { title: 'دانش‌آموزان', href: '/app/admin/members?tab=students', icon: GraduationCap },
              { title: 'کادر آموزشی', href: '/app/admin/members?tab=staff', icon: Briefcase },
              { title: 'گاوصندوق رمز عبور', href: '/app/admin/vault', icon: KeyRound },
              { title: 'سازنده نقش‌ها و دسترسی‌ها', href: '/app/admin/roles', icon: ShieldCheck },
              { title: 'انضباطی/تشویقی', href: '/app/admin/matters', icon: Scale },
              { title: 'پروفایل رسمی مدرسه', href: '/app/admin/profile', icon: School },
              { title: 'باشگاه کسب‌وکار', href: '/app/admin/club', icon: Award },
            ],
          },
          {
            section: 'آموزش و پایش کلاس‌ها',
            items: [
              { title: 'ارزشیابی و نمرات', href: '/app/admin/gradebook', icon: BookOpen },
              { title: 'دفتر کلاسی', href: '/app/admin/attendance', icon: UserCheck },
              { title: 'تکالیف', href: '/app/admin/homework', icon: FileCheck },
              { title: 'آزمون‌ها', href: '/app/admin/exams', icon: HelpCircle },
              { title: 'بانک سوالات', href: '/app/admin/question-bank', icon: FileQuestion },
              { title: 'محتوای آموزشی', href: '/app/admin/lessons', icon: BookOpen },
            ],
          },
          {
            section: 'امور مالی و اداری',
            items: [
              { title: 'شهریه و اقساط', href: '/app/admin/finance/fees', icon: Receipt },
              { title: 'حقوق و دستمزد', href: '/app/admin/finance/payroll', icon: Wallet },
              { title: 'گزارش‌های جامع', href: '/app/admin/reports', icon: BarChart3 },
            ],
          },
          commsSection,
        ];

      case 'TEACHER':
        return [
          {
            section: 'میز کار مربی',
            items: [
              { title: 'داشبورد', href: '/app/teacher/dashboard', icon: LayoutDashboard },
              { title: 'دفتر کلاسی', href: '/app/teacher/attendance', icon: UserCheck },
              { title: 'ارزشیابی و نمرات', href: '/app/teacher/gradebook', icon: BookOpen },
              { title: 'محتوای آموزشی', href: '/app/teacher/lessons', icon: BookOpen },
              { title: 'برنامه هفتگی', href: '/app/teacher/schedule', icon: CalendarDays },
              { title: 'تکالیف', href: '/app/teacher/homework', icon: FileCheck },
              { title: 'آزمون‌ها', href: '/app/teacher/exams', icon: HelpCircle },
              { title: 'بانک سوالات', href: '/app/teacher/question-bank', icon: FileQuestion },
              { title: 'انضباطی/تشویقی', href: '/app/teacher/matters', icon: Scale },
              { title: 'ملاقات با اولیاء', href: '/app/teacher/visits', icon: UserCheck },
              { title: 'فیش حقوقی', href: '/app/teacher/payroll', icon: Wallet },
              { title: 'تأییدیه‌ها', href: '/app/teacher/club-approvals', icon: Award },
            ],
          },
          commsSection,
        ];

      case 'STUDENT':
        return [
          {
            section: 'پرتال دانش‌آموز',
            items: [
              { title: 'داشبورد', href: '/app/student/dashboard', icon: LayoutDashboard },
              { title: 'برنامه هفتگی', href: '/app/student/schedule', icon: CalendarDays },
              { title: 'تکالیف', href: '/app/student/homework', icon: FileCheck },
              { title: 'آزمون‌ها', href: '/app/student/exams', icon: HelpCircle },
              { title: 'نمرات و کارنامه', href: '/app/student/grades', icon: BarChart3 },
              { title: 'محتوای آموزشی', href: '/app/student/materials', icon: BookOpen },
              { title: 'انضباطی/تشویقی', href: '/app/student/matters', icon: Scale },
            ],
          },
          commsSection,
        ];

      case 'PARENT':
        return [
          {
            section: 'پرتال اولیاء دانش‌آموز',
            items: [
              { title: 'داشبورد', href: '/app/parent/dashboard', icon: LayoutDashboard },
              { title: 'شهریه', href: '/app/parent/fees', icon: CreditCard },
              { title: 'برنامه هفتگی', href: '/app/parent/schedule', icon: CalendarDays },
              { title: 'تکالیف', href: '/app/parent/homework', icon: FileCheck },
              { title: 'آزمون‌ها', href: '/app/parent/exams', icon: HelpCircle },
              { title: 'کارنامه و نمرات', href: '/app/parent/reports', icon: BarChart3 },
              { title: 'انضباطی/تشویقی', href: '/app/parent/matters', icon: Scale },
              { title: 'ملاقات با کادر آموزشی', href: '/app/parent/visits', icon: UserCheck },
            ],
          },
          commsSection,
        ];

      case 'COACH':
        return [
          {
            section: 'میز کار هدایت و مربی‌گری',
            items: [
              { title: 'کوچینگ', href: '/app/coaching', icon: Compass },
              { title: 'تقویم آموزشی', href: '/app/calendar', icon: CalendarDays },
              { title: 'رویدادها', href: '/app/events', icon: CalendarRange },
            ],
          },
          commsSection,
        ];

      default:
        return [commsSection];
    }
  };

  const navSections = getNavItems();

  const isItemActive = (itemHref: string) => {
    const [hrefPath, hrefQuery] = itemHref.split('?');
    if (hrefQuery) {
      if (location.pathname !== hrefPath) return false;
      const searchParams = new URLSearchParams(location.search);
      const hrefParams = new URLSearchParams(hrefQuery);
      const currentTab = searchParams.get('tab') || 'students';
      const expectedTab = hrefParams.get('tab');
      return currentTab === expectedTab;
    }
    return (
      location.pathname === itemHref ||
      (itemHref !== '/app' && location.pathname.startsWith(itemHref) && !location.search)
    );
  };

  const renderNavSections = () => (
    <div className="space-y-6">
      {navSections.map((section, idx) => (
        <div key={idx} className="space-y-1.5">
          <h2 className="px-3 text-[11px] font-black tracking-wider text-ink-normal/50 dark:text-gray-400 uppercase">
            {section.section}
          </h2>
          <nav className="space-y-1">
            {section.items.map((item) => {
              const active = isItemActive(item.href);
              return (
                <NavLink
                  key={item.href}
                  to={item.href}
                  className={twMerge(
                    clsx(
                      'flex items-center justify-between px-3.5 py-2.5 min-h-[44px] rounded-xl text-[13px] sm:text-[14px] font-medium transition-all group select-none',
                      active
                        ? 'font-bold bg-ecosystem-light dark:bg-ecosystem-darker/60 text-ecosystem-darker dark:text-ecosystem-light border border-primary/40 shadow-[2px_2px_0_#59BBAF]'
                        : 'text-ink-normal dark:text-gray-300 hover:bg-gray-100/70 dark:hover:bg-gray-800/60 hover:text-ink-darker dark:hover:text-white',
                    ),
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <item.icon
                      className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${
                        active ? 'text-primary' : 'text-gray-400 dark:text-gray-500'
                      }`}
                    />
                    <span className="truncate">{item.title}</span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {item.badge && (
                      <span className="bg-primary text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
                        {item.badge}
                      </span>
                    )}
                    <ChevronLeft
                      className={`w-3.5 h-3.5 text-primary transition-opacity ${
                        active ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                      }`}
                    />
                  </div>
                </NavLink>
              );
            })}
          </nav>
        </div>
      ))}
    </div>
  );

  const recordCuriosityClick = useCuriosityStore((s) => s.recordClick);

  const renderFooterBanner = () => (
    <div className="rounded-xl bg-gray-50 dark:bg-[#161D2A] p-2.5 border border-gray-200 dark:border-gray-800 text-center select-none">
      <div
        onClick={() => navigate('/app')}
        className="flex items-center justify-center space-x-1.5 space-x-reverse text-gray-600 dark:text-gray-300 font-bold text-xs cursor-pointer hover:text-primary transition-colors active:scale-95"
      >
        <img src="/logo.svg" alt="رکاد" className="h-4 w-4 rounded-md object-cover inline-block shrink-0" />
        <span>سامانه یکپارچه رکاد</span>
      </div>
      <button
        type="button"
        onClick={recordCuriosityClick}
        title="نسخه ۱.۰.۰"
        className="mt-1 text-[10.5px] text-gray-400/90 dark:text-gray-500 font-mono hover:text-amber-500 dark:hover:text-amber-400 transition-colors cursor-pointer active:scale-95 inline-block"
      >
        نسخه {toPersianDigits('1.0.0')}
      </button>
    </div>
  );

  return (
    <>
      {/* 1. Desktop Persistent Sidebar (Independent Scroll) */}
      <aside className="hidden lg:flex w-72 h-full border-l border-[#EAEAEA] dark:border-gray-800 bg-white dark:bg-[#121824] flex-col shrink-0 transition-colors z-30 select-none">
        <div className="flex-1 overflow-y-auto p-4 space-y-4 overscroll-contain custom-sidebar-scroll">
          {renderNavSections()}
        </div>
        <div className="p-4 border-t border-[#EAEAEA] dark:border-gray-800 bg-white dark:bg-[#121824] shrink-0">
          {renderFooterBanner()}
        </div>
      </aside>

      {/* 2. Mobile Off-canvas Drawer Backdrop */}
      {isOpen && (
        <div
          onClick={close}
          className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 lg:hidden transition-opacity"
          aria-hidden="true"
        />
      )}

      {/* 3. Mobile Off-canvas Drawer */}
      <aside
        className={twMerge(
          clsx(
            'fixed inset-y-0 right-0 z-50 w-72 sm:w-80 bg-white dark:bg-[#121824] border-l border-[#EAEAEA] dark:border-gray-800 flex flex-col shadow-2xl transition-transform duration-300 ease-in-out lg:hidden',
            isOpen ? 'translate-x-0' : 'translate-x-full',
          ),
        )}
      >
        {/* Drawer Header */}
        <div className="pt-[calc(1rem+env(safe-area-inset-top,0px))] px-4 pb-4 border-b border-[#EAEAEA] dark:border-gray-800 flex items-center justify-between bg-gray-50/70 dark:bg-[#161D2A] shrink-0">
          <div
            onClick={() => {
              navigate('/app');
              close();
            }}
            className="flex items-center gap-2.5 cursor-pointer active:scale-95 transition-transform"
          >
            <img
              src="/logo.svg"
              alt="رکاد"
              className="h-8 w-8 rounded-xl object-cover border border-primary/30 shadow-[1.5px_1.5px_0_#59BBAF] shrink-0"
            />
            <div>
              <span className="font-black text-sm text-sec dark:text-white block leading-tight">
                منوی رکاد
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={close}
            aria-label="بستن منو"
            className="h-11 w-11 min-h-[44px] min-w-[44px] rounded-xl text-gray-400 hover:text-ink-dark dark:hover:text-white hover:bg-gray-200/60 dark:hover:bg-gray-800 flex items-center justify-center transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Nav Sections */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
          {renderNavSections()}
        </div>

        {/* Docked Drawer Footer */}
        <div className="pt-4 px-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] border-t border-[#EAEAEA] dark:border-gray-800 bg-white dark:bg-[#121824] shrink-0">
          {renderFooterBanner()}
        </div>
      </aside>
    </>
  );
};
