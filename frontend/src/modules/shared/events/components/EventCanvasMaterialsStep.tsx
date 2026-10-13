import React, { useEffect, useState } from 'react';
import { Button } from '../../../../components/ui/Button';
import { Modal } from '../../../../components/ui/Modal';
import { toast } from '../../../../components/ui/toast/toast';
import { toPersianDigits } from '../../../../utils/jalali';
import { useAuthStore } from '../../../../lib/auth/auth-store';
import { isWizardManagerRole } from '../constants/event-access';
import {
  Layers,
  FileText,
  Download,
  CheckSquare,
  Square,
  Plus,
  Trash2,
  Sparkles,
  Printer,
  Compass,
  Users,
  Target,
  Clock,
  Award,
  BookOpen,
  Share2,
  Box,
  Megaphone,
  CheckCircle2,
  Lightbulb,
} from 'lucide-react';

interface EventCanvasMaterialsStepProps {
  eventId: string;
  eventTitle: string;
  isEventEnded?: boolean;
}

interface CanvasBlock {
  id: string;
  title: string;
  description: string;
  icon: any;
  color: string;
  items: string[];
}

interface MaterialFile {
  id: string;
  title: string;
  type: 'PDF' | 'DOCX' | 'PPTX' | 'XLSX';
  size: string;
  description: string;
  downloadUrl?: string;
}

interface ChecklistItem {
  id: string;
  text: string;
  category: string;
  isDone: boolean;
}

export const EventCanvasMaterialsStep: React.FC<EventCanvasMaterialsStepProps> = ({
  eventId,
  eventTitle,
  isEventEnded = false,
}) => {
  const currentUser = useAuthStore((s) => s.user);
  const isManager = isWizardManagerRole(currentUser?.role) && !isEventEnded;
  const [activeTab, setActiveTab] = useState<'CANVAS' | 'MATERIALS' | 'CHECKLIST'>('CANVAS');

  const canvasStorageKey = `rokad_event_canvas_${eventId}`;
  const checklistStorageKey = `rokad_event_checklist_${eventId}`;

  // Canvas Blocks State (9 Standard Event Canvas Blocks) — persist items only (icons are not serializable)
  const defaultCanvasBlocks: CanvasBlock[] = [
    {
      id: 'vision_goals',
      title: '۱. هدف و چشم‌انداز رویداد',
      description: 'دلیل برگزاری رویداد و دستاورد نهایی مورد انتظار',
      icon: Target,
      color: 'bg-rose-50/80 border-rose-300 text-rose-950 dark:bg-rose-950/30 dark:text-rose-200 dark:border-rose-900/60',
      items: [
        'ارتقای مهارت‌های عملی و حل مسئله تیمی',
        'شناسایی و پرورش استعدادهای نوآورانه',
        'تولید نمونه اولیه‌های قابل ارائه به بازار',
      ],
    },
    {
      id: 'target_audience',
      title: '۲. مخاطبان و ذی‌نفعان اصلی',
      description: 'چه کسانی در این رویداد شرکت و سود می‌برند؟',
      icon: Users,
      color: 'bg-blue-50/80 border-blue-300 text-blue-950 dark:bg-blue-950/30 dark:text-blue-200 dark:border-blue-900/60',
      items: [
        'دانش‌آموزان رشته‌های فنی و کامپیوتر',
        'اساتید و مربیان کارگاه‌های مهارتی',
        'داوران و منتورهای صنعتی و اجرایی',
      ],
    },
    {
      id: 'value_prop',
      title: '۳. ارزش پیشنهادی و جذابیت',
      description: 'چرا شرکت‌کنندگان باید این رویداد را انتخاب کنند؟',
      icon: Sparkles,
      color: 'bg-amber-50/80 border-amber-300 text-amber-950 dark:bg-amber-950/30 dark:text-amber-200 dark:border-amber-900/60',
      items: [
        'کسب گواهی معتبر مهارتی رکاد',
        'اهدای جوایز نقدی و تجهیزات به تیم‌های برتر',
        'تجربه شبیه‌سازی فضای واقعی بازار کار',
      ],
    },
    {
      id: 'agenda_topics',
      title: '۴. سرفصل‌ها و ساختار برنامه',
      description: 'محورها، ورک‌شاپ‌ها و زمان‌بندی اصلی محتوا',
      icon: BookOpen,
      color: 'bg-purple-50/80 border-purple-300 text-purple-950 dark:bg-purple-950/30 dark:text-purple-200 dark:border-purple-900/60',
      items: [
        'کارگاه ایده‌پردازی و تفکر طراحی (۲ ساعت)',
        'ماراتن توسعه و ساخت پروتوتایپ (۴ ساعت)',
        'پیچ و ارائه طرح در حضور داوران (۲ ساعت)',
      ],
    },
    {
      id: 'mentors_judges',
      title: '۵. مربیان، سخنرانان و داوران',
      description: 'افراد کلیدی و هدایت‌کنندگان علمی و داوری',
      icon: Award,
      color: 'bg-indigo-50/80 border-indigo-300 text-indigo-950 dark:bg-indigo-950/30 dark:text-indigo-200 dark:border-indigo-900/60',
      items: [
        'منتورهای فنی حوزه نرم‌افزار و هوش مصنوعی',
        'داوران تخصصی نوآوری و بازار',
        'تسهیل‌گر و مجری صحنه رویداد',
      ],
    },
    {
      id: 'resources_equipment',
      title: '۶. منابع، تجهیزات و فضا',
      description: 'امکانات فیزیکی، سخت‌افزاری و دیجیتال لازم',
      icon: Box,
      color: 'bg-emerald-50/80 border-emerald-300 text-emerald-950 dark:bg-emerald-950/30 dark:text-emerald-200 dark:border-emerald-900/60',
      items: [
        'سالن همایش مجهز به ویدئو پروژکتور و صوت',
        'اینترنت پرسرعت و بوم‌های کاغذی A3',
        'پذیرایی میان‌وعده و پک هدیه خوش‌آمدگویی',
      ],
    },
    {
      id: 'channels_promotion',
      title: '۷. کانال‌های اطلاع‌رسانی',
      description: 'مسیرهای جذب مخاطب و ارتباط با شرکت‌کنندگان',
      icon: Megaphone,
      color: 'bg-teal-50/80 border-teal-300 text-teal-950 dark:bg-teal-950/30 dark:text-teal-200 dark:border-teal-900/60',
      items: [
        'اطلاعیه در تابلوی اعلانات سامانه رکاد',
        'کانال‌های دانش‌آموزی و اولیاء',
        'پوسترهای فیزیکی در راهروهای هنرستان',
      ],
    },
    {
      id: 'run_of_show',
      title: '۸. سناریوی زمان‌بندی اجرا',
      description: 'جدول گام‌به‌گام اتفاقات روز برگزاری',
      icon: Clock,
      color: 'bg-cyan-50/80 border-cyan-300 text-cyan-950 dark:bg-cyan-950/30 dark:text-cyan-200 dark:border-cyan-900/60',
      items: [
        '۰۸:۰۰ الی ۰۸:۳۰: پذیرش و ثبت‌نام حضوری',
        '۰۸:۳۰ الی ۰۹:۰۰: افتتاحیه و معرفی چالش‌ها',
        '۰۹:۰۰ الی ۱۳:۰۰: مسابقه و منتورینگ زنده',
        '۱۳:۰۰ الی ۱۴:۰۰: داوری، اختتامیه و جوایز',
      ],
    },
    {
      id: 'success_kpis',
      title: '۹. شاخص‌های سنجش موفقیت (KPI)',
      description: 'معیارهای کمی و کیفی ارزیابی خروجی رویداد',
      icon: Lightbulb,
      color: 'bg-amber-50/80 border-amber-300 text-amber-950 dark:bg-amber-950/30 dark:text-amber-200 dark:border-amber-900/60',
      items: [
        'مشارکت بیش از ۵۰ شرکت‌کننده فعال',
        'ثبت رضایت بالای ۸۵٪ در نظرسنجی پرس‌کاد',
        'تکمیل حداقل ۱۰ کاربرگ بوم تیمی',
      ],
    },
  ];

  const [canvasBlocks, setCanvasBlocks] = useState<CanvasBlock[]>(() => {
    try {
      const saved = localStorage.getItem(`rokad_event_canvas_${eventId}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          return defaultCanvasBlocks.map((block) => ({
            ...block,
            items: Array.isArray(parsed[block.id]) ? parsed[block.id] : block.items,
          }));
        }
      }
    } catch {}
    return defaultCanvasBlocks;
  });

  useEffect(() => {
    try {
      const itemsMap: Record<string, string[]> = {};
      for (const block of canvasBlocks) itemsMap[block.id] = block.items;
      localStorage.setItem(canvasStorageKey, JSON.stringify(itemsMap));
    } catch {}
  }, [canvasBlocks, canvasStorageKey]);

  // Add Item to Block Modal
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [newItemText, setNewItemText] = useState('');

  // Worksheets & Downloadable Materials
  const materialsList: MaterialFile[] = [
    {
      id: 'mat_1',
      title: 'کاربرگ خام بوم طراحی رویداد (نسخه چاپ A3)',
      type: 'PDF',
      size: '۲.۴ مگابایت',
      description: 'قالب استاندارد و استانداردسازی شده برای تکمیل تیمی در روز رویداد',
    },
    {
      id: 'mat_2',
      title: 'راهنما و شیوه‌نامه ارزیابی و داوری ایده‌ها',
      type: 'PDF',
      size: '۱.۱ مگابایت',
      description: 'ماتریس امتیازدهی و معیارهای ۵ ستاره داوران پرس‌کاد',
    },
    {
      id: 'mat_3',
      title: 'قالب اسلایدهای ارائه نهایی (پرزنتیشن تیم‌ها)',
      type: 'PPTX',
      size: '۴.۸ مگابایت',
      description: 'تم رسمی و نئوبروتالیست رکاد برای پیچ و دفاع از ایده',
    },
    {
      id: 'mat_4',
      title: 'چک‌لیست اکسل لجستیک و اقلام اجرایی',
      type: 'XLSX',
      size: '۵۴۰ کیلوبایت',
      description: 'جدول کامل برنامه‌ریزی تدارکات، بودجه و وظایف کادر اجرایی',
    },
  ];

  // Interactive Logistics Checklist — persisted per event
  const [checklist, setChecklist] = useState<ChecklistItem[]>(() => {
    try {
      const saved = localStorage.getItem(checklistStorageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed as ChecklistItem[];
      }
    } catch {}
    return [
    { id: 'c1', text: 'طراحی و چاپ بوم‌های کارگاهی و کاربرگ‌های تمرینی', category: 'متریال و چاپ', isDone: true },
    { id: 'c2', text: 'تست سیستم صوتی و ویدئو پروژکتور سالن اصلی', category: 'فنی و تجهیزات', isDone: true },
    { id: 'c3', text: 'ارسال پیامک و نوتیفیکیشن یادآوری به شرکت‌کنندگان', category: 'اطلاع‌رسانی', isDone: false },
    { id: 'c4', text: 'تهیه ماژیک‌ها، کاغذهای یادداشت رنگی و استیکرها', category: 'متریال و چاپ', isDone: true },
    { id: 'c5', text: 'هماهنگی پذیرایی میان‌وعده و بسته‌های آب‌معدنی', category: 'تدارکات', isDone: false },
    { id: 'c6', text: 'آماده‌سازی لوح‌های تقدیر، تندیس‌ها و جوایز برگزیدگان', category: 'جوایز و تشریفات', isDone: false },
    { id: 'c7', text: 'تنظیم لینک نظرسنجی آنلاین پرس‌کاد در سامانه', category: 'فنی و پلتفرم', isDone: true },
    ];
  });

  useEffect(() => {
    try {
      localStorage.setItem(checklistStorageKey, JSON.stringify(checklist));
    } catch {}
  }, [checklist, checklistStorageKey]);

  const toggleChecklistItem = (id: string) => {
    if (!isManager) return;
    setChecklist((prev) =>
      prev.map((item) => (item.id === id ? { ...item, isDone: !item.isDone } : item))
    );
  };

  const handleAddItemToBlock = () => {
    if (!isManager) return;
    if (!selectedBlockId || !newItemText.trim()) return;

    setCanvasBlocks((prev) =>
      prev.map((block) =>
        block.id === selectedBlockId
          ? { ...block, items: [...block.items, newItemText.trim()] }
          : block
      )
    );

    setNewItemText('');
    setSelectedBlockId(null);
    toast.success('مورد جدید با موفقیت به بوم اضافه شد.');
  };

  const handleDeleteItemFromBlock = (blockId: string, itemIdx: number) => {
    if (!isManager) return;
    setCanvasBlocks((prev) =>
      prev.map((block) =>
        block.id === blockId
          ? { ...block, items: block.items.filter((_, idx) => idx !== itemIdx) }
          : block
      )
    );
    toast.info('مورد از بوم حذف شد.');
  };

  const handlePrintCanvas = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="rounded-2xl border-[1.5px] border-primary-dark/30 dark:border-gray-800 bg-white dark:bg-[#151C28] shadow-[2px_2px_0_#59BBAF] dark:shadow-[2px_2px_0_#0B0F17] p-5 sm:p-7 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg md:text-xl font-black text-ink-darker dark:text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-primary shrink-0" />
              <span>گام پنجم: تکمیل بوم/کاربرگ</span>
            </h2>
            <p className="text-xs md:text-sm font-medium text-gray-500 dark:text-gray-400 mt-3">
              بخش‌های بوم کسب‌وکار و کاربرگ‌های رویداد را تکمیل و متریال‌های راهنما را دریافت کنید.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={handlePrintCanvas}
              className="gap-2 text-xs font-bold"
            >
              <Printer className="w-4 h-4" />
              <span>چاپ / خروجی بوم</span>
            </Button>
          </div>
        </div>

        {/* Tab Toggle: Canvas Grid vs Materials Downloads vs Interactive Checklist */}
        <div className="flex flex-col sm:flex-row gap-1 p-1 rounded-xl bg-gray-100 dark:bg-[#1C2536] border border-gray-200/60 dark:border-gray-700/60 sm:max-w-lg">
          <button
            onClick={() => setActiveTab('CANVAS')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 sm:py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'CANVAS'
                ? 'bg-white dark:bg-[#151C28] text-primary shadow-xs border border-primary/20 dark:border-gray-700'
                : 'text-gray-500 dark:text-gray-400 hover:text-ink-darker dark:hover:text-white'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>بوم مدل رویداد (۹ بخش)</span>
          </button>
          <button
            onClick={() => setActiveTab('MATERIALS')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 sm:py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'MATERIALS'
                ? 'bg-white dark:bg-[#151C28] text-primary shadow-xs border border-primary/20 dark:border-gray-700'
                : 'text-gray-500 dark:text-gray-400 hover:text-ink-darker dark:hover:text-white'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>ورک‌شیت‌ها و متریال‌ها</span>
          </button>
          <button
            onClick={() => setActiveTab('CHECKLIST')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 sm:py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'CHECKLIST'
                ? 'bg-white dark:bg-[#151C28] text-primary shadow-xs border border-primary/20 dark:border-gray-700'
                : 'text-gray-500 dark:text-gray-400 hover:text-ink-darker dark:hover:text-white'
            }`}
          >
            <CheckSquare className="w-4 h-4 text-emerald-500" />
            <span>چک‌لیست آمادگی</span>
          </button>
        </div>
      </div>

      {/* ================= TAB 1: EVENT CANVAS GRID (9-BOX CANVAS) ================= */}
      {activeTab === 'CANVAS' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {canvasBlocks.map((block) => {
              const IconComp = block.icon;

              return (
                <div
                  key={block.id}
                  className={`flex flex-col justify-between rounded-2xl border p-5 shadow-2xs hover:shadow-xs transition-all ${block.color}`}
                >
                  <div>
                    {/* Header of Block */}
                    <div className="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-current/15">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg border border-primary/20 bg-white/80 dark:bg-[#151C28]/80 text-primary flex items-center justify-center shadow-2xs">
                          <IconComp className="w-4 h-4" />
                        </div>
                        <h3 className="text-sm font-black tracking-tight">{block.title}</h3>
                      </div>
                      {isManager && (
                        <button
                          onClick={() => setSelectedBlockId(block.id)}
                          className="p-1 rounded-lg bg-white/80 hover:bg-white text-ink-darker dark:bg-[#1C2536] dark:text-white border border-gray-200/80 dark:border-gray-700 shadow-2xs transition-all"
                          title="افزودن نکته به این بخش"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <p className="text-xs font-medium opacity-75 mb-3">{block.description}</p>

                    {/* Items List (Sticky Notes) */}
                    <div className="space-y-2 my-2">
                      {block.items.map((item, idx) => (
                        <div
                          key={idx}
                          className="group/item flex items-start justify-between gap-2 rounded-xl border border-gray-200/80 bg-white/95 dark:bg-[#151C28]/95 dark:border-gray-700/80 p-2.5 shadow-2xs transition-all"
                        >
                          <div className="flex items-start gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                            <span className="text-xs font-bold text-ink-darker dark:text-white leading-snug">
                              {item}
                            </span>
                          </div>
                      {isManager && (
                        <button
                          onClick={() => handleDeleteItemFromBlock(block.id, idx)}
                          className="opacity-0 group-hover/item:opacity-100 p-1 text-rose-500 hover:text-rose-700 transition-opacity"
                          title="حذف این مورد"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {isManager && (
                    <div className="pt-2 mt-2 border-t border-current/10">
                      <button
                        onClick={() => setSelectedBlockId(block.id)}
                        className="w-full text-center py-1.5 rounded-lg text-xs font-bold opacity-80 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5 transition-all flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                        <span>افزودن کارت جدید</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ================= TAB 2: WORKSHEETS & DOWNLOADABLE MATERIALS ================= */}
      {activeTab === 'MATERIALS' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {materialsList.map((mat) => (
              <div
                key={mat.id}
                className="flex flex-col sm:flex-row sm:items-start items-stretch justify-between gap-4 rounded-2xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-[#151C28] p-5 shadow-2xs hover:shadow-xs transition-all"
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`w-12 h-12 rounded-xl border flex items-center justify-center font-black text-xs shadow-2xs ${
                      mat.type === 'PDF'
                        ? 'border-rose-500/20 bg-rose-500/10 text-rose-600 dark:text-rose-400'
                        : mat.type === 'PPTX'
                        ? 'border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400'
                        : 'border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                    }`}
                  >
                    {mat.type}
                  </div>

                  <div>
                    <h3 className="text-sm font-black text-ink-darker dark:text-white mb-1">
                      {mat.title}
                    </h3>
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                      {mat.description}
                    </p>
                    <span className="text-[11px] font-medium text-gray-400">حجم فایل: {mat.size}</span>
                  </div>
                </div>

                <Button
                  variant="outline"
                  onClick={() => {
                    toast.success(`دانلود فایل «${mat.title}» آغاز شد.`);
                  }}
                  className="gap-1.5 text-xs font-bold sm:flex-shrink-0 w-full sm:w-auto justify-center"
                >
                  <Download className="w-3.5 h-3.5 text-primary" />
                  <span>دانلود متریال</span>
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ================= TAB 3: LOGISTICS CHECKLIST ================= */}
      {activeTab === 'CHECKLIST' && (
        <div className="rounded-2xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-[#151C28] p-5 sm:p-6 shadow-2xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 dark:border-gray-800/80 pb-4 mb-2">
            <h3 className="text-sm sm:text-base font-black text-ink-darker dark:text-white flex items-center gap-2 min-w-0">
              <CheckSquare className="w-5 h-5 text-emerald-500 flex-shrink-0" />
              <span>چک‌لیست آمادگی ملزومات و تدارکات اجرایی رویداد</span>
            </h3>
            <span className="text-xs font-bold text-gray-500 dark:text-gray-400 flex-shrink-0">
              {toPersianDigits(checklist.filter((c) => c.isDone).length)} از {toPersianDigits(checklist.length)} مورد تکمیل شده
            </span>
          </div>

          <div className="space-y-2.5">
            {checklist.map((item) => (
              <div
                key={item.id}
                onClick={() => isManager && toggleChecklistItem(item.id)}
                className={`${isManager ? 'cursor-pointer' : 'cursor-default'} flex items-center justify-between gap-3 p-3.5 rounded-xl border transition-all ${
                  item.isDone
                    ? 'border-emerald-500/30 bg-emerald-500/10 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300'
                    : 'border-gray-200/80 dark:border-gray-800 bg-gray-50/70 hover:bg-gray-100/70 dark:bg-[#1C2536]/40 dark:hover:bg-[#1C2536]/70 shadow-2xs'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="text-emerald-600">
                    {item.isDone ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : (
                      <Square className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                  <span
                    className={`text-xs md:text-sm font-bold ${
                      item.isDone ? 'line-through opacity-75' : 'text-ink-darker dark:text-white'
                    }`}
                  >
                    {item.text}
                  </span>
                </div>

                <span className="px-2 py-0.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#151C28] text-[11px] font-bold text-gray-500 dark:text-gray-400">
                  {item.category}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal to add item to block */}
      <Modal
        isOpen={!!selectedBlockId}
        onClose={() => setSelectedBlockId(null)}
        title="افزودن کارت / نکته به بوم رویداد"
      >
        <div className="space-y-4">
          <label className="block text-xs font-black text-zinc-700 dark:text-zinc-300">
            عنوان یا شرح نکته جدید:
          </label>
          <input
            type="text"
            placeholder="مثال: دعوت از سخنران ویژه حوزه استارتاپ‌های دانش‌آموزی"
            value={newItemText}
            onChange={(e) => setNewItemText(e.target.value)}
            className="w-full rounded-xl px-3 py-2.5 border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1C2536] text-ink-darker dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 text-sm font-medium focus:border-primary focus:bg-white dark:focus:bg-[#1C2536] focus:outline-none transition-all"
          />

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-200 dark:border-zinc-800">
            <Button
              variant="outline"
              onClick={() => setSelectedBlockId(null)}
              className="font-bold"
            >
              انصراف
            </Button>
            <Button
              variant="primary"
              onClick={handleAddItemToBlock}
              className="font-black px-6"
            >
              افزودن به این بخش
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
