import React, { useState } from 'react';
import {
  Search,
  Users,
  Shield,
  Sliders,
  Eye,
  AlertTriangle,
  UserCheck,
  GraduationCap,
  Sparkles,
} from 'lucide-react';
import { MemberAccessItem, SchoolRoleItem } from '../types/rbac.types';
import { UserRoleAssignModal } from './UserRoleAssignModal';
import { MemberAccessDrawer } from './MemberAccessDrawer';
import { toPersianDigits } from '../../../../lib/utils';

interface Props {
  members: MemberAccessItem[];
  availableRoles: SchoolRoleItem[];
  staffOnly: boolean;
  onStaffOnlyChange: (staffOnly: boolean) => void;
  search: string;
  onSearchChange: (val: string) => void;
  onRefresh: () => void;
}

export const MembersAccessTab: React.FC<Props> = ({
  members,
  availableRoles,
  staffOnly,
  onStaffOnlyChange,
  search,
  onSearchChange,
  onRefresh,
}) => {
  const [selectedMemberForRoles, setSelectedMemberForRoles] = useState<MemberAccessItem | null>(null);
  const [selectedUserIdForDrawer, setSelectedUserIdForDrawer] = useState<string | null>(null);

  const getBaseRoleBadge = (role: string) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return { label: 'سوپرادمین', color: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' };
      case 'SCHOOL_ADMIN':
        return { label: 'راهبر آموزشگاه', color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300' };
      case 'TEACHER':
        return { label: 'هنرآموز / مربی', color: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300' };
      case 'STAFF':
        return { label: 'کادر اداری', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' };
      case 'COACH':
        return { label: 'کوچ و مشاور', color: 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300' };
      case 'STUDENT':
        return { label: 'دانش‌آموز', color: 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300' };
      case 'PARENT':
        return { label: 'ولی دانش‌آموز', color: 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300' };
      default:
        return { label: role, color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300' };
    }
  };

  return (
    <div className="space-y-6">
      {/* Search & Sub-tabs Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-[#1E293B] p-4 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
        {/* Scope Sub-tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-gray-100 dark:bg-gray-800/80 rounded-xl">
          <button
            type="button"
            onClick={() => onStaffOnlyChange(true)}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
              staffOnly
                ? 'bg-white dark:bg-[#1E293B] text-primary shadow-xs'
                : 'text-gray-600 dark:text-gray-400 hover:text-ink-dark'
            }`}
          >
            پرسنل و معلمان (پیش‌فرض)
          </button>
          <button
            type="button"
            onClick={() => onStaffOnlyChange(false)}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
              !staffOnly
                ? 'bg-white dark:bg-[#1E293B] text-primary shadow-xs'
                : 'text-gray-600 dark:text-gray-400 hover:text-ink-dark'
            }`}
          >
            همه اعضا (شامل دانش‌آموزان و اولیاء)
          </button>
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="absolute right-3 top-2.5 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="جستجو بر اساس نام، شماره همراه، کد ملی..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pr-9 pl-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#0F172A] text-ink-dark dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      {/* Members Table */}
      <div className="bg-white dark:bg-[#1E293B] rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-gray-50 dark:bg-[#0F172A]/80 border-b border-gray-200 dark:border-gray-800 text-gray-500 dark:text-gray-400 font-bold">
              <tr>
                <th className="py-3.5 px-4">کاربر</th>
                <th className="py-3.5 px-4">نقش پایه سیستمی</th>
                <th className="py-3.5 px-4">نقش‌های سازمانی مدرسه</th>
                <th className="py-3.5 px-4">اوررایدهای موردی</th>
                <th className="py-3.5 px-4 text-center">عملیات دسترسی</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-ink-dark dark:text-white">
              {members.map((member) => {
                const baseRoleMeta = getBaseRoleBadge(member.baseRole);

                return (
                  <tr
                    key={member.id}
                    className="hover:bg-gray-50/70 dark:hover:bg-gray-800/40 transition-colors"
                  >
                    {/* User Info */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-xs shrink-0">
                          {member.firstName?.[0] || 'ک'}
                        </div>
                        <div>
                          <div className="font-bold text-ink-dark dark:text-white">
                            {member.fullName}
                          </div>
                          <div className="text-[11px] text-gray-400 font-mono">
                            {member.phone || member.nationalId || '-'}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Base Role */}
                    <td className="py-3.5 px-4">
                      <span className={`px-2.5 py-1 rounded-md text-[11px] font-bold ${baseRoleMeta.color}`}>
                        {baseRoleMeta.label}
                      </span>
                    </td>

                    {/* School Roles */}
                    <td className="py-3.5 px-4">
                      {member.schoolRoles.length === 0 ? (
                        <span className="text-[11px] text-gray-400">بدون نقش سازمانی اضافه</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {member.schoolRoles.map((sr) => (
                            <span
                              key={sr.id}
                              className="px-2 py-0.5 rounded-md font-bold text-[10px] bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200 dark:border-purple-800"
                            >
                              {sr.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>

                    {/* Overrides */}
                    <td className="py-3.5 px-4">
                      {member.overridesCount === 0 ? (
                        <span className="text-[11px] text-gray-400">-</span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full font-bold text-[10px] bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 flex items-center gap-1 w-fit">
                          <AlertTriangle className="h-3 w-3" />
                          <span>{toPersianDigits(member.overridesCount)} تغییر موردی</span>
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedMemberForRoles(member)}
                          className="px-2.5 py-1.5 rounded-lg font-bold text-[11px] border border-gray-200 dark:border-gray-700 hover:bg-purple-50 hover:text-purple-700 dark:hover:bg-purple-950/40 dark:hover:text-purple-300 transition-colors flex items-center gap-1"
                        >
                          <Sliders className="h-3.5 w-3.5" />
                          <span>تغییر نقش‌ها</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setSelectedUserIdForDrawer(member.id)}
                          className="px-2.5 py-1.5 rounded-lg font-bold text-[11px] bg-primary-50 text-primary-dark hover:bg-primary hover:text-white dark:bg-primary-950/40 dark:text-primary-light transition-colors flex items-center gap-1"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          <span>دسترسی مؤثر و اورراید</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {members.length === 0 && (
          <div className="text-center py-12 text-xs text-gray-400">
            هیچ کاربری با این مشخصات یافت نشد.
          </div>
        )}
      </div>

      {/* Role Assignment Modal */}
      {selectedMemberForRoles && (
        <UserRoleAssignModal
          isOpen={!!selectedMemberForRoles}
          onClose={() => setSelectedMemberForRoles(null)}
          member={selectedMemberForRoles}
          availableRoles={availableRoles}
          onSuccess={onRefresh}
        />
      )}

      {/* Member Access Drawer */}
      <MemberAccessDrawer
        userId={selectedUserIdForDrawer}
        onClose={() => setSelectedUserIdForDrawer(null)}
        onRefreshMembers={onRefresh}
      />
    </div>
  );
};
