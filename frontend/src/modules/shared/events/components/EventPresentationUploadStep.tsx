import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Button } from '../../../../components/ui/Button';
import { Modal } from '../../../../components/ui/Modal';
import { toast } from '../../../../components/ui/toast/toast';
import { useAuthStore } from '../../../../lib/auth/auth-store';
import { toPersianDigits } from '../../../../utils/jalali';
import { EventIdea } from './EventIdeaSubmissionStep';
import { loadTeamsMap, buildTaskBoardTeams, TaskBoardTeamInfo } from '../constants/event-taskboard';
import {
  EventDeliverablesConfig,
  TeamDeliverableSubmission,
  defaultDeliverablesConfig,
  loadDeliverablesConfig,
  saveDeliverablesConfig,
  isSubmissionLocked,
  getTimeRemaining,
  TimeRemaining,
  formatFileSize,
  downloadSubmissionFile,
} from '../constants/event-deliverables';
import {
  FileUp,
  Clock,
  Lock,
  Unlock,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Download,
  ExternalLink,
  ShieldCheck,
  User,
  Users,
  Crown,
  FileText,
  FileArchive,
  FileVideo,
  Presentation,
  RefreshCw,
  Edit3,
  Trash2,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Info,
  Timer,
  Send,
  MessageSquare,
  Award,
  Settings2,
  Plus,
  X,
  Check,
  Sliders,
  HardDrive,
  FileType,
} from 'lucide-react';

export const COMMON_FORMAT_PRESETS = [
  { ext: '.pdf', label: 'PDF', desc: 'سند استاندارد' },
  { ext: '.zip', label: 'ZIP', desc: 'آرشیو فشرده' },
  { ext: '.rar', label: 'RAR', desc: 'آرشیو رار' },
  { ext: '.7z', label: '7Z', desc: 'آرشیو سون‌زیپ' },
  { ext: '.pptx', label: 'PPTX', desc: 'ارائه پاورپوینت' },
  { ext: '.ppt', label: 'PPT', desc: 'پاورپوینت قدیمی' },
  { ext: '.docx', label: 'DOCX', desc: 'سند ورد' },
  { ext: '.doc', label: 'DOC', desc: 'ورد قدیمی' },
  { ext: '.mp4', label: 'MP4', desc: 'ویدیو MP4' },
  { ext: '.mkv', label: 'MKV', desc: 'ویدیو MKV' },
  { ext: '.png', label: 'PNG', desc: 'تصویر باکیفیت' },
  { ext: '.jpg', label: 'JPG', desc: 'تصویر فشرده' },
  { ext: '.fig', label: 'FIG', desc: 'پروژه فیگما' },
  { ext: '.blend', label: 'BLEND', desc: 'پروژه بلندر' },
];

interface EventPresentationUploadStepProps {
  eventId: string;
  eventTitle: string;
  ideas: EventIdea[];
  isEventEnded?: boolean;
}

export const EventPresentationUploadStep: React.FC<EventPresentationUploadStepProps> = ({
  eventId,
  eventTitle,
  ideas,
  isEventEnded = false,
}) => {
  const currentUser = useAuthStore((s) => s.user);
  const isManager = ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER', 'STAFF'].includes(
    currentUser?.role || '',
  );
  const isParent = currentUser?.role === 'PARENT';
  const isStudent = currentUser?.role === 'STUDENT';

  const currentUserName = currentUser
    ? `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim()
    : 'کاربر';

  // Teams data
  const teamsMap = useMemo(() => loadTeamsMap(eventId), [eventId]);
  const allTeams = useMemo(
    () => buildTaskBoardTeams(eventId, ideas, teamsMap),
    [eventId, ideas, teamsMap],
  );

  // Deliverables configuration & submissions state
  const [config, setConfig] = useState<EventDeliverablesConfig>(() =>
    loadDeliverablesConfig(eventId),
  );

  // Save changes
  const updateConfig = (updater: (prev: EventDeliverablesConfig) => EventDeliverablesConfig) => {
    setConfig((prev) => {
      const next = updater(prev);
      saveDeliverablesConfig(eventId, next);
      return next;
    });
  };

  // Live Timer
  const [timeRemaining, setTimeRemaining] = useState<TimeRemaining>(() =>
    getTimeRemaining(config.deadline),
  );

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeRemaining(getTimeRemaining(config.deadline));
    }, 1000);
    return () => clearInterval(timer);
  }, [config.deadline]);

  const locked = isSubmissionLocked(config) || isEventEnded;

  // Identify Student's Team & Captain status (strictly only for STUDENT role)
  const myTeamInfo = useMemo(() => {
    if (isManager || isParent || !isStudent) return null;
    const first = (currentUser?.firstName || '').trim().toLowerCase();
    const last = (currentUser?.lastName || '').trim().toLowerCase();
    const full = `${first} ${last}`.trim();

    return allTeams.find((t) => {
      // Check if captain
      const leader = (t.team?.leaderName || t.idea?.authorName || '').trim().toLowerCase();
      if (leader && (leader === full || (last && leader.includes(last)))) return true;

      // Check if member
      return t.memberNames.some((m) => {
        const mn = (m || '').trim().toLowerCase();
        return mn === full || (last && mn.includes(last));
      });
    });
  }, [allTeams, currentUser, isManager, isParent, isStudent]);

  const isCaptainOfMyTeam = useMemo(() => {
    if (!myTeamInfo || isParent || !isStudent) return false;
    const leader = (
      myTeamInfo.team?.leaderName ||
      myTeamInfo.idea?.authorName ||
      ''
    )
      .trim()
      .toLowerCase();
    const first = (currentUser?.firstName || '').trim().toLowerCase();
    const last = (currentUser?.lastName || '').trim().toLowerCase();
    const full = `${first} ${last}`.trim();
    return leader === full || (last && leader.includes(last));
  }, [myTeamInfo, currentUser, isParent, isStudent]);

  // Upload Form State for Team Captain
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileDataUrl, setFileDataUrl] = useState<string>('');
  const [presentationUrl, setPresentationUrl] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load existing submission into form if available
  useEffect(() => {
    if (myTeamInfo && config.submissions[myTeamInfo.key]) {
      const sub = config.submissions[myTeamInfo.key];
      setPresentationUrl(sub.presentationUrl || '');
      setNotes(sub.description || '');
      if (sub.fileDataUrl) setFileDataUrl(sub.fileDataUrl);
    }
  }, [myTeamInfo, config.submissions]);

  // Settings Modal State (Deadline, Formats, Max Size, Instructions)
  const [isDeadlineModalOpen, setIsDeadlineModalOpen] = useState(false);
  const [modalDeadlineDate, setModalDeadlineDate] = useState(() => {
    if (config.deadline) {
      const d = new Date(config.deadline);
      return d.toISOString().slice(0, 16);
    }
    return '';
  });
  const [modalInstructions, setModalInstructions] = useState(config.instructions);
  const [modalAllowedFormats, setModalAllowedFormats] = useState<string[]>(
    config.allowedFormats || ['.pdf', '.zip', '.rar', '.pptx', '.ppt', '.mp4'],
  );
  const [modalMaxFileSizeMb, setModalMaxFileSizeMb] = useState<number>(
    config.maxFileSizeMb || 50,
  );
  const [customFormatInput, setCustomFormatInput] = useState('');

  const openSettingsModal = () => {
    if (config.deadline) {
      const d = new Date(config.deadline);
      setModalDeadlineDate(d.toISOString().slice(0, 16));
    } else {
      setModalDeadlineDate('');
    }
    setModalInstructions(config.instructions || '');
    setModalAllowedFormats(
      config.allowedFormats && config.allowedFormats.length > 0
        ? [...config.allowedFormats]
        : ['.pdf', '.zip', '.rar', '.pptx', '.ppt', '.mp4'],
    );
    setModalMaxFileSizeMb(config.maxFileSizeMb || 50);
    setCustomFormatInput('');
    setIsDeadlineModalOpen(true);
  };

  // Feedback Modal State for Manager
  const [selectedSubForFeedback, setSelectedSubForFeedback] =
    useState<TeamDeliverableSubmission | null>(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackStatus, setFeedbackStatus] = useState<
    'SUBMITTED' | 'APPROVED' | 'NEEDS_REVISION'
  >('APPROVED');

  // Validate File Extension and Size
  const validateFile = (file: File): boolean => {
    // 1. Extension check
    const fileName = file.name;
    const dotIndex = fileName.lastIndexOf('.');
    const ext = dotIndex !== -1 ? fileName.slice(dotIndex).toLowerCase() : '';

    const allowed = config.allowedFormats || ['.pdf', '.zip', '.rar', '.pptx', '.ppt', '.mp4'];
    if (allowed.length > 0) {
      const isAllowed = allowed.some((f) => f.toLowerCase().trim() === ext);
      if (!isAllowed) {
        toast.error(
          `فرمت فایل (${ext || 'نامعتبر'}) مجاز نیست. فرمت‌های مجاز: ${allowed.join(' ، ')}`,
        );
        return false;
      }
    }

    // 2. Size check (< maxFileSizeMb)
    const maxMb = config.maxFileSizeMb || 50;
    const maxBytes = maxMb * 1024 * 1024;
    if (file.size > maxBytes) {
      toast.error(
        `حجم فایل (${formatFileSize(file.size)}) بیشتر از سقف مجاز (${toPersianDigits(maxMb)} مگابایت) است.`,
      );
      return false;
    }

    return true;
  };

  // File Handling
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!validateFile(file)) {
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setSelectedFile(file);

    // Read as DataURL for persistence & instant download
    const reader = new FileReader();
    reader.onload = () => {
      setFileDataUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (locked) return;
    const file = e.dataTransfer.files?.[0];
    if (file) {
      if (!validateFile(file)) return;
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onload = () => {
        setFileDataUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Submit Deliverable
  const handleSubmitDeliverable = (e: React.FormEvent) => {
    e.preventDefault();
    if (isParent || (!isStudent && !isManager)) {
      toast.error('آپلود و ارسال فایل‌های نهایی فقط مختص اعضای دانش‌آموز تیم و سرتیم است.');
      return;
    }

    if (!myTeamInfo) {
      toast.error('تیم شما یافت نشد.');
      return;
    }

    const prevSub = config.submissions[myTeamInfo.key];

    if (!selectedFile && !prevSub && !presentationUrl.trim()) {
      toast.error('لطفاً یک فایل یا لینک ارائه معتبر وارد نمایید.');
      return;
    }

    setIsUploading(true);

    setTimeout(() => {
      const fileName = selectedFile
        ? selectedFile.name
        : prevSub?.fileName || 'presentation_link.txt';
      const fileSize = selectedFile ? selectedFile.size : prevSub?.fileSize || 0;
      const fileType = selectedFile
        ? selectedFile.type
        : prevSub?.fileType || 'application/octet-stream';

      const newSubmission: TeamDeliverableSubmission = {
        ideaId: myTeamInfo.key,
        teamName: myTeamInfo.label,
        leaderName: myTeamInfo.team?.leaderName || myTeamInfo.idea?.authorName || currentUserName,
        submittedBy: currentUserName,
        submittedAt: new Date().toISOString(),
        fileName,
        fileSize,
        fileType,
        fileDataUrl: fileDataUrl || prevSub?.fileDataUrl,
        presentationUrl: presentationUrl.trim(),
        description: notes.trim(),
        status: 'SUBMITTED', // Reset to submitted upon new upload / revision
        version: (prevSub?.version || 0) + 1,
        adminFeedback: prevSub?.adminFeedback,
      };

      updateConfig((prev) => ({
        ...prev,
        submissions: {
          ...prev.submissions,
          [myTeamInfo.key]: newSubmission,
        },
      }));

      setIsUploading(false);
      setSelectedFile(null);
      toast.success(
        prevSub
          ? 'فایل اصلاح‌شده با موفقیت ثبت شد و در انتظار بررسی مدیر قرار گرفت.'
          : 'فایل و اطلاعات ارائه تیم با موفقیت بارگذاری شد و قفل گردید.',
      );
    }, 600);
  };

  // Manager Deadline & Format Actions
  const handleSaveDeadlineConfig = () => {
    if (!modalDeadlineDate) {
      toast.error('لطفاً تاریخ و ساعت پایان مهلت را مشخص کنید.');
      return;
    }
    if (modalAllowedFormats.length === 0) {
      toast.error('حداقل یک فرمت مجاز برای فایل‌ها باید انتخاب شود.');
      return;
    }

    const isoDate = new Date(modalDeadlineDate).toISOString();
    updateConfig((prev) => ({
      ...prev,
      deadline: isoDate,
      instructions: modalInstructions,
      allowedFormats: modalAllowedFormats,
      maxFileSizeMb: modalMaxFileSizeMb > 0 ? modalMaxFileSizeMb : 50,
      isManuallyLocked: false,
      isManuallyOpened: false,
    }));

    setIsDeadlineModalOpen(false);
    toast.success('تنظیمات مهلت تحویل و فرمت‌های مجاز با موفقیت ذخیره شد.');
  };

  const handleToggleFormat = (fmt: string) => {
    const normalized = fmt.toLowerCase().trim();
    setModalAllowedFormats((prev) =>
      prev.includes(normalized)
        ? prev.filter((f) => f !== normalized)
        : [...prev, normalized],
    );
  };

  const handleRemoveFormat = (fmt: string) => {
    const normalized = fmt.toLowerCase().trim();
    setModalAllowedFormats((prev) => prev.filter((f) => f !== normalized));
  };

  const handleAddCustomFormat = () => {
    let clean = customFormatInput.trim().toLowerCase();
    if (!clean) return;
    if (!clean.startsWith('.')) {
      clean = '.' + clean;
    }
    // Simple extension format validation
    if (!/^\.[a-z0-9_-]+$/.test(clean)) {
      toast.error('فرمت وارد شده معتبر نیست (مثال: zip. یا apk.)');
      return;
    }
    if (modalAllowedFormats.includes(clean)) {
      toast.info(`فرمت ${clean} قبلاً در لیست وجود دارد.`);
      return;
    }
    setModalAllowedFormats((prev) => [...prev, clean]);
    setCustomFormatInput('');
    toast.success(`فرمت ${clean} به لیست مجاز افزوده شد.`);
  };

  const handleSelectAllPresets = () => {
    const allExts = Array.from(
      new Set([...modalAllowedFormats, ...COMMON_FORMAT_PRESETS.map((p) => p.ext)]),
    );
    setModalAllowedFormats(allExts);
  };

  const handleResetDefaultFormats = () => {
    setModalAllowedFormats(['.pdf', '.zip', '.rar', '.pptx', '.ppt', '.mp4']);
    setModalMaxFileSizeMb(50);
    toast.info('فرمت‌ها و حجم به حالت پیش‌فرض بازنشانی شدند.');
  };

  const handleQuickPresetDeadline = (hoursFromNow: number) => {
    const d = new Date(Date.now() + hoursFromNow * 60 * 60 * 1000);
    setModalDeadlineDate(d.toISOString().slice(0, 16));
  };

  const handleToggleManualLock = () => {
    updateConfig((prev) => {
      const nextLocked = !prev.isManuallyLocked;
      return {
        ...prev,
        isManuallyLocked: nextLocked,
        isManuallyOpened: false,
      };
    });
    if (!config.isManuallyLocked) {
      toast.info('ارسال فایل‌ها توسط مدیر قفل شد.');
    } else {
      toast.success('قفل دستی غیرفعال شد.');
    }
  };

  const handleToggleManualOpen = () => {
    updateConfig((prev) => {
      const nextOpened = !prev.isManuallyOpened;
      return {
        ...prev,
        isManuallyOpened: nextOpened,
        isManuallyLocked: false,
      };
    });
    if (!config.isManuallyOpened) {
      toast.success('ارسال فایل‌ها مجدداً توسط مدیر بازگشایی شد.');
    } else {
      toast.info('بازگشایی اضطراری لغو شد.');
    }
  };

  // Save Feedback & Status
  const handleSaveFeedback = () => {
    if (!selectedSubForFeedback) return;
    updateConfig((prev) => ({
      ...prev,
      submissions: {
        ...prev.submissions,
        [selectedSubForFeedback.ideaId]: {
          ...selectedSubForFeedback,
          adminFeedback: feedbackText.trim(),
          status: feedbackStatus,
        },
      },
    }));

    if (feedbackStatus === 'APPROVED') {
      toast.success('پروژه تیم تایید شد.');
    } else if (feedbackStatus === 'NEEDS_REVISION') {
      toast.warning('وضعیت به «نیاز به اصلاح» تغییر یافت و امکان ویرایش برای سرتیم باز شد.');
    } else {
      toast.info('وضعیت پروژه ذخیره شد.');
    }

    setSelectedSubForFeedback(null);
  };

  // Icon helper based on file extension
  const getFileIcon = (fileName?: string) => {
    if (!fileName) return <FileText className="w-5 h-5 text-indigo-600" />;
    const lower = fileName.toLowerCase();
    if (lower.endsWith('.zip') || lower.endsWith('.rar') || lower.endsWith('.7z')) {
      return <FileArchive className="w-5 h-5 text-amber-600" />;
    }
    if (lower.endsWith('.mp4') || lower.endsWith('.mkv') || lower.endsWith('.mov')) {
      return <FileVideo className="w-5 h-5 text-rose-600" />;
    }
    if (lower.endsWith('.pptx') || lower.endsWith('.ppt') || lower.endsWith('.key')) {
      return <Presentation className="w-5 h-5 text-orange-600" />;
    }
    return <FileText className="w-5 h-5 text-blue-600" />;
  };

  // Calculations for Manager
  const totalTeamsCount = allTeams.length;
  const submittedCount = Object.keys(config.submissions).length;
  const pendingCount = Math.max(0, totalTeamsCount - submittedCount);

  return (
    <div className="space-y-6">
      {/* Top Banner: Module Title & Countdown Timer */}
      <div className="rounded-2xl border-[1.5px] border-primary-dark/30 dark:border-gray-800 bg-white dark:bg-[#151C28] shadow-[2px_2px_0_#59BBAF] dark:shadow-[2px_2px_0_#0B0F17] p-5 sm:p-7 space-y-2">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg md:text-xl font-black text-ink-darker dark:text-white flex items-center gap-2">
              <FileUp className="w-5 h-5 text-primary shrink-0" />
              <span>گام هفتم: تحویل فایل ارائه</span>
            </h2>
            <p className="text-xs md:text-sm font-medium text-gray-500 dark:text-gray-400 mt-3">
              فایل پیچ‌دک، اسلاید ارائه یا مستندات پروژه نهایی تیم را بارگذاری نمایید.
            </p>
          </div>

          {/* Countdown & Status Box */}
          <div className="flex flex-wrap items-center gap-3">
            <div
              className={`flex items-center gap-3 px-4 py-2 rounded-xl border shadow-2xs ${
                locked
                  ? 'border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-300'
                  : timeRemaining.days === 0 && timeRemaining.hours < 3
                  ? 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300 animate-pulse'
                  : 'border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
              }`}
            >
              <Timer className="w-5 h-5 shrink-0" />
              <div className="text-right">
                <div className="text-xs font-medium opacity-80">
                  {locked
                    ? 'وضعیت مهلت ارسال:'
                    : config.isManuallyOpened
                    ? 'بازگشایی اضطراری مدیر:'
                    : 'زمان باقی‌مانده تا پایان تحویل:'}
                </div>
                <div className="text-xs md:text-sm font-black font-mono mt-0.5">
                  {locked ? (
                    <span className="flex items-center gap-1 text-rose-600 dark:text-rose-400">
                      <Lock className="w-3.5 h-3.5" />
                      <span>مهلت به پایان رسیده (قفل)</span>
                    </span>
                  ) : (
                    <span>
                      {toPersianDigits(timeRemaining.days)} روز و{' '}
                      {toPersianDigits(timeRemaining.hours)} ساعت و{' '}
                      {toPersianDigits(timeRemaining.minutes)} دقیقه و{' '}
                      {toPersianDigits(timeRemaining.seconds)} ثانیه
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Manager Actions Bar */}
            {isManager && !isEventEnded && (
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={openSettingsModal}
                  className="gap-1.5 font-bold text-xs"
                >
                  <Settings2 className="w-4 h-4" />
                  <span>تنظیم فرمت‌ها و مهلت</span>
                </Button>

                {locked ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleToggleManualOpen}
                    className="gap-1.5 font-bold text-xs text-emerald-600 border-emerald-500/30 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                  >
                    <Unlock className="w-4 h-4" />
                    <span>بازگشایی مجدد</span>
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleToggleManualLock}
                    className="gap-1.5 font-bold text-xs text-rose-600 border-rose-500/30 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                  >
                    <Lock className="w-4 h-4" />
                    <span>قفل دستی</span>
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Manager Format & Limits Summary Bar */}
        {isManager && (
          <div className="mt-3.5 pt-3 border-t border-gray-100 dark:border-gray-800 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="font-bold text-gray-500 dark:text-gray-400 flex items-center gap-1">
                <FileType className="w-3.5 h-3.5 text-primary" />
                فرمت‌های مجاز فایل:
              </span>
              {(config.allowedFormats || []).length > 0 ? (
                (config.allowedFormats || []).map((fmt) => (
                  <span
                    key={fmt}
                    className="px-2 py-0.5 rounded-lg bg-primary/10 text-primary font-mono font-bold text-xs border border-primary/20"
                  >
                    {fmt.toUpperCase()}
                  </span>
                ))
              ) : (
                <span className="text-gray-400">همه فرمت‌ها مجاز</span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold text-xs border border-amber-500/20 flex items-center gap-1">
                <HardDrive className="w-3 h-3 text-amber-500" />
                حداکثر حجم: {toPersianDigits(config.maxFileSizeMb || 50)} مگابایت
              </span>

              <button
                type="button"
                onClick={openSettingsModal}
                className="text-xs text-primary hover:underline font-bold"
              >
                تغییر تنظیمات
              </button>
            </div>
          </div>
        )}

        {/* Manager Stats Bar */}
        {isManager && (
          <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 text-center">
            <div className="p-3 rounded-xl bg-gray-50/70 dark:bg-[#1C2536]/50 border border-gray-200/80 dark:border-gray-800">
              <div className="text-xs text-gray-400 font-medium">کل تیم‌ها</div>
              <div className="text-base font-black text-ink-darker dark:text-white mt-0.5">
                {toPersianDigits(totalTeamsCount)} تیم
              </div>
            </div>
            <div className="p-3 rounded-xl bg-emerald-500/10 dark:bg-emerald-950/20 border border-emerald-500/20">
              <div className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                فایل ارسال کرده‌اند
              </div>
              <div className="text-base font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                {toPersianDigits(submittedCount)} تیم
              </div>
            </div>
            <div className="p-3 rounded-xl bg-amber-500/10 dark:bg-amber-950/20 border border-amber-500/20">
              <div className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                در انتظار ارسال
              </div>
              <div className="text-base font-black text-amber-600 dark:text-amber-400 mt-0.5">
                {toPersianDigits(pendingCount)} تیم
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main View for Students / Team Captain */}
      {!isManager && !isParent && (
        <div className="space-y-6">
          {!myTeamInfo ? (
            <div className="rounded-2xl border border-dashed border-amber-500/30 bg-amber-500/10 dark:bg-amber-950/20 p-6 text-center space-y-3">
              <Users className="w-10 h-10 text-amber-500 mx-auto" />
              <h3 className="text-base font-black text-ink-darker dark:text-white">
                شما هنوز در هیچ تیمی عضو نشده‌اید
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 max-w-md mx-auto">
                برای تحویل فایل ارائه، ابتدا در مرحله ۴ (تشکیل تیم) به یکی از ایده‌ها بپیوندید یا تیم
                خود را ایجاد کنید.
              </p>
            </div>
          ) : !isCaptainOfMyTeam ? (
            /* Member View (Non-Captain) */
            <div className="rounded-2xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-[#151C28] p-5 md:p-6 shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  <h3 className="font-black text-ink-darker dark:text-white">
                    تیم: {myTeamInfo.label}
                  </h3>
                </div>
                <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-[#1C2536] text-gray-600 dark:text-gray-300">
                  عضو تیم
                </span>
              </div>

              <div className="p-4 rounded-xl bg-primary/5 dark:bg-primary/10 border border-primary/20 text-xs text-ink-darker dark:text-white space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <Crown className="w-4 h-4 text-amber-500" />
                  <span>
                    سرتیم شما:{' '}
                    {myTeamInfo.team?.leaderName || myTeamInfo.idea?.authorName || 'نامشخص'}
                  </span>
                </div>
                <p className="text-gray-500 dark:text-gray-400 text-[11px] pt-1">
                  طبق قوانین رویداد، بارگذاری و ویرایش فایل ارائه نهایی تنها توسط سرتیم انجام می‌شود.
                </p>
              </div>

              {/* Status of Team's Deliverable */}
              {config.submissions[myTeamInfo.key] ? (
                <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 dark:bg-emerald-950/20 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
                        فایل توسط سرتیم بارگذاری شده است
                      </span>
                    </div>
                    <span className="text-[10px] text-gray-400 font-mono">
                      نسخه {toPersianDigits(config.submissions[myTeamInfo.key].version)}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-white dark:bg-[#151C28] border border-gray-200/80 dark:border-gray-800 shadow-2xs">
                    <div className="flex items-center gap-2.5">
                      {getFileIcon(config.submissions[myTeamInfo.key].fileName)}
                      <div>
                        <div className="text-xs font-bold text-ink-darker dark:text-white">
                          {config.submissions[myTeamInfo.key].fileName}
                        </div>
                        <div className="text-[10px] text-gray-400">
                          حجم:{' '}
                          {toPersianDigits(
                            formatFileSize(config.submissions[myTeamInfo.key].fileSize),
                          )}
                        </div>
                      </div>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        downloadSubmissionFile(config.submissions[myTeamInfo.key])
                      }
                      className="gap-1 text-xs font-bold"
                    >
                      <Download className="w-3.5 h-3.5 text-primary" />
                      <span>دانلود فایل</span>
                    </Button>
                  </div>

                  {config.submissions[myTeamInfo.key].presentationUrl && (
                    <div className="text-xs text-primary flex items-center gap-1.5">
                      <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                      <span>لینک ارائه آنلاین: </span>
                      <a
                        href={config.submissions[myTeamInfo.key].presentationUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="underline truncate font-mono text-[11px]"
                      >
                        {config.submissions[myTeamInfo.key].presentationUrl}
                      </a>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/10 text-xs text-amber-800 dark:text-amber-200 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    سرتیم شما هنوز فایلی ارسال نکرده است. لطفاً با سرتیم خود جهت تحویل قبل از اتمام مهلت هماهنگ کنید.
                  </span>
                </div>
              )}
            </div>
          ) : (
            /* Team Captain Upload Form */
            <div className="rounded-2xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-[#151C28] p-5 md:p-6 shadow-2xs space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Crown className="w-5 h-5 text-amber-500" />
                  <h3 className="font-black text-ink-darker dark:text-white">
                    پنل تحویل پروژه - تیم {myTeamInfo.label}
                  </h3>
                </div>
                <span className="text-xs font-bold px-3 py-1 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                  شما سرتیم هستید
                </span>
              </div>

              {/* 1. Global Deadline/Manager Lock Notice */}
              {locked ? (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl border-2 border-rose-400 bg-rose-50 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200 space-y-2">
                    <div className="flex items-center gap-2 font-black text-sm">
                      <Lock className="w-4 h-4" />
                      <span>مهلت تحویل به پایان رسیده است</span>
                    </div>
                    <p className="text-xs text-rose-700 dark:text-rose-300">
                      امکان بارگذاری یا تغییر فایل وجود ندارد. در صورت نیاز به تمدید، با مدیر رویداد تماس حاصل فرمایید.
                    </p>
                  </div>

                  {/* Show team's submission if any */}
                  {config.submissions[myTeamInfo.key] && (
                    <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 space-y-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-zinc-600 dark:text-zinc-400">
                          فایل ثبت‌شده نهایی تیم شما:
                        </span>
                        <span className="text-[10px] text-zinc-400 font-mono">
                          ارسال شده در:{' '}
                          {new Date(config.submissions[myTeamInfo.key].submittedAt).toLocaleString('fa-IR')}
                        </span>
                      </div>

                      <div className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-[#1E293B] border border-zinc-200 dark:border-zinc-700">
                        <div className="flex items-center gap-2.5">
                          {getFileIcon(config.submissions[myTeamInfo.key].fileName)}
                          <div>
                            <div className="text-xs font-black text-zinc-900 dark:text-zinc-100">
                              {config.submissions[myTeamInfo.key].fileName}
                            </div>
                            <div className="text-[10px] text-zinc-500 font-mono">
                              حجم: {toPersianDigits(formatFileSize(config.submissions[myTeamInfo.key].fileSize))} • نسخه {toPersianDigits(config.submissions[myTeamInfo.key].version)}
                            </div>
                          </div>
                        </div>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => downloadSubmissionFile(config.submissions[myTeamInfo.key])}
                          className="gap-1 text-xs"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>دانلود فایل</span>
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ) : config.submissions[myTeamInfo.key] && config.submissions[myTeamInfo.key].status === 'APPROVED' ? (
                /* 2. Approved Deliverable View (Locked) */
                <div className="space-y-4">
                  <div className="p-4 rounded-xl border-2 border-emerald-500 bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-200 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2 font-black text-sm text-emerald-900 dark:text-emerald-100">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                        <span>فایل و ارائه تیم شما توسط مدیر رویداد تایید شد</span>
                      </div>
                    </div>
                    <p className="text-xs text-emerald-800 dark:text-emerald-300">
                      پروژه نهایی شما مورد بررسی و تایید قرار گرفت. امکان ویرایش فایل پس از تایید بسته است.
                    </p>

                    {config.submissions[myTeamInfo.key].adminFeedback && (
                      <div className="mt-2.5 p-3 rounded-lg bg-white dark:bg-zinc-800 border border-emerald-200 dark:border-emerald-800 text-xs text-zinc-800 dark:text-zinc-200">
                        <span className="font-black text-emerald-700 dark:text-emerald-400">بازخورد و نکات داور: </span>
                        <span>{config.submissions[myTeamInfo.key].adminFeedback}</span>
                      </div>
                    )}
                  </div>

                  {/* Submitted File Card */}
                  <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-zinc-600 dark:text-zinc-400">مشخصات فایل تاییدشده:</span>
                      <span className="text-[10px] text-zinc-400 font-mono">
                        نسخه {toPersianDigits(config.submissions[myTeamInfo.key].version)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-[#1E293B] border border-zinc-200 dark:border-zinc-700">
                      <div className="flex items-center gap-2.5">
                        {getFileIcon(config.submissions[myTeamInfo.key].fileName)}
                        <div>
                          <div className="text-xs font-black text-zinc-900 dark:text-zinc-100">
                            {config.submissions[myTeamInfo.key].fileName}
                          </div>
                          <div className="text-[10px] text-zinc-500 font-mono">
                            حجم: {toPersianDigits(formatFileSize(config.submissions[myTeamInfo.key].fileSize))}
                          </div>
                        </div>
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => downloadSubmissionFile(config.submissions[myTeamInfo.key])}
                        className="gap-1 text-xs"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>دانلود فایل</span>
                      </Button>
                    </div>

                    {config.submissions[myTeamInfo.key].presentationUrl && (
                      <div className="text-xs text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5 pt-1">
                        <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                        <span>لینک ارائه آنلاین: </span>
                        <a
                          href={config.submissions[myTeamInfo.key].presentationUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="underline truncate font-mono text-[11px]"
                        >
                          {config.submissions[myTeamInfo.key].presentationUrl}
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              ) : config.submissions[myTeamInfo.key] && config.submissions[myTeamInfo.key].status === 'SUBMITTED' ? (
                /* 3. Submitted & Locked for Review View */
                <div className="space-y-4">
                  <div className="p-4 rounded-xl border-2 border-indigo-400 bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-950 dark:text-indigo-200 space-y-2">
                    <div className="flex items-center gap-2 font-black text-sm text-indigo-900 dark:text-indigo-100">
                      <Lock className="w-4 h-4 text-indigo-600" />
                      <span>فایل ارائه تیم شما ارسال شد و در انتظار بررسی مدیر است (قفل شده)</span>
                    </div>
                    <p className="text-xs text-indigo-800 dark:text-indigo-300 leading-relaxed">
                      پروژه شما با موفقیت دریافت شد. طبق مقررات، پس از ارسال اولیه امکان ویرایش یا ارسال مجدد فایل وجود ندارد مگر اینکه مدیر رویداد در پنل خود وضعیت پروژه شما را به «نیاز به اصلاح» تغییر دهد.
                    </p>
                  </div>

                  {/* Submitted File Card */}
                  <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-zinc-600 dark:text-zinc-400">فایل ثبت‌شده شما:</span>
                      <span className="text-[10px] text-zinc-400 font-mono">
                        ارسال شده در:{' '}
                        {new Date(config.submissions[myTeamInfo.key].submittedAt).toLocaleString('fa-IR')}
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-[#1E293B] border border-zinc-200 dark:border-zinc-700">
                      <div className="flex items-center gap-2.5">
                        {getFileIcon(config.submissions[myTeamInfo.key].fileName)}
                        <div>
                          <div className="text-xs font-black text-zinc-900 dark:text-zinc-100">
                            {config.submissions[myTeamInfo.key].fileName}
                          </div>
                          <div className="text-[10px] text-zinc-500 font-mono">
                            حجم: {toPersianDigits(formatFileSize(config.submissions[myTeamInfo.key].fileSize))} • نسخه {toPersianDigits(config.submissions[myTeamInfo.key].version)}
                          </div>
                        </div>
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => downloadSubmissionFile(config.submissions[myTeamInfo.key])}
                        className="gap-1 text-xs"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>دانلود فایل</span>
                      </Button>
                    </div>

                    {config.submissions[myTeamInfo.key].presentationUrl && (
                      <div className="text-xs text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5 pt-1">
                        <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                        <span>لینک ارائه آنلاین: </span>
                        <a
                          href={config.submissions[myTeamInfo.key].presentationUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="underline truncate font-mono text-[11px]"
                        >
                          {config.submissions[myTeamInfo.key].presentationUrl}
                        </a>
                      </div>
                    )}

                    {config.submissions[myTeamInfo.key].description && (
                      <div className="text-xs text-zinc-600 dark:text-zinc-400 pt-1">
                        <span className="font-bold">توضیحات سرتیم: </span>
                        <span>{config.submissions[myTeamInfo.key].description}</span>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* 4. Active Upload Form (Initial Submission OR Revision Requested) */
                <div className="space-y-4">
                  {/* If revision requested by manager, show prominent feedback banner */}
                  {config.submissions[myTeamInfo.key]?.status === 'NEEDS_REVISION' && (
                    <div className="p-4 rounded-xl border-2 border-amber-500 bg-amber-50 dark:bg-amber-950/40 text-amber-950 dark:text-amber-200 space-y-2">
                      <div className="flex items-center gap-2 font-black text-sm text-amber-900 dark:text-amber-100">
                        <AlertCircle className="w-5 h-5 text-amber-600" />
                        <span>وضعیت پروژه: نیاز به اصلاح مجدد (ویرایش برای شما باز شد)</span>
                      </div>
                      <p className="text-xs text-amber-800 dark:text-amber-300">
                        مدیر رویداد پروژه شما را بررسی کرده و درخواست اصلاح داده است. لطفاً پس از انجام اصلاحات، فایل نسخه جدید را بارگذاری و ارسال فرمایید.
                      </p>

                      {config.submissions[myTeamInfo.key]?.adminFeedback && (
                        <div className="mt-2 p-3 rounded-lg bg-white dark:bg-zinc-800 border border-amber-300 dark:border-amber-700 text-xs text-zinc-900 dark:text-zinc-100 flex items-start gap-2">
                          <FileText className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-black text-amber-800 dark:text-amber-300">نکات و توضیحات اصلاحی مدیر: </span>
                            <span>{config.submissions[myTeamInfo.key]?.adminFeedback}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <form onSubmit={handleSubmitDeliverable} className="space-y-4">
                    {/* Instructions */}
                    <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 text-xs text-zinc-600 dark:text-zinc-300 flex items-start gap-2">
                      <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                      <span>{config.instructions}</span>
                    </div>

                    {/* Drag & Drop File Zone */}
                    <div
                      onDragOver={handleDragOver}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className={`relative border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
                        selectedFile
                          ? 'border-emerald-500 bg-emerald-50/30 dark:bg-emerald-950/20'
                          : 'border-zinc-300 dark:border-zinc-700 hover:border-primary bg-zinc-50/50 dark:bg-zinc-900/30'
                      }`}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        onChange={handleFileChange}
                        accept={(config.allowedFormats || []).join(',')}
                        className="hidden"
                      />

                      <div className="flex flex-col items-center justify-center space-y-2">
                        <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400 flex items-center justify-center shadow-xs">
                          <FileUp className="w-6 h-6" />
                        </div>

                        {selectedFile ? (
                          <div className="space-y-1">
                            <div className="text-sm font-black text-emerald-800 dark:text-emerald-300">
                              {selectedFile.name}
                            </div>
                            <div className="text-xs text-zinc-500 font-mono">
                              حجم: {toPersianDigits(formatFileSize(selectedFile.size))}
                            </div>
                            <span className="inline-block text-[11px] text-emerald-600 font-bold underline">
                              برای تغییر فایل کلیک کنید
                            </span>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <div className="text-sm font-black text-zinc-800 dark:text-zinc-200">
                              فایل ارائه یا پروژه را اینجا بکشید یا کلیک کنید
                            </div>
                            <div className="flex flex-wrap items-center justify-center gap-1 max-w-md mx-auto pt-1">
                              <span className="text-[11px] text-zinc-500 font-bold ml-1">
                                فرمت‌های مجاز:
                              </span>
                              {(config.allowedFormats || []).length > 0 ? (
                                (config.allowedFormats || []).map((fmt) => (
                                  <span
                                    key={fmt}
                                    className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 font-mono font-bold text-[10px] border border-indigo-200 dark:border-indigo-800"
                                  >
                                    {fmt.toUpperCase()}
                                  </span>
                                ))
                              ) : (
                                <span className="text-[10px] text-zinc-400">تمام پسوندها مجاز است</span>
                              )}
                              <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 font-bold text-[10px] border border-amber-200 dark:border-amber-800 mr-1">
                                سقف حجم: {toPersianDigits(config.maxFileSizeMb || 50)}MB
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Presentation URL & Notes */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5 text-right">
                        <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                          <ExternalLink className="w-3.5 h-3.5 text-indigo-500" />
                          <span>لینک ارائه آنلاین (Figma, Canva, Google Slides و ...) - اختیاری</span>
                        </label>
                        <input
                          type="url"
                          value={presentationUrl}
                          onChange={(e) => setPresentationUrl(e.target.value)}
                          placeholder="https://canva.com/..."
                          className="w-full text-xs font-mono p-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:outline-hidden focus:ring-2 focus:ring-primary"
                        />
                      </div>

                      <div className="space-y-1.5 text-right">
                        <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                          <MessageSquare className="w-3.5 h-3.5 text-indigo-500" />
                          <span>توضیحات و نکات سرتیم برای داوران و مدیران - اختیاری</span>
                        </label>
                        <input
                          type="text"
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          placeholder="نکات مهم درباره پروژه یا ابزارهای مورد استفاده..."
                          className="w-full text-xs p-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:outline-hidden focus:ring-2 focus:ring-primary"
                        />
                      </div>
                    </div>

                    {/* Submit Button */}
                    <Button
                      type="submit"
                      variant="primary"
                      className="w-full h-11 text-sm font-black gap-2 shadow-[2px_2px_0px_0px_#202A5A]"
                      isLoading={isUploading}
                    >
                      <Send className="w-4 h-4" />
                      <span>
                        {config.submissions[myTeamInfo.key]?.status === 'NEEDS_REVISION'
                          ? 'ارسال فایل اصلاح‌شده (نسخه جدید)'
                          : 'ثبت و ارسال نهایی فایل ارائه'}
                      </span>
                    </Button>
                  </form>

                  {/* Previous submission preview if revision */}
                  {config.submissions[myTeamInfo.key] && (
                    <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 space-y-2">
                      <div className="text-[11px] font-bold text-zinc-500">مشخصات فایل نسخه قبلی ارسالی:</div>
                      <div className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 text-xs">
                        <div className="flex items-center gap-2">
                          {getFileIcon(config.submissions[myTeamInfo.key].fileName)}
                          <span className="font-bold text-zinc-800 dark:text-zinc-200">
                            {config.submissions[myTeamInfo.key].fileName}
                          </span>
                          <span className="text-[10px] text-zinc-400 font-mono">
                            ({toPersianDigits(formatFileSize(config.submissions[myTeamInfo.key].fileSize))})
                          </span>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => downloadSubmissionFile(config.submissions[myTeamInfo.key])}
                          className="h-7 text-[10px] gap-1"
                        >
                          <Download className="w-3 h-3" />
                          <span>دانلود</span>
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Main View for Parents (Spectator Mode) */}
      {isParent && (
        <div className="space-y-6">
          <div className="rounded-2xl border-2 border-blue-300 bg-blue-50/70 dark:bg-blue-950/30 p-6 text-center space-y-3">
            <Users className="w-10 h-10 text-blue-600 mx-auto" />
            <h3 className="text-base font-black text-blue-950 dark:text-blue-200">
              حالت مشاهده‌گر اولیاء گرامی
            </h3>
            <p className="text-xs text-blue-800 dark:text-blue-300 max-w-lg mx-auto leading-relaxed">
              تحویل و آپلود فایل‌های نهایی مختص سرتیم‌ها و دانش‌آموزان است. شما می‌توانید فایل‌ها، اسلایدها و وضعیت تحویل پروژه‌های تیم‌ها را در این بخش مشاهده و دریافت نمایید.
            </p>
          </div>

          <div className="rounded-2xl border-[1.5px] border-[#EAEAEA] bg-white p-5 md:p-6 shadow-[2.75px_2.75px_0_#202A5A] dark:border-[#242F42] dark:bg-[#151C28] space-y-4">
            <h3 className="font-black text-base text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <Presentation className="w-5 h-5 text-indigo-600" />
              <span>فهرست فایل‌ها و اسلایدهای ارائه‌شده تیم‌ها</span>
            </h3>

            {allTeams.length === 0 ? (
              <div className="p-8 text-center text-zinc-400 text-xs">
                هنوز تیمی در این رویداد تعریف نشده است.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {allTeams.map((team, idx) => {
                  const sub = config.submissions[team.key];
                  const leader = team.team?.leaderName || team.idea?.authorName || 'نامشخص';

                  return (
                    <div
                      key={team.key}
                      className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50/70 dark:bg-zinc-800/60 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="font-black text-sm text-zinc-900 dark:text-zinc-100">
                          #{toPersianDigits(idx + 1)} {team.label}
                        </div>
                        {sub ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300">
                            ارسال شده
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300">
                            در انتظار ارسال
                          </span>
                        )}
                      </div>

                      <div className="text-xs text-zinc-500">
                        سرتیم: <strong className="text-zinc-800 dark:text-zinc-200">{leader}</strong>
                      </div>

                      {sub && (
                        <div className="pt-2 border-t border-zinc-200 dark:border-zinc-700 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            {getFileIcon(sub.fileName)}
                            <span className="font-bold text-zinc-800 dark:text-zinc-200 truncate max-w-[150px]">
                              {sub.fileName}
                            </span>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => downloadSubmissionFile(sub)}
                            className="text-[11px] gap-1"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>دانلود</span>
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main View for Managers (Dashboard & Submissions Table) */}
      {isManager && (
        <div className="rounded-2xl border-[1.5px] border-[#EAEAEA] bg-white p-5 md:p-6 shadow-[2.75px_2.75px_0_#202A5A] dark:border-[#242F42] dark:bg-[#151C28] space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-indigo-600" />
              <h3 className="font-black text-base text-zinc-900 dark:text-zinc-100">
                فهرست تحویل فایل‌ها و اسلاید‌های تیم‌ها
              </h3>
            </div>
          </div>

          {/* Submissions Table */}
          {allTeams.length === 0 ? (
            <div className="p-8 text-center text-zinc-400 text-xs">
              هنوز تیمی در این رویداد تعریف نشده است.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400">
                    <th className="pb-3 pr-2 font-black">#</th>
                    <th className="pb-3 font-black">نام تیم و ایده</th>
                    <th className="pb-3 font-black">سرتیم و اعضاء</th>
                    <th className="pb-3 font-black">وضعیت ارسال</th>
                    <th className="pb-3 font-black">مشخصات فایل</th>
                    <th className="pb-3 font-black">زمان ارسال</th>
                    <th className="pb-3 pl-2 font-black text-center">عملیات و بررسی</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {allTeams.map((team, idx) => {
                    const sub = config.submissions[team.key];
                    const leader =
                      team.team?.leaderName || team.idea?.authorName || 'نامشخص';

                    return (
                      <tr
                        key={team.key}
                        className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition-colors"
                      >
                        <td className="py-3 pr-2 font-bold text-zinc-400">
                          {toPersianDigits(idx + 1)}
                        </td>

                        <td className="py-3">
                          <div className="font-black text-zinc-900 dark:text-zinc-100">
                            {team.label}
                          </div>
                        </td>

                        <td className="py-3">
                          <div className="flex items-center gap-1 font-bold text-zinc-700 dark:text-zinc-300">
                            <Crown className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                            <span>{leader}</span>
                          </div>
                          <div className="text-[10px] text-zinc-400 mt-0.5">
                            {team.memberNames.length} عضو
                          </div>
                        </td>

                        <td className="py-3">
                          {sub ? (
                            sub.status === 'APPROVED' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 font-bold text-[10px] border border-emerald-300 dark:border-emerald-800">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                <span>تایید شده</span>
                              </span>
                            ) : sub.status === 'NEEDS_REVISION' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-200 font-bold text-[10px] border border-amber-300 dark:border-amber-800 animate-pulse">
                                <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                                <span>نیاز به اصلاح</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 font-bold text-[10px] border border-indigo-300 dark:border-indigo-800">
                                <Clock className="w-3.5 h-3.5 text-indigo-600" />
                                <span>در حال بررسی</span>
                              </span>
                            )
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400 font-bold text-[10px]">
                              <Clock className="w-3 h-3 text-zinc-400" />
                              <span>در انتظار ارسال</span>
                            </span>
                          )}
                        </td>

                        <td className="py-3">
                          {sub ? (
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-1.5 font-mono text-[11px] font-bold text-zinc-800 dark:text-zinc-200">
                                {getFileIcon(sub.fileName)}
                                <span className="truncate max-w-[140px]">{sub.fileName}</span>
                              </div>
                              <div className="text-[10px] text-zinc-400 font-mono">
                                {toPersianDigits(formatFileSize(sub.fileSize))}
                              </div>
                            </div>
                          ) : (
                            <span className="text-zinc-400 font-mono">-</span>
                          )}
                        </td>

                        <td className="py-3 text-[10px] font-mono text-zinc-500">
                          {sub ? (
                            new Date(sub.submittedAt).toLocaleString('fa-IR', {
                              dateStyle: 'short',
                              timeStyle: 'short',
                            })
                          ) : (
                            <span className="text-zinc-400">-</span>
                          )}
                        </td>

                        <td className="py-3 pl-2 text-center">
                          {sub ? (
                            <div className="flex items-center justify-center gap-1.5">
                              <Button
                                variant="primary"
                                size="sm"
                                onClick={() => downloadSubmissionFile(sub)}
                                className="h-8 px-2.5 gap-1 text-[11px]"
                                title="دانلود فایل تحویلی تیم"
                              >
                                <Download className="w-3.5 h-3.5" />
                                <span>دانلود</span>
                              </Button>

                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedSubForFeedback(sub);
                                  setFeedbackText(sub.adminFeedback || '');
                                  setFeedbackStatus(sub.status || 'APPROVED');
                                }}
                                className="h-8 px-2.5 gap-1 text-[11px] font-bold border-indigo-300 text-indigo-700 bg-indigo-50/60 hover:bg-indigo-100 dark:border-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300"
                                title="بررسی وضعیت، تایید یا نیاز به اصلاح"
                              >
                                <ShieldCheck className="w-3.5 h-3.5" />
                                <span>بررسی وضعیت</span>
                              </Button>
                            </div>
                          ) : (
                            <span className="text-zinc-400 text-[11px]">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Manager Deadline, Allowed Formats & Limits Modal */}
      <Modal
        isOpen={isDeadlineModalOpen}
        onClose={() => setIsDeadlineModalOpen(false)}
        title="تنظیمات مهلت تحویل، فرمت‌های مجاز و حجم فایل"
      >
        <div className="space-y-5 text-right max-h-[80vh] overflow-y-auto pr-1">
          {/* Section 1: Allowed Formats */}
          <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 font-black text-xs text-zinc-900 dark:text-zinc-100">
                <FileType className="w-4 h-4 text-indigo-600" />
                <span>۱. فرمت‌های مجاز برای بارگذاری:</span>
              </div>

              {/* Quick Actions for Formats */}
              <div className="flex items-center gap-2 text-[10px]">
                <button
                  type="button"
                  onClick={handleSelectAllPresets}
                  className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
                >
                  انتخاب همه
                </button>
                <span className="text-zinc-300 dark:text-zinc-700">|</span>
                <button
                  type="button"
                  onClick={handleResetDefaultFormats}
                  className="text-amber-600 dark:text-amber-400 font-bold hover:underline"
                >
                  پیش‌فرض
                </button>
                <span className="text-zinc-300 dark:text-zinc-700">|</span>
                <button
                  type="button"
                  onClick={() => setModalAllowedFormats([])}
                  className="text-rose-600 dark:text-rose-400 font-bold hover:underline"
                >
                  حذف همه
                </button>
              </div>
            </div>

            {/* Presets Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 pt-1">
              {COMMON_FORMAT_PRESETS.map((item) => {
                const isSelected = modalAllowedFormats.includes(item.ext);
                return (
                  <button
                    key={item.ext}
                    type="button"
                    onClick={() => handleToggleFormat(item.ext)}
                    className={`flex items-center justify-between p-2 rounded-xl border text-right transition-all cursor-pointer ${
                      isSelected
                        ? 'border-indigo-500 bg-indigo-50/80 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 font-black shadow-2xs'
                        : 'border-zinc-200 dark:border-zinc-700/80 bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300'
                    }`}
                  >
                    <div className="space-y-0.5">
                      <div className="text-xs font-mono font-bold">{item.ext.toUpperCase()}</div>
                      <div className="text-[9px] text-zinc-400 dark:text-zinc-500 truncate">
                        {item.desc}
                      </div>
                    </div>
                    {isSelected ? (
                      <div className="w-4 h-4 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0">
                        <Check className="w-2.5 h-2.5" />
                      </div>
                    ) : (
                      <div className="w-4 h-4 rounded-full border border-zinc-300 dark:border-zinc-600 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Custom Format Adder */}
            <div className="pt-2 border-t border-zinc-200 dark:border-zinc-700 space-y-1.5">
              <label className="text-[11px] font-bold text-zinc-600 dark:text-zinc-300">
                افزودن پسوند یا فرمت دلخواه:
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={customFormatInput}
                  onChange={(e) => setCustomFormatInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddCustomFormat();
                    }
                  }}
                  placeholder="مثال: apk. یا blend. یا mp3. یا psd."
                  className="flex-1 text-xs font-mono p-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:outline-hidden focus:ring-2 focus:ring-primary"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddCustomFormat}
                  className="h-9 px-3 gap-1 text-xs font-bold shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>افزودن</span>
                </Button>
              </div>
            </div>

            {/* Currently Active Formats Chips */}
            <div className="pt-2 space-y-1.5">
              <label className="text-[11px] font-bold text-zinc-500">
                فرمت‌های انتخاب‌شده فعال ({toPersianDigits(modalAllowedFormats.length)}):
              </label>
              {modalAllowedFormats.length === 0 ? (
                <div className="p-2 rounded-lg bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>هیچ فرمتی انتخاب نشده است. لطفاً حداقل یک فرمت را انتخاب کنید.</span>
                </div>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {modalAllowedFormats.map((fmt) => (
                    <span
                      key={fmt}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white dark:bg-zinc-800 border border-indigo-200 dark:border-indigo-800 text-indigo-800 dark:text-indigo-300 font-mono font-bold text-xs shadow-2xs"
                    >
                      <span>{fmt.toUpperCase()}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveFormat(fmt)}
                        className="text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400"
                        title="حذف فرمت"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Section 2: Max File Size */}
          <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 space-y-3">
            <div className="flex items-center gap-1.5 font-black text-xs text-zinc-900 dark:text-zinc-100">
              <HardDrive className="w-4 h-4 text-amber-600" />
              <span>۲. سقف حجم مجاز برای هر فایل:</span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {[10, 25, 50, 100, 250, 500].map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => setModalMaxFileSizeMb(size)}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-mono font-bold transition-all cursor-pointer ${
                    modalMaxFileSizeMb === size
                      ? 'border-amber-500 bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-200 shadow-2xs'
                      : 'border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100'
                  }`}
                >
                  {toPersianDigits(size)} MB
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 pt-1">
              <label className="text-xs text-zinc-600 dark:text-zinc-400 shrink-0">
                مقدار دلخواه (مگابایت):
              </label>
              <input
                type="number"
                min={1}
                max={2048}
                value={modalMaxFileSizeMb}
                onChange={(e) => setModalMaxFileSizeMb(Math.max(1, Number(e.target.value) || 1))}
                className="w-24 text-xs font-mono p-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-center focus:outline-hidden"
              />
              <span className="text-xs text-zinc-500">MB</span>
            </div>
          </div>

          {/* Section 3: Deadline */}
          <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 space-y-3">
            <div className="flex items-center gap-1.5 font-black text-xs text-zinc-900 dark:text-zinc-100">
              <Calendar className="w-4 h-4 text-emerald-600" />
              <span>۳. مهلت تحویل پروژه (تاریخ و ساعت پایان):</span>
            </div>

            <input
              type="datetime-local"
              value={modalDeadlineDate}
              onChange={(e) => setModalDeadlineDate(e.target.value)}
              className="w-full text-xs font-mono p-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:outline-hidden focus:ring-2 focus:ring-primary"
            />

            {/* Quick Presets */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-zinc-500">انتخاب سریع مهلت:</label>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => handleQuickPresetDeadline(2)}
                  className="px-2.5 py-1 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-[11px] font-bold hover:bg-zinc-100"
                >
                  ۲ ساعت دیگر
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickPresetDeadline(24)}
                  className="px-2.5 py-1 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-[11px] font-bold hover:bg-zinc-100"
                >
                  فردا این موقع
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickPresetDeadline(72)}
                  className="px-2.5 py-1 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-[11px] font-bold hover:bg-zinc-100"
                >
                  ۳ روز دیگر
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickPresetDeadline(168)}
                  className="px-2.5 py-1 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-[11px] font-bold hover:bg-zinc-100"
                >
                  یک هفته دیگر
                </button>
              </div>
            </div>
          </div>

          {/* Section 4: Instructions */}
          <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 space-y-2">
            <div className="flex items-center gap-1.5 font-black text-xs text-zinc-900 dark:text-zinc-100">
              <FileText className="w-4 h-4 text-blue-600" />
              <span>۴. راهنما و دستورالعمل تحویل برای دانش‌آموزان:</span>
            </div>
            <textarea
              rows={3}
              value={modalInstructions}
              onChange={(e) => setModalInstructions(e.target.value)}
              placeholder="دستورالعمل، نکات و فرمت‌های مورد انتظار..."
              className="w-full text-xs p-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:outline-hidden focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsDeadlineModalOpen(false)}
            >
              انصراف
            </Button>
            <Button variant="primary" size="sm" onClick={handleSaveDeadlineConfig}>
              ذخیره تغییرات فرمت‌ها و مهلت
            </Button>
          </div>
        </div>
      </Modal>

      {/* Manager Feedback / Review Modal */}
      <Modal
        isOpen={!!selectedSubForFeedback}
        onClose={() => setSelectedSubForFeedback(null)}
        title={`بررسی و تعیین وضعیت فایل تحویلی تیم «${selectedSubForFeedback?.teamName || ''}»`}
      >
        <div className="space-y-4 text-right">
          {/* File summary pill */}
          {selectedSubForFeedback && (
            <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                  {getFileIcon(selectedSubForFeedback.fileName)}
                </div>
                <div className="min-w-0 text-right">
                  <div className="font-bold text-xs text-zinc-900 dark:text-zinc-100 truncate">
                    {selectedSubForFeedback.fileName}
                  </div>
                  <div className="text-[10px] text-zinc-400 font-mono">
                    {toPersianDigits(formatFileSize(selectedSubForFeedback.fileSize))} • ارسال شده در{' '}
                    {new Date(selectedSubForFeedback.submittedAt).toLocaleTimeString('fa-IR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => downloadSubmissionFile(selectedSubForFeedback)}
                className="h-7 px-2 text-[11px] gap-1 shrink-0"
              >
                <Download className="w-3 h-3" />
                <span>دانلود فایل</span>
              </Button>
            </div>
          )}

          {/* Status 2-Button Selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-black text-zinc-800 dark:text-zinc-200 block">
              تعیین وضعیت پروژه تیم:
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              {/* Approve Button */}
              <button
                type="button"
                onClick={() => setFeedbackStatus('APPROVED')}
                className={`p-3 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer ${
                  feedbackStatus === 'APPROVED'
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-900 dark:bg-emerald-950/50 dark:border-emerald-500 dark:text-emerald-200 shadow-sm ring-2 ring-emerald-500/20'
                    : 'bg-white dark:bg-zinc-800/80 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-emerald-300 dark:hover:border-emerald-700'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    feedbackStatus === 'APPROVED'
                      ? 'bg-emerald-500 text-white'
                      : 'bg-zinc-100 dark:bg-zinc-700 text-zinc-500'
                  }`}
                >
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <span className="text-xs font-black">تایید نهایی</span>
                <span className="text-[10px] opacity-75 font-medium">پروژه پذیرفته شد و قفل می‌ماند</span>
              </button>

              {/* Needs Revision Button */}
              <button
                type="button"
                onClick={() => setFeedbackStatus('NEEDS_REVISION')}
                className={`p-3 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer ${
                  feedbackStatus === 'NEEDS_REVISION'
                    ? 'bg-amber-50 border-amber-500 text-amber-900 dark:bg-amber-950/50 dark:border-amber-500 dark:text-amber-200 shadow-sm ring-2 ring-amber-500/20'
                    : 'bg-white dark:bg-zinc-800/80 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-amber-300 dark:hover:border-amber-700'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    feedbackStatus === 'NEEDS_REVISION'
                      ? 'bg-amber-500 text-white'
                      : 'bg-zinc-100 dark:bg-zinc-700 text-zinc-500'
                  }`}
                >
                  <AlertCircle className="w-5 h-5" />
                </div>
                <span className="text-xs font-black">نیاز به اصلاح</span>
                <span className="text-[10px] opacity-75 font-medium">دوباره برای سرتیم باز می‌شود</span>
              </button>
            </div>
          </div>

          {/* Feedback Textarea */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                {feedbackStatus === 'NEEDS_REVISION'
                  ? 'توضیحات اشکالات و موارد نیازمند اصلاح:'
                  : 'توضیحات و بازخورد به تیم:'}
              </label>
              <span className="text-[10px] text-zinc-400 font-medium">اختیاری</span>
            </div>
            <textarea
              rows={3}
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              placeholder={
                feedbackStatus === 'NEEDS_REVISION'
                  ? 'اشکال فایل چیه و سرتیم چه مواردی رو باید اصلاح و مجدد بارگذاری کنه...'
                  : 'نقاط قوت، پیشنهادات بهبود، یا پیام برای تیم...'
              }
              className="w-full text-xs p-3 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:outline-hidden focus:ring-2 focus:ring-primary leading-relaxed"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedSubForFeedback(null)}
            >
              انصراف
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSaveFeedback}
              className={`gap-1.5 font-bold ${
                feedbackStatus === 'APPROVED'
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-transparent'
                  : 'bg-amber-600 hover:bg-amber-700 text-white border-transparent'
              }`}
            >
              {feedbackStatus === 'APPROVED' ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>ثبت تایید پروژه</span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-4 h-4" />
                  <span>ثبت وضعیت نیاز به اصلاح</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
