import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useAuthStore } from '../../../lib/auth/auth-store';
import { useTenantStore } from '../../../lib/auth/tenant-store';
import { apiClient } from '../../../lib/api/client';
import { useScrollLock } from '../../../lib/hooks/useScrollLock';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Modal } from '../../../components/ui/Modal';
import { Skeleton } from '../../../components/ui/Skeleton';
import { toPersianDigits } from '../../../lib/utils';
import { toast } from '../../../components/ui/toast/toast';
import { useUndoableMutation } from '../../../lib/hooks/useUndoableMutation';
import { TOAST_MESSAGES } from '../../../constants/toast-messages';
import { FormattedMessageView } from '../../../components/ui/FormattedMessageView';
import { CreateMediaPostModal } from './components/CreateMediaPostModal';
import {
  Heart,
  MessageCircle,
  Share2,
  Paperclip,
  Image as ImageIcon,
  Sparkles,
  Send,
  Trash2,
  Pin,
  ChevronLeft,
  ChevronRight,
  Plus,
  Filter,
  CheckCircle2,
  AlertCircle,
  FileText,
  Download,
  Users,
  GraduationCap,
  School,
  X,
  Maximize2,
  File,
  ArrowRight,
} from 'lucide-react';

interface Attachment {
  name: string;
  url: string;
  size?: number;
  mimeType?: string;
}

interface MediaComment {
  id: string;
  authorId: string;
  content: string;
  createdAt: string;
  author: {
    id: string;
    firstName: string;
    lastName: string;
    role: string;
    avatarUrl?: string;
  };
}

interface MediaPost {
  id: string;
  tenantId: string;
  authorId: string;
  title: string;
  slug: string;
  content: string;
  coverImageUrl?: string;
  postType: string; // STANDARD, SLIDESHOW, DOCUMENT, ANNOUNCEMENT
  mediaUrls: string[];
  attachments?: Attachment[];
  audienceType: string; // ALL, ROLES, CLASSROOMS
  targetRoles: string[];
  targetClassroomIds: string[];
  isPinned: boolean;
  allowComments: boolean;
  isLikedByMe: boolean;
  likeCount: number;
  commentCount: number;
  createdAt: string;
  author: {
    id: string;
    firstName: string;
    lastName: string;
    role: string;
    avatarUrl?: string;
  };
  comments?: MediaComment[];
}

export const MediaFeedPage: React.FC = () => {
  const user = useAuthStore((state) => state.user);
  const currentTenant = useTenantStore((state) => state.currentTenant);

  const [posts, setPosts] = useState<MediaPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'SLIDESHOW' | 'DOCUMENT' | 'ANNOUNCEMENT'>('ALL');
  const [classrooms, setClassrooms] = useState<{ id: string; name: string }[]>([]);

  // Create Post Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Active slide tracker for carousel posts (key = postId, value = slideIndex)
  const [activeSlides, setActiveSlides] = useState<Record<string, number>>({});

  // Expanded comments tracker (key = postId, value = boolean)
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});

  // Comment input state (key = postId, value = string)
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [isSubmittingComment, setIsSubmittingComment] = useState<Record<string, boolean>>({});

  // Lightbox preview state
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  // Single Post Popup State
  const [selectedPost, setSelectedPost] = useState<MediaPost | null>(null);
  const [popupSlideIndex, setPopupSlideIndex] = useState<number>(0);

  useScrollLock(Boolean(lightboxImage || selectedPost));

  useEffect(() => {
    if (posts.length > 0 && window.location.hash) {
      const hashId = window.location.hash.replace('#', '');
      const matched = posts.find((p) => p.id === hashId);
      if (matched) setSelectedPost(matched);
    }
  }, [posts]);

  const isStaffOrAdmin =
    user?.role === 'SUPER_ADMIN' ||
    user?.role === 'SCHOOL_ADMIN' ||
    user?.role === 'STAFF' ||
    user?.role === 'TEACHER';

  const showToast = (msg: string) => {
    toast.success(msg);
  };

  // 1. Fetch Feed
  const fetchFeed = async () => {
    try {
      setIsLoading(true);
      const res = await apiClient.get('/media');
      if (res.data) {
        setPosts(res.data);
      }
    } catch (err: any) {
      console.error('Failed to load media feed', err);
      showToast('خطا در بارگذاری فید رسانه');
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Fetch Classrooms for targeting
  useEffect(() => {
    fetchFeed();
    if (isStaffOrAdmin) {
      apiClient
        .get('/academic/classrooms')
        .then((res) => {
          if (res.data) setClassrooms(res.data);
        })
        .catch(() => { });
    }
  }, [currentTenant?.id]);

  // Handle Like
  const handleToggleLike = async (postId: string) => {
    try {
      // Optimistic update
      setPosts((prev) =>
        prev.map((p) => {
          if (p.id === postId) {
            const nextLiked = !p.isLikedByMe;
            return {
              ...p,
              isLikedByMe: nextLiked,
              likeCount: nextLiked ? p.likeCount + 1 : Math.max(0, p.likeCount - 1),
            };
          }
          return p;
        }),
      );

      const res = await apiClient.post(`/media/${postId}/like`);
      if (res.data) {
        setPosts((prev) =>
          prev.map((p) =>
            p.id === postId
              ? { ...p, isLikedByMe: res.data.isLiked, likeCount: res.data.likeCount }
              : p,
          ),
        );
      }
    } catch (err) {
      console.error('Like toggle failed', err);
      // Revert on error
      fetchFeed();
    }
  };

  // Handle Add Comment
  const handleAddComment = async (postId: string) => {
    const text = commentInputs[postId]?.trim();
    if (!text) return;

    try {
      setIsSubmittingComment((prev) => ({ ...prev, [postId]: true }));
      const res = await apiClient.post(`/media/${postId}/comments`, { content: text });
      if (res.data) {
        setPosts((prev) =>
          prev.map((p) => {
            if (p.id === postId) {
              const currentComments = p.comments || [];
              return {
                ...p,
                comments: [...currentComments, res.data],
                commentCount: p.commentCount + 1,
              };
            }
            return p;
          }),
        );
        setCommentInputs((prev) => ({ ...prev, [postId]: '' }));
        // Ensure comments are visible
        setExpandedComments((prev) => ({ ...prev, [postId]: true }));
      }
    } catch (err: any) {
      console.error('Failed to post comment', err);
      showToast(err.message || 'خطا در ثبت نظر');
    } finally {
      setIsSubmittingComment((prev) => ({ ...prev, [postId]: false }));
    }
  };

  // Undoable Delete Mutation for Posts with 5-second countdown
  // Deletes on server immediately, then provides 5s window to restore!
  const { execute: executeUndoableDeletePost } = useUndoableMutation<MediaPost>({
    undoLabel: (p) => TOAST_MESSAGES.communication.postDeleted(p.title),
    delayMs: 5000,
    optimisticUpdate: (p) => {
      setPosts((prev) => prev.filter((item) => item.id !== p.id));
    },
    mutationFn: async (p) => {
      await apiClient.delete(`/media/${p.id}`);
    },
    undoFn: async (p) => {
      await apiClient.patch(`/media/${p.id}/restore`);
      await fetchFeed();
    },
    revertUpdate: (p) => {
      setPosts((prev) => {
        if (prev.some((item) => item.id === p.id)) return prev;
        return [p, ...prev];
      });
      toast.info(`پست «${p.title || 'رسانه'}» بازگردانی شد.`);
    },
    onError: (err, p) => {
      toast.error(err?.response?.data?.message || `خطا در حذف پست «${p.title || ''}»`);
    },
  });

  // Undoable Delete Mutation for Comments with 5-second countdown
  // Deletes on server immediately, then provides 5s window to restore!
  const { execute: executeUndoableDeleteComment } = useUndoableMutation<{
    post: MediaPost;
    comment: MediaComment;
  }>({
    undoLabel: TOAST_MESSAGES.communication.commentDeleted,
    delayMs: 5000,
    optimisticUpdate: ({ post, comment }) => {
      setPosts((prev) =>
        prev.map((p) => {
          if (p.id === post.id) {
            return {
              ...p,
              comments: (p.comments || []).filter((c) => c.id !== comment.id),
              commentCount: Math.max(0, p.commentCount - 1),
            };
          }
          return p;
        }),
      );
    },
    mutationFn: async ({ comment }) => {
      await apiClient.delete(`/media/comments/${comment.id}`);
    },
    undoFn: async ({ comment }) => {
      await apiClient.patch(`/media/comments/${comment.id}/restore`);
    },
    revertUpdate: ({ post, comment }) => {
      setPosts((prev) =>
        prev.map((p) => {
          if (p.id === post.id) {
            return {
              ...p,
              comments: [...(p.comments || []), comment],
              commentCount: p.commentCount + 1,
            };
          }
          return p;
        }),
      );
      toast.info('نظر بازگردانی شد.');
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'خطا در حذف نظر');
    },
  });

  // Handle Share Post
  const handleSharePost = (post: MediaPost) => {
    const shareUrl = `${window.location.origin}/app/media#${post.id}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl);
      showToast(TOAST_MESSAGES.communication.shareLinkCopied);
    } else {
      showToast(shareUrl);
    }
  };



  // Role display badge helper
  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return <Badge variant="default" className="text-[10px]">سوپرادمین</Badge>;
      case 'SCHOOL_ADMIN':
        return <Badge variant="sec" className="text-[10px]">مدیریت هنرستان</Badge>;
      case 'STAFF':
        return <Badge variant="sec" className="text-[10px]">کادر اجرایی</Badge>;
      case 'TEACHER':
        return <Badge variant="male" className="text-[10px]">مربی</Badge>;
      case 'STUDENT':
        return <Badge variant="college" className="text-[10px]">دانش‌آموز</Badge>;
      case 'PARENT':
        return <Badge variant="female" className="text-[10px]">اولیاء</Badge>;
      default:
        return <Badge variant="neutral" className="text-[10px]">{role}</Badge>;
    }
  };

  // Audience indicator helper
  const renderAudienceBadge = (post: MediaPost) => {
    if (post.audienceType === 'ALL') {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-500/20">
          <Users className="w-3 h-3" />
          <span>عمومی</span>
        </span>
      );
    }
    if (post.audienceType === 'ROLES') {
      const roleLabels = post.targetRoles.map((r) => {
        if (r === 'STUDENT') return 'دانش‌آموزان';
        if (r === 'PARENT') return 'اولیاء';
        if (r === 'TEACHER') return 'مربیان';
        return r;
      });
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/40 px-2 py-0.5 rounded-full border border-purple-500/20">
          <Users className="w-3 h-3" />
          <span>{roleLabels.join('، ') || 'نقش‌های خاص'}</span>
        </span>
      );
    }
    if (post.audienceType === 'CLASSROOMS') {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded-full border border-blue-500/20">
          <GraduationCap className="w-3 h-3" />
          <span>کلاس‌های منتخب</span>
        </span>
      );
    }
    return null;
  };

  // Post type indicator helper
  const renderPostTypeBadge = (post: MediaPost) => {
    if (post.postType === 'ANNOUNCEMENT' || post.isPinned) {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
          <Sparkles className="w-3 h-3" />
          <span>اطلاعیه</span>
        </span>
      );
    }
    if (post.postType === 'SLIDESHOW' || (post.mediaUrls && post.mediaUrls.length > 0)) {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-primary dark:text-primary-light bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">
          <ImageIcon className="w-3 h-3" />
          <span>گزارش تصویری</span>
        </span>
      );
    }
    if (post.postType === 'DOCUMENT' || (post.attachments && post.attachments.length > 0)) {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-700 dark:text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20">
          <FileText className="w-3 h-3" />
          <span>فایل‌ها</span>
        </span>
      );
    }
    return null;
  };

  // Filtered posts
  const filteredPosts = posts.filter((p) => {
    if (activeFilter === 'ALL') return true;
    if (activeFilter === 'ANNOUNCEMENT') return p.postType === 'ANNOUNCEMENT' || p.isPinned;
    if (activeFilter === 'SLIDESHOW') return p.postType === 'SLIDESHOW' || (p.mediaUrls && p.mediaUrls.length > 0);
    if (activeFilter === 'DOCUMENT') return p.postType === 'DOCUMENT' || (p.attachments && p.attachments.length > 0);
    return true;
  });

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* 4 Fixed Filter Options */}
      <div className="w-full bg-gray-100 dark:bg-[#151C28] p-1.5 rounded-2xl border border-gray-200/80 dark:border-gray-800 grid grid-cols-4 gap-1 sm:gap-1.5 select-none">
        <button
          type="button"
          onClick={() => setActiveFilter('ALL')}
          className={`min-h-[44px] py-2 px-1 sm:px-3 rounded-xl text-xs sm:text-sm font-bold transition-all text-center flex items-center justify-center ${activeFilter === 'ALL'
              ? 'bg-white dark:bg-[#1C2536] text-ink-darker dark:text-white shadow-xs font-black'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-white/50 dark:hover:bg-[#1C2536]/50'
            }`}
        >
          همه پست‌ها
        </button>
        <button
          type="button"
          onClick={() => setActiveFilter('ANNOUNCEMENT')}
          className={`min-h-[44px] py-2 px-1 sm:px-3 rounded-xl text-xs sm:text-sm font-bold transition-all text-center flex items-center justify-center ${activeFilter === 'ANNOUNCEMENT'
              ? 'bg-white dark:bg-[#1C2536] text-ink-darker dark:text-white shadow-xs font-black'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-white/50 dark:hover:bg-[#1C2536]/50'
            }`}
        >
          اطلاعیه‌ها
        </button>
        <button
          type="button"
          onClick={() => setActiveFilter('SLIDESHOW')}
          className={`min-h-[44px] py-2 px-1 sm:px-3 rounded-xl text-xs sm:text-sm font-bold transition-all text-center flex items-center justify-center ${activeFilter === 'SLIDESHOW'
              ? 'bg-white dark:bg-[#1C2536] text-ink-darker dark:text-white shadow-xs font-black'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-white/50 dark:hover:bg-[#1C2536]/50'
            }`}
        >
          گزارش تصویری
        </button>
        <button
          type="button"
          onClick={() => setActiveFilter('DOCUMENT')}
          className={`min-h-[44px] py-2 px-1 sm:px-3 rounded-xl text-xs sm:text-sm font-bold transition-all text-center flex items-center justify-center ${activeFilter === 'DOCUMENT'
              ? 'bg-white dark:bg-[#1C2536] text-ink-darker dark:text-white shadow-xs font-black'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-white/50 dark:hover:bg-[#1C2536]/50'
            }`}
        >
          فایل‌ها
        </button>
      </div>

      {/* Staff Action if applicable */}
      {isStaffOrAdmin && (
        <div className="flex items-center justify-between gap-2 pt-1">
          <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
            نمایش {toPersianDigits(filteredPosts.length)} پست
          </span>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsCreateModalOpen(true)}
            className="text-xs flex items-center gap-1.5 min-h-[44px] px-3.5 shadow-2xs"
          >
            <Plus className="h-4 w-4" />
            <span>انتشار پست</span>
          </Button>
        </div>
      )}

      {/* Feed List */}
      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-64 w-full rounded-2xl" />
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      ) : filteredPosts.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-[#1C2536] text-gray-400 dark:text-gray-400 flex items-center justify-center mx-auto mb-3">
            <ImageIcon className="w-8 h-8" />
          </div>
          <h3 className="font-extrabold text-base text-ink-darker dark:text-white mb-1">
            هنوز مطلبی در این بخش منتشر نشده است
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            پست‌های کارگاهی، گزارش‌های تصویری و اطلاعیه‌ها در این قسمت نمایش داده می‌شوند.
          </p>
        </Card>
      ) : (
        <div className="space-y-4 sm:space-y-5">
          {filteredPosts.map((post) => {
            const hasSlides = post.mediaUrls && post.mediaUrls.length > 0;
            const isSlideCount = post.mediaUrls?.length || 0;

            return (
              <Card
                key={post.id}
                className={`overflow-hidden transition-all border ${post.isPinned
                    ? 'border-primary/50 dark:border-primary/60 shadow-xs'
                    : 'border-gray-200/80 dark:border-gray-800'
                  } bg-white dark:bg-[#151C28] rounded-2xl`}
              >
                {/* Post Header: Improved 2-row layout */}
                <div className="p-3.5 sm:p-4 pb-3 border-b border-gray-100 dark:border-gray-800 space-y-2.5">
                  {/* Top Row: Author & Delete Action */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center font-bold text-primary shrink-0 overflow-hidden shadow-2xs">
                        {post.author?.avatarUrl ? (
                          <img
                            src={post.author.avatarUrl}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span>{post.author?.firstName?.[0] || 'ر'}</span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-sm text-ink-darker dark:text-white truncate">
                            {post.author?.firstName} {post.author?.lastName}
                          </span>
                          {getRoleBadge(post.author?.role)}
                        </div>
                        <span className="text-[11px] text-gray-400 dark:text-gray-400 font-mono mt-0.5 block">
                          {new Date(post.createdAt).toLocaleDateString('fa-IR', {
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    </div>

                    {(isStaffOrAdmin || post.authorId === user?.id) && (
                      <button
                        onClick={() => executeUndoableDeletePost(post)}
                        className="min-h-[40px] min-w-[40px] flex items-center justify-center text-gray-400 hover:text-red-500 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors shrink-0"
                        title="حذف پست"
                        aria-label="حذف پست"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Labels Row: Beautiful, clearly arranged pills */}
                  <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                    {post.isPinned && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 px-2 py-0.5 rounded-full border border-amber-300/50 dark:border-amber-800/50 shadow-2xs">
                        <Pin className="w-3 h-3 text-amber-500" />
                        <span>سنجاق‌شده</span>
                      </span>
                    )}
                    {renderPostTypeBadge(post)}
                    {renderAudienceBadge(post)}
                  </div>
                </div>

                {/* Post Title & Media Preview (NO post.content in feed) */}
                <div className="p-3.5 sm:p-4 pt-3 space-y-2.5">
                  <h3
                    onClick={() => setSelectedPost(post)}
                    className="text-base sm:text-lg font-black text-ink-darker dark:text-white leading-snug cursor-pointer hover:text-primary dark:hover:text-primary-light transition-colors"
                  >
                    {post.title}
                  </h3>

                  {/* Media Cover Preview */}
                  {hasSlides && (
                    <div
                      onClick={() => setSelectedPost(post)}
                      className="relative rounded-xl overflow-hidden border border-gray-200/80 dark:border-gray-800 bg-black/5 dark:bg-black/40 cursor-pointer group"
                    >
                      <div className="relative aspect-[16/9] w-full flex items-center justify-center overflow-hidden">
                        <img
                          src={post.mediaUrls[0]}
                          alt={post.title}
                          className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
                        />
                        {isSlideCount > 1 && (
                          <div className="absolute bottom-2.5 left-2.5 px-2.5 py-1 rounded-lg bg-black/70 text-white text-[11px] font-bold backdrop-blur-xs flex items-center gap-1.5 shadow-md">
                            <ImageIcon className="w-3.5 h-3.5 text-primary" />
                            <span>+{toPersianDigits(isSlideCount)} تصویر</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Attachments Pill Preview */}
                  {post.attachments && post.attachments.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedPost(post)}
                      className="inline-flex items-center gap-2 p-2 px-3 rounded-xl bg-gray-50 dark:bg-[#1C2536] border border-gray-200/80 dark:border-gray-700 text-xs font-bold text-gray-700 dark:text-gray-200 hover:border-primary transition-colors shadow-2xs"
                    >
                      <File className="w-4 h-4 text-primary shrink-0" />
                      <span>شامل {toPersianDigits(post.attachments.length)} فایل پیوست</span>
                    </button>
                  )}
                </div>

                {/* Action Bar */}
                <div className="px-3.5 sm:px-4 py-2 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-2 space-x-reverse">
                    {/* Like Button */}
                    <button
                      onClick={() => handleToggleLike(post.id)}
                      className={`min-h-[44px] px-3 py-2 rounded-xl flex items-center space-x-1.5 space-x-reverse font-bold transition-all active:scale-110 hover:bg-gray-100 dark:hover:bg-[#1C2536] ${post.isLikedByMe
                          ? 'text-rose-600 dark:text-rose-400'
                          : 'text-gray-500 dark:text-gray-400 hover:text-rose-500'
                        }`}
                    >
                      <Heart
                        className={`w-4 h-4 ${post.isLikedByMe ? 'fill-current' : ''}`}
                      />
                      <span>{toPersianDigits(post.likeCount)}</span>
                    </button>

                    {/* Comments Count Button */}
                    <button
                      onClick={() => setSelectedPost(post)}
                      className="min-h-[44px] px-3 py-2 rounded-xl flex items-center space-x-1.5 space-x-reverse text-gray-500 dark:text-gray-400 hover:text-primary hover:bg-gray-100 dark:hover:bg-[#1C2536] font-bold transition-colors"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span>{toPersianDigits(post.commentCount)} نظر</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* Share Button */}
                    <button
                      onClick={() => handleSharePost(post)}
                      className="min-h-[44px] px-3 py-2 rounded-xl flex items-center space-x-1.5 space-x-reverse text-gray-500 dark:text-gray-400 hover:text-primary hover:bg-gray-100 dark:hover:bg-[#1C2536] font-bold transition-colors"
                      title="اشتراک‌گذاری پست"
                    >
                      <Share2 className="w-4 h-4" />
                    </button>

                    {/* View Full Post Button (Popup Trigger) */}
                    <button
                      onClick={() => setSelectedPost(post)}
                      className="min-h-[44px] px-3.5 py-2 rounded-xl flex items-center gap-1 bg-primary/10 hover:bg-primary/20 text-primary-darker dark:text-primary-light font-bold transition-all text-xs"
                    >
                      <span>مشاهده کامل</span>
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Advanced Single Post Popup with Modern Navigation Bar */}
      {selectedPost &&
        (() => {
          const activePopupPost = posts.find((p) => p.id === selectedPost?.id) || selectedPost;
          if (!activePopupPost) return null;

          const currentIndex = filteredPosts.findIndex((p) => p.id === activePopupPost.id);
          const totalPosts = filteredPosts.length;
          const hasPrev = currentIndex > 0;
          const hasNext = currentIndex !== -1 && currentIndex < totalPosts - 1;

          const handlePrevPost = () => {
            if (hasPrev) {
              setSelectedPost(filteredPosts[currentIndex - 1]);
              setPopupSlideIndex(0);
            }
          };

          const handleNextPost = () => {
            if (hasNext) {
              setSelectedPost(filteredPosts[currentIndex + 1]);
              setPopupSlideIndex(0);
            }
          };

          const handleCloseModal = () => {
            setSelectedPost(null);
            if (window.location.hash) {
              window.history.replaceState(null, '', window.location.pathname);
            }
          };

          return (
            <div
              className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 overscroll-contain animate-in fade-in duration-200"
              onTouchMove={(e) => {
                if (e.target === e.currentTarget) e.preventDefault();
              }}
            >
              {/* Backdrop */}
              <div
                className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
                onClick={handleCloseModal}
              />

              {/* Modal Container */}
              <div className="relative w-full max-w-2xl max-h-[92vh] sm:max-h-[90vh] bg-white dark:bg-[#151C28] text-ink-normal dark:text-white rounded-t-3xl sm:rounded-3xl border border-gray-200/80 dark:border-gray-800 shadow-2xl flex flex-col overflow-hidden z-10 animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-200">
                {/* Mobile Pull Handle Indicator */}
                <div className="w-12 h-1 bg-gray-300 dark:bg-gray-700 rounded-full mx-auto my-1.5 sm:hidden shrink-0" />

                {/* STICKY TOP NAVIGATION BAR */}
                <header className="sticky top-0 z-20 bg-white/95 dark:bg-[#151C28]/95 backdrop-blur-md border-b border-gray-200/80 dark:border-gray-800 px-3 sm:px-5 py-2.5 flex items-center justify-between gap-2 shrink-0 select-none">
                  {/* Right Side: Close Button & Category Badge */}
                  <div className="flex items-center gap-2 min-w-0">
                    <button
                      type="button"
                      onClick={handleCloseModal}
                      className="min-h-[40px] min-w-[40px] rounded-xl bg-gray-100 hover:bg-gray-200/80 dark:bg-[#1C2536] dark:hover:bg-[#242F42] text-gray-600 dark:text-gray-300 flex items-center justify-center transition-all shrink-0 active:scale-95"
                      title="بستن پنجره"
                      aria-label="بستن"
                    >
                      <X className="w-5 h-5" />
                    </button>

                    <div className="flex items-center gap-1.5 min-w-0">
                      {renderPostTypeBadge(activePopupPost)}
                    </div>
                  </div>

                  {/* Middle: Prev / Next Navigation Controls */}
                  {totalPosts > 1 && currentIndex !== -1 && (
                    <div className="flex items-center gap-0.5 bg-gray-100/90 dark:bg-[#1C2536]/90 px-1 py-1 rounded-xl border border-gray-200/60 dark:border-gray-700/60 shrink-0">
                      <button
                        type="button"
                        disabled={!hasPrev}
                        onClick={handlePrevPost}
                        className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-[#242F42] disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                        title="پست قبلی (جدیدتر)"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>

                      <span className="text-[11px] font-bold px-1.5 text-gray-600 dark:text-gray-300 font-mono">
                        {toPersianDigits(currentIndex + 1)} / {toPersianDigits(totalPosts)}
                      </span>

                      <button
                        type="button"
                        disabled={!hasNext}
                        onClick={handleNextPost}
                        className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-[#242F42] disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                        title="پست بعدی (قدیمی‌تر)"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {/* Left Side: Actions (Like with Counter, Share) */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleToggleLike(activePopupPost.id)}
                      className={`min-h-[40px] px-2.5 sm:px-3 rounded-xl flex items-center gap-1.5 text-xs font-bold transition-all border ${activePopupPost.isLikedByMe
                          ? 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800/60'
                          : 'text-gray-600 dark:text-gray-400 bg-gray-100/80 dark:bg-[#1C2536]/80 border-gray-200/60 dark:border-gray-700/60 hover:text-rose-500 hover:bg-gray-200/60 dark:hover:bg-[#242F42]/60'
                        }`}
                      title={activePopupPost.isLikedByMe ? 'پسندیده‌اید' : 'پسندیدن'}
                    >
                      <Heart className={`w-4 h-4 ${activePopupPost.isLikedByMe ? 'fill-current text-rose-500' : ''}`} />
                      <span className="font-mono text-[11px] sm:text-xs">
                        {toPersianDigits(activePopupPost.likeCount || 0)}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSharePost(activePopupPost)}
                      className="min-h-[40px] min-w-[40px] rounded-xl bg-gray-100/80 dark:bg-[#1C2536]/80 hover:bg-gray-200/80 dark:hover:bg-[#242F42]/80 border border-gray-200/60 dark:border-gray-700/60 text-gray-600 dark:text-gray-300 hover:text-primary flex items-center justify-center transition-all active:scale-95"
                      title="اشتراک‌گذاری و کپی لینک"
                      aria-label="اشتراک‌گذاری"
                    >
                      <Share2 className="w-4 h-4" />
                    </button>
                  </div>
                </header>

                {/* SCROLLABLE BODY */}
                <div className="overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-5">
                  {/* Author Card & Badges */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-gray-100 dark:border-gray-800">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center font-bold text-primary shrink-0 overflow-hidden shadow-2xs">
                        {activePopupPost.author?.avatarUrl ? (
                          <img src={activePopupPost.author.avatarUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span>{activePopupPost.author?.firstName?.[0] || 'ر'}</span>
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-sm text-ink-darker dark:text-white">
                            {activePopupPost.author?.firstName} {activePopupPost.author?.lastName}
                          </span>
                          {getRoleBadge(activePopupPost.author?.role)}
                        </div>
                        <span className="text-[11px] text-gray-400 dark:text-gray-400 font-mono">
                          {new Date(activePopupPost.createdAt).toLocaleDateString('fa-IR', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      {activePopupPost.isPinned && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 px-2 py-0.5 rounded-full border border-amber-300/50 dark:border-amber-800/50">
                          <Pin className="w-3 h-3 text-amber-500" />
                          <span>سنجاق</span>
                        </span>
                      )}
                      {renderAudienceBadge(activePopupPost)}
                    </div>
                  </div>

                  {/* Full Title */}
                  <h2 className="text-base sm:text-lg md:text-xl font-black text-ink-darker dark:text-white leading-snug">
                    {activePopupPost.title}
                  </h2>

                  {/* Full Description / Content */}
                  <div className="p-4 sm:p-5 rounded-2xl bg-gray-50/90 dark:bg-[#1C2536]/70 border border-gray-200/70 dark:border-gray-800 text-xs sm:text-sm text-ink-darker dark:text-gray-200 leading-relaxed font-medium shadow-2xs">
                    <FormattedMessageView content={activePopupPost.content} />
                  </div>

                  {/* Interactive Slideshow in Popup */}
                  {activePopupPost.mediaUrls && activePopupPost.mediaUrls.length > 0 && (
                    <div className="space-y-2">
                      <div className="relative rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-800 bg-black/5 dark:bg-black/40">
                        <div className="relative aspect-[16/9] w-full flex items-center justify-center overflow-hidden">
                          <img
                            src={activePopupPost.mediaUrls[popupSlideIndex % activePopupPost.mediaUrls.length]}
                            alt=""
                            className="w-full h-full object-cover cursor-pointer"
                            onClick={() => setLightboxImage(activePopupPost.mediaUrls[popupSlideIndex % activePopupPost.mediaUrls.length])}
                          />

                          <button
                            onClick={() => setLightboxImage(activePopupPost.mediaUrls[popupSlideIndex % activePopupPost.mediaUrls.length])}
                            className="absolute top-2.5 left-2.5 p-1.5 rounded-lg bg-black/60 text-white hover:bg-black/80 transition-colors"
                            title="بزرگ‌نمایی تصویر"
                          >
                            <Maximize2 className="w-4 h-4" />
                          </button>

                          {activePopupPost.mediaUrls.length > 1 && (
                            <>
                              <button
                                onClick={() =>
                                  setPopupSlideIndex(
                                    (prev) => (prev - 1 + activePopupPost.mediaUrls.length) % activePopupPost.mediaUrls.length
                                  )
                                }
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 min-h-[44px] min-w-[44px] p-2 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors flex items-center justify-center shadow-md"
                                aria-label="تصویر قبلی"
                              >
                                <ChevronRight className="w-5 h-5" />
                              </button>
                              <button
                                onClick={() =>
                                  setPopupSlideIndex((prev) => (prev + 1) % activePopupPost.mediaUrls.length)
                                }
                                className="absolute left-2.5 top-1/2 -translate-y-1/2 min-h-[44px] min-w-[44px] p-2 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors flex items-center justify-center shadow-md"
                                aria-label="تصویر بعدی"
                              >
                                <ChevronLeft className="w-5 h-5" />
                              </button>
                            </>
                          )}
                        </div>

                        {activePopupPost.mediaUrls.length > 1 && (
                          <div className="flex items-center justify-between p-2.5 bg-gray-900/85 text-white text-xs">
                            <div className="flex items-center gap-1.5 mr-1">
                              {activePopupPost.mediaUrls.map((_, idx) => (
                                <button
                                  key={idx}
                                  onClick={() => setPopupSlideIndex(idx)}
                                  className={`h-1.5 rounded-full transition-all ${idx === (popupSlideIndex % activePopupPost.mediaUrls.length) ? 'w-5 bg-primary' : 'w-1.5 bg-white/40'
                                    }`}
                                />
                              ))}
                            </div>
                            <span className="text-[11px] font-mono font-bold text-gray-300 ml-1">
                              {toPersianDigits((popupSlideIndex % activePopupPost.mediaUrls.length) + 1)} از {toPersianDigits(activePopupPost.mediaUrls.length)}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Small Thumbnails Row */}
                      {activePopupPost.mediaUrls.length > 1 && (
                        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                          {activePopupPost.mediaUrls.map((url, idx) => (
                            <button
                              key={idx}
                              onClick={() => setPopupSlideIndex(idx)}
                              className={`relative w-14 h-14 rounded-xl overflow-hidden shrink-0 border-2 transition-all ${idx === (popupSlideIndex % activePopupPost.mediaUrls.length)
                                  ? 'border-primary ring-2 ring-primary/30 scale-105'
                                  : 'border-transparent opacity-60 hover:opacity-100'
                                }`}
                            >
                              <img src={url} alt="" className="w-full h-full object-cover" />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Attachments Section in Popup */}
                  {activePopupPost.attachments && activePopupPost.attachments.length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                      <h4 className="font-bold text-xs text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                        <FileText className="w-4 h-4 text-indigo-500" />
                        <span>پیوست‌ها و فایل‌های ضمیمه ({toPersianDigits(activePopupPost.attachments.length)})</span>
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {activePopupPost.attachments.map((att, idx) => (
                          <a
                            key={idx}
                            href={att.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-[#1C2536]/80 border border-gray-200/80 dark:border-gray-700 hover:border-primary/50 transition-colors group shadow-2xs"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                                <FileText className="w-4 h-4" />
                              </div>
                              <span className="text-xs font-bold text-gray-700 dark:text-gray-200 truncate group-hover:text-primary transition-colors">
                                {att.name || 'فایل پیوست'}
                              </span>
                            </div>
                            <Download className="w-4 h-4 text-gray-400 group-hover:text-primary shrink-0 mr-2" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Comments Section inside Modal */}
                  <div className="pt-2 border-t border-gray-100 dark:border-gray-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-xs sm:text-sm text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                        <MessageCircle className="w-4 h-4 text-primary" />
                        <span>نظرات و بازخوردها ({toPersianDigits(activePopupPost.comments?.length || 0)})</span>
                      </h4>
                    </div>

                    {activePopupPost.comments && activePopupPost.comments.length > 0 ? (
                      <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                        {activePopupPost.comments.map((comment) => (
                          <div
                            key={comment.id}
                            className="p-3 rounded-xl bg-gray-50 dark:bg-[#1C2536]/80 border border-gray-200/70 dark:border-gray-700 flex items-start justify-between gap-3 shadow-2xs"
                          >
                            <div className="flex items-start space-x-2.5 space-x-reverse min-w-0">
                              <div className="w-7 h-7 rounded-lg bg-primary/10 font-bold text-primary flex items-center justify-center shrink-0 text-xs mt-0.5">
                                {comment.author?.firstName?.[0] || 'ک'}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-bold text-ink-darker dark:text-white">
                                    {comment.author?.firstName} {comment.author?.lastName}
                                  </span>
                                  {getRoleBadge(comment.author?.role)}
                                  <span className="text-[10px] text-gray-400">
                                    {new Date(comment.createdAt).toLocaleDateString('fa-IR')}
                                  </span>
                                </div>
                                <p className="text-xs text-gray-700 dark:text-gray-300 mt-1 leading-relaxed">
                                  {comment.content}
                                </p>
                              </div>
                            </div>

                            {(isStaffOrAdmin || comment.authorId === user?.id) && (
                              <button
                                onClick={() => executeUndoableDeleteComment({ post: activePopupPost, comment })}
                                className="min-h-[32px] min-w-[32px] flex items-center justify-center text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                                title="حذف نظر"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400 dark:text-gray-400 py-1">
                        هنوز نظری ثبت نشده است. اولین نفری باشید که دیدگاه خود را می‌نویسید!
                      </p>
                    )}

                    {/* Add Comment Input */}
                    {activePopupPost.allowComments ? (
                      <div className="flex items-center gap-2 pt-1">
                        <input
                          type="text"
                          placeholder="دیدگاه خود را بنویسید..."
                          value={commentInputs[activePopupPost.id] || ''}
                          onChange={(e) =>
                            setCommentInputs((prev) => ({ ...prev, [activePopupPost.id]: e.target.value }))
                          }
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddComment(activePopupPost.id);
                            }
                          }}
                          className="flex-1 min-h-[44px] px-3.5 py-2 rounded-xl bg-white dark:bg-[#1C2536] border border-gray-200 dark:border-gray-700 text-xs sm:text-sm text-ink-darker dark:text-gray-100 focus:outline-none focus:border-primary"
                        />
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleAddComment(activePopupPost.id)}
                          disabled={isSubmittingComment[activePopupPost.id] || !commentInputs[activePopupPost.id]?.trim()}
                          className="min-h-[44px] px-4"
                        >
                          <Send className="w-4 h-4 ml-1" />
                          <span>ارسال</span>
                        </Button>
                      </div>
                    ) : (
                      <p className="text-xs text-amber-600 dark:text-amber-400 py-1">
                        ثبت نظر برای این پست غیرفعال است.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

      {/* Lightbox Modal */}
      {lightboxImage &&
        createPortal(
          <div
            className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
            onClick={() => setLightboxImage(null)}
          >
            <div className="relative max-w-4xl w-full max-h-[90vh] flex flex-col items-center">
              <button
                onClick={() => setLightboxImage(null)}
                className="absolute -top-12 left-0 p-2 text-white hover:text-gray-300 transition-colors"
                aria-label="بستن تصویر"
              >
                <X className="w-6 h-6" />
              </button>
              <img
                src={lightboxImage}
                alt="بزرگ‌نمایی تصویر"
                className="max-w-full max-h-[85vh] rounded-2xl object-contain border border-white/20 shadow-2xl"
              />
            </div>
          </div>,
          document.body
        )}      {/* Redesigned Create Post Modal */}
      <CreateMediaPostModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={(newPost) => setPosts((prev) => [newPost, ...prev])}
        classrooms={classrooms}
      />
    </div>
  );
};
