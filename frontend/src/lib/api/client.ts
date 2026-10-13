import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { forceLoginRedirect, useAuthStore } from '../auth/auth-store';
import { useTenantStore } from '../auth/tenant-store';

const resolveApiBaseUrl = (): string => {
  const rawUrl = (import.meta.env.VITE_API_URL as string)?.trim() || '';
  if (
    !rawUrl ||
    rawUrl.includes('rokad-api.liara.run') ||
    rawUrl.includes('api-rokad.liara.run') ||
    rawUrl.includes('rokad.liara.run')
  ) {
    if (import.meta.env.DEV && !rawUrl) {
      return '/api/v1';
    }
    return 'https://api.rokadschool.ir/api/v1';
  }
  return rawUrl;
};

export const API_BASE_URL = resolveApiBaseUrl();

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
  withCredentials: true,
});

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: any) => void;
  reject: (reason?: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const isAuthFailure = (status?: number) => status === 401 || status === 403;

const isTransientRefreshError = (err: any): boolean => {
  const status = err?.response?.status ?? err?.status;
  if (status === undefined || status === 0) return true; // network / timeout
  if (status >= 500) return true;
  return false;
};

/** Single-flight refresh with short retry on 5xx/network — only 401 kills the session. */
const performTokenRefresh = async (): Promise<string | null> => {
  const { refreshToken } = useAuthStore.getState();
  if (!refreshToken) {
    forceLoginRedirect();
    return null;
  }

  let lastErr: any = null;
  const attempts = 3;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/auth/refresh`,
        { refreshToken },
        {
          headers: {
            'x-tenant-slug': useTenantStore.getState().currentTenant?.slug || 'rokad-boys',
          },
          timeout: 15000,
          withCredentials: true,
        },
      );

      const newAccessToken = response.data?.data?.accessToken;
      const newRefreshToken = response.data?.data?.refreshToken;
      if (newAccessToken) {
        useAuthStore.getState().setTokens(newAccessToken, newRefreshToken);
        return newAccessToken;
      }
      lastErr = new Error('پاسخ نامعتبر از سرویس نوسازی توکن');
    } catch (err: any) {
      lastErr = err;
      const status = err?.response?.status;
      // Definitive auth failure — do not retry (avoids reuse-detection loops).
      if (isAuthFailure(status)) break;
      // Transient (5xx / network) — brief backoff then retry.
      if (!isTransientRefreshError(err) || attempt === attempts) break;
      await sleep(300 * attempt);
    }
  }

  throw lastErr;
};

// 1. Request Interceptor: Attach Auth Token and Tenant Slug
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const accessToken = useAuthStore.getState().accessToken;
    const currentTenant = useTenantStore.getState().currentTenant;

    if (accessToken && !config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }

    const isLoginRequest = config.url?.includes('/auth/login');
    if (!isLoginRequest && currentTenant?.slug && !config.headers['x-tenant-slug']) {
      config.headers['x-tenant-slug'] = currentTenant.slug;
    }

    // Attach Client App Version for release version tracking and server error/audit logs
    config.headers['X-App-Version'] = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '1.0.0';

    return config;
  },
  (error) => Promise.reject(error),
);

// 2. Response Interceptor: Auto Token Refresh on 401
apiClient.interceptors.response.use(
  (response) => response.data,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (originalRequest.url?.includes('/auth/login') || originalRequest.url?.includes('/auth/refresh')) {
        return Promise.reject(error.response.data || error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return apiClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const newAccessToken = await performTokenRefresh();
        if (newAccessToken) {
          processQueue(null, newAccessToken);
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          return apiClient(originalRequest);
        }
        processQueue(error.response?.data || error, null);
        return Promise.reject(error.response?.data || error);
      } catch (refreshErr: any) {
        const refreshStatus = refreshErr?.response?.status;
        processQueue(refreshErr, null);
        // Only hard-fail session on explicit auth rejection from /auth/refresh.
        // Transient 5xx must not wipe the session — surface original 401 instead.
        if (isAuthFailure(refreshStatus)) {
          forceLoginRedirect();
        }
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error.response?.data || error);
  },
);
