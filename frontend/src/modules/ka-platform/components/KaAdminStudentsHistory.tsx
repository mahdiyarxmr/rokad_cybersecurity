import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Badge } from '../../../components/ui/Badge';
import { Modal } from '../../../components/ui/Modal';
import { kaApi } from '../../../lib/api/ka';
import { 
  FileSpreadsheet, 
  Search, 
  User, 
  Clock, 
  Award, 
  Coins, 
  CheckCircle, 
  XCircle, 
  Eye, 
  Flame,
  Gift,
  School,
  Calendar
} from 'lucide-react';
import { toPersianDigits } from '../../../lib/utils';
import { utils, writeFile } from 'xlsx';
import { toast } from '../../../components/ui/toast/toast';

export const KaAdminStudentsHistory: React.FC = () => {
  const [students, setStudents] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // استیت مودال پرونده تفصیلی
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [studentDetails, setStudentDetails] = useState<any | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [stuRes, leadRes] = await Promise.all([
        kaApi.getSchoolStudents(),
        kaApi.getLeaderboard(),
      ]);
      setStudents(Array.isArray(stuRes.data) ? stuRes.data : []);
      setLeaderboard(Array.isArray(leadRes.data) ? leadRes.data : []);
    } catch (e) {
      console.error('Error fetching students for history:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDetails = async (studentId: string) => {
    setSelectedStudentId(studentId);
    setLoadingDetails(true);
    try {
      const res = await kaApi.getStudentHistory(studentId);
      setStudentDetails(res.data);
    } catch (e) {
      toast.error('خطا در دریافت پرونده دانش‌آموز');
      setSelectedStudentId(null);
    } finally {
      setLoadingDetails(false);
    }
  };

  // ترکیب اطلاعات رتبه از لیدربورد با دانش‌آموزان
  const mergedStudents = useMemo(() => {
    return students.map(st => {
      const rankInfo = leaderboard.find(l => l.studentId === st.id);
      return {
        ...st,
        rankInSchool: rankInfo?.rankInSchool || '—',
        rankInClass: rankInfo?.rankInClass || '—',
        calculatedScore: rankInfo?.kaScore !== undefined ? rankInfo.kaScore : (st.kaScore || 0),
        calculatedToken: rankInfo?.kaToken !== undefined ? rankInfo.kaToken : (st.kaToken || 0),
      };
    });
  }, [students, leaderboard]);

  const filteredStudents = useMemo(() => {
    return mergedStudents.filter(st => {
      const fullName = `${st.user?.firstName || ''} ${st.user?.lastName || ''}`;
      const code = st.studentCode || '';
      const className = st.enrollments?.[0]?.classroom?.name || '';
      const q = searchQuery.toLowerCase();
      return fullName.toLowerCase().includes(q) || code.includes(q) || className.includes(q);
    });
  }, [mergedStudents, searchQuery]);

  // استخراج فایل اکسل جامع
  const handleExportExcel = () => {
    if (mergedStudents.length === 0) {
      toast.error('داده‌ای برای خروجی اکسل وجود ندارد');
      return;
    }

    const excelData = mergedStudents.map((st, idx) => ({
      'ردیف': idx + 1,
      'رتبه در مدرسه': st.rankInSchool,
      'رتبه در کلاس': st.rankInClass,
      'نام دانش‌آموز': st.user?.firstName || '',
      'نام خانوادگی': st.user?.lastName || '',
      'شماره دانش‌آموزی': st.studentCode || '',
      'کلاس / رشته': st.enrollments?.[0]?.classroom?.name || 'تعیین نشده',
      'امتیاز کل کا': st.calculatedScore,
      'موجودی توکن': st.calculatedToken,
    }));

    const worksheet = utils.json_to_sheet(excelData);
    const workbook = utils.book_new();
    utils.book_append_sheet(workbook, worksheet, 'رتبه‌بندی و پرونده کا');

    // نام‌گذاری فایل با تاریخ روز
    writeFile(workbook, `گزارش_رتبه‌بندی_پلتفرم_کا_${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast.success('فایل اکسل با موفقیت دانلود شد');
  };

  return (
    <div className="space-y-8">
      {/* هدر بخش و دکمه خروجی اکسل */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white flex items-center gap-2">
            <User className="w-6 h-6 text-primary" />
            پرونده و ریز سوابق کا دانش‌آموزان
          </h2>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
            مشاهده ریز فعالیت‌ها، امتیازات کسب‌شده، جوایز تحویل‌گرفته و استخراج کارنامه اکسل
          </p>
        </div>

        {/* دکمه خروجی اکسل با استایل سبز نئوبروتالیسم */}
        <Button
          onClick={handleExportExcel}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-[2.5px_2.5px_0_#065F46] flex items-center gap-2"
        >
          <FileSpreadsheet className="w-4 h-4" />
          دانلود خروجی اکسل رتبه‌بندی
        </Button>
      </div>

      {/* سرچ بار و آمار */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2" />
          <Input
            placeholder="جستجوی نام، کد یا کلاس..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pr-9 text-xs rounded-xl"
          />
        </div>

        <div className="text-xs text-gray-500 font-semibold self-end sm:self-center">
          تعداد پرونده‌ها: {toPersianDigits(filteredStudents.length)} دانش‌آموز
        </div>
      </div>

      {/* جدول دانش‌آموزان و پرونده‌ها */}
      <Card className="shadow-[2.75px_2.75px_0_#202A5A] dark:shadow-[2.75px_2.75px_0_#59BBAF]">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-right">
              <thead className="bg-gray-50 dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-300 font-bold text-xs">
                <tr>
                  <th className="p-4 w-16 text-center">رتبه</th>
                  <th className="p-4">دانش‌آموز</th>
                  <th className="p-4 hidden sm:table-cell">کد دانش‌آموزی</th>
                  <th className="p-4 hidden md:table-cell">کلاس / رشته</th>
                  <th className="p-4 text-center">امتیاز کل</th>
                  <th className="p-4 text-center">توکن‌ها</th>
                  <th className="p-4 text-center w-28">اقدام</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {filteredStudents.map((st) => (
                  <tr key={st.id} className="hover:bg-gray-50/70 dark:hover:bg-gray-800/40 transition-colors">
                    <td className="p-4 text-center font-bold text-xs">
                      #{toPersianDigits(st.rankInSchool)}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 aspect-square shrink-0 rounded-xl bg-primary/15 text-primary flex items-center justify-center font-bold text-xs overflow-hidden relative">
                          {st.user?.avatarUrl ? (
                            <img
                              src={st.user.avatarUrl}
                              alt=""
                              className="w-full h-full object-cover object-center aspect-square block"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          ) : (
                            st.user?.firstName?.[0] || 'ه'
                          )}
                        </div>
                        <div>
                          <div className="font-bold text-sm text-gray-900 dark:text-white">
                            {st.user?.firstName} {st.user?.lastName}
                          </div>
                          <div className="text-[11px] text-gray-400 sm:hidden">
                            کد: {toPersianDigits(st.studentCode)}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 hidden sm:table-cell text-xs text-gray-500 font-mono">
                      {toPersianDigits(st.studentCode)}
                    </td>
                    <td className="p-4 hidden md:table-cell text-xs text-gray-600 dark:text-gray-300">
                      {st.enrollments?.[0]?.classroom?.name ? (
                        <div className="flex items-center gap-1.5">
                          <School className="w-3.5 h-3.5 text-gray-400" />
                          <span>{st.enrollments[0].classroom.name}</span>
                        </div>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="p-4 text-center">
                      <div className="inline-flex items-center gap-1 font-black text-xs text-club-normal bg-club-light dark:bg-club-darker/60 px-2.5 py-1 rounded-xl">
                        <Flame className="w-3.5 h-3.5 text-club-normal" />
                        <span>{toPersianDigits(st.calculatedScore)}</span>
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      <div className="inline-flex items-center gap-1 font-black text-xs text-college-normal bg-college-light dark:bg-college-darker/60 px-2.5 py-1 rounded-xl">
                        <Coins className="w-3.5 h-3.5 text-college-normal" />
                        <span>{toPersianDigits(st.calculatedToken)}</span>
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenDetails(st.id)}
                        className="text-xs h-8 px-2.5 hover:bg-primary hover:text-white transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5 ml-1" />
                        ریز سوابق
                      </Button>
                    </td>
                  </tr>
                ))}

                {filteredStudents.length === 0 && !loading && (
                  <tr>
                    <td colSpan={7} className="p-12 text-center text-gray-400">
                      دانش‌آموزی یافت نشد
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* مودال ریز سوابق و پرونده گیمیفیکیشن دانش‌آموز */}
      {selectedStudentId && (
        <Modal
          isOpen={!!selectedStudentId}
          onClose={() => {
            setSelectedStudentId(null);
            setStudentDetails(null);
          }}
          title="پرونده تفصیلی گیمیفیکیشن و ارزشیابی کا"
        >
          {loadingDetails ? (
            <div className="p-8 text-center text-xs text-gray-500">
              در حال دریافت سوابق دانش‌آموز...
            </div>
          ) : studentDetails ? (
            <div className="space-y-6 pt-2 max-h-[75vh] overflow-y-auto px-1">
              {/* هدر مشخصات دانش‌آموز */}
              <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 aspect-square shrink-0 rounded-2xl bg-primary/15 text-primary flex items-center justify-center font-black text-sm overflow-hidden relative">
                    {studentDetails.student?.user?.avatarUrl ? (
                      <img
                        src={studentDetails.student.user.avatarUrl}
                        alt=""
                        className="w-full h-full object-cover object-center aspect-square block"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    ) : (
                      studentDetails.student?.user?.firstName?.[0] || 'ه'
                    )}
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-bold text-base text-gray-900 dark:text-white">
                      {studentDetails.student?.user?.firstName} {studentDetails.student?.user?.lastName}
                    </h3>
                    <div className="text-xs text-gray-500 flex items-center gap-3">
                      <span>شماره دانش‌آموزی: {toPersianDigits(studentDetails.student?.studentCode)}</span>
                      <span>•</span>
                      <span>کلاس: {studentDetails.student?.enrollments?.[0]?.classroom?.name || 'نامشخص'}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <div className="p-2.5 rounded-xl bg-club-light dark:bg-club-darker/60 text-club-normal font-black text-xs">
                    {toPersianDigits(studentDetails.student?.kaScore || 0)} امتیاز کل
                  </div>
                  <div className="p-2.5 rounded-xl bg-college-light dark:bg-college-darker/60 text-college-normal font-black text-xs">
                    {toPersianDigits(studentDetails.student?.kaToken || 0)} توکن فعال
                  </div>
                </div>
              </div>

              {/* بخش ۱: فعالیت‌های ثبت‌شده */}
              <div className="space-y-3">
                <h4 className="font-bold text-xs text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-primary" />
                  تاریخچه فعالیت‌ها و امتیازات اعطایی ({toPersianDigits(studentDetails.activities?.length || 0)})
                </h4>

                <div className="divide-y divide-gray-100 dark:divide-gray-800 rounded-2xl border border-gray-200 dark:border-gray-800 max-h-52 overflow-y-auto">
                  {studentDetails.activities?.map((act: any) => (
                    <div key={act.id} className="p-3 text-xs flex items-start justify-between gap-2 hover:bg-gray-50/50">
                      <div className="space-y-1">
                        <div className="font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                          {act.activity?.name}
                          {act.activity?.parent && (
                            <span className="text-[10px] text-gray-400">({act.activity.parent})</span>
                          )}
                        </div>
                        {act.details && (
                          <div className="text-[11px] text-gray-500 line-clamp-1">{act.details}</div>
                        )}
                        {act.adminComment && (
                          <div className="text-[10px] text-primary">یادداشت داور: {act.adminComment}</div>
                        )}
                      </div>

                      <div className="text-right shrink-0">
                        <span className={`font-black text-xs block ${
                          (act.scoreAwarded || 0) < 0 ? 'text-rose-600' : 'text-emerald-600'
                        }`}>
                          {(act.scoreAwarded || 0) > 0 ? `+${toPersianDigits(act.scoreAwarded)}` : toPersianDigits(act.scoreAwarded || 0)} امتیاز
                        </span>
                        <span className="text-[10px] text-gray-400">
                          {act.status === 'APPROVED' ? 'تایید شده' : act.status === 'REJECTED' ? 'رد شده' : 'در انتظار'}
                        </span>
                      </div>
                    </div>
                  ))}

                  {studentDetails.activities?.length === 0 && (
                    <div className="p-6 text-center text-xs text-gray-400">
                      هیچ فعالیتی ثبت نشده است
                    </div>
                  )}
                </div>
              </div>

              {/* بخش ۲: پاداش‌های دریافتی */}
              <div className="space-y-3">
                <h4 className="font-bold text-xs text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                  <Gift className="w-4 h-4 text-college-normal" />
                  سوابق پاداش‌ها و جوایز خرج‌شده ({toPersianDigits(studentDetails.rewards?.length || 0)})
                </h4>

                <div className="divide-y divide-gray-100 dark:divide-gray-800 rounded-2xl border border-gray-200 dark:border-gray-800 max-h-40 overflow-y-auto">
                  {studentDetails.rewards?.map((rew: any) => (
                    <div key={rew.id} className="p-3 text-xs flex items-center justify-between hover:bg-gray-50/50">
                      <div>
                        <div className="font-bold text-gray-900 dark:text-white">
                          {rew.reward?.name}
                        </div>
                        <div className="text-[11px] text-college-normal">
                          هزینه: {toPersianDigits(rew.tokenCost || rew.token || 0)} توکن
                        </div>
                      </div>

                      <div>
                        {rew.status === 'DELIVERED' && (
                          <Badge variant="success" className="text-[10px]">تحویل داده شد</Badge>
                        )}
                        {rew.status === 'PENDING' && (
                          <Badge variant="warning" className="text-[10px]">در انتظار تحویل</Badge>
                        )}
                        {rew.status === 'REJECTED' && (
                          <Badge variant="destructive" className="text-[10px]">رد شده</Badge>
                        )}
                      </div>
                    </div>
                  ))}

                  {studentDetails.rewards?.length === 0 && (
                    <div className="p-6 text-center text-xs text-gray-400">
                      هنوز پاداشی دریافت نکرده است
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSelectedStudentId(null)}
                >
                  بستن پرونده
                </Button>
              </div>
            </div>
          ) : null}
        </Modal>
      )}
    </div>
  );
};
