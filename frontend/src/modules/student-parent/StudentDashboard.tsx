import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../lib/auth/auth-store';
import { apiClient } from '../../lib/api/client';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import {
  GraduationCap,
  CalendarDays,
  FileCheck,
  HelpCircle,
  Clock,
  ArrowUpRight,
  User,
  MessageSquare,
  CheckCircle2,
  Circle,
  Plus,
  Trash2,
  Calendar,
  Send,
  Play,
  FileText,
  Scale,
  Sparkles,
  BookOpen,
  ChevronLeft,
} from 'lucide-react';
import { toPersianDigits, formatToJalali, cleanUserFullName } from '../../lib/utils';

const getPersianDayKey = (): string => {
  const dayIndex = new Date().getDay(); // 0 is Sunday, 6 is Saturday
  switch (dayIndex) {
    case 6: return 'SATURDAY';
    case 0: return 'SUNDAY';
    case 1: return 'MONDAY';
    case 2: return 'TUESDAY';
    case 3: return 'WEDNESDAY';
    case 4: return 'THURSDAY';
    default: return 'SATURDAY';
  }
};

const DAY_NAMES: Record<string, string> = {
  SATURDAY: 'شنبه',
  SUNDAY: 'یکشنبه',
  MONDAY: 'دوشنبه',
  TUESDAY: 'سه‌شنبه',
  WEDNESDAY: 'چهارشنبه',
  THURSDAY: 'پنج‌شنبه',
};

interface TodoItem {
  id: string;
  text: string;
  completed: boolean;
  dateKey: string;
}

export const StudentDashboard: React.FC = () => {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);

  // Core Data
  const [scheduleData, setScheduleData] = useState<{ classroom: any; schedules: any[] } | null>(null);
  const [realHomework, setRealHomework] = useState<any[]>([]);
  const [realExams, setRealExams] = useState<any[]>([]);
  const [recentMessages, setRecentMessages] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Live Time & Persian Date
  const [currentDate] = useState(() => new Date());
  const [liveDate] = useState(() =>
    formatToJalali(new Date(), { showMonthName: true, includeDayName: true })
  );
  const todayDateString = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
  }, []);

  // Daily Personal Checklist (Local Storage persistent per date)
  const [dailyTodos, setDailyTodos] = useState<TodoItem[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const saved = localStorage.getItem(`rokad_student_todos_${todayDateString}`);
      if (saved) return JSON.parse(saved);
      return [
        { id: '1', text: 'مرور درس‌های کلاس‌های امروز', completed: false, dateKey: todayDateString },
        { id: '2', text: 'بررسی تکالیف و مهلت‌های تحویل', completed: false, dateKey: todayDateString },
      ];
    } catch {
      return [];
    }
  });
  const [newTodoInput, setNewTodoInput] = useState('');

  // Persist Todos
  useEffect(() => {
    try {
      localStorage.setItem(`rokad_student_todos_${todayDateString}`, JSON.stringify(dailyTodos));
    } catch (e) {
      console.error(e);
    }
  }, [dailyTodos, todayDateString]);

  const toggleTodo = (id: string) => {
    setDailyTodos((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
    );
  };

  const addTodo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTodoInput.trim()) return;
    const item: TodoItem = {
      id: Date.now().toString(),
      text: newTodoInput.trim(),
      completed: false,
      dateKey: todayDateString,
    };
    setDailyTodos((prev) => [...prev, item]);
    setNewTodoInput('');
  };

  const deleteTodo = (id: string) => {
    setDailyTodos((prev) => prev.filter((t) => t.id !== id));
  };

  // Fetch student daily data
  useEffect(() => {
    let isMounted = true;
    const fetchDailyData = async () => {
      try {
        setIsLoading(true);
        const [schedRes, hwRes, examsRes, messagesRes] = await Promise.allSettled([
          apiClient.get('/classes/my-schedule'),
          apiClient.get('/homework'),
          apiClient.get('/exams'),
          apiClient.get('/messages/inbox'),
        ]);

        if (!isMounted) return;

        if (schedRes.status === 'fulfilled') {
          setScheduleData(schedRes.value.data);
        }
        if (hwRes.status === 'fulfilled') {
          const hw = Array.isArray(hwRes.value.data) ? hwRes.value.data : (hwRes.value as any)?.data || [];
          setRealHomework(hw);
        }
        if (examsRes.status === 'fulfilled') {
          const ex = Array.isArray(examsRes.value.data) ? examsRes.value.data : (examsRes.value as any)?.data || [];
          setRealExams(ex);
        }
        if (messagesRes.status === 'fulfilled') {
          const msgs = Array.isArray(messagesRes.value.data) ? messagesRes.value.data : [];
          setRecentMessages(msgs.slice(0, 3));
        }
      } catch (err) {
        console.error('Failed to load daily dashboard data:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchDailyData();
    return () => {
      isMounted = false;
    };
  }, []);

  // Today's schedule calculation
  const todayKey = getPersianDayKey();
  const todaySchedules = useMemo(() => {
    return (scheduleData?.schedules || [])
      .filter((s: any) => s.dayOfWeek === todayKey)
      .sort((a: any, b: any) => a.periodNumber - b.periodNumber);
  }, [scheduleData, todayKey]);

  // Current active / next period calculation
  const { activePeriod, nextPeriod, completedPeriodsCount } = useMemo(() => {
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    let active: any = null;
    let next: any = null;
    let completedCount = 0;

    for (const slot of todaySchedules) {
      if (!slot.startTime || !slot.endTime) continue;
      const [sH, sM] = slot.startTime.split(':').map(Number);
      const [eH, eM] = slot.endTime.split(':').map(Number);
      const start = sH * 60 + sM;
      const end = eH * 60 + eM;

      if (currentMinutes > end) {
        completedCount++;
      } else if (currentMinutes >= start && currentMinutes <= end) {
        active = slot;
      } else if (start > currentMinutes && !next) {
        next = slot;
      }
    }

    return { activePeriod: active, nextPeriod: next, completedPeriodsCount: completedCount };
  }, [todaySchedules]);

  // Pending / Priority homework
  const pendingHomework = useMemo(() => {
    return realHomework.filter((hw: any) => {
      const mySub = hw.submissions && hw.submissions.length > 0 ? hw.submissions[0] : null;
      return !mySub;
    });
  }, [realHomework]);

  // Active / Today exams
  const todayExams = useMemo(() => {
    const now = Date.now();
    return realExams.filter((ex: any) => {
      if (!ex.startTime) return false;
      const start = new Date(ex.startTime).getTime();
      const end = ex.endTime ? new Date(ex.endTime).getTime() : start + (ex.durationMinutes || 60) * 60000;
      // Either active right now or starting in next 24 hours
      return (now >= start && now <= end) || (start > now && start - now < 86400000);
    });
  }, [realExams]);

  return (
    <div className="space-y-4 sm:space-y-5 pb-12 max-w-7xl mx-auto px-1 sm:px-0 animate-in fade-in duration-300">
      {/* 1. Daily Briefing Header (روزنگاشت امروز) */}
      <div className="bg-white dark:bg-[#151C28] rounded-2xl border-[1.5px] border-primary-dark/30 dark:border-[#242F42] shadow-[2px_2px_0_#59BBAF] dark:shadow-[2px_2px_0_#0B0F17] p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary dark:text-primary border border-primary/25 flex items-center justify-center font-black shadow-2xs shrink-0">
              <GraduationCap className="w-5 h-5" />
            </div>

            <div className="space-y-0.5 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base sm:text-xl font-black text-ink-darker dark:text-white truncate">
                  روزنگاشت تحصیلی • {liveDate}
                </h1>
              </div>

              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                {user ? cleanUserFullName(user.firstName, user.lastName) || 'دانش‌آموز' : 'دانش‌آموز'}
                {scheduleData?.classroom ? ` • کلاس ${scheduleData.classroom.name}` : ''}
                {scheduleData?.classroom?.field?.name ? ` (${scheduleData.classroom.field.name})` : ''}
              </p>
            </div>
          </div>

          {/* Quick Stats Pill */}
          <div className="flex items-center gap-2 shrink-0 bg-gray-50 dark:bg-[#1C2536] p-2 rounded-xl border border-gray-200/80 dark:border-gray-700/60 text-xs font-bold">
            <span className="flex items-center gap-1.5 text-primary">
              <CalendarDays className="w-4 h-4" />
              <span>{toPersianDigits(todaySchedules.length)} زنگ کلاس</span>
            </span>
            <span className="text-gray-300 dark:text-gray-600">•</span>
            <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
              <FileCheck className="w-4 h-4" />
              <span>{toPersianDigits(pendingHomework.length)} تکلیف ناتمام</span>
            </span>
          </div>
        </div>
      </div>

      {/* 2. Today's Live Flow Timeline (خط زمانی کلاس‌های امروز) */}
      <Card className="p-4 sm:p-5 bg-white dark:bg-[#151C28] border border-gray-200/80 dark:border-[#242F42] shadow-xs">
        <div className="flex items-center justify-between gap-3 mb-3.5 pb-2.5 border-b border-gray-100 dark:border-[#242F42]">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary shrink-0" />
            <h2 className="text-sm font-black text-ink-darker dark:text-white">
              کلاس‌های امروز
            </h2>
          </div>

          <button
            type="button"
            onClick={() => navigate('/app/student/schedule')}
            className="text-xs text-primary font-bold hover:underline flex items-center gap-1 shrink-0"
          >
            <span>برنامه کامل هفتگی</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {isLoading ? (
          <div className="py-8 text-center text-xs text-gray-400 animate-pulse">
            در حال دریافت برنامه کلاس‌های امروز...
          </div>
        ) : todaySchedules.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5">
            {todaySchedules.map((slot: any) => {
              const now = new Date();
              const currentMin = now.getHours() * 60 + now.getMinutes();
              const [sH, sM] = (slot.startTime || '00:00').split(':').map(Number);
              const [eH, eM] = (slot.endTime || '00:00').split(':').map(Number);
              const isCurrent = currentMin >= sH * 60 + sM && currentMin <= eH * 60 + eM;
              const isPassed = currentMin > eH * 60 + eM;

              return (
                <div
                  key={slot.id}
                  className={`p-3 rounded-xl border text-xs flex flex-col justify-between transition-all ${
                    isCurrent
                      ? 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/40 ring-2 ring-emerald-500/40 shadow-xs'
                      : isPassed
                      ? 'border-gray-200 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-900/40 opacity-70'
                      : 'border-primary/20 bg-white dark:bg-[#1C2536] hover:border-primary/40'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className={`font-black text-[11px] ${
                        isCurrent ? 'text-emerald-700 dark:text-emerald-300' : 'text-primary'
                      }`}>
                        زنگ {toPersianDigits(slot.periodNumber)}
                      </span>
                      <span className="font-mono text-[10px] text-gray-400 dir-ltr">
                        {toPersianDigits(slot.startTime)} - {toPersianDigits(slot.endTime)}
                      </span>
                    </div>

                    <div className="font-bold text-ink-darker dark:text-white line-clamp-1">
                      {slot.lesson?.name || 'کلاس درس'}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 text-[11px] text-gray-500 dark:text-gray-400 mt-2 pt-1.5 border-t border-gray-100 dark:border-gray-800">
                    <User className="w-3 h-3 text-primary shrink-0" />
                    <span className="truncate">
                      {slot.teacher?.user ? cleanUserFullName(slot.teacher.user.firstName, slot.teacher.user.lastName) : 'مربی'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-6 text-center text-xs text-gray-400 bg-gray-50 dark:bg-[#1C2536] rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
            امروز کلاسی در برنامه هفتگی شما ثبت نشده است (روز تعطیل یا آزاد).
          </div>
        )}
      </Card>

      {/* 3. Main Split Section: Urgent Action Items & Daily Personal Checklist */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5">
        {/* Right 7 Cols: Urgent Tasks for Today & Upcoming */}
        <Card className="lg:col-span-7 p-4 sm:p-5 bg-white dark:bg-[#151C28] border border-gray-200/80 dark:border-[#242F42] shadow-xs flex flex-col justify-between">
          <div className="space-y-3.5">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-[#242F42]">
              <div className="flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-amber-500 shrink-0" />
                <h2 className="text-sm font-black text-ink-darker dark:text-white">
                  تکالیف نیازمند اقدام فوری
                </h2>
                {pendingHomework.length > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 text-[10px] font-mono font-bold">
                    {toPersianDigits(pendingHomework.length)} مورد
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={() => navigate('/app/student/homework')}
                className="text-xs text-primary font-bold hover:underline flex items-center gap-1"
              >
                <span>مشاهده همه تکالیف</span>
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Homework List */}
            <div className="space-y-2">
              {pendingHomework.length === 0 ? (
                <div className="py-8 text-center text-xs text-gray-400 bg-gray-50 dark:bg-[#1C2536] rounded-xl border border-dashed border-gray-200 dark:border-gray-700 space-y-1">
                  <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto" />
                  <p className="font-bold text-ink-darker dark:text-white">تمام تکالیف انجام شده‌اند!</p>
                  <p className="text-[11px] text-gray-400">تکلیف معوقی برای ارسال ندارید.</p>
                </div>
              ) : (
                pendingHomework.slice(0, 3).map((hw: any) => (
                  <div
                    key={hw.id}
                    className="p-3 rounded-xl border border-amber-200/70 dark:border-amber-900/30 bg-amber-50/40 dark:bg-amber-950/20 flex items-center justify-between text-xs gap-3"
                  >
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-ink-darker dark:text-white truncate">
                          {hw.title}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-white dark:bg-[#151C28] text-primary border border-primary/20 font-bold shrink-0">
                          {hw.lesson?.name || 'درس'}
                        </span>
                      </div>
                      {hw.dueDate && (
                        <div className="text-[11px] text-gray-500 dark:text-gray-400 flex items-center gap-1 font-mono">
                          <Clock className="w-3 h-3 text-amber-500 shrink-0" />
                          <span>مهلت تحویل: {formatToJalali(hw.dueDate)}</span>
                        </div>
                      )}
                    </div>

                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => navigate(`/app/student/homework?homeworkId=${hw.id}&action=submit`)}
                      className="shrink-0 h-8 px-3 text-xs font-bold gap-1"
                    >
                      <Send className="w-3 h-3" />
                      <span>ارسال</span>
                    </Button>
                  </div>
                ))
              )}
            </div>

            {/* Active / Today Exams banner if any */}
            {todayExams.length > 0 && (
              <div className="pt-2">
                <div className="p-3 rounded-xl border border-rose-300 dark:border-rose-900/50 bg-rose-50/50 dark:bg-rose-950/20 flex items-center justify-between text-xs gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <HelpCircle className="w-4 h-4 text-rose-500 shrink-0" />
                    <div className="min-w-0">
                      <span className="font-black text-rose-700 dark:text-rose-300 block truncate">
                        {todayExams[0].title}
                      </span>
                      <span className="text-[11px] text-gray-500 dark:text-gray-400">
                        {todayExams[0].lesson?.name || 'آزمون آنلاین'} • مدت: {toPersianDigits(todayExams[0].durationMinutes || 60)} دقیقه
                      </span>
                    </div>
                  </div>

                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => navigate(`/app/student/exams?examId=${todayExams[0].id}&action=start`)}
                    className="shrink-0 h-8 px-3 text-xs font-bold gap-1"
                  >
                    <Play className="w-3 h-3" />
                    <span>ورود به آزمون</span>
                  </Button>
                </div>
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-gray-100 dark:border-[#242F42] flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>مجموع تکالیف ترم: {toPersianDigits(realHomework.length)} تکلیف</span>
            <button
              type="button"
              onClick={() => navigate('/app/student/homework')}
              className="text-primary font-bold hover:underline"
            >
              مشاهده سوابق و نمرات تکالیف ←
            </button>
          </div>
        </Card>

        {/* Left 5 Cols: Student's Personal Daily Todo Checklist (روزنگاشت یادداشت‌های من) */}
        <Card className="lg:col-span-5 p-4 sm:p-5 bg-white dark:bg-[#151C28] border border-gray-200/80 dark:border-[#242F42] shadow-xs flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-[#242F42]">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                <h2 className="text-sm font-black text-ink-darker dark:text-white">
                  یادداشت‌ها و کارهای امروز من
                </h2>
              </div>
              <span className="text-[10px] text-gray-400 font-mono">
                {toPersianDigits(dailyTodos.filter((t) => t.completed).length)} از {toPersianDigits(dailyTodos.length)}
              </span>
            </div>

            {/* Todo Input */}
            <form onSubmit={addTodo} className="flex items-center gap-2">
              <input
                type="text"
                value={newTodoInput}
                onChange={(e) => setNewTodoInput(e.target.value)}
                placeholder="افزودن کار جدید برای امروز..."
                className="flex-1 h-8 px-3 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#1C2536] text-ink-darker dark:text-white outline-none focus:border-primary transition-colors"
              />
              <button
                type="submit"
                className="h-8 w-8 rounded-xl bg-primary hover:bg-primary-hover text-white flex items-center justify-center shrink-0 transition-colors shadow-2xs"
                title="افزودن"
              >
                <Plus className="w-4 h-4" />
              </button>
            </form>

            {/* Todo Items */}
            <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
              {dailyTodos.length === 0 ? (
                <div className="py-6 text-center text-xs text-gray-400">
                  کاری برای امروز ثبت نکرده‌اید.
                </div>
              ) : (
                dailyTodos.map((todo) => (
                  <div
                    key={todo.id}
                    className={`flex items-center justify-between p-2 rounded-xl border text-xs gap-2 transition-colors ${
                      todo.completed
                        ? 'border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/30 text-gray-400 line-through'
                        : 'border-gray-200/80 dark:border-gray-800 bg-white dark:bg-[#1C2536] text-ink-darker dark:text-white'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => toggleTodo(todo.id)}
                      className="flex items-center gap-2 min-w-0 flex-1 text-right"
                    >
                      {todo.completed ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      ) : (
                        <Circle className="w-4 h-4 text-gray-300 dark:text-gray-600 shrink-0" />
                      )}
                      <span className="truncate">{todo.text}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => deleteTodo(todo.id)}
                      className="text-gray-300 hover:text-rose-500 transition-colors shrink-0 p-1"
                      title="حذف"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Quick Notice of Messages */}
          {recentMessages.length > 0 && (
            <div className="mt-3 pt-2.5 border-t border-gray-100 dark:border-[#242F42]">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400 text-[11px]">
                  <MessageSquare className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span>آخرین پیام: {recentMessages[0].subject || recentMessages[0].title || 'پیام جدید'}</span>
                </span>
                <button
                  type="button"
                  onClick={() => navigate('/app/messages')}
                  className="text-primary font-bold text-[11px] hover:underline shrink-0"
                >
                  صندوق پیام‌ها
                </button>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* 4. Quick Actions Toolbar (دسترسی‌های سریع اختصاصی دانش‌آموز) */}
      <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-[#151C28] border border-gray-200/80 dark:border-[#242F42] shadow-xs">
        <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-gray-100 dark:border-[#242F42]">
          <span className="text-xs font-black text-ink-darker dark:text-white flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            <span>میانبرهای سریع روزانه</span>
          </span>
          <span className="text-[11px] text-gray-400">انتقال سریع به بخش‌های اصلی پرتال</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          <button
            type="button"
            onClick={() => navigate('/app/student/schedule')}
            className="p-2.5 rounded-xl border border-gray-200/70 dark:border-gray-800 bg-gray-50/60 dark:bg-[#1C2536] hover:border-primary/40 hover:text-primary transition-all flex items-center gap-2 text-xs font-bold text-ink-darker dark:text-white"
          >
            <Calendar className="w-4 h-4 text-primary shrink-0" />
            <span className="truncate">برنامه کلاسی</span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/app/student/homework')}
            className="p-2.5 rounded-xl border border-gray-200/70 dark:border-gray-800 bg-gray-50/60 dark:bg-[#1C2536] hover:border-amber-400/40 hover:text-amber-600 transition-all flex items-center gap-2 text-xs font-bold text-ink-darker dark:text-white"
          >
            <FileCheck className="w-4 h-4 text-amber-500 shrink-0" />
            <span className="truncate">تکالیف درسی</span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/app/student/exams')}
            className="p-2.5 rounded-xl border border-gray-200/70 dark:border-gray-800 bg-gray-50/60 dark:bg-[#1C2536] hover:border-rose-400/40 hover:text-rose-600 transition-all flex items-center gap-2 text-xs font-bold text-ink-darker dark:text-white"
          >
            <HelpCircle className="w-4 h-4 text-rose-500 shrink-0" />
            <span className="truncate">آزمون‌ها</span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/app/student/grades')}
            className="p-2.5 rounded-xl border border-gray-200/70 dark:border-gray-800 bg-gray-50/60 dark:bg-[#1C2536] hover:border-blue-400/40 hover:text-blue-600 transition-all flex items-center gap-2 text-xs font-bold text-ink-darker dark:text-white"
          >
            <FileText className="w-4 h-4 text-blue-500 shrink-0" />
            <span className="truncate">کارنامه و نمرات</span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/app/student/matters')}
            className="p-2.5 rounded-xl border border-gray-200/70 dark:border-gray-800 bg-gray-50/60 dark:bg-[#1C2536] hover:border-emerald-400/40 hover:text-emerald-600 transition-all flex items-center gap-2 text-xs font-bold text-ink-darker dark:text-white"
          >
            <Scale className="w-4 h-4 text-emerald-500 shrink-0" />
            <span className="truncate">موارد انضباطی</span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/app/student/materials')}
            className="p-2.5 rounded-xl border border-gray-200/70 dark:border-gray-800 bg-gray-50/60 dark:bg-[#1C2536] hover:border-purple-400/40 hover:text-purple-600 transition-all flex items-center gap-2 text-xs font-bold text-ink-darker dark:text-white"
          >
            <BookOpen className="w-4 h-4 text-purple-500 shrink-0" />
            <span className="truncate">محتوای آموزشی</span>
          </button>
        </div>
      </div>
    </div>
  );
};
