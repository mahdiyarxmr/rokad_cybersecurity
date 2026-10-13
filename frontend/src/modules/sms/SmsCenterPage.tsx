import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Send,
  MessageSquare,
  Sparkles,
  Clock,
  Sliders,
  RefreshCw,
  CreditCard,
  Zap,
  FileText,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '../../lib/api/client';
import { toPersianDigits } from '../../lib/utils';
import { StatCard } from '../../components/ui/StatCard';
import { SmsLivePhonePreview } from './components/SmsLivePhonePreview';
import { ManualSmsTab } from './components/ManualSmsTab';
import { AutomationsTab } from './components/AutomationsTab';
import { SmsLogsTab } from './components/SmsLogsTab';
import { GatewaySettingsTab } from './components/GatewaySettingsTab';

export const SmsCenterPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'manual' | 'automation' | 'logs' | 'gateways'>('manual');

  // Manual Send Form States
  const [targetType, setTargetType] = useState<'ROLE' | 'CLASS' | 'INDIVIDUAL' | 'DIRECT_PHONE'>('ROLE');
  const [targetRole, setTargetRole] = useState<'ALL' | 'PARENTS' | 'STUDENTS' | 'TEACHERS' | 'STAFF'>('PARENTS');
  const [selectedClassroomId, setSelectedClassroomId] = useState<string>('');
  const [classAudience, setClassAudience] = useState<'PARENTS' | 'STUDENTS' | 'BOTH'>('PARENTS');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [directPhone, setDirectPhone] = useState<string>('');
  const [messageText, setMessageText] = useState<string>('');

  // Gateways Config Form State
  const [amootToken, setAmootToken] = useState<string>('');
  const [amootLine, setAmootLine] = useState<string>('');
  const [selectedProvider, setSelectedProvider] = useState<'AMOOT' | 'KAVENEGAR' | 'SANDBOX'>('AMOOT');

  // Logs filters & pagination
  const [logSearch, setLogSearch] = useState<string>('');
  const [logTypeFilter, setLogTypeFilter] = useState<string>('');
  const [logPage, setLogPage] = useState<number>(1);

  // 1. Fetch Gateway Config & Balance
  const { data: gatewayConfigData, isLoading: gatewayConfigLoading, refetch: refetchGatewayConfig } = useQuery({
    queryKey: ['sms-gateway-config'],
    queryFn: async () => {
      const res: any = await apiClient.get('/sms/config');
      return res?.data || res;
    },
  });

  useEffect(() => {
    if (gatewayConfigData) {
      if (gatewayConfigData.provider) setSelectedProvider(gatewayConfigData.provider);
      if (gatewayConfigData.amoot?.apiKey) setAmootToken(gatewayConfigData.amoot.apiKey);
      if (gatewayConfigData.amoot?.senderLine) setAmootLine(gatewayConfigData.amoot.senderLine);
    }
  }, [gatewayConfigData]);

  // 2. Fetch SMS Stats
  const { data: statsData, isLoading: statsLoading, refetch: refetchStats } = useQuery({
    queryKey: ['sms-stats'],
    queryFn: async () => {
      const res: any = await apiClient.get('/sms/stats');
      return res?.data || res;
    },
  });

  // 3. Fetch Classrooms for Class SMS
  const { data: classroomsData } = useQuery({
    queryKey: ['classes-list'],
    queryFn: async () => {
      const res: any = await apiClient.get('/classes/classrooms');
      return res?.data !== undefined ? res.data : res;
    },
  });

  // 4. Fetch Directory Users for Individual SMS
  const { data: usersData } = useQuery({
    queryKey: ['sms-directory-users'],
    queryFn: async () => {
      const res: any = await apiClient.get('/sms/recipients');
      return res?.data !== undefined ? res.data : res;
    },
  });

  // 5. Fetch SMS Logs
  const { data: logsData, isLoading: logsLoading, refetch: refetchLogs } = useQuery({
    queryKey: ['sms-logs', logPage, logTypeFilter, logSearch],
    queryFn: async () => {
      const res: any = await apiClient.get('/sms/logs', {
        params: {
          page: logPage,
          limit: 30,
          type: logTypeFilter || undefined,
          search: logSearch || undefined,
        },
      });
      return res?.data || res;
    },
  });

  // 6. Fetch Templates
  const { data: templatesData } = useQuery({
    queryKey: ['sms-templates'],
    queryFn: async () => {
      const res: any = await apiClient.get('/sms/templates');
      return res?.data || res;
    },
  });

  // 7. Fetch Quick Templates
  const { data: quickTemplatesData } = useQuery({
    queryKey: ['sms-quick-templates'],
    queryFn: async () => {
      const res: any = await apiClient.get('/sms/quick-templates');
      return res?.data || res;
    },
  });

  // --- Mutations ---
  const sendManualMutation = useMutation({
    mutationFn: async (payload: any) => apiClient.post('/sms/manual-send', payload),
    onSuccess: (res: any) => {
      const data = res?.data || res;
      if (data?.sentCount > 0) {
        toast.success(data?.message || 'پیامک با موفقیت ارسال شد');
      } else if (data?.failedCount > 0) {
        toast.error(data?.message || 'خطا در ارسال پیامک');
      } else {
        toast.success(data?.message || 'پیامک با موفقیت ارسال شد');
      }
      setMessageText('');
      setDirectPhone('');
      setSelectedUserIds([]);
      queryClient.invalidateQueries({ queryKey: ['sms-logs'] });
      queryClient.invalidateQueries({ queryKey: ['sms-stats'] });
      queryClient.invalidateQueries({ queryKey: ['sms-gateway-config'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'خطا در ارسال پیامک');
    },
  });

  const triggerChequesMutation = useMutation({
    mutationFn: async () => apiClient.post('/sms/trigger/cheques'),
    onSuccess: (res: any) => {
      const data = res?.data || res;
      toast.success(`بررسی چک‌ها انجام شد: ${toPersianDigits(data?.sentCount || 0)} پیامک یادآوری ارسال گردید.`);
      queryClient.invalidateQueries({ queryKey: ['sms-logs'] });
      queryClient.invalidateQueries({ queryKey: ['sms-stats'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'خطا در اجرای فرآیند چک‌ها');
    },
  });

  const triggerBirthdaysMutation = useMutation({
    mutationFn: async () => apiClient.post('/sms/trigger/birthdays'),
    onSuccess: (res: any) => {
      const data = res?.data || res;
      toast.success(`بررسی زادروزها انجام شد: ${toPersianDigits(data?.sentCount || 0)} پیامک تبریک ارسال گردید.`);
      queryClient.invalidateQueries({ queryKey: ['sms-logs'] });
      queryClient.invalidateQueries({ queryKey: ['sms-stats'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'خطا در اجرای تبریک زادروز');
    },
  });

  const upsertTemplateMutation = useMutation({
    mutationFn: async (payload: any) => apiClient.post('/sms/templates', payload),
    onSuccess: () => {
      toast.success('الگوی اتوماسیون با موفقیت به‌روزرسانی شد');
      queryClient.invalidateQueries({ queryKey: ['sms-templates'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'خطا در ثبت الگوی پیامک');
    },
  });

  const updateGatewayConfigMutation = useMutation({
    mutationFn: async (payload: any) => apiClient.post('/sms/config', payload),
    onSuccess: (data: any) => {
      toast.success(data?.message || 'تنظیمات درگاه ذخیره و فعال شد');
      queryClient.invalidateQueries({ queryKey: ['sms-gateway-config'] });
      queryClient.invalidateQueries({ queryKey: ['sms-stats'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'خطا در ذخیره تنظیمات درگاه');
    },
  });

  const addQuickTemplateMutation = useMutation({
    mutationFn: async (payload: any) => apiClient.post('/sms/quick-templates', payload),
    onSuccess: () => {
      toast.success('الگوی سریع با موفقیت افزوده شد');
      queryClient.invalidateQueries({ queryKey: ['sms-quick-templates'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'خطا در افزودن الگو');
    },
  });

  const updateQuickTemplateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: any }) =>
      apiClient.patch(`/sms/quick-templates/${id}`, payload),
    onSuccess: () => {
      toast.success('الگوی سریع به‌روزرسانی شد');
      queryClient.invalidateQueries({ queryKey: ['sms-quick-templates'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'خطا در ویرایش الگو');
    },
  });

  const deleteQuickTemplateMutation = useMutation({
    mutationFn: async (id: string) => apiClient.delete(`/sms/quick-templates/${id}`),
    onSuccess: () => {
      toast.success('الگوی سریع حذف شد');
      queryClient.invalidateQueries({ queryKey: ['sms-quick-templates'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'خطا در حذف الگو');
    },
  });

  const classrooms = Array.isArray(classroomsData)
    ? classroomsData
    : Array.isArray(classroomsData?.data)
    ? classroomsData.data
    : [];
  const usersList = Array.isArray(usersData)
    ? usersData
    : Array.isArray(usersData?.data)
    ? usersData.data
    : [];
  const logsList = Array.isArray(logsData?.logs) ? logsData.logs : [];
  const totalLogs = logsData?.total || 0;
  const templates = Array.isArray(templatesData) ? templatesData : [];
  const quickTemplates = Array.isArray(quickTemplatesData) ? quickTemplatesData : [];

  const charCount = messageText.length;
  // Persian / Unicode SMS standards (Amoot / Telecommunication standard):
  // Persian / Unicode: 1st part = 70 chars. Multi-part UDH = 67 chars per part.
  // English / GSM-7: 1st part = 160 chars. Multi-part UDH = 153 chars per part.
  const hasUnicode = /[\u0600-\u06FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(messageText) || charCount === 0 || !/^[\x00-\x7F]*$/.test(messageText);
  const partCapacityFirst = hasUnicode ? 70 : 160;
  const partCapacityNext = hasUnicode ? 67 : 153;

  const calculateSmsParts = (chars: number) => {
    if (chars <= 0) return 1;
    if (chars <= partCapacityFirst) return 1;
    return Math.ceil((chars - partCapacityFirst) / partCapacityNext) + 1;
  };

  const smsParts = calculateSmsParts(charCount);

  // Remaining characters in current part
  const charsRemainingInPart = charCount <= partCapacityFirst
    ? partCapacityFirst - charCount
    : partCapacityNext - ((charCount - partCapacityFirst) % partCapacityNext || partCapacityNext);

  // amootsms standard tariff estimate (live from account or 199 if loading/not set)
  const unitTariffTomans = (gatewayConfigData?.liveAccount?.unitPriceTomans && gatewayConfigData.liveAccount.unitPriceTomans > 0)
    ? gatewayConfigData.liveAccount.unitPriceTomans
    : 199;
  const singleRecipientCostTomans = smsParts * unitTariffTomans;

  const getEstimatedRecipientCount = () => {
    switch (targetType) {
      case 'ROLE': {
        if (targetRole === 'ALL') return usersList.length || 0;
        if (targetRole === 'PARENTS') {
          return usersList.filter((u: any) => (u.role || '').toUpperCase() === 'PARENT').length || 0;
        }
        if (targetRole === 'STUDENTS') {
          return usersList.filter((u: any) => (u.role || '').toUpperCase() === 'STUDENT').length || 0;
        }
        if (targetRole === 'TEACHERS') {
          return usersList.filter((u: any) => (u.role || '').toUpperCase() === 'TEACHER').length || 0;
        }
        if (targetRole === 'STAFF') {
          return usersList.filter((u: any) => {
            const r = (u.role || '').toUpperCase();
            return r === 'STAFF' || r === 'SCHOOL_ADMIN' || r === 'SUPER_ADMIN';
          }).length || 0;
        }
        return 0;
      }
      case 'CLASS': {
        const cls = classrooms.find((c: any) => c.id === selectedClassroomId);
        const count = cls?._count?.enrollments ?? cls?._count?.students ?? cls?.students?.length ?? 0;
        return classAudience === 'BOTH' ? count * 2 : count;
      }
      case 'INDIVIDUAL':
        return selectedUserIds.length || 0;
      case 'DIRECT_PHONE': {
        if (!directPhone.trim()) return 0;
        const phones = directPhone
          .split(/[\r\n,;\s]+/)
          .map((p) => p.trim())
          .filter((p) => p.length >= 8);
        return phones.length > 0 ? phones.length : 1;
      }
      default:
        return 0;
    }
  };

  const estimatedRecipients = getEstimatedRecipientCount();
  // If no recipient is explicitly selected yet, calculate for at least 1 recipient in the preview/estimation so user sees deduction
  const effectiveRecipients = estimatedRecipients > 0 ? estimatedRecipients : 1;
  const totalCostTomans = (estimatedRecipients > 0 ? estimatedRecipients : 1) * singleRecipientCostTomans;
  const liveCreditTomans =
    gatewayConfigData?.liveAccount?.remaindCreditTomans ??
    (gatewayConfigData?.liveAccount?.remaindCredit !== undefined
      ? Math.floor(gatewayConfigData.liveAccount.remaindCredit / 10)
      : 0);
  const creditAfterSendTomans = liveCreditTomans - totalCostTomans;

  const getTargetDescription = () => {
    switch (targetType) {
      case 'ROLE':
        if (targetRole === 'PARENTS') return 'اولیای تمام دانش‌آموزان';
        if (targetRole === 'STUDENTS') return 'تمامی دانش‌آموزان';
        if (targetRole === 'TEACHERS') return 'کادر آموزشی و مربیان';
        if (targetRole === 'STAFF') return 'کادر اجرایی';
        return 'تمامی اعضای مجتمع';
      case 'CLASS':
        return 'دانش‌آموزان و اولیای کلاس منتخب';
      case 'INDIVIDUAL':
        return `${toPersianDigits(selectedUserIds.length)} مخاطب انتخابی`;
      case 'DIRECT_PHONE': {
        const count = estimatedRecipients;
        if (count > 1) return `${toPersianDigits(count)} شماره مستقیم`;
        return directPhone.trim() || 'شماره مستقیم';
      }
      default:
        return 'مخاطب پیامک';
    }
  };

  const handleSendManual = () => {
    if (!messageText.trim()) {
      toast.error('لطفاً متن پیامک را وارد نمایید');
      return;
    }

    const payload: any = {
      message: messageText.trim(),
      targetType,
    };

    if (targetType === 'ROLE') {
      payload.targetRole = targetRole;
    } else if (targetType === 'CLASS') {
      if (!selectedClassroomId) {
        toast.error('لطفاً یک کلاس انتخاب کنید');
        return;
      }
      payload.classroomId = selectedClassroomId;
      payload.classAudience = classAudience;
    } else if (targetType === 'INDIVIDUAL') {
      if (selectedUserIds.length === 0) {
        toast.error('لطفاً حداقل یک مخاطب را انتخاب کنید');
        return;
      }
      payload.targetUserIds = selectedUserIds;
    } else if (targetType === 'DIRECT_PHONE') {
      if (!directPhone.trim()) {
        toast.error('لطفاً شماره تلفن گیرنده را وارد نمایید');
        return;
      }
      payload.directPhone = directPhone.trim();
    }

    sendManualMutation.mutate(payload);
  };

  const handleSaveGatewayConfig = () => {
    updateGatewayConfigMutation.mutate({
      provider: selectedProvider,
      amootApiKey: amootToken.trim() || undefined,
      amootSenderLine: amootLine.trim() || undefined,
    });
  };

  return (
    <div className="space-y-6 sm:space-y-8 pb-12">
      {/* 1. Header Banner & Identity */}
      <div className="rokad-card p-6 sm:p-8 bg-white dark:bg-[#151C28] border-[1.5px] border-primary/40 shadow-[4px_4px_0_#202A5A] dark:shadow-[4px_4px_0_#59BBAF]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-ecosystem-light dark:bg-ecosystem-darker/60 border-2 border-primary/40 flex items-center justify-center text-primary shadow-[2.5px_2.5px_0_#59BBAF] shrink-0">
              <MessageSquare className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-2xl font-black text-sec dark:text-white">
                  سامانه هوشمند پیامک رُکاد
                </h1>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-ecosystem-light dark:bg-ecosystem-darker/50 text-ecosystem-darker dark:text-ecosystem-light border border-primary/30">
                  <Zap className="w-3 h-3 text-primary" /> نسل ۳ هوشمند
                </span>
              </div>
            </div>
          </div>

          {/* Active Balance & Live Gateway Status Badges */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Live Balance Card */}
            <div className="flex items-center gap-3 bg-[#FAFAFA] dark:bg-[#1C2536] border-[1.5px] border-gray-200 dark:border-gray-700 rounded-2xl p-2.5 px-4 shadow-[2px_2px_0_#59BBAF]">
              <div className="p-2 rounded-xl bg-[#59BBAF]/15 text-[#1F413D] dark:text-[#59BBAF] shrink-0">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-ink-normal/60 dark:text-gray-400 block">مانده اعتبار:</span>
                <div className="text-sm sm:text-base font-black text-sec dark:text-white font-mono">
                  {gatewayConfigLoading
                    ? '...'
                    : gatewayConfigData?.liveAccount?.remaindCreditTomans !== undefined
                    ? `${toPersianDigits(gatewayConfigData.liveAccount.remaindCreditTomans.toLocaleString())} تومان`
                    : gatewayConfigData?.liveAccount?.remaindCredit !== undefined
                    ? `${toPersianDigits(Math.floor(gatewayConfigData.liveAccount.remaindCredit / 10).toLocaleString())} تومان`
                    : '۰ تومان'}
                </div>
              </div>
            </div>

            {/* Gateway Status Badge */}
            <div className="flex items-center gap-2.5 bg-[#F8F9FA] dark:bg-[#1C2536] border border-gray-200 dark:border-gray-700 rounded-2xl p-2.5 px-3.5 shadow-[2px_2px_0_#202A5A] dark:shadow-[2px_2px_0_#59BBAF]">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-primary" />
              </span>
              <div className="text-xs">
                <span className="text-ink-normal/60 dark:text-gray-400 block font-medium">درگاه متصل:</span>
                <span className="font-black text-sec dark:text-white font-mono uppercase">
                  {gatewayConfigLoading ? '...' : (gatewayConfigData?.provider || 'AMOOT SMS')}
                </span>
              </div>
              <div className="h-6 w-px bg-gray-300 dark:bg-gray-700 mx-1" />
              <button
                type="button"
                onClick={() => {
                  refetchStats();
                  refetchLogs();
                  refetchGatewayConfig();
                  toast.success('اعتبار و داده‌های درگاه به‌روزرسانی شد');
                }}
                className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 text-ink-normal/80 dark:text-gray-300 transition cursor-pointer"
                title="تازه‌سازی موجودی"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* 4 StatCards with 5-Persona Theme */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6 pt-6 border-t border-gray-100 dark:border-gray-800">
          <StatCard
            title="کل پیامک‌های ثبت‌شده"
            value={statsLoading ? '...' : statsData?.total || 0}
            icon={FileText}
            theme="ecosystem"
            subtitle="مجموع کلیه لاگ‌های سامانه"
          />

          <StatCard
            title="ارسال‌های موفق"
            value={statsLoading ? '...' : statsData?.sent || 0}
            icon={CheckCircle2}
            theme="male"
            subtitle="مخابره‌شده به اپراتور همراه"
          />

          <StatCard
            title="پیامک‌های خودکار غیبت"
            value={statsLoading ? '...' : statsData?.breakdown?.autoAbsence || 0}
            icon={Clock}
            theme="college"
            subtitle="اطلاع‌رسانی فوری به اولیا"
          />

          <StatCard
            title="سررسید چک‌های شهریه"
            value={statsLoading ? '...' : statsData?.breakdown?.chequeReminder || 0}
            icon={CreditCard}
            theme="female"
            subtitle="یادآوری صیادی اقساط"
          />
        </div>
      </div>

      {/* 2. Neo-brutalism Segmented Navigation Tabs */}
      <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-gray-100/80 dark:bg-[#151C28] border border-gray-200 dark:border-gray-800 overflow-x-auto">
        {[
          { key: 'manual', label: 'ارسال پیامک جدید', icon: Send },
          { key: 'automation', label: 'اتوماسیون‌های هوشمند', icon: Sparkles },
          { key: 'logs', label: 'تاریخچه و لاگ‌ها', icon: Clock },
          { key: 'gateways', label: 'تنظیمات درگاه و الگوها', icon: Sliders },
        ].map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex-1 min-w-[150px] py-2.5 px-4 rounded-xl text-xs sm:text-sm font-black flex items-center justify-center gap-2 transition-all cursor-pointer ${
                isActive
                  ? 'bg-primary text-white shadow-[2.5px_2.5px_0_#1F413D] border border-[#438C83]'
                  : 'text-gray-600 dark:text-gray-400 hover:text-sec dark:hover:text-white hover:bg-white/60 dark:hover:bg-[#1C2536]'
              }`}
            >
              <tab.icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-gray-400'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 3. Tab Content Bodies */}
      {activeTab === 'manual' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Main Column: Target & Message Composer (8 cols) */}
          <div className="lg:col-span-8">
            <ManualSmsTab
              classrooms={classrooms}
              usersList={usersList}
              quickTemplates={quickTemplates}
              isSending={sendManualMutation.isPending}
              messageText={messageText}
              setMessageText={setMessageText}
              targetType={targetType}
              setTargetType={setTargetType}
              targetRole={targetRole}
              setTargetRole={setTargetRole}
              selectedClassroomId={selectedClassroomId}
              setSelectedClassroomId={setSelectedClassroomId}
              classAudience={classAudience}
              setClassAudience={setClassAudience}
              selectedUserIds={selectedUserIds}
              setSelectedUserIds={setSelectedUserIds}
              directPhone={directPhone}
              setDirectPhone={setDirectPhone}
              charCount={charCount}
              smsParts={smsParts}
              charsRemainingInPart={charsRemainingInPart}
              unitTariffTomans={unitTariffTomans}
              singleRecipientCostTomans={singleRecipientCostTomans}
              totalCostTomans={totalCostTomans}
              estimatedRecipients={effectiveRecipients}
              liveCreditTomans={liveCreditTomans}
              creditAfterSendTomans={creditAfterSendTomans}
              isConfigLoading={gatewayConfigLoading}
              onSendSms={handleSendManual}
            />
          </div>

          {/* Side Column: Live Smartphone Preview (4 cols) */}
          <div className="lg:col-span-4">
            <SmsLivePhonePreview
              messageText={messageText}
              senderName={gatewayConfigData?.liveAccount?.accountName || 'سامانه هوشمند رُکاد'}
              targetDescription={getTargetDescription()}
              smsParts={smsParts}
              charCount={charCount}
              singleCostTomans={singleRecipientCostTomans}
              totalCostTomans={totalCostTomans}
              estimatedRecipients={effectiveRecipients}
              creditAfterSendTomans={creditAfterSendTomans}
              isConfigLoading={gatewayConfigLoading}
            />
          </div>
        </div>
      )}

      {activeTab === 'automation' && (
        <AutomationsTab
          templates={templates}
          onTriggerCheques={() => triggerChequesMutation.mutate()}
          onTriggerBirthdays={() => triggerBirthdaysMutation.mutate()}
          isTriggeringCheques={triggerChequesMutation.isPending}
          isTriggeringBirthdays={triggerBirthdaysMutation.isPending}
          onSaveTemplate={(dto) => upsertTemplateMutation.mutate(dto)}
        />
      )}

      {activeTab === 'logs' && (
        <SmsLogsTab
          logs={logsList}
          isLoading={logsLoading}
          totalLogs={totalLogs}
          currentPage={logPage}
          onPageChange={setLogPage}
          searchQuery={logSearch}
          onSearchChange={setLogSearch}
          typeFilter={logTypeFilter}
          onTypeFilterChange={setLogTypeFilter}
          onRefresh={refetchLogs}
        />
      )}

      {activeTab === 'gateways' && (
        <GatewaySettingsTab
          selectedProvider={selectedProvider}
          setSelectedProvider={setSelectedProvider}
          amootToken={amootToken}
          setAmootToken={setAmootToken}
          amootLine={amootLine}
          setAmootLine={setAmootLine}
          onSaveGatewayConfig={handleSaveGatewayConfig}
          isSavingGateway={updateGatewayConfigMutation.isPending}
          quickTemplates={quickTemplates}
          onAddQuickTemplate={(dto) => addQuickTemplateMutation.mutate(dto)}
          onUpdateQuickTemplate={(id, dto) => updateQuickTemplateMutation.mutate({ id, payload: dto })}
          onDeleteQuickTemplate={(id) => deleteQuickTemplateMutation.mutate(id)}
        />
      )}
    </div>
  );
};
