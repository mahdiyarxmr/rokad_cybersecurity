import { apiClient } from '../../../../lib/api/client';
import {
  PermissionCatalogResponse,
  SchoolRoleItem,
  MemberAccessItem,
  MemberEffectiveDetailResponse,
  CreateSchoolRolePayload,
  UpdateSchoolRolePayload,
  SetOverridePayload,
} from '../types/rbac.types';

export const rbacApi = {
  // 1. Permissions Catalog
  getPermissionsCatalog: async (): Promise<PermissionCatalogResponse> => {
    const res = await apiClient.get<PermissionCatalogResponse>('/rbac/permissions');
    return res.data;
  },

  // 2. School Roles
  getSchoolRoles: async (): Promise<SchoolRoleItem[]> => {
    const res = await apiClient.get<SchoolRoleItem[]>('/rbac/roles');
    return res.data;
  },

  createSchoolRole: async (payload: CreateSchoolRolePayload): Promise<SchoolRoleItem> => {
    const res = await apiClient.post<SchoolRoleItem>('/rbac/roles', payload);
    return res.data;
  },

  updateSchoolRole: async (
    roleId: string,
    payload: UpdateSchoolRolePayload,
  ): Promise<SchoolRoleItem> => {
    const res = await apiClient.patch<SchoolRoleItem>(`/rbac/roles/${roleId}`, payload);
    return res.data;
  },

  deleteSchoolRole: async (roleId: string): Promise<{ message: string }> => {
    const res = await apiClient.delete<{ message: string }>(`/rbac/roles/${roleId}`);
    return res.data;
  },

  restoreSchoolRole: async (roleId: string): Promise<SchoolRoleItem> => {
    const res = await apiClient.patch<SchoolRoleItem>(`/rbac/roles/${roleId}/restore`);
    return res.data;
  },

  // 3. Members & Access
  getMembersAccess: async (params?: {
    search?: string;
    staffOnly?: boolean;
  }): Promise<MemberAccessItem[]> => {
    const res = await apiClient.get<MemberAccessItem[]>('/rbac/members', {
      params: {
        search: params?.search,
        staffOnly: params?.staffOnly,
      },
    });
    return res.data;
  },

  getMemberDetail: async (userId: string): Promise<MemberEffectiveDetailResponse> => {
    const res = await apiClient.get<MemberEffectiveDetailResponse>(
      `/rbac/members/${userId}/detail`,
    );
    return res.data;
  },

  syncMemberRoles: async (
    userId: string,
    schoolRoleIds: string[],
  ): Promise<{ message: string; assignedRoles: string[] }> => {
    const res = await apiClient.patch<{ message: string; assignedRoles: string[] }>(
      `/rbac/members/${userId}/roles`,
      { schoolRoleIds },
    );
    return res.data;
  },

  setMemberOverride: async (
    userId: string,
    payload: SetOverridePayload,
  ): Promise<any> => {
    const res = await apiClient.patch(`/rbac/members/${userId}/overrides`, payload);
    return res.data;
  },

  removeMemberOverride: async (
    userId: string,
    permissionCode: string,
  ): Promise<{ message: string }> => {
    const res = await apiClient.delete(
      `/rbac/members/${userId}/overrides/${permissionCode}`,
    );
    return res.data;
  },

  restoreMemberOverride: async (
    userId: string,
    permissionCode: string,
  ): Promise<{ message: string }> => {
    const res = await apiClient.patch(
      `/rbac/members/${userId}/overrides/${permissionCode}/restore`,
    );
    return res.data;
  },
};
