import React, { useEffect, useState } from 'react';
import { apiClient } from '../../../lib/api/client';
import { openAuthorizedDownload } from '../../../lib/api/authorized-download';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Badge } from '../../../components/ui/Badge';
import { Modal } from '../../../components/ui/Modal';
import { Skeleton } from '../../../components/ui/Skeleton';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '../../../components/ui/Table';
import { MobileDataTable } from '../../../components/ui/MobileDataTable';
import { ResponsivePageHeader } from '../../../components/ui/ResponsivePageHeader';
import {
  Wallet,
  Plus,
  FileCheck,
  Building,
  Calculator,
  Download,
  AlertTriangle,
  Printer,
  CheckCircle2,
  XCircle,
  Clock,
  Coins,
  History,
  Edit3,
  Calendar,
  CheckCheck,
  Trash2,
} from 'lucide-react';
import { PersianDatePicker } from '../../../components/ui/PersianDatePicker';
import {
  jalaliToGregorianDate,
  formatJalaliDisplay,
  gregorianToJalaliStr,
  getCurrentJalaliYearMonth,
} from '../../../utils/jalali';

const PERSIAN_MONTHS = [
  { id: 1, name: 'فروردین' },
  { id: 2, name: 'اردیبهشت' },
  { id: 3, name: 'خرداد' },
  { id: 4, name: 'تیر' },
  { id: 5, name: 'مرداد' },
  { id: 6, name: 'شهریور' },
  { id: 7, name: 'مهر' },
  { id: 8, name: 'آبان' },
  { id: 9, name: 'آذر' },
  { id: 10, name: 'دی' },
  { id: 11, name: 'بهمن' },
  { id: 12, name: 'اسفند' },
];

export const formatMoney = (val: any): string => {
  if (val === null || val === undefined || val === '') return '۰';
  if (typeof val === 'number') {
    return isNaN(val) ? '۰' : val.toLocaleString('fa-IR');
  }
  if (typeof val === 'string') {
    const n = Number(val);
    return isNaN(n) ? '۰' : n.toLocaleString('fa-IR');
  }
  if (typeof val === 'object') {
    if (typeof val.toNumber === 'function') {
      return val.toNumber().toLocaleString('fa-IR');
    }
    if (Array.isArray(val.d) && typeof val.s === 'number' && typeof val.e === 'number') {
      const digits = val.d.join('');
      const exp = val.e;
      const num = Number(digits) * Math.pow(10, exp - digits.length + 1) * val.s;
      return isNaN(num) ? '۰' : num.toLocaleString('fa-IR');
    }
  }
  return '۰';
};

export const PayrollPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'SLIPS' | 'CONTRACTS' | 'ADJUSTMENTS' | 'PROFILES'>('SLIPS');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Data states
  const [slips, setSlips] = useState<any[]>([]);
  const [contracts, setContracts] = useState<any[]>([]);
  const [adjustments, setAdjustments] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [academicYears, setAcademicYears] = useState<any[]>([]);

  // Current Jalali date
  const [currentJalali] = useState(() => getCurrentJalaliYearMonth());

  // Filter states - در آستانه بازگشایی مدارس (نیمه دوم شهریور)، ماه پیش‌فرض به صورت هوشمند روی ماه مهر (شروع سال تحصیلی و قراردادها) قرار می‌گیرد
  const defaultInitialMonth =
    currentJalali.month === 6 && currentJalali.day >= 15 ? 7 : currentJalali.month;

  const [selectedYear, setSelectedYear] = useState<number>(() => currentJalali.year);
  const [selectedMonth, setSelectedMonth] = useState<number>(() => defaultInitialMonth);
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

  // Modals
  const [isCalculateModalOpen, setIsCalculateModalOpen] = useState(false);
  const [isFinalizeModalOpen, setIsFinalizeModalOpen] = useState(false);
  const [isContractModalOpen, setIsContractModalOpen] = useState(false);
  const [isAdjustmentModalOpen, setIsAdjustmentModalOpen] = useState(false);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isDisburseModalOpen, setIsDisburseModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // Selected item for review / cancel / disburse
  const [targetSlip, setTargetSlip] = useState<any | null>(null);

  // Forms
  const [reviewForm, setReviewForm] = useState({
    finalAmount: 0,
    editReason: '',
  });

  const [cancelForm, setCancelForm] = useState({
    cancelReason: '',
  });

  const [disburseForm, setDisburseForm] = useState({
    paymentRefNumber: '',
  });

  const [contractForm, setContractForm] = useState({
    teacherId: '',
    academicYearId: '',
    rateType: 'HOURLY',
    rateAmount: 350000,
    monthlyHourCap: 120,
    baseSalary: 0,
    effectiveFrom: gregorianToJalaliStr(new Date()) || '1405-07-01',
    effectiveTo: '',
  });

  const [adjustmentForm, setAdjustmentForm] = useState({
    teacherId: '',
    amount: 500000,
    reason: '',
    originalSlipId: '',
  });

  const [profileForm, setProfileForm] = useState({
    userId: '',
    contractType: 'FULL_TIME_SALARY',
    baseMonthlySalary: 22000000,
    hourlyRate: 350000,
    bankName: 'بانک ملی',
    bankAccountNumber: '',
    bankShebaNumber: '',
    insuranceNumber: '',
  });

  const showToast = (msg: string, isErr = false) => {
    if (isErr) {
      setError(msg);
      setTimeout(() => setError(null), 5000);
    } else {
      setSuccessMessage(msg);
      setTimeout(() => setSuccessMessage(null), 5000);
    }
  };

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const params: any = {
        year: selectedYear,
        month: selectedMonth,
      };
      if (selectedStatus !== 'ALL') {
        params.status = selectedStatus;
      }

      const [slipsRes, contractsRes, adjustmentsRes, profilesRes, teachersRes, yearsRes] =
        await Promise.all([
          apiClient.get('/finance/payroll/slips', { params }),
          apiClient.get('/finance/payroll/contracts'),
          apiClient.get('/finance/payroll/adjustments'),
          apiClient.get('/finance/payroll/profiles'),
          apiClient.get('/members/teachers').catch(() => ({ data: [] })),
          apiClient.get('/academic/years').catch(() => ({ data: [] })),
        ]);

      setSlips(slipsRes.data || []);
      setContracts(contractsRes.data || []);
      setAdjustments(adjustmentsRes.data || []);
      setProfiles(profilesRes.data || []);
      setTeachers(teachersRes.data || []);
      setAcademicYears(yearsRes.data || []);

      if (teachersRes.data?.length > 0) {
        const firstTeacherUserId = teachersRes.data[0].user?.id || teachersRes.data[0].id;
        setContractForm((prev) => ({ ...prev, teacherId: prev.teacherId || firstTeacherUserId }));
        setAdjustmentForm((prev) => ({ ...prev, teacherId: prev.teacherId || firstTeacherUserId }));
        setProfileForm((prev) => ({ ...prev, userId: prev.userId || firstTeacherUserId }));
      }

      if (yearsRes.data?.length > 0) {
        const currentYear = yearsRes.data.find((y: any) => y.isCurrent) || yearsRes.data[0];
        setContractForm((prev) => ({ ...prev, academicYearId: prev.academicYearId || currentYear.id }));
      }
    } catch (err: any) {
      console.error('Failed to load payroll data', err);
      showToast(err.response?.data?.message || 'خطا در دریافت اطلاعات حقوق و دستمزد', true);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedYear, selectedMonth, selectedStatus]);

  // 1. اجرای محاسبه خودکار
  const handleCalculate = async () => {
    setIsSubmitting(true);
    try {
      const res = await apiClient.post('/finance/payroll/calculate', {
        year: Number(selectedYear),
        month: Number(selectedMonth),
      });
      showToast(res.data?.data?.message || res.data?.message || 'محاسبه کارکرد با موفقیت انجام شد');
      setIsCalculateModalOpen(false);
      fetchData();
    } catch (err: any) {
      const errMsg = err.response?.data?.message || err.message || 'خطا در محاسبه خودکار کارکرد';
      showToast(errMsg, true);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 2. صدور قطعی دسته‌جمعی
  const handleFinalize = async () => {
    setIsSubmitting(true);
    try {
      const res = await apiClient.post('/finance/payroll/finalize', {
        year: Number(selectedYear),
        month: Number(selectedMonth),
      });
      showToast(res.data?.data?.message || res.data?.message || 'صدور قطعی فیش‌ها با موفقیت انجام شد');
      setIsFinalizeModalOpen(false);
      fetchData();
    } catch (err: any) {
      const errMsg = err.response?.data?.message || err.message || 'خطا در صدور فیش‌ها';
      showToast(errMsg, true);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 3. بازبینی و ویرایش مبلغ نهایی
  const openReviewModal = (slip: any) => {
    setTargetSlip(slip);
    setReviewForm({
      finalAmount: Number(slip.finalAmount),
      editReason: slip.editReason || '',
    });
    setIsReviewModalOpen(true);
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetSlip) return;
    if (!reviewForm.editReason.trim()) {
      showToast('ثبت دلیل برای ویرایش مبلغ الزامی است', true);
      return;
    }
    setIsSubmitting(true);
    try {
      await apiClient.patch(`/finance/payroll/slips/${targetSlip.id}/review`, {
        finalAmount: Math.round(Number(reviewForm.finalAmount)),
        editReason: reviewForm.editReason.trim(),
      });
      showToast('مبلغ فیش حقوقی با موفقیت بازبینی و ثبت شد');
      setIsReviewModalOpen(false);
      fetchData();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'خطا در ثبت ویرایش فیش', true);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 4. ابطال فیش
  const openCancelModal = (slip: any) => {
    setTargetSlip(slip);
    setCancelForm({ cancelReason: '' });
    setIsCancelModalOpen(true);
  };

  const handleCancelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetSlip) return;
    if (!cancelForm.cancelReason.trim()) {
      showToast('ثبت دلیل برای ابطال فیش الزامی است', true);
      return;
    }
    setIsSubmitting(true);
    try {
      await apiClient.patch(`/finance/payroll/slips/${targetSlip.id}/cancel`, {
        cancelReason: cancelForm.cancelReason.trim(),
      });
      showToast('فیش حقوقی با موفقیت باطل گردید');
      setIsCancelModalOpen(false);
      fetchData();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'خطا در ابطال فیش', true);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 5. تسویه بانکی
  const openDisburseModal = (slip: any) => {
    setTargetSlip(slip);
    setDisburseForm({ paymentRefNumber: '' });
    setIsDisburseModalOpen(true);
  };

  const handleDisburseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetSlip) return;
    if (!disburseForm.paymentRefNumber.trim()) {
      showToast('وارد کردن شماره پیگیری پرداخت بانکی الزامی است', true);
      return;
    }
    setIsSubmitting(true);
    try {
      await apiClient.patch(`/finance/payroll/slips/${targetSlip.id}/disburse`, {
        paymentRefNumber: disburseForm.paymentRefNumber.trim(),
      });
      showToast('تسویه حساب بانکی با موفقیت ثبت شد');
      setIsDisburseModalOpen(false);
      fetchData();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'خطا در ثبت تسویه حساب', true);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 6. ایجاد قرارداد جدید
  const handleCreateContract = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contractForm.effectiveFrom) {
      showToast('لطفاً تاریخ شروع قرارداد را مشخص کنید', true);
      return;
    }
    setIsSubmitting(true);
    try {
      const effFromDate = jalaliToGregorianDate(contractForm.effectiveFrom).toISOString();
      const effToDate = contractForm.effectiveTo
        ? jalaliToGregorianDate(contractForm.effectiveTo).toISOString()
        : undefined;

      await apiClient.post('/finance/payroll/contracts', {
        teacherId: contractForm.teacherId,
        academicYearId: contractForm.academicYearId,
        rateType: contractForm.rateType,
        rateAmount: Math.round(Number(contractForm.rateAmount)),
        monthlyHourCap: contractForm.monthlyHourCap ? Number(contractForm.monthlyHourCap) : undefined,
        baseSalary: contractForm.baseSalary ? Math.round(Number(contractForm.baseSalary)) : undefined,
        effectiveFrom: effFromDate,
        effectiveTo: effToDate,
      });
      showToast('قرارداد مالی مدرس با موفقیت ثبت گردید');
      setIsContractModalOpen(false);
      fetchData();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'خطا در ثبت قرارداد', true);
    } finally {
      setIsSubmitting(false);
    }
  };

  // حذف قرارداد
  const handleDeleteContract = async (contractId: string) => {
    if (!window.confirm('آیا از حذف این قرارداد مالی اطمینان دارید؟ این عمل قابل بازگشت نیست.')) {
      return;
    }
    setIsSubmitting(true);
    try {
      await apiClient.delete(`/finance/payroll/contracts/${contractId}`);
      showToast('قرارداد با موفقیت حذف گردید');
      fetchData();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'خطا در حذف قرارداد', true);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 7. ثبت تعدیل حقوق
  const handleCreateAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await apiClient.post('/finance/payroll/adjustments', {
        teacherId: adjustmentForm.teacherId,
        amount: Math.round(Number(adjustmentForm.amount)),
        reason: adjustmentForm.reason.trim(),
        originalSlipId: adjustmentForm.originalSlipId || undefined,
      });
      showToast('تعدیل حقوق برای اعمال در ماه بعد ثبت شد');
      setIsAdjustmentModalOpen(false);
      fetchData();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'خطا در ثبت تعدیل حقوق', true);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 8. ثبت پروفایل بانکی پرسنل
  const handleCreateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await apiClient.post(`/finance/payroll/profiles/${profileForm.userId}`, {
        contractType: profileForm.contractType,
        baseMonthlySalary: Math.round(Number(profileForm.baseMonthlySalary)),
        hourlyRate: Math.round(Number(profileForm.hourlyRate)),
        bankName: profileForm.bankName,
        bankAccountNumber: profileForm.bankAccountNumber,
        bankShebaNumber: profileForm.bankShebaNumber,
        insuranceNumber: profileForm.insuranceNumber,
      });
      showToast('پروفایل مالی و بانکی با موفقیت به‌روزرسانی شد');
      setIsProfileModalOpen(false);
      fetchData();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'خطا در ثبت پرونده حقوقی', true);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 9. دانلود اکسل
  const handleDownloadExcel = () => {
    void openAuthorizedDownload(
      `/api/v1/finance/payroll/export/excel?year=${selectedYear}&month=${selectedMonth}`,
    );
  };

  // 10. باز کردن پرینت فیش تکی
  const handlePrintSlip = (slipId: string) => {
    void openAuthorizedDownload(`/api/v1/finance/payroll/export/print/${slipId}`);
  };

  // وضعیت بج‌ها
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'DRAFT':
        return <Badge variant="warning" className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">پیش‌نویس سیستمی</Badge>;
      case 'REVIEWED':
        return <Badge variant="default" className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">بازبینی‌شده</Badge>;
      case 'ISSUED':
        return <Badge variant="success" className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">صادرشده (قطعی)</Badge>;
      case 'SETTLED':
      case 'PAID':
        return <Badge variant="default" className="bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400">تسویه بانکی</Badge>;
      case 'CANCELLED':
        return <Badge variant="destructive" className="bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400">باطل‌شده</Badge>;
      default:
        return <Badge variant="neutral">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {error && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm flex items-center justify-between shadow-sm animate-fade-in">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">✕</button>
        </div>
      )}
      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-sm flex items-center justify-between shadow-sm animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-400 hover:text-emerald-600">✕</button>
        </div>
      )}

      {/* Page Header */}
      <ResponsivePageHeader
        title="حقوق و دستمزد"
        icon={<Wallet className="w-6 h-6 text-primary-dark dark:text-primary" />}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadExcel}
              className="gap-1.5"
            >
              <Download className="w-4 h-4 text-emerald-600" />
              خروجی اکسل ماه
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsCalculateModalOpen(true)}
              className="gap-1.5 border-primary/50 text-primary-dark dark:text-primary"
            >
              <Calculator className="w-4 h-4" />
              محاسبه خودکار کارکرد ماه
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsFinalizeModalOpen(true)}
              className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <CheckCheck className="w-4 h-4" />
              صدور قطعی فیش‌ها
            </Button>
          </div>
        }
      />

      {/* Tabs */}
      <div className="flex border-b border-border/70 overflow-x-auto gap-2 pb-1">
        <button
          onClick={() => setActiveTab('SLIPS')}
          className={`px-4 py-2 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'SLIPS'
              ? 'border-primary text-primary-dark dark:text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <FileCheck className="w-4 h-4" />
          فیش‌های حقوقی و کارکرد ({slips.length})
        </button>
        <button
          onClick={() => setActiveTab('CONTRACTS')}
          className={`px-4 py-2 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'CONTRACTS'
              ? 'border-primary text-primary-dark dark:text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Coins className="w-4 h-4" />
          قراردادها و نرخ تدریس ({contracts.length})
        </button>
        <button
          onClick={() => setActiveTab('ADJUSTMENTS')}
          className={`px-4 py-2 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'ADJUSTMENTS'
              ? 'border-primary text-primary-dark dark:text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <History className="w-4 h-4" />
          تعدیلات و معوقات ({adjustments.length})
        </button>
        <button
          onClick={() => setActiveTab('PROFILES')}
          className={`px-4 py-2 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'PROFILES'
              ? 'border-primary text-primary-dark dark:text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Building className="w-4 h-4" />
          اطلاعات بانکی پرسنل ({profiles.length})
        </button>
      </div>

      {/* TAB 1: SLIPS */}
      {activeTab === 'SLIPS' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <Card className="p-4 bg-white/70 dark:bg-card/70 backdrop-blur-md border border-border/70">
            <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-4 gap-3 items-end">
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">سال شمسی</label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="w-full h-9 text-xs rounded-lg border border-input bg-background px-3 py-1 focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  {[currentJalali.year - 2, currentJalali.year - 1, currentJalali.year, currentJalali.year + 1].map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">ماه شمسی</label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  className="w-full h-9 text-xs rounded-lg border border-input bg-background px-3 py-1 focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  {PERSIAN_MONTHS.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">وضعیت فیش</label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="w-full h-9 text-xs rounded-lg border border-input bg-background px-3 py-1 focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="ALL">همه وضعیت‌ها</option>
                  <option value="DRAFT">پیش‌نویس سیستمی</option>
                  <option value="REVIEWED">بازبینی‌شده</option>
                  <option value="ISSUED">صادرشده (قطعی)</option>
                  <option value="SETTLED">تسویه بانکی</option>
                  <option value="CANCELLED">باطل‌شده</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchData}
                  className="w-full h-9 text-xs"
                >
                  بروزرسانی جدول
                </Button>
              </div>
            </div>
          </Card>

          {/* Slips Table */}
          <Card className="overflow-hidden border border-border/70 shadow-sm">
            {isLoading ? (
              <div className="p-6 space-y-3">
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-full" />
              </div>
            ) : slips.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground">
                <Calculator className="w-12 h-12 mx-auto mb-3 text-muted-foreground/40" />
                <div className="font-bold text-base mb-1">فیش حقوقی برای این ماه یافت نشد</div>
                <p className="text-xs text-muted-foreground mb-4">
                  با فشردن دکمه «محاسبه خودکار کارکرد ماه»، سیستم کارکرد واقعی مدرسین را بر مبنای حضور و قرارداد استخراج می‌کند.
                </p>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setIsCalculateModalOpen(true)}
                  className="gap-1.5"
                >
                  <Calculator className="w-4 h-4" />
                  محاسبه کارکرد این ماه
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40 text-xs">
                      <TableHead className="font-bold">مدرس / پرسنل</TableHead>
                      <TableHead className="font-bold">شماره فیش</TableHead>
                      <TableHead className="font-bold text-center">کارکرد (جلسات/ساعت)</TableHead>
                      <TableHead className="font-bold text-left">محاسبه سیستم (تومان)</TableHead>
                      <TableHead className="font-bold text-left">مبلغ نهایی مصوب (تومان)</TableHead>
                      <TableHead className="font-bold text-center">وضعیت</TableHead>
                      <TableHead className="font-bold text-center">عملیات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {slips.map((slip) => {
                      const u = slip.user;
                      const isEditable = slip.status === 'DRAFT' || slip.status === 'REVIEWED';
                      const isCancellable = slip.status !== 'SETTLED' && slip.status !== 'PAID' && slip.status !== 'CANCELLED';

                      return (
                        <TableRow key={slip.id} className="hover:bg-muted/20 text-xs transition-colors">
                          <TableCell>
                            <div className="font-bold text-foreground">
                              {u?.firstName} {u?.lastName}
                            </div>
                            <div className="text-[11px] text-muted-foreground">{u?.phone || u?.nationalId || '-'}</div>
                          </TableCell>
                          <TableCell className="font-mono text-[11px]">{slip.slipNumber}</TableCell>
                          <TableCell className="text-center">
                            <div className="font-bold">
                              {slip.sourceSessionCount} جلسه
                            </div>
                            {slip.sourceHours && (
                              <div className="text-[10px] text-muted-foreground">
                                {Number(slip.sourceHours)} ساعت
                              </div>
                            )}
                            {slip.hasCapWarning && (
                              <div
                                className="inline-flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400 mt-0.5 bg-amber-50 dark:bg-amber-950/50 px-1.5 py-0.5 rounded"
                                title={slip.capWarningDetails}
                              >
                                <AlertTriangle className="w-3 h-3" />
                                مازاد بر سقف
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-left font-mono font-bold text-muted-foreground">
                            {formatMoney(slip.calculatedAmount)}
                          </TableCell>
                          <TableCell className="text-left font-mono font-bold text-emerald-600 dark:text-emerald-400">
                            {formatMoney(slip.finalAmount)}
                            {slip.editReason && (
                              <div className="text-[10px] text-amber-600 font-sans font-normal truncate max-w-[140px]" title={slip.editReason}>
                                اصلاحیه: {slip.editReason}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {getStatusBadge(slip.status)}
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-1">
                              {/* بازبینی و ویرایش */}
                              {isEditable && (
                                <button
                                  onClick={() => openReviewModal(slip)}
                                  className="p-1 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded"
                                  title="بازبینی و اصلاح مبلغ"
                                >
                                  <Edit3 className="w-4 h-4" />
                                </button>
                              )}

                              {/* چاپ فیش تکی */}
                              <button
                                onClick={() => handlePrintSlip(slip.id)}
                                className="p-1 text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded"
                                title="چاپ یا ذخیره PDF فیش"
                              >
                                <Printer className="w-4 h-4" />
                              </button>

                              {/* تسویه بانکی برای فیش‌های صادرشده */}
                              {slip.status === 'ISSUED' && (
                                <button
                                  onClick={() => openDisburseModal(slip)}
                                  className="p-1 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded"
                                  title="ثبت تسویه بانکی و پایا"
                                >
                                  <CheckCircle2 className="w-4 h-4" />
                                </button>
                              )}

                              {/* ابطال فیش */}
                              {isCancellable && (
                                <button
                                  onClick={() => openCancelModal(slip)}
                                  className="p-1 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded"
                                  title="ابطال فیش"
                                >
                                  <XCircle className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* TAB 2: CONTRACTS */}
      {activeTab === 'CONTRACTS' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-foreground">قراردادهای مالی و نرخ تدریس مدرسین</h3>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsContractModalOpen(true)}
              className="gap-1.5"
            >
              <Plus className="w-4 h-4" />
              ثبت قرارداد جدید
            </Button>
          </div>

          <Card className="overflow-hidden border border-border/70 shadow-sm">
            {contracts.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground">
                <Coins className="w-12 h-12 mx-auto mb-3 text-muted-foreground/40" />
                <div className="font-bold text-base mb-1">قراردادی ثبت نشده است</div>
                <p className="text-xs text-muted-foreground mb-4">
                  جهت محاسبه خودکار حقوق و کارکرد مدرسین، ابتدا برای آنان قرارداد و نرخ تدریس ثبت فرمایید.
                </p>
                <Button variant="primary" size="sm" onClick={() => setIsContractModalOpen(true)}>
                  ثبت اولین قرارداد
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40 text-xs">
                      <TableHead className="font-bold">مدرس</TableHead>
                      <TableHead className="font-bold">سال تحصیلی</TableHead>
                      <TableHead className="font-bold">نوع نرخ</TableHead>
                      <TableHead className="font-bold text-left">مبلغ نرخ (تومان)</TableHead>
                      <TableHead className="font-bold text-center">سقف ساعت ماهانه</TableHead>
                      <TableHead className="font-bold text-left">حقوق پایه ثابت</TableHead>
                      <TableHead className="font-bold text-center">بازه اعتبار</TableHead>
                      <TableHead className="font-bold text-center">وضعیت</TableHead>
                      <TableHead className="font-bold text-center">عملیات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {contracts.map((c) => {
                      const isActive = !c.effectiveTo || new Date(c.effectiveTo) >= new Date();
                      return (
                        <TableRow key={c.id} className="hover:bg-muted/20 text-xs">
                          <TableCell className="font-bold">
                            {c.teacher?.firstName} {c.teacher?.lastName}
                          </TableCell>
                          <TableCell>{c.academicYear?.name || '-'}</TableCell>
                          <TableCell>
                            <Badge variant="neutral">
                              {c.rateType === 'PER_SESSION' ? 'هر جلسه' : 'هر ساعت'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-left font-mono font-bold">
                            {formatMoney(c.rateAmount)} تومان
                          </TableCell>
                          <TableCell className="text-center font-mono">
                            {c.monthlyHourCap ? `${c.monthlyHourCap} ساعت` : 'بدون سقف'}
                          </TableCell>
                          <TableCell className="text-left font-mono">
                            {c.baseSalary ? `${formatMoney(c.baseSalary)} تومان` : '-'}
                          </TableCell>
                          <TableCell className="text-center text-[11px] text-muted-foreground font-mono">
                            {formatJalaliDisplay(c.effectiveFrom)}
                            {c.effectiveTo ? ` تا ${formatJalaliDisplay(c.effectiveTo)}` : ' (درحال اجرا)'}
                          </TableCell>
                          <TableCell className="text-center">
                            {isActive ? (
                              <Badge variant="success" className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
                                فعال
                              </Badge>
                            ) : (
                              <Badge variant="neutral">منقضی</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteContract(c.id)}
                              className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 p-1.5 h-auto rounded-lg"
                              title="حذف قرارداد"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* TAB 3: ADJUSTMENTS */}
      {activeTab === 'ADJUSTMENTS' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-sm font-bold text-foreground">تعدیلات و اصلاحات معوقه حقوق</h3>
              <p className="text-xs text-muted-foreground">
                اصلاحات خطاهای ماه‌های قبل به صورت بستانکاری یا بدهی ثبت شده و خودکار در فیش ماه بعد اعمال می‌شوند.
              </p>
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsAdjustmentModalOpen(true)}
              className="gap-1.5"
            >
              <Plus className="w-4 h-4" />
              ثبت تعدیل جدید
            </Button>
          </div>

          <Card className="overflow-hidden border border-border/70 shadow-sm">
            {adjustments.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground">
                <History className="w-12 h-12 mx-auto mb-3 text-muted-foreground/40" />
                <div className="font-bold text-base mb-1">هیچ تعدیل معوقه‌ای ثبت نشده است</div>
                <p className="text-xs text-muted-foreground">
                  در صورت کشف هرگونه خطای محاسباتی در فیش‌های تسویه شده، تعدیل ثبت نمایید تا ماه بعد کسر یا اضافه گردد.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40 text-xs">
                      <TableHead className="font-bold">مدرس</TableHead>
                      <TableHead className="font-bold text-left">مبلغ تعدیل (تومان)</TableHead>
                      <TableHead className="font-bold">شرح و دلیل اصلاحیه</TableHead>
                      <TableHead className="font-bold text-center">وضعیت اعمال</TableHead>
                      <TableHead className="font-bold text-center">تاریخ ثبت</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {adjustments.map((adj) => {
                      const amountNum = Number(adj.amount);
                      const isPositive = amountNum >= 0;
                      return (
                        <TableRow key={adj.id} className="hover:bg-muted/20 text-xs">
                          <TableCell className="font-bold">
                            {adj.teacher?.firstName} {adj.teacher?.lastName}
                          </TableCell>
                          <TableCell className={`text-left font-mono font-bold ${isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {isPositive ? `+${amountNum.toLocaleString('fa-IR')}` : amountNum.toLocaleString('fa-IR')}
                          </TableCell>
                          <TableCell className="max-w-xs truncate">{adj.reason}</TableCell>
                          <TableCell className="text-center">
                            {adj.status === 'PENDING' ? (
                              <Badge variant="warning" className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                                معلق (اعمال در ماه بعد)
                              </Badge>
                            ) : (
                              <Badge variant="success" className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
                                اعمال‌شده در فیش {adj.appliedToSlip?.slipNumber || ''}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-center text-[11px] text-muted-foreground font-mono">
                            {new Date(adj.createdAt).toLocaleDateString('fa-IR')}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* TAB 4: PROFILES */}
      {activeTab === 'PROFILES' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-foreground">پرونده مالی، بیمه و شماره شبا پرسنل</h3>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsProfileModalOpen(true)}
              className="gap-1.5"
            >
              <Plus className="w-4 h-4" />
              تکمیل / ویرایش پرونده بانکی
            </Button>
          </div>

          <Card className="overflow-hidden border border-border/70 shadow-sm">
            {profiles.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground">
                <Building className="w-12 h-12 mx-auto mb-3 text-muted-foreground/40" />
                <div className="font-bold text-base mb-1">پرونده‌ای یافت نشد</div>
                <p className="text-xs text-muted-foreground">اطلاعات حساب بانکی و بیمه پرسنل را ثبت نمایید.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40 text-xs">
                      <TableHead className="font-bold">پرسنل / مدرس</TableHead>
                      <TableHead className="font-bold">نوع قرارداد پیش‌فرض</TableHead>
                      <TableHead className="font-bold">نام بانک</TableHead>
                      <TableHead className="font-bold text-center">شماره شبا</TableHead>
                      <TableHead className="font-bold text-center">شماره بیمه</TableHead>
                      <TableHead className="font-bold text-center">عملیات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {profiles.map((p) => (
                      <TableRow key={p.id} className="hover:bg-muted/20 text-xs">
                        <TableCell className="font-bold">
                          {p.user?.firstName} {p.user?.lastName}
                        </TableCell>
                        <TableCell>
                          <Badge variant="neutral">
                            {p.contractType === 'FULL_TIME_SALARY' ? 'تمام‌وقت' : 'حق‌التدریس'}
                          </Badge>
                        </TableCell>
                        <TableCell>{p.bankName || '-'}</TableCell>
                        <TableCell className="text-center font-mono text-[11px]">
                          {p.bankShebaNumber || '-'}
                        </TableCell>
                        <TableCell className="text-center font-mono">
                          {p.insuranceNumber || '-'}
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setProfileForm({
                                userId: p.userId,
                                contractType: p.contractType,
                                baseMonthlySalary: Number(p.baseMonthlySalary),
                                hourlyRate: Number(p.hourlyRate),
                                bankName: p.bankName || '',
                                bankAccountNumber: p.bankAccountNumber || '',
                                bankShebaNumber: p.bankShebaNumber || '',
                                insuranceNumber: p.insuranceNumber || '',
                              });
                              setIsProfileModalOpen(true);
                            }}
                            className="h-7 px-2 text-xs"
                          >
                            ویرایش
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ===================== MODALS ===================== */}

      {/* 1. Modal: محاسبه خودکار کارکرد ماه */}
      <Modal
        isOpen={isCalculateModalOpen}
        onClose={() => setIsCalculateModalOpen(false)}
        title="محاسبه خودکار کارکرد ماهانه مدرسین"
      >
        <div className="space-y-4 text-xs">
          <p className="text-muted-foreground leading-relaxed">
            موتور هوشمند رکاد با بررسی جلسات حضور و غیاب ثبت‌شده مدرسین در ماه{' '}
            <strong className="text-foreground">{PERSIAN_MONTHS.find((m) => m.id === selectedMonth)?.name} {selectedYear}</strong>،
            مبالغ تدریس ساعتی و جلسه‌ای را طبق قراردادهای معتبر هر مدرس محاسبه و فیش‌های پیش‌نویس را آماده بازبینی خواهد کرد.
          </p>

          <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 p-3 rounded-lg text-amber-800 dark:text-amber-300">
            <div className="font-bold mb-1 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4" />
              قوانین قفل محاسبات:
            </div>
            فی50/40 border border-amber-200 dark:border-amber-800 p-3 rounded-lg text-amber-800 dark:text-amber-300">
            <div className="font-bold mb-1 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4" />
              قوانین قفل محاسبات:
            </div>
            فیش‌هایی که در وضعیت «صادرشده قطعی» یا «تسویه بانکی» قرار دارند، بازنویسی نخواهند شد تا سوابق مالی مدرسه کاملاً امن و مصون باقی بماند.
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setIsCalculateModalOpen(false)}>
              انصراف
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleCalculate}
              disabled={isSubmitting}
              className="gap-1.5 bg-primary-dark dark:bg-primary text-white"
            >
              <Calculator className="w-4 h-4" />
              {isSubmitting ? 'درحال محاسبه...' : 'تایید و شروع محاسبه'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* 2. Modal: صدور قطعی دسته‌جمعی */}
      <Modal
        isOpen={isFinalizeModalOpen}
        onClose={() => setIsFinalizeModalOpen(false)}
        title="صدور قطعی و انتشار فیش‌های حقوقی ماه"
      >
        <div className="space-y-4 text-xs">
          <p className="text-muted-foreground leading-relaxed">
            آیا از صدور قطعی تمام فیش‌های حقوقی آماده (پیش‌نویس و بازبینی‌شده) برای ماه{' '}
            <strong>{PERSIAN_MONTHS.find((m) => m.id === selectedMonth)?.name} {selectedYear}</strong> اطمینان دارید؟
          </p>

          <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 p-3 rounded-lg text-blue-800 dark:text-blue-300">
            با صدور قطعی:
            <ul className="list-disc list-inside mt-1 space-y-1">
              <li>فیش‌ها در پرتال مدرسین فعال و قابل مشاهده و پرینت می‌گردند.</li>
              <li>فیش‌ها قفل شده و ویرایش مستقیم آن‌ها غیرفعال می‌شود.</li>
              <li>تعدیلات معوقه اعمال‌شده به وضعیت قطعی تغییر می‌یابند.</li>
            </ul>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setIsFinalizeModalOpen(false)}>
              انصراف
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleFinalize}
              disabled={isSubmitting}
              className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <CheckCheck className="w-4 h-4" />
              {isSubmitting ? 'درحال صدور...' : 'تایید صدور نهایی'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* 3. Modal: بازبینی و ویرایش مبلغ نهایی */}
      <Modal
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        title={`بازبینی فیش حقوقی: ${targetSlip?.user?.firstName} ${targetSlip?.user?.lastName}`}
      >
        <form onSubmit={handleReviewSubmit} className="space-y-4 text-xs">
          <div className="bg-muted/40 p-3 rounded-lg space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">محاسبه اولیه سیستم:</span>
              <span className="font-mono font-bold">{formatMoney(targetSlip?.calculatedAmount)} تومان</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">جلسات کارکرد ثبت‌شده:</span>
              <span>{targetSlip?.sourceSessionCount} جلسه ({targetSlip?.sourceHours || 0} ساعت)</span>
            </div>
          </div>

          <div>
            <label className="font-medium text-foreground block mb-1">
              مبلغ نهایی مصوب جهت پرداخت (تومان - عدد صحیح):
            </label>
            <Input
              type="number"
              value={reviewForm.finalAmount}
              onChange={(e) => setReviewForm({ ...reviewForm, finalAmount: Number(e.target.value) })}
              className="font-mono text-sm"
              required
              min={0}
            />
          </div>

          <div>
            <label className="font-medium text-foreground block mb-1">
              دلیل و شرح ویرایش (جهت ممیزی و شفافیت حسابداری الزامی است):
            </label>
            <Input
              type="text"
              placeholder="مثلاً: اضافه تدریس کارگاه حل تمرین، کسر غیبت تاخیر"
              value={reviewForm.editReason}
              onChange={(e) => setReviewForm({ ...reviewForm, editReason: e.target.value })}
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsReviewModalOpen(false)}>
              انصراف
            </Button>
            <Button type="submit" variant="primary" size="sm" disabled={isSubmitting}>
              {isSubmitting ? 'درحال ثبت...' : 'ثبت بازبینی و مصوب کردن'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* 4. Modal: ابطال فیش */}
      <Modal
        isOpen={isCancelModalOpen}
        onClose={() => setIsCancelModalOpen(false)}
        title={`ابطال فیش حقوقی شماره ${targetSlip?.slipNumber}`}
      >
        <form onSubmit={handleCancelSubmit} className="space-y-4 text-xs">
          <p className="text-muted-foreground">
            فیش باطل‌شده از محاسبات فعال خارج می‌شود و امکان محاسبه مجدد برای این ماه مهیا می‌گردد.
          </p>

          <div>
            <label className="font-medium text-foreground block mb-1">علت ابطال فیش (الزامی):</label>
            <Input
              type="text"
              placeholder="مثلاً: ثبت اشتباه حضور و غیاب توسط آموزش"
              value={cancelForm.cancelReason}
              onChange={(e) => setCancelForm({ cancelReason: e.target.value })}
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsCancelModalOpen(false)}>
              انصراف
            </Button>
            <Button type="submit" variant="destructive" size="sm" disabled={isSubmitting}>
              {isSubmitting ? 'درحال ابطال...' : 'تایید و ابطال فیش'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* 5. Modal: تسویه بانکی */}
      <Modal
        isOpen={isDisburseModalOpen}
        onClose={() => setIsDisburseModalOpen(false)}
        title="ثبت تسویه حساب و واریز بانکی فیش"
      >
        <form onSubmit={handleDisburseSubmit} className="space-y-4 text-xs">
          <div className="bg-muted/40 p-3 rounded-lg">
            <div>مبلغ پرداختی: <strong className="font-mono">{formatMoney(targetSlip?.finalAmount)} تومان</strong></div>
            <div className="text-muted-foreground mt-1">
              مدرس: {targetSlip?.user?.firstName} {targetSlip?.user?.lastName}
            </div>
          </div>

          <div>
            <label className="font-medium text-foreground block mb-1">
              شماره پیگیری واریز بانکی / پایا / چک:
            </label>
            <Input
              type="text"
              placeholder="مثلاً: PAYA-140408-99823"
              value={disburseForm.paymentRefNumber}
              onChange={(e) => setDisburseForm({ paymentRefNumber: e.target.value })}
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsDisburseModalOpen(false)}>
              انصراف
            </Button>
            <Button type="submit" variant="primary" size="sm" disabled={isSubmitting} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              {isSubmitting ? 'درحال ثبت...' : 'ثبت قطعی تسویه بانکی'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* 6. Modal: قرارداد جدید */}
      <Modal
        isOpen={isContractModalOpen}
        onClose={() => setIsContractModalOpen(false)}
        title="ثبت قرارداد مالی و نرخ تدریس مدرس"
      >
        <form onSubmit={handleCreateContract} className="space-y-3 text-xs">
          <div>
            <label className="font-medium block mb-1">انتخاب مدرس:</label>
            <select
              value={contractForm.teacherId}
              onChange={(e) => setContractForm({ ...contractForm, teacherId: e.target.value })}
              className="w-full h-9 rounded-lg border border-input bg-background px-3 py-1"
              required
            >
              {teachers.map((t) => (
                <option key={t.user?.id || t.id} value={t.user?.id || t.id}>
                  {t.user?.firstName || t.firstName} {t.user?.lastName || t.lastName} ({t.user?.phone || t.phone || '-'})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="font-medium block mb-1">سال تحصیلی:</label>
            <select
              value={contractForm.academicYearId}
              onChange={(e) => setContractForm({ ...contractForm, academicYearId: e.target.value })}
              className="w-full h-9 rounded-lg border border-input bg-background px-3 py-1"
              required
            >
              {academicYears.map((y) => (
                <option key={y.id} value={y.id}>
                  {y.name} {y.isCurrent ? '(سال جاری)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="font-medium block mb-1">نوع نرخ تدریس:</label>
              <select
                value={contractForm.rateType}
                onChange={(e) => setContractForm({ ...contractForm, rateType: e.target.value })}
                className="w-full h-9 rounded-lg border border-input bg-background px-3 py-1"
              >
                <option value="HOURLY">ساعتی (بر اساس ۱.۵ ساعت در هر جلسه)</option>
                <option value="PER_SESSION">هر جلسه تدریس</option>
              </select>
            </div>
            <div>
              <label className="font-medium block mb-1">مبلغ نرخ هر واحد (تومان):</label>
              <Input
                type="number"
                value={contractForm.rateAmount}
                onChange={(e) => setContractForm({ ...contractForm, rateAmount: Number(e.target.value) })}
                className="font-mono"
                required
                min={0}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="font-medium block mb-1">سقف تدریس ماهانه (هشدار):</label>
              <Input
                type="number"
                placeholder="مثلاً: ۱۲۰"
                value={contractForm.monthlyHourCap}
                onChange={(e) => setContractForm({ ...contractForm, monthlyHourCap: Number(e.target.value) })}
                className="font-mono"
              />
            </div>
            <div>
              <label className="font-medium block mb-1">حقوق ثابت پایه ماهانه (اختیاری):</label>
              <Input
                type="number"
                placeholder="مثلاً: ۵,۰۰۰,۰۰۰"
                value={contractForm.baseSalary}
                onChange={(e) => setContractForm({ ...contractForm, baseSalary: Number(e.target.value) })}
                className="font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-medium block mb-1">تاریخ شروع اعتبار (شمسی):</label>
              <PersianDatePicker
                value={contractForm.effectiveFrom}
                onChange={(date) => setContractForm({ ...contractForm, effectiveFrom: date })}
                placeholder="مثلاً: ۱۴۰۵-۰۷-۰۱"
              />
            </div>
            <div>
              <label className="font-medium block mb-1">تاریخ پایان قرارداد (اختیاری):</label>
              <PersianDatePicker
                value={contractForm.effectiveTo}
                onChange={(date) => setContractForm({ ...contractForm, effectiveTo: date })}
                placeholder="مثلاً: ۱۴۰۶-۰۳-۳۱"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsContractModalOpen(false)}>
              انصراف
            </Button>
            <Button type="submit" variant="primary" size="sm" disabled={isSubmitting}>
              {isSubmitting ? 'درحال ثبت...' : 'ثبت قرارداد'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* 7. Modal: تعدیل حقوق */}
      <Modal
        isOpen={isAdjustmentModalOpen}
        onClose={() => setIsAdjustmentModalOpen(false)}
        title="ثبت تعدیلات و اصلاحات معوقه حقوق"
      >
        <form onSubmit={handleCreateAdjustment} className="space-y-3 text-xs">
          <div>
            <label className="font-medium block mb-1">انتخاب مدرس:</label>
            <select
              value={adjustmentForm.teacherId}
              onChange={(e) => setAdjustmentForm({ ...adjustmentForm, teacherId: e.target.value })}
              className="w-full h-9 rounded-lg border border-input bg-background px-3 py-1"
              required
            >
              {teachers.map((t) => (
                <option key={t.user?.id || t.id} value={t.user?.id || t.id}>
                  {t.user?.firstName || t.firstName} {t.user?.lastName || t.lastName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="font-medium block mb-1">
              مبلغ تعدیل به تومان (مثبت برای بستانکاری/طلب، منفی برای بدهی/کسر):
            </label>
            <Input
              type="number"
              placeholder="مثلاً: 500000 یا -300000"
              value={adjustmentForm.amount}
              onChange={(e) => setAdjustmentForm({ ...adjustmentForm, amount: Number(e.target.value) })}
              className="font-mono text-sm"
              required
            />
          </div>

          <div>
            <label className="font-medium block mb-1">شرح و دلیل اصلاحیه (الزامی):</label>
            <Input
              type="text"
              placeholder="مثلاً: عدم ثبت یک جلسه حضور در ماه قبل به دلیل قطعی سامانه"
              value={adjustmentForm.reason}
              onChange={(e) => setAdjustmentForm({ ...adjustmentForm, reason: e.target.value })}
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsAdjustmentModalOpen(false)}>
              انصراف
            </Button>
            <Button type="submit" variant="primary" size="sm" disabled={isSubmitting}>
              {isSubmitting ? 'درحال ثبت...' : 'ثبت تعدیل حقوق'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* 8. Modal: پرونده بانکی پرسنل */}
      <Modal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        title="تکمیل اطلاعات پرونده مالی پرسنل"
      >
        <form onSubmit={handleCreateProfile} className="space-y-3 text-xs">
          <div>
            <label className="font-medium block mb-1">انتخاب پرسنل:</label>
            <select
              value={profileForm.userId}
              onChange={(e) => setProfileForm({ ...profileForm, userId: e.target.value })}
              className="w-full h-9 rounded-lg border border-input bg-background px-3 py-1"
              required
            >
              {teachers.map((t) => (
                <option key={t.user?.id || t.id} value={t.user?.id || t.id}>
                  {t.user?.firstName || t.firstName} {t.user?.lastName || t.lastName}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="font-medium block mb-1">نوع قرارداد:</label>
              <select
                value={profileForm.contractType}
                onChange={(e) => setProfileForm({ ...profileForm, contractType: e.target.value })}
                className="w-full h-9 rounded-lg border border-input bg-background px-3 py-1"
              >
                <option value="FULL_TIME_SALARY">تمام‌وقت موظف</option>
                <option value="HOURLY_TEACHER">حق‌التدریس ساعتی</option>
              </select>
            </div>
            <div>
              <label className="font-medium block mb-1">نام بانک:</label>
              <Input
                type="text"
                placeholder="مثلاً: بانک ملی"
                value={profileForm.bankName}
                onChange={(e) => setProfileForm({ ...profileForm, bankName: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="font-medium block mb-1">شماره شبا (با IR یا بدون آن):</label>
            <Input
              type="text"
              placeholder="IR120120000000001234567890"
              value={profileForm.bankShebaNumber}
              onChange={(e) => setProfileForm({ ...profileForm, bankShebaNumber: e.target.value })}
              className="font-mono"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="font-medium block mb-1">شماره حساب:</label>
              <Input
                type="text"
                value={profileForm.bankAccountNumber}
                onChange={(e) => setProfileForm({ ...profileForm, bankAccountNumber: e.target.value })}
                className="font-mono"
              />
            </div>
            <div>
              <label className="font-medium block mb-1">شماره بیمه تأمین اجتماعی:</label>
              <Input
                type="text"
                value={profileForm.insuranceNumber}
                onChange={(e) => setProfileForm({ ...profileForm, insuranceNumber: e.target.value })}
                className="font-mono"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsProfileModalOpen(false)}>
              انصراف
            </Button>
            <Button type="submit" variant="primary" size="sm" disabled={isSubmitting}>
              {isSubmitting ? 'درحال ثبت...' : 'ذخیره مشخصات بانکی'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
