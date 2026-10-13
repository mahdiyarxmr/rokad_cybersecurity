import React, { useEffect, useState } from 'react';
import { apiClient } from '../../../lib/api/client';
import { useAuthStore } from '../../../lib/auth/auth-store';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Badge } from '../../../components/ui/Badge';
import { Modal } from '../../../components/ui/Modal';
import { Skeleton } from '../../../components/ui/Skeleton';
import { PersianDatePicker } from '../../../components/ui/PersianDatePicker';
import { ResponsivePageHeader } from '../../../components/ui/ResponsivePageHeader';
import {
  formatJalaliDisplay,
  toPersianDigits,
  gregorianToJalaliStr,
} from '../../../utils/jalali';
import {
  Calendar,
  Clock,
  UserCheck,
  Plus,
  Video,
  MapPin,
  AlertCircle,
  CheckCircle2,
  Users,
  Trash2,
  ExternalLink,
  MessageSquare,
} from 'lucide-react';

interface VisitSlot {
  id: string;
  teacherId: string;
  date: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  capacityPerSlot: number;
  roomLocation?: string;
  isVirtual: boolean;
  virtualMeetingUrl?: string;
  isCancelled: boolean;
  bookings: { id: string }[];
}

interface VisitBooking {
  id: string;
  slotId: string;
  parentId: string;
  studentId: string;
  subject: string;
  status: 'CONFIRMED' | 'CANCELLED';
  createdAt: string;
  slot: VisitSlot;
  parent: {
    user: {
      firstName: string;
      lastName: string;
      phoneNumber?: string;
    };
  };
  student: {
    user: {
      firstName: string;
      lastName: string;
    };
  };
}

export const TeacherVisitsPage: React.FC = () => {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'SLOTS' | 'BOOKINGS'>('SLOTS');
  const [slots, setSlots] = useState<VisitSlot[]>([]);
  const [bookings, setBookings] = useState<VisitBooking[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Create Slot Modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSubmittingSlot, setIsSubmittingSlot] = useState(false);
  const [slotError, setSlotError] = useState<string | null>(null);

  const [form, setForm] = useState({
    date: gregorianToJalaliStr(new Date()),
    startTime: '10:00',
    endTime: '10:20',
    durationMinutes: 20,
    capacityPerSlot: 1,
    roomLocation: 'دفتر اساتید و مشاوره',
    isVirtual: false,
    virtualMeetingUrl: '',
  });

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [slotsRes, bookingsRes] = await Promise.all([
        apiClient.get<VisitSlot[]>('/parent-visits/slots'),
        apiClient.get<VisitBooking[]>('/parent-visits/my-bookings'),
      ]);
      setSlots(slotsRes.data || []);
      setBookings(bookingsRes.data || []);
    } catch (err: any) {
      console.error('Failed to load teacher visit data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateSlotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingSlot(true);
    setSlotError(null);

    try {
      await apiClient.post('/parent-visits/slots', {
        date: form.date,
        startTime: form.startTime,
        endTime: form.endTime,
        durationMinutes: Number(form.durationMinutes),
        capacityPerSlot: Number(form.capacityPerSlot),
        roomLocation: form.roomLocation || undefined,
        isVirtual: form.isVirtual,
        virtualMeetingUrl: form.isVirtual ? form.virtualMeetingUrl : undefined,
      });

      setIsCreateModalOpen(false);
      setForm({
        date: gregorianToJalaliStr(new Date()),
        startTime: '10:00',
        endTime: '10:20',
        durationMinutes: 20,
        capacityPerSlot: 1,
        roomLocation: 'دفتر اساتید و مشاوره',
        isVirtual: false,
        virtualMeetingUrl: '',
      });
      await fetchData();
    } catch (err: any) {
      setSlotError(err.response?.data?.message || 'خطا در ثبت اسلات ملاقات');
    } finally {
      setIsSubmittingSlot(false);
    }
  };

  const handleDeleteSlot = async (slotId: string) => {
    if (!window.confirm('آیا از حذف یا لغو این اسلات زمانی اطمینان دارید؟')) return;
    try {
      await apiClient.delete(`/parent-visits/slots/${slotId}`);
      await fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'خطا در حذف اسلات');
    }
  };

  const confirmedBookings = bookings.filter((b) => b.status === 'CONFIRMED');

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      <ResponsivePageHeader
        title="ملاقات با اولیاء"
        icon={<UserCheck className="h-5 w-5 text-purple-600" />}
        actions={
          <Button
            onClick={() => setIsCreateModalOpen(true)}
            className="w-full sm:w-auto flex items-center justify-center gap-1.5 shadow-xs font-medium text-xs h-9 sm:h-10"
          >
            <Plus className="w-4 h-4" />
            <span>تعریف زمان ملاقات جدید</span>
          </Button>
        }
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-4">
        <Card className="p-3 sm:p-4 border border-border/60 bg-surface/30">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs text-muted-foreground">کل اسلات‌های فعال</span>
            <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-500" />
          </div>
          <div className="text-base sm:text-lg md:text-xl font-bold text-foreground mt-1 sm:mt-2">
            {slots.filter((s) => !s.isCancelled).length}
          </div>
        </Card>

        <Card className="p-3 sm:p-4 border border-border/60 bg-surface/30">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs text-muted-foreground">نوبت‌های رزرو شده</span>
            <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-500" />
          </div>
          <div className="text-base sm:text-lg md:text-xl font-bold text-foreground mt-1 sm:mt-2">
            {confirmedBookings.length}
          </div>
        </Card>

        <Card className="p-3 sm:p-4 border border-border/60 bg-surface/30 col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs text-muted-foreground">جلسات مجازی برخط</span>
            <Video className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
          </div>
          <div className="text-base sm:text-lg md:text-xl font-bold text-foreground mt-1 sm:mt-2">
            {slots.filter((s) => s.isVirtual && !s.isCancelled).length}
          </div>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-border/60 pb-3">
        <button
          onClick={() => setActiveTab('SLOTS')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
            activeTab === 'SLOTS'
              ? 'bg-purple-600 text-white shadow-sm'
              : 'text-muted-foreground hover:bg-surface hover:text-foreground'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>اسلات‌های زمانی من</span>
        </button>
        <button
          onClick={() => setActiveTab('BOOKINGS')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
            activeTab === 'BOOKINGS'
              ? 'bg-purple-600 text-white shadow-sm'
              : 'text-muted-foreground hover:bg-surface hover:text-foreground'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>ملاقات‌های رزرو شده ({confirmedBookings.length})</span>
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'SLOTS' ? (
        <div>
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Skeleton className="h-44 rounded-2xl" />
              <Skeleton className="h-44 rounded-2xl" />
            </div>
          ) : slots.length === 0 ? (
            <div className="text-center py-16 bg-surface/20 rounded-2xl border border-dashed border-border/60">
              <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-40" />
              <h3 className="text-base font-semibold text-foreground">هنوز اسلاتی تعریف نکرده‌اید</h3>
              <p className="text-sm text-muted-foreground mt-1">
                برای رزرو اولیا، از دکمه «تعریف زمان ملاقات جدید» استفاده فرمایید.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {slots.map((slot) => {
                const isCancelled = slot.isCancelled;
                const bookedCount = slot.bookings?.length || 0;

                return (
                  <Card
                    key={slot.id}
                    className={`p-5 border transition-all flex flex-col justify-between ${
                      isCancelled
                        ? 'bg-surface/20 border-border/30 opacity-60'
                        : 'border-border/60 hover:border-purple-500/40 shadow-xs'
                    }`}
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-foreground text-base">
                              {formatJalaliDisplay(slot.date, true)}
                            </h3>
                            <Badge variant={isCancelled ? 'destructive' : slot.isVirtual ? 'college' : 'default'}>
                              {isCancelled ? 'لغو شده' : slot.isVirtual ? 'برخط' : 'حضوری'}
                            </Badge>
                          </div>
                          <span className="text-xs text-muted-foreground mt-0.5 block">
                            ساعت: {toPersianDigits(slot.startTime)} الی {toPersianDigits(slot.endTime)}
                          </span>
                        </div>

                        {!isCancelled && (
                          <button
                            type="button"
                            onClick={() => handleDeleteSlot(slot.id)}
                            className="p-1.5 text-muted-foreground hover:text-destructive rounded-lg hover:bg-destructive/10"
                            title="حذف اسلات"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      <div className="space-y-1.5 text-xs text-muted-foreground bg-surface/40 p-2.5 rounded-xl border border-border/40">
                        <div className="flex items-center gap-2">
                          <Clock className="w-3.5 h-3.5 text-purple-500" />
                          <span>مدت جلسه: {toPersianDigits(slot.durationMinutes)} دقیقه</span>
                        </div>
                        {slot.isVirtual ? (
                          <div className="flex items-center gap-2 text-primary">
                            <Video className="w-3.5 h-3.5" />
                            <span className="truncate">{slot.virtualMeetingUrl || 'لینک کنفرانس اختصاصی'}</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <MapPin className="w-3.5 h-3.5 text-amber-500" />
                            <span>مکان: {slot.roomLocation || 'اتاق اساتید'}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="pt-3 mt-3 border-t border-border/40 flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">
                        تعداد رزرو: <strong className="text-foreground">{bookedCount}</strong> از {slot.capacityPerSlot}
                      </span>
                      {bookedCount >= slot.capacityPerSlot && !isCancelled && (
                        <span className="text-destructive font-semibold">تکمیل ظرفیت</span>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* Bookings Tab */
        <div className="space-y-3">
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-20 rounded-xl" />
              <Skeleton className="h-20 rounded-xl" />
            </div>
          ) : bookings.length === 0 ? (
            <div className="text-center py-16 bg-surface/20 rounded-2xl border border-dashed border-border/60">
              <UserCheck className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-40" />
              <h3 className="text-base font-semibold text-foreground">
                هیچ رزروی برای شما ثبت نشده است
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                پس از انتشار اسلات‌ها، درخواست‌های اولیا در این بخش نمایش داده خواهد شد.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {bookings.map((b) => (
                <div
                  key={b.id}
                  className="p-4 bg-surface/50 rounded-xl border border-border/60 hover:border-purple-500/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-foreground">
                        ولی: {b.parent?.user?.firstName} {b.parent?.user?.lastName}
                      </span>
                      <Badge variant="college">
                        دانش‌آموز: {b.student?.user?.firstName} {b.student?.user?.lastName}
                      </Badge>
                      <Badge variant={b.status === 'CONFIRMED' ? 'success' : 'neutral'}>
                        {b.status === 'CONFIRMED' ? 'رزرو تایید شده' : 'لغو شده'}
                      </Badge>
                    </div>

                    <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-3">
                      <span>تاریخ: {formatJalaliDisplay(b.slot?.date, true)}</span>
                      <span>•</span>
                      <span>ساعت: {toPersianDigits(b.slot?.startTime)} الی {toPersianDigits(b.slot?.endTime)}</span>
                      {b.parent?.user?.phoneNumber && (
                        <>
                          <span>•</span>
                          <span>تماس ولی: {toPersianDigits(b.parent.user.phoneNumber)}</span>
                        </>
                      )}
                    </div>

                    <div className="text-xs text-foreground/90 bg-surface/70 px-3 py-1.5 rounded-lg border border-border/40 inline-flex items-center gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                      <span>موضوع: {b.subject}</span>
                    </div>
                  </div>

                  {b.slot?.isVirtual && b.slot?.virtualMeetingUrl && (
                    <a
                      href={b.slot.virtualMeetingUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-semibold px-4 py-2 rounded-xl bg-purple-600 text-white hover:bg-purple-700 flex items-center gap-1.5 shrink-0 self-start sm:self-center"
                    >
                      <Video className="w-3.5 h-3.5" />
                      <span>ورود به جلسه برخط</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Create Slot Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="تعریف اسلات زمانی ملاقات جدید"
        maxWidth="md"
      >
        <form onSubmit={handleCreateSlotSubmit} className="space-y-4 pt-2">
          {slotError && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{slotError}</span>
            </div>
          )}

          <div>
            <PersianDatePicker
              label="تاریخ ملاقات (شمسی) *"
              value={form.date}
              onChange={(d) => setForm({ ...form, date: d })}
              placeholder="انتخاب تاریخ شمسی..."
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">
                ساعت شروع *
              </label>
              <Input
                type="time"
                value={form.startTime}
                onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">
                ساعت پایان *
              </label>
              <Input
                type="time"
                value={form.endTime}
                onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">
                مدت جلسه (دقیقه)
              </label>
              <Input
                type="number"
                min={5}
                max={120}
                value={form.durationMinutes}
                onChange={(e) => setForm({ ...form, durationMinutes: Number(e.target.value) })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">
                ظرفیت همزمان (نفر)
              </label>
              <Input
                type="number"
                min={1}
                max={10}
                value={form.capacityPerSlot}
                onChange={(e) => setForm({ ...form, capacityPerSlot: Number(e.target.value) })}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">
              محل ملاقات حضوری
            </label>
            <Input
              value={form.roomLocation}
              onChange={(e) => setForm({ ...form, roomLocation: e.target.value })}
              placeholder="مثال: دفتر اساتید یا اتاق مشاوره"
            />
          </div>

          <div className="space-y-2 pt-2 border-t border-border/40">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isVirtual"
                checked={form.isVirtual}
                onChange={(e) => setForm({ ...form, isVirtual: e.target.checked })}
                className="w-4 h-4 rounded-sm border-border text-purple-600 focus:ring-purple-500/20"
              />
              <label htmlFor="isVirtual" className="text-xs font-medium text-foreground cursor-pointer">
                این جلسه به صورت آنلاین / برخط (ویدئوکنفرانس) برگزار می‌شود
              </label>
            </div>

            {form.isVirtual && (
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">
                  لینک جلسه آنلاین (گوگل میت، ادوبی کانکت، قرار یا اسکای‌روم)
                </label>
                <Input
                  value={form.virtualMeetingUrl}
                  onChange={(e) => setForm({ ...form, virtualMeetingUrl: e.target.value })}
                  placeholder="https://meet.google.com/..."
                />
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-border/50">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsCreateModalOpen(false)}
            >
              انصراف
            </Button>
            <Button type="submit" disabled={isSubmittingSlot}>
              {isSubmittingSlot ? 'در حال ثبت...' : 'ثبت و انتشار اسلات'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
