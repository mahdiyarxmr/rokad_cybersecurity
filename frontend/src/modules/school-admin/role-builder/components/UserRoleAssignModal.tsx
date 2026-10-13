import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Shield, CheckSquare, Square, Save, AlertCircle } from 'lucide-react';
import { MemberAccessItem, SchoolRoleItem } from '../types/rbac.types';
import { rbacApi } from '../api/rbac.api';
import { useScrollLock } from '../../../../lib/hooks/useScrollLock';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  member: MemberAccessItem | null;
  availableRoles: SchoolRoleItem[];
  onSuccess: () => void;
}

export const UserRoleAssignModal: React.FC<Props> = ({
  isOpen,
  onClose,
  member,
  availableRoles,
  onSuccess,
}) => {
  useScrollLock(isOpen && Boolean(member));

  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (member) {
      setSelectedRoleIds(member.schoolRoles.map((r) => r.id));
    } else {
      setSelectedRoleIds([]);
    }
    setError(null);
  }, [member, isOpen]);

  if (!isOpen || !member) return null;

  const toggleRole = (roleId: string) => {
    setSelectedRoleIds((prev) =>
      prev.includes(roleId) ? prev.filter((id) => id !== roleId) : [...prev, roleId],
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      await rbacApi.syncMemberRoles(member.id, selectedRoleIds);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'خطا در به‌روزرسانی نقش‌های کاربر');
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in">
      <div className="bg-white dark:bg-[#1E293B] rounded-2xl w-full max-w-md shadow-2xl border border-gray-200 dark:border-gray-800 p-5 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-black text-sm text-ink-dark dark:text-white">
                تخصیص نقش‌های سازمانی
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                کاربر: <span className="font-bold text-ink-dark dark:text-gray-200">{member.fullName}</span> ({member.baseRole})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-red-50 dark:bg-rose-950/40 text-xs text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-2">
              انتخاب نقش‌های سازمانی برای این کاربر:
            </label>

            {availableRoles.length === 0 ? (
              <div className="p-4 rounded-xl bg-gray-50 dark:bg-[#0F172A] text-xs text-gray-400 text-center">
                هنوز هیچ نقش سازمانی تعریف نشده است. ابتدا در تب نقش‌ها نقش ایجاد کنید.
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {availableRoles.map((role) => {
                  const isChecked = selectedRoleIds.includes(role.id);
                  return (
                    <div
                      key={role.id}
                      onClick={() => toggleRole(role.id)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between select-none ${
                        isChecked
                          ? 'bg-purple-50/70 border-purple-300 dark:bg-purple-950/30 dark:border-purple-700'
                          : 'bg-gray-50 dark:bg-[#0F172A] border-gray-200 dark:border-gray-800 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="text-purple-600 dark:text-purple-400">
                          {isChecked ? (
                            <CheckSquare className="h-4 w-4" />
                          ) : (
                            <Square className="h-4 w-4 text-gray-400" />
                          )}
                        </div>
                        <div>
                          <div className="font-bold text-xs text-ink-dark dark:text-white">
                            {role.name}
                          </div>
                          {role.description && (
                            <div className="text-[10px] text-gray-500 dark:text-gray-400 line-clamp-1">
                              {role.description}
                            </div>
                          )}
                        </div>
                      </div>

                      <span className="text-[10px] bg-white dark:bg-gray-800 px-2 py-0.5 rounded text-gray-500 font-medium">
                        {role.permissions.length} دسترسی
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100 dark:border-gray-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
            >
              انصراف
            </button>
            <button
              type="submit"
              disabled={loading || availableRoles.length === 0}
              className="px-4 py-1.5 text-xs font-bold bg-primary text-white hover:bg-primary-dark rounded-xl shadow-sm flex items-center gap-1.5 disabled:opacity-50"
            >
              <Save className="h-3.5 w-3.5" />
              <span>{loading ? 'در حال ذخیره...' : 'ذخیره نقش‌ها'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
