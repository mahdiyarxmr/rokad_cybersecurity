import React, { useEffect, useState, useMemo } from 'react';
import { apiClient } from '../../../lib/api/client';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Badge } from '../../../components/ui/Badge';
import { Modal } from '../../../components/ui/Modal';
import { Skeleton } from '../../../components/ui/Skeleton';
import { PersianDatePicker } from '../../../components/ui/PersianDatePicker';
import {
  formatJalaliDisplay,
  jalaliToGregorianDate,
  gregorianToJalaliStr,
} from '../../../utils/jalali';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '../../../components/ui/Table';
import { MobileDataTable } from '../../../components/ui/MobileDataTable';
import { Select } from '../../../components/ui/Select';
import {
  GraduationCap,
  Calendar,
  Layers,
  BookOpen,
  Plus,
  CheckCircle,
  Building,
  AlertCircle,
  Edit3,
  Trash2,
  Check,
  X,
  Users,
  UserCheck,
  UserPlus,
  Search,
  ArrowRightLeft,
  Save,
  Filter,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { toast } from '../../../components/ui/toast/toast';
import { ResponsivePageHeader } from '@/components/ui/ResponsivePageHeader';

export const AcademicStructurePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'YEARS' | 'CLASSROOMS' | 'LESSONS'>('CLASSROOMS');
  const [academicYears, setAcademicYears] = useState<any[]>([]);
  const [classrooms, setClassrooms] = useState<any[]>([]);
  const [lessons, setLessons] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [levels, setLevels] = useState<any[]>([]);
  const [fields, setFields] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Classroom Students Management Modal State
  const [isClassStudentsModalOpen, setIsClassStudentsModalOpen] = useState(false);
  const [selectedClassForStudents, setSelectedClassForStudents] = useState<any | null>(null);
  const [allStudents, setAllStudents] = useState<any[]>([]);
  const [isLoadingClassStudents, setIsLoadingClassStudents] = useState(false);
  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  const [studentModalTab, setStudentModalTab] = useState<'MEMBERS' | 'ADD_STUDENT'>('MEMBERS');
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [expandedStudentIds, setExpandedStudentIds] = useState<Record<string, boolean>>({});
  const [studentEditForm, setStudentEditForm] = useState<{ gradeLevel: string; classroomId: string }>({
    gradeLevel: 'دهم',
    classroomId: '',
  });
  const [isSavingStudentTransfer, setIsSavingStudentTransfer] = useState(false);

  // Modals
  const [isYearModalOpen, setIsYearModalOpen] = useState(false);
  const [isEditYearModalOpen, setIsEditYearModalOpen] = useState(false);
  const [editingYearId, setEditingYearId] = useState<string | null>(null);
  const [deleteConfirmYear, setDeleteConfirmYear] = useState<any | null>(null);
  const [isDeletingYear, setIsDeletingYear] = useState(false);

  // Term management within edit year modal
  const [isAddingTerm, setIsAddingTerm] = useState(false);
  const [newTermForm, setNewTermForm] = useState({
    name: '',
    startDate: '',
    endDate: '',
    isCurrent: false,
  });
  const [editingTermId, setEditingTermId] = useState<string | null>(null);
  const [editTermForm, setEditTermForm] = useState({
    name: '',
    startDate: '',
    endDate: '',
    isCurrent: false,
  });

  const [isClassModalOpen, setIsClassModalOpen] = useState(false);
  const [isEditClassModalOpen, setIsEditClassModalOpen] = useState(false);
  const [editingClassId, setEditingClassId] = useState<string | null>(null);
  const [isLessonModalOpen, setIsLessonModalOpen] = useState(false);
  const [isEditLessonModalOpen, setIsEditLessonModalOpen] = useState(false);
  const [editingLessonId, setEditingLessonId] = useState<string | null>(null);
  const [deleteConfirmClass, setDeleteConfirmClass] = useState<any | null>(null);
  const [isDeletingClass, setIsDeletingClass] = useState(false);
  const [deleteConfirmLesson, setDeleteConfirmLesson] = useState<any | null>(null);
  const [isDeletingLesson, setIsDeletingLesson] = useState(false);

  // Forms
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [editClassForm, setEditClassForm] = useState({
    name: '',
    code: '',
    capacity: 30,
    academicYearId: '',
    levelId: '',
    fieldId: '',
    roomNumber: '',
  });

  const [yearForm, setYearForm] = useState({
    name: 'سال تحصیلی ۱۴۰۵-۱۴۰۶',
    startDate: '1405-07-01',
    endDate: '1406-03-31',
    isCurrent: false,
  });

  const [editYearForm, setEditYearForm] = useState({
    name: '',
    startDate: '',
    endDate: '',
    isCurrent: false,
    terms: [] as any[],
  });

  const [classForm, setClassForm] = useState({
    name: '',
    code: '',
    capacity: 30,
    academicYearId: '',
    levelId: '',
    fieldId: '',
    roomNumber: '',
  });

  const [lessonForm, setLessonForm] = useState({
    name: '',
    code: '',
    units: 3,
    levelId: '',
    fieldId: '',
    type: 'TECHNICAL_MODULAR_COMPETENCY',
    isModular: true,
    podmanCount: 5,
    podmanTitles: ['پودمان ۱', 'پودمان ۲', 'پودمان ۳', 'پودمان ۴', 'پودمان ۵'],
    teacherIds: [] as string[],
  });

  const [editLessonForm, setEditLessonForm] = useState({
    name: '',
    code: '',
    units: 3,
    levelId: '',
    fieldId: '',
    type: 'TECHNICAL_MODULAR_COMPETENCY',
    isModular: true,
    podmanCount: 5,
    podmanTitles: ['پودمان ۱', 'پودمان ۲', 'پودمان ۳', 'پودمان ۴', 'پودمان ۵'],
    teacherIds: [] as string[],
  });

  const [lessonFilterLevel, setLessonFilterLevel] = useState<string>('ALL');
  const [lessonFilterField, setLessonFilterField] = useState<string>('ALL');

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [yearsRes, classesRes, lessonsRes, teachersRes, levelsRes, fieldsRes] = await Promise.all([
        apiClient.get('/academic/years'),
        apiClient.get('/classes/classrooms'),
        apiClient.get('/classes/lessons'),
        apiClient.get('/members/teachers'),
        apiClient.get('/academic/levels'),
        apiClient.get('/academic/fields'),
      ]);

      setAcademicYears(yearsRes.data || []);
      setClassrooms(classesRes.data || []);
      setLessons(lessonsRes.data || []);
      setTeachers(teachersRes.data || []);
      setLevels(levelsRes.data || []);
      setFields(fieldsRes.data || []);

      const currentYear = yearsRes.data?.find((y: any) => y.isCurrent) || yearsRes.data?.[0];
      const defaultLevel = levelsRes.data?.[0];
      const matchingFields = fieldsRes.data?.filter((f: any) => f.levelId === defaultLevel?.id) || [];
      const defaultField = matchingFields[0] || fieldsRes.data?.[0];

      setClassForm((prev) => ({
        ...prev,
        academicYearId: currentYear?.id || '',
        levelId: prev.levelId || defaultLevel?.id || '',
        fieldId: prev.fieldId || defaultField?.id || '',
      }));

      setLessonForm((prev) => ({
        ...prev,
        levelId: prev.levelId || defaultLevel?.id || '',
        fieldId: prev.fieldId || defaultField?.id || '',
      }));
    } catch (err) {
      console.error('Failed to load academic data', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLevelChange = (lvlId: string) => {
    const matchingFields = fields.filter((f) => f.levelId === lvlId);
    setClassForm((prev) => ({
      ...prev,
      levelId: lvlId,
      fieldId: matchingFields[0]?.id || '',
    }));
  };

  const handleLessonLevelChange = (lvlId: string) => {
    const matchingFields = fields.filter((f) => f.levelId === lvlId);
    setLessonForm((prev) => ({
      ...prev,
      levelId: lvlId,
      fieldId: matchingFields[0]?.id || '',
    }));
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateYear = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      await apiClient.post('/academic/years', {
        ...yearForm,
        startDate: jalaliToGregorianDate(yearForm.startDate).toISOString(),
        endDate: jalaliToGregorianDate(yearForm.endDate).toISOString(),
      });
      toast.success('سال تحصیلی با موفقیت ثبت شد');
      setIsYearModalOpen(false);
      fetchData();
    } catch (err: any) {
      setError(err.message || 'خطا در ثبت سال تحصیلی.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenEditYear = (year: any) => {
    setEditingYearId(year.id);
    const startJalali = gregorianToJalaliStr(year.startDate);
    const endJalali = gregorianToJalaliStr(year.endDate);
    setEditYearForm({
      name: year.name || '',
      startDate: startJalali,
      endDate: endJalali,
      isCurrent: Boolean(year.isCurrent),
      terms: year.terms || [],
    });
    setNewTermForm({
      name: '',
      startDate: startJalali,
      endDate: endJalali,
      isCurrent: false,
    });
    setIsAddingTerm(false);
    setEditingTermId(null);
    setError(null);
    setIsEditYearModalOpen(true);
  };

  const handleUpdateYear = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingYearId) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await apiClient.patch(`/academic/years/${editingYearId}`, {
        name: editYearForm.name,
        startDate: jalaliToGregorianDate(editYearForm.startDate).toISOString(),
        endDate: jalaliToGregorianDate(editYearForm.endDate).toISOString(),
        isCurrent: editYearForm.isCurrent,
      });
      toast.success('سال تحصیلی با موفقیت ویرایش شد');
      setIsEditYearModalOpen(false);
      setEditingYearId(null);
      fetchData();
    } catch (err: any) {
      setError(err.message || 'خطا در ویرایش سال تحصیلی.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDeleteYear = async () => {
    if (!deleteConfirmYear) return;
    setIsDeletingYear(true);
    try {
      await apiClient.delete(`/academic/years/${deleteConfirmYear.id}`);
      toast.success('سال تحصیلی با موفقیت حذف شد');
      setAcademicYears((prev) => prev.filter((y) => y.id !== deleteConfirmYear.id));
      setDeleteConfirmYear(null);
      if (isEditYearModalOpen && editingYearId === deleteConfirmYear.id) {
        setIsEditYearModalOpen(false);
        setEditingYearId(null);
      }
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'خطا در حذف سال تحصیلی.');
    } finally {
      setIsDeletingYear(false);
    }
  };

  const handleCreateTerm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingYearId || !newTermForm.name) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await apiClient.post('/academic/terms', {
        academicYearId: editingYearId,
        name: newTermForm.name,
        startDate: jalaliToGregorianDate(newTermForm.startDate).toISOString(),
        endDate: jalaliToGregorianDate(newTermForm.endDate).toISOString(),
        isCurrent: newTermForm.isCurrent,
      });
      toast.success('نیم‌سال تحصیلی جدید با موفقیت اضافه شد');
      setEditYearForm((prev) => ({
        ...prev,
        terms: [...prev.terms, res.data],
      }));
      setNewTermForm({
        name: '',
        startDate: editYearForm.startDate,
        endDate: editYearForm.endDate,
        isCurrent: false,
      });
      setIsAddingTerm(false);
      fetchData();
    } catch (err: any) {
      setError(err.message || 'خطا در افزودن نیم‌سال تحصیلی.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartEditTerm = (term: any) => {
    setEditingTermId(term.id);
    setEditTermForm({
      name: term.name || '',
      startDate: gregorianToJalaliStr(term.startDate),
      endDate: gregorianToJalaliStr(term.endDate),
      isCurrent: Boolean(term.isCurrent),
    });
  };

  const handleSaveEditTerm = async (termId: string) => {
    try {
      const res = await apiClient.patch(`/academic/terms/${termId}`, {
        name: editTermForm.name,
        startDate: jalaliToGregorianDate(editTermForm.startDate).toISOString(),
        endDate: jalaliToGregorianDate(editTermForm.endDate).toISOString(),
        isCurrent: editTermForm.isCurrent,
      });
      toast.success('نیم‌سال تحصیلی به‌روزرسانی شد');
      setEditYearForm((prev) => ({
        ...prev,
        terms: prev.terms.map((t) => (t.id === termId ? res.data : editTermForm.isCurrent ? { ...t, isCurrent: false } : t)),
      }));
      setEditingTermId(null);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'خطا در ویرایش نیم‌سال تحصیلی.');
    }
  };

  const handleDeleteTerm = async (termId: string) => {
    if (!window.confirm('آیا از حذف این نیم‌سال تحصیلی اطمینان دارید؟')) return;
    try {
      await apiClient.delete(`/academic/terms/${termId}`);
      toast.success('نیم‌سال تحصیلی با موفقیت حذف شد');
      setEditYearForm((prev) => ({
        ...prev,
        terms: prev.terms.filter((t) => t.id !== termId),
      }));
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'خطا در حذف نیم‌سال تحصیلی.');
    }
  };

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      await apiClient.post('/classes/classrooms', classForm);
      setIsClassModalOpen(false);
      setClassForm((prev) => ({
        name: '',
        code: '',
        capacity: 30,
        roomNumber: '',
        academicYearId: prev.academicYearId,
        levelId: prev.levelId,
        fieldId: prev.fieldId,
      }));
      fetchData();
    } catch (err: any) {
      setError(err.message || 'خطا در ثبت کلاس درس.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenEditClass = (classroom: any) => {
    setEditingClassId(classroom.id);
    setEditClassForm({
      name: classroom.name || '',
      code: classroom.code || '',
      capacity: classroom.capacity || 30,
      academicYearId: classroom.academicYearId || '',
      levelId: classroom.levelId || '',
      fieldId: classroom.fieldId || '',
      roomNumber: classroom.roomNumber || '',
    });
    setError(null);
    setIsEditClassModalOpen(true);
  };

  const handleEditClassLevelChange = (lvlId: string) => {
    const matchingFields = fields.filter((f) => f.levelId === lvlId);
    setEditClassForm((prev) => ({
      ...prev,
      levelId: lvlId,
      fieldId: matchingFields[0]?.id || '',
    }));
  };

  const handleUpdateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClassId) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await apiClient.patch(`/classes/classrooms/${editingClassId}`, editClassForm);
      setIsEditClassModalOpen(false);
      setEditingClassId(null);
      fetchData();
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'خطا در ویرایش کلاس درس.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDeleteClass = async () => {
    if (!deleteConfirmClass) return;
    setIsDeletingClass(true);
    try {
      await apiClient.delete(`/classes/classrooms/${deleteConfirmClass.id}`);
      setClassrooms((prev) => prev.filter((c) => c.id !== deleteConfirmClass.id));
      toast.success('کلاس با موفقیت حذف شد.');
      setDeleteConfirmClass(null);
      if (isEditClassModalOpen && editingClassId === deleteConfirmClass.id) {
        setIsEditClassModalOpen(false);
        setEditingClassId(null);
      }
      fetchData();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err.message || 'خطا در حذف کلاس درس.');
    } finally {
      setIsDeletingClass(false);
    }
  };

  const handleCreateLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      await apiClient.post('/classes/lessons', {
        name: lessonForm.name,
        code: lessonForm.code,
        unitCount: Number(lessonForm.units) || 1,
        levelId: lessonForm.levelId || undefined,
        fieldId: lessonForm.fieldId && lessonForm.fieldId.trim() !== '' ? lessonForm.fieldId : undefined,
        type: lessonForm.type,
        isModular: lessonForm.isModular,
        podmanCount: lessonForm.isModular ? Number(lessonForm.podmanCount) || 5 : undefined,
        podmanTitles: lessonForm.isModular ? lessonForm.podmanTitles : undefined,
        teacherIds: lessonForm.teacherIds,
      });
      setIsLessonModalOpen(false);
      setLessonForm((prev) => ({
        ...prev,
        name: '',
        code: '',
        units: 3,
        type: 'TECHNICAL_MODULAR_COMPETENCY',
        isModular: true,
        podmanCount: 5,
        podmanTitles: ['پودمان ۱', 'پودمان ۲', 'پودمان ۳', 'پودمان ۴', 'پودمان ۵'],
        teacherIds: [],
      }));
      toast.success('درس با موفقیت ثبت شد.');
      fetchData();
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'خطا در ثبت درس.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenEditLesson = (lesson: any) => {
    setEditingLessonId(lesson.id);
    const isMod =
      lesson.isModular ??
      ['NON_TECHNICAL_COMPETENCY', 'BASIC_COMPETENCY', 'TECHNICAL_MODULAR_COMPETENCY'].includes(lesson.type);
    const titles = [0, 1, 2, 3, 4].map((idx) => {
      const existingP = lesson.podmans?.find((p: any) => p.number === idx + 1);
      return existingP?.title || `پودمان ${idx + 1}`;
    });

    const currentTeacherIds =
      lesson.teacherLessons?.map((tl: any) => tl.teacherId || tl.teacher?.id).filter(Boolean) || [];

    setEditLessonForm({
      name: lesson.name || '',
      code: lesson.code || '',
      units: lesson.unitCount || lesson.units || 1,
      levelId: lesson.levelId || '',
      fieldId: lesson.fieldId || '',
      type: lesson.type || 'GENERAL',
      isModular: isMod,
      podmanCount: 5,
      podmanTitles: titles,
      teacherIds: currentTeacherIds,
    });
    setError(null);
    setIsEditLessonModalOpen(true);
  };

  const handleEditLessonLevelChange = (lvlId: string) => {
    const matchingFields = fields.filter((f) => f.levelId === lvlId);
    setEditLessonForm((prev) => ({
      ...prev,
      levelId: lvlId,
      fieldId: matchingFields[0]?.id || '',
    }));
  };

  const handleUpdateLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLessonId) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await apiClient.patch(`/classes/lessons/${editingLessonId}`, {
        name: editLessonForm.name,
        code: editLessonForm.code,
        unitCount: Number(editLessonForm.units) || 1,
        levelId: editLessonForm.levelId || undefined,
        fieldId:
          editLessonForm.fieldId && editLessonForm.fieldId.trim() !== ''
            ? editLessonForm.fieldId
            : undefined,
        type: editLessonForm.type,
        isModular: editLessonForm.isModular,
        podmanCount: editLessonForm.isModular ? Number(editLessonForm.podmanCount) || 5 : undefined,
        podmanTitles: editLessonForm.isModular ? editLessonForm.podmanTitles : undefined,
        teacherIds: editLessonForm.teacherIds,
      });
      setIsEditLessonModalOpen(false);
      setEditingLessonId(null);
      toast.success('اطلاعات درس با موفقیت به‌روزرسانی شد.');
      fetchData();
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'خطا در ویرایش درس.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDeleteLesson = async () => {
    if (!deleteConfirmLesson) return;
    setIsDeletingLesson(true);
    try {
      await apiClient.delete(`/classes/lessons/${deleteConfirmLesson.id}`);
      setLessons((prev) => prev.filter((l) => l.id !== deleteConfirmLesson.id));
      toast.success('درس با موفقیت حذف شد.');
      setDeleteConfirmLesson(null);
      if (isEditLessonModalOpen && editingLessonId === deleteConfirmLesson.id) {
        setIsEditLessonModalOpen(false);
        setEditingLessonId(null);
      }
      fetchData();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err.message || 'خطا در حذف درس.');
    } finally {
      setIsDeletingLesson(false);
    }
  };

  // Classroom Students Handlers
  const handleOpenClassStudents = async (classroom: any) => {
    setSelectedClassForStudents(classroom);
    setIsClassStudentsModalOpen(true);
    setStudentModalTab('MEMBERS');
    setStudentSearchQuery('');
    setEditingStudentId(null);
    setIsLoadingClassStudents(true);
    try {
      const res = await apiClient.get('/members/students');
      setAllStudents(res.data || []);
    } catch (err: any) {
      toast.error('خطا در دریافت لیست دانش‌آموزان');
    } finally {
      setIsLoadingClassStudents(false);
    }
  };

  const handleStartEditStudent = (student: any) => {
    const enrolledClassId =
      student.enrollments?.[0]?.classroom?.id ||
      student.enrollments?.[0]?.classroomId ||
      selectedClassForStudents?.id ||
      '';
    const currentGrade =
      student.gradeLevel ||
      student.enrollments?.[0]?.classroom?.level?.name ||
      selectedClassForStudents?.level?.name ||
      'دهم';
    setStudentEditForm({
      gradeLevel: currentGrade,
      classroomId: enrolledClassId,
    });
    setEditingStudentId(student.id);
  };

  const handleSaveStudentChange = async (studentId: string) => {
    setIsSavingStudentTransfer(true);
    try {
      await apiClient.put(`/members/students/${studentId}`, {
        gradeLevel: studentEditForm.gradeLevel,
        classroomId: studentEditForm.classroomId,
      });
      toast.success('پایه و کلاس دانش‌آموز با موفقیت تغییر یافت.');
      const res = await apiClient.get('/members/students');
      setAllStudents(res.data || []);
      setEditingStudentId(null);
      fetchData();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err.message || 'خطا در ویرایش اطلاعات دانش‌آموز.');
    } finally {
      setIsSavingStudentTransfer(false);
    }
  };

  const handleQuickAssignStudentToClass = async (studentId: string) => {
    if (!selectedClassForStudents) return;
    setIsSavingStudentTransfer(true);
    try {
      await apiClient.put(`/members/students/${studentId}`, {
        gradeLevel: selectedClassForStudents.level?.name || 'دهم',
        classroomId: selectedClassForStudents.id,
      });
      toast.success('دانش‌آموز با موفقیت به این کلاس اضافه شد.');
      const res = await apiClient.get('/members/students');
      setAllStudents(res.data || []);
      fetchData();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err.message || 'خطا در انتساب دانش‌آموز به کلاس.');
    } finally {
      setIsSavingStudentTransfer(false);
    }
  };

  const classStudents = useMemo(() => {
    if (!selectedClassForStudents) return [];
    return allStudents.filter((s: any) =>
      s.enrollments?.some(
        (e: any) =>
          e.classroomId === selectedClassForStudents.id ||
          e.classroom?.id === selectedClassForStudents.id
      )
    );
  }, [allStudents, selectedClassForStudents]);

  const otherStudents = useMemo(() => {
    if (!selectedClassForStudents) return [];
    return allStudents.filter(
      (s: any) =>
        !s.enrollments?.some(
          (e: any) =>
            e.classroomId === selectedClassForStudents.id ||
            e.classroom?.id === selectedClassForStudents.id
        )
    );
  }, [allStudents, selectedClassForStudents]);

  const displayedStudents = useMemo(() => {
    const baseList = studentModalTab === 'MEMBERS' ? classStudents : otherStudents;
    if (!studentSearchQuery.trim()) return baseList;
    const q = studentSearchQuery.trim().toLowerCase();
    return baseList.filter((s: any) => {
      const fullName = `${s.user?.firstName || ''} ${s.user?.lastName || ''}`.toLowerCase();
      const nat = (s.nationalCode || s.user?.nationalId || '').toLowerCase();
      const sc = (s.studentCode || '').toLowerCase();
      const father = (s.fatherName || s.fatherFullName || '').toLowerCase();
      return fullName.includes(q) || nat.includes(q) || sc.includes(q) || father.includes(q);
    });
  }, [studentModalTab, classStudents, otherStudents, studentSearchQuery]);

  return (
    <div className="space-y-6">
      {/* Responsive Header */}
      <ResponsivePageHeader
        icon={GraduationCap}
        title="ساختار سال و کلاس‌ها"
        actions={
          <>
            {activeTab === 'YEARS' && (
              <Button variant="primary" onClick={() => setIsYearModalOpen(true)}>
                <Plus className="h-4 w-4 ml-1" />
                <span>ثبت سال تحصیلی جدید</span>
              </Button>
            )}
            {activeTab === 'CLASSROOMS' && (
              <Button variant="primary" onClick={() => setIsClassModalOpen(true)}>
                <Plus className="h-4 w-4 ml-1" />
                <span>ایجاد کلاس درس جدید</span>
              </Button>
            )}
            {activeTab === 'LESSONS' && (
              <Button variant="primary" onClick={() => setIsLessonModalOpen(true)}>
                <Plus className="h-4 w-4 ml-1" />
                <span>تعریف درس جدید</span>
              </Button>
            )}
          </>
        }
      />

      {/* Tabs (Responsive Swipeable) */}
      <div className="flex space-x-2 space-x-reverse border-b border-gray-200 overflow-x-auto scrollbar-none pb-1 min-w-0">
        <button
          onClick={() => setActiveTab('CLASSROOMS')}
          className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 flex items-center space-x-1.5 space-x-reverse whitespace-nowrap shrink-0 ${
            activeTab === 'CLASSROOMS'
              ? 'border-primary text-primary-dark'
              : 'border-transparent text-gray-500 hover:text-ink-dark'
          }`}
        >
          <Building className="h-4 w-4" />
          <span>کلاس‌های درس ({classrooms.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('YEARS')}
          className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 flex items-center space-x-1.5 space-x-reverse whitespace-nowrap shrink-0 ${
            activeTab === 'YEARS'
              ? 'border-primary text-primary-dark'
              : 'border-transparent text-gray-500 hover:text-ink-dark'
          }`}
        >
          <Calendar className="h-4 w-4" />
          <span>سال‌ها و نیم‌سال‌های تحصیلی ({academicYears.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('LESSONS')}
          className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 flex items-center space-x-1.5 space-x-reverse whitespace-nowrap shrink-0 ${
            activeTab === 'LESSONS'
              ? 'border-primary text-primary-dark'
              : 'border-transparent text-gray-500 hover:text-ink-dark'
          }`}
        >
          <BookOpen className="h-4 w-4" />
          <span>عناوین دروس ({lessons.length})</span>
        </button>
      </div>

      {/* Tab 1: Classrooms */}
      {activeTab === 'CLASSROOMS' && (
        <MobileDataTable
          items={classrooms}
          isLoading={isLoading}
          emptyMessage="هنوز کلاسی ثبت نشده است. از دکمه «ایجاد کلاس درس جدید» استفاده کنید."
          primaryField={(c) => (
            <div className="space-y-1">
              <div className="font-bold text-ink-darker text-sm">{c.name}</div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-mono text-[11px] bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded">{c.code}</span>
                {c.roomNumber && <span className="text-[11px] text-gray-400">{c.roomNumber}</span>}
              </div>
            </div>
          )}
          secondaryField={(c) => (
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenClassStudents(c);
                }}
                className="p-2 rounded-xl text-primary hover:text-white hover:bg-primary dark:text-primary-light bg-primary/10 dark:bg-primary/20 border border-primary/20 hover:border-primary transition-all shrink-0 cursor-pointer shadow-2xs"
                title="دانش‌آموزان کلاس"
              >
                <Users className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenEditClass(c);
                }}
                className="p-2 rounded-xl text-blue-500 hover:text-white hover:bg-blue-500 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 hover:border-blue-500 transition-all shrink-0 cursor-pointer shadow-2xs"
                title="ویرایش کلاس"
              >
                <Edit3 className="w-4 h-4" />
              </button>
            </div>
          )}
          columns={[
            {
              header: 'نام کلاس',
              cell: (c) => (
                <div>
                  <div className="font-bold text-ink-darker">{c.name}</div>
                  {c.roomNumber && <div className="text-[11px] text-gray-400">{c.roomNumber}</div>}
                </div>
              ),
            },
            {
              header: 'کد کلاسی',
              cell: (c) => <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">{c.code}</span>,
            },
            {
              header: 'پایه تحصیلی',
              mobilePriority: 'secondary',
              cell: (c) => (
                <Badge variant="default" className="font-bold">
                  پایه {c.level?.name || 'دهم'}
                </Badge>
              ),
            },
            {
              header: 'رشته تحصیلی',
              mobilePriority: 'secondary',
              cell: (c) => (
                <Badge variant="college" className="font-bold">
                  {c.field?.name || 'شبکه و نرم‌افزار رایانه'}
                </Badge>
              ),
            },
            {
              header: 'سال تحصیلی',
              mobilePriority: 'secondary',
              cell: (c) => {
                const yearName =
                  c.academicYear?.name ||
                  academicYears.find((y) => y.id === c.academicYearId)?.name ||
                  academicYears.find((y) => y.isCurrent)?.name ||
                  academicYears[0]?.name ||
                  '۱۴۰۵-۱۴۰۶';
                return <span className="text-xs text-gray-600">{yearName}</span>;
              },
            },
            {
              header: 'تعداد دانش‌آموزان',
              mobileDetail: true,
              cell: (c) => (
                <span className="font-bold text-ink-darker">
                  {c._count?.enrollments || c._count?.students || 0} دانش‌آموز
                </span>
              ),
            },
            {
              header: 'ظرفیت کلاس',
              mobileDetail: true,
              cell: (c) => <span className="text-xs text-gray-500">{c.capacity || 30} نفر</span>,
            },
            {
              header: 'وضعیت',
              mobileDetail: true,
              cell: () => <Badge variant="success">فعال</Badge>,
            },
            {
              header: 'عملیات',
              className: 'text-center w-28',
              mobilePriority: 'hidden',
              cell: (c) => (
                <div className="flex items-center justify-center gap-1.5">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenClassStudents(c);
                    }}
                    className="p-2 rounded-xl text-primary hover:text-white hover:bg-primary dark:text-primary-light bg-primary/10 dark:bg-primary/20 border border-primary/20 hover:border-primary transition-all cursor-pointer shadow-2xs"
                    title="دانش‌آموزان کلاس"
                  >
                    <Users className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenEditClass(c);
                    }}
                    className="p-2 rounded-xl text-blue-500 hover:text-white hover:bg-blue-500 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 hover:border-blue-500 transition-all cursor-pointer shadow-2xs"
                    title="ویرایش کلاس"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                </div>
              ),
            },
          ]}
        />
      )}

      {/* Tab 2: Academic Years */}
      {activeTab === 'YEARS' && (
        <MobileDataTable
          items={academicYears}
          isLoading={isLoading}
          emptyMessage="سال تحصیلی یافت نشد."
          primaryField={(y) => (
            <div>
              <div className="font-bold text-ink-darker text-sm">{y.name}</div>
              <div className="text-xs text-gray-500 mt-0.5">
                از {formatJalaliDisplay(y.startDate)} تا {formatJalaliDisplay(y.endDate)}
              </div>
            </div>
          )}
          secondaryField={(y) => (
            <div className="flex items-center justify-between gap-2 flex-wrap w-full">
              <div>
                {y.isCurrent ? <Badge variant="success">سال جاری</Badge> : <Badge variant="neutral">گذشته</Badge>}
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenEditYear(y);
                }}
                className="p-2 rounded-xl text-blue-500 hover:text-white hover:bg-blue-500 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 hover:border-blue-500 transition-all cursor-pointer shadow-2xs shrink-0"
                title="ویرایش سال تحصیلی"
              >
                <Edit3 className="w-4 h-4" />
              </button>
            </div>
          )}
          columns={[
            {
              header: 'عنوان سال تحصیلی',
              cell: (y) => <div className="font-bold text-ink-darker">{y.name}</div>,
            },
            {
              header: 'تاریخ شروع',
              cell: (y) => <span className="text-xs font-medium text-gray-700">{formatJalaliDisplay(y.startDate)}</span>,
            },
            {
              header: 'تاریخ پایان',
              cell: (y) => <span className="text-xs font-medium text-gray-700">{formatJalaliDisplay(y.endDate)}</span>,
            },
            {
              header: 'نیم‌سال‌ها',
              cell: (y) => (
                <div className="flex gap-1.5 flex-wrap items-center">
                  {y.terms && y.terms.length > 0 ? (
                    y.terms.map((t: any) => (
                      <span
                        key={t.id}
                        className={`text-[11px] px-2 py-0.5 rounded-lg font-bold border ${
                          t.isCurrent
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800'
                            : 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700'
                        }`}
                      >
                        {t.name} {t.isCurrent ? '(جاری)' : ''}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-gray-400">بدون نیم‌سال</span>
                  )}
                </div>
              ),
              mobileDetail: true,
            },
            {
              header: 'وضعیت جاری',
              cell: (y) => (
                y.isCurrent ? <Badge variant="success">سال جاری</Badge> : <Badge variant="neutral">گذشته</Badge>
              ),
            },
            {
              header: 'عملیات',
              mobilePriority: 'hidden',
              cell: (y) => (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenEditYear(y);
                  }}
                  className="p-2 rounded-xl text-blue-500 hover:text-white hover:bg-blue-500 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 hover:border-blue-500 transition-all cursor-pointer shadow-2xs"
                  title="ویرایش سال تحصیلی"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
              ),
            },
          ]}
        />
      )}

      {/* Tab 3: Lessons */}
      {activeTab === 'LESSONS' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-xs">
            <div className="grid grid-cols-1 sm:flex sm:items-center gap-2.5 w-full sm:w-auto">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-ink-dark shrink-0">پایه:</span>
                <select
                  value={lessonFilterLevel}
                  onChange={(e) => {
                    setLessonFilterLevel(e.target.value);
                    setLessonFilterField('ALL');
                  }}
                  className="h-9 w-full sm:w-auto rounded-lg border border-gray-200 bg-gray-50 px-2.5 text-xs font-medium text-ink-dark focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="ALL">همه پایه‌ها</option>
                  {levels.map((lvl) => (
                    <option key={lvl.id} value={lvl.id}>
                      پایه {lvl.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-ink-dark shrink-0">رشته:</span>
                <select
                  value={lessonFilterField}
                  onChange={(e) => setLessonFilterField(e.target.value)}
                  className="h-9 w-full sm:w-auto rounded-lg border border-gray-200 bg-gray-50 px-2.5 text-xs font-medium text-ink-dark focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="ALL">همه رشته‌ها</option>
                  {(lessonFilterLevel === 'ALL'
                    ? fields
                    : fields.filter((f) => f.levelId === lessonFilterLevel)
                  ).map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="text-xs text-gray-500 font-medium">
              تعداد دروس نمایش‌داده‌شده:{' '}
              <span className="font-bold text-primary">
                {
                  lessons.filter((l) => {
                    if (lessonFilterLevel !== 'ALL' && l.levelId !== lessonFilterLevel) return false;
                    if (lessonFilterField !== 'ALL' && l.fieldId !== lessonFilterField) return false;
                    return true;
                  }).length
                }
              </span>
            </div>
          </div>

          <MobileDataTable
            items={lessons.filter((l) => {
              if (lessonFilterLevel !== 'ALL' && l.levelId !== lessonFilterLevel) return false;
              if (lessonFilterField !== 'ALL' && l.fieldId !== lessonFilterField) return false;
              return true;
            })}
            isLoading={isLoading}
            emptyMessage="درسی برای این فیلتر یافت نشد."
            primaryField={(l) => (
              <div>
                <div className="font-bold text-ink-darker text-sm">{l.name}</div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="font-mono text-[11px] bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded">{l.code}</span>
                  <span className="text-xs text-gray-500">{l.unitCount || l.units || 1} واحد</span>
                </div>
              </div>
            )}
            secondaryField={(l) => (
              <div className="flex items-center justify-between gap-1 flex-wrap w-full">
                <div className="flex items-center gap-1 flex-wrap">
                  {l.level?.name && <Badge variant="default" className="text-[11px]">پایه {l.level.name}</Badge>}
                  {l.field?.name ? (
                    <Badge variant="college" className="text-[11px]">{l.field.name}</Badge>
                  ) : (
                    <Badge variant="neutral" className="text-[11px]">عمومی</Badge>
                  )}
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenEditLesson(l);
                  }}
                  className="p-2 rounded-xl text-blue-500 hover:text-white hover:bg-blue-500 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 hover:border-blue-500 transition-all shrink-0 cursor-pointer shadow-2xs"
                  title="ویرایش درس"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
              </div>
            )}
            columns={[
              {
                header: 'نام درس',
                cell: (l) => <span className="font-bold text-ink-darker">{l.name}</span>,
              },
              {
                header: 'کد درس',
                cell: (l) => <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">{l.code}</span>,
              },
              {
                header: 'پایه تحصیلی',
                cell: (l) => (
                  l.level?.name ? (
                    <Badge variant="default">پایه {l.level.name}</Badge>
                  ) : (
                    <Badge variant="neutral">پایه نامشخص</Badge>
                  )
                ),
              },
              {
                header: 'رشته تحصیلی',
                cell: (l) => (
                  l.field?.name ? (
                    <Badge variant="college">{l.field.name}</Badge>
                  ) : (
                    <Badge variant="neutral">عمومی (مشترک)</Badge>
                  )
                ),
              },
              {
                header: 'مربیان مدرس',
                cell: (l) => (
                  l.teacherLessons && l.teacherLessons.length > 0 ? (
                    <div className="flex flex-wrap gap-1 max-w-xs">
                      {l.teacherLessons.map((tl: any) => (
                        <span
                          key={tl.id}
                          className="text-[11px] bg-blue-50 text-blue-800 font-medium px-2 py-0.5 rounded border border-blue-200"
                        >
                          {tl.teacher?.user?.firstName} {tl.teacher?.user?.lastName}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-xs text-gray-400">بدون مربی</span>
                  )
                ),
                mobileDetail: true,
              },
              {
                header: 'نوع درس',
                cell: (l) => {
                  switch (l.type) {
                    case 'NON_TECHNICAL_COMPETENCY':
                      return <span className="text-xs font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-lg border border-purple-200">شایستگی‌های غیرفنی (پودمانی)</span>;
                    case 'BASIC_COMPETENCY':
                      return <span className="text-xs font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-200">شایستگی‌های پایه (پودمانی)</span>;
                    case 'TECHNICAL_MODULAR_COMPETENCY':
                      return <span className="text-xs font-semibold text-purple-800 bg-purple-100 px-2 py-0.5 rounded-lg border border-purple-300">شایستگی‌های فنی / پودمانی</span>;
                    case 'TECHNICAL_PRACTICAL_COMPETENCY':
                      return <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200">شایستگی‌های فنی / عملی</span>;
                    case 'SPECIALIZED':
                      return <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-200">تخصصی</span>;
                    case 'PRACTICAL':
                      return <span className="text-xs font-semibold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-lg border border-teal-200">کارگاهی</span>;
                    case 'OPTIONAL':
                      return <span className="text-xs font-semibold text-gray-700 bg-gray-100 px-2 py-0.5 rounded-lg">انتخابی</span>;
                    case 'EXTRACURRICULAR':
                      return <span className="text-xs font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-lg border border-rose-200">فوق‌برنامه (ترمی)</span>;
                    default:
                      return <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">عمومی</span>;
                  }
                },
                mobileDetail: true,
              },
              {
                header: 'تعداد واحد',
                cell: (l) => <span className="text-xs font-bold text-ink-dark">{l.unitCount || l.units || 1} واحد</span>,
                mobileDetail: true,
              },
              {
                header: 'تعداد سرفصل‌ها',
                cell: (l) => (
                  <span className="text-xs text-gray-500">
                    {l.isModular
                      ? `${l.podmanCount || l.podmans?.length || 5} پودمان`
                      : `${l._count?.lessonPlans || l._count?.topics || 0} مبحث`}
                  </span>
                ),
                mobileDetail: true,
              },
              {
                header: 'وضعیت',
                cell: () => <Badge variant="default">فعال</Badge>,
              },
              {
                header: 'عملیات',
                mobilePriority: 'hidden',
                cell: (l) => (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenEditLesson(l);
                    }}
                    className="p-2 rounded-xl text-blue-500 hover:text-white hover:bg-blue-500 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 hover:border-blue-500 transition-all cursor-pointer shadow-2xs"
                    title="ویرایش درس"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                ),
              },
            ]}
          />
        </div>
      )}

      {/* 1. Modal: Create Academic Year */}
      <Modal
        isOpen={isYearModalOpen}
        onClose={() => {
          setIsYearModalOpen(false);
          setError(null);
        }}
        title="تعریف سال تحصیلی جدید"
        description="ایجاد سال تحصیلی و ساخت خودکار نیم‌سال اول و دوم"
        maxWidth="md"
      >
        {error && (
          <div className="mb-4 flex items-center space-x-2 space-x-reverse rounded-lg bg-red-50 p-3 text-xs text-red-700 border border-red-200">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleCreateYear} className="space-y-4">
          <Input
            label="عنوان سال تحصیلی"
            placeholder="مثال: سال تحصیلی ۱۴۰۵-۱۴۰۶"
            value={yearForm.name}
            onChange={(e) => setYearForm({ ...yearForm, name: e.target.value })}
            required
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <PersianDatePicker
              label="تاریخ شروع (شمسی)"
              value={yearForm.startDate}
              onChange={(date) => setYearForm({ ...yearForm, startDate: date })}
            />
            <PersianDatePicker
              label="تاریخ پایان (شمسی)"
              value={yearForm.endDate}
              onChange={(date) => setYearForm({ ...yearForm, endDate: date })}
            />
          </div>

          <div className="flex justify-end space-x-2 space-x-reverse pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setIsYearModalOpen(false);
                setError(null);
              }}
            >
              انصراف
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              ثبت سال تحصیلی
            </Button>
          </div>
        </form>
      </Modal>

      {/* 1.5 Modal: Edit Academic Year & Semesters */}
      <Modal
        isOpen={isEditYearModalOpen}
        onClose={() => {
          setIsEditYearModalOpen(false);
          setEditingYearId(null);
          setIsAddingTerm(false);
          setEditingTermId(null);
          setError(null);
        }}
        title="ویرایش سال تحصیلی"
        maxWidth="md"
      >
        {error && (
          <div className="mb-4 flex items-center space-x-2 space-x-reverse rounded-lg bg-red-50 p-3 text-xs text-red-700 border border-red-200">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="space-y-4">
          <Input
            label="عنوان سال تحصیلی"
            placeholder="مثال: سال تحصیلی ۱۴۰۵-۱۴۰۶"
            value={editYearForm.name}
            onChange={(e) => setEditYearForm({ ...editYearForm, name: e.target.value })}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <PersianDatePicker
              label="تاریخ شروع"
              value={editYearForm.startDate}
              onChange={(date) => setEditYearForm({ ...editYearForm, startDate: date })}
            />
            <PersianDatePicker
              label="تاریخ پایان"
              value={editYearForm.endDate}
              onChange={(date) => setEditYearForm({ ...editYearForm, endDate: date })}
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer pt-1">
            <input
              type="checkbox"
              id="editYearIsCurrent"
              checked={editYearForm.isCurrent}
              onChange={(e) => setEditYearForm({ ...editYearForm, isCurrent: e.target.checked })}
              className="w-4 h-4 text-primary rounded border-gray-300 focus:ring-primary cursor-pointer"
            />
            <span className="text-xs font-bold text-ink-dark dark:text-gray-300">
              سال تحصیلی جاری
            </span>
          </label>

          {/* Semesters */}
          <div className="pt-3 border-t border-gray-100 dark:border-gray-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-ink-darker dark:text-white">
                نیم‌سال‌های تحصیلی
              </span>
              {!isAddingTerm && (
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingTerm(true);
                    setNewTermForm({
                      name: '',
                      startDate: editYearForm.startDate,
                      endDate: editYearForm.endDate,
                      isCurrent: false,
                    });
                  }}
                  className="text-xs font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>افزودن نیم‌سال</span>
                </button>
              )}
            </div>

            {/* Add Term Form */}
            {isAddingTerm && (
              <div className="p-3 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl space-y-2.5">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <Input
                    placeholder="نام نیم‌سال (مثال: نیم‌سال اول)"
                    value={newTermForm.name}
                    onChange={(e) => setNewTermForm({ ...newTermForm, name: e.target.value })}
                  />
                  <PersianDatePicker
                    value={newTermForm.startDate}
                    onChange={(date) => setNewTermForm({ ...newTermForm, startDate: date })}
                  />
                  <PersianDatePicker
                    value={newTermForm.endDate}
                    onChange={(date) => setNewTermForm({ ...newTermForm, endDate: date })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newTermForm.isCurrent}
                      onChange={(e) => setNewTermForm({ ...newTermForm, isCurrent: e.target.checked })}
                      className="w-3.5 h-3.5 text-primary rounded"
                    />
                    <span className="text-[11px] text-gray-600 dark:text-gray-300">نیم‌سال جاری</span>
                  </label>
                  <div className="flex items-center gap-1.5">
                    <Button type="button" variant="ghost" size="sm" onClick={() => setIsAddingTerm(false)} className="h-7 text-xs px-2">
                      انصراف
                    </Button>
                    <Button type="button" variant="primary" size="sm" isLoading={isSubmitting} onClick={handleCreateTerm} className="h-7 text-xs px-3 font-bold">
                      افزودن
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Terms List */}
            <div className="space-y-1.5">
              {editYearForm.terms && editYearForm.terms.length > 0 ? (
                editYearForm.terms.map((term: any) => {
                  const isEditingThis = editingTermId === term.id;
                  if (isEditingThis) {
                    return (
                      <div key={term.id} className="p-2.5 bg-blue-50/50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl space-y-2">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <Input
                            value={editTermForm.name}
                            onChange={(e) => setEditTermForm({ ...editTermForm, name: e.target.value })}
                          />
                          <PersianDatePicker
                            value={editTermForm.startDate}
                            onChange={(date) => setEditTermForm({ ...editTermForm, startDate: date })}
                          />
                          <PersianDatePicker
                            value={editTermForm.endDate}
                            onChange={(date) => setEditTermForm({ ...editTermForm, endDate: date })}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                            <input
                              type="checkbox"
                              checked={editTermForm.isCurrent}
                              onChange={(e) => setEditTermForm({ ...editTermForm, isCurrent: e.target.checked })}
                              className="w-3.5 h-3.5 text-primary rounded"
                            />
                            <span className="text-[11px] text-gray-600 dark:text-gray-300">نیم‌سال جاری</span>
                          </label>
                          <div className="flex items-center gap-1">
                            <Button type="button" variant="ghost" size="sm" onClick={() => setEditingTermId(null)} className="h-7 text-xs px-2">
                              انصراف
                            </Button>
                            <Button type="button" variant="primary" size="sm" onClick={() => handleSaveEditTerm(term.id)} className="h-7 text-xs px-3 font-bold">
                              ذخیره
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={term.id}
                      className="p-2.5 bg-gray-50/80 dark:bg-gray-800/40 border border-gray-200/60 dark:border-gray-700/60 rounded-xl flex items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-xs text-ink-darker dark:text-white">
                          {term.name}
                        </span>
                        {term.isCurrent && (
                          <Badge variant="success" className="text-[10px] py-0 px-1.5">جاری</Badge>
                        )}
                        <span className="text-[11px] text-gray-500">
                          ({formatJalaliDisplay(term.startDate)} تا {formatJalaliDisplay(term.endDate)})
                        </span>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleStartEditTerm(term)}
                          className="p-1 text-gray-500 hover:text-blue-600 transition-colors cursor-pointer"
                          title="ویرایش نیم‌سال"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteTerm(term.id)}
                          className="p-1 text-gray-400 hover:text-rose-600 transition-colors cursor-pointer"
                          title="حذف نیم‌سال"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-2 text-xs text-gray-400">
                  نیم‌سالی ثبت نشده است
                </div>
              )}
            </div>
          </div>

          {/* Modal Footer */}
          <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-800">
            <button
              type="button"
              onClick={() => {
                setIsEditYearModalOpen(false);
                setDeleteConfirmYear({ id: editingYearId, name: editYearForm.name });
              }}
              className="p-2 rounded-xl text-rose-500 hover:text-white hover:bg-rose-500 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 hover:border-rose-500 transition-all cursor-pointer shadow-2xs shrink-0"
              title="حذف سال تحصیلی"
              aria-label="حذف سال تحصیلی"
            >
              <Trash2 className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setIsEditYearModalOpen(false);
                  setEditingYearId(null);
                }}
                className="h-9 px-3.5 text-xs"
              >
                انصراف
              </Button>
              <Button
                type="button"
                variant="primary"
                isLoading={isSubmitting}
                onClick={handleUpdateYear}
                className="h-9 px-4 text-xs font-bold"
              >
                ذخیره تغییرات
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      {/* 2. Modal: Create Classroom */}
      <Modal
        isOpen={isClassModalOpen}
        onClose={() => {
          setIsClassModalOpen(false);
          setError(null);
        }}
        title="ایجاد کلاس درس جدید"
        description="تعریف کلاس آموزشی برای سال تحصیلی جاری"
        maxWidth="md"
      >
        {error && (
          <div className="mb-4 flex items-center space-x-2 space-x-reverse rounded-lg bg-red-50 p-3 text-xs text-red-700 border border-red-200">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleCreateClass} className="space-y-3.5">
          <Input
            label="نام کلاس"
            placeholder="مثال: کلاس دهم ریاضی ۱"
            value={classForm.name}
            onChange={(e) => setClassForm({ ...classForm, name: e.target.value })}
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="کد یکتای کلاس"
              placeholder="مثال: CLS-10-M1"
              value={classForm.code}
              onChange={(e) => setClassForm({ ...classForm, code: e.target.value })}
              required
            />
            <Input
              label="ظرفیت دانش‌آموزان"
              type="number"
              value={classForm.capacity}
              onChange={(e) => setClassForm({ ...classForm, capacity: Number(e.target.value) })}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="w-full text-right space-y-1.5">
              <label className="block text-xs sm:text-[13px] font-bold text-ink-normal/80 dark:text-gray-300 text-right">
                پایه تحصیلی <span className="text-red-500">*</span>
              </label>
              <select
                value={classForm.levelId}
                onChange={(e) => handleLevelChange(e.target.value)}
                className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-[#FAFAFA] dark:bg-[#1C2536] text-ink-normal dark:text-white text-xs sm:text-sm font-medium focus:border-primary focus:bg-white dark:focus:bg-[#1C2536] focus:outline-none transition-all cursor-pointer"
                required
              >
                {levels.map((lvl) => (
                  <option key={lvl.id} value={lvl.id}>
                    پایه {lvl.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="w-full text-right space-y-1.5">
              <label className="block text-xs sm:text-[13px] font-bold text-ink-normal/80 dark:text-gray-300 text-right">
                رشته تحصیلی <span className="text-red-500">*</span>
              </label>
              <select
                value={classForm.fieldId}
                onChange={(e) => setClassForm({ ...classForm, fieldId: e.target.value })}
                className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-[#FAFAFA] dark:bg-[#1C2536] text-ink-normal dark:text-white text-xs sm:text-sm font-medium focus:border-primary focus:bg-white dark:focus:bg-[#1C2536] focus:outline-none transition-all cursor-pointer"
                required
              >
                {(fields.filter((f) => f.levelId === classForm.levelId).length > 0
                  ? fields.filter((f) => f.levelId === classForm.levelId)
                  : fields
                ).map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="w-full text-right space-y-1.5">
              <label className="block text-xs sm:text-[13px] font-bold text-ink-normal/80 dark:text-gray-300 text-right">
                سال تحصیلی
              </label>
              <select
                value={classForm.academicYearId}
                onChange={(e) => setClassForm({ ...classForm, academicYearId: e.target.value })}
                className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-[#FAFAFA] dark:bg-[#1C2536] text-ink-normal dark:text-white text-xs sm:text-sm font-medium focus:border-primary focus:bg-white dark:focus:bg-[#1C2536] focus:outline-none transition-all cursor-pointer"
              >
                {academicYears.map((y) => (
                  <option key={y.id} value={y.id}>
                    {y.name} {y.isCurrent ? '(جاری)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <Input
              label="نام کلاس (اختیاری)"
              placeholder="مثال: ۱۰۱ یا کارگاه ۱"
              value={classForm.roomNumber}
              onChange={(e) => setClassForm({ ...classForm, roomNumber: e.target.value })}
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100 dark:border-gray-800">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setIsClassModalOpen(false);
                setError(null);
              }}
              className="h-10 px-4 text-xs sm:text-sm"
            >
              انصراف
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting} className="h-10 px-5 text-xs sm:text-sm font-bold">
              ایجاد کلاس
            </Button>
          </div>
        </form>
      </Modal>

      {/* 2.5 Modal: Edit Classroom */}
      <Modal
        isOpen={isEditClassModalOpen}
        onClose={() => {
          setIsEditClassModalOpen(false);
          setEditingClassId(null);
          setError(null);
        }}
        title="ویرایش کلاس درس"
        description="تغییر مشخصات، کد کلاسی، ظرفیت یا مکان کلاس"
        maxWidth="md"
      >
        {error && (
          <div className="mb-4 flex items-center space-x-2 space-x-reverse rounded-lg bg-red-50 p-3 text-xs text-red-700 border border-red-200">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleUpdateClass} className="space-y-3.5">
          <Input
            label="نام کلاس"
            placeholder="مثال: کلاس دهم ریاضی ۱"
            value={editClassForm.name}
            onChange={(e) => setEditClassForm({ ...editClassForm, name: e.target.value })}
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="کد یکتای کلاس"
              placeholder="مثال: CLS-10-M1"
              value={editClassForm.code}
              onChange={(e) => setEditClassForm({ ...editClassForm, code: e.target.value })}
              required
            />
            <Input
              label="ظرفیت دانش‌آموزان"
              type="number"
              value={editClassForm.capacity}
              onChange={(e) => setEditClassForm({ ...editClassForm, capacity: Number(e.target.value) })}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="w-full text-right space-y-1.5">
              <label className="block text-xs sm:text-[13px] font-bold text-ink-normal/80 dark:text-gray-300 text-right">
                پایه تحصیلی <span className="text-red-500">*</span>
              </label>
              <select
                value={editClassForm.levelId}
                onChange={(e) => handleEditClassLevelChange(e.target.value)}
                className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-[#FAFAFA] dark:bg-[#1C2536] text-ink-normal dark:text-white text-xs sm:text-sm font-medium focus:border-primary focus:bg-white dark:focus:bg-[#1C2536] focus:outline-none transition-all cursor-pointer"
                required
              >
                {levels.map((lvl) => (
                  <option key={lvl.id} value={lvl.id}>
                    پایه {lvl.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="w-full text-right space-y-1.5">
              <label className="block text-xs sm:text-[13px] font-bold text-ink-normal/80 dark:text-gray-300 text-right">
                رشته تحصیلی <span className="text-red-500">*</span>
              </label>
              <select
                value={editClassForm.fieldId}
                onChange={(e) => setEditClassForm({ ...editClassForm, fieldId: e.target.value })}
                className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-[#FAFAFA] dark:bg-[#1C2536] text-ink-normal dark:text-white text-xs sm:text-sm font-medium focus:border-primary focus:bg-white dark:focus:bg-[#1C2536] focus:outline-none transition-all cursor-pointer"
                required
              >
                {(fields.filter((f) => f.levelId === editClassForm.levelId).length > 0
                  ? fields.filter((f) => f.levelId === editClassForm.levelId)
                  : fields
                ).map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="w-full text-right space-y-1.5">
              <label className="block text-xs sm:text-[13px] font-bold text-ink-normal/80 dark:text-gray-300 text-right">
                سال تحصیلی
              </label>
              <select
                value={editClassForm.academicYearId}
                onChange={(e) => setEditClassForm({ ...editClassForm, academicYearId: e.target.value })}
                className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-[#FAFAFA] dark:bg-[#1C2536] text-ink-normal dark:text-white text-xs sm:text-sm font-medium focus:border-primary focus:bg-white dark:focus:bg-[#1C2536] focus:outline-none transition-all cursor-pointer"
              >
                {academicYears.map((y) => (
                  <option key={y.id} value={y.id}>
                    {y.name} {y.isCurrent ? '(جاری)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <Input
              label="نام کلاس (اختیاری)"
              placeholder="مثال: ۱۰۱ یا کارگاه ۱"
              value={editClassForm.roomNumber}
              onChange={(e) => setEditClassForm({ ...editClassForm, roomNumber: e.target.value })}
            />
          </div>

          <div className="flex items-center justify-between gap-2 pt-3 border-t border-gray-100 dark:border-gray-800">
            <button
              type="button"
              className="h-10 w-10 flex items-center justify-center rounded-xl text-rose-600 hover:text-white hover:bg-rose-600 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 transition-all shrink-0 cursor-pointer shadow-2xs"
              title="حذف کلاس"
              onClick={() => {
                const currentClass = classrooms.find((c) => c.id === editingClassId);
                if (currentClass) {
                  setDeleteConfirmClass(currentClass);
                }
              }}
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setIsEditClassModalOpen(false);
                  setEditingClassId(null);
                  setError(null);
                }}
                className="h-10 px-3.5 text-xs sm:text-sm"
              >
                انصراف
              </Button>
              <Button type="submit" variant="primary" isLoading={isSubmitting} className="h-10 px-4 text-xs sm:text-sm font-bold">
                ذخیره تغییرات
              </Button>
            </div>
          </div>
        </form>
      </Modal>

      {/* 3. Modal: Create Lesson */}
      <Modal
        isOpen={isLessonModalOpen}
        onClose={() => {
          setIsLessonModalOpen(false);
          setError(null);
        }}
        title="تعریف عنوان درس جدید"
        description="افزودن درس به چارت آموزشی مدرسه و تخصیص به پایه و رشته"
        maxWidth="2xl"
      >
        {error && (
          <div className="mb-4 flex items-center space-x-2 space-x-reverse rounded-lg bg-red-50 p-3 text-xs text-red-700 border border-red-200">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleCreateLesson} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-ink-normal dark:text-gray-300 mb-1.5 text-right">
                پایه تحصیلی <span className="text-red-500">*</span>
              </label>
              <select
                value={lessonForm.levelId}
                onChange={(e) => handleLessonLevelChange(e.target.value)}
                className="flex h-11 w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#1C2536] px-3.5 py-2 text-sm text-ink-normal dark:text-white focus:outline-none focus:ring-2 focus:ring-primary font-bold"
                required
              >
                {levels.map((lvl) => (
                  <option key={lvl.id} value={lvl.id} className="bg-white dark:bg-[#1C2536] text-ink-normal dark:text-white">
                    پایه {lvl.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-ink-normal dark:text-gray-300 mb-1.5 text-right">
                رشته تحصیلی <span className="text-red-500">*</span>
              </label>
              <select
                value={lessonForm.fieldId}
                onChange={(e) => setLessonForm({ ...lessonForm, fieldId: e.target.value })}
                className="flex h-11 w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#1C2536] px-3.5 py-2 text-sm text-ink-normal dark:text-white focus:outline-none focus:ring-2 focus:ring-primary font-bold"
              >
                {(fields.filter((f) => f.levelId === lessonForm.levelId).length > 0
                  ? fields.filter((f) => f.levelId === lessonForm.levelId)
                  : fields
                ).map((f) => (
                  <option key={f.id} value={f.id} className="bg-white dark:bg-[#1C2536] text-ink-normal dark:text-white">
                    {f.name}
                  </option>
                ))}
                <option value="" className="bg-white dark:bg-[#1C2536] text-ink-normal dark:text-white">عمومی (مشترک بین تمام رشته‌ها)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="نام درس"
              placeholder="مثال: کارگاه شبکه و نرم‌افزار یا ریاضی ۱"
              value={lessonForm.name}
              onChange={(e) => setLessonForm({ ...lessonForm, name: e.target.value })}
              required
            />
            <Input
              label="کد درس"
              placeholder="مثال: NET-101"
              value={lessonForm.code}
              onChange={(e) => setLessonForm({ ...lessonForm, code: e.target.value })}
              required
            />
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-ink-normal dark:text-gray-300 mb-1.5 text-right">
                  نوع درس
                </label>
                <select
                  value={lessonForm.type}
                  onChange={(e) => {
                    const newType = e.target.value;
                    const isMod = ['NON_TECHNICAL_COMPETENCY', 'BASIC_COMPETENCY', 'TECHNICAL_MODULAR_COMPETENCY'].includes(newType);
                    setLessonForm({
                      ...lessonForm,
                      type: newType,
                      isModular: isMod,
                    });
                  }}
                  className="flex h-11 w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#1C2536] px-3.5 py-2 text-sm text-ink-normal dark:text-white focus:outline-none focus:ring-2 focus:ring-primary font-medium"
                >
                  <option value="GENERAL" className="bg-white dark:bg-[#1C2536] text-ink-normal dark:text-white">۱- عمومی</option>
                  <option value="NON_TECHNICAL_COMPETENCY" className="bg-white dark:bg-[#1C2536] text-ink-normal dark:text-white">۲- شایستگی‌های غیرفنی (پودمانی)</option>
                  <option value="BASIC_COMPETENCY" className="bg-white dark:bg-[#1C2536] text-ink-normal dark:text-white">۳- شایستگی‌های پایه (پودمانی)</option>
                  <option value="TECHNICAL_MODULAR_COMPETENCY" className="bg-white dark:bg-[#1C2536] text-ink-normal dark:text-white">۴- شایستگی‌های فنی / پودمانی</option>
                  <option value="TECHNICAL_PRACTICAL_COMPETENCY" className="bg-white dark:bg-[#1C2536] text-ink-normal dark:text-white">۵- شایستگی‌های فنی / عملی</option>
                  <option value="EXTRACURRICULAR" className="bg-white dark:bg-[#1C2536] text-ink-normal dark:text-white">۶- فوق‌برنامه (ترمی بدون مستمر)</option>
                </select>
              </div>

              <Input
                label="تعداد واحد / ساعت هفتگی"
                type="number"
                value={lessonForm.units}
                onChange={(e) => setLessonForm({ ...lessonForm, units: Number(e.target.value) })}
                required
              />
            </div>

            {/* کارت راهنما و توضیحات زنده منطق نمره‌دهی و ارزشیابی نوع درس */}
            {lessonForm.type === 'GENERAL' && (
              <div className="rounded-xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/70 dark:bg-emerald-950/30 p-3 sm:p-3.5 text-xs text-emerald-950 dark:text-emerald-200 space-y-1.5 transition-all">
                <div className="flex flex-wrap items-center justify-between gap-1.5 font-bold text-emerald-900 dark:text-emerald-300">
                  <span className="flex items-center gap-1.5 text-xs sm:text-[13px]">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                    ارزشیابی نوبت اول و دوم (غیرپودمانی)
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 text-[10.5px] border border-emerald-300 dark:border-emerald-700/60 shrink-0">
                    نظام سالانه
                  </span>
                </div>
                <p className="leading-relaxed text-emerald-800 dark:text-emerald-400 text-[11px] sm:text-xs break-words">
                  ثبت نمرات مستمر و پایانی در دو نوبت دی‌ماه و خرداد، بدون نیاز به پودمان‌بندی.
                </p>
              </div>
            )}

            {lessonForm.type === 'NON_TECHNICAL_COMPETENCY' && (
              <div className="rounded-xl border border-purple-200 dark:border-purple-800/60 bg-purple-50/70 dark:bg-purple-950/30 p-3 sm:p-3.5 text-xs text-purple-950 dark:text-purple-200 space-y-1.5 transition-all">
                <div className="flex flex-wrap items-center justify-between gap-1.5 font-bold text-purple-900 dark:text-purple-300">
                  <span className="flex items-center gap-1.5 text-xs sm:text-[13px]">
                    <span className="h-2 w-2 rounded-full bg-purple-500 shrink-0" />
                    شایستگی‌های غیرفنی (۵ پودمان)
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-purple-100 dark:bg-purple-900/60 text-purple-800 dark:text-purple-300 text-[10.5px] border border-purple-300 dark:border-purple-700/60 shrink-0">
                    نصاب قبولی: ۱۲
                  </span>
                </div>
                <p className="leading-relaxed text-purple-800 dark:text-purple-400 text-[11px] sm:text-xs break-words">
                  ارزشیابی در ۵ پودمان مهارتی مستقل (الزامات محیط کار، اخلاق حرفه‌ای، کارآفرینی و...).
                </p>
              </div>
            )}

            {lessonForm.type === 'BASIC_COMPETENCY' && (
              <div className="rounded-xl border border-indigo-200 dark:border-indigo-800/60 bg-indigo-50/70 dark:bg-indigo-950/30 p-3 sm:p-3.5 text-xs text-indigo-950 dark:text-indigo-200 space-y-1.5 transition-all">
                <div className="flex flex-wrap items-center justify-between gap-1.5 font-bold text-indigo-900 dark:text-indigo-300">
                  <span className="flex items-center gap-1.5 text-xs sm:text-[13px]">
                    <span className="h-2 w-2 rounded-full bg-indigo-500 shrink-0" />
                    شایستگی‌های پایه (۵ پودمان)
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-900/60 text-indigo-800 dark:text-indigo-300 text-[10.5px] border border-indigo-300 dark:border-indigo-700/60 shrink-0">
                    دروس علوم پایه
                  </span>
                </div>
                <p className="leading-relaxed text-indigo-800 dark:text-indigo-400 text-[11px] sm:text-xs break-words">
                  ۵ پودمان متوالی با نمره مستمر و پایانی مجزا (ریاضی، فیزیک، شیمی هنرستان).
                </p>
              </div>
            )}

            {lessonForm.type === 'TECHNICAL_MODULAR_COMPETENCY' && (
              <div className="rounded-xl border border-purple-200 dark:border-purple-800/60 bg-purple-50/70 dark:bg-purple-950/30 p-3 sm:p-3.5 text-xs text-purple-950 dark:text-purple-200 space-y-1.5 transition-all">
                <div className="flex flex-wrap items-center justify-between gap-1.5 font-bold text-purple-900 dark:text-purple-300">
                  <span className="flex items-center gap-1.5 text-xs sm:text-[13px]">
                    <span className="h-2 w-2 rounded-full bg-purple-600 shrink-0" />
                    شایستگی‌های فنی کارگاهی (۵ پودمان)
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-purple-100 dark:bg-purple-900/60 text-purple-800 dark:text-purple-300 text-[10.5px] border border-purple-300 dark:border-purple-700/60 shrink-0">
                    کارگاهی تخصصی
                  </span>
                </div>
                <p className="leading-relaxed text-purple-800 dark:text-purple-400 text-[11px] sm:text-xs break-words">
                  ارزشیابی دروس تخصصی رشته در ۵ پودمان کارگاهی شایستگی‌محور با حد نصاب قبولی ۱۲.
                </p>
              </div>
            )}

            {lessonForm.type === 'TECHNICAL_PRACTICAL_COMPETENCY' && (
              <div className="rounded-xl border border-amber-200 dark:border-amber-800/60 bg-amber-50/70 dark:bg-amber-950/30 p-3 sm:p-3.5 text-xs text-amber-950 dark:text-amber-200 space-y-1.5 transition-all">
                <div className="flex flex-wrap items-center justify-between gap-1.5 font-bold text-amber-900 dark:text-amber-300">
                  <span className="flex items-center gap-1.5 text-xs sm:text-[13px]">
                    <span className="h-2 w-2 rounded-full bg-amber-500 shrink-0" />
                    شایستگی‌های فنی و عملی (غیرپودمانی)
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 text-[10.5px] border border-amber-300 dark:border-amber-700/60 shrink-0">
                    آزمون کتبی و عملی
                  </span>
                </div>
                <p className="leading-relaxed text-amber-800 dark:text-amber-400 text-[11px] sm:text-xs break-words">
                  ارزشیابی بر اساس سنجش عملکردی کارگاهی و آزمون نهایی پایان دوره.
                </p>
              </div>
            )}

            {lessonForm.type === 'EXTRACURRICULAR' && (
              <div className="rounded-xl border border-rose-200 dark:border-rose-800/60 bg-rose-50/70 dark:bg-rose-950/30 p-3 sm:p-3.5 text-xs text-rose-950 dark:text-rose-200 space-y-1.5 transition-all">
                <div className="flex flex-wrap items-center justify-between gap-1.5 font-bold text-rose-900 dark:text-rose-300">
                  <span className="flex items-center gap-1.5 text-xs sm:text-[13px]">
                    <span className="h-2 w-2 rounded-full bg-rose-500 shrink-0" />
                    درس فوق‌برنامه (ارزشیابی ترمی بدون مستمر)
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-rose-100 dark:bg-rose-900/60 text-rose-800 dark:text-rose-300 text-[10.5px] border border-rose-300 dark:border-rose-700/60 shrink-0">
                    نمره از ۲۰ (فقط پایانی ترم)
                  </span>
                </div>
                <p className="leading-relaxed text-rose-800 dark:text-rose-400 text-[11px] sm:text-xs break-words">
                  مدل نمره‌دهی به صورت ترمی و بدون نمره مستمر است؛ نمرات پایانی ترم اول و ترم دوم در مقیاس ۰ تا ۲۰ ثبت شده و میانگین نهایی محاسبه می‌شود.
                </p>
              </div>
            )}
          </div>

          {/* بخش تنظیمات پودمان (در صورت پودمانی بودن درس) */}
          {lessonForm.isModular ? (
            <div className="bg-white dark:bg-[#151C28] bg-gradient-to-l from-purple-50/60 via-purple-50/20 to-transparent dark:from-purple-950/40 dark:via-transparent dark:to-transparent rounded-2xl border border-purple-200 dark:border-purple-900/50 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-sm text-ink-darker dark:text-white">
                    پودمان‌های این درس (نظام ۵ پودمانی)
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-purple-100 dark:bg-purple-900/50 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                    ۵ پودمان فعال
                  </span>
                </div>
                <span className="text-xs text-purple-700 dark:text-purple-400 font-medium">
                  ثبت خودکار در پایگاه داده
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                عناوین ۵ پودمان این درس به صورت اختیاری:
              </p>

              <div className="pt-2 border-t border-purple-100 dark:border-purple-900/40 space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full">
                  {[0, 1, 2, 3, 4].map((idx) => (
                    <div
                      key={idx}
                      className={`flex items-center gap-2 bg-white dark:bg-[#1C2536] px-2.5 py-1.5 rounded-xl border border-purple-200/80 dark:border-purple-900/60 min-w-0 w-full overflow-hidden ${
                        idx === 4 ? 'sm:col-span-2' : ''
                      }`}
                    >
                      <span className="text-[11px] font-bold text-purple-700 dark:text-purple-400 w-16 shrink-0 text-center font-mono">
                        پودمان {idx + 1}:
                      </span>
                      <input
                        type="text"
                        value={lessonForm.podmanTitles[idx] || `پودمان ${idx + 1}`}
                        onChange={(e) => {
                          const newTitles = [...lessonForm.podmanTitles];
                          newTitles[idx] = e.target.value;
                          setLessonForm({ ...lessonForm, podmanTitles: newTitles });
                        }}
                        placeholder={`عنوان پودمان ${idx + 1}`}
                        className="flex-1 min-w-0 w-full h-8 text-xs px-2.5 rounded-lg border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-1 focus:ring-purple-500 font-medium bg-gray-50/50 dark:bg-[#151C28] text-gray-800 dark:text-white focus:bg-white dark:focus:bg-[#1C2536] transition-colors"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-gray-300 dark:border-gray-700 bg-gray-50/60 dark:bg-[#1C2536]/40 p-3.5 text-center text-xs text-gray-500 dark:text-gray-400">
              <span className="font-semibold text-gray-700 dark:text-gray-300">این درس غیرپودمانی است: </span>
              ارزشیابی نمرات به صورت کلاسی/ترمی یا کتبی و عملی سالانه ثبت شده و نیازی به پودمان‌بندی ندارد.
            </div>
          )}

          <div className="flex justify-end space-x-2 space-x-reverse pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setIsLessonModalOpen(false);
                setError(null);
              }}
            >
              انصراف
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              ثبت درس
            </Button>
          </div>
        </form>
      </Modal>

      {/* 4. Modal: Edit Lesson */}
      <Modal
        isOpen={isEditLessonModalOpen}
        onClose={() => {
          setIsEditLessonModalOpen(false);
          setEditingLessonId(null);
          setError(null);
        }}
        title="ویرایش درس آموزشی"
        description="ویرایش مشخصات درس، مربیان مدرس، نوع ارزشیابی و عناوین پودمان‌ها"
        maxWidth="2xl"
      >
        {error && (
          <div className="mb-4 flex items-center space-x-2 space-x-reverse rounded-lg bg-red-50 p-3 text-xs text-red-700 border border-red-200">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleUpdateLesson} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-ink-normal dark:text-gray-300 mb-1.5 text-right">
                پایه تحصیلی <span className="text-red-500">*</span>
              </label>
              <select
                value={editLessonForm.levelId}
                onChange={(e) => handleEditLessonLevelChange(e.target.value)}
                className="flex h-11 w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#1C2536] px-3.5 py-2 text-sm text-ink-normal dark:text-white focus:outline-none focus:ring-2 focus:ring-primary font-bold"
                required
              >
                {levels.map((lvl) => (
                  <option key={lvl.id} value={lvl.id} className="bg-white dark:bg-[#1C2536] text-ink-normal dark:text-white">
                    پایه {lvl.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-ink-normal dark:text-gray-300 mb-1.5 text-right">
                رشته تحصیلی <span className="text-red-500">*</span>
              </label>
              <select
                value={editLessonForm.fieldId}
                onChange={(e) => setEditLessonForm({ ...editLessonForm, fieldId: e.target.value })}
                className="flex h-11 w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#1C2536] px-3.5 py-2 text-sm text-ink-normal dark:text-white focus:outline-none focus:ring-2 focus:ring-primary font-bold"
              >
                {(fields.filter((f) => f.levelId === editLessonForm.levelId).length > 0
                  ? fields.filter((f) => f.levelId === editLessonForm.levelId)
                  : fields
                ).map((f) => (
                  <option key={f.id} value={f.id} className="bg-white dark:bg-[#1C2536] text-ink-normal dark:text-white">
                    {f.name}
                  </option>
                ))}
                <option value="" className="bg-white dark:bg-[#1C2536] text-ink-normal dark:text-white">عمومی (مشترک بین تمام رشته‌ها)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="نام درس"
              placeholder="مثال: کارگاه شبکه و نرم‌افزار یا ریاضی ۱"
              value={editLessonForm.name}
              onChange={(e) => setEditLessonForm({ ...editLessonForm, name: e.target.value })}
              required
            />
            <Input
              label="کد درس"
              placeholder="مثال: NET-101"
              value={editLessonForm.code}
              onChange={(e) => setEditLessonForm({ ...editLessonForm, code: e.target.value })}
              required
            />
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-ink-normal dark:text-gray-300 mb-1.5 text-right">
                  نوع درس
                </label>
                <select
                  value={editLessonForm.type}
                  onChange={(e) => {
                    const newType = e.target.value;
                    const isMod = ['NON_TECHNICAL_COMPETENCY', 'BASIC_COMPETENCY', 'TECHNICAL_MODULAR_COMPETENCY'].includes(newType);
                    setEditLessonForm({
                      ...editLessonForm,
                      type: newType,
                      isModular: isMod,
                    });
                  }}
                  className="flex h-11 w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#1C2536] px-3.5 py-2 text-sm text-ink-normal dark:text-white focus:outline-none focus:ring-2 focus:ring-primary font-medium"
                >
                  <option value="GENERAL" className="bg-white dark:bg-[#1C2536] text-ink-normal dark:text-white">۱- عمومی</option>
                  <option value="NON_TECHNICAL_COMPETENCY" className="bg-white dark:bg-[#1C2536] text-ink-normal dark:text-white">۲- شایستگی‌های غیرفنی (پودمانی)</option>
                  <option value="BASIC_COMPETENCY" className="bg-white dark:bg-[#1C2536] text-ink-normal dark:text-white">۳- شایستگی‌های پایه (پودمانی)</option>
                  <option value="TECHNICAL_MODULAR_COMPETENCY" className="bg-white dark:bg-[#1C2536] text-ink-normal dark:text-white">۴- شایستگی‌های فنی / پودمانی</option>
                  <option value="TECHNICAL_PRACTICAL_COMPETENCY" className="bg-white dark:bg-[#1C2536] text-ink-normal dark:text-white">۵- شایستگی‌های فنی / عملی</option>
                  <option value="EXTRACURRICULAR" className="bg-white dark:bg-[#1C2536] text-ink-normal dark:text-white">۶- فوق‌برنامه (ترمی بدون مستمر)</option>
                </select>
              </div>

              <Input
                label="تعداد واحد / ساعت هفتگی"
                type="number"
                value={editLessonForm.units}
                onChange={(e) => setEditLessonForm({ ...editLessonForm, units: Number(e.target.value) })}
                required
              />
            </div>

            {/* کارت راهنما و توضیحات زنده منطق نمره‌دهی و ارزشیابی نوع درس */}
            {editLessonForm.type === 'GENERAL' && (
              <div className="rounded-xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/70 dark:bg-emerald-950/30 p-3 sm:p-3.5 text-xs text-emerald-950 dark:text-emerald-200 space-y-1.5 transition-all">
                <div className="flex flex-wrap items-center justify-between gap-1.5 font-bold text-emerald-900 dark:text-emerald-300">
                  <span className="flex items-center gap-1.5 text-xs sm:text-[13px]">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                    ارزشیابی نوبت اول و دوم (غیرپودمانی)
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 text-[10.5px] border border-emerald-300 dark:border-emerald-700/60 shrink-0">
                    نظام سالانه
                  </span>
                </div>
                <p className="leading-relaxed text-emerald-800 dark:text-emerald-400 text-[11px] sm:text-xs break-words">
                  ثبت نمرات مستمر و پایانی در دو نوبت دی‌ماه و خرداد، بدون نیاز به پودمان‌بندی.
                </p>
              </div>
            )}

            {editLessonForm.type === 'NON_TECHNICAL_COMPETENCY' && (
              <div className="rounded-xl border border-purple-200 dark:border-purple-800/60 bg-purple-50/70 dark:bg-purple-950/30 p-3 sm:p-3.5 text-xs text-purple-950 dark:text-purple-200 space-y-1.5 transition-all">
                <div className="flex flex-wrap items-center justify-between gap-1.5 font-bold text-purple-900 dark:text-purple-300">
                  <span className="flex items-center gap-1.5 text-xs sm:text-[13px]">
                    <span className="h-2 w-2 rounded-full bg-purple-500 shrink-0" />
                    شایستگی‌های غیرفنی (۵ پودمان)
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-purple-100 dark:bg-purple-900/60 text-purple-800 dark:text-purple-300 text-[10.5px] border border-purple-300 dark:border-purple-700/60 shrink-0">
                    نصاب قبولی: ۱۲
                  </span>
                </div>
                <p className="leading-relaxed text-purple-800 dark:text-purple-400 text-[11px] sm:text-xs break-words">
                  ارزشیابی در ۵ پودمان مهارتی مستقل (الزامات محیط کار، اخلاق حرفه‌ای، کارآفرینی و...).
                </p>
              </div>
            )}

            {editLessonForm.type === 'BASIC_COMPETENCY' && (
              <div className="rounded-xl border border-indigo-200 dark:border-indigo-800/60 bg-indigo-50/70 dark:bg-indigo-950/30 p-3 sm:p-3.5 text-xs text-indigo-950 dark:text-indigo-200 space-y-1.5 transition-all">
                <div className="flex flex-wrap items-center justify-between gap-1.5 font-bold text-indigo-900 dark:text-indigo-300">
                  <span className="flex items-center gap-1.5 text-xs sm:text-[13px]">
                    <span className="h-2 w-2 rounded-full bg-indigo-500 shrink-0" />
                    شایستگی‌های پایه (۵ پودمان)
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-900/60 text-indigo-800 dark:text-indigo-300 text-[10.5px] border border-indigo-300 dark:border-indigo-700/60 shrink-0">
                    دروس علوم پایه
                  </span>
                </div>
                <p className="leading-relaxed text-indigo-800 dark:text-indigo-400 text-[11px] sm:text-xs break-words">
                  ۵ پودمان متوالی با نمره مستمر و پایانی مجزا (ریاضی، فیزیک، شیمی هنرستان).
                </p>
              </div>
            )}

            {editLessonForm.type === 'TECHNICAL_MODULAR_COMPETENCY' && (
              <div className="rounded-xl border border-purple-200 dark:border-purple-800/60 bg-purple-50/70 dark:bg-purple-950/30 p-3 sm:p-3.5 text-xs text-purple-950 dark:text-purple-200 space-y-1.5 transition-all">
                <div className="flex flex-wrap items-center justify-between gap-1.5 font-bold text-purple-900 dark:text-purple-300">
                  <span className="flex items-center gap-1.5 text-xs sm:text-[13px]">
                    <span className="h-2 w-2 rounded-full bg-purple-600 shrink-0" />
                    شایستگی‌های فنی کارگاهی (۵ پودمان)
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-purple-100 dark:bg-purple-900/60 text-purple-800 dark:text-purple-300 text-[10.5px] border border-purple-300 dark:border-purple-700/60 shrink-0">
                    کارگاهی تخصصی
                  </span>
                </div>
                <p className="leading-relaxed text-purple-800 dark:text-purple-400 text-[11px] sm:text-xs break-words">
                  ارزشیابی دروس تخصصی رشته در ۵ پودمان کارگاهی شایستگی‌محور با حد نصاب قبولی ۱۲.
                </p>
              </div>
            )}

            {editLessonForm.type === 'TECHNICAL_PRACTICAL_COMPETENCY' && (
              <div className="rounded-xl border border-amber-200 dark:border-amber-800/60 bg-amber-50/70 dark:bg-amber-950/30 p-3 sm:p-3.5 text-xs text-amber-950 dark:text-amber-200 space-y-1.5 transition-all">
                <div className="flex flex-wrap items-center justify-between gap-1.5 font-bold text-amber-900 dark:text-amber-300">
                  <span className="flex items-center gap-1.5 text-xs sm:text-[13px]">
                    <span className="h-2 w-2 rounded-full bg-amber-500 shrink-0" />
                    شایستگی‌های فنی و عملی (غیرپودمانی)
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 text-[10.5px] border border-amber-300 dark:border-amber-700/60 shrink-0">
                    آزمون کتبی و عملی
                  </span>
                </div>
                <p className="leading-relaxed text-amber-800 dark:text-amber-400 text-[11px] sm:text-xs break-words">
                  ارزشیابی بر اساس سنجش عملکردی کارگاهی و آزمون نهایی پایان دوره.
                </p>
              </div>
            )}

            {editLessonForm.type === 'EXTRACURRICULAR' && (
              <div className="rounded-xl border border-rose-200 dark:border-rose-800/60 bg-rose-50/70 dark:bg-rose-950/30 p-3 sm:p-3.5 text-xs text-rose-950 dark:text-rose-200 space-y-1.5 transition-all">
                <div className="flex flex-wrap items-center justify-between gap-1.5 font-bold text-rose-900 dark:text-rose-300">
                  <span className="flex items-center gap-1.5 text-xs sm:text-[13px]">
                    <span className="h-2 w-2 rounded-full bg-rose-500 shrink-0" />
                    درس فوق‌برنامه (ارزشیابی ترمی بدون مستمر)
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-rose-100 dark:bg-rose-900/60 text-rose-800 dark:text-rose-300 text-[10.5px] border border-rose-300 dark:border-rose-700/60 shrink-0">
                    نمره از ۲۰ (فقط پایانی ترم)
                  </span>
                </div>
                <p className="leading-relaxed text-rose-800 dark:text-rose-400 text-[11px] sm:text-xs break-words">
                  مدل نمره‌دهی به صورت ترمی و بدون نمره مستمر است؛ نمرات پایانی ترم اول و ترم دوم در مقیاس ۰ تا ۲۰ ثبت شده و میانگین نهایی محاسبه می‌شود.
                </p>
              </div>
            )}
          </div>

          {/* بخش تنظیمات پودمان (در صورت پودمانی بودن درس) */}
          {editLessonForm.isModular ? (
            <div className="bg-white dark:bg-[#151C28] bg-gradient-to-l from-purple-50/60 via-purple-50/20 to-transparent dark:from-purple-950/40 dark:via-transparent dark:to-transparent rounded-2xl border border-purple-200 dark:border-purple-900/50 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-sm text-ink-darker dark:text-white">
                    پودمان‌های این درس (نظام ۵ پودمانی)
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-purple-100 dark:bg-purple-900/50 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                    ۵ پودمان فعال
                  </span>
                </div>
                <span className="text-xs text-purple-700 dark:text-purple-400 font-medium">
                  ثبت خودکار در پایگاه داده
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                عناوین ۵ پودمان این درس را ویرایش نمایید:
              </p>

              <div className="pt-2 border-t border-purple-100 dark:border-purple-900/40 space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full">
                  {[0, 1, 2, 3, 4].map((idx) => (
                    <div
                      key={idx}
                      className={`flex items-center gap-2 bg-white dark:bg-[#1C2536] px-2.5 py-1.5 rounded-xl border border-purple-200/80 dark:border-purple-900/60 min-w-0 w-full overflow-hidden ${
                        idx === 4 ? 'sm:col-span-2' : ''
                      }`}
                    >
                      <span className="text-[11px] font-bold text-purple-700 dark:text-purple-400 w-16 shrink-0 text-center font-mono">
                        پودمان {idx + 1}:
                      </span>
                      <input
                        type="text"
                        value={editLessonForm.podmanTitles[idx] || `پودمان ${idx + 1}`}
                        onChange={(e) => {
                          const newTitles = [...editLessonForm.podmanTitles];
                          newTitles[idx] = e.target.value;
                          setEditLessonForm({ ...editLessonForm, podmanTitles: newTitles });
                        }}
                        placeholder={`عنوان پودمان ${idx + 1}`}
                        className="flex-1 min-w-0 w-full h-8 text-xs px-2.5 rounded-lg border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-1 focus:ring-purple-500 font-medium bg-gray-50/50 dark:bg-[#151C28] text-gray-800 dark:text-white focus:bg-white dark:focus:bg-[#1C2536] transition-colors"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-gray-300 dark:border-gray-700 bg-gray-50/60 dark:bg-[#1C2536]/40 p-3.5 text-center text-xs text-gray-500 dark:text-gray-400">
              <span className="font-semibold text-gray-700 dark:text-gray-300">این درس غیرپودمانی است: </span>
              ارزشیابی نمرات به صورت کلاسی/ترمی یا کتبی و عملی سالانه ثبت شده و نیازی به پودمان‌بندی ندارد.
            </div>
          )}

          <div className="flex items-center justify-between gap-2 pt-3 border-t border-gray-100 dark:border-gray-800">
            <button
              type="button"
              className="h-10 px-3 rounded-xl text-rose-600 hover:text-white hover:bg-rose-600 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 transition-all shrink-0 cursor-pointer text-xs font-bold flex items-center gap-1.5 shadow-2xs"
              title="حذف درس"
              onClick={() => {
                const currentLesson = lessons.find((l) => l.id === editingLessonId);
                if (currentLesson) {
                  setDeleteConfirmLesson(currentLesson);
                }
              }}
            >
              <Trash2 className="w-4 h-4" />
              <span>حذف درس</span>
            </button>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setIsEditLessonModalOpen(false);
                  setEditingLessonId(null);
                  setError(null);
                }}
                className="h-10 px-4 text-xs sm:text-sm"
              >
                انصراف
              </Button>
              <Button type="submit" variant="primary" isLoading={isSubmitting} className="h-10 px-5 text-xs sm:text-sm font-bold">
                ذخیره تغییرات
              </Button>
            </div>
          </div>
        </form>
      </Modal>

      {/* Delete Lesson Confirmation Modal */}
      <Modal
        isOpen={!!deleteConfirmLesson}
        onClose={() => !isDeletingLesson && setDeleteConfirmLesson(null)}
        title="حذف درس از چارت آموزشی"
        description="آیا از حذف این درس اطمینان دارید؟ این عملیات غیرقابل بازگشت است."
        maxWidth="sm"
      >
        <div className="space-y-4">
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-sm">
            <p className="font-bold mb-1">نام درس: {deleteConfirmLesson?.name}</p>
            <p className="text-xs text-rose-600 leading-relaxed">
              با حذف این درس، ارتباطات مربوط به برنامه‌های درسی و مربیان این درس حذف خواهند شد.
            </p>
          </div>

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              disabled={isDeletingLesson}
              onClick={() => setDeleteConfirmLesson(null)}
              className="w-full sm:w-auto"
            >
              انصراف
            </Button>
            <Button
              type="button"
              variant="primary"
              className="bg-rose-600 hover:bg-rose-700 text-white w-full sm:w-auto"
              isLoading={isDeletingLesson}
              onClick={handleConfirmDeleteLesson}
            >
              <Trash2 className="w-4 h-4 ml-1.5" />
              <span>بله، حذف شود</span>
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Academic Year Confirmation Modal */}
      <Modal
        isOpen={!!deleteConfirmYear}
        onClose={() => !isDeletingYear && setDeleteConfirmYear(null)}
        title="حذف سال تحصیلی"
        description="آیا از حذف این سال تحصیلی اطمینان دارید؟ این عملیات غیرقابل بازگشت است."
        maxWidth="sm"
      >
        <div className="space-y-4">
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-sm">
            <p className="font-bold mb-1">سال تحصیلی: {deleteConfirmYear?.name}</p>
            <p className="text-xs text-rose-600 leading-relaxed">
              با حذف این سال، تمام نیم‌سال‌های تحصیلی مربوط به آن نیز حذف خواهند شد.
            </p>
          </div>

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              disabled={isDeletingYear}
              onClick={() => setDeleteConfirmYear(null)}
              className="w-full sm:w-auto"
            >
              انصراف
            </Button>
            <Button
              type="button"
              variant="primary"
              className="bg-rose-600 hover:bg-rose-700 text-white w-full sm:w-auto"
              isLoading={isDeletingYear}
              onClick={handleConfirmDeleteYear}
            >
              <Trash2 className="w-4 h-4 ml-1.5" />
              <span>بله، حذف شود</span>
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Classroom Confirmation Modal */}
      <Modal
        isOpen={!!deleteConfirmClass}
        onClose={() => !isDeletingClass && setDeleteConfirmClass(null)}
        title="حذف کلاس درس"
        description="آیا از حذف این کلاس اطمینان دارید؟ این عملیات غیرقابل بازگشت است."
        maxWidth="sm"
      >
        <div className="space-y-4">
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-sm">
            <p className="font-bold mb-1">نام کلاس: {deleteConfirmClass?.name}</p>
            <p className="text-xs text-rose-600 leading-relaxed">
              با حذف کلاس، تمام داده‌های مرتبط با این کلاس (ثبت‌نام‌ها، برنامه‌های هفتگی و ...) حذف خواهند شد.
            </p>
          </div>

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              disabled={isDeletingClass}
              onClick={() => setDeleteConfirmClass(null)}
              className="w-full sm:w-auto"
            >
              انصراف
            </Button>
            <Button
              type="button"
              variant="primary"
              className="bg-rose-600 hover:bg-rose-700 text-white w-full sm:w-auto"
              isLoading={isDeletingClass}
              onClick={handleConfirmDeleteClass}
            >
              <Trash2 className="w-4 h-4 ml-1.5" />
              <span>بله، حذف شود</span>
            </Button>
          </div>
        </div>
      </Modal>

      {/* Classroom Students & Grade/Field Transfer Modal */}
      <Modal
        isOpen={isClassStudentsModalOpen}
        onClose={() => {
          setIsClassStudentsModalOpen(false);
          setEditingStudentId(null);
        }}
        title={`دانش‌آموزان ${selectedClassForStudents?.name || ''}`}
        maxWidth="3xl"
      >
        <div className="space-y-3">
          {/* Classroom Summary */}
          {selectedClassForStudents && (
            <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200/80 dark:border-gray-700 flex-wrap">
              <div className="flex items-center gap-2">
                <Building className="w-4 h-4 text-primary shrink-0" />
                <span className="font-bold text-ink-darker text-xs sm:text-sm">
                  {selectedClassForStudents.name}
                </span>
                <span className="font-mono text-[11px] bg-white dark:bg-gray-700 px-1.5 py-0.5 rounded border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300">
                  {selectedClassForStudents.code}
                </span>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <Badge variant="college" className="text-[11px] py-0.5 px-2">
                  {selectedClassForStudents.field?.name || 'شبکه و نرم‌افزار'}
                </Badge>
                <Badge variant="neutral" className="text-[11px] py-0.5 px-2 font-mono">
                  {classStudents.length} / {selectedClassForStudents.capacity || 30} نفر
                </Badge>
              </div>
            </div>
          )}

          {/* Tab Navigation & Search */}
          <div className="flex items-center justify-between gap-2 border-b border-gray-200 pb-2 flex-wrap">
            <div className="flex space-x-1.5 space-x-reverse">
              <button
                type="button"
                onClick={() => {
                  setStudentModalTab('MEMBERS');
                  setEditingStudentId(null);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                  studentModalTab === 'MEMBERS'
                    ? 'bg-primary text-white shadow-xs'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>دانش‌آموزان ({classStudents.length})</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setStudentModalTab('ADD_STUDENT');
                  setEditingStudentId(null);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                  studentModalTab === 'ADD_STUDENT'
                    ? 'bg-primary text-white shadow-xs'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300'
                }`}
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>افزودن ({otherStudents.length})</span>
              </button>
            </div>

            {/* Quick Search */}
            <div className="relative w-full sm:w-56">
              <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none text-gray-400">
                <Search className="w-3.5 h-3.5" />
              </div>
              <input
                type="text"
                value={studentSearchQuery}
                onChange={(e) => setStudentSearchQuery(e.target.value)}
                placeholder="جستجو..."
                className="w-full pl-3 pr-8 py-1.5 text-xs rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all"
              />
              {studentSearchQuery && (
                <button
                  type="button"
                  onClick={() => setStudentSearchQuery('')}
                  className="absolute inset-y-0 left-0 pl-2 flex items-center text-gray-400 hover:text-gray-600"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Student List Content */}
          <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
            {isLoadingClassStudents ? (
              <div className="space-y-2 py-3">
                <Skeleton className="h-14 w-full rounded-xl" />
                <Skeleton className="h-14 w-full rounded-xl" />
                <Skeleton className="h-14 w-full rounded-xl" />
              </div>
            ) : displayedStudents.length === 0 ? (
              <div className="text-center py-8 px-4 text-gray-400 text-xs">
                دانش‌آموزی یافت نشد.
              </div>
            ) : (
              displayedStudents.map((s: any) => {
                const isEditing = editingStudentId === s.id;
                const isExpanded = !!expandedStudentIds[s.id];
                const currentEnrolledClass = s.enrollments?.[0]?.classroom;
                const studentField = currentEnrolledClass?.field?.name || '';

                return (
                  <div
                    key={s.id}
                    className={`p-3 rounded-xl border transition-all ${
                      isEditing
                        ? 'border-primary bg-primary/5 dark:bg-primary/10 shadow-xs'
                        : 'border-gray-200/80 hover:border-gray-300 bg-white dark:bg-gray-800/80 shadow-2xs'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2.5">
                      {/* Student Info */}
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0 border border-primary/20">
                          {s.user?.firstName?.[0] || 'د'}
                        </div>
                        <div className="space-y-0.5 min-w-0">
                          <div className="font-bold text-ink-darker text-xs sm:text-sm flex items-center gap-1.5 flex-wrap">
                            <span className="truncate">{s.user?.firstName} {s.user?.lastName}</span>
                            {currentEnrolledClass && studentModalTab === 'ADD_STUDENT' && (
                              <Badge variant="college" className="text-[10px] py-0 px-1.5 truncate max-w-[150px]">
                                {currentEnrolledClass.name} {studentField ? `(${studentField})` : ''}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        {studentModalTab === 'MEMBERS' ? (
                          !isEditing ? (
                            <button
                              type="button"
                              onClick={() => handleStartEditStudent(s)}
                              className="p-2 rounded-xl text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-600 hover:text-white dark:hover:bg-blue-600 dark:hover:text-white border border-blue-200 dark:border-blue-800 transition-all shrink-0 cursor-pointer shadow-2xs"
                              title="تغییر پایه و رشته"
                            >
                              <ArrowRightLeft className="w-4 h-4" />
                            </button>
                          ) : null
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleQuickAssignStudentToClass(s.id)}
                            disabled={isSavingStudentTransfer}
                            className="p-2 rounded-xl text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-600 hover:text-white dark:hover:bg-emerald-600 dark:hover:text-white border border-emerald-200 dark:border-emerald-800 transition-all shrink-0 cursor-pointer shadow-2xs"
                            title="افزودن به این کلاس"
                          >
                            <UserPlus className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Collapsible Details */}
                    <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-700/60">
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedStudentIds((prev) => ({ ...prev, [s.id]: !prev[s.id] }))
                        }
                        className="flex items-center gap-1 text-[11px] font-bold text-gray-500 dark:text-gray-400 hover:text-primary transition-colors cursor-pointer"
                      >
                        <span>جزئیات بیشتر</span>
                        {isExpanded ? (
                          <ChevronUp className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5" />
                        )}
                      </button>

                      {isExpanded && (
                        <div className="mt-2 p-2.5 rounded-lg bg-gray-50 dark:bg-gray-900/40 border border-gray-200/60 dark:border-gray-700/50 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                          <div className="flex items-center justify-between sm:justify-start gap-1 text-[11px]">
                            <span className="text-gray-400">کد ملی:</span>
                            <span className="font-mono font-bold text-gray-700 dark:text-gray-200">
                              {s.nationalCode || s.user?.nationalId || '-'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between sm:justify-start gap-1 text-[11px]">
                            <span className="text-gray-400">کد دانش‌آموزی:</span>
                            <span className="font-mono font-bold text-gray-700 dark:text-gray-200">
                              {s.studentCode || '-'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between sm:justify-start gap-1 text-[11px]">
                            <span className="text-gray-400">نام پدر:</span>
                            <span className="font-bold text-gray-700 dark:text-gray-200">
                              {s.fatherName || s.fatherFullName || '-'}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Inline Edit Panel */}
                    {isEditing && (
                      <div className="mt-2.5 pt-2.5 border-t border-primary/20 space-y-2.5 bg-gray-50/80 dark:bg-gray-900/60 p-2.5 rounded-xl">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-1">
                              پایه تحصیلی:
                            </label>
                            <select
                              value={studentEditForm.gradeLevel}
                              onChange={(e) =>
                                setStudentEditForm((prev) => ({ ...prev, gradeLevel: e.target.value }))
                              }
                              className="w-full h-8.5 rounded-lg border border-gray-200 bg-white dark:bg-gray-800 px-2.5 text-xs font-medium text-ink-dark focus:outline-none focus:ring-1 focus:ring-primary"
                            >
                              {levels.length > 0
                                ? levels.map((lvl) => (
                                    <option key={lvl.id} value={lvl.name}>
                                      پایه {lvl.name}
                                    </option>
                                  ))
                                : ['دهم', 'یازدهم', 'دوازدهم', 'هفتم', 'هشتم', 'نهم'].map((lvl) => (
                                    <option key={lvl} value={lvl}>
                                      پایه {lvl}
                                    </option>
                                  ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-1">
                              رشته و کلاس:
                            </label>
                            <select
                              value={studentEditForm.classroomId}
                              onChange={(e) =>
                                setStudentEditForm((prev) => ({ ...prev, classroomId: e.target.value }))
                              }
                              className="w-full h-8.5 rounded-lg border border-gray-200 bg-white dark:bg-gray-800 px-2.5 text-xs font-medium text-ink-dark focus:outline-none focus:ring-1 focus:ring-primary"
                            >
                              <option value="">-- بدون کلاس انتصابی --</option>
                              {classrooms.map((c) => (
                                <option key={c.id} value={c.id}>
                                  {c.name} (پایه {c.level?.name || '-'} - {c.field?.name || 'بدون رشته'})
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div className="flex items-center justify-end gap-1.5 pt-1">
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditingStudentId(null)}
                            disabled={isSavingStudentTransfer}
                            className="text-xs h-7.5 px-2.5"
                          >
                            انصراف
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="primary"
                            isLoading={isSavingStudentTransfer}
                            onClick={() => handleSaveStudentChange(s.id)}
                            className="text-xs h-7.5 px-3"
                          >
                            <Save className="w-3.5 h-3.5 ml-1" />
                            <span>ذخیره</span>
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Modal Footer */}
          <div className="flex justify-end pt-1 border-t border-gray-200">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setIsClassStudentsModalOpen(false);
                setEditingStudentId(null);
              }}
              className="w-full sm:w-auto text-xs h-8 px-4"
            >
              بستن
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
