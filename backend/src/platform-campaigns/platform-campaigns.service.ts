import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreatePlatformCampaignDto } from './dto/create-platform-campaign.dto';
import { QueryPlatformCampaignDto } from './dto/query-platform-campaign.dto';
import { UpdatePlatformCampaignDto } from './dto/update-platform-campaign.dto';

export type EffectiveCampaignStatus = 'draft' | 'scheduled' | 'active' | 'ended' | 'offline';

@Injectable()
export class PlatformCampaignsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 计算活动的有效实时状态
   */
  computeEffectiveStatus(campaign: {
    status: string;
    startTime?: Date | null;
    endTime?: Date | null;
  }): EffectiveCampaignStatus {
    if (campaign.status === 'draft') return 'draft';
    if (campaign.status === 'offline') return 'offline';

    const now = new Date();
    if (campaign.startTime && now < campaign.startTime) {
      return 'scheduled';
    }
    if (campaign.endTime && now > campaign.endTime) {
      return 'ended';
    }

    return campaign.status === 'active' ? 'active' : (campaign.status as EffectiveCampaignStatus);
  }

  /**
   * 超管后台：分页查询活动列表
   */
  async listAdmin(query: QueryPlatformCampaignDto) {
    const page = Math.max(1, Number(query.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 10));
    const skip = (page - 1) * pageSize;

    const where: any = {};

    if (query.keyword?.trim()) {
      const kw = query.keyword.trim();
      where.OR = [
        { title: { contains: kw } },
        { summary: { contains: kw } },
        { actionUrl: { contains: kw } },
      ];
    }

    if (query.targetAudience && query.targetAudience !== 'all_filter') {
      where.targetAudience = query.targetAudience;
    }

    if (query.status && query.status !== 'all') {
      const now = new Date();
      if (query.status === 'draft') {
        where.status = 'draft';
      } else if (query.status === 'offline') {
        where.status = 'offline';
      } else if (query.status === 'scheduled') {
        where.status = 'active';
        where.startTime = { gt: now };
      } else if (query.status === 'ended') {
        where.OR = [
          { status: 'ended' },
          { status: 'active', endTime: { lte: now } },
        ];
      } else if (query.status === 'active') {
        where.status = 'active';
        where.AND = [
          { OR: [{ startTime: null }, { startTime: { lte: now } }] },
          { OR: [{ endTime: null }, { endTime: { gt: now } }] },
        ];
      }
    }

    if (query.displayLocation) {
      where.displayLocations = { contains: query.displayLocation };
    }

    const [total, items, statusCountsRaw] = await Promise.all([
      this.prisma.platformCampaign.count({ where }),
      this.prisma.platformCampaign.findMany({
        where,
        orderBy: [{ sortOrder: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: pageSize,
      }),
      this.prisma.platformCampaign.groupBy({
        by: ['status'],
        _count: { id: true },
      }),
    ]);

    const formattedItems = items.map((item) => {
      let parsedLocations: string[] = [];
      try {
        parsedLocations = JSON.parse(item.displayLocations || '[]');
      } catch {
        parsedLocations = [];
      }

      return {
        ...item,
        displayLocations: parsedLocations,
        effectiveStatus: this.computeEffectiveStatus(item),
      };
    });

    const counts: Record<string, number> = {
      total: await this.prisma.platformCampaign.count(),
      draft: 0,
      active: 0,
      offline: 0,
      ended: 0,
    };
    for (const group of statusCountsRaw) {
      counts[group.status] = group._count.id;
    }

    return {
      items: formattedItems,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
      counts,
    };
  }

  /**
   * 超管后台：查询活动详情
   */
  async getAdminDetail(id: number) {
    const campaign = await this.prisma.platformCampaign.findUnique({
      where: { id },
    });
    if (!campaign) {
      throw new NotFoundException(`活动 ID ${id} 不存在`);
    }

    let parsedLocations: string[] = [];
    try {
      parsedLocations = JSON.parse(campaign.displayLocations || '[]');
    } catch {
      parsedLocations = [];
    }

    return {
      ...campaign,
      displayLocations: parsedLocations,
      effectiveStatus: this.computeEffectiveStatus(campaign),
    };
  }

  /**
   * 超管后台：创建活动页面
   */
  async create(dto: CreatePlatformCampaignDto, adminUserId?: number) {
    if (!dto.title?.trim()) {
      throw new BadRequestException('活动标题不能为空');
    }

    const displayLocationsJson = JSON.stringify(dto.displayLocations || []);

    const created = await this.prisma.platformCampaign.create({
      data: {
        title: dto.title.trim(),
        summary: dto.summary?.trim() || null,
        coverUrl: dto.coverUrl?.trim() || null,
        badgeText: dto.badgeText?.trim() || null,
        content: dto.content || '',
        targetAudience: dto.targetAudience || 'all',
        displayLocations: displayLocationsJson,
        actionType: dto.actionType || 'page',
        actionUrl: dto.actionUrl?.trim() || null,
        startTime: dto.startTime ? new Date(dto.startTime) : null,
        endTime: dto.endTime ? new Date(dto.endTime) : null,
        status: dto.status || 'draft',
        sortOrder: dto.sortOrder ?? 0,
        createdBy: adminUserId ?? null,
      },
    });

    if (created.status === 'active') {
      await this.dispatchCampaignSystemNotifications(created);
    }

    return this.getAdminDetail(created.id);
  }

  /**
   * 超管后台：更新活动
   */
  async update(id: number, dto: UpdatePlatformCampaignDto) {
    await this.getAdminDetail(id);

    const updateData: any = {};
    if (dto.title !== undefined) updateData.title = dto.title.trim();
    if (dto.summary !== undefined) updateData.summary = dto.summary?.trim() || null;
    if (dto.coverUrl !== undefined) updateData.coverUrl = dto.coverUrl?.trim() || null;
    if (dto.badgeText !== undefined) updateData.badgeText = dto.badgeText?.trim() || null;
    if (dto.content !== undefined) updateData.content = dto.content;
    if (dto.targetAudience !== undefined) updateData.targetAudience = dto.targetAudience;
    if (dto.displayLocations !== undefined) {
      updateData.displayLocations = JSON.stringify(dto.displayLocations || []);
    }
    if (dto.actionType !== undefined) updateData.actionType = dto.actionType;
    if (dto.actionUrl !== undefined) updateData.actionUrl = dto.actionUrl?.trim() || null;
    if (dto.startTime !== undefined) {
      updateData.startTime = dto.startTime ? new Date(dto.startTime) : null;
    }
    if (dto.endTime !== undefined) {
      updateData.endTime = dto.endTime ? new Date(dto.endTime) : null;
    }
    if (dto.status !== undefined) updateData.status = dto.status;
    if (dto.sortOrder !== undefined) updateData.sortOrder = dto.sortOrder;

    const updated = await this.prisma.platformCampaign.update({
      where: { id },
      data: updateData,
    });

    if (updated.status === 'active') {
      await this.dispatchCampaignSystemNotifications(updated);
    }

    return this.getAdminDetail(id);
  }

  /**
   * 超管后台：快速变更活动状态（如上架、下架、结束）
   */
  async setStatus(id: number, status: 'draft' | 'active' | 'offline' | 'ended') {
    await this.getAdminDetail(id);
    const updated = await this.prisma.platformCampaign.update({
      where: { id },
      data: { status },
    });
    if (status === 'active') {
      await this.dispatchCampaignSystemNotifications(updated);
    }
    return this.getAdminDetail(id);
  }

  /**
   * 官方发布活动时，向目标受众生成系统通知（消息类型：活动通知），幂等去重
   */
  async dispatchCampaignSystemNotifications(campaign: {
    id: number;
    title: string;
    summary?: string | null;
    badgeText?: string | null;
    coverUrl?: string | null;
    targetAudience?: string | null;
    actionType?: string | null;
    actionUrl?: string | null;
    status?: string | null;
  }) {
    if (!campaign || campaign.status !== 'active') return { created: 0 };
    if (!this.prisma.notificationEvent) return { created: 0 };

    const audience = campaign.targetAudience || 'all';
    const roles: Array<'technician' | 'client'> =
      audience === 'technician'
        ? ['technician']
        : audience === 'client'
          ? ['client']
          : audience === 'all'
            ? ['technician', 'client']
            : [];
    if (roles.length === 0) return { created: 0 };

    const recipients: Array<{ role: 'technician' | 'client'; id: number }> = [];
    if (roles.includes('technician') && this.prisma.technician?.findMany) {
      const techs = await this.prisma.technician.findMany({
        where: { status: { not: 'deleted' } },
        select: { id: true },
      });
      for (const t of techs) recipients.push({ role: 'technician', id: t.id });
    }
    if (roles.includes('client') && this.prisma.clientUser?.findMany) {
      const clients = await this.prisma.clientUser.findMany({
        where: { status: { not: 'deleted' } },
        select: { id: true },
      });
      for (const c of clients) recipients.push({ role: 'client', id: c.id });
    }
    if (recipients.length === 0) return { created: 0 };

    const payloadSnapshot = JSON.stringify({
      campaignId: campaign.id,
      title: campaign.title,
      summary: campaign.summary || '',
      badgeText: campaign.badgeText || '活动通知',
      coverUrl: campaign.coverUrl || '',
      actionType: campaign.actionType || 'page',
      actionUrl: campaign.actionUrl || '',
      publishedAt: new Date().toISOString(),
    });

    const eventKeys = recipients.map(
      (r) => `platform_campaign:${campaign.id}:${r.role}:${r.id}`,
    );
    const existing = this.prisma.notificationEvent.findMany
      ? await this.prisma.notificationEvent.findMany({
          where: { eventKey: { in: eventKeys } },
          select: { eventKey: true },
        })
      : [];
    const existingSet = new Set(existing.map((e) => e.eventKey));

    const toCreate = recipients
      .filter(
        (r) => !existingSet.has(`platform_campaign:${campaign.id}:${r.role}:${r.id}`),
      )
      .map((r) => ({
        eventKey: `platform_campaign:${campaign.id}:${r.role}:${r.id}`,
        eventType: 'platform_campaign',
        recipientRole: r.role,
        recipientId: r.id,
        priority: 'normal',
        status: 'pending',
        payloadSnapshot,
      }));

    if (toCreate.length === 0) return { created: 0 };

    if (typeof this.prisma.notificationEvent.createMany === 'function') {
      const res = await this.prisma.notificationEvent.createMany({
        data: toCreate,
      });
      return { created: res.count ?? toCreate.length };
    }

    let createdCount = 0;
    for (const item of toCreate) {
      await this.prisma.notificationEvent.upsert({
        where: { eventKey: item.eventKey },
        create: item,
        update: {},
      });
      createdCount += 1;
    }
    return { created: createdCount };
  }

  /**
   * 超管后台：删除活动
   */
  async delete(id: number) {
    await this.getAdminDetail(id);
    await this.prisma.platformCampaign.delete({ where: { id } });
    return { success: true, message: '活动已删除' };
  }

  /**
   * 公开端：按位置与受众查询正在生效的活动
   */
  async getActiveCampaigns(params: { location?: string; audience?: string }) {
    const now = new Date();
    const where: any = {
      status: 'active',
      AND: [
        { OR: [{ startTime: null }, { startTime: { lte: now } }] },
        { OR: [{ endTime: null }, { endTime: { gt: now } }] },
      ],
    };

    if (params.audience && params.audience !== 'all') {
      where.OR = [
        { targetAudience: 'all' },
        { targetAudience: params.audience },
      ];
    }

    if (params.location) {
      where.displayLocations = { contains: params.location };
    }

    const items = await this.prisma.platformCampaign.findMany({
      where,
      orderBy: [{ sortOrder: 'desc' }, { createdAt: 'desc' }],
    });

    return items.map((item) => {
      let parsedLocations: string[] = [];
      try {
        parsedLocations = JSON.parse(item.displayLocations || '[]');
      } catch {
        parsedLocations = [];
      }

      return {
        id: item.id,
        title: item.title,
        summary: item.summary,
        coverUrl: item.coverUrl,
        badgeText: item.badgeText,
        actionType: item.actionType,
        actionUrl: item.actionUrl,
        displayLocations: parsedLocations,
        targetAudience: item.targetAudience,
        startTime: item.startTime,
        endTime: item.endTime,
      };
    });
  }

  /**
   * 公开端：查看活动详情（自动增加浏览量）
   */
  async getPublicDetail(id: number) {
    const campaign = await this.prisma.platformCampaign.findUnique({
      where: { id },
    });
    if (!campaign) {
      throw new NotFoundException('活动不存在或已下线');
    }

    const effectiveStatus = this.computeEffectiveStatus(campaign);
    if (campaign.status === 'offline' || campaign.status === 'draft') {
      throw new NotFoundException('该活动未上架或已下线');
    }

    // 异步递增浏览量
    await this.prisma.platformCampaign.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
    }).catch(() => null);

    let parsedLocations: string[] = [];
    try {
      parsedLocations = JSON.parse(campaign.displayLocations || '[]');
    } catch {
      parsedLocations = [];
    }

    return {
      id: campaign.id,
      title: campaign.title,
      summary: campaign.summary,
      coverUrl: campaign.coverUrl,
      badgeText: campaign.badgeText,
      content: campaign.content,
      actionType: campaign.actionType,
      actionUrl: campaign.actionUrl,
      displayLocations: parsedLocations,
      targetAudience: campaign.targetAudience,
      startTime: campaign.startTime,
      endTime: campaign.endTime,
      effectiveStatus,
      viewCount: campaign.viewCount + 1,
      createdAt: campaign.createdAt,
    };
  }

  /**
   * 公开端：记录点击数
   */
  async recordClick(id: number) {
    await this.prisma.platformCampaign.update({
      where: { id },
      data: { clickCount: { increment: 1 } },
    }).catch(() => null);
    return { success: true };
  }
}
