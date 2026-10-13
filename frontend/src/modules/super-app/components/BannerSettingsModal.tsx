import React, { useState, useEffect, useRef } from 'react';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Badge } from '../../../components/ui/Badge';
import { toast } from '../../../components/ui/toast/toast';
import { apiClient } from '../../../lib/api/client';
import { toPersianDigits } from '../../../lib/utils';
import {
  useHomeBannerStore,
  HomeBannerSlide,
  BannerTheme,
  BannerTypeConfig,
} from '../../../lib/stores/home-banner-store';
import { useAuthStore } from '../../../lib/auth/auth-store';
import {
  Plus,
  Trash2,
  Edit2,
  Eye,
  EyeOff,
  ArrowUp,
  ArrowDown,
  Sparkles,
  Flame,
  Bell,
  CheckCircle2,
  RotateCcw,
  Calendar,
  AlertCircle,
  ChevronDown,
  HelpCircle,
  Trophy,
  GraduationCap,
  Settings2,
  ArrowRight,
  ArrowLeft,
  LayoutGrid,
  ExternalLink,
} from 'lucide-react';

interface BannerSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BannerSettingsModal: React.FC<BannerSettingsModalProps> = ({ isOpen, onClose }) => {
  const {
    slides,
    bannerTypes,
    addSlide,
    updateSlide,
    deleteSlide,
    reorderSlides,
    toggleSlideActive,
    resetToDefaults,
    addBannerType,
    updateBannerType,
    deleteBannerType,
    initForTenant,
  } = useHomeBannerStore();

  const user = useAuthStore((state) => state.user);

  // Active Main Tab: SLIDES or TYPES
  const [activeTab, setActiveTab] = useState<'SLIDES' | 'TYPES'>('SLIDES');

  // Slide Sub-mode: LIST or FORM
  const [slideMode, setSlideMode] = useState<'LIST' | 'FORM'>('LIST');
  const [editingSlideId, setEditingSlideId] = useState<string | null>(null);

  // Custom Dropdown Open States
  const [isTypeDropdownOpen, setIsTypeDropdownOpen] = useState(false);
  const [isEventDropdownOpen, setIsEventDropdownOpen] = useState(false);
  const typeDropdownRef = useRef<HTMLDivElement>(null);
  const eventDropdownRef = useRef<HTMLDivElement>(null);

  // Live School Events from Calendar
  const [liveEvents, setLiveEvents] = useState<any[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(false);

  // Slide Form State
  const [slideForm, setSlideForm] = useState<{
    type: string;
    title: string;
    subtitle: string;
    badgeText: string;
    badgeVariant: NonNullable<HomeBannerSlide['badgeVariant']>;
    actionText: string;
    actionUrl: string;
    theme: BannerTheme;
    metaText: string;
    active: boolean;
  }>({
    type: 'EVENT',
    title: '',
    subtitle: '',
    badgeText: 'رویداد زنده',
    badgeVariant: 'default',
    actionText: 'مشاهده رویداد',
    actionUrl: '/app/events',
    theme: 'ecosystem',
    metaText: '',
    active: true,
  });

  // Type Management Sub-mode: LIST or FORM
  const [typeFormMode, setTypeFormMode] = useState<'LIST' | 'FORM'>('LIST');
  const [editingTypeId, setEditingTypeId] = useState<string | null>(null);
  const [typeForm, setTypeForm] = useState<{
    name: string;
    badgeText: string;
    badgeVariant: BannerTypeConfig['badgeVariant'];
    defaultTheme: BannerTheme;
    icon: BannerTypeConfig['icon'];
  }>({
    name: '',
    badgeText: '',
    badgeVariant: 'default',
    defaultTheme: 'ecosystem',
    icon: 'Sparkles',
  });

  // Close custom dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (typeDropdownRef.current && !typeDropdownRef.current.contains(e.target as Node)) {
        setIsTypeDropdownOpen(false);
      }
      if (eventDropdownRef.current && !eventDropdownRef.current.contains(e.target as Node)) {
        setIsEventDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch school events and initialize tenant banners
  useEffect(() => {
    if (!isOpen) return;

    initForTenant(user?.tenantId);

    const fetchEvents = async () => {
      try {
        setIsLoadingEvents(true);
        const res = await apiClient.get('/calendar/events');
        if (res && res.data && Array.isArray(res.data)) {
          setLiveEvents(res.data);
        }
      } catch {
        // silent fallback
      } finally {
        setIsLoadingEvents(false);
      }
    };

    fetchEvents();
  }, [isOpen, user?.tenantId, initForTenant]);

  // Helper to render type icon
  const renderIconByName = (iconName: string, className = 'w-4 h-4') => {
    switch (iconName) {
      case 'Flame':
        return <Flame className={className} />;
      case 'Bell':
        return <Bell className={className} />;
      case 'HelpCircle':
        return <HelpCircle className={className} />;
      case 'Trophy':
        return <Trophy className={className} />;
      case 'GraduationCap':
        return <GraduationCap className={className} />;
      case 'Sparkles':
      default:
        return <Sparkles className={className} />;
    }
  };

  // Selected Type config
  const selectedTypeConfig = bannerTypes.find((t) => t.id === slideForm.type) || bannerTypes[0];

  // Open slide creation form
  const handleOpenAddSlide = () => {
    if (slides.length >= 3) {
      toast.error('سقف مجاز حداکثر ۳ اسلاید است.');
      return;
    }
    const defaultType = bannerTypes[0] || {
      id: 'EVENT',
      badgeText: 'رویداد زنده',
      badgeVariant: 'default',
      defaultTheme: 'ecosystem',
    };

    setEditingSlideId(null);
    setSlideForm({
      type: defaultType.id,
      title: '',
      subtitle: '',
      badgeText: defaultType.badgeText,
      badgeVariant: defaultType.badgeVariant,
      actionText: 'مشاهده رویداد',
      actionUrl: '/app/events',
      theme: defaultType.defaultTheme,
      metaText: '',
      active: true,
    });
    setSlideMode('FORM');
  };

  // Open slide edit form
  const handleOpenEditSlide = (slide: HomeBannerSlide) => {
    setEditingSlideId(slide.id);
    setSlideForm({
      type: slide.type,
      title: slide.title,
      subtitle: slide.subtitle,
      badgeText: slide.badgeText,
      badgeVariant: slide.badgeVariant || 'default',
      actionText: slide.actionText,
      actionUrl: slide.actionUrl,
      theme: slide.theme,
      metaText: slide.metaText || '',
      active: slide.active,
    });
    setSlideMode('FORM');
  };

  // Save slide
  const handleSaveSlide = (e: React.FormEvent) => {
    e.preventDefault();
    if (!slideForm.title.trim()) {
      toast.error('عنوان اسلاید الزامی است.');
      return;
    }

    if (editingSlideId) {
      updateSlide(editingSlideId, { ...slideForm });
      toast.success('اسلاید به‌روزرسانی شد.');
    } else {
      if (slides.length >= 3) {
        toast.error('سقف ۳ اسلاید تکمیل است.');
        return;
      }
      const success = addSlide({ ...slideForm });
      if (success) {
        toast.success('اسلاید جدید افزوده شد.');
      } else {
        toast.error('امکان ثبت بیش از ۳ اسلاید وجود ندارد.');
      }
    }

    setSlideMode('LIST');
    setEditingSlideId(null);
  };

  // Auto-fill from live event
  const handleSelectLiveEvent = (event: any) => {
    const eventType = bannerTypes.find((t) => t.id === 'EVENT') || bannerTypes[0];
    setSlideForm((prev) => ({
      ...prev,
      type: eventType?.id || prev.type,
      title: event.title || 'رویداد مدرسه',
      subtitle: event.description || 'جهت مشاهده جزئیات و شرکت در رویداد کلیک نمایید.',
      badgeText: eventType?.badgeText || 'رویداد زنده',
      badgeVariant: eventType?.badgeVariant || 'default',
      actionText: 'مشاهده رویداد',
      actionUrl: `/app/events/${event.id || ''}`,
      theme: eventType?.defaultTheme || 'ecosystem',
      metaText: event.location ? `مکان: ${event.location}` : 'تقویم رویدادها',
    }));
    setIsEventDropdownOpen(false);
    toast.success(`رویداد «${event.title}» اعمال شد.`);
  };

  // Select banner type in slide form
  const handleSelectType = (typeConfig: BannerTypeConfig) => {
    setSlideForm((prev) => ({
      ...prev,
      type: typeConfig.id,
      badgeText: typeConfig.badgeText,
      badgeVariant: typeConfig.badgeVariant,
      theme: typeConfig.defaultTheme,
    }));
    setIsTypeDropdownOpen(false);
  };

  // Slide reorder
  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const newSlides = [...slides];
    const temp = newSlides[index - 1];
    newSlides[index - 1] = newSlides[index];
    newSlides[index] = temp;
    reorderSlides(newSlides);
  };

  const handleMoveDown = (index: number) => {
    if (index === slides.length - 1) return;
    const newSlides = [...slides];
    const temp = newSlides[index + 1];
    newSlides[index + 1] = newSlides[index];
    newSlides[index] = temp;
    reorderSlides(newSlides);
  };

  // Type management methods
  const handleOpenAddType = () => {
    setEditingTypeId(null);
    setTypeForm({
      name: '',
      badgeText: '',
      badgeVariant: 'default',
      defaultTheme: 'ecosystem',
      icon: 'Sparkles',
    });
    setTypeFormMode('FORM');
  };

  const handleOpenEditType = (typeItem: BannerTypeConfig) => {
    setEditingTypeId(typeItem.id);
    setTypeForm({
      name: typeItem.name,
      badgeText: typeItem.badgeText,
      badgeVariant: typeItem.badgeVariant,
      defaultTheme: typeItem.defaultTheme,
      icon: typeItem.icon,
    });
    setTypeFormMode('FORM');
  };

  const handleSaveType = (e: React.FormEvent) => {
    e.preventDefault();
    if (!typeForm.name.trim()) {
      toast.error('نام نوع بنر الزامی است.');
      return;
    }
    const finalBadge = typeForm.badgeText.trim() || typeForm.name.trim();

    if (editingTypeId) {
      updateBannerType(editingTypeId, { ...typeForm, badgeText: finalBadge });
      toast.success('نوع بنر به‌روزرسانی شد.');
    } else {
      addBannerType({ ...typeForm, badgeText: finalBadge });
      toast.success('نوع بنر جدید با موفقیت افزوده شد.');
    }
    setTypeFormMode('LIST');
    setEditingTypeId(null);
  };

  const handleDeleteType = (id: string, name: string) => {
    if (bannerTypes.length <= 1) {
      toast.error('حداقل یک نوع بنر باید در سامانه وجود داشته باشد.');
      return;
    }
    deleteBannerType(id);
    toast.success(`نوع بنر «${name}» حذف شد.`);
  };

  // Theme palettes
  const THEME_OPTIONS: { key: BannerTheme; label: string; bg: string; previewBg: string }[] = [
    {
      key: 'ecosystem',
      label: 'اکوسیستم (سبز)',
      bg: 'bg-[#59BBAF]',
      previewBg: 'from-[#EDF9F7] via-[#F8FDFD] to-[#DCF3F0] dark:from-[#0D2421] dark:to-[#13322E]',
    },
    {
      key: 'college',
      label: 'کالج (طلایی)',
      bg: 'bg-[#F8A41D]',
      previewBg: 'from-[#FEF8ED] via-[#FFFDF7] to-[#FEF3C7] dark:from-[#2A1C0B] dark:to-[#38260D]',
    },
    {
      key: 'club',
      label: 'کلاب (بنفش)',
      bg: 'bg-[#652D90]',
      previewBg: 'from-[#F6F0FA] via-[#FCFAFE] to-[#EDE0F7] dark:from-[#241033] dark:to-[#301644]',
    },
    {
      key: 'male',
      label: 'سرمه‌ای (رسمی)',
      bg: 'bg-[#202A5A]',
      previewBg: 'from-[#EEF2FA] via-[#F8FAFC] to-[#DDE5F5] dark:from-[#111A33] dark:to-[#182346]',
    },
  ];

  // Available Icons for Types
  const AVAILABLE_ICONS: { key: BannerTypeConfig['icon']; label: string }[] = [
    { key: 'Flame', label: 'شعله' },
    { key: 'Bell', label: 'زنگوله' },
    { key: 'Sparkles', label: 'ستاره' },
    { key: 'HelpCircle', label: 'آزمون' },
    { key: 'Trophy', label: 'جام' },
    { key: 'GraduationCap', label: 'کلاه' },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="تنظیمات بنرها"
      maxWidth="3xl"
    >
      <div className="space-y-4">
        {/* ========================================================= */}
        {/* 1. TOP SEGMENTED TAB SWITCHER (Consistent 50/50, h-11)    */}
        {/* ========================================================= */}
        <div className="grid grid-cols-2 gap-2 p-1.5 rounded-2xl bg-gray-100 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={() => {
              setActiveTab('SLIDES');
              setSlideMode('LIST');
            }}
            className={`h-11 flex items-center justify-center gap-2 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer ${
              activeTab === 'SLIDES'
                ? 'bg-white dark:bg-[#161D2A] text-primary-dark dark:text-primary shadow-[2px_2px_0_#59BBAF] border-[1.5px] border-primary/40'
                : 'text-gray-600 dark:text-gray-400 hover:text-ink-darker dark:hover:text-white'
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
            <span>اسلایدها</span>
            <span className="font-mono text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold">
              {toPersianDigits(slides.length)} / ۳
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('TYPES');
              setTypeFormMode('LIST');
            }}
            className={`h-11 flex items-center justify-center gap-2 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer ${
              activeTab === 'TYPES'
                ? 'bg-white dark:bg-[#161D2A] text-primary-dark dark:text-primary shadow-[2px_2px_0_#59BBAF] border-[1.5px] border-primary/40'
                : 'text-gray-600 dark:text-gray-400 hover:text-ink-darker dark:hover:text-white'
            }`}
          >
            <Settings2 className="w-4 h-4" />
            <span>دسته‌بندی‌ها</span>
            <span className="font-mono text-xs px-2 py-0.5 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold">
              {toPersianDigits(bannerTypes.length)}
            </span>
          </button>
        </div>

        {/* ========================================================= */}
        {/* TAB 1: SLIDES MANAGEMENT                                 */}
        {/* ========================================================= */}
        {activeTab === 'SLIDES' && (
          <>
            {/* 1.1 SLIDES LIST MODE */}
            {slideMode === 'LIST' && (
              <div className="space-y-3.5">
                {/* Action Buttons (Borderless, well-spaced) */}
                <div className="flex items-center justify-end gap-2.5 pt-0.5">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      resetToDefaults();
                      toast.success('اسلایدر به حالت پیش‌فرض اولیه بازنشانی شد.');
                    }}
                    className="min-h-[40px] px-3.5 text-xs font-bold flex items-center gap-1.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-gray-500" />
                    <span>بازنشانی پیش‌فرض</span>
                  </Button>

                  <Button
                    variant="primary"
                    size="sm"
                    disabled={slides.length >= 3}
                    onClick={handleOpenAddSlide}
                    className="min-h-[40px] px-4 text-xs font-black flex items-center gap-2 shadow-xs"
                  >
                    <Plus className="w-4 h-4" />
                    <span>افزودن اسلاید جدید</span>
                  </Button>
                </div>

                {/* Slides Cards List */}
                <div className="space-y-3 max-h-[54vh] overflow-y-auto pr-1">
                  {slides.length === 0 ? (
                    <div className="text-center py-10 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-3xl p-6">
                      <AlertCircle className="w-10 h-10 mx-auto text-gray-400 mb-2.5" />
                      <p className="font-bold text-sm text-gray-600 dark:text-gray-300">
                        در حال حاضر هیچ اسلایدی فعال نیست.
                      </p>
                      <Button
                        variant="primary"
                        size="md"
                        onClick={handleOpenAddSlide}
                        className="mt-3.5 text-xs font-black h-10 px-4"
                      >
                        <Plus className="w-4 h-4 ml-1" />
                        <span>ایجاد اولین اسلاید</span>
                      </Button>
                    </div>
                  ) : (
                    slides.map((slide, idx) => (
                      <div
                        key={slide.id}
                        className={`p-4 rounded-2xl border-[1.5px] transition-all flex flex-col gap-3.5 ${
                          slide.active
                            ? 'bg-white dark:bg-[#161D2A] border-gray-200 dark:border-gray-700 hover:border-primary/60 shadow-xs'
                            : 'bg-gray-100/70 dark:bg-gray-800/40 border-dashed border-gray-300 dark:border-gray-700 opacity-70'
                        }`}
                      >
                        {/* Card Header: Position, Badges, Order Controls */}
                        <div className="flex items-center justify-between gap-2 border-b border-gray-100 dark:border-gray-800 pb-2.5 flex-wrap">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="px-2 py-0.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-ink-darker dark:text-white font-mono font-black text-xs border border-gray-200 dark:border-gray-700">
                              اسلاید {toPersianDigits(idx + 1)}
                            </span>
                            <Badge
                              variant={slide.badgeVariant || 'default'}
                              className="text-[10px] py-0.5 px-2 font-black shadow-2xs"
                            >
                              {slide.badgeText}
                            </Badge>
                            {slide.metaText && (
                              <span className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">
                                • {slide.metaText}
                              </span>
                            )}
                          </div>

                          {/* Reorder Buttons (Unified size w-8 h-8) */}
                          <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-0.5 border border-gray-200 dark:border-gray-700">
                            <button
                              type="button"
                              onClick={() => handleMoveUp(idx)}
                              disabled={idx === 0}
                              title="انتقال به بالا"
                              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white dark:hover:bg-gray-700 disabled:opacity-25 cursor-pointer transition-colors"
                            >
                              <ArrowUp className="w-4 h-4 text-gray-700 dark:text-gray-200" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMoveDown(idx)}
                              disabled={idx === slides.length - 1}
                              title="انتقال به پایین"
                              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white dark:hover:bg-gray-700 disabled:opacity-25 cursor-pointer transition-colors"
                            >
                              <ArrowDown className="w-4 h-4 text-gray-700 dark:text-gray-200" />
                            </button>
                          </div>
                        </div>

                        {/* Card Content */}
                        <div className="space-y-1">
                          <h4 className="font-black text-sm sm:text-base text-ink-darker dark:text-white truncate">
                            {slide.title}
                          </h4>
                          {slide.subtitle && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1">
                              {slide.subtitle}
                            </p>
                          )}
                        </div>

                        {/* Card Footer Actions Bar (Standard h-9 Buttons) */}
                        <div className="flex items-center justify-between gap-2 pt-1 border-t border-gray-100 dark:border-gray-800/60 flex-wrap">
                          {/* Active Toggle Button */}
                          <button
                            type="button"
                            onClick={() => toggleSlideActive(slide.id)}
                            className={`h-9 px-3 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer ${
                              slide.active
                                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100'
                                : 'bg-gray-100 dark:bg-gray-800 text-gray-500 border-gray-300 dark:border-gray-700 hover:bg-gray-200'
                            }`}
                          >
                            {slide.active ? (
                              <>
                                <Eye className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                <span>نمایش فعال</span>
                              </>
                            ) : (
                              <>
                                <EyeOff className="w-4 h-4 text-gray-400" />
                                <span>مخفی در هوم</span>
                              </>
                            )}
                          </button>

                          {/* Edit & Delete Buttons */}
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenEditSlide(slide)}
                              className="h-9 px-3.5 text-xs font-bold flex items-center gap-1.5 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800 hover:bg-blue-50"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                              <span>ویرایش اسلاید</span>
                            </Button>

                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                deleteSlide(slide.id);
                                toast.success('اسلاید حذف شد.');
                              }}
                              className="h-9 px-3 text-xs text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800 hover:bg-rose-50"
                              title="حذف اسلاید"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* 1.2 SLIDE FORM MODE (Create / Edit) */}
            {slideMode === 'FORM' && (
              <form onSubmit={handleSaveSlide} className="space-y-4">
                {/* Form Navigation Header */}
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/40 border border-gray-200 dark:border-gray-700">
                  <span className="text-xs sm:text-sm font-black text-ink-darker dark:text-white">
                    {editingSlideId ? 'ویرایش اسلاید بنر' : 'افزودن اسلاید جدید به صفحه هوم'}
                  </span>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setSlideMode('LIST')}
                    className="h-9 px-3.5 text-xs font-bold flex items-center gap-1.5"
                  >
                    <ArrowRight className="w-4 h-4" />
                    <span>انصراف و بازگشت</span>
                  </Button>
                </div>

                {/* 2-Column Responsive Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                  {/* Right Column: Form Inputs (7 cols) */}
                  <div className="lg:col-span-7 space-y-3.5">
                    {/* Selectors Row */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Banner Type Dropdown */}
                      <div className="relative" ref={typeDropdownRef}>
                        <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                          نوع بنر
                        </label>
                        <button
                          type="button"
                          onClick={() => setIsTypeDropdownOpen(!isTypeDropdownOpen)}
                          className="w-full h-11 flex items-center justify-between px-3.5 rounded-xl border-[1.5px] border-gray-300 dark:border-gray-700 bg-white dark:bg-[#161D2A] text-ink-darker dark:text-white shadow-2xs hover:border-primary transition-colors cursor-pointer text-xs font-bold"
                        >
                          <div className="flex items-center gap-2 truncate">
                            <span className="p-1 rounded-lg bg-gray-100 dark:bg-gray-800 text-primary">
                              {renderIconByName(selectedTypeConfig?.icon || 'Sparkles', 'w-4 h-4')}
                            </span>
                            <span className="truncate">{selectedTypeConfig?.name || 'انتخاب نوع'}</span>
                            <Badge
                              variant={selectedTypeConfig?.badgeVariant || 'default'}
                              className="text-[9px] py-0 px-1.5 font-bold"
                            >
                              {selectedTypeConfig?.badgeText}
                            </Badge>
                          </div>
                          <ChevronDown
                            className={`w-4 h-4 text-gray-400 transition-transform ${
                              isTypeDropdownOpen ? 'rotate-180' : ''
                            }`}
                          />
                        </button>

                        {/* Type Menu */}
                        {isTypeDropdownOpen && (
                          <div className="absolute top-full right-0 left-0 mt-1 z-30 bg-white dark:bg-[#161D2A] border-[1.5px] border-primary/30 dark:border-gray-700 rounded-2xl shadow-[3px_3px_0_#59BBAF] dark:shadow-[3px_3px_0_#0B0F17] overflow-hidden p-1.5 space-y-1 animate-in fade-in duration-150">
                            {bannerTypes.map((t) => (
                              <button
                                key={t.id}
                                type="button"
                                onClick={() => handleSelectType(t)}
                                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold cursor-pointer transition-colors ${
                                  slideForm.type === t.id
                                    ? 'bg-primary/10 text-primary-dark dark:text-primary'
                                    : 'text-ink-darker dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800'
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  {renderIconByName(t.icon, 'w-4 h-4 text-primary')}
                                  <span>{t.name}</span>
                                </div>
                                <Badge variant={t.badgeVariant} className="text-[9px] py-0 px-2">
                                  {t.badgeText}
                                </Badge>
                              </button>
                            ))}

                            <div className="pt-1 mt-1 border-t border-gray-100 dark:border-gray-800">
                              <button
                                type="button"
                                onClick={() => {
                                  setIsTypeDropdownOpen(false);
                                  setActiveTab('TYPES');
                                  handleOpenAddType();
                                }}
                                className="w-full flex items-center justify-center gap-2 py-2 text-xs font-black text-primary hover:bg-primary/5 rounded-xl cursor-pointer"
                              >
                                <Plus className="w-4 h-4" />
                                <span>مدیریت انواع بنرها</span>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Live Event Auto-fill Dropdown */}
                      <div className="relative" ref={eventDropdownRef}>
                        <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                          اتصال به رویداد زنده
                        </label>
                        <button
                          type="button"
                          onClick={() => setIsEventDropdownOpen(!isEventDropdownOpen)}
                          className="w-full h-11 flex items-center justify-between px-3.5 rounded-xl border-[1.5px] border-primary/40 bg-primary/5 dark:bg-primary/10 text-primary-dark dark:text-primary-light shadow-2xs hover:bg-primary/10 transition-colors cursor-pointer text-xs font-bold"
                        >
                          <div className="flex items-center gap-2 truncate">
                            <Calendar className="w-4 h-4 text-primary shrink-0" />
                            <span className="truncate">انتخاب از تقویم مدرسه</span>
                          </div>
                          <ChevronDown
                            className={`w-4 h-4 text-primary transition-transform ${
                              isEventDropdownOpen ? 'rotate-180' : ''
                            }`}
                          />
                        </button>

                        {/* Events Menu */}
                        {isEventDropdownOpen && (
                          <div className="absolute top-full right-0 left-0 mt-1 z-30 bg-white dark:bg-[#161D2A] border-[1.5px] border-primary/30 dark:border-gray-700 rounded-2xl shadow-[3px_3px_0_#59BBAF] dark:shadow-[3px_3px_0_#0B0F17] overflow-hidden p-1.5 max-h-52 overflow-y-auto space-y-1 animate-in fade-in duration-150">
                            {isLoadingEvents ? (
                              <div className="text-center py-4 text-xs text-gray-400">در حال بارگذاری...</div>
                            ) : liveEvents.length === 0 ? (
                              <div className="text-center py-4 text-xs text-gray-400">رویدادی یافت نشد.</div>
                            ) : (
                              liveEvents.map((ev) => (
                                <button
                                  key={ev.id}
                                  type="button"
                                  onClick={() => handleSelectLiveEvent(ev)}
                                  className="w-full text-right px-3 py-2 rounded-xl hover:bg-primary/10 dark:hover:bg-primary/20 text-xs cursor-pointer flex items-center justify-between gap-2"
                                >
                                  <span className="font-bold text-ink-darker dark:text-white truncate">
                                    {ev.title}
                                  </span>
                                  <span className="text-[11px] text-primary shrink-0 font-bold">اعمال</span>
                                </button>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Theme Swatches */}
                    <div>
                      <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                        تم رنگی سازمانی
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {THEME_OPTIONS.map((theme) => (
                          <button
                            key={theme.key}
                            type="button"
                            onClick={() => setSlideForm((prev) => ({ ...prev, theme: theme.key }))}
                            className={`h-11 rounded-xl flex items-center justify-center gap-2 text-xs font-bold text-white transition-all cursor-pointer ${theme.bg} ${
                              slideForm.theme === theme.key
                                ? 'ring-2 ring-primary ring-offset-2 scale-102 shadow-xs'
                                : 'opacity-85 hover:opacity-100'
                            }`}
                          >
                            {slideForm.theme === theme.key && (
                              <CheckCircle2 className="w-4 h-4" />
                            )}
                            <span>{theme.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Content Fields */}
                    <div className="space-y-2.5">
                      <div>
                        <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                          عنوان بنر <span className="text-rose-500">*</span>
                        </label>
                        <Input
                          value={slideForm.title}
                          onChange={(e) => setSlideForm((prev) => ({ ...prev, title: e.target.value }))}
                          placeholder="عنوان جذاب بنر"
                          className="h-11 text-xs font-bold"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                          توضیحات کوتاه
                        </label>
                        <textarea
                          value={slideForm.subtitle}
                          onChange={(e) => setSlideForm((prev) => ({ ...prev, subtitle: e.target.value }))}
                          placeholder="توضیح کوتاه یک یا دو خطی..."
                          rows={2}
                          className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#161D2A] text-ink-darker dark:text-white focus:outline-none focus:ring-2 focus:ring-primary leading-relaxed"
                        />
                      </div>
                    </div>

                    {/* Badge & Meta Text */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                          متن برچسب (بج)
                        </label>
                        <Input
                          value={slideForm.badgeText}
                          onChange={(e) => setSlideForm((prev) => ({ ...prev, badgeText: e.target.value }))}
                          placeholder="مثال: رویداد زنده"
                          className="h-11 text-xs font-bold"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                          اطلاعات زمان یا مکان
                        </label>
                        <Input
                          value={slideForm.metaText}
                          onChange={(e) => setSlideForm((prev) => ({ ...prev, metaText: e.target.value }))}
                          placeholder="مثال: ۲۵ اسفند • سالن رازی"
                          className="h-11 text-xs font-bold"
                        />
                      </div>
                    </div>

                    {/* Action Text & Link */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                          متن دکمه اقدام
                        </label>
                        <Input
                          value={slideForm.actionText}
                          onChange={(e) => setSlideForm((prev) => ({ ...prev, actionText: e.target.value }))}
                          placeholder="مثال: مشاهده رویداد"
                          className="h-11 text-xs font-bold"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                          لینک مقصد (URL)
                        </label>
                        <Input
                          value={slideForm.actionUrl}
                          onChange={(e) => setSlideForm((prev) => ({ ...prev, actionUrl: e.target.value }))}
                          placeholder="/app/events"
                          className="h-11 text-xs font-bold"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Left Column: Live Preview & Status Switch (5 cols) */}
                  <div className="lg:col-span-5 space-y-3.5 lg:sticky lg:top-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-gray-700 dark:text-gray-300">
                        پیش‌نمایش زنده در هوم:
                      </span>
                      <span className="text-[10px] text-gray-400 font-bold">بروزرسانی درجا</span>
                    </div>

                    {/* Miniature Banner Preview */}
                    <div
                      className={`p-4 rounded-2xl border-[1.5px] border-primary/40 shadow-[2.5px_2.5px_0_#59BBAF] dark:shadow-[2.5px_2.5px_0_#0B0F17] bg-gradient-to-br ${
                        THEME_OPTIONS.find((t) => t.key === slideForm.theme)?.previewBg || 'from-white to-gray-50'
                      } space-y-2.5 transition-all`}
                    >
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <Badge variant={slideForm.badgeVariant} className="text-[10px] py-0.5 px-2 font-black shadow-2xs">
                          {slideForm.badgeText || 'برچسب'}
                        </Badge>
                        {slideForm.metaText && (
                          <span className="text-[10px] font-bold text-gray-600 dark:text-gray-300 bg-white/60 dark:bg-black/20 px-2 py-0.5 rounded-md">
                            {slideForm.metaText}
                          </span>
                        )}
                      </div>

                      <h4 className="font-black text-sm sm:text-base text-ink-darker dark:text-white leading-snug line-clamp-2">
                        {slideForm.title || 'عنوان بنر در این قسمت قرار می‌گیرد'}
                      </h4>

                      <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed line-clamp-2">
                        {slideForm.subtitle || 'توضیحات تکمیلی و معرفی رویداد یا اطلاعیه در این بخش نمایش داده خواهد شد.'}
                      </p>

                      <div className="pt-2 border-t border-black/5 dark:border-white/5 flex items-center justify-between">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary text-white text-xs font-black shadow-xs">
                          <span>{slideForm.actionText || 'مشاهده'}</span>
                          <ArrowLeft className="w-3.5 h-3.5" />
                        </span>

                        <span className="text-[10px] font-mono text-gray-400">اسلاید فعال</span>
                      </div>
                    </div>

                    {/* Status Toggle Switch Card */}
                    <div className="p-3.5 rounded-2xl bg-white dark:bg-[#161D2A] border-[1.5px] border-gray-200 dark:border-gray-700 flex items-center justify-between shadow-xs">
                      <div>
                        <span className="block text-xs font-black text-ink-darker dark:text-white">
                          نمایش فعال در صفحه هوم
                        </span>
                        <span className="block text-[11px] text-gray-500 mt-0.5">
                          {slideForm.active ? 'اسلاید فوراً در اسلایدر نمایش می‌یابد' : 'اسلاید به صورت پیش‌نویس ذخیره می‌شود'}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => setSlideForm((prev) => ({ ...prev, active: !prev.active }))}
                        className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                          slideForm.active ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'
                        }`}
                      >
                        <span
                          className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-xs transition-transform ${
                            slideForm.active ? 'right-6.5' : 'right-0.5'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Form Bottom Action Bar: Consistent h-11 Buttons */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700 gap-3">
                  <span className="text-xs text-gray-500 font-bold hidden sm:inline">
                    {editingSlideId ? 'در حال ویرایش اسلاید موجود' : 'در حال ثبت اسلاید جدید'}
                  </span>

                  <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      size="md"
                      onClick={() => setSlideMode('LIST')}
                      className="h-11 px-5 text-xs sm:text-sm font-bold flex items-center gap-2"
                    >
                      <ArrowRight className="w-4 h-4" />
                      <span>انصراف و بازگشت</span>
                    </Button>
                    <Button
                      type="submit"
                      variant="primary"
                      size="md"
                      className="h-11 px-6 text-xs sm:text-sm font-black flex items-center gap-2 shadow-xs"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{editingSlideId ? 'ذخیره تغییرات اسلاید' : 'ثبت و انتشار اسلاید'}</span>
                    </Button>
                  </div>
                </div>
              </form>
            )}
          </>
        )}

        {/* ========================================================= */}
        {/* TAB 2: BANNER TYPES MANAGEMENT                            */}
        {/* ========================================================= */}
        {activeTab === 'TYPES' && (
          <>
            {/* 2.1 TYPES LIST MODE */}
            {typeFormMode === 'LIST' && (
              <div className="space-y-3.5">
                {/* Header Action Button (Borderless, well-spaced) */}
                <div className="flex items-center justify-end gap-2.5 pt-0.5">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleOpenAddType}
                    className="min-h-[40px] px-4 text-xs font-black flex items-center gap-2 shadow-xs"
                  >
                    <Plus className="w-4 h-4" />
                    <span>افزودن نوع جدید</span>
                  </Button>
                </div>

                {/* Types Cards Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[54vh] overflow-y-auto pr-1">
                  {bannerTypes.map((item) => (
                    <div
                      key={item.id}
                      className="p-3.5 rounded-2xl border-[1.5px] border-gray-200 dark:border-gray-700 bg-white dark:bg-[#161D2A] flex items-center justify-between gap-3 shadow-xs hover:border-primary/50 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
                          {renderIconByName(item.icon, 'w-5 h-5')}
                        </div>
                        <div className="min-w-0 space-y-1">
                          <h5 className="font-black text-xs sm:text-sm text-ink-darker dark:text-white truncate">
                            {item.name}
                          </h5>
                          <Badge variant={item.badgeVariant} className="text-[9px] py-0.5 px-2 font-bold">
                            {item.badgeText}
                          </Badge>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenEditType(item)}
                          className="h-9 px-3 text-xs text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800 hover:bg-blue-50"
                        >
                          <Edit2 className="w-3.5 h-3.5 ml-1" />
                          <span>ویرایش</span>
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteType(item.id, item.name)}
                          className="h-9 px-2.5 text-xs text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800 hover:bg-rose-50"
                          title="حذف نوع بنر"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 2.2 TYPE ADD / EDIT FORM */}
            {typeFormMode === 'FORM' && (
              <form onSubmit={handleSaveType} className="space-y-4">
                {/* Form Navigation Header */}
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/40 border border-gray-200 dark:border-gray-700">
                  <span className="text-xs sm:text-sm font-black text-ink-darker dark:text-white">
                    {editingTypeId ? 'ویرایش نوع بنر' : 'تعریف نوع بنر جدید'}
                  </span>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setTypeFormMode('LIST')}
                    className="h-9 px-3.5 text-xs font-bold flex items-center gap-1.5"
                  >
                    <ArrowRight className="w-4 h-4" />
                    <span>انصراف و بازگشت</span>
                  </Button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                      نام نوع بنر <span className="text-rose-500">*</span>
                    </label>
                    <Input
                      value={typeForm.name}
                      onChange={(e) => setTypeForm((prev) => ({ ...prev, name: e.target.value }))}
                      placeholder="مثال: کارگاه مهارتی، آزمون نهایی"
                      className="h-11 text-xs font-bold"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                      متن پیش‌فرض بج (Badge)
                    </label>
                    <Input
                      value={typeForm.badgeText}
                      onChange={(e) => setTypeForm((prev) => ({ ...prev, badgeText: e.target.value }))}
                      placeholder="مثال: کارگاه زنده"
                      className="h-11 text-xs font-bold"
                    />
                  </div>
                </div>

                {/* Icon Selection Grid */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                    آیکون نمادین
                  </label>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                    {AVAILABLE_ICONS.map((ico) => (
                      <button
                        key={ico.key}
                        type="button"
                        onClick={() => setTypeForm((prev) => ({ ...prev, icon: ico.key }))}
                        className={`h-14 rounded-xl border text-xs flex flex-col items-center justify-center gap-1 cursor-pointer transition-all ${
                          typeForm.icon === ico.key
                            ? 'bg-primary/10 border-primary text-primary font-black shadow-xs ring-1 ring-primary scale-102'
                            : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        {renderIconByName(ico.key, 'w-5 h-5')}
                        <span className="text-[11px] font-bold">{ico.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Default Theme Swatches */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                    تم رنگی پیش‌فرض
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {THEME_OPTIONS.map((th) => (
                      <button
                        key={th.key}
                        type="button"
                        onClick={() => setTypeForm((prev) => ({ ...prev, defaultTheme: th.key }))}
                        className={`h-11 rounded-xl text-xs font-bold text-white transition-all cursor-pointer ${th.bg} ${
                          typeForm.defaultTheme === th.key
                            ? 'ring-2 ring-primary ring-offset-2 font-black shadow-xs scale-102'
                            : 'opacity-85 hover:opacity-100'
                        }`}
                      >
                        {th.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Type Form Footer Buttons */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <Button
                    type="button"
                    variant="outline"
                    size="md"
                    onClick={() => setTypeFormMode('LIST')}
                    className="h-11 px-5 text-xs sm:text-sm font-bold flex items-center gap-2"
                  >
                    <ArrowRight className="w-4 h-4" />
                    <span>انصراف و بازگشت</span>
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    size="md"
                    className="h-11 px-6 text-xs sm:text-sm font-black flex items-center gap-2 shadow-xs"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>ذخیره نوع بنر</span>
                  </Button>
                </div>
              </form>
            )}
          </>
        )}
      </div>
    </Modal>
  );
};
