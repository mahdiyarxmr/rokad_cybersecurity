import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Modal } from '../../../../components/ui/Modal';
import { Button } from '../../../../components/ui/Button';
import { FormattedMessageView } from '../../../../components/ui/FormattedMessageView';
import { apiClient } from '../../../../lib/api/client';
import { toast } from '../../../../components/ui/toast/toast';
import { gregorianToJalaliStr, toPersianDigits } from '../../../../utils/jalali';
import { AcademicMessageItem, MessageAttachment } from '../types';
import { normalizeAttachment, getFullMediaUrl } from '../../../../lib/api/media-url';
import {
  Trash2,
  Reply,
  Download,
  Paperclip,
  Clock,
  User,
  Building,
  AlertTriangle,
  FileText,
  Eye,
  ExternalLink,
  Video,
  Play,
  X,
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  messageId: string | null;
  onClose: () => void;
  onDeleted?: (messageId: string) => void;
  onReply?: (
    recipientId: string,
    recipientName: string,
    subject: string,
    replyToMessage?: any,
  ) => void;
}

export const MessageDetailModal: React.FC<Props> = ({
  isOpen,
  messageId,
  onClose,
  onDeleted,
  onReply,
}) => {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [previewVideo, setPreviewVideo] = useState<{ url: string; name: string } | null>(null);
  const [videoError, setVideoError] = useState(false);

  const handleClose = () => {
    setPreviewVideo(null);
    setPreviewImage(null);
    setVideoError(false);
    onClose();
  };

  // Close media preview on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (previewVideo) {
          setPreviewVideo(null);
          setVideoError(false);
          e.stopPropagation();
        } else if (previewImage) {
          setPreviewImage(null);
          e.stopPropagation();
        }
      }
    };
    if (previewVideo || previewImage) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [previewVideo, previewImage]);

  const getDownloadUrl = (url: string, name: string) => {
    if (!url) return '';
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}download=1&filename=${encodeURIComponent(name)}`;
  };

  useEffect(() => {
    if (!isOpen || !messageId) {
      setData(null);
      return;
    }

    const fetchDetails = async () => {
      try {
        setLoading(true);
        const res = await apiClient.get(`/messages/${messageId}`);
        const msg = res.data?.data || res.data;
        setData(msg);
      } catch (err: any) {
        toast.error('خطا در بارگذاری جزئیات پیام');
        onClose();
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [isOpen, messageId, onClose]);


  const handleDelete = async () => {
    if (!messageId || !window.confirm('آیا از حذف این پیام از صندوق خود اطمینان دارید؟')) return;
    try {
      await apiClient.delete(`/messages/${messageId}`);
      toast.success('پیام با موفقیت حذف گردید');
      if (onDeleted) onDeleted(messageId);
      onClose();
    } catch {
      toast.error('خطا در حذف پیام');
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'URGENT':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-black bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800 flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>فوری و اضطراری</span>
          </span>
        );
      case 'IMPORTANT':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
            مهم
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300">
            عادی
          </span>
        );
    }
  };

  const getSenderRoleLabel = (role?: string) => {
    switch (role) {
      case 'SUPER_ADMIN':
      case 'SCHOOL_ADMIN':
        return 'راهبری مجتمع آموزشی';
      case 'TEACHER':
        return 'استاد / مربی';
      case 'STUDENT':
        return 'دانش‌آموز';
      case 'PARENT':
        return 'ولی دانش‌آموز';
      default:
        return 'کادر مدرسه';
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <Modal isOpen={isOpen} onClose={handleClose} title="مشاهده پیام" maxWidth="xl">
        {loading || !data ? (
          <div className="py-12 flex flex-col items-center justify-center space-y-3">
            <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-gray-400">در حال بارگذاری جزئیات پیام...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Header / Meta */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3.5 border-b border-gray-100 dark:border-gray-800 gap-3">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 text-primary flex items-center justify-center font-black text-sm border border-primary/20">
                  {data.sender?.firstName?.[0] || 'ر'}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-black text-gray-900 dark:text-white">
                      {data.sender?.firstName} {data.sender?.lastName}
                    </h3>
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-bold">
                      {getSenderRoleLabel(data.sender?.role)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{gregorianToJalaliStr(data.createdAt)}</span>
                    {data.targetClassroom && (
                      <span className="flex items-center gap-1 text-primary">
                        <Building className="w-3 h-3" />
                        {data.targetClassroom.name}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {getPriorityBadge(data.priority)}
                <button
                  type="button"
                  onClick={handleDelete}
                  className="p-2 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-400 hover:text-rose-600 hover:border-rose-200 transition-colors"
                  title="حذف پیام"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Parent Message Quote (If this message is a reply) */}
            {data.replyTo && (
              <div className="p-3 sm:p-3.5 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/80 space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-gray-500 dark:text-gray-400">
                  <Reply className="w-3.5 h-3.5 text-primary rotate-180 shrink-0" />
                  <span>
                    در پاسخ به پیام «{data.replyTo.title}» از{' '}
                    <strong className="text-ink-darker dark:text-white">
                      {data.replyTo.sender?.firstName} {data.replyTo.sender?.lastName}
                    </strong>{' '}
                    <span className="text-[11px] text-gray-400">
                      ({gregorianToJalaliStr(data.replyTo.createdAt)})
                    </span>
                  </span>
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-300 pr-5 line-clamp-2 italic border-r-2 border-primary/50 mr-1">
                  <FormattedMessageView content={data.replyTo.body} />
                </div>
              </div>
            )}

            {/* Subject Title */}
            <div>
              <span className="text-[11px] font-bold text-gray-400 block mb-1">موضوع:</span>
              <h2 className="text-base font-black text-gray-900 dark:text-white leading-snug">
                {data.title}
              </h2>
            </div>

            {/* Message Body */}
            <div className="p-4 rounded-2xl bg-gray-50/80 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800 text-xs sm:text-sm text-gray-800 dark:text-gray-200 leading-relaxed min-h-28">
              <FormattedMessageView content={data.body} />
            </div>

            {/* Attachments Section */}
            {data.attachments && data.attachments.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                <span className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                  <Paperclip className="w-3.5 h-3.5 text-primary" />
                  <span>پیوست‌های این پیام ({toPersianDigits(data.attachments.length)}):</span>
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {data.attachments.map((rawAtt: any, index: number) => {
                    const att = normalizeAttachment(rawAtt);
                    const isVideo = att.type === 'video';
                    const isImage = att.type === 'image';

                    return (
                      <div
                        key={index}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-2xs text-xs"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {isImage && att.url ? (
                            <div
                              onClick={() => setPreviewImage(att.url)}
                              className="w-10 h-10 rounded-lg overflow-hidden border border-gray-200 cursor-pointer hover:opacity-85 shrink-0"
                            >
                              <img src={att.url} alt={att.name} className="w-full h-full object-cover" />
                            </div>
                          ) : isVideo && att.url ? (
                            <div
                              onClick={() => setPreviewVideo({ url: att.url, name: att.name })}
                              className="w-10 h-10 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0 cursor-pointer hover:bg-indigo-700 transition-colors shadow-2xs group"
                              title="پخش ویدیو"
                            >
                              <Play className="w-4 h-4 fill-current ml-0.5 group-hover:scale-110 transition-transform" />
                            </div>
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                              <FileText className="w-5 h-5" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="font-bold truncate text-gray-800 dark:text-gray-200" title={att.name}>
                              {att.name}
                            </p>
                            {att.size && (
                              <p className="text-[10px] text-gray-400 font-mono">
                                {att.size > 1024 * 1024
                                  ? `${toPersianDigits((att.size / (1024 * 1024)).toFixed(1))} MB`
                                  : `${toPersianDigits((att.size / 1024).toFixed(0))} KB`}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          {isImage && att.url && (
                            <button
                              type="button"
                              onClick={() => setPreviewImage(att.url)}
                              className="p-1.5 rounded-lg text-gray-500 hover:text-primary hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
                              title="مشاهده تصویر"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          )}
                          {isVideo && att.url && (
                            <button
                              type="button"
                              onClick={() => setPreviewVideo({ url: att.url, name: att.name })}
                              className="p-1.5 rounded-lg text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 cursor-pointer flex items-center gap-1 font-bold"
                              title="پخش آنلاین ویدیو"
                            >
                              <Play className="w-3.5 h-3.5 fill-current" />
                              <span className="text-[11px] hidden sm:inline">پخش</span>
                            </button>
                          )}
                          {att.url && (
                            <a
                              href={getDownloadUrl(att.url, att.name)}
                              download={att.name}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1.5 rounded-lg text-gray-500 hover:text-primary hover:bg-gray-100 dark:hover:bg-gray-800"
                              title="دانلود فایل"
                            >
                              <Download className="w-4 h-4" />
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Replies Thread Section (Visible in continuation of message) */}
            {data.replies && data.replies.length > 0 && (
              <div className="space-y-3 pt-3.5 border-t border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-primary/15 text-primary flex items-center justify-center font-black text-xs">
                    <Reply className="w-3.5 h-3.5" />
                  </div>
                  <h4 className="text-xs sm:text-sm font-black text-ink-darker dark:text-white">
                    پاسخ‌های داده‌شده به این پیام ({toPersianDigits(data.replies.length)})
                  </h4>
                </div>

                <div className="space-y-2.5 pr-2.5 sm:pr-3.5 border-r-2 border-primary/25 mr-1.5">
                  {data.replies.map((rep: any) => (
                    <div
                      key={rep.id}
                      className="p-3 sm:p-3.5 rounded-xl bg-gray-50/90 dark:bg-gray-800/60 border border-gray-200/80 dark:border-gray-700/80 shadow-2xs space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary font-black text-xs flex items-center justify-center">
                            {rep.sender?.firstName?.[0] || 'ر'}
                          </div>
                          <div>
                            <span className="text-xs font-bold text-ink-darker dark:text-white block">
                              {rep.sender?.firstName} {rep.sender?.lastName}
                            </span>
                          </div>
                        </div>
                        <span className="text-[10px] text-gray-400 font-medium">
                          {gregorianToJalaliStr(rep.createdAt)}
                        </span>
                      </div>

                      <div className="text-xs sm:text-[13px] text-gray-700 dark:text-gray-300 leading-relaxed pr-1">
                        <FormattedMessageView content={rep.body} />
                      </div>

                      {rep.attachments && rep.attachments.length > 0 && (
                        <div className="flex items-center gap-2 flex-wrap pt-1.5 border-t border-gray-100 dark:border-gray-700/60">
                          {rep.attachments.map((att: any, idx: number) => (
                            <a
                              key={idx}
                              href={att.url}
                              download={att.name}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 text-[11px] font-bold text-primary hover:underline px-2 py-1 rounded-lg bg-primary/5 dark:bg-primary/10 border border-primary/15"
                            >
                              <Paperclip className="w-3 h-3" />
                              <span className="truncate max-w-[150px]">{att.name}</span>
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Footer Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-800">
              {data.sender && onReply ? (
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    const recipientName = data.isSender
                      ? (data.recipients?.[0]?.recipient ? `${data.recipients[0].recipient.firstName} ${data.recipients[0].recipient.lastName}` : 'مخاطب')
                      : `${data.sender.firstName} ${data.sender.lastName}`;
                    const targetId = data.isSender
                      ? (data.recipients?.[0]?.recipient?.id || data.sender.id)
                      : data.sender.id;
                    const replySubject = data.title.startsWith('پاسخ:') ? data.title : `پاسخ: ${data.title}`;
                    onReply(targetId, recipientName, replySubject, {
                      id: data.id,
                      title: data.title,
                      body: data.body,
                      senderName: `${data.sender.firstName} ${data.sender.lastName}`,
                    });
                    handleClose();
                  }}
                  className="font-bold text-xs gap-1.5"
                >
                  <Reply className="w-4 h-4" />
                  <span>پاسخ به این پیام</span>
                </Button>
              ) : (
                <div />
              )}

              <Button type="button" variant="secondary" size="sm" onClick={handleClose} className="text-xs">
                بستن
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Lightbox Preview for Images (Portaled with z-[100] so it is strictly above Modal) */}
      {previewImage &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
            onClick={() => setPreviewImage(null)}
          >
            <div className="relative max-w-4xl max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                onClick={() => setPreviewImage(null)}
                className="absolute top-2 left-2 p-2 rounded-full bg-black/60 text-white hover:bg-black/90 transition-colors z-10 cursor-pointer"
                title="بستن"
              >
                <X className="w-5 h-5" />
              </button>
              <img
                src={previewImage}
                alt="پیش‌نمایش تصویر"
                className="max-w-full max-h-[85vh] rounded-2xl object-contain shadow-2xl border border-white/20"
              />
            </div>
          </div>,
          document.body,
        )}

      {/* Video Player Modal with Native Streaming Controls (Portaled with z-[100]) */}
      {previewVideo &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-4"
            onClick={() => {
              setPreviewVideo(null);
              setVideoError(false);
            }}
          >
            <div
              className="relative max-w-3xl w-full bg-gray-950 rounded-2xl overflow-hidden shadow-2xl border border-white/20 p-3 sm:p-4 flex flex-col max-h-[92vh]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-3 px-1 text-white border-b border-gray-800">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
                    <Video className="w-4 h-4" />
                  </div>
                  <span className="text-xs sm:text-sm font-bold truncate">{previewVideo.name}</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <a
                    href={getDownloadUrl(previewVideo.url, previewVideo.name)}
                    download={previewVideo.name}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                    title="دانلود ویدیو"
                  >
                    <Download className="w-4 h-4" />
                  </a>
                  <button
                    type="button"
                    onClick={() => {
                      setPreviewVideo(null);
                      setVideoError(false);
                    }}
                    className="p-1.5 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                    title="بستن پخش‌کننده"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {videoError && (
                <div className="mt-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex flex-col sm:flex-row items-center justify-between gap-2.5">
                  <span>مرورگر امکان پخش مستقیم این فرمت ویدیویی را ندارد.</span>
                  <a
                    href={getDownloadUrl(previewVideo.url, previewVideo.name)}
                    download={previewVideo.name}
                    className="px-3 py-1.5 rounded-lg bg-amber-500 text-black font-bold text-xs shrink-0 flex items-center gap-1.5 hover:bg-amber-400 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>دانلود فایل و مشاهده در دستگاه</span>
                  </a>
                </div>
              )}

              <div className="pt-3 flex-1 flex items-center justify-center min-h-0">
                <video
                  src={previewVideo.url}
                  controls
                  playsInline
                  preload="metadata"
                  crossOrigin="anonymous"
                  onError={() => setVideoError(true)}
                  className="w-full max-h-[70vh] rounded-xl bg-black shadow-inner"
                />
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
};
