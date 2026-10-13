import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Badge } from '../../../components/ui/Badge';
import { kaApi } from '../../../lib/api/ka';
import { 
  Check, 
  X, 
  Clock, 
  CheckCircle, 
  ShieldAlert, 
  PackageCheck, 
  Gift, 
  Search,
  School
} from 'lucide-react';
import { toPersianDigits } from '../../../lib/utils';
import { toast } from '../../../components/ui/toast/toast';

export const KaAdminReviewDesk: React.FC = () => {
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [claims, setClaims] = useState<any[]>([]);
  const [scores, setScores] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'submissions' | 'claims'>('submissions');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [subRes, claimRes] = await Promise.all([
        kaApi.getAdminSubmissions().catch(() => ({ data: [] })),
        kaApi.getAdminClaims().catch(() => ({ data: [] })),
      ]);
      setSubmissions(Array.isArray(subRes.data) ? subRes.data : []);
      setClaims(Array.isArray(claimRes.data) ? claimRes.data : []);
    } catch (e) {
      console.error('Error fetching admin desk data:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleReviewSubmission = async (id: string, status: 'APPROVED' | 'REJECTED') => {
    const score = Number(scores[id] || 0);
    if (status === 'APPROVED' && score <= 0) {
      return toast.error('لطفاً امتیاز تایید را وارد کنید');
    }

    try {
      await kaApi.reviewSubmission(id, {
        status,
        scoreAwarded: status === 'APPROVED' ? score : undefined,
      });
      toast.success(status === 'APPROVED' ? 'فعالیت با موفقیت تایید و امتیاز ثبت شد' : 'فعالیت رد شد');
      fetchData();
    } catch (e) {
      toast.error('خطا در بررسی فعالیت');
    }
  };

  const handleFulfillClaim = async (id: string, status: 'DELIVERED' | 'REJECTED') => {
    try {
      await kaApi.fulfillClaim(id, { status });
      toast.success(status === 'DELIVERED' ? 'پاداش به عنوان تحویل داده شده ثبت شد' : 'درخواست پاداش رد شد');
      fetchData();
    } catch (e) {
      toast.error('خطا در ثبت وضعیت پاداش');
    }
  };

  const pendingSubmissions = submissions.filter(s => {
    if (s.status !== 'PENDING') return false;
    const studentName = `${s.student?.user?.firstName || ''} ${s.student?.user?.lastName || ''}`;
    return studentName.includes(searchQuery) || (s.activity?.name || '').includes(searchQuery);
  });

  const pendingClaims = claims.filter(c => {
    if (c.status !== 'PENDING' && c.status !== 'APPROVED') return false;
    const studentName = `${c.student?.user?.firstName || ''} ${c.student?.user?.lastName || ''}`;
    return studentName.includes(searchQuery) || (c.reward?.name || '').includes(searchQuery);
  });

  return (
    <div className="space-y-8">
      {/* هدر میز کار */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-primary" />
            میز کار داوری و مدیریت معاونت
          </h2>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
            بررسی فعالیت‌های ارسالی دانش‌آموزان، اعطای امتیاز، و تایید تحویل پاداش‌های درخواستی
          </p>
        </div>

        {/* جستجوی سریع */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2" />
          <Input
            placeholder="جستجوی دانش‌آموز یا فعالیت..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pr-9 text-xs rounded-xl"
          />
        </div>
      </div>

      {/* سوئیچر تب‌ها */}
      <div className="flex items-center gap-2 border-b border-gray-200 dark:border-gray-800 pb-3">
        <button
          onClick={() => setActiveTab('submissions')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'submissions'
              ? 'bg-primary text-white shadow-[2px_2px_0_#1F413D]'
              : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <Clock className="w-4 h-4" />
          صف داوری فعالیت‌ها
          <Badge variant="neutral" className="text-[10px] py-0 px-1.5 bg-white/20 text-white">
            {toPersianDigits(pendingSubmissions.length)}
          </Badge>
        </button>

        <button
          onClick={() => setActiveTab('claims')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'claims'
              ? 'bg-college-normal text-white shadow-[2px_2px_0_#C2780E]'
              : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <PackageCheck className="w-4 h-4" />
          میز تحویل پاداش‌ها
          <Badge variant="neutral" className="text-[10px] py-0 px-1.5 bg-white/20 text-white">
            {toPersianDigits(pendingClaims.length)}
          </Badge>
        </button>
      </div>

      {/* بخش ۱: صف بررسی فعالیت‌ها */}
      {activeTab === 'submissions' && (
        <Card className="shadow-[2.75px_2.75px_0_#202A5A] dark:shadow-[2.75px_2.75px_0_#59BBAF]">
          <CardHeader className="border-b border-gray-100 dark:border-gray-800">
            <CardTitle className="text-base font-black flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-500" />
              فعالیت‌های در انتظار تایید ({toPersianDigits(pendingSubmissions.length)})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {pendingSubmissions.map((sub) => (
                <div key={sub.id} className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
                  <div className="space-y-2 max-w-xl">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-sm text-gray-900 dark:text-white">
                        {sub.activity?.name}
                      </span>
                      {sub.activity?.parent && (
                        <Badge variant="neutral" className="text-[10px]">
                          {sub.activity.parent}
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-xs text-primary font-bold">
                      <span>دانش‌آموز: {sub.student?.user?.firstName} {sub.student?.user?.lastName}</span>
                    </div>

                    <div className="text-xs text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800/50 p-3 rounded-xl border border-gray-100 dark:border-gray-800">
                      <span className="font-semibold text-gray-400 block mb-1">شرح و مدارک ثبت‌شده:</span>
                      {sub.details || 'بدون توضیحات ضمیمه'}
                    </div>
                  </div>

                  {/* پنل اکشن داوری */}
                  <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800/60 p-3 rounded-2xl border border-gray-200 dark:border-gray-700 shrink-0 self-start md:self-center">
                    <div className="space-y-1">
                      <span className="text-[10px] text-gray-400 block">امتیاز تایید:</span>
                      <Input
                        type="number"
                        placeholder="نمره..."
                        className="w-24 h-9 text-xs font-bold"
                        value={scores[sub.id] || ''}
                        onChange={e => setScores({ ...scores, [sub.id]: e.target.value })}
                      />
                    </div>
                    <div className="flex items-center gap-1.5 pt-4">
                      <Button
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white"
                        onClick={() => handleReviewSubmission(sub.id, 'APPROVED')}
                      >
                        <Check className="w-4 h-4 ml-1" />
                        تایید
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-rose-600 border-rose-200 hover:bg-rose-50"
                        onClick={() => handleReviewSubmission(sub.id, 'REJECTED')}
                      >
                        <X className="w-4 h-4 ml-1" />
                        رد
                      </Button>
                    </div>
                  </div>
                </div>
              ))}

              {pendingSubmissions.length === 0 && (
                <div className="py-16 text-center text-gray-500 space-y-2">
                  <CheckCircle className="w-10 h-10 text-emerald-500/40 mx-auto" />
                  <p className="font-bold text-sm">هیچ فعالیتی در انتظار داوری نیست</p>
                  <p className="text-xs">تمام درخواست‌های ارسالی بررسی شده‌اند.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* بخش ۲: صف تحویل پاداش‌ها */}
      {activeTab === 'claims' && (
        <Card className="shadow-[2.75px_2.75px_0_#F8A41D]">
          <CardHeader className="border-b border-gray-100 dark:border-gray-800">
            <CardTitle className="text-base font-black flex items-center gap-2">
              <Gift className="w-4 h-4 text-college-normal" />
              جوایز در انتظار تحویل ({toPersianDigits(pendingClaims.length)})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {pendingClaims.map((claim) => (
                <div key={claim.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
                  <div className="space-y-1">
                    <div className="font-bold text-sm text-gray-900 dark:text-white">
                      {claim.reward?.name}
                    </div>
                    <div className="text-xs text-primary font-bold">
                      دانش‌آموز: {claim.student?.user?.firstName} {claim.student?.user?.lastName}
                    </div>
                    <div className="text-xs text-college-normal font-semibold">
                      هزینه توکن: {toPersianDigits(claim.tokenCost || claim.token || 0)} توکن
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      className="bg-college-normal hover:bg-college-normal/90 text-white font-bold"
                      onClick={() => handleFulfillClaim(claim.id, 'DELIVERED')}
                    >
                      <PackageCheck className="w-4 h-4 ml-1" />
                      تحویل داده شد
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-rose-600 border-rose-200 hover:bg-rose-50"
                      onClick={() => handleFulfillClaim(claim.id, 'REJECTED')}
                    >
                      رد و استرداد توکن
                    </Button>
                  </div>
                </div>
              ))}

              {pendingClaims.length === 0 && (
                <div className="py-16 text-center text-gray-500 space-y-2">
                  <PackageCheck className="w-10 h-10 text-college-normal/40 mx-auto" />
                  <p className="font-bold text-sm">هیچ پاداشی در انتظار تحویل نیست</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
