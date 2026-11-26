import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { DingtalkAlertService } from '../notifications/dingtalk-alert.service';
import { CreateErrorReportDto } from './dto/create-error-report.dto';
import { QuerySystemErrorsDto } from './dto/query-system-errors.dto';
import {
  buildErrorFingerprint,
  classifySystemError,
  ErrorPriority,
} from './system-error-classifier';

const PRIORITY_RANK: Record<ErrorPriority, number> = {
  P0: 0,
  P1: 1,
  P2: 2,
  P3: 3,
};

@Injectable()
export class SystemErrorsService {
  private readonly logger = new Logger(SystemErrorsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly dingtalkAlert: DingtalkAlertService,
  ) {}

  async recordError(data: any, ip?: string) {
    try {
      const source = data.source || 'mini_program';
      const errorType = data.errorType || 'unknown_error';
      const message = String(data.message || 'Unknown error').slice(0, 5000);
      const stack = data.stack ? String(data.stack).slice(0, 10000) : null;
      const route = data.route ? String(data.route).slice(0, 500) : null;
      const method = data.method ? String(data.method).slice(0, 20) : null;
      const statusCode = data.statusCode ? Number(data.statusCode) : null;
      const userRole = data.userRole ? String(data.userRole).slice(0, 50) : null;
      const userId = data.userId ? Number(data.userId) : null;
      const deviceInfo = data.deviceInfo
        ? typeof data.deviceInfo === 'string'
          ? data.deviceInfo.slice(0, 2000)
          : JSON.stringify(data.deviceInfo).slice(0, 2000)
        : null;
      const networkType = data.networkType
        ? String(data.networkType).slice(0, 50)
        : null;

      const record = await this.prisma.systemErrorLog.create({
        data: {
          source,
          errorType,
          message,
          stack,
          route,
          method,
          statusCode,
          userRole,
          userId,
          deviceInfo,
          networkType,
          ip: ip ? ip.slice(0, 100) : null,
        },
      });

      // 异步推送钉钉通知（不阻断客户端正常返回）
      this.dingtalkAlert
        .notifySystemError({
          source,
          errorType,
          message,
          stack: stack || undefined,
          route: route || undefined,
          userRole: userRole || undefined,
          userId: userId || undefined,
          deviceInfo: deviceInfo || undefined,
          ip,
        })
        .catch((err) => {
          this.logger.warn(`Failed to send system error alert: ${String(err)}`);
        });

      return { success: true, id: record.id };
    } catch (err) {
      this.logger.error(`Error saving system error log: ${String(err)}`);
      return { success: false };
    }
  }

  async findAll(query: QuerySystemErrorsDto) {
    const page = Math.max(1, query.page || 1);
    const pageSize = Math.min(100, Math.max(1, query.pageSize || 20));
    const skip = (page - 1) * pageSize;

    const where: any = {};

    if (query.source) {
      where.source = query.source;
    }
    if (query.errorType) {
      where.errorType = query.errorType;
    }
    if (typeof query.resolved === 'boolean') {
      where.resolved = query.resolved;
    }
    if (query.keyword) {
      const kw = query.keyword.trim();
      where.OR = [
        { message: { contains: kw } },
        { route: { contains: kw } },
        { stack: { contains: kw } },
      ];
    }
    if (query.startDate || query.endDate) {
      where.createdAt = {};
      if (query.startDate) {
        where.createdAt.gte = new Date(`${query.startDate}T00:00:00.000Z`);
      }
      if (query.endDate) {
        where.createdAt.lte = new Date(`${query.endDate}T23:59:59.999Z`);
      }
    }

    const [items, total] = await Promise.all([
      this.prisma.systemErrorLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      this.prisma.systemErrorLog.count({ where }),
    ]);

    return {
      items: items.map((item) => ({
        ...item,
        ...classifySystemError(item),
      })),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async findGroups(query: QuerySystemErrorsDto) {
    const page = Math.max(1, query.page || 1);
    const pageSize = Math.min(100, Math.max(1, query.pageSize || 20));
    const where: any = {};

    if (query.source) where.source = query.source;
    if (query.errorType) where.errorType = query.errorType;
    if (typeof query.resolved === 'boolean') where.resolved = query.resolved;
    if (query.keyword) {
      const kw = query.keyword.trim();
      where.OR = [
        { message: { contains: kw } },
        { route: { contains: kw } },
        { stack: { contains: kw } },
      ];
    }
    if (query.startDate || query.endDate) {
      where.createdAt = {};
      if (query.startDate) {
        where.createdAt.gte = new Date(`${query.startDate}T00:00:00.000Z`);
      }
      if (query.endDate) {
        where.createdAt.lte = new Date(`${query.endDate}T23:59:59.999Z`);
      }
    }

    const rows = await this.prisma.systemErrorLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 1000,
    });

    const groupMap = new Map<string, any[]>();
    for (const row of rows) {
      const key = buildErrorFingerprint(row);
      const list = groupMap.get(key);
      if (list) list.push(row);
      else groupMap.set(key, [row]);
    }

    let groups = Array.from(groupMap.entries()).map(([groupKey, list]) => {
      const latestError = list[0];
      const oldestError = list[list.length - 1];
      const classification = classifySystemError(latestError, list.length);
      const userKeys = new Set(
        list
          .filter((item) => item.userId != null)
          .map((item) => `${item.userRole || 'user'}:${item.userId}`),
      );
      return {
        groupKey,
        ids: list.map((item) => item.id),
        occurrenceCount: list.length,
        impactedUsersCount: userKeys.size,
        firstOccurredAt: oldestError.createdAt,
        latestOccurredAt: latestError.createdAt,
        resolved: Boolean(latestError.resolved),
        ...classification,
        latestError: {
          ...latestError,
          ...classification,
        },
        occurrences: list.slice(0, 50),
      };
    });

    const summary = {
      p0Count: groups.filter((g) => g.priority === 'P0').length,
      p1Count: groups.filter((g) => g.priority === 'P1').length,
      p2Count: groups.filter((g) => g.priority === 'P2').length,
      p3Count: groups.filter((g) => g.priority === 'P3').length,
    };

    if (query.category) {
      groups = groups.filter((g) => g.category === query.category);
    }
    if (query.priority) {
      groups = groups.filter((g) => g.priority === query.priority);
    }

    groups.sort((a, b) => {
      const pDiff = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
      if (pDiff !== 0) return pDiff;
      return (
        new Date(b.latestOccurredAt).getTime() -
        new Date(a.latestOccurredAt).getTime()
      );
    });

    const total = groups.length;
    const start = (page - 1) * pageSize;
    const items = groups.slice(start, start + pageSize);

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
      summary,
    };
  }

  async getStats() {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [todayCount, unresolvedCount, totalCount, distinctUsers] =
      await Promise.all([
        this.prisma.systemErrorLog.count({
          where: { createdAt: { gte: startOfToday } },
        }),
        this.prisma.systemErrorLog.count({
          where: { resolved: false },
        }),
        this.prisma.systemErrorLog.count(),
        this.prisma.systemErrorLog.findMany({
          where: {
            createdAt: { gte: startOfToday },
            userId: { not: null },
          },
          select: { userId: true },
          distinct: ['userId'],
        }),
      ]);

    return {
      todayCount,
      unresolvedCount,
      resolvedCount: Math.max(0, totalCount - unresolvedCount),
      totalCount,
      impactedUsersToday: distinctUsers.length,
    };
  }

  async findOne(id: number) {
    const error = await this.prisma.systemErrorLog.findUnique({
      where: { id },
    });
    if (!error) throw new NotFoundException('错误记录不存在');
    return error;
  }

  async resolve(id: number, note?: string) {
    const existing = await this.prisma.systemErrorLog.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException('错误记录不存在');

    return this.prisma.systemErrorLog.update({
      where: { id },
      data: {
        resolved: true,
        resolvedAt: new Date(),
        resolvedNote: note ? note.trim() : existing.resolvedNote,
      },
    });
  }

  async batchResolve(ids: number[], note?: string) {
    const resolvedAt = new Date();
    const resolvedNote = note ? note.trim() : '批量标记为已解决';

    const result = await this.prisma.systemErrorLog.updateMany({
      where: { id: { in: ids } },
      data: {
        resolved: true,
        resolvedAt,
        resolvedNote,
      },
    });

    return { success: true, count: result.count };
  }
}
