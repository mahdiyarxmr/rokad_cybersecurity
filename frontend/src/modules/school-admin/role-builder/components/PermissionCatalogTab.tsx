import React, { useState } from 'react';
import {
  Search,
  AlertTriangle,
  GraduationCap,
  BarChart3,
  CalendarDays,
  Receipt,
  ShieldCheck,
  Shield,
  Layers,
  Compass,
  BookOpen,
  Building2,
  Clock,
  UserPlus,
  Users,
  UserCheck,
  Target,
  HeartHandshake,
  Link,
  HelpCircle,
  FileCheck,
  Sparkles,
  Wallet,
  Sliders,
  Calendar,
} from 'lucide-react';
import { PermissionCatalogResponse } from '../types/rbac.types';

interface Props {
  catalog: PermissionCatalogResponse;
}

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  GraduationCap,
  BarChart3,
  CalendarDays,
  Receipt,
  ShieldCheck,
  Shield,
  Layers,
  Compass,
  BookOpen,
  Building2,
  Clock,
  UserPlus,
  Users,
  UserCheck,
  Target,
  HeartHandshake,
  Link,
  HelpCircle,
  FileCheck,
  Sparkles,
  Wallet,
  Sliders,
  Calendar,
};

export const PermissionCatalogTab: React.FC<Props> = ({ catalog }) => {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  const filteredPermissions = catalog.permissions.filter((p) => {
    const matchesCat = selectedCategory === 'ALL' || p.category === selectedCategory;
    const matchesSearch =
      !search.trim() ||
      p.labelFa.includes(search.trim()) ||
      p.descriptionFa.includes(search.trim()) ||
      p.code.toLowerCase().includes(search.trim().toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header Info & Search Filter */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-[#1E293B] p-4 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setSelectedCategory('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              selectedCategory === 'ALL'
                ? 'bg-primary text-white shadow-sm'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            همه دسته‌ها ({catalog.totalCount})
          </button>
          {catalog.categories.map((cat) => {
            const count = catalog.permissions.filter((p) => p.category === cat.key).length;
            const isSelected = selectedCategory === cat.key;
            return (
              <button
                key={cat.key}
                type="button"
                onClick={() => setSelectedCategory(cat.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-primary text-white shadow-sm'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                <span>{cat.nameFa}</span>
                <span className="opacity-70 text-[10px]">({count})</span>
              </button>
            );
          })}
        </div>

        <div className="relative w-full md:w-72">
          <Search className="absolute right-3 top-2.5 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="جستجو در نام، توضیح یا کلید..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pr-9 pl-3 py-2 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#0F172A] text-ink-dark dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      {/* Grid of Permission Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredPermissions.map((item) => {
          const IconComp = ICON_MAP[item.icon] || Shield;
          return (
            <div
              key={item.code}
              className={`p-4 rounded-xl border transition-all flex flex-col justify-between bg-white dark:bg-[#1E293B] shadow-sm hover:shadow-md ${
                item.isSensitive
                  ? 'border-amber-300/80 dark:border-amber-700/60 bg-amber-50/20 dark:bg-amber-950/10'
                  : 'border-gray-200 dark:border-gray-800'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <div
                      className={`p-2 rounded-lg ${
                        item.isSensitive
                          ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                          : 'bg-primary-50 text-primary-dark dark:bg-primary-950/40 dark:text-primary-light'
                      }`}
                    >
                      <IconComp className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-ink-dark dark:text-white leading-tight">
                        {item.labelFa}
                      </h4>
                      <span className="text-[10px] text-gray-400 dark:text-gray-500 font-mono">
                        {item.code}
                      </span>
                    </div>
                  </div>

                  {item.isSensitive && (
                    <span
                      title="این دسترسی حساس و نیازمند مراقبت امنیتی ویژه است"
                      className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800 shrink-0"
                    >
                      <AlertTriangle className="h-3 w-3" />
                      <span>حساس</span>
                    </span>
                  )}
                </div>

                <p className="text-xs text-gray-600 dark:text-gray-300 line-clamp-2 mt-1 leading-relaxed">
                  {item.descriptionFa}
                </p>
              </div>

              <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800/80 flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400">
                <span>{item.categoryFa}</span>
                <span className="text-[10px] bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded font-medium">
                  {item.category}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {filteredPermissions.length === 0 && (
        <div className="text-center py-12 bg-white dark:bg-[#1E293B] rounded-xl border border-gray-200 dark:border-gray-800">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            هیچ دسترسی با فیلترهای انتخابی شما یافت نشد.
          </p>
        </div>
      )}
    </div>
  );
};
