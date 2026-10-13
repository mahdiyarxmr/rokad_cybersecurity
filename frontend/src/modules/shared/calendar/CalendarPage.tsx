import React, { useEffect, useState, useMemo, useRef } from 'react';
import { apiClient } from '../../../lib/api/client';
import { useAuthStore } from '../../../lib/auth/auth-store';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { Badge } from '../../../components/ui/Badge';
import { Modal } from '../../../components/ui/Modal';
import { PersianDatePicker } from '../../../components/ui/PersianDatePicker';
import {
  gregorianToJalaliStr,
  jalaliToGregorianDate,
  formatJalaliDisplay,
  toPersianDigits,
} from '../../../utils/jalali';
import { useNavigate } from 'react-router-dom';
import {
  Calendar as CalendarIcon,
  Plus,
  Clock,
  MapPin,
  BookOpen,
  CalendarCheck,
  CalendarDays,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  AlertCircle,
  ShieldAlert,
  Sparkles,
  Info,
  Check,
  ListOrdered,
  Sun,
  Flame,
  CloudSun,
  Snowflake,
  Search,
  Edit3,
  Trash2,
  SlidersHorizontal,
  ExternalLink,
  X,
} from 'lucide-react';
import { toast } from '../../../components/ui/toast/toast';

export interface EventTypeItem {
  code: string;
  titleFa: string;
  color: string;
  baseType: string;
  isDefault?: boolean;
}

const DEFAULT_EVENT_TYPES: EventTypeItem[] = [
  { code: 'ACADEMIC', titleFa: 'رویداد عمومی / آموزشی', color: 'emerald', baseType: 'ACADEMIC', isDefault: true },
  { code: 'EXAM', titleFa: 'آزمون و امتحان هماهنگ', color: 'amber', baseType: 'EXAM', isDefault: true },
  { code: 'HOMEWORK', titleFa: 'مهلت تحویل تکالیف', color: 'orange', baseType: 'HOMEWORK', isDefault: true },
  { code: 'MEETING', titleFa: 'جلسه اولیاء و مربیان', color: 'purple', baseType: 'MEETING', isDefault: true },
  { code: 'CULTURAL', titleFa: 'جشن و مراسم مدرسه', color: 'rose', baseType: 'CULTURAL', isDefault: true },
  { code: 'SPORTS', titleFa: 'مسابقات و رویداد ورزشی', color: 'blue', baseType: 'SPORTS', isDefault: true },
  { code: 'EXCURSION', titleFa: 'اردو و بازدید علمی', color: 'teal', baseType: 'EXCURSION', isDefault: true },
];
import {
  PERSIAN_MONTHS,
  WEEK_DAYS,
  getMonthDays1405,
  DayCalendarInfo,
  OFFICIAL_OCCASIONS_1405,
  CalendarOccasion,
  getTodayJalali,
} from './data/persian-calendar-1405';

export const CalendarPage: React.FC = () => {
  const navigate = useNavigate();
  const currentUser = useAuthStore((s) => s.user);
  const canManageCalendar = ['SCHOOL_ADMIN', 'SUPER_ADMIN', 'STAFF'].includes(currentUser?.role || '');

  // Exact Today info from system date
  const todayInfo = useMemo(() => getTodayJalali(), []);

  // Year & Month Selection (Default: Current Year and Month)
  const [selectedYear, setSelectedYear] = useState<number>(todayInfo.year);
  const [selectedMonth, setSelectedMonth] = useState<number>(todayInfo.month);
  const [selectedDay, setSelectedDay] = useState<DayCalendarInfo | null>(null);

  // Month Picker Popover State & Outside Click Handling
  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);
  const monthPickerRef = useRef<HTMLDivElement>(null);

  // Custom Event Type Dropdown in Modal State & Outside Click Handling
  const [isTypeDropdownOpen, setIsTypeDropdownOpen] = useState(false);
  const typeDropdownRef = useRef<HTMLDivElement>(null);

  // Selected Day Details Card Ref (for smooth auto-scroll into view on mobile)
  const selectedDayCardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selectedDay && selectedDayCardRef.current && window.innerWidth < 768) {
      selectedDayCardRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [selectedDay]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (monthPickerRef.current && !monthPickerRef.current.contains(event.target as Node)) {
        setIsMonthPickerOpen(false);
      }
      if (typeDropdownRef.current && !typeDropdownRef.current.contains(event.target as Node)) {
        setIsTypeDropdownOpen(false);
      }
    };
    if (isMonthPickerOpen || isTypeDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMonthPickerOpen, isTypeDropdownOpen]);

  // Google Calendar View Modes:
  // 'MONTH' (ماهانه - پیش‌فرض) | 'SCHEDULE' (مناسبت‌ها)
  const [viewMode, setViewMode] = useState<'SCHEDULE' | 'MONTH'>('MONTH');
  const [filterType, setFilterType] = useState<'ALL' | 'HOLIDAYS' | 'SCHOOL_EVENTS'>('ALL');

  // Backend Events & Tenant Holidays
  const [events, setEvents] = useState<any[]>([]);
  const [tenantHolidays, setTenantHolidays] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Event Types State (Default + School-Admin Customized)
  const [eventTypes, setEventTypes] = useState<EventTypeItem[]>(DEFAULT_EVENT_TYPES);

  // Modals & Actions
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [deleteConfirmEvent, setDeleteConfirmEvent] = useState<{ id: string; title: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteConfirmHoliday, setDeleteConfirmHoliday] = useState<{ id: string; title: string; date?: string } | null>(null);
  const [isDeletingHoliday, setIsDeletingHoliday] = useState(false);
  const [isEventTypesModalOpen, setIsEventTypesModalOpen] = useState(false);
  const [isSavingEventTypes, setIsSavingEventTypes] = useState(false);
  const [newTypeForm, setNewTypeForm] = useState({ titleFa: '', color: 'emerald', baseType: 'ACADEMIC' });
  const [isHolidayModalOpen, setIsHolidayModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form: Create / Edit Event
  const [form, setForm] = useState({
    title: '',
    description: '',
    type: 'ACADEMIC',
    startDate: todayInfo.jalaliStr,
    startTime: '08:00',
    endDate: todayInfo.jalaliStr,
    endTime: '10:00',
    location: 'سالن همایش‌های مدرسه',
  });

  // Form: Create Tenant Holiday
  const [holidayForm, setHolidayForm] = useState({
    date: todayInfo.jalaliStr,
    titleFa: 'تعطیلی به علت برودت شدید هوا و یخبندان معابر',
  });

  // Fetch Events, Event Types, and Tenant Holidays from API
  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [eventsRes, holidaysRes, eventTypesRes] = await Promise.allSettled([
        apiClient.get('/calendar/events'),
        apiClient.get('/calendar/tenant-holidays'),
        apiClient.get('/calendar/event-types'),
      ]);

      if (eventsRes.status === 'fulfilled') {
        setEvents(eventsRes.value.data || []);
      } else {
        // Fallback events for 1405
        setEvents([
          {
            id: 'ev-1',
            title: 'آزمون هماهنگ آغاز سال تحصیلی و سنجش ورودی',
            description: 'سنجش جامع آمادگی تحصیلی دانش‌آموزان و دانش‌آموزان پایه‌های دهم و یازدهم',
            type: 'EXAM',
            startDate: '1405-07-11T08:30:00.000Z',
            jalaliDate: '1405-07-11',
            location: 'سالن امتحانات شماره ۱',
          },
          {
            id: 'ev-2',
            title: 'جلسه مجمع عمومی انجمن اولیاء و مربیان',
            description: 'ارائه گزارش عملکرد سالانه، تدوین برنامه‌های انضباطی و آموزشی سال تحصیلی',
            type: 'MEETING',
            startDate: '1405-07-25T16:00:00.000Z',
            jalaliDate: '1405-07-25',
            location: 'سالن همایش‌های مرکزی مدرسه',
          },
          {
            id: 'ev-3',
            title: 'اردوی علمی-پژوهشی نمایشگاه دستاوردهای هوافضا و هوش مصنوعی',
            description: 'ویژه دانش‌آموزان و دانش‌آموزان رشته‌های فنی، مهندسی و علوم پایه',
            type: 'EVENT',
            startDate: '1405-08-18T09:00:00.000Z',
            jalaliDate: '1405-08-18',
            location: 'مرکز نوآوری و پارک علم و فناوری',
          },
          {
            id: 'ev-4',
            title: 'امتحانات نوبت اول (دی‌ماه ۱۴۰۵)',
            description: 'شروع امتحانات هماهنگ پایانی نوبت اول کلیه مقاطع تحصیلی',
            type: 'EXAM',
            startDate: '1405-10-06T08:00:00.000Z',
            jalaliDate: '1405-10-06',
            location: 'حوزه‌های امتحانی مدرسه',
          },
          {
            id: 'ev-5',
            title: 'جشن استقبال از بهار و تقدیر از ستارگان برتر المپیاد و مهارت',
            description: 'آیین باشکوه تجلیل از نخبگان مسابقات ملی مهارت و کنکور',
            type: 'EVENT',
            startDate: '1405-12-25T10:00:00.000Z',
            jalaliDate: '1405-12-25',
            location: 'آمفی‌تئاتر فرهنگسرای اندیشه',
          },
        ]);
      }

      if (holidaysRes.status === 'fulfilled') {
        setTenantHolidays(holidaysRes.value.data || []);
      }

      if (
        eventTypesRes.status === 'fulfilled' &&
        Array.isArray(eventTypesRes.value.data) &&
        eventTypesRes.value.data.length > 0
      ) {
        setEventTypes(eventTypesRes.value.data);
      }
    } catch (err) {
      console.error('Failed to load calendar data', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Compute month days for the selected month in 1405
  const monthDays = useMemo(
    () => getMonthDays1405(selectedMonth, selectedYear),
    [selectedMonth, selectedYear]
  );
  const currentMonthMeta = PERSIAN_MONTHS.find((m) => m.id === selectedMonth) || PERSIAN_MONTHS[0];

  // First day of month offset (شنبه = 0, یک‌شنبه = 1, ..., جمعه = 6)
  const leadingBlankDays = monthDays.length > 0 ? monthDays[0].dayOfWeek : 0;

  // Default selected day on month change
  useEffect(() => {
    if (monthDays.length > 0) {
      const todayInMonth = monthDays.find((d) => d.isToday);
      setSelectedDay(todayInMonth || monthDays[0]);
    }
  }, [selectedMonth, selectedYear, monthDays]);

  // Jump to today
  const handleJumpToToday = () => {
    setSelectedYear(todayInfo.year);
    setSelectedMonth(todayInfo.month);
    const days = getMonthDays1405(todayInfo.month, todayInfo.year);
    const today = days.find((d) => d.isToday) || days.find((d) => d.day === todayInfo.day) || days[0];
    setSelectedDay(today);
  };

  // Month navigation helpers
  const handlePrevMonth = () => {
    setSelectedMonth((prev) => (prev > 1 ? prev - 1 : 12));
  };

  const handleNextMonth = () => {
    setSelectedMonth((prev) => (prev < 12 ? prev + 1 : 1));
  };

  // Check if a day has school events (supporting multi-day event date ranges)
  const getDaySchoolEvents = (jalaliStr: string) => {
    return events.filter((ev) => {
      if (ev.isArchived || ev.isCancelled || ev.status === 'CANCELLED') return false;

      let startJalali = '';
      if (ev.startDate) {
        startJalali = gregorianToJalaliStr(ev.startDate);
      } else if (ev.jalaliDate) {
        startJalali = ev.jalaliDate.slice(0, 10);
      }

      if (!startJalali) return false;

      let endJalali = startJalali;
      if (ev.endDate) {
        endJalali = gregorianToJalaliStr(ev.endDate);
      }

      if (endJalali < startJalali) {
        endJalali = startJalali;
      }

      return jalaliStr >= startJalali && jalaliStr <= endJalali;
    });
  };

  // Check if a day has a tenant (custom school) holiday
  const getDayTenantHoliday = (jalaliStr: string) => {
    return tenantHolidays.find((th) => {
      if (th.jalaliInfo?.formatted === jalaliStr) return true;
      if (th.date) {
        return gregorianToJalaliStr(th.date) === jalaliStr;
      }
      return false;
    });
  };

  // Helpers for Event Types
  const getTypeDotColor = (typeCode: string) => {
    const found = eventTypes.find((t) => t.code === typeCode || t.baseType === typeCode);
    if (!found) return 'bg-primary';
    switch (found.color) {
      case 'orange':
        return 'bg-orange-500';
      case 'amber':
        return 'bg-amber-500';
      case 'purple':
        return 'bg-purple-500';
      case 'rose':
        return 'bg-rose-500';
      case 'blue':
        return 'bg-blue-500';
      case 'teal':
        return 'bg-teal-500';
      case 'emerald':
        return 'bg-emerald-500';
      default:
        return 'bg-primary';
    }
  };

  const getTypeLabel = (typeCode: string) => {
    const found = eventTypes.find((t) => t.code === typeCode || t.baseType === typeCode);
    return found ? found.titleFa : typeCode;
  };

  const resetForm = () => {
    setForm({
      title: '',
      description: '',
      type: eventTypes[0]?.code || 'ACADEMIC',
      startDate: todayInfo.jalaliStr,
      startTime: '08:00',
      endDate: todayInfo.jalaliStr,
      endTime: '10:00',
      location: 'سالن همایش‌های مدرسه',
    });
    setEditingEventId(null);
    setError(null);
    setIsTypeDropdownOpen(false);
  };

  const handleOpenCreate = (dateStr?: string) => {
    resetForm();
    if (dateStr) {
      setForm((p) => ({ ...p, startDate: dateStr, endDate: dateStr }));
    }
    setIsCreateOpen(true);
  };

  const handleOpenEdit = (ev: any) => {
    setError(null);
    setEditingEventId(ev.id);

    let startDateStr = todayInfo.jalaliStr;
    let startTimeStr = '08:00';
    let endDateStr = todayInfo.jalaliStr;
    let endTimeStr = '10:00';

    if (ev.startDate) {
      try {
        startDateStr = gregorianToJalaliStr(ev.startDate);
        const d = new Date(ev.startDate);
        startTimeStr = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
      } catch {}
    } else if (ev.jalaliDate) {
      startDateStr = ev.jalaliDate;
    }

    if (ev.endDate) {
      try {
        endDateStr = gregorianToJalaliStr(ev.endDate);
        const d = new Date(ev.endDate);
        endTimeStr = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
      } catch {}
    } else {
      endDateStr = startDateStr;
    }

    let matchedType = ev.eventType || ev.type || 'ACADEMIC';
    if (Array.isArray(ev.tags)) {
      const typeTag = ev.tags.find((t: string) => t.startsWith('type:'));
      if (typeTag) {
        matchedType = typeTag.replace('type:', '');
      }
    }

    setForm({
      title: ev.title || '',
      description: ev.description || '',
      type: matchedType,
      startDate: startDateStr,
      startTime: startTimeStr,
      endDate: endDateStr,
      endTime: endTimeStr,
      location: ev.location || '',
    });
    setIsCreateOpen(true);
  };

  const handleDeleteEvent = (eventId: string, title: string) => {
    setDeleteConfirmEvent({ id: eventId, title });
  };

  const confirmDelete = async () => {
    if (!deleteConfirmEvent) return;
    setIsDeleting(true);
    try {
      await apiClient.delete(`/calendar/events/${deleteConfirmEvent.id}`);
      setEvents((prev) => prev.filter((e) => e.id !== deleteConfirmEvent.id));
      toast.success(`رویداد «${deleteConfirmEvent.title}» با موفقیت حذف شد.`);
      setDeleteConfirmEvent(null);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'خطا در حذف رویداد.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSaveEventTypes = async () => {
    setIsSavingEventTypes(true);
    try {
      const res = await apiClient.put('/calendar/event-types', { eventTypes });
      if (res.data?.eventTypes && Array.isArray(res.data.eventTypes)) {
        setEventTypes(res.data.eventTypes);
      }
      toast.success('انواع رویدادهای مدرسه با موفقیت ذخیره شدند.');
      setIsEventTypesModalOpen(false);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'خطا در ذخیره انواع رویداد.');
    } finally {
      setIsSavingEventTypes(false);
    }
  };

  // Create / Edit Event Submit
  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      const startDateObj = jalaliToGregorianDate(form.startDate);
      const [sh, sm] = form.startTime.split(':').map(Number);
      startDateObj.setHours(sh || 8, sm || 0, 0, 0);

      const endDateObj = jalaliToGregorianDate(form.endDate);
      const [eh, em] = form.endTime.split(':').map(Number);
      endDateObj.setHours(eh || 10, em || 0, 0, 0);

      const selectedTypeItem = eventTypes.find((t) => t.code === form.type);
      const baseEventType = selectedTypeItem?.baseType || (['ACADEMIC', 'EXAM', 'MEETING', 'CULTURAL', 'SPORTS', 'EXCURSION'].includes(form.type) ? form.type : 'ACADEMIC');

      const payload = {
        title: form.title,
        description: form.description,
        type: form.type,
        eventType: baseEventType,
        baseType: baseEventType,
        startDate: startDateObj.toISOString(),
        endDate: endDateObj.toISOString(),
        location: form.location,
        tags: form.type !== baseEventType ? [`type:${form.type}`] : [],
      };

      if (editingEventId) {
        await apiClient.patch(`/calendar/events/${editingEventId}`, payload);
        toast.success(`رویداد «${form.title}» با موفقیت ویرایش شد.`);
      } else {
        await apiClient.post('/calendar/events', payload);
        toast.success(`رویداد «${form.title}» با موفقیت ثبت شد.`);
      }

      setIsCreateOpen(false);
      resetForm();
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'خطا در ذخیره رویداد.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Create Tenant Holiday Submit
  const handleCreateTenantHoliday = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      await apiClient.post('/calendar/tenant-holidays', {
        date: holidayForm.date,
        titleFa: holidayForm.titleFa,
      });
      toast.success(`تعطیلی مدرسه «${holidayForm.titleFa}» با موفقیت ثبت شد.`);
      setHolidayForm({ date: todayInfo.jalaliStr, titleFa: '' });
      setIsHolidayModalOpen(false);
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'خطا در ثبت تعطیلی مدرسه.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTenantHoliday = (holidayId: string, title: string, date?: string) => {
    setDeleteConfirmHoliday({ id: holidayId, title, date });
  };

  const confirmDeleteHoliday = async () => {
    if (!deleteConfirmHoliday) return;
    setIsDeletingHoliday(true);
    try {
      await apiClient.delete(`/calendar/tenant-holidays/${deleteConfirmHoliday.id}`);
      setTenantHolidays((prev) => prev.filter((h) => h.id !== deleteConfirmHoliday.id));
      toast.success(`تعطیلی مدرسه «${deleteConfirmHoliday.title}» با موفقیت لغو و حذف شد.`);
      setDeleteConfirmHoliday(null);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'خطا در حذف تعطیلی مدرسه.');
    } finally {
      setIsDeletingHoliday(false);
    }
  };

  // Schedule / Agenda View Items: All days of current month that strictly have occasions, events, or real official holidays
  // Fridays without occasions are completely excluded from the occasions list
  const scheduleItems = useMemo(() => {
    return monthDays.filter((day) => {
      const daySchoolEvents = getDaySchoolEvents(day.jalaliStr);
      const tenantHoliday = getDayTenantHoliday(day.jalaliStr);

      // Filter out 'تعطیل هفتگی (جمعه)' from occasions if present
      const realOccasions = (day.occasions || []).filter(
        (occ) => occ && occ !== 'تعطیل هفتگی (جمعه)'
      );
      const hasRealOccasions = realOccasions.length > 0;
      const hasEvents = daySchoolEvents.length > 0;

      const isRealOfficialHoliday =
        (Boolean(day.isOfficialHoliday) &&
          Boolean(day.holidayReason) &&
          day.holidayReason !== 'تعطیل هفتگی (جمعه)') ||
        Boolean(tenantHoliday);

      // Any Friday that has NO actual occasions MUST be excluded from the occasions list!
      if (day.isFriday && !hasRealOccasions) {
        return false;
      }

      // Reject any day that has no occasion, no school event, and no real official holiday
      const hasAnyContent = hasRealOccasions || hasEvents || isRealOfficialHoliday;
      if (!hasAnyContent) {
        return false;
      }

      if (filterType === 'HOLIDAYS') return isRealOfficialHoliday;
      if (filterType === 'SCHOOL_EVENTS') return hasEvents || Boolean(tenantHoliday);
      return true;
    });
  }, [monthDays, events, tenantHolidays, filterType]);

  return (
    <div className="w-full max-w-7xl mx-auto space-y-3 sm:space-y-4 pb-20 md:pb-8">
      {/* 1. GOOGLE CALENDAR TOP APP BAR */}
      <div className="bg-white dark:bg-[#151C28] rounded-2xl border border-gray-200/80 dark:border-gray-800 shadow-xs p-3 sm:p-4 flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-3 select-none">
        {/* Right (RTL): Month Title Dropdown, Steppers & Today Button */}
        <div className="flex items-center justify-between sm:justify-start gap-2 sm:gap-3 flex-wrap sm:flex-nowrap">
          {/* Custom Month & Year Picker Popover */}
          <div className="relative" ref={monthPickerRef}>
            <button
              type="button"
              onClick={() => setIsMonthPickerOpen((prev) => !prev)}
              className={`min-h-[44px] px-3.5 sm:px-4 py-2 rounded-xl border transition-all flex items-center gap-2 select-none shrink-0 ${
                isMonthPickerOpen
                  ? 'bg-primary/10 dark:bg-primary/20 border-primary dark:border-primary text-primary dark:text-primary-light ring-2 ring-primary/20'
                  : 'bg-gray-50 dark:bg-[#1C2536] hover:bg-gray-100 dark:hover:bg-[#242F42] border-gray-200/80 dark:border-gray-700/80 text-ink-darker dark:text-white'
              }`}
              title="انتخاب سریع ماه و سال"
            >
              <CalendarIcon className="w-4 h-4 text-primary shrink-0" />
              <span className="text-sm sm:text-base font-black truncate">
                {PERSIAN_MONTHS.find((m) => m.id === selectedMonth)?.name} {toPersianDigits(selectedYear)}
              </span>
              <ChevronDown
                className={`w-3.5 h-3.5 text-gray-400 dark:text-gray-400 transition-transform duration-200 shrink-0 ${
                  isMonthPickerOpen ? 'rotate-180 text-primary' : ''
                }`}
              />
            </button>

            {/* Custom Month & Year Picker Floating Menu */}
            {isMonthPickerOpen && (
              <div className="absolute right-0 top-full mt-2 z-40 w-72 sm:w-80 p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-[#151C28] border border-gray-200 dark:border-gray-700 shadow-2xl animate-in fade-in zoom-in-95 duration-150 select-none">
                {/* Year Stepper Header */}
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-100 dark:border-gray-800">
                  <span className="text-xs font-bold text-gray-500 dark:text-gray-400">
                    انتخاب ماه و سال
                  </span>
                  <div className="flex items-center gap-1 bg-gray-100 dark:bg-[#1C2536]/90 p-1 rounded-xl border border-gray-200/60 dark:border-gray-700/60">
                    <button
                      type="button"
                      onClick={() => setSelectedYear((y) => y - 1)}
                      className="h-7 w-7 rounded-lg hover:bg-white dark:hover:bg-[#242F42] flex items-center justify-center text-gray-600 dark:text-gray-300 transition-colors"
                      title="سال قبل"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                    <span className="text-xs font-black px-2 text-ink-darker dark:text-white font-mono">
                      {toPersianDigits(selectedYear)}
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedYear((y) => y + 1)}
                      className="h-7 w-7 rounded-lg hover:bg-white dark:hover:bg-[#242F42] flex items-center justify-center text-gray-600 dark:text-gray-300 transition-colors"
                      title="سال بعد"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* 12-Month Grid */}
                <div className="grid grid-cols-3 gap-1.5">
                  {PERSIAN_MONTHS.map((m) => {
                    const isSelected = m.id === selectedMonth;
                    const isCurrentRealMonth = m.id === todayInfo.month && selectedYear === todayInfo.year;

                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => {
                          setSelectedMonth(m.id);
                          setIsMonthPickerOpen(false);
                        }}
                        className={`min-h-[42px] px-2 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center relative ${
                          isSelected
                            ? 'bg-primary text-white shadow-xs font-black scale-102 z-10'
                            : 'bg-gray-50 dark:bg-[#1C2536]/70 hover:bg-gray-100 dark:hover:bg-[#242F42] text-ink-darker dark:text-gray-200 border border-transparent hover:border-gray-200 dark:hover:border-gray-600'
                        }`}
                      >
                        <span>{m.name}</span>

                        {isCurrentRealMonth && !isSelected && (
                          <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-primary" title="ماه جاری" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Footer Jump to Today / Current Month */}
                <div className="pt-3 mt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedYear(todayInfo.year);
                      setSelectedMonth(todayInfo.month);
                      setIsMonthPickerOpen(false);
                    }}
                    className="text-xs font-bold text-primary dark:text-primary-light hover:underline flex items-center gap-1"
                  >
                    <span>ماه جاری</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsMonthPickerOpen(false)}
                    className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    بستن
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Month Stepper Arrows */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="h-10 w-10 sm:h-11 sm:w-11 rounded-xl border border-gray-200 dark:border-gray-700/80 hover:bg-gray-100 dark:hover:bg-[#1C2536] flex items-center justify-center text-gray-600 dark:text-gray-300 hover:text-ink-darker dark:hover:text-white transition-colors"
              title="ماه قبل"
              aria-label="ماه قبل"
            >
              <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
            <button
              type="button"
              onClick={handleNextMonth}
              className="h-10 w-10 sm:h-11 sm:w-11 rounded-xl border border-gray-200 dark:border-gray-700/80 hover:bg-gray-100 dark:hover:bg-[#1C2536] flex items-center justify-center text-gray-600 dark:text-gray-300 hover:text-ink-darker dark:hover:text-white transition-colors"
              title="ماه بعد"
              aria-label="ماه بعد"
            >
              <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>

          {/* Today Button */}
          <button
            type="button"
            onClick={handleJumpToToday}
            className="h-10 sm:h-11 px-3 sm:px-3.5 rounded-xl border border-gray-200 dark:border-gray-700/80 hover:border-primary/40 bg-gray-50 dark:bg-[#1C2536]/80 hover:bg-primary/5 dark:hover:bg-primary/10 text-xs sm:text-sm font-bold text-gray-700 dark:text-gray-200 hover:text-primary dark:hover:text-primary-light transition-all flex items-center gap-1.5 shrink-0 shadow-2xs"
            title="پرش به تاریخ امروز"
          >
            <span className="w-2 h-2 rounded-full bg-primary inline-block" />
            <span>امروز</span>
            <span className="text-[10px] sm:text-xs text-gray-400 dark:text-gray-400 mr-0.5 font-mono">
              ({toPersianDigits(todayInfo.day)})
            </span>
          </button>
        </div>

        {/* Left (RTL): View Mode Switcher & Staff Actions */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2.5 sm:gap-3">
          {/* Google Calendar View Mode Segmented Controls */}
          <div className="flex items-center bg-gray-100/90 dark:bg-[#1C2536]/90 p-1 rounded-xl text-xs font-bold border border-gray-200/60 dark:border-gray-700/60 shrink-0">
            {/* 1. راست: مناسبت‌ها */}
            <button
              type="button"
              onClick={() => setViewMode('SCHEDULE')}
              className={`flex-1 sm:flex-initial min-h-[42px] px-4 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                viewMode === 'SCHEDULE'
                  ? 'bg-white dark:bg-[#151C28] text-primary dark:text-primary-light shadow-xs font-black'
                  : 'text-gray-600 dark:text-gray-400 hover:text-ink-darker dark:hover:text-white'
              }`}
              title="نمای مناسبت‌ها و رویدادها"
            >
              <ListOrdered className="w-4 h-4 shrink-0" />
              <span>مناسبت‌ها</span>
            </button>

            {/* 2. چپ: تقویم */}
            <button
              type="button"
              onClick={() => setViewMode('MONTH')}
              className={`flex-1 sm:flex-initial min-h-[42px] px-4 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                viewMode === 'MONTH'
                  ? 'bg-white dark:bg-[#151C28] text-primary dark:text-primary-light shadow-xs font-black'
                  : 'text-gray-600 dark:text-gray-400 hover:text-ink-darker dark:hover:text-white'
              }`}
              title="نمای تقویم"
            >
              <CalendarDays className="w-4 h-4 shrink-0" />
              <span>تقویم</span>
            </button>
          </div>

          {/* Desktop & Mobile Admin Action Buttons */}
          {canManageCalendar && (
            <>
              {/* Divider between Views and Actions */}
              <div className="hidden xl:block h-7 w-px bg-gray-200 dark:bg-gray-700/60 shrink-0" />

              <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                <button
                  type="button"
                  onClick={() => setIsEventTypesModalOpen(true)}
                  className="flex-1 sm:flex-initial min-h-[42px] px-3.5 py-2 rounded-xl border border-gray-200/90 dark:border-gray-700 bg-white dark:bg-[#1C2536] hover:bg-gray-50 dark:hover:bg-[#242F42] text-xs sm:text-sm font-bold text-gray-700 dark:text-gray-200 hover:text-primary dark:hover:text-primary-light transition-all flex items-center justify-center gap-1.5 shadow-2xs shrink-0 whitespace-nowrap"
                  title="مدیریت و تعریف انواع رویدادها"
                >
                  <SlidersHorizontal className="w-4 h-4 text-primary shrink-0" />
                  <span className="whitespace-nowrap">انواع رویداد</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (selectedDay) setHolidayForm((p) => ({ ...p, date: selectedDay.jalaliStr }));
                    setIsHolidayModalOpen(true);
                  }}
                  className="flex-1 sm:flex-initial min-h-[42px] px-3.5 py-2 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/60 dark:bg-rose-950/20 hover:bg-rose-100/60 dark:hover:bg-rose-950/40 text-xs sm:text-sm font-bold text-rose-700 dark:text-rose-400 transition-all flex items-center justify-center gap-1.5 shadow-2xs shrink-0 whitespace-nowrap"
                  title="ثبت تعطیلی مدرسه"
                >
                  <ShieldAlert className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                  <span className="whitespace-nowrap">تعطیلی مدرسه</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenCreate(selectedDay?.jalaliStr)}
                  className="flex-1 sm:flex-initial min-h-[42px] px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover active:scale-98 text-white text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-1.5 shadow-xs shrink-0 whitespace-nowrap"
                  title="ثبت رویداد جدید در تقویم"
                >
                  <Plus className="w-4 h-4 stroke-[2.5] shrink-0" />
                  <span className="whitespace-nowrap">رویداد جدید</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* 3. VIEW 1: GOOGLE CALENDAR OCCASIONS / SCHEDULE VIEW */}
      {viewMode === 'SCHEDULE' && (
        <div className="space-y-3 animate-in fade-in duration-200">
          {/* Sub-Filter Bar (Exclusively for Occasions View) */}
          <div className="flex items-center justify-between gap-2 overflow-x-auto no-scrollbar px-1 py-0.5">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setFilterType('ALL')}
                className={`min-h-[40px] sm:min-h-[44px] px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 inline-flex items-center justify-center ${
                  filterType === 'ALL'
                    ? 'bg-ink-darker dark:bg-white text-white dark:text-[#151C28] shadow-2xs'
                    : 'bg-white dark:bg-[#1C2536] text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-[#242F42]'
                }`}
              >
                همه ({toPersianDigits(monthDays.length)})
              </button>
              <button
                type="button"
                onClick={() => setFilterType('HOLIDAYS')}
                className={`min-h-[40px] sm:min-h-[44px] px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 inline-flex items-center gap-1.5 ${
                  filterType === 'HOLIDAYS'
                    ? 'bg-rose-600 text-white shadow-2xs'
                    : 'bg-white dark:bg-[#1C2536] text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50 hover:bg-rose-50 dark:hover:bg-rose-950/30'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    filterType === 'HOLIDAYS' ? 'bg-white' : 'bg-rose-500'
                  }`}
                />
                <span>تعطیلات</span>
              </button>
              <button
                type="button"
                onClick={() => setFilterType('SCHOOL_EVENTS')}
                className={`min-h-[40px] sm:min-h-[44px] px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 inline-flex items-center gap-1.5 ${
                  filterType === 'SCHOOL_EVENTS'
                    ? 'bg-primary text-white shadow-2xs'
                    : 'bg-white dark:bg-[#1C2536] text-primary dark:text-primary-light border border-primary/30 dark:border-primary/40 hover:bg-primary/5 dark:hover:bg-primary/10'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    filterType === 'SCHOOL_EVENTS' ? 'bg-white' : 'bg-primary'
                  }`}
                />
                <span>رویدادها ({toPersianDigits(events.length)})</span>
              </button>
            </div>

            <span className="text-[11px] font-bold text-gray-400 dark:text-gray-400 hidden sm:inline shrink-0">
              {toPersianDigits(currentMonthMeta.days)} روز
            </span>
          </div>

          {scheduleItems.length === 0 ? (
            <div className="bg-white dark:bg-[#151C28] rounded-2xl border border-gray-200 dark:border-gray-800 p-8 text-center">
              <CalendarCheck className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
              <p className="text-xs font-bold text-gray-500 dark:text-gray-400">موردی یافت نشد</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {scheduleItems.map((day) => {
                const daySchoolEvents = getDaySchoolEvents(day.jalaliStr);
                const tenantHoliday = getDayTenantHoliday(day.jalaliStr);
                const isHoliday =
                  (day.isOfficialHoliday && day.holidayReason !== 'تعطیل هفتگی (جمعه)') ||
                  Boolean(tenantHoliday);

                const isSelected = selectedDay?.jalaliStr === day.jalaliStr;

                return (
                  <div
                    key={day.jalaliStr}
                    onClick={() => setSelectedDay(day)}
                    className={`bg-white dark:bg-[#151C28] rounded-2xl border p-3 sm:p-4 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs cursor-pointer ${
                      isSelected
                        ? 'border-primary dark:border-primary-light ring-2 ring-primary/20 dark:ring-primary-light/25 bg-primary/[0.04] dark:bg-primary/[0.12]'
                        : isHoliday
                        ? 'border-rose-200/80 dark:border-rose-800/60 bg-rose-50/20 dark:bg-rose-950/40 hover:border-rose-300 dark:hover:border-rose-700'
                        : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700'
                    }`}
                  >
                    {/* Date Block (Right) */}
                    <div className="flex items-center gap-3 w-full sm:w-56 shrink-0">
                      {/* Day Number Pill */}
                      <div
                        className={`h-11 w-11 rounded-2xl flex flex-col items-center justify-center shrink-0 ${
                          day.isToday
                            ? 'bg-primary text-white font-black shadow-xs'
                            : isHoliday
                            ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 font-bold border border-rose-200/50 dark:border-rose-800/50'
                            : 'bg-gray-100 dark:bg-[#1C2536] text-ink-darker dark:text-gray-100 font-bold'
                        }`}
                      >
                        <span className="text-base leading-none">{toPersianDigits(day.day)}</span>
                        <span className="text-[9px] mt-0.5 leading-none opacity-80">
                          {currentMonthMeta.name}
                        </span>
                      </div>

                      {/* Day Name & Badges */}
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`text-xs font-black ${
                              isHoliday ? 'text-rose-600 dark:text-rose-400' : 'text-gray-800 dark:text-gray-200'
                            }`}
                          >
                            {day.dayOfWeekName}
                          </span>
                          {day.isToday && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-primary text-white font-bold">
                              امروز
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-gray-400 dark:text-gray-400 font-mono block mt-0.5">
                          {day.gregorianStr}
                        </span>
                      </div>
                    </div>

                    {/* Middle: Event & Occasion Cards */}
                    <div className="flex-1 w-full space-y-1.5 min-w-0">
                      {/* Emergency / Tenant Holiday */}
                      {tenantHoliday && (
                        <div className="p-2 sm:p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800/60 text-rose-800 dark:text-rose-200 text-xs flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <ShieldAlert className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 shrink-0" />
                            <strong className="font-bold shrink-0">تعطیلی مدرسه:</strong>
                            <span className="truncate">{tenantHoliday.titleFa}</span>
                          </div>
                          {canManageCalendar && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteTenantHoliday(tenantHoliday.id, tenantHoliday.titleFa, day.jalaliStr);
                              }}
                              className="p-1 hover:bg-rose-100 dark:hover:bg-rose-900/50 rounded-lg text-rose-600 dark:text-rose-400 transition-colors shrink-0"
                              title="لغو تعطیلی"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      )}

                      {/* Official Holiday Reason (excludes plain Friday) */}
                      {day.holidayReason && day.holidayReason !== 'تعطیل هفتگی (جمعه)' && !tenantHoliday && (
                        <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800/60 text-rose-800 dark:text-rose-200 text-xs flex items-center gap-2">
                          <AlertCircle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 shrink-0" />
                          <strong className="font-bold shrink-0">تعطیل رسمی:</strong>
                          <span className="truncate">{day.holidayReason}</span>
                        </div>
                      )}

                      {/* School Events & Homeworks */}
                      {daySchoolEvents.map((ev) => {
                        const isHomework = ev.type === 'HOMEWORK' || ev.eventType === 'HOMEWORK';
                        return (
                          <div
                            key={ev.id}
                            className={`p-2.5 rounded-xl border text-xs flex items-center justify-between gap-2 ${
                              isHomework
                                ? 'bg-orange-50/70 dark:bg-orange-950/30 border-orange-200/80 dark:border-orange-900/50'
                                : 'bg-gray-50 dark:bg-[#1C2536]/80 border-gray-200/80 dark:border-gray-700/60'
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span
                                className={`w-2 h-2 rounded-full shrink-0 ${getTypeDotColor(ev.type || ev.eventType)}`}
                              />
                              <div className="min-w-0">
                                <span className="font-bold text-ink-darker dark:text-gray-100 truncate block">{ev.title}</span>
                                {isHomework ? (
                                  (ev.lessonName || ev.location) && (
                                    <span className="text-[10px] text-gray-500 dark:text-gray-400 truncate flex items-center gap-1 font-medium mt-0.5">
                                      <BookOpen className="w-2.5 h-2.5 text-orange-500 shrink-0" />
                                      <span className="truncate">{ev.lessonName || ev.location}</span>
                                    </span>
                                  )
                                ) : ev.location ? (
                                  <span className="text-[10px] text-gray-400 dark:text-gray-400 truncate block">
                                    {ev.location}
                                  </span>
                                ) : null}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {!isHomework && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(`/app/events/${ev.id}`);
                                  }}
                                  className="inline-flex items-center gap-1 text-[11px] sm:text-xs font-bold text-primary hover:text-primary-dark dark:hover:text-primary-light transition-colors cursor-pointer group/link hover:underline"
                                >
                                  <span>مشاهده</span>
                                  <ChevronLeft className="w-3.5 h-3.5 transition-transform group-hover/link:-translate-x-0.5 shrink-0" />
                                </button>
                              )}
                              {isHomework ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const hwId = ev.homeworkId || ev.id.replace('hw-', '');
                                    const targetUrl =
                                      currentUser?.role === 'TEACHER'
                                        ? `/app/teacher/homework?homeworkId=${hwId}`
                                        : `/app/student/homework?homeworkId=${hwId}`;
                                    navigate(targetUrl);
                                  }}
                                  className="text-[11px] h-7 px-2.5 rounded-lg border-orange-200 dark:border-orange-800/80 text-orange-700 dark:text-orange-300 hover:bg-orange-100/50 dark:hover:bg-orange-900/30 flex items-center gap-1 font-bold"
                                >
                                  <span>تکلیف</span>
                                  <ExternalLink className="w-3 h-3" />
                                </Button>
                              ) : canManageCalendar && (
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleOpenEdit(ev);
                                    }}
                                    className="p-1.5 text-gray-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                                    title="ویرایش رویداد"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteEvent(ev.id, ev.title);
                                    }}
                                    className="p-1.5 text-gray-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
                                    title="حذف رویداد"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}

                      {/* Occasions List */}
                      {day.occasions.filter((occ) => occ !== day.holidayReason && occ !== 'تعطیل هفتگی (جمعه)').length > 0 && (
                        <div className="text-[11px] text-gray-600 dark:text-gray-300 flex items-center gap-1.5 py-0.5 truncate">
                          <Sparkles className="w-3 h-3 text-amber-500 shrink-0" />
                          <span className="truncate">
                            {day.occasions.filter((occ) => occ !== day.holidayReason && occ !== 'تعطیل هفتگی (جمعه)').join(' • ')}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Left: Quick Action Button */}
                    {canManageCalendar && (
                      <div className="shrink-0 pt-1 sm:pt-0 self-end sm:self-center">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenCreate(day.jalaliStr);
                          }}
                          className="min-h-[38px] px-2.5 py-1 text-[11px] font-bold text-primary hover:bg-primary/10 rounded-lg transition-colors flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3" />
                          <span>ثبت رویداد</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 4. VIEW 2: GOOGLE CALENDAR MONTH VIEW (Clean 7-Col Grid + Split Inspector) */}
      {viewMode === 'MONTH' && (
        <div className="space-y-3 sm:space-y-4 animate-in fade-in duration-200">
          <Card className="p-2 sm:p-3 md:p-4 bg-white dark:bg-[#151C28] border border-gray-200/80 dark:border-gray-800 shadow-xs rounded-2xl overflow-hidden">
            {/* Weekday Strip */}
            <div className="grid grid-cols-7 bg-gray-50/90 dark:bg-[#1C2536]/80 py-1.5 sm:py-2 px-1 rounded-xl mb-1.5 sm:mb-2 border border-gray-200/60 dark:border-gray-700/80 text-center text-xs sm:text-sm font-bold text-gray-500 dark:text-gray-300">
              {WEEK_DAYS.map((wd) => (
                <div key={wd.id} className={wd.id === 6 ? 'text-rose-600 dark:text-rose-400 font-black' : ''}>
                  <span className="hidden sm:inline">{wd.name}</span>
                  <span className="sm:hidden">{wd.short}</span>
                </div>
              ))}
            </div>

            {/* 7-Col Calendar Matrix */}
            <div className="grid grid-cols-7 gap-1 sm:gap-1.5 md:gap-2">
              {/* Blanks */}
              {Array.from({ length: leadingBlankDays }).map((_, i) => (
                <div
                  key={`blank-${i}`}
                  className="min-h-[48px] sm:min-h-[62px] md:min-h-[72px] rounded-xl sm:rounded-2xl bg-gray-50/40 dark:bg-[#1C2536]/25 border border-dashed border-gray-200/50 dark:border-gray-800/80"
                />
              ))}

              {/* Month Days */}
              {monthDays.map((day) => {
                const isSelected = selectedDay?.jalaliStr === day.jalaliStr;
                const daySchoolEvents = getDaySchoolEvents(day.jalaliStr);
                const tenantHoliday = getDayTenantHoliday(day.jalaliStr);
                const isHoliday = day.isOfficialHoliday || Boolean(tenantHoliday);
                const hasIndicators = isHoliday || Boolean(tenantHoliday) || daySchoolEvents.length > 0;

                return (
                  <div
                    key={day.day}
                    onClick={() => setSelectedDay(day)}
                    className={`min-h-[48px] sm:min-h-[62px] md:min-h-[72px] p-1.5 sm:p-2 rounded-xl sm:rounded-2xl border transition-all duration-150 cursor-pointer flex flex-col justify-between select-none relative group ${
                      isSelected
                        ? 'ring-2 ring-primary dark:ring-primary-light border-primary dark:border-primary-light bg-primary/5 dark:bg-primary/20 shadow-xs'
                        : isHoliday
                        ? 'bg-rose-50/40 dark:bg-rose-950/40 border-rose-200/80 dark:border-rose-800/60 hover:border-rose-300 dark:hover:border-rose-700'
                        : 'bg-white dark:bg-[#151C28] border-gray-200/80 dark:border-gray-800 hover:border-primary/40 dark:hover:border-gray-700 hover:bg-gray-50/50 dark:hover:bg-[#1C2536]/60'
                    }`}
                  >
                    {/* Day Number Row - Center Aligned */}
                    <div className="relative flex items-center justify-center w-full">
                      {day.isToday ? (
                        <span className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-primary text-white text-xs sm:text-sm font-black shadow-xs flex items-center justify-center leading-none">
                          {toPersianDigits(day.day)}
                        </span>
                      ) : (
                        <span
                          className={`text-base sm:text-lg md:text-xl font-black leading-none text-center flex items-center justify-center ${
                            isHoliday
                              ? 'text-rose-600 dark:text-rose-400'
                              : 'text-ink-darker dark:text-gray-100 group-hover:text-primary dark:group-hover:text-primary-light transition-colors'
                          }`}
                        >
                          {toPersianDigits(day.day)}
                        </span>
                      )}

                      {/* Floating Badges */}
                      {day.isToday && (
                        <span className="hidden sm:inline absolute left-0 top-1/2 -translate-y-1/2 text-[9px] font-bold text-primary dark:text-primary-light bg-primary/10 dark:bg-primary/20 px-1.5 py-0.5 rounded-full">
                          امروز
                        </span>
                      )}
                      {isHoliday && !day.isToday && (
                        <span className="hidden sm:inline absolute left-0 top-1/2 -translate-y-1/2 text-[9px] font-bold text-rose-600 dark:text-rose-400 bg-rose-100/70 dark:bg-rose-950/60 px-1.5 py-0.5 rounded-full">
                          تعطیل
                        </span>
                      )}
                    </div>

                    {/* Middle: Desktop Event / Occasion Snippet */}
                    <div className="hidden sm:flex flex-col gap-0.5 my-auto overflow-hidden w-full">
                      {daySchoolEvents.slice(0, 1).map((ev) => (
                        <div
                          key={ev.id}
                          className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold truncate ${
                            ev.type === 'HOMEWORK' || ev.eventType === 'HOMEWORK'
                              ? 'bg-orange-100/90 text-orange-800 dark:bg-orange-950/70 dark:text-orange-300 border border-orange-200/70 dark:border-orange-800/60'
                              : ev.type === 'EXAM'
                              ? 'bg-amber-100/80 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/60'
                              : ev.type === 'MEETING'
                              ? 'bg-purple-100/80 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200/60 dark:border-purple-800/60'
                              : 'bg-primary/10 text-primary-darker dark:bg-primary/20 dark:text-primary-light border border-primary/20 dark:border-primary/40'
                          }`}
                          title={ev.title}
                        >
                          <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-current" />
                          <span className="truncate">{ev.title}</span>
                        </div>
                      ))}
                      {daySchoolEvents.length > 1 && (
                        <span className="text-[9px] font-bold text-primary dark:text-primary-light truncate px-0.5">
                          +{toPersianDigits(daySchoolEvents.length - 1)} دیگر
                        </span>
                      )}
                      {(day.holidayReason || tenantHoliday) && daySchoolEvents.length === 0 && (
                        <p
                          className="text-[10px] font-semibold text-rose-700 dark:text-rose-300 bg-rose-50/80 dark:bg-rose-950/60 px-1.5 py-0.5 rounded truncate border border-rose-200/50 dark:border-rose-800/60"
                          title={tenantHoliday?.titleFa || day.holidayReason}
                        >
                          {tenantHoliday?.titleFa || day.holidayReason}
                        </p>
                      )}
                    </div>

                    {/* Indicator Dots / Mobile summary (only rendered if indicators exist) */}
                    {hasIndicators && (
                      <div className="flex items-center justify-center gap-1 mt-auto pt-0.5 w-full">
                        {isHoliday && (
                          <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-rose-500 shrink-0 shadow-2xs" title="تعطیل" />
                        )}
                        {tenantHoliday && (
                          <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-rose-800 dark:bg-rose-400 shrink-0 shadow-2xs" title="تعطیلی اعلام‌شده" />
                        )}
                        {daySchoolEvents.map((ev) => (
                          <span
                            key={ev.id}
                            className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full shrink-0 shadow-2xs ${
                              ev.type === 'HOMEWORK' || ev.eventType === 'HOMEWORK'
                                ? 'bg-orange-500'
                                : ev.type === 'EXAM'
                                ? 'bg-amber-500'
                                : ev.type === 'MEETING'
                                ? 'bg-purple-500'
                                : 'bg-primary'
                            }`}
                            title={ev.title}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Selected Day Details Card (Responsive & matches platform design) */}
          {selectedDay && (
            <div
              ref={selectedDayCardRef}
              className="bg-white dark:bg-[#151C28] rounded-2xl border border-gray-200 dark:border-gray-800 p-3 sm:p-4 shadow-2xs space-y-3 animate-in fade-in duration-150 scroll-mt-6"
            >
              {/* Card Header (Responsive wrap on small screens) */}
              <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800 gap-2 sm:gap-3 flex-wrap sm:flex-nowrap">
                <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                  <div
                    className={`h-10 w-10 sm:h-11 sm:w-11 rounded-2xl flex flex-col items-center justify-center shrink-0 ${
                      selectedDay.isToday
                        ? 'bg-primary text-white font-black shadow-xs'
                        : selectedDay.isOfficialHoliday || Boolean(getDayTenantHoliday(selectedDay.jalaliStr))
                        ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 font-bold border border-rose-200/50 dark:border-rose-800/50'
                        : 'bg-gray-100 dark:bg-[#1C2536] text-ink-darker dark:text-gray-100 font-bold'
                    }`}
                  >
                    <span className="text-sm sm:text-base leading-none">{toPersianDigits(selectedDay.day)}</span>
                    <span className="text-[8px] sm:text-[9px] mt-0.5 leading-none opacity-80">
                      {currentMonthMeta.name}
                    </span>
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span
                        className={`text-xs sm:text-sm font-black truncate ${
                          selectedDay.isOfficialHoliday || Boolean(getDayTenantHoliday(selectedDay.jalaliStr))
                            ? 'text-rose-600 dark:text-rose-400'
                            : 'text-gray-800 dark:text-gray-200'
                        }`}
                      >
                        {selectedDay.dayOfWeekName}
                      </span>
                      {selectedDay.isToday && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-primary text-white font-bold">
                          امروز
                        </span>
                      )}
                      {(selectedDay.isOfficialHoliday || Boolean(getDayTenantHoliday(selectedDay.jalaliStr))) && !selectedDay.isToday && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 font-bold">
                          تعطیل
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-gray-400 dark:text-gray-400 font-mono block mt-0.5">
                      {selectedDay.gregorianStr}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 mr-auto sm:mr-0">
                  {canManageCalendar && (
                    <button
                      type="button"
                      onClick={() => handleOpenCreate(selectedDay.jalaliStr)}
                      className="min-h-[32px] sm:min-h-[36px] px-2.5 sm:px-3 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-primary/50 text-[11px] sm:text-xs font-bold text-gray-700 dark:text-gray-200 hover:text-primary transition-colors flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5 text-primary" />
                      <span>رویداد</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setSelectedDay(null)}
                    className="p-1.5 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#1C2536] transition-colors"
                    title="بستن"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Day Contents */}
              <div className="space-y-2">
                {/* School Declared Holiday */}
                {(() => {
                  const selectedTenantHoliday = getDayTenantHoliday(selectedDay.jalaliStr);
                  if (!selectedTenantHoliday) return null;
                  return (
                    <div className="p-2 sm:p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800/60 text-rose-800 dark:text-rose-200 text-xs flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <ShieldAlert className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 shrink-0" />
                        <strong className="font-bold shrink-0">تعطیلی مدرسه:</strong>
                        <span className="truncate">{selectedTenantHoliday.titleFa}</span>
                      </div>
                      {canManageCalendar && (
                        <button
                          type="button"
                          onClick={() => handleDeleteTenantHoliday(selectedTenantHoliday.id, selectedTenantHoliday.titleFa, selectedDay.jalaliStr)}
                          className="p-1 text-rose-600 hover:text-rose-800 hover:bg-rose-100 dark:hover:bg-rose-900/40 rounded-lg transition-colors shrink-0"
                          title="لغو تعطیلی"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  );
                })()}

                {/* Official Holiday Reason */}
                {selectedDay.holidayReason && selectedDay.holidayReason !== 'تعطیل هفتگی (جمعه)' && !getDayTenantHoliday(selectedDay.jalaliStr) && (
                  <div className="p-2 sm:p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800/60 text-rose-800 dark:text-rose-200 text-xs flex items-center gap-2">
                    <AlertCircle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 shrink-0" />
                    <strong className="font-bold shrink-0">تعطیل رسمی:</strong>
                    <span className="truncate">{selectedDay.holidayReason}</span>
                  </div>
                )}

                {/* Occasions List */}
                {selectedDay.occasions.filter((occ) => occ !== selectedDay.holidayReason && occ !== 'تعطیل هفتگی (جمعه)').length > 0 && (
                  <div className="text-[11px] text-gray-600 dark:text-gray-300 flex items-center gap-1.5 py-1 truncate">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span className="truncate">
                      {selectedDay.occasions.filter((occ) => occ !== selectedDay.holidayReason && occ !== 'تعطیل هفتگی (جمعه)').join(' • ')}
                    </span>
                  </div>
                )}

                {/* School Events & Homeworks */}
                {getDaySchoolEvents(selectedDay.jalaliStr).map((ev) => {
                  const isHomework = ev.type === 'HOMEWORK' || ev.eventType === 'HOMEWORK';
                  return (
                    <div
                      key={ev.id}
                      className={`p-2.5 sm:p-3 rounded-xl border text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-3 transition-colors ${
                        isHomework
                          ? 'bg-orange-50/70 dark:bg-orange-950/30 border-orange-200/80 dark:border-orange-900/50'
                          : 'bg-gray-50 dark:bg-[#1C2536]/80 border-gray-200/80 dark:border-gray-700/60'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0 w-full sm:w-auto flex-1">
                        <span
                          className={`w-2 h-2 rounded-full shrink-0 ${getTypeDotColor(ev.type || ev.eventType)}`}
                        />
                        <div className="min-w-0 flex-1">
                          <span className="font-bold text-ink-darker dark:text-gray-100 truncate block text-xs sm:text-[13px]">
                            {ev.title}
                          </span>
                          {isHomework ? (
                            (ev.lessonName || ev.location) && (
                              <span className="text-[10px] text-gray-500 dark:text-gray-400 truncate flex items-center gap-1 font-medium mt-0.5">
                                <BookOpen className="w-2.5 h-2.5 text-orange-500 shrink-0" />
                                <span className="truncate">{ev.lessonName || ev.location}</span>
                              </span>
                            )
                          ) : ev.location ? (
                            <span className="text-[10px] text-gray-400 dark:text-gray-400 truncate block mt-0.5">
                              {ev.location}
                            </span>
                          ) : null}
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-1.5 sm:gap-2 shrink-0 w-full sm:w-auto pt-1 sm:pt-0 border-t border-gray-200/50 dark:border-gray-800/60 sm:border-0">
                        {!isHomework && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/app/events/${ev.id}`);
                            }}
                            className="inline-flex items-center gap-1 text-[11px] sm:text-xs font-bold text-primary hover:text-primary-dark dark:hover:text-primary-light transition-colors cursor-pointer group/link hover:underline py-1 px-1.5"
                          >
                            <span>مشاهده</span>
                            <ChevronLeft className="w-3.5 h-3.5 transition-transform group-hover/link:-translate-x-0.5 shrink-0" />
                          </button>
                        )}
                        {isHomework ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const hwId = ev.homeworkId || ev.id.replace('hw-', '');
                              const targetUrl =
                                currentUser?.role === 'TEACHER'
                                  ? `/app/teacher/homework?homeworkId=${hwId}`
                                  : `/app/student/homework?homeworkId=${hwId}`;
                              navigate(targetUrl);
                            }}
                            className="text-[11px] h-7 px-2.5 rounded-lg border-orange-200 dark:border-orange-800/80 text-orange-700 dark:text-orange-300 hover:bg-orange-100/50 dark:hover:bg-orange-900/30 flex items-center gap-1 font-bold"
                          >
                            <span>تکلیف</span>
                            <ExternalLink className="w-3 h-3" />
                          </Button>
                        ) : canManageCalendar && (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(ev)}
                              className="p-1.5 text-gray-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                              title="ویرایش رویداد"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteEvent(ev.id, ev.title)}
                              className="p-1.5 text-gray-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
                              title="حذف رویداد"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {selectedDay.occasions.length === 0 &&
                  getDaySchoolEvents(selectedDay.jalaliStr).length === 0 &&
                  !getDayTenantHoliday(selectedDay.jalaliStr) &&
                  !selectedDay.isOfficialHoliday && (
                    <p className="text-xs text-gray-400 dark:text-gray-400 py-2 text-center">
                      رویدادی برای این روز ثبت نشده است.
                    </p>
                  )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 6. FLOATING ACTION BUTTON (FAB) FOR MOBILE ADMINS */}
      {canManageCalendar && (
        <div className="fixed bottom-6 left-5 z-40 md:hidden">
          <button
            type="button"
            onClick={() => handleOpenCreate(selectedDay?.jalaliStr)}
            className="h-12 w-12 rounded-2xl bg-primary text-white shadow-xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all"
            title="ثبت رویداد جدید"
          >
            <Plus className="w-6 h-6" />
          </button>
        </div>
      )}

      {/* MODAL: CREATE / EDIT EVENT */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => {
          setIsCreateOpen(false);
          setEditingEventId(null);
        }}
        title={editingEventId ? 'ویرایش رویداد' : 'رویداد جدید'}
        maxWidth="lg"
      >
        <form onSubmit={handleSaveEvent} className="space-y-3.5">
          {error && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-rose-950/40 text-red-700 dark:text-red-300 text-xs border border-red-200 dark:border-red-800">
              {error}
            </div>
          )}

          <Input
            label="عنوان رویداد"
            placeholder="عنوان رویداد..."
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            required
            className="min-h-[44px]"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Custom Modern Event Type Dropdown */}
            <div className="w-full text-right space-y-1.5 min-w-0" ref={typeDropdownRef}>
              <label className="block text-xs sm:text-[13px] font-bold text-ink-normal/80 dark:text-gray-300">
                نوع رویداد
              </label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsTypeDropdownOpen((prev) => !prev)}
                  className={`w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border transition-all flex items-center justify-between text-xs sm:text-sm font-medium ${
                    isTypeDropdownOpen
                      ? 'border-primary ring-2 ring-primary/20 bg-white dark:bg-[#1C2536]'
                      : 'border-gray-200 dark:border-gray-700 bg-[#FAFAFA] dark:bg-[#1C2536] hover:border-gray-300 dark:hover:border-gray-600 text-ink-normal dark:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${getTypeDotColor(form.type)}`} />
                    <span className="truncate font-medium text-ink-normal dark:text-white">
                      {eventTypes.find((t) => t.code === form.type)?.titleFa || form.type}
                    </span>
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 text-gray-400 dark:text-gray-400 transition-transform duration-200 shrink-0 ${
                      isTypeDropdownOpen ? 'rotate-180 text-primary' : ''
                    }`}
                  />
                </button>

                {/* Dropdown Options Popup - strictly bounded to container */}
                {isTypeDropdownOpen && (
                  <div className="absolute top-full mt-1.5 inset-x-0 z-50 rounded-xl bg-white dark:bg-[#1C2536] border border-gray-200 dark:border-gray-700 shadow-2xl p-1.5 space-y-1 max-h-56 overflow-y-auto animate-in fade-in zoom-in-95 duration-100 overscroll-contain">
                    {eventTypes.map((t) => {
                      const isSelected = t.code === form.type;
                      return (
                        <button
                          key={t.code}
                          type="button"
                          onClick={() => {
                            setForm((p) => ({ ...p, type: t.code }));
                            setIsTypeDropdownOpen(false);
                          }}
                          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs sm:text-sm text-right transition-colors ${
                            isSelected
                              ? 'bg-primary/10 dark:bg-primary/20 text-primary dark:text-primary-light font-bold'
                              : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#242F42]'
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate min-w-0">
                            <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${getTypeDotColor(t.code)}`} />
                            <span className="truncate">{t.titleFa}</span>
                          </div>
                          {isSelected && <Check className="w-4 h-4 text-primary shrink-0 mr-2" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <Input
              label="مکان برگزاری"
              placeholder="مکان برگزاری..."
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              className="min-h-[44px]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <PersianDatePicker
              label="تاریخ شروع"
              value={form.startDate}
              onChange={(d) => setForm({ ...form, startDate: d, endDate: form.endDate < d ? d : form.endDate })}
            />
            <Input
              label="ساعت شروع"
              type="time"
              value={form.startTime}
              onChange={(e) => setForm({ ...form, startTime: e.target.value })}
              required
              className="min-h-[44px]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <PersianDatePicker
              label="تاریخ پایان"
              value={form.endDate}
              onChange={(d) => setForm({ ...form, endDate: d })}
            />
            <Input
              label="ساعت پایان"
              type="time"
              value={form.endTime}
              onChange={(e) => setForm({ ...form, endTime: e.target.value })}
              required
              className="min-h-[44px]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-ink-dark dark:text-gray-300 mb-1">توضیحات</label>
            <textarea
              rows={2}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="توضیحات اختیاری..."
              className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#1C2536] p-2.5 text-xs text-ink-normal dark:text-gray-100 focus:ring-2 focus:ring-primary resize-none"
            />
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-800">
            <div>
              {editingEventId && canManageCalendar && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    const idToDelete = editingEventId;
                    const titleToDelete = form.title;
                    setIsCreateOpen(false);
                    setEditingEventId(null);
                    handleDeleteEvent(idToDelete, titleToDelete);
                  }}
                  className="min-h-[44px] px-3.5 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900/50 hover:bg-rose-50 dark:hover:bg-rose-950/30 flex items-center gap-1.5"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>حذف رویداد</span>
                </Button>
              )}
            </div>
            <div className="flex items-center space-x-2 space-x-reverse">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setIsCreateOpen(false);
                  setEditingEventId(null);
                }}
                className="min-h-[44px] px-4"
              >
                انصراف
              </Button>
              <Button
                type="submit"
                variant="primary"
                isLoading={isSubmitting}
                className="min-h-[44px] px-5"
              >
                {editingEventId ? 'ذخیره تغییرات' : 'ثبت رویداد'}
              </Button>
            </div>
          </div>
        </form>
      </Modal>

      {/* MODAL: DELETE CONFIRMATION */}
      <Modal
        isOpen={!!deleteConfirmEvent}
        onClose={() => setDeleteConfirmEvent(null)}
        title="حذف رویداد"
        maxWidth="sm"
      >
        <div className="space-y-4 text-right">
          <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
            آیا از حذف رویداد <span className="font-bold text-ink-darker dark:text-white">«{deleteConfirmEvent?.title}»</span> اطمینان دارید؟
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setDeleteConfirmEvent(null)}
              disabled={isDeleting}
            >
              انصراف
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={confirmDelete}
              isLoading={isDeleting}
              className="bg-rose-600 hover:bg-rose-700 text-white min-h-[40px] px-4"
            >
              حذف
            </Button>
          </div>
        </div>
      </Modal>

      {/* MODAL: MANAGE EVENT TYPES */}
      <Modal
        isOpen={isEventTypesModalOpen}
        onClose={() => setIsEventTypesModalOpen(false)}
        title="انواع رویدادها"
        maxWidth="lg"
      >
        <div className="space-y-4 text-right">
          {/* List of existing types */}
          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {eventTypes.map((type, index) => (
              <div
                key={type.code}
                className="flex items-center justify-between p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-[#1C2536]/50 gap-2"
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className={`w-3 h-3 rounded-full shrink-0 ${getTypeDotColor(type.code)}`} />
                  <input
                    type="text"
                    value={type.titleFa}
                    onChange={(e) => {
                      const updated = [...eventTypes];
                      updated[index] = { ...updated[index], titleFa: e.target.value };
                      setEventTypes(updated);
                    }}
                    className="text-xs font-bold bg-white dark:bg-[#1C2536] border border-gray-200 dark:border-gray-700 rounded-lg px-2.5 py-1.5 text-ink-darker dark:text-white flex-1 focus:ring-1 focus:ring-primary outline-none"
                    placeholder="عنوان نوع رویداد"
                  />
                  <span className="text-[10px] text-gray-400 font-mono shrink-0 hidden sm:inline">
                    ({type.code})
                  </span>
                </div>
                {!type.isDefault && (
                  <button
                    type="button"
                    onClick={() => {
                      setEventTypes(eventTypes.filter((_, idx) => idx !== index));
                    }}
                    className="p-1.5 text-gray-400 hover:text-rose-500 rounded-lg transition-colors shrink-0"
                    title="حذف این نوع"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Add New Type Section */}
          <div className="p-3.5 rounded-xl border border-dashed border-gray-300 dark:border-gray-700 bg-gray-50/40 dark:bg-[#1C2536]/30 space-y-3">
            <span className="text-xs font-bold text-ink-darker dark:text-white block">افزودن نوع جدید:</span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <input
                type="text"
                value={newTypeForm.titleFa}
                onChange={(e) => setNewTypeForm({ ...newTypeForm, titleFa: e.target.value })}
                placeholder="عنوان نوع رویداد..."
                className="text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1C2536] px-3 py-2 text-ink-darker dark:text-white outline-none focus:ring-1 focus:ring-primary min-h-[40px]"
              />
              <select
                value={newTypeForm.baseType}
                onChange={(e) => setNewTypeForm({ ...newTypeForm, baseType: e.target.value })}
                className="text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1C2536] px-3 py-2 text-ink-darker dark:text-white outline-none focus:ring-1 focus:ring-primary min-h-[40px]"
              >
                <option value="ACADEMIC">پایه: آموزشی</option>
                <option value="EXAM">پایه: آزمون</option>
                <option value="MEETING">پایه: جلسات</option>
                <option value="CULTURAL">پایه: فرهنگی</option>
                <option value="SPORTS">پایه: ورزشی</option>
                <option value="EXCURSION">پایه: اردو</option>
              </select>
              <select
                value={newTypeForm.color}
                onChange={(e) => setNewTypeForm({ ...newTypeForm, color: e.target.value })}
                className="text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1C2536] px-3 py-2 text-ink-darker dark:text-white outline-none focus:ring-1 focus:ring-primary min-h-[40px]"
              >
                <option value="emerald">رنگ: سبز زمردی</option>
                <option value="amber">رنگ: کهربایی / نارنجی</option>
                <option value="purple">رنگ: ارغوانی / بنفش</option>
                <option value="rose">رنگ: سرخابی / قرمز</option>
                <option value="blue">رنگ: آبی کاربنی</option>
                <option value="teal">رنگ: فیروزه‌ای</option>
              </select>
            </div>
            <div className="flex justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  if (!newTypeForm.titleFa.trim()) {
                    toast.error('لطفاً عنوان نوع رویداد را وارد نمایید.');
                    return;
                  }
                  const code = `CUSTOM_${Date.now()}`;
                  setEventTypes((prev) => [
                    ...prev,
                    {
                      code,
                      titleFa: newTypeForm.titleFa.trim(),
                      color: newTypeForm.color,
                      baseType: newTypeForm.baseType,
                      isDefault: false,
                    },
                  ]);
                  setNewTypeForm({ titleFa: '', color: 'emerald', baseType: 'ACADEMIC' });
                }}
                className="text-xs min-h-[38px] px-3.5"
              >
                <Plus className="w-3.5 h-3.5 ml-1" />
                <span>افزودن به لیست</span>
              </Button>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsEventTypesModalOpen(false)}
            >
              انصراف
            </Button>
            <Button
              type="submit"
              variant="primary"
              onClick={handleSaveEventTypes}
              isLoading={isSavingEventTypes}
              className="min-h-[44px] px-5"
            >
              ذخیره
            </Button>
          </div>
        </div>
      </Modal>

      {/* MODAL: DELETE HOLIDAY CONFIRMATION */}
      <Modal
        isOpen={!!deleteConfirmHoliday}
        onClose={() => setDeleteConfirmHoliday(null)}
        title="لغو تعطیلی مدرسه"
        maxWidth="sm"
      >
        <div className="space-y-4 text-right">
          <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
            آیا از لغو تعطیلی <span className="font-bold text-rose-600 dark:text-rose-400">«{deleteConfirmHoliday?.title}»</span>
            {deleteConfirmHoliday?.date ? ` در تاریخ ${toPersianDigits(deleteConfirmHoliday.date)}` : ''} اطمینان دارید؟
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setDeleteConfirmHoliday(null)}
              disabled={isDeletingHoliday}
            >
              انصراف
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={confirmDeleteHoliday}
              isLoading={isDeletingHoliday}
              className="bg-rose-600 hover:bg-rose-700 text-white min-h-[40px] px-4"
            >
              لغو تعطیلی
            </Button>
          </div>
        </div>
      </Modal>

      {/* MODAL: CREATE TENANT (EMERGENCY) HOLIDAY */}
      <Modal
        isOpen={isHolidayModalOpen}
        onClose={() => setIsHolidayModalOpen(false)}
        title="تعطیلی مدرسه"
        maxWidth="md"
      >
        <div className="space-y-4">
          <form onSubmit={handleCreateTenantHoliday} className="space-y-3.5">
            {error && (
              <div className="p-3 rounded-xl bg-red-50 dark:bg-rose-950/40 text-red-700 dark:text-red-300 text-xs border border-red-200 dark:border-red-800">
                {error}
              </div>
            )}

            <PersianDatePicker
              label="تاریخ"
              value={holidayForm.date}
              onChange={(d) => setHolidayForm({ ...holidayForm, date: d })}
            />

            <Input
              label="علت تعطیلی"
              placeholder="علت تعطیلی..."
              value={holidayForm.titleFa}
              onChange={(e) => setHolidayForm({ ...holidayForm, titleFa: e.target.value })}
              required
              className="min-h-[44px]"
            />

            <div className="flex justify-end space-x-2 space-x-reverse pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsHolidayModalOpen(false)}
                className="min-h-[44px] px-4"
              >
                انصراف
              </Button>
              <Button
                type="submit"
                variant="primary"
                isLoading={isSubmitting}
                className="bg-rose-600 hover:bg-rose-700 min-h-[44px] px-5"
              >
                ثبت تعطیلی
              </Button>
            </div>
          </form>

          {/* List of currently registered school holidays */}
          {tenantHolidays.length > 0 && (
            <div className="pt-3 border-t border-gray-100 dark:border-gray-800 space-y-2">
              <span className="text-xs font-bold text-ink-darker dark:text-gray-200 block">
                تعطیلی‌های ثبت‌شده:
              </span>
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-0.5">
                {tenantHolidays.map((th) => {
                  const jalaliDateStr = th.jalaliInfo?.formatted || (th.date ? gregorianToJalaliStr(th.date) : '');
                  return (
                    <div
                      key={th.id}
                      className="p-2.5 rounded-xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200/70 dark:border-rose-900/50 flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-rose-800 dark:text-rose-200 block truncate">
                          {th.titleFa}
                        </span>
                        {jalaliDateStr && (
                          <span className="text-[10px] text-rose-600/80 dark:text-rose-400 font-mono block mt-0.5">
                            {toPersianDigits(jalaliDateStr)}
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteTenantHoliday(th.id, th.titleFa, jalaliDateStr)}
                        className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-100 dark:hover:bg-rose-900/50 rounded-lg transition-colors shrink-0"
                        title="حذف این تعطیلی"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};
