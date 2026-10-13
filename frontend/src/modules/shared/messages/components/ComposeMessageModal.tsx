import React, { useState, useEffect, useRef } from 'react';
import { Modal } from '../../../../components/ui/Modal';
import { Button } from '../../../../components/ui/Button';
import { Input } from '../../../../components/ui/Input';
import { RichTextEditor } from '../../../../components/ui/RichTextEditor';
import { apiClient } from '../../../../lib/api/client';
import { toast } from '../../../../components/ui/toast/toast';
import { toPersianDigits } from '../../../../lib/utils';
import { useAuthStore } from '../../../../lib/auth/auth-store';
import {
  AllowedRecipientsData,
  MessageAttachment,
  MessagePriority,
  MessageTargetAudience,
  MessageTargetType,
} from '../types';
import { getFullMediaUrl } from '../../../../lib/api/media-url';
import {
  Send,
  Paperclip,
  Image as ImageIcon,
  X,
  FileText,
  AlertCircle,
  Users,
  Building,
  GraduationCap,
  Shield,
  Search,
  Check,
  UploadCloud,
  User,
  AlertTriangle,
  Globe,
  CheckCircle2,
  ChevronDown,
  Reply,
  Video,
  Film,
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  defaultRecipientId?: string;
  defaultRecipientName?: string;
  defaultSubject?: string;
  replyToMessage?: {
    id: string;
    title: string;
    body: string;
    senderName: string;
  } | null;
}

interface CustomDropdownOption {
  value: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
}

interface CustomDropdownProps {
  label?: string;
  icon?: React.ComponentType<{ className?: string }>;
  value: string;
  onChange: (value: string) => void;
  options: CustomDropdownOption[];
  placeholder?: string;
  className?: string;
}

// Custom Styled Dropdown Component with smooth popover, checkmarks, and custom styling
const CustomDropdown: React.FC<CustomDropdownProps> = ({
  label,
  icon: Icon,
  value,
  onChange,
  options,
  placeholder = 'انتخاب کنید...',
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const selectedOption = options.find((opt) => opt.value === value);

  return (
    <div className={`space-y-1.5 text-right relative ${className}`} ref={dropdownRef}>
      {label && (
        <label className="text-xs font-black text-ink-darker dark:text-white block">
          {label}
        </label>
      )}

      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className={`w-full h-11 px-3.5 rounded-xl border-[1.5px] text-xs sm:text-sm font-bold flex items-center justify-between transition-all cursor-pointer select-none active:translate-x-[0.5px] active:translate-y-[0.5px] ${
            isOpen
              ? 'border-primary bg-white dark:bg-[#151C28] ring-2 ring-primary/15 shadow-[2px_2px_0_#59BBAF]'
              : 'border-gray-200 dark:border-gray-700 bg-gray-50/90 dark:bg-gray-900 text-ink-darker dark:text-white hover:border-primary/50 shadow-2xs'
          }`}
        >
          <div className="flex items-center gap-2 min-w-0">
            {Icon && <Icon className="w-4 h-4 text-primary shrink-0" />}
            <span className="truncate">
              {selectedOption ? selectedOption.label : placeholder}
            </span>
          </div>

          <ChevronDown
            className={`w-4 h-4 text-gray-400 transition-transform duration-200 shrink-0 ${
              isOpen ? 'rotate-180 text-primary' : ''
            }`}
          />
        </button>

        {isOpen && (
          <div className="absolute top-full right-0 left-0 mt-1.5 z-50 p-1.5 bg-white dark:bg-[#151C28] rounded-2xl border-[1.5px] border-primary-dark/25 dark:border-gray-700 shadow-xl max-h-56 overflow-y-auto space-y-0.5 animate-in fade-in-50 zoom-in-95 duration-150">
            {options.map((opt) => {
              const isSelected = opt.value === value;
              const OptIcon = opt.icon;
              return (
                <div
                  key={opt.value}
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
                  className={`px-3 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-between cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-primary/10 dark:bg-primary/20 text-primary font-black border border-primary/25'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-800/80 text-ink-normal dark:text-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {OptIcon && <OptIcon className="w-3.5 h-3.5 text-gray-400 shrink-0" />}
                    <span className="truncate">{opt.label}</span>
                  </div>
                  {isSelected && <Check className="w-4 h-4 text-primary shrink-0 mr-2" />}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export const ComposeMessageModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onSuccess,
  defaultRecipientId,
  defaultRecipientName,
  defaultSubject,
  replyToMessage,
}) => {
  const currentUser = useAuthStore((s) => s.user);
  const userRole = currentUser?.role || '';
  const isStudentOrParent = userRole === 'STUDENT' || userRole === 'PARENT';
  const canSendGroup = ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'STAFF', 'TEACHER'].includes(userRole);

  const [allowed, setAllowed] = useState<AllowedRecipientsData | null>(null);
  const [loadingAllowed, setLoadingAllowed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  // High-level Recipient Mode: Individual vs Group
  const [recipientMode, setRecipientMode] = useState<'INDIVIDUAL' | 'GROUP'>('INDIVIDUAL');

  // Group Category: Classroom | Role | Broadcast All
  const [groupCategory, setGroupCategory] = useState<'CLASSROOM' | 'ROLE' | 'ALL'>('CLASSROOM');

  // Form State
  const [title, setTitle] = useState(defaultSubject || '');
  const [body, setBody] = useState('');
  const [priority, setPriority] = useState<MessagePriority>('NORMAL');
  const [targetAudience, setTargetAudience] = useState<MessageTargetAudience>('ALL');
  const [targetClassroomId, setTargetClassroomId] = useState<string>('');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>(
    defaultRecipientId ? [defaultRecipientId] : [],
  );
  const [attachments, setAttachments] = useState<MessageAttachment[]>([]);

  // User search query and role filter for individual selector
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState<string>('ALL');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync state when modal opens
  useEffect(() => {
    if (isOpen) {
      if (replyToMessage) {
        const replySubject = replyToMessage.title.startsWith('پاسخ:')
          ? replyToMessage.title
          : `پاسخ: ${replyToMessage.title}`;
        setTitle(defaultSubject || replySubject);
      } else {
        setTitle(defaultSubject || '');
      }
      setBody('');
      setAttachments([]);
      if (defaultRecipientId) {
        setRecipientMode('INDIVIDUAL');
        setSelectedUserIds([defaultRecipientId]);
      }
    }
  }, [isOpen, defaultRecipientId, defaultSubject, replyToMessage]);

  // Load allowed recipients when modal opens
  useEffect(() => {
    if (!isOpen) return;

    const fetchAllowed = async () => {
      try {
        setLoadingAllowed(true);
        const res = await apiClient.get('/messages/recipients/allowed');
        const data = res.data?.data || res.data;
        setAllowed(data);

        // Pre-configure initial state
        if (defaultRecipientId) {
          setRecipientMode('INDIVIDUAL');
          setSelectedUserIds([defaultRecipientId]);
        } else if (data.classrooms?.length > 0) {
          setTargetClassroomId(data.classrooms[0].id);
        }
      } catch (err: any) {
        toast.error('خطا در دریافت فهرست مخاطبان مجاز');
      } finally {
        setLoadingAllowed(false);
      }
    };

    fetchAllowed();
  }, [isOpen, defaultRecipientId]);

  // Handle file attachment upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const isVideo = file.type.startsWith('video/') || /\.(mp4|mov|webm|mkv|avi)$/i.test(file.name);
    const maxSizeBytes = isVideo ? 150 * 1024 * 1024 : 50 * 1024 * 1024;

    if (file.size > maxSizeBytes) {
      toast.error(
        isVideo
          ? 'حداکثر حجم مجاز هر ویدیو ۱۵۰ مگابایت می‌باشد'
          : 'حداکثر حجم مجاز هر فایل ۵۰ مگابایت می‌باشد',
      );
      return;
    }

    try {
      setUploadingFile(true);
      setUploadProgress(0);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('moduleName', 'messages');

      let fileUrl = '';
      try {
        const uploadRes: any = await apiClient.post('/storage/upload', formData, {
          headers: { 'Content-Type': undefined },
          timeout: 10 * 60 * 1000, // 10 minutes timeout for large files/videos
          onUploadProgress: (progressEvent) => {
            if (progressEvent.total) {
              const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
              setUploadProgress(percent);
            }
          },
        });
        const uploadData = uploadRes?.data?.data || uploadRes?.data || uploadRes;
        const rawUrl =
          uploadData?.fileUrl ||
          uploadData?.url ||
          uploadRes?.fileUrl ||
          uploadRes?.url ||
          '';

        if (!rawUrl) {
          throw new Error('سرور آدرس فایل را بازنگرداند');
        }
        fileUrl = getFullMediaUrl(rawUrl);
      } catch (err: any) {
        // Only fallback to base64 for small non-video files (< 2MB)
        if (file.size < 2 * 1024 * 1024 && !isVideo) {
          fileUrl = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(file);
          });
        } else {
          const serverMsg =
            err?.response?.data?.message ||
            (err?.code === 'ECONNABORTED'
              ? 'زمان بارگذاری به پایان رسید (کندی اینترنت). لطفاً دوباره امتحان کنید.'
              : err?.response?.status === 413
                ? 'حجم فایل بیشتر از سقف مجاز سرور است.'
                : err?.message || 'خطا در بارگذاری فایل در سرور');
          throw new Error(typeof serverMsg === 'string' ? serverMsg : JSON.stringify(serverMsg));
        }
      }

      const isImage = file.type.startsWith('image/');
      const attType = isVideo ? 'video' : isImage ? 'image' : 'file';

      setAttachments((prev) => [
        ...prev,
        {
          name: file.name,
          url: fileUrl,
          type: attType,
          size: file.size,
        },
      ]);
      toast.success(
        isVideo
          ? `ویدیوی ${file.name} با موفقیت پیوست شد`
          : `فایل ${file.name} با موفقیت پیوست شد`,
      );
    } catch (err: any) {
      toast.error(err?.message || 'خطا در آپلود فایل پیوست در سرور');
    } finally {
      setUploadingFile(false);
      setUploadProgress(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleToggleUser = (userId: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId],
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error('لطفاً عنوان و موضوع پیام را وارد فرمایید');
      return;
    }
    if (!body.trim()) {
      toast.error('لطفاً متن پیام را وارد فرمایید');
      return;
    }

    // Force individual mode for students and parents
    const effectiveMode = isStudentOrParent ? 'INDIVIDUAL' : recipientMode;

    if (effectiveMode === 'INDIVIDUAL' && selectedUserIds.length === 0) {
      toast.error('لطفاً حداقل یک مخاطب برای ارسال پیام انتخاب کنید');
      return;
    }

    if (effectiveMode === 'GROUP' && groupCategory === 'CLASSROOM' && !targetClassroomId) {
      toast.error('لطفاً کلاس آموزشی مورد نظر را انتخاب نمایید');
      return;
    }

    const resolvedTargetType: MessageTargetType =
      effectiveMode === 'INDIVIDUAL' ? 'INDIVIDUAL' : groupCategory;

    try {
      setSubmitting(true);
      await apiClient.post('/messages', {
        title: title.trim(),
        body: body.trim(),
        priority,
        targetType: resolvedTargetType,
        targetAudience: effectiveMode === 'GROUP' ? targetAudience : undefined,
        targetClassroomId:
          effectiveMode === 'GROUP' && groupCategory === 'CLASSROOM'
            ? targetClassroomId
            : undefined,
        recipientIds: effectiveMode === 'INDIVIDUAL' ? selectedUserIds : undefined,
        attachments,
        replyToId: replyToMessage?.id || undefined,
      });

      toast.success('پیام با موفقیت ارسال گردید');
      onSuccess();
      onClose();
    } catch (err: any) {
      const errMsg = err?.response?.data?.message || 'خطا در ارسال پیام';
      toast.error(errMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredUsers = (allowed?.users || []).filter((u) => {
    if (userRoleFilter !== 'ALL') {
      if (userRoleFilter === 'ADMIN' && !['SUPER_ADMIN', 'SCHOOL_ADMIN', 'STAFF'].includes(u.role)) {
        return false;
      }
      if (userRoleFilter === 'TEACHER' && u.role !== 'TEACHER') return false;
      if (userRoleFilter === 'STUDENT' && u.role !== 'STUDENT') return false;
      if (userRoleFilter === 'PARENT' && u.role !== 'PARENT') return false;
    }

    if (!userSearch.trim()) return true;
    const q = userSearch.toLowerCase().trim();
    return (
      u.firstName.toLowerCase().includes(q) ||
      u.lastName.toLowerCase().includes(q) ||
      (u.classroomName && u.classroomName.toLowerCase().includes(q)) ||
      (u.childName && u.childName.toLowerCase().includes(q))
    );
  });

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'SUPER_ADMIN':
      case 'SCHOOL_ADMIN':
      case 'STAFF':
        return (
          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-club-light dark:bg-[#2A173E] text-club dark:text-[#C084FC] border border-club/30">
            راهبری
          </span>
        );
      case 'TEACHER':
        return (
          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-male-light dark:bg-[#182346] text-sec dark:text-[#8194EE] border border-sec/30">
            استاد
          </span>
        );
      case 'STUDENT':
        return (
          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-ecosystem-light dark:bg-[#163330] text-primary-dark dark:text-primary border border-primary/30">
            دانش‌آموز
          </span>
        );
      case 'PARENT':
        return (
          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-college-light dark:bg-[#38260D] text-third dark:text-[#FBBF24] border border-third/30">
            ولی
          </span>
        );
      default:
        return (
          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
            کاربر
          </span>
        );
    }
  };

  const selectedUsersList = (allowed?.users || []).filter((u) =>
    selectedUserIds.includes(u.id),
  );

  // Classroom options for dropdown
  const classroomOptions: CustomDropdownOption[] = (allowed?.classrooms || []).map((cls) => ({
    value: cls.id,
    label: `کلاس ${cls.name} ${cls.code ? `(${cls.code})` : ''}`,
    icon: Building,
  }));

  // Classroom audience options (no English words)
  const classroomAudienceOptions: CustomDropdownOption[] = [
    { value: 'ALL', label: 'هم دانش‌آموزان و هم اولیاء' },
    { value: 'STUDENTS', label: 'فقط دانش‌آموزان کلاس' },
    { value: 'PARENTS', label: 'فقط اولیای دانش‌آموزان کلاس' },
  ];

  // Role audience options (no English words)
  const roleAudienceOptions: CustomDropdownOption[] = [
    { value: 'TEACHERS', label: 'تمامی مربیان و اساتید مدرسه' },
    { value: 'STUDENTS', label: 'تمامی دانش‌آموزان مدرسه' },
    { value: 'PARENTS', label: 'تمامی اولیاء محترم' },
    { value: 'STAFF', label: 'تمامی کادر اجرایی مدرسه' },
    { value: 'ALL', label: 'تمام اعضای مدرسه (همگانی)' },
  ];

  // Priority options (all English words removed!)
  const priorityOptions: CustomDropdownOption[] = [
    { value: 'NORMAL', label: 'عادی' },
    { value: 'IMPORTANT', label: 'مهم' },
    { value: 'URGENT', label: 'فوری و اضطراری' },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={replyToMessage ? 'پاسخ به پیام' : 'ارسال پیام جدید'}
      maxWidth="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Quote Card if Replying */}
        {replyToMessage && (
          <div className="p-3 sm:p-3.5 rounded-xl bg-primary/5 dark:bg-primary/10 border border-primary/20 flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/15 text-primary flex items-center justify-center shrink-0 mt-0.5">
              <Reply className="w-4 h-4" />
            </div>
            <div className="min-w-0 text-xs">
              <span className="font-bold text-gray-500 dark:text-gray-400 block mb-0.5">
                در حال ارسال پاسخ به: <strong className="text-primary font-black">{replyToMessage.senderName}</strong>
              </span>
              <p className="font-bold text-ink-darker dark:text-white truncate">
                {replyToMessage.title}
              </p>
              <p className="text-gray-500 dark:text-gray-400 line-clamp-1 text-[11px] mt-0.5">
                {replyToMessage.body.replace(/<[^>]*>/g, '')}
              </p>
            </div>
          </div>
        )}

        {/* 1. Primary Choice: پیام فردی vs پیام گروهی (برای پاسخ مخفی می‌شود) */}
        {!replyToMessage && canSendGroup && !isStudentOrParent && (
          <div className="space-y-2">
            <label className="text-xs font-black text-ink-darker dark:text-white block">
              نوع ارسال پیام:
            </label>
            <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
              {/* Option 1: پیام فردی (بدون توضیحات اضافی) */}
              <button
                type="button"
                onClick={() => setRecipientMode('INDIVIDUAL')}
                className={`h-12 px-4 rounded-xl border-[1.5px] transition-all flex items-center justify-center gap-2.5 cursor-pointer active:translate-x-[1px] active:translate-y-[1px] ${
                  recipientMode === 'INDIVIDUAL'
                    ? 'border-primary bg-primary/10 dark:bg-primary/20 text-primary shadow-[2px_2px_0_#59BBAF] dark:shadow-[2px_2px_0_#0B0F17] font-black'
                    : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-[#151C28] hover:border-primary/40 text-gray-700 dark:text-gray-300 shadow-2xs font-bold'
                }`}
              >
                <User className="w-4 h-4" />
                <span className="text-xs sm:text-sm">پیام فردی</span>
              </button>

              {/* Option 2: پیام گروهی (بدون توضیحات اضافی) */}
              <button
                type="button"
                onClick={() => {
                  setRecipientMode('GROUP');
                  if (allowed?.canClassroom && allowed.classrooms?.length > 0) {
                    setGroupCategory('CLASSROOM');
                    if (!targetClassroomId) setTargetClassroomId(allowed.classrooms[0].id);
                  } else if (allowed?.canBroadcast) {
                    setGroupCategory('ROLE');
                  }
                }}
                className={`h-12 px-4 rounded-xl border-[1.5px] transition-all flex items-center justify-center gap-2.5 cursor-pointer active:translate-x-[1px] active:translate-y-[1px] ${
                  recipientMode === 'GROUP'
                    ? 'border-primary bg-primary/10 dark:bg-primary/20 text-primary shadow-[2px_2px_0_#59BBAF] dark:shadow-[2px_2px_0_#0B0F17] font-black'
                    : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-[#151C28] hover:border-primary/40 text-gray-700 dark:text-gray-300 shadow-2xs font-bold'
                }`}
              >
                <Users className="w-4 h-4" />
                <span className="text-xs sm:text-sm">پیام گروهی</span>
              </button>
            </div>
          </div>
        )}

        {/* 2. Recipient Selector: فردی یا گروهی */}
        {isStudentOrParent || recipientMode === 'INDIVIDUAL' ? (
          /* ================= INDIVIDUAL RECIPIENT PICKER ================= */
          <div className="p-3.5 sm:p-4 bg-gray-50/80 dark:bg-[#151C28]/70 rounded-2xl border-[1.5px] border-primary-dark/20 dark:border-gray-800 space-y-3 shadow-2xs">
            {/* Header with Selected Count */}
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-ink-darker dark:text-white">
                انتخاب گیرنده یا گیرندگان پیام:
              </label>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-primary/10 text-primary-dark dark:text-primary font-bold">
                  {toPersianDigits(selectedUserIds.length)} مخاطب انتخاب شده
                </span>
                {selectedUserIds.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedUserIds([])}
                    className="text-[10px] text-gray-400 hover:text-rose-500 font-bold transition-colors cursor-pointer"
                  >
                    لغو همه
                  </button>
                )}
              </div>
            </div>

            {/* Selected Users Chips Bar */}
            {selectedUsersList.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap max-h-20 overflow-y-auto p-2 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
                {selectedUsersList.map((u) => (
                  <span
                    key={u.id}
                    className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-lg bg-primary/10 text-primary-dark dark:text-primary border border-primary/20"
                  >
                    <span>
                      {u.firstName} {u.lastName}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleToggleUser(u.id)}
                      className="hover:text-rose-600 p-0.5 rounded cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Search Input & Role Filters */}
            <div className="space-y-2">
              <div className="relative">
                <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="جستجوی نام، نام خانوادگی، نقش یا کلاس..."
                  className="w-full h-10 pr-9 pl-3 text-xs rounded-xl border-[1.5px] border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-ink-darker dark:text-white outline-none focus:border-primary shadow-2xs font-medium"
                />
                {userSearch && (
                  <button
                    type="button"
                    onClick={() => setUserSearch('')}
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Role filter chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-[11px]">
                {[
                  { key: 'ALL', label: 'همه افراد' },
                  { key: 'ADMIN', label: 'راهبر و معاون' },
                  { key: 'TEACHER', label: 'مربیان و اساتید' },
                  ...(!isStudentOrParent || userRole === 'STUDENT'
                    ? [{ key: 'STUDENT', label: 'دانش‌آموزان' }]
                    : []),
                  ...(!isStudentOrParent || userRole === 'PARENT'
                    ? [{ key: 'PARENT', label: 'اولیاء' }]
                    : []),
                ].map((rf) => (
                  <button
                    key={rf.key}
                    type="button"
                    onClick={() => setUserRoleFilter(rf.key)}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-all shrink-0 cursor-pointer ${
                      userRoleFilter === rf.key
                        ? 'bg-primary text-white shadow-2xs'
                        : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border border-gray-200/80 dark:border-gray-700/80 hover:border-primary/40'
                    }`}
                  >
                    {rf.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Scrollable User List */}
            <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 divide-y divide-gray-100 dark:divide-gray-800/80">
              {loadingAllowed ? (
                <div className="text-center py-6 text-xs text-gray-400">
                  در حال بارگذاری فهرست مخاطبان مجاز...
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="text-center py-6 text-xs text-gray-400">
                  هیچ کاربری با این مشخصات در فهرست مخاطبان مجاز شما یافت نشد.
                </div>
              ) : (
                filteredUsers.map((u) => {
                  const isSelected = selectedUserIds.includes(u.id);
                  return (
                    <div
                      key={u.id}
                      onClick={() => handleToggleUser(u.id)}
                      className={`flex items-center justify-between p-2 sm:p-2.5 rounded-xl cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-primary/10 dark:bg-primary/20 text-primary border border-primary/30'
                          : 'hover:bg-white dark:hover:bg-gray-900 text-ink-darker dark:text-gray-200'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                            isSelected
                              ? 'bg-primary border-primary text-white shadow-2xs'
                              : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800'
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3" />}
                        </div>

                        {/* Avatar */}
                        <div className="w-7 h-7 rounded-lg bg-ecosystem-light dark:bg-[#163330] text-primary-dark dark:text-primary flex items-center justify-center font-black text-xs shrink-0 border border-primary/20">
                          {u.firstName?.[0] || 'ک'}
                        </div>

                        <div className="min-w-0">
                          <span className="text-xs font-black block truncate">
                            {u.firstName} {u.lastName}
                          </span>
                          <div className="flex items-center gap-1.5 text-[10px] text-gray-400 truncate">
                            {u.classroomName && <span>کلاس: {u.classroomName}</span>}
                            {u.childName && <span>ولیِ {u.childName}</span>}
                          </div>
                        </div>
                      </div>

                      <div className="shrink-0 mr-2">{getRoleBadge(u.role)}</div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        ) : (
          /* ================= GROUP RECIPIENT PICKER ================= */
          <div className="p-3.5 sm:p-4 bg-gray-50/80 dark:bg-[#151C28]/70 rounded-2xl border-[1.5px] border-primary-dark/20 dark:border-gray-800 space-y-3.5 shadow-2xs">
            {/* Group Category Selector Tabs */}
            <div className="space-y-1.5">
              <label className="text-xs font-black text-ink-darker dark:text-white block">
                انتخاب گروه مخاطب:
              </label>
              <div className="grid grid-cols-3 gap-2">
                {allowed?.canClassroom && (
                  <button
                    type="button"
                    onClick={() => setGroupCategory('CLASSROOM')}
                    className={`py-2 px-3 rounded-xl border-[1.5px] text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      groupCategory === 'CLASSROOM'
                        ? 'border-primary bg-primary text-white shadow-[2px_2px_0_#438C83]'
                        : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 hover:border-primary/40'
                    }`}
                  >
                    <Building className="w-3.5 h-3.5" />
                    <span>کلاس آموزشی</span>
                  </button>
                )}

                {allowed?.canBroadcast && (
                  <button
                    type="button"
                    onClick={() => setGroupCategory('ROLE')}
                    className={`py-2 px-3 rounded-xl border-[1.5px] text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      groupCategory === 'ROLE'
                        ? 'border-primary bg-primary text-white shadow-[2px_2px_0_#438C83]'
                        : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 hover:border-primary/40'
                    }`}
                  >
                    <Shield className="w-3.5 h-3.5" />
                    <span>گروه نقشی</span>
                  </button>
                )}

                {allowed?.canBroadcast && (
                  <button
                    type="button"
                    onClick={() => setGroupCategory('ALL')}
                    className={`py-2 px-3 rounded-xl border-[1.5px] text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      groupCategory === 'ALL'
                        ? 'border-primary bg-primary text-white shadow-[2px_2px_0_#438C83]'
                        : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 hover:border-primary/40'
                    }`}
                  >
                    <Globe className="w-3.5 h-3.5" />
                    <span>کل مدرسه</span>
                  </button>
                )}
              </div>
            </div>

            {/* Group Options: Classroom (Custom Dropdowns) */}
            {groupCategory === 'CLASSROOM' && allowed && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <CustomDropdown
                  label="انتخاب کلاس آموزشی:"
                  icon={Building}
                  value={targetClassroomId}
                  onChange={setTargetClassroomId}
                  options={classroomOptions}
                  placeholder="کلاس مورد نظر را انتخاب نمایید..."
                />

                <CustomDropdown
                  label="گیرندگان درون کلاس:"
                  icon={Users}
                  value={targetAudience}
                  onChange={(val) => setTargetAudience(val as any)}
                  options={classroomAudienceOptions}
                />
              </div>
            )}

            {/* Group Options: Role (Custom Dropdown) */}
            {groupCategory === 'ROLE' && (
              <div className="space-y-2 pt-1">
                <CustomDropdown
                  label="انتخاب گروه نقشی:"
                  icon={Shield}
                  value={targetAudience}
                  onChange={(val) => setTargetAudience(val as any)}
                  options={roleAudienceOptions}
                />
              </div>
            )}

            {/* Group Options: Broadcast All */}
            {groupCategory === 'ALL' && (
              <div className="p-3 rounded-xl bg-ecosystem-light/60 dark:bg-[#163330]/50 border border-primary/30 text-primary-dark dark:text-primary flex items-center gap-2.5 text-xs font-bold">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>
                  این پیام به صورت سراسری برای تمام اساتید، دانش‌آموزان، اولیاء و کادر اجرایی ارسال خواهد شد.
                </span>
              </div>
            )}
          </div>
        )}

        {/* 3. Message Subject & Priority (Custom Dropdown) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2 space-y-1.5">
            <label className="text-xs font-black text-ink-darker dark:text-white block">
              عنوان و موضوع پیام:
            </label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="مثال: دستورالعمل آزمون، برنامه کلاسی، هماهنگی جلسات..."
              required
              className="text-xs font-bold h-11 border-[1.5px]"
            />
          </div>

          <div>
            <CustomDropdown
              label="درجه اهمیت / اولویت:"
              icon={AlertTriangle}
              value={priority}
              onChange={(val) => setPriority(val as any)}
              options={priorityOptions}
            />
          </div>
        </div>

        {/* 4. Message Body with Rich Text Editor */}
        <RichTextEditor
          label="متن پیام:"
          value={body}
          onChange={setBody}
          rows={5}
          required
          placeholder="متن پیام خود را اینجا بنویسید... برای ساختاردهی می‌توانید از دکمه‌های ویرایشگر بالا استفاده کنید."
        />

        {/* 5. Attachments Section */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-black text-ink-darker dark:text-white flex items-center gap-1.5">
              <Paperclip className="w-3.5 h-3.5 text-primary" />
              <span>پیوست‌ها (فایل، عکس، اسناد، ویدیو):</span>
            </label>

            <button
              type="button"
              disabled={uploadingFile}
              onClick={() => fileInputRef.current?.click()}
              className="text-xs font-bold text-primary hover:text-primary-dark flex items-center gap-1.5 px-3 py-1.5 rounded-xl border-[1.5px] border-primary/30 hover:bg-primary/5 transition-colors cursor-pointer"
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span>
                {uploadingFile
                  ? uploadProgress !== null
                    ? `در حال آپلود... (${toPersianDigits(uploadProgress)}٪)`
                    : 'در حال آپلود...'
                  : 'افزودن پیوست یا ویدیو'}
              </span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileUpload}
              className="hidden"
              accept="image/*,video/*,.mp4,.mov,.webm,.mkv,.avi,.pdf,.docx,.xlsx,.zip"
            />
          </div>

          {attachments.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              {attachments.map((att, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-xs shadow-2xs"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {att.type === 'image' ? (
                      <img
                        src={att.url}
                        alt={att.name}
                        className="w-8 h-8 rounded-lg object-cover border border-gray-200"
                      />
                    ) : att.type === 'video' ? (
                      <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-200 dark:border-indigo-800">
                        <Video className="w-4 h-4" />
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <FileText className="w-4 h-4" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="font-bold truncate text-ink-darker dark:text-gray-200">
                        {att.name}
                      </p>
                      {att.size && (
                        <p className="text-[10px] text-gray-400 font-mono">
                          {att.size > 1024 * 1024
                            ? `${toPersianDigits((att.size / (1024 * 1024)).toFixed(1))} مگابایت`
                            : `${toPersianDigits((att.size / 1024).toFixed(0))} کیلوبایت`}
                        </p>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoveAttachment(idx)}
                    className="text-gray-400 hover:text-rose-600 p-1 rounded-lg cursor-pointer"
                    title="حذف پیوست"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal Actions Footer */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-100 dark:border-gray-800">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={submitting}
            className="text-xs font-bold"
          >
            انصراف
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={submitting}
            className="font-black text-xs border-[1.5px] border-primary-dark shadow-[2px_2px_0_#438C83]"
          >
            <Send className="w-4 h-4 ml-1.5" />
            <span>ارسال پیام</span>
          </Button>
        </div>
      </form>
    </Modal>
  );
};
