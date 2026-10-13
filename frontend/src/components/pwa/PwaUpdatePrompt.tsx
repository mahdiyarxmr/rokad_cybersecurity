import React, { useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { RefreshCw, Sparkles, ArrowUpCircle, X } from 'lucide-react';
import { Button } from '../ui/Button';
import { useAppVersionCheck } from '../../lib/hooks/useAppVersionCheck';
import { toPersianDigits } from '../../lib/utils';

export const PwaUpdatePrompt: React.FC = () => {
  const [snoozedUntil, setSnoozedUntil] = useState<number>(() => {
    try {
      const stored = localStorage.getItem('rokad_pwa_update_snooze');
      return stored ? parseInt(stored, 10) : 0;
    } catch {
      return 0;
    }
  });
  const [isUpdating, setIsUpdating] = useState<boolean>(false);

  // متد امن و بدون حلقه برای به‌روزرسانی سرویس‌ورکر و کش
  const forceAppUpdate = async () => {
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg) {
      await reg.update().catch(() => {});
      const pending = reg.installing ?? reg.waiting;
      if (pending && pending.state === 'installing') {
        await Promise.race([
          new Promise<void>((resolve) =>
            pending.addEventListener('statechange', () => {
              if (pending.state === 'installed') resolve();
            })
          ),
          new Promise<void>((resolve) => setTimeout(resolve, 8000)),
        ]);
      }
      if (reg.waiting && updateServiceWorker) {
        await updateServiceWorker(true);
        return;
      }
    }
    // مسیر نهایی در صورت عدم وجود SW در انتظار: پاکسازی کامل کش‌ها و رفرش
    const regs = (await navigator.serviceWorker?.getRegistrations()) ?? [];
    await Promise.all(regs.map((r) => r.unregister()));
    await Promise.all((await caches.keys()).map((k) => caches.delete(k)));
    window.location.reload();
  };

  // ۱. بررسی نسخه از طریق نسخه استاتیک
  const {
    hasUpdate: hasApiVersionUpdate,
    serverVersion,
    currentVersion,
  } = useAppVersionCheck();

  // ۲. بررسی از طریق سرویس‌ورکر Workbox
  const {
    needRefresh: [needSwRefresh, setNeedSwRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(swUrl, r) {
      if (r) {
        setInterval(() => {
          r.update();
        }, 15 * 60 * 1000);

        // بررسی خودکار آپدیت هنگام فعال‌شدن مجدد تب یا بازگشت به اپلیکیشن روی گوشی
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') {
            r.update();
          }
        });
      }
    },
    onRegisterError(error) {
      console.error('[PWA] SW registration error:', error);
    },
  });

  // در حالت توسعه (Dev)، پاپ‌آپ آپدیت نمایش داده نمی‌شود
  if (import.meta.env.DEV) {
    return null;
  }

  // آیا آپدیت جدید کشف شده است؟
  const isUpdateDetected = hasApiVersionUpdate || needSwRefresh;

  // آیا کاربر موقتاً به تعویق انداخته است؟
  const isSnoozed = Date.now() < snoozedUntil;

  const handleUpdateNow = async () => {
    setIsUpdating(true);
    try {
      await forceAppUpdate();
    } catch (e) {
      console.error('[PWA Update] Force reload fallback:', e);
      window.location.reload();
    }
  };

  // به تعویق انداختن موقت (۲ ساعت) و ذخیره در حافظه محلی
  const handleSnooze = () => {
    const until = Date.now() + 2 * 60 * 60 * 1000;
    setSnoozedUntil(until);
    try {
      localStorage.setItem('rokad_pwa_update_snooze', until.toString());
    } catch {}
    setNeedSwRefresh(false);
  };

  if (!isUpdateDetected || isSnoozed) {
    return null;
  }

  return (
    <aside
      role="alert"
      aria-live="assertive"
      aria-label="اطلاعیه انتشار نسخه جدید رُکاد"
      className="fixed bottom-20 md:bottom-6 left-4 right-4 md:left-6 md:right-auto md:w-[420px] z-[9999] animate-in fade-in slide-in-from-bottom-6 duration-300"
    >
      <div className="rounded-2xl border-2 border-primary/50 bg-[#151C28] text-white p-5 shadow-[4px_4px_0_#59BBAF] ring-1 ring-white/10 flex flex-col gap-3.5 relative">
        {/* دکمه بستن سریع */}
        <button
          onClick={handleSnooze}
          aria-label="بستن اعلان آپدیت"
          className="absolute top-3.5 left-3.5 w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* هدر اعلان نسخه جدید */}
        <div className="flex items-start gap-3 pl-6">
          <div className="p-2.5 rounded-xl bg-primary/20 text-primary border border-primary/40 shrink-0">
            <ArrowUpCircle className="w-6 h-6 animate-pulse text-primary" />
          </div>

          <div className="space-y-1 flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <h4 className="text-sm font-black text-white flex items-center gap-1.5">
                <span>نسخه جدیدی از رُکاد آماده است</span>
                <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              </h4>
            </div>

            <p className="text-xs text-gray-300 leading-relaxed">
              تغییرات و بهینه‌سازی‌های فنی جدید منتشر شده است. لطفاً برای دریافت آخرین امکانات، برنامه را به‌روزرسانی فرمایید.
            </p>

            {/* بج‌های شماره نسخه */}
            <div className="flex items-center gap-2 pt-1">
              <span className="text-[11px] text-gray-400">نسخه فعلی:</span>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-gray-800 text-gray-300 border border-gray-700">
                v{toPersianDigits(currentVersion)}
              </span>
              {serverVersion && serverVersion !== currentVersion && (
                <>
                  <span className="text-[11px] text-primary">⬅️</span>
                  <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-md bg-primary/20 text-primary border border-primary/40">
                    v{toPersianDigits(serverVersion)}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* دکمه‌های اقدام */}
        <div className="flex items-center gap-2 pt-1 border-t border-gray-800/80">
          <Button
            variant="primary"
            size="sm"
            disabled={isUpdating}
            onClick={handleUpdateNow}
            className="flex-1 min-h-[44px] text-xs font-black flex items-center justify-center gap-2 shadow-[2px_2px_0_#202A5A]"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isUpdating ? 'animate-spin' : ''}`} />
            <span>{isUpdating ? 'در حال دریافت نسخه جدید...' : 'بروزرسانی الان'}</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleSnooze}
            className="min-h-[44px] px-3.5 text-xs text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
          >
            بعداً
          </Button>
        </div>
      </div>
    </aside>
  );
};
