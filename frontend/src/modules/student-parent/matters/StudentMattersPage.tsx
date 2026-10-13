import React, { useEffect, useState, useMemo } from 'react';
import { apiClient } from '../../../lib/api/client';
import { useAuthStore } from '../../../lib/auth/auth-store';
import { Skeleton } from '../../../components/ui/Skeleton';
import { toPersianDigits, formatJalaliDisplay } from '../../../utils/jalali';
import {
  Award,
  ShieldAlert,
  AlertTriangle,
  HeartHandshake,
  Calendar,
  TrendingUp,
  User,
  ShieldCheck,
  Scale,
  Search,
  X,
  Building2,
  BookOpen,
  GraduationCap,
  Clock,
  Layers,
} from 'lucide-react';

interface MatterRecord {
  id: string;
  source?: 'DIRECT_MATTER' | 'CLASSROOM_SESSION';
  type: 'POSITIVE' | 'NEGATIVE' | 'WARNING' | 'SUSPENSION' | 'COUNSELING_REFERRAL';
  title: string;
  description: string;
  points: number;
  actionTaken?: string;
  reportedAt: string;
  sessionDate?: string;
  oralGrade?: number | null;
  periodNumber?: number | null;
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
  reportedBy?: {
    firstName: string;
    lastName: string;
    role?: string;
  };
}

interface MattersResponse {
  matters: MatterRecord[];
  totalPoints: number;
  positiveCount: number;
  negativeCount: number;
}

export const StudentMattersPage: React.FC = () => {
  const { user } = useAuthStore();
  const [data, setData] = useState<MattersResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<'POSITIVE' | 'DISCIPLINARY'>('POSITIVE');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.get<MattersResponse>('/matters/my-matters');
      setData(res.data);
    } catch (err: any) {
      console.error('Failed to load my matters:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

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
      label: 'انضباطی',
      badgeStyle: 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-500/30',
      iconBg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
      iconColor: 'text-amber-600 dark:text-amber-400',
      icon: AlertTriangle,
    },
    SUSPENSION: {
      label: 'انضباطی',
      badgeStyle: 'bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-300 border-red-500/30',
      iconBg: 'bg-red-500/10 text-red-600 dark:text-red-400',
      iconColor: 'text-red-600 dark:text-red-400',
      icon: ShieldAlert,
    },
    COUNSELING_REFERRAL: {
      label: 'انضباطی',
      badgeStyle: 'bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border-purple-500/30',
      iconBg: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
      iconColor: 'text-purple-600 dark:text-purple-400',
      icon: HeartHandshake,
    },
  };

  const isParent = user?.role === 'PARENT';
  const matters = data?.matters || [];

  const filteredMatters = useMemo(() => {
    return matters.filter((m) => {
      const matchesFilter =
        activeFilter === 'POSITIVE'
          ? m.type === 'POSITIVE'
          : m.type !== 'POSITIVE';

      const matchesSearch =
        !searchQuery ||
        m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (m.description && m.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (m.actionTaken && m.actionTaken.toLowerCase().includes(searchQuery.toLowerCase()));

      return matchesFilter && matchesSearch;
    });
  }, [matters, activeFilter, searchQuery]);

  return (
    <div className="space-y-4 pb-12 max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 animate-in fade-in duration-300">
      {/* 1. Header Master Panel */}
      <div className="bg-white dark:bg-[#151C28] rounded-2xl border-[1.5px] border-primary-dark/30 dark:border-[#242F42] shadow-[2px_2px_0_#59BBAF] dark:shadow-[2px_2px_0_#0B0F17] px-4 py-3 sm:px-5 sm:py-3.5">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary dark:text-primary border border-primary/25 flex items-center justify-center font-black shadow-2xs shrink-0">
            <Scale className="w-5 h-5" />
          </div>
          <h1 className="text-lg sm:text-xl font-black text-ink-darker dark:text-white truncate">
            انضباطی/تشویقی
          </h1>
        </div>
      </div>

      {/* 2. Hero KPI Tabs (Commendations & Disciplinary as clickable tabs) */}
      {isLoading ? (
        <div className="grid grid-cols-2 gap-2.5 sm:gap-4">
          <Skeleton className="h-20 sm:h-24 rounded-2xl" />
          <Skeleton className="h-20 sm:h-24 rounded-2xl" />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2.5 sm:gap-4">
          {/* Tab 1: موارد تشویقی */}
          <button
            type="button"
            onClick={() => setActiveFilter('POSITIVE')}
            className={`p-3 sm:p-4 rounded-2xl border transition-all text-right flex items-center gap-2.5 sm:gap-3.5 cursor-pointer select-none min-w-0 ${
              activeFilter === 'POSITIVE'
                ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-2 border-emerald-500 shadow-[2px_2px_0_#064e3b] dark:shadow-[2px_2px_0_#064e3b] -translate-y-0.5'
                : 'bg-white dark:bg-[#151C28] border border-gray-200/80 dark:border-[#242F42] hover:border-emerald-300 dark:hover:border-emerald-800/60 shadow-xs opacity-75 hover:opacity-100 hover:-translate-y-0.5'
            }`}
          >
            <div
              className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                activeFilter === 'POSITIVE'
                  ? 'bg-emerald-500 text-white shadow-xs'
                  : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
              }`}
            >
              <Award className="w-4.5 h-4.5 sm:w-5 sm:h-5" />
            </div>
            <div className="space-y-0.5 min-w-0">
              <span
                className={`text-xs font-bold block truncate transition-colors ${
                  activeFilter === 'POSITIVE'
                    ? 'text-emerald-950 dark:text-emerald-200 font-black'
                    : 'text-muted-foreground'
                }`}
              >
                موارد تشویقی
              </span>
              <div className="flex items-baseline gap-1 sm:gap-1.5">
                <span className="text-base sm:text-xl font-black text-emerald-600 dark:text-emerald-400">
                  {toPersianDigits(data?.positiveCount || 0)}
                </span>
                <span className="text-[10px] sm:text-[11px] text-emerald-600/80 font-bold">مورد</span>
              </div>
            </div>
          </button>

          {/* Tab 2: موارد انضباطی */}
          <button
            type="button"
            onClick={() => setActiveFilter('DISCIPLINARY')}
            className={`p-3 sm:p-4 rounded-2xl border transition-all text-right flex items-center gap-2.5 sm:gap-3.5 cursor-pointer select-none min-w-0 ${
              activeFilter === 'DISCIPLINARY'
                ? 'bg-rose-50/80 dark:bg-rose-950/40 border-2 border-rose-500 shadow-[2px_2px_0_#881337] dark:shadow-[2px_2px_0_#881337] -translate-y-0.5'
                : 'bg-white dark:bg-[#151C28] border border-gray-200/80 dark:border-[#242F42] hover:border-rose-300 dark:hover:border-rose-800/60 shadow-xs opacity-75 hover:opacity-100 hover:-translate-y-0.5'
            }`}
          >
            <div
              className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                activeFilter === 'DISCIPLINARY'
                  ? 'bg-rose-500 text-white shadow-xs'
                  : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
              }`}
            >
              <AlertTriangle className="w-4.5 h-4.5 sm:w-5 sm:h-5" />
            </div>
            <div className="space-y-0.5 min-w-0">
              <span
                className={`text-xs font-bold block truncate transition-colors ${
                  activeFilter === 'DISCIPLINARY'
                    ? 'text-rose-950 dark:text-rose-200 font-black'
                    : 'text-muted-foreground'
                }`}
              >
                موارد انضباطی
              </span>
              <div className="flex items-baseline gap-1 sm:gap-1.5">
                <span className="text-base sm:text-xl font-black text-rose-600 dark:text-rose-400">
                  {toPersianDigits(data?.negativeCount || 0)}
                </span>
                <span className="text-[10px] sm:text-[11px] text-rose-600/80 font-bold">مورد</span>
              </div>
            </div>
          </button>
        </div>
      )}

      {/* 3. Search below tabs */}
      <div className="relative w-full">
        <Search className="w-4 h-4 text-muted-foreground absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          placeholder="جستجو در عنوان یا اقدامات مدرسه..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-10 py-2.5 text-xs sm:text-sm rounded-xl bg-white dark:bg-[#151C28] border border-gray-200/80 dark:border-[#242F42] shadow-xs focus:outline-none focus:border-primary transition-all text-ink-darker dark:text-white"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-ink-darker dark:hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* 4. Matters Timeline / Card List */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-32 rounded-2xl" />
            <Skeleton className="h-32 rounded-2xl" />
            <Skeleton className="h-32 rounded-2xl" />
          </div>
        ) : filteredMatters.length === 0 ? (
          <div className="text-center py-16 px-4 bg-white dark:bg-[#151C28] rounded-2xl border-[1.5px] border-dashed border-gray-200 dark:border-gray-800">
            <div
              className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm ${
                activeFilter === 'DISCIPLINARY'
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                  : 'bg-primary/10 text-primary'
              }`}
            >
              {activeFilter === 'DISCIPLINARY' ? (
                <ShieldCheck className="w-8 h-8 stroke-[2.2]" />
              ) : (
                <Award className="w-8 h-8 stroke-[2.2]" />
              )}
            </div>
            <h4 className="text-base sm:text-lg font-black text-ink-darker dark:text-white">
              {searchQuery
                ? 'موردی با این عبارت یافت نشد'
                : activeFilter === 'DISCIPLINARY'
                ? 'پرونده انضباطی کاملاً پاک و درخشان است!'
                : 'هنوز موردی در بخش تشویقی‌ها ثبت نشده است'}
            </h4>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1.5 max-w-md mx-auto leading-relaxed">
              {searchQuery
                ? 'عبارت جستجو را تغییر دهید یا پاک کنید.'
                : activeFilter === 'DISCIPLINARY'
                ? 'خوشبختانه هیچ تذکر یا مورد انضباطی ثبت نشده است. با آرزوی تداوم نظم و موفقیت‌های شما!'
                : 'با مشارکت فعال در کلاس، انجام منظم تکالیف و پیشرفت در آزمون‌ها، نخستین امتیازهای تشویقی خود را کسب کنید.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:gap-4">
            {filteredMatters.map((m) => {
              const meta = typeMetaMap[m.type] || typeMetaMap.POSITIVE;
              const Icon = meta.icon;
              const isPositive = m.points > 0;
              const isNegative = m.points < 0;

              return (
                <div
                  key={m.id}
                  className="rounded-2xl border border-gray-200/80 dark:border-[#242F42] bg-white dark:bg-[#151C28] p-4 sm:p-5 shadow-xs hover:-translate-y-0.5 hover:shadow-sm transition-all duration-200 flex flex-col justify-between gap-3.5"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    {/* Right side: Icon, Type, Title, Description */}
                    <div className="flex items-start gap-3.5 min-w-0">
                      <div
                        className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border border-current/20 ${meta.iconBg}`}
                      >
                        <Icon className="w-5 h-5" />
                      </div>

                      <div className="space-y-1.5 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black border ${meta.badgeStyle}`}
                          >
                            {meta.label}
                          </span>

                          {/* Oral Grade Chip */}
                          {m.oralGrade !== null && m.oralGrade !== undefined && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 shadow-2xs">
                              <GraduationCap className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                              <span>نمره پرسش: {toPersianDigits(m.oralGrade)} از ۲۰</span>
                            </span>
                          )}

                          {m.points !== 0 && (
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black ${
                                isPositive
                                  ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                                  : 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/30'
                              }`}
                            >
                              <TrendingUp className="w-3 h-3" />
                              {isPositive ? `+${toPersianDigits(m.points)} امتیاز` : `${toPersianDigits(m.points)} امتیاز`}
                            </span>
                          )}

                          {m.source === 'CLASSROOM_SESSION' && (
                            <span className="inline-flex items-center gap-1 text-[10px] text-amber-700 dark:text-amber-300 font-bold bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 px-2 py-0.5 rounded-md">
                              دفتر کلاسی
                            </span>
                          )}
                        </div>

                        <h3 className="text-sm sm:text-base font-black text-ink-darker dark:text-white">
                          {m.title}
                        </h3>

                        {m.description && (
                          <p className="text-xs sm:text-[13px] text-ink-normal/80 dark:text-gray-300 leading-relaxed">
                            {m.description}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Left side: Date & Reporter badge */}
                    <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-100 dark:border-gray-800">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                        <Clock className="w-3.5 h-3.5 text-primary" />
                        <span>{formatJalaliDisplay(m.reportedAt, true)}</span>
                      </div>

                      {m.reportedBy && (
                        <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-gray-50 dark:bg-[#1E293B] border border-gray-200/60 dark:border-gray-800 text-[11px] text-muted-foreground font-bold">
                          <User className="w-3 h-3" />
                          <span>
                            ثبت: {m.reportedBy.firstName} {m.reportedBy.lastName}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Classroom Session Details Strip (Classroom, Lesson, Period, Session Date) */}
                  {(m.classroom || m.lesson || m.periodNumber || m.sessionDate) && (
                    <div className="p-2.5 rounded-xl bg-gray-50/90 dark:bg-[#1C2536]/90 border border-gray-200/70 dark:border-[#242F42] flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs">
                      {m.classroom && (
                        <div className="flex items-center gap-1.5 text-ink-darker dark:text-white font-bold">
                          <Building2 className="w-3.5 h-3.5 text-primary shrink-0" />
                          <span>کلاس: {m.classroom.name}</span>
                        </div>
                      )}
                      {m.lesson && (
                        <div className="flex items-center gap-1.5 text-ink-darker dark:text-white font-bold">
                          <BookOpen className="w-3.5 h-3.5 text-primary shrink-0" />
                          <span>درس: {m.lesson.name}</span>
                        </div>
                      )}
                      {m.periodNumber && (
                        <div className="flex items-center gap-1.5 text-muted-foreground font-bold">
                          <Layers className="w-3.5 h-3.5 text-primary shrink-0" />
                          <span>زنگ {toPersianDigits(m.periodNumber)}</span>
                        </div>
                      )}
                      {m.sessionDate && (
                        <div className="flex items-center gap-1.5 text-muted-foreground font-bold">
                          <Calendar className="w-3.5 h-3.5 text-primary shrink-0" />
                          <span>تاریخ جلسه: {formatJalaliDisplay(m.sessionDate, false)}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Action Taken Callout */}
                  {m.actionTaken && (
                    <div className="p-2.5 rounded-xl bg-primary-light/30 dark:bg-[#1C2536] border-r-4 border-r-primary text-xs flex items-start gap-2">
                      <strong className="font-black text-ink-darker dark:text-white">اقدام: </strong>
                      <span className="text-ink-normal dark:text-gray-300">{m.actionTaken}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

