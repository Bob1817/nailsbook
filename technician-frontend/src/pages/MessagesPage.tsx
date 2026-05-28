import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/base/Card';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../components/feedback/ToastProvider';
import { ordersService } from '../services/orders';
import { customersService } from '../services/customers';
import { messageService, type Conversation } from '../services/message';
import { usePresence } from '../hooks/usePresence';
import { useSocket } from '../hooks/useSocket';
import {
  formatDateLabel,
  formatDateTimeLabel,
  isSameDay,
  type TechnicianOrder,
  type TechnicianCustomerSummary,
} from '../services/technicianData';

type MessageTab = 'all' | 'unread' | 'pending' | 'service' | 'system' | 'chat';

interface MessageItem {
  id: string;
  name: string;
  badge?: string;
  time: string;
  lastMessage: string;
  unread: number;
  type: MessageTab;
  isSystem?: boolean;
  actionLabel?: string;
  actionTo?: string;
  conversationId?: number;
  clientId?: number;
}

function getMessageAvatarLabel(message: MessageItem) {
  if (message.type === 'system') {
    return '系';
  }

  return message.name.slice(0, 1).toUpperCase();
}

function getMessageBadgeLabel(message: MessageItem) {
  if (message.type === 'chat') {
    return '聊天';
  }

  if (message.type === 'system') {
    return '系统';
  }

  if (message.badge) {
    return message.badge;
  }

  return message.type === 'service' ? '服务提醒' : '待处理';
}

function getMessageAccentClasses(message: MessageItem) {
  switch (message.type) {
    case 'chat':
      return {
        avatar: 'bg-[#ffe9f0] text-pink-500',
        badge: 'bg-[#ffe9f0] text-[#ea5e93]',
        action: 'text-[#ea5e93]',
        dot: 'bg-[#e86b8f]',
      };
    case 'pending':
      return {
        avatar: 'bg-[#fff3e8] text-[#d47a2a]',
        badge: 'bg-[#fff3e8] text-[#c96c1a]',
        action: 'text-[#c96c1a]',
        dot: 'bg-[#f08c2e]',
      };
    case 'service':
      return {
        avatar: 'bg-[#eef6ff] text-[#4c7ccf]',
        badge: 'bg-[#eef6ff] text-[#3f6dbe]',
        action: 'text-[#3f6dbe]',
        dot: 'bg-[#4c7ccf]',
      };
    case 'system':
    default:
      return {
        avatar: 'bg-[#f3f4f6] text-[#6b7280]',
        badge: 'bg-[#f3f4f6] text-[#6b7280]',
        action: 'text-[#6b7280]',
        dot: 'bg-[#6b7280]',
      };
  }
}

export const MessagesPage: React.FC = () => {
  const { technician } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [orders, setOrders] = useState<TechnicianOrder[]>([]);
  const [customers, setCustomers] = useState<TechnicianCustomerSummary[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<MessageTab>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [selectedMessage, setSelectedMessage] = useState<MessageItem | null>(null);

  const { isOnline } = usePresence();
  const { socket } = useSocket();

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      setIsLoading(true);
      try {
        const [nextOrders, nextCustomers, chatConversations] = await Promise.all([
          ordersService.list({ technicianId: technician?.id }),
          customersService.list({ technicianId: technician?.id }),
          messageService.getConversations().catch(() => []),
        ]);

        if (!cancelled) {
          setOrders(nextOrders);
          setCustomers(nextCustomers);
          setConversations(chatConversations);
          setIsLoading(false);
        }
      } catch {
        if (!cancelled) {
          setOrders([]);
          setCustomers([]);
          setConversations([]);
          setIsLoading(false);
          toast.error('消息提醒加载失败，请稍后重试。');
        }
      }
    }

    void loadData();
    return () => {
      cancelled = true;
    };
  }, [technician?.id, toast]);

  // Real-time message listener
  useEffect(() => {
    if (!socket) return;

    const onNewMessage = (data: { message: any; conversation: any }) => {
      setConversations((prev) =>
        prev.map((c) =>
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

      if (document.visibilityState !== 'visible' && Notification.permission === 'granted') {
        new Notification('新消息', {
          body: data.message.messageType === 'image' ? '[图片]' : data.message.content,
        });
      }
    };

    socket.on('message:new', onNewMessage);
    return () => { socket.off('message:new', onNewMessage); };
  }, [socket]);

  // Request notification permission
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  function handleMessageAction(message: MessageItem) {
    // Mark as read
    if (message.unread > 0) {
      setReadIds((prev) => new Set(prev).add(message.id));
      if (message.conversationId) {
        void messageService.markAsRead(message.conversationId).catch(() => {});
      }
    }

    if (message.type === 'chat' && (message.conversationId || message.clientId)) {
      if (message.conversationId) {
        navigate(`/chat?conversation_id=${message.conversationId}`);
      } else if (message.clientId) {
        navigate(`/chat?client_id=${message.clientId}`);
      }
      return;
    }

    // Show modal for non-chat messages
    setSelectedMessage(message);
  }

  function handleModalAction(message: MessageItem) {
    setSelectedMessage(null);
    if (!message.actionTo) {
      toast.warning('当前提醒暂无可处理入口。');
      return;
    }
    navigate(message.actionTo);
  }

  const messages = useMemo<MessageItem[]>(() => {
    const today = new Date();

    // Chat conversations from real messages
    const chatMessages: MessageItem[] = conversations.map((conv) => ({
      id: `chat-${conv.id}`,
      name: conv.client.nickname || conv.client.phone || '未知客户',
      time: conv.lastMessageAt ? formatDateLabel(conv.lastMessageAt) : formatDateLabel(today.toISOString()),
      lastMessage: conv.lastMessage || '暂无消息',
      unread: conv.unreadCount,
      type: 'chat' as const,
      conversationId: conv.id,
      clientId: conv.client.id,
    }));

    const pending = orders
      .filter((order) => order.status === 'pending_confirm')
      .map((order) => ({
        id: `pending-${order.id}`,
        name: order.customerName,
        badge: '待确认',
        time: formatDateTimeLabel(order.startTime),
        lastMessage: `预约待确认：${order.serviceName}，服务地址 ${order.address}`,
        unread: 1,
        type: 'pending' as const,
        actionLabel: '去确认',
        actionTo: `/orders?orderId=${order.id}`,
      }));

    const service = orders
      .filter((order) => order.status === 'pending_home' || order.status === 'pending_shop' || order.status === 'completed')
      .slice(0, 6)
      .map((order) => {
        const orderDate = new Date(order.startTime);
        const dateStr = `${orderDate.getFullYear()}-${String(orderDate.getMonth() + 1).padStart(2, '0')}-${String(orderDate.getDate()).padStart(2, '0')}`;
        return {
          id: `service-${order.id}`,
          name: order.customerName,
          badge: order.status === 'completed' ? '已完成' : '待服务',
          time: formatDateTimeLabel(order.startTime),
          lastMessage:
            order.status === 'pending_home' || order.status === 'pending_shop'
              ? `服务提醒：${order.serviceName} 即将开始`
              : `服务完成：${order.serviceName}，记得跟进复购与评价`,
          unread: order.status === 'pending_home' || order.status === 'pending_shop' ? 1 : 0,
          type: 'service' as const,
          actionLabel: order.status === 'pending_home' || order.status === 'pending_shop' ? '查看行程' : '查看预约',
          actionTo: order.status === 'pending_home' || order.status === 'pending_shop' ? `/schedule?date=${dateStr}` : `/orders?orderId=${order.id}`,
        };
      });

    const depositReminders = orders
      .filter((order) => !order.depositPaid && order.status !== 'cancelled')
      .slice(0, 4)
      .map((order) => ({
        id: `deposit-${order.id}`,
        name: order.customerName,
        badge: '定金待收',
        time: formatDateTimeLabel(order.startTime),
        lastMessage: `请跟进 ${order.serviceName} 的定金确认，避免影响后续上门安排。`,
        unread: 1,
        type: 'pending' as const,
        actionLabel: '去处理',
        actionTo: `/orders?orderId=${order.id}`,
      }));

    const todayDateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    const system: MessageItem[] = [
      {
        id: 'system-today',
        name: '系统通知',
        time: formatDateLabel(today.toISOString()),
        lastMessage: `今日共有 ${orders.filter((order) => isSameDay(order.startTime, today)).length} 个预约安排，请注意准时上门。`,
        unread: 1,
        type: 'system',
        isSystem: true,
        actionLabel: '查看行程',
        actionTo: `/schedule?date=${todayDateStr}`,
      },
      {
        id: 'system-customers',
        name: '客户提醒',
        time: formatDateLabel(today.toISOString()),
        lastMessage: `当前客户档案 ${customers.length} 位，建议优先跟进最近预约与常客回访。`,
        unread: 0,
        type: 'system',
        isSystem: true,
        actionLabel: '查看客户',
        actionTo: '/customers',
      },
    ];

    return [...chatMessages, ...pending, ...depositReminders, ...service, ...system].map((m) =>
      readIds.has(m.id) ? { ...m, unread: 0 } : m,
    );
  }, [orders, customers, conversations, readIds]);

  const unreadCount = messages.filter((m) => m.unread > 0).length;

  // 数据加载完成后，根据未读数自动切换默认标签
  useEffect(() => {
    if (isLoading) return;
    setActiveTab(unreadCount > 0 ? 'unread' : 'all');
  }, [isLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  const filteredMessages = messages.filter((message) => {
    if (activeTab === 'unread' && message.unread <= 0) return false;
    if (activeTab !== 'all' && activeTab !== 'unread' && message.type !== activeTab) {
      return false;
    }

    if (!searchQuery.trim()) {
      return true;
    }

    const query = searchQuery.trim().toLowerCase();
    return (
      message.name.toLowerCase().includes(query) ||
      message.lastMessage.toLowerCase().includes(query)
    );
  });

  const tabs = [
    { label: '未读', value: 'unread' as const, count: unreadCount, show: unreadCount > 0 },
    { label: '全部', value: 'all' as const, count: messages.length, show: true },
    { label: '聊天', value: 'chat' as const, count: messages.filter((item) => item.type === 'chat').length, show: true },
    { label: '待确认预约', value: 'pending' as const, count: messages.filter((item) => item.type === 'pending').length, show: true },
    { label: '服务提醒', value: 'service' as const, count: messages.filter((item) => item.type === 'service').length, show: true },
    { label: '系统通知', value: 'system' as const, count: messages.filter((item) => item.type === 'system').length, show: true },
  ];

  const handleStartNewChat = (customerId: number) => {
    // Check if conversation already exists
    const existingConv = conversations.find(c => c.client.id === customerId);
    if (existingConv) {
      navigate(`/chat?conversation_id=${existingConv.id}`);
    } else {
      navigate(`/chat?client_id=${customerId}`);
    }
    setShowNewChatModal(false);
  };

  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(customerSearchQuery.toLowerCase()) ||
    customer.phone.includes(customerSearchQuery)
  );

  return (
    <div className="flex h-full flex-col bg-[#fff9f8]">
      {/* 固定头部：标题 + 搜索 + 标签 */}
      <div className="shrink-0 space-y-4 px-5 pt-5 pb-3">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-gray-900">消息</h1>
          <button
            onClick={() => setShowNewChatModal(true)}
            className="flex min-h-[44px] items-center gap-2 rounded-full bg-[#ffe9f0] px-4 py-2 text-sm font-medium text-pink-500 transition-colors active:bg-[#f2d2dc]"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            新建对话
          </button>
        </div>

        <div className="relative">
          <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            placeholder="搜索消息、客户或提醒内容"
            className="h-11 w-full rounded-[16px] bg-[#f7f2f5] pl-10 pr-4 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FF5A66]"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
          />
        </div>

        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          {tabs.filter((t) => t.show).map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={`flex min-h-[44px] flex-shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === tab.value
                  ? 'border-[#efc3d0] bg-[#fdecef] text-pink-500'
                  : 'border-[#efe4e8] bg-white text-gray-600 active:bg-[#f8edf1]'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`rounded-full px-2 py-0.5 text-[11px] ${activeTab === tab.value ? 'bg-white text-pink-500' : 'bg-[#f7f2f5] text-gray-500'}`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* 可滚动内容：消息卡片 */}
      <div className="flex-1 min-h-0 overflow-y-auto px-5 pb-6">
        <div className="space-y-3">
          {isLoading ? (
            <Card className="px-lg py-xl text-center text-sm text-gray-400">提醒加载中...</Card>
          ) : filteredMessages.length > 0 ? (
            filteredMessages.map((message) => {
              const accent = getMessageAccentClasses(message);

              return (
                <Card key={message.id} className="transition-colors active:bg-[#fdf3f6]">
                  <button
                    onClick={() => handleMessageAction(message)}
                    className="flex min-h-[96px] w-full items-start gap-3 px-lg py-lg text-left"
                  >
                    <div className="relative shrink-0">
                      <div className={`flex h-12 w-12 items-center justify-center rounded-full text-base font-semibold ${accent.avatar}`}>
                        {getMessageAvatarLabel(message)}
                      </div>
                      {message.type === 'chat' && message.clientId && isOnline(message.clientId, 'client') && (
                        <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 pr-1">
                        <p className="truncate text-sm font-semibold text-gray-900">{message.name}</p>
                        <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${accent.badge}`}>
                          {getMessageBadgeLabel(message)}
                        </span>
                      </div>
                      <p className="mt-1.5 break-words pr-1 text-[13px] leading-5 text-gray-500">
                        {message.lastMessage}
                      </p>
                    </div>
                    <div className="flex w-[4.25rem] shrink-0 flex-col items-end gap-2 pt-0.5 text-right">
                      <p className="text-xs text-gray-400">{message.time}</p>
                      <div className="flex min-h-[24px] items-center gap-2">
                        {message.actionLabel ? (
                          <span className={`text-[11px] font-medium ${accent.action}`}>{message.actionLabel}</span>
                        ) : null}
                        {message.unread > 0 ? (
                          message.unread > 1 ? (
                            <span className="inline-flex min-w-[20px] items-center justify-center rounded-full bg-[#e85d75] px-1.5 py-0.5 text-[11px] font-medium text-white">
                              {message.unread}
                            </span>
                          ) : (
                            <span className={`h-2.5 w-2.5 rounded-full ${accent.dot}`} />
                          )
                        ) : null}
                      </div>
                    </div>
                  </button>
                </Card>
              );
            })
          ) : (
            <Card className="px-lg py-xl text-center text-sm text-gray-400">没有匹配的消息提醒</Card>
          )}
        </div>
      </div>

      {showNewChatModal && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 px-3 pb-[calc(6.5rem+env(safe-area-inset-bottom,0px))] sm:items-center sm:px-0 sm:pb-0">
          <Card className="max-h-[min(70vh,36rem)] w-full max-w-md overflow-hidden rounded-[28px] px-lg pt-lg animate-slide-up">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">选择客户发起对话</h3>
                <p className="mt-1 text-sm text-gray-400">搜索客户后直接进入已有对话或新建聊天</p>
              </div>
              <button
                onClick={() => setShowNewChatModal(false)}
                className="flex h-11 w-11 items-center justify-center rounded-full border border-[#efe4e8] bg-white text-gray-500 transition-colors active:bg-[#f8edf1]"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="relative mb-4">
              <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="搜索客户姓名或手机号"
                className="h-11 w-full rounded-[16px] bg-[#f7f2f5] pl-10 pr-4 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FF5A66]"
                value={customerSearchQuery}
                onChange={(e) => setCustomerSearchQuery(e.target.value)}
              />
            </div>

            <div className="max-h-[min(50vh,20rem)] space-y-2.5 overflow-y-auto pb-[calc(20px+env(safe-area-inset-bottom,0px))] pr-1">
              {filteredCustomers.length > 0 ? (
                filteredCustomers.map((customer) => {
                  const hasConversation = conversations.some(c => c.client.id === customer.id);

                  return (
                    <button
                      key={customer.id}
                      onClick={() => handleStartNewChat(customer.id)}
                      className="flex min-h-[72px] w-full items-center gap-3 rounded-[18px] bg-[#fcf7f8] px-4 py-3 text-left transition-colors active:bg-[#f8edf1]"
                    >
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white text-base font-semibold text-pink-500">
                        {customer.name.charAt(0)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-sm font-semibold text-gray-900">{customer.name}</p>
                          {hasConversation ? (
                            <span className="rounded-full bg-[#ffe9f0] px-2.5 py-1 text-[11px] font-medium text-pink-500">
                              已有对话
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-1 text-sm text-gray-500">{customer.phone}</p>
                      </div>
                    </button>
                  );
                })
              ) : (
                <div className="rounded-[18px] bg-[#fcf7f8] px-4 py-6 text-center text-sm text-gray-400">没有找到匹配的客户</div>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Message detail modal */}
      {selectedMessage && (
        <div
          className="fixed inset-0 z-[150] flex items-end justify-center bg-black/40 backdrop-blur-sm sm:items-center"
          onClick={() => setSelectedMessage(null)}
        >
          <div
            className="w-full max-w-md rounded-t-[32px] bg-white p-6 sm:rounded-[32px]"
            onClick={(e) => e.stopPropagation()}
            style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}
          >
            <div className="mb-3 flex items-center justify-between">
              <span className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-medium ${getMessageAccentClasses(selectedMessage).badge}`}>
                {getMessageBadgeLabel(selectedMessage)}
              </span>
              <button
                type="button"
                onClick={() => setSelectedMessage(null)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <p className="text-[15px] font-semibold text-gray-900">{selectedMessage.name}</p>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{selectedMessage.lastMessage}</p>

            <div className="mt-3 flex items-center gap-2 text-xs text-slate-400">
              <span>{selectedMessage.time}</span>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setSelectedMessage(null)}
                className="flex-1 rounded-full bg-slate-100 px-4 py-3 text-sm font-medium text-slate-700"
              >
                关闭
              </button>
              {selectedMessage.actionLabel && (
                <button
                  type="button"
                  onClick={() => handleModalAction(selectedMessage)}
                  className="flex-1 rounded-full bg-gradient-to-r from-[#FF5E93] to-[#FF8AA0] px-4 py-3 text-sm font-semibold text-white shadow-md"
                >
                  {selectedMessage.actionLabel}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
