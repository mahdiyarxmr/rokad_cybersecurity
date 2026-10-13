import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const Table = React.forwardRef<
  HTMLTableElement,
  React.HTMLAttributes<HTMLTableElement>
>(({ className, ...props }, ref) => (
  <div className="relative w-full overflow-x-auto rounded-2xl border-[1.5px] border-[#EAEAEA] dark:border-[#242F42] bg-white dark:bg-[#151C28] shadow-[3px_3px_0_#202A5A] dark:shadow-[3px_3px_0_#59BBAF] touch-pan-x">
    <table
      ref={ref}
      className={twMerge(clsx('w-full min-w-[650px] sm:min-w-full caption-bottom text-sm text-right', className))}
      {...props}
    />
  </div>
));
Table.displayName = 'Table';

export const TableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <thead
    ref={ref}
    className={twMerge(clsx('bg-[#F8F9FA] dark:bg-[#1C2536] border-b border-[#EAEAEA] dark:border-[#242F42] text-xs font-bold text-sec dark:text-gray-200', className))}
    {...props}
  />
));
TableHeader.displayName = 'TableHeader';

export const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tbody
    ref={ref}
    className={twMerge(clsx('divide-y divide-gray-100 dark:divide-gray-800', className))}
    {...props}
  />
));
TableBody.displayName = 'TableBody';

export const TableRow = React.forwardRef<
  HTMLTableRowElement,
  React.HTMLAttributes<HTMLTableRowElement>
>(({ className, ...props }, ref) => (
  <tr
    ref={ref}
    className={twMerge(
      clsx('transition-colors hover:bg-gray-50/70 dark:hover:bg-[#1C2536]/50', className),
    )}
    {...props}
  />
));
TableRow.displayName = 'TableRow';

export const TableHead = React.forwardRef<
  HTMLTableCellElement,
  React.ThHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <th
    ref={ref}
    className={twMerge(
      clsx('h-11 px-4 text-right align-middle font-bold text-sec dark:text-gray-200 [&:has([role=checkbox])]:pr-0', className),
    )}
    {...props}
  />
));
TableHead.displayName = 'TableHead';

export const TableCell = React.forwardRef<
  HTMLTableCellElement,
  React.TdHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <td
    ref={ref}
    className={twMerge(
      clsx('p-4 align-middle text-ink-normal dark:text-gray-200 text-xs sm:text-sm [&:has([role=checkbox])]:pr-0', className),
    )}
    {...props}
  />
));
TableCell.displayName = 'TableCell';
