import React from 'react';
import { Building2 } from 'lucide-react';
import { Badge } from '../../../../../components/ui/Badge';
import { ScheduleBannerSkeleton } from './ScheduleSkeletons';

interface ScheduleClassroomBannerProps {
  isLoading: boolean;
  selectedClassroom: any;
  schedulesCount: number;
}

export const ScheduleClassroomBanner: React.FC<ScheduleClassroomBannerProps> = ({
  isLoading,
  selectedClassroom,
  schedulesCount,
}) => {
  if (isLoading) {
    return <ScheduleBannerSkeleton />;
  }

  if (!selectedClassroom) return null;

  return (
    <div className="bg-white dark:bg-[#151C28] bg-gradient-to-l from-primary/10 via-primary/5 to-transparent dark:from-primary/20 dark:via-transparent dark:to-transparent p-4 rounded-xl border border-primary/20 dark:border-[#242F42] flex flex-wrap items-center justify-between gap-4 animate-in fade-in duration-200">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center space-x-1.5 space-x-reverse text-ink-darker dark:text-white font-bold text-base">
          <Building2 className="h-5 w-5 text-primary" />
          <span>
            {selectedClassroom.field?.name
              ? `${selectedClassroom.field.name} - ${selectedClassroom.roomNumber || selectedClassroom.code || selectedClassroom.name}`
              : selectedClassroom.name}
          </span>
        </div>
        {selectedClassroom.level?.name && (
          <Badge variant="default">
            {selectedClassroom.level.name.includes('پایه')
              ? selectedClassroom.level.name
              : `پایه ${selectedClassroom.level.name}`}
          </Badge>
        )}
      </div>

      <div className="flex items-center gap-3 text-xs font-medium text-gray-600 dark:text-gray-300">
        <span>ساعات تکمیل‌شده:</span>
        <span className="font-bold text-primary text-sm font-mono bg-white dark:bg-[#151C28] px-2 py-0.5 rounded border border-primary/30">
          {schedulesCount} از ۳۶ ساعت هفتگی
        </span>
      </div>
    </div>
  );
};
