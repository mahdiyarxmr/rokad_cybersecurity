import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Construction } from 'lucide-react';
import { Button } from './Button';

interface UnderDevelopmentOverlayProps {
  title: string;
  subtitle?: string;
  description?: string;
  badgeText?: string;
  icon?: React.ComponentType<{ className?: string }>;
  accentColor?: 'primary' | 'amber' | 'purple' | 'emerald';
  children: React.ReactNode;
}

export const UnderDevelopmentOverlay: React.FC<UnderDevelopmentOverlayProps> = ({
  title,
  subtitle = 'در حال توسعه و آماده‌سازی نهایی',
  description = 'این بخش با امکانات جذاب و قابلیت‌های ویژه در حال توسعه است و به زودی رونمایی خواهد شد.',
  badgeText = 'نسخه آزمایشی / در حال توسعه',
  icon: Icon = Construction,
  accentColor = 'amber',
  children,
}) => {
  const navigate = useNavigate();

  // قفل کردن کامل اسکرول پس‌زمینه هنگام نمایش این کاور
  useEffect(() => {
    const originalBodyOverflow = document.body.style.overflow;
    const originalHtmlOverflow = document.documentElement.style.overflow;
    const mainElement = document.querySelector('main');
    const originalMainOverflow = mainElement?.style.overflow;

    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    if (mainElement) {
      mainElement.style.overflow = 'hidden';
      mainElement.scrollTop = 0;
    }

    return () => {
      document.body.style.overflow = originalBodyOverflow;
      document.documentElement.style.overflow = originalHtmlOverflow;
      if (mainElement && originalMainOverflow !== undefined) {
        mainElement.style.overflow = originalMainOverflow;
      }
    };
  }, []);

  const getAccentStyles = () => {
    switch (accentColor) {
      case 'primary':
        return {
          glow: 'from-primary/20 via-primary/5 to-transparent',
          badge: 'bg-primary/10 text-primary border-primary/25',
          iconBg: 'bg-primary/10 text-primary border-primary/30',
          dot: 'bg-primary',
        };
      case 'purple':
        return {
          glow: 'from-purple-500/20 via-purple-500/5 to-transparent',
          badge: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/25',
          iconBg: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30',
          dot: 'bg-purple-500',
        };
      case 'emerald':
        return {
          glow: 'from-emerald-500/20 via-emerald-500/5 to-transparent',
          badge: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25',
          iconBg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
          dot: 'bg-emerald-500',
        };
      case 'amber':
      default:
        return {
          glow: 'from-amber-500/20 via-amber-500/5 to-transparent',
          badge: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25',
          iconBg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30',
          dot: 'bg-amber-500',
        };
    }
  };

  const accents = getAccentStyles();

  return (
    <div className="relative w-full h-[calc(100dvh-5.5rem)] md:h-[calc(100dvh-6.5rem)] max-h-[calc(100dvh-5.5rem)] md:max-h-[calc(100dvh-6.5rem)] overflow-hidden select-none">
      {/* پیش‌نمایش بلورشده و قفل‌شده پس‌زمینه (بدون امکان اسکرول) */}
      <div
        className="h-full w-full max-h-full overflow-hidden filter blur-[8px] md:blur-[12px] pointer-events-none select-none opacity-40 dark:opacity-20 transition-all duration-300"
        aria-hidden="true"
        tabIndex={-1}
      >
        {children}
      </div>

      {/* لایه بلور و تثبیت‌شده با چینش کارت در بالای صفحه */}
      <div className="absolute inset-0 z-30 flex items-start justify-center pt-4 sm:pt-8 md:pt-10 px-4 sm:px-6 pb-6 bg-slate-900/20 dark:bg-black/50 backdrop-blur-[6px] overflow-y-auto overscroll-contain">
        {/* کارت شیشه‌ای در بالای صفحه */}
        <div className="w-full max-w-lg relative rounded-3xl p-6 sm:p-8 text-center bg-white/90 dark:bg-[#111827]/90 backdrop-blur-2xl border border-white/60 dark:border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.14)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.7)] overflow-hidden animate-in fade-in zoom-in-95 duration-200 mt-1 sm:mt-2">
          {/* افکت نور محیطی ملایم در بالای کارت */}
          <div
            className={`absolute -top-24 left-1/2 -translate-x-1/2 w-72 h-40 bg-gradient-to-b ${accents.glow} rounded-full blur-2xl pointer-events-none`}
          />

          {/* نشان وضعیت */}
          <div className="flex justify-center mb-4 relative">
            <span className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold border ${accents.badge}`}>
              <span className="relative flex h-2 w-2">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${accents.dot} opacity-75`} />
                <span className={`relative inline-flex rounded-full h-2 w-2 ${accents.dot}`} />
              </span>
              <span>{badgeText}</span>
            </span>
          </div>

          {/* باکس آیکون */}
          <div className="flex justify-center mb-4 relative">
            <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center border shadow-xs ${accents.iconBg}`}>
              <Icon className="w-7 h-7 sm:w-8 sm:h-8" />
            </div>
          </div>

          {/* عنوان و زیرعنوان */}
          <h2 className="text-xl sm:text-2xl font-black text-ink-darker dark:text-white tracking-tight mb-1.5 relative">
            {title}
          </h2>
          <p className="text-xs sm:text-sm font-bold text-primary dark:text-teal-400 mb-2.5 relative">
            {subtitle}
          </p>
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 leading-relaxed max-w-md mx-auto mb-6 relative">
            {description}
          </p>

          {/* دکمه بازگشت */}
          <div className="flex items-center justify-center relative">
            <Button
              variant="primary"
              size="md"
              onClick={() => navigate('/app')}
              className="w-full sm:w-auto h-10 px-6 text-xs sm:text-sm font-bold gap-2 rounded-xl shadow-[2px_2px_0_#438C83]"
            >
              <ArrowRight className="w-4 h-4 rotate-180" />
              <span>بازگشت به پیشخوان</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
