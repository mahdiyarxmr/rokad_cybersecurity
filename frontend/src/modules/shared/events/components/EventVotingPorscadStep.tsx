import React, { useState, useEffect } from 'react';
import { Button } from '../../../../components/ui/Button';
import { Modal } from '../../../../components/ui/Modal';
import { toast } from '../../../../components/ui/toast/toast';
import { EventIdea } from './EventIdeaSubmissionStep';
import { toPersianDigits } from '../../../../utils/jalali';
import { porscadClient, PorscadPollData, PorscadQuestionSettings } from '../../../../lib/porscad/porscad-client';
import { getInitialPollForEvent } from '../constants/initial-ideas';
import { useAuthStore } from '../../../../lib/auth/auth-store';
import {
  Star,
  Award,
  Vote,
  Trophy,
  CheckCircle2,
  MessageSquare,
  BarChart3,
  Lightbulb,
  ArrowRight,
  ArrowLeft,
  Flame,
  Check,
  Crown,
  Lock,
  RotateCcw,
  Settings2,
  PlusCircle,
  Layers,
  Send,
  RefreshCw,
  Sliders,
  CheckSquare,
  Square,
  HelpCircle,
  Clock,
  Eye,
  EyeOff,
  Medal,
  ShieldCheck,
  X,
  Users,
} from 'lucide-react';

interface EventVotingPorscadStepProps {
  eventId: string;
  eventTitle: string;
  ideas: EventIdea[];
  selectedIdeaId?: string | null;
  isEventEnded?: boolean;
}

export const EventVotingPorscadStep: React.FC<EventVotingPorscadStepProps> = ({
  eventId,
  eventTitle,
  ideas,
  selectedIdeaId,
  isEventEnded = false,
}) => {
  const currentUser = useAuthStore((s) => s.user);
  const isManager = ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER', 'STAFF'].includes(currentUser?.role || '');
  const isParent = currentUser?.role === 'PARENT';
  const isStudent = currentUser?.role === 'STUDENT';
  const canVote = !isEventEnded && !isParent && (isStudent || isManager);

  const [porscadPoll, setPorscadPoll] = useState<PorscadPollData | null>(() => {
    const existing = porscadClient.getLocalPollData(eventId);
    if (existing) return existing;
    const initialPoll = getInitialPollForEvent(eventId, ideas) as unknown as PorscadPollData;
    porscadClient.saveLocalPollData(eventId, initialPoll);
    return initialPoll;
  });
  const [isRefreshingAnalytics, setIsRefreshingAnalytics] = useState(false);

  // Voting state with single submission per student
  const userVoteStorageKey = `rokad_porscad_voted_${eventId}_${currentUser?.id || currentUser?.phone || 'student'}`;
  const selectedOptionsKey = `rokad_porscad_selected_${eventId}_${currentUser?.id || currentUser?.phone || 'student'}`;

  const [hasVoted, setHasVoted] = useState<boolean>(() => {
    return localStorage.getItem(userVoteStorageKey) === 'true';
  });

  const [selectedOptionIds, setSelectedOptionIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(selectedOptionsKey);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [isSubmittingVote, setIsSubmittingVote] = useState(false);

  // Admin Custom Form Builder State
  const [isBuildingMode, setIsBuildingMode] = useState<boolean>(false);
  const [builderFormTitle, setBuilderFormTitle] = useState(
    `نظرسنجی ایده‌های رویداد: ${eventTitle}`
  );
  const [builderFormDescription, setBuilderFormDescription] = useState(
    `فرم رسمی داوری و رای‌گیری ایده‌های منتخب رویداد «${eventTitle}»`
  );
  const [builderQuestionTitle, setBuilderQuestionTitle] = useState(
    `کدام یک از ایده‌های زیر بیشترین ارزش نوآوری و کاربرد را در رویداد «${eventTitle}» دارد؟`
  );
  const [builderQuestionType, setBuilderQuestionType] = useState<PorscadQuestionSettings['questionType']>('choice');
  const [builderMaxSelections, setBuilderMaxSelections] = useState<number>(3);
  const [builderSelectedIdeaIds, setBuilderSelectedIdeaIds] = useState<string[]>(() => ideas.map((i) => i.id));
  const [isCreatingForm, setIsCreatingForm] = useState(false);

  // Star Rating state
  const [activeIdeaId, setActiveIdeaId] = useState<string>(
    selectedIdeaId || (ideas.length > 0 ? ideas[0].id : '')
  );
  const [hoveredStar, setHoveredStar] = useState<number>(0);
  const [selectedScore, setSelectedScore] = useState<number>(5);
  const [commentText, setCommentText] = useState('');
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);

  // Load poll on mount
  useEffect(() => {
    const loadPoll = async () => {
      let poll = porscadClient.getLocalPollData(eventId);
      if (!poll) {
        poll = getInitialPollForEvent(eventId, ideas) as unknown as PorscadPollData;
        porscadClient.saveLocalPollData(eventId, poll);
      } else {
        try {
          const live = await porscadClient.fetchLiveAnalytics(eventId);
          if (live) poll = live;
        } catch {
          // offline fallback
        }
      }
      setPorscadPoll(poll);
    };
    loadPoll();
  }, [eventId]);

  // Keep builder ideas up to date if ideas list changes
  useEffect(() => {
    if (ideas.length > 0 && builderSelectedIdeaIds.length === 0) {
      setBuilderSelectedIdeaIds(ideas.map((i) => i.id));
    }
  }, [ideas]);

  // Refresh Analytics from Porscad
  const handleRefreshAnalytics = async () => {
    setIsRefreshingAnalytics(true);
    try {
      const updated = await porscadClient.fetchLiveAnalytics(eventId);
      if (updated) {
        setPorscadPoll(updated);
        toast.success('آمار و پاسخ‌ها به صورت آنلاین از پرس‌کاد دریافت و به‌روزرسانی شد!');
      } else {
        toast.error('نظرسنجی یافت نشد یا امکان دریافت نتایج از پرس‌کاد وجود ندارد.');
      }
    } catch {
      toast.error('خطا در دریافت نتایج آنلاین از پرس‌کاد.');
    } finally {
      setIsRefreshingAnalytics(false);
    }
  };

  // Admin handles publishing or updating form on Porscad (edit existing — never create duplicate)
  const handleCreateAndPublishForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (builderSelectedIdeaIds.length === 0) {
      toast.error('لطفاً حداقل یک ایده را برای قرار گرفتن در فرم پرس‌کاد انتخاب کنید.');
      return;
    }

    const selectedIdeasObjects = ideas.filter((i) => builderSelectedIdeaIds.includes(i.id));

    setIsCreatingForm(true);
    try {
      const payload = {
        eventId,
        eventTitle,
        formTitle: builderFormTitle.trim(),
        formDescription: builderFormDescription.trim(),
        questionTitle: builderQuestionTitle.trim(),
        questionType: builderQuestionType,
        selectedIdeas: selectedIdeasObjects,
        maxSelections: builderMaxSelections,
      };

      let resultPoll: PorscadPollData;
      const isRemoteForm =
        porscadPoll?.syncStatus === 'PORSCAD_CLOUD_SYNCED' &&
        !!porscadPoll?.formId &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(porscadPoll.formId);

      if (isRemoteForm) {
        try {
          resultPoll = await porscadClient.updateExistingPorscadForm(payload);
          toast.success('فرم موجود با موفقیت ویرایش و روی پرس‌کاد اعمال شد!');
        } catch {
          resultPoll = await porscadClient.createCustomPorscadForm(payload);
          toast.success('فرم نظرسنجی رویداد با موفقیت در پرس‌کاد ایجاد و برای دانش‌آموزان فعال شد!');
        }
      } else {
        resultPoll = await porscadClient.createCustomPorscadForm(payload);
        toast.success('فرم نظرسنجی رویداد با موفقیت در پرس‌کاد ایجاد و برای دانش‌آموزان فعال شد!');
      }

      setPorscadPoll(resultPoll);
      setIsBuildingMode(false);
    } catch (err: any) {
      const errMsg = err?.message || 'خطا در اعمال فرم در پرس‌کاد';
      toast.error(errMsg);
    } finally {
      setIsCreatingForm(false);
    }
  };

  // Toggle selection of idea in builder
  const handleToggleBuilderIdea = (ideaId: string) => {
    setBuilderSelectedIdeaIds((prev) =>
      prev.includes(ideaId) ? prev.filter((id) => id !== ideaId) : [...prev, ideaId]
    );
  };

  // Select all or none in builder
  const handleSelectAllBuilderIdeas = () => {
    if (builderSelectedIdeaIds.length === ideas.length) {
      setBuilderSelectedIdeaIds([]);
    } else {
      setBuilderSelectedIdeaIds(ideas.map((i) => i.id));
    }
  };

  // Student Option Toggle for Voting (Selection only, does NOT auto-submit)
  const handleToggleOption = (optionId: string) => {
    if (isManager) {
      toast.info('حالت ناظر: امکان رأی‌دهی فقط برای دانش‌آموزان است.');
      return;
    }
    if (!porscadPoll || porscadPoll.isClosed || hasVoted) return;

    if (isParent || !canVote) {
      toast.info('حالت مشاهده‌گر اولیاء: ثبت رای صرفاً برای دانش‌آموزان و داوران فعال است.');
      return;
    }

    const maxAllowed = porscadPoll.settings?.maxSelections || 1;

    if (maxAllowed === 1) {
      setSelectedOptionIds([optionId]);
    } else {
      if (selectedOptionIds.includes(optionId)) {
        setSelectedOptionIds((prev) => prev.filter((id) => id !== optionId));
      } else {
        if (selectedOptionIds.length >= maxAllowed) {
          toast.error(`حداکثر می‌توانید ${toPersianDigits(maxAllowed)} گزینه را انتخاب کنید.`);
          return;
        }
        setSelectedOptionIds((prev) => [...prev, optionId]);
      }
    }
  };

  // Submit Votes to Porscad on Button Click (Single submission per student)
  const handleVoteSubmit = async () => {
    if (isParent || isManager || !canVote) {
      toast.error('ثبت رای فقط مختص دانش‌آموزان و هنرجویان است.');
      return;
    }
    if (!porscadPoll) return;
    if (porscadPoll.isClosed) {
      toast.error('نظرسنجی به پایان رسیده است.');
      return;
    }

    if (hasVoted) {
      toast.error('شما قبلاً رای خود را در این نظرسنجی ثبت کرده‌اید.');
      return;
    }

    if (selectedOptionIds.length === 0) {
      toast.error('لطفاً ابتدا حداقل یک ایده را برای رای‌دهی انتخاب کنید.');
      return;
    }

    setIsSubmittingVote(true);
    try {
      const voterName = currentUser
        ? `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() || 'دانش‌آموز'
        : 'دانش‌آموز';
      const res = await porscadClient.submitVote(eventId, selectedOptionIds, voterName);
      if (res.success) {
        if (res.updatedPoll) setPorscadPoll(res.updatedPoll);
        setHasVoted(true);
        localStorage.setItem(userVoteStorageKey, 'true');
        localStorage.setItem(selectedOptionsKey, JSON.stringify(selectedOptionIds));
        toast.success('رأی شما با موفقیت ثبت شد.');
      } else {
        toast.error(res.message || 'خطا در ثبت رای');
      }
    } finally {
      setIsSubmittingVote(false);
    }
  };

  // Vote Confirmation Modal State
  const [isVoteConfirmModalOpen, setIsVoteConfirmModalOpen] = useState(false);

  // Finish Poll Modal State & Top Winners Count
  const [isFinishModalOpen, setIsFinishModalOpen] = useState(false);
  const [finishTopWinnersCount, setFinishTopWinnersCount] = useState<number>(3);
  const [finishDisplayOrder, setFinishDisplayOrder] = useState<'RANK' | 'RANK_VOTES' | 'RANDOM' | 'IGNORE_RANK'>('RANK');
  const [finishShowVoteCounts, setFinishShowVoteCounts] = useState(false);

  // End Assessment & Choose Top N Winners
  const handleOpenFinishModal = () => {
    setIsFinishModalOpen(true);
  };

  const handleConfirmFinishAssessment = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingVote(true);
    try {
      const safeCount =
        Number.isFinite(finishTopWinnersCount) && finishTopWinnersCount > 0
          ? Math.floor(finishTopWinnersCount)
          : parseInt(String(finishTopWinnersCount), 10) || 1;

      const updated = await porscadClient.finishAssessmentAndDetermineWinner(
        eventId,
        safeCount,
        {
          showVoteCounts: finishShowVoteCounts,
          displayOrder: finishDisplayOrder,
          isResultsPublic: false,
        }
      );
      if (updated) {
        setPorscadPoll(updated);
        setIsFinishModalOpen(false);
        toast.success(
          `فرم نظرسنجی با موفقیت بسته شد و ${toPersianDigits(safeCount)} ایده برتر مشخص شدند.`
        );
      } else {
        toast.error('نظرسنجی یافت نشد.');
      }
    } catch (err: any) {
      toast.error(err?.message || 'خطا در بستن نظرسنجی');
    } finally {
      setIsSubmittingVote(false);
    }
  };

  // Admin checkbox: show vote counts/percentages to audience
  const handleToggleShowVoteCounts = () => {
    if (!porscadPoll) return;
    const next = !porscadPoll.showVoteCounts;
    const updated = porscadClient.setShowVoteCounts(eventId, next);
    if (updated) {
      setPorscadPoll(updated);
      toast.info(next ? 'نمایش تعداد و درصد رای برای مخاطب فعال شد.' : 'نمایش تعداد و درصد رای برای مخاطب غیرفعال شد.');
    }
  };

  // Toggle Results Visibility for Students
  const handleTogglePublishResults = () => {
    if (!porscadPoll) return;
    const nextPublic = !porscadPoll.isResultsPublic;
    const updated = porscadClient.setResultsPublic(eventId, nextPublic);
    if (updated) {
      setPorscadPoll(updated);
      if (nextPublic) {
        toast.success('نتایج و رتبه‌بندی ایده‌ها برای همه دانش‌آموزان منتشر شد.');
      } else {
        toast.info('نتایج از دید عمومی دانش‌آموزان مخفی شد.');
      }
    }
  };

  // Reopen Assessment
  const handleReopenAssessment = () => {
    const updated = porscadClient.reopenAssessment(eventId);
    if (updated) {
      setPorscadPoll(updated);
      toast.info('نظرسنجی مجدداً جهت رای‌گیری بازگشایی شد.');
    }
  };

  // Ranked options with display order applied (RANK / RANK_VOTES / RANDOM / IGNORE_RANK)
  const rankedOptions = React.useMemo(() => {
    if (!porscadPoll?.options) return [];
    const byVotes = [...porscadPoll.options].sort((a, b) => b.voteCount - a.voteCount);
    const order = porscadPoll.displayOrder || 'RANK';
    if (order === 'IGNORE_RANK') return [...porscadPoll.options];
    if (order === 'RANDOM') {
      const arr = [...byVotes];
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    }
    return byVotes;
  }, [porscadPoll?.options, porscadPoll?.displayOrder]);
  const topWinnersLimit = porscadPoll?.topWinnersCount || 3;
  const winningOptions = rankedOptions.slice(0, Math.min(topWinnersLimit, rankedOptions.length));
  const showVoteStats = isManager || !!porscadPoll?.showVoteCounts;

  const currentIdea = ideas.find((i) => i.id === activeIdeaId) || ideas[0];



  const maxSelections = porscadPoll?.settings?.maxSelections || 1;
  const isMultiSelect = maxSelections > 1;

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="rounded-2xl border-[1.5px] border-primary-dark/30 dark:border-gray-800 bg-white dark:bg-[#151C28] shadow-[2px_2px_0_#59BBAF] dark:shadow-[2px_2px_0_#0B0F17] p-5 sm:p-7 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg md:text-xl font-black text-ink-darker dark:text-white flex items-center gap-2">
              <Vote className="w-5 h-5 text-primary shrink-0" />
              <span>گام سوم: رأی‌گیری ایده‌ها</span>
            </h2>
            <p className="text-xs md:text-sm font-medium text-gray-500 dark:text-gray-400 mt-3">
              با شرکت در نظرسنجی و ثبت آراء، ایده‌های برتر رویداد را انتخاب کنید.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {isManager && porscadPoll?.isPublished && (
              <Button
                variant="outline"
                onClick={() => setIsBuildingMode(!isBuildingMode)}
                className="gap-2 text-xs font-bold rounded-xl"
              >
                <Sliders className="w-4 h-4 text-primary" />
                <span>{isBuildingMode ? 'مشاهده نظرسنجی فعال' : 'ویرایش فرم پرس‌کاد'}</span>
              </Button>
            )}
            {isManager && (
              <Button
                variant="outline"
                onClick={handleToggleShowVoteCounts}
                className={`gap-2 text-xs font-bold rounded-xl ${
                  porscadPoll?.showVoteCounts ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' : ''
                }`}
              >
                {porscadPoll?.showVoteCounts ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                <span>
                  {porscadPoll?.showVoteCounts
                    ? 'نمایش آرا برای مخاطب: روشن'
                    : 'نمایش آرا برای مخاطب: خاموش'}
                </span>
              </Button>
            )}
          </div>
        </div>

        {/* Action controls (Refresh Analytics / Finish Poll) — manager only */}
        {isManager && porscadPoll?.isPublished && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handleRefreshAnalytics}
              disabled={isRefreshingAnalytics}
              className="gap-2 text-xs font-bold rounded-xl"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-primary ${isRefreshingAnalytics ? 'animate-spin' : ''}`} />
              <span>بروزرسانی آنلاین آمار</span>
            </Button>

            {porscadPoll.isClosed ? (
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 text-xs font-bold shadow-2xs">
                  <Lock className="w-3.5 h-3.5" />
                  <span>فرم بسته شد</span>
                </span>
                {isManager && (
                  <button
                    onClick={handleReopenAssessment}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 text-ink-darker dark:text-gray-200 text-xs font-bold shadow-2xs transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>بازگشایی فرم</span>
                  </button>
                )}
              </div>
            ) : (
              isManager && (
                <Button
                  variant="primary"
                  onClick={handleOpenFinishModal}
                  className="gap-2 text-xs font-bold rounded-xl shadow-sm"
                >
                  <Trophy className="w-4 h-4" />
                  <span>اتمام نظرسنجی و انتخاب ایده‌های برتر</span>
                </Button>
              )
            )}
          </div>
        )}
      </div>

      {/* ================= WINNING IDEAS PODIUM ================= */}
      {porscadPoll?.isClosed &&
        winningOptions.length > 0 &&
        (isManager || porscadPoll.isResultsPublic !== false) && (
        <div className="space-y-6">
          {/* Status Announcement Banner */}
          <div className="p-4 sm:p-5 rounded-2xl border border-amber-300/80 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-950/40 text-amber-950 dark:text-amber-200 shadow-2xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-900/60 border border-amber-300 dark:border-amber-700 flex items-center justify-center text-amber-600 dark:text-amber-300 shadow-2xs">
                <Trophy className="w-5 h-5 fill-amber-400" />
              </div>
              <div>
                <p className="text-xs font-bold text-amber-800/90 dark:text-amber-300/90 mb-0.5">
                  رأی‌گیری به پایان رسید؛
                </p>
                <h4 className="text-sm md:text-base font-black text-amber-950 dark:text-amber-100">
                  تعداد {toPersianDigits(winningOptions.length)} ایده برگزیده مشخص شدند:
                </h4>
              </div>
            </div>

            {isManager && (
              <Button
                variant={porscadPoll.isResultsPublic ? 'outline' : 'primary'}
                onClick={handleTogglePublishResults}
                className="gap-2 text-xs font-bold rounded-xl"
              >
                {porscadPoll.isResultsPublic ? (
                  <>
                    <EyeOff className="w-4 h-4" />
                    <span>مخفی‌سازی از دانش‌آموزان</span>
                  </>
                ) : (
                  <>
                    <Eye className="w-4 h-4" />
                    <span>انتشار عمومی نتایج</span>
                  </>
                )}
              </Button>
            )}
          </div>

          {/* Top Winners Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {winningOptions.map((opt) => {
              const matchingIdea = ideas.find((i) => i.id === opt.ideaId || i.id === opt.id);
              const authorName = matchingIdea?.authorName || opt.authorName || '';

              return (
                <div
                  key={opt.id}
                  className="group relative flex flex-col justify-between rounded-2xl border-[1.5px] border-amber-400/80 dark:border-amber-600/70 bg-white dark:bg-[#151C28] hover:border-amber-400 shadow-[2px_2px_0_#f59e0b] dark:shadow-[2px_2px_0_#b45309] hover:shadow-[3px_3px_0_#f59e0b] dark:hover:shadow-[3px_3px_0_#f59e0b] p-5 transition-all duration-200 hover:-translate-y-0.5 space-y-4"
                >
                  <div className="space-y-3.5">
                    {/* Top Row: Badge & Stats */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl border font-bold text-xs bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700 shadow-2xs">
                        <Trophy className="w-3.5 h-3.5 text-amber-500 fill-amber-400 shrink-0" />
                        <span>ایده برگزیده رویداد</span>
                      </span>

                      {showVoteStats && (
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-gray-800 text-xs font-black text-ink-darker dark:text-white border border-gray-200/80 dark:border-gray-700">
                          <span>{toPersianDigits(opt.voteCount)} رای</span>
                          <span className="text-primary font-black">٪{toPersianDigits(opt.percentage || 0)}</span>
                        </div>
                      )}
                    </div>

                    {/* Idea Name (Right) and Author Name (Left) on the Same Line */}
                    <div className="flex items-center justify-between gap-3 pt-0.5">
                      <h4 className="text-base sm:text-lg font-black text-ink-darker dark:text-white leading-snug truncate group-hover:text-primary transition-colors">
                        {matchingIdea ? matchingIdea.title : opt.text}
                      </h4>

                      {authorName && (
                        <span className="shrink-0 text-xs font-bold text-gray-500 dark:text-gray-400 bg-gray-100/90 dark:bg-[#1C2536] px-2.5 py-1 rounded-lg border border-gray-200/70 dark:border-gray-700/70 truncate max-w-[170px]">
                          {authorName}
                        </span>
                      )}
                    </div>

                    {/* Description */}
                    {matchingIdea?.description && (
                      <p className="text-xs font-medium text-zinc-600 dark:text-zinc-400 line-clamp-3 leading-relaxed p-3 rounded-xl bg-gray-50/80 dark:bg-[#1C2536]/60 border border-gray-100 dark:border-gray-800/80">
                        {matchingIdea.description}
                      </p>
                    )}

                    {/* Progress Bar (Stats view) */}
                    {showVoteStats && (
                      <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-2 rounded-full overflow-hidden border border-zinc-200 dark:border-zinc-700">
                        <div
                          className="h-full rounded-full transition-all duration-700 bg-primary"
                          style={{ width: `${opt.percentage || 0}%` }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ================= PORSCAD VOTING & FORM BUILDER ================= */}
      {isBuildingMode && isManager ? (
        <div className="rounded-2xl border-[1.5px] border-primary-dark/30 dark:border-gray-800 bg-white dark:bg-[#151C28] shadow-[2px_2px_0_#59BBAF] dark:shadow-[2px_2px_0_#0B0F17] p-5 sm:p-7 space-y-6">
          <div className="border-b border-gray-100 dark:border-gray-800 pb-4">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl border border-primary/20 bg-primary/10 text-primary text-xs font-bold mb-2 shadow-2xs">
              <Sliders className="w-4 h-4" />
              <span>پنل مدیریت: طراحی دستی و انتشار فرم در پرس‌کاد</span>
            </div>
            <h3 className="text-lg md:text-xl font-black text-ink-darker dark:text-white">
              ویرایش فرم موجود و اعمال روی پرس‌کاد
            </h3>
            <p className="text-xs md:text-sm font-medium text-gray-500 dark:text-gray-400 mt-1">
              نوع سوال، تعداد انتخاب مجاز و ایده‌های منتخب را تعیین کنید. اگر فرم قبلاً ساخته شده باشد همان فرم ویرایش می‌شود.
            </p>
          </div>

          <form onSubmit={handleCreateAndPublishForm} className="space-y-6">
            <div className="p-3.5 rounded-xl border border-primary/25 bg-primary/5 dark:bg-primary/10 text-primary text-xs font-bold shadow-2xs">
              {porscadPoll?.formId
                ? 'فرم موجود ویرایش و دوباره روی پرس‌کاد اعمال می‌شود (فرم جدید ساخته نمی‌شود).'
                : 'پس از ثبت ایده‌ها، فرم را یک‌بار در پرس‌کاد منتشر کنید؛ در بازدیدهای بعدی فقط ویرایش می‌شود.'}
            </div>
            {/* Form Title & Description */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-ink-normal dark:text-gray-200 mb-1.5">
                  نام و عنوان کلی فرم در پرس‌کاد (Form Title):
                </label>
                <input
                  type="text"
                  value={builderFormTitle}
                  onChange={(e) => setBuilderFormTitle(e.target.value)}
                  required
                  className="w-full rounded-xl px-3.5 py-2.5 border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#151C28] text-ink-darker dark:text-white text-xs md:text-sm font-medium focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all shadow-2xs"
                  placeholder="مثال: نظرسنجی ایده‌های هکاتون"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-ink-normal dark:text-gray-200 mb-1.5">
                  توضیحات فرم در پرس‌کاد (Form Description):
                </label>
                <input
                  type="text"
                  value={builderFormDescription}
                  onChange={(e) => setBuilderFormDescription(e.target.value)}
                  className="w-full rounded-xl px-3.5 py-2.5 border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#151C28] text-ink-darker dark:text-white text-xs md:text-sm font-medium focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all shadow-2xs"
                  placeholder="مثال: فرم داوری و انتخاب بهترین طرح‌های نوآورانه"
                />
              </div>
            </div>

            {/* Question Title */}
            <div>
              <label className="block text-xs font-bold text-ink-normal dark:text-gray-200 mb-1.5">
                متن و عنوان سوال در پرس‌کاد (Question Title):
              </label>
              <input
                type="text"
                value={builderQuestionTitle}
                onChange={(e) => setBuilderQuestionTitle(e.target.value)}
                required
                className="w-full rounded-xl px-3.5 py-2.5 border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#151C28] text-ink-darker dark:text-white text-xs md:text-sm font-medium focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all shadow-2xs"
                placeholder="مثال: کدام ایده بیشترین نوآوری را دارد؟"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Question Type */}
              <div>
                <label className="block text-xs font-bold text-ink-normal dark:text-gray-200 mb-1.5">
                  نوع سوال پرس‌کاد (Question Type):
                </label>
                <select
                  value={builderQuestionType}
                  onChange={(e) => setBuilderQuestionType(e.target.value as any)}
                  className="w-full rounded-xl px-3.5 py-2.5 border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#151C28] text-ink-darker dark:text-white text-xs font-medium focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all shadow-2xs"
                >
                  <option className="bg-white dark:bg-[#151C28] text-ink-darker dark:text-white" value="choice">چندگزینه‌ای / دکمه‌ای (Choice)</option>
                  <option className="bg-white dark:bg-[#151C28] text-ink-darker dark:text-white" value="dropdown">منوی کشویی (Dropdown)</option>
                  <option className="bg-white dark:bg-[#151C28] text-ink-darker dark:text-white" value="rating">امتیازدهی ۵ ستاره‌ای (Rating)</option>
                  <option className="bg-white dark:bg-[#151C28] text-ink-darker dark:text-white" value="opinion_scale">طیف لیکرت و مقیاس نظری (Opinion Scale)</option>
                  <option className="bg-white dark:bg-[#151C28] text-ink-darker dark:text-white" value="yes_no">تایید / عدم تایید (Yes / No)</option>
                </select>
              </div>

              {/* Max Selections */}
              <div>
                <label className="block text-xs font-bold text-ink-normal dark:text-gray-200 mb-1.5">
                  حداکثر تعداد انتخاب مجاز هر کاربر (max_selections):
                </label>
                <select
                  value={builderMaxSelections}
                  onChange={(e) => setBuilderMaxSelections(Number(e.target.value))}
                  className="w-full rounded-xl px-3.5 py-2.5 border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#151C28] text-ink-darker dark:text-white text-xs font-medium focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all shadow-2xs"
                >
                  <option className="bg-white dark:bg-[#151C28] text-ink-darker dark:text-white" value={1}>۱ انتخاب (تک گزینه‌ای - هر کاربر فقط به یک ایده رای می‌دهد)</option>
                  <option className="bg-white dark:bg-[#151C28] text-ink-darker dark:text-white" value={2}>۲ انتخاب (امکان رای به ۲ ایده)</option>
                  <option className="bg-white dark:bg-[#151C28] text-ink-darker dark:text-white" value={3}>۳ انتخاب (امکان رای به ۳ ایده برتر)</option>
                  <option className="bg-white dark:bg-[#151C28] text-ink-darker dark:text-white" value={5}>۵ انتخاب (انتخاب تا ۵ ایده)</option>
                  <option className="bg-white dark:bg-[#151C28] text-ink-darker dark:text-white" value={ideas.length || 10}>نامحدود (تمام ایده‌های تیک خورده)</option>
                </select>
              </div>
            </div>

            {/* Ideas Selection Checkboxes */}
            <div className="rounded-2xl border border-gray-200/80 dark:border-gray-800 bg-gray-50/70 dark:bg-[#1C2536]/60 p-4 sm:p-5 shadow-2xs space-y-4">
              <div className="flex items-center justify-between gap-2 border-b border-gray-200 dark:border-gray-700 pb-3">
                <div className="flex items-center gap-2">
                  <CheckSquare className="w-4 h-4 text-primary" />
                  <h4 className="text-xs md:text-sm font-bold text-ink-darker dark:text-white">
                    انتخاب دستی ایده‌ها برای قرار گرفتن در فرم نظرسنجی ({toPersianDigits(builderSelectedIdeaIds.length)} از {toPersianDigits(ideas.length)} ایده انتخاب شده):
                  </h4>
                </div>

                <button
                  type="button"
                  onClick={handleSelectAllBuilderIdeas}
                  className="text-xs font-bold text-primary hover:underline cursor-pointer"
                >
                  {builderSelectedIdeaIds.length === ideas.length ? 'عدم انتخاب همه' : 'انتخاب همه ایده‌ها'}
                </button>
              </div>

              {ideas.length === 0 ? (
                <div className="p-6 text-center text-xs font-medium text-gray-500">
                  هنوز هیچ ایده‌ای در گام اول ثبت نشده است. ابتدا به دانش‌آموزان اجازه دهید ایده‌ها را ثبت کنند.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-72 overflow-y-auto pr-1">
                  {ideas.map((idea) => {
                    const isChecked = builderSelectedIdeaIds.includes(idea.id);
                    return (
                      <div
                        key={idea.id}
                        onClick={() => handleToggleBuilderIdea(idea.id)}
                        className={`cursor-pointer flex items-start gap-3 p-3.5 rounded-xl border transition-all select-none ${
                          isChecked
                            ? 'border-primary/40 bg-primary/10 dark:bg-primary/15 shadow-2xs ring-1 ring-primary/25'
                            : 'border-gray-200/80 dark:border-gray-700 bg-white dark:bg-[#151C28] hover:border-gray-300'
                        }`}
                      >
                        <div className="mt-0.5">
                          {isChecked ? (
                            <CheckSquare className="w-4 h-4 text-primary" />
                          ) : (
                            <Square className="w-4 h-4 text-gray-400" />
                          )}
                        </div>
                        <div className="overflow-hidden">
                          <h5 className="text-xs font-bold text-ink-darker dark:text-white line-clamp-1">
                            {idea.title}
                          </h5>
                          <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400 mt-0.5">
                            طراح / رئیس ایده: {idea.authorName} ({idea.authorRole})
                          </p>
                        </div>
                      </div>
                    );
                      })}
                    </div>
                  )}
                </div>

                {/* Submit & Publish Button */}
                <div className="flex items-center justify-end gap-3 pt-3">
                  {porscadPoll?.isPublished && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsBuildingMode(false)}
                      className="font-bold text-xs"
                    >
                      انصراف
                    </Button>
                  )}
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={isCreatingForm || builderSelectedIdeaIds.length === 0}
                    className="font-black text-xs gap-2 px-8 py-3"
                  >
                    <Send className="w-4 h-4" />
                    <span>
                      {isCreatingForm
                        ? 'در حال اعمال روی پرس‌کاد...'
                        : porscadPoll?.formId
                        ? 'ویرایش و اعمال فرم موجود در پرس‌کاد'
                        : 'ساخت و انتشار رسمی فرم در پرس‌کاد'}
                    </span>
                  </Button>
                </div>
              </form>
            </div>
          ) : porscadPoll && porscadPoll.isPublished ? (
            /* 2. ACTIVE PUBLISHED POLL VIEW FOR STUDENTS & ADMIN */
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <div className="rounded-2xl border-[1.5px] border-primary-dark/30 dark:border-gray-800 bg-white dark:bg-[#151C28] shadow-[2px_2px_0_#59BBAF] dark:shadow-[2px_2px_0_#0B0F17] p-5 sm:p-7 space-y-5">
                  {/* Title & Selection Info */}
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="text-base sm:text-lg font-black text-ink-darker dark:text-white">
                      {porscadPoll.questionTitle || porscadPoll.title}
                    </h3>
                    {isMultiSelect && !hasVoted && !isManager && (
                      <div className="mr-auto inline-flex items-center gap-1.5 px-3 py-1 rounded-xl border border-primary/25 bg-primary/5 dark:bg-primary/10 text-primary text-xs font-bold">
                        <span>انتخاب‌های فعلی شما: <strong>{toPersianDigits(selectedOptionIds.length)}</strong> از <strong>{toPersianDigits(maxSelections)}</strong> انتخاب</span>
                      </div>
                    )}
                    {isManager && (
                      <div className="mr-auto inline-flex items-center gap-1.5 px-3 py-1 rounded-xl border border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300 text-xs font-bold shadow-2xs">
                        <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                        <span>حالت ناظر: امکان رأی‌دهی فقط برای دانش‌آموزان است</span>
                      </div>
                    )}
                  </div>

                  {/* Has Voted Status Banner */}
                  {hasVoted && !isManager && (
                    <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 shadow-2xs">
                      <div className="flex items-center gap-2 text-xs font-bold">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                        <span>رأی شما با موفقیت ثبت شد.</span>
                      </div>
                    </div>
                  )}

                  {/* Options Cards Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-3.5">
                    {porscadPoll.options.map((option, idx) => {
                      const isSelected = selectedOptionIds.includes(option.id) || selectedOptionIds.includes(option.ideaId || '');
                      const winningIds = porscadPoll.winningOptionIds || (porscadPoll.winningOptionId ? [porscadPoll.winningOptionId] : []);
                      const isWinner = porscadPoll.isClosed && (winningIds.includes(option.id) || winningIds.includes(option.ideaId || ''));
                      const matchingIdea = ideas.find((i) => i.id === option.ideaId || i.id === option.id);
                      const isInteractive = !porscadPoll.isClosed && !hasVoted && !isManager && !isParent && canVote;
                      const authorName = matchingIdea?.authorName || option.authorName || '';

                      return (
                        <div
                          key={option.id}
                          onClick={() => isInteractive && handleToggleOption(option.id)}
                          className={`group relative overflow-hidden rounded-2xl border transition-all duration-200 ${
                            isWinner
                              ? 'border-amber-400/80 bg-amber-50/60 dark:bg-amber-950/30 shadow-2xs ring-1 ring-amber-400/30'
                              : isSelected && !isManager && !isParent
                              ? 'border-primary bg-primary/8 dark:bg-primary/15 shadow-2xs ring-2 ring-primary/25'
                              : porscadPoll.isClosed || hasVoted || isManager || isParent
                              ? 'border-gray-200 dark:border-gray-800 bg-gray-50/60 dark:bg-[#1C2536]/40'
                              : 'cursor-pointer border-gray-200/90 dark:border-gray-800 bg-white dark:bg-[#151C28] hover:border-primary/50 hover:shadow-xs shadow-2xs hover:-translate-y-0.5'
                          } p-3.5 sm:p-4 select-none`}
                        >
                          {/* Fill Progress Bar (only if vote counts shown) */}
                          {showVoteStats && (hasVoted || porscadPoll.isClosed) && (
                            <div
                              className={`absolute inset-y-0 right-0 transition-all duration-700 ${
                                isWinner
                                  ? 'bg-amber-400/20 dark:bg-amber-400/15'
                                  : isSelected && !isManager
                                  ? 'bg-emerald-500/15 dark:bg-emerald-500/20'
                                  : 'bg-primary/10 dark:bg-primary/15'
                              }`}
                              style={{ width: `${option.percentage || 0}%` }}
                            />
                          )}

                          <div className="relative z-10 flex items-center justify-between gap-3">
                            {/* Right Side: Number Badge + Idea Title */}
                            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                              {(!porscadPoll.isClosed || isManager) && (
                                <span
                                  className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center font-black text-xs shrink-0 border shadow-2xs transition-all ${
                                    isSelected && !isManager
                                      ? 'bg-primary text-white border-primary shadow-xs scale-105'
                                      : 'bg-gray-100 dark:bg-[#1C2536] border-gray-200 dark:border-gray-700 text-ink-darker dark:text-gray-200 group-hover:border-primary/40'
                                  }`}
                                >
                                  {toPersianDigits(idx + 1)}
                                </span>
                              )}

                              <h4 className="text-sm sm:text-base font-black text-zinc-900 dark:text-zinc-100 leading-snug truncate group-hover:text-primary transition-colors">
                                {matchingIdea ? matchingIdea.title : option.text}
                              </h4>
                            </div>

                            {/* Left Side: Author Chip + Winner Badge + Vote Stats + Selection Checkbox */}
                            <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
                              {authorName && (
                                <span className="text-xs font-bold text-gray-500 dark:text-gray-400 bg-gray-100/80 dark:bg-[#1C2536] px-2.5 py-1 rounded-lg border border-gray-200/60 dark:border-gray-700/60 truncate max-w-[120px] sm:max-w-[170px]">
                                  {authorName}
                                </span>
                              )}

                              {isWinner && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200 text-[11px] font-bold shadow-2xs">
                                  <Trophy className="w-3 h-3 text-amber-600" />
                                  <span>برگزیده</span>
                                </span>
                              )}

                              {showVoteStats && (hasVoted || porscadPoll.isClosed) && (
                                <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-[11px] font-black text-ink-darker dark:text-white border border-gray-200/80 dark:border-gray-700">
                                  <span>{toPersianDigits(option.voteCount)} رای</span>
                                  <span className="text-primary font-black">٪{toPersianDigits(option.percentage || 0)}</span>
                                </div>
                              )}

                              {!isManager && (
                                <div
                                  className={`w-6 h-6 ${isMultiSelect ? 'rounded-lg' : 'rounded-full'} border flex items-center justify-center transition-all shrink-0 ${
                                    isWinner
                                      ? 'border-amber-400 bg-amber-400 text-white shadow-2xs'
                                      : isSelected
                                      ? 'border-primary bg-primary text-white shadow-2xs scale-105'
                                      : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-[#1C2536] group-hover:border-primary/60'
                                  }`}
                                >
                                  {isWinner ? (
                                    <Crown className="w-3.5 h-3.5 fill-white" />
                                  ) : isSelected ? (
                                    <Check className="w-3.5 h-3.5 text-white stroke-[2.5]" />
                                  ) : null}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Manual Submit Button for All Question Types (or Parent Spectator / Ended View) */}
                  {isParent ? (
                    <div className="mt-4 p-3.5 rounded-xl border border-blue-200 bg-blue-50/70 dark:bg-blue-950/30 text-blue-950 dark:text-blue-200 flex items-center justify-between gap-3 text-xs font-bold shadow-2xs">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-blue-600 flex-shrink-0" />
                        <span>حالت مشاهده‌گر اولیاء: امکان ثبت رای صرفاً برای دانش‌آموزان و داوران رویداد فعال است.</span>
                      </div>
                    </div>
                  ) : isEventEnded ? (
                    <div className="mt-4 p-3.5 rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50/80 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 flex items-center justify-between gap-3 text-xs font-bold shadow-2xs">
                      <div className="flex items-center gap-2">
                        <Lock className="w-4 h-4 text-amber-600 flex-shrink-0" />
                        <span>مهلت رأی‌گیری در این رویداد به اتمام رسیده است و امکان ثبت رأی جدید وجود ندارد.</span>
                      </div>
                    </div>
                  ) : !hasVoted && !porscadPoll.isClosed && !isManager ? (
                    <div className="pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-end">
                      <Button
                        variant="primary"
                        disabled={isSubmittingVote || selectedOptionIds.length === 0}
                        onClick={() => {
                          if (selectedOptionIds.length === 0) {
                            toast.error('لطفاً ابتدا حداقل یک ایده را برای رای‌دهی انتخاب کنید.');
                            return;
                          }
                          setIsVoteConfirmModalOpen(true);
                        }}
                        className="gap-2 text-xs font-black px-6 py-2.5"
                      >
                        <Send className="w-4 h-4" />
                        <span>{isSubmittingVote ? 'در حال ثبت...' : 'ثبت نهایی رأی'}</span>
                      </Button>
                    </div>
                  ) : null}
                </div>
              </div>

              {/* Right Sidebar: Real-Time Analytics from Porscad (Admin Only) */}
              {isManager && (
                <div className="space-y-6">
                  <div className="rounded-2xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-[#151C28] p-5 md:p-6 shadow-2xs">
                    <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800/80 pb-4 mb-4">
                      <div className="flex items-center gap-2">
                        <BarChart3 className="w-5 h-5 text-primary" />
                        <h3 className="text-base font-black text-ink-darker dark:text-white">
                          آمار و تحلیل زنده پرس‌کاد (ویژه ادمین)
                        </h3>
                      </div>
                      <span className="text-[11px] font-bold text-gray-400">آنالیتیکس آنلاین</span>
                    </div>

                    <div className="space-y-3">
                      {[...porscadPoll.options]
                        .sort((a, b) => b.voteCount - a.voteCount)
                        .map((opt, rank) => {
                          const matching = ideas.find((i) => i.id === opt.ideaId || i.id === opt.id);
                          return (
                            <div
                              key={opt.id}
                              className="p-3 rounded-xl border border-gray-200/80 dark:border-gray-800 bg-gray-50/70 dark:bg-[#1C2536]/50 space-y-1.5"
                            >
                              <div className="flex items-center justify-between text-xs font-bold">
                                <div className="flex items-center gap-2">
                                  <span
                                    className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-black border ${
                                      rank === 0
                                        ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30'
                                        : 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700'
                                    }`}
                                  >
                                    {toPersianDigits(rank + 1)}
                                  </span>
                                  <span className="text-ink-darker dark:text-white line-clamp-1 max-w-[140px]">
                                    {matching ? matching.title : opt.text}
                                  </span>
                                </div>
                          {showVoteStats && (
                            <span className="text-primary font-black">
                              ٪{toPersianDigits(opt.percentage || 0)}
                            </span>
                          )}
                              </div>

                              <div className="w-full bg-gray-200 dark:bg-gray-700 h-2 rounded-full overflow-hidden">
                                {showVoteStats && (
                                  <div
                                    className={`h-full rounded-full transition-all duration-500 ${
                                      rank === 0 ? 'bg-amber-500' : 'bg-primary'
                                    }`}
                                    style={{ width: `${opt.percentage || 0}%` }}
                                  />
                                )}
                              </div>
                            </div>
                          );
                        })}
                    </div>

                    <div className="mt-5 pt-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-xs font-bold text-gray-500 dark:text-gray-400">
                      <span>تعداد کل ایده‌های فرم:</span>
                      <span className="font-black text-ink-darker dark:text-white">{toPersianDigits(porscadPoll.options.length)} ایده</span>
                      {showVoteStats && (
                        <span className="font-black text-primary">مجموع آرا: {toPersianDigits(porscadPoll.totalVotes)}</span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* 3. AWAITING POLL CREATION BY ADMIN (FOR STUDENTS) */
            <div className="rounded-2xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-[#151C28] p-6 md:p-8 text-center shadow-2xs space-y-3">
              <div className="w-14 h-14 mx-auto rounded-2xl border border-amber-500/20 bg-amber-500/10 flex items-center justify-center shadow-2xs">
                <Clock className="w-7 h-7 text-amber-500 animate-spin" />
              </div>
              <h3 className="text-lg md:text-xl font-black text-ink-darker dark:text-white">
                در انتظار ایجاد و انتشار فرم نظرسنجی توسط مدیر رویداد
              </h3>
            </div>
          )}
      {/* ================= FINISH POLL & SELECT TOP N WINNERS MODAL ================= */}
      {isFinishModalOpen && porscadPoll && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-zinc-950/70 p-0 sm:p-4 overflow-y-auto overscroll-contain">
          <div className="w-full max-w-xl rounded-t-3xl sm:rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#151C28] p-5 sm:p-6 shadow-xl space-y-5 animate-in slide-in-from-bottom-8 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-150 max-h-[88vh] overflow-y-auto overscroll-contain pb-[max(1.25rem,env(safe-area-inset-bottom))]">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800/80 pb-4">
              <div className="flex items-center gap-2 min-w-0">
                <Trophy className="w-6 h-6 text-amber-500 fill-amber-400 flex-shrink-0" />
                <div className="min-w-0">
                  <h3 className="text-sm sm:text-base font-black text-zinc-900 dark:text-zinc-100 leading-snug">
                    اتمام نظرسنجی و مشخص‌سازی ایده‌های برتر
                  </h3>
                  <p className="text-[11px] font-bold text-zinc-500 mt-0.5">
                    بستن فرم و تعیین تعداد طرح‌های برگزیده جهت نمایش در سکوی افتخار
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsFinishModalOpen(false)}
                className="rounded-lg p-1 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                title="بستن پنجره"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmFinishAssessment} className="space-y-5">
              {/* Explanation Note */}
              <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/10 text-amber-900 dark:text-amber-200 text-xs font-bold leading-relaxed space-y-1">
                <div className="flex items-center gap-1.5 font-black text-amber-800 dark:text-amber-300">
                  <Lock className="w-4 h-4" />
                  <span>توقف رای‌گیری و بررسی اختصاصی مدیر</span>
                </div>
                <p>
                  با تایید این فرم، رای‌گیری در پرس‌کاد متوقف شده و فرم قفل می‌شود. تعداد ایده‌های برتر و ترتیب نمایش را مشخص کنید.
                </p>
              </div>

              {/* Display Order Selection */}
              <div>
                <label className="block text-xs font-bold text-ink-darker dark:text-white mb-2">
                  ترتیب نمایش تیم‌ها / ایده‌های برتر:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { key: 'RANK', label: 'بر اساس رتبه' },
                    { key: 'RANK_VOTES', label: 'رتبه و تعداد رای' },
                    { key: 'RANDOM', label: 'تصادفی (رندم)' },
                    { key: 'IGNORE_RANK', label: 'بدون توجه به رتبه' },
                  ].map((opt) => (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => setFinishDisplayOrder(opt.key as typeof finishDisplayOrder)}
                      className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        finishDisplayOrder === opt.key
                          ? 'border-primary bg-primary text-white shadow-2xs'
                          : 'border-gray-200 dark:border-gray-700 bg-gray-50/70 dark:bg-[#1C2536] text-ink-darker dark:text-white hover:border-gray-300 dark:hover:border-gray-600'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Show vote counts to audience checkbox */}
              <label className="flex items-start gap-2.5 p-3 rounded-xl border border-gray-200/80 dark:border-gray-800 bg-gray-50/70 dark:bg-[#1C2536]/50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={finishShowVoteCounts}
                  onChange={(e) => setFinishShowVoteCounts(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <span className="text-xs font-bold text-ink-darker dark:text-white leading-relaxed">
                  نمایش تعداد و درصد رای‌ها به مخاطب (دانش‌آموزان)
                  <span className="block text-[11px] font-medium text-gray-400 mt-0.5">
                    به‌صورت پیش‌فرض خاموش است؛ فقط با تیک شما برای مخاطب نمایش داده می‌شود.
                  </span>
                </span>
              </label>

              {/* Number of Top Ideas Selection */}
              <div>
                <label className="block text-xs font-bold text-ink-darker dark:text-white mb-2">
                  تعداد ایده‌های برتر جهت رتبه‌بندی و نمایش در سکوی افتخار (Top N Winners):
                </label>

                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-3">
                  {Array.from(new Set([1, 2, 3, 5, 10, porscadPoll.options.length])).map((num) => {
                    const label = num === porscadPoll.options.length ? 'همه' : `${toPersianDigits(num)} برتر`;
                    const isSelected = finishTopWinnersCount === num;
                    return (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setFinishTopWinnersCount(num)}
                        className={`py-2 px-1 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                          isSelected
                            ? 'border-primary bg-primary text-white shadow-2xs'
                            : 'border-gray-200 dark:border-gray-700 bg-gray-50/70 dark:bg-[#1C2536] text-ink-darker dark:text-white hover:border-gray-300 dark:hover:border-gray-600'
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-gray-500 dark:text-gray-400">یا انتخاب تعداد دلخواه:</span>
                  <input
                    type="number"
                    min={1}
                    max={porscadPoll.options.length}
                    value={finishTopWinnersCount || ''}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      if (isNaN(val)) {
                        setFinishTopWinnersCount(1);
                      } else {
                        setFinishTopWinnersCount(
                          Math.max(1, Math.min(porscadPoll.options.length || 1, val))
                        );
                      }
                    }}
                    className="w-24 px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1C2536] text-ink-darker dark:text-white text-center text-xs font-medium focus:border-primary focus:outline-none transition-all"
                  />
                  <span className="text-xs font-medium text-gray-400">
                    از مجموع {toPersianDigits(porscadPoll.options.length)} ایده فرم
                  </span>
                </div>
              </div>

              {/* Current Ranking Preview */}
              <div className="rounded-xl border border-gray-200/80 dark:border-gray-800 bg-gray-50/70 dark:bg-[#1C2536]/50 p-3.5 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-ink-darker dark:text-white">
                  <span>پیش‌نمایش رتبه‌بندی فعلی ({toPersianDigits(finishTopWinnersCount)} ایده برتر):</span>
                  {finishShowVoteCounts && (
                    <span className="text-[11px] text-gray-400">مجموع آرا: {toPersianDigits(porscadPoll.totalVotes)}</span>
                  )}
                </div>

                <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                  {[...porscadPoll.options]
                    .sort((a, b) => b.voteCount - a.voteCount)
                    .slice(0, finishTopWinnersCount)
                    .map((opt, rIdx) => {
                      const matching = ideas.find((i) => i.id === opt.ideaId || i.id === opt.id);
                      return (
                        <div
                          key={opt.id}
                          className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-[#151C28] border border-gray-200/70 dark:border-gray-700/70 text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className={`w-5 h-5 rounded-md flex items-center justify-center font-black text-[10px] border ${
                                rIdx === 0
                                  ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30'
                                  : rIdx === 1
                                  ? 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700'
                                  : rIdx === 2
                                  ? 'bg-amber-800/15 text-amber-700 dark:text-amber-300 border-amber-800/30'
                                  : 'bg-gray-50 text-gray-500 dark:bg-gray-800/50 dark:text-gray-400 border-transparent'
                              }`}
                            >
                              {toPersianDigits(rIdx + 1)}
                            </span>
                            <span className="font-bold text-ink-darker dark:text-white line-clamp-1 max-w-[220px]">
                              {matching ? matching.title : opt.text}
                            </span>
                            <span className="text-[10px] text-gray-400 font-medium hidden sm:inline">
                              ({matching?.authorName || opt.authorName})
                            </span>
                          </div>

                          <div className="flex items-center gap-2 font-bold">
                            {finishShowVoteCounts && (
                              <>
                                <span className="text-gray-600 dark:text-gray-400">{toPersianDigits(opt.voteCount)} رای</span>
                                <span className="text-primary">٪{toPersianDigits(opt.percentage || 0)}</span>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100 dark:border-gray-800">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsFinishModalOpen(false)}
                  className="text-xs font-bold"
                >
                  انصراف
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  className="text-xs font-bold gap-2"
                >
                  <Lock className="w-4 h-4" />
                  <span>تایید، بستن فرم و نمایش {toPersianDigits(finishTopWinnersCount)} ایده برتر</span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VOTE CONFIRMATION MODAL */}
      <Modal
        isOpen={isVoteConfirmModalOpen}
        onClose={() => !isSubmittingVote && setIsVoteConfirmModalOpen(false)}
        title="تأیید نهایی ثبت رأی"
        maxWidth="md"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-3.5 rounded-xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-amber-800 dark:text-amber-200">
            <Vote className="w-5 h-5 shrink-0 text-amber-600 dark:text-amber-400" />
            <p className="text-xs sm:text-sm font-bold leading-relaxed">
              آیا از ثبت نهایی رأی خود اطمینان دارید؟
            </p>
          </div>

          <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
            توجه داشته باشید که هر شرکت‌کننده فقط یک‌بار مجاز به ثبت رأی است و پس از تأیید، امکان تغییر یا بازپس‌گیری آراء وجود نخواهد داشت.
          </p>

          {/* Selected Ideas List */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-gray-600 dark:text-gray-300">
              ایده‌های انتخابی شما ({toPersianDigits(selectedOptionIds.length)} ایده):
            </span>
            <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
              {selectedOptionIds.map((optId) => {
                const opt = porscadPoll?.options.find((o) => o.id === optId || o.ideaId === optId);
                const matchingIdea = ideas.find((i) => i.id === opt?.ideaId || i.id === optId);
                const title = matchingIdea ? matchingIdea.title : opt?.text || 'ایده انتخابی';
                const author = matchingIdea?.authorName || opt?.authorName;
                return (
                  <div
                    key={optId}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-gray-50 dark:bg-[#1C2536] border border-gray-200/70 dark:border-gray-700/70 text-xs"
                  >
                    <span className="font-bold text-ink-darker dark:text-white truncate">
                      {title}
                    </span>
                    {author && (
                      <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400 shrink-0">
                        {author}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100 dark:border-gray-800">
            <Button
              type="button"
              variant="outline"
              disabled={isSubmittingVote}
              onClick={() => setIsVoteConfirmModalOpen(false)}
              className="font-bold text-xs"
            >
              انصراف
            </Button>
            <Button
              type="button"
              variant="primary"
              disabled={isSubmittingVote}
              onClick={async () => {
                await handleVoteSubmit();
                setIsVoteConfirmModalOpen(false);
              }}
              className="gap-2 text-xs font-black px-6 py-2.5"
            >
              <Check className="w-4 h-4" />
              <span>{isSubmittingVote ? 'در حال ثبت...' : 'بله، ثبت نهایی رأی'}</span>
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
