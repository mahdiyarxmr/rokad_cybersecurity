import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { apiClient } from '../../../lib/api/client';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Skeleton } from '../../../components/ui/Skeleton';
import { Modal } from '../../../components/ui/Modal';
import { formatJalaliDisplay, toPersianDigits } from '../../../utils/jalali';
import {
  HelpCircle,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Play,
  Check,
  Award,
  X,
  Filter,
  Calendar,
  BookOpen,
  ArrowUpDown,
  RotateCcw,
  ChevronDown,
  ChevronLeft,
  School,
  Laptop,
  FileText,
  User,
  Eye,
  Search,
} from 'lucide-react';

interface FilterOption {
  value: string;
  label: string;
  colorDot?: string;
}

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
    <div className="relative" ref={containerRef}>
      <label className="flex items-center gap-1.5 text-[11px] font-bold text-muted-foreground dark:text-slate-400 mb-1.5">
        <LabelIcon className={`w-3.5 h-3.5 shrink-0 ${iconColorClass}`} />
        <span>{label}</span>
      </label>

      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`w-full flex items-center justify-between text-xs sm:text-[13px] font-bold h-10 px-3.5 rounded-xl border transition-all duration-150 cursor-pointer select-none ${
          isOpen
            ? 'border-primary ring-2 ring-primary/20 dark:ring-primary/30 bg-white dark:bg-[#1C2536] text-foreground dark:text-white shadow-xs'
            : 'bg-gray-50 dark:bg-[#1C2536] border-gray-200 dark:border-[#242F42] text-foreground dark:text-white hover:border-gray-300 dark:hover:border-gray-600'
        }`}
      >
        <div className="flex items-center gap-2 truncate min-w-0">
          {selectedOption?.colorDot && (
            <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${selectedOption.colorDot}`} />
          )}
          <span className="truncate text-ink-darker dark:text-white font-bold">
            {selectedOption?.label || label}
          </span>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-muted-foreground dark:text-slate-400 shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-primary' : ''
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
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs sm:text-[13px] transition-colors cursor-pointer text-right ${
                  isSelected
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

export const StudentExamsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const examIdParam = searchParams.get('examId');
  const actionParam = searchParams.get('action');
  const lessonIdParam = searchParams.get('lessonId');
  const lessonNameParam = searchParams.get('lessonName');

  // Main Tabs State: 'IN_PERSON' (حضوری) or 'ONLINE' (آنلاین)
  const [activeTab, setActiveTab] = useState<'IN_PERSON' | 'ONLINE'>('IN_PERSON');

  const [exams, setExams] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Selected Exam Modals
  const [selectedInPersonExam, setSelectedInPersonExam] = useState<any | null>(null);
  const [selectedOnlineExam, setSelectedOnlineExam] = useState<any | null>(null);

  // Filters & Sorting
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedLessonFilter, setSelectedLessonFilter] = useState<string>(lessonIdParam || 'ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('ALL');
  const [sortOption, setSortOption] = useState<string>('DEFAULT');

  // Active Exam Taking Session (Online Only)
  const [activeExam, setActiveExam] = useState<any | null>(null);
  const [currentAnswers, setCurrentAnswers] = useState<Record<string, { selectedOptionId?: string; textAnswer?: string }>>({});
  const [timeLeftSeconds, setTimeLeftSeconds] = useState<number>(3600);
  const [tabSwitches, setTabSwitches] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [examResult, setExamResult] = useState<any | null>(null);
  const [isStartingId, setIsStartingId] = useState<string | null>(null);

  const fetchExams = async () => {
    try {
      setIsLoading(true);
      const res = await apiClient.get('/exams');
      const data = res.data || [];
      setExams(data);

      if (examIdParam && actionParam === 'start' && data.length > 0) {
        const target = data.find((e: any) => e.id === examIdParam);
        if (target) {
          setActiveTab('ONLINE');
          handleStartExam(target);
        }
      }
    } catch (err) {
      console.error('Failed to load exams', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchExams();
  }, [examIdParam]);

  // Keep lesson filter synced with URL if changed
  useEffect(() => {
    if (lessonIdParam) {
      setSelectedLessonFilter(lessonIdParam);
    }
  }, [lessonIdParam]);

  // Timer Effect for Active Online Exam
  useEffect(() => {
    if (!activeExam || examResult) return;

    const timer = setInterval(() => {
      setTimeLeftSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmitExam();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [activeExam, examResult]);

  // Anti-Cheat Tab Switch Detection (Online Exam)
  useEffect(() => {
    if (!activeExam || examResult) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        setTabSwitches((prev) => {
          const next = prev + 1;
          apiClient.post(`/exams/${activeExam.id}/tab-switch`, { count: next }).catch(() => {});
          return next;
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [activeExam, examResult]);

  const handleStartExam = async (exam: any) => {
    try {
      setIsStartingId(exam.id);
      const res: any = await apiClient.post(`/exams/${exam.id}/start`);
      const payload = res.data || res;
      const questions = payload.questions || [];
      const participation = payload.participation || {};

      let remainingSec = (exam.durationMinutes || 60) * 60;
      if (participation.serverDeadline) {
        const deadline = new Date(participation.serverDeadline).getTime();
        const now = Date.now();
        const diff = Math.floor((deadline - now) / 1000);
        if (diff > 0) {
          remainingSec = Math.min(remainingSec, diff);
        }
      }

      setActiveExam({
        ...exam,
        ...payload.exam,
        questions,
        participationId: participation.id,
      });
      setTimeLeftSeconds(remainingSec);
      setTabSwitches(0);
      setExamResult(null);
    } catch (err: any) {
      console.error('Failed to start exam', err);
      const msg =
        err.response?.data?.message || err.message || 'امکان ورود به آزمون وجود ندارد.';
      alert(Array.isArray(msg) ? msg.join('، ') : msg);
    } finally {
      setIsStartingId(null);
    }
  };

  const handleSelectOption = (questionId: string, optionId: string) => {
    setCurrentAnswers((prev) => ({
      ...prev,
      [questionId]: { ...prev[questionId], selectedOptionId: optionId },
    }));
  };

  const handleTextAnswer = (questionId: string, text: string) => {
    setCurrentAnswers((prev) => ({
      ...prev,
      [questionId]: { ...prev[questionId], textAnswer: text },
    }));
  };

  const handleSubmitExam = async () => {
    if (!activeExam) return;
    setIsSubmitting(true);
    try {
      const answersPayload = (activeExam.questions || []).map((q: any) => {
        const qKey = q.questionId || q.id;
        const ans = currentAnswers[qKey];
        const item: any = { questionId: qKey };
        if (ans?.selectedOptionId) {
          item.selectedOptionId = ans.selectedOptionId;
        }
        const text = ans?.textAnswer;
        if (text && typeof text === 'string' && text.trim().length > 0) {
          item.descriptiveAnswer = text.trim();
          item.textAnswer = text.trim();
        }
        return item;
      });

      const res: any = await apiClient.post(`/exams/${activeExam.id}/submit`, {
        tabSwitchCount: tabSwitches,
        answers: answersPayload,
      });

      setExamResult(res.data || res);
      fetchExams();
    } catch (err: any) {
      const msg =
        err.response?.data?.message || err.message || 'خطا در ثبت آزمون.';
      alert(Array.isArray(msg) ? msg.join('، ') : msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTime = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${toPersianDigits(mins.toString().padStart(2, '0'))}:${toPersianDigits(secs.toString().padStart(2, '0'))}`;
  };

  // Helper to distinguish in-person vs online exams
  const isInPersonExam = (e: any) => {
    const type = e.examType || e.type || '';
    return type === 'PAPER_BASED' || type === 'IN_PERSON' || e.isOnline === false;
  };

  // Separate exams into in-person and online
  const inPersonExams = useMemo(() => exams.filter(isInPersonExam), [exams]);
  const onlineExams = useMemo(() => exams.filter((e) => !isInPersonExam(e)), [exams]);

  // Lessons list for filter dropdown
  const lessonOptions = useMemo<FilterOption[]>(() => {
    const map = new Map<string, string>();
    exams.forEach((e) => {
      const lid = e.lessonId || e.lesson?.id;
      const lname = e.lesson?.name || 'سایر دروس';
      if (lid && !map.has(lid)) {
        map.set(lid, lname);
      }
    });

    const list: FilterOption[] = [{ value: 'ALL', label: 'همه درس‌ها' }];
    map.forEach((name, id) => {
      list.push({ value: id, label: name });
    });
    return list;
  }, [exams]);

  // 4 standard exam statuses:
  // 1. برنامه‌ریزی شده (SCHEDULED) - آبی
  // 2. در حال برگزاری (HOLDING) - رز متحرک
  // 3. در انتظار ثبت نمره (PENDING_GRADING) - کهربایی
  // 4. اعلام نمره (RESULTS_PUBLISHED) - سبز زمردی
  const statusOptions: FilterOption[] = [
    { value: 'ALL', label: 'همه وضعیت‌ها' },
    { value: 'SCHEDULED', label: 'برنامه‌ریزی شده', colorDot: 'bg-sky-500' },
    { value: 'HOLDING', label: 'در حال برگزاری', colorDot: 'bg-rose-500' },
    { value: 'PENDING_GRADING', label: 'در انتظار ثبت نمره', colorDot: 'bg-amber-500' },
    { value: 'RESULTS_PUBLISHED', label: 'اعلام نمره', colorDot: 'bg-emerald-500' },
  ];

  const sortOptions: FilterOption[] = [
    { value: 'DEFAULT', label: 'ترتیب هوشمند وضعیت (پیش‌فرض)' },
    { value: 'DATE_ASC', label: 'نزدیک‌ترین زمان برگزاری (صعودی)' },
    { value: 'DATE_DESC', label: 'جدیدترین تاریخ (نزولی)' },
    { value: 'SCORE_DESC', label: 'بیشترین بارم نمره' },
  ];

  // Helper to determine status info for any exam
  const getExamStatusInfo = (exam: any) => {
    const now = Date.now();
    const start = new Date(exam.startTime).getTime();
    const end = new Date(exam.endTime).getTime();
    const part = exam.participations?.[0];
    const hasScore = part?.totalScore !== null && part?.totalScore !== undefined;
    const isSubmitted = part?.status === 'SUBMITTED' || part?.status === 'TIMED_OUT';

    // 1. اعلام نمره (Score is officially published or available)
    if (hasScore || !!part?.isResultsPublished || !!exam.isResultsPublished) {
      return {
        key: 'RESULTS_PUBLISHED',
        label: 'اعلام نمره',
        className: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800',
        dotColor: 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]',
      };
    }

    // 2. در حال برگزاری (Exam is live right now within start and end time window)
    if (now >= start && now <= end && !isSubmitted && exam.status !== 'FINISHED') {
      return {
        key: 'HOLDING',
        label: 'در حال برگزاری',
        className: 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800 animate-pulse',
        dotColor: 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)] animate-ping',
      };
    }

    // 3. در انتظار ثبت نمره (Past holding time or submitted)
    if (now > end || isSubmitted || exam.status === 'FINISHED') {
      return {
        key: 'PENDING_GRADING',
        label: 'در انتظار ثبت نمره',
        className: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800',
        dotColor: 'bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.5)]',
      };
    }

    // 4. برنامه‌ریزی شده (Upcoming) - آبی
    return {
      key: 'SCHEDULED',
      label: 'برنامه‌ریزی شده',
      className: 'bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border-sky-300 dark:border-sky-800',
      dotColor: 'bg-sky-500 shadow-[0_0_6px_rgba(14,165,233,0.5)]',
    };
  };

  // Helper: Get Question Types Label for exam (تستی، تشریحی یا ترکیبی)
  const getExamQuestionTypeLabel = (exam: any) => {
    const questions = exam.questions || [];
    if (questions.length > 0) {
      const types = new Set(
        questions.map((q: any) => q.question?.type || q.type).filter(Boolean)
      );
      const hasMC = types.has('MULTIPLE_CHOICE');
      const hasDesc = types.has('DESCRIPTIVE');
      if (hasMC && hasDesc) return 'ترکیبی (تستی و تشریحی)';
      if (hasMC && !hasDesc) return 'تستی (چهارگزینه‌ای)';
      if (!hasMC && hasDesc) return 'تشریحی';
    }

    const text = `${exam.title || ''} ${exam.description || ''}`.toLowerCase();
    if (text.includes('ترکیبی') || (text.includes('تستی') && text.includes('تشریحی'))) {
      return 'ترکیبی (تستی و تشریحی)';
    }
    if (text.includes('تستی') || text.includes('چهارگزینه') || text.includes('تست')) {
      return 'تستی (چهارگزینه‌ای)';
    }
    if (text.includes('تشریحی')) {
      return 'تشریحی';
    }

    if (isInPersonExam(exam)) {
      return 'ترکیبی (تستی و تشریحی)';
    }
    return 'تستی (چهارگزینه‌ای)';
  };

  // Helper: Get Exam Category Badge (Shared across In-Person & Online)
  // Exact 4 categories: آزمون کلاسی / امتحان مستمر / نوبت اول / نوبت دوم
  const getExamCategory = (exam: any) => {
    const round = exam.round || '';
    const title = (exam.title || '').toLowerCase();
    const desc = (exam.description || '').toLowerCase();

    if (round === 'MIDTERM_1' || title.includes('نوبت اول') || desc.includes('نوبت اول')) {
      return {
        label: 'نوبت اول',
        className: 'bg-college-light dark:bg-[#38260D] text-third dark:text-[#FBBF24] border-third/30',
      };
    }
    if (round === 'FINAL_2' || title.includes('نوبت دوم') || desc.includes('نوبت دوم') || title.includes('خرداد')) {
      return {
        label: 'نوبت دوم',
        className: 'bg-club-light dark:bg-[#2A173E] text-club dark:text-[#C084FC] border-club/30',
      };
    }
    if (round === 'CONTINUOUS' || title.includes('مستمر') || desc.includes('مستمر')) {
      return {
        label: 'امتحان مستمر',
        className: 'bg-ecosystem-light dark:bg-[#163330] text-primary-dark dark:text-primary border-primary/30',
      };
    }
    return {
      label: 'آزمون کلاسی',
      className: 'bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border-sky-300 dark:border-sky-800',
    };
  };

  // Helper: Format Time Range
  const formatExamTimeRange = (startInput: string | Date, endInput: string | Date) => {
    const s = new Date(startInput);
    const e = new Date(endInput);
    if (isNaN(s.getTime())) return '';
    const sH = String(s.getHours()).padStart(2, '0');
    const sM = String(s.getMinutes()).padStart(2, '0');
    if (isNaN(e.getTime())) {
      return `ساعت ${toPersianDigits(`${sH}:${sM}`)}`;
    }
    const eH = String(e.getHours()).padStart(2, '0');
    const eM = String(e.getMinutes()).padStart(2, '0');
    return `${toPersianDigits(`${sH}:${sM}`)} الی ${toPersianDigits(`${eH}:${eM}`)}`;
  };

  // Number of exams currently in progress (HOLDING)
  const holdingExamsCount = useMemo(() => {
    return exams.filter((e) => getExamStatusInfo(e).key === 'HOLDING').length;
  }, [exams]);

  // Check if any filter is active
  const hasActiveFilters =
    searchQuery.trim().length > 0 ||
    selectedLessonFilter !== 'ALL' ||
    selectedStatusFilter !== 'ALL' ||
    sortOption !== 'DEFAULT';

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedLessonFilter('ALL');
    setSelectedStatusFilter('ALL');
    setSortOption('DEFAULT');
    if (lessonIdParam) {
      searchParams.delete('lessonId');
      searchParams.delete('lessonName');
      setSearchParams(searchParams);
    }
  };

  // Filtered and Sorted Exams for Current Active Tab
  const displayedExams = useMemo(() => {
    const baseList = activeTab === 'IN_PERSON' ? inPersonExams : onlineExams;

    const filtered = baseList.filter((exam) => {
      // 0. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const title = (exam.title || '').toLowerCase();
        const desc = (exam.description || '').toLowerCase();
        const lesson = (exam.lesson?.name || '').toLowerCase();
        const teacher = `${exam.teacher?.user?.firstName || ''} ${exam.teacher?.user?.lastName || ''}`.toLowerCase();
        if (!title.includes(q) && !desc.includes(q) && !lesson.includes(q) && !teacher.includes(q)) {
          return false;
        }
      }

      // 1. Lesson Filter
      if (selectedLessonFilter !== 'ALL') {
        const lid = exam.lessonId || exam.lesson?.id;
        if (lid !== selectedLessonFilter) return false;
      }

      // 2. Status Filter
      if (selectedStatusFilter !== 'ALL') {
        const statusInfo = getExamStatusInfo(exam);
        if (statusInfo.key !== selectedStatusFilter) return false;
      }

      return true;
    });

    // 3. Sorting
    return filtered.sort((a, b) => {
      if (sortOption === 'DEFAULT') {
        const statusA = getExamStatusInfo(a).key;
        const statusB = getExamStatusInfo(b).key;

        // اولویت تقدم وضعیت‌ها:
        // ۱. آزمون‌های در حال برگزاری (HOLDING)
        // ۲. نزدیک‌ترین آزمون‌های برنامه‌ریزی شده (SCHEDULED)
        // ۳. نزدیک‌ترین آزمون‌های در انتظار اعلام نمره (PENDING_GRADING)
        // ۴. آزمون‌های اعلام نمره (RESULTS_PUBLISHED)
        const getStatusPriority = (key: string): number => {
          switch (key) {
            case 'HOLDING':
              return 1;
            case 'SCHEDULED':
              return 2;
            case 'PENDING_GRADING':
              return 3;
            case 'RESULTS_PUBLISHED':
              return 4;
            default:
              return 5;
          }
        };

        const priorityA = getStatusPriority(statusA);
        const priorityB = getStatusPriority(statusB);

        if (priorityA !== priorityB) {
          return priorityA - priorityB;
        }

        const timeA = new Date(a.startTime).getTime();
        const timeB = new Date(b.startTime).getTime();

        // ۱. در حال برگزاری: صعودی زمان شروع
        if (statusA === 'HOLDING') {
          return timeA - timeB;
        }

        // ۲. برنامه‌ریزی شده: نزدیک‌ترین زمان برگزاری آینده (صعودی)
        if (statusA === 'SCHEDULED') {
          return timeA - timeB;
        }

        // ۳. در انتظار اعلام نمره: نزدیک‌ترین‌ها به زمان حال (نزولی)
        if (statusA === 'PENDING_GRADING') {
          return timeB - timeA;
        }

        // ۴. اعلام نمره: جدیدترین‌ها بالاتر (نزولی)
        if (statusA === 'RESULTS_PUBLISHED') {
          return timeB - timeA;
        }

        return timeB - timeA;
      }

      if (sortOption === 'DATE_ASC') {
        return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
      }
      if (sortOption === 'DATE_DESC') {
        return new Date(b.startTime).getTime() - new Date(a.startTime).getTime();
      }
      if (sortOption === 'SCORE_DESC') {
        return (b.totalScore || 20) - (a.totalScore || 20);
      }
      return 0;
    });
  }, [activeTab, inPersonExams, onlineExams, searchQuery, selectedLessonFilter, selectedStatusFilter, sortOption]);

  // ACTIVE EXAM TAKING VIEW (Online only)
  if (activeExam) {
    if (examResult) {
      return (
        <div className="max-w-2xl mx-auto py-8 px-4 animate-in fade-in duration-300">
          <Card className="p-8 text-center space-y-6 bg-white dark:bg-[#151C28] border-[1.5px] border-primary-dark/30 shadow-[3px_3px_0_#59BBAF] rounded-2xl">
            <div className="h-16 w-16 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto border border-emerald-500/30">
              <CheckCircle2 className="h-10 w-10" />
            </div>

            <h2 className="text-xl sm:text-2xl font-black text-ink-darker dark:text-white">
              پاسخ‌برگ شما با موفقیت ثبت شد!
            </h2>
            <p className="text-xs text-muted-foreground dark:text-slate-400">
              آزمون «{activeExam.title}» در سامانه با موفقیت تحویل داده شد.
            </p>

            <div className="bg-gray-50 dark:bg-[#1C2536] p-6 rounded-2xl border border-gray-200 dark:border-[#242F42] space-y-3">
              <div className="text-sm sm:text-base font-bold text-ink-dark dark:text-white">
                پاسخ‌برگ در انتظار بررسی و ثبت نمره توسط مربی است
              </div>
              <p className="text-xs text-muted-foreground dark:text-slate-400 leading-relaxed max-w-md mx-auto">
                پس از اتمام مهلت آزمون، بررسی پاسخ‌های تشریحی و انتشار کارنامه توسط مربی محترم، نمره نهایی و بازخوردها در این بخش قابل مشاهده خواهد بود.
              </p>

              {tabSwitches > 0 && (
                <div className="text-xs text-rose-600 dark:text-rose-400 font-bold flex items-center justify-center gap-1 pt-2">
                  <AlertTriangle className="h-4 w-4" />
                  <span>ثبت {toPersianDigits(tabSwitches)} مرتبه خروج از صفحه آزمون</span>
                </div>
              )}
            </div>

            <Button
              variant="primary"
              onClick={() => {
                setActiveExam(null);
                setExamResult(null);
                fetchExams();
              }}
              className="px-6 h-11 rounded-xl font-black text-xs sm:text-sm shadow-[2px_2px_0_#438C83]"
            >
              بازگشت به لیست آزمون‌ها
            </Button>
          </Card>
        </div>
      );
    }

    return (
      <div className="space-y-6 pb-12 max-w-4xl mx-auto px-3.5 sm:px-6">
        {/* Sticky Exam Timer Header */}
        <div className="sticky top-20 z-20 bg-white dark:bg-[#151C28] p-4 rounded-2xl border-[1.5px] border-primary-dark/30 dark:border-gray-800 shadow-[2px_2px_0_#59BBAF] dark:shadow-[2px_2px_0_#0B0F17] flex flex-wrap gap-3 justify-between items-center">
          <div>
            <h3 className="font-black text-sm sm:text-base text-ink-darker dark:text-white">{activeExam.title}</h3>
            <span className="text-xs text-muted-foreground dark:text-slate-400">{activeExam.lesson?.name || 'آزمون آنلاین'}</span>
          </div>

          <div className="flex items-center gap-3">
            {tabSwitches > 0 && (
              <Badge variant="destructive" className="text-xs font-bold">
                هشدار: {toPersianDigits(tabSwitches)} بار خروج از تب
              </Badge>
            )}

            <div className="flex items-center gap-2 bg-primary/10 dark:bg-primary/20 px-3.5 py-2 rounded-xl text-primary-dark dark:text-primary font-black text-sm border border-primary/25">
              <Clock className="h-4 w-4 text-primary" />
              <span>{formatTime(timeLeftSeconds)}</span>
            </div>

            <Button
              variant="primary"
              onClick={handleSubmitExam}
              isLoading={isSubmitting}
              className="text-xs font-bold h-10 px-4 rounded-xl shadow-[2px_2px_0_#438C83]"
            >
              اتمام و ثبت آزمون
            </Button>
          </div>
        </div>

        {/* Questions List */}
        {!activeExam.questions || activeExam.questions.length === 0 ? (
          <Card className="p-8 text-center bg-gray-50 dark:bg-[#151C28] border border-gray-200 dark:border-[#242F42] rounded-2xl max-w-xl mx-auto space-y-4">
            <div className="h-12 w-12 rounded-2xl bg-amber-100 dark:bg-amber-950/50 text-amber-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <h4 className="font-black text-base text-ink-darker dark:text-white">سوالی برای این آزمون ثبت نشده است</h4>
            <p className="text-xs text-muted-foreground dark:text-slate-400 leading-relaxed">
              مربی محترم هنوز سوالات این آزمون را در سامانه بارگذاری نکرده است. لطفاً پس از ثبت سوالات توسط مربی مجدداً مراجعه فرمایید.
            </p>
            <Button
              variant="outline"
              onClick={() => {
                setActiveExam(null);
                setExamResult(null);
              }}
              className="text-xs rounded-xl"
            >
              بازگشت به لیست آزمون‌ها
            </Button>
          </Card>
        ) : (
          <div className="space-y-4">
            {activeExam.questions.map((q: any, qIdx: number) => {
              const qKey = q.questionId || q.id;
              return (
                <Card key={qKey} className="p-5 sm:p-6 border border-gray-200 dark:border-[#242F42] bg-white dark:bg-[#151C28] rounded-2xl shadow-xs">
                  <div className="flex justify-between items-start mb-3">
                    <span className="font-bold text-xs bg-gray-100 dark:bg-gray-800 text-ink-dark dark:text-slate-300 px-3 py-1 rounded-lg">
                      سوال شماره {toPersianDigits(qIdx + 1)}
                    </span>
                    <span className="text-xs font-black text-primary">
                      {toPersianDigits(q.score || 2)} نمره
                    </span>
                  </div>

                  <h4 className="text-sm font-bold text-ink-darker dark:text-white mb-4 leading-relaxed whitespace-pre-wrap">
                    {q.text}
                  </h4>

                  {/* Multiple Choice Options */}
                  {q.type === 'MULTIPLE_CHOICE' && q.options && (
                    <div className="space-y-2">
                      {q.options.map((opt: any) => {
                        const isSelected = currentAnswers[qKey]?.selectedOptionId === opt.id;

                        return (
                          <div
                            key={opt.id}
                            onClick={() => handleSelectOption(qKey, opt.id)}
                            className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-center gap-3 text-xs sm:text-[13px] ${
                              isSelected
                                ? 'border-primary bg-primary/10 text-primary-dark dark:text-primary font-black shadow-xs'
                                : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1C2536] hover:bg-gray-50 dark:hover:bg-[#242F42] text-ink-normal dark:text-slate-300 font-bold'
                            }`}
                          >
                            <div
                              className={`h-5 w-5 rounded-full border flex items-center justify-center shrink-0 ${
                                isSelected ? 'border-primary bg-primary text-white' : 'border-gray-300 dark:border-gray-600'
                              }`}
                            >
                              {isSelected && <Check className="h-3.5 w-3.5 text-white" />}
                            </div>
                            <span>{opt.text}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Descriptive Question */}
                  {q.type === 'DESCRIPTIVE' && (
                    <div>
                      <textarea
                        rows={4}
                        placeholder="پاسخ تشریحی خود را اینجا تایپ کنید..."
                        value={currentAnswers[qKey]?.textAnswer || ''}
                        onChange={(e) => handleTextAnswer(qKey, e.target.value)}
                        className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#1C2536] p-3 text-xs text-ink-darker dark:text-white focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                      />
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // STANDARD LIST VIEW
  return (
    <div className="space-y-4 sm:space-y-5 pb-12 max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 animate-in fade-in duration-300">
      {/* 1. Header & Controls Master Panel */}
      <div className="bg-white dark:bg-[#151C28] rounded-2xl border-[1.5px] border-primary-dark/30 dark:border-gray-800 shadow-[2px_2px_0_#59BBAF] dark:shadow-[2px_2px_0_#0B0F17] p-4 sm:p-5 space-y-4">
        {/* Top Row: Title, Matching Icon with Home Page, and Filter Button */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            {/* Icon matching home page: HelpCircle with primary palette aligned with Homework page */}
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary dark:text-primary border border-primary/25 flex items-center justify-center font-black shadow-2xs shrink-0">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div className="flex items-center gap-2 min-w-0">
              <h1 className="text-lg sm:text-2xl font-black text-ink-darker dark:text-white truncate">
                آزمون‌ها
              </h1>
              {holdingExamsCount > 0 && (
                <span className="min-w-[20px] h-[20px] px-1.5 rounded-full bg-rose-500 text-white text-[11px] font-black flex items-center justify-center leading-none animate-pulse shadow-xs select-none">
                  {toPersianDigits(holdingExamsCount)}
                </span>
              )}
            </div>
          </div>

          {/* Action Buttons: Filter Toggle Only */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setIsFilterOpen((prev) => !prev)}
              className={`relative cursor-pointer select-none flex items-center justify-center w-10 h-10 rounded-xl border-[1.5px] transition-all duration-150 active:translate-x-[1px] active:translate-y-[1px] shrink-0 ${
                isFilterOpen || hasActiveFilters
                  ? 'bg-primary text-white border-primary-dark shadow-[2px_2px_0_#438C83]'
                  : 'bg-gray-50 dark:bg-[#1C2536] text-muted-foreground dark:text-slate-300 border-gray-200 dark:border-[#242F42] hover:bg-gray-100 dark:hover:bg-[#253248] shadow-[2px_2px_0_#CBD5E1] dark:shadow-[2px_2px_0_#0F172A]'
              }`}
              title={isFilterOpen ? 'بستن فیلترها' : 'نمایش فیلترها'}
              aria-label={isFilterOpen ? 'بستن فیلترها' : 'نمایش فیلترها'}
            >
              <Filter className="w-4 h-4 shrink-0" />
              {hasActiveFilters && (
                <span className="absolute top-1.5 left-1.5 w-2 h-2 rounded-full bg-girl ring-2 ring-white dark:ring-[#151C28]" />
              )}
            </button>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-100 dark:border-gray-800/80" />

        {/* Bottom Row: Segmented Tabs (حضوری و آنلاین) - No text below */}
        <div className="flex items-center justify-start">
          <div className="inline-flex items-center p-1 rounded-xl bg-gray-100/90 dark:bg-gray-800/90 border border-gray-200/70 dark:border-gray-700/70 w-full sm:w-auto">
            {/* Tab 1: حضوری */}
            <button
              type="button"
              onClick={() => setActiveTab('IN_PERSON')}
              className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer active:translate-x-[1px] active:translate-y-[1px] ${
                activeTab === 'IN_PERSON'
                  ? 'bg-white dark:bg-[#151C28] text-primary-dark dark:text-primary border border-primary/25 dark:border-gray-700 shadow-[1.5px_1.5px_0_#59BBAF] dark:shadow-[1.5px_1.5px_0_#0B0F17]'
                  : 'text-gray-600 dark:text-gray-400 hover:text-ink-darker dark:hover:text-white font-bold'
              }`}
            >
              <School className="w-4 h-4 text-primary" />
              <span>حضوری</span>
              <span
                className={`min-w-[20px] h-[20px] px-1.5 rounded-full text-[11px] font-black flex items-center justify-center leading-none ${
                  activeTab === 'IN_PERSON' ? 'bg-primary text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
              >
                {toPersianDigits(inPersonExams.length)}
              </span>
            </button>

            {/* Tab 2: آنلاین */}
            <button
              type="button"
              onClick={() => setActiveTab('ONLINE')}
              className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer active:translate-x-[1px] active:translate-y-[1px] ${
                activeTab === 'ONLINE'
                  ? 'bg-white dark:bg-[#151C28] text-primary-dark dark:text-primary border border-primary/25 dark:border-gray-700 shadow-[1.5px_1.5px_0_#59BBAF] dark:shadow-[1.5px_1.5px_0_#0B0F17]'
                  : 'text-gray-600 dark:text-gray-400 hover:text-ink-darker dark:hover:text-white font-bold'
              }`}
            >
              <Laptop className="w-4 h-4 text-sec" />
              <span>آنلاین</span>
              <span
                className={`min-w-[20px] h-[20px] px-1.5 rounded-full text-[11px] font-black flex items-center justify-center leading-none ${
                  activeTab === 'ONLINE' ? 'bg-sec text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
              >
                {toPersianDigits(onlineExams.length)}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Collapsible Filter & Sort Drawer (Smooth grid-height transition) */}
      <div
        className={`relative z-40 grid transition-all duration-300 ease-in-out ${
          isFilterOpen
            ? 'grid-rows-[1fr] opacity-100 translate-y-0'
            : 'grid-rows-[0fr] opacity-0 -translate-y-2 pointer-events-none'
        }`}
      >
        <div className={`min-h-0 ${isFilterOpen ? 'overflow-visible' : 'overflow-hidden'}`}>
          <div className="bg-white dark:bg-[#151C28] rounded-2xl border border-gray-200/80 dark:border-[#242F42] p-3.5 sm:p-4 shadow-xs space-y-3">
            {/* Search Input Box */}
            <div className="relative">
              <input
                type="text"
                placeholder="جستجو در عنوان آزمون، نام درس یا مربی..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-10 pr-9 pl-9 text-xs sm:text-[13px] rounded-xl border border-gray-200 dark:border-[#242F42] bg-gray-50 dark:bg-[#1C2536] text-ink-darker dark:text-white focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground dark:placeholder:text-slate-500 font-bold transition-all"
              />
              <Search className="w-4 h-4 text-muted-foreground dark:text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 shrink-0 pointer-events-none" />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-ink-darker dark:hover:text-white p-0.5 rounded-md cursor-pointer"
                  title="پاک کردن جستجو"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex flex-col md:flex-row md:items-center gap-3 justify-between">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 flex-1">
                {/* Lesson Filter */}
                <CustomFilterDropdown
                  label="درس:"
                  labelIcon={BookOpen}
                  iconColorClass="text-primary"
                  options={lessonOptions}
                  value={selectedLessonFilter}
                  onChange={setSelectedLessonFilter}
                />

                {/* Status Filter (Exact 4 statuses requested by user) */}
                <CustomFilterDropdown
                  label="وضعیت آزمون:"
                  labelIcon={CheckCircle2}
                  iconColorClass="text-third-dark dark:text-third"
                  options={statusOptions}
                  value={selectedStatusFilter}
                  onChange={setSelectedStatusFilter}
                />

                {/* Sort Order */}
                <CustomFilterDropdown
                  label="مرتب‌سازی تاریخ:"
                  labelIcon={ArrowUpDown}
                  iconColorClass="text-sec-dark dark:text-sec"
                  options={sortOptions}
                  value={sortOption}
                  onChange={setSortOption}
                />
              </div>

              {/* Reset Filters */}
              {hasActiveFilters && (
                <div className="flex items-end pt-1 md:pt-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={resetFilters}
                    className="text-xs h-10 gap-1.5 text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl"
                    title="پاک کردن تمام فیلترها"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>بازنشانی فیلترها</span>
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Lesson Filter Banner if filtered by URL */}
      {lessonIdParam && (
        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-primary/10 border border-primary/25 text-xs text-foreground">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-primary">
              <Filter className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold text-primary">
                فیلتر شده بر اساس درس: {lessonNameParam || 'درس انتخاب‌شده'}
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                تعداد {toPersianDigits(displayedExams.length)} آزمون برای این درس برنامه‌ریزی شده است.
              </div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={resetFilters}
            className="text-xs h-8 gap-1 hover:bg-surface"
          >
            <X className="w-3.5 h-3.5" />
            <span>نمایش همه آزمون‌ها</span>
          </Button>
        </div>
      )}

      {/* 3. Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4 relative z-0">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="p-5 border border-gray-200 dark:border-[#242F42] shadow-xs rounded-2xl bg-white dark:bg-[#151C28]">
              <div className="flex justify-between mb-3">
                <Skeleton className="h-6 w-28 rounded-lg" />
                <Skeleton className="h-6 w-16 rounded-lg" />
              </div>
              <Skeleton className="h-5 w-full mb-3 rounded-lg" />
              <Skeleton className="h-16 w-full mb-3 rounded-xl" />
              <Skeleton className="h-10 w-full rounded-xl" />
            </Card>
          ))
        ) : displayedExams.length === 0 ? (
          <div className="col-span-full text-center py-14 bg-white dark:bg-[#151C28] rounded-2xl border border-dashed border-gray-200 dark:border-[#242F42]">
            <CheckCircle2 className="w-10 h-10 text-primary mx-auto mb-2.5 opacity-60" />
            <h3 className="text-sm sm:text-base font-bold text-foreground dark:text-white">
              {activeTab === 'IN_PERSON'
                ? 'هیچ آزمون حضوری با شرایط انتخاب‌شده یافت نشد'
                : 'هیچ آزمون آنلاینی با شرایط انتخاب‌شده یافت نشد'}
            </h3>
            <p className="text-xs text-muted-foreground dark:text-slate-400 mt-1">
              {hasActiveFilters
                ? 'می‌توانید فیلترهای بالا را تغییر دهید یا بازنشانی نمایید.'
                : 'در حال حاضر هیچ آزمونی در این بخش برای شما برنامه‌ریزی نشده است.'}
            </p>
          </div>
        ) : (
          displayedExams.map((exam) => {
            const isPaper = isInPersonExam(exam);
            const participation = exam.participations?.[0];
            const isSubmitted = participation?.status === 'SUBMITTED' || participation?.status === 'TIMED_OUT';
            const isResultsPublished = !!participation?.isResultsPublished || !!exam.isResultsPublished;
            const teacherName =
              exam.teacher?.user?.firstName || exam.teacher?.user?.lastName
                ? `${exam.teacher?.user?.firstName || ''} ${exam.teacher?.user?.lastName || ''}`.trim()
                : 'مربی مربوطه';

            const statusInfo = getExamStatusInfo(exam);
            const hasScore = participation?.totalScore !== null && participation?.totalScore !== undefined;

            /* ==============================================================
             * 3.A: IN-PERSON EXAM CARD
             * ============================================================== */
            if (isPaper) {
              const category = getExamCategory(exam);

              return (
                <div
                  key={exam.id}
                  className="p-5 rounded-2xl bg-white dark:bg-[#151C28] border-[1.5px] border-gray-200/90 dark:border-[#242F42] hover:border-primary/60 dark:hover:border-primary/60 shadow-xs hover:shadow-[3px_3px_0_#59BBAF] dark:hover:shadow-[3px_3px_0_#1F413D] transition-all flex flex-col justify-between space-y-3.5 group select-none relative z-0"
                >
                  <div className="space-y-3">
                    {/* Top Row: Category Badge (Right) & Status Badge (Left) */}
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-[11px] px-2.5 py-1 rounded-lg font-black border ${category.className}`}>
                        {category.label}
                      </span>

                      <span
                        className={`relative z-0 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border transition-colors select-none ${statusInfo.className}`}
                      >
                        <span className="relative flex h-2 w-2">
                          {statusInfo.key === 'HOLDING' && (
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                          )}
                          <span className={`relative inline-flex rounded-full h-2 w-2 ${statusInfo.dotColor.split(' ')[0]}`} />
                        </span>
                        <span>{statusInfo.label}</span>
                      </span>
                    </div>

                    {/* Title */}
                    <div>
                      <h3 className="font-black text-base text-ink-darker dark:text-white leading-snug group-hover:text-primary transition-colors">
                        {exam.title}
                      </h3>
                    </div>

                    {/* Lesson & Teacher (Exactly styled like Homework Card) */}
                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground dark:text-slate-400 font-medium">
                      <div className="flex items-center gap-1.5 font-bold text-ink-darker dark:text-slate-200">
                        <BookOpen className="w-3.5 h-3.5 text-primary shrink-0" />
                        <span>{exam.lesson?.name || 'درس تخصصی'}</span>
                      </div>
                      {teacherName && (
                        <div className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-sec shrink-0" />
                          <span>{teacherName}</span>
                        </div>
                      )}
                    </div>

                    {/* Score Section on Card (When score is recorded/published) */}
                    {hasScore && (
                      <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-50/90 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-xs shadow-2xs">
                        <div className="flex items-center gap-1.5 text-emerald-800 dark:text-emerald-300 font-bold">
                          <Award className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>نمره آزمون:</span>
                        </div>
                        <div className="font-black text-sm text-emerald-700 dark:text-emerald-300">
                          {toPersianDigits(participation.totalScore)} از {toPersianDigits(exam.totalScore || 20)}
                        </div>
                      </div>
                    )}

                    {/* Timing & Score Matrix */}
                    <div className="bg-gray-50/80 dark:bg-[#1C2536] rounded-xl p-3 border border-gray-100 dark:border-[#242F42] space-y-2 text-xs">
                      {/* Date & Time */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 text-ink-darker dark:text-slate-200 font-bold">
                          <Calendar className="w-3.5 h-3.5 text-primary shrink-0" />
                          <span>{formatJalaliDisplay(exam.startTime, true)}</span>
                        </div>
                        <div className="flex items-center gap-1 text-muted-foreground dark:text-slate-400 font-medium">
                          <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                          <span>{formatExamTimeRange(exam.startTime, exam.endTime)}</span>
                        </div>
                      </div>

                      {/* Duration & Total Score */}
                      <div className="flex items-center justify-between gap-2 pt-2 border-t border-gray-200/50 dark:border-gray-800">
                        <div className="flex items-center gap-1.5 text-muted-foreground dark:text-slate-400" title="مدت زمان آزمون">
                          <Clock className="w-3.5 h-3.5 text-muted-foreground dark:text-slate-400 shrink-0" />
                          <strong className="text-ink-darker dark:text-white">{toPersianDigits(exam.durationMinutes)} دقیقه</strong>
                        </div>
                        <div className="flex items-center gap-1 font-black text-emerald-600 dark:text-emerald-400">
                          <Award className="w-3.5 h-3.5 shrink-0" />
                          <span>بارم: {toPersianDigits(exam.totalScore || 20)} نمره</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Footer Action Button */}
                  <div className="pt-3 mt-1 border-t border-gray-100 dark:border-[#242F42]">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedInPersonExam(exam)}
                      className="w-full text-xs flex items-center justify-center gap-1.5 h-9 sm:h-10 rounded-xl font-bold bg-white dark:bg-[#1C2536] border-gray-200 dark:border-[#242F42] text-foreground dark:text-white hover:bg-gray-50 dark:hover:bg-[#242F42] shadow-2xs transition-colors cursor-pointer"
                    >
                      <Eye className="w-4 h-4 text-primary shrink-0" />
                      <span>مشاهده جزئیات و نتیجه آزمون</span>
                    </Button>
                  </div>
                </div>
              );
            }

            /* ==============================================================
             * 3.B: ONLINE EXAM CARD (Matching In-Person Card Structure)
             * ============================================================== */
            const category = getExamCategory(exam);
            const hasQuestions = (exam._count?.questions || 0) > 0;

            return (
              <div
                key={exam.id}
                className="p-5 rounded-2xl bg-white dark:bg-[#151C28] border-[1.5px] border-gray-200/90 dark:border-[#242F42] hover:border-sec/50 dark:hover:border-sec/50 shadow-xs hover:shadow-[3px_3px_0_#8194EE] dark:hover:shadow-[3px_3px_0_#182346] transition-all flex flex-col justify-between space-y-3.5 group select-none relative z-0"
              >
                <div className="space-y-3">
                  {/* Top Row: Category Badge (Right - exactly matching in-person) & Status Badge (Left) */}
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-[11px] px-2.5 py-1 rounded-lg font-black border ${category.className}`}>
                      {category.label}
                    </span>

                    <span
                      className={`relative z-0 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border transition-colors select-none ${statusInfo.className}`}
                    >
                      <span className="relative flex h-2 w-2">
                        {statusInfo.key === 'HOLDING' && (
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                        )}
                        <span className={`relative inline-flex rounded-full h-2 w-2 ${statusInfo.dotColor.split(' ')[0]}`} />
                      </span>
                      <span>{statusInfo.label}</span>
                    </span>
                  </div>

                  {/* Title */}
                  <div>
                    <h3 className="font-black text-base text-ink-darker dark:text-white leading-snug group-hover:text-sec transition-colors">
                      {exam.title}
                    </h3>
                  </div>

                  {/* Lesson & Teacher (Matching In-Person & Homework) */}
                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground dark:text-slate-400 font-medium">
                    <div className="flex items-center gap-1.5 font-bold text-ink-darker dark:text-slate-200">
                      <BookOpen className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span>{exam.lesson?.name || 'آزمون آنلاین'}</span>
                    </div>
                    {teacherName && (
                      <div className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-sec shrink-0" />
                        <span>{teacherName}</span>
                      </div>
                    )}
                  </div>

                  {/* Score Section on Card (When score is recorded/published) */}
                  {hasScore && (
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-50/90 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-xs shadow-2xs">
                      <div className="flex items-center gap-1.5 text-emerald-800 dark:text-emerald-300 font-bold">
                        <Award className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>نمره آزمون:</span>
                      </div>
                      <div className="font-black text-sm text-emerald-700 dark:text-emerald-300">
                        {toPersianDigits(participation.totalScore)} از {toPersianDigits(exam.totalScore || 20)}
                      </div>
                    </div>
                  )}

                  {/* Timing & Score Matrix - Exactly matching In-Person card (Hour & Duration, No questions count) */}
                  <div className="bg-gray-50/80 dark:bg-[#1C2536] rounded-xl p-3 border border-gray-100 dark:border-[#242F42] space-y-2 text-xs">
                    {/* Date & Time */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 text-ink-darker dark:text-slate-200 font-bold">
                        <Calendar className="w-3.5 h-3.5 text-primary shrink-0" />
                        <span>{formatJalaliDisplay(exam.startTime, true)}</span>
                      </div>
                      <div className="flex items-center gap-1 text-muted-foreground dark:text-slate-400 font-medium">
                        <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        <span>{formatExamTimeRange(exam.startTime, exam.endTime)}</span>
                      </div>
                    </div>

                    {/* Duration & Total Score */}
                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-gray-200/50 dark:border-gray-800">
                      <div className="flex items-center gap-1.5 text-muted-foreground dark:text-slate-400" title="مدت زمان آزمون">
                        <Clock className="w-3.5 h-3.5 text-muted-foreground dark:text-slate-400 shrink-0" />
                        <strong className="text-ink-darker dark:text-white">{toPersianDigits(exam.durationMinutes)} دقیقه</strong>
                      </div>
                      <div className="flex items-center gap-1 font-black text-emerald-600 dark:text-emerald-400">
                        <Award className="w-3.5 h-3.5 shrink-0" />
                        <span>بارم: {toPersianDigits(exam.totalScore || 20)} نمره</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer Action Buttons: View Details Modal + Start Exam / Submitted status */}
                <div className="pt-3 mt-1 border-t border-gray-100 dark:border-[#242F42] flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedOnlineExam(exam)}
                    className="flex-1 text-xs flex items-center justify-center gap-1.5 h-9 sm:h-10 rounded-xl font-bold bg-white dark:bg-[#1C2536] border-gray-200 dark:border-[#242F42] text-foreground dark:text-white hover:bg-gray-50 dark:hover:bg-[#242F42] shadow-2xs transition-colors cursor-pointer"
                  >
                    <Eye className="w-4 h-4 text-sec shrink-0" />
                    <span>مشاهده جزئیات</span>
                  </Button>

                  {statusInfo.key === 'RESULTS_PUBLISHED' ? (
                    <button
                      type="button"
                      onClick={() => setSelectedOnlineExam(exam)}
                      className="flex-1 h-9 sm:h-10 px-3 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white border-[1.5px] border-emerald-700 shadow-[2px_2px_0_#047857] dark:shadow-[2px_2px_0_#064e3b] active:translate-x-[1px] active:translate-y-[1px]"
                    >
                      <Award className="h-4 w-4 shrink-0" />
                      <span className="truncate">مشاهده نتیجه</span>
                    </button>
                  ) : statusInfo.key === 'PENDING_GRADING' ? (
                    <button
                      type="button"
                      disabled
                      className="flex-1 h-9 sm:h-10 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 cursor-default select-none"
                    >
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span className="truncate">تحویل شد</span>
                    </button>
                  ) : statusInfo.key === 'HOLDING' ? (
                    <button
                      type="button"
                      disabled={isStartingId === exam.id || !hasQuestions}
                      onClick={() => handleStartExam(exam)}
                      className={`flex-1 h-9 sm:h-10 px-3 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        hasQuestions
                          ? 'bg-primary hover:bg-primary-hover text-white border-[1.5px] border-primary-dark shadow-[2px_2px_0_#438C83] dark:shadow-[2px_2px_0_#1F413D] active:translate-x-[1px] active:translate-y-[1px]'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-400 border border-gray-200 dark:border-gray-700 cursor-not-allowed'
                      }`}
                    >
                      <Play className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{hasQuestions ? 'ورود به آزمون' : 'ثبت نشده'}</span>
                    </button>
                  ) : (
                    /* تا قبل از شروع آزمون (SCHEDULED): دکمه ورود به آزمون کمرنگ و غیرفعال */
                    <button
                      type="button"
                      disabled
                      title="زمان برگزاری آزمون هنوز فرا نرسیده است"
                      className="flex-1 h-9 sm:h-10 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all bg-gray-100 dark:bg-[#1C2536] text-gray-400 dark:text-gray-500 border border-gray-200 dark:border-[#242F42] cursor-not-allowed opacity-60 select-none"
                    >
                      <Play className="h-3.5 w-3.5 shrink-0 opacity-60" />
                      <span className="truncate">ورود به آزمون</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 4. In-Person Exam Details & Results Modal */}
      {selectedInPersonExam && (
        <Modal
          isOpen={!!selectedInPersonExam}
          onClose={() => setSelectedInPersonExam(null)}
          title="جزئیات و نتیجه آزمون حضوری"
          maxWidth="lg"
        >
          <div className="space-y-4 pt-1">
            {/* Header Banner */}
            <div className="p-4 rounded-2xl bg-gray-50 dark:bg-[#1C2536] border border-gray-200 dark:border-[#242F42] space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className={`text-[11px] px-2.5 py-1 rounded-lg font-black border ${getExamCategory(selectedInPersonExam).className}`}>
                  {getExamCategory(selectedInPersonExam).label}
                </span>

                {/* Status Badge in Modal */}
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border ${getExamStatusInfo(selectedInPersonExam).className}`}
                >
                  <span className={`w-2 h-2 rounded-full shrink-0 ${getExamStatusInfo(selectedInPersonExam).dotColor}`} />
                  <span>{getExamStatusInfo(selectedInPersonExam).label}</span>
                </span>
              </div>

              <h3 className="font-black text-base text-ink-darker dark:text-white leading-snug">
                {selectedInPersonExam.title}
              </h3>

              {/* Lesson & Teacher with Icons (Homework Style) */}
              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground dark:text-slate-400 font-medium">
                <div className="flex items-center gap-1.5 font-bold text-ink-darker dark:text-slate-200">
                  <BookOpen className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span>{selectedInPersonExam.lesson?.name || 'درس تخصصی'}</span>
                </div>
                {(selectedInPersonExam.teacher?.user?.firstName || selectedInPersonExam.teacher?.user?.lastName) && (
                  <div className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-sec shrink-0" />
                    <span>
                      {`${selectedInPersonExam.teacher?.user?.firstName || ''} ${selectedInPersonExam.teacher?.user?.lastName || ''}`.trim()}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Exam Details Grid - 3 rows x 2 columns */}
            <div className="space-y-2.5 text-xs">
              {/* Row 1: Date & Time */}
              <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
                <div className="p-3 rounded-xl border border-gray-200/80 dark:border-[#242F42] bg-white dark:bg-[#151C28] flex items-center gap-2.5 min-w-0">
                  <Calendar className="w-4 h-4 text-primary shrink-0" />
                  <div className="min-w-0 truncate">
                    <span className="text-muted-foreground dark:text-slate-400 block text-[11px]">تاریخ برگزاری:</span>
                    <span className="font-bold text-ink-darker dark:text-white truncate block">
                      {formatJalaliDisplay(selectedInPersonExam.startTime, true)}
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-xl border border-gray-200/80 dark:border-[#242F42] bg-white dark:bg-[#151C28] flex items-center gap-2.5 min-w-0">
                  <Clock className="w-4 h-4 text-amber-500 shrink-0" />
                  <div className="min-w-0 truncate">
                    <span className="text-muted-foreground dark:text-slate-400 block text-[11px]">ساعت برگزاری:</span>
                    <span className="font-bold text-ink-darker dark:text-white truncate block">
                      {formatExamTimeRange(selectedInPersonExam.startTime, selectedInPersonExam.endTime)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Row 2: Duration & Total Score */}
              <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
                <div className="p-3 rounded-xl border border-gray-200/80 dark:border-[#242F42] bg-white dark:bg-[#151C28] flex items-center gap-2.5 min-w-0">
                  <Clock className="w-4 h-4 text-sec shrink-0" />
                  <div className="min-w-0 truncate">
                    <span className="text-muted-foreground dark:text-slate-400 block text-[11px]">مدت آزمون:</span>
                    <span className="font-bold text-ink-darker dark:text-white truncate block">
                      {toPersianDigits(selectedInPersonExam.durationMinutes)} دقیقه
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-xl border border-gray-200/80 dark:border-[#242F42] bg-white dark:bg-[#151C28] flex items-center gap-2.5 min-w-0">
                  <Award className="w-4 h-4 text-emerald-500 shrink-0" />
                  <div className="min-w-0 truncate">
                    <span className="text-muted-foreground dark:text-slate-400 block text-[11px]">بارم آزمون:</span>
                    <span className="font-bold text-ink-darker dark:text-white truncate block">
                      {toPersianDigits(selectedInPersonExam.totalScore || 20)} نمره
                    </span>
                  </div>
                </div>
              </div>

              {/* Row 3: Question Types & Delivery Mode */}
              <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
                <div className="p-3 rounded-xl border border-gray-200/80 dark:border-[#242F42] bg-white dark:bg-[#151C28] flex items-center gap-2.5 min-w-0">
                  <FileText className="w-4 h-4 text-rose-500 shrink-0" />
                  <div className="min-w-0 truncate">
                    <span className="text-muted-foreground dark:text-slate-400 block text-[11px]">نوع سوالات:</span>
                    <span className="font-bold text-ink-darker dark:text-white truncate block">
                      {getExamQuestionTypeLabel(selectedInPersonExam)}
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-xl border border-gray-200/80 dark:border-[#242F42] bg-white dark:bg-[#151C28] flex items-center gap-2.5 min-w-0">
                  <School className="w-4 h-4 text-primary shrink-0" />
                  <div className="min-w-0 truncate">
                    <span className="text-muted-foreground dark:text-slate-400 block text-[11px]">شیوه برگزاری:</span>
                    <span className="font-bold text-ink-darker dark:text-white truncate block">
                      حضوری (کتبی)
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Syllabus / Description Section (Title: سرفصل‌ها و توضیحات) */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground dark:text-slate-400 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-primary" />
                <span>سرفصل‌ها و توضیحات:</span>
              </label>
              <div className="p-3.5 rounded-xl border border-gray-200 dark:border-[#242F42] bg-gray-50/50 dark:bg-[#1C2536] text-xs text-ink-darker dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
                {selectedInPersonExam.description || 'توضیحات یا سرفصل خاصی توسط مربی برای این آزمون ثبت نشده است.'}
              </div>
            </div>

            {/* Results / Grade Section (Title: نتیجه آزمون) */}
            <div className="space-y-1.5 pt-1">
              <label className="text-xs font-bold text-muted-foreground dark:text-slate-400 flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-emerald-500" />
                <span>نتیجه آزمون:</span>
              </label>

              {selectedInPersonExam.participations?.[0]?.totalScore !== null &&
              selectedInPersonExam.participations?.[0]?.totalScore !== undefined ? (
                <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 font-bold text-xs">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>نمره رسمی ثبت‌شده در سامانه</span>
                    </div>
                    <div className="text-base font-black text-emerald-700 dark:text-emerald-300">
                      {toPersianDigits(selectedInPersonExam.participations[0].totalScore)} از {toPersianDigits(selectedInPersonExam.totalScore || 20)}
                    </div>
                  </div>

                  {selectedInPersonExam.participations[0].graceScore > 0 && (
                    <div className="text-xs text-primary font-bold pt-1 border-t border-emerald-200/50 dark:border-emerald-800/50 flex justify-between">
                      <span>نمره ارفاقی مربی:</span>
                      <span>+{toPersianDigits(selectedInPersonExam.participations[0].graceScore)} نمره</span>
                    </div>
                  )}

                  {selectedInPersonExam.participations[0].teacherFeedback && (
                    <div className="text-xs text-ink-dark dark:text-slate-300 bg-white/80 dark:bg-[#151C28] p-2.5 rounded-lg border border-emerald-200/60 dark:border-emerald-900/60">
                      <span className="font-bold">بازخورد مربی: </span>
                      {selectedInPersonExam.participations[0].teacherFeedback}
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-gray-50 dark:bg-[#1C2536] border border-dashed border-gray-300 dark:border-gray-700 text-center space-y-1.5">
                  <Clock className="w-6 h-6 text-amber-500 mx-auto opacity-80" />
                  <div className="text-xs font-bold text-ink-darker dark:text-white">
                    در انتظار ثبت نمره توسط مربی
                  </div>
                </div>
              )}
            </div>

            {/* Footer Action */}
            <div className="pt-2 flex justify-end">
              <Button
                variant="outline"
                onClick={() => setSelectedInPersonExam(null)}
                className="text-xs px-5 h-9 rounded-xl"
              >
                بستن
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* 5. Online Exam Details & Results Modal (Matching In-Person Modal + Start Exam Button) */}
      {selectedOnlineExam && (
        <Modal
          isOpen={!!selectedOnlineExam}
          onClose={() => setSelectedOnlineExam(null)}
          title="جزئیات و توضیحات آزمون آنلاین"
          maxWidth="lg"
        >
          <div className="space-y-4 pt-1">
            {/* Header Banner */}
            <div className="p-4 rounded-2xl bg-gray-50 dark:bg-[#1C2536] border border-gray-200 dark:border-[#242F42] space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className={`text-[11px] px-2.5 py-1 rounded-lg font-black border ${getExamCategory(selectedOnlineExam).className}`}>
                  {getExamCategory(selectedOnlineExam).label}
                </span>

                {/* Status Badge in Modal */}
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border ${getExamStatusInfo(selectedOnlineExam).className}`}
                >
                  <span className={`w-2 h-2 rounded-full shrink-0 ${getExamStatusInfo(selectedOnlineExam).dotColor}`} />
                  <span>{getExamStatusInfo(selectedOnlineExam).label}</span>
                </span>
              </div>

              <h3 className="font-black text-base text-ink-darker dark:text-white leading-snug">
                {selectedOnlineExam.title}
              </h3>

              {/* Lesson & Teacher with Icons */}
              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground dark:text-slate-400 font-medium">
                <div className="flex items-center gap-1.5 font-bold text-ink-darker dark:text-slate-200">
                  <BookOpen className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span>{selectedOnlineExam.lesson?.name || 'آزمون آنلاین'}</span>
                </div>
                {(selectedOnlineExam.teacher?.user?.firstName || selectedOnlineExam.teacher?.user?.lastName) && (
                  <div className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-sec shrink-0" />
                    <span>
                      {`${selectedOnlineExam.teacher?.user?.firstName || ''} ${selectedOnlineExam.teacher?.user?.lastName || ''}`.trim()}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Exam Details Grid - 3 rows x 2 columns */}
            <div className="space-y-2.5 text-xs">
              {/* Row 1: Date & Time */}
              <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
                <div className="p-3 rounded-xl border border-gray-200/80 dark:border-[#242F42] bg-white dark:bg-[#151C28] flex items-center gap-2.5 min-w-0">
                  <Calendar className="w-4 h-4 text-primary shrink-0" />
                  <div className="min-w-0 truncate">
                    <span className="text-muted-foreground dark:text-slate-400 block text-[11px]">تاریخ برگزاری:</span>
                    <span className="font-bold text-ink-darker dark:text-white truncate block">
                      {formatJalaliDisplay(selectedOnlineExam.startTime, true)}
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-xl border border-gray-200/80 dark:border-[#242F42] bg-white dark:bg-[#151C28] flex items-center gap-2.5 min-w-0">
                  <Clock className="w-4 h-4 text-amber-500 shrink-0" />
                  <div className="min-w-0 truncate">
                    <span className="text-muted-foreground dark:text-slate-400 block text-[11px]">ساعت برگزاری:</span>
                    <span className="font-bold text-ink-darker dark:text-white truncate block">
                      {formatExamTimeRange(selectedOnlineExam.startTime, selectedOnlineExam.endTime)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Row 2: Duration & Total Score */}
              <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
                <div className="p-3 rounded-xl border border-gray-200/80 dark:border-[#242F42] bg-white dark:bg-[#151C28] flex items-center gap-2.5 min-w-0">
                  <Clock className="w-4 h-4 text-sec shrink-0" />
                  <div className="min-w-0 truncate">
                    <span className="text-muted-foreground dark:text-slate-400 block text-[11px]">مدت آزمون:</span>
                    <span className="font-bold text-ink-darker dark:text-white truncate block">
                      {toPersianDigits(selectedOnlineExam.durationMinutes)} دقیقه
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-xl border border-gray-200/80 dark:border-[#242F42] bg-white dark:bg-[#151C28] flex items-center gap-2.5 min-w-0">
                  <Award className="w-4 h-4 text-emerald-500 shrink-0" />
                  <div className="min-w-0 truncate">
                    <span className="text-muted-foreground dark:text-slate-400 block text-[11px]">بارم آزمون:</span>
                    <span className="font-bold text-ink-darker dark:text-white truncate block">
                      {toPersianDigits(selectedOnlineExam.totalScore || 20)} نمره
                    </span>
                  </div>
                </div>
              </div>

              {/* Row 3: Question Types & Delivery Mode */}
              <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
                <div className="p-3 rounded-xl border border-gray-200/80 dark:border-[#242F42] bg-white dark:bg-[#151C28] flex items-center gap-2.5 min-w-0">
                  <FileText className="w-4 h-4 text-rose-500 shrink-0" />
                  <div className="min-w-0 truncate">
                    <span className="text-muted-foreground dark:text-slate-400 block text-[11px]">نوع سوالات:</span>
                    <span className="font-bold text-ink-darker dark:text-white truncate block">
                      {getExamQuestionTypeLabel(selectedOnlineExam)}
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-xl border border-gray-200/80 dark:border-[#242F42] bg-white dark:bg-[#151C28] flex items-center gap-2.5 min-w-0">
                  <Laptop className="w-4 h-4 text-sec shrink-0" />
                  <div className="min-w-0 truncate">
                    <span className="text-muted-foreground dark:text-slate-400 block text-[11px]">شیوه برگزاری:</span>
                    <span className="font-bold text-ink-darker dark:text-white truncate block">
                      آنلاین (سامانه)
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Syllabus / Description Section (Title: سرفصل‌ها و توضیحات) */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground dark:text-slate-400 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-primary" />
                <span>سرفصل‌ها و توضیحات:</span>
              </label>
              <div className="p-3.5 rounded-xl border border-gray-200 dark:border-[#242F42] bg-gray-50/50 dark:bg-[#1C2536] text-xs text-ink-darker dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
                {selectedOnlineExam.description || 'توضیحات یا سرفصل خاصی توسط مربی برای این آزمون ثبت نشده است.'}
              </div>
            </div>

            {/* Results / Grade Section (Title: نتیجه آزمون) */}
            <div className="space-y-1.5 pt-1">
              <label className="text-xs font-bold text-muted-foreground dark:text-slate-400 flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-emerald-500" />
                <span>نتیجه آزمون:</span>
              </label>

              {selectedOnlineExam.participations?.[0]?.totalScore !== null &&
              selectedOnlineExam.participations?.[0]?.totalScore !== undefined ? (
                <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 font-bold text-xs">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>نمره رسمی ثبت‌شده در سامانه</span>
                    </div>
                    <div className="text-base font-black text-emerald-700 dark:text-emerald-300">
                      {toPersianDigits(selectedOnlineExam.participations[0].totalScore)} از {toPersianDigits(selectedOnlineExam.totalScore || 20)}
                    </div>
                  </div>

                  {selectedOnlineExam.participations[0].teacherFeedback && (
                    <div className="text-xs text-ink-dark dark:text-slate-300 bg-white/80 dark:bg-[#151C28] p-2.5 rounded-lg border border-emerald-200/60 dark:border-emerald-900/60">
                      <span className="font-bold">بازخورد مربی: </span>
                      {selectedOnlineExam.participations[0].teacherFeedback}
                    </div>
                  )}
                </div>
              ) : selectedOnlineExam.participations?.[0]?.status === 'SUBMITTED' ||
                selectedOnlineExam.participations?.[0]?.status === 'TIMED_OUT' ? (
                <div className="p-4 rounded-xl bg-emerald-50/60 dark:bg-[#1C2536] border border-emerald-200 dark:border-emerald-900 text-center space-y-1.5">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto" />
                  <div className="text-xs font-bold text-ink-darker dark:text-white">
                    پاسخ‌برگ با موفقیت تحویل داده شده است
                  </div>
                  <p className="text-[11px] text-muted-foreground dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
                    پاسخ‌های شما ثبت شده و پس از بررسی و نمره‌گذاری توسط مربی، کارنامه شما در این بخش فعال خواهد شد.
                  </p>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-gray-50 dark:bg-[#1C2536] border border-dashed border-gray-300 dark:border-gray-700 text-center space-y-1.5">
                  <Clock className="w-6 h-6 text-amber-500 mx-auto opacity-80" />
                  <div className="text-xs font-bold text-ink-darker dark:text-white">
                    آزمون هنوز برگزار یا تکمیل نشده است
                  </div>
                  <p className="text-[11px] text-muted-foreground dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
                    برای شرکت در این آزمون می‌توانید در بازه زمانی تعیین‌شده از طریق دکمه زیر وارد جلسه آزمون شوید.
                  </p>
                </div>
              )}
            </div>

            {/* Footer Actions: Close + Start Exam Button */}
            <div className="pt-2 flex items-center justify-between gap-3">
              <Button
                variant="outline"
                onClick={() => setSelectedOnlineExam(null)}
                className="text-xs px-5 h-9 sm:h-10 rounded-xl"
              >
                بستن
              </Button>

              {(() => {
                const modalStatus = getExamStatusInfo(selectedOnlineExam).key;
                if (modalStatus === 'HOLDING') {
                  const hasQ = (selectedOnlineExam._count?.questions || 0) > 0;
                  return (
                    <button
                      type="button"
                      disabled={isStartingId === selectedOnlineExam.id || !hasQ}
                      onClick={() => {
                        const ex = selectedOnlineExam;
                        setSelectedOnlineExam(null);
                        handleStartExam(ex);
                      }}
                      className={`h-9 sm:h-10 px-5 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        hasQ
                          ? 'bg-primary hover:bg-primary-hover text-white border-[1.5px] border-primary-dark shadow-[2px_2px_0_#438C83] dark:shadow-[2px_2px_0_#1F413D] active:translate-x-[1px] active:translate-y-[1px]'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-400 border border-gray-200 dark:border-gray-700 cursor-not-allowed'
                      }`}
                    >
                      <Play className="h-3.5 w-3.5 shrink-0" />
                      <span>ورود به جلسه آزمون</span>
                    </button>
                  );
                }
                if (modalStatus === 'SCHEDULED') {
                  return (
                    <button
                      type="button"
                      disabled
                      title="زمان برگزاری آزمون هنوز فرا نرسیده است"
                      className="h-9 sm:h-10 px-5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all bg-gray-100 dark:bg-[#1C2536] text-gray-400 dark:text-gray-500 border border-gray-200 dark:border-[#242F42] cursor-not-allowed opacity-60 select-none"
                    >
                      <Play className="h-3.5 w-3.5 shrink-0 opacity-60" />
                      <span>ورود به جلسه آزمون</span>
                    </button>
                  );
                }
                if (modalStatus === 'PENDING_GRADING') {
                  return (
                    <Button
                      variant="outline"
                      disabled
                      size="sm"
                      className="h-9 sm:h-10 px-4 text-xs flex items-center justify-center gap-1.5 text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 cursor-default rounded-xl font-bold"
                    >
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span>تحویل شد</span>
                    </Button>
                  );
                }
                return null;
              })()}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
