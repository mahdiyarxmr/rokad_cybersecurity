import { apiClient } from './client';

export interface VaultStatusResponse {
  isInitialized: boolean;
  keyUpdatedAt: string | null;
  totalUsers: number;
  encryptedUsers: number;
  coveragePercentage: number;
}

export interface RevealPasswordResponse {
  plaintextPassword: string;
  username?: string;
  fullName: string;
  role: string;
  schoolName: string;
}

export interface BackfillResponse {
  total: number;
  recovered: number;
  alreadyEncrypted: number;
  unrecovered: number;
}

export const vaultApi = {
  getStatus: async (): Promise<VaultStatusResponse> => {
    const res = await apiClient.get<VaultStatusResponse>('/auth/vault/status');
    return res.data;
  },

  revealPassword: async (data: {
    targetUserId: string;
    masterKey: string;
    reason?: string;
  }): Promise<RevealPasswordResponse> => {
    const res = await apiClient.post<RevealPasswordResponse>('/auth/vault/reveal-password', data);
    return res.data;
  },

  setupKey: async (data: {
    newMasterKey: string;
    currentMasterKey?: string;
  }): Promise<{ success: boolean; message: string }> => {
    const res = await apiClient.post<{ success: boolean; message: string }>('/auth/vault/setup-key', data);
    return res.data;
  },

  backfill: async (tenantId?: string): Promise<BackfillResponse> => {
    const res = await apiClient.post<BackfillResponse>('/auth/vault/backfill', { tenantId });
    return res.data;
  },
};
