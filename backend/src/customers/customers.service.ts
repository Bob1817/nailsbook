import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { calculateCustomerLifecycle } from './customer-lifecycle';
import * as bcrypt from 'bcryptjs';
import { generateRandomPassword } from '../common/auth/random-password';
import {
  decryptManagedPassword,
  encryptManagedPassword,
} from '../common/auth/managed-password';

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
          clientUser: {
            select: {
              passwordHash: true,
              managedPasswordCiphertext: true,
              status: true,
            },
          },
          _count: { select: { orders: true } },
          orders: {
            orderBy: { startTime: 'desc' },
            select: {
              address: true,
              status: true,
              startTime: true,
              completedAt: true,
            },
          },
          revenues: {
            where: { status: 'confirmed' },
            select: { amount: true },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      this.prisma.customer.count({ where }),
    ]);

    return {
      data: customers.map((customer) => {
        const { clientUser, ...safeCustomer } = customer;
        const completedServiceDates = customer.orders
          .filter((order) => order.status === 'completed')
          .map((order) => order.completedAt || order.startTime);
        const lifecycle = calculateCustomerLifecycle(completedServiceDates);
        const totalSpent = customer.revenues.reduce(
          (sum, revenue) => sum + revenue.amount,
          0,
        );
        const recentServiceAt =
          completedServiceDates.sort((a, b) => b.getTime() - a.getTime())[0] ??
          null;

        return {
          ...safeCustomer,
          account: customer.clientUserId
            ? {
                linked: true,
                passwordConfigured: Boolean(clientUser?.passwordHash),
                managedPasswordAvailable: Boolean(
                  clientUser?.managedPasswordCiphertext,
                ),
                status: clientUser?.status ?? 'unknown',
              }
            : {
                linked: false,
                passwordConfigured: false,
                managedPasswordAvailable: false,
                status: null,
              },
          orders: undefined,
          revenues: undefined,
          address:
            customer.address ||
            customer.orders.find((order) => order.address)?.address ||
            null,
          orderCount: customer._count.orders,
          totalOrders: completedServiceDates.length,
          totalSpent,
          recentServiceAt,
          lifecycle,
        };
      }),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async resetPassword(customerId: number) {
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
      select: {
        clientUserId: true,
        clientUser: { select: { status: true } },
      },
    });
    if (!customer) throw new NotFoundException('客户不存在');
    if (!customer.clientUserId || !customer.clientUser) {
      throw new BadRequestException('该客户尚未关联登录账号，无法重置密码');
    }
    if (customer.clientUser.status !== 'active') {
      throw new BadRequestException('该客户账号未启用，无法重置密码');
    }

    const tempPassword = generateRandomPassword();
    const passwordHash = await bcrypt.hash(tempPassword, 10);
    await this.prisma.clientUser.update({
      where: { id: customer.clientUserId },
      data: {
        passwordHash,
        managedPasswordCiphertext: encryptManagedPassword(tempPassword),
        tokenVersion: { increment: 1 },
      },
    });

    return { tempPassword };
  }

  async getManagedPassword(customerId: number) {
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
      select: { clientUser: { select: { managedPasswordCiphertext: true } } },
    });
    if (!customer) throw new NotFoundException('客户不存在');
    if (!customer.clientUser?.managedPasswordCiphertext) {
      throw new BadRequestException('当前密码由用户自行设置，需重置后方可查看');
    }
    return {
      password: decryptManagedPassword(
        customer.clientUser.managedPasswordCiphertext,
      ),
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
            completedAt: true,
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
          where: { status: 'confirmed' },
          select: {
            id: true,
            orderId: true,
            revenueNo: true,
            amount: true,
            recognizedAt: true,
          },
          orderBy: { recognizedAt: 'desc' },
        },
        workAccesses: {
          where: { canView: true },
          orderBy: { updatedAt: 'desc' },
          include: {
            work: {
              include: { technician: { select: { id: true, name: true } } },
            },
            order: { select: { id: true, orderNo: true, startTime: true } },
          },
        },
        followUps: {
          orderBy: { plannedAt: 'desc' },
          take: 50,
        },
      },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    const businessSummary = this.buildBusinessSummary(
      customer.orders,
      customer.revenues,
    );
    const lifecycle = calculateCustomerLifecycle(
      customer.orders
        .filter((order) => order.status === 'completed')
        .map((order) => order.completedAt || order.startTime),
    );

    return {
      ...customer,
      businessSummary,
      lifecycle,
      relatedWorks: customer.workAccesses
        .filter((access) => access.work.isVisible)
        .map((access) => ({
          id: access.work.id,
          title: access.work.title,
          coverUrl: this.absoluteUrl(access.work.coverUrl),
          tags: this.parseTags(access.work.tags),
          visibilityScope: access.work.visibilityScope,
          orderId: access.orderId,
          orderNo: access.order?.orderNo ?? null,
          serviceDate: access.order?.startTime ?? access.work.createdAt,
          permissions: {
            canShare: access.canShare,
            canFavorite: access.canFavorite,
            canLike: access.canLike,
            canComment: access.canComment,
          },
        })),
      // 地址回退：客户地址 → 最近一笔有地址的订单
      address:
        customer.address ||
        customer.orders.find((order) => order.address)?.address ||
        null,
    };
  }

  private absoluteUrl(url: string | null) {
    if (!url || url.startsWith('http')) return url;
    return `${process.env.UPLOAD_BASE_URL || 'http://localhost:3000'}${url}`;
  }

  private parseTags(tags: string | null) {
    return tags
      ? tags
          .split(/[,，]/)
          .map((tag) => tag.trim())
          .filter(Boolean)
      : [];
  }

  private buildBusinessSummary(
    orders: Array<{
      id: number;
      status: string;
      startTime: Date;
      completedAt: Date | null;
    }>,
    revenues: Array<{
      id: number;
      orderId: number;
      amount: number;
    }>,
  ) {
    const defaultServiceCycleDays = 28;
    const completedOrders = orders
      .filter((order) => order.status === 'completed')
      .map((order) => ({
        ...order,
        serviceAt: order.completedAt || order.startTime,
      }))
      .sort((a, b) => a.serviceAt.getTime() - b.serviceAt.getTime());

    const completedServiceCount = completedOrders.length;
    const confirmedSpend = revenues.reduce(
      (sum, revenue) => sum + revenue.amount,
      0,
    );
    const averageTicket =
      completedServiceCount > 0 ? confirmedSpend / completedServiceCount : null;

    let averageServiceCycleDays: number | null = null;
    if (completedServiceCount >= 2) {
      const totalIntervalDays = completedOrders
        .slice(1)
        .reduce((sum, order, index) => {
          const previous = completedOrders[index];
          return (
            sum +
            (order.serviceAt.getTime() - previous.serviceAt.getTime()) /
              86_400_000
          );
        }, 0);
      averageServiceCycleDays =
        Math.round((totalIntervalDays / (completedServiceCount - 1)) * 10) / 10;
    }

    const firstServiceAt = completedOrders[0]?.serviceAt ?? null;
    const lastServiceAt =
      completedOrders[completedServiceCount - 1]?.serviceAt ?? null;
    const serviceCycleDays = averageServiceCycleDays ?? defaultServiceCycleDays;
    const expectedNextServiceAt = lastServiceAt
      ? new Date(lastServiceAt.getTime() + serviceCycleDays * 86_400_000)
      : null;

    return {
      firstServiceAt,
      lastServiceAt,
      completedServiceCount,
      confirmedSpend,
      averageTicket,
      averageServiceCycleDays,
      expectedNextServiceAt,
      serviceCycleDays,
      serviceCycleSource:
        averageServiceCycleDays === null ? 'default' : 'personal',
      defaultServiceCycleDays,
      completedOrderIds: completedOrders.map((order) => order.id),
      revenueIds: revenues.map((revenue) => revenue.id),
    };
  }

  async findOneForTechnician(id: number, technicianId: number) {
    const customer = await this.findOne(id);

    if (customer.technicianId !== technicianId) {
      throw new ForbiddenException('无权访问该客户');
    }

    return customer;
  }

  async createFollowUp(
    customerId: number,
    technicianId: number,
    content: string,
    plannedAt: string,
  ) {
    await this.assertTechnicianCustomer(customerId, technicianId);
    const normalizedContent = content.trim();
    if (!normalizedContent) {
      throw new BadRequestException('跟进内容不能为空');
    }
    const plannedDate = new Date(plannedAt);
    if (Number.isNaN(plannedDate.getTime())) {
      throw new BadRequestException('计划跟进时间无效');
    }
    return this.prisma.customerFollowUp.create({
      data: {
        customerId,
        technicianId,
        content: normalizedContent,
        plannedAt: plannedDate,
      },
    });
  }

  async completeFollowUp(
    customerId: number,
    followUpId: number,
    technicianId: number,
  ) {
    await this.assertTechnicianCustomer(customerId, technicianId);
    const result = await this.prisma.customerFollowUp.updateMany({
      where: {
        id: followUpId,
        customerId,
        technicianId,
        status: 'pending',
      },
      data: {
        status: 'completed',
        completedAt: new Date(),
      },
    });
    if (result.count === 0) {
      const existing = await this.prisma.customerFollowUp.findFirst({
        where: { id: followUpId, customerId, technicianId },
      });
      if (!existing) throw new NotFoundException('跟进记录不存在');
    }
    return this.prisma.customerFollowUp.findFirst({
      where: { id: followUpId, customerId, technicianId },
    });
  }

  async getTodayFollowUps(technicianId: number, now: Date = new Date()) {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    return this.prisma.customerFollowUp.findMany({
      where: {
        technicianId,
        status: 'pending',
        plannedAt: { gte: start, lt: end },
      },
      orderBy: { plannedAt: 'asc' },
      include: {
        customer: {
          select: { id: true, name: true, phone: true, avatarUrl: true },
        },
      },
    });
  }

  private async assertTechnicianCustomer(
    customerId: number,
    technicianId: number,
  ) {
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
      select: { technicianId: true },
    });
    if (!customer) throw new NotFoundException('客户不存在');
    if (customer.technicianId !== technicianId) {
      throw new ForbiddenException('无权访问该客户');
    }
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
    const [customers, templates] = await Promise.all([
      this.prisma.customer.findMany({
        where: { technicianId, tags: { not: null } },
        select: { tags: true },
      }),
      this.getTagTemplates(technicianId),
    ]);

    const tagSet = new Set<string>(templates.map((item) => item.name));
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

  async getTagTemplates(technicianId: number) {
    const technician = await this.prisma.technician.findUnique({
      where: { id: technicianId },
      select: { customTags: true },
    });
    if (!technician) throw new NotFoundException('美甲师不存在');
    return this.parseTagTemplates(technician.customTags);
  }

  async createTagTemplate(technicianId: number, rawName: string) {
    const name = (rawName || '').trim();
    if (!name) throw new BadRequestException('标签名称不能为空');
    if (name.length > 12) throw new BadRequestException('标签名称最多12个字');
    const templates = await this.getTagTemplates(technicianId);
    if (templates.some((item) => item.name === name)) {
      throw new ConflictException('标签已存在');
    }
    if (templates.length >= 30)
      throw new BadRequestException('最多创建30个标签');
    const created = {
      id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      name,
    };
    await this.saveTagTemplates(technicianId, templates.concat(created));
    return created;
  }

  async deleteTagTemplate(technicianId: number, templateId: string) {
    const templates = await this.getTagTemplates(technicianId);
    const next = templates.filter((item) => item.id !== templateId);
    if (next.length === templates.length)
      throw new NotFoundException('标签不存在');
    await this.saveTagTemplates(technicianId, next);
    return { success: true };
  }

  private parseTagTemplates(
    value: string | null,
  ): Array<{ id: string; name: string; color?: string }> {
    if (!value) return [];
    try {
      const parsed = JSON.parse(value);
      if (!Array.isArray(parsed)) return [];
      return parsed
        .map((item, index) =>
          typeof item === 'string'
            ? { id: `legacy-${index}`, name: item.trim() }
            : {
                id: String(item.id || `legacy-${index}`),
                name: String(item.name || '').trim(),
                ...(item.color ? { color: String(item.color) } : {}),
              },
        )
        .filter((item) => item.name);
    } catch {
      return [];
    }
  }

  private async saveTagTemplates(
    technicianId: number,
    templates: Array<{ id: string; name: string; color?: string }>,
  ) {
    await this.prisma.technician.update({
      where: { id: technicianId },
      data: { customTags: JSON.stringify(templates) },
    });
  }
}
