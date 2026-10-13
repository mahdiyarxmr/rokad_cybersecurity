import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Badge } from '../../../components/ui/Badge';
import { Modal } from '../../../components/ui/Modal';
import { apiClient } from '../../../lib/api/client';
import { useAuthStore } from '../../../lib/auth/auth-store';
import { formatToJalali, toPersianDigits } from '../../../lib/utils';
import { toast } from '../../../components/ui/toast/toast';
import {
  ShieldCheck,
  ShieldAlert,
  KeyRound,
  Laptop,
  Smartphone,
  Tablet,
  CheckCircle2,
  Copy,
  Download,
  AlertTriangle,
  RefreshCw,
  LogOut,
  Lock,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface SessionItem {
  id: string;
  ipAddress: string;
  browser: string;
  os: string;
  deviceType: 'DESKTOP' | 'MOBILE' | 'TABLET';
  createdAt: string;
  lastActiveAt: string;
  isCurrent: boolean;
}

export const SecuritySection: React.FC = () => {
  // 2FA state (initialized from persistent auth store to prevent flicker)
  const [twoFactorEnabled, setTwoFactorEnabled] = useState<boolean>(() =>
    Boolean(useAuthStore.getState().user?.twoFactorEnabled),
  );
  const [loading2FAStatus, setLoading2FAStatus] = useState(true);

  // 2FA Setup Modal State
  const [isSetupModalOpen, setIsSetupModalOpen] = useState(false);
  const [setupData, setSetupData] = useState<{
    secret: string;
    qrCodeUrl: string;
  } | null>(null);
  const [confirmCode, setConfirmCode] = useState('');
  const [isEnabling, setIsEnabling] = useState(false);
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);

  // 2FA Disable Modal State
  const [isDisableModalOpen, setIsDisableModalOpen] = useState(false);
  const [disablePassword, setDisablePassword] = useState('');
  const [isDisabling, setIsDisabling] = useState(false);

  // Active Sessions State
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [isRevokingAll, setIsRevokingAll] = useState(false);
  const [isExpandedSessions, setIsExpandedSessions] = useState(false);

  const sortedSessions = useMemo(() => {
    return [...sessions].sort((a, b) => {
      if (a.isCurrent && !b.isCurrent) return -1;
      if (!a.isCurrent && b.isCurrent) return 1;
      return (
        new Date(b.lastActiveAt || b.createdAt).getTime() -
        new Date(a.lastActiveAt || a.createdAt).getTime()
      );
    });
  }, [sessions]);

  const visibleSessions = useMemo(() => {
    if (isExpandedSessions || sortedSessions.length <= 3) {
      return sortedSessions;
    }
    return sortedSessions.slice(0, 3);
  }, [sortedSessions, isExpandedSessions]);

  // Change Password State
  const [passForm, setPassForm] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [isChangingPass, setIsChangingPass] = useState(false);

  // 1. Fetch Profile & 2FA Status
  const fetchProfile = useCallback(async () => {
    try {
      setLoading2FAStatus(true);
      const res: any = await apiClient.get('/auth/me');
      const user = res?.data?.user || res?.user || res?.data;
      if (user && typeof user.twoFactorEnabled !== 'undefined') {
        const isEnabled = Boolean(user.twoFactorEnabled);
        setTwoFactorEnabled(isEnabled);
        const currentUser = useAuthStore.getState().user;
        if (currentUser && currentUser.twoFactorEnabled !== isEnabled) {
          useAuthStore.getState().setUser({ ...currentUser, twoFactorEnabled: isEnabled });
        }
      }
    } catch {
      const storedUser = useAuthStore.getState().user;
      if (storedUser) {
        setTwoFactorEnabled(Boolean(storedUser.twoFactorEnabled));
      }
    } finally {
      setLoading2FAStatus(false);
    }
  }, []);

  // 2. Fetch Active Sessions
  const fetchSessions = useCallback(async () => {
    try {
      setLoadingSessions(true);
      const res: any = await apiClient.get('/auth/sessions');
      const list = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
      setSessions(list);
    } catch {
      toast.error('خطا در دریافت لیست نشست‌های فعال');
    } finally {
      setLoadingSessions(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
    fetchSessions();
  }, [fetchProfile, fetchSessions]);

  // Start 2FA Setup
  const handleStartSetup = async () => {
    try {
      setIsEnabling(true);
      const res: any = await apiClient.post('/auth/2fa/setup');
      const data = res.data || res;
      setSetupData({
        secret: data.secret,
        qrCodeUrl: data.qrCodeUrl,
      });
      setConfirmCode('');
      setRecoveryCodes(null);
      setIsSetupModalOpen(true);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'خطا در شروع فعال‌سازی ۲FA');
    } finally {
      setIsEnabling(false);
    }
  };

  // Confirm 2FA Activation
  const handleConfirmEnable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmCode.trim() || confirmCode.trim().length !== 6) {
      toast.error('لطفاً کد ۶ رقمی را به صورت کامل وارد نمایید');
      return;
    }

    try {
      setIsEnabling(true);
      const res: any = await apiClient.post('/auth/2fa/enable', {
        code: confirmCode.trim(),
      });
      const data = res.data || res;
      setTwoFactorEnabled(true);
      const currentUser = useAuthStore.getState().user;
      if (currentUser) {
        useAuthStore.getState().setUser({ ...currentUser, twoFactorEnabled: true });
      }
      setRecoveryCodes(data.recoveryCodes || []);
      toast.success('احراز هویت دومرحله‌ای با موفقیت فعال شد');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'کد ۶ رقمی نادرست است');
    } finally {
      setIsEnabling(false);
    }
  };

  // Disable 2FA
  const handleDisable2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!disablePassword) return;

    try {
      setIsDisabling(true);
      await apiClient.post('/auth/2fa/disable', {
        password: disablePassword,
      });
      setTwoFactorEnabled(false);
      const currentUser = useAuthStore.getState().user;
      if (currentUser) {
        useAuthStore.getState().setUser({ ...currentUser, twoFactorEnabled: false });
      }
      setIsDisableModalOpen(false);
      setDisablePassword('');
      toast.success('احراز هویت دومرحله‌ای غیرفعال گردید');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'رمز عبور نادرست است');
    } finally {
      setIsDisabling(false);
    }
  };

  // Revoke a single session
  const handleRevokeSession = async (sessionId: string) => {
    try {
      setRevokingId(sessionId);
      await apiClient.delete(`/auth/sessions/${sessionId}`);
      toast.success('نشست دستگاه با موفقیت خاتمه یافت');
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'خطا در خاتمه نشست');
    } finally {
      setRevokingId(null);
    }
  };

  // Revoke all other sessions
  const handleRevokeAllOthers = async () => {
    try {
      setIsRevokingAll(true);
      await apiClient.post('/auth/sessions/revoke-others');
      toast.success('تمامی نشست‌های فعال در سایر دستگاه‌ها با موفقیت باطل شدند');
      fetchSessions();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'خطا در خاتمه نشست‌ها');
    } finally {
      setIsRevokingAll(false);
    }
  };

  // Change Password
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (passForm.newPassword !== passForm.confirmPassword) {
      toast.error('تکرار کلمه عبور جدید با کلمه عبور همخوانی ندارد');
      return;
    }
    if (passForm.newPassword.length < 8) {
      toast.error('کلمه عبور جدید باید حداقل ۸ کاراکتر باشد');
      return;
    }

    try {
      setIsChangingPass(true);
      await apiClient.post('/auth/change-password', {
        oldPassword: passForm.oldPassword,
        newPassword: passForm.newPassword,
      });

      toast.success(
        'رمز عبور با موفقیت به‌روزرسانی شد و تمامی نشست‌های فعال در سایر دستگاه‌ها باطل گردیدند',
      );
      setPassForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
      fetchSessions();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'خطا در تغییر کلمه عبور');
    } finally {
      setIsChangingPass(false);
    }
  };

  const copyRecoveryCodes = () => {
    if (!recoveryCodes) return;
    navigator.clipboard.writeText(recoveryCodes.join('\n'));
    toast.success('کدهای بازیابی در حافظه کپی شدند');
  };

  const downloadRecoveryCodes = () => {
    if (!recoveryCodes) return;
    const content = `کدهای بازیابی اضطراری ورود دومرحله‌ای پلتفرم رکاد\nتاریخ: ${new Date().toLocaleDateString('fa-IR')}\n\nتوجه: هر کد فقط یک‌بار قابل استفاده است.\n\n` +
      recoveryCodes.map((c, i) => `${i + 1}. ${c}`).join('\n');
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rokad-recovery-codes-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getDeviceIcon = (type: string) => {
    switch (type) {
      case 'MOBILE':
        return <Smartphone className="w-4 h-4 text-primary" />;
      case 'TABLET':
        return <Tablet className="w-4 h-4 text-amber-500" />;
      default:
        return <Laptop className="w-4 h-4 text-indigo-500" />;
    }
  };

  return (
    <div className="space-y-5">
      {/* 1. Two-Factor Authentication Card */}
      <Card className="border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-[#151C28] shadow-xs rounded-2xl overflow-hidden transition-all">
        <CardHeader className="pb-3 border-b border-gray-100 dark:border-gray-800/80">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <CardTitle className="text-sm sm:text-base font-black text-ink-darker dark:text-white">
                  احراز هویت دو مرحله‌ای
                </CardTitle>
                {twoFactorEnabled ? (
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/60 shadow-2xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>فعال</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/60">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                    <span>غیرفعال</span>
                  </span>
                )}
              </div>
            </div>

            {/* Action button at top left of the box */}
            <div className="flex items-center gap-2">
              {twoFactorEnabled ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsDisableModalOpen(true)}
                  className="min-h-[36px] px-3.5 text-xs font-bold text-rose-600 border-rose-200 dark:border-rose-900/60 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl cursor-pointer"
                >
                  غیرفعال‌سازی
                </Button>
              ) : (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleStartSetup}
                  isLoading={isEnabling}
                  className="min-h-[36px] px-3.5 text-xs font-bold gap-1.5 rounded-xl shadow-xs active:scale-95 transition-all cursor-pointer"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>فعال سازی</span>
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-3.5 pb-4">
          <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
            با فعال‌سازی این قابلیت، هنگام ورود علاوه بر گذرواژه، به کد یک‌بار مصرف اپلیکیشن‌های امنیتی روی تلفن همراه (مانند Google Authenticator) نیاز خواهید داشت تا دسترسی غیرمجاز به حساب کاربری غیرممکن شود.
          </p>
        </CardContent>
      </Card>

      {/* 2. Active Devices & Sessions Card */}
      <Card className="border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-[#151C28] shadow-xs rounded-2xl overflow-hidden transition-all">
        <CardHeader className="pb-3 border-b border-gray-100 dark:border-gray-800/80">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-500 dark:bg-indigo-400/10 dark:text-indigo-400">
                <Laptop className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-sm sm:text-base font-black text-ink-darker dark:text-white">
                    دستگاه‌های فعال
                  </CardTitle>
                  {sessions.length > 0 && (
                    <Badge variant="neutral" className="text-[10px] font-bold px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700">
                      {toPersianDigits(sessions.length)} دستگاه
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Top Left Buttons - Swapped order: Refresh first, then Logout */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={fetchSessions}
                disabled={loadingSessions}
                className="min-h-[36px] min-w-[36px] rounded-xl text-gray-500 hover:text-primary hover:bg-gray-100 dark:hover:bg-[#1C2536] transition-colors flex items-center justify-center cursor-pointer"
                title="به‌روزرسانی نشست‌ها"
                aria-label="به‌روزرسانی"
              >
                <RefreshCw className={`w-4 h-4 ${loadingSessions ? 'animate-spin text-primary' : ''}`} />
              </button>

              {sessions.length > 1 ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRevokeAllOthers}
                  isLoading={isRevokingAll}
                  className="text-xs font-bold text-rose-600 border-rose-200 dark:border-rose-900/60 hover:bg-rose-50 dark:hover:bg-rose-950/30 min-h-[36px] px-3 rounded-xl cursor-pointer"
                >
                  خروج از سایر دستگاه‌ها
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  disabled
                  className="text-xs font-medium text-gray-400 dark:text-gray-600 border-gray-200 dark:border-gray-800 min-h-[36px] px-3 rounded-xl opacity-60 cursor-not-allowed"
                >
                  خروج از سایر دستگاه‌ها
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-3.5 space-y-2.5">
          {sessions.length === 0 ? (
            <div className="text-center py-6 text-xs text-gray-400 dark:text-gray-500">
              هیچ نشستی ثبت نشده است
            </div>
          ) : (
            <>
              {visibleSessions.map((s) => (
                <div
                  key={s.id}
                  className={`p-3 sm:p-3.5 rounded-xl border flex items-center justify-between gap-3 transition-all ${
                    s.isCurrent
                      ? 'border-emerald-500/40 bg-emerald-50/40 dark:bg-emerald-950/20 shadow-2xs'
                      : 'border-gray-200/80 dark:border-gray-800 bg-gray-50/50 dark:bg-[#1C2536]/30 hover:border-gray-300 dark:hover:border-gray-700'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2.5 rounded-xl bg-white dark:bg-[#1C2536] border border-gray-200/80 dark:border-gray-700/80 shadow-2xs shrink-0">
                      {getDeviceIcon(s.deviceType)}
                    </div>

                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-xs sm:text-sm text-ink-darker dark:text-white truncate">
                          {s.browser} روی {s.os}
                        </span>
                        {s.isCurrent && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300/50 dark:border-emerald-800/50">
                            دستگاه فعلی شما
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-[11px] text-gray-500 dark:text-gray-400 font-mono dir-ltr flex-wrap">
                        <span>IP: {s.ipAddress}</span>
                        <span className="text-gray-300 dark:text-gray-600">•</span>
                        <span className="dir-rtl">
                          آخرین فعالیت: {formatToJalali(s.lastActiveAt)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {!s.isCurrent && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRevokeSession(s.id)}
                      isLoading={revokingId === s.id}
                      className="text-xs text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 min-h-[36px] px-2.5 rounded-xl shrink-0"
                      title="خاتمه این نشست"
                    >
                      <LogOut className="w-3.5 h-3.5 ml-1" />
                      <span>خاتمه</span>
                    </Button>
                  )}
                </div>
              ))}

              {sessions.length > 3 && (
                <div className="pt-2 border-t border-gray-100 dark:border-gray-800/80 flex justify-center">
                  <button
                    type="button"
                    onClick={() => setIsExpandedSessions((prev) => !prev)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-primary hover:bg-primary/10 dark:hover:bg-primary/20 transition-all cursor-pointer"
                  >
                    {isExpandedSessions ? (
                      <>
                        <ChevronUp className="w-4 h-4" />
                        <span>بستن و نمایش خلاصه ({toPersianDigits(3)} دستگاه اخیر)</span>
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-4 h-4" />
                        <span>
                          مشاهده سایر دستگاه‌ها ({toPersianDigits(sessions.length - 3)} نشست دیگر)
                        </span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* 3. Change Password Card */}
      <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#151C28]">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-500">
              <KeyRound className="w-4 h-4" />
            </div>
            <div>
              <CardTitle className="text-base font-extrabold">تغییر رمز عبور</CardTitle>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <form onSubmit={handleChangePassword} className="space-y-3">
            <Input
              label="رمز عبور فعلی"
              type="password"
              value={passForm.oldPassword}
              onChange={(e) => setPassForm({ ...passForm, oldPassword: e.target.value })}
              required
              placeholder="••••••••"
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="رمز عبور جدید"
                type="password"
                value={passForm.newPassword}
                onChange={(e) => setPassForm({ ...passForm, newPassword: e.target.value })}
                required
                placeholder="حداقل ۸ کاراکتر"
              />
              <Input
                label="تکرار رمز عبور جدید"
                type="password"
                value={passForm.confirmPassword}
                onChange={(e) => setPassForm({ ...passForm, confirmPassword: e.target.value })}
                required
                placeholder="••••••••"
              />
            </div>

            <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200/70 dark:border-amber-800/40 text-[11px] text-amber-800 dark:text-amber-300 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>
                توجه: با تغییر رمز عبور، حساب شما در تمام دستگاه‌های متصل دیگر به صورت خودکار خارج خواهد شد.
              </span>
            </div>

            <div className="pt-1 flex justify-end">
              <Button
                type="submit"
                variant="primary"
                isLoading={isChangingPass}
                className="text-xs font-bold"
              >
                ثبت و به‌روزرسانی کلمه عبور
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* 2FA SETUP MODAL */}
      <Modal
        isOpen={isSetupModalOpen}
        onClose={() => setIsSetupModalOpen(false)}
        title="راه‌اندازی احراز هویت دومرحله‌ای"
        maxWidth="md"
      >
        <div className="space-y-4 text-right">
          {!recoveryCodes ? (
            <>
              <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                ۱. بارکد زیر را با اپلیکیشن Google Authenticator یا هر نرم‌افزار سازگار دیگری اسکن کنید:
              </p>

              {setupData?.qrCodeUrl && (
                <div className="flex flex-col items-center justify-center p-4 bg-white rounded-2xl border border-gray-200 shadow-2xs max-w-[260px] mx-auto">
                  <img
                    src={setupData.qrCodeUrl}
                    alt="QR Code 2FA"
                    className="w-48 h-48 rounded-xl object-contain"
                  />
                  <div className="mt-3 text-center">
                    <span className="text-[10px] text-gray-500 font-mono select-all">
                      کلید دستی: {setupData.secret}
                    </span>
                  </div>
                </div>
              )}

              <form onSubmit={handleConfirmEnable} className="space-y-3 pt-2">
                <div>
                  <label className="block text-xs font-bold text-ink-dark dark:text-gray-200 mb-1">
                    ۲. کد ۶ رقمی تولید شده در اپلیکیشن را وارد نمایید:
                  </label>
                  <Input
                    value={confirmCode}
                    onChange={(e) => setConfirmCode(e.target.value)}
                    placeholder="••••••"
                    maxLength={6}
                    autoFocus
                    className="text-center font-mono tracking-widest text-lg font-black h-11 dir-ltr"
                    required
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    type="submit"
                    variant="primary"
                    className="flex-1 font-bold h-10"
                    isLoading={isEnabling}
                  >
                    تأیید و ذخیره کدهای بازیابی
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsSetupModalOpen(false)}
                    className="h-10 px-4"
                  >
                    انصراف
                  </Button>
                </div>
              </form>
            </>
          ) : (
            /* RECOVERY CODES DISPLAY */
            <div className="space-y-4">
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2 font-bold">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>احراز هویت دومرحله‌ای با موفقیت فعال گردید!</span>
              </div>

              <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-800 dark:text-amber-300 space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>کدهای بازیابی اضطراری (بسیار مهم):</span>
                </p>
                <p className="text-[11px] leading-relaxed">
                  در صورت گم شدن تلفن همراه، تنها راه ورود شما این ۸ کد هستند. حتماً آن‌ها را دانلود یا کپی کرده و در جایی امن نگه دارید.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 p-3 bg-gray-50 dark:bg-gray-800/60 rounded-xl border border-gray-200 dark:border-gray-700">
                {recoveryCodes.map((code, idx) => (
                  <div
                    key={idx}
                    className="p-2 rounded-lg bg-white dark:bg-[#1E2738] border border-gray-200 dark:border-gray-700 text-center font-mono font-bold text-xs text-ink-dark dark:text-white select-all"
                  >
                    {toPersianDigits(idx + 1)}. {code}
                  </div>
                ))}
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={copyRecoveryCodes}
                  className="flex-1 text-xs gap-1.5"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>کپی کدهای بازیابی</span>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={downloadRecoveryCodes}
                  className="flex-1 text-xs gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>دانلود فایل متنی</span>
                </Button>
              </div>

              <div className="pt-2">
                <Button
                  type="button"
                  variant="primary"
                  onClick={() => setIsSetupModalOpen(false)}
                  className="w-full font-bold h-10"
                >
                  کدها را ذخیره کردم، بستن
                </Button>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* 2FA DISABLE MODAL */}
      <Modal
        isOpen={isDisableModalOpen}
        onClose={() => setIsDisableModalOpen(false)}
        title="غیرفعال‌سازی احراز هویت دومرحله‌ای"
        maxWidth="sm"
      >
        <form onSubmit={handleDisable2FA} className="space-y-4 text-right">
          <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
            برای غیرفعال‌سازی ۲FA و کاهش سطح امنیت، لطفاً رمز عبور فعلی حساب کاربری خود را وارد فرمایید:
          </p>

          <Input
            label="رمز عبور فعلی"
            type="password"
            value={disablePassword}
            onChange={(e) => setDisablePassword(e.target.value)}
            required
            autoFocus
            placeholder="••••••••"
          />

          <div className="flex gap-2 pt-2">
            <Button
              type="submit"
              variant="destructive"
              className="flex-1 font-bold h-10"
              isLoading={isDisabling}
            >
              تأیید و غیرفعال‌سازی
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDisableModalOpen(false)}
              className="h-10 px-4"
            >
              انصراف
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
