import React, { useState, useEffect, useMemo } from 'react';
import { useAuthStore } from '../../../lib/auth/auth-store';
import { apiClient } from '../../../lib/api/client';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Modal } from '../../../components/ui/Modal';
import { Skeleton } from '../../../components/ui/Skeleton';
import { toPersianDigits, formatJalaliDisplay } from '../../../utils/jalali';
import {
  FileText,
  Download,
  TrendingUp,
  GraduationCap,
  Lock,
  Clock,
  BookOpen,
  CheckCircle2,
  Layers,
  Award,
  Sparkles,
  Printer,
  ChevronDown,
  AlertTriangle,
  Info,
  ExternalLink,
  Search,
  Filter,
  BarChart3,
  Calendar,
  Check,
  Star,
  ShieldCheck,
  ChevronLeft,
  XCircle,
  HelpCircle,
  FileSpreadsheet,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';

export const StudentGradesPage: React.FC = () => {
  const user = useAuthStore((s) => s.user);
  const isParent = user?.role === 'PARENT';

  // 1. Report Card Issuance / Publication Status
  // Only considered issued when officially published by school admin AND grade data is recorded
  const [isPublishedByAdmin, setIsPublishedByAdmin] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('rokad_report_card_published') === 'true';
  });

  // Listen to cross-tab storage changes (e.g. admin publishing report card in another tab)
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'rokad_report_card_published') {
        setIsPublishedByAdmin(e.newValue === 'true');
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  // 2. Active Tab & Term
  const [activeTab, setActiveTab] = useState<'ALL' | 'GENERAL' | 'MODULAR' | 'ANALYTICS'>('ALL');
  const [selectedTerm, setSelectedTerm] = useState<'TERM_1' | 'TERM_2' | 'FULL_YEAR'>('TERM_1');
  const [searchQuery, setSearchQuery] = useState('');
  const [isOfficialModalOpen, setIsOfficialModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [apiReportCard, setApiReportCard] = useState<any>(null);

  // 3. Load Live API Data
  useEffect(() => {
    const fetchReportCard = async () => {
      try {
        setIsLoading(true);
        const res: any = await apiClient.get('/gradebook/student/me/report-card');
        const raw = res?.data || res;
        if (raw && (raw.transcript || raw.lessons?.length > 0)) {
          setApiReportCard(raw);
        }
      } catch (err) {
        // Fallback to empty state
      } finally {
        setIsLoading(false);
      }
    };
    fetchReportCard();
  }, []);

  const hasIssuedLessons = Boolean(
    apiReportCard?.lessons && apiReportCard.lessons.length > 0
  );

  const isReportCardIssued = isPublishedByAdmin && hasIssuedLessons;

  // 4. Dynamic General & Modular Grades from live API (no seeded mock data)
  const generalGrades = useMemo(() => {
    if (!apiReportCard?.lessons) return [];
    return apiReportCard.lessons
      .filter((l: any) => !l.isModular)
      .map((l: any) => ({
        id: l.id || l.lessonId,
        lesson: l.lesson || l.lessonName,
        code: l.code || '—',
        units: l.units || l.unitCount || 1,
        continuous: l.continuous ?? 0,
        midterm: l.midterm ?? 0,
        final: l.final ?? 0,
        total: l.total ?? l.lessonAverage ?? 0,
        classAvg: l.classAvg ?? 0,
        isPassed: l.isPassed ?? ((l.total ?? l.lessonAverage ?? 0) >= 10),
      }));
  }, [apiReportCard]);

  const modularGrades = useMemo(() => {
    if (!apiReportCard?.lessons) return [];
    return apiReportCard.lessons
      .filter((l: any) => l.isModular)
      .map((l: any) => ({
        id: l.id || l.lessonId,
        lesson: l.lesson || l.lessonName,
        code: l.code || '—',
        units: l.units || l.unitCount || 1,
        podmans: l.podmans || [],
        lessonAverage: l.lessonAverage ?? l.total ?? 0,
        isPassed: l.isPassed ?? false,
        classAvg: l.classAvg ?? 0,
      }));
  }, [apiReportCard]);

  // Filtered general lessons
  const filteredGeneralGrades = useMemo(() => {
    return generalGrades.filter(
      (g: any) =>
        !searchQuery ||
        g.lesson.toLowerCase().includes(searchQuery.toLowerCase()) ||
        g.code.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [generalGrades, searchQuery]);

  // Filtered modular lessons
  const filteredModularGrades = useMemo(() => {
    return modularGrades.filter(
      (m: any) =>
        !searchQuery ||
        m.lesson.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.code.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [modularGrades, searchQuery]);

  // Calculate overall GPA
  const totalGeneralUnits = generalGrades.reduce((sum: number, g: any) => sum + g.units, 0);
  const totalModularUnits = modularGrades.reduce((sum: number, m: any) => sum + m.units, 0);
  const totalAllUnits = totalGeneralUnits + totalModularUnits;

  const generalWeightedSum = generalGrades.reduce((sum: number, g: any) => sum + g.total * g.units, 0);
  const modularWeightedSum = modularGrades.reduce((sum: number, m: any) => sum + m.lessonAverage * m.units, 0);
  const overallGpa =
    totalAllUnits > 0
      ? parseFloat(((generalWeightedSum + modularWeightedSum) / totalAllUnits).toFixed(2))
      : 0;

  // Chart data for Analytics Tab
  const chartData = useMemo(() => {
    const generalItems = generalGrades.map((g: any) => ({
      name: g.lesson.length > 15 ? `${g.lesson.slice(0, 15)}...` : g.lesson,
      fullName: g.lesson,
      studentScore: g.total,
      classAvg: g.classAvg,
      units: g.units,
      type: 'عمومی',
    }));
    const modularItems = modularGrades.map((m: any) => ({
      name: m.lesson.length > 15 ? `${m.lesson.slice(0, 15)}...` : m.lesson,
      fullName: m.lesson,
      studentScore: m.lessonAverage,
      classAvg: m.classAvg,
      units: m.units,
      type: 'پودمانی',
    }));
    return [...generalItems, ...modularItems];
  }, [generalGrades, modularGrades]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-4 sm:space-y-5 pb-12 max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 animate-in fade-in duration-300">
      {/* 1. Header Master Panel */}
      <div className="bg-white dark:bg-[#151C28] rounded-2xl border-[1.5px] border-primary-dark/30 dark:border-[#242F42] shadow-[2px_2px_0_#59BBAF] dark:shadow-[2px_2px_0_#0B0F17] p-4 sm:p-5">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary dark:text-primary border border-primary/25 flex items-center justify-center font-black shadow-2xs shrink-0">
            <BarChart3 className="w-5 h-5" />
          </div>
          <h1 className="text-lg sm:text-2xl font-black text-ink-darker dark:text-white truncate">
            {isParent ? 'کارنامه و نمرات' : 'نمرات و کارنامه'}
          </h1>
        </div>
      </div>

      {isLoading ? (
        <div className="p-8 sm:p-12 text-center bg-white dark:bg-[#151C28] rounded-2xl border-[1.5px] border-primary-dark/30 dark:border-[#242F42] shadow-[2px_2px_0_#59BBAF] dark:shadow-[2px_2px_0_#0B0F17] space-y-3 max-w-2xl mx-auto">
          <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mx-auto border border-primary/25">
            <BarChart3 className="w-6 h-6 animate-pulse" />
          </div>
          <p className="text-xs font-bold text-gray-500 dark:text-gray-400">در حال بررسی وضعیت صدور کارنامه...</p>
        </div>
      ) : !isReportCardIssued ? (
        /* State when no report card is issued by admin: Only show message */
        <div className="p-8 sm:p-12 text-center bg-white dark:bg-[#151C28] rounded-2xl border-[1.5px] border-primary-dark/30 dark:border-[#242F42] shadow-[2px_2px_0_#59BBAF] dark:shadow-[2px_2px_0_#0B0F17] space-y-4 max-w-2xl mx-auto animate-in fade-in duration-200">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary dark:text-primary flex items-center justify-center mx-auto border border-primary/25 shadow-2xs">
            <FileSpreadsheet className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/25">
              وضعیت: در انتظار صدور کارنامه
            </span>
            <h2 className="text-lg sm:text-xl font-black text-ink-darker dark:text-white">
              کارنامه‌ای صادر نشده است
            </h2>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 leading-relaxed max-w-lg mx-auto">
              هنوز کارنامه تحصیلی توسط مدیریت و کادر مدرسه برای شما صادر نشده است. به محض ثبت و صدور نهایی نمرات توسط مدرسه، کارنامه تحصیلی، ریز نمرات و معدل در این صفحه در دسترس قرار خواهد گرفت.
            </p>
          </div>

          <div className="pt-2 flex items-center justify-center gap-2 text-xs text-primary font-bold bg-primary/5 dark:bg-primary/10 py-2.5 px-4 rounded-xl max-w-md mx-auto border border-primary/20">
            <Clock className="w-4 h-4 shrink-0" />
            <span>در صورت وجود هرگونه پرسش، با کادر آموزشی یا مدیریت مدرسه تماس حاصل فرمایید.</span>
          </div>
        </div>
      ) : (
        /* Published State: Full Premium Report Card */
        <>
          {/* 2. Top Summary KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {/* KPI 1: GPA */}
            <div className="p-4 rounded-2xl bg-white dark:bg-[#151C28] border border-gray-200/80 dark:border-[#242F42] shadow-xs flex items-center gap-3.5 hover:-translate-y-0.5 hover:border-primary/40 transition-all">
              <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary dark:text-primary flex items-center justify-center shrink-0 border border-primary/20">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div className="space-y-0.5 min-w-0">
                <span className="text-xs font-bold text-muted-foreground block truncate">معدل کل نیم‌سال</span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xl sm:text-2xl font-black text-primary font-mono">
                    {totalAllUnits > 0 ? toPersianDigits(overallGpa.toFixed(2)) : '—'}
                  </span>
                  {totalAllUnits > 0 && <span className="text-[11px] font-bold text-muted-foreground">از ۲۰</span>}
                </div>
                <span className="inline-block text-[10px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-1.5 py-0.2 rounded border border-emerald-500/20">
                  {totalAllUnits > 0 ? (overallGpa >= 17 ? 'رتبه ممتاز' : 'وضعیت تحصیلی فعال') : 'هنوز نمره‌ای ثبت نشده'}
                </span>
              </div>
            </div>

            {/* KPI 2: Academic Status */}
            <div className="p-4 rounded-2xl bg-white dark:bg-[#151C28] border border-gray-200/80 dark:border-[#242F42] shadow-xs flex items-center gap-3.5 hover:-translate-y-0.5 hover:border-emerald-500/40 transition-all">
              <div className="w-11 h-11 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20">
                <Award className="w-5 h-5" />
              </div>
              <div className="space-y-0.5 min-w-0">
                <span className="text-xs font-bold text-muted-foreground block truncate">وضعیت تحصیلی نهایی</span>
                <div className="text-base sm:text-lg font-black text-emerald-600 dark:text-emerald-400 truncate">
                  {totalAllUnits > 0 ? (overallGpa >= 12 ? 'قبول' : 'نیازمند جبران') : '—'}
                </div>
                <span className="text-[10px] text-muted-foreground block">
                  {totalAllUnits > 0 ? (overallGpa >= 12 ? 'بدون درس افتاده' : 'دارای نمره زیر حد نصاب') : 'در انتظار ثبت نمرات'}
                </span>
              </div>
            </div>

            {/* KPI 3: Units Completed */}
            <div className="p-4 rounded-2xl bg-white dark:bg-[#151C28] border border-gray-200/80 dark:border-[#242F42] shadow-xs flex items-center gap-3.5 hover:-translate-y-0.5 hover:border-third/40 transition-all">
              <div className="w-11 h-11 rounded-xl bg-college-light dark:bg-[#38260D] text-third dark:text-[#FBBF24] flex items-center justify-center shrink-0 border border-third/30">
                <BookOpen className="w-5 h-5" />
              </div>
              <div className="space-y-0.5 min-w-0">
                <span className="text-xs font-bold text-muted-foreground block truncate">واحدهای گذرانده</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-xl sm:text-2xl font-black text-ink-darker dark:text-white font-mono">
                    {toPersianDigits(totalAllUnits)}
                  </span>
                  <span className="text-[11px] font-bold text-muted-foreground">از {toPersianDigits(totalAllUnits)} واحد</span>
                </div>
                <span className="inline-block text-[10px] font-black text-third dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.2 rounded border border-amber-500/20">
                  {totalAllUnits > 0 ? `${toPersianDigits(totalAllUnits)} واحد فعال` : 'فاقد واحد'}
                </span>
              </div>
            </div>

            {/* KPI 4: Courses Count */}
            <div className="p-4 rounded-2xl bg-white dark:bg-[#151C28] border border-gray-200/80 dark:border-[#242F42] shadow-xs flex items-center gap-3.5 hover:-translate-y-0.5 hover:border-club/40 transition-all">
              <div className="w-11 h-11 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 border border-purple-500/20">
                <Layers className="w-5 h-5" />
              </div>
              <div className="space-y-0.5 min-w-0">
                <span className="text-xs font-bold text-muted-foreground block truncate">عناوین درسی</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-xl sm:text-2xl font-black text-ink-darker dark:text-white font-mono">
                    {toPersianDigits(generalGrades.length + modularGrades.length)}
                  </span>
                  <span className="text-[11px] font-bold text-muted-foreground">عنوان درسی</span>
                </div>
                <span className="text-[10px] text-muted-foreground block truncate">
                  {toPersianDigits(generalGrades.length)} عمومی + {toPersianDigits(modularGrades.length)} پودمانی
                </span>
              </div>
            </div>
          </div>

          {/* 3. Navigation Tabs & Search Toolbar */}
          <div className="p-3 sm:p-4 rounded-2xl bg-white dark:bg-[#151C28] border border-gray-200/80 dark:border-[#242F42] shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            {/* Tabs Pill Group */}
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('ALL')}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer select-none ${
                  activeTab === 'ALL'
                    ? 'bg-primary text-white shadow-[2px_2px_0_#1F413D] dark:shadow-[2px_2px_0_#0F172A]'
                    : 'bg-gray-100 dark:bg-[#1C2536] text-muted-foreground hover:text-foreground'
                }`}
              >
                همه دروس ({toPersianDigits(generalGrades.length + modularGrades.length)})
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('GENERAL')}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer select-none ${
                  activeTab === 'GENERAL'
                    ? 'bg-primary text-white shadow-[2px_2px_0_#1F413D] dark:shadow-[2px_2px_0_#0F172A]'
                    : 'bg-sky-50 dark:bg-sky-950/30 text-sky-700 dark:text-sky-400 hover:bg-sky-100'
                }`}
              >
                دروس عمومی و نظری ({toPersianDigits(generalGrades.length)})
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('MODULAR')}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer select-none ${
                  activeTab === 'MODULAR'
                    ? 'bg-primary text-white shadow-[2px_2px_0_#1F413D] dark:shadow-[2px_2px_0_#0F172A]'
                    : 'bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-400 hover:bg-purple-100'
                }`}
              >
                دروس کارگاهی پودمانی ({toPersianDigits(modularGrades.length)})
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('ANALYTICS')}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer select-none flex items-center gap-1.5 ${
                  activeTab === 'ANALYTICS'
                    ? 'bg-primary text-white shadow-[2px_2px_0_#1F413D] dark:shadow-[2px_2px_0_#0F172A]'
                    : 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                تحلیل و نمودار پیشرفت
              </button>
            </div>

            {/* Quick Search */}
            {activeTab !== 'ANALYTICS' && (
              <div className="relative min-w-[200px] sm:min-w-[240px]">
                <Search className="w-4 h-4 text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="جستجوی عنوان درس یا کد..."
                  className="w-full h-9 pr-9 pl-3 rounded-xl border border-gray-200 dark:border-[#242F42] bg-gray-50 dark:bg-[#1C2536] text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all placeholder:text-muted-foreground"
                />
              </div>
            )}
          </div>

          {/* 4. Tab 1 & Tab 2: General & Theoretical Lessons */}
          {(activeTab === 'ALL' || activeTab === 'GENERAL') && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm sm:text-base font-black text-ink-darker dark:text-white flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-sky-500" />
                  <span>ریز نمرات دروس عمومی و نظری</span>
                  <span className="text-xs font-normal text-muted-foreground">
                    ({toPersianDigits(filteredGeneralGrades.length)} درس)
                  </span>
                </h3>

                <span className="text-[11px] font-bold text-muted-foreground hidden sm:inline">
                  مبنای محاسبه: ۳۰٪ مستمر + ۳۰٪ میان‌ترم + ۴۰٪ پایانی
                </span>
              </div>

              {/* Desktop Table View */}
              <div className="hidden md:block rounded-2xl border border-gray-200/80 dark:border-[#242F42] bg-white dark:bg-[#151C28] overflow-hidden shadow-xs">
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr className="bg-gray-50/80 dark:bg-[#1C2536] border-b border-gray-200 dark:border-[#242F42] text-muted-foreground font-black">
                      <th className="py-3 px-4 w-12 text-center">#</th>
                      <th className="py-3 px-4">عنوان درس</th>
                      <th className="py-3 px-3 text-center">تعداد واحد</th>
                      <th className="py-3 px-3 text-center">نمره مستمر (۳۰٪)</th>
                      <th className="py-3 px-3 text-center">میان‌ترم (۳۰٪)</th>
                      <th className="py-3 px-3 text-center">پایانی (۴۰٪)</th>
                      <th className="py-3 px-3 text-center bg-primary/5 dark:bg-primary/10">نمره نهایی (از ۲۰)</th>
                      <th className="py-3 px-3 text-center">وضعیت</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-[#242F42]">
                    {filteredGeneralGrades.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-muted-foreground font-bold">
                          هنوز نمره‌ای برای دروس عمومی و نظری ثبت نشده است.
                        </td>
                      </tr>
                    ) : (
                      filteredGeneralGrades.map((g: any, idx: number) => (
                        <tr
                          key={g.id}
                          className="hover:bg-gray-50/50 dark:hover:bg-[#1C2536]/40 transition-colors"
                        >
                          <td className="py-3.5 px-4 text-center font-mono font-bold text-muted-foreground">
                            {toPersianDigits(idx + 1)}
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-black text-ink-darker dark:text-white text-xs sm:text-sm">
                              {g.lesson}
                            </div>
                            <span className="text-[10px] text-muted-foreground font-mono">
                              {g.code}
                            </span>
                          </td>
                          <td className="py-3.5 px-3 text-center font-mono font-bold text-muted-foreground">
                            {toPersianDigits(g.units)} واحد
                          </td>
                          <td className="py-3.5 px-3 text-center font-mono font-bold text-foreground">
                            {toPersianDigits(g.continuous.toFixed(2))}
                          </td>
                          <td className="py-3.5 px-3 text-center font-mono font-bold text-foreground">
                            {toPersianDigits(g.midterm.toFixed(2))}
                          </td>
                          <td className="py-3.5 px-3 text-center font-mono font-bold text-foreground">
                            {toPersianDigits(g.final.toFixed(2))}
                          </td>
                          <td className="py-3.5 px-3 text-center bg-primary/5 dark:bg-primary/10">
                            <span
                              className={`inline-block font-mono font-black text-sm px-2.5 py-0.5 rounded-lg border ${
                                g.total >= 18
                                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                                  : g.total >= 14
                                  ? 'bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border-sky-500/30'
                                  : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-500/30'
                              }`}
                            >
                              {toPersianDigits(g.total.toFixed(2))}
                            </span>
                          </td>
                          <td className="py-3.5 px-3 text-center">
                            <Badge
                              variant={g.isPassed ? 'ecosystem' : 'female'}
                              className="text-[10px] font-black px-2.5 py-0.5"
                            >
                              {g.isPassed ? 'قبول' : 'تجدید'}
                            </Badge>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card List View */}
              <div className="md:hidden space-y-2.5">
                {filteredGeneralGrades.length === 0 ? (
                  <div className="p-6 text-center text-muted-foreground font-bold text-xs bg-white dark:bg-[#151C28] rounded-xl border border-gray-200 dark:border-[#242F42]">
                    هنوز نمره‌ای برای دروس عمومی و نظری ثبت نشده است.
                  </div>
                ) : (
                  filteredGeneralGrades.map((g: any, idx: number) => (
                    <div
                      key={g.id}
                      className="p-3.5 rounded-2xl bg-white dark:bg-[#151C28] border border-gray-200/80 dark:border-[#242F42] shadow-xs space-y-2.5"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-lg bg-gray-100 dark:bg-[#1C2536] text-muted-foreground font-mono font-bold text-[11px] flex items-center justify-center">
                            {toPersianDigits(idx + 1)}
                          </span>
                          <div>
                            <div className="font-black text-foreground text-xs">{g.lesson}</div>
                            <span className="text-[10px] text-muted-foreground font-mono">{g.units} واحد</span>
                          </div>
                        </div>

                        <div className="text-left">
                          <span
                            className={`inline-block font-mono font-black text-sm px-2 py-0.5 rounded-lg border ${
                              g.total >= 18
                                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                                : 'bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border-sky-500/30'
                            }`}
                          >
                            {toPersianDigits(g.total.toFixed(2))}
                          </span>
                          <span className="block text-[9px] text-emerald-600 font-bold mt-0.5">قبول</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-1.5 p-2 bg-gray-50 dark:bg-[#1C2536] rounded-xl text-[10px] text-center font-bold">
                        <div>
                          <span className="text-muted-foreground block text-[9px]">مستمر (۳۰٪)</span>
                          <span className="font-mono text-foreground">{toPersianDigits(g.continuous.toFixed(2))}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block text-[9px]">میان‌ترم (۳۰٪)</span>
                          <span className="font-mono text-foreground">{toPersianDigits(g.midterm.toFixed(2))}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block text-[9px]">پایانی (۴۰٪)</span>
                          <span className="font-mono text-foreground">{toPersianDigits(g.final.toFixed(2))}</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* 5. Tab 1 & Tab 3: Vocational Modular Lessons */}
          {(activeTab === 'ALL' || activeTab === 'MODULAR') && (
            <div className="space-y-3 pt-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <h3 className="text-sm sm:text-base font-black text-ink-darker dark:text-white flex items-center gap-2">
                  <Award className="w-4 h-4 text-purple-600" />
                  <span>کارنامه دروس کارگاهی و تخصصی پودمانی (فنی و حرفه‌ای)</span>
                  <Badge variant="neutral" className="bg-purple-100 dark:bg-purple-950/50 text-purple-800 dark:text-purple-300 text-[10px]">
                    ارزشیابی شایستگی‌محور
                  </Badge>
                </h3>

                <span className="text-[11px] text-muted-foreground font-mono">
                  فرمول مصوب: نمره مستمر (۰ تا ۵) + نمره شایستگی (سطح ۱ تا ۳ × ۵) | حد نصاب قبولی: ۱۲
                </span>
              </div>

              <div className="space-y-4">
                {filteredModularGrades.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground font-bold text-xs bg-white dark:bg-[#151C28] rounded-2xl border border-dashed border-gray-200 dark:border-gray-800">
                    هنوز نمره‌ای برای دروس کارگاهی و پودمانی ثبت نشده است.
                  </div>
                ) : (
                  filteredModularGrades.map((modLesson: any, idx: number) => (
                  <div
                    key={modLesson.id}
                    className="rounded-2xl border border-gray-200/80 dark:border-[#242F42] bg-white dark:bg-[#151C28] p-4 sm:p-5 space-y-4 shadow-xs hover:border-purple-300 dark:hover:border-purple-800/60 transition-colors"
                  >
                    {/* Lesson Header */}
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2.5 pb-3 border-b border-gray-100 dark:border-[#242F42]">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 flex items-center justify-center font-black text-sm shrink-0 border border-purple-300 dark:border-purple-800/50">
                          {toPersianDigits(idx + 1)}
                        </div>
                        <div>
                          <h4 className="font-black text-xs sm:text-sm text-ink-darker dark:text-white">
                            {modLesson.lesson}
                          </h4>
                          <span className="text-[11px] text-muted-foreground font-mono">
                            {toPersianDigits(modLesson.units)} واحد کارگاهی تخصصی • ۵ پودمان استاندارد
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 self-end sm:self-center">
                        <div className="text-left sm:text-right">
                          <span className="text-[10px] text-muted-foreground block">میانگین کل درس:</span>
                          <span className="font-mono font-black text-base text-purple-700 dark:text-purple-400">
                            {toPersianDigits(modLesson.lessonAverage.toFixed(2))} از ۲۰
                          </span>
                        </div>
                        <Badge
                          variant={modLesson.isPassed ? 'ecosystem' : 'female'}
                          className="text-xs px-2.5 py-1 font-black"
                        >
                          {modLesson.isPassed ? 'قبولی قطعی درس' : 'نیازمند آزمون مجدد'}
                        </Badge>
                      </div>
                    </div>

                    {/* 5 Podmans Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5">
                      {modLesson.podmans.map((pod: any) => (
                        <div
                          key={pod.number}
                          className={`p-3 rounded-xl border flex flex-col justify-between space-y-2.5 transition-all ${
                            pod.isPassed
                              ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200/80 dark:border-emerald-800/40'
                              : 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-200/80 dark:border-rose-800/40'
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-black text-xs text-foreground">
                                پودمان {toPersianDigits(pod.number)}
                              </span>
                              <span
                                className={`text-[10px] px-1.5 py-0.2 rounded font-black ${
                                  pod.isPassed
                                    ? 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300'
                                    : 'bg-rose-100 dark:bg-rose-900/60 text-rose-800 dark:text-rose-300'
                                }`}
                              >
                                {pod.isPassed ? 'قبول' : 'تجدید'}
                              </span>
                            </div>
                            <div className="text-[10px] text-muted-foreground line-clamp-1" title={pod.title}>
                              {pod.title}
                            </div>
                          </div>

                          <div className="space-y-1 pt-2 border-t border-black/5 dark:border-white/5 text-[10px]">
                            <div className="flex justify-between text-muted-foreground">
                              <span>مستمر (از ۵):</span>
                              <span className="font-mono font-bold text-foreground">
                                {toPersianDigits(pod.continuous.toFixed(1))}
                              </span>
                            </div>
                            <div className="flex justify-between text-muted-foreground">
                              <span>شایستگی (۱-۳):</span>
                              <span className="font-mono font-bold text-foreground">
                                سطح {toPersianDigits(pod.competency)}
                              </span>
                            </div>
                            <div className="flex justify-between items-center font-bold pt-1 border-t border-black/10 dark:border-white/10">
                              <span className="text-[11px] text-foreground">نمره نهایی:</span>
                              <span
                                className={`font-mono text-sm font-black ${
                                  pod.isPassed
                                    ? 'text-emerald-600 dark:text-emerald-400'
                                    : 'text-rose-600 dark:text-rose-400'
                                }`}
                              >
                                {toPersianDigits(pod.total.toFixed(2))}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
              </div>
            </div>
          )}

          {/* 6. Tab 4: Academic Analytics & Performance */}
          {activeTab === 'ANALYTICS' && (
            <div className="space-y-4">
              {/* Performance Comparison Chart */}
              <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#151C28] border border-gray-200/80 dark:border-[#242F42] shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm sm:text-base font-black text-ink-darker dark:text-white flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-primary" />
                      <span>نمودار مقایسه نمره دانش‌آموز با میانگین کلاس</span>
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      بررسی وضعیت پیشرفت در تمامی عناوین درسی نیم‌سال تحصیلی جاری
                    </p>
                  </div>

                  <div className="flex items-center gap-3 text-xs font-bold">
                    <div className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded bg-primary" />
                      <span>نمره دانش‌آموز</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded bg-gray-300 dark:bg-gray-600" />
                      <span>میانگین کلاس</span>
                    </div>
                  </div>
                </div>

                {chartData.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground font-bold text-xs bg-gray-50/50 dark:bg-[#1C2536]/50 rounded-2xl border border-dashed border-gray-200 dark:border-gray-800">
                    داده‌ای جهت رسم نمودار تحلیل پیشرفت تحصیلی موجود نیست.
                  </div>
                ) : (
                  <div className="h-64 sm:h-72 w-full pt-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={chartData}
                        margin={{ top: 10, right: 10, left: -20, bottom: 25 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                        <XAxis
                          dataKey="name"
                          tick={{ fontSize: 10, fill: '#888888', fontWeight: 'bold' }}
                          interval={0}
                          angle={-25}
                          textAnchor="end"
                        />
                        <YAxis
                          domain={[0, 20]}
                          tick={{ fontSize: 10, fill: '#888888', fontWeight: 'bold' }}
                          ticks={[0, 5, 10, 15, 20]}
                        />
                        <Tooltip
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const data = payload[0].payload;
                              return (
                                <div className="bg-white dark:bg-[#1C2536] p-3 rounded-xl border border-gray-200 dark:border-[#242F42] shadow-xl text-xs space-y-1.5 text-right font-bold">
                                  <div className="text-primary font-black border-b pb-1">
                                    {data.fullName} ({data.units} واحد)
                                  </div>
                                  <div className="text-foreground">
                                    نمره شما:{' '}
                                    <strong className="font-mono text-emerald-600 text-sm">
                                      {toPersianDigits(data.studentScore.toFixed(2))}
                                    </strong>{' '}
                                    از ۲۰
                                  </div>
                                  <div className="text-muted-foreground">
                                    میانگین کلاس:{' '}
                                    <span className="font-mono">
                                      {toPersianDigits(data.classAvg.toFixed(2))}
                                    </span>
                                  </div>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <ReferenceLine y={12} stroke="#f43f5e" strokeDasharray="3 3" label={{ value: 'حد نصاب قبولی (۱۲)', fill: '#f43f5e', fontSize: 10 }} />
                        <Bar dataKey="studentScore" fill="#59BBAF" radius={[6, 6, 0, 0]} maxBarSize={32} />
                        <Bar dataKey="classAvg" fill="#94a3b8" radius={[6, 6, 0, 0]} maxBarSize={32} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              {/* Strengths & Recommendations Grid */}
              {chartData.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Strengths */}
                  <div className="p-4 rounded-2xl bg-white dark:bg-[#151C28] border border-gray-200/80 dark:border-[#242F42] shadow-xs space-y-3">
                    <div className="flex items-center gap-2 text-emerald-600 font-black text-sm">
                      <Sparkles className="w-4 h-4" />
                      <span>نقاط قوت برجسته تحصیلی</span>
                    </div>
                    <div className="space-y-2 text-xs">
                      {[...chartData]
                        .sort((a, b) => b.studentScore - a.studentScore)
                        .slice(0, 3)
                        .map((item, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between p-2 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-800/40"
                          >
                            <span className="font-bold text-foreground">{item.fullName}</span>
                            <span className="font-mono font-black text-emerald-600">
                              {toPersianDigits(item.studentScore.toFixed(2))} (
                              {item.studentScore >= 18 ? 'عالی' : item.studentScore >= 14 ? 'خوب' : 'متوسط'})
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>

                  {/* Recommendations */}
                  <div className="p-4 rounded-2xl bg-white dark:bg-[#151C28] border border-gray-200/80 dark:border-[#242F42] shadow-xs space-y-3">
                    <div className="flex items-center gap-2 text-sky-600 font-black text-sm">
                      <Info className="w-4 h-4" />
                      <span>توصیه‌ها و برنامه‌ریزی هدایت تحصیلی</span>
                    </div>
                    <ul className="space-y-2 text-xs text-muted-foreground leading-relaxed">
                      <li className="flex items-start gap-2">
                        <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                        <span>
                          {overallGpa >= 17
                            ? 'عملکرد کلی دانش‌آموز در سطح ممتاز ارزیابی شده و شرایط ورود به المپیادها و جشنواره‌های علمی را داراست.'
                            : 'تداوم مطالعه مستمر و پیگیری حل تمرینات می‌تواند موجب ارتقای سطح نمرات در آزمون‌های پیش‌رو شود.'}
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check className="w-3.5 h-3.5 text-sky-500 shrink-0 mt-0.5" />
                        <span>شرکت در کارگاه‌های تقویت مهارت و رفع اشکال در ارتقای شایستگی‌های پودمانی بسیار اثربخش خواهد بود.</span>
                      </li>
                    </ul>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* 7. Official Printable Report Card Modal */}
      <Modal
        isOpen={isOfficialModalOpen}
        onClose={() => setIsOfficialModalOpen(false)}
        title="پیش‌نمایش و صدور کارنامه رسمی (فرمت آموزش و پرورش)"
        description="نسخه نهایی قابل چاپ با مهر و امضای دیجیتال مجتمع آموزشی رکاد"
        maxWidth="lg"
      >
        <div className="space-y-4 text-right">
          {/* Print Action Bar */}
          <div className="flex items-center justify-between bg-gray-50 dark:bg-[#1C2536] p-2.5 rounded-xl border border-gray-200 dark:border-[#242F42]">
            <span className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
              <Printer className="w-4 h-4 text-primary" />
              جهت دانلود PDF یا چاپ بر روی کاغذ، روی دکمه چاپ کلیک نمایید.
            </span>
            <Button
              size="sm"
              onClick={handlePrint}
              className="h-8 px-4 text-xs font-black bg-primary hover:bg-primary/90 text-primary-foreground border-2 border-black shadow-[1.5px_1.5px_0_#000] flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              چاپ کارنامه (Print / PDF)
            </Button>
          </div>

          {/* Printable Document Box */}
          <div className="border-2 border-black/80 dark:border-white/40 rounded-2xl p-5 sm:p-7 bg-white dark:bg-[#151C28] space-y-4 shadow-sm text-foreground">
            {/* Ministry & School Header */}
            <div className="flex items-center justify-between border-b-2 border-black/20 pb-4">
              <div className="w-12 h-12 flex items-center justify-center shrink-0">
                <img
                  src="/logo.svg"
                  alt="لوگوی مجتمع"
                  className="w-10 h-10 object-contain"
                  onError={(e) => {
                    // Fallback to icon if logo not loaded
                    (e.target as any).style.display = 'none';
                  }}
                />
              </div>

              <div className="text-center space-y-0.5 flex-1">
                <div className="font-bold text-[11px] text-muted-foreground">
                  وزارت آموزش و پرورش جمهوری اسلامی ایران
                </div>
                <div className="font-black text-base sm:text-lg text-ink-darker dark:text-white">
                  مجتمع آموزشی و هنرستان هوشمند رکاد
                </div>
                <div className="text-xs font-black text-primary">
                  کارنامه ارزشیابی پیشرفت تحصیلی دانش‌آموز (سال تحصیلی ۱۴۰۴-۱۴۰۵)
                </div>
              </div>

              <div className="w-12 h-12 flex items-center justify-center shrink-0">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-black text-xs border border-primary/30">
                  رکاد
                </div>
              </div>
            </div>

            {/* Student Identification Meta */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs bg-gray-50 dark:bg-[#1C2536] p-3 rounded-xl border border-gray-200 dark:border-[#242F42]">
              <div>
                نام و نام خانوادگی:{' '}
                <strong>{user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : 'دانش‌آموز'}</strong>
              </div>
              <div>
                کد ملی: <strong className="font-mono">{(user as any)?.nationalId || (user as any)?.nationalCode || '—'}</strong>
              </div>
              <div>
                پایه و رشته: <strong>{(user as any)?.gradeLevel || (user as any)?.major ? `${(user as any)?.gradeLevel || ''} ${(user as any)?.major || ''}` : 'هنرستان هوشمند رکاد'}</strong>
              </div>
              <div>
                سال تحصیلی: <strong>۱۴۰۴-۱۴۰۵</strong>
              </div>
            </div>

            {/* General Subjects Table */}
            <div className="space-y-1 text-xs">
              <div className="font-black text-ink-darker dark:text-white pb-1 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-primary" />
                ریز نمرات دروس عمومی و نظری
              </div>
              <div className="grid grid-cols-6 gap-1 p-2 bg-gray-100 dark:bg-[#1C2536] font-bold text-center rounded-lg">
                <span className="col-span-2 text-right pr-2">عنوان درس</span>
                <span>واحد</span>
                <span>مستمر (۳۰٪)</span>
                <span>پایانی (۴۰٪)</span>
                <span>نمره کل</span>
              </div>
              {generalGrades.length === 0 ? (
                <div className="py-4 text-center text-muted-foreground font-bold">
                  هنوز نمره‌ای برای دروس عمومی ثبت نشده است.
                </div>
              ) : (
                generalGrades.map((g: any) => (
                  <div
                    key={g.id}
                    className="grid grid-cols-6 gap-1 p-2 border-b border-gray-100 dark:border-gray-800 text-center items-center"
                  >
                    <span className="col-span-2 text-right pr-2 font-bold">{g.lesson}</span>
                    <span className="font-mono">{toPersianDigits(g.units)}</span>
                    <span className="font-mono">{toPersianDigits(g.continuous.toFixed(2))}</span>
                    <span className="font-mono">{toPersianDigits(g.final.toFixed(2))}</span>
                    <span className="font-mono font-black text-primary">{toPersianDigits(g.total.toFixed(2))}</span>
                  </div>
                ))
              )}
            </div>

            {/* Modular Lessons Table */}
            <div className="space-y-1.5 pt-2 text-xs">
              <div className="font-black text-purple-900 dark:text-purple-300 flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-purple-600" />
                دروس شایستگی‌محور پودمانی (فنی و حرفه‌ای)
              </div>
              <div className="border border-purple-200 dark:border-purple-900/50 rounded-xl overflow-hidden">
                <div className="grid grid-cols-8 gap-1 p-2 bg-purple-50 dark:bg-purple-950/50 font-bold text-purple-950 dark:text-purple-200 text-center">
                  <span className="col-span-2 text-right pr-2">عنوان درس</span>
                  <span>پودمان ۱</span>
                  <span>پودمان ۲</span>
                  <span>پودمان ۳</span>
                  <span>پودمان ۴</span>
                  <span>پودمان ۵</span>
                  <span>معدل درس</span>
                </div>
                {modularGrades.length === 0 ? (
                  <div className="py-4 text-center text-muted-foreground font-bold">
                    هنوز نمره‌ای برای دروس پودمانی ثبت نشده است.
                  </div>
                ) : (
                  modularGrades.map((m: any) => (
                    <div
                      key={m.id}
                      className="grid grid-cols-8 gap-1 p-2 border-t border-purple-100 dark:border-purple-900/30 items-center text-center font-mono"
                    >
                      <span className="col-span-2 text-right pr-2 font-bold font-sans">{m.lesson}</span>
                      {m.podmans.map((p: any) => (
                        <span
                          key={p.number}
                          className="py-0.5 rounded font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40"
                        >
                          {toPersianDigits(p.total.toFixed(2))}
                        </span>
                      ))}
                      <span className="font-black text-purple-700 dark:text-purple-300 bg-purple-100/70 dark:bg-purple-950/60 py-0.5 rounded">
                        {toPersianDigits(m.lessonAverage.toFixed(2))}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* GPA and Summary Footer */}
            <div className="grid grid-cols-3 gap-2 p-3 bg-primary/10 dark:bg-primary/20 rounded-xl text-center text-xs font-bold border border-primary/20">
              <div>
                معدل کل نیم‌سال:{' '}
                <span className="text-primary text-sm font-mono font-black">
                  {totalAllUnits > 0 ? toPersianDigits(overallGpa.toFixed(2)) : '—'}
                </span>
              </div>
              <div>
                وضعیت قبولی:{' '}
                <span className="text-emerald-700 dark:text-emerald-400 text-sm font-black">
                  {totalAllUnits > 0 ? (overallGpa >= 12 ? 'قبول' : 'نیازمند جبران') : '—'}
                </span>
              </div>
              <div>
                واحدهای گذرانده:{' '}
                <span className="text-indigo-700 dark:text-indigo-400 text-sm font-mono font-black">
                  {toPersianDigits(totalAllUnits)}
                </span>
              </div>
            </div>

            {/* Signatures & Seal */}
            <div className="flex justify-between items-center pt-4 text-xs text-muted-foreground border-t border-black/10 dark:border-white/10">
              <div>امضاء و مهر مدیر مجتمع آموزشی رکاد</div>
              <div className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                تایید شده به صورت الکترونیکی و دارای اصالت سنجی سامانه
              </div>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default StudentGradesPage;
