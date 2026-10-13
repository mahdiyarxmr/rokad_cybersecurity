import React, { useState } from 'react';
import {
  KeyRound,
  Radio,
  Sliders,
  ShieldCheck,
  Eye,
  EyeOff,
  Save,
  Plus,
  Trash2,
  Edit3,
  CheckCircle2,
  Bookmark,
  Layers,
  Sparkles,
} from 'lucide-react';
import { toPersianDigits } from '../../../lib/utils';
import { toast } from 'sonner';

interface GatewaySettingsTabProps {
  selectedProvider: 'AMOOT' | 'KAVENEGAR' | 'SANDBOX';
  setSelectedProvider: (p: 'AMOOT' | 'KAVENEGAR' | 'SANDBOX') => void;
  amootToken: string;
  setAmootToken: (t: string) => void;
  amootLine: string;
  setAmootLine: (l: string) => void;
  onSaveGatewayConfig: () => void;
  isSavingGateway: boolean;
  quickTemplates: any[];
  onAddQuickTemplate: (dto: { title: string; content: string; category: string }) => void;
  onUpdateQuickTemplate: (id: string, dto: { title: string; content: string; category: string }) => void;
  onDeleteQuickTemplate: (id: string) => void;
}

export const GatewaySettingsTab: React.FC<GatewaySettingsTabProps> = ({
  selectedProvider,
  setSelectedProvider,
  amootToken,
  setAmootToken,
  amootLine,
  setAmootLine,
  onSaveGatewayConfig,
  isSavingGateway,
  quickTemplates,
  onAddQuickTemplate,
  onUpdateQuickTemplate,
  onDeleteQuickTemplate,
}) => {
  const [showToken, setShowToken] = useState(false);

  // Quick Template form states
  const [templateTitle, setTemplateTitle] = useState('');
  const [templateContent, setTemplateContent] = useState('');
  const [templateCategory, setTemplateCategory] = useState('GENERAL');
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleStartEdit = (tmpl: any) => {
    setEditingId(tmpl.id);
    setTemplateTitle(tmpl.title);
    setTemplateContent(tmpl.content);
    setTemplateCategory(tmpl.category || 'GENERAL');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setTemplateTitle('');
    setTemplateContent('');
    setTemplateCategory('GENERAL');
  };

  const handleSaveTemplate = () => {
    if (!templateTitle.trim() || !templateContent.trim()) {
      toast.error('لطفاً عنوان و متن الگو را وارد نمایید');
      return;
    }

    if (editingId) {
      onUpdateQuickTemplate(editingId, {
        title: templateTitle.trim(),
        content: templateContent.trim(),
        category: templateCategory,
      });
      handleCancelEdit();
    } else {
      onAddQuickTemplate({
        title: templateTitle.trim(),
        content: templateContent.trim(),
        category: templateCategory,
      });
      setTemplateTitle('');
      setTemplateContent('');
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Column 1: Gateway Configuration */}
      <div className="space-y-6">
        <div className="rokad-card p-5 sm:p-6 bg-white dark:bg-[#151C28] border-[1.5px] border-gray-200 dark:border-gray-800 shadow-[2.75px_2.75px_0_#202A5A] dark:shadow-[2.75px_2.75px_0_#59BBAF]">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 rounded-xl bg-ecosystem-light dark:bg-ecosystem-darker/60 text-primary shrink-0">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-sec dark:text-white">
                پیکربندی وب‌سرویس و درگاه پیامک
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                تنظیم توکن احراز هویت، شماره خط اختصاصی و ارائه‌دهنده سرویس
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Provider Selection */}
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-2">
                انتخاب ارائه‌دهنده وب‌سرویس:
              </label>
              <div className="grid grid-cols-3 gap-2.5">
                {[
                  { key: 'AMOOT', label: 'آموت پیامک', note: 'توصیه‌شده' },
                  { key: 'KAVENEGAR', label: 'کاوه‌نگار', note: 'پشتیبان' },
                  { key: 'SANDBOX', label: 'محیط آزمایشی', note: 'شبیه‌ساز' },
                ].map((p) => (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => setSelectedProvider(p.key as any)}
                    className={`p-3 rounded-xl border text-center transition cursor-pointer ${
                      selectedProvider === p.key
                        ? 'bg-primary-light/40 dark:bg-primary-darker/40 border-primary shadow-[2px_2px_0_#59BBAF]'
                        : 'bg-[#FAFAFA] dark:bg-[#1C2536] border-gray-200 dark:border-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <span className="block text-xs font-black text-sec dark:text-white">
                      {p.label}
                    </span>
                    <span className="text-[10px] text-gray-400 block mt-0.5">
                      {p.note}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* API Token Input */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
                  کلید دسترسی (API Token / Key):
                </label>
                <button
                  type="button"
                  onClick={() => setShowToken(!showToken)}
                  className="text-xs text-primary font-bold flex items-center gap-1 hover:underline cursor-pointer"
                >
                  {showToken ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  <span>{showToken ? 'مخفی‌سازی' : 'نمایش کلید'}</span>
                </button>
              </div>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-gray-400 absolute right-3.5 top-3" />
                <input
                  type={showToken ? 'text' : 'password'}
                  value={amootToken}
                  onChange={(e) => setAmootToken(e.target.value)}
                  placeholder="توکن وب‌سرویس را اینجا وارد کنید..."
                  className="w-full pr-10 pl-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-[#FAFAFA] dark:bg-[#1C2536] text-xs font-mono text-left focus:border-primary focus:outline-none transition"
                  dir="ltr"
                />
              </div>
            </div>

            {/* Line Number Input */}
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                شماره خط فرستنده اختصاصی / خدماتی:
              </label>
              <div className="relative">
                <Radio className="w-4 h-4 text-gray-400 absolute right-3.5 top-3" />
                <input
                  type="text"
                  value={amootLine}
                  onChange={(e) => setAmootLine(e.target.value)}
                  placeholder="مثال: 983000xxxx"
                  className="w-full pr-10 pl-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-[#FAFAFA] dark:bg-[#1C2536] text-xs font-mono text-left focus:border-primary focus:outline-none transition"
                  dir="ltr"
                />
              </div>
            </div>

            {/* Save Button */}
            <div className="pt-2">
              <button
                type="button"
                disabled={isSavingGateway}
                onClick={onSaveGatewayConfig}
                className="w-full rokad-btn-primary py-2.5 text-xs sm:text-sm font-black flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSavingGateway ? (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <span>ذخیره و اعتبارسنجی اتصال درگاه</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Column 2: Quick Templates Management */}
      <div className="space-y-6">
        <div className="rokad-card p-5 sm:p-6 bg-white dark:bg-[#151C28] border-[1.5px] border-gray-200 dark:border-gray-800 shadow-[2.75px_2.75px_0_#202A5A] dark:shadow-[2.75px_2.75px_0_#59BBAF]">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-xl bg-college-light dark:bg-college-darker/60 text-college-normal shrink-0">
                <Bookmark className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-sec dark:text-white">
                  بانک الگوهای آماده و پیام‌های سریع
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  متن‌های پرکاربرد برای فراخوانی فوری در ارسال پیامک دستی
                </p>
              </div>
            </div>
          </div>

          {/* Form to Add / Edit Template */}
          <div className="p-4 rounded-xl bg-[#FAFAFA] dark:bg-[#1C2536] border border-gray-200 dark:border-gray-700 space-y-3 mb-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-sec dark:text-white">
                {editingId ? 'ویرایش الگوی انتخابی:' : 'افزودن الگوی سریع جدید:'}
              </span>
              {editingId && (
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="text-[11px] text-gray-400 hover:underline"
                >
                  انصراف از ویرایش
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="عنوان الگو (مثال: دعوت به جلسه انجمن)"
                value={templateTitle}
                onChange={(e) => setTemplateTitle(e.target.value)}
                className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#151C28] text-xs font-medium focus:border-primary focus:outline-none"
              />

              <select
                value={templateCategory}
                onChange={(e) => setTemplateCategory(e.target.value)}
                className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#151C28] text-xs font-medium focus:border-primary focus:outline-none"
              >
                <option value="GENERAL">عمومی و اطلاعیه</option>
                <option value="FINANCIAL">مالی و شهریه</option>
                <option value="ATTENDANCE">حضور و غیاب</option>
                <option value="EXAMS">امتحانات و کارنامه</option>
              </select>
            </div>

            <textarea
              rows={3}
              placeholder="متن کامل پیامک الگو..."
              value={templateContent}
              onChange={(e) => setTemplateContent(e.target.value)}
              className="w-full p-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#151C28] text-xs leading-relaxed font-medium focus:border-primary focus:outline-none"
            />

            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleSaveTemplate}
                className="rokad-btn-sec px-4 py-1.5 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                {editingId ? <Edit3 className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                <span>{editingId ? 'به‌روزرسانی الگو' : 'ثبت الگوی جدید'}</span>
              </button>
            </div>
          </div>

          {/* List of Templates */}
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {quickTemplates.length === 0 ? (
              <div className="py-8 text-center text-xs text-gray-400">
                هنوز هیچ الگوی سریعی ثبت نشده است. با استفاده از فرم بالا نخستین الگو را ایجاد نمایید.
              </div>
            ) : (
              quickTemplates.map((t: any) => (
                <div
                  key={t.id}
                  className="p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-[#FAFAFA] dark:bg-[#1C2536] text-right flex items-start justify-between gap-3 hover:border-gray-300 transition"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-sec dark:text-white">
                        {t.title}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                        {t.category || 'عمومی'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-300 mt-1 line-clamp-2 leading-relaxed">
                      {t.content}
                    </p>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleStartEdit(t)}
                      className="p-1.5 rounded-lg text-gray-500 hover:text-sec hover:bg-gray-200 dark:hover:bg-gray-800 transition cursor-pointer"
                      title="ویرایش"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteQuickTemplate(t.id)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition cursor-pointer"
                      title="حذف"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
