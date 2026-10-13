import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { apiClient } from '../../../lib/api/client';
import { toast } from 'sonner';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Skeleton } from '../../../components/ui/Skeleton';
import { Modal } from '../../../components/ui/Modal';
import { formatJalaliDisplay, toPersianDigits } from '../../../utils/jalali';
import {
  BookOpen,
  Download,
  FileText,
  Video,
  FileSpreadsheet,
  Search,
  X,
  Filter,
  ArrowUpDown,
  RotateCcw,
  Calendar,
  User,
  Eye,
  Check,
  ChevronDown,
  HardDrive,
  Copy,
  ExternalLink,
  Headphones,
  Archive,
  File,
  Sparkles,
  Info,
  Loader2,
  FolderOpen,
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

export const StudentMaterialsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const lessonIdParam = searchParams.get('lessonId');
  const lessonNameParam = searchParams.get('lessonName');

  const [materials, setMaterials] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters and Sorting
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLessonFilter, setSelectedLessonFilter] = useState<string>(lessonIdParam || 'ALL');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('ALL');
  const [sortOption, setSortOption] = useState<string>('NEWEST');

  // Preview / Details Modal
  const [selectedMaterial, setSelectedMaterial] = useState<any | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  // Sync lessonIdParam with selectedLessonFilter
  useEffect(() => {
    if (lessonIdParam) {
      setSelectedLessonFilter(lessonIdParam);
    }
  }, [lessonIdParam]);

  const fetchMaterials = async () => {
    try {
      setIsLoading(true);
      const res = await apiClient.get('/learning-materials');
      const data = Array.isArray(res) ? res : (res?.data || []);
      setMaterials(data);
    } catch (err) {
      console.error('Failed to load materials', err);
      toast.error('خطا در دریافت لیست محتوای آموزشی');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMaterials();
  }, []);

  // Helper to extract teacher's full name
  const getTeacherName = (mat: any): string => {
    if (mat?.teacher?.user) {
      const u = mat.teacher.user;
      return `${u.firstName || ''} ${u.lastName || ''}`.trim() || 'مربی محترم';
    }
    return mat?.teacherName || 'مربی محترم';
  };

  // Helper to determine type categorization and UI config
  const getMaterialTypeInfo = (mat: any) => {
    const rawType = (mat.materialType || '').toUpperCase();
    const mime = (mat.mimeType || '').toLowerCase();
    const url = (mat.fileUrl || '').toLowerCase();

    if (rawType === 'VIDEO' || mime.startsWith('video/') || url.match(/\.(mp4|webm|mkv|mov)(\?.*)?$/i)) {
      return {
        category: 'VIDEO' as const,
        label: 'ویدیو آموزشی',
        icon: Video,
        colorDot: 'bg-purple-500',
        badgeClass: 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-500/30',
        iconColor: 'text-purple-600 dark:text-purple-400',
      };
    }

    if (rawType === 'AUDIO' || mime.startsWith('audio/') || url.match(/\.(mp3|wav|ogg|m4a)(\?.*)?$/i)) {
      return {
        category: 'AUDIO' as const,
        label: 'فایل صوتی / پادکست',
        icon: Headphones,
        colorDot: 'bg-amber-500',
        badgeClass: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-500/30',
        iconColor: 'text-amber-600 dark:text-amber-400',
      };
    }

    if (rawType === 'LINK' || url.startsWith('http://') || url.startsWith('https://') && !url.includes('storage')) {
      return {
        category: 'OTHER' as const,
        label: 'پیوند / وب‌سایت',
        icon: ExternalLink,
        colorDot: 'bg-cyan-500',
        badgeClass: 'bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30',
        iconColor: 'text-cyan-600 dark:text-cyan-400',
      };
    }

    if (rawType === 'ARCHIVE' || url.match(/\.(zip|rar|7z|tar|gz)(\?.*)?$/i)) {
      return {
        category: 'OTHER' as const,
        label: 'فایل فشرده (آرشیو)',
        icon: Archive,
        colorDot: 'bg-rose-500',
        badgeClass: 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-500/30',
        iconColor: 'text-rose-600 dark:text-rose-400',
      };
    }

    if (mime.includes('spreadsheet') || mime.includes('excel') || url.match(/\.(xlsx|xls|csv)(\?.*)?$/i)) {
      return {
        category: 'DOCUMENT' as const,
        label: 'کاربرگ اکسل',
        icon: FileSpreadsheet,
        colorDot: 'bg-emerald-500',
        badgeClass: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30',
        iconColor: 'text-emerald-600 dark:text-emerald-400',
      };
    }

    return {
      category: 'DOCUMENT' as const,
      label: 'جزوه و سند (PDF / فایل)',
      icon: FileText,
      colorDot: 'bg-primary',
      badgeClass: 'bg-primary-light dark:bg-primary-darker/40 text-primary-darker dark:text-primary-light border border-primary/30',
      iconColor: 'text-primary',
    };
  };

  // Secure download trigger
  const handleDownload = async (mat: any, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      setDownloadingId(mat.id);
      let downloadUrl = mat.fileUrl;
      try {
        const res = await apiClient.get(`/learning-materials/${mat.id}/download-url`);
        if (res.data?.downloadUrl) {
          downloadUrl = res.data.downloadUrl;
        }
      } catch {
        // Fallback to existing fileUrl
      }

      if (downloadUrl) {
        window.open(downloadUrl, '_blank', 'noopener,noreferrer');
        toast.success(`درخواست دانلود فایل «${mat.title}» آغاز شد`);
      } else {
        toast.error('آدرس دانلود این فایل در دسترس نیست');
      }
    } catch {
      toast.error('خطا در دریافت لینک دانلود');
    } finally {
      setDownloadingId(null);
    }
  };

  // Copy material link to clipboard
  const handleCopyLink = async (mat: any) => {
    try {
      let downloadUrl = mat.fileUrl;
      try {
        const res = await apiClient.get(`/learning-materials/${mat.id}/download-url`);
        if (res.data?.downloadUrl) downloadUrl = res.data.downloadUrl;
      } catch {}

      if (downloadUrl) {
        await navigator.clipboard.writeText(downloadUrl);
        toast.success('لینک مستقیم فایل در حافظه کپی شد');
      } else {
        toast.error('لینکی جهت کپی موجود نیست');
      }
    } catch {
      toast.error('خطا در کپی کردن لینک');
    }
  };

  // Unique lessons list for filter dropdown
  const uniqueLessons = useMemo(() => {
    const map = new Map<string, string>();
    materials.forEach((m) => {
      const id = m.lessonId || m.lesson?.id;
      const name = m.lesson?.name;
      if (id && name && !map.has(id)) {
        map.set(id, name);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [materials]);

  // Filtering & Sorting
  const filteredMaterials = useMemo(() => {
    return materials
      .filter((m) => {
        // 1. Quick or dropdown lesson filter
        if (selectedLessonFilter !== 'ALL') {
          const lId = m.lessonId || m.lesson?.id;
          if (lId !== selectedLessonFilter) return false;
        }

        // 2. Type filter
        if (selectedTypeFilter !== 'ALL') {
          const typeInfo = getMaterialTypeInfo(m);
          if (typeInfo.category !== selectedTypeFilter) return false;
        }

        // 3. Text search
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const title = (m.title || '').toLowerCase();
          const desc = (m.description || '').toLowerCase();
          const lesson = (m.lesson?.name || '').toLowerCase();
          const teacher = getTeacherName(m).toLowerCase();
          if (!title.includes(q) && !desc.includes(q) && !lesson.includes(q) && !teacher.includes(q)) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        if (sortOption === 'NEWEST') {
          return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
        }
        if (sortOption === 'OLDEST') {
          return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
        }
        if (sortOption === 'TITLE_ASC') {
          return (a.title || '').localeCompare(b.title || '', 'fa');
        }
        if (sortOption === 'SIZE_DESC') {
          return (Number(b.fileSizeMb) || 0) - (Number(a.fileSizeMb) || 0);
        }
        return 0;
      });
  }, [materials, selectedLessonFilter, selectedTypeFilter, searchQuery, sortOption]);

  const hasActiveFilters =
    selectedLessonFilter !== 'ALL' ||
    selectedTypeFilter !== 'ALL' ||
    sortOption !== 'NEWEST' ||
    searchQuery.trim().length > 0;

  const resetFilters = () => {
    setSelectedLessonFilter('ALL');
    setSelectedTypeFilter('ALL');
    setSortOption('NEWEST');
    setSearchQuery('');
    if (lessonIdParam) {
      searchParams.delete('lessonId');
      searchParams.delete('lessonName');
      setSearchParams(searchParams);
    }
  };

  const lessonOptions = useMemo(
    () => [
      { value: 'ALL', label: 'همه درس‌ها' },
      ...uniqueLessons.map((l) => ({ value: l.id, label: l.name })),
    ],
    [uniqueLessons]
  );

  const typeOptions = useMemo(
    () => [
      { value: 'ALL', label: 'همه قالب‌ها' },
      { value: 'DOCUMENT', label: 'جزوات و اسناد متنی', colorDot: 'bg-primary' },
      { value: 'VIDEO', label: 'ویدیوهای آموزشی', colorDot: 'bg-purple-500' },
      { value: 'AUDIO', label: 'صوت و پادکست', colorDot: 'bg-amber-500' },
      { value: 'OTHER', label: 'سایر و پیوندها', colorDot: 'bg-cyan-500' },
    ],
    []
  );

  const sortOptions = useMemo(
    () => [
      { value: 'NEWEST', label: 'جدیدترین تاریخ انتشار' },
      { value: 'OLDEST', label: 'قدیمی‌ترین تاریخ انتشار' },
      { value: 'TITLE_ASC', label: 'عنوان فایل (الفبا)' },
      { value: 'SIZE_DESC', label: 'بیشترین حجم فایل' },
    ],
    []
  );

  return (
    <div className="space-y-4 pb-12 max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 animate-in fade-in duration-300">
      {/* 1. Header Master Panel (Aligned with Homework & Schedule Pages) */}
      <div className="bg-white dark:bg-[#151C28] rounded-2xl border-[1.5px] border-primary-dark/30 dark:border-[#242F42] shadow-[2px_2px_0_#59BBAF] dark:shadow-[2px_2px_0_#0B0F17] p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            {/* Theme Icon matching schedule/homework */}
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary dark:text-primary border border-primary/25 flex items-center justify-center font-black shadow-2xs shrink-0">
              <BookOpen className="w-5 h-5" />
            </div>
            <h1 className="text-lg sm:text-2xl font-black text-ink-darker dark:text-white truncate">
              محتوای آموزشی
            </h1>
          </div>

          {/* Action Buttons: Filter Toggle */}
          <div className="flex items-center gap-2 shrink-0">
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
      </div>

      {/* 2. Filter & Sort Panel (Collapsible with smooth transition) */}
      <div
        className={`grid transition-all duration-300 ease-in-out ${
          isFilterOpen
            ? 'grid-rows-[1fr] opacity-100 translate-y-0'
            : 'grid-rows-[0fr] opacity-0 -translate-y-2 pointer-events-none'
        }`}
      >
        <div className={`min-h-0 ${isFilterOpen ? 'overflow-visible' : 'overflow-hidden'}`}>
          <div className="bg-white dark:bg-[#151C28] rounded-2xl border border-gray-200/80 dark:border-[#242F42] p-3.5 sm:p-4 shadow-xs space-y-3">
            {/* Search Input Row */}
            <div className="relative">
              <Search className="w-4 h-4 text-muted-foreground dark:text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="جستجو در عنوان محتوا، توضیحات، نام درس یا نام مربی..."
                className="w-full h-10 pr-10 pl-9 rounded-xl text-xs sm:text-sm font-bold bg-gray-50 dark:bg-[#1C2536] border border-gray-200 dark:border-[#242F42] text-foreground dark:text-white placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Dropdown Filters Row */}
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

                {/* Filter by Type */}
                <CustomFilterDropdown
                  label="نوع فایل و محتوا:"
                  labelIcon={File}
                  iconColorClass="text-purple-600 dark:text-purple-400"
                  options={typeOptions}
                  value={selectedTypeFilter}
                  onChange={setSelectedTypeFilter}
                />

                {/* Sort Order */}
                <CustomFilterDropdown
                  label="مرتب‌سازی:"
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

      {/* 3. Lesson Filter Active Banner (If query param present) */}
      {lessonIdParam && (
        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-primary/10 border border-primary/25 text-xs text-foreground animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-primary/20 flex items-center justify-center text-primary shrink-0">
              <Filter className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold text-primary text-xs sm:text-[13px]">
                فیلتر شده بر اساس درس: {lessonNameParam || 'درس انتخاب‌شده'}
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                تعداد {toPersianDigits(filteredMaterials.length)} فایل آموزشی برای این درس موجود است.
              </div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              searchParams.delete('lessonId');
              searchParams.delete('lessonName');
              setSearchParams(searchParams);
              setSelectedLessonFilter('ALL');
            }}
            className="text-xs h-8 gap-1.5 hover:bg-primary/20 text-primary-dark font-bold rounded-xl"
          >
            <X className="w-3.5 h-3.5" />
            <span>نمایش همه فایل‌ها</span>
          </Button>
        </div>
      )}

      {/* 4. Materials Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="p-4 border border-gray-200/80 dark:border-[#242F42] shadow-xs rounded-2xl">
              <div className="flex justify-between mb-3">
                <Skeleton className="h-6 w-24 rounded-full" />
                <Skeleton className="h-6 w-20 rounded-full" />
              </div>
              <Skeleton className="h-5 w-3/4 mb-3" />
              <Skeleton className="h-4 w-1/2 mb-4" />
              <div className="pt-3 border-t border-gray-100 dark:border-[#242F42] flex justify-between gap-2">
                <Skeleton className="h-9 w-1/2 rounded-xl" />
                <Skeleton className="h-9 w-1/2 rounded-xl" />
              </div>
            </Card>
          ))
        ) : filteredMaterials.length === 0 ? (
          <div className="col-span-full text-center py-16 bg-white dark:bg-[#151C28] rounded-2xl border border-dashed border-gray-200 dark:border-[#242F42] space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-2">
              <FolderOpen className="w-7 h-7" />
            </div>
            <h3 className="text-base sm:text-lg font-bold text-ink-darker dark:text-white">
              هیچ محتوای آموزشی با شرایط انتخابی یافت نشد
            </h3>
            <p className="text-xs text-muted-foreground dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
              {hasActiveFilters
                ? 'می‌توانید فیلترهای بالا را تغییر دهید یا دکمه بازنشانی را انتخاب فرمایید.'
                : 'هنوز فایل یا جزوه آموزشی در این بخش بارگذاری نشده است.'}
            </p>
            {hasActiveFilters && (
              <Button
                variant="outline"
                size="sm"
                onClick={resetFilters}
                className="text-xs h-9 gap-1.5 rounded-xl font-bold"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>بازنشانی فیلترها</span>
              </Button>
            )}
          </div>
        ) : (
          filteredMaterials.map((mat) => {
            const typeInfo = getMaterialTypeInfo(mat);
            const TypeIcon = typeInfo.icon;
            const fileSize = Number(mat.fileSizeMb) || 0;
            const isDownloading = downloadingId === mat.id;

            return (
              <Card
                key={mat.id}
                className="p-4 border border-gray-200/80 dark:border-[#242F42] bg-white dark:bg-[#151C28] rounded-2xl shadow-xs flex flex-col justify-between transition-all duration-200 hover:border-primary/50 hover:shadow-md group"
              >
                <div className="space-y-3">
                  {/* Card Header: Lesson Badge (Right) & Format Badge (Left) */}
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant="default" className="font-bold text-xs py-0.5">
                      {mat.lesson?.name || 'عمومی'}
                    </Badge>

                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold transition-colors select-none ${typeInfo.badgeClass}`}
                    >
                      <TypeIcon className="w-3.5 h-3.5 shrink-0" />
                      <span>{typeInfo.label}</span>
                    </span>
                  </div>

                  {/* Title */}
                  <div>
                    <h3
                      onClick={() => {
                        setSelectedMaterial(mat);
                        setIsModalOpen(true);
                      }}
                      className="text-sm sm:text-base font-bold text-ink-darker dark:text-white line-clamp-2 cursor-pointer group-hover:text-primary transition-colors"
                      title={mat.title}
                    >
                      {mat.title}
                    </h3>
                  </div>

                  {/* Metadata Row: Date, Teacher, and File Size */}
                  <div className="flex flex-wrap items-center gap-y-2 gap-x-3 text-[11px] text-muted-foreground dark:text-slate-400 pt-0.5">
                    {/* Date */}
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span>
                        {formatJalaliDisplay(mat.createdAt || Date.now(), false)}
                      </span>
                    </div>

                    {/* Teacher Name */}
                    <div className="flex items-center gap-1.5 min-w-0">
                      <User className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span className="truncate">{getTeacherName(mat)}</span>
                    </div>

                    {/* File Size */}
                    {fileSize > 0 && (
                      <div className="flex items-center gap-1.5 mr-auto">
                        <HardDrive className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        <span className="font-mono text-[11px] font-bold">
                          {toPersianDigits(fileSize.toFixed(1))} MB
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Footer: Details & Download Buttons */}
                <div className="pt-3.5 mt-3.5 border-t border-gray-100 dark:border-[#242F42] flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedMaterial(mat);
                      setIsModalOpen(true);
                    }}
                    className="flex-1 text-xs flex items-center justify-center gap-1.5 h-9 rounded-xl font-bold bg-white dark:bg-[#1C2536] border-gray-200 dark:border-[#242F42] text-foreground dark:text-white hover:bg-gray-50 dark:hover:bg-[#242F42] shadow-2xs transition-colors shrink-0"
                  >
                    <Eye className="w-4 h-4 text-primary shrink-0" />
                    <span>مشاهده جزئیات</span>
                  </Button>

                  <Button
                    variant="primary"
                    size="sm"
                    disabled={isDownloading}
                    onClick={(e) => handleDownload(mat, e)}
                    className="flex-1 text-xs flex items-center justify-center gap-1.5 h-9 rounded-xl font-bold shadow-[1.5px_1.5px_0_#438C83] shrink-0"
                  >
                    {isDownloading ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>دریافت...</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-3.5 h-3.5" />
                        <span>دانلود فایل</span>
                      </>
                    )}
                  </Button>
                </div>
              </Card>
            );
          })
        )}
      </div>

      {/* 5. Material Details Modal */}
      {selectedMaterial && (() => {
        const typeInfo = getMaterialTypeInfo(selectedMaterial);
        const TypeIcon = typeInfo.icon;
        const fileSize = Number(selectedMaterial.fileSizeMb) || 0;
        const isDownloading = downloadingId === selectedMaterial.id;

        return (
          <Modal
            isOpen={isModalOpen}
            onClose={() => {
              setIsModalOpen(false);
              setSelectedMaterial(null);
            }}
            title="جزئیات محتوای آموزشی"
            maxWidth="2xl"
            hideHeaderBorder
          >
            <div className="space-y-4">
              {/* 1. Header Meta & Title Hero Card */}
              <div className="p-4 sm:p-4.5 bg-gray-50 dark:bg-[#1C2536] rounded-2xl border border-gray-200/80 dark:border-[#242F42] space-y-3">
                {/* Badges Row */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="default" className="font-bold text-xs py-0.5">
                      {selectedMaterial.lesson?.name || 'درس عمومی'}
                    </Badge>
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold ${typeInfo.badgeClass}`}
                    >
                      <TypeIcon className="w-3.5 h-3.5 shrink-0" />
                      <span>{typeInfo.label}</span>
                    </span>
                  </div>

                  {fileSize > 0 && (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white dark:bg-[#151C28] border border-gray-200/70 dark:border-[#242F42] font-mono text-xs font-bold text-ink-darker dark:text-white shadow-2xs">
                      <HardDrive className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <span>{toPersianDigits(fileSize.toFixed(1))} MB</span>
                    </div>
                  )}
                </div>

                {/* Material Title */}
                <h3 className="text-base sm:text-lg font-black text-ink-darker dark:text-white leading-snug">
                  {selectedMaterial.title}
                </h3>

                {/* Metadata Row: Teacher & Date */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-3 border-t border-gray-200/70 dark:border-[#242F42]/80 text-xs text-muted-foreground dark:text-slate-300">
                  <div className="flex items-center gap-2 min-w-0">
                    <User className="w-4 h-4 text-primary shrink-0" />
                    <span className="truncate">مربی: {getTeacherName(selectedMaterial)}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-primary shrink-0" />
                    <span>تاریخ بارگذاری: {formatJalaliDisplay(selectedMaterial.createdAt || Date.now(), true)}</span>
                  </div>
                </div>
              </div>

              {/* 2. Description Section */}
              <div className="p-3.5 sm:p-4 bg-white dark:bg-[#151C28] rounded-2xl border border-gray-200/80 dark:border-[#242F42] shadow-2xs space-y-2">
                <div className="text-xs font-bold text-muted-foreground dark:text-slate-400 flex items-center gap-1.5">
                  <Info className="w-4 h-4 text-primary shrink-0" />
                  <span>توضیحات و راهنمای مطالعه:</span>
                </div>
                <div className="text-xs sm:text-sm text-ink-darker dark:text-slate-100 font-medium leading-relaxed whitespace-pre-wrap">
                  {selectedMaterial.description || 'توضیحات بیشتری توسط مربی محترم برای این فایل ثبت نشده است.'}
                </div>
              </div>

              {/* 3. Modal Actions Footer */}
              <div className="pt-3 border-t border-gray-100 dark:border-[#242F42] flex flex-wrap items-center justify-between gap-2.5">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCopyLink(selectedMaterial)}
                  className="text-xs h-10 gap-1.5 rounded-xl font-bold bg-white dark:bg-[#1C2536] border-gray-200 dark:border-[#242F42] text-foreground dark:text-white hover:bg-gray-50 dark:hover:bg-[#242F42]"
                >
                  <Copy className="w-3.5 h-3.5 text-primary" />
                  <span>کپی لینک فایل</span>
                </Button>

                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setIsModalOpen(false);
                      setSelectedMaterial(null);
                    }}
                    className="text-xs h-10 px-4 rounded-xl"
                  >
                    بستن
                  </Button>

                  <Button
                    variant="primary"
                    size="sm"
                    disabled={isDownloading}
                    onClick={() => handleDownload(selectedMaterial)}
                    className="text-xs h-10 px-5 gap-1.5 rounded-xl font-bold shadow-[2px_2px_0_#438C83]"
                  >
                    {isDownloading ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>در حال دریافت...</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-3.5 h-3.5" />
                        <span>دانلود مستقیم فایل</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </Modal>
        );
      })()}
    </div>
  );
};
