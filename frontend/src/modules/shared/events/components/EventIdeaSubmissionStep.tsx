import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '../../../../components/ui/Button';
import { Modal } from '../../../../components/ui/Modal';
import { toast } from '../../../../components/ui/toast/toast';
import { useAuthStore } from '../../../../lib/auth/auth-store';
import { apiClient } from '../../../../lib/api/client';
import { toPersianDigits, formatJalaliDisplay } from '../../../../utils/jalali';
import { isOwnedByUser } from '../constants/event-access';
import { FALLBACK_DB_STUDENTS } from './EventTeamFormationStep';
import {
  Lightbulb,
  Send,
  Sparkles,
  User,
  Users,
  CheckCircle2,
  FileText,
  Lock,
  Unlock,
  Vote,
  ArrowLeft,
  Hash,
  Edit3,
  ShieldCheck,
  ChevronDown,
  Trash2,
  Check,
  AlertCircle,
  X,
} from 'lucide-react';

export interface EventIdea {
  id: string;
  eventId: string;
  ideaNumber: number;
  title: string;
  description: string;
  authorName: string;
  authorRole?: string;
  createdAt: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  starRatings?: {
    userId: string;
    userName: string;
    score: number;
    comment?: string;
    createdAt: string;
  }[];
  category?: string;
  goals?: string;
  suggestedMaterials?: string;
  attachmentUrl?: string;
}

interface EventIdeaSubmissionStepProps {
  eventId: string;
  eventTitle: string;
  ideas?: EventIdea[];
  isLocked?: boolean;
  isEventEnded?: boolean;
  onToggleLock?: () => void;
  onIdeaSubmitted: (idea: EventIdea) => void;
  onUpdateIdea?: (updatedIdea: EventIdea) => void;
  onDeleteIdea?: (ideaId: string) => void;
}

export const EventIdeaSubmissionStep: React.FC<EventIdeaSubmissionStepProps> = ({
  eventId,
  eventTitle,
  ideas = [],
  isLocked = false,
  isEventEnded = false,
  onToggleLock,
  onIdeaSubmitted,
  onUpdateIdea,
  onDeleteIdea,
}) => {
  const currentUser = useAuthStore((s) => s.user);
  const isManager = ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER', 'STAFF'].includes(currentUser?.role || '');
  const isParent = currentUser?.role === 'PARENT';
  const isStudent = currentUser?.role === 'STUDENT';
  const canSubmitIdea = isStudent || isManager;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Admin Edit Modal State
  const [editingIdea, setEditingIdea] = useState<EventIdea | null>(null);
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    authorName: '',
    ideaNumber: 1,
    status: 'APPROVED' as EventIdea['status'],
  });

  // Calculate Next Sequential Idea Number
  const nextIdeaNumber = useMemo(() => {
    const maxExisting = ideas.reduce(
      (max, item) => Math.max(max, item.ideaNumber || 0),
      0
    );
    const counterKey = `rokad_idea_counter_${eventId}`;
    const storedCounter = parseInt(localStorage.getItem(counterKey) || '0', 10);
    return Math.max(maxExisting, storedCounter) + 1;
  }, [ideas, eventId]);

  const studentName = useMemo(() => {
    if (currentUser) {
      const full = `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim();
      if (full) return full;
    }
    return 'دانش‌آموز';
  }, [currentUser]);

  // Students list for Admin idea submission / assignment
  const [dbStudents, setDbStudents] = useState<Array<{ id: string; name: string }>>(FALLBACK_DB_STUDENTS);
  const [adminSelectedStudent, setAdminSelectedStudent] = useState<string>('');

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const res = await apiClient.get('/users?role=STUDENT');
        if (res && res.data && Array.isArray(res.data) && res.data.length > 0) {
          const mapped = res.data.map((u: any) => ({
            id: u.id,
            name: `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.username,
          }));
          setDbStudents(mapped);
        }
      } catch (err) {
        // Safe offline fallback
      }
    };
    fetchStudents();
  }, []);

  // Find if current student has already submitted an idea for this event (exclude PARENT and manager)
  const userSubmittedIdea = useMemo(() => {
    if (!currentUser || isParent || isManager) return null;
    const exact = ideas.find(
      (item) => item.authorName.trim().toLowerCase() === studentName.trim().toLowerCase(),
    );
    if (exact) return exact;
    return ideas.find((item) => isOwnedByUser(item.authorName, currentUser)) || null;
  }, [ideas, currentUser, studentName, isParent, isManager]);

  const [studentEditTitle, setStudentEditTitle] = useState('');
  const [studentEditDescription, setStudentEditDescription] = useState('');
  const [isEditingIdea, setIsEditingIdea] = useState(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);

  useEffect(() => {
    if (userSubmittedIdea) {
      setStudentEditTitle(userSubmittedIdea.title);
      setStudentEditDescription(userSubmittedIdea.description);
      setIsEditingIdea(false);
    }
  }, [userSubmittedIdea]);

  const handleSaveStudentEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isParent || !canSubmitIdea) {
      toast.error('ویرایش ایده فقط برای دانش‌آموزان و هنرجویان مجاز است.');
      return;
    }
    if (isLocked) {
      toast.error('مهلت ویرایش ایده به پایان رسیده و قفل شده است.');
      return;
    }
    if (!userSubmittedIdea) return;
    if (!studentEditTitle.trim() || !studentEditDescription.trim()) {
      toast.error('لطفاً عنوان و شرح ایده را وارد نمایید.');
      return;
    }

    const updated: EventIdea = {
      ...userSubmittedIdea,
      title: studentEditTitle.trim(),
      description: studentEditDescription.trim(),
    };

    if (onUpdateIdea) {
      onUpdateIdea(updated);
    }
    setIsEditingIdea(false);
    toast.success('تغییرات ایده با موفقیت ذخیره شد.');
  };

  const handleCancelEdit = () => {
    if (userSubmittedIdea) {
      setStudentEditTitle(userSubmittedIdea.title);
      setStudentEditDescription(userSubmittedIdea.description);
    }
    setIsEditingIdea(false);
  };

  const handleDeleteSubmittedIdea = () => {
    if (!userSubmittedIdea) return;
    if (onDeleteIdea) {
      onDeleteIdea(userSubmittedIdea.id);
    }
    setIsEditingIdea(false);
    setShowDeleteConfirmModal(false);
    toast.success('ایده شما با موفقیت حذف شد. اکنون می‌توانید ایده جدید ثبت کنید.');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isParent || !canSubmitIdea) {
      toast.error('ثبت ایده فقط برای دانش‌آموزان مجاز است و دسترسی اولیاء به صورت مشاهده‌گر می‌باشد.');
      return;
    }
    if (!isManager && isLocked) {
      toast.error('مهلت ثبت ایده به پایان رسیده و قفل شده است.');
      return;
    }

    if (isManager && !adminSelectedStudent) {
      toast.error('لطفاً دانش‌آموز صاحب ایده را انتخاب کنید.');
      return;
    }

    if (!title.trim() || !description.trim()) {
      toast.error('لطفاً اسم و شرح ایده را وارد نمایید.');
      return;
    }

    setIsSubmitting(true);

    const counterKey = `rokad_idea_counter_${eventId}`;
    const assignedNumber = nextIdeaNumber;
    localStorage.setItem(counterKey, String(assignedNumber));

    const effectiveAuthor = isManager ? adminSelectedStudent : studentName;

    const newIdea: EventIdea = {
      id: 'idea_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      eventId,
      ideaNumber: assignedNumber,
      title: title.trim(),
      description: description.trim(),
      authorName: effectiveAuthor,
      authorRole: 'دانش‌آموز',
      createdAt: new Date().toISOString(),
      status: 'APPROVED',
      starRatings: [],
    };

    setTimeout(() => {
      onIdeaSubmitted(newIdea);
      setIsSubmitting(false);
      setTitle('');
      setDescription('');
      toast.success(`ایده برای ${effectiveAuthor} با شماره ${toPersianDigits(assignedNumber)} ثبت شد.`);
    }, 300);
  };

  const handleOpenEditModal = (idea: EventIdea) => {
    setEditingIdea(idea);
    setEditForm({
      title: idea.title,
      description: idea.description,
      authorName: idea.authorName,
      ideaNumber: idea.ideaNumber || 1,
      status: idea.status || 'APPROVED',
    });
  };

  const handleSaveAdminEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingIdea) return;

    const updated: EventIdea = {
      ...editingIdea,
      title: editForm.title.trim(),
      description: editForm.description.trim(),
      authorName: editForm.authorName.trim(),
      ideaNumber: Number(editForm.ideaNumber),
      status: editForm.status,
    };

    if (onUpdateIdea) {
      onUpdateIdea(updated);
    }
    setEditingIdea(null);
    toast.success('تغییرات ایده با موفقیت ذخیره شد.');
  };

  return (
    <div className="space-y-8">
      {/* Container: Submission Form */}
      <div className="rounded-2xl border-[1.5px] border-primary-dark/30 dark:border-gray-800 bg-white dark:bg-[#151C28] shadow-[2px_2px_0_#59BBAF] dark:shadow-[2px_2px_0_#0B0F17] p-5 sm:p-7 space-y-4">
        {/* Header & Lock Controller */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg md:text-xl font-black text-ink-darker dark:text-white flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-primary shrink-0" />
              <span>گام اول: ثبت ایده</span>
            </h2>
            <p className="text-xs md:text-sm font-medium text-gray-500 dark:text-gray-400 mt-3">
              عنوان و شرح ایده نوآورانه خود را ثبت کنید؛ پس از ثبت، کد اختصاصی به ایده شما تخصیص می‌یابد.
            </p>
          </div>

          {/* Manager Lock/Unlock Controller */}
          {isManager && onToggleLock && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onToggleLock}
                className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-bold transition-all shadow-2xs cursor-pointer ${
                  isLocked
                    ? 'border-rose-300 dark:border-rose-800 bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-950/60 dark:text-rose-300'
                    : 'border-emerald-300 dark:border-emerald-800 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-300'
                }`}
              >
                {isLocked ? (
                  <>
                    <Lock className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                    <span>ثبت ایده قفل است (کلیک برای بازگشایی)</span>
                  </>
                ) : (
                  <>
                    <Unlock className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>ثبت ایده باز است (کلیک برای بستن ثبت‌ها)</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Parent Spectator Notice vs Ended Notice vs Locked Notice vs Existing Submitted Idea vs New Submission Form */}
        {isParent ? (
          <div className="p-8 text-center bg-blue-50/70 dark:bg-blue-950/30 rounded-2xl border-2 border-blue-200 dark:border-blue-800 space-y-4 my-6 shadow-[2px_2px_0px_0px_#202A5A]">
            <div className="w-14 h-14 mx-auto rounded-2xl border-2 border-zinc-900 bg-blue-400 text-zinc-950 flex items-center justify-center shadow-[2px_2px_0px_0px_#202A5A]">
              <Users className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-black text-zinc-900 dark:text-zinc-100">
              مشاهده‌گر اولیاء گرامی (دسترسی نمایشی)
            </h3>
            <p className="text-xs md:text-sm font-medium text-zinc-600 dark:text-zinc-400 max-w-lg mx-auto leading-relaxed">
              ثبت و ارسال ایده‌های رویداد مختص دانش‌آموزان و هنرجویان است. شما می‌توانید ایده‌های ارسال‌شده توسط شرکت‌کنندگان و فرآیند برگزاری را در تالار ایده‌ها و گام‌های بعدی مشاهده نمایید.
            </p>
          </div>
        ) : isEventEnded ? (
          <div className="p-8 text-center bg-amber-50/70 dark:bg-amber-950/30 rounded-2xl border-2 border-amber-300 dark:border-amber-800 space-y-3 my-6 shadow-2xs">
            <div className="w-14 h-14 mx-auto rounded-2xl border-2 border-amber-500/40 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 flex items-center justify-center font-bold">
              <Lock className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-black text-amber-950 dark:text-amber-100">
              مهلت ثبت ایده در این رویداد به پایان رسیده است
            </h3>
            <p className="text-xs md:text-sm font-medium text-amber-800 dark:text-amber-300 max-w-lg mx-auto leading-relaxed">
              امکان ثبت ایده جدید در این رویداد وجود ندارد. کلیه ایده‌های ثبت‌شده در گام دوم (تالار ایده‌ها) قابل مشاهده هستند.
            </p>
          </div>
        ) : userSubmittedIdea && !isManager && !isLocked ? (
          <div className="space-y-4">
            {/* Status notification banner */}
            <div className="flex items-center gap-2.5 p-4 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 shadow-2xs">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <h4 className="text-xs sm:text-sm font-bold">
                {isEditingIdea
                  ? `در حال ویرایش ایده شماره ${toPersianDigits(userSubmittedIdea.ideaNumber)}`
                  : `ایده شما ثبت شد: ایده شماره ${toPersianDigits(userSubmittedIdea.ideaNumber)}`}
              </h4>
            </div>

            {!isEditingIdea ? (
              /* Fixed View Mode */
              <div className="space-y-4">
                {/* Author Name and Code Card */}
                <div className="p-3.5 sm:p-4 rounded-2xl border border-gray-200/80 dark:border-gray-700/80 bg-gray-50/70 dark:bg-[#1C2536]/60 flex items-center gap-3 sm:gap-4 shadow-2xs">
                  {/* Right: Idea Code Field */}
                  <div className="shrink-0">
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5 flex items-center gap-1">
                      <Hash className="w-3.5 h-3.5 text-primary" />
                      <span>کد ایده:</span>
                    </label>
                    <div className="h-10 px-4 min-w-[64px] rounded-xl border border-primary/30 bg-primary/10 dark:bg-primary/20 text-primary font-black font-mono text-lg sm:text-xl flex items-center justify-center shadow-2xs">
                      {toPersianDigits(userSubmittedIdea.ideaNumber)}
                    </div>
                  </div>

                  {/* Left: Author Name Field */}
                  <div className="flex-1 min-w-0">
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-primary" />
                      <span>نام ایده‌پرداز:</span>
                    </label>
                    <div className="h-10 w-full max-w-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#151C28] px-3.5 text-xs sm:text-sm font-bold text-ink-darker dark:text-white shadow-2xs flex items-center">
                      {userSubmittedIdea.authorName}
                    </div>
                  </div>
                </div>

                {/* Fixed Idea Title */}
                <div className="p-3.5 sm:p-4 rounded-2xl border border-gray-200/80 dark:border-gray-700/80 bg-gray-50/70 dark:bg-[#1C2536]/60 shadow-2xs">
                  <div className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5 flex items-center gap-1.5">
                    <Lightbulb className="w-4 h-4 text-primary" />
                    <span>اسم ایده:</span>
                  </div>
                  <div className="text-xs sm:text-sm font-bold text-ink-darker dark:text-white px-1">
                    {userSubmittedIdea.title}
                  </div>
                </div>

                {/* Fixed Idea Description */}
                <div className="p-3.5 sm:p-4 rounded-2xl border border-gray-200/80 dark:border-gray-700/80 bg-gray-50/70 dark:bg-[#1C2536]/60 shadow-2xs">
                  <div className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5 flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-primary" />
                    <span>شرح ایده:</span>
                  </div>
                  <div className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap px-1">
                    {userSubmittedIdea.description}
                  </div>
                </div>

                {/* Actions: Edit Only (Delete is moved inside Edit mode) */}
                <div className="pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-end">
                  <Button
                    type="button"
                    variant="primary"
                    onClick={() => setIsEditingIdea(true)}
                    className="gap-2 text-xs font-black px-6 py-2.5"
                  >
                    <Edit3 className="w-4 h-4" />
                    <span>ویرایش ایده</span>
                  </Button>
                </div>
              </div>
            ) : (
              /* Edit Mode Form */
              <form onSubmit={handleSaveStudentEdit} className="space-y-4">
                <div className="p-3.5 sm:p-4 rounded-2xl border border-gray-200/80 dark:border-gray-700/80 bg-gray-50/70 dark:bg-[#1C2536]/60 flex items-center gap-3 sm:gap-4 shadow-2xs">
                  {/* Right: Idea Code Field */}
                  <div className="shrink-0">
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5 flex items-center gap-1">
                      <Hash className="w-3.5 h-3.5 text-primary" />
                      <span>کد ایده:</span>
                    </label>
                    <div className="h-10 px-4 min-w-[64px] rounded-xl border border-primary/30 bg-primary/10 dark:bg-primary/20 text-primary font-black font-mono text-lg sm:text-xl flex items-center justify-center shadow-2xs">
                      {toPersianDigits(userSubmittedIdea.ideaNumber)}
                    </div>
                  </div>

                  {/* Left: Author Name Field */}
                  <div className="flex-1 min-w-0">
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-primary" />
                      <span>نام ایده‌پرداز:</span>
                    </label>
                    <div className="h-10 w-full max-w-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#151C28] px-3.5 text-xs sm:text-sm font-bold text-ink-darker dark:text-white shadow-2xs flex items-center">
                      {userSubmittedIdea.authorName}
                    </div>
                  </div>
                </div>

                {/* Idea Title Edit */}
                <div>
                  <label className="block text-xs font-bold text-ink-normal dark:text-gray-200 mb-1.5 flex items-center gap-1.5">
                    <Lightbulb className="w-4 h-4 text-primary" />
                    <span>اسم ایده *</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="عنوان ایده خود را وارد کنید..."
                    value={studentEditTitle}
                    onChange={(e) => setStudentEditTitle(e.target.value)}
                    className="w-full rounded-xl px-3.5 py-2.5 border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#151C28] text-ink-darker dark:text-white text-xs md:text-sm font-medium focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all shadow-2xs placeholder:text-gray-400"
                  />
                </div>

                {/* Idea Description Edit */}
                <div>
                  <label className="block text-xs font-bold text-ink-normal dark:text-gray-200 mb-1.5 flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-primary" />
                    <span>شرح ایده *</span>
                  </label>
                  <textarea
                    required
                    rows={5}
                    placeholder="ایده خود را به صورت مختصر و مفید توضیح دهید..."
                    value={studentEditDescription}
                    onChange={(e) => setStudentEditDescription(e.target.value)}
                    className="w-full rounded-xl px-3.5 py-2.5 border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#151C28] text-ink-darker dark:text-white text-xs md:text-sm font-medium focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all shadow-2xs placeholder:text-gray-400"
                  />
                </div>

                {/* Edit Mode Actions: Delete on Start, Cancel & Save on End */}
                <div className="pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowDeleteConfirmModal(true)}
                    className="text-rose-600 hover:text-rose-700 border-rose-200 dark:border-rose-900/60 hover:bg-rose-50 dark:hover:bg-rose-950/40 font-bold gap-2 text-xs px-4 py-2.5 rounded-xl cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>حذف ایده</span>
                  </Button>

                  <div className="flex items-center gap-2.5">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleCancelEdit}
                      className="font-bold gap-1.5 text-xs px-4 py-2.5 rounded-xl cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                      <span>انصراف</span>
                    </Button>
                    <Button
                      type="submit"
                      variant="primary"
                      className="gap-2 text-xs font-black px-6 py-2.5"
                    >
                      <Check className="w-4 h-4" />
                      <span>ذخیره تغییرات</span>
                    </Button>
                  </div>
                </div>
              </form>
            )}
          </div>
        ) : isLocked && !isManager ? (
          <div className="p-8 text-center bg-gray-50/70 dark:bg-[#1C2536]/50 rounded-2xl border border-gray-200 dark:border-gray-800 space-y-4 my-4 shadow-2xs">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 flex items-center justify-center shadow-2xs">
              <Lock className="w-7 h-7 text-rose-600 dark:text-rose-400" />
            </div>
            <h3 className="text-base font-black text-ink-darker dark:text-white">
              مهلت ثبت ایده جدید به اتمام رسیده است!
            </h3>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Row 1: Automatic Fields (Idea Code & Student / Author Name) */}
            <div className="p-3.5 sm:p-4 rounded-2xl border border-gray-200/80 dark:border-gray-700/80 bg-gray-50/70 dark:bg-[#1C2536]/60 flex items-center gap-3 sm:gap-4 shadow-2xs">
              {/* Right: Idea Code Field */}
              <div className="shrink-0">
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5 flex items-center gap-1">
                  <Hash className="w-3.5 h-3.5 text-primary" />
                  <span>کد ایده:</span>
                </label>
                <div className="h-10 px-4 min-w-[64px] rounded-xl border border-primary/30 bg-primary/10 dark:bg-primary/20 text-primary font-black font-mono text-lg sm:text-xl flex items-center justify-center shadow-2xs">
                  {toPersianDigits(nextIdeaNumber)}
                </div>
              </div>

              {/* Left: Student / Author Name Field */}
              <div className="flex-1 min-w-0">
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-primary" />
                  <span>نام ایده‌پرداز:</span>
                  {isManager && (
                    <span className="text-[10px] font-bold text-primary mr-1 bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">
                      انتخاب توسط مدیر
                    </span>
                  )}
                </label>
                {isManager ? (
                  <div className="relative w-full max-w-sm">
                    <select
                      value={adminSelectedStudent}
                      onChange={(e) => setAdminSelectedStudent(e.target.value)}
                      required
                      className="h-10 w-full appearance-none rounded-xl border border-primary/30 dark:border-primary/40 bg-white dark:bg-[#151C28] pr-3.5 pl-9 text-xs sm:text-sm font-bold text-ink-darker dark:text-white focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all shadow-2xs cursor-pointer"
                    >
                      <option value="" disabled>
                        انتخاب دانش‌آموز از لیست...
                      </option>
                      {dbStudents
                        .filter((std) => std.name !== studentName)
                        .map((std) => (
                          <option key={std.id} value={std.name}>
                            {std.name}
                          </option>
                        ))}
                    </select>
                    <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary pointer-events-none" />
                  </div>
                ) : (
                  <div className="h-10 w-full max-w-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#151C28] px-3.5 text-xs sm:text-sm font-bold text-ink-darker dark:text-white shadow-2xs flex items-center">
                    {studentName}
                  </div>
                )}
              </div>
            </div>

            {/* Row 2: Idea Title */}
            <div>
              <label className="block text-xs font-bold text-ink-normal dark:text-gray-200 mb-1.5 flex items-center gap-1.5">
                <Lightbulb className="w-4 h-4 text-primary" />
                <span>اسم ایده *</span>
              </label>
              <input
                type="text"
                required
                placeholder="عنوان ایده خود را وارد کنید..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-xl px-3.5 py-2.5 border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#151C28] text-ink-darker dark:text-white text-xs md:text-sm font-medium focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all placeholder:text-gray-400 shadow-2xs"
              />
            </div>

            {/* Row 3: Idea Description */}
            <div>
              <label className="block text-xs font-bold text-ink-normal dark:text-gray-200 mb-1.5 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-primary" />
                <span>شرح ایده *</span>
              </label>
              <textarea
                required
                rows={5}
                placeholder="ایده خود را به صورت مختصر و مفید توضیح دهید..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded-xl px-3.5 py-2.5 border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#151C28] text-ink-darker dark:text-white text-xs md:text-sm font-medium focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all placeholder:text-gray-400 shadow-2xs"
              />
            </div>

            {/* Submit Action */}
            <div className="pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-end">
              <Button
                type="submit"
                variant="primary"
                disabled={isSubmitting}
                className="gap-2 text-xs font-black px-6 py-2.5"
              >
                <Send className="w-4 h-4" />
                <span>{isSubmitting ? 'در حال ثبت...' : 'ثبت ایده'}</span>
              </Button>
            </div>
          </form>
        )}
      </div>



      {/* ADMIN EDIT MODAL */}
      <Modal
        isOpen={!!editingIdea}
        onClose={() => setEditingIdea(null)}
        title="ویرایش مدیریت و ادیت فیلدهای ایده (ویژه ادمین)"
      >
        {editingIdea && (
          <form onSubmit={handleSaveAdminEdit} className="space-y-4">
            <div className="p-3 rounded-xl border border-indigo-300 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 text-xs font-black flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-indigo-600" />
              <span>شما به عنوان ادمین مجاز به تغییر تمامی فیلدهای این ایده هستید.</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-black text-zinc-800 dark:text-zinc-200 mb-1">
                  شماره ایده:
                </label>
                <input
                  type="number"
                  required
                  value={editForm.ideaNumber}
                  onChange={(e) => setEditForm({ ...editForm, ideaNumber: Number(e.target.value) })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-[#FAFAFA] dark:bg-[#1C2536] text-ink-darker dark:text-white text-xs font-medium focus:border-primary focus:bg-white dark:focus:bg-[#1C2536] focus:outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-zinc-800 dark:text-zinc-200 mb-1">
                  نام ایده‌پرداز:
                </label>
                <div className="relative">
                  <select
                    value={editForm.authorName}
                    onChange={(e) => setEditForm({ ...editForm, authorName: e.target.value })}
                    className="w-full appearance-none px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-[#FAFAFA] dark:bg-[#1C2536] text-xs font-bold text-ink-darker dark:text-white focus:border-primary focus:bg-white dark:focus:bg-[#1C2536] focus:outline-none transition-all cursor-pointer pr-3.5 pl-8"
                  >
                    {editForm.authorName && !dbStudents.some((s) => s.name === editForm.authorName) && (
                      <option className="bg-white dark:bg-[#151C28] text-ink-darker dark:text-white" value={editForm.authorName}>{editForm.authorName}</option>
                    )}
                    {dbStudents.map((std) => (
                      <option className="bg-white dark:bg-[#151C28] text-ink-darker dark:text-white" key={std.id} value={std.name}>
                        {std.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-black text-zinc-800 dark:text-zinc-200 mb-1">
                اسم ایده:
              </label>
              <input
                type="text"
                required
                value={editForm.title}
                onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-[#FAFAFA] dark:bg-[#1C2536] text-ink-darker dark:text-white text-xs font-medium focus:border-primary focus:bg-white dark:focus:bg-[#1C2536] focus:outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-black text-zinc-800 dark:text-zinc-200 mb-1">
                شرح ایده:
              </label>
              <textarea
                required
                rows={4}
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-[#FAFAFA] dark:bg-[#1C2536] text-ink-darker dark:text-white text-xs font-medium focus:border-primary focus:bg-white dark:focus:bg-[#1C2536] focus:outline-none transition-all"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-800">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditingIdea(null)}
                className="font-bold"
              >
                انصراف
              </Button>
              <Button
                type="submit"
                variant="primary"
                className="font-black"
              >
                ذخیره تغییرات ادمین
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Delete Idea Confirmation Modal */}
      <Modal
        isOpen={showDeleteConfirmModal}
        onClose={() => setShowDeleteConfirmModal(false)}
        title="حذف ایده ثبت‌شده"
        maxWidth="md"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-3.5 rounded-xl bg-rose-50/80 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300">
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-600 dark:text-rose-400" />
            <p className="text-xs sm:text-sm font-medium leading-relaxed">
              آیا از حذف ایده <strong>«{userSubmittedIdea?.title}»</strong> اطمینان دارید؟
            </p>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
            با حذف این ایده، اطلاعات آن پاک شده و امکان ثبت یک ایده جدید مجدداً برای شما فعال خواهد شد.
          </p>
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100 dark:border-gray-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowDeleteConfirmModal(false)}
              className="font-bold text-xs"
            >
              انصراف
            </Button>
            <Button
              type="button"
              onClick={handleDeleteSubmittedIdea}
              className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs gap-1.5"
            >
              <Trash2 className="w-4 h-4" />
              <span>بله، ایده را حذف کن</span>
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
