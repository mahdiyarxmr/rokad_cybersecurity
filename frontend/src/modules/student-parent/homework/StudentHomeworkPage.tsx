import React, { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { apiClient } from '../../../lib/api/client';
import { toast } from 'sonner';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Modal } from '../../../components/ui/Modal';
import { Skeleton } from '../../../components/ui/Skeleton';
import { RichTextEditor } from '../../../components/ui/RichTextEditor';
import { formatJalaliDisplay, toPersianDigits } from '../../../utils/jalali';
import {
  FileCheck,
  Clock,
  Send,
  CheckCircle2,
  AlertCircle,
  Award,
  Eye,
  MessageSquare,
  Edit3,
  Calendar,
  BookOpen,
  Filter,
  ArrowUpDown,
  RotateCcw,
  CheckCircle,
  ChevronDown,
  Check,
  Upload,
  Paperclip,
  FileText,
  Trash2,
  ExternalLink,
  User,
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
  const containerRef = React.useRef<HTMLDivElement>(null);

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

export const StudentHomeworkPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const homeworkIdParam = searchParams.get('homeworkId');
  const lessonIdParam = searchParams.get('lessonId');
  const lessonNameParam = searchParams.get('lessonName');

  const [homeworkList, setHomeworkList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters and Sorting state
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [selectedLessonFilter, setSelectedLessonFilter] = useState<string>(lessonIdParam || 'ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('ALL');
  const [sortOption, setSortOption] = useState<string>('DEFAULT');

  // Modal state
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [selectedHomework, setSelectedHomework] = useState<any>(null);
  const [submissionText, setSubmissionText] = useState('');
  const [attachments, setAttachments] = useState<{ name: string; url: string; type: string; size?: number }[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const openHomeworkModal = (hw: any) => {
    setSelectedHomework(hw);
    const mySub = hw?.submissions && hw.submissions.length > 0 ? hw.submissions[0] : null;
    setSubmissionText(mySub?.content || '');
    const existingAttachments = (mySub?.attachmentUrls || []).map((url: string, index: number) => {
      const fileName = url.split('/').pop()?.split('?')[0] || `پیوست ${toPersianDigits(index + 1)}`;
      const isImg = !!url.match(/\.(jpg|jpeg|png|webp|gif|svg)(\?.*)?$/i) || url.startsWith('data:image/');
      return {
        name: decodeURIComponent(fileName),
        url,
        type: isImg ? 'image' : 'file',
      };
    });
    setAttachments(existingAttachments);
    setError(null);
    setIsSubmitModalOpen(true);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setIsUploading(true);
    setError(null);
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.size > 25 * 1024 * 1024) {
          toast.error(`فایل ${file.name} بیشتر از ۲۵ مگابایت است.`);
          continue;
        }

        const formData = new FormData();
        formData.append('file', file);

        let fileUrl = '';
        try {
          const res: any = await apiClient.post('/homework/upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
          const data = res?.data?.data || res?.data || res;
          fileUrl = data?.url || data?.fileUrl || (typeof data === 'string' ? data : '');
        } catch {
          // Fallback: convert to base64 Data URL
          fileUrl = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(file);
          });
        }

        if (fileUrl) {
          setAttachments((prev) => [
            ...prev,
            {
              name: file.name,
              url: fileUrl,
              type: file.type.startsWith('image/') ? 'image' : 'file',
              size: file.size,
            },
          ]);
          toast.success(`فایل ${file.name} افزوده شد`);
        }
      }
    } catch {
      setError('خطا در بارگذاری فایل');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  // Sync lessonIdParam with selectedLessonFilter if changed via URL
  useEffect(() => {
    if (lessonIdParam) {
      setSelectedLessonFilter(lessonIdParam);
    }
  }, [lessonIdParam]);

  const fetchHomework = async () => {
    try {
      setIsLoading(true);
      const res: any = await apiClient.get('/homework');
      const data = Array.isArray(res) ? res : (res?.data || []);
      setHomeworkList(data);

      // Direct action/modal open if requested via URL
      if (homeworkIdParam && data.length > 0) {
        const target = data.find((h: any) => h.id === homeworkIdParam);
        if (target) {
          openHomeworkModal(target);
        }
      }
    } catch (err) {
      console.error('Failed to load homework', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHomework();
  }, [homeworkIdParam]);

  const handleSubmitHomework = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedHomework) return;
    if (!submissionText.trim() && attachments.length === 0) {
      setError('لطفاً متن پاسخ یا حداقل یک فایل پیوست ارسال فرمایید.');
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      await apiClient.post(`/homework/${selectedHomework.id}/submit`, {
        content: submissionText,
        attachmentUrls: attachments.map((a) => a.url),
      });
      toast.success('پاسخ تکلیف با موفقیت ثبت شد');
      setIsSubmitModalOpen(false);
      setSubmissionText('');
      setAttachments([]);
      fetchHomework();
    } catch (err: any) {
      const msg = err.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(' - ') : msg || err.message || 'خطا در ارسال پاسخ تکلیف.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper for formatting Jalali date and time
  const formatJalaliDateTime = (
    dateInput: string | Date | null | undefined,
    includeWeekday = false
  ): string => {
    if (!dateInput) return '';
    const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    if (isNaN(d.getTime())) return '';
    const dateStr = formatJalaliDisplay(d, includeWeekday);
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${dateStr} - ${toPersianDigits(`${hours}:${minutes}`)}`;
  };

  // Helper for getting mentor / teacher name
  const getTeacherName = (hw: any): string => {
    if (hw?.teacher?.user?.firstName || hw?.teacher?.user?.lastName) {
      return `${hw.teacher.user.firstName || ''} ${hw.teacher.user.lastName || ''}`.trim();
    }
    if (hw?.submissions?.[0]?.gradedBy) {
      const g = hw.submissions[0].gradedBy;
      return `${g.firstName || ''} ${g.lastName || ''}`.trim();
    }
    return hw?.teacherName || '';
  };

  // Determine homework status and UI properties
  const getHomeworkStatus = (hw: any) => {
    const mySub = hw.submissions && hw.submissions.length > 0 ? hw.submissions[0] : null;
    const isSubmitted = !!mySub;
    const isPastDue = hw.dueDate ? new Date(hw.dueDate).getTime() < Date.now() : false;
    const allowLate = !!hw.allowLateSubmissions;
    const isGraded = isSubmitted && mySub.score !== null && mySub.score !== undefined;

    // ۱. در صورت ارزیابی شدن تکلیف
    if (isGraded) {
      const subTime = mySub.submittedAt ? new Date(mySub.submittedAt).getTime() : 0;
      const dueTime = hw.dueDate ? new Date(hw.dueDate).getTime() : Infinity;
      const isLate = mySub.status === 'LATE' || (subTime > 0 && dueTime > 0 && subTime > dueTime);

      return {
        key: 'GRADED',
        label: 'ارزیابی شده',
        variant: 'default' as const,
        badgeClass: 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30',
        icon: Award,
        colorDot: 'bg-indigo-500',
        canSubmit: allowLate || !isPastDue,
        isSubmitted: true,
        isLate,
        isGraded: true,
      };
    }

    // ۲. در صورت تحویل: تفکیک به دو حالت «تحویل به موقع» و «تحویل با تأخیر»
    if (isSubmitted) {
      const subTime = mySub.submittedAt ? new Date(mySub.submittedAt).getTime() : 0;
      const dueTime = hw.dueDate ? new Date(hw.dueDate).getTime() : Infinity;
      const isLate = mySub.status === 'LATE' || (subTime > 0 && dueTime > 0 && subTime > dueTime);

      if (isLate) {
        return {
          key: 'SUBMITTED_LATE',
          label: 'تحویل با تأخیر',
          variant: 'warning' as const,
          badgeClass: 'bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300 border border-orange-500/40',
          icon: Clock,
          colorDot: 'bg-orange-500',
          canSubmit: allowLate || !isPastDue,
          isSubmitted: true,
          isLate: true,
          isGraded: false,
        };
      }

      return {
        key: 'SUBMITTED_ON_TIME',
        label: 'تحویل به موقع',
        variant: 'success' as const,
        badgeClass: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30',
        icon: CheckCircle2,
        colorDot: 'bg-emerald-500',
        canSubmit: allowLate || !isPastDue,
        isSubmitted: true,
        isLate: false,
        isGraded: false,
      };
    }

    // ۳. در صورت عدم تحویل و اتمام مهلت
    if (isPastDue) {
      if (allowLate) {
        return {
          key: 'OVERDUE_CAN_SUBMIT',
          label: 'مهلت گذشته (امکان ارسال با تأخیر)',
          variant: 'warning' as const,
          badgeClass: 'bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300 border border-orange-500/40',
          icon: Clock,
          colorDot: 'bg-orange-500',
          canSubmit: true,
          isSubmitted: false,
          isLate: false,
          isGraded: false,
        };
      }

      return {
        key: 'OVERDUE',
        label: 'عدم تحویل',
        variant: 'destructive' as const,
        badgeClass: 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-500/30',
        icon: AlertCircle,
        colorDot: 'bg-rose-500',
        canSubmit: false,
        isSubmitted: false,
        isLate: false,
        isGraded: false,
      };
    }

    // ۴. در انتظار تحویل (هنوز مهلت دارد)
    return {
      key: 'PENDING',
      label: 'در انتظار تحویل',
      variant: 'warning' as const,
      badgeClass: 'bg-yellow-50 dark:bg-yellow-950/40 text-yellow-800 dark:text-yellow-300 border border-yellow-400/50',
      icon: Clock,
      colorDot: 'bg-yellow-500',
      canSubmit: true,
      isSubmitted: false,
      isLate: false,
      isGraded: false,
    };
  };

  // Extract unique lessons for filter dropdown
  const uniqueLessons = useMemo(() => {
    const map = new Map<string, string>();
    homeworkList.forEach((hw) => {
      const id = hw.lessonId || hw.lesson?.id;
      const name = hw.lesson?.name;
      if (id && name && !map.has(id)) {
        map.set(id, name);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [homeworkList]);

  // Filtered & sorted homework list
  const filteredHomeworkList = useMemo(() => {
    return homeworkList
      .filter((hw) => {
        // 1. Lesson Filter
        if (selectedLessonFilter !== 'ALL') {
          const hwLessonId = hw.lessonId || hw.lesson?.id;
          if (hwLessonId !== selectedLessonFilter) return false;
        }

        // 2. Status Filter
        if (selectedStatusFilter !== 'ALL') {
          const status = getHomeworkStatus(hw);
          if (selectedStatusFilter === 'OVERDUE') {
            if (status.key !== 'OVERDUE' && status.key !== 'OVERDUE_CAN_SUBMIT') return false;
          } else if (status.key !== selectedStatusFilter) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        // دیفالت: تکالیف در انتظار تحویل با کمترین مهلت، بعد تکالیف تحویل شده به موقع و با تأخیر با دورترین زمان تحویل و بعد تکالیف ارزیابی شده
        if (sortOption === 'DEFAULT') {
          const getStatusPriority = (hw: any) => {
            const s = getHomeworkStatus(hw);
            if (s.key === 'PENDING' || s.key === 'OVERDUE_CAN_SUBMIT') return 1;
            if (s.key === 'SUBMITTED_ON_TIME' || s.key === 'SUBMITTED_LATE') return 2;
            if (s.key === 'GRADED') return 3;
            if (s.key === 'OVERDUE') return 4;
            return 5;
          };

          const pA = getStatusPriority(a);
          const pB = getStatusPriority(b);

          if (pA !== pB) {
            return pA - pB;
          }

          // ۱. در انتظار تحویل: با کمترین مهلت (نزدیک‌ترین مهلت صعودی)
          if (pA === 1) {
            const timeA = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
            const timeB = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
            return timeA - timeB;
          }

          // ۲. تحویل شده به موقع و با تأخیر: با دورترین زمان تحویل (جدیدترین تاریخ ثبت تحویل نزولی)
          if (pA === 2) {
            const subTimeA = a.submissions?.[0]?.submittedAt
              ? new Date(a.submissions[0].submittedAt).getTime()
              : (a.dueDate ? new Date(a.dueDate).getTime() : 0);
            const subTimeB = b.submissions?.[0]?.submittedAt
              ? new Date(b.submissions[0].submittedAt).getTime()
              : (b.dueDate ? new Date(b.dueDate).getTime() : 0);
            return subTimeB - subTimeA;
          }

          // ۳. ارزیابی شده: جدیدترین زمان ارزیابی یا ثبت تحویل (نزولی)
          if (pA === 3) {
            const gradeTimeA = a.submissions?.[0]?.gradedAt
              ? new Date(a.submissions[0].gradedAt).getTime()
              : (a.submissions?.[0]?.submittedAt ? new Date(a.submissions[0].submittedAt).getTime() : 0);
            const gradeTimeB = b.submissions?.[0]?.gradedAt
              ? new Date(b.submissions[0].gradedAt).getTime()
              : (b.submissions?.[0]?.submittedAt ? new Date(b.submissions[0].submittedAt).getTime() : 0);
            return gradeTimeB - gradeTimeA;
          }

          // ۴. عدم تحویل: جدیدترین تاریخ ددلاین (نزولی)
          if (pA === 4) {
            const timeA = a.dueDate ? new Date(a.dueDate).getTime() : 0;
            const timeB = b.dueDate ? new Date(b.dueDate).getTime() : 0;
            return timeB - timeA;
          }

          return 0;
        }

        if (sortOption === 'DUE_DATE_ASC') {
          const timeA = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
          const timeB = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
          return timeA - timeB;
        }
        if (sortOption === 'CREATED_AT_DESC') {
          const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return timeB - timeA;
        }
        if (sortOption === 'CREATED_AT_ASC') {
          const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return timeA - timeB;
        }
        return 0;
      });
  }, [homeworkList, selectedLessonFilter, selectedStatusFilter, sortOption]);

  const hasActiveFilters = selectedLessonFilter !== 'ALL' || selectedStatusFilter !== 'ALL' || sortOption !== 'DEFAULT';

  const resetFilters = () => {
    setSelectedLessonFilter('ALL');
    setSelectedStatusFilter('ALL');
    setSortOption('DEFAULT');
    if (lessonIdParam) {
      searchParams.delete('lessonId');
      searchParams.delete('lessonName');
      setSearchParams(searchParams);
    }
  };

  const lessonOptions = useMemo(() => [
    { value: 'ALL', label: 'همه درس‌ها' },
    ...uniqueLessons.map((l) => ({ value: l.id, label: l.name }))
  ], [uniqueLessons]);

  const statusOptions = useMemo(() => [
    { value: 'ALL', label: 'همه وضعیت‌ها' },
    { value: 'PENDING', label: 'در انتظار تحویل', colorDot: 'bg-yellow-500' },
    { value: 'SUBMITTED_ON_TIME', label: 'تحویل به موقع', colorDot: 'bg-emerald-500' },
    { value: 'SUBMITTED_LATE', label: 'تحویل با تأخیر', colorDot: 'bg-orange-500' },
    { value: 'GRADED', label: 'ارزیابی شده', colorDot: 'bg-indigo-500' },
    { value: 'OVERDUE', label: 'عدم تحویل', colorDot: 'bg-rose-500' },
  ], []);

  const sortOptions = useMemo(() => [
    { value: 'DEFAULT', label: 'ترتیب پیش‌فرض هوشمند' },
    { value: 'DUE_DATE_ASC', label: 'نزدیک‌ترین مهلت تحویل' },
    { value: 'CREATED_AT_DESC', label: 'جدیدترین تاریخ تعریف' },
    { value: 'CREATED_AT_ASC', label: 'قدیمی‌ترین تاریخ تعریف' },
  ], []);

  const pendingHomeworkCount = useMemo(() => {
    return homeworkList.filter((hw) => {
      const s = getHomeworkStatus(hw);
      return s.key === 'PENDING' || s.key === 'OVERDUE_CAN_SUBMIT';
    }).length;
  }, [homeworkList]);

  return (
    <div className="space-y-4 pb-12">
      {/* 1. Header Master Panel (Aligned with Messages Page & Weekly Schedule Page) */}
      <div className="bg-white dark:bg-[#151C28] rounded-2xl border-[1.5px] border-primary-dark/30 dark:border-[#242F42] shadow-[2px_2px_0_#59BBAF] dark:shadow-[2px_2px_0_#0B0F17] p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary dark:text-primary border border-primary/25 flex items-center justify-center font-black shadow-2xs shrink-0">
              <FileCheck className="w-5 h-5" />
            </div>
            <div className="flex flex-wrap items-center gap-2 min-w-0">
              <h1 className="text-lg sm:text-2xl font-black text-ink-darker dark:text-white truncate">
                تکالیف
              </h1>
              <Badge variant="college" className="text-[11px] sm:text-xs font-bold shrink-0">
                {toPersianDigits(pendingHomeworkCount)} در انتظار تحویل
              </Badge>
            </div>
          </div>

          {/* Left Side: Filter Toggle Icon Button */}
          <button
            type="button"
            onClick={() => setIsFilterOpen((prev) => !prev)}
            className={`relative cursor-pointer select-none flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-xl border-[1.5px] transition-all duration-150 active:translate-x-[1px] active:translate-y-[1px] shrink-0 ${
              isFilterOpen || hasActiveFilters
                ? 'bg-primary text-white border-primary-dark shadow-[2px_2px_0_#438C83]'
                : 'bg-gray-50 dark:bg-[#1C2536] text-muted-foreground dark:text-slate-300 border-gray-200 dark:border-[#242F42] hover:bg-gray-100 dark:hover:bg-[#253248] shadow-[2px_2px_0_#CBD5E1] dark:shadow-[2px_2px_0_#0F172A]'
            }`}
            title={isFilterOpen ? 'بستن فیلترها' : 'نمایش فیلترها'}
            aria-label={isFilterOpen ? 'بستن فیلترها' : 'نمایش فیلترها'}
          >
            <Filter className="w-4 h-4 sm:w-4.5 sm:h-4.5 shrink-0" />
            {hasActiveFilters && (
              <span className="absolute top-1.5 left-1.5 w-2 h-2 rounded-full bg-girl ring-2 ring-white dark:ring-[#151C28]" />
            )}
          </button>
        </div>
      </div>

      {/* 2. Filter & Sort Panel (Collapsible with smooth grid-height + opacity + slide motion) */}
      <div
        className={`grid transition-all duration-300 ease-in-out ${
          isFilterOpen
            ? 'grid-rows-[1fr] opacity-100 translate-y-0'
            : 'grid-rows-[0fr] opacity-0 -translate-y-2 pointer-events-none'
        }`}
      >
        <div className={`min-h-0 ${isFilterOpen ? 'overflow-visible' : 'overflow-hidden'}`}>
          <div className="bg-white dark:bg-[#151C28] rounded-2xl border border-gray-200/80 dark:border-[#242F42] p-3.5 sm:p-4 shadow-xs">
            <div className="flex flex-col md:flex-row md:items-center gap-3 justify-between">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 flex-1">
                {/* Filter by Lesson */}
                <CustomFilterDropdown
                  label="درس:"
                  labelIcon={BookOpen}
                  iconColorClass="text-primary"
                  options={lessonOptions}
                  value={selectedLessonFilter}
                  onChange={setSelectedLessonFilter}
                />

                {/* Filter by Status */}
                <CustomFilterDropdown
                  label="وضعیت تکلیف:"
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

              {/* Reset Filters Action */}
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

      {/* 3. Homework Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="p-4 border shadow-xs rounded-2xl">
              <Skeleton className="h-6 w-28 mb-3" />
              <Skeleton className="h-5 w-full mb-3" />
              <Skeleton className="h-9 w-full mb-3" />
              <Skeleton className="h-9 w-full" />
            </Card>
          ))
        ) : filteredHomeworkList.length === 0 ? (
          <div className="col-span-full text-center py-14 bg-white dark:bg-[#151C28] rounded-2xl border border-dashed border-gray-200 dark:border-[#242F42]">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2.5 opacity-60" />
            <h3 className="text-sm sm:text-base font-semibold text-foreground dark:text-white">
              هیچ تکلیفی با شرایط انتخاب‌شده یافت نشد
            </h3>
            <p className="text-xs text-muted-foreground dark:text-slate-400 mt-1">
              {hasActiveFilters
                ? 'می‌توانید فیلترهای بالا را تغییر دهید یا بازنشانی نمایید.'
                : 'در حال حاضر هیچ تکلیفی برای شما ثبت نشده است.'}
            </p>
          </div>
        ) : (
          filteredHomeworkList.map((hw) => {
            const mySub = hw.submissions && hw.submissions.length > 0 ? hw.submissions[0] : null;
            const statusInfo = getHomeworkStatus(hw);
            const StatusIcon = statusInfo.icon;

            return (
              <Card
                key={hw.id}
                className="p-3.5 sm:p-4 border border-gray-200/80 dark:border-[#242F42] bg-white dark:bg-[#151C28] rounded-2xl shadow-xs flex flex-col justify-between transition-colors"
              >
                <div className="space-y-3">
                  {/* Card Header: Lesson Badge (Right) & Status Badge (Left) */}
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant="default" className="font-bold text-xs py-0.5">
                      {hw.lesson?.name || 'درس'}
                    </Badge>

                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold transition-colors select-none ${statusInfo.badgeClass}`}
                    >
                      <StatusIcon className="w-3.5 h-3.5 shrink-0" />
                      <span>{statusInfo.label}</span>
                    </span>
                  </div>

                  {/* Title */}
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-ink-darker dark:text-white line-clamp-1">
                      {hw.title}
                    </h3>
                  </div>

                  {/* Date Created & Mentor Name */}
                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground dark:text-slate-400">
                    {hw.createdAt && (
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-primary shrink-0" />
                        <span>{formatJalaliDateTime(hw.createdAt)}</span>
                      </div>
                    )}
                    {getTeacherName(hw) && (
                      <div className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-primary shrink-0" />
                        <span>{getTeacherName(hw)}</span>
                      </div>
                    )}
                  </div>

                  {/* Due Date Box */}
                  <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-rose-50/70 dark:bg-rose-950/25 border border-rose-200/80 dark:border-rose-900/40 text-rose-700 dark:text-rose-300 text-xs font-bold">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Clock className="h-4 w-4 text-rose-500 shrink-0" />
                      <span className="truncate">مهلت تحویل: {formatJalaliDateTime(hw.dueDate, true) || formatJalaliDisplay(hw.dueDate, true)}</span>
                    </div>
                    {hw.allowLateSubmissions && !mySub && (
                      <span className="text-[10px] text-amber-700 dark:text-amber-300 bg-amber-100/80 dark:bg-amber-900/40 px-2 py-0.5 rounded-md font-bold shrink-0">
                        امکان تأخیر
                      </span>
                    )}
                  </div>
                </div>

                {/* Footer Action & Score */}
                <div className="pt-3 mt-3 border-t border-gray-100 dark:border-[#242F42]">
                  {statusInfo.isGraded && mySub?.score !== null && mySub?.score !== undefined ? (
                    <div className="flex items-center gap-2">
                      <div className="flex-1 flex items-center justify-between gap-1.5 px-3 h-9 rounded-xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-900/40 text-indigo-800 dark:text-indigo-200 text-xs font-bold min-w-0">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <Award className="h-4 w-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                          <span className="truncate">نمره:</span>
                        </div>
                        <span className="font-mono text-sm font-black text-indigo-700 dark:text-indigo-300 shrink-0">
                          {toPersianDigits(mySub.score)} <span className="text-[10px] font-normal text-muted-foreground">/ {toPersianDigits(hw.maxScore || 20)}</span>
                        </span>
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openHomeworkModal(hw)}
                        className="flex-1 text-xs flex items-center justify-center gap-1.5 h-9 rounded-xl font-bold bg-white dark:bg-[#1C2536] border-gray-200 dark:border-[#242F42] text-foreground dark:text-white hover:bg-gray-50 dark:hover:bg-[#242F42] shadow-2xs transition-colors shrink-0"
                      >
                        <Eye className="w-4 h-4 text-primary shrink-0" />
                        <span className="truncate">مشاهده جزئیات</span>
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openHomeworkModal(hw)}
                      className="w-full text-xs flex items-center justify-center gap-1.5 h-9 rounded-xl font-bold bg-white dark:bg-[#1C2536] border-gray-200 dark:border-[#242F42] text-foreground dark:text-white hover:bg-gray-50 dark:hover:bg-[#242F42] shadow-2xs transition-colors"
                    >
                      <Eye className="w-4 h-4 text-primary shrink-0" />
                      <span>مشاهده جزئیات</span>
                    </Button>
                  )}
                </div>
              </Card>
            );
          })
        )}
      </div>

      {/* 4. Homework Details & Submission Modal */}
      <Modal
        isOpen={isSubmitModalOpen}
        onClose={() => {
          setIsSubmitModalOpen(false);
          if (homeworkIdParam) {
            searchParams.delete('homeworkId');
            searchParams.delete('action');
            setSearchParams(searchParams);
          }
        }}
        title="جزئیات تکلیف"
        maxWidth="2xl"
      >
        {error && (
          <div className="mb-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 p-3 text-xs text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
            {error}
          </div>
        )}

        {(() => {
          if (!selectedHomework) return null;
          const mySub = selectedHomework?.submissions?.[0];
          const isGraded = mySub && (mySub.score !== null && mySub.score !== undefined);
          const isResubmitRequired = mySub?.status === 'RESUBMIT_REQUIRED';
          const isSubmitted = !!mySub;
          const statusInfo = getHomeworkStatus(selectedHomework);
          const StatusIcon = statusInfo.icon;
          const isPastDue = selectedHomework.dueDate ? new Date(selectedHomework.dueDate).getTime() < Date.now() : false;
          const allowLate = !!selectedHomework.allowLateSubmissions;

          return (
            <div className="space-y-4">
              {/* 1. Homework Title & Meta Section (Separated from Header) */}
              <div className="p-3.5 sm:p-4 bg-gray-50 dark:bg-[#1C2536] rounded-2xl border border-gray-200/80 dark:border-[#242F42] space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2.5 sm:mb-3">
                      <Badge variant="default" className="font-bold text-xs py-0.5">
                        {selectedHomework.lesson?.name || 'درس'}
                      </Badge>
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${statusInfo.badgeClass}`}
                      >
                        <StatusIcon className="w-3.5 h-3.5 shrink-0" />
                        <span>{statusInfo.label}</span>
                      </span>
                    </div>
                    <h2 className="text-base sm:text-lg font-black text-ink-darker dark:text-white leading-snug">
                      {selectedHomework.title}
                    </h2>
                  </div>

                  <div className="text-left shrink-0 bg-white dark:bg-[#151C28] px-3 py-1.5 rounded-xl border border-gray-200/80 dark:border-[#242F42] shadow-2xs">
                    <span className="text-[11px] font-bold text-muted-foreground dark:text-slate-400 block">بارم:</span>
                    <span className="text-sm font-black font-mono text-primary">
                      {selectedHomework.maxScore || 20} <span className="text-[10px] font-normal text-muted-foreground">نمره</span>
                    </span>
                  </div>
                </div>

                {/* Dates & Times row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-gray-200/70 dark:border-[#242F42]/80 text-xs">
                  {getTeacherName(selectedHomework) && (
                    <div className="flex items-center gap-1.5 text-muted-foreground dark:text-slate-300">
                      <User className="w-4 h-4 text-primary shrink-0" />
                      <span>مربی: {getTeacherName(selectedHomework)}</span>
                    </div>
                  )}
                  {selectedHomework.createdAt && (
                    <div className="flex items-center gap-1.5 text-muted-foreground dark:text-slate-300">
                      <Calendar className="w-4 h-4 text-primary shrink-0" />
                      <span>تاریخ تعریف: {formatJalaliDateTime(selectedHomework.createdAt)}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 font-bold">
                    <Clock className="w-4 h-4 text-rose-500 shrink-0" />
                    <span>مهلت تحویل: {formatJalaliDateTime(selectedHomework.dueDate, true) || formatJalaliDisplay(selectedHomework.dueDate, true)}</span>
                  </div>
                </div>
              </div>

              {/* 2. Homework Instructions */}
              <div className="p-3.5 sm:p-4 bg-white dark:bg-[#151C28] rounded-2xl border border-gray-200/80 dark:border-[#242F42] shadow-2xs space-y-2.5">
                <div className="font-bold text-[13px] sm:text-sm text-ink-darker dark:text-white flex items-center gap-1.5">
                  <BookOpen className="w-4.5 h-4.5 text-primary shrink-0" />
                  <span>دستورالعمل تکلیف:</span>
                </div>
                <div className="text-sm sm:text-[15px] text-gray-800 dark:text-slate-100 font-medium leading-relaxed sm:leading-7 whitespace-pre-wrap">
                  {selectedHomework.description || 'دستورالعمل خاصی برای این تکلیف ثبت نشده است.'}
                </div>
              </div>

              {/* 3. Graded Banner & Teacher Feedback */}
              {isGraded && (
                <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/30 border border-emerald-200 dark:border-emerald-800/60 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-xl bg-emerald-600 text-white shadow-sm shrink-0">
                        <Award className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="font-bold text-sm text-emerald-950 dark:text-emerald-200">
                          تکلیف تصحیح شد
                        </div>
                        <div className="text-[11px] text-emerald-700 dark:text-emerald-300/90">
                          {mySub.gradedBy
                            ? `${mySub.gradedBy.firstName} ${mySub.gradedBy.lastName}`
                            : 'مربی درس'}
                          {mySub.gradedAt && ` • ${formatJalaliDisplay(mySub.gradedAt)}`}
                        </div>
                      </div>
                    </div>
                    <div className="text-left bg-white dark:bg-[#1C2536] px-3.5 py-1.5 rounded-xl border border-emerald-200 dark:border-emerald-800/60 shadow-sm">
                      <div className="text-lg font-black font-mono text-emerald-700 dark:text-emerald-400">
                        {mySub.score} <span className="text-xs font-normal text-emerald-600 dark:text-emerald-300">/ {selectedHomework.maxScore || 20}</span>
                      </div>
                    </div>
                  </div>

                  {mySub.feedback && (
                    <div className="bg-white/90 dark:bg-[#1C2536]/90 p-3 rounded-xl border border-emerald-100 dark:border-emerald-800/40 text-xs text-emerald-950 dark:text-emerald-100 leading-relaxed">
                      <div className="font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5 mb-1">
                        <MessageSquare className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span>بازخورد مربی:</span>
                      </div>
                      <p className="whitespace-pre-wrap">{mySub.feedback}</p>
                    </div>
                  )}
                </div>
              )}

              {/* 4. Resubmit Required Banner */}
              {isResubmitRequired && (
                <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-900 dark:text-rose-200 space-y-2">
                  <div className="font-bold flex items-center gap-1.5 text-rose-800 dark:text-rose-300">
                    <AlertCircle className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                    <span>نیاز به بازبینی و ارسال مجدد:</span>
                  </div>
                  {mySub.feedback && (
                    <p className="bg-white/90 dark:bg-[#1C2536]/90 p-3 rounded-xl border border-rose-100 dark:border-rose-900/40 text-rose-950 dark:text-rose-100 leading-relaxed whitespace-pre-wrap">
                      {mySub.feedback}
                    </p>
                  )}
                </div>
              )}

              {/* Late Submission Allowed Info Banner */}
              {!isSubmitted && isPastDue && allowLate && (
                <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800/60 text-xs text-amber-900 dark:text-amber-200 space-y-1">
                  <div className="font-bold flex items-center gap-1.5 text-amber-800 dark:text-amber-300">
                    <Clock className="h-4 w-4 text-amber-600 shrink-0" />
                    <span>امکان ارسال با تأخیر فعال است</span>
                  </div>
                  <p className="leading-relaxed">
                    مهلت رسمی تحویل این تکلیف منقضی شده است، اما با مجوز مربی محترم می‌توانید پاسخ خود را ارسال نمایید. تکلیف شما با وضعیت <strong>«تحویل با تأخیر»</strong> در سامانه ثبت خواهد شد.
                  </p>
                </div>
              )}

              {/* Overdue (No Late Submission Allowed) Banner */}
              {!isSubmitted && isPastDue && !allowLate && (
                <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-800 dark:text-rose-200 space-y-1">
                  <div className="font-bold flex items-center gap-1.5 text-rose-700 dark:text-rose-300">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>مهلت تحویل به پایان رسیده است</span>
                  </div>
                  <p className="leading-relaxed">
                    مهلت تعیین‌شده برای تحویل این تکلیف منقضی شده است و امکان ارسال با تأخیر توسط مربی محترم فعال نشده است.
                  </p>
                </div>
              )}

              {/* 5. Student Submission Form with RichTextEditor and File Upload */}
              {statusInfo.canSubmit ? (
                <form onSubmit={handleSubmitHomework} className="space-y-4">
                  <div>
                    <RichTextEditor
                      value={submissionText}
                      onChange={setSubmissionText}
                      label={isSubmitted ? 'پاسخ ارسالی شما:' : 'متن و پاسخ تکلیف:'}
                      placeholder="پاسخ تمرینات یا توضیحات خود را اینجا بنویسید..."
                      rows={4}
                    />
                    {mySub?.submittedAt && (
                      <div className="text-[11px] text-muted-foreground dark:text-slate-400 mt-1">
                        آخرین ارسال: {formatJalaliDateTime(mySub.submittedAt)}
                      </div>
                    )}
                  </div>

                  {/* Attachments Section */}
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs sm:text-[13px] font-bold text-ink-normal/90 dark:text-gray-200 flex items-center gap-1.5">
                        <Paperclip className="w-4 h-4 text-primary" />
                        <span>فایل‌ها و تصاویر پیوست:</span>
                      </label>
                      <button
                        type="button"
                        disabled={isUploading}
                        onClick={() => fileInputRef.current?.click()}
                        className="cursor-pointer inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:text-primary-dark transition-colors px-2.5 py-1.5 rounded-xl bg-primary/10 hover:bg-primary/15"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>{isUploading ? 'در حال آپلود...' : 'افزودن فایل/تصویر'}</span>
                      </button>
                    </div>

                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept="image/*,.pdf,.doc,.docx,.zip,.rar,.txt"
                      className="hidden"
                      onChange={handleFileUpload}
                    />

                    {/* Uploaded Attachments List */}
                    {attachments.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {attachments.map((att, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between p-2.5 bg-gray-50 dark:bg-[#1C2536] rounded-xl border border-gray-200 dark:border-[#242F42] gap-2 min-w-0"
                          >
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              {att.type === 'image' ? (
                                <img
                                  src={att.url}
                                  alt={att.name}
                                  className="w-10 h-10 rounded-lg object-cover border border-gray-200 dark:border-gray-700 shrink-0"
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                                  <FileText className="w-5 h-5" />
                                </div>
                              )}
                              <div className="min-w-0 flex-1">
                                <span className="text-xs font-bold text-ink-darker dark:text-white truncate block">
                                  {att.name}
                                </span>
                                <a
                                  href={att.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[11px] text-primary hover:underline inline-flex items-center gap-1 mt-0.5"
                                >
                                  <span>مشاهده فایل</span>
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => removeAttachment(idx)}
                              className="cursor-pointer p-1.5 text-gray-400 hover:text-rose-500 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors shrink-0"
                              title="حذف پیوست"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div
                        onClick={() => fileInputRef.current?.click()}
                        className="border border-dashed border-gray-200 dark:border-[#242F42] hover:border-primary/50 dark:hover:border-primary/50 rounded-xl p-3.5 text-center cursor-pointer transition-colors bg-gray-50/50 dark:bg-[#1C2536]/40 flex items-center justify-center gap-2 text-xs font-bold text-muted-foreground hover:text-foreground dark:text-slate-400 dark:hover:text-white"
                      >
                        <Upload className="w-4 h-4 text-primary" />
                        <span>برای افزودن فایل یا تصویر اینجا کلیک کنید</span>
                      </div>
                    )}
                  </div>

                  {/* Modal Action Buttons */}
                  <div className="flex justify-end gap-2 pt-3 border-t border-gray-100 dark:border-[#242F42]">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setIsSubmitModalOpen(false)}
                      className="rounded-xl"
                    >
                      بستن
                    </Button>
                    <Button
                      type="submit"
                      variant={!isSubmitted && isPastDue ? 'secondary' : 'primary'}
                      isLoading={isSubmitting}
                      className="rounded-xl shadow-[2px_2px_0_#438C83]"
                    >
                      {!isSubmitted && isPastDue
                        ? 'ارسال پاسخ با تأخیر'
                        : isSubmitted
                        ? 'ویرایش و ارسال مجدد'
                        : 'ارسال نهایی پاسخ'}
                    </Button>
                  </div>
                </form>
              ) : (
                <div className="flex justify-end pt-2 border-t border-gray-100 dark:border-[#242F42]">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setIsSubmitModalOpen(false)}
                    className="rounded-xl px-5 text-xs"
                  >
                    بستن
                  </Button>
                </div>
              )}
            </div>
          );
        })()}
      </Modal>
    </div>
  );
};
