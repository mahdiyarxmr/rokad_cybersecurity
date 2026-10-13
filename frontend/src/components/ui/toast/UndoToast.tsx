import React, { useState, useEffect, useRef } from 'react';
import { RotateCcw, Trash2, Clock } from 'lucide-react';
import { toPersianDigits } from '../../../lib/utils';

export interface UndoToastProps {
  id: string | number;
  message: string;
  onUndo: () => void;
  onDismiss: () => void;
  duration?: number; // default 5000ms
  icon?: React.ComponentType<{ className?: string }>;
}

export const UndoToast: React.FC<UndoToastProps> = ({
  id,
  message,
  onUndo,
  onDismiss,
  duration = 5000,
  icon: Icon = Trash2,
}) => {
  const [isPaused, setIsPaused] = useState(false);
  const [remainingTime, setRemainingTime] = useState(duration);

  const startTimeRef = useRef<number>(Date.now());
  const remainingTimeRef = useRef<number>(duration);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    startTimeRef.current = Date.now();

    const tick = () => {
      if (!isPaused) {
        const elapsed = Date.now() - startTimeRef.current;
        const remaining = Math.max(0, remainingTimeRef.current - elapsed);
        setRemainingTime(remaining);

        if (remaining <= 0) {
          onDismiss();
          return;
        }
      }
      animationFrameRef.current = requestAnimationFrame(tick);
    };

    animationFrameRef.current = requestAnimationFrame(tick);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPaused, onDismiss]);

  const pauseTimer = () => {
    // Record remaining time and pause countdown
    const elapsed = Date.now() - startTimeRef.current;
    remainingTimeRef.current = Math.max(0, remainingTimeRef.current - elapsed);
    setRemainingTime(remainingTimeRef.current);
    setIsPaused(true);
  };

  const resumeTimer = () => {
    // Reset start time and resume countdown
    startTimeRef.current = Date.now();
    setIsPaused(false);
  };

  const handleUndoClick = () => {
    onUndo();
    onDismiss();
  };

  const secondsLeft = Math.max(1, Math.ceil(remainingTime / 1000));

  return (
    <div
      onMouseEnter={pauseTimer}
      onMouseLeave={resumeTimer}
      onTouchStart={pauseTimer}
      onTouchEnd={resumeTimer}
      onTouchCancel={resumeTimer}
      className="relative overflow-hidden w-[380px] max-w-full rounded-2xl bg-white dark:bg-zinc-900 text-foreground shadow-[4px_4px_0px_#000] dark:shadow-[4px_4px_0px_#000] border-2.5 border-black dark:border-zinc-700 p-3.5 transition-all select-none"
      dir="rtl"
    >
      {/* Toast Content */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-950/70 border-2 border-amber-500/50 flex items-center justify-center shrink-0">
            <Icon className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          </div>
          <span className="text-xs font-black truncate leading-tight text-foreground">
            {message}
          </span>
        </div>

        {/* Actions: Countdown Timer Badge & Undo Button */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Numerical Countdown Timer */}
          <div
            className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold border-2 transition-colors ${
              isPaused
                ? 'bg-amber-100 dark:bg-amber-950/60 border-amber-600 dark:border-amber-500 text-amber-900 dark:text-amber-300'
                : 'bg-neutral-100 dark:bg-zinc-800 border-black/30 dark:border-zinc-700 text-amber-700 dark:text-amber-400'
            }`}
            title={isPaused ? 'تایمر متوقف شد (با خروج نشانگر ماوس ادامه می‌یابد)' : 'زمان باقی‌مانده برای بازگردانی'}
          >
            <Clock className={`h-3.5 w-3.5 ${isPaused ? '' : 'animate-pulse text-amber-500'}`} />
            <span>{toPersianDigits(secondsLeft)} ثانیه</span>
          </div>

          {/* Undo Action Button */}
          <button
            type="button"
            onClick={handleUndoClick}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-500 text-black border-2 border-black text-xs font-black shadow-[2px_2px_0px_#000] transition-transform active:translate-y-0.5 shrink-0"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>بازگردانی</span>
          </button>
        </div>
      </div>
    </div>
  );
};
