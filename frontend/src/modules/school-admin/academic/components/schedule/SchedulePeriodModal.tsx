import React from 'react';
import {
  Layers,
  Clock,
  AlertCircle,
  AlertTriangle,
  ArrowUpDown,
  CheckCircle2,
} from 'lucide-react';
import { Modal } from '../../../../../components/ui/Modal';
import { Button } from '../../../../../components/ui/Button';
import { toPersianDigits } from '../../../../../utils/jalali';
import { PeriodDefinition } from '../../../../../lib/constants/periods';
import { DAYS } from '../../../../student-parent/schedule/StudentSchedulePage';
import { ScheduleFormState } from './types';

interface SchedulePeriodModalProps {
  isOpen: boolean;
  onClose: () => void;
  form: ScheduleFormState;
  setForm: React.Dispatch<React.SetStateAction<ScheduleFormState>>;
  selectedClassroom: any;
  periods: PeriodDefinition[];
  availableLessons: any[];
  teachers: any[];
  error: string | null;
  setError: (err: string | null) => void;
  conflictWarning: string | null;
  setConflictWarning: (w: string | null) => void;
  isSubmitting: boolean;
  onSaveSchedule: (e?: React.FormEvent, forceConflict?: boolean) => void;
  onLessonChange: (lessonId: string) => void;
  onSecondLessonChange: (lessonId: string) => void;
  onSwapSplitOrder: () => void;
}

export const SchedulePeriodModal: React.FC<SchedulePeriodModalProps> = ({
  isOpen,
  onClose,
  form,
  setForm,
  selectedClassroom,
  periods,
  availableLessons,
  teachers,
  error,
  setError,
  conflictWarning,
  setConflictWarning,
  isSubmitting,
  onSaveSchedule,
  onLessonChange,
  onSecondLessonChange,
  onSwapSplitOrder,
}) => {
  const currentPeriodDef = periods.find((p) => p.number === form.periodNumber);
  const isDefaultTime =
    currentPeriodDef &&
    form.startTime === currentPeriodDef.defaultStart &&
    form.endTime === currentPeriodDef.defaultEnd;

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        onClose();
        setError(null);
        setConflictWarning(null);
      }}
      title={`تخصیص درس (${DAYS.find((d) => d.key === form.dayOfWeek)?.label || ''} - ${
        periods.find((p) => p.number === form.periodNumber)?.label || ''
      })`}
      description={selectedClassroom?.name ? `کلاس: ${selectedClassroom.name}` : undefined}
      maxWidth="lg"
    >
      {error && (
        <div className="mb-4 flex items-center space-x-2 space-x-reverse rounded-xl bg-red-50 dark:bg-red-950/30 p-3 text-xs text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Teacher Conflict Warning Card */}
      {conflictWarning && (
        <div className="mb-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-300/80 dark:border-amber-800 p-4 text-xs shadow-xs space-y-3 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-start gap-2.5 text-amber-900 dark:text-amber-200">
            <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="font-extrabold text-sm text-amber-900 dark:text-amber-200">هشدار تداخل مربی</h4>
              <p className="text-amber-800 dark:text-amber-300 leading-relaxed font-medium">{conflictWarning}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-amber-200 dark:border-amber-800">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setConflictWarning(null)}
              className="text-amber-900 dark:text-amber-200 hover:bg-amber-100/70 dark:hover:bg-amber-900/40 text-xs"
            >
              ویرایش
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              isLoading={isSubmitting}
              onClick={() => onSaveSchedule(undefined, true)}
              className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-sm flex items-center gap-1.5"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>ثبت با وجود تداخل</span>
            </Button>
          </div>
        </div>
      )}

      <form onSubmit={onSaveSchedule} className="space-y-4">
        {/* Single Bell (Alternating Weeks) Toggle Switch */}
        <div className="bg-white dark:bg-[#151C28] bg-gradient-to-l from-primary/10 via-primary/5 to-transparent dark:from-primary/20 dark:via-transparent dark:to-transparent rounded-2xl border border-primary/20 dark:border-[#242F42] p-3.5">
          <div
            className="flex items-center justify-between cursor-pointer"
            onClick={() => setForm((f) => ({ ...f, isSplitPeriod: !f.isSplitPeriod }))}
          >
            <div className="flex items-center gap-2.5">
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${
                  form.isSplitPeriod
                    ? 'bg-primary text-white shadow-xs'
                    : 'bg-white dark:bg-[#151C28] text-gray-500 border border-gray-200 dark:border-[#242F42]'
                }`}
              >
                <Layers className="w-4 h-4" />
              </div>
              <div className="font-extrabold text-xs sm:text-sm text-ink-darker dark:text-white flex items-center gap-2">
                <span>یک هفته در میان</span>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-bold transition-colors ${
                    form.isSplitPeriod
                      ? 'bg-primary text-white'
                      : 'bg-gray-100 dark:bg-[#1C2536] text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-[#242F42]'
                  }`}
                >
                  {form.isSplitPeriod ? 'فعال' : 'غیرفعال'}
                </span>
              </div>
            </div>

            {/* Switch Graphic */}
            <button
              type="button"
              role="switch"
              aria-checked={form.isSplitPeriod}
              onClick={(e) => {
                e.stopPropagation();
                setForm((f) => ({ ...f, isSplitPeriod: !f.isSplitPeriod }));
              }}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                form.isSplitPeriod ? 'bg-primary' : 'bg-gray-200 dark:bg-gray-700'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                  form.isSplitPeriod ? '-translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {!form.isSplitPeriod ? (
          /* Standard Full-Period Form */
          <div className="space-y-3.5">
            <div>
              <label className="block text-xs font-bold text-ink-dark dark:text-gray-200 mb-1 text-right">
                درس <span className="text-red-500">*</span>
              </label>
              <select
                value={form.lessonId}
                onChange={(e) => onLessonChange(e.target.value)}
                className="flex h-10 w-full rounded-xl border border-gray-300 bg-white dark:bg-[#151C28] dark:border-[#242F42] px-3.5 text-xs sm:text-sm text-ink-normal dark:text-white focus:outline-none focus:ring-2 focus:ring-primary font-bold"
                required
              >
                <option value="" disabled>
                  -- انتخاب درس --
                </option>
                {availableLessons.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name} ({l.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-ink-dark dark:text-gray-200 mb-1 text-right">
                مربی <span className="text-red-500">*</span>
              </label>
              <select
                value={form.teacherId}
                onChange={(e) => setForm({ ...form, teacherId: e.target.value })}
                className="flex h-10 w-full rounded-xl border border-gray-300 bg-white dark:bg-[#151C28] dark:border-[#242F42] px-3.5 text-xs sm:text-sm text-ink-normal dark:text-white focus:outline-none focus:ring-2 focus:ring-primary font-bold"
                required
              >
                <option value="" disabled>
                  -- انتخاب مربی --
                </option>
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.user?.firstName} {t.user?.lastName}
                  </option>
                ))}
              </select>
            </div>
          </div>
        ) : (
          /* Alternating-Period Form (Week 1 + Week 2 with Reordering) */
          <div className="space-y-3">
            {/* 1st Half (Week 1) */}
            <div className="bg-primary-50/20 dark:bg-primary-950/30 border border-primary/25 dark:border-primary/40 rounded-2xl p-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-primary text-white text-[11px] font-bold">
                  هفته فرد
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-bold text-ink-dark dark:text-gray-200 mb-1">
                    درس <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={form.lessonId}
                    onChange={(e) => onLessonChange(e.target.value)}
                    className="flex h-10 w-full rounded-xl border border-gray-300 bg-white dark:bg-[#151C28] dark:border-[#242F42] px-3 text-xs text-ink-normal dark:text-white focus:outline-none focus:ring-2 focus:ring-primary font-bold"
                    required
                  >
                    <option value="" disabled>
                      -- انتخاب درس --
                    </option>
                    {availableLessons.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name} ({l.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-ink-dark dark:text-gray-200 mb-1">
                    مربی <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={form.teacherId}
                    onChange={(e) => setForm({ ...form, teacherId: e.target.value })}
                    className="flex h-10 w-full rounded-xl border border-gray-300 bg-white dark:bg-[#151C28] dark:border-[#242F42] px-3 text-xs text-ink-normal dark:text-white focus:outline-none focus:ring-2 focus:ring-primary font-bold"
                    required
                  >
                    <option value="" disabled>
                      -- انتخاب مربی --
                    </option>
                    {teachers.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.user?.firstName} {t.user?.lastName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Swap Order Button */}
            <div className="flex items-center justify-center">
              <button
                type="button"
                onClick={onSwapSplitOrder}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-gray-300 dark:border-[#242F42] bg-white dark:bg-[#151C28] hover:bg-gray-100 dark:hover:bg-[#1C2536] hover:text-primary transition-all text-xs font-bold shadow-xs active:scale-95 cursor-pointer"
                title="جابجایی درس و مربی هفته فرد و هفته زوج"
              >
                <ArrowUpDown className="h-3.5 w-3.5 text-primary" />
                <span>جابجایی هفته‌ها</span>
              </button>
            </div>

            {/* 2nd Half (Week 2) */}
            <div className="bg-primary-50/20 dark:bg-primary-950/20 border border-primary/20 dark:border-primary/30 rounded-2xl p-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-primary text-white text-[11px] font-bold">
                  هفته زوج
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-bold text-ink-dark dark:text-gray-200 mb-1">
                    درس هفته زوج
                  </label>
                  <select
                    value={form.secondLessonId || ''}
                    onChange={(e) => onSecondLessonChange(e.target.value)}
                    className="flex h-10 w-full rounded-xl border border-gray-300 bg-white dark:bg-[#151C28] dark:border-[#242F42] px-3 text-xs text-ink-normal dark:text-white focus:outline-none focus:ring-2 focus:ring-primary font-bold"
                  >
                    <option value="">-- بدون کلاس --</option>
                    {availableLessons.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name} ({l.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-ink-dark dark:text-gray-200 mb-1">
                    مربی هفته زوج
                  </label>
                  <select
                    value={form.secondTeacherId || ''}
                    onChange={(e) => setForm({ ...form, secondTeacherId: e.target.value })}
                    className="flex h-10 w-full rounded-xl border border-gray-300 bg-white dark:bg-[#151C28] dark:border-[#242F42] px-3 text-xs text-ink-normal dark:text-white focus:outline-none focus:ring-2 focus:ring-primary font-bold"
                  >
                    <option value="">-- بدون مربی --</option>
                    {teachers.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.user?.firstName} {t.user?.lastName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Standard Period Time Preset Notice */}
        {currentPeriodDef && (
          <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-primary/5 dark:bg-primary-950/30 border border-primary/20 dark:border-primary/40 text-xs">
            <div className="flex items-center gap-1.5 text-ink-darker dark:text-white font-bold">
              <Clock className="w-4 h-4 text-primary shrink-0" />
              <span>ساعت {currentPeriodDef.label}:</span>
              <span className="font-mono text-primary font-black dir-ltr">
                {toPersianDigits(currentPeriodDef.defaultStart)} تا {toPersianDigits(currentPeriodDef.defaultEnd)}
              </span>
            </div>
            {!isDefaultTime && (
              <button
                type="button"
                onClick={() =>
                  setForm((prev) => ({
                    ...prev,
                    startTime: currentPeriodDef.defaultStart,
                    endTime: currentPeriodDef.defaultEnd,
                  }))
                }
                className="text-[11px] font-bold text-primary hover:underline cursor-pointer"
              >
                تنظیم ساعت پیش‌فرض ←
              </button>
            )}
          </div>
        )}

        {/* Time Slot Inputs */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          <div>
            <label className="block text-xs font-medium text-ink-normal dark:text-gray-300 mb-1 text-right">
              ساعت شروع
            </label>
            <input
              type="time"
              value={form.startTime}
              onChange={(e) => setForm({ ...form, startTime: e.target.value })}
              className="flex h-10 w-full rounded-xl border border-gray-300 bg-white dark:bg-[#151C28] dark:border-[#242F42] px-3.5 py-2 text-sm font-mono text-center text-ink-normal dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-ink-normal dark:text-gray-300 mb-1 text-right">
              ساعت پایان
            </label>
            <input
              type="time"
              value={form.endTime}
              onChange={(e) => setForm({ ...form, endTime: e.target.value })}
              className="flex h-10 w-full rounded-xl border border-gray-300 bg-white dark:bg-[#151C28] dark:border-[#242F42] px-3.5 py-2 text-sm font-mono text-center text-ink-normal dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
              required
            />
          </div>
        </div>

        {/* Allow Conflict Checkbox Option */}
        <label className="flex items-center gap-2 p-2.5 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50/60 dark:bg-amber-950/30 hover:bg-amber-100/50 cursor-pointer transition-colors text-xs text-amber-900 dark:text-amber-200">
          <input
            type="checkbox"
            checked={form.allowTeacherConflict}
            onChange={(e) => setForm((prev) => ({ ...prev, allowTeacherConflict: e.target.checked }))}
            className="w-4 h-4 text-amber-600 rounded focus:ring-amber-500 border-amber-300"
          />
          <span className="font-bold">ثبت حتی در صورت تداخل زمانی مربی</span>
        </label>

        <div className="flex justify-end space-x-2 space-x-reverse pt-3 border-t border-gray-100 dark:border-[#242F42]">
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              onClose();
              setError(null);
              setConflictWarning(null);
            }}
          >
            انصراف
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={isSubmitting}
            className={conflictWarning ? 'bg-amber-600 hover:bg-amber-700 font-black shadow-sm' : ''}
          >
            {conflictWarning
              ? 'ثبت با وجود تداخل'
              : form.scheduleId
              ? 'ذخیره تغییرات'
              : 'ثبت درس'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
