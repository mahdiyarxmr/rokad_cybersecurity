import React, { useEffect, useState, useRef } from 'react';
import { apiClient } from '../../../lib/api/client';
import { connectSocket, getSocket } from '../../../lib/socket/socket';
import { useAuthStore } from '../../../lib/auth/auth-store';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import {
  MessageSquare,
  Send,
  Users,
  Paperclip,
  Smile,
  CheckCheck,
  Circle,
  Hash,
  User,
  ArrowRight,
} from 'lucide-react';

interface ChatMessage {
  id: string;
  content: string;
  senderId: string;
  sender?: { firstName: string; lastName: string };
  createdAt: string;
  channelId?: string;
  classroomId?: string;
}

interface ChatChannel {
  id: string;
  name: string;
  type: 'CLASS' | 'GENERAL' | 'DIRECT';
  unreadCount?: number;
  lastMessage?: string;
}

export const LiveChatPage: React.FC = () => {
  const currentUser = useAuthStore((s) => s.user);
  const [channels, setChannels] = useState<ChatChannel[]>([]);
  const [activeChannel, setActiveChannel] = useState<ChatChannel | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize Channels and Socket
  useEffect(() => {
    const initChat = async () => {
      try {
        const [channelsRes, classroomsRes] = await Promise.all([
          apiClient.get('/chat/channels').catch(() => ({ data: [] })),
          apiClient.get('/classes/classrooms').catch(() => ({ data: [] })),
        ]);

        const classChannels: ChatChannel[] = (classroomsRes.data || []).map((c: any) => ({
          id: c.id,
          name: `کلاس ${c.name} (${c.code})`,
          type: 'CLASS',
          lastMessage: 'گفتگوی کلاسی آغاز شده است',
        }));

        const generalChannels: ChatChannel[] = (channelsRes.data || []).map((ch: any) => ({
          id: ch.id,
          name: ch.name,
          type: ch.type || 'GENERAL',
          lastMessage: ch.description,
        }));

        const allChannels = [...classChannels, ...generalChannels];
        setChannels(allChannels);

        // Auto-select first channel on desktop only
        if (allChannels.length > 0 && window.innerWidth >= 768) {
          setActiveChannel(allChannels[0]);
        }
      } catch (err) {
        console.error('Chat init error', err);
      }
    };

    initChat();

    // Socket Connection
    const socket = connectSocket();

    socket.on('connect', () => {
      setIsConnected(true);
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('new_message', (msg: ChatMessage) => {
      setMessages((prev) => [...prev, msg]);
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('new_message');
    };
  }, []);

  // Fetch Message History on Channel Switch
  useEffect(() => {
    if (!activeChannel) return;

    const fetchHistory = async () => {
      try {
        const endpoint =
          activeChannel.type === 'CLASS'
            ? `/chat/history?classroomId=${activeChannel.id}`
            : `/chat/history?channelId=${activeChannel.id}`;

        const res = await apiClient.get(endpoint).catch(() => ({ data: [] }));
        setMessages(res.data || []);
      } catch (err) {
        setMessages([]);
      }
    };

    fetchHistory();

    // Join Socket Room
    const socket = getSocket();
    if (activeChannel.type === 'CLASS') {
      socket.emit('join_classroom', { classroomId: activeChannel.id });
    } else {
      socket.emit('join_channel', { channelId: activeChannel.id });
    }
  }, [activeChannel]);

  // Auto-scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !activeChannel) return;

    const socket = getSocket();
    const payload = {
      content: inputText,
      channelId: activeChannel.type !== 'CLASS' ? activeChannel.id : undefined,
      classroomId: activeChannel.type === 'CLASS' ? activeChannel.id : undefined,
    };

    socket.emit('send_message', payload);

    // Optimistic UI push
    const optimisticMsg: ChatMessage = {
      id: `temp-${Date.now()}`,
      content: inputText,
      senderId: currentUser?.id || 'me',
      sender: {
        firstName: currentUser?.firstName || 'من',
        lastName: currentUser?.lastName || '',
      },
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, optimisticMsg]);
    setInputText('');
  };

  return (
    <div className="h-[calc(100dvh-155px)] md:h-[calc(100vh-140px)] flex rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-xs">
      {/* Channels Sidebar (Master Pane: Hidden on mobile if activeChannel is selected) */}
      <div
        className={`w-full md:w-80 border-l border-gray-200 flex flex-col bg-gray-50/70 shrink-0 ${
          activeChannel ? 'hidden md:flex' : 'flex'
        }`}
      >
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center space-x-2 space-x-reverse">
            <MessageSquare className="h-5 w-5 text-primary" />
            <h3 className="font-bold text-sm text-ink-darker">کانال‌ها و گروه‌ها</h3>
          </div>
          <div className="flex items-center space-x-1.5 space-x-reverse text-[11px]">
            <Circle
              className={`h-2.5 w-2.5 fill-current ${
                isConnected ? 'text-emerald-500' : 'text-rose-500'
              }`}
            />
            <span className="text-gray-500">{isConnected ? 'برخط' : 'آفلاین'}</span>
          </div>
        </div>

        {/* Channel list */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {channels.map((ch) => {
            const isActive = activeChannel?.id === ch.id;

            return (
              <div
                key={ch.id}
                onClick={() => setActiveChannel(ch)}
                className={`p-3 rounded-xl cursor-pointer transition-all flex items-center justify-between text-xs ${
                  isActive
                    ? 'bg-primary text-white font-bold shadow-xs'
                    : 'hover:bg-gray-200/60 text-ink-normal'
                }`}
              >
                <div className="flex items-center space-x-2.5 space-x-reverse overflow-hidden">
                  <div
                    className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${
                      isActive ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {ch.type === 'CLASS' ? <Users className="h-4 w-4" /> : <Hash className="h-4 w-4" />}
                  </div>
                  <div className="truncate text-right">
                    <div className="truncate">{ch.name}</div>
                    <div
                      className={`text-[10px] truncate mt-0.5 ${
                        isActive ? 'text-white/80' : 'text-gray-400'
                      }`}
                    >
                      {ch.lastMessage}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Chat Box (Detail Pane: Hidden on mobile if NO activeChannel is selected) */}
      <div
        className={`flex-1 flex flex-col justify-between bg-white min-w-0 ${
          !activeChannel ? 'hidden md:flex' : 'flex'
        }`}
      >
        {activeChannel ? (
          <>
            {/* Chat Header */}
            <div className="p-3.5 sm:p-4 border-b border-gray-200 flex items-center justify-between bg-white shrink-0">
              <div className="flex items-center space-x-2 sm:space-x-3 space-x-reverse min-w-0">
                {/* Mobile Back Button */}
                <button
                  type="button"
                  onClick={() => setActiveChannel(null)}
                  className="p-1.5 -mr-1 rounded-lg text-gray-500 hover:text-primary hover:bg-gray-100 md:hidden flex items-center gap-1 text-xs shrink-0 transition-colors"
                  aria-label="بازگشت به کانال‌ها"
                >
                  <ArrowRight className="h-4 w-4" />
                </button>

                <div className="h-9 w-9 rounded-xl bg-primary-light text-primary flex items-center justify-center font-bold shrink-0">
                  {activeChannel.type === 'CLASS' ? <Users className="h-5 w-5" /> : <Hash className="h-5 w-5" />}
                </div>
                <div className="min-w-0">
                  <h4 className="font-bold text-xs sm:text-sm text-ink-darker truncate">{activeChannel.name}</h4>
                  <span className="text-[10px] sm:text-[11px] text-gray-500 truncate block">گفتگوی گروهی زنده</span>
                </div>
              </div>
              <Badge variant="default" className="text-[10px] py-0 px-2 shrink-0">رمزنگاری‌شده</Badge>
            </div>

            {/* Messages Stream */}
            <div className="flex-1 overflow-y-auto p-3.5 sm:p-4 space-y-3 bg-[#FAF8F5]/40">
              {messages.map((msg) => {
                const isMe = msg.senderId === currentUser?.id || msg.senderId === 'me';
                const isSystem = msg.senderId === 'system';

                if (isSystem) {
                  return (
                    <div key={msg.id} className="text-center my-4">
                      <span className="text-[11px] bg-gray-200/80 text-gray-600 px-3 py-1 rounded-full">
                        {msg.content}
                      </span>
                    </div>
                  );
                }

                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                  >
                    <div className="flex items-center space-x-1.5 space-x-reverse text-[10px] text-gray-400 mb-1 px-1">
                      <span>{msg.sender ? `${msg.sender.firstName} ${msg.sender.lastName}` : 'کاربر'}</span>
                      <span>•</span>
                      <span>{new Date(msg.createdAt).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>

                    <div
                      className={`max-w-[85%] sm:max-w-[75%] p-3 sm:p-3.5 rounded-2xl text-xs leading-relaxed ${
                        isMe
                          ? 'bg-primary text-white rounded-bl-none shadow-xs'
                          : 'bg-white border border-gray-200 text-ink-darker rounded-br-none shadow-2xs'
                      }`}
                    >
                      {msg.content}
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Bar */}
            <form onSubmit={handleSendMessage} className="p-2.5 sm:p-3 border-t border-gray-200 bg-white flex items-center gap-2 shrink-0">
              <input
                type="text"
                placeholder="پیام خود را تایپ کنید..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                className="flex-1 h-10 sm:h-11 px-3 sm:px-4 text-xs rounded-xl border border-gray-300 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary"
              />

              <Button type="submit" variant="primary" className="h-10 sm:h-11 px-3.5 sm:px-4">
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-gray-400">
            <MessageSquare className="h-12 w-12 text-gray-300 mb-3" />
            <p className="font-bold text-sm text-gray-600">گفتگویی انتخاب نشده است</p>
            <p className="text-xs text-gray-400 mt-1">یک کانال یا کلاس را از ستون کناری برای شروع چت انتخاب نمایید.</p>
          </div>
        )}
      </div>
    </div>
  );
};
