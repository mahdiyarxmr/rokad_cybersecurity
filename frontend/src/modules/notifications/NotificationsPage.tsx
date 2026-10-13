import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../lib/auth/auth-store';
import { apiClient } from '../../lib/api/client';
import { useWebPush } from '../../hooks/useWebPush';
import { toPersianDigits } from '../../lib/utils';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import {
  Bell,
  BellRing,
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  Inbox,
  Loader2,
  Megaphone,
  PlusCircle,
  RefreshCw,
  Send,
  Smartphone,
  Sparkles,
  Volume2,
  X,
} from 'lucide-react';

interface NotificationItem {
  id: string;
  title: string;
  desc: string;
  time: string;
  read: boolean;
  type: string;
  badge?: 'default' | 'success' | 'warning' | 'destructive' | 'neutral' | 'college' | 'male' | 'female';
  targetUrl?: string;
  createdAt?: string;
}

import { useNotificationStore } from '../../lib/notifications/notification-store';

export const NotificationsPage: React.FC = () => {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filter, setFilter] = useState<'ALL' | 'UNREAD'>('ALL');

  // Broadcast modal state
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastBody, setBroadcastBody] = useState('');
  const [broadcastTargetRole, setBroadcastTargetRole] = useState<'ALL' | 'TEACHER' | 'STUDENT' | 'PARENT'>('ALL');
  const [isSendingBroadcast, setIsSendingBroadcast] = useState(false);
  const [broadcastFeedback, setBroadcastFeedback] = useState<string | null>(null);

  const canBroadcast =
    user?.role === 'SUPER_ADMIN' ||
    user?.role === 'SCHOOL_ADMIN' ||
    user?.role === 'STAFF' ||
    user?.role === 'TEACHER';

  const { markAllRead: storeMarkAllRead, markAsRead: storeMarkAsRead, isRead, setUnreadCount } =
    useNotificationStore();

  // Push notifications hook
  const {
    isSupported: isPushSupported,
    needsIOSInstall,
    isSubscribed: isPushSubscribed,
    isLoading: isPushLoading,
    subscribe: subscribePush,
    unsubscribe: unsubscribePush,
    sendTestNotification,
  } = useWebPush();
  const [testPushStatus, setTestPushStatus] = useState<string | null>(null);

  const fetchNotifications = async () => {
    try {
      setIsLoading(true);
      const res = await apiClient.get<NotificationItem[]>('/notifications');
      const list = (res.data || []).map((n) => ({
        ...n,
        read: isRead(n.id, n.read),
      }));
      setNotifications(Array.isArray(list) ? list : []);
      const unread = list.filter((n) => !n.read).length;
      setUnreadCount(unread);
    } catch (err) {
      console.error('Failed to load notifications', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [user?.id]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllAsRead = async () => {
    try {
      const ids = notifications.map((n) => n.id);
      storeMarkAllRead();
      ids.forEach((id) => storeMarkAsRead(id));
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      if (ids.length > 0) {
        await apiClient.post('/notifications/mark-all-read', { notificationIds: ids });
      }
    } catch (err) {
      console.error('Failed to mark all as read', err);
    }
  };

  const handleNotificationClick = async (notif: NotificationItem) => {
    try {
      if (!notif.read) {
        storeMarkAsRead(notif.id);
        apiClient.patch(`/notifications/${notif.id}/read`).catch(() => {});
        setNotifications((prev) =>
          prev.map((n) => (n.id === notif.id ? { ...n, read: true } : n))
        );
      }
      if (notif.targetUrl) {
        navigate(notif.targetUrl);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastTitle.trim() || !broadcastBody.trim()) return;

    try {
      setIsSendingBroadcast(true);
      setBroadcastFeedback(null);
      const res = await apiClient.post<any>('/notifications/send', {
        title: broadcastTitle.trim(),
        body: broadcastBody.trim(),
        targetRole: broadcastTargetRole,
      });

      setBroadcastFeedback(res.data?.message || 'اعلان با موفقیت ارسال شد.');
      await fetchNotifications();

      setTimeout(() => {
        setShowBroadcastModal(false);
        setBroadcastTitle('');
        setBroadcastBody('');
        setBroadcastFeedback(null);
      }, 1500);
    } catch (err: any) {
      setBroadcastFeedback(err?.response?.data?.message || 'خطا در ارسال اعلان');
    } finally {
      setIsSendingBroadcast(false);
    }
  };

  const filteredNotifications = notifications.filter((n) =>
    filter === 'UNREAD' ? !n.read : true
  );

  return (
    <div className="max-w-2xl mx-auto space-y-4 pb-12 animate-in fade-in duration-300">
      {/* Header Bar */}
      <div className="flex items-center justify-between pb-1">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label="بازگشت"
            className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl bg-white dark:bg-[#151C28] border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-300 hover:text-primary transition-all active:scale-95 shadow-2xs flex items-center justify-center cursor-pointer"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-black text-lg sm:text-xl text-ink-darker dark:text-white">
                اعلان‌ها
              </h1>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white text-[11px] font-bold">
                  {toPersianDigits(unreadCount)} جدید
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {canBroadcast && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setShowBroadcastModal(true)}
              className="text-xs font-bold bg-primary hover:bg-primary-dark text-white flex items-center gap-1 shadow-2xs"
            >
              <Megaphone className="w-3.5 h-3.5" />
              <span>ارسال اعلان</span>
            </Button>
          )}

          <button
            type="button"
            onClick={fetchNotifications}
            title="به‌روزرسانی"
            aria-label="به‌روزرسانی"
            className="w-9 h-9 min-w-[36px] min-h-[36px] rounded-xl bg-white dark:bg-[#151C28] border border-gray-200 dark:border-gray-800 text-gray-500 hover:text-primary transition-all flex items-center justify-center cursor-pointer shadow-2xs"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-primary' : ''}`} />
          </button>

          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={markAllAsRead}
              className="text-xs font-bold text-primary hover:bg-primary/10 border-primary/30"
            >
              خوانده‌شدن همه
            </Button>
          )}
        </div>
      </div>

      {/* Web Push Banner */}
      {isPushSupported && (
        <div className="p-3.5 rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/5 via-teal-50/50 dark:via-gray-800/40 to-primary/5 shadow-2xs">
          {needsIOSInstall ? (
            <div className="space-y-1.5 text-right">
              <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400 font-bold text-xs">
                <Smartphone className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
                <span>فعال‌سازی در آیفون</span>
              </div>
              <p className="text-[11px] text-gray-600 dark:text-gray-300 leading-relaxed">
                برای دریافت اعلان در آیفون، دکمه اشتراک‌گذاری در سافاری را زده و گزینه «افزودن به صفحه اصلی» را انتخاب فرمایید.
              </p>
            </div>
          ) : isPushSubscribed ? (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
                <span className="text-xs font-bold text-emerald-800 dark:text-emerald-400">
                  اعلان‌های آنلاین فعال است
                </span>
              </div>
              <div className="flex items-center gap-2 self-end sm:self-auto">
                <button
                  type="button"
                  onClick={async () => {
                    setTestPushStatus('در حال ارسال...');
                    const res = await sendTestNotification();
                    if (res.ok) {
                      setTestPushStatus(res.message);
                      setTimeout(() => setTestPushStatus(null), 4000);
                    } else {
                      setTestPushStatus(res.message);
                      setTimeout(() => setTestPushStatus(null), 5000);
                    }
                  }}
                  disabled={isPushLoading}
                  className="px-3 py-1.5 min-h-[38px] bg-white dark:bg-[#1C2536] hover:bg-emerald-50 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-700 rounded-lg text-xs font-bold flex items-center gap-1 shadow-2xs transition-all cursor-pointer"
                >
                  {isPushLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                  <span>{testPushStatus || 'تست اعلان'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => unsubscribePush()}
                  disabled={isPushLoading}
                  className="text-[10px] text-gray-400 hover:text-rose-500 transition-colors cursor-pointer px-2 min-h-[38px] flex items-center"
                >
                  غیرفعال
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <BellRing className="w-4 h-4 text-primary shrink-0" />
                <span className="text-xs font-bold text-ink-darker dark:text-white">دریافت اعلان‌های سامانه</span>
              </div>
              <Button
                variant="primary"
                size="sm"
                onClick={async () => {
                  const ok = await subscribePush();
                  if (ok) {
                    setTimeout(() => sendTestNotification(), 600);
                  }
                }}
                disabled={isPushLoading}
                className="text-xs shrink-0"
              >
                {isPushLoading ? <Loader2 className="w-3 h-3 animate-spin ml-1" /> : <CheckCircle2 className="w-3.5 h-3.5 ml-1" />}
                فعال‌سازی
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200 dark:border-gray-800 pb-2">
        <button
          type="button"
          onClick={() => setFilter('ALL')}
          className={`px-4 py-2 min-h-[44px] rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center ${
            filter === 'ALL'
              ? 'bg-primary text-white shadow-xs'
              : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
          }`}
        >
          همه ({toPersianDigits(notifications.length)})
        </button>
        <button
          type="button"
          onClick={() => setFilter('UNREAD')}
          className={`px-4 py-2 min-h-[44px] rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center ${
            filter === 'UNREAD'
              ? 'bg-primary text-white shadow-xs'
              : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
          }`}
        >
          خوانده‌نشده ({toPersianDigits(unreadCount)})
        </button>
      </div>

      {/* Notification List */}
      <div className="space-y-2.5">
        {isLoading && notifications.length === 0 ? (
          <div className="py-16 text-center text-xs text-gray-400 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <span>در حال دریافت اعلان‌ها...</span>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="py-16 text-center text-xs text-gray-400 bg-white dark:bg-[#151C28] rounded-2xl border border-dashed border-gray-200 dark:border-gray-800 flex flex-col items-center justify-center gap-2 shadow-2xs">
            <Inbox className="w-8 h-8 text-gray-300 dark:text-gray-600" />
            <span className="font-bold text-ink-normal dark:text-gray-300">هیچ اعلانی در این بخش وجود ندارد.</span>
            <span className="text-[11px] text-gray-400">تمام پیام‌های جدید شما در این صفحه قرار می‌گیرند.</span>
          </div>
        ) : (
          filteredNotifications.map((notif) => (
            <div
              key={notif.id}
              onClick={() => handleNotificationClick(notif)}
              className={`p-4 rounded-2xl border text-xs transition-all cursor-pointer group shadow-2xs hover:shadow-xs ${
                notif.read
                  ? 'bg-white dark:bg-[#151C28] border-gray-200/80 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:border-gray-300'
                  : 'bg-primary/5 dark:bg-primary/10 border-primary/30 text-ink-darker dark:text-white font-medium hover:border-primary/50'
              }`}
            >
              <div className="flex justify-between items-start mb-1.5 gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  {!notif.read && (
                    <span className="w-2 h-2 rounded-full bg-primary shrink-0 animate-pulse" />
                  )}
                  <h3 className="font-bold text-xs sm:text-sm text-foreground dark:text-white group-hover:text-primary transition-colors truncate">
                    {notif.title}
                  </h3>
                </div>
                <span className="text-[10px] text-gray-400 font-mono shrink-0">
                  {notif.time}
                </span>
              </div>

              <p className="text-xs leading-relaxed text-gray-600 dark:text-gray-300 mb-3">
                {notif.desc}
              </p>

              {notif.targetUrl && (
                <div className="flex items-center justify-end pt-2 border-t border-gray-100 dark:border-gray-800 text-[11px]">
                  <span className="text-primary font-bold flex items-center gap-1 group-hover:underline">
                    <span>مشاهده جزئیات</span>
                    <ExternalLink className="w-3.5 h-3.5 ml-0.5" />
                  </span>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Broadcast Announcement Modal */}
      {showBroadcastModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#151C28] border border-gray-200 dark:border-gray-800 rounded-3xl p-6 w-full max-w-lg shadow-xl relative animate-in zoom-in-95 duration-200">
            <button
              type="button"
              onClick={() => {
                setShowBroadcastModal(false);
                setBroadcastFeedback(null);
              }}
              className="absolute top-5 left-5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                <Megaphone className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-black text-ink-darker dark:text-white">ارسال اعلان سیستمی و پوش</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">پیام شما به صورت آنلاین و در لیست نوتیفیکیشن‌ها ثبت می‌شود</p>
              </div>
            </div>

            <form onSubmit={handleSendBroadcast} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                  گروه مخاطب
                </label>
                <div className="grid grid-cols-4 gap-1.5 bg-gray-100 dark:bg-[#1C2536] p-1 rounded-xl text-xs">
                  {[
                    { id: 'ALL', label: 'همه' },
                    { id: 'TEACHER', label: 'مربیان' },
                    { id: 'STUDENT', label: 'دانش‌آموزان' },
                    { id: 'PARENT', label: 'اولیا' },
                  ].map((target) => (
                    <button
                      key={target.id}
                      type="button"
                      onClick={() => setBroadcastTargetRole(target.id as any)}
                      className={`py-2 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                        broadcastTargetRole === target.id
                          ? 'bg-white dark:bg-primary text-primary dark:text-white shadow-2xs'
                          : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
                      }`}
                    >
                      {target.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                  عنوان اعلان <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثال: تعطیلی کلاس کارگاه یا رویداد فردا"
                  value={broadcastTitle}
                  onChange={(e) => setBroadcastTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1C2536] text-xs text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                  متن پیام <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="شرح کامل اعلان و توصیه‌های مورد نظر..."
                  value={broadcastBody}
                  onChange={(e) => setBroadcastBody(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1C2536] text-xs text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none leading-relaxed"
                />
              </div>

              {broadcastFeedback && (
                <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 text-xs font-bold text-primary text-center animate-in fade-in">
                  {broadcastFeedback}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowBroadcastModal(false)}
                  disabled={isSendingBroadcast}
                  className="text-xs"
                >
                  انصراف
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={isSendingBroadcast || !broadcastTitle.trim() || !broadcastBody.trim()}
                  className="text-xs font-bold bg-primary hover:bg-primary-dark text-white flex items-center gap-1.5"
                >
                  {isSendingBroadcast ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  <span>ارسال و انتشار سیگنال</span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
