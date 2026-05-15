import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { ChatGateway } from '../chat/chat.gateway';
import * as crypto from 'crypto';
import { CreateTechnicianOrderDto } from './dto/create-technician-order.dto';
import { ReviewOrderDto } from './dto/review-order.dto';

const VALID_ORDER_STATUSES = [
  'pending_quote',
  'pending_agree',
  'pending_confirm',
  'pending_home',
  'pending_shop',
  'in_progress',
  'completed',
  'cancelled',
] as const;

type OrderStatus = (typeof VALID_ORDER_STATUSES)[number];

const STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending_quote: ['pending_agree', 'cancelled'],
  pending_agree: ['pending_confirm', 'pending_quote', 'cancelled'],
  pending_confirm: ['pending_home', 'pending_shop', 'cancelled'],
  pending_home: ['in_progress'],
  pending_shop: ['in_progress'],
  in_progress: ['completed'],
  completed: [],
  cancelled: [],
};

function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return STATUS_TRANSITIONS[from]?.includes(to) ?? false;
}

@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private chatGateway: ChatGateway,
  ) {}

  async createForTechnician(technicianId: number, dto: CreateTechnicianOrderDto) {
    const customer = await this.prisma.customer.findUnique({
      where: { id: dto.customerId },
    });

    if (!customer) {
      throw new NotFoundException('客户不存在');
    }

    if (customer.technicianId !== technicianId) {
      throw new ForbiddenException('无权为该客户创建订单');
    }

    return this.prisma.order.create({
      data: {
        orderNo: this.generateOrderNo(),
        technicianId,
        customerId: customer.id,
        clientUserId: customer.clientUserId ?? null,
        startTime: new Date(dto.startTime),
        endTime: new Date(dto.endTime),
        address: dto.address,
        serviceType: dto.serviceType || null,
        status: 'pending_quote',
        remark: dto.note || dto.serviceName || null,
      },
      include: {
        technician: { select: { id: true, name: true, phone: true } },
        customer: { select: { id: true, name: true, phone: true, avatarUrl: true } },
      },
    });
  }

  async findAll(page: number = 1, limit: number = 20, technicianId?: number, customerId?: number, status?: string) {
    const where: any = {};

    if (technicianId) where.technicianId = technicianId;
    if (customerId) where.customerId = customerId;
    if (status) where.status = status;

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          technician: { select: { id: true, name: true, phone: true } },
          customer: { select: { id: true, name: true, phone: true, avatarUrl: true } },
        },
        orderBy: { startTime: 'desc' },
      }),
      this.prisma.order.count({ where }),
    ]);

    return {
      data: orders,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findTrips(technicianId: number) {
    return this.prisma.order.findMany({
      where: {
        technicianId,
        status: { in: ['pending_home', 'pending_shop', 'in_progress'] },
      },
      include: {
        technician: { select: { id: true, name: true, phone: true } },
        customer: { select: { id: true, name: true, phone: true, avatarUrl: true } },
      },
      orderBy: { startTime: 'asc' },
    });
  }

  async findOne(id: number) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        technician: { select: { id: true, name: true, phone: true } },
        customer: { select: { id: true, name: true, phone: true, avatarUrl: true } },
        revenue: true,
        designRequest: {
          select: { id: true, title: true, images: true, description: true },
        },
        customServiceRequest: {
          select: { id: true, title: true, images: true, description: true, referenceWorkIds: true },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('订单不存在');
    }

    return order;
  }

  async findOneForTechnician(id: number, technicianId: number) {
    const order = await this.findOne(id);

    if (order.technicianId !== technicianId) {
      throw new ForbiddenException('无权访问该订单');
    }

    return order;
  }

  async review(id: number, technicianId: number, dto: ReviewOrderDto) {
    const order = await this.findOneForTechnician(id, technicianId);

    if (!canTransition(order.status as OrderStatus, 'pending_agree')) {
      throw new BadRequestException('当前订单状态不支持报价');
    }

    const startTime = new Date(`${dto.serviceDate}T${dto.startTime}:00`);
    const endTime = new Date(startTime.getTime() + Number(dto.durationMinutes) * 60000);

    if (Number.isNaN(startTime.getTime()) || Number.isNaN(endTime.getTime()) || Number(dto.durationMinutes) <= 0) {
      throw new BadRequestException('预约时间或预估时长无效');
    }

    await this.assertOrderConflict(technicianId, startTime, endTime, order.id);

    let systemMessage: any = null;
    let conversationId: number | null = null;

    const updated = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.order.update({
        where: { id },
        data: {
          startTime,
          endTime,
          quotePrice: dto.price,
          quoteRemark: dto.remark || null,
          quotedAt: new Date(),
          status: 'pending_agree',
        },
        include: {
          technician: { select: { id: true, name: true, phone: true } },
          customer: { select: { id: true, name: true, phone: true, avatarUrl: true } },
        },
      });

      if (order.clientUserId) {
        const preview = '美甲师已提交报价，请查看并确认～';
        const conversation = await tx.conversation.upsert({
          where: {
            clientId_techId: {
              clientId: order.clientUserId,
              techId: technicianId,
            },
          },
          update: { lastMessage: preview, lastMessageAt: new Date() },
          create: {
            clientId: order.clientUserId,
            techId: technicianId,
            lastMessage: preview,
            lastMessageAt: new Date(),
          },
        });

        conversationId = conversation.id;

        systemMessage = await tx.message.create({
          data: {
            conversationId: conversation.id,
            senderType: 'system',
            senderId: 0,
            receiverType: 'client',
            receiverId: order.clientUserId,
            messageType: 'system',
            content: preview,
            relatedType: 'order',
            relatedId: order.id,
          },
        });
      }

      return updated;
    });

    if (systemMessage && conversationId) {
      try {
        const updatedConversation = await this.prisma.conversation.findUnique({
          where: { id: conversationId },
        });
        this.chatGateway.server.to(`conversation:${conversationId}`).emit('message:new', {
          message: systemMessage,
          conversation: updatedConversation,
        });
      } catch (e) {
        console.error('[OrdersService] Failed to push notification via WebSocket:', e);
      }
    }

    return updated;
  }

  async confirm(id: number, depositConfirmed?: boolean) {
    const order = await this.findOne(id);

    if (!canTransition(order.status as OrderStatus, 'pending_home') &&
        !canTransition(order.status as OrderStatus, 'pending_shop')) {
      throw new BadRequestException('当前订单状态不支持确认');
    }

    if (!order.isDepositPaid && !depositConfirmed) {
      throw new BadRequestException('请先确认用户已缴纳定金');
    }

    const targetStatus: OrderStatus = order.serviceType === '上门美甲' ? 'pending_home' : 'pending_shop';

    let systemMessage: any = null;
    let conversationId: number | null = null;

    const updated = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.order.update({
        where: { id },
        data: {
          status: targetStatus,
          confirmedAt: new Date(),
          isDepositPaid: depositConfirmed ? true : order.isDepositPaid,
          depositStatus: depositConfirmed ? 'paid' : order.depositStatus,
          depositConfirmedAt: depositConfirmed ? new Date() : order.depositConfirmedAt,
        },
      });

      if (order.clientUserId) {
        const preview = targetStatus === 'pending_home'
          ? '美甲师已确认订单，届时将上门服务～'
          : '美甲师已确认订单，请准时到店～';
        const conversation = await tx.conversation.upsert({
          where: {
            clientId_techId: {
              clientId: order.clientUserId,
              techId: order.technicianId,
            },
          },
          update: { lastMessage: preview, lastMessageAt: new Date() },
          create: {
            clientId: order.clientUserId,
            techId: order.technicianId,
            lastMessage: preview,
            lastMessageAt: new Date(),
          },
        });

        conversationId = conversation.id;

        systemMessage = await tx.message.create({
          data: {
            conversationId: conversation.id,
            senderType: 'system',
            senderId: 0,
            receiverType: 'client',
            receiverId: order.clientUserId,
            messageType: 'system',
            content: preview,
            relatedType: 'order',
            relatedId: order.id,
          },
        });
      }

      return updated;
    });

    if (systemMessage && conversationId) {
      try {
        const updatedConversation = await this.prisma.conversation.findUnique({
          where: { id: conversationId },
        });
        this.chatGateway.server.to(`conversation:${conversationId}`).emit('message:new', {
          message: systemMessage,
          conversation: updatedConversation,
        });
      } catch (e) {
        console.error('[OrdersService] Failed to push notification via WebSocket:', e);
      }
    }

    return updated;
  }

  async complete(id: number) {
    const order = await this.findOne(id);

    if (!canTransition(order.status as OrderStatus, 'completed')) {
      throw new BadRequestException('当前订单状态不支持完成');
    }

    const revenueExists = await this.prisma.revenue.findUnique({
      where: { orderId: id },
    });

    if (revenueExists) {
      throw new BadRequestException('该订单已生成收入记录');
    }

    let systemMessage: any = null;
    let conversationId: number | null = null;

    const revenue = await this.prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id },
        data: {
          status: 'completed',
          completedAt: new Date(),
        },
      });

      const revenue = await tx.revenue.create({
        data: {
          revenueNo: this.generateRevenueNo(),
          orderId: id,
          technicianId: order.technicianId,
          customerId: order.customerId,
          amount: order.quotePrice ?? 0,
          recognizedAt: new Date(),
          status: 'confirmed',
        },
      });

      if (order.clientUserId) {
        const preview = '服务已完成，感谢使用～';
        const conversation = await tx.conversation.upsert({
          where: {
            clientId_techId: {
              clientId: order.clientUserId,
              techId: order.technicianId,
            },
          },
          update: { lastMessage: preview, lastMessageAt: new Date() },
          create: {
            clientId: order.clientUserId,
            techId: order.technicianId,
            lastMessage: preview,
            lastMessageAt: new Date(),
          },
        });

        conversationId = conversation.id;

        systemMessage = await tx.message.create({
          data: {
            conversationId: conversation.id,
            senderType: 'system',
            senderId: 0,
            receiverId: order.clientUserId,
            receiverType: 'client',
            messageType: 'system',
            content: preview,
            relatedType: 'order',
            relatedId: order.id,
          },
        });
      }

      return revenue;
    });

    if (systemMessage && conversationId) {
      try {
        const updatedConversation = await this.prisma.conversation.findUnique({
          where: { id: conversationId },
        });
        this.chatGateway.server.to(`conversation:${conversationId}`).emit('message:new', {
          message: systemMessage,
          conversation: updatedConversation,
        });
      } catch (e) {
        console.error('[OrdersService] Failed to push notification via WebSocket:', e);
      }
    }

    return revenue;
  }

  async cancel(id: number, cancelReason?: string) {
    const order = await this.findOne(id);

    const cancellableStatuses: OrderStatus[] = ['pending_quote', 'pending_agree', 'pending_confirm'];
    if (!cancellableStatuses.includes(order.status as OrderStatus)) {
      throw new BadRequestException('当前订单状态不支持取消');
    }

    let systemMessages: any[] = [];
    let conversationId: number | null = null;

    const updated = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.order.update({
        where: { id },
        data: {
          status: 'cancelled',
          cancelledAt: new Date(),
          cancelReason: cancelReason ?? order.cancelReason ?? null,
        },
      });

      if (order.clientUserId) {
        const preview = '订单已取消';
        const conversation = await tx.conversation.upsert({
          where: {
            clientId_techId: {
              clientId: order.clientUserId,
              techId: order.technicianId,
            },
          },
          update: { lastMessage: preview, lastMessageAt: new Date() },
          create: {
            clientId: order.clientUserId,
            techId: order.technicianId,
            lastMessage: preview,
            lastMessageAt: new Date(),
          },
        });

        conversationId = conversation.id;

        const msg1 = await tx.message.create({
          data: {
            conversationId: conversation.id,
            senderType: 'system',
            senderId: 0,
            receiverType: 'client',
            receiverId: order.clientUserId,
            messageType: 'system',
            content: preview,
            relatedType: 'order',
            relatedId: order.id,
          },
        });

        const msg2 = await tx.message.create({
          data: {
            conversationId: conversation.id,
            senderType: 'system',
            senderId: 0,
            receiverType: 'technician',
            receiverId: order.technicianId,
            messageType: 'system',
            content: preview,
            relatedType: 'order',
            relatedId: order.id,
          },
        });

        systemMessages = [msg1, msg2];
      }

      return updated;
    });

    if (systemMessages.length > 0 && conversationId) {
      try {
        const updatedConversation = await this.prisma.conversation.findUnique({
          where: { id: conversationId },
        });
        for (const msg of systemMessages) {
          this.chatGateway.server.to(`conversation:${conversationId}`).emit('message:new', {
            message: msg,
            conversation: updatedConversation,
          });
        }
      } catch (e) {
        console.error('[OrdersService] Failed to push notification via WebSocket:', e);
      }
    }

    return updated;
  }

  private generateOrderNo(): string {
    return `OD${Date.now()}${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
  }

  private generateRevenueNo(): string {
    return `RV${Date.now()}${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
  }

  private async assertOrderConflict(technicianId: number, startTime: Date, endTime: Date, ignoreId?: number) {
    const conflict = await this.prisma.order.findFirst({
      where: {
        technicianId,
        status: { in: ['pending_home', 'pending_shop'] },
        NOT: ignoreId ? { id: ignoreId } : undefined,
        startTime: { lt: endTime },
        endTime: { gt: startTime },
      },
      select: { id: true },
    });

    if (conflict) {
      throw new BadRequestException('该时段已被其他订单占用');
    }
  }
}
