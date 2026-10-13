import React from 'react';
import { CalendarDays, GraduationCap, Lock, Building2, FileDown } from 'lucide-react';
import { ResponsivePageHeader } from '../../../../../components/ui/ResponsivePageHeader';
import { ScheduleHeaderSkeleton } from './ScheduleSkeletons';

interface ScheduleHeaderProps {
  isLoading: boolean;
  isStudent: boolean;
  isParent: boolean;
  canManageSchedule: boolean;
  currentUser: any;
  classrooms: any[];
  selectedClassroomId: string;
  selectedClassroom: any;
  onSelectClassroom: (id: string) => void;
  onDownloadPdf: () => void;
}

export const ScheduleHeader: React.FC<ScheduleHeaderProps> = ({
  isLoading,
  isStudent,
  isParent,
  canManageSchedule,
  currentUser,
  classrooms,
  selectedClassroomId,
  selectedClassroom,
  onSelectClassroom,
  onDownloadPdf,
}) => {
  if (isLoading && classrooms.length === 0) {
    return <ScheduleHeaderSkeleton />;
  }

  return (
    <ResponsivePageHeader
      icon={CalendarDays}
      title="برنامه هفتگی"
      badge={
        isStudent ? (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20 text-[11px] font-bold">
            <GraduationCap className="h-3.5 w-3.5" />
            <span>
              دانش‌آموز: {currentUser?.firstName} {currentUser?.lastName}
            </span>
          </span>
        ) : !canManageSchedule ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 text-[11px] font-semibold">
            <Lock className="h-3 w-3 text-amber-600" />
            <span>حالت فقط مشاهده {isParent ? '(اولیاء)' : ''}</span>
          </span>
        ) : null
      }
      actions={
        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
          {isStudent ? (
            selectedClassroom ? (
              <div className="flex items-center gap-1.5 bg-primary/10 border border-primary/20 text-primary px-3 py-1.5 rounded-xl text-xs font-bold h-9">
                <Building2 className="h-4 w-4 text-primary" />
                <span>کلاس شما: {selectedClassroom.name}</span>
              </div>
            ) : null
          ) : isParent && classrooms.length <= 1 ? (
            selectedClassroom ? (
              <div className="flex items-center gap-1.5 bg-primary/10 border border-primary/20 text-primary px-3 py-1.5 rounded-xl text-xs font-bold h-9">
                <Building2 className="h-4 w-4 text-primary" />
                <span>کلاس فرزند شما: {selectedClassroom.name}</span>
              </div>
            ) : null
          ) : classrooms.length > 0 ? (
            <div className="flex items-center gap-2 flex-1 sm:flex-initial">
              <label className="text-xs font-bold text-ink-dark dark:text-gray-300 whitespace-nowrap shrink-0">
                {isParent ? 'کلاس فرزند:' : 'کلاس:'}
              </label>
              <select
                value={selectedClassroomId}
                onChange={(e) => onSelectClassroom(e.target.value)}
                className="h-9 w-full sm:w-72 md:w-80 rounded-xl border border-gray-300 bg-white dark:bg-[#151C28] dark:border-[#242F42] px-3.5 text-xs sm:text-sm font-bold text-ink-dark dark:text-white focus:outline-none focus:ring-2 focus:ring-primary shadow-2xs cursor-pointer text-right"
              >
                {classrooms.map((c) => {
                  const fieldName = c.field?.name || '';
                  const levelName = c.level?.name
                    ? c.level.name.includes('پایه')
                      ? c.level.name
                      : `پایه ${c.level.name}`
                    : '';
                  const classCode = c.roomNumber || c.code || c.name;
                  const parts = [fieldName, levelName].filter(Boolean).join(' - ');
                  return (
                    <option key={c.id} value={c.id}>
                      {parts ? `${parts} (${classCode})` : classCode}
                    </option>
                  );
                })}
              </select>
            </div>
          ) : null}

          {classrooms.length > 0 && (
            <button
              type="button"
              onClick={onDownloadPdf}
              className="w-9 h-9 rounded-xl bg-primary hover:bg-primary/90 text-white flex items-center justify-center transition-all shadow-xs cursor-pointer shrink-0 active:scale-95 border border-primary/20"
              title="دانلود PDF برنامه هفتگی"
              aria-label="دانلود PDF"
            >
              <FileDown className="h-4 w-4 text-white" />
            </button>
          )}
        </div>
      }
    />
  );
};
