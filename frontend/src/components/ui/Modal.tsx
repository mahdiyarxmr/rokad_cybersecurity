import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { Button } from './Button';
import { useScrollLock } from '../../lib/hooks/useScrollLock';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl';
  hideHeaderBorder?: boolean;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  maxWidth = 'lg',
  hideHeaderBorder = false,
}) => {
  useScrollLock(isOpen);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
    '4xl': 'max-w-4xl',
  }[maxWidth];

  const modalElement = (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 overscroll-contain"
      onWheel={(e) => {
        if (e.target === e.currentTarget) {
          e.preventDefault();
        }
      }}
      onTouchMove={(e) => {
        if (e.target === e.currentTarget) {
          e.preventDefault();
        }
      }}
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 transition-opacity duration-200"
        onClick={onClose}
        onWheel={(e) => e.preventDefault()}
        onTouchMove={(e) => e.preventDefault()}
      />

      {/* Modal Dialog (Bottom Sheet on Mobile, Centered Neo-Brutalist Modal on Desktop) */}
      <div
        role="dialog"
        aria-modal="true"
        className={`relative w-full ${maxWidthClasses} rounded-t-3xl sm:rounded-3xl bg-white dark:bg-[#151C28] text-ink-normal dark:text-white p-4 sm:p-6 border-2 border-primary/40 shadow-[4px_4px_0_#202A5A] dark:shadow-[4px_4px_0_#59BBAF] z-10 max-h-[88vh] sm:max-h-[90vh] overflow-y-auto overscroll-contain animate-in slide-in-from-bottom-8 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-150 pb-[max(1.25rem,env(safe-area-inset-bottom))]`}
      >
        {/* Mobile Drag Indicator Pill */}
        <div className="w-12 h-1.5 bg-gray-300 dark:bg-gray-700 rounded-full mx-auto mb-3 sm:hidden shrink-0" />

        <div
          className={`flex items-center justify-between ${
            hideHeaderBorder || !description
              ? 'mb-3'
              : 'pb-3.5 border-b border-gray-100 dark:border-gray-800 mb-4'
          }`}
        >
          <div className="text-right min-w-0 pr-1">
            <h3 className="text-base sm:text-lg font-black text-sec dark:text-white leading-snug truncate">
              {title}
            </h3>
            {description && (
              <p className="text-xs text-ink-normal/70 dark:text-gray-400 mt-1 line-clamp-2 leading-relaxed">
                {description}
              </p>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label="بستن"
            className="h-11 w-11 min-h-[44px] min-w-[44px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-full shrink-0 flex items-center justify-center"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div>{children}</div>
      </div>
    </div>
  );

  return createPortal(modalElement, document.body);
};
