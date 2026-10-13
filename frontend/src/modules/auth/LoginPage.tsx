import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../lib/auth/auth-store';
import { useTenantStore } from '../../lib/auth/tenant-store';
import { apiClient } from '../../lib/api/client';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import {
  AlertCircle,
  User,
  Lock,
  Eye,
  EyeOff,
  GraduationCap,
  BookOpen,
  Users,
  CalendarDays,
  BarChart3,
  MessageSquare,
} from 'lucide-react';
import { TwoFactorVerificationModal } from './components/TwoFactorVerificationModal';
import { toEnglishDigits } from '../../lib/utils';
import { getDashboardPath } from '../../app/routes/DashboardRedirect';

/* ------------------------------------------------------------------ */
/*  Orbit illustration (Showcase decorative panel)                    */
/* ------------------------------------------------------------------ */

type OrbitItem = { icon: React.ElementType; angle: number; tone: string };

const ORBITS: { size: number; duration: number; reverse?: boolean; items: OrbitItem[] }[] = [
  {
    size: 190,
    duration: 40,
    items: [
      { icon: BookOpen, angle: 40, tone: 'text-primary' },
      { icon: BarChart3, angle: 220, tone: 'text-emerald-500' },
    ],
  },
  {
    size: 280,
    duration: 60,
    reverse: true,
    items: [
      { icon: MessageSquare, angle: 80, tone: 'text-sky-500' },
      { icon: CalendarDays, angle: 260, tone: 'text-amber-500' },
    ],
  },
  {
    size: 370,
    duration: 90,
    items: [
      { icon: Users, angle: 150, tone: 'text-purple-500' },
      { icon: GraduationCap, angle: 330, tone: 'text-rose-500' },
    ],
  },
];

const OrbitIllustration: React.FC = () => (
  <div className="relative mx-auto aspect-square w-full max-w-[320px] xl:max-w-[370px]" aria-hidden="true">
    <style>{`
      @keyframes rk-orbit { to { transform: rotate(360deg); } }
      @keyframes rk-orbit-rev { to { transform: rotate(-360deg); } }
      @media (prefers-reduced-motion: reduce) {
        .rk-orbit, .rk-orbit-item { animation: none !important; }
      }
    `}</style>

    {/* Soft brand glow */}
    <div className="absolute inset-[-10%] rounded-full bg-primary/20 dark:bg-primary/10 blur-3xl pointer-events-none" />

    {ORBITS.map(({ size, duration, reverse, items }) => {
      const pct = (size / 370) * 100;
      return (
        <div
          key={size}
          className="rk-orbit absolute left-1/2 top-1/2 rounded-full border border-white/70 dark:border-white/10"
          style={{
            width: `${pct}%`,
            height: `${pct}%`,
            marginLeft: `-${pct / 2}%`,
            marginTop: `-${pct / 2}%`,
            animation: `${reverse ? 'rk-orbit-rev' : 'rk-orbit'} ${duration}s linear infinite`,
          }}
        >
          {items.map(({ icon: Icon, angle, tone }, i) => {
            const rad = (angle * Math.PI) / 180;
            const x = 50 + 50 * Math.cos(rad);
            const y = 50 + 50 * Math.sin(rad);
            return (
              <div
                key={i}
                className="absolute -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${x}%`, top: `${y}%` }}
              >
                {/* Counter-rotate so icons stay upright */}
                <div
                  className="rk-orbit-item flex h-10 w-10 items-center justify-center rounded-full bg-white dark:bg-zinc-800 shadow-md ring-1 ring-black/5 dark:ring-white/10"
                  style={{
                    animation: `${reverse ? 'rk-orbit' : 'rk-orbit-rev'} ${duration}s linear infinite`,
                  }}
                >
                  <Icon className={`h-4.5 w-4.5 ${tone}`} />
                </div>
              </div>
            );
          })}
        </div>
      );
    })}

    {/* Center logo badge */}
    <div className="absolute left-1/2 top-1/2 flex h-24 w-24 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/70 dark:bg-zinc-800/80 shadow-lg ring-4 ring-white dark:ring-zinc-700 backdrop-blur-sm">
      <img
        src="/logo.svg"
        alt="لوگوی رُکاد"
        className="h-14 w-14 rounded-full object-contain"
      />
    </div>
  </div>
);

/* ------------------------------------------------------------------ */
/*  Login page                                                        */
/* ------------------------------------------------------------------ */

const FALLBACK_TENANT_ID = 'd51697c7-85cd-423f-a526-b567590638f1';
const FALLBACK_TENANT_SLUG = 'rokad-boys';

type FieldErrors = { identifier?: string; password?: string };

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);
  const { currentTenant, setCurrentTenant } = useTenantStore();

  const formRef = useRef<HTMLFormElement>(null);

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [capsLockOn, setCapsLockOn] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  // 2FA state
  const [is2FAModalOpen, setIs2FAModalOpen] = useState(false);
  const [tempToken, setTempToken] = useState('');

  const focusField = (name: 'identifier' | 'password') => {
    (formRef.current?.elements.namedItem(name) as HTMLInputElement | null)?.focus();
  };

  useEffect(() => {
    document.title = 'ورود | رُکاد';
    if (window.matchMedia?.('(pointer: fine)').matches) focusField('identifier');
  }, []);

  /** Shared by the normal and 2FA flows: set tenant, store session, redirect. */
  const persistSession = (loginData: any) => {
    const { user, accessToken, refreshToken } = loginData || {};
    const tenant = loginData?.tenant || user?.tenant;
    const effectiveTenantId =
      user?.tenantId || tenant?.id || currentTenant?.id || FALLBACK_TENANT_ID;
    const effectiveSlug = tenant?.slug || currentTenant?.slug || FALLBACK_TENANT_SLUG;

    setCurrentTenant({
      id: effectiveTenantId,
      name: tenant?.name || 'مدرسه رُکاد',
      slug: effectiveSlug,
      type: 'SCHOOL',
      theme: (tenant?.theme || 'ecosystem').toLowerCase() as any,
    });

    login({ ...user, tenantId: effectiveTenantId }, accessToken, refreshToken);
    navigate(getDashboardPath(user?.role), { replace: true });
  };

  const handle2FASuccess = (res: any) => {
    const loginData = res?.data || res;
    if (!loginData?.user) {
      setIs2FAModalOpen(false);
      setError(loginData?.message || 'ورود دو مرحله‌ای کامل نشد. لطفاً دوباره وارد شوید.');
      return;
    }
    setIs2FAModalOpen(false);
    persistSession(loginData);
  };

  const applyLoginSuccess = (res: any) => {
    const loginData = res?.data || res;
    if (!loginData?.user || !loginData?.accessToken) {
      throw new Error(loginData?.message || 'پاسخ نامعتبر از سرویس ورود');
    }
    persistSession(loginData);
  };

  const validate = (cleanId: string, cleanPass: string): FieldErrors => {
    const errs: FieldErrors = {};
    if (!cleanId) errs.identifier = 'نام کاربری را وارد کنید.';
    if (!cleanPass) errs.password = 'رمز عبور را وارد کنید.';
    return errs;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    const cleanId = toEnglishDigits(identifier).trim();
    const cleanPass = toEnglishDigits(password).trim();

    const errs = validate(cleanId, cleanPass);
    if (errs.identifier || errs.password) {
      setFieldErrors(errs);
      setError(null);
      focusField(errs.identifier ? 'identifier' : 'password');
      return;
    }

    if (!navigator.onLine) {
      setError('به اینترنت متصل نیستید. اتصال شبکه را بررسی کرده و دوباره تلاش کنید.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setFieldErrors({});

    try {
      const res: any = await apiClient.post('/auth/login', {
        identifier: cleanId,
        password: cleanPass,
      });

      const responsePayload = res?.data || res;

      // Check if 2FA verification is required
      if (responsePayload?.requiresTwoFactor || res?.requiresTwoFactor) {
        const token = responsePayload?.tempToken || res?.tempToken;
        setTempToken(token);
        setIs2FAModalOpen(true);
        return;
      }

      applyLoginSuccess(res);
    } catch (err: any) {
      const status = err?.response?.status ?? err?.statusCode;
      const hasResponse = Boolean(err?.response || (status && status !== 0));

      if (!hasResponse) {
        setError('اتصال به سرور برقرار نشد. اینترنت را بررسی کرده و دوباره تلاش کنید.');
      } else if (status === 401) {
        setError('نام کاربری یا رمز عبور اشتباه است.');
        setPassword('');
        focusField('password');
      } else if (status === 429) {
        setError('تعداد تلاش‌ها بیش از حد مجاز بود. لطفاً چند دقیقه دیگر امتحان کنید.');
      } else if (status === 404) {
        setError('حساب کاربری یافت نشد. لطفاً نام کاربری را بررسی کنید.');
      } else {
        setError(
          err?.response?.data?.message || err?.message || 'ورود انجام نشد. لطفاً دوباره تلاش کنید.',
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  const onIdentifierChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIdentifier(e.target.value);
    if (fieldErrors.identifier) setFieldErrors((p) => ({ ...p, identifier: undefined }));
    if (error) setError(null);
  };

  const onPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
    if (fieldErrors.password) setFieldErrors((p) => ({ ...p, password: undefined }));
    if (error) setError(null);
  };

  const trackCapsLock = (e: React.KeyboardEvent<HTMLInputElement>) => {
    setCapsLockOn(e.getModifierState?.('CapsLock') ?? false);
  };

  return (
    <div className="min-h-screen min-h-dvh w-full flex items-center justify-center p-3 sm:p-6 lg:p-8 bg-[#F8FAFC] dark:bg-[#0B0F17]">
      <div className="w-full max-w-5xl overflow-hidden rounded-2xl sm:rounded-3xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-[#151C28] shadow-xl grid grid-cols-1 lg:grid-cols-2">
        {/* ------------------------- Form Side ------------------------- */}
        <main className="relative flex flex-col justify-between p-6 sm:p-10 lg:p-12" dir="rtl">
          {/* Top Brand Logo */}
          <div className="flex items-center gap-2.5">
            <img src="/logo.svg" alt="پلتفرم رُکاد" className="h-8 w-8 shrink-0 rounded-xl object-contain" />
            <span className="text-sm font-bold text-ink-normal dark:text-white">پلتفرم مدارس رُکاد</span>
          </div>

          {/* Form Content */}
          <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-8">
            <div className="mb-6 text-center">
              <h1 className="text-xl font-bold text-ink-normal dark:text-white sm:text-2xl">
                ورود به حساب کاربری
              </h1>
              <p className="mt-1.5 text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
                نام کاربری و رمز عبور خود را وارد کنید.
              </p>
            </div>

            {/* Server / network error banner */}
            {error && (
              <div
                role="alert"
                className="mb-4 flex items-start gap-2.5 rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 p-3 text-xs sm:text-sm text-red-700 dark:text-red-300"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600 dark:text-red-400" aria-hidden="true" />
                <span className="leading-relaxed">{error}</span>
              </div>
            )}

            <form ref={formRef} onSubmit={handleSubmit} noValidate className="space-y-4">
              {/* Username Input */}
              <Input
                id="login-identifier"
                name="identifier"
                label="نام کاربری"
                placeholder="کد ملی یا شماره همراه"
                value={identifier}
                onChange={onIdentifierChange}
                icon={User}
                error={fieldErrors.identifier}
                autoComplete="username"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                enterKeyHint="next"
                dir="ltr"
                className="text-left font-mono tracking-wide placeholder:font-sans placeholder:tracking-normal placeholder:text-right"
              />

              {/* Password Input with Embedded Eye Action */}
              <div>
                <Input
                  id="login-password"
                  name="password"
                  label="رمز عبور"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="رمز عبور حساب"
                  value={password}
                  onChange={onPasswordChange}
                  onKeyDown={trackCapsLock}
                  onKeyUp={trackCapsLock}
                  onBlur={() => setCapsLockOn(false)}
                  icon={Lock}
                  error={fieldErrors.password}
                  autoComplete="current-password"
                  enterKeyHint="go"
                  dir="ltr"
                  className="text-left font-mono placeholder:font-sans placeholder:text-right"
                  endAction={
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? 'پنهان کردن رمز عبور' : 'نمایش رمز عبور'}
                      tabIndex={-1}
                      className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  }
                />
                {capsLockOn && (
                  <p role="status" className="mt-1 text-xs text-amber-600 dark:text-amber-400 font-medium">
                    ⚠️ کلید Caps Lock روشن است.
                  </p>
                )}
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                variant="primary"
                className="mt-2 h-11 w-full text-sm sm:text-base font-bold shadow-xs hover:shadow-md transition-all"
                isLoading={isLoading}
                aria-busy={isLoading}
              >
                {isLoading ? 'در حال ورود…' : 'ورود به حساب'}
              </Button>
            </form>
          </div>

        </main>

        {/* ------------------------ Showcase Side ----------------------- */}
        <aside
          aria-hidden="true"
          className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-b from-primary-light via-emerald-50/40 to-teal-50 dark:from-[#1C2536] dark:to-[#151C28] p-8 lg:flex select-none"
          dir="rtl"
        >
          <OrbitIllustration />
        </aside>
      </div>

      {/* 2FA Verification Modal */}
      <TwoFactorVerificationModal
        isOpen={is2FAModalOpen}
        tempToken={tempToken}
        onSuccess={handle2FASuccess}
        onClose={() => setIs2FAModalOpen(false)}
      />
    </div>
  );
};