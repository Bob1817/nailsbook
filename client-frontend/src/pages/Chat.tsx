import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import dayjs from 'dayjs';
import { useAuth } from '../contexts/AuthContext';
import { messageService, type Conversation, type Message } from '../services/message';
import { usePresence } from '../hooks/usePresence';
import { useSocket } from '../hooks/useSocket';
import { ChatListSkeleton } from '../components/Skeleton';

interface InboxNotification {
  id: string;
  type: 'booking' | 'comment' | 'system' | 'quote';
  title: string;
  summary: string;
  time: string;
  unread: boolean;
  targetRoute: string;
  technicianName?: string;
}

const Chat: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { technicians, technician: defaultTechnician } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [notifications, setNotifications] = useState<InboxNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const { isOnline } = usePresence();
  const { socket } = useSocket();

  const techIdFromUrl = searchParams.get('tech_id');

  useEffect(() => {
    loadInbox();
  }, []);

  useEffect(() => {
    if (!techIdFromUrl || conversations.length === 0) {
      return;
    }

    const techId = parseInt(techIdFromUrl, 10);
    const matchedConversation = conversations.find((item) => item.technician.id === techId);

    if (matchedConversation) {
      navigate(`/chat/${matchedConversation.id}`, { replace: true });
      return;
    }

    const matchedTechnician = technicians.find((item) => item.id === techId) || defaultTechnician;
    if (matchedTechnician) {
      navigate(`/chat/direct?tech_id=${matchedTechnician.id}`, { replace: true });
    }
  }, [techIdFromUrl, conversations, technicians, defaultTechnician, navigate]);

  // Real-time new message listener
  useEffect(() => {
    if (!socket) return;

    const onNewMessage = (data: { message: any; conversation: any }) => {
      setConversations((prev: any[]) =>
        prev.map((c: any) =>
          c.id === data.conversation.id
            ? {
                ...c,
                lastMessage: data.message.content,
                lastMessageAt: data.message.createdAt,
                unreadCount: (c.unreadCount || 0) + 1,
              }
            : c,
        ),
      );

      // Browser notification if page not visible
      if (document.visibilityState !== 'visible' && Notification.permission === 'granted') {
        new Notification('新消息', {
          body: data.message.messageType === 'image' ? '[图片]' : data.message.content,
        });
      }
    };

    socket.on('message:new', onNewMessage);
    return () => { socket.off('message:new', onNewMessage); };
  }, [socket]);

  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const totalUnread = useMemo(
    () => conversations.reduce((count, conversation) => count + (conversation.unreadCount || 0), 0),
    [conversations]
  );

  const loadInbox = async () => {
    setLoading(true);
    try {
      const data = await messageService.getConversations();
      setConversations(data);

      const messageBatches = await Promise.all(
        data.map(async (conversation) => ({
          conversation,
          detail: await messageService.getMessages(conversation.id),
        }))
      );

      const nextNotifications = messageBatches
        .flatMap(({ conversation, detail }) =>
          detail.messages
            .filter(isSystemNotification)
            .map((message) => mapNotification(message, conversation))
        )
        .sort((a, b) => dayjs(b.time).valueOf() - dayjs(a.time).valueOf())
        .slice(0, 8);

      setNotifications(nextNotifications);
    } catch (error) {
      console.error('Failed to load inbox:', error);
    } finally {
      setLoading(false);
    }
  };

  const isEmpty = conversations.length === 0 && notifications.length === 0;

  if (loading) {
    return (
      <div className="min-h-full bg-[linear-gradient(180deg,#FFFDFD_0%,#F7F3F6_48%,#F2F6FB_100%)]">
        <div className="border-b border-white/60 bg-white/76 px-5 app-header-safe pb-5 backdrop-blur-xl">
          <div>
            <span className="text-[11px] uppercase tracking-[0.34em] text-slate-400">MESSAGES</span>
            <h1 className="mt-0.5 text-[1.75rem] font-bold tracking-[-0.03em] text-slate-900">消息</h1>
          </div>
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
            <p className="mt-1 text-sm leading-6 text-slate-500">查看美甲师会话与预约、评论、系统提醒</p>
          </div>
          <div className="rounded-full bg-white/88 px-4 py-2 text-sm font-medium text-slate-600 shadow-[0_10px_24px_rgba(15,23,42,0.08)] ring-1 ring-black/5">
            {totalUnread > 0 ? `${totalUnread} 条未读` : `${conversations.length} 个会话`}
          </div>
        </div>
      </div>

      <div className="space-y-6 px-5 pb-24 pt-6">
        <section className="rounded-[32px] bg-white/86 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)] ring-1 ring-black/5 backdrop-blur">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold tracking-[-0.03em] text-slate-900">系统通知</h2>
              <p className="mt-1 text-sm text-slate-500">预约提醒、作品评论与服务更新</p>
            </div>
            <div className="rounded-full bg-[var(--color-primary-soft)] px-3 py-1 text-xs font-medium text-[var(--color-primary)]">
              {notifications.length} 条消息
            </div>
          </div>

          {notifications.length === 0 ? (
            <div className="rounded-[24px] bg-slate-50 px-5 py-8 text-center">
              <p className="text-sm font-medium text-slate-600">暂时没有新的系统通知</p>
              <p className="mt-2 text-sm leading-6 text-slate-400">预约确认、作品评论和系统更新会显示在这里</p>
            </div>
          ) : (
            <div className="space-y-3">
              {notifications.map((item) => (
                <button
                  key={item.id}
                  onClick={() => navigate(item.targetRoute)}
                  className="flex w-full items-start gap-3 rounded-[24px] bg-slate-50/90 px-4 py-4 text-left transition-transform active:scale-[0.99]"
                >
                  <div className={`mt-0.5 flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl ${getNotificationTone(item.type)}`}>
                    {getNotificationIcon(item.type)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-semibold text-slate-900">{item.title}</p>
                      {item.unread && <span className="h-2 w-2 rounded-full bg-[var(--color-primary)]"></span>}
                    </div>
                    <p className="mt-1 text-sm leading-6 text-slate-500">{item.summary}</p>
                    <div className="mt-2 flex items-center gap-2 text-xs text-slate-400">
                      <span>{formatListTime(item.time)}</span>
                      {item.technicianName && (
                        <>
                          <span>·</span>
                          <span>{item.technicianName}</span>
                        </>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-[32px] bg-white/86 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)] ring-1 ring-black/5 backdrop-blur">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold tracking-[-0.03em] text-slate-900">美甲师会话</h2>
              <p className="mt-1 text-sm text-slate-500">与你绑定的美甲师一对一沟通</p>
            </div>
            <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500">
              {conversations.length} 位美甲师
            </div>
          </div>

          {conversations.length === 0 ? (
            <div className="rounded-[24px] bg-slate-50 px-5 py-8 text-center">
              <p className="text-sm font-medium text-slate-600">暂时还没有会话记录</p>
              <p className="mt-2 text-sm leading-6 text-slate-400">绑定新的美甲师后，可以在这里查看全部聊天动态</p>
            </div>
          ) : (
            <div className="space-y-3">
              {conversations.map((conversation) => (
                <button
                  key={conversation.id}
                  onClick={() => navigate(`/chat/${conversation.id}`)}
                  className="flex w-full items-center gap-3 rounded-[24px] bg-slate-50/90 px-4 py-4 text-left transition-transform active:scale-[0.99]"
                >
                  <div className="relative flex h-14 w-14 flex-shrink-0 items-center justify-center overflow-hidden rounded-[20px] bg-[linear-gradient(135deg,#FFE0EA_0%,#F4F7FB_100%)]">
                    {conversation.technician.avatarUrl ? (
                      <img src={conversation.technician.avatarUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-lg font-semibold text-[var(--color-primary)]">
                        {conversation.technician.name.slice(0, 1)}
                      </span>
                    )}
                    {conversation.unreadCount > 0 && (
                      <span className="absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-[var(--color-primary)] px-1 text-[10px] font-semibold text-white">
                        {conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
                      </span>
                    )}
                    {isOnline(conversation.technicianId || conversation.technician?.id, 'technician') && (
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900">{conversation.technician.name}</p>
                        <p className="mt-1 text-xs text-slate-400">专属美甲师</p>
                      </div>
                      <span className="flex-shrink-0 text-xs text-slate-400">
                        {conversation.lastMessageAt ? formatListTime(conversation.lastMessageAt) : ''}
                      </span>
                    </div>
                    <p className="mt-2 truncate text-sm text-slate-500">
                      {formatConversationPreview(conversation.lastMessage)}
                    </p>
                  </div>
                  <svg className="h-4 w-4 flex-shrink-0 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              ))}
            </div>
          )}
        </section>

        {isEmpty && (
          <div className="rounded-[32px] bg-white/86 px-6 py-12 text-center shadow-[0_20px_60px_rgba(15,23,42,0.08)] ring-1 ring-black/5 backdrop-blur">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[linear-gradient(135deg,#FFE2EA_0%,#F4F6FB_100%)]">
              <svg className="h-7 w-7 text-[var(--color-primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5l-1 4 4-1h8a4 4 0 004-4V7a4 4 0 00-4-4H8a4 4 0 00-4 4v4a4 4 0 004 4h1z" />
              </svg>
            </div>
            <h3 className="mt-4 text-lg font-semibold text-slate-900">消息会在这里聚合</h3>
            <p className="mt-2 text-sm leading-6 text-slate-500">预约提醒、作品评论和各位美甲师的会话动态会统一显示在消息页</p>
          </div>
        )}
      </div>
    </div>
  );
};

const isSystemNotification = (message: Message) => {
  return (
    message.messageType === 'system' ||
    message.messageType === 'booking' ||
    message.messageType === 'quote' ||
    message.relatedType === 'comment' ||
    message.relatedType === 'work_comment' ||
    message.relatedType === 'booking' ||
    (!!message.content && message.content.includes('评论'))
  );
};

const mapNotification = (message: Message, conversation: Conversation): InboxNotification => {
  const type = getNotificationType(message);
  const relatedId = message.relatedId || undefined;

  return {
    id: `${conversation.id}-${message.id}`,
    type,
    title: getNotificationTitle(type),
    summary: message.content || getNotificationTitle(type),
    time: message.createdAt,
    unread: !message.isRead,
    targetRoute: getNotificationTarget(type, relatedId),
    technicianName: conversation.technician.name,
  };
};

const getNotificationType = (message: Message): InboxNotification['type'] => {
  if (message.relatedType === 'comment' || message.relatedType === 'work_comment' || message.content?.includes('评论')) {
    return 'comment';
  }
  if (message.messageType === 'booking' || message.relatedType === 'booking') {
    return 'booking';
  }
  if (message.messageType === 'quote') {
    return 'quote';
  }
  return 'system';
};

const getNotificationTitle = (type: InboxNotification['type']) => {
  const map = {
    booking: '预约提醒',
    comment: '评论提醒',
    quote: '设计进度',
    system: '系统通知',
  };
  return map[type];
};

const getNotificationTarget = (type: InboxNotification['type'], relatedId?: number) => {
  if (type === 'booking' && relatedId) {
    return `/orders/${relatedId}`;
  }
  if (type === 'booking') {
    return '/orders';
  }
  if (type === 'comment' && relatedId) {
    return `/works/${relatedId}`;
  }
  if (type === 'quote' && relatedId) {
    return `/designs/${relatedId}`;
  }
  return '/home';
};

const getNotificationTone = (type: InboxNotification['type']) => {
  const map = {
    booking: 'bg-[linear-gradient(135deg,#FFF1E7_0%,#FFE2CF_100%)] text-[#B85C1B]',
    comment: 'bg-[linear-gradient(135deg,#FFF0F5_0%,#FFE0EA_100%)] text-[var(--color-primary)]',
    quote: 'bg-[linear-gradient(135deg,#F1EDFF_0%,#E4DBFF_100%)] text-[#6C57DE]',
    system: 'bg-[linear-gradient(135deg,#ECFBF5_0%,#D8F6EA_100%)] text-[#1D8C6A]',
  };
  return map[type];
};

const getNotificationIcon = (type: InboxNotification['type']) => {
  if (type === 'booking') {
    return (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    );
  }
  if (type === 'comment') {
    return (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5l-1 4 4-1h8a4 4 0 004-4V7a4 4 0 00-4-4H8a4 4 0 00-4 4v4a4 4 0 004 4h1z" />
      </svg>
    );
  }
  if (type === 'quote') {
    return (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    );
  }
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
};

const formatConversationPreview = (message: string | null) => {
  if (!message) {
    return '点击进入会话，开始一对一沟通';
  }
  return message;
};

const formatListTime = (time: string) => {
  const date = dayjs(time);
  const now = dayjs();
  if (date.isSame(now, 'day')) {
    return date.format('HH:mm');
  }
  if (date.isSame(now.subtract(1, 'day'), 'day')) {
    return '昨天';
  }
  return date.format('MM-DD');
};

export default Chat;
