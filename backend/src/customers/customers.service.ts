import {
  BadRequestException,
  ConflictException,
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
      },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    return {
      ...customer,
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
    return tags ? tags.split(/[,，]/).map((tag) => tag.trim()).filter(Boolean) : [];
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
    if (templates.length >= 30) throw new BadRequestException('最多创建30个标签');
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
    if (next.length === templates.length) throw new NotFoundException('标签不存在');
    await this.saveTagTemplates(technicianId, next);
    return { success: true };
  }

  private parseTagTemplates(value: string | null): Array<{ id: string; name: string; color?: string }> {
    if (!value) return [];
    try {
      const parsed = JSON.parse(value);
      if (!Array.isArray(parsed)) return [];
      return parsed
        .map((item, index) => typeof item === 'string'
          ? { id: `legacy-${index}`, name: item.trim() }
          : {
              id: String(item.id || `legacy-${index}`),
              name: String(item.name || '').trim(),
              ...(item.color ? { color: String(item.color) } : {}),
            })
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
