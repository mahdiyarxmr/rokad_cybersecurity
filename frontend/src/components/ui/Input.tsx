import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  icon?: React.ComponentType<{ className?: string }>;
  endAction?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, label, error, helperText, icon: Icon, endAction, id, ...props }, ref) => {
    const inputId = id || (label ? `input-${label.replace(/\s+/g, '-')}` : undefined);

    return (
      <div className="w-full text-right space-y-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs sm:text-[13px] font-bold text-ink-normal/80 dark:text-gray-300"
          >
            {label}
          </label>
        )}
        <div className="relative">
          {Icon && (
            <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-gray-400">
              <Icon className="w-4 h-4" />
            </div>
          )}
          <input
            type={type}
            id={inputId}
            className={twMerge(
              clsx(
                'w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-[#FAFAFA] dark:bg-[#1C2536] text-ink-normal dark:text-white text-xs sm:text-sm font-medium focus:border-primary focus:bg-white dark:focus:bg-[#1C2536] focus:outline-none transition-all placeholder:text-gray-400 dark:placeholder:text-gray-400 disabled:cursor-not-allowed disabled:opacity-50',
                Icon && 'pr-10',
                endAction && 'pl-11',
                error ? 'border-red-500 focus:border-red-500' : 'hover:border-gray-300 dark:hover:border-gray-600',
                className,
              ),
            )}
            ref={ref}
            {...props}
          />
          {endAction && (
            <div className="absolute inset-y-0 left-0 pl-1.5 flex items-center">
              {endAction}
            </div>
          )}
        </div>
        {error && <p className="text-xs text-red-600 dark:text-red-400 font-medium">{error}</p>}
        {helperText && !error && (
          <p className="text-xs text-gray-500 dark:text-gray-400">{helperText}</p>
        )}
      </div>
    );
  },
);

Input.displayName = 'Input';
