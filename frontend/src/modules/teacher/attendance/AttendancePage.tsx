import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  UserCheck,
  UserX,
  Clock,
  Lock,
  Unlock,
  ShieldAlert,
  CalendarCheck,
  Search,
  CheckCircle2,
  RefreshCw,
  Users,
  Send,
  CalendarDays,
  ChevronRight,
  ChevronLeft,
  AlertCircle,
  Filter,
  Check,
  Building2,
  Sparkles,
  ArrowRight,
  BookOpen,
  Calendar,
  Radio,
  RotateCcw,
  SlidersHorizontal,
  X,
  ChevronDown,
  ChevronUp,
  Award,
  Star,
  FileText,
  History,
  TrendingUp,
  AlertTriangle,
  GraduationCap,
  MessageSquare,
  Trash2,
  Edit3,
} from 'lucide-react';
import { toast } from 'sonner';
import { apiClient, API_BASE_URL } from '../../../lib/api/client';
import { useAuthStore } from '../../../lib/auth/auth-store';
import { useTenantStore } from '../../../lib/auth/tenant-store';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Input } from '../../../components/ui/Input';
import { Skeleton } from '../../../components/ui/Skeleton';
import { PersianDatePicker } from '../../../components/ui/PersianDatePicker';
import {
  toPersianDigits,
  formatJalaliDisplay,
  gregorianToJalaliStr,
  getCurrentJalaliYearMonth,
  jalaliToGregorianDate,
} from '../../../utils/jalali';

export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'TARDY' | 'EXCUSED_ABSENT' | 'EXPELLED';

export type DisciplinaryRewardType =
  | 'POSITIVE'
  | 'NEGATIVE'
  | 'WARNING'
  | 'HOMEWORK_INCOMPLETE'
  | 'EXCELLENT'
  | 'NONE';

interface LocalStudentAttendance {
  studentId: string;
  studentCode: string;
  nationalCode?: string;
  fatherPhone?: string;
  motherPhone?: string;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    avatarUrl?: string;
    phone?: string;
  };
  status: AttendanceStatus;
  delayMinutes: number;
  reason: string;
  isRecorded: boolean;
  oralGrade?: number | null;
  rewardDisciplineType?: DisciplinaryRewardType | null;
  rewardDisciplineNote?: string | null;
  sessionNote?: string | null;
}

interface ScheduleSlot {
  id: string;
  classroomId: string;
  classroomName: string;
  classroomGrade: string;
  classroomField: string;
  lessonId: string;
  lessonName: string;
  periodNumber: number;
  startTime: string;
  endTime: string;
  isSplitPeriod?: boolean;
  stats?: {
    totalStudents: number;
    recordedCount: number;
    presentCount: number;
    absentCount: number;
    tardyCount: number;
    excusedCount: number;
    isRecorded: boolean;
    isFullyRecorded: boolean;
  };
}

const WEEK_DAYS_INFO = [
  { key: 'SATURDAY', name: 'شنبه' },
  { key: 'SUNDAY', name: 'یکشنبه' },
  { key: 'MONDAY', name: 'دوشنبه' },
  { key: 'TUESDAY', name: 'سه‌شنبه' },
  { key: 'WEDNESDAY', name: 'چهارشنبه' },
  { key: 'THURSDAY', name: 'پنج‌شنبه' },
];

const QUICK_GRADES = [20, 19.5, 19, 18.5, 18, 17, 16, 15, 14, 12, 10, 0];

const REWARD_OPTIONS = [
  { value: 'تشویقی', label: 'تشویقی (+۲)', score: 2 },
  { value: 'فعالیت کلاسی', label: 'فعالیت (+۲)', score: 2 },
  { value: 'تکالیف', label: 'تکلیف (+۲)', score: 2 },
  { value: 'انضباط', label: 'انضباط (+۲)', score: 2 },
];

const DISCIPLINE_OPTIONS = [
  { value: 'انضباطی', label: 'انضباطی (-۲)', score: -2 },
  { value: 'بی‌نظمی', label: 'بی‌نظمی (-۲)', score: -2 },
  { value: 'عدم انجام تکلیف', label: 'عدم تکلیف (-۲)', score: -2 },
  { value: 'تاخیر', label: 'تاخیر (-۲)', score: -2 },
];

const getDraftKey = (classroomId?: string, date?: string, periodNumber?: number) => {
  if (!classroomId || !date) return null;
  return `attendance_draft_${classroomId}_${date}_${periodNumber || 1}`;
};

const buildAttendancePayload = (
  session: { classroomId: string; lessonId?: string; periodNumber?: number },
  date: string,
  list: LocalStudentAttendance[],
) => {
  return {
    classroomId: session.classroomId,
    lessonId: session.lessonId || undefined,
    date,
    periodNumber: session.periodNumber || 1,
    attendances: list.map((s) => ({
      studentId: s.studentId,
      status: s.status,
      delayMinutes: s.status === 'TARDY' ? (Number(s.delayMinutes) || 0) : 0,
      reason: s.reason?.trim() ? s.reason.trim() : undefined,
      oralGrade:
        s.oralGrade !== null && s.oralGrade !== undefined && String(s.oralGrade).trim() !== ''
          ? Number(s.oralGrade)
          : null,
      rewardDisciplineType:
        s.rewardDisciplineType && s.rewardDisciplineType !== 'NONE' ? s.rewardDisciplineType : null,
      rewardDisciplineNote: s.rewardDisciplineNote?.trim() ? s.rewardDisciplineNote.trim() : null,
      sessionNote: s.sessionNote?.trim() ? s.sessionNote.trim() : null,
    })),
  };
};

export const AttendancePage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const isManagerOrAdmin =
    user?.role === 'SUPER_ADMIN' || user?.role === 'SCHOOL_ADMIN' || user?.role === 'STAFF';

  // Selected teacher state for Admins & Staff
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('');

  // 2. Jalali date selection
  const todayJalali = useMemo(() => {
    const { year, month, day } = getCurrentJalaliYearMonth();
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }, []);

  const [selectedDate, setSelectedDate] = useState<string>(todayJalali);
  const [showDatePickerModal, setShowDatePickerModal] = useState<boolean>(false);

  // Active top navigation tab: 'today_schedule' | 'staff_attendance'
  const [activeTab, setActiveTab] = useState<'today_schedule' | 'staff_attendance'>('today_schedule');

  // Active classroom session
  const [activeSession, setActiveSession] = useState<{
    classroomId: string;
    classroomName: string;
    lessonId?: string;
    lessonName?: string;
    periodNumber: number;
    startTime?: string;
    endTime?: string;
  } | null>(null);

  // Search & edit state for attendance roster
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | AttendanceStatus>('ALL');
  const [showFilterStats, setShowFilterStats] = useState<boolean>(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);
  const [studentsList, setStudentsList] = useState<LocalStudentAttendance[]>([]);

  // Modal / Bottom Sheet State for Student Evaluation & Track Record History
  const [evaluationModalStudent, setEvaluationModalStudent] = useState<LocalStudentAttendance | null>(null);
  const [modalTab, setModalTab] = useState<'EVALUATE' | 'HISTORY'>('EVALUATE');

  // Dedicated Tardy Modal State
  const [tardyModalStudent, setTardyModalStudent] = useState<LocalStudentAttendance | null>(null);
  const [tardyInputMinutes, setTardyInputMinutes] = useState<number>(15);

  // Evaluation Form State
  const [modalOralGrade, setModalOralGrade] = useState<string>('');
  const [modalDisciplineType, setModalDisciplineType] = useState<DisciplinaryRewardType>('NONE');
  const [selectedRewardOption, setSelectedRewardOption] = useState<string>('');
  const [selectedDisciplineOption, setSelectedDisciplineOption] = useState<string>('');
  const [modalDisciplineNote, setModalDisciplineNote] = useState<string>('');
  const [modalSessionNote, setModalSessionNote] = useState<string>('');
  const [modalDelayMinutes, setModalDelayMinutes] = useState<number>(0);
  const [modalReason, setModalReason] = useState<string>('');
  const [isSavingEvaluation, setIsSavingEvaluation] = useState<boolean>(false);

  // Prevent background body scrolling when evaluation modal is open
  useEffect(() => {
    if (evaluationModalStudent) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [evaluationModalStudent]);

  // 3. Date Navigation Helpers
  const isSelectedDateToday = selectedDate === todayJalali;
  const isPastDate = selectedDate < todayJalali;
  const isReadOnly = false;

  const navigateDate = (deltaDays: number) => {
    try {
      const gDate = jalaliToGregorianDate(selectedDate);
      gDate.setDate(gDate.getDate() + deltaDays);
      setSelectedDate(gregorianToJalaliStr(gDate));
      setActiveSession(null);
    } catch (e) {
      console.error('Failed to navigate date', e);
    }
  };

  const currentDayOfWeekInfo = useMemo(() => {
    try {
      const gDate = jalaliToGregorianDate(selectedDate);
      const day = gDate.getDay();
      const map: Record<number, { key: string; name: string }> = {
        6: { key: 'SATURDAY', name: 'شنبه' },
        0: { key: 'SUNDAY', name: 'یکشنبه' },
        1: { key: 'MONDAY', name: 'دوشنبه' },
        2: { key: 'TUESDAY', name: 'سه‌شنبه' },
        3: { key: 'WEDNESDAY', name: 'چهارشنبه' },
        4: { key: 'THURSDAY', name: 'پنج‌شنبه' },
        5: { key: 'FRIDAY', name: 'جمعه' },
      };
      return map[day] || { key: 'SATURDAY', name: 'شنبه' };
    } catch {
      return { key: 'SATURDAY', name: 'شنبه' };
    }
  }, [selectedDate]);

  const selectWeekday = (targetDayKey: string) => {
    try {
      const gDate = jalaliToGregorianDate(selectedDate);
      const currentDay = gDate.getDay();
      const currentPersianIndex = currentDay === 6 ? 0 : currentDay + 1;
      const targetMap: Record<string, number> = {
        SATURDAY: 0,
        SUNDAY: 1,
        MONDAY: 2,
        TUESDAY: 3,
        WEDNESDAY: 4,
        THURSDAY: 5,
      };
      const targetIndex = targetMap[targetDayKey] ?? 0;
      const diff = targetIndex - currentPersianIndex;
      gDate.setDate(gDate.getDate() + diff);
      setSelectedDate(gregorianToJalaliStr(gDate));
      setActiveSession(null);
    } catch (e) {
      console.error(e);
    }
  };

  // 4. Live time calculation
  const currentMinutes = useMemo(() => {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  }, []);

  const checkSlotStatus = (startTimeStr?: string, endTimeStr?: string) => {
    if (!startTimeStr || !endTimeStr) return isPastDate ? 'PASSED' : 'INACTIVE';
    if (!isSelectedDateToday) return isPastDate ? 'PASSED' : 'UPCOMING';

    const parseMinutes = (t: string) => {
      const [h, m] = t.split(':').map(Number);
      return (h || 0) * 60 + (m || 0);
    };

    const start = parseMinutes(startTimeStr);
    const end = parseMinutes(endTimeStr);

    if (currentMinutes >= start && currentMinutes <= end) {
      return 'CURRENT';
    } else if (currentMinutes > end) {
      return 'PASSED';
    } else {
      return 'UPCOMING';
    }
  };

  const getPeriodTimingStatus = (periodItem: {
    periodNumber: number;
    startTime?: string;
    endTime?: string;
    slots: ScheduleSlot[];
  }) => {
    if (!isSelectedDateToday) {
      return isPastDate ? 'PASSED' : 'UPCOMING';
    }

    const parseMinutes = (t: string) => {
      const [h, m] = t.split(':').map(Number);
      return (h || 0) * 60 + (m || 0);
    };

    if (periodItem.startTime && periodItem.endTime) {
      const start = parseMinutes(periodItem.startTime);
      const end = parseMinutes(periodItem.endTime);
      if (currentMinutes >= start && currentMinutes <= end) return 'CURRENT';
      if (currentMinutes > end) return 'PASSED';
      return 'UPCOMING';
    }

    const slotStatuses = periodItem.slots.map((s) => checkSlotStatus(s.startTime, s.endTime));
    if (slotStatuses.includes('CURRENT')) return 'CURRENT';
    if (slotStatuses.every((st) => st === 'PASSED')) return 'PASSED';
    return 'UPCOMING';
  };

  // 4.5. Query: Teachers List (For Admin & Staff)
  const { data: teachersData } = useQuery({
    enabled: isManagerOrAdmin,
    queryKey: ['members-teachers-attendance'],
    queryFn: async () => {
      const res: any = await apiClient.get('/members/teachers');
      const list = res?.data || res || [];
      return Array.isArray(list) ? list : [];
    },
  });

  // 5. Query: Daily Schedule for Teacher
  const {
    data: dailyScheduleData,
    isLoading: isLoadingSchedule,
  } = useQuery({
    queryKey: ['teacher-daily-schedule', selectedDate, selectedTeacherId],
    queryFn: async () => {
      const teacherParam = selectedTeacherId ? `&teacherId=${selectedTeacherId}` : '';
      const res: any = await apiClient.get(
        `/attendance/teacher-daily-schedule?date=${selectedDate}${teacherParam}`,
      );
      return res?.data || res;
    },
  });

  const schedulesList: ScheduleSlot[] = useMemo(() => {
    const list = Array.isArray(dailyScheduleData?.schedules) ? [...dailyScheduleData.schedules] : [];
    return list.sort((a, b) => {
      if (a.periodNumber !== b.periodNumber) return a.periodNumber - b.periodNumber;
      return (a.startTime || '').localeCompare(b.startTime || '');
    });
  }, [dailyScheduleData]);

  // Sort weight helper: 300s (پایه دوازدهم), then 200s (پایه یازدهم), then 100s (پایه دهم)
  const getClassroomSortWeight = (slot: ScheduleSlot): number => {
    const name = slot.classroomName || '';
    const grade = slot.classroomGrade || '';
    const combined = `${name} ${grade}`;

    const match = name.match(/(\d{3})/) || name.match(/([۱-۹][۰-۹]{2})/);
    if (match) {
      const enDigits = match[1].replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)));
      const num = parseInt(enDigits, 10);
      if (num >= 300 && num < 400) return 1000 + num;
      if (num >= 200 && num < 300) return 2000 + num;
      if (num >= 100 && num < 200) return 3000 + num;
      return 4000 + num;
    }

    if (combined.includes('دوازدهم') || combined.includes('12') || combined.includes('۱۲') || combined.includes('300') || combined.includes('۳۰۰')) return 1999;
    if (combined.includes('یازدهم') || combined.includes('11') || combined.includes('۱۱') || combined.includes('200') || combined.includes('۲۰۰')) return 2999;
    if (combined.includes('دهم') || combined.includes('10') || combined.includes('۱۰') || combined.includes('100') || combined.includes('۱۰۰')) return 3999;

    return 9999;
  };

  // Group by Period (زنگ ۱، زنگ ۲، زنگ ۳، ...) and inside each period order 300s, 200s, 100s
  const groupedByPeriod = useMemo(() => {
    if (schedulesList.length === 0) return [];

    const periodMap = new Map<
      number,
      {
        periodNumber: number;
        startTime?: string;
        endTime?: string;
        slots: ScheduleSlot[];
      }
    >();

    for (const slot of schedulesList) {
      if (!periodMap.has(slot.periodNumber)) {
        periodMap.set(slot.periodNumber, {
          periodNumber: slot.periodNumber,
          startTime: slot.startTime,
          endTime: slot.endTime,
          slots: [],
        });
      }
      const p = periodMap.get(slot.periodNumber)!;
      if (!p.startTime && slot.startTime) p.startTime = slot.startTime;
      if (!p.endTime && slot.endTime) p.endTime = slot.endTime;
      p.slots.push(slot);
    }

    const sortedPeriods = Array.from(periodMap.values()).sort((a, b) => a.periodNumber - b.periodNumber);

    for (const period of sortedPeriods) {
      period.slots.sort((a, b) => {
        const weightA = getClassroomSortWeight(a);
        const weightB = getClassroomSortWeight(b);
        if (weightA !== weightB) return weightA - weightB;
        return (a.classroomName || '').localeCompare(b.classroomName || '');
      });
    }

    return sortedPeriods;
  }, [schedulesList]);

  const activeNowSlot = useMemo(() => {
    if (!isSelectedDateToday) return null;
    return schedulesList.find((s) => checkSlotStatus(s.startTime, s.endTime) === 'CURRENT') || null;
  }, [schedulesList, isSelectedDateToday, currentMinutes]);

  // 6. Query: All Classrooms
  const { data: allClassroomsData, isLoading: isLoadingAllClassrooms } = useQuery({
    queryKey: ['all-classrooms-attendance'],
    queryFn: async () => {
      const res: any = await apiClient.get('/classes/classrooms');
      const list = res?.data || res || [];
      return Array.isArray(list) ? list : [];
    },
  });

  // Handle URL search parameters for bidirectional sync (e.g. from Gradebook)
  useEffect(() => {
    const classIdParam = searchParams.get('classroomId');
    const lessonIdParam = searchParams.get('lessonId');

    if (classIdParam && !activeSession) {
      const foundInSchedule = schedulesList.find(
        (s) => s.classroomId === classIdParam && (!lessonIdParam || s.lessonId === lessonIdParam)
      );

      if (foundInSchedule) {
        setActiveSession({
          classroomId: foundInSchedule.classroomId,
          classroomName: foundInSchedule.classroomName,
          lessonId: foundInSchedule.lessonId,
          lessonName: foundInSchedule.lessonName,
          periodNumber: foundInSchedule.periodNumber,
          startTime: foundInSchedule.startTime,
          endTime: foundInSchedule.endTime,
        });
      } else if (allClassroomsData && Array.isArray(allClassroomsData)) {
        const foundClass = allClassroomsData.find((c: any) => c.id === classIdParam);
        if (foundClass) {
          setActiveSession({
            classroomId: foundClass.id,
            classroomName: foundClass.name,
            lessonId: lessonIdParam || undefined,
            periodNumber: 1,
          });
        }
      }
    }
  }, [searchParams, schedulesList, allClassroomsData, activeSession]);

  // 7. Query: Roster & Attendance for Active Session
  const {
    data: sessionAttendanceData,
    isLoading: isLoadingRoster,
    refetch: refetchRoster,
  } = useQuery({
    enabled: !!activeSession?.classroomId,
    queryKey: [
      'classroom-attendance',
      activeSession?.classroomId,
      selectedDate,
      activeSession?.periodNumber,
    ],
    queryFn: async () => {
      if (!activeSession?.classroomId) return null;
      const res: any = await apiClient.get(
        `/attendance/classroom/${activeSession.classroomId}?date=${selectedDate}&periodNumber=${activeSession.periodNumber}`,
      );
      return res?.data || res;
    },
  });

  useEffect(() => {
    if (sessionAttendanceData && Array.isArray(sessionAttendanceData.students)) {
      const serverMapped: LocalStudentAttendance[] = sessionAttendanceData.students.map((st: any) => ({
        studentId: st.studentId,
        studentCode: st.studentCode,
        nationalCode: st.nationalCode,
        fatherPhone: st.fatherPhone,
        motherPhone: st.motherPhone,
        user: st.user,
        status: (st.status as AttendanceStatus) || 'PRESENT',
        delayMinutes: st.delayMinutes || 0,
        reason: st.reason || '',
        isRecorded: !!st.isRecorded,
        oralGrade: st.oralGrade !== undefined ? st.oralGrade : null,
        rewardDisciplineType: st.rewardDisciplineType || 'NONE',
        rewardDisciplineNote: st.rewardDisciplineNote || '',
        sessionNote: st.sessionNote || '',
      }));

      // Check for saved local draft
      const draftKey = getDraftKey(activeSession?.classroomId, selectedDate, activeSession?.periodNumber);
      let restoredFromDraft = false;

      if (draftKey) {
        try {
          const rawDraft = localStorage.getItem(draftKey);
          if (rawDraft) {
            const parsed = JSON.parse(rawDraft);
            if (Array.isArray(parsed.students) && parsed.students.length > 0 && parsed.hasUnsavedChanges) {
              const draftMap = new Map<string, any>(parsed.students.map((s: LocalStudentAttendance) => [s.studentId, s]));
              const merged = serverMapped.map((serverSt) => {
                const draftSt = draftMap.get(serverSt.studentId);
                if (draftSt) {
                  return {
                    ...serverSt,
                    status: draftSt.status ?? serverSt.status,
                    delayMinutes: draftSt.delayMinutes ?? serverSt.delayMinutes,
                    reason: draftSt.reason ?? serverSt.reason,
                    oralGrade: draftSt.oralGrade !== undefined ? draftSt.oralGrade : serverSt.oralGrade,
                    rewardDisciplineType: draftSt.rewardDisciplineType ?? serverSt.rewardDisciplineType,
                    rewardDisciplineNote: draftSt.rewardDisciplineNote ?? serverSt.rewardDisciplineNote,
                    sessionNote: draftSt.sessionNote ?? serverSt.sessionNote,
                  };
                }
                return serverSt;
              });

              setStudentsList(merged);
              setHasUnsavedChanges(true);
              restoredFromDraft = true;
              toast.info('پیش‌نویس ذخیره‌شده بازیابی شد');
            }
          }
        } catch (e) {
          console.error('Failed to parse draft from localStorage', e);
        }
      }

      if (!restoredFromDraft) {
        setStudentsList(serverMapped);
        setHasUnsavedChanges(false);
      }
    } else {
      setStudentsList([]);
    }
  }, [sessionAttendanceData, activeSession?.classroomId, activeSession?.periodNumber, selectedDate]);

  // Persist local draft on every change
  useEffect(() => {
    if (!activeSession?.classroomId || !selectedDate) return;
    const draftKey = getDraftKey(activeSession.classroomId, selectedDate, activeSession.periodNumber);
    if (!draftKey) return;

    if (hasUnsavedChanges && studentsList.length > 0) {
      try {
        localStorage.setItem(
          draftKey,
          JSON.stringify({
            timestamp: Date.now(),
            students: studentsList,
            hasUnsavedChanges: true,
          }),
        );
      } catch (e) {
        console.error('Error saving attendance draft', e);
      }
    }
  }, [hasUnsavedChanges, studentsList, activeSession?.classroomId, activeSession?.periodNumber, selectedDate]);

  // Save changes even after closing tab / navigating away / backgrounding tab
  useEffect(() => {
    const handleSaveOnExit = () => {
      if (!hasUnsavedChanges || !activeSession?.classroomId || studentsList.length === 0) return;

      // 1. Immediately ensure localStorage draft is written synchronously
      const draftKey = getDraftKey(activeSession.classroomId, selectedDate, activeSession.periodNumber);
      if (draftKey) {
        try {
          localStorage.setItem(
            draftKey,
            JSON.stringify({
              timestamp: Date.now(),
              students: studentsList,
              hasUnsavedChanges: true,
            }),
          );
        } catch (e) {
          console.error('Error writing draft on unload', e);
        }
      }

      // 2. Fire background HTTP request using keepalive: true so browser delivers payload even after tab closes
      try {
        const url = `${API_BASE_URL}/attendance/students/bulk`;
        const token = useAuthStore.getState().accessToken;
        const tenantSlug = useTenantStore.getState().currentTenant?.slug;
        const payload = buildAttendancePayload(activeSession, selectedDate, studentsList);

        fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...(tenantSlug ? { 'x-tenant-slug': tenantSlug } : {}),
          },
          body: JSON.stringify(payload),
          keepalive: true,
        }).catch((err) => {
          console.error('Keepalive background save error:', err);
        });
      } catch (err) {
        console.error('Failed to trigger background save on unload:', err);
      }
    };

    const handleBeforeUnload = () => {
      handleSaveOnExit();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        handleSaveOnExit();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handleSaveOnExit);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handleSaveOnExit);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [hasUnsavedChanges, activeSession, selectedDate, studentsList]);

  // 8. Roster Summary Stats
  const rosterStats = useMemo(() => {
    const total = studentsList.length;
    const present = studentsList.filter((s) => s.status === 'PRESENT').length;
    const absent = studentsList.filter((s) => s.status === 'ABSENT').length;
    const tardy = studentsList.filter((s) => s.status === 'TARDY').length;
    const excused = studentsList.filter((s) => s.status === 'EXCUSED_ABSENT').length;
    const graded = studentsList.filter((s) => s.oralGrade !== null && s.oralGrade !== undefined).length;
    const positiveMatters = studentsList.filter(
      (s) => s.rewardDisciplineType === 'POSITIVE' || s.rewardDisciplineType === 'EXCELLENT',
    ).length;
    const recorded = studentsList.filter((s) => s.isRecorded).length;
    return { total, present, absent, tardy, excused, graded, positiveMatters, recorded };
  }, [studentsList]);

  // Filtered Students
  const filteredStudents = useMemo(() => {
    return studentsList
      .filter((s) => {
        if (statusFilter !== 'ALL' && s.status !== statusFilter) return false;
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase().trim();
        const fullName = `${s.user?.firstName || ''} ${s.user?.lastName || ''}`.toLowerCase();
        const code = s.studentCode || '';
        const national = s.nationalCode || '';
        return fullName.includes(q) || code.includes(q) || national.includes(q);
      })
      .sort((a, b) => {
        const lastA = a.user?.lastName || '';
        const lastB = b.user?.lastName || '';
        return lastA.localeCompare(lastB, 'fa');
      });
  }, [studentsList, searchQuery, statusFilter]);


  // 9. Query: Student Track Record / History in Subject
  const {
    data: studentHistoryData,
    isLoading: isLoadingStudentHistory,
  } = useQuery({
    enabled: !!evaluationModalStudent && !!activeSession?.classroomId,
    queryKey: [
      'student-subject-history',
      evaluationModalStudent?.studentId,
      activeSession?.classroomId,
      activeSession?.lessonId,
    ],
    queryFn: async () => {
      if (!evaluationModalStudent || !activeSession?.classroomId) return null;
      let url = `/attendance/student-history?studentId=${evaluationModalStudent.studentId}&classroomId=${activeSession.classroomId}`;
      if (activeSession.lessonId) {
        url += `&lessonId=${activeSession.lessonId}`;
      }
      const res: any = await apiClient.get(url);
      const raw = res?.data || res;
      return raw?.data || raw;
    },
  });

  // Combined History (Merged live session state + past DB records)
  const combinedHistory = useMemo(() => {
    const rawSessions: any[] = studentHistoryData?.sessions || [];
    if (!evaluationModalStudent || !activeSession) {
      return {
        sessions: rawSessions,
        summary: studentHistoryData?.summary || {
          totalSessions: 0,
          presentCount: 0,
          absentCount: 0,
          tardyCount: 0,
          excusedCount: 0,
          oralGradesCount: 0,
          oralAverage: null,
          positiveRewardsCount: 0,
          negativeDisciplineCount: 0,
        },
      };
    }

    const currentGrade =
      modalOralGrade.trim() !== ''
        ? parseFloat(modalOralGrade)
        : evaluationModalStudent.oralGrade !== null && evaluationModalStudent.oralGrade !== undefined
        ? Number(evaluationModalStudent.oralGrade)
        : null;

    const currentReward =
      modalDisciplineType !== 'NONE'
        ? modalDisciplineType
        : evaluationModalStudent.rewardDisciplineType !== 'NONE'
        ? evaluationModalStudent.rewardDisciplineType
        : null;

    const currentRewardNote =
      modalDisciplineNote.trim() || evaluationModalStudent.rewardDisciplineNote || '';

    const currentSessionNote =
      modalSessionNote.trim() || evaluationModalStudent.sessionNote || '';

    const currentSessionItem = {
      id: 'current-session-live',
      date: selectedDate,
      periodNumber: activeSession.periodNumber,
      status: evaluationModalStudent.status,
      delayMinutes: evaluationModalStudent.delayMinutes || 0,
      reason: evaluationModalStudent.reason || '',
      oralGrade: currentGrade,
      rewardDisciplineType: currentReward,
      rewardDisciplineNote: currentRewardNote,
      sessionNote: currentSessionNote,
      isCurrent: true,
    };

    const filteredPast = rawSessions.filter(
      (s: any) => !(s.date === selectedDate && s.periodNumber === activeSession.periodNumber),
    );

    const mergedSessions = [currentSessionItem, ...filteredPast];

    const totalSessions = mergedSessions.length;
    const presentCount = mergedSessions.filter((s) => s.status === 'PRESENT').length;
    const absentCount = mergedSessions.filter((s) => s.status === 'ABSENT').length;
    const tardyCount = mergedSessions.filter((s) => s.status === 'TARDY').length;
    const excusedCount = mergedSessions.filter((s) => s.status === 'EXCUSED_ABSENT').length;

    const grades = mergedSessions
      .map((s) => s.oralGrade)
      .filter((g): g is number => typeof g === 'number' && !isNaN(g));
    const oralAverage =
      grades.length > 0
        ? Number((grades.reduce((a, b) => a + b, 0) / grades.length).toFixed(2))
        : null;

    const positiveRewardsCount = mergedSessions.filter(
      (s) => s.rewardDisciplineType === 'POSITIVE' || s.rewardDisciplineType === 'EXCELLENT',
    ).length;

    const negativeDisciplineCount = mergedSessions.filter(
      (s) =>
        s.rewardDisciplineType === 'NEGATIVE' ||
        s.rewardDisciplineType === 'WARNING' ||
        s.rewardDisciplineType === 'HOMEWORK_INCOMPLETE',
    ).length;

    return {
      sessions: mergedSessions,
      summary: {
        totalSessions,
        presentCount,
        absentCount,
        tardyCount,
        excusedCount,
        oralGradesCount: grades.length,
        oralAverage,
        positiveRewardsCount,
        negativeDisciplineCount,
      },
    };
  }, [
    studentHistoryData,
    evaluationModalStudent,
    activeSession,
    selectedDate,
    modalOralGrade,
    modalDisciplineType,
    modalDisciplineNote,
    modalSessionNote,
  ]);

  // 10. Bulk Save Attendance Mutation
  const saveAttendanceMutation = useMutation({
    mutationFn: async () => {
      if (!activeSession) return;
      const payload = buildAttendancePayload(activeSession, selectedDate, studentsList);
      const res: any = await apiClient.post('/attendance/students/bulk', payload);
      return res?.data || res;
    },
    onSuccess: (data: any) => {
      toast.success('ثبت شد');
      setHasUnsavedChanges(false);
      if (activeSession?.classroomId) {
        const draftKey = getDraftKey(activeSession.classroomId, selectedDate, activeSession.periodNumber);
        if (draftKey) localStorage.removeItem(draftKey);
      }
      queryClient.invalidateQueries({ queryKey: ['classroom-attendance'] });
      queryClient.invalidateQueries({ queryKey: ['teacher-daily-schedule'] });
      queryClient.invalidateQueries({ queryKey: ['attendance-stats'] });
    },
    onError: (err: any) => {
      console.error('Save attendance error:', err);
      const rawMsg = err?.response?.data?.message;
      const errorMsg = Array.isArray(rawMsg) ? rawMsg.join(' - ') : rawMsg || err?.message || 'خطا در برقراری ارتباط با سرور';
      toast.error('خطا در ثبت اطلاعات دفتر کلاسی', {
        description: errorMsg,
      });
    },
  });

  const isModifiedFromDefault = useMemo(() => {
    if (studentsList.length === 0) return false;
    return studentsList.some(
      (s) =>
        s.status !== 'PRESENT' ||
        (s.delayMinutes && s.delayMinutes > 0) ||
        (s.reason && s.reason.trim() !== '')
    );
  }, [studentsList]);

  const handleResetToDefault = () => {
    setStudentsList((prev) =>
      prev.map((s) => ({
        ...s,
        status: 'PRESENT',
        delayMinutes: 0,
        reason: '',
      }))
    );
    setHasUnsavedChanges(true);
    toast.info('حضور و غیاب بازنشانی شد');
  };

  const handleMarkAllPresent = () => {
    setStudentsList((prev) =>
      prev.map((s) => ({
        ...s,
        status: 'PRESENT',
        delayMinutes: 0,
      })),
    );
    setHasUnsavedChanges(true);
    toast.info('تمامی دانش‌آموزان به عنوان «حاضر» علامت‌گذاری شدند');
  };

  const handleResetToSaved = () => {
    if (activeSession?.classroomId) {
      const draftKey = getDraftKey(activeSession.classroomId, selectedDate, activeSession.periodNumber);
      if (draftKey) localStorage.removeItem(draftKey);
    }
    refetchRoster();
    setHasUnsavedChanges(false);
    toast.info('تغییرات به آخرین وضعیت ذخیره‌شده بازگردانی شد');
  };

  const handleUpdateStudentStatus = (studentId: string, newStatus: AttendanceStatus) => {
    setStudentsList((prev) =>
      prev.map((s) => {
        if (s.studentId === studentId) {
          return {
            ...s,
            status: newStatus,
            delayMinutes: newStatus === 'TARDY' ? (s.delayMinutes || 15) : 0,
          };
        }
        return s;
      }),
    );
    setHasUnsavedChanges(true);
  };

  const handleOpenTardyModal = (st: LocalStudentAttendance) => {
    if (isReadOnly) {
      toast.error('امکان تغییر تاخیر برای روزهای گذشته وجود ندارد');
      return;
    }
    setTardyModalStudent(st);
    setTardyInputMinutes(st.delayMinutes && st.delayMinutes > 0 ? st.delayMinutes : 15);
  };

  const handleConfirmTardy = () => {
    if (!tardyModalStudent || isReadOnly) return;
    const mins = Number(tardyInputMinutes) || 15;
    setStudentsList((prev) =>
      prev.map((s) => {
        if (s.studentId === tardyModalStudent.studentId) {
          return {
            ...s,
            status: 'TARDY',
            delayMinutes: mins,
          };
        }
        return s;
      }),
    );
    setHasUnsavedChanges(true);
    setTardyModalStudent(null);
    toast.success(`تاخیر ${toPersianDigits(mins)} دقیقه‌ای ثبت شد`);
  };

  const handleSelectReward = (val: string) => {
    setSelectedRewardOption(val);
    setSelectedDisciplineOption('');
    if (val) {
      setModalDisciplineType('POSITIVE');
      setModalDisciplineNote(val);
    } else {
      setModalDisciplineType('NONE');
      setModalDisciplineNote('');
    }
  };

  const handleSelectDiscipline = (val: string) => {
    setSelectedDisciplineOption(val);
    setSelectedRewardOption('');
    if (val) {
      setModalDisciplineType('NEGATIVE');
      setModalDisciplineNote(val);
    } else {
      setModalDisciplineType('NONE');
      setModalDisciplineNote('');
    }
  };

  const handleOpenEvaluationModal = (st: LocalStudentAttendance) => {
    const currentSt = studentsList.find((s) => s.studentId === st.studentId) || st;
    setEvaluationModalStudent(currentSt);
    setModalTab('EVALUATE');
    setModalOralGrade(currentSt.oralGrade !== null && currentSt.oralGrade !== undefined ? String(currentSt.oralGrade) : '');
    setModalDisciplineType(currentSt.rewardDisciplineType || 'NONE');
    setModalDisciplineNote(currentSt.rewardDisciplineNote || '');
    if (currentSt.rewardDisciplineType === 'POSITIVE' || currentSt.rewardDisciplineType === 'EXCELLENT') {
      setSelectedRewardOption(currentSt.rewardDisciplineNote || 'تشویقی کلی (+۲)');
      setSelectedDisciplineOption('');
    } else if (currentSt.rewardDisciplineType && currentSt.rewardDisciplineType !== 'NONE') {
      setSelectedDisciplineOption(currentSt.rewardDisciplineNote || 'مورد انضباطی کلی (-۲)');
      setSelectedRewardOption('');
    } else {
      setSelectedRewardOption('');
      setSelectedDisciplineOption('');
    }
    setModalSessionNote(currentSt.sessionNote || '');
    setModalDelayMinutes(currentSt.delayMinutes || 0);
    setModalReason(currentSt.reason || '');
  };

  const handleSaveModalEvaluation = async () => {
    if (!evaluationModalStudent) return;
    const parsedGrade = modalOralGrade.trim() !== '' ? parseFloat(modalOralGrade) : null;
    if (parsedGrade !== null && (isNaN(parsedGrade) || parsedGrade < 0 || parsedGrade > 20)) {
      toast.error('نمره پرسش کلاسی باید عددی بین ۰ تا ۲۰ باشد');
      return;
    }

    const currentSt = studentsList.find((s) => s.studentId === evaluationModalStudent.studentId) || evaluationModalStudent;

    const updatedStudent: LocalStudentAttendance = {
      ...currentSt,
      oralGrade: parsedGrade,
      rewardDisciplineType: modalDisciplineType,
      rewardDisciplineNote: modalDisciplineNote.trim(),
      sessionNote: modalSessionNote.trim(),
      // Preserve live attendance status without resetting
      status: currentSt.status,
      delayMinutes: currentSt.delayMinutes || 0,
      reason: currentSt.reason || '',
    };

    const nextList = studentsList.map((s) =>
      s.studentId === evaluationModalStudent.studentId ? updatedStudent : s,
    );
    setStudentsList(nextList);

    if (activeSession) {
      try {
        setIsSavingEvaluation(true);
        // Save ONLY this specific student's evaluation to avoid altering or recording other students' attendance
        await apiClient.post('/attendance/students/bulk', {
          classroomId: activeSession.classroomId,
          lessonId: activeSession.lessonId || undefined,
          date: selectedDate,
          periodNumber: activeSession.periodNumber || 1,
          attendances: [{
            studentId: updatedStudent.studentId,
            status: updatedStudent.status,
            delayMinutes: updatedStudent.status === 'TARDY' ? (Number(updatedStudent.delayMinutes) || 0) : 0,
            reason: updatedStudent.reason?.trim() ? updatedStudent.reason.trim() : undefined,
            oralGrade: updatedStudent.oralGrade !== null && updatedStudent.oralGrade !== undefined && String(updatedStudent.oralGrade).trim() !== '' ? Number(updatedStudent.oralGrade) : null,
            rewardDisciplineType: updatedStudent.rewardDisciplineType && updatedStudent.rewardDisciplineType !== 'NONE' ? updatedStudent.rewardDisciplineType : null,
            rewardDisciplineNote: updatedStudent.rewardDisciplineNote?.trim() ? updatedStudent.rewardDisciplineNote.trim() : null,
            sessionNote: updatedStudent.sessionNote?.trim() ? updatedStudent.sessionNote.trim() : null,
          }],
        });

        queryClient.invalidateQueries({ queryKey: ['student-subject-history'] });
        queryClient.invalidateQueries({ queryKey: ['attendance-stats'] });
        toast.success('ارزیابی و سوابق با موفقیت ذخیره شد');
        setEvaluationModalStudent(null);
      } catch (err: any) {
        console.error('Error saving session evaluation:', err);
        setHasUnsavedChanges(true);
        setEvaluationModalStudent(null);
        toast.success('ارزیابی در لیست کلاس ثبت شد');
      } finally {
        setIsSavingEvaluation(false);
      }
    } else {
      setHasUnsavedChanges(true);
      setEvaluationModalStudent(null);
      toast.success('ارزیابی دانش‌آموز ثبت شد');
    }
  };

  const handleDeleteModalEvaluation = async () => {
    if (!evaluationModalStudent) return;

    const currentSt = studentsList.find((s) => s.studentId === evaluationModalStudent.studentId) || evaluationModalStudent;

    const updatedStudent: LocalStudentAttendance = {
      ...currentSt,
      oralGrade: null,
      rewardDisciplineType: 'NONE',
      rewardDisciplineNote: '',
      sessionNote: '',
      status: currentSt.status,
      delayMinutes: currentSt.delayMinutes || 0,
      reason: currentSt.reason || '',
    };

    const nextList = studentsList.map((s) =>
      s.studentId === evaluationModalStudent.studentId ? updatedStudent : s,
    );
    setStudentsList(nextList);

    if (activeSession) {
      try {
        setIsSavingEvaluation(true);
        await apiClient.post('/attendance/students/bulk', {
          classroomId: activeSession.classroomId,
          lessonId: activeSession.lessonId || undefined,
          date: selectedDate,
          periodNumber: activeSession.periodNumber || 1,
          attendances: [{
            studentId: updatedStudent.studentId,
            status: updatedStudent.status,
            delayMinutes: updatedStudent.status === 'TARDY' ? (Number(updatedStudent.delayMinutes) || 0) : 0,
            reason: updatedStudent.reason?.trim() ? updatedStudent.reason.trim() : undefined,
            oralGrade: null,
            rewardDisciplineType: null,
            rewardDisciplineNote: null,
            sessionNote: null,
          }],
        });

        queryClient.invalidateQueries({ queryKey: ['student-subject-history'] });
        queryClient.invalidateQueries({ queryKey: ['attendance-stats'] });
        toast.success('ارزیابی، نمرات و یادداشت این جلسه حذف شد');
        setEvaluationModalStudent(null);
      } catch (err: any) {
        console.error('Error deleting session evaluation:', err);
        setHasUnsavedChanges(true);
        setEvaluationModalStudent(null);
        toast.info('ارزیابی در لیست پاک شد (نیازمند ثبت نهایی)');
      } finally {
        setIsSavingEvaluation(false);
      }
    } else {
      setHasUnsavedChanges(true);
      setEvaluationModalStudent(null);
      toast.info('ارزیابی دانش‌آموز پاک شد');
    }
  };

  // 11. Query: Staff Attendance
  const { data: staffAttendanceData, isLoading: isLoadingStaffAttendance } = useQuery({
    enabled: isManagerOrAdmin && activeTab === 'staff_attendance',
    queryKey: ['teachers-attendance', selectedDate],
    queryFn: async () => {
      const res: any = await apiClient.get(`/attendance/teachers?date=${selectedDate}`);
      const list = res?.data || res || [];
      return Array.isArray(list) ? list : [];
    },
  });

  return (
    <div className="space-y-4 pb-20 font-sans text-right max-w-7xl mx-auto" dir="rtl">
      {/* ─────────────────────────────────────────────────────────────
          1. TOP APP BAR & LIVE SYSTEM TIME (Master Panel Header)
      ───────────────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-[#151C28] rounded-2xl border-[1.5px] border-primary-dark/30 dark:border-[#242F42] shadow-[2px_2px_0_#59BBAF] dark:shadow-[2px_2px_0_#0B0F17] p-4 sm:p-5 space-y-3.5">
        {/* Row 1: Header */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-primary/10 text-primary dark:text-primary border border-primary/25 flex items-center justify-center font-black shadow-2xs shrink-0">
            <CalendarCheck className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg sm:text-2xl font-black text-ink-darker dark:text-white truncate">
              دفتر کلاسی
            </h1>
          </div>
        </div>

        {/* Teacher Selector for Admin/Staff - full width below title */}
        {isManagerOrAdmin && (
          <select
            value={selectedTeacherId}
            onChange={(e) => {
              setSelectedTeacherId(e.target.value);
              setActiveSession(null);
            }}
            className="w-full h-9 px-3 text-xs font-bold rounded-xl border border-gray-200 dark:border-[#242F42] bg-gray-50 dark:bg-[#1C2536] text-foreground dark:text-white cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="">همه مربیان / برنامه کلی</option>
            {teachersData?.map((t: any) => (
              <option key={t.id} value={t.id}>
                {t.user?.firstName} {t.user?.lastName} {t.speciality ? `(${t.speciality})` : ''}
              </option>
            ))}
          </select>
        )}

        {/* Row 2: Jalali Date Navigator Bar */}
        <div className="grid grid-cols-1 sm:flex sm:items-center sm:justify-between gap-2 pt-1">
          {/* Date Navigator Bar */}
          <div className="flex items-center bg-gray-50 dark:bg-[#1C2536] border border-gray-200 dark:border-[#242F42] rounded-xl p-1 justify-between">
            {/* Right: روز قبل (Previous Day in RTL) */}
            <button
              type="button"
              onClick={() => navigateDate(-1)}
              title="روز قبل"
              aria-label="روز قبل"
              className="p-1.5 hover:bg-gray-200 dark:hover:bg-[#242F42] rounded-lg transition-colors text-foreground dark:text-white shrink-0 cursor-pointer"
            >
              <ChevronRight className="w-4 h-4 text-primary" />
            </button>

            <div
              onClick={() => setShowDatePickerModal(!showDatePickerModal)}
              className="px-3 py-1 text-center cursor-pointer hover:bg-gray-200/50 dark:hover:bg-[#242F42]/50 rounded-lg transition-colors flex items-center justify-center gap-1.5 min-w-0"
            >
              <CalendarDays className="w-4 h-4 text-primary shrink-0" />
              <div className="text-xs sm:text-sm font-black text-foreground dark:text-white truncate">
                <span className="text-primary ml-1">{currentDayOfWeekInfo.name}</span>
                {formatJalaliDisplay(selectedDate, false)}
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            </div>

            {/* Left: روز بعد (Next Day in RTL) */}
            <button
              type="button"
              onClick={() => navigateDate(1)}
              title="روز بعد"
              aria-label="روز بعد"
              className="p-1.5 hover:bg-gray-200 dark:hover:bg-[#242F42] rounded-lg transition-colors text-foreground dark:text-white shrink-0 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4 text-primary" />
            </button>
          </div>

          {/* Quick Buttons */}
          <div className="flex items-center gap-2">
            {!isSelectedDateToday && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedDate(todayJalali);
                  setActiveSession(null);
                }}
                className="w-full sm:w-auto rounded-xl border border-gray-200 dark:border-[#242F42] text-xs font-bold h-9"
              >
                بازگشت به امروز
              </Button>
            )}

            {isSelectedDateToday && (
              <span className="hidden sm:inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-3 py-1.5 rounded-xl border border-emerald-200 dark:border-emerald-800">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                امروز
              </span>
            )}
          </div>
        </div>

        {/* Modal / Popup for Persian Date Picker */}
        {showDatePickerModal && (
          <div className="p-3 bg-gray-50 dark:bg-[#1C2536] border border-gray-200 dark:border-[#242F42] rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3 animate-in fade-in duration-150">
            <div className="w-full sm:w-72">
              <PersianDatePicker
                value={selectedDate}
                onChange={(d) => {
                  setSelectedDate(d);
                  setActiveSession(null);
                  setShowDatePickerModal(false);
                }}
                placeholder="انتخاب مستقیم تاریخ شمسی"
                className="h-10 text-xs font-bold w-full"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDatePickerModal(false)}
              className="w-full sm:w-auto rounded-xl border border-gray-200 dark:border-[#242F42] text-xs font-bold"
            >
              بستن
            </Button>
          </div>
        )}

        {/* Row 3: Staff Attendance Tab (Only for Admins/Managers) */}
        {isManagerOrAdmin && (
          <div className="flex items-center gap-1.5 bg-gray-50 dark:bg-[#1C2536] p-1 rounded-xl border border-gray-200 dark:border-[#242F42] w-full">
            <button
              type="button"
              onClick={() => {
                setActiveTab('today_schedule');
                setActiveSession(null);
              }}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all text-center cursor-pointer ${
                activeTab === 'today_schedule'
                  ? 'bg-white dark:bg-[#151C28] text-primary shadow-xs font-black'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              برنامه زنگ‌ها
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('staff_attendance');
                setActiveSession(null);
              }}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all text-center cursor-pointer ${
                activeTab === 'staff_attendance'
                  ? 'bg-white dark:bg-[#151C28] text-primary shadow-xs font-black'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              پایش تردد همکاران
            </button>
          </div>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. ACTIVE LIVE SESSION BANNER (CURRENT PERIOD)
      ───────────────────────────────────────────────────────────── */}
      {activeNowSlot && !activeSession && activeTab === 'today_schedule' && (
        <div className="bg-gradient-to-r from-emerald-500/10 via-white to-white dark:from-emerald-950/30 dark:via-[#151C28] dark:to-[#151C28] border border-emerald-500/50 rounded-2xl shadow-xs ring-1 ring-emerald-500/30 p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-600 flex items-center justify-center shrink-0">
                <Radio className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="bg-emerald-600 text-white text-[10px] font-black px-2 py-0.5 rounded-lg flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                    هم‌اکنون در حال برگزاری
                  </span>
                  <h3 className="font-black text-sm sm:text-base text-foreground dark:text-white">
                    {activeNowSlot.classroomName} — درس {activeNowSlot.lessonName}
                  </h3>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 font-bold">
                  زنگ {toPersianDigits(activeNowSlot.periodNumber)} ({toPersianDigits(activeNowSlot.startTime)} تا {toPersianDigits(activeNowSlot.endTime)})
                </p>
              </div>
            </div>

            <Button
              onClick={() =>
                setActiveSession({
                  classroomId: activeNowSlot.classroomId,
                  classroomName: activeNowSlot.classroomName,
                  lessonId: activeNowSlot.lessonId,
                  lessonName: activeNowSlot.lessonName,
                  periodNumber: activeNowSlot.periodNumber,
                  startTime: activeNowSlot.startTime,
                  endTime: activeNowSlot.endTime,
                })
              }
              className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-xs h-10 px-4 shrink-0 shadow-xs"
            >
              ورود سریع به دفتر کلاسی
              <ArrowRight className="w-4 h-4 mr-1.5 rotate-180" />
            </Button>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          3. ACTIVE CLASSROOM SESSION VIEW (ROSTER & ATTENDANCE)
      ───────────────────────────────────────────────────────────── */}
      {activeSession ? (
        <div className="space-y-3.5">
          {/* Session Header Toolbar */}
          <div className="bg-white dark:bg-[#151C28] rounded-2xl border border-gray-200/80 dark:border-[#242F42] p-4 sm:p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <button
                  type="button"
                  onClick={() => setActiveSession(null)}
                  className="p-2 sm:p-2.5 bg-gray-50 dark:bg-[#1C2536] hover:bg-gray-100 dark:hover:bg-[#242F42] border border-gray-200 dark:border-[#242F42] rounded-xl transition-colors shrink-0 text-foreground dark:text-white"
                  title="بازگشت به برنامه زنگ‌ها"
                >
                  <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-base sm:text-xl font-black text-foreground dark:text-white truncate">
                      {activeSession.classroomName}
                    </h2>
                    <Badge variant="neutral" className="text-[10px] sm:text-xs font-bold border-gray-200 dark:border-[#242F42]">
                      زنگ {toPersianDigits(activeSession.periodNumber)}
                    </Badge>
                  </div>
                  <p className="text-[11px] sm:text-xs text-muted-foreground font-bold mt-0.5 truncate">
                    {activeSession.lessonName ? `درس: ${activeSession.lessonName} • ` : ''}
                    {currentDayOfWeekInfo.name} {formatJalaliDisplay(selectedDate, false)}
                  </p>
                </div>
              </div>

              {/* Action Buttons: Filter, Gradebook, Submit */}
              <div className="flex items-center gap-2 w-full sm:w-auto sm:justify-end">
                {/* Filter Toggle Button - fixed icon */}
                <button
                  type="button"
                  onClick={() => setShowFilterStats(!showFilterStats)}
                  className={`h-10 w-10 shrink-0 rounded-xl border transition-all inline-flex items-center justify-center cursor-pointer shadow-2xs ${
                    showFilterStats || statusFilter !== 'ALL'
                      ? 'bg-primary text-white border-primary shadow-xs'
                      : 'border-gray-200 dark:border-[#242F42] bg-gray-50 dark:bg-[#1C2536] text-foreground dark:text-gray-200 hover:border-primary/50'
                  }`}
                  title={showFilterStats ? 'بستن فیلترها' : 'نمایش فیلترها و آمار'}
                >
                  <Filter className="w-4 h-4" />
                </button>

                {activeSession.lessonId && (
                  <button
                    type="button"
                    onClick={() =>
                      navigate(`/app/teacher/gradebook?classroomId=${activeSession.classroomId}&lessonId=${activeSession.lessonId}`)
                    }
                    className="flex-1 sm:flex-none h-10 px-3.5 rounded-xl border border-primary/30 dark:border-primary/40 bg-primary/5 hover:bg-primary/10 text-primary dark:text-primary font-black text-xs sm:text-sm inline-flex items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs"
                    title="دفتر نمرات و ارزشیابی برای این کلاس و درس"
                  >
                    <BookOpen className="w-4 h-4 text-primary shrink-0" />
                    <span>دفتر نمرات</span>
                  </button>
                )}

                {/* Auto draft indicator */}
                {hasUnsavedChanges && (
                  <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/40 px-2.5 py-1 rounded-xl">
                    <CheckCircle2 className="w-3 h-3 text-amber-500" />
                    <span>پیش‌نویس خودکار</span>
                  </span>
                )}

                {/* Reset to Default Button (Icon Only) */}
                <button
                  type="button"
                  onClick={handleResetToDefault}
                  disabled={!isModifiedFromDefault}
                  className={`h-10 w-10 shrink-0 rounded-xl border inline-flex items-center justify-center transition-all shadow-2xs ${
                    isModifiedFromDefault
                      ? 'border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/60 cursor-pointer active:scale-95'
                      : 'border-gray-200 dark:border-[#242F42] bg-gray-50/50 dark:bg-[#1C2536]/50 text-muted-foreground/40 dark:text-gray-600 cursor-not-allowed opacity-50'
                  }`}
                  title={isModifiedFromDefault ? 'بازنشانی وضعیت‌ها (ریست)' : 'در حالت پیش‌فرض (حضور همه) قرار دارد'}
                >
                  <RotateCcw className="w-4 h-4 shrink-0" />
                </button>

                <button
                  type="button"
                  onClick={() => saveAttendanceMutation.mutate()}
                  disabled={saveAttendanceMutation.isPending || studentsList.length === 0}
                  className="flex-1 sm:flex-none h-10 px-4 rounded-xl font-black text-xs sm:text-sm border-[1.5px] inline-flex items-center justify-center gap-1.5 transition-all bg-primary hover:bg-primary-hover text-white border-primary-dark shadow-[2px_2px_0_#438C83] dark:shadow-[2px_2px_0_#1F413D] hover:shadow-[2.5px_2.5px_0_#438C83] active:translate-x-[1px] active:translate-y-[1px] cursor-pointer disabled:opacity-50"
                  title="ثبت نهایی حضور و غیاب"
                >
                  {saveAttendanceMutation.isPending ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin ml-1.5" />
                      در حال ثبت...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 ml-1.5" />
                      ثبت نهایی
                    </>
                  )}
                </button>
              </div>

            </div>



            {/* Collapsible Filter & Stats Bar + Search Bar (Toggled via Filter Icon) */}
            {showFilterStats && (
              <div className="pt-2 border-t border-gray-100 dark:border-[#242F42] animate-in fade-in duration-150 space-y-2">
                <div className="grid grid-cols-5 gap-1.5 sm:gap-2.5">
                  <div
                    onClick={() => setStatusFilter('ALL')}
                    className={`cursor-pointer text-center p-2 rounded-xl transition-all border ${
                      statusFilter === 'ALL'
                        ? 'bg-primary/10 border-primary text-primary font-black'
                        : 'bg-gray-50/70 dark:bg-[#1C2536]/70 border-gray-200/70 dark:border-[#242F42] hover:bg-gray-100'
                    }`}
                  >
                    <div className="text-[10px] sm:text-xs font-bold text-muted-foreground">کل</div>
                    <div className="text-sm sm:text-base font-black text-foreground dark:text-white">
                      {toPersianDigits(rosterStats.total)}
                    </div>
                  </div>

                  <div
                    onClick={() => setStatusFilter(statusFilter === 'PRESENT' ? 'ALL' : 'PRESENT')}
                    className={`cursor-pointer text-center p-2 rounded-xl transition-all border ${
                      statusFilter === 'PRESENT'
                        ? 'bg-emerald-100 dark:bg-emerald-950/70 border-emerald-600 text-emerald-800 dark:text-emerald-200'
                        : 'bg-emerald-50/50 dark:bg-emerald-950/30 border-emerald-200/60 dark:border-emerald-800/40 hover:bg-emerald-100/70'
                    }`}
                  >
                    <div className="text-[10px] sm:text-xs font-bold text-emerald-600 dark:text-emerald-400">حاضر</div>
                    <div className="text-sm sm:text-base font-black text-emerald-700 dark:text-emerald-300">
                      {toPersianDigits(rosterStats.present)}
                    </div>
                  </div>

                  <div
                    onClick={() => setStatusFilter(statusFilter === 'ABSENT' ? 'ALL' : 'ABSENT')}
                    className={`cursor-pointer text-center p-2 rounded-xl transition-all border ${
                      statusFilter === 'ABSENT'
                        ? 'bg-rose-100 dark:bg-rose-950/70 border-rose-600 text-rose-800 dark:text-rose-200'
                        : 'bg-rose-50/50 dark:bg-rose-950/30 border-rose-200/60 dark:border-rose-800/40 hover:bg-rose-100/70'
                    }`}
                  >
                    <div className="text-[10px] sm:text-xs font-bold text-rose-600 dark:text-rose-400">غایب</div>
                    <div className="text-sm sm:text-base font-black text-rose-700 dark:text-rose-300">
                      {toPersianDigits(rosterStats.absent)}
                    </div>
                  </div>

                  <div
                    onClick={() => setStatusFilter(statusFilter === 'TARDY' ? 'ALL' : 'TARDY')}
                    className={`cursor-pointer text-center p-2 rounded-xl transition-all border ${
                      statusFilter === 'TARDY'
                        ? 'bg-orange-100 dark:bg-orange-950/70 border-orange-600 text-orange-800 dark:text-orange-200'
                        : 'bg-orange-50/50 dark:bg-orange-950/30 border-orange-200/60 dark:border-orange-800/40 hover:bg-orange-100/70'
                    }`}
                  >
                    <div className="text-[10px] sm:text-xs font-bold text-orange-600 dark:text-orange-400">تاخیر</div>
                    <div className="text-sm sm:text-base font-black text-orange-700 dark:text-orange-300">
                      {toPersianDigits(rosterStats.tardy)}
                    </div>
                  </div>

                  <div
                    onClick={() => setStatusFilter(statusFilter === 'EXCUSED_ABSENT' ? 'ALL' : 'EXCUSED_ABSENT')}
                    className={`cursor-pointer text-center p-2 rounded-xl transition-all border ${
                      statusFilter === 'EXCUSED_ABSENT'
                        ? 'bg-sky-100 dark:bg-sky-950/70 border-sky-600 text-sky-800 dark:text-sky-200'
                        : 'bg-sky-50/50 dark:bg-sky-950/30 border-sky-200/60 dark:border-sky-800/40 hover:bg-sky-100/70'
                    }`}
                  >
                    <div className="text-[10px] sm:text-xs font-bold text-sky-600 dark:text-sky-400">موجه</div>
                    <div className="text-sm sm:text-base font-black text-sky-700 dark:text-sky-300">
                      {toPersianDigits(rosterStats.excused)}
                    </div>
                  </div>
                </div>

                {/* Search Input Bar */}
                <div className="relative pt-1">
                  <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="جستجوی نام یا کد دانش‌آموزی..."
                    className="pr-10 rounded-xl border border-gray-200 dark:border-[#242F42] bg-gray-50/50 dark:bg-[#1C2536] font-bold text-xs h-10 w-full"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Students Direct List (No Outer Wrapper Box) */}
          {isLoadingRoster ? (
            <div className="space-y-2.5 w-full">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="p-3.5 sm:p-4 bg-white dark:bg-[#151C28] border border-gray-200/80 dark:border-[#242F42] rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-3 w-full animate-pulse"
                >
                  {/* Left: avatar + name */}
                  <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
                    {/* Row number */}
                    <div className="w-6 h-4 bg-gray-200 dark:bg-[#242F42] rounded" />
                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-xl bg-gray-200 dark:bg-[#242F42] shrink-0" />
                    {/* Name + badge */}
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="h-3.5 bg-gray-200 dark:bg-[#242F42] rounded-lg w-32" />
                      <div className="h-3 bg-gray-100 dark:bg-[#1C2536] rounded-lg w-20" />
                    </div>
                  </div>
                  {/* Right: status buttons */}
                  <div className="flex items-center gap-1.5 flex-wrap mr-auto md:mr-0">
                    {Array.from({ length: 4 }).map((__, j) => (
                      <div key={j} className="h-8 w-14 rounded-xl bg-gray-100 dark:bg-[#1C2536] border border-gray-200/60 dark:border-[#242F42]" />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="py-12 text-center bg-white dark:bg-[#151C28] border border-dashed border-gray-200 dark:border-[#242F42] rounded-2xl p-4">
              <Users className="w-8 h-8 text-muted-foreground mx-auto mb-1.5 opacity-50" />
              <p className="font-bold text-xs sm:text-sm text-foreground dark:text-white">دانش‌آموزی مطابق فیلتر یافت نشد</p>
              {statusFilter !== 'ALL' && (
                <button
                  type="button"
                  onClick={() => setStatusFilter('ALL')}
                  className="text-xs text-primary underline font-bold mt-1 cursor-pointer"
                >
                  پاک کردن فیلتر وضعیت
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-2.5 w-full">
              {filteredStudents.map((st, idx) => {
                const fullName = `${st.user?.firstName || ''} ${st.user?.lastName || ''}`;
                const hasOralGrade = st.oralGrade !== null && st.oralGrade !== undefined;
                const hasDiscipline = st.rewardDisciplineType && st.rewardDisciplineType !== 'NONE';
                const hasSessionNote = !!st.sessionNote;

                return (
                  <div
                    key={st.studentId}
                    className="p-3.5 sm:p-4 bg-white dark:bg-[#151C28] border border-gray-200/80 dark:border-[#242F42] rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-3 hover:border-primary/40 hover:shadow-xs transition-all w-full"
                  >
                    {/* Student Info: Avatar + Name + Evaluation Chips */}
                    <div
                      onClick={() => handleOpenEvaluationModal(st)}
                      className="flex items-center gap-2.5 sm:gap-3.5 min-w-0 cursor-pointer group"
                      title="برای ثبت نمره پرسش، انضباطی یا یادداشت کلیک کنید"
                    >
                      <div className="w-6 text-center font-mono font-bold text-xs text-muted-foreground shrink-0">
                        {toPersianDigits(idx + 1)}
                      </div>
                      <div className="w-10 h-10 rounded-xl border border-gray-200 dark:border-[#242F42] bg-gray-100 dark:bg-[#1C2536] overflow-hidden shrink-0 group-hover:scale-105 transition-all">
                        {st.user?.avatarUrl ? (
                          <img
                            src={st.user.avatarUrl}
                            alt={fullName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center font-bold text-sm text-foreground dark:text-white">
                            {st.user?.firstName?.[0] || 'د'}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-black text-xs sm:text-sm text-foreground dark:text-white group-hover:text-primary transition-colors truncate">
                            {fullName}
                          </span>

                          {/* Oral Grade Chip */}
                          {hasOralGrade && (
                            <span className="bg-primary/10 text-primary text-[10px] font-bold px-1.5 py-0.5 rounded-md border border-primary/25 flex items-center gap-0.5">
                              <Award className="w-3 h-3 text-primary" />
                              نمره: {toPersianDigits(st.oralGrade!)}
                            </span>
                          )}

                          {/* Disciplinary/Reward Chip */}
                          {hasDiscipline && (
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md border flex items-center gap-0.5 ${
                                st.rewardDisciplineType === 'POSITIVE' || st.rewardDisciplineType === 'EXCELLENT'
                                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                                  : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                              }`}
                            >
                              {st.rewardDisciplineType === 'POSITIVE' && '🌟 مثبت'}
                              {st.rewardDisciplineType === 'EXCELLENT' && '🏆 عالی'}
                              {st.rewardDisciplineType === 'NEGATIVE' && '⚠️ منفی'}
                              {st.rewardDisciplineType === 'WARNING' && '⚡ تذکر'}
                              {st.rewardDisciplineType === 'HOMEWORK_INCOMPLETE' && '📝 بدون تکلیف'}
                            </span>
                          )}

                          {/* Note Chip */}
                          {hasSessionNote && (
                            <span className="bg-gray-100 dark:bg-[#1C2536] border border-gray-200 dark:border-[#242F42] text-foreground dark:text-slate-300 text-[10px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
                              <MessageSquare className="w-2.5 h-2.5 text-blue-500" />
                              یادداشت
                            </span>
                          )}

                          {/* Edit / Add Indicator */}
                          {hasOralGrade || hasDiscipline || hasSessionNote ? (
                            <span className="text-[10px] font-bold text-primary/80 group-hover:text-primary transition-colors flex items-center gap-0.5 mr-0.5" title="ویرایش یا حذف نمرات و موارد انضباطی">
                              <Edit3 className="w-2.5 h-2.5" />
                              <span className="hidden sm:inline">ویرایش</span>
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold text-muted-foreground/60 group-hover:text-primary transition-colors flex items-center gap-0.5 mr-0.5" title="ثبت نمره پرسش، انضباطی یا یادداشت">
                              <Award className="w-2.5 h-2.5" />
                              <span className="hidden sm:inline">ارزیابی / نمره</span>
                            </span>
                          )}
                        </div>

                        <div className="text-[10px] sm:text-xs text-muted-foreground font-mono truncate mt-0.5">
                          کد: {toPersianDigits(st.studentCode)}
                          {st.status === 'TARDY' && st.delayMinutes && st.delayMinutes > 0 && (
                            <span className="text-orange-600 dark:text-orange-400 font-bold mr-1">
                              • تاخیر {toPersianDigits(st.delayMinutes)} دقیقه
                            </span>
                          )}
                          {st.reason && (
                            <span className="text-orange-600 dark:text-orange-400 font-bold mr-1">
                              • {st.reason}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Status Selector - 4 Clean buttons */}
                    <div className="grid grid-cols-4 sm:flex sm:items-center gap-1 sm:gap-1.5 w-full md:w-auto">
                      {/* PRESENT */}
                      <button
                        type="button"
                        onClick={() => handleUpdateStudentStatus(st.studentId, 'PRESENT')}
                        className={`py-1.5 sm:py-1 px-1.5 sm:px-3 rounded-xl font-bold text-[11px] sm:text-xs transition-all flex items-center justify-center gap-1 whitespace-nowrap cursor-pointer ${
                          st.status === 'PRESENT'
                            ? 'bg-emerald-600 text-white shadow-2xs font-black'
                            : 'bg-gray-50 dark:bg-[#1C2536] text-muted-foreground border border-gray-200 dark:border-[#242F42] hover:text-foreground'
                        }`}
                      >
                        <Check className="w-3 h-3 shrink-0" />
                        <span>حاضر</span>
                      </button>

                      {/* ABSENT */}
                      <button
                        type="button"
                        onClick={() => handleUpdateStudentStatus(st.studentId, 'ABSENT')}
                        className={`py-1.5 sm:py-1 px-1.5 sm:px-3 rounded-xl font-bold text-[11px] sm:text-xs transition-all flex items-center justify-center gap-1 whitespace-nowrap cursor-pointer ${
                          st.status === 'ABSENT'
                            ? 'bg-rose-600 text-white shadow-2xs font-black'
                            : 'bg-gray-50 dark:bg-[#1C2536] text-muted-foreground border border-gray-200 dark:border-[#242F42] hover:text-foreground'
                        }`}
                      >
                        <UserX className="w-3 h-3 shrink-0" />
                        <span>غایب</span>
                      </button>

                      {/* TARDY */}
                      <button
                        type="button"
                        onClick={() => handleOpenTardyModal(st)}
                        className={`py-1.5 sm:py-1 px-1.5 sm:px-3 rounded-xl font-bold text-[11px] sm:text-xs transition-all flex items-center justify-center gap-1 whitespace-nowrap cursor-pointer ${
                          st.status === 'TARDY'
                            ? 'bg-orange-500 text-white shadow-2xs font-black'
                            : 'bg-gray-50 dark:bg-[#1C2536] text-muted-foreground border border-gray-200 dark:border-[#242F42] hover:text-foreground'
                        }`}
                      >
                        <Clock className="w-3 h-3 shrink-0" />
                        <span>تاخیر</span>
                      </button>

                      {/* EXCUSED_ABSENT - No modal popup */}
                      <button
                        type="button"
                        onClick={() => handleUpdateStudentStatus(st.studentId, 'EXCUSED_ABSENT')}
                        className={`py-1.5 sm:py-1 px-1.5 sm:px-3 rounded-xl font-bold text-[11px] sm:text-xs transition-all flex items-center justify-center gap-1 whitespace-nowrap cursor-pointer ${
                          st.status === 'EXCUSED_ABSENT'
                            ? 'bg-sky-600 text-white shadow-2xs font-black'
                            : 'bg-gray-50 dark:bg-[#1C2536] text-muted-foreground border border-gray-200 dark:border-[#242F42] hover:text-foreground'
                        }`}
                      >
                        <ShieldAlert className="w-3 h-3 shrink-0" />
                        <span>موجه</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Sticky Mobile Floating Action Footer for Roster */}
          <div className="sm:hidden fixed bottom-0 inset-x-0 bg-white/95 dark:bg-[#151C28]/95 backdrop-blur-md border-t border-gray-200 dark:border-[#242F42] p-2.5 pb-[max(0.75rem,env(safe-area-inset-bottom))] z-40 shadow-lg flex items-center gap-2">
            {/* دفتر نمرات - Right */}
            {activeSession?.lessonId ? (
              <button
                type="button"
                onClick={() =>
                  navigate(`/app/teacher/gradebook?classroomId=${activeSession.classroomId}&lessonId=${activeSession.lessonId}`)
                }
                className="flex-1 h-10 rounded-xl border border-primary/30 dark:border-primary/40 bg-primary/5 hover:bg-primary/10 text-primary font-black text-xs inline-flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <BookOpen className="w-3.5 h-3.5 shrink-0" />
                <span>دفتر نمرات</span>
              </button>
            ) : (
              <div className="flex-1" />
            )}

            {/* فیلترها */}
            <button
              type="button"
              onClick={() => setShowFilterStats(!showFilterStats)}
              className={`h-10 w-10 shrink-0 rounded-xl border transition-all inline-flex items-center justify-center cursor-pointer ${
                showFilterStats || statusFilter !== 'ALL'
                  ? 'bg-primary text-white border-primary'
                  : 'border-gray-200 dark:border-[#242F42] bg-gray-50 dark:bg-[#1C2536] text-foreground dark:text-gray-200'
              }`}
              title="فیلترها"
            >
              <Filter className="w-4 h-4" />
            </button>

            {/* ریست - Reset Button (Mobile Icon Only) */}
            <button
              type="button"
              onClick={handleResetToDefault}
              disabled={isReadOnly || !isModifiedFromDefault}
              className={`h-10 w-10 shrink-0 rounded-xl border inline-flex items-center justify-center transition-all ${
                !isReadOnly && isModifiedFromDefault
                  ? 'border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 active:bg-rose-100 cursor-pointer'
                  : 'border-gray-200 dark:border-[#242F42] bg-gray-50/50 dark:bg-[#1C2536]/50 text-muted-foreground/40 dark:text-gray-600 cursor-not-allowed opacity-50'
              }`}
              title={isModifiedFromDefault ? 'بازنشانی وضعیت‌ها (ریست)' : 'در حالت پیش‌فرض (حضور همه) قرار دارد'}
            >
              <RotateCcw className="w-4 h-4 shrink-0" />
            </button>

            {/* ثبت نهایی - Left */}
            <button
              type="button"
              onClick={() => saveAttendanceMutation.mutate()}
              disabled={saveAttendanceMutation.isPending || studentsList.length === 0}
              className="flex-1 h-10 rounded-xl font-black text-xs border-[1.5px] inline-flex items-center justify-center gap-1.5 bg-primary hover:bg-primary-hover text-white border-primary-dark shadow-[2px_2px_0_#438C83] dark:shadow-[2px_2px_0_#1F413D] cursor-pointer disabled:opacity-50"
            >
              {saveAttendanceMutation.isPending ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>در حال ثبت...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>ثبت نهایی</span>
                </>
              )}
            </button>
          </div>
        </div>
      ) : activeTab === 'today_schedule' ? (
        /* ─────────────────────────────────────────────────────────────
            4. TEACHER'S PERIODS & DAILY SCHEDULE
        ───────────────────────────────────────────────────────────── */
        <div className="space-y-3.5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-base sm:text-lg font-black text-foreground dark:text-white">
              برنامه درسی {currentDayOfWeekInfo.name}
            </h2>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground bg-gray-50 dark:bg-[#1C2536] px-3 py-1.5 rounded-xl border border-gray-200 dark:border-[#242F42] shadow-2xs shrink-0">
              <CalendarDays className="w-3.5 h-3.5 text-primary" />
              <span>{formatJalaliDisplay(selectedDate, false)}</span>
            </div>
          </div>

          {isLoadingSchedule ? (
            <div className="space-y-2.5">
              <Skeleton className="h-24 rounded-2xl" />
              <Skeleton className="h-24 rounded-2xl" />
              <Skeleton className="h-24 rounded-2xl" />
            </div>
          ) : schedulesList.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-[#151C28] rounded-2xl border border-dashed border-gray-200 dark:border-[#242F42] p-6 space-y-3">
              <Calendar className="w-10 h-10 text-muted-foreground dark:text-slate-500 mx-auto opacity-50" />
              <div>
                <h3 className="text-sm sm:text-base font-black text-foreground dark:text-white">
                  در روز {currentDayOfWeekInfo.name} زنگ درسی برای شما ثبت نشده است
                </h3>
                <p className="text-xs text-muted-foreground dark:text-slate-400 mt-1 max-w-sm mx-auto">
                  برنامه هفتگی برای این روز خالی است.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {groupedByPeriod.map((period) => {
                const periodTiming = getPeriodTimingStatus(period);
                const isPeriodCurrent = periodTiming === 'CURRENT';
                const isPeriodPassed = periodTiming === 'PASSED';

                return (
                  <div
                    key={period.periodNumber}
                    className="space-y-3.5"
                  >
                    {/* Period Header */}
                    <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-gray-200/60 dark:border-[#242F42]/60 flex-wrap">
                      <div className="flex items-center gap-2 flex-wrap">
                        <div
                          className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${
                            isPeriodCurrent
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : isPeriodPassed
                              ? 'bg-gray-200/70 dark:bg-[#1C2536] text-muted-foreground'
                              : 'bg-primary/10 text-primary'
                          }`}
                        >
                          <Clock className="w-4 h-4" />
                        </div>
                        <h3
                          className={`text-base font-black ${
                            isPeriodCurrent
                              ? 'text-emerald-700 dark:text-emerald-400'
                              : isPeriodPassed
                              ? 'text-foreground/75 dark:text-slate-300'
                              : 'text-foreground dark:text-white'
                          }`}
                        >
                          زنگ {toPersianDigits(period.periodNumber)}
                        </h3>
                        {period.startTime && period.endTime && (
                          <span
                            className={`text-xs font-mono font-bold px-2 py-0.5 rounded-lg border ${
                              isPeriodCurrent
                                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200 border-emerald-300 dark:border-emerald-800'
                                : 'bg-gray-50 dark:bg-[#1C2536] text-muted-foreground border border-gray-200 dark:border-[#242F42]'
                            }`}
                          >
                            {toPersianDigits(period.startTime)} تا {toPersianDigits(period.endTime)}
                          </span>
                        )}
                        <span className="text-[11px] font-bold text-muted-foreground">
                          ({toPersianDigits(period.slots.length)} کلاس)
                        </span>
                      </div>

                      {/* Period Timing Badge */}
                      <div>
                        {isPeriodCurrent ? (
                          <span className="bg-emerald-600 text-white text-[11px] font-black px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-xs">
                            <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                            زنگ فعال هم‌اکنون
                          </span>
                        ) : isPeriodPassed ? (
                          <span className="text-[11px] font-bold text-muted-foreground bg-gray-100 dark:bg-[#1C2536] px-2.5 py-0.5 rounded-lg border border-gray-200 dark:border-[#242F42]">
                            سپری شده
                          </span>
                        ) : (
                          <span className="text-[11px] font-bold text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/50 px-2.5 py-0.5 rounded-lg border border-sky-200 dark:border-sky-800">
                            آینده
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Cards Grid: 300s, 200s, 100s */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                      {period.slots.map((slot) => {
                        const slotTimingStatus = isPeriodPassed
                          ? 'PASSED'
                          : isPeriodCurrent
                          ? 'CURRENT'
                          : checkSlotStatus(slot.startTime, slot.endTime);
                        const isCurrent = slotTimingStatus === 'CURRENT';
                        const isPassed = slotTimingStatus === 'PASSED';
                        const isRecorded = !!slot.stats?.isRecorded;

                        return (
                          <div
                            key={slot.id}
                            onClick={() =>
                              setActiveSession({
                                classroomId: slot.classroomId,
                                classroomName: slot.classroomName,
                                lessonId: slot.lessonId,
                                lessonName: slot.lessonName,
                                periodNumber: slot.periodNumber,
                                startTime: slot.startTime,
                                endTime: slot.endTime,
                              })
                            }
                            className={`cursor-pointer group relative rounded-2xl p-4 sm:p-5 border transition-all ${
                              isCurrent
                                ? 'border-primary/80 dark:border-primary/60 bg-gradient-to-br from-primary/[0.12] via-white to-white dark:from-primary/20 dark:via-[#151C28] dark:to-[#151C28] ring-2 ring-primary/30 shadow-xs hover:border-primary hover:shadow-md'
                                : isPassed
                                ? 'bg-gray-100/75 dark:bg-[#151C28]/60 border-gray-200/80 dark:border-[#242F42]/60 opacity-65 hover:opacity-90 hover:border-gray-300 dark:hover:border-gray-700'
                                : isRecorded
                                ? 'bg-emerald-50/20 dark:bg-emerald-950/20 border-emerald-200/80 dark:border-emerald-800/40 hover:border-primary/50'
                                : 'bg-white dark:bg-[#151C28] border-gray-200/80 dark:border-[#242F42] hover:border-primary/50 hover:shadow-sm'
                            }`}
                          >
                            {isCurrent && (
                              <div className="absolute top-0 right-0 left-0 h-1.5 bg-primary shadow-xs rounded-t-2xl" />
                            )}

                            {/* Classroom Header */}
                            <div className="flex items-center justify-between gap-2 mb-2">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span
                                  className={`font-black text-sm sm:text-base transition-colors truncate ${
                                    isCurrent
                                      ? 'text-primary dark:text-primary-light'
                                      : isPassed
                                      ? 'text-muted-foreground dark:text-gray-400 group-hover:text-foreground dark:group-hover:text-white'
                                      : 'text-foreground dark:text-white group-hover:text-primary'
                                  }`}
                                >
                                  {slot.classroomName}
                                </span>
                              </div>
                              {slot.classroomGrade && (
                                <span className="text-[10px] font-bold text-muted-foreground bg-gray-50 dark:bg-[#1C2536] px-1.5 py-0.5 rounded border border-gray-200 dark:border-[#242F42] shrink-0">
                                  {slot.classroomGrade}
                                </span>
                              )}
                            </div>

                            {/* Lesson Title */}
                            <div className="space-y-1 my-2">
                              <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground truncate">
                                <BookOpen
                                  className={`w-3.5 h-3.5 shrink-0 ${
                                    isCurrent
                                      ? 'text-primary'
                                      : isPassed
                                      ? 'text-muted-foreground/60 dark:text-gray-500'
                                      : 'text-primary'
                                  }`}
                                />
                                <span className={`truncate font-extrabold ${isPassed ? 'text-muted-foreground dark:text-gray-300' : 'text-foreground dark:text-slate-200'}`}>
                                  {slot.lessonName}
                                </span>
                              </div>
                            </div>

                            {/* Footer */}
                            <div className="mt-4 pt-3 border-t border-gray-100 dark:border-[#242F42] flex items-center justify-between text-xs font-bold">
                              <div className="flex items-center gap-1 text-muted-foreground">
                                <Users
                                  className={`w-3.5 h-3.5 ${
                                    isCurrent
                                      ? 'text-primary'
                                      : isPassed
                                      ? 'text-muted-foreground/60 dark:text-gray-500'
                                      : 'text-primary'
                                  }`}
                                />
                                <span>{toPersianDigits(slot.stats?.totalStudents || 0)} دانش‌آموز</span>
                              </div>

                              <div>
                                {isRecorded ? (
                                  <span className="text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-lg border border-emerald-200 dark:border-emerald-800 flex items-center gap-1 font-bold">
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    ثبت شده
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground bg-gray-50 dark:bg-[#1C2536] px-2 py-0.5 rounded-lg border border-gray-200 dark:border-[#242F42]">
                                    در انتظار ثبت
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* ─────────────────────────────────────────────────────────────
            6. STAFF ATTENDANCE MONITORING
        ───────────────────────────────────────────────────────────── */
        <div className="space-y-4">
          <div className="bg-white dark:bg-[#151C28] rounded-2xl border border-gray-200/80 dark:border-[#242F42] p-4 sm:p-5 shadow-xs">
            <h2 className="text-base sm:text-lg font-black text-foreground dark:text-white mb-3">
              پایش تردد همکاران ({formatJalaliDisplay(selectedDate, true)})
            </h2>

            {isLoadingStaffAttendance ? (
              <div className="py-12 text-center">
                <RefreshCw className="w-8 h-8 text-primary animate-spin mx-auto mb-2" />
                <p className="text-xs font-bold text-foreground dark:text-white">در حال بارگذاری سوابق...</p>
              </div>
            ) : staffAttendanceData?.length === 0 ? (
              <div className="py-10 text-center text-muted-foreground font-bold text-xs">
                هیچ رکوردی برای تردد همکاران در این تاریخ ثبت نشده است.
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-[#242F42]">
                {staffAttendanceData?.map((item: any) => (
                  <div key={item.id} className="py-3 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <span className="font-bold text-xs sm:text-sm text-foreground dark:text-white block truncate">
                        {item.teacher?.user?.firstName} {item.teacher?.user?.lastName}
                      </span>
                      <span className="text-[10px] sm:text-xs text-muted-foreground">
                        ورود: {item.entryTime ? toPersianDigits(item.entryTime) : 'ـ'} | خروج: {item.exitTime ? toPersianDigits(item.exitTime) : 'ـ'}
                      </span>
                    </div>
                    <Badge
                      variant="neutral"
                      className={`text-[10px] ${
                        item.status === 'PRESENT'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300'
                          : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300'
                      }`}
                    >
                      {item.status === 'PRESENT' ? 'حاضر' : 'عدم حضور'}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          7. STUDENT EVALUATION & TRACK RECORD BOTTOM SHEET / MODAL
      ───────────────────────────────────────────────────────────── */}
      {evaluationModalStudent && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in"
          onClick={() => setEvaluationModalStudent(null)}
        >
          <div
            className="bg-white dark:bg-[#151C28] border border-gray-200 dark:border-[#242F42] rounded-t-2xl sm:rounded-2xl p-4 sm:p-5 max-w-md w-full max-h-[90vh] overflow-y-auto overscroll-contain shadow-2xl space-y-3"
            onClick={(e) => e.stopPropagation()}
            dir="rtl"
          >
            {/* Mobile Drag Pill */}
            <div className="w-10 h-1 bg-gray-300 dark:bg-gray-600 rounded-full mx-auto sm:hidden -mt-1 mb-1.5" />

            {/* Modal Header */}
            <div className="flex items-center justify-between pb-2.5 border-b border-gray-100 dark:border-[#242F42]">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary border border-primary/25 flex items-center justify-center font-bold text-sm shrink-0">
                  {evaluationModalStudent.user?.firstName?.[0] || 'د'}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-black text-sm text-foreground dark:text-white truncate">
                      {evaluationModalStudent.user?.firstName} {evaluationModalStudent.user?.lastName}
                    </h3>
                    {(evaluationModalStudent.oralGrade !== null && evaluationModalStudent.oralGrade !== undefined ||
                      (evaluationModalStudent.rewardDisciplineType && evaluationModalStudent.rewardDisciplineType !== 'NONE') ||
                      Boolean(evaluationModalStudent.sessionNote?.trim())) && (
                      <span className="text-[9.5px] font-black px-1.5 py-0.2 rounded-md bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 shrink-0">
                        دارای ثبت قبلی
                      </span>
                    )}
                  </div>
                  <div className="text-[10.5px] text-muted-foreground font-mono truncate">
                    کد: {toPersianDigits(evaluationModalStudent.studentCode)}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEvaluationModalStudent(null)}
                className="p-1 hover:bg-gray-100 dark:hover:bg-[#1C2536] rounded-xl text-muted-foreground transition-colors cursor-pointer shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="grid grid-cols-2 gap-1 bg-gray-50 dark:bg-[#1C2536] p-1 rounded-xl border border-gray-200 dark:border-[#242F42]">
              <button
                type="button"
                onClick={() => setModalTab('EVALUATE')}
                className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all text-center cursor-pointer ${
                  modalTab === 'EVALUATE'
                    ? 'bg-white dark:bg-[#151C28] text-primary shadow-xs font-black'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                ارزیابی و نمرات
              </button>
              <button
                type="button"
                onClick={() => setModalTab('HISTORY')}
                className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all text-center cursor-pointer ${
                  modalTab === 'HISTORY'
                    ? 'bg-white dark:bg-[#151C28] text-primary shadow-xs font-black'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                سوابق گذشته
              </button>
            </div>

            {/* Tab 1: Evaluate Current Session */}
            {modalTab === 'EVALUATE' ? (
              <div className="space-y-3.5 pt-0.5">
                {/* 1. Reward & Discipline Section */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-foreground dark:text-slate-300">موارد تشویقی یا انضباطی:</span>
                    {(selectedRewardOption || selectedDisciplineOption) && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedRewardOption('');
                          setSelectedDisciplineOption('');
                          setModalDisciplineType('NONE');
                          setModalDisciplineNote('');
                        }}
                        className="text-[10px] text-rose-500 hover:text-rose-600 font-bold inline-flex items-center gap-0.5 cursor-pointer"
                        title="حذف مورد تشویقی یا انضباطی"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>پاک کردن مورد</span>
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10.5px] font-bold text-emerald-600 dark:text-emerald-400 block mb-0.5">
                        تشویقی (+۲):
                      </label>
                      <select
                        value={selectedRewardOption}
                        onChange={(e) => handleSelectReward(e.target.value)}
                        className="w-full h-9 px-2 rounded-xl border border-gray-200 dark:border-[#242F42] bg-white dark:bg-[#151C28] text-xs font-bold focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer text-foreground dark:text-white"
                      >
                        <option value="">بدون انتخاب</option>
                        {REWARD_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[10.5px] font-bold text-rose-600 dark:text-rose-400 block mb-0.5">
                        انضباطی (-۲):
                      </label>
                      <select
                        value={selectedDisciplineOption}
                        onChange={(e) => handleSelectDiscipline(e.target.value)}
                        className="w-full h-9 px-2 rounded-xl border border-gray-200 dark:border-[#242F42] bg-white dark:bg-[#151C28] text-xs font-bold focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer text-foreground dark:text-white"
                      >
                        <option value="">بدون انتخاب</option>
                        {DISCIPLINE_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* 2. Oral Grade */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-foreground dark:text-white">نمره پرسش کلاسی (۰ تا ۲۰):</label>
                    {modalOralGrade.trim() !== '' && (
                      <button
                        type="button"
                        onClick={() => setModalOralGrade('')}
                        className="text-[10px] text-rose-500 hover:text-rose-600 font-bold inline-flex items-center gap-0.5 cursor-pointer"
                        title="حذف نمره ثبت‌شده"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>حذف نمره</span>
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        setModalOralGrade((v) =>
                          String(Math.min(20, Math.round((parseFloat(v || '0') + 0.25) * 100) / 100))
                        )
                      }
                      className="h-9 w-9 shrink-0 rounded-xl bg-gray-100 dark:bg-[#1C2536] border border-gray-200 dark:border-[#242F42] flex items-center justify-center hover:bg-gray-200 dark:hover:bg-[#242F42] transition-all cursor-pointer text-foreground dark:text-gray-200"
                    >
                      <ChevronUp className="w-4 h-4" />
                    </button>

                    <Input
                      type="number"
                      step="0.25"
                      min="0"
                      max="20"
                      value={modalOralGrade}
                      onChange={(e) => {
                        const v = parseFloat(e.target.value);
                        if (e.target.value === '') setModalOralGrade('');
                        else if (!isNaN(v)) setModalOralGrade(String(Math.min(20, Math.max(0, v))));
                      }}
                      placeholder="نمره (۰ تا ۲۰)"
                      className="rounded-xl border border-gray-200 dark:border-[#242F42] bg-white dark:bg-[#151C28] font-mono font-bold h-9 text-center text-sm flex-1"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setModalOralGrade((v) =>
                          String(Math.max(0, Math.round((parseFloat(v || '0') - 0.25) * 100) / 100))
                        )
                      }
                      className="h-9 w-9 shrink-0 rounded-xl bg-gray-100 dark:bg-[#1C2536] border border-gray-200 dark:border-[#242F42] flex items-center justify-center hover:bg-gray-200 dark:hover:bg-[#242F42] transition-all cursor-pointer text-foreground dark:text-gray-200"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* 3. Note */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-muted-foreground">یادداشت جلسه (اختیاری):</label>
                    {modalSessionNote.trim() !== '' && (
                      <button
                        type="button"
                        onClick={() => setModalSessionNote('')}
                        className="text-[10px] text-rose-500 hover:text-rose-600 font-bold inline-flex items-center gap-0.5 cursor-pointer"
                        title="حذف یادداشت"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>حذف متن</span>
                      </button>
                    )}
                  </div>
                  <Input
                    value={modalSessionNote}
                    onChange={(e) => setModalSessionNote(e.target.value)}
                    placeholder="توضیحات و نکات مربی درباره دانش‌آموز در این جلسه..."
                    className="rounded-xl border border-gray-200 dark:border-[#242F42] bg-white dark:bg-[#151C28] font-bold h-9 text-xs"
                  />
                </div>

                {/* Action Buttons: Delete All, Cancel, Save */}
                <div className="flex items-center justify-between gap-2 pt-2.5 border-t border-gray-100 dark:border-[#242F42]">
                  <div>
                    {(evaluationModalStudent.oralGrade !== null && evaluationModalStudent.oralGrade !== undefined ||
                      (evaluationModalStudent.rewardDisciplineType && evaluationModalStudent.rewardDisciplineType !== 'NONE') ||
                      Boolean(evaluationModalStudent.sessionNote?.trim())) && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={isSavingEvaluation}
                        onClick={handleDeleteModalEvaluation}
                        className="rounded-xl border-rose-300 dark:border-rose-900 bg-rose-50/80 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/60 font-black text-xs h-8.5 px-2.5 inline-flex items-center gap-1 cursor-pointer"
                        title="حذف کامل تمام نمرات و موارد انضباطی این جلسه"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>حذف کل ارزیابی</span>
                      </Button>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEvaluationModalStudent(null)}
                      className="rounded-xl border border-gray-200 dark:border-[#242F42] text-xs font-bold h-8.5 px-3 cursor-pointer"
                    >
                      انصراف
                    </Button>
                    <Button
                      size="sm"
                      disabled={isSavingEvaluation}
                      onClick={handleSaveModalEvaluation}
                      className="rounded-xl bg-primary hover:bg-primary-hover text-white font-black text-xs h-8.5 px-4 shadow-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      {isSavingEvaluation ? (
                        <>
                          <RefreshCw className="w-3 h-3 animate-spin" />
                          <span>در حال ذخیره...</span>
                        </>
                      ) : (
                        <span>
                          {(evaluationModalStudent.oralGrade !== null && evaluationModalStudent.oralGrade !== undefined ||
                            (evaluationModalStudent.rewardDisciplineType && evaluationModalStudent.rewardDisciplineType !== 'NONE') ||
                            Boolean(evaluationModalStudent.sessionNote?.trim()))
                            ? 'ذخیره تغییرات'
                            : 'ثبت'}
                        </span>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              /* Tab 2: Track Record / Subject History */
              <div className="space-y-3 pt-0.5">
                {isLoadingStudentHistory && !studentHistoryData ? (
                  <div className="py-8 text-center space-y-2">
                    <RefreshCw className="w-6 h-6 text-primary animate-spin mx-auto" />
                    <p className="font-bold text-xs text-muted-foreground">در حال بارگذاری سوابق...</p>
                  </div>
                ) : (
                  <>
                    {/* Summary KPI Strip */}
                    <div className="grid grid-cols-4 gap-1.5 bg-gray-50/60 dark:bg-[#1C2536]/60 p-2 rounded-xl border border-gray-200/80 dark:border-[#242F42] text-center">
                      <div className="bg-white dark:bg-[#151C28] p-1.5 rounded-lg border border-gray-200/60 dark:border-[#242F42]">
                        <div className="text-[9.5px] font-bold text-muted-foreground">میانگین</div>
                        <div className="text-xs font-black text-primary">
                          {combinedHistory.summary?.oralAverage !== null
                            ? toPersianDigits(combinedHistory.summary.oralAverage)
                            : 'ـ'}
                        </div>
                      </div>

                      <div className="bg-white dark:bg-[#151C28] p-1.5 rounded-lg border border-gray-200/60 dark:border-[#242F42]">
                        <div className="text-[9.5px] font-bold text-muted-foreground">حضور/غیبت</div>
                        <div className="text-xs font-black text-foreground dark:text-white">
                          {toPersianDigits(combinedHistory.summary?.presentCount)}/{toPersianDigits(combinedHistory.summary?.absentCount)}
                        </div>
                      </div>

                      <div className="bg-white dark:bg-[#151C28] p-1.5 rounded-lg border border-gray-200/60 dark:border-[#242F42]">
                        <div className="text-[9.5px] font-bold text-emerald-600">تشویقی</div>
                        <div className="text-xs font-black text-emerald-700 dark:text-emerald-400">
                          {toPersianDigits(combinedHistory.summary?.positiveRewardsCount || 0)}
                        </div>
                      </div>

                      <div className="bg-white dark:bg-[#151C28] p-1.5 rounded-lg border border-gray-200/60 dark:border-[#242F42]">
                        <div className="text-[9.5px] font-bold text-rose-600">انضباطی</div>
                        <div className="text-xs font-black text-rose-700 dark:text-rose-400">
                          {toPersianDigits(combinedHistory.summary?.negativeDisciplineCount || 0)}
                        </div>
                      </div>
                    </div>

                    {/* Timeline of Sessions */}
                    <div className="space-y-1.5 max-h-[240px] overflow-y-auto pr-1">
                      {combinedHistory.sessions?.length === 0 ? (
                        <div className="py-6 text-center text-xs text-muted-foreground font-bold">
                          سابقه‌ای ثبت نشده است.
                        </div>
                      ) : (
                        combinedHistory.sessions.map((sess: any) => (
                          <div
                            key={sess.id}
                            className={`border p-2 rounded-xl text-xs transition-all ${
                              sess.isCurrent
                                ? 'bg-primary/5 border-primary/40'
                                : 'bg-gray-50/70 dark:bg-[#1C2536]/70 border-gray-200/70 dark:border-[#242F42]'
                            }`}
                          >
                            <div className="flex items-center justify-between flex-wrap gap-1">
                              <span className="font-bold text-foreground dark:text-white">
                                {formatJalaliDisplay(sess.date, false)}
                              </span>
                              <Badge
                                variant="neutral"
                                className={`text-[10px] ${
                                  sess.status === 'PRESENT'
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300'
                                    : sess.status === 'ABSENT'
                                    ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300'
                                    : sess.status === 'TARDY'
                                    ? 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/60 dark:text-orange-300'
                                    : 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/60 dark:text-sky-300'
                                }`}
                              >
                                {sess.status === 'PRESENT' && 'حاضر'}
                                {sess.status === 'ABSENT' && 'غایب'}
                                {sess.status === 'TARDY' && `تاخیر (${toPersianDigits(sess.delayMinutes)}د)`}
                                {sess.status === 'EXCUSED_ABSENT' && 'موجه'}
                              </Badge>
                            </div>

                            {(sess.oralGrade !== null && sess.oralGrade !== undefined || sess.rewardDisciplineType) && (
                              <div className="flex items-center gap-1.5 pt-1 text-[10.5px]">
                                {sess.oralGrade !== null && sess.oralGrade !== undefined && (
                                  <span className="font-bold text-primary bg-primary/10 px-1.5 py-0.2 rounded">
                                    نمره: {toPersianDigits(sess.oralGrade)}
                                  </span>
                                )}
                                {sess.rewardDisciplineType && sess.rewardDisciplineType !== 'NONE' && (
                                  <span className="font-bold text-foreground dark:text-white bg-gray-100 dark:bg-[#1C2536] px-1.5 py-0.2 rounded">
                                    {sess.rewardDisciplineNote || sess.rewardDisciplineType}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* ─────────────────────────────────────────────────────────────
          8. DEDICATED TARDY TIME MODAL
      ───────────────────────────────────────────────────────────── */}
      {tardyModalStudent && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setTardyModalStudent(null)}
        >
          <div
            className="bg-white dark:bg-[#151C28] rounded-2xl border border-gray-200 dark:border-[#242F42] w-full max-w-sm p-5 space-y-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
            dir="rtl"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-[#242F42]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-orange-50 dark:bg-orange-950/60 border border-orange-200 dark:border-orange-800 text-orange-600 flex items-center justify-center font-black">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-black text-sm text-foreground dark:text-white">
                    ثبت تاخیر ورود
                  </h3>
                  <p className="text-[11px] text-muted-foreground font-bold truncate">
                    {tardyModalStudent.user?.firstName} {tardyModalStudent.user?.lastName}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setTardyModalStudent(null)}
                className="p-1.5 hover:bg-gray-100 dark:hover:bg-[#1C2536] rounded-xl text-muted-foreground transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Input Form */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-foreground dark:text-white block">
                مدت زمان تاخیر (دقیقه):
              </label>

              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min="1"
                  max="90"
                  value={tardyInputMinutes}
                  onChange={(e) => setTardyInputMinutes(Number(e.target.value))}
                  className="rounded-xl border border-gray-200 dark:border-[#242F42] bg-gray-50/60 dark:bg-[#1C2536] font-mono font-black text-center text-base h-11"
                  autoFocus
                />
                <span className="text-xs font-bold text-muted-foreground shrink-0">دقیقه</span>
              </div>

              {/* Quick Preset Pills */}
              <div className="grid grid-cols-4 gap-1.5 pt-1">
                {[5, 10, 15, 20, 25, 30, 45, 60].map((mins) => (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => setTardyInputMinutes(mins)}
                    className={`py-1.5 text-xs font-bold rounded-xl border transition-all text-center cursor-pointer ${
                      tardyInputMinutes === mins
                        ? 'bg-orange-500 text-white border-orange-500 shadow-2xs font-black'
                        : 'bg-gray-50 dark:bg-[#1C2536] text-foreground dark:text-gray-200 border-gray-200 dark:border-[#242F42] hover:border-orange-400'
                    }`}
                  >
                    {toPersianDigits(mins)} دقیقه
                  </button>
                ))}
              </div>
            </div>

            {/* Footer Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100 dark:border-[#242F42]">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setTardyModalStudent(null)}
                className="rounded-xl border border-gray-200 dark:border-[#242F42] text-xs font-bold h-9 cursor-pointer"
              >
                انصراف
              </Button>
              <Button
                size="sm"
                onClick={handleConfirmTardy}
                className="rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-black text-xs h-9 shadow-xs cursor-pointer"
              >
                ثبت تاخیر
              </Button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
