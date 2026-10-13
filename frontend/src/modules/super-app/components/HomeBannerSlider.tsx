import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../../lib/auth/auth-store';
import { toPersianDigits } from '../../../lib/utils';
import { Badge } from '../../../components/ui/Badge';
import {
  useHomeBannerStore,
  HomeBannerSlide,
  DEFAULT_HOME_BANNER_SLIDES,
} from '../../../lib/stores/home-banner-store';
import {
  Sparkles,
  Flame,
  Bell,
  HelpCircle,
  Trophy,
  GraduationCap,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  Calendar,
  Layers,
} from 'lucide-react';

interface HomeBannerSliderProps {
  onOpenSettings?: () => void;
}

export const HomeBannerSlider: React.FC<HomeBannerSliderProps> = ({ onOpenSettings }) => {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const isManager = ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'STAFF'].includes(user?.role || '');

  const initForTenant = useHomeBannerStore((state) => state.initForTenant);

  useEffect(() => {
    initForTenant(user?.tenantId);
  }, [user?.tenantId, initForTenant]);

  const storedSlides = useHomeBannerStore((state) => state.slides);
  const activeSlides = useMemo(() => {
    const list = storedSlides.filter((s) => s.active);
    return list.length > 0 ? list.slice(0, 3) : DEFAULT_HOME_BANNER_SLIDES.slice(0, 3);
  }, [storedSlides]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const touchStartXRef = useRef<number | null>(null);

  // Auto-slide effect (every 5 seconds when not paused)
  useEffect(() => {
    if (isPaused || activeSlides.length <= 1) return;

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % activeSlides.length);
    }, 5000);

    return () => clearInterval(timer);
  }, [isPaused, activeSlides.length]);

  // Keep index within range if slides change
  useEffect(() => {
    if (currentIndex >= activeSlides.length) {
      setCurrentIndex(0);
    }
  }, [activeSlides.length, currentIndex]);

  const currentSlide: HomeBannerSlide = activeSlides[currentIndex] || activeSlides[0];

  const handleNext = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setCurrentIndex((prev) => (prev + 1) % activeSlides.length);
  };

  const handlePrev = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setCurrentIndex((prev) => (prev - 1 + activeSlides.length) % activeSlides.length);
  };

  // Touch handlers for mobile swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartXRef.current - touchEndX;

    // In RTL, swipe left (positive diff) navigates to next slide
    if (Math.abs(diff) > 40) {
      if (diff > 0) {
        handleNext();
      } else {
        handlePrev();
      }
    }
    touchStartXRef.current = null;
  };

  const bannerTypes = useHomeBannerStore((state) => state.bannerTypes);

  // Helper for slide type icon
  const renderSlideIcon = (typeId: string) => {
    const config = bannerTypes.find((t) => t.id === typeId);
    const iconName = config?.icon || 'Sparkles';
    switch (iconName) {
      case 'Flame':
        return <Flame className="w-3.5 h-3.5 text-girl dark:text-[#F472B6] animate-pulse" />;
      case 'Bell':
        return <Bell className="w-3.5 h-3.5 text-third dark:text-[#FBBF24]" />;
      case 'HelpCircle':
        return <HelpCircle className="w-3.5 h-3.5 text-sec dark:text-[#8194EE]" />;
      case 'Trophy':
        return <Trophy className="w-3.5 h-3.5 text-girl dark:text-[#F472B6]" />;
      case 'GraduationCap':
        return <GraduationCap className="w-3.5 h-3.5 text-primary" />;
      case 'Sparkles':
      default:
        return <Sparkles className="w-3.5 h-3.5 text-primary" />;
    }
  };

  // Theme styling presets
  const getThemeClasses = (theme: HomeBannerSlide['theme']) => {
    switch (theme) {
      case 'college':
        return {
          wrapper:
            'bg-gradient-to-br from-[#FEF8ED] via-[#FFFDF7] to-[#FEF3C7] dark:from-[#2A1C0B] dark:via-[#1D1408] dark:to-[#38260D] border-amber-300/60 dark:border-amber-700/40 shadow-[2.5px_2.5px_0_#F8A41D] dark:shadow-[2.5px_2.5px_0_#0B0F17]',
          textTitle: 'text-amber-950 dark:text-amber-100',
          textSubtitle: 'text-amber-900/80 dark:text-amber-200/80',
          ctaButton:
            'bg-[#F8A41D] hover:bg-[#E08D10] text-white border-[1.5px] border-[#8C5707] shadow-[2px_2px_0_#57390A] active:shadow-[1px_1px_0_#57390A]',
          chipBg: 'bg-amber-100/90 dark:bg-amber-900/40 text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-700/50',
          glow: 'from-amber-400/15',
        };
      case 'club':
        return {
          wrapper:
            'bg-gradient-to-br from-[#F6F0FA] via-[#FCFAFE] to-[#EDE0F7] dark:from-[#241033] dark:via-[#170B21] dark:to-[#301644] border-purple-300/60 dark:border-purple-700/40 shadow-[2.5px_2.5px_0_#652D90] dark:shadow-[2.5px_2.5px_0_#0B0F17]',
          textTitle: 'text-purple-950 dark:text-purple-100',
          textSubtitle: 'text-purple-900/80 dark:text-purple-200/80',
          ctaButton:
            'bg-[#652D90] hover:bg-[#502175] text-white border-[1.5px] border-[#371650] shadow-[2px_2px_0_#231032] active:shadow-[1px_1px_0_#231032]',
          chipBg: 'bg-purple-100/90 dark:bg-purple-900/40 text-purple-900 dark:text-purple-200 border-purple-300 dark:border-purple-700/50',
          glow: 'from-purple-400/15',
        };
      case 'male':
        return {
          wrapper:
            'bg-gradient-to-br from-[#EEF2FA] via-[#F8FAFC] to-[#DDE5F5] dark:from-[#111A33] dark:via-[#0D1326] dark:to-[#182346] border-blue-300/60 dark:border-blue-700/40 shadow-[2.5px_2.5px_0_#202A5A] dark:shadow-[2.5px_2.5px_0_#0B0F17]',
          textTitle: 'text-blue-950 dark:text-blue-100',
          textSubtitle: 'text-blue-900/80 dark:text-blue-200/80',
          ctaButton:
            'bg-[#202A5A] hover:bg-[#182147] text-white border-[1.5px] border-[#0E132A] shadow-[2px_2px_0_#0B0F1F] active:shadow-[1px_1px_0_#0B0F1F]',
          chipBg: 'bg-blue-100/90 dark:bg-blue-900/40 text-blue-900 dark:text-blue-200 border-blue-300 dark:border-blue-700/50',
          glow: 'from-blue-400/15',
        };
      case 'ecosystem':
      default:
        return {
          wrapper:
            'bg-gradient-to-br from-[#EDF9F7] via-[#F8FDFD] to-[#DCF3F0] dark:from-[#0D2421] dark:via-[#091A18] dark:to-[#13322E] border-primary/40 dark:border-primary/30 shadow-[2.5px_2.5px_0_#59BBAF] dark:shadow-[2.5px_2.5px_0_#0B0F17]',
          textTitle: 'text-teal-950 dark:text-teal-100',
          textSubtitle: 'text-teal-900/80 dark:text-teal-200/80',
          ctaButton:
            'bg-primary hover:bg-primary-dark text-white border-[1.5px] border-[#2C5F59] shadow-[2px_2px_0_#1F413D] active:shadow-[1px_1px_0_#1F413D]',
          chipBg: 'bg-primary/10 dark:bg-primary/20 text-primary-dark dark:text-primary-light border-primary/30',
          glow: 'from-primary/15',
        };
    }
  };

  if (!currentSlide) return null;

  const currentTheme = getThemeClasses(currentSlide.theme);

  return (
    <div
      className="relative group select-none transition-all duration-300"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Neo-brutalist Main Banner Card */}
      <div
        className={`relative overflow-hidden rounded-2xl sm:rounded-3xl border-[1.5px] p-4 sm:p-5 transition-all duration-300 ${currentTheme.wrapper}`}
      >
        {/* Decorative Background Glow and Watermark pattern */}
        <div
          className={`absolute -top-12 -left-12 w-44 h-44 rounded-full bg-gradient-to-br ${currentTheme.glow} to-transparent blur-2xl pointer-events-none`}
        />
        <div className="absolute top-2 left-2 opacity-5 pointer-events-none dark:opacity-10">
          <Layers className="w-24 h-24 sm:w-32 sm:h-32 text-current" />
        </div>

        {/* Top Bar: Badge, Meta Text & Admin/Counter Controls */}
        <div className="relative z-10 flex items-center justify-between gap-2 mb-2.5 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Category / Type Badge */}
            <Badge
              variant={currentSlide.badgeVariant || 'default'}
              className="text-[10px] sm:text-xs py-0.5 px-2.5 font-black flex items-center gap-1 shadow-2xs"
            >
              {renderSlideIcon(currentSlide.type)}
              <span>{currentSlide.badgeText}</span>
            </Badge>

            {/* Optional Meta text (e.g. date or venue) */}
            {currentSlide.metaText && (
              <span className={`text-[11px] sm:text-xs font-bold px-2 py-0.5 rounded-md border flex items-center gap-1 ${currentTheme.chipBg}`}>
                <Calendar className="w-3 h-3 shrink-0 opacity-70" />
                <span>{currentSlide.metaText}</span>
              </span>
            )}
          </div>

          {/* Right/Left Controls: Admin Settings button + Slide counter badge */}
          <div className="flex items-center gap-1.5">
            {isManager && onOpenSettings && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenSettings();
                }}
                className="flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold bg-white/85 hover:bg-white dark:bg-gray-800/85 dark:hover:bg-gray-800 text-ink-darker dark:text-gray-100 border border-gray-300 dark:border-gray-700 shadow-2xs transition-all hover:scale-105 active:scale-95 cursor-pointer"
                title="تنظیمات اسلایدر بنر برای راهبر"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-primary" />
                <span className="hidden sm:inline">تنظیمات بنر</span>
              </button>
            )}

            {/* Slide Count Indicator */}
            <div className="px-2 py-0.5 rounded-lg bg-black/10 dark:bg-white/10 backdrop-blur-xs text-[10px] sm:text-[11px] font-mono font-bold text-ink-darker dark:text-white">
              {toPersianDigits(currentIndex + 1)} / {toPersianDigits(activeSlides.length)}
            </div>
          </div>
        </div>

        {/* Slide Content: Title (Enlarged, without short description) */}
        <div className="relative z-10 max-w-2xl py-1">
          <h3
            className={`font-black text-base sm:text-lg md:text-xl lg:text-2xl leading-snug line-clamp-2 transition-all ${currentTheme.textTitle}`}
          >
            {currentSlide.title}
          </h3>
        </div>

        {/* Bottom Bar: Action CTA Button & Slider Controls (Dots + Arrows) */}
        <div className="relative z-10 flex items-center justify-between gap-3 pt-3.5 mt-1 border-t border-black/5 dark:border-white/5 flex-wrap">
          {/* Action CTA Button */}
          <button
            type="button"
            onClick={() => {
              if (currentSlide.actionUrl) {
                if (currentSlide.actionUrl.startsWith('http')) {
                  window.open(currentSlide.actionUrl, '_blank');
                } else {
                  navigate(currentSlide.actionUrl);
                }
              }
            }}
            className={`group inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs sm:text-[13px] font-black transition-all cursor-pointer ${currentTheme.ctaButton}`}
          >
            <span>{currentSlide.actionText || 'مشاهده جزئیات'}</span>
            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
          </button>

          {/* Slider Pagination & Arrow Controls */}
          <div className="flex items-center gap-2.5">
            {/* Slide Indicators / Dots */}
            <div className="flex items-center gap-1.5" dir="ltr">
              {activeSlides.map((slide, idx) => {
                const isActive = idx === currentIndex;
                return (
                  <button
                    key={slide.id}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentIndex(idx);
                    }}
                    aria-label={`اسلاید ${idx + 1}`}
                    className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                      isActive
                        ? 'w-6 bg-primary dark:bg-primary-light shadow-xs'
                        : 'w-2 bg-gray-300 dark:bg-gray-700 hover:bg-gray-400'
                    }`}
                  />
                );
              })}
            </div>

            {/* Navigation Arrows */}
            {activeSlides.length > 1 && (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handleNext}
                  aria-label="اسلاید بعدی"
                  className="w-7 h-7 rounded-lg flex items-center justify-center bg-white/80 hover:bg-white dark:bg-gray-800/80 dark:hover:bg-gray-800 text-ink-darker dark:text-white border border-gray-200/80 dark:border-gray-700 shadow-2xs hover:scale-105 active:scale-95 transition-transform cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handlePrev}
                  aria-label="اسلاید قبلی"
                  className="w-7 h-7 rounded-lg flex items-center justify-center bg-white/80 hover:bg-white dark:bg-gray-800/80 dark:hover:bg-gray-800 text-ink-darker dark:text-white border border-gray-200/80 dark:border-gray-700 shadow-2xs hover:scale-105 active:scale-95 transition-transform cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
