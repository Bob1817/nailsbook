import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';
import { PrismaService } from '../common/prisma/prisma.service';
import { ClientOrdersService } from '../orders/client-orders.service';
import { WorkShareCodeService } from '../technician-works/work-share-code.service';
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
    private readonly shareCode: WorkShareCodeService,
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
    const isHome = dto.serviceType === '上门美甲';
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
        shopNameSnapshot: isHome ? null : (shop?.name || null),
        shopAddressSnapshot: isHome ? null : shopAddress,
        shopLatitudeSnapshot: isHome ? null : this.coordinate(shop?.latitude),
        shopLongitudeSnapshot: isHome ? null : this.coordinate(shop?.longitude),
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
      include: {
        lines: { orderBy: { sortOrder: 'asc' } },
        order: true,
        customer: { select: { name: true, phone: true } },
      },
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

  // 报价单下载图：底部按钮区替换为小程序码，扫码直达报价确认页。
  async renderImage(technicianId: number, id: number) {
    const quote = await this.prisma.bookingQuote.findFirst({
      where: { id, technicianId },
      include: { lines: { orderBy: { sortOrder: 'asc' } }, order: true },
    });
    if (!quote) throw new NotFoundException('报价不存在');
    const code = await this.shareCode.generateForQuote(quote.publicToken);
    const codeSize = 300;
    const { svg, codeTop } = this.renderQuoteSvg(quote, codeSize);
    const codeImage = await sharp(Buffer.from(code.imageBase64, 'base64'))
      .resize(codeSize, codeSize)
      .png()
      .toBuffer();
    const png = await sharp(Buffer.from(svg))
      .png()
      .composite([
        { input: codeImage, top: codeTop, left: (750 - codeSize) / 2 },
      ])
      .toBuffer();
    return {
      imageBase64: png.toString('base64'),
      mimeType: 'image/png',
      fileName: `nailart-quote-${quote.quoteNo}.png`,
    };
  }

  private renderQuoteSvg(quote: any, codeSize: number) {
    const width = 750;
    const money = (fen: number) =>
      (Number(fen || 0) / 100).toFixed(2).replace(/\.00$/, '');
    const short = (value: string, max: number) =>
      value.length > max ? `${value.slice(0, max)}…` : value;
    const rows: string[] = [
      `预计时长 ${Number(quote.totalDurationMinutes || 0)} 分钟`,
    ];
    if (quote.clientName) rows.push(`客户：${quote.clientName}`);
    rows.push(`报价单号 ${quote.quoteNo}`);
    if (quote.expiresAt) {
      const date = new Date(quote.expiresAt);
      rows.push(
        `有效期至 ${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`,
      );
    }
    let y = 382;
    const lineSvg = (quote.lines || [])
      .map((line: any) => {
        const quantity = Number(line.quantity || 1);
        const svg = `<text x="84" y="${y}" fill="#1D1D1F" font-size="28">${this.escapeXml(
          short(String(line.nameSnapshot || ''), 14),
        )}${quantity > 1 ? ` × ${quantity}` : ''}</text><text x="666" y="${y}" text-anchor="end" fill="#1D1D1F" font-size="28">¥${money(
          line.subtotalFen,
        )}</text>`;
        y += 64;
        return svg;
      })
      .join('');
    const dividerY = y - 24;
    const totalY = dividerY + 62;
    const metaTop = totalY + 56;
    const metaSvg = rows
      .map(
        (row, index) =>
          `<text x="84" y="${metaTop + index * 46}" fill="#6E6E73" font-size="26">${this.escapeXml(
            row,
          )}</text>`,
      )
      .join('');
    const codeTop = metaTop + rows.length * 46 + 56;
    const height = codeTop + codeSize + 50;
    const headline = `${quote.technicianNameSnapshot || '美甲师'}${
      quote.shopNameSnapshot ? ` · ${quote.shopNameSnapshot}` : ''
    }`;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="${width}" height="${height}" fill="#F4F2EF"/><rect x="36" y="36" width="678" height="${height - 72}" rx="36" fill="#FFFFFF"/><text x="375" y="118" text-anchor="middle" fill="#A8A29E" font-size="22" letter-spacing="6">ONLYNAIL</text><text x="375" y="180" text-anchor="middle" fill="#1D1D1F" font-size="46" font-weight="700">专属美甲方案</text><text x="375" y="234" text-anchor="middle" fill="#6E6E73" font-size="28">${this.escapeXml(
      headline,
    )}</text><line x1="84" y1="282" x2="666" y2="282" stroke="#EDEBE8" stroke-width="2"/><text x="84" y="332" fill="#A8A29E" font-size="24">报价明细</text>${lineSvg}<line x1="84" y1="${dividerY}" x2="666" y2="${dividerY}" stroke="#EDEBE8" stroke-width="2"/><text x="84" y="${totalY}" fill="#6E6E73" font-size="28">合计</text><text x="666" y="${totalY}" text-anchor="end" fill="#1D1D1F" font-size="42" font-weight="700">¥${money(
      quote.finalPriceFen,
    )}</text>${metaSvg}<text x="375" y="${codeTop - 28}" text-anchor="middle" fill="#6E6E73" font-size="26">微信扫码查看报价单 · 确认后可直接预约</text></svg>`;
    return { svg, codeTop };
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
      const viewedQuote = await this.prisma.bookingQuote.update({
        where: { id: quote.id },
        data: { status: 'viewed', viewedAt: quote.viewedAt ?? new Date() },
        include: { lines: { orderBy: { sortOrder: 'asc' } }, order: true },
      });
      quote = { ...quote, ...viewedQuote };
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
      data: { status: 'declined', declinedAt: new Date(), declineReason: reason },
    });
    if (!result.count) throw new BadRequestException('当前报价不能提交反馈');
    return { saved: true, status: 'declined' };
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
    if (quote.serviceType === '上门美甲' && !dto.addressId) {
      throw new BadRequestException('上门美甲请选择服务地址');
    }

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
        shopAddress: quote.serviceType === '上门美甲' ? undefined : (quote.shopNameSnapshot
          ? { name: quote.shopNameSnapshot }
          : undefined),
        addressId: quote.serviceType === '上门美甲' ? dto.addressId : undefined,
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
      include: {
        lines: { orderBy: { sortOrder: 'asc' } },
        order: true,
        technician: {
          select: {
            id: true,
            city: true,
            province: true,
            serviceArea: true,
            homeServiceRadius: true,
          },
        },
      },
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
      ...(includeShareToken
        ? {
            customer: quote.customer
              ? { name: quote.customer.name, phone: quote.customer.phone }
              : null,
          }
        : {}),
      status: quote.status,
      clientUserId: quote.clientUserId,
      version: quote.version,
      clientName: quote.clientName,
      requirement: quote.requirement,
      referenceImages: this.parseJson<string[]>(quote.referenceImages, []),
      serviceType: quote.serviceType,
      technicianId: quote.technicianId,
      technicianName: quote.technicianNameSnapshot,
      technicianAvatarUrl: quote.technicianAvatarSnapshot,
      technicianCity: quote.technician?.city || null,
      technicianProvince: quote.technician?.province || null,
      technicianServiceArea: quote.technician?.serviceArea || null,
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

  private escapeXml(value: string) {
    return value.replace(
      /[<>&"']/g,
      (character) =>
        ({
          '<': '&lt;',
          '>': '&gt;',
          '&': '&amp;',
          '"': '&quot;',
          "'": '&apos;',
        })[character] || character,
    );
  }

  // 邀请卡下载图：与预约成功页邀请卡同构；店铺环境图缺省时以品牌装饰兜底。
  async renderInvitationImage(token: string) {
    let quote = await this.findByToken(token);
    quote = await this.refreshState(quote);
    if (quote.status !== 'booked' || !quote.order) {
      throw new BadRequestException('预约完成后才能下载邀请卡');
    }
    const full = await this.prisma.bookingQuote.findUnique({
      where: { id: quote.id },
      include: { lines: { orderBy: { sortOrder: 'asc' } }, order: true },
    });
    if (!full) throw new NotFoundException('报价不存在');
    const heroSource = await this.loadShopCover(
      full.technicianId,
      full.shopNameSnapshot || '',
    );
    let heroBuffer: Buffer | null = null;
    if (heroSource) {
      try {
        heroBuffer = await sharp(heroSource)
          .resize(750, 400, { fit: 'cover' })
          .png()
          .toBuffer();
      } catch {
        heroBuffer = null;
      }
    }
    const { svg, scrim } = this.renderInvitationSvg(full, Boolean(heroBuffer));
    const composites = heroBuffer
      ? [
          { input: heroBuffer, top: 0, left: 0 },
          { input: Buffer.from(scrim), top: 0, left: 0 },
        ]
      : [];
    const png = await sharp(Buffer.from(svg))
      .png()
      .composite(composites)
      .toBuffer();
    return {
      imageBase64: png.toString('base64'),
      mimeType: 'image/png',
      fileName: `nailart-invitation-${full.quoteNo}.png`,
    };
  }

  private async loadShopCover(
    technicianId: number,
    shopName: string,
  ): Promise<Buffer | null> {
    try {
      const technician = await this.prisma.technician.findUnique({
        where: { id: technicianId },
        select: { shopAddresses: true },
      });
      const shops = this.parseJson<
        Array<{ name?: string; enabled?: boolean; photos?: string[] }>
      >(technician?.shopAddresses, []);
      const photosOf = (shop: { photos?: string[] }) =>
        Array.isArray(shop?.photos) ? shop.photos.filter(Boolean) : [];
      const shop =
        shops.find(
          (item) => item.name && item.name === shopName && photosOf(item).length,
        ) ||
        shops.find((item) => item.enabled !== false && photosOf(item).length) ||
        shops.find((item) => photosOf(item).length);
      const photo = shop ? photosOf(shop)[0] : '';
      if (!photo) return null;
      if (photo.startsWith('/uploads/')) {
        return fs.readFileSync(
          path.resolve(process.cwd(), 'uploads', photo.slice('/uploads/'.length)),
        );
      }
      if (/^https?:\/\//.test(photo)) {
        const response = await fetch(photo, { signal: AbortSignal.timeout(8000) });
        if (!response.ok) return null;
        return Buffer.from(await response.arrayBuffer());
      }
      return null;
    } catch {
      // 环境图仅用于美化邀请卡，任何失败都回退到品牌装饰版式
      return null;
    }
  }

  private renderInvitationSvg(quote: any, hasHero: boolean) {
    const width = 750;
    const heroHeight = 400;
    const money = (fen: number) =>
      (Number(fen || 0) / 100).toFixed(2).replace(/\.00$/, '');
    const start = quote.order?.startTime ? new Date(quote.order.startTime) : null;
    const valid = start && !Number.isNaN(start.getTime());
    const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    const dateText = valid ? `${start.getMonth() + 1}月${start.getDate()}日` : '待确认';
    const weekday = valid ? weekdays[start.getDay()] : '待定';
    const timeText = valid
      ? `${String(start.getHours()).padStart(2, '0')}:${String(start.getMinutes()).padStart(2, '0')}`
      : '--:--';
    const name = quote.technicianNameSnapshot || '美甲师';
    const orderNo = String(quote.order?.orderNo || quote.quoteNo || '');
    const brandPill = `<rect x="594" y="28" width="128" height="48" rx="24" fill="rgba(29,29,31,0.88)"/><text x="658" y="59" text-anchor="middle" fill="#FFFFFF" font-size="20" font-weight="600">OnlyNail</text>`;
    const statusPill = (dark: boolean) =>
      `<rect x="40" y="${heroHeight - 84}" width="176" height="52" rx="26" fill="${dark ? 'rgba(255,255,255,0.94)' : '#FFFFFF'}"/><text x="128" y="${heroHeight - 50}" text-anchor="middle" fill="#1D1D1F" font-size="22" font-weight="600">✓ 预约成功</text>`;
    const heroSvg = hasHero
      ? `<rect width="${width}" height="${heroHeight}" fill="#ECEAE6"/>`
      : `<rect width="${width}" height="${heroHeight}" fill="#ECEAE6"/><circle cx="640" cy="60" r="180" fill="rgba(29,29,31,.04)"/><circle cx="560" cy="380" r="130" fill="rgba(29,29,31,.04)"/><text x="375" y="212" text-anchor="middle" fill="#6E6E73" font-size="20" letter-spacing="4">ONLYNAIL · PRIVATE APPOINTMENT</text>${brandPill}${statusPill(false)}`;
    let y = heroHeight + 56;
    const headSvg = `<text x="40" y="${y}" fill="#A8A29E" font-size="20" letter-spacing="3">APPOINTMENT INVITATION</text><text x="710" y="${y}" text-anchor="end" fill="#A8A29E" font-size="16">NO. ${this.escapeXml(orderNo)}</text>`;
    y += 48;
    const titleSvg = `<text x="40" y="${y}" fill="#1D1D1F" font-size="36" font-weight="700">专属预约邀请卡</text>`;
    y += 42;
    const greetingSvg = `<text x="40" y="${y}" fill="#48484D" font-size="24">致 ${this.escapeXml(String(quote.clientName || '亲爱的客人'))}，期待与你相见。</text>`;
    const timeTop = y + 28;
    const timeHeight = 150;
    const timeSvg = `<rect x="40" y="${timeTop}" width="670" height="${timeHeight}" rx="20" fill="#F4F2EF"/><text x="207" y="${timeTop + 66}" text-anchor="middle" fill="#1D1D1F" font-size="34" font-weight="650">${this.escapeXml(dateText)}</text><text x="207" y="${timeTop + 106}" text-anchor="middle" fill="#6E6E73" font-size="20">${this.escapeXml(weekday)}</text><line x1="375" y1="${timeTop + 34}" x2="375" y2="${timeTop + timeHeight - 34}" stroke="#E3E0DB" stroke-width="1"/><text x="543" y="${timeTop + 66}" text-anchor="middle" fill="#1D1D1F" font-size="34" font-weight="650">${this.escapeXml(timeText)}</text><text x="543" y="${timeTop + 106}" text-anchor="middle" fill="#6E6E73" font-size="20">已确认到店时间</text>`;
    const factsTop = timeTop + timeHeight + 16;
    const factsHeight = 96;
    const cellWidth = 212;
    const gap = 17;
    const cell = (index: number, label: string, value: string) => {
      const left = 40 + index * (cellWidth + gap);
      return `<rect x="${left}" y="${factsTop}" width="${cellWidth}" height="${factsHeight}" rx="16" fill="#F4F2EF"/><text x="${left + cellWidth / 2}" y="${factsTop + 40}" text-anchor="middle" fill="#A8A29E" font-size="18">${this.escapeXml(label)}</text><text x="${left + cellWidth / 2}" y="${factsTop + 72}" text-anchor="middle" fill="#1D1D1F" font-size="22" font-weight="600">${this.escapeXml(value)}</text>`;
    };
    const factsSvg =
      cell(0, '美甲师', name) +
      cell(1, '预计时长', `${Number(quote.totalDurationMinutes || 0)} 分钟`) +
      cell(2, '确认价格', `¥${money(quote.finalPriceFen)}`);
    const signTop = factsTop + factsHeight + 40;
    const signSvg = `<text x="40" y="${signTop}" fill="#6E6E73" font-size="18" letter-spacing="1">美甲师确认 · ${this.escapeXml(name)}</text><text x="710" y="${signTop}" text-anchor="end" fill="#6E6E73" font-size="18" letter-spacing="3" font-weight="600">ONLYNAIL</text>`;
    const height = signTop + 44;
    const scrim = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${heroHeight}"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="rgba(29,29,31,0.10)"/><stop offset="1" stop-color="rgba(29,29,31,0.66)"/></linearGradient></defs><rect width="${width}" height="${heroHeight}" fill="url(#g)"/>${brandPill}${statusPill(true)}</svg>`;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="${width}" height="${height}" fill="#FFFFFF"/>${heroSvg}${headSvg}${titleSvg}${greetingSvg}${timeSvg}${factsSvg}${signSvg}</svg>`;
    return { svg, scrim };
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
