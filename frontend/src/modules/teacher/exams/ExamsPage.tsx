import React, { useEffect, useState } from 'react';
import { apiClient } from '../../../lib/api/client';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { Badge } from '../../../components/ui/Badge';
import { Modal } from '../../../components/ui/Modal';
import { Skeleton } from '../../../components/ui/Skeleton';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '../../../components/ui/Table';
import { MobileDataTable } from '../../../components/ui/MobileDataTable';
import { ResponsivePageHeader } from '../../../components/ui/ResponsivePageHeader';
import {
  HelpCircle,
  Plus,
  Clock,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Users,
  ShieldAlert,
  Award,
  Star,
  CheckCheck,
  Sparkles,
  MessageSquare,
  BarChart3,
  Edit3,
  Check,
  X,
  FileText,
  FileSpreadsheet,
  Download,
  UploadCloud,
  Search,
  Filter,
  Layers,
} from 'lucide-react';
import { PersianDatePicker } from '../../../components/ui/PersianDatePicker';
import {
  gregorianToJalaliStr,
  jalaliToGregorianDate,
} from '../../../utils/jalali';
import {
  downloadQuestionExcelTemplate,
  parseQuestionsFromExcel,
  ParsedQuestionRow,
} from '../../../utils/excel-question-template';

export const ExamsPage: React.FC = () => {
  const [exams, setExams] = useState<any[]>([]);
  const [classrooms, setClassrooms] = useState<any[]>([]);
  const [lessons, setLessons] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [isCreateExamOpen, setIsCreateExamOpen] = useState(false);
  const [isAddQuestionOpen, setIsAddQuestionOpen] = useState(false);
  const [isMonitorOpen, setIsMonitorOpen] = useState(false);
  const [selectedExam, setSelectedExam] = useState<any>(null);

  // Exam Results & Grading Dashboard States
  const [examResultsData, setExamResultsData] = useState<any>(null);
  const [isResultsLoading, setIsResultsLoading] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'NEEDS_GRADING' | 'GRADED' | 'FLAGGED'>('ALL');

  // Dedicated Paper Grading Modal States
  const [isGradePaperModalOpen, setIsGradePaperModalOpen] = useState(false);
  const [activePaperSheet, setActivePaperSheet] = useState<any>(null);
  const [isSheetLoading, setIsSheetLoading] = useState(false);
  const [isSavingGrading, setIsSavingGrading] = useState(false);
  const [gradingForm, setGradingForm] = useState<{
    grades: Record<string, { scoreAwarded: number; teacherComment: string }>;
    graceScore: number;
    graceReason: string;
    teacherFeedback: string;
  }>({
    grades: {},
    graceScore: 0,
    graceReason: '',
    teacherFeedback: '',
  });

  // Forms
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [examForm, setExamForm] = useState({
    title: '',
    description: '',
    lessonId: '',
    classroomId: '',
    type: 'ONLINE',
    round: 'CLASS_EXAM',
    durationMinutes: 60,
    examDate: gregorianToJalaliStr(new Date()),
    passingScore: 10,
    totalScore: 20,
  });

  const [questionForm, setQuestionForm] = useState({
    text: '',
    type: 'MULTIPLE_CHOICE',
    score: 2,
    options: [
      { text: 'گزینه الف', isCorrect: true },
      { text: 'گزینه ب', isCorrect: false },
      { text: 'گزینه ج', isCorrect: false },
      { text: 'گزینه د', isCorrect: false },
    ],
  });

  // Advanced Question Adding States (Manual / Bank / Excel)
  const [addQuestionMode, setAddQuestionMode] = useState<'MANUAL' | 'BANK' | 'EXCEL'>('MANUAL');
  const [bankQuestions, setBankQuestions] = useState<any[]>([]);
  const [bankCategories, setBankCategories] = useState<any[]>([]);
  const [isBankLoading, setIsBankLoading] = useState<boolean>(false);
  const [selectedBankCategory, setSelectedBankCategory] = useState<string>('');
  const [bankSearchQuery, setBankSearchQuery] = useState<string>('');
  const [bankSelectedIds, setBankSelectedIds] = useState<string[]>([]);
  const [bankImportScore, setBankImportScore] = useState<number>(2.0);

  // Excel Upload States
  const [excelRows, setExcelRows] = useState<ParsedQuestionRow[]>([]);
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [isParsingExcel, setIsParsingExcel] = useState<boolean>(false);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [examsRes, classesRes, lessonsRes] = await Promise.allSettled([
        apiClient.get('/exams'),
        apiClient.get('/classes/classrooms'),
        apiClient.get('/classes/lessons'),
      ]);

      const examsData = examsRes.status === 'fulfilled'
        ? (Array.isArray(examsRes.value.data) ? examsRes.value.data : (examsRes.value.data?.data || []))
        : [];
      const classData = classesRes.status === 'fulfilled'
        ? (Array.isArray(classesRes.value.data) ? classesRes.value.data : (classesRes.value.data?.data || []))
        : [];
      const lessonData = lessonsRes.status === 'fulfilled'
        ? (Array.isArray(lessonsRes.value.data) ? lessonsRes.value.data : (lessonsRes.value.data?.data || []))
        : [];

      setExams(examsData);
      setClassrooms(classData);
      setLessons(lessonData);

      if (classData.length > 0) {
        setExamForm((prev) => ({ ...prev, classroomId: prev.classroomId || classData[0].id }));
      }
      if (lessonData.length > 0) {
        setExamForm((prev) => ({ ...prev, lessonId: prev.lessonId || lessonData[0].id }));
      }
    } catch (err) {
      console.error('Failed to load exams', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!examForm.classroomId) {
      setError('لطفاً کلاس هدف را انتخاب کنید.');
      return;
    }
    if (!examForm.lessonId) {
      setError('لطفاً درس مرتبط را انتخاب کنید.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const gDate = examForm.examDate ? jalaliToGregorianDate(examForm.examDate) : new Date();
      const startDateTime = new Date(gDate);
      startDateTime.setHours(8, 0, 0, 0);
      const endDateTime = new Date(gDate);
      endDateTime.setHours(23, 59, 59, 0);

      await apiClient.post('/exams', {
        title: examForm.title,
        description: examForm.description || '',
        lessonId: examForm.lessonId,
        classroomId: examForm.classroomId,
        classroomIds: [examForm.classroomId],
        durationMinutes: Number(examForm.durationMinutes) || 60,
        totalScore: Number(examForm.totalScore) || 20,
        passingScore: Number(examForm.passingScore) || 10,
        startTime: startDateTime.toISOString(),
        endTime: endDateTime.toISOString(),
        examType: examForm.type || 'ONLINE',
        round: examForm.round || 'CLASS_EXAM',
      });
      setIsCreateExamOpen(false);
      setExamForm((prev) => ({
        ...prev,
        title: '',
        description: '',
        durationMinutes: 60,
        totalScore: 20,
        passingScore: 10,
      }));
      fetchData();
    } catch (err: any) {
      console.error('Failed to create exam', err);
      const msg =
        err.response?.data?.message || err.message || 'خطا در طراحی آزمون.';
      setError(Array.isArray(msg) ? msg.join('، ') : msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExam) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await apiClient.post(`/exams/${selectedExam.id}/questions`, {
        text: questionForm.text,
        type: questionForm.type,
        score: Number(questionForm.score),
        options: questionForm.type === 'MULTIPLE_CHOICE' ? questionForm.options : undefined,
      });
      setIsAddQuestionOpen(false);
      setQuestionForm({
        text: '',
        type: 'MULTIPLE_CHOICE',
        score: 2,
        options: [
          { text: 'گزینه الف', isCorrect: true },
          { text: 'گزینه ب', isCorrect: false },
          { text: 'گزینه ج', isCorrect: false },
          { text: 'گزینه د', isCorrect: false },
        ],
      });
      fetchData();
    } catch (err: any) {
      setError(err.message || 'خطا در ثبت سوال.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const fetchBankQuestions = async (lessonId?: string) => {
    try {
      setIsBankLoading(true);
      const targetLessonId = lessonId || selectedExam?.lessonId || selectedExam?.lesson?.id;
      const [qRes, catRes] = await Promise.all([
        apiClient.get('/question-bank/questions', {
          params: targetLessonId ? { lessonId: targetLessonId } : undefined,
        }),
        targetLessonId
          ? apiClient
              .get('/question-bank/categories', { params: { lessonId: targetLessonId } })
              .catch(() => ({ data: [] }))
          : Promise.resolve({ data: [] }),
      ]);
      setBankQuestions(qRes.data || []);
      setBankCategories(catRes.data || []);
    } catch (err: any) {
      console.error('Failed to load question bank for exam', err);
    } finally {
      setIsBankLoading(false);
    }
  };

  const handleOpenAddQuestion = (exam: any) => {
    setSelectedExam(exam);
    setAddQuestionMode('MANUAL');
    setBankSelectedIds([]);
    setExcelRows([]);
    setExcelFile(null);
    setError(null);
    setIsAddQuestionOpen(true);
    fetchBankQuestions(exam.lessonId || exam.lesson?.id);
  };

  const handleImportFromBank = async () => {
    if (!selectedExam || bankSelectedIds.length === 0) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await apiClient.post(`/exams/${selectedExam.id}/questions/import-bank`, {
        questionIds: bankSelectedIds,
        defaultScore: Number(bankImportScore) || 2.0,
      });
      setIsAddQuestionOpen(false);
      setBankSelectedIds([]);
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'خطا در ایمپورت سوالات از بانک');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExcelFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsParsingExcel(true);
    setError(null);
    try {
      const rows = await parseQuestionsFromExcel(file);
      setExcelFile(file);
      setExcelRows(rows);
    } catch (err: any) {
      setError(err.message || 'خطا در تحلیل فایل اکسل');
      setExcelRows([]);
    } finally {
      setIsParsingExcel(false);
    }
  };

  const handleImportFromExcel = async () => {
    if (!selectedExam || excelRows.length === 0) return;
    const validRows = excelRows.filter((r) => r.isValid);
    if (validRows.length === 0) {
      setError('هیچ سوال معتبری در فایل اکسل جهت بارگذاری یافت نشد.');
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      await apiClient.post(`/exams/${selectedExam.id}/questions/bulk`, {
        questions: validRows.map((r) => ({
          text: r.text,
          type: r.type,
          score: r.score,
          options: r.options,
          solutionExplanation: r.solutionExplanation,
        })),
      });
      setIsAddQuestionOpen(false);
      setExcelRows([]);
      setExcelFile(null);
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'خطا در بارگذاری سوالات از اکسل');
    } finally {
      setIsSubmitting(false);
    }
  };

  const fetchExamResults = async (examId: string) => {
    try {
      setIsResultsLoading(true);
      const res = await apiClient.get(`/exams/${examId}/results`);
      const data = res.data?.data || res.data || res;
      setExamResultsData(data);
    } catch (err) {
      console.error('Failed to load exam results', err);
    } finally {
      setIsResultsLoading(false);
    }
  };

  const handleMonitorExam = (exam: any) => {
    setSelectedExam(exam);
    setIsMonitorOpen(true);
    setActiveFilter('ALL');
    fetchExamResults(exam.id);
  };

  const handleTogglePublish = async () => {
    if (!selectedExam) return;
    const isCurrentlyPublished = !!examResultsData?.exam?.isResultsPublished;
    const confirmMsg = isCurrentlyPublished
      ? 'آیا از لغو انتشار کارنامه آزمون اطمینان دارید؟ با این کار نمرات برای دانش‌آموزان پنهان خواهد شد.'
      : 'آیا از انتشار کارنامه برای کلیه دانش‌آموزان کلاس اطمینان دارید؟ با این کار نمرات نهایی و بازخوردها برای دانش‌آموزان قابل مشاهده می‌شود.';

    if (!window.confirm(confirmMsg)) return;

    try {
      setIsPublishing(true);
      await apiClient.patch(`/exams/${selectedExam.id}/publish-results`, {
        publish: !isCurrentlyPublished,
      });
      await Promise.all([fetchExamResults(selectedExam.id), fetchData()]);
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'خطا در تغییر وضعیت انتشار کارنامه';
      alert(Array.isArray(msg) ? msg.join('، ') : msg);
    } finally {
      setIsPublishing(false);
    }
  };

  const handleOpenPaperGrading = async (participationId: string) => {
    setIsGradePaperModalOpen(true);
    setIsSheetLoading(true);
    try {
      const res = await apiClient.get(`/exams/participations/${participationId}/sheet`);
      const sheet = res.data?.data || res.data || res;
      setActivePaperSheet(sheet);

      const initialGrades: Record<string, { scoreAwarded: number; teacherComment: string }> = {};
      (sheet.questions || []).forEach((q: any) => {
        initialGrades[q.questionId] = {
          scoreAwarded:
            q.studentAnswer?.scoreAwarded !== null && q.studentAnswer?.scoreAwarded !== undefined
              ? q.studentAnswer.scoreAwarded
              : 0,
          teacherComment: q.studentAnswer?.teacherComment || '',
        };
      });

      setGradingForm({
        grades: initialGrades,
        graceScore: sheet.participation?.graceScore || 0,
        graceReason: sheet.participation?.graceReason || '',
        teacherFeedback: sheet.participation?.teacherFeedback || '',
      });
    } catch (err: any) {
      console.error('Failed to load participation sheet', err);
      alert('خطا در بارگذاری برگه پاسخ‌نامه دانش‌آموز');
      setIsGradePaperModalOpen(false);
    } finally {
      setIsSheetLoading(false);
    }
  };

  const calculateLiveScore = () => {
    if (!activePaperSheet) return 0;
    const questionsTotal = Object.values(gradingForm.grades).reduce(
      (sum, g) => sum + (Number(g.scoreAwarded) || 0),
      0,
    );
    const grace = Number(gradingForm.graceScore) || 0;
    const maxScore = activePaperSheet.exam?.totalScore || 20;
    return Math.min(maxScore, Math.round((questionsTotal + grace) * 100) / 100);
  };

  const handleSaveGrading = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePaperSheet) return;
    setIsSavingGrading(true);
    try {
      const gradesPayload = Object.entries(gradingForm.grades).map(([questionId, g]) => ({
        questionId,
        scoreAwarded: Number(g.scoreAwarded) || 0,
        teacherComment: g.teacherComment || '',
      }));

      await apiClient.patch(`/exams/participations/${activePaperSheet.participation.id}/grade`, {
        grades: gradesPayload,
        graceScore: Number(gradingForm.graceScore) || 0,
        graceReason: gradingForm.graceReason || '',
        teacherFeedback: gradingForm.teacherFeedback || '',
      });

      setIsGradePaperModalOpen(false);
      if (selectedExam) {
        fetchExamResults(selectedExam.id);
        fetchData();
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'خطا در ثبت نمرات برگه';
      alert(Array.isArray(msg) ? msg.join('، ') : msg);
    } finally {
      setIsSavingGrading(false);
    }
  };

  // Filtered Participations
  const participationsList = examResultsData?.participations || [];
  const filteredParticipations = participationsList.filter((p: any) => {
    if (activeFilter === 'NEEDS_GRADING') return !p.isGraded;
    if (activeFilter === 'GRADED') return p.isGraded;
    if (activeFilter === 'FLAGGED') return p.tabSwitchCount > 0;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header & CTA */}
      <ResponsivePageHeader
        icon={HelpCircle}
        title="آزمون‌ها"
        actions={
          <Button
            variant="primary"
            onClick={() => {
              setError(null);
              setIsCreateExamOpen(true);
            }}
            className="flex items-center space-x-1.5 space-x-reverse text-xs"
          >
            <Plus className="h-4 w-4" />
            <span>طراحی آزمون جدید</span>
          </Button>
        }
      />

      {/* Exams Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="p-6">
              <Skeleton className="h-6 w-32 mb-2" />
              <Skeleton className="h-4 w-full mb-4" />
              <Skeleton className="h-10 w-full" />
            </Card>
          ))
        ) : exams.length === 0 ? (
          <div className="col-span-3 text-center py-12 bg-white rounded-2xl border border-gray-200 text-gray-500 text-sm">
            هنوز آزمونی تعریف نکرده‌اید. با کلیک بر روی «طراحی آزمون جدید» اولین آزمون خود را بسازید.
          </div>
        ) : (
          exams.map((exam) => {
            const isResultsPublished = !!exam.isResultsPublished;
            return (
              <Card key={exam.id} className="relative flex flex-col justify-between hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[11px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                        {exam.lesson?.name || 'درس عمومی'}
                      </span>
                      <CardTitle className="text-base mt-2">{exam.title}</CardTitle>
                    </div>
                    <Badge variant={isResultsPublished ? 'success' : 'warning'}>
                      {isResultsPublished ? 'کارنامه منتشرشده' : 'کارنامه منتشرنشده'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 pt-0">
                  <div className="space-y-1.5 text-xs text-gray-500 border-t pt-3">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center space-x-1.5 space-x-reverse">
                        <Clock className="h-3.5 w-3.5 text-gray-400" />
                        <span>مدت زمان:</span>
                      </span>
                      <strong>{exam.durationMinutes} دقیقه</strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center space-x-1.5 space-x-reverse">
                        <CheckCircle2 className="h-3.5 w-3.5 text-gray-400" />
                        <span>بارم کل:</span>
                      </span>
                      <strong>{exam.totalScore} نمره</strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center space-x-1.5 space-x-reverse">
                        <Users className="h-3.5 w-3.5 text-gray-400" />
                        <span>شرکت‌کنندگان:</span>
                      </span>
                      <strong>{exam._count?.participations || 0} نفر</strong>
                    </div>
                    <div className="flex items-center space-x-2 space-x-reverse pt-1 border-t text-[11px]">
                      <span className="text-gray-400">کلاس‌ها:</span>
                      <span className="text-gray-700 truncate">
                        {exam.classrooms?.map((ec: any) => ec.classroom?.name).join('، ') || 'عمومی'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t pt-3 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 text-xs"
                      onClick={() => handleOpenAddQuestion(exam)}
                    >
                      <Plus className="h-3.5 w-3.5 ml-1" />
                      افزودن سوال
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      className="flex-1 text-xs flex items-center justify-center space-x-1 space-x-reverse"
                      onClick={() => handleMonitorExam(exam)}
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                      <span>تصحیح و کارنامه</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* 1. Modal: Create Exam */}
      <Modal
        isOpen={isCreateExamOpen}
        onClose={() => setIsCreateExamOpen(false)}
        title="طراحی آزمون جدید"
        description="تعیین زمان‌بندی سرور، مدت آزمون و کلاس‌های هدف"
        maxWidth="lg"
      >
        <form onSubmit={handleCreateExam} className="space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          {lessons.length === 0 && (
            <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-lg">
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
              <span>هیچ درسی به حساب کاربری شما تخصیص نیافته است. لطفاً جهت تخصیص درس با راهبری مدرسه تماس بگیرید.</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Select
              label="نحوه برگزاری آزمون"
              value={examForm.type}
              onChange={(e) => setExamForm({ ...examForm, type: e.target.value })}
              required
            >
              <option value="ONLINE">آزمون آنلاین (با پاسخ‌برگ سامانه)</option>
              <option value="PAPER_BASED">آزمون حضوری / کتبی (در مدرسه)</option>
            </Select>

            <Select
              label="نوبت آزمون"
              value={examForm.round}
              onChange={(e) => setExamForm({ ...examForm, round: e.target.value })}
              required
            >
              <option value="CLASS_EXAM">آزمون کلاسی</option>
              <option value="CONTINUOUS">امتحان مستمر</option>
              <option value="MIDTERM_1">نوبت اول</option>
              <option value="FINAL_2">نوبت دوم</option>
            </Select>

            <Input
              label="عنوان آزمون"
              placeholder="مثال: آزمون میان‌ترم حسابان ۱"
              value={examForm.title}
              onChange={(e) => setExamForm({ ...examForm, title: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="کلاس هدف"
              value={examForm.classroomId}
              onChange={(e) => setExamForm({ ...examForm, classroomId: e.target.value })}
              required
            >
              <option value="">انتخاب کلاس...</option>
              {classrooms.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.code})
                </option>
              ))}
            </Select>

            <Select
              label="درس مرتبط"
              value={examForm.lessonId}
              onChange={(e) => setExamForm({ ...examForm, lessonId: e.target.value })}
              required
            >
              <option value="">انتخاب درس...</option>
              {lessons.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name} ({l.code})
                </option>
              ))}
            </Select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              type="number"
              label="مدت آزمون (دقیقه)"
              value={examForm.durationMinutes}
              onChange={(e) => setExamForm({ ...examForm, durationMinutes: Number(e.target.value) })}
              min={5}
              max={300}
              required
            />
            <Input
              type="number"
              label="بارم کل (نمره)"
              value={examForm.totalScore}
              onChange={(e) => setExamForm({ ...examForm, totalScore: Number(e.target.value) })}
              min={1}
              required
            />
            <Input
              type="number"
              label="نمره قبولی"
              value={examForm.passingScore}
              onChange={(e) => setExamForm({ ...examForm, passingScore: Number(e.target.value) })}
              min={1}
            />
          </div>

          <PersianDatePicker
            label="تاریخ برگزاری آزمون"
            value={examForm.examDate}
            onChange={(jalaliStr) => setExamForm({ ...examForm, examDate: jalaliStr })}
          />

          <div>
            <label className="block text-xs font-medium text-ink-dark mb-1">توضیحات و دستورالعمل آزمون</label>
            <textarea
              rows={3}
              value={examForm.description}
              onChange={(e) => setExamForm({ ...examForm, description: e.target.value })}
              placeholder="نکات مهم و راهنمای شرکت در آزمون..."
              className="w-full rounded-xl border border-gray-300 bg-white p-2.5 text-xs text-ink-normal focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="flex justify-end space-x-2 space-x-reverse pt-2">
            <Button type="button" variant="ghost" onClick={() => setIsCreateExamOpen(false)}>
              انصراف
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting} disabled={lessons.length === 0}>
              ایجاد آزمون
            </Button>
          </div>
        </form>
      </Modal>

      {/* 2. Modal: Add Question to Exam (Manual, Question Bank, Excel) */}
      <Modal
        isOpen={isAddQuestionOpen}
        onClose={() => setIsAddQuestionOpen(false)}
        title={`افزودن و مدیریت سوالات: ${selectedExam?.title || ''}`}
        description="ثبت مستقیم سوال، انتخاب از بانک سوالات متمرکز یا بارگذاری خودکار با فایل اکسل"
        maxWidth="3xl"
      >
        <div className="space-y-4">
          {/* Mode Switcher Tabs */}
          <div className="flex border-b border-gray-200 bg-gray-50/90 p-1 rounded-xl gap-1">
            <button
              type="button"
              onClick={() => {
                setAddQuestionMode('MANUAL');
                setError(null);
              }}
              className={`flex-1 py-2 px-3 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                addQuestionMode === 'MANUAL'
                  ? 'bg-white text-primary shadow-xs'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>ثبت دستی (تکی)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setAddQuestionMode('BANK');
                setError(null);
              }}
              className={`flex-1 py-2 px-3 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                addQuestionMode === 'BANK'
                  ? 'bg-white text-primary shadow-xs'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>ایمپورت از بانک سوالات</span>
              {bankQuestions.length > 0 && (
                <span className="bg-primary/10 text-primary text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                  {bankQuestions.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setAddQuestionMode('EXCEL');
                setError(null);
              }}
              className={`flex-1 py-2 px-3 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                addQuestionMode === 'EXCEL'
                  ? 'bg-white text-emerald-700 shadow-xs'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>ورود گروهی با فایل اکسل</span>
            </button>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          {/* TAB 1: MANUAL ADD */}
          {addQuestionMode === 'MANUAL' && (
            <form onSubmit={handleAddQuestion} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Select
                  label="نوع سوال"
                  value={questionForm.type}
                  onChange={(e) => setQuestionForm({ ...questionForm, type: e.target.value })}
                >
                  <option value="MULTIPLE_CHOICE">چهارگزینه‌ای (تستی)</option>
                  <option value="DESCRIPTIVE">تشریحی</option>
                </Select>

                <Input
                  type="number"
                  label="بارم سوال (نمره)"
                  value={questionForm.score}
                  onChange={(e) => setQuestionForm({ ...questionForm, score: Number(e.target.value) })}
                  min={0.1}
                  step={0.25}
                  required
                />
              </div>

              <Input
                label="متن سوال"
                placeholder="صورت سوال را تایپ کنید..."
                value={questionForm.text}
                onChange={(e) => setQuestionForm({ ...questionForm, text: e.target.value })}
                required
              />

              {questionForm.type === 'MULTIPLE_CHOICE' && (
                <div className="space-y-2 pt-2 border-t border-gray-100">
                  <label className="block text-xs font-bold text-ink-dark mb-1">
                    گزینه‌ها و تعیین پاسخ صحیح:
                  </label>
                  {questionForm.options.map((opt, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="correctOption"
                        checked={opt.isCorrect}
                        onChange={() => {
                          setQuestionForm({
                            ...questionForm,
                            options: questionForm.options.map((o, i) => ({ ...o, isCorrect: i === idx })),
                          });
                        }}
                        className="text-primary focus:ring-primary h-4 w-4"
                      />
                      <Input
                        placeholder={`گزینه ${idx + 1}`}
                        value={opt.text}
                        onChange={(e) => {
                          const newOpts = [...questionForm.options];
                          newOpts[idx].text = e.target.value;
                          setQuestionForm({ ...questionForm, options: newOpts });
                        }}
                        required
                      />
                    </div>
                  ))}
                </div>
              )}

              <div className="flex justify-end space-x-2 space-x-reverse pt-2">
                <Button type="button" variant="ghost" onClick={() => setIsAddQuestionOpen(false)}>
                  انصراف
                </Button>
                <Button type="submit" variant="primary" isLoading={isSubmitting}>
                  ثبت سوال در آزمون
                </Button>
              </div>
            </form>
          )}

          {/* TAB 2: IMPORT FROM QUESTION BANK */}
          {addQuestionMode === 'BANK' && (
            <div className="space-y-3.5">
              {/* Search & Category Filter */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute right-3 top-3 text-gray-400" />
                  <input
                    type="text"
                    placeholder="جستجو در متن سوالات بانک..."
                    value={bankSearchQuery}
                    onChange={(e) => setBankSearchQuery(e.target.value)}
                    className="w-full h-9 pr-9 pl-3 text-xs rounded-xl border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={selectedBankCategory}
                    onChange={(e) => setSelectedBankCategory(e.target.value)}
                    className="w-full h-9 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#1C2536] text-ink-normal dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  >
                    <option value="">تمام سرفصل‌های موضوعی</option>
                    {bankCategories.map((c: any) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Selection Summary & Default Score */}
              <div className="flex flex-wrap items-center justify-between p-2.5 rounded-xl bg-primary/5 border border-primary/20 gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-1.5 cursor-pointer font-bold text-ink-darker">
                    <input
                      type="checkbox"
                      checked={
                        bankQuestions.length > 0 &&
                        bankSelectedIds.length ===
                          bankQuestions.filter((q) => {
                            const matchCat = !selectedBankCategory || q.categoryId === selectedBankCategory;
                            const matchSearch =
                              !bankSearchQuery || q.text.toLowerCase().includes(bankSearchQuery.toLowerCase());
                            return matchCat && matchSearch;
                          }).length
                      }
                      onChange={(e) => {
                        const filtered = bankQuestions.filter((q) => {
                          const matchCat = !selectedBankCategory || q.categoryId === selectedBankCategory;
                          const matchSearch =
                            !bankSearchQuery || q.text.toLowerCase().includes(bankSearchQuery.toLowerCase());
                          return matchCat && matchSearch;
                        });
                        if (e.target.checked) {
                          setBankSelectedIds(filtered.map((q) => q.id));
                        } else {
                          setBankSelectedIds([]);
                        }
                      }}
                      className="rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <span>انتخاب همه سوالات منطبق</span>
                  </label>
                  <Badge variant="college" className="text-[10px]">
                    {bankSelectedIds.length} سوال انتخاب‌شده
                  </Badge>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-gray-600 shrink-0">بارم پیش‌فرض هر سوال:</span>
                  <input
                    type="number"
                    min={0.25}
                    step={0.25}
                    value={bankImportScore}
                    onChange={(e) => setBankImportScore(Number(e.target.value))}
                    className="w-16 h-7 text-xs px-2 text-center rounded-lg border border-gray-300 bg-white"
                  />
                  <span className="text-gray-500">نمره</span>
                </div>
              </div>

              {/* Questions List */}
              {isBankLoading ? (
                <div className="space-y-2 py-4">
                  <Skeleton className="h-14 rounded-xl" />
                  <Skeleton className="h-14 rounded-xl" />
                  <Skeleton className="h-14 rounded-xl" />
                </div>
              ) : bankQuestions.length === 0 ? (
                <div className="p-8 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-300">
                  <Layers className="w-8 h-8 mx-auto text-gray-300 mb-2" />
                  <p className="text-xs font-bold text-gray-600">
                    هیچ سوالی در بانک سوالات برای این درس یافت نشد.
                  </p>
                  <p className="text-[11px] text-gray-400 mt-1">
                    می‌توانید از تب «ثبت دستی» یا «ورود با اکسل» برای اضافه کردن سوال استفاده کنید.
                  </p>
                </div>
              ) : (
                <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
                  {bankQuestions
                    .filter((q) => {
                      const matchCat = !selectedBankCategory || q.categoryId === selectedBankCategory;
                      const matchSearch =
                        !bankSearchQuery || q.text.toLowerCase().includes(bankSearchQuery.toLowerCase());
                      return matchCat && matchSearch;
                    })
                    .map((q) => {
                      const isSelected = bankSelectedIds.includes(q.id);

                      return (
                        <div
                          key={q.id}
                          onClick={() => {
                            if (isSelected) {
                              setBankSelectedIds(bankSelectedIds.filter((id) => id !== q.id));
                            } else {
                              setBankSelectedIds([...bankSelectedIds, q.id]);
                            }
                          }}
                          className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-3 ${
                            isSelected
                              ? 'bg-primary/5 border-primary shadow-2xs'
                              : 'bg-white border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                            className="mt-0.5 rounded border-gray-300 text-primary focus:ring-primary"
                          />

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge
                                variant={q.type === 'MULTIPLE_CHOICE' ? 'college' : 'warning'}
                                className="text-[10px] py-0 px-1.5"
                              >
                                {q.type === 'MULTIPLE_CHOICE' ? 'تستی' : 'تشریحی'}
                              </Badge>
                              {q.category && (
                                <span className="text-[10px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                                  {q.category.name}
                                </span>
                              )}
                              <span className="text-[10px] text-gray-400 mr-auto">
                                بارم اولیه: {q.defaultScore || 1.0}
                              </span>
                            </div>

                            <p className="text-xs font-medium text-ink-darker mt-1.5 leading-relaxed">
                              {q.text}
                            </p>

                            {q.options && q.options.length > 0 && (
                              <div className="grid grid-cols-2 gap-1 mt-2 text-[11px] text-gray-500 bg-gray-50/70 p-2 rounded-lg">
                                {q.options.map((opt: any, i: number) => (
                                  <div
                                    key={opt.id || i}
                                    className={`truncate flex items-center gap-1 ${
                                      opt.isCorrect ? 'text-emerald-700 font-bold' : ''
                                    }`}
                                  >
                                    <span>{i + 1})</span>
                                    <span>{opt.text}</span>
                                    {opt.isCorrect && <Check className="w-3 h-3 text-emerald-600 inline shrink-0" />}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end space-x-2 space-x-reverse pt-2 border-t border-gray-100">
                <Button type="button" variant="ghost" onClick={() => setIsAddQuestionOpen(false)}>
                  انصراف
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  onClick={handleImportFromBank}
                  isLoading={isSubmitting}
                  disabled={bankSelectedIds.length === 0}
                  className="flex items-center gap-1.5 text-xs"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>ایمپورت {bankSelectedIds.length} سوال انتخابی به آزمون</span>
                </Button>
              </div>
            </div>
          )}

          {/* TAB 3: EXCEL IMPORT */}
          {addQuestionMode === 'EXCEL' && (
            <div className="space-y-4">
              {/* Download Sample Banner */}
              <div className="p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                    <FileSpreadsheet className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-emerald-900">
                      فایل نمونه اکسل استاندارد رکاد (.xlsx)
                    </h4>
                    <p className="text-[11px] text-emerald-700 mt-0.5">
                      فایل نمونه شامل ستون‌های تعریف‌شده، راهنمای شماره گزینه صحیح و نمونه سوالات تستی و تشریحی است.
                    </p>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={downloadQuestionExcelTemplate}
                  className="text-xs border-emerald-300 text-emerald-800 hover:bg-emerald-100/50 shrink-0 h-8 flex items-center gap-1"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>دانلود فایل نمونه اکسل</span>
                </Button>
              </div>

              {/* Upload Input Area */}
              <div className="border-2 border-dashed border-gray-300 hover:border-primary/50 bg-gray-50/50 rounded-2xl p-4 text-center transition-colors">
                <UploadCloud className="w-8 h-8 mx-auto text-gray-400 mb-1.5" />
                <label className="cursor-pointer text-xs font-bold text-primary hover:underline block">
                  <span>انتخاب یا رهاسازی فایل اکسل (.xlsx یا .xls)</span>
                  <input
                    type="file"
                    accept=".xlsx, .xls"
                    onChange={handleExcelFileChange}
                    className="hidden"
                  />
                </label>
                <p className="text-[11px] text-gray-400 mt-1">
                  پس از انتخاب فایل، سوالات به صورت خودکار استخراج و در جدول زیر نمایش داده می‌شوند.
                </p>
                {excelFile && (
                  <div className="mt-2 text-xs font-bold text-emerald-700 bg-emerald-100/60 py-1 px-3 rounded-lg inline-block">
                    فایل بارگذاری‌شده: {excelFile.name}
                  </div>
                )}
              </div>

              {/* Preview Parsed Rows */}
              {isParsingExcel ? (
                <div className="space-y-2 py-3">
                  <Skeleton className="h-10 rounded-xl" />
                  <Skeleton className="h-10 rounded-xl" />
                </div>
              ) : excelRows.length > 0 ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-ink-darker">
                      پیش‌نمایش سوالات استخراج‌شده: ({excelRows.length} سطر)
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-emerald-600 font-bold">
                        {excelRows.filter((r) => r.isValid).length} سوال معتبر
                      </span>
                      {excelRows.some((r) => !r.isValid) && (
                        <span className="text-red-500 font-bold">
                          {excelRows.filter((r) => !r.isValid).length} خطا
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="max-h-60 overflow-y-auto rounded-xl border border-gray-200">
                    <table className="w-full text-right text-xs">
                      <thead className="bg-gray-100/80 text-gray-600 font-bold sticky top-0">
                        <tr>
                          <th className="p-2 w-10">ردیف</th>
                          <th className="p-2 w-16">نوع</th>
                          <th className="p-2">متن صورت سوال</th>
                          <th className="p-2 w-14">بارم</th>
                          <th className="p-2 w-28">گزینه صحیح</th>
                          <th className="p-2 w-20">وضعیت</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 bg-white">
                        {excelRows.map((r, i) => (
                          <tr key={i} className={r.isValid ? 'hover:bg-gray-50' : 'bg-red-50/50'}>
                            <td className="p-2 text-gray-500">{r.rowIndex}</td>
                            <td className="p-2">
                              <span
                                className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                                  r.type === 'MULTIPLE_CHOICE'
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'bg-amber-100 text-amber-800'
                                }`}
                              >
                                {r.type === 'MULTIPLE_CHOICE' ? 'تستی' : 'تشریحی'}
                              </span>
                            </td>
                            <td className="p-2 font-medium truncate max-w-xs">{r.text}</td>
                            <td className="p-2 font-bold">{r.score}</td>
                            <td className="p-2 text-[11px] text-gray-600">
                              {r.type === 'MULTIPLE_CHOICE'
                                ? `گزینه ${r.correctOptionIndex || 1}`
                                : 'تشریحی'}
                            </td>
                            <td className="p-2">
                              {r.isValid ? (
                                <span className="inline-flex items-center text-emerald-600 text-[11px] font-bold">
                                  <Check className="w-3.5 h-3.5 ml-0.5" />
                                  معتبر
                                </span>
                              ) : (
                                <span className="inline-flex items-center text-red-500 text-[10px]" title={r.validationError}>
                                  <AlertCircle className="w-3.5 h-3.5 ml-0.5 shrink-0" />
                                  خطا
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null}

              {/* Action Buttons */}
              <div className="flex justify-end space-x-2 space-x-reverse pt-2 border-t border-gray-100">
                <Button type="button" variant="ghost" onClick={() => setIsAddQuestionOpen(false)}>
                  انصراف
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  onClick={handleImportFromExcel}
                  isLoading={isSubmitting}
                  disabled={excelRows.filter((r) => r.isValid).length === 0}
                  className="flex items-center gap-1.5 text-xs bg-emerald-700 hover:bg-emerald-800"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>
                    تایید و بارگذاری {excelRows.filter((r) => r.isValid).length} سوال در آزمون
                  </span>
                </Button>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* 3. Modal: Exam Results & Grading Dashboard (ماژول جامع مدیریت و تصحیح آزمون) */}
      <Modal
        isOpen={isMonitorOpen}
        onClose={() => setIsMonitorOpen(false)}
        title={`داشبورد تصحیح و مدیریت آزمون: ${selectedExam?.title || ''}`}
        description="مشاهده عملکرد کلاس، پرچم‌های تقلب، تصحیح سوالات تشریحی، نمره ارفاقی و انتشار کارنامه‌ها"
        maxWidth="4xl"
      >
        <div className="space-y-5">
          {/* Top Control Bar: Publish Status & Button */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl bg-gray-50 border border-gray-200 gap-3">
            <div className="flex items-center space-x-3 space-x-reverse">
              <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${
                examResultsData?.exam?.isResultsPublished ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
              }`}>
                {examResultsData?.exam?.isResultsPublished ? <CheckCheck className="h-5 w-5" /> : <Clock className="h-5 w-5" />}
              </div>
              <div>
                <div className="flex items-center space-x-2 space-x-reverse">
                  <span className="font-bold text-sm text-ink-darker">وضعیت انتشار کارنامه‌ها:</span>
                  <Badge variant={examResultsData?.exam?.isResultsPublished ? 'success' : 'warning'}>
                    {examResultsData?.exam?.isResultsPublished ? 'کارنامه‌ها منتشر شده‌اند' : 'کارنامه‌ها منتشر نشده‌اند (پنهان از دانش‌آموزان)'}
                  </Badge>
                </div>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  {examResultsData?.exam?.isResultsPublished
                    ? 'دانش‌آموزان هم‌اکنون می‌توانند کارنامه، نمره نهایی و بازخوردهای شما را مشاهده کنند.'
                    : 'نمرات و کارنامه تا زمان فشردن دکمه انتشار، از دانش‌آموزان مخفی می‌ماند.'}
                </p>
              </div>
            </div>

            <Button
              variant={examResultsData?.exam?.isResultsPublished ? 'outline' : 'primary'}
              onClick={handleTogglePublish}
              isLoading={isPublishing}
              className="shrink-0 text-xs flex items-center space-x-1.5 space-x-reverse"
            >
              <CheckCheck className="h-4 w-4" />
              <span>{examResultsData?.exam?.isResultsPublished ? 'لغو انتشار کارنامه' : 'انتشار کارنامه‌ها برای کلاس'}</span>
            </Button>
          </div>

          {/* Quick Statistics KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl border bg-white space-y-1">
              <span className="text-[11px] text-gray-500">شرکت‌کنندگان</span>
              <div className="text-xl font-bold text-ink-darker">
                {examResultsData?.stats?.totalStudents || 0} نفر
              </div>
              <span className="text-[10px] text-emerald-600 font-medium">
                {examResultsData?.stats?.gradedCount || 0} تصحیح‌شده
              </span>
            </div>

            <div className="p-3.5 rounded-xl border bg-white space-y-1">
              <span className="text-[11px] text-gray-500">نیازمند تصحیح</span>
              <div className="text-xl font-bold text-amber-600">
                {examResultsData?.stats?.needsGradingCount || 0} برگه
              </div>
              <span className="text-[10px] text-gray-400">برگه‌های در انتظار</span>
            </div>

            <div className="p-3.5 rounded-xl border bg-white space-y-1">
              <span className="text-[11px] text-gray-500">میانگین نمرات کلاس</span>
              <div className="text-xl font-bold text-primary">
                {examResultsData?.stats?.averageScore || 0}
                <span className="text-xs font-normal text-gray-400 mr-1">/ {selectedExam?.totalScore || 20}</span>
              </div>
              <span className="text-[10px] text-gray-500">
                بالاترین: {examResultsData?.stats?.maxScore || 0}
              </span>
            </div>

            <div className="p-3.5 rounded-xl border bg-white space-y-1">
              <span className="text-[11px] text-gray-500">هشدار تعویض تب</span>
              <div className="text-xl font-bold text-rose-600">
                {examResultsData?.stats?.tabSwitchFlaggedCount || 0} مورد
              </div>
              <span className="text-[10px] text-gray-400">سیگنال تقلب نرم</span>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center space-x-2 space-x-reverse border-b pb-2 text-xs">
            <button
              onClick={() => setActiveFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                activeFilter === 'ALL' ? 'bg-primary text-white font-bold' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              همه ({participationsList.length})
            </button>
            <button
              onClick={() => setActiveFilter('NEEDS_GRADING')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                activeFilter === 'NEEDS_GRADING' ? 'bg-amber-600 text-white font-bold' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              نیازمند تصحیح ({examResultsData?.stats?.needsGradingCount || 0})
            </button>
            <button
              onClick={() => setActiveFilter('GRADED')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                activeFilter === 'GRADED' ? 'bg-emerald-600 text-white font-bold' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              تصحیح‌شده ({examResultsData?.stats?.gradedCount || 0})
            </button>
            <button
              onClick={() => setActiveFilter('FLAGGED')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                activeFilter === 'FLAGGED' ? 'bg-rose-600 text-white font-bold' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              مشکوک به تخلف ({examResultsData?.stats?.tabSwitchFlaggedCount || 0})
            </button>
          </div>

          {/* Participations Table */}
          {isResultsLoading ? (
            <div className="space-y-2 py-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <MobileDataTable
              items={filteredParticipations}
              emptyMessage="موردی برای نمایش در این دسته وجود ندارد."
              primaryField={(part: any) => (
                <div>
                  <div className="font-bold text-xs text-ink-dark">{part.studentName}</div>
                  <div className="text-[11px] font-mono text-gray-400">
                    {part.phone || part.nationalId || 'بدون شناسه'}
                  </div>
                </div>
              )}
              secondaryField={(part: any) => (
                <div className="text-left">
                  {part.totalScore !== null ? (
                    <span className="text-primary font-bold text-xs font-mono">
                      {part.totalScore} / {selectedExam?.totalScore || 20}
                    </span>
                  ) : (
                    <span className="text-gray-400 text-xs">—</span>
                  )}
                  <div>
                    <Badge variant={part.isGraded ? 'success' : 'warning'} className="text-[10px]">
                      {part.isGraded ? 'تصحیح‌شده' : 'نیازمند تصحیح'}
                    </Badge>
                  </div>
                </div>
              )}
              columns={[
                {
                  header: 'دانش‌آموز',
                  cell: (part: any) => (
                    <div>
                      <div className="font-bold text-xs text-ink-dark">{part.studentName}</div>
                      <div className="text-[11px] font-mono text-gray-400">
                        {part.phone || part.nationalId || 'بدون شناسه'}
                      </div>
                    </div>
                  ),
                },
                {
                  header: 'نمره نهایی',
                  cell: (part: any) => (
                    part.totalScore !== null ? (
                      <span className="text-primary font-bold text-xs font-mono">
                        {part.totalScore} / {selectedExam?.totalScore || 20}
                      </span>
                    ) : (
                      <span className="text-gray-400 text-xs">—</span>
                    )
                  ),
                },
                {
                  header: 'وضعیت برگه',
                  cell: (part: any) => (
                    <Badge variant={part.isGraded ? 'success' : 'warning'}>
                      {part.isGraded ? 'تصحیح‌شده' : 'نیازمند تصحیح'}
                    </Badge>
                  ),
                },
                {
                  header: 'زمان تحویل',
                  cell: (part: any) => (
                    <span className="text-xs text-gray-600 font-mono">
                      {part.submittedAt
                        ? new Date(part.submittedAt).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })
                        : 'در حال آزمون'}
                    </span>
                  ),
                  mobileDetail: true,
                },
                {
                  header: 'سیگنال تقلب',
                  cell: (part: any) => (
                    part.tabSwitchCount > 0 ? (
                      <Badge variant="destructive" className="inline-flex items-center space-x-1 space-x-reverse">
                        <ShieldAlert className="h-3 w-3" />
                        <span>{part.tabSwitchCount} خروج</span>
                      </Badge>
                    ) : (
                      <span className="text-[11px] text-gray-400">بدون خروج</span>
                    )
                  ),
                  mobileDetail: true,
                },
                {
                  header: 'نمره ارفاقی',
                  cell: (part: any) => (
                    part.graceScore > 0 ? (
                      <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 font-mono">
                        +{part.graceScore}
                      </span>
                    ) : (
                      <span className="text-[11px] text-gray-400">—</span>
                    )
                  ),
                  mobileDetail: true,
                },
                {
                  header: 'عملیات',
                  cell: (part: any) => (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenPaperGrading(part.id)}
                      className="text-xs flex items-center gap-1 h-8 px-2.5"
                    >
                      <Edit3 className="h-3.5 w-3.5 text-primary" />
                      <span>تصحیح برگه</span>
                    </Button>
                  ),
                },
              ]}
            />
          )}

          <div className="flex justify-end pt-2">
            <Button variant="primary" onClick={() => setIsMonitorOpen(false)}>
              بستن
            </Button>
          </div>
        </div>
      </Modal>

      {/* 4. Dedicated Paper Grading Modal (مودال اختصاصی تصحیح برگه، نمره ارفاقی و ثبت بازخورد) */}
      <Modal
        isOpen={isGradePaperModalOpen}
        onClose={() => setIsGradePaperModalOpen(false)}
        title={`تصحیح برگه: ${activePaperSheet?.student?.user?.firstName || ''} ${activePaperSheet?.student?.user?.lastName || ''}`}
        description={`بررسی پاسخ‌ها، نمره‌دهی به سوالات تشریحی و اعمال نمره ارفاقی برای آزمون ${activePaperSheet?.exam?.title || ''}`}
        maxWidth="3xl"
      >
        {isSheetLoading ? (
          <div className="space-y-4 py-8">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : (
          <form onSubmit={handleSaveGrading} className="space-y-5">
            {/* Student Session Metadata Bar */}
            <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-200 flex flex-wrap items-center justify-between text-xs gap-3">
              <div className="flex items-center space-x-2 space-x-reverse">
                <span className="text-gray-500">کد ملی / تماس:</span>
                <strong>{activePaperSheet?.student?.user?.nationalId || activePaperSheet?.student?.user?.phone || '—'}</strong>
              </div>
              <div className="flex items-center space-x-2 space-x-reverse">
                <span className="text-gray-500">زمان تحویل:</span>
                <span>{activePaperSheet?.participation?.submittedAt ? new Date(activePaperSheet.participation.submittedAt).toLocaleTimeString('fa-IR') : '—'}</span>
              </div>
              {activePaperSheet?.participation?.tabSwitchCount > 0 && (
                <Badge variant="destructive" className="flex items-center space-x-1 space-x-reverse">
                  <ShieldAlert className="h-3.5 w-3.5" />
                  <span>هشدار: {activePaperSheet.participation.tabSwitchCount} بار تعویض تب</span>
                </Badge>
              )}
            </div>

            {/* Questions Grading List */}
            <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-1">
              {(activePaperSheet?.questions || []).map((q: any, idx: number) => {
                const isDescriptive = q.type === 'DESCRIPTIVE';
                const ans = q.studentAnswer;

                return (
                  <Card key={q.questionId} className="p-4 border border-gray-200 bg-white space-y-3">
                    <div className="flex items-center justify-between border-b pb-2">
                      <div className="flex items-center space-x-2 space-x-reverse">
                        <span className="font-bold text-xs bg-gray-100 text-ink-dark px-2 py-0.5 rounded">
                          سوال {idx + 1}
                        </span>
                        <Badge variant={isDescriptive ? 'warning' : 'default'}>
                          {isDescriptive ? 'تشریحی' : 'تستی'}
                        </Badge>
                      </div>
                      <span className="text-xs font-bold text-primary">بارم: {q.score} نمره</span>
                    </div>

                    <h4 className="text-xs font-bold text-ink-darker whitespace-pre-wrap">{q.text}</h4>

                    {/* Multiple Choice Preview */}
                    {!isDescriptive && q.options && (
                      <div className="space-y-1.5 pt-1">
                        {q.options.map((opt: any) => {
                          const isStudentSelected = ans?.selectedOptionId === opt.id;
                          const isCorrect = opt.isCorrect;

                          return (
                            <div
                              key={opt.id}
                              className={`p-2.5 rounded-lg text-xs flex items-center justify-between border ${
                                isCorrect
                                  ? 'bg-emerald-50 border-emerald-300 text-emerald-800 font-bold'
                                  : isStudentSelected
                                  ? 'bg-rose-50 border-rose-300 text-rose-800'
                                  : 'bg-gray-50 border-gray-200 text-gray-600'
                              }`}
                            >
                              <div className="flex items-center space-x-2 space-x-reverse">
                                <div className={`h-4 w-4 rounded-full border flex items-center justify-center shrink-0 ${
                                  isStudentSelected ? (isCorrect ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white') : 'border-gray-300'
                                }`}>
                                  {isStudentSelected && (isCorrect ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />)}
                                </div>
                                <span>{opt.text}</span>
                              </div>
                              {isCorrect && (
                                <span className="text-[10px] text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">پاسخ صحیح</span>
                              )}
                              {isStudentSelected && !isCorrect && (
                                <span className="text-[10px] text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded">انتخاب نادرست</span>
                              )}
                            </div>
                          );
                        })}
                        <div className="text-[11px] text-gray-500 pt-1">
                          نمره تصحیح خودکار: <strong>{ans?.scoreAwarded ?? 0} از {q.score}</strong>
                        </div>
                      </div>
                    )}

                    {/* Descriptive Student Answer & Teacher Scoring Box */}
                    {isDescriptive && (
                      <div className="space-y-3 pt-2">
                        <div className="bg-gray-50 p-3 rounded-xl border border-gray-200">
                          <span className="text-[11px] font-bold text-gray-600 block mb-1">پاسخ تشریحی دانش‌آموز:</span>
                          <p className="text-xs text-ink-darker leading-relaxed whitespace-pre-wrap font-medium">
                            {ans?.descriptiveAnswer ? ans.descriptiveAnswer : 'دانش‌آموز پاسخی برای این سوال تایپ نکرده است.'}
                          </p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                          <div>
                            <label className="block text-[11px] font-bold text-ink-dark mb-1">نمره این سوال (از {q.score}):</label>
                            <Input
                              type="number"
                              min={0}
                              max={q.score}
                              step={0.25}
                              value={gradingForm.grades[q.questionId]?.scoreAwarded ?? 0}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                setGradingForm((prev) => ({
                                  ...prev,
                                  grades: {
                                    ...prev.grades,
                                    [q.questionId]: {
                                      ...prev.grades[q.questionId],
                                      scoreAwarded: val,
                                    },
                                  },
                                }));
                              }}
                              required
                            />
                          </div>

                          <div className="sm:col-span-2">
                            <label className="block text-[11px] font-bold text-ink-dark mb-1">کامنت و بازخورد سوال (اختیاری):</label>
                            <Input
                              placeholder="توضیح نقطه ضعف یا قوت پاسخ..."
                              value={gradingForm.grades[q.questionId]?.teacherComment || ''}
                              onChange={(e) => {
                                const val = e.target.value;
                                setGradingForm((prev) => ({
                                  ...prev,
                                  grades: {
                                    ...prev.grades,
                                    [q.questionId]: {
                                      ...prev.grades[q.questionId],
                                      teacherComment: val,
                                    },
                                  },
                                }));
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>

            {/* Grace Score Section (نمره ارفاقی مربی) */}
            <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/60 space-y-3">
              <div className="flex items-center space-x-2 space-x-reverse text-amber-800">
                <Sparkles className="h-4 w-4 text-amber-600" />
                <span className="font-bold text-xs">نمره ارفاقی مربی:</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-amber-900 mb-1">میزان نمره ارفاقی:</label>
                  <Input
                    type="number"
                    min={0}
                    max={activePaperSheet?.exam?.totalScore || 20}
                    step={0.25}
                    value={gradingForm.graceScore}
                    onChange={(e) => setGradingForm({ ...gradingForm, graceScore: Number(e.target.value) })}
                    placeholder="مثال: 1.5"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-medium text-amber-900 mb-1">علت نمره ارفاقی:</label>
                  <Input
                    value={gradingForm.graceReason}
                    onChange={(e) => setGradingForm({ ...gradingForm, graceReason: e.target.value })}
                    placeholder="مثال: فعالیت مستمر کلاسی و حل مسائل امتیازی..."
                  />
                </div>
              </div>
            </div>

            {/* Teacher Overall Feedback */}
            <div>
              <label className="block text-xs font-bold text-ink-dark mb-1">بازخورد و توصیه کلی برای کارنامه دانش‌آموز:</label>
              <textarea
                rows={2}
                value={gradingForm.teacherFeedback}
                onChange={(e) => setGradingForm({ ...gradingForm, teacherFeedback: e.target.value })}
                placeholder="پیام تشویقی یا نقاط قابل بهبود دانش‌آموز..."
                className="w-full rounded-xl border border-gray-300 bg-white p-2.5 text-xs text-ink-normal focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* Live Score Summary Footer */}
            <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-between">
              <div>
                <span className="text-xs text-gray-500 block">نمره نهایی محاسبه‌شده برگه:</span>
                <div className="text-2xl font-extrabold text-primary mt-0.5">
                  {calculateLiveScore()} <span className="text-xs font-normal text-gray-500">/ {activePaperSheet?.exam?.totalScore || 20} نمره</span>
                </div>
              </div>

              <div className="flex items-center space-x-2 space-x-reverse">
                <Button type="button" variant="ghost" onClick={() => setIsGradePaperModalOpen(false)}>
                  انصراف
                </Button>
                <Button type="submit" variant="primary" isLoading={isSavingGrading}>
                  ثبت نهایی تصحیح برگه
                </Button>
              </div>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};
