import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { apiClient } from '../../../lib/api/client';
import { useAuthStore } from '../../../lib/auth/auth-store';
import { Button } from '../../../components/ui/Button';
import { Modal } from '../../../components/ui/Modal';
import { PersianDatePicker } from '../../../components/ui/PersianDatePicker';
import {
  gregorianToJalaliStr,
  jalaliToGregorianDate,
  formatJalaliDisplay,
  toPersianDigits,
} from '../../../utils/jalali';
import { toast } from '../../../components/ui/toast/toast';
import { useUndoableMutation } from '../../../lib/hooks/useUndoableMutation';
import { TOAST_MESSAGES } from '../../../constants/toast-messages';
import {
  CalendarDays,
  Clock,
  MapPin,
  Users,
  Sparkles,
  ChevronRight,
  Share2,
  CalendarPlus,
  Trash2,
  Edit3,
  AlertCircle,
  Tag,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Building2,
  CalendarCheck,
  Flame,
  BookOpen,
  PartyPopper,
  Trophy,
  Compass,
  Rocket,
  Upload,
  X,
  Workflow,
  Lightbulb,
  Star,
  Layers,
  FileSpreadsheet,
  Paperclip,
  FileText,
  Download,
  ExternalLink,
  Image as ImageIcon,
} from 'lucide-react';
import { SchoolEventItem, EventCategoryItem, hydrateEvent, displayTags } from './constants/sample-events';
import {
  EventCoverCropModal,
  EVENT_COVER_SPEC_LABEL,
  EVENT_COVER_MAX_BYTES,
  needsCoverCrop,
  uploadCoverBlob,
} from './components/EventCoverCropModal';
import {
  canViewEventAudience,
  isEventManagerRole,
  isServerRejection,
  extractApiErrorMessage,
} from './constants/event-access';
import {
  normalizeWorkflowModules,
  renumberWorkflowModules,
  WorkflowModuleEntry,
  EVENT_MODULE_LIST,
  DEFAULT_WORKFLOW_MODULES,
} from './constants/event-modules';
import { EventStepWizard } from './components/EventStepWizard';

const EVENT_CATEGORIES: Record<string, { label: string; icon: any; color: string; badgeClass: string }> = {
  STARTUP_WEEKEND: {
    label: 'رویداد استارتاپی',
    icon: Rocket,
    color: 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800',
    badgeClass: 'bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700',
  },
  ACADEMIC: {
    label: 'کارگاه آموزشی',
    icon: BookOpen,
    color: 'bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800',
    badgeClass: 'bg-blue-50 dark:bg-blue-950/50 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800',
  },
  CULTURAL: {
    label: 'فرهنگی و هنری',
    icon: PartyPopper,
    color: 'bg-purple-50 text-purple-800 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800',
    badgeClass: 'bg-purple-50 dark:bg-purple-950/50 text-purple-800 dark:text-purple-300 border-purple-200 dark:border-purple-800',
  },
  ENTERTAINMENT: {
    label: 'بازی و سرگرمی',
    icon: Sparkles,
    color: 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800',
    badgeClass: 'bg-rose-50 dark:bg-rose-950/50 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800',
  },
  EXCURSION: {
    label: 'اردو و بازدید',
    icon: Compass,
    color: 'bg-cyan-50 text-cyan-800 border-cyan-200 dark:bg-cyan-950/60 dark:text-cyan-300 dark:border-cyan-800',
    badgeClass: 'bg-cyan-50 dark:bg-cyan-950/50 text-cyan-800 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800',
  },
  SPORTS: {
    label: 'ورزشی',
    icon: Trophy,
    color: 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800',
    badgeClass: 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
  },
  MEETING: {
    label: 'جلسه و همایش',
    icon: Users,
    color: 'bg-indigo-50 text-indigo-800 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800',
    badgeClass: 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-800 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
  },
};

const getEventStatus = (startDate: string, endDate: string) => {
  const now = new Date().getTime();
  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();

  if (now < start) {
    return {
      key: 'UPCOMING',
      label: 'پیش‌رو',
      dotColor: 'bg-cyan-500',
      badgeClass: 'bg-cyan-50 text-cyan-800 dark:bg-cyan-950/60 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800',
    };
  } else if (now >= start && now <= end) {
    return {
      key: 'LIVE',
      label: 'در حال برگزاری',
      dotColor: 'bg-rose-500 animate-pulse',
      badgeClass: 'bg-rose-50 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-300 dark:border-rose-800 shadow-sm animate-pulse',
    };
  } else {
    return {
      key: 'COMPLETED',
      label: 'برگزار شده',
      dotColor: 'bg-slate-400',
      badgeClass: 'bg-slate-100 text-slate-600 dark:bg-slate-800/80 dark:text-slate-400 border-slate-200 dark:border-slate-700',
    };
  }
};

const calculateTimeLeft = (startDate?: string, endDate?: string) => {
  if (!startDate) {
    return { status: 'passed' as const, days: 0, hours: 0, minutes: 0, seconds: 0 };
  }
  const now = Date.now();
  const start = new Date(startDate).getTime();
  const end = endDate ? new Date(endDate).getTime() : start;

  if (isNaN(start) || now >= start) {
    return {
      status: (!isNaN(end) && now <= end) ? ('live' as const) : ('passed' as const),
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
    };
  }

  const diff = start - now;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);
  return { status: 'upcoming' as const, days, hours, minutes, seconds };
};

const AUDIENCE_MAP: Record<string, string> = {
  ALL: 'عمومی',
  STUDENTS: 'ویژه دانش آموزان',
  PARENTS: 'ویژه والدین',
  TEACHERS: 'ویژه مربیان',
};

export const EventSinglePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const currentUser = useAuthStore((s) => s.user);
  const canManageEvents = isEventManagerRole(currentUser?.role);

  const [event, setEvent] = useState<SchoolEventItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [activeMainTab, setActiveMainTab] = useState<'WORKFLOW' | 'OVERVIEW'>('OVERVIEW');
  const [customCategories, setCustomCategories] = useState<EventCategoryItem[]>([]);
  const [categoriesLoaded, setCategoriesLoaded] = useState(false);

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [workflowModulesState, setWorkflowModulesState] = useState<WorkflowModuleEntry[]>([]);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const coverFileInputRef = useRef<HTMLInputElement | null>(null);
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const [cropFileName, setCropFileName] = useState<string | undefined>(undefined);

  const uploadCoverBlobDirect = async (file: File) => {
    setIsUploadingCover(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('moduleName', 'calendar');
      let coverUrl = '';
      try {
        const uploadRes = await apiClient.post('/storage/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        const uploadData = uploadRes.data?.data || uploadRes.data;
        coverUrl = uploadData?.fileUrl || uploadData?.url || '';
      } catch {
        coverUrl = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
      }
      if (coverUrl) {
        setForm((f) => ({ ...f, coverUrl }));
        toast.success('عکس بنر رویداد آپلود شد');
      }
    } catch {
      toast.error('خطا در آپلود عکس بنر');
    } finally {
      setIsUploadingCover(false);
      if (coverFileInputRef.current) coverFileInputRef.current.value = '';
    }
  };

  const handleCoverFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('فقط فایل تصویری انتخاب کنید');
      if (coverFileInputRef.current) coverFileInputRef.current.value = '';
      return;
    }
    if (file.size > EVENT_COVER_MAX_BYTES) {
      toast.error('حداکثر حجم عکس ۵ مگابایت است');
      if (coverFileInputRef.current) coverFileInputRef.current.value = '';
      return;
    }
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('read fail'));
        reader.readAsDataURL(file);
      });
      const dims = await new Promise<{ w: number; h: number }>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
        img.onerror = () => reject(new Error('img fail'));
        img.src = dataUrl;
      });
      if (needsCoverCrop(dims.w, dims.h)) {
        setCropImageSrc(dataUrl);
        setCropFileName(file.name);
        return;
      }
      await uploadCoverBlobDirect(file);
    } catch {
      toast.error('خطا در خواندن فایل تصویری');
      if (coverFileInputRef.current) coverFileInputRef.current.value = '';
    }
  };

  const handleCoverCropConfirm = async (blob: Blob) => {
    setIsUploadingCover(true);
    try {
      const coverUrl = await uploadCoverBlob(blob, cropFileName || 'event-cover.jpg');
      if (coverUrl) {
        setForm((f) => ({ ...f, coverUrl }));
        toast.success('عکس بنر بریده و آپلود شد');
      }
    } catch {
      toast.error('خطا در آپلود عکس بنر');
    } finally {
      setIsUploadingCover(false);
      setCropImageSrc(null);
      setCropFileName(undefined);
      if (coverFileInputRef.current) coverFileInputRef.current.value = '';
    }
  };

  const [form, setForm] = useState({
    title: '',
    description: '',
    eventType: 'ACADEMIC' as SchoolEventItem['eventType'],
    categoryKey: '',
    startDate: '',
    startTime: '08:30',
    endDate: '',
    endTime: '12:00',
    isAllDay: false,
    targetAudience: 'ALL' as SchoolEventItem['targetAudience'],
    location: '',
    coverUrl: '',
    tags: '',
  });

  // Countdown timer calculation
  const [timeLeft, setTimeLeft] = useState<{
    status: 'upcoming' | 'live' | 'passed';
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
  }>(() => calculateTimeLeft(event?.startDate, event?.endDate));

  const fetchEvent = async () => {
    if (!id) return;
    if (!event) setIsLoading(true);
    try {
      const res = await apiClient.get(`/calendar/events/${id}`);
      if (res && res.data) {
        const loaded = hydrateEvent(res.data);
        if (!canViewEventAudience(loaded.targetAudience, currentUser?.role)) {
          setEvent(null);
        } else {
          setEvent(loaded);
        }
        return;
      }
      setEvent(null);
    } catch (err) {
      setEvent(null);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await apiClient.get('/calendar/event-categories');
      if (Array.isArray(res?.data)) {
        setCustomCategories(res.data);
        setCategoriesLoaded(true);
      }
    } catch {}
  };

  useEffect(() => {
    setActiveMainTab('OVERVIEW');

    const scrollToTop = () => {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
      const mainContainer = document.querySelector('main');
      if (mainContainer) {
        mainContainer.scrollTop = 0;
      }
    };

    scrollToTop();
    const raf = requestAnimationFrame(scrollToTop);
    const timer = setTimeout(scrollToTop, 50);

    fetchEvent();
    fetchCategories();

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timer);
    };
  }, [id]);

  // Live countdown timer ticking
  useEffect(() => {
    if (!event?.startDate) return;

    // Run immediately to eliminate delay and flashing
    setTimeLeft(calculateTimeLeft(event.startDate, event.endDate));

    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft(event.startDate, event.endDate));
    }, 1000);

    return () => clearInterval(timer);
  }, [event?.startDate, event?.endDate]);



  // Undoable Delete Mutation with 5-second countdown
  // Deletes on server immediately, then provides 5s window to restore!
  const { execute: executeUndoableDelete } = useUndoableMutation<void>({
    undoLabel: TOAST_MESSAGES.operations.calendarEventDeleted(event?.title || ''),
    delayMs: 5000,
    optimisticUpdate: () => {
      try {
        const cached = localStorage.getItem('rokad_calendar_events');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed)) {
            const next = parsed.filter((e: any) => e.id !== id);
            localStorage.setItem('rokad_calendar_events', JSON.stringify(next));
          }
        }
      } catch {}
      navigate('/app/events');
    },
    mutationFn: async () => {
      if (id) {
        try {
          await apiClient.delete(`/calendar/events/${id}`);
        } catch {
          // Handled offline
        }
      }
    },
    undoFn: async () => {
      if (id && event) {
        try {
          const cached = localStorage.getItem('rokad_calendar_events');
          if (cached) {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed) && !parsed.some((e: any) => e.id === id)) {
              localStorage.setItem('rokad_calendar_events', JSON.stringify([event, ...parsed]));
            }
          }
        } catch {}
        try {
          await apiClient.patch(`/calendar/events/${id}/restore`);
        } catch {}
        navigate(`/app/events/${id}`);
      }
    },
    revertUpdate: () => {
      toast.info(`رویداد «${event?.title || ''}» بازگردانی شد.`);
    },
    onError: () => {
      // Offline fallback already updated locally
    },
  });

  // Delete event
  const handleDelete = () => {
    if (!id || !event) return;
    executeUndoableDelete();
  };

  // Open Edit Modal
  const handleOpenEdit = () => {
    if (!event) return;
    const sJalali = gregorianToJalaliStr(event.startDate);
    const eJalali = gregorianToJalaliStr(event.endDate);
    const sDate = new Date(event.startDate);
    const eDate = new Date(event.endDate);

    const sTime = `${String(sDate.getHours()).padStart(2, '0')}:${String(sDate.getMinutes()).padStart(2, '0')}`;
    const eTime = `${String(eDate.getHours()).padStart(2, '0')}:${String(eDate.getMinutes()).padStart(2, '0')}`;

    setForm({
      title: event.title,
      description: event.description || '',
      eventType: event.eventType,
      categoryKey: event.categoryKey || '',
      startDate: sJalali,
      startTime: sTime,
      endDate: eJalali || sJalali,
      endTime: eTime,
      isAllDay: event.isAllDay,
      targetAudience: event.targetAudience,
      location: event.location || '',
      coverUrl: event.coverUrl || '',
      tags: displayTags(event.tags).join('، '),
    });
    setWorkflowModulesState(
      Array.isArray(event.workflowModules)
        ? normalizeWorkflowModules(event.workflowModules)
        : event.eventType === 'STARTUP_WEEKEND'
        ? [...DEFAULT_WORKFLOW_MODULES]
        : []
    );
    setFormError(null);
    setIsEditModalOpen(true);
  };

  // Submit Edit Modal
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !form.title.trim()) {
      setFormError('عنوان رویداد الزامی است.');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    try {
      const sDateObj = jalaliToGregorianDate(form.startDate);
      const [sh, sm] = form.startTime.split(':').map(Number);
      sDateObj.setHours(sh || 8, sm || 0, 0, 0);

      const eDateObj = jalaliToGregorianDate(form.endDate);
      const [eh, em] = form.endTime.split(':').map(Number);
      eDateObj.setHours(eh || 12, em || 0, 0, 0);

      const tagsArray = form.tags
        ? form.tags.split(/[,،]+/).map((t) => t.trim()).filter(Boolean)
        : [];

      const patchPayload = {
        title: form.title.trim(),
        description: form.description.trim(),
        eventType: form.eventType,
        categoryKey: form.categoryKey || undefined,
        startDate: sDateObj.toISOString(),
        endDate: eDateObj.toISOString(),
        isAllDay: form.isAllDay,
        targetAudience: form.targetAudience,
        location: form.location.trim() || undefined,
        coverUrl: form.coverUrl.trim() || undefined,
        tags: tagsArray,
        workflowModules: renumberWorkflowModules(
          workflowModulesState.filter((m) => m.enabled !== false)
        ).map((m) => ({ key: m.key, step: m.step, enabled: true })),
      };

      try {
        await apiClient.patch(`/calendar/events/${id}`, patchPayload);
      } catch (err: any) {
        // Server rejected the update — surface the error instead of silently falling back
        if (isServerRejection(err)) throw err;
        // Network/offline — safe local fallback continues below
      }

      // Update local storage
      try {
        const cached = localStorage.getItem('rokad_calendar_events');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed)) {
            const next = parsed.map((item: any) =>
              item.id === id ? { ...item, ...patchPayload } : item
            );
            if (!next.some((item: any) => item.id === id)) {
              next.push({ id, ...patchPayload });
            }
            localStorage.setItem('rokad_calendar_events', JSON.stringify(next));
          }
        }
      } catch {}

      if (event) {
        setEvent({
          ...event,
          ...patchPayload,
          description: patchPayload.description,
          location: patchPayload.location,
          coverUrl: patchPayload.coverUrl,
          tags: tagsArray,
          workflowModules: patchPayload.workflowModules,
        });
      }

      setIsEditModalOpen(false);
      toast.success(TOAST_MESSAGES.operations.calendarEventUpdated(form.title));
    } catch (err: any) {
      setFormError(extractApiErrorMessage(err, 'خطا در ویرایش رویداد'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const workflowModules = useMemo(() => {
    if (!event) return [];
    if (Array.isArray(event.workflowModules)) {
      return normalizeWorkflowModules(event.workflowModules);
    }
    if (event.eventType === 'STARTUP_WEEKEND') {
      return [...DEFAULT_WORKFLOW_MODULES];
    }
    return [];
  }, [event]);

  const hasWorkflow = workflowModules.length > 0;

  const eventStatus = useMemo(() => {
    if (!event?.startDate || !event?.endDate) return null;
    return getEventStatus(event.startDate, event.endDate);
  }, [event?.startDate, event?.endDate]);

  const isEventEnded = useMemo(() => {
    if (!event?.endDate) return false;
    return new Date(event.endDate).getTime() < Date.now();
  }, [event?.endDate]);

  const attachmentsList = useMemo(() => {
    const list: Array<{
      id: string;
      name: string;
      size: string;
      url: string;
      type: 'image' | 'pdf' | 'doc' | 'archive' | 'other';
    }> = [];

    if (event?.coverUrl) {
      list.push({
        id: 'poster',
        name: `پوستر رسمی و باکیفیت رویداد`,
        size: 'فایل تصویری بنر',
        url: event.coverUrl,
        type: 'image',
      });
    }

    if (Array.isArray(event?.attachments) && event.attachments.length > 0) {
      event.attachments.forEach((att, idx) => {
        list.push({
          id: att.id || `att-${idx}`,
          name: att.name,
          size: att.size || 'فایل ضمیمه',
          url: att.url,
          type: att.type || 'pdf',
        });
      });
    }

    return list;
  }, [event?.coverUrl, event?.attachments]);

  if (isLoading) {
    return (
      <div className="py-24 text-center">
        <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-zinc-900 border-t-transparent dark:border-zinc-100" />
        <p className="mt-4 text-sm font-black text-zinc-600 dark:text-zinc-400">در حال بارگذاری اطلاعات رویداد...</p>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="rounded-2xl border-[1.5px] border-[#EAEAEA] bg-white p-8 sm:p-12 text-center shadow-[2.75px_2.75px_0_#202A5A] dark:border-[#242F42] dark:bg-[#151C28] dark:shadow-[2.75px_2.75px_0_#59BBAF]">
        <AlertCircle className="mx-auto w-12 h-12 text-red-500 mb-3" />
        <h2 className="text-xl font-black text-zinc-900 dark:text-zinc-100">رویداد مورد نظر یافت نشد</h2>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">ممکن است این رویداد حذف شده باشد، برای شما قابل مشاهده نباشد یا به تننت دیگری تعلق داشته باشد.</p>
        <Link to="/app/events">
          <Button variant="primary" className="mt-6 gap-2">
            <ArrowRight className="w-4 h-4" />
            بازگشت به رودمپ سالانه
          </Button>
        </Link>
      </div>
    );
  }

  const categoryMeta =
    EVENT_CATEGORIES[event.eventType] ||
    (event.categoryKey && EVENT_CATEGORIES[event.categoryKey]) ||
    EVENT_CATEGORIES.STARTUP_WEEKEND;
  const CategoryIcon = categoryMeta.icon;
  const jalaliStart = formatJalaliDisplay(event.startDate, true);
  const jalaliEnd = formatJalaliDisplay(event.endDate, true);
  const startTimeStr = new Date(event.startDate).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });
  const endTimeStr = new Date(event.endDate).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="space-y-6 pb-16">
      {/* 1. Navigation Breadcrumb & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-[#151C28] p-4 sm:p-5 rounded-2xl border border-gray-200/80 dark:border-gray-800 shadow-sm">
        <Link
          to="/app/events"
          className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-gray-600 hover:text-primary dark:text-gray-300 dark:hover:text-primary transition-colors cursor-pointer"
        >
          <ArrowRight className="w-4 h-4 shrink-0" />
          <span>بازگشت به رویدادها</span>
        </Link>

        {/* Quick Admin Actions */}
        {canManageEvents && (
          <div className="flex items-center gap-2">
            <Button
              onClick={handleOpenEdit}
              variant="outline"
              className="rokad-btn-outline h-10 px-4 rounded-xl gap-2 text-xs font-bold"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>ویرایش مشخصات</span>
            </Button>
            <Button
              onClick={handleDelete}
              variant="destructive"
              className="h-10 px-4 rounded-xl gap-1.5 text-xs font-bold bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-900 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>حذف رویداد</span>
            </Button>
          </div>
        )}
      </div>

      {/* Event Inactivity / Ended Notice Banner */}
      {isEventEnded && (
        <div className="p-4 sm:p-5 rounded-2xl border-2 border-amber-400 bg-amber-50/95 dark:bg-amber-950/50 text-amber-950 dark:text-amber-200 shadow-sm flex items-start gap-3.5 animate-in fade-in duration-300">
          <div className="w-9 h-9 rounded-xl bg-amber-400 text-amber-950 flex items-center justify-center shrink-0 mt-0.5 shadow-2xs font-bold">
            <Clock className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div className="space-y-1 min-w-0">
            <h3 className="text-sm sm:text-base font-black text-amber-950 dark:text-amber-100">
              زمان این رویداد به پایان رسیده است
            </h3>
            <p className="text-xs sm:text-sm font-medium text-amber-800/90 dark:text-amber-300/90 leading-relaxed">
              مهلت برگزاری و مشارکت در این رویداد در تاریخ {jalaliEnd} به اتمام رسیده است. کلیه ماژول‌ها و گام‌های رویداد در حالت آرشیو و فقط خواندنی (Read-Only) قرار گرفته و امکان ثبت ایده، رأی‌گیری یا ایجاد تغییرات جدید وجود ندارد.
            </p>
          </div>
        </div>
      )}

      {/* 2. Hero Card with Cover Image */}
      <div className="overflow-hidden rounded-2xl border-[1.5px] border-primary-dark/30 dark:border-gray-800 bg-white dark:bg-[#151C28] shadow-[2px_2px_0_#59BBAF] dark:shadow-[2px_2px_0_#0B0F17]">
        {event.coverUrl ? (
          <div className="relative h-60 sm:h-80 w-full overflow-hidden bg-gray-900">
            <img
              src={event.coverUrl}
              alt={event.title}
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent" />
          </div>
        ) : (
          <div className="relative h-44 sm:h-56 w-full bg-gradient-to-br from-primary/20 via-slate-900 to-indigo-950 p-8 flex items-center justify-center border-b border-gray-100 dark:border-gray-800">
            <div className="w-20 h-20 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white/80 shadow-inner">
              <CategoryIcon className="w-10 h-10 text-primary-light dark:text-primary" />
            </div>
          </div>
        )}

        {/* Hero Content Body */}
        <div className="p-5 sm:p-7 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              {/* Status badge */}
              {eventStatus && (
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${eventStatus.badgeClass}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${eventStatus.dotColor}`} />
                  <span>{eventStatus.label}</span>
                </span>
              )}

              {/* Category badge */}
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${categoryMeta.badgeClass}`}
              >
                <CategoryIcon className="w-3 h-3" />
                <span>{categoryMeta.label}</span>
              </span>

              {/* Target Audience Badge */}
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-gray-500 dark:text-gray-400">
                <Users className="w-3 h-3 text-gray-400" />
                <span>{AUDIENCE_MAP[event.targetAudience] || event.targetAudience}</span>
              </span>
            </div>
          </div>

          <h1 className="text-xl sm:text-3xl font-black text-ink-darker dark:text-white leading-relaxed sm:leading-loose">
            {event.title}
          </h1>

          {/* Countdown Widget (Full Line with 4 evenly distributed boxes - only if event is upcoming) */}
          {event && new Date(event.startDate).getTime() > Date.now() && timeLeft.status === 'upcoming' && (
            <div className="w-full rounded-2xl border border-primary/20 bg-gray-50/70 dark:bg-[#1C2536]/50 p-3.5 sm:p-4 space-y-2.5 shadow-2xs">
              <div className="flex items-center justify-between gap-2 px-0.5">
                <div className="flex items-center gap-2 text-xs sm:text-[13px] font-bold text-primary">
                  <Clock className="w-4 h-4 animate-pulse" />
                  <span>زمان باقی‌مانده تا شروع رویداد:</span>
                </div>
                <span className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 hidden sm:inline">
                  شمارش معکوس زنده
                </span>
              </div>

              {/* 4 Boxes filling the entire width (Left-to-Right: Days -> Hours -> Minutes -> Seconds) */}
              <div className="grid grid-cols-4 gap-2 sm:gap-3 w-full text-center" dir="ltr">
                <div className="flex flex-col items-center justify-center py-2 sm:py-2.5 px-1 rounded-xl bg-white dark:bg-[#151C28] border border-primary/30 dark:border-primary/25 shadow-2xs">
                  <span className="text-xl sm:text-2xl font-black text-primary font-mono leading-tight">
                    {toPersianDigits(timeLeft.days)}
                  </span>
                  <span className="text-[10px] sm:text-[11px] font-bold text-gray-500 dark:text-gray-400 mt-0.5">روز</span>
                </div>

                <div className="flex flex-col items-center justify-center py-2 sm:py-2.5 px-1 rounded-xl bg-white dark:bg-[#151C28] border border-gray-200/80 dark:border-gray-700/80 shadow-2xs">
                  <span className="text-xl sm:text-2xl font-black text-ink-darker dark:text-white font-mono leading-tight">
                    {toPersianDigits(timeLeft.hours)}
                  </span>
                  <span className="text-[10px] sm:text-[11px] font-bold text-gray-500 dark:text-gray-400 mt-0.5">ساعت</span>
                </div>

                <div className="flex flex-col items-center justify-center py-2 sm:py-2.5 px-1 rounded-xl bg-white dark:bg-[#151C28] border border-gray-200/80 dark:border-gray-700/80 shadow-2xs">
                  <span className="text-xl sm:text-2xl font-black text-ink-darker dark:text-white font-mono leading-tight">
                    {toPersianDigits(timeLeft.minutes)}
                  </span>
                  <span className="text-[10px] sm:text-[11px] font-bold text-gray-500 dark:text-gray-400 mt-0.5">دقیقه</span>
                </div>

                <div className="flex flex-col items-center justify-center py-2 sm:py-2.5 px-1 rounded-xl bg-white dark:bg-[#151C28] border border-rose-200 dark:border-rose-900/60 shadow-2xs">
                  <span className="text-xl sm:text-2xl font-black text-rose-600 dark:text-rose-400 font-mono leading-tight">
                    {toPersianDigits(timeLeft.seconds)}
                  </span>
                  <span className="text-[10px] sm:text-[11px] font-bold text-rose-500/80 dark:text-rose-400 mt-0.5">ثانیه</span>
                </div>
              </div>
            </div>
          )}

          {/* Main Tabs Navigation (Inside the Hero Box, 2 inline options: right = اطلاعات رویداد, left = مراحل رویداد) */}
          {hasWorkflow && (
            <div className="p-1 rounded-xl bg-gray-100 dark:bg-[#1C2536] border border-gray-200/70 dark:border-gray-700/70 flex flex-row gap-1 shadow-2xs w-full">
              <button
                type="button"
                onClick={() => setActiveMainTab('OVERVIEW')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                  activeMainTab === 'OVERVIEW'
                    ? 'bg-white dark:bg-[#151C28] text-primary shadow-sm border border-primary/20 dark:border-gray-700'
                    : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
                }`}
              >
                <CalendarDays className="w-4 h-4 text-primary shrink-0" />
                <span>اطلاعات رویداد</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveMainTab('WORKFLOW')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                  activeMainTab === 'WORKFLOW'
                    ? 'bg-white dark:bg-[#151C28] text-primary shadow-sm border border-primary/20 dark:border-gray-700'
                    : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
                }`}
              >
                <Workflow className="w-4 h-4 text-primary shrink-0" />
                <span>مراحل رویداد</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 4. Render Active Tab Content */}
      {hasWorkflow && activeMainTab === 'WORKFLOW' ? (
        <EventStepWizard
          eventId={event.id}
          eventTitle={event.title}
          workflowModules={workflowModules}
          isEventEnded={isEventEnded}
        />
      ) : (
        <div className="space-y-6">
          {/* Information Cards Grid: 2 Lines Layout */}
          <div className="grid grid-cols-2 gap-2.5 sm:gap-4">
            {/* Line 1 - Start Date */}
            <div className="rounded-2xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-[#151C28] p-3.5 sm:p-5 shadow-xs transition-all hover:border-gray-300 dark:hover:border-gray-700 flex flex-col justify-between">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-900 flex items-center justify-center shrink-0">
                  <CalendarDays className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div className="min-w-0">
                  <span className="text-[11px] sm:text-xs font-bold text-gray-500 dark:text-gray-400 block truncate">زمان آغاز</span>
                  <p className="text-xs sm:text-base font-black text-ink-darker dark:text-white mt-0.5 truncate">
                    {jalaliStart}
                  </p>
                </div>
              </div>
              <div className="mt-3 pt-2.5 border-t border-gray-100 dark:border-gray-800/80 flex items-center justify-between text-xs">
                <span className="text-gray-500 dark:text-gray-400 font-bold flex items-center gap-1.5 text-[11px] sm:text-xs">
                  <Clock className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                  <span>ساعت شروع:</span>
                </span>
                <span className="font-mono font-black text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 border border-blue-200/60 dark:border-blue-900/60 px-2 py-0.5 rounded-lg text-xs">
                  {startTimeStr}
                </span>
              </div>
            </div>

            {/* Line 1 - End Date */}
            <div className="rounded-2xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-[#151C28] p-3.5 sm:p-5 shadow-xs transition-all hover:border-gray-300 dark:hover:border-gray-700 flex flex-col justify-between">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 border border-purple-200/60 dark:border-purple-900 flex items-center justify-center shrink-0">
                  <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div className="min-w-0">
                  <span className="text-[11px] sm:text-xs font-bold text-gray-500 dark:text-gray-400 block truncate">زمان پایان</span>
                  <p className="text-xs sm:text-base font-black text-ink-darker dark:text-white mt-0.5 truncate">
                    {jalaliEnd}
                  </p>
                </div>
              </div>
              <div className="mt-3 pt-2.5 border-t border-gray-100 dark:border-gray-800/80 flex items-center justify-between text-xs">
                <span className="text-gray-500 dark:text-gray-400 font-bold flex items-center gap-1.5 text-[11px] sm:text-xs">
                  <Clock className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                  <span>ساعت پایان:</span>
                </span>
                <span className="font-mono font-black text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/60 border border-purple-200/60 dark:border-purple-900/60 px-2 py-0.5 rounded-lg text-xs">
                  {endTimeStr}
                </span>
              </div>
            </div>

            {/* Line 2 - Location (Full Width across 2 columns) */}
            <div className="col-span-2 rounded-2xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-[#151C28] p-4 sm:p-5 shadow-xs transition-all hover:border-gray-300 dark:hover:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200/60 dark:border-rose-900 flex items-center justify-center shrink-0">
                  <MapPin className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-xs font-bold text-gray-500 dark:text-gray-400 block">محل برگزاری</span>
                  <p className="text-sm sm:text-base font-black text-ink-darker dark:text-white mt-0.5 truncate">
                    {event.location || 'سالن اصلی مدرسه'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Description & Full Details Card */}
          <div className="rounded-2xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-[#151C28] p-6 sm:p-8 shadow-xs space-y-6">
            <div>
              <h2 className="text-base sm:text-lg font-black text-ink-darker dark:text-white mb-3 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                <span>توضیحات رویداد</span>
              </h2>
              <div className="text-gray-700 dark:text-gray-200 leading-relaxed sm:leading-loose font-medium whitespace-pre-line text-sm sm:text-base">
                {event.description || 'توضیحات تکمیلی برای این رویداد ثبت نشده است.'}
              </div>
            </div>

            {/* Tags */}
            {event.tags && event.tags.length > 0 && (
              <div className="pt-6 border-t border-gray-100 dark:border-gray-800/80">
                <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-3 flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-primary" />
                  <span>کلیدواژه‌ها و برچسب‌های مرتبط:</span>
                </h4>
                <div className="flex flex-wrap items-center gap-2">
                  {displayTags(event.tags).map((tag, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1 rounded-xl text-xs font-bold border border-primary/20 bg-primary/5 text-primary dark:bg-primary/10"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Attached Files Card (فایل‌های پیوست) */}
          <div className="rounded-2xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-[#151C28] p-6 sm:p-8 shadow-xs space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-base sm:text-lg font-black text-ink-darker dark:text-white flex items-center gap-2">
                <Paperclip className="w-5 h-5 text-primary" />
                <span>فایل‌های پیوست</span>
              </h2>
              {attachmentsList.length > 0 && (
                <span className="text-xs font-bold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2.5 py-1 rounded-full">
                  {toPersianDigits(attachmentsList.length)} فایل
                </span>
              )}
            </div>

            {attachmentsList.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {attachmentsList.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center justify-between gap-3 p-3.5 rounded-xl border border-gray-200/80 dark:border-gray-800 bg-gray-50/70 dark:bg-[#1C2536]/50 hover:border-primary/40 dark:hover:border-primary/40 transition-all"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0">
                        {file.type === 'image' ? (
                          <ImageIcon className="w-5 h-5" />
                        ) : (
                          <FileText className="w-5 h-5" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs sm:text-sm font-bold text-ink-darker dark:text-white truncate">
                          {file.name}
                        </p>
                        <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400 block mt-0.5">
                          {file.size}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {file.url && file.url !== '#' ? (
                        <>
                          <a
                            href={file.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 rounded-lg text-gray-500 hover:text-primary hover:bg-white dark:hover:bg-[#1C2536] transition-colors"
                            title="مشاهده"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                          <a
                            href={file.url}
                            download
                            className="p-2 rounded-lg text-gray-500 hover:text-primary hover:bg-white dark:hover:bg-[#1C2536] transition-colors"
                            title="دانلود فایل"
                          >
                            <Download className="w-4 h-4" />
                          </a>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => toast.info('این فایل نمونه است و در نسخه جاری ذخیره شده است.')}
                          className="p-2 rounded-lg text-gray-500 hover:text-primary hover:bg-white dark:hover:bg-[#1C2536] transition-colors"
                          title="دانلود فایل"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 rounded-xl border border-dashed border-gray-200 dark:border-gray-800 text-center">
                <div className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-gray-800/80 text-gray-400 flex items-center justify-center mx-auto mb-3">
                  <Paperclip className="w-6 h-6" />
                </div>
                <p className="text-xs sm:text-sm font-bold text-gray-600 dark:text-gray-400">
                  فایل پیوستی برای این رویداد ضمیمه نشده است
                </p>
                <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">
                  پوسترها، شیوه‌نامه‌ها و مستندات تکمیلی رویداد پس از بارگذاری در این قسمت نمایش داده می‌شوند.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= EDIT MODAL (SYNCED WITH NEW EVENT MODAL) ================= */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="ویرایش مشخصات رویداد"
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          {formError && (
            <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-bold text-red-700 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900/50">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* Title */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300">
              عنوان رویداد <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="مثال: نمایشگاه پروژه‌های دانش‌آموزی و هوش مصنوعی"
              className="w-full min-h-[42px] px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/70 dark:bg-[#1C2536] text-ink-darker dark:text-white text-xs sm:text-sm font-bold focus:border-primary focus:bg-white dark:focus:bg-[#1C2536] focus:outline-none transition-all"
            />
          </div>

          {/* Category & Target Audience */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300">
                دسته‌بندی موضوعی
              </label>
              <select
                value={form.eventType}
                onChange={(e) => setForm({ ...form, eventType: e.target.value as any, categoryKey: '' })}
                className="w-full min-h-[42px] px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/70 dark:bg-[#1C2536] text-xs sm:text-sm font-bold text-ink-darker dark:text-white focus:border-primary focus:outline-none"
              >
                <option className="bg-white dark:bg-[#151C28] text-ink-darker dark:text-white" value="STARTUP_WEEKEND">رویداد استارتاپی</option>
                <option className="bg-white dark:bg-[#151C28] text-ink-darker dark:text-white" value="ACADEMIC">کارگاه آموزشی</option>
                <option className="bg-white dark:bg-[#151C28] text-ink-darker dark:text-white" value="CULTURAL">فرهنگی و هنری</option>
                <option className="bg-white dark:bg-[#151C28] text-ink-darker dark:text-white" value="ENTERTAINMENT">بازی و سرگرمی</option>
                <option className="bg-white dark:bg-[#151C28] text-ink-darker dark:text-white" value="EXCURSION">اردو و بازدید</option>
                <option className="bg-white dark:bg-[#151C28] text-ink-darker dark:text-white" value="SPORTS">ورزشی</option>
                <option className="bg-white dark:bg-[#151C28] text-ink-darker dark:text-white" value="MEETING">جلسه و همایش</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300">
                مخاطبین هدف
              </label>
              <select
                value={form.targetAudience}
                onChange={(e) => setForm({ ...form, targetAudience: e.target.value as any })}
                className="w-full min-h-[42px] px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/70 dark:bg-[#1C2536] text-xs sm:text-sm font-bold text-ink-darker dark:text-white focus:border-primary focus:outline-none"
              >
                <option className="bg-white dark:bg-[#151C28] text-ink-darker dark:text-white" value="ALL">عمومی</option>
                <option className="bg-white dark:bg-[#151C28] text-ink-darker dark:text-white" value="STUDENTS">ویژه دانش آموزان</option>
                <option className="bg-white dark:bg-[#151C28] text-ink-darker dark:text-white" value="PARENTS">ویژه والدین</option>
                <option className="bg-white dark:bg-[#151C28] text-ink-darker dark:text-white" value="TEACHERS">ویژه مربیان</option>
              </select>
            </div>
          </div>

          {/* Dates & Times */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300">
                تاریخ شروع (شمسی) <span className="text-red-500">*</span>
              </label>
              <PersianDatePicker
                value={form.startDate}
                onChange={(d) => setForm({ ...form, startDate: d })}
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300">
                ساعت شروع
              </label>
              <input
                type="time"
                value={form.startTime}
                onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                className="w-full min-h-[42px] px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/70 dark:bg-[#1C2536] text-xs sm:text-sm font-bold text-ink-darker dark:text-white focus:border-primary focus:bg-white dark:focus:bg-[#1C2536] focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300">
                تاریخ پایان (شمسی)
              </label>
              <PersianDatePicker
                value={form.endDate}
                onChange={(d) => setForm({ ...form, endDate: d })}
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300">
                ساعت پایان
              </label>
              <input
                type="time"
                value={form.endTime}
                onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                className="w-full min-h-[42px] px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/70 dark:bg-[#1C2536] text-xs sm:text-sm font-bold text-ink-darker dark:text-white focus:border-primary focus:bg-white dark:focus:bg-[#1C2536] focus:outline-none"
              />
            </div>
          </div>

          {/* Location */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300">
              مکان یا بستر برگزاری
            </label>
            <input
              type="text"
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              placeholder="مثال: سالن آمفی‌تئاتر خوارزمی یا بستر وبینار آنلاین"
              className="w-full min-h-[42px] px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/70 dark:bg-[#1C2536] text-ink-darker dark:text-white text-xs sm:text-sm font-medium focus:border-primary focus:bg-white dark:focus:bg-[#1C2536] focus:outline-none"
            />
          </div>

          {/* Cover Image Upload & URL */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300">
              عکس یا بنر رویداد
            </label>
            <p className="text-[11px] font-medium text-gray-400 mb-2 leading-relaxed">
              {EVENT_COVER_SPEC_LABEL}
            </p>
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <input
                  ref={coverFileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleCoverFileSelect}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isUploadingCover}
                  onClick={() => coverFileInputRef.current?.click()}
                  className="gap-1.5 text-xs font-bold"
                >
                  <Upload className="w-3.5 h-3.5 text-primary" />
                  {isUploadingCover ? 'در حال آپلود...' : 'انتخاب و آپلود عکس'}
                </Button>
                {form.coverUrl && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setForm({ ...form, coverUrl: '' })}
                    className="gap-1 text-xs font-bold text-rose-500 hover:text-rose-600 border-rose-200 dark:border-rose-900/50"
                  >
                    <X className="w-3.5 h-3.5" />
                    حذف عکس
                  </Button>
                )}
              </div>

              {form.coverUrl && (
                <div className="relative w-full max-w-md rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-2xs">
                  <img
                    src={form.coverUrl}
                    alt="پیش‌نمایش بنر رویداد"
                    className="w-full h-36 object-cover"
                  />
                </div>
              )}

              <input
                type="url"
                value={form.coverUrl}
                onChange={(e) => setForm({ ...form, coverUrl: e.target.value })}
                placeholder="یا آدرس تصویر را وارد کنید: https://..."
                className="w-full min-h-[42px] px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/70 dark:bg-[#1C2536] text-ink-darker dark:text-white text-xs sm:text-sm font-medium focus:border-primary focus:bg-white dark:focus:bg-[#1C2536] focus:outline-none"
              />
            </div>
            <EventCoverCropModal
              isOpen={!!cropImageSrc}
              onClose={() => {
                setCropImageSrc(null);
                setCropFileName(undefined);
                if (coverFileInputRef.current) coverFileInputRef.current.value = '';
              }}
              imageSrc={cropImageSrc || ''}
              fileName={cropFileName}
              onConfirm={handleCoverCropConfirm}
            />
          </div>

          {/* Tags */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300">
              برچسب‌ها (با ویرگول جدا کنید)
            </label>
            <input
              type="text"
              value={form.tags}
              onChange={(e) => setForm({ ...form, tags: e.target.value })}
              placeholder="المپیاد، برنامه‌نویسی، رباتیک"
              className="w-full min-h-[42px] px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/70 dark:bg-[#1C2536] text-ink-darker dark:text-white text-xs sm:text-sm font-medium focus:border-primary focus:bg-white dark:focus:bg-[#1C2536] focus:outline-none"
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300">
              توضیحات و دستورالعمل رویداد
            </label>
            <textarea
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="جزئیات برنامه، اهداف آموزشی و شرایط شرکت در رویداد..."
              className="w-full p-3.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/70 dark:bg-[#1C2536] text-ink-darker dark:text-white text-xs sm:text-sm font-medium focus:border-primary focus:bg-white dark:focus:bg-[#1C2536] focus:outline-none leading-relaxed"
            />
          </div>

          {/* Workflow Modules Selection in Edit Modal */}
          <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50/70 dark:bg-[#1C2536]/80 p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <label className="block text-xs font-black text-ink-darker dark:text-white">
                  ماژول‌های گردش کار رویداد (Workflow Modules)
                </label>
                <p className="text-[11px] font-bold text-gray-500 dark:text-gray-400 mt-0.5">
                  ماژول‌های مورد نیاز این رویداد را انتخاب و شماره مرحله آن‌ها را تعیین کنید.
                </p>
              </div>

              {/* Quick actions for modules */}
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setWorkflowModulesState(DEFAULT_WORKFLOW_MODULES)}
                  className="px-2.5 py-1 text-[11px] font-bold rounded-lg border border-primary/30 bg-primary/10 text-primary hover:bg-primary/20 transition-colors cursor-pointer"
                >
                  پیش‌فرض استارت‌آپ
                </button>
                <button
                  type="button"
                  onClick={() => setWorkflowModulesState([])}
                  className="px-2.5 py-1 text-[11px] font-bold rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#151C28] text-gray-500 dark:text-gray-400 hover:text-rose-500 hover:border-rose-300 transition-colors cursor-pointer"
                >
                  غیرفعال‌سازی همه
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-64 overflow-y-auto pr-1">
              {EVENT_MODULE_LIST.map((mod) => {
                const entry = workflowModulesState.find((m) => m.key === mod.key);
                const checked = !!entry && entry.enabled !== false;
                const Icon = mod.icon;
                return (
                  <div
                    key={mod.key}
                    className={`flex items-center gap-2.5 rounded-xl border p-2.5 transition-all ${
                      checked
                        ? 'border-primary/40 bg-white dark:bg-[#151C28] shadow-xs'
                        : 'border-gray-200/80 dark:border-gray-800 bg-white/50 dark:bg-[#151C28]/40'
                    }`}
                  >
                    <label className="flex items-center gap-2.5 flex-1 cursor-pointer min-w-0">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          setWorkflowModulesState((prev) => {
                            if (e.target.checked) {
                              const existing = prev.find((m) => m.key === mod.key);
                              if (existing) {
                                return renumberWorkflowModules(
                                  prev.map((m) =>
                                    m.key === mod.key ? { ...m, enabled: true } : m
                                  )
                                );
                              }
                              const maxStep = prev.length
                                ? Math.max(...prev.map((m) => m.step))
                                : 0;
                              return renumberWorkflowModules([
                                ...prev,
                                { key: mod.key as any, step: maxStep + 1, enabled: true },
                              ]);
                            }
                            return renumberWorkflowModules(
                              prev.filter((m) => m.key !== mod.key)
                            );
                          });
                        }}
                        className="w-4 h-4 accent-primary rounded flex-shrink-0 cursor-pointer"
                      />
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                          checked
                            ? 'bg-primary/10 text-primary'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-400'
                        }`}
                      >
                        <Icon className="w-4 h-4 shrink-0" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-black text-ink-darker dark:text-white truncate">
                          {mod.title}
                        </div>
                        <div className="text-[10px] font-medium text-gray-500 dark:text-gray-400 truncate">
                          {mod.subtitle}
                        </div>
                      </div>
                    </label>
                    {checked && (
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400">
                          گام:
                        </span>
                        <input
                          type="number"
                          min={1}
                          max={20}
                          value={entry?.step || 1}
                          onChange={(e) => {
                            const newStep = Math.max(1, parseInt(e.target.value, 10) || 1);
                            setWorkflowModulesState((prev) =>
                              renumberWorkflowModules(
                                prev.map((m) =>
                                  m.key === mod.key ? { ...m, step: newStep } : m
                                )
                              )
                            );
                          }}
                          className="w-11 h-7 px-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#1C2536] text-xs font-bold text-center focus:border-primary focus:outline-none"
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Ordered Active Steps Badges */}
            {workflowModulesState.some((m) => m.enabled !== false) && (
              <div className="pt-2 border-t border-gray-200/60 dark:border-gray-800 flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400">
                  ترتیب مراحل فعال:
                </span>
                {[...workflowModulesState]
                  .filter((m) => m.enabled !== false)
                  .sort((a, b) => a.step - b.step)
                  .map((m) => {
                    const def = EVENT_MODULE_LIST.find((d) => d.key === m.key);
                    return (
                      <span
                        key={m.key}
                        className="px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20 text-[10px] font-black"
                      >
                        {toPersianDigits(m.step)}. {def?.title || m.key}
                      </span>
                    );
                  })}
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsEditModalOpen(false)}
              className="px-4 py-2 text-xs font-bold"
            >
              انصراف
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isSubmitting}
              className="px-6 py-2 text-xs font-bold shadow-ecosystem"
            >
              {isSubmitting ? 'در حال ذخیره...' : 'ذخیره تغییرات'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
