import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface SelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  icon?: React.ComponentType<{ className?: string }>;
  options?: SelectOption[];
  placeholder?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      className,
      label,
      error,
      helperText,
      icon: Icon,
      options,
      placeholder,
      id,
      children,
      disabled,
      ...props
    },
    ref,
  ) => {
    const selectId = id || (label ? `select-${label.replace(/\s+/g, '-')}` : undefined);

    return (
      <div className="w-full text-right space-y-1.5 group">
        {label && (
          <label
            htmlFor={selectId}
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
          <select
            id={selectId}
            ref={ref}
            disabled={disabled}
            className={twMerge(
              clsx(
                'w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-[#FAFAFA] dark:bg-[#1C2536] text-ink-normal dark:text-white text-xs sm:text-sm font-medium focus:border-primary focus:bg-white dark:focus:bg-[#1C2536] focus:outline-none transition-all disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer pl-10 pr-3.5',
                Icon && 'pr-10',
                error
                  ? 'border-red-500 focus:border-red-500 ring-2 ring-red-500/10'
                  : 'hover:border-gray-300 dark:hover:border-gray-600 focus:ring-2 focus:ring-primary/20',
                className,
              ),
            )}
            {...props}
          >
            {placeholder && (
              <option value="" disabled hidden>
                {placeholder}
              </option>
            )}
            {options
              ? options.map((opt) => (
                <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                  {opt.label}
                </option>
              ))
              : children}
          </select>
        </div>
        {error && <p className="text-xs text-red-600 dark:text-red-400 font-medium">{error}</p>}
        {helperText && !error && (
          <p className="text-xs text-gray-500 dark:text-gray-400">{helperText}</p>
        )}
      </div>
    );
  },
);

Select.displayName = 'Select';
