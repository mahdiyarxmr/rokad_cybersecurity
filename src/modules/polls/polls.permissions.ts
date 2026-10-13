import { Role } from '../../common/constants';

/**
 * Roles permitted to view poll results, voting statistics, and analytics.
 */
export const POLL_RESULTS_VIEW_ROLES: readonly Role[] = [
  Role.SUPER_ADMIN,
  Role.SCHOOL_ADMIN,
  Role.STAFF,
  Role.TEACHER,
  Role.COACH,
] as const;

/**
 * Roles explicitly restricted from viewing poll results (students, parents, etc.).
 */
export const POLL_RESTRICTED_ROLES: readonly Role[] = [
  Role.STUDENT,
  Role.PARENT,
] as const;

/**
 * Roles permitted to create and manage polls (open, close, archive, delete).
 */
export const POLL_MANAGEMENT_ROLES: readonly Role[] = [
  Role.SUPER_ADMIN,
  Role.SCHOOL_ADMIN,
  Role.STAFF,
  Role.TEACHER,
  Role.COACH,
] as const;

/**
 * Checks if the provided user role is authorized to view poll results & analytics.
 */
export function canViewPollResults(role?: string | null): boolean {
  if (!role) return false;
  return (POLL_RESULTS_VIEW_ROLES as readonly string[]).includes(role);
}

/**
 * Checks if the provided user role is authorized to manage polls.
 */
export function canManagePolls(role?: string | null): boolean {
  if (!role) return false;
  return (POLL_MANAGEMENT_ROLES as readonly string[]).includes(role);
}
