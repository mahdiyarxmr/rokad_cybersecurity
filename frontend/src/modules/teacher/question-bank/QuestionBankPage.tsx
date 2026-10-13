import React, { useEffect, useState } from 'react';
import { apiClient } from '../../../lib/api/client';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Badge } from '../../../components/ui/Badge';
import { Modal } from '../../../components/ui/Modal';
import { Skeleton } from '../../../components/ui/Skeleton';
import {
  HelpCircle,
  Plus,
  Search,
  Filter,
  Trash2,
  CheckCircle2,
  AlertCircle,
  FolderPlus,
  BookOpen,
  Clock,
  Award,
  Layers,
  Check,
  Eye,
  FileQuestion,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface QuestionCategory {
  id: string;
  name: string;
  lessonId: string;
  orderIndex: number;
}

interface QuestionOption {
  id?: string;
  text: string;
  formulaHtml?: string;
  imageUrl?: string;
  isCorrect: boolean;
  orderIndex: number;
}

interface Question {
  id: string;
  lessonId: string;
  categoryId?: string;
  type: 'MULTIPLE_CHOICE' | 'DESCRIPTIVE' | 'TRUE_FALSE' | 'FILL_IN_BLANK';
  difficulty: 'EASY' | 'MEDIUM' | 'HARD' | 'OLYMPIAD';
  text: string;
  formulaHtml?: string;
  imageUrls: string[];
  defaultScore: number;
  suggestedTimeSeconds: number;
  solutionExplanation?: string;
  category?: {
    id: string;
    name: string;
  };
  options: QuestionOption[];
}

export const QuestionBankPage: React.FC = () => {
  const [lessons, setLessons] = useState<any[]>([]);
  const [categories, setCategories] = useState<QuestionCategory[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [selectedLessonId, setSelectedLessonId] = useState<string>('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals
  const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [selectedQuestionForView, setSelectedQuestionForView] = useState<Question | null>(null);

  // Submitting States
  const [isSubmittingQuestion, setIsSubmittingQuestion] = useState(false);
  const [questionError, setQuestionError] = useState<string | null>(null);
  const [isSubmittingCat, setIsSubmittingCat] = useState(false);
  const [newCatName, setNewCatName] = useState('');

  // Expand explanation
  const [expandedSolutions, setExpandedSolutions] = useState<Record<string, boolean>>({});

  // Question Form State
  const [qForm, setQForm] = useState({
    lessonId: '',
    categoryId: '',
    type: 'MULTIPLE_CHOICE' as 'MULTIPLE_CHOICE' | 'DESCRIPTIVE' | 'TRUE_FALSE',
    difficulty: 'MEDIUM' as 'EASY' | 'MEDIUM' | 'HARD' | 'OLYMPIAD',
    text: '',
    formulaHtml: '',
    defaultScore: 1.0,
    suggestedTimeSeconds: 60,
    solutionExplanation: '',
    options: [
      { text: '', isCorrect: true },
      { text: '', isCorrect: false },
      { text: '', isCorrect: false },
      { text: '', isCorrect: false },
    ],
  });

  // Fetch initial lessons
  useEffect(() => {
    const fetchLessons = async () => {
      try {
        const res = await apiClient.get<any[]>('/classes/lessons');
        const items = res.data || res || [];
        setLessons(items);
        if (items.length > 0) {
          setSelectedLessonId(items[0].id);
          setQForm((prev) => ({ ...prev, lessonId: items[0].id }));
        }
      } catch (err) {
        console.error('Failed to load lessons:', err);
      }
    };
    fetchLessons();
  }, []);

  // Fetch categories when selectedLessonId changes
  useEffect(() => {
    if (!selectedLessonId) return;
    const fetchCategories = async () => {
      try {
        const res = await apiClient.get<QuestionCategory[]>('/question-bank/categories', {
          params: { lessonId: selectedLessonId },
        });
        setCategories(res.data || []);
      } catch (err) {
        console.error('Failed to load categories:', err);
      }
    };
    fetchCategories();
  }, [selectedLessonId]);

  // Fetch questions
  const fetchQuestions = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.get<Question[]>('/question-bank/questions', {
        params: {
          lessonId: selectedLessonId || undefined,
          categoryId: selectedCategoryId || undefined,
          difficulty: selectedDifficulty || undefined,
          type: selectedType || undefined,
          search: searchQuery || undefined,
        },
      });
      setQuestions(res.data || []);
    } catch (err) {
      console.error('Failed to load questions:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchQuestions();
  }, [selectedLessonId, selectedCategoryId, selectedDifficulty, selectedType, searchQuery]);

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim() || !selectedLessonId) return;

    setIsSubmittingCat(true);
    try {
      await apiClient.post('/question-bank/categories', {
        lessonId: selectedLessonId,
        name: newCatName.trim(),
        orderIndex: categories.length + 1,
      });
      setNewCatName('');
      // refresh categories
      const res = await apiClient.get<QuestionCategory[]>('/question-bank/categories', {
        params: { lessonId: selectedLessonId },
      });
      setCategories(res.data || []);
    } catch (err: any) {
      alert(err.response?.data?.message || 'خطا در ثبت سرفصل');
    } finally {
      setIsSubmittingCat(false);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!window.confirm('آیا از حذف این سرفصل اطمینان دارید؟')) return;
    try {
      await apiClient.delete(`/question-bank/categories/${id}`);
      setCategories((prev) => prev.filter((c) => c.id !== id));
      if (selectedCategoryId === id) setSelectedCategoryId('');
    } catch (err: any) {
      alert(err.response?.data?.message || 'خطا در حذف سرفصل');
    }
  };

  const handleOptionTextChange = (idx: number, text: string) => {
    setQForm((prev) => {
      const updated = [...prev.options];
      updated[idx].text = text;
      return { ...prev, options: updated };
    });
  };

  const handleCorrectOptionChange = (idx: number) => {
    setQForm((prev) => {
      const updated = prev.options.map((opt, i) => ({
        ...opt,
        isCorrect: i === idx,
      }));
      return { ...prev, options: updated };
    });
  };

  const handleCreateQuestionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!qForm.text.trim()) {
      setQuestionError('متن صورت سوال الزامی است');
      return;
    }

    if (qForm.type === 'MULTIPLE_CHOICE') {
      const validOptions = qForm.options.filter((o) => o.text.trim().length > 0);
      if (validOptions.length < 2) {
        setQuestionError('حداقل دو گزینه باید برای سوال چهارگزینه‌ای تکمیل گردد');
        return;
      }
      const hasCorrect = validOptions.some((o) => o.isCorrect);
      if (!hasCorrect) {
        setQuestionError('لطفاً یکی از گزینه‌ها را به عنوان گزینه صحیح تعیین فرمایید');
        return;
      }
    }

    setIsSubmittingQuestion(true);
    setQuestionError(null);

    try {
      const payload: any = {
        lessonId: qForm.lessonId || selectedLessonId,
        categoryId: qForm.categoryId || undefined,
        type: qForm.type,
        difficulty: qForm.difficulty,
        text: qForm.text.trim(),
        formulaHtml: qForm.formulaHtml.trim() || undefined,
        defaultScore: Number(qForm.defaultScore) || 1.0,
        suggestedTimeSeconds: Number(qForm.suggestedTimeSeconds) || 60,
        solutionExplanation: qForm.solutionExplanation.trim() || undefined,
      };

      if (qForm.type === 'MULTIPLE_CHOICE') {
        payload.options = qForm.options
          .filter((o) => o.text.trim().length > 0)
          .map((o, idx) => ({
            text: o.text.trim(),
            isCorrect: o.isCorrect,
            orderIndex: idx + 1,
          }));
      } else if (qForm.type === 'TRUE_FALSE') {
        payload.options = [
          { text: 'صحیح (درست)', isCorrect: qForm.options[0].isCorrect, orderIndex: 1 },
          { text: 'غلط (نادرست)', isCorrect: !qForm.options[0].isCorrect, orderIndex: 2 },
        ];
      }

      await apiClient.post('/question-bank/questions', payload);
      setIsQuestionModalOpen(false);
      setQForm({
        lessonId: selectedLessonId,
        categoryId: '',
        type: 'MULTIPLE_CHOICE',
        difficulty: 'MEDIUM',
        text: '',
        formulaHtml: '',
        defaultScore: 1.0,
        suggestedTimeSeconds: 60,
        solutionExplanation: '',
        options: [
          { text: '', isCorrect: true },
          { text: '', isCorrect: false },
          { text: '', isCorrect: false },
          { text: '', isCorrect: false },
        ],
      });
      await fetchQuestions();
    } catch (err: any) {
      setQuestionError(err.response?.data?.message || 'خطا در ثبت سوال');
    } finally {
      setIsSubmittingQuestion(false);
    }
  };

  const handleDeleteQuestion = async (id: string) => {
    if (!window.confirm('آیا از حذف این سوال از بانک سوالات اطمینان دارید؟')) return;
    try {
      await apiClient.delete(`/question-bank/questions/${id}`);
      await fetchQuestions();
    } catch (err: any) {
      alert(err.response?.data?.message || 'خطا در حذف سوال');
    }
  };

  const difficultyMeta: Record<
    string,
    { label: string; badgeVariant: 'success' | 'college' | 'warning' | 'destructive' }
  > = {
    EASY: { label: 'آسان', badgeVariant: 'success' },
    MEDIUM: { label: 'متوسط', badgeVariant: 'college' },
    HARD: { label: 'دشوار / چالشی', badgeVariant: 'warning' },
    OLYMPIAD: { label: 'سطح المپیاد و کنکور', badgeVariant: 'destructive' },
  };

  const typeLabelMap: Record<string, string> = {
    MULTIPLE_CHOICE: 'تستی چهارگزینه‌ای',
    DESCRIPTIVE: 'تشریحی و مسئله',
    TRUE_FALSE: 'صحیح / غلط',
    FILL_IN_BLANK: 'جای خالی',
  };

  const toggleSolution = (id: string) => {
    setExpandedSolutions((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4 bg-surface/40 p-3.5 sm:p-5 rounded-2xl border border-border/50 backdrop-blur-sm shadow-xs">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-600 shrink-0">
            <FileQuestion className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg md:text-xl font-bold text-foreground tracking-tight">
              بانک سوالات
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button
            variant="outline"
            onClick={() => setIsCategoryModalOpen(true)}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 text-xs h-9 sm:h-10"
          >
            <FolderPlus className="w-4 h-4" />
            <span>سرفصل‌ها</span>
          </Button>

          <Button
            onClick={() => {
              setQForm((prev) => ({ ...prev, lessonId: selectedLessonId }));
              setIsQuestionModalOpen(true);
            }}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 shadow-xs font-medium text-xs h-9 sm:h-10"
          >
            <Plus className="w-4 h-4" />
            <span>ثبت سوال جدید</span>
          </Button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-surface/30 p-4 rounded-xl border border-border/40 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
          {/* Lesson Select */}
          <div>
            <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
              درس مربوطه:
            </label>
            <select
              value={selectedLessonId}
              onChange={(e) => {
                setSelectedLessonId(e.target.value);
                setSelectedCategoryId('');
              }}
              className="w-full h-9 px-2.5 text-xs bg-surface/60 border border-border rounded-xl focus:ring-2 focus:ring-primary/20 outline-hidden font-medium"
            >
              {lessons.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>

          {/* Category Select */}
          <div>
            <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
              سرفصل / فصل:
            </label>
            <select
              value={selectedCategoryId}
              onChange={(e) => setSelectedCategoryId(e.target.value)}
              className="w-full h-9 px-2.5 text-xs bg-surface/60 border border-border rounded-xl focus:ring-2 focus:ring-primary/20 outline-hidden font-medium"
            >
              <option value="">همه سرفصل‌ها</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Difficulty Select */}
          <div>
            <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
              سطح دشواری:
            </label>
            <select
              value={selectedDifficulty}
              onChange={(e) => setSelectedDifficulty(e.target.value)}
              className="w-full h-9 px-2.5 text-xs bg-surface/60 border border-border rounded-xl focus:ring-2 focus:ring-primary/20 outline-hidden font-medium"
            >
              <option value="">همه سطوح</option>
              <option value="EASY">آسان</option>
              <option value="MEDIUM">متوسط</option>
              <option value="HARD">دشوار</option>
              <option value="OLYMPIAD">المپیاد و کنکور</option>
            </select>
          </div>

          {/* Type Select */}
          <div>
            <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
              نوع سوال:
            </label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full h-9 px-2.5 text-xs bg-surface/60 border border-border rounded-xl focus:ring-2 focus:ring-primary/20 outline-hidden font-medium"
            >
              <option value="">همه انواع</option>
              <option value="MULTIPLE_CHOICE">تستی چهارگزینه‌ای</option>
              <option value="DESCRIPTIVE">تشریحی و مسئله</option>
              <option value="TRUE_FALSE">صحیح / غلط</option>
            </select>
          </div>

          {/* Search */}
          <div>
            <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
              جستجو در متن سوال:
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-muted-foreground absolute right-2.5 top-3" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="کلمه کلیدی..."
                className="pr-8 h-9 text-xs"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Questions List */}
      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-32 rounded-2xl" />
          <Skeleton className="h-32 rounded-2xl" />
          <Skeleton className="h-32 rounded-2xl" />
        </div>
      ) : questions.length === 0 ? (
        <div className="text-center py-16 bg-surface/20 rounded-2xl border border-dashed border-border/60">
          <HelpCircle className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-40" />
          <h3 className="text-base font-semibold text-foreground">هیچ سوالی یافت نشد</h3>
          <p className="text-sm text-muted-foreground mt-1">
            با دکمه «ثبت سوال جدید» می‌توانید اولین سوال این مبحث را به بانک سوالات اضافه فرمایید.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {questions.map((q, idx) => {
            const diff = difficultyMeta[q.difficulty] || difficultyMeta.MEDIUM;
            const isSolutionOpen = !!expandedSolutions[q.id];

            return (
              <Card
                key={q.id}
                className="p-5 border border-border/60 hover:border-primary/40 transition-all shadow-xs"
              >
                <div className="space-y-3">
                  {/* Top Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/40 pb-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <Badge variant={diff.badgeVariant}>{diff.label}</Badge>
                      <Badge variant="college">{typeLabelMap[q.type] || q.type}</Badge>
                      {q.category && (
                        <Badge variant="neutral">
                          {q.category.name}
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Award className="w-3.5 h-3.5 text-amber-500" />
                        <span>بارم: {q.defaultScore} نمره</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-blue-500" />
                        <span>{q.suggestedTimeSeconds} ثانیه</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeleteQuestion(q.id)}
                        className="p-1.5 text-muted-foreground hover:text-destructive rounded-lg hover:bg-destructive/10"
                        title="حذف سوال"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Question Text */}
                  <div className="text-sm font-semibold text-foreground leading-relaxed pt-1 whitespace-pre-line">
                    {q.text}
                  </div>

                  {/* Options (if multiple choice or true/false) */}
                  {q.options && q.options.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                      {q.options.map((opt, oIdx) => (
                        <div
                          key={opt.id || oIdx}
                          className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs transition-all ${
                            opt.isCorrect
                              ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-bold'
                              : 'border-border/50 bg-surface/30 text-foreground/80'
                          }`}
                        >
                          <div
                            className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[11px] ${
                              opt.isCorrect
                                ? 'bg-emerald-600 text-white'
                                : 'bg-surface border border-border text-muted-foreground'
                            }`}
                          >
                            {opt.isCorrect ? <Check className="w-3 h-3 stroke-[3]" /> : oIdx + 1}
                          </div>
                          <span>{opt.text}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Solution Explanation Collapsible */}
                  {q.solutionExplanation && (
                    <div className="pt-2 border-t border-border/30">
                      <button
                        type="button"
                        onClick={() => toggleSolution(q.id)}
                        className="flex items-center gap-1 text-xs text-primary font-semibold hover:underline"
                      >
                        <span>{isSolutionOpen ? 'پنهان کردن پاسخ تشریحی' : 'مشاهده راهنمای حل تشریحی'}</span>
                        {isSolutionOpen ? (
                          <ChevronUp className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5" />
                        )}
                      </button>

                      {isSolutionOpen && (
                        <div className="mt-2 p-3 bg-primary/5 border border-primary/20 rounded-xl text-xs text-foreground/90 leading-relaxed animate-in fade-in duration-200">
                          <strong className="block text-primary mb-1">پاسخ تشریحی و راهبرد حل:</strong>
                          {q.solutionExplanation}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add Question Modal */}
      <Modal
        isOpen={isQuestionModalOpen}
        onClose={() => setIsQuestionModalOpen(false)}
        title="طراحی و ثبت سوال جدید در بانک سوالات"
        maxWidth="2xl"
      >
        <form onSubmit={handleCreateQuestionSubmit} className="space-y-4 pt-2">
          {questionError && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{questionError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">
                درس مربوطه *
              </label>
              <select
                value={qForm.lessonId}
                onChange={(e) => setQForm({ ...qForm, lessonId: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-surface/50 border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-hidden"
                required
              >
                {lessons.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">
                سرفصل موضوعی (اختیاری)
              </label>
              <select
                value={qForm.categoryId}
                onChange={(e) => setQForm({ ...qForm, categoryId: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-surface/50 border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-hidden"
              >
                <option value="">بدون سرفصل (مبحث کلی)</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">
                نوع سوال *
              </label>
              <select
                value={qForm.type}
                onChange={(e) => setQForm({ ...qForm, type: e.target.value as any })}
                className="w-full px-3 py-2 text-sm bg-surface/50 border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-hidden"
              >
                <option value="MULTIPLE_CHOICE">تستی چهارگزینه‌ای</option>
                <option value="DESCRIPTIVE">تشریحی و مسئله</option>
                <option value="TRUE_FALSE">صحیح / غلط</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">
                سطح دشواری *
              </label>
              <select
                value={qForm.difficulty}
                onChange={(e) => setQForm({ ...qForm, difficulty: e.target.value as any })}
                className="w-full px-3 py-2 text-sm bg-surface/50 border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-hidden"
              >
                <option value="EASY">آسان</option>
                <option value="MEDIUM">متوسط</option>
                <option value="HARD">دشوار</option>
                <option value="OLYMPIAD">المپیاد و کنکور</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">
              متن صورت سوال *
            </label>
            <textarea
              value={qForm.text}
              onChange={(e) => setQForm({ ...qForm, text: e.target.value })}
              placeholder="صورت سوال را به صورت کامل و دقیق بنویسید..."
              rows={3}
              className="w-full px-3 py-2 text-sm bg-surface/50 border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-hidden"
              required
            />
          </div>

          {/* Multiple choice options */}
          {qForm.type === 'MULTIPLE_CHOICE' && (
            <div className="space-y-2.5 pt-2 border-t border-border/40">
              <label className="block text-xs font-semibold text-foreground">
                گزینه‌های پاسخ (گزینه صحیح را علامت بزنید) *
              </label>

              {qForm.options.map((opt, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="correctOptionRadio"
                    checked={opt.isCorrect}
                    onChange={() => handleCorrectOptionChange(idx)}
                    className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                  />
                  <span className="text-xs text-muted-foreground w-6 font-bold">
                    {idx + 1})
                  </span>
                  <Input
                    value={opt.text}
                    onChange={(e) => handleOptionTextChange(idx, e.target.value)}
                    placeholder={`متن گزینه شماره ${idx + 1}`}
                    required={idx < 2}
                  />
                </div>
              ))}
            </div>
          )}

          {/* True / False */}
          {qForm.type === 'TRUE_FALSE' && (
            <div className="p-3 bg-surface/40 rounded-xl border border-border/40 space-y-2">
              <label className="block text-xs font-semibold text-foreground">
                پاسخ صحیح کدام است؟
              </label>
              <div className="flex items-center gap-4 text-xs">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="tfRadio"
                    checked={qForm.options[0].isCorrect}
                    onChange={() => handleCorrectOptionChange(0)}
                    className="w-4 h-4 text-emerald-600"
                  />
                  <span>صحیح (درست)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="tfRadio"
                    checked={!qForm.options[0].isCorrect}
                    onChange={() => handleCorrectOptionChange(1)}
                    className="w-4 h-4 text-emerald-600"
                  />
                  <span>غلط (نادرست)</span>
                </label>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">
                بارم پیشنهادی (نمره)
              </label>
              <Input
                type="number"
                step="0.25"
                min="0.25"
                value={qForm.defaultScore}
                onChange={(e) => setQForm({ ...qForm, defaultScore: Number(e.target.value) })}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">
                زمان پیشنهادی (ثانیه)
              </label>
              <Input
                type="number"
                min="10"
                value={qForm.suggestedTimeSeconds}
                onChange={(e) => setQForm({ ...qForm, suggestedTimeSeconds: Number(e.target.value) })}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">
              پاسخ تشریحی کامل و راهنمای حل (اختیاری)
            </label>
            <textarea
              value={qForm.solutionExplanation}
              onChange={(e) => setQForm({ ...qForm, solutionExplanation: e.target.value })}
              placeholder="نکات کلیدی، فرمول مورد استفاده و مراحل رسیدن به پاسخ صحیح..."
              rows={2}
              className="w-full px-3 py-2 text-sm bg-surface/50 border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-hidden"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-border/50">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsQuestionModalOpen(false)}
            >
              انصراف
            </Button>
            <Button type="submit" disabled={isSubmittingQuestion}>
              {isSubmittingQuestion ? 'در حال ثبت...' : 'ذخیره در بانک سوالات'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Category Management Modal */}
      <Modal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        title="مدیریت سرفصل‌های موضوعی"
        maxWidth="md"
      >
        <div className="space-y-4 pt-2">
          <form onSubmit={handleCreateCategory} className="flex gap-2">
            <Input
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              placeholder="نام سرفصل جدید (مثال: فصل ۳)"
              required
            />
            <Button type="submit" disabled={isSubmittingCat} className="shrink-0">
              <Plus className="w-4 h-4" />
              <span>افزودن</span>
            </Button>
          </form>

          <div className="space-y-2 max-h-60 overflow-y-auto">
            {categories.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">
                سرفصلی برای این درس تعریف نشده است.
              </p>
            ) : (
              categories.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between p-2.5 bg-surface/40 rounded-xl border border-border/40 text-xs"
                >
                  <span className="font-semibold text-foreground">{c.name}</span>
                  <button
                    type="button"
                    onClick={() => handleDeleteCategory(c.id)}
                    className="text-muted-foreground hover:text-destructive p-1 rounded-md"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
};
