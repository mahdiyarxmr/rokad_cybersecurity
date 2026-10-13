import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { apiClient } from '../../../lib/api/client';
import { useAuthStore } from '../../../lib/auth/auth-store';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Input } from '../../../components/ui/Input';
import { Skeleton } from '../../../components/ui/Skeleton';
import {
  toPersianDigits,
  formatJalaliDisplay,
} from '../../../utils/jalali';
import {
  BookOpen,
  Users,
  Search,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Star,
  FileText,
  ChevronLeft,
  ArrowRight,
  GraduationCap,
  Clock,
  Sparkles,
  Calculator,
  RefreshCw,
  FileCheck,
  Layers,
  Award,
  ShieldAlert,
  Save,
  Check,
  X,
  ExternalLink,
  TrendingUp,
  Percent,
  Scale,
  Plus,
  CalendarCheck,
  UserCheck,
} from 'lucide-react';
import { toast } from 'sonner';

// ─────────────────────────────────────────────────────────────────────────────
// Types & Interfaces
// ─────────────────────────────────────────────────────────────────────────────

interface LessonItem {
  id: string;
  name: string;
  code?: string;
  units?: number;
  type?: string;
  isModular?: boolean; // پودمانی یا عمومی
  podmanCount?: number;
  level?: { id: string; name: string };
  field?: { id: string; name: string };
  classroomsCount?: number;
}

interface ClassroomItem {
  id: string;
  name: string;
  code?: string;
  level?: { id: string; name: string };
  field?: { id: string; name: string };
  studentCount?: number;
  teacherName?: string;
}

interface StudentItem {
  id: string;
  studentId: string;
  studentCode?: string;
  nationalCode?: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
}

// General Theory Grade State
interface GeneralGradeState {
  continuous1?: number | string; // مستمر ۱
  final1?: number | string;      // پایانی ۱
  continuous2?: number | string; // مستمر ۲
  final2?: number | string;      // پایانی ۲
}

// Podman Grade State
interface PodmanGradeState {
  continuousScore: number | string; // نمره مستمر از ۵
  competencyScore: number;          // سطح شایستگی: ۱ (عدم احراز)، ۲ (در حد انتظار)، ۳ (بالاتر از حد انتظار)
  notes?: string;
}

// Student Attendance Summary item
interface StudentAttendanceSummary {
  totalSessions: number;
  presentCount: number;
  absentCount: number;
  tardyCount: number;
  presenceRate: number;
  hasExcessiveAbsence: boolean;
}

export const GradebookPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  const isTeacher = user?.role === 'TEACHER';

  // Navigation Steps: 'LESSONS' (انتخاب درس) -> 'CLASSROOMS' (انتخاب کلاس) -> 'SHEET' (ماتریس نمرات)
  const [currentStep, setCurrentStep] = useState<'LESSONS' | 'CLASSROOMS' | 'SHEET'>('LESSONS');

  // Selected Context
  const [selectedLesson, setSelectedLesson] = useState<LessonItem | null>(null);
  const [selectedClassroom, setSelectedClassroom] = useState<ClassroomItem | null>(null);

  // Raw lists
  const [lessonsList, setLessonsList] = useState<LessonItem[]>([]);
  const [classroomsList, setClassroomsList] = useState<ClassroomItem[]>([]);
  const [studentsList, setStudentsList] = useState<StudentItem[]>([]);

  // Search & Filter States
  const [lessonSearchQuery, setLessonSearchQuery] = useState<string>('');
  const [lessonCategoryFilter, setLessonCategoryFilter] = useState<'ALL' | 'GENERAL' | 'MODULAR'>('ALL');
  const [studentSearchQuery, setStudentSearchQuery] = useState<string>('');

  // Modular Podman View State
  const [selectedPodmanNumber, setSelectedPodmanNumber] = useState<number>(1);

  // Grades In-Memory Edit State
  const [generalGrades, setGeneralGrades] = useState<Record<string, GeneralGradeState>>({});
  const [modularGrades, setModularGrades] = useState<Record<string, Record<number, PodmanGradeState>>>({});

  // Attendance Summary Map (synchronized from Attendance module)
  const [attendanceSummaryMap, setAttendanceSummaryMap] = useState<Record<string, StudentAttendanceSummary>>({});

  // Loading & Saving States
  const [isLoadingLessons, setIsLoadingLessons] = useState<boolean>(true);
  const [isLoadingSheet, setIsLoadingSheet] = useState<boolean>(false);
  const [isSavingGrades, setIsSavingGrades] = useState<boolean>(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);

  // 360-Degree Dossier Modal State
  const [dossierStudentId, setDossierStudentId] = useState<string | null>(null);
  const [dossierData, setDossierData] = useState<any>(null);
  const [isLoadingDossier, setIsLoadingDossier] = useState<boolean>(false);
  const [dossierActiveTab, setDossierActiveTab] = useState<'ORAL' | 'HOMEWORK' | 'ATTENDANCE' | 'MATTERS' | 'QUICK_GRADE'>('ORAL');
  const [isRecordingMatter, setIsRecordingMatter] = useState<boolean>(false);
  const [isSubmittingMatter, setIsSubmittingMatter] = useState<boolean>(false);
  const [matterForm, setMatterForm] = useState<{
    type: 'POSITIVE' | 'NEGATIVE';
    title: string;
    points: number;
    description: string;
    actionTaken: string;
    notifiedParents: boolean;
  }>({
    type: 'POSITIVE',
    title: '',
    points: 2,
    description: '',
    actionTaken: '',
    notifiedParents: true,
  });

  // Prevent background body scrolling when 360-degree dossier modal is open
  useEffect(() => {
    if (dossierStudentId) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [dossierStudentId]);

  // ─────────────────────────────────────────────────────────────────────────
  // 1. Initial Load: Fetch Lessons and Classrooms
  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const fetchLessons = async () => {
      try {
        setIsLoadingLessons(true);
        const [lessonsRes, classesRes] = await Promise.all([
          apiClient.get('/classes/lessons'),
          apiClient.get('/classes/classrooms'),
        ]);

        const rawLessons = lessonsRes?.data || lessonsRes || [];
        const rawClassrooms = classesRes?.data || classesRes || [];

        const classroomsArr = Array.isArray(rawClassrooms) ? rawClassrooms : [];
        setClassroomsList(classroomsArr);

        const mappedLessons: LessonItem[] = (Array.isArray(rawLessons) ? rawLessons : []).map((l: any) => ({
          id: l.id,
          name: l.name,
          code: l.code,
          units: l.units,
          type: l.type,
          isModular: !!l.isModular,
          podmanCount: l.podmanCount || 5,
          level: l.level,
          field: l.field,
          classroomsCount: classroomsArr.length,
        }));

        setLessonsList(mappedLessons);

        // Handle URL parameters if coming from another module (e.g. Attendance)
        const lessonIdParam = searchParams.get('lessonId');
        const classIdParam = searchParams.get('classroomId');

        if (lessonIdParam) {
          const foundLesson = mappedLessons.find((l) => l.id === lessonIdParam);
          if (foundLesson) {
            setSelectedLesson(foundLesson);
            if (classIdParam) {
              const foundClass = classroomsArr.find((c: any) => c.id === classIdParam);
              if (foundClass) {
                setSelectedClassroom(foundClass);
                setCurrentStep('SHEET');
              } else {
                setCurrentStep('CLASSROOMS');
              }
            } else {
              setCurrentStep('CLASSROOMS');
            }
          }
        }
      } catch (err: any) {
        console.error('Error fetching lessons:', err);
        toast.error('خطا در دریافت لیست دروس و کلاس‌ها');
      } finally {
        setIsLoadingLessons(false);
      }
    };

    fetchLessons();
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // 2. Fetch Classroom Grade Sheet & Attendance Summary (Synced)
  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (currentStep !== 'SHEET' || !selectedClassroom || !selectedLesson) return;

    const fetchSheetData = async () => {
      try {
        setIsLoadingSheet(true);
        setHasUnsavedChanges(false);

        const [studentsRes, gradebookRes, podmanRes, attendanceSummaryRes] = await Promise.all([
          apiClient.get(`/classes/classrooms/${selectedClassroom.id}/students`),
          apiClient.get(`/gradebook/classroom/${selectedClassroom.id}?lessonId=${selectedLesson.id}`).catch(() => null),
          selectedLesson.isModular
            ? apiClient.get(`/gradebook/classroom/${selectedClassroom.id}/podman-matrix?lessonId=${selectedLesson.id}`).catch(() => null)
            : Promise.resolve(null),
          apiClient.get(`/attendance/classroom/${selectedClassroom.id}/summary?lessonId=${selectedLesson.id}`).catch(() => null),
        ]);

        const rawStudents = studentsRes?.data || studentsRes || [];
        const studentsArr = Array.isArray(rawStudents)
          ? rawStudents
          : Array.isArray(rawStudents?.students)
            ? rawStudents.students
            : Array.isArray(rawStudents?.enrollments)
              ? rawStudents.enrollments
              : [];

        const normalizedStudents: StudentItem[] = studentsArr.map((s: any) => {
          const profile = s.student || (s.user ? s : s);
          const userObj = profile.user || s.user || {};
          const realStudentId = s.studentId || profile.id || s.id;

          return {
            id: realStudentId,
            studentId: realStudentId,
            studentCode: profile.studentCode || s.studentCode || s.code || '',
            nationalCode: userObj.nationalId || s.nationalCode || '',
            firstName: userObj.firstName || s.firstName || 'دانش‌آموز',
            lastName: userObj.lastName || s.lastName || '',
            avatarUrl: userObj.avatarUrl || s.avatarUrl || null,
          };
        });

        setStudentsList(normalizedStudents);

        // Process Attendance Summary Map
        const rawAttSummary = attendanceSummaryRes?.data || attendanceSummaryRes || {};
        if (rawAttSummary && typeof rawAttSummary === 'object') {
          setAttendanceSummaryMap(rawAttSummary);
        } else {
          setAttendanceSummaryMap({});
        }

        // 2.1 Process General Grades
        const generalMap: Record<string, GeneralGradeState> = {};
        normalizedStudents.forEach((st) => {
          generalMap[st.studentId] = {
            continuous1: '',
            final1: '',
            continuous2: '',
            final2: '',
          };
        });

        const rawGradebook = gradebookRes?.data || gradebookRes;
        if (rawGradebook && Array.isArray(rawGradebook.grades)) {
          rawGradebook.grades.forEach((g: any) => {
            if (generalMap[g.studentId]) {
              if (g.gradeType === 'CLASS_ACTIVITY' || g.gradeType === 'MIDTERM') {
                generalMap[g.studentId].continuous1 = g.score;
              } else if (g.gradeType === 'FINAL_TERM_1') {
                generalMap[g.studentId].final1 = g.score;
              } else if (g.gradeType === 'FINAL_TERM_2') {
                generalMap[g.studentId].final2 = g.score;
              }
            }
          });
        }
        setGeneralGrades(generalMap);

        // 2.2 Process Modular Grades
        const podmanMap: Record<string, Record<number, PodmanGradeState>> = {};
        normalizedStudents.forEach((st) => {
          podmanMap[st.studentId] = {};
          for (let i = 1; i <= 5; i++) {
            podmanMap[st.studentId][i] = {
              continuousScore: '',
              competencyScore: 2,
              notes: '',
            };
          }
        });

        const rawPodman = podmanRes?.data || podmanRes;
        if (rawPodman && Array.isArray(rawPodman.students)) {
          rawPodman.students.forEach((pst: any) => {
            const sid = pst.studentId;
            if (podmanMap[sid] && pst.podmanGrades) {
              for (let i = 1; i <= 5; i++) {
                const pg = pst.podmanGrades[i];
                if (pg) {
                  podmanMap[sid][i] = {
                    continuousScore: pg.continuousScore !== undefined ? pg.continuousScore : '',
                    competencyScore: pg.competencyScore || 2,
                    notes: pg.notes || '',
                  };
                }
              }
            }
          });
        }
        setModularGrades(podmanMap);
      } catch (err: any) {
        console.error('Error fetching sheet data:', err);
        toast.error('خطا در بارگذاری جدول ارزشیابی و اسامی دانش‌آموزان');
      } finally {
        setIsLoadingSheet(false);
      }
    };

    fetchSheetData();
  }, [currentStep, selectedClassroom?.id, selectedLesson?.id]);

  // ─────────────────────────────────────────────────────────────────────────
  // 3. 360-Degree Dossier Loader
  // ─────────────────────────────────────────────────────────────────────────
  const handleOpenDossier = async (studentId: string) => {
    if (!selectedClassroom || !selectedLesson) return;
    setDossierStudentId(studentId);
    setDossierActiveTab('ORAL');
    try {
      setIsLoadingDossier(true);
      const res: any = await apiClient.get(
        `/gradebook/student/${studentId}/dossier?classroomId=${selectedClassroom.id}&lessonId=${selectedLesson.id}`,
      );
      const raw = res?.data || res;
      setDossierData(raw?.data || raw);
    } catch (err: any) {
      console.error('Error loading student dossier:', err);
      toast.error('خطا در دریافت پرونده تحصیلی دانش‌آموز');
    } finally {
      setIsLoadingDossier(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // 4. Save Grades
  // ─────────────────────────────────────────────────────────────────────────
  const handleSaveGrades = async () => {
    if (!selectedClassroom || !selectedLesson) return;

    try {
      setIsSavingGrades(true);

      if (selectedLesson.isModular) {
        const payloadStudents = studentsList.map((st) => {
          const sid = st.studentId;
          const podGrades = modularGrades[sid] || {};
          const gradesObj: Record<string, any> = {};

          for (let p = 1; p <= 5; p++) {
            const pData = podGrades[p];
            if (pData && pData.continuousScore !== '') {
              gradesObj[String(p)] = {
                continuousScore: parseFloat(String(pData.continuousScore)),
                competencyScore: pData.competencyScore,
                notes: pData.notes || '',
              };
            }
          }

          return {
            studentId: sid,
            podmanGrades: gradesObj,
          };
        });

        await apiClient.post(`/gradebook/classroom/${selectedClassroom.id}/podman-matrix`, {
          lessonId: selectedLesson.id,
          students: payloadStudents,
        });
      } else {
        const gradesPayload: any[] = [];
        studentsList.forEach((st) => {
          const sid = st.studentId;
          const g = generalGrades[sid];
          if (!g) return;

          if (g.continuous1 !== '' && g.continuous1 !== undefined) {
            gradesPayload.push({
              studentId: sid,
              gradeType: 'CLASS_ACTIVITY',
              score: parseFloat(String(g.continuous1)),
            });
          }
          if (g.final1 !== '' && g.final1 !== undefined) {
            gradesPayload.push({
              studentId: sid,
              gradeType: 'FINAL_TERM_1',
              score: parseFloat(String(g.final1)),
            });
          }
          if (g.continuous2 !== '' && g.continuous2 !== undefined) {
            gradesPayload.push({
              studentId: sid,
              gradeType: 'MIDTERM',
              score: parseFloat(String(g.continuous2)),
            });
          }
          if (g.final2 !== '' && g.final2 !== undefined) {
            gradesPayload.push({
              studentId: sid,
              gradeType: 'FINAL_TERM_2',
              score: parseFloat(String(g.final2)),
            });
          }
        });

        await apiClient.post(`/gradebook/classroom/${selectedClassroom.id}/bulk`, {
          lessonId: selectedLesson.id,
          grades: gradesPayload,
        });
      }

      setHasUnsavedChanges(false);
      toast.success('تمامی نمرات با موفقیت ذخیره شدند');
    } catch (err: any) {
      console.error('Error saving grades:', err);
      toast.error('خطا در ذخیره اطلاعات نمرات. لطفاً مجدداً بررسی فرمایید.');
    } finally {
      setIsSavingGrades(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // 5. Submit Disciplinary Matter
  // ─────────────────────────────────────────────────────────────────────────
  const handleSubmitMatter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dossierStudentId || !selectedClassroom) return;

    if (!matterForm.title.trim()) {
      toast.error('لطفاً عنوان مورد انضباطی یا تشویقی را وارد کنید');
      return;
    }

    try {
      setIsSubmittingMatter(true);
      await apiClient.post('/disciplinary/matters', {
        studentId: dossierStudentId,
        classroomId: selectedClassroom.id,
        lessonId: selectedLesson?.id,
        type: matterForm.type,
        title: matterForm.title.trim(),
        points: Number(matterForm.points),
        description: matterForm.description.trim(),
        actionTaken: matterForm.actionTaken.trim(),
        notifiedParents: matterForm.notifiedParents,
      });

      toast.success(
        matterForm.type === 'POSITIVE'
          ? 'تشویق دانش‌آموز با موفقیت ثبت شد'
          : 'مورد انضباطی ثبت و به اطلاع اولیا رسید',
      );

      setIsRecordingMatter(false);
      setMatterForm({
        type: 'POSITIVE',
        title: '',
        points: 2,
        description: '',
        actionTaken: '',
        notifiedParents: true,
      });

      await handleOpenDossier(dossierStudentId);
    } catch (err: any) {
      console.error('Error submitting matter:', err);
      toast.error('خطا در ثبت مورد انضباطی');
    } finally {
      setIsSubmittingMatter(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Filtered Lists & Calculations
  // ─────────────────────────────────────────────────────────────────────────
  const filteredLessons = useMemo(() => {
    return lessonsList.filter((l) => {
      if (lessonCategoryFilter === 'GENERAL' && l.isModular) return false;
      if (lessonCategoryFilter === 'MODULAR' && !l.isModular) return false;
      if (!lessonSearchQuery.trim()) return true;
      const q = lessonSearchQuery.toLowerCase().trim();
      return l.name.toLowerCase().includes(q) || (l.code && l.code.toLowerCase().includes(q));
    });
  }, [lessonsList, lessonCategoryFilter, lessonSearchQuery]);

  const filteredStudents = useMemo(() => {
    if (!studentSearchQuery.trim()) return studentsList;
    const q = studentSearchQuery.toLowerCase().trim();
    return studentsList.filter((s) => {
      const full = `${s.firstName} ${s.lastName}`.toLowerCase();
      const code = s.studentCode ? s.studentCode.toLowerCase() : '';
      const nat = s.nationalCode ? s.nationalCode.toLowerCase() : '';
      return full.includes(q) || code.includes(q) || nat.includes(q);
    });
  }, [studentsList, studentSearchQuery]);

  // Statistics for current sheet
  const sheetStats = useMemo(() => {
    const total = studentsList.length;
    if (total === 0) return { total: 0, recorded: 0, passRate: 0, average: 0 };

    if (selectedLesson?.isModular) {
      let recorded = 0;
      let passed = 0;
      let sum = 0;

      studentsList.forEach((s) => {
        const podData = modularGrades[s.studentId]?.[selectedPodmanNumber];
        if (podData && podData.continuousScore !== '' && podData.continuousScore !== undefined) {
          const cScore = parseFloat(String(podData.continuousScore));
          const compScore = podData.competencyScore || 1;
          const finalScore = Number((cScore + compScore * 5).toFixed(2));
          recorded++;
          sum += finalScore;
          if (finalScore >= 12) passed++;
        }
      });

      return {
        total,
        recorded,
        passRate: recorded > 0 ? Math.round((passed / recorded) * 100) : 0,
        average: recorded > 0 ? Number((sum / recorded).toFixed(2)) : 0,
      };
    } else if (selectedLesson?.type === 'EXTRACURRICULAR') {
      let recorded = 0;
      let passed = 0;
      let sum = 0;

      studentsList.forEach((s) => {
        const g = generalGrades[s.studentId];
        if (!g) return;
        const f1 = g.final1 !== '' && g.final1 !== undefined ? parseFloat(String(g.final1)) : null;
        const f2 = g.final2 !== '' && g.final2 !== undefined ? parseFloat(String(g.final2)) : null;

        if (f1 !== null && f2 !== null) {
          const annual = Number(((f1 + f2) / 2).toFixed(2));
          recorded++;
          sum += annual;
          if (annual >= 10) passed++;
        } else if (f1 !== null) {
          recorded++;
          sum += f1;
          if (f1 >= 10) passed++;
        } else if (f2 !== null) {
          recorded++;
          sum += f2;
          if (f2 >= 10) passed++;
        }
      });
      return {
        total,
        recorded,
        passRate: recorded > 0 ? Math.round((passed / recorded) * 100) : 0,
        average: recorded > 0 ? Number((sum / recorded).toFixed(2)) : 0,
      };
    } else {
      let recorded = 0;
      let passed = 0;
      let sum = 0;

      studentsList.forEach((s) => {
        const g = generalGrades[s.studentId];
        if (!g) return;
        const c1 = g.continuous1 !== '' ? parseFloat(String(g.continuous1)) : null;
        const f1 = g.final1 !== '' ? parseFloat(String(g.final1)) : null;
        const c2 = g.continuous2 !== '' ? parseFloat(String(g.continuous2)) : null;
        const f2 = g.final2 !== '' ? parseFloat(String(g.final2)) : null;

        if (c1 !== null && f1 !== null && c2 !== null && f2 !== null) {
          const annual = Number(((c1 * 1 + f1 * 2 + c2 * 1 + f2 * 4) / 8).toFixed(2));
          recorded++;
          sum += annual;
          if (annual >= 10) passed++;
        } else if (c1 !== null && f1 !== null) {
          const t1 = Number(((c1 + f1) / 2).toFixed(2));
          recorded++;
          sum += t1;
          if (t1 >= 10) passed++;
        }
      });
      return {
        total,
        recorded,
        passRate: recorded > 0 ? Math.round((passed / recorded) * 100) : 0,
        average: recorded > 0 ? Number((sum / recorded).toFixed(2)) : 0,
      };
    }
  }, [studentsList, selectedLesson, selectedPodmanNumber, generalGrades, modularGrades]);

  return (
    <div className="space-y-4 pb-20 font-sans text-right" dir="rtl">
      {/* ─────────────────────────────────────────────────────────────────────
          PAGE HEADER & CONTROLS MASTER PANEL (Aligned with Schedule Page)
      ───────────────────────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-[#151C28] rounded-2xl border-[1.5px] border-primary-dark/30 dark:border-[#242F42] shadow-[2px_2px_0_#59BBAF] dark:shadow-[2px_2px_0_#0B0F17] p-4 sm:p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-primary/10 text-primary dark:text-primary border border-primary/25 flex items-center justify-center font-black shadow-2xs shrink-0">
              <BookOpen className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg sm:text-2xl font-black text-ink-darker dark:text-white truncate">
                  ارزشیابی و نمرات
                </h1>
                <Badge variant="college" className="text-[11px] sm:text-xs font-bold shrink-0">
                  {isTeacher ? 'پنل اختصاصی مربی' : 'سامانه مدیریت آموزشی'}
                </Badge>
              </div>

              {/* Breadcrumb Navigation */}
              <div className="flex items-center text-xs font-bold text-muted-foreground gap-1.5 mt-1 flex-wrap">
                <button
                  type="button"
                  onClick={() => {
                    setCurrentStep('LESSONS');
                    setSelectedLesson(null);
                    setSelectedClassroom(null);
                  }}
                  className={`hover:text-foreground transition-colors ${currentStep === 'LESSONS' ? 'text-primary font-black' : ''}`}
                >
                  انتخاب درس
                </button>
                {selectedLesson && (
                  <>
                    <ChevronLeft className="w-3.5 h-3.5 text-muted-foreground" />
                    <button
                      type="button"
                      onClick={() => {
                        setCurrentStep('CLASSROOMS');
                        setSelectedClassroom(null);
                      }}
                      className={`hover:text-foreground transition-colors ${currentStep === 'CLASSROOMS' ? 'text-primary font-black' : ''}`}
                    >
                      {selectedLesson.name}
                    </button>
                  </>
                )}
                {selectedClassroom && (
                  <>
                    <ChevronLeft className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-foreground dark:text-slate-200 font-black">
                      کلاس {selectedClassroom.name}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2 self-start md:self-auto shrink-0 flex-wrap">
            {selectedClassroom && selectedLesson && currentStep === 'SHEET' && (
              <button
                type="button"
                onClick={() =>
                  navigate(`/app/teacher/attendance?classroomId=${selectedClassroom.id}&lessonId=${selectedLesson.id}`)
                }
                className="h-10 px-3.5 sm:px-4 rounded-xl border border-primary/30 dark:border-primary/40 bg-primary/5 hover:bg-primary/10 text-primary dark:text-primary font-black text-xs sm:text-sm inline-flex items-center gap-2 transition-all cursor-pointer shadow-2xs"
                title="ورود به دفتر حضور و غیاب برای این کلاس و درس"
              >
                <CalendarCheck className="w-4 h-4 text-primary shrink-0" />
                <span>دفتر حضور و غیاب</span>
              </button>
            )}

            {currentStep !== 'LESSONS' && (
              <button
                type="button"
                onClick={() => {
                  if (currentStep === 'SHEET') setCurrentStep('CLASSROOMS');
                  else if (currentStep === 'CLASSROOMS') setCurrentStep('LESSONS');
                }}
                className="h-10 px-3.5 sm:px-4 rounded-xl border border-gray-200 dark:border-[#242F42] bg-gray-50 dark:bg-[#1C2536] hover:bg-gray-100 dark:hover:bg-[#242F42] text-foreground dark:text-slate-200 active:scale-95 shadow-2xs font-bold text-xs sm:text-sm inline-flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <ArrowRight className="w-4 h-4 ml-1" />
                <span>بازگشت به {currentStep === 'SHEET' ? 'انتخاب کلاس' : 'انتخاب درس'}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────────
          STEP 1: LESSONS GRID VIEW (انتخاب درس)
      ───────────────────────────────────────────────────────────────────── */}
      {currentStep === 'LESSONS' && (
        <div className="space-y-3.5">
          {/* Filter & Search Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-2 sm:p-2.5 rounded-2xl bg-white dark:bg-[#151C28] border border-gray-200/80 dark:border-[#242F42] shadow-xs">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-muted-foreground absolute right-3.5 top-1/2 -translate-y-1/2" />
              <Input
                value={lessonSearchQuery}
                onChange={(e) => setLessonSearchQuery(e.target.value)}
                placeholder="جستجوی درس بر اساس نام یا کد..."
                className="pr-10 h-10 rounded-xl border border-gray-200 dark:border-[#242F42] bg-gray-50/50 dark:bg-[#1C2536] text-xs font-bold"
              />
            </div>

            {/* Category Filter Tabs */}
            <div className="grid grid-cols-3 gap-1 bg-gray-50 dark:bg-[#1C2536] p-1 rounded-xl border border-gray-200 dark:border-[#242F42] text-xs font-bold">
              {[
                { key: 'ALL', label: 'همه دروس' },
                { key: 'GENERAL', label: 'عمومی و نظری' },
                { key: 'MODULAR', label: 'پودمانی و فنی' },
              ].map((cat) => (
                <button
                  key={cat.key}
                  type="button"
                  onClick={() => setLessonCategoryFilter(cat.key as any)}
                  className={`py-1.5 px-3 rounded-lg transition-all text-center ${
                    lessonCategoryFilter === cat.key
                      ? 'bg-white dark:bg-[#151C28] text-primary shadow-xs font-black'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Cards Grid */}
          {isLoadingLessons ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Skeleton key={i} className="h-44 rounded-2xl" />
              ))}
            </div>
          ) : filteredLessons.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-[#151C28] rounded-2xl border border-dashed border-gray-200 dark:border-[#242F42]">
              <BookOpen className="w-10 h-10 text-muted-foreground dark:text-slate-500 mx-auto mb-2 opacity-60" />
              <h3 className="font-bold text-sm text-foreground dark:text-white">درسی یافت نشد</h3>
              <p className="text-xs text-muted-foreground dark:text-slate-400 mt-1">با فیلتر یا عبارت جستجوی دیگری امتحان کنید.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {filteredLessons.map((lesson) => (
                <div
                  key={lesson.id}
                  onClick={() => {
                    setSelectedLesson(lesson);
                    setCurrentStep('CLASSROOMS');
                  }}
                  className="cursor-pointer group relative bg-white dark:bg-[#151C28] border border-gray-200/80 dark:border-[#242F42] p-4 sm:p-5 rounded-2xl shadow-xs transition-all hover:border-primary/50 hover:shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div
                      className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border ${
                        lesson.isModular
                          ? 'bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800/50'
                          : 'bg-primary/10 text-primary border-primary/25'
                      }`}
                    >
                      {lesson.isModular ? (
                        <Layers className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                      ) : (
                        <BookOpen className="w-5 h-5 text-primary" />
                      )}
                    </div>

                    <Badge
                      variant={lesson.isModular ? 'default' : 'neutral'}
                      className={`text-[10px] font-bold py-0.5 px-2.5 rounded-lg ${
                        lesson.isModular
                          ? 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800'
                          : 'border-gray-200 dark:border-[#242F42]'
                      }`}
                    >
                      {lesson.isModular ? 'پودمانی (۵ پودمان)' : lesson.type === 'EXTRACURRICULAR' ? 'فوق‌برنامه' : 'عمومی / نظری'}
                    </Badge>
                  </div>

                  <h3 className="text-base font-black text-foreground dark:text-white group-hover:text-primary transition-colors line-clamp-1">
                    {lesson.name}
                  </h3>

                  <div className="flex items-center gap-2 text-xs text-muted-foreground font-bold mt-2">
                    {lesson.code && (
                      <span className="font-mono bg-gray-50 dark:bg-[#1C2536] px-2 py-0.5 rounded-md border border-gray-200 dark:border-[#242F42]">
                        کد: {lesson.code}
                      </span>
                    )}
                    {lesson.units && (
                      <span>
                        {toPersianDigits(lesson.units)} واحد درسی
                      </span>
                    )}
                  </div>

                  {/* Footer details */}
                  <div className="mt-4 pt-3 border-t border-gray-100 dark:border-[#242F42] flex items-center justify-between text-xs font-black">
                    <span className="flex items-center gap-1.5 text-muted-foreground dark:text-slate-400 font-bold">
                      <Users className="w-4 h-4 text-primary" />
                      {toPersianDigits(lesson.classroomsCount || 0)} کلاس متصل
                    </span>

                    <span className="text-primary flex items-center gap-1 group-hover:underline">
                      انتخاب کلاس
                      <ChevronLeft className="w-4 h-4" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────
          STEP 2: CLASSROOMS GRID VIEW (انتخاب کلاس برای درس مشخص)
      ───────────────────────────────────────────────────────────────────── */}
      {currentStep === 'CLASSROOMS' && selectedLesson && (
        <div className="space-y-3.5">
          {/* Active Lesson Header Strip */}
          <div className="bg-white dark:bg-[#151C28] rounded-2xl border border-gray-200/80 dark:border-[#242F42] p-4 flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                  selectedLesson.isModular
                    ? 'bg-purple-50 dark:bg-purple-950/40 text-purple-600 border-purple-200 dark:border-purple-800'
                    : 'bg-primary/10 text-primary border-primary/25'
                }`}
              >
                {selectedLesson.isModular ? <Layers className="w-5 h-5" /> : <BookOpen className="w-5 h-5" />}
              </div>
              <div>
                <h2 className="text-base font-black text-foreground dark:text-white">
                  درس انتخابی: {selectedLesson.name}
                </h2>
                <p className="text-xs font-bold text-muted-foreground mt-0.5">
                  نوع ارزشیابی:{' '}
                  {selectedLesson.isModular
                    ? 'پودمانی شایستگی‌محور (فنی و حرفه‌ای)'
                    : selectedLesson.type === 'EXTRACURRICULAR'
                    ? 'فوق‌برنامه (ترمی بدون مستمر، نمره از ۲۰)'
                    : 'نمرات رسمی کارنامه (مستمر و پایانی)'}
                </p>
              </div>
            </div>

            <Button
              size="sm"
              variant="outline"
              onClick={() => setCurrentStep('LESSONS')}
              className="rounded-xl border border-gray-200 dark:border-[#242F42] text-xs font-bold"
            >
              تغییر درس
            </Button>
          </div>

          <h3 className="text-sm font-black text-foreground dark:text-white mr-1">
            کلاس‌های متصل به این درس (لطفاً کلاس را انتخاب کنید):
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {classroomsList.map((cls) => (
              <div
                key={cls.id}
                onClick={() => {
                  setSelectedClassroom(cls);
                  setCurrentStep('SHEET');
                }}
                className="cursor-pointer group relative bg-white dark:bg-[#151C28] border border-gray-200/80 dark:border-[#242F42] p-4 sm:p-5 rounded-2xl shadow-xs transition-all hover:border-primary/50 hover:shadow-sm"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary border border-primary/25 flex items-center justify-center font-black">
                    <Users className="w-5 h-5" />
                  </div>
                  <Badge variant="neutral" className="border-gray-200 dark:border-[#242F42] font-bold text-[11px]">
                    {cls.level?.name || 'کلاس درس'}
                  </Badge>
                </div>

                <h4 className="text-base font-black text-foreground dark:text-white group-hover:text-primary transition-colors">
                  کلاس {cls.name}
                </h4>

                <div className="text-xs text-muted-foreground font-bold mt-1">
                  {cls.field?.name ? `رشته: ${cls.field.name}` : 'رشته عمومی مدرسه'}
                </div>

                <div className="mt-4 pt-3 border-t border-gray-100 dark:border-[#242F42] flex items-center justify-between text-xs font-black">
                  <span className="text-muted-foreground flex items-center gap-1 font-bold">
                    <GraduationCap className="w-4 h-4 text-emerald-600" />
                    ورود به شیت نمرات
                  </span>
                  <span className="text-primary flex items-center gap-1 group-hover:underline">
                    ارزشیابی نمرات
                    <ChevronLeft className="w-4 h-4" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────
          STEP 3: SMART EVALUATION SHEET (ماتریس هوشمند نمرات کلاس)
      ───────────────────────────────────────────────────────────────────── */}
      {currentStep === 'SHEET' && selectedLesson && selectedClassroom && (
        <div className="space-y-3.5">
          {/* Top Sheet Toolbar */}
          <div className="bg-white dark:bg-[#151C28] rounded-2xl border border-gray-200/80 dark:border-[#242F42] p-4 sm:p-5 shadow-xs space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div
                  className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border ${
                    selectedLesson.isModular
                      ? 'bg-purple-50 dark:bg-purple-950/40 text-purple-600 border-purple-200 dark:border-purple-800'
                      : 'bg-primary/10 text-primary border-primary/25'
                  }`}
                >
                  {selectedLesson.isModular ? <Layers className="w-5 h-5" /> : <Calculator className="w-5 h-5" />}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-base sm:text-lg font-black text-foreground dark:text-white">
                      کلاس {selectedClassroom.name} — درس {selectedLesson.name}
                    </h2>
                    <Badge
                      variant="neutral"
                      className={`text-[10px] font-bold py-0.5 px-2 rounded-lg ${
                        selectedLesson.isModular
                          ? 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800'
                          : 'bg-primary/10 text-primary border-primary/25'
                      }`}
                    >
                      {selectedLesson.isModular ? 'پودمانی' : selectedLesson.type === 'EXTRACURRICULAR' ? 'فوق‌برنامه' : 'عمومی / کارنامه'}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground font-bold mt-0.5">
                    💡 با کلیک روی نام هر دانش‌آموز، پرونده عملکرد و سوابق تکالیف/پرسش‌های او باز می‌شود.
                  </p>
                </div>
              </div>

              {/* Class Switcher, Quick Attendance & Search */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() =>
                    navigate(`/app/teacher/attendance?classroomId=${selectedClassroom.id}&lessonId=${selectedLesson.id}`)
                  }
                  className="h-10 px-3.5 rounded-xl border border-primary/30 dark:border-primary/40 bg-primary/5 hover:bg-primary/10 text-primary dark:text-primary font-black text-xs inline-flex items-center gap-2 transition-all cursor-pointer shadow-2xs"
                  title="دفتر حضور و غیاب برای این کلاس و درس"
                >
                  <CalendarCheck className="w-4 h-4 text-primary shrink-0" />
                  <span>دفتر حضور و غیاب</span>
                </button>

                <div className="relative min-w-[180px]">
                  <Search className="w-4 h-4 text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2" />
                  <Input
                    value={studentSearchQuery}
                    onChange={(e) => setStudentSearchQuery(e.target.value)}
                    placeholder="جستجوی نام یا کدملی..."
                    className="pr-9 h-10 rounded-xl border border-gray-200 dark:border-[#242F42] bg-gray-50/50 dark:bg-[#1C2536] text-xs font-bold"
                  />
                </div>

                <button
                  type="button"
                  disabled={isSavingGrades}
                  onClick={handleSaveGrades}
                  className="h-10 px-4 rounded-xl bg-primary hover:bg-primary-hover text-white font-black text-xs sm:text-sm border-[1.5px] border-primary-dark shadow-[2px_2px_0_#438C83] dark:shadow-[2px_2px_0_#1F413D] hover:shadow-[2.5px_2.5px_0_#438C83] active:translate-x-[1px] active:translate-y-[1px] cursor-pointer inline-flex items-center gap-2 shrink-0 disabled:opacity-50"
                >
                  {isSavingGrades ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>ذخیره تغییرات نمرات</span>
                </button>
              </div>
            </div>

            {/* Modular Podman Selector Tabs (if modular) */}
            {selectedLesson.isModular && (
              <div className="pt-3 border-t border-gray-100 dark:border-[#242F42] flex items-center justify-between flex-wrap gap-2">
                <span className="text-xs font-black text-foreground dark:text-white flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  انتخاب پودمان جهت نمره‌دهی:
                </span>

                <div className="grid grid-cols-5 gap-1 sm:gap-1.5">
                  {[1, 2, 3, 4, 5].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setSelectedPodmanNumber(num)}
                      className={`py-1.5 px-1 sm:px-3 rounded-xl text-[11px] sm:text-xs font-black transition-all text-center truncate ${
                        selectedPodmanNumber === num
                          ? 'bg-purple-600 text-white shadow-xs'
                          : 'bg-gray-50 dark:bg-[#1C2536] text-muted-foreground border border-gray-200 dark:border-[#242F42] hover:text-foreground'
                      }`}
                    >
                      پودمان {toPersianDigits(num)}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Mini KPI Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3 border-t border-gray-100 dark:border-[#242F42] text-center">
              <div className="bg-gray-50/60 dark:bg-[#1C2536]/60 p-2.5 rounded-xl border border-gray-200/70 dark:border-[#242F42]">
                <span className="text-[10px] font-bold text-muted-foreground block">کل دانش‌آموزان</span>
                <span className="text-sm font-black text-foreground dark:text-white">{toPersianDigits(sheetStats.total)} نفر</span>
              </div>
              <div className="bg-gray-50/60 dark:bg-[#1C2536]/60 p-2.5 rounded-xl border border-gray-200/70 dark:border-[#242F42]">
                <span className="text-[10px] font-bold text-muted-foreground block">نمرات ثبت‌شده</span>
                <span className="text-sm font-black text-primary">{toPersianDigits(sheetStats.recorded)} از {toPersianDigits(sheetStats.total)}</span>
              </div>
              <div className="bg-gray-50/60 dark:bg-[#1C2536]/60 p-2.5 rounded-xl border border-gray-200/70 dark:border-[#242F42]">
                <span className="text-[10px] font-bold text-muted-foreground block">میانگین کلاس</span>
                <span className="text-sm font-black text-primary">{toPersianDigits(sheetStats.average)} از ۲۰</span>
              </div>
              <div className="bg-gray-50/60 dark:bg-[#1C2536]/60 p-2.5 rounded-xl border border-gray-200/70 dark:border-[#242F42]">
                <span className="text-[10px] font-bold text-muted-foreground block">درصد قبولی</span>
                <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">{toPersianDigits(sheetStats.passRate)}٪</span>
              </div>
            </div>
          </div>

          {/* TABLE: GENERAL (THEORY) VS MODULAR (VOCATIONAL) */}
          {isLoadingSheet ? (
            <div className="space-y-2.5">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Skeleton key={i} className="h-14 rounded-2xl" />
              ))}
            </div>
          ) : (
            <div className="bg-white dark:bg-[#151C28] rounded-2xl border border-gray-200/80 dark:border-[#242F42] shadow-xs overflow-hidden">
              {/* Mobile Scroll Cue */}
              <div className="sm:hidden px-3.5 py-1.5 text-[10px] font-bold text-muted-foreground bg-gray-50/70 dark:bg-[#1C2536]/70 border-b border-gray-100 dark:border-[#242F42] flex items-center justify-between">
                <span>👈 برای مشاهده تمام ستون‌ها، جدول را به چپ بکشید</span>
                <span>{toPersianDigits(filteredStudents.length)} دانش‌آموز</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[780px] text-right border-collapse text-xs">
                  <thead>
                    <tr className="bg-gray-50/90 dark:bg-[#1C2536] border-b border-gray-200 dark:border-[#242F42] text-foreground dark:text-white font-black">
                      <th className="py-3 px-3 w-12 text-center">#</th>
                      <th className="py-3 px-4 min-w-[190px]">نام و نام خانوادگی</th>
                      <th className="py-3 px-3 min-w-[90px] text-center">کد دانش‌آموز</th>

                      {/* Attendance Summary Column (Synced from Attendance) */}
                      <th className="py-3 px-3 min-w-[140px] text-center font-black">
                        وضعیت حضور و غیاب
                      </th>

                      {/* Dynamic Columns based on lesson type */}
                      {selectedLesson.isModular ? (
                        <>
                          <th className="py-3 px-3 min-w-[120px] text-center bg-purple-50/40 dark:bg-purple-950/20 font-black text-purple-900 dark:text-purple-300">
                            مستمر پودمان {toPersianDigits(selectedPodmanNumber)} (از ۵)
                          </th>
                          <th className="py-3 px-3 min-w-[180px] text-center bg-sky-50/40 dark:bg-sky-950/20 font-black">
                            سطح شایستگی فنی
                          </th>
                          <th className="py-3 px-3 min-w-[110px] text-center bg-emerald-50/40 dark:bg-emerald-950/20 font-black">
                            نمره پودمان (از ۲۰)
                          </th>
                          <th className="py-3 px-3 min-w-[90px] text-center">وضعیت</th>
                        </>
                      ) : selectedLesson.type === 'EXTRACURRICULAR' ? (
                        <>
                          <th className="py-3 px-3 min-w-[110px] text-center bg-sky-50/40 dark:bg-sky-950/20 font-black">نمره ترم اول (از ۲۰)</th>
                          <th className="py-3 px-3 min-w-[110px] text-center bg-purple-50/40 dark:bg-purple-950/20 font-black">نمره ترم دوم (از ۲۰)</th>
                          <th className="py-3 px-3 min-w-[100px] text-center bg-emerald-50/40 dark:bg-emerald-950/20 font-black">نمره سالانه (از ۲۰)</th>
                          <th className="py-3 px-3 min-w-[85px] text-center font-black">نتیجه</th>
                        </>
                      ) : (
                        <>
                          <th className="py-3 px-3 min-w-[95px] text-center bg-sky-50/40 dark:bg-sky-950/20">مستمر ۱ (از ۲۰)</th>
                          <th className="py-3 px-3 min-w-[95px] text-center bg-sky-50/40 dark:bg-sky-950/20">پایانی ۱ (از ۲۰)</th>
                          <th className="py-3 px-3 min-w-[85px] text-center font-bold text-muted-foreground">نوبت اول</th>
                          <th className="py-3 px-3 min-w-[95px] text-center bg-purple-50/40 dark:bg-purple-950/20">مستمر ۲ (از ۲۰)</th>
                          <th className="py-3 px-3 min-w-[95px] text-center bg-purple-50/40 dark:bg-purple-950/20">پایانی ۲ (از ۲۰)</th>
                          <th className="py-3 px-3 min-w-[95px] text-center bg-emerald-50/40 dark:bg-emerald-950/20 font-black">نمره سالانه</th>
                          <th className="py-3 px-3 min-w-[85px] text-center">نتیجه</th>
                        </>
                      )}

                      <th className="py-3 px-3 w-28 text-center">پرونده ۳۶۰°</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-100 dark:divide-[#242F42]/60">
                    {filteredStudents.map((st, idx) => {
                      const sid = st.studentId;
                      const att = attendanceSummaryMap[sid];

                      if (selectedLesson.isModular) {
                        const podData = modularGrades[sid]?.[selectedPodmanNumber] || {
                          continuousScore: '',
                          competencyScore: 2,
                          notes: '',
                        };

                        const contVal = parseFloat(String(podData.continuousScore));
                        const hasGrade = !isNaN(contVal);
                        const finalScore = hasGrade ? Number((contVal + podData.competencyScore * 5).toFixed(2)) : null;
                        const isPassed = finalScore !== null ? finalScore >= 12 : null;

                        return (
                          <tr key={sid} className="hover:bg-gray-50/60 dark:hover:bg-[#1C2536]/40 transition-colors">
                            <td className="py-2.5 px-3 text-center font-mono font-bold text-muted-foreground">{toPersianDigits(idx + 1)}</td>

                            {/* Student Name: CLICKABLE TO OPEN 360 DOSSIER */}
                            <td className="py-2.5 px-4">
                              <button
                                type="button"
                                onClick={() => handleOpenDossier(sid)}
                                className="text-right group/st flex items-center gap-2 hover:underline focus:outline-none"
                              >
                                <span className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-[#1C2536] border border-gray-200 dark:border-[#242F42] flex items-center justify-center font-bold text-[11px] shrink-0 text-foreground dark:text-white">
                                  {st.firstName?.[0] || 'د'}
                                </span>
                                <div>
                                  <div className="font-black text-foreground dark:text-white group-hover/st:text-primary transition-colors">
                                    {st.firstName} {st.lastName}
                                  </div>
                                  <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                                    <span>مشاهده سوابق</span>
                                    <ExternalLink className="w-2.5 h-2.5" />
                                  </div>
                                </div>
                              </button>
                            </td>

                            <td className="py-2.5 px-3 text-center font-mono font-bold text-muted-foreground">
                              {st.studentCode ? toPersianDigits(st.studentCode) : 'ـ'}
                            </td>

                            {/* Synced Attendance Column */}
                            <td className="py-2.5 px-3 text-center">
                              {att && att.totalSessions > 0 ? (
                                <div className="inline-flex flex-col items-center gap-1">
                                  <div className="flex items-center gap-1 text-[11px] font-bold">
                                    <span className="text-emerald-600 dark:text-emerald-400">
                                      {toPersianDigits(att.presenceRate)}٪ حضور
                                    </span>
                                    <span className="text-muted-foreground">•</span>
                                    <span className={att.absentCount > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-muted-foreground'}>
                                      {toPersianDigits(att.absentCount)} غیبت
                                    </span>
                                  </div>
                                  {att.hasExcessiveAbsence && (
                                    <span className="inline-flex items-center gap-0.5 text-[10px] font-black px-1.5 py-0.5 rounded-md bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                                      <AlertTriangle className="w-3 h-3 text-rose-500 shrink-0" />
                                      خطر محرومیت
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-muted-foreground text-[11px]">بدون جلسه</span>
                              )}
                            </td>

                            {/* Continuous Score Input (0 to 5) */}
                            <td className="py-2.5 px-3 text-center bg-purple-50/20 dark:bg-purple-950/10">
                              <Input
                                type="number"
                                step="0.25"
                                min="0"
                                max="5"
                                value={podData.continuousScore}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setModularGrades((prev) => ({
                                    ...prev,
                                    [sid]: {
                                      ...prev[sid],
                                      [selectedPodmanNumber]: {
                                        ...prev[sid][selectedPodmanNumber],
                                        continuousScore: val,
                                      },
                                    },
                                  }));
                                  setHasUnsavedChanges(true);
                                }}
                                placeholder="۰ تا ۵"
                                className="h-8 w-20 text-center font-bold text-xs mx-auto rounded-xl border border-gray-200 dark:border-[#242F42] bg-white dark:bg-[#151C28]"
                              />
                            </td>

                            {/* Competency Score Selector: 1, 2, 3 */}
                            <td className="py-2.5 px-3 text-center bg-sky-50/20 dark:bg-sky-950/10">
                              <div className="grid grid-cols-3 gap-1 max-w-[170px] mx-auto font-black text-[10px]">
                                {[
                                  { val: 1, label: '۱: عدم احراز' },
                                  { val: 2, label: '۲: در حد انتظار' },
                                  { val: 3, label: '۳: بالاتر' },
                                ].map((item) => (
                                  <button
                                    key={item.val}
                                    type="button"
                                    onClick={() => {
                                      setModularGrades((prev) => ({
                                        ...prev,
                                        [sid]: {
                                          ...prev[sid],
                                          [selectedPodmanNumber]: {
                                            ...prev[sid][selectedPodmanNumber],
                                            competencyScore: item.val,
                                          },
                                        },
                                      }));
                                      setHasUnsavedChanges(true);
                                    }}
                                    className={`py-1 px-1 rounded-lg border transition-all ${
                                      podData.competencyScore === item.val
                                        ? 'bg-sky-500 text-white border-sky-600 shadow-2xs'
                                        : 'bg-white dark:bg-[#151C28] text-muted-foreground border-gray-200 dark:border-[#242F42]'
                                    }`}
                                  >
                                    {item.label}
                                  </button>
                                ))}
                              </div>
                            </td>

                            {/* Final Podman Score (out of 20) */}
                            <td className="py-2.5 px-3 text-center bg-emerald-50/20 dark:bg-emerald-950/10 font-mono font-black text-sm">
                              {finalScore !== null ? (
                                <span className={finalScore >= 12 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>
                                  {toPersianDigits(finalScore)}
                                </span>
                              ) : (
                                <span className="text-muted-foreground">ـ</span>
                              )}
                            </td>

                            {/* Passed status */}
                            <td className="py-2.5 px-3 text-center">
                              {isPassed !== null ? (
                                <Badge
                                  variant={isPassed ? 'default' : 'destructive'}
                                  className={`text-[10px] font-bold py-0.5 px-2 rounded-lg ${
                                    isPassed
                                      ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                      : 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                                  }`}
                                >
                                  {isPassed ? 'قبول' : 'جبرانی'}
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground text-[10px]">ثبت‌نشده</span>
                              )}
                            </td>

                            {/* Dossier button */}
                            <td className="py-2.5 px-3 text-center">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleOpenDossier(sid)}
                                className="h-7 px-2.5 rounded-xl border border-gray-200 dark:border-[#242F42] text-[10px] font-bold"
                              >
                                پرونده ۳۶۰°
                              </Button>
                            </td>
                          </tr>
                        );
                      }

                      // Extracurricular (Termly without continuous grades, out of 20)
                      if (selectedLesson.type === 'EXTRACURRICULAR') {
                        const gData = generalGrades[sid] || {
                          continuous1: '',
                          final1: '',
                          continuous2: '',
                          final2: '',
                        };

                        const f1 = gData.final1 !== '' && gData.final1 !== undefined ? parseFloat(String(gData.final1)) : null;
                        const f2 = gData.final2 !== '' && gData.final2 !== undefined ? parseFloat(String(gData.final2)) : null;

                        const annualGrade =
                          f1 !== null && f2 !== null
                            ? Number(((f1 + f2) / 2).toFixed(2))
                            : f1 !== null
                            ? f1
                            : f2 !== null
                            ? f2
                            : null;

                        const isPassed = annualGrade !== null ? annualGrade >= 10 : null;

                        return (
                          <tr key={sid} className="hover:bg-gray-50/60 dark:hover:bg-[#1C2536]/40 transition-colors">
                            <td className="py-2.5 px-3 text-center font-mono font-bold text-muted-foreground">{toPersianDigits(idx + 1)}</td>

                            {/* Student Name */}
                            <td className="py-2.5 px-4">
                              <button
                                type="button"
                                onClick={() => handleOpenDossier(sid)}
                                className="text-right group/st flex items-center gap-2 hover:underline focus:outline-none"
                              >
                                <span className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-[#1C2536] border border-gray-200 dark:border-[#242F42] flex items-center justify-center font-bold text-[11px] shrink-0 text-foreground dark:text-white">
                                  {st.firstName?.[0] || 'د'}
                                </span>
                                <div>
                                  <div className="font-black text-foreground dark:text-white group-hover/st:text-primary transition-colors">
                                    {st.firstName} {st.lastName}
                                  </div>
                                  <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                                    <span>مشاهده سوابق</span>
                                    <ExternalLink className="w-2.5 h-2.5" />
                                  </div>
                                </div>
                              </button>
                            </td>

                            <td className="py-2.5 px-3 text-center font-mono font-bold text-muted-foreground">
                              {st.studentCode ? toPersianDigits(st.studentCode) : 'ـ'}
                            </td>

                            {/* Synced Attendance Column */}
                            <td className="py-2.5 px-3 text-center">
                              {att && att.totalSessions > 0 ? (
                                <div className="inline-flex flex-col items-center gap-1">
                                  <div className="flex items-center gap-1 text-[11px] font-bold">
                                    <span className="text-emerald-600 dark:text-emerald-400">
                                      {toPersianDigits(att.presenceRate)}٪ حضور
                                    </span>
                                    <span className="text-muted-foreground">•</span>
                                    <span className={att.absentCount > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-muted-foreground'}>
                                      {toPersianDigits(att.absentCount)} غیبت
                                    </span>
                                  </div>
                                  {att.hasExcessiveAbsence && (
                                    <span className="inline-flex items-center gap-0.5 text-[10px] font-black px-1.5 py-0.5 rounded-md bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                                      <AlertTriangle className="w-3 h-3 text-rose-500 shrink-0" />
                                      خطر محرومیت
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-muted-foreground text-[11px]">بدون جلسه</span>
                              )}
                            </td>

                            {/* Term 1 Final Score (out of 20) */}
                            <td className="py-2.5 px-3 text-center bg-sky-50/20 dark:bg-sky-950/10">
                              <Input
                                type="number"
                                step="0.25"
                                min="0"
                                max="20"
                                value={gData.final1}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setGeneralGrades((prev) => ({
                                    ...prev,
                                    [sid]: { ...prev[sid], final1: val },
                                  }));
                                  setHasUnsavedChanges(true);
                                }}
                                placeholder="۰-۲۰"
                                className="h-8 w-20 text-center font-bold text-xs mx-auto rounded-xl border border-gray-200 dark:border-[#242F42] bg-white dark:bg-[#151C28]"
                              />
                            </td>

                            {/* Term 2 Final Score (out of 20) */}
                            <td className="py-2.5 px-3 text-center bg-purple-50/20 dark:bg-purple-950/10">
                              <Input
                                type="number"
                                step="0.25"
                                min="0"
                                max="20"
                                value={gData.final2}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setGeneralGrades((prev) => ({
                                    ...prev,
                                    [sid]: { ...prev[sid], final2: val },
                                  }));
                                  setHasUnsavedChanges(true);
                                }}
                                placeholder="۰-۲۰"
                                className="h-8 w-20 text-center font-bold text-xs mx-auto rounded-xl border border-gray-200 dark:border-[#242F42] bg-white dark:bg-[#151C28]"
                              />
                            </td>

                            {/* Annual Grade */}
                            <td className="py-2.5 px-3 text-center bg-emerald-50/20 dark:bg-emerald-950/10 font-mono font-black text-sm">
                              {annualGrade !== null ? (
                                <span className={annualGrade >= 10 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>
                                  {toPersianDigits(annualGrade)}
                                </span>
                              ) : (
                                <span className="text-muted-foreground">ـ</span>
                              )}
                            </td>

                            {/* Passed status */}
                            <td className="py-2.5 px-3 text-center">
                              {isPassed !== null ? (
                                <Badge
                                  variant={isPassed ? 'default' : 'destructive'}
                                  className={`text-[10px] font-bold py-0.5 px-2 rounded-lg ${
                                    isPassed
                                      ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                      : 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                                  }`}
                                >
                                  {isPassed ? 'قبول' : 'تجدید'}
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground text-[10px]">ناتمام</span>
                              )}
                            </td>

                            {/* Dossier Button */}
                            <td className="py-2.5 px-3 text-center">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleOpenDossier(sid)}
                                className="h-7 px-2.5 rounded-xl border border-gray-200 dark:border-[#242F42] text-[10px] font-bold"
                              >
                                پرونده ۳۶۰°
                              </Button>
                            </td>
                          </tr>
                        );
                      }

                      // General Theory Lesson Row
                      const gData = generalGrades[sid] || {
                        continuous1: '',
                        final1: '',
                        continuous2: '',
                        final2: '',
                      };

                      const c1 = gData.continuous1 !== '' ? parseFloat(String(gData.continuous1)) : null;
                      const f1 = gData.final1 !== '' ? parseFloat(String(gData.final1)) : null;
                      const c2 = gData.continuous2 !== '' ? parseFloat(String(gData.continuous2)) : null;
                      const f2 = gData.final2 !== '' ? parseFloat(String(gData.final2)) : null;

                      const term1Avg = c1 !== null && f1 !== null ? Number(((c1 + f1) / 2).toFixed(2)) : null;

                      const hasAnnual = c1 !== null && f1 !== null && c2 !== null && f2 !== null;
                      const annualGrade = hasAnnual
                        ? Number(((c1 * 1 + f1 * 2 + c2 * 1 + f2 * 4) / 8).toFixed(2))
                        : null;
                      const isPassed = annualGrade !== null ? annualGrade >= 10 : null;

                      return (
                        <tr key={sid} className="hover:bg-gray-50/60 dark:hover:bg-[#1C2536]/40 transition-colors">
                          <td className="py-2.5 px-3 text-center font-mono font-bold text-muted-foreground">{toPersianDigits(idx + 1)}</td>

                          {/* Student Name: CLICKABLE TO OPEN 360 DOSSIER */}
                          <td className="py-2.5 px-4">
                            <button
                              type="button"
                              onClick={() => handleOpenDossier(sid)}
                              className="text-right group/st flex items-center gap-2 hover:underline focus:outline-none"
                            >
                              <span className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-[#1C2536] border border-gray-200 dark:border-[#242F42] flex items-center justify-center font-bold text-[11px] shrink-0 text-foreground dark:text-white">
                                {st.firstName?.[0] || 'د'}
                              </span>
                              <div>
                                <div className="font-black text-foreground dark:text-white group-hover/st:text-primary transition-colors">
                                  {st.firstName} {st.lastName}
                                </div>
                                <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                                  <span>مشاهده سوابق</span>
                                  <ExternalLink className="w-2.5 h-2.5" />
                                </div>
                              </div>
                            </button>
                          </td>

                          <td className="py-2.5 px-3 text-center font-mono font-bold text-muted-foreground">
                            {st.studentCode ? toPersianDigits(st.studentCode) : 'ـ'}
                          </td>

                          {/* Synced Attendance Column */}
                          <td className="py-2.5 px-3 text-center">
                            {att && att.totalSessions > 0 ? (
                              <div className="inline-flex flex-col items-center gap-1">
                                <div className="flex items-center gap-1 text-[11px] font-bold">
                                  <span className="text-emerald-600 dark:text-emerald-400">
                                    {toPersianDigits(att.presenceRate)}٪ حضور
                                  </span>
                                  <span className="text-muted-foreground">•</span>
                                  <span className={att.absentCount > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-muted-foreground'}>
                                    {toPersianDigits(att.absentCount)} غیبت
                                  </span>
                                </div>
                                {att.hasExcessiveAbsence && (
                                  <span className="inline-flex items-center gap-0.5 text-[10px] font-black px-1.5 py-0.5 rounded-md bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                                    <AlertTriangle className="w-3 h-3 text-rose-500 shrink-0" />
                                    خطر محرومیت
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-[11px]">بدون جلسه</span>
                            )}
                          </td>

                          {/* Continuous 1 */}
                          <td className="py-2.5 px-3 text-center bg-sky-50/20 dark:bg-sky-950/10">
                            <Input
                              type="number"
                              step="0.25"
                              min="0"
                              max="20"
                              value={gData.continuous1}
                              onChange={(e) => {
                                const val = e.target.value;
                                setGeneralGrades((prev) => ({
                                  ...prev,
                                  [sid]: { ...prev[sid], continuous1: val },
                                }));
                                setHasUnsavedChanges(true);
                              }}
                              placeholder="۰-۲۰"
                              className="h-8 w-16 text-center font-bold text-xs mx-auto rounded-xl border border-gray-200 dark:border-[#242F42] bg-white dark:bg-[#151C28]"
                            />
                          </td>

                          {/* Final 1 */}
                          <td className="py-2.5 px-3 text-center bg-sky-50/20 dark:bg-sky-950/10">
                            <Input
                              type="number"
                              step="0.25"
                              min="0"
                              max="20"
                              value={gData.final1}
                              onChange={(e) => {
                                const val = e.target.value;
                                setGeneralGrades((prev) => ({
                                  ...prev,
                                  [sid]: { ...prev[sid], final1: val },
                                }));
                                setHasUnsavedChanges(true);
                              }}
                              placeholder="۰-۲۰"
                              className="h-8 w-16 text-center font-bold text-xs mx-auto rounded-xl border border-gray-200 dark:border-[#242F42] bg-white dark:bg-[#151C28]"
                            />
                          </td>

                          {/* Term 1 Avg */}
                          <td className="py-2.5 px-3 text-center font-mono font-bold text-muted-foreground">
                            {term1Avg !== null ? toPersianDigits(term1Avg) : 'ـ'}
                          </td>

                          {/* Continuous 2 */}
                          <td className="py-2.5 px-3 text-center bg-purple-50/20 dark:bg-purple-950/10">
                            <Input
                              type="number"
                              step="0.25"
                              min="0"
                              max="20"
                              value={gData.continuous2}
                              onChange={(e) => {
                                const val = e.target.value;
                                setGeneralGrades((prev) => ({
                                  ...prev,
                                  [sid]: { ...prev[sid], continuous2: val },
                                }));
                                setHasUnsavedChanges(true);
                              }}
                              placeholder="۰-۲۰"
                              className="h-8 w-16 text-center font-bold text-xs mx-auto rounded-xl border border-gray-200 dark:border-[#242F42] bg-white dark:bg-[#151C28]"
                            />
                          </td>

                          {/* Final 2 */}
                          <td className="py-2.5 px-3 text-center bg-purple-50/20 dark:bg-purple-950/10">
                            <Input
                              type="number"
                              step="0.25"
                              min="0"
                              max="20"
                              value={gData.final2}
                              onChange={(e) => {
                                const val = e.target.value;
                                setGeneralGrades((prev) => ({
                                  ...prev,
                                  [sid]: { ...prev[sid], final2: val },
                                }));
                                setHasUnsavedChanges(true);
                              }}
                              placeholder="۰-۲۰"
                              className="h-8 w-16 text-center font-bold text-xs mx-auto rounded-xl border border-gray-200 dark:border-[#242F42] bg-white dark:bg-[#151C28]"
                            />
                          </td>

                          {/* Annual Grade */}
                          <td className="py-2.5 px-3 text-center bg-emerald-50/20 dark:bg-emerald-950/10 font-mono font-black text-sm">
                            {annualGrade !== null ? (
                              <span className={annualGrade >= 10 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>
                                {toPersianDigits(annualGrade)}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">ـ</span>
                            )}
                          </td>

                          {/* Passed status */}
                          <td className="py-2.5 px-3 text-center">
                            {isPassed !== null ? (
                              <Badge
                                variant={isPassed ? 'default' : 'destructive'}
                                className={`text-[10px] font-bold py-0.5 px-2 rounded-lg ${
                                  isPassed
                                    ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                    : 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                                }`}
                              >
                                {isPassed ? 'قبول' : 'تجدید'}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground text-[10px]">ناتمام</span>
                            )}
                          </td>

                          {/* Dossier Button */}
                          <td className="py-2.5 px-3 text-center">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleOpenDossier(sid)}
                              className="h-7 px-2.5 rounded-xl border border-gray-200 dark:border-[#242F42] text-[10px] font-bold"
                            >
                              پرونده ۳۶۰°
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {/* Mobile Floating Save Bar */}
          {hasUnsavedChanges && (
            <div className="sm:hidden fixed bottom-4 inset-x-4 z-40 bg-white/95 dark:bg-[#151C28]/95 backdrop-blur-md p-3 rounded-2xl border border-primary/40 shadow-xl flex items-center justify-between gap-3 animate-in slide-in-from-bottom">
              <div className="text-xs font-bold text-foreground dark:text-white flex items-center gap-1.5 min-w-0 truncate">
                <span className="w-2 h-2 rounded-full bg-primary animate-ping shrink-0" />
                <span className="truncate">تغییرات ذخیره‌نشده دارید</span>
              </div>
              <button
                type="button"
                disabled={isSavingGrades}
                onClick={handleSaveGrades}
                className="h-9 px-3.5 rounded-xl bg-primary hover:bg-primary-hover text-white font-black text-xs inline-flex items-center gap-1.5 shadow-xs shrink-0 cursor-pointer disabled:opacity-50"
              >
                {isSavingGrades ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                <span>ذخیره نمرات</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────
          STEP 4: 360-DEGREE STUDENT DOSSIER MODAL (پرونده ۳۶۰ درجه عملکرد)
      ───────────────────────────────────────────────────────────────────── */}
      {dossierStudentId && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-5 bg-black/60 animate-in fade-in"
          onClick={() => {
            setDossierStudentId(null);
            setDossierData(null);
          }}
        >
          <div
            className="relative w-full max-w-3xl max-h-[90vh] bg-white dark:bg-[#151C28] border border-gray-200 dark:border-[#242F42] rounded-t-2xl sm:rounded-2xl shadow-xl overflow-hidden flex flex-col text-right overscroll-contain"
            dir="rtl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Mobile Drag Pill */}
            <div className="w-10 h-1 bg-gray-300 dark:bg-gray-600 rounded-full mx-auto sm:hidden mt-2.5 mb-1" />

            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-gray-200 dark:border-[#242F42] bg-gray-50/70 dark:bg-[#1C2536] flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary border border-primary/25 flex items-center justify-center font-black text-lg">
                  {dossierData?.student?.firstName?.[0] || 'د'}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base sm:text-lg font-black text-foreground dark:text-white">
                      {dossierData?.student?.name || 'پرونده تحصیلی دانش‌آموز'}
                    </h3>
                    {dossierData?.kpis?.overallScore !== null && dossierData?.kpis?.overallScore !== undefined && (
                      <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-lg border border-primary/25 font-mono font-black text-xs">
                        شاخص کل: {toPersianDigits(dossierData.kpis.overallScore)} از ۲۰
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground font-bold mt-0.5">
                    کلاس {selectedClassroom?.name} • درس {selectedLesson?.name}
                    {dossierData?.student?.studentCode && ` • کد دانش‌آموزی: ${toPersianDigits(dossierData.student.studentCode)}`}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setDossierStudentId(null);
                  setDossierData(null);
                }}
                className="w-8 h-8 rounded-xl border border-gray-200 dark:border-[#242F42] bg-white dark:bg-[#151C28] hover:bg-gray-100 dark:hover:bg-[#1C2536] flex items-center justify-center font-bold text-sm text-foreground dark:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-6 overflow-y-auto overscroll-contain space-y-4 flex-1">
              {isLoadingDossier ? (
                <div className="py-16 text-center space-y-3">
                  <RefreshCw className="w-8 h-8 text-primary animate-spin mx-auto" />
                  <p className="text-xs font-black text-foreground dark:text-white">در حال واکشی اطلاعات پرونده ۳۶۰ درجه دانش‌آموز...</p>
                </div>
              ) : !dossierData ? (
                <div className="py-10 text-center text-xs text-muted-foreground font-bold">
                  اطلاعاتی برای این دانش‌آموز ثبت نشده است.
                </div>
              ) : (
                <>
                  {/* KPI Strip */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-gray-50/60 dark:bg-[#1C2536]/60 border border-gray-200/80 dark:border-[#242F42] p-2.5 rounded-xl text-center">
                    <div className="bg-white dark:bg-[#151C28] p-2 rounded-lg border border-gray-200/60 dark:border-[#242F42]">
                      <span className="text-[10px] font-bold text-muted-foreground block">درصد حضور در درس</span>
                      <span className="text-sm font-black text-foreground dark:text-white">
                        {toPersianDigits(dossierData.kpis?.attendanceRate || 100)}٪
                      </span>
                      <span className="text-[9px] text-muted-foreground block mt-0.5">
                        ({toPersianDigits(dossierData.kpis?.presentCount || 0)} حاضر / {toPersianDigits(dossierData.kpis?.absentCount || 0)} غایب)
                      </span>
                    </div>

                    <div className="bg-white dark:bg-[#151C28] p-2 rounded-lg border border-gray-200/60 dark:border-[#242F42]">
                      <span className="text-[10px] font-bold text-muted-foreground block">میانگین پرسش کلاسی</span>
                      <span className="text-sm font-black text-primary">
                        {dossierData.kpis?.oralAverage !== null
                          ? `${toPersianDigits(dossierData.kpis.oralAverage)} از ۲۰`
                          : 'ثبت‌نشده'}
                      </span>
                      <span className="text-[9px] text-muted-foreground block mt-0.5">
                        ({toPersianDigits(dossierData.kpis?.oralGradesCount || 0)} جلسه پرسش)
                      </span>
                    </div>

                    <div className="bg-white dark:bg-[#151C28] p-2 rounded-lg border border-gray-200/60 dark:border-[#242F42]">
                      <span className="text-[10px] font-bold text-muted-foreground block">وضعیت تکالیف</span>
                      <span className="text-sm font-black text-sky-600 dark:text-sky-400">
                        {toPersianDigits(dossierData.kpis?.submittedHomeworks || 0)} از {toPersianDigits(dossierData.kpis?.totalHomeworks || 0)}
                      </span>
                      <span className="text-[9px] text-muted-foreground block mt-0.5">
                        میانگین: {dossierData.kpis?.homeworkAverage !== null ? toPersianDigits(dossierData.kpis.homeworkAverage) : 'ـ'}
                      </span>
                    </div>

                    <div
                      onClick={() => setDossierActiveTab('MATTERS')}
                      className={`p-2 rounded-lg border transition-all cursor-pointer select-none ${
                        dossierActiveTab === 'MATTERS'
                          ? 'bg-primary/10 border-primary shadow-xs'
                          : 'bg-white dark:bg-[#151C28] border-gray-200/60 dark:border-[#242F42] hover:border-primary/50'
                      }`}
                      title="مشاهده موارد انضباطی و تشویقی"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-muted-foreground block">برآیند انضباطی</span>
                        <Scale className="w-3 h-3 text-primary" />
                      </div>
                      <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                        {toPersianDigits(dossierData.kpis?.positiveRewardsCount || 0)} تشویق
                      </span>
                      <span className="text-[9px] text-rose-600 dark:text-rose-400 block mt-0.5 font-bold">
                        {toPersianDigits(dossierData.kpis?.negativeDisciplineCount || 0)} تذکر/منفی
                      </span>
                    </div>
                  </div>

                  {/* Modal Navigation Tabs */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 bg-gray-50 dark:bg-[#1C2536] p-1 rounded-xl border border-gray-200 dark:border-[#242F42] text-xs font-black">
                    <button
                      type="button"
                      onClick={() => setDossierActiveTab('ORAL')}
                      className={`py-2 px-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                        dossierActiveTab === 'ORAL'
                          ? 'bg-white dark:bg-[#151C28] text-foreground dark:text-white shadow-xs font-black'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <Award className="w-3.5 h-3.5 text-primary" />
                      پرسش کلاسی
                    </button>

                    <button
                      type="button"
                      onClick={() => setDossierActiveTab('HOMEWORK')}
                      className={`py-2 px-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                        dossierActiveTab === 'HOMEWORK'
                          ? 'bg-white dark:bg-[#151C28] text-foreground dark:text-white shadow-xs font-black'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <FileCheck className="w-3.5 h-3.5 text-sky-500" />
                      سوابق تکالیف
                    </button>

                    <button
                      type="button"
                      onClick={() => setDossierActiveTab('ATTENDANCE')}
                      className={`py-2 px-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                        dossierActiveTab === 'ATTENDANCE'
                          ? 'bg-white dark:bg-[#151C28] text-foreground dark:text-white shadow-xs font-black'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <UserCheck className="w-3.5 h-3.5 text-emerald-500" />
                      حضور و غیاب
                    </button>

                    <button
                      type="button"
                      onClick={() => setDossierActiveTab('MATTERS')}
                      className={`py-2 px-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                        dossierActiveTab === 'MATTERS'
                          ? 'bg-white dark:bg-[#151C28] text-foreground dark:text-white shadow-xs font-black'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <Scale className="w-3.5 h-3.5 text-primary" />
                      انضباط و تشویق
                    </button>
                  </div>

                  {/* Tab 1: Oral Grades History */}
                  {dossierActiveTab === 'ORAL' && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-black text-foreground dark:text-white">
                          ریز نمرات ارزشیابی مستمر و پرسش‌های کلاسی
                        </h4>
                        <span className="text-[11px] font-bold text-muted-foreground">
                          {toPersianDigits(dossierData.oralGrades?.length || 0)} مورد ثبت‌شده
                        </span>
                      </div>

                      {dossierData.oralGrades?.length === 0 ? (
                        <div className="py-8 text-center bg-gray-50 dark:bg-[#1C2536] border border-dashed border-gray-200 dark:border-[#242F42] rounded-xl text-xs text-muted-foreground font-bold">
                          تاکنون نمره پرسش کلاسی مستقلی برای این دانش‌آموز در این درس ثبت نشده است.
                        </div>
                      ) : (
                        <div className="divide-y divide-gray-100 dark:divide-[#242F42] border border-gray-200 dark:border-[#242F42] rounded-xl overflow-hidden bg-white dark:bg-[#151C28]">
                          {dossierData.oralGrades.map((og: any) => (
                            <div key={og.id} className="p-3 flex items-center justify-between text-xs hover:bg-gray-50 dark:hover:bg-[#1C2536] transition-colors">
                              <div className="flex items-center gap-2.5">
                                <span className="w-7 h-7 rounded-lg bg-primary/10 text-primary font-mono font-black flex items-center justify-center text-xs">
                                  {toPersianDigits(og.score)}
                                </span>
                                <div>
                                  <div className="font-bold text-foreground dark:text-white">
                                    {og.title || 'ارزشیابی کلاسی'}
                                  </div>
                                  <div className="text-[10px] text-muted-foreground">
                                    {formatJalaliDisplay(og.recordedAt, true)}
                                    {og.topic && ` • مبحث: ${og.topic}`}
                                  </div>
                                </div>
                              </div>

                              {og.feedback && (
                                <span className="text-[11px] text-muted-foreground bg-gray-50 dark:bg-[#1C2536] px-2 py-1 rounded-md max-w-xs truncate">
                                  {og.feedback}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Tab 2: Homeworks History */}
                  {dossierActiveTab === 'HOMEWORK' && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-black text-foreground dark:text-white">
                          سوابق ارسال و تصحیح تکالیف کلاسی
                        </h4>
                        <span className="text-[11px] font-bold text-muted-foreground">
                          {toPersianDigits(dossierData.homeworks?.length || 0)} تکلیف در سامانه
                        </span>
                      </div>

                      {dossierData.homeworks?.length === 0 ? (
                        <div className="py-8 text-center bg-gray-50 dark:bg-[#1C2536] border border-dashed border-gray-200 dark:border-[#242F42] rounded-xl text-xs text-muted-foreground font-bold">
                          تکلیفی در ارتباط با این درس برای کلاس تعریف نشده است.
                        </div>
                      ) : (
                        <div className="divide-y divide-gray-100 dark:divide-[#242F42] border border-gray-200 dark:border-[#242F42] rounded-xl overflow-hidden bg-white dark:bg-[#151C28]">
                          {dossierData.homeworks.map((hw: any) => (
                            <div key={hw.id} className="p-3 flex items-center justify-between text-xs hover:bg-gray-50 dark:hover:bg-[#1C2536] transition-colors">
                              <div>
                                <div className="font-bold text-foreground dark:text-white">{hw.title}</div>
                                <div className="text-[10px] text-muted-foreground">
                                  مهلت: {formatJalaliDisplay(hw.dueDate, false)}
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                <Badge
                                  variant={hw.submission ? 'default' : 'destructive'}
                                  className={`text-[10px] font-bold ${
                                    hw.submission
                                      ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                                      : 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                                  }`}
                                >
                                  {hw.submission ? 'تحویل داده شده' : 'عدم تحویل'}
                                </Badge>
                                {hw.submission?.score !== undefined && (
                                  <span className="font-mono font-black text-xs text-primary">
                                    {toPersianDigits(hw.submission.score)} / {toPersianDigits(hw.maxScore || 20)}
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Tab 3: Attendance History & Direct Jump */}
                  {dossierActiveTab === 'ATTENDANCE' && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <h4 className="text-xs font-black text-foreground dark:text-white">
                          سوابق حضور، غیاب و تاخیر در کلاس
                        </h4>

                        {selectedClassroom && selectedLesson && (
                          <button
                            type="button"
                            onClick={() => {
                              setDossierStudentId(null);
                              navigate(`/app/teacher/attendance?classroomId=${selectedClassroom.id}&lessonId=${selectedLesson.id}`);
                            }}
                            className="h-8 px-3 rounded-lg border border-primary/30 bg-primary/10 hover:bg-primary/20 text-primary font-black text-[11px] inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <CalendarCheck className="w-3.5 h-3.5" />
                            <span>ورود به دفتر حضور و غیاب</span>
                          </button>
                        )}
                      </div>

                      {dossierData.attendance?.length === 0 ? (
                        <div className="py-8 text-center bg-gray-50 dark:bg-[#1C2536] border border-dashed border-gray-200 dark:border-[#242F42] rounded-xl text-xs text-muted-foreground font-bold">
                          تاکنون جلسه حضوری برای این درس در سامانه ثبت نهایی نشده است.
                        </div>
                      ) : (
                        <div className="divide-y divide-gray-100 dark:divide-[#242F42] border border-gray-200 dark:border-[#242F42] rounded-xl overflow-hidden bg-white dark:bg-[#151C28]">
                          {dossierData.attendance.map((attItem: any, aIdx: number) => {
                            const isPresent = attItem.status === 'PRESENT';
                            const isAbsent = attItem.status === 'ABSENT';
                            const isTardy = attItem.status === 'TARDY';

                            return (
                              <div key={aIdx} className="p-3 flex items-center justify-between text-xs hover:bg-gray-50 dark:hover:bg-[#1C2536] transition-colors">
                                <div className="flex items-center gap-2">
                                  <Clock className="w-4 h-4 text-muted-foreground" />
                                  <div>
                                    <div className="font-bold text-foreground dark:text-white">
                                      جلسه مورخ {formatJalaliDisplay(attItem.date, false)}
                                    </div>
                                    {attItem.periodNumber && (
                                      <div className="text-[10px] text-muted-foreground">
                                        زنگ {toPersianDigits(attItem.periodNumber)}
                                      </div>
                                    )}
                                  </div>
                                </div>

                                <div className="flex items-center gap-2">
                                  <Badge
                                    variant="neutral"
                                    className={`text-[10px] font-bold ${
                                      isPresent
                                        ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                                        : isAbsent
                                          ? 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                                          : isTardy
                                            ? 'bg-orange-50 dark:bg-orange-950/50 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800'
                                            : 'bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800'
                                    }`}
                                  >
                                    {isPresent && 'حاضر'}
                                    {isAbsent && 'غایب'}
                                    {isTardy && `تاخیر (${toPersianDigits(attItem.delayMinutes || 0)} دقیقه)`}
                                    {!isPresent && !isAbsent && !isTardy && 'موجه'}
                                  </Badge>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Tab 4: Disciplinary Matters */}
                  {dossierActiveTab === 'MATTERS' && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-black text-foreground dark:text-white">
                          سوابق موارد انضباطی، تشویقی و تذکرات
                        </h4>

                        {!isRecordingMatter && (
                          <Button
                            size="sm"
                            onClick={() => setIsRecordingMatter(true)}
                            className="h-8 px-3 rounded-xl bg-primary text-white text-xs font-black"
                          >
                            <Plus className="w-3.5 h-3.5 ml-1" />
                            ثبت مورد جدید
                          </Button>
                        )}
                      </div>

                      {/* Record Matter Form */}
                      {isRecordingMatter && (
                        <form
                          onSubmit={handleSubmitMatter}
                          className="bg-gray-50 dark:bg-[#1C2536] border border-gray-200 dark:border-[#242F42] p-4 rounded-xl space-y-3"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-black text-foreground dark:text-white">فرم ثبت مورد رفتاری / انضباطی</span>
                            <div className="flex items-center gap-1 bg-white dark:bg-[#151C28] p-1 rounded-lg border border-gray-200 dark:border-[#242F42]">
                              <button
                                type="button"
                                onClick={() => setMatterForm((prev) => ({ ...prev, type: 'POSITIVE', points: 2 }))}
                                className={`px-2.5 py-1 rounded text-xs font-black transition-all ${
                                  matterForm.type === 'POSITIVE'
                                    ? 'bg-emerald-500 text-white shadow-2xs'
                                    : 'text-muted-foreground'
                                }`}
                              >
                                تشویقی (+)
                              </button>
                              <button
                                type="button"
                                onClick={() => setMatterForm((prev) => ({ ...prev, type: 'NEGATIVE', points: -2 }))}
                                className={`px-2.5 py-1 rounded text-xs font-black transition-all ${
                                  matterForm.type === 'NEGATIVE'
                                    ? 'bg-rose-500 text-white shadow-2xs'
                                    : 'text-muted-foreground'
                                }`}
                              >
                                انضباطی (-)
                              </button>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <div className="sm:col-span-2">
                              <label className="text-[10px] font-bold text-muted-foreground block mb-1">
                                عنوان مورد *
                              </label>
                              <Input
                                value={matterForm.title}
                                onChange={(e) =>
                                  setMatterForm((prev) => ({ ...prev, title: e.target.value }))
                                }
                                placeholder={
                                  matterForm.type === 'POSITIVE'
                                    ? 'مثال: مشارکت فوق‌العاده در پروژه گروهی'
                                    : 'مثال: عدم رعایت نظم در کارگاه'
                                }
                                className="h-8 text-xs font-bold rounded-lg border border-gray-200 dark:border-[#242F42]"
                                required
                              />
                            </div>

                            <div>
                              <label className="text-[10px] font-bold text-muted-foreground block mb-1">
                                امتیاز انضباطی
                              </label>
                              <Input
                                type="number"
                                value={matterForm.points}
                                onChange={(e) =>
                                  setMatterForm((prev) => ({
                                    ...prev,
                                    points: Number(e.target.value),
                                  }))
                                }
                                className="h-8 text-xs font-bold rounded-lg border border-gray-200 dark:border-[#242F42] text-center"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="text-[10px] font-bold text-muted-foreground block mb-1">
                              توضیحات و جزئیات (اختیاری)
                            </label>
                            <Input
                              value={matterForm.description}
                              onChange={(e) =>
                                setMatterForm((prev) => ({ ...prev, description: e.target.value }))
                              }
                              placeholder="توضیحات تکمیلی..."
                              className="h-8 text-xs rounded-lg border border-gray-200 dark:border-[#242F42]"
                            />
                          </div>

                          <div className="flex items-center justify-between pt-1">
                            <label className="flex items-center gap-1.5 text-[11px] font-bold text-foreground dark:text-white cursor-pointer">
                              <input
                                type="checkbox"
                                checked={matterForm.notifiedParents}
                                onChange={(e) =>
                                  setMatterForm((prev) => ({
                                    ...prev,
                                    notifiedParents: e.target.checked,
                                  }))
                                }
                                className="rounded accent-primary"
                              />
                              ارسال نوتیفیکیشن به اولیا و دانش‌آموز
                            </label>

                            <div className="flex items-center gap-1.5">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setIsRecordingMatter(false)}
                                className="h-7 text-xs rounded-lg border border-gray-200 dark:border-[#242F42]"
                              >
                                انصراف
                              </Button>
                              <Button
                                type="submit"
                                size="sm"
                                disabled={isSubmittingMatter}
                                className="h-7 text-xs font-black bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg"
                              >
                                {isSubmittingMatter ? (
                                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  'ثبت و اطلاع‌رسانی'
                                )}
                              </Button>
                            </div>
                          </div>
                        </form>
                      )}

                      {/* Matters List */}
                      {dossierData.matters?.length === 0 ? (
                        <div className="py-8 text-center bg-gray-50 dark:bg-[#1C2536] border border-dashed border-gray-200 dark:border-[#242F42] rounded-xl space-y-2">
                          <Scale className="w-8 h-8 text-muted-foreground mx-auto stroke-1" />
                          <div className="text-xs font-black text-foreground dark:text-white">
                            هیچ مورد انضباطی یا تشویقی در سامانه برای این دانش‌آموز ثبت نشده است.
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {dossierData.matters.map((m: any) => {
                            const isPositive = m.type === 'POSITIVE';
                            return (
                              <div
                                key={m.id}
                                className={`border p-3 rounded-xl space-y-1.5 transition-all ${
                                  isPositive
                                    ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/40'
                                    : 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800/40'
                                }`}
                              >
                                <div className="flex items-center justify-between flex-wrap gap-1">
                                  <div className="flex items-center gap-1.5">
                                    <Badge
                                      variant={isPositive ? 'default' : 'destructive'}
                                      className={`text-[10px] font-bold px-2 py-0.5 ${
                                        isPositive
                                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200'
                                          : 'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-200'
                                      }`}
                                    >
                                      {isPositive ? '🌟 تشویقی' : '⚠️ انضباطی'}
                                    </Badge>
                                    <span className="font-black text-foreground dark:text-white text-xs">
                                      {m.title}
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-2">
                                    <span
                                      className={`text-[11px] font-black px-2 py-0.5 rounded border ${
                                        isPositive
                                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900/40 dark:text-emerald-300'
                                          : 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-900/40 dark:text-rose-300'
                                      }`}
                                    >
                                      {m.points > 0 ? `+${toPersianDigits(m.points)}` : toPersianDigits(m.points)} امتیاز
                                    </span>
                                    <span className="text-[10px] text-muted-foreground font-bold">
                                      {formatJalaliDisplay(m.reportedAt, true)}
                                    </span>
                                  </div>
                                </div>

                                {m.description && (
                                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                                    {m.description}
                                  </p>
                                )}

                                <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1 border-t border-gray-100 dark:border-[#242F42]">
                                  <span>
                                    ثبت‌شده توسط:{' '}
                                    <strong className="text-foreground dark:text-white">{m.reportedBy || 'کادر آموزشی'}</strong>
                                  </span>
                                  {m.notifiedParents && (
                                    <span className="inline-flex items-center gap-1 text-emerald-600 font-bold">
                                      <CheckCircle2 className="w-3 h-3" />
                                      نوتیفیکیشن ارسال شد
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3 border-t border-gray-200 dark:border-[#242F42] bg-gray-50/70 dark:bg-[#1C2536] flex items-center justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setDossierStudentId(null);
                  setDossierData(null);
                }}
                className="rounded-xl border border-gray-200 dark:border-[#242F42] text-xs font-bold"
              >
                بستن پرونده
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
