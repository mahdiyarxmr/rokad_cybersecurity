import React, { useEffect, useMemo, useState } from 'react';
import { apiClient } from '../../../lib/api/client';
import { useAuthStore } from '../../../lib/auth/auth-store';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Badge } from '../../../components/ui/Badge';
import { Modal } from '../../../components/ui/Modal';
import { Skeleton } from '../../../components/ui/Skeleton';
import { ResponsivePageHeader } from '../../../components/ui/ResponsivePageHeader';
import { toast } from '../../../components/ui/toast/toast';
import {
  porscadSurvey,
  PORSCAD_QUESTION_TYPES,
  PorscadQuestionType,
  SurveyQuestion,
  SurveyAnswers,
} from '../../../lib/porscad/porscad-survey-client';
import {
  formatJalaliDisplay,
  toPersianDigits,
  gregorianToJalaliStr,
  jalaliToGregorianDate,
} from '../../../utils/jalali';
import { PersianDatePicker } from '../../../components/ui/PersianDatePicker';
import {
  canViewPollResults,
  canManagePolls,
  canCreatePolls,
} from './poll-access';
import {
  Vote,
  Plus,
  CheckCircle2,
  AlertCircle,
  Users,
  Check,
  Star,
  BarChart3,
  Calendar,
  Lock,
  Clock,
  ChevronLeft,
  ChevronRight,
  Trash2,
  ArrowRight,
  ArrowLeft,
  Send,
  Sparkles,
  ListChecks,
  Layers,
  RefreshCw,
  X,
  ChevronUp,
  ChevronDown,
  SmilePlus,
  Smile,
  Meh,
  Frown,
  Angry,
  Search,
  Filter,
  HelpCircle,
  User,
  Eye,
} from 'lucide-react';

type QuestionType = PorscadQuestionType;

interface PollOption {
  id: string;
  text: string;
  voteCount: number;
  orderIndex: number;
}

interface Poll {
  id: string;
  title: string;
  description?: string;
  pollType: 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE' | 'RATING_SCALE';
  targetAudience: 'ALL' | 'STUDENTS' | 'PARENTS' | 'TEACHERS' | 'STAFF';
  startDate: string;
  endDate: string;
  isAnonymous: boolean;
  isMandatory?: boolean;
  isClosed: boolean;
  isArchived?: boolean;
  createdAt: string;
  questions?: SurveyQuestion[] | string;
  porscadFormId?: string | null;
  porscadFormPublicId?: string | null;
  options: PollOption[];
  _count?: { votes: number };
  createdBy?: { firstName?: string; lastName?: string; role?: string };
}

interface QuestionDraft {
  type: QuestionType;
  title: string;
  description: string;
  placeholder?: string;
  options: string[];
  maxSelections: number;
  required: boolean;
  validation: {
    min?: number;
    max?: number;
    step?: number;
    minLength?: number;
    maxLength?: number;
    allowedExtensions?: string[];
    maxFileSizeMb?: number;
  };
  jump_actions?: Array<{
    conditionValue: string;
    targetQuestionIndex: number | 'END';
  }>;
  points?: number;
  showAdvanced?: boolean;
}

interface AnalyticsData {
  totalResponses: number;
  porscadLinked: boolean;
  perQuestion: Array<{
    index: number;
    title: string;
    type: string;
    answered: number;
    options: Array<{ text: string; count: number; percentage: number }>;
    avgRating: number | null;
  }>;
  responses: Array<{
    id: string;
    respondentName: string;
    role?: string;
    answers?: Record<string, unknown>;
    createdAt: string;
  }>;
}

const AUDIENCE_OPTIONS = [
  { value: 'ALL', label: 'همه (عمومی)', desc: 'دانش‌آموز، معلم و اولیا' },
  { value: 'STUDENTS', label: 'دانش‌آموزان', desc: 'فقط اکانت‌های دانش‌آموز' },
  { value: 'PARENTS', label: 'والدین', desc: 'فقط اکانت‌های اولیا' },
  { value: 'TEACHERS', label: 'معلمان', desc: 'فقط اکانت‌های معلمان و مربیان' },
  { value: 'STAFF', label: 'کارکنان', desc: 'فقط اکانت‌های کارکنان و ادمین' },
] as const;

const AUDIENCE_LABEL: Record<string, string> = {
  ALL: 'همه',
  STUDENTS: 'دانش‌آموزان',
  PARENTS: 'والدین',
  TEACHERS: 'معلمان',
  STAFF: 'کارکنان',
};

const TYPE_LABEL: Record<QuestionType, string> = {
  choice: 'چندگزینه‌ای',
  picture_choice: 'چندگزینه‌ای تصویری',
  dropdown: 'لیست کشویی',
  yes_no: 'بله/خیر',
  likert: 'طیفی (لیکرت)',
  nps: 'NPS (۰ تا ۱۰)',
  rating: 'ستاره‌ای',
  matrix: 'ماتریسی',
  ranking: 'رتبه‌بندی',
  short_text: 'متن کوتاه',
  long_text: 'متن بلند',
  number: 'عدد',
  email: 'ایمیل',
  phone_ir: 'موبایل',
  link: 'لینک',
  telegram_id: 'تلگرام',
  statement: 'متن توضیحی',
  group: 'گروه/بخش',
  file_upload: 'آپلود فایل',
  payment: 'پرداخت',
  opinion_scale: 'مقیاس نظری',
};

const INFORMATIONAL_TYPES = new Set<string>(['statement', 'group']);

function questionNeedsOptions(type: string): boolean {
  const meta = PORSCAD_QUESTION_TYPES.find((t) => t.value === type);
  if (meta) return meta.needsOptions;
  return type === 'choice' || type === 'dropdown';
}

const DEFAULT_OPTIONS = ['گزینه اول', 'گزینه دوم'];

function parseQuestions(raw: SurveyQuestion[] | string | undefined): SurveyQuestion[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function legacyQuestionsFromPoll(poll: Poll): SurveyQuestion[] {
  const parsed = parseQuestions(poll.questions);
  if (parsed.length > 0) return parsed;
  if (!poll.options?.length) return [];
  return [
    {
      type: poll.pollType === 'RATING_SCALE' ? 'rating' : 'choice',
      title: poll.title,
      description: poll.description,
      options: poll.options.map((o) => o.text),
      maxSelections: poll.pollType === 'MULTIPLE_CHOICE' ? 5 : 1,
      required: true,
      displayMode: 'buttons',
    },
  ];
}

function emptyDraft(): QuestionDraft {
  return {
    type: 'choice',
    title: '',
    description: '',
    placeholder: '',
    options: [...DEFAULT_OPTIONS],
    maxSelections: 1,
    required: true,
    validation: {},
    jump_actions: [],
    showAdvanced: false,
  };
}

type PollFilter = 'ACTIVE' | 'SCHEDULED' | 'ENDED';
type PollStatusAction = 'close' | 'open' | 'archive' | 'unarchive';

export const PollsPage: React.FC = () => {
  const { user } = useAuthStore();
  const [polls, setPolls] = useState<Poll[]>(() => {
    try {
      sessionStorage.removeItem('rokad_polls_cache');
      const cached = sessionStorage.getItem('rokad_polls_cache_v2');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [isLoading, setIsLoading] = useState<boolean>(() => {
    try {
      const cached = sessionStorage.getItem('rokad_polls_cache_v2');
      return !cached || JSON.parse(cached).length === 0;
    } catch {
      return true;
    }
  });
  const [activeFilter, setActiveFilter] = useState<PollFilter>('ACTIVE');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusAction, setStatusAction] = useState<{
    poll: Poll;
    action: PollStatusAction;
  } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Poll | null>(null);
  const [isStatusBusy, setIsStatusBusy] = useState(false);

  const canViewResults = canViewPollResults(user?.role);
  const isAdmin = canManagePolls(user?.role);
  const canCreate = canCreatePolls(user?.role);

  const respondentName = useMemo(
    () =>
      `${user?.firstName || ''} ${user?.lastName || ''}`.trim() ||
      'کاربر',
    [user],
  );

  // Create modal state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createStep, setCreateStep] = useState<0 | 1 | 2>(0);
  const [createError, setCreateError] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: '',
    description: '',
    targetAudience: 'ALL' as
      | 'ALL'
      | 'STUDENTS'
      | 'PARENTS'
      | 'TEACHERS'
      | 'STAFF',
    isMandatory: false,
    preventDuplicate: true,
    isAnonymous: false,
    startDate: gregorianToJalaliStr(new Date()),
    endDate: gregorianToJalaliStr(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
  });
  const [drafts, setDrafts] = useState<QuestionDraft[]>([emptyDraft()]);

  // Fill (step-by-step) state
  const [activePoll, setActivePoll] = useState<Poll | null>(null);
  const [fillStep, setFillStep] = useState(0);
  const [stepHistory, setStepHistory] = useState<number[]>([]);
  const [fillAnswers, setFillAnswers] = useState<SurveyAnswers>({});
  const [fillError, setFillError] = useState<string | null>(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [isSubmittingAnswers, setIsSubmittingAnswers] = useState(false);

  // Analytics
  const [analyticsPollId, setAnalyticsPollId] = useState<string | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [isAnalyticsLoading, setIsAnalyticsLoading] = useState(false);
  const [liveAnalytics, setLiveAnalytics] = useState<any>(null);
  const [isRefreshingLive, setIsRefreshingLive] = useState(false);

  const fetchPolls = async (silent = false) => {
    if (!silent && polls.length === 0) {
      setIsLoading(true);
    }
    try {
      const res = await apiClient.get<Poll[]>('/polls');
      const data = res.data || [];
      setPolls(data);
      try {
        sessionStorage.setItem('rokad_polls_cache_v2', JSON.stringify(data));
      } catch {}
    } catch (err) {
      console.error('Failed to fetch polls:', err);
      if (polls.length === 0) {
        toast.error('خطا در دریافت نظرسنجی‌ها');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPolls();
  }, []);

  const now = new Date();

  const filterCounts = useMemo(() => {
    let active = 0;
    let scheduled = 0;
    let ended = 0;
    for (const p of polls) {
      if (p.isArchived || p.isClosed || new Date(p.endDate) < now) {
        ended += 1;
      } else if (new Date(p.startDate) > now) {
        scheduled += 1;
      } else {
        active += 1;
      }
    }
    return { active, scheduled, ended };
  }, [polls, now]);

  const filteredPolls = useMemo(() => {
    return polls.filter((p) => {
      const isEnded = !!p.isArchived || !!p.isClosed || new Date(p.endDate) < now;
      const isScheduled = !isEnded && new Date(p.startDate) > now;
      const isActive = !isEnded && !isScheduled;

      if (activeFilter === 'ACTIVE' && !isActive) return false;
      if (activeFilter === 'SCHEDULED' && !isScheduled) return false;
      if (activeFilter === 'ENDED' && !isEnded) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const titleMatch = (p.title || '').toLowerCase().includes(q);
        const descMatch = (p.description || '').toLowerCase().includes(q);
        if (!titleMatch && !descMatch) return false;
      }

      return true;
    });
  }, [polls, activeFilter, searchQuery, now]);

  const syncPorscadState = async (
    poll: Poll,
    patch: {
      published?: boolean;
      archived?: boolean;
      deleted_at?: string | null;
    },
  ): Promise<boolean> => {
    if (!poll.porscadFormId || !porscadSurvey.getToken()) return false;
    return porscadSurvey.updateFormState(poll.porscadFormId, patch);
  };

  const applyStatusAction = async () => {
    if (!statusAction) return;
    const { poll, action } = statusAction;
    setIsStatusBusy(true);
    try {
      const res = await apiClient.patch(`/polls/${poll.id}/status`, { action });
      if (res.data) {
        let porscadOk = true;
        if (action === 'close') {
          porscadOk = await syncPorscadState(poll, { published: false });
        } else if (action === 'open') {
          porscadOk = await syncPorscadState(poll, {
            published: true,
            archived: false,
          });
        } else if (action === 'archive') {
          porscadOk = await syncPorscadState(poll, {
            archived: true,
            published: false,
          });
        } else if (action === 'unarchive') {
          const stillOpen =
            !poll.isClosed && new Date(poll.endDate) >= new Date();
          porscadOk = await syncPorscadState(poll, {
            archived: false,
            published: stillOpen,
          });
        }

        const messages: Record<PollStatusAction, string> = {
          close: 'نظرسنجی بسته شد',
          open: 'نظرسنجی باز شد',
          archive: 'نظرسنجی آرشیو شد',
          unarchive: 'نظرسنجی از آرشیو خارج شد',
        };
        if (poll.porscadFormId && !porscadOk && porscadSurvey.getToken()) {
          toast.error(`${messages[action]}؛ همگام‌سازی پرس‌کاد ناموفق بود`);
        } else {
          toast.success(messages[action]);
        }
        setStatusAction(null);
        await fetchPolls();
      }
    } catch (e: any) {
      const msg =
        e?.response?.data?.message || e?.message || 'خطا در تغییر وضعیت';
      toast.error(typeof msg === 'string' ? msg : 'خطا در تغییر وضعیت');
    } finally {
      setIsStatusBusy(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setIsStatusBusy(true);
    try {
      const res = await apiClient.delete<{ porscadFormId?: string | null }>(
        `/polls/${deleteTarget.id}`,
      );
      const remoteFormId =
        res.data?.porscadFormId || deleteTarget.porscadFormId;
      if (remoteFormId && porscadSurvey.getToken()) {
        const ok = await porscadSurvey.trashForm(remoteFormId);
        if (!ok) {
          toast.error('نظرسنجی حذف شد؛ انتقال فرم پرس‌کاد به سطل زباله ناموفق بود');
        } else {
          toast.success('نظرسنجی و فرم پرس‌کاد حذف شدند');
        }
      } else {
        toast.success('نظرسنجی حذف شد');
      }
      setDeleteTarget(null);
      await fetchPolls();
    } catch (e: any) {
      const msg =
        e?.response?.data?.message || e?.message || 'خطا در حذف نظرسنجی';
      toast.error(typeof msg === 'string' ? msg : 'خطا در حذف نظرسنجی');
    } finally {
      setIsStatusBusy(false);
    }
  };

  const createdPorscadSessionRef = React.useRef<{
    formId: string;
    formPublicId?: string;
    questionIds: string[];
  } | null>(null);

  // ——— Create wizard ———
  const openCreate = () => {
    createdPorscadSessionRef.current = null;
    setCreateStep(0);
    setCreateError(null);
    setForm({
      title: '',
      description: '',
      targetAudience: 'ALL',
      isMandatory: false,
      preventDuplicate: true,
      isAnonymous: false,
      startDate: gregorianToJalaliStr(new Date()),
      endDate: gregorianToJalaliStr(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
    });
    setDrafts([emptyDraft()]);
    setIsCreateOpen(true);
  };

  const updateDraft = (index: number, patch: Partial<QuestionDraft>) => {
    createdPorscadSessionRef.current = null;
    setDrafts((prev) =>
      prev.map((d, i) => {
        if (i !== index) return d;
        const next = { ...d, ...patch };
        if (!questionNeedsOptions(next.type)) {
          next.maxSelections = 1;
        }
        if (next.type === 'choice' && next.maxSelections < 1) {
          next.maxSelections = 1;
        }
        return next;
      }),
    );
  };

  const validateStep = (step: 0 | 1 | 2): string | null => {
    if (step === 0) {
      if (!form.title.trim()) return 'عنوان نظرسنجی الزامی است';
      if (!form.startDate || !form.endDate) return 'تاریخ شروع و پایان را مشخص کنید';
      try {
        if (jalaliToGregorianDate(form.endDate) < jalaliToGregorianDate(form.startDate)) {
          return 'تاریخ پایان باید بعد از تاریخ شروع باشد';
        }
      } catch {
        return 'تاریخ شروع یا پایان نامعتبر است';
      }
      return null;
    }
    if (step === 1) {
      if (drafts.length === 0) return 'حداقل یک سوال اضافه کنید';
      const MUST_HAVE_OPTIONS = new Set(['choice', 'picture_choice', 'dropdown', 'ranking', 'matrix']);
      for (let i = 0; i < drafts.length; i++) {
        const d = drafts[i];
        if (!d.title.trim()) return `متن سوال ${toPersianDigits(i + 1)} الزامی است`;
        if (MUST_HAVE_OPTIONS.has(d.type)) {
          const opts = d.options.filter((o) => o.trim());
          if (opts.length < 2) {
            return `سوال ${toPersianDigits(i + 1)} باید حداقل ۲ گزینه داشته باشد`;
          }
        }
      }
      return null;
    }
    return null;
  };

  const goNextCreate = () => {
    const err = validateStep(createStep);
    if (err) {
      setCreateError(err);
      toast.error(err);
      return;
    }
    setCreateError(null);
    setCreateStep((s) => (s === 0 ? 1 : 2));
  };

  const goBackCreate = () => {
    setCreateError(null);
    setCreateStep((s) => (s === 1 ? 0 : 1));
  };

  const handleCreateSubmit = async () => {
    const err = validateStep(0) || validateStep(1);
    if (err) {
      setCreateError(err);
      toast.error(err);
      return;
    }

    setIsSubmitting(true);
    setCreateError(null);

    try {
      const questions: SurveyQuestion[] = drafts.map((d) => {
        let opts = d.options?.filter((o) => o.trim()) || [];
        if (d.type === 'likert' && opts.length < 2) {
          opts = ['کاملاً موافق', 'موافق', 'ممتنع / خنثی', 'مخالف', 'کاملاً مخالف'];
        } else if (d.type === 'yes_no' && opts.length < 2) {
          opts = ['بله', 'خیر'];
        } else if (!questionNeedsOptions(d.type)) {
          opts = [];
        }

        return {
          type: d.type,
          title: d.title.trim(),
          description: d.description.trim() || undefined,
          placeholder: d.placeholder?.trim() || undefined,
          options: opts.length > 0 ? opts : undefined,
          maxSelections: d.type === 'choice' ? Math.max(1, d.maxSelections) : 1,
          required: INFORMATIONAL_TYPES.has(d.type) ? false : d.required,
          displayMode: 'buttons',
          validation:
            d.validation && Object.values(d.validation).some((v) => v !== undefined && (v as any) !== '')
              ? d.validation
              : undefined,
          jump_actions:
            d.jump_actions && d.jump_actions.length > 0 ? d.jump_actions : undefined,
          points: d.points || 0,
        };
      });

      let formId: string | undefined;
      let formPublicId: string | undefined;
      let questionIds: string[] = [];
      let porscadOk = false;

      // Check if we already created a Porscad form in this modal session (prevents duplicate forms on retry)
      if (createdPorscadSessionRef.current?.formId) {
        formId = createdPorscadSessionRef.current.formId;
        formPublicId = createdPorscadSessionRef.current.formPublicId;
        questionIds = createdPorscadSessionRef.current.questionIds;
        questions.forEach((q, idx) => {
          if (questionIds[idx]) {
            q.porscadQuestionId = questionIds[idx];
          }
        });
        porscadOk = true;
      } else if (porscadSurvey.getToken()) {
        try {
          const created = await porscadSurvey.createSurveyForm({
            title: form.title.trim(),
            description: form.description.trim() || undefined,
            questions,
          });
          formId = created.formId;
          formPublicId = created.formPublicId;
          questionIds = created.questionIds;
          createdPorscadSessionRef.current = { formId, formPublicId, questionIds };
          if (questionIds.length > 0) {
            questions.forEach((q, idx) => {
              if (questionIds[idx]) {
                q.porscadQuestionId = questionIds[idx];
              }
            });
          }
          porscadOk = true;
        } catch (e: any) {
          toast.error(
            e?.message ||
              'ساخت فرم در پرس‌کاد ناموفق بود؛ نظرسنجی فقط محلی ذخیره می‌شود',
          );
        }
      }

      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        pollType: questions.some((q) => q.type === 'rating')
          ? 'RATING_SCALE'
          : questions.some((q) => (q.maxSelections || 1) > 1)
            ? 'MULTIPLE_CHOICE'
            : 'SINGLE_CHOICE',
        targetAudience: form.targetAudience,
        isMandatory: form.isMandatory,
        preventDuplicate: form.preventDuplicate,
        isAnonymous: form.isAnonymous,
        startDate: (() => {
          const d = jalaliToGregorianDate(form.startDate);
          d.setHours(0, 0, 0, 0);
          return d.toISOString();
        })(),
        endDate: (() => {
          const d = jalaliToGregorianDate(form.endDate);
          d.setHours(23, 59, 59, 999);
          return d.toISOString();
        })(),
        questions,
        porscadFormId: formId,
        porscadFormPublicId: formPublicId,
        porscadQuestionIds: questionIds,
        porscadMeta: { questionIds },
        options: [],
      };

      await apiClient.post('/polls', payload);
      createdPorscadSessionRef.current = null;
      setIsCreateOpen(false);
      setCreateStep(0);
      setCreateError(null);
      setDrafts([emptyDraft()]);
      setForm({
        title: '',
        description: '',
        targetAudience: 'ALL',
        isMandatory: false,
        preventDuplicate: true,
        isAnonymous: false,
        startDate: gregorianToJalaliStr(new Date()),
        endDate: gregorianToJalaliStr(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
      });
      toast.success(
        porscadOk
          ? 'نظرسنجی با موفقیت ذخیره و فرم در پرس‌کاد ایجاد شد'
          : 'نظرسنجی با موفقیت ذخیره شد',
      );
      await fetchPolls();
    } catch (e: any) {
      const msg =
        e?.response?.data?.message ||
        e?.message ||
        'خطا در ایجاد نظرسنجی';
      const strMsg = typeof msg === 'string' ? msg : 'خطا در ایجاد نظرسنجی';
      toast.error(strMsg);
      setCreateError(strMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ——— Fill step-by-step ———
  const openPoll = async (poll: Poll) => {
    setActivePoll(poll);
    setFillStep(0);
    setStepHistory([]);
    setFillAnswers({});
    setFillError(null);
    setHasVoted(false);
    try {
      const detail = await apiClient.get<{
        poll: Poll;
        hasVoted: boolean;
        userVote?: { answers?: Record<string, unknown> };
      }>(`/polls/${poll.id}`);
      if (detail.data) {
        setHasVoted(!!detail.data.hasVoted);
        if (detail.data.userVote?.answers) {
          setFillAnswers(
            detail.data.userVote.answers as SurveyAnswers,
          );
        }
      }
    } catch {
      // ignore detail fail
    }
  };

  const closePoll = () => {
    setActivePoll(null);
    setFillStep(0);
    setStepHistory([]);
    setFillAnswers({});
    setFillError(null);
    setHasVoted(false);
  };

  const activeQuestions = useMemo(
    () => (activePoll ? legacyQuestionsFromPoll(activePoll) : []),
    [activePoll],
  );

  const isQuestionAnswered = (q: SurveyQuestion, index: number): boolean => {
    if (INFORMATIONAL_TYPES.has(q.type)) return true;
    const raw = fillAnswers[String(index)];
    if (raw === undefined || raw === null || raw === '') return false;
    if (Array.isArray(raw)) return raw.length > 0;
    return true;
  };

  const validateCurrentQuestionAnswer = (q: SurveyQuestion, raw: unknown): string | null => {
    if (INFORMATIONAL_TYPES.has(q.type)) return null;
    if (q.required !== false) {
      if (raw === undefined || raw === null || raw === '') {
        return 'پاسخ به این سوال الزامی است؛ لطفاً گزینه یا متن مورد نظر را وارد کنید.';
      }
      if (Array.isArray(raw) && raw.length === 0) {
        return 'حداقل یک گزینه را انتخاب کنید';
      }
    }
    if (raw === undefined || raw === null || raw === '') return null;

    const val = q.validation;
    if (!val) return null;

    // Number validations
    if (q.type === 'number') {
      const num = Number(raw);
      if (isNaN(num)) return 'لطفاً یک عدد معتبر وارد کنید';
      if (val.min !== undefined && num < val.min) {
        return `حداقل مقدار مجاز ${toPersianDigits(val.min)} است`;
      }
      if (val.max !== undefined && num > val.max) {
        return `حداکثر مقدار مجاز ${toPersianDigits(val.max)} است`;
      }
    }

    // Text length validations
    if (typeof raw === 'string') {
      if (val.minLength !== undefined && raw.length < val.minLength) {
        return `حداقل طول پاسخ ${toPersianDigits(val.minLength)} کاراکتر است (فعلی: ${toPersianDigits(raw.length)})`;
      }
      if (val.maxLength !== undefined && raw.length > val.maxLength) {
        return `حداکثر طول پاسخ ${toPersianDigits(val.maxLength)} کاراکتر است (فعلی: ${toPersianDigits(raw.length)})`;
      }
    }

    return null;
  };

  const canGoNext = (() => {
    const q = activeQuestions[fillStep];
    if (!q) return true;
    const err = validateCurrentQuestionAnswer(q, fillAnswers[String(fillStep)]);
    return !err;
  })();

  const handleNextStep = async () => {
    const q = activeQuestions[fillStep];
    if (!q) return;

    const currentAnswer = fillAnswers[String(fillStep)];
    const validationError = validateCurrentQuestionAnswer(q, currentAnswer);
    if (validationError) {
      setFillError(validationError);
      toast.error(validationError);
      return;
    }
    setFillError(null);

    // Check Jump Logic (Branching)
    if (q.jump_actions && q.jump_actions.length > 0) {
      const matched = q.jump_actions.find((act) => {
        if (Array.isArray(currentAnswer)) {
          return currentAnswer.includes(act.conditionValue);
        }
        return String(currentAnswer) === String(act.conditionValue);
      });

      if (matched) {
        if (matched.targetQuestionIndex === 'END') {
          // Jump to submit / finish
          await submitAllAnswers();
          return;
        }
        const targetIdx = Number(matched.targetQuestionIndex);
        if (!isNaN(targetIdx) && targetIdx >= 0 && targetIdx < activeQuestions.length) {
          setStepHistory((prev) => [...prev, fillStep]);
          setFillStep(targetIdx);
          return;
        }
      }
    }

    // Standard Next
    if (fillStep < activeQuestions.length - 1) {
      setStepHistory((prev) => [...prev, fillStep]);
      setFillStep((s) => s + 1);
    } else {
      await submitAllAnswers();
    }
  };

  const handlePreviousStep = () => {
    setFillError(null);
    if (stepHistory.length > 0) {
      const prevStep = stepHistory[stepHistory.length - 1];
      setStepHistory((prev) => prev.slice(0, -1));
      setFillStep(prevStep);
    } else {
      setFillStep((s) => Math.max(0, s - 1));
    }
  };

  const setAnswer = (index: number, value: SurveyAnswers[string]) => {
    setFillError(null);
    setFillAnswers((prev) => ({ ...prev, [String(index)]: value }));
  };

  const toggleChoice = (
    index: number,
    option: string,
    multi: boolean,
    maxSel: number,
  ) => {
    setFillError(null);
    const key = String(index);
    const current = fillAnswers[key];
    if (!multi) {
      setAnswer(index, option);
      return;
    }
    const arr = Array.isArray(current) ? [...(current as string[])] : [];
    if (arr.includes(option)) {
      setAnswer(
        index,
        arr.filter((o) => o !== option),
      );
    } else {
      if (arr.length >= maxSel) {
        toast.error(`حداکثر ${toPersianDigits(maxSel)} گزینه می‌توانید انتخاب کنید`);
        return;
      }
      setAnswer(index, [...arr, option]);
    }
  };

  const submitAllAnswers = async () => {
    if (!activePoll) return;
    const questions = activeQuestions;

    for (let i = 0; i < questions.length; i++) {
      if (questions[i].required === false) continue;
      if (INFORMATIONAL_TYPES.has(questions[i].type)) continue;
      if (!isQuestionAnswered(questions[i], i)) {
        setFillStep(i);
        const errMsg = `پاسخ به سوال ${toPersianDigits(i + 1)} («${questions[i].title}») الزامی است`;
        setFillError(errMsg);
        toast.error(errMsg);
        return;
      }
    }

    setIsSubmittingAnswers(true);
    try {
      let porscadResponseId: string | undefined;
      let porscadError: string | null = null;

      const questionIds = questions.map((q) => q.porscadQuestionId || '');

      if (activePoll.porscadFormId) {
        const result = await porscadSurvey.submitSurveyAnswers({
          formPublicId: activePoll.porscadFormPublicId || undefined,
          formId: activePoll.porscadFormId,
          questionIds,
          questions,
          answersByIndex: fillAnswers,
          respondentName,
        });
        if (result.success) {
          porscadResponseId = result.responseId;
        } else {
          porscadError = result.message || 'ثبت در پرس‌کاد ناموفق بود';
        }
      }

      await apiClient.post(`/polls/${activePoll.id}/answers`, {
        answers: fillAnswers,
        porscadResponseId,
        respondentName,
      });

      if (porscadError) {
        toast.error(`پاسخ محلی ثبت شد؛ ${porscadError}`);
      } else {
        toast.success('پاسخ‌های شما با موفقیت ثبت گردید');
      }

      setHasVoted(true);
      closePoll();
      await fetchPolls();
    } catch (e: any) {
      const msg =
        e?.response?.data?.message || e?.message || 'خطا در ثبت پاسخ';
      toast.error(typeof msg === 'string' ? msg : 'خطا در ثبت پاسخ');
    } finally {
      setIsSubmittingAnswers(false);
    }
  };

  // ——— Analytics ———
  const openAnalytics = async (poll: Poll) => {
    if (!canViewResults) {
      toast.error('شما دسترسی لازم برای مشاهده نتایج و آمار این نظرسنجی را ندارید');
      return;
    }
    setAnalyticsPollId(poll.id);
    setAnalytics(null);
    setLiveAnalytics(null);
    setIsAnalyticsLoading(true);
    try {
      const res = await apiClient.get<AnalyticsData>(`/polls/${poll.id}/analytics`);
      if (res.data) setAnalytics(res.data);

      // Auto-fetch live Porscad analytics if linked to Porscad
      if (poll.porscadFormId) {
        const questions = legacyQuestionsFromPoll(poll);
        const questionIds = questions.map((q) => q.porscadQuestionId || '');
        try {
          const live = await porscadSurvey.fetchLiveAnalytics({
            formId: poll.porscadFormId,
            questionIds,
            questions,
          });
          setLiveAnalytics(live);
        } catch (liveErr) {
          console.warn('Live Porscad analytics auto-fetch error:', liveErr);
        }
      }
    } catch {
      toast.error('خطا در دریافت آنالیتیکس');
    } finally {
      setIsAnalyticsLoading(false);
    }
  };

  const refreshLiveAnalytics = async () => {
    if (!analyticsPollId) return;
    const poll = polls.find((p) => p.id === analyticsPollId);
    if (!poll) return;
    const questions = legacyQuestionsFromPoll(poll);
    const questionIds = questions.map((q) => q.porscadQuestionId || '');
    setIsRefreshingLive(true);
    try {
      const live = await porscadSurvey.fetchLiveAnalytics({
        formId: poll.porscadFormId,
        questionIds,
        questions,
      });
      setLiveAnalytics(live);
      toast.success('داده‌های زنده پرس‌کاد با موفقیت دریافت شد');
    } catch (e: any) {
      toast.error(e?.message || 'خطا در دریافت آنالیتیکس پرس‌کاد');
    } finally {
      setIsRefreshingLive(false);
    }
  };

  const renderAnswerControl = (q: SurveyQuestion, index: number) => {
    const value = fillAnswers[String(index)];

    if (INFORMATIONAL_TYPES.has(q.type)) {
      return (
        <div className="p-5 rounded-2xl border border-dashed border-primary/40 bg-primary/5 text-center space-y-2">
          <div className="inline-flex p-2 rounded-xl bg-primary/10 text-primary font-black text-xs">
            {q.type === 'group' ? 'گروه و بخش‌بندی سوالات' : 'پیام توضیحی'}
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {q.description || 'این بخش صرفاً جهت راهنمایی است و نیاز به انتخاب یا پاسخ ندارد.'}
          </p>
        </div>
      );
    }

    if (q.type === 'yes_no') {
      return (
        <div className="grid grid-cols-2 gap-3.5">
          {[
            { label: 'بله', color: 'hover:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/30' },
            { label: 'خیر', color: 'hover:border-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30' },
          ].map((item) => {
            const selected = value === item.label;
            return (
              <button
                key={item.label}
                type="button"
                onClick={() => setAnswer(index, item.label)}
                className={`h-16 rounded-2xl border-2 text-base font-black transition-all flex items-center justify-center gap-2 ${
                  selected
                    ? item.label === 'بله'
                      ? 'border-emerald-500 bg-emerald-500 text-white shadow-lg shadow-emerald-500/25 scale-[1.02]'
                      : 'border-rose-500 bg-rose-500 text-white shadow-lg shadow-rose-500/25 scale-[1.02]'
                    : `border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-foreground ${item.color}`
                }`}
              >
                <span>{item.label}</span>
                {selected && <Check className="w-5 h-5 stroke-[3]" />}
              </button>
            );
          })}
        </div>
      );
    }

    if (q.type === 'likert') {
      const likertSteps = [
        { label: 'کاملاً موافق', icon: SmilePlus, color: 'border-emerald-500 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200', iconColor: 'text-emerald-600 dark:text-emerald-400' },
        { label: 'موافق', icon: Smile, color: 'border-teal-500 bg-teal-50 text-teal-900 dark:bg-teal-950/40 dark:text-teal-200', iconColor: 'text-teal-600 dark:text-teal-400' },
        { label: 'ممتنع / خنثی', icon: Meh, color: 'border-amber-500 bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200', iconColor: 'text-amber-600 dark:text-amber-400' },
        { label: 'مخالف', icon: Frown, color: 'border-orange-500 bg-orange-50 text-orange-900 dark:bg-orange-950/40 dark:text-orange-200', iconColor: 'text-orange-600 dark:text-orange-400' },
        { label: 'کاملاً مخالف', icon: Angry, color: 'border-rose-500 bg-rose-50 text-rose-900 dark:bg-rose-950/40 dark:text-rose-200', iconColor: 'text-rose-600 dark:text-rose-400' },
      ];
      const options = q.options && q.options.length === 5 ? q.options : likertSteps.map((s) => s.label);

      return (
        <div className="space-y-2.5">
          {options.map((opt, oi) => {
            const selected = value === opt;
            const step = likertSteps[oi] || likertSteps[2];
            const StepIcon = step.icon;
            return (
              <button
                key={opt}
                type="button"
                onClick={() => setAnswer(index, opt)}
                className={`w-full flex items-center justify-between p-3.5 rounded-2xl border-2 text-right transition-all font-bold text-xs sm:text-sm ${
                  selected
                    ? `${step.color} shadow-sm ring-2 ring-primary/20 scale-[1.01]`
                    : 'border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-foreground hover:border-primary/40'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <StepIcon className={`w-5 h-5 shrink-0 ${step.iconColor}`} />
                  <span>{opt}</span>
                </div>
                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    selected ? 'border-primary bg-primary text-white' : 'border-gray-300 dark:border-zinc-600'
                  }`}
                >
                  {selected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </div>
              </button>
            );
          })}
        </div>
      );
    }

    if (q.type === 'rating') {
      const current = typeof value === 'number' ? value : 0;
      return (
        <div className="py-4 space-y-3">
          <div className="flex items-center justify-center gap-2.5 sm:gap-4">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setAnswer(index, star)}
                className={`p-2.5 rounded-2xl transition-all ${
                  current >= star
                    ? 'text-amber-400 bg-amber-400/15 scale-110 shadow-sm'
                    : 'text-gray-300 dark:text-zinc-700 hover:text-amber-400/70 hover:scale-105'
                }`}
              >
                <Star className={`w-8 h-8 sm:w-10 sm:h-10 ${current >= star ? 'fill-amber-400' : ''}`} />
              </button>
            ))}
          </div>
          {current > 0 && (
            <p className="text-center font-black text-xs text-amber-600 dark:text-amber-400">
              {toPersianDigits(current)} از ۵ ستاره انتخاب شد
            </p>
          )}
        </div>
      );
    }

    if (q.type === 'opinion_scale' || q.type === 'nps') {
      const current = typeof value === 'number' ? value : null;
      const nums =
        q.type === 'nps'
          ? Array.from({ length: 11 }, (_, i) => i)
          : Array.from({ length: 10 }, (_, i) => i + 1);

      return (
        <div className="space-y-3 py-2">
          <div className="grid grid-cols-6 sm:grid-cols-11 gap-1.5 sm:gap-2">
            {nums.map((n) => {
              const selected = current === n;
              return (
                <button
                  key={n}
                  type="button"
                  onClick={() => setAnswer(index, n)}
                  className={`h-12 rounded-xl border-2 text-xs sm:text-sm font-black transition-all flex items-center justify-center ${
                    selected
                      ? 'border-primary bg-primary text-white shadow-md shadow-primary/25 scale-105'
                      : 'border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-foreground hover:border-primary/50'
                  }`}
                >
                  {toPersianDigits(n)}
                </button>
              );
            })}
          </div>
          <div className="flex justify-between text-[11px] font-bold text-muted-foreground px-1">
            <span>{q.type === 'nps' ? 'اصلاً پیشنهاد نمی‌کنم (۰)' : 'خیلی ضعیف (۱)'}</span>
            <span>{q.type === 'nps' ? 'قطعاً پیشنهاد می‌کنم (۱۰)' : 'عالی و بی‌نظیر (۱۰)'}</span>
          </div>
        </div>
      );
    }

    if (q.type === 'dropdown') {
      const options = q.options || [];
      return (
        <select
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => setAnswer(index, e.target.value)}
          className="w-full h-12 px-3.5 rounded-2xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-foreground text-sm font-medium focus:border-primary focus:outline-hidden"
        >
          <option value="">انتخاب از فهرست گزینه‌ها…</option>
          {options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      );
    }

    if (q.type === 'ranking') {
      const options = q.options || [];
      const ordered = Array.isArray(value) ? (value as string[]) : [];
      const remaining = options.filter((o) => !ordered.includes(o));
      return (
        <div className="space-y-3">
          <div className="space-y-2">
            {ordered.map((opt, ri) => (
              <div
                key={opt}
                className="flex items-center justify-between gap-2 p-3.5 rounded-2xl border-2 border-primary/50 bg-primary/5 text-xs sm:text-sm font-bold shadow-xs"
              >
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-xs font-black">
                    {toPersianDigits(ri + 1)}
                  </span>
                  <span>{opt}</span>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setAnswer(
                      index,
                      ordered.filter((o) => o !== opt),
                    )
                  }
                  className="text-xs text-rose-500 hover:text-rose-700 font-bold px-2 py-1"
                >
                  حذف
                </button>
              </div>
            ))}
          </div>
          {remaining.length > 0 && (
            <div className="space-y-2 pt-1">
              <p className="text-[11px] font-bold text-muted-foreground">
                افزودن گزینه‌ها به ترتیب اولویت شما:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {remaining.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setAnswer(index, [...ordered, opt])}
                    className="text-right p-3 rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-bold hover:border-primary/50 transition-all"
                  >
                    + {opt}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      );
    }

    if (q.type === 'matrix') {
      const options = q.options || [];
      const selected = typeof value === 'string' ? value : '';
      return (
        <div className="space-y-2">
          {options.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => setAnswer(index, opt)}
              className={`w-full flex items-center justify-between p-3.5 rounded-2xl border text-right transition-all text-xs sm:text-sm font-bold ${
                selected === opt
                  ? 'border-primary bg-primary/10 text-primary shadow-sm ring-2 ring-primary/20'
                  : 'border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-primary/40'
              }`}
            >
              <span>{opt}</span>
              <span
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  selected === opt ? 'border-primary bg-primary text-white' : 'border-gray-300 dark:border-zinc-600'
                }`}
              >
                {selected === opt && <Check className="w-3.5 h-3.5 stroke-[3]" />}
              </span>
            </button>
          ))}
        </div>
      );
    }

    if (q.type === 'long_text') {
      const textVal = typeof value === 'string' ? value : '';
      const minLen = q.validation?.minLength;
      const maxLen = q.validation?.maxLength;
      return (
        <div className="space-y-2">
          <textarea
            value={textVal}
            onChange={(e) => setAnswer(index, e.target.value)}
            rows={5}
            maxLength={maxLen}
            className="w-full px-4 py-3 rounded-2xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm font-medium focus:border-primary focus:outline-hidden leading-relaxed"
            placeholder={q.placeholder || 'پاسخ و نظرات کامل خود را در این بخش بنویسید…'}
          />
          <div className="flex items-center justify-between text-[11px] text-muted-foreground px-1">
            <div className="flex gap-2">
              {minLen !== undefined && (
                <span className={textVal.length < minLen ? 'text-amber-600 font-bold' : 'text-emerald-600 font-bold'}>
                  حداقل: {toPersianDigits(minLen)} کاراکتر
                </span>
              )}
              {maxLen !== undefined && (
                <span>حداکثر: {toPersianDigits(maxLen)} کاراکتر</span>
              )}
            </div>
            <span className="font-mono">
              {toPersianDigits(textVal.length)} {maxLen ? `/ ${toPersianDigits(maxLen)}` : ''} کاراکتر
            </span>
          </div>
        </div>
      );
    }

    if (q.type === 'number') {
      const minVal = q.validation?.min;
      const maxVal = q.validation?.max;
      const stepVal = q.validation?.step;
      const numVal = typeof value === 'number' ? value : (value !== '' && !isNaN(Number(value)) ? Number(value) : null);
      const isOutOfBounds = numVal !== null && ((minVal !== undefined && numVal < minVal) || (maxVal !== undefined && numVal > maxVal));

      return (
        <div className="space-y-2">
          <input
            type="number"
            min={minVal}
            max={maxVal}
            step={stepVal}
            value={typeof value === 'number' ? String(value) : ''}
            onChange={(e) =>
              setAnswer(
                index,
                e.target.value === '' ? '' : Number(e.target.value),
              )
            }
            className={`w-full h-12 px-4 rounded-2xl border bg-white dark:bg-zinc-900 text-sm font-medium focus:border-primary focus:outline-hidden font-mono ${
              isOutOfBounds ? 'border-rose-500 ring-1 ring-rose-500' : 'border-gray-200 dark:border-zinc-700'
            }`}
            placeholder={q.placeholder || 'مثلاً: ۱۲۳'}
          />
          {(minVal !== undefined || maxVal !== undefined) && (
            <div className="flex items-center justify-between text-[11px] text-muted-foreground px-1">
              <span className={isOutOfBounds ? 'text-rose-500 font-bold' : 'text-muted-foreground'}>
                محدوده مجاز:{' '}
                {minVal !== undefined && `از ${toPersianDigits(minVal)} `}
                {maxVal !== undefined && `تا ${toPersianDigits(maxVal)}`}
              </span>
              {stepVal !== undefined && (
                <span>گام تغییرات: {toPersianDigits(stepVal)}</span>
              )}
            </div>
          )}
        </div>
      );
    }

    if (q.type === 'file_upload') {
      const allowedExts = q.validation?.allowedExtensions || [];
      const maxMb = q.validation?.maxFileSizeMb;

      return (
        <div className="space-y-2">
          <label className="flex flex-col items-center justify-center gap-2 p-6 rounded-2xl border-2 border-dashed border-primary/30 bg-primary/5 text-xs font-bold text-muted-foreground cursor-pointer hover:border-primary/60 transition-all min-h-[90px]">
            <input
              type="file"
              className="hidden"
              accept={allowedExts.length > 0 ? allowedExts.map((ext) => `.${ext.replace(/^\./, '')}`).join(',') : undefined}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (!f) return;

                if (maxMb) {
                  const maxBytes = maxMb * 1024 * 1024;
                  if (f.size > maxBytes) {
                    toast.error(`حجم فایل بیش از سقف مجاز (${toPersianDigits(maxMb)} مگابایت) است`);
                    e.target.value = '';
                    return;
                  }
                }

                if (allowedExts.length > 0) {
                  const ext = f.name.split('.').pop()?.toLowerCase() || '';
                  const cleanAllowed = allowedExts.map((x) => x.replace(/^\./, '').toLowerCase());
                  if (!cleanAllowed.includes(ext)) {
                    toast.error(`فرمت فایل مجاز نیست. فرمت‌های مجاز: ${cleanAllowed.join(', ')}`);
                    e.target.value = '';
                    return;
                  }
                }

                setAnswer(index, `${f.name} (${Math.round(f.size / 1024)} KB)`);
              }}
            />
            {typeof value === 'string' && value ? (
              <div className="flex items-center gap-2 text-primary font-black">
                <CheckCircle2 className="w-4 h-4" />
                <span>فایل انتخاب شد: {value}</span>
              </div>
            ) : (
              <div className="text-center space-y-1">
                <p className="text-foreground font-black">انتخاب فایل یا سند</p>
                <p className="text-[10px] text-muted-foreground">کلیک کنید تا فایل ضمیمه شود</p>
              </div>
            )}
          </label>
          {(allowedExts.length > 0 || maxMb) && (
            <div className="flex flex-wrap items-center justify-between text-[11px] text-muted-foreground px-1 gap-2">
              {allowedExts.length > 0 && (
                <span>فرمت‌های مجاز: {allowedExts.join(', ')}</span>
              )}
              {maxMb && (
                <span>حداکثر حجم مجاز: {toPersianDigits(maxMb)} مگابایت</span>
              )}
            </div>
          )}
        </div>
      );
    }

    const textTypes = new Set([
      'short_text',
      'email',
      'phone_ir',
      'link',
      'telegram_id',
    ]);
    if (textTypes.has(q.type)) {
      const inputType = q.type === 'email' ? 'email' : 'text';
      const defaultPlaceholder =
        q.type === 'email'
          ? 'example@email.com'
          : q.type === 'phone_ir'
            ? '09123456789'
            : q.type === 'link'
              ? 'https://example.com'
              : q.type === 'telegram_id'
                ? 'username@'
                : 'پاسخ خود را بنویسید…';
      const textVal = typeof value === 'string' ? value : '';
      const minLen = q.validation?.minLength;
      const maxLen = q.validation?.maxLength;

      return (
        <div className="space-y-2">
          <input
            type={inputType}
            value={textVal}
            maxLength={maxLen}
            onChange={(e) => setAnswer(index, e.target.value)}
            className="w-full h-12 px-4 rounded-2xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm font-medium focus:border-primary focus:outline-hidden"
            placeholder={q.placeholder || defaultPlaceholder}
          />
          {(minLen !== undefined || maxLen !== undefined) && (
            <div className="flex items-center justify-between text-[11px] text-muted-foreground px-1">
              <div className="flex gap-2">
                {minLen !== undefined && (
                  <span className={textVal.length < minLen ? 'text-amber-600 font-bold' : 'text-emerald-600 font-bold'}>
                    حداقل: {toPersianDigits(minLen)} کاراکتر
                  </span>
                )}
                {maxLen !== undefined && (
                  <span>حداکثر: {toPersianDigits(maxLen)} کاراکتر</span>
                )}
              </div>
              <span className="font-mono">
                {toPersianDigits(textVal.length)} {maxLen ? `/ ${toPersianDigits(maxLen)}` : ''}
              </span>
            </div>
          )}
        </div>
      );
    }

    // choice / picture_choice / legacy fallback
    const options = q.options || [];
    const multi = (q.maxSelections || 1) > 1;
    const maxSel = q.maxSelections || 1;
    const selectedList = Array.isArray(value)
      ? (value as string[])
      : typeof value === 'string' && value
        ? [value]
        : [];

    return (
      <div className="space-y-2">
        {multi && (
          <p className="text-[11px] font-bold text-muted-foreground mb-1">
            امکان انتخاب تا {toPersianDigits(maxSel)} گزینه
          </p>
        )}
        {options.map((opt) => {
          const selected = selectedList.includes(opt);
          return (
            <button
              key={opt}
              type="button"
              onClick={() => toggleChoice(index, opt, multi, maxSel)}
              className={`w-full flex items-center justify-between p-3.5 rounded-2xl border text-right transition-all text-xs sm:text-sm font-bold ${
                selected
                  ? 'border-primary bg-primary/10 text-primary shadow-sm ring-2 ring-primary/20'
                  : 'border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-primary/40'
              }`}
            >
              <span>{opt}</span>
              <span
                className={`w-5 h-5 ${multi ? 'rounded-md' : 'rounded-full'} border-2 flex items-center justify-center ${
                  selected ? 'border-primary bg-primary text-white' : 'border-gray-300 dark:border-zinc-600'
                }`}
              >
                {selected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
              </span>
            </button>
          );
        })}
      </div>
    );
  };

  const renderAnalyticsView = () => {
    if (!canViewResults) return null;
    const poll = polls.find((p) => p.id === analyticsPollId);
    const shown = liveAnalytics || analytics;
    return (
      <Modal
        isOpen={!!analyticsPollId}
        onClose={() => setAnalyticsPollId(null)}
        title={`آنالیتیکس زنده نظرسنجی: «${poll?.title || ''}»`}
        maxWidth="3xl"
      >
        <div className="space-y-4 pt-1">
          <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center gap-2 text-xs font-black text-zinc-700 dark:text-zinc-300">
              <BarChart3 className="w-4 h-4 text-primary" />
              <span>
                {liveAnalytics
                  ? 'منبع: سرور زنده پرس‌کاد (Porscad Cloud Sync)'
                  : analytics?.porscadLinked
                    ? 'منبع: پاسخ‌های ثبت‌شده در پایگاه داده'
                    : 'منبع: پاسخ‌های محلی'}
              </span>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={refreshLiveAnalytics}
              disabled={isRefreshingLive}
              className="gap-1.5 text-xs font-bold"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingLive ? 'animate-spin' : ''}`} />
              {isRefreshingLive ? 'در حال دریافت…' : 'به‌روزرسانی آنالیتیکس پرس‌کاد'}
            </Button>
          </div>

          {isAnalyticsLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-20 rounded-2xl" />
              <Skeleton className="h-40 rounded-2xl" />
            </div>
          ) : !shown ? (
            <div className="p-8 text-center text-sm text-gray-500">
              داده‌ای برای نمایش موجود نیست
            </div>
          ) : (
            <>
              {/* Summary Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                  <p className="text-[11px] font-bold text-gray-500 mb-1">تعداد کل پاسخ‌دهندگان</p>
                  <p className="text-2xl font-black text-foreground font-mono">
                    {toPersianDigits(shown.totalRespondents ?? analytics?.totalResponses ?? 0)}
                  </p>
                </div>
                <div className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                  <p className="text-[11px] font-bold text-gray-500 mb-1">تعداد سوالات فرم</p>
                  <p className="text-2xl font-black text-foreground font-mono">
                    {toPersianDigits(shown.perQuestion?.length || 0)}
                  </p>
                </div>
                <div className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                  <p className="text-[11px] font-bold text-gray-500 mb-1">وضعیت پرس‌کاد</p>
                  <p className="text-xs font-black text-emerald-600 dark:text-emerald-400 mt-2 flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{poll?.porscadFormId ? 'متصل به سرور' : 'محلی'}</span>
                  </p>
                </div>
              </div>

              {/* Per Question Detailed Analytics */}
              <div className="space-y-3">
                {(shown.perQuestion || []).map((q: any) => (
                  <div
                    key={q.index}
                    className="rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4 space-y-3 bg-white dark:bg-zinc-900"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-sm font-black text-foreground">
                        {toPersianDigits(q.index + 1)}. {q.title}
                      </h4>
                      <Badge variant="neutral">
                        {TYPE_LABEL[q.type as QuestionType] || q.type}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-4 text-[11px] font-bold text-gray-500">
                      <span>تعداد پاسخ‌ها: {toPersianDigits(q.answered)}</span>
                      {q.avgRating != null && (
                        <span className="text-amber-600 dark:text-amber-400 font-black flex items-center gap-1">
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400 shrink-0" />
                          میانگین امتیاز: {toPersianDigits(q.avgRating)}
                        </span>
                      )}
                    </div>

                    {/* Progress bars for options */}
                    {q.options?.length > 0 && (
                      <div className="space-y-2 pt-1">
                        {q.options.map((opt: any) => (
                          <div key={opt.text} className="space-y-1">
                            <div className="flex justify-between text-xs font-bold">
                              <span className="text-foreground">{opt.text}</span>
                              <span className="text-gray-500 font-mono">
                                {toPersianDigits(opt.count)} رای ({toPersianDigits(opt.percentage || 0)}٪)
                              </span>
                            </div>
                            <div className="h-2 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  opt.text.includes('موافق')
                                    ? 'bg-emerald-500'
                                    : opt.text.includes('مخالف')
                                      ? 'bg-rose-500'
                                      : 'bg-primary'
                                }`}
                                style={{ width: `${opt.percentage || 0}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Text / Input Responses List */}
                    {q.textAnswers && q.textAnswers.length > 0 && (
                      <div className="space-y-1.5 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                        <p className="text-[11px] font-bold text-muted-foreground">
                          پاسخ‌های ثبت‌شده کاربران:
                        </p>
                        <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                          {q.textAnswers.map((item: any, ti: number) => (
                            <div
                              key={ti}
                              className="p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 text-xs font-medium text-foreground leading-relaxed border border-zinc-200/60 dark:border-zinc-700/60"
                            >
                              {item.value || item}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Individual Responses List */}
              {analytics?.responses && analytics.responses.length > 0 && (
                <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4 bg-white dark:bg-zinc-900 space-y-2">
                  <h4 className="text-xs font-black text-foreground">
                    لیست پاسخ‌دهندگان ({toPersianDigits(analytics.responses.length)})
                  </h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {analytics.responses.map((r) => (
                      <div
                        key={r.id}
                        className="flex items-center justify-between text-xs p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800"
                      >
                        <span className="font-bold text-foreground">
                          {r.respondentName}
                        </span>
                        <span className="text-gray-500 font-mono text-[11px]">
                          {formatJalaliDisplay(r.createdAt, true)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </Modal>
    );
  };

  return (
    <div className="space-y-4 sm:space-y-5 pb-12 max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 animate-in fade-in duration-300">
      {/* 1. Header Master Panel */}
      <div className="bg-white dark:bg-[#151C28] rounded-2xl border-[1.5px] border-primary-dark/30 dark:border-[#242F42] shadow-[2px_2px_0_#59BBAF] dark:shadow-[2px_2px_0_#0B0F17] p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3">
          {/* Title and Icon */}
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-primary/10 text-primary dark:text-primary border border-primary/25 flex items-center justify-center font-black shadow-2xs shrink-0">
              <Vote className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="flex items-center gap-2 min-w-0">
              <h1 className="text-lg sm:text-2xl font-black text-ink-darker dark:text-white truncate">
                نظرسنجی
              </h1>
              {filterCounts.active > 0 && (
                <span className="min-w-[20px] h-[20px] px-1.5 rounded-full bg-rose-500 text-white text-[11px] font-black flex items-center justify-center leading-none animate-pulse shadow-xs select-none">
                  {toPersianDigits(filterCounts.active)}
                </span>
              )}
            </div>
          </div>

          {/* Action Button */}
          {canCreate && (
            <Button
              onClick={openCreate}
              className="h-9 sm:h-10 px-4 rounded-xl font-black text-xs sm:text-sm bg-primary hover:bg-primary/90 text-primary-foreground border-2 border-black shadow-[2px_2px_0_#1F413D] dark:shadow-[2px_2px_0_#0B0F17] flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>افزودن نظرسنجی جدید</span>
            </Button>
          )}
        </div>
      </div>

      {/* 2. Fixed Tabs & Search Toolbar */}
      <div className="p-3 sm:p-4 rounded-2xl bg-white dark:bg-[#151C28] border border-gray-200/80 dark:border-[#242F42] shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Fixed Segmented Tabs: فعال، برنامه‌ریزی شده، پایان‌یافته */}
        <div className="inline-flex items-center p-1 rounded-xl bg-gray-100/90 dark:bg-gray-800/90 border border-gray-200/70 dark:border-gray-700/70 w-full sm:w-auto">
          {/* Tab 1: فعال */}
          <button
            type="button"
            onClick={() => setActiveFilter('ACTIVE')}
            className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg text-xs font-black transition-all cursor-pointer active:translate-x-[1px] active:translate-y-[1px] ${
              activeFilter === 'ACTIVE'
                ? 'bg-white dark:bg-[#151C28] text-primary-dark dark:text-primary border border-primary/25 dark:border-gray-700 shadow-[1.5px_1.5px_0_#59BBAF] dark:shadow-[1.5px_1.5px_0_#0B0F17]'
                : 'text-gray-600 dark:text-gray-400 hover:text-ink-darker dark:hover:text-white font-bold'
            }`}
          >
            فعال
          </button>

          {/* Tab 2: برنامه‌ریزی شده */}
          <button
            type="button"
            onClick={() => setActiveFilter('SCHEDULED')}
            className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg text-xs font-black transition-all cursor-pointer active:translate-x-[1px] active:translate-y-[1px] ${
              activeFilter === 'SCHEDULED'
                ? 'bg-white dark:bg-[#151C28] text-primary-dark dark:text-primary border border-primary/25 dark:border-gray-700 shadow-[1.5px_1.5px_0_#59BBAF] dark:shadow-[1.5px_1.5px_0_#0B0F17]'
                : 'text-gray-600 dark:text-gray-400 hover:text-ink-darker dark:hover:text-white font-bold'
            }`}
          >
            برنامه‌ریزی شده
          </button>

          {/* Tab 3: پایان‌یافته */}
          <button
            type="button"
            onClick={() => setActiveFilter('ENDED')}
            className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg text-xs font-black transition-all cursor-pointer active:translate-x-[1px] active:translate-y-[1px] ${
              activeFilter === 'ENDED'
                ? 'bg-white dark:bg-[#151C28] text-primary-dark dark:text-primary border border-primary/25 dark:border-gray-700 shadow-[1.5px_1.5px_0_#59BBAF] dark:shadow-[1.5px_1.5px_0_#0B0F17]'
                : 'text-gray-600 dark:text-gray-400 hover:text-ink-darker dark:hover:text-white font-bold'
            }`}
          >
            پایان‌یافته
          </button>
        </div>

        {/* Quick Search */}
        <div className="relative min-w-[220px] sm:min-w-[280px]">
          <Search className="w-4 h-4 text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="جستجو در نظرسنجی‌ها..."
            className="w-full h-10 pr-9 pl-3 rounded-xl border border-gray-200 dark:border-[#242F42] bg-gray-50 dark:bg-[#1C2536] text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all placeholder:text-muted-foreground"
          />
        </div>
      </div>

      {/* 3. Poll Cards Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
          <Skeleton className="h-56 rounded-2xl" />
          <Skeleton className="h-56 rounded-2xl" />
        </div>
      ) : filteredPolls.length === 0 ? (
        /* Empty State */
        <div className="text-center py-16 px-4 bg-white dark:bg-[#151C28] rounded-2xl border-[1.5px] border-dashed border-gray-200 dark:border-gray-800 space-y-3">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto shadow-sm bg-primary/10 text-primary">
            <Vote className="w-8 h-8 stroke-[2]" />
          </div>
          <h4 className="text-base sm:text-lg font-black text-ink-darker dark:text-white">
            نظرسنجی یا فرمی در این بخش یافت نشد
          </h4>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
            {searchQuery
              ? 'هیچ فرمی با عبارت جستجو شده همخوانی ندارد. لطفاً عبارت دیگری را امتحان کنید.'
              : activeFilter === 'ACTIVE'
              ? 'در حال حاضر نظرسنجی فعالی برای پاسخ‌دهی وجود ندارد.'
              : activeFilter === 'SCHEDULED'
              ? 'در حال حاضر نظرسنجی برنامه‌ریزی‌شده‌ای در سیستم ثبت نشده است.'
              : 'هنوز نظرسنجی پایان‌یافته‌ای در سامانه ثبت نشده است.'}
          </p>
          {searchQuery && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSearchQuery('')}
              className="text-xs font-bold rounded-xl mt-2"
            >
              پاک کردن جستجو
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4 items-start">
          {filteredPolls.map((poll) => {
            const questions = legacyQuestionsFromPoll(poll);
            const archived = !!poll.isArchived;
            const manuallyClosed = !!poll.isClosed;
            const dateEnded = new Date(poll.endDate) < now;
            const isClosed = manuallyClosed || dateEnded;
            const isFuture = new Date(poll.startDate) > now;
            const linked = !!poll.porscadFormId;
            const totalVotes = poll._count?.votes ?? 0;
            const canReopen = manuallyClosed && !archived && !dateEnded;

            const audienceConfig = {
              ALL: {
                label: 'عمومی (همه)',
                className: 'bg-primary/10 text-primary-dark dark:text-primary border-primary/25',
              },
              STUDENTS: {
                label: 'دانش‌آموزان',
                className: 'bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border-sky-300 dark:border-sky-800',
              },
              PARENTS: {
                label: 'اولیا',
                className: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800',
              },
              TEACHERS: {
                label: 'معلمان',
                className: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800',
              },
              STAFF: {
                label: 'کادر مدرسه',
                className: 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-800',
              },
            }[poll.targetAudience] || {
              label: 'عمومی',
              className: 'bg-primary/10 text-primary-dark dark:text-primary border-primary/25',
            };

            const statusInfo = (() => {
              if (archived) {
                return {
                  label: 'آرشیو شده',
                  className: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-300 dark:border-gray-700',
                  dotColor: 'bg-gray-400',
                  isLive: false,
                };
              }
              if (manuallyClosed) {
                return {
                  label: 'بسته‌شده',
                  className: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-800',
                  dotColor: 'bg-amber-500',
                  isLive: false,
                };
              }
              if (dateEnded) {
                return {
                  label: 'پایان‌یافته',
                  className: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-300 dark:border-gray-700',
                  dotColor: 'bg-gray-400',
                  isLive: false,
                };
              }
              if (isFuture) {
                return {
                  label: 'برنامه‌ریزی شده',
                  className: 'bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border-sky-300 dark:border-sky-800',
                  dotColor: 'bg-sky-500',
                  isLive: false,
                };
              }
              return {
                label: 'در حال برگزاری',
                className: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800',
                dotColor: 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]',
                isLive: true,
              };
            })();

            const creatorName = poll.createdBy
              ? `${poll.createdBy.firstName || ''} ${poll.createdBy.lastName || ''}`.trim() || 'راهبر مدرسه'
              : 'راهبری مدرسه';

            const questionsCount = questions.length || poll.options?.length || 0;

            return (
              <div
                key={poll.id}
                className="p-5 rounded-2xl bg-white dark:bg-[#151C28] border-[1.5px] border-gray-200/90 dark:border-[#242F42] hover:border-primary/60 dark:hover:border-primary/60 shadow-xs hover:shadow-[3px_3px_0_#59BBAF] dark:hover:shadow-[3px_3px_0_#1F413D] transition-all group select-none relative z-0"
              >
                <div className="space-y-3">
                  {/* Top Row: Category Badge (Right) & Status Badge (Left) */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                      <span className={`text-[11px] px-2.5 py-1 rounded-lg font-black border ${audienceConfig.className}`}>
                        {audienceConfig.label}
                      </span>

                      {poll.isAnonymous && (
                        <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900/40">
                          <Lock className="w-2.5 h-2.5" />
                          <span>ناشناس</span>
                        </span>
                      )}

                      {poll.isMandatory && (
                        <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md font-bold bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-900/40">
                          <AlertCircle className="w-2.5 h-2.5" />
                          <span>الزامی</span>
                        </span>
                      )}

                      {linked && (
                        <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md font-black bg-primary/10 text-primary border border-primary/20">
                          <Sparkles className="w-2.5 h-2.5" />
                          <span>پرس‌کاد</span>
                        </span>
                      )}
                    </div>

                    <span
                      className={`relative z-0 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border transition-colors select-none shrink-0 ${statusInfo.className}`}
                    >
                      <span className="relative flex h-2 w-2">
                        {statusInfo.isLive && (
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                        )}
                        <span className={`relative inline-flex rounded-full h-2 w-2 ${statusInfo.dotColor}`} />
                      </span>
                      <span>{statusInfo.label}</span>
                    </span>
                  </div>

                  {/* Title */}
                  <div>
                    <h3 className="font-black text-base text-ink-darker dark:text-white leading-snug group-hover:text-primary transition-colors line-clamp-2">
                      {poll.title}
                    </h3>
                  </div>

                  {/* Creator & Questions Metadata (Matching Lesson/Teacher Row) */}
                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground dark:text-slate-400 font-medium">
                    <div className="flex items-center gap-1.5 font-bold text-ink-darker dark:text-slate-200">
                      <User className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span>{creatorName}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <HelpCircle className="w-3.5 h-3.5 text-sec shrink-0" />
                      <span>{toPersianDigits(questionsCount)} سوال</span>
                    </div>
                  </div>

                  {/* Timing & Metrics Matrix Box (Exact Exam & Homework Card Box) */}
                  <div className="bg-gray-50/80 dark:bg-[#1C2536] rounded-xl p-3 border border-gray-100 dark:border-[#242F42] space-y-2 text-xs">
                    {/* Date Range */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 text-ink-darker dark:text-slate-200 font-bold">
                        <Calendar className="w-3.5 h-3.5 text-primary shrink-0" />
                        <span>شروع: {formatJalaliDisplay(poll.startDate, false)}</span>
                      </div>
                      <div className="flex items-center gap-1 text-muted-foreground dark:text-slate-400 font-medium">
                        <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        <span>مهلت: {formatJalaliDisplay(poll.endDate, false)}</span>
                      </div>
                    </div>

                    {/* Participation & Status Row */}
                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-gray-200/50 dark:border-gray-800">
                      <div className="flex items-center gap-1.5 text-muted-foreground dark:text-slate-400">
                        <Users className="w-3.5 h-3.5 text-muted-foreground dark:text-slate-400 shrink-0" />
                        <span>مشارکت: <strong className="text-ink-darker dark:text-white font-mono">{toPersianDigits(totalVotes)}</strong> پاسخ</span>
                      </div>
                      <div className="flex items-center gap-1 font-bold text-xs text-primary">
                        <span>{isFuture ? 'در انتظار آغاز' : isClosed ? 'پایان مهلت' : 'در حال دریافت'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Footer Action Row */}
                  {(!isFuture || isAdmin) && (
                    <div className="flex items-center justify-between gap-2">
                    {!isFuture && (
                      !archived && !isClosed ? (
                        <Button
                          onClick={() => openPoll(poll)}
                          className="flex-1 text-xs flex items-center justify-center gap-1.5 h-9 sm:h-10 rounded-xl font-bold bg-primary hover:bg-primary/90 text-white shadow-[2px_2px_0_#1F413D] dark:shadow-[2px_2px_0_#0F172A] cursor-pointer"
                        >
                          <Send className="w-4 h-4 shrink-0" />
                          <span>شرکت در نظرسنجی</span>
                        </Button>
                      ) : canViewResults ? (
                        <Button
                          variant="outline"
                          onClick={() => openAnalytics(poll)}
                          className="flex-1 text-xs flex items-center justify-center gap-1.5 h-9 sm:h-10 rounded-xl font-bold bg-white dark:bg-[#1C2536] border-gray-200 dark:border-[#242F42] text-foreground dark:text-white hover:bg-gray-50 dark:hover:bg-[#242F42] shadow-2xs transition-colors cursor-pointer"
                        >
                          <BarChart3 className="w-4 h-4 text-primary shrink-0" />
                          <span>مشاهده نتایج و آمار</span>
                        </Button>
                      ) : (
                        <div className="flex-1 text-xs flex items-center justify-center gap-1.5 h-9 sm:h-10 px-3 rounded-xl font-bold bg-gray-100/80 dark:bg-[#1C2536] text-muted-foreground border border-gray-200/80 dark:border-[#242F42] select-none">
                          <Lock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          <span>نظرسنجی به پایان رسیده است</span>
                        </div>
                      )
                    )}

                    {/* Admin Tools */}
                    {isAdmin && (
                      <div className={`flex items-center gap-1 shrink-0 ${isFuture ? 'mr-auto' : ''}`}>
                        {!archived && !isClosed && !isFuture && (
                          <button
                            type="button"
                            onClick={() => openAnalytics(poll)}
                            className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-xl bg-white dark:bg-[#1C2536] border border-gray-200 dark:border-[#242F42] text-muted-foreground hover:text-primary hover:border-primary/40 transition-colors shadow-2xs cursor-pointer"
                            title="مشاهده نتایج و آمار"
                          >
                            <BarChart3 className="w-4 h-4 text-primary" />
                          </button>
                        )}

                        {!archived && !isClosed && !isFuture && (
                          <button
                            type="button"
                            onClick={() => setStatusAction({ poll, action: 'close' })}
                            className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-xl bg-white dark:bg-[#1C2536] border border-gray-200 dark:border-[#242F42] text-muted-foreground hover:text-amber-600 hover:border-amber-400 transition-colors shadow-2xs cursor-pointer"
                            title="بستن موقت نظرسنجی"
                          >
                            <Lock className="w-4 h-4" />
                          </button>
                        )}

                        {canReopen && (
                          <button
                            type="button"
                            onClick={() => setStatusAction({ poll, action: 'open' })}
                            className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-xl bg-white dark:bg-[#1C2536] border border-gray-200 dark:border-[#242F42] text-muted-foreground hover:text-emerald-600 hover:border-emerald-400 transition-colors shadow-2xs cursor-pointer"
                            title="بازگشایی مجدد"
                          >
                            <RefreshCw className="w-4 h-4" />
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => setDeleteTarget(poll)}
                          className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-xl bg-white dark:bg-[#1C2536] border border-gray-200 dark:border-[#242F42] text-muted-foreground hover:text-rose-600 hover:border-rose-400 transition-colors shadow-2xs cursor-pointer"
                          title="حذف نظرسنجی"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
          })}
        </div>
      )}

      {/* ——— Create wizard modal ——— */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="افزودن نظرسنجی"
        description={`مرحله ${toPersianDigits(createStep + 1)} از ۳`}
        maxWidth="2xl"
      >
        <div className="space-y-4 pt-1">
          {/* Stepper */}
          <div className="flex items-center gap-2">
            {['مخاطب و زمان', 'سوالات', 'بررسی و ذخیره'].map((label, i) => (
              <React.Fragment key={label}>
                <div
                  className={`flex items-center gap-1.5 text-[11px] font-black px-2.5 py-1.5 rounded-lg border ${
                    createStep >= i
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border text-muted-foreground'
                  }`}
                >
                  <span>{toPersianDigits(i + 1)}</span>
                  <span className="hidden sm:inline">{label}</span>
                </div>
                {i < 2 && <div className="flex-1 h-px bg-border" />}
              </React.Fragment>
            ))}
          </div>

          {createError && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{createError}</span>
            </div>
          )}

          {createStep === 0 && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">
                  عنوان نظرسنجی *
                </label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="مثال: ارزیابی کیفیت کلاس‌های ترم پاییز"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">
                  توضیحات
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  rows={2}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-[#FAFAFA] dark:bg-[#1C2536] text-sm font-medium focus:border-primary focus:outline-none"
                  placeholder="توضیح کوتاه درباره هدف نظرسنجی…"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-2">
                  این فرم برای چه کسانی باشد؟ *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {AUDIENCE_OPTIONS.map((opt) => {
                    const selected = form.targetAudience === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() =>
                          setForm({
                            ...form,
                            targetAudience: opt.value as typeof form.targetAudience,
                          })
                        }
                        className={`text-right p-3 rounded-xl border transition-all ${
                          selected
                            ? 'border-primary bg-primary/10 shadow-[2px_2px_0_#202A5A] dark:shadow-[2px_2px_0_#59BBAF]'
                            : 'border-border bg-surface/30 hover:border-primary/40'
                        }`}
                      >
                        <p className="text-sm font-black text-foreground">{opt.label}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {opt.desc}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Requirement & Participation Mode */}
              <div className="space-y-2 p-3.5 rounded-xl border border-border/80 bg-surface/30">
                <label className="block text-xs font-bold text-foreground">
                  الزام و نوع مشارکت در نظرسنجی:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, isMandatory: false })}
                    className={`p-3 rounded-xl border text-right transition-all font-bold text-xs ${
                      !form.isMandatory
                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 ring-2 ring-emerald-500/20'
                        : 'border-border bg-background text-muted-foreground hover:border-border/80'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                      <span className="text-foreground">مشارکت اختیاری و داوطلبانه</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground font-normal mt-1 pr-4.5">
                      کاربران و دانش‌آموزان به انتخاب خود در نظرسنجی شرکت می‌کنند.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setForm({ ...form, isMandatory: true })}
                    className={`p-3 rounded-xl border text-right transition-all font-bold text-xs ${
                      form.isMandatory
                        ? 'border-rose-500 bg-rose-50 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200 ring-2 ring-rose-500/20'
                        : 'border-border bg-background text-muted-foreground hover:border-border/80'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0" />
                      <span className="text-foreground">تکمیل الزامی (تکلیفی)</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground font-normal mt-1 pr-4.5">
                      تکمیل این فرم برای تمام افراد مشخص‌شده اجباری و لازم خواهد بود.
                    </p>
                  </button>
                </div>

                <div className="flex items-center gap-4 pt-2 border-t border-border/40">
                  <label className="flex items-center gap-2 text-xs font-bold text-foreground cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.isAnonymous}
                      onChange={(e) => setForm({ ...form, isAnonymous: e.target.checked })}
                      className="w-4 h-4 rounded text-primary"
                    />
                    <span>ثبت پاسخ‌ها به‌صورت ناشناس</span>
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <PersianDatePicker
                  label="تاریخ شروع"
                  value={form.startDate}
                  onChange={(d) => setForm({ ...form, startDate: d })}
                />
                <PersianDatePicker
                  label="مهلت پایان"
                  value={form.endDate}
                  onChange={(d) => setForm({ ...form, endDate: d })}
                />
              </div>
            </div>
          )}

          {createStep === 1 && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <p className="text-xs font-bold text-muted-foreground">
                  انواع سوال پرس‌کاد: گزینه‌ای، متنی، عددی، NPS، لیکرت، ماتریس و بیشتر
                </p>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setDrafts((p) => [...p, emptyDraft()])}
                  className="gap-1 text-xs w-full sm:w-auto shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  افزودن سوال
                </Button>
              </div>

              {drafts.map((d, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-border p-4 space-y-3 bg-surface/20 shadow-2xs"
                >
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-primary">
                        سوال {toPersianDigits(idx + 1)}
                      </span>
                      {/* Prominent Per-Question Required Toggle */}
                      <button
                        type="button"
                        disabled={INFORMATIONAL_TYPES.has(d.type)}
                        onClick={() => updateDraft(idx, { required: !d.required })}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-black transition-all ${
                          INFORMATIONAL_TYPES.has(d.type)
                            ? 'opacity-40 cursor-not-allowed border-border text-muted-foreground'
                            : d.required
                              ? 'border-rose-500 bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 shadow-xs'
                              : 'border-emerald-500/50 bg-emerald-50/60 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 hover:border-emerald-500'
                        }`}
                        title="مشخص کردن الزامی یا اختیاری بودن پاسخ این سوال برای کاربر"
                      >
                        <span className={`w-2 h-2 rounded-full ${d.required ? 'bg-rose-500' : 'bg-emerald-500'}`} />
                        <span>{d.required ? 'پاسخ الزامی *' : 'پاسخ اختیاری'}</span>
                      </button>
                    </div>

                    {drafts.length > 1 && (
                      <button
                        type="button"
                        onClick={() =>
                          setDrafts((p) => p.filter((_, i) => i !== idx))
                        }
                        className="p-2 -m-1 text-muted-foreground hover:text-destructive rounded-lg flex items-center justify-center"
                        aria-label={`حذف سوال ${toPersianDigits(idx + 1)}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-foreground mb-1">
                        متن سوال *
                      </label>
                      <Input
                        value={d.title}
                        onChange={(e) =>
                          updateDraft(idx, { title: e.target.value })
                        }
                        placeholder="کیفیت خدمات چگونه بود؟"
                        className={!d.title.trim() && createError ? 'border-rose-500 ring-2 ring-rose-500/30' : ''}
                      />
                      {!d.title.trim() && createError && (
                        <p className="text-[10px] font-bold text-rose-600 mt-1">
                          متن این سوال نمی‌تواند خالی باشد
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-foreground mb-1">
                        نوع سوال (پرس‌کاد)
                      </label>
                      <select
                        value={d.type}
                        onChange={(e) =>
                          updateDraft(idx, {
                            type: e.target.value as QuestionType,
                          })
                        }
                        className="w-full h-11 px-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-[#FAFAFA] dark:bg-[#1C2536] text-sm font-medium focus:border-primary focus:outline-none"
                      >
                        {PORSCAD_QUESTION_TYPES.map((t) => (
                          <option key={t.value} value={t.value}>
                            {t.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-foreground mb-1">
                      توضیح (اختیاری)
                    </label>
                    <Input
                      value={d.description}
                      onChange={(e) =>
                        updateDraft(idx, { description: e.target.value })
                      }
                      placeholder="راهنمای کوتاه برای پاسخ‌دهنده"
                    />
                  </div>

                  {questionNeedsOptions(d.type) && (
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <label className="text-[11px] font-bold text-foreground">
                          گزینه‌ها *
                        </label>
                        <div className="flex flex-wrap items-center gap-2">
                          {d.type === 'choice' && (
                            <label className="text-[11px] font-bold text-muted-foreground flex items-center gap-1">
                              حداکثر انتخاب:
                              <select
                                value={d.maxSelections}
                                onChange={(e) =>
                                  updateDraft(idx, {
                                    maxSelections: Number(e.target.value),
                                  })
                                }
                                className="h-9 sm:h-8 min-h-[36px] px-2 rounded-lg border border-border bg-background text-xs"
                              >
                                {[1, 2, 3, 5].map((n) => (
                                  <option key={n} value={n}>
                                    {toPersianDigits(n)}
                                  </option>
                                ))}
                              </select>
                            </label>
                          )}
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              updateDraft(idx, {
                                options: [
                                  ...d.options,
                                  `گزینه ${d.options.length + 1}`,
                                ],
                              })
                            }
                            className="h-9 min-h-[36px] text-[11px] px-2.5"
                          >
                            <Plus className="w-3 h-3" />
                            گزینه
                          </Button>
                        </div>
                      </div>
                      {d.options.map((opt, oi) => (
                        <div key={oi} className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground w-4 shrink-0">
                            {toPersianDigits(oi + 1)}.
                          </span>
                          <div className="flex-1 min-w-0">
                            <Input
                              value={opt}
                              onChange={(e) => {
                                const next = [...d.options];
                                next[oi] = e.target.value;
                                updateDraft(idx, { options: next });
                              }}
                              className="h-9 min-h-0 text-xs"
                            />
                          </div>
                          {d.options.length > 2 && (
                            <button
                              type="button"
                              onClick={() =>
                                updateDraft(idx, {
                                  options: d.options.filter((_, i) => i !== oi),
                                })
                              }
                              className="p-2.5 -m-1 text-muted-foreground hover:text-destructive shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center"
                              aria-label={`حذف گزینه ${toPersianDigits(oi + 1)}`}
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Advanced Porscad Validation & Conditions Accordion */}
                  <div className="pt-2 border-t border-border/40">
                    <button
                      type="button"
                      onClick={() => updateDraft(idx, { showAdvanced: !d.showAdvanced })}
                      className="w-full flex items-center justify-between p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-bold text-muted-foreground transition-all"
                    >
                      <div className="flex items-center gap-1.5 text-primary">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>تنظیمات اعتبارسنجی و شروط پرس‌کاد (پیشرفته)</span>
                      </div>
                      <div className="flex items-center gap-1 text-[11px]">
                        <span>{d.showAdvanced ? 'بستن' : 'مشاهده و تنظیم'}</span>
                        {d.showAdvanced ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </div>
                    </button>

                    {d.showAdvanced && (
                      <div className="mt-3 p-3.5 rounded-xl border border-primary/20 bg-primary/5 space-y-3 animate-in fade-in duration-200">
                        {/* Number Validation */}
                        {d.type === 'number' && (
                          <div className="space-y-2">
                            <p className="text-[11px] font-black text-foreground">
                              محدودیت‌های عددی پرس‌کاد:
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                              <div>
                                <label className="block text-[10px] font-bold text-muted-foreground mb-1">
                                  حداقل عدد مجاز (Min)
                                </label>
                                <Input
                                  type="number"
                                  value={d.validation.min ?? ''}
                                  onChange={(e) =>
                                    updateDraft(idx, {
                                      validation: {
                                        ...d.validation,
                                        min: e.target.value === '' ? undefined : Number(e.target.value),
                                      },
                                    })
                                  }
                                  placeholder="مثلاً: ۰"
                                  className="h-8 text-xs font-mono"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] font-bold text-muted-foreground mb-1">
                                  حداکثر عدد مجاز (Max)
                                </label>
                                <Input
                                  type="number"
                                  value={d.validation.max ?? ''}
                                  onChange={(e) =>
                                    updateDraft(idx, {
                                      validation: {
                                        ...d.validation,
                                        max: e.target.value === '' ? undefined : Number(e.target.value),
                                      },
                                    })
                                  }
                                  placeholder="مثلاً: ۱۰۰"
                                  className="h-8 text-xs font-mono"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] font-bold text-muted-foreground mb-1">
                                  گام تغییر (Step)
                                </label>
                                <Input
                                  type="number"
                                  value={d.validation.step ?? ''}
                                  onChange={(e) =>
                                    updateDraft(idx, {
                                      validation: {
                                        ...d.validation,
                                        step: e.target.value === '' ? undefined : Number(e.target.value),
                                      },
                                    })
                                  }
                                  placeholder="مثلاً: ۱"
                                  className="h-8 text-xs font-mono"
                                />
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Text Validation */}
                        {(d.type === 'short_text' || d.type === 'long_text' || d.type === 'email' || d.type === 'phone_ir' || d.type === 'link' || d.type === 'telegram_id') && (
                          <div className="space-y-2">
                            <p className="text-[11px] font-black text-foreground">
                              اعتبارسنجی متنی پرس‌کاد:
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                              <div>
                                <label className="block text-[10px] font-bold text-muted-foreground mb-1">
                                  متن نگهدارنده (Placeholder)
                                </label>
                                <Input
                                  value={d.placeholder || ''}
                                  onChange={(e) =>
                                    updateDraft(idx, { placeholder: e.target.value })
                                  }
                                  placeholder="متن نمونه در کادر…"
                                  className="h-8 text-xs"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] font-bold text-muted-foreground mb-1">
                                  حداقل کاراکتر (Min Length)
                                </label>
                                <Input
                                  type="number"
                                  value={d.validation.minLength ?? ''}
                                  onChange={(e) =>
                                    updateDraft(idx, {
                                      validation: {
                                        ...d.validation,
                                        minLength: e.target.value === '' ? undefined : Number(e.target.value),
                                      },
                                    })
                                  }
                                  placeholder="مثلاً: ۳"
                                  className="h-8 text-xs font-mono"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] font-bold text-muted-foreground mb-1">
                                  حداکثر کاراکتر (Max Length)
                                </label>
                                <Input
                                  type="number"
                                  value={d.validation.maxLength ?? ''}
                                  onChange={(e) =>
                                    updateDraft(idx, {
                                      validation: {
                                        ...d.validation,
                                        maxLength: e.target.value === '' ? undefined : Number(e.target.value),
                                      },
                                    })
                                  }
                                  placeholder="مثلاً: ۵۰۰"
                                  className="h-8 text-xs font-mono"
                                />
                              </div>
                            </div>
                          </div>
                        )}

                        {/* File Upload Constraints */}
                        {d.type === 'file_upload' && (
                          <div className="space-y-2">
                            <p className="text-[11px] font-black text-foreground">
                              محدودیت‌های فایل در پرس‌کاد:
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <div>
                                <label className="block text-[10px] font-bold text-muted-foreground mb-1">
                                  فرمت‌های مجاز (جدا شده با کاما)
                                </label>
                                <Input
                                  value={(d.validation.allowedExtensions || []).join(', ')}
                                  onChange={(e) =>
                                    updateDraft(idx, {
                                      validation: {
                                        ...d.validation,
                                        allowedExtensions: e.target.value
                                          .split(',')
                                          .map((s) => s.trim().toLowerCase())
                                          .filter(Boolean),
                                      },
                                    })
                                  }
                                  placeholder="مثلاً: pdf, zip, png, jpg"
                                  className="h-8 text-xs"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] font-bold text-muted-foreground mb-1">
                                  حداکثر حجم فایل (مگابایت)
                                </label>
                                <Input
                                  type="number"
                                  value={d.validation.maxFileSizeMb ?? ''}
                                  onChange={(e) =>
                                    updateDraft(idx, {
                                      validation: {
                                        ...d.validation,
                                        maxFileSizeMb: e.target.value === '' ? undefined : Number(e.target.value),
                                      },
                                    })
                                  }
                                  placeholder="مثلاً: ۱۰"
                                  className="h-8 text-xs font-mono"
                                />
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Jump Logic (Branching) */}
                        {(d.type === 'choice' || d.type === 'picture_choice' || d.type === 'yes_no' || d.type === 'dropdown') && (
                          <div className="space-y-2 pt-2 border-t border-primary/20">
                            <div className="flex items-center justify-between">
                              <p className="text-[11px] font-black text-foreground">
                                شرط پرش (Jump Logic):
                              </p>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  const actions = d.jump_actions || [];
                                  const firstOpt = d.options?.[0] || 'بله';
                                  updateDraft(idx, {
                                    jump_actions: [
                                      ...actions,
                                      { conditionValue: firstOpt, targetQuestionIndex: idx + 2 < drafts.length ? idx + 2 : 'END' },
                                    ],
                                  });
                                }}
                                className="h-7 text-[10px] px-2 gap-1"
                              >
                                <Plus className="w-3 h-3" />
                                افزودن شرط پرش
                              </Button>
                            </div>

                            {d.jump_actions && d.jump_actions.length > 0 ? (
                              <div className="space-y-1.5">
                                {d.jump_actions.map((act, ai) => (
                                  <div key={ai} className="flex flex-wrap items-center gap-2 p-2 rounded-lg bg-background border border-border text-xs">
                                    <span className="text-[11px] font-bold text-muted-foreground">اگر پاسخ برابر بود با:</span>
                                    <select
                                      value={act.conditionValue}
                                      onChange={(e) => {
                                        const next = [...(d.jump_actions || [])];
                                        next[ai].conditionValue = e.target.value;
                                        updateDraft(idx, { jump_actions: next });
                                      }}
                                      className="h-7 px-2 rounded-md border border-border bg-surface text-xs font-bold"
                                    >
                                      {(d.type === 'yes_no' ? ['بله', 'خیر'] : d.options).map((opt) => (
                                        <option key={opt} value={opt}>
                                          {opt}
                                        </option>
                                      ))}
                                    </select>
                                    <span className="text-[11px] font-bold text-muted-foreground flex items-center gap-1">
                                      <ArrowLeft className="w-3 h-3 text-primary shrink-0" />
                                      پرش به:
                                    </span>
                                    <select
                                      value={act.targetQuestionIndex}
                                      onChange={(e) => {
                                        const next = [...(d.jump_actions || [])];
                                        next[ai].targetQuestionIndex = e.target.value === 'END' ? 'END' : Number(e.target.value);
                                        updateDraft(idx, { jump_actions: next });
                                      }}
                                      className="h-7 px-2 rounded-md border border-border bg-surface text-xs font-bold"
                                    >
                                      {drafts.map((otherQ, oi) => (
                                        <option key={oi} value={oi}>
                                          سوال {toPersianDigits(oi + 1)}: {otherQ.title.substring(0, 15) || 'بدون عنوان'}…
                                        </option>
                                      ))}
                                      <option value="END">پایان نظرسنجی (ثبت پاسخ)</option>
                                    </select>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const next = (d.jump_actions || []).filter((_, i) => i !== ai);
                                        updateDraft(idx, { jump_actions: next });
                                      }}
                                      className="text-rose-500 hover:text-rose-700 p-1 rounded-md hover:bg-rose-500/10 transition-colors"
                                      title="حذف شرط"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-[10px] text-muted-foreground">
                                هنوز شرط پرشی برای این سوال تعریف نشده است.
                              </p>
                            )}
                          </div>
                        )}

                        {/* Quiz Points */}
                        <div className="pt-2 border-t border-primary/20 flex items-center justify-between gap-4">
                          <div>
                            <p className="text-[11px] font-black text-foreground">نمره سوال در ارزیابی:</p>
                            <p className="text-[10px] text-muted-foreground">اختیاری (برای فرم‌های ارزیابی و کوییز)</p>
                          </div>
                          <Input
                            type="number"
                            value={d.points ?? ''}
                            onChange={(e) =>
                              updateDraft(idx, {
                                points: e.target.value === '' ? undefined : Number(e.target.value),
                              })
                            }
                            placeholder="مثلاً: ۵"
                            className="w-24 h-8 text-xs font-mono"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              <div className="rounded-xl border border-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 p-3 text-[11px] font-bold text-indigo-900 dark:text-indigo-300">
                با ذخیره، فرم مرحله‌به‌مرحله در پرس‌کاد ساخته می‌شود.
              </div>
            </div>
          )}

          {createStep === 2 && (
            <div className="space-y-3">
              <div className="rounded-xl border border-border p-4 bg-surface/20 space-y-2 text-sm">
                <p>
                  <strong>عنوان:</strong> {form.title}
                </p>
                <p>
                  <strong>مخاطب:</strong>{' '}
                  {AUDIENCE_LABEL[form.targetAudience]}
                </p>
                <p>
                  <strong>مهلت:</strong>{' '}
                  {toPersianDigits(form.startDate)} تا {toPersianDigits(form.endDate)}
                </p>
                <p>
                  <strong>تعداد سوال:</strong> {toPersianDigits(drafts.length)}
                </p>
              </div>
              <ol className="space-y-2 max-h-64 overflow-y-auto">
                {drafts.map((d, i) => (
                  <li
                    key={i}
                    className="p-3 rounded-lg border border-border text-xs space-y-1"
                  >
                    <p className="font-black text-foreground">
                      {toPersianDigits(i + 1)}. {d.title}
                    </p>
                    <p className="text-muted-foreground">
                      {TYPE_LABEL[d.type]}
                      {d.options?.length > 0 &&
                        ` — ${d.options.filter((o) => o.trim()).length} گزینه`}
                    </p>
                  </li>
                ))}
              </ol>
            </div>
          )}

          <div className="flex justify-between gap-2 pt-3 border-t border-border/50">
            <Button
              type="button"
              variant="outline"
              onClick={() => (createStep === 0 ? setIsCreateOpen(false) : goBackCreate())}
              disabled={isSubmitting}
              className="gap-1"
            >
              <ArrowRight className="w-4 h-4" />
              {createStep === 0 ? 'انصراف' : 'بازگشت'}
            </Button>
            {createStep < 2 ? (
              <Button type="button" onClick={goNextCreate} className="gap-1">
                ادامه
                <ArrowLeft className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                type="button"
                onClick={handleCreateSubmit}
                disabled={isSubmitting}
                className="gap-1.5"
              >
                <Sparkles className="w-4 h-4" />
                {isSubmitting ? 'در حال ذخیره…' : 'ذخیره و ساخت فرم'}
              </Button>
            )}
          </div>
        </div>
      </Modal>

      {/* ——— Step-by-step fill modal ——— */}
      <Modal
        isOpen={!!activePoll}
        onClose={closePoll}
        title={activePoll?.title || ''}
        description={
          activePoll
            ? `مهلت: ${formatJalaliDisplay(activePoll.endDate, true) || activePoll.endDate}`
            : undefined
        }
        maxWidth="xl"
      >
        <div className="space-y-4 pt-1">
          {activePoll?.description && (
            <p className="text-sm text-muted-foreground leading-relaxed">
              {activePoll.description}
            </p>
          )}

          {hasVoted ? (
            <div className="space-y-4 py-2">
              <div className="p-4 rounded-xl border-2 border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 flex items-start gap-2 text-sm font-bold">
                <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
                <span>
                  پاسخ‌های شما با موفقیت در سیستم و فرم پرس‌کاد ثبت گردید.
                </span>
              </div>
              <div className="flex justify-end pt-2">
                <Button type="button" onClick={closePoll} className="gap-1.5">
                  بستن پنجره
                </Button>
              </div>
            </div>
          ) : activeQuestions.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              این نظرسنجی سوال ندارد.
            </div>
          ) : (
            <>
              {/* Progress */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px] font-black text-muted-foreground">
                  <span>
                    سوال {toPersianDigits(fillStep + 1)} از{' '}
                    {toPersianDigits(activeQuestions.length)}
                  </span>
                  <span>
                    {toPersianDigits(
                      Math.round(
                        ((fillStep + 1) / activeQuestions.length) * 100,
                      ),
                    )}
                    ٪
                  </span>
                </div>
                <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-300"
                    style={{
                      width: `${((fillStep + 1) / activeQuestions.length) * 100}%`,
                    }}
                  />
                </div>
                <div className="flex gap-1 flex-wrap">
                  {activeQuestions.map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setFillStep(i)}
                      className={`w-7 h-7 rounded-lg text-[11px] font-black border transition-all ${
                        i === fillStep
                          ? 'border-primary bg-primary text-white'
                          : isQuestionAnswered(activeQuestions[i], i)
                            ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                            : 'border-border text-muted-foreground hover:border-primary/50'
                      }`}
                    >
                      {toPersianDigits(i + 1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Current question */}
              {(() => {
                const q = activeQuestions[fillStep];
                if (!q) return null;
                return (
                  <div className={`rounded-2xl border p-4 sm:p-5 space-y-4 bg-surface/20 transition-all ${
                    fillError ? 'border-rose-400 dark:border-rose-800 ring-2 ring-rose-500/20 shadow-sm' : 'border-border'
                  }`}>
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="text-base font-black text-foreground leading-relaxed flex items-center gap-1.5 flex-wrap">
                          <span>{q.title}</span>
                          {q.required !== false && (
                            <span className="text-rose-500 font-black text-lg leading-none" title="پاسخ به این سوال الزامی است">*</span>
                          )}
                        </h4>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <Badge variant={q.required !== false ? 'warning' : 'neutral'}>
                            {q.required !== false ? 'الزامی' : 'اختیاری'}
                          </Badge>
                          <Badge variant="neutral">
                            {TYPE_LABEL[q.type] || q.type}
                          </Badge>
                        </div>
                      </div>
                      {q.description && (
                        <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                          {q.description}
                        </p>
                      )}
                    </div>

                    {/* Inline Validation Error Banner */}
                    {fillError && (
                      <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200 rounded-xl text-xs font-bold flex items-center gap-2 animate-in fade-in duration-200">
                        <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
                        <span>{fillError}</span>
                      </div>
                    )}

                    {renderAnswerControl(q, fillStep)}
                  </div>
                );
              })()}

              {/* Nav */}
              <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/50">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handlePreviousStep}
                  disabled={fillStep === 0 && stepHistory.length === 0}
                  className="gap-1"
                >
                  <ArrowRight className="w-4 h-4" />
                  قبلی
                </Button>

                {fillStep < activeQuestions.length - 1 ? (
                  <Button
                    type="button"
                    onClick={handleNextStep}
                    className="gap-1"
                  >
                    بعدی
                    <ArrowLeft className="w-4 h-4" />
                  </Button>
                ) : (
                  <Button
                    type="button"
                    onClick={submitAllAnswers}
                    disabled={isSubmittingAnswers}
                    className="gap-1.5"
                  >
                    <Send className="w-4 h-4" />
                    {isSubmittingAnswers ? 'در حال ارسال…' : 'ارسال نهایی'}
                  </Button>
                )}
              </div>
            </>
          )}
        </div>
      </Modal>

      {renderAnalyticsView()}

      {/* ——— Status change confirm ——— */}
      <Modal
        isOpen={!!statusAction}
        onClose={() => !isStatusBusy && setStatusAction(null)}
        title={
          statusAction?.action === 'close'
            ? 'بستن نظرسنجی'
            : statusAction?.action === 'open'
              ? 'بازگشایی نظرسنجی'
              : statusAction?.action === 'archive'
                ? 'آرشیو نظرسنجی'
                : 'خروج از آرشیو'
        }
        maxWidth="md"
      >
        <div className="space-y-4 pt-1">
          <p className="text-sm text-muted-foreground leading-relaxed">
            {statusAction?.action === 'close' &&
              'با بستن این نظرسنجی، پذیرش پاسخ جدید متوقف و فرم پرس‌کاد نیز غیرفعال می‌شود.'}
            {statusAction?.action === 'open' &&
              'با بازگشایی، نظرسنجی تا پایان مهلت دوباره پذیرای پاسخ خواهد بود.'}
            {statusAction?.action === 'archive' &&
              'با آرشیو، نظرسنجی از لیست فعال خارج و فرم پرس‌کاد بایگانی می‌شود. بعداً می‌توانید فعال‌سازی کنید.'}
            {statusAction?.action === 'unarchive' &&
              'با فعال‌سازی، نظرسنجی از آرشیو خارج می‌شود (بر اساس مهلت و وضعیت بستن، فعال یا پایان‌یافته نمایش داده می‌شود).'}
          </p>
          <p className="text-xs font-black text-foreground">
            «{statusAction?.poll.title}»
          </p>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setStatusAction(null)}
              disabled={isStatusBusy}
            >
              انصراف
            </Button>
            <Button
              type="button"
              onClick={applyStatusAction}
              isLoading={isStatusBusy}
              variant={
                statusAction?.action === 'archive' ||
                statusAction?.action === 'close'
                  ? 'secondary'
                  : 'primary'
              }
            >
              تأیید
            </Button>
          </div>
        </div>
      </Modal>

      {/* ——— Delete confirm ——— */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => !isStatusBusy && setDeleteTarget(null)}
        title="حذف نظرسنجی"
        maxWidth="md"
      >
        <div className="space-y-4 pt-1">
          <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-bold flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              حذف نظرسنجی «{deleteTarget?.title}» قابل بازگشت نیست. پاسخ‌های محلی
              حذف می‌شوند و فرم پرس‌کاد به سطل زباله منتقل خواهد شد.
            </span>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={isStatusBusy}
            >
              انصراف
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={confirmDelete}
              isLoading={isStatusBusy}
            >
              حذف قطعی
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
