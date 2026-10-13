import React, { useEffect, useState } from 'react';
import { Download, X, Share, PlusSquare, Smartphone, Check } from 'lucide-react';
import { Button } from '../ui/Button';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const PwaInstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // 1. Check if already running in standalone mode (installed)
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;

    if (isStandalone) {
      setIsInstalled(true);
      return;
    }

    // 2. Check if user recently dismissed the prompt (hide for 3 days)
    const dismissedAt = localStorage.getItem('rokad_pwa_dismissed_at');
    if (dismissedAt) {
      const daysSinceDismiss = (Date.now() - parseInt(dismissedAt, 10)) / (1000 * 60 * 60 * 24);
      if (daysSinceDismiss < 3) {
        return;
      }
    }

    // 3. Detect iOS device
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIos(isIosDevice);

    // 4. Handle Chromium / Android install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // If iOS and not standalone, show after a short delay (e.g. 3 seconds)
    if (isIosDevice) {
      const timer = setTimeout(() => {
        setShowPrompt(true);
      }, 3000);
      return () => clearTimeout(timer);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setShowPrompt(false);
      }
      setDeferredPrompt(null);
    } catch (err) {
      console.error('Error during PWA installation:', err);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('rokad_pwa_dismissed_at', Date.now().toString());
  };

  if (isInstalled || !showPrompt) {
    return null;
  }

  return (
    <aside
      aria-label="نصب برنامه رکاد"
      className="fixed bottom-20 md:bottom-6 left-4 right-4 md:left-auto md:right-6 md:w-96 z-50 animate-in fade-in slide-in-from-bottom-5 duration-300"
    >
      <div className="bg-white/95 backdrop-blur-md rounded-2xl p-4 shadow-xl border border-primary/20 ring-1 ring-black/5 flex flex-col gap-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3">
            <img
              src="/logo.svg"
              alt="نرم‌افزار رکاد"
              className="w-11 h-11 rounded-xl object-cover shadow-sm shrink-0 border border-gray-200/80"
            />
            <div>
              <h4 className="text-sm font-bold text-ink-darker">نصب نرم‌افزار رکاد</h4>
              <p className="text-[11px] text-gray-500 mt-0.5">
                دسترسی سریع‌تر، بارگذاری لحظه‌ای و آفلاین
              </p>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            aria-label="بستن پیام نصب"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content based on platform */}
        {isIos ? (
          <div className="bg-primary-50/60 rounded-xl p-2.5 text-[11px] text-primary-darker space-y-1.5 leading-relaxed">
            <div className="flex items-center gap-1.5 font-bold">
              <span>راهنمای نصب در آیفون و آیپد:</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-white flex items-center justify-center text-[10px] font-bold shrink-0">۱</span>
              <span>دکمه اشتراک‌گذاری <Share className="w-3.5 h-3.5 inline mx-1 text-primary" /> در پایین مرورگر را لمس کنید.</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-white flex items-center justify-center text-[10px] font-bold shrink-0">۲</span>
              <span>گزینه <strong className="font-bold">افزودن به صفحه اصلی</strong> <PlusSquare className="w-3.5 h-3.5 inline mx-1 text-primary" /> را انتخاب نمایید.</span>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 pt-1">
            <Button
              variant="primary"
              size="sm"
              onClick={handleInstallClick}
              className="flex-1 min-h-[44px] text-xs font-bold flex items-center justify-center gap-2 shadow-sm"
            >
              <Download className="w-4 h-4" />
              <span>نصب برنامه (افزودن به صفحه اصلی)</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDismiss}
              className="min-h-[44px] px-3 text-xs text-gray-500 hover:bg-gray-100"
            >
              بعداً
            </Button>
          </div>
        )}
      </div>
    </aside>
  );
};
