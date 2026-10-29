import { depositFen, proposalSnapshot, quoteTotals, SURCHARGE_CATEGORIES } from './booking-proposal';
import { assertBookingAccountState } from './booking-account-state';
import { BookingDaysService, businessDate } from './booking-days.service';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { ChatGateway } from '../chat/chat.gateway';
import * as crypto from 'crypto';
import { CreateTechnicianOrderDto } from './dto/create-technician-order.dto';
import { ReviewOrderDto } from './dto/review-order.dto';
import { BookingMutexService } from './booking-mutex.service';
import { ReferralQualificationService } from '../referrals/referral-qualification.service';
import { RewardFundService } from '../referrals/reward-fund.service';
import { assertWithinServiceSchedule } from './order-work-schedule';
import {
  BOOKING_CONFLICT_MESSAGE,
  DEFAULT_BOOKING_DURATION_MINUTES,
  throwIfBookingSlotConflict,
} from './booking-conflict';
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
import { WechatSubscribeMessagesService } from '../wechat-subscribe-messages/wechat-subscribe-messages.service';
import { UpdateServiceRecordDto } from './dto/update-service-record.dto';
import { CorrectServiceRecordAssociationDto } from './dto/correct-service-record-association.dto';

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
  | 'rejected'
  | 'no_show'
  | 'expired';

export const STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending_quote: ['pending_agree', 'cancelled', 'rejected', 'expired'],
  pending_agree: ['pending_confirm', 'pending_quote', 'cancelled', 'expired'],
  pending_confirm: ['pending_agree', 'pending_home', 'pending_shop', 'cancelled', 'expired'],
  pending_client_confirm: ['pending_confirm', 'cancelled', 'expired'],
  pending_home: ['in_progress', 'cancelled'],
  pending_shop: ['in_progress', 'cancelled'],
  in_progress: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
  rejected: [],
  no_show: [],
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
    @Optional() private readonly bookingDays?: BookingDaysService,
    @Optional() private readonly wechatSubscribe?: WechatSubscribeMessagesService,
  ) {}

  async createForTechnician(
    technicianId: number,
    dto: CreateTechnicianOrderDto,
  ) {
    if (!isLaunchTechnician(technicianId)) {
      throw new ForbiddenException('该美甲师不在小程序首期开放范围内');
    }
    assertLaunchShopService(dto.serviceType);
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

    if (dto.applicationKey) {
      const existing = await this.prisma.order.findUnique({
        where: { applicationKey: dto.applicationKey },
        include: {
          technician: { select: { id: true, name: true, phone: true } },
          customer: { select: { id: true, name: true, phone: true, avatarUrl: true } },
          review: { select: { rating: true } },
          revenue: { select: { amount: true, recognizedAt: true } },
        },
      });
      if (existing) {
        if (existing.technicianId !== technicianId || existing.customerId !== customerId) {
          throw new BadRequestException('预约申请标识已被使用');
        }
        return existing;
      }
    }
    if (this.subscriptions) {
      await this.subscriptions.assertCanCreateBooking(technicianId);
    }

    if (dto.submitQuote) {
      if (!resolvedClientUserId || !Number.isFinite(dto.price) || Number(dto.price) <= 0) {
        throw new BadRequestException('请选择已注册客户并填写有效报价');
      }
      const binding = await this.prisma.clientTechBinding.findFirst({ where: {
        techId: technicianId, clientId: resolvedClientUserId, status: 'active', client: { status: 'active' },
      } });
      if (!binding) throw new BadRequestException('客户未有效绑定，无法发起预约');
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

    if (dto.submitQuote) {
      if (initialStart <= new Date()) throw new BadRequestException('预约时间已过期，请重新选择');
      if (['shop', '到店美甲'].includes(dto.serviceType || '')) {
        await this.assertTechnicianShopSchedule(technicianId, dto.address, initialStart, initialEnd, true);
      }
    }

    const confirmToken = dto.shareToClient ? crypto.randomUUID() : null;
    const confirmTokenExpiresAt = confirmToken
      ? new Date(Date.now() + CONFIRM_TOKEN_TTL_MS)
      : null;

    const createOrder = () =>
      this.prisma.$transaction(async (tx) => {
        await assertBookingAccountState(tx, technicianId, dto.clientUserId ?? resolvedClientUserId);
        const blockEndTime = this.bookingDays
          ? (await this.bookingDays.prepareSlot(
              tx,
              technicianId,
              businessDate(initialStart),
              initialEnd,
            )).blockEndTime
          : initialEnd;
        const referralAttribution = dto.sourceLeadId
          ? await tx.lead.findUnique({
              where: { id: dto.sourceLeadId },
              select: { referralRelationId: true, referrerClientId: true },
            })
          : null;
        const order = await tx.order.create({
          data: {
            orderNo: this.generateOrderNo(),
            applicationKey: dto.applicationKey ?? null,
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
              dto.submitQuote ? 'pending_agree' : dto.shareToClient || (dto.price != null && dto.price > 0)
                ? 'pending_client_confirm'
                : 'pending_quote',
            remark:
              dto.note || structuredService?.name || dto.serviceName || null,
            customDescription: dto.customDescription || null,
            customImages: dto.customImages?.length
              ? JSON.stringify(dto.customImages)
              : null,
            ...(dto.submitQuote ? {
              bookingPhase: 'application',
              quoteVersion: 1,
              quotedAt: new Date(),
              finalPriceFen: Math.round(dto.price! * 100),
              serviceSubtotalFen: Math.round(dto.price! * 100),
              totalDurationMinutes: Math.round((initialEnd.getTime() - initialStart.getTime()) / 60000),
              serviceLines: { create: [{
                nameSnapshot: dto.serviceName,
                unitPriceFen: Math.round(dto.price! * 100), subtotalFen: Math.round(dto.price! * 100),
                durationMinutes: Math.round((initialEnd.getTime() - initialStart.getTime()) / 60000),
                quantity: 1, sortOrder: 0, source: 'manual',
              }] },
            } : {}),
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
      if (
        dto.applicationKey &&
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const existing = await this.prisma.order.findUnique({
          where: { applicationKey: dto.applicationKey },
          include: {
            technician: { select: { id: true, name: true, phone: true } },
            customer: { select: { id: true, name: true, phone: true, avatarUrl: true } },
            review: { select: { rating: true } },
            revenue: { select: { amount: true, recognizedAt: true } },
          },
        });
        if (existing?.technicianId === technicianId && existing.customerId === customerId) {
          return existing;
        }
      }
      throwIfBookingSlotConflict(error);
    }

    if (dto.submitQuote) void this.wechatSubscribe?.sendBookingStatusEvent(order, 'client', '待确认报价', '美甲师已为您发起预约，请确认报价');

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

  async repeatBooking(
    id: number,
    technicianId: number,
    dto: { startTime: string; serviceName?: string; note?: string },
  ) {
    const order = await this.findOneForTechnician(id, technicianId);
    if (!['completed', 'cancelled', 'rejected', 'expired', 'no_show'].includes(order.status)) {
      throw new BadRequestException('当前预约尚未结束，不能再次预约');
    }

    const startTime = new Date(dto.startTime);
    if (Number.isNaN(startTime.getTime()) || startTime.getTime() <= Date.now()) {
      throw new BadRequestException('请选择将来的预约时间');
    }
    const originalDuration =
      new Date(order.endTime).getTime() - new Date(order.startTime).getTime();
    const duration = originalDuration > 0
      ? originalDuration
      : Math.max(1, order.totalDurationMinutes || 120) * 60 * 1000;
    const endTime = new Date(startTime.getTime() + duration);
    await this.assertTechnicianWorkSchedule(technicianId, startTime, endTime);
    if (this.subscriptions) {
      await this.subscriptions.assertCanCreateBooking(technicianId);
    }

    const createRepeat = () => this.prisma.$transaction(async (tx) => {
      await assertBookingAccountState(tx, technicianId, order.clientUserId);
      const blockEndTime = this.bookingDays
        ? (await this.bookingDays.prepareSlot(
            tx,
            technicianId,
            businessDate(startTime),
            endTime,
          )).blockEndTime
        : endTime;
      const conflict = await tx.blockedTimeSlot.findFirst({
        where: {
          techId: technicianId,
          startTime: { lt: blockEndTime },
          endTime: { gt: startTime },
        },
        select: { id: true },
      });
      if (conflict) {
        throw new BadRequestException('该时间段已经被其他用户预约，请重新选择预约时间');
      }

      const repeated = await tx.order.create({
        data: {
          orderNo: this.generateOrderNo(),
          technicianId,
          customerId: order.customerId,
          clientUserId: order.clientUserId,
          addressId: order.addressId,
          serviceId: order.serviceId,
          sourceWorkId: order.sourceWorkId,
          startTime,
          endTime,
          address: order.address,
          serviceType: order.serviceType,
          remark: dto.note?.trim() || null,
          customTitle: dto.serviceName?.trim() || order.customTitle,
          customDescription: order.customDescription,
          customImages: order.customImages,
          quotePrice: order.quotePrice,
          status: Number(order.quotePrice || 0) > 0
            ? 'pending_client_confirm'
            : 'pending_quote',
          source: 'technician',
          expectedDate: startTime,
          estimatedAmount: order.quotePrice,
          isRepeatBooking: true,
          sourceServiceRecordId: order.sourceServiceRecordId,
          attributionChannel: 'repeat',
          bookingType: order.bookingType,
          serviceSubtotalFen: order.serviceSubtotalFen,
          discountAmountFen: order.discountAmountFen,
          finalPriceFen: order.finalPriceFen,
          totalDurationMinutes: Math.round(duration / 60000),
          depositModeSnapshot: order.depositModeSnapshot,
          depositValueSnapshot: order.depositValueSnapshot,
          pricingDetails: order.pricingDetails,
          serviceLines: {
            create: (order.serviceLines || []).map((line) => ({
              serviceId: line.serviceId,
              servicePublicIdSnapshot: line.servicePublicIdSnapshot,
              nameSnapshot: line.nameSnapshot,
              unitPriceFen: line.unitPriceFen,
              durationMinutes: line.durationMinutes,
              quantity: line.quantity,
              subtotalFen: line.subtotalFen,
              source: line.source,
              sortOrder: line.sortOrder,
            })),
          },
        },
        include: {
          customer: { select: { id: true, name: true, phone: true, avatarUrl: true } },
          serviceLines: { orderBy: { sortOrder: 'asc' } },
        },
      });
      await tx.blockedTimeSlot.create({
        data: {
          techId: technicianId,
          orderId: repeated.id,
          startTime,
          endTime: blockEndTime,
          reason: 'booking',
        },
      });
      return repeated;
    });

    try {
      return this.bookingMutex
        ? await this.bookingMutex.runExclusive(technicianId, createRepeat)
        : await createRepeat();
    } catch (error) {
      throwIfBookingSlotConflict(error);
    }
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
          service: { select: { name: true } },
          sourceWork: { select: { title: true } },
          customServiceRequest: { select: { title: true } },
          designRequest: { select: { title: true } },
          serviceLines: { select: { nameSnapshot: true }, orderBy: { sortOrder: 'asc' } },
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
        service: { select: { name: true } },
          sourceWork: { select: { title: true } },
          customServiceRequest: { select: { title: true } },
          designRequest: { select: { title: true } },
          serviceLines: { select: { nameSnapshot: true }, orderBy: { sortOrder: 'asc' } },
          technician: { select: { id: true, name: true, phone: true } },
        customer: {
          select: {
            id: true,
            name: true,
            phone: true,
            avatarUrl: true,
            preferredStyles: true,
            preferredColors: true,
            preferredNailShapes: true,
            preferredNailLengths: true,
            allergies: true,
            contraindications: true,
            specialReminders: true,
            profileFacts: {
              where: { status: 'active' },
              orderBy: { lastConfirmedAt: 'desc' },
              take: 20,
            },
            serviceRecords: {
              orderBy: { actualEndTime: 'desc' },
              take: 3,
              include: { photos: { orderBy: { sortOrder: 'asc' } } },
            },
          },
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
          depositStatus: true,
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

  async findBlockedSlots(technicianId: number) {
    return this.prisma.blockedTimeSlot.findMany({
      where: { techId: technicianId, endTime: { gte: new Date() } },
      select: { orderId: true, startTime: true, endTime: true },
      orderBy: { startTime: 'asc' },
    });
  }

  async findOne(id: number) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        technician: { select: { id: true, name: true, phone: true } },
        customer: {
          select: {
            id: true,
            name: true,
            phone: true,
            avatarUrl: true,
            tags: true,
            notes: true,
            allergies: true,
            contraindications: true,
            specialReminders: true,
            preferredStyles: true,
            preferredColors: true,
            preferredNailShapes: true,
            preferredNailLengths: true,
            profileFacts: {
              where: { status: { in: ['active', 'pending'] } },
              orderBy: { lastConfirmedAt: 'desc' },
              select: {
                id: true,
                category: true,
                content: true,
                status: true,
                sourceRecordId: true,
                confirmationCount: true,
                firstObservedAt: true,
                lastConfirmedAt: true,
              },
            },
            serviceRecords: {
              orderBy: [{ actualEndTime: 'desc' }, { id: 'desc' }],
              take: 3,
              select: {
                id: true,
                orderId: true,
                status: true,
                actualStartTime: true,
                actualEndTime: true,
                reactionLevel: true,
                nailCondition: true,
                clientReaction: true,
                discomfortNotes: true,
                preferenceNotes: true,
                careAdvice: true,
                nextServiceNotes: true,
                materials: true,
                tools: true,
                order: {
                  select: {
                    id: true,
                    customTitle: true,
                    service: { select: { name: true } },
                    serviceLines: {
                      select: { nameSnapshot: true },
                      orderBy: { sortOrder: 'asc' },
                    },
                  },
                },
              },
            },
            _count: { select: { serviceRecords: true } },
          },
        },
        revenue: true,
        review: { select: { rating: true, content: true, photos: true, updatedAt: true } },
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
        sourceWork: {
          select: {
            id: true,
            title: true,
            coverUrl: true,
            standardPriceFen: true,
            preparation: true,
          },
        },
        intentWorks: {
          orderBy: { sortOrder: 'asc' },
          select: {
            work: {
              select: {
                id: true,
                title: true,
                coverUrl: true,
                preparation: true,
              },
            },
          },
        },
        worksFromOrder: {
          select: {
            id: true,
            title: true,
            coverUrl: true,
            assetStatus: true,
            publicationStatus: true,
            preparation: true,
          },
          take: 1,
        },
        serviceRecord: {
          include: { photos: { orderBy: [{ stage: 'asc' }, { sortOrder: 'asc' }] } },
        },
        promotion: true,
        serviceLines: { orderBy: { sortOrder: 'asc' } },
      },
    });

    if (!order) {
      throw new NotFoundException('订单不存在');
    }

    if (order.serviceRecord) {
      (order.serviceRecord as { missing?: string[] }).missing =
        this.serviceRecordMissing(order.serviceRecord);
    }

    return order;
  }

  private serviceRecordMissing(record: {
    photos?: Array<{ stage: string }> | null;
    nailCondition?: string | null;
    reactionLevel?: string | null;
  } | null): string[] {
    if (!record) {
      return ['beforePhoto', 'afterPhoto', 'nailCondition', 'reactionLevel'];
    }
    const stages = new Set((record.photos || []).map((photo) => photo.stage));
    const missing: string[] = [];
    if (!stages.has('before')) missing.push('beforePhoto');
    if (!stages.has('after')) missing.push('afterPhoto');
    if (!String(record.nailCondition || '').trim()) missing.push('nailCondition');
    if (!record.reactionLevel) missing.push('reactionLevel');
    return missing;
  }

  async findOneForTechnician(id: number, technicianId: number) {
    const order = await this.findOne(id);

    if (order.technicianId !== technicianId) {
      throw new ForbiddenException('无权访问该订单');
    }

    return order;
  }

  async startService(orderId: number, technicianId: number) {
    const order = await this.findOneForTechnician(orderId, technicianId);
    if (
      ['completed', 'cancelled', 'rejected', 'expired', 'no_show'].includes(
        order.status,
      )
    ) {
      throw new BadRequestException('当前预约状态不能开始服务');
    }

    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      const claimed = await tx.order.updateMany({
        where: {
          id: orderId,
          technicianId,
          status: { in: ['pending_home', 'pending_shop'] },
        },
        data: { status: 'in_progress', tradeStatus: 'balance_pending' },
      });
      if (claimed.count === 0) {
        const current = await tx.order.findUnique({
          where: { id: orderId },
          select: { status: true },
        });
        if (current?.status !== 'in_progress') {
          throw new BadRequestException('当前预约状态不能开始服务');
        }
      }
      await this.ensureServiceDraft(tx, order, now);
    });

    return this.findOneForTechnician(orderId, technicianId);
  }

  /** 开始服务时确保存在服务记录草稿，手动开始与定时任务共用。 */
  async ensureServiceDraft(
    tx: Prisma.TransactionClient,
    order: { id: number; technicianId: number; customerId: number },
    now: Date = new Date(),
  ) {
    return tx.serviceRecord.upsert({
      where: { orderId: order.id },
      create: {
        orderId: order.id,
        technicianId: order.technicianId,
        customerId: order.customerId,
        status: 'draft',
        actualStartTime: now,
      },
      update: {},
      select: { id: true },
    });
  }

  async saveServiceRecord(
    orderId: number,
    technicianId: number,
    dto: UpdateServiceRecordDto,
  ) {
    const order = await this.findOneForTechnician(orderId, technicianId);
    if (['cancelled', 'rejected', 'expired', 'no_show'].includes(order.status)) {
      throw new BadRequestException('当前预约状态不能编辑美甲记录');
    }
    if (dto.complete && order.status !== 'completed') {
      throw new BadRequestException('订单完成后才能将美甲记录标记为已完善');
    }

    const text = (value?: string) => value?.trim() || null;
    const photoGroups = [
      ['before', dto.beforePhotos],
      ['during', dto.duringPhotos],
      ['after', dto.afterPhotos],
    ] as const;
    for (const [, urls] of photoGroups) {
      if (urls && urls.length > 9) throw new BadRequestException('每个阶段最多上传 9 张照片');
      if (urls?.some((url) => !url || url.length > 2048)) {
        throw new BadRequestException('照片地址无效');
      }
    }

    const allowedFactCategories = new Set([
      'allergy',
      'contraindication',
      'preference',
      'communication',
      'reminder',
    ]);
    const facts = (dto.profileFacts || []).map((fact) => ({
      category: String(fact?.category || '').trim(),
      content: String(fact?.content || '').trim(),
    }));
    if (
      facts.some(
        (fact) =>
          !allowedFactCategories.has(fact.category) ||
          !fact.content ||
          fact.content.length > 500,
      )
    ) {
      throw new BadRequestException('客户档案信息格式不正确');
    }

    return this.prisma.$transaction(async (tx) => {
      const record = await tx.serviceRecord.upsert({
        where: { orderId },
        create: {
          orderId,
          technicianId,
          customerId: order.customerId,
          status: dto.complete ? 'complete' : 'draft',
          completedAt: dto.complete ? new Date() : null,
          materials: text(dto.materials),
          tools: text(dto.tools),
          techniques: text(dto.techniques),
          nailCondition: text(dto.nailCondition),
          customerFeedback: text(dto.customerFeedback),
          clientReaction: text(dto.clientReaction),
          discomfortNotes: text(dto.discomfortNotes),
          preferenceNotes: text(dto.preferenceNotes),
          nextServiceNotes: text(dto.nextServiceNotes),
          careAdvice: text(dto.careAdvice),
          preServiceNotes: text(dto.preServiceNotes),
          clientRequests: text(dto.clientRequests),
          reactionLevel: text(dto.reactionLevel),
          safetyConfirmedAt: dto.safetyConfirmed ? new Date() : null,
          nailConditionConfirmedAt: dto.nailConditionConfirmed ? new Date() : null,
        },
        update: {
          ...(dto.complete !== undefined
            ? {
                status: dto.complete ? 'complete' : 'draft',
                completedAt: dto.complete ? new Date() : null,
              }
            : {}),
          ...(dto.materials !== undefined ? { materials: text(dto.materials) } : {}),
          ...(dto.tools !== undefined ? { tools: text(dto.tools) } : {}),
          ...(dto.techniques !== undefined ? { techniques: text(dto.techniques) } : {}),
          ...(dto.nailCondition !== undefined ? { nailCondition: text(dto.nailCondition) } : {}),
          ...(dto.customerFeedback !== undefined ? { customerFeedback: text(dto.customerFeedback) } : {}),
          ...(dto.clientReaction !== undefined ? { clientReaction: text(dto.clientReaction) } : {}),
          ...(dto.discomfortNotes !== undefined ? { discomfortNotes: text(dto.discomfortNotes) } : {}),
          ...(dto.preferenceNotes !== undefined ? { preferenceNotes: text(dto.preferenceNotes) } : {}),
          ...(dto.nextServiceNotes !== undefined ? { nextServiceNotes: text(dto.nextServiceNotes) } : {}),
          ...(dto.careAdvice !== undefined ? { careAdvice: text(dto.careAdvice) } : {}),
          ...(dto.preServiceNotes !== undefined ? { preServiceNotes: text(dto.preServiceNotes) } : {}),
          ...(dto.clientRequests !== undefined ? { clientRequests: text(dto.clientRequests) } : {}),
          ...(dto.reactionLevel !== undefined ? { reactionLevel: text(dto.reactionLevel) } : {}),
          ...(dto.safetyConfirmed === true ? { safetyConfirmedAt: new Date() } : {}),
          ...(dto.nailConditionConfirmed === true ? { nailConditionConfirmedAt: new Date() } : {}),
        },
      });

      for (const [stage, urls] of photoGroups) {
        if (urls === undefined) continue;
        await tx.serviceRecordPhoto.deleteMany({ where: { serviceRecordId: record.id, stage } });
        if (urls.length) {
          await tx.serviceRecordPhoto.createMany({
            data: urls.map((url, sortOrder) => ({
              serviceRecordId: record.id,
              stage,
              url,
              sortOrder,
            })),
          });
        }
      }

      for (const fact of facts) {
        await tx.customerProfileFact.upsert({
          where: {
            customerId_category_content: {
              customerId: order.customerId,
              category: fact.category,
              content: fact.content,
            },
          },
          create: {
            customerId: order.customerId,
            category: fact.category,
            content: fact.content,
            sourceRecordId: record.id,
            confirmedById: technicianId,
          },
          update: {
            status: 'active',
            sourceRecordId: record.id,
            confirmedById: technicianId,
            lastConfirmedAt: new Date(),
            confirmationCount: { increment: 1 },
          },
        });
      }

      let recordIsComplete = false;
      if (dto.complete) {
        const saved = await tx.serviceRecord.findUnique({
          where: { id: record.id },
          select: {
            nailCondition: true,
            reactionLevel: true,
            photos: { select: { stage: true } },
          },
        });
        recordIsComplete = this.serviceRecordMissing(saved).length === 0;
        if (!recordIsComplete) {
          await tx.serviceRecord.update({
            where: { id: record.id },
            data: { status: 'draft', completedAt: null },
          });
        }
      }

      if (recordIsComplete) {
        await tx.actionTask.updateMany({
          where: {
            technicianId,
            type: 'complete_service_record',
            relatedType: 'order',
            relatedId: orderId,
          },
          data: { status: 'completed', resolvedAt: new Date() },
        });
      }

      const savedRecord = await tx.serviceRecord.findUnique({
        where: { orderId },
        include: { photos: { orderBy: [{ stage: 'asc' }, { sortOrder: 'asc' }] } },
      });
      return savedRecord
        ? { ...savedRecord, missing: this.serviceRecordMissing(savedRecord) }
        : null;
    });
  }

  async correctServiceRecordAssociation(
    orderId: number,
    technicianId: number,
    dto: CorrectServiceRecordAssociationDto,
  ) {
    const order = await this.findOneForTechnician(orderId, technicianId);
    const record = order.serviceRecord;
    if (!record) throw new BadRequestException('美甲记录尚未创建');
    const reason = dto.reason.trim();

    if (dto.entityType === 'customer') {
      if (record.customerId === dto.targetId) return order;
      const customer = await this.prisma.customer.findFirst({
        where: { id: dto.targetId, technicianId },
        select: { id: true },
      });
      if (!customer) throw new NotFoundException('目标客户不存在');
      const syncedFactCount = await this.prisma.customerProfileFact.count({
        where: { sourceRecordId: record.id },
      });
      if (syncedFactCount > 0) {
        throw new BadRequestException('本记录已同步客户档案，请先处理已同步档案后再更正客户');
      }
      await this.prisma.$transaction(async (tx) => {
        await tx.order.update({ where: { id: orderId }, data: { customerId: dto.targetId } });
        await tx.serviceRecord.update({ where: { id: record.id }, data: { customerId: dto.targetId } });
        await tx.serviceRecordAssociationCorrection.create({ data: {
          orderId, recordId: record.id, technicianId, entityType: 'customer',
          fromId: record.customerId, toId: dto.targetId, reason,
        } });
      });
    } else {
      const work = await this.prisma.nailWork.findFirst({
        where: { id: dto.targetId, techId: technicianId },
        select: { id: true },
      });
      if (!work) throw new NotFoundException('目标作品不存在');
      if (order.sourceWorkId === dto.targetId) return order;
      await this.prisma.$transaction(async (tx) => {
        await tx.order.update({ where: { id: orderId }, data: { sourceWorkId: dto.targetId } });
        await tx.serviceRecordAssociationCorrection.create({ data: {
          orderId, recordId: record.id, technicianId, entityType: 'work',
          fromId: order.sourceWorkId, toId: dto.targetId, reason,
        } });
      });
    }
    return this.findOneForTechnician(orderId, technicianId);
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

    if ((order.acceptedProposal || order.quoteVersion > 0) && ['pending_quote', 'pending_confirm', 'pending_agree'].includes(order.status)) {
      if (dto.price !== undefined || dto.depositAmount !== undefined || dto.isDepositPaid !== undefined || dto.startTime !== undefined || dto.endTime !== undefined || dto.serviceType !== undefined) {
        throw new BadRequestException('请在确认方案中修改价格、定金或时间，调整后由客户确认');
      }
    }
    if (order.quickBooking && (dto.price !== undefined || (order.status === 'pending_agree' && (dto.startTime !== undefined || dto.endTime !== undefined || dto.serviceType !== undefined)))) throw new BadRequestException('报价已提交，调整安排需先由客户拒绝后重新报价');
    const updateData: any = {};
    const timeChanged =
      dto.startTime !== undefined || dto.endTime !== undefined;

    if (dto.serviceType !== undefined) updateData.serviceType = dto.serviceType;
    if (dto.price !== undefined) {
      const finalPriceFen = Math.round(dto.price * 100);
      updateData.quotePrice = dto.price;
      updateData.finalPriceFen = finalPriceFen;
      updateData.discountAmountFen = Math.max(
        0,
        (order.serviceSubtotalFen ?? 0) - finalPriceFen,
      );
    }
    if (dto.note !== undefined) updateData.remark = dto.note;
    if (dto.depositAmount !== undefined)
      updateData.depositAmount = dto.depositAmount;
    if (dto.isDepositPaid !== undefined) {
      updateData.isDepositPaid = dto.isDepositPaid;
      updateData.depositStatus = dto.isDepositPaid ? 'paid' : 'pending';
      updateData.depositConfirmedAt = dto.isDepositPaid ? new Date() : null;
    }

    if (!timeChanged) {
      return this.prisma.order.update({
        where: { id },
        data: updateData,
      });
    }

    if (order.quickBooking && !order.totalDurationMinutes) throw new BadRequestException('请在报价面板确认时间和时长');
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

    const serviceBlockEnd =
      endTime.getTime() > startTime.getTime()
        ? endTime
        : new Date(
            startTime.getTime() + DEFAULT_BOOKING_DURATION_MINUTES * 60000,
          );
    await this.assertTechnicianWorkSchedule(technicianId, startTime, serviceBlockEnd);
    const effectiveServiceType = dto.serviceType ?? order.serviceType;
    if (['shop', '到店美甲'].includes(effectiveServiceType || '')) {
      await this.assertTechnicianShopSchedule(
        technicianId,
        order.address || '',
        startTime,
        serviceBlockEnd,
      );
    }

    updateData.startTime = startTime;
    updateData.endTime = endTime;
    updateData.reminderDaySent = false;
    updateData.reminderHourSent = false;

    const updated = await this.prisma.$transaction(async (tx) => {
      const blockEnd = this.bookingDays
        ? (await this.bookingDays.prepareSlot(
            tx,
            technicianId,
            businessDate(startTime),
            serviceBlockEnd,
            id,
            businessDate(order.startTime) === businessDate(startTime),
          )).blockEndTime
        : serviceBlockEnd;
      const conflict = await tx.blockedTimeSlot.findFirst({
        where: {
          techId: technicianId,
          OR: [{ orderId: null }, { orderId: { not: id } }],
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
    void this.wechatSubscribe?.sendBookingStatusEvent(
      { ...order, ...updated },
      'client',
      '已改期',
      '美甲师修改了预约时间，请及时查看',
    );
    return updated;
  }

  async review(id: number, technicianId: number, dto: ReviewOrderDto) {
    const work = () => this.reviewLocked(id, technicianId, dto);
    const updated = await (this.bookingMutex ? this.bookingMutex.runExclusive(technicianId, work) : work());
    if (updated.status === 'pending_confirm') return this.confirm(id);
    void this.wechatSubscribe?.sendBookingStatusEvent(
      updated,
      'client',
      '待确认',
      '美甲师已发送报价，请及时确认',
    );
    return updated;
  }

  async withdrawQuote(id: number, technicianId: number) {
    const order = await this.findOneForTechnician(id, technicianId);
    if (order.status !== 'pending_agree') {
      throw new BadRequestException('仅待客户确认的报价可以撤回');
    }

    let systemMessage: any = null;
    let conversationId: number | null = null;
    const updated = await this.prisma.$transaction(async (tx) => {
      const claimed = await tx.order.updateMany({
        where: { id, status: 'pending_agree', updatedAt: order.updatedAt },
        data: {
          status: 'pending_quote',
          bookingPhase: 'application',
          quoteVersion: { increment: 1 },
        },
      });
      if (claimed.count !== 1) {
        throw new BadRequestException('报价状态已变化，请刷新后重试');
      }
      if (order.clientUserId) {
        const preview = '美甲师已撤回报价，将重新调整方案～';
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

      return {
        ...order,
        status: 'pending_quote',
        bookingPhase: 'application',
        quoteVersion: (order.quoteVersion || 0) + 1,
      };
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
        console.error('[OrdersService] Failed to push notification via WebSocket:', e);
      }
    }

    void this.wechatSubscribe?.sendBookingStatusEvent(
      updated,
      'client',
      '已撤回',
      '美甲师撤回了报价，请等待新方案',
    );

    return updated;
  }

  private async reviewLocked(id: number, technicianId: number, dto: ReviewOrderDto) {
    const order = await this.findOneForTechnician(id, technicianId);

    if (!['pending_quote', 'pending_confirm', 'pending_agree'].includes(order.status)) {
      throw new BadRequestException('当前订单状态不支持报价');
    }

    if ((order.quoteVersion || 0) !== (dto.quoteVersion || 0)) throw new BadRequestException('方案已更新，请刷新后重试');
    const manual = dto.quoteMode === 'manual';
    if (manual && !order.quickBooking) throw new BadRequestException('手工报价仅用于极简预约');
    if (dto.continueAccepting !== undefined && !Number.isInteger(dto.dayVersion)) throw new BadRequestException('接单设置版本无效');
    if (manual && (!Number.isInteger(dto.amountFen) || dto.amountFen! <= 0 || dto.amountFen! > 100000000 || !Number.isInteger(dto.durationMinutes) || dto.durationMinutes! < 1 || dto.durationMinutes! > 1440 || (dto.services?.length) || dto.discountAmountFen)) throw new BadRequestException('报价金额或服务时长无效');
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
        category: true,
      },
    });
    const serviceLines = dto.useCurrentServices ? (order.serviceLines || []).filter(line => line.source !== 'surcharge').map(({ serviceId, servicePublicIdSnapshot, nameSnapshot, unitPriceFen, subtotalFen, durationMinutes, quantity, sortOrder }) => ({ serviceId, servicePublicIdSnapshot, nameSnapshot, unitPriceFen, subtotalFen, durationMinutes, quantity, sortOrder })) : manual ? [{
      serviceId: null, servicePublicIdSnapshot: null, nameSnapshot: '本次美甲服务',
      unitPriceFen: dto.amountFen!, subtotalFen: dto.amountFen!, durationMinutes: dto.durationMinutes!, quantity: 1, sortOrder: 0,
    }] : buildServiceSnapshotLines(services, requested);
    const summary = summarizeSnapshotLines(serviceLines);
    if (!serviceLines.length) throw new BadRequestException('请选择基础服务组合');
    const surchargeIds = [...new Set(dto.surchargeIds || [])];
    const extras = surchargeIds.length ? await this.prisma.service.findMany({ where: {
      technicianId, publicId: { in: surchargeIds }, category: { in: SURCHARGE_CATEGORIES }, isBookable: true, archivedAt: null,
    } }) : [];
    if (extras.length !== surchargeIds.length) throw new BadRequestException('附加服务已失效，请重新选择');
    if (!dto.useCurrentServices && services.some(item => (item as any).category && SURCHARGE_CATEGORIES.includes((item as any).category))) throw new BadRequestException('附加费用请在附加服务中选择');
    const extraLines = extras.map((item, index) => ({
      serviceId: item.id, servicePublicIdSnapshot: item.publicId, nameSnapshot: item.name,
      unitPriceFen: item.priceMinFen || 0, subtotalFen: item.priceMinFen || 0,
      durationMinutes: 0, quantity: 1, sortOrder: serviceLines.length + index, source: 'surcharge',
    }));
    const coreFen = dto.corePriceFen ?? (dto.useCurrentServices
      ? (order.pricingDetails ? JSON.parse(order.pricingDetails).coreFen : order.finalPriceFen ?? summary.serviceSubtotalFen)
      : finalPriceFen(summary.serviceSubtotalFen, dto.discountAmountFen || 0));
    if (!dto.useCurrentServices && coreFen > summary.serviceSubtotalFen) throw new BadRequestException('基础组合报价不能超过服务合计');
    const totals = quoteTotals(summary.serviceSubtotalFen, coreFen, extraLines.reduce((sum, line) => sum + line.subtotalFen, 0), dto.finalPriceFen);
    const quotedFinalPriceFen = totals.finalFen;
    const discountAmountFen = Math.max(0, summary.serviceSubtotalFen + totals.extrasFen - quotedFinalPriceFen);
    const depositModeSnapshot = dto.depositAmount !== undefined ? 'fixed' : order.depositModeSnapshot || 'none';
    const depositValueSnapshot = dto.depositAmount !== undefined ? Math.round(dto.depositAmount * 100) : order.depositValueSnapshot || 0;
    const depositAmount = (depositFen(quotedFinalPriceFen, depositModeSnapshot, depositValueSnapshot) || 0) / 100;
    // An unchanged explicit amount preserves the accepted calculation rule.
    const sameDeposit = dto.depositAmount !== undefined && Math.round((order.depositAmount || 0) * 100) === depositValueSnapshot;
    const depositRule = sameDeposit ? { depositModeSnapshot: order.depositModeSnapshot, depositValueSnapshot: order.depositValueSnapshot } : { depositModeSnapshot, depositValueSnapshot };
    const startTime = parseBusinessDateTime(dto.serviceDate, dto.startTime);
    const endTime = new Date(
      startTime.getTime() + summary.totalDurationMinutes * 60000,
    );

    if (
      Number.isNaN(startTime.getTime()) ||
      Number.isNaN(endTime.getTime()) ||
      summary.totalDurationMinutes <= 0 || (order.quickBooking && startTime.getTime() <= Date.now())
    ) {
      throw new BadRequestException('预约时间或预估时长无效');
    }
    await this.assertTechnicianWorkSchedule(technicianId, startTime, endTime);
    if (order.serviceType === '到店美甲') await this.assertTechnicianShopSchedule(technicianId, order.address || '', startTime, endTime, true);
    const blockedConflict = await this.prisma.blockedTimeSlot.findFirst({
      where: {
        techId: technicianId,
        OR: [{ orderId: null }, { orderId: { not: id } }],
        startTime: { lt: endTime },
        endTime: { gt: startTime },
      },
      select: { id: true },
    });
    if (blockedConflict) {
      throw new BadRequestException(BOOKING_CONFLICT_MESSAGE);
    }

    const proposed = proposalSnapshot({ ...order, pricingDetails: JSON.stringify(totals), startTime, endTime, finalPriceFen: quotedFinalPriceFen, depositAmount, ...depositRule }, [...serviceLines, ...extraLines]);
    const unchanged = !!order.acceptedProposal && order.acceptedProposal === proposed;
    let systemMessage: any = null;
    let conversationId: number | null = null;

    const updated = await this.prisma.$transaction(async (tx) => {
      const blockEndTime = this.bookingDays
        ? (await this.bookingDays.prepareSlot(
            tx,
            technicianId,
            dto.serviceDate,
            endTime,
            id,
            businessDate(order.startTime) === dto.serviceDate,
          )).blockEndTime
        : endTime;
      const transactionConflict = await tx.blockedTimeSlot.findFirst({
        where: {
          techId: technicianId,
          OR: [{ orderId: null }, { orderId: { not: id } }],
          startTime: { lt: blockEndTime },
          endTime: { gt: startTime },
        },
        select: { id: true },
      });
      if (transactionConflict) throw new BadRequestException(BOOKING_CONFLICT_MESSAGE);
      const claimed = await tx.order.updateMany({ where: { id, status: order.status, updatedAt: order.updatedAt }, data: { quoteVersion: { increment: 1 } } });
      if (claimed.count !== 1) throw new BadRequestException('预约方案已更新，请刷新');
      if (dto.continueAccepting !== undefined) {
        if (!this.bookingDays) throw new BadRequestException('接单设置服务不可用');
        await this.bookingDays.save(tx, technicianId, dto.serviceDate, dto.continueAccepting, dto.dayVersion!);
      }
      const receipts = await tx.paymentOrder.aggregate({ where: { orderId: id, status: 'paid', paymentType: 'deposit' }, _sum: { amountCents: true } });
      const received = receipts._sum.amountCents || 0;
      if (received > depositAmount * 100 || (received > 0 && dto.isDepositPaid === false)) throw new BadRequestException('已有定金收款，请先处理退款');
      if (dto.isDepositPaid && depositAmount * 100 > received) {
        const receiptId = crypto.randomUUID();
        await tx.paymentOrder.create({ data: {
          paymentNo: `OFFLINE_${receiptId}`, idempotencyKey: `quote-deposit:${id}:${order.quoteVersion || 0}`,
          orderId: id, technicianId, clientUserId: order.clientUserId, paymentType: 'deposit',
          amountCents: Math.round(depositAmount * 100) - received, channel: 'offline', status: 'paid', paidAt: new Date(),
        } });
      }
      const depositPaid = depositAmount > 0 && (dto.isDepositPaid === true || received >= Math.round(depositAmount * 100));
      const updated = await tx.order.update({
        where: { id },
        data: {
          startTime,
          endTime,
          pricingDetails: JSON.stringify(totals),
          ...depositRule,
          serviceSubtotalFen: summary.serviceSubtotalFen,
          discountAmountFen,
          finalPriceFen: quotedFinalPriceFen,
          totalDurationMinutes: summary.totalDurationMinutes,
          quotePrice: quotedFinalPriceFen / 100,
          quoteRemark: dto.remark || null,
          quotedAt: new Date(),
          status: unchanged ? 'pending_confirm' : 'pending_agree',
          bookingPhase: 'application',
          expectedDate: startTime,
          expectedTimeSlot: dto.startTime,
          depositAmount,
          isDepositPaid: depositPaid,
          depositStatus: depositPaid ? 'paid' : 'pending',
          depositConfirmedAt: depositPaid ? (order.depositConfirmedAt || new Date()) : null,
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
        data: [...serviceLines.map((line) => ({ orderId: id, ...line, source: 'quote' })), ...extraLines.map(line => ({ orderId: id, ...line }))],
      });
      await tx.blockedTimeSlot.deleteMany({ where: { orderId: id } });
      await tx.blockedTimeSlot.create({
        data: {
          techId: technicianId,
          orderId: id,
          startTime,
          endTime: blockEndTime,
          reason: 'booking',
        },
      });


      if (order.clientUserId && !unchanged) {
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

  async confirm(
    id: number,
    confirmedPrice?: number,
    confirmedDeposit?: number,
    confirmedDepositPaid?: boolean,
    acceptance?: { clientUserId: number; quoteVersion: number },
  ) {
    const order = await this.findOne(id);

    if (acceptance) {
      if (order.clientUserId !== acceptance.clientUserId || order.quoteVersion !== acceptance.quoteVersion) throw new BadRequestException('报价已更新，请刷新后确认');
      if (['pending_shop', 'pending_home'].includes(order.status)) return order;
      if (order.status !== 'pending_agree') throw new BadRequestException('当前预约不能确认');
    }
    if (!acceptance &&
      !canTransition(order.status as OrderStatus, 'pending_home') &&
      !canTransition(order.status as OrderStatus, 'pending_shop')
    ) {
      throw new BadRequestException('当前订单状态不支持确认');
    }

    const targetStatus: OrderStatus =
      order.serviceType === '上门美甲' ? 'pending_home' : 'pending_shop';
    const depositAmount = confirmedDeposit ?? order.depositAmount ?? 0;
    const isDepositPaid =
      depositAmount > 0 &&
      (confirmedDepositPaid ?? order.isDepositPaid ?? false);
    for (const amount of [confirmedPrice, depositAmount]) {
      if (
        amount !== undefined &&
        (!Number.isFinite(amount) ||
          amount < 0 ||
          amount > 1000000 ||
          Math.abs(amount * 100 - Math.round(amount * 100)) > 0.000001)
      ) {
        throw new BadRequestException('金额需在 0 至 100 万元之间，最多两位小数');
      }
    }
    if (confirmedPrice !== undefined && confirmedPrice <= 0)
      throw new BadRequestException('最终总价必须大于 0');
    const requiresDeposit = depositAmount > 0 && !isDepositPaid;
    const confirmedPriceFen = confirmedPrice === undefined
      ? (order.finalPriceFen ?? Math.round((order.quotePrice ?? 0) * 100))
      : Math.round(confirmedPrice * 100);

    const totalAmount = Math.max(
      0,
      Math.round(
        confirmedPriceFen - (order.fundDiscountAmount ?? 0) * 100,
      ) / 100,
    );
    if (depositAmount > totalAmount)
      throw new BadRequestException('定金不能超过优惠后的应付总价');

    if (!acceptance && (confirmedPriceFen !== (order.finalPriceFen ?? Math.round((order.quotePrice || 0) * 100)) || Math.round(depositAmount * 100) !== Math.round((order.depositAmount || 0) * 100))) {
      const parts = getBusinessDateTimeParts(order.startTime);
      return this.review(id, order.technicianId, {
        useCurrentServices: true, services: [], quoteVersion: order.quoteVersion || 0,
        serviceDate: `${parts.year}-${parts.month}-${parts.day}`, startTime: `${parts.hour}:${parts.minute}`, finalPriceFen: confirmedPriceFen,
        depositAmount, isDepositPaid, surchargeIds: (order.serviceLines || []).filter(line => line.source === 'surcharge').map(line => line.servicePublicIdSnapshot!).filter(Boolean),
      });
    }
    if (order.startTime <= new Date() || order.endTime <= order.startTime) throw new BadRequestException('预约时间或服务时长已失效');
    await this.assertTechnicianWorkSchedule(order.technicianId, order.startTime, order.endTime);
    if (order.serviceType === '到店美甲') await this.assertTechnicianShopSchedule(order.technicianId, order.address || '', order.startTime, order.endTime, true);
    let systemMessage: any = null;
    let conversationId: number | null = null;

    const confirmBooking = () =>
      this.prisma.$transaction(async (tx) => {
        const confirmedBlockEnd = this.bookingDays
          ? (await this.bookingDays.prepareSlot(
              tx,
              order.technicianId,
              businessDate(order.startTime),
              order.endTime,
              id,
              true,
            )).blockEndTime
          : order.endTime;
        const claimed = await tx.order.updateMany({
          where: { id, status: order.status, updatedAt: order.updatedAt },
          data: { status: targetStatus },
        });
        if (claimed.count !== 1)
          throw new BadRequestException('预约状态已变化，请刷新后重试');
        const paid = await tx.paymentOrder.aggregate({
          where: { orderId: id, status: 'paid' }, _sum: { amountCents: true },
        });
        const paidDeposit = await tx.paymentOrder.aggregate({
          where: { orderId: id, status: 'paid', paymentType: 'deposit' }, _sum: { amountCents: true },
        });
        const recordedDeposit = (paidDeposit._sum.amountCents ?? 0) / 100;
        if (
          recordedDeposit > depositAmount ||
          (recordedDeposit > 0 && !isDepositPaid)
        ) {
          throw new BadRequestException(
            '已有定金收款记录，不能在确认排期时减少或取消，请先处理退款',
          );
        }
        const offlineDeposit = isDepositPaid
          ? Math.max(0, Math.round((depositAmount - recordedDeposit) * 100))
          : 0;
        const paidAmount = ((paid._sum.amountCents ?? 0) + offlineDeposit) / 100;
        if (paidAmount > totalAmount)
          throw new BadRequestException('总价不能低于已收款金额');
        if (offlineDeposit > 0) {
          const receiptId = crypto.randomUUID();
          await tx.paymentOrder.create({
            data: {
              paymentNo: `OFFLINE_${receiptId}`,
              idempotencyKey: `offline-confirm-deposit:${id}:${receiptId}`,
              orderId: id,
              clientUserId: order.clientUserId,
              technicianId: order.technicianId,
              paymentType: 'deposit',
              amountCents: offlineDeposit,
              channel: 'offline',
              status: 'paid',
              paidAt: new Date(),
            },
          });
        }
        const conflict = await tx.blockedTimeSlot.findFirst({
          where: {
            techId: order.technicianId,
            OR: [{ orderId: null }, { orderId: { not: id } }],
            startTime: { lt: confirmedBlockEnd },
            endTime: { gt: order.startTime },
          },
          select: { id: true },
        });
        if (conflict) {
          throw new BadRequestException(BOOKING_CONFLICT_MESSAGE);
        }
        const updated = await tx.order.update({
          where: { id },
          data: {
            status: targetStatus,
            acceptedProposal: proposalSnapshot(order),
            depositAmount,
            isDepositPaid,
            depositStatus: isDepositPaid ? 'paid' : 'pending',
            depositConfirmedAt: isDepositPaid ? (order.depositConfirmedAt ?? new Date()) : null,
            paidAmount,
            paymentStatus:
              paidAmount >= totalAmount
                ? 'paid'
                : paidAmount > 0
                  ? 'partial'
                  : 'unpaid',
            paidAt: paidAmount >= totalAmount ? new Date() : null,
            quotePrice: confirmedPriceFen / 100,
            finalPriceFen: confirmedPriceFen,
            quotedAt: new Date(),
            discountAmountFen: Math.max(
              0,
              (order.serviceSubtotalFen ?? 0) + (order.serviceLines || []).filter(line => line.source === 'surcharge').reduce((sum, line) => sum + line.subtotalFen, 0) - confirmedPriceFen,
            ),
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
          await tx.bookingTradeOrder.upsert({
            where: { bookingId: id },
            update: {
              totalAmount,
              depositAmount,
              balanceAmount: Math.max(0, totalAmount - depositAmount),
              paidAmount,
              status: paidAmount >= totalAmount ? 'completed' : 'pending',
              currentPayStage: requiresDeposit ? 'deposit' : 'balance',
              completedAt: paidAmount >= totalAmount ? new Date() : null,
            },
            create: {
              tradeNo: `TRADE${Date.now()}${id}`,
              bookingId: id,
              clientUserId: order.clientUserId,
              technicianId: order.technicianId,
              totalAmount,
              depositAmount,
              balanceAmount: Math.max(
                0,
                totalAmount - depositAmount,
              ),
              paidAmount,
              status: paidAmount >= totalAmount ? 'completed' : 'pending',
              currentPayStage: requiresDeposit ? 'deposit' : 'balance',
              completedAt: paidAmount >= totalAmount ? new Date() : null,
            },
          });
        }

        await tx.blockedTimeSlot.deleteMany({ where: { orderId: id } });
        await tx.blockedTimeSlot.create({
          data: {
            techId: order.technicianId,
            orderId: id,
            startTime: order.startTime,
            endTime: confirmedBlockEnd,
            reason: 'booking',
          },
        });

        if (order.clientUserId) {
          const preview = requiresDeposit
            ? `双方已确认预约，订单已生成，请支付定金 ¥${Number(depositAmount).toFixed(2)}`
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

    void this.wechatSubscribe?.sendBookingEvent(updated, 'client_success');
    if (acceptance) {
      void this.wechatSubscribe?.sendBookingStatusEvent(
        updated,
        'technician',
        '已确认',
        '客户已确认预约方案，请及时查看',
      );
    }

    return updated;
  }

  async complete(id: number, dto?: any, source: 'manual' | 'automatic' = 'manual') {
    const order = await this.findOne(id);

    if (!canTransition(order.status as OrderStatus, 'completed')) {
      throw new BadRequestException('当前订单状态不支持完成');
    }
    if (
      dto &&
      ((dto.actualStartTime && !dto.actualEndTime) ||
        (!dto.actualStartTime && dto.actualEndTime))
    )
      throw new BadRequestException('请同时填写实际开始和结束时间');

    let systemMessage: any = null;
    let conversationId: number | null = null;

    const actualStart = dto
      ? dto.actualStartTime
        ? new Date(dto.actualStartTime)
        : order.confirmedStartTime || order.startTime
      : order.confirmedStartTime || order.startTime;
    const actualEnd = dto
      ? dto.actualEndTime
        ? new Date(dto.actualEndTime)
        : new Date()
      : order.confirmedEndTime || order.endTime || new Date();
    if (actualEnd <= actualStart)
      throw new BadRequestException('实际结束时间必须晚于开始时间');
    const actualAmount =
        dto?.actualAmount ??
        order.actualAmount ??
        Math.max(0, (order.quotePrice ?? 0) - (order.fundDiscountAmount ?? 0)),
      materialCost = dto?.materialCost ?? order.materialCost ?? 0;
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
          // A scheduled completion is not confirmation that money was received.
          ...(source === 'manual' ? {
            paidAmount: actualAmount,
            paymentStatus: order.paymentStatus,
          } : {}),
          aftercareDeadline,
          suggestedMaintenanceAt,
        },
      });
      const technicianLoyalty = tx.technician?.findUnique
        ? await tx.technician.findUnique({ where: { id: order.technicianId }, select: { loyaltySettings: true } })
        : null;
      const loyaltySettings = technicianLoyalty?.loyaltySettings ? JSON.parse(technicianLoyalty.loyaltySettings) : null;
      const earnedPoints = loyaltySettings?.enabled ? Math.max(0, Math.floor(actualAmount * Number(loyaltySettings.pointsPerYuan || 0))) : 0;
      if (order.clientUserId && earnedPoints > 0) {
        await tx.clientTechBinding.updateMany({
          where: {
            clientId: order.clientUserId,
            techId: order.technicianId,
            status: 'active',
          },
          data: { loyaltyPoints: { increment: earnedPoints } },
        });
      }
      const completedRecord = await tx.serviceRecord.upsert({
        where: { orderId: id },
        create: {
          orderId: id,
          technicianId: order.technicianId,
          customerId: order.customerId,
          actualStartTime: actualStart,
          actualEndTime: actualEnd,
          actualAmount,
          materialCost,
          materials: dto?.materials || null,
          tools: dto?.tools || null,
          techniques: dto?.techniques || null,
          nailCondition: dto?.nailCondition || null,
          customerFeedback: dto?.customerFeedback || null,
          clientReaction: dto?.clientReaction || null,
          discomfortNotes: dto?.discomfortNotes || null,
          preferenceNotes: dto?.preferenceNotes || null,
          nextServiceNotes: dto?.nextServiceNotes || null,
          careAdvice: dto?.careAdvice || null,
          preServiceNotes: dto?.preServiceNotes || null,
          clientRequests: dto?.clientRequests || null,
          reactionLevel: dto?.reactionLevel || null,
          safetyConfirmedAt: dto?.safetyConfirmed ? actualEnd : null,
          nailConditionConfirmedAt: dto?.nailConditionConfirmed ? actualEnd : null,
          status: dto?.recordComplete ? 'complete' : 'draft',
          completedAt: dto?.recordComplete ? actualEnd : null,
          aftercareDeadline,
          suggestedMaintenanceAt,
        },
        update: {
          actualStartTime: actualStart,
          actualEndTime: actualEnd,
          actualAmount,
          materialCost,
          materials: dto?.materials || undefined,
          tools: dto?.tools || undefined,
          techniques: dto?.techniques || undefined,
          nailCondition: dto?.nailCondition || undefined,
          customerFeedback: dto?.customerFeedback || undefined,
          clientReaction: dto?.clientReaction || undefined,
          discomfortNotes: dto?.discomfortNotes || undefined,
          preferenceNotes: dto?.preferenceNotes || undefined,
          nextServiceNotes: dto?.nextServiceNotes || undefined,
          careAdvice: dto?.careAdvice || undefined,
          preServiceNotes: dto?.preServiceNotes || undefined,
          clientRequests: dto?.clientRequests || undefined,
          reactionLevel: dto?.reactionLevel || undefined,
          ...(dto?.safetyConfirmed ? { safetyConfirmedAt: actualEnd } : {}),
          ...(dto?.nailConditionConfirmed ? { nailConditionConfirmedAt: actualEnd } : {}),
          status: dto?.recordComplete ? 'complete' : 'draft',
          completedAt: dto?.recordComplete ? actualEnd : null,
          aftercareDeadline,
          suggestedMaintenanceAt,
        },
      });
      const completionPhotos = [
        ['before', dto?.beforePhotos],
        ['during', dto?.duringPhotos],
        ['after', dto?.afterPhotos],
      ] as const;
      for (const [stage, urls] of completionPhotos) {
        if (urls === undefined) continue;
        await tx.serviceRecordPhoto.deleteMany({ where: { serviceRecordId: completedRecord.id, stage } });
        if (urls.length) {
          await tx.serviceRecordPhoto.createMany({
            data: urls.slice(0, 9).map((url: string, sortOrder: number) => ({
              serviceRecordId: completedRecord.id,
              stage,
              url,
              sortOrder,
            })),
          });
        }
      }
      const savedRecord = await tx.serviceRecord.findUnique({
        where: { id: completedRecord.id },
        select: {
          nailCondition: true,
          reactionLevel: true,
          photos: { select: { stage: true } },
        },
      });
      const missing = this.serviceRecordMissing(savedRecord);
      const recordIsComplete = Boolean(dto?.recordComplete) && missing.length === 0;
      if (dto?.recordComplete && !recordIsComplete) {
        await tx.serviceRecord.update({
          where: { id: completedRecord.id },
          data: { status: 'draft', completedAt: null },
        });
      }
      const allowedProfileFactCategories = new Set([
        'allergy',
        'contraindication',
        'preference',
        'communication',
        'reminder',
      ]);
      for (const rawFact of dto?.profileFacts || []) {
        const category = String(rawFact?.category || '').trim();
        const content = String(rawFact?.content || '').trim();
        if (!allowedProfileFactCategories.has(category) || !content || content.length > 500) {
          throw new BadRequestException('客户档案信息格式不正确');
        }
        await tx.customerProfileFact.upsert({
          where: {
            customerId_category_content: {
              customerId: order.customerId,
              category,
              content,
            },
          },
          create: {
            customerId: order.customerId,
            category,
            content,
            sourceRecordId: completedRecord.id,
            confirmedById: order.technicianId,
          },
          update: {
            status: 'active',
            sourceRecordId: completedRecord.id,
            confirmedById: order.technicianId,
            lastConfirmedAt: actualEnd,
            confirmationCount: { increment: 1 },
          },
        });
      }
      if (!recordIsComplete) {
        await tx.actionTask.upsert({
          where: {
            taskKey: `${order.technicianId}:complete_service_record:order:${id}`,
          },
          create: {
            technicianId: order.technicianId,
            taskKey: `${order.technicianId}:complete_service_record:order:${id}`,
            type: 'complete_service_record',
            title: '补全美甲记录',
            description: `服务订单 #${id}`,
            priority: 'high',
            relatedType: 'order',
            relatedId: id,
            actionPath: `/pages/technician/complete-service/index?id=${id}`,
            dueAt: actualEnd,
          },
          update: {
            status: 'pending',
            resolvedAt: null,
            dueAt: actualEnd,
          },
        });
      } else {
        await tx.actionTask.updateMany({
          where: {
            technicianId: order.technicianId,
            type: 'complete_service_record',
            relatedType: 'order',
            relatedId: id,
          },
          data: { status: 'completed', resolvedAt: actualEnd },
        });
      }
      await tx.customer.update({
        where: { id: order.customerId },
        data: {
          completedServiceCount: { increment: 1 },
          lifetimePaidAmount: { increment: source === 'automatic' ? (order.paidAmount ?? 0) : actualAmount },
          lastServiceAt: actualEnd,
          suggestedMaintenanceAt,
        },
      });
      const revenue = await tx.revenue.upsert({
        where: { orderId: id },
        create: {
          revenueNo: this.generateRevenueNo(),
          orderId: id,
          technicianId: order.technicianId,
          customerId: order.customerId,
          amount: actualAmount,
          recognizedAt: actualEnd,
          status: 'confirmed',
        },
        update: { amount: actualAmount, recognizedAt: actualEnd, status: 'confirmed' },
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

    void this.wechatSubscribe?.sendBookingStatusEvent(
      { ...order, status: 'completed', updatedAt: actualEnd },
      'client',
      '已完成',
      '本次服务已完成，感谢您的到店',
      actualEnd.toISOString(),
    );

    return revenue;
  }

  async cancel(
    id: number,
    cancelReason?: string,
    refundDeposit?: boolean,
    terminalStatus: 'cancelled' | 'rejected' = 'cancelled',
  ) {
    const order = await this.findOne(id);

    const cancellableStatuses: OrderStatus[] = terminalStatus === 'rejected'
      ? ['pending_quote']
      : [
          'pending_quote',
          'pending_agree',
          'pending_confirm',
          'pending_client_confirm',
          'pending_home',
          'pending_shop',
          'in_progress',
        ];
    if (!cancellableStatuses.includes(order.status as OrderStatus)) {
      throw new BadRequestException(
        terminalStatus === 'rejected'
          ? '仅待报价预约可以驳回'
          : '当前订单状态不支持取消',
      );
    }
    if (terminalStatus === 'rejected' && !cancelReason?.trim()) {
      throw new BadRequestException('请填写驳回原因');
    }
    if (order.isDepositPaid && refundDeposit == null) {
      throw new BadRequestException('请选择是否退还定金');
    }

    let systemMessages: any[] = [];
    let conversationId: number | null = null;

    const updated = await this.prisma.$transaction(async (tx) => {
      const claimed = await tx.order.updateMany({
        where: { id, status: { in: cancellableStatuses } },
        data: { status: terminalStatus, tradeStatus: 'cancelled' },
      });
      if (claimed.count !== 1) {
        throw new BadRequestException(
          terminalStatus === 'rejected'
            ? '该预约已处理，请刷新后查看'
            : '该订单已取消，无需重复处理',
        );
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
          ...(terminalStatus === 'rejected'
            ? { rejectionReason: cancelReason, bookingPhase: 'closed' }
            : {}),
          ...(order.isDepositPaid
            ? {
                depositStatus: refundDeposit ? 'refunded' : 'forfeited',
                ...(refundDeposit ? { isDepositPaid: false } : {}),
              }
            : {}),
        },
      });
      if (order.isDepositPaid) {
        const depositAmount = Math.max(
          0,
          order.depositAmount ?? order.paidAmount ?? 0,
        );
        await tx.revenue.upsert({
          where: { orderId: id },
          create: {
            revenueNo: this.generateRevenueNo(),
            orderId: id,
            technicianId: order.technicianId,
            customerId: order.customerId,
            amount: refundDeposit ? 0 : depositAmount,
            recognizedAt: order.depositConfirmedAt ?? new Date(),
            status: refundDeposit ? 'voided' : 'confirmed',
            voidedAt: refundDeposit ? new Date() : null,
          },
          update: {
            amount: refundDeposit ? 0 : depositAmount,
            status: refundDeposit ? 'voided' : 'confirmed',
            voidedAt: refundDeposit ? new Date() : null,
          },
        });
      }
      if (order.clientUserId) {
        const preview = terminalStatus === 'rejected'
          ? `预约已驳回：${cancelReason}`
          : '订单已取消';
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

    void this.wechatSubscribe?.sendBookingStatusEvent(
      { ...order, ...updated },
      'client',
      terminalStatus === 'rejected' ? '已驳回' : '已取消',
      terminalStatus === 'rejected'
        ? '预约已被驳回，请查看具体原因'
        : '美甲师已取消预约，请及时查看',
    );

    return updated;
  }

  async updateActualAmount(
    id: number,
    technicianId: number,
    actualAmount: number,
  ) {
    const order = await this.findOneForTechnician(id, technicianId);
    if (order.status !== 'completed') {
      throw new BadRequestException('仅已完成预约可修改实际支付金额');
    }
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.order.update({
        where: { id },
        data: { actualAmount },
      });
      await tx.revenue.updateMany({
        where: { orderId: id },
        data: { amount: actualAmount, status: 'confirmed', voidedAt: null },
      });
      return updated;
    });
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

    if (order.quickBooking && !order.totalDurationMinutes) throw new BadRequestException('请让客户重新发起预约申请，由美甲师确认时长');
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
    const serviceBlockEnd =
      prevDuration > 0
        ? endTime
        : new Date(
            startTime.getTime() + DEFAULT_BOOKING_DURATION_MINUTES * 60000,
          );
    await this.assertTechnicianWorkSchedule(technicianId, startTime, serviceBlockEnd);

    const restoreStatus = order.expiredFromStatus ?? 'pending_quote';

    const updated = await this.prisma.$transaction(async (tx) => {
      const blockEnd = this.bookingDays
        ? (await this.bookingDays.prepareSlot(
            tx,
            technicianId,
            businessDate(startTime),
            serviceBlockEnd,
            id,
          )).blockEndTime
        : serviceBlockEnd;
      const conflict = await tx.blockedTimeSlot.findFirst({
        where: {
          techId: technicianId,
          OR: [{ orderId: null }, { orderId: { not: id } }],
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

  private async assertTechnicianShopSchedule(
    technicianId: number,
    orderAddress: string,
    startTime: Date,
    endTime: Date,
    allowDefaultHours = false,
  ) {
    const technician = await this.prisma.technician.findUnique({
      where: { id: technicianId },
      select: { shopAddresses: true },
    });
    if (!technician) throw new NotFoundException('美甲师不存在');
    let shops: any[] = [];
    try {
      shops = JSON.parse(technician.shopAddresses || '[]');
    } catch {
      throw new BadRequestException('店铺营业时间配置异常');
    }
    const normalizedAddress = orderAddress.replace(/\s+/g, '');
    const shop = shops.find((item) => {
      const fullAddress = [
        item.province,
        item.city,
        item.district,
        item.detailAddress,
        item.doorInfo,
      ]
        .filter(Boolean)
        .join('')
        .replace(/\s+/g, '');
      return (
        item.enabled !== false &&
        (fullAddress === normalizedAddress ||
          (item.detailAddress &&
            normalizedAddress.includes(String(item.detailAddress).replace(/\s+/g, ''))))
      );
    });
    if (!shop) throw new BadRequestException('原预约门店已失效，请重新选择门店');
    const parts = getBusinessDateTimeParts(startTime);
    const weekday = new Date(
      `${parts.year}-${parts.month}-${parts.day}T00:00:00`,
    ).getDay();
    const businessHours = allowDefaultHours && !(shop.businessHours || []).length ? Array.from({ length: 7 }, (_, weekday) => ({ weekday, start: '10:00', end: '21:00' })) : (shop.businessHours || []);
    const hours = businessHours.find(
      (item: any) => item.weekday === weekday,
    );
    if (!hours || hours.closed) {
      throw new BadRequestException('该日期店铺休息，无法预约');
    }
    const toMinutes = (value: string) => {
      const [hour, minute] = String(value || '').split(':').map(Number);
      return hour * 60 + minute;
    };
    const bookingStart = Number(parts.hour) * 60 + Number(parts.minute);
    const duration = Math.ceil((endTime.getTime() - startTime.getTime()) / 60000);
    const businessStart = toMinutes(hours.start);
    const businessEnd = toMinutes(hours.end);
    if (
      !Number.isFinite(businessStart) ||
      !Number.isFinite(businessEnd) ||
      bookingStart < businessStart ||
      bookingStart + duration > businessEnd
    ) {
      throw new BadRequestException('完整服务时间不在店铺营业时间内');
    }
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
