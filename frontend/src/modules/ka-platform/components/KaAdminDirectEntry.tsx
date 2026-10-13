import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Badge } from '../../../components/ui/Badge';
import { kaApi } from '../../../lib/api/ka';
import { 
  PlusCircle, 
  MinusCircle, 
  Send, 
  User, 
  School, 
  Calculator, 
  Info, 
  Sparkles,
  Search,
  CheckCircle2
} from 'lucide-react';
import { toPersianDigits } from '../../../lib/utils';
import { toast } from '../../../components/ui/toast/toast';

interface KaAdminDirectEntryProps {
  activities: any[];
  onDirectEntrySuccess?: () => void;
}

export const KaAdminDirectEntry: React.FC<KaAdminDirectEntryProps> = ({
  activities = [],
  onDirectEntrySuccess,
}) => {
  const [students, setStudents] = useState<any[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [studentSearch, setStudentSearch] = useState('');

  const [selectedActivityId, setSelectedActivityId] = useState('');
  const [inputValue, setInputValue] = useState<string | number>('');
  const [enumSelection, setEnumSelection] = useState<string>('');
  const [customScoreOverride, setCustomScoreOverride] = useState<string>('');
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    setLoadingStudents(true);
    try {
      const res = await kaApi.getSchoolStudents();
      setStudents(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.error('Error fetching students:', e);
    } finally {
      setLoadingStudents(false);
    }
  };

  // یافتن فعالیت انتخاب‌شده
  const selectedActivity = useMemo(() => {
    return activities.find(a => a.id === selectedActivityId);
  }, [activities, selectedActivityId]);

  // محاسبه خودکار امتیاز بر اساس فرمول فعالیت
  const calculatedScore = useMemo(() => {
    if (!selectedActivity || !selectedActivity.scoreDefinition) return null;
    const def = selectedActivity.scoreDefinition;

    if (def.inputType === 'calculated_from_value') {
      const num = parseFloat(String(inputValue));
      if (isNaN(num)) return null;
      let score = num * (def.multiplier ?? 1);
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
      return num * (def.multiplier ?? 1);
    }

    return null;
  }, [selectedActivity, inputValue, enumSelection]);

  // امتیاز نهایی قابل اعمال (با امکان ویرایش دستی توسط ادمین در صورت نیاز)
  const finalScore = useMemo(() => {
    if (customScoreOverride !== '') {
      const parsed = parseFloat(customScoreOverride);
      return isNaN(parsed) ? 0 : parsed;
    }
    return calculatedScore !== null ? calculatedScore : 0;
  }, [customScoreOverride, calculatedScore]);

  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const fullName = `${s.user?.firstName || ''} ${s.user?.lastName || ''}`;
      const code = s.studentCode || '';
      const className = s.enrollments?.[0]?.classroom?.name || '';
      const q = studentSearch.toLowerCase();
      return fullName.toLowerCase().includes(q) || code.includes(q) || className.includes(q);
    });
  }, [students, studentSearch]);

  const selectedStudent = useMemo(() => {
    return students.find(s => s.id === selectedStudentId);
  }, [students, selectedStudentId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId) {
      toast.error('لطفاً دانش‌آموز مورد نظر را انتخاب کنید');
      return;
    }
    if (!selectedActivityId) {
      toast.error('لطفاً نوع فعالیت یا مورد انضباطی را انتخاب کنید');
      return;
    }
    if (finalScore === 0 && customScoreOverride === '') {
      toast.error('لطفاً مقادیر فعالیت را جهت محاسبه امتیاز وارد کنید');
      return;
    }

    let note = details;
    if (enumSelection) note = `[سطح: ${enumSelection}] ${note}`;
    if (inputValue !== '') note = `[مقدار ورودی: ${inputValue}] ${note}`;

    setSubmitting(true);
    try {
      await kaApi.directAward({
        studentId: selectedStudentId,
        activityId: selectedActivityId,
        scoreAwarded: finalScore,
        details: note,
        adminComment: 'ثبت مستقیم توسط معاونت هنرستان',
      });

      const isNegative = finalScore < 0;
      toast.success(
        isNegative
          ? `کسر ${toPersianDigits(Math.abs(finalScore))} امتیاز انضباطی با موفقیت در پرونده دانش‌آموز ثبت شد`
          : `اعطای ${toPersianDigits(finalScore)} امتیاز با موفقیت در پرونده دانش‌آموز ثبت گردید`
      );

      // پاک کردن فرم
      setInputValue('');
      setEnumSelection('');
      setCustomScoreOverride('');
      setDetails('');
      if (onDirectEntrySuccess) onDirectEntrySuccess();
    } catch (e) {
      toast.error('خطا در ثبت مستقیم امتیاز');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white flex items-center gap-2">
          <PlusCircle className="w-6 h-6 text-primary" />
          ثبت مستقیم امتیاز و موارد انضباطی دانش‌آموزان
        </h2>
        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
          کادر معاونت و اساتید می‌توانند به صورت مستقیم امتیازات آموزشی، مسابقات، فعالیت‌های داوطلبانه یا کسورات انضباطی را در پرونده دانش‌آموز درج کنند
        </p>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ستون راست (۲/۳): انتخاب فعالیت و مقادیر ورودی */}
        <div className="lg:col-span-2 space-y-5">
          {/* کارت فرم ثبت فعالیت */}
          <Card className="shadow-[2.75px_2.75px_0_#202A5A] dark:shadow-[2.75px_2.75px_0_#59BBAF]">
            <CardHeader className="border-b border-gray-100 dark:border-gray-800 pb-4">
              <CardTitle className="text-base font-black flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                مشخصات فعالیت و فرمول امتیاز
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-5">
              {/* انتخاب نوع فعالیت از بین تمامی دسته‌ها */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 dark:text-gray-200 block">
                  انتخاب نوع فعالیت / مورد تشویقی یا تنبیهی <span className="text-rose-500">*</span>
                </label>
                <select
                  className="w-full text-xs sm:text-sm rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#151C28] p-3 outline-none focus:border-primary transition-colors"
                  value={selectedActivityId}
                  onChange={e => {
                    setSelectedActivityId(e.target.value);
                    setInputValue('');
                    setEnumSelection('');
                    setCustomScoreOverride('');
                  }}
                  required
                >
                  <option value="">-- انتخاب فعالیت یا بند انضباطی --</option>
                  {Array.from(new Set(activities.map(a => a.parent || 'سایر'))).map(parent => (
                    <optgroup key={parent} label={parent}>
                      {activities
                        .filter(a => (a.parent || 'سایر') === parent)
                        .map(act => (
                          <option key={act.id} value={act.id}>
                            {act.name} {act.description ? `(${act.description})` : ''}
                          </option>
                        ))}
                    </optgroup>
                  ))}
                </select>
              </div>

              {/* نمایش راهنمای قانون فعالیت انتخاب‌شده */}
              {selectedActivity && (
                <div className="rounded-2xl border border-primary/30 bg-primary/5 dark:bg-primary/10 p-4 space-y-1.5">
                  <div className="flex items-center gap-2 text-xs font-bold text-primary">
                    <Info className="w-4 h-4 shrink-0" />
                    <span>دسته‌بندی: {selectedActivity.parent} — ضابطه امتیاز:</span>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-300 pr-6 leading-relaxed">
                    {selectedActivity.description || 'بدون توضیحات ضمیمه'}
                  </p>
                </div>
              )}

              {/* فیلد ورودی عدد (برای معدل یا تعداد جلسات/رویداد) */}
              {selectedActivity?.scoreDefinition?.inputType === 'calculated_from_value' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700 dark:text-gray-200 block">
                    {selectedActivity.valueInput?.label || 'مقدار ورودی'} <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    type="number"
                    placeholder={`وارد کنید (مثلاً ${selectedActivity.valueInput?.numberMin ?? 0} تا ${selectedActivity.valueInput?.numberMax ?? 100})`}
                    value={inputValue}
                    onChange={e => setInputValue(e.target.value)}
                    min={selectedActivity.valueInput?.numberMin}
                    max={selectedActivity.valueInput?.numberMax}
                    step="any"
                    required
                  />
                </div>
              )}

              {/* فیلد انتخابی Enum (برای رتبه یا سطوح رویداد) */}
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
                    <option value="">-- انتخاب رتبه / سطح مربوطه --</option>
                    {selectedActivity.scoreDefinition.enumOptions?.map((opt: any) => (
                      <option key={opt.label} value={opt.label}>
                        {opt.label} ({toPersianDigits(opt.value)} امتیاز)
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* نمایش امتیاز محاسبه‌شده و فیلد ویرایش دستی در صورت لزوم */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 flex flex-col justify-between">
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <Calculator className="w-4 h-4 text-primary" />
                    <span>امتیاز محاسبه‌شده از فرمول:</span>
                  </div>
                  <div className={`text-xl font-black mt-2 ${
                    (calculatedScore ?? 0) < 0 ? 'text-rose-600' : 'text-emerald-600 dark:text-emerald-400'
                  }`}>
                    {calculatedScore !== null ? `${toPersianDigits(calculatedScore)} امتیاز` : '—'}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700 dark:text-gray-200 block">
                    امتیاز نهایی قابل اعمال (امکان تغییر دستی):
                  </label>
                  <Input
                    type="number"
                    placeholder={calculatedScore !== null ? String(calculatedScore) : 'امتیاز دلخواه...'}
                    value={customScoreOverride}
                    onChange={e => setCustomScoreOverride(e.target.value)}
                    step="any"
                    className="font-bold text-sm"
                  />
                  <span className="text-[10px] text-gray-400">برای کسر امتیاز، عدد منفی وارد کنید (مثلاً ۲-)</span>
                </div>
              </div>

              {/* فیلد توضیحات و ارجاعات اداری */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 dark:text-gray-200 block">
                  شرح یا مستندات جلسه / مصوبه (اختیاری):
                </label>
                <textarea
                  rows={3}
                  placeholder="توضیحات مربوط به مصوبه شورای مدرسه، شماره نامه، یا تشویقی معلم مربوطه..."
                  value={details}
                  onChange={e => setDetails(e.target.value)}
                  className="w-full text-xs sm:text-sm rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#151C28] p-3 outline-none focus:border-primary transition-colors resize-none"
                />
              </div>

              {/* دکمه ثبت مستقیم */}
              <Button
                type="submit"
                disabled={submitting || !selectedStudentId || !selectedActivityId}
                className="w-full font-bold shadow-[2.5px_2.5px_0_#1F413D]"
              >
                <Send className="w-4 h-4 ml-2" />
                {submitting
                  ? 'در حال ثبت...'
                  : finalScore < 0
                  ? `ثبت کسر ${toPersianDigits(Math.abs(finalScore))} امتیاز انضباطی`
                  : `ثبت مستقیم اعطای ${toPersianDigits(finalScore)} امتیاز`}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* ستون چپ (۱/۳): انتخاب دانش‌آموز با جستجوی سریع */}
        <div className="space-y-4">
          <Card className="shadow-[2.75px_2.75px_0_#202A5A] dark:shadow-[2.75px_2.75px_0_#59BBAF]">
            <CardHeader className="border-b border-gray-100 dark:border-gray-800 pb-3">
              <CardTitle className="text-sm font-bold flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-primary" />
                  <span>انتخاب دانش‌آموز</span>
                </div>
                <Badge variant="neutral" className="text-[10px]">
                  {toPersianDigits(students.length)} دانش‌آموز
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              <div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2" />
                <Input
                  placeholder="جستجوی نام، کد یا کلاس..."
                  value={studentSearch}
                  onChange={e => setStudentSearch(e.target.value)}
                  className="pr-9 text-xs rounded-xl"
                />
              </div>

              {/* لیست اسکرول‌خور دانش‌آموزان */}
              <div className="max-h-80 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800 rounded-xl border border-gray-200 dark:border-gray-800">
                {filteredStudents.map(st => {
                  const isSelected = selectedStudentId === st.id;
                  const className = st.enrollments?.[0]?.classroom?.name;

                  return (
                    <div
                      key={st.id}
                      onClick={() => setSelectedStudentId(st.id)}
                      className={`p-3 cursor-pointer transition-colors flex items-center justify-between text-xs ${
                        isSelected
                          ? 'bg-primary/15 dark:bg-primary/25 font-bold text-primary border-r-4 border-r-primary'
                          : 'hover:bg-gray-50 dark:hover:bg-gray-800/50 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      <div className="space-y-0.5">
                        <div className="font-bold">
                          {st.user?.firstName} {st.user?.lastName}
                        </div>
                        <div className="text-[11px] text-gray-400 flex items-center gap-1">
                          <School className="w-3 h-3" />
                          <span>{className || 'بدون کلاس'}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-club-normal dark:text-club-light">
                          {toPersianDigits(st.kaScore || 0)} امت
                        </span>
                      </div>
                    </div>
                  );
                })}

                {filteredStudents.length === 0 && !loadingStudents && (
                  <div className="p-6 text-center text-xs text-gray-400">
                    دانش‌آموزی یافت نشد
                  </div>
                )}
              </div>

              {selectedStudent && (
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-500/30 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span>
                    دانش‌آموز انتخاب‌شده: <strong>{selectedStudent.user?.firstName} {selectedStudent.user?.lastName}</strong>
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </form>
    </div>
  );
};
