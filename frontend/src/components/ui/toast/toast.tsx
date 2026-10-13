import React from 'react';
import { toast as sonnerToast } from 'sonner';
import { UndoToast } from './UndoToast';

export interface UndoableToastOptions {
  message: string;
  onUndo: () => void;
  onConfirm?: () => void;
  duration?: number;
  icon?: React.ComponentType<{ className?: string }>;
}

export interface ToastOptions {
  id?: string | number;
  duration?: number;
  description?: string;
}

// Deduplication cache to prevent duplicate toasts within 600ms
const recentToasts = new Map<string, number>();
const DEDUPE_INTERVAL_MS = 600;

function isDuplicate(key: string): boolean {
  const now = Date.now();
  const last = recentToasts.get(key);
  if (last && now - last < DEDUPE_INTERVAL_MS) {
    return true;
  }
  recentToasts.set(key, now);

  // Periodic cleanup
  if (recentToasts.size > 100) {
    for (const [k, time] of recentToasts.entries()) {
      if (now - time > 5000) recentToasts.delete(k);
    }
  }
  return false;
}

export const toast = {
  success: (message: string, options?: ToastOptions) => {
    const key = `success_${options?.id ?? message}`;
    if (isDuplicate(key)) return key;

    return sonnerToast.success(message, {
      id: options?.id ?? key,
      duration: options?.duration ?? 3000,
      description: options?.description,
    });
  },

  error: (message: string, options?: ToastOptions) => {
    const key = `error_${options?.id ?? message}`;
    if (isDuplicate(key)) return key;

    return sonnerToast.error(message, {
      id: options?.id ?? key,
      duration: options?.duration ?? 5000,
      description: options?.description,
    });
  },

  warning: (message: string, options?: ToastOptions) => {
    const key = `warning_${options?.id ?? message}`;
    if (isDuplicate(key)) return key;

    return sonnerToast.warning(message, {
      id: options?.id ?? key,
      duration: options?.duration ?? 4000,
      description: options?.description,
    });
  },

  info: (message: string, options?: ToastOptions) => {
    const key = `info_${options?.id ?? message}`;
    if (isDuplicate(key)) return key;

    return sonnerToast.info(message, {
      id: options?.id ?? key,
      duration: options?.duration ?? 3000,
      description: options?.description,
    });
  },

  promise: <T,>(
    promise: Promise<T>,
    data: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((error: any) => string);
    },
  ) => {
    return sonnerToast.promise(promise, data);
  },

  /**
   * نمایش توست بازگردانی تلگرامی با نوار پیشرفت و تایمر ۵ ثانیه
   */
  undoable: (options: UndoableToastOptions) => {
    const key = `undo_${options.message}`;
    if (isDuplicate(key)) return key;

    const duration = options.duration ?? 5000;

    return sonnerToast.custom(
      (t) => (
        <UndoToast
          id={t}
          message={options.message}
          duration={duration}
          icon={options.icon}
          onUndo={() => {
            options.onUndo();
            sonnerToast.dismiss(t);
            sonnerToast.success('تغییرات با موفقیت بازگردانده شد', {
              id: 'undo_success',
              duration: 2500,
            });
          }}
          onDismiss={() => {
            if (options.onConfirm) {
              options.onConfirm();
            }
            sonnerToast.dismiss(t);
          }}
        />
      ),
      {
        id: key,
        duration,
      },
    );
  },

  dismiss: (id?: string | number) => sonnerToast.dismiss(id),
};
