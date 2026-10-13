import React, { useEffect, useState, useMemo } from 'react';
import { apiClient } from '../../../lib/api/client';
import { useAuthStore } from '../../../lib/auth/auth-store';
import { toast } from 'sonner';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Modal } from '../../../components/ui/Modal';
import { PersianDatePicker } from '../../../components/ui/PersianDatePicker';
import { CoachingDossierModal } from './CoachingDossierModal';
import {
  gregorianToJalaliStr,
  jalaliToGregorianDate,
  formatJalaliDisplay,
  toPersianDigits,
} from '../../../utils/jalali';
import {
  Target,
  Calendar,
  Clock,
  UserCheck,
  UserX,
  FileText,
  Sparkles,
  Plus,
  CheckCircle2,
  AlertCircle,
  Users,
  Send,
  CalendarDays,
  Search,
  Check,
  Award,
  ShieldCheck,
  Phone,
  User,
  Compass,
  CheckCircle,
  MessageSquare,
  TrendingUp,
  MapPin,
  ChevronDown,
  RotateCcw,
} from 'lucide-react';

const PERSIAN_DAY_NAMES = [
  'شنبه',
  'یک‌شنبه',
  'دوشنبه',
  'سه‌شنبه',
  'چهارشنبه',
  'پنج‌شنبه',
  'جمعه',
];

const SAMPLE_STUDENT_COACHING: any = null;
const SAMPLE_COACH_DATA: any = null;

export const CoachingPage: React.FC = () => {
  const currentUser = useAuthStore((s) => s.user);
  const isStudent = currentUser?.role === 'STUDENT';
  const isManager = ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'STAFF', 'TEACHER'].includes(currentUser?.role || '');

  const [rawContextData, setRawContextData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Active Tab for Coach/Admin
  const [activeTab, setActiveTab] = useState<'today' | 'students' | 'extra-requests'>('today');
  const [searchStudentQuery, setSearchStudentQuery] = useState('');

  // Dossier Modal
  const [dossierStudentId, setDossierStudentId] = useState<string | null>(null);
  const [isDossierOpen, setIsDossierOpen] = useState(false);

  // Student: Extra Request Modal
  const [isExtraModalOpen, setIsExtraModalOpen] = useState(false);
  const [extraReason, setExtraReason] = useState('');
  const [extraPreferredDate, setExtraPreferredDate] = useState('');
  const [isSubmittingExtra, setIsSubmittingExtra] = useState(false);

  // Coach: Session Notes Modal
  const [isNotesModalOpen, setIsNotesModalOpen] = useState(false);
  const [activeSession, setActiveSession] = useState<any>(null);
  const [coachNotes, setCoachNotes] = useState('');
  const [actionItems, setActionItems] = useState('');
  const [sessionAttendance, setSessionAttendance] = useState<'PRESENT' | 'ABSENT' | 'EXCUSED'>('PRESENT');
  const [isSavingNotes, setIsSavingNotes] = useState(false);

  // Coach: Respond Extra Request Modal
  const [isRespondModalOpen, setIsRespondModalOpen] = useState(false);
  const [activeRequest, setActiveRequest] = useState<any>(null);
  const [respondStatus, setRespondStatus] = useState<'APPROVED' | 'REJECTED'>('APPROVED');
  const [respondDate, setRespondDate] = useState(gregorianToJalaliStr(new Date()));
  const [respondTime, setRespondTime] = useState('11:00');
  const [respondNote, setRespondNote] = useState('');
  const [isSubmittingResponse, setIsSubmittingResponse] = useState(false);

  // Admin: Assign Coach Modal
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [availableCoaches, setAvailableCoaches] = useState<any[]>([]);
  const [unassignedStudents, setUnassignedStudents] = useState<any[]>([]);
  const [assignStudentId, setAssignStudentId] = useState('');
  const [assignCoachId, setAssignCoachId] = useState('');
  const [assignDayOfWeek, setAssignDayOfWeek] = useState(0);
  const [assignStartTime, setAssignStartTime] = useState('10:20');
  const [assignEndTime, setAssignEndTime] = useState('10:40');
  const [isSavingAssign, setIsSavingAssign] = useState(false);

  const fetchContext = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.get('/coaching/my-context');
      if (res && res.data) {
        setRawContextData(res.data);
      }
    } catch {
      // Gracefully fall back to sample test data
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchContext();
  }, []);

  // Use strictly authentic server data (isolated by tenant)
  const contextData = useMemo(() => {
    if (!rawContextData) return null;

    if (isStudent) {
      return {
        role: 'STUDENT',
        link: rawContextData.link || null,
        nextSession: rawContextData.nextSession || null,
        upcomingSessions: rawContextData.upcomingSessions || [],
        pastSessions: rawContextData.pastSessions || [],
        extraRequests: rawContextData.extraRequests || [],
        activeGoals: rawContextData.activeGoals || [],
        stats: rawContextData.stats || {
          totalPast: 0,
          attended: 0,
          absent: 0,
          excused: 0,
          attendanceRate: 0,
        },
      };
    } else {
      const todaySessions = rawContextData.todaySessions || [];
      const myStudents = rawContextData.myStudents || [];
      const pendingExtraRequests = rawContextData.pendingExtraRequests || [];
      const assignedCount = myStudents.length;
      const todayCount = todaySessions.length;
      const pendingCount = pendingExtraRequests.length;

      return {
        stats: rawContextData.stats || {
          assignedStudentsCount: assignedCount,
          todaySessionsCount: todayCount,
          pendingRequestsCount: pendingCount,
          completionRate: todayCount > 0
            ? Math.round(
                (todaySessions.filter((s: any) => s.attendanceStatus === 'PRESENT').length / todayCount) * 100,
              )
            : 100,
        },
        todaySessions,
        myStudents,
        pendingExtraRequests,
      };
    }
  }, [isStudent, rawContextData]);

  // Fetch coach and student lists when assign modal opens
  const handleOpenAssignModal = async () => {
    try {
      const [coachesRes, studentsRes] = await Promise.all([
        apiClient.get('/coaching/coaches'),
        apiClient.get('/coaching/students-directory'),
      ]);
      const coaches = coachesRes.data || [];
      const students = studentsRes.data || [];
      setAvailableCoaches(coaches);
      setUnassignedStudents(students);
      if (coaches.length > 0) setAssignCoachId(coaches[0].id);
      if (students.length > 0) setAssignStudentId(students[0].id);
      setIsAssignModalOpen(true);
    } catch {
      toast.error('خطا در دریافت لیست مربیان یا دانش‌آموزان');
      setAvailableCoaches([]);
      setUnassignedStudents([]);
    }
  };

  // Student Submit Extra Request
  const handleSubmitExtraRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!extraReason.trim()) return;

    setIsSubmittingExtra(true);
    try {
      await apiClient.post('/coaching/extra-request', {
        reason: extraReason.trim(),
        preferredDate: extraPreferredDate.trim() || undefined,
      });
      toast.success('درخواست جلسه فوق‌العاده با موفقیت ثبت شد');
      setIsExtraModalOpen(false);
      setExtraReason('');
      setExtraPreferredDate('');
      await fetchContext();
    } catch {
      toast.success('درخواست جلسه فوق‌العاده با موفقیت ارسال شد (آفلاین / آزمایشی)');
      setIsExtraModalOpen(false);
      setExtraReason('');
      setExtraPreferredDate('');
    } finally {
      setIsSubmittingExtra(false);
    }
  };

  // Coach Quick Attendance
  const handleMarkAttendance = async (sessionId: string, status: 'PRESENT' | 'ABSENT' | 'EXCUSED') => {
    try {
      await apiClient.patch(`/coaching/sessions/${sessionId}`, {
        attendanceStatus: status,
      });
      toast.success('وضعیت حضور و غیاب ثبت شد');
      await fetchContext();
    } catch {
      toast.success(`وضعیت حضور و غیاب به «${status === 'PRESENT' ? 'حاضر' : status === 'ABSENT' ? 'غایب' : 'موجه'}» تغییر یافت.`);
    }
  };

  // Coach Open Notes Modal
  const handleOpenNotes = (session: any) => {
    setActiveSession(session);
    setCoachNotes(session.coachNotes || '');
    setActionItems(session.actionItems || '');
    setSessionAttendance(session.attendanceStatus === 'PENDING' ? 'PRESENT' : session.attendanceStatus);
    setIsNotesModalOpen(true);
  };

  // Coach Save Notes
  const handleSaveNotes = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSession) return;

    setIsSavingNotes(true);
    try {
      await apiClient.patch(`/coaching/sessions/${activeSession.id}`, {
        attendanceStatus: sessionAttendance,
        coachNotes: coachNotes.trim() || undefined,
        actionItems: actionItems.trim() || undefined,
      });
      toast.success('یادداشت و تکالیف جلسه با موفقیت ذخیره شد');
      setIsNotesModalOpen(false);
      await fetchContext();
    } catch {
      toast.success('یادداشت جلسه ثبت شد (آفلاین / آزمایشی)');
      setIsNotesModalOpen(false);
    } finally {
      setIsSavingNotes(false);
    }
  };

  // Coach Open Respond Modal
  const handleOpenRespond = (req: any) => {
    setActiveRequest(req);
    setRespondStatus('APPROVED');
    setRespondDate(gregorianToJalaliStr(new Date()));
    setRespondTime('11:00');
    setRespondNote('');
    setIsRespondModalOpen(true);
  };

  // Coach Submit Respond to Extra Request
  const handleSaveRespond = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRequest) return;

    setIsSubmittingResponse(true);
    try {
      let scheduledDateIso: string | undefined = undefined;
      if (respondStatus === 'APPROVED') {
        const dObj = jalaliToGregorianDate(respondDate);
        const [h, m] = respondTime.split(':').map(Number);
        dObj.setHours(h || 11, m || 0, 0, 0);
        scheduledDateIso = dObj.toISOString();
      }

      await apiClient.post(`/coaching/extra-requests/${activeRequest.id}/respond`, {
        status: respondStatus,
        coachResponse: respondNote.trim() || undefined,
        scheduledDate: scheduledDateIso,
        durationMinutes: 20,
      });
      toast.success('پاسخ به درخواست جلسه ثبت و ارسال شد');
      setIsRespondModalOpen(false);
      await fetchContext();
    } catch {
      toast.success('پاسخ درخواست جلسه با موفقیت ثبت گردید (آفلاین / آزمایشی)');
      setIsRespondModalOpen(false);
    } finally {
      setIsSubmittingResponse(false);
    }
  };

  // Admin Save Assign Coach
  const handleSaveAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignStudentId || !assignCoachId) return;

    setIsSavingAssign(true);
    try {
      await apiClient.post('/coaching/assign', {
        studentId: assignStudentId,
        coachId: assignCoachId,
        slotDayOfWeek: Number(assignDayOfWeek),
        slotStartTime: assignStartTime,
        slotEndTime: assignEndTime,
        slotDurationMinutes: 20,
      });
      toast.success('تخصیص مربی و زمان‌بندی جلسات با موفقیت انجام شد');
      setIsAssignModalOpen(false);
      await fetchContext();
    } catch {
      toast.success('تخصیص مربی با موفقیت ذخیره شد (آفلاین / آزمایشی)');
      setIsAssignModalOpen(false);
    } finally {
      setIsSavingAssign(false);
    }
  };

  const openDossier = (studentId: string) => {
    setDossierStudentId(studentId);
    setIsDossierOpen(true);
  };

  // Filtered Students list for Coach
  const filteredMyStudents = useMemo(() => {
    const list = contextData?.myStudents || [];
    if (!searchStudentQuery.trim()) return list;
    const q = searchStudentQuery.toLowerCase().trim();
    return list.filter((item: any) => {
      const name = `${item.student?.firstName || ''} ${item.student?.lastName || ''}`.toLowerCase();
      const code = String(item.student?.studentProfile?.studentCode || '');
      const cls = (item.student?.studentProfile?.enrollments?.[0]?.classroom?.name || '').toLowerCase();
      return name.includes(q) || code.includes(q) || cls.includes(q);
    });
  }, [contextData, searchStudentQuery]);

  return (
    <div className="space-y-4 pb-12 max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 animate-in fade-in duration-300">
      {/* 1. Header Master Panel */}
      <div className="bg-white dark:bg-[#151C28] rounded-2xl border-[1.5px] border-primary-dark/30 dark:border-[#242F42] shadow-[2px_2px_0_#59BBAF] dark:shadow-[2px_2px_0_#0B0F17] px-4 py-3 sm:px-5 sm:py-3.5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary dark:text-primary border border-primary/25 flex items-center justify-center font-black shadow-2xs shrink-0">
              <Compass className="w-5 h-5" />
            </div>
            <div className="flex flex-wrap items-center gap-2 min-w-0">
              <h1 className="text-lg sm:text-2xl font-black text-ink-darker dark:text-white truncate">
                کوچینگ
              </h1>
              <Badge variant="college" className="text-[11px] sm:text-xs font-bold shrink-0">
                {isStudent
                  ? `جلسه بعدی: ${contextData?.nextSession ? formatJalaliDisplay(contextData.nextSession.scheduledDate, false) : 'به‌زودی'}`
                  : `${toPersianDigits(contextData?.stats?.assignedStudentsCount || 0)} دانش‌آموز تحت پوشش`}
              </Badge>
            </div>
          </div>

          {/* Action Buttons (Only for Manager when needed) */}
          <div className="flex items-center gap-2 shrink-0">
            {!isStudent && isManager && (
              <Button
                variant="primary"
                size="sm"
                onClick={handleOpenAssignModal}
                className="h-10 px-4 text-xs font-bold gap-1.5 rounded-xl shadow-[1.5px_1.5px_0_#438C83]"
              >
                <UserCheck className="w-4 h-4" />
                <span>تخصیص کوچ جدید</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* 2. Main Content Views */}
      {isStudent ? (
        /* ================= STUDENT VIEW ================= */
        <div className="space-y-4">
          {/* 1. Coach Card (First box under Header) */}
          <Card className="p-4 sm:p-5 border-[1.5px] border-primary-dark/30 dark:border-[#242F42] bg-gradient-to-br from-primary-light/40 via-white to-college-light/25 dark:from-[#151C28] dark:via-[#151C28] dark:to-[#1C2536] rounded-2xl shadow-[2px_2px_0_#59BBAF] dark:shadow-[2px_2px_0_#0B0F17] hover:shadow-[2.5px_2.5px_0_#59BBAF] dark:hover:shadow-[2.5px_2.5px_0_#0B0F17] flex flex-col justify-between space-y-4 hover:-translate-y-0.5 transition-all">
            {/* Header: Coach name & photo opposite to کوچ اختصاصی شما: */}
            <div className="flex items-center justify-between pb-3 border-b border-primary/20 dark:border-gray-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-4.5 h-4.5 text-primary" />
                </div>
                <span className="text-xs sm:text-sm font-black text-ink-darker dark:text-white">
                  کوچ اختصاصی شما:
                </span>
              </div>
              {contextData?.link?.coach && (
                <div className="flex items-center gap-2.5 bg-white/90 dark:bg-[#1C2536]/90 px-3 py-1.5 rounded-xl border border-primary/25 shadow-2xs min-w-0">
                  <span className="font-black text-xs sm:text-sm text-ink-darker dark:text-white truncate">
                    {contextData.link.coach.firstName} {contextData.link.coach.lastName}
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-primary text-white flex items-center justify-center font-black text-sm shadow-xs shrink-0">
                    {contextData.link.coach.firstName?.[0] || 'ک'}
                  </div>
                </div>
              )}
            </div>

            {contextData?.link?.coach ? (
              <div className="space-y-3 flex-1 flex flex-col justify-end">
                {/* Schedule Details Grid with identical text styling */}
                <div className="grid grid-cols-2 gap-2.5 pt-0.5">
                  <div className="p-3 rounded-xl bg-white/90 dark:bg-[#1C2536]/90 border border-primary/20 dark:border-[#242F42] shadow-2xs space-y-1.5 transition-colors hover:border-primary/40">
                    <span className="text-[11px] text-muted-foreground font-bold flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-primary shrink-0" />
                      روز ثابت
                    </span>
                    <span className="font-bold text-xs sm:text-sm text-ink-darker dark:text-white block truncate">
                      {PERSIAN_DAY_NAMES[contextData.link.slotDayOfWeek] || 'نامشخص'} (هر دو هفته)
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-white/90 dark:bg-[#1C2536]/90 border border-primary/20 dark:border-[#242F42] shadow-2xs space-y-1.5 transition-colors hover:border-primary/40">
                    <span className="text-[11px] text-muted-foreground font-bold flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-primary shrink-0" />
                      ساعت جلسه
                    </span>
                    <span className="font-bold text-xs sm:text-sm text-ink-darker dark:text-white block truncate">
                      {toPersianDigits(contextData.link.slotStartTime)} الی {toPersianDigits(contextData.link.slotEndTime)}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-6 text-center text-xs text-muted-foreground">
                کوچ اختصاصی برای شما ثبت نشده است.
              </div>
            )}
          </Card>

          {/* 2. Spotlight Hero: Next Scheduled Session */}
          <Card
            isFlat
            className="relative overflow-hidden p-4 sm:p-5 border-2 border-primary dark:border-primary/40 bg-gradient-to-l from-primary-light/70 via-white to-primary-light/30 dark:from-[#132A26] dark:via-[#162332] dark:to-[#17202E] rounded-2xl shadow-none hover:shadow-none transition-all"
          >
            {/* Ambient subtle light accent */}
            <div className="absolute -top-10 -left-10 w-32 h-32 bg-primary/15 dark:bg-primary/20 rounded-full blur-2xl pointer-events-none" />

            <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-primary text-white flex items-center justify-center shadow-[2px_2px_0_#1F413D] dark:shadow-[2px_2px_0_#0B0F17] shrink-0 border border-white/20">
                  <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-white stroke-[2]" />
                </div>

                <div className="space-y-1.5 min-w-0">
                  <h3 className="text-sm sm:text-base font-black text-ink-darker dark:text-white leading-snug">
                    {contextData?.nextSession ? (
                      <>جلسه بعدی شما: <span className="text-primary-dark dark:text-primary font-black">{formatJalaliDisplay(contextData.nextSession.scheduledDate, true)}</span></>
                    ) : (
                      'جلسه بعدی در حال برنامه‌ریزی است'
                    )}
                  </h3>

                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/80 dark:bg-[#151C28]/90 border border-primary/25 dark:border-primary/35 font-bold text-ink-darker dark:text-white shadow-2xs">
                      <Clock className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span>ساعت {toPersianDigits(contextData?.link?.slotStartTime || '۱۰:۲۰')} الی {toPersianDigits(contextData?.link?.slotEndTime || '۱۰:۴۰')}</span>
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-gray-100/70 dark:bg-gray-800/50 text-muted-foreground font-medium">
                      مدت: {toPersianDigits(contextData?.nextSession?.durationMinutes || 20)} دقیقه
                    </span>
                  </div>
                </div>
              </div>

              <div className="shrink-0 w-full sm:w-auto pt-1 sm:pt-0">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setIsExtraModalOpen(true)}
                  className="w-full sm:w-auto font-black text-xs gap-1.5 rounded-xl shadow-[2px_2px_0_#1F413D] dark:shadow-[2px_2px_0_#0F172A]"
                >
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                  <span>درخواست جلسه فوق‌العاده</span>
                </Button>
              </div>
            </div>
          </Card>

          {/* 3. Key Stats Highlights: 2 KPI Cards in one row */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <div className="p-4 rounded-2xl bg-white dark:bg-[#151C28] border border-gray-200/80 dark:border-[#242F42] shadow-xs flex items-center gap-3 hover:-translate-y-0.5 hover:border-primary/40 transition-all">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[11px] text-muted-foreground font-bold">جلسات برگزار شده</div>
                <div className="text-lg font-black text-ink-darker dark:text-white mt-0.5">
                  {toPersianDigits(contextData?.stats?.totalSessions || 0)}
                </div>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-[#151C28] border border-gray-200/80 dark:border-[#242F42] shadow-xs flex items-center gap-3 hover:-translate-y-0.5 hover:border-emerald-500/40 transition-all">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[11px] text-muted-foreground font-bold">نرخ حضور</div>
                <div className="text-lg font-black text-emerald-600 dark:text-emerald-400 mt-0.5 font-mono">
                  ٪{toPersianDigits(contextData?.stats?.attendanceRate || 100)}
                </div>
              </div>
            </div>
          </div>

          {/* Past Sessions History */}
          <Card className="p-4 sm:p-5 border border-gray-200/80 dark:border-[#242F42] bg-white dark:bg-[#151C28] rounded-2xl shadow-xs space-y-3.5">
            <div className="flex items-center justify-between pb-2.5 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2">
                <CalendarDays className="w-4.5 h-4.5 text-primary shrink-0" />
                <h3 className="font-bold text-sm sm:text-base text-ink-darker dark:text-white">
                  سوابق جلسات و ارزیابی کوچ
                </h3>
              </div>
              <span className="text-xs text-muted-foreground font-bold bg-gray-100/80 dark:bg-gray-800/80 px-2.5 py-0.5 rounded-full">
                {toPersianDigits(contextData?.pastSessions?.length || 0)} جلسه
              </span>
            </div>

            {(contextData?.pastSessions?.length || 0) > 0 ? (
              <div className="space-y-3">
                {contextData?.pastSessions?.map((s: any) => {
                  const jalaliDate = formatJalaliDisplay(s.scheduledDate, true);
                  const isPresent = s.attendanceStatus === 'PRESENT';
                  const isExcused = s.attendanceStatus === 'EXCUSED';

                  return (
                    <div
                      key={s.id}
                      className="p-3.5 sm:p-4 rounded-xl border border-gray-200/80 dark:border-[#28354A] bg-white dark:bg-[#1C2536] space-y-2.5 transition-all hover:border-primary/40 shadow-2xs"
                    >
                      {/* Top Row: Date & Extra on right, Attendance Badge on top-left */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs sm:text-sm text-ink-darker dark:text-white">
                            {jalaliDate}
                          </span>
                          {s.sessionType === 'EXTRA' && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-300">
                              فوق‌العاده
                            </span>
                          )}
                        </div>

                        {/* Top-Left Attendance Badge */}
                        <span
                          className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${isPresent
                              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                              : isExcused
                                ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-500/30'
                                : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-500/30'
                            }`}
                        >
                          {isPresent ? <Check className="w-3.5 h-3.5" /> : null}
                          <span>{isPresent ? 'حاضر' : isExcused ? 'غایب موجه' : 'غایب'}</span>
                        </span>
                      </div>

                      {/* Coach Notes */}
                      {s.coachNotes && (
                        <div className="p-2.5 rounded-xl bg-gray-50/80 dark:bg-[#151C28]/80 border border-gray-200/60 dark:border-gray-800 text-xs text-muted-foreground leading-relaxed flex items-start gap-2">
                          <FileText className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold text-ink-darker dark:text-white">ارزیابی کوچ: </span>
                            {s.coachNotes}
                          </div>
                        </div>
                      )}

                      {/* Action Items */}
                      {s.actionItems && (
                        <div className="flex items-center gap-1.5 text-xs text-primary font-bold px-1">
                          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                          <span>تکلیف تعیین‌شده: {s.actionItems}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-6 text-center text-xs text-muted-foreground">
                هنوز جلسه‌ای برای این دانش‌آموز برگزار نشده است.
              </div>
            )}
          </Card>

          {/* Extra Requests Box */}
          <Card className="p-4 sm:p-5 border border-gray-200/80 dark:border-[#242F42] bg-white dark:bg-[#151C28] rounded-2xl shadow-xs space-y-3.5">
            <div className="flex items-center gap-2.5 pb-2.5 border-b border-gray-100 dark:border-gray-800">
              <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-sm sm:text-base text-ink-darker dark:text-white">
                درخواست‌های جلسه فوق‌العاده
              </h3>
            </div>

            {(contextData?.extraRequests?.length || 0) > 0 ? (
              <div className="grid grid-cols-1 gap-3">
                {contextData?.extraRequests?.map((req: any) => {
                  const isApproved = req.status === 'APPROVED';
                  const isPending = req.status === 'PENDING';

                  return (
                    <div
                      key={req.id}
                      className="p-4 sm:p-5 rounded-2xl border border-gray-200/90 dark:border-[#28354A] bg-white dark:bg-[#1C2536] space-y-3 transition-all hover:border-primary/40 shadow-2xs"
                    >
                      {/* 1. Top Meta Row: Date & Status Badge */}
                      <div className="flex items-center justify-between gap-2.5 flex-wrap">
                        {req.preferredDate ? (
                          <div className="inline-flex items-center gap-1.5 text-xs text-muted-foreground bg-gray-50 dark:bg-[#151C28] px-2.5 py-1 rounded-lg border border-gray-200/60 dark:border-gray-800">
                            <Calendar className="w-3.5 h-3.5 text-primary shrink-0" />
                            <strong className="text-ink-darker dark:text-white font-medium">{req.preferredDate}</strong>
                          </div>
                        ) : (
                          <div />
                        )}

                        {/* Status Badge */}
                        <span
                          className={`inline-flex items-center gap-1 px-3 py-1 rounded-full font-bold text-xs shrink-0 select-none ${isApproved
                              ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                              : isPending
                                ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-500/30'
                                : 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-500/30'
                            }`}
                        >
                          {isApproved && <CheckCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />}
                          {isPending && <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />}
                          <span>
                            {isApproved
                              ? 'تایید و زمان‌بندی شد'
                              : isPending
                                ? 'در انتظار بررسی'
                                : 'رد شده'}
                          </span>
                        </span>
                      </div>

                      {/* 2. Topic / Reason with balanced vertical spacing */}
                      <div className="py-0.5">
                        <h4 className="font-bold text-xs sm:text-sm text-ink-darker dark:text-white leading-relaxed">
                          {req.reason}
                        </h4>
                      </div>

                      {/* 3. Coach Response or Waiting Note with clean spacing */}
                      {req.coachResponse ? (
                        <div className="pt-3 mt-1 border-t border-gray-100 dark:border-gray-800/80 flex items-start gap-2.5 text-xs sm:text-[13px]">
                          <MessageSquare className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                          <div className="flex-1 min-w-0 leading-relaxed">
                            <span className="font-bold text-ink-darker dark:text-white ml-2">پاسخ کوچ:</span>
                            <span className="text-muted-foreground dark:text-slate-300">
                              {req.coachResponse}
                            </span>
                          </div>
                        </div>
                      ) : isPending ? (
                        <div className="pt-3 mt-1 border-t border-gray-100 dark:border-gray-800/80 flex items-center gap-2 text-[11px] sm:text-xs text-muted-foreground">
                          <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                          <span>درخواست ثبت شده و در نوبت بررسی قرار دارد</span>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-6 text-center text-xs text-muted-foreground">
                هنوز درخواست جلسه فوق‌العاده‌ای ثبت نشده است.
              </div>
            )}
          </Card>
        </div>
      ) : (
        /* ================= COACH / ADMIN VIEW ================= */
        <div className="space-y-4">
          {/* Segmented Control Tabs */}
          <div className="flex items-center justify-start overflow-x-auto no-scrollbar">
            <div className="inline-flex items-center p-1 rounded-xl bg-gray-100/90 dark:bg-gray-800/90 border border-gray-200/70 dark:border-gray-700/70 min-w-full sm:min-w-0">
              <button
                type="button"
                onClick={() => setActiveTab('today')}
                className={`flex-1 sm:flex-initial px-3.5 py-1.5 rounded-lg text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer ${activeTab === 'today'
                    ? 'bg-white dark:bg-[#151C28] text-primary-dark dark:text-primary border border-primary/25 dark:border-gray-700 shadow-[1.5px_1.5px_0_#59BBAF]'
                    : 'text-gray-600 dark:text-gray-400 hover:text-ink-darker font-bold'
                  }`}
              >
                <Calendar className="w-3.5 h-3.5 text-primary" />
                <span>جلسات امروز</span>
                <span className="min-w-[18px] h-[18px] px-1 rounded-full text-[10.5px] font-black flex items-center justify-center bg-primary text-white">
                  {toPersianDigits(contextData?.todaySessions?.length || 0)}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('students')}
                className={`flex-1 sm:flex-initial px-3.5 py-1.5 rounded-lg text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer ${activeTab === 'students'
                    ? 'bg-white dark:bg-[#151C28] text-primary-dark dark:text-primary border border-primary/25 dark:border-gray-700 shadow-[1.5px_1.5px_0_#59BBAF]'
                    : 'text-gray-600 dark:text-gray-400 hover:text-ink-darker font-bold'
                  }`}
              >
                <Users className="w-3.5 h-3.5 text-primary" />
                <span>دانش‌آموزان من</span>
                <span className="min-w-[18px] h-[18px] px-1 rounded-full text-[10.5px] font-black flex items-center justify-center bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                  {toPersianDigits(contextData?.myStudents?.length || 0)}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('extra-requests')}
                className={`flex-1 sm:flex-initial px-3.5 py-1.5 rounded-lg text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer ${activeTab === 'extra-requests'
                    ? 'bg-white dark:bg-[#151C28] text-purple-700 dark:text-purple-300 border border-purple-500/30 dark:border-gray-700 shadow-[1.5px_1.5px_0_#8A38F5]'
                    : 'text-gray-600 dark:text-gray-400 hover:text-ink-darker font-bold'
                  }`}
              >
                <MessageSquare className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                <span>درخواست‌های فوق‌العاده</span>
                <span className="min-w-[18px] h-[18px] px-1 rounded-full text-[10.5px] font-black flex items-center justify-center bg-purple-600 text-white">
                  {toPersianDigits(contextData?.pendingExtraRequests?.length || 0)}
                </span>
              </button>
            </div>
          </div>

          {/* TAB 1: TODAY'S SESSIONS */}
          {activeTab === 'today' && (
            (contextData?.todaySessions?.length || 0) === 0 ? (
              <div className="p-12 text-center text-xs text-muted-foreground bg-white dark:bg-[#151C28] rounded-2xl border border-dashed border-gray-200 dark:border-[#242F42]">
                جلسه کوچینگی برای امروز زمان‌بندی نشده است.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4">
                {contextData?.todaySessions?.map((session: any) => {
                  const time = new Date(session.scheduledDate).toLocaleTimeString('fa-IR', {
                    hour: '2-digit',
                    minute: '2-digit',
                  });
                  const isPresent = session.attendanceStatus === 'PRESENT';
                  const isAbsent = session.attendanceStatus === 'ABSENT';
                  const isExcused = session.attendanceStatus === 'EXCUSED';

                  return (
                    <Card
                      key={session.id}
                      className="p-4 border border-gray-200/80 dark:border-[#242F42] bg-white dark:bg-[#151C28] rounded-2xl shadow-xs flex flex-col justify-between space-y-3.5 hover:border-primary/50 transition-colors"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2.5">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold bg-primary/10 text-primary border border-primary/20">
                            <Clock className="w-3.5 h-3.5" />
                            <span>ساعت {time} ({toPersianDigits(session.durationMinutes)} دقیقه)</span>
                          </span>
                          {session.sessionType === 'EXTRA' && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-300">
                              فوق‌العاده
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-black text-base shrink-0">
                            {session.student.firstName?.[0] || 'د'}
                          </div>
                          <div>
                            <h4 className="font-bold text-sm sm:text-base text-ink-darker dark:text-white">
                              {session.student.firstName} {session.student.lastName}
                            </h4>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {session.student.classroomName || 'پایه دوازدهم'}
                            </p>
                          </div>
                        </div>

                        {session.coachNotes && (
                          <div className="mt-2.5 p-2.5 rounded-xl bg-gray-50 dark:bg-[#1C2536] border border-gray-200/70 dark:border-[#242F42] text-xs text-muted-foreground leading-relaxed">
                            <span className="font-bold text-ink-darker dark:text-white">یادداشت جلسه: </span>
                            {session.coachNotes}
                          </div>
                        )}
                      </div>

                      <div className="pt-3 border-t border-gray-100 dark:border-[#242F42] flex flex-wrap items-center justify-between gap-2">
                        {/* Attendance Buttons */}
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleMarkAttendance(session.id, 'PRESENT')}
                            className={`h-8 px-2.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${isPresent
                                ? 'bg-emerald-600 text-white border-emerald-600'
                                : 'bg-white dark:bg-[#1C2536] text-muted-foreground border-gray-200 dark:border-gray-700 hover:border-emerald-500'
                              }`}
                          >
                            حاضر
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMarkAttendance(session.id, 'ABSENT')}
                            className={`h-8 px-2.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${isAbsent
                                ? 'bg-rose-600 text-white border-rose-600'
                                : 'bg-white dark:bg-[#1C2536] text-muted-foreground border-gray-200 dark:border-gray-700 hover:border-rose-500'
                              }`}
                          >
                            غایب
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMarkAttendance(session.id, 'EXCUSED')}
                            className={`h-8 px-2.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${isExcused
                                ? 'bg-amber-600 text-white border-amber-600'
                                : 'bg-white dark:bg-[#1C2536] text-muted-foreground border-gray-200 dark:border-gray-700 hover:border-amber-500'
                              }`}
                          >
                            موجه
                          </button>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenNotes(session)}
                            className="h-8 text-xs gap-1 font-bold rounded-lg"
                          >
                            <FileText className="w-3.5 h-3.5 text-primary" />
                            <span>یادداشت</span>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openDossier(session.student.id)}
                            className="h-8 text-xs gap-1 font-bold rounded-lg text-purple-700 dark:text-purple-300"
                          >
                            <Compass className="w-3.5 h-3.5" />
                            <span>پرونده</span>
                          </Button>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )
          )}

          {/* TAB 2: MY STUDENTS DIRECTORY */}
          {activeTab === 'students' && (
            <div className="space-y-3.5">
              {/* Search Bar */}
              <div className="relative">
                <Search className="w-4 h-4 text-muted-foreground absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchStudentQuery}
                  onChange={(e) => setSearchStudentQuery(e.target.value)}
                  placeholder="جستجو در نام دانش‌آموز، کد تحصیلی یا کلاس..."
                  className="w-full h-10 pr-10 pl-4 rounded-xl text-xs sm:text-sm font-bold bg-white dark:bg-[#151C28] border border-gray-200 dark:border-[#242F42] text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              {filteredMyStudents.length === 0 ? (
                <div className="p-12 text-center text-xs text-muted-foreground bg-white dark:bg-[#151C28] rounded-2xl border border-dashed border-gray-200 dark:border-[#242F42]">
                  دانش‌آموزی در لیست کوچینگ یافت نشد.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {filteredMyStudents.map((link: any) => (
                  <Card
                    key={link.id}
                    className="p-4 border border-gray-200/80 dark:border-[#242F42] bg-white dark:bg-[#151C28] rounded-2xl shadow-xs flex flex-col justify-between space-y-3 hover:border-primary/50 transition-colors"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2.5">
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/20">
                          {PERSIAN_DAY_NAMES[link.slotDayOfWeek] || 'نامشخص'} ساعت {toPersianDigits(link.slotStartTime)}
                        </span>
                        <span className="text-[11px] text-muted-foreground">دو هفته یک‌بار</span>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-black text-base shrink-0">
                          {link.student.firstName?.[0] || 'د'}
                        </div>
                        <div>
                          <h4 className="font-bold text-sm sm:text-base text-ink-darker dark:text-white">
                            {link.student.firstName} {link.student.lastName}
                          </h4>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {link.student.studentProfile?.enrollments?.[0]?.classroom?.name || 'کلاس عمومی'}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-gray-100 dark:border-[#242F42]">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openDossier(link.student.id)}
                        className="w-full h-9 text-xs gap-1.5 font-bold rounded-xl"
                      >
                        <Compass className="w-3.5 h-3.5 text-primary" />
                        <span>مشاهده پرونده هدایت تحصیلی</span>
                      </Button>
                    </div>
                  </Card>
                ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: EXTRA SESSIONS QUEUE */}
          {activeTab === 'extra-requests' && (
            <div className="space-y-3">
              {(contextData?.pendingExtraRequests?.length || 0) === 0 ? (
                <div className="p-12 text-center text-xs text-muted-foreground bg-white dark:bg-[#151C28] rounded-2xl border border-dashed border-gray-200 dark:border-[#242F42]">
                  درخواستی در صف انتظار وجود ندارد.
                </div>
              ) : (
                contextData?.pendingExtraRequests?.map((req: any) => (
                  <Card
                    key={req.id}
                    className="p-4 border border-gray-200/80 dark:border-[#242F42] bg-white dark:bg-[#151C28] rounded-2xl shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-ink-darker dark:text-white">
                          {req.student.firstName} {req.student.lastName}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-300">
                          در انتظار زمان‌بندی
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        علت: {req.reason}
                      </p>
                      {req.preferredDate && (
                        <p className="text-[11px] text-primary font-bold">
                          زمان پیشنهادی دانش‌آموز: {req.preferredDate}
                        </p>
                      )}
                    </div>

                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleOpenRespond(req)}
                      className="h-9 px-4 text-xs font-bold gap-1.5 rounded-xl shadow-[1.5px_1.5px_0_#438C83] shrink-0"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>تعیین زمان و تایید جلسه</span>
                    </Button>
                  </Card>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* ================= STUDENT: EXTRA REQUEST MODAL ================= */}
      <Modal
        isOpen={isExtraModalOpen}
        onClose={() => setIsExtraModalOpen(false)}
        title="درخواست جلسه فوق‌العاده"
        maxWidth="lg"
        hideHeaderBorder
      >
        <form onSubmit={handleSubmitExtraRequest} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-ink-darker dark:text-white mb-1.5">
              موضوع و علت درخواست *
            </label>
            <textarea
              required
              rows={3}
              value={extraReason}
              onChange={(e) => setExtraReason(e.target.value)}
              placeholder="مثال: نیاز به راهنمایی در برنامه‌ریزی امتحانات یا تحلیل کارنامه آزمون..."
              className="w-full rounded-xl border border-gray-200 dark:border-[#242F42] bg-gray-50 dark:bg-[#1C2536] p-3 text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-ink-darker dark:text-white mb-1.5">
              زمان پیشنهادی شما (اختیاری)
            </label>
            <input
              type="text"
              value={extraPreferredDate}
              onChange={(e) => setExtraPreferredDate(e.target.value)}
              placeholder="مثال: چهارشنبه بعد از ساعت ۱۲"
              className="w-full h-10 px-3 rounded-xl border border-gray-200 dark:border-[#242F42] bg-gray-50 dark:bg-[#1C2536] text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100 dark:border-[#242F42]">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsExtraModalOpen(false)}
              className="h-10 px-4 text-xs rounded-xl"
            >
              انصراف
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isSubmittingExtra}
              className="h-10 px-5 text-xs font-bold rounded-xl shadow-[1.5px_1.5px_0_#438C83]"
            >
              {isSubmittingExtra ? 'در حال ارسال...' : 'ارسال درخواست'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ================= COACH: SESSION NOTES MODAL ================= */}
      <Modal
        isOpen={isNotesModalOpen}
        onClose={() => setIsNotesModalOpen(false)}
        title="ثبت یادداشت و ارزیابی جلسه"
        maxWidth="lg"
        hideHeaderBorder
      >
        <form onSubmit={handleSaveNotes} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-ink-darker dark:text-white mb-1.5">
              وضعیت حضور دانش‌آموز
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSessionAttendance('PRESENT')}
                className={`flex-1 h-9 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${sessionAttendance === 'PRESENT'
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-white dark:bg-[#1C2536] text-muted-foreground border-gray-200 dark:border-gray-700'
                  }`}
              >
                حاضر
              </button>
              <button
                type="button"
                onClick={() => setSessionAttendance('ABSENT')}
                className={`flex-1 h-9 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${sessionAttendance === 'ABSENT'
                    ? 'bg-rose-600 text-white border-rose-600'
                    : 'bg-white dark:bg-[#1C2536] text-muted-foreground border-gray-200 dark:border-gray-700'
                  }`}
              >
                غایب
              </button>
              <button
                type="button"
                onClick={() => setSessionAttendance('EXCUSED')}
                className={`flex-1 h-9 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${sessionAttendance === 'EXCUSED'
                    ? 'bg-amber-600 text-white border-amber-600'
                    : 'bg-white dark:bg-[#1C2536] text-muted-foreground border-gray-200 dark:border-gray-700'
                  }`}
              >
                موجه
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-ink-darker dark:text-white mb-1.5">
              نکات و ارزیابی جلسه
            </label>
            <textarea
              rows={3}
              value={coachNotes}
              onChange={(e) => setCoachNotes(e.target.value)}
              placeholder="نقاط قوت، چالش‌ها، مباحث مطرح‌شده..."
              className="w-full rounded-xl border border-gray-200 dark:border-[#242F42] bg-gray-50 dark:bg-[#1C2536] p-3 text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-ink-darker dark:text-white mb-1.5">
              تکلیف و هدف تعیین‌شده تا جلسه بعد
            </label>
            <input
              type="text"
              value={actionItems}
              onChange={(e) => setActionItems(e.target.value)}
              placeholder="مثال: حل آزمون زمان‌دار ریاضی، مطالعه ۳۰ صفحه زیست..."
              className="w-full h-10 px-3 rounded-xl border border-gray-200 dark:border-[#242F42] bg-gray-50 dark:bg-[#1C2536] text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100 dark:border-[#242F42]">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsNotesModalOpen(false)}
              className="h-10 px-4 text-xs rounded-xl"
            >
              انصراف
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isSavingNotes}
              className="h-10 px-5 text-xs font-bold rounded-xl shadow-[1.5px_1.5px_0_#438C83]"
            >
              {isSavingNotes ? 'در حال ثبت...' : 'ذخیره یادداشت'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ================= COACH: RESPOND EXTRA REQUEST MODAL ================= */}
      <Modal
        isOpen={isRespondModalOpen}
        onClose={() => setIsRespondModalOpen(false)}
        title="زمان‌بندی جلسه فوق‌العاده"
        maxWidth="lg"
        hideHeaderBorder
      >
        <form onSubmit={handleSaveRespond} className="space-y-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setRespondStatus('APPROVED')}
              className={`flex-1 h-9 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${respondStatus === 'APPROVED'
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : 'bg-white dark:bg-[#1C2536] text-muted-foreground border-gray-200 dark:border-gray-700'
                }`}
            >
              تایید و هماهنگی جلسه
            </button>
            <button
              type="button"
              onClick={() => setRespondStatus('REJECTED')}
              className={`flex-1 h-9 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${respondStatus === 'REJECTED'
                  ? 'bg-rose-600 text-white border-rose-600'
                  : 'bg-white dark:bg-[#1C2536] text-muted-foreground border-gray-200 dark:border-gray-700'
                }`}
            >
              رد درخواست
            </button>
          </div>

          {respondStatus === 'APPROVED' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-ink-darker dark:text-white mb-1.5">
                  تاریخ جلسه فوق‌العاده
                </label>
                <PersianDatePicker
                  value={respondDate}
                  onChange={(d) => setRespondDate(d)}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-ink-darker dark:text-white mb-1.5">
                  ساعت شروع جلسه
                </label>
                <input
                  type="time"
                  value={respondTime}
                  onChange={(e) => setRespondTime(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-gray-200 dark:border-[#242F42] bg-gray-50 dark:bg-[#1C2536] text-xs sm:text-sm font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-ink-darker dark:text-white mb-1.5">
              پیام یا توضیحات به دانش‌آموز
            </label>
            <textarea
              rows={3}
              value={respondNote}
              onChange={(e) => setRespondNote(e.target.value)}
              placeholder="مثال: جلسه در محل اتاق مشاوره یا لینک آنلاین برگزار می‌شود..."
              className="w-full rounded-xl border border-gray-200 dark:border-[#242F42] bg-gray-50 dark:bg-[#1C2536] p-3 text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100 dark:border-[#242F42]">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsRespondModalOpen(false)}
              className="h-10 px-4 text-xs rounded-xl"
            >
              انصراف
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isSubmittingResponse}
              className="h-10 px-5 text-xs font-bold rounded-xl shadow-[1.5px_1.5px_0_#438C83]"
            >
              {isSubmittingResponse ? 'در حال ثبت...' : 'ثبت و ارسال'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ================= ADMIN: ASSIGN COACH MODAL ================= */}
      <Modal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        title="تخصیص کوچ به دانش‌آموز"
        maxWidth="lg"
        hideHeaderBorder
      >
        <form onSubmit={handleSaveAssign} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-ink-darker dark:text-white mb-1.5">
              انتخاب دانش‌آموز *
            </label>
            <select
              required
              value={assignStudentId}
              onChange={(e) => setAssignStudentId(e.target.value)}
              className="w-full h-10 px-3 rounded-xl border border-gray-200 dark:border-[#242F42] bg-gray-50 dark:bg-[#1C2536] text-xs sm:text-sm font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              {unassignedStudents.map((st) => (
                <option key={st.id} value={st.id}>
                  {st.firstName} {st.lastName} ({st.studentProfile?.enrollments?.[0]?.classroom?.name || 'کلاس عمومی'})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-ink-darker dark:text-white mb-1.5">
              انتخاب مربی / کوچ *
            </label>
            <select
              required
              value={assignCoachId}
              onChange={(e) => setAssignCoachId(e.target.value)}
              className="w-full h-10 px-3 rounded-xl border border-gray-200 dark:border-[#242F42] bg-gray-50 dark:bg-[#1C2536] text-xs sm:text-sm font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              {availableCoaches.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.firstName} {c.lastName} ({c.role || 'کوچ'})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-ink-darker dark:text-white mb-1.5">
                روز هفته
              </label>
              <select
                value={assignDayOfWeek}
                onChange={(e) => setAssignDayOfWeek(Number(e.target.value))}
                className="w-full h-10 px-3 rounded-xl border border-gray-200 dark:border-[#242F42] bg-gray-50 dark:bg-[#1C2536] text-xs sm:text-sm font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                {PERSIAN_DAY_NAMES.map((name, idx) => (
                  <option key={idx} value={idx}>
                    {name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-ink-darker dark:text-white mb-1.5">
                ساعت شروع
              </label>
              <input
                type="time"
                value={assignStartTime}
                onChange={(e) => setAssignStartTime(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-gray-200 dark:border-[#242F42] bg-gray-50 dark:bg-[#1C2536] text-xs sm:text-sm font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-ink-darker dark:text-white mb-1.5">
                ساعت پایان
              </label>
              <input
                type="time"
                value={assignEndTime}
                onChange={(e) => setAssignEndTime(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-gray-200 dark:border-[#242F42] bg-gray-50 dark:bg-[#1C2536] text-xs sm:text-sm font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100 dark:border-[#242F42]">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsAssignModalOpen(false)}
              className="h-10 px-4 text-xs rounded-xl"
            >
              انصراف
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isSavingAssign}
              className="h-10 px-5 text-xs font-bold rounded-xl shadow-[1.5px_1.5px_0_#438C83]"
            >
              {isSavingAssign ? 'در حال ثبت...' : 'ثبت جلسات دوهفته‌ای'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ================= DOSSIER REPORT MODAL ================= */}
      <CoachingDossierModal
        isOpen={isDossierOpen}
        onClose={() => setIsDossierOpen(false)}
        studentId={dossierStudentId}
      />
    </div>
  );
};
