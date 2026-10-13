import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { apiClient } from '../../../lib/api/client';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Badge } from '../../../components/ui/Badge';
import { Modal } from '../../../components/ui/Modal';
import { Skeleton } from '../../../components/ui/Skeleton';
import { ResponsivePageHeader } from '../../../components/ui/ResponsivePageHeader';
import {
  BookOpen,
  Plus,
  FileText,
  UploadCloud,
  CheckCircle2,
  HardDrive,
  Download,
  Trash2,
  Video,
  FileArchive,
  Music,
  File,
  X,
  AlertCircle,
  Loader2,
  ExternalLink,
  Filter,
} from 'lucide-react';

export const LessonPlansPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const lessonIdParam = searchParams.get('lessonId');
  const lessonNameParam = searchParams.get('lessonName');
  const actionParam = searchParams.get('action');

  const [activeTab, setActiveTab] = useState<'MATERIALS' | 'PLANS'>(
    tabParam === 'PLANS' ? 'PLANS' : 'MATERIALS'
  );
  const [materials, setMaterials] = useState<any[]>([]);
  const [lessonPlans, setLessonPlans] = useState<any[]>([]);
  const [lessons, setLessons] = useState<any[]>([]);
  const [classrooms, setClassrooms] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);

  // File Upload State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Forms
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [materialForm, setMaterialForm] = useState({
    title: '',
    description: '',
    lessonId: lessonIdParam || '',
    classroomId: '',
    materialType: 'DOCUMENT',
  });

  const [planForm, setPlanForm] = useState({
    title: '',
    lessonId: lessonIdParam || '',
    sessionNumber: 1,
    topics: '',
    pedagogicalGoal: '',
  });

  const fetchData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [matRes, plansRes, lessonRes, classRes] = await Promise.allSettled([
        apiClient.get('/learning-materials'),
        apiClient.get('/lesson-plans'),
        apiClient.get('/classes/lessons'),
        apiClient.get('/classes/classrooms'),
      ]);

      const mats = matRes.status === 'fulfilled' ? matRes.value.data || [] : [];
      const plans = plansRes.status === 'fulfilled' ? plansRes.value.data || [] : [];
      const less = lessonRes.status === 'fulfilled' ? lessonRes.value.data || [] : [];
      const cls = classRes.status === 'fulfilled' ? classRes.value.data || [] : [];

      setMaterials(mats);
      setLessonPlans(plans);
      setLessons(less);
      setClassrooms(cls);

      const defaultLessonId = lessonIdParam || (less.length > 0 ? less[0].id : '');
      if (defaultLessonId) {
        setMaterialForm((prev) => ({
          ...prev,
          lessonId: prev.lessonId || defaultLessonId,
        }));
        setPlanForm((prev) => ({
          ...prev,
          lessonId: prev.lessonId || defaultLessonId,
        }));
      }

      if (cls.length > 0) {
        setMaterialForm((prev) => ({
          ...prev,
          classroomId: prev.classroomId || cls[0].id,
        }));
      }

      // Check actions
      if (actionParam === 'new-plan') {
        setIsPlanModalOpen(true);
      } else if (actionParam === 'upload-material') {
        setIsUploadModalOpen(true);
      }
    } catch (err) {
      console.error('Failed to load materials or lessons', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (tabParam === 'PLANS') {
      setActiveTab('PLANS');
    }
  }, [tabParam]);

  useEffect(() => {
    fetchData();
  }, []);

  const detectMaterialType = (fileName: string): string => {
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    if (['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(ext)) return 'VIDEO';
    if (['mp3', 'wav', 'ogg', 'm4a'].includes(ext)) return 'AUDIO';
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return 'ARCHIVE';
    return 'DOCUMENT';
  };

  const handleFileChange = (file: File | null) => {
    if (!file) return;
    setSelectedFile(file);
    const detectedType = detectMaterialType(file.name);
    setMaterialForm((prev) => ({
      ...prev,
      materialType: detectedType,
      title: prev.title.trim() === '' ? file.name.replace(/\.[^/.]+$/, '') : prev.title,
    }));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleUploadMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!materialForm.title.trim()) {
      setError('لطفاً عنوان فایل یا جزوه را مشخص کنید.');
      return;
    }

    if (!materialForm.lessonId) {
      setError('لطفاً درس مرتبط را انتخاب نمایید.');
      return;
    }

    if (!selectedFile) {
      setError('لطفاً یک فایل جهت بارگذاری در سرور MinIO انتخاب کنید.');
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Upload the real physical file to MinIO Storage via Storage Service
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('moduleName', 'materials');

      const uploadRes = await apiClient.post('/storage/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const uploadData = uploadRes.data?.data || uploadRes.data;
      const fileKey = uploadData?.fileKey || `tenants/materials/${Date.now()}-${selectedFile.name}`;
      const fileUrl = uploadData?.fileUrl || `http://localhost:9000/rokad-storage/${fileKey}`;
      const fileSizeMb = uploadData?.fileSizeMb || parseFloat((selectedFile.size / (1024 * 1024)).toFixed(2));
      const mimeType = uploadData?.mimeType || selectedFile.type || 'application/octet-stream';

      // 2. Register material record in platform
      await apiClient.post('/learning-materials', {
        title: materialForm.title.trim(),
        description: materialForm.description.trim() || undefined,
        lessonId: materialForm.lessonId,
        classroomId: materialForm.classroomId || undefined,
        classroomIds: materialForm.classroomId ? [materialForm.classroomId] : [],
        fileKey,
        fileUrl,
        fileSizeMb,
        mimeType,
        materialType: materialForm.materialType || detectMaterialType(selectedFile.name),
        isDownloadable: true,
        isPublished: true,
      });

      // Reset & Refresh
      setSelectedFile(null);
      setMaterialForm({
        title: '',
        description: '',
        lessonId: lessons.length > 0 ? lessons[0].id : '',
        classroomId: classrooms.length > 0 ? classrooms[0].id : '',
        materialType: 'DOCUMENT',
      });
      setIsUploadModalOpen(false);
      await fetchData();
    } catch (err: any) {
      console.error('Upload failed', err);
      setError(
        err.response?.data?.message ||
        err.message ||
        'خطا در بارگذاری فایل در مخزن MinIO. لطفاً اتصال را بررسی نمایید.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownload = async (material: any) => {
    try {
      setDownloadingId(material.id);
      const res = await apiClient.get(`/learning-materials/${material.id}/download-url`);
      const downloadUrl = res.data?.downloadUrl || material.fileUrl;
      if (downloadUrl) {
        window.open(downloadUrl, '_blank', 'noopener,noreferrer');
      } else {
        alert('آدرس دانلود این فایل موجود نیست.');
      }
    } catch (err: any) {
      console.warn('Secure URL fallback to static URL', err);
      if (material.fileUrl) {
        window.open(material.fileUrl, '_blank', 'noopener,noreferrer');
      } else {
        alert('خطا در دریافت لینک دانلود امن.');
      }
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDeleteMaterial = async (materialId: string, title: string) => {
    if (!window.confirm(`آیا از حذف جزوه «${title}» مطمئن هستید؟`)) {
      return;
    }

    try {
      setDeletingId(materialId);
      await apiClient.delete(`/learning-materials/${materialId}`);
      setMaterials((prev) => prev.filter((m) => m.id !== materialId));
    } catch (err: any) {
      alert(err.response?.data?.message || 'خطا در حذف محتوا');
    } finally {
      setDeletingId(null);
    }
  };

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      await apiClient.post('/lesson-plans', planForm);
      setIsPlanModalOpen(false);
      setPlanForm({
        title: '',
        lessonId: lessons.length > 0 ? lessons[0].id : '',
        sessionNumber: 1,
        topics: '',
        pedagogicalGoal: '',
      });
      await fetchData();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'خطا در ثبت طرح درس.');
    } finally {
      setIsSubmitting(false);
    }
  };
  const renderTypeIcon = (type: string) => {
    switch (type) {
      case 'VIDEO':
        return <Video className="h-4 w-4 text-rose-500" />;
      case 'ARCHIVE':
        return <FileArchive className="h-4 w-4 text-amber-500" />;
      case 'AUDIO':
        return <Music className="h-4 w-4 text-purple-500" />;
      default:
        return <FileText className="h-4 w-4 text-primary" />;
    }
  };

  const displayedMaterials = lessonIdParam
    ? materials.filter((m) => m.lessonId === lessonIdParam || m.lesson?.id === lessonIdParam)
    : materials;

  const displayedPlans = lessonIdParam
    ? lessonPlans.filter((p) => p.lessonId === lessonIdParam || p.lesson?.id === lessonIdParam)
    : lessonPlans;

  return (
    <div className="space-y-6">
      <ResponsivePageHeader
        title="محتوای آموزشی"
        icon={<BookOpen className="h-5 w-5 text-primary" />}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsPlanModalOpen(true)} className="text-xs h-9">
              <Plus className="h-3.5 w-3.5 ml-1 text-primary" />
              <span>ثبت طرح درس جدید</span>
            </Button>
            <Button variant="primary" size="sm" onClick={() => setIsUploadModalOpen(true)} className="text-xs h-9">
              <UploadCloud className="h-3.5 w-3.5 ml-1" />
              <span>بارگذاری جزوه یا ویدیو</span>
            </Button>
          </div>
        }
      />

      {/* Lesson Filter Banner */}
      {lessonIdParam && (
        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-primary/10 border border-primary/25 text-xs text-foreground">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-primary">
              <Filter className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold text-primary">
                فیلتر شده بر اساس درس: {lessonNameParam || 'درس انتخاب‌شده'}
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                {activeTab === 'PLANS'
                  ? `تعداد ${displayedPlans.length} طرح درس برای این مبحث ثبت شده است.`
                  : `تعداد ${displayedMaterials.length} جزوه و فایل آموزشی برای این درس موجود است.`}
              </div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              searchParams.delete('lessonId');
              searchParams.delete('lessonName');
              setSearchParams(searchParams);
            }}
            className="text-xs h-8 gap-1 hover:bg-surface"
          >
            <X className="w-3.5 h-3.5" />
            <span>نمایش همه دروس</span>
          </Button>
        </div>
      )}

      {/* Tab Switcher */}
      <div className="flex items-center space-x-4 space-x-reverse border-b border-gray-200">
        <button
          onClick={() => setActiveTab('MATERIALS')}
          className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 flex items-center space-x-1.5 space-x-reverse ${
            activeTab === 'MATERIALS'
              ? 'border-primary text-primary-dark'
              : 'border-transparent text-gray-500 hover:text-ink-dark'
          }`}
        >
          <HardDrive className="h-4 w-4" />
          <span>جزوات و فایل‌های بارگذاری‌شده ({displayedMaterials.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('PLANS')}
          className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 flex items-center space-x-1.5 space-x-reverse ${
            activeTab === 'PLANS'
              ? 'border-primary text-primary-dark'
              : 'border-transparent text-gray-500 hover:text-ink-dark'
          }`}
        >
          <FileText className="h-4 w-4" />
          <span>طرح درس‌های جلسات ({displayedPlans.length})</span>
        </button>
      </div>

      {/* Tab 1: Materials Grid */}
      {activeTab === 'MATERIALS' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="p-6">
                <Skeleton className="h-6 w-32 mb-2" />
                <Skeleton className="h-4 w-full mb-4" />
                <Skeleton className="h-10 w-full" />
              </Card>
            ))
          ) : displayedMaterials.length === 0 ? (
            <div className="col-span-3 text-center py-16 bg-white rounded-2xl border border-dashed border-gray-300 text-gray-500">
              <UploadCloud className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <div className="text-sm font-bold text-ink-dark mb-1">
                {lessonIdParam
                  ? `هیچ فایلی برای درس ${lessonNameParam || ''} بارگذاری نشده است`
                  : 'هنوز فایلی بارگذاری نشده است'}
              </div>
              <p className="text-xs text-gray-400 mb-4">
                از دکمه «بارگذاری جزوه یا ویدیو» برای اشتراک فایل آموزشی با دانش‌آموزان استفاده کنید.
              </p>
              <Button variant="primary" size="sm" onClick={() => setIsUploadModalOpen(true)}>
                <Plus className="h-4 w-4 ml-1" />
                <span>اولین فایل را بارگذاری کنید</span>
              </Button>
            </div>
          ) : (
            materials.map((mat) => {
              const classNames = mat.classrooms?.map((c: any) => c.classroom?.name).filter(Boolean).join('، ');
              return (
                <Card
                  key={mat.id}
                  className="flex flex-col justify-between p-6 border border-gray-200 hover:border-primary/60 hover:shadow-md transition-all rounded-2xl bg-white"
                >
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Badge variant="default" className="text-xs">
                          {mat.lesson?.name || 'درس مرتبط'}
                        </Badge>
                        {classNames && (
                          <Badge variant="neutral" className="text-[11px]">
                            {classNames}
                          </Badge>
                        )}
                      </div>
                      <span className="text-[11px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                        {mat.fileSizeMb ? `${mat.fileSizeMb} MB` : 'فضای ابری'}
                      </span>
                    </div>

                    <h3 className="font-bold text-base text-ink-darker mb-1.5 flex items-center space-x-2 space-x-reverse">
                      {renderTypeIcon(mat.materialType)}
                      <span className="truncate">{mat.title}</span>
                    </h3>
                    <p className="text-xs text-gray-500 leading-relaxed line-clamp-2 mb-4">
                      {mat.description || 'توضیحاتی برای این جزوه آموزشی ثبت نشده است.'}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
                    <span className="text-[11px] text-gray-400">
                      {new Date(mat.createdAt || Date.now()).toLocaleDateString('fa-IR')}
                    </span>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleDeleteMaterial(mat.id, mat.title)}
                        disabled={deletingId === mat.id}
                        className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="حذف جزوه"
                      >
                        {deletingId === mat.id ? (
                          <Loader2 className="h-4 w-4 animate-spin text-rose-500" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </button>

                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleDownload(mat)}
                        isLoading={downloadingId === mat.id}
                        className="text-xs h-8 px-3 font-bold"
                      >
                        <Download className="h-3.5 w-3.5 ml-1 text-primary" />
                        <span>دانلود امن</span>
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })
          )}
        </div>
      )}

      {/* Tab 2: Lesson Plans Grid */}
      {activeTab === 'PLANS' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {displayedPlans.length === 0 ? (
            <div className="col-span-2 text-center py-16 bg-white rounded-2xl border border-dashed border-gray-300 text-gray-500">
              <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <div className="text-sm font-bold text-ink-dark mb-1">
                {lessonIdParam
                  ? `طرح درسی برای درس ${lessonNameParam || ''} ثبت نشده است`
                  : 'طرح درسی ثبت نشده است'}
              </div>
              <p className="text-xs text-gray-400 mb-4">
                برای برنامه‌ریزی جلسات درسی و بودجه‌بندی سرفصل‌ها از دکمه زیر استفاده کنید.
              </p>
              <Button variant="primary" size="sm" onClick={() => setIsPlanModalOpen(true)}>
                <Plus className="h-4 w-4 ml-1" />
                <span>ثبت طرح درس جدید</span>
              </Button>
            </div>
          ) : (
            displayedPlans.map((lp) => {
              const firstSession = lp.sessions?.[0];
              return (
                <Card key={lp.id} className="p-6 border border-gray-200 rounded-2xl bg-white space-y-3">
                  <div className="flex justify-between items-center">
                    <Badge variant="default">
                      {lp.sessions?.length ? `${lp.sessions.length} جلسه تدریس` : 'جلسه شماره ۱'}
                    </Badge>
                    <span className="text-xs font-bold text-gray-600">{lp.lesson?.name || 'ریاضیات'}</span>
                  </div>
                  <h3 className="font-bold text-base text-ink-darker">{lp.title}</h3>
                  {firstSession && (
                    <p className="text-xs text-gray-600 leading-relaxed">
                      <strong>سرفصل‌ها:</strong> {firstSession.topic || lp.description}
                    </p>
                  )}
                  {firstSession?.objectives && (
                    <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 text-xs text-gray-600">
                      <strong>هدف آموزشی:</strong> {firstSession.objectives}
                    </div>
                  )}
                </Card>
              );
            })
          )}
        </div>
      )}

      {/* 1. Modal: Upload Material (MinIO Cloud Storage) */}
      <Modal
        isOpen={isUploadModalOpen}
        onClose={() => {
          if (!isSubmitting) {
            setIsUploadModalOpen(false);
            setSelectedFile(null);
            setError(null);
          }
        }}
        title="بارگذاری جزوه یا محتوای آموزشی"
        description="بارگذاری مستقیم فایل با سرعت بالا در سرور ابری و صدور لینک دانلود امن برای دانش‌آموزان"
        maxWidth="lg"
      >
        <form onSubmit={handleUploadMaterial} className="space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center space-x-2 space-x-reverse">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <Input
            label="عنوان فایل یا جزوه *"
            placeholder="مثال: جزوه دست‌نویس فصل مشتق و تست‌های تکمیلی"
            value={materialForm.title}
            onChange={(e) => setMaterialForm({ ...materialForm, title: e.target.value })}
            required
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-ink-normal mb-1.5 text-right">
                درس مرتبط *
              </label>
              <select
                value={materialForm.lessonId}
                onChange={(e) => setMaterialForm({ ...materialForm, lessonId: e.target.value })}
                className="flex h-11 w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2 text-sm text-ink-normal focus:outline-none focus:ring-2 focus:ring-primary"
                required
              >
                {lessons.length === 0 && <option value="">درسی تخصیص نیافته است</option>}
                {lessons.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name} {l.code ? `(${l.code})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-ink-normal mb-1.5 text-right">
                کلاس هدف
              </label>
              <select
                value={materialForm.classroomId}
                onChange={(e) => setMaterialForm({ ...materialForm, classroomId: e.target.value })}
                className="flex h-11 w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2 text-sm text-ink-normal focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">همه کلاس‌های من (عمومی)</option>
                {classrooms.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.gradeLevel ? `(پایه ${c.gradeLevel})` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <Input
            label="توضیحات کوتاه محتوا"
            placeholder="مثال: شامل حل ۵۰ تست تالیفی و نکات طلایی امتحان نهایی"
            value={materialForm.description}
            onChange={(e) => setMaterialForm({ ...materialForm, description: e.target.value })}
          />

          {/* Real File Input & Drag and Drop Box */}
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept=".pdf,.mp4,.zip,.rar,.7z,.doc,.docx,.epub,.ppt,.pptx,.jpg,.png"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleFileChange(e.target.files[0]);
              }
            }}
          />

          {!selectedFile ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`p-6 border-2 border-dashed rounded-2xl text-center cursor-pointer transition-all ${
                isDragging
                  ? 'border-primary bg-primary-light/50 scale-[1.01]'
                  : 'border-primary/40 bg-primary-light/20 hover:bg-primary-light/40 hover:border-primary'
              }`}
            >
              <UploadCloud className="h-10 w-10 text-primary mx-auto mb-2" />
              <div className="text-xs font-bold text-ink-darker mb-1">
                برای انتخاب فایل کلیک کنید یا فایل را به اینجا بکشید (PDF, MP4, ZIP)
              </div>
              <div className="text-[11px] text-gray-500">
                حداکثر حجم مجاز: ۵۰ مگابایت — ذخیره‌سازی ابری امن و ایزوله
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
              <div className="flex items-center space-x-3 space-x-reverse min-w-0">
                <div className="p-2.5 bg-emerald-100 rounded-xl text-emerald-700 shrink-0">
                  {renderTypeIcon(materialForm.materialType)}
                </div>
                <div className="truncate">
                  <div className="text-xs font-bold text-emerald-900 truncate">
                    {selectedFile.name}
                  </div>
                  <div className="text-[11px] text-emerald-600 mt-0.5">
                    {(selectedFile.size / (1024 * 1024)).toFixed(2)} مگابایت • نوع فایل: {materialForm.materialType}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs text-emerald-800 hover:bg-emerald-100 h-8 px-2.5"
                >
                  تغییر فایل
                </Button>
                <button
                  type="button"
                  onClick={() => setSelectedFile(null)}
                  className="p-1.5 text-emerald-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-2 space-x-reverse pt-3 border-t border-gray-100">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setIsUploadModalOpen(false);
                setSelectedFile(null);
                setError(null);
              }}
              disabled={isSubmitting}
            >
              انصراف
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={isSubmitting}
              disabled={!selectedFile || isSubmitting}
            >
              {isSubmitting ? 'در حال آپلود در MinIO...' : 'بارگذاری و انتشار برای کلاس'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* 2. Modal: Create Lesson Plan */}
      <Modal
        isOpen={isPlanModalOpen}
        onClose={() => {
          if (!isSubmitting) setIsPlanModalOpen(false);
        }}
        title="ثبت طرح درس جدید"
        description="برنامه‌ریزی سرفصل‌های تدریس برای هر جلسه کلاسی"
        maxWidth="md"
      >
        <form onSubmit={handleCreatePlan} className="space-y-4">
          <Input
            label="عنوان جلسه آموزشی *"
            placeholder="مثال: جلسه سوم — مشتق توابع مثلثاتی"
            value={planForm.title}
            onChange={(e) => setPlanForm({ ...planForm, title: e.target.value })}
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="شماره جلسه"
              type="number"
              min={1}
              value={planForm.sessionNumber}
              onChange={(e) => setPlanForm({ ...planForm, sessionNumber: Number(e.target.value) })}
              required
            />
            <div>
              <label className="block text-sm font-medium text-ink-normal mb-1.5 text-right">درس *</label>
              <select
                value={planForm.lessonId}
                onChange={(e) => setPlanForm({ ...planForm, lessonId: e.target.value })}
                className="flex h-11 w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2 text-sm text-ink-normal focus:outline-none focus:ring-2 focus:ring-primary"
                required
              >
                {lessons.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <Input
            label="سرفصل‌ها و مباحث *"
            placeholder="مثال: فرمول‌های مشتق sin و cos همراه با تمرین"
            value={planForm.topics}
            onChange={(e) => setPlanForm({ ...planForm, topics: e.target.value })}
            required
          />

          <Input
            label="هدف آموزشی و خروجی یادگیری"
            placeholder="مثال: دانش‌آموز توانایی محاسبه مشتق توابع ترکیبی را پیدا کند"
            value={planForm.pedagogicalGoal}
            onChange={(e) => setPlanForm({ ...planForm, pedagogicalGoal: e.target.value })}
          />

          <div className="flex justify-end space-x-2 space-x-reverse pt-2 border-t border-gray-100">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsPlanModalOpen(false)}
              disabled={isSubmitting}
            >
              انصراف
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              ذخیره طرح درس
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
