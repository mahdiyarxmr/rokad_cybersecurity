import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, ShieldAlert, CheckCircle2, XCircle, RotateCcw, Save } from 'lucide-react';
import { PermissionCatalogItem } from '../types/rbac.types';
import { useScrollLock } from '../../../../lib/hooks/useScrollLock';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  permission: PermissionCatalogItem | null;
  userName: string;
  currentOverrideEffect?: 'GRANT' | 'REVOKE' | null;
  currentReason?: string | null;
  onSaveOverride: (effect: 'GRANT' | 'REVOKE', reason?: string) => Promise<void>;
  onRemoveOverride: () => Promise<void>;
}

export const OverrideToggleModal: React.FC<Props> = ({
  isOpen,
  onClose,
  permission,
  userName,
  currentOverrideEffect,
  currentReason,
  onSaveOverride,
  onRemoveOverride,
}) => {
  useScrollLock(isOpen && Boolean(permission));

  const [selectedEffect, setSelectedEffect] = useState<'GRANT' | 'REVOKE' | 'INHERIT'>('GRANT');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (currentOverrideEffect) {
      setSelectedEffect(currentOverrideEffect);
      setReason(currentReason || '');
    } else {
      setSelectedEffect('GRANT');
      setReason('');
    }
    setError(null);
  }, [currentOverrideEffect, currentReason, isOpen]);

  if (!isOpen || !permission) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      if (selectedEffect === 'INHERIT') {
        await onRemoveOverride();
      } else {
        await onSaveOverride(selectedEffect, reason.trim() || undefined);
      }
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'خطا در ثبت تغییرات دسترسی');
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in">
      <div className="bg-white dark:bg-[#1E293B] rounded-2xl w-full max-w-md shadow-2xl border border-gray-200 dark:border-gray-800 p-5 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
          <div>
            <h3 className="font-black text-sm text-ink-dark dark:text-white">
              تنظیم اورراید دسترسی موردی
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              برای کاربر: <span className="font-bold text-ink-dark dark:text-gray-200">{userName}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Permission Info */}
        <div className="p-3 rounded-xl bg-gray-50 dark:bg-[#0F172A] border border-gray-200 dark:border-gray-800 text-xs space-y-1">
          <div className="font-bold text-ink-dark dark:text-white flex items-center justify-between">
            <span>{permission.labelFa}</span>
            <span className="text-[10px] text-gray-400 font-mono">{permission.code}</span>
          </div>
          <p className="text-gray-500 dark:text-gray-400 text-[11px] leading-relaxed">
            {permission.descriptionFa}
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-red-50 dark:bg-rose-950/40 text-xs text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800">
            {error}
          </div>
        )}

        {/* Override Effect Selector */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300">
              نوع اثر اورراید:
            </label>

            <div className="grid grid-cols-3 gap-2">
              {/* GRANT */}
              <button
                type="button"
                onClick={() => setSelectedEffect('GRANT')}
                className={`p-2.5 rounded-xl border text-center transition-all flex flex-col items-center gap-1 text-xs font-bold ${
                  selectedEffect === 'GRANT'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-400 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-600 shadow-sm'
                    : 'bg-gray-50 text-gray-600 border-gray-200 dark:bg-[#0F172A] dark:text-gray-400 dark:border-gray-800 hover:bg-gray-100'
                }`}
              >
                <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <span>اعطای دسترسی (+)</span>
              </button>

              {/* REVOKE */}
              <button
                type="button"
                onClick={() => setSelectedEffect('REVOKE')}
                className={`p-2.5 rounded-xl border text-center transition-all flex flex-col items-center gap-1 text-xs font-bold ${
                  selectedEffect === 'REVOKE'
                    ? 'bg-red-50 text-red-700 border-red-400 dark:bg-red-950/40 dark:text-red-300 dark:border-red-600 shadow-sm'
                    : 'bg-gray-50 text-gray-600 border-gray-200 dark:bg-[#0F172A] dark:text-gray-400 dark:border-gray-800 hover:bg-gray-100'
                }`}
              >
                <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                <span>سلب دسترسی (-)</span>
              </button>

              {/* INHERIT */}
              <button
                type="button"
                onClick={() => setSelectedEffect('INHERIT')}
                className={`p-2.5 rounded-xl border text-center transition-all flex flex-col items-center gap-1 text-xs font-bold ${
                  selectedEffect === 'INHERIT'
                    ? 'bg-blue-50 text-blue-700 border-blue-400 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-600 shadow-sm'
                    : 'bg-gray-50 text-gray-600 border-gray-200 dark:bg-[#0F172A] dark:text-gray-400 dark:border-gray-800 hover:bg-gray-100'
                }`}
              >
                <RotateCcw className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <span>ارث‌بری از نقش</span>
              </button>
            </div>
          </div>

          {selectedEffect !== 'INHERIT' && (
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                دلیل اعطا یا سلب موردی (اختیاری جهت ثبت در لاگ امنیتی):
              </label>
              <textarea
                rows={2}
                placeholder="مثال: واگذاری موقت مسئولیت امور مالی به مناسبت آغاز سال تحصیلی..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#0F172A] text-ink-dark dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          )}

          {/* Footer actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
            >
              انصراف
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-1.5 text-xs font-bold bg-primary text-white hover:bg-primary-dark rounded-xl shadow-sm flex items-center gap-1.5 disabled:opacity-50"
            >
              <Save className="h-3.5 w-3.5" />
              <span>{loading ? 'در حال ثبت...' : 'اعمال اورراید'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
