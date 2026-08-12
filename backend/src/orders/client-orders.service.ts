import {
  BadRequestException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { PushService } from '../notifications/push.service';
import { ChatGateway } from '../chat/chat.gateway';
import { CreateClientOrderDto } from './dto/create-client-order.dto';
import { UpdateClientOrderDto } from './dto/update-client-order.dto';
import { CreateOrderFromDesignDto } from './dto/create-order-from-design.dto';
import { Prisma } from '@prisma/client';
import { buildDefaultServiceItems } from '../common/default-service-items';
import { ServiceReviewDto } from './dto/service-review.dto';
import { BookingMutexService } from './booking-mutex.service';
import { ReferralQualificationService } from '../referrals/referral-qualification.service';
import { RewardFundService } from '../referrals/reward-fund.service';
import { assertWithinServiceSchedule } from './order-work-schedule';
import { bookingReadiness } from '../technicians/booking-readiness';
import { parseBusinessDateTime } from './business-time';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { revenueSnapshot } from './order-accounting';
import { throwIfBookingSlotConflict } from './booking-conflict';

import * as crypto from 'crypto';

type ShopBusinessHour = {
  weekday: number;
  start: string;
  end: string;
  closed?: boolean;
};

type ShopAddressConfig = {
  name: string;
  phone?: string;
  province?: string;
  city?: string;
  district?: string;
  detailAddress?: string;
  doorInfo?: string;
  enabled?: boolean;
  businessHours?: ShopBusinessHour[];
};

@Injectable()
export class ClientOrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly chatGateway: ChatGateway,
    private readonly push: PushService,
    @Optional() private readonly bookingMutex?: BookingMutexService,
    @Optional()
    private readonly referralQualification?: ReferralQualificationService,
    @Optional() private readonly rewardFunds?: RewardFundService,
    @Optional() private readonly subscriptions?: SubscriptionsService,
  ) {}

  async create(clientUserId: number, dto: CreateClientOrderDto) {
    const binding = await this.prisma.clientTechBinding.findFirst({
      where: {
        clientId: clientUserId,
        techId: dto.techId,
        status: 'active',
      },
      include: {
        technician: true,
      },
    });

    if (!binding) {
      throw new NotFoundException('您未绑定该美甲师');
    }

    if (binding.technician.status !== 'active') {
      throw new BadRequestException('该美甲师当前未开启接单');
    }
    const readiness = bookingReadiness(
      binding.technician,
      dto.serviceType as '上门美甲' | '到店美甲',
    );
    if (!readiness.ready) {
      throw new BadRequestException(readiness.issues[0]);
    }
    if (this.subscriptions) {
      await this.subscriptions.assertCanCreateBooking(dto.techId);
      await this.subscriptions.assertCanActivateCustomer(
        dto.techId,
        clientUserId,
      );
    }

    if (dto.sourceWorkId) {
      const sourceWork = await this.prisma.nailWork.findFirst({
        where: {
          id: dto.sourceWorkId,
          techId: dto.techId,
          isVisible: true,
          OR: [
            { visibilityScope: 'public' },
            {
              clientAccesses: {
                some: { clientUserId, canView: true },
              },
            },
          ],
        },
        select: { id: true },
      });
      if (!sourceWork) {
        throw new NotFoundException('来源作品不存在或查看授权已失效');
      }
    }

    const isCustom =
      (!dto.selectedServiceIds || dto.selectedServiceIds.length === 0) &&
      (dto.customTitle ||
        dto.customDescription ||
        (dto.customImages && dto.customImages.length > 0));

    // chatMode: booking initiated from chat; service details agreed verbally, no content required
    if (
      !dto.chatMode &&
      !isCustom &&
      (!dto.selectedServiceIds || dto.selectedServiceIds.length === 0)
    ) {
      throw new BadRequestException('请选择至少一项服务内容或填写自定义需求');
    }

    const selectedServiceNames =
      isCustom || dto.chatMode
        ? []
        : this.resolveSelectedServiceNames(
            binding.technician.serviceItems,
            dto.selectedServiceIds,
          );
    assertWithinServiceSchedule(
      binding.technician.serviceSchedule,
      dto.serviceDate,
      dto.startTime,
      120,
    );

    const client = await this.prisma.clientUser.findUnique({
      where: { id: clientUserId },
    });

    if (!client) {
      throw new NotFoundException('客户不存在');
    }

    const { addressId, orderAddress, customerName } =
      await this.resolveOrderAddressAndCustomerName(
        clientUserId,
        client,
        binding.technician,
        dto,
      );
    const startTime = this.buildStartTime(dto.serviceDate, dto.startTime);
    const endTime = new Date(startTime.getTime() + 120 * 60 * 1000);

    const createOrder = () =>
      this.prisma.$transaction(async (tx) => {
        const customer = await tx.customer.upsert({
          where: {
            technicianId_clientUserId: {
              technicianId: dto.techId,
              clientUserId,
            },
          },
          update: {
            ...(orderAddress ? { address: orderAddress } : {}),
            archivedAt: null,
          },
          create: {
            technicianId: dto.techId,
            clientUserId,
            name: customerName,
            phone: client.phone,
            address: orderAddress,
            sourceType: 'booking',
          },
        });

        const createdOrder = await tx.order.create({
          data: {
            orderNo: this.generateOrderNo(),
            technicianId: dto.techId,
            customerId: customer.id,
            clientUserId,
            addressId,
            startTime,
            endTime,
            address: orderAddress,
            serviceType: dto.serviceType,
            remark: dto.remark ?? null,
            customTitle: dto.customTitle ?? null,
            customDescription: dto.customDescription ?? null,
            customImages:
              dto.customImages && dto.customImages.length > 0
                ? JSON.stringify(dto.customImages)
                : null,
            sourceWorkId: dto.sourceWorkId ?? null,
            quotePrice: 0,
            status: 'pending_quote',
            source: 'client_webapp',
          },
          include: this.orderInclude(),
        });

        await tx.conversionEvent.create({
          data: {
            eventId: `order-created-${createdOrder.id}`,
            technicianId: dto.techId,
            workId: dto.sourceWorkId ?? null,
            clientUserId,
            eventType: 'order_created',
            source: dto.sourceWorkId
              ? 'work_detail'
              : this.normalizeAttributionSource(dto.attributionSource),
          },
        });

        const previewContent = isCustom
          ? dto.customTitle || '自定义美甲需求'
          : selectedServiceNames.length > 0
            ? selectedServiceNames.join('、')
            : '到店/上门预约';
        const preview = `新的预约申请：${previewContent} · ${dto.serviceType}`;
        const conversation = await tx.conversation.upsert({
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

        await tx.message.create({
          data: {
            conversationId: conversation.id,
            senderType: 'client',
            senderId: clientUserId,
            receiverType: 'technician',
            receiverId: dto.techId,
            messageType: 'order',
            content: preview,
            relatedType: 'order',
            relatedId: createdOrder.id,
          },
        });

        const blockEndTime = endTime;
        await this.assertNoBlockedConflict(
          tx,
          dto.techId,
          startTime,
          blockEndTime,
        );
        await tx.blockedTimeSlot.create({
          data: {
            techId: dto.techId,
            orderId: createdOrder.id,
            startTime,
            endTime: blockEndTime,
            reason: 'booking',
          },
        });

        return createdOrder;
      });
    let order;
    try {
      order = this.bookingMutex
        ? await this.bookingMutex.runExclusive(dto.techId, createOrder)
        : await createOrder();
    } catch (error) {
      throwIfBookingSlotConflict(error);
    }

    // 推送新预约给技师（best-effort，不阻塞主流程）
    void this.push.sendToTechnician(dto.techId, {
      title: '新的预约申请',
      body: `${client.nickname || client.phone || '客户'} · ${dto.serviceType}`,
      data: { type: 'order', orderId: String(order.id) },
    });

    return this.mapOrder(order);
  }

  private normalizeAttributionSource(source?: string) {
    const normalized = String(source || 'direct').trim().toLowerCase();
    return /^[a-z0-9_-]{1,32}$/.test(normalized) ? normalized : 'direct';
  }

  async createFromDesign(clientUserId: number, dto: CreateOrderFromDesignDto) {
    const design = await this.prisma.clientDesignRequest.findFirst({
      where: {
        id: dto.designId,
        clientId: clientUserId,
      },
      include: {
        technician: true,
      },
    });

    if (!design) {
      throw new NotFoundException('设计不存在');
    }

    if (design.status !== 'accepted') {
      throw new BadRequestException('设计未接受报价，无法创建预约');
    }

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

    if (design.technician.status !== 'active') {
      throw new BadRequestException('该美甲师当前未开启接单');
    }
    if (this.subscriptions) {
      await this.subscriptions.assertCanCreateBooking(dto.techId);
      await this.subscriptions.assertCanActivateCustomer(
        dto.techId,
        clientUserId,
      );
    }

    if (!design.technician.homeService && !design.technician.shopService) {
      throw new BadRequestException(
        '美甲师未开启美甲服务，请联系美甲师开启服务',
      );
    }

    if (dto.serviceType === '上门美甲' && !design.technician.homeService) {
      throw new BadRequestException('该美甲师暂未开启上门美甲服务');
    }

    if (dto.serviceType === '到店美甲' && !design.technician.shopService) {
      throw new BadRequestException('该美甲师暂未开启到店美甲服务');
    }

    const client = await this.prisma.clientUser.findUnique({
      where: { id: clientUserId },
    });

    if (!client) {
      throw new NotFoundException('客户不存在');
    }

    let addressId: number | null = null;
    let orderAddress: string;

    if (dto.serviceType === '到店美甲' && dto.shopAddress) {
      const technicianShopAddresses = this.normalizeShopAddresses(
        design.technician.shopAddresses,
      );
      const matchedShopAddress = technicianShopAddresses.find(
        (item) => item.name === dto.shopAddress?.name,
      );

      if (!matchedShopAddress) {
        throw new BadRequestException('请选择有效的店铺地址');
      }

      this.assertShopOrderAvailability(
        matchedShopAddress,
        dto.serviceDate,
        dto.startTime,
      );

      orderAddress = [
        matchedShopAddress.province,
        matchedShopAddress.city,
        matchedShopAddress.district,
        matchedShopAddress.detailAddress,
        matchedShopAddress.doorInfo,
      ]
        .filter(Boolean)
        .join(' ');
    } else if (dto.serviceType === '上门美甲' && dto.addressId) {
      const address = await this.prisma.clientAddress.findFirst({
        where: {
          id: dto.addressId,
          clientId: clientUserId,
        },
      });

      if (!address) {
        throw new NotFoundException('地址不存在');
      }

      this.assertSameCity(
        { province: design.technician.province, city: design.technician.city },
        { province: address.province, city: address.city },
      );

      addressId = address.id;
      orderAddress = this.formatAddress(address);
    } else {
      throw new BadRequestException('请提供有效的地址信息');
    }

    const customerName = client.nickname || client.phone;
    assertWithinServiceSchedule(
      design.technician.serviceSchedule,
      dto.serviceDate,
      dto.startTime,
      120,
    );
    const startTime = this.buildStartTime(dto.serviceDate, dto.startTime);
    const endTime = new Date(startTime.getTime() + 120 * 60 * 1000);

    const createOrder = () =>
      this.prisma.$transaction(async (tx) => {
        const customer = await tx.customer.upsert({
          where: {
            technicianId_clientUserId: {
              technicianId: dto.techId,
              clientUserId,
            },
          },
          update: {
            ...(orderAddress ? { address: orderAddress } : {}),
            archivedAt: null,
          },
          create: {
            technicianId: dto.techId,
            clientUserId,
            name: customerName,
            phone: client.phone,
            address: orderAddress,
            sourceType: 'booking',
          },
        });

        await tx.clientDesignRequest.update({
          where: { id: dto.designId },
          data: { status: 'converted' },
        });

        const blockEndTime = endTime;
        await this.assertNoBlockedConflict(
          tx,
          dto.techId,
          startTime,
          blockEndTime,
        );

        const createdOrder = await tx.order.create({
          data: {
            orderNo: this.generateOrderNo(),
            technicianId: dto.techId,
            customerId: customer.id,
            clientUserId,
            designRequestId: design.id,
            addressId,
            startTime,
            endTime,
            address: orderAddress,
            serviceType: dto.serviceType,
            quotePrice: design.quotePrice ?? 0,
            status: 'pending_quote',
            source: 'client_webapp',
          },
          include: this.orderInclude(),
        });

        await tx.blockedTimeSlot.create({
          data: {
            techId: dto.techId,
            orderId: createdOrder.id,
            startTime,
            endTime: blockEndTime,
            reason: 'booking',
          },
        });

        return createdOrder;
      });
    let order;
    try {
      order = this.bookingMutex
        ? await this.bookingMutex.runExclusive(design.techId, createOrder)
        : await createOrder();
    } catch (error) {
      throwIfBookingSlotConflict(error);
    }

    // 推送新预约给技师（best-effort，不阻塞主流程）
    void this.push.sendToTechnician(dto.techId, {
      title: '新的预约申请',
      body: `${client.nickname || client.phone || '客户'} · ${dto.serviceType}`,
      data: { type: 'order', orderId: String(order.id) },
    });

    return this.mapOrder(order);
  }

  async findAll(clientUserId: number) {
    const orders = await this.prisma.order.findMany({
      where: { clientUserId },
      orderBy: [{ startTime: 'desc' }, { createdAt: 'desc' }],
      include: this.orderInclude(),
    });

    return orders.map((order) => this.mapOrder(order));
  }

  async findOne(clientUserId: number, id: number) {
    const order = await this.prisma.order.findFirst({
      where: {
        id,
        clientUserId,
      },
      include: this.orderInclude(),
    });

    if (!order) {
      throw new NotFoundException('订单不存在');
    }

    return this.mapOrder(order);
  }

  async saveReview(
    clientUserId: number,
    orderId: number,
    dto: ServiceReviewDto,
  ) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, clientUserId },
      select: { id: true, status: true, technicianId: true },
    });
    if (!order) throw new NotFoundException('订单不存在');
    if (order.status !== 'completed')
      throw new BadRequestException('服务完成后才能评价');

    const existing = await this.prisma.serviceReview.findUnique({
      where: { orderId },
    });
    const authorizedAt = dto.photoUseAuthorized
      ? existing?.photoUseAuthorizedAt || new Date()
      : null;
    const review = await this.prisma.serviceReview.upsert({
      where: { orderId },
      create: {
        orderId,
        clientUserId,
        technicianId: order.technicianId,
        rating: dto.rating,
        content: dto.content?.trim() || null,
        photos: dto.photos.length
          ? JSON.stringify(dto.photos.slice(0, 6))
          : null,
        photoUseAuthorized: dto.photoUseAuthorized,
        photoUseAuthorizedAt: authorizedAt,
      },
      update: {
        rating: dto.rating,
        content: dto.content?.trim() || null,
        photos: dto.photos.length
          ? JSON.stringify(dto.photos.slice(0, 6))
          : null,
        photoUseAuthorized: dto.photoUseAuthorized,
        photoUseAuthorizedAt: authorizedAt,
      },
    });
    return this.mapReview(review);
  }

  async saveClientPhotos(
    clientUserId: number,
    orderId: number,
    photos: string[],
  ) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, clientUserId },
      select: { id: true, status: true },
    });
    if (!order) throw new NotFoundException('订单不存在');
    if (order.status !== 'completed') {
      throw new BadRequestException('服务完成后才能添加美甲记录照片');
    }
    const normalized = Array.from(
      new Set(photos.map((photo) => photo.trim()).filter(Boolean)),
    ).slice(0, 9);
    await this.prisma.order.update({
      where: { id: orderId },
      data: {
        clientPhotos: normalized.length ? JSON.stringify(normalized) : null,
      },
    });
    return { orderId, photos: normalized };
  }

  async saveClientRecordNote(
    clientUserId: number,
    orderId: number,
    note?: string,
  ) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, clientUserId },
      select: { id: true, status: true },
    });
    if (!order) throw new NotFoundException('订单不存在');
    if (order.status !== 'completed') {
      throw new BadRequestException('服务完成后才能编辑美甲记录备注');
    }
    const normalized = note?.trim().slice(0, 300) || null;
    await this.prisma.order.update({
      where: { id: orderId },
      data: { clientRecordNote: normalized },
    });
    return { orderId, note: normalized };
  }

  async findTrips(clientUserId: number) {
    const orders = await this.prisma.order.findMany({
      where: {
        clientUserId,
        status: { in: ['pending_home', 'pending_shop', 'in_progress'] },
      },
      orderBy: { startTime: 'asc' },
      include: this.orderInclude(),
    });

    return orders.map((order) => this.mapOrder(order));
  }

  async update(clientUserId: number, id: number, dto: UpdateClientOrderDto) {
    const order = await this.prisma.order.findFirst({
      where: {
        id,
        clientUserId,
      },
      include: this.orderInclude(),
    });

    if (!order) {
      throw new NotFoundException('订单不存在');
    }

    if (!this.canUpdateOrder(order)) {
      throw new BadRequestException('当前订单状态不支持修改');
    }

    const address = await this.prisma.clientAddress.findFirst({
      where: {
        id: dto.addressId,
        clientId: clientUserId,
      },
    });

    if (!address) {
      throw new NotFoundException('地址不存在');
    }

    const startTime = this.buildStartTime(dto.serviceDate, dto.startTime);
    if (Number.isNaN(startTime.getTime())) {
      throw new BadRequestException('预约时间无效');
    }
    const previousDuration =
      new Date(order.endTime).getTime() - new Date(order.startTime).getTime();
    assertWithinServiceSchedule(
      order.technician?.serviceSchedule ?? null,
      dto.serviceDate,
      dto.startTime,
      previousDuration > 0 ? Math.ceil(previousDuration / 60000) : 120,
    );
    const endTime =
      previousDuration > 0
        ? new Date(startTime.getTime() + previousDuration)
        : new Date(startTime);
    const blockEnd =
      previousDuration > 0
        ? endTime
        : new Date(startTime.getTime() + 2 * 60 * 60 * 1000);
    const orderAddress = this.formatAddress(address);

    const updatedOrder = await this.prisma.$transaction(async (tx) => {
      await this.assertNoBlockedConflict(
        tx,
        order.technicianId,
        startTime,
        blockEnd,
        id,
      );

      const updated = await tx.order.update({
        where: { id },
        data: {
          addressId: address.id,
          startTime,
          endTime,
          address: orderAddress,
          reminderDaySent: false,
          reminderHourSent: false,
        },
        include: this.orderInclude(),
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
          techId: order.technicianId,
          orderId: id,
          startTime,
          endTime: blockEnd,
          reason: 'booking',
        },
      });

      return updated;
    });

    return this.mapOrder(updatedOrder);
  }

  async agree(clientUserId: number, id: number, fundAmount: number = 0) {
    const order = await this.prisma.order.findFirst({
      where: {
        id,
        clientUserId,
      },
      include: this.orderInclude(),
    });

    if (!order) {
      throw new NotFoundException('订单不存在');
    }

    // pending_agree：客户对美甲师报价的同意；
    // pending_client_confirm：美甲师直接发起预约后，客户对该预约的确认。
    if (
      order.status !== 'pending_agree' &&
      order.status !== 'pending_client_confirm'
    ) {
      throw new BadRequestException('当前订单状态不支持确认报价');
    }

    let systemMessage: any = null;
    let conversationId: number | null = null;

    const updatedOrder = await this.prisma.$transaction(async (tx) => {
      if (this.rewardFunds) {
        await this.rewardFunds.redeemForOrder(tx, {
          orderId: id,
          technicianId: order.technicianId,
          clientUserId,
          quotePrice: order.quotePrice ?? 0,
          amount: fundAmount,
        });
      } else if (fundAmount > 0) {
        throw new BadRequestException('美甲基金服务暂不可用');
      }
      const updated = await tx.order.update({
        where: { id },
        data: {
          status: 'pending_confirm',
          confirmedAt: new Date(),
          fundDiscountAmount: fundAmount,
        },
        include: this.orderInclude(),
      });

      const preview = '客户已同意报价，请确认接单～';
      const conversation = await tx.conversation.upsert({
        where: {
          clientId_techId: {
            clientId: clientUserId,
            techId: order.technicianId,
          },
        },
        update: { lastMessage: preview, lastMessageAt: new Date() },
        create: {
          clientId: clientUserId,
          techId: order.technicianId,
          lastMessage: preview,
          lastMessageAt: new Date(),
        },
      });

      conversationId = conversation.id;

      systemMessage = await tx.message.create({
        data: {
          conversationId: conversation.id,
          senderType: 'client',
          senderId: clientUserId,
          receiverType: 'technician',
          receiverId: order.technicianId,
          messageType: 'system',
          content: preview,
          relatedType: 'order',
          relatedId: order.id,
        },
      });

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
          '[ClientOrdersService] Failed to push notification via WebSocket:',
          e,
        );
      }
    }

    return this.mapOrder(updatedOrder);
  }

  async rejectQuote(clientUserId: number, id: number, reason: string) {
    const order = await this.prisma.order.findFirst({
      where: {
        id,
        clientUserId,
      },
      include: this.orderInclude(),
    });

    if (!order) {
      throw new NotFoundException('订单不存在');
    }

    if (order.status !== 'pending_agree') {
      throw new BadRequestException('当前订单状态不支持拒绝报价');
    }

    let systemMessage: any = null;
    let conversationId: number | null = null;

    const updatedOrder = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.order.update({
        where: { id },
        data: {
          status: 'pending_quote',
          quotePrice: 0,
          quoteRemark: null,
          quotedAt: null,
        },
        include: this.orderInclude(),
      });

      const preview = `客户拒绝了报价：${reason}`;
      const conversation = await tx.conversation.upsert({
        where: {
          clientId_techId: {
            clientId: clientUserId,
            techId: order.technicianId,
          },
        },
        update: { lastMessage: preview, lastMessageAt: new Date() },
        create: {
          clientId: clientUserId,
          techId: order.technicianId,
          lastMessage: preview,
          lastMessageAt: new Date(),
        },
      });

      conversationId = conversation.id;

      systemMessage = await tx.message.create({
        data: {
          conversationId: conversation.id,
          senderType: 'client',
          senderId: clientUserId,
          receiverType: 'technician',
          receiverId: order.technicianId,
          messageType: 'system',
          content: preview,
          relatedType: 'order',
          relatedId: order.id,
        },
      });

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
          '[ClientOrdersService] Failed to push notification via WebSocket:',
          e,
        );
      }
    }

    return this.mapOrder(updatedOrder);
  }

  async updateStatus(
    clientUserId: number,
    id: number,
    status: 'completed' | 'cancelled',
  ) {
    const order = await this.prisma.order.findFirst({
      where: {
        id,
        clientUserId,
      },
      include: this.orderInclude(),
    });

    if (!order) {
      throw new NotFoundException('订单不存在');
    }

    if (status === 'completed') {
      if (order.status !== 'in_progress') {
        throw new BadRequestException('当前订单状态不支持完成');
      }

      const revenueExists = await this.prisma.revenue.findUnique({
        where: { orderId: id },
      });

      if (revenueExists) {
        throw new BadRequestException('该订单已完成，无需重复处理');
      }

      const updatedOrder = await this.prisma.$transaction(async (tx) => {
        const claimed = await tx.order.updateMany({
          where: { id, clientUserId, status: 'in_progress' },
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

        const accounting = revenueSnapshot(order);
        await tx.revenue.create({
          data: {
            revenueNo: this.generateRevenueNo(),
            orderId: id,
            technicianId: order.technicianId,
            customerId: order.customerId,
            amount: accounting.amount,
            recognizedAt: new Date(),
            status: accounting.status,
          },
        });

        if (this.referralQualification) {
          await this.referralQualification.qualifyCompletedOrder(tx, order);
        }

        return tx.order.findUniqueOrThrow({
          where: { id },
          include: this.orderInclude(),
        });
      });

      return this.mapOrder(updatedOrder);
    }

    const cancellableStatuses = [
      'pending_quote',
      'pending_agree',
      'pending_confirm',
      'pending_client_confirm',
      'pending_home',
      'pending_shop',
    ];
    if (!cancellableStatuses.includes(order.status)) {
      throw new BadRequestException('当前订单状态不支持取消');
    }

    const updatedOrder = await this.prisma.$transaction(async (tx) => {
      const claimed = await tx.order.updateMany({
        where: { id, clientUserId, status: { in: cancellableStatuses } },
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

      return tx.order.update({
        where: { id },
        data: {
          cancelledAt: new Date(),
        },
        include: this.orderInclude(),
      });
    });

    return this.mapOrder(updatedOrder);
  }

  // 重新发起已过期预约：仅重选预约时间，其余信息保留，恢复过期前状态。
  async reinitiate(
    clientUserId: number,
    id: number,
    dto: { serviceDate: string; startTime: string },
  ) {
    const order = await this.prisma.order.findFirst({
      where: { id, clientUserId },
      include: this.orderInclude(),
    });

    if (!order) {
      throw new NotFoundException('订单不存在');
    }

    if (order.status !== 'expired') {
      throw new BadRequestException('仅已过期的预约可重新发起');
    }

    const startTime = this.buildStartTime(dto.serviceDate, dto.startTime);
    if (Number.isNaN(startTime.getTime())) {
      throw new BadRequestException('预约时间无效');
    }
    if (startTime.getTime() <= Date.now()) {
      throw new BadRequestException('请选择将来的预约时间');
    }

    const prevDuration =
      new Date(order.endTime).getTime() - new Date(order.startTime).getTime();
    assertWithinServiceSchedule(
      order.technician?.serviceSchedule ?? null,
      dto.serviceDate,
      dto.startTime,
      prevDuration > 0 ? Math.ceil(prevDuration / 60000) : 120,
    );
    const endTime =
      prevDuration > 0
        ? new Date(startTime.getTime() + prevDuration)
        : startTime;
    const blockEnd =
      prevDuration > 0
        ? endTime
        : new Date(startTime.getTime() + 2 * 60 * 60 * 1000);

    const restoreStatus = order.expiredFromStatus ?? 'pending_quote';

    const updatedOrder = await this.prisma.$transaction(async (tx) => {
      await this.assertNoBlockedConflict(
        tx,
        order.technicianId,
        startTime,
        blockEnd,
        id,
      );

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
        include: this.orderInclude(),
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
          techId: order.technicianId,
          orderId: id,
          startTime,
          endTime: blockEnd,
          reason: 'booking',
        },
      });

      return updated;
    });

    // 客户重新发起：仅通知美甲师，不通知操作者本人（客户）
    void this.push.sendToTechnician(order.technicianId, {
      title: '预约重新发起',
      body: '客户重新发起了一个预约，请查看～',
      data: { type: 'order', orderId: String(order.id) },
    });

    try {
      const preview = '客户重新发起了预约，请查看～';
      const conversation = await this.prisma.conversation.upsert({
        where: {
          clientId_techId: {
            clientId: clientUserId,
            techId: order.technicianId,
          },
        },
        update: { lastMessage: preview, lastMessageAt: new Date() },
        create: {
          clientId: clientUserId,
          techId: order.technicianId,
          lastMessage: preview,
          lastMessageAt: new Date(),
        },
      });
      const message = await this.prisma.message.create({
        data: {
          conversationId: conversation.id,
          senderType: 'client',
          senderId: clientUserId,
          receiverType: 'technician',
          receiverId: order.technicianId,
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
        '[ClientOrdersService] Failed to push reinitiate notification:',
        e,
      );
    }

    return this.mapOrder(updatedOrder);
  }

  private orderInclude() {
    return {
      technician: {
        select: {
          id: true,
          name: true,
          phone: true,
          avatarUrl: true,
          shopAddresses: true,
          serviceSchedule: true,
        },
      },
      customer: { select: { id: true, name: true, phone: true } },
      clientAddress: {
        select: {
          id: true,
          contactName: true,
          contactPhone: true,
          province: true,
          city: true,
          district: true,
          detailAddress: true,
          doorInfo: true,
        },
      },
      review: true,
      sourceWork: {
        select: { id: true, title: true, coverUrl: true },
      },
    };
  }

  private mapOrder(order: any) {
    const matchedShopAddress =
      order.serviceType === '到店美甲'
        ? (this.normalizeShopAddresses(
            order.technician?.shopAddresses ?? null,
          ).find(
            (item) =>
              [
                item.province,
                item.city,
                item.district,
                item.detailAddress,
                item.doorInfo,
              ]
                .filter(Boolean)
                .join(' ') === order.address,
          ) ?? null)
        : null;

    return {
      id: order.id,
      orderNo: order.orderNo,
      status: order.status,
      source: order.source ?? null,
      startTime: order.startTime,
      endTime: order.endTime,
      serviceType: order.serviceType ?? null,
      remark: order.remark ?? null,
      address: order.address ?? null,
      quotePrice: order.quotePrice ?? null,
      fundDiscountAmount: order.fundDiscountAmount ?? 0,
      paymentStatus: order.paymentStatus ?? 'unpaid',
      paidAmount: order.paidAmount ?? 0,
      paidAt: order.paidAt ?? null,
      quoteRemark: order.quoteRemark ?? null,
      quotedAt: order.quotedAt ?? null,
      isDepositPaid: order.isDepositPaid,
      depositAmount: order.depositAmount ?? 0,
      customTitle: order.customTitle ?? null,
      customDescription: order.customDescription ?? null,
      customImages: order.customImages
        ? (() => {
            try {
              return JSON.parse(order.customImages);
            } catch {
              return [];
            }
          })()
        : [],
      clientPhotos: this.parsePhotoList(order.clientPhotos),
      technician: order.technician
        ? {
            id: order.technician.id,
            name: order.technician.name,
            phone: order.technician.phone,
            avatarUrl: order.technician.avatarUrl,
          }
        : null,
      shopAddress: matchedShopAddress
        ? {
            name: matchedShopAddress.name,
            phone: matchedShopAddress.phone,
            province: matchedShopAddress.province,
            city: matchedShopAddress.city,
            district: matchedShopAddress.district,
            detailAddress: matchedShopAddress.detailAddress,
            doorInfo: matchedShopAddress.doorInfo,
          }
        : null,
      customer: order.customer ?? null,
      clientAddress: order.clientAddress ?? null,
      review: order.review ? this.mapReview(order.review) : null,
      sourceWork: order.sourceWork ?? null,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    };
  }

  private mapReview(review: any) {
    let photos: string[] = [];
    if (review.photos) {
      try {
        photos = JSON.parse(review.photos);
      } catch {
        photos = [];
      }
    }
    return {
      id: review.id,
      orderId: review.orderId,
      rating: review.rating,
      content: review.content ?? '',
      photos,
      photoUseAuthorized: Boolean(review.photoUseAuthorized),
      photoUseAuthorizedAt: review.photoUseAuthorizedAt ?? null,
      createdAt: review.createdAt,
      updatedAt: review.updatedAt,
    };
  }

  private parsePhotoList(value?: string | null): string[] {
    if (!value) return [];
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed)
        ? parsed.filter((item): item is string => typeof item === 'string')
        : [];
    } catch {
      return [];
    }
  }

  private canUpdateOrder(order: any) {
    return ['pending_quote', 'pending_agree', 'pending_confirm'].includes(
      order.status,
    );
  }

  private buildStartTime(serviceDate: string, startTime: string) {
    return parseBusinessDateTime(serviceDate, startTime);
  }

  private buildDefaultBusinessHours(): ShopBusinessHour[] {
    return Array.from({ length: 7 }, (_, weekday) => ({
      weekday,
      start: '10:00',
      end: '21:00',
      closed: false,
    }));
  }

  private normalizeShopAddresses(
    shopAddressesRaw: string | null,
  ): ShopAddressConfig[] {
    if (!shopAddressesRaw) {
      return [];
    }

    try {
      const parsed = JSON.parse(shopAddressesRaw);
      if (!Array.isArray(parsed)) {
        return [];
      }

      return parsed.map((item: any) => {
        const defaultBusinessHours = this.buildDefaultBusinessHours();
        const configuredBusinessHours = Array.isArray(item?.businessHours)
          ? item.businessHours
          : [];
        const businessHours = defaultBusinessHours.map((defaultItem) => {
          const matchedItem = configuredBusinessHours.find(
            (candidate: any) => candidate?.weekday === defaultItem.weekday,
          );
          return matchedItem
            ? {
                ...defaultItem,
                ...matchedItem,
              }
            : defaultItem;
        });

        return {
          ...item,
          enabled: item?.enabled ?? true,
          businessHours,
        };
      });
    } catch {
      return [];
    }
  }

  private getWeekday(serviceDate: string) {
    return new Date(`${serviceDate}T00:00:00`).getDay();
  }

  private timeToMinutes(value: string) {
    const [hours, minutes] = value.split(':').map((item) => Number(item));
    if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
      throw new BadRequestException('预约时间格式无效');
    }

    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
      throw new BadRequestException('预约时间格式无效');
    }

    return hours * 60 + minutes;
  }

  private assertShopOrderAvailability(
    shopAddress: ShopAddressConfig,
    serviceDate: string,
    startTime: string,
  ) {
    if (shopAddress.enabled === false) {
      throw new BadRequestException('该店铺当前已关闭，暂不可预约');
    }

    const businessHours =
      Array.isArray(shopAddress.businessHours) &&
      shopAddress.businessHours.length > 0
        ? shopAddress.businessHours
        : this.buildDefaultBusinessHours();
    const weekday = this.getWeekday(serviceDate);
    const matchedHours = businessHours.find((item) => item.weekday === weekday);

    if (!matchedHours || matchedHours.closed) {
      throw new BadRequestException('预约时间不在店铺营业时间内');
    }

    const bookingMinutes = this.timeToMinutes(startTime);
    const startMinutes = this.timeToMinutes(matchedHours.start);
    const endMinutes = this.timeToMinutes(matchedHours.end);

    if (endMinutes <= startMinutes) {
      throw new BadRequestException('该店铺营业时间配置异常，请联系美甲师');
    }

    if (bookingMinutes < startMinutes || bookingMinutes >= endMinutes) {
      throw new BadRequestException('预约时间不在店铺营业时间内');
    }
  }

  private resolveSelectedServiceNames(
    serviceItemsRaw: string | null,
    selectedServiceIds?: string[],
  ) {
    const serviceItems = serviceItemsRaw
      ? JSON.parse(serviceItemsRaw)
      : buildDefaultServiceItems();

    if (!selectedServiceIds || selectedServiceIds.length === 0) {
      throw new BadRequestException('请选择至少一项服务内容');
    }

    const selectedServices = serviceItems.filter(
      (item: any) => selectedServiceIds.includes(item.id) && item.isActive,
    );

    if (selectedServices.length !== selectedServiceIds.length) {
      throw new BadRequestException('所选服务内容已失效，请重新选择');
    }

    return selectedServices
      .sort((left: any, right: any) => left.sortOrder - right.sortOrder)
      .map((item: any) => item.name);
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
        startTime: {
          lt: endTime,
        },
        endTime: {
          gt: startTime,
        },
      },
      select: { id: true },
    });

    if (conflict) {
      throw new BadRequestException('该时段已被预约，请选择其他时间');
    }
  }

  private async assertNoBlockedConflict(
    tx: Prisma.TransactionClient,
    techId: number,
    startTime: Date,
    blockEnd: Date,
    ignoreOrderId?: number,
  ) {
    const conflict = await tx.blockedTimeSlot.findFirst({
      where: {
        techId,
        NOT: ignoreOrderId ? { orderId: ignoreOrderId } : undefined,
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
  }

  private normalizeCity(s?: string | null) {
    return (s || '').trim().replace(/市$/, '');
  }
  private assertSameCity(
    tech: { province?: string | null; city?: string | null },
    addr: { province?: string | null; city?: string | null },
  ) {
    if (!tech.city) return;
    const cityOk =
      this.normalizeCity(addr.city) === this.normalizeCity(tech.city);
    if (!cityOk) {
      throw new BadRequestException('跨城美甲无法预约');
    }
  }

  private async resolveOrderAddressAndCustomerName(
    clientUserId: number,
    client: { nickname: string | null; phone: string },
    technician: {
      shopAddresses: string | null;
      province?: string | null;
      city?: string | null;
    },
    dto: CreateClientOrderDto,
  ) {
    if (dto.serviceType === '上门美甲') {
      if (!dto.addressId) {
        throw new BadRequestException('请选择上门服务地址');
      }

      const address = await this.prisma.clientAddress.findFirst({
        where: {
          id: dto.addressId,
          clientId: clientUserId,
        },
      });

      if (!address) {
        throw new NotFoundException('地址不存在');
      }

      this.assertSameCity(
        { province: technician.province, city: technician.city },
        { province: address.province, city: address.city },
      );

      return {
        addressId: address.id,
        orderAddress: this.formatAddress(address),
        customerName: address.contactName || client.nickname || client.phone,
      };
    }

    if (dto.serviceType === '到店美甲') {
      if (!dto.shopAddress) {
        throw new BadRequestException('请选择到店服务地址');
      }

      const technicianShopAddresses = this.normalizeShopAddresses(
        technician.shopAddresses,
      );
      const matchedShopAddress = technicianShopAddresses.find(
        (item: any) => item.name === dto.shopAddress?.name,
      );

      if (!matchedShopAddress) {
        throw new BadRequestException('请选择有效的店铺地址');
      }

      this.assertShopOrderAvailability(
        matchedShopAddress,
        dto.serviceDate,
        dto.startTime,
      );

      const orderAddress = [
        matchedShopAddress.province,
        matchedShopAddress.city,
        matchedShopAddress.district,
        matchedShopAddress.detailAddress,
        matchedShopAddress.doorInfo,
      ]
        .filter((item: string | undefined) => Boolean(item))
        .join(' ');

      return {
        addressId: null,
        orderAddress,
        customerName: client.nickname || client.phone,
      };
    }

    throw new BadRequestException('请选择有效的服务类型');
  }

  async getBlockedSlots(techId: number) {
    const now = new Date();
    const blockedSlots = await this.prisma.blockedTimeSlot.findMany({
      where: {
        techId,
        endTime: { gte: now },
      },
      select: {
        startTime: true,
        endTime: true,
      },
      orderBy: { startTime: 'asc' },
    });

    return blockedSlots;
  }

  private formatAddress(address: {
    province: string | null;
    city: string | null;
    district: string | null;
    detailAddress: string | null;
    doorInfo: string | null;
  }) {
    return [
      address.province,
      address.city,
      address.district,
      address.detailAddress,
      address.doorInfo,
    ]
      .filter((item): item is string => Boolean(item))
      .join(' ');
  }

  private generateOrderNo() {
    return `OD${Date.now()}${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
  }

  private generateRevenueNo() {
    return `RV${Date.now()}${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
  }
}
