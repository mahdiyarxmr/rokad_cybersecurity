import { create } from 'zustand';
import { apiClient } from '../api/client';

export type BannerTheme = 'ecosystem' | 'college' | 'club' | 'male';

export interface BannerTypeConfig {
  id: string;
  name: string;
  badgeText: string;
  badgeVariant: 'default' | 'college' | 'club' | 'girl' | 'sec' | 'warning' | 'success';
  defaultTheme: BannerTheme;
  icon: 'Flame' | 'Bell' | 'Sparkles' | 'HelpCircle' | 'Trophy' | 'GraduationCap';
}

export interface HomeBannerSlide {
  id: string;
  type: string; // BannerTypeConfig id (e.g. 'EVENT', 'ANNOUNCEMENT', 'COACHING', or custom)
  title: string;
  subtitle: string;
  badgeText: string;
  badgeVariant?: 'default' | 'college' | 'club' | 'girl' | 'sec' | 'warning' | 'success';
  actionText: string;
  actionUrl: string;
  theme: BannerTheme;
  imageUrl?: string;
  active: boolean;
  eventId?: string;
  metaText?: string;
}

interface HomeBannerState {
  currentTenantId: string | null;
  isLoading: boolean;
  isSaving: boolean;
  slides: HomeBannerSlide[];
  bannerTypes: BannerTypeConfig[];

  initForTenant: (tenantId?: string | null) => Promise<void>;
  saveToBackend: () => Promise<boolean>;

  addSlide: (slide: Omit<HomeBannerSlide, 'id'>) => boolean;
  updateSlide: (id: string, updates: Partial<HomeBannerSlide>) => void;
  deleteSlide: (id: string) => void;
  reorderSlides: (slides: HomeBannerSlide[]) => void;
  toggleSlideActive: (id: string) => void;
  resetToDefaults: () => void;

  // Banner Types Management
  addBannerType: (type: Omit<BannerTypeConfig, 'id'>) => BannerTypeConfig;
  updateBannerType: (id: string, updates: Partial<BannerTypeConfig>) => void;
  deleteBannerType: (id: string) => void;
  resetBannerTypes: () => void;
}

export const DEFAULT_BANNER_TYPES: BannerTypeConfig[] = [
  {
    id: 'EVENT',
    name: 'رویداد',
    badgeText: 'رویداد زنده',
    badgeVariant: 'default',
    defaultTheme: 'ecosystem',
    icon: 'Flame',
  },
  {
    id: 'ANNOUNCEMENT',
    name: 'اطلاعیه',
    badgeText: 'اطلاعیه مهم',
    badgeVariant: 'college',
    defaultTheme: 'college',
    icon: 'Bell',
  },
  {
    id: 'COACHING',
    name: 'کوچینگ و مشاوره',
    badgeText: 'خدمات ویژه',
    badgeVariant: 'club',
    defaultTheme: 'club',
    icon: 'Sparkles',
  },
  {
    id: 'EXAM',
    name: 'آزمون و سنجش',
    badgeText: 'آزمون جامع',
    badgeVariant: 'sec',
    defaultTheme: 'male',
    icon: 'HelpCircle',
  },
  {
    id: 'CULTURAL',
    name: 'فرهنگی و مسابقات',
    badgeText: 'برنامه فرهنگی',
    badgeVariant: 'girl',
    defaultTheme: 'club',
    icon: 'Trophy',
  },
];

export const DEFAULT_HOME_BANNER_SLIDES: HomeBannerSlide[] = [
  {
    id: 'banner-slide-1',
    type: 'EVENT',
    title: 'همایش ملی نوآوری و فناوری‌های نوین آموزشی رکاد',
    subtitle: 'نشست تخصصی مربیان، مشاوران و دانش‌آموزان با ابزارهای نسل جدید',
    badgeText: 'رویداد زنده',
    badgeVariant: 'default',
    actionText: 'مشاهده رویداد',
    actionUrl: '/app/events',
    theme: 'ecosystem',
    active: true,
    metaText: 'سالن رازی • ۲۵ اسفند',
  },
  {
    id: 'banner-slide-2',
    type: 'ANNOUNCEMENT',
    title: 'آغاز ثبت‌نام آزمون‌های جامع مهارتی و پروژه‌محور',
    subtitle: 'ثبت سرفصل پروژه‌ها و شرکت در سنجش‌های دوره‌ای فعال شد.',
    badgeText: 'اطلاعیه مهم',
    badgeVariant: 'college',
    actionText: 'مشاهده اطلاعیه',
    actionUrl: '/app/messages',
    theme: 'college',
    active: true,
    metaText: 'مهلت تا پنج‌شنبه',
  },
  {
    id: 'banner-slide-3',
    type: 'COACHING',
    title: 'میز کار اختصاصی کوچینگ و هدایت تحصیلی',
    subtitle: 'رزرو آنلاین جلسات خصوصی هدایت شغلی با مشاوران مدرسه',
    badgeText: 'خدمات ویژه',
    badgeVariant: 'club',
    actionText: 'رزرو نوبت',
    actionUrl: '/app/coaching',
    theme: 'club',
    active: true,
    metaText: 'ظرفیت محدود',
  },
];

const getTenantStorageKey = (tenantId?: string | null) =>
  tenantId ? `rokad_banners_tenant_${tenantId}` : 'rokad_banners_global';

const saveTenantCache = (
  tenantId: string | null,
  slides: HomeBannerSlide[],
  bannerTypes: BannerTypeConfig[]
) => {
  if (typeof window === 'undefined') return;
  try {
    const key = getTenantStorageKey(tenantId);
    localStorage.setItem(key, JSON.stringify({ slides, bannerTypes }));
  } catch (err) {
    console.error('Failed to save banner tenant cache', err);
  }
};

const loadTenantCache = (
  tenantId: string | null
): { slides: HomeBannerSlide[]; bannerTypes: BannerTypeConfig[] } | null => {
  if (typeof window === 'undefined') return null;
  try {
    const key = getTenantStorageKey(tenantId);
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (err) {
    console.error('Failed to parse banner tenant cache', err);
    return null;
  }
};

export const useHomeBannerStore = create<HomeBannerState>()((set, get) => ({
  currentTenantId: null,
  isLoading: false,
  isSaving: false,
  slides: DEFAULT_HOME_BANNER_SLIDES,
  bannerTypes: DEFAULT_BANNER_TYPES,

  initForTenant: async (tenantId) => {
    const effectiveTenantId = tenantId || null;
    // Don't re-initialize if tenant has not changed and slides are already loaded
    if (get().currentTenantId === effectiveTenantId && get().slides.length > 0) {
      return;
    }

    set({ currentTenantId: effectiveTenantId, isLoading: true });

    // Step 1: Immediately restore from tenant-specific local cache for zero delay
    const cached = loadTenantCache(effectiveTenantId);
    if (cached?.slides && cached.slides.length > 0) {
      set({
        slides: cached.slides,
        bannerTypes: cached.bannerTypes?.length > 0 ? cached.bannerTypes : DEFAULT_BANNER_TYPES,
      });
    } else {
      set({
        slides: DEFAULT_HOME_BANNER_SLIDES,
        bannerTypes: DEFAULT_BANNER_TYPES,
      });
    }

    // Step 2: Fetch latest tenant banners from database
    try {
      const res = await apiClient.get('/tenants/my-school/banners');
      const data = res.data;
      if (data?.slides && Array.isArray(data.slides) && data.slides.length > 0) {
        const slides = data.slides;
        const bannerTypes =
          data.bannerTypes && Array.isArray(data.bannerTypes) && data.bannerTypes.length > 0
            ? data.bannerTypes
            : DEFAULT_BANNER_TYPES;

        set({ slides, bannerTypes });
        saveTenantCache(effectiveTenantId, slides, bannerTypes);
      }
    } catch (err) {
      // Backend request might fail if offline or not authenticated yet; local cache is used
    } finally {
      set({ isLoading: false });
    }
  },

  saveToBackend: async () => {
    const { currentTenantId, slides, bannerTypes } = get();
    set({ isSaving: true });
    try {
      await apiClient.patch('/tenants/my-school/banners', {
        slides,
        bannerTypes,
      });
      saveTenantCache(currentTenantId, slides, bannerTypes);
      set({ isSaving: false });
      return true;
    } catch (err) {
      console.error('Failed to sync banners to backend', err);
      // Still cache locally
      saveTenantCache(currentTenantId, slides, bannerTypes);
      set({ isSaving: false });
      return false;
    }
  },

  addSlide: (slideData) => {
    const { slides, currentTenantId, bannerTypes } = get();
    if (slides.length >= 3) {
      return false;
    }

    const newSlide: HomeBannerSlide = {
      ...slideData,
      id: `banner-slide-${Date.now()}`,
      active: slideData.active !== undefined ? slideData.active : true,
    };

    const newSlides = [...slides, newSlide];
    set({ slides: newSlides });
    saveTenantCache(currentTenantId, newSlides, bannerTypes);
    get().saveToBackend();
    return true;
  },

  updateSlide: (id, updates) => {
    const { slides, currentTenantId, bannerTypes } = get();
    const newSlides = slides.map((slide) =>
      slide.id === id ? { ...slide, ...updates } : slide
    );
    set({ slides: newSlides });
    saveTenantCache(currentTenantId, newSlides, bannerTypes);
    get().saveToBackend();
  },

  deleteSlide: (id) => {
    const { slides, currentTenantId, bannerTypes } = get();
    const newSlides = slides.filter((slide) => slide.id !== id);
    set({ slides: newSlides });
    saveTenantCache(currentTenantId, newSlides, bannerTypes);
    get().saveToBackend();
  },

  reorderSlides: (newSlides) => {
    const { currentTenantId, bannerTypes } = get();
    const sliced = newSlides.slice(0, 3);
    set({ slides: sliced });
    saveTenantCache(currentTenantId, sliced, bannerTypes);
    get().saveToBackend();
  },

  toggleSlideActive: (id) => {
    const { slides, currentTenantId, bannerTypes } = get();
    const newSlides = slides.map((slide) =>
      slide.id === id ? { ...slide, active: !slide.active } : slide
    );
    set({ slides: newSlides });
    saveTenantCache(currentTenantId, newSlides, bannerTypes);
    get().saveToBackend();
  },

  resetToDefaults: () => {
    const { currentTenantId } = get();
    set({
      slides: DEFAULT_HOME_BANNER_SLIDES,
      bannerTypes: DEFAULT_BANNER_TYPES,
    });
    saveTenantCache(currentTenantId, DEFAULT_HOME_BANNER_SLIDES, DEFAULT_BANNER_TYPES);
    get().saveToBackend();
  },

  // Types Management
  addBannerType: (typeData) => {
    const { bannerTypes, currentTenantId, slides } = get();
    const newType: BannerTypeConfig = {
      ...typeData,
      id: `TYPE_${Date.now()}`,
    };
    const newTypes = [...bannerTypes, newType];
    set({ bannerTypes: newTypes });
    saveTenantCache(currentTenantId, slides, newTypes);
    get().saveToBackend();
    return newType;
  },

  updateBannerType: (id, updates) => {
    const { bannerTypes, currentTenantId, slides } = get();
    const newTypes = bannerTypes.map((t) =>
      t.id === id ? { ...t, ...updates } : t
    );
    set({ bannerTypes: newTypes });
    saveTenantCache(currentTenantId, slides, newTypes);
    get().saveToBackend();
  },

  deleteBannerType: (id) => {
    const { bannerTypes, currentTenantId, slides } = get();
    const newTypes = bannerTypes.filter((t) => t.id !== id);
    set({ bannerTypes: newTypes });
    saveTenantCache(currentTenantId, slides, newTypes);
    get().saveToBackend();
  },

  resetBannerTypes: () => {
    const { currentTenantId, slides } = get();
    set({ bannerTypes: DEFAULT_BANNER_TYPES });
    saveTenantCache(currentTenantId, slides, DEFAULT_BANNER_TYPES);
    get().saveToBackend();
  },
}));
