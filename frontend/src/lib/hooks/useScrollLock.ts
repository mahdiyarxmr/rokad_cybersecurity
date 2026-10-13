import { useEffect } from 'react';

let lockCount = 0;

/**
 * قفل کردن اسکرول کل صفحه و کانتینرهای اسکرول پس‌زمینه (html, body, main)
 */
export function lockScroll() {
  lockCount++;
  if (lockCount === 1) {
    document.documentElement.classList.add('modal-scroll-locked');
    document.body.classList.add('modal-scroll-locked');

    document.documentElement.style.overscrollBehavior = 'contain';
    document.body.style.overscrollBehavior = 'contain';
  }
}

/**
 * باز کردن قفل اسکرول پس‌زمینه پس از بسته شدن آخرین مودال
 */
export function unlockScroll() {
  lockCount = Math.max(0, lockCount - 1);
  if (lockCount === 0) {
    document.documentElement.classList.remove('modal-scroll-locked');
    document.body.classList.remove('modal-scroll-locked');

    document.documentElement.style.overscrollBehavior = '';
    document.body.style.overscrollBehavior = '';
  }
}

/**
 * React Hook برای مدیریت قفل اسکرول هنگام باز بودن مودال، دیالوگ یا دراور
 */
export function useScrollLock(isLocked: boolean) {
  useEffect(() => {
    if (!isLocked) return;

    lockScroll();

    return () => {
      unlockScroll();
    };
  }, [isLocked]);
}
