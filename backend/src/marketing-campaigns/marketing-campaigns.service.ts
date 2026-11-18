import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { ChatGateway } from '../chat/chat.gateway';
import { CreateNoticeDto, UpdateNoticeDto } from './dto/notice.dto';
import {
  CreateActivityDto,
  SetHeroRecommendationDto,
  UpdateActivityDto,
} from './dto/activity.dto';

@Injectable()
export class MarketingCampaignsService {
  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly chatGateway?: ChatGateway,
  ) {}

  // ========================================================
  // 通知 (Notices)
  // ========================================================

  async getNoticeCoverageCount(technicianId: number) {
    const count = await this.prisma.clientTechBinding.count({
      where: { techId: technicianId, status: 'active' },
    });
    return { coveredCount: count };
  }

  async listNotices(
    technicianId: number,
    query: { status?: string; page?: number; limit?: number },
  ) {
    const page = Math.max(1, Number(query.page || 1));
    const limit = Math.max(1, Math.min(50, Number(query.limit || 20)));
    const skip = (page - 1) * limit;

    const where: any = { technicianId };
    if (query.status && query.status !== 'all') {
      where.status = query.status;
    }

    const [total, list] = await Promise.all([
      this.prisma.technicianNotice.count({ where }),
      this.prisma.technicianNotice.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip,
        take: limit,
      }),
    ]);

    return { total, page, limit, list };
  }

  async getNotice(technicianId: number, id: number) {
    const notice = await this.prisma.technicianNotice.findFirst({
      where: { id, technicianId },
    });
    if (!notice) throw new NotFoundException('通知不存在');
    return notice;
  }

  async createNotice(technicianId: number, dto: CreateNoticeDto) {
    const title = dto.title.trim();
    const content = dto.content.trim();
    if (!title) throw new BadRequestException('通知标题不能为空');
    if (!content) throw new BadRequestException('通知内容不能为空');

    let status = 'draft';
    let scheduledAt: Date | null = null;

    if (dto.isDraft) {
      status = 'draft';
    } else if (dto.isScheduled && dto.scheduledAt) {
      const scheduledDate = new Date(dto.scheduledAt);
      if (isNaN(scheduledDate.getTime()) || scheduledDate.getTime() <= Date.now()) {
        throw new BadRequestException('定时发布时间必须大于当前时间');
      }
      status = 'scheduled';
      scheduledAt = scheduledDate;
    } else {
      status = 'published';
    }

    const countRes = await this.getNoticeCoverageCount(technicianId);

    const notice = await this.prisma.technicianNotice.create({
      data: {
        technicianId,
        title,
        content,
        status: status === 'published' ? 'draft' : status, // 如果是发布，在后续分发后再切为 published
        scheduledAt,
        coveredCount: countRes.coveredCount,
      },
    });

    if (status === 'published') {
      return this.dispatchNotice(notice.id);
    }

    return notice;
  }

  async updateNotice(technicianId: number, id: number, dto: UpdateNoticeDto) {
    const notice = await this.getNotice(technicianId, id);
    if (notice.status === 'published') {
      throw new BadRequestException('已发布的通知无法修改');
    }

    const data: any = {};
    if (dto.title !== undefined) data.title = dto.title.trim();
    if (dto.content !== undefined) data.content = dto.content.trim();

    let shouldPublishNow = false;

    if (dto.isDraft) {
      data.status = 'draft';
      data.scheduledAt = null;
    } else if (dto.isScheduled && dto.scheduledAt) {
      const scheduledDate = new Date(dto.scheduledAt);
      if (isNaN(scheduledDate.getTime()) || scheduledDate.getTime() <= Date.now()) {
        throw new BadRequestException('定时发布时间必须大于当前时间');
      }
      data.status = 'scheduled';
      data.scheduledAt = scheduledDate;
    } else if (dto.isDraft === false && !dto.isScheduled) {
      shouldPublishNow = true;
    }

    const updated = await this.prisma.technicianNotice.update({
      where: { id },
      data,
    });

    if (shouldPublishNow) {
      return this.dispatchNotice(updated.id);
    }

    return updated;
  }

  async deleteNotice(technicianId: number, id: number) {
    const notice = await this.getNotice(technicianId, id);
    await this.prisma.technicianNotice.delete({ where: { id: notice.id } });
    return { success: true };
  }

  async dispatchNotice(noticeId: number) {
    const notice = await this.prisma.technicianNotice.findUnique({
      where: { id: noticeId },
      include: {
        technician: { select: { id: true, name: true, avatarUrl: true } },
      },
    });
    if (!notice) return null;

    const bindings = await this.prisma.clientTechBinding.findMany({
      where: { techId: notice.technicianId, status: 'active' },
      select: { clientId: true },
    });

    const now = new Date();

    for (const b of bindings) {
      try {
        let conversation = await this.prisma.conversation.findUnique({
          where: {
            clientId_techId: {
              clientId: b.clientId,
              techId: notice.technicianId,
            },
          },
        });

        if (!conversation) {
          conversation = await this.prisma.conversation.create({
            data: {
              clientId: b.clientId,
              techId: notice.technicianId,
              lastMessage: notice.title,
              lastMessageAt: now,
            },
          });
        } else {
          await this.prisma.conversation.update({
            where: { id: conversation.id },
            data: {
              lastMessage: notice.title,
              lastMessageAt: now,
            },
          });
        }

        const msg = await this.prisma.message.create({
          data: {
            conversationId: conversation.id,
            senderType: 'technician',
            senderId: notice.technicianId,
            receiverType: 'client',
            receiverId: b.clientId,
            messageType: 'notice',
            content: notice.title,
            relatedType: 'notice',
            relatedId: notice.id,
            isRead: false,
          },
        });

        this.chatGateway?.broadcastMessage?.(msg as any, conversation as any);
      } catch (err) {
        // 隔离单个客户投递异常，确保批量投递整体完成
      }
    }

    return this.prisma.technicianNotice.update({
      where: { id: notice.id },
      data: {
        status: 'published',
        publishedAt: now,
        coveredCount: bindings.length,
      },
    });
  }

  // ========================================================
  // 活动 (Activities)
  // ========================================================

  async listActivities(
    technicianId: number,
    query: { status?: string; page?: number; limit?: number },
  ) {
    const page = Math.max(1, Number(query.page || 1));
    const limit = Math.max(1, Math.min(50, Number(query.limit || 20)));
    const skip = (page - 1) * limit;

    const where: any = { technicianId };
    const now = new Date();

    if (query.status && query.status !== 'all') {
      if (query.status === 'active') {
        // 进行中：active 且未过期
        where.status = 'active';
        where.OR = [{ endTime: null }, { endTime: { gte: now } }];
      } else if (query.status === 'ended') {
        // 已结束：明确 ended 或 active 但已过 endTime
        where.OR = [
          { status: 'ended' },
          { status: 'active', endTime: { lt: now } },
        ];
      } else {
        where.status = query.status;
      }
    }

    const [total, list] = await Promise.all([
      this.prisma.technicianActivity.count({ where }),
      this.prisma.technicianActivity.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip,
        take: limit,
      }),
    ]);

    const formattedList = list.map((item) => {
      const isExpired =
        item.endTime !== null && new Date(item.endTime).getTime() < now.getTime();
      let displayStatus = item.status;
      if (item.status === 'active' && isExpired) {
        displayStatus = 'ended';
      }
      return {
        ...item,
        isExpired,
        displayStatus,
      };
    });

    return { total, page, limit, list: formattedList };
  }

  async getActivity(technicianId: number, id: number) {
    const activity = await this.prisma.technicianActivity.findFirst({
      where: { id, technicianId },
    });
    if (!activity) throw new NotFoundException('活动不存在');
    return activity;
  }

  async createActivity(technicianId: number, dto: CreateActivityDto) {
    const title = dto.title.trim();
    if (!title) throw new BadRequestException('活动标题不能为空');
    if (!dto.coverUrl) throw new BadRequestException('活动封面主图不能为空');

    let status = 'draft';
    let scheduledAt: Date | null = null;
    const startTime = dto.startTime ? new Date(dto.startTime) : null;
    const endTime = dto.endTime ? new Date(dto.endTime) : null;

    if (startTime && endTime && startTime.getTime() > endTime.getTime()) {
      throw new BadRequestException('活动开始时间不能晚于结束时间');
    }

    if (dto.isDraft) {
      status = 'draft';
    } else if (dto.isScheduled && dto.scheduledAt) {
      const scheduledDate = new Date(dto.scheduledAt);
      if (isNaN(scheduledDate.getTime()) || scheduledDate.getTime() <= Date.now()) {
        throw new BadRequestException('定时发布时间必须大于当前时间');
      }
      status = 'scheduled';
      scheduledAt = scheduledDate;
    } else {
      status = 'active';
    }

    const activity = await this.prisma.technicianActivity.create({
      data: {
        technicianId,
        title,
        coverUrl: dto.coverUrl,
        recommendToHero: dto.recommendToHero !== false,
        contentBlocks: dto.contentBlocks || '[]',
        status: status === 'active' ? 'draft' : status,
        startTime,
        endTime,
        scheduledAt,
      },
    });

    if (status === 'active') {
      return this.dispatchActivity(activity.id);
    }

    return activity;
  }

  async updateActivity(
    technicianId: number,
    id: number,
    dto: UpdateActivityDto,
  ) {
    const activity = await this.getActivity(technicianId, id);

    const data: any = {};
    if (dto.title !== undefined) data.title = dto.title.trim();
    if (dto.coverUrl !== undefined) data.coverUrl = dto.coverUrl;
    if (dto.recommendToHero !== undefined)
      data.recommendToHero = dto.recommendToHero;
    if (dto.contentBlocks !== undefined)
      data.contentBlocks = dto.contentBlocks;
    if (dto.startTime !== undefined)
      data.startTime = dto.startTime ? new Date(dto.startTime) : null;
    if (dto.endTime !== undefined)
      data.endTime = dto.endTime ? new Date(dto.endTime) : null;

    let shouldPublishNow = false;

    if (dto.isDraft) {
      data.status = 'draft';
      data.scheduledAt = null;
    } else if (dto.isScheduled && dto.scheduledAt) {
      const scheduledDate = new Date(dto.scheduledAt);
      if (isNaN(scheduledDate.getTime()) || scheduledDate.getTime() <= Date.now()) {
        throw new BadRequestException('定时发布时间必须大于当前时间');
      }
      data.status = 'scheduled';
      data.scheduledAt = scheduledDate;
    } else if (dto.isDraft === false && !dto.isScheduled && activity.status !== 'active') {
      shouldPublishNow = true;
    }

    const updated = await this.prisma.technicianActivity.update({
      where: { id },
      data,
    });

    if (shouldPublishNow) {
      return this.dispatchActivity(updated.id);
    }

    return updated;
  }

  async setHeroRecommendation(
    technicianId: number,
    id: number,
    dto: SetHeroRecommendationDto,
  ) {
    const activity = await this.getActivity(technicianId, id);
    return this.prisma.technicianActivity.update({
      where: { id: activity.id },
      data: { recommendToHero: dto.recommendToHero },
    });
  }

  async copyActivity(technicianId: number, id: number) {
    const source = await this.getActivity(technicianId, id);
    const newTitle = `${source.title} (副本)`.slice(0, 40);

    return this.prisma.technicianActivity.create({
      data: {
        technicianId,
        title: newTitle,
        coverUrl: source.coverUrl,
        recommendToHero: source.recommendToHero,
        contentBlocks: source.contentBlocks,
        status: 'draft',
        startTime: null,
        endTime: null,
      },
    });
  }

  async deleteActivity(technicianId: number, id: number) {
    const activity = await this.getActivity(technicianId, id);
    if (activity.status === 'draft') {
      await this.prisma.technicianActivity.delete({ where: { id: activity.id } });
    } else {
      await this.prisma.technicianActivity.update({
        where: { id: activity.id },
        data: { status: 'offline', recommendToHero: false },
      });
    }
    return { success: true };
  }

  async dispatchActivity(activityId: number) {
    const activity = await this.prisma.technicianActivity.findUnique({
      where: { id: activityId },
      include: {
        technician: { select: { id: true, name: true, avatarUrl: true } },
      },
    });
    if (!activity) return null;

    const bindings = await this.prisma.clientTechBinding.findMany({
      where: { techId: activity.technicianId, status: 'active' },
      select: { clientId: true },
    });

    const now = new Date();

    for (const b of bindings) {
      try {
        let conversation = await this.prisma.conversation.findUnique({
          where: {
            clientId_techId: {
              clientId: b.clientId,
              techId: activity.technicianId,
            },
          },
        });

        if (!conversation) {
          conversation = await this.prisma.conversation.create({
            data: {
              clientId: b.clientId,
              techId: activity.technicianId,
              lastMessage: `[活动] ${activity.title}`,
              lastMessageAt: now,
            },
          });
        } else {
          await this.prisma.conversation.update({
            where: { id: conversation.id },
            data: {
              lastMessage: `[活动] ${activity.title}`,
              lastMessageAt: now,
            },
          });
        }

        const msg = await this.prisma.message.create({
          data: {
            conversationId: conversation.id,
            senderType: 'technician',
            senderId: activity.technicianId,
            receiverType: 'client',
            receiverId: b.clientId,
            messageType: 'activity',
            content: activity.title,
            imageUrl: activity.coverUrl,
            relatedType: 'activity',
            relatedId: activity.id,
            isRead: false,
          },
        });

        this.chatGateway?.broadcastMessage?.(msg as any, conversation as any);
      } catch (err) {
        // 隔离单个客户消息异常
      }
    }

    return this.prisma.technicianActivity.update({
      where: { id: activity.id },
      data: {
        status: 'active',
        publishedAt: now,
      },
    });
  }

  // ========================================================
  // 客户端活动详情与推荐 (Client-Facing)
  // ========================================================

  async getClientActivity(id: number) {
    const activity = await this.prisma.technicianActivity.findUnique({
      where: { id },
      include: {
        technician: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            phone: true,
            invitationCode: true,
            city: true,
            shopAddresses: true,
            brandProfile: { select: { experienceYears: true } },
          },
        },
      },
    });

    if (!activity || ['draft', 'offline'].includes(activity.status)) {
      throw new NotFoundException('活动不存在或已下线');
    }

    // 递增浏览量
    await this.prisma.technicianActivity.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
    });

    let blocks = [];
    try {
      blocks = JSON.parse(activity.contentBlocks || '[]');
    } catch (_) {}

    return {
      ...activity,
      contentBlocks: blocks,
    };
  }

  async getHeroActivitiesForTechnicians(techIds: number[]) {
    if (!techIds.length) return [];
    const now = new Date();

    const activities = await this.prisma.technicianActivity.findMany({
      where: {
        technicianId: { in: techIds },
        status: 'active',
        recommendToHero: true,
        OR: [{ endTime: null }, { endTime: { gte: now } }],
      },
      orderBy: [{ publishedAt: 'desc' }, { id: 'desc' }],
      take: 3,
      include: {
        technician: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            invitationCode: true,
            shopAddresses: true,
          },
        },
      },
    });

    return activities;
  }

  // ========================================================
  // 定时调度处理 (Scheduled Campaigns & Expired Activities)
  // ========================================================

  async handleScheduledAndExpiredJobs() {
    const now = new Date();

    // 1. 扫描到达时间的定时通知
    const dueNotices = await this.prisma.technicianNotice.findMany({
      where: {
        status: 'scheduled',
        scheduledAt: { lte: now },
      },
      take: 20,
    });
    for (const notice of dueNotices) {
      await this.dispatchNotice(notice.id);
    }

    // 2. 扫描到达时间的定时活动
    const dueActivities = await this.prisma.technicianActivity.findMany({
      where: {
        status: 'scheduled',
        scheduledAt: { lte: now },
      },
      take: 20,
    });
    for (const activity of dueActivities) {
      await this.dispatchActivity(activity.id);
    }

    // 3. 扫描已过有效期的活动：将 recommendToHero 置为 false，状态置为 ended
    const expiredActivities = await this.prisma.technicianActivity.findMany({
      where: {
        status: 'active',
        endTime: { lt: now },
      },
      take: 50,
    });
    for (const activity of expiredActivities) {
      await this.prisma.technicianActivity.update({
        where: { id: activity.id },
        data: { status: 'ended', recommendToHero: false },
      });
    }

    return {
      dispatchedNotices: dueNotices.length,
      dispatchedActivities: dueActivities.length,
      expiredActivities: expiredActivities.length,
    };
  }
}
