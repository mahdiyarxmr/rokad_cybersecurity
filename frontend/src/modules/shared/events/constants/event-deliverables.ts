import { IdeaTeam } from '../components/EventTeamFormationStep';
import { EventIdea } from '../components/EventIdeaSubmissionStep';
import { TaskBoardTeamInfo, loadTeamsMap, buildTaskBoardTeams } from './event-taskboard';

export interface TeamDeliverableSubmission {
  ideaId: string;
  teamName: string;
  leaderName: string;
  submittedBy: string;
  submittedAt: string; // ISO string
  fileName: string;
  fileSize: number; // in bytes
  fileType: string; // e.g. 'application/pdf', 'application/zip', etc.
  fileDataUrl?: string; // base64 / data URL for real download
  presentationUrl?: string; // e.g. Canva, Figma, Google Slides, pitch video
  description?: string; // notes from captain
  status: 'SUBMITTED' | 'APPROVED' | 'NEEDS_REVISION';
  adminFeedback?: string;
  version: number;
}

export interface EventDeliverablesConfig {
  deadline: string | null; // ISO date-time string
  isManuallyLocked: boolean; // Manager manually forced locked
  isManuallyOpened: boolean; // Manager manually forced open despite expired deadline
  allowedFormats: string[]; // e.g. ['.pdf', '.zip', '.rar', '.pptx', '.ppt', '.mp4']
  maxFileSizeMb: number; // e.g. 50
  instructions: string;
  submissions: Record<string, TeamDeliverableSubmission>; // keyed by ideaId
}

export function deliverablesStorageKey(eventId: string): string {
  return `rokad_event_deliverables_${eventId}`;
}

export function defaultDeliverablesConfig(): EventDeliverablesConfig {
  // Default deadline: 3 days from now at 12:00 PM
  const d = new Date();
  d.setDate(d.getDate() + 3);
  d.setHours(12, 0, 0, 0);

  return {
    deadline: d.toISOString(),
    isManuallyLocked: false,
    isManuallyOpened: false,
    allowedFormats: ['.pdf', '.zip', '.rar', '.pptx', '.ppt', '.mp4'],
    maxFileSizeMb: 50,
    instructions:
      'سرتیم محترم، لطفاً فایل اسلاید ارائه نهایی (PDF یا PPTX) یا فایل فشرده پروژه (ZIP/RAR) را به همراه توضیحات بارگذاری نمایید.',
    submissions: {},
  };
}

export function loadDeliverablesConfig(eventId: string): EventDeliverablesConfig {
  try {
    const raw = localStorage.getItem(deliverablesStorageKey(eventId));
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return {
          ...defaultDeliverablesConfig(),
          ...parsed,
          submissions: parsed.submissions || {},
        };
      }
    }
  } catch (e) {
    console.error('Failed to load deliverables config', e);
  }
  return defaultDeliverablesConfig();
}

export function saveDeliverablesConfig(
  eventId: string,
  config: EventDeliverablesConfig,
): void {
  try {
    localStorage.setItem(deliverablesStorageKey(eventId), JSON.stringify(config));
  } catch (e) {
    console.error('Failed to save deliverables config', e);
  }
}

export function isSubmissionLocked(config: EventDeliverablesConfig): boolean {
  if (config.isManuallyLocked) return true;
  if (config.isManuallyOpened) return false;
  if (!config.deadline) return false;

  const deadlineTime = new Date(config.deadline).getTime();
  return Date.now() > deadlineTime;
}

export interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isExpired: boolean;
  totalSeconds: number;
}

export function getTimeRemaining(deadlineStr: string | null): TimeRemaining {
  if (!deadlineStr) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: false, totalSeconds: 0 };
  }

  const total = new Date(deadlineStr).getTime() - Date.now();
  if (total <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true, totalSeconds: 0 };
  }

  const seconds = Math.floor((total / 1000) % 60);
  const minutes = Math.floor((total / 1000 / 60) % 60);
  const hours = Math.floor((total / (1000 * 60 * 60)) % 24);
  const days = Math.floor(total / (1000 * 60 * 60 * 24));

  return {
    days,
    hours,
    minutes,
    seconds,
    isExpired: false,
    totalSeconds: Math.floor(total / 1000),
  };
}

export function formatFileSize(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function downloadSubmissionFile(sub: TeamDeliverableSubmission): void {
  if (sub.fileDataUrl) {
    const link = document.createElement('a');
    link.href = sub.fileDataUrl;
    link.download = sub.fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } else {
    // Generate a placeholder downloadable text/blob file for demo
    const blob = new Blob(
      [
        `رویداد رُکاد - فایل ارائه پروژه\nتیم: ${sub.teamName}\nسرتیم: ${sub.leaderName}\nنام فایل: ${sub.fileName}\nزمان ارسال: ${new Date(sub.submittedAt).toLocaleString('fa-IR')}\nلینک ارائه: ${sub.presentationUrl || 'ندارد'}\nتوضیحات: ${sub.description || 'ندارد'}`,
      ],
      { type: 'text/plain;charset=utf-8' },
    );
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = sub.fileName.endsWith('.txt') ? sub.fileName : `${sub.fileName}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}
