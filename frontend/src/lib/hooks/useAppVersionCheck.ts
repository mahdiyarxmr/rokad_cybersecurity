import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';

interface VersionJsonResponse {
  version: string;
  buildId: string;
}

declare const __BUILD_ID__: string;

export const CURRENT_APP_VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '1.1.0';
export const CURRENT_BUILD_TIME = typeof __BUILD_TIME__ !== 'undefined' ? __BUILD_TIME__ : '';
export const CURRENT_BUILD_ID = typeof __BUILD_ID__ !== 'undefined' ? __BUILD_ID__ : CURRENT_BUILD_TIME;

const CHECK_INTERVAL_MS = 3 * 60 * 1000; // هر ۳ دقیقه یک‌بار
const MIN_FOCUS_CHECK_GAP_MS = 30 * 1000; // حداقل ۳۰ ثانیه فاصله بین چک‌های فوکوس تب

export function useAppVersionCheck() {
  const [hasUpdate, setHasUpdate] = useState<boolean>(false);
  const [serverVersion, setServerVersion] = useState<string | null>(null);
  const [serverBuildTime, setServerBuildTime] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const lastCheckTimeRef = useRef<number>(0);

  const checkForUpdate = useCallback(async () => {
    // In dev mode, disable version checking to prevent false update prompts
    if (import.meta.env.DEV) {
      setHasUpdate(false);
      return;
    }

    try {
      setIsChecking(true);
      lastCheckTimeRef.current = Date.now();

      // واکشی مستقیم نسخه استاتیک با جلوگیری کامل از کش
      const res = await axios.get<VersionJsonResponse>(`/version.json?t=${Date.now()}`, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
        },
        timeout: 8000,
      });

      if (res.data && res.data.buildId) {
        const remoteBuildId = res.data.buildId.trim();
        const remoteVersion = res.data.version ? res.data.version.trim() : CURRENT_APP_VERSION;
        setServerVersion(remoteVersion);
        setServerBuildTime(remoteBuildId);

        // ملاک آپدیت فرانت، تفاوت buildId یونیک زمان بیلد است
        if (remoteBuildId && remoteBuildId !== CURRENT_BUILD_ID) {
          console.info(
            `[Version Check] New build detected: ${remoteBuildId} (Current: ${CURRENT_BUILD_ID})`,
          );
          setHasUpdate(true);
        } else {
          setHasUpdate(false);
        }
      }
    } catch (err) {
      console.warn('[Version Check] Failed to query version.json:', err);
    } finally {
      setIsChecking(false);
    }
  }, []);

  // ۱. بررسی هنگام بارگذاری اولیه و پولینگ منظم هر ۵ دقیقه
  useEffect(() => {
    checkForUpdate();

    const intervalId = setInterval(() => {
      checkForUpdate();
    }, CHECK_INTERVAL_MS);

    return () => clearInterval(intervalId);
  }, [checkForUpdate]);

  // ۲. بررسی هنگام فوکوس روی تب مرورگر یا فعال شدن مجدد پنجره (Tab Visibility / Focus)
  useEffect(() => {
    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        const now = Date.now();
        if (now - lastCheckTimeRef.current > MIN_FOCUS_CHECK_GAP_MS) {
          checkForUpdate();
        }
      }
    };

    window.addEventListener('focus', handleVisibilityOrFocus);
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);

    return () => {
      window.removeEventListener('focus', handleVisibilityOrFocus);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
    };
  }, [checkForUpdate]);

  // ۳. متد فورس‌آپدیت: به‌روزرسانی Service Worker و ریفرش اجباری برنامه
  const updateApp = useCallback(async () => {
    try {
      // غیرفعال‌سازی سرویس‌ورکرهای قبلی برای پاکسازی کامل کدهای قدیمی
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const registration of registrations) {
          if (registration.waiting) {
            registration.waiting.postMessage({ type: 'SKIP_WAITING' });
          }
          await registration.unregister();
        }
      }

      // پاکسازی کامل کش‌های مرورگر
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map((name) => caches.delete(name)));
      }
    } catch (e) {
      console.error('[Version Check] Error during cache cleanup:', e);
    } finally {
      // رفرش با باطل کردن کش
      const url = new URL(window.location.href);
      url.searchParams.set('_v', Date.now().toString());
      window.location.href = url.toString();
    }
  }, []);

  return {
    hasUpdate,
    serverVersion,
    serverBuildTime,
    currentVersion: CURRENT_APP_VERSION,
    currentBuildTime: CURRENT_BUILD_TIME,
    isChecking,
    checkForUpdate,
    updateApp,
  };
}
