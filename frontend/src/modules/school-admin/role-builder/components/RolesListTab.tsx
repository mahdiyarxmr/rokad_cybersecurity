import React, { useState } from 'react';
import {
  Plus,
  Users,
  Edit2,
  Trash2,
  Shield,
  AlertCircle,
  Clock,
  Sparkles,
  AlertTriangle,
} from 'lucide-react';
import { SchoolRoleItem } from '../types/rbac.types';
import { formatToJalali, toPersianDigits } from '../../../../lib/utils';

interface Props {
  roles: SchoolRoleItem[];
  onCreateClick: () => void;
  onEditClick: (role: SchoolRoleItem) => void;
  onDeleteClick: (role: SchoolRoleItem) => void;
}

export const RolesListTab: React.FC<Props> = ({
  roles,
  onCreateClick,
  onEditClick,
  onDeleteClick,
}) => {
  return (
    <div className="space-y-6">
      {/* Top Banner & Create Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#1E293B] p-5 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
        <div>
          <h3 className="font-black text-base text-ink-dark dark:text-white flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <span>نقش‌های سازمانی مدرسه ({toPersianDigits(roles.length)} نقش)</span>
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            نقش‌های سفارشی تعریف‌شده در این آموزشگاه جهت تجمیع مجوزهای پرسنل و مربیان
          </p>
        </div>

        <button
          type="button"
          onClick={onCreateClick}
          className="px-4 py-2.5 rounded-xl bg-primary text-white hover:bg-primary-dark shadow-sm text-xs font-bold flex items-center justify-center gap-2 transition-colors shrink-0"
        >
          <Plus className="h-4 w-4" />
          <span>ساخت نقش جدید</span>
        </button>
      </div>

      {/* Roles Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {roles.map((role) => {
          const sensitiveCount = role.permissions.filter((p) => p.isSensitive).length;

          return (
            <div
              key={role.id}
              className="bg-white dark:bg-[#1E293B] rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-md transition-all p-5 flex flex-col justify-between"
            >
              <div>
                {/* Role Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-primary-50 text-primary-dark dark:bg-primary-950/40 dark:text-primary-light">
                      <Shield className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-base text-ink-dark dark:text-white">
                        {role.name}
                      </h4>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[11px] text-gray-500 dark:text-gray-400 flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          <span>{toPersianDigits(role.assignedUsersCount)} عضو منتسب</span>
                        </span>
                        {role.isSystem && (
                          <span className="text-[10px] px-2 py-0.5 rounded-md font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                            نقش پیش‌فرض سیستم
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onEditClick(role)}
                      className="p-2 rounded-lg text-gray-400 hover:text-primary hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                      title="ویرایش نقش"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    {!role.isSystem && (
                      <button
                        type="button"
                        onClick={() => onDeleteClick(role)}
                        className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                        title="حذف نقش"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Description */}
                {role.description && (
                  <p className="text-xs text-gray-600 dark:text-gray-300 mt-3 line-clamp-2 leading-relaxed">
                    {role.description}
                  </p>
                )}

                {/* Permissions Chips */}
                <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800">
                  <div className="flex items-center justify-between text-xs font-bold text-gray-700 dark:text-gray-300 mb-2">
                    <span>دسترسی‌های فعال ({toPersianDigits(role.permissions.length)} مورد):</span>
                    {sensitiveCount > 0 && (
                      <span className="flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400 font-normal">
                        <AlertTriangle className="h-3 w-3" />
                        <span>{toPersianDigits(sensitiveCount)} دسترسی حساس</span>
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                    {role.permissions.slice(0, 7).map((p) => (
                      <span
                        key={p.code}
                        className={`text-[11px] px-2 py-0.5 rounded-md font-medium border ${
                          p.isSensitive
                            ? 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800/50'
                            : 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700'
                        }`}
                      >
                        {p.labelFa}
                      </span>
                    ))}
                    {role.permissions.length > 7 && (
                      <span className="text-[11px] px-2 py-0.5 rounded-md bg-gray-50 text-gray-500 dark:bg-gray-800/60 dark:text-gray-400">
                        +{toPersianDigits(role.permissions.length - 7)} دسترسی دیگر...
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Footer info */}
              <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-[11px] text-gray-400 dark:text-gray-500">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span>ثبت: {formatToJalali(role.createdAt)}</span>
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {roles.length === 0 && (
        <div className="text-center py-16 bg-white dark:bg-[#1E293B] rounded-2xl border border-gray-200 dark:border-gray-800">
          <Shield className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <h4 className="font-bold text-sm text-ink-dark dark:text-white">
            هنوز هیچ نقش سازمانی برای این مدرسه تعریف نشده است
          </h4>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-sm mx-auto">
            با کلیک بر روی دکمه «ساخت نقش جدید»، نقش‌هایی مانند ناظم، مشاور تحصیلی یا حسابدار ایجاد کنید.
          </p>
          <button
            type="button"
            onClick={onCreateClick}
            className="mt-4 px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-dark"
          >
            ساخت اولین نقش
          </button>
        </div>
      )}
    </div>
  );
};
