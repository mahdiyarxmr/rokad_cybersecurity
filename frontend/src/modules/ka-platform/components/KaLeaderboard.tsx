import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Card, CardContent } from '../../../components/ui/Card';
import { kaApi } from '../../../lib/api/ka';
import { useAuthStore } from '../../../lib/auth/auth-store';
import { 
  Trophy, 
  Search, 
  Sparkles, 
  Flame, 
  Coins, 
  School, 
  X, 
  SlidersHorizontal,
  ChevronUp,
  UserCheck,
  Medal,
  Award
} from 'lucide-react';
import { toPersianDigits } from '../../../lib/utils';
import { Badge } from '../../../components/ui/Badge';
import { Input } from '../../../components/ui/Input';
import { KaEvaluationSliders } from './KaEvaluationSliders';
import { useScrollLock } from '../../../lib/hooks/useScrollLock';
import { useTenantStore } from '../../../lib/auth/tenant-store';

interface StudentRank {
  studentId: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  kaScore: number;
  kaToken: number;
  className: string | null;
  classroomId: string | null;
  rankInSchool: number;
  rankInClass: number;
}

export const KaLeaderboard: React.FC = () => {
  const [leaderboard, setLeaderboard] = useState<StudentRank[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewFilter, setViewFilter] = useState<'all' | 'myClass'>('all');

  // استیت مودال اسلایدرهای بازشونده از پایین (Bottom Sheet Modal)
  const [selectedStudentForModal, setSelectedStudentForModal] = useState<StudentRank | null>(null);
  const [studentSubmissions, setStudentSubmissions] = useState<any[]>([]);
  const [loadingModal, setLoadingModal] = useState(false);

  const { user } = useAuthStore();
  const { currentTenant } = useTenantStore();
  const isGirlsSchool = currentTenant?.slug === 'rokad-girls' || currentTenant?.theme === 'female';

  // قفل کردن اسکرول صفحه هنگام باز بودن باتم شیت
  useScrollLock(Boolean(selectedStudentForModal));

  // بستن مودال با کلید Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedStudentForModal(null);
      }
    };
    if (selectedStudentForModal) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedStudentForModal]);

  useEffect(() => {
    fetchLeaderboard();
  }, [currentTenant?.id, currentTenant?.slug]);

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      const res = await kaApi.getLeaderboard();
      if (Array.isArray(res.data)) {
        setLeaderboard(res.data);
      } else {
        setLeaderboard([]);
      }
    } catch (e) {
      console.error('Error fetching leaderboard:', e);
      setLeaderboard([]);
    } finally {
      setLoading(false);
    }
  };

  // باز کردن باتم‌شیت مودال اسلایدرها با کلیک روی نام هر دانش‌آموز
  const handleOpenStudentModal = async (student: StudentRank) => {
    setSelectedStudentForModal(student);
    setLoadingModal(true);
    try {
      const res = await kaApi.getStudentSummary(student.studentId);
      setStudentSubmissions(res.data?.activities || []);
    } catch (e) {
      console.error('Error loading student summary for sliders modal:', e);
      setStudentSubmissions([]);
    } finally {
      setLoadingModal(false);
    }
  };

  // پیدا کردن مشخصات دانش‌آموز لاگین شده در لیست
  const currentStudentData = useMemo(() => {
    if (!user) return null;
    return leaderboard.find(
      s => s.firstName === user.firstName && s.lastName === user.lastName
    );
  }, [leaderboard, user]);

  // فیلتر کردن لیست
  const filteredLeaderboard = useMemo(() => {
    return leaderboard.filter(item => {
      const fullName = `${item.firstName} ${item.lastName}`;
      const matchesSearch = fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.className && item.className.includes(searchQuery));
      
      if (!matchesSearch) return false;

      if (viewFilter === 'myClass' && currentStudentData?.classroomId) {
        return item.classroomId === currentStudentData.classroomId;
      }

      return true;
    });
  }, [leaderboard, searchQuery, viewFilter, currentStudentData]);

  // سه نفر اول برای سکوی افتخار (Top 3 Podium)
  const topThree = useMemo(() => {
    return leaderboard.slice(0, 3);
  }, [leaderboard]);

  const getRankBadge = (rank: number) => {
    if (rank === 1) {
      return (
        <span className="flex items-center justify-center gap-1 w-9 h-8 rounded-full bg-amber-400 text-slate-950 font-black shadow-[2px_2px_0_#92400E] text-xs">
          <Trophy className="w-3.5 h-3.5" />
          ۱
        </span>
      );
    }
    if (rank === 2) {
      return (
        <span className="flex items-center justify-center gap-1 w-9 h-8 rounded-full bg-slate-300 text-slate-900 font-black shadow-[2px_2px_0_#475569] text-xs">
          <Medal className="w-3.5 h-3.5" />
          ۲
        </span>
      );
    }
    if (rank === 3) {
      return (
        <span className="flex items-center justify-center gap-1 w-9 h-8 rounded-full bg-amber-700 text-white font-black shadow-[2px_2px_0_#451A03] text-xs">
          <Award className="w-3.5 h-3.5" />
          ۳
        </span>
      );
    }
    return (
      <span className="font-bold text-gray-500 dark:text-gray-400 text-xs">
        #{toPersianDigits(rank)}
      </span>
    );
  };

  return (
    <div className="space-y-8">
      {/* هدر بخش و توضیحات */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white flex items-center gap-2">
              <Trophy className="w-6 h-6 text-amber-500" />
              تالار قهرمانان و لیدربورد {currentTenant?.name || 'هنرستان'}
            </h2>
            <Badge variant={isGirlsSchool ? 'female' : 'male'} className="text-xs">
              {isGirlsSchool ? 'شعبه دخترانه' : 'شعبه پسرانه'}
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
            رتبه‌بندی دانش‌آموزان {isGirlsSchool ? 'هنرستان دخترانه' : 'هنرستان پسرانه'} • با کلیک روی نام هر دانش‌آموز، اسلایدرهای ۴ حوزه ارزیابی او نمایش داده می‌شود
          </p>
        </div>

        {/* فیلتر سوئیچ تب‌ها */}
        <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800/80 p-1.5 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <button
            onClick={() => setViewFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              viewFilter === 'all'
                ? 'bg-white dark:bg-[#151C28] text-primary shadow-[2px_2px_0_#59BBAF]'
                : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            کل هنرستان
          </button>
          <button
            onClick={() => setViewFilter('myClass')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              viewFilter === 'myClass'
                ? 'bg-white dark:bg-[#151C28] text-primary shadow-[2px_2px_0_#59BBAF]'
                : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            هم‌کلاسی‌های من
          </button>
        </div>
      </div>

      {/* سکوی ۳ نفر برتر (Top 3 Podium) با قابلیت کلیک برای باز شدن اسلایدرها */}
      {topThree.length >= 1 && (
        <div className="relative rounded-3xl border-2 border-primary/20 bg-gradient-to-b from-white to-gray-50 dark:from-[#151C28] dark:to-[#0F141C] p-6 sm:p-8 shadow-[3px_3px_0_#202A5A] dark:shadow-[3px_3px_0_#59BBAF]">
          <div className="flex items-center justify-center gap-2 mb-6">
            <Sparkles className="w-5 h-5 text-amber-500" />
            <span className="text-sm font-black text-gray-900 dark:text-white">سکوی افتخار و پیشتازان رکاد</span>
            <span className="text-xs text-gray-400 font-normal hidden sm:inline">(جهت مشاهده اسلایدرها کلیک کنید)</span>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:gap-6 items-end max-w-2xl mx-auto pt-4">
            {/* نفر دوم (نقره) */}
            {topThree[1] ? (
              <div 
                onClick={() => handleOpenStudentModal(topThree[1])}
                className="group cursor-pointer flex flex-col items-center text-center space-y-2 order-1 transition-transform hover:-translate-y-1"
                title="کلیک برای مشاهده اسلایدرهای ارزیابی"
              >
                <div className="relative">
                  <div className="w-14 h-14 sm:w-18 sm:h-18 aspect-square shrink-0 rounded-2xl border-2 border-slate-300 bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-800 dark:text-slate-200 font-bold text-lg shadow-[2px_2px_0_#94A3B8] group-hover:border-primary transition-colors overflow-hidden relative">
                    {topThree[1].avatarUrl ? (
                      <img
                        src={topThree[1].avatarUrl}
                        alt=""
                        className="w-full h-full object-cover object-center aspect-square block"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    ) : (
                      topThree[1].firstName[0]
                    )}
                  </div>
                  <div className="absolute -bottom-2 -right-1 bg-slate-300 text-slate-900 text-xs font-black w-6 h-6 rounded-full flex items-center justify-center border border-white">
                    ۲
                  </div>
                </div>
                <div className="space-y-0.5">
                  <div className="font-bold text-xs sm:text-sm text-gray-900 dark:text-white line-clamp-1 group-hover:text-primary transition-colors">
                    {topThree[1].firstName} {topThree[1].lastName}
                  </div>
                  <div className="text-[10px] text-gray-500 line-clamp-1">{topThree[1].className || 'رکاد'}</div>
                  <div className="text-xs font-black text-primary">
                    {toPersianDigits(topThree[1].kaScore)} امتیاز
                  </div>
                  <div className="pt-0.5">
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-primary bg-primary/10 group-hover:bg-primary group-hover:text-white px-2 py-0.5 rounded-lg border border-primary/20 transition-all">
                      <SlidersHorizontal className="w-2.5 h-2.5" />
                      اسلایدرها
                    </span>
                  </div>
                </div>
                {/* ستون سکو */}
                <div className="w-full h-20 sm:h-24 rounded-t-2xl bg-gradient-to-t from-slate-300 to-slate-200 dark:from-slate-800 dark:to-slate-700 flex items-center justify-center font-black text-slate-700 dark:text-slate-300 text-lg border-t-2 border-slate-400">
                  ۲
                </div>
              </div>
            ) : <div className="order-1" />}

            {/* نفر اول (طلا) - بلندتر و در مرکز */}
            {topThree[0] ? (
              <div 
                onClick={() => handleOpenStudentModal(topThree[0])}
                className="group cursor-pointer flex flex-col items-center text-center space-y-2 order-2 -translate-y-3 transition-transform hover:-translate-y-4"
                title="کلیک برای مشاهده اسلایدرهای ارزیابی"
              >
                <div className="relative">
                  <div className="w-14 h-14 sm:w-18 sm:h-18 aspect-square shrink-0 rounded-2xl border-2 border-amber-400 bg-amber-50 dark:bg-amber-950/50 flex items-center justify-center text-amber-900 dark:text-amber-200 font-black text-xl shadow-[3px_3px_0_#D97706] ring-4 ring-amber-400/20 group-hover:ring-primary/40 transition-all overflow-hidden relative">
                    {topThree[0].avatarUrl ? (
                      <img
                        src={topThree[0].avatarUrl}
                        alt=""
                        className="w-full h-full object-cover object-center aspect-square block"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    ) : (
                      topThree[0].firstName[0]
                    )}
                  </div>
                  <div className="absolute -bottom-2 -right-1 bg-amber-400 text-slate-950 text-xs font-black w-6 h-6 rounded-full flex items-center justify-center border border-white">
                    ۱
                  </div>
                </div>
                <div className="space-y-0.5">
                  <div className="font-black text-xs sm:text-base text-gray-900 dark:text-white line-clamp-1 group-hover:text-amber-500 transition-colors">
                    {topThree[0].firstName} {topThree[0].lastName}
                  </div>
                  <div className="text-[11px] text-gray-500 line-clamp-1">{topThree[0].className || 'رکاد'}</div>
                  <div className="text-sm font-black text-amber-600 dark:text-amber-400">
                    {toPersianDigits(topThree[0].kaScore)} امتیاز
                  </div>
                  <div className="pt-0.5">
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-100 dark:bg-amber-950/60 group-hover:bg-amber-500 group-hover:text-white px-2 py-0.5 rounded-lg border border-amber-300 transition-all">
                      <SlidersHorizontal className="w-2.5 h-2.5" />
                      اسلایدرها
                    </span>
                  </div>
                </div>
                {/* ستون سکو طلا */}
                <div className="w-full h-28 sm:h-32 rounded-t-2xl bg-gradient-to-t from-amber-400 to-amber-300 dark:from-amber-600 dark:to-amber-500 flex items-center justify-center font-black text-amber-950 text-2xl border-t-2 border-amber-300 shadow-md">
                  ۱
                </div>
              </div>
            ) : <div className="order-2" />}

            {/* نفر سوم (برنز) */}
            {topThree[2] ? (
              <div 
                onClick={() => handleOpenStudentModal(topThree[2])}
                className="group cursor-pointer flex flex-col items-center text-center space-y-2 order-3 transition-transform hover:-translate-y-1"
                title="کلیک برای مشاهده اسلایدرهای ارزیابی"
              >
                <div className="relative">
                  <div className="w-14 h-14 sm:w-18 sm:h-18 aspect-square shrink-0 rounded-2xl border-2 border-amber-700 bg-amber-100 dark:bg-amber-950/40 flex items-center justify-center text-amber-800 dark:text-amber-300 font-bold text-lg shadow-[2px_2px_0_#78350F] group-hover:border-primary transition-colors overflow-hidden relative">
                    {topThree[2].avatarUrl ? (
                      <img
                        src={topThree[2].avatarUrl}
                        alt=""
                        className="w-full h-full object-cover object-center aspect-square block"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    ) : (
                      topThree[2].firstName[0]
                    )}
                  </div>
                  <div className="absolute -bottom-2 -right-1 bg-amber-700 text-white text-xs font-black w-6 h-6 rounded-full flex items-center justify-center border border-white">
                    ۳
                  </div>
                </div>
                <div className="space-y-0.5">
                  <div className="font-bold text-xs sm:text-sm text-gray-900 dark:text-white line-clamp-1 group-hover:text-primary transition-colors">
                    {topThree[2].firstName} {topThree[2].lastName}
                  </div>
                  <div className="text-[10px] text-gray-500 line-clamp-1">{topThree[2].className || 'رکاد'}</div>
                  <div className="text-xs font-black text-primary">
                    {toPersianDigits(topThree[2].kaScore)} امتیاز
                  </div>
                  <div className="pt-0.5">
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-primary bg-primary/10 group-hover:bg-primary group-hover:text-white px-2 py-0.5 rounded-lg border border-primary/20 transition-all">
                      <SlidersHorizontal className="w-2.5 h-2.5" />
                      اسلایدرها
                    </span>
                  </div>
                </div>
                {/* ستون سکو برنز */}
                <div className="w-full h-16 sm:h-20 rounded-t-2xl bg-gradient-to-t from-amber-700 to-amber-600 dark:from-amber-900 dark:to-amber-800 flex items-center justify-center font-black text-amber-100 text-lg border-t-2 border-amber-500">
                  ۳
                </div>
              </div>
            ) : <div className="order-3" />}
          </div>
        </div>
      )}

      {/* سرچ بار و آمار رتبه‌بندی */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2" />
          <Input
            placeholder="جستجوی نام دانش‌آموز یا کلاس..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pr-9 text-xs rounded-xl"
          />
        </div>

        <div className="text-xs text-gray-500 dark:text-gray-400 font-semibold self-end sm:self-center">
          تعداد دانش‌آموزان: {toPersianDigits(filteredLeaderboard.length)} نفر
        </div>
      </div>

      {/* جدول مدرن لیدربورد با کلیک روی ردیف‌ها برای نمایش اسلایدرها */}
      <Card className="overflow-hidden shadow-[2.75px_2.75px_0_#202A5A] dark:shadow-[2.75px_2.75px_0_#59BBAF]">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-right">
              <thead className="bg-gray-50 dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-300 font-bold text-xs">
                <tr>
                  <th className="p-4 w-16 text-center">رتبه</th>
                  <th className="p-4">دانش‌آموز (کلیک برای مشاهده کارنامه و اسلایدرها)</th>
                  <th className="p-4 hidden sm:table-cell">کلاس / رشته</th>
                  <th className="p-4 text-center hidden md:table-cell">رتبه کلاسی</th>
                  <th className="p-4 text-center">امتیاز کل</th>
                  <th className="p-4 text-center">توکن‌ها</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {filteredLeaderboard.map((student) => {
                  const isCurrentUser =
                    user &&
                    student.firstName === user.firstName &&
                    student.lastName === user.lastName;

                  return (
                    <tr
                      key={student.studentId}
                      onClick={() => handleOpenStudentModal(student)}
                      className={`cursor-pointer transition-colors group ${
                        isCurrentUser
                          ? 'bg-primary/10 dark:bg-primary/20 font-bold border-r-4 border-r-primary'
                          : 'hover:bg-primary/5 dark:hover:bg-primary/10'
                      }`}
                    >
                      {/* رتبه */}
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center">
                          {getRankBadge(Number(student.rankInSchool))}
                        </div>
                      </td>

                      {/* اطلاعات دانش‌آموز */}
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 aspect-square rounded-xl bg-primary/15 text-primary flex items-center justify-center font-bold text-sm border border-primary/20 group-hover:scale-105 transition-transform shrink-0 overflow-hidden relative">
                            {student.avatarUrl ? (
                              <img
                                src={student.avatarUrl}
                                alt=""
                                className="w-full h-full object-cover object-center aspect-square block"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                }}
                              />
                            ) : (
                              student.firstName[0]
                            )}
                          </div>
                          <div>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenStudentModal(student);
                              }}
                              className="font-bold text-sm text-gray-900 dark:text-white flex flex-wrap items-center gap-2 group-hover:text-primary transition-colors text-right focus:outline-none"
                            >
                              <span>{student.firstName} {student.lastName}</span>
                              {isCurrentUser && (
                                <Badge variant="ecosystem" className="text-[10px] py-0 px-1.5">
                                  شما
                                </Badge>
                              )}
                              <span className="text-[11px] bg-primary/10 text-primary px-2 py-0.5 rounded-lg border border-primary/25 inline-flex items-center gap-1 font-semibold group-hover:bg-primary group-hover:text-white transition-all shadow-xs">
                                <SlidersHorizontal className="w-3 h-3" />
                                مشاهده اسلایدرها
                              </span>
                            </button>
                            <div className="text-[11px] text-gray-500 sm:hidden mt-0.5">
                              {student.className || 'بدون کلاس'}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* کلاس */}
                      <td className="p-4 hidden sm:table-cell text-xs text-gray-600 dark:text-gray-300">
                        {student.className ? (
                          <div className="flex items-center gap-1.5">
                            <School className="w-3.5 h-3.5 text-gray-400" />
                            <span>{student.className}</span>
                          </div>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>

                      {/* رتبه کلاسی */}
                      <td className="p-4 text-center hidden md:table-cell text-xs text-gray-500 font-semibold">
                        #{toPersianDigits(student.rankInClass)}
                      </td>

                      {/* امتیاز */}
                      <td className="p-4 text-center">
                        <div className="inline-flex items-center gap-1 font-black text-sm text-club-normal dark:text-club-light bg-club-light dark:bg-club-darker/60 px-3 py-1 rounded-xl">
                          <Flame className="w-4 h-4 text-club-normal" />
                          <span>{toPersianDigits(student.kaScore)}</span>
                        </div>
                      </td>

                      {/* توکن‌ها */}
                      <td className="p-4 text-center">
                        <div className="inline-flex items-center gap-1 font-black text-sm text-college-normal dark:text-college-light bg-college-light dark:bg-college-darker/60 px-3 py-1 rounded-xl">
                          <Coins className="w-4 h-4 text-college-normal" />
                          <span>{toPersianDigits(student.kaToken)}</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {filteredLeaderboard.length === 0 && !loading && (
                  <tr>
                    <td colSpan={6} className="p-12 text-center text-gray-500 space-y-2">
                      <Trophy className="w-8 h-8 text-gray-300 mx-auto" />
                      <p className="font-bold text-sm">هیچ نتیجه‌ای یافت نشد</p>
                      <p className="text-xs">در این دسته‌بندی یا جستجو، موردی وجود ندارد.</p>
                    </td>
                  </tr>
                )}

                {loading && (
                  <tr>
                    <td colSpan={6} className="p-12 text-center text-gray-500">
                      در حال بارگذاری جدول رتبه‌بندی...
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* ========================================================================= */}
      {/* مودال بازشونده از پایین (Bottom Sheet / Slide-up Drawer) نمایش اسلایدرها */}
      {/* ========================================================================= */}
      {selectedStudentForModal && typeof document !== 'undefined' && createPortal(
        <div 
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 transition-opacity duration-200"
          onClick={() => setSelectedStudentForModal(null)}
          role="presentation"
        >
          {/* کانتینر باتم شیت که نرم از پایین باز می‌شود */}
          <div 
            role="dialog"
            aria-modal="true"
            aria-labelledby="student-modal-title"
            className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-t-[28px] sm:rounded-t-[36px] border-t-2 border-x-2 border-primary/40 bg-white dark:bg-[#151C28] p-5 sm:p-7 shadow-[0_-12px_40px_rgba(0,0,0,0.35)] animate-sheet-slide-up pb-[max(1.5rem,env(safe-area-inset-bottom))]"
            onClick={e => e.stopPropagation()}
          >
            {/* دستگیره کشویی بالای شیت (Handle Bar) */}
            <div 
              className="w-14 h-1.5 rounded-full bg-gray-300 dark:bg-gray-700 mx-auto mb-4 cursor-pointer hover:bg-gray-400 dark:hover:bg-gray-600 transition-colors" 
              onClick={() => setSelectedStudentForModal(null)}
              title="برای بستن پنجره کلیک کنید"
            />

            {/* دکمه ضربدر بستن مودال در گوشه چپ */}
            <button
              onClick={() => setSelectedStudentForModal(null)}
              aria-label="بستن پنجره"
              className="absolute left-5 top-5 p-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* هدر اطلاعات دانش‌آموز انتخاب‌شده */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-gray-100 dark:border-gray-800 pb-5 mb-6">
              <div className="flex items-center gap-3.5">
                <div className="w-14 h-14 aspect-square rounded-2xl bg-primary/15 text-primary flex items-center justify-center font-black text-xl border-2 border-primary/30 shadow-sm shrink-0 overflow-hidden relative">
                  {selectedStudentForModal.avatarUrl ? (
                    <img
                      src={selectedStudentForModal.avatarUrl}
                      alt=""
                      className="w-full h-full object-cover object-center aspect-square block"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  ) : (
                    selectedStudentForModal.firstName[0]
                  )}
                </div>
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 id="student-modal-title" className="font-black text-xl text-gray-900 dark:text-white">
                      {selectedStudentForModal.firstName} {selectedStudentForModal.lastName}
                    </h3>
                    <Badge variant="male" className="text-xs">
                      رتبه #{toPersianDigits(selectedStudentForModal.rankInSchool)} هنرستان
                    </Badge>
                  </div>
                  <div className="text-xs text-gray-500 flex flex-wrap items-center gap-2">
                    <span>کلاس: {selectedStudentForModal.className || 'هنرستان رکاد'}</span>
                    <span>•</span>
                    <span>رتبه در کلاس: #{toPersianDigits(selectedStudentForModal.rankInClass)}</span>
                  </div>
                  <p className="text-[11px] text-gray-400 pt-0.5">
                    کارنامه تفصیلی و اسلایدرهای ۴ حوزه ارزیابی کا (آموزشی، داوطلبانه، شغلی و انضباطی)
                  </p>
                </div>
              </div>

              {/* نشان‌های امتیاز و توکن */}
              <div className="flex items-center gap-3 shrink-0">
                <div className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-club-light dark:bg-club-darker/60 border border-club-normal/30 shadow-[2px_2px_0_#652D90]">
                  <Flame className="w-4 h-4 text-club-normal" />
                  <div>
                    <span className="text-[10px] text-gray-500 block">امتیاز کل کا</span>
                    <span className="text-sm font-black text-club-normal dark:text-club-light">
                      {toPersianDigits(selectedStudentForModal.kaScore)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-college-light dark:bg-college-darker/60 border border-college-normal/30 shadow-[2px_2px_0_#F8A41D]">
                  <Coins className="w-4 h-4 text-college-normal" />
                  <div>
                    <span className="text-[10px] text-gray-500 block">موجودی توکن</span>
                    <span className="text-sm font-black text-college-normal dark:text-college-light">
                      {toPersianDigits(selectedStudentForModal.kaToken)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* بدنه مودال: اسلایدرهای ۴ حوزه ارزیابی برای این دانش‌آموز */}
            {loadingModal ? (
              <div className="py-20 text-center text-xs text-gray-500 space-y-3">
                <SlidersHorizontal className="w-8 h-8 text-primary animate-pulse mx-auto" />
                <p className="font-bold text-sm text-gray-700 dark:text-gray-300">در حال فراخوانی روند پیشرفت و اسلایدرهای دانش‌آموز...</p>
                <p className="text-xs text-gray-400">محاسبه بر اساس فرمول‌های رسمی ۲۲ فعالیت</p>
              </div>
            ) : (
              <div className="space-y-4">
                <KaEvaluationSliders submissions={studentSubmissions} />
              </div>
            )}

            {/* دکمه بستن در پایین مودال */}
            <div className="mt-8 pt-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <span className="text-xs text-gray-400 hidden sm:inline">
                برای بستن می‌توانید روی فضای بیرون مودال یا دکمه بستن کلیک کنید
              </span>
              <button
                type="button"
                onClick={() => setSelectedStudentForModal(null)}
                className="px-6 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-bold text-xs hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors mr-auto"
              >
                بستن پنجره
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
