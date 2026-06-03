import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class CustomersService {
  constructor(private prisma: PrismaService) {}

  async findAll(
    page: number = 1,
    limit: number = 20,
    technicianId?: number,
    search?: string,
    tags?: string,
  ) {
    const where: any = {};

    if (technicianId) {
      where.technicianId = technicianId;
    }

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { phone: { contains: search } },
      ];
    }

    if (tags) {
      where.tags = { contains: tags };
    }

    const [customers, total] = await Promise.all([
      this.prisma.customer.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          technician: {
            select: {
              id: true,
              name: true,
              phone: true,
            },
          },
          _count: { select: { orders: true } },
          // 最近一笔有地址的订单，用于地址回退
          orders: {
            where: { address: { not: null } },
            orderBy: { startTime: 'desc' },
            take: 1,
            select: { address: true },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      this.prisma.customer.count({ where }),
    ]);

    return {
      data: customers.map((customer) => ({
        ...customer,
        // 地址回退：客户地址 → 最近订单地址
        address: customer.address || customer.orders[0]?.address || null,
        orderCount: customer._count.orders,
      })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: number) {
    const customer = await this.prisma.customer.findUnique({
      where: { id },
      include: {
        technician: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
        orders: {
          select: {
            id: true,
            orderNo: true,
            startTime: true,
            status: true,
            createdAt: true,
            isDepositPaid: true,
            address: true,
            customTitle: true,
            quotePrice: true,
          },
          orderBy: { startTime: 'desc' },
        },
        revenues: {
          select: {
            id: true,
            revenueNo: true,
            amount: true,
            recognizedAt: true,
          },
          orderBy: { recognizedAt: 'desc' },
        },
      },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    return {
      ...customer,
      // 地址回退：客户地址 → 最近一笔有地址的订单
      address:
        customer.address ||
        customer.orders.find((order) => order.address)?.address ||
        null,
    };
  }

  async findOneForTechnician(id: number, technicianId: number) {
    const customer = await this.findOne(id);

    if (customer.technicianId !== technicianId) {
      throw new ForbiddenException('无权访问该客户');
    }

    return customer;
  }

  async updateTags(id: number, technicianId: number, tags: string) {
    const customer = await this.findOne(id);

    if (customer.technicianId !== technicianId) {
      throw new ForbiddenException('无权修改该客户标签');
    }

    return this.prisma.customer.update({
      where: { id },
      data: { tags: tags || null },
      select: { id: true, name: true, tags: true },
    });
  }

  async updateName(id: number, technicianId: number, name: string) {
    const customer = await this.findOne(id);

    if (customer.technicianId !== technicianId) {
      throw new ForbiddenException('无权修改该客户名称');
    }

    if (!name || !name.trim()) {
      throw new ForbiddenException('客户名称不能为空');
    }

    return this.prisma.customer.update({
      where: { id },
      data: { name: name.trim() },
      select: { id: true, name: true, tags: true },
    });
  }

  async getDistinctTags(technicianId: number) {
    const customers = await this.prisma.customer.findMany({
      where: { technicianId, tags: { not: null } },
      select: { tags: true },
    });

    const tagSet = new Set<string>();
    for (const c of customers) {
      if (c.tags) {
        c.tags
          .split(/[,，]/)
          .map((t) => t.trim())
          .filter(Boolean)
          .forEach((t) => tagSet.add(t));
      }
    }
    return [...tagSet].sort();
  }
}
