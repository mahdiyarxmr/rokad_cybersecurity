import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  clubApi,
  MyClubStatusResponse,
  ClubChallenge,
  ClubDepartment,
  ClubGrade,
} from '../../lib/api/club';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { useAuthStore } from '../../lib/auth/auth-store';
import {
  Trophy,
  Crown,
  Sparkles,
  ChevronRight,
  Flame,
  Medal,
  Star,
  Users,
  Code2,
  Palette,
  Wrench,
  Clock,
  ArrowRight,
  CheckCircle2,
  CircleDashed,
  Rocket,
  ShieldCheck,
  Target,
  ExternalLink,
  Laptop,
  Check,
  Lock,
  Send,
  Award,
} from 'lucide-react';
import { toast } from 'sonner';
import { UnderDevelopmentOverlay } from '../../components/ui/UnderDevelopmentOverlay';

const DEFAULT_PREVIEW_DATA: MyClubStatusResponse = {
  membership: {
    id: 'preview-mem',
    userId: 'preview',
    department: 'ENGINEER',
    grade: 'B',
    status: 'ACTIVE_MEMBER',
    points: 1250,
    currentStreak: 5,
    maxStreak: 12,
  } as any,
  roadmap: [
    { id: '1', title: 'مقدمات کسب‌وکار و کارآفرینی', status: 'COMPLETED', order: 1 } as any,
    { id: '2', title: 'طراحی ارزش پیشنهادی و اعتبارسنجی ایده', status: 'COMPLETED', order: 2 } as any,
    { id: '3', title: 'توسعه نمونه اولیه و تست محصول (MVP)', status: 'IN_PROGRESS', order: 3 } as any,
    { id: '4', title: 'جذب کاربر و بازاریابی اولیه', status: 'LOCKED', order: 4 } as any,
    { id: '5', title: 'پیچ‌دک و ورود به استودیوی رشد', status: 'LOCKED', order: 5 } as any,
  ],
  progressPercentage: 60,
  activeChallengesCount: 2,
  canStartNewChallenge: true,
  activeSubmissions: [],
  recentSubmissions: [],
  isStudioReady: false,
};

export const ClubPage: React.FC = () => {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const isAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'SCHOOL_ADMIN' || user?.role === 'STAFF';
  const isTeacher = user?.role === 'TEACHER';

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<MyClubStatusResponse | null>(null);
  const [challenges, setChallenges] = useState<ClubChallenge[]>([]);
  const [selectedDeptFilter, setSelectedDeptFilter] = useState<ClubDepartment | 'ALL'>('ALL');
  const [activeTab, setActiveTab] = useState<'roadmap' | 'challenges' | 'studio' | 'rotello'>('roadmap');

  const fetchClubData = async () => {
    try {
      setLoading(true);
      const [statusRes, challengesRes] = await Promise.all([
        clubApi.getMyStatus(),
        clubApi.getChallenges(),
      ]);
      setData(statusRes);
      setChallenges(challengesRes.challenges || []);
    } catch (err: any) {
      toast.error('خطا در بارگذاری اطلاعات باشگاه کسب‌وکار');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClubData();
  }, []);

  const getDeptConfig = (dept: ClubDepartment | null) => {
    switch (dept) {
      case 'ENGINEER':
        return {
          title: 'دپارتمان مهندسا (Tech & Dev)',
          icon: Code2,
          color: 'text-indigo-400',
          bg: 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300',
          cardGradient: 'from-slate-900 via-indigo-950 to-slate-900',
          accent: '#6366F1',
        };
      case 'ARTIST':
        return {
          title: 'دپارتمان آرتیستا (UI/UX & Creative)',
          icon: Palette,
          color: 'text-pink-400',
          bg: 'bg-pink-500/10 border-pink-500/30 text-pink-300',
          cardGradient: 'from-slate-900 via-pink-950 to-slate-900',
          accent: '#EC4899',
        };
      case 'JACK_OF_ALL_TRADES':
        return {
          title: 'دپارتمان آچار فرانسه‌ها (Product & All-Rounder)',
          icon: Wrench,
          color: 'text-amber-400',
          bg: 'bg-amber-500/10 border-amber-500/30 text-amber-300',
          cardGradient: 'from-slate-900 via-amber-950 to-slate-900',
          accent: '#F59E0B',
        };
      default:
        return {
          title: 'در حال تعیین دپارتمان با چالش ورودی',
          icon: Sparkles,
          color: 'text-primary',
          bg: 'bg-primary/10 border-primary/30 text-primary',
          cardGradient: 'from-slate-900 via-slate-800 to-slate-900',
          accent: '#59BBAF',
        };
    }
  };

  const getGradeConfig = (grade: ClubGrade | null) => {
    switch (grade) {
      case 'A':
        return {
          title: 'گرید A (طلایی / نخبه)',
          desc: 'بالاترین سطح نخبگی — مجوز رسمی ورود به پروژه‌های استودیو',
          color: 'text-amber-400',
          badge: 'bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 font-black',
        };
      case 'B':
        return {
          title: 'گرید B (نقره‌ای / حرفه‌ای)',
          desc: 'مهارت تثبیت‌شده — در مسیر رسیدن به سطح استودیو',
          color: 'text-slate-300',
          badge: 'bg-gradient-to-r from-slate-200 to-slate-400 text-slate-950 font-black',
        };
      case 'C':
        return {
          title: 'گرید C (برنزی / ورودی)',
          desc: 'ورود موفق به باشگاه — نیازمند حل چالش‌های ارتقای سطح',
          color: 'text-amber-600',
          badge: 'bg-amber-700/30 text-amber-300 border border-amber-600/40 font-black',
        };
      default:
        return {
          title: 'در انتظار تعیین سطح',
          desc: 'با شرکت در چالش ورودی گرید شما مشخص می‌شود',
          color: 'text-gray-400',
          badge: 'bg-slate-800 text-slate-300 font-bold',
        };
    }
  };

  const currentData = data || DEFAULT_PREVIEW_DATA;
  const { membership, roadmap, progressPercentage, activeChallengesCount, canStartNewChallenge } = currentData;
  const isMember = membership.status === 'ACTIVE_MEMBER' || membership.status === 'STUDIO_READY';
  const deptConfig = getDeptConfig(membership.department);
  const gradeConfig = getGradeConfig(membership.grade);

  const filteredChallenges = challenges.filter((c) => {
    if (selectedDeptFilter === 'ALL') return true;
    return c.department === selectedDeptFilter;
  });

  return (
    <UnderDevelopmentOverlay
      title="باشگاه کارآفرینی و کسب‌وکار رُکاد"
      subtitle="Rokad Entrepreneurship & Business Club"
      description="محیط تیم‌سازی دانش‌آموزی، انجام مأموریت‌ها و چالش‌های دنیای واقعی کسب‌وکار، و ورود به استودیوی محصول در حال توسعه نهایی است و به زودی رونمایی می‌شود."
      badgeText="باشگاه کسب‌وکار • در حال توسعه"
      icon={Rocket}
      accentColor="purple"
    >
      <div className="max-w-4xl mx-auto space-y-6 pb-20 animate-in fade-in duration-300" data-theme="club">
      {/* Admin Quick Jump Banner */}
      {isAdmin && (
        <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 rounded-2xl p-4 text-stone-950 font-bold flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md border-2 border-stone-950">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-stone-950 text-amber-400 flex items-center justify-center shrink-0 shadow-inner">
              <Crown className="w-5 h-5" />
            </div>
            <div>
              <div className="font-black text-sm">پنل مدیریت باشگاه کسب‌وکار رُکاد</div>
              <div className="text-xs text-stone-900/80 font-medium">
                شما به عنوان مدیر وارد شده‌اید. برای رده‌بندی اعضا، ساخت نقشه راه داینامیک، تعریف چالش‌ها و داوری پروژه‌ها کلیک کنید:
              </div>
            </div>
          </div>
          <Button
            onClick={() => navigate('/app/admin/club')}
            className="bg-stone-950 hover:bg-stone-900 text-amber-400 font-black text-xs h-9 px-4 rounded-xl shrink-0 gap-1.5 shadow-sm"
          >
            <span>ورود به پنل مدیریت باشگاه</span>
            <ArrowRight className="w-3.5 h-3.5 rotate-180" />
          </Button>
        </div>
      )}

      {/* Teacher Quick Jump Banner */}
      {isTeacher && (
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 rounded-2xl p-4 text-white font-bold flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md border-2 border-stone-950">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-stone-950 text-blue-400 flex items-center justify-center shrink-0 shadow-inner">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <div className="font-black text-sm">کارتابل ارزیابی و تأییدیه‌های باشگاه</div>
              <div className="text-xs text-white/80 font-medium">
                شما به عنوان مربی وارد شده‌اید. برای بررسی شایستگی‌ها و ثبت تأییدیه دروس دانش‌آموزان کلیک کنید:
              </div>
            </div>
          </div>
          <Button
            onClick={() => navigate('/app/teacher/club-approvals')}
            className="bg-stone-950 hover:bg-stone-900 text-white font-black text-xs h-9 px-4 rounded-xl shrink-0 gap-1.5 shadow-sm"
          >
            <span>ورود به کارتابل تأییدیه‌ها</span>
            <ArrowRight className="w-3.5 h-3.5 rotate-180" />
          </Button>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#8A38F5]/10 text-[#8A38F5] border border-[#8A38F5]/25 text-xs font-black">
            <Rocket className="w-3.5 h-3.5" />
            <span>باشگاه کسب‌وکار و کارآفرینی رُکاد</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-ink-darker dark:text-white">
            مرکز نخبگان و شتاب‌دهی مهارتی
          </h1>
        </div>

        {/* Tab Switcher */}
        <div className="flex p-1 bg-white dark:bg-[#151C28] rounded-2xl border border-gray-200 dark:border-gray-800 shadow-2xs self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab('roadmap')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'roadmap'
                ? 'bg-[#8A38F5] text-white shadow-xs font-black'
                : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            مسیر رودمپ پذیرش
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('challenges')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'challenges'
                ? 'bg-[#8A38F5] text-white shadow-xs font-black'
                : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <span>چالش‌های مهارتی</span>
            {activeChallengesCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-amber-400 text-slate-900 text-[10px] font-black flex items-center justify-center">
                {activeChallengesCount}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('studio')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'studio'
                ? 'bg-[#8A38F5] text-white shadow-xs font-black'
                : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            رُکاد استودیو
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('rotello')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'rotello'
                ? 'bg-[#8A38F5] text-white shadow-xs font-black'
                : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>روتلو</span>
            {isMember && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            )}
          </button>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────────────────
          VIP Digital Club Card
          ───────────────────────────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl p-6 sm:p-8 bg-gradient-to-br from-[#111827] via-[#1E293B] to-[#0F172A] text-white border-2 border-slate-700/60 shadow-2xl">
        {/* Glow orb */}
        <div
          className="absolute -top-24 -left-24 w-80 h-80 rounded-full blur-3xl opacity-30 pointer-events-none"
          style={{ backgroundColor: deptConfig.accent }}
        />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-slate-800 border-2 border-white/20 overflow-hidden flex items-center justify-center shadow-lg">
                {membership.user?.avatarUrl ? (
                  <img
                    src={membership.user.avatarUrl}
                    alt={membership.user.firstName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Users className="w-8 h-8 text-slate-400" />
                )}
              </div>
              {isMember && (
                <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center shadow-md">
                  <Crown className="w-3.5 h-3.5" />
                </div>
              )}
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black">
                  {membership.user?.firstName} {membership.user?.lastName}
                </h2>
                {isMember && (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold">
                    عضو رسمی
                  </span>
                )}
              </div>

              <div className="text-xs text-slate-400 font-mono">
                کد دانش‌آموزی: {membership.user?.studentProfile?.studentCode || 'نامشخص'}
              </div>

              <div className="pt-1">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold border ${deptConfig.bg}`}>
                  <deptConfig.icon className="w-3.5 h-3.5" />
                  <span>{deptConfig.title}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Right Badges & Level Status */}
          <div className="flex flex-col sm:items-end gap-2.5 w-full md:w-auto pt-3 md:pt-0 border-t md:border-t-0 border-slate-700/60">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">سطح باشگاهی:</span>
              <span className={`px-3 py-1 rounded-xl text-xs ${gradeConfig.badge}`}>
                {gradeConfig.title}
              </span>
            </div>

            {membership.grade === 'A' ? (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 text-xs font-black shadow-md">
                <Sparkles className="w-4 h-4" />
                <span>آماده تخصیص به پروژه‌های استودیو</span>
              </div>
            ) : isMember ? (
              <span className="text-[11px] text-slate-400">
                تارگت بعدی: <strong className="text-amber-400">ارتقا به گرید A</strong> برای ورود به استودیو
              </span>
            ) : (
              <span className="text-[11px] text-primary">
                تکمیل رودمپ و شرکت در چالش ورودی الزامی است
              </span>
            )}
          </div>
        </div>

        {/* Dynamic Progress Bar Section */}
        <div className="mt-6 pt-5 border-t border-slate-700/60 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold">
            <div className="flex items-center gap-1.5 text-slate-300">
              <Flame className="w-4 h-4 text-orange-400" />
              <span>پیشرفت پذیرش و عضویت در باشگاه:</span>
            </div>
            <span className="font-mono text-[#8A38F5] text-sm font-black">
              %{progressPercentage}
            </span>
          </div>

          <div className="w-full h-3 rounded-full bg-slate-800 border border-slate-700 overflow-hidden relative">
            <div
              className="h-full bg-gradient-to-r from-[#8A38F5] via-[#A855F7] to-[#C084FC] rounded-full transition-all duration-700 shadow-sm"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>

          {!isMember && (
            <p className="text-[11px] text-slate-400 text-left pt-0.5">
              {progressPercentage < 100
                ? `هنوز ${100 - progressPercentage}٪ تا عضویت کامل در باشگاه باقی‌مانده است. چالش‌های زیر را تکمیل کنید.`
                : 'رودمپ با موفقیت تکمیل شد! منتظر صدور کارت عضویت باشید.'}
            </p>
          )}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────────────────
          Tab 1: Admission Roadmap Stepper
          ───────────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'roadmap' && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-black text-ink-darker dark:text-white">
                مراحل و چک‌لیست ورود به باشگاه
              </h3>
              <p className="text-xs text-gray-500">
                هر مرحله وزن مشخصی در پروگرس‌بار عضویت شما دارد.
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-gray-500">
              {roadmap.filter((r) => r.progress?.status === 'APPROVED').length} از {roadmap.length} مرحله
            </span>
          </div>

          <div className="space-y-3">
            {roadmap.map((m, idx) => {
              const isApproved = m.progress?.status === 'APPROVED';
              const isPending = m.progress?.status === 'PENDING';

              return (
                <Card
                  key={m.id}
                  className={`rounded-2xl border transition-all ${
                    isApproved
                      ? 'border-emerald-500/40 bg-emerald-50/50 dark:bg-emerald-950/15 shadow-2xs'
                      : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-[#151C28]'
                  }`}
                >
                  <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-3.5">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                          isApproved
                            ? 'bg-emerald-500 text-white shadow-xs'
                            : 'bg-gray-100 dark:bg-slate-800 text-gray-400'
                        }`}
                      >
                        {isApproved ? (
                          <Check className="w-5 h-5 stroke-[3]" />
                        ) : (
                          <span className="font-mono font-black text-sm">{idx + 1}</span>
                        )}
                      </div>

                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="font-black text-sm text-ink-darker dark:text-white">
                            {m.title}
                          </h4>
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-gray-600 dark:text-gray-400 text-[10px] font-bold">
                            وزن: {m.weight}٪
                          </span>
                          {m.type === 'TEACHER_APPROVAL' && (
                            <span className="px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold">
                              نیازمند تأییدیه مربی
                            </span>
                          )}
                          {m.type === 'PLACEMENT_CHALLENGE' && (
                            <span className="px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 text-[10px] font-bold">
                              چالش عملی
                            </span>
                          )}
                        </div>

                        {m.description && (
                          <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                            {m.description}
                          </p>
                        )}

                        {/* Approval note */}
                        {isApproved && m.progress?.notes && (
                          <div className="mt-2 text-[11px] text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 p-2 rounded-xl border border-emerald-500/20">
                            <strong>بازخورد:</strong> {m.progress.notes}
                            {m.progress.approvedBy && (
                              <span className="opacity-80 block text-[10px] mt-0.5">
                                تایید شده توسط {m.progress.approvedBy.firstName} {m.progress.approvedBy.lastName}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action on this milestone */}
                    <div className="self-end sm:self-center shrink-0">
                      {isApproved ? (
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>تکمیل شد</span>
                        </div>
                      ) : m.type === 'PLACEMENT_CHALLENGE' ? (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => setActiveTab('challenges')}
                          className="text-xs font-bold"
                        >
                          مشاهده چالش‌ها
                        </Button>
                      ) : (
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-gray-100 dark:bg-slate-800 text-gray-500 text-xs font-bold">
                          <CircleDashed className="w-4 h-4 animate-spin text-gray-400" />
                          <span>در انتظار ارزیابی</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────────
          Tab 2: Challenges Catalog
          ───────────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'challenges' && (
        <div className="space-y-6">
          {/* Header & Submissions Status Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-white dark:bg-[#151C28] border border-gray-200 dark:border-gray-800 shadow-2xs">
            <div className="space-y-1">
              <h3 className="text-sm font-black text-ink-darker dark:text-white flex items-center gap-2">
                <Target className="w-4 h-4 text-primary" />
                <span>بانک چالش‌های ورود و ارتقای گرید</span>
              </h3>
              <p className="text-xs text-gray-500">
                هر دانش‌آموز مجاز است همزمان حداکثر روی ۲ چالش فعال تمرکز کند.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-gray-600 dark:text-gray-300">
                چالش‌های فعال شما:
              </span>
              <span
                className={`px-3 py-1 rounded-xl text-xs font-mono font-black border ${
                  activeChallengesCount >= 2
                    ? 'bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
                    : 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                }`}
              >
                {activeChallengesCount} از ۲ چالش مجاز
              </span>
            </div>
          </div>

          {/* Department Filter Pills */}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setSelectedDeptFilter('ALL')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                selectedDeptFilter === 'ALL'
                  ? 'bg-[#8A38F5] text-white border-[#8A38F5] shadow-xs font-black'
                  : 'bg-white dark:bg-[#151C28] text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-800 hover:border-[#8A38F5]'
              }`}
            >
              همه دپارتمان‌ها
            </button>
            <button
              type="button"
              onClick={() => setSelectedDeptFilter('ENGINEER')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 ${
                selectedDeptFilter === 'ENGINEER'
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                  : 'bg-white dark:bg-[#151C28] text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-800 hover:border-indigo-500'
              }`}
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>مهندسا</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedDeptFilter('ARTIST')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 ${
                selectedDeptFilter === 'ARTIST'
                  ? 'bg-pink-600 text-white border-pink-600 shadow-xs'
                  : 'bg-white dark:bg-[#151C28] text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-800 hover:border-pink-500'
              }`}
            >
              <Palette className="w-3.5 h-3.5" />
              <span>آرتیستا</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedDeptFilter('JACK_OF_ALL_TRADES')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 ${
                selectedDeptFilter === 'JACK_OF_ALL_TRADES'
                  ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                  : 'bg-white dark:bg-[#151C28] text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-800 hover:border-amber-500'
              }`}
            >
              <Wrench className="w-3.5 h-3.5" />
              <span>آچار فرانسه‌ها</span>
            </button>
          </div>

          {/* Challenges Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredChallenges.map((ch) => {
              const chDept = getDeptConfig(ch.department);
              const ChDeptIcon = chDept.icon;
              const hasEnrolled = ch.isEnrolled;
              const hasGraded = ch.isGraded;

              return (
                <Card
                  key={ch.id}
                  className="rounded-3xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#151C28] shadow-sm hover:shadow-md transition-all flex flex-col justify-between overflow-hidden"
                >
                  <CardContent className="p-5 space-y-4">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${chDept.bg}`}>
                        <ChDeptIcon className="w-3.5 h-3.5" />
                        <span>{chDept.title}</span>
                      </span>

                      {ch.type === 'PLACEMENT' ? (
                        <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
                          چالش ورودی
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-[#8A38F5] dark:text-[#C084FC] bg-[#8A38F5]/10 px-2 py-0.5 rounded-md border border-[#8A38F5]/30">
                          ارتقای گرید
                        </span>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <h4 className="font-black text-sm text-ink-darker dark:text-white line-clamp-1">
                        {ch.title}
                      </h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed">
                        {ch.description}
                      </p>
                    </div>

                    <div className="flex items-center gap-4 text-xs font-mono text-gray-500 pt-1 border-t border-gray-100 dark:border-gray-800">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-gray-400" />
                        <span>{ch.maxDays} روز مهلت</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Trophy className="w-3.5 h-3.5 text-amber-500" />
                        <span>{ch.maxScore} نمره</span>
                      </div>
                    </div>
                  </CardContent>

                  <div className="p-4 pt-0">
                    <Button
                      variant={hasEnrolled ? 'primary' : 'outline'}
                      onClick={() => navigate(`/app/club/challenges/${ch.id}`)}
                      className={`w-full text-xs font-bold flex items-center justify-center gap-1.5 ${
                        hasEnrolled
                          ? 'bg-[#8A38F5] hover:bg-[#7828E0] text-white shadow-[2px_2px_0_#5B21B6]'
                          : 'border-[#8A38F5]/40 text-[#8A38F5] hover:bg-[#8A38F5]/10'
                      }`}
                    >
                      {hasGraded ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                          <span>مشاهده کارنامه و نمره</span>
                        </>
                      ) : hasEnrolled ? (
                        <>
                          <Send className="w-4 h-4" />
                          <span>ادامه و ارسال پروژه</span>
                        </>
                      ) : (
                        <>
                          <span>مشاهده و شروع چالش</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </>
                      )}
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────────
          Tab 3: Rokad Studio Showcase
          ───────────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'studio' && (
        <div className="space-y-6">
          <div className="relative overflow-hidden rounded-3xl p-6 sm:p-8 bg-gradient-to-br from-[#1E1B4B] via-[#312E81] to-[#0F172A] text-white border-2 border-indigo-500/30 shadow-xl">
            <div className="relative z-10 space-y-3">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 text-xs font-bold">
                <Rocket className="w-3.5 h-3.5" />
                <span>استارتاپ استودیو رُکاد (Startup Studio)</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black">
                جایی که ایده‌ها تبدیل به محصولات واقعی می‌شوند
              </h2>
              <p className="text-xs sm:text-sm text-indigo-200 leading-relaxed max-w-2xl">
                دانش‌آموزانی که در باشگاه به **گرید A** دست یابند، پس از تأیید نهایی راهبر، مستقیماً وارد تیم‌های تولید محصول و پروژه‌های تجاری استودیو می‌شوند و رزومه کاری حرفه‌ای می‌سازند.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 rounded-3xl bg-white dark:bg-[#151C28] border border-gray-200 dark:border-gray-800 space-y-3 shadow-2xs">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 flex items-center justify-center">
                <Code2 className="w-6 h-6" />
              </div>
              <h4 className="font-black text-sm text-gray-900 dark:text-white">
                تیم توسعه پلتفرم و زیرساخت
              </h4>
              <p className="text-xs text-gray-500 leading-relaxed">
                مشارکت در توسعه ماژول‌های بک‌اند، پایگاه داده و سیستم‌های بلادرنگ با راهنمایی مهندسان ارشد استودیو.
              </p>
            </div>

            <div className="p-5 rounded-3xl bg-white dark:bg-[#151C28] border border-gray-200 dark:border-gray-800 space-y-3 shadow-2xs">
              <div className="w-12 h-12 rounded-2xl bg-pink-50 dark:bg-pink-950/40 text-pink-600 flex items-center justify-center">
                <Palette className="w-6 h-6" />
              </div>
              <h4 className="font-black text-sm text-gray-900 dark:text-white">
                لَب طراحی تجربه و رابط کاربری
              </h4>
              <p className="text-xs text-gray-500 leading-relaxed">
                طراحی محصول در مقیاس صنعتی، پرسوناشناسی، ساخت سیستم‌های طراحی و تست کاربردپذیری با کاربران واقعی.
              </p>
            </div>

            <div className="p-5 rounded-3xl bg-white dark:bg-[#151C28] border border-gray-200 dark:border-gray-800 space-y-3 shadow-2xs">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 flex items-center justify-center">
                <Wrench className="w-6 h-6" />
              </div>
              <h4 className="font-black text-sm text-gray-900 dark:text-white">
                تیم رشد و مدیریت محصول
              </h4>
              <p className="text-xs text-gray-500 leading-relaxed">
                تحلیل داده‌های رفتاری کاربران، استراتژی لانچ و هک رشد در کنار منتورهای بیزینس و مدیران محصول.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────────
          Tab 4: Rotello Platform Gateway
          ───────────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'rotello' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="relative overflow-hidden rounded-3xl p-6 sm:p-10 bg-gradient-to-br from-[#1C1427] via-[#2D1B4E] to-[#120B1C] text-white border-2 border-[#8A38F5]/40 shadow-2xl">
            <div className="absolute top-0 right-0 w-96 h-96 bg-[#8A38F5]/25 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
            <div className="relative z-10 space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#8A38F5]/25 text-[#C084FC] border border-[#8A38F5]/40 text-xs font-bold">
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>پلتفرم تخصصی همکاری اعضای باشگاه رُکاد</span>
                </div>
                {isMember ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold">
                    <ShieldCheck className="w-4 h-4" />
                    <span>عضویت رسمی باشگاه فعال است</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold">
                    <span>در حال طی نقشه راه پذیرش</span>
                  </span>
                )}
              </div>

              <div className="space-y-3">
                <h2 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight">
                  سامانه مدیریت تسک‌ها و تیم‌های روتلو
                </h2>
                <p className="text-sm sm:text-base text-purple-100/90 leading-relaxed max-w-2xl font-normal">
                  روتلو، فضای کار اشتراکی دانش‌آموزان و اعضای باشگاه کسب‌وکار رُکاد است؛ جایی برای مدیریت تسک‌های اسپرینت، اشتراک کارهای تیمی، پورتفولیو و تعامل نزدیک با منتورهای صنعتی.
                </p>
              </div>

              {/* Direct Entry Button */}
              <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                <a
                  href="https://rotello.vercel.app/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-2xl bg-[#8A38F5] hover:bg-[#7828E0] text-white font-black text-sm shadow-[3px_3px_0_#5B21B6] hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer text-center group"
                >
                  <Rocket className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                  <span>ورود مستقیم به سامانه روتلو</span>
                  <ExternalLink className="w-4 h-4 opacity-80" />
                </a>

                <div className="text-xs text-purple-200/80 font-mono text-center sm:text-right">
                  آدرس سامانه: rotello.vercel.app
                </div>
              </div>
            </div>
          </div>

          {/* Rotello Feature Highlights */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 rounded-3xl bg-white dark:bg-[#151C28] border border-gray-200 dark:border-gray-800 space-y-3 shadow-2xs hover:border-[#8A38F5]/50 transition-colors">
              <div className="w-12 h-12 rounded-2xl bg-[#8A38F5]/10 text-[#8A38F5] flex items-center justify-center">
                <Target className="w-6 h-6" />
              </div>
              <h4 className="font-black text-sm text-gray-900 dark:text-white">
                مدیریت تسک‌ها و اسپرینت‌ها
              </h4>
              <p className="text-xs text-gray-500 leading-relaxed">
                بورد کانبان و برنامه‌ریزی هفتگی پروژه‌ها جهت تحویل به موقع چالش‌ها و مایلسون‌های باشگاه.
              </p>
            </div>

            <div className="p-5 rounded-3xl bg-white dark:bg-[#151C28] border border-gray-200 dark:border-gray-800 space-y-3 shadow-2xs hover:border-[#8A38F5]/50 transition-colors">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center">
                <Users className="w-6 h-6" />
              </div>
              <h4 className="font-black text-sm text-gray-900 dark:text-white">
                تیم‌سازی و اشتراک تجارب
              </h4>
              <p className="text-xs text-gray-500 leading-relaxed">
                همکاری بین دپارتمان‌های مهندسی، طراحی و مدیریت محصول برای ساخت پروژه‌های میان‌رشته‌ای.
              </p>
            </div>

            <div className="p-5 rounded-3xl bg-white dark:bg-[#151C28] border border-gray-200 dark:border-gray-800 space-y-3 shadow-2xs hover:border-[#8A38F5]/50 transition-colors">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 flex items-center justify-center">
                <Trophy className="w-6 h-6" />
              </div>
              <h4 className="font-black text-sm text-gray-900 dark:text-white">
                ساخت پورتفولیو و رزومه
              </h4>
              <p className="text-xs text-gray-500 leading-relaxed">
                مستندسازی خروجی‌های واقعی چالش‌ها و اخذ تأییدیه فنی برای ارتقا به گرید A و استودیو.
              </p>
            </div>
          </div>
        </div>
      )}
      </div>
    </UnderDevelopmentOverlay>
  );
};
