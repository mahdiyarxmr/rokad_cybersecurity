import React, { useEffect, useState } from 'react';
import { apiClient } from '../../../lib/api/client';
import { useAuthStore } from '../../../lib/auth/auth-store';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Badge } from '../../../components/ui/Badge';
import { Modal } from '../../../components/ui/Modal';
import { Skeleton } from '../../../components/ui/Skeleton';
import { ResponsivePageHeader } from '../../../components/ui/ResponsivePageHeader';
import { PersianDatePicker } from '../../../components/ui/PersianDatePicker';
import { formatJalaliDisplay, toPersianDigits } from '../../../utils/jalali';
import {
  Calendar,
  Clock,
  UserCheck,
  Plus,
  Video,
  MapPin,
  AlertCircle,
  CheckCircle2,
  CalendarCheck2,
  XCircle,
  ExternalLink,
  ChevronRight,
  Filter,
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
  teacher: {
    id: string;
    personnelCode?: string;
    user: {
      firstName: string;
      lastName: string;
      avatarUrl?: string;
    };
  };
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
  slot: {
    date: string;
    startTime: string;
    endTime: string;
    isVirtual: boolean;
    virtualMeetingUrl?: string;
    roomLocation?: string;
    teacher: {
      user: {
        firstName: string;
        lastName: string;
      };
    };
  };
  student: {
    user: {
      firstName: string;
      lastName: string;
    };
  };
}

export const ParentVisitsPage: React.FC = () => {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'AVAILABLE' | 'MY_BOOKINGS'>('AVAILABLE');
  const [slots, setSlots] = useState<VisitSlot[]>([]);
  const [myBookings, setMyBookings] = useState<VisitBooking[]>([]);
  const [children, setChildren] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>('');

  // Booking Modal
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<VisitSlot | null>(null);
  const [bookStudentId, setBookStudentId] = useState<string>('');
  const [bookSubject, setBookSubject] = useState<string>('');
  const [isSubmittingBooking, setIsSubmittingBooking] = useState(false);
  const [bookError, setBookError] = useState<string | null>(null);
  const [bookSuccess, setBookSuccess] = useState<string | null>(null);

  // Cancellation State
  const [cancellingBookingId, setCancellingBookingId] = useState<string | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [slotsRes, bookingsRes, childrenRes] = await Promise.all([
        apiClient.get<VisitSlot[]>('/parent-visits/slots', {
          params: {
            teacherId: selectedTeacherId || undefined,
            date: selectedDate || undefined,
          },
        }),
        apiClient.get<VisitBooking[]>('/parent-visits/my-bookings'),
        apiClient.get<any[]>('/members/my-children').catch(() => ({ data: [] })),
      ]);

      const slotsData = slotsRes.data || [];
      const bookingsData = bookingsRes.data || [];
      const childrenData = childrenRes.data || [];

      setSlots(slotsData);
      setMyBookings(bookingsData);
      setChildren(childrenData);
      if (childrenData && childrenData.length > 0 && !bookStudentId) {
        setBookStudentId(childrenData[0].studentId || childrenData[0].id);
      }
    } catch (err: any) {
      console.error('Failed to fetch parent visits:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedTeacherId, selectedDate]);

  const handleOpenBookModal = (slot: VisitSlot) => {
    setSelectedSlot(slot);
    setBookError(null);
    setBookSuccess(null);
    setBookSubject('');
    setIsBookModalOpen(true);
  };

  const handleConfirmBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlot) return;

    if (!bookStudentId && children.length > 0) {
      setBookStudentId(children[0].studentId || children[0].id);
    }

    if (!bookSubject.trim()) {
      setBookError('لطفاً دلیل یا موضوع جلسه ملاقات را وارد نمایید');
      return;
    }

    setIsSubmittingBooking(true);
    setBookError(null);

    try {
      await apiClient.post('/parent-visits/book', {
        slotId: selectedSlot.id,
        studentId: bookStudentId || (children[0]?.studentId ?? children[0]?.id),
        subject: bookSubject.trim(),
      });

      setBookSuccess('نوبت ملاقات شما با موفقیت رزرو گردید');
      setTimeout(() => {
        setIsBookModalOpen(false);
        setActiveTab('MY_BOOKINGS');
        fetchData();
      }, 1000);
    } catch (err: any) {
      setBookError(err.response?.data?.message || 'خطا در رزرو نوبت ملاقات');
    } finally {
      setIsSubmittingBooking(false);
    }
  };

  const handleCancelBooking = async (bookingId: string) => {
    if (!window.confirm('آیا از لغو این نوبت ملاقات اطمینان دارید؟')) return;

    setCancellingBookingId(bookingId);
    try {
      await apiClient.patch(`/parent-visits/bookings/${bookingId}/cancel`);
      await fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'خطا در لغو نوبت');
    } finally {
      setCancellingBookingId(null);
    }
  };

  // Extract unique teachers for filter
  const uniqueTeachers = Array.from(
    new Map(
      slots.map((s) => [s.teacher.id, `${s.teacher.user.firstName} ${s.teacher.user.lastName}`])
    ).entries()
  );

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Header Banner */}
      <ResponsivePageHeader
        icon={UserCheck}
        title="ملاقات با کادر آموزشی"
        actions={
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setActiveTab('AVAILABLE')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'AVAILABLE'
                  ? 'bg-primary text-white shadow-xs'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              نوبت‌های آزاد
            </button>
            <button
              onClick={() => setActiveTab('MY_BOOKINGS')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'MY_BOOKINGS'
                  ? 'bg-primary text-white shadow-xs'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              نوبت‌های من ({myBookings.filter((b) => b.status === 'CONFIRMED').length})
            </button>
          </div>
        }
      />

      {/* Content Tabs */}
      {activeTab === 'AVAILABLE' ? (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3 bg-surface/30 p-4 rounded-xl border border-border/40">
            <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
              <Filter className="w-4 h-4 text-purple-500" />
              <span>فیلتر زمان و استاد:</span>
            </div>

            <div className="w-48">
              <PersianDatePicker
                value={selectedDate}
                onChange={(d) => setSelectedDate(d)}
                placeholder="فیلتر تاریخ شمسی..."
              />
            </div>

            <div className="w-56">
              <select
                value={selectedTeacherId}
                onChange={(e) => setSelectedTeacherId(e.target.value)}
                className="w-full h-9 px-3 text-xs bg-surface/50 border border-border rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-hidden"
              >
                <option value="">همه مربیان و مشاوران</option>
                {uniqueTeachers.map(([tId, tName]) => (
                  <option key={tId} value={tId}>
                    {tName}
                  </option>
                ))}
              </select>
            </div>

            {(selectedDate || selectedTeacherId) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedDate('');
                  setSelectedTeacherId('');
                }}
                className="h-9 text-xs text-muted-foreground hover:text-destructive"
              >
                پاک کردن فیلتر
              </Button>
            )}
          </div>

          {/* Slots List */}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Skeleton className="h-44 rounded-2xl" />
              <Skeleton className="h-44 rounded-2xl" />
              <Skeleton className="h-44 rounded-2xl" />
            </div>
          ) : slots.length === 0 ? (
            <div className="text-center py-16 bg-surface/20 rounded-2xl border border-dashed border-border/60">
              <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-40" />
              <h3 className="text-base font-semibold text-foreground">نوبت آزادی برای رزرو یافت نشد</h3>
              <p className="text-sm text-muted-foreground mt-1">
                مربیان هنوز برای این بازه زمانی اسلات ملاقات جدیدی ثبت نکرده‌اند.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {slots.map((slot) => {
                const bookedCount = slot.bookings?.length || 0;
                const isFull = bookedCount >= slot.capacityPerSlot;

                return (
                  <Card
                    key={slot.id}
                    className="p-5 border border-border/60 hover:border-purple-500/40 transition-all flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-bold text-foreground text-base">
                            {slot.teacher.user.firstName} {slot.teacher.user.lastName}
                          </h3>
                          <span className="text-xs text-muted-foreground">مربی / مشاور آموزشی</span>
                        </div>
                        <Badge variant={slot.isVirtual ? 'college' : 'default'}>
                          {slot.isVirtual ? 'جلسه آنلاین' : 'حضوری'}
                        </Badge>
                      </div>

                      <div className="space-y-1.5 text-xs text-muted-foreground bg-surface/40 p-3 rounded-xl border border-border/40">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5 text-purple-500" />
                          <span>تاریخ: {formatJalaliDisplay(slot.date, true)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="w-3.5 h-3.5 text-purple-500" />
                          <span>
                            ساعت: {toPersianDigits(slot.startTime)} الی {toPersianDigits(slot.endTime)} ({toPersianDigits(slot.durationMinutes)} دقیقه)
                          </span>
                        </div>
                        {slot.isVirtual ? (
                          <div className="flex items-center gap-2 text-primary font-medium">
                            <Video className="w-3.5 h-3.5" />
                            <span>سامانه ویدئوکنفرانس برخط</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <MapPin className="w-3.5 h-3.5 text-amber-500" />
                            <span>محل: {slot.roomLocation || 'دفتر اساتید و مشاوره'}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="pt-4 mt-2 border-t border-border/40 flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        {isFull ? (
                          <span className="text-destructive font-semibold">تکمیل ظرفیت</span>
                        ) : (
                          <span>ظرفیت باقی‌مانده: {slot.capacityPerSlot - bookedCount} نفر</span>
                        )}
                      </span>

                      <Button
                        size="sm"
                        disabled={isFull}
                        onClick={() => handleOpenBookModal(slot)}
                        className="text-xs flex items-center gap-1.5"
                      >
                        <CalendarCheck2 className="w-3.5 h-3.5" />
                        <span>رزرو نوبت</span>
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* My Bookings Tab */
        <div className="space-y-4">
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-20 rounded-xl" />
              <Skeleton className="h-20 rounded-xl" />
            </div>
          ) : myBookings.length === 0 ? (
            <div className="text-center py-16 bg-surface/20 rounded-2xl border border-dashed border-border/60">
              <CalendarCheck2 className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-40" />
              <h3 className="text-base font-semibold text-foreground">
                هنوز نوبت ملاقاتی رزرو نکرده‌اید
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                از تب «نوبت‌های آزاد» مربی مورد نظر را انتخاب و وقت ملاقات ثبت فرمایید.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {myBookings.map((b) => {
                const isCancelled = b.status === 'CANCELLED';
                return (
                  <div
                    key={b.id}
                    className={`p-4 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                      isCancelled
                        ? 'bg-surface/20 border-border/40 opacity-60'
                        : 'bg-surface/50 border-purple-500/20 hover:border-purple-500/40 shadow-xs'
                    }`}
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-foreground">
                          جلسه با: {b.slot.teacher.user.firstName} {b.slot.teacher.user.lastName}
                        </span>
                        <Badge variant={isCancelled ? 'neutral' : 'success'}>
                          {isCancelled ? 'لغو شده' : 'تایید شده'}
                        </Badge>
                        <Badge variant={b.slot.isVirtual ? 'college' : 'default'}>
                          {b.slot.isVirtual ? 'برخط' : 'حضوری'}
                        </Badge>
                      </div>

                      <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-3">
                        <span>فرزند: {b.student?.user?.firstName} {b.student?.user?.lastName}</span>
                        <span>•</span>
                        <span>تاریخ: {formatJalaliDisplay(b.slot.date, true)}</span>
                        <span>•</span>
                        <span>
                          ساعت: {toPersianDigits(b.slot.startTime)} الی {toPersianDigits(b.slot.endTime)}
                        </span>
                        {b.slot.isVirtual && b.slot.virtualMeetingUrl && !isCancelled && (
                          <>
                            <span>•</span>
                            <a
                              href={b.slot.virtualMeetingUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-primary hover:underline flex items-center gap-1 font-medium"
                            >
                              <span>ورود به اتاق جلسه</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </>
                        )}
                      </div>

                      <p className="text-xs text-foreground/80 bg-surface/70 px-2.5 py-1 rounded-md border border-border/30 inline-block">
                        موضوع جلسه: {b.subject}
                      </p>
                    </div>

                    {!isCancelled && (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={cancellingBookingId === b.id}
                        onClick={() => handleCancelBooking(b.id)}
                        className="text-xs text-destructive hover:bg-destructive/10 border-destructive/30 shrink-0"
                      >
                        {cancellingBookingId === b.id ? 'در حال لغو...' : 'لغو نوبت'}
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Book Visit Modal */}
      <Modal
        isOpen={isBookModalOpen}
        onClose={() => setIsBookModalOpen(false)}
        title="رزرو نوبت ملاقات با مربی"
        maxWidth="md"
      >
        {selectedSlot && (
          <form onSubmit={handleConfirmBooking} className="space-y-4 pt-2">
            {bookError && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{bookError}</span>
              </div>
            )}
            {bookSuccess && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 rounded-xl text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{bookSuccess}</span>
              </div>
            )}

            <div className="bg-purple-500/10 p-3.5 rounded-xl border border-purple-500/20 text-xs space-y-1 text-purple-900 dark:text-purple-200">
              <p className="font-bold">
                ملاقات با استاد {selectedSlot.teacher.user.firstName}{' '}
                {selectedSlot.teacher.user.lastName}
              </p>
              <p>
                تاریخ: {formatJalaliDisplay(selectedSlot.date, true)} | ساعت: {toPersianDigits(selectedSlot.startTime)} الی{' '}
                {toPersianDigits(selectedSlot.endTime)}
              </p>
              <p>نوع: {selectedSlot.isVirtual ? 'جلسه برخط ویدئویی' : 'ملاقات حضوری در هنرستان'}</p>
            </div>

            {children && children.length > 1 && (
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">
                  انتخاب فرزند مربوطه *
                </label>
                <select
                  value={bookStudentId}
                  onChange={(e) => setBookStudentId(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-surface/50 border border-border rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-hidden"
                >
                  {children.map((c: any) => (
                    <option key={c.studentId || c.id} value={c.studentId || c.id}>
                      {c.student?.user?.firstName} {c.student?.user?.lastName} (کلاس {c.student?.classRoom?.name || 'دانش‌آموز'})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">
                موضوع و محور گفت‌وگو در جلسه *
              </label>
              <textarea
                value={bookSubject}
                onChange={(e) => setBookSubject(e.target.value)}
                placeholder="مثال: بررسی افت نمرات پودمان دوم کارگاهی یا مشاوره تحصیلی..."
                rows={3}
                className="w-full px-3 py-2 text-sm bg-surface/50 border border-border rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-hidden"
                required
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-border/50">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsBookModalOpen(false)}
              >
                انصراف
              </Button>
              <Button type="submit" disabled={isSubmittingBooking}>
                {isSubmittingBooking ? 'در حال ثبت...' : 'تایید و رزرو نوبت'}
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};
