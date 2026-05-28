import api from './api';

export interface Message {
  id: number;
  conversationId: number;
  senderType: string | null;
  senderId: number | null;
  receiverType: string | null;
  receiverId: number | null;
  messageType: string;
  content: string | null;
  imageUrl: string | null;
  relatedType: string | null;
  relatedId: number | null;
  isRead: boolean;
  createdAt: string;
}

export interface TechnicianInfo {
  id: number;
  name: string;
  avatarUrl: string | null;
}

export interface Conversation {
  id: number;
  technician: TechnicianInfo;
  lastMessage: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
}

export interface CreateMessageDto {
  conversationId?: number;
  techId?: number;
  messageType: 'text' | 'image' | 'system' | 'quote' | 'booking';
  content?: string;
  imageUrl?: string;
  relatedType?: string;
  relatedId?: number;
}

const getApiOrigin = () => {
  const baseURL = import.meta.env.VITE_API_URL || '/api/client';
  if (baseURL.startsWith('http://') || baseURL.startsWith('https://')) {
    return new URL(baseURL).origin;
  }
  return window.location.origin;
};

const toAbsoluteUrl = (url: string | null) => {
  if (!url) {
    return url;
  }
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url;
  }
  return `${getApiOrigin()}${url.startsWith('/') ? url : `/${url}`}`;
};

const mapTechnician = (technician: TechnicianInfo): TechnicianInfo => ({
  ...technician,
  avatarUrl: toAbsoluteUrl(technician.avatarUrl),
});

const mapMessage = (message: Message): Message => ({
  ...message,
  imageUrl: toAbsoluteUrl(message.imageUrl),
});

export const messageService = {
  async getConversations(): Promise<Conversation[]> {
    const response = await api.get('/messages/conversations');
    return response.data.map((conversation: Conversation) => ({
      ...conversation,
      technician: mapTechnician(conversation.technician),
    }));
  },

  async getMessages(conversationId: number): Promise<{ technician: TechnicianInfo | null; messages: Message[] }> {
    const response = await api.get('/messages', {
      params: { conversation_id: conversationId },
    });
    return {
      technician: response.data.technician ? mapTechnician(response.data.technician) : null,
      messages: response.data.messages.map(mapMessage),
    };
  },

  async sendMessage(data: CreateMessageDto): Promise<{ technician: TechnicianInfo | null; message: Message }> {
    const response = await api.post('/messages', data);
    return {
      technician: response.data.technician ? mapTechnician(response.data.technician) : null,
      message: mapMessage(response.data.message),
    };
  },

  async markAsRead(conversationId: number): Promise<void> {
    await api.patch('/messages/read', { conversation_id: conversationId });
  },

  async sendOrderCard(orderId: number): Promise<{ message: Message; conversationId: number }> {
    const response = await api.post('/messages/forward', { orderId });
    return response.data;
  },
};
