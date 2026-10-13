import React from 'react';
import { Smartphone, Wifi, Battery, MessageSquare, ShieldCheck, Calculator, Coins } from 'lucide-react';
import { toPersianDigits } from '../../../lib/utils';

interface SmsLivePhonePreviewProps {
  messageText: string;
  senderName?: string;
  targetDescription?: string;
  smsParts?: number;
  charCount?: number;
  singleCostTomans?: number;
  totalCostTomans?: number;
  estimatedRecipients?: number;
  creditAfterSendTomans?: number;
  isConfigLoading?: boolean;
}

export const SmsLivePhonePreview: React.FC<SmsLivePhonePreviewProps> = ({
  messageText,
  senderName = 'سامانه هوشمند رُکاد',
  targetDescription = 'اولیای محترم دانش‌آموز',
  smsParts = 1,
  charCount = 0,
  singleCostTomans = 0,
  totalCostTomans = 0,
  estimatedRecipients = 0,
  creditAfterSendTomans = 0,
  isConfigLoading = false,
}) => {
  return (
    <div className="sticky top-6 flex flex-col items-center">
      {/* Phone Frame Outer Shadow */}
      <div className="relative w-full max-w-[310px] sm:max-w-[330px] rounded-[42px] p-3 bg-[#1F2937] dark:bg-[#0B0F17] border-[3px] border-[#202A5A] dark:border-[#59BBAF] shadow-[5px_5px_0_#202A5A] dark:shadow-[5px_5px_0_#59BBAF] transition-all duration-300">
        
        {/* Phone Speaker Notch / Dynamic Island */}
        <div className="absolute top-5 left-1/2 -translate-x-1/2 w-28 h-5 bg-black rounded-full z-20 flex items-center justify-between px-3">
          <div className="w-2.5 h-2.5 rounded-full bg-[#1F2937]/80" />
          <div className="w-3 h-3 rounded-full bg-[#111827] border border-gray-700 flex items-center justify-center">
            <div className="w-1 h-1 rounded-full bg-blue-500/80 animate-pulse" />
          </div>
        </div>

        {/* Phone Screen Inner Container */}
        <div className="relative w-full h-[520px] rounded-[32px] bg-[#F4F5F7] dark:bg-[#151C28] flex flex-col overflow-hidden text-right select-none border border-gray-300/60 dark:border-gray-700/60">
          
          {/* Top Status Bar */}
          <div className="pt-2 px-5 pb-1 flex items-center justify-between text-[11px] text-gray-600 dark:text-gray-400 font-bold z-10 font-mono">
            <span>{toPersianDigits('09:41')}</span>
            <div className="flex items-center gap-1.5">
              <Wifi className="w-3 h-3" />
              <Battery className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* Messages App Header */}
          <div className="pt-4 pb-3 px-4 bg-white/95 dark:bg-[#1C2536]/95 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800 flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-[#59BBAF]/20 text-[#1F413D] dark:text-[#59BBAF] border border-[#59BBAF]/40 flex items-center justify-center font-bold text-xs">
                <MessageSquare className="w-4 h-4" />
              </div>
              <div className="leading-tight">
                <h4 className="text-xs font-black text-sec dark:text-white truncate max-w-[170px]">
                  {senderName}
                </h4>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                  <ShieldCheck className="w-2.5 h-2.5" /> خط خدماتی تأییدشده
                </span>
              </div>
            </div>
          </div>

          {/* Messages Chat Stream Body */}
          <div className="flex-1 p-3.5 overflow-y-auto space-y-3 flex flex-col justify-end">
            {/* Timestamp Badge */}
            <div className="text-center my-1">
              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-gray-200/70 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                امروز، {toPersianDigits('09:41')}
              </span>
            </div>

            {/* Simulated SMS Bubble */}
            <div className="flex flex-col items-start w-full max-w-[88%] self-start animate-in fade-in slide-in-from-bottom-2 duration-200">
              <div className="p-3 rounded-2xl rounded-tr-xs bg-white dark:bg-[#202A5A] text-gray-800 dark:text-gray-100 border border-gray-200/90 dark:border-[#3F50A0] shadow-xs text-xs sm:text-[12.5px] leading-relaxed break-words [overflow-wrap:anywhere] [word-break:break-word] font-medium whitespace-pre-wrap max-w-full">
                {messageText.trim() ? (
                  messageText
                ) : (
                  <span className="text-gray-400 dark:text-gray-500 italic">
                    متن پیامک شما در این قسمت به‌صورت لحظه‌ای نمایش داده خواهد شد...
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between w-full px-1.5 mt-1 text-[10px] text-gray-400 dark:text-gray-500 font-mono">
                <span className="truncate max-w-[140px]">تحویل به: {targetDescription}</span>
                <span className="shrink-0">{toPersianDigits('09:41')}</span>
              </div>
            </div>
          </div>

          {/* SMS Counter & Tech Stats Bar inside phone */}
          <div className="p-2.5 bg-white dark:bg-[#1C2536] border-t border-gray-200 dark:border-gray-800 space-y-1.5 text-[11px] font-bold text-gray-600 dark:text-gray-300">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-primary" />
                <span>{toPersianDigits(charCount)} کاراکتر</span>
              </div>
              <div className="px-2 py-0.5 rounded-lg bg-ecosystem-light dark:bg-ecosystem-darker/60 text-primary-darker dark:text-primary border border-primary/30 font-mono text-[10px] font-bold">
                {toPersianDigits(smsParts)} پارت
              </div>
            </div>

            {/* Amoot Real-time Cost Estimation */}
            <div className="pt-1.5 border-t border-dashed border-gray-200 dark:border-gray-700/80 flex items-center justify-between text-[10px]">
              <span className="text-gray-500 dark:text-gray-400">کسر از حساب:</span>
              <span className="font-mono font-black text-sec dark:text-white">
                {isConfigLoading ? '...' : `${toPersianDigits(singleCostTomans.toLocaleString())} تومان`}
              </span>
            </div>
          </div>

          {/* Virtual Home Bar */}
          <div className="pb-1.5 pt-1 flex justify-center bg-white dark:bg-[#1C2536]">
            <div className="w-24 h-1 rounded-full bg-gray-400 dark:bg-gray-600" />
          </div>
        </div>
      </div>

      {/* Floating Real-time Billing Breakdown under Phone (Neo-Brutalist Rokad Card) */}
      <div className="mt-3.5 w-full max-w-[310px] sm:max-w-[330px] rokad-card p-3.5 rounded-2xl bg-white dark:bg-[#151C28] border-[1.5px] border-[#202A5A]/20 dark:border-primary/40 shadow-[2.75px_2.75px_0_#202A5A] dark:shadow-[2.75px_2.75px_0_#59BBAF] space-y-2 text-xs">
        <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-1.5 font-black text-sec dark:text-white">
            <Calculator className="w-3.5 h-3.5 text-primary" />
            <span>برآورد هزینه</span>
          </div>
          <span className="font-mono text-[11px] text-gray-500 dark:text-gray-400">
            {toPersianDigits(estimatedRecipients)} مخاطب
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-gray-500 dark:text-gray-400">هزینه هر پیامک:</span>
          <span className="font-mono font-bold text-sec dark:text-white">
            {isConfigLoading ? '...' : `${toPersianDigits(singleCostTomans.toLocaleString())} تومان`}
          </span>
        </div>

        <div className="pt-1.5 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between font-bold">
          <div className="flex flex-col">
            <span className="text-sec dark:text-white">کل کسر از شارژ:</span>
            {estimatedRecipients > 0 && (
              <span className="text-[10px] text-gray-400 font-mono font-normal">
                {toPersianDigits(estimatedRecipients)} × {toPersianDigits(singleCostTomans.toLocaleString())}
              </span>
            )}
          </div>
          <span className="font-mono text-sm font-black text-primary-darker dark:text-primary">
            {isConfigLoading ? '...' : `${toPersianDigits(totalCostTomans.toLocaleString())} تومان`}
          </span>
        </div>

        <div className="flex items-center justify-between text-[11px]">
          <span className="text-gray-500 dark:text-gray-400">مانده پس از ارسال:</span>
          <span className="font-mono font-medium">
            {isConfigLoading ? (
              <span className="text-gray-400">...</span>
            ) : creditAfterSendTomans < 0 ? (
              <span className="text-red-500 dark:text-red-400 font-bold" title="کسری شارژ">
                {toPersianDigits(Math.abs(creditAfterSendTomans).toLocaleString())}- ت (کسری)
              </span>
            ) : (
              <span className="text-sec dark:text-gray-300 font-bold">
                {toPersianDigits(creditAfterSendTomans.toLocaleString())} تومان
              </span>
            )}
          </span>
        </div>
      </div>

      <div className="mt-2.5 flex items-center gap-1.5 text-[11px] text-gray-400 font-medium">
        <Smartphone className="w-3.5 h-3.5 text-primary" />
        <span>پیش‌نمایش در موبایل</span>
      </div>
    </div>
  );
};
