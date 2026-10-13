import React from 'react';
import { Award, Coins, Sparkles, Trophy, ShieldCheck, Clock, Users } from 'lucide-react';
import { toPersianDigits } from '../../../lib/utils';
import { Badge } from '../../../components/ui/Badge';
import { useTenantStore } from '../../../lib/auth/tenant-store';

interface KaHeaderBannerProps {
  score?: number;
  tokens?: number;
  rankInSchool?: number | null;
  rankInClass?: number | null;
  userName?: string;
  isAdmin?: boolean;
  totalStudentsCount?: number;
  pendingSubmissionsCount?: number;
  pendingClaimsCount?: number;
}

export const KaHeaderBanner: React.FC<KaHeaderBannerProps> = ({
  score = 0,
  tokens = 0,
  rankInSchool,
  rankInClass,
  userName,
  isAdmin = false,
  totalStudentsCount = 0,
  pendingSubmissionsCount = 0,
  pendingClaimsCount = 0,
}) => {
  const { currentTenant } = useTenantStore();
  const isGirlsSchool = currentTenant?.slug === 'rokad-girls' || currentTenant?.theme === 'female';

  return (
    <div className="relative overflow-hidden rounded-3xl border-2 border-primary/20 bg-gradient-to-br from-white via-[#F8F9FA] to-primary/5 dark:from-[#151C28] dark:via-[#101622] dark:to-primary/10 p-6 md:p-8 shadow-[4px_4px_0_#59BBAF] transition-all">
      {/* دکوراسیون پس‌زمینه */}
      <div className="pointer-events-none absolute -right-12 -top-12 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute -left-12 -bottom-12 h-64 w-64 rounded-full bg-secondary/10 blur-3xl" />

      <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
        {/* سمت راست: معرفی پلتفرم */}
        <div className="space-y-3 max-w-xl">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={isAdmin ? 'male' : 'club'} className="shadow-[2px_2px_0_#202A5A] dark:shadow-[2px_2px_0_#59BBAF]">
              {isAdmin ? (
                <ShieldCheck className="w-3.5 h-3.5 ml-1 text-primary" />
              ) : (
                <Sparkles className="w-3.5 h-3.5 ml-1 text-club-normal dark:text-club-light" />
              )}
              {isAdmin ? 'پنل مدیریت و داوری سامانه کا' : 'اکوسیستم گیمیفیکیشن «کا»'}
            </Badge>

            <Badge variant={isGirlsSchool ? 'female' : 'male'} className="text-xs">
              {currentTenant?.name || (isGirlsSchool ? 'هنرستان دخترانه رُکاد' : 'هنرستان پسرانه رُکاد')}
            </Badge>
          </div>

          <div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-gray-900 dark:text-white flex items-center gap-2">
              {isAdmin ? (
                'مرکز پایش، داوری و ارزشیابی کا'
              ) : userName ? (
                <>
                  <span>{`سلام، ${userName} عزیز!`}</span>
                  <Sparkles className="w-6 h-6 text-amber-500 shrink-0 inline-block" />
                </>
              ) : (
                'پلتفرم گیمیفیکیشن و ارزش‌آفرینی کا'
              )}
            </h1>
          </div>
        </div>

        {/* سمت چپ: کارت‌های آماری بر اساس نقش */}
        {isAdmin ? (
          /* کارت‌های خلاصه مدیریت مدرسه */
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 w-full lg:w-auto shrink-0">
            {/* تعداد دانش‌آموزان عضو کا */}
            <div className="flex items-center gap-3 rounded-2xl border-2 border-primary/30 bg-white dark:bg-[#1A2232] p-4 shadow-[2.75px_2.75px_0_#59BBAF]">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Users className="h-6 w-6" />
              </div>
              <div>
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">دانش‌آموزان هنرستان</span>
                <div className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white">
                  {toPersianDigits(totalStudentsCount)} نفر
                </div>
              </div>
            </div>

            {/* فعالیت‌های در انتظار داوری */}
            <div className="flex items-center gap-3 rounded-2xl border-2 border-amber-500/30 bg-white dark:bg-[#1A2232] p-4 shadow-[2.75px_2.75px_0_#D97706]">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600">
                <Clock className="h-6 w-6" />
              </div>
              <div>
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">در انتظار داوری</span>
                <div className="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400">
                  {toPersianDigits(pendingSubmissionsCount)} مورد
                </div>
              </div>
            </div>

            {/* پاداش‌های در انتظار تحویل */}
            <div className="flex items-center gap-3 rounded-2xl border-2 border-college-normal/30 bg-white dark:bg-[#1A2232] p-4 shadow-[2.75px_2.75px_0_#F8A41D]">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-college-light dark:bg-college-darker/60 text-college-normal">
                <Coins className="h-6 w-6" />
              </div>
              <div>
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">تحویل پاداش</span>
                <div className="text-xl sm:text-2xl font-black text-college-normal dark:text-college-light">
                  {toPersianDigits(pendingClaimsCount)} مورد
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* کارت‌های آماری اختصاصی دانش‌آموز */
          <div className="grid grid-cols-2 sm:grid-cols-2 gap-3.5 w-full lg:w-auto shrink-0">
            {/* امتیاز کل */}
            <div className="flex items-center gap-3 rounded-2xl border-2 border-club-normal/30 bg-white dark:bg-[#1A2232] p-4 shadow-[2.75px_2.75px_0_#652D90] transition-transform hover:-translate-y-0.5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-club-light dark:bg-club-darker/60 text-club-normal dark:text-club-light">
                <Award className="h-6 w-6" />
              </div>
              <div>
                <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">امتیاز کل (Score)</span>
                <div className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white">
                  {toPersianDigits(score)}
                </div>
              </div>
            </div>

            {/* توکن‌های من */}
            <div className="flex items-center gap-3 rounded-2xl border-2 border-college-normal/30 bg-white dark:bg-[#1A2232] p-4 shadow-[2.75px_2.75px_0_#F8A41D] transition-transform hover:-translate-y-0.5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-college-light dark:bg-college-darker/60 text-college-normal dark:text-college-light">
                <Coins className="h-6 w-6" />
              </div>
              <div>
                <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">توکن‌های من (Token)</span>
                <div className="text-xl sm:text-2xl font-black text-college-normal dark:text-college-light">
                  {toPersianDigits(tokens)}
                </div>
              </div>
            </div>

            {/* رتبه در مدرسه */}
            <div className="flex items-center gap-3 rounded-2xl border-2 border-ecosystem-normal/30 bg-white dark:bg-[#1A2232] p-4 shadow-[2.75px_2.75px_0_#59BBAF] transition-transform hover:-translate-y-0.5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-ecosystem-light dark:bg-ecosystem-darker/60 text-ecosystem-normal dark:text-ecosystem-light">
                <Trophy className="h-6 w-6" />
              </div>
              <div>
                <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">رتبه در مدرسه</span>
                <div className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white">
                  {rankInSchool ? `#${toPersianDigits(rankInSchool)}` : '—'}
                </div>
              </div>
            </div>

            {/* رتبه در کلاس */}
            <div className="flex items-center gap-3 rounded-2xl border-2 border-male-normal/30 bg-white dark:bg-[#1A2232] p-4 shadow-[2.75px_2.75px_0_#202A5A] dark:shadow-[2.75px_2.75px_0_#59BBAF] transition-transform hover:-translate-y-0.5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-male-light dark:bg-male-darker/60 text-male-normal dark:text-male-light">
                <Award className="h-6 w-6" />
              </div>
              <div>
                <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">رتبه در کلاس</span>
                <div className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white">
                  {rankInClass ? `#${toPersianDigits(rankInClass)}` : '—'}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
