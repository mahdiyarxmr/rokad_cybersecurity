import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Badge } from '../../../components/ui/Badge';
import { kaApi } from '../../../lib/api/ka';
import { 
  PlusCircle, 
  Sparkles, 
  Calculator, 
  Info, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Send,
  HelpCircle,
  FileText
} from 'lucide-react';
import { toPersianDigits } from '../../../lib/utils';
import { toast } from '../../../components/ui/toast/toast';

interface KaActivitySubmissionProps {
  activities: any[];
  submissions: any[];
  onSubmissionSuccess?: () => void;
}

export const KaActivitySubmission: React.FC<KaActivitySubmissionProps> = ({
  activities = [],
  submissions = [],
  onSubmissionSuccess,
}) => {
  const [selectedActivityId, setSelectedActivityId] = useState('');
  const [inputValue, setInputValue] = useState<string | number>('');
  const [enumSelection, setEnumSelection] = useState<string>('');
  const [details, setDetails] = useState('');
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL');

  // یافتن فعالیت انتخاب‌شده
  const selectedActivity = useMemo(() => {
    return activities.find(a => a.id === selectedActivityId);
  }, [activities, selectedActivityId]);

  // محاسبه‌گر زنده امتیاز تخمینی
  const estimatedScore = useMemo(() => {
    if (!selectedActivity || !selectedActivity.scoreDefinition) return null;
    const def = selectedActivity.scoreDefinition;

    if (def.inputType === 'calculated_from_value') {
      const num = parseFloat(String(inputValue));
      if (isNaN(num)) return null;
      let score = num * (def.multiplier || 1);
      if (def.min !== undefined && score < def.min) score = def.min;
      if (def.max !== undefined && score > def.max) score = def.max;
      return score;
    }

    if (def.inputType === 'select_from_enum') {
      if (!enumSelection) return null;
      const opt = def.enumOptions?.find((o: any) => o.label === enumSelection);
      return opt ? opt.value : null;
    }

    if (def.inputType === 'number_in_range') {
      const num = parseFloat(String(inputValue));
      if (isNaN(num)) return null;
      return num * (def.multiplier || 1);
    }

    return null;
  }, [selectedActivity, inputValue, enumSelection]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedActivityId) {
      toast.error('لطفاً نوع فعالیت را انتخاب کنید');
      return;
    }

    let submissionDetails = details;
    if (enumSelection) {
      submissionDetails = `[گزینه انتخابی: ${enumSelection}] ${submissionDetails}`;
    }
    if (inputValue !== '') {
      submissionDetails = `[مقدار ورودی: ${inputValue}] ${submissionDetails}`;
    }

    setLoading(true);
    try {
      await kaApi.submitActivity({
        activityId: selectedActivityId,
        details: submissionDetails,
      });
      toast.success('فعالیت شما با موفقیت برای داوری و تایید ثبت گردید');
      setSelectedActivityId('');
      setInputValue('');
      setEnumSelection('');
      setDetails('');
      if (onSubmissionSuccess) onSubmissionSuccess();
    } catch (e) {
      toast.error('خطا در ارسال فعالیت');
    } finally {
      setLoading(false);
    }
  };

  const filteredSubmissions = useMemo(() => {
    if (statusFilter === 'ALL') return submissions;
    return submissions.filter(s => s.status === statusFilter);
  }, [submissions, statusFilter]);

  return (
    <div className="space-y-8">
      {/* هدر بخش */}
      <div>
        <h2 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white flex items-center gap-2">
          <PlusCircle className="w-6 h-6 text-primary" />
          کارتابل ثبت فعالیت‌های شغلی و پروژه‌ای
        </h2>
        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
          گزارش و مدارک کارآموزی، پروژه‌های فریلنسری و قراردادهای استخدامی خود را جهت داوری و دریافت امتیاز بارگذاری نمایید
        </p>
      </div>

      {/* بنر اطلاع‌رسانی ثبت انحصاری فعالیت‌های شغلی */}
      <div className="rounded-2xl border-2 border-primary/20 bg-primary/5 dark:bg-primary/10 p-4 flex items-start gap-3">
        <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
        <div className="text-xs leading-relaxed text-gray-700 dark:text-gray-300">
          <span className="font-bold text-primary block mb-0.5">راهنمای بارگذاری فعالیت‌های دانش‌آموز:</span>
          دانش‌آموز عزیز، شما در این بخش مجاز به ثبت و درخواست امتیاز برای <strong>فعالیت‌های شغلی (کارآموزی، پروژه‌های فریلنسری درآمدی و قراردادهای استخدامی)</strong> هستید. امتیازهای مربوط به معدل، مسابقات و داوطلبانه، و همچنین موارد کسر امتیاز، مستقیماً توسط معاونت و اساتید در پرونده شما درج می‌گردد.
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* فرم ثبت فعالیت و ماشین‌حساب (ستون راست - ۲/۳) */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="shadow-[2.75px_2.75px_0_#202A5A] dark:shadow-[2.75px_2.75px_0_#59BBAF]">
            <CardHeader className="border-b border-gray-100 dark:border-gray-800 pb-4">
              <CardTitle className="text-base font-black flex items-center gap-2">
                <Send className="w-4 h-4 text-primary" />
                فرم ثبت فعالیت شغلی جدید
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* انتخاب نوع فعالیت با فیلتر صرفاً فعالیت‌های شغلی */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700 dark:text-gray-200 block">
                    انتخاب نوع فعالیت شغلی <span className="text-rose-500">*</span>
                  </label>
                  <select
                    className="w-full text-xs sm:text-sm rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#151C28] p-3 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                    value={selectedActivityId}
                    onChange={e => {
                      setSelectedActivityId(e.target.value);
                      setInputValue('');
                      setEnumSelection('');
                    }}
                  >
                    <option value="">-- برای انتخاب فعالیت شغلی کلیک کنید --</option>
                    {activities
                      .filter(a => a.parent === 'فعالیت‌های شغلی')
                      .map(act => (
                        <option key={act.id} value={act.id}>
                          {act.name} {act.description ? `(${act.description})` : ''}
                        </option>
                      ))}
                  </select>
                </div>

                {/* کارت راهنما و فرمول فعالیت انتخاب‌شده */}
                {selectedActivity && (
                  <div className="rounded-2xl border border-primary/30 bg-primary/5 dark:bg-primary/10 p-4 space-y-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-primary">
                      <Info className="w-4 h-4 shrink-0" />
                      <span>قانون محاسبه امتیاز: {selectedActivity.name}</span>
                    </div>
                    {selectedActivity.description && (
                      <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed pr-6">
                        {selectedActivity.description}
                      </p>
                    )}
                  </div>
                )}

                {/* فیلد داینامیک ورودی عدد (برای معدل یا تعداد) */}
                {selectedActivity?.scoreDefinition?.inputType === 'calculated_from_value' && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-700 dark:text-gray-200 block">
                      {selectedActivity.valueInput?.label || 'مقدار ورودی'} <span className="text-rose-500">*</span>
                    </label>
                    <Input
                      type="number"
                      placeholder={`وارد کنید (مثلاً ${selectedActivity.valueInput?.numberMin || 0} تا ${selectedActivity.valueInput?.numberMax || 100})`}
                      value={inputValue}
                      onChange={e => setInputValue(e.target.value)}
                      min={selectedActivity.valueInput?.numberMin}
                      max={selectedActivity.valueInput?.numberMax}
                      step="any"
                      required
                    />
                  </div>
                )}

                {/* فیلد داینامیک انتخابی Enum (برای رتبه یا سطح شرکت) */}
                {selectedActivity?.scoreDefinition?.inputType === 'select_from_enum' && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-700 dark:text-gray-200 block">
                      {selectedActivity.valueInput?.label || 'انتخاب گزینه'} <span className="text-rose-500">*</span>
                    </label>
                    <select
                      className="w-full text-xs sm:text-sm rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#151C28] p-3 outline-none focus:border-primary transition-colors"
                      value={enumSelection}
                      onChange={e => setEnumSelection(e.target.value)}
                      required
                    >
                      <option value="">-- انتخاب سطح یا رتبه کسب شده --</option>
                      {selectedActivity.scoreDefinition.enumOptions?.map((opt: any) => (
                        <option key={opt.label} value={opt.label}>
                          {opt.label} ({toPersianDigits(opt.value)} امتیاز)
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* ماشین‌حساب زنده پیش‌نمایش امتیاز */}
                {estimatedScore !== null && (
                  <div className="flex items-center justify-between p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-500/30">
                    <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 dark:text-emerald-300">
                      <Calculator className="w-4 h-4 text-emerald-600" />
                      <span>امتیاز تخمینی محاسبه‌شده بر اساس ورودی:</span>
                    </div>
                    <div className="text-base font-black text-emerald-600 dark:text-emerald-400">
                      {toPersianDigits(estimatedScore)} امتیاز
                    </div>
                  </div>
                )}

                {/* فیلد توضیحات یا لینک مدرک */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700 dark:text-gray-200 block">
                    توضیحات تکمیلی یا لینک مدارک / گواهی (اختیاری)
                  </label>
                  <textarea
                    rows={3}
                    placeholder="در صورت داشتن تصویر مدرک، لینک آن یا توضیحات مربوط به نحوه اجرا را بنویسید..."
                    value={details}
                    onChange={e => setDetails(e.target.value)}
                    className="w-full text-xs sm:text-sm rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#151C28] p-3 outline-none focus:border-primary transition-colors resize-none"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={loading || !selectedActivityId}
                  className="w-full font-bold shadow-[2px_2px_0_#1F413D]"
                >
                  <Send className="w-4 h-4 ml-2" />
                  {loading ? 'در حال ثبت...' : 'ارسال فعالیت برای بررسی و داوری'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* ستون چپ (۱/۳): راهنمای سطوح و قوانین */}
        <div className="space-y-4">
          <Card className="shadow-[2.75px_2.75px_0_#652D90]">
            <CardHeader className="border-b border-gray-100 dark:border-gray-800 pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-club-normal" />
                راهنمای داوری و تایید
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3 text-xs text-gray-600 dark:text-gray-300">
              <div className="flex items-start gap-2">
                <div className="w-5 h-5 rounded-full bg-club-light dark:bg-club-darker/60 text-club-normal flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                  ۱
                </div>
                <p>پس از ارسال، درخواست در صف بررسی معاونت یا استاد مربوطه قرار می‌گیرد.</p>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-5 h-5 rounded-full bg-club-light dark:bg-club-darker/60 text-club-normal flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                  ۲
                </div>
                <p>داوران با توجه به صحت مدارک، امتیاز نهایی را تایید یا در صورت نیاز اصلاح می‌کنند.</p>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-5 h-5 rounded-full bg-club-light dark:bg-club-darker/60 text-club-normal flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                  ۳
                </div>
                <p>امتیاز بلافاصله در لیدربورد مدرسه و توکن‌ها در حسابتان شارژ می‌شود.</p>
              </div>
            </CardContent>
          </Card>

          <div className="rounded-2xl border border-amber-500/30 bg-amber-50 dark:bg-amber-950/20 p-4 space-y-1.5 text-xs text-amber-800 dark:text-amber-300">
            <div className="font-bold flex items-center gap-1.5">
              <HelpCircle className="w-4 h-4" />
              <span>کسورات انضباطی</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              موارد تاخیر یا غیبت غیرموجه به صورت منفی در سامانه رصد می‌شوند؛ حضور منظم به حفظ رتبه شما کمک می‌کند.
            </p>
          </div>
        </div>
      </div>

      {/* بخش تاریخچه سوابق فعالیت‌های ارسالی */}
      <Card className="shadow-[2.75px_2.75px_0_#202A5A] dark:shadow-[2.75px_2.75px_0_#59BBAF]">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-100 dark:border-gray-800 gap-3">
          <CardTitle className="text-base font-black flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" />
            سوابق فعالیت‌های ثبت‌شده من
          </CardTitle>

          {/* فیلتر وضعیت */}
          <div className="flex items-center gap-1">
            {(['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as const).map(st => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                  statusFilter === st
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                {st === 'ALL' && 'همه'}
                {st === 'PENDING' && 'در انتظار'}
                {st === 'APPROVED' && 'تایید شده'}
                {st === 'REJECTED' && 'رد شده'}
              </button>
            ))}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {filteredSubmissions.map((sub: any) => (
              <div
                key={sub.id}
                className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors"
              >
                <div className="space-y-1">
                  <div className="font-bold text-sm text-gray-900 dark:text-white flex items-center gap-2">
                    {sub.activity?.name}
                    {sub.activity?.parent && (
                      <Badge variant="neutral" className="text-[10px] py-0 px-1.5">
                        {sub.activity.parent}
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 line-clamp-2">
                    {sub.details || 'بدون توضیحات ضمیمه'}
                  </div>
                </div>

                <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 shrink-0">
                  {sub.status === 'PENDING' && (
                    <Badge variant="warning">
                      <Clock className="w-3 h-3 ml-1" />
                      در انتظار بررسی
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

            {filteredSubmissions.length === 0 && (
              <div className="py-12 text-center text-gray-500 space-y-2">
                <FileText className="w-8 h-8 text-gray-300 mx-auto" />
                <p className="font-bold text-sm">هیچ فعالیتی در این وضعیت وجود ندارد</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
