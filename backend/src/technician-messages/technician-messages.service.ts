import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateTechnicianMessageDto } from './dto/create-technician-message.dto';

const ALLOWED_MESSAGE_TYPES = new Set([
  'text',
  'image',
  'system',
  'quote',
  'booking',
  'order_card',
]);

@Injectable()
export class TechnicianMessagesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(technicianId: number, conversationId: number) {
    const conversation = await this.findOwnedConversation(
      technicianId,
      conversationId,
    );

    const messages = await this.prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
    });

    // Get client info for this conversation
    const client = await this.prisma.clientUser.findUnique({
      where: { id: conversation.clientId },
      select: {
        id: true,
        nickname: true,
        avatarUrl: true,
      },
    });

    return {
      client: client || null,
      messages: messages.map((message) => this.mapMessage(message)),
    };
  }

  async getConversations(technicianId: number) {
    const conversations = await this.prisma.conversation.findMany({
      where: { techId: technicianId },
      include: {
        client: {
          select: {
            id: true,
            nickname: true,
            avatarUrl: true,
            phone: true,
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
        receiverType: 'technician',
        receiverId: technicianId,
        isRead: false,
      },
      _count: { id: true },
    });
    const unreadMap = new Map(
      unreadCounts.map((u) => [u.conversationId, u._count.id]),
    );

    return conversations.map((conv) => ({
      id: conv.id,
      client: conv.client,
      lastMessage: conv.lastMessage,
      lastMessageAt: conv.lastMessageAt,
      unreadCount: unreadMap.get(conv.id) ?? 0,
    }));
  }

  async markAsRead(technicianId: number, conversationId: number) {
    await this.findOwnedConversation(technicianId, conversationId);

    const result = await this.prisma.message.updateMany({
      where: {
        conversationId,
        receiverType: 'technician',
        receiverId: technicianId,
        isRead: false,
      },
      data: { isRead: true },
    });

    return { updated: result.count };
  }

  async forward(technicianId: number, orderId: number) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, technicianId: true, clientUserId: true, orderNo: true, serviceType: true, startTime: true, status: true },
    });
    if (!order) {
      throw new NotFoundException('预约不存在');
    }
    if (order.technicianId !== technicianId) {
      throw new BadRequestException('无权操作该预约');
    }
    if (!order.clientUserId) {
      throw new BadRequestException('该预约客户未注册，无法发送');
    }

    const preview = `[预约卡片] ${order.orderNo}`;
    const conversation = await this.prisma.conversation.upsert({
      where: {
        clientId_techId: {
          clientId: order.clientUserId,
          techId: technicianId,
        },
      },
      update: { lastMessage: preview, lastMessageAt: new Date() },
      create: { clientId: order.clientUserId, techId: technicianId, lastMessage: preview, lastMessageAt: new Date() },
    });

    const message = await this.prisma.message.create({
      data: {
        conversationId: conversation.id,
        senderType: 'technician',
        senderId: technicianId,
        receiverType: 'client',
        receiverId: order.clientUserId,
        messageType: 'order_card',
        content: preview,
        relatedType: 'order',
        relatedId: orderId,
      },
    });

    return { message: this.mapMessage(message), conversationId: conversation.id };
  }

  async create(technicianId: number, dto: CreateTechnicianMessageDto) {
    this.assertMessageType(dto.messageType);

    let conversation;

    if (dto.conversationId) {
      conversation = await this.findOwnedConversation(
        technicianId,
        dto.conversationId,
      );
    } else if (dto.clientId) {
      // Verify this client is bound to this technician
      const binding = await this.prisma.clientTechBinding.findFirst({
        where: {
          clientId: dto.clientId,
          techId: technicianId,
          status: 'active',
        },
      });

      if (!binding) {
        throw new NotFoundException('该客户未绑定您');
      }

      const preview = dto.content ?? dto.imageUrl ?? dto.messageType;
      conversation = await this.prisma.conversation.upsert({
        where: {
          clientId_techId: {
            clientId: dto.clientId,
            techId: technicianId,
          },
        },
        update: {
          lastMessage: preview,
          lastMessageAt: new Date(),
        },
        create: {
          clientId: dto.clientId,
          techId: technicianId,
          lastMessage: preview,
          lastMessageAt: new Date(),
        },
      });
    } else {
      throw new BadRequestException('需要提供 conversationId 或 clientId');
    }

    const message = await this.prisma.message.create({
      data: {
        conversationId: conversation.id,
        senderType: 'technician',
        senderId: technicianId,
        receiverType: 'client',
        receiverId: conversation.clientId,
        messageType: dto.messageType,
        content: dto.content ?? null,
        imageUrl: dto.imageUrl ?? null,
        relatedType: dto.relatedType ?? null,
        relatedId: dto.relatedId ?? null,
      },
    });

    // Get client info
    const client = await this.prisma.clientUser.findUnique({
      where: { id: conversation.clientId },
      select: {
        id: true,
        nickname: true,
        avatarUrl: true,
      },
    });

    return {
      client,
      message: this.mapMessage(message),
    };
  }

  private async findOwnedConversation(
    technicianId: number,
    conversationId: number,
  ) {
    const conversation = await this.prisma.conversation.findFirst({
      where: {
        id: conversationId,
        techId: technicianId,
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
