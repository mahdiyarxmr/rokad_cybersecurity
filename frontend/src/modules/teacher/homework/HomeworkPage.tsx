import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { apiClient } from '../../../lib/api/client';
import { toast } from 'sonner';
import JSZip from 'jszip';

import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { Badge } from '../../../components/ui/Badge';
import { Modal } from '../../../components/ui/Modal';
import { Skeleton } from '../../../components/ui/Skeleton';
import { PersianDatePicker } from '../../../components/ui/PersianDatePicker';
import { RichTextEditor } from '../../../components/ui/RichTextEditor';

import {
  gregorianToJalaliStr,
  jalaliToGregorianDate,
  formatJalaliDisplay,
  toPersianDigits,
} from '../../../utils/jalali';

import {
  FileCheck,
  Plus,
  Clock,
  CheckCircle2,
  FileText,
  MessageSquare,
  Award,
  AlertCircle,
  Paperclip,
  ExternalLink,
  X,
  Filter,
  Trash2,
  Calendar,
  User,
  Upload,
  Image as ImageIcon,
  RotateCcw,
  Search,
  Check,
  Loader2,
  FolderArchive,
  Download,
  Eye,
  Send,
  AlertTriangle,
  ArrowUpDown,
  BookOpen,
  ChevronDown,
  ChevronUp,
  GraduationCap,
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Heading2,
  Quote,
  Code,
  Sparkles,
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

interface LessonSelectDropdownProps {
  label: string;
  lessons: any[];
  value: string;
  onChange: (id: string) => void;
  required?: boolean;
}

const LessonSelectDropdown: React.FC<LessonSelectDropdownProps> = ({
  label,
  lessons,
  value,
  onChange,
  required,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedLesson = lessons.find((l) => l.id === value);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  return (
    <div className="space-y-1.5 relative" ref={containerRef}>
      <label className="flex items-center gap-1.5 text-xs font-bold text-ink-normal/80 dark:text-gray-300">
        <BookOpen className="w-3.5 h-3.5 text-primary shrink-0" />
        <span>
          {label} {required && <span className="text-rose-500">*</span>}
        </span>
      </label>

      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`w-full flex items-center justify-between text-xs sm:text-[13px] font-bold h-11 px-3.5 rounded-xl border transition-all duration-150 cursor-pointer select-none text-right ${
          isOpen
            ? 'border-primary ring-2 ring-primary/20 dark:ring-primary/30 bg-white dark:bg-[#1C2536] text-foreground dark:text-white shadow-xs'
            : 'bg-[#FAFAFA] dark:bg-[#1C2536] border-gray-200 dark:border-[#242F42] text-foreground dark:text-white hover:border-gray-300 dark:hover:border-gray-600'
        }`}
      >
        <div className="flex items-center gap-2 truncate min-w-0">
          <BookOpen className="w-4 h-4 text-primary shrink-0 opacity-70" />
          <span className="truncate">
            {selectedLesson
              ? `${selectedLesson.name} ${selectedLesson.code ? `(${selectedLesson.code})` : ''}`
              : '-- لطفاً درس را انتخاب کنید --'}
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
          {lessons.length === 0 ? (
            <div className="p-3 text-xs text-muted-foreground text-center">هیچ درسی تخصیص نیافته است</div>
          ) : (
            lessons.map((l) => {
              const isSelected = l.id === value;
              return (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => {
                    onChange(l.id);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs sm:text-[13px] transition-colors cursor-pointer text-right ${
                    isSelected
                      ? 'bg-primary/10 text-primary dark:text-primary font-black'
                      : 'text-ink-darker dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-[#1C2536] font-bold'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate min-w-0">
                    <span className="truncate">{l.name}</span>
                    {l.code && (
                      <span className="text-[10px] text-muted-foreground font-mono font-normal">
                        ({l.code})
                      </span>
                    )}
                  </div>
                  {isSelected && <Check className="w-4 h-4 text-primary shrink-0" />}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

interface MultiSelectClassroomDropdownProps {
  label: string;
  classrooms: any[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  required?: boolean;
}

const MultiSelectClassroomDropdown: React.FC<MultiSelectClassroomDropdownProps> = ({
  label,
  classrooms,
  selectedIds,
  onChange,
  required,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const allSelected = classrooms.length > 0 && selectedIds.length === classrooms.length;

  const handleToggleAll = () => {
    if (allSelected) {
      if (classrooms.length > 0) {
        onChange([classrooms[0].id]);
      }
    } else {
      onChange(classrooms.map((c) => c.id));
    }
  };

  const handleToggleClassroom = (id: string) => {
    if (selectedIds.includes(id)) {
      if (selectedIds.length <= 1) {
        toast.info('حداقل باید یک کلاس انتخاب شده باشد.');
        return;
      }
      onChange(selectedIds.filter((item) => item !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  // Summary display text
  let summaryText = '-- لطفاً کلاس را انتخاب کنید --';
  if (classrooms.length === 0) {
    summaryText = 'هیچ کلاسی برای این درس یافت نشد';
  } else if (allSelected && classrooms.length > 1) {
    summaryText = `همه کلاس‌ها (${toPersianDigits(classrooms.length)} کلاس)`;
  } else if (selectedIds.length === 1) {
    const found = classrooms.find((c) => c.id === selectedIds[0]);
    summaryText = found ? found.name : '۱ کلاس انتخاب شده';
  } else if (selectedIds.length > 1) {
    const firstFound = classrooms.find((c) => c.id === selectedIds[0]);
    summaryText = firstFound
      ? `${firstFound.name} (+${toPersianDigits(selectedIds.length - 1)})`
      : `${toPersianDigits(selectedIds.length)} کلاس انتخاب شده`;
  }

  return (
    <div className="space-y-1.5 relative" ref={containerRef}>
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-1.5 text-xs font-bold text-ink-normal/80 dark:text-gray-300">
          <GraduationCap className="w-3.5 h-3.5 text-primary shrink-0" />
          <span>
            {label} {required && <span className="text-rose-500">*</span>}
          </span>
        </label>
        {selectedIds.length > 0 && classrooms.length > 0 && (
          <span className="text-[10px] font-mono font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
            {toPersianDigits(selectedIds.length)} از {toPersianDigits(classrooms.length)} کلاس
          </span>
        )}
      </div>

      <button
        type="button"
        disabled={classrooms.length === 0}
        onClick={() => setIsOpen((prev) => !prev)}
        className={`w-full flex items-center justify-between text-xs sm:text-[13px] font-bold h-11 px-3.5 rounded-xl border transition-all duration-150 cursor-pointer select-none text-right disabled:opacity-50 disabled:cursor-not-allowed ${
          isOpen
            ? 'border-primary ring-2 ring-primary/20 dark:ring-primary/30 bg-white dark:bg-[#1C2536] text-foreground dark:text-white shadow-xs'
            : 'bg-[#FAFAFA] dark:bg-[#1C2536] border-gray-200 dark:border-[#242F42] text-foreground dark:text-white hover:border-gray-300 dark:hover:border-gray-600'
        }`}
      >
        <div className="flex items-center gap-2 truncate min-w-0">
          <GraduationCap className="w-4 h-4 text-primary shrink-0 opacity-70" />
          <span className="truncate">{summaryText}</span>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-muted-foreground dark:text-slate-400 shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-primary' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1.5 z-50 bg-white dark:bg-[#151C28] rounded-xl border border-gray-200 dark:border-[#242F42] shadow-xl p-1.5 space-y-1 animate-in fade-in zoom-in-95 duration-150 max-h-64 overflow-y-auto">
          {classrooms.length > 1 && (
            <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-gray-100 dark:border-[#242F42]">
              <span className="text-[11px] text-muted-foreground font-medium">
                انتخاب چندگانه
              </span>
              <button
                type="button"
                onClick={handleToggleAll}
                className="text-[11px] text-primary hover:underline font-bold cursor-pointer"
              >
                {allSelected ? 'تنها یک کلاس' : 'انتخاب همه کلاس‌ها'}
              </button>
            </div>
          )}

          {classrooms.length === 0 ? (
            <div className="p-3 text-xs text-muted-foreground text-center">کلاسی برای این درس یافت نشد</div>
          ) : (
            classrooms.map((c) => {
              const isSelected = selectedIds.includes(c.id);
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => handleToggleClassroom(c.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs sm:text-[13px] transition-colors cursor-pointer text-right ${
                    isSelected
                      ? 'bg-primary/10 text-primary dark:text-primary font-black'
                      : 'text-ink-darker dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-[#1C2536] font-bold'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate min-w-0">
                    <div
                      className={`w-4 h-4 rounded-md flex items-center justify-center shrink-0 border transition-all ${
                        isSelected
                          ? 'bg-primary border-primary text-white'
                          : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-[#151C28]'
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                    <span className="truncate">{c.name}</span>
                  </div>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

interface TimePickerFieldProps {
  label: string;
  hour: string;
  minute: string;
  onHourChange: (h: string) => void;
  onMinuteChange: (m: string) => void;
  required?: boolean;
}

const TimePickerField: React.FC<TimePickerFieldProps> = ({
  label,
  hour,
  minute,
  onHourChange,
  onMinuteChange,
  required,
}) => {
  const hourInputRef = useRef<HTMLInputElement>(null);
  const minuteInputRef = useRef<HTMLInputElement>(null);

  const handleHourChange = (val: string) => {
    const clean = val.replace(/\D/g, '').slice(0, 2);
    if (!clean) {
      onHourChange('');
      return;
    }
    const num = parseInt(clean, 10);
    if (num > 23) {
      onHourChange('23');
      minuteInputRef.current?.focus();
      return;
    }
    onHourChange(clean);
    if (clean.length === 2 || num >= 3) {
      minuteInputRef.current?.focus();
    }
  };

  const handleHourBlur = () => {
    if (!hour) {
      onHourChange('00');
      return;
    }
    const num = Math.min(23, Math.max(0, parseInt(hour, 10) || 0));
    onHourChange(String(num).padStart(2, '0'));
  };

  const handleMinuteChange = (val: string) => {
    const clean = val.replace(/\D/g, '').slice(0, 2);
    if (!clean) {
      onMinuteChange('');
      return;
    }
    const num = parseInt(clean, 10);
    if (num > 59) {
      onMinuteChange('59');
      return;
    }
    onMinuteChange(clean);
  };

  const handleMinuteBlur = () => {
    if (!minute) {
      onMinuteChange('00');
      return;
    }
    const num = Math.min(59, Math.max(0, parseInt(minute, 10) || 0));
    onMinuteChange(String(num).padStart(2, '0'));
  };

  const stepHour = (delta: number) => {
    const current = parseInt(hour, 10) || 0;
    let next = (current + delta) % 24;
    if (next < 0) next += 24;
    onHourChange(String(next).padStart(2, '0'));
  };

  const stepMinute = (delta: number) => {
    const current = parseInt(minute, 10) || 0;
    let next = (current + delta) % 60;
    if (next < 0) next += 60;
    onMinuteChange(String(next).padStart(2, '0'));
  };

  const handleKeyDown = (e: React.KeyboardEvent, field: 'hour' | 'minute') => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (field === 'hour') stepHour(1);
      else stepMinute(e.shiftKey ? 5 : 1);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (field === 'hour') stepHour(-1);
      else stepMinute(e.shiftKey ? -5 : -1);
    }
  };

  return (
    <div className="flex items-center justify-between h-11 px-3.5 rounded-xl border border-gray-200 dark:border-[#242F42] bg-[#FAFAFA] dark:bg-[#1C2536] hover:border-gray-300 dark:hover:border-gray-600 focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all shadow-2xs">
      {/* عنوان فیلد */}
      <label className="flex items-center gap-1.5 text-xs font-bold text-ink-normal/80 dark:text-gray-300 select-none cursor-pointer">
        <Clock className="w-4 h-4 text-primary shrink-0 opacity-80" />
        <span>
          {label} {required && <span className="text-rose-500">*</span>}
        </span>
      </label>

      {/* باکس ساعت و دقیقه با فلش‌های بالا و پایین اختصاصی هر باکس روبه‌روی عنوان */}
      <div dir="ltr" className="flex items-center gap-1.5">
        {/* Hour Box */}
        <div className="flex items-center rounded-lg border border-gray-200 dark:border-[#242F42] bg-white dark:bg-[#151C28] shadow-2xs overflow-hidden focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/30">
          <input
            ref={hourInputRef}
            type="text"
            inputMode="numeric"
            maxLength={2}
            value={hour}
            onFocus={() => hourInputRef.current?.select()}
            onChange={(e) => handleHourChange(e.target.value)}
            onBlur={handleHourBlur}
            onKeyDown={(e) => handleKeyDown(e, 'hour')}
            placeholder="00"
            className="w-9 h-7 text-center !text-center font-mono font-black text-xs sm:text-sm text-ink-darker dark:text-white bg-transparent focus:outline-none p-0"
            style={{ textAlign: 'center' }}
            title="ساعت (۰۰ تا ۲۳) - با کیبورد یا فلش‌ها"
            aria-label="ساعت"
          />
          <div className="flex flex-col border-r border-gray-100 dark:border-[#242F42]">
            <button
              type="button"
              tabIndex={-1}
              onClick={() => stepHour(1)}
              className="h-3.5 px-1 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-[#242F42] text-muted-foreground hover:text-primary transition-colors cursor-pointer"
              title="افزایش ساعت"
            >
              <ChevronUp className="w-3 h-3" />
            </button>
            <button
              type="button"
              tabIndex={-1}
              onClick={() => stepHour(-1)}
              className="h-3.5 px-1 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-[#242F42] text-muted-foreground hover:text-primary transition-colors cursor-pointer border-t border-gray-100 dark:border-[#242F42]"
              title="کاهش ساعت"
            >
              <ChevronDown className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Separator Colon */}
        <span className="text-sm font-black text-primary select-none px-0.5">:</span>

        {/* Minute Box */}
        <div className="flex items-center rounded-lg border border-gray-200 dark:border-[#242F42] bg-white dark:bg-[#151C28] shadow-2xs overflow-hidden focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/30">
          <input
            ref={minuteInputRef}
            type="text"
            inputMode="numeric"
            maxLength={2}
            value={minute}
            onFocus={() => minuteInputRef.current?.select()}
            onChange={(e) => handleMinuteChange(e.target.value)}
            onBlur={handleMinuteBlur}
            onKeyDown={(e) => handleKeyDown(e, 'minute')}
            placeholder="00"
            className="w-9 h-7 text-center !text-center font-mono font-black text-xs sm:text-sm text-ink-darker dark:text-white bg-transparent focus:outline-none p-0"
            style={{ textAlign: 'center' }}
            title="دقیقه (۰۰ تا ۵۹) - با کیبورد یا فلش‌ها"
            aria-label="دقیقه"
          />
          <div className="flex flex-col border-r border-gray-100 dark:border-[#242F42]">
            <button
              type="button"
              tabIndex={-1}
              onClick={() => stepMinute(1)}
              className="h-3.5 px-1 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-[#242F42] text-muted-foreground hover:text-primary transition-colors cursor-pointer"
              title="افزایش دقیقه"
            >
              <ChevronUp className="w-3 h-3" />
            </button>
            <button
              type="button"
              tabIndex={-1}
              onClick={() => stepMinute(-1)}
              className="h-3.5 px-1 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-[#242F42] text-muted-foreground hover:text-primary transition-colors cursor-pointer border-t border-gray-100 dark:border-[#242F42]"
              title="کاهش دقیقه"
            >
              <ChevronDown className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

interface AttachmentItem {
  name: string;
  url: string;
  size?: number;
  isImage?: boolean;
}

export const HomeworkPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const classroomIdParam = searchParams.get('classroomId');
  const lessonIdParam = searchParams.get('lessonId');
  const classroomNameParam = searchParams.get('classroomName');
  const lessonNameParam = searchParams.get('lessonName');
  const homeworkIdParam = searchParams.get('homeworkId');
  const actionParam = searchParams.get('action');

  const [homeworkList, setHomeworkList] = useState<any[]>([]);
  const [classrooms, setClassrooms] = useState<any[]>([]);
  const [lessons, setLessons] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters State
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  // 3 Modes / Tabs: 'PENDING_PUBLISH' (در انتظار انتشار) | 'PENDING_REVIEW' (در انتظار بررسی) | 'REVIEWED' (بررسی‌شده)
  const [activeTab, setActiveTab] = useState<'PENDING_PUBLISH' | 'PENDING_REVIEW' | 'REVIEWED'>('PENDING_REVIEW');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClassroomFilter, setSelectedClassroomFilter] = useState(classroomIdParam || 'ALL');
  const [selectedLessonFilter, setSelectedLessonFilter] = useState(lessonIdParam || 'ALL');
  const [sortOption, setSortOption] = useState<string>('DUE_DATE_ASC');

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSubmissionsOpen, setIsSubmissionsOpen] = useState(false);
  const [selectedHomework, setSelectedHomework] = useState<any>(null);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [isLoadingSubs, setIsLoadingSubs] = useState(false);
  const [deleteConfirmHw, setDeleteConfirmHw] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Bulk ZIP Download State
  const [isDownloadingZip, setIsDownloadingZip] = useState(false);
  const [zipProgress, setZipProgress] = useState<string>('');

  // Submissions Modal Filtering & Classroom Students
  const [submissionsFilter, setSubmissionsFilter] = useState<'ALL' | 'PENDING' | 'GRADED' | 'NOT_SUBMITTED'>('ALL');
  const [classroomStudents, setClassroomStudents] = useState<any[]>([]);

  // Grading State
  const [gradingSubId, setGradingSubId] = useState<string | null>(null);
  const [gradeInput, setGradeInput] = useState<number>(20);
  const [feedbackInput, setFeedbackInput] = useState<string>('');
  const [resubmitRequiredInput, setResubmitRequiredInput] = useState<boolean>(false);
  const [isSavingGrade, setIsSavingGrade] = useState(false);

  // Create Homework Form State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Scheduled Publishing State
  const [isScheduledPublish, setIsScheduledPublish] = useState(false);
  const [publishDate, setPublishDate] = useState<string>(gregorianToJalaliStr(new Date()));
  const [publishHour, setPublishHour] = useState('08');
  const [publishMinute, setPublishMinute] = useState('00');

  // Due Date & Time
  const [dueDateStr, setDueDateStr] = useState<string>(
    gregorianToJalaliStr(new Date(Date.now() + 86400000 * 3))
  );
  const [dueHour, setDueHour] = useState('23');
  const [dueMinute, setDueMinute] = useState('59');

  const [createForm, setCreateForm] = useState({
    title: '',
    description: '',
    classroomId: classroomIdParam || '',
    lessonId: lessonIdParam || '',
    maxScore: 20,
    allowLateSubmissions: false,
  });

  // Multi-classroom selection state
  const [selectedClassroomIds, setSelectedClassroomIds] = useState<string[]>(
    classroomIdParam ? [classroomIdParam] : []
  );
  const [teacherSchedules, setTeacherSchedules] = useState<any[]>([]);

  // Attachments in Create Homework
  const [uploadedAttachments, setUploadedAttachments] = useState<AttachmentItem[]>([]);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const attachmentInputRef = useRef<HTMLInputElement>(null);

  // Helper for Jalali date formatting with weekday
  const formatJalaliDateTime = (
    dateInput: string | Date | null | undefined,
    includeWeekday = true
  ): string => {
    if (!dateInput) return '';
    const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    if (isNaN(d.getTime())) return '';
    const dateStr = formatJalaliDisplay(d, includeWeekday);
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${dateStr} - ${toPersianDigits(`${hours}:${minutes}`)}`;
  };

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [hwRes, classRes, lessonRes, schedRes] = await Promise.allSettled([
        apiClient.get('/homework'),
        apiClient.get('/classes/classrooms'),
        apiClient.get('/classes/lessons'),
        apiClient.get('/classes/my-schedule'),
      ]);

      const hwData = hwRes.status === 'fulfilled'
        ? (Array.isArray(hwRes.value) ? hwRes.value : ((hwRes.value as any)?.data || []))
        : [];
      const classData = classRes.status === 'fulfilled'
        ? (Array.isArray(classRes.value) ? classRes.value : ((classRes.value as any)?.data || []))
        : [];
      const lessonData = lessonRes.status === 'fulfilled'
        ? (Array.isArray(lessonRes.value) ? lessonRes.value : ((lessonRes.value as any)?.data || []))
        : [];
      const schedVal = schedRes.status === 'fulfilled' ? (schedRes.value as any) : null;
      const schedData = schedVal?.data?.schedules || schedVal?.data || (Array.isArray(schedVal) ? schedVal : []);

      const enrichedHwData = await Promise.all(
        hwData.map(async (hw: any) => {
          if (hw.submissionStats || Array.isArray(hw.submissions)) {
            return hw;
          }
          if ((hw._count?.submissions || 0) > 0) {
            try {
              const subRes: any = await apiClient.get(`/homework/${hw.id}/submissions`);
              const subs = Array.isArray(subRes) ? subRes : (subRes?.data || []);
              const graded = subs.filter((s: any) => s.status === 'GRADED').length;
              const pending = subs.filter((s: any) => s.status !== 'GRADED').length;
              return {
                ...hw,
                submissions: subs,
                submissionStats: { total: subs.length, graded, pending },
              };
            } catch {
              return hw;
            }
          }
          return hw;
        })
      );

      setHomeworkList(enrichedHwData);
      setClassrooms(classData);
      setLessons(lessonData);
      setTeacherSchedules(schedData);

      if (classroomIdParam) {
        setSelectedClassroomIds([classroomIdParam]);
        setSelectedClassroomFilter(classroomIdParam);
      } else if (classData.length > 0 && selectedClassroomIds.length === 0) {
        setSelectedClassroomIds([classData[0].id]);
      }

      if (lessonIdParam) {
        setCreateForm((prev) => ({ ...prev, lessonId: lessonIdParam }));
        setSelectedLessonFilter(lessonIdParam);
      } else if (lessonData.length > 0 && !createForm.lessonId) {
        setCreateForm((prev) => ({ ...prev, lessonId: lessonData[0].id }));
      }

      if (actionParam === 'create') {
        setIsCreateOpen(true);
      }

      if (homeworkIdParam && hwData.length > 0) {
        const target = hwData.find((h: any) => h.id === homeworkIdParam);
        if (target) {
          handleViewSubmissions(target);
        }
      }
    } catch (err) {
      console.error('Failed to load homework data', err);
      toast.error('خطا در دریافت لیست تکالیف');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [homeworkIdParam]);

  // Dynamically compute classrooms that offer the selected lesson
  const availableClassroomsForLesson = useMemo(() => {
    if (!createForm.lessonId) return classrooms;

    const matchedIds = new Set<string>();

    // 1. Matched from teacher weekly schedule
    teacherSchedules.forEach((slot: any) => {
      if (slot.lessonId === createForm.lessonId || slot.secondLessonId === createForm.lessonId) {
        if (slot.classroomId) matchedIds.add(slot.classroomId);
        if (slot.classroom?.id) matchedIds.add(slot.classroom.id);
      }
    });

    // 2. Matched from existing homework assignments
    homeworkList.forEach((hw: any) => {
      const lId = hw.lessonId || hw.lesson?.id;
      if (lId === createForm.lessonId) {
        const cId = hw.classroomId || hw.classroom?.id;
        if (cId) matchedIds.add(cId);
      }
    });

    // 3. Matched from educational level & field compatibility
    const currentLesson = lessons.find((l) => l.id === createForm.lessonId);
    if (currentLesson) {
      classrooms.forEach((c) => {
        const levelMatch = !currentLesson.levelId || !c.levelId || currentLesson.levelId === c.levelId;
        const fieldMatch = !currentLesson.fieldId || !c.fieldId || currentLesson.fieldId === c.fieldId;
        if (levelMatch && fieldMatch) {
          matchedIds.add(c.id);
        }
      });
    }

    const filtered = classrooms.filter((c) => matchedIds.has(c.id));
    return filtered.length > 0 ? filtered : classrooms;
  }, [createForm.lessonId, teacherSchedules, homeworkList, classrooms, lessons]);

  // Keep selectedClassroomIds updated when lesson changes
  useEffect(() => {
    if (availableClassroomsForLesson.length > 0) {
      setSelectedClassroomIds((prev) => {
        const valid = prev.filter((id) => availableClassroomsForLesson.some((c) => c.id === id));
        if (valid.length > 0) return valid;
        return [availableClassroomsForLesson[0].id];
      });
    }
  }, [availableClassroomsForLesson]);

  // Handle uploading attachments during assignment definition
  const handleAttachmentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setIsUploadingAttachment(true);
    setCreateError(null);
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
          // Fallback demo URL if backend endpoint not active
          fileUrl = URL.createObjectURL(file);
        }

        if (fileUrl) {
          const isImg = file.type.startsWith('image/') || /\.(png|jpe?g|gif|webp|svg)$/i.test(file.name);
          setUploadedAttachments((prev) => [
            ...prev,
            {
              name: file.name,
              url: fileUrl,
              size: file.size,
              isImage: isImg,
            },
          ]);
        }
      }
      toast.success('فایل‌های پیوست با موفقیت بارگذاری شدند.');
    } catch (err) {
      console.error('Failed to upload homework attachments', err);
      toast.error('خطا در بارگذاری فایل');
    } finally {
      setIsUploadingAttachment(false);
      if (attachmentInputRef.current) {
        attachmentInputRef.current.value = '';
      }
    }
  };

  const removeUploadedAttachment = (index: number) => {
    setUploadedAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  // Submit Create Homework Form
  const handleCreateHomework = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.lessonId) {
      setCreateError('لطفاً ابتدا درس مرتبط را انتخاب کنید.');
      return;
    }
    if (selectedClassroomIds.length === 0) {
      setCreateError('لطفاً حداقل یک کلاس هدف را انتخاب کنید.');
      return;
    }

    setIsSubmitting(true);
    setCreateError(null);
    try {
      const dueGregorian = jalaliToGregorianDate(dueDateStr);
      dueGregorian.setHours(Number(dueHour) || 23, Number(dueMinute) || 59, 0, 0);

      let publishAtIso: string | undefined = undefined;
      if (isScheduledPublish) {
        const pubGregorian = jalaliToGregorianDate(publishDate);
        pubGregorian.setHours(Number(publishHour) || 8, Number(publishMinute) || 0, 0, 0);
        publishAtIso = pubGregorian.toISOString();
      }

      const basePayload = {
        title: createForm.title,
        description: createForm.description,
        lessonId: createForm.lessonId,
        maxScore: Number(createForm.maxScore) || 20,
        allowLateSubmissions: createForm.allowLateSubmissions,
        dueDate: dueGregorian.toISOString(),
        publishAt: publishAtIso,
        attachmentUrls: uploadedAttachments.map((a) => a.url),
      };

      // Create homework for each selected classroom
      await Promise.all(
        selectedClassroomIds.map((cId) =>
          apiClient.post('/homework', {
            ...basePayload,
            classroomId: cId,
          })
        )
      );

      toast.success(
        selectedClassroomIds.length > 1
          ? `تکلیف با موفقیت برای ${toPersianDigits(selectedClassroomIds.length)} کلاس ثبت شد.`
          : isScheduledPublish
          ? 'تکلیف با موفقیت زمان‌بندی شد و در موعد مقرر منتشر خواهد شد.'
          : 'تکلیف با موفقیت تعریف و منتشر شد.'
      );

      setIsCreateOpen(false);
      setCreateForm({
        title: '',
        description: '',
        classroomId: classrooms[0]?.id || '',
        lessonId: lessons[0]?.id || '',
        maxScore: 20,
        allowLateSubmissions: false,
      });
      setSelectedClassroomIds(availableClassroomsForLesson[0] ? [availableClassroomsForLesson[0].id] : []);
      setUploadedAttachments([]);
      setIsScheduledPublish(false);
      fetchData();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'خطا در تعریف تکلیف.';
      setCreateError(Array.isArray(msg) ? msg.join(' - ') : msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Submissions Modal
  const handleViewSubmissions = async (hw: any) => {
    setSelectedHomework(hw);
    setIsSubmissionsOpen(true);
    setIsLoadingSubs(true);
    setGradingSubId(null);
    setSubmissionsFilter('ALL');
    const classroomId = hw.classroomId || hw.classroom?.id;
    try {
      const [subsRes, studentsRes] = await Promise.allSettled([
        apiClient.get(`/homework/${hw.id}/submissions`),
        classroomId ? apiClient.get(`/classes/classrooms/${classroomId}/students`) : Promise.resolve({ data: [] }),
      ]);

      let subs: any[] = [];
      if (subsRes.status === 'fulfilled') {
        const resVal: any = subsRes.value;
        subs = Array.isArray(resVal) ? resVal : (resVal?.data || []);
      } else {
        try {
          const detailRes: any = await apiClient.get(`/homework/${hw.id}`);
          const details = Array.isArray(detailRes) ? detailRes : (detailRes?.data || detailRes);
          subs = details?.submissions || [];
        } catch (innerErr) {
          console.error('Failed to load homework details fallback', innerErr);
        }
      }
      setSubmissions(subs);

      let enrolled: any[] = [];
      if (studentsRes.status === 'fulfilled') {
        const resStudents: any = studentsRes.value;
        enrolled = Array.isArray(resStudents) ? resStudents : (resStudents?.data || []);
      }
      setClassroomStudents(enrolled);
    } catch (err) {
      console.error('Failed to load submissions or students', err);
    } finally {
      setIsLoadingSubs(false);
    }
  };

  // Save Grade & Feedback for a submission
  const handleSaveGrade = async (subId: string) => {
    try {
      setIsSavingGrade(true);
      await apiClient.patch(`/homework/submissions/${subId}/grade`, {
        score: Number(gradeInput),
        feedback: feedbackInput,
        resubmitRequired: resubmitRequiredInput,
      });
      toast.success('نمره و بازخورد با موفقیت ثبت شد');
      setGradingSubId(null);
      if (selectedHomework) {
        try {
          const res: any = await apiClient.get(`/homework/${selectedHomework.id}/submissions`);
          const subs = Array.isArray(res) ? res : (res?.data || []);
          setSubmissions(subs);
          const pendingCount = subs.filter((s: any) => s.status !== 'GRADED').length;
          const gradedCount = subs.filter((s: any) => s.status === 'GRADED').length;
          setHomeworkList((prev) =>
            prev.map((hw) =>
              hw.id === selectedHomework.id
                ? {
                    ...hw,
                    submissions: subs,
                    submissionStats: {
                      total: subs.length,
                      graded: gradedCount,
                      pending: pendingCount,
                    },
                  }
                : hw
            )
          );
        } catch {
          // ignore refresh error
        }
      }
      fetchData();
    } catch (err: any) {
      console.error('Failed to save grade', err);
      toast.error(err.response?.data?.message || 'خطا در ثبت نمره');
    } finally {
      setIsSavingGrade(false);
    }
  };

  // Delete Homework
  const handleDeleteHomework = async () => {
    if (!deleteConfirmHw) return;
    try {
      setIsDeleting(true);
      await apiClient.delete(`/homework/${deleteConfirmHw.id}`);
      toast.success(`تکلیف «${deleteConfirmHw.title}» با موفقیت حذف شد`);
      setDeleteConfirmHw(null);
      fetchData();
    } catch (err: any) {
      console.error('Failed to delete homework', err);
      toast.error(err.response?.data?.message || 'خطا در حذف تکلیف');
    } finally {
      setIsDeleting(false);
    }
  };

  // Bulk Download of All Student Attachments as ZIP
  const handleBulkDownloadAttachments = async () => {
    if (!selectedHomework || submissions.length === 0) return;

    const submissionsWithFiles = submissions.filter(
      (s) => s.attachmentUrls && s.attachmentUrls.length > 0
    );

    const totalAttachments = submissionsWithFiles.reduce(
      (sum, s) => sum + s.attachmentUrls.length,
      0
    );

    if (totalAttachments === 0) {
      toast.info('هیچ فایل پیوستی توسط دانش‌آموزان برای این تکلیف ارسال نشده است.');
      return;
    }

    try {
      setIsDownloadingZip(true);
      setZipProgress(`آماده‌سازی فایل فشرده (۰ از ${totalAttachments})...`);

      const zip = new JSZip();
      let processedCount = 0;

      for (const sub of submissionsWithFiles) {
        const studentFirstName = sub.student?.user?.firstName || 'دانش‌آموز';
        const studentLastName = sub.student?.user?.lastName || '';
        const studentCleanName = `${studentFirstName}_${studentLastName}`.trim().replace(/[/\\?%*:|"<>]/g, '_');

        for (let i = 0; i < sub.attachmentUrls.length; i++) {
          const url = sub.attachmentUrls[i];
          try {
            const response = await fetch(url);
            const blob = await response.blob();

            let ext = 'bin';
            const urlPath = url.split('?')[0];
            const extMatch = urlPath.match(/\.([a-zA-Z0-9]+)$/i);
            if (extMatch) {
              ext = extMatch[1];
            } else if (blob.type) {
              const subType = blob.type.split('/')[1];
              if (subType) ext = subType.replace('+xml', '');
            }

            const fileName = `${studentCleanName}_پیوست_${toPersianDigits(i + 1)}.${ext}`;
            zip.file(fileName, blob);

            processedCount++;
            setZipProgress(`در حال فشرده‌سازی (${toPersianDigits(processedCount)} از ${toPersianDigits(totalAttachments)})...`);
          } catch (fetchErr) {
            console.error(`Failed to download attachment from ${url}`, fetchErr);
          }
        }
      }

      setZipProgress('در حال بسته‌بندی فایل ZIP...');
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const downloadUrl = URL.createObjectURL(zipBlob);

      const a = document.createElement('a');
      a.href = downloadUrl;
      const cleanTitle = (selectedHomework.title || 'تکلیف').replace(/[/\\?%*:|"<>]/g, '_');
      a.download = `پیوست‌های_${cleanTitle}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(downloadUrl);

      toast.success(`فایل ZIP با موفقیت دانلود شد (${toPersianDigits(processedCount)} پیوست)`);
    } catch (err) {
      console.error('Error generating bulk ZIP', err);
      toast.error('خطا در بسته‌بندی و دانلود فایل‌های پیوست');
    } finally {
      setIsDownloadingZip(false);
      setZipProgress('');
    }
  };

  // Determine homework status and UI properties (matching the 3 tabs exactly)
  const getHomeworkStatus = (hw: any) => {
    // 1. تکالیفی که هنوز منتشر نشدن میشن در انتظار انتشار
    const isPendingPublish =
      Boolean(hw.isScheduled) ||
      Boolean(hw.publishAt && new Date(hw.publishAt).getTime() > Date.now());

    if (isPendingPublish) {
      return {
        key: 'PENDING_PUBLISH' as const,
        label: 'در انتظار انتشار',
        badgeClass: 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60',
        icon: Calendar,
      };
    }

    // 2. آمار پاسخ‌های تکلیف منتشرشده
    let pending = 0;
    if (Array.isArray(hw.submissions)) {
      pending = hw.submissions.filter((s: any) => s.status !== 'GRADED').length;
    } else if (hw.submissionStats && typeof hw.submissionStats.pending === 'number') {
      pending = hw.submissionStats.pending;
    } else {
      pending = 0;
    }

    // تکالیفی که ۱ یا چند پاسخ در انتظار نمره‌دهی دارند، میشن در انتظار بررسی
    if (pending > 0) {
      return {
        key: 'PENDING_REVIEW' as const,
        label: 'در انتظار بررسی',
        badgeClass: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-500/30',
        icon: Clock,
      };
    }

    // تکالیفی که همه پاسخ‌ها نمره داده شدن، میشن بررسی‌شده
    return {
      key: 'REVIEWED' as const,
      label: 'بررسی‌شده',
      badgeClass: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30',
      icon: CheckCircle2,
    };
  };

  // Counters Calculation for the 3 States
  const pendingPublishCount = useMemo(() => {
    return homeworkList.filter((hw) => {
      const status = getHomeworkStatus(hw);
      return status.key === 'PENDING_PUBLISH';
    }).length;
  }, [homeworkList]);

  const pendingReviewCount = useMemo(() => {
    return homeworkList.filter((hw) => {
      const status = getHomeworkStatus(hw);
      return status.key === 'PENDING_REVIEW';
    }).length;
  }, [homeworkList]);

  const reviewedCount = useMemo(() => {
    return homeworkList.filter((hw) => {
      const status = getHomeworkStatus(hw);
      return status.key === 'REVIEWED';
    }).length;
  }, [homeworkList]);

  const classroomFilterOptions: FilterOption[] = useMemo(
    () => [
      { value: 'ALL', label: 'همه کلاس‌های درس' },
      ...classrooms.map((c) => ({ value: c.id, label: `کلاس ${c.name}` })),
    ],
    [classrooms]
  );

  const lessonFilterOptions: FilterOption[] = useMemo(
    () => [
      { value: 'ALL', label: 'همه درس‌ها' },
      ...lessons.map((l) => ({ value: l.id, label: l.name })),
    ],
    [lessons]
  );

  const sortOptions: FilterOption[] = useMemo(
    () => [
      { value: 'DUE_DATE_ASC', label: 'مهلت تحویل (نزدیک‌ترین)' },
      { value: 'DUE_DATE_DESC', label: 'مهلت تحویل (دورترین)' },
      { value: 'CREATED_AT_DESC', label: 'تاریخ تعریف (جدیدترین)' },
      { value: 'CREATED_AT_ASC', label: 'تاریخ تعریف (قدیمی‌ترین)' },
    ],
    []
  );

  const hasActiveFilters =
    selectedClassroomFilter !== 'ALL' ||
    selectedLessonFilter !== 'ALL' ||
    searchQuery.trim() !== '' ||
    sortOption !== 'DUE_DATE_ASC';

  const resetFilters = () => {
    setSelectedClassroomFilter('ALL');
    setSelectedLessonFilter('ALL');
    setSearchQuery('');
    setSortOption('DUE_DATE_ASC');
    if (classroomIdParam || lessonIdParam) {
      searchParams.delete('classroomId');
      searchParams.delete('lessonId');
      searchParams.delete('classroomName');
      searchParams.delete('lessonName');
      setSearchParams(searchParams);
    }
  };

  // Tab Filtering, Search & Sorting
  const filteredHomeworkList = useMemo(() => {
    return homeworkList
      .filter((hw) => {
        // 1. Tab / Status Mode: exactly matches the 3 items
        const status = getHomeworkStatus(hw);
        if (status.key !== activeTab) return false;

        // 2. Classroom Filter
        if (selectedClassroomFilter !== 'ALL') {
          const cId = hw.classroomId || hw.classroom?.id;
          if (cId !== selectedClassroomFilter) return false;
        }

        // 3. Lesson Filter
        if (selectedLessonFilter !== 'ALL') {
          const lId = hw.lessonId || hw.lesson?.id;
          if (lId !== selectedLessonFilter) return false;
        }

        // 4. Search Query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchTitle = hw.title?.toLowerCase().includes(q);
          const matchLesson = hw.lesson?.name?.toLowerCase().includes(q);
          const matchClass = hw.classroom?.name?.toLowerCase().includes(q);
          const matchDesc = hw.description?.toLowerCase().includes(q);
          if (!matchTitle && !matchLesson && !matchClass && !matchDesc) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortOption === 'DUE_DATE_ASC') {
          const timeA = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
          const timeB = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
          return timeA - timeB;
        }
        if (sortOption === 'DUE_DATE_DESC') {
          const timeA = a.dueDate ? new Date(a.dueDate).getTime() : 0;
          const timeB = b.dueDate ? new Date(b.dueDate).getTime() : 0;
          return timeB - timeA;
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
  }, [homeworkList, activeTab, selectedClassroomFilter, selectedLessonFilter, searchQuery, sortOption]);

  // Merge classroom students and submissions for comprehensive review
  const allStudentsWithSubmissions = useMemo(() => {
    const map = new Map<
      string,
      {
        key: string;
        studentId: string;
        studentName: string;
        avatarUrl?: string;
        submission?: any;
        isLate: boolean;
        isGraded: boolean;
        hasSubmission: boolean;
      }
    >();

    // 1. Enrolled students from classroom
    classroomStudents.forEach((item: any) => {
      const student = item.student || item;
      const user = student.user || item.user;
      const studentId = student.id || item.id;
      if (!studentId) return;
      const name = `${user?.firstName || 'دانش‌آموز'} ${user?.lastName || ''}`.trim();
      map.set(studentId, {
        key: studentId,
        studentId,
        studentName: name || 'دانش‌آموز',
        avatarUrl: user?.avatarUrl,
        submission: null,
        isLate: false,
        isGraded: false,
        hasSubmission: false,
      });
    });

    // 2. Attach or add submissions
    submissions.forEach((sub: any) => {
      const studentId = sub.studentId || sub.student?.id;
      const user = sub.student?.user;
      const name = `${user?.firstName || 'دانش‌آموز'} ${user?.lastName || ''}`.trim();
      const isLate =
        sub.status === 'LATE' ||
        Boolean(
          selectedHomework?.dueDate &&
            sub.submittedAt &&
            new Date(sub.submittedAt).getTime() > new Date(selectedHomework.dueDate).getTime()
        );
      const isGraded = sub.status === 'GRADED';

      if (studentId && map.has(studentId)) {
        const existing = map.get(studentId)!;
        existing.submission = sub;
        existing.isLate = isLate;
        existing.isGraded = isGraded;
        existing.hasSubmission = true;
        if (!existing.avatarUrl && user?.avatarUrl) {
          existing.avatarUrl = user.avatarUrl;
        }
      } else {
        const key = studentId || `sub-${sub.id}`;
        map.set(key, {
          key,
          studentId: studentId || key,
          studentName: name || 'دانش‌آموز',
          avatarUrl: user?.avatarUrl,
          submission: sub,
          isLate,
          isGraded,
          hasSubmission: true,
        });
      }
    });

    return Array.from(map.values());
  }, [classroomStudents, submissions, selectedHomework]);

  // Submissions/Students filtered inside modal
  const modalFilteredStudents = useMemo(() => {
    if (submissionsFilter === 'PENDING') {
      return allStudentsWithSubmissions.filter((s) => s.hasSubmission && !s.isGraded);
    }
    if (submissionsFilter === 'GRADED') {
      return allStudentsWithSubmissions.filter((s) => s.hasSubmission && s.isGraded);
    }
    if (submissionsFilter === 'NOT_SUBMITTED') {
      return allStudentsWithSubmissions.filter((s) => !s.hasSubmission);
    }
    return allStudentsWithSubmissions;
  }, [allStudentsWithSubmissions, submissionsFilter]);

  const totalAttachmentsInModal = useMemo(() => {
    return submissions.reduce((sum, s) => sum + (s.attachmentUrls?.length || 0), 0);
  }, [submissions]);

  return (
    <div className="space-y-4 pb-12 animate-in fade-in duration-300">
      {/* 1. Header & Controls Master Panel */}
      <div className="bg-white dark:bg-[#151C28] rounded-2xl border-[1.5px] border-primary-dark/30 dark:border-gray-800 shadow-[2px_2px_0_#59BBAF] dark:shadow-[2px_2px_0_#0B0F17] p-4 sm:p-5 space-y-4">
        {/* Top Row: Title & Actions */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary dark:text-primary border border-primary/25 flex items-center justify-center font-black shadow-2xs shrink-0">
              <FileCheck className="w-5 h-5" />
            </div>
            <div className="flex items-center gap-2 min-w-0">
              <h1 className="text-lg sm:text-2xl font-black text-ink-darker dark:text-white truncate">
                تکالیف
              </h1>
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

        {/* Full-width "تعریف تکلیف جدید" Button */}
        <div>
          <Button
            variant="primary"
            onClick={() => {
              setCreateError(null);
              setIsCreateOpen(true);
            }}
            className="w-full flex items-center justify-center gap-2 h-11 sm:h-12 rounded-xl text-xs sm:text-sm font-bold shadow-xs cursor-pointer"
          >
            <Plus className="h-5 w-5" />
            <span>تعریف تکلیف جدید</span>
          </Button>
        </div>
      </div>

      {/* 2. Filter & Sort Panel (Collapsible with smooth animation) */}
      <div
        className={`grid transition-all duration-300 ease-in-out ${
          isFilterOpen
            ? 'grid-rows-[1fr] opacity-100 translate-y-0'
            : 'grid-rows-[0fr] opacity-0 -translate-y-2 pointer-events-none'
        }`}
      >
        <div className={`min-h-0 ${isFilterOpen ? 'overflow-visible' : 'overflow-hidden'}`}>
          <div className="bg-white dark:bg-[#151C28] rounded-2xl border border-gray-200/80 dark:border-[#242F42] p-3.5 sm:p-4 shadow-xs space-y-3.5">
            {/* Search Box */}
            <div className="relative">
              <Search className="w-4 h-4 text-muted-foreground dark:text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="جستجو در عنوان تکلیف، درس یا شرح..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-10 pr-10 pl-3 rounded-xl border border-gray-200 dark:border-[#242F42] bg-gray-50 dark:bg-[#1C2536] text-xs sm:text-[13px] text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Dropdown Filters Grid: کلاس درس + درس + مرتب‌سازی */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Filter by Classroom */}
              <CustomFilterDropdown
                label="کلاس درس:"
                labelIcon={User}
                iconColorClass="text-sec-dark dark:text-sec"
                options={classroomFilterOptions}
                value={selectedClassroomFilter}
                onChange={setSelectedClassroomFilter}
              />

              {/* Filter by Lesson */}
              <CustomFilterDropdown
                label="درس:"
                labelIcon={BookOpen}
                iconColorClass="text-primary"
                options={lessonFilterOptions}
                value={selectedLessonFilter}
                onChange={setSelectedLessonFilter}
              />

              {/* Sort Order */}
              <CustomFilterDropdown
                label="مرتب‌سازی:"
                labelIcon={ArrowUpDown}
                iconColorClass="text-emerald-500"
                options={sortOptions}
                value={sortOption}
                onChange={setSortOption}
              />
            </div>

            {/* Active Filter Counter and Reset */}
            <div className="flex items-center justify-between pt-1">
              <div className="text-[11px] text-muted-foreground dark:text-slate-400">
                تعداد {toPersianDigits(filteredHomeworkList.length)} تکلیف در این بخش یافت شد.
              </div>

              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={resetFilters}
                  className="text-xs h-8 gap-1.5 text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl"
                  title="پاک کردن تمام فیلترها"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>بازنشانی فیلترها</span>
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Status Tabs Bar (در انتظار انتشار، در انتظار بررسی، بررسی‌شده) */}
      <div className="pt-0.5 pb-1 overflow-x-auto scrollbar-none">
        <div className="inline-flex items-center flex-nowrap gap-1.5 p-1.5 rounded-2xl bg-gray-100/90 dark:bg-[#1C2536] border border-gray-200/80 dark:border-[#242F42]">
          {/* Tab 1: Pending Publish */}
          <button
            type="button"
            onClick={() => setActiveTab('PENDING_PUBLISH')}
            className={`flex items-center justify-center gap-2 h-9 sm:h-10 px-3.5 sm:px-4 rounded-xl text-xs sm:text-[13px] font-bold transition-all cursor-pointer select-none whitespace-nowrap shrink-0 ${
              activeTab === 'PENDING_PUBLISH'
                ? 'bg-white dark:bg-[#151C28] text-primary dark:text-primary shadow-xs border border-primary/20'
                : 'text-muted-foreground dark:text-slate-400 hover:text-foreground hover:bg-white/50 dark:hover:bg-[#151C28]/50'
            }`}
          >
            <span>در انتظار انتشار</span>
            <span
              className={`text-[11px] px-2 py-0.5 rounded-full font-mono font-bold shrink-0 ${
                activeTab === 'PENDING_PUBLISH'
                  ? 'bg-primary/10 text-primary dark:text-primary'
                  : 'bg-gray-200/80 dark:bg-[#242F42] text-muted-foreground dark:text-slate-400'
              }`}
            >
              {toPersianDigits(pendingPublishCount)}
            </span>
          </button>

          {/* Tab 2: Pending Review */}
          <button
            type="button"
            onClick={() => setActiveTab('PENDING_REVIEW')}
            className={`flex items-center justify-center gap-2 h-9 sm:h-10 px-3.5 sm:px-4 rounded-xl text-xs sm:text-[13px] font-bold transition-all cursor-pointer select-none whitespace-nowrap shrink-0 ${
              activeTab === 'PENDING_REVIEW'
                ? 'bg-white dark:bg-[#151C28] text-amber-600 dark:text-amber-400 shadow-xs border border-amber-500/30'
                : 'text-muted-foreground dark:text-slate-400 hover:text-foreground hover:bg-white/50 dark:hover:bg-[#151C28]/50'
            }`}
          >
            <span>در انتظار بررسی</span>
            <span
              className={`text-[11px] px-2 py-0.5 rounded-full font-mono font-bold shrink-0 ${
                activeTab === 'PENDING_REVIEW'
                  ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                  : 'bg-gray-200/80 dark:bg-[#242F42] text-muted-foreground dark:text-slate-400'
              }`}
            >
              {toPersianDigits(pendingReviewCount)}
            </span>
          </button>

          {/* Tab 3: Reviewed */}
          <button
            type="button"
            onClick={() => setActiveTab('REVIEWED')}
            className={`flex items-center justify-center gap-2 h-9 sm:h-10 px-3.5 sm:px-4 rounded-xl text-xs sm:text-[13px] font-bold transition-all cursor-pointer select-none whitespace-nowrap shrink-0 ${
              activeTab === 'REVIEWED'
                ? 'bg-white dark:bg-[#151C28] text-emerald-600 dark:text-emerald-400 shadow-xs border border-emerald-500/30'
                : 'text-muted-foreground dark:text-slate-400 hover:text-foreground hover:bg-white/50 dark:hover:bg-[#151C28]/50'
            }`}
          >
            <span>بررسی‌شده</span>
            <span
              className={`text-[11px] px-2 py-0.5 rounded-full font-mono font-bold shrink-0 ${
                activeTab === 'REVIEWED'
                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                  : 'bg-gray-200/80 dark:bg-[#242F42] text-muted-foreground dark:text-slate-400'
              }`}
            >
              {toPersianDigits(reviewedCount)}
            </span>
          </button>
        </div>
      </div>

      {/* 4. Homework Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="p-4 border shadow-xs rounded-2xl">
              <Skeleton className="h-6 w-28 mb-3" />
              <Skeleton className="h-5 w-full mb-3" />
              <Skeleton className="h-10 w-full mb-3" />
              <Skeleton className="h-9 w-full" />
            </Card>
          ))
        ) : filteredHomeworkList.length === 0 ? (
          <div className="col-span-full text-center py-16 bg-white dark:bg-[#151C28] rounded-2xl border border-dashed border-gray-200 dark:border-[#242F42] p-6 space-y-3">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto opacity-60" />
            <h3 className="text-base font-bold text-ink-darker dark:text-white">
              {activeTab === 'PENDING_REVIEW'
                ? 'عالی! هیچ تکلیفی در انتظار بررسی وجود ندارد.'
                : activeTab === 'REVIEWED'
                ? 'هنوز تکلیفی در بخش بررسی‌شده قرار نگرفته است.'
                : 'هیچ تکلیفی در انتظار انتشار یافت نشد.'}
            </h3>
            <p className="text-xs text-muted-foreground dark:text-slate-400 max-w-md mx-auto">
              {activeTab === 'PENDING_PUBLISH'
                ? 'می‌توانید با دکمه «تعریف تکلیف جدید» اولین تکلیف کلاسی خود را ثبت نمایید.'
                : 'می‌توانید تب‌های دیگر را بررسی کنید یا فیلترها را بازنشانی نمایید.'}
            </p>
          </div>
        ) : (
          filteredHomeworkList.map((hw) => {
            const totalSubmissions = hw.submissionStats?.total || hw._count?.submissions || 0;
            const statusInfo = getHomeworkStatus(hw);
            const StatusIcon = statusInfo.icon;
            const isScheduledFuture = hw.isScheduled;

            return (
              <Card
                key={hw.id}
                className="p-4 sm:p-5 border border-gray-200/80 dark:border-[#242F42] bg-white dark:bg-[#151C28] rounded-2xl shadow-xs flex flex-col justify-between hover:border-primary/40 dark:hover:border-primary/40 transition-all duration-200"
              >
                <div className="space-y-3">
                  {/* Top Badges Row: Lesson Badge (Right) | Status Badge (Left - matching the 3 tabs exactly) */}
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant="default" className="text-[11px] font-bold py-0.5">
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
                    <h3 className="font-bold text-base text-ink-darker dark:text-white line-clamp-2 leading-snug">
                      {hw.title}
                    </h3>
                  </div>

                  {/* Creation Date & Classroom Tag (همراه با آیکون مناسب و استایل هماهنگ) */}
                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground dark:text-slate-400">
                    {hw.createdAt && (
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-primary shrink-0" />
                        <span>{formatJalaliDateTime(hw.createdAt, false)}</span>
                      </div>
                    )}
                    {(hw.classroom?.name || hw.classroomName) && (
                      <div className="flex items-center gap-1.5">
                        <GraduationCap className="w-3.5 h-3.5 text-primary shrink-0" />
                        <span>{hw.classroom?.name || hw.classroomName}</span>
                      </div>
                    )}
                  </div>

                  {/* Scheduled Banner if scheduled for future */}
                  {isScheduledFuture && (
                    <div className="flex items-center gap-1.5 p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 text-indigo-700 dark:text-indigo-300 text-xs font-bold">
                      <Calendar className="w-3.5 h-3.5 shrink-0 text-indigo-600 dark:text-indigo-400" />
                      <span>زمان انتشار: {formatJalaliDateTime(hw.publishAt, true)}</span>
                    </div>
                  )}

                  {/* Due Date Box (Neutral clean style) */}
                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-gray-50 dark:bg-[#1C2536] border border-gray-200/80 dark:border-[#242F42] text-gray-700 dark:text-slate-300 text-xs font-medium">
                    <Clock className="h-4 w-4 text-amber-500 shrink-0" />
                    <span>مهلت تحویل: {formatJalaliDateTime(hw.dueDate, true)}</span>
                  </div>

                  {/* Teacher Attachments indicator if present */}
                  {hw.attachmentUrls && hw.attachmentUrls.length > 0 && (
                    <div className="flex items-center gap-1.5 text-xs text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/30 p-2 rounded-xl border border-sky-200 dark:border-sky-800/40">
                      <Paperclip className="w-3.5 h-3.5 shrink-0" />
                      <span>{toPersianDigits(hw.attachmentUrls.length)} فایل پیوست مربی</span>
                    </div>
                  )}

                  {/* Submissions Stats & Max Score in the same row */}
                  <div className="flex items-center justify-between text-xs font-bold pt-1">
                    <span className="text-foreground dark:text-slate-200">
                      {toPersianDigits(totalSubmissions)} پاسخ ارسال‌شده
                    </span>
                    <span className="text-xs font-bold text-primary font-mono bg-primary/10 px-2.5 py-0.5 rounded-full shrink-0">
                      {toPersianDigits(hw.maxScore || 20)} نمره
                    </span>
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="pt-3.5 mt-3.5 border-t border-gray-100 dark:border-[#242F42] flex items-center justify-between gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewSubmissions(hw)}
                    className="flex-1 text-xs h-9 font-bold gap-1.5 rounded-xl border-gray-200 dark:border-[#242F42] hover:bg-gray-50 dark:hover:bg-[#1C2536] cursor-pointer"
                  >
                    <Eye className="w-4 h-4 text-primary shrink-0" />
                    <span>بررسی و ارزیابی پاسخ‌ها</span>
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDeleteConfirmHw(hw)}
                    className="h-9 w-9 p-0 text-muted-foreground hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl cursor-pointer"
                    title="حذف این تکلیف"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </Card>
            );
          })
        )}
      </div>

      {/* 5. MODAL: Define & Schedule Homework */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="تعریف و انتشار تکلیف کلاسی"
        maxWidth="3xl"
      >
        <form onSubmit={handleCreateHomework} className="space-y-4">
          {createError && (
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{createError}</span>
            </div>
          )}

          {lessons.length === 0 && (
            <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-xs rounded-xl">
              <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
              <span>هیچ درسی به حساب کاربری شما تخصیص نیافته است. لطفاً با راهبری مدرسه هماهنگ فرمایید.</span>
            </div>
          )}

          {/* Title */}
          <Input
            label="عنوان تکلیف"
            placeholder="مثال: تمرین‌های فصل سوم - حل معادلات دیفرانسیل"
            value={createForm.title}
            onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
            required
          />

          {/* Lesson & Target Classrooms Dropdowns (side by side in 2 columns) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <LessonSelectDropdown
              label="درس"
              lessons={lessons}
              value={createForm.lessonId}
              onChange={(id) => setCreateForm({ ...createForm, lessonId: id })}
              required
            />
            <MultiSelectClassroomDropdown
              label="کلاس‌های هدف"
              classrooms={availableClassroomsForLesson}
              selectedIds={selectedClassroomIds}
              onChange={setSelectedClassroomIds}
              required
            />
          </div>

          {/* Scheduled Publishing Option (برنامه‌ریزی زمان انتشار) */}
          <div className="p-3.5 rounded-2xl bg-gray-50 dark:bg-[#1C2536] border border-gray-200 dark:border-[#242F42] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary shrink-0" />
                <span className="text-xs sm:text-sm font-bold text-ink-darker dark:text-white">
                  برنامه‌ریزی انتشار تکلیف در زمان مشخص
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isScheduledPublish}
                  onChange={(e) => setIsScheduledPublish(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>

            {isScheduledPublish && (
              <div className="pt-2 border-t border-gray-200/80 dark:border-[#242F42] space-y-3">
                <p className="text-[11px] text-muted-foreground dark:text-slate-400">
                  این تکلیف تا قبل از زمان تعیین‌شده، برای دانش‌آموزان نمایش داده نخواهد شد.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
                  <PersianDatePicker
                    label="تاریخ انتشار خودکار"
                    value={publishDate}
                    onChange={setPublishDate}
                  />
                  <TimePickerField
                    label="ساعت انتشار"
                    hour={publishHour}
                    minute={publishMinute}
                    onHourChange={setPublishHour}
                    onMinuteChange={setPublishMinute}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Due Date & Max Score */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
            <div className="sm:col-span-1">
              <PersianDatePicker
                label="مهلت تحویل (تاریخ)"
                value={dueDateStr}
                onChange={setDueDateStr}
              />
            </div>
            <div>
              <TimePickerField
                label="ساعت تحویل"
                hour={dueHour}
                minute={dueMinute}
                onHourChange={setDueHour}
                onMinuteChange={setDueMinute}
              />
            </div>

            <div>
              <Input
                label="حداکثر نمره (بارم)"
                type="number"
                value={createForm.maxScore}
                onChange={(e) =>
                  setCreateForm({ ...createForm, maxScore: Number(e.target.value) })
                }
                required
              />
            </div>
          </div>

          {/* Description & Instruction (ویرایشگر متن رسمی سایت) */}
          <div>
            <RichTextEditor
              value={createForm.description}
              onChange={(val) => setCreateForm({ ...createForm, description: val })}
              label="شرح دستورالعمل تکلیف:"
              placeholder="صورت مسائل را اینجا بنویسید یا شماره صفحات و تمرین‌های کتاب درسی را مشخص فرمایید..."
              rows={4}
              required
            />
          </div>

          {/* Attachments Section for Teacher (فایل یا تصویر پیوست) */}
          <div className="p-3.5 rounded-2xl bg-gray-50 dark:bg-[#1C2536] border border-gray-200 dark:border-[#242F42] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Paperclip className="w-4 h-4 text-primary shrink-0" />
                <span className="text-xs sm:text-sm font-bold text-ink-darker dark:text-white">
                  فایل‌های پیوست تکلیف
                </span>
              </div>

              <input
                ref={attachmentInputRef}
                type="file"
                multiple
                accept="image/*,.pdf,.doc,.docx,.zip,.rar"
                onChange={handleAttachmentUpload}
                className="hidden"
                id="teacher-hw-file-upload"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => attachmentInputRef.current?.click()}
                disabled={isUploadingAttachment}
                className="text-xs h-8 gap-1.5 rounded-xl border-dashed border-primary text-primary hover:bg-primary/5 cursor-pointer"
              >
                {isUploadingAttachment ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Upload className="w-3.5 h-3.5" />
                )}
                <span>افزودن فایل</span>
              </Button>
            </div>

            {uploadedAttachments.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                {uploadedAttachments.map((att, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-[#151C28] border border-gray-200 dark:border-[#242F42] text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {att.isImage ? (
                        <ImageIcon className="w-4 h-4 text-primary shrink-0" />
                      ) : (
                        <FileText className="w-4 h-4 text-sky-500 shrink-0" />
                      )}
                      <span className="truncate font-medium text-foreground dark:text-slate-200">
                        {att.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <a
                        href={att.url}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1 text-muted-foreground hover:text-primary rounded"
                        title="پیش‌نمایش"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                      <button
                        type="button"
                        onClick={() => removeUploadedAttachment(idx)}
                        className="p-1 text-muted-foreground hover:text-rose-500 rounded cursor-pointer"
                        title="حذف"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Late Submissions Toggle */}
          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="allowLate"
              checked={createForm.allowLateSubmissions}
              onChange={(e) =>
                setCreateForm({ ...createForm, allowLateSubmissions: e.target.checked })
              }
              className="rounded text-primary focus:ring-primary h-4 w-4 cursor-pointer"
            />
            <label
              htmlFor="allowLate"
              className="text-xs font-medium text-ink-normal dark:text-slate-300 cursor-pointer select-none"
            >
              امکان ارسال پاسخ با برچسب تاخیر پس از پایان مهلت فعال باشد
            </label>
          </div>

          {/* Modal Footer */}
          <div className="flex justify-end gap-2 pt-4 border-t border-gray-100 dark:border-[#242F42]">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsCreateOpen(false)}
              className="rounded-xl text-xs"
            >
              انصراف
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={isSubmitting}
              disabled={isSubmitting || lessons.length === 0 || classrooms.length === 0}
              className="rounded-xl text-xs font-bold gap-1.5 cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>{isScheduledPublish ? 'ثبت زمان‌بندی انتشار' : 'انتشار تکلیف'}</span>
            </Button>
          </div>
        </form>
      </Modal>

      {/* 6. MODAL: Submissions & Grading (ارزیابی و نمره‌دهی) */}
      <Modal
        isOpen={isSubmissionsOpen}
        onClose={() => setIsSubmissionsOpen(false)}
        title="بررسی پاسخ‌های دانش‌آموزان"
        maxWidth="4xl"
      >
        <div className="space-y-4">
          {/* Homework Title & Info Summary Box right below modal header */}
          <div className="p-4 rounded-2xl bg-gray-50 dark:bg-[#1C2536] border border-gray-200/80 dark:border-[#242F42] space-y-3">
            {/* Top Row: Lesson badge on right, Max score on left */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-primary/10 text-primary">
                  <BookOpen className="w-3.5 h-3.5 shrink-0" />
                  <span>{selectedHomework?.lesson?.name || 'درس'}</span>
                </span>
              </div>

              {/* Top-Left: Max Score */}
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold font-mono text-muted-foreground bg-white dark:bg-[#151C28] border border-gray-200/60 dark:border-[#242F42] shrink-0">
                {toPersianDigits(selectedHomework?.maxScore || 20)} نمره
              </span>
            </div>

            {/* Middle Row: Homework Title & Meta Info */}
            <div className="space-y-2">
              <h3 className="text-base sm:text-lg font-black text-ink-darker dark:text-white leading-snug">
                {selectedHomework?.title}
              </h3>

              {/* Creation/Publish Date & Classroom Tag */}
              <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground dark:text-slate-400">
                {(selectedHomework?.publishAt || selectedHomework?.createdAt) && (
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span>
                      {formatJalaliDateTime(
                        selectedHomework?.publishAt || selectedHomework?.createdAt,
                        false
                      )}
                    </span>
                  </div>
                )}
                {(selectedHomework?.classroom?.name || selectedHomework?.classroomName) && (
                  <div className="flex items-center gap-1.5">
                    <GraduationCap className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span>{selectedHomework?.classroom?.name || selectedHomework?.classroomName}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Row: Due Date */}
            <div className="flex items-center justify-between flex-wrap gap-3 pt-1">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <Clock className="w-3.5 h-3.5 shrink-0" />
                <span>مهلت تحویل: {formatJalaliDateTime(selectedHomework?.dueDate, true)}</span>
              </span>
            </div>
          </div>

          {/* Submissions Filter Tabs */}
          <div className="flex items-center gap-2 flex-nowrap text-xs font-bold scrollbar-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden overflow-x-auto">
            <button
              type="button"
              onClick={() => setSubmissionsFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer shrink-0 ${
                submissionsFilter === 'ALL'
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              همه دانش‌آموزان ({toPersianDigits(allStudentsWithSubmissions.length)})
            </button>
            <button
              type="button"
              onClick={() => setSubmissionsFilter('PENDING')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer shrink-0 ${
                submissionsFilter === 'PENDING'
                  ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              در انتظار نمره‌دهی (
              {toPersianDigits(allStudentsWithSubmissions.filter((s) => s.hasSubmission && !s.isGraded).length)})
            </button>
            <button
              type="button"
              onClick={() => setSubmissionsFilter('GRADED')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer shrink-0 ${
                submissionsFilter === 'GRADED'
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              نمره‌داده‌شده (
              {toPersianDigits(allStudentsWithSubmissions.filter((s) => s.hasSubmission && s.isGraded).length)})
            </button>
            {allStudentsWithSubmissions.some((s) => !s.hasSubmission) && (
              <button
                type="button"
                onClick={() => setSubmissionsFilter('NOT_SUBMITTED')}
                className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer shrink-0 ${
                  submissionsFilter === 'NOT_SUBMITTED'
                    ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                عدم ارسال (
                {toPersianDigits(allStudentsWithSubmissions.filter((s) => !s.hasSubmission).length)})
              </button>
            )}
          </div>

          {/* Students & Submissions List */}
          {isLoadingSubs ? (
            <div className="py-12 text-center text-xs text-muted-foreground flex flex-col items-center gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <span>در حال بارگذاری اطلاعات و پاسخ‌های دانش‌آموزان...</span>
            </div>
          ) : modalFilteredStudents.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 dark:bg-[#1C2536] rounded-2xl border border-gray-200 dark:border-[#242F42] text-muted-foreground text-xs p-4">
              {allStudentsWithSubmissions.length === 0
                ? 'هیچ دانش‌آموزی در این کلاس ثبت‌نام نکرده است.'
                : 'هیچ موردی در این فیلتر یافت نشد.'}
            </div>
          ) : (
            <div className="space-y-3.5 max-h-[60vh] overflow-y-auto pr-1">
              {modalFilteredStudents.map((item) => {
                const sub = item.submission;
                const hasSubmission = item.hasSubmission;
                const isGraded = item.isGraded;
                const isLate = item.isLate;

                return (
                  <div
                    key={item.key}
                    className={`p-4 rounded-2xl border transition-all space-y-3 shadow-xs ${
                      !hasSubmission
                        ? 'border-dashed border-gray-200 dark:border-[#242F42] bg-gray-50/40 dark:bg-[#151C28]/40'
                        : isGraded
                        ? 'border-emerald-500/30 bg-emerald-500/[0.02] dark:bg-[#151C28]'
                        : 'border-gray-200/80 dark:border-[#242F42] bg-white dark:bg-[#151C28]'
                    }`}
                  >
                    {/* Top Row: Student Info (Right) | Timing Status Tag (Left) */}
                    <div className="flex items-center justify-between gap-3">
                      {/* Student Info: Avatar + Name + Date */}
                      <div className="flex items-center gap-3 min-w-0">
                        {item.avatarUrl ? (
                          <img
                            src={item.avatarUrl}
                            alt={item.studentName}
                            className="w-10 h-10 rounded-full object-cover border border-primary/20 shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-primary/10 text-primary font-black flex items-center justify-center text-sm border border-primary/20 shrink-0 shadow-2xs">
                            {item.studentName[0] || 'د'}
                          </div>
                        )}
                        <div className="min-w-0 space-y-1">
                          <div className="font-black text-sm text-ink-darker dark:text-white truncate">
                            {item.studentName}
                          </div>
                          {sub?.submittedAt ? (
                            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground dark:text-slate-400 font-medium">
                              <Clock className="w-3.5 h-3.5 text-muted-foreground/60 shrink-0" />
                              <span>{formatJalaliDateTime(sub.submittedAt, true)}</span>
                            </div>
                          ) : (
                            <div className="text-[11px] text-muted-foreground/70 dark:text-slate-500 font-medium">
                              بدون پاسخ ثبت‌شده
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Top-Left: Status Tag (به موقع / با تأخیر / عدم ارسال) */}
                      <div className="shrink-0">
                        {hasSubmission ? (
                          isLate ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 shadow-2xs">
                              <Clock className="w-3.5 h-3.5 shrink-0" />
                              <span>با تأخیر</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shadow-2xs">
                              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                              <span>به موقع</span>
                            </span>
                          )
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-gray-100 dark:bg-gray-800 text-muted-foreground border border-gray-200/60 dark:border-gray-700 shadow-2xs">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                            <span>عدم ارسال</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Student Written Response */}
                    {sub?.content && (
                      <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-[#1C2536] border border-gray-200/80 dark:border-[#242F42] text-xs sm:text-[13px] text-foreground leading-relaxed whitespace-pre-wrap">
                        {sub.content}
                      </div>
                    )}

                    {/* Student Attachments */}
                    {sub?.attachmentUrls && sub.attachmentUrls.length > 0 && (
                      <div className="space-y-1.5">
                        <div className="text-[11px] font-bold text-muted-foreground dark:text-slate-400">
                          فایل‌های پیوست ارسال‌شده ({toPersianDigits(sub.attachmentUrls.length)}):
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {sub.attachmentUrls.map((url: string, idx: number) => {
                            const isImg = !!url.match(/\.(jpg|jpeg|png|webp|gif|svg)$/i) || url.startsWith('data:image/');
                            return (
                              <a
                                key={idx}
                                href={url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-primary/5 hover:bg-primary/10 text-primary text-xs font-bold border border-primary/20 transition-all hover:shadow-2xs cursor-pointer"
                              >
                                {isImg ? (
                                  <ImageIcon className="w-3.5 h-3.5" />
                                ) : (
                                  <FileText className="w-3.5 h-3.5" />
                                )}
                                <span>پیوست {toPersianDigits(idx + 1)}</span>
                                <ExternalLink className="w-3 h-3 opacity-60" />
                              </a>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Existing Teacher Feedback Display */}
                    {sub?.feedback && gradingSubId !== sub.id && (
                      <div className="p-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-800/30 text-xs text-emerald-900 dark:text-emerald-200 flex items-start gap-2">
                        <MessageSquare className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <div className="space-y-0.5">
                          <span className="font-bold text-emerald-700 dark:text-emerald-300">بازخورد ثبت‌شده مربی:</span>
                          <p className="leading-relaxed">{sub.feedback}</p>
                        </div>
                      </div>
                    )}

                    {/* Enhanced Inline Grading Form */}
                    {hasSubmission && gradingSubId === sub.id ? (
                      <div className="p-4 rounded-2xl bg-gray-50/90 dark:bg-[#1C2536] border-2 border-primary/30 space-y-4 animate-in fade-in zoom-in-95 duration-150">
                        {/* Row 1: Score & Quick Score Pills */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-ink-normal/80 dark:text-gray-300 flex items-center gap-1.5">
                              <Award className="w-4 h-4 text-primary shrink-0" />
                              <span>ثبت نمره دانش‌آموز</span>
                            </label>
                            <span className="text-[11px] font-mono text-muted-foreground">
                              سقف نمره: {toPersianDigits(selectedHomework?.maxScore || 20)}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 flex-wrap">
                            <div className="flex items-center gap-2 bg-white dark:bg-[#151C28] px-3 py-1.5 rounded-xl border border-gray-200 dark:border-[#242F42] shadow-2xs">
                              <input
                                type="number"
                                min={0}
                                max={selectedHomework?.maxScore || 20}
                                step="0.25"
                                value={gradeInput}
                                onChange={(e) => setGradeInput(Number(e.target.value))}
                                className="w-16 h-8 text-center font-mono font-black text-sm text-foreground bg-transparent focus:outline-none"
                              />
                              <span className="text-xs text-muted-foreground font-mono font-bold">
                                / {toPersianDigits(selectedHomework?.maxScore || 20)}
                              </span>
                            </div>

                            {/* Quick Score Preset Pills */}
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {[
                                selectedHomework?.maxScore || 20,
                                Math.round((selectedHomework?.maxScore || 20) * 0.9),
                                Math.round((selectedHomework?.maxScore || 20) * 0.75),
                                Math.round((selectedHomework?.maxScore || 20) * 0.5),
                              ]
                                .filter((v, i, a) => a.indexOf(v) === i && v <= (selectedHomework?.maxScore || 20))
                                .map((scoreVal) => (
                                  <button
                                    key={scoreVal}
                                    type="button"
                                    onClick={() => setGradeInput(scoreVal)}
                                    className={`px-3 py-1.5 text-xs font-mono font-bold rounded-xl border transition-all cursor-pointer ${
                                      gradeInput === scoreVal
                                        ? 'bg-primary text-white border-primary shadow-xs'
                                        : 'bg-white dark:bg-[#151C28] border-gray-200 dark:border-[#242F42] text-foreground hover:border-primary/50'
                                    }`}
                                  >
                                    {toPersianDigits(scoreVal)}
                                  </button>
                                ))}
                            </div>
                          </div>
                        </div>

                        {/* Row 2: Feedback Textarea & Quick Comment Chips */}
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-ink-normal/80 dark:text-gray-300 flex items-center gap-1.5">
                            <MessageSquare className="w-4 h-4 text-primary shrink-0" />
                            <span>بازخورد و توضیحات مربی</span>
                          </label>
                          <textarea
                            rows={3}
                            placeholder="بازخورد، راهنمایی یا نقاط قوت و ضعف دانش‌آموز را اینجا بنویسید..."
                            value={feedbackInput}
                            onChange={(e) => setFeedbackInput(e.target.value)}
                            className="w-full rounded-xl border border-gray-200 dark:border-[#242F42] bg-white dark:bg-[#151C28] p-3 text-xs sm:text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none shadow-xs leading-relaxed"
                          />

                          {/* Quick Feedback Phrases */}
                          <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                            <span className="text-[11px] text-muted-foreground font-medium select-none ml-1">
                              عبارات آماده:
                            </span>
                            {[
                              'بسیار عالی و دقیق، آفرین 👏',
                              'پاسخ کامل است. خسته نباشید.',
                              'خوب بود، نیاز به دقت بیشتر در حل تمرین‌ها.',
                              'تمرین ناقص ارسال شده است.',
                            ].map((phrase) => (
                              <button
                                key={phrase}
                                type="button"
                                onClick={() => {
                                  setFeedbackInput((prev) => (prev ? `${prev} - ${phrase}` : phrase));
                                }}
                                className="px-2.5 py-1 text-[11px] font-medium rounded-lg bg-white dark:bg-[#151C28] border border-gray-200/80 dark:border-[#242F42] hover:border-primary/40 hover:text-primary transition-colors cursor-pointer text-ink-normal/80 dark:text-gray-300"
                              >
                                + {phrase}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Row 3: Resubmit Option & Actions */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-gray-200/70 dark:border-[#242F42]">
                          <label className="flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-foreground cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={resubmitRequiredInput}
                              onChange={(e) => setResubmitRequiredInput(e.target.checked)}
                              className="w-4 h-4 rounded text-primary focus:ring-primary/30 border-gray-300 dark:border-gray-600"
                            />
                            <span className={resubmitRequiredInput ? 'text-amber-600 dark:text-amber-400 font-bold' : ''}>
                              نیاز به اصلاح و ارسال مجدد توسط دانش‌آموز
                            </span>
                          </label>

                          <div className="flex items-center gap-2 justify-end">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setGradingSubId(null)}
                              className="text-xs h-9 px-4 rounded-xl cursor-pointer"
                            >
                              انصراف
                            </Button>
                            <Button
                              variant="primary"
                              size="sm"
                              isLoading={isSavingGrade}
                              onClick={() => handleSaveGrade(sub.id)}
                              className="text-xs font-bold h-9 px-4 rounded-xl shadow-xs cursor-pointer gap-1.5"
                            >
                              <Check className="w-4 h-4" />
                              <span>ثبت و ذخیره نمره</span>
                            </Button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* Bottom Row: Score / Pending Badge on Right, Action Button on Left */
                      <div className="flex items-center justify-between flex-wrap gap-2 pt-2 border-t border-gray-100 dark:border-[#242F42]/60">
                        {/* Right side: Score or Pending Badge */}
                        <div>
                          {hasSubmission ? (
                            isGraded ? (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 font-mono">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>
                                  نمره: {toPersianDigits(sub.score)} از{' '}
                                  {toPersianDigits(selectedHomework?.maxScore || 20)}
                                </span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                                <Clock className="w-3.5 h-3.5" />
                                <span>در انتظار نمره‌دهی</span>
                              </span>
                            )
                          ) : (
                            <span className="text-xs text-muted-foreground/80 font-medium">
                              پاسخی برای نمره‌دهی وجود ندارد
                            </span>
                          )}
                        </div>

                        {/* Left side: Grade Action Button */}
                        <div>
                          {hasSubmission && (
                            <Button
                              variant={isGraded ? 'outline' : 'primary'}
                              size="sm"
                              onClick={() => {
                                setGradingSubId(sub.id);
                                setGradeInput(sub.score ?? (selectedHomework?.maxScore || 20));
                                setFeedbackInput(sub.feedback || '');
                                setResubmitRequiredInput(sub.status === 'RESUBMIT_REQUIRED');
                              }}
                              className="text-xs font-bold gap-1.5 h-9 px-4 rounded-xl cursor-pointer shadow-2xs"
                            >
                              <Award className="h-3.5 w-3.5" />
                              <span>{isGraded ? 'ویرایش نمره و بازخورد' : 'ثبت نمره و بازخورد'}</span>
                            </Button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Modal Footer: Bulk Download Attachments (Right) & Close (Left) */}
          <div className="flex items-center justify-between gap-3 pt-3 border-t border-gray-100 dark:border-[#242F42]">
            <Button
              variant="outline"
              onClick={handleBulkDownloadAttachments}
              disabled={isDownloadingZip || isLoadingSubs || totalAttachmentsInModal === 0}
              isLoading={isDownloadingZip}
              className="rounded-xl text-xs font-bold gap-2 text-primary hover:bg-primary/10 border-primary/30 dark:border-primary/30 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              title={
                totalAttachmentsInModal === 0
                  ? 'هیچ فایل پیوستی توسط دانش‌آموزان ارسال نشده است'
                  : 'دانلود تمامی فایل‌های ارسالی دانش‌آموزان به صورت فایل فشرده ZIP'
              }
            >
              <Download className="w-4 h-4 text-primary" />
              <span>
                {isDownloadingZip
                  ? zipProgress || 'در حال آماده‌سازی فایل ZIP...'
                  : totalAttachmentsInModal > 0
                  ? `دانلود فایل‌های پیوست (${toPersianDigits(totalAttachmentsInModal)})`
                  : 'دانلود فایل‌های پیوست'}
              </span>
            </Button>

            <Button
              variant="outline"
              onClick={() => setIsSubmissionsOpen(false)}
              className="rounded-xl text-xs cursor-pointer"
            >
              بستن
            </Button>
          </div>
        </div>
      </Modal>

      {/* 7. MODAL: Delete Homework Confirmation */}
      <Modal
        isOpen={!!deleteConfirmHw}
        onClose={() => setDeleteConfirmHw(null)}
        title="حذف تکلیف درسی"
        maxWidth="sm"
      >
        <div className="space-y-4">
          <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2.5">
            <AlertTriangle className="w-5 h-5 shrink-0 text-rose-600 mt-0.5" />
            <div>
              <p className="font-bold">آیا از حذف این تکلیف اطمینان دارید؟</p>
              <p className="mt-1 leading-relaxed">
                با حذف تکلیف «{deleteConfirmHw?.title}»، تمامی پاسخ‌های ارسالی دانش‌آموزان و نمرات ثبت‌شده نیز حذف خواهند شد.
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDeleteConfirmHw(null)}
              className="text-xs rounded-xl cursor-pointer"
            >
              انصراف
            </Button>
            <Button
              variant="destructive"
              size="sm"
              isLoading={isDeleting}
              onClick={handleDeleteHomework}
              className="text-xs font-bold rounded-xl cursor-pointer"
            >
              حذف قطعی تکلیف
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
