export const MANAGER_ROLES = ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'STAFF'] as const;
export const WIZARD_MANAGER_ROLES = ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER', 'STAFF'] as const;

export function isEventManagerRole(role?: string | null): boolean {
  return MANAGER_ROLES.includes((role || '') as any);
}

export function isWizardManagerRole(role?: string | null): boolean {
  return WIZARD_MANAGER_ROLES.includes((role || '') as any);
}

export function isParentRole(role?: string | null): boolean {
  return (role || '').toUpperCase() === 'PARENT';
}

/** Check if role can submit ideas in an event */
export function canSubmitIdeas(role?: string | null): boolean {
  const r = (role || '').toUpperCase();
  if (r === 'PARENT') return false;
  return isWizardManagerRole(r) || r === 'STUDENT';
}

/** Check if role can vote on ideas in an event */
export function canVoteInEvent(role?: string | null): boolean {
  const r = (role || '').toUpperCase();
  if (r === 'PARENT') return false;
  return isWizardManagerRole(r) || r === 'STUDENT';
}

/** Check if role can create or join teams in an event */
export function canManageTeams(role?: string | null): boolean {
  const r = (role || '').toUpperCase();
  if (r === 'PARENT') return false;
  return isWizardManagerRole(r) || r === 'STUDENT';
}

/** Check if role can create, move, or edit tasks in taskboard */
export function canManageTasks(role?: string | null): boolean {
  const r = (role || '').toUpperCase();
  if (r === 'PARENT') return false;
  return isWizardManagerRole(r) || r === 'STUDENT';
}

/** Check if role can upload presentations or deliverables */
export function canUploadPresentation(role?: string | null): boolean {
  const r = (role || '').toUpperCase();
  if (r === 'PARENT') return false;
  return isWizardManagerRole(r) || r === 'STUDENT';
}

/** Audience gate for calendar events (ALL / STUDENTS / TEACHERS / PARENTS / STAFF / SPECIFIC_CLASSES). */
export function canViewEventAudience(
  audience: string | null | undefined,
  role: string | null | undefined,
): boolean {
  const aud = (audience || 'ALL').toUpperCase();
  if (aud === 'ALL') return true;
  const r = (role || '').toUpperCase();
  if (isEventManagerRole(r)) return true;
  switch (r) {
    case 'TEACHER':
      return aud === 'TEACHERS' || aud === 'STUDENTS' || aud === 'SPECIFIC_CLASSES';
    case 'STUDENT':
      return aud === 'STUDENTS' || aud === 'SPECIFIC_CLASSES';
    case 'PARENT':
      return aud === 'PARENTS' || aud === 'SPECIFIC_CLASSES';
    default:
      return false;
  }
}

/**
 * Ownership match for ideas/teams without server userId.
 * Prefers exact full-name; last-name token; never matches a short first name as a substring.
 */
export function isOwnedByUser(
  authorName: string | null | undefined,
  user: { firstName?: string | null; lastName?: string | null } | null | undefined,
): boolean {
  if (!user || !authorName) return false;
  const author = authorName.trim().toLowerCase().replace(/\s+/g, ' ');
  if (!author) return false;
  const first = (user.firstName || '').trim().toLowerCase();
  const last = (user.lastName || '').trim().toLowerCase();
  const full = `${user.firstName || ''} ${user.lastName || ''}`.trim().toLowerCase().replace(/\s+/g, ' ');
  if (full && full.length > 2 && (author === full || author.includes(full))) return true;
  const tokens = author.split(' ');
  if (last && tokens.includes(last)) return true;
  if (first && first.length >= 3 && tokens.some((t) => t === first || t.startsWith(first))) return true;
  return false;
}

/** apiClient rejects with envelope `{ success:false, statusCode, message }` — not AxiosError.response. */
export function isServerRejection(err: unknown): boolean {
  const e = err as any;
  const status = e?.statusCode || e?.status || e?.response?.status;
  // Only 4xx validation errors (e.g. Bad Request, Unprocessable) should strictly block.
  // 5xx (DB offline, internal server errors, connection refused) gracefully fall back to local storage.
  return typeof status === 'number' && status >= 400 && status < 500 && status !== 404;
}

export function extractApiErrorMessage(err: unknown, fallback: string): string {
  const e = err as any;
  return e?.message || e?.response?.data?.message || fallback;
}

export function parseJsonArray<T>(raw: string | null, fallback: T[]): T[] {
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : fallback;
  } catch {
    return fallback;
  }
}
