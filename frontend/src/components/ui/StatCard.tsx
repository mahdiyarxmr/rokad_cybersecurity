import React from 'react';
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';
import { toPersianDigits } from '../../lib/utils';

export type StatCardTheme = 'ecosystem' | 'male' | 'female' | 'college' | 'club';

export interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  theme?: StatCardTheme;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  className?: string;
  onClick?: () => void;
}

const themeStyles: Record<
  StatCardTheme,
  {
    cardShadow: string;
    iconBg: string;
    iconColor: string;
    borderAccent: string;
  }
> = {
  ecosystem: {
    cardShadow: 'shadow-[2.75px_2.75px_0_#59BBAF]',
    iconBg: 'bg-ecosystem-light dark:bg-ecosystem-darker/50',
    iconColor: 'text-ecosystem-normal dark:text-ecosystem-light',
    borderAccent: 'border-ecosystem-normal/30',
  },
  male: {
    cardShadow: 'shadow-[2.75px_2.75px_0_#202A5A] dark:shadow-[2.75px_2.75px_0_#59BBAF]',
    iconBg: 'bg-male-light dark:bg-male-darker/50',
    iconColor: 'text-male-normal dark:text-male-light',
    borderAccent: 'border-male-normal/30',
  },
  female: {
    cardShadow: 'shadow-[2.75px_2.75px_0_#E0195B]',
    iconBg: 'bg-female-light dark:bg-female-darker/50',
    iconColor: 'text-female-normal dark:text-female-light',
    borderAccent: 'border-female-normal/30',
  },
  college: {
    cardShadow: 'shadow-[2.75px_2.75px_0_#F8A41D]',
    iconBg: 'bg-college-light dark:bg-college-darker/50',
    iconColor: 'text-college-normal dark:text-college-light',
    borderAccent: 'border-college-normal/30',
  },
  club: {
    cardShadow: 'shadow-[2.75px_2.75px_0_#652D90]',
    iconBg: 'bg-club-light dark:bg-club-darker/50',
    iconColor: 'text-club-normal dark:text-club-light',
    borderAccent: 'border-club-normal/30',
  },
};

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  theme = 'ecosystem',
  trend,
  className = '',
  onClick,
}) => {
  const styles = themeStyles[theme];
  const displayValue = typeof value === 'number' ? toPersianDigits(value) : value;

  return (
    <div
      onClick={onClick}
      className={`rokad-card rounded-2xl border-[1.5px] border-[#EAEAEA] dark:border-[#242F42] bg-white dark:bg-[#151C28] p-5 text-right transition-all duration-200 ${styles.cardShadow} ${
        onClick ? 'cursor-pointer hover:-translate-y-1' : ''
      } ${className}`}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0 pr-1">
          <span className="text-xs font-bold text-ink-normal/70 dark:text-gray-400 block truncate">
            {title}
          </span>
          <div className="text-2xl sm:text-3xl font-black text-sec dark:text-white mt-1.5 font-mono">
            {displayValue}
          </div>
        </div>

        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border ${styles.borderAccent} ${styles.iconBg} ${styles.iconColor}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 pt-2 border-t border-gray-100 dark:border-gray-800/80 text-[11px]">
        {subtitle ? (
          <span className="text-ink-normal/60 dark:text-gray-400 truncate">
            {subtitle}
          </span>
        ) : (
          <span />
        )}

        {trend && (
          <span
            className={`inline-flex items-center gap-1 font-bold px-2 py-0.5 rounded-full text-[10px] shrink-0 ${
              trend.isPositive
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20'
                : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-500/20'
            }`}
          >
            {trend.isPositive ? (
              <TrendingUp className="w-3 h-3" />
            ) : (
              <TrendingDown className="w-3 h-3" />
            )}
            <span>{trend.value}</span>
          </span>
        )}
      </div>
    </div>
  );
};
