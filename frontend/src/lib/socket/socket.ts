import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../auth/auth-store';
import { API_BASE_URL } from '../api/client';

let socket: Socket | null = null;

const getSocketNamespace = (): string => {
  if (API_BASE_URL.startsWith('http://') || API_BASE_URL.startsWith('https://')) {
    try {
      const origin = new URL(API_BASE_URL).origin;
      return `${origin}/chat`;
    } catch {
      // fallback
    }
  }
  return '/chat';
};

export const getSocket = (): Socket => {
  if (!socket) {
    const token = useAuthStore.getState().accessToken;

    socket = io(getSocketNamespace(), {
      autoConnect: false,
      transports: ['websocket', 'polling'],
      auth: {
        token: `Bearer ${token}`,
      },
    });
  }
  return socket;
};

export const connectSocket = (): Socket => {
  const s = getSocket();
  const token = useAuthStore.getState().accessToken;

  if (s.disconnected) {
    s.auth = { token: `Bearer ${token}` };
    s.connect();
  }
  return s;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
