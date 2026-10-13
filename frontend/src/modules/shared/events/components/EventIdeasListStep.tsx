import React, { useState, useMemo } from 'react';
import { Button } from '../../../../components/ui/Button';
import { Modal } from '../../../../components/ui/Modal';
import { EventIdea } from './EventIdeaSubmissionStep';
import { toPersianDigits } from '../../../../utils/jalali';
import { useAuthStore } from '../../../../lib/auth/auth-store';
import {
  Sparkles,
  Search,
  User,
  Lightbulb,
  ArrowLeft,
  PlusCircle,
  Edit3,
  Trash2,
  ShieldCheck,
  Hash,
  Eye,
  FileText,
} from 'lucide-react';
import { toast } from '../../../../components/ui/toast/toast';

interface EventIdeasListStepProps {
  ideas: EventIdea[];
  eventId?: string;
  isEventEnded?: boolean;
  onAddIdea?: (newIdea: EventIdea) => void;
  onUpdateIdea?: (updatedIdea: EventIdea) => void;
  onDeleteIdea?: (ideaId: string) => void;
  onSelectIdeaForVote?: (ideaId: string) => void;
}

export const EventIdeasListStep: React.FC<EventIdeasListStepProps> = ({
  ideas,
  eventId = '',
  isEventEnded = false,
  onAddIdea,
  onUpdateIdea,
  onDeleteIdea,
  onSelectIdeaForVote,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIdeaDetail, setSelectedIdeaDetail] = useState<EventIdea | null>(null);
  const currentUser = useAuthStore((s) => s.user);
  const isManager = ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER', 'STAFF'].includes(currentUser?.role || '');

  // Admin Edit Modal State
  const [editingIdea, setEditingIdea] = useState<EventIdea | null>(null);
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    authorName: '',
    ideaNumber: 1,
    status: 'APPROVED' as EventIdea['status'],
  });

  // Admin Add Idea Modal State
  const [isAddIdeaModalOpen, setIsAddIdeaModalOpen] = useState(false);
  const [newIdeaForm, setNewIdeaForm] = useState({
    title: '',
    description: '',
    authorName: '',
    ideaNumber: 1,
  });

  const nextAutoIdeaNumber = useMemo(() => {
    return ideas.reduce((max, item) => Math.max(max, item.ideaNumber || 0), 0) + 1;
  }, [ideas]);

  const handleOpenAddIdeaModal = () => {
    setNewIdeaForm({
      title: '',
      description: '',
      authorName: '',
      ideaNumber: nextAutoIdeaNumber,
    });
    setIsAddIdeaModalOpen(true);
  };

  const handleSaveAdminNewIdea = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIdeaForm.title.trim() || !newIdeaForm.description.trim() || !newIdeaForm.authorName.trim()) {
      toast.error('لطفاً تمام فیلدهای عنوان، شرح و نام ایده‌پرداز را تکمیل کنید.');
      return;
    }

    const created: EventIdea = {
      id: 'idea_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      eventId,
      ideaNumber: Number(newIdeaForm.ideaNumber) || nextAutoIdeaNumber,
      title: newIdeaForm.title.trim(),
      description: newIdeaForm.description.trim(),
      authorName: newIdeaForm.authorName.trim(),
      authorRole: 'دانش‌آموز',
      createdAt: new Date().toISOString(),
      status: 'APPROVED',
      starRatings: [],
    };

    if (onAddIdea) {
      onAddIdea(created);
    }
    setIsAddIdeaModalOpen(false);
    toast.success(`ایده شماره ${toPersianDigits(created.ideaNumber || 1)} با موفقیت افزوده شد.`);
  };

  const filteredIdeas = useMemo(() => {
    return ideas
      .filter((item) => {
        const q = searchQuery.toLowerCase();
        const matchSearch =
          item.title.toLowerCase().includes(q) ||
          item.description.toLowerCase().includes(q) ||
          item.authorName.toLowerCase().includes(q) ||
          (item.ideaNumber && String(item.ideaNumber).includes(q));
        return matchSearch;
      })
      .sort((a, b) => (a.ideaNumber || 0) - (b.ideaNumber || 0));
  }, [ideas, searchQuery]);

  const handleOpenEditModal = (idea: EventIdea, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingIdea(idea);
    setEditForm({
      title: idea.title,
      description: idea.description,
      authorName: idea.authorName,
      ideaNumber: idea.ideaNumber || 1,
      status: idea.status || 'APPROVED',
    });
  };

  const handleSaveAdminEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingIdea) return;

    const updated: EventIdea = {
      ...editingIdea,
      title: editForm.title.trim(),
      description: editForm.description.trim(),
      authorName: editForm.authorName.trim(),
      ideaNumber: Number(editForm.ideaNumber),
      status: editForm.status,
    };

    if (onUpdateIdea) {
      onUpdateIdea(updated);
    }
    setEditingIdea(null);
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="rounded-2xl border-[1.5px] border-primary-dark/30 dark:border-gray-800 bg-white dark:bg-[#151C28] shadow-[2px_2px_0_#59BBAF] dark:shadow-[2px_2px_0_#0B0F17] p-5 sm:p-7 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-lg md:text-xl font-black text-ink-darker dark:text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary shrink-0" />
                <span>گام دوم: تالار ایده‌ها</span>
              </h2>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl border border-primary/20 bg-primary/10 text-primary text-xs font-bold shadow-2xs">
                <Lightbulb className="w-3.5 h-3.5" />
                <span>{toPersianDigits(ideas.length)} ایده ثبت‌شده</span>
              </div>
            </div>
            <p className="text-xs md:text-sm font-medium text-gray-500 dark:text-gray-400 mt-3">
              ایده‌های ارسال‌شده توسط شرکت‌کنندگان را مرور و بررسی کنید.
            </p>
          </div>

          {isManager && !isEventEnded && onAddIdea && (
            <Button
              variant="primary"
              size="sm"
              onClick={handleOpenAddIdeaModal}
              className="gap-2 text-xs font-bold"
            >
              <PlusCircle className="w-4 h-4" />
              <span>ثبت ایده جدید (ادمین)</span>
            </Button>
          )}
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="جستجو در اسم ایده، شماره ایده یا نام دانش‌آموز..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pr-10 pl-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#151C28] text-xs sm:text-[13px] font-medium text-ink-darker dark:text-white focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all shadow-2xs"
          />
        </div>
      </div>

      {/* Ideas Cards Grid */}
      {filteredIdeas.length === 0 ? (
        <div className="rounded-2xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-[#151C28] p-8 sm:p-12 text-center shadow-2xs space-y-3">
          <div className="w-12 h-12 mx-auto rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex items-center justify-center text-amber-500 shadow-2xs">
            <Lightbulb className="w-6 h-6" />
          </div>
          <h3 className="text-base font-black text-ink-darker dark:text-white">ایده‌ای یافت نشد</h3>
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
            هنوز ایده‌ای با مشخصات جستجو شده ثبت نشده است.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredIdeas.map((idea) => {
            const isStudent = currentUser?.role === 'STUDENT';
            const ownerLast = (currentUser?.lastName || '').trim();
            const ownerFirst = (currentUser?.firstName || '').trim();
            const authorLower = (idea.authorName || '').toLowerCase();
            const isCurrentUserIdea =
              isStudent &&
              !!currentUser &&
              ((ownerLast && authorLower.includes(ownerLast.toLowerCase())) ||
                (ownerFirst && authorLower.includes(ownerFirst.toLowerCase())));

            return (
              <div
                key={idea.id}
                className={`group flex flex-col justify-between rounded-2xl border transition-all duration-200 p-5 shadow-2xs hover:shadow-xs ${
                  isCurrentUserIdea
                    ? 'border-primary/40 bg-primary/5 dark:bg-primary/10 ring-2 ring-primary/20'
                    : 'border-gray-200/80 dark:border-gray-800 bg-white dark:bg-[#151C28] hover:border-gray-300 dark:hover:border-gray-700'
                }`}
              >
                <div className="space-y-3.5">
                  {/* Top Bar: Idea Number & Author Name */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-3 py-1.5 rounded-xl border border-primary/30 bg-primary/10 dark:bg-primary/20 text-primary font-black text-xs sm:text-sm shadow-2xs">
                      ایده شماره {toPersianDigits(idea.ideaNumber || 1)}
                    </span>

                    <div className="flex items-center gap-2">
                      <div className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#151C28] text-xs font-bold text-ink-darker dark:text-white shadow-2xs">
                        <User className="w-3.5 h-3.5 text-primary shrink-0" />
                        <span>{idea.authorName}</span>
                      </div>

                      {/* Admin Edit Button */}
                      {isManager && !isEventEnded && (
                        <button
                          type="button"
                          onClick={(e) => handleOpenEditModal(idea, e)}
                          className="p-1.5 w-8 h-8 rounded-lg border border-indigo-200 dark:border-indigo-800 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:text-indigo-300 text-xs font-bold shadow-2xs flex items-center justify-center transition-all cursor-pointer"
                          title="ادیت کامل فیلدهای ایده توسط ادمین"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Title Box & User Idea Badge */}
                  <div className="p-3.5 sm:p-4 rounded-xl border border-gray-200/80 dark:border-gray-700/80 bg-gray-50/70 dark:bg-[#1C2536]/60 flex items-center justify-between gap-3 shadow-2xs">
                    <div className="flex-1 min-w-[130px]">
                      <h3 className="text-lg sm:text-xl font-black text-black dark:text-white leading-tight">
                        {idea.title}
                      </h3>
                    </div>

                    {isCurrentUserIdea && (
                      <span className="shrink-0 px-2.5 py-1 rounded-full border border-primary/30 bg-primary/15 text-primary text-xs font-bold">
                        ایده شما
                      </span>
                    )}
                  </div>
                </div>

                {/* Action Button: View Idea Description */}
                <div className="pt-2">
                  <Button
                    variant="primary"
                    onClick={() => setSelectedIdeaDetail(idea)}
                    className="w-full text-xs sm:text-sm font-bold py-2.5 gap-2 rounded-xl cursor-pointer shadow-sm"
                  >
                    <FileText className="w-4 h-4" />
                    <span>مشاهده شرح ایده</span>
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Idea Detail Modal */}
      <Modal
        isOpen={!!selectedIdeaDetail}
        onClose={() => setSelectedIdeaDetail(null)}
        title="مشخصات و جزئیات کامل ایده"
      >
        {selectedIdeaDetail && (
          <div className="space-y-4">
            {/* Top Bar: Idea Number & Author Badge */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 pb-3 border-b border-gray-100 dark:border-gray-800">
              <span className="px-3.5 py-1.5 rounded-xl border border-primary/30 bg-primary/10 dark:bg-primary/20 text-primary font-black text-xs sm:text-sm shadow-2xs">
                ایده شماره {toPersianDigits(selectedIdeaDetail.ideaNumber || 1)}
              </span>

              <div className="flex items-center gap-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#151C28] text-xs font-bold text-ink-darker dark:text-white shadow-2xs">
                  <User className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span>{selectedIdeaDetail.authorName}</span>
                </div>

                {isManager && !isEventEnded && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      const ideaToEdit = selectedIdeaDetail;
                      setSelectedIdeaDetail(null);
                      handleOpenEditModal(ideaToEdit);
                    }}
                    className="text-xs font-bold gap-1.5 px-3 py-1.5 rounded-xl"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-primary" />
                    <span>ادیت ادمین</span>
                  </Button>
                )}
              </div>
            </div>

            {/* Title Card */}
            <div className="p-3.5 sm:p-4 rounded-2xl border border-gray-200/80 dark:border-gray-700/80 bg-gray-50/70 dark:bg-[#1C2536]/60 shadow-2xs">
              <div className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5 flex items-center gap-1.5">
                <Lightbulb className="w-4 h-4 text-primary" />
                <span>عنوان ایده:</span>
              </div>
              <h3 className="text-base sm:text-lg font-black text-black dark:text-white leading-snug px-0.5">
                {selectedIdeaDetail.title}
              </h3>
            </div>

            {/* Description Card */}
            <div className="p-3.5 sm:p-4 rounded-2xl border border-gray-200/80 dark:border-gray-700/80 bg-gray-50/70 dark:bg-[#1C2536]/60 shadow-2xs">
              <div className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-primary" />
                <span>شرح کامل ایده:</span>
              </div>
              <p className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap px-0.5">
                {selectedIdeaDetail.description}
              </p>
            </div>

            {/* Footer Action */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100 dark:border-gray-800">
              <Button
                type="button"
                variant="primary"
                onClick={() => setSelectedIdeaDetail(null)}
                className="font-bold px-7 py-2.5 rounded-xl shadow-sm text-xs sm:text-sm cursor-pointer"
              >
                <span>بستن</span>
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ADMIN EDIT MODAL */}
      <Modal
        isOpen={!!editingIdea}
        onClose={() => setEditingIdea(null)}
        title="ویرایش مدیریت و ادیت تمام فیلدهای ایده (ادمین)"
      >
        {editingIdea && (
          <form onSubmit={handleSaveAdminEdit} className="space-y-4">
            <div className="p-3 rounded-xl border border-indigo-300 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 text-xs font-black flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-indigo-600" />
              <span>ویرایش ادمین: تمام فیلدهای ایده قابل تغییر است.</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-black text-zinc-800 dark:text-zinc-200 mb-1">
                  شماره ایده:
                </label>
                <input
                  type="number"
                  required
                  value={editForm.ideaNumber}
                  onChange={(e) => setEditForm({ ...editForm, ideaNumber: Number(e.target.value) })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-[#FAFAFA] dark:bg-[#1C2536] text-ink-darker dark:text-white text-xs font-medium focus:border-primary focus:bg-white dark:focus:bg-[#1C2536] focus:outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-zinc-800 dark:text-zinc-200 mb-1">
                  نام ایده‌پرداز:
                </label>
                <input
                  type="text"
                  required
                  value={editForm.authorName}
                  onChange={(e) => setEditForm({ ...editForm, authorName: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-[#FAFAFA] dark:bg-[#1C2536] text-ink-darker dark:text-white text-xs font-medium focus:border-primary focus:bg-white dark:focus:bg-[#1C2536] focus:outline-none transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-black text-zinc-800 dark:text-zinc-200 mb-1">
                اسم ایده:
              </label>
              <input
                type="text"
                required
                value={editForm.title}
                onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-[#FAFAFA] dark:bg-[#1C2536] text-ink-darker dark:text-white text-xs font-medium focus:border-primary focus:bg-white dark:focus:bg-[#1C2536] focus:outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-black text-zinc-800 dark:text-zinc-200 mb-1">
                شرح ایده:
              </label>
              <textarea
                required
                rows={4}
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-[#FAFAFA] dark:bg-[#1C2536] text-ink-darker dark:text-white text-xs font-medium focus:border-primary focus:bg-white dark:focus:bg-[#1C2536] focus:outline-none transition-all"
              />
            </div>

            <div className="flex items-center justify-between gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-800">
              {onDeleteIdea ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    if (window.confirm('آیا از حذف این ایده اطمینان دارید؟')) {
                      onDeleteIdea(editingIdea.id);
                      setEditingIdea(null);
                      toast.info('ایده با موفقیت حذف شد.');
                    }
                  }}
                  className="text-rose-600 border-rose-300 hover:bg-rose-50 dark:border-rose-800 dark:hover:bg-rose-950/40 font-bold gap-1 text-xs"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>حذف ایده</span>
                </Button>
              ) : (
                <div />
              )}

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingIdea(null)}
                  className="font-bold text-xs"
                >
                  انصراف
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  className="font-black text-xs"
                >
                  ذخیره تغییرات ادمین
                </Button>
              </div>
            </div>
          </form>
        )}
      </Modal>

      {/* ADMIN ADD IDEA MODAL */}
      <Modal
        isOpen={isAddIdeaModalOpen}
        onClose={() => setIsAddIdeaModalOpen(false)}
        title="ثبت مستقیم ایده جدید توسط ادمین"
      >
        <form onSubmit={handleSaveAdminNewIdea} className="space-y-4">
          <div className="p-3 rounded-xl border border-primary/30 bg-primary/10 text-primary text-xs font-black flex items-center gap-2">
            <ShieldCheck className="w-4 h-4" />
            <span>مدیر محترم رویداد، می‌توانید ایده جدید را با مشخصات دلخواه ثبت کنید.</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-black text-zinc-800 dark:text-zinc-200 mb-1">
                شماره ایده:
              </label>
              <input
                type="number"
                required
                value={newIdeaForm.ideaNumber}
                onChange={(e) => setNewIdeaForm({ ...newIdeaForm, ideaNumber: Number(e.target.value) })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-[#FAFAFA] dark:bg-[#1C2536] text-ink-darker dark:text-white text-xs font-medium focus:border-primary focus:bg-white dark:focus:bg-[#1C2536] focus:outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-black text-zinc-800 dark:text-zinc-200 mb-1">
                نام دانش‌آموز (ایده‌پرداز):
              </label>
              <input
                type="text"
                required
                placeholder="مثال: علیرضا محمدی"
                value={newIdeaForm.authorName}
                onChange={(e) => setNewIdeaForm({ ...newIdeaForm, authorName: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-[#FAFAFA] dark:bg-[#1C2536] text-ink-darker dark:text-white text-xs font-medium focus:border-primary focus:bg-white dark:focus:bg-[#1C2536] focus:outline-none transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-black text-zinc-800 dark:text-zinc-200 mb-1">
              عنوان ایده:
            </label>
            <input
              type="text"
              required
              placeholder="عنوان ایده جدید..."
              value={newIdeaForm.title}
              onChange={(e) => setNewIdeaForm({ ...newIdeaForm, title: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-[#FAFAFA] dark:bg-[#1C2536] text-ink-darker dark:text-white text-xs font-medium focus:border-primary focus:bg-white dark:focus:bg-[#1C2536] focus:outline-none transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-black text-zinc-800 dark:text-zinc-200 mb-1">
              شرح کامل ایده:
            </label>
            <textarea
              required
              rows={4}
              placeholder="توضیحات و نیازمندی‌های ایده..."
              value={newIdeaForm.description}
              onChange={(e) => setNewIdeaForm({ ...newIdeaForm, description: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-[#FAFAFA] dark:bg-[#1C2536] text-ink-darker dark:text-white text-xs font-medium focus:border-primary focus:bg-white dark:focus:bg-[#1C2536] focus:outline-none transition-all"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsAddIdeaModalOpen(false)}
              className="font-bold text-xs"
            >
              انصراف
            </Button>
            <Button
              type="submit"
              variant="primary"
              className="font-black text-xs"
            >
              ثبت نهایی ایده
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
