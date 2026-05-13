import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateClientOrderDto } from './dto/create-client-order.dto';
import { UpdateClientOrderDto } from './dto/update-client-order.dto';
import { CreateOrderFromDesignDto } from './dto/create-order-from-design.dto';

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

const CLIENT_STATUS_TRANSITIONS: Record<string, string[]> = {
  pending_quote: ['cancelled'],
  pending_agree: ['pending_confirm', 'pending_quote', 'cancelled'],
  pending_confirm: ['cancelled'],
  pending_home: [],
  pending_shop: [],
  in_progress: ['completed'],
  completed: [],
  cancelled: [],
};

@Injectable()
export class ClientOrdersService {
  constructor(private readonly prisma: PrismaService) {}

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

    if (dto.serviceType === '上门美甲' && !binding.technician.homeService) {
      throw new BadRequestException('该美甲师暂未开启上门美甲服务');
    }

    if (dto.serviceType === '到店美甲' && !binding.technician.shopService) {
      throw new BadRequestException('该美甲师暂未开启到店美甲服务');
    }

    const selectedServiceNames = this.resolveSelectedServiceNames(binding.technician.serviceItems, dto.selectedServiceIds);

    const client = await this.prisma.clientUser.findUnique({
      where: { id: clientUserId },
    });

    if (!client) {
      throw new NotFoundException('客户不存在');
    }

    const { addressId, orderAddress, customerName } = await this.resolveOrderAddressAndCustomerName(
      clientUserId,
      client,
      binding.technician,
      dto,
    );
    const startTime = this.buildStartTime(dto.serviceDate, dto.startTime);
    const endTime = new Date(startTime);

    const order = await this.prisma.$transaction(async (tx) => {
      const customer = await tx.customer.upsert({
        where: {
          technicianId_clientUserId: {
            technicianId: dto.techId,
            clientUserId,
          },
        },
        update: {},
        create: {
          technicianId: dto.techId,
          clientUserId,
          name: customerName,
          phone: client.phone,
          address: orderAddress,
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
          quotePrice: 0,
          status: 'pending_quote',
          source: 'client_webapp',
        },
        include: this.orderInclude(),
      });

      const preview = `新的预约申请：${selectedServiceNames.join('、')} · ${dto.serviceType}`;
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

      return createdOrder;
    });

    return this.mapOrder(order);
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
      const technicianShopAddresses = this.normalizeShopAddresses(design.technician.shopAddresses);
      const matchedShopAddress = technicianShopAddresses.find((item) => item.name === dto.shopAddress?.name);

      if (!matchedShopAddress) {
        throw new BadRequestException('请选择有效的店铺地址');
      }

      this.assertShopOrderAvailability(matchedShopAddress, dto.serviceDate, dto.startTime);

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

      addressId = address.id;
      orderAddress = this.formatAddress(address);
    } else {
      throw new BadRequestException('请提供有效的地址信息');
    }

    const customerName = client.nickname || client.phone;
    const startTime = this.buildStartTime(dto.serviceDate, dto.startTime);
    const endTime = new Date(startTime);

    const order = await this.prisma.$transaction(async (tx) => {
      const customer = await tx.customer.upsert({
        where: {
          technicianId_clientUserId: {
            technicianId: dto.techId,
            clientUserId,
          },
        },
        update: {},
        create: {
          technicianId: dto.techId,
          clientUserId,
          name: customerName,
          phone: client.phone,
          address: orderAddress,
        },
      });

      await tx.clientDesignRequest.update({
        where: { id: dto.designId },
        data: { status: 'converted' },
      });

      return tx.order.create({
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
    const endTime = new Date(startTime);
    const orderAddress = this.formatAddress(address);

    const updatedOrder = await this.prisma.order.update({
      where: { id },
      data: {
        addressId: address.id,
        startTime,
        endTime,
        address: orderAddress,
      },
      include: this.orderInclude(),
    });

    return this.mapOrder(updatedOrder);
  }

  async agree(clientUserId: number, id: number) {
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
      throw new BadRequestException('当前订单状态不支持确认报价');
    }

    const updatedOrder = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.order.update({
        where: { id },
        data: {
          status: 'pending_confirm',
          confirmedAt: new Date(),
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

      await tx.message.create({
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

      await tx.message.create({
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

    return this.mapOrder(updatedOrder);
  }

  async updateStatus(clientUserId: number, id: number, status: 'completed' | 'cancelled') {
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
        await tx.order.update({
          where: { id },
          data: {
            status: 'completed',
            completedAt: new Date(),
          },
        });

        await tx.revenue.create({
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

        return tx.order.findUniqueOrThrow({
          where: { id },
          include: this.orderInclude(),
        });
      });

      return this.mapOrder(updatedOrder);
    }

    const cancellableStatuses = ['pending_quote', 'pending_agree', 'pending_confirm'];
    if (!cancellableStatuses.includes(order.status)) {
      throw new BadRequestException('当前订单状态不支持取消');
    }

    const updatedOrder = await this.prisma.order.update({
      where: { id },
      data: {
        status: 'cancelled',
        cancelledAt: new Date(),
      },
      include: this.orderInclude(),
    });

    return this.mapOrder(updatedOrder);
  }

  private orderInclude() {
    return {
      technician: { select: { id: true, name: true, phone: true } },
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
    };
  }

  private mapOrder(order: any) {
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
      quoteRemark: order.quoteRemark ?? null,
      quotedAt: order.quotedAt ?? null,
      isDepositPaid: order.isDepositPaid,
      technician: order.technician ?? null,
      customer: order.customer ?? null,
      clientAddress: order.clientAddress ?? null,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    };
  }

  private canUpdateOrder(order: any) {
    return ['pending_quote', 'pending_agree', 'pending_confirm'].includes(order.status);
  }

  private buildStartTime(serviceDate: string, startTime: string) {
    return new Date(`${serviceDate}T${startTime}:00`);
  }

  private buildDefaultBusinessHours(): ShopBusinessHour[] {
    return Array.from({ length: 7 }, (_, weekday) => ({
      weekday,
      start: '10:00',
      end: '21:00',
      closed: false,
    }));
  }

  private normalizeShopAddresses(shopAddressesRaw: string | null): ShopAddressConfig[] {
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
        const configuredBusinessHours = Array.isArray(item?.businessHours) ? item.businessHours : [];
        const businessHours = defaultBusinessHours.map((defaultItem) => {
          const matchedItem = configuredBusinessHours.find((candidate: any) => candidate?.weekday === defaultItem.weekday);
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

  private assertShopOrderAvailability(shopAddress: ShopAddressConfig, serviceDate: string, startTime: string) {
    if (shopAddress.enabled === false) {
      throw new BadRequestException('该店铺当前已关闭，暂不可预约');
    }

    const businessHours = Array.isArray(shopAddress.businessHours) && shopAddress.businessHours.length > 0
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

  private resolveSelectedServiceNames(serviceItemsRaw: string | null, selectedServiceIds?: string[]) {
    const serviceItems = serviceItemsRaw ? JSON.parse(serviceItemsRaw) : [];

    if (!selectedServiceIds || selectedServiceIds.length === 0) {
      throw new BadRequestException('请选择至少一项服务内容');
    }

    const selectedServices = serviceItems.filter((item: any) => selectedServiceIds.includes(item.id) && item.isActive);

    if (selectedServices.length !== selectedServiceIds.length) {
      throw new BadRequestException('所选服务内容已失效，请重新选择');
    }

    return selectedServices
      .sort((left: any, right: any) => left.sortOrder - right.sortOrder)
      .map((item: any) => item.name);
  }

  private async assertOrderConflict(technicianId: number, startTime: Date, endTime: Date, ignoreId?: number) {
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

  private async resolveOrderAddressAndCustomerName(
    clientUserId: number,
    client: { nickname: string | null; phone: string },
    technician: { shopAddresses: string | null },
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

      const technicianShopAddresses = this.normalizeShopAddresses(technician.shopAddresses);
      const matchedShopAddress = technicianShopAddresses.find((item: any) => item.name === dto.shopAddress?.name);

      if (!matchedShopAddress) {
        throw new BadRequestException('请选择有效的店铺地址');
      }

      this.assertShopOrderAvailability(matchedShopAddress, dto.serviceDate, dto.startTime);

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
