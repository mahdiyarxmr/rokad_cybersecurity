import React, { useEffect, useState, useMemo } from 'react';
import {
  Award,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  BookOpen,
  User,
  GraduationCap,
  MessageSquare,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Filter,
} from 'lucide-react';
import { clubApi, ClubMilestoneStatus } from '../../../lib/api/club';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Badge } from '../../../components/ui/Badge';
import { Modal } from '../../../components/ui/Modal';
import { Skeleton } from '../../../components/ui/Skeleton';
import { toast } from '../../../components/ui/toast/toast';
import { toPersianDigits, formatToJalali } from '../../../lib/utils';

export const TeacherClubApprovalsPage: React.FC = () => {
  const [approvals, setApprovals] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | ClubMilestoneStatus>('ALL');

  // Modal action state
  const [selectedApproval, setSelectedApproval] = useState<any | null>(null);
  const [actionType, setActionType] = useState<ClubMilestoneStatus>('APPROVED');
  const [teacherNotes, setTeacherNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchApprovals = async () => {
    try {
      setIsLoading(true);
      const res = await clubApi.getTeacherApprovals();
      const list = Array.isArray(res) ? res : res?.approvals || [];
      setApprovals(list);
    } catch (err: any) {
      toast.error('خطا در دریافت لیست تأییدیه‌های باشگاه');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchApprovals();
  }, []);

  const filteredApprovals = useMemo(() => {
    return approvals.filter((item) => {
      const matchesStatus = statusFilter === 'ALL' || item.status === statusFilter;
      const studentName = `${item.student?.firstName || ''} ${item.student?.lastName || ''}`.toLowerCase();
      const studentCode = (item.student?.studentProfile?.studentCode || '').toLowerCase();
      const lessonName = (item.milestone?.lesson?.name || '').toLowerCase();
      const q = search.trim().toLowerCase();
      const matchesSearch = !q || studentName.includes(q) || studentCode.includes(q) || lessonName.includes(q);
      return matchesStatus && matchesSearch;
    });
  }, [approvals, statusFilter, search]);

  const stats = useMemo(() => {
    const total = approvals.length;
    const pending = approvals.filter((a) => a.status === 'PENDING').length;
    const approved = approvals.filter((a) => a.status === 'APPROVED').length;
    const rejected = approvals.filter((a) => a.status === 'REJECTED').length;
    return { total, pending, approved, rejected };
  }, [approvals]);

  const handleOpenActionModal = (item: any, type: ClubMilestoneStatus) => {
    setSelectedApproval(item);
    setActionType(type);
    setTeacherNotes(item.notes || '');
  };

  const handleConfirmAction = async () => {
    if (!selectedApproval) return;
    try {
      setIsSubmitting(true);
      await clubApi.submitTeacherApproval(selectedApproval.id, {
        status: actionType,
        notes: teacherNotes.trim() || undefined,
      });

      toast.success(
        actionType === 'APPROVED'
          ? 'صلاحیت دانش‌آموز با موفقیت تأیید شد و به نقشه راه اضافه گردید.'
          : 'وضعیت به نیاز به تلاش بیشتر تغییر یافت.'
      );

      setSelectedApproval(null);
      await fetchApprovals();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'خطا در ثبت تأییدیه');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-12" data-theme="club">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#6618CB] via-[#8A38F5] to-[#7828E0] rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden border-2 border-stone-900">
        <div className="absolute top-0 right-0 w-80 h-80 bg-white/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 bg-stone-900/30 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold border border-white/20">
              <Award className="w-4 h-4 text-purple-200" />
              <span>پذیرش و ارزیابی شایستگی‌های باشگاه کسب‌وکار رُکاد</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              تأییدیه‌ها
            </h1>
          </div>

          <div className="grid grid-cols-3 gap-3 self-stretch md:self-auto bg-stone-900/25 p-3 rounded-2xl border border-white/20 backdrop-blur-sm text-center">
            <div className="px-3 py-1">
              <div className="text-2xl font-black text-amber-200">{toPersianDigits(stats.pending)}</div>
              <div className="text-xs text-white/80 font-bold">در انتظار</div>
            </div>
            <div className="px-3 py-1 border-r border-white/20">
              <div className="text-2xl font-black text-emerald-200">{toPersianDigits(stats.approved)}</div>
              <div className="text-xs text-white/80 font-bold">تأیید شده</div>
            </div>
            <div className="px-3 py-1 border-r border-white/20">
              <div className="text-2xl font-black text-white">{toPersianDigits(stats.total)}</div>
              <div className="text-xs text-white/80 font-bold">کل درخواست‌ها</div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search Bar */}
      <div className="bg-white dark:bg-stone-900 rounded-2xl p-4 border border-stone-200 dark:border-stone-800 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="جستجوی دانش‌آموز، کد دانش‌آموزی یا درس..."
            className="pr-10 h-10 text-sm rounded-xl"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              statusFilter === 'ALL'
                ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 shadow'
                : 'text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800'
            }`}
          >
            همه موارد ({toPersianDigits(stats.total)})
          </button>
          <button
            onClick={() => setStatusFilter('PENDING')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
              statusFilter === 'PENDING'
                ? 'bg-amber-500 text-white shadow'
                : 'text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            در انتظار بررسی ({toPersianDigits(stats.pending)})
          </button>
          <button
            onClick={() => setStatusFilter('APPROVED')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
              statusFilter === 'APPROVED'
                ? 'bg-emerald-600 text-white shadow'
                : 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            تأیید شده ({toPersianDigits(stats.approved)})
          </button>
          <button
            onClick={() => setStatusFilter('REJECTED')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
              statusFilter === 'REJECTED'
                ? 'bg-rose-600 text-white shadow'
                : 'text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40'
            }`}
          >
            <XCircle className="w-3.5 h-3.5" />
            نیاز به تلاش مجدد ({toPersianDigits(stats.rejected)})
          </button>
        </div>
      </div>

      {/* Approvals List */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="p-6 bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 space-y-4">
              <div className="flex gap-3">
                <Skeleton className="w-12 h-12 rounded-xl" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
              <Skeleton className="h-8 w-full rounded-lg" />
            </div>
          ))}
        </div>
      ) : filteredApprovals.length === 0 ? (
        <div className="bg-white dark:bg-stone-900 rounded-3xl p-12 text-center border-2 border-dashed border-stone-200 dark:border-stone-800 space-y-4">
          <div className="w-16 h-16 bg-amber-50 dark:bg-amber-950/40 text-amber-500 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
              هیچ درخواست تأییدیه‌ای با این فیلتر یافت نشد
            </h3>
            <p className="text-xs text-stone-500 max-w-md mx-auto">
              هنگامی که دانش‌آموزان به مرحله تأییدیه دروس در نقشه راه باشگاه کسب‌وکار برسند، در این بخش برای ارزیابی شما
              نمایش داده می‌شوند.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredApprovals.map((item) => {
            const student = item.student;
            const milestone = item.milestone;
            const lesson = milestone?.lesson;

            return (
              <div
                key={item.id}
                className="bg-white dark:bg-stone-900 rounded-2xl p-5 border border-stone-200 dark:border-stone-800 hover:border-amber-300 dark:hover:border-amber-700 transition-all shadow-sm flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  {/* Top Row: Student info & Status */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 flex items-center justify-center font-bold text-stone-700 dark:text-stone-200 overflow-hidden shadow-sm">
                        {student?.avatarUrl ? (
                          <img
                            src={student.avatarUrl}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <GraduationCap className="w-6 h-6 text-amber-500" />
                        )}
                      </div>
                      <div>
                        <div className="font-bold text-stone-900 dark:text-white text-base">
                          {student?.firstName} {student?.lastName}
                        </div>
                        <div className="text-xs text-stone-500 font-mono">
                          کد دانش‌آموزی: {toPersianDigits(student?.studentProfile?.studentCode || 'نامشخص')}
                        </div>
                      </div>
                    </div>

                    <div>
                      {item.status === 'APPROVED' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          تأیید شده
                        </span>
                      )}
                      {item.status === 'PENDING' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                          <Clock className="w-3.5 h-3.5" />
                          در انتظار بررسی
                        </span>
                      )}
                      {item.status === 'REJECTED' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
                          <XCircle className="w-3.5 h-3.5" />
                          نیاز به تلاش بیشتر
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Milestone & Lesson Details */}
                  <div className="bg-stone-50 dark:bg-stone-800/60 p-3 rounded-xl border border-stone-100 dark:border-stone-800/80 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between text-stone-700 dark:text-stone-300 font-bold">
                      <div className="flex items-center gap-1.5">
                        <BookOpen className="w-4 h-4 text-amber-500" />
                        <span>درس مربوطه: {lesson?.name || 'عمومی'}</span>
                      </div>
                      <span className="text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-950/80 px-2 py-0.5 rounded-md font-mono">
                        وزن در نقشه راه: {toPersianDigits(milestone?.weight || 0)}%
                      </span>
                    </div>
                    <div className="text-stone-500 leading-relaxed font-normal">
                      عنوان مرحله: <span className="font-semibold text-stone-800 dark:text-stone-200">{milestone?.title}</span>
                    </div>
                    {item.notes && (
                      <div className="pt-1.5 border-t border-stone-200/60 dark:border-stone-700/60 text-stone-600 dark:text-stone-300 flex items-start gap-1.5">
                        <MessageSquare className="w-3.5 h-3.5 text-stone-400 mt-0.5 shrink-0" />
                        <span>یادداشت مربی: {item.notes}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 pt-2 border-t border-stone-100 dark:border-stone-800">
                  <Button
                    onClick={() => handleOpenActionModal(item, 'APPROVED')}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-9 text-xs gap-1.5 rounded-xl"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    تأیید صلاحیت فنی
                  </Button>
                  <Button
                    onClick={() => handleOpenActionModal(item, 'REJECTED')}
                    variant="outline"
                    className="flex-1 border-rose-300 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 font-bold h-9 text-xs gap-1.5 rounded-xl"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    نیاز به تمرین مجدد
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Confirmation & Feedback Modal */}
      {selectedApproval && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedApproval(null)}
          title={
            actionType === 'APPROVED'
              ? 'تأیید صلاحیت دانش‌آموز برای ورود به باشگاه'
              : 'اعلام نیاز به تمرین و تلاش بیشتر'
          }
        >
          <div className="space-y-4">
            <div className="bg-stone-50 dark:bg-stone-800/80 p-3.5 rounded-xl border border-stone-200 dark:border-stone-700 text-xs space-y-1">
              <div className="font-bold text-stone-900 dark:text-white">
                دانش‌آموز: {selectedApproval.student?.firstName} {selectedApproval.student?.lastName}
              </div>
              <div className="text-stone-500">
                مرحله: {selectedApproval.milestone?.title} ({selectedApproval.milestone?.lesson?.name})
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-stone-700 dark:text-stone-300">
                توضیحات و بازخورد مربی (اختیاری):
              </label>
              <textarea
                value={teacherNotes}
                onChange={(e) => setTeacherNotes(e.target.value)}
                placeholder="توصیه‌ها، نقاط قوت یا دلایل نیاز به تمرین بیشتر..."
                rows={3}
                className="w-full text-xs p-3 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-200 dark:border-stone-800">
              <Button
                variant="ghost"
                onClick={() => setSelectedApproval(null)}
                disabled={isSubmitting}
                className="text-xs h-9"
              >
                انصراف
              </Button>
              <Button
                onClick={handleConfirmAction}
                disabled={isSubmitting}
                className={`text-xs h-9 font-bold text-white ${
                  actionType === 'APPROVED' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                {isSubmitting ? 'در حال ثبت...' : actionType === 'APPROVED' ? 'تأیید نهایی' : 'ثبت بازخورد'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
