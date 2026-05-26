import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../components/feedback/ToastProvider';
import { messageService, type Message, type ClientInfo } from '../services/message';
import { customersService } from '../services/customers';
import { formatClock, formatRelativeDateLabel } from '../services/technicianData';
import { useSocket } from '../hooks/useSocket';
import { useTyping } from '../hooks/useTyping';

const ChatPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { technician } = useAuth();
  const toast = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentClient, setCurrentClient] = useState<ClientInfo | null>(null);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [conversations, setConversations] = useState<Array<{ id: number; client: ClientInfo }>>([]);
  const [showClientSelector, setShowClientSelector] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showSocialShare, setShowSocialShare] = useState(false);

  const conversationIdFromUrl = searchParams.get('conversation_id');
  const clientIdFromUrl = searchParams.get('client_id');

  const { socket, isConnected } = useSocket();
  const convId = conversationIdFromUrl ? Number(conversationIdFromUrl) : null;
  const { isOtherTyping, emitTyping } = useTyping(socket, convId);

  // Load conversations list
  useEffect(() => {
    loadConversations();
  }, []);

  // Set current client from URL or default
  useEffect(() => {
    if (conversationIdFromUrl) {
      const convId = parseInt(conversationIdFromUrl);
      loadMessages(convId);
    } else if (clientIdFromUrl) {
      const clientId = parseInt(clientIdFromUrl);
      // Find client from customers
      customersService.getById(clientId).then((customer) => {
        if (customer) {
          setCurrentClient({
            id: customer.id,
            nickname: customer.name,
            avatarUrl: null,
            phone: customer.phone,
          });
        }
      });
    }
  }, [conversationIdFromUrl, clientIdFromUrl]);

  // WebSocket listeners for real-time messages
  useEffect(() => {
    if (!socket || !convId) return;

    const onNewMessage = (data: { message: any; conversation: any }) => {
      if (data.message.conversationId === convId) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === data.message.id)) return prev;
          return [...prev, data.message];
        });
      }
    };

    const onRead = (data: { conversationId: number }) => {
      if (data.conversationId === convId) {
        setMessages((prev) =>
          prev.map((m) =>
            m.senderType === 'technician' ? m : { ...m, isRead: true }
          ),
        );
      }
    };

    socket.on('message:new', onNewMessage);
    socket.on('message:read', onRead);

    socket.emit('message:read', { conversationId: convId });

    return () => {
      socket.off('message:new', onNewMessage);
      socket.off('message:read', onRead);
    };
  }, [socket, convId]);

  // Fallback polling when disconnected
  useEffect(() => {
    if (isConnected || !convId) return;

    const interval = setInterval(() => {
      refreshMessages(convId);
    }, 3000);

    return () => clearInterval(interval);
  }, [isConnected, convId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadConversations = async () => {
    try {
      const data = await messageService.getConversations();
      setConversations(data.map((conv) => ({ id: conv.id, client: conv.client })));
    } catch (error) {
      console.error('Failed to load conversations:', error);
    }
  };

  const loadMessages = async (conversationId: number, showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const data = await messageService.getMessages(conversationId);
      setMessages(prev => {
        // Only update if messages changed
        if (JSON.stringify(prev) !== JSON.stringify(data.messages)) {
          return data.messages;
        }
        return prev;
      });
      if (data.client) {
        setCurrentClient(data.client);
      }
      messageService.markAsRead(conversationId).catch(() => {});
    } catch (error) {
      console.error('Failed to load messages:', error);
      if (showLoading) toast.error('加载消息失败');
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const refreshMessages = async (conversationId: number) => {
    try {
      const data = await messageService.getMessages(conversationId);
      setMessages(prev => {
        // Only update if messages changed
        if (JSON.stringify(prev) !== JSON.stringify(data.messages)) {
          return data.messages;
        }
        return prev;
      });
    } catch (error) {
      console.error('Failed to refresh messages:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() || sending || !currentClient) return;

    if (socket && isConnected) {
      socket.emit('message:send', {
        conversationId: convId,
        clientId: !convId ? currentClient.id : undefined,
        messageType: 'text',
        content: inputText.trim(),
      });
      const optimisticMsg: Message = {
        id: Date.now(),
        conversationId: convId ?? 0,
        senderType: 'technician',
        senderId: technician?.id ?? null,
        receiverType: 'client',
        receiverId: currentClient.id,
        messageType: 'text',
        content: inputText.trim(),
        imageUrl: null,
        relatedType: null,
        relatedId: null,
        createdAt: new Date().toISOString(),
        isRead: false,
      };
      setMessages((prev) => [...prev, optimisticMsg]);
      setInputText('');
      loadConversations();
    } else {
      setSending(true);
      try {
        const data = await messageService.sendMessage({
          clientId: currentClient.id,
          messageType: 'text',
          content: inputText.trim(),
        });
        setInputText('');
        if (data.message) {
          setMessages((prev) => [...prev, data.message]);
        }
        loadConversations();
      } catch (error) {
        console.error('Failed to send message:', error);
        toast.error('发送失败，请重试');
      } finally {
        setSending(false);
      }
    }
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentClient) return;

    // Upload image first (using a simple approach)
    setSending(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/client/upload/image`,
        {
          method: 'POST',
          body: formData,
          headers: {
            Authorization: `Bearer ${localStorage.getItem('technician_token') || ''}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const result = await response.json();

      const data = await messageService.sendMessage({
        clientId: currentClient.id,
        messageType: 'image',
        imageUrl: result.url,
      });
      if (data.message) {
        setMessages((prev) => [...prev, data.message]);
      }
      loadConversations();
    } catch (error) {
      console.error('Failed to send image:', error);
      toast.error('图片发送失败，请重试');
    } finally {
      setSending(false);
    }
  };

  const handleSendSocialMedia = async (platform: string, url: string) => {
    if (!currentClient) return;

    const platformNames: Record<string, string> = {
      weibo: '微博',
      xiaohongshu: '小红书',
      douyin: '抖音',
      kuaishou: '快手',
      wechat: '微信',
    };

    setSending(true);
    try {
      const data = await messageService.sendMessage({
        clientId: currentClient.id,
        messageType: 'social_media',
        content: JSON.stringify({ platform, url, name: platformNames[platform] }),
      });
      if (data.message) {
        setMessages((prev) => [...prev, data.message]);
      }
      setShowSocialShare(false);
      loadConversations();
    } catch (error) {
      console.error('Failed to send social media:', error);
      toast.error('发送失败，请重试');
    } finally {
      setSending(false);
    }
  };

  const handleSwitchClient = (client: ClientInfo) => {
    setCurrentClient(client);
    setShowClientSelector(false);
    // Find conversation for this client
    const conv = conversations.find((c) => c.client.id === client.id);
    if (conv) {
      loadMessages(conv.id);
      // Update URL
      navigate(`/chat?conversation_id=${conv.id}`, { replace: true });
    } else {
      // No conversation yet, clear messages
      setMessages([]);
      navigate(`/chat?client_id=${client.id}`, { replace: true });
    }
  };

  // Group messages by date
  const groupedMessages = messages.reduce((groups: Record<string, Message[]>, message) => {
    const date = formatRelativeDateLabel(message.createdAt);
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(message);
    return groups;
  }, {});

  if (loading && !currentClient) {
    return (
      <div className="min-h-full flex items-center justify-center bg-[#fff9f8]">
        <div className="w-8 h-8 border-2 border-pink-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[100dvh] flex-col bg-[#fff9f8]">
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center gap-3 bg-white/95 px-5 py-3.5 backdrop-blur border-b border-[#f2e6ec]">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#f7f3f5] transition-colors active:bg-[#eee5e9]"
        >
          <svg className="h-5 w-5 text-[#3c3440]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-9 h-9 shrink-0 rounded-full bg-pink-50 flex items-center justify-center overflow-hidden">
            {currentClient?.avatarUrl ? (
              <img src={currentClient.avatarUrl} alt="avatar" className="w-full h-full object-cover" />
            ) : (
              <span className="text-pink-500 font-semibold text-[14px]">
                {(currentClient?.nickname || currentClient?.phone || '?').charAt(0)}
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-[15px] font-semibold text-[#1f2230] truncate">
                {currentClient?.nickname || currentClient?.phone || '客户'}
              </h1>
              {conversations.length > 0 && (
                <button
                  onClick={() => setShowClientSelector(true)}
                  className="shrink-0 text-[12px] text-pink-500 bg-pink-50 px-2 py-0.5 rounded-full"
                >
                  切换
                </button>
              )}
            </div>
            <p className="text-[12px] text-gray-400">在线</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 pb-28 space-y-4">
        {Object.entries(groupedMessages).map(([date, dateMessages]) => (
          <div key={date}>
            {/* Date Separator */}
            <div className="flex justify-center mb-4">
              <span className="text-xs text-gray-400 bg-gray-200 px-3 py-1 rounded-full">
                {date}
              </span>
            </div>

            {/* Messages for this date */}
            <div className="space-y-3">
              {dateMessages.map((message) => {
                const isTechnician = message.senderType === 'technician';
                const isSystem = message.senderType === 'system' ||
                  ['system', 'booking', 'quote', 'order'].includes(message.messageType);
                const isOrderRelated = message.relatedType === 'order' && message.relatedId;

                if (isSystem) {
                  const titleMap: Record<string, string> = {
                    booking: '预约提醒',
                    quote: '美甲师报价',
                    order: '预约动态',
                    system: '系统通知',
                  };
                  return (
                    <div
                      key={message.id}
                      className="flex justify-center"
                      onClick={() => {
                        if (isOrderRelated) navigate(`/orders/${message.relatedId}`);
                      }}
                      style={{ cursor: isOrderRelated ? 'pointer' : 'default' }}
                    >
                      <div className="max-w-[82%] rounded-2xl bg-white px-4 py-3 shadow-sm ring-1 ring-black/5">
                        <div className="inline-flex items-center rounded-full bg-pink-50 px-3 py-1 text-[11px] font-medium text-pink-600">
                          {titleMap[message.messageType] || '系统通知'}
                        </div>
                        <p className="mt-2 text-sm leading-6 text-gray-700">{message.content}</p>
                        {isOrderRelated && (
                          <p className="mt-2 text-xs font-medium text-pink-500">查看预约 →</p>
                        )}
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={message.id}
                    className={`flex ${isTechnician ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[75%] ${isTechnician ? 'flex-row-reverse' : 'flex-row'} flex items-end gap-2`}>
                      {/* Avatar */}
                      <div className="w-8 h-8 rounded-full bg-gray-200 flex-shrink-0 flex items-center justify-center overflow-hidden">
                        {!isTechnician ? (
                          <span className="text-xs text-gray-500">
                            {(currentClient?.nickname || currentClient?.phone || '?').charAt(0)}
                          </span>
                        ) : technician?.avatar ? (
                          <img src={technician.avatar} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-xs text-gray-500">我</span>
                        )}
                      </div>

                      {/* Message Content */}
                      <div className={`${isTechnician ? 'bg-pink-500 text-white' : 'bg-white text-gray-900'} rounded-2xl px-4 py-2.5 shadow-sm`}>
                        {message.messageType === 'image' && message.imageUrl ? (
                          <img
                            src={message.imageUrl}
                            alt="图片"
                            className="max-w-full rounded-lg cursor-pointer"
                            onClick={() => message.imageUrl && window.open(message.imageUrl, '_blank')}
                          />
                        ) : message.messageType === 'social_media' ? (
                          (() => {
                            try {
                              const socialData = JSON.parse(message.content || '{}');
                              const platformIcons: Record<string, string> = {
                                weibo: '🔴',
                                xiaohongshu: '📕',
                                douyin: '🎵',
                                kuaishou: '📱',
                                wechat: '💬',
                              };
                              return (
                                <a
                                  href={socialData.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-2 text-sm"
                                >
                                  <span className="text-lg">{platformIcons[socialData.platform] || '🔗'}</span>
                                  <span className="flex-1">{socialData.name}主页</span>
                                  <svg className="w-4 h-4 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                  </svg>
                                </a>
                              );
                            } catch {
                              return <p className="text-sm whitespace-pre-wrap">{message.content}</p>;
                            }
                          })()
                        ) : (
                          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                        )}
                        <span className={`text-xs mt-1 block ${isTechnician ? 'text-pink-100' : 'text-gray-400'}`}>
                          {formatClock(message.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Typing indicator */}
      {isOtherTyping && (
        <div className="px-4 py-1 text-xs text-gray-400 animate-pulse">
          对方正在输入...
        </div>
      )}

      {/* Input Area */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-gray-100 bg-white p-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] shadow-[0_-6px_18px_rgba(29,35,53,0.06)]">
        <div className="mx-auto flex max-w-[32rem] items-center gap-3">
          {/* Image Button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={sending}
            className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 active:bg-gray-200"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageSelect}
            className="hidden"
          />

          {/* Social Share Button */}
          <button
            onClick={() => setShowSocialShare(true)}
            disabled={sending || !currentClient}
            className="w-10 h-10 rounded-full bg-pink-50 flex items-center justify-center flex-shrink-0 active:bg-pink-100"
          >
            <svg className="w-5 h-5 text-pink-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
          </button>

          {/* Text Input */}
          <div className="flex-1 relative">
            <input
              type="text"
              value={inputText}
              onChange={(e) => { setInputText(e.target.value); emitTyping(); }}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder={currentClient ? `给${currentClient.nickname || '客户'}发消息...` : '输入消息...'}
              className="w-full px-4 py-2.5 bg-gray-100 rounded-full text-sm text-gray-900 outline-none focus:ring-2 focus:ring-pink-500/20"
            />
          </div>

          {/* Send Button */}
          <button
            onClick={handleSendMessage}
            disabled={!inputText.trim() || sending || !currentClient}
            className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
              inputText.trim() && !sending && currentClient
                ? 'bg-pink-500 text-white'
                : 'bg-gray-100 text-gray-400'
            }`}
          >
            {sending ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Social Media Share Modal */}
      {showSocialShare && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 sm:items-center">
          <div className="w-full max-w-md rounded-t-3xl bg-white p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] animate-slide-up sm:rounded-3xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">分享社交媒体</h3>
              <button
                onClick={() => setShowSocialShare(false)}
                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center"
              >
                <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="space-y-3">
              {technician?.socialMedia && Object.entries(technician.socialMedia).some(([_, value]) => value) ? (
                <>
                  <p className="text-sm text-gray-500 mb-3">选择要分享的社交媒体账号：</p>
                  {technician.socialMedia.weibo && (
                    <button
                      onClick={() => handleSendSocialMedia('weibo', technician.socialMedia!.weibo!)}
                      className="w-full flex items-center gap-3 p-4 rounded-xl bg-red-50 hover:bg-red-100 transition-colors"
                    >
                      <span className="text-2xl">🔴</span>
                      <div className="flex-1 text-left">
                        <p className="font-medium text-gray-900">微博</p>
                        <p className="text-sm text-gray-500 truncate">{technician.socialMedia.weibo}</p>
                      </div>
                      <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  )}
                  {technician.socialMedia.xiaohongshu && (
                    <button
                      onClick={() => handleSendSocialMedia('xiaohongshu', technician.socialMedia!.xiaohongshu!)}
                      className="w-full flex items-center gap-3 p-4 rounded-xl bg-red-50 hover:bg-red-100 transition-colors"
                    >
                      <span className="text-2xl">📕</span>
                      <div className="flex-1 text-left">
                        <p className="font-medium text-gray-900">小红书</p>
                        <p className="text-sm text-gray-500 truncate">{technician.socialMedia.xiaohongshu}</p>
                      </div>
                      <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  )}
                  {technician.socialMedia.douyin && (
                    <button
                      onClick={() => handleSendSocialMedia('douyin', technician.socialMedia!.douyin!)}
                      className="w-full flex items-center gap-3 p-4 rounded-xl bg-gray-900 hover:bg-gray-800 transition-colors"
                    >
                      <span className="text-2xl">🎵</span>
                      <div className="flex-1 text-left">
                        <p className="font-medium text-white">抖音</p>
                        <p className="text-sm text-gray-300 truncate">{technician.socialMedia.douyin}</p>
                      </div>
                      <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  )}
                  {technician.socialMedia.kuaishou && (
                    <button
                      onClick={() => handleSendSocialMedia('kuaishou', technician.socialMedia!.kuaishou!)}
                      className="w-full flex items-center gap-3 p-4 rounded-xl bg-orange-50 hover:bg-orange-100 transition-colors"
                    >
                      <span className="text-2xl">📱</span>
                      <div className="flex-1 text-left">
                        <p className="font-medium text-gray-900">快手</p>
                        <p className="text-sm text-gray-500 truncate">{technician.socialMedia.kuaishou}</p>
                      </div>
                      <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  )}
                  {technician.socialMedia.wechat && (
                    <button
                      onClick={() => handleSendSocialMedia('wechat', technician.socialMedia!.wechat!)}
                      className="w-full flex items-center gap-3 p-4 rounded-xl bg-green-50 hover:bg-green-100 transition-colors"
                    >
                      <span className="text-2xl">💬</span>
                      <div className="flex-1 text-left">
                        <p className="font-medium text-gray-900">微信</p>
                        <p className="text-sm text-gray-500 truncate">{technician.socialMedia.wechat}</p>
                      </div>
                      <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  )}
                </>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500 mb-4">您还没有设置社交媒体账号</p>
                  <button
                    onClick={() => {
                      setShowSocialShare(false);
                      navigate('/profile-settings');
                    }}
                    className="px-6 py-2 bg-pink-500 text-white rounded-full text-sm font-medium"
                  >
                    去设置
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Client Selector Modal */}
      {showClientSelector && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 sm:items-center">
          <div className="w-full max-w-md rounded-t-3xl bg-white p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] animate-slide-up sm:rounded-3xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">选择客户</h3>
              <button
                onClick={() => setShowClientSelector(false)}
                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center"
              >
                <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {conversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => handleSwitchClient(conv.client)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl ${
                    currentClient?.id === conv.client.id ? 'bg-pink-50 border border-pink-500' : 'bg-gray-50'
                  }`}
                >
                  <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center overflow-hidden">
                    {conv.client.avatarUrl ? (
                      <img src={conv.client.avatarUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-lg text-gray-400">
                        {(conv.client.nickname || conv.client.phone || '?').charAt(0)}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-medium text-gray-900">{conv.client.nickname || conv.client.phone || '未知客户'}</p>
                    <p className="text-sm text-gray-500">{conv.client.phone || ''}</p>
                  </div>
                  {currentClient?.id === conv.client.id && (
                    <svg className="w-5 h-5 text-pink-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
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

export default ChatPage;
