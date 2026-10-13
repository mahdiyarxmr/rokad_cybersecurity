import React, { useEffect, useState } from 'react';
import { apiClient } from '../../../lib/api/client';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Badge } from '../../../components/ui/Badge';
import { Modal } from '../../../components/ui/Modal';
import { Skeleton } from '../../../components/ui/Skeleton';
import { ResponsivePageHeader } from '../../../components/ui/ResponsivePageHeader';
import {
  CreditCard,
  Plus,
  Check,
  Users,
  HardDrive,
  Sparkles,
  ArrowRightLeft,
  GraduationCap,
} from 'lucide-react';

export const SubscriptionsPage: React.FC = () => {
  const [plans, setPlans] = useState<any[]>([]);
  const [tenants, setTenants] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [isCreatePlanOpen, setIsCreatePlanOpen] = useState(false);
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [isQuotaOpen, setIsQuotaOpen] = useState(false);
  const [selectedTenantQuota, setSelectedTenantQuota] = useState<any>(null);

  // Forms
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [createPlanForm, setCreatePlanForm] = useState({
    code: '',
    name: '',
    description: '',
    monthlyPrice: 1000000,
    annualPrice: 10000000,
    maxStudents: 200,
    maxTeachers: 20,
    maxStorageMb: 5120,
    bundledFeatureFlags: ['LMS_EXAMS', 'LIVE_CHAT'],
  });

  const [assignForm, setAssignForm] = useState({
    tenantId: '',
    planIdOrCode: '',
    billingCycle: 'ANNUAL',
    durationMonths: 12,
  });

  const availableFlags = [
    { key: 'LMS_EXAMS', label: 'موتور آزمون آنلاین و بانک سوال' },
    { key: 'LIVE_CHAT', label: 'چت و پیام‌رسانی بلادرنگ' },
    { key: 'FINANCE_PAYROLL', label: 'مدیریت شهریه، اقساط و حقوق و دستمزد' },
    { key: 'ONLINE_CLASSES', label: 'کلاس‌های مجازی آنلاین' },
    { key: 'MULTI_CAMPUS', label: 'مدیریت چندشعبه‌ای و کالج' },
  ];

  const fetchPlansAndTenants = async () => {
    try {
      setIsLoading(true);
      const [plansRes, tenantsRes] = await Promise.all([
        apiClient.get('/saas/subscriptions/plans'),
        apiClient.get('/saas/tenants'),
      ]);
      setPlans(plansRes.data);
      setTenants(tenantsRes.data);
      if (tenantsRes.data.length > 0) {
        setAssignForm((prev) => ({ ...prev, tenantId: tenantsRes.data[0].id }));
      }
      if (plansRes.data.length > 0) {
        setAssignForm((prev) => ({ ...prev, planIdOrCode: plansRes.data[0].code }));
      }
    } catch (err) {
      console.error('Failed to load plans', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPlansAndTenants();
  }, []);

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      await apiClient.post('/saas/subscriptions/plans', createPlanForm);
      setIsCreatePlanOpen(false);
      fetchPlansAndTenants();
    } catch (err: any) {
      setError(err.message || 'خطا در ایجاد پلن اشتراک جدید.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAssignPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      await apiClient.post('/saas/subscriptions/assign', assignForm);
      setIsAssignOpen(false);
      fetchPlansAndTenants();
    } catch (err: any) {
      setError(err.message || 'خطا در اختصاص پلن به مدرسه.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInspectQuota = async (tenantId: string) => {
    try {
      const res = await apiClient.get(`/saas/subscriptions/tenant/${tenantId}`);
      setSelectedTenantQuota(res.data);
      setIsQuotaOpen(true);
    } catch (err) {
      console.error('Failed to load quota', err);
    }
  };

  const toggleFlag = (flagKey: string) => {
    setCreatePlanForm((prev) => {
      const exists = prev.bundledFeatureFlags.includes(flagKey);
      return {
        ...prev,
        bundledFeatureFlags: exists
          ? prev.bundledFeatureFlags.filter((f) => f !== flagKey)
          : [...prev.bundledFeatureFlags, flagKey],
      };
    });
  };

  return (
    <div className="space-y-6">
      {/* Header & Actions */}
      <ResponsivePageHeader
        icon={CreditCard}
        title="پلن‌های تجاری، سهمیه‌ها و فیچرفلگ‌ها"
        description="تعریف سطوح اشتراک، سقف مجاز کاربران، فضای ذخیره‌سازی ابری و انتساب به مدارس"
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAssignOpen(true)}
              className="flex items-center space-x-1.5 space-x-reverse text-xs"
            >
              <ArrowRightLeft className="h-3.5 w-3.5" />
              <span>ارتقاء / تخصیص</span>
            </Button>

            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsCreatePlanOpen(true)}
              className="flex items-center space-x-1.5 space-x-reverse text-xs"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>پلن جدید</span>
            </Button>
          </div>
        }
      />

      {/* Pricing Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="p-6">
              <Skeleton className="h-6 w-32 mb-2" />
              <Skeleton className="h-10 w-24 mb-4" />
              <Skeleton className="h-20 w-full mb-4" />
              <Skeleton className="h-10 w-full" />
            </Card>
          ))
        ) : (
          plans.map((plan) => (
            <Card
              key={plan.id}
              className="flex flex-col justify-between border-2 hover:border-primary transition-all relative overflow-hidden"
            >
              {plan.code === 'STANDARD_SCHOOL' && (
                <div className="bg-primary text-white text-[10px] font-bold py-1 px-4 text-center absolute top-3 left-3 rounded-full shadow-sm">
                  محبوب‌ترین
                </div>
              )}

              <CardHeader className="p-6 pb-4">
                <div className="flex items-center justify-between">
                  <Badge variant="default" className="text-xs font-mono">
                    {plan.code}
                  </Badge>
                </div>
                <CardTitle className="text-lg mt-2">{plan.name}</CardTitle>
                <p className="text-xs text-gray-500 mt-1 min-h-[32px]">{plan.description}</p>
              </CardHeader>

              <CardContent className="p-6 pt-0 space-y-4">
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                  <div className="text-2xl font-extrabold text-ink-darker">
                    {plan.monthlyPrice === 0 ? (
                      'رایگان'
                    ) : (
                      <>
                        {(plan.monthlyPrice / 1000000).toLocaleString('fa-IR')}
                        <span className="text-xs font-normal text-gray-500 mr-1">میلیون تومان / ماه</span>
                      </>
                    )}
                  </div>
                  {plan.annualPrice > 0 && (
                    <div className="text-[11px] text-gray-500 mt-1">
                      یا {(plan.annualPrice / 1000000).toLocaleString('fa-IR')} میلیون تومان به صورت سالانه
                    </div>
                  )}
                </div>

                {/* Quotas */}
                <div className="space-y-2 text-xs text-ink-normal">
                  <div className="flex items-center space-x-2 space-x-reverse">
                    <Users className="h-4 w-4 text-primary" />
                    <span>حداکثر <strong>{plan.maxStudents.toLocaleString('fa-IR')}</strong> دانش‌آموز</span>
                  </div>
                  <div className="flex items-center space-x-2 space-x-reverse">
                    <GraduationCap className="h-4 w-4 text-primary" />
                    <span>حداکثر <strong>{plan.maxTeachers.toLocaleString('fa-IR')}</strong> مربی و کادر</span>
                  </div>
                  <div className="flex items-center space-x-2 space-x-reverse">
                    <HardDrive className="h-4 w-4 text-primary" />
                    <span><strong>{Math.round(plan.maxStorageMb / 1024)} GB</strong> فضای ذخیره‌سازی ابری</span>
                  </div>
                </div>

                {/* Bundled Flags */}
                <div className="pt-3 border-t border-gray-100">
                  <div className="text-[11px] font-bold text-gray-500 mb-2">ماژول‌های فعال پلن:</div>
                  <div className="space-y-1.5">
                    {plan.bundledFeatureFlags?.map((flag: string) => (
                      <div key={flag} className="flex items-center space-x-1.5 space-x-reverse text-xs text-emerald-700">
                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                        <span>{availableFlags.find((f) => f.key === flag)?.label || flag}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>

              <CardFooter className="p-6 pt-0">
                <Button
                  variant="outline"
                  className="w-full text-xs"
                  onClick={() => {
                    setAssignForm((prev) => ({ ...prev, planIdOrCode: plan.code }));
                    setIsAssignOpen(true);
                  }}
                >
                  تخصیص این پلن به مدرسه
                </Button>
              </CardFooter>
            </Card>
          ))
        )}
      </div>

      {/* Tenant Quota Inspection Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center space-x-2 space-x-reverse">
            <Sparkles className="h-4 w-4 text-primary" />
            <span>نظارت بر مصرف سهمیه‌ها در مدارس فعال</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {tenants.map((t) => (
              <div
                key={t.id}
                className="flex flex-col md:flex-row md:items-center justify-between p-4 rounded-xl bg-gray-50 border border-gray-200 gap-4"
              >
                <div>
                  <div className="font-bold text-sm text-ink-darker">{t.name}</div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    پلن فعال: <Badge variant="default">{t.subscriptions?.[0]?.plan?.name || 'فاقد اشتراک'}</Badge>
                  </div>
                </div>

                <div className="flex items-center space-x-3 space-x-reverse">
                  <div className="text-xs text-left">
                    <div className="font-bold">{t._count?.studentProfiles || 0} دانش‌آموز</div>
                    <div className="text-[11px] text-gray-500">{t._count?.teacherProfiles || 0} مربی</div>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleInspectQuota(t.id)}
                  >
                    مشاهده جزئیات سهمیه
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 1. Modal: Create Subscription Plan */}
      <Modal
        isOpen={isCreatePlanOpen}
        onClose={() => setIsCreatePlanOpen(false)}
        title="ایجاد پلن اشتراک تجاری جدید"
        description="تعریف ظرفیت‌ها، قیمت‌گذاری ماهیانه و سالانه و انتخاب ماژول‌های فعال"
        maxWidth="lg"
      >
        {error && (
          <div className="mb-4 rounded-lg bg-red-50 p-3 text-xs text-red-700 border border-red-200">
            {error}
          </div>
        )}

        <form onSubmit={handleCreatePlan} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="کد سیستمی پلن (یکتا)"
              placeholder="مثال: VIP_ACADEMY"
              value={createPlanForm.code}
              onChange={(e) => setCreatePlanForm({ ...createPlanForm, code: e.target.value })}
              required
            />
            <Input
              label="عنوان نمایشی پلن"
              placeholder="مثال: پلن تخصصی آکادمی‌های برتر"
              value={createPlanForm.name}
              onChange={(e) => setCreatePlanForm({ ...createPlanForm, name: e.target.value })}
              required
            />
          </div>

          <Input
            label="توضیحات کوتاه"
            placeholder="مثال: ظرفیت بالا همراه با تمام ماژول‌های آموزشی"
            value={createPlanForm.description}
            onChange={(e) => setCreatePlanForm({ ...createPlanForm, description: e.target.value })}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="قیمت ماهیانه (تومان)"
              type="number"
              value={createPlanForm.monthlyPrice}
              onChange={(e) => setCreatePlanForm({ ...createPlanForm, monthlyPrice: Number(e.target.value) })}
              required
            />
            <Input
              label="قیمت سالانه (تومان)"
              type="number"
              value={createPlanForm.annualPrice}
              onChange={(e) => setCreatePlanForm({ ...createPlanForm, annualPrice: Number(e.target.value) })}
              required
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Input
              label="سقف دانش‌آموز"
              type="number"
              value={createPlanForm.maxStudents}
              onChange={(e) => setCreatePlanForm({ ...createPlanForm, maxStudents: Number(e.target.value) })}
              required
            />
            <Input
              label="سقف مربی"
              type="number"
              value={createPlanForm.maxTeachers}
              onChange={(e) => setCreatePlanForm({ ...createPlanForm, maxTeachers: Number(e.target.value) })}
              required
            />
            <Input
              label="فضای ابری (مگابایت)"
              type="number"
              value={createPlanForm.maxStorageMb}
              onChange={(e) => setCreatePlanForm({ ...createPlanForm, maxStorageMb: Number(e.target.value) })}
              required
            />
          </div>

          {/* Feature Flags Checkbox Group */}
          <div>
            <label className="block text-sm font-medium text-ink-normal mb-2 text-right">
              ماژول‌های فیچرفلگ متصل به این پلن:
            </label>
            <div className="space-y-2 bg-gray-50 p-3 rounded-xl border border-gray-200">
              {availableFlags.map((flag) => (
                <label key={flag.key} className="flex items-center space-x-2 space-x-reverse cursor-pointer text-xs">
                  <input
                    type="checkbox"
                    checked={createPlanForm.bundledFeatureFlags.includes(flag.key)}
                    onChange={() => toggleFlag(flag.key)}
                    className="h-4 w-4 rounded text-primary focus:ring-primary"
                  />
                  <span>{flag.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex justify-end space-x-2 space-x-reverse pt-2">
            <Button type="button" variant="ghost" onClick={() => setIsCreatePlanOpen(false)}>
              انصراف
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              ایجاد پلن
            </Button>
          </div>
        </form>
      </Modal>

      {/* 2. Modal: Assign / Upgrade Subscription */}
      <Modal
        isOpen={isAssignOpen}
        onClose={() => setIsAssignOpen(false)}
        title="تخصیص یا ارتقاء اشتراک برای مدرسه"
        description="پلن انتخاب‌شده بلافاصله روی مرکز فعال شده و سهمیه‌های دانش‌آموز و ماژول‌ها اعمال می‌شوند."
        maxWidth="md"
      >
        <form onSubmit={handleAssignPlan} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-ink-normal mb-1.5 text-right">انتخاب مدرسه هدف</label>
            <select
              value={assignForm.tenantId}
              onChange={(e) => setAssignForm({ ...assignForm, tenantId: e.target.value })}
              className="flex h-11 w-full rounded-md border border-gray-300 bg-white px-3.5 py-2 text-sm text-ink-normal focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {tenants.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.slug})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-ink-normal mb-1.5 text-right">انتخاب پلن اشتراک</label>
            <select
              value={assignForm.planIdOrCode}
              onChange={(e) => setAssignForm({ ...assignForm, planIdOrCode: e.target.value })}
              className="flex h-11 w-full rounded-md border border-gray-300 bg-white px-3.5 py-2 text-sm text-ink-normal focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {plans.map((p) => (
                <option key={p.id} value={p.code}>
                  {p.name} ({p.code})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-ink-normal mb-1.5 text-right">چرخه پرداخت</label>
              <select
                value={assignForm.billingCycle}
                onChange={(e) => setAssignForm({ ...assignForm, billingCycle: e.target.value })}
                className="flex h-11 w-full rounded-md border border-gray-300 bg-white px-3.5 py-2 text-sm text-ink-normal focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="ANNUAL">سالانه (یک‌ساله)</option>
                <option value="MONTHLY">ماهانه</option>
              </select>
            </div>

            <Input
              label="مدت زمان (ماه)"
              type="number"
              value={assignForm.durationMonths}
              onChange={(e) => setAssignForm({ ...assignForm, durationMonths: Number(e.target.value) })}
              required
            />
          </div>

          <div className="flex justify-end space-x-2 space-x-reverse pt-2">
            <Button type="button" variant="ghost" onClick={() => setIsAssignOpen(false)}>
              انصراف
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              تایید و اعمال اشتراک
            </Button>
          </div>
        </form>
      </Modal>

      {/* 3. Modal: Detailed Quota Inspector */}
      <Modal
        isOpen={isQuotaOpen}
        onClose={() => setIsQuotaOpen(false)}
        title="وضعیت مصرف سهمیه‌ها"
        description="میزان استفاده از ظرفیت‌های مجاز پلن اشتراک این مدرسه"
        maxWidth="md"
      >
        {selectedTenantQuota && (
          <div className="space-y-4">
            {/* Students Quota Bar */}
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
              <div className="flex justify-between text-xs font-bold text-ink-darker mb-1.5">
                <span>سهمیه دانش‌آموز</span>
                <span>
                  {selectedTenantQuota.quotas?.students?.currentUsage} از {selectedTenantQuota.quotas?.students?.maxAllowed}
                </span>
              </div>
              <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-primary h-2 rounded-full transition-all"
                  style={{
                    width: `${Math.min(
                      100,
                      (selectedTenantQuota.quotas?.students?.currentUsage / selectedTenantQuota.quotas?.students?.maxAllowed) * 100,
                    )}%`,
                  }}
                />
              </div>
            </div>

            {/* Teachers Quota Bar */}
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
              <div className="flex justify-between text-xs font-bold text-ink-darker mb-1.5">
                <span>سهمیه مربی و کادر</span>
                <span>
                  {selectedTenantQuota.quotas?.teachers?.currentUsage} از {selectedTenantQuota.quotas?.teachers?.maxAllowed}
                </span>
              </div>
              <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all"
                  style={{
                    width: `${Math.min(
                      100,
                      (selectedTenantQuota.quotas?.teachers?.currentUsage / selectedTenantQuota.quotas?.teachers?.maxAllowed) * 100,
                    )}%`,
                  }}
                />
              </div>
            </div>

            {/* Storage Quota Bar */}
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
              <div className="flex justify-between text-xs font-bold text-ink-darker mb-1.5">
                <span>فضای ذخیره‌سازی ابری</span>
                <span>
                  {selectedTenantQuota.quotas?.storageMb?.currentUsage} MB از {selectedTenantQuota.quotas?.storageMb?.maxAllowed} MB
                </span>
              </div>
              <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-purple-500 h-2 rounded-full transition-all"
                  style={{
                    width: `${Math.min(
                      100,
                      (selectedTenantQuota.quotas?.storageMb?.currentUsage / selectedTenantQuota.quotas?.storageMb?.maxAllowed) * 100,
                    )}%`,
                  }}
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="primary" onClick={() => setIsQuotaOpen(false)}>
                بستن پنجره
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
