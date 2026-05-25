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
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      this.prisma.customer.count({ where }),
    ]);

    return {
      data: customers,
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

    return customer;
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
