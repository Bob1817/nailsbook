import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { ChatGateway } from '../chat/chat.gateway';
import * as crypto from 'crypto';
import { CreateTechnicianOrderDto } from './dto/create-technician-order.dto';
import { ReviewOrderDto } from './dto/review-order.dto';
import { BookingMutexService } from './booking-mutex.service';
import { ReferralQualificationService } from '../referrals/referral-qualification.service';
import { RewardFundService } from '../referrals/reward-fund.service';
import { assertWithinServiceSchedule } from './order-work-schedule';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import {
  getBusinessDateTimeParts,
  parseBusinessDateTime,
} from './business-time';

export type OrderStatus =
  | 'pending_quote'
  | 'pending_agree'
  | 'pending_confirm'
  | 'pending_client_confirm'
  | 'pending_home'
  | 'pending_shop'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'expired';

export const STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending_quote: ['pending_agree', 'cancelled', 'expired'],
  pending_agree: ['pending_confirm', 'pending_quote', 'cancelled', 'expired'],
  pending_confirm: ['pending_home', 'pending_shop', 'cancelled', 'expired'],
  pending_client_confirm: ['pending_confirm', 'cancelled', 'expired'],
  pending_home: ['in_progress', 'cancelled'],
  pending_shop: ['in_progress', 'cancelled'],
  in_progress: ['completed'],
  completed: [],
  cancelled: [],
  // 过期后可「重新发起」恢复到过期前的创建流程状态
  expired: [
    'pending_quote',
    'pending_agree',
    'pending_confirm',
    'pending_client_confirm',
  ],
};

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return STATUS_TRANSITIONS[from]?.includes(to) ?? false;
}

const CONFIRM_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private chatGateway: ChatGateway,
    @Optional() private readonly bookingMutex?: BookingMutexService,
    @Optional()
    private readonly referralQualification?: ReferralQualificationService,
    @Optional() private readonly rewardFunds?: RewardFundService,
    @Optional() private readonly subscriptions?: SubscriptionsService,
  ) {}

  async createForTechnician(
    technicianId: number,
    dto: CreateTechnicianOrderDto,
  ) {
    if (this.subscriptions) {
      await this.subscriptions.assertCanCreateBooking(technicianId);
    }
    // Resolve Customer record: accept either customerId or clientUserId
    let customerId: number;
    let resolvedClientUserId: number | null = null;
    if (dto.customerId) {
      const customer = await this.prisma.customer.findUnique({
        where: { id: dto.customerId },
      });
      if (!customer) throw new NotFoundException('客户不存在');
      if (customer.technicianId !== technicianId)
        throw new ForbiddenException('无权为该客户创建订单');
      customerId = dto.customerId;
      resolvedClientUserId = customer.clientUserId ?? null;
    } else if (dto.clientUserId) {
      const customer = await this.prisma.customer.findFirst({
        where: { technicianId, clientUserId: dto.clientUserId },
      });
      if (!customer) throw new NotFoundException('未找到该客户的绑定记录');
      customerId = customer.id;
      resolvedClientUserId = dto.clientUserId;
    } else {
      throw new BadRequestException('customerId 或 clientUserId 必须提供一个');
    }

    if (dto.shareToClient && dto.price == null) {
      throw new BadRequestException('生成微信确认链接时，价格为必填项');
    }
    const initialStart = new Date(dto.startTime);
    const initialEnd = new Date(dto.endTime);
    if (
      Number.isNaN(initialStart.getTime()) ||
      Number.isNaN(initialEnd.getTime()) ||
      initialEnd <= initialStart
    ) {
      throw new BadRequestException('预约时间无效');
    }
    await this.assertTechnicianWorkSchedule(technicianId, initialStart, initialEnd);

    const confirmToken = dto.shareToClient ? crypto.randomUUID() : null;
    const confirmTokenExpiresAt = confirmToken
      ? new Date(Date.now() + CONFIRM_TOKEN_TTL_MS)
      : null;

    const createOrder = () =>
      this.prisma.$transaction(async (tx) => {
        const order = await tx.order.create({
          data: {
            orderNo: this.generateOrderNo(),
            technicianId,
            customerId,
            clientUserId: dto.clientUserId ?? resolvedClientUserId ?? null,
            startTime: new Date(dto.startTime),
            endTime: new Date(dto.endTime),
            address: dto.address,
            serviceType: dto.serviceType || null,
            // 美甲师直接发起且已填写价格的预约无需再报价，直接进入待客户确认。
            status:
              dto.shareToClient || (dto.price != null && dto.price > 0)
                ? 'pending_client_confirm'
                : 'pending_quote',
            remark: dto.note || dto.serviceName || null,
            customDescription: dto.customDescription || null,
            customImages: dto.customImages?.length
              ? JSON.stringify(dto.customImages)
              : null,
            quotePrice: dto.price ?? 0,
            confirmToken,
            confirmTokenExpiresAt,
          },
          include: {
            technician: { select: { id: true, name: true, phone: true } },
            customer: {
              select: { id: true, name: true, phone: true, avatarUrl: true },
            },
            review: { select: { rating: true } },
            revenue: { select: { amount: true, recognizedAt: true } },
          },
        });

        const startTime = new Date(dto.startTime);
        const blockEndTime = new Date(dto.endTime);
        const conflict = await tx.blockedTimeSlot.findFirst({
          where: {
            techId: technicianId,
            startTime: { lt: blockEndTime },
            endTime: { gt: startTime },
          },
          select: { id: true },
        });
        if (conflict) {
          throw new BadRequestException(
            '该时间段已经被其他用户预约，请重新选择预约时间',
          );
        }
        await tx.blockedTimeSlot.create({
          data: {
            techId: technicianId,
            orderId: order.id,
            startTime,
            endTime: blockEndTime,
            reason: 'booking',
          },
        });

        return order;
      });
    const order = this.bookingMutex
      ? await this.bookingMutex.runExclusive(technicianId, createOrder)
      : await createOrder();

    const result: Record<string, unknown> = { ...order };
    if (confirmToken) {
      const webappUrl = process.env.WEBAPP_URL ?? 'http://localhost:3000';
      result['confirmUrl'] = `${webappUrl}/confirm/${confirmToken}`;
    }
    return result;
  }

  async findAll(
    page: number = 1,
    limit: number = 20,
    technicianId?: number,
    customerId?: number,
    status?: string,
  ) {
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
          customer: {
            select: { id: true, name: true, phone: true, avatarUrl: true },
          },
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
        customer: {
          select: { id: true, name: true, phone: true, avatarUrl: true },
        },
      },
      orderBy: { startTime: 'asc' },
    });
  }

  async findIncomeCalendar(technicianId: number) {
    const [technician, orders] = await Promise.all([
      this.prisma.technician.findUnique({
        where: { id: technicianId },
        select: { createdAt: true },
      }),
      this.prisma.order.findMany({
        where: { technicianId },
        select: {
          startTime: true,
          status: true,
          quotePrice: true,
        },
        orderBy: { startTime: 'asc' },
      }),
    ]);

    if (!technician) throw new NotFoundException('美甲师不存在');

    return {
      registeredAt: technician.createdAt,
      orders,
    };
  }

  async findOne(id: number) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        technician: { select: { id: true, name: true, phone: true } },
        customer: {
          select: { id: true, name: true, phone: true, avatarUrl: true },
        },
        revenue: true,
        designRequest: {
          select: { id: true, title: true, images: true, description: true },
        },
        customServiceRequest: {
          select: {
            id: true,
            title: true,
            images: true,
            description: true,
            referenceWorkIds: true,
          },
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

  async updateForTechnician(
    id: number,
    technicianId: number,
    dto: {
      serviceType?: string;
      startTime?: string;
      endTime?: string;
      price?: number;
      note?: string;
      depositAmount?: number;
    },
  ) {
    const order = await this.findOneForTechnician(id, technicianId);

    const updateData: any = {};
    const timeChanged =
      dto.startTime !== undefined || dto.endTime !== undefined;

    if (dto.serviceType !== undefined) updateData.serviceType = dto.serviceType;
    if (dto.price !== undefined) updateData.quotePrice = dto.price;
    if (dto.note !== undefined) updateData.remark = dto.note;
    if (dto.depositAmount !== undefined)
      updateData.depositAmount = dto.depositAmount;

    if (!timeChanged) {
      return this.prisma.order.update({
        where: { id },
        data: updateData,
      });
    }

    const currentStart = new Date(order.startTime);
    const currentEnd = new Date(order.endTime);
    const currentDuration = currentEnd.getTime() - currentStart.getTime();
    const startTime = dto.startTime ? new Date(dto.startTime) : currentStart;
    const endTime = dto.endTime
      ? new Date(dto.endTime)
      : currentDuration > 0
        ? new Date(startTime.getTime() + currentDuration)
        : new Date(startTime);

    if (
      Number.isNaN(startTime.getTime()) ||
      Number.isNaN(endTime.getTime()) ||
      endTime.getTime() < startTime.getTime()
    ) {
      throw new BadRequestException('预约时间无效');
    }

    const blockEnd =
      endTime.getTime() > startTime.getTime()
        ? endTime
        : new Date(startTime.getTime() + 2 * 60 * 60 * 1000);
    await this.assertTechnicianWorkSchedule(technicianId, startTime, blockEnd);

    updateData.startTime = startTime;
    updateData.endTime = endTime;
    updateData.reminderDaySent = false;
    updateData.reminderHourSent = false;

    return this.prisma.$transaction(async (tx) => {
      const conflict = await tx.blockedTimeSlot.findFirst({
        where: {
          techId: technicianId,
          NOT: { orderId: id },
          startTime: { lt: blockEnd },
          endTime: { gt: startTime },
        },
        select: { id: true },
      });
      if (conflict) {
        throw new BadRequestException(
          '该时间段已经被其他用户预约，请重新选择预约时间',
        );
      }

      const updated = await tx.order.update({
        where: { id },
        data: updateData,
      });
      await tx.orderReminder.updateMany({
        where: { orderId: id, status: { not: 'cancelled' } },
        data: {
          status: 'pending',
          attempts: 0,
          sentAt: null,
          cancelledAt: null,
          lastError: null,
        },
      });

      await tx.blockedTimeSlot.deleteMany({ where: { orderId: id } });
      await tx.blockedTimeSlot.create({
        data: {
          techId: technicianId,
          orderId: id,
          startTime,
          endTime: blockEnd,
          reason: 'booking',
        },
      });

      return updated;
    });
  }

  async review(id: number, technicianId: number, dto: ReviewOrderDto) {
    const order = await this.findOneForTechnician(id, technicianId);

    if (!canTransition(order.status as OrderStatus, 'pending_agree')) {
      throw new BadRequestException('当前订单状态不支持报价');
    }

    const startTime = parseBusinessDateTime(dto.serviceDate, dto.startTime);
    const endTime = new Date(
      startTime.getTime() + Number(dto.durationMinutes) * 60000,
    );

    if (
      Number.isNaN(startTime.getTime()) ||
      Number.isNaN(endTime.getTime()) ||
      Number(dto.durationMinutes) <= 0
    ) {
      throw new BadRequestException('预约时间或预估时长无效');
    }
    await this.assertTechnicianWorkSchedule(technicianId, startTime, endTime);

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
          depositAmount: dto.depositAmount ?? 0,
        },
        include: {
          technician: { select: { id: true, name: true, phone: true } },
          customer: {
            select: { id: true, name: true, phone: true, avatarUrl: true },
          },
        },
      });

      // 用实际服务时间（startTime~endTime）替换创建时的预估占用，
      // 保持该预约的“已预约时间范围”与确认后的服务时长同步。
      await tx.blockedTimeSlot.updateMany({
        where: { orderId: id },
        data: { startTime, endTime, reason: 'booking' },
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
        this.chatGateway.server
          .to(`conversation:${String(conversationId)}`)
          .emit('message:new', {
            message: systemMessage,
            conversation: updatedConversation,
          });
      } catch (e) {
        console.error(
          '[OrdersService] Failed to push notification via WebSocket:',
          e,
        );
      }
    }

    return updated;
  }

  async confirm(id: number, depositConfirmed?: boolean) {
    const order = await this.findOne(id);

    if (
      !canTransition(order.status as OrderStatus, 'pending_home') &&
      !canTransition(order.status as OrderStatus, 'pending_shop')
    ) {
      throw new BadRequestException('当前订单状态不支持确认');
    }

    if (
      (order.depositAmount ?? 0) > 0 &&
      !order.isDepositPaid &&
      !depositConfirmed
    ) {
      throw new BadRequestException('请先确认用户已缴纳定金');
    }

    const targetStatus: OrderStatus =
      order.serviceType === '上门美甲' ? 'pending_home' : 'pending_shop';

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
          depositConfirmedAt: depositConfirmed
            ? new Date()
            : order.depositConfirmedAt,
        },
      });

      if (order.clientUserId) {
        const preview =
          targetStatus === 'pending_home'
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
        this.chatGateway.server
          .to(`conversation:${String(conversationId)}`)
          .emit('message:new', {
            message: systemMessage,
            conversation: updatedConversation,
          });
      } catch (e) {
        console.error(
          '[OrdersService] Failed to push notification via WebSocket:',
          e,
        );
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
      const claimed = await tx.order.updateMany({
        where: { id, status: 'in_progress' },
        data: { status: 'completed' },
      });
      if (claimed.count !== 1) {
        throw new BadRequestException('该订单已完成，无需重复处理');
      }

      await tx.order.update({
        where: { id },
        data: {
          completedAt: new Date(),
        },
      });

      const revenue = await tx.revenue.create({
        data: {
          revenueNo: this.generateRevenueNo(),
          orderId: id,
          technicianId: order.technicianId,
          customerId: order.customerId,
          amount: Math.max(
            0,
            (order.quotePrice ?? 0) - (order.fundDiscountAmount ?? 0),
          ),
          recognizedAt: new Date(),
          status: 'confirmed',
        },
      });

      if (this.referralQualification) {
        await this.referralQualification.qualifyCompletedOrder(tx, order);
      }

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
        this.chatGateway.server
          .to(`conversation:${String(conversationId)}`)
          .emit('message:new', {
            message: systemMessage,
            conversation: updatedConversation,
          });
      } catch (e) {
        console.error(
          '[OrdersService] Failed to push notification via WebSocket:',
          e,
        );
      }
    }

    return revenue;
  }

  async cancel(id: number, cancelReason?: string) {
    const order = await this.findOne(id);

    const cancellableStatuses: OrderStatus[] = [
      'pending_quote',
      'pending_agree',
      'pending_confirm',
      'pending_client_confirm',
      'pending_home',
      'pending_shop',
    ];
    if (!cancellableStatuses.includes(order.status as OrderStatus)) {
      throw new BadRequestException('当前订单状态不支持取消');
    }

    let systemMessages: any[] = [];
    let conversationId: number | null = null;

    const updated = await this.prisma.$transaction(async (tx) => {
      const claimed = await tx.order.updateMany({
        where: { id, status: { in: cancellableStatuses } },
        data: { status: 'cancelled' },
      });
      if (claimed.count !== 1) {
        throw new BadRequestException('该订单已取消，无需重复处理');
      }
      await tx.orderReminder.updateMany({
        where: { orderId: id, status: { not: 'sent' } },
        data: { status: 'cancelled', cancelledAt: new Date() },
      });

      // Release blocked time slot
      await tx.blockedTimeSlot.deleteMany({
        where: { orderId: id },
      });

      if (this.rewardFunds) {
        await this.rewardFunds.reverseOrderRedemption(tx, id);
      }

      const updated = await tx.order.update({
        where: { id },
        data: {
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

        // 取消由美甲师发起：仅通知客户，不通知操作者本人（美甲师）
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

        systemMessages = [msg1];
      }

      return updated;
    });

    if (systemMessages.length > 0 && conversationId) {
      try {
        const updatedConversation = await this.prisma.conversation.findUnique({
          where: { id: conversationId },
        });
        for (const msg of systemMessages) {
          this.chatGateway.server
            .to(`conversation:${String(conversationId)}`)
            .emit('message:new', {
              message: msg,
              conversation: updatedConversation,
            });
        }
      } catch (e) {
        console.error(
          '[OrdersService] Failed to push notification via WebSocket:',
          e,
        );
      }
    }

    return updated;
  }

  // 重新发起已过期预约：仅重选预约时间，其余信息保留，恢复过期前状态。
  async reinitiate(
    id: number,
    technicianId: number,
    dto: { serviceDate: string; startTime: string },
  ) {
    const order = await this.findOneForTechnician(id, technicianId);

    if (order.status !== 'expired') {
      throw new BadRequestException('仅已过期的预约可重新发起');
    }

    const startTime = parseBusinessDateTime(dto.serviceDate, dto.startTime);
    if (Number.isNaN(startTime.getTime())) {
      throw new BadRequestException('预约时间无效');
    }
    if (startTime.getTime() <= Date.now()) {
      throw new BadRequestException('请选择将来的预约时间');
    }

    // 保留原服务时长；历史无有效时长时按两小时处理。
    const prevDuration =
      new Date(order.endTime).getTime() - new Date(order.startTime).getTime();
    const endTime =
      prevDuration > 0
        ? new Date(startTime.getTime() + prevDuration)
        : startTime;
    const blockEnd =
      prevDuration > 0
        ? endTime
        : new Date(startTime.getTime() + 2 * 60 * 60 * 1000);
    await this.assertTechnicianWorkSchedule(technicianId, startTime, blockEnd);

    const restoreStatus = order.expiredFromStatus ?? 'pending_quote';

    const updated = await this.prisma.$transaction(async (tx) => {
      const conflict = await tx.blockedTimeSlot.findFirst({
        where: {
          techId: technicianId,
          NOT: { orderId: id },
          startTime: { lt: blockEnd },
          endTime: { gt: startTime },
        },
        select: { id: true },
      });
      if (conflict) {
        throw new BadRequestException(
          '该时间段已经被其他用户预约，请重新选择预约时间',
        );
      }

      const updated = await tx.order.update({
        where: { id },
        data: {
          status: restoreStatus,
          startTime,
          endTime,
          expiredAt: null,
          expiredFromStatus: null,
          reminderDaySent: false,
          reminderHourSent: false,
        },
      });
      await tx.orderReminder.updateMany({
        where: { orderId: id },
        data: {
          status: 'pending',
          attempts: 0,
          sentAt: null,
          cancelledAt: null,
          lastError: null,
        },
      });

      await tx.blockedTimeSlot.deleteMany({ where: { orderId: id } });
      await tx.blockedTimeSlot.create({
        data: {
          techId: technicianId,
          orderId: id,
          startTime,
          endTime: blockEnd,
          reason: 'booking',
        },
      });

      return updated;
    });

    // 美甲师重新发起：仅通知客户，不通知操作者本人
    if (order.clientUserId) {
      try {
        const preview = '美甲师重新发起了预约，请查看～';
        const conversation = await this.prisma.conversation.upsert({
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
        const message = await this.prisma.message.create({
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
        const updatedConversation = await this.prisma.conversation.findUnique({
          where: { id: conversation.id },
        });
        this.chatGateway.server
          .to(`conversation:${String(conversation.id)}`)
          .emit('message:new', { message, conversation: updatedConversation });
      } catch (e) {
        console.error(
          '[OrdersService] Failed to push reinitiate notification:',
          e,
        );
      }
    }

    return updated;
  }

  private generateOrderNo(): string {
    return `OD${Date.now()}${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
  }

  private async assertTechnicianWorkSchedule(
    technicianId: number,
    startTime: Date,
    endTime: Date,
  ) {
    const technician = this.prisma.technician?.findUnique
      ? await this.prisma.technician.findUnique({
          where: { id: technicianId },
          select: { serviceSchedule: true },
        })
      : { serviceSchedule: null };
    if (!technician) throw new NotFoundException('美甲师不存在');
    const parts = getBusinessDateTimeParts(startTime);
    const durationMinutes = Math.ceil(
      (endTime.getTime() - startTime.getTime()) / 60000,
    );
    assertWithinServiceSchedule(
      technician.serviceSchedule,
      `${parts.year}-${parts.month}-${parts.day}`,
      `${parts.hour}:${parts.minute}`,
      durationMinutes,
    );
  }

  private generateRevenueNo(): string {
    return `RV${Date.now()}${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
  }

  private async assertOrderConflict(
    technicianId: number,
    startTime: Date,
    endTime: Date,
    ignoreId?: number,
  ) {
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
