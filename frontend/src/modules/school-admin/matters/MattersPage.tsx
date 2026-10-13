import React, { useEffect, useState, useMemo } from 'react';
import { apiClient } from '../../../lib/api/client';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { Badge } from '../../../components/ui/Badge';
import { Modal } from '../../../components/ui/Modal';
import { Skeleton } from '../../../components/ui/Skeleton';
import { toPersianDigits, formatJalaliDisplay } from '../../../utils/jalali';
import {
  ShieldAlert,
  Award,
  AlertTriangle,
  HeartHandshake,
  Scale,
  Plus,
  Trash2,
  Edit3,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Calendar,
  User,
  Bell,
  Sparkles,
  X,
  Check,
  FileText,
  NotebookPen,
  SlidersHorizontal,
  Building2,
  BookOpen,
  GraduationCap,
  Clock,
  Layers,
} from 'lucide-react';

interface DisciplinaryMatter {
  id: string;
  source?: 'DIRECT_MATTER' | 'CLASSROOM_SESSION';
  studentId: string;
  type: 'POSITIVE' | 'NEGATIVE' | 'WARNING' | 'SUSPENSION' | 'COUNSELING_REFERRAL';
  title: string;
  description: string;
  points: number;
  actionTaken?: string;
  notifiedParents: boolean;
  reportedAt: string;
  sessionDate?: string;
  oralGrade?: number | null;
  periodNumber?: number | null;
  sessionNote?: string | null;
  rewardDisciplineNote?: string | null;
  classroom?: {
    id: string;
    name: string;
    roomNumber?: string;
  } | null;
  lesson?: {
    id: string;
    name: string;
    code?: string;
  } | null;
  student: {
    id: string;
    studentNumber?: string;
    user: {
      firstName: string;
      lastName: string;
      nationalCode?: string;
    };
  };
  reportedBy: {
    firstName: string;
    lastName: string;
    role?: string;
  };
}

const QUICK_PRESETS: Record<string, string[]> = {
  POSITIVE: [
    'مشارکت فعال در کلاس',
    'پیشرفت درسی',
    'نظم و اخلاق نمونه',
    'فعالیت گروهی',
  ],
  WARNING: [
    'تاخیر در ورود به کلاس',
    'عدم انجام تکلیف',
    'بی‌نظمی در کلاس',
  ],
  NEGATIVE: [
    'اخلال در کلاس',
    'بی‌انضباطی مکرر',
    'غیبت غیرموجه',
  ],
  SUSPENSION: [
    'محرومیت موقت از کلاس',
    'تخلف انضباطی',
  ],
  COUNSELING_REFERRAL: [
    'نیاز به مشاوره تحصیلی',
    'مشاوره رفتاری و انگیزشی',
  ],
};

export const MattersPage: React.FC = () => {
  const [matters, setMatters] = useState<DisciplinaryMatter[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  // Create Modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [form, setForm] = useState({
    studentId: '',
    type: 'POSITIVE' as 'POSITIVE' | 'NEGATIVE' | 'WARNING' | 'SUSPENSION' | 'COUNSELING_REFERRAL',
    title: '',
    description: '',
    points: 2,
    actionTaken: '',
    notifiedParents: false,
  });

  // Edit Modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingMatter, setEditingMatter] = useState<DisciplinaryMatter | null>(null);
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const [editForm, setEditForm] = useState({
    type: 'POSITIVE' as 'POSITIVE' | 'NEGATIVE' | 'WARNING' | 'SUSPENSION' | 'COUNSELING_REFERRAL',
    title: '',
    description: '',
    points: 2,
    actionTaken: '',
    notifiedParents: false,
    oralGrade: '' as string | number,
  });

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [mattersRes, studentsRes] = await Promise.all([
        apiClient.get<DisciplinaryMatter[]>('/matters'),
        apiClient.get<any[]>('/members/students').catch(() => ({ data: [] })),
      ]);
      const mattersData = mattersRes.data || [];
      const studentsData = studentsRes.data || [];
      setMatters(mattersData);
      setStudents(studentsData);
      if (studentsData.length > 0 && !form.studentId) {
        setForm((prev) => ({ ...prev, studentId: studentsData[0].id }));
      }
    } catch (err: any) {
      console.error('Failed to load matters:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.studentId) {
      setCreateError('لطفاً دانش‌آموز مورد نظر را انتخاب نمایید');
      return;
    }
    if (!form.title.trim()) {
      setCreateError('عنوان مورد انضباطی یا تشویقی الزامی است');
      return;
    }

    setIsSubmitting(true);
    setCreateError(null);

    try {
      await apiClient.post('/matters', {
        studentId: form.studentId,
        type: form.type,
        title: form.title.trim(),
        description: form.description.trim(),
        points: Number(form.points),
        actionTaken: form.actionTaken.trim() || undefined,
        notifiedParents: form.notifiedParents,
      });

      setIsCreateModalOpen(false);
      setForm({
        studentId: students[0]?.id || '',
        type: 'POSITIVE',
        title: '',
        description: '',
        points: 2,
        actionTaken: '',
        notifiedParents: false,
      });
      await fetchData();
    } catch (err: any) {
      setCreateError(err.response?.data?.message || 'خطا در ثبت مورد انضباطی');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenEditMatter = (matter: DisciplinaryMatter) => {
    setEditingMatter(matter);
    setEditForm({
      type: matter.type || 'POSITIVE',
      title: matter.title || '',
      description: matter.description || '',
      points: matter.points !== undefined ? matter.points : 0,
      actionTaken: matter.actionTaken || '',
      notifiedParents: matter.notifiedParents !== undefined ? matter.notifiedParents : false,
      oralGrade: matter.oralGrade !== null && matter.oralGrade !== undefined ? matter.oralGrade : '',
    });
    setEditError(null);
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMatter) return;
    if (!editForm.title.trim()) {
      setEditError('عنوان مورد انضباطی یا تشویقی الزامی است');
      return;
    }

    setIsEditSubmitting(true);
    setEditError(null);

    try {
      const payload: any = {
        type: editForm.type,
        title: editForm.title.trim(),
        description: editForm.description.trim(),
        points: Number(editForm.points),
        actionTaken: editForm.actionTaken.trim() || undefined,
        notifiedParents: editForm.notifiedParents,
      };
      if (editForm.oralGrade !== '' && editForm.oralGrade !== null && editForm.oralGrade !== undefined) {
        payload.oralGrade = Number(editForm.oralGrade);
      }

      await apiClient.put(`/matters/${editingMatter.id}`, payload);

      setIsEditModalOpen(false);
      setEditingMatter(null);
      await fetchData();
    } catch (err: any) {
      setEditError(err.response?.data?.message || 'خطا در ویرایش مورد انضباطی');
    } finally {
      setIsEditSubmitting(false);
    }
  };

  const handleToggleNotifyParents = async (matter: DisciplinaryMatter) => {
    try {
      const nextVal = !matter.notifiedParents;
      await apiClient.put(`/matters/${matter.id}`, {
        notifiedParents: nextVal,
      });
      setMatters((prev) =>
        prev.map((m) => (m.id === matter.id ? { ...m, notifiedParents: nextVal } : m)),
      );
    } catch (err: any) {
      alert(err.response?.data?.message || 'خطا در تغییر وضعیت اطلاع‌رسانی');
    }
  };

  const handleDeleteMatter = async (id: string) => {
    if (!window.confirm('آیا از حذف این رکورد انضباطی اطمینان دارید؟')) return;
    try {
      await apiClient.delete(`/matters/${id}`);
      await fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'خطا در حذف رکورد');
    }
  };

  const typeMetaMap: Record<
    string,
    {
      label: string;
      badgeStyle: string;
      iconBg: string;
      iconColor: string;
      icon: any;
    }
  > = {
    POSITIVE: {
      label: 'تشویقی',
      badgeStyle: 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
      iconBg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      icon: Award,
    },
    NEGATIVE: {
      label: 'انضباطی',
      badgeStyle: 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-500/30',
      iconBg: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
      iconColor: 'text-rose-600 dark:text-rose-400',
      icon: ShieldAlert,
    },
    WARNING: {
      label: 'تذکر',
      badgeStyle: 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-500/30',
      iconBg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
      iconColor: 'text-amber-600 dark:text-amber-400',
      icon: AlertTriangle,
    },
    SUSPENSION: {
      label: 'محرومیت موقت',
      badgeStyle: 'bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-300 border-red-500/30',
      iconBg: 'bg-red-500/10 text-red-600 dark:text-red-400',
      iconColor: 'text-red-600 dark:text-red-400',
      icon: AlertCircle,
    },
    COUNSELING_REFERRAL: {
      label: 'ارجاع به مشاوره',
      badgeStyle: 'bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border-purple-500/30',
      iconBg: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
      iconColor: 'text-purple-600 dark:text-purple-400',
      icon: HeartHandshake,
    },
  };

  const positiveTotal = useMemo(() => matters.filter((m) => m.type === 'POSITIVE').length, [matters]);
  const negativeTotal = useMemo(
    () => matters.filter((m) => m.type === 'NEGATIVE' || m.type === 'WARNING' || m.type === 'SUSPENSION').length,
    [matters],
  );
  const counselingTotal = useMemo(
    () => matters.filter((m) => m.type === 'COUNSELING_REFERRAL').length,
    [matters],
  );

  const filteredMatters = useMemo(() => {
    return matters.filter((m) => {
      const matchesType = activeFilter === 'ALL' || m.type === activeFilter;
      const studentName = `${m.student?.user?.firstName || ''} ${m.student?.user?.lastName || ''}`;
      const matchesSearch =
        !searchQuery ||
        studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (m.description && m.description.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesType && matchesSearch;
    });
  }, [matters, activeFilter, searchQuery]);

  return (
    <div className="space-y-4 pb-12 max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 animate-in fade-in duration-300">
      {/* 1. Header Master Panel */}
      <div className="bg-white dark:bg-[#151C28] rounded-2xl border-[1.5px] border-primary-dark/30 dark:border-[#242F42] shadow-[2px_2px_0_#59BBAF] dark:shadow-[2px_2px_0_#0B0F17] px-4 py-3 sm:px-5 sm:py-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary dark:text-primary border border-primary/25 flex items-center justify-center font-black shadow-2xs shrink-0">
                <Scale className="w-5 h-5" />
              </div>
              <h1 className="text-lg sm:text-2xl font-black text-ink-darker dark:text-white truncate">
                انضباطی/تشویقی
              </h1>
            </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsCreateModalOpen(true)}
              className="w-full sm:w-auto h-10 px-4 text-xs font-black gap-1.5 rounded-xl shadow-[2px_2px_0_#1F413D] dark:shadow-[2px_2px_0_#0F172A]"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>ثبت مورد جدید</span>
            </Button>
          </div>
        </div>
      </div>

      {/* 2. Hero KPI Cards (4 Stats in a row) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Matters */}
        <div className="p-4 rounded-2xl bg-white dark:bg-[#151C28] border border-gray-200/80 dark:border-[#242F42] shadow-xs flex items-center gap-3.5 hover:-translate-y-0.5 hover:border-primary/40 transition-all">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <FileText className="w-5 h-5" />
          </div>
          <div className="space-y-0.5 min-w-0">
            <span className="text-xs font-bold text-muted-foreground block truncate">کل موارد ثبت‌شده</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg sm:text-xl font-black text-ink-darker dark:text-white">
                {toPersianDigits(matters.length)}
              </span>
              <span className="text-[11px] text-muted-foreground">پرونده</span>
            </div>
          </div>
        </div>

        {/* Commendations */}
        <div className="p-4 rounded-2xl bg-white dark:bg-[#151C28] border border-gray-200/80 dark:border-[#242F42] shadow-xs flex items-center gap-3.5 hover:-translate-y-0.5 hover:border-emerald-500/40 transition-all">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <Award className="w-5 h-5" />
          </div>
          <div className="space-y-0.5 min-w-0">
            <span className="text-xs font-bold text-muted-foreground block truncate">تشویق و تقدیر</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg sm:text-xl font-black text-emerald-600 dark:text-emerald-400">
                {toPersianDigits(positiveTotal)}
              </span>
              <span className="text-[11px] text-emerald-600/80 font-bold">امتیاز مثبت</span>
            </div>
          </div>
        </div>

        {/* Disciplinary / Warnings */}
        <div className="p-4 rounded-2xl bg-white dark:bg-[#151C28] border border-gray-200/80 dark:border-[#242F42] shadow-xs flex items-center gap-3.5 hover:-translate-y-0.5 hover:border-rose-500/40 transition-all">
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="space-y-0.5 min-w-0">
            <span className="text-xs font-bold text-muted-foreground block truncate">تذکرات و انضباطی</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg sm:text-xl font-black text-rose-600 dark:text-rose-400">
                {toPersianDigits(negativeTotal)}
              </span>
              <span className="text-[11px] text-rose-600/80 font-bold">کسر نمره</span>
            </div>
          </div>
        </div>

        {/* Counseling Referral */}
        <div className="p-4 rounded-2xl bg-white dark:bg-[#151C28] border border-gray-200/80 dark:border-[#242F42] shadow-xs flex items-center gap-3.5 hover:-translate-y-0.5 hover:border-purple-500/40 transition-all">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
            <HeartHandshake className="w-5 h-5" />
          </div>
          <div className="space-y-0.5 min-w-0">
            <span className="text-xs font-bold text-muted-foreground block truncate">ارجاع به مشاوره</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg sm:text-xl font-black text-purple-600 dark:text-purple-400">
                {toPersianDigits(counselingTotal)}
              </span>
              <span className="text-[11px] text-purple-600/80 font-bold">هدایت فردی</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Search and Category Filter Toolbar */}
      <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-[#151C28] border border-gray-200/80 dark:border-[#242F42] shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Desktop Filter Chips */}
          <div className="hidden md:flex flex-wrap items-center gap-1.5 sm:gap-2">
            <button
              onClick={() => setActiveFilter('ALL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer select-none ${
                activeFilter === 'ALL'
                  ? 'bg-primary text-white shadow-[2px_2px_0_#1F413D] dark:shadow-[2px_2px_0_#0F172A]'
                  : 'bg-gray-100/80 dark:bg-[#1C2536] text-muted-foreground hover:text-ink-darker dark:hover:text-white border border-transparent hover:border-gray-200 dark:hover:border-gray-700'
              }`}
            >
              همه موارد ({toPersianDigits(matters.length)})
            </button>
            <button
              onClick={() => setActiveFilter('POSITIVE')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer select-none ${
                activeFilter === 'POSITIVE'
                  ? 'bg-emerald-600 text-white shadow-[2px_2px_0_#065F46]'
                  : 'bg-gray-100/80 dark:bg-[#1C2536] text-muted-foreground hover:text-ink-darker dark:hover:text-white border border-transparent hover:border-gray-200 dark:hover:border-gray-700'
              }`}
            >
              تشویقی‌ها ({toPersianDigits(positiveTotal)})
            </button>
            <button
              onClick={() => setActiveFilter('NEGATIVE')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer select-none ${
                activeFilter === 'NEGATIVE'
                  ? 'bg-rose-600 text-white shadow-[2px_2px_0_#881337]'
                  : 'bg-gray-100/80 dark:bg-[#1C2536] text-muted-foreground hover:text-ink-darker dark:hover:text-white border border-transparent hover:border-gray-200 dark:hover:border-gray-700'
              }`}
            >
              انضباطی ({toPersianDigits(negativeTotal)})
            </button>
            <button
              onClick={() => setActiveFilter('WARNING')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer select-none ${
                activeFilter === 'WARNING'
                  ? 'bg-amber-500 text-white shadow-[2px_2px_0_#78350F]'
                  : 'bg-gray-100/80 dark:bg-[#1C2536] text-muted-foreground hover:text-ink-darker dark:hover:text-white border border-transparent hover:border-gray-200 dark:hover:border-gray-700'
              }`}
            >
              تذکرات
            </button>
            <button
              onClick={() => setActiveFilter('COUNSELING_REFERRAL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer select-none ${
                activeFilter === 'COUNSELING_REFERRAL'
                  ? 'bg-purple-600 text-white shadow-[2px_2px_0_#4C1D95]'
                  : 'bg-gray-100/80 dark:bg-[#1C2536] text-muted-foreground hover:text-ink-darker dark:hover:text-white border border-transparent hover:border-gray-200 dark:hover:border-gray-700'
              }`}
            >
              مشاوره ({toPersianDigits(counselingTotal)})
            </button>
          </div>

          {/* Search bar + Mobile Filter Trigger (Icon on the Right in RTL) */}
          <div className="flex items-center gap-2 w-full md:w-auto md:ms-auto">
            {/* Mobile Filter Toggle Button (Icon only on the Right) */}
            <Button
              type="button"
              variant={activeFilter !== 'ALL' || showMobileFilters ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setShowMobileFilters(!showMobileFilters)}
              className="md:hidden h-10 w-10 p-0 rounded-xl shrink-0 flex items-center justify-center shadow-2xs relative"
              title="فیلترها"
            >
              <Filter className="w-4 h-4" />
              {activeFilter !== 'ALL' && (
                <span className="w-2 h-2 rounded-full bg-emerald-400 absolute top-2 left-2 ring-2 ring-white dark:ring-gray-900" />
              )}
            </Button>

            <div className="relative flex-1 md:w-72">
              <Search className="w-4 h-4 text-muted-foreground absolute right-3 top-3 pointer-events-none" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="جستجوی دانش‌آموز یا موضوع..."
                className="pr-9 pl-8 h-10 text-xs rounded-xl w-full"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute left-2.5 top-2.5 text-muted-foreground hover:text-ink-darker dark:hover:text-white p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Filter Options Dropdown */}
        {showMobileFilters && (
          <div className="md:hidden pt-2.5 border-t border-gray-100 dark:border-gray-800 flex flex-wrap items-center gap-1.5 animate-in slide-in-from-top-2 duration-200">
            <button
              onClick={() => {
                setActiveFilter('ALL');
                setShowMobileFilters(false);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer select-none ${
                activeFilter === 'ALL'
                  ? 'bg-primary text-white shadow-xs'
                  : 'bg-gray-100 dark:bg-[#1C2536] text-muted-foreground'
              }`}
            >
              همه موارد ({toPersianDigits(matters.length)})
            </button>
            <button
              onClick={() => {
                setActiveFilter('POSITIVE');
                setShowMobileFilters(false);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer select-none ${
                activeFilter === 'POSITIVE'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-gray-100 dark:bg-[#1C2536] text-muted-foreground'
              }`}
            >
              تشویقی‌ها ({toPersianDigits(positiveTotal)})
            </button>
            <button
              onClick={() => {
                setActiveFilter('NEGATIVE');
                setShowMobileFilters(false);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer select-none ${
                activeFilter === 'NEGATIVE'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-gray-100 dark:bg-[#1C2536] text-muted-foreground'
              }`}
            >
              انضباطی ({toPersianDigits(negativeTotal)})
            </button>
            <button
              onClick={() => {
                setActiveFilter('WARNING');
                setShowMobileFilters(false);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer select-none ${
                activeFilter === 'WARNING'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'bg-gray-100 dark:bg-[#1C2536] text-muted-foreground'
              }`}
            >
              تذکرات
            </button>
            <button
              onClick={() => {
                setActiveFilter('COUNSELING_REFERRAL');
                setShowMobileFilters(false);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer select-none ${
                activeFilter === 'COUNSELING_REFERRAL'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'bg-gray-100 dark:bg-[#1C2536] text-muted-foreground'
              }`}
            >
              مشاوره ({toPersianDigits(counselingTotal)})
            </button>
          </div>
        )}
      </div>

      {/* 4. Matters List Cards */}
      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
        </div>
      ) : filteredMatters.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-[#151C28] rounded-2xl border-2 border-dashed border-gray-200/80 dark:border-[#242F42] shadow-xs space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto shadow-2xs">
            <ShieldAlert className="w-7 h-7 opacity-80" />
          </div>
          <h3 className="text-base font-black text-ink-darker dark:text-white">موردی برای نمایش یافت نشد</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
            با فیلتر یا عبارت جستجوی فعلی هیچ رکورد انضباطی یا تشویقی در سامانه ثبت نگردیده است.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
          {filteredMatters.map((matter) => {
            const meta = typeMetaMap[matter.type] || typeMetaMap.POSITIVE;
            const Icon = meta.icon;

            const isClassroomAction = matter.actionTaken?.startsWith('کلاس ') || matter.source === 'CLASSROOM_SESSION';
            const displayActionTaken = !isClassroomAction && matter.actionTaken ? matter.actionTaken : null;

            return (
              <div
                key={matter.id}
                className="p-5 sm:p-6 rounded-2xl border border-gray-200/80 dark:border-[#28354A] bg-white dark:bg-[#1C2536] space-y-4 sm:space-y-5 transition-all hover:border-primary/40 hover:-translate-y-0.5 shadow-2xs flex flex-col justify-between"
              >
                <div className="space-y-4 sm:space-y-4.5">
                  {/* Top Row: Student info, Type Badge, Notify Parents Pill */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 pb-3.5 sm:pb-4 border-b border-gray-100 dark:border-gray-800">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-primary to-primary-hover text-white flex items-center justify-center font-black text-sm shrink-0 shadow-2xs border border-white/20">
                        {matter.student?.user?.firstName?.[0] || 'د'}
                      </div>
                      <div className="min-w-0 space-y-0.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-black text-base sm:text-lg text-ink-darker dark:text-white">
                            {matter.student?.user?.firstName} {matter.student?.user?.lastName}
                          </span>
                          {matter.student?.studentNumber && (
                            <span className="text-[11px] font-mono font-bold text-muted-foreground bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-md border border-gray-200/60 dark:border-gray-700/60">
                              کد: {toPersianDigits(matter.student.studentNumber)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
                      {/* Type Badge */}
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${meta.badgeStyle}`}>
                        <Icon className="w-3.5 h-3.5" />
                        <span>{meta.label}</span>
                      </span>

                      {/* Oral Grade Badge */}
                      {matter.oralGrade !== null && matter.oralGrade !== undefined && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 shadow-2xs">
                          <GraduationCap className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                          <span>نمره پرسش: {toPersianDigits(matter.oralGrade)} از ۲۰</span>
                        </span>
                      )}

                      {/* Classroom Session Tag */}
                      {matter.source === 'CLASSROOM_SESSION' && (
                        <span className="inline-flex items-center gap-1 text-xs text-amber-700 dark:text-amber-300 font-bold bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 px-2.5 py-1 rounded-md">
                          دفتر کلاسی
                        </span>
                      )}

                      {/* Notified Parents (clickable toggle for manager) */}
                      <button
                        type="button"
                        onClick={() => handleToggleNotifyParents(matter)}
                        title={matter.notifiedParents ? 'گزارش برای اولیا ارسال شده (کلیک برای لغو)' : 'گزارش به اولیا ارسال نشده (کلیک برای ارسال به اولیا)'}
                        className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full transition-all cursor-pointer ${
                          matter.notifiedParents
                            ? 'bg-primary/10 dark:bg-primary/20 text-primary dark:text-primary-light border border-primary/30 hover:bg-primary/20 shadow-2xs'
                            : 'bg-gray-100 dark:bg-gray-800/80 text-muted-foreground border border-gray-200/80 dark:border-gray-700 hover:bg-primary/10 hover:text-primary hover:border-primary/30'
                        }`}
                      >
                        <Bell className={`w-3.5 h-3.5 ${matter.notifiedParents ? 'text-primary' : 'text-muted-foreground'}`} />
                        <span>{matter.notifiedParents ? 'ارسال به اولیا' : 'عدم ارسال به اولیا'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Title and Description */}
                  <div className="space-y-2">
                    <h4 className="font-black text-base text-ink-darker dark:text-white leading-snug">
                      {matter.title}
                    </h4>
                    {matter.source !== 'CLASSROOM_SESSION' && matter.description && (
                      <p className="text-xs sm:text-[13px] text-ink-normal/80 dark:text-gray-300 leading-relaxed">
                        {matter.description}
                      </p>
                    )}
                  </div>

                  {/* Action Taken & Teacher Note Callout */}
                  {(displayActionTaken || matter.sessionNote) && (
                    <div className="p-3.5 sm:p-4 rounded-xl bg-primary-light/40 dark:bg-[#151C28] border-r-4 border-r-primary text-xs flex items-start gap-3">
                      <NotebookPen className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                      <div className="leading-relaxed space-y-1.5 w-full">
                        {displayActionTaken && (
                          <div>
                            <strong className="font-black text-ink-darker dark:text-white">اقدام صورت‌گرفته: </strong>
                            <span className="text-ink-normal dark:text-gray-300">{displayActionTaken}</span>
                          </div>
                        )}
                        {matter.sessionNote && (
                          <div>
                            <strong className="font-black text-ink-darker dark:text-white">یادداشت مربی: </strong>
                            <span className="text-ink-normal dark:text-gray-300">{matter.sessionNote}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer: Row 1 = Metadata in one line, Row 2 = Edit & Delete buttons */}
                <div className="pt-3.5 mt-2.5 sm:mt-3 border-t border-gray-100 dark:border-gray-800 space-y-2">
                  {/* Row 1: Single-line Metadata */}
                  <div className="flex items-center gap-2 sm:gap-2.5 flex-nowrap overflow-x-auto no-scrollbar w-full text-[11px] sm:text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1 font-medium shrink-0 whitespace-nowrap">
                      <User className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span>ثبت توسط: <strong className="font-bold text-ink-darker dark:text-white">{matter.reportedBy?.firstName} {matter.reportedBy?.lastName}</strong></span>
                    </span>
                    <span className="text-gray-300 dark:text-gray-600 shrink-0">•</span>
                    <span className="inline-flex items-center gap-1 font-medium shrink-0 whitespace-nowrap">
                      <Clock className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span>{formatJalaliDisplay(matter.reportedAt, true)}</span>
                    </span>
                    {matter.classroom?.name && (
                      <>
                        <span className="text-gray-300 dark:text-gray-600 shrink-0">•</span>
                        <span className="inline-flex items-center gap-1 font-bold text-ink-darker dark:text-gray-200 shrink-0 whitespace-nowrap">
                          <Building2 className="w-3.5 h-3.5 text-primary shrink-0" />
                          <span>کلاس {matter.classroom.name}</span>
                        </span>
                      </>
                    )}
                  </div>

                  {/* Row 2: Action Buttons (left-aligned in RTL) */}
                  <div className="flex items-center justify-end gap-1.5 pt-0.5">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenEditMatter(matter)}
                      className="h-7.5 px-2.5 text-xs text-primary hover:text-primary-dark hover:bg-primary/10 dark:hover:bg-primary/20 rounded-lg gap-1 font-bold cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>ویرایش</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteMatter(matter.id)}
                      className="h-7.5 px-2.5 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>حذف</span>
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 5. Create Matter Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="ثبت مورد جدید"
        maxWidth="lg"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-3.5 pt-1">
          {createError && (
            <div className="p-2.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{createError}</span>
            </div>
          )}

          {/* Student Selector */}
          <div>
            <label className="block text-xs font-bold text-ink-darker dark:text-white mb-1">
              دانش‌آموز <span className="text-red-500">*</span>
            </label>
            <Select
              value={form.studentId}
              onChange={(e) => setForm({ ...form, studentId: e.target.value })}
              required
              className="h-10 rounded-xl text-xs sm:text-sm font-bold"
            >
              <option value="">انتخاب دانش‌آموز...</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.user?.firstName} {s.user?.lastName} (کد: {s.studentNumber || s.user?.nationalCode || '-'})
                </option>
              ))}
            </Select>
          </div>

          {/* Matter Type Selector */}
          <div>
            <label className="block text-xs font-bold text-ink-darker dark:text-white mb-1.5">
              نوع <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
              {(
                [
                  { type: 'POSITIVE', label: 'تشویق', icon: Award, defaultPoints: 2 },
                  { type: 'WARNING', label: 'تذکر', icon: AlertTriangle, defaultPoints: -1 },
                  { type: 'NEGATIVE', label: 'مورد منفی', icon: ShieldAlert, defaultPoints: -2 },
                  { type: 'SUSPENSION', label: 'محرومیت', icon: AlertCircle, defaultPoints: -3 },
                  { type: 'COUNSELING_REFERRAL', label: 'مشاوره', icon: HeartHandshake, defaultPoints: 0 },
                ] as const
              ).map((item) => {
                const isSelected = form.type === item.type;
                const Icon = item.icon;
                return (
                  <button
                    key={item.type}
                    type="button"
                    onClick={() =>
                      setForm({
                        ...form,
                        type: item.type,
                        points: item.defaultPoints,
                      })
                    }
                    className={`p-2 rounded-xl border text-center transition-all flex flex-col sm:flex-row items-center justify-center gap-1.5 cursor-pointer ${
                      isSelected
                        ? 'border-primary bg-primary text-white shadow-2xs font-bold'
                        : 'border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-[#1C2536]/50 hover:bg-gray-100 dark:hover:bg-[#1C2536] text-muted-foreground'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    <span className="text-xs">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Title Input */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-ink-darker dark:text-white mb-1">
                عنوان <span className="text-red-500">*</span>
              </label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="عنوان تشویق یا تذکر..."
                required
                className="h-10 rounded-xl text-xs font-bold"
              />
            </div>

            {/* Points Stepper */}
            <div>
              <label className="block text-xs font-bold text-ink-darker dark:text-white mb-1">
                امتیاز
              </label>
              <Input
                type="number"
                step="0.5"
                value={form.points}
                onChange={(e) => setForm({ ...form, points: Number(e.target.value) })}
                placeholder="+2 یا -1"
                className="h-10 rounded-xl font-mono text-center font-bold text-xs"
              />
            </div>
          </div>

          {/* Quick Presets */}
          <div className="flex flex-wrap gap-1">
            {(QUICK_PRESETS[form.type] || []).map((preset, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setForm({ ...form, title: preset })}
                className="px-2 py-0.5 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-primary/10 hover:text-primary text-[11px] font-medium text-muted-foreground transition-colors cursor-pointer"
              >
                {preset}
              </button>
            ))}
          </div>

          {/* Full Description */}
          <div>
            <label className="block text-xs font-bold text-ink-darker dark:text-white mb-1">
              توضیحات <span className="text-red-500">*</span>
            </label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="شرح رویداد..."
              rows={2}
              className="w-full px-3 py-2 text-xs bg-white dark:bg-[#151C28] border border-gray-200 dark:border-gray-800 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-hidden text-ink-darker dark:text-white placeholder:text-muted-foreground leading-relaxed"
              required
            />
          </div>

          {/* Action Taken */}
          <div>
            <label className="block text-xs font-bold text-ink-darker dark:text-white mb-1">
              اقدام صورت‌گرفته
            </label>
            <Input
              value={form.actionTaken}
              onChange={(e) => setForm({ ...form, actionTaken: e.target.value })}
              placeholder="مثال: تذکر شفاهی / لوح تقدیر"
              className="h-10 rounded-xl text-xs"
            />
          </div>

          {/* Notify Parents Switch */}
          <label className="flex items-center justify-between p-2.5 rounded-xl bg-gray-50/80 dark:bg-[#1C2536]/80 border border-gray-200/70 dark:border-gray-800 cursor-pointer">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-primary" />
              <span className="text-xs font-bold text-ink-darker dark:text-white">
                اطلاع‌رسانی به اولیا
              </span>
            </div>
            <input
              type="checkbox"
              id="notifiedParents"
              checked={form.notifiedParents}
              onChange={(e) => setForm((prev) => ({ ...prev, notifiedParents: e.target.checked }))}
              className="w-4 h-4 rounded text-primary focus:ring-primary cursor-pointer accent-primary"
            />
          </label>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsCreateModalOpen(false)}
              className="h-9 px-3 text-xs font-bold rounded-xl"
            >
              انصراف
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isSubmitting}
              className="h-9 px-4 text-xs font-black rounded-xl"
            >
              {isSubmitting ? 'در حال ثبت...' : 'ثبت مورد'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* 6. Edit Matter Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingMatter(null);
        }}
        title={`ویرایش مورد: ${editingMatter?.student?.user?.firstName || ''} ${editingMatter?.student?.user?.lastName || ''}`}
        maxWidth="lg"
      >
        <form onSubmit={handleEditSubmit} className="space-y-3.5 pt-1">
          {editError && (
            <div className="p-2.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{editError}</span>
            </div>
          )}

          {/* Student Info Notice (Readonly) */}
          {editingMatter && (
            <div className="p-2.5 rounded-xl bg-primary/10 dark:bg-primary/20 border border-primary/25 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-primary" />
                <span className="font-bold text-ink-darker dark:text-white">
                  دانش‌آموز: {editingMatter.student?.user?.firstName} {editingMatter.student?.user?.lastName}
                </span>
              </div>
              {editingMatter.source === 'CLASSROOM_SESSION' && (
                <span className="text-[11px] font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 px-2 py-0.5 rounded-md border border-amber-300 dark:border-amber-800">
                  دفتر کلاسی
                </span>
              )}
            </div>
          )}

          {/* Type Selector Tabs */}
          <div>
            <label className="block text-xs font-bold text-ink-darker dark:text-white mb-1">
              نوع مورد <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 p-1 bg-gray-100 dark:bg-[#151C28] rounded-xl border border-gray-200 dark:border-gray-800">
              {(
                [
                  { key: 'POSITIVE', label: 'تشویق (+)', color: 'text-emerald-700 dark:text-emerald-300' },
                  { key: 'WARNING', label: 'تذکر', color: 'text-amber-700 dark:text-amber-300' },
                  { key: 'NEGATIVE', label: 'انضباطی (-)', color: 'text-rose-700 dark:text-rose-300' },
                  { key: 'SUSPENSION', label: 'محرومیت', color: 'text-red-700 dark:text-red-300' },
                  { key: 'COUNSELING_REFERRAL', label: 'مشاوره', color: 'text-purple-700 dark:text-purple-300' },
                ] as const
              ).map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() =>
                    setEditForm({
                      ...editForm,
                      type: t.key,
                      points: t.key === 'POSITIVE' ? 2 : t.key === 'WARNING' ? -0.5 : -1,
                    })
                  }
                  className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all text-center cursor-pointer ${
                    editForm.type === t.key
                      ? 'bg-white dark:bg-[#1F293D] shadow-xs text-primary font-black border border-primary/30'
                      : 'text-muted-foreground hover:text-ink-darker dark:hover:text-white'
                  }`}
                >
                  <span className={t.color}>{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Title Input */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-ink-darker dark:text-white mb-1">
                عنوان <span className="text-red-500">*</span>
              </label>
              <Input
                value={editForm.title}
                onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                placeholder="عنوان تشویق یا تذکر..."
                required
                className="h-10 rounded-xl text-xs font-bold"
              />
            </div>

            {/* Points Stepper */}
            <div>
              <label className="block text-xs font-bold text-ink-darker dark:text-white mb-1">
                امتیاز
              </label>
              <Input
                type="number"
                step="0.5"
                value={editForm.points}
                onChange={(e) => setEditForm({ ...editForm, points: Number(e.target.value) })}
                placeholder="+2 یا -1"
                className="h-10 rounded-xl font-mono text-center font-bold text-xs"
              />
            </div>
          </div>

          {/* Oral Grade (if applicable) */}
          {(editingMatter?.source === 'CLASSROOM_SESSION' || editForm.oralGrade !== '') && (
            <div>
              <label className="block text-xs font-bold text-ink-darker dark:text-white mb-1">
                نمره پرسش کلاسی (۰ تا ۲۰)
              </label>
              <Input
                type="number"
                step="0.25"
                min="0"
                max="20"
                value={editForm.oralGrade}
                onChange={(e) => setEditForm({ ...editForm, oralGrade: e.target.value })}
                placeholder="مثال: ۱۸.۵"
                className="h-10 rounded-xl font-mono text-center font-bold text-xs"
              />
            </div>
          )}

          {/* Quick Presets */}
          <div className="flex flex-wrap gap-1">
            {(QUICK_PRESETS[editForm.type] || []).map((preset, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setEditForm({ ...editForm, title: preset })}
                className="px-2 py-0.5 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-primary/10 hover:text-primary text-[11px] font-medium text-muted-foreground transition-colors cursor-pointer"
              >
                {preset}
              </button>
            ))}
          </div>

          {/* Full Description */}
          <div>
            <label className="block text-xs font-bold text-ink-darker dark:text-white mb-1">
              توضیحات <span className="text-red-500">*</span>
            </label>
            <textarea
              value={editForm.description}
              onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
              placeholder="شرح رویداد..."
              rows={2}
              className="w-full px-3 py-2 text-xs bg-white dark:bg-[#151C28] border border-gray-200 dark:border-gray-800 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-hidden text-ink-darker dark:text-white placeholder:text-muted-foreground leading-relaxed"
              required
            />
          </div>

          {/* Action Taken */}
          <div>
            <label className="block text-xs font-bold text-ink-darker dark:text-white mb-1">
              اقدام صورت‌گرفته
            </label>
            <Input
              value={editForm.actionTaken}
              onChange={(e) => setEditForm({ ...editForm, actionTaken: e.target.value })}
              placeholder="مثال: تذکر شفاهی / لوح تقدیر"
              className="h-10 rounded-xl text-xs"
            />
          </div>

          {/* Notify Parents Switch */}
          <label className="flex items-center justify-between p-2.5 rounded-xl bg-gray-50/80 dark:bg-[#1C2536]/80 border border-gray-200/70 dark:border-gray-800 cursor-pointer">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-primary" />
              <span className="text-xs font-bold text-ink-darker dark:text-white">
                اطلاع‌رسانی به اولیا
              </span>
            </div>
            <input
              type="checkbox"
              id="editNotifiedParents"
              checked={editForm.notifiedParents}
              onChange={(e) => setEditForm((prev) => ({ ...prev, notifiedParents: e.target.checked }))}
              className="w-4 h-4 rounded text-primary focus:ring-primary cursor-pointer accent-primary"
            />
          </label>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsEditModalOpen(false);
                setEditingMatter(null);
              }}
              className="h-9 px-3 text-xs font-bold rounded-xl"
            >
              انصراف
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isEditSubmitting}
              className="h-9 px-4 text-xs font-black rounded-xl"
            >
              {isEditSubmitting ? 'در حال ذخیره...' : 'ذخیره تغییرات'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
