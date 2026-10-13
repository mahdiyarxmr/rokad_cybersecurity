import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { isInteractive?: boolean; isFlat?: boolean }
>(({ className, isInteractive = true, isFlat = false, ...props }, ref) => (
  <div
    ref={ref}
    className={twMerge(
      clsx(
        'rokad-card rounded-2xl border-[1.5px] border-[#EAEAEA] dark:border-[#242F42] bg-white dark:bg-[#151C28] text-ink-normal dark:text-white transition-all duration-200',
        !isFlat && 'shadow-[2.75px_2.75px_0_#202A5A] dark:shadow-[2.75px_2.75px_0_#59BBAF]',
        isInteractive && !isFlat && 'hover:-translate-y-0.5 hover:shadow-[3.5px_3.5px_0_#202A5A] dark:hover:shadow-[3.5px_3.5px_0_#59BBAF]',
        className,
      ),
    )}
    {...props}
  />
));
Card.displayName = 'Card';

export const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={twMerge(clsx('flex flex-col space-y-1.5 p-4 sm:p-5 md:p-6', className))}
    {...props}
  />
));
CardHeader.displayName = 'CardHeader';

export const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={twMerge(
      clsx('font-black text-base sm:text-lg leading-snug tracking-tight text-sec dark:text-white', className),
    )}
    {...props}
  />
));
CardTitle.displayName = 'CardTitle';

export const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={twMerge(clsx('text-xs sm:text-[13px] text-ink-normal/70 dark:text-gray-400 mt-1 leading-relaxed', className))}
    {...props}
  />
));
CardDescription.displayName = 'CardDescription';

export const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={twMerge(clsx('px-4 sm:px-5 md:px-6 pb-4 sm:pb-5 md:pb-6 pt-0', className))}
    {...props}
  />
));
CardContent.displayName = 'CardContent';

export const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={twMerge(clsx('flex items-center px-4 sm:px-5 md:px-6 pb-4 sm:pb-5 md:pb-6 pt-0', className))}
    {...props}
  />
));
CardFooter.displayName = 'CardFooter';
