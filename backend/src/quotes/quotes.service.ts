import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import * as crypto from 'crypto';

@Injectable()
export class QuotesService {
  constructor(private prisma: PrismaService) {}

  async findAll(page: number = 1, limit: number = 20, technicianId?: number, customerId?: number, status?: string) {
    const where: any = {};

    if (technicianId) {
      where.technicianId = technicianId;
    }

    if (customerId) {
      where.customerId = customerId;
    }

    if (status) {
      where.status = status;
    }

    const [quotes, total] = await Promise.all([
      this.prisma.quote.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          technician: {
            select: { id: true, name: true, phone: true },
          },
          customer: {
            select: { id: true, name: true, phone: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.quote.count({ where }),
    ]);

    return {
      data: quotes,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: number) {
    const quote = await this.prisma.quote.findUnique({
      where: { id },
      include: {
        technician: { select: { id: true, name: true, phone: true } },
        customer: { select: { id: true, name: true, phone: true } },
        booking: true,
      },
    });

    if (!quote) {
      throw new NotFoundException('Quote not found');
    }

    return quote;
  }

  async cancel(id: number) {
    const quote = await this.findOne(id);

    if (quote.status !== 'pending') {
      throw new Error('Only pending quotes can be cancelled');
    }

    return this.prisma.quote.update({
      where: { id },
      data: {
        status: 'cancelled',
        cancelledAt: new Date(),
      },
    });
  }

  private generateQuoteNo(): string {
    return `QT${Date.now()}${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
  }
}
