import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class RevenuesService {
  constructor(private prisma: PrismaService) {}

  async findAll(
    page: number = 1,
    limit: number = 20,
    technicianId?: number,
    customerId?: number,
    startDate?: string,
    endDate?: string,
  ) {
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

  async exportCsv(
    technicianId?: number,
    customerId?: number,
    startDate?: string,
    endDate?: string,
  ) {
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
    const rows = revenues
      .map((r) =>
        [
          r.revenueNo,
          r.order?.orderNo || '',
          r.technician?.name || '',
          r.customer?.name || '',
          r.amount,
          r.recognizedAt
            ? new Date(r.recognizedAt).toISOString().slice(0, 10)
            : '',
          r.status,
        ]
          .map((value) => this.csvCell(value))
          .join(','),
      )
      .join('\n');

    return header + rows;
  }

  async recordExportAudit(
    technicianId: number,
    csv: string,
    filters: Record<string, unknown>,
  ) {
    const rowCount = Math.max(0, csv.trim().split('\n').length - 1);
    return this.prisma.dataExportAudit.create({
      data: {
        technicianId,
        exportType: 'revenues',
        format: 'csv',
        rowCount,
        filters: JSON.stringify(filters),
      },
    });
  }

  async exportFullBusinessData(
    technicianId: number,
    startDate?: string,
    endDate?: string,
  ) {
    const dateRange = this.buildDateRange(startDate, endDate);
    const [customers, orders, works, revenues] = await Promise.all([
      this.prisma.customer.findMany({
        where: { technicianId },
        select: {
          id: true,
          name: true,
          phone: true,
          gender: true,
          birthday: true,
          address: true,
          tags: true,
          notes: true,
          sourceType: true,
          archivedAt: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.order.findMany({
        where: { technicianId, ...(dateRange ? { createdAt: dateRange } : {}) },
        select: {
          id: true,
          orderNo: true,
          customerId: true,
          startTime: true,
          endTime: true,
          serviceType: true,
          customTitle: true,
          quotePrice: true,
          paidAmount: true,
          paymentStatus: true,
          status: true,
          source: true,
          completedAt: true,
          cancelledAt: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.nailWork.findMany({
        where: {
          techId: technicianId,
          ...(dateRange ? { createdAt: dateRange } : {}),
        },
        select: {
          id: true,
          title: true,
          coverUrl: true,
          images: true,
          description: true,
          tags: true,
          price: true,
          isVisible: true,
          visibilityScope: true,
          viewCount: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.revenue.findMany({
        where: {
          technicianId,
          ...(dateRange ? { recognizedAt: dateRange } : {}),
        },
        select: {
          id: true,
          revenueNo: true,
          orderId: true,
          customerId: true,
          amount: true,
          status: true,
          recognizedAt: true,
          voidedAt: true,
        },
        orderBy: { recognizedAt: 'asc' },
      }),
    ]);

    return {
      schemaVersion: '1.0',
      exportedAt: new Date().toISOString(),
      filters: { startDate: startDate ?? null, endDate: endDate ?? null },
      counts: {
        customers: customers.length,
        orders: orders.length,
        works: works.length,
        revenues: revenues.length,
      },
      data: { customers, orders, works, revenues },
    };
  }

  async recordFullExportAudit(
    technicianId: number,
    counts: Record<string, number>,
    filters: Record<string, unknown>,
  ) {
    const rowCount = Object.values(counts).reduce(
      (sum, count) => sum + count,
      0,
    );
    return this.prisma.dataExportAudit.create({
      data: {
        technicianId,
        exportType: 'full_business_data',
        format: 'json',
        rowCount,
        filters: JSON.stringify(filters),
      },
    });
  }

  private buildDateRange(startDate?: string, endDate?: string) {
    if (!startDate && !endDate) return undefined;
    return {
      ...(startDate ? { gte: new Date(startDate) } : {}),
      ...(endDate
        ? {
            lte: /^\d{4}-\d{2}-\d{2}$/.test(endDate)
              ? new Date(`${endDate}T23:59:59.999`)
              : new Date(endDate),
          }
        : {}),
    };
  }

  private csvCell(value: unknown) {
    let text = value == null ? '' : String(value);
    if (/^[=+\-@]/.test(text)) text = `'${text}`;
    return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  }

  async getStatistics(
    technicianId?: number,
    startDate?: string,
    endDate?: string,
  ) {
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
