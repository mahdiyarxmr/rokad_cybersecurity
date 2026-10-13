import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { UserProfile, UserRole } from '../../types/auth';

interface AuthState {
  user: UserProfile | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  login: (user: UserProfile, accessToken: string, refreshToken?: string) => void;
  setTokens: (accessToken: string, refreshToken?: string) => void;
  setUser: (user: UserProfile) => void;
  logout: () => void;
  hasRole: (roles: UserRole | UserRole[]) => boolean;
  hasPermission: (permission: string) => boolean;
}

const isUsableToken = (t: string | null | undefined): t is string => !!t;

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,

      login: (user, accessToken, refreshToken) => {
        if (refreshToken && typeof window !== 'undefined') {
          sessionStorage.setItem('rokad_rt', refreshToken);
        }
        set({
          user,
          accessToken,
          refreshToken: refreshToken || null,
          isAuthenticated: true,
        });
      },

      setTokens: (accessToken, refreshToken) => {
        if (refreshToken && typeof window !== 'undefined') {
          sessionStorage.setItem('rokad_rt', refreshToken);
        }
        set({
          accessToken,
          refreshToken: refreshToken || get().refreshToken,
        });
      },

      setUser: (user) => set({ user }),

      logout: () => {
        if (typeof window !== 'undefined') {
          const refreshToken = sessionStorage.getItem('rokad_rt') || get().refreshToken;
          const accessToken = get().accessToken;
          sessionStorage.removeItem('rokad_rt');
          void import('../api/client')
            .then(({ API_BASE_URL }) =>
              fetch(`${API_BASE_URL.replace(/\/$/, '')}/auth/logout`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                  'Content-Type': 'application/json',
                  ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
                },
                body: JSON.stringify({ refreshToken: refreshToken || undefined }),
              }),
            )
            .catch(() => undefined);
        }
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
        });
        // Persist middleware will rewrite the key with cleared state.
        try {
          localStorage.removeItem('rokad_auth_session');
        } catch {}
      },

      hasRole: (roles) => {
        const user = get().user;
        if (!user) return false;
        if (user.isPlatformAdmin) return true;

        const allowedRoles = Array.isArray(roles) ? roles : [roles];
        return allowedRoles.includes(user.role);
      },

      hasPermission: (permission) => {
        const user = get().user;
        if (!user) return false;
        if (user.role === 'SUPER_ADMIN' || user.isPlatformAdmin) return true;
        return user.permissions?.includes(permission) || false;
      },
    }),
    {
      name: 'rokad_auth_session',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
      // Drop half-dead sessions on reload so GuestGuard can show /login.
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        const refreshFromSession =
          typeof window !== 'undefined' ? sessionStorage.getItem('rokad_rt') : null;
        if (refreshFromSession && state.user) {
          useAuthStore.setState({
            user: state.user,
            refreshToken: refreshFromSession,
            accessToken: null,
            isAuthenticated: true,
          });
          return;
        }
        const hasAccess = isUsableToken(state.accessToken);
        const hasRefresh = isUsableToken(state.refreshToken);
        if (!state.isAuthenticated || !state.user || !hasAccess || !hasRefresh) {
          try {
            sessionStorage.removeItem('rokad_rt');
            localStorage.removeItem('rokad_auth_session');
          } catch {}
          useAuthStore.setState({
            user: null,
            accessToken: null,
            refreshToken: null,
            isAuthenticated: false,
          });
        }
      },
    },
  ),
);

/** Force logout and send the browser to /login (survives interceptor context). */
export function forceLoginRedirect() {
  useAuthStore.getState().logout();
  if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
    window.location.assign('/login');
  }
}
