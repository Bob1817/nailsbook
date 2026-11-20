import { BadRequestException, Injectable, NotFoundException, Optional } from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../common/prisma/prisma.service';
import { DingtalkAlertService } from '../notifications/dingtalk-alert.service';
import { CreateArtistApplicationDto } from './dto/create-artist-application.dto';
import { phoneVariants, phoneAccounts } from '../common/account-role-policy';

@Injectable()
export class ArtistApplicationsService {
  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly dingtalkAlert?: DingtalkAlertService,
  ) {}

  async create(dto: CreateArtistApplicationDto, currentTechnicianId?: number) {
    // 1. 已注册账号限制校验：已经注册过的账号无法申请美甲师试用
    const { client, technician } = await phoneAccounts(this.prisma, dto.phone);

    if (client) {
      throw new BadRequestException('该手机号码已经注册过OnlyNail，无法申请试用');
    }

    if (technician) {
      // 美甲师已注册：无法在非登录状态下申请试用；仅在已登录且为当前美甲师本人申请官方活动时允许
      const isCallerCurrentTechnician = !!(currentTechnicianId && currentTechnicianId === technician.id);
      if (!isCallerCurrentTechnician || dto.serviceMode !== 'model_artist') {
        throw new BadRequestException('该手机号码已经注册过OnlyNail，无法申请试用');
      }
    }

    // 2. 已经申请的手机号码或微信号在申请中(pending)或者已通过(approved)的无法进行重复申请
    const orConditions: Array<{ phone?: string; wechat?: string }> = [{ phone: dto.phone }];
    if (dto.wechat?.trim()) {
      orConditions.push({ wechat: dto.wechat.trim() });
    }

    const whereCondition: any = {
      OR: orConditions,
      status: { in: ['pending', 'approved'] },
    };
    if (dto.serviceMode === 'model_artist') {
      whereCondition.serviceMode = 'model_artist';
    }

    const existingApplication = await this.prisma.artistApplication.findFirst({
      where: whereCondition,
      orderBy: { createdAt: 'desc' },
      select: { id: true, status: true, phone: true, wechat: true, serviceMode: true },
    });

    if (existingApplication) {
      const matchType = existingApplication.phone === dto.phone ? '手机号码' : '微信号';
      if (existingApplication.status === 'pending') {
        throw new BadRequestException(`该${matchType}已有申请在审核中，请耐心等待，无需重复提交`);
      }
      if (existingApplication.status === 'approved') {
        throw new BadRequestException(
          dto.serviceMode === 'model_artist'
            ? `该${matchType}的官方活动申请已通过，无需重复申请`
            : `该${matchType}的试用申请已通过，无需重复申请`,
        );
      }
    }

    // 3. 并发安全插入：使用原子条件写入确保分布式/并发环境下不会插入重复记录
    const now = new Date();
    const isModelArtist = dto.serviceMode === 'model_artist';
    const inserted = isModelArtist
      ? await this.prisma.$executeRaw`
          INSERT INTO "ArtistApplication"
            ("name", "phone", "city", "serviceMode", "experience", "specialty",
             "wechat", "note", "followedMp", "status", "createdAt", "updatedAt")
          SELECT ${dto.name}, ${dto.phone}, ${dto.city}, ${dto.serviceMode ?? null},
            ${dto.experience ?? null}, ${dto.specialty ?? null}, ${dto.wechat ?? null},
            ${dto.note ?? null}, ${dto.followedMp ?? false}, 'pending', ${now}, ${now}
          WHERE NOT EXISTS (
            SELECT 1 FROM "ArtistApplication"
            WHERE ("phone" = ${dto.phone} OR (${dto.wechat ?? ''} != '' AND "wechat" = ${dto.wechat ?? ''}))
              AND "status" IN ('pending', 'approved')
              AND "serviceMode" = 'model_artist'
          )
        `
      : await this.prisma.$executeRaw`
          INSERT INTO "ArtistApplication"
            ("name", "phone", "city", "serviceMode", "experience", "specialty",
             "wechat", "note", "followedMp", "status", "createdAt", "updatedAt")
          SELECT ${dto.name}, ${dto.phone}, ${dto.city}, ${dto.serviceMode ?? null},
            ${dto.experience ?? null}, ${dto.specialty ?? null}, ${dto.wechat ?? null},
            ${dto.note ?? null}, ${dto.followedMp ?? false}, 'pending', ${now}, ${now}
          WHERE NOT EXISTS (
            SELECT 1 FROM "ArtistApplication"
            WHERE ("phone" = ${dto.phone} OR (${dto.wechat ?? ''} != '' AND "wechat" = ${dto.wechat ?? ''}))
              AND "status" IN ('pending', 'approved')
          )
        `;

    if (inserted === 0) {
      throw new BadRequestException('该手机号码已有申请在审核中，请勿重复提交');
    }

    // 触发钉钉实时通知超管
    if (this.dingtalkAlert) {
      this.dingtalkAlert
        .notifyArtistApplication({
          name: dto.name,
          phone: dto.phone,
          city: dto.city,
          serviceMode: dto.serviceMode,
          note: dto.note,
        })
        .catch(() => {});
    }

    return { received: true };
  }

  async checkPhone(_phone: string): Promise<{ status: 'none' }> {
    // Legacy clients can proceed to create(), which handles duplicates atomically.
    // Never disclose registration or review status by unauthenticated phone lookup.
    return { status: 'none' };
  }

  async getProgress(phone: string, mode?: string): Promise<{
    status: 'pending' | 'approved' | 'rejected' | 'none';
    name?: string;
    city?: string;
    appliedAt?: Date;
    reviewedAt?: Date;
  }> {
    if (!phone || !/^1\d{10}$/.test(phone)) {
      throw new BadRequestException('请输入正确的11位手机号码');
    }
    const where: any = { phone };
    if (mode) {
      where.serviceMode = mode;
    }
    const latest = await this.prisma.artistApplication.findFirst({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        status: true,
        name: true,
        city: true,
        serviceMode: true,
        createdAt: true,
        reviewedAt: true,
      },
    });
    if (!latest) {
      if (mode === 'model_artist') {
        return { status: 'none' };
      }
      const phones = phoneVariants(phone);
      const activeTech = await this.prisma.technician.findFirst({
        where: { phone: { in: phones }, status: { in: ['active', 'inactive'] } },
        select: { name: true, city: true, createdAt: true },
      });
      if (activeTech) {
        return {
          status: 'approved',
          name: activeTech.name,
          city: activeTech.city || undefined,
          appliedAt: activeTech.createdAt,
          reviewedAt: activeTech.createdAt,
        };
      }
      return { status: 'none' };
    }
    return {
      status: latest.status as 'pending' | 'approved' | 'rejected',
      name: latest.name,
      city: latest.city,
      appliedAt: latest.createdAt,
      reviewedAt: latest.reviewedAt ?? undefined,
    };
  }

  async getCampaignQuota() {
    const TOTAL_QUOTA = 10;
    const approvedCount = await this.prisma.artistApplication.count({
      where: {
        status: 'approved',
        OR: [
          { serviceMode: 'model_artist' },
          { note: { contains: '标杆' } },
          { note: { contains: '指导配置' } },
        ],
      },
    });
    const remainingQuota = Math.max(0, TOTAL_QUOTA - approvedCount);
    return {
      totalQuota: TOTAL_QUOTA,
      approvedCount,
      remainingQuota,
      isEnded: remainingQuota <= 0,
    };
  }

  async findAll(page = 1, limit = 20, status?: string) {
    const where = status ? { status } : {};
    const [data, total] = await Promise.all([
      this.prisma.artistApplication.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.artistApplication.count({ where }),
    ]);
    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: number) {
    return this.prisma.artistApplication.findUnique({ where: { id } });
  }

  async approve(id: number, reviewedBy: number) {
    const application = await this.prisma.artistApplication.findUnique({
      where: { id },
    });
    if (!application) {
      throw new NotFoundException('申请不存在');
    }

    // Recognize known legacy labels; never silently approve unknown service modes.
    const legacyModes: Record<string, string> = {
      '到店服务': 'shop', '上门服务': 'home', '两者皆可': 'both', 'model_artist': 'both',
    };
    const rawMode = application.serviceMode?.trim() || '';
    const mode = legacyModes[rawMode] || rawMode;
    if (!['home', 'shop', 'both', 'model_artist'].includes(mode)) {
      throw new BadRequestException('服务方式不明确，请联系申请人确认；可拒绝此申请后请其重新选择到店、上门或两者均可');
    }
    const homeService = mode === 'home' || mode === 'both';
    const shopService = mode === 'shop' || mode === 'both';

    // 事务：标记通过 + 按需创建美甲师账号（按手机号去重，幂等）
    return this.prisma.$transaction(async (tx) => {
      const updatedApplication = await tx.artistApplication.update({
        where: { id },
        data: { status: 'approved', reviewedBy, reviewedAt: new Date() },
      });

      const phones = phoneVariants(application.phone);
      const existing = await tx.technician.findFirst({
        where: { phone: { in: phones } },
      });

      // 若申请人此前曾使用过客户身份，角色晋升美甲师前先清理客户账号，解除单手机单角色触发器约束
      const existingClient = await tx.clientUser.findFirst({
        where: { phone: { in: phones }, status: { not: 'deleted' } },
      });
      if (existingClient) {
        await tx.clientUser.update({
          where: { id: existingClient.id },
          data: {
            status: 'deleted',
            phone: `migrated_tech_${existingClient.id}_${existingClient.phone}`,
            nickname: `${existingClient.nickname || '客户'}(已转美甲师)`,
            tokenVersion: { increment: 1 },
          },
        });
        await tx.wechatIdentity.updateMany({
          where: { clientUserId: existingClient.id },
          data: { clientUserId: null },
        });
      }

      // 已存在同手机号美甲师则不重复创建；新建时 passwordHash 留空，
      // 美甲师凭手机号首次登录时设置登录密码（与 technicians.create 一致）
      const technician =
        existing ??
        (await tx.technician.create({
          data: {
            name: application.name,
            phone: application.phone,
            city: application.city,
            homeService,
            shopService,
            invitationCode: crypto.randomBytes(4).toString('hex').toUpperCase(),
            status: 'active',
          },
        }));

      return {
        application: updatedApplication,
        technician,
        technicianCreated: !existing,
      };
    });
  }

  async reject(id: number, reviewedBy: number) {
    return this.prisma.artistApplication.update({
      where: { id },
      data: { status: 'rejected', reviewedBy, reviewedAt: new Date() },
    });
  }

  /**
   * 清洗并去重系统中的历史重复申请记录。
   * 去重保留策略：
   * 1. 状态优先级：approved (3) > pending (2) > rejected (1) > 其它 (0)
   * 2. 同状态下：按创建时间 createdAt 倒序，保留最新一条
   * 3. 同一手机号的多余记录予以删除
   */
  async deduplicateApplications(): Promise<{
    scannedCount: number;
    duplicatePhoneCount: number;
    deletedCount: number;
    details: Array<{
      phone: string;
      keptId: number;
      keptStatus: string;
      deletedIds: number[];
    }>;
  }> {
    const all = await this.prisma.artistApplication.findMany({
      orderBy: { createdAt: 'desc' },
    });

    const phoneGroups = new Map<string, typeof all>();
    for (const item of all) {
      const list = phoneGroups.get(item.phone) || [];
      list.push(item);
      phoneGroups.set(item.phone, list);
    }

    const statusScore = (status: string) => {
      switch (status) {
        case 'approved':
          return 3;
        case 'pending':
          return 2;
        case 'rejected':
          return 1;
        default:
          return 0;
      }
    };

    const details: Array<{
      phone: string;
      keptId: number;
      keptStatus: string;
      deletedIds: number[];
    }> = [];

    const allDeletedIds: number[] = [];

    for (const [phone, group] of phoneGroups.entries()) {
      if (group.length <= 1) {
        continue;
      }

      // 按状态权重倒序，同权重按创建时间倒序
      group.sort((a, b) => {
        const scoreDiff = statusScore(b.status) - statusScore(a.status);
        if (scoreDiff !== 0) {
          return scoreDiff;
        }
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });

      const kept = group[0];
      const redundant = group.slice(1);
      const deletedIds = redundant.map((item) => item.id);

      details.push({
        phone,
        keptId: kept.id,
        keptStatus: kept.status,
        deletedIds,
      });

      allDeletedIds.push(...deletedIds);
    }

    if (allDeletedIds.length > 0) {
      await this.prisma.artistApplication.deleteMany({
        where: { id: { in: allDeletedIds } },
      });
    }

    return {
      scannedCount: all.length,
      duplicatePhoneCount: details.length,
      deletedCount: allDeletedIds.length,
      details,
    };
  }
}
