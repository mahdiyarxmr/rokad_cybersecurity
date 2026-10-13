import React, { useState, useEffect, useMemo } from 'react';
import {
  ShieldCheck,
  KeyRound,
  RefreshCw,
  Search,
  Lock,
  Eye,
  CheckCircle2,
  Users,
  GraduationCap,
  Briefcase,
  UserCheck,
  HeartHandshake,
  AlertTriangle,
  Loader2,
  Key,
} from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '../../../lib/api/client';
import { vaultApi, VaultStatusResponse } from '../../../lib/api/vault';
import { PasswordRevealModal, TargetMember } from './PasswordRevealModal';

export const PasswordVaultPage: React.FC = () => {
  const [status, setStatus] = useState<VaultStatusResponse | null>(null);
  const [members, setMembers] = useState<TargetMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isBackfilling, setIsBackfilling] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('ALL');

  // Selected member for reveal modal
  const [revealTarget, setRevealTarget] = useState<TargetMember | null>(null);

  // Setup Key Modal
  const [isKeyModalOpen, setIsKeyModalOpen] = useState(false);
  const [newMasterKey, setNewMasterKey] = useState('');
  const [currentMasterKey, setCurrentMasterKey] = useState('');
  const [isSettingKey, setIsSettingKey] = useState(false);

  const fetchVaultStatus = async () => {
    try {
      const data = await vaultApi.getStatus();
      setStatus(data);
    } catch (err: any) {
      console.error('Failed to load vault status:', err);
    }
  };

  const fetchMembers = async () => {
    setIsLoading(true);
    try {
      const [studentsRes, teachersRes, staffRes, parentsRes] = await Promise.allSettled([
        apiClient.get('/members/students'),
        apiClient.get('/members/teachers'),
        apiClient.get('/members/staff'),
        apiClient.get('/members/parents'),
      ]);

      const allList: TargetMember[] = [];

      if (studentsRes.status === 'fulfilled' && Array.isArray(studentsRes.value.data)) {
        studentsRes.value.data.forEach((s: any) => {
          allList.push({
            id: s.user?.id || s.id,
            firstName: s.user?.firstName || s.firstName,
            lastName: s.user?.lastName || s.lastName,
            username: s.user?.username || s.nationalCode || s.studentCode,
            nationalId: s.nationalCode || s.user?.nationalId,
            phone: s.studentMobile || s.user?.phone || s.fatherPhone,
            role: 'STUDENT',
            user: s.user,
          });
        });
      }

      if (teachersRes.status === 'fulfilled' && Array.isArray(teachersRes.value.data)) {
        teachersRes.value.data.forEach((t: any) => {
          allList.push({
            id: t.user?.id || t.id,
            firstName: t.user?.firstName || t.firstName,
            lastName: t.user?.lastName || t.lastName,
            username: t.user?.username || t.nationalCode,
            nationalId: t.nationalCode || t.user?.nationalId,
            phone: t.user?.phone || t.phone,
            role: 'TEACHER',
            user: t.user,
          });
        });
      }

      if (staffRes.status === 'fulfilled' && Array.isArray(staffRes.value.data)) {
        staffRes.value.data.forEach((st: any) => {
          allList.push({
            id: st.user?.id || st.id,
            firstName: st.user?.firstName || st.firstName,
            lastName: st.user?.lastName || st.lastName,
            username: st.user?.username || st.nationalCode,
            nationalId: st.nationalCode || st.user?.nationalId,
            phone: st.user?.phone || st.phone,
            role: 'STAFF',
            user: st.user,
          });
        });
      }

      if (parentsRes.status === 'fulfilled' && Array.isArray(parentsRes.value.data)) {
        parentsRes.value.data.forEach((p: any) => {
          allList.push({
            id: p.user?.id || p.id,
            firstName: p.user?.firstName || p.firstName,
            lastName: p.user?.lastName || p.lastName,
            username: p.user?.username,
            nationalId: p.user?.nationalId,
            phone: p.user?.phone,
            role: 'PARENT',
            user: p.user,
          });
        });
      }

      setMembers(allList);
    } catch (err: any) {
      toast.error('خطا در دریافت لیست اعضا');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchVaultStatus();
    fetchMembers();
  }, []);

  const handleBackfill = async () => {
    setIsBackfilling(true);
    try {
      const res = await vaultApi.backfill();
      toast.success(
        `همگام‌سازی انجام شد: ${res.recovered} کاربر بازیابی و رمزنگاری شدند. (مجموع: ${res.total})`,
      );
      fetchVaultStatus();
    } catch (err: any) {
      toast.error('خطا در همگام‌سازی گاوصندوق');
    } finally {
      setIsBackfilling(false);
    }
  };

  const handleSetupKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMasterKey.trim() || newMasterKey.length < 8) {
      toast.error('کلید جدید باید حداقل ۸ کاراکتر باشد');
      return;
    }

    setIsSettingKey(true);
    try {
      await vaultApi.setupKey({
        newMasterKey: newMasterKey.trim(),
        currentMasterKey: currentMasterKey.trim() || undefined,
      });
      toast.success('کلید مستر گاوصندوق با موفقیت به‌روزرسانی شد');
      setIsKeyModalOpen(false);
      setNewMasterKey('');
      setCurrentMasterKey('');
      fetchVaultStatus();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'خطا در تغییر کلید مستر');
    } finally {
      setIsSettingKey(false);
    }
  };

  const filteredMembers = useMemo(() => {
    return members.filter((m) => {
      const matchRole = selectedRole === 'ALL' || m.role === selectedRole;
      if (!matchRole) return false;

      if (!searchQuery.trim()) return true;

      const q = searchQuery.trim().toLowerCase();
      const name = `${m.firstName || ''} ${m.lastName || ''}`.toLowerCase();
      const username = (m.username || '').toLowerCase();
      const phone = (m.phone || '').toLowerCase();
      const nationalId = (m.nationalId || '').toLowerCase();

      return (
        name.includes(q) ||
        username.includes(q) ||
        phone.includes(q) ||
        nationalId.includes(q)
      );
    });
  }, [members, selectedRole, searchQuery]);

  const getRoleBadge = (role?: string) => {
    switch (role) {
      case 'STUDENT':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
            <GraduationCap className="w-3.5 h-3.5" />
            <span>دانش‌آموز</span>
          </span>
        );
      case 'PARENT':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
            <HeartHandshake className="w-3.5 h-3.5" />
            <span>ولی</span>
          </span>
        );
      case 'TEACHER':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <UserCheck className="w-3.5 h-3.5" />
            <span>مربی</span>
          </span>
        );
      case 'STAFF':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <Briefcase className="w-3.5 h-3.5" />
            <span>کادر اداری</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-gray-500/10 text-gray-600 dark:text-gray-400 border border-gray-500/20">
            <span>{role || 'عضو'}</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-3xl bg-linear-to-r from-amber-500/15 via-amber-500/5 to-transparent border border-amber-500/20 shadow-xs backdrop-blur-md">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/30 shadow-inner">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl md:text-2xl font-black text-gray-900 dark:text-white">
                گاوصندوق رمز عبور کاربران
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-2xs font-extrabold bg-amber-500 text-white shadow-xs">
                Zero-Knowledge
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={() => setIsKeyModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 text-xs font-bold border border-gray-200 dark:border-gray-700 shadow-2xs transition-all flex items-center gap-2 cursor-pointer"
          >
            <Key className="w-4 h-4 text-amber-500" />
            <span>تنظیم / تغییر کلید مستر</span>
          </button>

          <button
            type="button"
            onClick={handleBackfill}
            disabled={isBackfilling}
            className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-md hover:shadow-lg disabled:opacity-50 transition-all flex items-center gap-2 cursor-pointer"
          >
            {isBackfilling ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            <span>همگام‌سازی رمزها</span>
          </button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white dark:bg-[#131926] border border-gray-100 dark:border-gray-800 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-gray-900 dark:text-white">
              {status ? `${status.coveragePercentage}٪` : '—'}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              پوشش گاوصندوق ({status ? `${status.encryptedUsers} از ${status.totalUsers} کاربر` : '...'})
            </div>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-[#131926] border border-gray-100 dark:border-gray-800 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/20">
            <Lock className="w-6 h-6" />
          </div>
          <div>
            <div className="text-sm font-bold text-gray-900 dark:text-white">
              {status?.isInitialized ? 'فعال و ایمن' : 'در انتظار راه‌اندازی'}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              وضعیت کلید عمومی RSA
            </div>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-[#131926] border border-gray-100 dark:border-gray-800 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-500/20">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-gray-900 dark:text-white">
              {members.length}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              کل اعضای فعال این مدرسه
            </div>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-[#131926] border border-gray-100 dark:border-gray-800 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center border border-purple-500/20">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="text-sm font-bold text-gray-900 dark:text-white">
              زنجیره AuditLog
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              ثبت غیرقابل تغییر هر استعلام
            </div>
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white dark:bg-[#131926] rounded-2xl border border-gray-100 dark:border-gray-800 shadow-xs overflow-hidden">
        {/* Filter Bar */}
        <div className="p-4 md:p-5 border-b border-gray-100 dark:border-gray-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="جستجو با نام، نام کاربری، کد ملی یا شماره همراه..."
              className="w-full pr-10 pl-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-xs text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
            {[
              { id: 'ALL', label: 'همه نقش‌ها' },
              { id: 'STUDENT', label: 'دانش‌آموزان' },
              { id: 'PARENT', label: 'اولیا' },
              { id: 'TEACHER', label: 'مربیان' },
              { id: 'STAFF', label: 'کادر اداری' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSelectedRole(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  selectedRole === tab.id
                    ? 'bg-amber-500 text-white shadow-xs'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3 text-gray-400">
              <Loader2 className="w-7 h-7 animate-spin text-amber-500" />
              <span className="text-xs">در حال بارگذاری اعضا...</span>
            </div>
          ) : filteredMembers.length === 0 ? (
            <div className="py-16 text-center text-gray-500 dark:text-gray-400 text-xs">
              کاربری با مشخصات جستجو شده یافت نشد.
            </div>
          ) : (
            <table className="w-full text-right text-xs">
              <thead className="bg-gray-50/75 dark:bg-gray-800/40 text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-800 font-semibold">
                <tr>
                  <th className="py-3 px-4">کاربر</th>
                  <th className="py-3 px-4">نقش</th>
                  <th className="py-3 px-4">نام کاربری / کد ملی</th>
                  <th className="py-3 px-4">شماره همراه</th>
                  <th className="py-3 px-4 text-left">اقدام</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {filteredMembers.map((member) => (
                  <tr
                    key={member.id}
                    className="hover:bg-gray-50/50 dark:hover:bg-gray-800/20 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div className="font-bold text-gray-900 dark:text-white">
                        {member.firstName} {member.lastName}
                      </div>
                    </td>
                    <td className="py-3 px-4">{getRoleBadge(member.role)}</td>
                    <td className="py-3 px-4 font-mono text-gray-600 dark:text-gray-300">
                      {member.username || member.nationalId || '—'}
                    </td>
                    <td className="py-3 px-4 font-mono text-gray-600 dark:text-gray-300">
                      {member.phone || '—'}
                    </td>
                    <td className="py-3 px-4 text-left">
                      <button
                        type="button"
                        onClick={() => setRevealTarget(member)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500 hover:text-white transition-all shadow-2xs border border-amber-500/20 cursor-pointer"
                      >
                        <KeyRound className="w-3.5 h-3.5" />
                        <span>مشاهده رمز عبور</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Reveal Password Modal */}
      <PasswordRevealModal
        isOpen={!!revealTarget}
        onClose={() => setRevealTarget(null)}
        targetMember={revealTarget}
      />

      {/* Setup Master Key Modal */}
      {isKeyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-white dark:bg-[#131926] rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center border border-amber-500/20">
                <Key className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white text-base">
                  تنظیم / تغییر کلید مستر راهبر
                </h3>
                <p className="text-xs text-gray-500">
                  این کلید برای باز کردن قفل گاوصندوق رمزها ضروری است
                </p>
              </div>
            </div>

            <form onSubmit={handleSetupKey} className="space-y-4 pt-2">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  کلید مستر فعلی (در صورتی که قبلاً کلیدی تنظیم کرده‌اید)
                </label>
                <input
                  type="password"
                  value={currentMasterKey}
                  onChange={(e) => setCurrentMasterKey(e.target.value)}
                  placeholder="کلید فعلی را وارد کنید (پیش‌فرض: RokadMaster@2026)"
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-xs text-gray-900 dark:text-gray-100 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  کلید مستر جدید <span className="text-rose-500">*</span>
                </label>
                <input
                  type="password"
                  value={newMasterKey}
                  onChange={(e) => setNewMasterKey(e.target.value)}
                  placeholder="حداقل ۸ کاراکتر امنیتی..."
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-xs text-gray-900 dark:text-gray-100 font-mono"
                  required
                />
              </div>

              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 text-2xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  توجه: این کلید را در جای امن یادداشت کنید. سرور کلید مستر شما را ذخیره نمی‌کند و
                  امکان بازیابی کلید بدون کلید قبلی وجود ندارد.
                </span>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={isSettingKey || !newMasterKey.trim()}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-md disabled:opacity-50 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isSettingKey ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  <span>ذخیره کلید مستر جدید</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsKeyModalOpen(false)}
                  className="py-2.5 px-4 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-semibold text-xs hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  انصراف
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
