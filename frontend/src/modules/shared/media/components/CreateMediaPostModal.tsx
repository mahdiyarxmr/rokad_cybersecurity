import React, { useState, useRef } from 'react';
import { Modal } from '../../../../components/ui/Modal';
import { Button } from '../../../../components/ui/Button';
import { RichTextEditor } from '../../../../components/ui/RichTextEditor';
import { apiClient } from '../../../../lib/api/client';
import { toast } from '../../../../components/ui/toast/toast';
import { toPersianDigits } from '../../../../lib/utils';
import {
  UploadCloud,
  Image as ImageIcon,
  Paperclip,
  Trash2,
  Pin,
  MessageCircle,
  Globe,
  Users,
  Building,
  GraduationCap,
  School,
  Sparkles,
  Send,
  Plus,
  Link2,
  FileText,
  AlertCircle,
  CheckCircle2,
  Check,
  File,
  X,
  Star,
  FileSpreadsheet,
  FileArchive,
} from 'lucide-react';

interface Attachment {
  name: string;
  url: string;
  size?: number;
  mimeType?: string;
}

interface CreateMediaPostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newPost: any) => void;
  classrooms: { id: string; name: string }[];
}

export const CreateMediaPostModal: React.FC<CreateMediaPostModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  classrooms,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [postType, setPostType] = useState<'STANDARD' | 'GALLERY' | 'DOCUMENT'>('STANDARD');
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [audienceType, setAudienceType] = useState<'ALL' | 'ROLES' | 'CLASSROOMS'>('ALL');
  const [targetRoles, setTargetRoles] = useState<string[]>([]);
  const [targetClassroomIds, setTargetClassroomIds] = useState<string[]>([]);
  const [isPinned, setIsPinned] = useState(false);
  const [allowComments, setAllowComments] = useState(true);

  // Secondary input helpers
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [customImageUrl, setCustomImageUrl] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [isDraggingImage, setIsDraggingImage] = useState(false);

  const [showAttachmentUrlInput, setShowAttachmentUrlInput] = useState(false);
  const [customAttachmentName, setCustomAttachmentName] = useState('');
  const [customAttachmentUrl, setCustomAttachmentUrl] = useState('');
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [isDraggingAttachment, setIsDraggingAttachment] = useState(false);

  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // File type and size helpers
  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${toPersianDigits(bytes)} بایت`;
    if (bytes < 1024 * 1024) return `${toPersianDigits((bytes / 1024).toFixed(0))} کیلوبایت`;
    return `${toPersianDigits((bytes / (1024 * 1024)).toFixed(1))} مگابایت`;
  };

  const getFileTypeDetails = (fileName: string, mimeType?: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    if (ext === 'pdf' || mimeType?.includes('pdf')) {
      return {
        label: 'PDF',
        badgeClass: 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-900',
        iconBg: 'bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400',
        icon: FileText,
      };
    }
    if (['doc', 'docx'].includes(ext) || mimeType?.includes('word')) {
      return {
        label: 'DOCX',
        badgeClass: 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-900',
        iconBg: 'bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400',
        icon: FileText,
      };
    }
    if (['xls', 'xlsx', 'csv'].includes(ext) || mimeType?.includes('sheet')) {
      return {
        label: 'EXCEL',
        badgeClass: 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900',
        iconBg: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400',
        icon: FileSpreadsheet,
      };
    }
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext) || mimeType?.includes('zip') || mimeType?.includes('compressed')) {
      return {
        label: 'ZIP',
        badgeClass: 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-900',
        iconBg: 'bg-purple-50 text-purple-600 dark:bg-purple-950/50 dark:text-purple-400',
        icon: FileArchive,
      };
    }
    if (['ppt', 'pptx'].includes(ext) || mimeType?.includes('presentation')) {
      return {
        label: 'PPTX',
        badgeClass: 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-900',
        iconBg: 'bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400',
        icon: FileText,
      };
    }
    return {
      label: ext ? ext.toUpperCase() : 'FILE',
      badgeClass: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700',
      iconBg: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400',
      icon: File,
    };
  };

  // Set selected image as featured (cover)
  const handleSetFeaturedImage = (targetIndex: number) => {
    if (targetIndex === 0 || targetIndex >= mediaUrls.length) return;
    setMediaUrls((prev) => {
      const copy = [...prev];
      const selected = copy.splice(targetIndex, 1)[0];
      return [selected, ...copy];
    });
    toast.success('تصویر انتخابی به عنوان تصویر شاخص تعیین شد.');
  };

  // Reset form
  const resetForm = () => {
    setTitle('');
    setContent('');
    setPostType('STANDARD');
    setMediaUrls([]);
    setAttachments([]);
    setAudienceType('ALL');
    setTargetRoles([]);
    setTargetClassroomIds([]);
    setIsPinned(false);
    setAllowComments(true);
    setPostError(null);
    setShowUrlInput(false);
    setCustomImageUrl('');
    setShowAttachmentUrlInput(false);
    setCustomAttachmentName('');
    setCustomAttachmentUrl('');
    setIsDraggingImage(false);
    setIsDraggingAttachment(false);
  };

  const handleClose = () => {
    if (!isSubmitting) {
      resetForm();
      onClose();
    }
  };

  // Generic image files processor (used by file input & drag-and-drop)
  const processImageFiles = async (files: FileList | File[]) => {
    if (!files || files.length === 0) return;

    setUploadingImage(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file.type.startsWith('image/')) {
          toast.error(`فایل ${file.name} یک تصویر معتبر نیست.`);
          continue;
        }
        if (file.size > 20 * 1024 * 1024) {
          toast.error(`تصویر ${file.name} بیشتر از ۲۰ مگابایت است.`);
          continue;
        }

        const formData = new FormData();
        formData.append('file', file);
        formData.append('moduleName', 'media');

        let fileUrl = '';
        try {
          const res = await apiClient.post('/storage/upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
          const uploadData = res.data?.data || res.data;
          fileUrl = uploadData?.fileUrl || uploadData?.url;
        } catch {
          // Fallback to base64
          fileUrl = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(file);
          });
        }

        if (fileUrl) {
          setMediaUrls((prev) => [...prev, fileUrl]);
        }
      }
      toast.success('تصاویر با موفقیت افزوده شدند.');
    } catch {
      toast.error('خطا در بارگذاری تصاویر');
    } finally {
      setUploadingImage(false);
      if (imageInputRef.current) imageInputRef.current.value = '';
    }
  };

  // Image File input change handler
  const handleImageFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processImageFiles(e.target.files);
    }
  };

  // Generic attachment files processor (used by file input & drag-and-drop)
  const processAttachmentFiles = async (files: FileList | File[]) => {
    if (!files || files.length === 0) return;

    setUploadingAttachment(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.size > 50 * 1024 * 1024) {
          toast.error(`فایل ${file.name} بیشتر از ۵۰ مگابایت است.`);
          continue;
        }

        const formData = new FormData();
        formData.append('file', file);
        formData.append('moduleName', 'media');

        let fileUrl = '';
        try {
          const res = await apiClient.post('/storage/upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
          const uploadData = res.data?.data || res.data;
          fileUrl = uploadData?.fileUrl || uploadData?.url;
        } catch {
          fileUrl = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(file);
          });
        }

        if (fileUrl) {
          setAttachments((prev) => [
            ...prev,
            {
              name: file.name,
              url: fileUrl,
              size: file.size,
              mimeType: file.type,
            },
          ]);
        }
      }
      toast.success('فایل‌های پیوست افزوده شدند.');
    } catch {
      toast.error('خطا در بارگذاری فایل‌های پیوست');
    } finally {
      setUploadingAttachment(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Direct Attachment Upload handler
  const handleAttachmentUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processAttachmentFiles(e.target.files);
    }
  };

  // Add image by URL
  const handleAddImageUrl = () => {
    if (customImageUrl.trim()) {
      setMediaUrls((prev) => [...prev, customImageUrl.trim()]);
      setCustomImageUrl('');
      setShowUrlInput(false);
    }
  };

  // Add attachment by URL
  const handleAddAttachmentUrl = () => {
    if (customAttachmentName.trim() && customAttachmentUrl.trim()) {
      setAttachments((prev) => [
        ...prev,
        { name: customAttachmentName.trim(), url: customAttachmentUrl.trim() },
      ]);
      setCustomAttachmentName('');
      setCustomAttachmentUrl('');
      setShowAttachmentUrlInput(false);
    }
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error('لطفاً عنوان پست را وارد نمایید.');
      return;
    }
    if (!content.trim()) {
      toast.error('لطفاً شرح یا متن مطلب را وارد نمایید.');
      return;
    }

    try {
      setIsSubmitting(true);
      setPostError(null);

      // Auto-determine post type if not explicitly set
      const determinedPostType =
        postType === 'GALLERY' || mediaUrls.length > 1
          ? 'SLIDESHOW'
          : postType === 'DOCUMENT' || attachments.length > 0
            ? 'DOCUMENT'
            : 'STANDARD';

      const payload = {
        title: title.trim(),
        content: content.trim(),
        postType: determinedPostType,
        mediaUrls,
        attachments: attachments.length > 0 ? attachments : undefined,
        audienceType,
        targetRoles: audienceType === 'ROLES' ? targetRoles : [],
        targetClassroomIds: audienceType === 'CLASSROOMS' ? targetClassroomIds : [],
        isPinned,
        allowComments,
        isPublished: true,
      };

      const res = await apiClient.post('/media', payload);
      if (res.data) {
        toast.success('مطلب با موفقیت در رسانه منتشر شد.');
        onSuccess(res.data);
        handleClose();
      }
    } catch (err: any) {
      console.error('Failed to create post', err);
      setPostError(
        err?.response?.data?.message || err.message || 'خطا در انتشار مطلب در رسانه'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="انتشار مطلب در رسانه"
      maxWidth="3xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-1">
        {postError && (
          <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2.5 border border-rose-200 dark:border-rose-800 animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span className="font-bold">{postError}</span>
          </div>
        )}

        {/* 1. Content Format Selection Pills */}
        <div className="space-y-1.5">
          <label className="text-xs font-black text-ink-darker dark:text-white block">
            قالب محتوا:
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setPostType('STANDARD')}
              className={`h-11 px-3 rounded-xl border-[1.5px] transition-all flex items-center justify-center gap-2 text-xs font-bold cursor-pointer active:scale-95 ${postType === 'STANDARD'
                  ? 'border-primary bg-primary/10 dark:bg-primary/20 text-primary shadow-[2px_2px_0_#59BBAF] font-black'
                  : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-[#161D2A] text-gray-600 dark:text-gray-300 hover:border-primary/40'
                }`}
            >
              <FileText className="w-4 h-4 shrink-0" />
              <span className="truncate">اطلاعیه</span>
            </button>

            <button
              type="button"
              onClick={() => setPostType('GALLERY')}
              className={`h-11 px-3 rounded-xl border-[1.5px] transition-all flex items-center justify-center gap-2 text-xs font-bold cursor-pointer active:scale-95 ${postType === 'GALLERY'
                  ? 'border-primary bg-primary/10 dark:bg-primary/20 text-primary shadow-[2px_2px_0_#59BBAF] font-black'
                  : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-[#161D2A] text-gray-600 dark:text-gray-300 hover:border-primary/40'
                }`}
            >
              <ImageIcon className="w-4 h-4 shrink-0" />
              <span className="truncate">تصویر</span>
            </button>

            <button
              type="button"
              onClick={() => setPostType('DOCUMENT')}
              className={`h-11 px-3 rounded-xl border-[1.5px] transition-all flex items-center justify-center gap-2 text-xs font-bold cursor-pointer active:scale-95 ${postType === 'DOCUMENT'
                  ? 'border-primary bg-primary/10 dark:bg-primary/20 text-primary shadow-[2px_2px_0_#59BBAF] font-black'
                  : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-[#161D2A] text-gray-600 dark:text-gray-300 hover:border-primary/40'
                }`}
            >
              <Paperclip className="w-4 h-4 shrink-0" />
              <span className="truncate">فایل</span>
            </button>
          </div>
        </div>

        {/* 2. Title Field */}
        <div className="space-y-1.5">
          <label className="text-xs font-black text-ink-darker dark:text-white flex items-center justify-between">
            <span>عنوان پست:</span>
            <span className="text-[10px] text-gray-400 font-mono">
              {toPersianDigits(title.length)} / {toPersianDigits(120)}
            </span>
          </label>
          <input
            type="text"
            required
            maxLength={120}
            placeholder="مثال: برگزاری موفقیت‌آمیز رویداد استارتاپی و کارگاه پودمان ۴..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full h-11 px-3.5 rounded-xl border-[1.5px] border-gray-200 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-900 text-ink-darker dark:text-white text-xs sm:text-sm font-bold outline-none focus:border-primary focus:bg-white dark:focus:bg-[#151C28] transition-all shadow-2xs placeholder-gray-400"
          />
        </div>

        {/* 3. Rich Text Editor for Content */}
        <RichTextEditor
          label="متن پست:"
          value={content}
          onChange={setContent}
          rows={6}
          required
          placeholder="شرح کامل رویداد، اهداف، دستاوردهای دانش‌آموزان و نکات کلیدی را در اینجا بنویسید..."
        />

        {/* 4. Media Images Section */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-[#151C28] border border-gray-200 dark:border-gray-800 space-y-3.5 shadow-2xs">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0 shadow-2xs">
                <ImageIcon className="w-4 h-4" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-ink-darker dark:text-white">
                  تصاویر و گالری اسلایدی
                </span>
                {mediaUrls.length > 0 && (
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200/60 dark:border-teal-800/60">
                    {toPersianDigits(mediaUrls.length)} تصویر
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button
                type="button"
                onClick={() => setShowUrlInput(!showUrlInput)}
                className={`px-2.5 py-1.5 rounded-xl border text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer ${showUrlInput
                    ? 'border-teal-500 bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300'
                    : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80 text-gray-600 dark:text-gray-300 hover:border-teal-400'
                  }`}
              >
                <Link2 className="w-3.5 h-3.5" />
                <span>لینک تصویر</span>
              </button>

              <button
                type="button"
                disabled={uploadingImage}
                onClick={() => imageInputRef.current?.click()}
                className="px-3.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-black text-[11px] shadow-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
              >
                <UploadCloud className="w-3.5 h-3.5" />
                <span>{uploadingImage ? 'در حال آپلود...' : 'افزودن تصویر'}</span>
              </button>
              <input
                ref={imageInputRef}
                type="file"
                multiple
                accept="image/*"
                onChange={handleImageFileUpload}
                className="hidden"
              />
            </div>
          </div>

          {/* URL Input Drawer if toggled */}
          {showUrlInput && (
            <div className="p-2.5 rounded-xl bg-gray-50/80 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-800 flex flex-col sm:flex-row gap-2 animate-in fade-in slide-in-from-top-1">
              <input
                type="url"
                placeholder="آدرس اینترنتی تصویر را وارد کنید (https://...)"
                dir="ltr"
                value={customImageUrl}
                onChange={(e) => setCustomImageUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddImageUrl();
                  }
                }}
                className="flex-1 h-10 px-3.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs font-mono outline-none focus:border-teal-500 text-left placeholder:text-gray-400"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleAddImageUrl}
                  disabled={!customImageUrl.trim()}
                  className="h-10 px-4 rounded-xl bg-teal-600 text-white font-bold text-xs hover:bg-teal-700 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  افزودن به گالری
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCustomImageUrl('');
                    setShowUrlInput(false);
                  }}
                  className="h-10 px-3 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 text-xs font-bold cursor-pointer"
                >
                  بستن
                </button>
              </div>
            </div>
          )}

          {/* Upload Dropzone / Gallery Grid */}
          {mediaUrls.length === 0 ? (
            <div
              onClick={() => imageInputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDraggingImage(true);
              }}
              onDragLeave={() => setIsDraggingImage(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDraggingImage(false);
                if (e.dataTransfer.files) processImageFiles(e.dataTransfer.files);
              }}
              className={`group relative border-2 border-dashed rounded-2xl p-6 transition-all duration-200 flex flex-col items-center justify-center text-center cursor-pointer ${isDraggingImage
                  ? 'border-teal-500 bg-teal-50/50 dark:bg-teal-950/30 scale-[1.01]'
                  : 'border-gray-200 dark:border-gray-700/80 bg-gray-50/50 dark:bg-gray-900/40 hover:border-teal-400 hover:bg-teal-50/20 dark:hover:bg-teal-950/10'
                }`}
            >
              <div className="w-12 h-12 rounded-2xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform shadow-2xs">
                <UploadCloud className="w-6 h-6" />
              </div>
              <p className="text-xs font-black text-ink-darker dark:text-white mb-1">
                تصاویر را اینجا بکشید یا برای انتخاب از دستگاه کلیک کنید
              </p>
              <p className="text-[11px] text-gray-400">
                پشتیبانی از فرمت‌های JPG، PNG، WebP (حداکثر ۲۰ مگابایت برای هر تصویر)
              </p>
            </div>
          ) : (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDraggingImage(true);
              }}
              onDragLeave={() => setIsDraggingImage(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDraggingImage(false);
                if (e.dataTransfer.files) processImageFiles(e.dataTransfer.files);
              }}
              className={`p-1.5 rounded-2xl transition-all ${isDraggingImage ? 'ring-2 ring-teal-500 bg-teal-50/20 dark:bg-teal-950/20' : ''
                }`}
            >
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                {mediaUrls.map((url, idx) => (
                  <div
                    key={idx}
                    className={`relative aspect-video rounded-xl overflow-hidden border-[1.5px] group shadow-2xs bg-gray-100 dark:bg-gray-800 transition-all ${idx === 0
                        ? 'border-teal-500 ring-2 ring-teal-500/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                      }`}
                  >
                    <img
                      src={url}
                      alt={`تصویر ${idx + 1}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />

                    {/* Featured / Index Badge */}
                    {idx === 0 ? (
                      <div className="absolute top-1.5 right-1.5 px-2 py-0.5 rounded-md bg-teal-600/95 text-white text-[10px] font-black backdrop-blur-xs flex items-center gap-1 shadow-xs">
                        <Star className="w-3 h-3 fill-white" />
                        <span>تصویر شاخص</span>
                      </div>
                    ) : (
                      <div className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-md bg-black/60 text-white text-[9px] font-bold backdrop-blur-xs">
                        {toPersianDigits(idx + 1)}#
                      </div>
                    )}

                    {/* Action Overlay */}
                    <div className="absolute inset-0 bg-black/55 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 backdrop-blur-[1px]">
                      {idx !== 0 && (
                        <button
                          type="button"
                          onClick={() => handleSetFeaturedImage(idx)}
                          className="px-2 py-1 rounded-lg bg-white/95 text-teal-800 hover:bg-white text-[10px] font-black flex items-center gap-1 shadow-sm transition-all cursor-pointer active:scale-95"
                          title="تعیین به عنوان تصویر شاخص (کاور)"
                        >
                          <Star className="w-3 h-3 fill-teal-700" />
                          <span>شاخص</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setMediaUrls((prev) => prev.filter((_, i) => i !== idx))}
                        className="p-1.5 rounded-lg bg-rose-600/90 text-white hover:bg-rose-600 shadow-sm transition-all cursor-pointer active:scale-95"
                        title="حذف این تصویر"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}

                {/* Inline Add More Tile */}
                <button
                  type="button"
                  onClick={() => imageInputRef.current?.click()}
                  className="aspect-video rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-700 hover:border-teal-500 dark:hover:border-teal-400 bg-gray-50/60 dark:bg-gray-900/30 hover:bg-teal-50/30 dark:hover:bg-teal-950/20 flex flex-col items-center justify-center gap-1 text-gray-500 hover:text-teal-600 dark:hover:text-teal-400 transition-all cursor-pointer group"
                >
                  <Plus className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] font-bold">افزودن تصویر</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 5. Attachments Section */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-[#151C28] border border-gray-200 dark:border-gray-800 space-y-3.5 shadow-2xs">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 shadow-2xs">
                <Paperclip className="w-4 h-4" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-ink-darker dark:text-white">
                  اسناد و فایل‌های پیوست
                </span>
                {attachments.length > 0 && (
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60">
                    {toPersianDigits(attachments.length)} فایل
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button
                type="button"
                onClick={() => setShowAttachmentUrlInput(!showAttachmentUrlInput)}
                className={`px-2.5 py-1.5 rounded-xl border text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer ${showAttachmentUrlInput
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300'
                    : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80 text-gray-600 dark:text-gray-300 hover:border-indigo-400'
                  }`}
              >
                <Link2 className="w-3.5 h-3.5" />
                <span>لینک فایل</span>
              </button>

              <button
                type="button"
                disabled={uploadingAttachment}
                onClick={() => fileInputRef.current?.click()}
                className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[11px] shadow-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
              >
                <UploadCloud className="w-3.5 h-3.5" />
                <span>{uploadingAttachment ? 'در حال آپلود...' : 'انتخاب فایل'}</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.docx,.doc,.xlsx,.xls,.zip,.rar,.pptx"
                onChange={handleAttachmentUpload}
                className="hidden"
              />
            </div>
          </div>

          {/* Attachment URL Inputs if toggled */}
          {showAttachmentUrlInput && (
            <div className="p-2.5 rounded-xl bg-gray-50/80 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-800 grid grid-cols-1 sm:grid-cols-12 gap-2 animate-in fade-in slide-in-from-top-1">
              <input
                type="text"
                placeholder="عنوان فایل (مثال: جزوه پودمان ۴)"
                value={customAttachmentName}
                onChange={(e) => setCustomAttachmentName(e.target.value)}
                className="sm:col-span-5 h-10 px-3.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs outline-none focus:border-indigo-500 placeholder:text-gray-400"
              />
              <input
                type="url"
                placeholder="آدرس اینترنتی فایل (https://...)"
                dir="ltr"
                value={customAttachmentUrl}
                onChange={(e) => setCustomAttachmentUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddAttachmentUrl();
                  }
                }}
                className="sm:col-span-5 h-10 px-3.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs font-mono outline-none focus:border-indigo-500 text-left placeholder:text-gray-400"
              />
              <div className="sm:col-span-2 flex gap-1.5">
                <button
                  type="button"
                  onClick={handleAddAttachmentUrl}
                  disabled={!customAttachmentName.trim() || !customAttachmentUrl.trim()}
                  className="flex-1 h-10 rounded-xl bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-700 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  ثبت
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCustomAttachmentName('');
                    setCustomAttachmentUrl('');
                    setShowAttachmentUrlInput(false);
                  }}
                  className="h-10 px-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 text-xs font-bold cursor-pointer"
                >
                  بستن
                </button>
              </div>
            </div>
          )}

          {/* Upload Dropzone / Attachments List */}
          {attachments.length === 0 ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDraggingAttachment(true);
              }}
              onDragLeave={() => setIsDraggingAttachment(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDraggingAttachment(false);
                if (e.dataTransfer.files) processAttachmentFiles(e.dataTransfer.files);
              }}
              className={`group relative border-2 border-dashed rounded-2xl p-6 transition-all duration-200 flex flex-col items-center justify-center text-center cursor-pointer ${isDraggingAttachment
                  ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30 scale-[1.01]'
                  : 'border-gray-200 dark:border-gray-700/80 bg-gray-50/50 dark:bg-gray-900/40 hover:border-indigo-400 hover:bg-indigo-50/20 dark:hover:bg-indigo-950/10'
                }`}
            >
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform shadow-2xs">
                <Paperclip className="w-6 h-6" />
              </div>
              <p className="text-xs font-black text-ink-darker dark:text-white mb-1">
                فایل‌های پیوست را اینجا بکشید یا برای انتخاب از دستگاه کلیک کنید
              </p>
              <div className="flex flex-wrap items-center justify-center gap-1.5 mt-2">
                {['PDF', 'DOCX', 'XLSX', 'PPTX', 'ZIP'].map((fmt) => (
                  <span
                    key={fmt}
                    className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-mono"
                  >
                    {fmt}
                  </span>
                ))}
                <span className="text-[10px] text-gray-400 mr-1">(حداکثر ۵۰ مگابایت برای هر فایل)</span>
              </div>
            </div>
          ) : (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDraggingAttachment(true);
              }}
              onDragLeave={() => setIsDraggingAttachment(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDraggingAttachment(false);
                if (e.dataTransfer.files) processAttachmentFiles(e.dataTransfer.files);
              }}
              className={`p-1.5 rounded-2xl transition-all ${isDraggingAttachment ? 'ring-2 ring-indigo-500 bg-indigo-50/20 dark:bg-indigo-950/20' : ''
                }`}
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {attachments.map((att, idx) => {
                  const details = getFileTypeDetails(att.name, att.mimeType);
                  const IconComp = details.icon;
                  return (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 rounded-xl bg-gray-50/80 dark:bg-gray-900/70 border border-gray-200 dark:border-gray-800 hover:border-indigo-300 dark:hover:border-indigo-800 transition-all shadow-2xs group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`w-9 h-9 rounded-xl ${details.iconBg} flex items-center justify-center shrink-0 shadow-2xs`}
                        >
                          <IconComp className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p
                            className="font-bold text-ink-darker dark:text-white text-xs truncate"
                            title={att.name}
                          >
                            {att.name}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span
                              className={`px-1.5 py-0.2 rounded text-[9px] font-black uppercase font-mono border ${details.badgeClass}`}
                            >
                              {details.label}
                            </span>
                            {att.size && (
                              <span className="text-[10px] text-gray-400 font-mono">
                                {formatFileSize(att.size)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setAttachments((prev) => prev.filter((_, i) => i !== idx))}
                        className="p-1.5 text-gray-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg cursor-pointer transition-colors"
                        title="حذف فایل"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Inline Add More Button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full mt-2.5 py-2.5 rounded-xl border border-dashed border-gray-300 dark:border-gray-700 hover:border-indigo-400 dark:hover:border-indigo-500 bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>افزودن فایل پیوست بیشتر</span>
              </button>
            </div>
          )}
        </div>

        {/* 6. Target Audience Selector */}
        <div className="space-y-2 pt-1">
          <label className="text-xs font-black text-ink-darker dark:text-white block">
            جامعه مخاطبان و سطح دسترسی:
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setAudienceType('ALL')}
              className={`h-11 px-3 rounded-xl border-[1.5px] transition-all flex items-center justify-center gap-2 text-xs font-bold cursor-pointer active:scale-95 ${audienceType === 'ALL'
                  ? 'border-primary bg-primary/10 dark:bg-primary/20 text-primary shadow-[2px_2px_0_#59BBAF] font-black'
                  : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-[#161D2A] text-gray-600 dark:text-gray-300'
                }`}
            >
              <Globe className="w-4 h-4 shrink-0" />
              <span>عمومی (همه)</span>
            </button>

            <button
              type="button"
              onClick={() => setAudienceType('ROLES')}
              className={`h-11 px-3 rounded-xl border-[1.5px] transition-all flex items-center justify-center gap-2 text-xs font-bold cursor-pointer active:scale-95 ${audienceType === 'ROLES'
                  ? 'border-primary bg-primary/10 dark:bg-primary/20 text-primary shadow-[2px_2px_0_#59BBAF] font-black'
                  : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-[#161D2A] text-gray-600 dark:text-gray-300'
                }`}
            >
              <Users className="w-4 h-4 shrink-0" />
              <span>بر اساس نقش</span>
            </button>

            <button
              type="button"
              onClick={() => setAudienceType('CLASSROOMS')}
              className={`h-11 px-3 rounded-xl border-[1.5px] transition-all flex items-center justify-center gap-2 text-xs font-bold cursor-pointer active:scale-95 ${audienceType === 'CLASSROOMS'
                  ? 'border-primary bg-primary/10 dark:bg-primary/20 text-primary shadow-[2px_2px_0_#59BBAF] font-black'
                  : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-[#161D2A] text-gray-600 dark:text-gray-300'
                }`}
            >
              <Building className="w-4 h-4 shrink-0" />
              <span>کلاس‌ها</span>
            </button>
          </div>

          {/* Role selector sub-options */}
          {audienceType === 'ROLES' && (
            <div className="p-3 rounded-2xl bg-gray-50/80 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-800 flex flex-wrap gap-2.5 animate-in fade-in">
              {[
                { key: 'STUDENT', label: 'دانش‌آموزان', icon: GraduationCap },
                { key: 'PARENT', label: 'اولیاء گرامی', icon: Users },
                { key: 'TEACHER', label: 'مربیان و اساتید', icon: School },
              ].map((role) => {
                const isSelected = targetRoles.includes(role.key);
                const Icon = role.icon;
                return (
                  <button
                    key={role.key}
                    type="button"
                    onClick={() => {
                      if (isSelected) {
                        setTargetRoles((r) => r.filter((x) => x !== role.key));
                      } else {
                        setTargetRoles((r) => [...r, role.key]);
                      }
                    }}
                    className={`h-9 px-3 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${isSelected
                        ? 'border-primary bg-primary/15 text-primary shadow-2xs font-black'
                        : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300'
                      }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{role.label}</span>
                    {isSelected && <Check className="w-3 h-3 text-primary mr-0.5" />}
                  </button>
                );
              })}
            </div>
          )}

          {/* Classroom selector sub-options */}
          {audienceType === 'CLASSROOMS' && (
            <div className="p-3 rounded-2xl bg-gray-50/80 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-800 space-y-2 animate-in fade-in">
              <span className="text-[11px] font-black text-gray-500 dark:text-gray-400 block">
                انتخاب یک یا چند کلاس آموزشی:
              </span>
              <div className="flex flex-wrap gap-2">
                {classrooms.map((cls) => {
                  const isSelected = targetClassroomIds.includes(cls.id);
                  return (
                    <button
                      key={cls.id}
                      type="button"
                      onClick={() => {
                        if (isSelected) {
                          setTargetClassroomIds((ids) => ids.filter((id) => id !== cls.id));
                        } else {
                          setTargetClassroomIds((ids) => [...ids, cls.id]);
                        }
                      }}
                      className={`h-8 px-3 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${isSelected
                          ? 'border-primary bg-primary text-primary-dark font-black shadow-2xs'
                          : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:border-gray-300'
                        }`}
                    >
                      <span>{cls.name}</span>
                      {isSelected && <Check className="w-3 h-3 text-primary-dark" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* 7. Publishing Preferences (Toggles in single line) */}
        <div className="grid grid-cols-2 gap-2.5 pt-1">
          <label className="flex items-center gap-2 sm:gap-2.5 p-3 rounded-2xl bg-gray-50/80 dark:bg-[#151C28]/80 border border-gray-200 dark:border-gray-800 cursor-pointer hover:border-gray-300 dark:hover:border-gray-700 transition-colors select-none">
            <input
              type="checkbox"
              checked={isPinned}
              onChange={(e) => setIsPinned(e.target.checked)}
              className="w-4 h-4 rounded text-primary focus:ring-primary accent-primary shrink-0 cursor-pointer"
            />
            <span className="text-xs font-black text-ink-darker dark:text-white flex items-center gap-1.5 truncate">
              <Pin className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span className="truncate">سنجاق در صدر رسانه</span>
            </span>
          </label>

          <label className="flex items-center gap-2 sm:gap-2.5 p-3 rounded-2xl bg-gray-50/80 dark:bg-[#151C28]/80 border border-gray-200 dark:border-gray-800 cursor-pointer hover:border-gray-300 dark:hover:border-gray-700 transition-colors select-none">
            <input
              type="checkbox"
              checked={allowComments}
              onChange={(e) => setAllowComments(e.target.checked)}
              className="w-4 h-4 rounded text-primary focus:ring-primary accent-primary shrink-0 cursor-pointer"
            />
            <span className="text-xs font-black text-ink-darker dark:text-white flex items-center gap-1.5 truncate">
              <MessageCircle className="w-3.5 h-3.5 text-primary shrink-0" />
              <span className="truncate">امکان ثبت نظرات</span>
            </span>
          </label>
        </div>

        {/* 8. Action Buttons Footer */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-100 dark:border-gray-800">
          <Button
            type="button"
            variant="secondary"
            onClick={handleClose}
            disabled={isSubmitting}
            className="text-xs font-bold"
          >
            انصراف
          </Button>

          <Button
            type="submit"
            variant="primary"
            isLoading={isSubmitting}
            className="font-black text-xs border-[1.5px] border-primary-dark shadow-[2px_2px_0_#438C83]"
          >
            <Send className="w-4 h-4 ml-1.5" />
            <span>انتشار در رسانه</span>
          </Button>
        </div>
      </form>
    </Modal>
  );
};
