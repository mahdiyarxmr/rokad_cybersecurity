import { useRef, useEffect, useCallback } from 'react';
import { toast } from '../../components/ui/toast/toast';
import { TOAST_MESSAGES } from '../../constants/toast-messages';

export interface UseUndoableMutationConfig<TVars> {
  mutationFn: (vars: TVars) => Promise<any>;
  undoFn?: (vars: TVars) => Promise<any>;
  optimisticUpdate: (vars: TVars) => void;
  revertUpdate: (vars: TVars) => void;
  undoLabel: string | ((vars: TVars) => string);
  delayMs?: number; // default 5000ms
  onSuccess?: (vars: TVars) => void;
  onError?: (error: any, vars: TVars) => void;
  icon?: React.ComponentType<{ className?: string }>;
}

export function useUndoableMutation<TVars = any>(
  config: UseUndoableMutationConfig<TVars>,
) {
  const pendingActionsRef = useRef<
    Map<
      string,
      {
        timerId: ReturnType<typeof setTimeout>;
        vars: TVars;
        cancel: () => Promise<void>;
      }
    >
  >(new Map());

  const execute = useCallback(
    async (vars: TVars) => {
      const actionId = `undo_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const delay = config.delayMs ?? 5000;
      const label =
        typeof config.undoLabel === 'function'
          ? config.undoLabel(vars)
          : config.undoLabel;

      // 1. Optimistic Update in UI immediately
      config.optimisticUpdate(vars);

      // 2. Execute deletion on server FIRST!
      try {
        await config.mutationFn(vars);
        config.onSuccess?.(vars);
      } catch (err: any) {
        // If server deletion fails, revert UI and show error immediately
        config.revertUpdate(vars);
        config.onError?.(err, vars);
        toast.error(
          err?.response?.data?.message || err?.message || TOAST_MESSAGES.common.errorFallback,
        );
        return;
      }

      // 3. Deletion succeeded on server! Now start the 5-second countdown timer for Undo!
      let isUndone = false;

      const cancelAction = async () => {
        if (isUndone) return;
        isUndone = true;

        const entry = pendingActionsRef.current.get(actionId);
        if (entry) {
          clearTimeout(entry.timerId);
          pendingActionsRef.current.delete(actionId);
        }

        try {
          if (config.undoFn) {
            await config.undoFn(vars);
          }
          config.revertUpdate(vars);
        } catch (undoErr: any) {
          toast.error(
            undoErr?.response?.data?.message || undoErr?.message || 'خطا در بازگردانی عملیات',
          );
        }
      };

      const timerId = setTimeout(() => {
        pendingActionsRef.current.delete(actionId);
      }, delay);

      pendingActionsRef.current.set(actionId, {
        timerId,
        vars,
        cancel: cancelAction,
      });

      // 4. Show Telegram-style Undo Toast with Countdown Timer
      toast.undoable({
        message: label,
        duration: delay,
        icon: config.icon,
        onUndo: () => {
          cancelAction();
        },
      });

      return {
        actionId,
        cancel: cancelAction,
      };
    },
    [config],
  );

  // Global Ctrl+Z / Cmd+Z shortcut to undo latest pending action
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        const pendingEntries = Array.from(pendingActionsRef.current.values());
        if (pendingEntries.length > 0) {
          e.preventDefault();
          const latest = pendingEntries[pendingEntries.length - 1];
          latest.cancel();
          toast.success('عملیات با میان‌بر Ctrl+Z بازگردانده شد', { duration: 2500 });
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return { execute };
}
