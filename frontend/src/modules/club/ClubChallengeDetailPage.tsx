import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  clubApi,
  ClubChallenge,
  ClubChallengeSubmission,
  ClubDepartment,
} from '../../lib/api/club';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import {
  Trophy,
  ChevronRight,
  Code2,
  Palette,
  Wrench,
  Clock,
  Calendar,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Github,
  Send,
  Sparkles,
  Award,
  Layers,
  FileText,
  ShieldAlert,
} from 'lucide-react';
import { toast } from 'sonner';
import { UnderDevelopmentOverlay } from '../../components/ui/UnderDevelopmentOverlay';

export const ClubChallengeDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [challenge, setChallenge] = useState<ClubChallenge | null>(null);
  const [submission, setSubmission] = useState<ClubChallengeSubmission | null>(null);
  const [activeChallengesCount, setActiveChallengesCount] = useState(0);
  const [canStart, setCanStart] = useState(false);

  // Submission Form State
  const [submitting, setSubmitting] = useState(false);
  const [repoUrl, setRepoUrl] = useState('');
  const [figmaUrl, setFigmaUrl] = useState('');
  const [demoUrl, setDemoUrl] = useState('');
  const [notes, setNotes] = useState('');

  const fetchChallenge = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const data = await clubApi.getChallengeById(id);
      setChallenge(data.challenge);
      setSubmission(data.latestSubmission);
      setActiveChallengesCount(data.activeChallengesCount);
      setCanStart(data.canStart);

      if (data.latestSubmission) {
        setRepoUrl(data.latestSubmission.repositoryUrl || '');
        setFigmaUrl(data.latestSubmission.figmaUrl || '');
        setDemoUrl(data.latestSubmission.demoUrl || '');
        setNotes(data.latestSubmission.submissionNotes || '');
      }
    } catch (err: any) {
      toast.error('خطا در دریافت اطلاعات چالش');
      navigate('/app/club');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChallenge();
  }, [id]);

  const handleStartChallenge = async () => {
    if (!id) return;
    try {
      setSubmitting(true);
      await clubApi.startChallenge(id);
      toast.success('چالش با موفقیت برای شما آغاز شد! به امید موفقیت.');
      await fetchChallenge();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'شروع چالش امکان‌پذیر نیست';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    if (!repoUrl.trim() && !figmaUrl.trim() && !demoUrl.trim() && !notes.trim()) {
      toast.error('لطفاً حداقل یک لینک پروژه (گیت‌هاب/فیگما/دمو) یا توضیحات پروژه را وارد کنید.');
      return;
    }

    try {
      setSubmitting(true);
      await clubApi.submitChallenge(id, {
        repositoryUrl: repoUrl.trim() || undefined,
        figmaUrl: figmaUrl.trim() || undefined,
        demoUrl: demoUrl.trim() || undefined,
        submissionNotes: notes.trim() || undefined,
      });
      toast.success('پروژه شما با موفقیت ارسال شد و در نوبت داوری قرار گرفت!');
      await fetchChallenge();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'خطا در ارسال پروژه';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !challenge) {
    return (
      <div className="max-w-4xl mx-auto py-12 text-center space-y-3">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm font-bold text-gray-500">در حال بارگذاری جزئیات چالش...</p>
      </div>
    );
  }

  const getDeptInfo = (dept: ClubDepartment) => {
    switch (dept) {
      case 'ENGINEER':
        return {
          title: 'دپارتمان مهندسا',
          icon: Code2,
          color: 'text-indigo-600 dark:text-indigo-400',
          badgeBg: 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
          gradient: 'from-indigo-600 to-blue-700',
        };
      case 'ARTIST':
        return {
          title: 'دپارتمان آرتیستا',
          icon: Palette,
          color: 'text-pink-600 dark:text-pink-400',
          badgeBg: 'bg-pink-50 dark:bg-pink-950/40 text-pink-700 dark:text-pink-300 border-pink-200 dark:border-pink-800',
          gradient: 'from-pink-600 to-rose-700',
        };
      case 'JACK_OF_ALL_TRADES':
      default:
        return {
          title: 'دپارتمان آچار فرانسه‌ها',
          icon: Wrench,
          color: 'text-amber-600 dark:text-amber-400',
          badgeBg: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
          gradient: 'from-amber-500 to-orange-600',
        };
    }
  };

  const deptInfo = getDeptInfo(challenge.department);
  const DeptIcon = deptInfo.icon;

  const isEnrolled = submission?.status === 'IN_PROGRESS';
  const isSubmitted = submission?.status === 'SUBMITTED';
  const isGraded = submission?.status === 'GRADED';

  return (
    <UnderDevelopmentOverlay
      title="چالش باشگاه کسب‌وکار رُکاد"
      subtitle={challenge.title}
      description="این چالش و سیستم ارسال پروژه در حال آماده‌سازی و بازطراحی است و به زودی فعال خواهد شد."
      badgeText="چالش باشگاه • در حال توسعه"
      icon={Trophy}
      accentColor="purple"
    >
      <div className="max-w-4xl mx-auto space-y-6 pb-16 animate-in fade-in duration-300" data-theme="club">
      {/* Top Breadcrumb & Navigation */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate('/app/club')}
          className="p-2.5 rounded-xl bg-white dark:bg-[#151C28] border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 hover:text-[#8A38F5] transition-all active:scale-95 shadow-2xs flex items-center gap-1 text-xs font-bold"
        >
          <ChevronRight className="w-4 h-4" />
          <span>بازگشت به باشگاه</span>
        </button>
        <span className="text-xs text-gray-400 dark:text-gray-600">/</span>
        <span className="text-xs font-bold text-gray-500 truncate max-w-[200px] sm:max-w-xs">
          {challenge.title}
        </span>
      </div>

      {/* Challenge Hero Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#1E293B] to-[#0F172A] text-white p-6 sm:p-8 shadow-xl border border-slate-700/50">
        <div className="absolute top-0 left-0 w-80 h-80 bg-[#8A38F5]/20 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${deptInfo.badgeBg}`}>
              <DeptIcon className="w-3.5 h-3.5" />
              <span>{deptInfo.title}</span>
            </span>

            {challenge.type === 'PLACEMENT' ? (
              <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold">
                 چالش ورودی تعیین سطح
              </span>
            ) : (
              <span className="px-3 py-1 rounded-full bg-[#8A38F5]/20 text-[#C084FC] border border-[#8A38F5]/30 text-xs font-bold">
                 چالش ارتقای گرید
              </span>
            )}

            <span className="px-3 py-1 rounded-full bg-slate-800/80 text-slate-300 text-xs font-mono font-bold border border-slate-700">
              بارم: {challenge.maxScore} نمره
            </span>
          </div>

          <h1 className="text-xl sm:text-2xl md:text-3xl font-black leading-tight">
            {challenge.title}
          </h1>

          <p className="text-sm text-slate-300 leading-relaxed max-w-2xl">
            {challenge.description}
          </p>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
            <div className="p-3 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-3">
              <Clock className="w-5 h-5 text-[#8A38F5] shrink-0" />
              <div>
                <span className="text-[10px] text-slate-400 block font-bold">مهلت تحویل</span>
                <span className="text-xs font-black">{challenge.maxDays} روز کاری</span>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-3">
              <Award className="w-5 h-5 text-amber-400 shrink-0" />
              <div>
                <span className="text-[10px] text-slate-400 block font-bold">معیار گریدها</span>
                <span className="text-xs font-black">A: بالای ۸۰ | B: ۵۰-۸۰ | C: زیر ۵۰</span>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-3 col-span-2 sm:col-span-1">
              <Sparkles className="w-5 h-5 text-indigo-400 shrink-0" />
              <div>
                <span className="text-[10px] text-slate-400 block font-bold">چالش‌های فعال شما</span>
                <span className="text-xs font-black font-mono">{activeChallengesCount} از ۲ چالش مجاز</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Mission Brief & Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Mission Content & Rules */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="rounded-3xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden bg-white dark:bg-[#151C28]">
            <CardContent className="p-6 space-y-5">
              <div className="flex items-center gap-2 pb-3 border-b border-gray-100 dark:border-gray-800">
                <FileText className="w-5 h-5 text-[#8A38F5]" />
                <h2 className="font-black text-base text-ink-darker dark:text-white">
                  شرح کامل مأموریت و صورت‌مسئله
                </h2>
              </div>

              <div className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line font-normal">
                {challenge.missionBrief}
              </div>

              {challenge.rules && (
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 text-xs space-y-1.5">
                  <div className="font-bold flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4" />
                    <span>قوانین و الزامات پذیرش پروژه:</span>
                  </div>
                  <p className="leading-relaxed whitespace-pre-line pr-5">
                    {challenge.rules}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Graded Feedback Card if already graded */}
          {isGraded && (
            <Card className="rounded-3xl border-2 border-emerald-500/40 bg-emerald-500/5 dark:bg-emerald-950/20 shadow-md">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-emerald-500/20">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                    <div>
                      <h3 className="font-black text-base text-emerald-800 dark:text-emerald-300">
                        پروژه شما داوری و نمره‌گذاری شد!
                      </h3>
                      <span className="text-xs text-emerald-600 dark:text-emerald-400">
                        ثبت شده در کارنامه و پروفایل باشگاهی شما
                      </span>
                    </div>
                  </div>
                  <div className="text-left font-mono">
                    <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                      {submission?.score}
                    </span>
                    <span className="text-xs text-gray-500"> / {challenge.maxScore}</span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <div className="p-3 rounded-2xl bg-white dark:bg-[#1E293B] border border-emerald-200 dark:border-emerald-800 flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-amber-500" />
                    <span className="text-xs font-bold text-gray-600 dark:text-gray-300">گرید کسب‌شده:</span>
                    <span className="text-sm font-black text-[#8A38F5]">گرید {submission?.awardedGrade}</span>
                  </div>
                  {submission?.awardedGrade === 'A' && (
                    <span className="px-3 py-1.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold shadow-xs flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>تبریک! مجوز ورود به رکاد استودیو صادر شد.</span>
                    </span>
                  )}
                </div>

                {submission?.feedback && (
                  <div className="p-4 rounded-2xl bg-white dark:bg-[#1E293B] border border-gray-200 dark:border-gray-800 text-xs space-y-1">
                    <span className="font-bold text-gray-500 block">یادداشت و فیدبک داور باشگاه:</span>
                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                      {submission.feedback}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column (1 Col): Action Box / Submission Form */}
        <div className="space-y-6">
          <Card className="rounded-3xl border border-gray-200 dark:border-gray-800 shadow-md bg-white dark:bg-[#151C28] overflow-hidden sticky top-24">
            <CardContent className="p-6 space-y-5">
              <h3 className="font-black text-base text-ink-darker dark:text-white pb-2 border-b border-gray-100 dark:border-gray-800">
                وضعیت و عملیات چالش
              </h3>

              {!isEnrolled && !isSubmitted && !isGraded ? (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500 font-bold">ظرفیت چالش‌های همزمان:</span>
                      <span className="font-mono font-bold text-gray-800 dark:text-gray-200">
                        {activeChallengesCount} از ۲
                      </span>
                    </div>
                    {activeChallengesCount >= 2 ? (
                      <p className="text-rose-600 dark:text-rose-400 font-bold text-[11px] leading-relaxed">
                         سقف ۲ چالش فعال همزمان تکمیل است. برای شروع این چالش، ابتدا یکی از چالش‌های جاری را تحویل دهید.
                      </p>
                    ) : (
                      <p className="text-gray-500 text-[11px]">
                        با کلیک روی شروع چالش، تایمر {challenge.maxDays} روزه برای شما آغاز خواهد شد.
                      </p>
                    )}
                  </div>

                  <Button
                    type="button"
                    variant="primary"
                    disabled={!canStart || submitting}
                    isLoading={submitting}
                    onClick={handleStartChallenge}
                    className="w-full h-12 text-sm font-black bg-[#8A38F5] hover:bg-[#7828E0] text-white shadow-[2px_2px_0_#5B21B6] transition-all"
                  >
                    شروع رسمی این چالش
                  </Button>
                </div>
              ) : isEnrolled ? (
                <form onSubmit={handleSubmitProject} className="space-y-4">
                  <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2">
                    <Clock className="w-4 h-4 shrink-0 text-amber-500" />
                    <span>چالش در جریان است. لطفاً مستندات پروژه خود را بارگذاری و ثبت نمایید:</span>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-700 dark:text-gray-300 block">
                      آدرس مخزن کد (GitHub / GitLab):
                    </label>
                    <input
                      type="url"
                      dir="ltr"
                      placeholder="https://github.com/username/project"
                      value={repoUrl}
                      onChange={(e) => setRepoUrl(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-slate-900 text-xs font-mono focus:border-[#8A38F5] focus:outline-none transition-colors"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-700 dark:text-gray-300 block">
                      لینک پروژه فیگما (Figma URL):
                    </label>
                    <input
                      type="url"
                      dir="ltr"
                      placeholder="https://figma.com/file/..."
                      value={figmaUrl}
                      onChange={(e) => setFigmaUrl(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-slate-900 text-xs font-mono focus:border-[#8A38F5] focus:outline-none transition-colors"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-700 dark:text-gray-300 block">
                      لینک نسخه دمو یا فایل آنلاین:
                    </label>
                    <input
                      type="url"
                      dir="ltr"
                      placeholder="https://my-demo-app.ir"
                      value={demoUrl}
                      onChange={(e) => setDemoUrl(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-slate-900 text-xs font-mono focus:border-[#8A38F5] focus:outline-none transition-colors"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-700 dark:text-gray-300 block">
                      توضیحات و گزارش فنی پروژه:
                    </label>
                    <textarea
                      rows={4}
                      placeholder="توضیح دهید چه کارهایی انجام دادید، چه چالش‌هایی داشتید و نوآوری شما چیست..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-slate-900 text-xs focus:border-[#8A38F5] focus:outline-none transition-colors"
                    />
                  </div>

                  <Button
                    type="submit"
                    variant="primary"
                    disabled={submitting}
                    isLoading={submitting}
                    className="w-full h-11 text-xs font-black bg-[#8A38F5] hover:bg-[#7828E0] text-white shadow-[2px_2px_0_#5B21B6] flex items-center justify-center gap-1.5 transition-all"
                  >
                    <Send className="w-4 h-4" />
                    <span>ارسال نهایی پاسخ چالش</span>
                  </Button>
                </form>
              ) : isSubmitted ? (
                <div className="text-center py-6 space-y-4">
                  <div className="w-14 h-14 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-black text-sm text-gray-900 dark:text-white">
                      پروژه شما با موفقیت ارسال شده است
                    </h4>
                    <p className="text-xs text-gray-500 leading-relaxed">
                      داوران و راهبران باشگاه در حال بررسی کدها و پروژه شما هستند. به محض ثبت نمره، نتیجه در اینجا و نوتیفیکیشن‌ها اعلام می‌شود.
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-gray-800 text-right text-xs space-y-1">
                    <span className="font-bold text-gray-500 text-[11px] block">لینک‌های ارسالی شما:</span>
                    {submission?.repositoryUrl && (
                      <a
                        href={submission.repositoryUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary hover:underline flex items-center gap-1 font-mono text-[11px]"
                      >
                        <Github className="w-3.5 h-3.5" />
                        <span className="truncate">{submission.repositoryUrl}</span>
                      </a>
                    )}
                    {submission?.figmaUrl && (
                      <a
                        href={submission.figmaUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-pink-600 hover:underline flex items-center gap-1 font-mono text-[11px]"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span className="truncate">{submission.figmaUrl}</span>
                      </a>
                    )}
                    {submission?.demoUrl && (
                      <a
                        href={submission.demoUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-600 hover:underline flex items-center gap-1 font-mono text-[11px]"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span className="truncate">{submission.demoUrl}</span>
                      </a>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-4 space-y-2">
                  <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
                    <Trophy className="w-6 h-6" />
                  </div>
                  <h4 className="font-black text-xs text-gray-900 dark:text-white">
                    چالش به اتمام رسیده است
                  </h4>
                  <span className="text-[11px] text-gray-500">
                    نمره و گرید این چالش در پروفایل شما درج گردید.
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      </div>
    </UnderDevelopmentOverlay>
  );
};
