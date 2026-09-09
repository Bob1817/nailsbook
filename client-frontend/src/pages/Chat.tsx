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
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
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
    const keyword = searchQuery.trim().toLowerCase();
    if (keyword) {
      const searchable = [
        item.name,
        item.preview,
        item.techName,
        item.badge || '',
      ].join(' ').toLowerCase();
      if (!searchable.includes(keyword)) return false;
    }
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
      <div className="min-h-full bg-[var(--nb-page)]">
        <div className="border-b border-white/60 bg-white/76 px-5 app-header-safe pb-2 backdrop-blur-xl">
          <div className="flex min-h-11 items-center justify-between">
            <h1 className="text-[17px] font-semibold text-[var(--nb-ink)]">消息</h1>
          </div>
        </div>
        <div className="px-5 pb-24 pt-6">
          <div className="rounded-[32px] bg-white/86 p-5 shadow-[0_20px_60px_rgba(0,0,0,0.08)] ring-1 ring-black/5 backdrop-blur">
            <ChatListSkeleton />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-[var(--nb-page)]">
      <div className="border-b border-white/60 bg-white/76 px-5 app-header-safe pb-2 backdrop-blur-xl">
        <div className="flex min-h-11 items-center justify-between gap-4">
          <h1 className="text-[17px] font-semibold text-[var(--nb-ink)]">消息</h1>
          <button
            type="button"
            onClick={() => setShowSearch(true)}
            aria-label="搜索消息"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-white/88 text-[var(--nb-secondary)] shadow-[0_10px_24px_rgba(0,0,0,0.08)] ring-1 ring-black/5 active:scale-95"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>
        </div>
      </div>

      {showSearch && (
        <div
          className="fixed inset-0 z-[120] bg-black/45 px-5 pt-[max(1.5rem,calc(env(safe-area-inset-top)+1rem))] backdrop-blur-sm"
          onClick={() => setShowSearch(false)}
        >
          <div
            className="mx-auto flex max-w-md items-center gap-2 rounded-[24px] bg-white p-2 shadow-2xl ring-1 ring-black/5"
            onClick={(e) => e.stopPropagation()}
          >
            <svg className="ml-2 h-5 w-5 shrink-0 text-[var(--nb-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              autoFocus
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索消息、通知、美甲师"
              className="floating-search-input h-11 min-w-0 flex-1 bg-transparent text-sm text-[var(--nb-ink)] outline-none placeholder:text-[var(--nb-muted)] focus-visible:outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="清空搜索"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--nb-page)] text-[var(--nb-secondary)]"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowSearch(false)}
              className="h-9 rounded-full px-3 text-sm font-medium text-[var(--color-primary)]"
            >
              完成
            </button>
          </div>
        </div>
      )}

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
                    ? 'border-[var(--nb-line)] bg-[var(--nb-page)] text-[var(--color-primary)]'
                    : 'border-[var(--nb-line)] bg-white text-[var(--nb-secondary)] active:bg-[var(--nb-page)]'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`rounded-full px-2 py-0.5 text-[11px] ${activeTab === tab.value ? 'bg-white text-[var(--color-primary)]' : 'bg-[var(--nb-page)] text-[var(--nb-secondary)]'}`}>
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
                className="flex w-full items-start gap-3 rounded-[28px] bg-white/86 px-4 py-4 text-left shadow-[0_20px_60px_rgba(0,0,0,0.08)] ring-1 ring-black/5 backdrop-blur transition-colors active:bg-[var(--nb-page)]"
              >
                <div className="relative mt-0.5 flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-[16px] bg-[var(--nb-page)]">
                  {item.type !== 'chat' ? (
                    getNotificationIcon(item)
                  ) : item.techAvatar ? (
                    <img src={item.techAvatar} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-lg font-semibold text-[var(--color-primary)]">{item.techName.slice(0, 1)}</span>
                  )}
                  {item.type === 'chat' && isOnline(item.techId, 'technician') && (
                    <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white bg-[var(--nb-action)]" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-semibold text-[var(--nb-ink)]">{item.name}</p>
                    <span className={`flex-shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${getBadgeClasses(item)}`}>
                      {item.badge || getBadgeLabel(item)}
                    </span>
                  </div>
                  <p className="mt-1.5 text-[13px] leading-5 text-[var(--nb-secondary)] line-clamp-2">{item.preview}</p>
                </div>

                <div className="flex flex-shrink-0 flex-col items-end gap-1.5 pt-0.5">
                  <span className="text-xs text-[var(--nb-muted)]">{formatListTime(item.time)}</span>
                  {item.unread && <span className="h-2.5 w-2.5 rounded-full bg-[var(--color-primary)]" />}
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="rounded-[32px] bg-white/86 px-6 py-12 text-center shadow-[0_20px_60px_rgba(0,0,0,0.08)] ring-1 ring-black/5 backdrop-blur">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[var(--nb-page)]">
              <svg className="h-7 w-7 text-[var(--color-primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5l-1 4 4-1h8a4 4 0 004-4V7a4 4 0 00-4-4H8a4 4 0 00-4 4v4a4 4 0 004 4h1z" />
              </svg>
            </div>
            <h3 className="mt-4 text-lg font-semibold text-[var(--nb-ink)]">消息会在这里聚合</h3>
            <p className="mt-2 text-sm leading-6 text-[var(--nb-secondary)]">预约提醒和服务通知会统一显示在消息页</p>
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
              <span className="inline-flex items-center rounded-full bg-[var(--nb-page)] px-3 py-1 text-xs font-medium text-[var(--nb-secondary)]">
                {selectedNotification.name}
              </span>
              <button
                type="button"
                onClick={handleCloseNotification}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--nb-page)] text-[var(--nb-secondary)]"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <p className="whitespace-pre-wrap text-sm leading-6 text-[var(--nb-ink)]">{selectedNotification.preview}</p>

            <div className="mt-4 flex items-center gap-2 text-xs text-[var(--nb-muted)]">
              <span>{selectedNotification.techName}</span>
              <span>·</span>
              <span>{formatListTime(selectedNotification.time)}</span>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={handleCloseNotification}
                className="flex-1 rounded-full bg-[var(--nb-page)] px-4 py-3 text-sm font-medium text-[var(--nb-ink)]"
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
                  className="flex-1 rounded-full bg-[var(--nb-action)] px-4 py-3 text-sm font-semibold text-white shadow-md"
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
                  className="flex-1 rounded-full bg-[var(--nb-action)] px-4 py-3 text-sm font-semibold text-white shadow-md"
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
                  className="flex-1 rounded-full bg-[var(--nb-action)] px-4 py-3 text-sm font-semibold text-white shadow-md"
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
      <svg className="h-5 w-5 text-[var(--nb-ink)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
    <svg className="h-5 w-5 text-[var(--nb-secondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
  if (item.type === 'chat') return 'bg-[var(--nb-page)] text-[var(--nb-ink)]';
  if (item.type === 'booking') return 'bg-[var(--nb-page)] text-[var(--nb-ink)]';
  if (item.type === 'service') return 'bg-[var(--nb-page)] text-[var(--nb-ink)]';
  return 'bg-[var(--nb-page)] text-[var(--nb-secondary)]';
};

const formatListTime = (time: string) => {
  const date = dayjs(time);
  const now = dayjs();
  if (date.isSame(now, 'day')) return date.format('HH:mm');
  if (date.isSame(now.subtract(1, 'day'), 'day')) return '昨天';
  return date.format('MM-DD');
};

export default Chat;
