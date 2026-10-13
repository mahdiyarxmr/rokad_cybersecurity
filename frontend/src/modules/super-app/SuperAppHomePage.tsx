import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../../lib/auth/auth-store';
import { useTenantStore } from '../../lib/auth/tenant-store';
import { apiClient } from '../../lib/api/client';
import { formatToJalali, toPersianDigits, cleanUserFullName } from '../../lib/utils';
import { HomeBannerSlider } from './components/HomeBannerSlider';
import { BannerSettingsModal } from './components/BannerSettingsModal';
import {
  BookOpen,
  FileCheck,
  HelpCircle,
  BarChart3,
  CalendarDays,
  Vote,
  Users,
  ShieldAlert,
  Receipt,
  UserCheck,
  Wallet,
  Building2,
  Activity,
  Sliders,
  FileQuestion,
  GraduationCap,
  LayoutDashboard,
  ChevronLeft,
  Compass,
  CalendarRange,
  Scale,
  Sparkles,
  MessageSquare,
  Briefcase,
  Award,
  KeyRound,
  ShieldCheck,
  School,
  CreditCard,
  Smartphone,
} from 'lucide-react';
import { CoinStackIcon } from '../../components/icons/CustomNavIcons';

interface SuperAppCard {
  id: string;
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  iconColor: string;
  badge?: string;
}

interface CardSection {
  id: string;
  title: string;
  cards: SuperAppCard[];
}

export const SuperAppHomePage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const user = useAuthStore((state) => state.user);
  const currentTenant = useTenantStore((state) => state.currentTenant);

  // Admin Banner Settings Modal
  const [isBannerSettingsOpen, setIsBannerSettingsOpen] = useState(false);

  useEffect(() => {
    if (searchParams.get('manageBanners') === 'true') {
      setIsBannerSettingsOpen(true);
      searchParams.delete('manageBanners');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  // Live Persian Date
  const [liveDate] = useState(() =>
    formatToJalali(new Date(), { showMonthName: true, includeDayName: true })
  );

  // Quick stats state
  const [unreadMessagesCount, setUnreadMessagesCount] = useState<number>(0);
  const [homeworkCount, setHomeworkCount] = useState<number>(0);
  const [examsCount, setExamsCount] = useState<number>(0);
  const [eventsCount, setEventsCount] = useState<number>(0);
  const [pollsCount, setPollsCount] = useState<number>(0);

  useEffect(() => {
    const fetchQuickStats = async () => {
      try {
        const [hwRes, exRes, messagesRes, eventsRes, pollsRes] = await Promise.allSettled([
          apiClient.get('/homework'),
          apiClient.get('/exams'),
          apiClient.get('/messages/inbox?unreadOnly=true'),
          apiClient.get('/calendar/events'),
          apiClient.get('/polls'),
        ]);

        const now = Date.now();

        if (hwRes.status === 'fulfilled') {
          const list = Array.isArray(hwRes.value.data) ? hwRes.value.data : [];
          const pendingCount = list.filter((hw: any) => {
            const hasSub = hw.submissions && hw.submissions.length > 0;
            if (hasSub) return false;
            const isPastDue = hw.dueDate ? new Date(hw.dueDate).getTime() < now : false;
            return !isPastDue;
          }).length;
          setHomeworkCount(pendingCount);
        }
        if (exRes.status === 'fulfilled') {
          const list = Array.isArray(exRes.value.data) ? exRes.value.data : [];
          const holdingCount = list.filter((e: any) => {
            const start = new Date(e.startTime).getTime();
            const end = new Date(e.endTime).getTime();
            const part = e.participations?.[0];
            const isSubmitted = part?.status === 'SUBMITTED' || part?.status === 'TIMED_OUT';
            const hasScore = part?.totalScore !== null && part?.totalScore !== undefined;
            return now >= start && now <= end && !isSubmitted && !hasScore && e.status !== 'FINISHED';
          }).length;
          setExamsCount(holdingCount);
        }
        if (messagesRes.status === 'fulfilled') {
          const res = messagesRes.value.data;
          const count = res?.meta?.unreadCount ?? (Array.isArray(res?.data) ? res.data.length : 0);
          setUnreadMessagesCount(count);
        }
        if (eventsRes.status === 'fulfilled') {
          const list = Array.isArray(eventsRes.value.data) ? eventsRes.value.data : [];
          const currentlyLiveEvents = list.filter((ev: any) => {
            if (
              ev.isArchived ||
              ev.isCancelled ||
              ev.status === 'CANCELLED' ||
              ev.status === 'COMPLETED' ||
              ev.eventType === 'HOLIDAY' ||
              ev.type === 'HOLIDAY'
            ) {
              return false;
            }

            // Start timestamp
            let start = 0;
            if (ev.startDate) {
              const d = new Date(ev.startDate);
              if (!isNaN(d.getTime())) {
                if (ev.isAllDay || (typeof ev.startDate === 'string' && ev.startDate.length === 10)) {
                  d.setHours(0, 0, 0, 0);
                }
                start = d.getTime();
              }
            } else if (ev.startTime) {
              const d = new Date(ev.startTime);
              if (!isNaN(d.getTime())) start = d.getTime();
            }

            // End timestamp
            let end = 0;
            if (ev.endDate) {
              const d = new Date(ev.endDate);
              if (!isNaN(d.getTime())) {
                if (ev.isAllDay || (typeof ev.endDate === 'string' && ev.endDate.length === 10)) {
                  d.setHours(23, 59, 59, 999);
                }
                end = d.getTime();
              }
            } else if (ev.endTime) {
              const d = new Date(ev.endTime);
              if (!isNaN(d.getTime())) end = d.getTime();
            } else if (start > 0) {
              const d = new Date(start);
              d.setHours(23, 59, 59, 999);
              end = d.getTime();
            }

            // Event is actively taking place right now
            return start > 0 && end > 0 && now >= start && now <= end;
          }).length;
          setEventsCount(currentlyLiveEvents);
        }
        if (pollsRes.status === 'fulfilled') {
          const list = Array.isArray(pollsRes.value.data) ? pollsRes.value.data : [];
          const activePolls = list.filter((p: any) => {
            if (p.isArchived || p.isClosed) return false;
            const start = p.startDate ? new Date(p.startDate).getTime() : 0;
            const end = p.endDate ? new Date(p.endDate).getTime() : 0;
            return (start === 0 || now >= start) && (end === 0 || now <= end);
          }).length;
          setPollsCount(activePolls);
        }
      } catch {
        // silent fallback
      }
    };

    fetchQuickStats();
  }, []);

  const getRoleTitle = () => {
    switch (user?.role) {
      case 'SUPER_ADMIN':
        return 'سوپرادمین کلان';
      case 'SCHOOL_ADMIN':
        return 'راهبر';
      case 'STAFF':
        return 'کادر اجرایی';
      case 'TEACHER':
        return 'مربی';
      case 'STUDENT':
        return 'دانش‌آموز';
      case 'PARENT':
        return 'ولی دانش‌آموز';
      case 'COACH':
        return 'کوچ و مشاور';
      default:
        return 'کاربر';
    }
  };

  const getDashboardHref = (): string => {
    switch (user?.role) {
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

  const getCardSections = (): CardSection[] => {
    switch (user?.role) {
      case 'SCHOOL_ADMIN':
      case 'STAFF':
        return [
          {
            id: 'admin-academic',
            title: 'آموزش و پایش کلاس‌ها',
            cards: [
              {
                id: 'admin-gradebook',
                title: 'ارزشیابی و ثبت نمرات',
                href: '/app/admin/gradebook',
                icon: BarChart3,
                iconBg: 'bg-male-light dark:bg-[#182346]',
                iconColor: 'text-sec dark:text-[#8194EE]',
              },
              {
                id: 'admin-attendance',
                title: 'دفتر کلاسی و حضور غیاب',
                href: '/app/admin/attendance',
                icon: UserCheck,
                iconBg: 'bg-ecosystem-light dark:bg-[#163330]',
                iconColor: 'text-primary-dark dark:text-primary',
              },
              {
                id: 'admin-homework',
                title: 'تکالیف و بازخورد',
                href: '/app/admin/homework',
                icon: FileCheck,
                iconBg: 'bg-club-light dark:bg-[#2A173E]',
                iconColor: 'text-club dark:text-[#C084FC]',
                badge: homeworkCount > 0 ? toPersianDigits(homeworkCount) : undefined,
              },
              {
                id: 'admin-exams',
                title: 'آزمون‌های آنلاین و کارنامه',
                href: '/app/admin/exams',
                icon: HelpCircle,
                iconBg: 'bg-college-light dark:bg-[#38260D]',
                iconColor: 'text-third dark:text-[#FBBF24]',
                badge: examsCount > 0 ? toPersianDigits(examsCount) : undefined,
              },
              {
                id: 'admin-question-bank',
                title: 'بانک سوالات متمرکز',
                href: '/app/admin/question-bank',
                icon: FileQuestion,
                iconBg: 'bg-male-light dark:bg-[#182346]',
                iconColor: 'text-sec dark:text-[#8194EE]',
              },
              {
                id: 'admin-lessons',
                title: 'طرح درس و محتوا',
                href: '/app/admin/lessons',
                icon: BookOpen,
                iconBg: 'bg-female-light dark:bg-[#3D1426]',
                iconColor: 'text-girl dark:text-[#F472B6]',
              },
            ],
          },
          {
            id: 'admin-operations',
            title: 'راهبری هنرستان',
            cards: [
              {
                id: 'admin-academic-struct',
                title: 'ساختار سال و کلاس‌ها',
                href: '/app/admin/academic',
                icon: BookOpen,
                iconBg: 'bg-ecosystem-light dark:bg-[#163330]',
                iconColor: 'text-primary-dark dark:text-primary',
              },
              {
                id: 'admin-schedule',
                title: 'برنامه هفتگی کلاس‌ها',
                href: '/app/admin/schedule',
                icon: CalendarDays,
                iconBg: 'bg-ecosystem-light dark:bg-[#163330]',
                iconColor: 'text-primary-dark dark:text-primary',
              },
              {
                id: 'admin-students',
                title: 'دانش‌آموزان',
                href: '/app/admin/members?tab=students',
                icon: GraduationCap,
                iconBg: 'bg-male-light dark:bg-[#182346]',
                iconColor: 'text-sec dark:text-[#8194EE]',
              },
              {
                id: 'admin-staff',
                title: 'کادر آموزشی',
                href: '/app/admin/members?tab=staff',
                icon: Briefcase,
                iconBg: 'bg-club-light dark:bg-[#2A173E]',
                iconColor: 'text-club dark:text-[#C084FC]',
              },
              {
                id: 'admin-vault',
                title: 'گاوصندوق رمز عبور',
                href: '/app/admin/vault',
                icon: KeyRound,
                iconBg: 'bg-amber-100 dark:bg-amber-950/60',
                iconColor: 'text-amber-600 dark:text-amber-400',
              },
              {
                id: 'admin-roles',
                title: 'سازنده نقش‌ها و دسترسی‌ها',
                href: '/app/admin/roles',
                icon: ShieldCheck,
                iconBg: 'bg-male-light dark:bg-[#182346]',
                iconColor: 'text-sec dark:text-[#8194EE]',
              },
              {
                id: 'admin-matters',
                title: 'انضباطی/تشویقی',
                href: '/app/admin/matters',
                icon: Scale,
                iconBg: 'bg-college-light dark:bg-[#38260D]',
                iconColor: 'text-third dark:text-[#FBBF24]',
              },
              {
                id: 'admin-profile',
                title: 'پروفایل رسمی مدرسه',
                href: '/app/admin/profile',
                icon: School,
                iconBg: 'bg-ecosystem-light dark:bg-[#163330]',
                iconColor: 'text-primary-dark dark:text-primary',
              },
            ],
          },
          {
            id: 'admin-finance',
            title: 'امور مالی و اداری',
            cards: [
              {
                id: 'admin-fees',
                title: 'شهریه و اقساط',
                href: '/app/admin/finance/fees',
                icon: Receipt,
                iconBg: 'bg-club-light dark:bg-[#2A173E]',
                iconColor: 'text-club dark:text-[#C084FC]',
              },
              {
                id: 'admin-payroll',
                title: 'حقوق و دستمزد',
                href: '/app/admin/finance/payroll',
                icon: Wallet,
                iconBg: 'bg-male-light dark:bg-[#182346]',
                iconColor: 'text-sec dark:text-[#8194EE]',
              },
              {
                id: 'admin-reports',
                title: 'گزارش‌های جامع',
                href: '/app/admin/reports',
                icon: BarChart3,
                iconBg: 'bg-college-light dark:bg-[#38260D]',
                iconColor: 'text-third dark:text-[#FBBF24]',
              },
            ],
          },
          {
            id: 'admin-ecosystem',
            title: 'ارتباطات و اکوسیستم',
            cards: [
              {
                id: 'admin-sms',
                title: 'سامانه پیامک هوشمند',
                href: '/app/sms',
                icon: Smartphone,
                iconBg: 'bg-emerald-50 dark:bg-[#132A20]',
                iconColor: 'text-emerald-600 dark:text-emerald-400',
              },
              {
                id: 'admin-messages',
                title: 'پیام‌ها و مکاتبات',
                href: '/app/messages',
                icon: MessageSquare,
                iconBg: 'bg-ecosystem-light dark:bg-[#163330]',
                iconColor: 'text-primary-dark dark:text-primary',
                badge: unreadMessagesCount > 0 ? toPersianDigits(unreadMessagesCount) : undefined,
              },
              {
                id: 'admin-calendar',
                title: 'تقویم آموزشی',
                href: '/app/calendar',
                icon: CalendarDays,
                iconBg: 'bg-ecosystem-light dark:bg-[#163330]',
                iconColor: 'text-primary-dark dark:text-primary',
              },
              {
                id: 'admin-events',
                title: 'رودمپ رویدادها',
                href: '/app/events',
                icon: CalendarRange,
                iconBg: 'bg-college-light dark:bg-[#38260D]',
                iconColor: 'text-third dark:text-[#FBBF24]',
                badge: eventsCount > 0 ? toPersianDigits(eventsCount) : undefined,
              },
              {
                id: 'admin-media',
                title: 'رسانه هنرستان',
                href: '/app/media',
                icon: Sparkles,
                iconBg: 'bg-female-light dark:bg-[#3D1426]',
                iconColor: 'text-girl dark:text-[#F472B6]',
              },
              {
                id: 'admin-coaching',
                title: 'کوچینگ و مربی‌گری',
                href: '/app/coaching',
                icon: Compass,
                iconBg: 'bg-club-light dark:bg-[#2A173E]',
                iconColor: 'text-club dark:text-[#C084FC]',
              },
              {
                id: 'admin-polls',
                title: 'پرس‌کاد (نظرسنجی و آراء)',
                href: '/app/polls',
                icon: Vote,
                iconBg: 'bg-college-light dark:bg-[#38260D]',
                iconColor: 'text-third dark:text-[#FBBF24]',
                badge: pollsCount > 0 ? toPersianDigits(pollsCount) : undefined,
              },
              {
                id: 'admin-club',
                title: 'باشگاه کسب‌وکار',
                href: '/app/admin/club',
                icon: Award,
                iconBg: 'bg-amber-100 dark:bg-amber-950/60',
                iconColor: 'text-amber-600 dark:text-amber-400',
              },
              {
                id: 'admin-ka',
                title: 'پلتفرم کا',
                href: '/app/ka-platform',
                icon: CoinStackIcon,
                iconBg: 'bg-amber-50 dark:bg-[#2A2010]',
                iconColor: 'text-amber-500',
              },
            ],
          },
        ];

      case 'TEACHER':
        return [
          {
            id: 'teacher-classes',
            title: 'آموزش و کلاس‌ها',
            cards: [
              {
                id: 'teacher-attendance',
                title: 'دفتر کلاسی',
                href: '/app/teacher/attendance',
                icon: UserCheck,
                iconBg: 'bg-ecosystem-light dark:bg-[#163330]',
                iconColor: 'text-primary-dark dark:text-primary',
              },
              {
                id: 'teacher-gradebook',
                title: 'ارزشیابی و نمرات',
                href: '/app/teacher/gradebook',
                icon: BookOpen,
                iconBg: 'bg-male-light dark:bg-[#182346]',
                iconColor: 'text-sec dark:text-[#8194EE]',
              },
              {
                id: 'teacher-homework',
                title: 'تکالیف',
                href: '/app/teacher/homework',
                icon: FileCheck,
                iconBg: 'bg-club-light dark:bg-[#2A173E]',
                iconColor: 'text-club dark:text-[#C084FC]',
              },
              {
                id: 'teacher-exams',
                title: 'آزمون‌ها',
                href: '/app/teacher/exams',
                icon: HelpCircle,
                iconBg: 'bg-college-light dark:bg-[#38260D]',
                iconColor: 'text-third dark:text-[#FBBF24]',
              },
              {
                id: 'teacher-question-bank',
                title: 'بانک سوالات',
                href: '/app/teacher/question-bank',
                icon: FileQuestion,
                iconBg: 'bg-male-light dark:bg-[#182346]',
                iconColor: 'text-sec dark:text-[#8194EE]',
              },
              {
                id: 'teacher-lessons',
                title: 'محتوای آموزشی',
                href: '/app/teacher/lessons',
                icon: BookOpen,
                iconBg: 'bg-female-light dark:bg-[#3D1426]',
                iconColor: 'text-girl dark:text-[#F472B6]',
              },
            ],
          },
          {
            id: 'teacher-desk',
            title: 'برنامه و امور مربی',
            cards: [
              {
                id: 'teacher-schedule',
                title: 'برنامه هفتگی',
                href: '/app/teacher/schedule',
                icon: CalendarDays,
                iconBg: 'bg-ecosystem-light dark:bg-[#163330]',
                iconColor: 'text-primary-dark dark:text-primary',
              },
              {
                id: 'teacher-matters',
                title: 'انضباطی/تشویقی',
                href: '/app/teacher/matters',
                icon: Scale,
                iconBg: 'bg-college-light dark:bg-[#38260D]',
                iconColor: 'text-third dark:text-[#FBBF24]',
              },
              {
                id: 'teacher-visits',
                title: 'ملاقات با اولیاء',
                href: '/app/teacher/visits',
                icon: Users,
                iconBg: 'bg-club-light dark:bg-[#2A173E]',
                iconColor: 'text-club dark:text-[#C084FC]',
              },
              {
                id: 'teacher-payroll',
                title: 'فیش حقوقی',
                href: '/app/teacher/payroll',
                icon: Wallet,
                iconBg: 'bg-ecosystem-light dark:bg-[#163330]',
                iconColor: 'text-primary-dark dark:text-primary',
              },
              {
                id: 'teacher-club-approvals',
                title: 'تأییدیه‌ها',
                href: '/app/teacher/club-approvals',
                icon: Award,
                iconBg: 'bg-amber-100 dark:bg-amber-950/60',
                iconColor: 'text-amber-600 dark:text-amber-400',
              },
            ],
          },
          {
            id: 'teacher-ecosystem',
            title: 'ارتباطات و اکوسیستم',
            cards: [
              {
                id: 'teacher-messages',
                title: 'پیام‌ها',
                href: '/app/messages',
                icon: MessageSquare,
                iconBg: 'bg-ecosystem-light dark:bg-[#163330]',
                iconColor: 'text-primary-dark dark:text-primary',
                badge: unreadMessagesCount > 0 ? toPersianDigits(unreadMessagesCount) : undefined,
              },
              {
                id: 'teacher-events',
                title: 'رویدادها',
                href: '/app/events',
                icon: CalendarRange,
                iconBg: 'bg-college-light dark:bg-[#38260D]',
                iconColor: 'text-third dark:text-[#FBBF24]',
                badge: eventsCount > 0 ? toPersianDigits(eventsCount) : undefined,
              },
              {
                id: 'teacher-coaching',
                title: 'کوچینگ',
                href: '/app/coaching',
                icon: Compass,
                iconBg: 'bg-club-light dark:bg-[#2A173E]',
                iconColor: 'text-club dark:text-[#C084FC]',
              },
              {
                id: 'teacher-polls',
                title: 'نظرسنجی‌ها',
                href: '/app/polls',
                icon: Vote,
                iconBg: 'bg-college-light dark:bg-[#38260D]',
                iconColor: 'text-third dark:text-[#FBBF24]',
                badge: pollsCount > 0 ? toPersianDigits(pollsCount) : undefined,
              },
            ],
          },
        ];

      case 'PARENT':
        return [
          {
            id: 'parent-student',
            title: 'امور فرزند و مدرسه',
            cards: [
              {
                id: 'parent-schedule',
                title: 'برنامه هفتگی فرزند',
                href: '/app/parent/schedule',
                icon: CalendarDays,
                iconBg: 'bg-ecosystem-light dark:bg-[#163330]',
                iconColor: 'text-primary-dark dark:text-primary',
              },
              {
                id: 'parent-reports',
                title: 'کارنامه و نمرات',
                href: '/app/parent/reports',
                icon: BarChart3,
                iconBg: 'bg-college-light dark:bg-[#38260D]',
                iconColor: 'text-third dark:text-[#FBBF24]',
              },
              {
                id: 'parent-fees',
                title: 'پرداخت شهریه و اقساط',
                href: '/app/parent/fees',
                icon: CreditCard,
                iconBg: 'bg-club-light dark:bg-[#2A173E]',
                iconColor: 'text-club dark:text-[#C084FC]',
              },
              {
                id: 'parent-matters',
                title: 'انضباطی/تشویقی',
                href: '/app/parent/matters',
                icon: Scale,
                iconBg: 'bg-college-light dark:bg-[#38260D]',
                iconColor: 'text-third dark:text-[#FBBF24]',
              },
              {
                id: 'parent-visits',
                title: 'ملاقات با کادر آموزشی',
                href: '/app/parent/visits',
                icon: Users,
                iconBg: 'bg-club-light dark:bg-[#2A173E]',
                iconColor: 'text-club dark:text-[#C084FC]',
              },
            ],
          },
          {
            id: 'parent-ecosystem',
            title: 'ارتباطات و اکوسیستم',
            cards: [
              {
                id: 'parent-messages',
                title: 'پیام‌ها و مکاتبات',
                href: '/app/messages',
                icon: MessageSquare,
                iconBg: 'bg-ecosystem-light dark:bg-[#163330]',
                iconColor: 'text-primary-dark dark:text-primary',
                badge: unreadMessagesCount > 0 ? toPersianDigits(unreadMessagesCount) : undefined,
              },
              {
                id: 'parent-calendar',
                title: 'تقویم آموزشی',
                href: '/app/calendar',
                icon: CalendarDays,
                iconBg: 'bg-ecosystem-light dark:bg-[#163330]',
                iconColor: 'text-primary-dark dark:text-primary',
              },
              {
                id: 'parent-events',
                title: 'رودمپ رویدادها',
                href: '/app/events',
                icon: CalendarRange,
                iconBg: 'bg-college-light dark:bg-[#38260D]',
                iconColor: 'text-third dark:text-[#FBBF24]',
                badge: eventsCount > 0 ? toPersianDigits(eventsCount) : undefined,
              },
              {
                id: 'parent-media',
                title: 'رسانه هنرستان',
                href: '/app/media',
                icon: Sparkles,
                iconBg: 'bg-female-light dark:bg-[#3D1426]',
                iconColor: 'text-girl dark:text-[#F472B6]',
              },
              {
                id: 'parent-coaching',
                title: 'کوچینگ و مشاوره',
                href: '/app/coaching',
                icon: Compass,
                iconBg: 'bg-club-light dark:bg-[#2A173E]',
                iconColor: 'text-club dark:text-[#C084FC]',
              },
              {
                id: 'parent-polls',
                title: 'پرس‌کاد (نظرسنجی و آراء)',
                href: '/app/polls',
                icon: Vote,
                iconBg: 'bg-college-light dark:bg-[#38260D]',
                iconColor: 'text-third dark:text-[#FBBF24]',
                badge: pollsCount > 0 ? toPersianDigits(pollsCount) : undefined,
              },
              {
                id: 'parent-club',
                title: 'باشگاه کارآفرینی رُکاد',
                href: '/app/club',
                icon: Award,
                iconBg: 'bg-amber-100 dark:bg-amber-950/60',
                iconColor: 'text-amber-600 dark:text-amber-400',
              },
              {
                id: 'parent-ka',
                title: 'پلتفرم کا',
                href: '/app/ka-platform',
                icon: CoinStackIcon,
                iconBg: 'bg-amber-50 dark:bg-[#2A2010]',
                iconColor: 'text-amber-500',
              },
            ],
          },
        ];

      case 'COACH':
        return [
          {
            id: 'coach-desk',
            title: 'میز کار هدایت و مربی‌گری',
            cards: [
              {
                id: 'coach-coaching',
                title: 'کوچینگ و مربی‌گری',
                href: '/app/coaching',
                icon: Compass,
                iconBg: 'bg-ecosystem-light dark:bg-[#163330]',
                iconColor: 'text-primary-dark dark:text-primary',
              },
              {
                id: 'coach-calendar',
                title: 'تقویم رویدادها و جلسات',
                href: '/app/calendar',
                icon: CalendarDays,
                iconBg: 'bg-ecosystem-light dark:bg-[#163330]',
                iconColor: 'text-primary-dark dark:text-primary',
              },
              {
                id: 'coach-events',
                title: 'رودمپ رویدادها',
                href: '/app/events',
                icon: CalendarRange,
                iconBg: 'bg-college-light dark:bg-[#38260D]',
                iconColor: 'text-third dark:text-[#FBBF24]',
                badge: eventsCount > 0 ? toPersianDigits(eventsCount) : undefined,
              },
            ],
          },
          {
            id: 'coach-ecosystem',
            title: 'ارتباطات و اکوسیستم',
            cards: [
              {
                id: 'coach-messages',
                title: 'پیام‌ها و مکاتبات',
                href: '/app/messages',
                icon: MessageSquare,
                iconBg: 'bg-club-light dark:bg-[#2A173E]',
                iconColor: 'text-club dark:text-[#C084FC]',
                badge: unreadMessagesCount > 0 ? toPersianDigits(unreadMessagesCount) : undefined,
              },
              {
                id: 'coach-media',
                title: 'رسانه هنرستان',
                href: '/app/media',
                icon: Sparkles,
                iconBg: 'bg-female-light dark:bg-[#3D1426]',
                iconColor: 'text-girl dark:text-[#F472B6]',
              },
              {
                id: 'coach-polls',
                title: 'پرس‌کاد (نظرسنجی و آراء)',
                href: '/app/polls',
                icon: Vote,
                iconBg: 'bg-college-light dark:bg-[#38260D]',
                iconColor: 'text-third dark:text-[#FBBF24]',
                badge: pollsCount > 0 ? toPersianDigits(pollsCount) : undefined,
              },
              {
                id: 'coach-club',
                title: 'باشگاه کارآفرینی رُکاد',
                href: '/app/club',
                icon: Award,
                iconBg: 'bg-amber-100 dark:bg-amber-950/60',
                iconColor: 'text-amber-600 dark:text-amber-400',
              },
              {
                id: 'coach-ka',
                title: 'پلتفرم کا',
                href: '/app/ka-platform',
                icon: CoinStackIcon,
                iconBg: 'bg-amber-50 dark:bg-[#2A2010]',
                iconColor: 'text-amber-500',
              },
            ],
          },
        ];

      case 'SUPER_ADMIN':
        return [
          {
            id: 'super-command',
            title: 'مرکز فرماندهی SaaS',
            cards: [
              {
                id: 'super-tenants',
                title: 'مدیریت شعب و تننت‌ها',
                href: '/app/super-admin/tenants',
                icon: Building2,
                iconBg: 'bg-ecosystem-light dark:bg-[#163330]',
                iconColor: 'text-primary-dark dark:text-primary',
              },
              {
                id: 'super-subs',
                title: 'اشتراک‌ها و سهمیه‌ها',
                href: '/app/super-admin/subscriptions',
                icon: Receipt,
                iconBg: 'bg-club-light dark:bg-[#2A173E]',
                iconColor: 'text-club dark:text-[#C084FC]',
              },
              {
                id: 'super-roles',
                title: 'قالب‌های نقش پویا',
                href: '/app/super-admin/role-templates',
                icon: Sliders,
                iconBg: 'bg-college-light dark:bg-[#38260D]',
                iconColor: 'text-third dark:text-[#FBBF24]',
              },
              {
                id: 'super-ops',
                title: 'عملیات و وضعیت سامانه',
                href: '/app/super-admin/ops',
                icon: Activity,
                iconBg: 'bg-female-light dark:bg-[#3D1426]',
                iconColor: 'text-girl dark:text-[#F472B6]',
              },
              {
                id: 'super-club',
                title: 'مدیریت باشگاه کسب‌وکار',
                href: '/app/admin/club',
                icon: Award,
                iconBg: 'bg-amber-100 dark:bg-amber-950/60',
                iconColor: 'text-amber-600 dark:text-amber-400',
              },
            ],
          },
          {
            id: 'super-ecosystem',
            title: 'ارتباطات و اکوسیستم',
            cards: [
              {
                id: 'super-sms',
                title: 'سامانه پیامک هوشمند',
                href: '/app/sms',
                icon: Smartphone,
                iconBg: 'bg-emerald-50 dark:bg-[#132A20]',
                iconColor: 'text-emerald-600 dark:text-emerald-400',
              },
              {
                id: 'super-messages',
                title: 'پیام‌ها و مکاتبات',
                href: '/app/messages',
                icon: MessageSquare,
                iconBg: 'bg-ecosystem-light dark:bg-[#163330]',
                iconColor: 'text-primary-dark dark:text-primary',
                badge: unreadMessagesCount > 0 ? toPersianDigits(unreadMessagesCount) : undefined,
              },
              {
                id: 'super-calendar',
                title: 'تقویم آموزشی',
                href: '/app/calendar',
                icon: CalendarDays,
                iconBg: 'bg-ecosystem-light dark:bg-[#163330]',
                iconColor: 'text-primary-dark dark:text-primary',
              },
              {
                id: 'super-events',
                title: 'رودمپ رویدادها',
                href: '/app/events',
                icon: CalendarRange,
                iconBg: 'bg-college-light dark:bg-[#38260D]',
                iconColor: 'text-third dark:text-[#FBBF24]',
                badge: eventsCount > 0 ? toPersianDigits(eventsCount) : undefined,
              },
              {
                id: 'super-media',
                title: 'رسانه هنرستان',
                href: '/app/media',
                icon: Sparkles,
                iconBg: 'bg-female-light dark:bg-[#3D1426]',
                iconColor: 'text-girl dark:text-[#F472B6]',
              },
              {
                id: 'super-polls',
                title: 'پرس‌کاد (نظرسنجی و آراء)',
                href: '/app/polls',
                icon: Vote,
                iconBg: 'bg-college-light dark:bg-[#38260D]',
                iconColor: 'text-third dark:text-[#FBBF24]',
                badge: pollsCount > 0 ? toPersianDigits(pollsCount) : undefined,
              },
              {
                id: 'super-ka',
                title: 'پلتفرم کا',
                href: '/app/ka-platform',
                icon: CoinStackIcon,
                iconBg: 'bg-amber-50 dark:bg-[#2A2010]',
                iconColor: 'text-amber-500',
              },
            ],
          },
        ];

      default:
        return [];
    }
  };

  const cardSections = getCardSections();

  // Determine if this is a Girls or Boys account based on tenant theme/slug/name or user profile
  const isGirlsAccount =
    currentTenant?.slug?.includes('girl') ||
    currentTenant?.theme === 'female' ||
    currentTenant?.name?.includes('دخترانه') ||
    (user as any)?.gender === 'FEMALE';

  // Design System Persona Tokens: Blue (Male/Sec) vs Pink (Female/Girl)
  const welcomeTheme = isGirlsAccount
    ? {
        gradient:
          'bg-gradient-to-l from-girl via-[#EA2D6D] to-[#CA1752] dark:from-[#650B29] dark:via-[#520921] dark:to-[#3F0719]',
        btnText:
          'text-girl dark:text-pink-400 hover:text-[#CA1752] dark:hover:text-white',
        btnIcon: 'text-girl dark:text-pink-400',
      }
    : {
        gradient:
          'bg-gradient-to-l from-sec via-[#283570] to-[#1A2248] dark:from-[#182044] dark:via-[#131A38] dark:to-[#0E142C]',
        btnText:
          'text-sec dark:text-[#8194EE] hover:text-[#283570] dark:hover:text-white',
        btnIcon: 'text-sec dark:text-[#8194EE]',
      };

  // 1- پیام ها و برنامه هفتگی
  const studentRow1: SuperAppCard[] = [
    {
      id: 'messages',
      title: 'پیام‌ها',
      href: '/app/messages',
      icon: MessageSquare,
      iconBg: 'bg-ecosystem-light dark:bg-[#163330]',
      iconColor: 'text-primary-dark dark:text-primary',
      badge: unreadMessagesCount > 0 ? toPersianDigits(unreadMessagesCount) : undefined,
    },
    {
      id: 'schedule',
      title: 'برنامه هفتگی',
      href: '/app/student/schedule',
      icon: CalendarDays,
      iconBg: 'bg-ecosystem-light dark:bg-[#163330]',
      iconColor: 'text-primary-dark dark:text-primary',
    },
  ];

  // 2- تکالیف، آزمون ها و نمرات و کارنامه
  const studentRow2: SuperAppCard[] = [
    {
      id: 'homework',
      title: 'تکالیف',
      href: '/app/student/homework',
      icon: FileCheck,
      iconBg: 'bg-club-light dark:bg-[#2A173E]',
      iconColor: 'text-club dark:text-[#C084FC]',
      badge: homeworkCount > 0 ? toPersianDigits(homeworkCount) : undefined,
    },
    {
      id: 'exams',
      title: 'آزمون‌ها',
      href: '/app/student/exams',
      icon: HelpCircle,
      iconBg: 'bg-college-light dark:bg-[#38260D]',
      iconColor: 'text-third dark:text-[#FBBF24]',
      badge: examsCount > 0 ? toPersianDigits(examsCount) : undefined,
    },
    {
      id: 'grades',
      title: 'نمرات و کارنامه',
      href: '/app/student/grades',
      icon: BarChart3,
      iconBg: 'bg-male-light dark:bg-[#182346]',
      iconColor: 'text-sec dark:text-[#8194EE]',
    },
  ];

  // 3- محتوای آموزشی، کوچینگ، انضباطی/تشویقی
  const studentRow3: SuperAppCard[] = [
    {
      id: 'materials',
      title: 'محتوای آموزشی',
      href: '/app/student/materials',
      icon: BookOpen,
      iconBg: 'bg-ecosystem-light dark:bg-[#163330]',
      iconColor: 'text-primary-dark dark:text-primary',
    },
    {
      id: 'coaching',
      title: 'کوچینگ',
      href: '/app/coaching',
      icon: Compass,
      iconBg: 'bg-club-light dark:bg-[#2A173E]',
      iconColor: 'text-club dark:text-[#C084FC]',
    },
    {
      id: 'matters',
      title: 'انضباطی/تشویقی',
      href: '/app/student/matters',
      icon: Scale,
      iconBg: 'bg-female-light dark:bg-[#3D1426]',
      iconColor: 'text-girl dark:text-[#F472B6]',
    },
  ];

  // 4- رویدادها و نظرسنجی
  const studentRow4: SuperAppCard[] = [
    {
      id: 'events',
      title: 'رویدادها',
      href: '/app/events',
      icon: CalendarRange,
      iconBg: 'bg-college-light dark:bg-[#38260D]',
      iconColor: 'text-third dark:text-[#FBBF24]',
      badge: eventsCount > 0 ? toPersianDigits(eventsCount) : undefined,
    },
    {
      id: 'polls',
      title: 'نظرسنجی',
      href: '/app/polls',
      icon: Vote,
      iconBg: 'bg-college-light dark:bg-[#38260D]',
      iconColor: 'text-third dark:text-[#FBBF24]',
      badge: pollsCount > 0 ? toPersianDigits(pollsCount) : undefined,
    },
  ];

  // ==========================================
  // Teacher Rows (6 Custom Rows)
  // ==========================================
  // 1. دفتر کلاسی - پیام ها
  const teacherRow1: SuperAppCard[] = [
    {
      id: 'teacher-attendance',
      title: 'دفتر کلاسی',
      href: '/app/teacher/attendance',
      icon: UserCheck,
      iconBg: 'bg-ecosystem-light dark:bg-[#163330]',
      iconColor: 'text-primary-dark dark:text-primary',
    },
    {
      id: 'teacher-messages',
      title: 'پیام‌ها',
      href: '/app/messages',
      icon: MessageSquare,
      iconBg: 'bg-ecosystem-light dark:bg-[#163330]',
      iconColor: 'text-primary-dark dark:text-primary',
      badge: unreadMessagesCount > 0 ? toPersianDigits(unreadMessagesCount) : undefined,
    },
  ];

  // 2. محتوای اموزشی - ارزشیابی و نمرات - برنامه هفتگی
  const teacherRow2: SuperAppCard[] = [
    {
      id: 'teacher-lessons',
      title: 'محتوای آموزشی',
      href: '/app/teacher/lessons',
      icon: BookOpen,
      iconBg: 'bg-female-light dark:bg-[#3D1426]',
      iconColor: 'text-girl dark:text-[#F472B6]',
    },
    {
      id: 'teacher-gradebook',
      title: 'ارزشیابی و نمرات',
      href: '/app/teacher/gradebook',
      icon: BarChart3,
      iconBg: 'bg-male-light dark:bg-[#182346]',
      iconColor: 'text-sec dark:text-[#8194EE]',
    },
    {
      id: 'teacher-schedule',
      title: 'برنامه هفتگی',
      href: '/app/teacher/schedule',
      icon: CalendarDays,
      iconBg: 'bg-ecosystem-light dark:bg-[#163330]',
      iconColor: 'text-primary-dark dark:text-primary',
    },
  ];

  // 3. تکالیف - آزمون ها
  const teacherRow3: SuperAppCard[] = [
    {
      id: 'teacher-homework',
      title: 'تکالیف',
      href: '/app/teacher/homework',
      icon: FileCheck,
      iconBg: 'bg-club-light dark:bg-[#2A173E]',
      iconColor: 'text-club dark:text-[#C084FC]',
      badge: homeworkCount > 0 ? toPersianDigits(homeworkCount) : undefined,
    },
    {
      id: 'teacher-exams',
      title: 'آزمون‌ها',
      href: '/app/teacher/exams',
      icon: HelpCircle,
      iconBg: 'bg-college-light dark:bg-[#38260D]',
      iconColor: 'text-third dark:text-[#FBBF24]',
      badge: examsCount > 0 ? toPersianDigits(examsCount) : undefined,
    },
  ];

  // 4. انضباطی/ تشویقی - کوچینگ - بانک سوالات
  const teacherRow4: SuperAppCard[] = [
    {
      id: 'teacher-matters',
      title: 'انضباطی/تشویقی',
      href: '/app/teacher/matters',
      icon: Scale,
      iconBg: 'bg-female-light dark:bg-[#3D1426]',
      iconColor: 'text-girl dark:text-[#F472B6]',
    },
    {
      id: 'teacher-coaching',
      title: 'کوچینگ',
      href: '/app/coaching',
      icon: Compass,
      iconBg: 'bg-club-light dark:bg-[#2A173E]',
      iconColor: 'text-club dark:text-[#C084FC]',
    },
    {
      id: 'teacher-question-bank',
      title: 'بانک سوالات',
      href: '/app/teacher/question-bank',
      icon: FileQuestion,
      iconBg: 'bg-male-light dark:bg-[#182346]',
      iconColor: 'text-sec dark:text-[#8194EE]',
    },
  ];

  // 5. رویداد ها - تاییدیه ها - نظرسنجی
  const teacherRow5: SuperAppCard[] = [
    {
      id: 'teacher-events',
      title: 'رویدادها',
      href: '/app/events',
      icon: CalendarRange,
      iconBg: 'bg-college-light dark:bg-[#38260D]',
      iconColor: 'text-third dark:text-[#FBBF24]',
      badge: eventsCount > 0 ? toPersianDigits(eventsCount) : undefined,
    },
    {
      id: 'teacher-club-approvals',
      title: 'تأییدیه‌ها',
      href: '/app/teacher/club-approvals',
      icon: Award,
      iconBg: 'bg-amber-100 dark:bg-amber-950/60',
      iconColor: 'text-amber-600 dark:text-amber-400',
    },
    {
      id: 'teacher-polls',
      title: 'نظرسنجی',
      href: '/app/polls',
      icon: Vote,
      iconBg: 'bg-college-light dark:bg-[#38260D]',
      iconColor: 'text-third dark:text-[#FBBF24]',
    },
  ];

  // 6. ملاقات با اولیا - فیش حقوقی
  const teacherRow6: SuperAppCard[] = [
    {
      id: 'teacher-visits',
      title: 'ملاقات با اولیاء',
      href: '/app/teacher/visits',
      icon: Users,
      iconBg: 'bg-club-light dark:bg-[#2A173E]',
      iconColor: 'text-club dark:text-[#C084FC]',
    },
    {
      id: 'teacher-payroll',
      title: 'فیش حقوقی',
      href: '/app/teacher/payroll',
      icon: Wallet,
      iconBg: 'bg-ecosystem-light dark:bg-[#163330]',
      iconColor: 'text-primary-dark dark:text-primary',
    },
  ];

  // ==========================================
  // Staff / Admin Rows (6 Custom Rows)
  // ==========================================
  // 1. پیام‌ها - رویدادها (۲تایی)
  const staffRow1: SuperAppCard[] = [
    {
      id: 'staff-messages',
      title: 'پیام‌ها',
      href: '/app/messages',
      icon: MessageSquare,
      iconBg: 'bg-ecosystem-light dark:bg-[#163330]',
      iconColor: 'text-primary-dark dark:text-primary',
      badge: unreadMessagesCount > 0 ? toPersianDigits(unreadMessagesCount) : undefined,
    },
    {
      id: 'staff-events',
      title: 'رویدادها',
      href: '/app/events',
      icon: CalendarRange,
      iconBg: 'bg-college-light dark:bg-[#38260D]',
      iconColor: 'text-third dark:text-[#FBBF24]',
      badge: eventsCount > 0 ? toPersianDigits(eventsCount) : undefined,
    },
  ];

  // 2. ساختار سال و کلاس‌ها - برنامه هفتگی (۲تایی - پایه‌ای و پرکاربرد)
  const staffRow2: SuperAppCard[] = [
    {
      id: 'staff-academic',
      title: 'ساختار سال و کلاس‌ها',
      href: '/app/admin/academic',
      icon: BookOpen,
      iconBg: 'bg-male-light dark:bg-[#182346]',
      iconColor: 'text-sec dark:text-[#8194EE]',
    },
    {
      id: 'staff-schedule',
      title: 'برنامه هفتگی',
      href: '/app/admin/schedule',
      icon: CalendarDays,
      iconBg: 'bg-ecosystem-light dark:bg-[#163330]',
      iconColor: 'text-primary-dark dark:text-primary',
    },
  ];

  // 3. دفتر کلاسی - ارزشیابی و نمرات - تکالیف (۳تایی - آموزش کلاسی)
  const staffRow3: SuperAppCard[] = [
    {
      id: 'staff-attendance',
      title: 'دفتر کلاسی',
      href: '/app/admin/attendance',
      icon: UserCheck,
      iconBg: 'bg-ecosystem-light dark:bg-[#163330]',
      iconColor: 'text-primary-dark dark:text-primary',
    },
    {
      id: 'staff-gradebook',
      title: 'ارزشیابی و نمرات',
      href: '/app/admin/gradebook',
      icon: BarChart3,
      iconBg: 'bg-male-light dark:bg-[#182346]',
      iconColor: 'text-sec dark:text-[#8194EE]',
    },
    {
      id: 'staff-homework',
      title: 'تکالیف',
      href: '/app/admin/homework',
      icon: FileCheck,
      iconBg: 'bg-club-light dark:bg-[#2A173E]',
      iconColor: 'text-club dark:text-[#C084FC]',
      badge: homeworkCount > 0 ? toPersianDigits(homeworkCount) : undefined,
    },
  ];

  // 4. آزمون‌ها - بانک سوالات - محتوای آموزشی (۳تایی - سنجش و محتوا)
  const staffRow4: SuperAppCard[] = [
    {
      id: 'staff-exams',
      title: 'آزمون‌ها',
      href: '/app/admin/exams',
      icon: HelpCircle,
      iconBg: 'bg-college-light dark:bg-[#38260D]',
      iconColor: 'text-third dark:text-[#FBBF24]',
      badge: examsCount > 0 ? toPersianDigits(examsCount) : undefined,
    },
    {
      id: 'staff-question-bank',
      title: 'بانک سوالات',
      href: '/app/admin/question-bank',
      icon: FileQuestion,
      iconBg: 'bg-male-light dark:bg-[#182346]',
      iconColor: 'text-sec dark:text-[#8194EE]',
    },
    {
      id: 'staff-lessons',
      title: 'محتوای آموزشی',
      href: '/app/admin/lessons',
      icon: BookOpen,
      iconBg: 'bg-female-light dark:bg-[#3D1426]',
      iconColor: 'text-girl dark:text-[#F472B6]',
    },
  ];

  // 5. دانش‌آموزان - کادر آموزشی (۲تایی - اعضای مدرسه)
  const staffRow5: SuperAppCard[] = [
    {
      id: 'staff-students',
      title: 'دانش‌آموزان',
      href: '/app/admin/members?tab=students',
      icon: GraduationCap,
      iconBg: 'bg-male-light dark:bg-[#182346]',
      iconColor: 'text-sec dark:text-[#8194EE]',
    },
    {
      id: 'staff-members',
      title: 'کادر آموزشی',
      href: '/app/admin/members?tab=staff',
      icon: Briefcase,
      iconBg: 'bg-club-light dark:bg-[#2A173E]',
      iconColor: 'text-club dark:text-[#C084FC]',
    },
  ];

  // 6. شهریه و اقساط - حقوق و دستمزد (۲تایی - امور مالی)
  const staffRow6: SuperAppCard[] = [
    {
      id: 'staff-fees',
      title: 'شهریه و اقساط',
      href: '/app/admin/finance/fees',
      icon: Receipt,
      iconBg: 'bg-club-light dark:bg-[#2A173E]',
      iconColor: 'text-club dark:text-[#C084FC]',
    },
    {
      id: 'staff-payroll',
      title: 'حقوق و دستمزد',
      href: '/app/admin/finance/payroll',
      icon: Wallet,
      iconBg: 'bg-male-light dark:bg-[#182346]',
      iconColor: 'text-sec dark:text-[#8194EE]',
    },
  ];

  // 7. انضباطی/تشویقی - نظرسنجی - کوچینگ (۳تایی - امور تربیتی و پرورشی)
  const staffRow7: SuperAppCard[] = [
    {
      id: 'staff-matters',
      title: 'انضباطی/تشویقی',
      href: '/app/admin/matters',
      icon: Scale,
      iconBg: 'bg-female-light dark:bg-[#3D1426]',
      iconColor: 'text-girl dark:text-[#F472B6]',
    },
    {
      id: 'staff-polls',
      title: 'نظرسنجی',
      href: '/app/polls',
      icon: Vote,
      iconBg: 'bg-college-light dark:bg-[#38260D]',
      iconColor: 'text-third dark:text-[#FBBF24]',
      badge: pollsCount > 0 ? toPersianDigits(pollsCount) : undefined,
    },
    {
      id: 'staff-coaching',
      title: 'کوچینگ',
      href: '/app/coaching',
      icon: Compass,
      iconBg: 'bg-ecosystem-light dark:bg-[#163330]',
      iconColor: 'text-primary-dark dark:text-primary',
    },
  ];

  // 8. پیامک هوشمند - گزارش‌های جامع (۲تایی - ارتباطات و پایش)
  const staffRow8: SuperAppCard[] = [
    {
      id: 'staff-sms',
      title: 'پیامک هوشمند',
      href: '/app/sms',
      icon: Smartphone,
      iconBg: 'bg-college-light dark:bg-[#38260D]',
      iconColor: 'text-third dark:text-[#FBBF24]',
    },
    {
      id: 'staff-reports',
      title: 'گزارش‌های جامع',
      href: '/app/admin/reports',
      icon: BarChart3,
      iconBg: 'bg-college-light dark:bg-[#38260D]',
      iconColor: 'text-third dark:text-[#FBBF24]',
    },
  ];

  // 9. گاوصندوق رمز عبور - نقش‌ها و دسترسی‌ها (۲تایی - امنیت و مدیریت دسترسی)
  const staffRow9: SuperAppCard[] = [
    {
      id: 'staff-vault',
      title: 'گاوصندوق رمز عبور',
      href: '/app/admin/vault',
      icon: KeyRound,
      iconBg: 'bg-female-light dark:bg-[#3D1426]',
      iconColor: 'text-girl dark:text-[#F472B6]',
    },
    {
      id: 'staff-roles',
      title: 'نقش‌ها و دسترسی‌ها',
      href: '/app/admin/roles',
      icon: ShieldCheck,
      iconBg: 'bg-club-light dark:bg-[#2A173E]',
      iconColor: 'text-club dark:text-[#C084FC]',
    },
  ];

  // 10. پروفایل رسمی مدرسه (تک‌کارت یا ردیف پایانی)
  const staffRow10: SuperAppCard[] = [
    {
      id: 'staff-profile',
      title: 'پروفایل رسمی مدرسه',
      href: '/app/admin/profile',
      icon: School,
      iconBg: 'bg-ecosystem-light dark:bg-[#163330]',
      iconColor: 'text-primary-dark dark:text-primary',
    },
  ];

  // ==========================================
  // Parent Rows (4 Custom Rows)
  // ==========================================
  // 1. پیام ها - شهریه
  const parentRow1: SuperAppCard[] = [
    {
      id: 'parent-messages',
      title: 'پیام‌ها',
      href: '/app/messages',
      icon: MessageSquare,
      iconBg: 'bg-ecosystem-light dark:bg-[#163330]',
      iconColor: 'text-primary-dark dark:text-primary',
      badge: unreadMessagesCount > 0 ? toPersianDigits(unreadMessagesCount) : undefined,
    },
    {
      id: 'parent-fees',
      title: 'شهریه',
      href: '/app/parent/fees',
      icon: CreditCard,
      iconBg: 'bg-club-light dark:bg-[#2A173E]',
      iconColor: 'text-club dark:text-[#C084FC]',
    },
  ];

  // 2. برنامه هفتگی - تکالیف - ازمون ها
  const parentRow2: SuperAppCard[] = [
    {
      id: 'parent-schedule',
      title: 'برنامه هفتگی',
      href: '/app/parent/schedule',
      icon: CalendarDays,
      iconBg: 'bg-ecosystem-light dark:bg-[#163330]',
      iconColor: 'text-primary-dark dark:text-primary',
    },
    {
      id: 'parent-homework',
      title: 'تکالیف',
      href: '/app/parent/homework',
      icon: FileCheck,
      iconBg: 'bg-club-light dark:bg-[#2A173E]',
      iconColor: 'text-club dark:text-[#C084FC]',
      badge: homeworkCount > 0 ? toPersianDigits(homeworkCount) : undefined,
    },
    {
      id: 'parent-exams',
      title: 'آزمون‌ها',
      href: '/app/parent/exams',
      icon: HelpCircle,
      iconBg: 'bg-college-light dark:bg-[#38260D]',
      iconColor: 'text-third dark:text-[#FBBF24]',
      badge: examsCount > 0 ? toPersianDigits(examsCount) : undefined,
    },
  ];

  // 3. کارنامه نمرات - انضباطی تشویقی - ملاقات با کادر اموزشی
  const parentRow3: SuperAppCard[] = [
    {
      id: 'parent-reports',
      title: 'کارنامه و نمرات',
      href: '/app/parent/reports',
      icon: BarChart3,
      iconBg: 'bg-male-light dark:bg-[#182346]',
      iconColor: 'text-sec dark:text-[#8194EE]',
    },
    {
      id: 'parent-matters',
      title: 'انضباطی/تشویقی',
      href: '/app/parent/matters',
      icon: Scale,
      iconBg: 'bg-female-light dark:bg-[#3D1426]',
      iconColor: 'text-girl dark:text-[#F472B6]',
    },
    {
      id: 'parent-visits',
      title: 'ملاقات با کادر آموزشی',
      href: '/app/parent/visits',
      icon: Users,
      iconBg: 'bg-club-light dark:bg-[#2A173E]',
      iconColor: 'text-club dark:text-[#C084FC]',
    },
  ];

  // 4. رویداد ها - کوچینگ - نظرسنجی ها
  const parentRow4: SuperAppCard[] = [
    {
      id: 'parent-events',
      title: 'رویدادها',
      href: '/app/events',
      icon: CalendarRange,
      iconBg: 'bg-college-light dark:bg-[#38260D]',
      iconColor: 'text-third dark:text-[#FBBF24]',
      badge: eventsCount > 0 ? toPersianDigits(eventsCount) : undefined,
    },
    {
      id: 'parent-coaching',
      title: 'کوچینگ',
      href: '/app/coaching',
      icon: Compass,
      iconBg: 'bg-club-light dark:bg-[#2A173E]',
      iconColor: 'text-club dark:text-[#C084FC]',
    },
    {
      id: 'parent-polls',
      title: 'نظرسنجی',
      href: '/app/polls',
      icon: Vote,
      iconBg: 'bg-college-light dark:bg-[#38260D]',
      iconColor: 'text-third dark:text-[#FBBF24]',
    },
  ];

  const renderCard = (card: SuperAppCard) => (
    <button
      key={card.id}
      type="button"
      onClick={() => navigate(card.href)}
      className="group relative flex flex-col items-center justify-center text-center p-3 sm:p-4 rounded-2xl bg-white dark:bg-[#151C28] border-[1.5px] border-primary-dark/30 dark:border-gray-800 hover:border-primary dark:hover:border-primary shadow-[2px_2px_0_#59BBAF] dark:shadow-[2px_2px_0_#0B0F17] hover:shadow-[2.75px_2.75px_0_#59BBAF] transition-all duration-150 active:translate-x-[1px] active:translate-y-[1px] cursor-pointer min-h-[96px] sm:min-h-[110px]"
    >
      {card.badge && (
        <span
          className={`absolute top-2.5 left-2.5 z-10 min-w-[20px] h-[20px] px-1.5 rounded-full bg-girl text-white text-[10px] font-black flex items-center justify-center leading-none border border-white dark:border-gray-800 shadow-xs select-none ${
            card.id === 'messages' || card.id === 'exams' ? 'animate-pulse ring-2 ring-girl/30' : ''
          }`}
        >
          <span className="inline-block transform -translate-y-[0.5px]">{card.badge}</span>
        </span>
      )}

      <div
        className={`w-11 h-11 sm:w-13 sm:h-13 rounded-2xl flex items-center justify-center mb-2 transition-transform group-hover:scale-105 shadow-2xs ${card.iconBg} ${card.iconColor}`}
      >
        <card.icon className="w-5 h-5 sm:w-6 sm:h-6" />
      </div>

      <span className="font-black text-xs sm:text-[13px] text-ink-darker dark:text-gray-100 group-hover:text-primary dark:group-hover:text-primary transition-colors text-center line-clamp-1">
        {card.title}
      </span>
    </button>
  );

  return (
    <div className="space-y-5 pb-8 animate-in fade-in duration-300">
      {/* 1. Home Top Banner Slider (Max 3 Slides: Events, Announcements, Custom) */}
      <HomeBannerSlider onOpenSettings={() => setIsBannerSettingsOpen(true)} />

      {/* 2. Super-App Welcome Box: Dynamic Design System Theme (Blue for Boys, Pink for Girls) */}
      <div
        className={`relative overflow-hidden p-4 sm:p-5 rounded-2xl ${welcomeTheme.gradient} text-white transition-all`}
      >
        {/* Subtle decorative glass orbs */}
        <div className="absolute top-0 left-0 -ml-10 -mt-10 w-36 h-36 rounded-full bg-white/10 blur-2xl pointer-events-none" />
        <div className="absolute bottom-0 right-0 -mr-10 -mb-10 w-28 h-28 rounded-full bg-black/10 blur-2xl pointer-events-none" />

        {/* Row 1: Greeting + Name on Right, Role Badge on Left */}
        <div className="relative z-10 flex items-center justify-between gap-3 min-w-0">
          {/* Right: Dot + User Name */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-white shrink-0 shadow-xs ring-2 ring-white/30 animate-pulse" />
            <span className="font-black text-base sm:text-lg lg:text-xl text-white tracking-tight truncate">
              درود، {cleanUserFullName(user?.firstName, user?.lastName, user?.username || user?.phone) || 'کاربر گرامی'}
            </span>
          </div>

          {/* Left: Role Badge */}
          <span className="inline-flex items-center rounded-full bg-white/20 hover:bg-white/25 text-white border border-white/35 text-xs sm:text-[13px] py-1 px-3 sm:px-3.5 font-extrabold backdrop-blur-md shadow-2xs shrink-0 transition-colors">
            {getRoleTitle()}
          </span>
        </div>

        {/* Row 2: Date on Right, Dashboard Button on Left */}
        <div className="relative z-10 mt-3.5 sm:mt-4 flex items-center justify-between gap-3 flex-wrap">
          {/* Bottom Right: Persian Date */}
          <div className="flex items-center gap-2 text-xs sm:text-[13px] font-bold text-white/95">
            <CalendarDays className="w-4 h-4 text-white/85 shrink-0" />
            <span>{liveDate}</span>
          </div>

          {/* Bottom Left: Dashboard Button */}
          <button
            type="button"
            onClick={() => navigate(getDashboardHref())}
            className={`group inline-flex items-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-xl bg-white dark:bg-[#151C28] ${welcomeTheme.btnText} font-black text-xs sm:text-[13px] shadow-[2px_2px_0_rgba(0,0,0,0.12)] dark:shadow-[2px_2px_0_rgba(255,255,255,0.15)] hover:shadow-[2.5px_2.5px_0_rgba(0,0,0,0.18)] active:translate-x-[1px] active:translate-y-[1px] transition-all cursor-pointer shrink-0 mr-auto`}
          >
            <LayoutDashboard
              className={`w-4 h-4 ${welcomeTheme.btnIcon} group-hover:scale-110 transition-transform`}
            />
            <span>ورود به داشبورد</span>
            <ChevronLeft
              className={`w-3.5 h-3.5 ${welcomeTheme.btnIcon} group-hover:-translate-x-0.5 transition-transform`}
            />
          </button>
        </div>
      </div>

      {/* Student Cards (4 Custom Rows) vs Teacher Cards (6 Custom Rows) vs Other Roles */}
      {user?.role === 'STUDENT' || !user?.role ? (
        <div className="space-y-2.5 sm:space-y-3.5">
          {/* 1- پیام ها و برنامه هفتگی */}
          <div className="grid grid-cols-2 gap-2.5 sm:gap-3.5">
            {studentRow1.map(renderCard)}
          </div>

          {/* 2- تکالیف، آزمون ها و نمرات و کارنامه */}
          <div className="grid grid-cols-3 gap-2.5 sm:gap-3.5">
            {studentRow2.map(renderCard)}
          </div>

          {/* 3- محتوای آموزشی، کوچینگ، انضباطی/تشویقی */}
          <div className="grid grid-cols-3 gap-2.5 sm:gap-3.5">
            {studentRow3.map(renderCard)}
          </div>

          {/* 4- رویدادها و نظرسنجی */}
          <div className="grid grid-cols-2 gap-2.5 sm:gap-3.5">
            {studentRow4.map(renderCard)}
          </div>
        </div>
      ) : user?.role === 'TEACHER' ? (
        <div className="space-y-2.5 sm:space-y-3.5">
          {/* 1. دفتر کلاسی - پیام ها */}
          <div className="grid grid-cols-2 gap-2.5 sm:gap-3.5">
            {teacherRow1.map(renderCard)}
          </div>

          {/* 2. محتوای اموزشی - ارزشیابی و نمرات - برنامه هفتگی */}
          <div className="grid grid-cols-3 gap-2.5 sm:gap-3.5">
            {teacherRow2.map(renderCard)}
          </div>

          {/* 3. تکالیف - آزمون ها */}
          <div className="grid grid-cols-2 gap-2.5 sm:gap-3.5">
            {teacherRow3.map(renderCard)}
          </div>

          {/* 4. انضباطی/ تشویقی - کوچینگ - بانک سوالات */}
          <div className="grid grid-cols-3 gap-2.5 sm:gap-3.5">
            {teacherRow4.map(renderCard)}
          </div>

          {/* 5. رویداد ها - تاییدیه ها - نظرسنجی */}
          <div className="grid grid-cols-3 gap-2.5 sm:gap-3.5">
            {teacherRow5.map(renderCard)}
          </div>

          {/* 6. ملاقات با اولیا - فیش حقوقی */}
          <div className="grid grid-cols-2 gap-2.5 sm:gap-3.5">
            {teacherRow6.map(renderCard)}
          </div>
        </div>
      ) : user?.role === 'SCHOOL_ADMIN' || user?.role === 'STAFF' ? (
        <div className="space-y-2.5 sm:space-y-3.5">
          {/* 1. پیام‌ها - رویدادها (۲تایی) */}
          <div className="grid grid-cols-2 gap-2.5 sm:gap-3.5">
            {staffRow1.map(renderCard)}
          </div>

          {/* 2. ساختار سال و کلاس‌ها - برنامه هفتگی (۲تایی) */}
          <div className="grid grid-cols-2 gap-2.5 sm:gap-3.5">
            {staffRow2.map(renderCard)}
          </div>

          {/* 3. دفتر کلاسی - ارزشیابی و نمرات - تکالیف (۳تایی) */}
          <div className="grid grid-cols-3 gap-2.5 sm:gap-3.5">
            {staffRow3.map(renderCard)}
          </div>

          {/* 4. آزمون‌ها - بانک سوالات - محتوای آموزشی (۳تایی) */}
          <div className="grid grid-cols-3 gap-2.5 sm:gap-3.5">
            {staffRow4.map(renderCard)}
          </div>

          {/* 5. دانش‌آموزان - کادر آموزشی (۲تایی) */}
          <div className="grid grid-cols-2 gap-2.5 sm:gap-3.5">
            {staffRow5.map(renderCard)}
          </div>

          {/* 6. شهریه و اقساط - حقوق و دستمزد (۲تایی) */}
          <div className="grid grid-cols-2 gap-2.5 sm:gap-3.5">
            {staffRow6.map(renderCard)}
          </div>

          {/* 7. انضباطی/تشویقی - نظرسنجی - کوچینگ (۳تایی) */}
          <div className="grid grid-cols-3 gap-2.5 sm:gap-3.5">
            {staffRow7.map(renderCard)}
          </div>

          {/* 8. پیامک هوشمند - گزارش‌های جامع (۲تایی) */}
          <div className="grid grid-cols-2 gap-2.5 sm:gap-3.5">
            {staffRow8.map(renderCard)}
          </div>

          {/* 9. گاوصندوق رمز عبور - نقش‌ها و دسترسی‌ها (۲تایی) */}
          <div className="grid grid-cols-2 gap-2.5 sm:gap-3.5">
            {staffRow9.map(renderCard)}
          </div>

          {/* 10. پروفایل رسمی مدرسه */}
          <div className="grid grid-cols-1 gap-2.5 sm:gap-3.5">
            {staffRow10.map(renderCard)}
          </div>
        </div>
      ) : user?.role === 'PARENT' ? (
        <div className="space-y-2.5 sm:space-y-3.5">
          {/* 1. پیام ها - شهریه */}
          <div className="grid grid-cols-2 gap-2.5 sm:gap-3.5">
            {parentRow1.map(renderCard)}
          </div>

          {/* 2. برنامه هفتگی - تکالیف - ازمون ها */}
          <div className="grid grid-cols-3 gap-2.5 sm:gap-3.5">
            {parentRow2.map(renderCard)}
          </div>

          {/* 3. کارنامه نمرات - انضباطی تشویقی - ملاقات با کادر اموزشی */}
          <div className="grid grid-cols-3 gap-2.5 sm:gap-3.5">
            {parentRow3.map(renderCard)}
          </div>

          {/* 4. رویداد ها - کوچینگ - نظرسنجی ها */}
          <div className="grid grid-cols-3 gap-2.5 sm:gap-3.5">
            {parentRow4.map(renderCard)}
          </div>
        </div>
      ) : (
        <div className="space-y-5 sm:space-y-6">
          {cardSections.map((section) => (
            <div key={section.id} className="space-y-2.5 sm:space-y-3">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-4 sm:h-4.5 rounded-full bg-primary shrink-0" />
                  <h3 className="font-black text-xs sm:text-sm text-ink-darker dark:text-gray-100">
                    {section.title}
                  </h3>
                </div>
                <span className="text-[10px] sm:text-[11px] font-bold text-ink-lighter dark:text-gray-400 bg-gray-100 dark:bg-gray-800/80 px-2 py-0.5 rounded-md">
                  {toPersianDigits(section.cards.length)} بخش
                </span>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 gap-2.5 sm:gap-3.5">
                {section.cards.map(renderCard)}
              </div>
            </div>
          ))}
        </div>
      )}
      {/* Admin Banner Settings Modal */}
      <BannerSettingsModal
        isOpen={isBannerSettingsOpen}
        onClose={() => setIsBannerSettingsOpen(false)}
      />
    </div>
  );
};
