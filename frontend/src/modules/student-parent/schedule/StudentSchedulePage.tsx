import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../../lib/api/client';
import { useAuthStore } from '../../../lib/auth/auth-store';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Skeleton } from '../../../components/ui/Skeleton';
import { toPersianDigits, getCurrentJalaliWeekInfo } from '../../../utils/jalali';
import { generateSchedulePdf } from './schedulePdfGenerator';
import {
  CalendarDays,
  Clock,
  BookOpen,
  UserCheck,
  FileCheck,
  HelpCircle,
  FolderDown,
  ChevronRight,
  ChevronLeft,
  FileDown,
} from 'lucide-react';

export type DayOfWeekKey =
  | 'SATURDAY'
  | 'SUNDAY'
  | 'MONDAY'
  | 'TUESDAY'
  | 'WEDNESDAY'
  | 'THURSDAY';

export interface DayDef {
  key: DayOfWeekKey;
  label: string;
  dayIndex: number;
}

export const DAYS: DayDef[] = [
  { key: 'SATURDAY', label: 'شنبه', dayIndex: 6 },
  { key: 'SUNDAY', label: 'یکشنبه', dayIndex: 0 },
  { key: 'MONDAY', label: 'دوشنبه', dayIndex: 1 },
  { key: 'TUESDAY', label: 'سه‌شنبه', dayIndex: 2 },
  { key: 'WEDNESDAY', label: 'چهارشنبه', dayIndex: 3 },
  { key: 'THURSDAY', label: 'پنج‌شنبه', dayIndex: 4 },
];

import { OFFICIAL_PERIODS, PERIOD_LABELS } from '../../../lib/constants/periods';
export { PERIOD_LABELS };

export interface StudentScheduleItem {
  id: string;
  classroomId: string;
  lessonId: string;
  teacherId: string;
  isSplitPeriod?: boolean;
  secondLessonId?: string;
  secondTeacherId?: string;
  secondLesson?: {
    id: string;
    name: string;
    code?: string;
  };
  secondTeacher?: {
    user: {
      firstName: string;
      lastName: string;
      phone?: string;
    };
  };
  dayOfWeek: DayOfWeekKey;
  periodNumber: number;
  startTime: string;
  endTime: string;
  lesson: {
    id: string;
    name: string;
    code?: string;
  };
  teacher?: {
    user: {
      firstName: string;
      lastName: string;
      phone?: string;
    };
  };
}

export const StudentSchedulePage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [classroom, setClassroom] = useState<any>(null);
  const [studentInfo, setStudentInfo] = useState<any>(null);
  const [availableChildren, setAvailableChildren] = useState<any[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [schedules, setSchedules] = useState<StudentScheduleItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const currentJsDay = new Date().getDay();
  const todayDayDef = DAYS.find((d) => d.dayIndex === currentJsDay) || DAYS[0];
  const [selectedDay, setSelectedDay] = useState<DayOfWeekKey>(todayDayDef.key);

  // Dynamic calculation of current Jalali week & alternating parity
  const currentWeekInfo = getCurrentJalaliWeekInfo();

  const fetchSchedule = async (childId?: string) => {
    setIsLoading(true);
    try {
      const targetChildId = childId || selectedStudentId;
      const url = targetChildId ? `/classes/my-schedule?studentId=${targetChildId}` : '/classes/my-schedule';
      const res = await apiClient.get<any>(url);
      const data = res.data;
      setClassroom(data?.classroom || null);
      setStudentInfo(data?.student || null);
      if (Array.isArray(data?.allChildren) && data.allChildren.length > 0) {
        setAvailableChildren(data.allChildren);
        if (!selectedStudentId && data.student?.id) {
          setSelectedStudentId(data.student.id);
        }
      }
      const items = data?.schedules || (Array.isArray(data) ? data : []);
      setSchedules(items);
    } catch (err: any) {
      console.error('Failed to load student schedule:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedule();
  }, []);

  // Filter and sort schedules for the selected day
  const daySchedules = schedules
    .filter((s) => s.dayOfWeek === selectedDay)
    .sort((a, b) => {
      if (a.periodNumber !== b.periodNumber) return a.periodNumber - b.periodNumber;
      return a.startTime.localeCompare(b.startTime);
    });

  // Navigation handlers for next and previous day
  const currentDayIndex = DAYS.findIndex((d) => d.key === selectedDay);
  const currentDayDef = DAYS[currentDayIndex] || DAYS[0];
  const isSelectedDayToday = selectedDay === todayDayDef.key;

  const handlePrevDay = () => {
    // In Persian RTL: "روز قبل" moves back in the week (right arrow)
    if (currentDayIndex > 0) {
      setSelectedDay(DAYS[currentDayIndex - 1].key);
    } else {
      setSelectedDay(DAYS[DAYS.length - 1].key);
    }
  };

  const handleNextDay = () => {
    // In Persian RTL: "روز بعد" moves forward in the week (left arrow)
    if (currentDayIndex < DAYS.length - 1) {
      setSelectedDay(DAYS[currentDayIndex + 1].key);
    } else {
      setSelectedDay(DAYS[0].key);
    }
  };

  // PDF Export
  const handleDownloadPdf = () => {
    generateSchedulePdf({
      classroomName: classroom?.name,
      studentName: studentInfo
        ? `${studentInfo.user?.firstName} ${studentInfo.user?.lastName}`
        : `${user?.firstName || ''} ${user?.lastName || ''}`.trim(),
      schedules,
      days: DAYS,
      periodLabels: PERIOD_LABELS,
    });
  };

  const isSlotActiveNow = (slot: StudentScheduleItem) => {
    if (slot.dayOfWeek !== todayDayDef.key) return false;
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const [startH, startM] = slot.startTime.split(':').map(Number);
    const [endH, endM] = slot.endTime.split(':').map(Number);

    const startTotal = startH * 60 + startM;
    const endTotal = endH * 60 + endM;

    return currentMinutes >= startTotal && currentMinutes <= endTotal;
  };

  const isParent = user?.role === 'PARENT';

  return (
    <div className="space-y-3.5 pb-12">
      {/* 1. Header & Controls Master Panel (Aligned with Messages Page) */}
      <div className="bg-white dark:bg-[#151C28] rounded-2xl border-[1.5px] border-primary-dark/30 dark:border-[#242F42] shadow-[2px_2px_0_#59BBAF] dark:shadow-[2px_2px_0_#0B0F17] p-4 sm:p-5 print:hidden">
        {/* Top Row: Title & Action Button side-by-side on all viewports */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary dark:text-primary border border-primary/25 flex items-center justify-center font-black shadow-2xs shrink-0">
              <CalendarDays className="w-5 h-5" />
            </div>
            <div className="flex flex-wrap items-center gap-2 min-w-0">
              <h1 className="text-lg sm:text-2xl font-black text-ink-darker dark:text-white truncate">
                برنامه هفتگی
              </h1>
              {classroom && (
                <Badge variant="college" className="text-[11px] sm:text-xs font-bold shrink-0">
                  {classroom.name}
                </Badge>
              )}
              {studentInfo && isParent && (
                <Badge variant="female" className="text-[11px] sm:text-xs font-bold shrink-0">
                  {studentInfo.user?.firstName} {studentInfo.user?.lastName}
                </Badge>
              )}
            </div>
          </div>

          {/* Action Button: Top-Left (Left side of header) with Green Accent */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleDownloadPdf}
              className="h-10 w-10 sm:w-auto px-0 sm:px-4 rounded-xl bg-primary hover:bg-primary-hover text-white font-black text-xs sm:text-sm border-[1.5px] border-primary-dark shadow-[2px_2px_0_#438C83] dark:shadow-[2px_2px_0_#1F413D] hover:shadow-[2.5px_2.5px_0_#438C83] active:translate-x-[1px] active:translate-y-[1px] cursor-pointer inline-flex items-center justify-center gap-1.5 sm:gap-2 shrink-0"
              title="دریافت نسخه رسمی و چاپ هفتگی به صورت PDF"
              aria-label="دانلود نسخه PDF"
            >
              <FileDown className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">دانلود (PDF)</span>
            </button>
          </div>
        </div>

        {/* Multi-Child Selector for Parents */}
        {isParent && availableChildren.length > 1 && (
          <div className="flex items-center gap-2 flex-wrap pt-3 mt-3 border-t border-gray-100 dark:border-[#242F42]">
            <span className="text-xs font-bold text-ink-normal dark:text-slate-400">انتخاب فرزند:</span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {availableChildren.map((child) => {
                const isSelected = (selectedStudentId || studentInfo?.id) === child.id;
                return (
                  <button
                    key={child.id}
                    type="button"
                    onClick={() => {
                      setSelectedStudentId(child.id);
                      fetchSchedule(child.id);
                    }}
                    className={`text-xs px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-female text-white shadow-xs'
                        : 'bg-gray-100 dark:bg-[#1C2536] text-ink-normal dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-[#242F42]'
                    }`}
                  >
                    {child.firstName} {child.lastName} {child.classroomName ? `(${child.classroomName})` : ''}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 2. Day Navigation Bar: Arrow buttons flanking the Day Title Box */}
      <div className="flex items-center justify-between gap-3 p-2 sm:p-2.5 rounded-2xl bg-white dark:bg-[#151C28] border border-gray-200/80 dark:border-[#242F42] shadow-xs">
        {/* Right Arrow: روز قبل (Previous Day in RTL) */}
        <button
          type="button"
          onClick={handlePrevDay}
          className="flex items-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-bold border border-gray-200 dark:border-[#242F42] bg-gray-50 dark:bg-[#1C2536] hover:bg-gray-100 dark:hover:bg-[#242F42] text-foreground dark:text-slate-200 active:scale-95 shadow-2xs group transition-colors"
          title="روز قبل"
          aria-label="روز قبل"
        >
          <ChevronRight className="w-4 h-4 text-primary" />
          <span className="hidden sm:inline">روز قبل</span>
        </button>

        {/* Center: Day Title Box */}
        <div className="flex-1 max-w-sm mx-auto flex items-center justify-center gap-2 py-1 px-3.5 rounded-xl bg-gray-50 dark:bg-[#1C2536] border border-gray-200 dark:border-[#242F42] text-center">
          <CalendarDays className="w-4 h-4 text-primary shrink-0" />
          <span className="text-base sm:text-lg font-black text-foreground dark:text-white">
            {currentDayDef.label}
          </span>
          {isSelectedDayToday && (
            <Badge variant="success" className="text-[10px] py-0.5 px-2">
              امروز
            </Badge>
          )}
        </div>

        {/* Left Arrow: روز بعد (Next Day in RTL) */}
        <button
          type="button"
          onClick={handleNextDay}
          className="flex items-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-bold border border-gray-200 dark:border-[#242F42] bg-gray-50 dark:bg-[#1C2536] hover:bg-gray-100 dark:hover:bg-[#242F42] text-foreground dark:text-slate-200 active:scale-95 shadow-2xs group transition-colors"
          title="روز بعد"
          aria-label="روز بعد"
        >
          <span className="hidden sm:inline">روز بعد</span>
          <ChevronLeft className="w-4 h-4 text-primary" />
        </button>
      </div>

      {/* 3. Daily Class Slots Section */}
      <div className="space-y-4 sm:space-y-4.5">
        {isLoading ? (
          <div className="space-y-4 sm:space-y-4.5">
            <Skeleton className="h-28 rounded-2xl" />
            <Skeleton className="h-28 rounded-2xl" />
            <Skeleton className="h-28 rounded-2xl" />
          </div>
        ) : daySchedules.length === 0 ? (
          <div className="text-center py-14 bg-gray-50/50 dark:bg-[#151C28]/60 rounded-2xl border border-dashed border-gray-200 dark:border-[#242F42]">
            <CalendarDays className="w-10 h-10 text-muted-foreground dark:text-slate-500 mx-auto mb-2.5 opacity-60" />
            <h3 className="text-sm sm:text-base font-semibold text-foreground dark:text-white">
              در روز {currentDayDef.label} هیچ کلاسی تشکیل نمی‌شود
            </h3>
            <p className="text-xs text-muted-foreground dark:text-slate-400 mt-1">
              برای مشاهده زنگ‌های سایر ایام هفته، از دکمه‌های روز قبل یا روز بعد استفاده فرمایید.
            </p>
          </div>
        ) : (
          <div className="space-y-4 sm:space-y-4.5">
            {daySchedules.map((slot) => {
              const isNow = isSlotActiveNow(slot);
              const periodLabel = PERIOD_LABELS[slot.periodNumber] || `زنگ ${slot.periodNumber}`;
              const formattedStartTime = toPersianDigits(slot.startTime);
              const formattedEndTime = toPersianDigits(slot.endTime);
              const teacherFullName = slot.teacher?.user
                ? `${slot.teacher.user.firstName} ${slot.teacher.user.lastName}`
                : null;

              return (
                <Card
                  key={slot.id}
                  className={`p-4 sm:p-5 border shadow-xs relative overflow-hidden rounded-2xl transition-colors ${
                    isNow
                      ? 'border-emerald-500/70 dark:border-emerald-500/50 bg-gradient-to-r from-emerald-500/10 via-white to-white dark:from-emerald-950/30 dark:via-[#151C28] dark:to-[#151C28] ring-1 ring-emerald-500/40 dark:ring-emerald-500/30'
                      : 'border-gray-200/80 dark:border-[#242F42] bg-white dark:bg-[#151C28]'
                  }`}
                >
                  {isNow && (
                    <div className="absolute top-0 right-0 left-0 h-1 bg-emerald-500 shadow-sm" />
                  )}

                  <div className="flex flex-col justify-between gap-4 sm:gap-4.5">
                    {/* Slot Information */}
                    <div className="space-y-3.5 sm:space-y-4 flex-1 min-w-0">
                      {/* Period Badge & Teacher Badge (Right) | Time Badge & Live Status (Leftmost) */}
                      <div className="flex flex-wrap items-center justify-between gap-y-3 gap-x-2">
                        {/* Right: Period & Teacher Badge */}
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="default" className="font-bold text-xs py-0.5">
                            {periodLabel}
                          </Badge>

                          {slot.periodNumber >= 5 && (
                            <span className="text-[11px] font-bold text-amber-900 dark:text-amber-300 bg-amber-100 dark:bg-amber-500/20 px-2 py-0.5 rounded-md border border-amber-300/80 dark:border-amber-400/40">
                              فوق برنامه (عصر)
                            </span>
                          )}

                          {!slot.isSplitPeriod && teacherFullName && (
                            <span className="inline-flex items-center gap-1.5 bg-gray-50 dark:bg-[#1C2536] px-2.5 py-0.5 rounded-lg border border-gray-200 dark:border-[#242F42] text-xs font-semibold text-muted-foreground dark:text-slate-300">
                              <UserCheck className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400 shrink-0" />
                              <span>{teacherFullName}</span>
                            </span>
                          )}
                        </div>

                        {/* Left: Time Badge & Live Status */}
                        <div className="flex items-center gap-2 mr-auto shrink-0">
                          {isNow && (
                            <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 rounded-full">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              کلاس در حال برگزاری
                            </span>
                          )}

                          <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-gray-50 dark:bg-[#1C2536] border border-gray-200 dark:border-[#242F42] text-xs font-bold text-foreground dark:text-slate-300">
                            <Clock className="w-3.5 h-3.5 text-primary shrink-0" />
                            <span>
                              {formattedStartTime} تا {formattedEndTime}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Lesson Details */}
                      {slot.isSplitPeriod ? (
                        <div className="space-y-2.5 pt-1">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {/* Part 1 */}
                            <div className={`p-3.5 rounded-xl border space-y-2 ${
                              currentWeekInfo.activeWeek === 1
                                ? 'bg-primary-50/50 dark:bg-primary-950/40 border-primary/50 ring-1 ring-primary/40 shadow-2xs'
                                : 'bg-gray-50/40 dark:bg-[#1C2536]/40 border-gray-200 dark:border-[#242F42] opacity-75'
                            }`}>
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold text-primary dark:text-primary-light block">هفته فرد</span>
                                {currentWeekInfo.activeWeek === 1 && (
                                  <span className="text-[9.5px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/80 px-1.5 py-0.2 rounded border border-emerald-300">
                                    درس این هفته
                                  </span>
                                )}
                              </div>
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="font-bold text-sm sm:text-base text-foreground dark:text-white flex items-center gap-1.5">
                                  <BookOpen className="w-4 h-4 text-primary shrink-0" />
                                  <span>{slot.lesson?.name}</span>
                                </h3>
                                {slot.teacher?.user && (
                                  <span className="inline-flex items-center gap-1 bg-gray-50 dark:bg-[#1C2536] px-2 py-0.5 rounded-md border border-gray-200 dark:border-[#242F42] text-[11px] font-medium text-muted-foreground dark:text-slate-300">
                                    <UserCheck className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                                    <span>
                                      {slot.teacher.user.firstName} {slot.teacher.user.lastName}
                                    </span>
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Part 2 */}
                            <div className={`p-3.5 rounded-xl border space-y-2 ${
                              currentWeekInfo.activeWeek === 2
                                ? 'bg-primary-50/50 dark:bg-primary-950/40 border-primary/50 ring-1 ring-primary/40 shadow-2xs'
                                : 'bg-gray-50/40 dark:bg-[#1C2536]/40 border-gray-200 dark:border-[#242F42] opacity-75'
                            }`}>
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold text-primary dark:text-primary-light block">هفته زوج</span>
                                {currentWeekInfo.activeWeek === 2 && (
                                  <span className={`text-[9.5px] font-bold px-1.5 py-0.2 rounded border ${
                                    slot.secondLesson
                                      ? 'text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/80 border-emerald-300'
                                      : 'text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/80 border-amber-300'
                                  }`}>
                                    {slot.secondLesson ? 'درس این هفته' : 'این هفته کلاس ندارید'}
                                  </span>
                                )}
                              </div>
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className={`font-bold text-sm sm:text-base flex items-center gap-1.5 ${slot.secondLesson ? 'text-foreground dark:text-white' : 'text-muted-foreground dark:text-gray-400 font-medium'}`}>
                                  <BookOpen className="w-4 h-4 text-primary shrink-0" />
                                  <span>{slot.secondLesson?.name || 'بدون کلاس'}</span>
                                </h3>
                                {slot.secondTeacher?.user && (
                                  <span className="inline-flex items-center gap-1 bg-gray-50 dark:bg-[#1C2536] px-2 py-0.5 rounded-md border border-gray-200 dark:border-[#242F42] text-[11px] font-medium text-muted-foreground dark:text-slate-300">
                                    <UserCheck className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                                    <span>
                                      {slot.secondTeacher.user.firstName} {slot.secondTeacher.user.lastName}
                                    </span>
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-wrap items-center gap-2 pt-1 sm:pt-0.5">
                          <h2 className="text-base sm:text-lg font-bold text-foreground dark:text-white flex items-center gap-2">
                            <BookOpen className="w-4.5 h-4.5 text-primary shrink-0" />
                            <span>{slot.lesson?.name}</span>
                          </h2>
                        </div>
                      )}
                    </div>

                    {/* Quick Actions for Student */}
                    {!isParent && (
                      <div className="pt-3.5 sm:pt-4 border-t border-gray-100 dark:border-[#242F42] w-full space-y-2.5">
                        {slot.isSplitPeriod && slot.secondLesson ? (
                          <>
                            {/* Part 1 Actions */}
                            <div className="space-y-1">
                              <span className="text-[10px] font-bold text-primary dark:text-primary-light block">
                                دسترسی سریع:
                              </span>
                              <div className="grid grid-cols-3 gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    navigate(
                                      `/app/student/materials?lessonId=${slot.lessonId}&lessonName=${encodeURIComponent(slot.lesson?.name || '')}`
                                    )
                                  }
                                  className="text-[10px] sm:text-xs flex items-center justify-center gap-1 sm:gap-1.5 h-8 w-full px-1 sm:px-2 rounded-xl border-purple-400/60 dark:border-purple-500/50 bg-purple-100/85 dark:bg-purple-600/25 text-purple-800 dark:text-purple-200 hover:bg-purple-200/80 dark:hover:bg-purple-600/35 shadow-2xs font-bold transition-colors"
                                  title={`دانلود محتوای آموزشی ${slot.lesson?.name}`}
                                >
                                  <FolderDown className="w-3.5 h-3.5 text-purple-700 dark:text-purple-300 shrink-0" />
                                  <span className="whitespace-nowrap">محتوا</span>
                                </Button>

                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    navigate(
                                      `/app/student/homework?lessonId=${slot.lessonId}&lessonName=${encodeURIComponent(slot.lesson?.name || '')}`
                                    )
                                  }
                                  className="text-[10.5px] sm:text-xs flex items-center justify-center gap-1 sm:gap-1.5 h-8 w-full px-1 sm:px-2 rounded-xl border-third/40 bg-third-light/70 dark:bg-third/15 text-third-dark dark:text-third hover:bg-third-light dark:hover:bg-third/25 dark:border-third/40 shadow-2xs font-bold transition-colors"
                                  title={`مشاهده و ارسال تکالیف ${slot.lesson?.name}`}
                                >
                                  <FileCheck className="w-3.5 h-3.5 text-third-dark dark:text-third shrink-0" />
                                  <span className="whitespace-nowrap">تکالیف</span>
                                </Button>

                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    navigate(
                                      `/app/student/exams?lessonId=${slot.lessonId}&lessonName=${encodeURIComponent(slot.lesson?.name || '')}`
                                    )
                                  }
                                  className="text-[10.5px] sm:text-xs flex items-center justify-center gap-1 sm:gap-1.5 h-8 w-full px-1 sm:px-2 rounded-xl border-girl/40 bg-girl-light/70 dark:bg-girl/15 text-girl-dark dark:text-girl-light hover:bg-girl-light dark:hover:bg-girl/25 dark:border-girl/40 shadow-2xs font-bold transition-colors"
                                  title={`آزمون‌های آنلاین درس ${slot.lesson?.name}`}
                                >
                                  <HelpCircle className="w-3.5 h-3.5 text-girl dark:text-girl-light shrink-0" />
                                  <span className="whitespace-nowrap">آزمون‌ها</span>
                                </Button>
                              </div>
                            </div>

                            {/* Part 2 Actions */}
                            <div className="space-y-1 pt-1 border-t border-dashed border-gray-200 dark:border-[#242F42]">
                              <span className="text-[10px] font-bold text-primary dark:text-primary-light block">
                                دسترسی سریع:
                              </span>
                              <div className="grid grid-cols-3 gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    navigate(
                                      `/app/student/materials?lessonId=${slot.secondLessonId || slot.lessonId}&lessonName=${encodeURIComponent(slot.secondLesson?.name || '')}`
                                    )
                                  }
                                  className="text-[10px] sm:text-xs flex items-center justify-center gap-1 sm:gap-1.5 h-8 w-full px-1 sm:px-2 rounded-xl border-purple-400/60 dark:border-purple-500/50 bg-purple-100/85 dark:bg-purple-600/25 text-purple-800 dark:text-purple-200 hover:bg-purple-200/80 dark:hover:bg-purple-600/35 shadow-2xs font-bold transition-colors"
                                  title={`دانلود محتوای آموزشی ${slot.secondLesson?.name}`}
                                >
                                  <FolderDown className="w-3.5 h-3.5 text-purple-700 dark:text-purple-300 shrink-0" />
                                  <span className="whitespace-nowrap">محتوا</span>
                                </Button>

                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    navigate(
                                      `/app/student/homework?lessonId=${slot.secondLessonId || slot.lessonId}&lessonName=${encodeURIComponent(slot.secondLesson?.name || '')}`
                                    )
                                  }
                                  className="text-[10.5px] sm:text-xs flex items-center justify-center gap-1 sm:gap-1.5 h-8 w-full px-1 sm:px-2 rounded-xl border-third/40 bg-third-light/70 dark:bg-third/15 text-third-dark dark:text-third hover:bg-third-light dark:hover:bg-third/25 dark:border-third/40 shadow-2xs font-bold transition-colors"
                                  title={`مشاهده و ارسال تکالیف ${slot.secondLesson?.name}`}
                                >
                                  <FileCheck className="w-3.5 h-3.5 text-third-dark dark:text-third shrink-0" />
                                  <span className="whitespace-nowrap">تکالیف</span>
                                </Button>

                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    navigate(
                                      `/app/student/exams?lessonId=${slot.secondLessonId || slot.lessonId}&lessonName=${encodeURIComponent(slot.secondLesson?.name || '')}`
                                    )
                                  }
                                  className="text-[10.5px] sm:text-xs flex items-center justify-center gap-1 sm:gap-1.5 h-8 w-full px-1 sm:px-2 rounded-xl border-girl/40 bg-girl-light/70 dark:bg-girl/15 text-girl-dark dark:text-girl-light hover:bg-girl-light dark:hover:bg-girl/25 dark:border-girl/40 shadow-2xs font-bold transition-colors"
                                  title={`آزمون‌های آنلاین درس ${slot.secondLesson?.name}`}
                                >
                                  <HelpCircle className="w-3.5 h-3.5 text-girl dark:text-girl-light shrink-0" />
                                  <span className="whitespace-nowrap">آزمون‌ها</span>
                                </Button>
                              </div>
                            </div>
                          </>
                        ) : (
                          <div className="grid grid-cols-3 gap-2">
                            {/* 1. Right Box (First in RTL): محتوای آموزشی */}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                navigate(
                                  `/app/student/materials?lessonId=${slot.lessonId}&lessonName=${encodeURIComponent(slot.lesson?.name || '')}`
                                )
                              }
                              className="text-[10px] sm:text-xs flex items-center justify-center gap-1 sm:gap-1.5 h-8 w-full px-1 sm:px-2 rounded-xl border-purple-400/60 dark:border-purple-500/50 bg-purple-100/85 dark:bg-purple-600/25 text-purple-800 dark:text-purple-200 hover:bg-purple-200/80 dark:hover:bg-purple-600/35 shadow-2xs font-bold transition-colors"
                              title={`دانلود محتوای آموزشی ${slot.lesson?.name}`}
                            >
                              <FolderDown className="w-3.5 h-3.5 text-purple-700 dark:text-purple-300 shrink-0" />
                              <span className="whitespace-nowrap">محتوای آموزشی</span>
                            </Button>

                            {/* 2. Center Box: تکالیف */}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                navigate(
                                  `/app/student/homework?lessonId=${slot.lessonId}&lessonName=${encodeURIComponent(slot.lesson?.name || '')}`
                                )
                              }
                              className="text-[10.5px] sm:text-xs flex items-center justify-center gap-1 sm:gap-1.5 h-8 w-full px-1 sm:px-2 rounded-xl border-third/40 bg-third-light/70 dark:bg-third/15 text-third-dark dark:text-third hover:bg-third-light dark:hover:bg-third/25 dark:border-third/40 shadow-2xs font-bold transition-colors"
                              title={`مشاهده و ارسال تکالیف ${slot.lesson?.name}`}
                            >
                              <FileCheck className="w-3.5 h-3.5 text-third-dark dark:text-third shrink-0" />
                              <span className="whitespace-nowrap">تکالیف</span>
                            </Button>

                            {/* 3. Left Box: آزمون‌ها */}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                navigate(
                                  `/app/student/exams?lessonId=${slot.lessonId}&lessonName=${encodeURIComponent(slot.lesson?.name || '')}`
                                )
                              }
                              className="text-[10.5px] sm:text-xs flex items-center justify-center gap-1 sm:gap-1.5 h-8 w-full px-1 sm:px-2 rounded-xl border-girl/40 bg-girl-light/70 dark:bg-girl/15 text-girl-dark dark:text-girl-light hover:bg-girl-light dark:hover:bg-girl/25 dark:border-girl/40 shadow-2xs font-bold transition-colors"
                              title={`آزمون‌های آنلاین درس ${slot.lesson?.name}`}
                            >
                              <HelpCircle className="w-3.5 h-3.5 text-girl dark:text-girl-light shrink-0" />
                              <span className="whitespace-nowrap">آزمون‌ها</span>
                            </Button>
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
      </div>
    </div>
  );
};
