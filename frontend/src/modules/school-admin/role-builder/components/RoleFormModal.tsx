import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Save,
  CheckSquare,
  Square,
  Shield,
} from 'lucide-react';
import { useScrollLock } from '../../../../lib/hooks/useScrollLock';
import {
  PermissionCatalogResponse,
  SchoolRoleItem,
  CreateSchoolRolePayload,
} from '../types/rbac.types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateSchoolRolePayload) => Promise<void>;
  initialRole?: SchoolRoleItem | null;
  catalog: PermissionCatalogResponse;
}

export const RoleFormModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onSubmit,
  initialRole,
  catalog,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedCodes, setSelectedCodes] = useState<string[]>([]);
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({
    ERP_ACADEMIC: true,
    LMS: true,
    OPERATIONS: true,
    FINANCE: false,
    RBAC: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialRole) {
      setName(initialRole.name);
      setDescription(initialRole.description || '');
      setSelectedCodes(initialRole.permissions.map((p) => p.code));
    } else {
      setName('');
      setDescription('');
      setSelectedCodes([]);
    }
    setError(null);
  }, [initialRole, isOpen]);

  useScrollLock(isOpen);

  if (!isOpen) return null;

  // Natural Language Summary generator
  const naturalLanguageSummary = useMemo(() => {
    if (selectedCodes.length === 0) {
      return 'هنوز هیچ دسترسی برای این نقش انتخاب نشده است.';
    }

    const selectedItems = catalog.permissions.filter((p) => selectedCodes.includes(p.code));
    const labels = selectedItems.map((item) => item.labelFa);

    if (labels.length <= 4) {
      return `کاربر دارنده این نقش می‌تواند: ${labels.join('، ')} را انجام دهد.`;
    }

    const firstFew = labels.slice(0, 4).join('، ');
    const remainingCount = labels.length - 4;
    return `کاربر دارنده این نقش می‌تواند: ${firstFew} و ${remainingCount} مورد دیگر از امکانات سامانه را مدیریت نماید.`;
  }, [selectedCodes, catalog]);

  if (!isOpen) return null;

  const toggleCategory = (catKey: string) => {
    setOpenCategories((prev) => ({ ...prev, [catKey]: !prev[catKey] }));
  };

  const togglePermission = (code: string) => {
    setSelectedCodes((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code],
    );
  };

  const toggleSelectAllCategory = (catKey: string) => {
    const catPerms = catalog.permissions.filter((p) => p.category === catKey);
    const catCodes = catPerms.map((p) => p.code);
    const allSelected = catCodes.every((c) => selectedCodes.includes(c));

    if (allSelected) {
      setSelectedCodes((prev) => prev.filter((c) => !catCodes.includes(c)));
    } else {
      setSelectedCodes((prev) => Array.from(new Set([...prev, ...catCodes])));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('نام نقش را وارد کنید');
      return;
    }
    if (selectedCodes.length === 0) {
      setError('حداقل یک دسترسی برای این نقش انتخاب کنید');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await onSubmit({
        name: name.trim(),
        description: description.trim() || undefined,
        permissionCodes: selectedCodes,
      });
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'خطا در ذخیره‌سازی نقش');
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto">
      <div className="bg-white dark:bg-[#1E293B] rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl border border-gray-200 dark:border-gray-800 animate-in fade-in zoom-in-95">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-black text-lg text-ink-dark dark:text-white">
                {initialRole ? 'ویرایش نقش سازمانی' : 'ساخت نقش سازمانی جدید'}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                تعریف عنوان و چیدمان مجوزهای دسترسی مدرسه
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-5">
          {error && (
            <div className="p-3.5 rounded-xl bg-red-50 dark:bg-rose-950/40 border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Name & Description Inputs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                نام نقش سازمانی <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="مثال: ناظم پایه دهم، مشاور کنکور، حسابدار شعبه"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#0F172A] text-ink-dark dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                توضیحات نقش (اختیاری)
              </label>
              <input
                type="text"
                placeholder="شرح وظایف یا حوزه اختیارات این نقش..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#0F172A] text-ink-dark dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          {/* Natural Language Live Preview */}
          <div className="p-4 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/60">
            <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-400 font-bold text-xs mb-1">
              <Sparkles className="h-4 w-4" />
              <span>پیش‌نمایش کارکرد نقش (خلاصه زبان طبیعی):</span>
            </div>
            <p className="text-xs text-emerald-900 dark:text-emerald-300 leading-relaxed">
              {naturalLanguageSummary}
            </p>
          </div>

          {/* Categorized Permissions Accordions */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-xs text-gray-700 dark:text-gray-300">
                انتخاب دسترسی‌های نقش ({selectedCodes.length} دسترسی انتخاب‌شده):
              </h4>
            </div>

            {catalog.categories.map((cat) => {
              const catPerms = catalog.permissions.filter((p) => p.category === cat.key);
              const catCodes = catPerms.map((p) => p.code);
              const selectedCount = catCodes.filter((c) => selectedCodes.includes(c)).length;
              const isAllSelected = catCodes.length > 0 && selectedCount === catCodes.length;
              const isOpenCat = !!openCategories[cat.key];

              return (
                <div
                  key={cat.key}
                  className="rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden bg-gray-50/50 dark:bg-[#0F172A]/50"
                >
                  {/* Category Header */}
                  <div className="flex items-center justify-between p-3 bg-white dark:bg-[#1E293B]">
                    <button
                      type="button"
                      onClick={() => toggleCategory(cat.key)}
                      className="flex items-center gap-2 text-right flex-1"
                    >
                      {isOpenCat ? (
                        <ChevronUp className="h-4 w-4 text-gray-400" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-gray-400" />
                      )}
                      <div>
                        <span className="font-bold text-xs text-ink-dark dark:text-white">
                          {cat.nameFa}
                        </span>
                        <span className="text-[11px] text-gray-400 dark:text-gray-500 mr-2">
                          ({selectedCount} از {catPerms.length})
                        </span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => toggleSelectAllCategory(cat.key)}
                      className="text-[11px] font-bold text-primary hover:underline px-2 py-1"
                    >
                      {isAllSelected ? 'لغو انتخاب همه' : 'انتخاب همه'}
                    </button>
                  </div>

                  {/* Category Permissions List */}
                  {isOpenCat && (
                    <div className="p-3 pt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 border-t border-gray-200 dark:border-gray-800">
                      {catPerms.map((perm) => {
                        const isChecked = selectedCodes.includes(perm.code);
                        return (
                          <div
                            key={perm.code}
                            onClick={() => togglePermission(perm.code)}
                            className={`p-2.5 rounded-lg border transition-all cursor-pointer flex items-start gap-2.5 select-none ${
                              isChecked
                                ? 'bg-primary/5 border-primary/40 dark:bg-primary/10'
                                : 'bg-white dark:bg-[#1E293B] border-gray-200 dark:border-gray-800 hover:border-gray-300'
                            }`}
                          >
                            <div className="mt-0.5 text-primary shrink-0">
                              {isChecked ? (
                                <CheckSquare className="h-4 w-4" />
                              ) : (
                                <Square className="h-4 w-4 text-gray-400" />
                              )}
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-xs text-ink-dark dark:text-white truncate">
                                  {perm.labelFa}
                                </span>
                                {perm.isSensitive && (
                                  <span title="دسترسی با سطح حساسیت بالا">
                                    <AlertTriangle className="h-3 w-3 text-amber-500 shrink-0" />
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] text-gray-500 dark:text-gray-400 line-clamp-1 mt-0.5">
                                {perm.descriptionFa}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </form>

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#0F172A]/80 rounded-b-2xl">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-xs font-bold rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
          >
            انصراف
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="px-5 py-2 text-xs font-bold rounded-xl bg-primary text-white hover:bg-primary-dark shadow-sm flex items-center gap-1.5 transition-colors disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            <span>{loading ? 'در حال ثبت...' : initialRole ? 'ذخیره تغییرات' : 'ایجاد نقش'}</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
