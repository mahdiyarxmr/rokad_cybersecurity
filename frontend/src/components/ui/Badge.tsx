import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-bold text-xs transition-colors select-none',
  {
    variants: {
      variant: {
        default:
          'bg-ecosystem-light dark:bg-ecosystem-darker/40 text-ecosystem-darker dark:text-ecosystem-light border border-primary/30',
        ecosystem:
          'bg-ecosystem-light dark:bg-ecosystem-darker/40 text-ecosystem-darker dark:text-ecosystem-light border border-primary/30',
        male:
          'bg-male-light dark:bg-male-darker/40 text-male-darker dark:text-male-light border border-sec/30',
        sec:
          'bg-male-light dark:bg-male-darker/40 text-male-darker dark:text-male-light border border-sec/30',
        female:
          'bg-female-light dark:bg-female-darker/40 text-female-darker dark:text-female-light border border-female-normal/30',
        girl:
          'bg-female-light dark:bg-female-darker/40 text-female-darker dark:text-female-light border border-female-normal/30',
        college:
          'bg-college-light dark:bg-college-darker/40 text-college-darker dark:text-college-light border border-college-normal/30',
        club:
          'bg-club-light dark:bg-club-darker/40 text-club-darker dark:text-club-light border border-club-normal/30',
        success:
          'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30',
        warning:
          'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-500/30',
        destructive:
          'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border border-rose-500/30',
        neutral:
          'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 border border-gray-300 dark:border-gray-700',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

export const Badge: React.FC<BadgeProps> = ({ className, variant, ...props }) => {
  return (
    <div className={twMerge(clsx(badgeVariants({ variant }), className))} {...props} />
  );
};
