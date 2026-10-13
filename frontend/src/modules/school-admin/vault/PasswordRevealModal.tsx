import React, { useState, useEffect } from 'react';
import {
  KeyRound,
  Eye,
  EyeOff,
  Copy,
  Check,
  ShieldAlert,
  Lock,
  User as UserIcon,
  X,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { vaultApi, RevealPasswordResponse } from '../../../lib/api/vault';
import { vaultSession } from '../../../lib/auth/vault-session';

export interface TargetMember {
  id: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  nationalId?: string;
  phone?: string;
  role?: string;
  user?: {
    id: string;
    firstName?: string;
    lastName?: string;
    username?: string;
    phone?: string;
    role?: string;
  };
}

interface PasswordRevealModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetMember: TargetMember | null;
}

export const PasswordRevealModal: React.FC<PasswordRevealModalProps> = ({
  isOpen,
  onClose,
  targetMember,
}) => {
  const [masterKey, setMasterKey] = useState('');
  const [showMasterKey, setShowMasterKey] = useState(false);
  const [rememberKey, setRememberKey] = useState(true);
  const [reason, setReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RevealPasswordResponse | null>(null);
  const [copied, setCopied] = useState(false);
  const [showPlainPassword, setShowPlainPassword] = useState(true);

  // Effective target user id
  const targetUserId = targetMember?.user?.id || targetMember?.id;
  const fullName =
    targetMember?.user?.firstName && targetMember?.user?.lastName
      ? `${targetMember.user.firstName} ${targetMember.user.lastName}`
      : targetMember?.firstName && targetMember?.lastName
        ? `${targetMember.firstName} ${targetMember.lastName}`
        : 'کاربر';
  const roleName = targetMember?.user?.role || targetMember?.role || 'عضو';
  const username =
    targetMember?.user?.username ||
    targetMember?.username ||
    targetMember?.nationalId ||
    targetMember?.user?.phone ||
    targetMember?.phone ||
    '—';

  // Check if we have cached key in session
  useEffect(() => {
    if (isOpen) {
      setError(null);
      setResult(null);
      setCopied(false);
      const cached = vaultSession.getKey();
      if (cached) {
        setMasterKey(cached);
      }
    }
  }, [isOpen, targetMember]);

  if (!isOpen || !targetMember) return null;

  const handleReveal = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!masterKey.trim()) {
      setError('لطفاً کلید امنیتی مستر راهبر را وارد نمایید');
      return;
    }

    if (!targetUserId) {
      setError('شناسه کاربری معتبر یافت نشد');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await vaultApi.revealPassword({
        targetUserId,
        masterKey: masterKey.trim(),
        reason: reason.trim() || undefined,
      });

      setResult(res);

      if (rememberKey) {
        vaultSession.setKey(masterKey.trim());
      } else {
        vaultSession.clear();
      }

      toast.success('رمز عبور با موفقیت رمزگشایی شد');
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        'خطا در رمزگشایی کلمه عبور. لطفاً کلید امنیتی را بررسی نمایید.';
      setError(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    if (!result?.plaintextPassword) return;
    navigator.clipboard.writeText(result.plaintextPassword);
    setCopied(true);
    toast.success('رمز عبور در حافظه کپی شد');
    setTimeout(() => setCopied(false), 2500);
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'STUDENT':
        return 'دانش‌آموز';
      case 'PARENT':
        return 'ولی دانش‌آموز';
      case 'TEACHER':
        return 'مربی / هنرآموز';
      case 'STAFF':
        return 'کادر اجرایی / پرسنل';
      case 'COACH':
        return 'کوچ و مشاور';
      case 'SCHOOL_ADMIN':
        return 'راهبر مدرسه';
      default:
        return role;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white dark:bg-[#131926] rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/20">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white text-base">
                گاوصندوق رمز عبور
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                رمزگشایی امن کلمه عبور با کلید مستر راهبر
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Target Member Card */}
        <div className="p-5 space-y-4">
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800/80">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                {fullName.charAt(0) || <UserIcon className="w-4 h-4" />}
              </div>
              <div>
                <div className="font-bold text-gray-900 dark:text-white text-sm">
                  {fullName}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 font-mono mt-0.5">
                  نام کاربری: {username}
                </div>
              </div>
            </div>
            <span className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-primary/10 text-primary border border-primary/20">
              {getRoleLabel(roleName)}
            </span>
          </div>

          {/* Form when not yet revealed */}
          {!result && (
            <form onSubmit={handleReveal} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  کلید مستر امنیتی راهبر <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-gray-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showMasterKey ? 'text' : 'password'}
                    value={masterKey}
                    onChange={(e) => setMasterKey(e.target.value)}
                    placeholder="کلید امنیتی اختصاصی خود را وارد نمایید..."
                    className="w-full pr-9 pl-10 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-mono text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-hidden focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition-all"
                    required
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowMasterKey(!showMasterKey)}
                    className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                  >
                    {showMasterKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  دلیل استعلام (اختیاری جهت لاگ امنیتی)
                </label>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="مثال: فراموشی رمز توسط دانش‌آموز / تماس تلفنی"
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-xs text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="rememberVaultKey"
                  checked={rememberKey}
                  onChange={(e) => setRememberKey(e.target.checked)}
                  className="rounded border-gray-300 text-amber-600 focus:ring-amber-500 w-4 h-4 cursor-pointer"
                />
                <label
                  htmlFor="rememberVaultKey"
                  className="text-xs text-gray-600 dark:text-gray-400 cursor-pointer select-none"
                >
                  به‌خاطر سپردن موقت کلید در این نشست (تا ۱۵ دقیقه)
                </label>
              </div>

              {error && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 flex items-start gap-2 text-xs text-rose-600 dark:text-rose-400">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={isLoading || !masterKey.trim()}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm shadow-md hover:shadow-lg disabled:opacity-50 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>در حال رمزگشایی...</span>
                    </>
                  ) : (
                    <>
                      <KeyRound className="w-4 h-4" />
                      <span>رمزگشایی و مشاهده کلمه عبور</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="py-2.5 px-4 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-semibold text-sm hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  انصراف
                </button>
              </div>
            </form>
          )}

          {/* Result Card when decrypted */}
          {result && (
            <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
              <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 text-center space-y-2">
                <span className="text-xs font-semibold text-amber-700 dark:text-amber-300">
                  رمز عبور فعال کاربر در سامانه
                </span>

                <div className="flex items-center justify-center gap-2 pt-1">
                  <div className="px-4 py-2.5 rounded-xl bg-white dark:bg-gray-900 border border-amber-300 dark:border-amber-700 font-mono text-xl font-bold tracking-wider text-gray-900 dark:text-white select-all">
                    {showPlainPassword ? result.plaintextPassword : '••••••••••••'}
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowPlainPassword(!showPlainPassword)}
                    className="p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
                    title={showPlainPassword ? 'مخفی‌سازی' : 'نمایش'}
                  >
                    {showPlainPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>

                  <button
                    type="button"
                    onClick={handleCopy}
                    className="p-2.5 rounded-xl border border-amber-400 bg-amber-500 hover:bg-amber-600 text-white transition-all shadow-xs flex items-center justify-center cursor-pointer"
                    title="کپی در کلیپ‌بورد"
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Audit notice */}
              <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/30 border border-gray-100 dark:border-gray-800 flex items-start gap-2.5 text-2xs text-gray-500 dark:text-gray-400">
                <ShieldAlert className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>
                  این اقدام همراه با آدرس IP و شناسه حساب کاربری شما در زنجیره بازرسی امنیتی (Audit Log)
                  ثبت گردید.
                </span>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleCopy}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-primary hover:bg-primary-hover text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{copied ? 'کپی شد' : 'کپی رمز عبور'}</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="py-2.5 px-4 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-semibold text-sm hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  بستن
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
