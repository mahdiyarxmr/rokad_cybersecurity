import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Shield,
  Search,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  SlidersHorizontal,
  Layers,
  Sparkles,
  RotateCcw,
} from 'lucide-react';
import { rbacApi } from '../api/rbac.api';
import {
  MemberEffectiveDetailResponse,
  EffectivePermissionItem,
  PermissionCatalogItem,
} from '../types/rbac.types';
import { OverrideToggleModal } from './OverrideToggleModal';
import { toPersianDigits } from '../../../../lib/utils';
import { toast } from '../../../../components/ui/toast/toast';
import { useUndoableMutation } from '../../../../lib/hooks/useUndoableMutation';
import { TOAST_MESSAGES } from '../../../../constants/toast-messages';
import { useScrollLock } from '../../../../lib/hooks/useScrollLock';

interface Props {
  userId: string | null;
  onClose: () => void;
  onRefreshMembers: () => void;
}

export const MemberAccessDrawer: React.FC<Props> = ({
  userId,
  onClose,
  onRefreshMembers,
}) => {
  useScrollLock(Boolean(userId));

  const [detail, setDetail] = useState<MemberEffectiveDetailResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterSource, setFilterSource] = useState<string>('ALL');

  // Override modal state
  const [selectedPermForOverride, setSelectedPermForOverride] =
    useState<EffectivePermissionItem | null>(null);

  // Undoable Mutation for removing member override with 5-second countdown
  const { execute: executeUndoableRemoveOverride } = useUndoableMutation<{
    targetUserId: string;
    perm: EffectivePermissionItem;
  }>({
    undoLabel: ({ perm }) => TOAST_MESSAGES.rbac.overrideRemoved(perm.labelFa),
    delayMs: 5000,
    optimisticUpdate: ({ perm }) => {
      setDetail((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          permissions: prev.permissions.map((p) =>
            p.code === perm.code
              ? {
                  ...p,
                  source: p.grantingRoles.length > 0 ? 'SCHOOL_ROLE' : 'NONE',
                  isEffective: p.grantingRoles.length > 0,
                  overrideEffect: null,
                  overrideReason: null,
                }
              : p,
          ),
        };
      });
    },
    mutationFn: async ({ targetUserId, perm }) => {
      await rbacApi.removeMemberOverride(targetUserId, perm.code);
    },
    undoFn: async ({ targetUserId, perm }) => {
      await rbacApi.restoreMemberOverride(targetUserId, perm.code);
    },
    revertUpdate: () => {
      if (userId) {
        rbacApi.getMemberDetail(userId).then((d) => {
          setDetail(d);
          toast.info('حذف استثنای مجوز بازگردانده شد.');
        });
      }
    },
    onSuccess: () => {
      if (userId) {
        rbacApi.getMemberDetail(userId).then(setDetail);
        onRefreshMembers();
      }
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'خطا در حذف استثنای دسترسی');
    },
  });

  useEffect(() => {
    if (!userId) {
      setDetail(null);
      return;
    }

    const fetchDetail = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await rbacApi.getMemberDetail(userId);
        setDetail(data);
      } catch (err: any) {
        const msg = err?.response?.data?.message || err?.message || 'خطا در بارگذاری جزئیات دسترسی';
        setError(msg);
        toast.error(msg);
      } finally {
        setLoading(false);
      }
    };

    fetchDetail();
  }, [userId]);

  const handleSaveOverride = async (effect: 'GRANT' | 'REVOKE', reason?: string) => {
    if (!userId || !selectedPermForOverride) return;
    try {
      await rbacApi.setMemberOverride(userId, {
        permissionCode: selectedPermForOverride.code,
        effect,
        reason,
      });
      toast.success(
        TOAST_MESSAGES.rbac.permissionToggled(
          selectedPermForOverride.labelFa,
          detail?.fullName || 'کاربر',
          effect === 'GRANT',
        ),
      );
      // Refresh detail
      const updated = await rbacApi.getMemberDetail(userId);
      setDetail(updated);
      onRefreshMembers();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'خطا در ثبت استثنای مجوز');
      throw err;
    }
  };

  const handleRemoveOverride = async () => {
    if (!userId || !selectedPermForOverride) return;
    executeUndoableRemoveOverride({
      targetUserId: userId,
      perm: selectedPermForOverride,
    });
  };

  if (!userId) return null;

  const filteredPermissions = (detail?.permissions || []).filter((p) => {
    const matchesSearch =
      !search.trim() ||
      p.labelFa.includes(search.trim()) ||
      p.descriptionFa.includes(search.trim()) ||
      p.code.toLowerCase().includes(search.trim().toLowerCase());

    const matchesSource =
      filterSource === 'ALL' ||
      (filterSource === 'EFFECTIVE' && p.isEffective) ||
      (filterSource === 'OVERRIDE' && (p.source === 'OVERRIDE_GRANT' || p.source === 'OVERRIDE_REVOKE')) ||
      (filterSource === 'ROLES' && p.source === 'SCHOOL_ROLE') ||
      (filterSource === 'NONE' && !p.isEffective);

    return matchesSearch && matchesSource;
  });

  if (!userId) return null;

  return createPortal(
    <>
      <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-xs flex justify-end animate-in fade-in">
        <div className="bg-white dark:bg-[#1E293B] w-full max-w-xl h-full shadow-2xl flex flex-col border-r border-gray-200 dark:border-gray-800 animate-in slide-in-from-left">
          {/* Drawer Header */}
          <div className="p-5 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between bg-gray-50/50 dark:bg-[#0F172A]/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary text-white font-bold flex items-center justify-center text-sm shadow-sm">
                {detail?.fullName?.slice(0, 2) || 'کاربر'}
              </div>
              <div>
                <h3 className="font-black text-base text-ink-dark dark:text-white">
                  {detail ? detail.fullName : 'در حال بارگذاری...'}
                </h3>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400">
                    نقش پایه: {detail?.baseRole}
                  </span>
                  {detail && detail.schoolRoles.length > 0 && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300">
                      {detail.schoolRoles.map((r) => r.name).join('، ')}
                    </span>
                  )}
                </div>
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

          {/* Stats Bar */}
          {detail && (
            <div className="px-5 py-3 bg-primary/5 dark:bg-primary/10 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between text-xs">
              <span className="font-bold text-ink-dark dark:text-white flex items-center gap-1.5">
                <Shield className="h-4 w-4 text-primary" />
                <span>دسترسی‌های مؤثر کاربر:</span>
              </span>
              <span className="font-black text-primary px-2 py-0.5 rounded-md bg-white dark:bg-[#1E293B] shadow-xs">
                {toPersianDigits(detail.totalEffectiveCount)} دسترسی فعال
              </span>
            </div>
          )}

          {/* Search & Filter */}
          <div className="p-4 border-b border-gray-100 dark:border-gray-800 space-y-2">
            <div className="relative">
              <Search className="absolute right-3 top-2.5 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="جستجو در پرمیشن‌ها..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pr-9 pl-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#0F172A] text-ink-dark dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="flex flex-wrap gap-1.5 pt-1">
              {[
                { key: 'ALL', label: 'همه' },
                { key: 'EFFECTIVE', label: 'دارای دسترسی' },
                { key: 'OVERRIDE', label: 'اوررایدهای موردی' },
                { key: 'ROLES', label: 'از طریق نقش‌ها' },
                { key: 'NONE', label: 'فاقد دسترسی' },
              ].map((f) => (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setFilterSource(f.key)}
                  className={`text-[11px] px-2.5 py-1 rounded-lg font-bold transition-colors ${
                    filterSource === f.key
                      ? 'bg-ink-dark text-white dark:bg-white dark:text-ink-dark'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Permissions List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
            {loading ? (
              <div className="text-center py-12 text-xs text-gray-400">در حال بارگذاری دسترسی‌ها...</div>
            ) : error ? (
              <div className="p-4 rounded-xl bg-red-50 text-red-700 text-xs">{error}</div>
            ) : filteredPermissions.length === 0 ? (
              <div className="text-center py-12 text-xs text-gray-400">هیچ موردی با این فیلتر یافت نشد.</div>
            ) : (
              filteredPermissions.map((item) => (
                <div
                  key={item.code}
                  className={`p-3 rounded-xl border transition-all flex flex-col justify-between gap-2 ${
                    item.isEffective
                      ? 'bg-white dark:bg-[#1E293B] border-gray-200 dark:border-gray-800'
                      : 'bg-gray-50/50 dark:bg-[#0F172A]/30 border-gray-100 dark:border-gray-800/60 opacity-65'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        {item.isEffective ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                        ) : (
                          <XCircle className="h-4 w-4 text-gray-400 shrink-0" />
                        )}
                        <span className="font-bold text-xs text-ink-dark dark:text-white">
                          {item.labelFa}
                        </span>
                        {item.isSensitive && (
                          <span title="دسترسی حساس">
                            <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400 line-clamp-1 mt-0.5 pr-6">
                        {item.descriptionFa}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {item.overrideEffect && (
                        <button
                          type="button"
                          onClick={() => executeUndoableRemoveOverride({ targetUserId: userId, perm: item })}
                          title="حذف استثنا و بازگشت به حالت نقش پیش‌فرض"
                          className="px-2 py-1 text-[11px] font-bold rounded-lg border border-red-200 dark:border-red-900/60 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors flex items-center gap-1"
                        >
                          <RotateCcw className="h-3 w-3" />
                          <span>لغو اورراید</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setSelectedPermForOverride(item)}
                        className="px-2 py-1 text-[11px] font-bold rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-primary hover:text-white hover:border-primary transition-colors shrink-0"
                      >
                        {item.overrideEffect ? 'ویرایش' : 'اورراید'}
                      </button>
                    </div>
                  </div>

                  {/* Source and Override Badges */}
                  <div className="flex items-center justify-between text-[10px] pt-1 pr-6">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {item.source === 'BASE_ROLE' && (
                        <span className="px-2 py-0.5 rounded-md font-bold bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                          ارث‌بری از نقش پایه ({detail?.baseRole})
                        </span>
                      )}
                      {item.source === 'SCHOOL_ROLE' && (
                        <span className="px-2 py-0.5 rounded-md font-bold bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300">
                          نقش سازمانی: {item.grantingRoles.join('، ')}
                        </span>
                      )}
                      {item.source === 'OVERRIDE_GRANT' && (
                        <span className="px-2 py-0.5 rounded-md font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          <span>اورراید: اعطا شده (+)</span>
                        </span>
                      )}
                      {item.source === 'OVERRIDE_REVOKE' && (
                        <span className="px-2 py-0.5 rounded-md font-bold bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 flex items-center gap-1">
                          <XCircle className="h-3 w-3" />
                          <span>اورراید: سلب شده (-)</span>
                        </span>
                      )}
                      {item.source === 'NONE' && (
                        <span className="text-gray-400">فاقد مجوز</span>
                      )}
                    </div>

                    <span className="font-mono text-[10px] text-gray-400">{item.code}</span>
                  </div>

                  {item.overrideReason && (
                    <div className="text-[10px] text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/20 px-2 py-1 rounded-md mt-1 pr-6">
                      علت اورراید: {item.overrideReason}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Override Toggle Modal */}
      {selectedPermForOverride && (
        <OverrideToggleModal
          isOpen={!!selectedPermForOverride}
          onClose={() => setSelectedPermForOverride(null)}
          permission={selectedPermForOverride}
          userName={detail?.fullName || ''}
          currentOverrideEffect={selectedPermForOverride.overrideEffect}
          currentReason={selectedPermForOverride.overrideReason}
          onSaveOverride={handleSaveOverride}
          onRemoveOverride={handleRemoveOverride}
        />
      )}
    </>,
    document.body
  );
};
