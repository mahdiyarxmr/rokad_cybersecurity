import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Modal } from '../../../components/ui/Modal';
import { Input } from '../../../components/ui/Input';
import { kaApi } from '../../../lib/api/ka';
import { 
  ShoppingBag, 
  Coins, 
  Gift, 
  Sparkles, 
  PackageCheck, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Tag,
  LayoutGrid,
  Table as TableIcon,
  HeartHandshake,
  Award,
  Calendar,
  Layers,
  ArrowLeft,
  Percent,
  Compass,
  GraduationCap,
  Globe,
  BookOpen,
  Gamepad2,
  Laptop,
  Lightbulb,
  UserCheck,
  Camera,
  Printer,
  Trophy,
  Medal,
  Crown
} from 'lucide-react';
import { toPersianDigits } from '../../../lib/utils';
import { toast } from '../../../components/ui/toast/toast';

interface KaRewardsStoreProps {
  userTokens: number;
  onRewardClaimed?: () => void;
}

export const KaRewardsStore: React.FC<KaRewardsStoreProps> = ({
  userTokens = 0,
  onRewardClaimed,
}) => {
  const [rewards, setRewards] = useState<any[]>([]);
  const [myClaims, setMyClaims] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState<'board' | 'cards' | 'myClaims'>('board');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  
  // مودال تایید دریافت پاداش
  const [claimingReward, setClaimingReward] = useState<any | null>(null);
  const [customTokenAmount, setCustomTokenAmount] = useState<number>(50);
  const [claimingLoading, setClaimingLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [rewRes, claimsRes] = await Promise.all([
        kaApi.getRewards(),
        kaApi.getMyClaims().catch(() => ({ data: [] })),
      ]);
      setRewards(Array.isArray(rewRes.data) ? rewRes.data : []);
      setMyClaims(Array.isArray(claimsRes.data) ? claimsRes.data : []);
    } catch (e) {
      console.error('Error fetching rewards:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenClaimModal = (reward: any) => {
    setClaimingReward(reward);
    if (reward.parent === 'پاداش نیکوکارانه') {
      setCustomTokenAmount(50);
    } else {
      setCustomTokenAmount(reward.minToken || 0);
    }
  };

  const handleConfirmClaim = async () => {
    if (!claimingReward) return;
    
    let cost = claimingReward.minToken || 0;
    if (claimingReward.parent === 'پاداش نیکوکارانه') {
      cost = customTokenAmount;
      if (cost <= 0) {
        toast.error('لطفاً مقدار توکن معتبری وارد کنید');
        return;
      }
    }
    
    if (userTokens < cost) {
      toast.error('موجودی توکن شما برای دریافت این پاداش کافی نیست!');
      return;
    }

    setClaimingLoading(true);
    try {
      await kaApi.claimReward({ 
        rewardId: claimingReward.id,
        customTokens: claimingReward.parent === 'پاداش نیکوکارانه' ? cost : undefined
      });
      toast.success('درخواست پاداش با موفقیت ثبت شد و برای تایید به مدیریت ارسال گردید!');
      setClaimingReward(null);
      fetchData();
      if (onRewardClaimed) onRewardClaimed();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'خطا در ثبت درخواست پاداش');
    } finally {
      setClaimingLoading(false);
    }
  };

  // تفکیک دسته‌های سه‌گانه سند رسمی رُکاد
  const generalRewards = rewards.filter(r => r.parent === 'پاداش‌های عمومی');
  const exclusiveRewards = rewards.filter(r => r.parent === 'پاداش‌های اختصاصی (۵ نفر برتر پایه)');
  const charityRewards = rewards.filter(r => r.parent === 'پاداش نیکوکارانه');

  const categories = ['all', 'پاداش‌های عمومی', 'پاداش‌های اختصاصی (۵ نفر برتر پایه)', 'پاداش نیکوکارانه'];

  const filteredRewards = rewards.filter(r => {
    if (selectedCategory === 'all') return true;
    return (r.parent || '') === selectedCategory;
  });

  const formatTokenDisplay = (reward: any) => {
    if (reward.parent === 'پاداش‌های اختصاصی (۵ نفر برتر پایه)') {
      return reward.icon ? `موعد: ${reward.icon}` : '۵ نفر برتر پایه';
    }
    if (reward.parent === 'پاداش نیکوکارانه') {
      return 'به میزان دلخواه';
    }
    if (reward.maxToken && reward.maxToken > reward.minToken) {
      return `${toPersianDigits(reward.minToken)} - ${toPersianDigits(reward.maxToken)} K`;
    }
    return `${toPersianDigits(reward.minToken)} K`;
  };

  const getRewardIcon = (reward: any) => {
    const icon = reward.icon;
    if (icon === 'Percent') return Percent;
    if (icon === 'Compass') return Compass;
    if (icon === 'GraduationCap') return GraduationCap;
    if (icon === 'Globe') return Globe;
    if (icon === 'BookOpen') return BookOpen;
    if (icon === 'Gamepad2') return Gamepad2;
    if (icon === 'Laptop') return Laptop;
    if (icon === 'Lightbulb') return Lightbulb;
    if (icon === 'UserCheck') return UserCheck;
    if (icon === 'Camera') return Camera;
    if (icon === 'Printer') return Printer;

    const name = reward.name || '';
    if (name.includes('شهریه')) return Percent;
    if (name.includes('اردو') || name.includes('رویداد') || name.includes('استخر')) return Compass;
    if (name.includes('آموزشی') || name.includes('کتاب') || name.includes('تحریر')) return BookOpen;
    if (name.includes('بازی')) return Gamepad2;
    if (name.includes('الکترونیک') || name.includes('تبلت') || name.includes('هوشمند') || name.includes('هدفون')) return Laptop;
    if (name.includes('ایده') || name.includes('نوآوری')) return Lightbulb;
    if (name.includes('مشاوره')) return UserCheck;
    if (name.includes('عکاسی')) return Camera;
    if (name.includes('چاپ')) return Printer;
    if (name.includes('نیکوکارانه')) return HeartHandshake;
    if (name.includes('کاپ') || name.includes('تندیس') || name.includes('برتر')) return Trophy;
    if (name.includes('سفیر') || name.includes('تقدیر')) return Medal;
    if (name.includes('اینترنت')) return Globe;

    if (reward.parent?.includes('نیکوکارانه')) return HeartHandshake;
    if (reward.parent?.includes('اختصاصی')) return Award;
    return Gift;
  };

  return (
    <div className="space-y-6">
      {/* بنر رسمی سازمانی مدارس رُکاد */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#17544C] via-[#1F6E66] to-[#12423B] p-6 sm:p-8 text-white shadow-[2.75px_2.75px_0_#202A5A]">
        {/* پترن هندسی لوگوی رُکاد در پس‌زمینه */}
        <div className="absolute left-4 -bottom-10 opacity-15 pointer-events-none select-none">
          <div className="grid grid-cols-3 gap-2 w-48 h-48">
            <div className="bg-white rounded-lg"></div>
            <div className="bg-white rounded-lg"></div>
            <div className="bg-transparent"></div>
            <div className="bg-white rounded-lg"></div>
            <div className="bg-white rounded-lg"></div>
            <div className="bg-white rounded-lg"></div>
            <div className="bg-transparent"></div>
            <div className="bg-white rounded-lg"></div>
            <div className="bg-white rounded-lg"></div>
          </div>
        </div>

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-md px-3.5 py-1 rounded-full text-xs font-black tracking-wide border border-white/20 text-[#B7E4DF]">
              <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
              پاداش‌ها
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white drop-shadow-sm">
              سیستم جامع ارزیابی و پاداش مدارس رکاد
            </h1>
          </div>

          {/* کارت موجودی توکن کاربر */}
          <div className="flex items-center gap-4 bg-black/25 backdrop-blur-md border border-white/20 px-5 py-3.5 rounded-2xl shrink-0 shadow-lg">
            <div className="w-12 h-12 rounded-xl bg-amber-400 text-gray-900 flex items-center justify-center font-black shadow-md">
              <Coins className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs font-semibold text-gray-200">موجودی توکن شما</div>
              <div className="text-xl sm:text-2xl font-black text-amber-300">
                {toPersianDigits(userTokens)} <span className="text-sm font-bold text-white">کا (K)</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* نوار کنترل تب‌ها و نماها */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 dark:border-gray-800 pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveSubTab('board')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
              activeSubTab === 'board'
                ? 'bg-[#1F6E66] text-white shadow-[2px_2px_0_#12423B]'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:text-gray-900'
            }`}
          >
            <TableIcon className="w-4 h-4" />
            نمای جامع تابلوی پاداش‌ها
          </button>
          <button
            onClick={() => setActiveSubTab('cards')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
              activeSubTab === 'cards'
                ? 'bg-[#1F6E66] text-white shadow-[2px_2px_0_#12423B]'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:text-gray-900'
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
            ویترین کارت‌ها
          </button>
          <button
            onClick={() => setActiveSubTab('myClaims')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
              activeSubTab === 'myClaims'
                ? 'bg-[#1F6E66] text-white shadow-[2px_2px_0_#12423B]'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:text-gray-900'
            }`}
          >
            <PackageCheck className="w-4 h-4" />
            درخواست‌های من ({toPersianDigits(myClaims.length)})
          </button>
        </div>

        {activeSubTab === 'cards' && (
          <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                  selectedCategory === cat
                    ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900 shadow-xs'
                    : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                {cat === 'all' ? 'همه پاداش‌ها' : cat}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ۱. نمای تابلوی رسمی (Board Layout مطابق پوستر ارائه‌شده) */}
      {activeSubTab === 'board' && (
        <div className="rounded-3xl border-2 border-[#17544C] bg-[#1F6E66]/5 dark:bg-[#151C28] p-4 sm:p-6 shadow-[2.75px_2.75px_0_#202A5A]">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* ستون سمت راست: پاداش‌های عمومی (General Rewards) */}
            <div className="lg:col-span-6 flex flex-col">
              <div className="overflow-hidden rounded-2xl border-2 border-[#4C1D73] bg-white dark:bg-[#1E2532] shadow-md flex-1">
                {/* هدر بنفش جدول عمومی */}
                <div className="bg-[#652D90] px-4 py-3 text-center text-white font-black text-base sm:text-lg flex items-center justify-center gap-2">
                  <Gift className="w-5 h-5 text-purple-200" />
                  پاداش‌های عمومی
                </div>
                
                {/* عناوین ستون‌ها */}
                <div className="grid grid-cols-12 bg-purple-50 dark:bg-purple-950/30 text-purple-950 dark:text-purple-200 font-black text-xs sm:text-sm px-4 py-2.5 border-b border-purple-100 dark:border-purple-900/50">
                  <div className="col-span-8 text-right">عنوان پاداش</div>
                  <div className="col-span-4 text-center">توکن پرداختی</div>
                </div>

                {/* ردیف‌های پاداش‌های عمومی */}
                <div className="divide-y divide-gray-100 dark:divide-gray-800/80">
                  {generalRewards.map((reward) => {
                    const RewardIcon = getRewardIcon(reward);
                    return (
                      <div 
                        key={reward.id}
                        onClick={() => handleOpenClaimModal(reward)}
                        className="grid grid-cols-12 items-center px-4 py-3 text-xs sm:text-sm hover:bg-purple-50/60 dark:hover:bg-purple-900/20 cursor-pointer transition-colors group"
                      >
                        <div className="col-span-8 font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2.5">
                          <div className="w-6 h-6 rounded-lg bg-purple-100 dark:bg-purple-900/60 flex items-center justify-center shrink-0 text-[#652D90] dark:text-purple-300">
                            <RewardIcon className="w-3.5 h-3.5" />
                          </div>
                          <span className="group-hover:text-[#652D90] dark:group-hover:text-purple-300 transition-colors">
                            {reward.name}
                          </span>
                        </div>
                        <div className="col-span-4 text-center">
                          <span className="inline-block px-2.5 py-1 rounded-lg bg-purple-100 dark:bg-purple-900/50 text-[#652D90] dark:text-purple-300 font-black text-xs">
                            {reward.maxToken && reward.maxToken > reward.minToken
                              ? `${toPersianDigits(reward.minToken)} - ${toPersianDigits(reward.maxToken)} K`
                              : `${toPersianDigits(reward.minToken)} K`}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                  {generalRewards.length === 0 && (
                    <div className="p-8 text-center text-gray-500 text-xs">پاداشی تعریف نشده است</div>
                  )}
                </div>
              </div>
            </div>

            {/* ستون سمت چپ: پاداش‌های اختصاصی (۵ نفر برتر پایه) + پاداش نیکوکارانه */}
            <div className="lg:col-span-6 flex flex-col gap-6">
              
              {/* جدول اول: پاداش‌های اختصاصی (۵ نفر برتر پایه) */}
              <div className="overflow-hidden rounded-2xl border-2 border-[#D97706] bg-white dark:bg-[#1E2532] shadow-md">
                {/* هدر زرد/نارنجی خردلی */}
                <div className="bg-[#F8A41D] px-4 py-3 text-center text-gray-900 font-black text-base sm:text-lg flex items-center justify-center gap-2">
                  <Award className="w-5 h-5 text-amber-900" />
                  پاداش‌های اختصاصی (۵ نفر برتر پایه)
                </div>

                {/* عناوین ستون‌ها */}
                <div className="grid grid-cols-12 bg-amber-50 dark:bg-amber-950/30 text-amber-950 dark:text-amber-200 font-black text-xs sm:text-sm px-4 py-2.5 border-b border-amber-100 dark:border-amber-900/50">
                  <div className="col-span-8 text-right">عنوان پاداش</div>
                  <div className="col-span-4 text-center">موعد ارزیابی</div>
                </div>

                {/* ردیف‌های پاداش‌های اختصاصی */}
                <div className="divide-y divide-gray-100 dark:divide-gray-800/80">
                  {exclusiveRewards.map((reward) => {
                    const RewardIcon = getRewardIcon(reward);
                    return (
                      <div 
                        key={reward.id}
                        onClick={() => handleOpenClaimModal(reward)}
                        className="grid grid-cols-12 items-center px-4 py-3 text-xs sm:text-sm hover:bg-amber-50/60 dark:hover:bg-amber-900/20 cursor-pointer transition-colors group"
                      >
                        <div className="col-span-8 font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2.5">
                          <div className="w-6 h-6 rounded-lg bg-amber-100 dark:bg-amber-900/60 flex items-center justify-center shrink-0 text-amber-700 dark:text-amber-300">
                            <RewardIcon className="w-3.5 h-3.5" />
                          </div>
                          <span className="group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                            {reward.name}
                          </span>
                        </div>
                        <div className="col-span-4 text-center">
                          <span className="inline-block px-2.5 py-1 rounded-lg bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300 font-black text-xs">
                            {reward.icon || 'در لحظه'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                  {exclusiveRewards.length === 0 && (
                    <div className="p-8 text-center text-gray-500 text-xs">پاداشی تعریف نشده است</div>
                  )}
                </div>
              </div>

              {/* جدول دوم: پاداش نیکوکارانه */}
              <div className="overflow-hidden rounded-2xl border-2 border-[#BE123C] bg-white dark:bg-[#1E2532] shadow-md">
                {/* هدر سرخابی */}
                <div className="bg-[#E0195B] px-4 py-3 text-center text-white font-black text-base sm:text-lg flex items-center justify-center gap-2">
                  <HeartHandshake className="w-5 h-5 text-rose-200" />
                  پاداش نیکوکارانه
                </div>

                {/* عناوین ستون‌ها */}
                <div className="grid grid-cols-12 bg-rose-50 dark:bg-rose-950/30 text-rose-950 dark:text-rose-200 font-black text-xs sm:text-sm px-4 py-2.5 border-b border-rose-100 dark:border-rose-900/50">
                  <div className="col-span-8 text-right">عنوان پاداش</div>
                  <div className="col-span-4 text-center">توکن پرداختی</div>
                </div>

                {/* ردیف‌های پاداش نیکوکارانه */}
                <div className="divide-y divide-gray-100 dark:divide-gray-800/80">
                  {charityRewards.map((reward) => {
                    const RewardIcon = getRewardIcon(reward);
                    return (
                      <div 
                        key={reward.id}
                        onClick={() => handleOpenClaimModal(reward)}
                        className="grid grid-cols-12 items-center px-4 py-3.5 text-xs sm:text-sm hover:bg-rose-50/60 dark:hover:bg-rose-900/20 cursor-pointer transition-colors group"
                      >
                        <div className="col-span-8 font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2.5">
                          <div className="w-6 h-6 rounded-lg bg-rose-100 dark:bg-rose-900/60 flex items-center justify-center shrink-0 text-[#E0195B] dark:text-rose-300">
                            <RewardIcon className="w-3.5 h-3.5" />
                          </div>
                          <span className="group-hover:text-[#E0195B] dark:group-hover:text-rose-400 transition-colors">
                            {reward.name}
                          </span>
                        </div>
                        <div className="col-span-4 text-center">
                          <span className="inline-block px-3 py-1 rounded-lg bg-rose-100 dark:bg-rose-900/50 text-[#E0195B] dark:text-rose-300 font-black text-xs">
                            به میزان دلخواه
                          </span>
                        </div>
                      </div>
                    );
                  })}
                  {charityRewards.length === 0 && (
                    <div className="p-8 text-center text-gray-500 text-xs">پاداشی تعریف نشده است</div>
                  )}
                </div>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* ۲. نمای کارت‌های بازارچه (Store Cards View) */}
      {activeSubTab === 'cards' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredRewards.map((reward) => {
            const isExclusive = reward.parent === 'پاداش‌های اختصاصی (۵ نفر برتر پایه)';
            const isCharity = reward.parent === 'پاداش نیکوکارانه';
            const cost = isCharity ? 10 : (reward.minToken || 0);
            const canAfford = isExclusive ? true : userTokens >= cost;
            const RewardIcon = getRewardIcon(reward);

            const borderColor = isExclusive 
              ? 'border-[#F8A41D] shadow-[2.75px_2.75px_0_#F8A41D]'
              : isCharity 
                ? 'border-[#E0195B] shadow-[2.75px_2.75px_0_#E0195B]'
                : 'border-[#652D90] shadow-[2.75px_2.75px_0_#652D90]';

            const badgeBg = isExclusive
              ? 'bg-amber-100 text-amber-900 dark:bg-amber-900/60 dark:text-amber-200'
              : isCharity
                ? 'bg-rose-100 text-rose-900 dark:bg-rose-900/60 dark:text-rose-200'
                : 'bg-purple-100 text-purple-900 dark:bg-purple-900/60 dark:text-purple-200';

            return (
              <div
                key={reward.id}
                className={`group relative flex flex-col justify-between rounded-3xl border-2 bg-white dark:bg-[#151C28] p-5 hover:-translate-y-1 transition-all ${borderColor}`}
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-xs ${
                      isExclusive ? 'bg-amber-100 text-[#F8A41D]' : isCharity ? 'bg-rose-100 text-[#E0195B]' : 'bg-purple-100 text-[#652D90]'
                    }`}>
                      <RewardIcon className="w-6 h-6" />
                    </div>
                    <span className={`px-2.5 py-1 rounded-xl text-xs font-black ${badgeBg}`}>
                      {formatTokenDisplay(reward)}
                    </span>
                  </div>

                  <div>
                    <h3 className="font-bold text-base text-gray-900 dark:text-white group-hover:text-primary transition-colors">
                      {reward.name}
                    </h3>
                    <div className="flex items-center gap-1.5 text-xs text-gray-400 mt-1">
                      <Tag className="w-3.5 h-3.5 shrink-0" />
                      <span>{reward.parent || 'عمومی'}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-5 border-t border-gray-100 dark:border-gray-800/80 mt-4">
                  <Button
                    onClick={() => handleOpenClaimModal(reward)}
                    disabled={!canAfford}
                    className={`w-full font-bold text-xs ${
                      isExclusive 
                        ? 'bg-[#F8A41D] hover:bg-[#E08E0E] text-gray-900 shadow-[2px_2px_0_#92400E]'
                        : isCharity
                          ? 'bg-[#E0195B] hover:bg-[#BE123C] text-white shadow-[2px_2px_0_#881337]'
                          : canAfford
                            ? 'bg-[#652D90] hover:bg-[#4C1D73] text-white shadow-[2px_2px_0_#3B0764]'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-400 border border-gray-200 dark:border-gray-700 cursor-not-allowed'
                    }`}
                  >
                    {isExclusive 
                      ? 'درخواست پاداش اختصاصی'
                      : isCharity
                        ? 'مشارکت نیکوکارانه با توکن دلخواه'
                        : canAfford
                          ? 'دریافت این پاداش'
                          : `کسری توکن (${toPersianDigits(cost - userTokens)} دیگر)`}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ۳. تاریخچه سوابق پاداش‌های من */}
      {activeSubTab === 'myClaims' && (
        <Card className="shadow-[2.75px_2.75px_0_#202A5A] dark:shadow-[2.75px_2.75px_0_#59BBAF]">
          <CardHeader className="border-b border-gray-100 dark:border-gray-800">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <PackageCheck className="w-4 h-4 text-primary" />
              تاریخچه درخواست‌های پاداش من
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {myClaims.map((claim: any) => (
                <div key={claim.id} className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="font-bold text-sm text-gray-900 dark:text-white flex items-center gap-2">
                      <Gift className="w-4 h-4 text-primary shrink-0" />
                      {claim.reward?.name || 'عنوان پاداش'}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-3">
                      <span>هزینه پرداختی: <strong>{toPersianDigits(claim.tokenCost)} کا (K)</strong></span>
                      <span>دسته: {claim.reward?.parent || 'عمومی'}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    {claim.status === 'PENDING' && (
                      <Badge variant="warning">
                        <Clock className="w-3 h-3 ml-1" />
                        در انتظار بررسی مدیریت
                      </Badge>
                    )}
                    {claim.status === 'APPROVED' && (
                      <Badge variant="college">
                        <CheckCircle2 className="w-3 h-3 ml-1" />
                        تایید شده / آماده تحویل
                      </Badge>
                    )}
                    {claim.status === 'DELIVERED' && (
                      <Badge variant="success">
                        <PackageCheck className="w-3 h-3 ml-1" />
                        تحویل داده شد
                      </Badge>
                    )}
                    {claim.status === 'REJECTED' && (
                      <Badge variant="destructive">
                        <XCircle className="w-3 h-3 ml-1" />
                        رد شده / توکن مسترد شد
                      </Badge>
                    )}
                  </div>
                </div>
              ))}

              {myClaims.length === 0 && (
                <div className="py-12 text-center text-gray-500 space-y-2">
                  <PackageCheck className="w-8 h-8 text-gray-300 mx-auto" />
                  <p className="font-bold text-sm">هنوز پاداشی درخواست نکرده‌اید</p>
                  <p className="text-xs">با توکن‌های کسب‌شده خود از جدول پاداش‌ها، جایزه بگیرید.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* مودال دریافت یا مشارکت پاداش */}
      {claimingReward && (
        <Modal
          isOpen={!!claimingReward}
          onClose={() => setClaimingReward(null)}
          title={
            claimingReward.parent === 'پاداش نیکوکارانه'
              ? 'مشارکت در امور نیکوکارانه با توکن کا'
              : claimingReward.parent === 'پاداش‌های اختصاصی (۵ نفر برتر پایه)'
                ? 'درخواست پاداش اختصاصی (۵ نفر برتر پایه)'
                : 'تایید دریافت پاداش'
          }
        >
          <div className="space-y-5 pt-2">
            <div className={`flex items-center gap-4 p-4 rounded-2xl border ${
              claimingReward.parent === 'پاداش‌های اختصاصی (۵ نفر برتر پایه)'
                ? 'bg-amber-50 dark:bg-amber-950/20 border-amber-300 text-amber-900 dark:text-amber-200'
                : claimingReward.parent === 'پاداش نیکوکارانه'
                  ? 'bg-rose-50 dark:bg-rose-950/20 border-rose-300 text-rose-900 dark:text-rose-200'
                  : 'bg-purple-50 dark:bg-purple-950/20 border-purple-300 text-purple-900 dark:text-purple-200'
            }`}>
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                claimingReward.parent === 'پاداش‌های اختصاصی (۵ نفر برتر پایه)'
                  ? 'bg-[#F8A41D] text-gray-900'
                  : claimingReward.parent === 'پاداش نیکوکارانه'
                    ? 'bg-[#E0195B] text-white'
                    : 'bg-[#652D90] text-white'
              }`}>
                {claimingReward.parent === 'پاداش‌های اختصاصی (۵ نفر برتر پایه)' ? (
                  <Award className="w-6 h-6" />
                ) : claimingReward.parent === 'پاداش نیکوکارانه' ? (
                  <HeartHandshake className="w-6 h-6" />
                ) : (
                  <Gift className="w-6 h-6" />
                )}
              </div>
              <div>
                <h4 className="font-bold text-sm text-gray-900 dark:text-white">
                  {claimingReward.name}
                </h4>
                <div className="text-xs font-bold mt-1 opacity-90">
                  {claimingReward.parent === 'پاداش‌های اختصاصی (۵ نفر برتر پایه)' 
                    ? `موعد ارزیابی: ${claimingReward.icon || 'در لحظه'}`
                    : claimingReward.parent === 'پاداش نیکوکارانه'
                      ? 'پرداخت توکن به میزان دلخواه شما'
                      : `توکن مورد نیاز: ${formatTokenDisplay(claimingReward)}`}
                </div>
              </div>
            </div>

            {/* بخش ورودی توکن برای پاداش نیکوکارانه */}
            {claimingReward.parent === 'پاداش نیکوکارانه' && (
              <div className="space-y-3 bg-gray-50 dark:bg-gray-800/60 p-4 rounded-2xl">
                <label className="text-xs font-bold text-gray-700 dark:text-gray-200 block">
                  میزان توکن اهدایی خود را مشخص کنید:
                </label>
                <div className="flex items-center gap-3">
                  <Input
                    type="number"
                    min={1}
                    max={userTokens}
                    value={customTokenAmount}
                    onChange={(e) => setCustomTokenAmount(Number(e.target.value) || 0)}
                    className="font-black text-base text-center h-11"
                  />
                  <span className="text-xs font-bold text-gray-500 whitespace-nowrap">توکن کا (K)</span>
                </div>
                <div className="flex justify-between text-xs text-gray-500">
                  <span>حداقل اهدا: ۱ توکن</span>
                  <span>موجودی شما: {toPersianDigits(userTokens)} توکن</span>
                </div>
              </div>
            )}

            {/* فاکتور حساب کاربری */}
            <div className="space-y-2 text-xs text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800/60 p-4 rounded-2xl">
              <div className="flex justify-between">
                <span>موجودی فعلی شما:</span>
                <span className="font-bold">{toPersianDigits(userTokens)} کا (K)</span>
              </div>
              <div className="flex justify-between text-primary font-bold">
                <span>کسر از حساب:</span>
                <span>
                  {claimingReward.parent === 'پاداش‌های اختصاصی (۵ نفر برتر پایه)'
                    ? 'رایگان (ویژه ۵ نفر برتر)'
                    : claimingReward.parent === 'پاداش نیکوکارانه'
                      ? `${toPersianDigits(customTokenAmount)} کا (K)`
                      : `${toPersianDigits(claimingReward.minToken)} کا (K)`}
                </span>
              </div>
              <div className="flex justify-between border-t border-gray-200 dark:border-gray-700 pt-2 font-black">
                <span>باقیمانده توکن شما پس از ثبت:</span>
                <span>
                  {toPersianDigits(
                    userTokens - (
                      claimingReward.parent === 'پاداش‌های اختصاصی (۵ نفر برتر پایه)'
                        ? 0
                        : claimingReward.parent === 'پاداش نیکوکارانه'
                          ? customTokenAmount
                          : claimingReward.minToken
                    )
                  )} کا (K)
                </span>
              </div>
            </div>

            <p className="text-xs text-gray-500 leading-relaxed">
              {claimingReward.parent === 'پاداش‌های اختصاصی (۵ نفر برتر پایه)'
                ? 'این پاداش ویژه ۵ دانش‌آموز برتر پایه در موعد ارزیابی مشخص‌شده است و پس از تایید رتبه توسط کادر مدرسه اعطا می‌گردد.'
                : 'پس از ثبت، درخواست شما برای دفتر مدرسه ارسال می‌گردد و هماهنگی‌های لازم با شما انجام خواهد شد.'}
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setClaimingReward(null)}
                disabled={claimingLoading}
              >
                انصراف
              </Button>
              <Button
                size="sm"
                onClick={handleConfirmClaim}
                disabled={claimingLoading}
                className="bg-[#1F6E66] hover:bg-[#17544C] text-white font-bold"
              >
                {claimingLoading ? 'در حال ثبت...' : 'تایید نهایی و ثبت درخواست'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
