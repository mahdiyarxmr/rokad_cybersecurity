import React from 'react';
import { Skeleton } from '../../../../../components/ui/Skeleton';
import { DAYS } from '../../../../student-parent/schedule/StudentSchedulePage';
import { OFFICIAL_PERIODS } from '../../../../../lib/constants/periods';

export const ScheduleHeaderSkeleton: React.FC = () => {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-white dark:bg-[#151C28] p-3.5 sm:p-4 md:p-5 rounded-2xl border border-gray-200/80 dark:border-[#242F42] shadow-xs">
      <div className="flex items-center gap-3">
        <Skeleton className="w-10 h-10 rounded-xl" />
        <Skeleton className="h-6 w-48 rounded-lg" />
      </div>
      <div className="flex items-center gap-2">
        <Skeleton className="h-9 w-60 rounded-xl" />
        <Skeleton className="w-9 h-9 rounded-xl" />
      </div>
    </div>
  );
};

export const ScheduleBannerSkeleton: React.FC = () => {
  return (
    <div className="bg-white dark:bg-[#151C28] p-4 rounded-xl border border-gray-200 dark:border-[#242F42] flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <Skeleton className="h-5 w-40 rounded-lg" />
        <Skeleton className="h-5 w-20 rounded-md" />
      </div>
      <Skeleton className="h-6 w-32 rounded-md" />
    </div>
  );
};

export const ScheduleGridSkeleton: React.FC = () => {
  return (
    <div className="hidden md:block overflow-x-auto rounded-2xl border border-gray-200 dark:border-[#242F42] bg-white dark:bg-[#151C28] shadow-xs animate-in fade-in duration-200">
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-gray-50/80 dark:bg-[#1C2536] border-b border-gray-200 dark:border-[#242F42]">
            <th className="p-3 border-l border-gray-200 dark:border-[#242F42] w-28 text-center">
              <Skeleton className="h-4 w-16 mx-auto rounded" />
            </th>
            {OFFICIAL_PERIODS.map((p) => (
              <th key={p.number} className="p-3 border-l border-gray-200 dark:border-[#242F42] last:border-l-0">
                <Skeleton className="h-4 w-14 mx-auto rounded" />
                <Skeleton className="h-2.5 w-16 mx-auto mt-1.5 rounded" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {DAYS.map((day) => (
            <tr key={day.key} className="border-b border-gray-100 dark:border-[#242F42] last:border-b-0">
              <td className="p-3 bg-gray-50/60 dark:bg-[#1C2536]/60 border-l border-gray-200 dark:border-[#242F42] text-center">
                <Skeleton className="h-6 w-14 mx-auto rounded-md" />
              </td>
              {OFFICIAL_PERIODS.map((p) => (
                <td key={p.number} className="p-2 border-l border-gray-200 dark:border-[#242F42] last:border-l-0 min-w-[155px]">
                  <Skeleton className="h-28 w-full rounded-xl" />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export const ScheduleMobileSkeleton: React.FC = () => {
  return (
    <div className="block md:hidden space-y-3.5 animate-in fade-in duration-200">
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Skeleton key={i} className="h-8 w-20 rounded-xl shrink-0" />
        ))}
      </div>
      <div className="space-y-2.5">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Skeleton key={i} className="h-24 w-full rounded-2xl" />
        ))}
      </div>
    </div>
  );
};
