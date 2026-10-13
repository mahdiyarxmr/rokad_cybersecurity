import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../../lib/api/client';
import { useAuthStore } from '../../../lib/auth/auth-store';
import { useTenantStore } from '../../../lib/auth/tenant-store';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
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
  Building2,
  Plus,
  Search,
  LogIn,
  Power,
  Palette,
  CheckCircle,
  AlertTriangle,
  GraduationCap,
  Sparkles,
} from 'lucide-react';
import { TenantType, BrandThemeKey } from '../../../types/tenant';

export const TenantsPage: React.FC = () => {
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);
  const setCurrentTenant = useTenantStore((state) => state.setCurrentTenant);

  const [tenants, setTenants] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  // Modals
  const [isProvisionOpen, setIsProvisionOpen] = useState(false);
  const [isImpersonateOpen, setIsImpersonateOpen] = useState(false);
  const [isBrandingOpen, setIsBrandingOpen] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<any>(null);

  // Form states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Provision Form
  const [provisionForm, setProvisionForm] = useState({
    name: '',
    slug: '',
    type: 'SCHOOL' as TenantType,
    subdomain: '',
    phone: '',
    adminFirstName: '',
    adminLastName: '',
    adminPhone: '',
    adminPassword: '',
    planCode: 'STANDARD_SCHOOL',
  });

  // Impersonate Form
  const [impersonateReason, setImpersonateReason] = useState('پشتیبانی فنی و بررسی وضعیت مرکز');

  // Branding Form
  const [brandingForm, setBrandingForm] = useState({
    primaryColor: '#59BBAF',
    secondaryColor: '#202A5A',
    mottoText: '',
  });

  const fetchTenants = async () => {
    try {
      setIsLoading(true);
      const params: any = {};
      if (search) params.search = search;
      if (typeFilter) params.type = typeFilter;
      if (statusFilter) params.status = statusFilter;

      const res = await apiClient.get('/saas/tenants', { params });
      setTenants(res.data);
    } catch (err) {
      console.error('Failed to load tenants', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTenants();
  }, [typeFilter, statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchTenants();
  };

  // 1. Provision Tenant
  const handleProvisionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      await apiClient.post('/saas/tenants/provision', provisionForm);
      setIsProvisionOpen(false);
      setProvisionForm({
        name: '',
        slug: '',
        type: 'SCHOOL',
        subdomain: '',
        phone: '',
        adminFirstName: '',
        adminLastName: '',
        adminPhone: '',
        adminPassword: '',
        planCode: 'STANDARD_SCHOOL',
      });
      fetchTenants();
    } catch (err: any) {
      setError(err.message || 'خطا در ثبت مرکز آموزشی جدید.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 2. Impersonate Tenant
  const handleImpersonate = async () => {
    if (!selectedTenant) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await apiClient.post('/saas/tenants/impersonate', {
        tenantId: selectedTenant.id,
        reason: impersonateReason,
      });

      const { accessToken, tenant, impersonatedUser } = res.data;

      // Set user and tenant in Zustand stores
      login(
        {
          id: impersonatedUser.id,
          tenantId: tenant.id,
          firstName: impersonatedUser.name.split(' ')[0] || 'راهبر',
          lastName: impersonatedUser.name.split(' ')[1] || 'مدرسه',
          role: impersonatedUser.role,
          isPlatformAdmin: true, // Retain admin capabilities
        },
        accessToken,
      );

      setCurrentTenant({
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        type: selectedTenant.type || 'SCHOOL',
        theme: (selectedTenant.theme || 'ecosystem').toLowerCase() as BrandThemeKey,
      });

      setIsImpersonateOpen(false);
      navigate('/app/admin/dashboard');
    } catch (err: any) {
      setError(err.message || 'خطا در ورود نیابتی به پنل مدرسه.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 3. Toggle Status
  const handleToggleStatus = async (tenant: any) => {
    const nextStatus = tenant.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    try {
      await apiClient.patch(`/saas/tenants/${tenant.id}/status`, { status: nextStatus });
      fetchTenants();
    } catch (err) {
      console.error('Failed to change status', err);
    }
  };

  // 4. Update Branding
  const handleBrandingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTenant) return;
    setIsSubmitting(true);
    try {
      await apiClient.patch(`/saas/platform/branding/${selectedTenant.id}`, brandingForm);
      setIsBrandingOpen(false);
      fetchTenants();
    } catch (err: any) {
      setError(err.message || 'خطا در ذخیره تنظیمات برندینگ.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'SCHOOL':
        return <Badge variant="default">مدرسه</Badge>;
      case 'COLLEGE':
        return <Badge variant="college">کالج / دانشگاه</Badge>;
      case 'CLUB':
        return <Badge variant="club">باشگاه / آکادمی</Badge>;
      case 'MULTI_CAMPUS_NETWORK':
        return <Badge variant="male">مجتمع چندشعبه‌ای</Badge>;
      default:
        return <Badge variant="neutral">{type}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & CTA */}
      <ResponsivePageHeader
        icon={Building2}
        title="مدیریت مدارس و مراکز آموزشی"
        description="مشاهده، تعریف مرکز جدید، ورود نیابتی پشتیبانی و تنظیم برندینگ اختصاصی"
        actions={
          <Button
            variant="primary"
            onClick={() => setIsProvisionOpen(true)}
            className="flex items-center space-x-1.5 space-x-reverse text-xs"
          >
            <Plus className="h-4 w-4" />
            <span>راه‌اندازی مدرسه جدید</span>
          </Button>
        }
      />

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-center">
        <form onSubmit={handleSearchSubmit} className="flex-1 w-full md:max-w-md flex gap-2">
          <Input
            placeholder="جستجو بر اساس نام یا شناسه مدرسه..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10"
          />
          <Button type="submit" variant="secondary" size="md">
            <Search className="h-4 w-4" />
          </Button>
        </form>

        <div className="flex gap-2 w-full md:w-auto">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="h-10 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1C2536] text-ink-normal dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          >
            <option value="">همه انواع مراکز</option>
            <option value="SCHOOL">مدرسه</option>
            <option value="COLLEGE">کالج</option>
            <option value="CLUB">باشگاه</option>
            <option value="MULTI_CAMPUS_NETWORK">مجتمع چندشعبه‌ای</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1C2536] text-ink-normal dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          >
            <option value="">همه وضعیت‌ها</option>
            <option value="ACTIVE">فعال</option>
            <option value="SUSPENDED">معلق‌شده</option>
          </select>
        </div>
      </div>

      {/* Tenants Table */}
      <MobileDataTable
        items={tenants}
        isLoading={isLoading}
        emptyMessage="هیچ مرکز آموزشی با فیلترهای مشخص‌شده یافت نشد."
        primaryField={(t) => (
          <div>
            <div className="font-bold text-ink-darker text-sm">{t.name}</div>
            <div className="text-[11px] text-gray-500 font-mono mt-0.5">
              slug: {t.slug} {t.subdomain && `• ${t.subdomain}.rokadschool.ir`}
            </div>
          </div>
        )}
        secondaryField={(t) => (
          <div className="flex items-center gap-1.5 flex-wrap justify-end">
            {getTypeBadge(t.type)}
            {t.status === 'ACTIVE' ? (
              <Badge variant="success" className="text-[10px]">فعال</Badge>
            ) : (
              <Badge variant="destructive" className="text-[10px]">معلق</Badge>
            )}
          </div>
        )}
        columns={[
          {
            header: 'نام مرکز و شناسه',
            cell: (t) => (
              <div>
                <div className="font-bold text-ink-darker">{t.name}</div>
                <div className="text-[11px] text-gray-500 font-mono mt-0.5">
                  slug: {t.slug} {t.subdomain && `• ${t.subdomain}.rokadschool.ir`}
                </div>
              </div>
            ),
          },
          {
            header: 'نوع سازمان',
            cell: (t) => getTypeBadge(t.type),
          },
          {
            header: 'پلن اشتراک',
            cell: (t) => (
              t.subscriptions?.[0]?.plan ? (
                <Badge variant="default">
                  {t.subscriptions[0].plan.name}
                </Badge>
              ) : (
                <span className="text-xs text-gray-400">بدون پلن</span>
              )
            ),
            mobileDetail: true,
          },
          {
            header: 'تعداد اعضا',
            cell: (t) => (
              <div className="text-xs">
                <span className="font-bold">{t._count?.studentProfiles || 0}</span> دانش‌آموز •{' '}
                <span className="font-bold">{t._count?.teacherProfiles || 0}</span> مربی
              </div>
            ),
            mobileDetail: true,
          },
          {
            header: 'وضعیت',
            cell: (t) => (
              t.status === 'ACTIVE' ? (
                <Badge variant="success">فعال</Badge>
              ) : (
                <Badge variant="destructive">معلق</Badge>
              )
            ),
          },
          {
            header: 'عملیات',
            cell: (t) => (
              <div className="flex items-center justify-center gap-1.5 flex-wrap">
                {/* Impersonate Button */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedTenant(t);
                    setIsImpersonateOpen(true);
                  }}
                  title="ورود نیابتی به پنل مدرسه"
                  className="text-primary hover:bg-primary-light min-h-[44px] px-3 text-xs"
                >
                  <LogIn className="h-4 w-4 ml-1" />
                  <span>ورود نیابتی</span>
                </Button>

                {/* Branding Button */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedTenant(t);
                    setBrandingForm({
                      primaryColor: t.settings?.branding?.primaryColor || '#59BBAF',
                      secondaryColor: t.settings?.branding?.secondaryColor || '#202A5A',
                      mottoText: t.settings?.branding?.mottoText || '',
                    });
                    setIsBrandingOpen(true);
                  }}
                  title="تنظیم رنگ سازمانی و برندینگ"
                  className="text-gray-500 hover:text-amber-600 min-h-[44px] min-w-[44px] flex items-center justify-center"
                >
                  <Palette className="h-4 w-4" />
                </Button>

                {/* Suspend / Activate Toggle */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleToggleStatus(t)}
                  title={t.status === 'ACTIVE' ? 'تعلیق مرکز' : 'فعال‌سازی مرکز'}
                  className={`min-h-[44px] min-w-[44px] flex items-center justify-center ${
                    t.status === 'ACTIVE' ? 'text-gray-400 hover:text-red-600' : 'text-emerald-600'
                  }`}
                >
                  <Power className="h-4 w-4" />
                </Button>
              </div>
            ),
          },
        ]}
      />

      {/* 1. Modal: Provision New Tenant */}
      <Modal
        isOpen={isProvisionOpen}
        onClose={() => setIsProvisionOpen(false)}
        title="راه‌اندازی آنی مرکز آموزشی جدید"
        description="با تکمیل این فرم، مرکز جدید، کاربر مدیر ارشد، سال تحصیلی جاری و پلن اشتراک به صورت خودکار ایجاد می‌شوند."
        maxWidth="xl"
      >
        {error && (
          <div className="mb-4 rounded-lg bg-red-50 p-3 text-xs text-red-700 border border-red-200">
            {error}
          </div>
        )}

        <form onSubmit={handleProvisionSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="نام مرکز آموزشی / مدرسه"
              placeholder="مثال: مجتمع بین‌الملل فرزانگان"
              value={provisionForm.name}
              onChange={(e) => setProvisionForm({ ...provisionForm, name: e.target.value })}
              required
            />
            <Input
              label="شناسه انگلیسی یکتا"
              placeholder="مثال: farzanegan-school"
              value={provisionForm.slug}
              onChange={(e) => setProvisionForm({ ...provisionForm, slug: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="نوع سازمان"
              value={provisionForm.type}
              onChange={(e) => setProvisionForm({ ...provisionForm, type: e.target.value as any })}
            >
              <option value="SCHOOL">مدرسه</option>
              <option value="COLLEGE">کالج / مرکز آموزش عالی</option>
              <option value="CLUB">باشگاه ورزشی / کلوپ مهارتی</option>
              <option value="MULTI_CAMPUS_NETWORK">مجتمع چندشعبه‌ای</option>
            </Select>

            <Input
              label="زیردامنه اختصاصی (اختیاری)"
              placeholder="مثال: farzanegan"
              value={provisionForm.subdomain}
              onChange={(e) => setProvisionForm({ ...provisionForm, subdomain: e.target.value })}
            />
          </div>

          <div className="pt-2 border-t border-gray-100">
            <h4 className="font-bold text-xs text-ink-darker mb-3 text-right">مشخصات کاربر راهبر مدرسه:</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="نام راهبر"
                placeholder="مثال: رضا"
                value={provisionForm.adminFirstName}
                onChange={(e) => setProvisionForm({ ...provisionForm, adminFirstName: e.target.value })}
                required
              />
              <Input
                label="نام خانوادگی راهبر"
                placeholder="مثال: سهرابی"
                value={provisionForm.adminLastName}
                onChange={(e) => setProvisionForm({ ...provisionForm, adminLastName: e.target.value })}
                required
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
              <Input
                label="شماره همراه راهبر (نام کاربری ورود)"
                placeholder="مثال: 09129998877"
                value={provisionForm.adminPhone}
                onChange={(e) => setProvisionForm({ ...provisionForm, adminPhone: e.target.value })}
                required
              />
              <Input
                label="رمز عبور راهبر"
                type="password"
                placeholder="••••••••"
                value={provisionForm.adminPassword}
                onChange={(e) => setProvisionForm({ ...provisionForm, adminPassword: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
            <Select
              label="پلن اشتراک اولیه"
              value={provisionForm.planCode}
              onChange={(e) => setProvisionForm({ ...provisionForm, planCode: e.target.value })}
            >
              <option value="FREE_TRIAL">پلن آزمایشی ۱۴ روزه (۵۰ دانش‌آموز)</option>
              <option value="STANDARD_SCHOOL">پلن جامع مدارس استاندارد (۴۰۰ دانش‌آموز + مالی و آزمون)</option>
              <option value="PRO_CAMPUS">پلن سازمانی مجتمع‌ها و کالج‌ها (۱۵۰۰ دانش‌آموز + هوش مصنوعی)</option>
            </Select>
          </div>

          <div className="flex justify-end space-x-2 space-x-reverse pt-4">
            <Button type="button" variant="ghost" onClick={() => setIsProvisionOpen(false)}>
              انصراف
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              ایجاد و راه‌اندازی مدرسه
            </Button>
          </div>
        </form>
      </Modal>

      {/* 2. Modal: Impersonate Support Access */}
      <Modal
        isOpen={isImpersonateOpen}
        onClose={() => setIsImpersonateOpen(false)}
        title={`ورود نیابتی به پنل ${selectedTenant?.name}`}
        description="شما در حال ورود با دسترسی سوپرادمین به پنل این مدرسه هستید. تمامی اقدامات شما در لاگ‌های امنیتی ثبت می‌شود."
        maxWidth="md"
      >
        <div className="space-y-4">
          <Input
            label="علت ورود نیابتی (جهت ثبت در لاگ امنیتی)"
            value={impersonateReason}
            onChange={(e) => setImpersonateReason(e.target.value)}
            required
          />

          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 leading-relaxed flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <span>توکن نیابتی صادرشده دارای اعتبار ۲ ساعته بوده و اجازه بررسی کلاس‌ها، نمرات و گزارش‌های مالی این مدرسه را فراهم می‌آورد.</span>
          </div>

          <div className="flex justify-end space-x-2 space-x-reverse pt-2">
            <Button variant="ghost" onClick={() => setIsImpersonateOpen(false)}>
              انصراف
            </Button>
            <Button variant="primary" onClick={handleImpersonate} isLoading={isSubmitting}>
              تایید و ورود به پنل مدرسه
            </Button>
          </div>
        </div>
      </Modal>

      {/* 3. Modal: Branding Settings */}
      <Modal
        isOpen={isBrandingOpen}
        onClose={() => setIsBrandingOpen(false)}
        title={`تنظیم برندینگ اختصاصی: ${selectedTenant?.name}`}
        description="تغییر رنگ‌های سازمانی و شعار اختصاصی مدرسه جهت نمایش در پنل اختصاصی دانش‌آموزان و اولیاء."
        maxWidth="md"
      >
        <form onSubmit={handleBrandingSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-ink-normal mb-1.5 text-right">رنگ اصلی برند</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={brandingForm.primaryColor}
                  onChange={(e) => setBrandingForm({ ...brandingForm, primaryColor: e.target.value })}
                  className="h-10 w-12 rounded border p-1 cursor-pointer"
                />
                <span className="text-xs font-mono">{brandingForm.primaryColor}</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-ink-normal mb-1.5 text-right">رنگ ثانویه برند</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={brandingForm.secondaryColor}
                  onChange={(e) => setBrandingForm({ ...brandingForm, secondaryColor: e.target.value })}
                  className="h-10 w-12 rounded border p-1 cursor-pointer"
                />
                <span className="text-xs font-mono">{brandingForm.secondaryColor}</span>
              </div>
            </div>
          </div>

          <Input
            label="شعار یا متادیتای اختصاصی مدرسه"
            placeholder="مثال: پیشرو در آموزش مهارت‌های نوین"
            value={brandingForm.mottoText}
            onChange={(e) => setBrandingForm({ ...brandingForm, mottoText: e.target.value })}
          />

          <div className="flex justify-end space-x-2 space-x-reverse pt-2">
            <Button type="button" variant="ghost" onClick={() => setIsBrandingOpen(false)}>
              انصراف
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              ذخیره تنظیمات برند
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
