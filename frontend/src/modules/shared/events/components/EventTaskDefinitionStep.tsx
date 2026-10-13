import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '../../../../components/ui/Button';
import { Modal } from '../../../../components/ui/Modal';
import { toast } from '../../../../components/ui/toast/toast';
import { useAuthStore } from '../../../../lib/auth/auth-store';
import { toPersianDigits } from '../../../../utils/jalali';
import { EventIdea } from './EventIdeaSubmissionStep';
import {
  EventTaskItem,
  EventTaskBoardState,
  buildTaskBoardTeams,
  ensureTeamEntry,
  findStudentTeamKeys,
  loadTaskBoard,
  loadTeamsMap,
  saveTaskBoard,
  teamTaskScore,
  TaskBoardTeamInfo,
} from '../constants/event-taskboard';
import {
  ListChecks,
  Plus,
  Edit3,
  Trash2,
  CheckCircle2,
  Circle,
  ShieldCheck,
  ArrowLeft,
  Trophy,
  Users,
  AlertCircle,
  Copy,
} from 'lucide-react';

interface EventTaskDefinitionStepProps {
  eventId: string;
  eventTitle: string;
  ideas: EventIdea[];
  isEventEnded?: boolean;
}

interface TaskFormState {
  title: string;
  points: string;
}

const emptyTaskForm: TaskFormState = { title: '', points: '20' };

const TEAM_SECTION_STYLES = [
  'border-cyan-600 bg-cyan-50/40 dark:border-cyan-700 dark:bg-cyan-950/30',
  'border-violet-600 bg-violet-50/40 dark:border-violet-700 dark:bg-violet-950/30',
  'border-amber-600 bg-amber-50/40 dark:border-amber-700 dark:bg-amber-950/30',
  'border-emerald-600 bg-emerald-50/40 dark:border-emerald-700 dark:bg-emerald-950/30',
  'border-rose-600 bg-rose-50/40 dark:border-rose-700 dark:bg-rose-950/30',
  'border-indigo-600 bg-indigo-50/40 dark:border-indigo-700 dark:bg-indigo-950/30',
];

export const EventTaskDefinitionStep: React.FC<EventTaskDefinitionStepProps> = ({
  eventId,
  eventTitle,
  ideas,
  isEventEnded = false,
}) => {
  const currentUser = useAuthStore((s) => s.user);
  const isManager = ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER', 'STAFF'].includes(
    currentUser?.role || '',
  );
  const isParent = currentUser?.role === 'PARENT';
  const isStudent = currentUser?.role === 'STUDENT';
  const canManageTasks = isManager && !isEventEnded;

  const teamsMap = useMemo(() => loadTeamsMap(eventId), [eventId]);
  const allTeams = useMemo(
    () => buildTaskBoardTeams(eventId, ideas, teamsMap),
    [eventId, ideas, teamsMap],
  );

  const [board, setBoard] = useState<EventTaskBoardState>(() => loadTaskBoard(eventId));
  const [activeTeamKey, setActiveTeamKey] = useState<string | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [taskForm, setTaskForm] = useState<TaskFormState>(emptyTaskForm);
  const [bulkForm, setBulkForm] = useState<TaskFormState[]>([
    { title: '', points: '20' },
  ]);
  const [applyBulkToAll, setApplyBulkToAll] = useState(true);

  const visibleTeams = useMemo(() => {
    if (isManager || isParent) return allTeams;
    if (!isStudent) return [];
    const myKeys = findStudentTeamKeys(
      allTeams,
      currentUser?.firstName,
      currentUser?.lastName,
    );
    if (myKeys.length === 0) return [];
    return allTeams.filter((t) => myKeys.includes(t.key));
  }, [allTeams, isManager, isParent, isStudent, currentUser]);

  useEffect(() => {
    saveTaskBoard(eventId, board);
  }, [eventId, board]);

  useEffect(() => {
    if (visibleTeams.length === 0) {
      setActiveTeamKey(null);
      return;
    }
    if (!activeTeamKey || !visibleTeams.some((t) => t.key === activeTeamKey)) {
      setActiveTeamKey(visibleTeams[0].key);
    }
  }, [visibleTeams, activeTeamKey]);

  const activeTeam: TaskBoardTeamInfo | undefined = visibleTeams.find(
    (t) => t.key === activeTeamKey,
  );

  const openAddTask = (teamKey?: string) => {
    if (teamKey) setActiveTeamKey(teamKey);
    else if (!activeTeamKey && visibleTeams[0]) setActiveTeamKey(visibleTeams[0].key);
    setEditingTaskId(null);
    setTaskForm(emptyTaskForm);
    setIsAddOpen(true);
  };

  const openEditTask = (task: EventTaskItem, teamKey?: string) => {
    if (teamKey) setActiveTeamKey(teamKey);
    setEditingTaskId(task.id);
    setTaskForm({ title: task.title, points: String(task.points) });
    setIsAddOpen(true);
  };

  const handleSaveTask = () => {
    if (!activeTeamKey) return;
    const title = taskForm.title.trim();
    const points = parseInt(taskForm.points, 10);
    if (!title) {
      toast.error('عنوان تسک را وارد کنید.');
      return;
    }
    if (Number.isNaN(points) || points < 0) {
      toast.error('امتیاز تسک باید عدد معتبر باشد.');
      return;
    }

    setBoard((prev) => {
      const next = ensureTeamEntry(prev, activeTeamKey);
      const entry = { ...next.teams[activeTeamKey] };
      if (editingTaskId) {
        entry.tasks = entry.tasks.map((t) =>
          t.id === editingTaskId ? { ...t, title, points } : t,
        );
      } else {
        const newTask: EventTaskItem = {
          id: `task_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          title,
          points,
          completed: false,
        };
        entry.tasks = [...entry.tasks, newTask];
      }
      return { ...next, teams: { ...next.teams, [activeTeamKey]: entry } };
    });

    setIsAddOpen(false);
    setEditingTaskId(null);
    toast.success(editingTaskId ? 'تسک ویرایش شد.' : 'تسک اضافه شد.');
  };

  const handleDeleteTask = (taskId: string, teamKey?: string) => {
    const key = teamKey || activeTeamKey;
    if (!key) return;
    setBoard((prev) => {
      const entry = prev.teams[key];
      if (!entry) return prev;
      return {
        ...prev,
        teams: {
          ...prev.teams,
          [key]: {
            ...entry,
            tasks: entry.tasks.filter((t) => t.id !== taskId),
          },
        },
      };
    });
    toast.info('تسک حذف شد.');
  };

  const handleToggleComplete = (taskId: string, teamKey?: string) => {
    const key = teamKey || activeTeamKey;
    if (!key) return;
    setBoard((prev) => {
      const next = ensureTeamEntry(prev, key);
      const entry = { ...next.teams[key] };
      entry.tasks = entry.tasks.map((t) => {
        if (t.id !== taskId) return t;
        const completed = !t.completed;
        return {
          ...t,
          completed,
          completedAt: completed ? new Date().toISOString() : undefined,
        };
      });
      return { ...next, teams: { ...next.teams, [key]: entry } };
    });
  };

  const handleAddBulkRow = () => {
    setBulkForm((prev) => [...prev, { title: '', points: '20' }]);
  };

  const handleBulkRowChange = (index: number, patch: Partial<TaskFormState>) => {
    setBulkForm((prev) =>
      prev.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    );
  };

  const handleRemoveBulkRow = (index: number) => {
    setBulkForm((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)));
  };

  const handleSaveBulk = () => {
    const cleaned = bulkForm
      .map((row) => ({
        title: row.title.trim(),
        points: parseInt(row.points, 10),
      }))
      .filter((row) => row.title && !Number.isNaN(row.points) && row.points >= 0);

    if (cleaned.length === 0) {
      toast.error('حداقل یک تسک معتبر وارد کنید.');
      return;
    }

    const targetKeys = applyBulkToAll
      ? allTeams.map((t) => t.key)
      : activeTeamKey
        ? [activeTeamKey]
        : [];

    if (targetKeys.length === 0) {
      toast.error('تیمی برای اعمال تسک‌ها انتخاب نشده است.');
      return;
    }

    const stamp = Date.now();
    setBoard((prev) => {
      let next = prev;
      targetKeys.forEach((key, teamIdx) => {
        next = ensureTeamEntry(next, key);
        const entry = { ...next.teams[key] };
        const newTasks: EventTaskItem[] = cleaned.map((row, i) => ({
          id: `task_${stamp}_${teamIdx}_${i}_${Math.random().toString(36).slice(2, 6)}`,
          title: row.title,
          points: row.points,
          completed: false,
        }));
        entry.tasks = [...entry.tasks, ...newTasks];
        next = { ...next, teams: { ...next.teams, [key]: entry } };
      });
      return next;
    });

    setIsBulkOpen(false);
    setBulkForm([{ title: '', points: '20' }]);
    toast.success(
      `${toPersianDigits(cleaned.length)} تسک برای ${toPersianDigits(targetKeys.length)} تیم ثبت شد.`,
    );
  };

  if (visibleTeams.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-[#151C28] p-8 sm:p-12 text-center shadow-2xs space-y-3">
        <AlertCircle className="w-12 h-12 mx-auto text-amber-500 mb-2" />
        <h3 className="text-lg font-black text-ink-darker dark:text-white">
          تیمی برای تعریف تسک یافت نشد
        </h3>
        <p className="text-xs md:text-sm font-medium text-gray-500 dark:text-gray-400 max-w-md mx-auto leading-relaxed">
          ابتدا ایده‌ها را ثبت، رای‌گیری را تکمیل و تیم‌ها را در مرحله تشکیل تیم بسازید؛ سپس
          برای هر تیم تسک و امتیاز تعریف کنید.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl border-[1.5px] border-primary-dark/30 dark:border-gray-800 bg-white dark:bg-[#151C28] shadow-[2px_2px_0_#59BBAF] dark:shadow-[2px_2px_0_#0B0F17] p-5 sm:p-7 space-y-2">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg md:text-xl font-black text-ink-darker dark:text-white flex items-center gap-2">
              <ListChecks className="w-5 h-5 text-primary shrink-0" />
              <span>گام ششم: مدیریت تسک‌ها</span>
            </h2>
            <p className="text-xs md:text-sm font-medium text-gray-500 dark:text-gray-400 mt-3">
              وظایف و فعالیت‌های عملیاتی تیم خود را پیگیری، مدیریت و تکمیل کنید.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {canManageTasks && (
              <>
                <Button variant="outline" size="sm" onClick={() => setIsBulkOpen(true)} className="gap-1.5 text-xs font-bold">
                  <Copy className="w-3.5 h-3.5 text-primary" />
                  افزودن گروهی تسک
                </Button>
                <Button variant="primary" size="sm" onClick={() => openAddTask()} className="gap-1.5 text-xs font-bold">
                  <Plus className="w-3.5 h-3.5" />
                  تسک جدید
                </Button>
              </>
            )}
          </div>
        </div>

        {isManager && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-primary/20 bg-primary/10 text-primary text-xs font-bold shadow-2xs">
            <ShieldCheck className="w-4 h-4 text-primary" />
            <span>
              {isEventEnded
                ? 'پنل مدیر: رویداد به پایان رسیده و تابلوی وظایف در حالت نمایشی است'
                : 'پنل مدیر: افزودن، ویرایش، حذف و تیک زدن تسک‌های همه تیم‌ها فعال است'}
            </span>
          </div>
        )}

        {isParent && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border-2 border-blue-600 bg-blue-50 text-blue-900 dark:bg-blue-950 dark:text-blue-200 text-xs font-black">
            <Users className="w-4 h-4 text-blue-600" />
            <span>حالت مشاهده‌گر اولیاء: تابلوی وظایف و امتیازات تیم‌ها در حالت نمایشی</span>
          </div>
        )}
      </div>

      {/* One section per team */}
      <div className="space-y-6">
        {visibleTeams.map((team, teamIndex) => {
          const entry = board.teams[team.key];
          const score = teamTaskScore(entry);
          const tasks = entry?.tasks || [];
          const doneCount = tasks.filter((t) => t.completed).length;
          const isActive = team.key === activeTeamKey;

          return (
            <section
              key={team.key}
              className={`rounded-2xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-[#151C28] p-5 sm:p-6 shadow-2xs hover:shadow-xs transition-all ${
                isActive ? 'ring-2 ring-primary/40 border-primary/40' : ''
              }`}
            >
              {/* Team section header */}
              <div className="flex flex-wrap items-start justify-between gap-3 mb-4 pb-3 border-b border-gray-100 dark:border-gray-800/80">
                <div className="flex items-start gap-3 min-w-0">
                  <span className="flex-shrink-0 inline-flex items-center justify-center w-8 h-8 rounded-xl border border-primary/20 bg-primary/10 text-primary text-xs font-bold shadow-2xs">
                    {toPersianDigits(teamIndex + 1)}
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-primary flex-shrink-0" />
                      <h3 className="text-sm md:text-base font-black text-ink-darker dark:text-white truncate">
                        {team.label}
                      </h3>
                    </div>
                    <p className="text-xs font-medium text-gray-400 mt-0.5 truncate">
                      {team.memberNames.join('، ')}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2.5 py-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50/70 dark:bg-[#1C2536] text-ink-darker dark:text-white text-xs font-bold">
                    {toPersianDigits(doneCount)}/{toPersianDigits(tasks.length)} تسک
                  </span>
                  <span className="px-2.5 py-1 rounded-lg border border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-bold inline-flex items-center gap-1 shadow-2xs">
                    <Trophy className="w-3 h-3 text-amber-500" />
                    {toPersianDigits(score)} امتیاز
                  </span>
                  {canManageTasks && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openAddTask(team.key)}
                      className="gap-1 text-xs font-bold"
                    >
                      <Plus className="w-3.5 h-3.5 text-primary" />
                      افزودن
                    </Button>
                  )}
                </div>
              </div>

              {tasks.length === 0 ? (
                <div className="rounded-xl border border-dashed border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-[#1C2536]/30 p-6 text-center space-y-1">
                  <ListChecks className="w-8 h-8 mx-auto text-primary/60 mb-1" />
                  <p className="text-xs font-bold text-ink-darker dark:text-white">
                    هنوز تسکی برای این تیم تعریف نشده
                  </p>
                  <p className="text-xs font-medium text-gray-400">
                    {isManager
                      ? 'با «افزودن» یا «افزودن گروهی» لیست تسک‌ها را بسازید.'
                      : 'منتظر تعریف تسک توسط مدیر رویداد باشید.'}
                  </p>
                </div>
              ) : (
                <ul className="space-y-2">
                  {tasks.map((task, index) => (
                    <li
                      key={task.id}
                      className={`flex items-center gap-3 rounded-xl border p-3 transition-all ${
                        task.completed
                          ? 'border-emerald-500/30 bg-emerald-500/10 dark:bg-emerald-950/20'
                          : 'border-gray-200/80 dark:border-gray-800 bg-gray-50/70 dark:bg-[#1C2536]/40 shadow-2xs'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => handleToggleComplete(task.id, team.key)}
                        disabled={!canManageTasks}
                        title={
                          canManageTasks
                            ? task.completed
                              ? 'برداشتن تیک (کسر امتیاز)'
                              : 'تیک زدن (اعطای امتیاز)'
                            : isEventEnded
                            ? 'رویداد به پایان رسیده است'
                            : 'فقط مدیر می‌تواند تیک بزند'
                        }
                        className={`flex-shrink-0 w-7 h-7 rounded-lg border flex items-center justify-center transition-all ${
                          task.completed
                            ? 'border-emerald-500 bg-emerald-500 text-white'
                            : 'border-gray-300 bg-white text-gray-300 dark:bg-[#1C2536] dark:border-gray-600'
                        } ${canManageTasks ? 'cursor-pointer hover:scale-105' : 'cursor-not-allowed opacity-70'}`}
                      >
                        {task.completed ? (
                          <CheckCircle2 className="w-4 h-4" />
                        ) : (
                          <Circle className="w-4 h-4" />
                        )}
                      </button>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-gray-400">
                            {toPersianDigits(index + 1)}.
                          </span>
                          <span
                            className={`text-xs font-bold truncate ${
                              task.completed
                                ? 'text-emerald-700 dark:text-emerald-300 line-through decoration-emerald-500/60'
                                : 'text-ink-darker dark:text-white'
                            }`}
                          >
                            {task.title}
                          </span>
                        </div>
                      </div>

                      <span className="flex-shrink-0 px-2 py-0.5 rounded-lg border border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-bold">
                        {toPersianDigits(task.points)} امتیاز
                      </span>

                      {canManageTasks && (
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            type="button"
                            onClick={() => openEditTask(task, team.key)}
                            className="p-1.5 rounded-lg text-primary hover:bg-primary/10 transition-colors"
                            title="ویرایش تسک"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteTask(task.id, team.key)}
                            className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                            title="حذف تسک"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>

      {/* Add / Edit single task modal */}
      <Modal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title={editingTaskId ? 'ویرایش تسک' : 'افزودن تسک جدید'}
        description={
          activeTeam ? `تیم: ${activeTeam.label}` : undefined
        }
        maxWidth="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-ink-darker dark:text-white mb-1.5">
              عنوان تسک
            </label>
            <input
              type="text"
              value={taskForm.title}
              onChange={(e) => setTaskForm((p) => ({ ...p, title: e.target.value }))}
              placeholder="مثلا: طراحی صفحه اصلی لندینگ"
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#151C28] text-ink-darker dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 text-xs md:text-sm font-medium focus:border-primary focus:outline-none transition-all"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-ink-darker dark:text-white mb-1.5">
              امتیاز تسک
            </label>
            <input
              type="number"
              min={0}
              value={taskForm.points}
              onChange={(e) => setTaskForm((p) => ({ ...p, points: e.target.value }))}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#151C28] text-ink-darker dark:text-white text-xs md:text-sm font-medium focus:border-primary focus:outline-none transition-all"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
            <Button variant="outline" size="md" onClick={() => setIsAddOpen(false)} className="text-xs font-bold">
              انصراف
            </Button>
            <Button variant="primary" size="md" onClick={handleSaveTask} className="text-xs font-bold">
              {editingTaskId ? 'ذخیره تغییرات' : 'افزودن تسک'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Bulk add modal */}
      <Modal
        isOpen={isBulkOpen}
        onClose={() => setIsBulkOpen(false)}
        title="افزودن گروهی تسک"
        description="چند تسک را یکجا برای یک تیم یا همه تیم‌ها ثبت کنید"
        maxWidth="lg"
      >
        <div className="space-y-4">
          <label className="flex items-center gap-2 text-xs font-bold text-ink-darker dark:text-white cursor-pointer">
            <input
              type="checkbox"
              checked={applyBulkToAll}
              onChange={(e) => setApplyBulkToAll(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
            />
            اعمال روی همه تیم‌ها
            {!applyBulkToAll && (
              <span className="text-gray-400 font-medium">
                (تیم فعال: {activeTeam?.label || '—'})
              </span>
            )}
          </label>

          <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
            {bulkForm.map((row, index) => (
              <div
                key={index}
                className="flex items-center gap-2 rounded-xl border border-gray-200/80 dark:border-gray-800 bg-gray-50/70 dark:bg-[#1C2536]/50 p-2 shadow-2xs"
              >
                <span className="text-[10px] font-bold text-gray-400 w-5 text-center">
                  {toPersianDigits(index + 1)}
                </span>
                <input
                  type="text"
                  value={row.title}
                  onChange={(e) => handleBulkRowChange(index, { title: e.target.value })}
                  placeholder={`عنوان تسک ${toPersianDigits(index + 1)}`}
                  className="flex-1 min-w-0 px-2.5 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#151C28] text-ink-darker dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 text-xs font-medium focus:border-primary focus:outline-none transition-all"
                />
                <input
                  type="number"
                  min={0}
                  value={row.points}
                  onChange={(e) => handleBulkRowChange(index, { points: e.target.value })}
                  className="w-16 px-2 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#151C28] text-ink-darker dark:text-white text-xs font-medium text-center focus:border-primary focus:outline-none transition-all"
                  title="امتیاز"
                />
                <button
                  type="button"
                  onClick={() => handleRemoveBulkRow(index)}
                  className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                  title="حذف ردیف"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

          <Button variant="outline" size="sm" onClick={handleAddBulkRow} className="gap-1 text-xs font-bold">
            <Plus className="w-3.5 h-3.5 text-primary" />
            ردیف دیگر
          </Button>

          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
            <Button variant="outline" size="md" onClick={() => setIsBulkOpen(false)} className="text-xs font-bold">
              انصراف
            </Button>
            <Button variant="primary" size="md" onClick={handleSaveBulk} className="text-xs font-bold">
              ثبت تسک‌ها
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
