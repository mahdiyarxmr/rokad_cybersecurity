import React, { useState } from 'react';
import {
  Clock,
  Cake,
  CreditCard,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Play,
  Settings,
  ChevronDown,
  ChevronUp,
  Save,
  Users,
  Shield,
  FileText,
} from 'lucide-react';
import { toPersianDigits } from '../../../lib/utils';
import { toast } from 'sonner';

interface AutomationsTabProps {
  templates: any[];
  onTriggerCheques: () => void;
  onTriggerBirthdays: () => void;
  isTriggeringCheques: boolean;
  isTriggeringBirthdays: boolean;
  onSaveTemplate: (dto: { type: string; title: string; body: string; isActive: boolean }) => void;
}

export const AutomationsTab: React.FC<AutomationsTabProps> = ({
  templates,
  onTriggerCheques,
  onTriggerBirthdays,
  isTriggeringCheques,
  isTriggeringBirthdays,
  onSaveTemplate,
}) => {
  // Local state for expandable template editor
  const [expandedType, setExpandedType] = useState<string | null>(null);
  const [editedBodies, setEditedBodies] = useState<Record<string, string>>({});

  const getTemplate = (type: string) => {
    return templates.find((t: any) => t.type === type) || null;
  };

  const handleToggleExpand = (type: string, defaultBody: string) => {
    if (expandedType === type) {
      setExpandedType(null);
    } else {
      setExpandedType(type);
      if (editedBodies[type] === undefined) {
        const tmpl = getTemplate(type);
        setEditedBodies((prev) => ({
          ...prev,
          [type]: tmpl?.body || defaultBody,
        }));
      }
    }
  };

  const handleSave = (type: string, title: string, currentIsActive: boolean) => {
    const body = editedBodies[type] || getTemplate(type)?.body || '';
    onSaveTemplate({
      type,
      title,
      body,
      isActive: currentIsActive,
    });
    setExpandedType(null);
  };

  const automationsList = [
    {
      type: 'AUTO_ABSENCE',
      title: 'اطلاع‌رسانی فوری غیبت و تأخیر دانش‌آموزان',
      subtitle: 'ارسال پیامک آنی به محض ثبت غیبت در دفتر کلاسی مدرسه',
      icon: Clock,
      theme: 'college',
      timing: 'آنی (هنگام ثبت حضور و غیاب)',
      audience: 'پدر و مادر دانش‌آموز (یا شماره همراه دانش‌آموز)',
      defaultBody:
        'ولی محترم؛ به اطلاع می‌رساند {نام_دانش‌آموز} در تاریخ {تاریخ} در {زنگ}، وضعیت «{وضعیت}» برای ایشان ثبت گردیده است.\nمدرسه رکاد',
      variables: ['{نام_دانش‌آموز}', '{تاریخ}', '{زنگ}', '{وضعیت}', '{تاخیر}'],
      hasManualTrigger: false,
    },
    {
      type: 'CHEQUE_REMINDER',
      title: 'یادآوری خودکار سررسید چک‌های صیادی شهریه',
      subtitle: 'ارسال پیامک یادآوری در ۳ روز مانده، ۱ روز مانده و روز سررسید چک',
      icon: CreditCard,
      theme: 'female',
      timing: 'روزانه رأس ساعت ۰۹:۰۰ صبح',
      audience: 'اولیای دانش‌آموزان و پرداخت‌کنندگان شهریه',
      defaultBody:
        'ولی محترم دانش‌آموز {نام}؛ یادآوری می‌شود سررسید چک شهریه به مبلغ {مبلغ} ریال در تاریخ {تاریخ} ({زمان}) می‌باشد.\nمدرسه رکاد',
      variables: ['{نام}', '{مبلغ}', '{تاریخ}', '{زمان}'],
      hasManualTrigger: true,
      triggerLabel: 'بررسی و اجرای دستی چک‌ها',
      onTrigger: onTriggerCheques,
      isTriggering: isTriggeringCheques,
    },
    {
      type: 'BIRTHDAY_GREETING',
      title: 'تبریک خودکار زادروز دانش‌آموزان و همکاران',
      subtitle: 'ارسال پیام مهرآمیز تبریک تولد به مناسبت سالروز میلاد مخاطبان',
      icon: Cake,
      theme: 'ecosystem',
      timing: 'روزانه رأس ساعت ۰۹:۰۰ صبح',
      audience: 'دانش‌آموزان و کادر آموزشی دارای زادروز امروز',
      defaultBody:
        'گل‌های بوستان تعلیم و تربیت؛ {نام} عزیز زادروزت مبارک باد.\nبا آرزوی توفیق و شادکامی - مجتمع آموزشی رکاد',
      variables: ['{نام}'],
      hasManualTrigger: true,
      triggerLabel: 'بررسی و ارسال زادروزهای امروز',
      onTrigger: onTriggerBirthdays,
      isTriggering: isTriggeringBirthdays,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header Info Box */}
      <div className="rokad-card p-5 sm:p-6 bg-white dark:bg-[#151C28] border-[1.5px] border-gray-200 dark:border-gray-800 shadow-[2.75px_2.75px_0_#202A5A] dark:shadow-[2.75px_2.75px_0_#59BBAF]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-ecosystem-light dark:bg-ecosystem-darker/60 border border-primary/40 flex items-center justify-center text-primary shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-black text-sec dark:text-white">
              مرکز اتوماسیون‌های هوشمند و پیام‌های زمان‌بندی‌شده
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              این پیامک‌ها به‌صورت کاملاً خودکار و در رویدادهای مشخص ارسال می‌شوند. شما می‌توانید متن الگوها را تغییر داده یا اتوماسیون‌ها را به صورت دستی تست کنید.
            </p>
          </div>
        </div>
      </div>

      {/* Cards Grid */}
      <div className="space-y-4">
        {automationsList.map((item) => {
          const tmpl = getTemplate(item.type);
          const isActive = tmpl ? tmpl.isActive : true;
          const isExpanded = expandedType === item.type;
          const currentBody = editedBodies[item.type] !== undefined ? editedBodies[item.type] : (tmpl?.body || item.defaultBody);

          return (
            <div
              key={item.type}
              className="rokad-card p-5 sm:p-6 bg-white dark:bg-[#151C28] border-[1.5px] border-gray-200 dark:border-gray-800 shadow-[2.75px_2.75px_0_#202A5A] dark:shadow-[2.75px_2.75px_0_#59BBAF] transition-all"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div className="p-3 rounded-2xl bg-gray-100 dark:bg-[#1C2536] border border-gray-200 dark:border-gray-700 text-sec dark:text-white shrink-0">
                    <item.icon className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm sm:text-base font-black text-sec dark:text-white">
                        {item.title}
                      </h3>
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                        <CheckCircle2 className="w-3 h-3" /> فعال در سیستم
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {item.subtitle}
                    </p>

                    {/* Meta Specs */}
                    <div className="flex flex-wrap items-center gap-3 mt-3 text-xs">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-[#1C2536] text-gray-700 dark:text-gray-300 font-medium">
                        <Clock className="w-3.5 h-3.5 text-primary" /> زمان اجرا: <strong>{item.timing}</strong>
                      </span>
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-[#1C2536] text-gray-700 dark:text-gray-300 font-medium">
                        <Users className="w-3.5 h-3.5 text-sec dark:text-primary" /> گیرندگان: <strong>{item.audience}</strong>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions: Trigger Button & Edit Button */}
                <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                  {item.hasManualTrigger && (
                    <button
                      type="button"
                      disabled={item.isTriggering}
                      onClick={item.onTrigger}
                      className="rokad-btn-sec px-3.5 py-2 text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      title="اجرای فوری و دستی این سناریو"
                    >
                      {item.isTriggering ? (
                        <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Play className="w-3.5 h-3.5 text-primary" />
                      )}
                      <span>{item.triggerLabel}</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => handleToggleExpand(item.type, item.defaultBody)}
                    className="rokad-btn-outline px-3 py-2 text-xs font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Settings className="w-3.5 h-3.5" />
                    <span>{isExpanded ? 'بستن تنظیمات' : 'ویرایش الگو'}</span>
                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Template Preview Snippet */}
              {!isExpanded && (
                <div className="mt-4 p-3 rounded-xl bg-[#FAFAFA] dark:bg-[#1C2536] border border-gray-200 dark:border-gray-800 text-xs text-gray-600 dark:text-gray-300 font-mono whitespace-pre-wrap leading-relaxed">
                  <span className="text-[10px] text-gray-400 font-sans block mb-1">الگوی فعال پیامک:</span>
                  {tmpl?.body || item.defaultBody}
                </div>
              )}

              {/* Expandable Editor */}
              {isExpanded && (
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-800 space-y-3 animate-in fade-in duration-150">
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300">
                    متن الگوی پیامک خودکار:
                  </label>

                  {/* Variables Helper */}
                  <div className="flex flex-wrap items-center gap-1.5 text-xs">
                    <span className="text-[11px] text-gray-500 font-bold">متغیرهای مجاز:</span>
                    {item.variables.map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setEditedBodies((prev) => ({ ...prev, [item.type]: currentBody + v }))}
                        className="px-2 py-0.5 rounded bg-primary/10 text-primary hover:bg-primary/20 text-xs font-mono font-bold"
                      >
                        + {v}
                      </button>
                    ))}
                  </div>

                  <textarea
                    rows={4}
                    value={currentBody}
                    onChange={(e) => setEditedBodies((prev) => ({ ...prev, [item.type]: e.target.value }))}
                    className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-[#FAFAFA] dark:bg-[#1C2536] text-xs leading-relaxed font-mono focus:border-primary focus:outline-none"
                  />

                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setExpandedType(null)}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition cursor-pointer"
                    >
                      انصراف
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSave(item.type, item.title, isActive)}
                      className="rokad-btn-primary px-4 py-2 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>ذخیره الگوی جدید</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
