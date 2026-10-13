import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { apiClient } from '../../../lib/api/client';
import { toast } from '../../../components/ui/toast/toast';
import { gregorianToJalaliStr, toPersianDigits } from '../../../utils/jalali';
import { InboxItem, AcademicMessageItem, MessagePriority } from './types';
import { ComposeMessageModal } from './components/ComposeMessageModal';
import { MessageDetailModal } from './components/MessageDetailModal';
import {
  MessageSquare,
  Send,
  Inbox,
  Plus,
  Search,
  Filter,
  Paperclip,
  Clock,
  User,
  Building,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Archive,
  X,
  ChevronDown,
  Check,
  RotateCcw,
} from 'lucide-react';

interface PriorityOption {
  value: string;
  label: string;
  dotColor: string;
}

const PRIORITY_OPTIONS: PriorityOption[] = [
  {
    value: 'ALL',
    label: 'همه اولویت‌ها',
    dotColor:
      'bg-slate-400 dark:bg-slate-300 ring-2 ring-slate-400/25 dark:ring-slate-300/30 shadow-[0_0_6px_rgba(148,163,184,0.4)]',
  },
  {
    value: 'URGENT',
    label: 'فقط فوری',
    dotColor:
      'bg-rose-500 dark:bg-rose-400 ring-2 ring-rose-500/25 dark:ring-rose-400/40 shadow-[0_0_8px_rgba(251,113,133,0.6)]',
  },
  {
    value: 'IMPORTANT',
    label: 'فقط مهم',
    dotColor:
      'bg-amber-500 dark:bg-amber-300 ring-2 ring-amber-500/25 dark:ring-amber-300/40 shadow-[0_0_8px_rgba(252,211,77,0.6)]',
  },
  {
    value: 'NORMAL',
    label: 'عادی',
    dotColor:
      'bg-sky-500 dark:bg-sky-400 ring-2 ring-sky-500/25 dark:ring-sky-400/40 shadow-[0_0_8px_rgba(56,189,248,0.6)]',
  },
];

export const MessagesPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'inbox' | 'sent'>('inbox');
  const [loading, setLoading] = useState(true);

  // Data
  const [inboxItems, setInboxItems] = useState<InboxItem[]>([]);
  const [sentItems, setSentItems] = useState<AcademicMessageItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [isPriorityDropdownOpen, setIsPriorityDropdownOpen] = useState(false);
  const priorityDropdownRef = useRef<HTMLDivElement>(null);

  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const hasActiveFilters =
    searchQuery.trim().length > 0 || priorityFilter !== 'ALL' || unreadOnly;

  const resetFilters = () => {
    setSearchQuery('');
    setPriorityFilter('ALL');
    setUnreadOnly(false);
  };

  const selectedPriorityOpt = useMemo(
    () => PRIORITY_OPTIONS.find((opt) => opt.value === priorityFilter) || PRIORITY_OPTIONS[0],
    [priorityFilter]
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        priorityDropdownRef.current &&
        !priorityDropdownRef.current.contains(event.target as Node)
      ) {
        setIsPriorityDropdownOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsPriorityDropdownOpen(false);
      }
    };
    if (isPriorityDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isPriorityDropdownOpen]);

  // Modals
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [replyRecipient, setReplyRecipient] = useState<{
    id: string;
    name: string;
    subject: string;
    message?: any;
  } | null>(null);

  // Fetch messages based on active tab
  const fetchMessages = useCallback(async () => {
    try {
      setLoading(true);
      if (activeTab === 'inbox') {
        const res: any = await apiClient.get('/messages/inbox', {
          params: {
            unreadOnly: unreadOnly,
            search: searchQuery.trim() || undefined,
          },
        });
        const list = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
        setInboxItems(list);
        if (res?.meta?.unreadCount !== undefined) {
          setUnreadCount(res.meta.unreadCount);
        }
      } else if (activeTab === 'sent') {
        const res: any = await apiClient.get('/messages/sent', {
          params: {
            search: searchQuery.trim() || undefined,
          },
        });
        const list = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
        setSentItems(list);
      }
    } catch (err: any) {
      toast.error('خطا در دریافت لیست پیام‌ها');
    } finally {
      setLoading(false);
    }
  }, [activeTab, unreadOnly, searchQuery]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);


  const handleReply = (
    recipientId: string,
    recipientName: string,
    subject: string,
    replyToMessage?: any,
  ) => {
    setReplyRecipient({
      id: recipientId,
      name: recipientName,
      subject,
      message: replyToMessage,
    });
    setIsComposeOpen(true);
  };

  const filteredInboxItems = inboxItems.filter((item) => {
    if (priorityFilter !== 'ALL' && item.message.priority !== priorityFilter) return false;
    return true;
  });

  const filteredSentItems = sentItems.filter((item) => {
    if (priorityFilter !== 'ALL' && item.priority !== priorityFilter) return false;
    return true;
  });

  const getPriorityBadge = (priority: MessagePriority) => {
    switch (priority) {
      case 'URGENT':
        return (
          <span className="text-[10px] px-2 py-0.5 rounded-full font-black bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            <span>فوری</span>
          </span>
        );
      case 'IMPORTANT':
        return (
          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
            مهم
          </span>
        );
      default:
        return null;
    }
  };

  const getSenderRoleBadge = (role?: string) => {
    switch (role) {
      case 'SUPER_ADMIN':
      case 'SCHOOL_ADMIN':
        return (
          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-club-light dark:bg-[#2A173E] text-club dark:text-[#C084FC] border border-club/30">
            راهبری
          </span>
        );
      case 'TEACHER':
        return (
          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-male-light dark:bg-[#182346] text-sec dark:text-[#8194EE] border border-sec/30">
            استاد
          </span>
        );
      case 'STUDENT':
        return (
          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-ecosystem-light dark:bg-[#163330] text-primary-dark dark:text-primary border border-primary/30">
            دانش‌آموز
          </span>
        );
      case 'PARENT':
        return (
          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-college-light dark:bg-[#38260D] text-third dark:text-[#FBBF24] border border-third/30">
            ولی
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4 sm:space-y-5 pb-12 max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 animate-in fade-in duration-300">
      {/* 1. Header & Controls Master Panel */}
      <div className="bg-white dark:bg-[#151C28] rounded-2xl border-[1.5px] border-primary-dark/30 dark:border-gray-800 shadow-[2px_2px_0_#59BBAF] dark:shadow-[2px_2px_0_#0B0F17] p-4 sm:p-5">
        {/* Top Row: Title & Action Buttons (Side by side on all viewports) */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary dark:text-primary border border-primary/25 flex items-center justify-center font-black shadow-2xs shrink-0">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div className="flex items-center gap-2 min-w-0">
              <h1 className="text-lg sm:text-2xl font-black text-ink-darker dark:text-white truncate">
                پیام‌ها
              </h1>
              {unreadCount > 0 && (
                <span className="inline-flex items-center justify-center min-w-[22px] h-[22px] px-1.5 rounded-full bg-girl text-white font-black text-[11px] sm:text-xs animate-pulse shadow-xs shrink-0 select-none">
                  {toPersianDigits(unreadCount)}
                </span>
              )}
            </div>
          </div>

          {/* Action Buttons Group (Left side of box, alongside title) */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={fetchMessages}
              disabled={loading}
              className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-gray-800/80 hover:bg-gray-100 dark:hover:bg-gray-800 text-ink-normal dark:text-gray-200 border-[1.5px] border-gray-200 dark:border-gray-700 hover:border-primary dark:hover:border-primary shadow-[1.5px_1.5px_0_rgba(0,0,0,0.05)] dark:shadow-[1.5px_1.5px_0_#0B0F17] hover:shadow-[2px_2px_0_#59BBAF] transition-all active:translate-x-[1px] active:translate-y-[1px] cursor-pointer flex items-center justify-center shrink-0"
              title="بروزرسانی پیام‌ها"
              aria-label="بروزرسانی پیام‌ها"
            >
              <RefreshCw
                className={`w-4 h-4 ${
                  loading ? 'animate-spin text-primary' : 'text-gray-500 hover:text-primary'
                }`}
              />
            </button>

            {/* Filter Toggle Button (Top Left of Header Box) */}
            <button
              type="button"
              onClick={() => setIsFilterOpen((prev) => !prev)}
              className={`relative cursor-pointer select-none flex items-center justify-center w-10 h-10 rounded-xl border-[1.5px] transition-all duration-150 active:translate-x-[1px] active:translate-y-[1px] shrink-0 ${
                isFilterOpen || hasActiveFilters
                  ? 'bg-primary text-white border-primary-dark shadow-[2px_2px_0_#438C83]'
                  : 'bg-gray-50 dark:bg-[#1C2536] text-muted-foreground dark:text-slate-300 border-gray-200 dark:border-[#242F42] hover:bg-gray-100 dark:hover:bg-[#253248] shadow-[1.5px_1.5px_0_rgba(0,0,0,0.05)] dark:shadow-[1.5px_1.5px_0_#0B0F17]'
              }`}
              title={isFilterOpen ? 'بستن فیلترها' : 'نمایش فیلترها'}
              aria-label={isFilterOpen ? 'بستن فیلترها' : 'نمایش فیلترها'}
            >
              <Filter className="w-4 h-4 shrink-0" />
              {hasActiveFilters && (
                <span className="absolute top-1.5 left-1.5 w-2 h-2 rounded-full bg-girl ring-2 ring-white dark:ring-[#151C28]" />
              )}
            </button>
          </div>
        </div>

        {/* Subtle Divider */}
        <div className="border-t border-gray-100 dark:border-gray-800/80 my-3.5 sm:my-4" />

        {/* Middle Row: Segmented View Switcher */}
        <div className="flex items-center justify-start">
          <div className="inline-flex items-center p-1 rounded-xl bg-gray-100/90 dark:bg-gray-800/90 border border-gray-200/70 dark:border-gray-700/70 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setActiveTab('inbox')}
              className={`flex-1 sm:flex-initial px-3.5 sm:px-4 py-2 rounded-lg text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer active:translate-x-[1px] active:translate-y-[1px] ${
                activeTab === 'inbox'
                  ? 'bg-white dark:bg-[#151C28] text-primary-dark dark:text-primary border border-primary/25 dark:border-gray-700 shadow-[1.5px_1.5px_0_#59BBAF] dark:shadow-[1.5px_1.5px_0_#0B0F17]'
                  : 'text-gray-600 dark:text-gray-400 hover:text-ink-darker dark:hover:text-white font-bold'
              }`}
            >
              <Inbox className="w-3.5 h-3.5" />
              <span>صندوق ورودی</span>
              {unreadCount > 0 && (
                <span
                  className={`min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-black flex items-center justify-center leading-none ${
                    activeTab === 'inbox' ? 'bg-primary text-white' : 'bg-girl text-white'
                  }`}
                >
                  <span className="inline-block transform -translate-y-[0.5px]">
                    {toPersianDigits(unreadCount)}
                  </span>
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('sent')}
              className={`flex-1 sm:flex-initial px-3.5 sm:px-4 py-2 rounded-lg text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer active:translate-x-[1px] active:translate-y-[1px] ${
                activeTab === 'sent'
                  ? 'bg-white dark:bg-[#151C28] text-primary-dark dark:text-primary border border-primary/25 dark:border-gray-700 shadow-[1.5px_1.5px_0_#59BBAF] dark:shadow-[1.5px_1.5px_0_#0B0F17]'
                  : 'text-gray-600 dark:text-gray-400 hover:text-ink-darker dark:hover:text-white font-bold'
              }`}
            >
              <Send className="w-3.5 h-3.5" />
              <span>پیام‌های ارسالی</span>
            </button>
          </div>
        </div>

        {/* Collapsible Filter & Search Panel with smooth grid-height + opacity motion */}
        <div
          className={`grid transition-all duration-300 ease-in-out ${
            isFilterOpen
              ? 'grid-rows-[1fr] opacity-100 translate-y-0 mt-3.5'
              : 'grid-rows-[0fr] opacity-0 -translate-y-2 pointer-events-none mt-0'
          }`}
        >
          <div className={`min-h-0 ${isFilterOpen ? 'overflow-visible' : 'overflow-hidden'}`}>
            <div className="bg-gray-50/80 dark:bg-[#1C2536] rounded-2xl border border-gray-200/80 dark:border-[#242F42] p-3.5 sm:p-4 shadow-xs">
              <div className="flex flex-col md:flex-row md:items-center gap-3 justify-between">
                <div className="flex items-center gap-2.5 flex-1 flex-wrap sm:flex-nowrap">
                  {/* Search Input with Clear Button */}
                  <div className="relative flex-1 min-w-[180px]">
                    <Search className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="جستجو در پیام‌ها..."
                      className="w-full h-10 pr-9 pl-8 text-xs rounded-xl border-[1.5px] border-gray-200 dark:border-gray-700 bg-white dark:bg-[#151C28] text-ink-darker dark:text-white outline-none focus:border-primary transition-colors shadow-2xs font-medium"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-0.5 rounded-md cursor-pointer"
                        title="پاک کردن جستجو"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Priority Filter Custom Dropdown */}
                  <div className="relative shrink-0" ref={priorityDropdownRef}>
                    <button
                      type="button"
                      onClick={() => setIsPriorityDropdownOpen((prev) => !prev)}
                      className={`h-10 px-3.5 rounded-xl text-xs font-bold border-[1.5px] transition-all duration-150 cursor-pointer select-none flex items-center justify-between gap-2.5 shadow-2xs min-w-[130px] ${
                        isPriorityDropdownOpen
                          ? 'border-primary ring-2 ring-primary/20 dark:ring-primary/30 bg-white dark:bg-[#1C2536] text-ink-darker dark:text-white'
                          : priorityFilter !== 'ALL'
                          ? 'border-primary/60 bg-primary/10 text-primary dark:text-primary'
                          : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-[#151C28] text-ink-normal dark:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600'
                      }`}
                      aria-expanded={isPriorityDropdownOpen}
                      aria-haspopup="listbox"
                    >
                      <div className="flex items-center gap-2.5 truncate min-w-0">
                        <span
                          className={`w-2.5 h-2.5 rounded-full shrink-0 transition-all ${selectedPriorityOpt.dotColor}`}
                        />
                        <span className="truncate">{selectedPriorityOpt.label}</span>
                      </div>
                      <ChevronDown
                        className={`w-3.5 h-3.5 text-gray-400 shrink-0 transition-transform duration-200 ${
                          isPriorityDropdownOpen ? 'rotate-180 text-primary' : ''
                        }`}
                      />
                    </button>

                    {isPriorityDropdownOpen && (
                      <div className="absolute top-full left-0 mt-1.5 z-50 w-44 bg-white dark:bg-[#151C28] rounded-xl border border-gray-200 dark:border-[#242F42] shadow-xl p-1.5 space-y-0.5 animate-in fade-in zoom-in-95 duration-150">
                        {PRIORITY_OPTIONS.map((opt) => {
                          const isSelected = opt.value === priorityFilter;
                          return (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => {
                                setPriorityFilter(opt.value);
                                setIsPriorityDropdownOpen(false);
                              }}
                              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer text-right ${
                                isSelected
                                  ? 'bg-primary/10 text-primary dark:text-primary font-black'
                                  : 'text-ink-darker dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#1C2536]'
                              }`}
                            >
                              <div className="flex items-center gap-2.5">
                                <span
                                  className={`w-2.5 h-2.5 rounded-full shrink-0 transition-all ${opt.dotColor}`}
                                />
                                <span>{opt.label}</span>
                              </div>
                              {isSelected && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Unread Only Toggle (Inbox) */}
                  {activeTab === 'inbox' && (
                    <button
                      type="button"
                      onClick={() => setUnreadOnly(!unreadOnly)}
                      className={`h-10 px-3.5 rounded-xl text-xs font-black border-[1.5px] transition-all cursor-pointer shrink-0 active:translate-x-[1px] active:translate-y-[1px] flex items-center gap-1.5 ${
                        unreadOnly
                          ? 'bg-primary text-white border-primary shadow-2xs'
                          : 'bg-white dark:bg-[#151C28] border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-primary/40'
                      }`}
                    >
                      <div
                        className={`w-2 h-2 rounded-full transition-colors ${
                          unreadOnly ? 'bg-white ring-2 ring-white/30' : 'bg-gray-300 dark:bg-gray-600'
                        }`}
                      />
                      <span>خوانده‌نشده</span>
                    </button>
                  )}
                </div>

                {/* Reset Filters */}
                {hasActiveFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={resetFilters}
                    className="text-xs h-10 gap-1.5 text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl shrink-0"
                    title="پاک کردن تمام فیلترها"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>بازنشانی فیلترها</span>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Full-Width Compose Button */}
        <button
          type="button"
          onClick={() => {
            setReplyRecipient(null);
            setIsComposeOpen(true);
          }}
          className="w-full h-11 sm:h-12 mt-3.5 rounded-xl bg-primary hover:bg-primary-hover text-white font-black text-xs sm:text-sm border-[1.5px] border-primary-dark shadow-[2px_2px_0_#438C83] dark:shadow-[2px_2px_0_#1F413D] hover:shadow-[2.5px_2.5px_0_#438C83] active:translate-x-[1px] active:translate-y-[1px] transition-all cursor-pointer flex items-center justify-center gap-2 group shrink-0"
        >
          <Plus className="w-4 h-4 sm:w-5 sm:h-5 group-hover:scale-110 transition-transform" />
          <span>ارسال پیام جدید</span>
        </button>
      </div>

      {/* 2. Messages List */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-3 bg-white dark:bg-[#151C28] rounded-2xl border-[1.5px] border-primary-dark/20 dark:border-gray-800 shadow-[2px_2px_0_#59BBAF] dark:shadow-[2px_2px_0_#0B0F17]">
          <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-bold text-gray-400">در حال بارگذاری پیام‌ها...</p>
        </div>
      ) : activeTab === 'inbox' ? (
        filteredInboxItems.length === 0 ? (
          <div className="py-16 text-center bg-white dark:bg-[#151C28] rounded-2xl border-[1.5px] border-primary-dark/30 dark:border-gray-800 shadow-[2px_2px_0_#59BBAF] dark:shadow-[2px_2px_0_#0B0F17] space-y-3 p-6">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary mx-auto flex items-center justify-center shadow-2xs">
              <Inbox className="w-7 h-7" />
            </div>
            <h3 className="text-base font-black text-ink-darker dark:text-white">
              صندوق ورودی شما خالی است
            </h3>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 max-w-sm mx-auto leading-relaxed">
              پیام‌های جدید ارسال‌شده توسط اساتید، کادر مدرسه یا هم‌کلاسی‌ها در این قسمت نمایش داده می‌شوند.
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  setReplyRecipient(null);
                  setIsComposeOpen(true);
                }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white font-black text-xs border-[1.5px] border-primary-dark shadow-[2px_2px_0_#438C83] active:translate-x-[1px] active:translate-y-[1px] transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>ارسال پیام جدید</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-2.5">
            {filteredInboxItems.map((item) => {
              const isUnread = !item.isRead;
              const hasAttachments = item.message.attachments && item.message.attachments.length > 0;

              return (
                <div
                  key={item.recipientRecordId}
                  onClick={() => setSelectedMessageId(item.message.id)}
                  className={`group relative p-3.5 sm:p-4 rounded-2xl border-[1.5px] transition-all duration-150 cursor-pointer flex items-center justify-between gap-3 active:translate-x-[1px] active:translate-y-[1px] ${isUnread
                    ? 'bg-primary/5 dark:bg-primary/10 border-primary-dark/40 dark:border-primary/40 shadow-[2px_2px_0_#59BBAF] dark:shadow-[2px_2px_0_#0B0F17] hover:shadow-[2.5px_2.5px_0_#59BBAF]'
                    : 'bg-white dark:bg-[#151C28] border-gray-200/80 dark:border-gray-800 shadow-[2px_2px_0_rgba(0,0,0,0.03)] dark:shadow-[2px_2px_0_#0B0F17] hover:border-primary dark:hover:border-primary hover:shadow-[2px_2px_0_#59BBAF]'
                    }`}
                >
                  <div className="flex items-center gap-3 sm:gap-3.5 min-w-0 flex-1">
                    {/* Unread indicator */}
                    <div className="w-2.5 flex items-center justify-center shrink-0">
                      {isUnread ? (
                        <div className="w-2.5 h-2.5 rounded-full bg-primary ring-2 ring-primary/30 animate-pulse" />
                      ) : (
                        <div className="w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-gray-700" />
                      )}
                    </div>

                    {/* Sender Avatar */}
                    <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-ecosystem-light dark:bg-[#163330] text-primary-dark dark:text-primary flex items-center justify-center font-black text-sm shrink-0 border border-primary/30 shadow-2xs">
                      {item.message.sender?.firstName?.[0] || 'ر'}
                    </div>

                    {/* Content Snippet */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs sm:text-sm font-black text-ink-darker dark:text-white group-hover:text-primary dark:group-hover:text-primary transition-colors">
                          {item.message.sender?.firstName} {item.message.sender?.lastName}
                        </span>
                        {getSenderRoleBadge(item.message.sender?.role)}
                        {getPriorityBadge(item.message.priority)}
                        {item.message.classroom && (
                          <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1 bg-gray-100 dark:bg-gray-800/80 px-1.5 py-0.5 rounded-md">
                            <Building className="w-3 h-3 text-primary" />
                            {item.message.classroom.name}
                          </span>
                        )}
                      </div>

                      <h4 className="text-xs sm:text-sm font-bold text-gray-800 dark:text-gray-200 truncate mt-1 group-hover:text-primary-dark dark:group-hover:text-primary transition-colors">
                        {item.message.title}
                      </h4>

                      <p className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                        {item.message.body}
                      </p>
                    </div>
                  </div>

                  {/* Meta / Left Side (RTL) */}
                  <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
                    {hasAttachments && (
                      <div
                        className="flex items-center gap-1 text-[10px] sm:text-[11px] font-bold text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-lg border border-gray-200/60 dark:border-gray-700"
                        title="دارای فایل پیوست"
                      >
                        <Paperclip className="w-3 h-3 text-primary" />
                        <span className="font-mono">{toPersianDigits(item.message.attachments.length)}</span>
                      </div>
                    )}

                    <span className="text-[10px] sm:text-xs text-gray-400 font-mono font-medium">
                      {gregorianToJalaliStr(item.createdAt)}
                    </span>

                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        /* Sent Items */
        filteredSentItems.length === 0 ? (
          <div className="py-16 text-center bg-white dark:bg-[#151C28] rounded-2xl border-[1.5px] border-primary-dark/30 dark:border-gray-800 shadow-[2px_2px_0_#59BBAF] dark:shadow-[2px_2px_0_#0B0F17] space-y-3 p-6">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary mx-auto flex items-center justify-center shadow-2xs">
              <Send className="w-7 h-7" />
            </div>
            <h3 className="text-base font-black text-ink-darker dark:text-white">
              هیچ پیام ارسالی ثبت نشده است
            </h3>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 max-w-sm mx-auto leading-relaxed">
              پیام‌هایی که برای دیگر کاربران، کلاس‌ها یا کل مدرسه ارسال می‌کنید در اینجا آرشیو می‌گردند.
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  setReplyRecipient(null);
                  setIsComposeOpen(true);
                }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white font-black text-xs border-[1.5px] border-primary-dark shadow-[2px_2px_0_#438C83] active:translate-x-[1px] active:translate-y-[1px] transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>ارسال پیام جدید</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-2.5">
            {filteredSentItems.map((item) => {
              const hasAttachments = item.attachments && item.attachments.length > 0;

              return (
                <div
                  key={item.id}
                  onClick={() => setSelectedMessageId(item.id)}
                  className="group relative p-3.5 sm:p-4 rounded-2xl border-[1.5px] border-gray-200/80 dark:border-gray-800 bg-white dark:bg-[#151C28] shadow-[2px_2px_0_rgba(0,0,0,0.03)] dark:shadow-[2px_2px_0_#0B0F17] hover:border-primary dark:hover:border-primary hover:shadow-[2px_2px_0_#59BBAF] transition-all duration-150 active:translate-x-[1px] active:translate-y-[1px] cursor-pointer flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 sm:gap-3.5 min-w-0 flex-1">
                    <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-ecosystem-light dark:bg-[#163330] text-primary-dark dark:text-primary flex items-center justify-center font-bold text-xs shrink-0 border border-primary/30 shadow-2xs">
                      <Send className="w-4 h-4" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs sm:text-sm font-black text-primary-dark dark:text-primary">
                          {item.targetType === 'ALL'
                            ? 'ارسال همگانی'
                            : item.targetType === 'ROLE'
                              ? 'ارسال به گروه نقشی'
                              : item.targetType === 'CLASSROOM'
                                ? `کلاس ${item.classroom?.name || ''}`
                                : 'پیام مستقیم / فردی'}
                        </span>
                        {item.recipientsCount !== undefined && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-bold">
                            {toPersianDigits(item.recipientsCount)} گیرنده
                          </span>
                        )}
                        {getPriorityBadge(item.priority)}
                      </div>

                      <h4 className="text-xs sm:text-sm font-bold text-gray-800 dark:text-gray-200 truncate mt-1 group-hover:text-primary-dark dark:group-hover:text-primary transition-colors">
                        {item.title}
                      </h4>

                      <p className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                        {item.body}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
                    {hasAttachments && (
                      <div className="flex items-center gap-1 text-[10px] sm:text-[11px] font-bold text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-lg border border-gray-200/60 dark:border-gray-700">
                        <Paperclip className="w-3 h-3 text-primary" />
                        <span className="font-mono">{toPersianDigits(item.attachments.length)}</span>
                      </div>
                    )}

                    <span className="text-[10px] sm:text-xs text-gray-400 font-mono font-medium">
                      {gregorianToJalaliStr(item.createdAt)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {/* 4. Modals */}
      <ComposeMessageModal
        isOpen={isComposeOpen}
        onClose={() => {
          setIsComposeOpen(false);
          setReplyRecipient(null);
        }}
        onSuccess={fetchMessages}
        defaultRecipientId={replyRecipient?.id}
        defaultRecipientName={replyRecipient?.name}
        defaultSubject={replyRecipient?.subject}
        replyToMessage={replyRecipient?.message}
      />

      <MessageDetailModal
        isOpen={Boolean(selectedMessageId)}
        messageId={selectedMessageId}
        onClose={() => setSelectedMessageId(null)}
        onDeleted={() => {
          setSelectedMessageId(null);
          fetchMessages();
        }}
        onReply={handleReply}
      />
    </div>
  );
};
