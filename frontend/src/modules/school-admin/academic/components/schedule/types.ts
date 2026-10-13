export const getLessonTypeInfo = (type?: string) => {
  switch (type) {
    case 'NON_TECHNICAL_COMPETENCY':
      return {
        label: 'شایستگی‌های غیرفنی (پودمانی)',
        className: 'text-purple-700 bg-purple-50 border border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800',
      };
    case 'BASIC_COMPETENCY':
      return {
        label: 'شایستگی‌های پایه (پودمانی)',
        className: 'text-indigo-700 bg-indigo-50 border border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800',
      };
    case 'TECHNICAL_MODULAR_COMPETENCY':
      return {
        label: 'شایستگی‌های فنی / پودمانی',
        className: 'text-purple-800 bg-purple-100 border border-purple-300 dark:bg-purple-900/50 dark:text-purple-200 dark:border-purple-700',
      };
    case 'TECHNICAL_PRACTICAL_COMPETENCY':
      return {
        label: 'شایستگی‌های فنی / عملی',
        className: 'text-amber-700 bg-amber-50 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
      };
    case 'SPECIALIZED':
      return {
        label: 'تخصصی',
        className: 'text-blue-700 bg-blue-50 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800',
      };
    case 'PRACTICAL':
      return {
        label: 'کارگاهی',
        className: 'text-teal-700 bg-teal-50 border border-teal-200 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-800',
      };
    case 'OPTIONAL':
      return {
        label: 'انتخابی',
        className: 'text-gray-700 bg-gray-100 border border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700',
      };
    case 'GENERAL':
    default:
      return {
        label: 'عمومی',
        className: 'text-emerald-700 bg-emerald-50 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
      };
  }
};

export interface ScheduleFormState {
  scheduleId: string;
  dayOfWeek: string;
  periodNumber: number;
  lessonId: string;
  teacherId: string;
  isSplitPeriod: boolean;
  secondLessonId: string;
  secondTeacherId: string;
  startTime: string;
  endTime: string;
  allowTeacherConflict: boolean;
}
