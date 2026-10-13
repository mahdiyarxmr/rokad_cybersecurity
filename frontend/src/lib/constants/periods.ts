export interface PeriodDefinition {
  number: number;
  label: string;
  shortLabel: string;
  defaultStart: string;
  defaultEnd: string;
  isExtracurricular: boolean;
  typeLabel: string;
}

export const OFFICIAL_PERIODS: PeriodDefinition[] = [
  {
    number: 1,
    label: 'زنگ اول',
    shortLabel: 'زنگ ۱',
    defaultStart: '07:30',
    defaultEnd: '09:00',
    isExtracurricular: false,
    typeLabel: 'برنامه مصوب',
  },
  {
    number: 2,
    label: 'زنگ دوم',
    shortLabel: 'زنگ ۲',
    defaultStart: '09:20',
    defaultEnd: '10:40',
    isExtracurricular: false,
    typeLabel: 'برنامه مصوب',
  },
  {
    number: 3,
    label: 'زنگ سوم',
    shortLabel: 'زنگ ۳',
    defaultStart: '11:00',
    defaultEnd: '12:10',
    isExtracurricular: false,
    typeLabel: 'برنامه مصوب',
  },
  {
    number: 4,
    label: 'زنگ چهارم',
    shortLabel: 'زنگ ۴',
    defaultStart: '12:30',
    defaultEnd: '13:50',
    isExtracurricular: false,
    typeLabel: 'برنامه مصوب',
  },
  {
    number: 5,
    label: 'زنگ پنجم',
    shortLabel: 'زنگ ۵',
    defaultStart: '14:30',
    defaultEnd: '15:50',
    isExtracurricular: true,
    typeLabel: 'فوق برنامه',
  },
  {
    number: 6,
    label: 'زنگ ششم',
    shortLabel: 'زنگ ۶',
    defaultStart: '16:00',
    defaultEnd: '17:20',
    isExtracurricular: true,
    typeLabel: 'فوق برنامه',
  },
];

export const PERIOD_LABELS: Record<number, string> = {
  1: 'زنگ اول',
  2: 'زنگ دوم',
  3: 'زنگ سوم',
  4: 'زنگ چهارم',
  5: 'زنگ پنجم',
  6: 'زنگ ششم',
};

export const PERIOD_SHORT_LABELS: Record<number, string> = {
  1: 'زنگ ۱',
  2: 'زنگ ۲',
  3: 'زنگ ۳',
  4: 'زنگ ۴',
  5: 'زنگ ۵',
  6: 'زنگ ۶',
};

export const PERIOD_TIMES_DISPLAY: Record<number, string> = {
  1: '۰۷:۳۰ تا ۰۹:۰۰',
  2: '۰۹:۲۰ تا ۱۰:۴۰',
  3: '۱۱:۰۰ تا ۱۲:۱۰',
  4: '۱۲:۳۰ تا ۱۳:۵۰',
  5: '۱۴:۳۰ تا ۱۵:۵۰',
  6: '۱۶:۰۰ تا ۱۷:۲۰',
};
