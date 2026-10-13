import { create } from 'zustand';
import { apiClient } from '../api/client';

interface NotificationItem {
  id: string;
  read: boolean;
}

interface NotificationState {
  unreadCount: number;
  readIds: Set<string>;
  setUnreadCount: (count: number) => void;
  decrementUnreadCount: (amount?: number) => void;
  markAllRead: () => void;
  markAsRead: (id: string) => void;
  fetchUnreadCount: () => Promise<void>;
  isRead: (id: string, serverRead?: boolean) => boolean;
}

const LOCAL_READ_IDS_KEY = 'rokad_read_notifications_v1';

const getStoredReadIds = (): Set<string> => {
  try {
    const raw = localStorage.getItem(LOCAL_READ_IDS_KEY);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) return new Set(arr);
    }
  } catch {
    // fallback
  }
  return new Set();
};

const persistReadIds = (ids: Set<string>) => {
  try {
    localStorage.setItem(LOCAL_READ_IDS_KEY, JSON.stringify(Array.from(ids)));
  } catch {
    // fallback
  }
};

export const useNotificationStore = create<NotificationState>((set, get) => ({
  unreadCount: 0,
  readIds: getStoredReadIds(),

  setUnreadCount: (count: number) => set({ unreadCount: Math.max(0, count) }),

  decrementUnreadCount: (amount = 1) =>
    set((state) => ({ unreadCount: Math.max(0, state.unreadCount - amount) })),

  markAsRead: (id: string) => {
    const { readIds, unreadCount } = get();
    if (!readIds.has(id)) {
      const updated = new Set(readIds);
      updated.add(id);
      persistReadIds(updated);
      set({
        readIds: updated,
        unreadCount: Math.max(0, unreadCount - 1),
      });
    }
  },

  markAllRead: () => {
    set({ unreadCount: 0 });
  },

  isRead: (id: string, serverRead?: boolean) => {
    if (serverRead) return true;
    return get().readIds.has(id);
  },

  fetchUnreadCount: async () => {
    try {
      const res = await apiClient.get<NotificationItem[]>('/notifications');
      const list = res.data || [];
      if (Array.isArray(list)) {
        const { readIds } = get();
        const count = list.filter((n) => !n.read && !readIds.has(n.id)).length;
        set({ unreadCount: count });
      }
    } catch {
      // quiet fallback
    }
  },
}));
