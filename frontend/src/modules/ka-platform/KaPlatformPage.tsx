import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../lib/auth/auth-store';
import { kaApi } from '../../lib/api/ka';
import { KaHeaderBanner } from './components/KaHeaderBanner';
import { KaOverviewDashboard } from './components/KaOverviewDashboard';
import { KaLeaderboard } from './components/KaLeaderboard';
import { KaRewardsStore } from './components/KaRewardsStore';
import { KaActivitySubmission } from './components/KaActivitySubmission';
import { KaAdminReviewDesk } from './components/KaAdminReviewDesk';
import { KaAdminDirectEntry } from './components/KaAdminDirectEntry';
import { KaAdminStudentsHistory } from './components/KaAdminStudentsHistory';
import { 
  LayoutDashboard, 
  Trophy, 
  ShoppingBag, 
  PlusCircle, 
  ShieldCheck, 
  Send, 
  Users,
  Sparkles,
} from 'lucide-react';
import { UnderDevelopmentOverlay } from '../../components/ui/UnderDevelopmentOverlay';

export const KaPlatformPage: React.FC = () => {
  const { user } = useAuthStore();
  
  // بررسی دسترسی اداری (معاون، مدیر، ادمین سیستم)
  const isAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'SCHOOL_ADMIN' || user?.role === 'STAFF';

  // تب پیش‌فرض: برای ادمین داوری و برای دانش‌آموز داشبورد
  const [adminTab, setAdminTab] = useState<'reviewDesk' | 'directEntry' | 'leaderboard' | 'studentsHistory'>('reviewDesk');
  const [studentTab, setStudentTab] = useState<'overview' | 'leaderboard' | 'rewards' | 'careerActivities'>('overview');

  // داده‌های عمومی پلتفرم
  const [activities, setActivities] = useState<any[]>([]);
  const [rewards, setRewards] = useState<any[]>([]);
  const [mySubmissions, setMySubmissions] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [adminSubmissions, setAdminSubmissions] = useState<any[]>([]);
  const [adminClaims, setAdminClaims] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInitialData();
  }, [isAdmin]);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const calls: Promise<any>[] = [
        kaApi.getActivities().catch(() => ({ data: [] })),
        kaApi.getRewards().catch(() => ({ data: [] })),
        kaApi.getLeaderboard().catch(() => ({ data: [] })),
      ];

      if (isAdmin) {
        calls.push(kaApi.getAdminSubmissions().catch(() => ({ data: [] })));
        calls.push(kaApi.getAdminClaims().catch(() => ({ data: [] })));
        calls.push(kaApi.getSchoolStudents().catch(() => ({ data: [] })));
      } else {
        calls.push(kaApi.getMySubmissions().catch(() => ({ data: [] })));
      }

      const results = await Promise.all(calls);
      setActivities(Array.isArray(results[0]?.data) ? results[0].data : []);
      setRewards(Array.isArray(results[1]?.data) ? results[1].data : []);
      setLeaderboard(Array.isArray(results[2]?.data) ? results[2].data : []);

      if (isAdmin) {
        setAdminSubmissions(Array.isArray(results[3]?.data) ? results[3].data : []);
        setAdminClaims(Array.isArray(results[4]?.data) ? results[4].data : []);
        setStudents(Array.isArray(results[5]?.data) ? results[5].data : []);
      } else {
        setMySubmissions(Array.isArray(results[3]?.data) ? results[3].data : []);
      }
    } catch (e) {
      console.error('Error loading Ka Platform data:', e);
    } finally {
      setLoading(false);
    }
  };

  // استخراج امتیاز، توکن و رتبه کاربر فعلی در صورتی که دانش‌آموز باشد
  const currentStudentStats = React.useMemo(() => {
    if (!user || isAdmin) return { score: 0, tokens: 0, rankInSchool: null, rankInClass: null };
    const found = leaderboard.find(
      s => s.firstName === user.firstName && s.lastName === user.lastName
    );
    if (found) {
      return {
        score: found.kaScore || 0,
        tokens: found.kaToken || 0,
        rankInSchool: found.rankInSchool || null,
        rankInClass: found.rankInClass || null,
      };
    }
    return { score: 0, tokens: 0, rankInSchool: null, rankInClass: null };
  }, [leaderboard, user, isAdmin]);

  const pendingSubmissionsCount = adminSubmissions.filter(s => s.status === 'PENDING').length;
  const pendingClaimsCount = adminClaims.filter(c => c.status === 'PENDING' || c.status === 'APPROVED').length;

  return (
    <UnderDevelopmentOverlay
      title="پلتفرم شایستگی‌های کا"
      subtitle="Ka Competency & Rewards Platform"
      description="سامانه هوشمند ارزشیابی شایستگی‌ها، کسب توکن «کا»، تابلوی افتخارات و فروشگاه پاداش‌ها در مرحله توسعه نهایی است و به زودی رونمایی می‌شود."
      badgeText="پلتفرم کا • در حال توسعه"
      icon={Sparkles}
      accentColor="amber"
    >
      <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* بنر اصلی و هویت بصری پلتفرم کا */}
      <KaHeaderBanner
        score={currentStudentStats.score}
        tokens={currentStudentStats.tokens}
        rankInSchool={currentStudentStats.rankInSchool}
        rankInClass={currentStudentStats.rankInClass}
        userName={user?.firstName}
        isAdmin={isAdmin}
        totalStudentsCount={students.length || leaderboard.length}
        pendingSubmissionsCount={pendingSubmissionsCount}
        pendingClaimsCount={pendingClaimsCount}
      />

      {/* نوار ناوبری تب‌های پلتفرم کا - تفکیک شده برای ادمین و دانش‌آموز */}
      {isAdmin ? (
        /* نوار تب‌های ویژه کادر مدرسه و معاونت */
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none border-b border-gray-200 dark:border-gray-800">
          <button
            onClick={() => setAdminTab('reviewDesk')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-black whitespace-nowrap transition-all ${
              adminTab === 'reviewDesk'
                ? 'bg-primary text-white shadow-[2.75px_2.75px_0_#1F413D]'
                : 'bg-white dark:bg-[#151C28] text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-800 hover:border-primary/50'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            میز داوری و تحویل پاداش
            {pendingSubmissionsCount + pendingClaimsCount > 0 && (
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            )}
          </button>

          <button
            onClick={() => setAdminTab('directEntry')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-black whitespace-nowrap transition-all ${
              adminTab === 'directEntry'
                ? 'bg-secondary text-white shadow-[2.75px_2.75px_0_#202A5A]'
                : 'bg-white dark:bg-[#151C28] text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-800 hover:border-secondary/50'
            }`}
          >
            <Send className="w-4 h-4" />
            ثبت مستقیم امتیاز (تشویقی / انضباطی)
          </button>

          <button
            onClick={() => setAdminTab('leaderboard')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-black whitespace-nowrap transition-all ${
              adminTab === 'leaderboard'
                ? 'bg-amber-500 text-white shadow-[2.75px_2.75px_0_#92400E]'
                : 'bg-white dark:bg-[#151C28] text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-800 hover:border-amber-500/50'
            }`}
          >
            <Trophy className="w-4 h-4" />
            تالار افتخارات و رتبه‌بندی
          </button>

          <button
            onClick={() => setAdminTab('studentsHistory')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-black whitespace-nowrap transition-all ${
              adminTab === 'studentsHistory'
                ? 'bg-emerald-600 text-white shadow-[2.75px_2.75px_0_#065F46]'
                : 'bg-white dark:bg-[#151C28] text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-800 hover:border-emerald-500/50'
            }`}
          >
            <Users className="w-4 h-4" />
            ریز پرونده‌های کا و گزارش اکسل
          </button>
        </div>
      ) : (
        /* نوار تب‌های اختصاصی دانش‌آموز */
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none border-b border-gray-200 dark:border-gray-800">
          <button
            onClick={() => setStudentTab('overview')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-black whitespace-nowrap transition-all ${
              studentTab === 'overview'
                ? 'bg-primary text-white shadow-[2.75px_2.75px_0_#1F413D]'
                : 'bg-white dark:bg-[#151C28] text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-800 hover:border-primary/50'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            داشبورد من
          </button>

          <button
            onClick={() => setStudentTab('leaderboard')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-black whitespace-nowrap transition-all ${
              studentTab === 'leaderboard'
                ? 'bg-amber-500 text-white shadow-[2.75px_2.75px_0_#92400E]'
                : 'bg-white dark:bg-[#151C28] text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-800 hover:border-amber-500/50'
            }`}
          >
            <Trophy className="w-4 h-4" />
            تالار افتخارات و رتبه‌بندی
          </button>

          <button
            onClick={() => setStudentTab('rewards')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-black whitespace-nowrap transition-all ${
              studentTab === 'rewards'
                ? 'bg-college-normal text-white shadow-[2.75px_2.75px_0_#C2780E]'
                : 'bg-white dark:bg-[#151C28] text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-800 hover:border-college-normal/50'
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            بازارچه جوایز و توکن‌ها
          </button>

          <button
            onClick={() => setStudentTab('careerActivities')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-black whitespace-nowrap transition-all ${
              studentTab === 'careerActivities'
                ? 'bg-club-normal text-white shadow-[2.75px_2.75px_0_#381552]'
                : 'bg-white dark:bg-[#151C28] text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-800 hover:border-club-normal/50'
            }`}
          >
            <PlusCircle className="w-4 h-4" />
            ثبت فعالیت‌های شغلی
          </button>
        </div>
      )}

      {/* محتوای تب فعال بر اساس نقش */}
      <div className="pt-2">
        {isAdmin ? (
          <>
            {adminTab === 'reviewDesk' && <KaAdminReviewDesk />}
            {adminTab === 'directEntry' && (
              <KaAdminDirectEntry
                activities={activities}
                onDirectEntrySuccess={() => fetchInitialData()}
              />
            )}
            {adminTab === 'leaderboard' && <KaLeaderboard />}
            {adminTab === 'studentsHistory' && <KaAdminStudentsHistory />}
          </>
        ) : (
          <>
            {studentTab === 'overview' && (
              <KaOverviewDashboard
                score={currentStudentStats.score}
                tokens={currentStudentStats.tokens}
                rankInSchool={currentStudentStats.rankInSchool}
                rankInClass={currentStudentStats.rankInClass}
                activities={activities}
                submissions={mySubmissions}
                rewards={rewards}
                onNavigateTab={(tab) => {
                  if (tab === 'activities') setStudentTab('careerActivities');
                  else if (tab === 'rewards') setStudentTab('rewards');
                  else if (tab === 'leaderboard') setStudentTab('leaderboard');
                }}
              />
            )}

            {studentTab === 'leaderboard' && <KaLeaderboard />}

            {studentTab === 'rewards' && (
              <KaRewardsStore
                userTokens={currentStudentStats.tokens}
                onRewardClaimed={() => fetchInitialData()}
              />
            )}

            {studentTab === 'careerActivities' && (
              <KaActivitySubmission
                activities={activities}
                submissions={mySubmissions}
                onSubmissionSuccess={() => fetchInitialData()}
              />
            )}
          </>
        )}
      </div>
      </div>
    </UnderDevelopmentOverlay>
  );
};
