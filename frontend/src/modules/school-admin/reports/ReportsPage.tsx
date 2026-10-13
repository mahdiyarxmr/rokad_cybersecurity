import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Modal } from '../../../components/ui/Modal';
import { ResponsivePageHeader } from '../../../components/ui/ResponsivePageHeader';
import {
  BarChart3,
  TrendingUp,
  Receipt,
  GraduationCap,
  CalendarCheck,
  CheckCircle2,
  Download,
  Printer,
  FileSpreadsheet,
  FileText,
  Building,
  Award,
  Wallet,
  Send,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

export const ReportsPage: React.FC = () => {
  const [isReportCardModalOpen, setIsReportCardModalOpen] = useState(false);
  const [isPayaModalOpen, setIsPayaModalOpen] = useState(false);
  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);
  const [isReportCardPublished, setIsReportCardPublished] = useState<boolean>(() => {
    return localStorage.getItem('rokad_report_card_published') === 'true';
  });

  const toggleReportCardPublish = () => {
    const nextState = !isReportCardPublished;
    setIsReportCardPublished(nextState);
    localStorage.setItem('rokad_report_card_published', String(nextState));
    handleSimulateDownload(
      nextState
        ? 'کارنامه‌ها با موفقیت برای کلیه اولیاء و دانش‌آموزان مدرسه منتشر شد.'
        : 'انتشار کارنامه‌ها لغو شد و دسترسی اولیاء و دانش‌آموزان موقتاً بسته شد.'
    );
  };

  const gradeGpaData = [
    { grade: 'پایه دهم ریاضی', gpa: 19.20 },
    { grade: 'پایه دهم تجربی', gpa: 18.85 },
    { grade: 'پایه دهم انسانی', gpa: 18.20 },
    { grade: 'پایه یازدهم ریاضی', gpa: 18.95 },
    { grade: 'پایه یازدهم تجربی', gpa: 19.10 },
  ];

  const payaEmployees = [
    { name: 'دکتر بهزاد کاظمی', role: 'مربی ریاضی', sheba: 'IR120120000000001234567890', netPay: 23250000 },
    { name: 'مهندس محمدرضا شجاعی', role: 'مربی فیزیک', sheba: 'IR560170000000009876543210', netPay: 21500000 },
    { name: 'خانم فاطمه سلیمانی', role: 'مربی شیمی', sheba: 'IR880190000000004561237890', netPay: 22000000 },
  ];

  const handleSimulateDownload = (msg: string) => {
    setDownloadSuccess(msg);
    setTimeout(() => setDownloadSuccess(null), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <ResponsivePageHeader
        icon={BarChart3}
        title="گزارش‌های جامع"
      />

      {downloadSuccess && (
        <div className="p-3.5 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-200 flex items-center space-x-2 space-x-reverse text-xs font-bold">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{downloadSuccess}</span>
        </div>
      )}

      {/* KPI Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        <Card className="p-4 sm:p-5 border hover:border-amber-500 transition-all">
          <div className="flex items-center justify-between mb-1.5">
            <div className="text-xs text-gray-500 font-medium">وصول شهریه ترم جاری</div>
            <Receipt className="h-4 w-4 text-amber-500" />
          </div>
          <div className="text-2xl font-extrabold text-ink-darker">۷۸٪</div>
          <div className="w-full bg-gray-100 h-1.5 rounded-full mt-2.5 overflow-hidden">
            <div className="bg-amber-500 h-1.5 rounded-full" style={{ width: '78%' }} />
          </div>
          <p className="text-[11px] text-gray-500 mt-1.5">۲۲٪ مانده اقساط در موعد بهمن‌ماه</p>
        </Card>

        <Card className="p-4 sm:p-5 border hover:border-primary transition-all">
          <div className="flex items-center justify-between mb-1.5">
            <div className="text-xs text-gray-500 font-medium">میانگین حضور دانش‌آموزان</div>
            <CalendarCheck className="h-4 w-4 text-primary" />
          </div>
          <div className="text-2xl font-extrabold text-emerald-700">۹۶.۴٪</div>
          <div className="w-full bg-gray-100 h-1.5 rounded-full mt-2.5 overflow-hidden">
            <div className="bg-primary h-1.5 rounded-full" style={{ width: '96.4%' }} />
          </div>
          <p className="text-[11px] text-emerald-600 mt-1.5 font-medium">انضباط تحصیلی مطلوب</p>
        </Card>

        <Card className="p-4 sm:p-5 border hover:border-blue-500 transition-all">
          <div className="flex items-center justify-between mb-1.5">
            <div className="text-xs text-gray-500 font-medium">میانگین معدل هنرستان</div>
            <TrendingUp className="h-4 w-4 text-blue-500" />
          </div>
          <div className="text-2xl font-extrabold text-primary">۱۸.۷۵</div>
          <div className="w-full bg-gray-100 h-1.5 rounded-full mt-2.5 overflow-hidden">
            <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: '93.7%' }} />
          </div>
          <p className="text-[11px] text-blue-600 mt-1.5 font-medium">+۰.۶۵ رشد نسبت به قبل</p>
        </Card>
      </div>

      {/* Analytics Chart & Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* GPA by Grade Chart */}
        <Card className="p-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="font-bold text-sm text-ink-darker">میانگین معدل به تفکیک پایه‌ها</h3>
              <p className="text-[11px] text-gray-400">ارزیابی عملکرد تحصیلی کلاس‌های مختلف</p>
            </div>
            <Badge variant="default">نیم‌سال اول</Badge>
          </div>

          <div className="h-64 w-full" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={gradeGpaData}>
                <XAxis dataKey="grade" stroke="#888888" fontSize={10} />
                <YAxis domain={[15, 20]} stroke="#888888" fontSize={11} />
                <Tooltip />
                <Bar dataKey="gpa" fill="#59BBAF" radius={[6, 6, 0, 0]} name="میانگین نمره" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Quick Report Actions */}
        <Card className="p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-2 space-x-reverse mb-4">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              <h3 className="font-bold text-sm text-ink-darker">صدور اسناد، کارنامه‌ها و فایل‌های بانکی</h3>
            </div>

            <div className="space-y-3">
              {/* Publication Control by Manager */}
              <div className="p-4 rounded-xl border-2 border-primary/30 bg-primary/5 flex flex-col sm:flex-row justify-between sm:items-center gap-3 shadow-xs">
                <div>
                  <div className="font-bold text-xs text-ink-darker flex items-center space-x-2 space-x-reverse">
                    <Send className="h-4 w-4 text-primary shrink-0" />
                    <span>انتشار کارنامه برای اولیاء و دانش‌آموزان</span>
                    <Badge variant={isReportCardPublished ? 'success' : 'neutral'} className="mr-2">
                      {isReportCardPublished ? 'منتشر شده برای اولیاء و دانش‌آموزان' : 'پنهان و منتشرنشده'}
                    </Badge>
                  </div>
                  <div className="text-[11px] text-gray-500 mt-1 leading-relaxed">
                    {isReportCardPublished
                      ? 'کارنامه‌ها هم‌اکنون برای دانش‌آموزان و اولیاء در پرتال قابل مشاهده و دانلود است.'
                      : 'کارنامه‌ها فعلاً از دید اولیاء و دانش‌آموزان مخفی است و فقط با فشردن دکمه زیر منتشر می‌شود.'}
                  </div>
                </div>
                <Button
                  variant={isReportCardPublished ? 'destructive' : 'primary'}
                  size="sm"
                  onClick={toggleReportCardPublish}
                  className="text-xs shrink-0 font-medium"
                >
                  {isReportCardPublished ? 'لغو انتشار کارنامه‌ها' : 'انتشار رسمی کارنامه‌ها'}
                </Button>
              </div>

              {/* Action 1: Report Card */}
              <div className="p-3.5 rounded-xl border border-gray-200 bg-gray-50 flex justify-between items-center">
                <div>
                  <div className="font-bold text-xs text-ink-darker flex items-center space-x-1.5 space-x-reverse">
                    <FileText className="h-4 w-4 text-primary" />
                    <span>کارنامه ترم اول (فرمت رسمی آموزش و پرورش)</span>
                  </div>
                  <div className="text-[11px] text-gray-500 mt-0.5">خروجی رسمی چاپی شامل ریز نمرات، رتبه و مهر مدرسه</div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsReportCardModalOpen(true)}
                  className="text-xs"
                >
                  مشاهده و چاپ
                </Button>
              </div>

              {/* Action 2: Paya Disket */}
              <div className="p-3.5 rounded-xl border border-gray-200 bg-gray-50 flex justify-between items-center">
                <div>
                  <div className="font-bold text-xs text-ink-darker flex items-center space-x-1.5 space-x-reverse">
                    <Wallet className="h-4 w-4 text-emerald-600" />
                    <span>فایل دیسکت بانک پرداخت پایا حقوق</span>
                  </div>
                  <div className="text-[11px] text-gray-500 mt-0.5">فرمت استاندارد شبا جهت بارگذاری مستقیم در بانک</div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsPayaModalOpen(true)}
                  className="text-xs"
                >
                  تولید فایل پایا
                </Button>
              </div>

              {/* Action 3: Finance Ledger Excel */}
              <div className="p-3.5 rounded-xl border border-gray-200 bg-gray-50 flex justify-between items-center">
                <div>
                  <div className="font-bold text-xs text-ink-darker flex items-center space-x-1.5 space-x-reverse">
                    <FileSpreadsheet className="h-4 w-4 text-amber-600" />
                    <span>دفتر کل مطالبات و اقساط شهریه</span>
                  </div>
                  <div className="text-[11px] text-gray-500 mt-0.5">خروجی اکسل اقساط وصولی و معوقه دانش‌آموزان</div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsExcelModalOpen(true)}
                  className="text-xs"
                >
                  خروجی اکسل
                </Button>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-100 text-center text-xs text-gray-400">
            سامانه گزارش‌گیری هوشمند پلتفرم مدارس رکاد
          </div>
        </Card>
      </div>

      {/* 1. Modal: Official Printable Report Card */}
      <Modal
        isOpen={isReportCardModalOpen}
        onClose={() => setIsReportCardModalOpen(false)}
        title="پیش‌نمایش کارنامه رسمی تحصیلی (فرمت آموزش و پرورش)"
        description="کارنامه نمرات نیم‌سال اول سال تحصیلی ۱۴۰۴-۱۴۰۵"
        maxWidth="lg"
      >
        <div className="space-y-4">
          {/* Official Printable Header */}
          <div className="border-2 border-ink-darker rounded-2xl p-6 bg-white space-y-4 shadow-sm">
            <div className="flex items-center justify-between border-b pb-4">
              <div className="w-12 h-12 flex items-center justify-center shrink-0">
                <img src="/logo.svg" alt="لوگوی رکاد" className="w-11 h-11 object-cover rounded-xl border border-gray-200/80 shadow-2xs" />
              </div>
              <div className="text-center space-y-1 flex-1">
                <div className="font-bold text-xs text-gray-500">وزارت آموزش و پرورش جمهوری اسلامی ایران</div>
                <div className="font-extrabold text-base text-ink-darker">مجتمع آموزشی هوشمند رکاد</div>
                <div className="text-xs font-bold text-primary">کارنامه ارزشیابی پیشرفت تحصیلی دانش‌آموز</div>
              </div>
              <div className="w-12 h-12 flex items-center justify-center shrink-0">
                <img src="/logo.svg" alt="لوگوی رکاد" className="w-11 h-11 object-cover rounded-xl border border-gray-200/80 shadow-2xs" />
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs bg-gray-50 p-3 rounded-xl">
              <div>نام: <strong>امیرعلی صادقی</strong></div>
              <div>کد ملی: <strong className="font-mono">0012345678</strong></div>
              <div>پایه: <strong>دهم ریاضی (کلاس ۱۰۱)</strong></div>
              <div>سال تحصیلی: <strong>۱۴۰۴-۱۴۰۵</strong></div>
            </div>

            <div className="space-y-1 text-xs">
              <div className="flex justify-between p-2 border-b bg-gray-100 font-bold">
                <span>عنوان درس</span>
                <span>نمره مستمر</span>
                <span>نمره پایانی</span>
                <span>نمره نهایی</span>
              </div>
              <div className="flex justify-between p-2 border-b">
                <span>حسابان و دیفرانسیل ۱</span>
                <span className="font-mono">۱۹.۵۰</span>
                <span className="font-mono">۲۰.۰۰</span>
                <span className="font-mono font-bold text-primary">۱۹.۶۵</span>
              </div>
              <div className="flex justify-between p-2 border-b">
                <span>فیزیک و آزمایشگاه ۱</span>
                <span className="font-mono">۱۸.۵۰</span>
                <span className="font-mono">۱۹.۰۰</span>
                <span className="font-mono font-bold text-primary">۱۸.۵۵</span>
              </div>
              <div className="flex justify-between p-2 border-b">
                <span>شیمی ۱</span>
                <span className="font-mono">۲۰.۰۰</span>
                <span className="font-mono">۱۹.۵۰</span>
                <span className="font-mono font-bold text-primary">۱۹.۶۵</span>
              </div>
            </div>

            {/* Vocational Modular Lessons (دروس پودمانی هنرستان) */}
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-purple-900 flex items-center gap-1">
                  <Award className="w-3.5 h-3.5 text-purple-600" />
                  <span>کارنامه دروس شایستگی‌محور پودمانی (فنی و حرفه‌ای)</span>
                </span>
                <span className="text-[10px] text-gray-500 font-mono">
                  فرمول: مستمر (۰-۵) + شایستگی (۱-۳ × ۵) | حد نصاب قبولی: ۱۲
                </span>
              </div>

              <div className="border rounded-xl overflow-hidden text-xs">
                <div className="grid grid-cols-8 gap-1 p-2 bg-purple-50 font-bold text-purple-950 text-center">
                  <span className="col-span-2 text-right pr-2">عنوان درس پودمانی</span>
                  <span>پودمان ۱</span>
                  <span>پودمان ۲</span>
                  <span>پودمان ۳</span>
                  <span>پودمان ۴</span>
                  <span>پودمان ۵</span>
                  <span>معدل کل درس</span>
                </div>
                <div className="grid grid-cols-8 gap-1 p-2 border-t items-center text-center">
                  <span className="col-span-2 text-right pr-2 font-bold text-ink-darker">نصب و راه‌اندازی سامانه‌ها</span>
                  <span className="font-mono text-emerald-700 bg-emerald-50 py-0.5 rounded font-bold">۱۹.۵۰</span>
                  <span className="font-mono text-emerald-700 bg-emerald-50 py-0.5 rounded font-bold">۱۴.۰۰</span>
                  <span className="font-mono text-emerald-700 bg-emerald-50 py-0.5 rounded font-bold">۲۰.۰۰</span>
                  <span className="font-mono text-emerald-700 bg-emerald-50 py-0.5 rounded font-bold">۱۳.۵۰</span>
                  <span className="font-mono text-emerald-700 bg-emerald-50 py-0.5 rounded font-bold">۱۹.۰۰</span>
                  <span className="font-mono font-black text-purple-700 bg-purple-100/70 py-0.5 rounded">۱۷.۲۰ (قبول)</span>
                </div>
                <div className="grid grid-cols-8 gap-1 p-2 border-t items-center text-center">
                  <span className="col-span-2 text-right pr-2 font-bold text-ink-darker">تولید محتوای الکترونیک</span>
                  <span className="font-mono text-emerald-700 bg-emerald-50 py-0.5 rounded font-bold">۱۹.۰۰</span>
                  <span className="font-mono text-emerald-700 bg-emerald-50 py-0.5 rounded font-bold">۱۴.۵۰</span>
                  <span className="font-mono text-emerald-700 bg-emerald-50 py-0.5 rounded font-bold">۱۹.۵۰</span>
                  <span className="font-mono text-emerald-700 bg-emerald-50 py-0.5 rounded font-bold">۱۴.۰۰</span>
                  <span className="font-mono text-emerald-700 bg-emerald-50 py-0.5 rounded font-bold">۱۹.۵۰</span>
                  <span className="font-mono font-black text-purple-700 bg-purple-100/70 py-0.5 rounded">۱۷.۳۰ (قبول)</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 p-3 bg-primary-light/30 rounded-xl text-center text-xs font-bold">
              <div>معدل کل: <span className="text-primary text-sm font-mono font-extrabold">۱۹.۳۱</span></div>
              <div>وضعیت تحصیلی: <span className="text-emerald-700 text-sm font-extrabold">قبول ممتاز</span></div>
              <div>رتبه در پایه: <span className="text-indigo-700 text-sm font-mono font-extrabold">۲</span></div>
            </div>

            <div className="flex justify-between items-center pt-4 text-xs text-gray-500">
              <div>امضاء و مهر راهبر مجتمع</div>
              <div className="text-emerald-600 font-bold">تایید شده الکترونیکی</div>
            </div>
          </div>

          <div className="flex justify-end space-x-2 space-x-reverse">
            <Button variant="ghost" onClick={() => setIsReportCardModalOpen(false)}>
              بستن
            </Button>
            <Button
              variant="primary"
              onClick={() => handleSimulateDownload('فایل رسمی کارنامه PDF با موفقیت دانلود شد.')}
              className="flex items-center space-x-1.5 space-x-reverse"
            >
              <Printer className="h-4 w-4" />
              <span>چاپ کارنامه</span>
            </Button>
          </div>
        </div>
      </Modal>

      {/* 2. Modal: Paya Disket Generator */}
      <Modal
        isOpen={isPayaModalOpen}
        onClose={() => setIsPayaModalOpen(false)}
        title="تولید دیسکت پرداخت پایا بانکی"
        description="خروجی استاندارد تسویه حقوق و دستمزد پرسنل جهت بارگذاری در درگاه بانک"
        maxWidth="lg"
      >
        <div className="space-y-4">
          <div className="space-y-2">
            {payaEmployees.map((emp, idx) => (
              <div key={idx} className="p-3 bg-gray-50 rounded-xl border flex justify-between items-center text-xs">
                <div>
                  <div className="font-bold text-ink-darker">{emp.name} ({emp.role})</div>
                  <div className="text-[11px] text-gray-400 font-mono mt-0.5">{emp.sheba}</div>
                </div>
                <div className="font-bold text-emerald-700 font-mono">
                  {(emp.netPay / 1000000).toLocaleString('fa-IR')} م تومان
                </div>
              </div>
            ))}
          </div>

          <div className="p-3 bg-primary-light/40 rounded-xl text-xs flex justify-between items-center font-bold text-ink-darker">
            <span>مجموع پرداخت پایا این ماه:</span>
            <span className="text-primary text-sm font-mono">۶۶.۷۵ میلیون تومان</span>
          </div>

          <div className="flex justify-end space-x-2 space-x-reverse pt-2">
            <Button variant="ghost" onClick={() => setIsPayaModalOpen(false)}>
              انصراف
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                setIsPayaModalOpen(false);
                handleSimulateDownload('فایل استاندارد دیسکت پایا (PAYA_1404_08.txt) با موفقیت تولید و دانلود شد.');
              }}
              className="flex items-center space-x-1.5 space-x-reverse"
            >
              <Download className="h-4 w-4" />
              <span>دانلود فایل دیسکت پایا</span>
            </Button>
          </div>
        </div>
      </Modal>

      {/* 3. Modal: Excel Ledger */}
      <Modal
        isOpen={isExcelModalOpen}
        onClose={() => setIsExcelModalOpen(false)}
        title="خروجی اکسل دفتر کل شهریه و اقساط"
        description="شامل فهرست کلیه قراردادها، تخفیفات، مبالغ واریزشده و اقساط معوقه"
        maxWidth="md"
      >
        <div className="space-y-4 text-xs">
          <p className="text-gray-600 leading-relaxed">
            فایل اکسل شامل ۴ برگه مجزا با تفکیک پایه‌ها، تراکنش‌های زرین‌پال، مانده اقساط و تخفیفات صادر خواهد شد.
          </p>

          <div className="p-4 bg-gray-50 rounded-xl border space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-500">تعداد کل قراردادها:</span>
              <strong>۳۲۰ قرارداد</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">مجموع وصولی:</span>
              <strong className="text-emerald-700 font-mono">۳۹۰ میلیون تومان</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">اقساط معوقه:</span>
              <strong className="text-rose-600 font-mono">۰ مورد</strong>
            </div>
          </div>

          <div className="flex justify-end space-x-2 space-x-reverse pt-2">
            <Button variant="ghost" onClick={() => setIsExcelModalOpen(false)}>
              انصراف
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                setIsExcelModalOpen(false);
                handleSimulateDownload('فایل اکسل (Tuition_Ledger_1404.xlsx) با موفقیت دانلود شد.');
              }}
              className="flex items-center space-x-1.5 space-x-reverse"
            >
              <FileSpreadsheet className="h-4 w-4" />
              <span>دانلود فایل اکسل</span>
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
