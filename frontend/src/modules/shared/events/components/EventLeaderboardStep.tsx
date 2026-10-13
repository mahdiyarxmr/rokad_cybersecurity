import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '../../../../components/ui/Button';
import { Modal } from '../../../../components/ui/Modal';
import { toast } from '../../../../components/ui/toast/toast';
import { useAuthStore } from '../../../../lib/auth/auth-store';
import { toPersianDigits } from '../../../../utils/jalali';
import { EventIdea } from './EventIdeaSubmissionStep';
import {
  EventTaskBoardState,
  buildTaskBoardTeams,
  ensureTeamEntry,
  loadTaskBoard,
  loadTeamsMap,
  saveTaskBoard,
  teamTaskScore,
} from '../constants/event-taskboard';
import {
  Trophy,
  Medal,
  ShieldCheck,
  ArrowLeft,
  ListChecks,
  Plus,
  Minus,
  CheckCircle2,
  Circle,
  Users,
  AlertCircle,
} from 'lucide-react';

interface EventLeaderboardStepProps {
  eventId: string;
  eventTitle: string;
  ideas: EventIdea[];
  isEventEnded?: boolean;
}

export const EventLeaderboardStep: React.FC<EventLeaderboardStepProps> = ({
  eventId,
  eventTitle,
  ideas,
  isEventEnded = false,
}) => {
  const currentUser = useAuthStore((s) => s.user);
  const isManager =
    ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER', 'STAFF'].includes(
      currentUser?.role || '',
    ) && !isEventEnded;

  const teamsMap = useMemo(() => loadTeamsMap(eventId), [eventId]);
  const allTeams = useMemo(
    () => buildTaskBoardTeams(eventId, ideas, teamsMap),
    [eventId, ideas, teamsMap],
  );

  const [board, setBoard] = useState<EventTaskBoardState>(() => loadTaskBoard(eventId));
  const [adjustTeamKey, setAdjustTeamKey] = useState<string | null>(null);
  const [adjustDelta, setAdjustDelta] = useState('10');
  const [manageTeamKey, setManageTeamKey] = useState<string | null>(null);

  useEffect(() => {
    saveTaskBoard(eventId, board);
  }, [eventId, board]);

  // Leaderboard is shared: every team is ranked and visible to all.
  // Only managers get ± score / untick controls.
  const visibleTeams = allTeams;

  const ranked = useMemo(() => {
    return visibleTeams
      .map((team) => {
        const entry = board.teams[team.key];
        const score = teamTaskScore(entry);
        const completed = entry?.tasks.filter((t) => t.completed).length || 0;
        const total = entry?.tasks.length || 0;
        return { team, entry, score, completed, total };
      })
      .sort((a, b) => b.score - a.score || a.team.label.localeCompare(b.team.label));
  }, [visibleTeams, board]);

  const manageTeam = ranked.find((r) => r.team.key === manageTeamKey);
  const adjustTeam = ranked.find((r) => r.team.key === adjustTeamKey);

  const eventTotals = useMemo(() => {
    let totalTasks = 0;
    let totalCompleted = 0;
    for (const row of ranked) {
      totalTasks += row.total;
      totalCompleted += row.completed;
    }
    return { totalTasks, totalCompleted };
  }, [ranked]);

  const handleManualAdjust = (teamKey: string, delta: number) => {
    if (!isManager) return;
    setBoard((prev) => {
      const next = ensureTeamEntry(prev, teamKey);
      const entry = { ...next.teams[teamKey] };
      entry.manualAdjustment = (Number(entry.manualAdjustment) || 0) + delta;
      return { ...next, teams: { ...next.teams, [teamKey]: entry } };
    });
    toast.success(
      `امتیاز تیم ${delta > 0 ? '+' : ''}${toPersianDigits(delta)} واحد تغییر کرد.`,
    );
  };

  const handleApplyAdjustForm = () => {
    if (!adjustTeamKey) return;
    const delta = parseInt(adjustDelta, 10);
    if (Number.isNaN(delta) || delta === 0) {
      toast.error('عدد صحیح (غیر صفر) وارد کنید.');
      return;
    }
    handleManualAdjust(adjustTeamKey, delta);
    setAdjustTeamKey(null);
    setAdjustDelta('10');
  };

  const handleToggleTask = (teamKey: string, taskId: string) => {
    if (!isManager) return;
    setBoard((prev) => {
      const next = ensureTeamEntry(prev, teamKey);
      const entry = { ...next.teams[teamKey] };
      entry.tasks = entry.tasks.map((t) => {
        if (t.id !== taskId) return t;
        const completed = !t.completed;
        return {
          ...t,
          completed,
          completedAt: completed ? new Date().toISOString() : undefined,
        };
      });
      return { ...next, teams: { ...next.teams, [teamKey]: entry } };
    });
  };

  const rankMedal = (index: number) => {
    if (index === 0) return <Medal className="w-5 h-5 text-amber-500" />;
    if (index === 1) return <Medal className="w-5 h-5 text-zinc-400" />;
    if (index === 2) return <Medal className="w-5 h-5 text-amber-700" />;
    return (
      <span className="text-xs font-black text-zinc-500 w-5 text-center">
        {toPersianDigits(index + 1)}
      </span>
    );
  };

  if (ranked.length === 0) {
    return (
      <div className="rounded-2xl border-[1.5px] border-[#EAEAEA] dark:border-[#242F42] bg-white p-8 sm:p-12 text-center dark:border-zinc-700 dark:bg-zinc-900 space-y-3">
        <AlertCircle className="w-12 h-12 mx-auto text-amber-500 mb-2" />
        <h3 className="text-lg font-black text-zinc-900 dark:text-zinc-100">
          تیمی برای نمایش در لیدربورد نیست
        </h3>
        <p className="text-xs font-bold text-zinc-500 max-w-md mx-auto leading-relaxed">
          ابتدا تیم‌ها را تشکیل دهید و در مرحله تعریف تسک، تسک و امتیاز ثبت کنید.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border-[1.5px] border-primary-dark/30 dark:border-gray-800 bg-white dark:bg-[#151C28] shadow-[2px_2px_0_#59BBAF] dark:shadow-[2px_2px_0_#0B0F17] p-5 sm:p-7 space-y-2">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg md:text-xl font-black text-ink-darker dark:text-white flex items-center gap-2">
              <Trophy className="w-5 h-5 text-primary shrink-0" />
              <span>گام هشتم: لیدربورد امتیازات</span>
            </h2>
            <p className="text-xs md:text-sm font-medium text-gray-500 dark:text-gray-400 mt-3">
              جدول امتیازات و رتبه‌بندی نهایی تیم‌های شرکت‌کننده در رویداد را مشاهده کنید.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-xl border border-gray-200/80 dark:border-gray-800 bg-gray-50/70 dark:bg-[#1C2536]/50 px-4 py-2 text-center shadow-2xs">
              <div className="text-lg font-black text-ink-darker dark:text-white">
                {toPersianDigits(eventTotals.totalCompleted)}/{toPersianDigits(eventTotals.totalTasks)}
              </div>
              <div className="text-xs font-medium text-gray-400">تسک تکمیل‌شده (کل)</div>
            </div>
            {isManager && (
              <Button variant="outline" size="sm" onClick={() => setAdjustTeamKey(ranked[0]?.team.key || null)} className="gap-1.5 text-xs font-bold">
                <Plus className="w-3.5 h-3.5 text-primary" />
                تغییر امتیاز دستی
              </Button>
            )}
          </div>
        </div>

        {isManager && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-primary/20 bg-primary/10 text-primary text-xs font-bold shadow-2xs">
            <ShieldCheck className="w-4 h-4 text-primary" />
            <span>پنل مدیر: ± امتیاز دستی و لغو تیک تسک‌ها فعال است</span>
          </div>
        )}
      </div>

      {/* Podium top 3 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {ranked.slice(0, 3).map((row, index) => (
          <div
            key={row.team.key}
            className={`rounded-2xl border border-gray-200/80 dark:border-gray-800 p-5 text-center shadow-2xs hover:shadow-xs transition-all ${
              index === 0
                ? 'bg-amber-500/10 dark:bg-amber-950/20 border-amber-500/30'
                : index === 1
                  ? 'bg-gray-50/70 dark:bg-[#1C2536]/40'
                  : 'bg-amber-800/10 dark:bg-amber-950/15 border-amber-800/20'
            }`}
          >
            <div className="flex justify-center mb-2">{rankMedal(index)}</div>
            <h3 className="text-sm font-black text-ink-darker dark:text-white truncate">
              {row.team.label}
            </h3>
            <p className="text-3xl font-black text-primary mt-2">
              {toPersianDigits(row.score)}
            </p>
            <p className="text-xs font-medium text-gray-400 mt-1">
              {toPersianDigits(row.completed)}/{toPersianDigits(row.total)} تسک تکمیل‌شده
            </p>
          </div>
        ))}
      </div>

      {/* Full ranked table */}
      <div className="rounded-2xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-[#151C28] p-5 shadow-2xs space-y-4">
        <div className="flex items-center gap-2 mb-1 px-1">
          <Users className="w-4 h-4 text-primary" />
          <h3 className="text-xs font-bold text-ink-darker dark:text-white">
            رتبه‌بندی کامل تیم‌ها ({toPersianDigits(ranked.length)})
          </h3>
        </div>

        <ul className="space-y-2">
          {ranked.map((row, index) => (
            <li
              key={row.team.key}
              className={`flex flex-wrap items-center gap-3 rounded-xl border p-3 transition-all ${
                index === 0
                  ? 'border-amber-500/30 bg-amber-500/10 dark:bg-amber-950/20'
                  : 'border-gray-200/80 dark:border-gray-800 bg-gray-50/70 dark:bg-[#1C2536]/40 shadow-2xs'
              }`}
            >
              <div className="w-8 flex justify-center">{rankMedal(index)}</div>

              <div className="flex-1 min-w-[140px]">
                <div className="text-xs font-bold text-ink-darker dark:text-white truncate">
                  {row.team.label}
                </div>
                <div className="text-xs font-medium text-gray-400">
                  {toPersianDigits(row.completed)}/{toPersianDigits(row.total)} تسک تکمیل‌شده
                  {row.entry && Number(row.entry.manualAdjustment) !== 0 && (
                    <span className="mr-1 text-primary">
                      (دستی:{' '}
                      {Number(row.entry.manualAdjustment) > 0 ? '+' : ''}
                      {toPersianDigits(Number(row.entry.manualAdjustment))})
                    </span>
                  )}
                </div>
              </div>

              <span className="px-2.5 py-1 rounded-lg border border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-bold shadow-2xs">
                {toPersianDigits(row.score)} امتیاز
              </span>

              {isManager && (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleManualAdjust(row.team.key, 1)}
                    className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors"
                    title="یک واحد افزایش"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleManualAdjust(row.team.key, -1)}
                    className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                    title="یک واحد کاهش"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAdjustTeamKey(row.team.key);
                      setAdjustDelta('10');
                    }}
                    className="px-2 py-1 rounded-lg border border-primary/20 bg-primary/10 text-primary text-[10px] font-bold hover:bg-primary/20 transition-colors"
                    title="تغییر امتیاز با عدد دلخواه"
                  >
                    ± عدد
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setManageTeamKey(manageTeamKey === row.team.key ? null : row.team.key)
                    }
                    className="px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-[10px] font-bold hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                  >
                    تسک‌ها
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>

      {/* Manual adjust modal */}
      <Modal
        isOpen={!!adjustTeamKey}
        onClose={() => setAdjustTeamKey(null)}
        title="تغییر امتیاز دستی"
        description={adjustTeam ? `تیم: ${adjustTeam.team.label}` : undefined}
        maxWidth="sm"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-ink-darker dark:text-white mb-1.5">
              مقدار (مثبت = افزایش، منفی = کاهش)
            </label>
            <input
              type="number"
              value={adjustDelta}
              onChange={(e) => setAdjustDelta(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#151C28] text-sm font-medium focus:border-primary focus:outline-none transition-all text-center"
              autoFocus
            />
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
            <Button variant="outline" size="md" onClick={() => setAdjustTeamKey(null)} className="text-xs font-bold">
              انصراف
            </Button>
            <Button variant="primary" size="md" onClick={handleApplyAdjustForm} className="text-xs font-bold">
              اعمال
            </Button>
          </div>
        </div>
      </Modal>

      {/* Manage team tasks modal — untick confirmed tasks */}
      <Modal
        isOpen={!!manageTeamKey && !!manageTeam}
        onClose={() => setManageTeamKey(null)}
        title="مدیریت تسک‌های تیم"
        description={manageTeam ? manageTeam.team.label : undefined}
        maxWidth="lg"
      >
        {manageTeam && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-ink-darker dark:text-white">
              <span>
                امتیاز فعلی: {toPersianDigits(manageTeam.score)}
              </span>
              <span>
                {toPersianDigits(manageTeam.completed)}/{toPersianDigits(manageTeam.total)}{' '}
                تکمیل‌شده
              </span>
            </div>

            {(manageTeam.entry?.tasks.length || 0) === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-200 dark:border-gray-700 p-6 text-center text-xs font-medium text-gray-400">
                برای این تیم تسکی ثبت نشده است.
              </div>
            ) : (
              <ul className="space-y-2 max-h-[360px] overflow-y-auto pl-1">
                {manageTeam.entry?.tasks.map((task) => (
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
                      onClick={() => handleToggleTask(manageTeam.team.key, task.id)}
                      className={`w-7 h-7 rounded-lg border flex items-center justify-center transition-all ${
                        task.completed
                          ? 'border-emerald-500 bg-emerald-500 text-white'
                          : 'border-gray-300 bg-white text-gray-300 dark:bg-[#1C2536] dark:border-gray-600'
                      }`}
                      title={
                        task.completed
                          ? 'برداشتن تیک (حذف امتیاز این تسک)'
                          : 'زدن تیک (اعطای امتیاز)'
                      }
                    >
                      {task.completed ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : (
                        <Circle className="w-4 h-4" />
                      )}
                    </button>
                    <span className="flex-1 text-xs font-bold text-ink-darker dark:text-white">
                      {task.title}
                    </span>
                    <span className="px-2 py-0.5 rounded-lg border border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[11px] font-bold">
                      {toPersianDigits(task.points)} امتیاز
                    </span>
                  </li>
                ))}
              </ul>
            )}

            <div className="flex justify-end pt-2 border-t border-gray-100 dark:border-gray-800">
              <Button variant="outline" size="md" onClick={() => setManageTeamKey(null)} className="text-xs font-bold">
                بستن
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
