import { API_BASE_URL } from './client';

/**
 * Utility to resolve full absolute media & file URLs for browser rendering,
 * streaming, and downloading across different environments (local, production, Liara).
 */
export function getFullMediaUrl(rawUrl?: string | null): string {
  if (!rawUrl) return '';

  const trimmed = rawUrl.trim();

  // If already absolute or data/blob URI, return as-is
  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('blob:')
  ) {
    return trimmed;
  }

  // Prepend API origin from API_BASE_URL
  if (API_BASE_URL.startsWith('http://') || API_BASE_URL.startsWith('https://')) {
    try {
      const parsed = new URL(API_BASE_URL);
      const origin = parsed.origin;

      if (trimmed.startsWith('/api/v1')) {
        return `${origin}${trimmed}`;
      }
      return `${origin}/api/v1${trimmed.startsWith('/') ? trimmed : `/${trimmed}`}`;
    } catch {
      return trimmed;
    }
  }

  return trimmed;
}

export interface NormalizedAttachment {
  name: string;
  url: string;
  type: 'image' | 'video' | 'file';
  size?: number;
}

export function normalizeAttachment(raw: any): NormalizedAttachment {
  if (typeof raw === 'string') {
    const cleanUrl = raw.trim();
    const fileName = decodeURIComponent(cleanUrl.split('/').pop()?.split('?')[0] || 'فایل پیوست');
    const isVideo = /\.(mp4|mov|webm|mkv|avi|m4v)$/i.test(fileName);
    const isImage = /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(fileName);

    return {
      name: fileName,
      url: getFullMediaUrl(cleanUrl),
      type: isVideo ? 'video' : isImage ? 'image' : 'file',
    };
  }

  if (raw && typeof raw === 'object') {
    const rawUrl = raw.url || raw.fileUrl || raw.path || raw.attachmentUrl || raw.src || '';
    const cleanUrl = typeof rawUrl === 'string' ? rawUrl.trim() : '';

    let rawName =
      raw.name ||
      raw.originalName ||
      raw.filename ||
      raw.fileName ||
      raw.title ||
      '';

    if (!rawName && cleanUrl) {
      rawName = decodeURIComponent(cleanUrl.split('/').pop()?.split('?')[0] || '');
    }

    if (!rawName) {
      rawName = 'فایل پیوست';
    }

    const isVideo =
      raw.type === 'video' ||
      (typeof raw.mimetype === 'string' && raw.mimetype.startsWith('video/')) ||
      /\.(mp4|mov|webm|mkv|avi|m4v)$/i.test(rawName) ||
      /\.(mp4|mov|webm|mkv|avi|m4v)$/i.test(cleanUrl);

    const isImage =
      raw.type === 'image' ||
      (typeof raw.mimetype === 'string' && raw.mimetype.startsWith('image/')) ||
      /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(rawName) ||
      /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(cleanUrl);

    const size =
      typeof raw.size === 'number'
        ? raw.size
        : typeof raw.fileSize === 'number'
          ? raw.fileSize
          : undefined;

    return {
      name: rawName,
      url: getFullMediaUrl(cleanUrl),
      type: isVideo ? 'video' : isImage ? 'image' : 'file',
      size,
    };
  }

  return {
    name: 'فایل پیوست',
    url: '',
    type: 'file',
  };
}
