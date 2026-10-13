import React, { useEffect, useState } from 'react';
import { WifiOff, Wifi, RefreshCw } from 'lucide-react';

export const OfflineIndicator: React.FC = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showBackOnline, setShowBackOnline] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowBackOnline(true);
      const timer = setTimeout(() => {
        setShowBackOnline(false);
      }, 3500);
      return () => clearTimeout(timer);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowBackOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline && !showBackOnline) {
    return null;
  }

  return (
    <div className="fixed top-3 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-3 duration-300 pointer-events-none">
      {!isOnline ? (
        <div className="bg-amber-600/95 backdrop-blur-md text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2 text-xs font-bold border border-amber-500/50">
          <WifiOff className="w-4 h-4 animate-pulse" />
          <span>حالت آفلاین — ارتباط اینترنتی قطع است</span>
        </div>
      ) : showBackOnline ? (
        <div className="bg-emerald-600/95 backdrop-blur-md text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2 text-xs font-bold border border-emerald-500/50">
          <Wifi className="w-4 h-4" />
          <span>اتصال اینترنت مجدداً برقرار شد</span>
        </div>
      ) : null}
    </div>
  );
};
