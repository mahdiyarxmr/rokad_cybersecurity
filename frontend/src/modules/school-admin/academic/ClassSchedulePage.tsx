import React, { useEffect, useState } from 'react';
import { apiClient } from '../../../lib/api/client';
import { useAuthStore } from '../../../lib/auth/auth-store';
import { toast } from '../../../components/ui/toast/toast';
import { OFFICIAL_PERIODS } from '../../../lib/constants/periods';
import { generateSchedulePdf } from '../../student-parent/schedule/schedulePdfGenerator';
import { DAYS } from '../../student-parent/schedule/StudentSchedulePage';
import { Lock } from 'lucide-react';

import { ScheduleFormState, getLessonTypeInfo } from './components/schedule/types';
import { ScheduleHeader } from './components/schedule/ScheduleHeader';
import { ScheduleClassroomBanner } from './components/schedule/ScheduleClassroomBanner';
import { ScheduleMobileView } from './components/schedule/ScheduleMobileView';
import { ScheduleDesktopGrid } from './components/schedule/ScheduleDesktopGrid';
import { SchedulePeriodModal } from './components/schedule/SchedulePeriodModal';

export { getLessonTypeInfo };

interface ClassSchedulePageProps {
  readOnly?: boolean;
  classroomId?: string;
}

const PERIODS = OFFICIAL_PERIODS;

export const ClassSchedulePage: React.FC<ClassSchedulePageProps> = ({
  readOnly = false,
  classroomId: initialClassroomId,
}) => {
  const currentUser = useAuthStore((s) => s.user);
  const isStudent = currentUser?.role === 'STUDENT';
  const isParent = currentUser?.role === 'PARENT';
  const isStaffOrAdmin = ['SCHOOL_ADMIN', 'STAFF', 'SUPER_ADMIN'].includes(currentUser?.role || '');
  const canManageSchedule = !readOnly && isStaffOrAdmin;

  const [classrooms, setClassrooms] = useState<any[]>([]);
  const [selectedClassroomId, setSelectedClassroomId] = useState<string>(initialClassroomId || '');
  const [schedules, setSchedules] = useState<any[]>([]);
  const [lessons, setLessons] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isScheduleLoading, setIsScheduleLoading] = useState(false);
  const [mobileSelectedDay, setMobileSelectedDay] = useState<string>('SATURDAY');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conflictWarning, setConflictWarning] = useState<string | null>(null);

  const [form, setForm] = useState<ScheduleFormState>({
    scheduleId: '',
    dayOfWeek: 'SATURDAY',
    periodNumber: 1,
    lessonId: '',
    teacherId: '',
    isSplitPeriod: false,
    secondLessonId: '',
    secondTeacherId: '',
    startTime: '07:30',
    endTime: '09:00',
    allowTeacherConflict: false,
  });

  // 1. Initial Load: Classrooms, Lessons, Teachers
  useEffect(() => {
    const init = async () => {
      try {
        setIsLoading(true);
        const [classesRes, lessonsRes, teachersRes] = await Promise.all([
          apiClient.get('/classes/classrooms'),
          apiClient.get('/classes/lessons'),
          apiClient.get('/members/teachers'),
        ]);

        const classList = classesRes.data || [];
        setClassrooms(classList);
        setLessons(lessonsRes.data || []);
        setTeachers(teachersRes.data || []);

        if (classList.length > 0) {
          setSelectedClassroomId((prev) => {
            if (initialClassroomId && classList.some((c: any) => c.id === initialClassroomId)) {
              return initialClassroomId;
            }
            if (prev && classList.some((c: any) => c.id === prev)) {
              return prev;
            }
            return classList[0].id;
          });
        }
      } catch (err) {
        console.error('Failed to load initial timetable data', err);
      } finally {
        setIsLoading(false);
      }
    };

    init();
  }, [initialClassroomId]);

  // 2. Fetch Class Schedule whenever selectedClassroomId changes
  const fetchClassSchedule = async (classroomId: string) => {
    if (!classroomId) return;
    try {
      setIsScheduleLoading(true);
      const res = await apiClient.get(`/classes/classrooms/${classroomId}/schedule`);
      setSchedules(res.data || []);
    } catch (err) {
      console.error('Failed to load classroom schedule', err);
      setSchedules([]);
    } finally {
      setIsScheduleLoading(false);
    }
  };

  useEffect(() => {
    if (selectedClassroomId) {
      fetchClassSchedule(selectedClassroomId);
    }
  }, [selectedClassroomId]);

  const selectedClassroom = classrooms.find((c) => c.id === selectedClassroomId);

  // Filter lessons relevant to this classroom's level and field
  const relevantLessons = lessons.filter((l) => {
    if (!selectedClassroom) return true;
    if (l.levelId && selectedClassroom.levelId && l.levelId !== selectedClassroom.levelId) {
      return false;
    }
    if (l.fieldId && selectedClassroom.fieldId && l.fieldId !== selectedClassroom.fieldId) {
      return false;
    }
    return true;
  });

  const availableLessons = relevantLessons.length > 0 ? relevantLessons : lessons;

  // Handler to auto-assign teacher if only one is available for lesson 1
  const handleLessonChange = (lessonId: string) => {
    const selected = availableLessons.find((l) => l.id === lessonId);
    let autoTeacherId = form.teacherId;

    if (selected?.teachers && selected.teachers.length === 1) {
      autoTeacherId = selected.teachers[0].teacherId || selected.teachers[0].id;
    } else if (selected?.teacherId) {
      autoTeacherId = selected.teacherId;
    }

    setForm((f) => ({
      ...f,
      lessonId,
      teacherId: autoTeacherId,
    }));
  };

  // Handler to auto-assign teacher if only one is available for lesson 2
  const handleSecondLessonChange = (lessonId: string) => {
    const selected = availableLessons.find((l) => l.id === lessonId);
    let autoTeacherId = form.secondTeacherId;

    if (selected?.teachers && selected.teachers.length === 1) {
      autoTeacherId = selected.teachers[0].teacherId || selected.teachers[0].id;
    } else if (selected?.teacherId) {
      autoTeacherId = selected.teacherId;
    }

    setForm((f) => ({
      ...f,
      secondLessonId: lessonId,
      secondTeacherId: autoTeacherId,
    }));
  };

  // Swap Lesson & Teacher between Week 1 (Odd) and Week 2 (Even)
  const handleSwapSplitOrder = () => {
    setForm((f) => ({
      ...f,
      lessonId: f.secondLessonId,
      teacherId: f.secondTeacherId,
      secondLessonId: f.lessonId,
      secondTeacherId: f.teacherId,
    }));
  };

  // Open Modal for Create or Edit
  const handleOpenSlotModal = (day: string, periodNumber: number, slot?: any) => {
    const defaultPeriod = PERIODS.find((p) => p.number === periodNumber);

    if (slot) {
      setForm({
        scheduleId: slot.id,
        dayOfWeek: slot.dayOfWeek,
        periodNumber: slot.periodNumber,
        lessonId: slot.lessonId,
        teacherId: slot.teacherId,
        isSplitPeriod: !!slot.isSplitPeriod,
        secondLessonId: slot.secondLessonId || '',
        secondTeacherId: slot.secondTeacherId || '',
        startTime: slot.startTime || defaultPeriod?.defaultStart || '07:30',
        endTime: slot.endTime || defaultPeriod?.defaultEnd || '09:00',
        allowTeacherConflict: false,
      });
    } else {
      setForm({
        scheduleId: '',
        dayOfWeek: day,
        periodNumber: periodNumber,
        lessonId: '',
        teacherId: '',
        isSplitPeriod: false,
        secondLessonId: '',
        secondTeacherId: '',
        startTime: defaultPeriod?.defaultStart || '07:30',
        endTime: defaultPeriod?.defaultEnd || '09:00',
        allowTeacherConflict: false,
      });
    }

    setError(null);
    setConflictWarning(null);
    setIsModalOpen(true);
  };

  // Submit Schedule Item
  const handleSaveSchedule = async (e?: React.FormEvent, forceConflict: boolean = false) => {
    if (e) e.preventDefault();
    if (!selectedClassroomId) {
      setError('کلاسی انتخاب نشده است');
      return;
    }

    if (!form.lessonId || !form.teacherId) {
      setError('انتخاب درس و مربی هفته فرد الزامی است');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const payload = {
        classroomId: selectedClassroomId,
        lessonId: form.lessonId,
        teacherId: form.teacherId,
        isSplitPeriod: form.isSplitPeriod,
        secondLessonId: form.isSplitPeriod && form.secondLessonId ? form.secondLessonId : null,
        secondTeacherId: form.isSplitPeriod && form.secondTeacherId ? form.secondTeacherId : null,
        dayOfWeek: form.dayOfWeek,
        periodNumber: form.periodNumber,
        startTime: form.startTime,
        endTime: form.endTime,
        allowTeacherConflict: forceConflict || form.allowTeacherConflict,
      };

      if (form.scheduleId) {
        await apiClient.patch(`/classes/schedules/${form.scheduleId}`, payload);
        toast.success('ساعت درسی با موفقیت ویرایش شد');
      } else {
        await apiClient.post('/classes/schedules', payload);
        toast.success('ساعت درسی با موفقیت در برنامه ثبت شد');
      }

      setIsModalOpen(false);
      setConflictWarning(null);
      await fetchClassSchedule(selectedClassroomId);
    } catch (err: any) {
      console.error('Failed to save schedule', err);
      const serverMsg = err.response?.data?.message || err.message || 'خطا در ثبت ساعت درسی';

      if (
        (serverMsg.includes('تداخل') || serverMsg.includes('مشغول تدریس')) &&
        !forceConflict &&
        !form.allowTeacherConflict
      ) {
        setConflictWarning(serverMsg);
      } else {
        setError(serverMsg);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Schedule Slot
  const handleDeleteSlot = async (scheduleId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('آیا از حذف این ساعت درسی از برنامه هفتگی اطمینان دارید؟')) {
      return;
    }

    try {
      await apiClient.delete(`/classes/schedules/${scheduleId}`);
      toast.success('ساعت درسی از برنامه حذف گردید');
      await fetchClassSchedule(selectedClassroomId);
    } catch (err: any) {
      console.error('Failed to delete schedule item', err);
      toast.error('خطا در حذف ساعت درسی');
    }
  };

  // Official PDF Export
  const handleDownloadPdf = () => {
    generateSchedulePdf({
      title: 'برنامه هفتگی کلاس',
      classroomName: selectedClassroom?.name || 'کلاس',
      academicYear: '۱۴۰۵-۱۴۰۶',
      schedules,
      days: DAYS,
    });
  };

  const isContentLoading = isLoading || isScheduleLoading;

  return (
    <div className="space-y-6">
      {/* 1. Header & Classroom Selector (Component-by-component loader) */}
      <ScheduleHeader
        isLoading={isLoading}
        isStudent={isStudent}
        isParent={isParent}
        canManageSchedule={canManageSchedule}
        currentUser={currentUser}
        classrooms={classrooms}
        selectedClassroomId={selectedClassroomId}
        selectedClassroom={selectedClassroom}
        onSelectClassroom={(id) => setSelectedClassroomId(id)}
        onDownloadPdf={handleDownloadPdf}
      />

      {/* Empty State when student or user has no classroom */}
      {classrooms.length === 0 && !isLoading && (
        <div className="bg-white dark:bg-[#151C28] rounded-2xl border border-dashed border-gray-300 dark:border-[#242F42] p-12 text-center shadow-xs">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-4">
            <Lock className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-ink-darker dark:text-white">
            {isStudent
              ? 'شما هنوز به هیچ کلاسی تخصیص داده نشده‌اید'
              : 'هیچ کلاس درسی یافت نشد'}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 max-w-md mx-auto mt-2 leading-relaxed">
            {isStudent
              ? 'دانش‌آموز گرامی، کلاس درس شما هنوز توسط مسئولین آموزش و مدیریت هنرستان در سامانه ثبت نهایی نشده است. پس از تخصیص قطعی به کلاس، برنامه هفتگی زنگ‌های کلاسی به صورت اختصاصی در این صفحه نمایش داده خواهد شد.'
              : 'در حال حاضر هیچ کلاسی در این سال تحصیلی یا برای شما ثبت نشده است.'}
          </p>
        </div>
      )}

      {/* 2. Classroom Info Banner Component */}
      <ScheduleClassroomBanner
        isLoading={isContentLoading && !selectedClassroom}
        selectedClassroom={selectedClassroom}
        schedulesCount={schedules.length}
      />

      {/* Printable Heading (Only shows in print) */}
      <div className="hidden print:block text-center mb-6">
        <h1 className="text-xl font-bold">برنامه هفتگی کلاس {selectedClassroom?.name}</h1>
        <p className="text-sm text-gray-600 mt-1">
          پایه {selectedClassroom?.level?.name || '—'} | رشته {selectedClassroom?.field?.name || 'عمومی'}
        </p>
      </div>

      {/* 3. Mobile Adaptive Timetable View Component */}
      <ScheduleMobileView
        isLoading={isContentLoading}
        schedules={schedules}
        periods={PERIODS}
        mobileSelectedDay={mobileSelectedDay}
        onSelectDay={setMobileSelectedDay}
        canManageSchedule={canManageSchedule}
        onOpenSlotModal={handleOpenSlotModal}
        onDeleteSlot={handleDeleteSlot}
      />

      {/* 4. Desktop & Tablet 6x6 Timetable Grid Component */}
      <ScheduleDesktopGrid
        isLoading={isContentLoading}
        schedules={schedules}
        periods={PERIODS}
        canManageSchedule={canManageSchedule}
        onOpenSlotModal={handleOpenSlotModal}
        onDeleteSlot={handleDeleteSlot}
      />

      {/* 5. Assignment Modal Component */}
      {canManageSchedule && (
        <SchedulePeriodModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          form={form}
          setForm={setForm}
          selectedClassroom={selectedClassroom}
          periods={PERIODS}
          availableLessons={availableLessons}
          teachers={teachers}
          error={error}
          setError={setError}
          conflictWarning={conflictWarning}
          setConflictWarning={setConflictWarning}
          isSubmitting={isSubmitting}
          onSaveSchedule={handleSaveSchedule}
          onLessonChange={handleLessonChange}
          onSecondLessonChange={handleSecondLessonChange}
          onSwapSplitOrder={handleSwapSplitOrder}
        />
      )}
    </div>
  );
};
