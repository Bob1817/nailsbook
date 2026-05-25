import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import dayjs from 'dayjs';
import { useAuth } from '../contexts/AuthContext';
import { messageService, type Message, type TechnicianInfo } from '../services/message';
import { uploadService } from '../services/upload';
import { useSocket } from '../hooks/useSocket';
import { useTyping } from '../hooks/useTyping';

const ChatDetail: React.FC = () => {
  const navigate = useNavigate();
  const { conversationId } = useParams<{ conversationId: string }>();
  const [searchParams] = useSearchParams();
  const { technicians, technician: defaultTechnician } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentTechnician, setCurrentTechnician] = useState<TechnicianInfo | null>(null);
  const [currentConversationId, setCurrentConversationId] = useState<number | null>(
    conversationId ? parseInt(conversationId, 10) : null
  );
  const [, setConversations] = useState<Array<{ id: number; techId: number }>>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showTechSelector, setShowTechSelector] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { socket, isConnected } = useSocket();
  const { isOtherTyping, emitTyping } = useTyping(socket, currentConversationId);

  const techIdFromUrl = searchParams.get('tech_id');

  const loadConversations = useCallback(async () => {
    try {
      const convs = await messageService.getConversations();
      setConversations(convs.map((item) => ({ id: item.id, techId: item.technician.id })));
    } catch (error) {
      console.error('Failed to load conversations:', error);
    }
  }, []);

  const loadMessagesByConversationId = useCallback(async (id: number, showLoading = true) => {
    if (showLoading) {
      setLoading(true);
    }

    try {
      const data = await messageService.getMessages(id);
      setCurrentConversationId(id);
      setCurrentTechnician(data.technician);
      setMessages((prev) => (JSON.stringify(prev) !== JSON.stringify(data.messages) ? data.messages : prev));
      void messageService.markAsRead(id);
    } catch (error) {
      console.error('Failed to load messages:', error);
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    const nextConversationId = conversationId ? parseInt(conversationId, 10) : null;
    setCurrentConversationId(nextConversationId && !Number.isNaN(nextConversationId) ? nextConversationId : null);
  }, [conversationId]);

  useEffect(() => {
    if (currentConversationId) {
      loadMessagesByConversationId(currentConversationId);
      return;
    }

    if (techIdFromUrl) {
      const tech = technicians.find((item) => item.id === parseInt(techIdFromUrl, 10));
      if (tech) {
        setCurrentTechnician({
          id: tech.id,
          name: tech.name,
          avatarUrl: tech.avatarUrl || null,
        });
      }
    } else if (defaultTechnician) {
      setCurrentTechnician({
        id: defaultTechnician.id,
        name: defaultTechnician.name,
        avatarUrl: defaultTechnician.avatarUrl || null,
      });
    }

    setLoading(false);
  }, [currentConversationId, techIdFromUrl, technicians, defaultTechnician, loadMessagesByConversationId]);

  // WebSocket message listeners
  useEffect(() => {
    if (!socket || !currentConversationId) return;

    const onNewMessage = (data: { message: { id: number; conversationId: number }; conversation: unknown }) => {
      if (data.message.conversationId === currentConversationId) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === data.message.id)) return prev;
          return [...prev, data.message as Message];
        });
      }
    };

    const onRead = (data: { conversationId: number }) => {
      if (data.conversationId === currentConversationId) {
        setMessages((prev) =>
          prev.map((m) =>
            m.senderType === 'client' ? m : { ...m, isRead: true }
          ),
        );
      }
    };

    socket.on('message:new', onNewMessage);
    socket.on('message:read', onRead);

    // Mark conversation as read when opening
    socket.emit('message:read', { conversationId: currentConversationId });

    return () => {
      socket.off('message:new', onNewMessage);
      socket.off('message:read', onRead);
    };
  }, [socket, currentConversationId]);

  // Fallback polling when WebSocket is disconnected
  useEffect(() => {
    if (isConnected || !currentConversationId) return;

    const interval = setInterval(() => {
      loadMessagesByConversationId(currentConversationId, false);
    }, 3000);
    return () => clearInterval(interval);
  }, [isConnected, currentConversationId, loadMessagesByConversationId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const syncConversationAndRoute = async (techId: number) => {
    const convs = await messageService.getConversations();
    setConversations(convs.map((item) => ({ id: item.id, techId: item.technician.id })));
    const latestConversation = convs.find((item) => item.technician.id === techId);
    if (latestConversation && latestConversation.id !== currentConversationId) {
      setCurrentConversationId(latestConversation.id);
      navigate(`/chat/${latestConversation.id}`, { replace: true });
    }
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() || sending || !currentTechnician) {
      return;
    }

    if (socket && isConnected) {
      socket.emit('message:send', {
        conversationId: currentConversationId,
        techId: !currentConversationId ? currentTechnician?.id : undefined,
        messageType: 'text',
        content: inputText,
      });
      const optimisticMsg = {
        id: Date.now(),
        conversationId: currentConversationId ?? 0,
        senderType: 'client' as const,
        senderId: null,
        receiverType: 'technician',
        receiverId: currentTechnician.id,
        messageType: 'text' as const,
        content: inputText,
        imageUrl: null,
        relatedType: null,
        relatedId: null,
        createdAt: new Date().toISOString(),
        isRead: false,
      };
      setMessages((prev) => [...prev, optimisticMsg]);
      setInputText('');
    } else {
      setSending(true);
      try {
        const data = await messageService.sendMessage({
          conversationId: currentConversationId || undefined,
          techId: currentConversationId ? undefined : currentTechnician.id,
          messageType: 'text',
          content: inputText.trim(),
        });

        setInputText('');
        if (data.message) {
          setMessages((prev) => [...prev, data.message]);
        }
        await syncConversationAndRoute(currentTechnician.id);
      } catch (error) {
        console.error('Failed to send message:', error);
        alert('发送失败，请重试');
      } finally {
        setSending(false);
      }
    }
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentTechnician) {
      return;
    }

    setSending(true);
    try {
      const result = await uploadService.uploadImage(file);
      const data = await messageService.sendMessage({
        conversationId: currentConversationId || undefined,
        techId: currentConversationId ? undefined : currentTechnician.id,
        messageType: 'image',
        imageUrl: result.url,
      });

      if (data.message) {
        setMessages((prev) => [...prev, data.message]);
      }
      await syncConversationAndRoute(currentTechnician.id);
    } catch (error) {
      console.error('Failed to send image:', error);
      alert('图片发送失败，请重试');
    } finally {
      setSending(false);
      e.target.value = '';
    }
  };

  const handleSwitchTechnician = (tech: (typeof technicians)[0]) => {
    setCurrentConversationId(null);
    setCurrentTechnician({
      id: tech.id,
      name: tech.name,
      avatarUrl: tech.avatarUrl || null,
    });
    setShowTechSelector(false);
    navigate(`/chat/direct?tech_id=${tech.id}`, { replace: true });
  };

  const groupedMessages = messages.reduce((groups: Record<string, Message[]>, message) => {
    const date = formatDate(message.createdAt);
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(message);
    return groups;
  }, {});

  if (loading) {
    return (
      <div className="min-h-full flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-2 border-[#FF6B8A] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-[linear-gradient(180deg,#FFFDFD_0%,#F8F3F6_46%,#F4F6FB_100%)] flex flex-col">
      <div className="sticky top-0 z-20 border-b border-white/60 bg-white/78 px-5 app-header-safe pb-4 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/chat')}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-white/80 text-slate-700 shadow-[0_10px_24px_rgba(15,23,42,0.08)] ring-1 ring-black/5"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <div className="flex min-w-0 flex-1 items-center gap-3 rounded-[24px] bg-white/82 px-3 py-2 shadow-[0_10px_30px_rgba(15,23,42,0.08)] ring-1 ring-black/5 backdrop-blur">
            <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-[linear-gradient(135deg,#FFE0EA_0%,#F4F7FB_100%)]">
              {currentTechnician?.avatarUrl ? (
                <img src={currentTechnician.avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h1 className="truncate text-base font-semibold text-slate-900">{currentTechnician?.name || '消息详情'}</h1>
                {technicians.length > 1 && (
                  <button
                    onClick={() => setShowTechSelector(true)}
                    className="rounded-full bg-[var(--color-primary-soft)] px-2.5 py-1 text-[11px] font-medium text-[var(--color-primary)]"
                  >
                    切换
                  </button>
                )}
              </div>
              <p className="text-xs text-slate-500">一对一沟通与服务提醒</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-5">
        {messages.length === 0 ? (
          <div className="rounded-[28px] bg-white/88 px-6 py-12 text-center shadow-[0_18px_50px_rgba(15,23,42,0.08)] ring-1 ring-black/5 backdrop-blur">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[linear-gradient(135deg,#FFE2EA_0%,#F4F6FB_100%)]">
              <svg className="h-7 w-7 text-[var(--color-primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5l-1 4 4-1h8a4 4 0 004-4V7a4 4 0 00-4-4H8a4 4 0 00-4 4v4a4 4 0 004 4h1z" />
              </svg>
            </div>
            <h3 className="mt-4 text-lg font-semibold text-slate-900">开始和美甲师沟通</h3>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              {currentTechnician ? `把你的款式灵感、预约想法发给 ${currentTechnician.name}` : '选择一位已绑定的美甲师开始沟通'}
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {Object.entries(groupedMessages).map(([date, dateMessages]) => (
              <div key={date}>
                <div className="mb-4 flex justify-center">
                  <span className="rounded-full bg-white/80 px-3 py-1 text-xs text-slate-400 shadow-[0_10px_20px_rgba(15,23,42,0.06)] ring-1 ring-black/5 backdrop-blur">
                    {date}
                  </span>
                </div>

                <div className="space-y-3">
                  {dateMessages.map((message) => {
                    if (message.messageType === 'system' || message.messageType === 'quote' || message.messageType === 'booking') {
                      return (
                        <div key={message.id} className="flex justify-center">
                          {renderSystemCard(message)}
                        </div>
                      );
                    }

                    const isClient = message.senderType === 'client';

                    return (
                      <div
                        key={message.id}
                        className={`flex ${isClient ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`flex max-w-[82%] items-end gap-2 ${isClient ? 'flex-row-reverse' : 'flex-row'}`}>
                          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/80 ring-1 ring-black/5">
                            {!isClient && currentTechnician?.avatarUrl ? (
                              <img src={currentTechnician.avatarUrl} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                              </svg>
                            )}
                          </div>

                          <div className={`${isClient ? 'bg-[linear-gradient(135deg,#FF6B8A_0%,#FF8FA3_100%)] text-white' : 'bg-white/90 text-slate-900'} rounded-[24px] px-4 py-3 shadow-[0_12px_30px_rgba(15,23,42,0.08)] ring-1 ring-black/5 backdrop-blur`}>
                            {message.messageType === 'image' && message.imageUrl ? (
                              <img
                                src={message.imageUrl}
                                alt="图片"
                                className="max-w-full rounded-2xl cursor-pointer"
                                onClick={() => message.imageUrl && window.open(message.imageUrl, '_blank')}
                              />
                            ) : (
                              <p className="text-sm whitespace-pre-wrap leading-6">{message.content}</p>
                            )}
                            <span className={`mt-1.5 block text-xs ${isClient ? 'text-pink-100' : 'text-slate-400'}`}>
                              {formatTime(message.createdAt)}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {isOtherTyping && (
        <div className="px-4 py-1 text-xs text-gray-400 animate-pulse">
          对方正在输入...
        </div>
      )}

      <div className="border-t border-white/60 bg-white/88 px-4 py-3 safe-area-bottom backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={sending || !currentTechnician}
            className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageSelect}
            className="hidden"
          />

          <div className="flex-1 rounded-full bg-slate-100/90 px-4 shadow-inner">
            <input
              type="text"
              value={inputText}
              onChange={(e) => { setInputText(e.target.value); emitTyping(); }}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder={currentTechnician ? `给${currentTechnician.name}发消息...` : '选择一位美甲师后开始沟通'}
              className="h-11 w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
            />
          </div>

          <button
            onClick={handleSendMessage}
            disabled={!inputText.trim() || sending || !currentTechnician}
            className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full ${
              inputText.trim() && !sending && currentTechnician
                ? 'bg-[linear-gradient(135deg,#FF6B8A_0%,#FF8FA3_100%)] text-white shadow-[0_12px_24px_rgba(255,107,138,0.3)]'
                : 'bg-slate-100 text-slate-400'
            }`}
          >
            {sending ? (
              <div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin"></div>
            ) : (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {showTechSelector && (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-black/35 backdrop-blur-sm sm:items-center"
          onClick={() => setShowTechSelector(false)}
        >
          <div
            className="w-full max-w-md rounded-t-[32px] bg-white p-6 shadow-[0_-20px_50px_rgba(15,23,42,0.18)] sm:rounded-[32px]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">切换会话对象</h3>
              <button
                onClick={() => setShowTechSelector(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100"
              >
                <svg className="h-4 w-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="space-y-2">
              {technicians.map((tech) => (
                <button
                  key={tech.id}
                  onClick={() => handleSwitchTechnician(tech)}
                  className={`flex w-full items-center gap-3 rounded-2xl p-3 ${
                    currentTechnician?.id === tech.id
                      ? 'bg-[linear-gradient(135deg,#FFF1F5_0%,#F8FAFF_100%)] ring-1 ring-[#FF6B8A]/30'
                      : 'bg-slate-50'
                  }`}
                >
                  <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-white">
                    {tech.avatarUrl ? (
                      <img src={tech.avatarUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <svg className="h-6 w-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    )}
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-medium text-slate-900">{tech.name}</p>
                    <p className="text-xs text-slate-500">{tech.city || '服务中'}</p>
                  </div>
                  {currentTechnician?.id === tech.id && (
                    <svg className="h-5 w-5 text-[var(--color-primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const formatTime = (time: string) => dayjs(time).format('HH:mm');

const formatDate = (time: string) => {
  const date = dayjs(time);
  const today = dayjs();
  if (date.isSame(today, 'day')) {
    return '今天';
  }
  if (date.isSame(today.subtract(1, 'day'), 'day')) {
    return '昨天';
  }
  return date.format('MM月DD日');
};

const renderSystemCard = (message: Message) => {
  const map: Record<string, { title: string; accent: string }> = {
    booking: { title: '预约提醒', accent: 'from-[#FF9E6D]/20 to-[#FFD8C4]/30 text-[#9A4B16]' },
    quote: { title: '设计进度', accent: 'from-[#A38CFF]/20 to-[#E0D7FF]/35 text-[#5A46C8]' },
    system: { title: '系统通知', accent: 'from-[#7ED7B9]/20 to-[#D7F6EC]/35 text-[#17785A]' },
  };
  const current = map[message.messageType] || map.system;

  return (
    <div className="max-w-[82%] rounded-[24px] bg-white/80 px-4 py-3 shadow-[0_12px_30px_rgba(15,23,42,0.08)] ring-1 ring-black/5 backdrop-blur">
      <div className={`inline-flex items-center rounded-full bg-gradient-to-r px-3 py-1 text-[11px] font-medium ${current.accent}`}>
        {current.title}
      </div>
      <p className="mt-3 text-sm leading-6 text-slate-700">{message.content || '你有一条新的通知'}</p>
      <span className="mt-2 block text-xs text-slate-400">{formatTime(message.createdAt)}</span>
    </div>
  );
};

export default ChatDetail;
