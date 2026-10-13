import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../lib/auth/auth-store';
import { useTenantStore } from '../../lib/auth/tenant-store';
import { apiClient } from '../../lib/api/client';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { toast } from '../../components/ui/toast/toast';
import {
  User,
  Sun,
  Moon,
  LogOut,
  ChevronRight,
  Sparkles,
  Camera,
  Loader2,
  School,
} from 'lucide-react';
import { SecuritySection } from './components/SecuritySection';
import { toPersianDigits, cleanUserFullName } from '../../lib/utils';
import { useCuriosityStore } from '../../lib/ui/curiosity-store';

export const ProfileSettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const recordCuriosityClick = useCuriosityStore((s) => s.recordClick);
  const { user, logout } = useAuthStore();
  const { currentTenant } = useTenantStore();

  // Sync fresh profile from database on mount to display avatar
  useEffect(() => {
    apiClient
      .get('/auth/me')
      .then((res: any) => {
        const freshUser = res?.data?.user || res?.user;
        if (freshUser) {
          const currentUser = useAuthStore.getState().user;
          const isGeneric =
            (freshUser.firstName === 'کاربر' && (freshUser.lastName === 'سیستم' || !freshUser.lastName)) ||
            (!freshUser.firstName && !freshUser.lastName);
          const hasExistingRealName =
            currentUser?.firstName &&
            currentUser.firstName !== 'کاربر' &&
            currentUser.firstName !== 'کاربر سیستم';

          useAuthStore.getState().setUser({
            ...currentUser,
            ...freshUser,
            ...(isGeneric && hasExistingRealName
              ? {
                  firstName: currentUser.firstName,
                  lastName: currentUser.lastName,
                }
              : {}),
          });
        }
      })
      .catch((err) => {
        console.warn('Failed to sync profile on mount:', err);
      });
  }, []);

  // Dark mode state
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof document !== 'undefined') {
      return document.documentElement.classList.contains('dark');
    }
    return false;
  });

  const setTheme = (mode: 'light' | 'dark') => {
    const nextDark = mode === 'dark';
    setIsDark(nextDark);
    if (nextDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('rokad-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('rokad-theme', 'light');
    }
  };

  // Avatar Upload State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('لطفاً یک فایل تصویری معتبر انتخاب فرمایید');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('حجم تصویر نمایه نباید بیشتر از ۵ مگابایت باشد');
      return;
    }

    try {
      setIsUploadingAvatar(true);

      const formData = new FormData();
      formData.append('file', file);
      formData.append('moduleName', 'avatars');

      let finalAvatarUrl = '';
      try {
        const res: any = await apiClient.post('/storage/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        const uploadData = res?.data?.data || res?.data;
        finalAvatarUrl = uploadData?.fileUrl || uploadData?.url || '';
      } catch (uploadErr) {
        console.warn('Storage upload error, attempting fallback:', uploadErr);
      }

      if (!finalAvatarUrl) {
        // Fallback: read as base64 data URL
        finalAvatarUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      }

      // Persist avatar to PostgreSQL database
      const profileRes: any = await apiClient.patch('/auth/profile', { avatarUrl: finalAvatarUrl });
      const updatedUser = profileRes?.data?.data || profileRes?.data;

      if (user) {
        useAuthStore.getState().setUser({
          ...user,
          avatarUrl: updatedUser?.avatarUrl || finalAvatarUrl,
        });
      }

      toast.success('تصویر نمایه با موفقیت به‌روزرسانی شد');
    } catch (err) {
      console.error('Failed to upload avatar:', err);
      toast.error('خطا در بارگذاری تصویر نمایه');
    } finally {
      setIsUploadingAvatar(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const getRoleLabel = (role?: string) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return 'سوپرادمین';
      case 'SCHOOL_ADMIN':
        return 'راهبر';
      case 'TEACHER':
        return 'مربی';
      case 'STUDENT':
        return 'دانش‌آموز';
      case 'PARENT':
        return 'ولی دانش‌آموز';
      case 'STAFF':
        return 'کادر اجرایی';
      default:
        return 'کاربر';
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-4 sm:space-y-5 pb-12 animate-in fade-in duration-300">
      {/* Top Bar with Back Button */}
      <div className="flex items-center justify-between pb-1">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label="بازگشت"
            className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl bg-white dark:bg-[#151C28] border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-300 hover:text-primary transition-all active:scale-95 shadow-2xs flex items-center justify-center cursor-pointer"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
          <div>
            <h1 className="font-black text-lg sm:text-xl text-ink-darker dark:text-white">
              پروفایل و تنظیمات
            </h1>
          </div>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={logout}
          className="text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-xs font-bold gap-1.5"
        >
          <LogOut className="w-4 h-4" />
          <span>خروج از حساب</span>
        </Button>
      </div>

      {/* User Identity Hero Card - Enhanced Premium Design */}
      <div className="relative overflow-hidden rounded-2xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-[#151C28] p-4 sm:p-5 shadow-xs">
        {/* Subtle Ambient Decorative Glow */}
        <div className="absolute -top-16 -left-16 w-40 h-40 bg-gradient-to-br from-primary/15 to-teal-400/10 dark:from-primary/20 dark:to-transparent rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-16 -right-16 w-40 h-40 bg-gradient-to-tl from-indigo-500/10 to-transparent rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex items-center gap-4 sm:gap-5">
          {/* Avatar with Gradient Ring & Interactive Camera Overlay */}
          <div className="relative shrink-0 group">
            <input
              type="file"
              ref={fileInputRef}
              accept="image/png, image/jpeg, image/webp"
              className="hidden"
              onChange={handleAvatarUpload}
            />
            <div className="relative p-1 rounded-[24px] bg-gradient-to-tr from-primary/60 via-teal-400/50 to-indigo-500/50 shadow-sm">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingAvatar}
                className="relative w-24 h-24 sm:w-28 sm:h-28 aspect-square shrink-0 rounded-[20px] overflow-hidden focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-all block cursor-pointer group bg-white dark:bg-[#151C28]"
                title="تغییر عکس نمایه"
                aria-label="تغییر عکس نمایه"
              >
                {user?.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={user.firstName}
                    className="w-full h-full object-cover object-center aspect-square block group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-primary to-primary-darker text-white flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
                    <User className="w-12 h-12 sm:w-14 sm:h-14 text-white/90" />
                  </div>
                )}

                {/* Hover Camera Overlay */}
                <div className="absolute inset-0 bg-black/45 backdrop-blur-[1px] opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white gap-1 pointer-events-none">
                  <Camera className="w-6 h-6 drop-shadow" />
                  <span className="text-[10px] font-bold">تغییر عکس</span>
                </div>

                {/* Uploading Overlay */}
                {isUploadingAvatar && (
                  <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex flex-col items-center justify-center text-white gap-1.5 z-20 pointer-events-none">
                    <Loader2 className="w-6 h-6 animate-spin text-teal-300" />
                    <span className="text-[10px] font-bold">در حال بارگذاری...</span>
                  </div>
                )}
              </button>
            </div>

            {/* Quick Upload Action Button Badge */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploadingAvatar}
              className="absolute -bottom-1 -right-1 p-2 bg-primary hover:bg-primary-darker text-white rounded-xl shadow-md ring-2 ring-white dark:ring-[#151C28] transition-all active:scale-90 cursor-pointer flex items-center justify-center"
              title="بارگذاری تصویر جدید"
              aria-label="بارگذاری تصویر جدید"
            >
              {isUploadingAvatar ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Camera className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* User Info */}
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg sm:text-xl font-black text-ink-darker dark:text-white tracking-tight">
                {user ? (cleanUserFullName(user.firstName, user.lastName, user.username || user.phone) || user.username || user.phone || 'کاربر') : 'کاربر مهمان'}
              </h2>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-[11px] font-extrabold bg-primary/10 text-primary dark:bg-primary/20 dark:text-teal-300 border border-primary/20">
                {getRoleLabel(user?.role)}
              </span>
            </div>

            {/* School Title with Icon & Gray Text */}
            <div className="flex items-center gap-1.5 text-xs sm:text-sm text-gray-500 dark:text-gray-400 font-medium">
              <School className="w-4 h-4 text-gray-400 dark:text-gray-500 shrink-0" />
              <span className="truncate">
                {currentTenant?.name || (currentTenant?.slug === 'rokad-girls' ? 'هنرستان دخترانه رکاد' : 'هنرستان پسرانه رکاد')}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Theme Selection Section - Compact & Modern */}
      <Card className="border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-[#151C28] p-3.5 sm:p-4 rounded-2xl shadow-2xs">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500 dark:bg-amber-400/10 dark:text-amber-400 shrink-0">
              {isDark ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-ink-darker dark:text-white">حالت نمایش</h3>
            </div>
          </div>

          {/* Compact Segmented Control (No English in parentheses) */}
          <div className="flex items-center bg-gray-100 dark:bg-[#1C2536]/90 p-1 rounded-xl border border-gray-200/60 dark:border-gray-700/60 shrink-0">
            <button
              type="button"
              onClick={() => setTheme('light')}
              className={`min-h-[36px] px-3 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                !isDark
                  ? 'bg-white dark:bg-[#242F42] text-amber-600 dark:text-amber-400 shadow-xs font-black'
                  : 'text-gray-500 dark:text-gray-400 hover:text-ink-darker dark:hover:text-white'
              }`}
            >
              <Sun className="w-3.5 h-3.5" />
              <span>روشن</span>
            </button>
            <button
              type="button"
              onClick={() => setTheme('dark')}
              className={`min-h-[36px] px-3 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                isDark
                  ? 'bg-[#151C28] text-teal-400 shadow-xs font-black border border-gray-700/50'
                  : 'text-gray-500 dark:text-gray-400 hover:text-ink-darker dark:hover:text-white'
              }`}
            >
              <Moon className="w-3.5 h-3.5" />
              <span>تاریک</span>
            </button>
          </div>
        </div>
      </Card>

      {/* Security Suite: 2FA, Active Sessions, and Password Management */}
      <SecuritySection />

      {/* App Version & Build Footer */}
      <div className="pt-6 pb-2 text-center select-none">
        <button
          type="button"
          onClick={recordCuriosityClick}
          title="پاداش نسخه ۱.۰.۰"
          className="text-[11.5px] text-gray-400/80 dark:text-gray-500 font-medium tracking-wide hover:text-amber-500 dark:hover:text-amber-400 transition-colors cursor-pointer active:scale-95 inline-block"
        >
          سامانه هوشمند مدارس رُکاد • نسخه {toPersianDigits(typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '1.0.0')}
        </button>
      </div>
    </div>
  );
};
