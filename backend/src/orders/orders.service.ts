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
import { revenueSnapshot } from './order-accounting';
import { throwIfBookingSlotConflict } from './booking-conflict';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import {
  getBusinessDateTimeParts,
  parseBusinessDateTime,
} from './business-time';
import {
  assertLaunchShopService,
  isLaunchTechnician,
} from '../common/miniprogram-launch-mode';
import {
  buildServiceSnapshotLines,
  finalPriceFen,
  summarizeSnapshotLines,
} from './booking-pricing';

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
    if (!isLaunchTechnician(technicianId)) {
      throw new ForbiddenException('该美甲师不在小程序首期开放范围内');
    }
    assertLaunchShopService(dto.serviceType);
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
    const structuredService = dto.serviceId
      ? await this.prisma.service.findFirst({
          where: {
            technicianId,
            publicId: dto.serviceId,
            archivedAt: null,
            isBookable: true,
          },
          select: { id: true, name: true },
        })
      : null;
    if (dto.serviceId && !structuredService)
      throw new BadRequestException('所选服务内容已失效，请重新选择');
    const initialStart = new Date(dto.startTime);
    const initialEnd = new Date(dto.endTime);
    if (
      Number.isNaN(initialStart.getTime()) ||
      Number.isNaN(initialEnd.getTime()) ||
      initialEnd <= initialStart
    ) {
      throw new BadRequestException('预约时间无效');
    }
    await this.assertTechnicianWorkSchedule(
      technicianId,
      initialStart,
      initialEnd,
    );

    const confirmToken = dto.shareToClient ? crypto.randomUUID() : null;
    const confirmTokenExpiresAt = confirmToken
      ? new Date(Date.now() + CONFIRM_TOKEN_TTL_MS)
      : null;

    const createOrder = () =>
      this.prisma.$transaction(async (tx) => {
        const referralAttribution = dto.sourceLeadId
          ? await tx.lead.findUnique({
              where: { id: dto.sourceLeadId },
              select: { referralRelationId: true, referrerClientId: true },
            })
          : null;
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
            serviceId: structuredService?.id ?? null,
            sourceLeadId: dto.sourceLeadId ?? null,
            referralRelationId: referralAttribution?.referralRelationId ?? null,
            referrerClientId: referralAttribution?.referrerClientId ?? null,
            // 美甲师直接发起且已填写价格的预约无需再报价，直接进入待客户确认。
            status:
              dto.shareToClient || (dto.price != null && dto.price > 0)
                ? 'pending_client_confirm'
                : 'pending_quote',
            remark:
              dto.note || structuredService?.name || dto.serviceName || null,
            customDescription: dto.customDescription || null,
            customImages: dto.customImages?.length
              ? JSON.stringify(dto.customImages)
              : null,
            quotePrice: dto.price ?? 0,
            estimatedAmount: dto.estimatedAmount ?? dto.price ?? 0,
            expectedDate: dto.expectedDate
              ? new Date(dto.expectedDate)
              : new Date(dto.startTime),
            expectedTimeSlot: dto.expectedTimeSlot ?? null,
            materialCost: dto.materialCost ?? 0,
            isRepeatBooking: dto.isRepeatBooking ?? false,
            sourceServiceRecordId: dto.sourceServiceRecordId ?? null,
            attributionChannel: dto.isRepeatBooking
              ? 'repeat'
              : dto.sourceLeadId
                ? 'referral'
                : null,
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
    let order;
    try {
      order = this.bookingMutex
        ? await this.bookingMutex.runExclusive(technicianId, createOrder)
        : await createOrder();
    } catch (error) {
      throwIfBookingSlotConflict(error);
    }

    const result: Record<string, unknown> = { ...order };
    if (confirmToken) {
      const webappUrl = process.env.WEBAPP_URL ?? 'http://localhost:3000';
      result['confirmUrl'] = `${webappUrl}/confirm/${confirmToken}`;
    }
    return result;
  }

  async repeatFromServiceRecord(
    technicianId: number,
    recordId: number,
    schedule: { startTime: string; endTime: string; address: string },
  ) {
    const record = await this.prisma.serviceRecord.findFirst({
      where: { id: recordId, technicianId },
      include: { order: { include: { service: true, customer: true } } },
    });
    if (!record) throw new NotFoundException('历史服务记录不存在');
    return this.createForTechnician(technicianId, {
      customerId: record.customerId,
      serviceId: record.order.service?.publicId,
      serviceName:
        record.order.service?.name || record.order.remark || '复购服务',
      startTime: schedule.startTime,
      endTime: schedule.endTime,
      address: schedule.address,
      serviceType: record.order.serviceType || undefined,
      price: record.actualAmount,
      sourceServiceRecordId: record.id,
      isRepeatBooking: true,
    } as any);
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

  async findTradeOrders(technicianId: number, status?: string) {
    return this.prisma.bookingTradeOrder.findMany({
      where: {
        technicianId,
        ...(status && status !== 'all' ? { status } : {}),
      },
      include: {
        booking: {
          include: {
            customer: { select: { id: true, name: true, avatarUrl: true } },
            paymentOrders: { orderBy: { createdAt: 'desc' } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
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
        serviceLines: { orderBy: { sortOrder: 'asc' } },
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
      isDepositPaid?: boolean;
    },
  ) {
    assertLaunchShopService(dto.serviceType);
    const order = await this.findOneForTechnician(id, technicianId);

    const updateData: any = {};
    const timeChanged =
      dto.startTime !== undefined || dto.endTime !== undefined;

    if (dto.serviceType !== undefined) updateData.serviceType = dto.serviceType;
    if (dto.price !== undefined) updateData.quotePrice = dto.price;
    if (dto.note !== undefined) updateData.remark = dto.note;
    if (dto.depositAmount !== undefined)
      updateData.depositAmount = dto.depositAmount;
    if (dto.isDepositPaid !== undefined)
      updateData.isDepositPaid = dto.isDepositPaid;

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

    if (order.bookingType !== 'custom' && order.bookingType !== 'legacy') {
      throw new BadRequestException('标准作品或基础服务预约无需重新报价');
    }
    const requested = dto.services ?? [];
    const services = await this.prisma.service.findMany({
      where: {
        technicianId,
        publicId: { in: requested.map((item) => item.servicePublicId) },
        isBookable: true,
        archivedAt: null,
      },
      select: {
        id: true,
        publicId: true,
        name: true,
        priceMinFen: true,
        durationMinutes: true,
      },
    });
    const serviceLines = buildServiceSnapshotLines(services, requested);
    const summary = summarizeSnapshotLines(serviceLines);
    const discountAmountFen = dto.discountAmountFen ?? 0;
    const quotedFinalPriceFen = finalPriceFen(
      summary.serviceSubtotalFen,
      discountAmountFen,
    );
    const startTime = parseBusinessDateTime(dto.serviceDate, dto.startTime);
    const endTime = new Date(
      startTime.getTime() + summary.totalDurationMinutes * 60000,
    );

    if (
      Number.isNaN(startTime.getTime()) ||
      Number.isNaN(endTime.getTime()) ||
      summary.totalDurationMinutes <= 0
    ) {
      throw new BadRequestException('预约时间或预估时长无效');
    }
    await this.assertTechnicianWorkSchedule(technicianId, startTime, endTime);
    const blockedConflict = await this.prisma.blockedTimeSlot.findFirst({
      where: {
        techId: technicianId,
        NOT: { orderId: id },
        startTime: { lt: endTime },
        endTime: { gt: startTime },
      },
      select: { id: true },
    });
    if (blockedConflict) {
      throw new BadRequestException('该时间段已被预约，请与客户协商新的时间');
    }

    let systemMessage: any = null;
    let conversationId: number | null = null;

    const updated = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.order.update({
        where: { id },
        data: {
          startTime,
          endTime,
          bookingType: 'custom',
          serviceSubtotalFen: summary.serviceSubtotalFen,
          discountAmountFen,
          finalPriceFen: quotedFinalPriceFen,
          totalDurationMinutes: summary.totalDurationMinutes,
          quotePrice: quotedFinalPriceFen / 100,
          quoteRemark: dto.remark || null,
          quotedAt: new Date(),
          status: 'pending_agree',
          bookingPhase: 'application',
          expectedDate: startTime,
          expectedTimeSlot: dto.startTime,
          depositAmount: dto.depositAmount ?? 0,
        },
        include: {
          technician: { select: { id: true, name: true, phone: true } },
          customer: {
            select: { id: true, name: true, phone: true, avatarUrl: true },
          },
        },
      });
      await tx.orderServiceLine.deleteMany({ where: { orderId: id } });
      await tx.orderServiceLine.createMany({
        data: serviceLines.map((line) => ({
          orderId: id,
          ...line,
          source: 'quote',
        })),
      });
      await tx.blockedTimeSlot.deleteMany({ where: { orderId: id } });
      await tx.blockedTimeSlot.create({
        data: {
          techId: technicianId,
          orderId: id,
          startTime,
          endTime,
          reason: 'booking',
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

  async confirm(id: number) {
    const order = await this.findOne(id);

    if (
      !canTransition(order.status as OrderStatus, 'pending_home') &&
      !canTransition(order.status as OrderStatus, 'pending_shop')
    ) {
      throw new BadRequestException('当前订单状态不支持确认');
    }

    const targetStatus: OrderStatus =
      order.serviceType === '上门美甲' ? 'pending_home' : 'pending_shop';
    const requiresDeposit = (order.depositAmount ?? 0) > 0;

    let systemMessage: any = null;
    let conversationId: number | null = null;

    const confirmBooking = () =>
      this.prisma.$transaction(async (tx) => {
        const conflict = await tx.blockedTimeSlot.findFirst({
          where: {
            techId: order.technicianId,
            NOT: { orderId: id },
            startTime: { lt: order.endTime },
            endTime: { gt: order.startTime },
          },
          select: { id: true },
        });
        if (conflict) {
          throw new BadRequestException(
            '该时间段已被预约，请与客户协商新的时间',
          );
        }
        const updated = await tx.order.update({
          where: { id },
          data: {
            status: targetStatus,
            bookingPhase: 'booking',
            tradeStatus: requiresDeposit ? 'deposit_pending' : 'deposit_paid',
            tradeCreatedAt: new Date(),
            fulfillmentStatus: targetStatus,
            confirmedStartTime: order.startTime,
            confirmedEndTime: order.endTime,
            confirmedAt: new Date(),
          },
        });

        if (order.clientUserId) {
          const totalAmount = Math.max(
            0,
            (order.quotePrice ?? 0) - (order.fundDiscountAmount ?? 0),
          );
          await tx.bookingTradeOrder.upsert({
            where: { bookingId: id },
            update: {},
            create: {
              tradeNo: `TRADE${Date.now()}${id}`,
              bookingId: id,
              clientUserId: order.clientUserId,
              technicianId: order.technicianId,
              totalAmount,
              depositAmount: Math.min(totalAmount, order.depositAmount ?? 0),
              balanceAmount: Math.max(
                0,
                totalAmount - (order.depositAmount ?? 0),
              ),
              paidAmount: 0,
              status: totalAmount > 0 ? 'pending' : 'completed',
              currentPayStage: requiresDeposit ? 'deposit' : 'balance',
              completedAt: totalAmount > 0 ? null : new Date(),
            },
          });
        }

        await tx.blockedTimeSlot.deleteMany({ where: { orderId: id } });
        await tx.blockedTimeSlot.create({
          data: {
            techId: order.technicianId,
            orderId: id,
            startTime: order.startTime,
            endTime: order.endTime,
            reason: 'booking',
          },
        });

        if (order.clientUserId) {
          const preview = requiresDeposit
            ? `双方已确认预约，订单已生成，请支付定金 ¥${Number(order.depositAmount).toFixed(2)}`
            : targetStatus === 'pending_home'
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
    const updated = this.bookingMutex
      ? await this.bookingMutex.runExclusive(order.technicianId, confirmBooking)
      : await confirmBooking();

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

  async complete(id: number, dto?: any) {
    const order = await this.findOne(id);

    if (!canTransition(order.status as OrderStatus, 'completed')) {
      throw new BadRequestException('当前订单状态不支持完成');
    }
    if (order.paymentStatus !== 'paid') {
      throw new BadRequestException('请先通知客户支付剩余尾款');
    }
    if (
      dto &&
      (!dto.actualStartTime ||
        !dto.actualEndTime ||
        dto.actualAmount == null ||
        dto.materialCost == null)
    )
      throw new BadRequestException('请完整填写实际时间、实收金额和材料成本');

    const revenueExists = await this.prisma.revenue.findUnique({
      where: { orderId: id },
    });

    if (revenueExists) {
      throw new BadRequestException('该订单已生成收入记录');
    }

    let systemMessage: any = null;
    let conversationId: number | null = null;

    const actualStart = dto
      ? new Date(dto.actualStartTime)
      : order.confirmedStartTime || order.startTime;
    const actualEnd = dto
      ? new Date(dto.actualEndTime)
      : order.confirmedEndTime || order.endTime || new Date();
    if (actualEnd <= actualStart)
      throw new BadRequestException('实际结束时间必须晚于开始时间');
    const actualAmount = dto?.actualAmount ?? order.paidAmount ?? 0,
      materialCost = dto?.materialCost ?? 0;
    const service = order.serviceId
      ? await this.prisma.service.findUnique({
          where: { id: order.serviceId },
          select: { maintenanceCycleDays: true },
        })
      : null;
    const maintenanceCycleDays = service?.maintenanceCycleDays ?? 21;
    const aftercareDeadline = new Date(actualEnd.getTime() + 7 * 86400000),
      suggestedMaintenanceAt = new Date(
        actualEnd.getTime() + maintenanceCycleDays * 86400000,
      );
    const revenue = await this.prisma.$transaction(async (tx) => {
      const claimed = await tx.order.updateMany({
        where: { id, status: 'in_progress' },
        data: { status: 'completed', bookingPhase: 'finished' },
      });
      if (claimed.count !== 1) {
        throw new BadRequestException('该订单已完成，无需重复处理');
      }

      await tx.order.update({
        where: { id },
        data: {
          completedAt: actualEnd,
          confirmedStartTime: actualStart,
          confirmedEndTime: actualEnd,
          actualAmount,
          materialCost,
          paidAmount: actualAmount,
          paymentStatus: order.paymentStatus,
          aftercareDeadline,
          suggestedMaintenanceAt,
        },
      });
      await tx.serviceRecord.create({
        data: {
          orderId: id,
          technicianId: order.technicianId,
          customerId: order.customerId,
          actualStartTime: actualStart,
          actualEndTime: actualEnd,
          actualAmount,
          materialCost,
          materials: dto?.materials || null,
          techniques: dto?.techniques || null,
          nailCondition: dto?.nailCondition || null,
          customerFeedback: dto?.customerFeedback || null,
          careAdvice: dto?.careAdvice || null,
          aftercareDeadline,
          suggestedMaintenanceAt,
        },
      });
      const contentTask = await tx.contentPublicationTask.upsert({
        where: { orderId: id },
        create: {
          technicianId: order.technicianId,
          orderId: id,
          status: 'selecting_images',
          headline: '本次美甲作品',
          serviceSummary: order.remark || null,
          bookingCallToAction: '欢迎咨询档期与价格',
          hashtags: '#美甲 #美甲作品',
        },
        update: {},
      });
      const postServiceTasks = [
        ['complete_service_record', '补全服务记录', 'high', actualEnd],
        ['care_instructions', '发送护理说明', 'high', actualEnd],
        ['review_invitation', '邀请客户评价', 'normal', actualEnd],
        ['photo_consent', '确认照片公开授权', 'normal', actualEnd],
        ['organize_work', '整理本次作品素材', 'normal', actualEnd],
        ['create_case', '创建作品案例', 'normal', actualEnd],
        ['publish_content', '发布本次服务内容', 'normal', actualEnd],
        [
          'repurchase_reminder',
          '客户复购提醒',
          'normal',
          suggestedMaintenanceAt,
        ],
      ] as const;
      for (const [type, title, priority, dueAt] of postServiceTasks) {
        await tx.actionTask.upsert({
          where: {
            taskKey: `${order.technicianId}:${type}:order:${id}`,
          },
          create: {
            technicianId: order.technicianId,
            taskKey: `${order.technicianId}:${type}:order:${id}`,
            type,
            title,
            description: `服务订单 #${id}`,
            priority,
            relatedType: 'order',
            relatedId: id,
            actionPath:
              type === 'create_case'
                ? `/pages/technician/work-edit/index?orderId=${id}`
                : type === 'publish_content'
                  ? `/pages/technician/content-publication/index?id=${contentTask.id}`
                  : `/pages/technician/order-detail/index?id=${id}`,
            dueAt,
          },
          update: {},
        });
      }
      await tx.customer.update({
        where: { id: order.customerId },
        data: {
          completedServiceCount: { increment: 1 },
          lifetimePaidAmount: { increment: actualAmount },
          lastServiceAt: actualEnd,
          suggestedMaintenanceAt,
        },
      });
      const accounting = revenueSnapshot({
        ...order,
        paidAmount: actualAmount,
        paymentStatus: actualAmount > 0 ? 'paid' : order.paymentStatus,
      });
      const revenue = await tx.revenue.create({
        data: {
          revenueNo: this.generateRevenueNo(),
          orderId: id,
          technicianId: order.technicianId,
          customerId: order.customerId,
          amount: accounting.amount,
          recognizedAt: actualEnd,
          status: accounting.status,
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
        data: { status: 'cancelled', tradeStatus: 'cancelled' },
      });
      if (claimed.count !== 1) {
        throw new BadRequestException('该订单已取消，无需重复处理');
      }
      await tx.paymentOrder.updateMany({
        where: {
          orderId: id,
          status: { in: ['created', 'pending', 'channel_pending'] },
        },
        data: { status: 'closed', closedAt: new Date() },
      });
      await tx.bookingTradeOrder.updateMany({
        where: { bookingId: id, status: { not: 'cancelled' } },
        data: { status: 'cancelled', cancelledAt: new Date() },
      });
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

  async createReviewInvitation(technicianId: number, orderId: number) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, technicianId, status: 'completed' },
      select: { id: true },
    });
    if (!order) throw new BadRequestException('只有已完成订单可生成评价邀请');
    const existingReview = await this.prisma.serviceReview.findUnique({
      where: { orderId },
      select: { id: true },
    });
    if (existingReview) throw new BadRequestException('该订单已提交评价');
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto
      .createHash('sha256')
      .update(rawToken)
      .digest('hex');
    const expiresAt = new Date(Date.now() + 7 * 86400000);
    const invitation = await this.prisma.reviewInvitation.upsert({
      where: { orderId },
      create: { orderId, technicianId, tokenHash, expiresAt },
      update: { tokenHash, expiresAt, usedAt: null },
    });
    return {
      id: invitation.id,
      expiresAt,
      path: `/pages/client/order-detail/index?id=${orderId}&reviewToken=${rawToken}`,
    };
  }

  async moderateReview(
    technicianId: number,
    reviewId: number,
    decision: 'approved' | 'rejected',
  ) {
    const review = await this.prisma.serviceReview.findFirst({
      where: { id: reviewId, technicianId },
      select: { id: true },
    });
    if (!review) throw new NotFoundException('评价不存在');
    return this.prisma.serviceReview.update({
      where: { id: reviewId },
      data: {
        moderationStatus: decision,
        publicationStatus: decision === 'approved' ? 'public' : 'private',
        moderatedAt: new Date(),
        moderatorId: technicianId,
      },
    });
  }

  async replyToReview(technicianId: number, reviewId: number, reply: string) {
    const review = await this.prisma.serviceReview.findFirst({
      where: { id: reviewId, technicianId },
      select: { id: true },
    });
    if (!review) throw new NotFoundException('评价不存在');
    if (!reply.trim()) throw new BadRequestException('回复内容不能为空');
    return this.prisma.serviceReview.update({
      where: { id: reviewId },
      data: { technicianReply: reply.trim(), repliedAt: new Date() },
    });
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
