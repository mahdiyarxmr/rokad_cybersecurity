import React, { useState } from 'react';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { apiClient } from '../../../lib/api/client';
import { ShieldCheck, KeyRound, AlertCircle, ArrowRight } from 'lucide-react';
import { toast } from '../../../components/ui/toast/toast';

interface TwoFactorVerificationModalProps {
  isOpen: boolean;
  tempToken: string;
  onSuccess: (data: any) => void;
  onClose: () => void;
}

export const TwoFactorVerificationModal: React.FC<TwoFactorVerificationModalProps> = ({
  isOpen,
  tempToken,
  onSuccess,
  onClose,
}) => {
  const [code, setCode] = useState('');
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const res: any = await apiClient.post('/auth/2fa/verify-login', {
        tempToken,
        code: code.trim(),
      });

      toast.success('ورود دومرحله‌ای با موفقیت انجام شد');
      onSuccess(res);
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'کد وارد شده نامعتبر است';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleCodeChange = (val: string) => {
    setCode(val);
    setError(null);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="تأیید هویت دو مرحله‌ای (2FA)"
      maxWidth="md"
    >
      <div className="space-y-5 text-right">
        {/* Header Graphic */}
        <div className="flex flex-col items-center justify-center p-4 bg-primary/5 dark:bg-primary/10 rounded-2xl border border-primary/20 text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 dark:bg-primary/20 flex items-center justify-center text-primary">
            {isRecoveryMode ? <KeyRound className="w-6 h-6" /> : <ShieldCheck className="w-6 h-6" />}
          </div>
          <h4 className="font-black text-sm text-ink-dark dark:text-white">
            {isRecoveryMode ? 'ورود با کد بازیابی اضطراری' : 'کد ۶ رقمی نرم‌افزار احراز هویت'}
          </h4>
          <p className="text-xs text-ink-light dark:text-gray-300 max-w-xs leading-relaxed">
            {isRecoveryMode
              ? 'یکی از کدهای بازیابی ۸ رقمی ذخیره‌شده خود را وارد نمایید (این کد پس از استفاده می‌سوزد).'
              : 'کد ۶ رقمی زمان‌دار نمایش داده شده در نرم‌افزار Authenticator خود را وارد فرمایید.'}
          </p>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-rose-950/40 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-700 dark:text-red-300">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-ink-dark dark:text-gray-200 mb-1.5">
              {isRecoveryMode ? 'کد بازیابی (مانند: 4B2A-9X1Z)' : 'کد تأیید ۶ رقمی'}
            </label>
            <Input
              value={code}
              onChange={(e) => handleCodeChange(e.target.value)}
              placeholder={isRecoveryMode ? 'XXXX-XXXX' : '••••••'}
              maxLength={isRecoveryMode ? 15 : 6}
              autoFocus
              className="text-center font-mono tracking-widest text-lg font-black h-12 dir-ltr"
              required
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={() => {
                setIsRecoveryMode(!isRecoveryMode);
                setCode('');
                setError(null);
              }}
              className="text-xs font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer"
            >
              {isRecoveryMode ? (
                <>
                  <ArrowRight className="w-3.5 h-3.5" />
                  <span>ورود با اپلیکیشن Authenticator</span>
                </>
              ) : (
                <>
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>استفاده از کد بازیابی اضطراری</span>
                </>
              )}
            </button>
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              type="submit"
              variant="primary"
              className="flex-1 font-bold h-11"
              isLoading={loading}
            >
              تأیید و ورود به سیستم
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="font-bold h-11 px-5"
            >
              انصراف
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
};
