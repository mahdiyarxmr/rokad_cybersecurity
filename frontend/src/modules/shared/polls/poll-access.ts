import { UserRole } from '../../../types/auth';

/**
 * Roles permitted to view poll results, statistics, and analytics.
 */
export const POLL_RESULTS_VIEW_ROLES: readonly UserRole[] = [
  'SUPER_ADMIN',
  'SCHOOL_ADMIN',
  'STAFF',
  'TEACHER',
  'COACH',
] as const;

/**
 * Roles restricted from viewing poll results (students, parents, etc.).
 */
export const POLL_RESTRICTED_ROLES: readonly UserRole[] = [
  'STUDENT',
  'PARENT',
] as const;

/**
 * Roles permitted to create and manage polls.
 */
export const POLL_MANAGEMENT_ROLES: readonly UserRole[] = [
  'SUPER_ADMIN',
  'SCHOOL_ADMIN',
  'STAFF',
  'TEACHER',
  'COACH',
] as const;

/**
 * Checks if the given role has permission to view poll results & analytics.
 */
export function canViewPollResults(role?: string | null): boolean {
  if (!role) return false;
  return (POLL_RESULTS_VIEW_ROLES as readonly string[]).includes(role);
}

/**
 * Checks if the given role has permission to manage polls (close, reopen, archive, delete).
 */
export function canManagePolls(role?: string | null): boolean {
  if (!role) return false;
  return (POLL_MANAGEMENT_ROLES as readonly string[]).includes(role);
}

/**
 * Checks if the given role has permission to create new polls.
 */
export function canCreatePolls(role?: string | null): boolean {
  if (!role) return false;
  return (POLL_MANAGEMENT_ROLES as readonly string[]).includes(role);
}
