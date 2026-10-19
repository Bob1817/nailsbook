import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { ClientOrdersService } from '../orders/client-orders.service';
import { BookBookingQuoteDto } from './dto/book-booking-quote.dto';
import {
  BookingQuoteLineDto,
  CreateBookingQuoteDto,
} from './dto/create-booking-quote.dto';
import * as crypto from 'crypto';

type ShopAddress = {
  name?: string;
  province?: string;
  city?: string;
  district?: string;
  detailAddress?: string;
  enabled?: boolean;
  latitude?: number | string;
  longitude?: number | string;
};

@Injectable()
export class BookingQuotesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly clientOrders: ClientOrdersService,
  ) {}

  async create(technicianId: number, dto: CreateBookingQuoteDto) {
    if (!dto.lines?.length)
      throw new BadRequestException('请至少添加一项报价明细');
    const technician = await this.prisma.technician.findUnique({
      where: { id: technicianId },
      include: {
        brandProfile: {
          select: { latePolicy: true, cancellationPolicy: true },
        },
      },
    });
    if (!technician || technician.status !== 'active') {
      throw new BadRequestException('当前账号暂不能创建报价');
    }
    if (!technician.invitationCode) {
      throw new BadRequestException('请先生成美甲师邀请码后再创建报价');
    }

    const serviceIds = dto.lines
      .filter((line) => line.lineType === 'service')
      .map((line) => line.servicePublicId)
      .filter((id): id is string => Boolean(id));
    const services = await this.prisma.service.findMany({
      where: {
        technicianId,
        publicId: { in: serviceIds },
        archivedAt: null,
        isBookable: true,
      },
    });
    const servicesByPublicId = new Map(
      services.map((item) => [item.publicId, item]),
    );
    const lines = dto.lines.map((line, index) =>
      this.normalizeLine(line, index, servicesByPublicId),
    );
    if (
      serviceIds.length !==
      lines.filter((line) => line.lineType === 'service').length
    ) {
      throw new BadRequestException('基础服务已变更，请重新选择');
    }

    const totals = lines.reduce(
      (sum, line) => {
        sum.totalDurationMinutes += line.durationMinutes * line.quantity;
        if (line.lineType === 'service')
          sum.serviceSubtotalFen += line.subtotalFen;
        if (line.lineType === 'material')
          sum.materialSubtotalFen += line.subtotalFen;
        if (line.lineType === 'surcharge')
          sum.surchargeSubtotalFen += line.subtotalFen;
        return sum;
      },
      {
        serviceSubtotalFen: 0,
        materialSubtotalFen: 0,
        surchargeSubtotalFen: 0,
        totalDurationMinutes: 0,
      },
    );
    totals.totalDurationMinutes =
      dto.totalDurationMinutes ?? totals.totalDurationMinutes;
    if (totals.totalDurationMinutes < 1) {
      throw new BadRequestException('请填写预计服务时长');
    }
    const calculatedFen =
      totals.serviceSubtotalFen +
      totals.materialSubtotalFen +
      totals.surchargeSubtotalFen;
    const finalPriceFen = dto.finalPriceFen ?? calculatedFen;
    if (finalPriceFen < 1) throw new BadRequestException('最终报价必须大于 0');
    const shops = this.parseJson<ShopAddress[]>(technician.shopAddresses, []);
    const shop = shops.find((item) => item.enabled !== false) ?? shops[0];
    const shopAddress = shop
      ? [shop.province, shop.city, shop.district, shop.detailAddress]
          .filter(Boolean)
          .join(' ')
      : null;
    const expiresAt = new Date(Date.now() + (dto.validDays ?? 7) * 86400000);
    const quote = await this.prisma.bookingQuote.create({
      data: {
        quoteNo: this.quoteNo(),
        publicToken: crypto.randomBytes(24).toString('hex'),
        technicianId,
        status: 'issued',
        clientName: dto.clientName?.trim() || null,
        requirement: dto.requirement?.trim() || null,
        referenceImages: dto.referenceImages?.length
          ? JSON.stringify(dto.referenceImages)
          : null,
        serviceType: dto.serviceType ?? '到店美甲',
        technicianNameSnapshot: technician.name,
        technicianAvatarSnapshot: technician.avatarUrl,
        invitationCodeSnapshot: technician.invitationCode,
        shopNameSnapshot: shop?.name || null,
        shopAddressSnapshot: shopAddress,
        shopLatitudeSnapshot: this.coordinate(shop?.latitude),
        shopLongitudeSnapshot: this.coordinate(shop?.longitude),
        bookingRulesSnapshot: this.bookingRules(technician),
        ...totals,
        discountAmountFen: Math.max(0, calculatedFen - finalPriceFen),
        finalPriceFen,
        expiresAt,
        lines: {
          create: lines.map(({ lineType, ...line }) => ({ lineType, ...line })),
        },
      },
      include: { lines: { orderBy: { sortOrder: 'asc' } } },
    });
    return this.mapQuote(quote, true);
  }

  async list(technicianId: number) {
    const quotes = await this.prisma.bookingQuote.findMany({
      where: { technicianId },
      include: { lines: { orderBy: { sortOrder: 'asc' } }, order: true },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return quotes.map((quote) => this.mapQuote(quote, true));
  }

  async detail(technicianId: number, id: number) {
    const quote = await this.prisma.bookingQuote.findFirst({
      where: { id, technicianId },
      include: { lines: { orderBy: { sortOrder: 'asc' } }, order: true },
    });
    if (!quote) throw new NotFoundException('报价不存在');
    return this.mapQuote(quote, true);
  }

  async withdraw(technicianId: number, id: number) {
    const result = await this.prisma.bookingQuote.updateMany({
      where: { id, technicianId, status: { in: ['issued', 'viewed'] } },
      data: { status: 'withdrawn', withdrawnAt: new Date() },
    });
    if (!result.count) throw new BadRequestException('当前报价不能撤回');
    return this.detail(technicianId, id);
  }

  async publicDetail(token: string) {
    let quote = await this.findByToken(token);
    quote = await this.refreshState(quote);
    if (quote.status === 'issued') {
      quote = await this.prisma.bookingQuote.update({
        where: { id: quote.id },
        data: { status: 'viewed', viewedAt: quote.viewedAt ?? new Date() },
        include: { lines: { orderBy: { sortOrder: 'asc' } }, order: true },
      });
    }
    return this.mapQuote(quote, false);
  }

  async accept(clientUserId: number, token: string) {
    let quote = await this.findByToken(token);
    quote = await this.refreshState(quote);
    this.assertAcceptable(quote, clientUserId);
    const client = await this.prisma.clientUser.findUnique({
      where: { id: clientUserId },
    });
    if (!client || client.status !== 'active')
      throw new ForbiddenException('客户账号不可用');
    const hasDefault = await this.prisma.clientTechBinding.count({
      where: { clientId: clientUserId, status: 'active', isDefault: true },
    });
    const accepted = await this.prisma.$transaction(async (tx) => {
      await tx.clientTechBinding.upsert({
        where: {
          clientId_techId: {
            clientId: clientUserId,
            techId: quote.technicianId,
          },
        },
        update: {
          status: 'active',
          inviteCode: quote.invitationCodeSnapshot,
          bindSource: 'booking_quote',
        },
        create: {
          clientId: clientUserId,
          techId: quote.technicianId,
          inviteCode: quote.invitationCodeSnapshot,
          bindSource: 'booking_quote',
          isDefault: hasDefault === 0,
          status: 'active',
        },
      });
      const customer = await tx.customer.upsert({
        where: {
          technicianId_clientUserId: {
            technicianId: quote.technicianId,
            clientUserId,
          },
        },
        update: { archivedAt: null },
        create: {
          technicianId: quote.technicianId,
          clientUserId,
          name: quote.clientName || client.nickname || client.phone,
          phone: client.phone,
          sourceType: 'booking_quote',
          sourceRef: quote.quoteNo,
        },
      });
      return tx.bookingQuote.update({
        where: { id: quote.id },
        data: {
          clientUserId,
          customerId: customer.id,
          status: 'accepted_pending_schedule',
          acceptedAt: quote.acceptedAt ?? new Date(),
        },
        include: { lines: { orderBy: { sortOrder: 'asc' } }, order: true },
      });
    });
    return this.mapQuote(accepted, false);
  }

  async decline(token: string, reason: string) {
    const quote = await this.refreshState(await this.findByToken(token));
    const result = await this.prisma.bookingQuote.updateMany({
      where: {
        id: quote.id,
        status: { in: ['issued', 'viewed'] },
        clientUserId: null,
      },
      data: { declinedAt: new Date(), declineReason: reason },
    });
    if (!result.count) throw new BadRequestException('当前报价不能提交反馈');
    return { saved: true };
  }

  async book(clientUserId: number, token: string, dto: BookBookingQuoteDto) {
    let quote = await this.findByToken(token);
    quote = await this.refreshState(quote);
    if (quote.clientUserId !== clientUserId)
      throw new ForbiddenException('请先同意该报价');
    if (quote.status === 'booked' && quote.orderId)
      return this.mapQuote(quote, false);
    if (quote.status !== 'accepted_pending_schedule') {
      throw new BadRequestException('当前报价不能创建预约');
    }
    if (quote.version !== dto.version)
      throw new BadRequestException('报价已更新，请重新确认');

    const serviceIds = quote.lines
      .filter(
        (line) => line.lineType === 'service' && line.servicePublicIdSnapshot,
      )
      .map((line) => line.servicePublicIdSnapshot as string);
    const order = await this.clientOrders.create(
      clientUserId,
      {
        techId: quote.technicianId,
        serviceDate: dto.serviceDate,
        startTime: dto.startTime,
        serviceType: quote.serviceType,
        shopAddress: quote.shopNameSnapshot
          ? { name: quote.shopNameSnapshot }
          : undefined,
        applicationKey: `booking-quote-${quote.id}`,
        selectedServiceIds: serviceIds,
        customTitle: serviceIds.length ? undefined : `报价 ${quote.quoteNo}`,
        customDescription: quote.requirement || '根据专属报价确认预约',
        customImages: this.parseJson<string[]>(quote.referenceImages, []),
        remark: dto.remark,
        attributionSource: 'booking_quote',
      },
      {
        quoteNo: quote.quoteNo,
        serviceSubtotalFen:
          quote.serviceSubtotalFen +
          quote.materialSubtotalFen +
          quote.surchargeSubtotalFen,
        finalPriceFen: quote.finalPriceFen,
        totalDurationMinutes: quote.totalDurationMinutes,
        serviceLines: quote.lines.map((line) => ({
          serviceId: line.serviceId,
          servicePublicIdSnapshot: line.servicePublicIdSnapshot,
          nameSnapshot: line.nameSnapshot,
          unitPriceFen: line.unitPriceFen,
          durationMinutes: line.durationMinutes,
          quantity: line.quantity,
          subtotalFen: line.subtotalFen,
          sortOrder: line.sortOrder,
        })),
      },
    );

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: order.id },
        data: {
          discountAmountFen: quote.discountAmountFen,
          pricingDetails: JSON.stringify({
            quoteNo: quote.quoteNo,
            materialSubtotalFen: quote.materialSubtotalFen,
            surchargeSubtotalFen: quote.surchargeSubtotalFen,
          }),
          status: 'pending_shop',
          bookingPhase: 'booking',
          confirmedAt: new Date(),
          confirmedStartTime: order.startTime,
          confirmedEndTime: order.endTime,
        },
      });
      return tx.bookingQuote.update({
        where: { id: quote.id },
        data: { status: 'booked', orderId: order.id, bookedAt: new Date() },
        include: { lines: { orderBy: { sortOrder: 'asc' } }, order: true },
      });
    });
    return this.mapQuote(updated, false);
  }

  private normalizeLine(
    input: BookingQuoteLineDto,
    sortOrder: number,
    services: Map<string, any>,
  ) {
    if (input.lineType === 'service') {
      const service = input.servicePublicId
        ? services.get(input.servicePublicId)
        : null;
      if (!service || service.priceMinFen == null) {
        throw new BadRequestException('基础服务不存在或未设置价格');
      }
      const quantity = input.quantity ?? 1;
      return {
        lineType: input.lineType,
        serviceId: service.id,
        servicePublicIdSnapshot: service.publicId,
        nameSnapshot: service.name,
        unitPriceFen: service.priceMinFen,
        durationMinutes: service.durationMinutes ?? 0,
        quantity,
        subtotalFen: service.priceMinFen * quantity,
        sortOrder,
      };
    }
    const name = input.name?.trim();
    if (!name) throw new BadRequestException('请填写材料或附加项名称');
    const unitPriceFen = input.unitPriceFen ?? 0;
    const quantity = input.quantity ?? 1;
    return {
      lineType: input.lineType,
      serviceId: null,
      servicePublicIdSnapshot: null,
      nameSnapshot: name,
      unitPriceFen,
      durationMinutes: input.durationMinutes ?? 0,
      quantity,
      subtotalFen: unitPriceFen * quantity,
      sortOrder,
    };
  }

  private async findByToken(token: string) {
    if (!/^[a-f0-9]{48}$/.test(token))
      throw new NotFoundException('报价不存在');
    const quote = await this.prisma.bookingQuote.findUnique({
      where: { publicToken: token },
      include: { lines: { orderBy: { sortOrder: 'asc' } }, order: true },
    });
    if (!quote) throw new NotFoundException('报价不存在');
    return quote;
  }

  private async refreshState<
    T extends { id: number; status: string; expiresAt: Date },
  >(quote: T) {
    if (
      ['issued', 'viewed'].includes(quote.status) &&
      quote.expiresAt.getTime() <= Date.now()
    ) {
      return this.prisma.bookingQuote.update({
        where: { id: quote.id },
        data: { status: 'expired' },
        include: { lines: { orderBy: { sortOrder: 'asc' } }, order: true },
      });
    }
    return quote as any;
  }

  private assertAcceptable(quote: any, clientUserId: number) {
    if (quote.clientUserId && quote.clientUserId !== clientUserId) {
      throw new ForbiddenException('该报价已由其他客户确认');
    }
    if (
      !['issued', 'viewed', 'accepted_pending_schedule'].includes(quote.status)
    ) {
      throw new BadRequestException('当前报价不能确认');
    }
  }

  private mapQuote(quote: any, includeShareToken: boolean) {
    return {
      id: quote.id,
      quoteNo: quote.quoteNo,
      ...(includeShareToken ? { publicToken: quote.publicToken } : {}),
      ...(includeShareToken
        ? { declineReason: quote.declineReason, declinedAt: quote.declinedAt }
        : {}),
      status: quote.status,
      version: quote.version,
      clientName: quote.clientName,
      requirement: quote.requirement,
      referenceImages: this.parseJson<string[]>(quote.referenceImages, []),
      serviceType: quote.serviceType,
      technicianId: quote.technicianId,
      technicianName: quote.technicianNameSnapshot,
      technicianAvatarUrl: quote.technicianAvatarSnapshot,
      invitationCode: quote.invitationCodeSnapshot,
      shopName: quote.shopNameSnapshot,
      shopAddress: quote.shopAddressSnapshot,
      shopLatitude: quote.shopLatitudeSnapshot,
      shopLongitude: quote.shopLongitudeSnapshot,
      bookingRules: quote.bookingRulesSnapshot,
      serviceSubtotalFen: quote.serviceSubtotalFen,
      materialSubtotalFen: quote.materialSubtotalFen,
      surchargeSubtotalFen: quote.surchargeSubtotalFen,
      discountAmountFen: quote.discountAmountFen,
      finalPriceFen: quote.finalPriceFen,
      totalDurationMinutes: quote.totalDurationMinutes,
      expiresAt: quote.expiresAt,
      issuedAt: quote.issuedAt,
      createdAt: quote.createdAt,
      lines: quote.lines,
      order: quote.order
        ? {
            id: quote.order.id,
            orderNo: quote.order.orderNo,
            status: quote.order.status,
            startTime: quote.order.startTime,
            endTime: quote.order.endTime,
          }
        : null,
      sharePath: includeShareToken
        ? `/pages/client/quote-confirm/index?token=${quote.publicToken}${
            quote.invitationCodeSnapshot
              ? `&invite=${encodeURIComponent(quote.invitationCodeSnapshot)}`
              : ''
          }`
        : undefined,
    };
  }

  private parseJson<T>(raw: string | null | undefined, fallback: T): T {
    if (!raw) return fallback;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  }

  private coordinate(value: number | string | null | undefined) {
    if (value == null || value === '') return null;
    const coordinate = Number(value);
    return Number.isFinite(coordinate) ? coordinate : null;
  }

  private bookingRules(technician: any) {
    return (
      [
        technician.bookingNotes,
        technician.brandProfile?.latePolicy
          ? `迟到规则：${technician.brandProfile.latePolicy}`
          : null,
        technician.brandProfile?.cancellationPolicy
          ? `改期/取消规则：${technician.brandProfile.cancellationPolicy}`
          : null,
      ]
        .filter(Boolean)
        .join('\n') || null
    );
  }

  private quoteNo() {
    const now = new Date();
    const date = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(
      now.getDate(),
    ).padStart(2, '0')}`;
    return `ONQ${date}${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
  }
}
