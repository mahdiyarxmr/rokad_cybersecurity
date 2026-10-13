import React from 'react';
import { StatCard } from '../../../components/ui/StatCard';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { 
  Trophy, 
  Award, 
  Coins, 
  Flame, 
  PlusCircle, 
  ShoppingBag, 
  Clock, 
  CheckCircle, 
  XCircle, 
  ChevronLeft,
  Sparkles,
  TrendingUp
} from 'lucide-react';
import { toPersianDigits } from '../../../lib/utils';
import { KaEvaluationSliders } from './KaEvaluationSliders';

interface KaOverviewDashboardProps {
  score: number;
  tokens: number;
  rankInSchool?: number | null;
  rankInClass?: number | null;
  activities: any[];
  submissions: any[];
  rewards: any[];
  onNavigateTab: (tab: string) => void;
}

export const KaOverviewDashboard: React.FC<KaOverviewDashboardProps> = ({
  score = 0,
  tokens = 0,
  rankInSchool,
  rankInClass,
  activities = [],
  submissions = [],
  rewards = [],
  onNavigateTab,
}) => {
  const recentSubmissions = submissions.slice(0, 4);
  const popularRewards = rewards.slice(0, 3);

  return (
    <div className="space-y-8">
      {/* ردیف ۴ کارت آماری استاندارد بر اساس ۵ پرسونای رکاد */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        <StatCard
          title="امتیاز کل مهارتی"
          value={score}
          subtitle="مجموع امتیازهای تایید شده"
          icon={Flame}
          theme="club"
          onClick={() => onNavigateTab('activities')}
        />
        <StatCard
          title="توکن‌های پاداش فعال"
          value={tokens}
          subtitle="موجودی آماده خرید پاداش"
          icon={Coins}
          theme="college"
          onClick={() => onNavigateTab('rewards')}
        />
        <StatCard
          title="رتبه در کل هنرستان"
          value={rankInSchool ? `#${rankInSchool}` : '—'}
          subtitle="جایگاه میان تمام دانش‌آموزان"
          icon={Trophy}
          theme="ecosystem"
          onClick={() => onNavigateTab('leaderboard')}
        />
        <StatCard
          title="رتبه در کلاس"
          value={rankInClass ? `#${rankInClass}` : '—'}
          subtitle="رقابت با هم‌کلاسی‌ها"
          icon={Award}
          theme="male"
          onClick={() => onNavigateTab('leaderboard')}
        />
      </div>

      {/* وضعیت دسته‌بندی فعالیت‌ها و روند پیشرفت در ۴ حوزه امتیازدهی */}
      <KaEvaluationSliders submissions={submissions} />

      {/* ردیف دسترسی سریع و ماموریت‌های ویژه */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div 
          onClick={() => onNavigateTab('activities')}
          className="group cursor-pointer rounded-2xl border-2 border-dashed border-primary/40 bg-primary/5 dark:bg-primary/10 p-5 hover:bg-primary/10 dark:hover:bg-primary/20 transition-all shadow-[2.75px_2.75px_0_#59BBAF]"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-primary text-white shadow-sm group-hover:scale-105 transition-transform">
                <PlusCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-gray-900 dark:text-white">ثبت فعالیت جدید</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">کارآموزی، مسابقه، معدل یا پروژه</p>
              </div>
            </div>
            <ChevronLeft className="w-5 h-5 text-gray-400 group-hover:-translate-x-1 transition-transform" />
          </div>
        </div>

        <div 
          onClick={() => onNavigateTab('rewards')}
          className="group cursor-pointer rounded-2xl border-2 border-dashed border-college-normal/40 bg-college-light/40 dark:bg-college-darker/20 p-5 hover:bg-college-light/60 transition-all shadow-[2.75px_2.75px_0_#F8A41D]"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-college-normal text-white shadow-sm group-hover:scale-105 transition-transform">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-gray-900 dark:text-white">بازارچه پاداش‌ها</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">خرج توکن برای جوایز جذاب</p>
              </div>
            </div>
            <ChevronLeft className="w-5 h-5 text-gray-400 group-hover:-translate-x-1 transition-transform" />
          </div>
        </div>

        <div 
          onClick={() => onNavigateTab('leaderboard')}
          className="group cursor-pointer rounded-2xl border-2 border-dashed border-club-normal/40 bg-club-light/40 dark:bg-club-darker/20 p-5 hover:bg-club-light/60 transition-all shadow-[2.75px_2.75px_0_#652D90]"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-club-normal text-white shadow-sm group-hover:scale-105 transition-transform">
                <Trophy className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-gray-900 dark:text-white">تالار افتخارات</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">مشاهده رتبه در مدرسه و کلاس</p>
              </div>
            </div>
            <ChevronLeft className="w-5 h-5 text-gray-400 group-hover:-translate-x-1 transition-transform" />
          </div>
        </div>
      </div>

      {/* دو ستون: آخرین فعالیت‌ها و جوایز پیشنهادی */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ستون راست (۲/۳): آخرین سوابق فعالیت */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="shadow-[2.75px_2.75px_0_#202A5A] dark:shadow-[2.75px_2.75px_0_#59BBAF]">
            <CardHeader className="flex flex-row items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-4">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                <CardTitle className="text-base font-black">آخرین فعالیت‌های ارسالی من</CardTitle>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => onNavigateTab('activities')}
                className="text-xs text-primary hover:text-primary/80"
              >
                مشاهده همه
                <ChevronLeft className="w-3.5 h-3.5 mr-1" />
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {recentSubmissions.map((sub: any) => (
                  <div key={sub.id} className="p-4 sm:p-5 flex items-center justify-between hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-gray-900 dark:text-white">{sub.activity?.name}</span>
                        {sub.activity?.parent && (
                          <Badge variant="neutral" className="text-[10px] py-0 px-2">
                            {sub.activity.parent}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1">
                        {sub.details || 'بدون توضیحات ضمیمه'}
                      </p>
                    </div>

                    <div className="flex flex-col items-end gap-1 shrink-0">
                      {sub.status === 'PENDING' && (
                        <Badge variant="warning">
                          <Clock className="w-3 h-3 ml-1" />
                          در انتظار داوری
                        </Badge>
                      )}
                      {sub.status === 'APPROVED' && (
                        <Badge variant="success">
                          <CheckCircle className="w-3 h-3 ml-1" />
                          تایید شده
                        </Badge>
                      )}
                      {sub.status === 'REJECTED' && (
                        <Badge variant="destructive">
                          <XCircle className="w-3 h-3 ml-1" />
                          رد شده
                        </Badge>
                      )}

                      {sub.scoreAwarded > 0 && (
                        <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                          +{toPersianDigits(sub.scoreAwarded)} امتیاز
                        </span>
                      )}
                    </div>
                  </div>
                ))}

                {recentSubmissions.length === 0 && (
                  <div className="py-12 text-center text-gray-500 dark:text-gray-400 space-y-3">
                    <Sparkles className="w-8 h-8 text-primary/40 mx-auto" />
                    <p className="text-sm font-semibold">هنوز فعالیتی ثبت نکرده‌اید!</p>
                    <p className="text-xs max-w-xs mx-auto">برای ارتقای رتبه خود در جدول رتبه‌بندی مدرسه، فعالیت‌های مهارتی خود را ثبت کنید.</p>
                    <Button 
                      size="sm" 
                      onClick={() => onNavigateTab('activities')}
                      className="mt-2"
                    >
                      ثبت اولین فعالیت
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ستون چپ (۱/۳): پاداش‌های برگزیده و پیشنهادی */}
        <div className="space-y-4">
          <Card className="shadow-[2.75px_2.75px_0_#F8A41D]">
            <CardHeader className="flex flex-row items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-4">
              <div className="flex items-center gap-2">
                <Coins className="w-4 h-4 text-college-normal" />
                <CardTitle className="text-base font-black">جوایز برگزیده</CardTitle>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => onNavigateTab('rewards')}
                className="text-xs text-college-normal hover:text-college-normal/80"
              >
                فروشگاه
                <ChevronLeft className="w-3.5 h-3.5 mr-1" />
              </Button>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              {popularRewards.map((reward: any) => (
                <div 
                  key={reward.id}
                  onClick={() => onNavigateTab('rewards')}
                  className="group cursor-pointer flex items-center justify-between p-3 rounded-xl border border-gray-200 dark:border-gray-800 hover:border-college-normal/50 bg-gray-50/50 dark:bg-gray-800/50 hover:bg-college-light/20 transition-all"
                >
                  <div className="space-y-0.5">
                    <div className="font-bold text-xs text-gray-900 dark:text-white group-hover:text-college-normal transition-colors">
                      {reward.name}
                    </div>
                    <div className="text-[11px] text-gray-500">
                      {reward.parent || 'پاداش ویژه'}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-xs font-black text-college-normal bg-college-light dark:bg-college-darker/60 px-2 py-1 rounded-lg">
                    <Coins className="w-3.5 h-3.5" />
                    <span>{toPersianDigits(reward.minToken || reward.tokenCost || 10)}</span>
                  </div>
                </div>
              ))}

              {popularRewards.length === 0 && (
                <div className="py-8 text-center text-xs text-gray-500">
                  به زودی جوایز جدید به باشگاه اضافه می‌شوند.
                </div>
              )}

              <Button 
                variant="outline" 
                onClick={() => onNavigateTab('rewards')} 
                className="w-full text-xs font-bold mt-2 border-college-normal/40 text-college-normal hover:bg-college-light/40"
              >
                ورود به بازارچه جوایز
              </Button>
            </CardContent>
          </Card>

          {/* کارت راهنمای امتیازدهی */}
          <div className="rounded-2xl border border-primary/20 bg-primary/5 dark:bg-primary/10 p-4 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-primary">
              <TrendingUp className="w-4 h-4" />
              <span>چگونه امتیاز بیشتری بگیریم؟</span>
            </div>
            <p className="text-[11px] text-gray-600 dark:text-gray-300 leading-relaxed">
              با ثبت معدل کارنامه، کسب مدارک دوره‌های مهارتی، انجام پروژه‌های فریلنسری و فعالیت‌های داوطلبانه، امتیاز و توکن دریافت کنید.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
