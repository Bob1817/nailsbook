import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class OperationLogsService {
  constructor(private prisma: PrismaService) {}

  async findAll(
    page: number = 1,
    limit: number = 20,
    adminUserId?: number,
    module?: string,
    action?: string,
    startDate?: string,
    endDate?: string,
  ) {
    const where: any = {};

    if (adminUserId) {
      where.adminUserId = adminUserId;
    }

    if (module) {
      where.module = module;
    }

    if (action) {
      where.action = action;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate);
      }
    }

    const [logs, total] = await Promise.all([
      this.prisma.operationLog.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          adminUser: {
            select: { id: true, username: true, realName: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.operationLog.count({ where }),
    ]);

    return {
      data: logs,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: number) {
    return this.prisma.operationLog.findUnique({
      where: { id },
      include: {
        adminUser: {
          select: { id: true, username: true, realName: true },
        },
      },
    });
  }

  async getModules() {
    const modules = await this.prisma.operationLog.groupBy({
      by: ['module'],
      _count: { module: true },
      orderBy: { module: 'asc' },
    });

    return modules.map(m => ({
      module: m.module,
      count: m._count.module,
    }));
  }

  async getActions(module?: string) {
    const where: any = {};
    if (module) {
      where.module = module;
    }

    const actions = await this.prisma.operationLog.groupBy({
      by: ['action'],
      where,
      _count: { action: true },
      orderBy: { action: 'asc' },
    });

    return actions.map(a => ({
      action: a.action,
      count: a._count.action,
    }));
  }
}
