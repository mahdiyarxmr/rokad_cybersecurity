import React, { useEffect } from 'react';
import { useCuriosityStore } from '../../lib/ui/curiosity-store';
import { CoinStackIcon } from '../icons/CustomNavIcons';
import { Sparkles, X, Gift, Check } from 'lucide-react';
import { toPersianDigits } from '../../lib/utils';

export const CuriosityEasterEggModal: React.FC = () => {
  const { isOpen, closeModal, claimedTotal } = useCuriosityStore();

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        closeModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, closeModal]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="easter-egg-title"
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200 select-none"
      onClick={closeModal}
    >
      <div
        className="relative w-full max-w-sm overflow-hidden rounded-3xl bg-gradient-to-b from-white via-amber-50/30 to-amber-100/50 dark:from-[#151D2A] dark:via-[#121926] dark:to-[#1C2538] border-2 border-amber-400/60 dark:border-amber-500/50 p-6 text-center shadow-[0_25px_60px_rgba(245,158,11,0.35)] transform transition-all animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glowing Aura in Header */}
        <div
          className="absolute -top-20 left-1/2 -translate-x-1/2 w-48 h-48 bg-amber-400/25 dark:bg-amber-500/20 rounded-full blur-3xl pointer-events-none"
          aria-hidden="true"
        />

        {/* Close Button */}
        <button
          type="button"
          onClick={closeModal}
          aria-label="بستن"
          className="absolute top-4 left-4 p-2 rounded-full text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Floating Animated Golden Ka Coin Icon */}
        <div className="relative mx-auto w-20 h-20 mb-4 flex items-center justify-center">
          <div className="absolute inset-0 rounded-2xl bg-amber-400/30 blur-lg animate-pulse" />
          <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-tr from-amber-600 via-amber-400 to-yellow-300 text-white flex items-center justify-center shadow-[0_10px_25px_rgba(245,158,11,0.45)] border-2 border-white/70">
            <CoinStackIcon solid className="w-12 h-12 text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.25)]" />
          </div>
        </div>

        {/* Curiosity Discovery Tag */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100/90 dark:bg-amber-950/70 border border-amber-300 dark:border-amber-700/80 text-amber-800 dark:text-amber-300 text-[11px] font-black mb-3 shadow-xs">
          <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-spin" />
          <span>کشف ایستر اگ نسخه ۱.۰.۰</span>
        </div>

        {/* Title */}
        <h3 id="easter-egg-title" className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white mb-2 tracking-tight">
          ۱۰ «کا» جایزه کنجکاویت! 🪙
        </h3>

        {/* Description */}
        <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 leading-relaxed mb-5 font-medium px-2">
          دمت گرم بابت این همه دقت و کنجکاوی! شما با ۵ بار کلیک روی نسخه پلتفرم، این راز مخفی رو پیدا کردی.
          ۱۰ سکه کا به عنوان پاداش به حسابت اضافه شد.
        </p>

        {/* Prize Box */}
        <div className="rounded-2xl bg-white/80 dark:bg-[#1A2333]/90 border border-amber-200 dark:border-amber-800/60 p-3.5 mb-5 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2.5 text-right">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Gift className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-gray-800 dark:text-gray-200">پاداش کنجکاوی رُکاد</div>
              <div className="text-[10px] text-gray-500 dark:text-gray-400">مجموع پاداش دریافتی: {toPersianDigits(claimedTotal)} کا</div>
            </div>
          </div>
          <div className="text-left font-black text-amber-600 dark:text-amber-400 text-lg font-mono">
            +{toPersianDigits(10)} KA
          </div>
        </div>

        {/* Action Button */}
        <button
          type="button"
          onClick={closeModal}
          className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white font-black text-sm shadow-[0_8px_20px_rgba(245,158,11,0.35)] active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <Check className="w-4 h-4" strokeWidth={3} />
          <span>دمت گرم! دریافت ۱۰ کا و ادامه</span>
        </button>
      </div>
    </div>
  );
};
