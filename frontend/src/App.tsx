import React, { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { router } from './app/router';
import { AppProviders } from './app/providers';
import { PwaInstallPrompt } from './components/pwa/PwaInstallPrompt';
import { OfflineIndicator } from './components/pwa/OfflineIndicator';
import { PwaUpdatePrompt } from './components/pwa/PwaUpdatePrompt';
import { useAuthStore } from './lib/auth/auth-store';
import { CuriosityEasterEggModal } from './components/ui/CuriosityEasterEggModal';

const cleanupStaleServiceWorkers = () => {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
  // Dev: unregister any stale SW left from earlier builds so Workbox can't serve stale JS,
  // but preserve push-worker so Web Push remains active and testable.
  if (import.meta.env.DEV) {
    void navigator.serviceWorker.getRegistrations().then((regs) => {
      regs.forEach((r) => {
        if (r.active?.scriptURL?.includes('push-worker')) return;
        void r.unregister();
      });
    });
    if (typeof caches !== 'undefined') {
      void caches.keys().then((keys) => {
        keys.forEach((k) => {
          if (k.includes('workbox') || k.includes('precache') || k.includes('runtime')) {
            void caches.delete(k);
          }
        });
      });
    }
  }
};

export const App: React.FC = () => {
  useEffect(() => {
    cleanupStaleServiceWorkers();
    // If rehydrated session is unusable, drop it before guards run long.
    const s = useAuthStore.getState();
    const bad =
      s.isAuthenticated &&
      (!s.user || !s.accessToken || !s.refreshToken);
    if (bad) s.logout();
  }, []);

  return (
    <AppProviders>
      <RouterProvider router={router} />
      <PwaInstallPrompt />
      <OfflineIndicator />
      <PwaUpdatePrompt />
      <CuriosityEasterEggModal />
    </AppProviders>
  );
};
