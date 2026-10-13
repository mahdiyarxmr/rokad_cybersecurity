import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../../lib/api/client';
import { useAuthStore } from '../../../lib/auth/auth-store';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Skeleton } from '../../../components/ui/Skeleton';
import { toPersianDigits, getCurrentJalaliWeekInfo } from '../../../utils/jalali';
import { generateSchedulePdf } from '../../student-parent/schedule/schedulePdfGenerator';
import {
  CalendarDays,
  Clock,
  GraduationCap,
  BookOpen,
  CalendarCheck2,
  FileCheck,
  MapPin,
  FileDown,
  ChevronRight,
  ChevronLeft,
  Layers,
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
  shortLabel: string;
  dayIndex: number; // 6: Sat, 0: Sun, 1: Mon, ...
}

export const DAYS: DayDef[] = [
  { key: 'SATURDAY', label: 'شنبه', shortLabel: 'ش', dayIndex: 6 },
  { key: 'SUNDAY', label: 'یکشنبه', shortLabel: 'ی', dayIndex: 0 },
  { key: 'MONDAY', label: 'دوشنبه', shortLabel: 'د', dayIndex: 1 },
  { key: 'TUESDAY', label: 'سه‌شنبه', shortLabel: 'س', dayIndex: 2 },
  { key: 'WEDNESDAY', label: 'چهارشنبه', shortLabel: 'چ', dayIndex: 3 },
  { key: 'THURSDAY', label: 'پنج‌شنبه', shortLabel: 'پ', dayIndex: 4 },
];

import { OFFICIAL_PERIODS, PERIOD_LABELS } from '../../../lib/constants/periods';
export { PERIOD_LABELS };

export interface ClassScheduleItem {
  id: string;
  classroomId: string;
  lessonId: string;
  teacherId: string;
  teacher?: {
    id?: string;
    userId?: string;
    user?: {
      firstName: string;
      lastName: string;
    };
  };
  isSplitPeriod?: boolean;
  secondLessonId?: string;
  secondTeacherId?: string;
  secondLesson?: {
    id: string;
    name: string;
    code?: string;
  };
  secondTeacher?: {
    id?: string;
    userId?: string;
    user: {
      firstName: string;
      lastName: string;
    };
  };
  dayOfWeek: DayOfWeekKey;
  periodNumber: number;
  startTime: string;
  endTime: string;
  classroom: {
    id: string;
    name: string;
    code?: string;
    roomNumber?: string;
  };
  lesson: {
    id: string;
    name: string;
    code?: string;
  };
}

export const TeacherSchedulePage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [schedules, setSchedules] = useState<ClassScheduleItem[]>([]);
  const [teacherProfile, setTeacherProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Dynamic automatic calculation of current Jalali week & alternating week (Week 1 or Week 2)
  const currentWeekInfo = getCurrentJalaliWeekInfo();
  const activeWeek = currentWeekInfo.activeWeek;

  // Determine today's day of week
  const currentJsDay = new Date().getDay();
  const todayDayDef = DAYS.find((d) => d.dayIndex === currentJsDay) || DAYS[0];
  const [selectedDay, setSelectedDay] = useState<DayOfWeekKey>(todayDayDef.key);

  useEffect(() => {
    const fetchSchedule = async () => {
      setIsLoading(true);
      try {
        const res = await apiClient.get<any>('/classes/my-schedule');
        const raw: any = res;
        const data =
          raw?.data?.schedules !== undefined
            ? raw.data
            : raw?.schedules !== undefined
            ? raw
            : raw?.data || raw;
        const resolvedTeacher = data?.teacher || raw?.teacher || null;
        const resolvedSchedules =
          data?.schedules || raw?.schedules || (Array.isArray(data) ? data : []);
        setTeacherProfile(resolvedTeacher);
        setSchedules(resolvedSchedules);
      } catch (err: any) {
        console.error('Failed to load teacher schedule:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSchedule();
  }, []);

  // Determine whether a slot belongs to this teacher in the selected week
  const isSlotForCurrentTeacher = (s: ClassScheduleItem, week: 1 | 2) => {
    const currentTeacherProfileId = teacherProfile?.id;
    const currentUserId = user?.id;

    const isFirstTeacher = Boolean(
      (currentTeacherProfileId && s.teacherId === currentTeacherProfileId) ||
      (currentUserId && (s.teacher?.userId === currentUserId || s.teacherId === currentUserId))
    );

    const isSecondTeacher = Boolean(
      (currentTeacherProfileId && s.secondTeacherId === currentTeacherProfileId) ||
      (currentUserId && (s.secondTeacher?.userId === currentUserId || s.secondTeacherId === currentUserId))
    );

    // If teacher is neither first nor second teacher, they should not see this slot
    if (!isFirstTeacher && !isSecondTeacher) {
      return false;
    }

    // Regular full slot: teacher teaches every week
    if (!s.isSplitPeriod) {
      return isFirstTeacher;
    }

    // Alternating week slot:
    // Week 1 -> Only the first teacher teaches! (second teacher has no class)
    // Week 2 -> Only the second teacher teaches! (first teacher has no class, and second lesson must exist)
    if (week === 1) {
      return isFirstTeacher;
    } else {
      const hasSecondLesson = Boolean(s.secondLessonId || s.secondLesson);
      return isSecondTeacher && hasSecondLesson;
    }
  };

  // Filter schedules for the selected day based on weekly alternation
  const daySchedules = schedules
    .filter((s) => s.dayOfWeek === selectedDay && isSlotForCurrentTeacher(s, activeWeek))
    .sort((a, b) => {
      if (a.periodNumber !== b.periodNumber) return a.periodNumber - b.periodNumber;
      return a.startTime.localeCompare(b.startTime);
    });

  // Check if selected day is today
  const isSelectedDayToday = selectedDay === todayDayDef.key;
  const currentDayDef = DAYS.find((d) => d.key === selectedDay) || todayDayDef;

  // Day navigation helpers (Previous / Next)
  const currentDayIndexInList = DAYS.findIndex((d) => d.key === selectedDay);

  const handlePrevDay = () => {
    const prevIndex = (currentDayIndexInList - 1 + DAYS.length) % DAYS.length;
    setSelectedDay(DAYS[prevIndex].key);
  };

  const handleNextDay = () => {
    const nextIndex = (currentDayIndexInList + 1) % DAYS.length;
    setSelectedDay(DAYS[nextIndex].key);
  };

  // Download PDF schedule
  const handleDownloadPdf = () => {
    const teacherFullName = user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : 'مربی';
    generateSchedulePdf({
      title: 'برنامه هفتگی تدریس',
      teacherName: teacherFullName,
      isTeacher: true,
      schedules: schedules.filter((s) => isSlotForCurrentTeacher(s, activeWeek)),
      days: DAYS,
      periodLabels: PERIOD_LABELS,
    });
  };

  // Check if a class slot is currently in progress
  const isSlotActiveNow = (slot: ClassScheduleItem) => {
    if (slot.dayOfWeek !== todayDayDef.key) return false;
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const [startH, startM] = slot.startTime.split(':').map(Number);
    const [endH, endM] = slot.endTime.split(':').map(Number);

    const startTotal = startH * 60 + startM;
    const endTotal = endH * 60 + endM;

    return currentMinutes >= startTotal && currentMinutes <= endTotal;
  };

  return (
    <div className="space-y-3.5 pb-12">
      {/* 1. Header & Controls Master Panel */}
      <div className="bg-white dark:bg-[#151C28] rounded-2xl border-[1.5px] border-primary-dark/30 dark:border-[#242F42] shadow-[2px_2px_0_#59BBAF] dark:shadow-[2px_2px_0_#0B0F17] p-4 sm:p-5 print:hidden">
        {/* Top Row: Title & Action Button */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary dark:text-primary border border-primary/25 flex items-center justify-center font-black shadow-2xs shrink-0">
              <CalendarDays className="w-5 h-5" />
            </div>
            <div className="flex flex-wrap items-center gap-2 min-w-0">
              <h1 className="text-lg sm:text-2xl font-black text-ink-darker dark:text-white truncate">
                برنامه هفتگی
              </h1>
              {user && (
                <Badge variant="college" className="text-[11px] sm:text-xs font-bold shrink-0">
                  {user.firstName} {user.lastName}
                </Badge>
              )}
            </div>
          </div>

          {/* Action Button */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleDownloadPdf}
              className="h-10 w-10 sm:w-auto px-0 sm:px-4 rounded-xl bg-primary hover:bg-primary-hover text-white font-black text-xs sm:text-sm border-[1.5px] border-primary-dark shadow-[2px_2px_0_#438C83] dark:shadow-[2px_2px_0_#1F413D] hover:shadow-[2.5px_2.5px_0_#438C83] active:translate-x-[1px] active:translate-y-[1px] cursor-pointer inline-flex items-center justify-center gap-1.5 sm:gap-2 shrink-0"
              title="دریافت نسخه رسمی و چاپ هفتگی تدریس به صورت PDF"
              aria-label="دانلود نسخه PDF"
            >
              <FileDown className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">دانلود (PDF)</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Day Navigation Bar */}
      <div className="flex items-center justify-between gap-3 p-2 sm:p-2.5 rounded-2xl bg-white dark:bg-[#151C28] border border-gray-200/80 dark:border-[#242F42] shadow-xs">
        {/* Right Arrow: روز قبل */}
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

        {/* Left Arrow: روز بعد */}
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
      <div className="space-y-2.5">
        {isLoading ? (
          <div className="space-y-2.5">
            <Skeleton className="h-24 rounded-2xl" />
            <Skeleton className="h-24 rounded-2xl" />
            <Skeleton className="h-24 rounded-2xl" />
          </div>
        ) : daySchedules.length === 0 ? (
          <div className="text-center py-14 bg-gray-50/50 dark:bg-[#151C28]/60 rounded-2xl border border-dashed border-gray-200 dark:border-[#242F42]">
            <CalendarDays className="w-10 h-10 text-muted-foreground dark:text-slate-500 mx-auto mb-2.5 opacity-60" />
            <h3 className="text-sm sm:text-base font-semibold text-foreground dark:text-white">
              در روز {currentDayDef.label} کلاسی در برنامه تدریس شما وجود ندارد
            </h3>
          </div>
        ) : (
          <div className="space-y-2.5">
            {daySchedules.map((slot) => {
              const isNow = isSlotActiveNow(slot);
              const periodLabel = PERIOD_LABELS[slot.periodNumber] || `زنگ ${slot.periodNumber}`;
              const formattedStartTime = toPersianDigits(slot.startTime);
              const formattedEndTime = toPersianDigits(slot.endTime);

              // Determine active lesson for this teacher based on active week
              const isSecondWeek = slot.isSplitPeriod && activeWeek === 2;
              const activeLesson = isSecondWeek ? slot.secondLesson : slot.lesson;
              const activeLessonId = isSecondWeek ? (slot.secondLessonId || slot.lessonId) : slot.lessonId;
              const activeLessonName = activeLesson?.name || slot.lesson?.name || '';

              return (
                <Card
                  key={slot.id}
                  className={`p-3 sm:p-4 border shadow-xs relative overflow-hidden rounded-2xl transition-colors ${
                    isNow
                      ? 'border-emerald-500/70 dark:border-emerald-500/50 bg-gradient-to-r from-emerald-500/10 via-white to-white dark:from-emerald-950/30 dark:via-[#151C28] dark:to-[#151C28] ring-1 ring-emerald-500/40 dark:ring-emerald-500/30'
                      : 'border-gray-200/80 dark:border-[#242F42] bg-white dark:bg-[#151C28]'
                  }`}
                >
                  {isNow && (
                    <div className="absolute top-0 right-0 left-0 h-1 bg-emerald-500 shadow-sm" />
                  )}

                  <div className="flex flex-col justify-between gap-3">
                    {/* Slot Information */}
                    <div className="space-y-2 flex-1 min-w-0">
                      {/* Period Badge & Time Badge */}
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="default" className="font-bold text-xs py-0.5">
                          {periodLabel}
                        </Badge>

                        {slot.periodNumber >= 5 && (
                          <span className="text-[11px] font-bold text-amber-900 dark:text-amber-300 bg-amber-100 dark:bg-amber-500/20 px-2 py-0.5 rounded-md border border-amber-300/80 dark:border-amber-400/40">
                            فوق برنامه (عصر)
                          </span>
                        )}

                        <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-gray-50 dark:bg-[#1C2536] border border-gray-200 dark:border-[#242F42] text-xs font-bold text-foreground dark:text-slate-300">
                          <Clock className="w-3.5 h-3.5 text-primary shrink-0" />
                          <span>
                            {formattedStartTime} تا {formattedEndTime}
                          </span>
                        </div>

                        {/* Alternating Week Tag */}
                        {slot.isSplitPeriod && (
                          <span className="inline-flex items-center gap-1 bg-primary/10 text-primary dark:text-primary-light border border-primary/25 px-2 py-0.5 rounded-md text-[11px] font-bold">
                            <Layers className="w-3 h-3" />
                            <span>یک هفته در میان</span>
                          </span>
                        )}

                        {/* Room Number Badge */}
                        {slot.classroom?.roomNumber && (
                          <span className="inline-flex items-center gap-1 bg-gray-50 dark:bg-[#1C2536] px-2.5 py-0.5 rounded-lg border border-gray-200 dark:border-[#242F42] text-xs font-semibold text-muted-foreground dark:text-slate-300">
                            <MapPin className="w-3.5 h-3.5 text-third-dark dark:text-third shrink-0" />
                            <span>{slot.classroom.roomNumber}</span>
                          </span>
                        )}

                        {isNow && (
                          <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            کلاس در حال برگزاری
                          </span>
                        )}
                      </div>

                      {/* Lesson Details */}
                      <div className="flex flex-wrap items-center gap-2.5 pt-0.5">
                        <h2 className="text-lg sm:text-xl font-black text-foreground dark:text-white flex items-center gap-2">
                          <BookOpen className="w-5 h-5 text-primary shrink-0" />
                          <span>{activeLessonName}</span>
                        </h2>

                        {/* Classroom Name */}
                        {slot.classroom?.name && (
                          <span className="inline-flex items-center gap-1 bg-gray-50 dark:bg-[#1C2536] px-2.5 py-0.5 rounded-lg border border-gray-200 dark:border-[#242F42] text-xs font-semibold text-muted-foreground dark:text-slate-300">
                            <GraduationCap className="w-3.5 h-3.5 text-purple-500 dark:text-purple-400 shrink-0" />
                            <span>{slot.classroom.name}</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Quick Actions for Teacher - Full width 3-column row */}
                    <div className="grid grid-cols-3 gap-2 pt-2.5 border-t border-gray-100 dark:border-[#242F42] w-full">
                      {/* 1. Right Box: طرح درس */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          navigate(
                            `/app/teacher/lessons?tab=PLANS&lessonId=${activeLessonId}&lessonName=${encodeURIComponent(activeLessonName || '')}`
                          )
                        }
                        className="text-[10px] sm:text-xs flex items-center justify-center gap-1 sm:gap-1.5 h-8 w-full px-1 sm:px-2 rounded-xl border-purple-400/60 dark:border-purple-500/50 bg-purple-100/85 dark:bg-purple-600/25 text-purple-800 dark:text-purple-200 hover:bg-purple-200/80 dark:hover:bg-purple-600/35 shadow-2xs font-bold transition-colors"
                        title={`مشاهده و تدوین طرح درس ${activeLessonName}`}
                      >
                        <BookOpen className="w-3.5 h-3.5 text-purple-700 dark:text-purple-300 shrink-0" />
                        <span className="whitespace-nowrap">طرح درس</span>
                      </Button>

                      {/* 2. Center Box: تکالیف کلاس */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          navigate(
                            `/app/teacher/homework?classroomId=${slot.classroomId}&lessonId=${activeLessonId}&lessonName=${encodeURIComponent(activeLessonName || '')}&classroomName=${encodeURIComponent(slot.classroom?.name || '')}`
                          )
                        }
                        className="text-[10.5px] sm:text-xs flex items-center justify-center gap-1 sm:gap-1.5 h-8 w-full px-1 sm:px-2 rounded-xl border-third/40 bg-third-light/70 dark:bg-third/15 text-third-dark dark:text-third hover:bg-third-light dark:hover:bg-third/25 dark:border-third/40 shadow-2xs font-bold transition-colors"
                        title={`تکالیف درس ${activeLessonName} برای کلاس ${slot.classroom?.name}`}
                      >
                        <FileCheck className="w-3.5 h-3.5 text-third-dark dark:text-third shrink-0" />
                        <span className="whitespace-nowrap">تکالیف کلاس</span>
                      </Button>

                      {/* 3. Left Box: ثبت حضور و غیاب */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          navigate(`/app/teacher/attendance?classroomId=${slot.classroomId}`)
                        }
                        className="text-[10.5px] sm:text-xs flex items-center justify-center gap-1 sm:gap-1.5 h-8 w-full px-1 sm:px-2 rounded-xl border-girl/40 bg-girl-light/70 dark:bg-girl/15 text-girl-dark dark:text-girl-light hover:bg-girl-light dark:hover:bg-girl/25 dark:border-girl/40 shadow-2xs font-bold transition-colors"
                        title={`ثبت حضور و غیاب کلاس ${slot.classroom?.name}`}
                      >
                        <CalendarCheck2 className="w-3.5 h-3.5 text-girl dark:text-girl-light shrink-0" />
                        <span className="whitespace-nowrap">ثبت حضور و غیاب</span>
                      </Button>
                    </div>
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
