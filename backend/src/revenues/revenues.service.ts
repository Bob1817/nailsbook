import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class RevenuesService {
  constructor(private prisma: PrismaService) {}

  async findAll(page: number = 1, limit: number = 20, technicianId?: number, customerId?: number, startDate?: string, endDate?: string) {
    const where: any = {};

    if (technicianId) {
      where.technicianId = technicianId;
    }

    if (customerId) {
      where.customerId = customerId;
    }

    if (startDate || endDate) {
      where.recognizedAt = {};
      if (startDate) {
        where.recognizedAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.recognizedAt.lte = new Date(endDate);
      }
    }

    const [revenues, total] = await Promise.all([
      this.prisma.revenue.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          technician: { select: { id: true, name: true, phone: true } },
          customer: { select: { id: true, name: true, phone: true } },
          order: { select: { id: true, orderNo: true } },
        },
        orderBy: { recognizedAt: 'desc' },
      }),
      this.prisma.revenue.count({ where }),
    ]);

    return {
      data: revenues,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: number) {
    const revenue = await this.prisma.revenue.findUnique({
      where: { id },
      include: {
        technician: { select: { id: true, name: true, phone: true } },
        customer: { select: { id: true, name: true, phone: true } },
        order: true,
      },
    });

    if (!revenue) {
      throw new NotFoundException('Revenue not found');
    }

    return revenue;
  }

  async exportCsv(technicianId?: number, customerId?: number, startDate?: string, endDate?: string) {
    const where: any = {};

    if (technicianId) where.technicianId = technicianId;
    if (customerId) where.customerId = customerId;
    if (startDate || endDate) {
      where.recognizedAt = {};
      if (startDate) where.recognizedAt.gte = new Date(startDate);
      if (endDate) where.recognizedAt.lte = new Date(endDate);
    }

    const revenues = await this.prisma.revenue.findMany({
      where,
      include: {
        technician: { select: { name: true, phone: true } },
        customer: { select: { name: true, phone: true } },
        order: { select: { orderNo: true } },
      },
      orderBy: { recognizedAt: 'desc' },
    });

    const header = '收入编号,预约编号,技师,客户,金额(元),确认时间,状态\n';
    const rows = revenues.map((r) =>
      [
        r.revenueNo,
        r.order?.orderNo || '',
        r.technician?.name || '',
        r.customer?.name || '',
        r.amount,
        r.recognizedAt ? new Date(r.recognizedAt).toISOString().slice(0, 10) : '',
        r.status,
      ].join(',')
    ).join('\n');

    return header + rows;
  }

  async getStatistics(technicianId?: number, startDate?: string, endDate?: string) {
    const where: any = {};

    if (technicianId) {
      where.technicianId = technicianId;
    }

    if (startDate || endDate) {
      where.recognizedAt = {};
      if (startDate) {
        where.recognizedAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.recognizedAt.lte = new Date(endDate);
      }
    }

    const [totalRevenue, count, avgAmount, technicians] = await Promise.all([
      this.prisma.revenue.aggregate({
        where,
        _sum: { amount: true },
      }),
      this.prisma.revenue.count({ where }),
      this.prisma.revenue.aggregate({
        where,
        _avg: { amount: true },
      }),
      this.prisma.revenue.findMany({
        where,
        select: { technicianId: true },
        distinct: ['technicianId'],
      }),
    ]);

    return {
      totalRevenue: totalRevenue._sum.amount || 0,
      count,
      avgAmount: avgAmount._avg.amount || 0,
      technicianCount: technicians.length,
    };
  }
}
