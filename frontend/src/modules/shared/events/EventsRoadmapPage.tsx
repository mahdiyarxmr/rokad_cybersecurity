import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { apiClient } from '../../../lib/api/client';
import { useAuthStore } from '../../../lib/auth/auth-store';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
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
  Plus,
  Search,
  Sparkles,
  ChevronLeft,
  Compass,
  Layers,
  LayoutGrid,
  CalendarCheck,
  AlertCircle,
  Tag,
  Trash2,
  Edit3,
  Image as ImageIcon,
  CheckCircle2,
  Flag,
  Flame,
  BookOpen,
  Trophy,
  PartyPopper,
  Compass as CompassIcon,
  Rocket,
  X,
  Filter,
  ArrowUpRight,
  ExternalLink,
  RotateCcw,
  ArrowUpDown,
  ChevronDown,
  Check,
  ArrowUp,
} from 'lucide-react';
import {
  EVENT_MODULE_LIST,
  renumberWorkflowModules,
  normalizeWorkflowModules,
  DEFAULT_WORKFLOW_MODULES,
  WorkflowModuleEntry,
} from './constants/event-modules';

export interface SchoolEventItem {
  id: string;
  title: string;
  description: string;
  eventType: 'ACADEMIC' | 'HOLIDAY' | 'EXAM' | 'MEETING' | 'CULTURAL' | 'SPORTS' | 'EXCURSION' | 'STARTUP_WEEKEND' | 'ENTERTAINMENT';
  categoryKey?: string;
  startDate: string;
  endDate: string;
  isAllDay: boolean;
  targetAudience: 'ALL' | 'STUDENTS' | 'TEACHERS' | 'PARENTS' | 'STAFF' | 'SPECIFIC_CLASSES';
  location?: string;
  coverUrl?: string;
  attachments?: any[];
  tags?: string[];
  workflowModules?: { key: string; step: number; enabled?: boolean }[];
  createdAt?: string;
  updatedAt?: string;
  createdBy?: {
    firstName: string;
    lastName: string;
    role: string;
    avatarUrl?: string;
  };
}

export interface EventCategoryConfig {
  key: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  colorClass: string;
  activeClass: string;
  badgeClass: string;
}

export const EVENT_CATEGORIES: EventCategoryConfig[] = [
  {
    key: 'ALL',
    label: 'همه رویدادها',
    icon: Layers,
    colorClass: 'text-primary bg-primary/10 border-primary/20',
    activeClass: 'bg-primary text-white border-primary shadow-sm',
    badgeClass: 'bg-primary/10 text-primary border-primary/20',
  },
  {
    key: 'STARTUP_WEEKEND',
    label: 'رویداد استارتاپی',
    icon: Rocket,
    colorClass: 'text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800/60',
    activeClass: 'bg-amber-500 text-white border-amber-500 shadow-sm',
    badgeClass: 'bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700',
  },
  {
    key: 'ACADEMIC',
    label: 'کارگاه آموزشی',
    icon: BookOpen,
    colorClass: 'text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800/60',
    activeClass: 'bg-blue-600 text-white border-blue-600 shadow-sm',
    badgeClass: 'bg-blue-50 dark:bg-blue-950/50 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800',
  },
  {
    key: 'CULTURAL',
    label: 'فرهنگی و هنری',
    icon: PartyPopper,
    colorClass: 'text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800/60',
    activeClass: 'bg-purple-600 text-white border-purple-600 shadow-sm',
    badgeClass: 'bg-purple-50 dark:bg-purple-950/50 text-purple-800 dark:text-purple-300 border-purple-200 dark:border-purple-800',
  },
  {
    key: 'ENTERTAINMENT',
    label: 'بازی و سرگرمی',
    icon: Sparkles,
    colorClass: 'text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800/60',
    activeClass: 'bg-rose-600 text-white border-rose-600 shadow-sm',
    badgeClass: 'bg-rose-50 dark:bg-rose-950/50 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800',
  },
  {
    key: 'EXCURSION',
    label: 'اردو و بازدید',
    icon: CompassIcon,
    colorClass: 'text-cyan-700 dark:text-cyan-300 bg-cyan-50 dark:bg-cyan-950/40 border-cyan-200 dark:border-cyan-800/60',
    activeClass: 'bg-cyan-600 text-white border-cyan-600 shadow-sm',
    badgeClass: 'bg-cyan-50 dark:bg-cyan-950/50 text-cyan-800 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800',
  },
  {
    key: 'SPORTS',
    label: 'ورزشی',
    icon: Trophy,
    colorClass: 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/60',
    activeClass: 'bg-emerald-600 text-white border-emerald-600 shadow-sm',
    badgeClass: 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
  },
  {
    key: 'MEETING',
    label: 'جلسه و همایش',
    icon: Users,
    colorClass: 'text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800/60',
    activeClass: 'bg-indigo-600 text-white border-indigo-600 shadow-sm',
    badgeClass: 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-800 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
  },
];

const AUDIENCE_MAP: Record<string, string> = {
  ALL: 'عمومی',
  STUDENTS: 'ویژه دانش آموزان',
  PARENTS: 'ویژه والدین',
  TEACHERS: 'ویژه مربیان',
};

const PERSIAN_MONTH_NAMES = [
  'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
  'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'
];

interface FilterOption {
  value: string;
  label: string;
  colorDot?: string;
}

const STATUS_OPTIONS: FilterOption[] = [
  { value: 'ALL', label: 'همه وضعیت‌ها' },
  { value: 'UPCOMING', label: 'فقط پیش‌رو', colorDot: 'bg-cyan-500' },
  { value: 'LIVE', label: 'در حال برگزاری', colorDot: 'bg-rose-500' },
  { value: 'COMPLETED', label: 'برگزار شده', colorDot: 'bg-slate-400' },
];

const AUDIENCE_OPTIONS: FilterOption[] = [
  { value: 'ALL', label: 'همه مخاطبین' },
  { value: 'AUDIENCE_ALL', label: 'عمومی', colorDot: 'bg-emerald-500' },
  { value: 'STUDENTS', label: 'ویژه دانش آموزان', colorDot: 'bg-blue-500' },
  { value: 'PARENTS', label: 'ویژه والدین', colorDot: 'bg-amber-500' },
  { value: 'TEACHERS', label: 'ویژه مربیان', colorDot: 'bg-purple-500' },
];

const SORT_OPTIONS: FilterOption[] = [
  { value: 'START_DATE_ASC', label: 'نزدیک‌ترین زمان برگزاری' },
  { value: 'START_DATE_DESC', label: 'دورترین زمان برگزاری' },
  { value: 'TITLE_ASC', label: 'بر اساس عنوان رویداد (الفبا)' },
];

interface CustomFilterDropdownProps {
  label: string;
  labelIcon: React.ComponentType<{ className?: string }>;
  iconColorClass?: string;
  options: FilterOption[];
  value: string;
  onChange: (value: string) => void;
}

const CustomFilterDropdown: React.FC<CustomFilterDropdownProps> = ({
  label,
  labelIcon: LabelIcon,
  iconColorClass = 'text-primary',
  options,
  value,
  onChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value) || options[0];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div className={`relative ${isOpen ? 'z-50' : 'z-10'}`} ref={containerRef}>
      <label className="flex items-center gap-1.5 text-xs font-bold text-ink-normal/80 dark:text-gray-300 mb-1.5">
        <LabelIcon className={`w-3.5 h-3.5 shrink-0 ${iconColorClass}`} />
        <span>{label}</span>
      </label>

      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`w-full flex items-center justify-between text-xs sm:text-[13px] font-bold h-11 px-3.5 rounded-xl border transition-all duration-150 cursor-pointer select-none text-right ${isOpen
            ? 'border-primary ring-2 ring-primary/20 dark:ring-primary/30 bg-white dark:bg-[#1C2536] text-ink-darker dark:text-white shadow-xs'
            : 'bg-[#FAFAFA] dark:bg-[#1C2536] border-gray-200 dark:border-[#242F42] text-ink-darker dark:text-white hover:border-gray-300 dark:hover:border-gray-600'
          }`}
      >
        <div className="flex items-center gap-2 truncate min-w-0">
          {selectedOption?.colorDot && (
            <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${selectedOption.colorDot}`} />
          )}
          <span className="truncate">{selectedOption?.label || label}</span>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-gray-400 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180 text-primary' : ''
            }`}
        />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1.5 z-50 bg-white dark:bg-[#151C28] rounded-xl border border-gray-200 dark:border-[#242F42] shadow-xl p-1.5 space-y-0.5 animate-in fade-in zoom-in-95 duration-150 max-h-56 overflow-y-auto">
          {options.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs sm:text-[13px] transition-colors cursor-pointer text-right ${isSelected
                    ? 'bg-primary/10 text-primary dark:text-primary font-black'
                    : 'text-ink-darker dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-[#1C2536] font-bold'
                  }`}
              >
                <div className="flex items-center gap-2 truncate min-w-0">
                  {opt.colorDot && (
                    <span className={`w-2 h-2 rounded-full shrink-0 ${opt.colorDot}`} />
                  )}
                  <span className="truncate">{opt.label}</span>
                </div>
                {isSelected && <Check className="w-4 h-4 text-primary shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export const EventsRoadmapPage: React.FC = () => {
  const navigate = useNavigate();
  const currentUser = useAuthStore((s) => s.user);
  const isManager = ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'STAFF'].includes(currentUser?.role || '');

  const [events, setEvents] = useState<SchoolEventItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'UPCOMING' | 'LIVE' | 'COMPLETED'>('ALL');
  const [audienceFilter, setAudienceFilter] = useState<string>('ALL');
  const [sortOption, setSortOption] = useState<string>('START_DATE_ASC');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'roadmap' | 'grid'>('roadmap');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 250);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const hasActiveFilters =
    statusFilter !== 'ALL' ||
    audienceFilter !== 'ALL' ||
    selectedCategory !== 'ALL' ||
    sortOption !== 'START_DATE_ASC' ||
    Boolean(searchQuery.trim());

  const resetFilters = () => {
    setStatusFilter('ALL');
    setAudienceFilter('ALL');
    setSelectedCategory('ALL');
    setSortOption('START_DATE_ASC');
    setSearchQuery('');
  };

  // Modal State for Create / Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [workflowModulesState, setWorkflowModulesState] = useState<WorkflowModuleEntry[]>([]);

  const todayJalaliStr = useMemo(() => gregorianToJalaliStr(new Date()), []);

  const [form, setForm] = useState({
    title: '',
    description: '',
    eventType: 'ACADEMIC' as SchoolEventItem['eventType'],
    startDate: todayJalaliStr,
    startTime: '08:30',
    endDate: todayJalaliStr,
    endTime: '12:00',
    isAllDay: false,
    targetAudience: 'ALL' as SchoolEventItem['targetAudience'],
    location: '',
    coverUrl: '',
    tags: '',
  });

  const fetchEvents = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.get('/calendar/events');
      let loadedEvents: SchoolEventItem[] = [];
      if (res && Array.isArray(res.data)) {
        loadedEvents = res.data;
      }

      // Filter: Only include events created for/in the events module (7 approved categories)
      // Exclude exams, homework deadlines, holidays, etc.
      const validEventCategories = new Set([
        'STARTUP_WEEKEND',
        'ACADEMIC',
        'CULTURAL',
        'ENTERTAINMENT',
        'EXCURSION',
        'SPORTS',
        'MEETING',
      ]);

      const eventsOnly = loadedEvents.filter((e: any) => {
        if (e.eventType === 'HOMEWORK' || e.type === 'HOMEWORK') return false;
        if (e.eventType === 'EXAM' || e.type === 'EXAM') return false;
        if (e.eventType === 'HOLIDAY' || e.type === 'HOLIDAY') return false;
        return (
          validEventCategories.has(e.eventType) ||
          e.tags?.some((t: string) => t.startsWith('categoryKey:') || t === 'source:events')
        );
      });

      setEvents(eventsOnly);
    } catch (err) {
      console.error('Failed to load roadmap events', err);
      setEvents([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    try {
      localStorage.removeItem('rokad_calendar_events');
    } catch {}
    fetchEvents();
  }, []);

  // Event status calculator
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

  // Stats calculation
  const totalCount = events.length;
  const upcomingCount = useMemo(() => {
    const now = new Date().getTime();
    return events.filter((e) => new Date(e.startDate).getTime() > now).length;
  }, [events]);

  const liveCount = useMemo(() => {
    const now = new Date().getTime();
    return events.filter((e) => new Date(e.startDate).getTime() <= now && new Date(e.endDate).getTime() >= now).length;
  }, [events]);

  const completedCount = useMemo(() => {
    const now = new Date().getTime();
    return events.filter((e) => new Date(e.endDate).getTime() < now).length;
  }, [events]);

  // Filtered & sorted events
  const filteredEvents = useMemo(() => {
    return events
      .filter((ev) => {
        const matchCat = selectedCategory === 'ALL' || ev.eventType === selectedCategory;
        const matchAudience =
          audienceFilter === 'ALL' ||
          (audienceFilter === 'AUDIENCE_ALL' ? ev.targetAudience === 'ALL' : ev.targetAudience === audienceFilter);

        let matchStatus = true;
        if (statusFilter !== 'ALL') {
          const s = getEventStatus(ev.startDate, ev.endDate);
          matchStatus = s.key === statusFilter;
        }

        const matchSearch =
          !searchQuery ||
          ev.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (ev.description && ev.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
          (ev.location && ev.location.toLowerCase().includes(searchQuery.toLowerCase())) ||
          (ev.tags && ev.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase())));

        return matchCat && matchAudience && matchStatus && matchSearch;
      })
      .sort((a, b) => {
        if (sortOption === 'START_DATE_ASC') {
          return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
        }
        if (sortOption === 'START_DATE_DESC') {
          return new Date(b.startDate).getTime() - new Date(a.startDate).getTime();
        }
        if (sortOption === 'TITLE_ASC') {
          return a.title.localeCompare(b.title, 'fa');
        }
        return 0;
      });
  }, [events, selectedCategory, statusFilter, audienceFilter, searchQuery, sortOption]);

  // Group events by Jalali month for the annual roadmap
  const roadmapGroups = useMemo(() => {
    const groups: { monthIndex: number; monthName: string; year: string; events: SchoolEventItem[] }[] = [];

    // Sort chronologically by start date
    const sorted = [...filteredEvents].sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

    sorted.forEach((ev) => {
      const jStr = gregorianToJalaliStr(ev.startDate);
      if (!jStr) return;
      const parts = jStr.split('-');
      const y = parts[0];
      const m = parseInt(parts[1], 10);
      const mName = PERSIAN_MONTH_NAMES[m - 1] || 'نامشخص';
      const key = `${y}-${m}`;

      let group = groups.find((g) => `${g.year}-${g.monthIndex}` === key);
      if (!group) {
        group = { monthIndex: m, monthName: mName, year: y, events: [] };
        groups.push(group);
      }
      group.events.push(ev);
    });

    return groups;
  }, [filteredEvents]);

  const { currentYear, currentMonthIndex } = useMemo(() => {
    if (!todayJalaliStr) return { currentYear: '', currentMonthIndex: 0 };
    const parts = todayJalaliStr.split('-');
    return {
      currentYear: parts[0] || '',
      currentMonthIndex: parseInt(parts[1], 10) || 0,
    };
  }, [todayJalaliStr]);

  const hasAutoScrolledRef = useRef(false);

  // Reset auto-scroll flag when key filters change
  useEffect(() => {
    hasAutoScrolledRef.current = false;
  }, [selectedCategory, statusFilter, audienceFilter]);

  // Scroll to current month on initial load or when roadmap is ready
  useEffect(() => {
    if (isLoading || roadmapGroups.length === 0 || hasAutoScrolledRef.current) return;

    // Find the current month group
    const currentGroup = roadmapGroups.find(
      (g) => g.year === currentYear && g.monthIndex === currentMonthIndex
    );

    // If current month exists in roadmap, target it; otherwise target closest upcoming/past month
    const targetGroup =
      currentGroup ||
      roadmapGroups.find(
        (g) =>
          Number(g.year) > Number(currentYear) ||
          (g.year === currentYear && g.monthIndex >= currentMonthIndex)
      ) ||
      roadmapGroups[0];

    if (targetGroup) {
      const targetId = `month-group-${targetGroup.year}-${targetGroup.monthIndex}`;
      const timer = setTimeout(() => {
        const el = document.getElementById(targetId);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          hasAutoScrolledRef.current = true;
        }
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [isLoading, roadmapGroups, currentYear, currentMonthIndex]);

  // Open Create Modal
  const handleOpenCreate = () => {
    setIsEditing(false);
    setEditingId(null);
    setForm({
      title: '',
      description: '',
      eventType: 'ACADEMIC',
      startDate: todayJalaliStr,
      startTime: '08:30',
      endDate: todayJalaliStr,
      endTime: '12:00',
      isAllDay: false,
      targetAudience: 'ALL',
      location: '',
      coverUrl: '',
      tags: '',
    });
    setWorkflowModulesState(DEFAULT_WORKFLOW_MODULES);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleNavigateToEvent = (eventId: string) => {
    const mainContainer = document.querySelector('main');
    if (mainContainer) {
      mainContainer.scrollTop = 0;
    }
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    navigate(`/app/events/${eventId}`);
  };

  // Open Edit Modal
  const handleOpenEdit = (ev: SchoolEventItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
    setEditingId(ev.id);

    const sJalali = gregorianToJalaliStr(ev.startDate);
    const eJalali = gregorianToJalaliStr(ev.endDate);
    const sDate = new Date(ev.startDate);
    const eDate = new Date(ev.endDate);

    const sTime = `${String(sDate.getHours()).padStart(2, '0')}:${String(sDate.getMinutes()).padStart(2, '0')}`;
    const eTime = `${String(eDate.getHours()).padStart(2, '0')}:${String(eDate.getMinutes()).padStart(2, '0')}`;

    setForm({
      title: ev.title,
      description: ev.description || '',
      eventType: ev.eventType,
      startDate: sJalali,
      startTime: sTime,
      endDate: eJalali || sJalali,
      endTime: eTime,
      isAllDay: ev.isAllDay,
      targetAudience: ev.targetAudience,
      location: ev.location || '',
      coverUrl: ev.coverUrl || '',
      tags: (ev.tags || []).join('، '),
    });

    setWorkflowModulesState(
      Array.isArray(ev.workflowModules) && ev.workflowModules.length > 0
        ? normalizeWorkflowModules(ev.workflowModules)
        : ev.eventType === 'STARTUP_WEEKEND'
          ? DEFAULT_WORKFLOW_MODULES
          : []
    );

    setFormError(null);
    setIsModalOpen(true);
  };

  // Undoable Delete Mutation
  const { execute: executeUndoableDeleteEvent } = useUndoableMutation<SchoolEventItem>({
    undoLabel: (ev) => TOAST_MESSAGES.operations.calendarEventDeleted(ev.title),
    delayMs: 5000,
    optimisticUpdate: (ev) => {
      setEvents((prev) => prev.filter((item) => item.id !== ev.id));
    },
    mutationFn: async (ev) => {
      await apiClient.delete(`/calendar/events/${ev.id}`);
    },
    undoFn: async (ev) => {
      await apiClient.patch(`/calendar/events/${ev.id}/restore`);
      await fetchEvents();
    },
    revertUpdate: (ev) => {
      setEvents((prev) => {
        if (prev.some((item) => item.id === ev.id)) return prev;
        return [ev, ...prev];
      });
      toast.info(`رویداد «${ev.title}» بازگردانی شد.`);
    },
    onError: (err, ev) => {
      toast.error(err?.response?.data?.message || `خطا در حذف رویداد «${ev.title}»`);
    },
  });

  const handleDeleteEvent = (ev: SchoolEventItem, e: React.MouseEvent) => {
    e.stopPropagation();
    executeUndoableDeleteEvent(ev);
  };

  // Submit Modal
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
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

      if (!tagsArray.includes(`categoryKey:${form.eventType}`)) {
        tagsArray.push(`categoryKey:${form.eventType}`);
      }
      if (!tagsArray.includes('source:events')) {
        tagsArray.push('source:events');
      }

      const activeWorkflowModules = renumberWorkflowModules(
        workflowModulesState.filter((m) => m.enabled !== false)
      );

      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        eventType: form.eventType,
        startDate: sDateObj.toISOString(),
        endDate: eDateObj.toISOString(),
        isAllDay: form.isAllDay,
        targetAudience: form.targetAudience,
        location: form.location.trim() || undefined,
        coverUrl: form.coverUrl.trim() || undefined,
        tags: tagsArray,
        workflowModules: activeWorkflowModules.length > 0 ? activeWorkflowModules : undefined,
      };

      if (isEditing && editingId) {
        await apiClient.patch(`/calendar/events/${editingId}`, payload);
        toast.success(TOAST_MESSAGES.operations.calendarEventUpdated(form.title));
      } else {
        await apiClient.post('/calendar/events', payload);
        toast.success(TOAST_MESSAGES.operations.calendarEventCreated(form.title));
      }

      setIsModalOpen(false);
      await fetchEvents();
    } catch (err: any) {
      console.error('Event submit error', err);
      const msg = err?.response?.data?.message || 'خطا در ذخیره‌سازی رویداد';
      setFormError(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 pb-16">
      {/* 1. Main Header Box (Includes Title, Filter Button, Search, Create Button & Category Tabs) */}
      <div className="bg-white dark:bg-[#151C28] rounded-2xl border-[1.5px] border-primary-dark/30 dark:border-gray-800 shadow-[2px_2px_0_#59BBAF] dark:shadow-[2px_2px_0_#0B0F17] p-4 sm:p-5 space-y-4">
        {/* Row 1: Title & Top-Left Filter Button */}
        <div className="flex items-center justify-between gap-3">
          {/* Right: Title & Icon */}
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0 shadow-2xs">
              <CalendarDays className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-ink-darker dark:text-white tracking-tight">
                رویدادها
              </h1>
            </div>
          </div>

          {/* Left: Filter Toggle Button (Top-left of header box) */}
          <button
            type="button"
            onClick={() => setIsFilterOpen((prev) => !prev)}
            className={`relative cursor-pointer select-none flex items-center justify-center w-10 h-10 rounded-xl border-[1.5px] transition-all duration-150 active:translate-x-[1px] active:translate-y-[1px] shrink-0 ${isFilterOpen || hasActiveFilters
                ? 'bg-primary text-white border-primary-dark shadow-[2px_2px_0_#438C83]'
                : 'bg-gray-50 dark:bg-[#1C2536] text-muted-foreground dark:text-slate-300 border-gray-200 dark:border-[#242F42] hover:bg-gray-100 dark:hover:bg-[#253248] shadow-[2px_2px_0_#CBD5E1] dark:shadow-[2px_2px_0_#0F172A]'
              }`}
            title={isFilterOpen ? 'بستن فیلترها' : 'نمایش فیلترها'}
            aria-label={isFilterOpen ? 'بستن فیلترها' : 'نمایش فیلترها'}
          >
            <Filter className="w-4 h-4 shrink-0" />
            {hasActiveFilters && (
              <span className="absolute top-1.5 left-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white dark:ring-[#151C28]" />
            )}
          </button>
        </div>

        {/* Row 2: Large Create Event Button (Staff / Admin only) */}
        {isManager && (
          <div>
            <Button
              onClick={handleOpenCreate}
              variant="primary"
              className="h-11 w-full rounded-xl text-xs sm:text-sm font-bold rokad-btn-primary shrink-0 gap-2 shadow-ecosystem justify-center"
            >
              <Plus className="w-4 h-4 shrink-0" />
              <span>رویداد جدید</span>
            </Button>
          </div>
        )}

        {/* Row 3: Event Category Tabs (Inside top box) */}
        <div className="pt-3 border-t border-gray-100 dark:border-gray-800/80">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 overflow-x-auto pb-0.5 scrollbar-none flex-1 min-w-0">
              {EVENT_CATEGORIES.map((cat) => {
                const isSelected = selectedCategory === cat.key;
                const Icon = cat.icon;
                const count =
                  cat.key === 'ALL'
                    ? events.length
                    : events.filter((e) => e.eventType === cat.key).length;

                return (
                  <button
                    key={cat.key}
                    type="button"
                    onClick={() => setSelectedCategory(cat.key)}
                    className={`min-h-[38px] flex items-center gap-2 whitespace-nowrap px-3.5 py-1.5 rounded-xl text-xs sm:text-[13px] font-bold border transition-all duration-150 cursor-pointer select-none active:scale-98 ${isSelected
                        ? cat.activeClass
                        : 'bg-white dark:bg-[#1C2536] text-gray-600 dark:text-gray-300 border-gray-200/80 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600'
                      }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{cat.label}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${isSelected
                          ? 'bg-white/20 text-white'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                        }`}
                    >
                      {toPersianDigits(count)}
                    </span>
                  </button>
                );
              })}
            </div>

            {roadmapGroups.some((g) => g.year === currentYear && g.monthIndex === currentMonthIndex) && (
              <button
                type="button"
                onClick={() => {
                  const el = document.getElementById(`month-group-${currentYear}-${currentMonthIndex}`);
                  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
                className="hidden sm:inline-flex items-center gap-1.5 whitespace-nowrap px-3 py-1.5 rounded-xl text-xs font-bold border border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-all cursor-pointer shrink-0 shadow-2xs"
                title="پرش مستقیم به رویدادهای ماه جاری"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>ماه جاری</span>
              </button>
            )}
          </div>
        </div>

        {/* Collapsible Filter Panel (Includes Search Box and Filter Dropdowns) */}
        <div
          className={`grid transition-all duration-300 ease-in-out ${isFilterOpen
              ? 'grid-rows-[1fr] opacity-100 translate-y-0 !mt-3 pt-0'
              : 'grid-rows-[0fr] opacity-0 -translate-y-2 pointer-events-none !mt-0 pt-0'
            }`}
        >
          <div className={`min-h-0 transition-all duration-300 ${isFilterOpen ? 'overflow-visible' : 'overflow-hidden'}`}>
            <div className="bg-gray-50/70 dark:bg-[#1C2536]/80 rounded-xl border border-gray-200/80 dark:border-[#242F42] p-4 shadow-xs space-y-4 relative overflow-visible">
              {/* Search Box inside Filter Panel */}
              <div className="relative w-full">
                <Search className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="جستجو در عنوان، توضیحات، مکان یا برچسب‌های رویدادها..."
                  className="w-full h-11 pr-10 pl-9 text-xs sm:text-[13px] rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#151C28] text-ink-darker dark:text-white outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all font-medium shadow-2xs"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-0.5 rounded-md cursor-pointer"
                    title="پاک کردن جستجو"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Filter Dropdowns Grid: 3 Columns for Managers, 2 Columns for Regular Users */}
              <div className={`grid grid-cols-1 ${isManager ? 'sm:grid-cols-2 md:grid-cols-3' : 'sm:grid-cols-2'} gap-3.5 relative z-20`}>
                {/* Status Filter */}
                <CustomFilterDropdown
                  label="وضعیت برگزاری:"
                  labelIcon={Clock}
                  iconColorClass="text-rose-500"
                  options={STATUS_OPTIONS}
                  value={statusFilter}
                  onChange={(val) => setStatusFilter(val as any)}
                />

                {/* Target Audience Filter - Principals & Staff Only */}
                {isManager && (
                  <CustomFilterDropdown
                    label="مخاطبین هدف:"
                    labelIcon={Users}
                    iconColorClass="text-purple-500"
                    options={AUDIENCE_OPTIONS}
                    value={audienceFilter}
                    onChange={setAudienceFilter}
                  />
                )}

                {/* Sort Order Filter */}
                <CustomFilterDropdown
                  label="ترتیب نمایش:"
                  labelIcon={ArrowUpDown}
                  iconColorClass="text-primary"
                  options={SORT_OPTIONS}
                  value={sortOption}
                  onChange={setSortOption}
                />
              </div>

              {/* Footer Row: Result Counter & Reset Button */}
              <div className="flex items-center justify-between pt-2 border-t border-gray-200/70 dark:border-gray-800/80">
                <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                  تعداد {toPersianDigits(filteredEvents.length)} رویداد با این مشخصات یافت شد.
                </span>

                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="text-xs h-8 px-3 gap-1.5 inline-flex items-center text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition-all cursor-pointer font-bold"
                    title="پاک کردن تمام فیلترها"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>بازنشانی فیلترها</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>



      {/* 4. Content Display */}
      {isLoading ? (
        <div className="py-24 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-3 border-primary border-t-transparent" />
          <p className="mt-3 text-xs sm:text-sm font-bold text-gray-500 dark:text-gray-400">
            در حال بارگذاری رویدادهای سالانه...
          </p>
        </div>
      ) : filteredEvents.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-800 p-12 text-center bg-white/40 dark:bg-[#151C28]/40">
          <CalendarDays className="mx-auto w-12 h-12 text-gray-300 dark:text-gray-600 mb-3" />
          <h3 className="text-base font-black text-ink-darker dark:text-white">رویدادی با این مشخصات یافت نشد</h3>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
            می‌توانید فیلترهای دسته‌بندی و وضعیت را تغییر دهید یا عنوان دیگری را جستجو کنید.
          </p>
          {isManager && (
            <Button
              onClick={handleOpenCreate}
              variant="primary"
              className="rokad-btn-primary mt-4 gap-2 text-xs font-bold"
            >
              <Plus className="w-4 h-4" />
              <span>افزودن رویداد جدید</span>
            </Button>
          )}
        </div>
      ) : viewMode === 'roadmap' ? (
        /* ================= ANNUAL ROADMAP TIMELINE VIEW ================= */
        <div className="space-y-10 sm:space-y-12">
          {roadmapGroups.map((group) => {
            const isCurrentMonth = group.year === currentYear && group.monthIndex === currentMonthIndex;
            return (
              <div
                key={`${group.year}-${group.monthIndex}`}
                id={`month-group-${group.year}-${group.monthIndex}`}
                className="space-y-5 scroll-mt-24 sm:scroll-mt-28"
              >
                {/* Month Header Banner */}
                <div className="flex items-center gap-4">
                  <div
                    className={`flex items-center gap-2 rounded-xl px-4 py-2 font-black text-sm shadow-sm border transition-all ${isCurrentMonth
                        ? 'bg-primary text-white border-primary-dark ring-2 ring-primary/30 shadow-md'
                        : 'bg-primary text-white border-primary/30'
                      }`}
                  >
                    <Flag className="w-4 h-4" />
                    <span>{group.monthName}</span>
                    <span className="text-xs opacity-80">{toPersianDigits(group.year)}</span>
                    {isCurrentMonth && (
                      <span className="mr-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-white text-primary shadow-xs">
                        ماه جاری
                      </span>
                    )}
                  </div>
                  <div className="h-0.5 flex-1 bg-gradient-to-l from-transparent via-gray-200 dark:via-gray-800 to-transparent" />
                  <span className="text-xs font-bold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-[#1C2536] px-3 py-1 rounded-full border border-gray-200/60 dark:border-gray-700/60">
                    {toPersianDigits(group.events.length)} رویداد
                  </span>
                </div>

                {/* Spine & Events Container */}
                <div className="relative mr-4 sm:mr-6 space-y-5 border-r-2 border-primary/20 dark:border-primary/25 pr-6 sm:pr-8">
                  {group.events.map((ev) => {
                    const status = getEventStatus(ev.startDate, ev.endDate);
                    const jalaliStartFormatted = formatJalaliDisplay(ev.startDate, true);
                    const sTime = new Date(ev.startDate).toLocaleTimeString('fa-IR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    });
                    const categoryMeta =
                      EVENT_CATEGORIES.find((c) => c.key === ev.eventType) ||
                      EVENT_CATEGORIES[1];
                    const CategoryIcon = categoryMeta.icon;

                    return (
                      <div
                        key={ev.id}
                        onClick={() => handleNavigateToEvent(ev.id)}
                        className="group relative cursor-pointer"
                      >
                        {/* Timeline Node Dot */}
                        <div className="absolute -right-[28px] sm:-right-[36px] top-6 h-4 w-4 rounded-full border-2 border-white dark:border-[#0B0F17] bg-primary shadow-sm transition-transform duration-200 group-hover:scale-125 z-10" />

                        {/* Event Card */}
                        <div className="overflow-hidden rounded-2xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-[#151C28] shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
                          <div className="flex flex-col lg:flex-row">
                            {/* Left Cover visual */}
                            {ev.coverUrl ? (
                              <div className="h-44 w-full lg:h-auto lg:w-64 flex-shrink-0 overflow-hidden bg-gray-100 dark:bg-gray-800 relative">
                                <img
                                  src={ev.coverUrl}
                                  alt={ev.title}
                                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent lg:hidden" />
                              </div>
                            ) : (
                              <div className="flex h-32 w-full lg:h-auto lg:w-48 flex-shrink-0 items-center justify-center bg-gradient-to-br from-primary/10 via-indigo-500/10 to-teal-500/10 dark:from-primary/20 dark:to-indigo-900/30">
                                <CategoryIcon className="w-10 h-10 text-primary/70 transition-transform duration-300 group-hover:scale-110" />
                              </div>
                            )}

                            {/* Event Body */}
                            <div className="flex-1 p-5 sm:p-6 flex flex-col justify-between">
                              <div>
                                <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
                                  <div className="flex flex-wrap items-center gap-2">
                                    {/* Status badge */}
                                    <span
                                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${status.badgeClass}`}
                                    >
                                      <span className={`w-1.5 h-1.5 rounded-full ${status.dotColor}`} />
                                      <span>{status.label}</span>
                                    </span>

                                    {/* Category badge */}
                                    <span
                                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${categoryMeta.badgeClass}`}
                                    >
                                      <CategoryIcon className="w-3 h-3" />
                                      <span>{categoryMeta.label}</span>
                                    </span>

                                    {/* Audience */}
                                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-gray-500 dark:text-gray-400">
                                      <Users className="w-3 h-3 text-gray-400" />
                                      <span>{AUDIENCE_MAP[ev.targetAudience] || ev.targetAudience}</span>
                                    </span>
                                  </div>

                                  {/* Admin Action Buttons */}
                                  {isManager && (
                                    <div className="flex items-center gap-1">
                                      <button
                                        type="button"
                                        title="ویرایش رویداد"
                                        onClick={(e) => handleOpenEdit(ev, e)}
                                        className="min-h-[34px] min-w-[34px] flex items-center justify-center rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-zinc-800 dark:hover:text-white transition-colors"
                                      >
                                        <Edit3 className="w-4 h-4" />
                                      </button>
                                      <button
                                        type="button"
                                        title="حذف رویداد"
                                        onClick={(e) => handleDeleteEvent(ev, e)}
                                        className="min-h-[34px] min-w-[34px] flex items-center justify-center rounded-lg p-1.5 text-rose-500 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/40 transition-colors"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </div>
                                  )}
                                </div>

                                <h3 className="text-base sm:text-lg font-black text-ink-darker dark:text-white group-hover:text-primary transition-colors">
                                  {ev.title}
                                </h3>
                              </div>

                              {/* Event Metadata Footer */}
                              <div className="mt-3.5 pt-3 border-t border-gray-100 dark:border-gray-800/80 flex items-center justify-between gap-3">
                                <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs font-bold text-gray-600 dark:text-gray-300">
                                  <span className="flex items-center gap-1.5 text-ink-darker dark:text-gray-200">
                                    <CalendarDays className="w-3.5 h-3.5 text-primary shrink-0" />
                                    <span>{jalaliStartFormatted}</span>
                                  </span>
                                  <span className="flex items-center gap-1 text-gray-500">
                                    <Clock className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                    <span>ساعت {sTime}</span>
                                  </span>
                                  {ev.location && (
                                    <span className="flex items-center gap-1 text-gray-500">
                                      <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                                      <span>{ev.location}</span>
                                    </span>
                                  )}
                                </div>

                                <div className="mr-auto shrink-0 flex items-center gap-1.5 text-xs font-bold text-primary group-hover:underline">
                                  <span>جزئیات برنامه</span>
                                  <ChevronLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-1" />
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ================= GRID VIEW ================= */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
          {filteredEvents.map((ev) => {
            const status = getEventStatus(ev.startDate, ev.endDate);
            const jalaliStartFormatted = formatJalaliDisplay(ev.startDate);
            const sTime = new Date(ev.startDate).toLocaleTimeString('fa-IR', {
              hour: '2-digit',
              minute: '2-digit',
            });
            const categoryMeta =
              EVENT_CATEGORIES.find((c) => c.key === ev.eventType) ||
              EVENT_CATEGORIES[1];
            const CategoryIcon = categoryMeta.icon;

            return (
              <div
                key={ev.id}
                onClick={() => handleNavigateToEvent(ev.id)}
                className="group flex flex-col justify-between overflow-hidden rounded-2xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-[#151C28] shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
              >
                <div>
                  {ev.coverUrl ? (
                    <div className="h-44 w-full overflow-hidden bg-gray-100 dark:bg-gray-800 relative">
                      <img
                        src={ev.coverUrl}
                        alt={ev.title}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <div className="absolute top-3 right-3 flex items-center gap-1.5">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border backdrop-blur-md bg-white/90 dark:bg-[#151C28]/90 ${status.badgeClass}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${status.dotColor}`} />
                          <span>{status.label}</span>
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="relative flex h-36 w-full items-center justify-center bg-gradient-to-br from-primary/10 via-indigo-500/10 to-teal-500/10 dark:from-primary/20 dark:to-indigo-900/30">
                      <CategoryIcon className="w-10 h-10 text-primary/70 transition-transform duration-300 group-hover:scale-110" />
                      <div className="absolute top-3 right-3 flex items-center gap-1.5">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${status.badgeClass}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${status.dotColor}`} />
                          <span>{status.label}</span>
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="p-5">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${categoryMeta.badgeClass}`}
                      >
                        <CategoryIcon className="w-2.5 h-2.5" />
                        <span>{categoryMeta.label}</span>
                      </span>
                      <span className="text-[11px] font-medium text-gray-400">
                        {AUDIENCE_MAP[ev.targetAudience]}
                      </span>
                    </div>

                    <h3 className="text-base font-black text-ink-darker dark:text-white group-hover:text-primary transition-colors line-clamp-1">
                      {ev.title}
                    </h3>
                  </div>
                </div>

                <div className="p-5 pt-0">
                  <div className="pt-3 border-t border-gray-100 dark:border-gray-800 space-y-1.5 text-xs font-bold text-gray-600 dark:text-gray-300">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-ink-darker dark:text-gray-200">
                        <CalendarDays className="w-3.5 h-3.5 text-primary shrink-0" />
                        <span>{jalaliStartFormatted}</span>
                      </span>
                      <span className="flex items-center gap-1 text-gray-400">
                        <Clock className="w-3 h-3 shrink-0" />
                        <span>{sTime}</span>
                      </span>
                    </div>
                    {ev.location && (
                      <div className="flex items-center gap-1 text-gray-400 truncate">
                        <MapPin className="w-3 h-3 text-rose-500 shrink-0" />
                        <span className="truncate">{ev.location}</span>
                      </div>
                    )}
                    <div className="pt-2 flex items-center justify-between text-xs font-bold text-primary border-t border-gray-100 dark:border-gray-800 mt-1 group-hover:underline">
                      <span>جزئیات برنامه</span>
                      <ChevronLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-1" />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 5. Create / Edit Modal (Modern Refined Styling) */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={isEditing ? 'ویرایش رویداد سالانه' : 'تعریف رویداد جدید'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
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
                onChange={(e) => setForm({ ...form, eventType: e.target.value as any })}
                className="w-full min-h-[42px] px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/70 dark:bg-[#1C2536] text-xs sm:text-sm font-bold text-ink-darker dark:text-white focus:border-primary focus:outline-none"
              >
                <option value="STARTUP_WEEKEND">رویداد استارتاپی</option>
                <option value="ACADEMIC">کارگاه آموزشی</option>
                <option value="CULTURAL">فرهنگی و هنری</option>
                <option value="ENTERTAINMENT">بازی و سرگرمی</option>
                <option value="EXCURSION">اردو و بازدید</option>
                <option value="SPORTS">ورزشی</option>
                <option value="MEETING">جلسه و همایش</option>
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
                <option value="ALL">عمومی</option>
                <option value="STUDENTS">ویژه دانش آموزان</option>
                <option value="PARENTS">ویژه والدین</option>
                <option value="TEACHERS">ویژه مربیان</option>
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

          {/* Cover Image URL */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300">
              آدرس تصویر بنر رویداد (URL)
            </label>
            <input
              type="url"
              value={form.coverUrl}
              onChange={(e) => setForm({ ...form, coverUrl: e.target.value })}
              placeholder="https://..."
              className="w-full min-h-[42px] px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/70 dark:bg-[#1C2536] text-ink-darker dark:text-white text-xs sm:text-sm font-medium focus:border-primary focus:bg-white dark:focus:bg-[#1C2536] focus:outline-none"
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

          {/* Workflow Modules Selection in Modal */}
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
                    className={`flex items-center gap-2.5 rounded-xl border p-2.5 transition-all ${checked
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
                        className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${checked
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

          {/* Submit Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100 dark:border-gray-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsModalOpen(false)}
              className="rokad-btn-outline px-4 py-2 text-xs font-bold"
            >
              انصراف
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isSubmitting}
              className="rokad-btn-primary px-6 py-2 text-xs font-bold shadow-ecosystem"
            >
              {isSubmitting ? 'در حال ثبت...' : isEditing ? 'بروزرسانی رویداد' : 'افزودن به رودمپ'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Scroll to Top Floating Button (Bottom-Left above mobile bottom bar) */}
      <button
        type="button"
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        className={`fixed bottom-20 sm:bottom-8 left-4 sm:left-6 z-40 w-11 h-11 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-white dark:bg-[#151C28] text-primary border-[1.5px] border-primary-dark/30 dark:border-primary/40 shadow-[2px_2px_0_#59BBAF] dark:shadow-[2px_2px_0_#0B0F17] hover:bg-primary hover:text-white dark:hover:bg-primary dark:hover:text-white hover:border-primary flex items-center justify-center cursor-pointer transition-all duration-300 active:translate-x-[1px] active:translate-y-[1px] ${showScrollTop
            ? 'opacity-100 translate-y-0 scale-100 pointer-events-auto'
            : 'opacity-0 translate-y-4 scale-90 pointer-events-none'
          }`}
        title="بازگشت به بالای صفحه"
        aria-label="بازگشت به بالای صفحه"
      >
        <ArrowUp className="w-5 h-5 sm:w-6 sm:h-6" />
      </button>
    </div>
  );
};
