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

export interface ClientInfo {
  id: number;
  nickname: string | null;
  avatarUrl: string | null;
  phone: string | null;
}

export interface Conversation {
  id: number;
  client: ClientInfo;
  lastMessage: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
}

export interface CreateMessageDto {
  conversationId?: number;
  clientId?: number;
  messageType: 'text' | 'image' | 'system' | 'quote' | 'booking' | 'social_media';
  content?: string;
  imageUrl?: string;
  relatedType?: string;
  relatedId?: number;
}

export const messageService = {
  async getConversations(): Promise<Conversation[]> {
    const response = await api.get('/messages/conversations');
    return response.data;
  },

  async getMessages(conversationId: number): Promise<{ client: ClientInfo | null; messages: Message[] }> {
    const response = await api.get('/messages', {
      params: { conversation_id: conversationId },
    });
    return response.data;
  },

  async sendMessage(data: CreateMessageDto): Promise<{ client: ClientInfo | null; message: Message }> {
    const response = await api.post('/messages', data);
    return response.data;
  },

  async markAsRead(conversationId: number): Promise<void> {
    await api.patch('/messages/read', { conversation_id: conversationId });
  },
};
