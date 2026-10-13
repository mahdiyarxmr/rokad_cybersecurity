import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface ResponsivePageHeaderProps {
  icon?: React.ComponentType<{ className?: string }> | React.ReactNode;
  title: string;
  description?: string;
  subtitle?: string;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export const ResponsivePageHeader: React.FC<ResponsivePageHeaderProps> = ({
  icon,
  title,
  description,
  subtitle,
  badge,
  actions,
  className,
}) => {
  return (
    <div
      className={twMerge(
        clsx(
          'flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-white dark:bg-[#151C28] p-3.5 sm:p-4 md:p-5 rounded-2xl border border-gray-200/80 dark:border-[#242F42] shadow-xs print:hidden',
          className,
        ),
      )}
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2.5">
          {icon && (
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary dark:text-primary border border-primary/25 flex items-center justify-center font-black shadow-2xs shrink-0">
              {React.isValidElement(icon) ? (
                icon
              ) : (
                React.createElement(icon as React.ComponentType<{ className?: string }>, {
                  className: 'w-5 h-5',
                })
              )}
            </div>
          )}
          <h1 className="text-base sm:text-lg md:text-xl font-black text-ink-darker dark:text-white leading-tight">
            {title}
          </h1>
          {badge}
        </div>
      </div>

      {actions && (
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
};
