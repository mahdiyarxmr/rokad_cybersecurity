import React from 'react';
import { Layers, GraduationCap, Edit2, Trash2, Plus } from 'lucide-react';
import { toPersianDigits } from '../../../../../utils/jalali';
import { PeriodDefinition } from '../../../../../lib/constants/periods';
import { DAYS } from '../../../../student-parent/schedule/StudentSchedulePage';
import { getLessonTypeInfo } from './types';
import { ScheduleMobileSkeleton } from './ScheduleSkeletons';

interface ScheduleMobileViewProps {
  isLoading: boolean;
  schedules: any[];
  periods: PeriodDefinition[];
  mobileSelectedDay: string;
  onSelectDay: (day: string) => void;
  canManageSchedule: boolean;
  onOpenSlotModal: (day: string, periodNumber: number, slot?: any) => void;
  onDeleteSlot: (id: string, e: React.MouseEvent) => void;
}

export const ScheduleMobileView: React.FC<ScheduleMobileViewProps> = ({
  isLoading,
  schedules,
  periods,
  mobileSelectedDay,
  onSelectDay,
  canManageSchedule,
  onOpenSlotModal,
  onDeleteSlot,
}) => {
  if (isLoading) {
    return <ScheduleMobileSkeleton />;
  }

  return (
    <div className="block md:hidden space-y-3.5 print:hidden">
      {/* Day Pills Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 touch-pan-x scrollbar-none">
        {DAYS.map((d) => {
          const dayCount = schedules.filter((s) => s.dayOfWeek === d.key).length;
          const isSelected = mobileSelectedDay === d.key;
          return (
            <button
              key={d.key}
              type="button"
              onClick={() => onSelectDay(d.key)}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
                isSelected
                  ? 'bg-primary text-white shadow-xs'
                  : 'bg-white dark:bg-[#151C28] text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-[#242F42] hover:bg-gray-50 dark:hover:bg-[#1C2536]'
              }`}
            >
              <span>{d.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold ${
                  isSelected
                    ? 'bg-white/20 text-white'
                    : 'bg-gray-100 dark:bg-[#1C2536] text-gray-500 dark:text-gray-400'
                }`}
              >
                {dayCount}/۶
              </span>
            </button>
          );
        })}
      </div>

      {/* 6 Periods for Active Day */}
      <div className="space-y-2.5">
        {periods.map((period) => {
          const item = schedules.find(
            (s) => s.dayOfWeek === mobileSelectedDay && s.periodNumber === period.number,
          );

          return (
            <div
              key={period.number}
              className="bg-white dark:bg-[#151C28] rounded-2xl border border-gray-200 dark:border-[#242F42] p-3.5 shadow-xs transition-all"
            >
              <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-[#242F42] mb-2.5">
                <div className="flex items-center gap-2">
                  <span
                    className={`h-6 w-6 rounded-lg ${
                      period.isExtracurricular
                        ? 'bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300'
                        : 'bg-primary/10 text-primary'
                    } flex items-center justify-center text-xs font-bold font-mono`}
                  >
                    {period.number}
                  </span>
                  <span className="text-xs font-bold text-ink-darker dark:text-white">
                    {period.label}
                  </span>
                </div>
                <span className="font-mono text-[10px] text-gray-500 dark:text-gray-400 dir-ltr bg-gray-50 dark:bg-[#1C2536] px-2 py-0.5 rounded-md border border-gray-100 dark:border-[#242F42]">
                  {item
                    ? `${toPersianDigits(item.startTime)} - ${toPersianDigits(item.endTime)}`
                    : `${toPersianDigits(period.defaultStart)} - ${toPersianDigits(period.defaultEnd)}`}
                </span>
              </div>

              {item ? (
                item.isSplitPeriod ? (
                  <div className="w-full space-y-2.5">
                    {/* Header: Alternating Week Badge & Action Buttons Aligned */}
                    <div className="flex items-center justify-between gap-2 pb-0.5">
                      <span className="text-[10px] bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-md font-bold flex items-center gap-1">
                        <Layers className="h-3 w-3" />
                        یک هفته در میان
                      </span>

                      {canManageSchedule && (
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => onOpenSlotModal(mobileSelectedDay, period.number, item)}
                            className="p-1.5 rounded-lg text-gray-500 hover:text-primary hover:bg-gray-100 dark:hover:bg-[#1C2536] transition-colors cursor-pointer"
                            title="ویرایش"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => onDeleteSlot(item.id, e)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                            title="حذف"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Full Width Cards for Week 1 and Week 2 */}
                    {(() => {
                      const type1 = getLessonTypeInfo(item.lesson?.type);
                      const type2 = getLessonTypeInfo(item.secondLesson?.type);
                      return (
                        <div className="space-y-2.5 w-full">
                          {/* Week 1 */}
                          <div className="w-full bg-primary-50/20 dark:bg-primary-950/30 p-3 rounded-xl border border-primary/20 dark:border-primary/30 space-y-1.5">
                            <div className="flex items-center justify-between gap-1 flex-wrap">
                              <span className="font-extrabold text-xs text-ink-darker dark:text-white truncate">
                                ۱. {item.lesson?.name}
                              </span>
                              <div className="flex items-center gap-1">
                                <span
                                  className={`text-[9px] px-1.5 py-0.5 rounded-md font-bold ${type1.className}`}
                                >
                                  {type1.label}
                                </span>
                                <span className="text-[9px] px-1.5 py-0.5 rounded font-bold bg-white dark:bg-[#151C28] text-primary border border-primary/20 shrink-0">
                                  هفته فرد
                                </span>
                              </div>
                            </div>
                            {item.teacher?.user && (
                              <div className="flex items-center gap-1 text-[11px] text-muted-foreground dark:text-slate-400 font-bold">
                                <GraduationCap className="h-3.5 w-3.5 text-primary shrink-0" />
                                <span>
                                  استاد: {item.teacher.user.firstName} {item.teacher.user.lastName}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Week 2 */}
                          <div className={`w-full p-3 rounded-xl border space-y-1.5 ${
                            item.secondLesson
                              ? 'bg-primary-50/20 dark:bg-primary-950/30 border-primary/20 dark:border-primary/30'
                              : 'bg-gray-50/70 dark:bg-[#151C28]/60 border-dashed border-gray-200 dark:border-gray-700 opacity-80'
                          }`}>
                            <div className="flex items-center justify-between gap-1 flex-wrap">
                              <span className={`font-extrabold text-xs truncate ${item.secondLesson ? 'text-ink-darker dark:text-white' : 'text-gray-400 dark:text-gray-500 font-medium'}`}>
                                ۲. {item.secondLesson?.name || 'بدون کلاس'}
                              </span>
                              <div className="flex items-center gap-1">
                                {item.secondLesson && (
                                  <span
                                    className={`text-[9px] px-1.5 py-0.5 rounded-md font-bold ${type2.className}`}
                                  >
                                    {type2.label}
                                  </span>
                                )}
                                <span className="text-[9px] px-1.5 py-0.5 rounded font-bold bg-white dark:bg-[#151C28] text-primary border border-primary/20 shrink-0">
                                  هفته زوج
                                </span>
                              </div>
                            </div>
                            {item.secondTeacher?.user && (
                              <div className="flex items-center gap-1 text-[11px] text-muted-foreground dark:text-slate-400 font-bold">
                                <GraduationCap className="h-3.5 w-3.5 text-primary shrink-0" />
                                <span>
                                  استاد: {item.secondTeacher.user.firstName}{' '}
                                  {item.secondTeacher.user.lastName}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-3 w-full">
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-xs sm:text-sm text-ink-darker dark:text-white">
                          {item.lesson?.name}
                        </span>
                        {(() => {
                          const typeInfo = getLessonTypeInfo(item.lesson?.type);
                          return (
                            <span
                              className={`text-[9.5px] px-1.5 py-0.5 rounded-md font-semibold shrink-0 ${typeInfo.className}`}
                            >
                              {typeInfo.label}
                            </span>
                          );
                        })()}
                      </div>
                      {item.teacher?.user && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground dark:text-slate-400 font-bold">
                          <GraduationCap className="h-3.5 w-3.5 text-primary shrink-0" />
                          <span>
                            استاد: {item.teacher.user.firstName} {item.teacher.user.lastName}
                          </span>
                        </div>
                      )}
                    </div>

                    {canManageSchedule && (
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => onOpenSlotModal(mobileSelectedDay, period.number, item)}
                          className="p-1.5 rounded-lg text-gray-500 hover:text-primary hover:bg-gray-100 dark:hover:bg-[#1C2536] transition-colors cursor-pointer"
                          title="ویرایش"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => onDeleteSlot(item.id, e)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                          title="حذف"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>
                )
              ) : canManageSchedule ? (
                <button
                  type="button"
                  onClick={() => onOpenSlotModal(mobileSelectedDay, period.number)}
                  className="w-full py-2.5 rounded-xl border border-dashed border-primary/40 bg-primary-50/10 dark:bg-primary-950/20 hover:bg-primary-50/30 text-primary flex items-center justify-center gap-1.5 text-xs font-bold transition-colors cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                  <span>تخصیص درس</span>
                </button>
              ) : (
                <div className="py-2 text-center text-xs text-gray-400 dark:text-gray-500 bg-gray-50/50 dark:bg-[#1C2536]/40 rounded-xl border border-dashed border-gray-100 dark:border-[#242F42]">
                  فاقد درس
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
