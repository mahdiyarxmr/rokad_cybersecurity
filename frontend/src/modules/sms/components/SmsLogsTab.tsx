import React, { useState } from 'react';
import {
  Search,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Clock,
  Eye,
  FileText,
  User,
  PhoneCall,
  Calendar,
  X,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { toPersianDigits, formatToJalali } from '../../../lib/utils';
import { Modal } from '../../../components/ui/Modal';

interface SmsLogsTabProps {
  logs: any[];
  isLoading: boolean;
  totalLogs: number;
  currentPage: number;
  onPageChange: (page: number) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  typeFilter: string;
  onTypeFilterChange: (t: string) => void;
  onRefresh: () => void;
}

export const SmsLogsTab: React.FC<SmsLogsTabProps> = ({
  logs,
  isLoading,
  totalLogs,
  currentPage,
  onPageChange,
  searchQuery,
  onSearchChange,
  typeFilter,
  onTypeFilterChange,
  onRefresh,
}) => {
  const [selectedLog, setSelectedLog] = useState<any | null>(null);

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'AUTO_ABSENCE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-college-light dark:bg-college-darker/60 text-college-darker dark:text-college-light border border-college-normal/30">
            اطلاع‌رسانی غیبت
          </span>
        );
      case 'CHEQUE_REMINDER':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-female-light dark:bg-female-darker/60 text-female-darker dark:text-female-light border border-female-normal/30">
            یادآوری چک
          </span>
        );
      case 'BIRTHDAY_GREETING':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-ecosystem-light dark:bg-ecosystem-darker/60 text-ecosystem-darker dark:text-ecosystem-light border border-primary/30">
            تبریک زادروز
          </span>
        );
      case 'CREDENTIALS':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-male-light dark:bg-male-darker/60 text-male-darker dark:text-male-light border border-male-normal/30">
            مشخصات ورود
          </span>
        );
      case 'MANUAL_BULK':
      case 'MANUAL_DIRECT':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-gray-100 dark:bg-[#1C2536] text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
            ارسال دستی
          </span>
        );
    }
  };

  const formatPersianDate = (dateStr: string) => {
    if (!dateStr) return '---';
    try {
      const d = new Date(dateStr);
      const timeStr = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
      return `${formatToJalali(dateStr)} - ${toPersianDigits(timeStr)}`;
    } catch {
      return dateStr;
    }
  };

  const totalPages = Math.max(1, Math.ceil(totalLogs / 30));

  return (
    <div className="space-y-4">
      {/* Search & Filter Bar */}
      <div className="rokad-card p-4 sm:p-5 bg-white dark:bg-[#151C28] border-[1.5px] border-gray-200 dark:border-gray-800 shadow-[2.75px_2.75px_0_#202A5A] dark:shadow-[2.75px_2.75px_0_#59BBAF]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-gray-400 absolute right-3.5 top-3" />
            <input
              type="text"
              placeholder="جستجو در شماره تلفن، نام گیرنده یا متن پیامک..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pr-10 pl-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-[#FAFAFA] dark:bg-[#1C2536] text-xs font-medium focus:border-primary focus:outline-none"
            />
          </div>

          {/* Filter Chips & Refresh */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
            {[
              { key: '', label: 'همه پیامک‌ها' },
              { key: 'AUTO_ABSENCE', label: 'غیبت و حضور' },
              { key: 'CHEQUE_REMINDER', label: 'سررسید چک' },
              { key: 'BIRTHDAY_GREETING', label: 'زادروزها' },
              { key: 'MANUAL_BULK', label: 'ارسال‌های دستی' },
            ].map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => onTypeFilterChange(f.key)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition cursor-pointer border ${
                  typeFilter === f.key
                    ? 'bg-sec text-white border-sec shadow-[2px_2px_0_#0B0F1F]'
                    : 'bg-gray-100 dark:bg-[#1C2536] text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-gray-300'
                }`}
              >
                {f.label}
              </button>
            ))}

            <button
              type="button"
              onClick={onRefresh}
              className="p-2 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition shrink-0 cursor-pointer"
              title="تازه‌سازی لیست"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Modern Data Table */}
      <div className="rokad-card bg-white dark:bg-[#151C28] border-[1.5px] border-gray-200 dark:border-gray-800 shadow-[2.75px_2.75px_0_#202A5A] dark:shadow-[2.75px_2.75px_0_#59BBAF] overflow-hidden rounded-2xl">
        <div className="overflow-x-auto min-w-[700px]">
          <table className="w-full text-right text-xs">
            <thead className="bg-[#F8F9FA] dark:bg-[#1C2536] border-b border-gray-200 dark:border-gray-800 text-sec dark:text-white font-black">
              <tr>
                <th className="py-3 px-4">گیرنده پیامک</th>
                <th className="py-3 px-4">نوع رویداد</th>
                <th className="py-3 px-4">خلاصه متن</th>
                <th className="py-3 px-4">درگاه / اپراتور</th>
                <th className="py-3 px-4">وضعیت</th>
                <th className="py-3 px-4">زمان مخابره</th>
                <th className="py-3 px-4 text-center">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800 font-medium">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-500 dark:text-gray-400">
                    <span className="inline-block w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mb-2" />
                    <div>در حال بارگذاری لاگ‌های پیامک...</div>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-500 dark:text-gray-400">
                    <FileText className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                    <div>هیچ پیامکی در این بازه یا فیلتر یافت نشد.</div>
                  </td>
                </tr>
              ) : (
                logs.map((log: any) => {
                  const isSent = log.status === 'SENT';
                  return (
                    <tr
                      key={log.id}
                      className="hover:bg-gray-50/70 dark:hover:bg-[#1C2536]/50 transition-colors"
                    >
                      {/* Recipient */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-600 dark:text-gray-300 shrink-0">
                            <User className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <span className="block font-bold text-sec dark:text-white truncate max-w-[130px]">
                              {log.recipientName || 'بدون نام'}
                            </span>
                            <span className="text-[11px] text-gray-500 dark:text-gray-400 font-mono">
                              {toPersianDigits(log.recipientPhone)}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Type Badge */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {getTypeBadge(log.type)}
                      </td>

                      {/* Message Body Snippet */}
                      <td className="py-3 px-4 max-w-[220px]">
                        <p className="truncate text-gray-700 dark:text-gray-300" title={log.message}>
                          {log.message}
                        </p>
                      </td>

                      {/* Provider */}
                      <td className="py-3 px-4 whitespace-nowrap font-mono text-[11px] text-gray-600 dark:text-gray-400">
                        {log.provider || 'AMOOT'}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {isSent ? (
                          <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold">
                            <CheckCircle2 className="w-3.5 h-3.5" /> موفق
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-red-500 dark:text-red-400 font-bold" title={log.errorMessage}>
                            <AlertCircle className="w-3.5 h-3.5" /> ناموفق
                          </span>
                        )}
                      </td>

                      {/* Timestamp */}
                      <td className="py-3 px-4 whitespace-nowrap font-mono text-[11px] text-gray-500 dark:text-gray-400">
                        {formatPersianDate(log.sentAt || log.createdAt)}
                      </td>

                      {/* Action */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setSelectedLog(log)}
                          className="p-1.5 rounded-lg text-gray-600 dark:text-gray-400 hover:text-primary hover:bg-gray-100 dark:hover:bg-gray-800 transition cursor-pointer"
                          title="مشاهده جزئیات کامل پیامک"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 bg-[#F8F9FA] dark:bg-[#1C2536] border-t border-gray-200 dark:border-gray-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <span className="text-gray-500 dark:text-gray-400 font-medium">
            مجموع رکوردها: <strong className="text-sec dark:text-white font-mono">{toPersianDigits(totalLogs)}</strong> پیامک
          </span>

          <div className="flex items-center gap-2 self-end sm:self-center">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => onPageChange(currentPage - 1)}
              className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-40 hover:bg-white dark:hover:bg-gray-800 transition cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <span className="font-mono font-bold px-2 text-gray-700 dark:text-gray-300">
              صفحه {toPersianDigits(currentPage)} از {toPersianDigits(totalPages)}
            </span>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => onPageChange(currentPage + 1)}
              className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-40 hover:bg-white dark:hover:bg-gray-800 transition cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Details Modal */}
      {selectedLog && (
        <Modal
          isOpen={!!selectedLog}
          onClose={() => setSelectedLog(null)}
          title="جزئیات و مشخصات پیامک ارسال‌شده"
        >
          <div className="space-y-4 text-right">
            <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-xs">
              <div>
                <span className="text-gray-400 block mb-0.5">نام گیرنده:</span>
                <strong className="text-sec dark:text-white">{selectedLog.recipientName || 'بدون نام'}</strong>
              </div>
              <div>
                <span className="text-gray-400 block mb-0.5">شماره همراه:</span>
                <strong className="text-sec dark:text-white font-mono">{toPersianDigits(selectedLog.recipientPhone)}</strong>
              </div>
              <div>
                <span className="text-gray-400 block mb-0.5">نوع پیامک:</span>
                {getTypeBadge(selectedLog.type)}
              </div>
              <div>
                <span className="text-gray-400 block mb-0.5">زمان ارسال:</span>
                <span className="font-mono">{formatPersianDate(selectedLog.sentAt || selectedLog.createdAt)}</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                متن ارسالی کامل:
              </label>
              <div className="p-3.5 rounded-xl bg-[#FAFAFA] dark:bg-[#1C2536] border border-gray-200 dark:border-gray-700 text-xs leading-relaxed font-mono whitespace-pre-wrap text-sec dark:text-white">
                {selectedLog.message}
              </div>
            </div>

            {selectedLog.errorMessage && (
              <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs text-red-600 dark:text-red-400">
                <span className="font-bold block mb-1">گزارش خطای وب‌سرویس:</span>
                {selectedLog.errorMessage}
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="rokad-btn-sec px-4 py-2 text-xs font-bold"
              >
                بستن پنجره
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
