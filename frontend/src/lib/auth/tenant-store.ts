import { create } from 'zustand';
import { TenantInfo, BrandThemeKey } from '../../types/tenant';

interface TenantState {
  currentTenant: TenantInfo | null;
  theme: BrandThemeKey;
  setCurrentTenant: (tenant: TenantInfo) => void;
  setTheme: (theme: BrandThemeKey) => void;
  clearTenant: () => void;
}

export const ROKAD_BRANCHES: Record<'boys' | 'girls', TenantInfo> = {
  boys: {
    id: 'boys-tenant-id',
    name: 'هنرستان فنی و حرفه‌ای پسرانه رکاد',
    slug: 'rokad-boys',
    type: 'SCHOOL',
    theme: 'male',
    logoUrl: '/logo.svg',
  },
  girls: {
    id: 'girls-tenant-id',
    name: 'هنرستان فنی و حرفه‌ای دخترانه رکاد',
    slug: 'rokad-girls',
    type: 'SCHOOL',
    theme: 'female',
    logoUrl: '/logo.svg',
  },
};

import { persist, createJSONStorage } from 'zustand/middleware';

export const useTenantStore = create<TenantState>()(
  persist(
    (set) => ({
      currentTenant: ROKAD_BRANCHES.boys,
      theme: 'male',

      setCurrentTenant: (tenant) => {
        const isGirls = tenant.slug === 'rokad-girls' || tenant.theme?.toLowerCase() === 'female';
        const rawTheme = (tenant.theme || (isGirls ? 'female' : 'male')).toLowerCase() as BrandThemeKey;
        set({
          currentTenant: tenant,
          theme: ['ecosystem', 'male', 'female', 'college', 'club'].includes(rawTheme)
            ? rawTheme
            : isGirls
            ? 'female'
            : 'male',
        });
      },

      setTheme: (theme) => set({ theme }),

      clearTenant: () => set({ currentTenant: ROKAD_BRANCHES.boys, theme: 'male' }),
    }),
    {
      name: 'rokad_tenant_session',
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

