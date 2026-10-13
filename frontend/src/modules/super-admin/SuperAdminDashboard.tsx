import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../lib/api/client';
import { useAuthStore } from '../../lib/auth/auth-store';
import { useTenantStore } from '../../lib/auth/tenant-store';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import {
  Building2,
  Users,
  CreditCard,
  HardDrive,
  ArrowUpRight,
  LogIn,
  Crown,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

export const SuperAdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState<any>(null);
  const [tenants, setTenants] = useState<any[]>([]);
  const [, setIsLoading] = useState(true);

  const mrrData = [
    { month: 'فروردین', mrr: 120 },
    { month: 'اردیبهشت', mrr: 160 },
    { month: 'خرداد', mrr: 210 },
    { month: 'تیر', mrr: 280 },
    { month: 'مرداد', mrr: 360 },
    { month: 'شهریور', mrr: 480 },
  ];

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [metRes, tenRes] = await Promise.all([
          apiClient.get('/saas/platform/metrics').catch(() => null),
          apiClient.get('/saas/tenants').catch(() => null),
        ]);
        if (metRes?.data) setMetrics(metRes.data);
        if (tenRes?.data) setTenants(tenRes.data);
      } catch (e) {
        console.error('Failed to load SaaS metrics', e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleFastImpersonate = async (tenant: any) => {
    try {
      const res = await apiClient.post(`/saas/impersonate/${tenant.id}`);
      const { user: impersonatedUser, accessToken } = res.data;
      useAuthStore.getState().login(
        {
          id: impersonatedUser.id,
          phone: impersonatedUser.phone,
          email: impersonatedUser.email,
          firstName: impersonatedUser.firstName,
          lastName: impersonatedUser.lastName,
          role: impersonatedUser.role,
          tenantId: tenant.id,
          isPlatformAdmin: true,
        },
        accessToken,
      );
      useTenantStore.getState().setCurrentTenant({
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        type: tenant.type,
        theme: tenant.theme || 'ecosystem',
      });
      navigate('/app/admin/dashboard');
    } catch (err: any) {
      alert(err.message || 'خطا در ورود نیابتی به مدرسه.');
    }
  };

  return (
    <div className="space-y-5">
      {/* Header Title */}
      <div className="relative overflow-hidden rokad-card p-4 sm:p-5 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-200 dark:border-amber-800">
            <Crown className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-black text-ink-darker dark:text-white">
              داشبورد مدیریت کلان رکاد
            </h1>
            <Badge variant="default" className="text-[11px] mt-1">SuperAdmin Root</Badge>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/app/super-admin/ops')}
            className="flex-1 sm:flex-none"
          >
            لاگ‌های امنیتی
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate('/app/super-admin/tenants')}
            className="flex-1 sm:flex-none"
          >
            <span>مدیریت شعب</span>
            <ArrowUpRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* 4 KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        {/* Card 1: Total Tenants */}
        <Card className="p-4 sm:p-5">
          <div className="flex justify-between items-center text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5">
            <span>شعب فعال</span>
            <Building2 className="h-4 w-4 text-primary" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-ink-darker dark:text-white font-mono">
            {metrics?.tenants?.active ?? tenants.length ?? 0} شعبه
          </div>
          <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-1">
            {metrics?.tenants?.total ?? 0} مرکز آموزشی در سامانه
          </p>
        </Card>

        {/* Card 2: Total Users */}
        <Card className="p-4 sm:p-5">
          <div className="flex justify-between items-center text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5">
            <span>کاربران کلان</span>
            <Users className="h-4 w-4 text-blue-500" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-ink-darker dark:text-white font-mono">
            {(metrics?.users?.total ?? 0).toLocaleString('fa-IR')} نفر
          </div>
          <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium mt-1 font-mono">
            {metrics?.users?.students ?? 0} دانش‌آموز • {metrics?.users?.parents ?? 0} ولی • {metrics?.users?.teachers ?? 0} مربی
          </p>
        </Card>

        {/* Card 3: MRR */}
        <Card className="p-4 sm:p-5">
          <div className="flex justify-between items-center text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5">
            <span>درآمد ماهانه (MRR)</span>
            <CreditCard className="h-4 w-4 text-amber-500" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-amber-500 dark:text-amber-400 font-mono">
            {metrics?.commercial?.estimatedMrrTomans
              ? (Math.round(metrics.commercial.estimatedMrrTomans / 1000000)).toLocaleString('fa-IR')
              : '۰'}{' '}
            <span className="text-xs font-normal text-gray-500 dark:text-gray-400">میلیون تومان</span>
          </div>
          <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-1 font-mono">
            {metrics?.commercial?.activeSubscriptions ?? 0} اشتراک فعال پلتفرم
          </p>
        </Card>

        {/* Card 4: Cloud Storage */}
        <Card className="p-4 sm:p-5">
          <div className="flex justify-between items-center text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5">
            <span>فضای ذخیره‌سازی</span>
            <HardDrive className="h-4 w-4 text-purple-500" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-ink-darker dark:text-white font-mono">
            {metrics?.storage?.totalStorageMb
              ? (metrics.storage.totalStorageMb / 1024).toFixed(1)
              : '۰'}{' '}
            <span className="text-xs font-normal text-gray-500 dark:text-gray-400">گیگابایت</span>
          </div>
          <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium mt-1 font-mono">
            {metrics?.storage?.totalFiles ?? 0} فایل ابری ذخیره‌شده
          </p>
        </Card>
      </div>

      {/* Analytics Visuals */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* MRR Growth Chart */}
        <Card className="lg:col-span-2 p-4 sm:p-5">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-black text-sm sm:text-base text-ink-darker dark:text-white">
              روند رشد درآمد
            </h2>
            <Badge variant="default">میلیون تومان</Badge>
          </div>

          <div className="h-64 w-full" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={mrrData}>
                <defs>
                  <linearGradient id="colorMrr" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#59BBAF" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#59BBAF" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" stroke="#888888" fontSize={11} />
                <YAxis stroke="#888888" fontSize={11} />
                <Tooltip />
                <Area type="monotone" dataKey="mrr" stroke="#59BBAF" strokeWidth={3} fillOpacity={1} fill="url(#colorMrr)" name="درآمد ماهانه (میلیون تومان)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Quick Impersonate List */}
        <Card className="p-4 sm:p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <LogIn className="h-4 w-4 text-primary" />
              <h2 className="font-black text-sm text-ink-darker dark:text-white">ورود نیابتی سریع</h2>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
              انتخاب شعبه جهت نظارت و پشتیبانی:
            </p>

            <div className="space-y-2">
              {tenants.slice(0, 3).map((t) => (
                <div
                  key={t.id}
                  className="p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/40 flex items-center justify-between text-xs transition-colors"
                >
                  <div className="truncate min-w-0 pr-1">
                    <div className="font-bold text-ink-darker dark:text-white truncate">{t.name}</div>
                    <div className="text-[10px] text-gray-400 font-mono">{t.slug}</div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleFastImpersonate(t)}
                    className="shrink-0"
                  >
                    ورود نیابتی
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate('/app/super-admin/tenants')}
            className="w-full text-center text-xs text-primary font-bold hover:underline pt-3 mt-3 border-t border-gray-100 dark:border-gray-800 min-h-[36px] flex items-center justify-center"
          >
            مدیریت کامل شعب هنرستان ←
          </button>
        </Card>
      </div>
    </div>
  );
};
