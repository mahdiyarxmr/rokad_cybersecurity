import React, { useEffect, useState } from 'react';
import { apiClient } from '../../../lib/api/client';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Badge } from '../../../components/ui/Badge';
import { Modal } from '../../../components/ui/Modal';
import { Skeleton } from '../../../components/ui/Skeleton';
import { ResponsivePageHeader } from '../../../components/ui/ResponsivePageHeader';
import {
  Sliders,
  Plus,
  Send,
  ShieldCheck,
  CheckCircle2,
  Lock,
  Layers,
} from 'lucide-react';

export const RoleTemplatesPage: React.FC = () => {
  const [templates, setTemplates] = useState<any[]>([]);
  const [tenants, setTenants] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isDistributeOpen, setIsDistributeOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);

  // Forms
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [createForm, setCreateForm] = useState({
    code: '',
    name: '',
    description: '',
    targetTenantType: 'SCHOOL',
    permissionCodes: [] as string[],
  });

  const [distributeTarget, setDistributeTarget] = useState<'ALL' | 'SPECIFIC'>('ALL');
  const [selectedTenantIds, setSelectedTenantIds] = useState<string[]>([]);

  // Categorized standard permissions
  const permissionCategories = [
    {
      category: 'حضور و غیاب و تکالیف',
      perms: [
        { code: 'attendance.read', label: 'مشاهده حضور و غیاب' },
        { code: 'attendance.write', label: 'ثبت و ویرایش حضور و غیاب' },
        { code: 'homework.read', label: 'مشاهده تکالیف' },
        { code: 'homework.write', label: 'تعریف و تصحیح تکالیف' },
      ],
    },
    {
      category: 'آزمون‌ها و دفتر نمرات',
      perms: [
        { code: 'exam.read', label: 'مشاهده آزمون‌ها و بانک سوال' },
        { code: 'exam.write', label: 'طراحی آزمون و ثبت سوال' },
        { code: 'grades.read', label: 'مشاهده نمرات و کارنامه' },
        { code: 'grades.write', label: 'ثبت و ویرایش نمرات کلاسی' },
      ],
    },
    {
      category: 'امور مالی و اداری',
      perms: [
        { code: 'finance.fee.read', label: 'مشاهده شهریه و اقساط' },
        { code: 'finance.fee.write', label: 'ثبت قرارداد و تراکنش مالی' },
        { code: 'finance.payroll.read', label: 'مشاهده حقوق و فیش‌ها' },
        { code: 'finance.payroll.write', label: 'صدور و تایید فیش حقوقی' },
      ],
    },
    {
      category: 'رویدادها و انضباطی',
      perms: [
        { code: 'calendar.read', label: 'مشاهده تقویم و رویدادها' },
        { code: 'calendar.write', label: 'ثبت رویداد و اطلاعیه' },
        { code: 'matter.read', label: 'مشاهده پرونده انضباطی' },
        { code: 'matter.write', label: 'ثبت موارد تشویق/تنبیه' },
      ],
    },
  ];

  const fetchTemplates = async () => {
    try {
      setIsLoading(true);
      const [tplRes, tenRes] = await Promise.all([
        apiClient.get('/saas/roles/templates'),
        apiClient.get('/saas/tenants'),
      ]);
      setTemplates(tplRes.data);
      setTenants(tenRes.data);
    } catch (err) {
      console.error('Failed to load templates', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const handleTogglePerm = (code: string) => {
    setCreateForm((prev) => {
      const exists = prev.permissionCodes.includes(code);
      return {
        ...prev,
        permissionCodes: exists
          ? prev.permissionCodes.filter((p) => p !== code)
          : [...prev.permissionCodes, code],
      };
    });
  };

  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      await apiClient.post('/saas/roles/templates', createForm);
      setIsCreateOpen(false);
      setCreateForm({
        code: '',
        name: '',
        description: '',
        targetTenantType: 'SCHOOL',
        permissionCodes: [],
      });
      fetchTemplates();
    } catch (err: any) {
      setError(err.message || 'خطا در ایجاد قالب نقش.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDistribute = async () => {
    if (!selectedTemplate) return;
    setIsSubmitting(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const payload = distributeTarget === 'ALL' ? {} : { targetTenantIds: selectedTenantIds };
      const res = await apiClient.post(`/saas/roles/templates/${selectedTemplate.id}/distribute`, payload);
      setSuccessMsg(`قالب نقش با موفقیت به ${res.data.distributedCount} مرکز آموزشی توزیع و همگام شد.`);
      setTimeout(() => {
        setIsDistributeOpen(false);
        setSuccessMsg(null);
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'خطا در توزیع قالب نقش.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <ResponsivePageHeader
        icon={Sliders}
        title="سازنده قالب‌های نقش پویا"
        description="تعریف نقش‌های استاندارد کشوری و توزیع و همگام‌سازی خودکار به مدارس و مراکز منتخب"
        actions={
          <Button
            variant="primary"
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center space-x-1.5 space-x-reverse text-xs"
          >
            <Plus className="h-4 w-4" />
            <span>قالب نقش جدید</span>
          </Button>
        }
      />

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="p-6">
              <Skeleton className="h-6 w-32 mb-2" />
              <Skeleton className="h-4 w-full mb-4" />
              <Skeleton className="h-24 w-full mb-4" />
              <Skeleton className="h-10 w-full" />
            </Card>
          ))
        ) : (
          templates.map((tpl) => (
            <Card key={tpl.id} className="flex flex-col justify-between border hover:border-primary transition-all">
              <CardHeader className="p-6 pb-4">
                <div className="flex items-center justify-between">
                  <Badge variant="default" className="text-[11px] font-mono">
                    {tpl.code}
                  </Badge>
                  {tpl.isSystem && (
                    <Badge variant="neutral" className="text-[10px]">
                      سیستمی
                    </Badge>
                  )}
                </div>
                <CardTitle className="text-base mt-2 flex items-center space-x-2 space-x-reverse">
                  <ShieldCheck className="h-5 w-5 text-primary" />
                  <span>{tpl.name}</span>
                </CardTitle>
                <p className="text-xs text-gray-500 mt-1 min-h-[36px]">{tpl.description}</p>
              </CardHeader>

              <CardContent className="p-6 pt-0 space-y-3">
                <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                  <div className="text-[11px] font-bold text-ink-darker mb-2 flex items-center justify-between">
                    <span>دسترسی‌های فعال این نقش:</span>
                    <span className="text-primary font-mono">{tpl.permissions?.length || 0} مجوز</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {tpl.permissions?.map((p: any) => (
                      <span
                        key={p.id}
                        className="bg-white border border-gray-200 text-[10px] px-2 py-0.5 rounded text-gray-600 font-mono"
                      >
                        {p.permissionCode}
                      </span>
                    ))}
                  </div>
                </div>
              </CardContent>

              <div className="p-6 pt-0">
                <Button
                  variant="outline"
                  className="w-full text-xs flex items-center justify-center space-x-1.5 space-x-reverse"
                  onClick={() => {
                    setSelectedTemplate(tpl);
                    setIsDistributeOpen(true);
                  }}
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>توزیع سراسری به مدارس</span>
                </Button>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* 1. Modal: Create Role Template */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="طراحی قالب نقش پویا استاندارد"
        description="تعریف عنوان نقش و دسترسی‌های مجاز در سراسر سامانه‌های آموزشی"
        maxWidth="xl"
      >
        {error && (
          <div className="mb-4 rounded-lg bg-red-50 p-3 text-xs text-red-700 border border-red-200">
            {error}
          </div>
        )}

        <form onSubmit={handleCreateTemplate} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="کد یکتای قالب (انگلیسی)"
              placeholder="مثال: CHIEF_ACCOUNTANT"
              value={createForm.code}
              onChange={(e) => setCreateForm({ ...createForm, code: e.target.value })}
              required
            />
            <Input
              label="عنوان فارسی نقش"
              placeholder="مثال: حسابدار ارشد مالی"
              value={createForm.name}
              onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
              required
            />
          </div>

          <Input
            label="توضیحات نقش"
            placeholder="مثال: دسترسی کامل به امور مالی، حقوق و قراردادها"
            value={createForm.description}
            onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
          />

          <div>
            <label className="block text-sm font-medium text-ink-normal mb-2 text-right">
              انتخاب مجوزها و دسترسی‌های این نقش:
            </label>
            <div className="space-y-4 max-h-60 overflow-y-auto p-3 bg-gray-50 rounded-xl border border-gray-200">
              {permissionCategories.map((cat, idx) => (
                <div key={idx} className="space-y-1.5">
                  <div className="font-bold text-xs text-primary-dark">{cat.category}</div>
                  <div className="grid grid-cols-2 gap-2">
                    {cat.perms.map((p) => (
                      <label
                        key={p.code}
                        className="flex items-center space-x-2 space-x-reverse cursor-pointer text-xs bg-white p-2 rounded-lg border border-gray-200 hover:bg-gray-50"
                      >
                        <input
                          type="checkbox"
                          checked={createForm.permissionCodes.includes(p.code)}
                          onChange={() => handleTogglePerm(p.code)}
                          className="h-4 w-4 rounded text-primary focus:ring-primary"
                        />
                        <span>{p.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end space-x-2 space-x-reverse pt-2">
            <Button type="button" variant="ghost" onClick={() => setIsCreateOpen(false)}>
              انصراف
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              ایجاد قالب نقش
            </Button>
          </div>
        </form>
      </Modal>

      {/* 2. Modal: Distribute Role Template */}
      <Modal
        isOpen={isDistributeOpen}
        onClose={() => setIsDistributeOpen(false)}
        title={`توزیع قالب نقش: ${selectedTemplate?.name}`}
        description="این عملیات نقش را در جدول نقش‌های مدارس ایجاد کرده و دسترسی‌ها را همگام‌سازی می‌نماید."
        maxWidth="md"
      >
        {successMsg ? (
          <div className="p-4 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-200 flex items-center space-x-2 space-x-reverse text-xs">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
        ) : (
          <div className="space-y-4">
            {error && (
              <div className="rounded-lg bg-red-50 p-3 text-xs text-red-700 border border-red-200">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-ink-normal mb-2 text-right">دامنه توزیع</label>
              <div className="space-y-2">
                <label className="flex items-center space-x-2 space-x-reverse text-xs cursor-pointer">
                  <input
                    type="radio"
                    name="target"
                    checked={distributeTarget === 'ALL'}
                    onChange={() => setDistributeTarget('ALL')}
                    className="text-primary focus:ring-primary"
                  />
                  <span>انتشار در سراسر تمام مراکز و مدارس پلتفرم</span>
                </label>

                <label className="flex items-center space-x-2 space-x-reverse text-xs cursor-pointer">
                  <input
                    type="radio"
                    name="target"
                    checked={distributeTarget === 'SPECIFIC'}
                    onChange={() => setDistributeTarget('SPECIFIC')}
                    className="text-primary focus:ring-primary"
                  />
                  <span>انتشار فقط در مدارس منتخب</span>
                </label>
              </div>
            </div>

            {distributeTarget === 'SPECIFIC' && (
              <div className="space-y-2 max-h-40 overflow-y-auto p-2 border rounded-lg bg-gray-50">
                {tenants.map((t) => (
                  <label key={t.id} className="flex items-center space-x-2 space-x-reverse text-xs cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedTenantIds.includes(t.id)}
                      onChange={(e) => {
                        setSelectedTenantIds(
                          e.target.checked
                            ? [...selectedTenantIds, t.id]
                            : selectedTenantIds.filter((id) => id !== t.id),
                        );
                      }}
                      className="rounded text-primary focus:ring-primary"
                    />
                    <span>{t.name}</span>
                  </label>
                ))}
              </div>
            )}

            <div className="flex justify-end space-x-2 space-x-reverse pt-2">
              <Button variant="ghost" onClick={() => setIsDistributeOpen(false)}>
                انصراف
              </Button>
              <Button variant="primary" onClick={handleDistribute} isLoading={isSubmitting}>
                شروع همگام‌سازی
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
