import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateQuickQuoteDto } from './dto/create-quick-quote.dto';

@Injectable()
export class QuickQuotesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateQuickQuoteDto, technicianId?: number) {
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('请至少包含一项服务明细');
    }

    const sumPriceFen = dto.items.reduce(
      (sum, item) => sum + Number(item.priceFen || 0),
      0,
    );

    const finalPriceFen = Number(dto.finalPriceFen ?? sumPriceFen);

    let adjustmentType = 'NONE';
    let adjustmentFen = 0;

    if (finalPriceFen > sumPriceFen) {
      adjustmentType = 'OTHER';
      adjustmentFen = finalPriceFen - sumPriceFen;
    } else if (finalPriceFen < sumPriceFen) {
      adjustmentType = 'DISCOUNT';
      adjustmentFen = sumPriceFen - finalPriceFen;
    }

    const quoteNo = `QQ${Date.now().toString(36).toUpperCase()}${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
    const publicToken = crypto.randomBytes(16).toString('hex');
    const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000); // 严格 2 小时

    const record = await this.prisma.quickQuoteSnapshot.create({
      data: {
        quoteNo,
        publicToken,
        themeCode: dto.themeCode || 'minimal-white',
        technicianName: dto.technicianName?.trim() || null,
        technicianPhone: dto.technicianPhone?.trim() || null,
        shopName: dto.shopName?.trim() || null,
        technicianId: technicianId || null,
        itemsJson: JSON.stringify(dto.items),
        sumPriceFen,
        finalPriceFen,
        adjustmentType,
        adjustmentFen,
        adjustmentNote: dto.adjustmentNote?.trim() || null,
        isInteractive: false, // 免费版无法交互预约
        expiresAt,
      },
    });

    return {
      quoteNo: record.quoteNo,
      publicToken: record.publicToken,
      themeCode: record.themeCode,
      sumPriceFen: record.sumPriceFen,
      finalPriceFen: record.finalPriceFen,
      adjustmentType: record.adjustmentType,
      adjustmentFen: record.adjustmentFen,
      expiresAt: record.expiresAt,
      remainingSeconds: 7200,
    };
  }

  async getPublicDetail(token: string) {
    const record = await this.prisma.quickQuoteSnapshot.findUnique({
      where: { publicToken: token },
    });

    if (!record) {
      throw new NotFoundException('报价单不存在或已删除');
    }

    const now = new Date();
    if (now > record.expiresAt) {
      throw new HttpException(
        {
          statusCode: HttpStatus.GONE,
          message: '该报价单已超过 2 小时有效期，请联系美甲师重新发送',
          code: 'QUOTE_EXPIRED',
          expiresAt: record.expiresAt,
        },
        HttpStatus.GONE,
      );
    }

    // 增加浏览计数
    await this.prisma.quickQuoteSnapshot.update({
      where: { id: record.id },
      data: {
        viewCount: { increment: 1 },
        viewedAt: now,
      },
    });

    const parsedItems = JSON.parse(record.itemsJson || '[]');
    const remainingSeconds = Math.max(
      0,
      Math.floor((record.expiresAt.getTime() - now.getTime()) / 1000),
    );

    return {
      quoteNo: record.quoteNo,
      publicToken: record.publicToken,
      themeCode: record.themeCode,
      technicianName: record.technicianName,
      technicianPhone: record.technicianPhone,
      shopName: record.shopName,
      items: parsedItems,
      sumPriceFen: record.sumPriceFen,
      finalPriceFen: record.finalPriceFen,
      adjustmentType: record.adjustmentType,
      adjustmentFen: record.adjustmentFen,
      adjustmentNote: record.adjustmentNote,
      isInteractive: record.isInteractive, // false
      expiresAt: record.expiresAt,
      remainingSeconds,
      createdAt: record.createdAt,
    };
  }
}
