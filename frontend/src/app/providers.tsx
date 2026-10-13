import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '../components/theme/ThemeProvider';
import { Toaster } from 'sonner';
import {
  CheckCircle2,
  AlertOctagon,
  AlertTriangle,
  Info,
  Loader2,
  X,
} from 'lucide-react';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      staleTime: 15 * 1000,
    },
  },
});

export const AppProviders: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        {children}
        <Toaster
          position="bottom-center"
          dir="rtl"
          theme="system"
          visibleToasts={3}
          offset={{ bottom: 'calc(64px + env(safe-area-inset-bottom, 0px) + 16px)' }}
          mobileOffset={{ bottom: 'calc(64px + env(safe-area-inset-bottom, 0px) + 16px)' }}
          closeButton
          icons={{
            success: <CheckCircle2 className="w-5 h-5 shrink-0" strokeWidth={2.5} />,
            error: <AlertOctagon className="w-5 h-5 shrink-0" strokeWidth={2.5} />,
            warning: <AlertTriangle className="w-5 h-5 shrink-0" strokeWidth={2.5} />,
            info: <Info className="w-5 h-5 shrink-0" strokeWidth={2.5} />,
            loading: <Loader2 className="w-5 h-5 shrink-0 animate-spin" strokeWidth={2.5} />,
            close: <X className="w-3.5 h-3.5" strokeWidth={3} />,
          }}
          toastOptions={{
            duration: 3500,
          }}
        />
      </ThemeProvider>
    </QueryClientProvider>
  );
};
