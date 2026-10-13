import { API_BASE_URL, apiClient } from './client';

function toAbsoluteApiUrl(path: string): string {
  if (API_BASE_URL.startsWith('http://') || API_BASE_URL.startsWith('https://')) {
    const origin = new URL(API_BASE_URL).origin;
    return `${origin}${path.startsWith('/') ? path : `/${path}`}`;
  }
  return path;
}

/** Open a file/export URL with a 60-second ticket instead of the access token. */
export async function openAuthorizedDownload(path: string): Promise<void> {
  const response: any = await apiClient.post('/auth/download-ticket');
  const ticket = response?.data?.ticket || response?.ticket;
  if (!ticket) {
    throw new Error('بلیت دانلود صادر نشد');
  }
  const joiner = path.includes('?') ? '&' : '?';
  const url = `${toAbsoluteApiUrl(path)}${joiner}ticket=${encodeURIComponent(ticket)}`;
  window.open(url, '_blank', 'noopener,noreferrer');
}
