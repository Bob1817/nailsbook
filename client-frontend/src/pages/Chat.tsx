import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import dayjs from 'dayjs';
import { useAuth } from '../contexts/AuthContext';
import { messageService, type Conversation, type Message } from '../services/message';
import { usePresence } from '../hooks/usePresence';
import { useSocket } from '../hooks/useSocket';
import { ChatListSkeleton } from '../components/Skeleton';
import OrderDetail from './OrderDetail';

type UnifiedItem = {
  id: string;
  type: 'chat' | 'booking' | 'service' | 'system';
  name: string;
  preview: string;
  time: string;
  unread: boolean;
  conversationId: number;
  techId: number;
  techName: string;
  techAvatar?: string | null;
  relatedType?: string | null;
  relatedId?: number | null;
  badge?: string;
};

type MessageTab = 'all' | 'unread' | 'chat' | 'booking' | 'service' | 'system';

const Chat: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { technicians, technician: defaultTechnician } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [notifications, setNotifications] = useState<UnifiedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<MessageTab>('all');
  const [selectedNotification, setSelectedNotification] = useState<UnifiedItem | null>(null);
  const [detailOrderId, setDetailOrderId] = useState<number | null>(null);
  const { isOnline } = usePresence();
  const { socket } = useSocket();

  const techIdFromUrl = searchParams.get('tech_id');

  const loadInbox = useCallback(async () => {
    setLoading(true);
    try {
      const data = await messageService.getConversations();
      setConversations(data);

      const messageBatches = await Promise.all(
        data.map(async (conv) => {
          try {
            const detail = await messageService.getMessages(conv.id);
            return { conv, messages: detail.messages };
          } catch {
            return { conv, messages: [] as Message[] };
          }
        }),
      );

      const sysNotifs = messageBatches.flatMap(({ conv, messages }) =>
        messages
          .filter(
            (m) =>
              (m.messageType === 'system' || m.messageType === 'booking' || m.messageType === 'quote' || m.messageType === 'order') &&
              (m.relatedType === 'order' || m.relatedType === 'booking' || m.relatedType === 'comment' || m.relatedType === 'work_comment'),
          )
          .map((m): UnifiedItem => {
            const nType = categorizeNotification(m);
            return {
              id: `notif-${conv.id}-${m.id}`,
              type: nType,
              name: getNotificationName(nType),
              preview: m.content || '系统通知',
              time: m.createdAt,
              unread: !m.isRead,
              conversationId: conv.id,
              techId: conv.technician.id,
              techName: conv.technician.name,
              techAvatar: conv.technician.avatarUrl,
              relatedType: m.relatedType,
              relatedId: m.relatedId,
              badge: getNotificationName(nType),
            };
          }),
      );

      setNotifications(sysNotifs);
    } catch {
      console.error('Failed to load inbox');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInbox();
  }, [loadInbox]);

  useEffect(() => {
    if (!techIdFromUrl || conversations.length === 0) return;

    const techId = parseInt(techIdFromUrl, 10);
    const matched = conversations.find((c) => c.technician.id === techId);
    if (matched) {
      navigate(`/chat/${matched.id}`, { replace: true });
      return;
    }

    const tech = technicians.find((t) => t.id === techId) || defaultTechnician;
    if (tech) {
      navigate(`/chat/direct?tech_id=${tech.id}`, { replace: true });
    }
  }, [techIdFromUrl, conversations, technicians, defaultTechnician, navigate]);

  useEffect(() => {
    if (!socket) return;

    const onNewMessage = (data: { message: { content: string; createdAt: string; messageType?: string }; conversation: { id: number } }) => {
      setConversations((prev) => {
        const idx = prev.findIndex((c) => c.id === data.conversation.id);
        if (idx === -1) {
          loadInbox();
          return prev;
        }
        const updated = { ...prev[idx], lastMessage: data.message.content, lastMessageAt: data.message.createdAt, unreadCount: (prev[idx].unreadCount || 0) + 1 };
        return [updated, ...prev.slice(0, idx), ...prev.slice(idx + 1)];
      });

      if (document.visibilityState !== 'visible' && Notification.permission === 'granted') {
        new Notification('新消息', { body: data.message.messageType === 'image' ? '[图片]' : data.message.content });
      }
    };

    socket.on('message:new', onNewMessage);
    return () => { socket.off('message:new', onNewMessage); };
  }, [socket, loadInbox]);

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const chatItems = useMemo<UnifiedItem[]>(
    () =>
      conversations.map((c) => ({
        id: `chat-${c.id}`,
        type: 'chat' as const,
        name: c.technician.name,
        preview: c.lastMessage || '点击进入会话，开始一对一沟通',
        time: c.lastMessageAt || new Date().toISOString(),
        unread: (c.unreadCount || 0) > 0,
        conversationId: c.id,
        techId: c.technician.id,
        techName: c.technician.name,
        techAvatar: c.technician.avatarUrl,
        badge: '聊天',
      })),
    [conversations],
  );

  const allItems = useMemo(
    () => [...chatItems, ...notifications].sort((a, b) => dayjs(b.time).valueOf() - dayjs(a.time).valueOf()),
    [chatItems, notifications],
  );

  const unreadCount = allItems.filter((i) => i.unread).length;

  const filtered = allItems.filter((item) => {
    if (activeTab === 'unread' && !item.unread) return false;
    if (activeTab !== 'all' && activeTab !== 'unread' && item.type !== activeTab) return false;
    return true;
  });

  const tabs: { label: string; value: MessageTab; count: number; show: boolean }[] = [
    { label: '未读', value: 'unread', count: unreadCount, show: unreadCount > 0 },
    { label: '全部', value: 'all', count: allItems.length, show: true },
    { label: '聊天', value: 'chat', count: chatItems.length, show: true },
    { label: '预约提醒', value: 'booking', count: allItems.filter((i) => i.type === 'booking').length, show: allItems.some((i) => i.type === 'booking') },
    { label: '服务提醒', value: 'service', count: allItems.filter((i) => i.type === 'service').length, show: allItems.some((i) => i.type === 'service') },
    { label: '系统通知', value: 'system', count: allItems.filter((i) => i.type === 'system').length, show: allItems.some((i) => i.type === 'system') },
  ];

  const handleItemClick = (item: UnifiedItem) => {
    if (item.type === 'chat') {
      navigate(`/chat/${item.conversationId}`);
    } else {
      setSelectedNotification(item);
    }
  };

  const handleCloseNotification = () => {
    if (selectedNotification) {
      void messageService.markAsRead(selectedNotification.conversationId);
      setConversations((prev) =>
        prev.map((c) => (c.id === selectedNotification.conversationId ? { ...c, unreadCount: 0 } : c)),
      );
      setNotifications((prev) =>
        prev.map((n) => (n.conversationId === selectedNotification.conversationId ? { ...n, unread: false } : n)),
      );
    }
    setSelectedNotification(null);
  };

  if (loading) {
    return (
      <div className="min-h-full bg-[linear-gradient(180deg,#FFFDFD_0%,#F7F3F6_48%,#F2F6FB_100%)]">
        <div className="border-b border-white/60 bg-white/76 px-5 app-header-safe pb-5 backdrop-blur-xl">
          <span className="text-[11px] uppercase tracking-[0.34em] text-slate-400">MESSAGES</span>
          <h1 className="mt-0.5 text-[1.75rem] font-bold tracking-[-0.03em] text-slate-900">消息</h1>
        </div>
        <div className="px-5 pb-24 pt-6">
          <div className="rounded-[32px] bg-white/86 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)] ring-1 ring-black/5 backdrop-blur">
            <ChatListSkeleton />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-[linear-gradient(180deg,#FFFDFD_0%,#F7F3F6_48%,#F2F6FB_100%)]">
      <div className="border-b border-white/60 bg-white/76 px-5 app-header-safe pb-5 backdrop-blur-xl">
        <div className="flex items-center justify-between gap-4">
          <div>
            <span className="text-[11px] uppercase tracking-[0.34em] text-slate-400">MESSAGES</span>
            <h1 className="mt-0.5 text-[1.75rem] font-bold tracking-[-0.03em] text-slate-900">消息</h1>
          </div>
          <div className="rounded-full bg-white/88 px-4 py-2 text-sm font-medium text-slate-600 shadow-[0_10px_24px_rgba(15,23,42,0.08)] ring-1 ring-black/5">
            {unreadCount > 0 ? `${unreadCount} 条未读` : `${conversations.length} 个会话`}
          </div>
        </div>
      </div>

      <div className="px-5 pb-24 pt-4">
        {/* Tabs */}
        <div className="mb-5 flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {tabs
            .filter((t) => t.show)
            .map((tab) => (
              <button
                key={tab.value}
                type="button"
                onClick={() => setActiveTab(tab.value)}
                className={`flex min-h-[40px] flex-shrink-0 items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                  activeTab === tab.value
                    ? 'border-[#efc3d0] bg-[#fdecef] text-[var(--color-primary)]'
                    : 'border-[#efe4e8] bg-white text-gray-600 active:bg-[#f8edf1]'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`rounded-full px-2 py-0.5 text-[11px] ${activeTab === tab.value ? 'bg-white text-[var(--color-primary)]' : 'bg-[#f7f2f5] text-gray-500'}`}>
                  {tab.count}
                </span>
              </button>
            ))}
        </div>

        {/* Unified list */}
        {filtered.length > 0 ? (
          <div className="space-y-3">
            {filtered.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleItemClick(item)}
                className="flex w-full items-start gap-3 rounded-[28px] bg-white/86 px-4 py-4 text-left shadow-[0_20px_60px_rgba(15,23,42,0.08)] ring-1 ring-black/5 backdrop-blur transition-colors active:bg-slate-50"
              >
                <div className="relative mt-0.5 flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-[16px] bg-[linear-gradient(135deg,#FFE0EA_0%,#F4F7FB_100%)]">
                  {item.type !== 'chat' ? (
                    getNotificationIcon(item)
                  ) : item.techAvatar ? (
                    <img src={item.techAvatar} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-lg font-semibold text-[var(--color-primary)]">{item.techName.slice(0, 1)}</span>
                  )}
                  {item.type === 'chat' && isOnline(item.techId, 'technician') && (
                    <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white bg-green-500" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-semibold text-slate-900">{item.name}</p>
                    <span className={`flex-shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${getBadgeClasses(item)}`}>
                      {item.badge || getBadgeLabel(item)}
                    </span>
                  </div>
                  <p className="mt-1.5 text-[13px] leading-5 text-slate-500 line-clamp-2">{item.preview}</p>
                </div>

                <div className="flex flex-shrink-0 flex-col items-end gap-1.5 pt-0.5">
                  <span className="text-xs text-slate-400">{formatListTime(item.time)}</span>
                  {item.unread && <span className="h-2.5 w-2.5 rounded-full bg-[var(--color-primary)]" />}
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="rounded-[32px] bg-white/86 px-6 py-12 text-center shadow-[0_20px_60px_rgba(15,23,42,0.08)] ring-1 ring-black/5 backdrop-blur">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[linear-gradient(135deg,#FFE2EA_0%,#F4F6FB_100%)]">
              <svg className="h-7 w-7 text-[var(--color-primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5l-1 4 4-1h8a4 4 0 004-4V7a4 4 0 00-4-4H8a4 4 0 00-4 4v4a4 4 0 004 4h1z" />
              </svg>
            </div>
            <h3 className="mt-4 text-lg font-semibold text-slate-900">消息会在这里聚合</h3>
            <p className="mt-2 text-sm leading-6 text-slate-500">预约提醒和服务通知会统一显示在消息页</p>
          </div>
        )}
      </div>

      {/* Notification detail modal */}
      {selectedNotification && (
        <div
          className="fixed inset-0 z-[150] flex items-end justify-center bg-black/40 backdrop-blur-sm sm:items-center"
          onClick={handleCloseNotification}
        >
          <div
            className="w-full max-w-md rounded-t-3xl bg-white p-6 sm:rounded-3xl"
            onClick={(e) => e.stopPropagation()}
            style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="inline-flex items-center rounded-full bg-pink-50 px-3 py-1 text-xs font-medium text-pink-600">
                {selectedNotification.name}
              </span>
              <button
                type="button"
                onClick={handleCloseNotification}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <p className="whitespace-pre-wrap text-sm leading-6 text-slate-800">{selectedNotification.preview}</p>

            <div className="mt-4 flex items-center gap-2 text-xs text-slate-400">
              <span>{selectedNotification.techName}</span>
              <span>·</span>
              <span>{formatListTime(selectedNotification.time)}</span>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={handleCloseNotification}
                className="flex-1 rounded-full bg-slate-100 px-4 py-3 text-sm font-medium text-slate-700"
              >
                关闭
              </button>
              {selectedNotification.relatedType === 'order' && selectedNotification.relatedId && (
                <button
                  type="button"
                  onClick={() => {
                    setDetailOrderId(selectedNotification.relatedId!);
                    handleCloseNotification();
                  }}
                  className="flex-1 rounded-full bg-gradient-to-r from-[#FF6B8A] to-[#FF8FA3] px-4 py-3 text-sm font-semibold text-white shadow-md"
                >
                  查看预约详情
                </button>
              )}
              {(selectedNotification.relatedType === 'comment' || selectedNotification.relatedType === 'work_comment') && selectedNotification.relatedId && (
                <button
                  type="button"
                  onClick={() => {
                    navigate(`/works/${selectedNotification.relatedId}`);
                    handleCloseNotification();
                  }}
                  className="flex-1 rounded-full bg-gradient-to-r from-[#FF6B8A] to-[#FF8FA3] px-4 py-3 text-sm font-semibold text-white shadow-md"
                >
                  查看作品
                </button>
              )}
              {selectedNotification.relatedType === 'design' && selectedNotification.relatedId && (
                <button
                  type="button"
                  onClick={() => {
                    navigate(`/designs/${selectedNotification.relatedId}`);
                    handleCloseNotification();
                  }}
                  className="flex-1 rounded-full bg-gradient-to-r from-[#FF6B8A] to-[#FF8FA3] px-4 py-3 text-sm font-semibold text-white shadow-md"
                >
                  查看设计
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Order detail modal */}
      {detailOrderId !== null && (
        <OrderDetail
          isModal
          orderIdProp={detailOrderId}
          onClose={() => {
            setDetailOrderId(null);
            loadInbox();
          }}
        />
      )}
    </div>
  );
};

const categorizeNotification = (m: Message): UnifiedItem['type'] => {
  if (m.messageType === 'booking' || m.relatedType === 'booking') return 'booking';
  if (m.content && (m.content.includes('即将开始') || m.content.includes('服务完成'))) return 'service';
  return 'system';
};

const getNotificationName = (type: UnifiedItem['type']) => {
  if (type === 'booking') return '预约提醒';
  if (type === 'service') return '服务提醒';
  return '系统通知';
};

const getNotificationIcon = (item: UnifiedItem) => {
  if (item.relatedType === 'order' || item.relatedType === 'booking') {
    return (
      <svg className="h-5 w-5 text-[#B85C1B]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    );
  }
  if (item.relatedType === 'comment' || item.relatedType === 'work_comment') {
    return (
      <svg className="h-5 w-5 text-[var(--color-primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5l-1 4 4-1h8a4 4 0 004-4V7a4 4 0 00-4-4H8a4 4 0 00-4 4v4a4 4 0 004 4h1z" />
      </svg>
    );
  }
  return (
    <svg className="h-5 w-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
};

const getBadgeLabel = (item: UnifiedItem) => {
  if (item.type === 'chat') return '聊天';
  if (item.type === 'booking') return '预约提醒';
  if (item.type === 'service') return '服务提醒';
  return '系统通知';
};

const getBadgeClasses = (item: UnifiedItem) => {
  if (item.type === 'chat') return 'bg-[#ffe9f0] text-[#ea5e93]';
  if (item.type === 'booking') return 'bg-[#fff3e8] text-[#c96c1a]';
  if (item.type === 'service') return 'bg-[#eef6ff] text-[#3f6dbe]';
  return 'bg-[#f3f4f6] text-[#6b7280]';
};

const formatListTime = (time: string) => {
  const date = dayjs(time);
  const now = dayjs();
  if (date.isSame(now, 'day')) return date.format('HH:mm');
  if (date.isSame(now.subtract(1, 'day'), 'day')) return '昨天';
  return date.format('MM-DD');
};

export default Chat;
