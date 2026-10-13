import React, { useEffect, useState, useRef } from 'react';
import { apiClient } from '../../../lib/api/client';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Badge } from '../../../components/ui/Badge';
import { Modal } from '../../../components/ui/Modal';
import { ResponsivePageHeader } from '../../../components/ui/ResponsivePageHeader';
import {
  Receipt,
  Plus,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  FileText,
  Clock,
  FileSpreadsheet,
  Download,
  UploadCloud,
  Check,
  X,
  RefreshCw,
  Search,
  Users,
  Layers,
  Banknote,
  FileCheck,
  ShieldAlert,
  MessageSquare,
} from 'lucide-react';
import { toast } from 'sonner';

export const FeesPage: React.FC = () => {
  // Navigation Tabs: 'contracts' | 'plans' | 'cheques' | 'import'
  const [activeTab, setActiveTab] = useState<'contracts' | 'plans' | 'cheques' | 'import'>('contracts');

  // Core Data States
  const [contracts, setContracts] = useState<any[]>([]);
  const [feePlans, setFeePlans] = useState<any[]>([]);
  const [cheques, setCheques] = useState<any[]>([]);
  const [chequeStats, setChequeStats] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [academicYears, setAcademicYears] = useState<any[]>([]);
  const [educationalLevels, setEducationalLevels] = useState<any[]>([]);
  const [classrooms, setClassrooms] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [chequeStatusFilter, setChequeStatusFilter] = useState<string>('ALL');

  // Modals
  const [isCreateContractOpen, setIsCreateContractOpen] = useState(false);
  const [isCreatePlanOpen, setIsCreatePlanOpen] = useState(false);
  const [isApplyPlanOpen, setIsApplyPlanOpen] = useState(false);
  const [selectedPlanForApply, setSelectedPlanForApply] = useState<any>(null);
  const [planAllocationPreview, setPlanAllocationPreview] = useState<any>(null);

  const [isRecordPaymentOpen, setIsRecordPaymentOpen] = useState(false);
  const [paymentType, setPaymentType] = useState<'CASH' | 'CHEQUE'>('CASH');
  const [selectedContractForPayment, setSelectedContractForPayment] = useState<any>(null);

  const [isInstallmentsOpen, setIsInstallmentsOpen] = useState(false);
  const [selectedContract, setSelectedContract] = useState<any>(null);

  const [isChequeStatusModalOpen, setIsChequeStatusModalOpen] = useState(false);
  const [selectedCheque, setSelectedCheque] = useState<any>(null);
  const [newChequeStatus, setNewChequeStatus] = useState<'CASHED' | 'BOUNCED' | 'REPLACED'>('CASHED');
  const [chequeStatusNote, setChequeStatusNote] = useState('');

  // Forms Submitting & Error States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form: Individual Contract
  const [contractForm, setContractForm] = useState({
    studentId: '',
    academicYearId: '',
    contractNumber: `FEE-1404-${Math.floor(100 + Math.random() * 900)}`,
    totalAmount: 36000000,
    discountAmount: 0,
    discountReason: '',
    installmentCount: 3,
  });

  // Form: Fee Plan
  const [planForm, setPlanForm] = useState({
    title: '',
    academicYearId: '',
    amount: 36000000,
    appliesTo: 'ALL_SCHOOL',
    educationalLevelId: '',
    classroomId: '',
    installmentCount: 3,
    description: '',
  });

  // Form: Payment (Cash or Cheque)
  const [cashForm, setCashForm] = useState({
    amount: 5000000,
    installmentId: '',
    cashReceivedAt: new Date().toISOString().split('T')[0],
    note: '',
  });

  const [chequeForm, setChequeForm] = useState({
    amount: 10000000,
    installmentId: '',
    checkNumber: '',
    checkSayadId: '',
    bankName: 'بانک ملی ایران',
    branchName: '',
    checkOwnerName: '',
    checkDueDate: '',
    note: '',
  });

  // Excel Import States
  const [importType, setImportType] = useState<'ALLOCATION' | 'PAYMENT'>('ALLOCATION');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importPreviewData, setImportPreviewData] = useState<any>(null);
  const [isImportLoading, setIsImportLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch Core Data
  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [contractsRes, plansRes, chequesRes, statsRes, studentsRes, yearsRes, levelsRes, classesRes] =
        await Promise.all([
          apiClient.get('/finance/contracts'),
          apiClient.get('/finance/plans'),
          apiClient.get('/finance/payments/cheques'),
          apiClient.get('/finance/payments/cheques/stats'),
          apiClient.get('/members/students'),
          apiClient.get('/academic/years'),
          apiClient.get('/academic/levels').catch(() => ({ data: [] })),
          apiClient.get('/classes/classrooms').catch(() => ({ data: [] })),
        ]);

      setContracts(contractsRes.data || []);
      setFeePlans(plansRes.data || []);
      setCheques(chequesRes.data || []);
      setChequeStats(statsRes.data || null);
      setStudents(studentsRes.data || []);
      setAcademicYears(yearsRes.data || []);
      setEducationalLevels(levelsRes.data || []);
      setClassrooms(classesRes.data || []);

      if (studentsRes.data?.length > 0) {
        setContractForm((prev) => ({ ...prev, studentId: studentsRes.data[0].id }));
      }
      if (yearsRes.data?.length > 0) {
        const current = yearsRes.data.find((y: any) => y.isCurrent) || yearsRes.data[0];
        setContractForm((prev) => ({ ...prev, academicYearId: current.id }));
        setPlanForm((prev) => ({ ...prev, academicYearId: current.id }));
      }
    } catch (err) {
      console.error('Failed to load financial data', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const showSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  // 1. Handle Create Fee Plan
  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await apiClient.post('/finance/plans', {
        academicYearId: planForm.academicYearId,
        title: planForm.title,
        amount: planForm.amount,
        appliesTo: planForm.appliesTo,
        educationalLevelId: planForm.educationalLevelId || undefined,
        classroomId: planForm.classroomId || undefined,
        installmentCount: planForm.installmentCount,
        description: planForm.description || undefined,
      });

      setIsCreatePlanOpen(false);
      showSuccess('طرح شهریه با موفقیت ثبت شد');
      fetchData();
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || err.message || 'خطا در ثبت طرح شهریه');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 2. Preview Plan Group Allocation
  const handleOpenApplyPlan = async (plan: any) => {
    setSelectedPlanForApply(plan);
    setIsApplyPlanOpen(true);
    setPlanAllocationPreview(null);
    try {
      const res = await apiClient.get(`/finance/plans/${plan.id}/preview`);
      setPlanAllocationPreview(res.data);
    } catch (err: any) {
      alert('خطا در دریافت پیش‌نمایش تخصیص: ' + (err.response?.data?.message || err.message));
    }
  };

  // 3. Confirm Apply Plan Group Allocation
  const handleConfirmApplyPlan = async () => {
    if (!selectedPlanForApply) return;
    setIsSubmitting(true);
    try {
      const res = await apiClient.post(`/finance/plans/${selectedPlanForApply.id}/apply`);
      setIsApplyPlanOpen(false);
      showSuccess(res.data?.message || 'طرح شهریه با موفقیت روی دانش‌آموزان مشمول اعمال شد');
      fetchData();
    } catch (err: any) {
      alert('خطا در اعمال گروهی: ' + (err.response?.data?.message || err.message));
    } finally {
      setIsSubmitting(false);
    }
  };

  // 4. Handle Create Individual Contract
  const handleCreateContract = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const finalAmount = contractForm.totalAmount - contractForm.discountAmount;
      const instAmount = Math.round(finalAmount / contractForm.installmentCount);

      const installments = Array.from({ length: contractForm.installmentCount }).map((_, i) => {
        const dueDate = new Date();
        dueDate.setMonth(dueDate.getMonth() + i * 2 + 1);
        return {
          installmentNumber: i + 1,
          title: i === 0 ? 'پیش‌پرداخت شهریه' : `قسط شماره ${i + 1}`,
          amount: instAmount,
          dueDate: dueDate.toISOString(),
        };
      });

      await apiClient.post('/finance/contracts', {
        studentId: contractForm.studentId,
        academicYearId: contractForm.academicYearId,
        contractNumber: contractForm.contractNumber,
        totalAmount: contractForm.totalAmount,
        discountAmount: contractForm.discountAmount,
        discountReason: contractForm.discountReason,
        isIndividual: true,
        installments,
      });

      setIsCreateContractOpen(false);
      showSuccess('قرارداد شهریه با موفقیت ثبت شد');
      fetchData();
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || err.message || 'خطا در ثبت قرارداد');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 5. Handle Record Cash / Cheque Payment
  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedContractForPayment) return;
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      if (paymentType === 'CASH') {
        await apiClient.post('/finance/payments/cash', {
          contractId: selectedContractForPayment.id,
          installmentId: cashForm.installmentId || undefined,
          amount: cashForm.amount,
          cashReceivedAt: cashForm.cashReceivedAt ? new Date(cashForm.cashReceivedAt).toISOString() : undefined,
          note: cashForm.note || undefined,
        });
        showSuccess('پرداخت نقدی با موفقیت ثبت و از مانده بدهی کسر شد');
      } else {
        await apiClient.post('/finance/payments/cheque', {
          contractId: selectedContractForPayment.id,
          installmentId: chequeForm.installmentId || undefined,
          amount: chequeForm.amount,
          checkNumber: chequeForm.checkNumber,
          checkSayadId: chequeForm.checkSayadId,
          bankName: chequeForm.bankName,
          branchName: chequeForm.branchName || undefined,
          checkOwnerName: chequeForm.checkOwnerName || undefined,
          checkDueDate: new Date(chequeForm.checkDueDate).toISOString(),
          note: chequeForm.note || undefined,
        });
        showSuccess('برگه چک با موفقیت در وضعیت "در انتظار وصول" ثبت گردید');
      }

      setIsRecordPaymentOpen(false);
      fetchData();
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || err.message || 'خطا در ثبت پرداخت');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 6. Handle Update Cheque Status
  const handleUpdateChequeStatus = async () => {
    if (!selectedCheque) return;
    setIsSubmitting(true);
    try {
      await apiClient.patch(`/finance/payments/cheque/${selectedCheque.id}/status`, {
        status: newChequeStatus,
        note: chequeStatusNote || undefined,
      });

      setIsChequeStatusModalOpen(false);
      showSuccess('وضعیت چک با موفقیت به‌روزرسانی شد');
      fetchData();
    } catch (err: any) {
      alert('خطا در تغییر وضعیت چک: ' + (err.response?.data?.message || err.message));
    } finally {
      setIsSubmitting(false);
    }
  };

  // 7. Handle Excel File Upload & Preview
  const handleUploadExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setIsImportLoading(true);
    setImportPreviewData(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const currentYear = academicYears.find((y) => y.isCurrent) || academicYears[0];
      const endpoint =
        importType === 'ALLOCATION'
          ? `/finance/fees/import/allocation/preview?academicYearId=${currentYear?.id}`
          : '/finance/fees/import/payments/preview';

      const res = await apiClient.post(endpoint, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setImportPreviewData(res.data);
    } catch (err: any) {
      alert('خطا در تحلیل و اعتبارسنجی فایل اکسل: ' + (err.response?.data?.message || err.message));
    } finally {
      setIsImportLoading(false);
    }
  };

  // 8. Confirm Excel Import
  const handleConfirmImport = async () => {
    if (!importPreviewData?.validRows || importPreviewData.validRows.length === 0) return;
    setIsSubmitting(true);

    try {
      const currentYear = academicYears.find((y) => y.isCurrent) || academicYears[0];
      if (importType === 'ALLOCATION') {
        const payload = {
          academicYearId: currentYear?.id,
          rows: importPreviewData.validRows,
        };
        const res = await apiClient.post('/finance/fees/import/allocation/confirm', payload);
        showSuccess(res.data?.message || 'تخصیص‌های اکسل با موفقیت ثبت شد');
      } else {
        const payload = {
          rows: importPreviewData.validRows,
        };
        const res = await apiClient.post('/finance/fees/import/payments/confirm', payload);
        showSuccess(res.data?.message || 'پرداخت‌های اکسل با موفقیت ثبت شد');
      }

      setImportPreviewData(null);
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      fetchData();
    } catch (err: any) {
      alert('خطا در ثبت نهایی: ' + (err.response?.data?.message || err.message));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Download Excel Template
  const handleDownloadTemplate = (type: 'ALLOCATION' | 'PAYMENT') => {
    const url =
      type === 'ALLOCATION'
        ? '/api/v1/finance/fees/import/template/allocation'
        : '/api/v1/finance/fees/import/template/payments';
    window.open(url, '_blank');
  };

  // Filtered Cheques
  const filteredCheques = cheques.filter((chq) => {
    if (chequeStatusFilter !== 'ALL' && chq.checkStatus !== chequeStatusFilter) return false;
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const studentName = `${chq.feeContract?.student?.user?.firstName || ''} ${chq.feeContract?.student?.user?.lastName || ''}`.toLowerCase();
    const sayad = chq.checkSayadId || '';
    const num = chq.checkNumber || '';
    const bank = chq.bankName || '';
    return studentName.includes(q) || sayad.includes(q) || num.includes(q) || bank.includes(q);
  });

  // Filtered Contracts
  const filteredContracts = contracts.filter((c) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const studentName = `${c.student?.user?.firstName || ''} ${c.student?.user?.lastName || ''}`.toLowerCase();
    const nationalId = c.student?.user?.nationalId || '';
    const num = c.contractNumber || '';
    return studentName.includes(q) || nationalId.includes(q) || num.includes(q);
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <ResponsivePageHeader
        icon={Receipt}
        title="شهریه و اقساط"
        actions={
          <div className="flex items-center space-x-2 space-x-reverse flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setImportType('ALLOCATION');
                setActiveTab('import');
              }}
              className="text-xs h-9"
            >
              <FileSpreadsheet className="h-4 w-4 ms-1 text-emerald-600" />
              <span>ورود با اکسل</span>
            </Button>
            <Button
              variant="outline"
              onClick={() => setIsCreatePlanOpen(true)}
              className="text-xs h-9"
            >
              <Layers className="h-4 w-4 ms-1 text-indigo-600" />
              <span>تعریف طرح شهریه</span>
            </Button>
            <Button
              variant="primary"
              onClick={() => setIsCreateContractOpen(true)}
              className="text-xs h-9"
            >
              <Plus className="h-4 w-4 ms-1" />
              <span>ثبت قرارداد موردی</span>
            </Button>
          </div>
        }
      />

      {/* Success Notification */}
      {successMessage && (
        <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-xs font-bold text-emerald-800 flex items-center space-x-2 space-x-reverse">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* KPI Stats Bar */}
      {chequeStats && (
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <Card className="p-3.5 border-r-4 border-r-blue-500">
            <div className="text-[11px] text-gray-500 font-medium">کل چک‌های دریافتی</div>
            <div className="text-xl font-bold font-mono text-ink-darker mt-1">
              {chequeStats.totalCount} فقره
            </div>
            <div className="text-[10px] text-gray-400 mt-0.5">
              {(chequeStats.totalAmount / 1000000).toLocaleString('fa-IR')} م تومان
            </div>
          </Card>

          <Card className="p-3.5 border-r-4 border-r-amber-500">
            <div className="text-[11px] text-gray-500 font-medium">در انتظار وصول (معلق)</div>
            <div className="text-xl font-bold font-mono text-amber-600 mt-1">
              {chequeStats.pendingCount} فقره
            </div>
            <div className="text-[10px] text-amber-500 mt-0.5">
              {(chequeStats.pendingAmount / 1000000).toLocaleString('fa-IR')} م تومان
            </div>
          </Card>

          <Card className="p-3.5 border-r-4 border-r-emerald-500">
            <div className="text-[11px] text-gray-500 font-medium">چک‌های وصول‌شده</div>
            <div className="text-xl font-bold font-mono text-emerald-600 mt-1">
              {chequeStats.cashedCount} فقره
            </div>
            <div className="text-[10px] text-emerald-500 mt-0.5">
              {(chequeStats.cashedAmount / 1000000).toLocaleString('fa-IR')} م تومان
            </div>
          </Card>

          <Card className="p-3.5 border-r-4 border-r-rose-500 bg-rose-50/40">
            <div className="text-[11px] text-rose-700 font-medium flex items-center space-x-1 space-x-reverse">
              <ShieldAlert className="h-3 w-3" />
              <span>چک‌های برگشتی (ریسک)</span>
            </div>
            <div className="text-xl font-bold font-mono text-rose-700 mt-1">
              {chequeStats.bouncedCount} فقره
            </div>
            <div className="text-[10px] text-rose-600 mt-0.5">
              {(chequeStats.bouncedAmount / 1000000).toLocaleString('fa-IR')} م تومان
            </div>
          </Card>

          <Card className="p-3.5 border-r-4 border-r-orange-500">
            <div className="text-[11px] text-gray-500 font-medium">سررسید تا ۳ روز آینده</div>
            <div className="text-xl font-bold font-mono text-orange-600 mt-1">
              {chequeStats.dueSoonCount} فقره
            </div>
            <div className="text-[10px] text-orange-500 mt-0.5">نیازمند پیگیری سررسید</div>
          </Card>
        </div>
      )}

      {/* Tabs Navigation */}
      <div className="flex border-b border-gray-200 text-sm font-medium">
        <button
          onClick={() => setActiveTab('contracts')}
          className={`pb-3 px-4 border-b-2 font-bold transition-colors flex items-center space-x-2 space-x-reverse ${
            activeTab === 'contracts'
              ? 'border-primary text-primary'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Receipt className="h-4 w-4" />
          <span>قراردادها و مانده بدهی ({contracts.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('plans')}
          className={`pb-3 px-4 border-b-2 font-bold transition-colors flex items-center space-x-2 space-x-reverse ${
            activeTab === 'plans'
              ? 'border-primary text-primary'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Layers className="h-4 w-4" />
          <span>طرح‌های شهریه سالانه ({feePlans.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('cheques')}
          className={`pb-3 px-4 border-b-2 font-bold transition-colors flex items-center space-x-2 space-x-reverse ${
            activeTab === 'cheques'
              ? 'border-primary text-primary'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <FileCheck className="h-4 w-4" />
          <span>دفتر چک‌ها و اسناد ({cheques.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('import')}
          className={`pb-3 px-4 border-b-2 font-bold transition-colors flex items-center space-x-2 space-x-reverse ${
            activeTab === 'import'
              ? 'border-primary text-primary'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
          <span>ورود اطلاعات از اکسل</span>
        </button>
      </div>

      {/* TAB 1: CONTRACTS & BALANCES */}
      {activeTab === 'contracts' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="absolute right-3.5 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="جستجو بر اساس نام دانش‌آموز، کد ملی یا شماره قرارداد..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-10 h-10 text-xs"
              />
            </div>
          </div>

          <Card className="overflow-hidden border border-gray-200">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-gray-50 text-gray-600 font-bold border-b border-gray-200">
                  <tr>
                    <th className="py-3 px-4">دانش‌آموز</th>
                    <th className="py-3 px-4">شماره قرارداد</th>
                    <th className="py-3 px-4">طرح شهریه</th>
                    <th className="py-3 px-4">مبلغ کل</th>
                    <th className="py-3 px-4">تخفیف</th>
                    <th className="py-3 px-4">قابل پرداخت</th>
                    <th className="py-3 px-4 text-emerald-700">مانده بدهی</th>
                    <th className="py-3 px-4">وضعیت / تعهد مالی</th>
                    <th className="py-3 px-4 text-center">عملیات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredContracts.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-gray-400 text-xs">
                        هیچ قراردادی با این مشخصات یافت نشد
                      </td>
                    </tr>
                  ) : (
                    filteredContracts.map((c) => {
                      const finalAmount = Number(c.finalPayableAmount);
                      const balance = Number(c.balanceRemaining);
                      const isSettled = balance === 0;

                      return (
                        <tr key={c.id} className="hover:bg-gray-50/80 transition-colors">
                          <td className="py-3 px-4">
                            <div className="font-bold text-ink-darker">
                              {c.student?.user?.firstName} {c.student?.user?.lastName}
                            </div>
                            <div className="text-[10px] text-gray-400 font-mono">
                              کد ملی: {c.student?.user?.nationalId || '—'}
                            </div>
                          </td>
                          <td className="py-3 px-4 font-mono font-medium text-gray-600">
                            {c.contractNumber}
                          </td>
                          <td className="py-3 px-4">
                            {c.feePlan ? (
                              <span className="text-indigo-700 font-medium">{c.feePlan.title}</span>
                            ) : (
                              <span className="text-gray-400 italic">موردی / استثنا</span>
                            )}
                          </td>
                          <td className="py-3 px-4 font-mono">
                            {(Number(c.totalAmount) / 1000000).toLocaleString('fa-IR')} م
                          </td>
                          <td className="py-3 px-4 font-mono text-rose-600">
                            {Number(c.discountAmount) > 0
                              ? `${(Number(c.discountAmount) / 1000000).toLocaleString('fa-IR')} م`
                              : '—'}
                          </td>
                          <td className="py-3 px-4 font-mono font-bold">
                            {(finalAmount / 1000000).toLocaleString('fa-IR')} م تومان
                          </td>
                          <td className="py-3 px-4 font-mono font-extrabold">
                            {isSettled ? (
                              <span className="text-emerald-600">تسویه کامل</span>
                            ) : (
                              <span className="text-rose-600">
                                {(balance / 1000000).toLocaleString('fa-IR')} م تومان
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            {c.hasFinancialHold ? (
                              <Badge variant="destructive" className="flex items-center space-x-1 space-x-reverse">
                                <AlertTriangle className="h-3 w-3" />
                                <span>چک برگشتی / مسدود</span>
                              </Badge>
                            ) : isSettled ? (
                              <Badge variant="success">تسویه شده</Badge>
                            ) : (
                              <Badge variant="warning">دارای بدهی فعال</Badge>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center justify-center space-x-1.5 space-x-reverse">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedContract(c);
                                  setIsInstallmentsOpen(true);
                                }}
                                className="text-[11px] h-7 px-2"
                              >
                                <CreditCard className="h-3.5 w-3.5 ms-1" />
                                <span>اقساط</span>
                              </Button>
                              <Button
                                variant="primary"
                                size="sm"
                                onClick={() => {
                                  setSelectedContractForPayment(c);
                                  setCashForm((prev) => ({
                                    ...prev,
                                    amount: Math.min(balance, 10000000),
                                  }));
                                  setChequeForm((prev) => ({
                                    ...prev,
                                    amount: Math.min(balance, 10000000),
                                  }));
                                  setIsRecordPaymentOpen(true);
                                }}
                                className="text-[11px] h-7 px-2"
                                disabled={isSettled}
                              >
                                <Plus className="h-3.5 w-3.5 ms-1" />
                                <span>ثبت پرداخت</span>
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 2: FEE PLANS & GROUP ALLOCATION */}
      {activeTab === 'plans' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {feePlans.map((plan) => (
              <Card key={plan.id} className="p-4 border border-gray-200 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-sm text-ink-darker">{plan.title}</h3>
                    <div className="text-[11px] text-gray-500 mt-0.5">
                      سال تحصیلی: {plan.academicYear?.name}
                    </div>
                  </div>
                  <Badge variant="default" className="text-[10px]">
                    {plan.appliesTo === 'ALL_SCHOOL'
                      ? 'کل مدرسه'
                      : plan.appliesTo === 'EDUCATIONAL_LEVEL'
                      ? `مقطع ${plan.educationalLevel?.name || ''}`
                      : `کلاس ${plan.classroom?.name || ''}`}
                  </Badge>
                </div>

                <div className="my-4 p-3 bg-gray-50 rounded-xl flex justify-between items-center text-xs">
                  <span className="text-gray-500 font-medium">مبلغ مصوب:</span>
                  <span className="font-bold font-mono text-ink-darker text-sm">
                    {(Number(plan.amount) / 1000000).toLocaleString('fa-IR')} میلیون تومان
                  </span>
                </div>

                <div className="text-xs text-gray-500 space-y-1 mb-4">
                  <div className="flex justify-between">
                    <span>تعداد اقساط پیش‌فرض:</span>
                    <span className="font-bold font-mono">{plan.installmentCount} قسط</span>
                  </div>
                  <div className="flex justify-between">
                    <span>قراردادهای تخصیص‌یافته:</span>
                    <span className="font-bold font-mono text-emerald-600">
                      {plan._count?.contracts || 0} دانش‌آموز
                    </span>
                  </div>
                </div>

                <Button
                  variant="primary"
                  className="w-full text-xs h-9"
                  onClick={() => handleOpenApplyPlan(plan)}
                >
                  <Users className="h-4 w-4 ms-1.5" />
                  <span>پیش‌نمایش و تخصیص گروهی</span>
                </Button>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: CHEQUE LEDGER */}
      {activeTab === 'cheques' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="absolute right-3.5 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="جستجو بر اساس نام دانش‌آموز، کد صیادی، شماره چک یا نام بانک..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-10 h-10 text-xs"
              />
            </div>

            <div className="flex items-center space-x-2 space-x-reverse">
              <span className="text-xs text-gray-500 font-medium">وضعیت چک:</span>
              <select
                value={chequeStatusFilter}
                onChange={(e) => setChequeStatusFilter(e.target.value)}
                className="h-10 rounded-md border border-gray-300 bg-white px-3 text-xs font-bold text-ink-normal focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="ALL">همه وضعیت‌ها</option>
                <option value="PENDING">در انتظار وصول (معلق)</option>
                <option value="CASHED">وصول‌شده</option>
                <option value="BOUNCED">برگشت‌خورده</option>
                <option value="REPLACED">جایگزین‌شده</option>
              </select>
            </div>
          </div>

          <Card className="overflow-hidden border border-gray-200">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-gray-50 text-gray-600 font-bold border-b border-gray-200">
                  <tr>
                    <th className="py-3 px-4">دانش‌آموز / صادرکننده</th>
                    <th className="py-3 px-4">شماره سریال چک</th>
                    <th className="py-3 px-4">کد صیادی ۱۶ رقمی</th>
                    <th className="py-3 px-4">بانک / شعبه</th>
                    <th className="py-3 px-4">تاریخ سررسید</th>
                    <th className="py-3 px-4">مبلغ چک</th>
                    <th className="py-3 px-4">وضعیت سند</th>
                    <th className="py-3 px-4 text-center">اقدام حسابدار</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredCheques.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-gray-400 text-xs">
                        هیچ برگه چکی با این فیلتر ثبت نشده است
                      </td>
                    </tr>
                  ) : (
                    filteredCheques.map((chq) => {
                      const amount = Number(chq.amount);
                      const isDueSoon =
                        chq.checkStatus === 'PENDING' &&
                        chq.checkDueDate &&
                        new Date(chq.checkDueDate).getTime() - Date.now() < 3 * 86400000;

                      return (
                        <tr key={chq.id} className="hover:bg-gray-50/80 transition-colors">
                          <td className="py-3 px-4">
                            <div className="font-bold text-ink-darker">
                              {chq.feeContract?.student?.user?.firstName}{' '}
                              {chq.feeContract?.student?.user?.lastName}
                            </div>
                            <div className="text-[10px] text-gray-400">
                              صاحب حساب: {chq.checkOwnerName || 'ولی دانش‌آموز'}
                            </div>
                          </td>
                          <td className="py-3 px-4 font-mono font-bold text-gray-700">
                            {chq.checkNumber || '—'}
                          </td>
                          <td className="py-3 px-4 font-mono font-bold text-indigo-700">
                            {chq.checkSayadId}
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-medium text-gray-800">{chq.bankName}</div>
                            {chq.branchName && (
                              <div className="text-[10px] text-gray-400">{chq.branchName}</div>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-mono font-bold">
                              {chq.checkDueDate ? new Date(chq.checkDueDate).toLocaleDateString('fa-IR') : '—'}
                            </div>
                            {isDueSoon && (
                              <span className="text-[10px] text-orange-600 font-bold flex items-center space-x-0.5 space-x-reverse">
                                <Clock className="h-3 w-3" />
                                <span>سررسید نزدیک</span>
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 font-mono font-extrabold text-ink-darker">
                            {(amount / 1000000).toLocaleString('fa-IR')} م تومان
                          </td>
                          <td className="py-3 px-4">
                            {chq.checkStatus === 'CASHED' ? (
                              <Badge variant="success">وصول شد (کاهش بدهی)</Badge>
                            ) : chq.checkStatus === 'BOUNCED' ? (
                              <Badge variant="destructive">برگشت خورده (اخطار مالی)</Badge>
                            ) : chq.checkStatus === 'REPLACED' ? (
                              <Badge variant="neutral">جایگزین شده</Badge>
                            ) : (
                              <Badge variant="warning">در انتظار سررسید</Badge>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {chq.checkStatus === 'PENDING' ? (
                              <div className="flex items-center justify-center space-x-1 space-x-reverse">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedCheque(chq);
                                    setNewChequeStatus('CASHED');
                                    setIsChequeStatusModalOpen(true);
                                  }}
                                  className="text-[11px] h-7 px-2 text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                                >
                                  <Check className="h-3.5 w-3.5 ms-1" />
                                  <span>وصول شد</span>
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedCheque(chq);
                                    setNewChequeStatus('BOUNCED');
                                    setIsChequeStatusModalOpen(true);
                                  }}
                                  className="text-[11px] h-7 px-2 text-rose-700 border-rose-300 hover:bg-rose-50"
                                >
                                  <X className="h-3.5 w-3.5 ms-1" />
                                  <span>برگشت</span>
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={async () => {
                                    try {
                                      await apiClient.post('/sms/trigger/cheques');
                                      toast.success('پیامک یادآوری سررسید با موفقیت شلیک شد');
                                    } catch (err: any) {
                                      toast.error(err?.response?.data?.message || 'خطا در ارسال پیامک');
                                    }
                                  }}
                                  className="text-[11px] h-7 px-2 text-amber-700 border-amber-300 hover:bg-amber-50"
                                  title="ارسال پیامک یادآوری سررسید به صادرکننده"
                                >
                                  <MessageSquare className="h-3.5 w-3.5 ms-1" />
                                  <span>پیامک</span>
                                </Button>
                              </div>
                            ) : chq.checkStatus === 'BOUNCED' ? (
                              <Button
                                variant="primary"
                                size="sm"
                                onClick={() => {
                                  setSelectedCheque(chq);
                                  setNewChequeStatus('REPLACED');
                                  setIsChequeStatusModalOpen(true);
                                }}
                                className="text-[11px] h-7 px-2"
                              >
                                <RefreshCw className="h-3.5 w-3.5 ms-1" />
                                <span>جایگزینی چک</span>
                              </Button>
                            ) : (
                              <span className="text-[11px] text-gray-400">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 4: EXCEL IMPORT */}
      {activeTab === 'import' && (
        <div className="space-y-6 max-w-4xl mx-auto">
          {/* Import Mode Selector */}
          <div className="flex bg-gray-100 p-1 rounded-xl">
            <button
              onClick={() => {
                setImportType('ALLOCATION');
                setImportPreviewData(null);
                setSelectedFile(null);
              }}
              className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all ${
                importType === 'ALLOCATION'
                  ? 'bg-white text-ink-darker shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              ۱. ایمپورت تخصیص گروهی شهریه
            </button>
            <button
              onClick={() => {
                setImportType('PAYMENT');
                setImportPreviewData(null);
                setSelectedFile(null);
              }}
              className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all ${
                importType === 'PAYMENT'
                  ? 'bg-white text-ink-darker shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              ۲. ایمپورت گروهی پرداخت‌ها (نقدی و چک)
            </button>
          </div>

          {/* Download Template Banner */}
          <Card className="p-4 bg-indigo-50/60 border border-indigo-100 flex items-center justify-between flex-wrap gap-3">
            <div>
              <h4 className="font-bold text-xs text-indigo-950">فایل نمونه استاندارد اکسل</h4>
              <p className="text-[11px] text-indigo-700 mt-0.5">
                برای جلوگیری از خطای اعتبارسنجی، اطلاعات را در قالب استاندارد رکاد وارد کنید.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDownloadTemplate(importType)}
              className="text-xs bg-white text-indigo-700 border-indigo-200"
            >
              <Download className="h-4 w-4 ms-1" />
              <span>دانلود نمونه اکسل (.xlsx)</span>
            </Button>
          </Card>

          {/* Upload Dropzone */}
          <Card className="p-8 border-2 border-dashed border-gray-300 hover:border-primary text-center transition-colors">
            <input
              type="file"
              ref={fileInputRef}
              accept=".xlsx, .xls"
              onChange={handleUploadExcel}
              className="hidden"
            />
            <div className="flex flex-col items-center justify-center space-y-3 cursor-pointer" onClick={() => fileInputRef.current?.click()}>
              <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <UploadCloud className="h-7 w-7" />
              </div>
              <div>
                <span className="font-bold text-sm text-ink-darker">انتخاب یا کشیدن فایل اکسل</span>
                <p className="text-xs text-gray-500 mt-1">فرمت‌های مجاز: .xlsx یا .xls (حداکثر ۱۰ مگابایت)</p>
              </div>
              {selectedFile && (
                <Badge variant="default" className="font-mono text-xs">
                  {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                </Badge>
              )}
            </div>
          </Card>

          {/* Import Preview Results */}
          {isImportLoading && (
            <div className="py-8 text-center text-xs text-gray-500 flex items-center justify-center space-x-2 space-x-reverse">
              <RefreshCw className="h-4 w-4 animate-spin text-primary" />
              <span>درحال بررسی و اعتبارسنجی سمت سرور...</span>
            </div>
          )}

          {importPreviewData && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border">
                <div className="flex space-x-4 space-x-reverse text-xs">
                  <div>
                    <span className="text-gray-500">کل سطرها: </span>
                    <span className="font-bold font-mono">{importPreviewData.totalRowsProcessed}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">معتبر و آماده ثبت: </span>
                    <span className="font-bold font-mono text-emerald-600">{importPreviewData.validCount}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">ردیف‌های دارای خطا: </span>
                    <span className="font-bold font-mono text-rose-600">{importPreviewData.errorCount}</span>
                  </div>
                </div>

                <Button
                  variant="primary"
                  onClick={handleConfirmImport}
                  disabled={importPreviewData.validCount === 0 || isSubmitting}
                  isLoading={isSubmitting}
                  className="text-xs"
                >
                  <CheckCircle2 className="h-4 w-4 ms-1.5" />
                  <span>ثبت {importPreviewData.validCount} سطر معتبر در سیستم</span>
                </Button>
              </div>

              {/* Error list if any */}
              {importPreviewData.errors?.length > 0 && (
                <Card className="p-4 border-rose-200 bg-rose-50/50">
                  <h4 className="font-bold text-xs text-rose-800 mb-2 flex items-center space-x-1.5 space-x-reverse">
                    <AlertCircle className="h-4 w-4 text-rose-600" />
                    <span>خطاهای یافت‌شده در فایل اکسل:</span>
                  </h4>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto text-xs">
                    {importPreviewData.errors.map((err: any, idx: number) => (
                      <div key={idx} className="p-2 bg-white rounded border border-rose-200 text-rose-700 flex justify-between">
                        <span>ردیف {err.rowIndex}: {err.message}</span>
                        <span className="font-mono text-[10px] text-gray-500">{err.identifier}</span>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: CREATE FEE PLAN */}
      <Modal
        isOpen={isCreatePlanOpen}
        onClose={() => setIsCreatePlanOpen(false)}
        title="تعریف طرح جدید شهریه مدرسه"
        description="تعریف مبلغ مصوب، محدوده شمول و برنامه اقساط پیش‌فرض"
        maxWidth="lg"
      >
        {errorMessage && (
          <div className="mb-4 rounded-lg bg-rose-50 p-3 text-xs text-rose-700 border border-rose-200">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleCreatePlan} className="space-y-4">
          <Input
            label="عنوان طرح شهریه"
            placeholder="مثال: شهریه سالانه پایه دهم ریاضی ۱۴۰۴-۱۴۰۵"
            value={planForm.title}
            onChange={(e) => setPlanForm({ ...planForm, title: e.target.value })}
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-ink-normal mb-1.5 text-right">سال تحصیلی</label>
              <select
                value={planForm.academicYearId}
                onChange={(e) => setPlanForm({ ...planForm, academicYearId: e.target.value })}
                className="flex h-11 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-ink-normal focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {academicYears.map((y) => (
                  <option key={y.id} value={y.id}>
                    {y.name} {y.isCurrent ? '(سال جاری)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <Input
              label="مبلغ مصوب طرح (تومان)"
              type="number"
              value={planForm.amount}
              onChange={(e) => setPlanForm({ ...planForm, amount: Number(e.target.value) })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-ink-normal mb-1.5 text-right">دامنه اعمال طرح</label>
              <select
                value={planForm.appliesTo}
                onChange={(e) => setPlanForm({ ...planForm, appliesTo: e.target.value })}
                className="flex h-11 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-ink-normal focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="ALL_SCHOOL">کل دانش‌آموزان مدرسه</option>
                <option value="EDUCATIONAL_LEVEL">یک مقطع تحصیلی خاص</option>
                <option value="CLASSROOM">یک کلاس مشخص</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-ink-normal mb-1.5 text-right">تعداد اقساط پیش‌فرض</label>
              <select
                value={planForm.installmentCount}
                onChange={(e) => setPlanForm({ ...planForm, installmentCount: Number(e.target.value) })}
                className="flex h-11 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-ink-normal focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value={1}>یکجا (۱ قسط)</option>
                <option value={2}>۲ قسط</option>
                <option value={3}>۳ قسط</option>
                <option value={4}>۴ قسط</option>
                <option value={6}>۶ قسط ماهانه</option>
              </select>
            </div>
          </div>

          {planForm.appliesTo === 'EDUCATIONAL_LEVEL' && (
            <div>
              <label className="block text-sm font-medium text-ink-normal mb-1.5 text-right">انتخاب مقطع تحصیلی</label>
              <select
                value={planForm.educationalLevelId}
                onChange={(e) => setPlanForm({ ...planForm, educationalLevelId: e.target.value })}
                className="flex h-11 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-ink-normal focus:outline-none focus:ring-2 focus:ring-primary"
                required
              >
                <option value="">-- انتخاب مقطع --</option>
                {educationalLevels.map((lvl) => (
                  <option key={lvl.id} value={lvl.id}>
                    {lvl.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {planForm.appliesTo === 'CLASSROOM' && (
            <div>
              <label className="block text-sm font-medium text-ink-normal mb-1.5 text-right">انتخاب کلاس</label>
              <select
                value={planForm.classroomId}
                onChange={(e) => setPlanForm({ ...planForm, classroomId: e.target.value })}
                className="flex h-11 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-ink-normal focus:outline-none focus:ring-2 focus:ring-primary"
                required
              >
                <option value="">-- انتخاب کلاس --</option>
                {classrooms.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex justify-end space-x-2 space-x-reverse pt-2">
            <Button type="button" variant="ghost" onClick={() => setIsCreatePlanOpen(false)}>
              انصراف
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              ثبت طرح شهریه
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: APPLY FEE PLAN PREVIEW */}
      <Modal
        isOpen={isApplyPlanOpen}
        onClose={() => setIsApplyPlanOpen(false)}
        title={`پیش‌نمایش تخصیص گروهی: ${selectedPlanForApply?.title}`}
        description="بررسی لیست دانش‌آموزان مشمول قبل از اعمال نهایی"
        maxWidth="lg"
      >
        {planAllocationPreview ? (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3 p-3.5 bg-gray-50 rounded-xl border text-center text-xs">
              <div>
                <div className="text-gray-500">کل مشمولین:</div>
                <div className="text-base font-bold font-mono mt-0.5">
                  {planAllocationPreview.totalEligibleCount} دانش‌آموز
                </div>
              </div>
              <div>
                <div className="text-gray-500">آماده صدور بدهی:</div>
                <div className="text-base font-bold font-mono text-emerald-600 mt-0.5">
                  {planAllocationPreview.readyToAllocateCount} نفر
                </div>
              </div>
              <div>
                <div className="text-gray-500">دارای قرارداد قبلی:</div>
                <div className="text-base font-bold font-mono text-gray-400 mt-0.5">
                  {planAllocationPreview.alreadyAllocatedCount} نفر
                </div>
              </div>
            </div>

            <div className="max-h-48 overflow-y-auto space-y-1.5 border rounded-xl p-2 text-xs">
              <div className="text-[11px] font-bold text-gray-500 px-2">لیست دانش‌آموزان جدید مشمول:</div>
              {planAllocationPreview.readyStudents?.map((st: any) => (
                <div key={st.studentId} className="p-2 bg-gray-50 rounded flex justify-between items-center">
                  <span className="font-bold text-ink-darker">{st.name}</span>
                  <span className="text-gray-500 font-mono text-[11px]">{st.classroomName}</span>
                </div>
              ))}
            </div>

            <div className="flex justify-end space-x-2 space-x-reverse pt-2">
              <Button variant="ghost" onClick={() => setIsApplyPlanOpen(false)}>
                انصراف
              </Button>
              <Button
                variant="primary"
                onClick={handleConfirmApplyPlan}
                disabled={planAllocationPreview.readyToAllocateCount === 0 || isSubmitting}
                isLoading={isSubmitting}
              >
                تایید و بدهکار کردن {planAllocationPreview.readyToAllocateCount} دانش‌آموز
              </Button>
            </div>
          </div>
        ) : (
          <div className="py-8 text-center text-xs text-gray-500">
            <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-primary" />
            <span>درحال بارگذاری مشمولین...</span>
          </div>
        )}
      </Modal>

      {/* MODAL 3: RECORD PAYMENT (CASH OR CHEQUE) */}
      <Modal
        isOpen={isRecordPaymentOpen}
        onClose={() => setIsRecordPaymentOpen(false)}
        title={`ثبت پرداخت: ${selectedContractForPayment?.student?.user?.firstName} ${selectedContractForPayment?.student?.user?.lastName}`}
        description={`شماره قرارداد: ${selectedContractForPayment?.contractNumber} | مانده بدهی: ${(Number(selectedContractForPayment?.balanceRemaining || 0) / 1000000).toLocaleString('fa-IR')} م تومان`}
        maxWidth="lg"
      >
        <div className="flex bg-gray-100 p-1 rounded-xl mb-4">
          <button
            type="button"
            onClick={() => setPaymentType('CASH')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
              paymentType === 'CASH' ? 'bg-white text-ink-darker shadow-sm' : 'text-gray-500'
            }`}
          >
            پرداخت نقدی
          </button>
          <button
            type="button"
            onClick={() => setPaymentType('CHEQUE')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
              paymentType === 'CHEQUE' ? 'bg-white text-ink-darker shadow-sm' : 'text-gray-500'
            }`}
          >
            پرداخت با چک صیادی
          </button>
        </div>

        {errorMessage && (
          <div className="mb-4 rounded-lg bg-rose-50 p-3 text-xs text-rose-700 border border-rose-200">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleRecordPayment} className="space-y-4">
          {paymentType === 'CASH' ? (
            <>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="مبلغ نقدی دریافتی (تومان)"
                  type="number"
                  value={cashForm.amount}
                  onChange={(e) => setCashForm({ ...cashForm, amount: Number(e.target.value) })}
                  required
                />
                <Input
                  label="تاریخ دریافت وجه"
                  type="date"
                  value={cashForm.cashReceivedAt}
                  onChange={(e) => setCashForm({ ...cashForm, cashReceivedAt: e.target.value })}
                  required
                />
              </div>

              <Input
                label="یادداشت / توضیحات فیش"
                placeholder="مثال: واریز نقدی به حساب مدرسه / فیش صندوق"
                value={cashForm.note}
                onChange={(e) => setCashForm({ ...cashForm, note: e.target.value })}
              />
            </>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="مبلغ چک (تومان)"
                  type="number"
                  value={chequeForm.amount}
                  onChange={(e) => setChequeForm({ ...chequeForm, amount: Number(e.target.value) })}
                  required
                />
                <Input
                  label="تاریخ سررسید چک"
                  type="date"
                  value={chequeForm.checkDueDate}
                  onChange={(e) => setChequeForm({ ...chequeForm, checkDueDate: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="کد صیادی ۱۶ رقمی"
                  placeholder="مثال: 1234567890123456"
                  maxLength={16}
                  value={chequeForm.checkSayadId}
                  onChange={(e) => setChequeForm({ ...chequeForm, checkSayadId: e.target.value.replace(/[^0-9]/g, '') })}
                  required
                />
                <Input
                  label="شماره سریال چک"
                  placeholder="مثال: 123456/78"
                  value={chequeForm.checkNumber}
                  onChange={(e) => setChequeForm({ ...chequeForm, checkNumber: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="نام بانک صادرکننده"
                  value={chequeForm.bankName}
                  onChange={(e) => setChequeForm({ ...chequeForm, bankName: e.target.value })}
                  required
                />
                <Input
                  label="نام صاحب حساب (در صورت مغایرت)"
                  placeholder="اختیاری"
                  value={chequeForm.checkOwnerName}
                  onChange={(e) => setChequeForm({ ...chequeForm, checkOwnerName: e.target.value })}
                />
              </div>
            </>
          )}

          <div className="flex justify-end space-x-2 space-x-reverse pt-2">
            <Button type="button" variant="ghost" onClick={() => setIsRecordPaymentOpen(false)}>
              انصراف
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              ثبت پرداخت
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 4: UPDATE CHEQUE STATUS (CASHED / BOUNCED / REPLACED) */}
      <Modal
        isOpen={isChequeStatusModalOpen}
        onClose={() => setIsChequeStatusModalOpen(false)}
        title="تغییر وضعیت برگه چک"
        description={`چک شماره ${selectedCheque?.checkNumber} (صیاد: ${selectedCheque?.checkSayadId}) | مبلغ: ${(Number(selectedCheque?.amount || 0) / 1000000).toLocaleString('fa-IR')} م تومان`}
        maxWidth="md"
      >
        <div className="space-y-4">
          <div className="p-3 bg-gray-50 rounded-xl border text-xs">
            <span className="text-gray-500 font-medium">وضعیت انتخابی جدید:</span>
            <div className="mt-1 font-bold text-sm">
              {newChequeStatus === 'CASHED' ? (
                <span className="text-emerald-700">وصول شد (بدهی دانش‌آموز کسر خواهد شد)</span>
              ) : newChequeStatus === 'BOUNCED' ? (
                <span className="text-rose-700">برگشت خورد (بدهی باقی مانده و هشدار مالی فعال می‌شود)</span>
              ) : (
                <span className="text-indigo-700">جایگزینی سند (اتصال به چک یا پرداخت جدید)</span>
              )}
            </div>
          </div>

          <Input
            label="علت / توضیحات حسابدار"
            placeholder="مثال: تایید وصول حواله بانکی / کسر موجودی حساب"
            value={chequeStatusNote}
            onChange={(e) => setChequeStatusNote(e.target.value)}
          />

          <div className="flex justify-end space-x-2 space-x-reverse pt-2">
            <Button variant="ghost" onClick={() => setIsChequeStatusModalOpen(false)}>
              انصراف
            </Button>
            <Button
              variant={newChequeStatus === 'BOUNCED' ? 'destructive' : 'primary'}
              onClick={handleUpdateChequeStatus}
              isLoading={isSubmitting}
            >
              تایید تغییر وضعیت
            </Button>
          </div>
        </div>
      </Modal>

      {/* MODAL 5: INSTALLMENTS BREAKDOWN */}
      <Modal
        isOpen={isInstallmentsOpen}
        onClose={() => setIsInstallmentsOpen(false)}
        title={`اقساط و تاریخچه: ${selectedContract?.contractNumber}`}
        description={`دانش‌آموز: ${selectedContract?.student?.user?.firstName} ${selectedContract?.student?.user?.lastName}`}
        maxWidth="lg"
      >
        {selectedContract && (
          <div className="space-y-4">
            <div className="space-y-2">
              {selectedContract.installments?.map((inst: any) => (
                <div
                  key={inst.id}
                  className="flex items-center justify-between p-3.5 rounded-xl border bg-gray-50 text-xs"
                >
                  <div>
                    <div className="font-bold text-ink-darker flex items-center space-x-1.5 space-x-reverse">
                      <span>{inst.title}</span>
                      {inst.status === 'PAID' ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      ) : (
                        <Clock className="h-4 w-4 text-amber-500" />
                      )}
                    </div>
                    <div className="text-[11px] text-gray-500 mt-0.5">
                      سررسید: {new Date(inst.dueDate).toLocaleDateString('fa-IR')}
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 space-x-reverse">
                    <div className="font-bold text-ink-dark font-mono">
                      {(Number(inst.amount) / 1000000).toLocaleString('fa-IR')} م تومان
                    </div>

                    {inst.status === 'PAID' ? (
                      <Badge variant="success">تسویه شده</Badge>
                    ) : (
                      <Badge variant="warning">در انتظار پرداخت</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="primary" onClick={() => setIsInstallmentsOpen(false)}>
                بستن
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
