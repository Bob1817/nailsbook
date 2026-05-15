import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

export interface SendMessageInput {
  senderType: 'client' | 'technician';
  senderId: number;
  conversationId?: number;
  techId?: number;
  clientId?: number;
  messageType: string;
  content?: string;
  imageUrl?: string;
  relatedType?: string;
  relatedId?: number;
}

@Injectable()
export class ChatService {
  constructor(private prisma: PrismaService) {}

  async sendMessage(input: SendMessageInput) {
    const { senderType, senderId, messageType, content, imageUrl, relatedType, relatedId } = input;

    let conversation: any;

    if (input.conversationId) {
      conversation = await this.prisma.conversation.findUnique({
        where: { id: input.conversationId },
      });
      if (!conversation) {
        throw new BadRequestException('Conversation not found');
      }
    } else {
      const clientId = senderType === 'client' ? senderId : input.clientId;
      const techId = senderType === 'technician' ? senderId : input.techId;

      if (!clientId || !techId) {
        throw new BadRequestException('Must provide conversationId or recipient id');
      }

      conversation = await this.prisma.conversation.findUnique({
        where: { clientId_techId: { clientId, techId } },
      });

      if (!conversation) {
        conversation = await this.prisma.conversation.create({
          data: { clientId, techId },
        });
      }
    }

    const conversationId = conversation.id;
    const receiverType = senderType === 'client' ? 'technician' : 'client';
    const receiverId = senderType === 'client' ? conversation.techId : conversation.clientId;

    const message = await this.prisma.message.create({
      data: {
        conversationId,
        senderType,
        senderId,
        receiverType,
        receiverId,
        messageType,
        content,
        imageUrl,
        relatedType,
        relatedId,
      },
    });

    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: {
        lastMessage: messageType === 'image' ? '[图片]' : content?.slice(0, 100) || '',
        lastMessageAt: new Date(),
      },
    });

    return { message, conversation };
  }

  async markAsRead(conversationId: number, receiverType: string, receiverId: number) {
    await this.prisma.message.updateMany({
      where: { conversationId, receiverType, receiverId, isRead: false },
      data: { isRead: true },
    });
  }

  async getConversation(conversationId: number) {
    return this.prisma.conversation.findUnique({
      where: { id: conversationId },
    });
  }

  async getUserConversationIds(userId: number, userType: 'client' | 'technician') {
    const where = userType === 'client' ? { clientId: userId } : { techId: userId };
    const conversations = await this.prisma.conversation.findMany({
      where,
      select: { id: true },
    });
    return conversations.map((c) => c.id);
  }
}
