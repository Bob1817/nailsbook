import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class AdminOrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(page = 1, limit = 20, status?: string, search?: string) {
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(100, Math.max(1, limit));
    const keyword = search?.trim();
    const where: Prisma.OrderWhereInput = {
      ...(status ? { status } : {}),
      ...(keyword ? {
        OR: [
          { orderNo: { contains: keyword } },
          { technician: { name: { contains: keyword } } },
          { customer: { name: { contains: keyword } } },
          { customer: { phone: { contains: keyword } } },
        ],
      } : {}),
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.order.findMany({
        where,
        skip: (safePage - 1) * safeLimit,
        take: safeLimit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, orderNo: true, status: true, bookingType: true, serviceType: true,
          startTime: true, endTime: true, finalPriceFen: true, depositAmount: true,
          isDepositPaid: true, quoteVersion: true, createdAt: true,
          technician: { select: { id: true, name: true } },
          customer: { select: { id: true, name: true, phone: true } },
        },
      }),
      this.prisma.order.count({ where }),
    ]);
    return { data, meta: { total, page: safePage, limit: safeLimit, totalPages: Math.ceil(total / safeLimit) } };
  }

  async findOne(id: number) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        technician: { select: { id: true, name: true, phone: true } },
        customer: { select: { id: true, name: true, phone: true } },
        serviceLines: { orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }] },
      },
    });
    if (!order) throw new NotFoundException('预约不存在');
    return {
      ...order,
      pricingDetails: this.parseJson(order.pricingDetails),
      acceptedProposal: this.parseJson(order.acceptedProposal),
    };
  }

  private parseJson(value: string | null) {
    if (!value) return null;
    try { return JSON.parse(value); } catch { return null; }
  }
}
