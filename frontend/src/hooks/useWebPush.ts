import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../lib/api/client';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const buffer = new ArrayBuffer(rawData.length);
  const outputArray = new Uint8Array(buffer);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

async function getOrRegisterServiceWorker(): Promise<ServiceWorkerRegistration> {
  if (!('serviceWorker' in navigator)) {
    throw new Error('مرورگر شما از سرویس‌ورکر پشتیبانی نمی‌کند.');
  }

  let registration = await navigator.serviceWorker.getRegistration();

  if (!registration) {
    try {
      // In dev or standalone, /push-worker.js is always available in public folder
      const swUrl = import.meta.env.PROD ? '/sw.js' : '/push-worker.js';
      registration = await navigator.serviceWorker.register(swUrl, { scope: '/' });
    } catch (err) {
      console.warn('Initial SW registration failed, falling back to /push-worker.js:', err);
      try {
        registration = await navigator.serviceWorker.register('/push-worker.js', { scope: '/' });
      } catch (fallbackErr) {
        console.error('Push worker fallback registration failed:', fallbackErr);
      }
    }
  }

  // Wait for ready with a timeout safeguard so the UI never hangs indefinitely
  try {
    const readyPromise = navigator.serviceWorker.ready;
    const timeoutPromise = new Promise<ServiceWorkerRegistration>((_, reject) =>
      setTimeout(() => reject(new Error('تایم‌اوت سرویس‌ورکر')), 5000)
    );
    return await Promise.race([readyPromise, timeoutPromise]);
  } catch {
    if (registration) return registration;
    return await navigator.serviceWorker.ready;
  }
}

export interface WebPushState {
  isSupported: boolean;
  isIOS: boolean;
  isStandalone: boolean;
  needsIOSInstall: boolean;
  isSubscribed: boolean;
  permission: NotificationPermission;
  isLoading: boolean;
  error: string | null;
  subscribe: () => Promise<boolean>;
  unsubscribe: () => Promise<boolean>;
  sendTestNotification: () => Promise<{ ok: boolean; message: string }>;
}

export function useWebPush(): WebPushState {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Platform detection
  const isIOS =
    typeof navigator !== 'undefined' &&
    (/iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));

  const isStandalone =
    typeof window !== 'undefined' &&
    (window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as any).standalone === true);

  const isSupported =
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window;

  // In iOS, Web Push is only supported if installed to Home Screen (iOS 16.4+)
  const needsIOSInstall = isIOS && !isStandalone;

  // Check current permission and active subscription
  const checkStatus = useCallback(async () => {
    if (!isSupported) return;

    try {
      setPermission(Notification.permission);

      if (Notification.permission === 'granted') {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration) {
          const sub = await registration.pushManager.getSubscription();
          setIsSubscribed(!!sub);
        } else {
          setIsSubscribed(false);
        }
      } else {
        setIsSubscribed(false);
      }
    } catch (err: any) {
      console.warn('Failed to check push status:', err);
    }
  }, [isSupported]);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  const subscribe = async (): Promise<boolean> => {
    if (!isSupported) {
      setError('دستگاه یا مرورگر شما از سیستم وب‌پوش پشتیبانی نمی‌کند.');
      return false;
    }

    if (needsIOSInstall) {
      setError('برای دریافت نوتیفیکیشن در آیفون، ابتدا باید برنامه را به صفحه اصلی (Add to Home Screen) اضافه کنید.');
      return false;
    }

    try {
      setIsLoading(true);
      setError(null);

      // 1. Request permission (must be user gesture initiated)
      const perm = await Notification.requestPermission();
      setPermission(perm);

      if (perm !== 'granted') {
        setError(perm === 'denied' ? 'دسترسی اعلان‌ها توسط شما مسدود شده است.' : 'مجوز اعلان صادر نشد.');
        return false;
      }

      // 2. Fetch VAPID public key from backend
      const keyRes = await apiClient.get<any>('/notifications/push/public-key');
      const publicKey = keyRes.data?.data?.publicKey || keyRes.data?.publicKey;

      if (!publicKey) {
        throw new Error('کلید عمومی اعلان‌ها از سرور دریافت نشد.');
      }

      // 3. Get or register Service Worker
      const registration = await getOrRegisterServiceWorker();
      let subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey) as unknown as BufferSource,
        });
      }

      // 4. Send subscription to backend (explicitly send endpoint & keys to support Safari WebKit)
      const subJson = subscription.toJSON();
      const payload = {
        endpoint: subscription.endpoint || subJson.endpoint,
        keys: {
          p256dh: subJson.keys?.p256dh || '',
          auth: subJson.keys?.auth || '',
        },
      };

      await apiClient.post('/notifications/push/subscribe', payload);

      setIsSubscribed(true);
      return true;
    } catch (err: any) {
      console.error('Push subscription failed:', err);
      const errMsg = err?.response?.data?.message || err?.message || 'خطا در فعال‌سازی نوتیفیکیشن';
      setError(errMsg);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const unsubscribe = async (): Promise<boolean> => {
    if (!isSupported) return false;

    try {
      setIsLoading(true);
      setError(null);

      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
          // Unregister from backend
          await apiClient.post('/notifications/push/unsubscribe', {
            endpoint: subscription.endpoint,
          }).catch(() => {});

          // Unsubscribe from browser
          await subscription.unsubscribe();
        }
      }

      setIsSubscribed(false);
      return true;
    } catch (err: any) {
      console.error('Push unsubscribe failed:', err);
      setError('خطا در غیرفعال‌سازی نوتیفیکیشن');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const sendTestNotification = async (): Promise<{ ok: boolean; message: string }> => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await apiClient.post<any>('/notifications/push/test');
      const data = res.data;
      if (data?.sent > 0) {
        return { ok: true, message: data.message || 'اعلان تستی با موفقیت به دستگاه ارسال شد! 🎉' };
      } else {
        const msg = data?.message || 'ارسال اعلان با خطا مواجه شد.';
        setError(msg);
        return { ok: false, message: msg };
      }
    } catch (err: any) {
      console.error('Failed to send test push:', err);
      const errMsg = err?.response?.data?.message || err?.message || 'ارسال نوتیفیکیشن آزمایشی با خطا مواجه شد.';
      setError(errMsg);
      return { ok: false, message: errMsg };
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isSupported,
    isIOS,
    isStandalone,
    needsIOSInstall,
    isSubscribed,
    permission,
    isLoading,
    error,
    subscribe,
    unsubscribe,
    sendTestNotification,
  };
}
