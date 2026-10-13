export const TENANT_HEADER_ID = 'x-tenant-id';
export const TENANT_HEADER_SLUG = 'x-tenant-slug';
export const ROLES_KEY = 'roles';
export const FEATURE_KEY = 'require_feature';
export const IS_PUBLIC_KEY = 'is_public';

export enum Role {
  SUPER_ADMIN = 'SUPER_ADMIN',
  SCHOOL_ADMIN = 'SCHOOL_ADMIN',
  TEACHER = 'TEACHER',
  STUDENT = 'STUDENT',
  PARENT = 'PARENT',
  STAFF = 'STAFF',
  COACH = 'COACH',
}

export enum TenantType {
  PLATFORM = 'PLATFORM',
  SCHOOL = 'SCHOOL',
}

export enum TenantStatus {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  PENDING_SETUP = 'PENDING_SETUP',
}

export enum BrandTheme {
  ECOSYSTEM = 'ECOSYSTEM',
  MALE = 'MALE',
  FEMALE = 'FEMALE',
  COLLEGE = 'COLLEGE',
  CLUB = 'CLUB',
}
