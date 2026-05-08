import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateClientBookingDto } from './dto/create-client-booking.dto';
import { UpdateClientBookingDto } from './dto/update-client-booking.dto';
import { CreateBookingFromDesignDto } from './dto/create-booking-from-design.dto';
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
export class ClientBookingsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(clientUserId: number, dto: CreateClientBookingDto) {
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

    const { addressId, bookingAddress, customerName } = await this.resolveBookingAddressAndCustomerName(
      clientUserId,
      client,
      binding.technician,
      dto,
    );
    const startTime = this.buildStartTime(dto.serviceDate, dto.startTime);
    const endTime = new Date(startTime);

    const booking = await this.prisma.$transaction(async (tx) => {
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
          address: bookingAddress,
        },
      });

      const quote = await tx.quote.create({
        data: {
          quoteNo: this.generateQuoteNo(),
          technicianId: dto.techId,
          customerId: customer.id,
          title: selectedServiceNames.join('、'),
          description: dto.remark ?? `${dto.serviceType} · ${selectedServiceNames.join('、')}`,
          price: 0,
          depositAmount: 0,
          status: 'pending',
        },
      });

      const booking = await tx.booking.create({
        data: {
          bookingNo: this.generateBookingNo(),
          quoteId: quote.id,
          technicianId: dto.techId,
          customerId: customer.id,
          clientUserId,
          addressId,
          startTime,
          endTime,
          address: bookingAddress,
          serviceType: dto.serviceType,
          remark: dto.remark ?? null,
          quotePrice: 0,
          status: 'pending_confirm',
          depositAmount: 0,
          depositStatus: 'pending',
          source: 'client_webapp',
        },
        include: this.bookingInclude(),
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
          messageType: 'booking',
          content: preview,
          relatedType: 'booking',
          relatedId: booking.id,
        },
      });

      return booking;
    });

    return this.mapBooking(booking);
  }

  async findAll(clientUserId: number) {
    const bookings = await this.prisma.booking.findMany({
      where: { clientUserId },
      orderBy: [{ startTime: 'desc' }, { createdAt: 'desc' }],
      include: this.bookingInclude(),
    });

    return bookings.map((booking) => this.mapBooking(booking));
  }

  async findOne(clientUserId: number, id: number) {
    const booking = await this.prisma.booking.findFirst({
      where: {
        id,
        clientUserId,
      },
      include: this.bookingInclude(),
    });

    if (!booking) {
      throw new NotFoundException('预约不存在');
    }

    return this.mapBooking(booking);
  }

  async update(clientUserId: number, id: number, dto: UpdateClientBookingDto) {
    const booking = await this.prisma.booking.findFirst({
      where: {
        id,
        clientUserId,
      },
      include: this.bookingInclude(),
    });

    if (!booking) {
      throw new NotFoundException('预约不存在');
    }

    if (!this.canUpdateBooking(booking)) {
      throw new BadRequestException('当前预约状态不支持修改');
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
    const bookingAddress = this.formatAddress(address);

    const updatedBooking = await this.prisma.booking.update({
      where: { id },
      data: {
        addressId: address.id,
        startTime,
        endTime,
        address: bookingAddress,
      },
      include: this.bookingInclude(),
    });

    return this.mapBooking(updatedBooking);
  }

  async confirm(clientUserId: number, id: number) {
    const booking = await this.prisma.booking.findFirst({
      where: {
        id,
        clientUserId,
      },
      include: this.bookingInclude(),
    });

    if (!booking) {
      throw new NotFoundException('预约不存在');
    }

    if (this.mapStatus(booking) !== 'quoted' || booking.status !== 'pending_confirm') {
      throw new BadRequestException('当前预约状态不支持确认');
    }

    await this.assertConfirmedBookingConflict(booking.technicianId, booking.startTime, booking.endTime, booking.id);

    const updatedBooking = await this.prisma.booking.update({
      where: { id },
      data: {
        status: 'confirmed',
        confirmedAt: new Date(),
      },
      include: this.bookingInclude(),
    });

    return this.mapBooking(updatedBooking);
  }

  async updateStatus(clientUserId: number, id: number, status: 'completed' | 'cancelled') {
    const booking = await this.prisma.booking.findFirst({
      where: {
        id,
        clientUserId,
      },
      include: this.bookingInclude(),
    });

    if (!booking) {
      throw new NotFoundException('预约不存在');
    }

    if (!this.canClientHandleExpiredBookingStatus(booking)) {
      throw new BadRequestException('当前预约状态不支持客户处理');
    }

    if (status === 'completed') {
      const revenueExists = await this.prisma.revenue.findUnique({
        where: { bookingId: id },
      });

      if (revenueExists) {
        throw new BadRequestException('该预约已完成，无需重复处理');
      }

      const quote = await this.prisma.quote.findUnique({
        where: { id: booking.quoteId },
      });

      if (!quote) {
        throw new NotFoundException('预约报价不存在');
      }

      const updatedBooking = await this.prisma.$transaction(async (tx) => {
        await tx.booking.update({
          where: { id },
          data: {
            status: 'completed',
            completedAt: new Date(),
          },
        });

        await tx.revenue.create({
          data: {
            revenueNo: this.generateRevenueNo(),
            bookingId: id,
            quoteId: booking.quoteId,
            technicianId: booking.technicianId,
            customerId: booking.customerId,
            amount: quote.price,
            recognizedAt: new Date(),
            status: 'confirmed',
          },
        });

        return tx.booking.findUniqueOrThrow({
          where: { id },
          include: this.bookingInclude(),
        });
      });

      return this.mapBooking(updatedBooking);
    }

    const updatedBooking = await this.prisma.booking.update({
      where: { id },
      data: {
        status: 'cancelled',
        cancelledAt: new Date(),
      },
      include: this.bookingInclude(),
    });

    return this.mapBooking(updatedBooking);
  }

  private bookingInclude() {
    return {
      technician: { select: { id: true, name: true, phone: true } },
      customer: { select: { id: true, name: true, phone: true } },
      quote: {
        select: {
          id: true,
          quoteNo: true,
          title: true,
          description: true,
          price: true,
          status: true,
          depositAmount: true,
        },
      },
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

  private mapBooking(booking: any) {
    return {
      id: booking.id,
      bookingNo: booking.bookingNo,
      status: this.mapStatus(booking),
      source: booking.source ?? null,
      startTime: booking.startTime,
      endTime: booking.endTime,
      serviceType: booking.serviceType ?? booking.quote?.title ?? null,
      remark: booking.remark ?? null,
      address: booking.address ?? null,
      quotePrice: booking.quotePrice ?? booking.quote?.price ?? null,
      depositAmount: booking.depositAmount ?? booking.quote?.depositAmount ?? 0,
      isDepositPaid: booking.isDepositPaid,
      technician: booking.technician ?? null,
      customer: booking.customer ?? null,
      quote: booking.quote
        ? {
            id: booking.quote.id,
            quoteNo: booking.quote.quoteNo,
            title: booking.quote.title,
            description: booking.quote.description,
            price: booking.quote.price,
            status: booking.quote.status,
          }
        : null,
      clientAddress: booking.clientAddress ?? null,
      createdAt: booking.createdAt,
      updatedAt: booking.updatedAt,
    };
  }

  private mapStatus(booking: any) {
    if (booking.status === 'cancelled' || booking.quote?.status === 'cancelled') {
      return 'cancelled';
    }

    if (booking.status === 'completed') {
      return 'completed';
    }

    if (booking.status === 'confirmed') {
      return 'confirmed';
    }

    if (booking.isDepositPaid || booking.depositStatus === 'paid') {
      return 'deposit_paid';
    }

    if ((booking.depositAmount ?? 0) > 0 || (booking.quote?.depositAmount ?? 0) > 0) {
      return 'pending_deposit';
    }

    if (booking.quote?.status === 'accepted') {
      return 'quoted';
    }

    return 'pending_quote';
  }

  private canUpdateBooking(booking: any) {
    const clientStatus = this.mapStatus(booking);
    return ['pending_quote', 'quoted', 'confirmed'].includes(clientStatus);
  }

  private canClientHandleExpiredBookingStatus(booking: any) {
    return this.mapStatus(booking) === 'confirmed' && booking.status === 'confirmed' && booking.startTime <= new Date();
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

  private assertShopBookingAvailability(shopAddress: ShopAddressConfig, serviceDate: string, startTime: string) {
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

  private async assertConfirmedBookingConflict(technicianId: number, startTime: Date, endTime: Date, ignoreId?: number) {
    const conflict = await this.prisma.booking.findFirst({
      where: {
        technicianId,
        status: 'confirmed',
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

  private async resolveBookingAddressAndCustomerName(
    clientUserId: number,
    client: { nickname: string | null; phone: string },
    technician: { shopAddresses: string | null },
    dto: CreateClientBookingDto,
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
        bookingAddress: this.formatAddress(address),
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

      this.assertShopBookingAvailability(matchedShopAddress, dto.serviceDate, dto.startTime);

      const bookingAddress = [
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
        bookingAddress,
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

  private generateBookingNo() {
    return `BK${Date.now()}${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
  }

  private generateQuoteNo() {
    return `QT${Date.now()}${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
  }

  private generateRevenueNo() {
    return `RV${Date.now()}${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
  }

  async createFromDesign(clientUserId: number, dto: CreateBookingFromDesignDto) {
    // Get the design
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

    // Verify binding exists
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

    // Build address based on service type
    let addressId: number | null = null;
    let bookingAddress: string;

    if (dto.serviceType === '到店美甲' && dto.shopAddress) {
      const technicianShopAddresses = this.normalizeShopAddresses(design.technician.shopAddresses);
      const matchedShopAddress = technicianShopAddresses.find((item) => item.name === dto.shopAddress?.name);

      if (!matchedShopAddress) {
        throw new BadRequestException('请选择有效的店铺地址');
      }

      this.assertShopBookingAvailability(matchedShopAddress, dto.serviceDate, dto.startTime);

      bookingAddress = [
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
      bookingAddress = this.formatAddress(address);
    } else {
      throw new BadRequestException('请提供有效的地址信息');
    }

    const customerName = client.nickname || client.phone;
    const startTime = this.buildStartTime(dto.serviceDate, dto.startTime);
    const endTime = new Date(startTime);

    const booking = await this.prisma.$transaction(async (tx) => {
      // Create or get customer
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
          address: bookingAddress,
        },
      });

      // Update design status to converted
      await tx.clientDesignRequest.update({
        where: { id: dto.designId },
        data: { status: 'converted' },
      });

      // Create booking
      return tx.booking.create({
        data: {
          bookingNo: this.generateBookingNo(),
          quoteId: 0, // Will be updated after quote creation
          technicianId: dto.techId,
          customerId: customer.id,
          clientUserId,
          designRequestId: design.id,
          addressId,
          startTime,
          endTime,
          address: bookingAddress,
          serviceType: dto.serviceType,
          quotePrice: design.quotePrice ?? 0,
          status: 'pending_confirm',
          depositAmount: 0,
          depositStatus: 'pending',
          source: 'client_webapp',
        },
        include: this.bookingInclude(),
      });
    });

    return this.mapBooking(booking);
  }
}
