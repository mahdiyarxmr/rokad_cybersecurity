import React from 'react';
import { Layers, Clock, Edit2, Trash2, Plus } from 'lucide-react';
import { toPersianDigits } from '../../../../../utils/jalali';
import { PeriodDefinition } from '../../../../../lib/constants/periods';
import { DAYS } from '../../../../student-parent/schedule/StudentSchedulePage';
import { getLessonTypeInfo } from './types';
import { ScheduleGridSkeleton } from './ScheduleSkeletons';

interface ScheduleDesktopGridProps {
  isLoading: boolean;
  schedules: any[];
  periods: PeriodDefinition[];
  canManageSchedule: boolean;
  onOpenSlotModal: (day: string, periodNumber: number, slot?: any) => void;
  onDeleteSlot: (id: string, e: React.MouseEvent) => void;
}

export const ScheduleDesktopGrid: React.FC<ScheduleDesktopGridProps> = ({
  isLoading,
  schedules,
  periods,
  canManageSchedule,
  onOpenSlotModal,
  onDeleteSlot,
}) => {
  if (isLoading) {
    return <ScheduleGridSkeleton />;
  }

  return (
    <div className="hidden md:block overflow-x-auto rounded-2xl border border-gray-200 dark:border-[#242F42] bg-white dark:bg-[#151C28] shadow-xs animate-in fade-in duration-200">
      <table className="w-full border-collapse text-right">
        <thead>
          <tr className="bg-gray-50/80 dark:bg-[#1C2536] border-b border-gray-200 dark:border-[#242F42]">
            <th className="p-3 text-xs font-bold text-ink-dark dark:text-gray-300 border-l border-gray-200 dark:border-[#242F42] w-28 text-center">
              روز / زنگ
            </th>
            {periods.map((period) => (
              <th
                key={period.number}
                className={`p-3 text-center border-l border-gray-200 dark:border-[#242F42] last:border-l-0 ${
                  period.isExtracurricular ? 'bg-purple-50/80 dark:bg-purple-950/30 border-b-2 border-b-purple-400' : ''
                }`}
              >
                <div className="flex items-center justify-center gap-1">
                  <span className="font-bold text-xs text-ink-darker dark:text-white">{period.label}</span>
                </div>
                <div className="font-mono text-[10px] text-gray-500 dark:text-gray-400 mt-0.5 dir-ltr">
                  {toPersianDigits(period.defaultStart)} - {toPersianDigits(period.defaultEnd)}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {DAYS.map((day) => (
            <tr
              key={day.key}
              className="border-b border-gray-100 dark:border-[#242F42] last:border-b-0 hover:bg-gray-50/40 dark:hover:bg-[#1C2536]/40 transition-colors"
            >
              {/* Day Header Column */}
              <td className="p-3 bg-gray-50/60 dark:bg-[#1C2536]/60 font-bold text-xs text-ink-dark dark:text-gray-200 border-l border-gray-200 dark:border-[#242F42] text-center">
                <span className="inline-block py-1 px-2 rounded-md bg-white dark:bg-[#151C28] border border-gray-200 dark:border-[#242F42] shadow-2xs">
                  {day.label}
                </span>
              </td>

              {/* 6 Periods */}
              {periods.map((period) => {
                const item = schedules.find(
                  (s) => s.dayOfWeek === day.key && s.periodNumber === period.number,
                );

                return (
                  <td
                    key={period.number}
                    className={`p-2 border-l border-gray-200 dark:border-[#242F42] last:border-l-0 align-top min-w-[155px] max-w-[190px] ${
                      period.isExtracurricular ? 'bg-purple-50/20 dark:bg-purple-950/20' : ''
                    }`}
                  >
                    {item ? (
                      /* Filled Slot Card */
                      <div
                        onClick={() => {
                          if (canManageSchedule) {
                            onOpenSlotModal(day.key, period.number, item);
                          }
                        }}
                        className={`group relative ${
                          item.isSplitPeriod ? 'min-h-[145px]' : 'h-28'
                        } rounded-xl p-2.5 bg-white dark:bg-[#151C28] border border-primary/30 dark:border-[#242F42] flex flex-col justify-between transition-all ${
                          canManageSchedule
                            ? 'cursor-pointer hover:border-primary hover:shadow-md'
                            : 'cursor-default shadow-2xs'
                        }`}
                      >
                        {item.isSplitPeriod ? (
                          <div className="space-y-1.5 flex-1">
                            {/* Header Badge */}
                            <div className="flex items-center justify-between gap-1 pb-1 border-b border-gray-100 dark:border-[#242F42]">
                              <span className="inline-flex items-center gap-1 text-[9px] font-extrabold text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                                <Layers className="h-2.5 w-2.5" />
                                یک هفته در میان
                              </span>
                              <span className="font-mono text-[9px] text-gray-400 dir-ltr">
                                {item.startTime} - {item.endTime}
                              </span>
                            </div>

                            {(() => {
                              const type1 = getLessonTypeInfo(item.lesson?.type);
                              const type2 = getLessonTypeInfo(item.secondLesson?.type);
                              return (
                                <>
                                  {/* Split Half 1 - Week 1 */}
                                  <div className="bg-primary/5 dark:bg-primary-950/20 rounded-lg p-1.5 border border-primary/15 dark:border-primary/30 space-y-1">
                                    <div className="flex items-center justify-between text-[10px]">
                                      <span className="font-extrabold text-ink-darker dark:text-white truncate">
                                        {item.lesson?.name}
                                      </span>
                                      <span className="text-[8px] bg-white dark:bg-[#151C28] text-primary px-1 rounded font-bold border border-primary/20 shrink-0">
                                        هفته فرد
                                      </span>
                                    </div>
                                    <div>
                                      <span className={`text-[8.5px] px-1 py-0.2 rounded font-medium ${type1.className}`}>
                                        {type1.label}
                                      </span>
                                    </div>
                                  </div>

                                  {/* Split Half 2 - Week 2 */}
                                  <div className={`rounded-lg p-1.5 border space-y-1 ${
                                    item.secondLesson
                                      ? 'bg-primary/5 dark:bg-primary-950/20 border-primary/15 dark:border-primary/30'
                                      : 'bg-gray-50 dark:bg-[#151C28]/60 border-dashed border-gray-200 dark:border-gray-700 opacity-80'
                                  }`}>
                                    <div className="flex items-center justify-between text-[10px]">
                                      <span className={`font-extrabold truncate ${item.secondLesson ? 'text-ink-darker dark:text-white' : 'text-gray-400 dark:text-gray-500 font-medium'}`}>
                                        {item.secondLesson?.name || 'بدون کلاس'}
                                      </span>
                                      <span className="text-[8px] bg-white dark:bg-[#151C28] text-primary px-1 rounded font-bold border border-primary/20 shrink-0">
                                        هفته زوج
                                      </span>
                                    </div>
                                    {item.secondLesson && (
                                      <div>
                                        <span className={`text-[8.5px] px-1 py-0.2 rounded font-medium ${type2.className}`}>
                                          {type2.label}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                </>
                              );
                            })()}
                          </div>
                        ) : (
                          <div className="space-y-1.5">
                            <div className="flex items-start justify-between gap-1">
                              <span className="font-bold text-xs text-ink-darker dark:text-white line-clamp-1">
                                {item.lesson?.name}
                              </span>
                            </div>
                            {(() => {
                              const typeInfo = getLessonTypeInfo(item.lesson?.type);
                              return (
                                <span
                                  className={`inline-block text-[9px] px-1.5 py-0.5 rounded-md font-medium ${typeInfo.className}`}
                                >
                                  {typeInfo.label}
                                </span>
                              );
                            })()}
                          </div>
                        )}

                        <div className="flex items-center justify-between pt-1 border-t border-gray-100 dark:border-[#242F42] mt-1">
                          {!item.isSplitPeriod ? (
                            <span className="font-mono text-[10px] text-gray-400 flex items-center gap-1 dir-ltr">
                              <Clock className="h-2.5 w-2.5" />
                              {item.startTime} - {item.endTime}
                            </span>
                          ) : (
                            <span className="text-[9px] text-gray-400 font-medium">
                              ترتیب: هفته فرد ⬅ هفته زوج
                            </span>
                          )}

                          {/* Quick Action Buttons on Hover */}
                          {canManageSchedule && (
                            <div className="flex items-center space-x-1 space-x-reverse opacity-0 group-hover:opacity-100 transition-opacity print:hidden">
                              <button
                                type="button"
                                title="ویرایش"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onOpenSlotModal(day.key, period.number, item);
                                }}
                                className="p-1 rounded hover:bg-gray-100 dark:hover:bg-[#1C2536] text-gray-500 hover:text-primary cursor-pointer"
                              >
                                <Edit2 className="h-3 w-3" />
                              </button>
                              <button
                                type="button"
                                title="حذف ساعت درسی"
                                onClick={(e) => onDeleteSlot(item.id, e)}
                                className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-950/40 text-gray-400 hover:text-red-600 cursor-pointer"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : canManageSchedule ? (
                      /* Empty Slot Box (Clickable to Assign - Admins/Staff only) */
                      <button
                        type="button"
                        onClick={() => onOpenSlotModal(day.key, period.number)}
                        className="w-full h-28 rounded-lg border-2 border-dashed border-gray-200 dark:border-[#242F42] hover:border-primary/60 hover:bg-primary-50/20 dark:hover:bg-primary-950/20 transition-all flex flex-col items-center justify-center p-2 text-gray-400 hover:text-primary group print:border-gray-100 cursor-pointer"
                      >
                        <div className="h-7 w-7 rounded-full bg-gray-50 dark:bg-[#1C2536] group-hover:bg-primary/10 flex items-center justify-center transition-colors mb-1">
                          <Plus className="h-4 w-4" />
                        </div>
                        <span className="text-[11px] font-bold">تخصیص درس</span>
                        <span className="font-mono text-[9px] text-gray-400 mt-0.5 dir-ltr">
                          {period.defaultStart} - {period.defaultEnd}
                        </span>
                      </button>
                    ) : (
                      /* Empty Slot Box (Read-Only for Students / Non-Staff) */
                      <div className="w-full h-28 rounded-lg border border-dashed border-gray-200 dark:border-[#242F42] bg-gray-50/40 dark:bg-[#1C2536]/40 flex flex-col items-center justify-center p-2 text-gray-400 select-none print:border-gray-100">
                        <span className="text-base font-bold text-gray-300 dark:text-gray-600">—</span>
                        <span className="text-[10px] text-gray-400 mt-0.5">فاقد درس</span>
                        <span className="font-mono text-[9px] text-gray-400 mt-1 dir-ltr">
                          {period.defaultStart} - {period.defaultEnd}
                        </span>
                      </div>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
