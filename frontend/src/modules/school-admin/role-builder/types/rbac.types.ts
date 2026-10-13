export type PermissionCategoryKey =
  | 'ERP_ACADEMIC'
  | 'LMS'
  | 'OPERATIONS'
  | 'FINANCE'
  | 'RBAC';

export interface PermissionCatalogItem {
  code: string;
  labelFa: string;
  descriptionFa: string;
  category: PermissionCategoryKey;
  categoryFa: string;
  isSensitive: boolean;
  icon: string;
}

export interface PermissionCategory {
  key: PermissionCategoryKey;
  nameFa: string;
  descriptionFa: string;
  icon: string;
}

export interface PermissionCatalogResponse {
  categories: PermissionCategory[];
  permissions: PermissionCatalogItem[];
  totalCount: number;
}

export interface SchoolRoleItem {
  id: string;
  name: string;
  description?: string;
  isSystem: boolean;
  assignedUsersCount: number;
  createdAt: string;
  updatedAt: string;
  permissions: {
    code: string;
    labelFa: string;
    category: PermissionCategoryKey;
    categoryFa: string;
    isSensitive: boolean;
    icon: string;
  }[];
}

export interface MemberRoleBadge {
  id: string;
  name: string;
  permissionsCount: number;
}

export interface MemberOverrideItem {
  id: string;
  permissionCode: string;
  effect: 'GRANT' | 'REVOKE';
  reason?: string;
  labelFa: string;
  isSensitive: boolean;
  createdAt: string;
}

export interface MemberAccessItem {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  phone?: string;
  nationalId?: string;
  baseRole: string;
  avatarUrl?: string;
  schoolRoles: MemberRoleBadge[];
  overrides: MemberOverrideItem[];
  overridesCount: number;
}

export interface EffectivePermissionItem extends PermissionCatalogItem {
  isEffective: boolean;
  source: 'BASE_ROLE' | 'SCHOOL_ROLE' | 'OVERRIDE_GRANT' | 'OVERRIDE_REVOKE' | 'NONE';
  grantingRoles: string[];
  overrideEffect: 'GRANT' | 'REVOKE' | null;
  overrideReason?: string | null;
}

export interface MemberEffectiveDetailResponse {
  userId: string;
  fullName: string;
  baseRole: string;
  schoolRoles: { id: string; name: string }[];
  totalEffectiveCount: number;
  permissions: EffectivePermissionItem[];
}

export interface CreateSchoolRolePayload {
  name: string;
  description?: string;
  permissionCodes: string[];
}

export interface UpdateSchoolRolePayload {
  name?: string;
  description?: string;
  permissionCodes?: string[];
}

export interface SetOverridePayload {
  permissionCode: string;
  effect: 'GRANT' | 'REVOKE';
  reason?: string;
}
