import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateClientMessageDto } from './dto/create-client-message.dto';

const ALLOWED_MESSAGE_TYPES = new Set(['text', 'image', 'system', 'quote', 'booking']);

@Injectable()
export class ClientMessagesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(clientUserId: number, conversationId: number) {
    const conversation = await this.findOwnedConversation(clientUserId, conversationId);

    const messages = await this.prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
    });

    // Get technician info for this conversation
    const technician = await this.prisma.technician.findUnique({
      where: { id: conversation.techId },
      select: {
        id: true,
        name: true,
        avatarUrl: true,
      },
    });

    return {
      technician: technician || null,
      messages: messages.map((message) => this.mapMessage(message)),
    };
  }

  async getConversations(clientUserId: number) {
    const conversations = await this.prisma.conversation.findMany({
      where: { clientId: clientUserId },
      include: {
        technician: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            status: true,
          },
        },
      },
      orderBy: { lastMessageAt: 'desc' },
    });

    const conversationIds = conversations.map((c) => c.id);
    const unreadCounts = await this.prisma.message.groupBy({
      by: ['conversationId'],
      where: {
        conversationId: { in: conversationIds },
        receiverType: 'client',
        receiverId: clientUserId,
        isRead: false,
      },
      _count: { id: true },
    });
    const unreadMap = new Map(unreadCounts.map((u) => [u.conversationId, u._count.id]));

    return conversations.map((conv) => ({
      id: conv.id,
      technician: conv.technician,
      lastMessage: conv.lastMessage,
      lastMessageAt: conv.lastMessageAt,
      unreadCount: unreadMap.get(conv.id) ?? 0,
    }));
  }

  async markAsRead(clientUserId: number, conversationId: number) {
    await this.findOwnedConversation(clientUserId, conversationId);

    const result = await this.prisma.message.updateMany({
      where: {
        conversationId,
        receiverType: 'client',
        receiverId: clientUserId,
        isRead: false,
      },
      data: { isRead: true },
    });

    return { updated: result.count };
  }

  async create(clientUserId: number, dto: CreateClientMessageDto) {
    this.assertMessageType(dto.messageType);

    let conversation;

    if (dto.conversationId) {
      conversation = await this.findOwnedConversation(clientUserId, dto.conversationId);
    } else if (dto.techId) {
      // Create or find conversation with specific technician
      const binding = await this.prisma.clientTechBinding.findFirst({
        where: {
          clientId: clientUserId,
          techId: dto.techId,
          status: 'active',
        },
      });

      if (!binding) {
        throw new NotFoundException('您未绑定该美甲师');
      }

      const preview = dto.content ?? dto.imageUrl ?? dto.messageType;
      conversation = await this.prisma.conversation.upsert({
        where: {
          clientId_techId: {
            clientId: clientUserId,
            techId: dto.techId,
          },
        },
        update: {
          lastMessage: preview,
          lastMessageAt: new Date(),
        },
        create: {
          clientId: clientUserId,
          techId: dto.techId,
          lastMessage: preview,
          lastMessageAt: new Date(),
        },
      });
    } else {
      throw new BadRequestException('需要提供 conversationId 或 techId');
    }

    const message = await this.prisma.message.create({
      data: {
        conversationId: conversation.id,
        senderType: 'client',
        senderId: clientUserId,
        receiverType: 'technician',
        receiverId: conversation.techId,
        messageType: dto.messageType,
        content: dto.content ?? null,
        imageUrl: dto.imageUrl ?? null,
        relatedType: dto.relatedType ?? null,
        relatedId: dto.relatedId ?? null,
      },
    });

    // Get technician info
    const technician = await this.prisma.technician.findUnique({
      where: { id: conversation.techId },
      select: {
        id: true,
        name: true,
        avatarUrl: true,
      },
    });

    return {
      technician,
      message: this.mapMessage(message),
    };
  }

  private async findOwnedConversation(clientUserId: number, conversationId: number) {
    const conversation = await this.prisma.conversation.findFirst({
      where: {
        id: conversationId,
        clientId: clientUserId,
      },
    });

    if (!conversation) {
      throw new NotFoundException('会话不存在');
    }

    return conversation;
  }

  private assertMessageType(messageType: string) {
    if (!ALLOWED_MESSAGE_TYPES.has(messageType)) {
      throw new BadRequestException('消息类型不支持');
    }
  }

  private mapMessage(message: any) {
    return {
      id: message.id,
      conversationId: message.conversationId,
      senderType: message.senderType ?? null,
      senderId: message.senderId ?? null,
      receiverType: message.receiverType ?? null,
      receiverId: message.receiverId ?? null,
      messageType: message.messageType ?? null,
      content: message.content ?? null,
      imageUrl: message.imageUrl ?? null,
      relatedType: message.relatedType ?? null,
      relatedId: message.relatedId ?? null,
      isRead: message.isRead,
      createdAt: message.createdAt,
    };
  }
}
